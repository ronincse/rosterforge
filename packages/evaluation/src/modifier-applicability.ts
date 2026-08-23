import {
  success,
  type Diagnostic,
  type Result,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";

import type { Roster } from "@rosterforge/roster-model";

import {
  evaluateRosterCondition,
  evaluateRosterConditionGroup,
  type RosterSelectionConditionGroupReport,
  type RosterSelectionConditionGroupSource,
  type RosterSelectionConditionReport,
  type RosterSelectionConditionSource,
  type RosterConditionOwner,
} from "./conditions.js";
import type { NumericModifierApplicability } from "./modifiers.js";
import type { EffectiveCategoryIndex } from "./selection-context.js";

export interface RosterModifierApplicabilitySource {
  readonly field?: string;
  readonly conditions: readonly RosterSelectionConditionSource[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupSource[];
}

export interface RosterModifierApplicabilityOptions {
  readonly inheritedStatus?: NumericModifierApplicability;
  /**
   * Effective category membership, forwarded to every condition evaluated for
   * this modifier. Omitting it keeps category-controlled comparisons
   * unresolved.
   */
  readonly effectiveCategories?: EffectiveCategoryIndex;
  /** Forwarded to every condition; see `RosterConditionOptions`. */
  readonly prospectiveChild?: boolean;
}

export interface RosterModifierApplicabilityReport<
  Modifier extends RosterModifierApplicabilitySource =
    RosterModifierApplicabilitySource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterConditionOwner;
  readonly modifier: Modifier;
  readonly localStatus: NumericModifierApplicability;
  readonly status: NumericModifierApplicability;
  readonly evaluated: boolean;
  readonly completeness: ValidationCompleteness;
  readonly conditions: readonly RosterSelectionConditionReport[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupReport[];
}

export function evaluateRosterModifierApplicability<
  Modifier extends RosterModifierApplicabilitySource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  modifier: Modifier,
  options: RosterModifierApplicabilityOptions = {},
): Result<RosterModifierApplicabilityReport<Modifier>> {
  const diagnostics: Diagnostic[] = [];
  const conditionOptions = {
    ...(options.effectiveCategories === undefined
      ? {}
      : { effectiveCategories: options.effectiveCategories }),
    ...(options.prospectiveChild === true ? { prospectiveChild: true } : {}),
  };
  const conditions: RosterSelectionConditionReport[] = [];
  for (const condition of modifier.conditions) {
    const evaluated = evaluateRosterCondition(
      roster,
      context,
      owner,
      condition,
      conditionOptions,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      conditions.push(evaluated.value);
    }
  }

  const conditionGroups: RosterSelectionConditionGroupReport[] = [];
  for (const conditionGroup of modifier.conditionGroups) {
    const evaluated = evaluateRosterConditionGroup(
      roster,
      context,
      owner,
      conditionGroup,
      conditionOptions,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      conditionGroups.push(evaluated.value);
    }
  }

  const evaluated =
    conditions.length === modifier.conditions.length &&
    conditionGroups.length === modifier.conditionGroups.length;
  const localStatus = combinedApplicability(
    modifier.conditions.length + modifier.conditionGroups.length,
    [
      ...conditions.map((condition) => condition.status),
      ...conditionGroups.map((conditionGroup) => conditionGroup.status),
    ],
  );
  const status = inheritModifierApplicability(
    options.inheritedStatus ?? "applicable",
    localStatus,
  );
  const completeness =
    evaluated &&
    diagnostics.length === 0 &&
    conditions.every((condition) => condition.completeness === "complete") &&
    conditionGroups.every(
      (conditionGroup) => conditionGroup.completeness === "complete",
    )
      ? "complete"
      : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      modifier,
      localStatus,
      status,
      evaluated,
      completeness,
      conditions,
      conditionGroups,
    },
    diagnostics,
  );
}

export function inheritModifierApplicability(
  inherited: NumericModifierApplicability,
  local: NumericModifierApplicability,
): NumericModifierApplicability {
  if (inherited === "notApplicable" || local === "notApplicable") {
    return "notApplicable";
  }
  return inherited === "applicable" && local === "applicable"
    ? "applicable"
    : "unresolved";
}

function combinedApplicability(
  expectedCount: number,
  statuses: readonly ("satisfied" | "unsatisfied" | "unresolved")[],
): NumericModifierApplicability {
  if (statuses.includes("unsatisfied")) {
    return "notApplicable";
  }
  if (
    statuses.length === expectedCount &&
    statuses.every((status) => status === "satisfied")
  ) {
    return "applicable";
  }
  return "unresolved";
}
