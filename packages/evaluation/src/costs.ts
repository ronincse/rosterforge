import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type {
  BattleScribeCatalogueContext,
  BattleScribeGraphReference,
} from "@rosterforge/data-graph";

import {
  rosterSelectionAmount,
  type Roster,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

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
  evaluateNumericModifierSequence,
  type NumericModifierSequenceReport,
} from "./modifiers.js";
import {
  evaluateRosterModifierRepeats,
  type RosterRepeatReport,
} from "./repeats.js";
import {
  expectedCatalogueKey,
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  type EvaluationChoiceIndex,
  type EvaluationSelectionChoice,
} from "./selection-context.js";
import { effectiveRosterCategories } from "./effective-categories.js";

export type RosterCostChoice = EvaluationSelectionChoice;

export type RosterCostSource = RosterCostChoice["costs"][number];
export type RosterCostModifier = RosterCostChoice["modifiers"][number];
export type RosterCostCondition = RosterCostModifier["conditions"][number];
export type RosterCostConditionGroup =
  RosterCostModifier["conditionGroups"][number];
export type RosterCostModifierGroup =
  RosterCostChoice["modifierGroups"][number];
export type RosterCostType =
  BattleScribeCatalogueContext["document"]["projection"]["costTypes"][number];

export type RosterCostScope =
  | "base"
  | "unconditionalModifiers"
  | "selectionConditions";

export type RosterCostSelectionStatus =
  | "resolved"
  | "unavailable"
  | "ambiguous"
  | "unresolved";

export type RosterCostIssue =
  | "missingTypeId"
  | "missingValue"
  | "missingCostType"
  | "ambiguousCostType"
  | "duplicateOccurrenceType";

interface RosterCostItemBase {
  readonly occurrence: RosterSelection;
  readonly choice: RosterCostChoice;
  readonly source: RosterCostSource;
}

export type RosterCostModifierApplicabilityReport =
  RosterModifierApplicabilityReport<RosterCostModifier>;
export type RosterCostModifierGroupApplicabilityReport =
  RosterModifierGroupApplicabilityReport<RosterCostModifierGroup>;

export interface IncludedRosterCostItem extends RosterCostItemBase {
  readonly status: "included";
  readonly typeId: ObjectId;
  readonly baseValue: number;
  readonly value: number;
  readonly amount: number;
  readonly totalValue: number;
  readonly costType: RosterCostType;
  readonly modifiers: readonly RosterCostModifier[];
  readonly modifierGroups: readonly RosterCostModifierGroup[];
  readonly modifierSequence: NumericModifierSequenceReport<RosterCostModifier>;
  readonly modifierApplicability: readonly RosterCostModifierApplicabilityReport[];
  readonly modifierGroupApplicability: readonly RosterCostModifierGroupApplicabilityReport[];
  readonly repeatReports: readonly RosterRepeatReport[];
}

export interface ExcludedRosterCostItem extends RosterCostItemBase {
  readonly status: "excluded";
  readonly issues: readonly RosterCostIssue[];
  readonly costTypes: readonly RosterCostType[];
  readonly typeId?: ObjectId;
  readonly value?: number;
}

export type RosterCostItem =
  | IncludedRosterCostItem
  | ExcludedRosterCostItem;

export interface RosterSelectionCostEvaluation {
  readonly occurrence: RosterSelection;
  readonly amount?: number;
  readonly status: RosterCostSelectionStatus;
  readonly choices: readonly RosterCostChoice[];
  readonly costs: readonly RosterCostItem[];
}

export interface RosterCostTotal {
  readonly typeId: ObjectId;
  readonly costType: RosterCostType;
  readonly value: number;
}

export interface RosterCostReport<
  Scope extends RosterCostScope = RosterCostScope,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly scope: Scope;
  readonly completeness: ValidationCompleteness;
  readonly selections: readonly RosterSelectionCostEvaluation[];
  readonly totals: readonly RosterCostTotal[];
}

export type RosterBaseCostReport = RosterCostReport<"base">;
export type RosterUnconditionalCostReport =
  RosterCostReport<"unconditionalModifiers">;
export type RosterSelectionConditionCostReport =
  RosterCostReport<"selectionConditions">;

interface EvaluationState {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly scope: RosterCostScope;
  readonly catalogueMatches: boolean;
  readonly choices: EvaluationChoiceIndex;
  readonly costReferences: ReadonlyMap<
    RosterCostSource,
    BattleScribeGraphReference
  >;
  readonly knownCostTypeIds: ReadonlySet<ObjectId>;
  readonly diagnostics: Diagnostic[];
  readonly selections: RosterSelectionCostEvaluation[];
  readonly totals: Map<RosterCostType, RosterCostTotal>;
  completeness: ValidationCompleteness;
}

interface CostDraft {
  readonly source: RosterCostSource;
  readonly typeId: ObjectId | undefined;
  readonly value: number | undefined;
  readonly costTypes: readonly RosterCostType[];
  readonly issues: RosterCostIssue[];
}

export function evaluateRosterBaseCosts(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Result<RosterBaseCostReport> {
  return evaluateRosterCostScope(roster, context, "base");
}

export function evaluateRosterCostsWithUnconditionalModifiers(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Result<RosterUnconditionalCostReport> {
  return evaluateRosterCostScope(roster, context, "unconditionalModifiers");
}

export function evaluateRosterCostsWithSelectionConditions(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Result<RosterSelectionConditionCostReport> {
  return evaluateRosterCostScope(roster, context, "selectionConditions");
}

function evaluateRosterCostScope<Scope extends RosterCostScope>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  scope: Scope,
): Result<RosterCostReport<Scope>> {
  const diagnostics: Diagnostic[] = [];
  const contextCatalogueKey = expectedCatalogueKey(context);
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const state: EvaluationState = {
    roster,
    context,
    scope,
    catalogueMatches,
    choices: indexEvaluationChoices(context),
    costReferences: indexCostReferences(context),
    knownCostTypeIds: costTypeIdsForContext(context),
    diagnostics,
    selections: [],
    totals: new Map(),
    completeness: "complete",
  };

  if (!catalogueMatches) {
    markIncomplete(
      state,
      diagnostic(
        "EVALUATION_CATALOGUE_CONTEXT_MISMATCH",
        "The roster belongs to a different catalogue context.",
        ["compatibility", "resolution"],
        {
          rosterCatalogueKey: roster.catalogue.key,
          contextCatalogueKey,
        },
      ),
    );
  }

  for (const force of roster.forces) {
    evaluateForce(force, state);
  }

  return success(
    {
      roster,
      context,
      scope,
      completeness: state.completeness,
      selections: state.selections,
      totals: [...state.totals.values()],
    },
    diagnostics,
  );
}

function evaluateForce(force: RosterForce, state: EvaluationState): void {
  for (const selection of force.selections) {
    evaluateSelection(selection, state);
  }
  for (const child of force.forces) {
    evaluateForce(child, state);
  }
}

function evaluateSelection(
  occurrence: RosterSelection,
  state: EvaluationState,
): void {
  const resolution = resolveEvaluationSelection(
    occurrence,
    state.choices,
    state.catalogueMatches,
  );
  const candidates = resolution.choices;
  const status = resolution.status;
  const choice = status === "resolved" ? candidates[0] : undefined;
  const amount = rosterSelectionAmount(occurrence);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const costs =
    choice === undefined || !validAmount
      ? []
      : evaluateChoiceCosts(occurrence, choice, amount, state);

  state.selections.push({
    occurrence,
    ...(validAmount ? { amount } : {}),
    status,
    choices: candidates,
    costs,
  });
  if (!validAmount) {
    markIncomplete(
      state,
      diagnostic(
        "EVALUATION_SELECTION_AMOUNT_INVALID",
        `Selection occurrence ${occurrence.id} has an invalid amount.`,
        ["compatibility"],
        { selectionId: occurrence.id, amount },
      ),
    );
  }
  if (status !== "resolved" && state.catalogueMatches) {
    markIncomplete(
      state,
      selectionDiagnostic(occurrence, status, state.choices.partial),
    );
  }
  if (choice !== undefined) {
    diagnoseModifiersWithoutBaseCost(occurrence, choice, state);
  }

  for (const child of occurrence.selections) {
    evaluateSelection(child, state);
  }
}

function evaluateChoiceCosts(
  occurrence: RosterSelection,
  choice: RosterCostChoice,
  amount: number,
  state: EvaluationState,
): readonly RosterCostItem[] {
  const drafts = choice.costs.map((source) => costDraft(source, state));
  const draftsByType = new Map<ObjectId, CostDraft[]>();
  for (const draft of drafts) {
    if (draft.typeId === undefined) {
      continue;
    }
    const matches = draftsByType.get(draft.typeId);
    if (matches === undefined) {
      draftsByType.set(draft.typeId, [draft]);
    } else {
      matches.push(draft);
    }
  }
  for (const matches of draftsByType.values()) {
    if (matches.length > 1) {
      for (const draft of matches) {
        draft.issues.push("duplicateOccurrenceType");
      }
    }
  }

  const diagnosedDuplicates = new Set<ObjectId>();
  return drafts.map((draft) => {
    emitCostIssueDiagnostics(
      occurrence,
      choice,
      draft,
      diagnosedDuplicates,
      state,
    );
    const costType = draft.costTypes[0];
    if (
      draft.issues.length === 0 &&
      draft.typeId !== undefined &&
      draft.value !== undefined &&
      costType !== undefined
    ) {
      const item: IncludedRosterCostItem = {
        status: "included",
        occurrence,
        choice,
        source: draft.source,
        typeId: draft.typeId,
        baseValue: draft.value,
        value: draft.value,
        amount,
        totalValue: draft.value * amount,
        costType,
        modifiers: modifiersForType(choice.modifiers, draft.typeId),
        modifierGroups: modifierGroupsForType(
          choice.modifierGroups,
          draft.typeId,
        ),
        modifierSequence: emptyModifierSequence(draft.value),
        modifierApplicability: [],
        modifierGroupApplicability: [],
        repeatReports: [],
      };
      const evaluated = evaluateIncludedCost(item, state);
      addTotal(evaluated, state);
      return evaluated;
    }
    return {
      status: "excluded",
      occurrence,
      choice,
      source: draft.source,
      issues: draft.issues,
      costTypes: draft.costTypes,
      ...(draft.typeId === undefined ? {} : { typeId: draft.typeId }),
      ...(draft.value === undefined ? {} : { value: draft.value }),
    };
  });
}

function costDraft(
  source: RosterCostSource,
  state: EvaluationState,
): CostDraft {
  const issues: RosterCostIssue[] = [];
  if (source.typeId === undefined) {
    issues.push("missingTypeId");
  }
  if (source.value === undefined) {
    issues.push("missingValue");
  }
  const targets =
    source.typeId === undefined
      ? []
      : (state.costReferences.get(source)?.targets ?? [])
          .filter((target) => target.kind === "costType")
          .map((target) => target.source as RosterCostType);
  if (source.typeId !== undefined && targets.length === 0) {
    issues.push("missingCostType");
  } else if (targets.length > 1) {
    issues.push("ambiguousCostType");
  }
  return {
    source,
    typeId: source.typeId,
    value: source.value,
    costTypes: targets,
    issues,
  };
}

function emitCostIssueDiagnostics(
  occurrence: RosterSelection,
  choice: RosterCostChoice,
  draft: CostDraft,
  diagnosedDuplicates: Set<ObjectId>,
  state: EvaluationState,
): void {
  for (const issue of draft.issues) {
    if (
      issue === "duplicateOccurrenceType" &&
      draft.typeId !== undefined &&
      diagnosedDuplicates.has(draft.typeId)
    ) {
      continue;
    }
    if (issue === "duplicateOccurrenceType" && draft.typeId !== undefined) {
      diagnosedDuplicates.add(draft.typeId);
    }
    markIncomplete(
      state,
      costIssueDiagnostic(occurrence, choice, draft, issue),
    );
  }
}

function addTotal(
  item: IncludedRosterCostItem,
  state: EvaluationState,
): void {
  const existing = state.totals.get(item.costType);
  state.totals.set(
    item.costType,
    existing === undefined
      ? {
          typeId: item.typeId,
          costType: item.costType,
          value: item.totalValue,
        }
      : { ...existing, value: existing.value + item.totalValue },
  );
}

function evaluateIncludedCost(
  item: IncludedRosterCostItem,
  state: EvaluationState,
): IncludedRosterCostItem {
  if (state.scope === "base") {
    diagnoseBaseCostModifiers(item, state);
    return item;
  }

  const applicability =
    state.scope === "selectionConditions"
      ? evaluateModifierApplicability(item, state)
      : [];
  const groupApplicability =
    state.scope === "selectionConditions"
      ? evaluateModifierGroupApplicability(item, state)
      : [];
  const groupedExecution =
    state.scope === "selectionConditions"
      ? collectRosterModifierGroupExecution<RosterCostModifier>(
          groupApplicability,
          item.typeId,
        )
      : { modifiers: [], entries: [] };
  const sequenceModifiers = [
    ...item.modifiers,
    ...groupedExecution.modifiers,
  ];
  const applicabilityByModifier = new Map<
    RosterCostModifier,
    {
      readonly status: "applicable" | "notApplicable" | "unresolved";
      readonly evaluated: boolean;
    }
  >();
  for (const report of applicability) {
    applicabilityByModifier.set(report.modifier, report);
  }
  for (const entry of groupedExecution.entries) {
    applicabilityByModifier.set(entry.modifier, entry);
  }
  const repeatEvaluation = evaluateRosterModifierRepeats(
    state.roster,
    state.context,
    item.occurrence,
    sequenceModifiers,
    {
      applicability: (modifier) =>
        applicabilityByModifier.get(modifier)?.status,
    },
  );
  state.diagnostics.push(...repeatEvaluation.diagnostics);
  const repeats = repeatEvaluation.ok ? repeatEvaluation.value : undefined;
  if (repeats?.completeness === "incomplete") {
    state.completeness = "incomplete";
  }
  const sequence = evaluateNumericModifierSequence(
    item.baseValue,
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
  if (!sequence.ok) {
    return item;
  }
  state.diagnostics.push(...sequence.diagnostics);
  if (sequence.value.completeness === "incomplete") {
    state.completeness = "incomplete";
  }
  if (state.scope === "unconditionalModifiers") {
    diagnoseModifierGroups(item, state);
  }
  return {
    ...item,
    value: sequence.value.value,
    totalValue: sequence.value.value * item.amount,
    modifierSequence: sequence.value,
    modifierApplicability: applicability,
    modifierGroupApplicability: groupApplicability,
    repeatReports: repeats?.repeats ?? [],
  };
}

function evaluateModifierApplicability(
  item: IncludedRosterCostItem,
  state: EvaluationState,
): readonly RosterCostModifierApplicabilityReport[] {
  const reports: RosterCostModifierApplicabilityReport[] = [];
  for (const modifier of item.modifiers) {
    const evaluated = evaluateRosterModifierApplicability(
      state.roster,
      state.context,
      item.occurrence,
      modifier,
      {
        effectiveCategories: effectiveRosterCategories(
          state.roster,
          state.context,
        ),
      },
    );
    state.diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      state.completeness = "incomplete";
      continue;
    }
    reports.push(evaluated.value);
    if (evaluated.value.completeness === "incomplete") {
      state.completeness = "incomplete";
    }
  }
  return reports;
}

function evaluateModifierGroupApplicability(
  item: IncludedRosterCostItem,
  state: EvaluationState,
): readonly RosterCostModifierGroupApplicabilityReport[] {
  const reports: RosterCostModifierGroupApplicabilityReport[] = [];
  for (const group of item.modifierGroups) {
    const evaluated = evaluateRosterModifierGroupApplicability(
      state.roster,
      state.context,
      item.occurrence,
      group,
      {
        effectiveCategories: effectiveRosterCategories(
          state.roster,
          state.context,
        ),
      },
    );
    state.diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      state.completeness = "incomplete";
      continue;
    }
    reports.push(evaluated.value);
    if (evaluated.value.completeness === "incomplete") {
      state.completeness = "incomplete";
    }
  }
  return reports;
}

function diagnoseBaseCostModifiers(
  item: IncludedRosterCostItem,
  state: EvaluationState,
): void {
  const count = item.modifiers.length + item.modifierGroups.length;
  const source = item.modifiers[0] ?? item.modifierGroups[0];
  if (count === 0 || source === undefined) {
    return;
  }
  markIncomplete(state, {
    ...diagnostic(
      "EVALUATION_UNSUPPORTED_SELECTION_MODIFIERS",
      `Selection occurrence ${item.occurrence.id} has cost modifier behavior that base cost evaluation does not apply.`,
      ["compatibility"],
      {
        occurrenceId: item.occurrence.id,
        definitionKey: item.occurrence.definition.key,
        typeId: item.typeId,
        count,
      },
    ),
    location: { source: source.source, path: source.path },
  });
}

function diagnoseModifierGroups(
  item: IncludedRosterCostItem,
  state: EvaluationState,
): void {
  const source = item.modifierGroups[0];
  if (source === undefined) {
    return;
  }
  markIncomplete(state, {
    ...diagnostic(
      "EVALUATION_COST_MODIFIER_GROUP_UNSUPPORTED",
      `Selection occurrence ${item.occurrence.id} has grouped modifiers for cost type ${item.typeId}.`,
      ["compatibility"],
      {
        occurrenceId: item.occurrence.id,
        definitionKey: item.occurrence.definition.key,
        typeId: item.typeId,
        count: item.modifierGroups.length,
      },
    ),
    location: { source: source.source, path: source.path },
  });
}

function diagnoseModifiersWithoutBaseCost(
  occurrence: RosterSelection,
  choice: RosterCostChoice,
  state: EvaluationState,
): void {
  const baseTypes = new Set(
    choice.costs.flatMap((cost) =>
      cost.typeId === undefined ? [] : [cost.typeId],
    ),
  );
  const modifiers = choice.modifiers.filter(
    (modifier) =>
      modifier.field !== undefined &&
      state.knownCostTypeIds.has(modifier.field as ObjectId) &&
      !baseTypes.has(modifier.field as ObjectId),
  );
  const groups = choice.modifierGroups.filter((group) =>
    [...state.knownCostTypeIds].some(
      (typeId) =>
        !baseTypes.has(typeId) && modifierGroupContainsType(group, typeId),
    ),
  );
  const source = modifiers[0] ?? groups[0];
  if (source === undefined) {
    return;
  }
  markIncomplete(state, {
    ...diagnostic(
      "EVALUATION_COST_MODIFIER_BASE_MISSING",
      `Selection occurrence ${occurrence.id} has a cost modifier without a corresponding base cost.`,
      ["compatibility"],
      {
        occurrenceId: occurrence.id,
        definitionKey: occurrence.definition.key,
        modifiers: modifiers.length,
        modifierGroups: groups.length,
      },
    ),
    location: { source: source.source, path: source.path },
  });
}

function modifiersForType(
  modifiers: readonly RosterCostModifier[],
  typeId: ObjectId,
): readonly RosterCostModifier[] {
  return modifiers.filter((modifier) => modifier.field === typeId);
}

function modifierGroupsForType(
  groups: readonly RosterCostModifierGroup[],
  typeId: ObjectId,
): readonly RosterCostModifierGroup[] {
  return groups.filter((group) => modifierGroupContainsType(group, typeId));
}

function modifierGroupContainsType(
  group: RosterCostModifierGroup,
  typeId: ObjectId,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === typeId) ||
    group.modifierGroups.some((child) =>
      modifierGroupContainsType(child, typeId),
    )
  );
}

function emptyModifierSequence(
  value: number,
): NumericModifierSequenceReport<RosterCostModifier> {
  return {
    baseValue: value,
    value,
    completeness: "complete",
    steps: [],
  };
}

function indexCostReferences(
  context: BattleScribeCatalogueContext,
): ReadonlyMap<RosterCostSource, BattleScribeGraphReference> {
  const references = new Map<RosterCostSource, BattleScribeGraphReference>();
  for (const reference of context.graph.references) {
    if (reference.kind === "costType") {
      references.set(reference.source as RosterCostSource, reference);
    }
  }
  return references;
}

function costTypeIdsForContext(
  context: BattleScribeCatalogueContext,
): ReadonlySet<ObjectId> {
  const documents = new Set([context.document]);
  for (const reference of context.graph.references) {
    if (
      reference.kind === "catalogueGameSystem" &&
      reference.sourceDocument === context.document
    ) {
      for (const target of reference.targets) {
        documents.add(target.document);
      }
    }
  }
  return new Set(
    context.graph.objects.flatMap((object) =>
      object.kind === "costType" && documents.has(object.document)
        ? [object.id]
        : [],
    ),
  );
}

function selectionDiagnostic(
  occurrence: RosterSelection,
  status: Exclude<RosterCostSelectionStatus, "resolved">,
  partial: boolean,
): Diagnostic {
  const code =
    status === "ambiguous"
      ? "EVALUATION_SELECTION_AMBIGUOUS"
      : status === "unavailable"
        ? "EVALUATION_SELECTION_NOT_AVAILABLE"
        : "EVALUATION_SELECTION_UNRESOLVED";
  return diagnostic(
    code,
    `Selection occurrence ${occurrence.id} is ${status} for base cost evaluation.`,
    ["compatibility", "resolution"],
    {
      occurrenceId: occurrence.id,
      definitionKey: occurrence.definition.key,
      reason:
        status === "unresolved" && partial
          ? "partialMaterialization"
          : status,
    },
  );
}

function costIssueDiagnostic(
  occurrence: RosterSelection,
  choice: RosterCostChoice,
  draft: CostDraft,
  issue: RosterCostIssue,
): Diagnostic {
  const descriptions: Record<RosterCostIssue, readonly [string, string]> = {
    missingTypeId: [
      "EVALUATION_COST_MISSING_TYPE_ID",
      "A projected cost has no type ID.",
    ],
    missingValue: [
      "EVALUATION_COST_MISSING_VALUE",
      "A projected cost has no numeric value.",
    ],
    missingCostType: [
      "EVALUATION_COST_TYPE_MISSING",
      `Cost type ${draft.typeId} is missing.`,
    ],
    ambiguousCostType: [
      "EVALUATION_COST_TYPE_AMBIGUOUS",
      `Cost type ${draft.typeId} is ambiguous.`,
    ],
    duplicateOccurrenceType: [
      "EVALUATION_DUPLICATE_OCCURRENCE_COST_TYPE",
      `Selection occurrence ${occurrence.id} has more than one base cost for type ${draft.typeId}.`,
    ],
  };
  const [code, message] = descriptions[issue];
  return {
    ...diagnostic(
      code,
      message,
      issue === "missingCostType" || issue === "ambiguousCostType"
        ? ["resolution"]
        : ["compatibility"],
      {
        occurrenceId: occurrence.id,
        definitionKey: occurrence.definition.key,
        choiceKind: choice.kind,
        typeId: draft.typeId,
        candidates: draft.costTypes.length,
        issue,
      },
    ),
    location: {
      source: draft.source.source,
      path: [
        ...draft.source.path,
        issue === "missingValue" ? "@value" : "@typeId",
      ],
    },
  };
}

function diagnostic(
  code: string,
  message: string,
  impacts: Diagnostic["impacts"],
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return { code, message, severity: "warning", impacts, details };
}

function markIncomplete(
  state: EvaluationState,
  value: Diagnostic,
): void {
  state.completeness = "incomplete";
  state.diagnostics.push(value);
}
