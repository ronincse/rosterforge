import type {
  BattleScribeCatalogueContext,
  BattleScribeForceDefinition,
} from "@rosterforge/data-graph";
import { battleScribeReachableObjectsById } from "@rosterforge/data-graph";

import {
  objectId,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type { Roster, RosterForce } from "@rosterforge/roster-model";

import {
  evaluationForceIdentityCandidate,
  indexEvaluationForces,
  resolveEvaluationForce,
  rosterForceLocations,
  rosterForcesInScope,
  type EvaluationForceIdentityCandidate,
  type EvaluationForceResolution,
  type RosterForceLocation,
} from "./force-context.js";
import {
  expectedCatalogueKey,
  evaluationSelectionsInForces,
  rosterMatchesCatalogueContext,
} from "./selection-context.js";
import {
  evaluateRosterCostsWithSelectionConditions,
  type RosterCostModifierGroup,
  type RosterCostType,
  type RosterSelectionConditionCostReport,
  type RosterSelectionCostEvaluation,
} from "./costs.js";
import type { RosterSelectionConstraintSource } from "./constraints.js";
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

export type RosterForceConstraintSource = RosterSelectionConstraintSource;
export type RosterForceConstraintType = "min" | "max";
export type RosterForceConstraintStatus =
  | "satisfied"
  | "violated"
  | "unresolved";
export type RosterForceConstraintInspectionScope =
  | "base"
  | "unconditionalModifiers"
  | "conditions";
export type RosterForceConstraintModifier =
  BattleScribeForceDefinition["source"]["modifiers"][number];
export type RosterForceConstraintModifierGroup =
  BattleScribeForceDefinition["source"]["modifierGroups"][number];
export type RosterForceConstraintScope = "parent" | "force" | "roster";

export interface RosterForceConstraintCostEvaluation {
  readonly typeId: ObjectId;
  readonly costType: RosterCostType;
  readonly report: RosterSelectionConditionCostReport;
  readonly selections: readonly RosterSelectionCostEvaluation[];
  readonly value: number;
  readonly exact: boolean;
  readonly unresolvedSelections: number;
  readonly unresolvedCosts: number;
  readonly modifiersWithoutBaseCost: number;
}

export interface RosterForceConstraintReport<
  Constraint extends RosterForceConstraintSource =
    RosterForceConstraintSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterForce;
  readonly constraint: Constraint;
  readonly inspectionScope: RosterForceConstraintInspectionScope;
  readonly baseStatus: RosterForceConstraintStatus;
  readonly status: RosterForceConstraintStatus;
  readonly completeness: ValidationCompleteness;
  readonly ownerResolution: EvaluationForceResolution;
  readonly targetIds: readonly ObjectId[];
  readonly modifiers: readonly RosterForceConstraintModifier[];
  readonly modifierGroups: readonly RosterForceConstraintModifierGroup[];
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<RosterForceConstraintModifier>[];
  readonly modifierGroupApplicability: readonly RosterModifierGroupApplicabilityReport<RosterForceConstraintModifierGroup>[];
  readonly repeatReports: readonly RosterRepeatReport[];
  readonly candidates: readonly EvaluationForceIdentityCandidate[];
  readonly matching: readonly RosterForce[];
  readonly minimum: number;
  readonly maximum: number;
  readonly observed?: number;
  readonly baseLimit?: number;
  readonly limit?: number;
  readonly modifierSequence?: NumericModifierSequenceReport<RosterForceConstraintModifier>;
  readonly costEvaluation?: RosterForceConstraintCostEvaluation;
  readonly constraintType?: RosterForceConstraintType;
  readonly scope?: RosterForceConstraintScope;
}

export interface RosterForceConstraintCollectionOptions {
  readonly inspectionScope?: RosterForceConstraintInspectionScope;
}

export interface RosterForceConstraintsReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterForce;
  readonly inspectionScope: RosterForceConstraintInspectionScope;
  readonly ownerResolution: EvaluationForceResolution;
  readonly definition?: BattleScribeForceDefinition;
  readonly completeness: ValidationCompleteness;
  readonly constraints: readonly RosterForceConstraintReport[];
}

export interface RosterForceConstraintsInRosterReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly inspectionScope: RosterForceConstraintInspectionScope;
  readonly completeness: ValidationCompleteness;
  readonly forces: readonly RosterForceConstraintsReport[];
}

export function inspectRosterForceConstraintsInRoster(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  options: RosterForceConstraintCollectionOptions = {},
): Result<RosterForceConstraintsInRosterReport> {
  const diagnostics: Diagnostic[] = [];
  const forces: RosterForceConstraintsReport[] = [];
  const inspectionScope = options.inspectionScope ?? "base";

  const visit = (owner: RosterForce): void => {
    const inspected = inspectRosterForceConstraints(
      roster,
      context,
      owner,
      { inspectionScope },
    );
    diagnostics.push(...inspected.diagnostics);
    if (inspected.ok) {
      forces.push(inspected.value);
    }
    for (const child of owner.forces) {
      visit(child);
    }
  };
  for (const force of roster.forces) {
    visit(force);
  }

  const completeness =
    diagnostics.length === 0 &&
    forces.every((force) => force.completeness === "complete")
      ? "complete"
      : "incomplete";
  return success(
    { roster, context, inspectionScope, completeness, forces },
    diagnostics,
  );
}

export function inspectRosterForceConstraints(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  options: RosterForceConstraintCollectionOptions = {},
): Result<RosterForceConstraintsReport> {
  const diagnostics: Diagnostic[] = [];
  const inspectionScope = options.inspectionScope ?? "base";
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const locations = rosterForceLocations(roster).filter(
    (location) => location.occurrence === owner,
  );
  const ownerResolution = resolveEvaluationForce(
    owner,
    indexEvaluationForces(context),
    catalogueMatches,
  );

  if (!catalogueMatches) {
    diagnostics.push(
      collectionDiagnostic(
        "EVALUATION_FORCE_CONSTRAINT_COLLECTION_CATALOGUE_CONTEXT_MISMATCH",
        "The roster belongs to a different catalogue context.",
        {
          rosterCatalogueKey: roster.catalogue.key,
          contextCatalogueKey: expectedCatalogueKey(context),
        },
      ),
    );
  }
  if (locations.length !== 1) {
    diagnostics.push(
      collectionDiagnostic(
        locations.length === 0
          ? "EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_NOT_FOUND"
          : "EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_AMBIGUOUS",
        locations.length === 0
          ? `Force occurrence ${owner.id} is not present in the roster.`
          : `Force occurrence ${owner.id} appears more than once by identity.`,
        { occurrenceId: owner.id, candidates: locations.length },
      ),
    );
  }
  if (catalogueMatches && ownerResolution.status !== "resolved") {
    diagnostics.push(
      collectionDiagnostic(
        `EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_DEFINITION_${ownerResolution.status.toUpperCase()}`,
        "The constrained force definition could not be resolved uniquely.",
        {
          occurrenceId: owner.id,
          status: ownerResolution.status,
          candidates: ownerResolution.definitions.length,
        },
      ),
    );
  }

  const definition =
    catalogueMatches &&
    locations.length === 1 &&
    ownerResolution.status === "resolved"
      ? ownerResolution.definitions[0]
      : undefined;
  const constraints: RosterForceConstraintReport[] = [];
  const projectedConstraints = definition?.source.constraints ?? [];
  const needsCostReport = projectedConstraints.some(
    (constraint) => resolvedCostTypes(context, constraint.field).length > 0,
  );
  const costReport = needsCostReport
    ? evaluateRosterCostsWithSelectionConditions(roster, context)
    : undefined;
  for (const constraint of projectedConstraints) {
    const inspected = inspectForceConstraint(
      roster,
      context,
      owner,
      constraint,
      inspectionScope,
      costReport?.ok ? costReport.value : undefined,
    );
    diagnostics.push(...inspected.diagnostics);
    if (inspected.ok) {
      constraints.push(inspected.value);
    }
  }
  const completeness =
    diagnostics.length === 0 &&
    constraints.length === (definition?.source.constraints.length ?? 0) &&
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
      ...(definition === undefined ? {} : { definition }),
      completeness,
      constraints,
    },
    diagnostics,
  );
}

export function inspectRosterForceConstraint<
  Constraint extends RosterForceConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  constraint: Constraint,
): Result<RosterForceConstraintReport<Constraint>> {
  return inspectForceConstraint(
    roster,
    context,
    owner,
    constraint,
    "base",
  );
}

export function inspectRosterForceConstraintWithUnconditionalModifiers<
  Constraint extends RosterForceConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  constraint: Constraint,
): Result<RosterForceConstraintReport<Constraint>> {
  return inspectForceConstraint(
    roster,
    context,
    owner,
    constraint,
    "unconditionalModifiers",
  );
}

export function inspectRosterForceConstraintWithConditions<
  Constraint extends RosterForceConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  constraint: Constraint,
): Result<RosterForceConstraintReport<Constraint>> {
  return inspectForceConstraint(
    roster,
    context,
    owner,
    constraint,
    "conditions",
  );
}

function inspectForceConstraint<
  Constraint extends RosterForceConstraintSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  constraint: Constraint,
  inspectionScope: RosterForceConstraintInspectionScope,
  sharedCostReport?: RosterSelectionConditionCostReport,
): Result<RosterForceConstraintReport<Constraint>> {
  const diagnostics: Diagnostic[] = [];
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const locations = rosterForceLocations(roster).filter(
    (location) => location.occurrence === owner,
  );
  const forces = indexEvaluationForces(context);
  const ownerResolution = resolveEvaluationForce(
    owner,
    forces,
    catalogueMatches,
  );
  const constraintType = supportedConstraintType(constraint.type);
  const limit = finiteValue(constraint.value);
  const attributes = unsupportedAttributes(constraint);
  const costTypes = resolvedCostTypes(context, constraint.field);
  const costType = costTypes.length === 1 ? costTypes[0] : undefined;
  const costScope =
    costType !== undefined &&
    (constraint.scope === "parent" || constraint.scope === "force")
      ? constraint.scope
      : undefined;

  if (!catalogueMatches) {
    diagnostics.push(
      forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_CATALOGUE_CONTEXT_MISMATCH",
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
  diagnoseOwner(owner, locations.length, constraint, diagnostics);
  diagnoseOwnerResolution(ownerResolution, constraint, diagnostics);
  diagnoseConstraintShape(
    constraint,
    constraintType,
    limit,
    attributes,
    costTypes,
    costScope,
    diagnostics,
  );

  const targetIds =
    costType !== undefined
      ? costType.id === undefined
        ? []
        : [costType.id]
      : constraint.field === "forces"
        ? ownerResolution.definitions.flatMap((definition) =>
          definition.source.id === undefined ? [] : [definition.source.id],
        )
        : [];
  const targetId =
    constraint.field === "forces" &&
    ownerResolution.status === "resolved" &&
    targetIds.length === 1
      ? targetIds[0]
      : undefined;
  if (
    catalogueMatches &&
    constraint.field === "forces" &&
    ownerResolution.status === "resolved" &&
    targetId === undefined
  ) {
    diagnostics.push(
      forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_TARGET_ID_MISSING",
        "The constrained force has no usable source identity.",
        undefined,
        ["resolution"],
        { occurrenceId: owner.id, candidates: targetIds.length },
      ),
    );
  }

  const resolvedDefinition =
    ownerResolution.status === "resolved"
      ? ownerResolution.definitions[0]
      : undefined;
  const constraintId = constraint.id;
  const modifiers =
    constraintId === undefined || resolvedDefinition === undefined
      ? []
      : resolvedDefinition.source.modifiers.filter(
          (modifier) => modifier.field === constraintId,
        );
  const modifierGroups =
    constraintId === undefined || resolvedDefinition === undefined
      ? []
      : resolvedDefinition.source.modifierGroups.filter((group) =>
          modifierGroupTargetsConstraint(group, constraintId),
        );
  const modifierSource = modifiers[0] ?? modifierGroups[0];
  if (inspectionScope === "base" && modifierSource !== undefined) {
    diagnostics.push({
      ...forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        "Force-constraint modifiers are preserved but are not evaluated.",
        undefined,
        ["compatibility"],
        {
          constraintId,
          modifiers: modifiers.length,
          modifierGroups: modifierGroups.length,
        },
      ),
      location: { source: modifierSource.source, path: modifierSource.path },
    });
  }

  const modifierApplicability: RosterModifierApplicabilityReport<RosterForceConstraintModifier>[] =
    [];
  const modifierGroupApplicability: RosterModifierGroupApplicabilityReport<RosterForceConstraintModifierGroup>[] =
    [];
  if (inspectionScope === "conditions") {
    for (const modifier of modifiers) {
      const evaluated = evaluateRosterModifierApplicability(
        roster,
        context,
        owner,
        modifier,
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
      );
      diagnostics.push(...evaluated.diagnostics);
      if (evaluated.ok) {
        modifierGroupApplicability.push(evaluated.value);
      }
    }
  }

  let effectiveLimit = limit;
  let modifierSequence:
    | NumericModifierSequenceReport<RosterForceConstraintModifier>
    | undefined;
  let repeatReports: readonly RosterRepeatReport[] = [];
  if (limit !== undefined && inspectionScope !== "base") {
    const groupedExecution =
      inspectionScope === "conditions" && constraintId !== undefined
        ? collectRosterModifierGroupExecution<RosterForceConstraintModifier>(
            modifierGroupApplicability,
            constraintId,
          )
        : { modifiers: [], entries: [] };
    const sequenceModifiers = [
      ...modifiers,
      ...groupedExecution.modifiers,
    ];
    const applicabilityByModifier = new Map<
      RosterForceConstraintModifier,
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
    const repeats = repeatEvaluation.ok ? repeatEvaluation.value : undefined;
    repeatReports = repeats?.repeats ?? [];
    const evaluated = evaluateNumericModifierSequence(
      limit,
      sequenceModifiers,
      {
        applicability: (modifier) => {
          const report = applicabilityByModifier.get(modifier);
          return report?.evaluated === true ? report.status : undefined;
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
    if (groupSource !== undefined && inspectionScope !== "conditions") {
      diagnostics.push({
        ...forceConstraintDiagnostic(
          constraint,
          "EVALUATION_FORCE_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED",
          "Force-constraint modifier groups are preserved but are not evaluated.",
          undefined,
          ["compatibility"],
          { constraintId, modifierGroups: modifierGroups.length },
        ),
        location: { source: groupSource.source, path: groupSource.path },
      });
    }
    if (effectiveLimit !== undefined && effectiveLimit < 0) {
      diagnostics.push(
        forceConstraintDiagnostic(
          constraint,
          "EVALUATION_FORCE_CONSTRAINT_EFFECTIVE_VALUE_NEGATIVE_UNSUPPORTED",
          "Numeric modifiers produced a negative force-constraint limit.",
          undefined,
          ["compatibility"],
          { baseLimit: limit, effectiveLimit },
        ),
      );
    }
  }

  const canCollectForces =
    catalogueMatches &&
    locations.length === 1 &&
    ownerResolution.status === "resolved" &&
    targetId !== undefined &&
    constraintType !== undefined &&
    constraint.field === "forces" &&
    constraint.scope === "roster" &&
    constraint.shared === true &&
    limit !== undefined &&
    limit >= 0 &&
    constraint.percentValue !== true &&
    attributes.length === 0;
  const occurrences = canCollectForces
    ? rosterForcesInScope(roster, constraint.includeChildForces === true)
    : [];
  const candidates = occurrences.map((occurrence) =>
    evaluationForceIdentityCandidate(
      occurrence,
      forces,
      catalogueMatches,
      targetId,
    ),
  );
  const matching = candidates.flatMap((candidate) =>
    candidate.status === "match" ? [candidate.occurrence] : [],
  );
  const unresolvedCount = candidates.filter(
    (candidate) => candidate.status === "unresolved",
  ).length;
  const forceMinimum = matching.length;
  const forceMaximum = forceMinimum + unresolvedCount;

  if (unresolvedCount > 0) {
    diagnostics.push(
      forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_CANDIDATES_UNRESOLVED",
        "Some roster forces could not be identified for constraint counting.",
        undefined,
        ["resolution"],
        {
          unresolved: unresolvedCount,
          minimum: forceMinimum,
          maximum: forceMaximum,
        },
      ),
    );
  }

  const canInspectCost =
    catalogueMatches &&
    locations.length === 1 &&
    ownerResolution.status === "resolved" &&
    costType !== undefined &&
    costType.id !== undefined &&
    costScope !== undefined &&
    constraintType !== undefined &&
    constraint.shared === true &&
    limit !== undefined &&
    limit >= 0 &&
    constraint.percentValue !== true &&
    attributes.length === 0;
  const costEvaluation = canInspectCost
    ? evaluateForceConstraintCost(
          roster,
          context,
          owner,
          locations[0]!,
          costType.id,
          costType,
          costScope,
          constraint.includeChildSelections === true,
          constraint.includeChildForces === true,
          sharedCostReport,
        )
    : undefined;
  if (canInspectCost && costEvaluation === undefined) {
    diagnostics.push(
      forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_COST_UNRESOLVED",
        `Force constraint cost field ${costType?.id} could not be inspected.`,
        "field",
        ["internal", "resolution"],
        { typeId: costType?.id, reportUnavailable: true },
      ),
    );
  } else if (costEvaluation !== undefined && !costEvaluation.exact) {
    diagnostics.push(
      forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_COST_UNRESOLVED",
        `Force constraint cost field ${costEvaluation.typeId} could not be totaled exactly.`,
        "field",
        ["compatibility", "resolution"],
        {
          typeId: costEvaluation.typeId,
          unresolvedSelections: costEvaluation.unresolvedSelections,
          unresolvedCosts: costEvaluation.unresolvedCosts,
          modifiersWithoutBaseCost:
            costEvaluation.modifiersWithoutBaseCost,
        },
      ),
    );
  }
  const canCollectCost = costEvaluation?.exact === true;
  const minimum = canCollectForces
    ? forceMinimum
    : canCollectCost
      ? costEvaluation.value
      : 0;
  const maximum = canCollectForces
    ? forceMaximum
    : canCollectCost
      ? costEvaluation.value
      : Number.POSITIVE_INFINITY;
  const canCollect = canCollectForces || canCollectCost;

  const baseStatus =
    canCollect && constraintType !== undefined && limit !== undefined
      ? constraintStatus(constraintType, minimum, maximum, limit)
      : "unresolved";
  const effectiveStatus =
    canCollect &&
    constraintType !== undefined &&
    effectiveLimit !== undefined &&
    effectiveLimit >= 0 &&
    modifierSequence?.completeness === "complete" &&
    (inspectionScope === "conditions" || modifierGroups.length === 0)
      ? constraintStatus(
          constraintType,
          minimum,
          maximum,
          effectiveLimit,
        )
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
      ...(canCollect && minimum === maximum ? { observed: minimum } : {}),
      ...(limit === undefined ? {} : { baseLimit: limit }),
      ...(effectiveLimit === undefined ? {} : { limit: effectiveLimit }),
      ...(modifierSequence === undefined ? {} : { modifierSequence }),
      ...(costEvaluation === undefined ? {} : { costEvaluation }),
      ...(constraintType === undefined ? {} : { constraintType }),
      ...(canCollect &&
      (constraint.scope === "roster" ||
        constraint.scope === "parent" ||
        constraint.scope === "force")
        ? { scope: constraint.scope }
        : {}),
    },
    diagnostics,
  );
}

function diagnoseOwner(
  owner: RosterForce,
  locations: number,
  constraint: RosterForceConstraintSource,
  diagnostics: Diagnostic[],
): void {
  if (locations === 1) {
    return;
  }
  diagnostics.push(
    forceConstraintDiagnostic(
      constraint,
      locations === 0
        ? "EVALUATION_FORCE_CONSTRAINT_OWNER_NOT_FOUND"
        : "EVALUATION_FORCE_CONSTRAINT_OWNER_AMBIGUOUS",
      locations === 0
        ? `Force occurrence ${owner.id} is not present in the roster.`
        : `Force occurrence ${owner.id} appears more than once by identity.`,
      undefined,
      ["resolution"],
      { occurrenceId: owner.id, candidates: locations },
    ),
  );
}

function diagnoseOwnerResolution(
  resolution: EvaluationForceResolution,
  constraint: RosterForceConstraintSource,
  diagnostics: Diagnostic[],
): void {
  if (resolution.status === "resolved") {
    return;
  }
  const suffix = resolution.status.toUpperCase();
  diagnostics.push(
    forceConstraintDiagnostic(
      constraint,
      `EVALUATION_FORCE_CONSTRAINT_OWNER_DEFINITION_${suffix}`,
      "The constrained force definition could not be resolved uniquely.",
      undefined,
      ["resolution"],
      {
        occurrenceId: resolution.occurrence.id,
        status: resolution.status,
        candidates: resolution.definitions.length,
      },
    ),
  );
}

function diagnoseConstraintShape(
  constraint: RosterForceConstraintSource,
  constraintType: RosterForceConstraintType | undefined,
  limit: number | undefined,
  attributes: readonly string[],
  costTypes: readonly RosterCostType[],
  costScope: "parent" | "force" | undefined,
  diagnostics: Diagnostic[],
): void {
  if (constraint.type === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "TYPE_MISSING", "type"));
  } else if (constraintType === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "TYPE_UNSUPPORTED", "type"));
  }
  if (constraint.field === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "FIELD_MISSING", "field"));
  } else if (constraint.field !== "forces" && costTypes.length !== 1) {
    diagnostics.push(shapeDiagnostic(constraint, "FIELD_UNSUPPORTED", "field"));
  }
  if (constraint.scope === undefined) {
    diagnostics.push(shapeDiagnostic(constraint, "SCOPE_MISSING", "scope"));
  } else if (
    (constraint.field === "forces" && constraint.scope !== "roster") ||
    (constraint.field !== "forces" && costScope === undefined)
  ) {
    diagnostics.push(shapeDiagnostic(constraint, "SCOPE_UNSUPPORTED", "scope"));
  }
  if (constraint.shared !== true) {
    diagnostics.push(shapeDiagnostic(constraint, "SHARED_UNSUPPORTED", "shared"));
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
  } else if (limit < 0) {
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
      forceConstraintDiagnostic(
        constraint,
        "EVALUATION_FORCE_CONSTRAINT_ATTRIBUTES_UNSUPPORTED",
        "A force constraint has generic attributes with unsupported behavior.",
        attributes[0],
        ["compatibility"],
        { attributes, values: constraint.node.attributes },
      ),
    );
  }
}

function constraintStatus(
  type: RosterForceConstraintType,
  minimum: number,
  maximum: number,
  limit: number,
): RosterForceConstraintStatus {
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

function modifierGroupTargetsConstraint(
  group: RosterForceConstraintModifierGroup,
  constraintId: ObjectId,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === constraintId) ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsConstraint(child, constraintId),
    )
  );
}

function resolvedCostTypes(
  context: BattleScribeCatalogueContext,
  field: string | undefined,
): readonly RosterCostType[] {
  if (field === undefined || field === "forces") {
    return [];
  }
  return battleScribeReachableObjectsById(
    context.graph,
    context.document,
    objectId(field),
  ).flatMap((target) =>
    target.kind === "costType" ? [target.source as RosterCostType] : [],
  );
}

function evaluateForceConstraintCost(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  location: RosterForceLocation,
  typeId: ObjectId,
  costType: RosterCostType,
  scope: "parent" | "force",
  includeChildSelections: boolean,
  includeChildForces: boolean,
  sharedReport?: RosterSelectionConditionCostReport,
): RosterForceConstraintCostEvaluation | undefined {
  const evaluated =
    sharedReport === undefined
      ? evaluateRosterCostsWithSelectionConditions(roster, context)
      : undefined;
  const report =
    sharedReport ?? (evaluated?.ok === true ? evaluated.value : undefined);
  if (report === undefined) {
    return undefined;
  }

  const scopedForces =
    scope === "force"
      ? [owner]
      : location.parent === undefined
        ? roster.forces
        : [location.parent];
  const occurrences = new Set(
    evaluationSelectionsInForces(
      scopedForces,
      includeChildSelections,
      includeChildForces,
    ),
  );
  const selections = report.selections.filter((selection) =>
    occurrences.has(selection.occurrence),
  );
  let value = 0;
  let unresolvedSelections = 0;
  let unresolvedCosts = 0;
  let modifiersWithoutBaseCost = 0;

  for (const selection of selections) {
    if (selection.status !== "resolved") {
      unresolvedSelections += 1;
    }
    for (const cost of selection.costs) {
      if (cost.status === "included" && cost.typeId === typeId) {
        if (cost.modifierSequence.completeness === "complete") {
          value += cost.totalValue;
        } else {
          unresolvedCosts += 1;
        }
      } else if (
        cost.status === "excluded" &&
        (cost.typeId === undefined || cost.typeId === typeId)
      ) {
        unresolvedCosts += 1;
      }
    }

    const choice =
      selection.status === "resolved" && selection.choices.length === 1
        ? selection.choices[0]
        : undefined;
    if (
      choice !== undefined &&
      !choice.costs.some((cost) => cost.typeId === typeId)
    ) {
      modifiersWithoutBaseCost += choice.modifiers.filter(
        (modifier) => modifier.field === typeId,
      ).length;
      modifiersWithoutBaseCost += choice.modifierGroups.filter((group) =>
        modifierGroupTargetsCostType(group, typeId),
      ).length;
    }
  }

  return {
    typeId,
    costType,
    report,
    selections,
    value,
    exact:
      unresolvedSelections === 0 &&
      unresolvedCosts === 0 &&
      modifiersWithoutBaseCost === 0,
    unresolvedSelections,
    unresolvedCosts,
    modifiersWithoutBaseCost,
  };
}

function modifierGroupTargetsCostType(
  group: RosterCostModifierGroup,
  typeId: ObjectId,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === typeId) ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsCostType(child, typeId),
    )
  );
}

function supportedConstraintType(
  value: string | undefined,
): RosterForceConstraintType | undefined {
  return value === "min" || value === "max" ? value : undefined;
}

function finiteValue(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function unsupportedAttributes(
  constraint: RosterForceConstraintSource,
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
    "message",
  ]);
  return Object.keys(constraint.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function shapeDiagnostic(
  constraint: RosterForceConstraintSource,
  suffix: string,
  attribute: string,
): Diagnostic {
  const descriptions: Readonly<Record<string, string>> = {
    TYPE_MISSING: "A force constraint has no limit type.",
    TYPE_UNSUPPORTED: `Force constraint type ${constraint.type} is not supported.`,
    FIELD_MISSING: "A force constraint has no query field.",
    FIELD_UNSUPPORTED: `Force constraint field ${constraint.field} is not supported.`,
    SCOPE_MISSING: "A force constraint has no query scope.",
    SCOPE_UNSUPPORTED: `Force constraint scope ${constraint.scope} is not supported.`,
    SHARED_UNSUPPORTED:
      "Force identity counting currently requires explicit shared=true.",
    VALUE_MISSING: "A force constraint has no limit value.",
    VALUE_INVALID: "A force constraint limit is not a finite number.",
    VALUE_NEGATIVE_UNSUPPORTED:
      "Negative force constraint limits are not supported.",
    PERCENT_UNSUPPORTED:
      "Percentage force constraint values are not supported.",
  };
  return forceConstraintDiagnostic(
    constraint,
    `EVALUATION_FORCE_CONSTRAINT_${suffix}`,
    descriptions[suffix] ?? "A force constraint shape is not supported.",
    attribute,
    ["compatibility"],
    {
      type: constraint.type,
      field: constraint.field,
      scope: constraint.scope,
      shared: constraint.shared,
      value: constraint.value,
    },
  );
}

function forceConstraintDiagnostic(
  constraint: RosterForceConstraintSource,
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
