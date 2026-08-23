import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";

import {
  success,
  type Diagnostic,
  type Result,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type {
  Roster,
  RosterSelection,
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
import type { EvaluationSelectionChoice } from "./selection-context.js";
import { effectiveRosterCategories } from "./effective-categories.js";

type SelectionModifier = EvaluationSelectionChoice["modifiers"][number];
type SelectionModifierGroup =
  EvaluationSelectionChoice["modifierGroups"][number];

export type RosterSelectionVisibilityStatus =
  | "visible"
  | "hidden"
  | "unresolved";

export interface RosterSelectionVisibilityReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly choice: EvaluationSelectionChoice;
  readonly status: RosterSelectionVisibilityStatus;
  readonly hidden?: boolean;
  readonly completeness: ValidationCompleteness;
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<
    SelectionModifier
  >[];
  readonly modifierGroupApplicability: readonly RosterModifierGroupApplicabilityReport<
    SelectionModifierGroup
  >[];
}

export interface RosterSelectionVisibilityPathReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly choices: readonly EvaluationSelectionChoice[];
  readonly status: RosterSelectionVisibilityStatus;
  readonly completeness: ValidationCompleteness;
  readonly reports: readonly RosterSelectionVisibilityReport[];
}

export function evaluateRosterSelectionVisibility(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choice: EvaluationSelectionChoice,
): Result<RosterSelectionVisibilityReport> {
  const diagnostics: Diagnostic[] = [];
  const modifierApplicability: RosterModifierApplicabilityReport<
    SelectionModifier
  >[] = [];
  const modifierGroupApplicability: RosterModifierGroupApplicabilityReport<
    SelectionModifierGroup
  >[] = [];
  let hidden = choice.hidden ?? false;
  let hiddenKnown = true;

  for (const modifier of choice.modifiers.filter(
    ({ field }) => field === "hidden",
  )) {
    const value = booleanModifierValue(modifier);
    if (
      modifier.type !== "set" ||
      value === undefined ||
      modifier.scope !== undefined ||
      modifier.repeats.length > 0
    ) {
      hiddenKnown = false;
      diagnostics.push(
        visibilityDiagnostic(
          modifier,
          "EVALUATION_SELECTION_VISIBILITY_MODIFIER_UNSUPPORTED",
          "A hidden-state modifier has unsupported behavior, so effective visibility is unresolved.",
          {
            type: modifier.type,
            value: modifier.value,
            scope: modifier.scope,
            repeats: modifier.repeats.length,
          },
        ),
      );
      continue;
    }
    const applicability = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
      {
        effectiveCategories: effectiveRosterCategories(roster, context),
        // The modifier belongs to `choice`, which is not in the roster: it is
        // being asked about as a prospective child of `owner`.
        prospectiveChild: true,
      },
    );
    diagnostics.push(...applicability.diagnostics);
    if (!applicability.ok) {
      hiddenKnown = false;
      continue;
    }
    modifierApplicability.push(applicability.value);
    if (applicability.value.status === "unresolved") {
      hiddenKnown = false;
    } else if (applicability.value.status === "applicable") {
      hidden = value;
      hiddenKnown = true;
    }
  }

  const relevantGroups = choice.modifierGroups.filter((group) =>
    modifierGroupTargetsHidden(group),
  );
  for (const group of relevantGroups) {
    const evaluated = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      group,
      {
        effectiveCategories: effectiveRosterCategories(roster, context),
        prospectiveChild: true,
      },
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      hiddenKnown = false;
      continue;
    }
    modifierGroupApplicability.push(evaluated.value);
  }
  const groupedExecution =
    collectRosterModifierGroupExecution<SelectionModifier>(
      modifierGroupApplicability,
      "hidden",
    );
  if (
    modifierGroupApplicability.length !== relevantGroups.length ||
    groupedExecution.entries.length !==
      relevantGroups.reduce(
        (count, group) => count + hiddenModifierCount(group),
        0,
      )
  ) {
    hiddenKnown = false;
  }
  for (const entry of groupedExecution.entries) {
    const modifier = entry.modifier;
    const value = booleanModifierValue(modifier);
    if (
      modifier.type !== "set" ||
      value === undefined ||
      modifier.scope !== undefined ||
      modifier.repeats.length > 0
    ) {
      hiddenKnown = false;
      diagnostics.push(
        visibilityDiagnostic(
          modifier,
          "EVALUATION_SELECTION_VISIBILITY_MODIFIER_UNSUPPORTED",
          "A hidden-state modifier has unsupported behavior, so effective visibility is unresolved.",
          {
            type: modifier.type,
            value: modifier.value,
            scope: modifier.scope,
            repeats: modifier.repeats.length,
          },
        ),
      );
      continue;
    }
    if (!entry.evaluated || entry.status === "unresolved") {
      hiddenKnown = false;
    } else if (entry.status === "applicable") {
      hidden = value;
      hiddenKnown = true;
    }
  }

  return success(
    {
      roster,
      context,
      owner,
      choice,
      status: hiddenKnown
        ? hidden
          ? "hidden"
          : "visible"
        : "unresolved",
      ...(hiddenKnown ? { hidden } : {}),
      completeness:
        diagnostics.length === 0 &&
        modifierApplicability.every(
          ({ completeness }) => completeness === "complete",
        ) &&
        modifierGroupApplicability.every(
          ({ completeness }) => completeness === "complete",
        )
          ? "complete"
          : "incomplete",
      modifierApplicability,
      modifierGroupApplicability,
    },
    diagnostics,
  );
}

export function evaluateRosterSelectionVisibilityPath(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choices: readonly EvaluationSelectionChoice[],
): Result<RosterSelectionVisibilityPathReport> {
  const diagnostics: Diagnostic[] = [];
  const reports: RosterSelectionVisibilityReport[] = [];
  let status: RosterSelectionVisibilityStatus = "visible";
  let incomplete = false;
  for (const choice of choices) {
    const evaluated = evaluateRosterSelectionVisibility(
      roster,
      context,
      owner,
      choice,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      status = "unresolved";
      incomplete = true;
      break;
    }
    reports.push(evaluated.value);
    incomplete ||= evaluated.value.completeness === "incomplete";
    if (evaluated.value.status === "hidden") {
      status = "hidden";
      break;
    }
    if (evaluated.value.status === "unresolved") {
      status = "unresolved";
    }
  }
  return success(
    {
      roster,
      context,
      owner,
      choices,
      status,
      completeness: incomplete ? "incomplete" : "complete",
      reports,
    },
    diagnostics,
  );
}

export function selectionEntryGroupVisibilityPath(
  owner: EvaluationSelectionChoice,
  target: EvaluationSelectionChoice,
): readonly EvaluationSelectionChoice[] {
  return findSelectionEntryGroupPath(owner, target) ?? [target];
}

function booleanModifierValue(
  modifier: SelectionModifier,
): boolean | undefined {
  if (modifier.value === "true") return true;
  if (modifier.value === "false") return false;
  return undefined;
}

function modifierGroupTargetsHidden(
  group: EvaluationSelectionChoice["modifierGroups"][number],
): boolean {
  return (
    group.modifiers.some(({ field }) => field === "hidden") ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsHidden(child),
    )
  );
}

function hiddenModifierCount(
  group: SelectionModifierGroup,
): number {
  return (
    group.modifiers.filter(({ field }) => field === "hidden").length +
    group.modifierGroups.reduce(
      (count, child) => count + hiddenModifierCount(child),
      0,
    )
  );
}

function findSelectionEntryGroupPath(
  container: EvaluationSelectionChoice,
  target: EvaluationSelectionChoice,
): readonly EvaluationSelectionChoice[] | undefined {
  for (const group of directSelectionEntryGroups(container)) {
    if (group === target) return [group];
    const childPath = findSelectionEntryGroupPath(group, target);
    if (childPath !== undefined) return [group, ...childPath];
  }
  return undefined;
}

function directSelectionEntryGroups(
  choice: EvaluationSelectionChoice,
): readonly EvaluationSelectionChoice[] {
  return [
    ...choice.selectionEntryGroups,
    ...choice.entryLinks.filter(
      (entry): entry is EvaluationSelectionChoice =>
        entry.kind === "selectionEntryGroup",
    ),
  ];
}

function visibilityDiagnostic(
  source: {
    readonly source: EvaluationSelectionChoice["occurrence"]["source"];
    readonly path: readonly string[];
  },
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["validation", "compatibility"],
    location: {
      source: source.source,
      path: source.path,
    },
    ...(details === undefined ? {} : { details }),
  };
}
