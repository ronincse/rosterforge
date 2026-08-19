import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";

import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type { Roster, RosterSelection } from "@rosterforge/roster-model";

import {
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  type EvaluationSelectionChoice,
} from "./selection-context.js";

import { parseBattleScribeAffectsSelector } from "./affects.js";
import {
  affectsModifiers,
  hasAffectsModifier,
  reaches,
  routeFromDeclarer,
} from "./affects-routing.js";

import {
  evaluateRosterModifierApplicability,
  type RosterModifierApplicabilityReport,
  type RosterModifierApplicabilitySource,
} from "./modifier-applicability.js";
import {
  collectRosterModifierGroupExecution,
  evaluateRosterModifierGroupApplicability,
  type RosterModifierGroupApplicabilityReport,
  type RosterModifierGroupSource,
} from "./modifier-groups.js";
import type { NumericModifierApplicability } from "./modifiers.js";

/**
 * The field a modifier uses to change category membership.
 */
const categoryField = "category";

/**
 * The observed category operations.
 *
 * `set-primary` adds the category when it is absent. That is stated outright in
 * the BattleScribe 2.03.00 release notes — "When setting a Category to primary,
 * the Category will be added if it doesn't already exist" — and it explains the
 * pinned corpus, where 322 of 325 executable `set-primary` modifiers name a
 * category their owner does not link.
 *
 * `set-primary` also displaces any previous primary. That is not quoted
 * outright but follows from three converging sources: the BSData wiki calls the
 * primary "the category in which that entry will be visible in Roster Editor",
 * singular; the same release note says the operation makes it easier to *move*
 * entries between categories; and BattleScribe issue #18 shows an entry
 * displaying under exactly one category and moving when its primary changes.
 * Primary status affects presentation rather than legality, so the single-slot
 * reading is recorded as an inference rather than a certainty.
 *
 * `unset-primary` clears the flag only. Nothing suggests it removes membership.
 */
export type RosterCategoryOperation =
  | "add"
  | "remove"
  | "set-primary"
  | "unset-primary";

export type RosterCategoryModifierIssue =
  | "applicabilityUnresolved"
  | "repeated"
  | "scoped"
  | "unsupportedAttributes"
  | "missingType"
  | "unsupportedType"
  | "missingValue"
  | "relocatedAnchor";

export interface RosterCategoryLinkSource {
  readonly targetId?: ObjectId;
  readonly primary?: boolean;
}

export interface RosterCategoryModifierSource
  extends RosterModifierApplicabilitySource {
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly value?: string;
  readonly repeats: readonly unknown[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export interface RosterCategoryChoiceSource<
  Modifier extends RosterCategoryModifierSource = RosterCategoryModifierSource,
> {
  readonly categoryLinks: readonly RosterCategoryLinkSource[];
  readonly modifiers: readonly Modifier[];
  readonly modifierGroups: readonly RosterModifierGroupSource<Modifier>[];
}

/**
 * Where a step's modifier was declared. `own` means the evaluated occurrence
 * declared it; the scoped forms mean another occurrence declared it and the
 * scope anchors it here.
 */
export type RosterCategoryStepOrigin =
  | "own"
  | "parent-scope"
  | "root-entry-scope"
  | "affects";

export interface AppliedRosterCategoryStep<
  Modifier extends RosterCategoryModifierSource = RosterCategoryModifierSource,
> {
  readonly status: "applied";
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly origin: RosterCategoryStepOrigin;
  /** The occurrence that declared the modifier. */
  readonly declaredBy: RosterSelection;
  readonly operation: RosterCategoryOperation;
  readonly targetId: ObjectId;
  /** False when the operation was a no-op against the current membership. */
  readonly changed: boolean;
}

export interface NotApplicableRosterCategoryStep<
  Modifier extends RosterCategoryModifierSource = RosterCategoryModifierSource,
> {
  readonly status: "notApplicable";
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly origin: RosterCategoryStepOrigin;
  readonly declaredBy: RosterSelection;
}

export interface UnappliedRosterCategoryStep<
  Modifier extends RosterCategoryModifierSource = RosterCategoryModifierSource,
> {
  readonly status: "unapplied";
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly origin: RosterCategoryStepOrigin;
  readonly declaredBy: RosterSelection;
  readonly issues: readonly RosterCategoryModifierIssue[];
}

export type RosterCategoryStep<
  Modifier extends RosterCategoryModifierSource = RosterCategoryModifierSource,
> =
  | AppliedRosterCategoryStep<Modifier>
  | NotApplicableRosterCategoryStep<Modifier>
  | UnappliedRosterCategoryStep<Modifier>;

export interface RosterSelectionCategoryReport<
  Choice extends RosterCategoryChoiceSource = RosterCategoryChoiceSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly choice: Choice;
  /** Membership declared by the materialized category links, in source order. */
  readonly baseCategories: readonly ObjectId[];
  /** Effective membership after supported operations, present only when known. */
  readonly categories?: readonly ObjectId[];
  /** Categories the links explicitly mark primary. */
  readonly basePrimaryCategories: readonly ObjectId[];
  /** Effective primary categories, present only when no primary operation ran. */
  readonly primaryCategories?: readonly ObjectId[];
  /**
   * Steps may reference modifiers declared by other occurrences, so they use
   * the base modifier type rather than this choice's own.
   */
  readonly steps: readonly RosterCategoryStep[];
  readonly completeness: ValidationCompleteness;
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<
    Choice["modifiers"][number]
  >[];
  readonly modifierGroupApplicability: readonly RosterModifierGroupApplicabilityReport<
    Choice["modifierGroups"][number]
  >[];
}

/**
 * Reports the effective category membership of one exact roster selection
 * occurrence.
 *
 * The base is the occurrence's own materialized category links — the same
 * source the condition evaluator already uses for category identity. This
 * evaluator does not aggregate categories from ancestors or descendants and
 * does not feed its result back into condition identity; it is a read-only
 * report over one occurrence.
 *
 * Only scope-free, extension-free `add` and `remove` execute, in the order
 * already documented elsewhere: direct owner modifiers first, then top-level
 * groups in source order with each group's direct modifiers before nested
 * groups depth-first.
 */
export function evaluateRosterSelectionCategories<
  Choice extends RosterCategoryChoiceSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choice: Choice,
): Result<RosterSelectionCategoryReport<Choice>> {
  type Modifier = Choice["modifiers"][number];

  const diagnostics: Diagnostic[] = [];
  const baseCategories = uniqueIds(
    choice.categoryLinks.flatMap(({ targetId }) =>
      targetId === undefined ? [] : [targetId],
    ),
  );
  const basePrimaryCategories = uniqueIds(
    choice.categoryLinks.flatMap(({ targetId, primary }) =>
      targetId === undefined || primary !== true ? [] : [targetId],
    ),
  );

  const membership = [...baseCategories];
  let primary = [...basePrimaryCategories];
  let membershipKnown = true;
  let primaryKnown = true;
  const steps: RosterCategoryStep[] = [];

  const runStep = (
    modifier: RosterCategoryModifierSource,
    grouped: boolean,
    applicability: NumericModifierApplicability,
    origin: RosterCategoryStepOrigin,
    declaredBy: RosterSelection,
  ): void => {
    if (applicability === "notApplicable") {
      steps.push({
        status: "notApplicable",
        modifier,
        grouped,
        origin,
        declaredBy,
      });
      return;
    }

    const issues: RosterCategoryModifierIssue[] = [];
    if (applicability === "unresolved") {
      issues.push("applicabilityUnresolved");
    }
    if (modifier.repeats.length > 0) {
      issues.push("repeated");
    }
    // An inbound step reached this occurrence through a resolved anchor, so its
    // scope is already accounted for. Only an unresolved scope is an issue.
    if (modifier.scope !== undefined && origin === "own") {
      issues.push("scoped");
    }
    if (unsupportedAttributes(modifier, origin).length > 0) {
      issues.push("unsupportedAttributes");
    }
    const operation = categoryOperation(modifier.type);
    if (modifier.type === undefined) {
      issues.push("missingType");
    } else if (operation === undefined) {
      issues.push("unsupportedType");
    }
    const targetId =
      modifier.value === undefined || modifier.value === ""
        ? undefined
        : (modifier.value as ObjectId);
    if (targetId === undefined) {
      issues.push("missingValue");
    }

    if (issues.length === 0 && operation !== undefined && targetId !== undefined) {
      const index = membership.indexOf(targetId);
      const wasPrimary = primary.includes(targetId);
      let changed = false;
      if (operation === "add") {
        changed = index === -1;
        if (changed) membership.push(targetId);
      } else if (operation === "remove") {
        changed = index !== -1;
        if (changed) {
          membership.splice(index, 1);
          primary = primary.filter((id) => id !== targetId);
        }
      } else if (operation === "set-primary") {
        // Adds the category when absent, then becomes the sole primary.
        if (index === -1) membership.push(targetId);
        changed = index === -1 || !wasPrimary || primary.length > 1;
        primary = [targetId];
      } else {
        changed = wasPrimary;
        if (changed) primary = primary.filter((id) => id !== targetId);
      }
      steps.push({
        status: "applied",
        modifier,
        grouped,
        origin,
        declaredBy,
        operation,
        targetId,
        changed,
      });
      return;
    }

    // Every supported operation can change membership -- set-primary adds when
    // the category is absent -- so an unapplied one costs both determinations.
    membershipKnown = false;
    primaryKnown = false;
    steps.push({
      status: "unapplied",
      modifier,
      grouped,
      origin,
      declaredBy,
      issues,
    });
    diagnostics.push(
      ...issues.map((issue) => categoryDiagnostic(modifier, issue, origin)),
    );
  };

  const modifierApplicability: RosterModifierApplicabilityReport<Modifier>[] =
    [];
  // A modifier carrying `affects` is targeted by its selector rather than by
  // the occurrence that declares it, so it is not run as an own step. The
  // routed pass below picks it up, including when the selector points back at
  // this same occurrence.
  for (const modifier of choice.modifiers.filter(
    (candidate) =>
      candidate.field === categoryField &&
      candidate.node.attributes["affects"] === undefined,
  )) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      membershipKnown = false;
      primaryKnown = false;
      continue;
    }
    modifierApplicability.push(evaluated.value);
    runStep(
      modifier,
      false,
      evaluated.value.evaluated ? evaluated.value.status : "unresolved",
      "own",
      owner,
    );
  }

  const modifierGroupApplicability: RosterModifierGroupApplicabilityReport<
    Choice["modifierGroups"][number]
  >[] = [];
  const relevantGroups = choice.modifierGroups.filter((group) =>
    groupTargetsCategory(group),
  );
  for (const group of relevantGroups) {
    const evaluated = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      group,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      membershipKnown = false;
      primaryKnown = false;
      continue;
    }
    modifierGroupApplicability.push(evaluated.value);
  }
  const grouped = collectRosterModifierGroupExecution<Modifier>(
    modifierGroupApplicability,
    categoryField,
  );
  const expectedGrouped = relevantGroups.reduce(
    (count, group) => count + groupedCategoryCount<Modifier>(group),
    0,
  );
  if (
    modifierGroupApplicability.length !== relevantGroups.length ||
    grouped.entries.length !== expectedGrouped
  ) {
    membershipKnown = false;
    primaryKnown = false;
  }
  for (const entry of grouped.entries) {
    if (entry.modifier.node.attributes["affects"] !== undefined) continue;
    runStep(
      entry.modifier,
      true,
      !entry.evaluated || entry.status === "unresolved"
        ? "unresolved"
        : entry.status,
      "own",
      owner,
    );
  }

  // Inbound scoped modifiers run after the occurrence's own, in roster document
  // order. Ordering is observable only when the same category is both added and
  // removed along one path, which the pinned corpus does not do for any
  // occurrence; the rule is fixed so the result stays deterministic regardless.
  const inbound = collectInboundScopedCategoryModifiers(roster, context, owner);
  if (inbound.partial) {
    membershipKnown = false;
    primaryKnown = false;
  }
  for (const contribution of inbound.contributions) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      contribution.declaredBy,
      contribution.modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      membershipKnown = false;
      primaryKnown = false;
      continue;
    }
    runStep(
      contribution.modifier,
      contribution.grouped,
      evaluated.value.evaluated ? evaluated.value.status : "unresolved",
      contribution.origin,
      contribution.declaredBy,
    );
  }

  // An `affects` selector on this occurrence that does not reach this
  // occurrence, while a `scope` names a different anchor, has an undetermined
  // target set.
  //
  // The settled owner-relative rule -- verified in New Recruit for a model
  // reaching its own weapons -- makes such a selector vacuous. Every one of the
  // pinned corpus's 89 category `affects` modifiers is declared on an `upgrade`
  // entry with no descendant entries at all, so under that rule none of them
  // could ever do anything, which is not a plausible reading of the authors'
  // intent. The alternative reading is that the `scope` names the anchor and
  // the selector navigates from there; nothing establishes it. Rather than pick
  // one, the determination is withheld and diagnosed.
  for (const modifier of choice.modifiers.filter(
    (candidate) =>
      candidate.field === categoryField &&
      candidate.node.attributes["affects"] !== undefined &&
      candidate.scope !== undefined,
  )) {
    const selector = parseBattleScribeAffectsSelector(
      modifier.node.attributes["affects"] as string,
    );
    if (selector.traversal === "own" && selector.target === "selections") {
      // It does name this occurrence, so the routed pass settles it.
      continue;
    }
    membershipKnown = false;
    primaryKnown = false;
    steps.push({
      status: "unapplied",
      modifier,
      grouped: false,
      origin: "affects",
      declaredBy: owner,
      issues: ["relocatedAnchor"],
    });
    diagnostics.push(
      categoryDiagnostic(modifier, "relocatedAnchor", "affects"),
    );
  }

  // Routed steps run last. A selector reaches this occurrence from outside its
  // own declaration, so treating it as the final word matches the inbound-scope
  // rule already in force above.
  const routed = collectAffectsRoutedCategoryModifiers(
    roster,
    context,
    owner,
    baseCategories,
  );
  if (routed.partial) {
    membershipKnown = false;
    primaryKnown = false;
  }
  for (const contribution of routed.contributions) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      contribution.declaredBy,
      contribution.modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      membershipKnown = false;
      primaryKnown = false;
      continue;
    }
    runStep(
      contribution.modifier,
      contribution.grouped,
      evaluated.value.evaluated ? evaluated.value.status : "unresolved",
      contribution.origin,
      contribution.declaredBy,
    );
  }

  const completeness: ValidationCompleteness =
    diagnostics.length === 0 &&
    membershipKnown &&
    primaryKnown &&
    modifierApplicability.every(
      ({ completeness: child }) => child === "complete",
    ) &&
    modifierGroupApplicability.every(
      ({ completeness: child }) => child === "complete",
    )
      ? "complete"
      : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      choice,
      baseCategories,
      ...(membershipKnown ? { categories: uniqueIds(membership) } : {}),
      basePrimaryCategories,
      ...(primaryKnown && membershipKnown
        ? {
            primaryCategories: primary.filter((id) => membership.includes(id)),
          }
        : {}),
      steps,
      completeness,
      modifierApplicability,
      modifierGroupApplicability,
    },
    diagnostics,
  );
}

/**
 * A raw projected document node, described structurally so this package does
 * not take a runtime dependency on `battlescribe-data`.
 */
interface CategoryScanNode {
  readonly name?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly children?: readonly unknown[];
}

const modifierTargetedCategories = new WeakMap<
  BattleScribeCatalogueContext,
  ReadonlySet<ObjectId>
>();

/**
 * Every category ID that some category modifier anywhere in the composed
 * catalogue targets.
 *
 * ## Why this exists
 *
 * `evaluateRosterSelectionCategories` is pass one of the single-pass rule and
 * runs with no effective-category index in scope. Every corpus `affects`
 * selector on a category modifier filters by a category ID, so resolving that
 * filter would need exactly the membership this pass is computing.
 *
 * A category no modifier can target is **modifier-immune**: its membership is
 * fully determined by static `categoryLink` declarations, so pass one can
 * decide it without the index and without guessing. A category any modifier
 * targets stays unresolved, exactly like the existing cyclic cases.
 *
 * The scan reads every document's raw node tree rather than the roster-reachable
 * choice index, because immunity is a claim about the whole catalogue: a
 * modifier on an entry this roster never uses still disproves it.
 */
export function modifierTargetedCategoryIds(
  context: BattleScribeCatalogueContext,
): ReadonlySet<ObjectId> {
  const cached = modifierTargetedCategories.get(context);
  if (cached !== undefined) return cached;

  const targeted = new Set<ObjectId>();
  const visit = (node: CategoryScanNode): void => {
    if (
      node.name === "modifier" &&
      node.attributes?.["field"] === categoryField
    ) {
      const value = node.attributes["value"];
      if (value !== undefined && value !== "") {
        targeted.add(value as ObjectId);
      }
    }
    for (const child of node.children ?? []) {
      if (child !== null && typeof child === "object") {
        visit(child as CategoryScanNode);
      }
    }
  };
  for (const document of context.graph.documents) {
    visit(document.root as CategoryScanNode);
  }

  modifierTargetedCategories.set(context, targeted);
  return targeted;
}

/**
 * Category modifiers that an `affects` selector routes to this occurrence.
 *
 * The selector must terminate at an occurrence rather than at a profile: a
 * `category` field lives on the selection, so a `profiles.<typeName>` path
 * names something this modifier cannot change.
 */
function collectAffectsRoutedCategoryModifiers(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  staticCategories: readonly ObjectId[],
): {
  readonly contributions: readonly InboundCategoryContribution[];
  readonly partial: boolean;
} {
  if (!rosterMatchesCatalogueContext(roster, context)) {
    return { contributions: [], partial: false };
  }
  const choices = indexEvaluationChoices(context);
  const locations = rosterSelectionLocations(roster);
  const ownerLocation = locations.find(
    (location) => location.occurrence === owner,
  );
  if (ownerLocation === undefined) {
    return { contributions: [], partial: false };
  }

  // Outermost declaration first, so step order stays deterministic and matches
  // the source order a reader would expect.
  const candidates = [...[...ownerLocation.ancestors].reverse(), owner];
  const contributions: InboundCategoryContribution[] = [];
  let partial = false;

  for (const declarer of candidates) {
    const resolution = resolveEvaluationSelection(declarer, choices, true);
    const choice = resolution.choices[0];
    if (resolution.status !== "resolved" || choice === undefined) {
      // An unreadable ancestor might declare a selector aimed here.
      partial = true;
      continue;
    }
    if (!hasAffectsModifier(choice)) continue;

    const route = routeFromDeclarer(declarer, owner, locations, choices);
    for (const entry of affectsModifiers(choice)) {
      const modifier = entry.modifier as RosterCategoryModifierSource;
      if (modifier.field !== categoryField) continue;
      const value = modifier.node.attributes["affects"];
      if (value === undefined) continue;
      const selector = parseBattleScribeAffectsSelector(value);
      if (!selector.supported || selector.target !== "selections") {
        // Unsupported traversal, or a path naming profiles this modifier
        // cannot change. Either way it might have been aimed here.
        partial = true;
        continue;
      }
      if (!reaches(selector, route)) continue;
      if (selector.filterId !== undefined) {
        if (modifierTargetedCategoryIds(context).has(selector.filterId)) {
          // Some modifier can change membership in the filter category, so
          // pass one cannot decide whether this occurrence qualifies.
          partial = true;
          continue;
        }
        if (!staticCategories.includes(selector.filterId)) continue;
      }
      contributions.push({
        modifier,
        grouped: entry.grouped,
        origin: "affects",
        declaredBy: declarer,
      });
    }
  }
  return { contributions, partial };
}

interface InboundCategoryContribution {
  readonly modifier: RosterCategoryModifierSource;
  readonly grouped: boolean;
  readonly origin: RosterCategoryStepOrigin;
  readonly declaredBy: RosterSelection;
}

/**
 * Inverts the supported anchored scopes into the modifiers that reach one
 * occurrence.
 *
 * A `parent`-scoped modifier anchors to its declaring occurrence's immediate
 * selection parent, so the modifiers reaching this occurrence are those on its
 * direct children. A `root-entry`-scoped modifier anchors to its declaring
 * occurrence's top-level selection, so they are those on every occurrence whose
 * root is this one — which is only possible when this occurrence is itself
 * top-level.
 *
 * `partial` is true when a contributing occurrence could not be resolved to
 * exactly one materialized choice, because an unreadable contributor could
 * carry a modifier that changes membership.
 */
function collectInboundScopedCategoryModifiers(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
): {
  readonly contributions: readonly InboundCategoryContribution[];
  readonly partial: boolean;
} {
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  if (!catalogueMatches) {
    return { contributions: [], partial: true };
  }
  const locations = rosterSelectionLocations(roster);
  const ownerLocation = locations.find(
    (location) => location.occurrence === owner,
  );
  if (ownerLocation === undefined) {
    return { contributions: [], partial: true };
  }
  const ownerIsRoot = ownerLocation.root === owner;
  const choices = indexEvaluationChoices(context);
  const contributions: InboundCategoryContribution[] = [];
  let partial = false;

  for (const location of locations) {
    if (location.occurrence === owner) {
      continue;
    }
    // An occurrence can anchor to this one through both scopes at once: a
    // direct child is also a descendant of its root entry. Both are collected.
    const anchors: readonly (readonly [RosterCategoryStepOrigin, string])[] = [
      ...(location.parent === owner
        ? ([["parent-scope", "parent"]] as const)
        : []),
      ...(ownerIsRoot && location.root === owner
        ? ([["root-entry-scope", "root-entry"]] as const)
        : []),
    ];
    if (anchors.length === 0) {
      continue;
    }
    const resolution = resolveEvaluationSelection(
      location.occurrence,
      choices,
      catalogueMatches,
    );
    if (resolution.status !== "resolved" || resolution.choices[0] === undefined) {
      // Only an unresolved contributor that could carry a category modifier
      // matters, but that cannot be checked without its choice.
      partial = true;
      continue;
    }
    const choice = resolution.choices[0] as EvaluationSelectionChoice;
    for (const [origin, scope] of anchors) {
      const anchored = (modifier: RosterCategoryModifierSource): boolean =>
        modifier.field === categoryField && modifier.scope === scope;
      for (const modifier of choice.modifiers) {
        if (anchored(modifier)) {
          contributions.push({
            modifier,
            grouped: false,
            origin,
            declaredBy: location.occurrence,
          });
        }
      }
      const visitGroup = (group: {
        readonly modifiers: readonly RosterCategoryModifierSource[];
        readonly modifierGroups: readonly unknown[];
      }): void => {
        for (const modifier of group.modifiers) {
          if (anchored(modifier)) {
            contributions.push({
              modifier,
              grouped: true,
              origin,
              declaredBy: location.occurrence,
            });
          }
        }
        for (const child of group.modifierGroups) {
          visitGroup(child as Parameters<typeof visitGroup>[0]);
        }
      };
      for (const group of choice.modifierGroups) {
        visitGroup(group);
      }
    }
  }
  return { contributions, partial };
}

function categoryOperation(
  value: string | undefined,
): RosterCategoryOperation | undefined {
  return value === "add" ||
    value === "remove" ||
    value === "set-primary" ||
    value === "unset-primary"
    ? value
    : undefined;
}

function uniqueIds(ids: readonly ObjectId[]): readonly ObjectId[] {
  return [...new Set(ids)];
}

function groupTargetsCategory<
  Modifier extends RosterCategoryModifierSource,
>(group: RosterModifierGroupSource<Modifier>): boolean {
  return (
    group.modifiers.some(({ field }) => field === categoryField) ||
    group.modifierGroups.some((child) => groupTargetsCategory(child))
  );
}

function groupedCategoryCount<
  Modifier extends RosterCategoryModifierSource,
>(group: RosterModifierGroupSource<Modifier>): number {
  return (
    group.modifiers.filter(({ field }) => field === categoryField).length +
    group.modifierGroups.reduce(
      (count, child) => count + groupedCategoryCount<Modifier>(child),
      0,
    )
  );
}

function unsupportedAttributes(
  modifier: RosterCategoryModifierSource,
  origin: RosterCategoryStepOrigin = "own",
): readonly string[] {
  const supported = new Set(["type", "field", "value", "scope", "comment"]);
  // A routed modifier reached this occurrence *because* of its selector, and
  // `affects` overrides `scope`, so neither counts against it.
  if (origin === "affects") {
    supported.add("affects");
  }
  return Object.keys(modifier.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function categoryDiagnostic(
  modifier: RosterCategoryModifierSource,
  issue: RosterCategoryModifierIssue,
  origin: RosterCategoryStepOrigin = "own",
): Diagnostic {
  const descriptions: Record<
    RosterCategoryModifierIssue,
    readonly [string, string, string | undefined]
  > = {
    applicabilityUnresolved: [
      "EVALUATION_CATEGORY_MODIFIER_APPLICABILITY_UNRESOLVED",
      "A category modifier's applicability could not be resolved.",
      undefined,
    ],
    repeated: [
      "EVALUATION_CATEGORY_MODIFIER_REPEAT_UNSUPPORTED",
      "A category modifier has repeat behavior that is not evaluated.",
      undefined,
    ],
    scoped: [
      "EVALUATION_CATEGORY_MODIFIER_SCOPE_UNSUPPORTED",
      "A category modifier has scoped behavior that is not evaluated.",
      "scope",
    ],
    unsupportedAttributes: [
      "EVALUATION_CATEGORY_MODIFIER_ATTRIBUTES_UNSUPPORTED",
      "A category modifier has generic attributes with unsupported behavior.",
      unsupportedAttributes(modifier, origin)[0],
    ],
    missingType: [
      "EVALUATION_CATEGORY_MODIFIER_TYPE_MISSING",
      "A category modifier has no operation type.",
      "type",
    ],
    unsupportedType: [
      "EVALUATION_CATEGORY_MODIFIER_TYPE_UNSUPPORTED",
      `Category modifier operation ${modifier.type} is not supported.`,
      "type",
    ],
    relocatedAnchor: [
      "EVALUATION_CATEGORY_MODIFIER_ANCHOR_RELOCATED",
      "A category modifier's affects selector reaches nothing from its own occurrence while a scope names another anchor, so its target set is undetermined.",
      "affects",
    ],
    missingValue: [
      "EVALUATION_CATEGORY_MODIFIER_VALUE_MISSING",
      "A category modifier has no target category.",
      "value",
    ],
  };
  const [code, message, attribute] = descriptions[issue];
  return {
    code,
    message,
    severity: "warning",
    impacts: ["validation", "compatibility"],
    location: {
      source: modifier.source,
      path:
        attribute === undefined
          ? modifier.path
          : [...modifier.path, `@${attribute}`],
    },
    details: {
      issue,
      type: modifier.type,
      field: modifier.field,
      value: modifier.value,
      scope: modifier.scope,
      attributes: modifier.node.attributes,
    },
  };
}
