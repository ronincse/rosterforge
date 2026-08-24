import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type {
  MaterializedSelectionContainer,
  MaterializedSelectionEntryGroup,
  MaterializedVisibleEntryLinkRoot,
  MaterializedVisibleRoot,
  MaterializedVisibleSelectionEntryGroupRoot,
  MaterializedVisibleSelectionEntryRoot,
} from "@rosterforge/data-graph";

import type { EvaluationSelectionChoice } from "./selection-context.js";
import { evaluateNumericModifierSequence } from "./modifiers.js";
import { isUnboundedConstraintValue } from "./constraints.js";

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
  readonly minimum?: number;
  readonly maximum?: number;
  readonly completeness: ValidationCompleteness;
}

export interface RosterSelectionDirectChoiceInspection {
  readonly choice: EvaluationSelectionChoice;
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

const defaultMaxPlannedSelections = 4_096;

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
    options.maxPlannedSelections ?? defaultMaxPlannedSelections;
  const maxPlannedSelections =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 0
      ? requestedLimit
      : defaultMaxPlannedSelections;
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
      inspectDirectChoice(child, [choice, child], state),
    );
  const groups: RosterSelectionChoiceGroupInspection[] = [];
  collectChoiceGroups(choice, [choice], groups, state, options);
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
    options.maxPlannedSelections ?? defaultMaxPlannedSelections;
  const maxPlannedSelections =
    Number.isSafeInteger(requestedLimit) && requestedLimit >= 0
      ? requestedLimit
      : defaultMaxPlannedSelections;
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
): void {
  for (const group of directChoices(container).filter(
    (choice): choice is MaterializedSelectionEntryGroup =>
      choice.kind === "selectionEntryGroup",
  )) {
    const groupPath = [...carriers, group];
    if (options.include?.(group, groupPath) === false) {
      continue;
    }
    const incompleteAtStart = state.incomplete;
    const bounds = selectionBounds(
      group,
      groupPath,
      state,
      { requireMaximum: true },
    );
    if (bounds.minimum > bounds.maximum) {
      diagnoseConflictingBounds(group, bounds, state);
    }
    groups.push({
      group,
      choices: directEntryChoices(group),
      countedChoices: nestedEntryChoices(group),
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
    collectChoiceGroups(group, groupPath, groups, state, options);
  }
}

function inspectDirectChoice(
  choice: EvaluationSelectionChoice,
  carriers: readonly EvaluationSelectionChoice[],
  state: InitializationState,
): RosterSelectionDirectChoiceInspection {
  const incompleteAtStart = state.incomplete;
  const bounds = selectionBounds(
    choice,
    carriers,
    state,
    { requireMaximum: true },
  );
  if (bounds.minimum > bounds.maximum) {
    diagnoseConflictingBounds(choice, bounds, state);
  }
  return {
    choice,
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
  const bounds = selectionBounds(group, carriers, state);
  if (!bounds.supported || bounds.minimum === 0) {
    return planned;
  }
  if (bounds.minimum > bounds.maximum) {
    diagnoseConflictingBounds(group, bounds, state);
    return planned;
  }

  const selected = totalDirectSelections(planned.additions);
  const remaining = Math.max(0, bounds.minimum - selected);
  if (remaining === 0) {
    return planned;
  }
  const defaultId = group.defaultSelectionEntryId;
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

  const defaults = directEntryChoices(group).filter(
    (choice) => choice.id === defaultId,
  );
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
  options: { readonly requireMaximum?: boolean } = {},
): SelectionBounds {
  let minimum = 0;
  let maximum = Number.POSITIVE_INFINITY;
  let supported = true;
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
    const unsupported = unsupportedBoundProperties(constraint);
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
      const unsupported = unsupportedBoundProperties(constraint);
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

function rootSelectionBounds(
  choice: EvaluationSelectionChoice,
  state: InitializationState,
  options: { readonly requireMaximum?: boolean } = {},
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
    markIncomplete(state);
    if (diagnoseUnsupported) {
      state.diagnostics.push(
        initializationDiagnostic(
          modifiers[0]!,
          "EVALUATION_ROOT_INITIALIZATION_CONDITIONAL_MODIFIERS_UNSUPPORTED",
          "A required root bound has conditional modifiers, so its automatic quantity is not inferred.",
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
