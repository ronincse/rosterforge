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
  inspectLocalRosterSelectionCategories,
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
  /** Complete, finite maximum evaluated for this exact cost type. */
  readonly limit?: number;
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

export type RosterWorkspaceHeaderReport = "costs" | "checks";

/**
 * Combined completeness of the two reports the player header presents.
 *
 * The header carries one badge where the separate cost and validation cards
 * each carried their own, so the fold has to be conservative. A report that is
 * *unavailable* has established completeness no more than one that reported
 * `incomplete`, and calling either `complete` is exactly what `AGENTS.md`
 * forbids. `incomplete` therefore names every report that fell short, and
 * `completeness` is `complete` only when that list is empty.
 *
 * Root choices are deliberately excluded: their completeness describes the
 * add-units browser, not the two numbers a player reads above the list.
 */
export interface RosterWorkspaceHeaderSummary {
  readonly completeness: ValidationCompleteness;
  readonly incomplete: readonly RosterWorkspaceHeaderReport[];
}

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
  /** Present on top-level selections only; nested children inherit nothing. */
  readonly role?: RosterWorkspaceRole;
  readonly active: boolean;
  readonly containsActiveSelection: boolean;
  readonly attention: boolean;
  readonly containsAttention: boolean;
  readonly costs: RosterWorkspaceSelectionCosts;
  readonly selections: readonly RosterWorkspaceSelection[];
}

/**
 * The battlefield role a top-level selection is filed under.
 *
 * BattleScribe's primary category *is* this concept: the BSData wiki calls it
 * "the category in which that entry will be visible in Roster Editor",
 * singular, and `packages/evaluation/src/categories.ts` records the corpus
 * evidence behind that reading. Grouping therefore uses the **effective**
 * primary rather than the declared category link, because a modifier can move
 * an entry between roles.
 *
 * `known` is false when the evaluator withheld the effective primary — it does
 * that whenever a `set-primary` or `unset-primary` operation applied, since
 * those are not executed. Such a selection is filed under `unassigned` and says
 * so, rather than being guessed into a role it may not occupy.
 */
export interface RosterWorkspaceRole {
  /** A category id, or the literals `configuration` and `unassigned`. */
  readonly key: string;
  readonly name: string;
  /** Catalogue order; configuration sorts first and unassigned last. */
  readonly order: number;
  readonly known: boolean;
}

/**
 * One rendered group of top-level selections sharing a battlefield role.
 *
 * `amount` is a summed occurrence amount, not a node count — the same measure
 * as `topLevelSelectionCount`, which all groups add up to. Counting nodes would
 * disagree with the pane heading whenever a unit is taken more than once.
 */
export interface RosterWorkspaceSelectionGroup {
  readonly role: RosterWorkspaceRole;
  readonly selections: readonly RosterWorkspaceSelection[];
  readonly amount: number;
}

/**
 * Top-level selections, both as one ordered list and grouped by role.
 *
 * `groups` partitions `ordered` and preserves its relative order inside each
 * group, so a group renders source order without re-sorting. Empty roles are
 * absent rather than present-and-empty.
 */
export interface RosterWorkspaceSelections {
  readonly ordered: readonly RosterWorkspaceSelection[];
  readonly groups: readonly RosterWorkspaceSelectionGroup[];
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
  readonly header: RosterWorkspaceHeaderSummary;
  readonly rootChoices: RosterWorkspaceRootChoices;
  readonly selections: RosterWorkspaceSelections;
  readonly reports: RosterWorkspaceSourceReports;
}

/**
 * Projects one immutable session and its same-snapshot reports for presentation.
 *
 * The projection does not evaluate, mutate, filter, or legalize the roster. It
 * preserves report and occurrence identity, and derives only stable UI policy:
 * active versus zero headline costs, actionable violation attention,
 * configuration versus army roots, recursive unit totals, the conservative
 * header completeness fold, and optional active selection ancestry. Callers can
 * therefore change layout without duplicating those rules or accidentally
 * composing reports from different sessions.
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
  const costs = workspaceCostSummary(
    reports.costs,
    reports.validation,
    workspaceCostTypeOrder(session),
  );
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
  const categoryOrder = catalogueCategoryOrder(session);
  const ordered = (primaryForce?.selections ?? []).map((selection) => {
    const section = rootSelectionSection(session, selection, sectionByChoice);
    return {
      ...workspaceSelection(
        selection,
        section,
        validation.attentionSelectionIds,
        costEvaluationBySelection,
        activeSelectionId,
      ),
      role: topLevelRole(session, selection, section, categoryOrder),
    };
  });
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
    header: workspaceHeaderSummary(costs, validation),
    rootChoices: workspaceRootChoices(reports.rootChoices),
    selections: workspaceSelections(ordered),
    reports,
  };
}

function workspaceCostSummary(
  result: Result<RosterSelectionConditionCostReport>,
  validation: Result<LocalRosterSupportedValidationInspection>,
  costTypeOrder: ReadonlyMap<string, number>,
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
  const limits = workspaceCostLimits(validation);
  const totals: RosterWorkspaceCost[] = result.value.totals.map((total) => {
    const cost = workspaceCost(total);
    const limited = limits.get(cost.typeId);
    return limited === undefined ? cost : { ...cost, limit: limited.limit };
  });
  const projectedTypes = new Set(totals.map(({ typeId }) => typeId));
  for (const limited of limits.values()) {
    if (!projectedTypes.has(limited.typeId)) totals.push(limited);
  }
  // The evaluator preserves first-selected occurrence order, while an empty
  // roster receives limit-only totals in force-constraint order. Neither is a
  // stable headline policy. Restore the source-authored cost-type order so the
  // same exact type leads before and after the first unit is added.
  totals.sort(
    (left, right) =>
      (costTypeOrder.get(left.typeId) ?? Number.MAX_SAFE_INTEGER) -
      (costTypeOrder.get(right.typeId) ?? Number.MAX_SAFE_INTEGER),
  );
  // Community catalogues attach many campaign bookkeeping fields to every
  // unit. Keep their zero totals available without promoting them beside
  // matched-play points or inventing a game-mode filter that drops source data.
  return {
    available: true,
    completeness: result.value.completeness,
    // A limit-bearing total is active even at zero: 0 / 2,000 pts is the
    // starting state a matched-play player needs, not bookkeeping to collapse.
    activeTotals: totals.filter(
      ({ value, limit }) => value !== 0 || limit !== undefined,
    ),
    zeroTotals: totals.filter(
      ({ value, limit }) => value === 0 && limit === undefined,
    ),
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

/**
 * Orders cost types by their declarations in the reachable game-system data.
 *
 * Cost names are presentation strings and cannot identify matched-play points.
 * The game system declares its currencies in intended display order, so using
 * exact ids from that order keeps the primary capacity stable without guessing
 * from labels such as `pts` or from whichever selection was added first.
 */
function workspaceCostTypeOrder(
  session: LocalRosterSession,
): ReadonlyMap<string, number> {
  const context = session.catalogue.context;
  const reachable =
    context.graph.reachableDocumentsByDocument.get(context.document) ??
    new Set([context.document]);
  const documents = [...reachable].sort((left, right) => {
    const leftOrder = left.metadata.kind === "gameSystem" ? 0 : 1;
    const rightOrder = right.metadata.kind === "gameSystem" ? 0 : 1;
    return leftOrder - rightOrder;
  });
  const order = new Map<string, number>();
  let index = 0;
  for (const document of documents) {
    for (const costType of document.projection.costTypes) {
      if (costType.id !== undefined && !order.has(costType.id)) {
        order.set(costType.id, index++);
      }
    }
  }
  return order;
}

/**
 * Finds the tightest complete maximum for every evaluated force-cost type.
 *
 * Force constraints are the authoritative points-limit source. Names such as
 * `pts` are catalogue presentation and cannot safely identify matched-play
 * points. Incomplete, unbounded, and non-cost constraints remain in Checks and
 * are deliberately not promoted into a confident player-facing maximum.
 */
function workspaceCostLimits(
  validation: Result<LocalRosterSupportedValidationInspection>,
): ReadonlyMap<string, RosterWorkspaceCost & { readonly limit: number }> {
  const limits = new Map<
    string,
    RosterWorkspaceCost & { readonly limit: number }
  >();
  if (!validation.ok) return limits;

  for (const force of validation.value.constraints.forces.forces) {
    for (const constraint of force.constraints) {
      const evaluation = constraint.costEvaluation;
      const limit = constraint.limit;
      if (
        constraint.constraintType !== "max" ||
        constraint.completeness !== "complete" ||
        evaluation?.exact !== true ||
        limit === undefined ||
        !Number.isFinite(limit) ||
        limit < 0
      ) {
        continue;
      }
      const current = limits.get(evaluation.typeId);
      if (current === undefined || limit < current.limit) {
        limits.set(evaluation.typeId, {
          typeId: evaluation.typeId,
          name: evaluation.costType.name ?? evaluation.typeId,
          value: evaluation.value,
          limit,
        });
      }
    }
  }
  return limits;
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

const configurationRole: RosterWorkspaceRole = {
  key: "configuration",
  name: "Configuration",
  order: -1,
  known: true,
};

const unassignedRole: RosterWorkspaceRole = {
  key: "unassigned",
  name: "Other",
  order: Number.MAX_SAFE_INTEGER,
  known: false,
};

/**
 * Catalogue definition order for every named category, used to sort roles.
 *
 * Built once per projection rather than per selection. Sorting by this rather
 * than by name keeps an army list reading in the order the catalogue intends —
 * characters before battleline before transports — instead of alphabetically.
 */
function catalogueCategoryOrder(
  session: LocalRosterSession,
): ReadonlyMap<string, number> {
  const order = new Map<string, number>();
  let index = 0;
  for (const definition of session.catalogue.context.categories.definitions) {
    const id = definition.source.id;
    if (id !== undefined && !order.has(id)) order.set(id, index++);
  }
  return order;
}

/**
 * Files one top-level selection under a battlefield role.
 *
 * Configuration roots keep their existing classification and lead the list;
 * everything else is filed under its effective primary category. A selection
 * whose primary the evaluator withheld, or which declares no primary at all,
 * lands in `unassigned` rather than being guessed into a role.
 *
 * ## What this costs, because it is on the per-edit path
 *
 * One category evaluation per **top-level** selection; nested children are
 * never inspected. The two expensive pieces are already memoized —
 * `indexEvaluationChoices` by catalogue context and `rosterSelectionLocations`
 * by roster identity — so neither is rebuilt here.
 *
 * What is *not* memoized is the per-call inbound-contribution scan, which walks
 * every location in the roster once per evaluation, and the category-name map
 * that `inspectLocalRosterSelectionCategories` rebuilds over every catalogue
 * definition. The added work is therefore roughly
 * `topLevel × (allSelections + categoryDefinitions)` — about 4,900 iterations
 * for a fifteen-unit Death Guard roster at 190 categories. Small today, but
 * superlinear in roster size, which is the exact shape that has caused
 * regressions here before.
 *
 * If it ever matters, the fix is a batched primary-category index built once
 * per roster beside `effectiveRosterCategories`, which is already whole-roster
 * and memoized. Do not reach for per-call caching instead.
 */
function topLevelRole(
  session: LocalRosterSession,
  selection: RosterSelection,
  section: RosterWorkspaceSection,
  categoryOrder: ReadonlyMap<string, number>,
): RosterWorkspaceRole {
  if (section === "configuration") return configurationRole;
  const inspection = inspectLocalRosterSelectionCategories(
    session,
    selection.id,
  );
  if (!inspection.ok) return unassignedRole;
  // `primaryCategories` is absent exactly when a set-primary or unset-primary
  // operation applied, because those are not executed. Absent means unknown,
  // never "no primary".
  if (inspection.value.report.primaryCategories === undefined) {
    return unassignedRole;
  }
  const primary = inspection.value.categories?.find(({ primary }) => primary);
  if (primary === undefined) return { ...unassignedRole, known: true };
  return {
    key: primary.id,
    name: primary.name,
    order: categoryOrder.get(primary.id) ?? Number.MAX_SAFE_INTEGER - 1,
    known: true,
  };
}

function workspaceSelections(
  ordered: readonly RosterWorkspaceSelection[],
): RosterWorkspaceSelections {
  const byKey = new Map<string, RosterWorkspaceSelection[]>();
  const roles = new Map<string, RosterWorkspaceRole>();
  for (const selection of ordered) {
    const role = selection.role ?? unassignedRole;
    roles.set(role.key, role);
    const bucket = byKey.get(role.key);
    if (bucket === undefined) byKey.set(role.key, [selection]);
    else bucket.push(selection);
  }
  const groups = [...byKey.entries()].map(([key, selections]) => ({
    role: roles.get(key) ?? unassignedRole,
    selections,
    amount: rosterSelectionsAmount(
      selections.map(({ occurrence }) => occurrence),
    ),
  }));
  // Insertion order would be roster order, which puts whichever unit was added
  // first at the top. Sort by catalogue order so the list reads the same way
  // every time; ties keep insertion order because sort is stable.
  groups.sort((left, right) => left.role.order - right.role.order);
  return { ordered, groups };
}

function workspaceHeaderSummary(
  costs: RosterWorkspaceCostSummary,
  validation: RosterWorkspaceValidationSummary,
): RosterWorkspaceHeaderSummary {
  const incomplete: RosterWorkspaceHeaderReport[] = [];
  if (!costs.available || costs.completeness === "incomplete") {
    incomplete.push("costs");
  }
  if (!validation.available || validation.completeness === "incomplete") {
    incomplete.push("checks");
  }
  return {
    completeness: incomplete.length === 0 ? "complete" : "incomplete",
    incomplete,
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
