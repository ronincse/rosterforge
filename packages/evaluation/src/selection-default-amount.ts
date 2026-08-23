/**
 * Read-only effective default-amount evaluation for a selected catalogue entry.
 *
 * The initialization planner has no roster context. This evaluator supplies the
 * condition-aware half at the command boundary without mutating projections,
 * generic source nodes, or roster occurrences.
 */

import type {
  BattleScribeCatalogueContext,
  MaterializedSelectionEntry,
} from "@rosterforge/data-graph";
import {
  success,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
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
  evaluateNumericModifierSequence,
  type NumericModifierSequenceReport,
} from "./modifiers.js";

type DefaultAmountModifier =
  MaterializedSelectionEntry["modifiers"][number];
type DefaultAmountModifierGroup =
  MaterializedSelectionEntry["modifierGroups"][number];

export interface RosterSelectionDefaultAmountReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly choice: MaterializedSelectionEntry;
  readonly baseAmount?: number;
  readonly amount?: number;
  readonly completeness: ValidationCompleteness;
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<
    DefaultAmountModifier
  >[];
  readonly modifierSequence?: NumericModifierSequenceReport<DefaultAmountModifier>;
}

/**
 * Evaluates direct numeric modifiers targeting one selected entry's
 * `defaultAmount`.
 *
 * An absent or empty source default is zero. Comma-delimited defaults remain
 * unsupported because New Recruit uses them to initialize multiple sub-unit
 * instances, which RosterForge does not model. Modifier groups are likewise
 * withheld until their default-amount ordering is pinned.
 */
export function inspectRosterSelectionDefaultAmount(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choice: MaterializedSelectionEntry,
): Result<RosterSelectionDefaultAmountReport> {
  const diagnostics: Diagnostic[] = [];
  let complete = true;
  const base = parseBaseDefaultAmount(choice, diagnostics);
  complete &&= base !== undefined;

  const modifiers = choice.modifiers.filter(
    ({ field }) => field === "defaultAmount",
  );
  const modifierGroups = choice.modifierGroups.filter((group) =>
    modifierGroupTargetsField(group, "defaultAmount"),
  );
  if (modifierGroups.length > 0) {
    complete = false;
    diagnostics.push(
      defaultAmountDiagnostic(
        modifierGroups[0]!,
        "EVALUATION_SELECTION_DEFAULT_AMOUNT_MODIFIER_GROUP_UNSUPPORTED",
        "A selection default amount has grouped modifiers whose ordering is not supported.",
        { modifierGroups: modifierGroups.length },
      ),
    );
  }

  const modifierApplicability: RosterModifierApplicabilityReport<DefaultAmountModifier>[] =
    [];
  for (const modifier of modifiers) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      complete = false;
      continue;
    }
    modifierApplicability.push(evaluated.value);
    complete &&= evaluated.value.completeness === "complete";
  }

  const applicabilityByModifier = new Map(
    modifierApplicability.map((report) => [report.modifier, report]),
  );
  const sequence =
    base === undefined
      ? undefined
      : evaluateNumericModifierSequence(base, modifiers, {
          applicability: (modifier) =>
            applicabilityByModifier.get(modifier)?.status,
          conditionGroupsEvaluated: (modifier) =>
            applicabilityByModifier.get(modifier)?.evaluated === true,
        });
  if (sequence !== undefined) {
    diagnostics.push(...sequence.diagnostics);
    if (
      !sequence.ok ||
      sequence.value.completeness !== "complete"
    ) {
      complete = false;
    }
  }

  const amount =
    sequence?.ok === true ? sequence.value.value : base;
  if (
    amount !== undefined &&
    (!Number.isFinite(amount) || amount < 0)
  ) {
    complete = false;
    diagnostics.push(
      defaultAmountDiagnostic(
        choice,
        "EVALUATION_SELECTION_DEFAULT_AMOUNT_RESULT_INVALID",
        "A selection default amount must evaluate to a finite non-negative number.",
        { amount },
      ),
    );
  }

  return success(
    {
      roster,
      context,
      owner,
      choice,
      ...(base === undefined ? {} : { baseAmount: base }),
      ...(amount === undefined ||
      !Number.isFinite(amount) ||
      amount < 0
        ? {}
        : { amount }),
      completeness: complete ? "complete" : "incomplete",
      modifierApplicability,
      ...(sequence?.ok === true
        ? { modifierSequence: sequence.value }
        : {}),
    },
    diagnostics,
  );
}

function parseBaseDefaultAmount(
  choice: MaterializedSelectionEntry,
  diagnostics: Diagnostic[],
): number | undefined {
  const raw = choice.defaultAmount;
  if (raw === undefined || raw.trim() === "") return 0;
  if (raw.includes(",")) {
    diagnostics.push(
      defaultAmountDiagnostic(
        choice,
        "EVALUATION_SELECTION_DEFAULT_AMOUNT_MULTIPLE_UNSUPPORTED",
        "Comma-delimited selection defaults require unsupported sub-unit instance initialization.",
        { value: raw },
        "defaultAmount",
      ),
    );
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    diagnostics.push(
      defaultAmountDiagnostic(
        choice,
        "EVALUATION_SELECTION_DEFAULT_AMOUNT_INVALID",
        "A selection default amount must be a finite non-negative number.",
        { value: raw },
        "defaultAmount",
      ),
    );
    return undefined;
  }
  return parsed;
}

function modifierGroupTargetsField(
  group: DefaultAmountModifierGroup,
  field: string,
): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === field) ||
    group.modifierGroups.some((child) =>
      modifierGroupTargetsField(child, field),
    )
  );
}

function defaultAmountDiagnostic(
  source:
    | MaterializedSelectionEntry
    | {
        readonly source: SourceFileProvenance;
        readonly path: readonly string[];
      },
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
  attribute?: string,
): Diagnostic {
  const baseLocation =
    "occurrence" in source
      ? {
          source: source.occurrence.source,
          path: source.occurrence.path,
        }
      : { source: source.source, path: source.path };
  const location =
    attribute === undefined
      ? baseLocation
      : {
          ...baseLocation,
          path: [...baseLocation.path, `@${attribute}`],
        };
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility"],
    location,
    details,
  };
}
