/**
 * Immutable presentation projection for the live roster workspace.
 *
 * Evaluation stays in the headless packages and session adapter. This web-layer
 * model folds their reports into the reader-facing rules that several upcoming
 * layout checkpoints need to share without teaching React components how to
 * reinterpret evaluator output.
 */

import type {
  RosterSelectionConditionCostReport,
  RosterSelectionCostEvaluation,
  SupportedRosterValidationFinding,
  SupportedRosterValidationStatusCounts,
} from "@rosterforge/evaluation";
import type {
  Diagnostic,
  Result,
  ValidationCompleteness,
  ValidationValidity,
} from "@rosterforge/foundation";
import {
  rosterSelectionsAmount,
  type RosterForce,
  type RosterSelection,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";

import {
  localRosterRootChoiceGroups,
  localRosterSelectionCount,
  type LocalRosterRootChoiceInspection,
  type LocalRosterRootChoiceState,
  type LocalRosterSession,
  type LocalRosterSupportedValidationInspection,
} from "./roster-session.js";

export type RosterWorkspaceSection = "configuration" | "army";

export interface RosterWorkspaceCost {
  readonly typeId: string;
  readonly name: string;
  readonly value: number;
}

export type RosterWorkspaceCostSummary =
  | {
      readonly available: false;
      readonly activeTotals: readonly [];
      readonly zeroTotals: readonly [];
      readonly excludedCount: 0;
      readonly unresolvedSelectionCount: 0;
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly available: true;
      readonly completeness: ValidationCompleteness;
      readonly activeTotals: readonly RosterWorkspaceCost[];
      readonly zeroTotals: readonly RosterWorkspaceCost[];
      readonly excludedCount: number;
      readonly unresolvedSelectionCount: number;
      readonly diagnostics: readonly Diagnostic[];
    };

export type RosterWorkspaceSelectionCosts =
  | {
      readonly available: false;
      readonly totals: readonly [];
      readonly excludedCount: 0;
      readonly unresolvedSelectionCount: 0;
    }
  | {
      readonly available: true;
      readonly totals: readonly RosterWorkspaceCost[];
      readonly excludedCount: number;
      readonly unresolvedSelectionCount: number;
    };

export type RosterWorkspaceValidationSummary =
  | {
      readonly available: false;
      readonly issueCount: 0;
      readonly attentionSelectionIds: ReadonlySet<string>;
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly available: true;
      readonly validity: ValidationValidity;
      readonly completeness: ValidationCompleteness;
      readonly statusCounts: SupportedRosterValidationStatusCounts;
      readonly issueCount: number;
      readonly structuralViolationCount: number;
      readonly constraintViolationCount: number;
      readonly attentionSelectionIds: ReadonlySet<string>;
      readonly diagnostics: readonly Diagnostic[];
    };

export type RosterWorkspaceRootChoices =
  | {
      readonly available: false;
      readonly choiceCount: 0;
      readonly groups: readonly [];
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly available: true;
      readonly completeness: ValidationCompleteness;
      readonly choiceCount: number;
      readonly groups: readonly RosterWorkspaceRootChoiceGroup[];
      readonly diagnostics: readonly Diagnostic[];
    };

export interface RosterWorkspaceRootChoiceGroup {
  readonly key: string;
  readonly name: string;
  readonly section: RosterWorkspaceSection;
  readonly choices: readonly LocalRosterRootChoiceState[];
}

export interface RosterWorkspaceSelection {
  readonly occurrence: RosterSelection;
  readonly section: RosterWorkspaceSection;
  readonly active: boolean;
  readonly containsActiveSelection: boolean;
  readonly attention: boolean;
  readonly containsAttention: boolean;
  readonly costs: RosterWorkspaceSelectionCosts;
  readonly selections: readonly RosterWorkspaceSelection[];
}

export interface RosterWorkspaceSourceReports {
  readonly rootChoices: Result<LocalRosterRootChoiceInspection>;
  readonly costs: Result<RosterSelectionConditionCostReport>;
  readonly validation: Result<LocalRosterSupportedValidationInspection>;
}

export interface RosterWorkspaceViewModel {
  readonly rosterId: string;
  readonly name: string;
  readonly catalogueName: string;
  readonly forceCount: number;
  readonly selectionCount: number;
  readonly topLevelSelectionCount: number;
  readonly primaryForce?: RosterForce;
  readonly activeSelectionId?: SelectionOccurrenceId;
  readonly costs: RosterWorkspaceCostSummary;
  readonly validation: RosterWorkspaceValidationSummary;
  readonly rootChoices: RosterWorkspaceRootChoices;
  readonly selections: {
    readonly ordered: readonly RosterWorkspaceSelection[];
    readonly configuration: readonly RosterWorkspaceSelection[];
    readonly army: readonly RosterWorkspaceSelection[];
  };
  readonly reports: RosterWorkspaceSourceReports;
}

/**
 * Projects one immutable session and its same-snapshot reports for presentation.
 *
 * The projection does not evaluate, mutate, filter, or legalize the roster. It
 * preserves report and occurrence identity, and derives only stable UI policy:
 * active versus zero headline costs, actionable violation attention,
 * configuration versus army roots, recursive unit totals, and optional active
 * selection ancestry. Callers can therefore change layout without duplicating
 * those rules or accidentally composing reports from different sessions.
 *
 * This allocates one presentation node and one small cost accumulator per
 * selection. Descendant costs are folded into each ancestor so later unit cards
 * can read one total; React memoizes the result by immutable session, keeping
 * unrelated autosave and action-state renders off this roster-sized path.
 */
export function createRosterWorkspaceViewModel(
  session: LocalRosterSession,
  reports: RosterWorkspaceSourceReports,
  activeSelectionId?: SelectionOccurrenceId,
): RosterWorkspaceViewModel {
  const primaryForce = session.roster.forces[0];
  const costs = workspaceCostSummary(reports.costs);
  const validation = workspaceValidationSummary(reports.validation);
  const sectionByChoice = rootChoiceSectionIndex(session);
  const costEvaluationBySelection = reports.costs.ok
    ? new Map(
        reports.costs.value.selections.map((evaluation) => [
          evaluation.occurrence.id,
          evaluation,
        ]),
      )
    : undefined;
  const ordered = (primaryForce?.selections ?? []).map((selection) =>
    workspaceSelection(
      selection,
      rootSelectionSection(session, selection, sectionByChoice),
      validation.attentionSelectionIds,
      costEvaluationBySelection,
      activeSelectionId,
    ),
  );
  return {
    rosterId: session.roster.id,
    name: session.roster.name,
    catalogueName: session.catalogue.name,
    forceCount: session.roster.forces.length,
    selectionCount: localRosterSelectionCount(session),
    topLevelSelectionCount:
      primaryForce === undefined
        ? 0
        : rosterSelectionsAmount(primaryForce.selections),
    ...(primaryForce === undefined ? {} : { primaryForce }),
    ...(activeSelectionId === undefined ? {} : { activeSelectionId }),
    costs,
    validation,
    rootChoices: workspaceRootChoices(reports.rootChoices),
    selections: {
      ordered,
      configuration: ordered.filter(
        ({ section }) => section === "configuration",
      ),
      army: ordered.filter(({ section }) => section === "army"),
    },
    reports,
  };
}

function workspaceCostSummary(
  result: Result<RosterSelectionConditionCostReport>,
): RosterWorkspaceCostSummary {
  if (!result.ok) {
    return {
      available: false,
      activeTotals: [],
      zeroTotals: [],
      excludedCount: 0,
      unresolvedSelectionCount: 0,
      diagnostics: result.diagnostics,
    };
  }
  const totals = result.value.totals.map(workspaceCost);
  // Community catalogues attach many campaign bookkeeping fields to every
  // unit. Keep their zero totals available without promoting them beside
  // matched-play points or inventing a game-mode filter that drops source data.
  return {
    available: true,
    completeness: result.value.completeness,
    activeTotals: totals.filter(({ value }) => value !== 0),
    zeroTotals: totals.filter(({ value }) => value === 0),
    excludedCount: result.value.selections.reduce(
      (total, selection) =>
        total +
        selection.costs.filter(({ status }) => status === "excluded").length,
      0,
    ),
    unresolvedSelectionCount: result.value.selections.filter(
      ({ status }) => status !== "resolved",
    ).length,
    diagnostics: result.diagnostics,
  };
}

function workspaceValidationSummary(
  result: Result<LocalRosterSupportedValidationInspection>,
): RosterWorkspaceValidationSummary {
  if (!result.ok) {
    return {
      available: false,
      issueCount: 0,
      attentionSelectionIds: new Set(),
      diagnostics: result.diagnostics,
    };
  }
  const report = result.value.status;
  const violated = report.findings.filter(
    ({ status }) => status === "violated",
  );
  return {
    available: true,
    validity: report.validity,
    completeness: report.completeness,
    statusCounts: report.statusCounts,
    issueCount: report.statusCounts.violated,
    structuralViolationCount: violated.filter(
      ({ kind }) => kind === "structural",
    ).length,
    constraintViolationCount: violated.filter(
      ({ kind }) => kind !== "structural",
    ).length,
    attentionSelectionIds: supportedValidationSelectionIds(report.findings),
    diagnostics: result.diagnostics,
  };
}

function workspaceRootChoices(
  result: Result<LocalRosterRootChoiceInspection>,
): RosterWorkspaceRootChoices {
  if (!result.ok) {
    return {
      available: false,
      choiceCount: 0,
      groups: [],
      diagnostics: result.diagnostics,
    };
  }
  const groups = result.value.groups.map((group) => ({
    key: group.key,
    name: group.name,
    section: rootGroupSection(group.name),
    choices: group.choices,
  }));
  return {
    available: true,
    completeness: result.value.completeness,
    choiceCount: groups.reduce(
      (total, { choices }) => total + choices.length,
      0,
    ),
    groups,
    diagnostics: result.diagnostics,
  };
}

function workspaceSelection(
  occurrence: RosterSelection,
  section: RosterWorkspaceSection,
  attentionSelectionIds: ReadonlySet<string>,
  costEvaluationBySelection:
    | ReadonlyMap<SelectionOccurrenceId, RosterSelectionCostEvaluation>
    | undefined,
  activeSelectionId: SelectionOccurrenceId | undefined,
): RosterWorkspaceSelection {
  const selections = occurrence.selections.map((selection) =>
    workspaceSelection(
      selection,
      section,
      attentionSelectionIds,
      costEvaluationBySelection,
      activeSelectionId,
    ),
  );
  const active = occurrence.id === activeSelectionId;
  const attention = attentionSelectionIds.has(occurrence.id);
  return {
    occurrence,
    section,
    active,
    containsActiveSelection:
      active ||
      selections.some(
        ({ containsActiveSelection }) => containsActiveSelection,
      ),
    attention,
    containsAttention:
      attention || selections.some(({ containsAttention }) => containsAttention),
    costs: workspaceSelectionCosts(
      occurrence,
      selections,
      costEvaluationBySelection,
    ),
    selections,
  };
}

function workspaceSelectionCosts(
  occurrence: RosterSelection,
  selections: readonly RosterWorkspaceSelection[],
  costEvaluationBySelection:
    | ReadonlyMap<SelectionOccurrenceId, RosterSelectionCostEvaluation>
    | undefined,
): RosterWorkspaceSelectionCosts {
  if (costEvaluationBySelection === undefined) {
    return {
      available: false,
      totals: [],
      excludedCount: 0,
      unresolvedSelectionCount: 0,
    };
  }
  const evaluation = costEvaluationBySelection.get(occurrence.id);
  const totals = new Map<string, RosterWorkspaceCost>();
  if (evaluation !== undefined) {
    for (const cost of evaluation.costs) {
      if (cost.status !== "included") continue;
      addWorkspaceCost(totals, {
        typeId: cost.typeId,
        name: cost.costType.name ?? cost.typeId,
        value: cost.totalValue,
      });
    }
  }
  for (const selection of selections) {
    if (!selection.costs.available) continue;
    for (const cost of selection.costs.totals) addWorkspaceCost(totals, cost);
  }
  return {
    available: true,
    totals: [...totals.values()],
    excludedCount:
      (evaluation?.costs.filter(({ status }) => status === "excluded").length ??
        0) +
      selections.reduce(
        (total, selection) => total + selection.costs.excludedCount,
        0,
      ),
    unresolvedSelectionCount:
      (evaluation === undefined || evaluation.status !== "resolved" ? 1 : 0) +
      selections.reduce(
        (total, selection) => total + selection.costs.unresolvedSelectionCount,
        0,
      ),
  };
}

function addWorkspaceCost(
  totals: Map<string, RosterWorkspaceCost>,
  cost: RosterWorkspaceCost,
): void {
  const current = totals.get(cost.typeId);
  totals.set(
    cost.typeId,
    current === undefined
      ? cost
      : { ...current, value: current.value + cost.value },
  );
}

function workspaceCost(
  total: RosterSelectionConditionCostReport["totals"][number],
): RosterWorkspaceCost {
  return {
    typeId: total.typeId,
    name: total.costType.name ?? total.typeId,
    value: total.value,
  };
}

function rootChoiceSectionIndex(
  session: LocalRosterSession,
): ReadonlyMap<BattleScribeRosterSelectionChoice, RosterWorkspaceSection> {
  const sections = new Map<
    BattleScribeRosterSelectionChoice,
    RosterWorkspaceSection
  >();
  for (const group of localRosterRootChoiceGroups(session.catalogue)) {
    const section = rootGroupSection(group.name);
    for (const choice of group.choices) {
      sections.set(choice.materialized, section);
    }
  }
  return sections;
}

function rootSelectionSection(
  session: LocalRosterSession,
  selection: RosterSelection,
  sectionByChoice: ReadonlyMap<
    BattleScribeRosterSelectionChoice,
    RosterWorkspaceSection
  >,
): RosterWorkspaceSection {
  const choice = session.selectionChoices.get(selection.id);
  return choice === undefined ? "army" : sectionByChoice.get(choice) ?? "army";
}

function rootGroupSection(name: string): RosterWorkspaceSection {
  // This centralises the exact source category already used by the browser.
  // Unknown and uncategorized roots stay in the army section rather than being
  // hidden or guessed to be configuration.
  return name === "Configuration" ? "configuration" : "army";
}

function supportedValidationSelectionIds(
  findings: readonly SupportedRosterValidationFinding[],
): ReadonlySet<string> {
  const selectionIds = new Set<string>();
  for (const finding of findings) {
    // Unresolved behavior remains visible in the checks, but it is not an
    // actionable violation and must not pull a whole subtree into attention.
    if (finding.status !== "violated") continue;
    if (finding.kind === "selectionConstraint") {
      selectionIds.add(finding.report.owner.id);
    } else if (
      finding.kind === "structural" &&
      finding.report.kind !== "root"
    ) {
      selectionIds.add(finding.report.owner.id);
    }
  }
  return selectionIds;
}
