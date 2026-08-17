import {
  success,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
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
import {
  evaluateRosterModifierApplicability,
  inheritModifierApplicability,
  type RosterModifierApplicabilityReport,
  type RosterModifierApplicabilitySource,
} from "./modifier-applicability.js";
import type { NumericModifierApplicability } from "./modifiers.js";
import type { EffectiveCategoryIndex } from "./selection-context.js";

export type RosterModifierGroupType = "and";

export interface RosterModifierGroupRepeatSource {
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
}

export interface RosterModifierGroupSource<
  Modifier extends RosterModifierApplicabilitySource =
    RosterModifierApplicabilitySource,
> {
  readonly type?: string;
  readonly comment?: string;
  readonly modifiers: readonly Modifier[];
  readonly modifierGroups: readonly RosterModifierGroupSource<Modifier>[];
  readonly conditions: readonly RosterSelectionConditionSource[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupSource[];
  readonly repeats: readonly RosterModifierGroupRepeatSource[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export interface RosterModifierGroupApplicabilityReport<
  Group extends RosterModifierGroupSource = RosterModifierGroupSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterConditionOwner;
  readonly group: Group;
  readonly type?: RosterModifierGroupType;
  readonly localStatus: NumericModifierApplicability;
  readonly status: NumericModifierApplicability;
  readonly completeness: ValidationCompleteness;
  readonly modifiers: Group["modifiers"];
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<
    Group["modifiers"][number]
  >[];
  readonly conditions: readonly RosterSelectionConditionReport[];
  readonly conditionGroups: readonly RosterSelectionConditionGroupReport[];
  readonly modifierGroups: readonly RosterModifierGroupApplicabilityReport<
    Group["modifierGroups"][number]
  >[];
}

export interface RosterModifierGroupExecutionEntry<
  Modifier extends RosterModifierApplicabilitySource =
    RosterModifierApplicabilitySource,
> {
  readonly modifier: Modifier;
  readonly status: NumericModifierApplicability;
  readonly evaluated: boolean;
}

export interface RosterModifierGroupExecution<
  Modifier extends RosterModifierApplicabilitySource =
    RosterModifierApplicabilitySource,
> {
  readonly modifiers: readonly Modifier[];
  readonly entries: readonly RosterModifierGroupExecutionEntry<Modifier>[];
}

export interface RosterModifierGroupApplicabilityOptions {
  /** Effective category membership, forwarded to every nested evaluation. */
  readonly effectiveCategories?: EffectiveCategoryIndex;
}

export function evaluateRosterModifierGroupApplicability<
  Group extends RosterModifierGroupSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  group: Group,
  options: RosterModifierGroupApplicabilityOptions = {},
): Result<RosterModifierGroupApplicabilityReport<Group>> {
  return evaluateModifierGroup(
    roster,
    context,
    owner,
    group,
    "applicable",
    options,
  );
}

export function collectRosterModifierGroupExecution<
  Modifier extends RosterModifierApplicabilitySource,
>(
  reports: readonly RosterModifierGroupApplicabilityReport<
    RosterModifierGroupSource<Modifier>
  >[],
  field: string,
): RosterModifierGroupExecution<Modifier> {
  const entries: RosterModifierGroupExecutionEntry<Modifier>[] = [];

  const visit = (
    report: RosterModifierGroupApplicabilityReport<
      RosterModifierGroupSource<Modifier>
    >,
    inheritedStatus: NumericModifierApplicability,
  ): void => {
    const conditionalStatus = inheritModifierApplicability(
      inheritedStatus,
      report.localStatus,
    );
    const status =
      report.group.repeats.length === 0
        ? conditionalStatus
        : inheritModifierApplicability(conditionalStatus, "unresolved");

    for (const modifier of report.modifierApplicability) {
      if (modifier.modifier.field !== field) {
        continue;
      }
      entries.push({
        modifier: modifier.modifier,
        status: inheritModifierApplicability(status, modifier.localStatus),
        evaluated: modifier.evaluated,
      });
    }
    for (const child of report.modifierGroups) {
      visit(child, status);
    }
  };

  for (const report of reports) {
    visit(report, "applicable");
  }
  return {
    modifiers: entries.map(({ modifier }) => modifier),
    entries,
  };
}

function evaluateModifierGroup<Group extends RosterModifierGroupSource>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterConditionOwner,
  group: Group,
  inheritedStatus: NumericModifierApplicability,
  options: RosterModifierGroupApplicabilityOptions,
): Result<RosterModifierGroupApplicabilityReport<Group>> {
  const diagnostics: Diagnostic[] = [];
  const forwarded = {
    ...(options.effectiveCategories === undefined
      ? {}
      : { effectiveCategories: options.effectiveCategories }),
  };
  const type = modifierGroupType(group.type);
  if (group.type === undefined) {
    diagnostics.push(
      modifierGroupDiagnostic(
        group,
        "EVALUATION_MODIFIER_GROUP_TYPE_MISSING",
        "A modifier group has no combination type.",
        "type",
        { type: group.type },
      ),
    );
  } else if (type === undefined) {
    diagnostics.push(
      modifierGroupDiagnostic(
        group,
        "EVALUATION_MODIFIER_GROUP_TYPE_UNSUPPORTED",
        `Modifier group type ${group.type} is not supported.`,
        "type",
        { type: group.type },
      ),
    );
  }

  const empty =
    group.modifiers.length === 0 && group.modifierGroups.length === 0;
  if (empty) {
    diagnostics.push(
      modifierGroupDiagnostic(
        group,
        "EVALUATION_MODIFIER_GROUP_EMPTY",
        "An empty modifier group has no behavior to apply.",
        undefined,
        { type: group.type },
      ),
    );
  }

  const attributes = unsupportedAttributes(group);
  if (attributes.length > 0) {
    diagnostics.push(
      modifierGroupDiagnostic(
        group,
        "EVALUATION_MODIFIER_GROUP_ATTRIBUTES_UNSUPPORTED",
        "A modifier group has generic attributes with unsupported behavior.",
        attributes[0],
        { attributes, values: group.node.attributes },
      ),
    );
  }

  if (group.repeats.length > 0) {
    const repeat = group.repeats[0];
    diagnostics.push({
      ...modifierGroupDiagnostic(
        group,
        "EVALUATION_MODIFIER_GROUP_REPEATS_UNSUPPORTED",
        "Modifier-group repeats are preserved but are not evaluated.",
        undefined,
        { count: group.repeats.length },
      ),
      ...(repeat === undefined
        ? {}
        : { location: { source: repeat.source, path: repeat.path } }),
    });
  }

  const conditions: RosterSelectionConditionReport[] = [];
  for (const condition of group.conditions) {
    const evaluated = evaluateRosterCondition(
      roster,
      context,
      owner,
      condition,
      forwarded,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      conditions.push(evaluated.value);
    }
  }

  const conditionGroups: RosterSelectionConditionGroupReport[] = [];
  for (const conditionGroup of group.conditionGroups) {
    const evaluated = evaluateRosterConditionGroup(
      roster,
      context,
      owner,
      conditionGroup,
      forwarded,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      conditionGroups.push(evaluated.value);
    }
  }

  const expectedConditions =
    group.conditions.length + group.conditionGroups.length;
  const statuses = [
    ...conditions.map((condition) => condition.status),
    ...conditionGroups.map((conditionGroup) => conditionGroup.status),
  ];
  const shapeSupported =
    type !== undefined && !empty && attributes.length === 0;
  const localStatus = shapeSupported
    ? combinedApplicability(expectedConditions, statuses)
    : "unresolved";
  const status = inheritModifierApplicability(inheritedStatus, localStatus);

  const modifierApplicability: RosterModifierApplicabilityReport<
    Group["modifiers"][number]
  >[] = [];
  for (const modifier of group.modifiers) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
      { inheritedStatus: status, ...forwarded },
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      modifierApplicability.push(evaluated.value);
    }
  }

  const modifierGroups: RosterModifierGroupApplicabilityReport<
    Group["modifierGroups"][number]
  >[] = [];
  for (const child of group.modifierGroups) {
    const evaluated = evaluateModifierGroup(
      roster,
      context,
      owner,
      child,
      status,
      options,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      modifierGroups.push(evaluated.value);
    }
  }

  const completeness =
    diagnostics.length === 0 &&
    conditions.every((condition) => condition.completeness === "complete") &&
    conditionGroups.every(
      (conditionGroup) => conditionGroup.completeness === "complete",
    ) &&
    modifierApplicability.every(
      (modifier) => modifier.completeness === "complete",
    ) &&
    modifierGroups.every(
      (modifierGroup) => modifierGroup.completeness === "complete",
    )
      ? "complete"
      : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      group,
      ...(type === undefined ? {} : { type }),
      localStatus,
      status,
      completeness,
      modifiers: group.modifiers,
      modifierApplicability,
      conditions,
      conditionGroups,
      modifierGroups,
    },
    diagnostics,
  );
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

function modifierGroupType(
  value: string | undefined,
): RosterModifierGroupType | undefined {
  return value === "and" ? value : undefined;
}

function unsupportedAttributes(
  group: RosterModifierGroupSource,
): readonly string[] {
  const supported = new Set(["type", "id", "comment"]);
  return Object.keys(group.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function modifierGroupDiagnostic(
  group: RosterModifierGroupSource,
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
