import {
  objectId,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import { battleScribeReachableObjectsById } from "@rosterforge/data-graph";
import { evaluateRosterBaseCosts, evaluateRosterCostsWithUnconditionalModifiers, evaluateRosterCostsWithSelectionConditions, type RosterCostReport, type RosterCostType } from "./costs.js";
import { queryCostConstraint, type ScopedCostConstraintEvaluation } from "./cost-constraint-query.js";

import {
  rosterSelectionAmount,
  type Roster,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

import {
  expectedCatalogueKey,
  evaluationSelectionIdentityCandidate,
  evaluationSelectionScope,
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  type EvaluationSelectionIdentityCandidate,
  type EvaluationSelectionChoice,
  type EvaluationSelectionResolution,
  type EvaluationSelectionScope,
  type RosterSelectionLocation,
  nearestIdentitySelection,
  nearestTypedSelection,
  typedSelectionTypes,
} from "./selection-context.js";
import {
  evaluateNumericModifierSequence,
  type NumericModifierSequenceReport,
} from "./modifiers.js";
import {
  evaluateRosterModifierApplicability,
  type RosterModifierApplicabilityReport,
} from "./modifier-applicability.js";
import {
  collectRosterModifierGroupExecution,
  evaluateRosterModifierGroupApplicability,
  type RosterModifierGroupApplicabilityReport,
} from "./modifier-groups.js";
import {
  evaluateRosterModifierRepeats,
  type RosterRepeatReport,
} from "./repeats.js";
import { effectiveRosterCategories } from "./effective-categories.js";

/**
 * BattleScribe's "no constraint" sentinel.
 *
 * A constraint authored `value="-1"` is not a bound of minus one; it is the
 * *absence* of a bound. Settled by observation on 2026-08-24 rather than
 * inferred, the way `skipIfPresent` was: New Recruit's wiki omits such a
 * constraint from an entry's rendered constraint list entirely. The Vindicare
 * Assassin's Micromelta Round carries `max 1` and `min -1`, and the page
 * prints only `max: 1`. The Imperial Knights' Allocated Chivalric Points
 * carries a single `max -1`, and the page prints no constraint section at all.
 *
 * It is the *resting* value of a constraint that a modifier computes later.
 * All 48 instances in the pinned corpus are the target of some modifier's
 * `field`, and for 42 of the 46 distinct constraint IDs every targeting
 * modifier is conditional — so this is the value that actually stands whenever
 * those conditions are false, not a rare authoring artefact.
 *
 * Only exactly `-1` is the sentinel. Any other negative stays unsupported and
 * keeps withholding: nothing was observed about it, and the corpus has none.
 */
export const UNBOUNDED_CONSTRAINT_VALUE = -1;

/** True when a constraint limit means "no bound" rather than a number. */
export function isUnboundedConstraintValue(
  value: number | undefined,
): boolean {
  return value === UNBOUNDED_CONSTRAINT_VALUE;
}

export type RosterSelectionConstraintType = "min" | "max";
export type RosterSelectionConstraintStatus =
  | "satisfied"
  | "violated"
  | "unresolved";
export type RosterSelectionConstraintInspectionScope =
  | "base"
  | "unconditionalModifiers"
  | "selectionConditions";
export type RosterSelectionConstraintModifier =
  EvaluationSelectionChoice["modifiers"][number];
export type RosterSelectionConstraintModifierGroup =
  EvaluationSelectionChoice["modifierGroups"][number];

export interface RosterSelectionConstraintSource {
  readonly id?: ObjectId;
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly value?: number;
  readonly percentValue?: boolean;
  readonly shared?: boolean;
  readonly includeChildSelections?: boolean;
  readonly includeChildForces?: boolean;
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
    readonly children?: readonly { readonly kind: string }[];
  };
}

export interface RosterSelectionConstraintReport<
  Constraint extends RosterSelectionConstraintSource =
    RosterSelectionConstraintSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly constraint: Constraint;
  readonly inspectionScope: RosterSelectionConstraintInspectionScope;
  readonly baseStatus: RosterSelectionConstraintStatus;
  readonly status: RosterSelectionConstraintStatus;
  readonly completeness: ValidationCompleteness;
  readonly ownerResolution: EvaluationSelectionResolution;
  readonly targetIds: readonly ObjectId[];
  readonly modifiers: readonly RosterSelectionConstraintModifier[];
  readonly modifierGroups: readonly RosterSelectionConstraintModifierGroup[];
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<RosterSelectionConstraintModifier>[];
  readonly modifierGroupApplicability: readonly RosterModifierGroupApplicabilityReport<RosterSelectionConstraintModifierGroup>[];
  readonly repeatReports: readonly RosterRepeatReport[];
  readonly candidates: readonly EvaluationSelectionIdentityCandidate[];
  readonly matching: readonly RosterSelection[];
  readonly minimum: number;
  readonly maximum: number;
  readonly observed?: number;
  readonly baseLimit?: number;
  readonly limit?: number;
  readonly modifierSequence?: NumericModifierSequenceReport<RosterSelectionConstraintModifier>;
  readonly constraintType?: RosterSelectionConstraintType;
  readonly scope?: EvaluationSelectionScope;
  readonly costEvaluation?: ScopedCostConstraintEvaluation;
}

export interface RosterSelectionConstraintCollectionOptions {
  readonly inspectionScope?: RosterSelectionConstraintInspectionScope;
}

export interface RosterSelectionConstraintsReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly inspectionScope: RosterSelectionConstraintInspectionScope;
  readonly ownerResolution: EvaluationSelectionResolution;
  readonly choice?: EvaluationSelectionChoice;
  readonly completeness: ValidationCompleteness;
  readonly constraints: readonly RosterSelectionConstraintReport[];
}

export interface RosterSelectionConstraintsInRosterReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly inspectionScope: RosterSelectionConstraintInspectionScope;
  readonly completeness: ValidationCompleteness;
  readonly selections: readonly RosterSelectionConstraintsReport[];
}

/** Inspects every selected owner, sharing one lazily evaluated cost report for
 * all self-cost constraints in this call rather than recalculating per bound. */
export function inspectRosterSelectionConstraintsInRoster(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  options: RosterSelectionConstraintCollectionOptions = {},
): Result<RosterSelectionConstraintsInRosterReport> {
  const diagnostics: Diagnostic[] = [];
  const selections: RosterSelectionConstraintsReport[] = [];
  const inspectionScope = options.inspectionScope ?? "base";
  const costReport = lazyCostReport(roster, context, inspectionScope);

  const visitSelection = (owner: RosterSelection): void => {
    const inspected = inspectSelectionConstraints(
      roster,
      context,
      owner,
      { inspectionScope },
      costReport,
    );
    diagnostics.push(...inspected.diagnostics);
    if (inspected.ok) {
      selections.push(inspected.value);
    }
    for (const child of owner.selections) {
      visitSelection(child);
    }
  };
  const visitForce = (force: RosterForce): void => {
    for (const selection of force.selections) {
      visitSelection(selection);
    }
    for (const child of force.forces) {
      visitForce(child);
    }
  };
  for (const force of roster.forces) {
    visitForce(force);
  }

  const completeness =
    diagnostics.length === 0 &&
    selections.every((selection) => selection.completeness === "complete")
      ? "complete"
      : "incomplete";
  return success(
    { roster, context, inspectionScope, completeness, selections },
    diagnostics,
  );
}

/** Inspects selection counts and resolved self-scoped cost-type bounds. */
export function inspectRosterSelectionConstraints(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  options: RosterSelectionConstraintCollectionOptions = {},
): Result<RosterSelectionConstraintsReport> {
  return inspectSelectionConstraints(roster, context, owner, options,
    lazyCostReport(roster, context, options.inspectionScope ?? "base"));
}

function inspectSelectionConstraints(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  options: RosterSelectionConstraintCollectionOptions,
  costReport: () => RosterCostReport | undefined,
): Result<RosterSelectionConstraintsReport> {
  const diagnostics: Diagnostic[] = [];
  const inspectionScope = options.inspectionScope ?? "base";
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const ownerLocations = rosterSelectionLocations(roster).filter(
    (location) => location.occurrence === owner,
  );
  const ownerResolution = resolveEvaluationSelection(
    owner,
    indexEvaluationChoices(context),
    catalogueMatches,
  );
  if (!catalogueMatches) {
    diagnostics.push(
      collectionDiagnostic(
        "EVALUATION_CONSTRAINT_COLLECTION_CATALOGUE_CONTEXT_MISMATCH",
        "The roster belongs to a different catalogue context.",
        {
          rosterCatalogueKey: roster.catalogue.key,
          contextCatalogueKey: expectedCatalogueKey(context),
        },
      ),
    );
  }
  if (ownerLocations.length !== 1) {
    diagnostics.push(
      collectionDiagnostic(
        ownerLocations.length === 0
          ? "EVALUATION_CONSTRAINT_COLLECTION_OWNER_NOT_FOUND"
          : "EVALUATION_CONSTRAINT_COLLECTION_OWNER_AMBIGUOUS",
        ownerLocations.length === 0
          ? `Selection occurrence ${owner.id} is not present in the roster.`
          : `Selection occurrence ${owner.id} appears more than once by identity.`,
        { occurrenceId: owner.id, candidates: ownerLocations.length },
      ),
    );
  }
  if (catalogueMatches && ownerResolution.status !== "resolved") {
    diagnostics.push(
      collectionDiagnostic(
        `EVALUATION_CONSTRAINT_COLLECTION_OWNER_DEFINITION_${ownerResolution.status.toUpperCase()}`,
        "The constrained selection definition could not be resolved uniquely.",
        {
          occurrenceId: owner.id,
          status: ownerResolution.status,
          candidates: ownerResolution.choices.length,
        },
      ),
    );
  }

  const choice =
    catalogueMatches &&
    ownerLocations.length === 1 &&
    ownerResolution.status === "resolved"
      ? ownerResolution.choices[0]
      : undefined;
  const constraints: RosterSelectionConstraintReport[] = [];
  for (const constraint of choice?.constraints ?? []) {
    const inspected = inspectConstraint(
      roster,
      context,
      owner,
      constraint,
      inspectionScope,
      costReport,
    );
    diagnostics.push(...inspected.diagnostics);
    if (inspected.ok) {
      constraints.push(inspected.value);
    }
  }
  const completeness =
    diagnostics.length === 0 &&
    constraints.length === (choice?.constraints.length ?? 0) &&
    constraints.every((constraint) => constraint.completeness === "complete")
      ? "complete"
      : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      inspectionScope,
      ownerResolution,
      ...(choice === undefined ? {} : { choice }),
      completeness,
      constraints,
    },
    diagnostics,
  );
}

/** Reads a base selection-count or self-cost bound without applying modifiers. */
export function inspectRosterSelectionConstraint<
  Constraint extends RosterSelectionConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  constraint: Constraint,
): Result<RosterSelectionConstraintReport<Constraint>> {
  return inspectConstraint(
    roster,
    context,
    owner,
    constraint,
    "base",
  );
}

/** Reads a count or self-cost bound with only unconditional numeric modifiers. */
export function inspectRosterSelectionConstraintWithUnconditionalModifiers<
  Constraint extends RosterSelectionConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  constraint: Constraint,
): Result<RosterSelectionConstraintReport<Constraint>> {
  return inspectConstraint(
    roster,
    context,
    owner,
    constraint,
    "unconditionalModifiers",
  );
}

/** Reads a count or self-cost bound using supported live condition modifiers. */
export function inspectRosterSelectionConstraintWithSelectionConditions<
  Constraint extends RosterSelectionConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  constraint: Constraint,
): Result<RosterSelectionConstraintReport<Constraint>> {
  return inspectConstraint(
    roster,
    context,
    owner,
    constraint,
    "selectionConditions",
  );
}

function inspectConstraint<Constraint extends RosterSelectionConstraintSource>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  constraint: Constraint,
  inspectionScope: RosterSelectionConstraintInspectionScope,
  sharedCostReport?: () => RosterCostReport | undefined,
): Result<RosterSelectionConstraintReport<Constraint>> {
  const diagnostics: Diagnostic[] = [];
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const locations = rosterSelectionLocations(roster);
  const ownerLocations = locations.filter(
    (location) => location.occurrence === owner,
  );
  const choices = indexEvaluationChoices(context);
  const ownerResolution = resolveEvaluationSelection(
    owner,
    choices,
    catalogueMatches,
  );
  const constraintType = supportedConstraintType(constraint.type);
  const scope = supportedScope(constraint.scope);
  const limit = finiteValue(constraint.value);
  const attributes = [...unsupportedAttributes(constraint)];
  const costType = selfConstraintCostType(context, constraint);
  // Projection preserves malformed raw values; absence of a typed Boolean must
  // not quietly turn an unknown cost traversal into a precise owner-only sum.
  if (costType !== undefined) {
    for (const key of ["shared", "percentValue", "includeChildSelections", "includeChildForces"]) {
      const raw = constraint.node.attributes[key];
      if (raw !== undefined && !["true", "false", "1", "0"].includes(raw)) attributes.push(key);
    }
    if (constraint.node.children?.some(child => child.kind === "element")) attributes.push("child elements");
  }

  if (!catalogueMatches) {
    diagnostics.push(
      constraintDiagnostic(
        constraint,
        "EVALUATION_CONSTRAINT_CATALOGUE_CONTEXT_MISMATCH",
        "The roster belongs to a different catalogue context.",
        undefined,
        ["resolution"],
        {
          rosterCatalogueKey: roster.catalogue.key,
          contextCatalogueKey: expectedCatalogueKey(context),
        },
      ),
    );
  }
  diagnoseOwner(owner, ownerLocations, constraint, diagnostics);
  diagnoseOwnerResolution(ownerResolution, constraint, diagnostics);
  diagnoseConstraintShape(
    constraint,
    constraintType,
    scope,
    limit,
    attributes,
    diagnostics,
    costType !== undefined,
  );

  const targetIds = ownerResolution.choices.flatMap((choice) => {
    const id = constraint.shared === true ? choice.definitionId : choice.id;
    return id === undefined ? [] : [id];
  });
  const targetId =
    ownerResolution.status === "resolved" && targetIds.length === 1
      ? targetIds[0]
      : undefined;
  if (
    catalogueMatches &&
    ownerResolution.status === "resolved" &&
    targetId === undefined
  ) {
    diagnostics.push(
      constraintDiagnostic(
        constraint,
        "EVALUATION_CONSTRAINT_TARGET_ID_MISSING",
        "The constrained selection has no usable source identity.",
        undefined,
        ["resolution"],
        {
          occurrenceId: owner.id,
          shared: constraint.shared,
          candidates: targetIds.length,
        },
      ),
    );
  }

  const resolvedChoice =
    ownerResolution.status === "resolved"
      ? ownerResolution.choices[0]
      : undefined;
  const constraintId = constraint.id;
  const modifiers =
    constraintId === undefined || resolvedChoice === undefined
      ? []
      : resolvedChoice.modifiers.filter(
          (modifier) => modifier.field === constraintId,
        );
  const modifierGroups =
    constraintId === undefined || resolvedChoice === undefined
      ? []
      : resolvedChoice.modifierGroups.filter((group) =>
          modifierGroupTargetsConstraint(group, constraintId),
        );
  const modifierSource = modifiers[0] ?? modifierGroups[0];
  if (inspectionScope === "base" && modifierSource !== undefined) {
    diagnostics.push({
      ...constraintDiagnostic(
        constraint,
        "EVALUATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        "Constraint-targeting modifiers are preserved but are not evaluated.",
        undefined,
        ["compatibility"],
        {
          constraintId,
          modifiers: modifiers.length,
          modifierGroups: modifierGroups.length,
        },
      ),
      location: {
        source: modifierSource.source,
        path: modifierSource.path,
      },
    });
  }

  const modifierApplicability: RosterModifierApplicabilityReport<RosterSelectionConstraintModifier>[] =
    [];
  const modifierGroupApplicability: RosterModifierGroupApplicabilityReport<RosterSelectionConstraintModifierGroup>[] =
    [];
  if (inspectionScope === "selectionConditions") {
    for (const modifier of modifiers) {
      const evaluated = evaluateRosterModifierApplicability(
        roster,
        context,
        owner,
        modifier,
        { effectiveCategories: effectiveRosterCategories(roster, context) },
      );
      diagnostics.push(...evaluated.diagnostics);
      if (evaluated.ok) {
        modifierApplicability.push(evaluated.value);
      }
    }
    for (const group of modifierGroups) {
      const evaluated = evaluateRosterModifierGroupApplicability(
        roster,
        context,
        owner,
        group,
        { effectiveCategories: effectiveRosterCategories(roster, context) },
      );
      diagnostics.push(...evaluated.diagnostics);
      if (evaluated.ok) {
        modifierGroupApplicability.push(evaluated.value);
      }
    }
  }

  let effectiveLimit = limit;
  let modifierSequence:
    | NumericModifierSequenceReport<RosterSelectionConstraintModifier>
    | undefined;
  let repeatReports: readonly RosterRepeatReport[] = [];
  if (limit !== undefined) {
    if (inspectionScope !== "base") {
      const groupedExecution =
        inspectionScope === "selectionConditions" &&
        constraintId !== undefined
          ? collectRosterModifierGroupExecution<RosterSelectionConstraintModifier>(
              modifierGroupApplicability,
              constraintId,
            )
          : { modifiers: [], entries: [] };
      const sequenceModifiers = [
        ...modifiers,
        ...groupedExecution.modifiers,
      ];
      const applicabilityByModifier = new Map<
        RosterSelectionConstraintModifier,
        {
          readonly status: "applicable" | "notApplicable" | "unresolved";
          readonly evaluated: boolean;
        }
      >();
      for (const report of modifierApplicability) {
        applicabilityByModifier.set(report.modifier, report);
      }
      for (const entry of groupedExecution.entries) {
        applicabilityByModifier.set(entry.modifier, entry);
      }
      const repeatEvaluation = evaluateRosterModifierRepeats(
        roster,
        context,
        owner,
        sequenceModifiers,
        {
          applicability: (modifier) =>
            applicabilityByModifier.get(modifier)?.status,
        },
      );
      diagnostics.push(...repeatEvaluation.diagnostics);
      const repeats = repeatEvaluation.ok
        ? repeatEvaluation.value
        : undefined;
      repeatReports = repeats?.repeats ?? [];
      const evaluated = evaluateNumericModifierSequence(
        limit,
        sequenceModifiers,
        {
          applicability: (modifier) => {
            const report = applicabilityByModifier.get(modifier);
            return report?.evaluated === true
              ? report.status
              : undefined;
          },
          conditionGroupsEvaluated: (modifier) =>
            applicabilityByModifier.get(modifier)?.evaluated === true,
          repetitionCount: (modifier) => repeats?.counts.get(modifier),
        },
      );
      diagnostics.push(...evaluated.diagnostics);
      if (evaluated.ok) {
        modifierSequence = evaluated.value;
        effectiveLimit = evaluated.value.value;
      }
      const groupSource = modifierGroups[0];
      if (
        groupSource !== undefined &&
        inspectionScope !== "selectionConditions"
      ) {
        diagnostics.push({
          ...constraintDiagnostic(
            constraint,
            "EVALUATION_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED",
            "Constraint-targeting modifier groups are preserved but are not evaluated.",
            undefined,
            ["compatibility"],
            {
              constraintId,
              modifierGroups: modifierGroups.length,
            },
          ),
          location: { source: groupSource.source, path: groupSource.path },
        });
      }
      // An unmodified sentinel stays a sentinel: the base was "no bound" and
      // nothing applied, so there is nothing to report. A negative *computed*
      // from a real base is still unexplained and still withholds.
      const effectiveIsUntouchedSentinel =
        isUnboundedConstraintValue(effectiveLimit) &&
        isUnboundedConstraintValue(limit);
      if (
        effectiveLimit !== undefined &&
        effectiveLimit < 0 &&
        !effectiveIsUntouchedSentinel
      ) {
        diagnostics.push(
          constraintDiagnostic(
            constraint,
            "EVALUATION_CONSTRAINT_EFFECTIVE_VALUE_NEGATIVE_UNSUPPORTED",
            "Numeric modifiers produced a negative constraint limit.",
            undefined,
            ["compatibility"],
            { baseLimit: limit, effectiveLimit },
          ),
        );
      }
    } else {
      modifierSequence = emptyModifierSequence(limit);
    }
  }

  const canCollect =
    catalogueMatches &&
    ownerLocations.length === 1 &&
    ownerResolution.status === "resolved" &&
    targetId !== undefined &&
    constraintType !== undefined &&
    constraint.field === "selections" &&
    scope !== undefined &&
    limit !== undefined &&
    (limit >= 0 || isUnboundedConstraintValue(limit)) &&
    constraint.percentValue !== true &&
    attributes.length === 0;
  // A typed scope counts inside the nearest containing entry of that type, so
  // it has to be resolved before the scope can be walked. An unresolvable one
  // withholds the count rather than falling back to a wider set.
  const typedScopeTypes = typedSelectionTypes(constraint.scope);
  const needsContainer = typedScopeTypes !== undefined || scope === "identity";
  const typedScope = !canCollect
    ? undefined
    : typedScopeTypes !== undefined
      ? nearestTypedSelection(
          ownerLocations[0] as RosterSelectionLocation,
          choices,
          catalogueMatches,
          typedScopeTypes,
        )
      : scope === "identity"
        ? nearestIdentitySelection(
            ownerLocations[0] as RosterSelectionLocation,
            choices,
            catalogueMatches,
            constraint.scope as ObjectId,
            // No category index here: a category-identity scope stays
            // unresolved, and no corpus constraint writes one.
            undefined,
          )
        : undefined;
  const typedScopeUsable =
    !needsContainer ||
    (typedScope !== undefined &&
      !typedScope.unresolved &&
      typedScope.occurrence !== undefined);
  const occurrences =
    canCollect && typedScopeUsable
      ? evaluationSelectionScope(
          roster,
          ownerLocations[0] as RosterSelectionLocation,
          scope,
          constraint.includeChildSelections === true,
          constraint.includeChildForces === true,
          typedScope?.occurrence,
        )
      : [];
  const candidates = occurrences.map((occurrence) =>
    evaluationSelectionIdentityCandidate(
      occurrence,
      choices,
      catalogueMatches,
      targetId,
      constraint.shared === true,
    ),
  );
  const matching = candidates.flatMap((candidate) =>
    candidate.status === "match" ? [candidate.occurrence] : [],
  );
  const unresolvedCount = candidates.filter(
    (candidate) => candidate.status === "unresolved",
  ).length;
  const bounds = selectionAmountBounds(candidates);
  const canInspectCost = catalogueMatches && ownerLocations.length === 1 &&
    ownerResolution.status === "resolved" && costType?.id !== undefined &&
    constraintType !== undefined && limit !== undefined &&
    (limit >= 0 || isUnboundedConstraintValue(limit)) &&
    constraint.percentValue !== true && attributes.length === 0;
  const costReport = canInspectCost
    ? (sharedCostReport ?? lazyCostReport(roster, context, inspectionScope))()
    : undefined;
  const costEvaluation = costReport !== undefined && costType?.id !== undefined
    ? queryCostConstraint(costReport, new Set(evaluationSelectionScope(roster,
      ownerLocations[0]!, "self", constraint.includeChildSelections === true, false)), costType.id, costType)
    : undefined;
  if (canInspectCost && costEvaluation?.exact !== true) {
    diagnostics.push(constraintDiagnostic(constraint, "EVALUATION_CONSTRAINT_COST_UNRESOLVED",
      "The selection's scoped cost could not be totaled exactly.", undefined, ["compatibility"],
      { typeId: costType?.id, unresolvedSelections: costEvaluation?.unresolvedSelections,
        unresolvedCosts: costEvaluation?.unresolvedCosts, modifiersWithoutBaseCost: costEvaluation?.modifiersWithoutBaseCost }));
  }
  // Uncertain numeric costs can be negative or modified either way; their
  // retained subtotal is not a safe bound. Keep status and observed unresolved.
  const minimum = costType === undefined ? bounds.minimum : costEvaluation?.exact === true ? costEvaluation.value : Number.NEGATIVE_INFINITY;
  const maximum = costType === undefined ? bounds.maximum : costEvaluation?.exact === true ? costEvaluation.value : Number.POSITIVE_INFINITY;
  const canObserve = canCollect || costEvaluation?.exact === true;

  if (unresolvedCount > 0) {
    diagnostics.push(
      constraintDiagnostic(
        constraint,
        "EVALUATION_CONSTRAINT_CANDIDATES_UNRESOLVED",
        "Some roster selections could not be identified for constraint counting.",
        undefined,
        ["resolution"],
        { unresolved: unresolvedCount, minimum, maximum },
      ),
    );
  }
  if (bounds.invalidAmounts.length > 0) {
    diagnostics.push(
      constraintDiagnostic(
        constraint,
        "EVALUATION_CONSTRAINT_SELECTION_AMOUNT_INVALID",
        "Some roster selections have invalid amounts, so the constraint count is not exact.",
        undefined,
        ["compatibility"],
        {
          selectionIds: bounds.invalidAmounts.map(({ id }) => id),
          minimum,
          maximum,
        },
      ),
    );
  }

  // `-1` is "no bound", so the constraint cannot be violated whatever the count
  // is. Decided from the **authored** value, not the computed one: a -1 that
  // arithmetic produced from a real base is underflow, not a sentinel, and
  // still withholds. Counting above is deliberately left switched on, because
  // a modifier may replace the sentinel with a real limit.
  const baseIsUnbounded = isUnboundedConstraintValue(limit);
  const effectiveIsUnbounded =
    baseIsUnbounded && isUnboundedConstraintValue(effectiveLimit);

  const baseStatus = baseIsUnbounded
    ? "satisfied"
    : canObserve && constraintType !== undefined && limit !== undefined
      ? constraintStatus(constraintType, minimum, maximum, limit)
      : "unresolved";
  const effectiveStatus = effectiveIsUnbounded
    ? "satisfied"
    : canObserve &&
    constraintType !== undefined &&
    effectiveLimit !== undefined &&
    effectiveLimit >= 0 &&
    modifierSequence?.completeness === "complete" &&
    (inspectionScope === "selectionConditions" ||
      modifierGroups.length === 0)
      ? constraintStatus(constraintType, minimum, maximum, effectiveLimit)
      : "unresolved";
  const status =
    inspectionScope === "base"
      ? modifiers.length === 0 && modifierGroups.length === 0
        ? baseStatus
        : "unresolved"
      : effectiveStatus;
  const completeness =
    diagnostics.length === 0 ? "complete" : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      constraint,
      inspectionScope,
      baseStatus,
      status,
      completeness,
      ownerResolution,
      targetIds,
      modifiers,
      modifierGroups,
      modifierApplicability,
      modifierGroupApplicability,
      repeatReports,
      candidates,
      matching,
      minimum,
      maximum,
      ...(minimum === maximum ? { observed: minimum } : {}),
      ...(limit === undefined ? {} : { baseLimit: limit }),
      ...(effectiveLimit === undefined ? {} : { limit: effectiveLimit }),
      ...(modifierSequence === undefined ? {} : { modifierSequence }),
      ...(constraintType === undefined ? {} : { constraintType }),
      ...(scope === undefined ? {} : { scope }),
      ...(costEvaluation === undefined ? {} : { costEvaluation }),
    },
    diagnostics,
  );
}

function selfConstraintCostType(context: BattleScribeCatalogueContext, constraint: RosterSelectionConstraintSource): RosterCostType | undefined {
  if (constraint.scope !== "self" || constraint.field === undefined || constraint.field === "selections") return undefined;
  const targets = battleScribeReachableObjectsById(context.graph, context.document, objectId(constraint.field));
  return targets.length === 1 && targets[0]?.kind === "costType" ? targets[0].source as RosterCostType : undefined;
}

function lazyCostReport(roster: Roster, context: BattleScribeCatalogueContext, scope: RosterSelectionConstraintInspectionScope): () => RosterCostReport | undefined {
  let evaluated = false;
  let report: RosterCostReport | undefined;
  return () => {
    if (!evaluated) {
      const result = scope === "base" ? evaluateRosterBaseCosts(roster, context)
        : scope === "unconditionalModifiers" ? evaluateRosterCostsWithUnconditionalModifiers(roster, context)
        : evaluateRosterCostsWithSelectionConditions(roster, context);
      report = result.ok ? result.value : undefined;
      evaluated = true;
    }
    return report;
  };
}

function diagnoseOwner(
  owner: RosterSelection,
  locations: readonly RosterSelectionLocation[],
  constraint: RosterSelectionConstraintSource,
  diagnostics: Diagnostic[],
): void {
  if (locations.length === 1) {
    return;
  }
  diagnostics.push(
    constraintDiagnostic(
      constraint,
      locations.length === 0
        ? "EVALUATION_CONSTRAINT_OWNER_NOT_FOUND"
        : "EVALUATION_CONSTRAINT_OWNER_AMBIGUOUS",
      locations.length === 0
        ? `Selection occurrence ${owner.id} is not present in the roster.`
        : `Selection occurrence ${owner.id} appears more than once by identity.`,
      undefined,
      ["resolution"],
      { occurrenceId: owner.id, candidates: locations.length },
    ),
  );
}

function diagnoseOwnerResolution(
  resolution: EvaluationSelectionResolution,
  constraint: RosterSelectionConstraintSource,
  diagnostics: Diagnostic[],
): void {
  if (resolution.status === "resolved") {
    return;
  }
  const code =
    resolution.status === "ambiguous"
      ? "EVALUATION_CONSTRAINT_OWNER_DEFINITION_AMBIGUOUS"
      : resolution.status === "unavailable"
        ? "EVALUATION_CONSTRAINT_OWNER_DEFINITION_UNAVAILABLE"
        : "EVALUATION_CONSTRAINT_OWNER_DEFINITION_UNRESOLVED";
  const message =
    resolution.status === "ambiguous"
      ? "The constrained selection resolves to more than one definition."
      : resolution.status === "unavailable"
        ? "The constrained selection definition is unavailable."
        : "The constrained selection definition could not be resolved completely.";
  diagnostics.push(
    constraintDiagnostic(
      constraint,
      code,
      message,
      undefined,
      ["resolution"],
      {
        occurrenceId: resolution.occurrence.id,
        status: resolution.status,
        candidates: resolution.choices.length,
      },
    ),
  );
}

function diagnoseConstraintShape(
  constraint: RosterSelectionConstraintSource,
  constraintType: RosterSelectionConstraintType | undefined,
  scope: EvaluationSelectionScope | undefined,
  limit: number | undefined,
  attributes: readonly string[],
  diagnostics: Diagnostic[],
  supportedCostField: boolean,
): void {
  if (constraint.type === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "TYPE_MISSING", "type"));
  } else if (constraintType === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "TYPE_UNSUPPORTED", "type"));
  }
  if (constraint.field === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "FIELD_MISSING", "field"));
  } else if (constraint.field !== "selections" && !supportedCostField) {
    diagnostics.push(
      shapeDiagnostic(constraint, "FIELD_UNSUPPORTED", "field"),
    );
  }
  if (constraint.scope === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "SCOPE_MISSING", "scope"));
  } else if (scope === undefined) {
    diagnostics.push(
      shapeDiagnostic(constraint, "SCOPE_UNSUPPORTED", "scope"),
    );
  }
  if (constraint.value === undefined) {
    diagnostics.push(
      shapeDiagnostic(
        constraint,
        Object.hasOwn(constraint.node.attributes, "value")
          ? "VALUE_INVALID"
          : "VALUE_MISSING",
        "value",
      ),
    );
  } else if (limit === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "VALUE_INVALID", "value"));
  } else if (limit < 0 && !isUnboundedConstraintValue(limit)) {
    // `-1` is the "no bound" sentinel and is handled; a different negative is
    // still unexplained, so it keeps withholding rather than guessing.
    diagnostics.push(
      shapeDiagnostic(constraint, "VALUE_NEGATIVE_UNSUPPORTED", "value"),
    );
  }
  if (constraint.percentValue === true) {
    diagnostics.push(
      shapeDiagnostic(constraint, "PERCENT_UNSUPPORTED", "percentValue"),
    );
  }
  if (attributes.length > 0) {
    diagnostics.push(
      constraintDiagnostic(
        constraint,
        "EVALUATION_CONSTRAINT_ATTRIBUTES_UNSUPPORTED",
        "A constraint has generic attributes with unsupported behavior.",
        attributes[0],
        ["compatibility"],
        { attributes, values: constraint.node.attributes },
      ),
    );
  }
}

function constraintStatus(
  type: RosterSelectionConstraintType,
  minimum: number,
  maximum: number,
  limit: number,
): RosterSelectionConstraintStatus {
  if (type === "min") {
    if (minimum >= limit) {
      return "satisfied";
    }
    return maximum < limit ? "violated" : "unresolved";
  }
  if (maximum <= limit) {
    return "satisfied";
  }
  return minimum > limit ? "violated" : "unresolved";
}

function selectionAmountBounds(
  candidates: readonly EvaluationSelectionIdentityCandidate[],
): {
  readonly minimum: number;
  readonly maximum: number;
  readonly invalidAmounts: readonly RosterSelection[];
} {
  let minimum = 0;
  let maximum = 0;
  const invalidAmounts: RosterSelection[] = [];
  for (const candidate of candidates) {
    if (candidate.status === "different") {
      continue;
    }
    const amount = rosterSelectionAmount(candidate.occurrence);
    if (!Number.isFinite(amount) || amount <= 0) {
      invalidAmounts.push(candidate.occurrence);
      maximum = Number.POSITIVE_INFINITY;
      continue;
    }
    if (candidate.status === "match") {
      minimum += amount;
    }
    if (maximum !== Number.POSITIVE_INFINITY) {
      maximum += amount;
    }
  }
  return { minimum, maximum, invalidAmounts };
}

function emptyModifierSequence(
  value: number,
): NumericModifierSequenceReport<RosterSelectionConstraintModifier> {
  return {
    baseValue: value,
    value,
    completeness: "complete",
    steps: [],
  };
}

function modifierGroupTargetsConstraint(
  group: RosterSelectionConstraintModifierGroup,
  constraintId: ObjectId,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === constraintId) ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsConstraint(child, constraintId),
    )
  );
}

function supportedConstraintType(
  value: string | undefined,
): RosterSelectionConstraintType | undefined {
  return value === "min" || value === "max" ? value : undefined;
}

/**
 * The constraint scopes this evaluator can count over.
 *
 * `unit`, `model`, `model-or-unit`, and `upgrade` name a containing entry by its
 * type; `root-entry` names the top-level selection. They resolve through the
 * same nearest-typed-ancestor walk conditions already use, so a constraint and a
 * condition written with the same scope agree.
 *
 * `ancestor` stays out: it names a chain rather than one containing occurrence,
 * and it does not appear on any corpus constraint.
 */
function supportedScope(
  value: string | undefined,
): EvaluationSelectionScope | undefined {
  return value === "self" ||
    value === "parent" ||
    value === "force" ||
    value === "roster" ||
    value === "root-entry" ||
    value === "unit" ||
    value === "model" ||
    value === "model-or-unit" ||
    value === "upgrade"
    ? value
    : // A scope shaped like an object ID names a containing occurrence. The
      // corpus writes 116 of these against selection entries —
      // `max 4 Players per <Troupe>`, `max 1 Reaver per <Reavers>`.
      //
      // `ancestor` names a chain rather than one occurrence, and an unknown
      // scope *word* is not an ID, so both stay unsupported. Requiring the ID
      // shape is what keeps them apart.
      value !== undefined && looksLikeObjectId(value)
      ? "identity"
      : undefined;
}

/**
 * True for a BattleScribe object ID: hexadecimal groups joined by dashes.
 *
 * Distinguishes a scope naming an entry, `4986-bf86-beb4-13ac`, from an
 * unrecognised scope word such as `category-unit`, which must stay unsupported
 * rather than being resolved against nothing.
 */
function looksLikeObjectId(value: string): boolean {
  const segments = value.split("-");
  return (
    segments.length > 1 &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        [...segment].every(
          (char) =>
            (char >= "0" && char <= "9") || (char >= "a" && char <= "f"),
        ),
    )
  );
}

function finiteValue(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function unsupportedAttributes(
  constraint: RosterSelectionConstraintSource,
): readonly string[] {
  const supported = new Set([
    "id",
    "type",
    "field",
    "scope",
    "value",
    "percentValue",
    "shared",
    "includeChildSelections",
    "includeChildForces",
    // `automatic` cannot change what a bound *means*: all 109 corpus instances
    // carry an already-supported shape, and `automatic="false"` sits on squad
    // sizes such as Khorne Berzerker `min 5` and Recon Troopers `min 9` - rules
    // that are plainly enforced. New Recruit checks the flag only when repairing
    // a changed bound; initial minima and the bound itself do not depend on it.
    "automatic",
    "message",
    "comment",
  ]);
  return Object.keys(constraint.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function shapeDiagnostic(
  constraint: RosterSelectionConstraintSource,
  suffix: string,
  attribute: string,
): Diagnostic {
  const descriptions: Readonly<Record<string, string>> = {
    TYPE_MISSING: "A constraint has no limit type.",
    TYPE_UNSUPPORTED: `Constraint type ${constraint.type} is not supported.`,
    FIELD_MISSING: "A constraint has no query field.",
    FIELD_UNSUPPORTED: `Constraint field ${constraint.field} is not supported.`,
    SCOPE_MISSING: "A constraint has no query scope.",
    SCOPE_UNSUPPORTED: `Constraint scope ${constraint.scope} is not supported.`,
    VALUE_MISSING: "A constraint has no limit value.",
    VALUE_INVALID: "A constraint limit is not a finite number.",
    VALUE_NEGATIVE_UNSUPPORTED:
      "Negative constraint limits are not supported.",
    PERCENT_UNSUPPORTED: "Percentage constraint values are not supported.",
  };
  return constraintDiagnostic(
    constraint,
    `EVALUATION_CONSTRAINT_${suffix}`,
    descriptions[suffix] ?? "A constraint shape is not supported.",
    attribute,
    ["compatibility"],
    {
      type: constraint.type,
      field: constraint.field,
      scope: constraint.scope,
      value: constraint.value,
    },
  );
}

function constraintDiagnostic(
  constraint: RosterSelectionConstraintSource,
  code: string,
  message: string,
  attribute: string | undefined,
  impacts: Diagnostic["impacts"],
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts,
    location: {
      source: constraint.source,
      path:
        attribute === undefined
          ? constraint.path
          : [...constraint.path, `@${attribute}`],
    },
    details,
  };
}

function collectionDiagnostic(
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility", "resolution"],
    details,
  };
}
