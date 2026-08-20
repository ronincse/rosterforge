import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";

import type { Roster, RosterSelection } from "@rosterforge/roster-model";

import {
  parseBattleScribeAffectsSelector,
  type AffectsSelector,
} from "./affects.js";

import {
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  type EvaluationChoiceIndex,
  type EvaluationSelectionChoice,
} from "./selection-context.js";

/**
 * How one occurrence sits relative to the occurrence that declared an `affects`
 * modifier.
 *
 * This is the roster-shape half of routing. Whether a selector *admits* the
 * occurrence also depends on its filter and its terminus, which are the
 * caller's concern because they differ by target field.
 */
export interface AffectsRoute {
  /** Entry steps between the declarer and this occurrence; 0 means the same. */
  readonly entrySteps: number;
  /** True when reaching it passed through a selection-entry group. */
  readonly viaGroup: boolean;
  readonly reachable: boolean;
}

/**
 * A modifier carrying an `affects` selector, and whether a modifier group
 * declared it.
 */
export interface AffectsDeclaredModifier<Modifier> {
  readonly modifier: Modifier;
  readonly grouped: boolean;
}

export interface AffectsModifierSource {
  readonly field?: string;
  readonly scope?: string;
  readonly node: { readonly attributes: Readonly<Record<string, string>> };
}

interface AffectsModifierContainer<Modifier> {
  readonly modifiers: readonly Modifier[];
  readonly modifierGroups: readonly AffectsModifierContainer<Modifier>[];
}

/**
 * Where an `affects` selector starts walking from.
 *
 * `unsupported` means the scope names a collection rather than one occurrence,
 * so no single anchor exists.
 */
export type AffectsAnchorResolution =
  /** One occurrence: the selector walks down from it. */
  | { readonly kind: "resolved"; readonly anchor: RosterSelection }
  /**
   * The roster's force collection. The selector walks down from the force
   * itself, so a root selection is one entry step away.
   */
  | { readonly kind: "force" }
  | { readonly kind: "unresolved" }
  | { readonly kind: "unsupported" };

interface AffectsSelectionLocation {
  readonly occurrence: RosterSelection;
  readonly ancestors: readonly RosterSelection[];
}

/**
 * Resolves the occurrence an `affects` selector's `self` refers to.
 *
 * Confirmed against New Recruit on 2026-08-20. A Death Guard Lord of Contagion
 * carrying the Furnace of Plagues enhancement has its *Manreaper* profiles
 * modified, while its own Unit profile is untouched. The enhancement has no
 * child entries at all, so an owner-relative selector could not have reached
 * anything. Its modifiers carry `scope="model"`, and the model is the bearer —
 * so the scope names the anchor and the selector walks down from there.
 *
 * This supersedes the earlier reading that `affects` overrides `scope`. The two
 * compose: `scope` chooses where to stand, `affects` chooses where to walk.
 */
export function resolveAffectsAnchor(
  declarer: RosterSelection,
  scope: string | undefined,
  locations: readonly AffectsSelectionLocation[],
  choices: EvaluationChoiceIndex,
): AffectsAnchorResolution {
  if (scope === undefined || scope === "self") {
    return { kind: "resolved", anchor: declarer };
  }
  // `force` and `roster` name the force collection, and the selector walks
  // down from it. All seven corpus instances are detachment abilities written as
  // `self.entries[.recursive].<categoryId>[.profiles.<typeName>]` — the same
  // shape as the `forces`-segment form, with the scope naming the collection
  // instead of the selector.
  if (scope === "force" || scope === "roster") {
    return { kind: "force" };
  }
  // `ancestor` names a chain rather than one occurrence or one collection, and
  // nothing establishes which link it means.
  if (scope === "ancestor") {
    return { kind: "unsupported" };
  }
  const location = locations.find(
    (candidate) => candidate.occurrence === declarer,
  );
  if (location === undefined) return { kind: "unresolved" };

  if (scope === "parent") {
    const parent = location.ancestors[0];
    // A top-level occurrence's parent is a force, not a selection.
    return parent === undefined
      ? { kind: "unsupported" }
      : { kind: "resolved", anchor: parent };
  }
  if (scope === "root-entry") {
    const root = location.ancestors[location.ancestors.length - 1];
    return { kind: "resolved", anchor: root ?? declarer };
  }

  const types =
    scope === "model"
      ? ["model"]
      : scope === "unit"
        ? ["unit"]
        : scope === "model-or-unit"
          ? ["model", "unit"]
          : scope === "upgrade"
            ? ["upgrade"]
            : undefined;
  if (types === undefined) return { kind: "unsupported" };

  for (const occurrence of [declarer, ...location.ancestors]) {
    const resolution = resolveEvaluationSelection(occurrence, choices, true);
    const typed = resolution.choices.map(
      (choice) =>
        choice.kind === "selectionEntry" &&
        choice.type !== undefined &&
        types.includes(choice.type),
    );
    if (typed.length > 0 && typed.every(Boolean)) {
      return { kind: "resolved", anchor: occurrence };
    }
    if (resolution.status === "resolved" || (typed.length > 0 && !typed.some(Boolean))) {
      continue;
    }
    // An unreadable step might have been the anchor.
    return { kind: "unresolved" };
  }
  // Nothing of that type contains the declarer, so the modifier has nowhere to
  // stand. Refused rather than silently treated as a no-op.
  return { kind: "unresolved" };
}

/**
 * How far a `forces` selector reaches in this roster.
 *
 * A `forces` segment leaves the anchor's subtree and names the roster's forces,
 * so the target set is every occurrence they contain rather than a path from one
 * anchor. All 24 corpus instances are detachment abilities — *Lords of the
 * Warp*, *Cohort Cybernetica*, *Sanctified Orators* — whose effects are
 * army-wide by construction.
 *
 * With exactly one force and no nested forces, "every force in the roster" and
 * "the force containing the declarer" name the same set, so the reading is
 * unambiguous. The browser editor enforces that shape. A headless roster may
 * hold more, and there the two readings can differ with nothing to establish
 * which New Recruit uses, so the determination is refused instead.
 */
export function forceTraversalReach(roster: Roster): "all" | "unresolved" {
  const first = roster.forces[0];
  return roster.forces.length === 1 &&
    first !== undefined &&
    first.forces.length === 0
    ? "all"
    : "unresolved";
}

/**
 * Measures the path from the roster's force collection down to one occurrence.
 *
 * The force sits one step above every root selection, so a root selection is one
 * entry step away and its children are two. That keeps `entries` distinct from
 * `recursive` for a force-anchored selector: `self.entries.<category>` reaches
 * the force's own selections, while `self.entries.recursive.<category>` reaches
 * everything below them.
 */
export function routeFromForce(
  owner: RosterSelection,
  locations: readonly AffectsSelectionLocation[],
  choices: EvaluationChoiceIndex,
): AffectsRoute {
  const location = locations.find(
    (candidate) => candidate.occurrence === owner,
  );
  if (location === undefined) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  // `ancestors` is nearest-first; the walk down from the force is its reverse.
  const path = [...location.ancestors].reverse().concat(owner);
  let entrySteps = 0;
  let viaGroup = false;
  for (const step of path) {
    const choice = resolveEvaluationSelection(step, choices, true).choices[0];
    if (choice?.kind === "selectionEntryGroup") {
      viaGroup = true;
      continue;
    }
    entrySteps += 1;
  }
  if (!viaGroup) {
    // A flattened roster keeps group members as direct children, so the
    // definition side decides whether any hop passed through a group.
    for (let index = 0; index + 1 < path.length; index += 1) {
      const parent = path[index];
      const child = path[index + 1];
      if (
        parent !== undefined &&
        passesThroughGroupDefinition(parent, child, choices)
      ) {
        viaGroup = true;
        break;
      }
    }
  }
  return { entrySteps, viaGroup, reachable: true };
}

/**
 * True when the selector's traversal reaches an occurrence sitting at `route`.
 *
 * Verified against New Recruit on 2026-08-19: `entries` alone does not descend
 * into selection-entry groups, while `recursive` does.
 */
export function reaches(
  selector: { readonly traversal: string; readonly entersGroups: boolean },
  route: AffectsRoute,
): boolean {
  if (!route.reachable) return false;
  if (selector.traversal === "own") return route.entrySteps === 0;
  if (route.entrySteps === 0) return false;
  if (route.viaGroup && !selector.entersGroups) {
    // `entries` alone does not descend into groups; `recursive` does.
    if (selector.traversal !== "descendants") return false;
  }
  return selector.traversal === "descendants" || route.entrySteps === 1;
}

/**
 * Measures the path from the anchor occurrence down to one of its descendants.
 *
 * The entry-step count treats a selection-entry-group occurrence as a non-entry
 * step, so the result holds whether the roster flattens groups (browser
 * editing) or retains them (headless construction).
 */
export function routeFromAnchor(
  anchor: RosterSelection,
  owner: RosterSelection,
  locations: readonly {
    readonly occurrence: RosterSelection;
    readonly ancestors: readonly RosterSelection[];
  }[],
  choices: EvaluationChoiceIndex,
): AffectsRoute {
  if (anchor === owner) {
    return { entrySteps: 0, viaGroup: false, reachable: true };
  }
  const ownerLocation = locations.find(
    (location) => location.occurrence === owner,
  );
  if (ownerLocation === undefined) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  const index = ownerLocation.ancestors.indexOf(anchor);
  if (index === -1) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  // `ancestors` is nearest-first, so everything before the anchor plus the
  // occurrence itself is the path walked down from it.
  const path = [...ownerLocation.ancestors.slice(0, index), owner];
  let entrySteps = 0;
  let viaGroup = false;
  for (const step of path) {
    const resolution = resolveEvaluationSelection(step, choices, true);
    const choice = resolution.choices[0];
    if (choice?.kind === "selectionEntryGroup") {
      viaGroup = true;
      continue;
    }
    entrySteps += 1;
  }
  if (!viaGroup) {
    // A flattened roster keeps group members as direct children, so the
    // definition side decides whether the hop passed through a group.
    viaGroup = passesThroughGroupDefinition(anchor, path[0], choices);
  }
  return { entrySteps, viaGroup, reachable: true };
}

/**
 * True when the child's definition is a member of one of the parent's
 * selection-entry groups rather than one of its direct entries.
 */
export function passesThroughGroupDefinition(
  parent: RosterSelection,
  child: RosterSelection | undefined,
  choices: EvaluationChoiceIndex,
): boolean {
  if (child === undefined) return false;
  const parentChoice = resolveEvaluationSelection(parent, choices, true)
    .choices[0];
  const childChoice = resolveEvaluationSelection(child, choices, true)
    .choices[0];
  if (parentChoice === undefined || childChoice === undefined) return false;
  const direct = [
    ...parentChoice.selectionEntries,
    ...parentChoice.entryLinks.filter(
      (link): link is EvaluationSelectionChoice =>
        link.kind !== "unresolvedEntryLink",
    ),
  ];
  if (direct.includes(childChoice)) return false;
  const inGroups = (group: EvaluationSelectionChoice): boolean =>
    group.selectionEntries.includes(
      childChoice as (typeof group.selectionEntries)[number],
    ) ||
    group.entryLinks.some((link) => link === childChoice) ||
    group.selectionEntryGroups.some(inGroups);
  return parentChoice.selectionEntryGroups.some(inGroups);
}

/**
 * Every modifier on a choice that carries an `affects` attribute, direct and
 * grouped alike, in execution order.
 */
export function affectsModifiers<Modifier extends AffectsModifierSource>(
  choice: AffectsModifierContainer<Modifier>,
): readonly AffectsDeclaredModifier<Modifier>[] {
  const out: AffectsDeclaredModifier<Modifier>[] = [];
  for (const modifier of choice.modifiers) {
    if (modifier.node.attributes["affects"] !== undefined) {
      out.push({ modifier, grouped: false });
    }
  }
  const visit = (group: AffectsModifierContainer<Modifier>): void => {
    for (const modifier of group.modifiers) {
      if (modifier.node.attributes["affects"] !== undefined) {
        out.push({ modifier, grouped: true });
      }
    }
    for (const child of group.modifierGroups) visit(child);
  };
  for (const group of choice.modifierGroups) visit(group);
  return out;
}

/** True when any modifier on the choice carries an `affects` attribute. */
export function hasAffectsModifier<Modifier extends AffectsModifierSource>(
  choice: AffectsModifierContainer<Modifier>,
): boolean {
  return affectsModifiers(choice).length > 0;
}

export interface AffectsRoutedSelectionModifier<
  Modifier extends AffectsModifierSource = AffectsModifierSource,
> {
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly declaredBy: RosterSelection;
  readonly selector: AffectsSelector;
}

export interface AffectsRoutedSelectionModifiers<
  Modifier extends AffectsModifierSource = AffectsModifierSource,
> {
  readonly modifiers: readonly AffectsRoutedSelectionModifier<Modifier>[];
  /** True when a relevant selector might reach the occurrence but cannot be resolved. */
  readonly partial: boolean;
}

/**
 * Collects one field's modifiers whose `affects` path terminates at an exact
 * roster selection occurrence.
 *
 * This is the common traversal half shared by category and selection-display
 * evaluation. It deliberately leaves an optional filter ID to the caller:
 * category evaluation must use its modifier-immunity rule to avoid a cycle,
 * while other fields can consult the effective-category index directly.
 */
export function collectAffectsRoutedSelectionModifiers<
  Modifier extends AffectsModifierSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  field: string,
): AffectsRoutedSelectionModifiers<Modifier> {
  if (!rosterMatchesCatalogueContext(roster, context)) {
    return { modifiers: [], partial: false };
  }
  const choices = indexEvaluationChoices(context);
  const locations = rosterSelectionLocations(roster);
  if (!locations.some(({ occurrence }) => occurrence === owner)) {
    return { modifiers: [], partial: false };
  }

  const collected: AffectsRoutedSelectionModifier<Modifier>[] = [];
  let partial = false;
  for (const { occurrence: declarer } of locations) {
    const resolution = resolveEvaluationSelection(declarer, choices, true);
    const choice = resolution.choices[0];
    if (resolution.status !== "resolved" || choice === undefined) {
      // An unreadable occurrence might declare a selector aimed here.
      partial = true;
      continue;
    }
    if (!hasAffectsModifier(choice)) continue;

    for (const entry of affectsModifiers(choice)) {
      if (entry.modifier.field !== field) continue;
      const value = entry.modifier.node.attributes["affects"];
      if (value === undefined) continue;
      const selector = parseBattleScribeAffectsSelector(value);
      // A profile terminus targets a different object even when it uses the
      // same field name, as `annotation` does in the pinned corpus.
      if (selector.target !== "selections") continue;
      if (!selector.supported) {
        partial = true;
        continue;
      }
      // A `forces` segment and a collection scope both anchor at the force;
      // otherwise the scope names one occurrence to stand on.
      const anchor = selector.entersForces
        ? ({ kind: "force" } as const)
        : resolveAffectsAnchor(
            declarer,
            entry.modifier.scope,
            locations,
            choices,
          );
      if (anchor.kind === "unresolved" || anchor.kind === "unsupported") {
        partial = true;
        continue;
      }
      if (anchor.kind === "force" && forceTraversalReach(roster) !== "all") {
        partial = true;
        continue;
      }
      const route =
        anchor.kind === "force"
          ? routeFromForce(owner, locations, choices)
          : routeFromAnchor(anchor.anchor, owner, locations, choices);
      if (!reaches(selector, route)) continue;
      collected.push({
        modifier: entry.modifier as unknown as Modifier,
        grouped: entry.grouped,
        declaredBy: declarer,
        selector,
      });
    }
  }
  return { modifiers: collected, partial };
}
