import {
  objectId,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import {
  battleScribeReachableObjectsById,
  type BattleScribeCatalogueContext,
  type BattleScribeGraphObjectKind,
} from "@rosterforge/data-graph";

import {
  rosterSelectionAmount,
  type Roster,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

import {
  evaluationForceIdentityCandidate,
  indexEvaluationForces,
  rosterForceLocations,
  rosterForcesInScope,
  type EvaluationForceIdentityCandidate,
} from "./force-context.js";
import {
  expectedCatalogueKey,
  evaluationSelectionIdentityCandidate,
  evaluationSelectionScope,
  evaluationSelectionTree,
  evaluationSelectionsInForces,
  indexEvaluationChoices,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  type EffectiveCategoryIndex,
  type EvaluationSelectionChoice,
  type EvaluationSelectionIdentityCandidate,
  type EvaluationSelectionScope,
  type RosterSelectionLocation,
  nearestIdentitySelection,
  nearestTypedSelection,
  typedSelectionTypes,
} from "./selection-context.js";

export type RosterConditionComparison =
  | "atLeast"
  | "atMost"
  | "greaterThan"
  | "lessThan"
  | "equalTo"
  | "notEqualTo";

export type RosterConditionIdentityComparison =
  | "instanceOf"
  | "notInstanceOf";

export type RosterConditionKnownScope =
  | "self"
  | "parent"
  | "ancestor"
  | "root-entry"
  | "unit"
  | "model"
  | "model-or-unit"
  | "upgrade"
  | "primary-catalogue"
  | "force"
  | "roster";
export type RosterConditionScope = RosterConditionKnownScope | ObjectId;
export type RosterConditionGroupType = "and" | "or";

export type RosterConditionStatus =
  | "satisfied"
  | "unsatisfied"
  | "unresolved";

export type RosterConditionCandidateStatus =
  | "match"
  | "different"
  | "unresolved";

export interface RosterSelectionConditionSource {
  readonly id?: ObjectId;
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly childId?: ObjectId;
  readonly childName?: string;
  readonly comment?: string;
  readonly value?: string;
  readonly percentValue?: boolean;
  readonly shared?: boolean;
  readonly includeChildSelections?: boolean;
  readonly includeChildForces?: boolean;
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export interface RosterLocalConditionGroupSource
  extends RosterSelectionConditionSource {
  readonly repeats?: number;
  readonly conditions: readonly RosterSelectionConditionSource[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupSource[];
  readonly localConditionGroups?: readonly RosterLocalConditionGroupSource[];
}

export interface RosterSelectionConditionGroupSource {
  readonly type?: string;
  readonly conditions: readonly RosterSelectionConditionSource[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupSource[];
  readonly localConditionGroups?: readonly RosterLocalConditionGroupSource[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export type RosterConditionSource = RosterSelectionConditionSource;
export type RosterConditionGroupSource = RosterSelectionConditionGroupSource;

export type RosterConditionCandidate =
  | EvaluationSelectionIdentityCandidate
  | EvaluationForceIdentityCandidate
  | EvaluationCatalogueIdentityCandidate;
export type RosterConditionOwner = RosterSelection | RosterForce;

export interface EvaluationCatalogueIdentityCandidate {
  readonly occurrence: BattleScribeCatalogueContext["document"];
  readonly status: RosterConditionCandidateStatus;
  readonly effectiveIds: readonly ObjectId[];
}

export interface RosterSelectionConditionReport<
  Condition extends RosterSelectionConditionSource =
    RosterSelectionConditionSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterConditionOwner;
  readonly condition: Condition;
  readonly status: RosterConditionStatus;
  readonly completeness: ValidationCompleteness;
  readonly candidates: readonly RosterConditionCandidate[];
  readonly matching: readonly (
    | RosterSelection
    | RosterForce
    | BattleScribeCatalogueContext["document"]
  )[];
  readonly minimum: number;
  readonly maximum: number;
  readonly observed?: number;
  readonly expected?: number;
  readonly comparison?: RosterConditionComparison;
  readonly identityComparison?: RosterConditionIdentityComparison;
  readonly scope?: RosterConditionScope;
}

export interface RosterSelectionConditionGroupReport<
  Group extends RosterSelectionConditionGroupSource =
    RosterSelectionConditionGroupSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterConditionOwner;
  readonly group: Group;
  readonly type?: RosterConditionGroupType;
  readonly status: RosterConditionStatus;
  readonly completeness: ValidationCompleteness;
  readonly conditions: readonly RosterSelectionConditionReport[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupReport[];
  readonly localConditionGroups: readonly RosterLocalConditionGroupSource[];
}


type IdSelectionScopeStatus =
  | "notApplicable"
  | "supported"
  | "missing"
  | "unsupported";

interface IdSelectionScopeResolution {
  readonly targetId?: ObjectId;
  readonly status: IdSelectionScopeStatus;
  readonly targetKinds: readonly BattleScribeGraphObjectKind[];
}

interface ConditionCostEvaluation {
  readonly value: number;
  readonly exact: boolean;
  readonly unresolvedCandidates: number;
  readonly malformedCosts: number;
  readonly modifiedCandidates: number;
  readonly invalidAmounts: number;
}

interface SelectionCountBounds {
  readonly minimum: number;
  readonly maximum: number;
  readonly invalidAmounts: readonly RosterSelection[];
}

export type RosterConditionReport<
  Condition extends RosterConditionSource = RosterConditionSource,
> = RosterSelectionConditionReport<Condition>;
export type RosterConditionGroupReport<
  Group extends RosterConditionGroupSource = RosterConditionGroupSource,
> = RosterSelectionConditionGroupReport<Group>;

export interface RosterConditionOptions {
  /**
   * Effective category membership from `indexEffectiveRosterCategories`. When
   * supplied, a category identity comparison uses it instead of the static
   * links. When omitted, category-controlled comparisons stay unresolved.
   *
   * The index is built by evaluating category modifiers without an index in
   * scope, so passing one here never re-enters that computation.
   */
  readonly effectiveCategories?: EffectiveCategoryIndex;
}

export function evaluateRosterCondition<
  Condition extends RosterSelectionConditionSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  condition: Condition,
  options: RosterConditionOptions = {},
): Result<RosterSelectionConditionReport<Condition>> {
  const diagnostics: Diagnostic[] = [];
  const forceOwner = "forces" in owner;
  const selectionOwnerLocations = forceOwner
    ? []
    : rosterSelectionLocations(roster).filter(
        (location) => location.occurrence === owner,
      );
  const forceOwnerLocations = forceOwner
    ? rosterForceLocations(roster).filter(
        (location) => location.occurrence === owner,
      )
    : [];
  const ownerLocationCount = forceOwner
    ? forceOwnerLocations.length
    : selectionOwnerLocations.length;
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const comparison = comparisonKind(condition.type);
  const identityComparison = identityComparisonKind(condition.type);
  const scope = scopeKind(condition.scope);
  const idScope = resolveIdSelectionScope(context, scope);
  const costTypeFieldId = resolvedCostTypeField(context, condition.field);
  const supportedSelectionCountScope = selectionCountScope(
    scope,
    idScope.status === "supported",
  );
  const expected = numericValue(condition.value);

  if (!catalogueMatches) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_CATALOGUE_CONTEXT_MISMATCH",
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
  diagnoseOwner(owner, ownerLocationCount, condition, diagnostics);
  diagnoseConditionShape(
    condition,
    comparison,
    identityComparison,
    scope,
    expected,
    forceOwner,
    supportedSelectionCountScope,
    costTypeFieldId,
    diagnostics,
  );
  diagnoseIdSelectionScope(condition, idScope, diagnostics);

  const choices = indexEvaluationChoices(context);
  const commonSelectionCountShape =
    comparison !== undefined &&
    condition.field === "selections" &&
    condition.childId !== undefined &&
    expected !== undefined &&
    condition.percentValue !== true &&
    unsupportedAttributes(condition).length === 0;
  const canCollectSelectionCounts =
    catalogueMatches &&
    commonSelectionCountShape &&
    ((!forceOwner &&
      selectionOwnerLocations.length === 1 &&
      supportedSelectionCountScope) ||
      (forceOwner &&
        forceOwnerLocations.length === 1 &&
        (scope === "force" || scope === "roster")));
  const canCollectSelectionCosts =
    catalogueMatches &&
    !forceOwner &&
    selectionOwnerLocations.length === 1 &&
    comparison !== undefined &&
    costTypeFieldId !== undefined &&
    supportedSelectionCountScope &&
    condition.childId !== undefined &&
    expected !== undefined &&
    condition.percentValue !== true &&
    unsupportedAttributes(condition).length === 0;
  const canCollectSelectionIdentity =
    catalogueMatches &&
    !forceOwner &&
    selectionOwnerLocations.length === 1 &&
    identityComparison !== undefined &&
    condition.field === "selections" &&
    (scope === "self" ||
      scope === "parent" ||
      scope === "ancestor" ||
      scope === "root-entry" ||
      scope === "unit" ||
      scope === "model" ||
      scope === "model-or-unit" ||
      scope === "upgrade") &&
    condition.childId !== undefined &&
    unsupportedAttributes(condition).length === 0;
  const canCollectCatalogueIdentity =
    catalogueMatches &&
    !forceOwner &&
    selectionOwnerLocations.length === 1 &&
    identityComparison !== undefined &&
    (condition.field === "selections" || condition.field === "forces") &&
    scope === "primary-catalogue" &&
    condition.childId !== undefined &&
    unsupportedAttributes(condition).length === 0;
  const selectionOwnerLocation = selectionOwnerLocations[0];
  const typedScopeTypes = typedSelectionTypes(scope);
  const idScopeTarget =
    idScope.status === "supported" ? idScope.targetId : undefined;
  const relativeScope =
    selectionOwnerLocation !== undefined &&
    (typedScopeTypes !== undefined || idScopeTarget !== undefined) &&
    (canCollectSelectionCounts ||
      canCollectSelectionCosts ||
      canCollectSelectionIdentity)
      ? typedScopeTypes !== undefined
        ? nearestTypedSelection(
            selectionOwnerLocation,
            choices,
            catalogueMatches,
            typedScopeTypes,
          )
        : nearestIdentitySelection(
            selectionOwnerLocation,
            choices,
            catalogueMatches,
            idScopeTarget as ObjectId,
            options.effectiveCategories,
          )
      : { unresolved: false };
  if (relativeScope.unresolved) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_SCOPE_CANDIDATES_UNRESOLVED",
        `The nearest ${condition.scope ?? "typed"} selection could not be identified.`,
        "scope",
        ["resolution"],
        {},
      ),
    );
  }
  const canCollectSelections =
    (canCollectSelectionCounts ||
      canCollectSelectionCosts ||
      canCollectSelectionIdentity) &&
    !relativeScope.unresolved;
  const canCollectForces =
    catalogueMatches &&
    ownerLocationCount === 1 &&
    comparison !== undefined &&
    condition.field === "forces" &&
    scope === "roster" &&
    condition.shared === true &&
    condition.childId !== undefined &&
    expected !== undefined &&
    condition.percentValue !== true &&
    unsupportedAttributes(condition).length === 0;
  const canCollectForceIdentity =
    catalogueMatches &&
    !forceOwner &&
    selectionOwnerLocations.length === 1 &&
    identityComparison !== undefined &&
    condition.field === "selections" &&
    scope === "force" &&
    condition.childId !== undefined &&
    expected === 1 &&
    condition.percentValue !== true &&
    unsupportedAttributes(condition).length === 0;
  const selectionOccurrences = !canCollectSelections
    ? []
    : forceOwner
      ? evaluationSelectionsInForces(
          scope === "roster"
            ? roster.forces
            : [forceOwnerLocations[0]!.occurrence],
          condition.includeChildSelections === true,
          condition.includeChildForces === true,
        )
    : identityComparison !== undefined && scope === "self"
      ? [selectionOwnerLocation!.occurrence]
    : identityComparison !== undefined && scope === "parent"
      ? "forces" in selectionOwnerLocation!.parent
        ? []
        : [selectionOwnerLocation!.parent]
    : idScopeTarget !== undefined
      ? relativeScope.occurrence === undefined
        ? []
        : evaluationSelectionTree(
            relativeScope.occurrence,
            condition.includeChildSelections === true,
          )
      : evaluationSelectionScope(
          roster,
          selectionOwnerLocation as RosterSelectionLocation,
          scope as EvaluationSelectionScope,
          condition.includeChildSelections === true,
          condition.includeChildForces === true,
          relativeScope.occurrence,
        );
  const selectionCandidates = selectionOccurrences.map((occurrence) =>
    evaluationSelectionIdentityCandidate(
      occurrence,
      choices,
      catalogueMatches,
      condition.childId,
      condition.shared === true,
      options.effectiveCategories,
    ),
  );
  const forces = indexEvaluationForces(context);
  const forceCandidates = canCollectForces
    ? rosterForcesInScope(
        roster,
        condition.includeChildForces === true,
      ).map((occurrence) =>
        evaluationForceIdentityCandidate(
          occurrence,
          forces,
          catalogueMatches,
          condition.childId,
        ),
      )
    : canCollectForceIdentity
      ? [
          evaluationForceIdentityCandidate(
            selectionOwnerLocations[0]!.force,
            forces,
            catalogueMatches,
            condition.childId,
          ),
        ]
      : [];
  const catalogueCandidates: readonly EvaluationCatalogueIdentityCandidate[] =
    canCollectCatalogueIdentity
      ? [catalogueIdentityCandidate(context, condition.childId)]
      : [];
  const costEvaluation = canCollectSelectionCosts
    ? evaluateConditionCosts(
        selectionCandidates,
        costTypeFieldId as ObjectId,
      )
    : undefined;
  if (costEvaluation !== undefined) {
    diagnoseConditionCosts(condition, costEvaluation, diagnostics);
  }
  const selectionBounds = selectionCountBounds(selectionCandidates);
  if (selectionBounds.invalidAmounts.length > 0) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_SELECTION_AMOUNT_INVALID",
        "Some roster selections have invalid amounts, so the condition count is not exact.",
        undefined,
        ["compatibility"],
        {
          selectionIds: selectionBounds.invalidAmounts.map(({ id }) => id),
        },
      ),
    );
  }
  const candidates: readonly RosterConditionCandidate[] = [
    ...selectionCandidates,
    ...forceCandidates,
    ...catalogueCandidates,
  ];
  const matching = candidates.flatMap((candidate) =>
    candidate.status === "match" ? [candidate.occurrence] : [],
  );
  const unresolvedCount = candidates.filter(
    (candidate) => candidate.status === "unresolved",
  ).length;
  const nonSelectionCandidates = [...forceCandidates, ...catalogueCandidates];
  const nonSelectionMinimum = nonSelectionCandidates.filter(
    (candidate) => candidate.status === "match",
  ).length;
  const nonSelectionUnresolved = nonSelectionCandidates.filter(
    (candidate) => candidate.status === "unresolved",
  ).length;
  const minimum =
    costEvaluation?.value ??
    selectionBounds.minimum + nonSelectionMinimum;
  const maximum =
    costEvaluation === undefined
      ? selectionBounds.maximum +
        nonSelectionMinimum +
        nonSelectionUnresolved
      : minimum;

  if (unresolvedCount > 0 && costEvaluation === undefined) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
        catalogueCandidates.length > 0
          ? "The primary catalogue could not be identified for condition evaluation."
          : condition.field === "forces"
          ? "Some roster forces could not be identified for condition counting."
          : "Some roster selections could not be identified for condition evaluation.",
        undefined,
        ["resolution"],
        { unresolved: unresolvedCount, minimum, maximum },
      ),
    );
  }

  const status =
    (canCollectSelectionCounts || canCollectForces) &&
    !relativeScope.unresolved &&
    comparison !== undefined &&
    expected !== undefined
      ? comparisonStatus(comparison, minimum, maximum, expected)
      : canCollectSelectionCosts &&
          costEvaluation?.exact === true &&
          comparison !== undefined &&
          expected !== undefined
        ? compare(comparison, costEvaluation.value, expected)
          ? "satisfied"
          : "unsatisfied"
      : (canCollectSelectionIdentity ||
            canCollectForceIdentity ||
            canCollectCatalogueIdentity) &&
          !relativeScope.unresolved &&
          identityComparison !== undefined
        ? identityComparisonStatus(
            identityComparison,
            candidates.map((candidate) => candidate.status),
          )
        : "unresolved";
  const canReportObserved =
    !relativeScope.unresolved &&
    (canCollectSelections ||
      canCollectForces ||
      canCollectForceIdentity ||
      canCollectCatalogueIdentity) &&
    (costEvaluation === undefined || costEvaluation.exact) &&
    selectionBounds.invalidAmounts.length === 0;
  const completeness =
    diagnostics.length === 0 ? "complete" : "incomplete";
  return success(
    {
      roster,
      context,
      owner,
      condition,
      status,
      completeness,
      candidates,
      matching,
      minimum,
      maximum,
      ...(canReportObserved && minimum === maximum
        ? { observed: minimum }
        : {}),
      ...(expected === undefined ? {} : { expected }),
      ...(comparison === undefined ? {} : { comparison }),
      ...(identityComparison === undefined ? {} : { identityComparison }),
      ...(scope === undefined ? {} : { scope }),
    },
    diagnostics,
  );
}

export function evaluateRosterSelectionCondition<
  Condition extends RosterSelectionConditionSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  condition: Condition,
  options: RosterConditionOptions = {},
): Result<RosterSelectionConditionReport<Condition>> {
  return evaluateRosterCondition(roster, context, owner, condition, options);
}

export function evaluateRosterConditionGroup<
  Group extends RosterSelectionConditionGroupSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  group: Group,
  options: RosterConditionOptions = {},
): Result<RosterSelectionConditionGroupReport<Group>> {
  const diagnostics: Diagnostic[] = [];
  const localConditionGroups = group.localConditionGroups ?? [];
  const type = conditionGroupType(group.type);
  if (group.type === undefined) {
    diagnostics.push(
      conditionGroupDiagnostic(
        group,
        "EVALUATION_CONDITION_GROUP_TYPE_MISSING",
        "A condition group has no combination type.",
        "type",
        { type: group.type },
      ),
    );
  } else if (type === undefined) {
    diagnostics.push(
      conditionGroupDiagnostic(
        group,
        "EVALUATION_CONDITION_GROUP_TYPE_UNSUPPORTED",
        `Condition group type ${group.type} is not supported.`,
        "type",
        { type: group.type },
      ),
    );
  }
  if (
    group.conditions.length === 0 &&
    group.conditionGroups.length === 0 &&
    localConditionGroups.length === 0
  ) {
    diagnostics.push(
      conditionGroupDiagnostic(
        group,
        "EVALUATION_CONDITION_GROUP_EMPTY",
        "An empty condition group has no defined truth value.",
        undefined,
        { type: group.type },
      ),
    );
  }
  const localConditionGroup = localConditionGroups[0];
  if (localConditionGroup !== undefined) {
    diagnostics.push({
      ...conditionGroupDiagnostic(
        group,
        "EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED",
        "Local condition groups are preserved but their combination behavior is not supported.",
        undefined,
        { count: localConditionGroups.length },
      ),
      location: {
        source: localConditionGroup.source,
        path: localConditionGroup.path,
      },
    });
  }
  const attributes = unsupportedGroupAttributes(group);
  if (attributes.length > 0) {
    diagnostics.push(
      conditionGroupDiagnostic(
        group,
        "EVALUATION_CONDITION_GROUP_ATTRIBUTES_UNSUPPORTED",
        "A condition group has generic attributes with unsupported behavior.",
        attributes[0],
        { attributes, values: group.node.attributes },
      ),
    );
  }

  const conditions: RosterSelectionConditionReport[] = [];
  for (const condition of group.conditions) {
    const evaluated = evaluateRosterCondition(
      roster,
      context,
      owner,
      condition,
      options,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      conditions.push(evaluated.value);
    }
  }
  const conditionGroups: RosterSelectionConditionGroupReport[] = [];
  for (const child of group.conditionGroups) {
    const evaluated = evaluateRosterConditionGroup(
      roster,
      context,
      owner,
      child,
      options,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      conditionGroups.push(evaluated.value);
    }
  }
  const childStatuses = [
    ...conditions.map((condition) => condition.status),
    ...conditionGroups.map((child) => child.status),
  ];
  const expectedChildren =
    group.conditions.length + group.conditionGroups.length;
  const status =
    type === undefined ||
    expectedChildren === 0 ||
    localConditionGroups.length > 0 ||
    childStatuses.length !== expectedChildren
      ? "unresolved"
      : combinedConditionStatus(type, childStatuses);
  const completeness =
    diagnostics.length === 0 &&
    conditions.every((condition) => condition.completeness === "complete") &&
    conditionGroups.every((child) => child.completeness === "complete")
      ? "complete"
      : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      group,
      ...(type === undefined ? {} : { type }),
      status,
      completeness,
      conditions,
      conditionGroups,
      localConditionGroups,
    },
    diagnostics,
  );
}

export function evaluateRosterSelectionConditionGroup<
  Group extends RosterSelectionConditionGroupSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  group: Group,
  options: RosterConditionOptions = {},
): Result<RosterSelectionConditionGroupReport<Group>> {
  return evaluateRosterConditionGroup(roster, context, owner, group, options);
}

function diagnoseOwner(
  owner: RosterConditionOwner,
  locations: number,
  condition: RosterSelectionConditionSource,
  diagnostics: Diagnostic[],
): void {
  if (locations === 1) {
    return;
  }
  diagnostics.push(
    conditionDiagnostic(
      condition,
      locations === 0
        ? "EVALUATION_CONDITION_OWNER_NOT_FOUND"
        : "EVALUATION_CONDITION_OWNER_AMBIGUOUS",
      locations === 0
        ? `Condition owner ${owner.id} is not present in the roster.`
        : `Condition owner ${owner.id} appears more than once by identity.`,
      undefined,
      ["resolution"],
      { occurrenceId: owner.id, candidates: locations },
    ),
  );
}

function diagnoseConditionShape(
  condition: RosterSelectionConditionSource,
  comparison: RosterConditionComparison | undefined,
  identityComparison: RosterConditionIdentityComparison | undefined,
  scope: RosterConditionScope | undefined,
  expected: number | undefined,
  forceOwner: boolean,
  supportedSelectionCountScope: boolean,
  costTypeFieldId: ObjectId | undefined,
  diagnostics: Diagnostic[],
): void {
  if (condition.type === undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_TYPE_MISSING",
        "A condition has no comparison type.",
        "type",
      ),
    );
  } else if (comparison === undefined && identityComparison === undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_TYPE_UNSUPPORTED",
        `Condition comparison ${condition.type} is not supported.`,
        "type",
      ),
    );
  }
  if (condition.field === undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_FIELD_MISSING",
        "A condition has no query field.",
        "field",
      ),
    );
  } else if (
    condition.field !== "selections" &&
    condition.field !== "forces" &&
    costTypeFieldId === undefined
  ) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_FIELD_UNSUPPORTED",
        `Condition field ${condition.field} is not supported.`,
        "field",
      ),
    );
  }
  const supportedForceOwnerSelectionCount =
    forceOwner &&
    comparison !== undefined &&
    condition.field === "selections" &&
    (scope === "force" || scope === "roster");
  if (
    forceOwner &&
    condition.field !== "forces" &&
    !supportedForceOwnerSelectionCount
  ) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED",
        "Force-owned conditions support force counts or selection counts in force or roster scope.",
        "field",
      ),
    );
  }
  if (condition.scope === undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_SCOPE_MISSING",
        "A condition has no query scope.",
        "scope",
      ),
    );
  } else if (
    scope === undefined ||
    (condition.field === "forces" &&
      scope !== "roster" &&
      !(identityComparison !== undefined && scope === "primary-catalogue")) ||
    (comparison !== undefined &&
      (condition.field === "selections" || costTypeFieldId !== undefined) &&
      !supportedSelectionCountScope &&
      idSelectionScope(scope) === undefined)
  ) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_SCOPE_UNSUPPORTED",
        `Condition scope ${condition.scope} is not supported.`,
        "scope",
      ),
    );
  }
  if (condition.childId === undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_CHILD_ID_MISSING",
        "A count condition has no child ID.",
        "childId",
      ),
    );
  }
  if (condition.field === "forces" && condition.shared !== true) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_SHARED_UNSUPPORTED",
        "Force-count conditions currently require explicit shared=true.",
        "shared",
      ),
    );
  }
  if (
    identityComparison !== undefined &&
    (forceOwner ||
      ((condition.field !== "selections" ||
        (scope !== "force" &&
          scope !== "self" &&
          scope !== "parent" &&
          scope !== "ancestor" &&
          scope !== "root-entry" &&
          scope !== "unit" &&
          scope !== "model" &&
          scope !== "model-or-unit" &&
          scope !== "upgrade")) &&
        !((condition.field === "selections" || condition.field === "forces") &&
          scope === "primary-catalogue")))
  ) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_IDENTITY_SHAPE_UNSUPPORTED",
        "Identity conditions currently support the selection owner, its parent or ancestors, root entry, nearest typed selection, containing force, or primary catalogue.",
        "type",
      ),
    );
  }
  if (condition.value === undefined && comparison !== undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_VALUE_MISSING",
        "A condition has no comparison value.",
        "value",
      ),
    );
  } else if (
    condition.value !== undefined &&
    expected === undefined &&
    comparison !== undefined
  ) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_VALUE_INVALID",
        "A condition comparison value is not a finite number.",
        "value",
      ),
    );
  }
  if (condition.percentValue === true && comparison !== undefined) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_PERCENT_UNSUPPORTED",
        "Percentage condition values are not supported.",
        "percentValue",
      ),
    );
  }
  const attributes = unsupportedAttributes(condition);
  if (attributes.length > 0) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_ATTRIBUTES_UNSUPPORTED",
        "A condition has generic attributes with unsupported behavior.",
        attributes[0],
        ["compatibility"],
        { attributes, values: condition.node.attributes },
      ),
    );
  }
}

function diagnoseIdSelectionScope(
  condition: RosterSelectionConditionSource,
  resolution: IdSelectionScopeResolution,
  diagnostics: Diagnostic[],
): void {
  if (
    resolution.status === "notApplicable" ||
    resolution.status === "supported"
  ) {
    return;
  }
  diagnostics.push(
    conditionDiagnostic(
      condition,
      resolution.status === "missing"
        ? "EVALUATION_CONDITION_SCOPE_TARGET_NOT_FOUND"
        : "EVALUATION_CONDITION_SCOPE_TARGET_KIND_UNSUPPORTED",
      resolution.status === "missing"
        ? `Condition scope target ${resolution.targetId ?? condition.scope ?? "unknown"} is not reachable from the selected catalogue.`
        : `Condition scope target ${resolution.targetId ?? condition.scope ?? "unknown"} does not identify a supported selection or category object.`,
      "scope",
      resolution.status === "missing" ? ["resolution"] : ["compatibility"],
      {
        targetId: resolution.targetId,
        targetKinds: resolution.targetKinds,
      },
    ),
  );
}

function diagnoseConditionCosts(
  condition: RosterSelectionConditionSource,
  evaluation: ConditionCostEvaluation,
  diagnostics: Diagnostic[],
): void {
  if (evaluation.unresolvedCandidates > 0) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_COST_CANDIDATES_UNRESOLVED",
        "Some matched selections could not be resolved uniquely for cost-field evaluation.",
        "field",
        ["resolution"],
        { unresolved: evaluation.unresolvedCandidates },
      ),
    );
  }
  if (evaluation.malformedCosts > 0) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_COST_VALUE_UNRESOLVED",
        "Some matched selections have missing or duplicate values for the queried cost type.",
        "field",
        ["compatibility"],
        { unresolved: evaluation.malformedCosts },
      ),
    );
  }
  if (evaluation.modifiedCandidates > 0) {
    diagnostics.push(
      conditionDiagnostic(
        condition,
        "EVALUATION_CONDITION_COST_MODIFIERS_UNSUPPORTED",
        "Some matched selections have modifier behavior for the queried cost type.",
        "field",
        ["compatibility"],
        { unresolved: evaluation.modifiedCandidates },
      ),
    );
  }
}

function comparisonStatus(
  comparison: RosterConditionComparison,
  minimum: number,
  maximum: number,
  expected: number,
): RosterConditionStatus {
  if (comparison === "equalTo" || comparison === "notEqualTo") {
    if (minimum === maximum) {
      return compare(comparison, minimum, expected)
        ? "satisfied"
        : "unsatisfied";
    }
    if (expected < minimum || expected > maximum) {
      return comparison === "equalTo" ? "unsatisfied" : "satisfied";
    }
    return "unresolved";
  }
  const lower = compare(comparison, minimum, expected);
  const upper = compare(comparison, maximum, expected);
  if (lower && upper) {
    return "satisfied";
  }
  if (!lower && !upper) {
    return "unsatisfied";
  }
  return "unresolved";
}



function catalogueIdentityCandidate(
  context: BattleScribeCatalogueContext,
  targetId: ObjectId | undefined,
): EvaluationCatalogueIdentityCandidate {
  const catalogueId = context.document.metadata.id;
  return {
    occurrence: context.document,
    status:
      catalogueId === undefined || targetId === undefined
        ? "unresolved"
        : catalogueId === targetId
          ? "match"
          : "different",
    effectiveIds: catalogueId === undefined ? [] : [catalogueId],
  };
}

function identityComparisonStatus(
  comparison: RosterConditionIdentityComparison,
  candidates: readonly RosterConditionCandidateStatus[],
): RosterConditionStatus {
  if (candidates.includes("match")) {
    return comparison === "instanceOf" ? "satisfied" : "unsatisfied";
  }
  if (candidates.includes("unresolved")) {
    return "unresolved";
  }
  return comparison === "instanceOf" ? "unsatisfied" : "satisfied";
}

function combinedConditionStatus(
  type: RosterConditionGroupType,
  statuses: readonly RosterConditionStatus[],
): RosterConditionStatus {
  if (type === "and") {
    if (statuses.includes("unsatisfied")) {
      return "unsatisfied";
    }
    return statuses.every((status) => status === "satisfied")
      ? "satisfied"
      : "unresolved";
  }
  if (statuses.includes("satisfied")) {
    return "satisfied";
  }
  return statuses.every((status) => status === "unsatisfied")
    ? "unsatisfied"
    : "unresolved";
}

function compare(
  comparison: RosterConditionComparison,
  observed: number,
  expected: number,
): boolean {
  switch (comparison) {
    case "atLeast":
      return observed >= expected;
    case "atMost":
      return observed <= expected;
    case "greaterThan":
      return observed > expected;
    case "lessThan":
      return observed < expected;
    case "equalTo":
      return observed === expected;
    case "notEqualTo":
      return observed !== expected;
  }
}

function comparisonKind(
  value: string | undefined,
): RosterConditionComparison | undefined {
  return value === "atLeast" ||
    value === "atMost" ||
    value === "greaterThan" ||
    value === "lessThan" ||
    value === "equalTo" ||
    value === "notEqualTo"
    ? value
    : undefined;
}

function identityComparisonKind(
  value: string | undefined,
): RosterConditionIdentityComparison | undefined {
  return value === "instanceOf" || value === "notInstanceOf"
    ? value
    : undefined;
}

function scopeKind(value: string | undefined): RosterConditionScope | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return knownScope(value) ? value : objectId(value);
}

function knownScope(value: string): value is RosterConditionKnownScope {
  return value === "self" ||
    value === "parent" ||
    value === "ancestor" ||
    value === "root-entry" ||
    value === "unit" ||
    value === "model" ||
    value === "model-or-unit" ||
    value === "upgrade" ||
    value === "primary-catalogue" ||
    value === "force" ||
    value === "roster";
}

function selectionCountScope(
  scope: RosterConditionScope | undefined,
  supportedIdScope = false,
): boolean {
  return (
    scope === "self" ||
    scope === "parent" ||
    scope === "root-entry" ||
    scope === "unit" ||
    scope === "model" ||
    scope === "model-or-unit" ||
    scope === "upgrade" ||
    scope === "force" ||
    scope === "roster" ||
    supportedIdScope
  );
}


function idSelectionScope(
  scope: RosterConditionScope | undefined,
): ObjectId | undefined {
  return scope === undefined || knownScope(scope) ? undefined : scope;
}

function resolvedCostTypeField(
  context: BattleScribeCatalogueContext,
  field: string | undefined,
): ObjectId | undefined {
  if (field === undefined || field === "selections" || field === "forces") {
    return undefined;
  }
  const targetId = objectId(field);
  const targets = battleScribeReachableObjectsById(
    context.graph,
    context.document,
    targetId,
  );
  return targets.length > 0 &&
    targets.every(({ kind }) => kind === "costType")
    ? targetId
    : undefined;
}

function evaluateConditionCosts(
  candidates: readonly EvaluationSelectionIdentityCandidate[],
  typeId: ObjectId,
): ConditionCostEvaluation {
  let value = 0;
  let unresolvedCandidates = 0;
  let malformedCosts = 0;
  let modifiedCandidates = 0;
  let invalidAmounts = 0;
  for (const candidate of candidates) {
    if (candidate.status === "unresolved") {
      unresolvedCandidates += 1;
      continue;
    }
    if (candidate.status === "different") {
      continue;
    }
    const choice =
      candidate.resolution.status === "resolved" &&
      candidate.resolution.choices.length === 1
        ? candidate.resolution.choices[0]
        : undefined;
    if (choice === undefined) {
      unresolvedCandidates += 1;
      continue;
    }
    const amount = rosterSelectionAmount(candidate.occurrence);
    if (!Number.isFinite(amount) || amount <= 0) {
      invalidAmounts += 1;
      continue;
    }
    const costs = choice.costs.filter((cost) => cost.typeId === typeId);
    if (costs.length > 1 || costs.some((cost) => cost.value === undefined)) {
      malformedCosts += 1;
      continue;
    }
    if (
      choice.modifiers.some((modifier) => modifier.field === typeId) ||
      choice.modifierGroups.some((group) =>
        modifierGroupTargetsField(group, typeId),
      )
    ) {
      modifiedCandidates += 1;
      continue;
    }
    value += (costs[0]?.value ?? 0) * amount;
  }
  return {
    value,
    exact:
      unresolvedCandidates === 0 &&
      malformedCosts === 0 &&
      modifiedCandidates === 0 &&
      invalidAmounts === 0,
    unresolvedCandidates,
    malformedCosts,
    modifiedCandidates,
    invalidAmounts,
  };
}

function selectionCountBounds(
  candidates: readonly EvaluationSelectionIdentityCandidate[],
): SelectionCountBounds {
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

function modifierGroupTargetsField(
  group: EvaluationSelectionChoice["modifierGroups"][number],
  typeId: ObjectId,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === typeId) ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsField(child, typeId),
    )
  );
}

function resolveIdSelectionScope(
  context: BattleScribeCatalogueContext,
  scope: RosterConditionScope | undefined,
): IdSelectionScopeResolution {
  const targetId = idSelectionScope(scope);
  if (targetId === undefined) {
    return { status: "notApplicable", targetKinds: [] };
  }
  const targetKinds = [
    ...new Set(
      battleScribeReachableObjectsById(
        context.graph,
        context.document,
        targetId,
      ).map(({ kind }) => kind),
    ),
  ];
  if (targetKinds.length === 0) {
    return { targetId, status: "missing", targetKinds };
  }
  const supportedKinds = new Set<BattleScribeGraphObjectKind>([
    "categoryEntry",
    "entryLink",
    "selectionEntry",
    "selectionEntryGroup",
  ]);
  return {
    targetId,
    status: targetKinds.every((kind) => supportedKinds.has(kind))
      ? "supported"
      : "unsupported",
    targetKinds,
  };
}

function conditionGroupType(
  value: string | undefined,
): RosterConditionGroupType | undefined {
  return value === "and" || value === "or" ? value : undefined;
}

function numericValue(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function unsupportedAttributes(
  condition: RosterSelectionConditionSource,
): readonly string[] {
  const supported = new Set([
    "type",
    "field",
    "scope",
    "childId",
    "value",
    "percentValue",
    "shared",
    "includeChildSelections",
    "includeChildForces",
    "childName",
    "comment",
    "id",
  ]);
  return Object.keys(condition.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function unsupportedGroupAttributes(
  group: RosterSelectionConditionGroupSource,
): readonly string[] {
  const supported = new Set(["type", "id"]);
  return Object.keys(group.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function shapeDiagnostic(
  condition: RosterSelectionConditionSource,
  code: string,
  message: string,
  attribute: string,
): Diagnostic {
  return conditionDiagnostic(
    condition,
    code,
    message,
    attribute,
    ["compatibility"],
    {
      type: condition.type,
      field: condition.field,
      scope: condition.scope,
      childId: condition.childId,
      value: condition.value,
    },
  );
}

function conditionDiagnostic(
  condition: RosterSelectionConditionSource,
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
      source: condition.source,
      path:
        attribute === undefined
          ? condition.path
          : [...condition.path, `@${attribute}`],
    },
    details,
  };
}

function conditionGroupDiagnostic(
  group: RosterSelectionConditionGroupSource,
  code: string,
  message: string,
  attribute: string | undefined,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility"],
    location: {
      source: group.source,
      path:
        attribute === undefined
          ? group.path
          : [...group.path, `@${attribute}`],
    },
    details,
  };
}
