import type { RosterSelection } from "@rosterforge/roster-model";

import {
  resolveEvaluationSelection,
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

interface AffectsModifierSource {
  readonly node: { readonly attributes: Readonly<Record<string, string>> };
}

interface AffectsModifierContainer<Modifier> {
  readonly modifiers: readonly Modifier[];
  readonly modifierGroups: readonly AffectsModifierContainer<Modifier>[];
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
 * Measures the path from a declaring occurrence down to one of its descendants.
 *
 * The entry-step count treats a selection-entry-group occurrence as a non-entry
 * step, so the result holds whether the roster flattens groups (browser
 * editing) or retains them (headless construction).
 */
export function routeFromDeclarer(
  declarer: RosterSelection,
  owner: RosterSelection,
  locations: readonly {
    readonly occurrence: RosterSelection;
    readonly ancestors: readonly RosterSelection[];
  }[],
  choices: EvaluationChoiceIndex,
): AffectsRoute {
  if (declarer === owner) {
    return { entrySteps: 0, viaGroup: false, reachable: true };
  }
  const ownerLocation = locations.find(
    (location) => location.occurrence === owner,
  );
  if (ownerLocation === undefined) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  const index = ownerLocation.ancestors.indexOf(declarer);
  if (index === -1) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  // `ancestors` is nearest-first, so everything before the declarer plus the
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
    viaGroup = passesThroughGroupDefinition(declarer, path[0], choices);
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
