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
 * Operations whose effect on a membership set is established by the operation
 * name alone. `set-primary` and `unset-primary` are deliberately absent: in the
 * pinned corpus 322 of 325 executable `set-primary` modifiers name a category
 * the owner does not already link, so they can only do anything if the
 * operation also creates the membership, and 234 owners would end up with more
 * than one primary unless it also clears the others. Neither rule is
 * established by the source shape, so both operations stay unapplied.
 */
export type RosterCategoryOperation = "add" | "remove";

export type RosterCategoryModifierIssue =
  | "applicabilityUnresolved"
  | "repeated"
  | "scoped"
  | "unsupportedAttributes"
  | "missingType"
  | "unsupportedType"
  | "missingValue";

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
export type RosterCategoryStepOrigin = "own" | "parent-scope" | "root-entry-scope";

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
  /**
   * True when the only unsupported thing is a primary-flag operation. Those
   * cannot change membership, so the membership set stays known while the
   * primary determination does not.
   */
  readonly primaryOnly: boolean;
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
    if (unsupportedAttributes(modifier).length > 0) {
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
      const changed = operation === "add" ? index === -1 : index !== -1;
      if (operation === "add" && changed) {
        membership.push(targetId);
      } else if (operation === "remove" && changed) {
        membership.splice(index, 1);
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

    // A primary-flag operation is the one unsupported shape that provably
    // cannot change membership, so it degrades only the primary determination.
    const primaryOnly =
      issues.length === 1 &&
      issues[0] === "unsupportedType" &&
      isPrimaryOperation(modifier.type);
    if (primaryOnly) {
      primaryKnown = false;
    } else {
      membershipKnown = false;
      primaryKnown = false;
    }
    steps.push({
      status: "unapplied",
      modifier,
      grouped,
      origin,
      declaredBy,
      issues,
      primaryOnly,
    });
    diagnostics.push(
      ...issues.map((issue) => categoryDiagnostic(modifier, issue)),
    );
  };

  const modifierApplicability: RosterModifierApplicabilityReport<Modifier>[] =
    [];
  for (const modifier of choice.modifiers.filter(
    ({ field }) => field === categoryField,
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
            primaryCategories: basePrimaryCategories.filter((id) =>
              membership.includes(id),
            ),
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
  return value === "add" || value === "remove" ? value : undefined;
}

function isPrimaryOperation(value: string | undefined): boolean {
  return value === "set-primary" || value === "unset-primary";
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
): readonly string[] {
  const supported = new Set(["type", "field", "value", "scope", "comment"]);
  return Object.keys(modifier.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function categoryDiagnostic(
  modifier: RosterCategoryModifierSource,
  issue: RosterCategoryModifierIssue,
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
      unsupportedAttributes(modifier)[0],
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
