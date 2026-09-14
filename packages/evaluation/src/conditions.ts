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
import { rosterAssociationReach } from "./association-graph.js";
import { isSelectionGroupCountTarget, selectionGroupCountCandidate, selectionGroupCountTargetStatus } from "./selection-count-membership.js";
import {
  expectedCatalogueKey,
  evaluationSelectionIdentityCandidate,
  evaluationSelectionScope,
  evaluationSelectionsInForces,
  indexEvaluationChoices,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  resolveEvaluationSelection,
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

interface ConditionSourceChild {
  readonly kind: string;
  readonly name?: string;
  readonly children?: readonly ConditionSourceChild[];
}

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
    readonly children?: readonly ConditionSourceChild[];
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
    readonly children?: readonly ConditionSourceChild[];
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
  readonly localConditionReports?: readonly RosterLocalConditionReport[];
}

export interface RosterLocalConditionReport {
  readonly group: RosterLocalConditionGroupSource;
  readonly status: RosterConditionStatus;
  readonly completeness: ValidationCompleteness;
  readonly observed?: number;
  readonly candidates: readonly { readonly occurrence: RosterSelection; readonly status: RosterConditionStatus; readonly predicates: readonly RosterSelectionConditionReport[] }[];
  readonly diagnostics: readonly Diagnostic[];
}

// Local groups rebind self for every candidate. Cache owner lookup once per
// immutable roster so that rebinding does not add a whole-roster scan per leaf.
// Arrays retain duplicate-identity placements for the existing ambiguity guard.
const conditionLocations = new WeakMap<Roster, ReadonlyMap<RosterSelection, readonly RosterSelectionLocation[]>>();
function locationsForCondition(roster: Roster, owner: RosterSelection): readonly RosterSelectionLocation[] {
  let index = conditionLocations.get(roster);
  if (index === undefined) {
    const built = new Map<RosterSelection, RosterSelectionLocation[]>();
    for (const location of rosterSelectionLocations(roster)) {
      const existing = built.get(location.occurrence);
      if (existing === undefined) built.set(location.occurrence, [location]);
      else existing.push(location);
    }
    index = built;
    conditionLocations.set(roster, index);
  }
  return index.get(owner) ?? [];
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
  /**
   * True when the condition belongs to an entry that is not in the roster yet
   * and would be added *below* `owner`.
   *
   * Visibility is asked about prospective children — "would this enhancement
   * be offered on this character" — and the nearest thing that exists is the
   * parent, so the parent is passed as the owner. That silently shifts every
   * relative scope up one link, and `ancestor` is where it shows: an
   * enhancement's ancestors include its bearer, but the bearer's own ancestors
   * do not, and a top-level character has none at all.
   *
   * The corpus has **2,635** ancestor-scoped conditions, almost all
   * `instanceOf`/`notInstanceOf` faction gates on enhancements. Without this
   * they all resolved against an empty set, so every `notInstanceOf` fired and
   * every detachment enhancement stayed hidden.
   *
   * Only `ancestor` is corrected. `self` and `parent` are shifted by the same
   * off-by-one in principle, but nothing measured shows them misbehaving and
   * widening this without evidence is how a fix becomes a regression.
   */
  readonly prospectiveChild?: boolean;
}

/** Evaluates supported identity/count queries against this exact roster.
 * Direct association counts use distinct stored counterparts (both endpoints),
 * never tree descendants or model amounts. Unresolved edges remain diagnostic.
 */
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
    : locationsForCondition(roster, owner);
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
    options.prospectiveChild === true,
  );
  diagnoseIdSelectionScope(condition, idScope, diagnostics);

  const choices = indexEvaluationChoices(context);
  if (condition.field === "associations" && diagnostics.length === 0) {
    // Association queries inspect stored edges, not containment or model count.
    // Keep this leaf independent of association eligibility: those filters may
    // themselves contain conditions, so rechecking them here would recurse.
    const reach = rosterAssociationReach(roster, context, owner as RosterSelection);
    let unresolved = reach.unresolved || resolveEvaluationSelection(owner as RosterSelection, choices, catalogueMatches).status !== "resolved";
    const candidates = reach.selections.map(occurrence =>
      evaluationSelectionIdentityCandidate(occurrence, choices, catalogueMatches, condition.childId, true, options.effectiveCategories));
    const matching = candidates.filter(c => c.status === "match").map(c => c.occurrence);
    unresolved ||= candidates.some(c => c.status === "unresolved");
    if (unresolved) diagnostics.push(conditionDiagnostic(condition,
      "EVALUATION_CONDITION_ASSOCIATIONS_UNRESOLVED",
      "Some attached occurrences or association definitions could not be resolved.",
      "field", ["resolution"], {}));
    const minimum = matching.length;
    const maximum = unresolved ? Number.POSITIVE_INFINITY : minimum;
    return success({ roster, context, owner, condition, candidates, matching,
      minimum, maximum, expected: expected!, comparison: comparison!, scope: scope!,
      status: unresolved ? "unresolved" : comparisonStatus(comparison!, minimum, maximum, expected!),
      completeness: unresolved ? "incomplete" : "complete",
      ...(unresolved ? {} : { observed: minimum }),
    }, diagnostics);
  }
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
        // `parent` for a prospective root names the force it would hang from,
        // which is the owner already in hand. See `diagnoseConditionShape`.
        (scope === "force" ||
          scope === "roster" ||
          (scope === "parent" && options.prospectiveChild === true))));
  // A force owns roster/force resource checks just as it owns selection checks.
  // Keep relative selection scopes out: parent/self would name a different domain.
  const canCollectSelectionCosts =
    catalogueMatches &&
    ((!forceOwner && selectionOwnerLocations.length === 1) ||
      (forceOwner && forceOwnerLocations.length === 1 && (scope === "force" || scope === "roster"))) &&
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
  /**
   * "Does the primary catalogue contain X" is a question about the catalogue,
   * not about whoever asked. It is answerable for a force owner, and for a root
   * entry being considered before anything is selected — which is exactly when
   * it matters: `Code Chivalric` is Imperial Knights configuration that hides
   * unless the primary catalogue is Knights, and it was being initialised into
   * Dark Angels armies because the question could not be answered.
   */
  const catalogueIdentityShape =
    (condition.field === "selections" || condition.field === "forces") &&
    scope === "primary-catalogue";
  const canCollectCatalogueIdentity =
    catalogueMatches &&
    (!forceOwner ? selectionOwnerLocations.length === 1 : true) &&
    identityComparison !== undefined &&
    catalogueIdentityShape &&
    condition.childId !== undefined &&
    unsupportedAttributes(condition).length === 0;
  const selectionOwnerLocation = selectionOwnerLocations[0];
  const typedScopeTypes = typedSelectionTypes(scope);
  const idScopeTarget =
    idScope.status === "supported" ? idScope.targetId : undefined;
  let relativeScope =
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
  // An omitted group is not a durable containing occurrence. Until group-valued
  // scope traversal is modeled, do not misreport its missing wrapper as zero.
  if (idScopeTarget !== undefined && isSelectionGroupCountTarget(context, idScopeTarget)) {
    relativeScope = { unresolved: true };
  }
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
    ownerLocationCount === 1 &&
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
        : evaluationSelectionScope(
            roster,
            selectionOwnerLocation as RosterSelectionLocation,
            "identity",
            condition.includeChildSelections === true,
            false,
            relativeScope.occurrence,
          )
      : evaluationSelectionScope(
          roster,
          selectionOwnerLocation as RosterSelectionLocation,
          scope as EvaluationSelectionScope,
          condition.includeChildSelections === true,
          condition.includeChildForces === true,
          relativeScope.occurrence,
          options.prospectiveChild === true,
        );
  const groupTargetStatus = canCollectSelectionCounts && condition.childId !== undefined
    ? selectionGroupCountTargetStatus(context, condition.childId) : undefined;
  const numericGroupTarget = groupTargetStatus === undefined ? undefined : condition.childId;
  if (groupTargetStatus === "unresolved") diagnostics.push(conditionDiagnostic(
    condition, "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
    "The queried selection group target is missing or ambiguous.", "childId", ["resolution"], {},
  ));
  const selectionCandidates = selectionOccurrences.map((occurrence) => {
    const candidate = evaluationSelectionIdentityCandidate(
      occurrence,
      choices,
      catalogueMatches,
      condition.childId,
      condition.shared === true,
      options.effectiveCategories,
    );
    return numericGroupTarget === undefined ? candidate : selectionGroupCountCandidate(
      candidate, roster, context, numericGroupTarget, condition.shared === true,
    );
  });
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
            forceOwner ? forceOwnerLocations[0]!.occurrence : selectionOwnerLocations[0]!.force,
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
    groupTargetStatus === "unresolved" ? Number.POSITIVE_INFINITY : costEvaluation === undefined
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

  const status = groupTargetStatus === "unresolved" ? "unresolved" :
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
    groupTargetStatus !== "unresolved" &&
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

/** Combines ordinary conditions and supported local preceding-copy filters.
 * Local predicates rebind to each candidate while retaining the modifier owner
 * as the positional anchor; unsupported local shapes retain incomplete evidence.
 */
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
  // Newly executable local-bearing groups must not overlook a second raw
  // collection or an unprojected sibling predicate in their enclosing group.
  const localEnvelopeSupported = localConditionGroups.length === 0 || conditionGroupChildrenSupported(group.node.children ?? []);
  if (!localEnvelopeSupported) diagnostics.push(conditionGroupDiagnostic(group,
    "EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED",
    "The enclosing local condition group contains unsupported or duplicate source collections.",
    undefined, { count: localConditionGroups.length }));
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
  const localConditionReports = localConditionGroups.map(local => {
    const report = evaluateLocalPositionalGroup(roster, context, owner, local, options);
    diagnostics.push(...report.diagnostics);
    if (report.completeness === "incomplete") diagnostics.push({
      ...conditionGroupDiagnostic(group, "EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED",
        "This local condition group has unsupported shape, quantity, ordering or unresolved candidate behavior.",
        undefined, { count: localConditionGroups.length }),
      location: { source: local.source, path: local.path },
    });
    return report;
  });
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
    ...localConditionReports.map((child) => child.status),
  ];
  const expectedChildren =
    group.conditions.length + group.conditionGroups.length + localConditionGroups.length;
  const status =
    !localEnvelopeSupported ||
    type === undefined ||
    expectedChildren === 0 ||
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
      ...(localConditionReports.length === 0 ? {} : { localConditionReports }),
    },
    diagnostics,
  );
}

/**
 * Bounded preceding-copy local groups: candidate predicates share one candidate,
 * while `before` retains the original modifier anchor. NR's pinned conditions
 * documentation defines this per-candidate filter and Nth-copy use; public
 * editor/runtime evidence does not settle stacked quantities or repeat scaling.
 * Keep those variants unknown instead of extrapolating a universal local grammar.
 */
function evaluateLocalPositionalGroup(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  group: RosterLocalConditionGroupSource,
  options: RosterConditionOptions,
): RosterLocalConditionReport {
  const unresolved: RosterLocalConditionReport = { group, status: "unresolved", completeness: "incomplete", candidates: [], diagnostics: [] };
  const allowed = new Set(["id", "comment", "type", "field", "scope", "value", "includeChildSelections", "includeChildForces", "repeats"]);
  const comparison = comparisonKind(group.type);
  const expected = group.value !== undefined && /^\d+$/.test(group.value) ? Number(group.value) : undefined;
  const before = group.conditions.filter(c => c.type === "before");
  const identities = group.conditions.filter(c => c.type === "instanceOf" || c.type === "notInstanceOf");
  if ("forces" in owner || options.prospectiveChild === true || !rosterMatchesCatalogueContext(roster, context) ||
      comparison === undefined || expected === undefined || !Number.isSafeInteger(expected) ||
      group.scope !== "parent" || group.field !== "selections" || group.repeats !== 1 ||
      Object.keys(group.node.attributes).some(k => !allowed.has(k)) ||
      ["includeChildSelections", "includeChildForces"].some(k => group.node.attributes[k] !== undefined && !["true", "false"].includes(group.node.attributes[k]!)) ||
      !localGroupChildrenSupported(group.node.children ?? []) ||
      group.conditionGroups.length > 0 || (group.localConditionGroups?.length ?? 0) > 0 ||
      before.length !== 1 || identities.length === 0 || identities.length > 4 || before.length + identities.length !== group.conditions.length ||
      group.conditions.some(c => c.field !== "selections" || c.scope !== "self" || c.shared !== true || c.value !== "1" || c.percentValue === true || c.includeChildSelections === true || c.includeChildForces === true || unsupportedAttributes(c).length > 0 || c.node.children?.some(child => child.kind === "element") || ["shared", "percentValue", "includeChildSelections", "includeChildForces"].some(k => c.node.attributes[k] !== undefined && !["true", "false"].includes(c.node.attributes[k]!))) ||
      before[0]!.childId !== objectId("any") || rosterSelectionAmount(owner) !== 1) return unresolved;
  const anchorLocations = locationsForCondition(roster, owner);
  const choices = indexEvaluationChoices(context);
  const anchorResolution = resolveEvaluationSelection(owner, choices, true);
  if (anchorLocations.length !== 1 || anchorResolution.status !== "resolved" || anchorResolution.choices[0]?.kind !== "selectionEntry" || !["unit", "model"].includes(anchorResolution.choices[0].type ?? "")) return unresolved;
  const anchor = anchorLocations[0]!;
  // Persisted sibling sequence is the roster's ordering contract, preserved by
  // commands/history/storage. Never use display sorting, IDs or a same-name index.
  // Cross-parent positional comparisons are withheld even when inclusion flags
  // put those descendants in the candidate collection: their order is unproven.
  const preceding = new Set<RosterSelection>();
  let found = false;
  for (const sibling of anchor.parent.selections) {
    if (sibling === owner) { found = true; break; }
    preceding.add(sibling);
  }
  if (!found) return unresolved;
  const occurrences = evaluationSelectionScope(roster, anchor, "parent", group.includeChildSelections === true, group.includeChildForces === true);
  // This is a per-candidate evaluator, not unrestricted imported computation.
  // Bound retained reports/work per local group; four identity predicates and
  // 4096 predicate evaluations cover the measured two-predicate corpus shape.
  if (occurrences.length * identities.length > 4096) return unresolved;
  const candidates: RosterLocalConditionReport["candidates"][number][] = [];
  const diagnostics: Diagnostic[] = [];
  let count = 0;
  let incomplete = false;
  for (const occurrence of occurrences) {
    const results = identities.map(predicate => evaluateRosterCondition(roster, context, occurrence, predicate, options));
    const predicates = results.flatMap(result => result.ok ? [result.value] : []);
    const identity = predicates.length === identities.length ? combinedConditionStatus("and", predicates.map(p => p.status)) : "unresolved";
    let status: RosterConditionStatus = "unsatisfied";
    if (identity !== "unsatisfied") {
      const candidateLocations = locationsForCondition(roster, occurrence);
      if (candidateLocations.length !== 1 || candidateLocations[0]!.parent !== anchor.parent) status = "unresolved";
      else if (preceding.has(occurrence)) {
        status = identity === "unresolved" || rosterSelectionAmount(occurrence) !== 1 || predicates.some(p => p.completeness !== "complete") ? "unresolved" : "satisfied";
      }
    }
    count += status === "satisfied" ? 1 : 0;
    incomplete ||= status === "unresolved";
    if (status === "unresolved") diagnostics.push(...results.flatMap(result => result.diagnostics));
    candidates.push({ occurrence, status, predicates });
  }
  return { group, candidates, diagnostics, completeness: incomplete ? "incomplete" : "complete", status: incomplete ? "unresolved" : compare(comparison, count, expected) ? "satisfied" : "unsatisfied", ...(incomplete ? {} : { observed: count }) };
}

function localGroupChildrenSupported(children: readonly ConditionSourceChild[]): boolean {
  // Projection reads the first collection only. A second collection or unknown
  // element could carry an extra predicate, so neither may silently disappear
  // when a formerly unsupported local group becomes executable.
  const seen = new Set<string>();
  for (const child of children) {
    if (child.kind !== "element") continue;
    if (child.name === undefined || seen.has(child.name)) return false;
    seen.add(child.name);
    const elements = (child.children ?? []).filter(c => c.kind === "element");
    if (child.name === "conditions") {
      if (elements.some(c => c.name !== "condition" || c.children?.some(n => n.kind === "element"))) return false;
    } else if (!["conditionGroups", "localConditionGroups"].includes(child.name) || elements.length > 0) return false;
  }
  return true;
}

function conditionGroupChildrenSupported(children: readonly ConditionSourceChild[]): boolean {
  const names: Readonly<Record<string, string>> = { conditions: "condition", conditionGroups: "conditionGroup", localConditionGroups: "localConditionGroup" };
  const seen = new Set<string>();
  for (const child of children) {
    if (child.kind !== "element") continue;
    if (child.name === undefined || names[child.name] === undefined || seen.has(child.name)) return false;
    seen.add(child.name);
    if (child.children?.some(c => c.kind === "element" && c.name !== names[child.name!])) return false;
    const elements = (child.children ?? []).filter(c => c.kind === "element");
    if (child.name === "conditions" && elements.some(c => c.children?.some(n => n.kind === "element"))) return false;
    if (child.name === "conditionGroups" && elements.some(c => !conditionGroupChildrenSupported(c.children ?? []))) return false;
  }
  return true;
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
  prospectiveChild: boolean,
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
    condition.field !== "associations" &&
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
    // A prospective child of a force is a root, and a root's parent *is* that
    // force, so `parent` names the owner we are already standing on. Gated on
    // the flag because for a real force owner — a force constraint — `parent`
    // means the containing force instead, which is a different question.
    (scope === "force" ||
      scope === "roster" ||
      (scope === "parent" && prospectiveChild));
  const supportedForceOwnerCost = forceOwner && costTypeFieldId !== undefined && comparison !== undefined && (scope === "force" || scope === "roster");
  const forceIdentityShape = condition.field === "selections" && scope === "force" && identityComparison !== undefined;
  if (condition.field === "associations" &&
      (forceOwner || scope !== "self" || comparison === undefined || condition.shared !== true ||
       condition.includeChildSelections === true || condition.includeChildForces === true ||
       condition.node.children?.some(child => child.kind === "element") ||
       ["shared", "percentValue", "includeChildSelections", "includeChildForces"].some(key => condition.node.attributes[key] !== undefined && !["true", "false", "1", "0"].includes(condition.node.attributes[key]!)))) {
    diagnostics.push(shapeDiagnostic(condition,
      "EVALUATION_CONDITION_ASSOCIATION_SHAPE_UNSUPPORTED",
      "Association counts require a selection owner, self scope, shared=true and no descendant traversal.", "field"));
  }
  // Primary-catalogue identity is independent of the requesting occurrence.
  // Force-owned category-link modifiers use this exact shape in the pinned
  // 40K game system to exempt selected catalogues from a roster minimum.
  const catalogueIdentityShape =
    (condition.field === "selections" || condition.field === "forces") &&
    scope === "primary-catalogue";
  if (
    forceOwner &&
    condition.field !== "forces" &&
    !supportedForceOwnerSelectionCount &&
    !supportedForceOwnerCost &&
    !forceIdentityShape &&
    !catalogueIdentityShape
  ) {
    diagnostics.push(
      shapeDiagnostic(
        condition,
        "EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED",
        "Force-owned conditions support force counts, or selection counts and static resource totals in force or roster scope.",
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
  // A primary-catalogue identity question is answerable whoever asked, so it is
  // never a shape problem; see `canCollectCatalogueIdentity`.
  if (
    identityComparison !== undefined &&
    !catalogueIdentityShape &&
    ((forceOwner && !forceIdentityShape) ||
      (condition.field !== "selections" ||
        (scope !== "force" &&
          scope !== "self" &&
          scope !== "parent" &&
          scope !== "ancestor" &&
          scope !== "root-entry" &&
          scope !== "unit" &&
          scope !== "model" &&
          scope !== "model-or-unit" &&
          scope !== "upgrade")))
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
    (attribute) => !supported.has(attribute) && !(condition.field === "associations" && attribute === "traverseAssociationGroup" && condition.node.attributes[attribute] === "false"),
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
