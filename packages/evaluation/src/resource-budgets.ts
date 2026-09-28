// Compares configured limits with the existing evaluated-cost report. This is
// downstream of conditions and costs; it never feeds values back into limits.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import type { Diagnostic, ValidationCompleteness } from "@rosterforge/foundation";
import type { Roster } from "@rosterforge/roster-model";
import { evaluateRosterCostsWithSelectionConditions, type RosterSelectionConditionCostReport } from "./costs.js";
import { queryCostConstraint } from "./cost-constraint-query.js";
import { resolveRosterResourceLimits, type EffectiveResourceLimit } from "./resource-limits.js";

export interface RosterResourceBudget {
  readonly resource: EffectiveResourceLimit;
  readonly value: number;
  readonly exact: boolean;
  readonly status: "satisfied" | "violated" | "unresolved";
  readonly active: boolean;
  readonly contributions: readonly { readonly selectionName: string; readonly value: number }[];
}
export interface RosterResourceBudgetsReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly resources: readonly RosterResourceBudget[];
  readonly completeness: ValidationCompleteness;
  readonly diagnostics: readonly Diagnostic[];
}
/** Uses modified totals and currency-specific uncertainty. Unknown signed sums
 * yield unresolved, even if their provisional subtotal exceeds a known cap.
 * The optional cost report must belong to this exact immutable context. */
export function inspectRosterResourceBudgets(roster: Roster, context: BattleScribeCatalogueContext,
  evaluated?: RosterSelectionConditionCostReport): RosterResourceBudgetsReport {
  const limits = resolveRosterResourceLimits(roster, context);
  const result = evaluated === undefined ? evaluateRosterCostsWithSelectionConditions(roster, context) : undefined;
  const report = evaluated ?? (result?.ok ? result.value : undefined);
  const matches = report?.roster === roster && report.context === context && report.scope === "selectionConditions";
  const occurrences = new Set(report?.selections.map(item => item.occurrence) ?? []);
  const diagnostics = [...limits.diagnostics, ...(result?.diagnostics ?? [])];
  if (!matches) diagnostics.push({ code: "EVALUATION_RESOURCE_BUDGET_COST_CONTEXT_MISMATCH", message: "Resource budgets require evaluated costs from the exact roster and catalogue context.", severity: "warning", impacts: ["compatibility"] });
  const resources = limits.resources.map((resource): RosterResourceBudget => {
    const definition = resource.definitions.length === 1 ? resource.definitions[0] : undefined;
    const total = report && matches && definition ? queryCostConstraint(report, occurrences, resource.typeId, definition) : undefined;
    const exact = total?.exact === true;
    const state = resource.effective;
    const active = state.kind !== "absent" && state.kind !== "unbounded" && state.kind !== "inactive";
    // Project the same included terms as the shared query. Never recalculate
    // modifiers in the UI or present excluded/uncertain terms as exact amounts.
    const contributions = total?.selections.flatMap(selection => selection.costs.flatMap(cost =>
      cost.status === "included" && cost.typeId === resource.typeId && cost.modifierSequence.completeness === "complete"
        ? [{ selectionName: selection.occurrence.name ?? cost.choice.name ?? "Unnamed selection", value: cost.totalValue }] : [])) ?? [];
    return { resource, value: total?.value ?? 0, exact, active, contributions,
      status: !active ? "satisfied" : state.kind !== "finite" || !exact ? "unresolved"
        : total!.value <= state.value ? "satisfied" : "violated" };
  });
  return { roster, context, resources, diagnostics,
    completeness: !matches || resources.some(item => item.status === "unresolved") || limits.diagnostics.length > 0 ? "incomplete" : "complete" };
}
