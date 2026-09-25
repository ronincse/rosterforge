import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type {
  BattleScribeCatalogueContext,
  MaterializedSelectionContainer,
  MaterializedSelectionEntryGroup,
  MaterializedVisibleEntryLinkRoot,
  MaterializedVisibleRoot,
  MaterializedVisibleSelectionEntryGroupRoot,
  MaterializedVisibleSelectionEntryRoot,
} from "@rosterforge/data-graph";

import {
  addRosterSelectionToSelection,
  rosterDefinitionKeyForSource,
  rosterSelectionAmount,
  selectionOccurrenceId,
  type Roster,
  type RosterForce,
  type RosterSelection,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";

import { effectiveRosterCategories } from "./effective-categories.js";
import { evaluateRosterModifierApplicability } from "./modifier-applicability.js";
import { evaluateRosterModifierGroupApplicability, collectRosterModifierGroupExecution } from "./modifier-groups.js";
import { evaluationSelectionIdentityCandidate, indexEvaluationChoices, resolveEvaluationSelection, rosterMatchesCatalogueContext, rosterSelectionLocations, type EvaluationSelectionChoice } from "./selection-context.js";
import { evaluateNumericModifierSequence } from "./modifiers.js";
import {
  inspectRosterSelectionConstraintWithSelectionConditions,
  isUnboundedConstraintValue,
  isSupportedRosterGroupConstraint,
  type RosterSelectionConstraintReport,
} from "./constraints.js";

export interface RosterSelectionInitializationOptions {
  readonly maxPlannedSelections?: number;
}

export type EmptySingleForceRootInitializationChoice =
  | MaterializedVisibleSelectionEntryRoot
  | MaterializedVisibleSelectionEntryGroupRoot
  | (Omit<MaterializedVisibleEntryLinkRoot, "materialized"> & {
      readonly materialized: EvaluationSelectionChoice;
    });

export interface EmptySingleForceRootInitializationAddition {
  readonly root: EmptySingleForceRootInitializationChoice;
  readonly quantity: number;
}

export interface EmptySingleForceRootInitializationPlan {
  readonly additions: readonly EmptySingleForceRootInitializationAddition[];
  readonly plannedSelectionCount: number;
  readonly completeness: ValidationCompleteness;
}

export interface EmptySingleForceRootBoundIdentity {
  readonly kind: "definition" | "occurrence";
  readonly id: ObjectId;
}

export interface EmptySingleForceRootChoiceInspection {
  readonly root: EmptySingleForceRootInitializationChoice;
  readonly identity?: EmptySingleForceRootBoundIdentity;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly completeness: ValidationCompleteness;
}

export interface EmptySingleForceRootChoicesInspection {
  readonly choices: readonly EmptySingleForceRootChoiceInspection[];
  readonly completeness: ValidationCompleteness;
}

interface LiveSingleForceRootInspectionContext {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly force: RosterForce;
  readonly effectiveCategories: ReturnType<typeof effectiveRosterCategories>;
}

interface LiveRosterSelectionChildInspectionContext {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
}

export type RosterSelectionInitializationPendingReason =
  | "defaultNotSpecified"
  | "defaultDisabled"
  | "defaultUnavailable"
  | "defaultAmbiguous"
  | "defaultMaximumReached";

export interface RosterSelectionInitializationPendingChoice {
  readonly group: MaterializedSelectionEntryGroup;
  readonly minimum: number;
  readonly remaining: number;
  readonly reason: RosterSelectionInitializationPendingReason;
}

export interface RosterSelectionInitializationAddition {
  readonly choice: EvaluationSelectionChoice;
  /** Number of durable occurrence nodes to create. */
  readonly quantity: number;
  /**
   * Explicit amount for each occurrence. The planner currently emits this only
   * for a selection entry with a valid positive `step`; ordinary entries keep
   * their established occurrence-multiplicity representation.
   */
  readonly amount?: number;
  /**
   * Static minimum retained separately so a live conditional default can fall
   * below its source default without violating the required floor.
   */
  readonly minimumAmount?: number;
  readonly initialization: RosterSelectionInitializationPlan;
}

export interface RosterSelectionInitializationPlan {
  readonly choice: EvaluationSelectionChoice;
  readonly additions: readonly RosterSelectionInitializationAddition[];
  readonly pendingChoices: readonly RosterSelectionInitializationPendingChoice[];
  readonly plannedSelectionCount: number;
  readonly completeness: ValidationCompleteness;
}

export interface ConditionalInitializationRequirement {
  readonly choice: EvaluationSelectionChoice;
  readonly minimum: number;
  readonly maximum: number;
  readonly selectedCount: number;
  readonly constraints: EvaluationSelectionChoice["constraints"];
}

/**
 * Resolves creation-only minima against an already statically seeded parent.
 * Queries must name other, non-conditional direct siblings in this same parent;
 * the temporary bound probe therefore cannot change their observed count.
 * No dependency iteration, group-alternative selection or nested automatic
 * reconciliation occurs here. Callers must verify the same bounds after adding
 * the requirements and commit the entire command atomically.
 */
export function inspectConditionalInitializationRequirements(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choice: EvaluationSelectionChoice,
): Result<readonly ConditionalInitializationRequirement[]> {
  const paths: EvaluationSelectionChoice[][] = [];
  let visited = 0;
  const visit = (container: EvaluationSelectionChoice, path: EvaluationSelectionChoice[]): void => {
    for (const child of directChoices(container)) {
      visited += 1;
      if (visited >= DEFAULT_MAX_PLANNED_SELECTIONS || path.length >= 128) { visited = DEFAULT_MAX_PLANNED_SELECTIONS; return; }
      if (child.kind === "selectionEntryGroup") visit(child, [...path, child]);
      else paths.push([...path, child]);
    }
  };
  visit(choice, [choice]);
  const conditional = paths.filter(path => {
    const child = path.at(-1)!;
    return child.constraints.some(c => c.type === "min" && c.id !== undefined && path.some(p => carrierTargetsField(p, c.id!)));
  });
  if (conditional.length === 0 || visited >= DEFAULT_MAX_PLANNED_SELECTIONS) return success([]);
  const state: InitializationState = {diagnostics:[],incomplete:0};
  const requirements: ConditionalInitializationRequirement[] = [];
  const index = indexEvaluationChoices(context);
  const matches = rosterMatchesCatalogueContext(roster, context);
  const locations = rosterSelectionLocations(roster).filter(l => l.occurrence === owner);
  if (locations.length !== 1) return success([]);
  const ancestors = locations[0]!.ancestors.map(a => resolveEvaluationSelection(a,index,matches));
  if (ancestors.some(a => a.status !== "resolved" || a.choices.length !== 1)) return success([]);
  const conditionalChoices = new Set(conditional.map(path => path.at(-1)!));
  const queryIsStable = (query: { readonly field?: string; readonly scope?: string; readonly childId?: string; readonly shared?: boolean; readonly includeChildSelections?: boolean; readonly includeChildForces?: boolean }): boolean => {
    if (query.field !== "selections" || (query.scope !== "parent" && query.scope !== choice.definitionId) || query.childId === undefined || query.childId === "any" || query.includeChildSelections === true || query.includeChildForces === true) return false;
    const targets = paths.filter(p => (query.shared === true ? p.at(-1)!.definitionId : p.at(-1)!.id) === query.childId);
    if (targets.length !== 1 || conditionalChoices.has(targets[0]!.at(-1)!)) return false;
    // The existing post-command automatic reconciler runs after this step.
    // Do not predict a target whose automatic entry/group limit can change
    // after these additions: that is another dependency, not a stable sibling.
    return !targets[0]!.some(p => p.constraints.some(c =>
      c.id !== undefined && c.node.attributes.automatic !== undefined &&
      c.node.attributes.automatic !== "false" && c.node.attributes.automatic !== "0" &&
      targets[0]!.some(carrier => carrierTargetsField(carrier,c.id!))));
  };
  for (const path of conditional) {
    const child = path.at(-1)!;
    const constraints = child.constraints.filter(isPotentialParentSelectionBound);
    const ids = new Set<string | undefined>(constraints.map(c => c.id));
    const modifiers = child.modifiers.filter(m => ids.has(m.field));
    const shared = constraints[0]?.shared === true;
    // Do not pick among aliases, stepped amounts, hidden alternatives, mixed
    // count domains, ancestor-carried behavior or dependency/cycle chains.
    if (child.kind !== "selectionEntry" || child.step !== undefined || constraints.length === 0 ||
      constraints.some(c => unsupportedBoundProperties(c).length > 0 || (c.shared === true) !== shared) ||
      paths.filter(p => (shared ? p.at(-1)!.definitionId : p.at(-1)!.id) === (shared ? child.definitionId : child.id)).length !== 1 ||
      path.some(p => p.hidden === true || carrierTargetsField(p,"hidden")) ||
      path.slice(0,-1).some(p => constraints.some(c => c.id !== undefined && carrierTargetsField(p,c.id))) ||
      ancestors.some(a => a.choices.some(p => constraints.some(c => c.id !== undefined && carrierTargetsField(p,c.id)))) ||
      child.modifierGroups.some(g => constraints.some(c => c.id !== undefined && modifierGroupTargetsField(g,c.id))) ||
      modifiers.some(m => m.conditionGroups.length > 0 || !m.conditions.every(queryIsStable) || !m.repeats.every(queryIsStable))) continue;
    const bounds = selectionBounds(child, path, state, {live:{roster,context,owner},requireMaximum:true});
    if (!bounds.supported || bounds.minimum > bounds.maximum) continue;
    const candidates = owner.selections.map(s => evaluationSelectionIdentityCandidate(s,index,matches,shared ? child.definitionId : child.id,shared));
    if (candidates.some(c => c.status === "unresolved")) continue;
    const selectedCount = candidates.filter(c => c.status === "match").reduce((sum,c) => sum + rosterSelectionAmount(c.occurrence),0);
    if (!Number.isSafeInteger(selectedCount) || selectedCount < 0) continue;
    // Every containing group must have a known maximum. A minimum does not
    // choose an alternative; only this entry's own requirement can add it.
    let safeGroups = true;
    for (let n = 1; n < path.length - 1; n++) {
      const groupBounds = selectionBounds(path[n]!,path.slice(0,n+1),state,{live:{roster,context,owner},requireMaximum:true});
      if (!groupBounds.supported || groupBounds.minimum > groupBounds.maximum) safeGroups = false;
    }
    if (safeGroups) requirements.push({choice:child,minimum:bounds.minimum,maximum:bounds.maximum,selectedCount,constraints});
  }
  // Validate simultaneous quantities against each enclosing group, not merely
  // entry maxima. This also protects two independent required sibling entries.
  if (requirements.length === 0) return success([],state.diagnostics);
  const inspection = inspectSingleRosterSelectionChildChoices(roster,context,owner,choice);
  if (!inspection.ok) return success([], [...state.diagnostics,...inspection.diagnostics]);
  for (const group of inspection.value.groups) {
    const relevant = requirements.filter(r => group.countedChoices.includes(r.choice));
    if (relevant.length === 0) continue;
    const selected = owner.selections.reduce((sum,s) => {
      const resolved = resolveEvaluationSelection(s,index,matches);
      // Capacity must not silently drop an unresolved sibling. The earlier
      // identity guard normally rejects it already; keep this fold fail-closed.
      if (resolved.status !== "resolved" || resolved.choices.length !== 1) return Number.POSITIVE_INFINITY;
      return sum + (resolved.choices.some(c => group.countedChoices.includes(c)) ? rosterSelectionAmount(s) : 0);
    },0);
    const added = relevant.reduce((sum,r) => sum + Math.max(0,r.minimum-r.selectedCount),0);
    if (!Number.isFinite(selected) || group.completeness !== "complete" || group.maximum === undefined || selected + added > group.maximum) return success([],state.diagnostics);
  }
  return success(requirements,state.diagnostics);
}

export interface RosterSelectionChoiceGroupInspection {
  readonly group: MaterializedSelectionEntryGroup;
  /** What this group offers directly. What a caller renders as its options. */
  readonly choices: readonly EvaluationSelectionChoice[];
  /**
   * What counts towards this group's own bound, nested groups included.
   *
   * A group may hold other groups rather than entries, and its bound then
   * counts everything chosen beneath it. Measured across the pinned corpus:
   * of 4,301 selection-entry groups, 85 contain only nested groups and 10 of
   * those carry a bound of their own. Every one of the 10 reads as a total
   * over its descendants — the Death Guard Plague Champion's `Wargear` is 2 of
   * 2 over two 1-of-1 groups, and a Wolf Scout Pack Leader's `Loadout` is 2
   * across three weapon groups whose maxima sum to 4. Several are meaningless
   * under any other reading.
   *
   * Separate from `choices` because the nested groups are inspected and
   * rendered in their own right; folding them in here would offer every option
   * twice.
   */
  readonly countedChoices: readonly EvaluationSelectionChoice[];
  /** A live roster query is shared by configuration and structural validation.
   * Selected occurrences may belong to another wrapper; never use them as local controls. */
  readonly rosterConstraints?: readonly RosterSelectionConstraintReport[];
  readonly membership?: {
    readonly selected: readonly RosterSelection[];
    readonly uncertain: readonly RosterSelection[];
  };
  readonly minimum?: number;
  readonly maximum?: number;
  readonly completeness: ValidationCompleteness;
}

export interface RosterSelectionDirectChoiceInspection {
  readonly choice: EvaluationSelectionChoice;
  /** Live descendant counts use source identity, not only the offered direct link. */
  readonly membership?: {
    readonly selected: readonly RosterSelection[];
    readonly uncertain: readonly RosterSelection[];
  };
  readonly minimum?: number;
  readonly maximum?: number;
  readonly completeness: ValidationCompleteness;
}

export interface RosterSelectionChildChoicesInspection {
  readonly choice: EvaluationSelectionChoice;
  readonly direct: readonly RosterSelectionDirectChoiceInspection[];
  readonly groups: readonly RosterSelectionChoiceGroupInspection[];
  readonly completeness: ValidationCompleteness;
}

export interface RosterSelectionChildChoicesInspectionOptions {
  readonly include?: (
    choice: EvaluationSelectionChoice,
    path: readonly EvaluationSelectionChoice[],
  ) => boolean;
}

export interface RosterSelectionChoiceGroupsInspection {
  readonly choice: EvaluationSelectionChoice;
  readonly groups: readonly RosterSelectionChoiceGroupInspection[];
  readonly completeness: ValidationCompleteness;
}

interface MutableInitializationAddition {
  readonly choice: EvaluationSelectionChoice;
  quantity: number;
  amount?: number;
  minimumAmount?: number;
  readonly initialization: RosterSelectionInitializationPlan;
}

interface PlannedContainer {
  readonly additions: MutableInitializationAddition[];
  readonly pendingChoices: RosterSelectionInitializationPendingChoice[];
}

interface SelectionBounds {
  readonly supported: boolean;
  readonly minimum: number;
  readonly maximum: number;
}

interface SteppedSelectionInitialization {
  readonly amount: number;
  readonly minimumAmount: number;
  readonly hasDefaultAmountModifiers: boolean;
}

interface InitializationState {
  readonly diagnostics: Diagnostic[];
  incomplete: number;
}

/** Shared default budget for static creation and its conditional augmentation. */
export const DEFAULT_MAX_PLANNED_SELECTIONS = 4_096;

// The New Recruit initializer reads minima without consulting automatic; only
// its later constraint-change handler tests the flag. Treating the extension
// as inert here lets both true and false corpus bounds seed initial selections
// without claiming support for that separate post-edit repair behavior.
const inertInitializationConstraintAttributes = ["automatic"] as const;

export function planRosterSelectionInitialization(
  choice: EvaluationSelectionChoice,
  options: RosterSelectionInitializationOptions = {},
): Result<RosterSelectionInitializationPlan> {
  const state: InitializationState = {
    diagnostics: [],
    incomplete: 0,
  };
  const requestedLimit =
    options.maxPlannedSelections ?? DEFAULT_MAX_PLANNED_SELECTIONS;
  const maxPlannedSelections =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 0
      ? requestedLimit
      : DEFAULT_MAX_PLANNED_SELECTIONS;
  const plan = planChoice(choice, [], state, maxPlannedSelections);
  return success(plan, state.diagnostics);
}

export function inspectRosterSelectionChoiceGroups(
  choice: EvaluationSelectionChoice,
): Result<RosterSelectionChoiceGroupsInspection> {
  const state: InitializationState = {
    diagnostics: [],
    incomplete: 0,
  };
  const groups: RosterSelectionChoiceGroupInspection[] = [];
  collectChoiceGroups(choice, [choice], groups, state);
  return success(
    {
      choice,
      groups,
      completeness: state.incomplete === 0 ? "complete" : "incomplete",
    },
    state.diagnostics,
  );
}

export function inspectRosterSelectionChildChoices(
  choice: EvaluationSelectionChoice,
  options: RosterSelectionChildChoicesInspectionOptions = {},
): Result<RosterSelectionChildChoicesInspection> {
  return inspectChildChoices(choice, options);
}

/**
 * Inspects one selected occurrence's child bounds against its current roster.
 *
 * Static initialization deliberately withholds modifier-driven child limits:
 * the parent and the conditions they query do not exist yet. Once the parent
 * is selected, this live variant probes an owner-local modifier target with a
 * temporary occurrence and reuses the normal constraint evaluator. The probe
 * never escapes and the input roster remains immutable. Modifiers carried by
 * an ancestor still withhold because their cross-carrier ordering has not been
 * established by the pinned corpus.
 * Static direct-entry descendant bounds count the actual parent's subtree by
 * shared definition or local source identity. An equal/weaker direct maximum
 * is redundant; mixed non-dominated scopes and dynamic descendant bounds stay
 * incomplete. This does not widen pre-selection initialization.
 */
export function inspectSingleRosterSelectionChildChoices(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choice: EvaluationSelectionChoice,
  options: RosterSelectionChildChoicesInspectionOptions = {},
): Result<RosterSelectionChildChoicesInspection> {
  return inspectChildChoices(choice, options, { roster, context, owner });
}

function inspectChildChoices(
  choice: EvaluationSelectionChoice,
  options: RosterSelectionChildChoicesInspectionOptions,
  live?: LiveRosterSelectionChildInspectionContext,
): Result<RosterSelectionChildChoicesInspection> {
  const state: InitializationState = {
    diagnostics: [],
    incomplete: 0,
  };
  const direct = directEntryChoices(choice)
    .filter(
      (child) =>
        options.include?.(child, [choice, child]) ?? true,
    )
    .map((child) =>
      inspectDirectChoice(child, [choice, child], state, live),
    );
  const groups: RosterSelectionChoiceGroupInspection[] = [];
  collectChoiceGroups(choice, [choice], groups, state, options, live);
  return success(
    {
      choice,
      direct,
      groups,
      completeness: state.incomplete === 0 ? "complete" : "incomplete",
    },
    state.diagnostics,
  );
}

export function inspectEmptySingleForceRootChoices(
  roots: readonly MaterializedVisibleRoot[],
): Result<EmptySingleForceRootChoicesInspection> {
  return inspectRootChoices(roots);
}

/**
 * Inspects root bounds against the current single-force roster.
 *
 * Static initialization cannot answer a conditional maximum because its
 * trigger may be a Battle Size or another configuration choice that does not
 * exist yet. The live catalogue and validation surfaces do have that context,
 * so they evaluate direct and grouped conditional modifiers here instead of continuing to
 * advertise the source maximum or reporting the selected root as unresolved.
 * Unsupported conditions, group behavior and repeats remain incomplete.
 */
export function inspectSingleForceRootChoices(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  force: RosterForce,
  roots: readonly MaterializedVisibleRoot[],
): Result<EmptySingleForceRootChoicesInspection> {
  return inspectRootChoices(roots, {
    roster,
    context,
    force,
    // Root inspection can visit hundreds of choices. Category membership is a
    // roster-wide index, so compute it once instead of rebuilding it for every
    // conditional bound encountered below.
    effectiveCategories: effectiveRosterCategories(roster, context),
  });
}

function inspectRootChoices(
  roots: readonly MaterializedVisibleRoot[],
  live?: LiveSingleForceRootInspectionContext,
): Result<EmptySingleForceRootChoicesInspection> {
  const state: InitializationState = {
    diagnostics: [],
    incomplete: 0,
  };
  const choices: EmptySingleForceRootChoiceInspection[] = [];
  for (const root of roots) {
    if (!isResolvedVisibleRoot(root)) continue;
    const incompleteAtStart = state.incomplete;
    const bounds = rootSelectionBounds(root.materialized, state, {
      requireMaximum: true,
      ...(live === undefined ? {} : { live }),
    });
    if (bounds.minimum > bounds.maximum) {
      diagnoseRootConflictingBounds(root.materialized, bounds, state);
    }
    const identity = rootSelectionBoundIdentity(root.materialized);
    choices.push({
      root,
      ...(identity === undefined ? {} : { identity }),
      ...(bounds.supported
        ? {
            minimum: bounds.minimum,
            maximum: bounds.maximum,
          }
        : {}),
      completeness:
        bounds.supported && state.incomplete === incompleteAtStart
          ? "complete"
          : "incomplete",
    });
  }
  return success(
    {
      choices,
      completeness: state.incomplete === 0 ? "complete" : "incomplete",
    },
    state.diagnostics,
  );
}

export function rootSelectionBoundIdentity(
  choice: EvaluationSelectionChoice,
): EmptySingleForceRootBoundIdentity | undefined {
  const bounds = choice.constraints.filter(
    (constraint) =>
      (constraint.type === "min" || constraint.type === "max") &&
      isPotentialRootSelectionBound(constraint),
  );
  const shared =
    bounds.length > 0 &&
    bounds.every((constraint) => constraint.shared === true);
  const id = shared ? choice.definitionId : choice.id;
  return id === undefined
    ? undefined
    : {
        kind: shared ? "definition" : "occurrence",
        id,
      };
}

export function planEmptySingleForceRootInitialization(
  roots: readonly MaterializedVisibleRoot[],
  options: RosterSelectionInitializationOptions = {},
): Result<EmptySingleForceRootInitializationPlan> {
  const state: InitializationState = {
    diagnostics: [],
    incomplete: 0,
  };
  const requestedLimit =
    options.maxPlannedSelections ?? DEFAULT_MAX_PLANNED_SELECTIONS;
  const maxPlannedSelections =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 0
      ? requestedLimit
      : DEFAULT_MAX_PLANNED_SELECTIONS;
  const additions: EmptySingleForceRootInitializationAddition[] = [];
  const additionsByIdentity = new Map<
    string,
    EmptySingleForceRootInitializationAddition
  >();
  for (const root of roots) {
    if (!isResolvedVisibleRoot(root)) {
      continue;
    }
    const bounds = rootSelectionBounds(root.materialized, state);
    if (!bounds.supported || bounds.minimum === 0) {
      continue;
    }
    if (root.materialized.kind === "selectionEntryGroup") {
      markIncomplete(state);
      state.diagnostics.push(
        initializationDiagnostic(
          root.materialized,
          "EVALUATION_ROOT_INITIALIZATION_GROUP_UNSUPPORTED",
          "A required visible root group cannot be selected automatically without choosing one of its entries.",
          undefined,
          { minimum: bounds.minimum },
        ),
      );
      continue;
    }
    if (bounds.minimum > bounds.maximum) {
      diagnoseRootConflictingBounds(root.materialized, bounds, state);
      continue;
    }
    const identity = rootInitializationIdentity(root.materialized);
    if (identity === undefined) {
      markIncomplete(state);
      state.diagnostics.push(
        initializationDiagnostic(
          root.materialized,
          "EVALUATION_ROOT_INITIALIZATION_TARGET_ID_MISSING",
          "A required visible root has no usable BattleScribe identity.",
          undefined,
          { minimum: bounds.minimum },
        ),
      );
      continue;
    }
    const existing = additionsByIdentity.get(identity);
    if (existing !== undefined) {
      if (bounds.minimum > existing.quantity) {
        const index = additions.indexOf(existing);
        const replacement = {
          ...existing,
          quantity: bounds.minimum,
        };
        additions[index] = replacement;
        additionsByIdentity.set(identity, replacement);
      }
      continue;
    }
    const addition = {
      root,
      quantity: bounds.minimum,
    };
    additions.push(addition);
    additionsByIdentity.set(identity, addition);
  }
  const plannedSelectionCount = additions.reduce(
    (total, { quantity }) => total + quantity,
    0,
  );
  if (plannedSelectionCount > maxPlannedSelections) {
    markIncomplete(state);
    const first = additions[0]?.root.materialized;
    state.diagnostics.push({
      code: "EVALUATION_ROOT_INITIALIZATION_RESOURCE_LIMIT",
      message:
        "Automatic root initialization exceeds the configured occurrence limit.",
      severity: "warning",
      impacts: ["compatibility"],
      ...(first === undefined
        ? {}
        : {
            location: {
              source: first.occurrence.source,
              path: first.occurrence.path,
            },
          }),
      details: {
        maxPlannedSelections,
        requested: plannedSelectionCount,
      },
    });
    return success(
      {
        additions: [],
        plannedSelectionCount: 0,
        completeness: "incomplete",
      },
      state.diagnostics,
    );
  }
  return success(
    {
      additions,
      plannedSelectionCount,
      completeness: state.incomplete === 0 ? "complete" : "incomplete",
    },
    state.diagnostics,
  );
}

function rootInitializationIdentity(
  choice: EvaluationSelectionChoice,
): string | undefined {
  const minima = choice.constraints.filter(
    (constraint) =>
      constraint.type === "min" &&
      isPotentialRootSelectionBound(constraint),
  );
  const shared =
    minima.length > 0 &&
    minima.every((constraint) => constraint.shared === true);
  const id = shared ? choice.definitionId : choice.id;
  return id === undefined
    ? undefined
    : JSON.stringify([shared ? "shared" : "local", id]);
}

function planChoice(
  choice: EvaluationSelectionChoice,
  ancestors: readonly EvaluationSelectionChoice[],
  state: InitializationState,
  maxPlannedSelections: number,
): RosterSelectionInitializationPlan {
  const incompleteAtStart = state.incomplete;
  const planned =
    choice.kind === "selectionEntryGroup"
      ? planGroup(choice, ancestors, state, maxPlannedSelections)
      : planContainer(
          choice,
          [...ancestors, choice],
          state,
          maxPlannedSelections,
        );
  const plannedSelectionCount = countPlannedSelections(
    planned.additions,
    maxPlannedSelections,
  );
  if (plannedSelectionCount > maxPlannedSelections) {
    markIncomplete(state);
    state.diagnostics.push(
      initializationDiagnostic(
        choice,
        "EVALUATION_INITIALIZATION_RESOURCE_LIMIT",
        "Automatic selection initialization exceeds the configured occurrence limit.",
        undefined,
        {
          maxPlannedSelections,
          requestedAtLeast: maxPlannedSelections + 1,
        },
      ),
    );
    return {
      choice,
      additions: [],
      pendingChoices: planned.pendingChoices,
      plannedSelectionCount: 0,
      completeness: "incomplete",
    };
  }
  return {
    choice,
    additions: planned.additions,
    pendingChoices: planned.pendingChoices,
    plannedSelectionCount,
    completeness:
      state.incomplete === incompleteAtStart ? "complete" : "incomplete",
  };
}

function planContainer(
  container: MaterializedSelectionContainer,
  carriers: readonly EvaluationSelectionChoice[],
  state: InitializationState,
  maxPlannedSelections: number,
): PlannedContainer {
  const planned: PlannedContainer = {
    additions: [],
    pendingChoices: [],
  };
  for (const child of directChoices(container)) {
    if (child.kind === "selectionEntryGroup") {
      mergePlannedContainer(
        planned,
        planGroup(child, carriers, state, maxPlannedSelections),
      );
      continue;
    }
    const bounds = selectionBounds(child, [...carriers, child], state);
    if (!bounds.supported) {
      continue;
    }
    if (bounds.minimum > bounds.maximum) {
      diagnoseConflictingBounds(child, bounds, state);
      continue;
    }

    const stepped = steppedSelectionInitialization(child, bounds, state);
    if (stepped === null) {
      continue;
    }
    if (stepped !== undefined) {
      if (
        stepped.amount > 0 ||
        stepped.hasDefaultAmountModifiers
      ) {
        addPlannedSelection(
          planned.additions,
          child,
          1,
          carriers,
          state,
          maxPlannedSelections,
          {
            amount: stepped.amount,
            minimumAmount: stepped.minimumAmount,
          },
        );
      }
      continue;
    }
    if (bounds.minimum === 0) {
      continue;
    }
    addPlannedSelection(
      planned.additions,
      child,
      bounds.minimum,
      carriers,
      state,
      maxPlannedSelections,
    );
  }
  return planned;
}

function steppedSelectionInitialization(
  choice: EvaluationSelectionChoice,
  bounds: SelectionBounds,
  state: InitializationState,
): SteppedSelectionInitialization | null | undefined {
  if (choice.kind !== "selectionEntry" || choice.step === undefined) {
    return undefined;
  }

  const step = Number(choice.step);
  if (
    choice.step.trim() === "" ||
    !Number.isFinite(step) ||
    step <= 0
  ) {
    markIncomplete(state);
    state.diagnostics.push(
      initializationDiagnostic(
        choice,
        "EVALUATION_INITIALIZATION_STEP_INVALID",
        "A stepped selection requires a finite positive step before its minimum can initialize one amounted occurrence.",
        "step",
        { value: choice.step },
      ),
    );
    return null;
  }

  const sourceDefault = staticSteppedDefaultAmount(choice, state);
  if (sourceDefault === undefined) return null;
  return {
    amount: Math.max(bounds.minimum, sourceDefault),
    minimumAmount: bounds.minimum,
    hasDefaultAmountModifiers:
      choice.modifiers.some(
        ({ field }) => field === "defaultAmount",
      ) ||
      choice.modifierGroups.some((group) =>
        modifierGroupTargetsField(group, "defaultAmount"),
      ),
  };
}

function staticSteppedDefaultAmount(
  choice: EvaluationSelectionChoice,
  state: InitializationState,
): number | undefined {
  const raw = choice.defaultAmount;
  if (raw === undefined || raw.trim() === "") return 0;
  if (raw.includes(",")) {
    markIncomplete(state);
    state.diagnostics.push(
      initializationDiagnostic(
        choice,
        "EVALUATION_INITIALIZATION_DEFAULT_AMOUNT_MULTIPLE_UNSUPPORTED",
        "Comma-delimited defaults require unsupported sub-unit instance initialization.",
        "defaultAmount",
        { value: raw },
      ),
    );
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    markIncomplete(state);
    state.diagnostics.push(
      initializationDiagnostic(
        choice,
        "EVALUATION_INITIALIZATION_DEFAULT_AMOUNT_INVALID",
        "A stepped selection default must be a finite non-negative number.",
        "defaultAmount",
        { value: raw },
      ),
    );
    return undefined;
  }
  return parsed;
}
function collectChoiceGroups(
  container: MaterializedSelectionContainer,
  carriers: readonly EvaluationSelectionChoice[],
  groups: RosterSelectionChoiceGroupInspection[],
  state: InitializationState,
  options: RosterSelectionChildChoicesInspectionOptions = {},
  live?: LiveRosterSelectionChildInspectionContext,
): void {
  // A group link that could contain requirements is not an empty optional group.
  // Its candidates cannot safely supply limits, but its owning configuration
  // must preserve the missing/ambiguous declaration in completeness.
  for (const link of container.entryLinks) {
    if (link.kind !== "unresolvedEntryLink" || link.link.type !== "selectionEntryGroup") continue;
    markIncomplete(state);
    state.diagnostics.push(initializationDiagnostic(link.link,
      "EVALUATION_INITIALIZATION_GROUP_UNRESOLVED",
      "A selection group could not be resolved, so its requirements are unknown.",
      "targetId", {reason: link.reason}));
  }
  for (const group of directChoices(container).filter(
    (choice): choice is MaterializedSelectionEntryGroup =>
      choice.kind === "selectionEntryGroup",
  )) {
    const groupPath = [...carriers, group];
    if (options.include?.(group, groupPath) === false) {
      continue;
    }
    const incompleteAtStart = state.incomplete;
    const global = live !== undefined && group.constraints.some(c => !isPotentialParentSelectionBound(c))
      ? liveRosterGroupBounds(group, groupPath, live, state)
      : undefined;
    const bounds = global?.bounds ?? selectionBounds(
      group,
      groupPath,
      state,
      {
        requireMaximum: true,
        ...(live === undefined ? {} : { live }),
      },
    );
    if (bounds.minimum > bounds.maximum) {
      diagnoseConflictingBounds(group, bounds, state);
    }
    groups.push({
      group,
      choices: directEntryChoices(group),
      countedChoices: nestedEntryChoices(group),
      ...(global === undefined ? {} : {rosterConstraints: global.reports, membership: global.membership}),
      ...(bounds.supported
        ? {
            minimum: bounds.minimum,
            maximum: bounds.maximum,
          }
        : {}),
      completeness:
        bounds.supported && state.incomplete === incompleteAtStart
          ? "complete"
          : "incomplete",
    });
    collectChoiceGroups(group, groupPath, groups, state, options, live);
  }
}

function inspectDirectChoice(
  choice: EvaluationSelectionChoice,
  carriers: readonly EvaluationSelectionChoice[],
  state: InitializationState,
  live?: LiveRosterSelectionChildInspectionContext,
): RosterSelectionDirectChoiceInspection {
  const incompleteAtStart = state.incomplete;
  const descendantDomain = live === undefined ? undefined : staticDescendantDomain(choice, carriers, live);
  const countDescendants = descendantDomain !== undefined;
  const bounds = selectionBounds(
    choice,
    carriers,
    state,
    {
      requireMaximum: true,
      countDescendants,
      ...(live === undefined ? {} : { live }),
    },
  );
  if (bounds.minimum > bounds.maximum) {
    diagnoseConflictingBounds(choice, bounds, state);
  }
  return {
    choice,
    ...(descendantDomain !== undefined && live !== undefined
      ? { membership: descendantMembership(live, choice, descendantDomain.shared) } : {}),
    ...(bounds.supported
      ? {
          minimum: bounds.minimum,
          maximum: bounds.maximum,
        }
      : {}),
    completeness:
      bounds.supported && state.incomplete === incompleteAtStart
        ? "complete"
        : "incomplete",
  };
}

function staticDescendantDomain(
  choice: EvaluationSelectionChoice,
  carriers: readonly EvaluationSelectionChoice[],
  live: LiveRosterSelectionChildInspectionContext,
): { readonly shared: boolean } | undefined {
  // The common direct-only path needs no additional arrays or subtree walk.
  if (!choice.constraints.some(c => c.includeChildSelections === true && isPotentialParentSelectionBound(c))) return undefined;
  const constraints = choice.constraints.filter(isPotentialParentSelectionBound);
  const locations = rosterSelectionLocations(live.roster).filter(l => l.occurrence === live.owner);
  if (locations.length !== 1) return undefined;
  const index = indexEvaluationChoices(live.context);
  const ancestors = locations[0]!.ancestors.map(a => resolveEvaluationSelection(a, index, rosterMatchesCatalogueContext(live.roster, live.context)));
  // A more distant selected ancestor can target this constraint too. Do not
  // widen the old immediate-carrier blind spot into a new complete result.
  if (ancestors.some(a => a.status !== "resolved" || a.choices.length !== 1)) return undefined;
  const allCarriers = [...carriers, ...ancestors.flatMap(a => a.choices)];
  const shared = constraints[0]!.shared === true;
  const maximum = constraints.reduce((limit, c) =>
    c.includeChildSelections === true && c.type === "max"
      ? Math.min(limit, unboundedBoundIdentity(c.value ?? Number.POSITIVE_INFINITY, "max")) : limit,
  Number.POSITIVE_INFINITY);
  // One row has one count domain. A direct maximum is redundant when the
  // same-identity descendant cap is at least as strict (direct is a subset).
  // Other mixed domains and dynamic descendant limits remain unsupported.
  const supported = constraints.every(c =>
    (c.includeChildSelections === true ||
      (c.type === "max" && maximum <= unboundedBoundIdentity(c.value ?? Number.POSITIVE_INFINITY, "max"))) &&
    (c.shared === true) === shared &&
    unsupportedBoundProperties(c).every(p => p === "includeChildSelections") &&
    (c.id === undefined || !allCarriers.some(carrier => carrierTargetsField(carrier, c.id!))));
  return supported ? { shared } : undefined;
}

function descendantMembership(
  live: LiveRosterSelectionChildInspectionContext,
  choice: EvaluationSelectionChoice,
  shared: boolean,
): NonNullable<RosterSelectionDirectChoiceInspection["membership"]> {
  const selected: RosterSelection[] = [], uncertain: RosterSelection[] = [];
  const index = indexEvaluationChoices(live.context);
  const matches = rosterMatchesCatalogueContext(live.roster, live.context);
  const target = shared ? choice.definitionId : choice.id;
  // Visit only this parent's durable descendants, once per applicable bound
  // row. The catalogue identity index is cached; no source bytes are copied.
  const visit = (children: readonly RosterSelection[]): void => {
    for (const child of children) {
      const candidate = evaluationSelectionIdentityCandidate(child, index, matches, target, shared);
      if (candidate.status === "match") selected.push(child);
      if (candidate.status === "unresolved") uncertain.push(child);
      visit(child.selections);
    }
  };
  visit(live.owner.selections);
  return { selected, uncertain };
}

function planGroup(
  group: MaterializedSelectionEntryGroup,
  ancestors: readonly EvaluationSelectionChoice[],
  state: InitializationState,
  maxPlannedSelections: number,
): PlannedContainer {
  const carriers = [...ancestors, group];
  const planned = planContainer(
    group,
    carriers,
    state,
    maxPlannedSelections,
  );
  const selected = totalDirectSelections(planned.additions);
  const defaultId = group.defaultSelectionEntryId;
  const defaults =
    defaultId === undefined || defaultId === "none"
      ? []
      : directEntryChoices(group).filter((choice) => choice.id === defaultId);
  const bounds = selectionBounds(group, carriers, state, {
    // A manual group with no usable default produces no automatic occurrence,
    // so its modifier-driven maximum cannot affect initialization. The live
    // structural and editing paths evaluate that maximum once the parent and
    // its conditions exist; warning here would describe an inference the
    // initializer never attempts. If child minima or one usable default can
    // add anything, the maximum remains required and unsupported shapes still
    // diagnose rather than risking an invalid automatic addition.
    deferUnusedModifiedMaximum:
      planned.additions.length === 0 && defaults.length !== 1,
  });
  if (!bounds.supported || bounds.minimum === 0) {
    return planned;
  }
  if (bounds.minimum > bounds.maximum) {
    diagnoseConflictingBounds(group, bounds, state);
    return planned;
  }

  const remaining = Math.max(0, bounds.minimum - selected);
  if (remaining === 0) {
    return planned;
  }
  if (defaultId === undefined || defaultId === "none") {
    planned.pendingChoices.push({
      group,
      minimum: bounds.minimum,
      remaining,
      reason:
        defaultId === "none" ? "defaultDisabled" : "defaultNotSpecified",
    });
    return planned;
  }

  if (defaults.length !== 1) {
    const reason =
      defaults.length === 0 ? "defaultUnavailable" : "defaultAmbiguous";
    markIncomplete(state);
    state.diagnostics.push(
      initializationDiagnostic(
        group,
        defaults.length === 0
          ? "EVALUATION_INITIALIZATION_DEFAULT_UNAVAILABLE"
          : "EVALUATION_INITIALIZATION_DEFAULT_AMBIGUOUS",
        defaults.length === 0
          ? "The required selection group default is not available among its direct choices."
          : "The required selection group default matches more than one direct choice.",
        "defaultSelectionEntryId",
        {
          defaultSelectionEntryId: defaultId,
          matches: defaults.length,
          minimum: bounds.minimum,
          remaining,
        },
      ),
    );
    planned.pendingChoices.push({
      group,
      minimum: bounds.minimum,
      remaining,
      reason,
    });
    return planned;
  }

  const defaultChoice = defaults[0]!;
  const defaultBounds = selectionBounds(
    defaultChoice,
    [...carriers, defaultChoice],
    state,
    { requireMaximum: true },
  );
  if (!defaultBounds.supported) {
    planned.pendingChoices.push({
      group,
      minimum: bounds.minimum,
      remaining,
      reason: "defaultMaximumReached",
    });
    return planned;
  }
  const existingDefault = planned.additions.find(
    ({ choice }) => choice === defaultChoice,
  );
  const alreadyPlanned =
    existingDefault === undefined
      ? 0
      : existingDefault.quantity * (existingDefault.amount ?? 1);
  const available = Math.max(0, defaultBounds.maximum - alreadyPlanned);
  const defaultQuantity = Math.min(remaining, available);
  if (defaultQuantity > 0) {
    addPlannedSelection(
      planned.additions,
      defaultChoice,
      defaultQuantity,
      carriers,
      state,
      maxPlannedSelections,
    );
  }
  if (defaultQuantity < remaining) {
    planned.pendingChoices.push({
      group,
      minimum: bounds.minimum,
      remaining: remaining - defaultQuantity,
      reason: "defaultMaximumReached",
    });
  }
  return planned;
}

function addPlannedSelection(
  additions: MutableInitializationAddition[],
  choice: EvaluationSelectionChoice,
  quantity: number,
  ancestors: readonly EvaluationSelectionChoice[],
  state: InitializationState,
  maxPlannedSelections: number,
  options: {
    readonly amount?: number;
    readonly minimumAmount?: number;
  } = {},
): void {
  const existing = additions.find((addition) => addition.choice === choice);
  if (existing !== undefined) {
    mergeInitializationAmount(existing, {
      choice,
      quantity,
      ...options,
      initialization: existing.initialization,
    });
    return;
  }
  additions.push({
    choice,
    quantity,
    ...options,
    initialization: planChoice(
      choice,
      ancestors,
      state,
      maxPlannedSelections,
    ),
  });
}

function mergeInitializationAmount(
  target: MutableInitializationAddition,
  source: MutableInitializationAddition,
): void {
  if (target.amount === undefined && source.amount === undefined) {
    target.quantity += source.quantity;
    return;
  }

  // A stepped entry represents aggregate selections in one selector node.
  // If another planning path reaches the same choice, combine its contribution
  // as amount rather than creating duplicate quantifiable occurrences.
  target.amount =
    (target.amount ?? target.quantity) +
    (source.amount ?? source.quantity);
  target.minimumAmount =
    (target.minimumAmount ?? 0) +
    (source.minimumAmount ?? 0);
  target.quantity = 1;
}

function selectionBounds(
  choice: EvaluationSelectionChoice,
  carriers: readonly EvaluationSelectionChoice[],
  state: InitializationState,
  options: {
    readonly requireMaximum?: boolean;
    readonly countDescendants?: boolean;
    readonly live?: LiveRosterSelectionChildInspectionContext;
    readonly deferUnusedModifiedMaximum?: boolean;
  } = {},
): SelectionBounds {
  let minimum = 0;
  let maximum = Number.POSITIVE_INFINITY;
  let supported = true;
  // Local creation cannot choose a global requirement on the player's behalf.
  // Preserve it as unresolved here; live group inspection evaluates the supported
  // domain below, while unsupported scopes must never become optional 0..Infinity.
  if (choice.kind === "selectionEntryGroup") {
    for (const constraint of choice.constraints.filter(c => !isPotentialParentSelectionBound(c))) {
      // Preserve independently supported local defaults during creation. Live
      // inspection withholds the whole mixed count domain; the static planner
      // records uncertainty without discarding unrelated parent-local defaults.
      if (options.live !== undefined) supported = false;
      diagnoseUnsupportedBound(constraint, ["scope"], state);
    }
  }
  const constraints = choice.constraints.filter(
    isPotentialParentSelectionBound,
  );
  for (const constraint of constraints.filter(
    ({ type }) => type !== "min" && type !== "max",
  )) {
    const unsupported = unsupportedBoundProperties(constraint);
    supported = false;
    diagnoseUnsupportedBound(constraint, unsupported, state);
  }
  for (const constraint of constraints.filter(
    ({ type }) => type === "min",
  )) {
    // Static zero minima require no additions whether descendants are counted
    // or not. Keep modifier uncertainty below, and never extend this exception
    // to live checks, positive minima, other unknown properties or maxima.
    const unsupported = unsupportedBoundProperties(constraint).filter(property =>
      !(options.countDescendants === true && property === "includeChildSelections") &&
      !(options.live === undefined && constraint.value === 0 && property === "includeChildSelections"),
    );
    if (unsupported.length > 0) {
      supported = false;
      diagnoseUnsupportedBound(constraint, unsupported, state);
      continue;
    }
    const constraintId = constraint.id;
    if (
      constraintId !== undefined &&
      carriers.some((carrier) =>
        carrierTargetsField(carrier, constraintId),
      )
    ) {
      if (options.live !== undefined) {
        const effective = effectiveSelectedChildBound(
          choice,
          carriers,
          constraint,
          options.live,
          state,
        );
        if (effective === undefined) {
          supported = false;
        } else {
          minimum = Math.max(
            minimum,
            unboundedBoundIdentity(effective, "min"),
          );
        }
        continue;
      }
      markIncomplete(state);
      if ((constraint.value ?? 0) > 0) {
        supported = false;
        state.diagnostics.push(
          initializationDiagnostic(
            constraint,
            "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
            "A required parent selection bound has modifiers, so its automatic quantity is not inferred.",
            undefined,
            { constraintId },
          ),
        );
      }
      continue;
    }
    minimum = Math.max(
      minimum,
      unboundedBoundIdentity(constraint.value ?? 0, "min"),
    );
  }
  if (minimum > 0 || options.requireMaximum === true) {
    for (const constraint of constraints.filter(
      ({ type }) => type === "max",
    )) {
      const unsupported = unsupportedBoundProperties(constraint).filter(property =>
        !(options.countDescendants === true && property === "includeChildSelections"));
      if (unsupported.length > 0) {
        supported = false;
        diagnoseUnsupportedBound(constraint, unsupported, state);
        continue;
      }
      const constraintId = constraint.id;
      if (
        constraintId !== undefined &&
        carriers.some((carrier) =>
          carrierTargetsField(carrier, constraintId),
        )
      ) {
        if (options.live !== undefined) {
          const effective = effectiveSelectedChildBound(
            choice,
            carriers,
            constraint,
            options.live,
            state,
          );
          if (effective === undefined) {
            supported = false;
          } else {
            maximum = Math.min(
              maximum,
              unboundedBoundIdentity(effective, "max"),
            );
          }
          continue;
        }
        if (options.deferUnusedModifiedMaximum === true) {
          continue;
        }
        supported = false;
        markIncomplete(state);
        state.diagnostics.push(
          initializationDiagnostic(
            constraint,
            "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
            "A required parent selection maximum has modifiers, so its automatic quantity is not inferred.",
            undefined,
            { constraintId },
          ),
        );
        continue;
      }
      maximum = Math.min(
        maximum,
        unboundedBoundIdentity(constraint.value ?? maximum, "max"),
      );
    }
  }
  return { supported, minimum, maximum };
}

function liveRosterGroupBounds(
  group: MaterializedSelectionEntryGroup,
  carriers: readonly EvaluationSelectionChoice[],
  live: LiveRosterSelectionChildInspectionContext,
  state: InitializationState,
): {bounds: SelectionBounds; reports: readonly RosterSelectionConstraintReport[];
  membership: {selected: readonly RosterSelection[]; uncertain: readonly RosterSelection[]}} {
  const unresolved = {bounds: {supported: false, minimum: 0, maximum: Infinity}, reports: [], membership: {selected: [], uncertain: []}};
  // Mixing count domains needs separate presentation. Do not fold a local count
  // into a roster-wide bound. Modified global bounds remain unsupported: their
  // applicability can differ between wrapper contexts, invalidating coalescing
  // by shared authored identity. The frozen supported requirements are static.
  if (!group.constraints.every(isSupportedRosterGroupConstraint) ||
      carriers.some(c => group.constraints.some(bound => bound.id !== undefined && carrierTargetsField(c, bound.id)))) {
    for (const constraint of group.constraints) diagnoseUnsupportedBound(constraint, ["group query domain or carrier"], state);
    return unresolved;
  }
  const probeId = unusedChildBoundProbeId(live.roster);
  const probed = addRosterSelectionToSelection(live.roster, live.owner.id, {
    id: probeId,
    definition: {kind: group.kind, key: rosterDefinitionKeyForSource(group.occurrence.source.sourceId, group.occurrence.path)},
  });
  state.diagnostics.push(...probed.diagnostics);
  const probe = probed.ok ? findSelectionById(probed.value.forces, probeId) : undefined;
  if (!probed.ok || probe === undefined) { markIncomplete(state); return unresolved; }
  const reports: RosterSelectionConstraintReport[] = [];
  let minimum = 0, maximum = Infinity, supported = true;
  for (const constraint of group.constraints) {
    const result = inspectRosterSelectionConstraintWithSelectionConditions(probed.value, live.context, probe, constraint);
    state.diagnostics.push(...result.diagnostics);
    if (!result.ok) { supported = false; continue; }
    const report = result.value;
    reports.push(report);
    if (report.completeness !== "complete" || report.observed === undefined || report.limit === undefined ||
        !Number.isSafeInteger(report.limit) || (report.limit < 0 && !isUnboundedConstraintValue(report.limit))) {
      supported = false; continue;
    }
    if (constraint.type === "min") minimum = Math.max(minimum, unboundedBoundIdentity(report.limit, "min"));
    if (constraint.type === "max") maximum = Math.min(maximum, unboundedBoundIdentity(report.limit, "max"));
  }
  if (!supported) markIncomplete(state);
  // Every admitted constraint has the same count domain. Reports retain the
  // separate authored min/max evidence; the throwaway wrapper never counts.
  const report = reports[0];
  return {bounds: {minimum, maximum, supported}, reports, membership: {
    selected: report?.matching ?? [],
    uncertain: report?.candidates.filter(c => c.status === "unresolved").map(c => c.occurrence) ?? [],
  }};
}

function effectiveSelectedChildBound(
  choice: EvaluationSelectionChoice,
  carriers: readonly EvaluationSelectionChoice[],
  constraint: EvaluationSelectionChoice["constraints"][number],
  live: LiveRosterSelectionChildInspectionContext,
  state: InitializationState,
): number | undefined {
  const constraintId = constraint.id;
  const baseValue = constraint.value;
  if (constraintId === undefined || baseValue === undefined) {
    return baseValue;
  }
  const targetingCarriers = carriers.filter((carrier) =>
    carrierTargetsField(carrier, constraintId),
  );
  if (
    targetingCarriers.length !== 1 ||
    targetingCarriers[0] !== choice
  ) {
    markIncomplete(state);
    state.diagnostics.push(
      initializationDiagnostic(
        constraint,
        "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        "A parent selection bound has modifiers carried outside its own choice, so its live quantity is not inferred.",
        undefined,
        { constraintId, carriers: targetingCarriers.length },
      ),
    );
    return undefined;
  }

  // Groups are transparent in durable browser rosters. A throwaway group
  // occurrence recreates the relative `self`/`parent` position that the
  // constraint evaluator expects without mutating or returning the probe.
  const probeId = unusedChildBoundProbeId(live.roster);
  const probed = addRosterSelectionToSelection(
    live.roster,
    live.owner.id,
    {
      id: probeId,
      definition: {
        kind: choice.kind,
        key: rosterDefinitionKeyForSource(
          choice.occurrence.source.sourceId,
          choice.occurrence.path,
        ),
      },
      ...(choice.name === undefined ? {} : { name: choice.name }),
    },
  );
  state.diagnostics.push(...probed.diagnostics);
  if (!probed.ok) {
    markIncomplete(state);
    return undefined;
  }
  const probe = findSelectionById(probed.value.forces, probeId);
  if (probe === undefined) {
    markIncomplete(state);
    return undefined;
  }
  const inspected = inspectRosterSelectionConstraintWithSelectionConditions(
    probed.value,
    live.context,
    probe,
    constraint,
  );
  state.diagnostics.push(...inspected.diagnostics);
  if (
    !inspected.ok ||
    inspected.value.completeness !== "complete" ||
    inspected.value.limit === undefined ||
    !Number.isSafeInteger(inspected.value.limit) ||
    (inspected.value.limit < 0 &&
      !(
        isUnboundedConstraintValue(baseValue) &&
        isUnboundedConstraintValue(inspected.value.limit)
      ))
  ) {
    markIncomplete(state);
    return undefined;
  }
  return inspected.value.limit;
}

function unusedChildBoundProbeId(roster: Roster): SelectionOccurrenceId {
  let suffix = 0;
  let candidate = selectionOccurrenceId("__rosterforge-child-bound-probe__");
  while (findSelectionById(roster.forces, candidate) !== undefined) {
    suffix += 1;
    candidate = selectionOccurrenceId(
      `__rosterforge-child-bound-probe__-${suffix}`,
    );
  }
  return candidate;
}

function findSelectionById(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
): RosterSelection | undefined {
  for (const force of forces) {
    for (const selection of force.selections) {
      if (selection.id === id) return selection;
      const nested = findSelectionByIdInTree(selection.selections, id);
      if (nested !== undefined) return nested;
    }
    const nestedForce = findSelectionById(force.forces, id);
    if (nestedForce !== undefined) return nestedForce;
  }
  return undefined;
}

function findSelectionByIdInTree(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
): RosterSelection | undefined {
  for (const selection of selections) {
    if (selection.id === id) return selection;
    const nested = findSelectionByIdInTree(selection.selections, id);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function rootSelectionBounds(
  choice: EvaluationSelectionChoice,
  state: InitializationState,
  options: {
    readonly requireMaximum?: boolean;
    readonly live?: LiveSingleForceRootInspectionContext;
  } = {},
): SelectionBounds {
  let minimum = 0;
  let maximum = Number.POSITIVE_INFINITY;
  let supported = true;
  const constraints = choice.constraints.filter(isPotentialRootSelectionBound);
  for (const constraint of constraints.filter(
    ({ type }) => type !== "min" && type !== "max",
  )) {
    const unsupported = unsupportedRootBoundProperties(constraint);
    supported = false;
    diagnoseUnsupportedRootBound(constraint, unsupported, state);
  }
  for (const constraint of constraints.filter(
    ({ type }) => type === "min",
  )) {
    const unsupported = unsupportedRootBoundProperties(constraint);
    if (unsupported.length > 0) {
      supported = false;
      diagnoseUnsupportedRootBound(constraint, unsupported, state);
      continue;
    }
    const baseValue = constraint.value ?? 0;
    const effective = effectiveRootBound(
      choice,
      constraint,
      state,
      false,
      options.live,
    );
    if (effective === undefined) {
      supported &&= unboundedBoundIdentity(baseValue, "min") === 0;
      continue;
    }
    minimum = Math.max(minimum, unboundedBoundIdentity(effective, "min"));
  }
  if (minimum > 0 || options.requireMaximum === true) {
    for (const constraint of constraints.filter(
      ({ type }) => type === "max",
    )) {
      const unsupported = unsupportedRootBoundProperties(constraint);
      if (unsupported.length > 0) {
        supported = false;
        diagnoseUnsupportedRootBound(constraint, unsupported, state);
        continue;
      }
      const effective = effectiveRootBound(
        choice,
        constraint,
        state,
        true,
        options.live,
      );
      if (effective === undefined) {
        supported = false;
        continue;
      }
      maximum = Math.min(
        maximum,
        unboundedBoundIdentity(effective, "max"),
      );
    }
  }
  return { supported, minimum, maximum };
}

function diagnoseUnsupportedRootBound(
  constraint: EvaluationSelectionChoice["constraints"][number],
  unsupported: readonly string[],
  state: InitializationState,
): void {
  markIncomplete(state);
  state.diagnostics.push(
    initializationDiagnostic(
      constraint,
      "EVALUATION_ROOT_INITIALIZATION_CONSTRAINT_UNSUPPORTED",
      "A force- or roster-scoped root bound cannot be used for automatic initialization.",
      undefined,
      {
        unsupported,
        type: constraint.type,
        field: constraint.field,
        scope: constraint.scope,
        value: constraint.value,
      },
    ),
  );
}

function effectiveRootBound(
  choice: EvaluationSelectionChoice,
  constraint: EvaluationSelectionChoice["constraints"][number],
  state: InitializationState,
  diagnoseUnsupported: boolean,
  live?: LiveSingleForceRootInspectionContext,
): number | undefined {
  const constraintId = constraint.id;
  const baseValue = constraint.value;
  if (constraintId === undefined || baseValue === undefined) {
    return baseValue;
  }
  const modifiers = choice.modifiers.filter(
    (modifier) => modifier.field === constraintId,
  );
  const modifierGroups = choice.modifierGroups.filter((group) =>
    modifierGroupTargetsField(group, constraintId),
  );
  if (live !== undefined && modifierGroups.length > 0) {
    // Live inspection has a real force/configuration, unlike static creation.
    // Reuse inherited applicability and source order; flattening groups alone
    // would apply Jakhals/Goremongers maxima outside their gated detachment.
    const options = { effectiveCategories: live.effectiveCategories, prospectiveChild: true };
    const direct = modifiers.map(modifier => evaluateRosterModifierApplicability(live.roster, live.context, live.force, modifier, options));
    const groups = modifierGroups.map(group => evaluateRosterModifierGroupApplicability(live.roster, live.context, live.force, group, options));
    for (const result of [...direct, ...groups]) state.diagnostics.push(...result.diagnostics);
    if ([...direct, ...groups].some(result => !result.ok || result.value.completeness !== "complete")) {
      markIncomplete(state);
      return undefined;
    }
    const grouped = collectRosterModifierGroupExecution<(typeof modifiers)[number]>(groups.flatMap(result => result.ok ? [result.value] : []), constraintId);
    const applicability = new Map(direct.flatMap(result => result.ok ? [[result.value.modifier, result.value] as const] : []));
    const inherited = new Map(grouped.entries.map(entry => [entry.modifier, entry]));
    const evaluated = evaluateNumericModifierSequence(baseValue, [...modifiers, ...grouped.modifiers], {
      applicability: modifier => applicability.get(modifier)?.status ?? inherited.get(modifier)?.status,
      conditionGroupsEvaluated: modifier => applicability.get(modifier)?.evaluated ?? inherited.get(modifier)?.evaluated ?? false,
    });
    state.diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok || evaluated.value.completeness !== "complete" || !Number.isSafeInteger(evaluated.value.value) || evaluated.value.value < 0) {
      markIncomplete(state);
      return undefined;
    }
    return evaluated.value.value;
  }
  if (modifierGroups.length > 0) {
    markIncomplete(state);
    if (diagnoseUnsupported) {
      state.diagnostics.push(
        initializationDiagnostic(
          modifierGroups[0]!,
          "EVALUATION_ROOT_INITIALIZATION_MODIFIER_GROUP_UNSUPPORTED",
          "A required root bound has grouped modifiers, so its automatic quantity is not inferred.",
          undefined,
          {
            constraintId,
            modifierGroups: modifierGroups.length,
          },
        ),
      );
    }
    return undefined;
  }
  if (modifiers.length === 0) {
    return baseValue;
  }
  if (
    modifiers.some(
      (modifier) =>
        modifier.conditions.length > 0 ||
        modifier.conditionGroups.length > 0,
    )
  ) {
    if (live !== undefined) {
      const applicability = new Map<
        (typeof modifiers)[number],
        {
          readonly status: "applicable" | "notApplicable" | "unresolved";
          readonly evaluated: boolean;
          readonly completeness: ValidationCompleteness;
        }
      >();
      for (const modifier of modifiers) {
        const evaluated = evaluateRosterModifierApplicability(
          live.roster,
          live.context,
          live.force,
          modifier,
          {
            effectiveCategories: live.effectiveCategories,
            prospectiveChild: true,
          },
        );
        state.diagnostics.push(...evaluated.diagnostics);
        if (evaluated.ok) applicability.set(modifier, evaluated.value);
      }
      const evaluated = evaluateNumericModifierSequence(baseValue, modifiers, {
        applicability: (modifier) => applicability.get(modifier)?.status,
        conditionGroupsEvaluated: (modifier) =>
          applicability.get(modifier)?.evaluated === true,
      });
      state.diagnostics.push(...evaluated.diagnostics);
      if (
        !evaluated.ok ||
        evaluated.value.completeness !== "complete" ||
        applicability.size !== modifiers.length ||
        [...applicability.values()].some(
          ({ completeness }) => completeness !== "complete",
        ) ||
        !Number.isSafeInteger(evaluated.value.value) ||
        evaluated.value.value < 0
      ) {
        markIncomplete(state);
        return undefined;
      }
      return evaluated.value.value;
    }
    markIncomplete(state);
    if (diagnoseUnsupported) {
      state.diagnostics.push(
        initializationDiagnostic(
          modifiers[0]!,
          "EVALUATION_ROOT_INITIALIZATION_CONDITIONAL_MODIFIERS_UNSUPPORTED",
          "This root bound has conditional modifiers, so its effective limit is unresolved.",
          undefined,
          { constraintId, modifiers: modifiers.length },
        ),
      );
    }
    return undefined;
  }
  const evaluated = evaluateNumericModifierSequence(baseValue, modifiers, {
    applicability: () => "applicable",
    conditionGroupsEvaluated: () => true,
  });
  if (diagnoseUnsupported) {
    state.diagnostics.push(...evaluated.diagnostics);
  }
  if (
    !evaluated.ok ||
    evaluated.value.completeness !== "complete" ||
    !Number.isSafeInteger(evaluated.value.value) ||
    evaluated.value.value < 0
  ) {
    markIncomplete(state);
    return undefined;
  }
  return evaluated.value.value;
}

function isPotentialRootSelectionBound(
  constraint: EvaluationSelectionChoice["constraints"][number],
): boolean {
  if (
    constraint.field === "selections" &&
    (constraint.scope === "force" || constraint.scope === "roster")
  ) {
    return true;
  }
  return (
    (constraint.type === "min" || constraint.type === "max") &&
    (constraint.field === undefined || constraint.field === "selections") &&
    (constraint.scope === undefined ||
      constraint.scope === "force" ||
      constraint.scope === "roster")
  );
}

function unsupportedRootBoundProperties(
  constraint: EvaluationSelectionChoice["constraints"][number],
): readonly string[] {
  const unsupported: string[] = [];
  if (constraint.type !== "min" && constraint.type !== "max") {
    unsupported.push("type");
  }
  if (constraint.field !== "selections") {
    unsupported.push("field");
  }
  if (constraint.scope !== "force" && constraint.scope !== "roster") {
    unsupported.push("scope");
  }
  if (
    constraint.value === undefined ||
    !Number.isSafeInteger(constraint.value) ||
    (constraint.value < 0 && !isUnboundedConstraintValue(constraint.value))
  ) {
    unsupported.push("value");
  }
  if (constraint.percentValue === true) {
    unsupported.push("percentValue");
  }
  const knownAttributes = new Set([
    "id",
    "type",
    "field",
    "scope",
    "value",
    "percentValue",
    "shared",
    "includeChildSelections",
    "includeChildForces",
    ...inertInitializationConstraintAttributes,
  ]);
  for (const attribute of Object.keys(constraint.node.attributes)) {
    if (!knownAttributes.has(attribute)) {
      unsupported.push(attribute);
    }
  }
  return [...new Set(unsupported)];
}

function diagnoseUnsupportedBound(
  constraint: EvaluationSelectionChoice["constraints"][number],
  unsupported: readonly string[],
  state: InitializationState,
): void {
  markIncomplete(state);
  state.diagnostics.push(
    initializationDiagnostic(
      constraint,
      "EVALUATION_INITIALIZATION_CONSTRAINT_UNSUPPORTED",
      "A parent selection bound cannot be used for automatic initialization.",
      undefined,
      {
        unsupported,
        type: constraint.type,
        field: constraint.field,
        scope: constraint.scope,
        value: constraint.value,
      },
    ),
  );
}

function diagnoseRootConflictingBounds(
  choice: EvaluationSelectionChoice,
  bounds: SelectionBounds,
  state: InitializationState,
): void {
  markIncomplete(state);
  state.diagnostics.push(
    initializationDiagnostic(
      choice,
      "EVALUATION_ROOT_INITIALIZATION_CONSTRAINT_BOUNDS_CONFLICT",
      "A required root minimum exceeds its maximum, so no automatic occurrences were added.",
      undefined,
      { minimum: bounds.minimum, maximum: bounds.maximum },
    ),
  );
}

/**
 * What an unbounded constraint contributes when bounds are folded together.
 *
 * `-1` means "no bound" — see `UNBOUNDED_CONSTRAINT_VALUE` in
 * `constraints.ts`. Initialization folds minima with `Math.max` and maxima
 * with `Math.min`, so the sentinel has to arrive as the *identity* of its
 * fold: `0` for a minimum, positive infinity for a maximum. Passing the
 * literal `-1` into `Math.min` would clamp every maximum to -1, and the
 * initializer would then create nothing at all.
 */
function unboundedBoundIdentity(
  value: number,
  type: "min" | "max",
): number {
  if (!isUnboundedConstraintValue(value)) {
    return value;
  }
  return type === "min" ? 0 : Number.POSITIVE_INFINITY;
}

function isPotentialParentSelectionBound(
  constraint: EvaluationSelectionChoice["constraints"][number],
): boolean {
  if (
    constraint.field === "selections" &&
    constraint.scope === "parent"
  ) {
    return true;
  }
  return (
    (constraint.type === "min" || constraint.type === "max") &&
    (constraint.field === undefined || constraint.field === "selections") &&
    (constraint.scope === undefined || constraint.scope === "parent")
  );
}

function unsupportedBoundProperties(
  constraint: EvaluationSelectionChoice["constraints"][number],
): readonly string[] {
  const unsupported: string[] = [];
  if (constraint.type !== "min" && constraint.type !== "max") {
    unsupported.push("type");
  }
  if (constraint.field !== "selections") {
    unsupported.push("field");
  }
  if (constraint.scope !== "parent") {
    unsupported.push("scope");
  }
  if (
    constraint.value === undefined ||
    !Number.isSafeInteger(constraint.value) ||
    (constraint.value < 0 && !isUnboundedConstraintValue(constraint.value))
  ) {
    unsupported.push("value");
  }
  if (constraint.percentValue === true) {
    unsupported.push("percentValue");
  }
  if (constraint.includeChildSelections === true) {
    unsupported.push("includeChildSelections");
  }
  if (constraint.includeChildForces === true) {
    unsupported.push("includeChildForces");
  }
  const knownAttributes = new Set([
    "id",
    "type",
    "field",
    "scope",
    "value",
    "percentValue",
    "shared",
    "includeChildSelections",
    "includeChildForces",
    ...inertInitializationConstraintAttributes,
  ]);
  for (const attribute of Object.keys(constraint.node.attributes)) {
    if (!knownAttributes.has(attribute)) {
      unsupported.push(attribute);
    }
  }
  return [...new Set(unsupported)];
}

function carrierTargetsField(
  carrier: EvaluationSelectionChoice,
  field: string,
): boolean {
  return (
    carrier.modifiers.some((modifier) => modifier.field === field) ||
    carrier.modifierGroups.some((group) =>
      modifierGroupTargetsField(group, field),
    )
  );
}

function modifierGroupTargetsField(
  group: EvaluationSelectionChoice["modifierGroups"][number],
  field: string,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === field) ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsField(child, field),
    )
  );
}

function diagnoseConflictingBounds(
  choice: EvaluationSelectionChoice,
  bounds: SelectionBounds,
  state: InitializationState,
): void {
  markIncomplete(state);
  state.diagnostics.push(
    initializationDiagnostic(
      choice,
      "EVALUATION_INITIALIZATION_CONSTRAINT_BOUNDS_CONFLICT",
      "A selection minimum exceeds its maximum, so no automatic occurrences were added.",
      undefined,
      { minimum: bounds.minimum, maximum: bounds.maximum },
    ),
  );
}

function directChoices(
  container: MaterializedSelectionContainer,
): readonly EvaluationSelectionChoice[] {
  return [
    ...container.selectionEntries,
    ...container.selectionEntryGroups,
    ...container.entryLinks.filter(isResolvedSelectionChoice),
  ];
}

function isResolvedVisibleRoot(
  root: MaterializedVisibleRoot,
): root is EmptySingleForceRootInitializationChoice {
  return root.materialized.kind !== "unresolvedEntryLink";
}

/**
 * Every entry beneath a container, including through nested groups.
 *
 * Used for counting a group's bound, never for offering options: see
 * `RosterSelectionChoiceGroupInspection.countedChoices`.
 */
function nestedEntryChoices(
  container: MaterializedSelectionContainer,
): readonly EvaluationSelectionChoice[] {
  const collected = [...directEntryChoices(container)];
  for (const group of container.selectionEntryGroups) {
    collected.push(...nestedEntryChoices(group));
  }
  return collected;
}

function directEntryChoices(
  container: MaterializedSelectionContainer,
): readonly EvaluationSelectionChoice[] {
  return [
    ...container.selectionEntries,
    ...container.entryLinks.filter(
      (choice): choice is EvaluationSelectionChoice =>
        choice.kind === "selectionEntry",
    ),
  ];
}

function isResolvedSelectionChoice(
  choice: MaterializedSelectionContainer["entryLinks"][number],
): choice is EvaluationSelectionChoice {
  return choice.kind !== "unresolvedEntryLink";
}

function mergePlannedContainer(
  target: PlannedContainer,
  source: PlannedContainer,
): void {
  for (const addition of source.additions) {
    const existing = target.additions.find(
      ({ choice }) => choice === addition.choice,
    );
    if (existing === undefined) {
      target.additions.push(addition);
    } else {
      mergeInitializationAmount(existing, addition);
    }
  }
  target.pendingChoices.push(...source.pendingChoices);
}

function totalDirectSelections(
  additions: readonly MutableInitializationAddition[],
): number {
  return additions.reduce(
    (total, addition) =>
      total + addition.quantity * (addition.amount ?? 1),
    0,
  );
}

function countPlannedSelections(
  additions: readonly MutableInitializationAddition[],
  limit: number,
): number {
  let total = 0;
  for (const addition of additions) {
    const nested = addition.initialization.plannedSelectionCount;
    const perOccurrence = nested + 1;
    if (
      addition.quantity > limit ||
      perOccurrence > limit ||
      addition.quantity * perOccurrence > limit - total
    ) {
      return limit + 1;
    }
    total += addition.quantity * perOccurrence;
  }
  return total;
}

function markIncomplete(state: InitializationState): void {
  state.incomplete += 1;
}

function initializationDiagnostic(
  source:
    | EvaluationSelectionChoice
    | {
        readonly source: SourceFileProvenance;
        readonly path: readonly string[];
      },
  code: string,
  message: string,
  attribute: string | undefined,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  const location =
    "source" in source
      ? { source: source.source, path: source.path }
      : {
          source: source.occurrence.source,
          path: source.occurrence.path,
        };
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility"],
    location: {
      source: location.source,
      path:
        attribute === undefined
          ? location.path
          : [...location.path, `@${attribute}`],
    },
    details,
  };
}
