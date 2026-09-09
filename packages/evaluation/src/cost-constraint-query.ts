// Shares exact, occurrence-scoped cost observations between selection and force
// constraints. Numeric modifier execution remains owned by the cost evaluator.
import type { ObjectId } from "@rosterforge/foundation";
import type { RosterSelection } from "@rosterforge/roster-model";
import type { RosterCostModifierGroup, RosterCostReport, RosterCostScope, RosterCostType, RosterSelectionCostEvaluation } from "./costs.js";

export interface ScopedCostConstraintEvaluation<Scope extends RosterCostScope = RosterCostScope> {
  readonly typeId: ObjectId;
  readonly costType: RosterCostType;
  readonly report: RosterCostReport<Scope>;
  readonly selections: readonly RosterSelectionCostEvaluation[];
  readonly value: number;
  readonly exact: boolean;
  readonly unresolvedSelections: number;
  readonly unresolvedCosts: number;
  readonly modifiersWithoutBaseCost: number;
}

/** Filters an existing cost report without re-evaluating it. The returned value
 * excludes uncertain items and must never be used as an exact or lower-bound
 * total unless `exact` is true. Missing-base modifiers remain unresolved. */
export function queryCostConstraint<Scope extends RosterCostScope>(
  report: RosterCostReport<Scope>,
  occurrences: ReadonlySet<RosterSelection>,
  typeId: ObjectId,
  costType: RosterCostType,
): ScopedCostConstraintEvaluation<Scope> {
  const selections = report.selections.filter(selection => occurrences.has(selection.occurrence));
  let value = 0;
  let unresolvedSelections = 0;
  let unresolvedCosts = 0;
  let modifiersWithoutBaseCost = 0;
  for (const selection of selections) {
    if (selection.status !== "resolved" || selection.amount === undefined) unresolvedSelections += 1;
    for (const cost of selection.costs) {
      if (cost.status === "included" && cost.typeId === typeId) {
        if (cost.modifierSequence.completeness === "complete") value += cost.totalValue;
        else unresolvedCosts += 1;
      } else if (cost.status === "excluded" && (cost.typeId === undefined || cost.typeId === typeId)) {
        unresolvedCosts += 1;
      }
    }
    const choice = selection.status === "resolved" && selection.choices.length === 1 ? selection.choices[0] : undefined;
    if (choice !== undefined && !choice.costs.some(cost => cost.typeId === typeId)) {
      modifiersWithoutBaseCost += choice.modifiers.filter(modifier => modifier.field === typeId).length;
      modifiersWithoutBaseCost += choice.modifierGroups.filter(group => modifierGroupTargetsCostType(group, typeId)).length;
    }
  }
  return { typeId, costType, report, selections, value,
    exact: Number.isFinite(value) && unresolvedSelections === 0 && unresolvedCosts === 0 && modifiersWithoutBaseCost === 0,
    unresolvedSelections, unresolvedCosts, modifiersWithoutBaseCost };
}

function modifierGroupTargetsCostType(group: RosterCostModifierGroup, typeId: ObjectId): boolean {
  return group.modifiers.some(modifier => modifier.field === typeId) || group.modifierGroups.some(child => modifierGroupTargetsCostType(child, typeId));
}
