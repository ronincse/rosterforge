import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import type {
  Roster,
  RosterForce,
  RosterSelection,
} from "@rosterforge/roster-model";

import {
  evaluateRosterCondition,
  type RosterSelectionConditionReport,
  type RosterSelectionConditionSource,
} from "./conditions.js";

export interface RosterRepeatSource {
  readonly id?: ObjectId;
  readonly field?: string;
  readonly scope?: string;
  readonly childId?: ObjectId;
  readonly childName?: string;
  readonly value?: number;
  readonly repeats?: number;
  readonly percentValue?: boolean;
  readonly shared?: boolean;
  readonly includeChildSelections?: boolean;
  readonly includeChildForces?: boolean;
  readonly roundUp?: boolean;
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export type RosterRepeatOwner = RosterSelection | RosterForce;
export type RosterRepeatStatus = "exact" | "unresolved";

export interface RosterRepeatingModifierSource<
  Repeat extends RosterRepeatSource = RosterRepeatSource,
> {
  readonly conditions: readonly unknown[];
  readonly conditionGroups: readonly unknown[];
  readonly repeats: readonly Repeat[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
}

export interface RosterRepeatReport<
  Repeat extends RosterRepeatSource = RosterRepeatSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterRepeatOwner;
  readonly repeat: Repeat;
  readonly status: RosterRepeatStatus;
  readonly completeness: ValidationCompleteness;
  readonly minimum: number;
  readonly maximum: number;
  readonly query?: RosterSelectionConditionReport;
  readonly observed?: number;
  readonly repetitions?: number;
}

export interface RosterModifierRepeatReport<
  Modifier extends RosterRepeatingModifierSource = RosterRepeatingModifierSource,
> {
  readonly modifiers: readonly Modifier[];
  readonly repeats: readonly RosterRepeatReport[];
  readonly counts: ReadonlyMap<Modifier, number>;
  readonly completeness: ValidationCompleteness;
}

export interface RosterModifierRepeatOptions<
  Modifier extends RosterRepeatingModifierSource,
> {
  readonly applicability?: (
    modifier: Modifier,
  ) => "applicable" | "notApplicable" | "unresolved" | undefined;
}

export function evaluateRosterModifierRepeats<
  Modifier extends RosterRepeatingModifierSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterRepeatOwner,
  modifiers: readonly Modifier[],
  options: RosterModifierRepeatOptions<Modifier> = {},
): Result<RosterModifierRepeatReport<Modifier>> {
  const diagnostics: Diagnostic[] = [];
  const repeats: RosterRepeatReport[] = [];
  const counts = new Map<Modifier, number>();
  for (const modifier of modifiers) {
    if (modifier.repeats.length === 0) {
      continue;
    }
    const applicability = options.applicability?.(modifier);
    const hasConditions =
      modifier.conditions.length > 0 || modifier.conditionGroups.length > 0;
    if (
      applicability === "notApplicable" ||
      applicability === "unresolved" ||
      (hasConditions && applicability === undefined)
    ) {
      continue;
    }
    if (modifier.repeats.length !== 1) {
      diagnostics.push({
        code: "EVALUATION_MODIFIER_REPEAT_CARDINALITY_UNSUPPORTED",
        message:
          "A modifier with multiple repeat elements has no supported combination rule.",
        severity: "warning",
        impacts: ["compatibility"],
        location: { source: modifier.source, path: modifier.path },
        details: { repeats: modifier.repeats.length },
      });
      continue;
    }
    const evaluated = evaluateRosterRepeat(
      roster,
      context,
      owner,
      modifier.repeats[0]!,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      continue;
    }
    repeats.push(evaluated.value);
    if (
      evaluated.value.status === "exact" &&
      evaluated.value.repetitions !== undefined
    ) {
      counts.set(modifier, evaluated.value.repetitions);
    }
  }
  return success(
    {
      modifiers,
      repeats,
      counts,
      completeness:
        diagnostics.length === 0 &&
        repeats.every((repeat) => repeat.completeness === "complete")
          ? "complete"
          : "incomplete",
    },
    diagnostics,
  );
}

export function evaluateRosterRepeat<Repeat extends RosterRepeatSource>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterRepeatOwner,
  repeat: Repeat,
): Result<RosterRepeatReport<Repeat>> {
  const diagnostics = repeatShapeDiagnostics(repeat);
  if (diagnostics.length > 0) {
    return success(
      unresolvedReport(roster, context, owner, repeat),
      diagnostics,
    );
  }

  const query = evaluateRosterCondition(
    roster,
    context,
    owner,
    repeatCondition(repeat),
  );
  diagnostics.push(...query.diagnostics);
  if (!query.ok) {
    return success(
      unresolvedReport(roster, context, owner, repeat),
      diagnostics,
    );
  }

  const observed =
    query.value.completeness === "complete" &&
    query.value.minimum === query.value.maximum
      ? query.value.minimum
      : undefined;
  const repetitions =
    observed === undefined
      ? undefined
      : repeatCount(
          observed,
          repeat.value as number,
          repeat.repeats as number,
          repeat.roundUp === true,
        );
  if (observed !== undefined && repetitions === undefined) {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_RESULT_INVALID",
        "Repeat evaluation did not produce a non-negative safe integer.",
        undefined,
        {
          observed,
          value: repeat.value,
          repeats: repeat.repeats,
          roundUp: repeat.roundUp ?? false,
        },
      ),
    );
  }

  const exact = repetitions !== undefined && diagnostics.length === 0;
  return success(
    {
      roster,
      context,
      owner,
      repeat,
      status: exact ? "exact" : "unresolved",
      completeness: exact ? "complete" : "incomplete",
      minimum: query.value.minimum,
      maximum: query.value.maximum,
      query: query.value,
      ...(observed === undefined ? {} : { observed }),
      ...(repetitions === undefined ? {} : { repetitions }),
    },
    diagnostics,
  );
}

function repeatCondition(
  repeat: RosterRepeatSource,
): RosterSelectionConditionSource {
  return {
    type: "atLeast",
    ...(repeat.field === undefined ? {} : { field: repeat.field }),
    ...(repeat.scope === undefined ? {} : { scope: repeat.scope }),
    ...(repeat.childId === undefined ? {} : { childId: repeat.childId }),
    value: "0",
    ...(repeat.percentValue === undefined
      ? {}
      : { percentValue: repeat.percentValue }),
    ...(repeat.shared === undefined ? {} : { shared: repeat.shared }),
    ...(repeat.includeChildSelections === undefined
      ? {}
      : { includeChildSelections: repeat.includeChildSelections }),
    ...(repeat.includeChildForces === undefined
      ? {}
      : { includeChildForces: repeat.includeChildForces }),
    source: repeat.source,
    path: repeat.path,
    node: { attributes: {} },
  };
}

function repeatCount(
  observed: number,
  value: number,
  repeats: number,
  roundUp: boolean,
): number | undefined {
  const quotient = observed / value;
  const rounded = roundUp ? Math.ceil(quotient) : Math.floor(quotient);
  const result = rounded * repeats;
  return Number.isSafeInteger(result) && result >= 0 ? result : undefined;
}

function repeatShapeDiagnostics(repeat: RosterRepeatSource): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (repeat.field !== "selections") {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_FIELD_UNSUPPORTED",
        `Repeat field ${repeat.field ?? "missing"} is not supported.`,
        "field",
      ),
    );
  }
  if (repeat.scope === undefined || repeat.scope.trim() === "") {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_SCOPE_MISSING",
        "A repeat has no query scope.",
        "scope",
      ),
    );
  }
  if (repeat.childId === undefined) {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_CHILD_ID_MISSING",
        "A repeat has no queried child ID.",
        "childId",
      ),
    );
  }
  if (
    repeat.value === undefined ||
    !Number.isFinite(repeat.value) ||
    repeat.value <= 0
  ) {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_VALUE_INVALID",
        "A repeat divisor must be a positive finite number.",
        "value",
        { value: repeat.value },
      ),
    );
  }
  if (
    repeat.repeats === undefined ||
    !Number.isSafeInteger(repeat.repeats) ||
    repeat.repeats < 0
  ) {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_MULTIPLIER_INVALID",
        "A repeat multiplier must be a non-negative safe integer.",
        "repeats",
        { repeats: repeat.repeats },
      ),
    );
  }
  if (repeat.percentValue === true) {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_PERCENT_UNSUPPORTED",
        "Percentage repeat values are not supported.",
        "percentValue",
      ),
    );
  }
  const attributes = unsupportedRepeatAttributes(repeat);
  if (attributes.length > 0) {
    diagnostics.push(
      repeatDiagnostic(
        repeat,
        "EVALUATION_REPEAT_ATTRIBUTES_UNSUPPORTED",
        "A repeat has generic attributes with unsupported behavior.",
        attributes[0],
        { attributes },
      ),
    );
  }
  return diagnostics;
}

function unsupportedRepeatAttributes(
  repeat: RosterRepeatSource,
): readonly string[] {
  const supported = new Set([
    "field",
    "scope",
    "childId",
    "childName",
    "value",
    "repeats",
    "percentValue",
    "shared",
    "includeChildSelections",
    "includeChildForces",
    "roundUp",
    "id",
  ]);
  return Object.keys(repeat.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function unresolvedReport<Repeat extends RosterRepeatSource>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterRepeatOwner,
  repeat: Repeat,
): RosterRepeatReport<Repeat> {
  return {
    roster,
    context,
    owner,
    repeat,
    status: "unresolved",
    completeness: "incomplete",
    minimum: 0,
    maximum: Number.POSITIVE_INFINITY,
  };
}

function repeatDiagnostic(
  repeat: RosterRepeatSource,
  code: string,
  message: string,
  attribute: string | undefined,
  details: Readonly<Record<string, unknown>> = {},
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility"],
    location: {
      source: repeat.source,
      path:
        attribute === undefined
          ? repeat.path
          : [...repeat.path, `@${attribute}`],
    },
    details,
  };
}
