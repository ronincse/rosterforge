import {
  success,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

export type NumericModifierKind =
  | "set"
  | "increment"
  | "decrement"
  | "floor";

export type NumericModifierIssue =
  | "applicabilityUnresolved"
  | "conditional"
  | "groupedCondition"
  | "repeated"
  | "repeatCountInvalid"
  | "scoped"
  | "unsupportedAttributes"
  | "missingType"
  | "unsupportedType"
  | "missingValue"
  | "invalidValue"
  | "nonFiniteResult";

export interface NumericModifierSource {
  readonly type?: string;
  readonly value?: string;
  readonly scope?: string;
  readonly conditions: readonly unknown[];
  readonly conditionGroups: readonly unknown[];
  readonly repeats: readonly unknown[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export interface AppliedNumericModifierStep<
  Modifier extends NumericModifierSource = NumericModifierSource,
> {
  readonly status: "applied";
  readonly modifier: Modifier;
  readonly kind: NumericModifierKind;
  readonly input: number;
  readonly operand: number;
  readonly repetitions: number;
  readonly output: number;
}

export interface NotApplicableNumericModifierStep<
  Modifier extends NumericModifierSource = NumericModifierSource,
> {
  readonly status: "notApplicable";
  readonly modifier: Modifier;
  readonly input: number;
}

export interface UnappliedNumericModifierStep<
  Modifier extends NumericModifierSource = NumericModifierSource,
> {
  readonly status: "unapplied";
  readonly modifier: Modifier;
  readonly input: number;
  readonly issues: readonly NumericModifierIssue[];
  readonly kind?: NumericModifierKind;
  readonly operand?: number;
}

export type NumericModifierStep<
  Modifier extends NumericModifierSource = NumericModifierSource,
> =
  | AppliedNumericModifierStep<Modifier>
  | NotApplicableNumericModifierStep<Modifier>
  | UnappliedNumericModifierStep<Modifier>;

export type NumericModifierApplicability =
  | "applicable"
  | "notApplicable"
  | "unresolved";

export interface NumericModifierSequenceOptions<
  Modifier extends NumericModifierSource = NumericModifierSource,
> {
  readonly applicability?: (
    modifier: Modifier,
  ) => NumericModifierApplicability | undefined;
  readonly conditionGroupsEvaluated?: (modifier: Modifier) => boolean;
  readonly repetitionCount?: (modifier: Modifier) => number | undefined;
}

export interface NumericModifierSequenceReport<
  Modifier extends NumericModifierSource = NumericModifierSource,
> {
  readonly baseValue: number;
  readonly value: number;
  readonly completeness: ValidationCompleteness;
  readonly steps: readonly NumericModifierStep<Modifier>[];
}

export function evaluateNumericModifierSequence<
  Modifier extends NumericModifierSource,
>(
  baseValue: number,
  modifiers: readonly Modifier[],
  options: NumericModifierSequenceOptions<Modifier> = {},
): Result<NumericModifierSequenceReport<Modifier>> {
  const diagnostics: Diagnostic[] = [];
  const steps: NumericModifierStep<Modifier>[] = [];
  let value = baseValue;
  let completeness: ValidationCompleteness = "complete";

  for (const modifier of modifiers) {
    const evaluated = evaluateStep(
      value,
      modifier,
      options.applicability?.(modifier),
      options.conditionGroupsEvaluated?.(modifier) === true,
      options.repetitionCount?.(modifier),
    );
    steps.push(evaluated.step);
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.step.status === "applied") {
      value = evaluated.step.output;
    } else if (evaluated.step.status === "unapplied") {
      completeness = "incomplete";
    }
  }

  return success(
    { baseValue, value, completeness, steps },
    diagnostics,
  );
}

function evaluateStep<Modifier extends NumericModifierSource>(
  input: number,
  modifier: Modifier,
  applicability: NumericModifierApplicability | undefined,
  conditionGroupsEvaluated: boolean,
  repetitionCount: number | undefined,
): {
  readonly step: NumericModifierStep<Modifier>;
  readonly diagnostics: readonly Diagnostic[];
} {
  if (applicability === "notApplicable") {
    return {
      step: { status: "notApplicable", modifier, input },
      diagnostics: [],
    };
  }
  if (applicability === "unresolved") {
    const issue: NumericModifierIssue = "applicabilityUnresolved";
    return {
      step: {
        status: "unapplied",
        modifier,
        input,
        issues: [issue],
      },
      diagnostics: [modifierDiagnostic(modifier, issue)],
    };
  }

  const issues = applicabilityIssues(
    modifier,
    applicability === "applicable",
    conditionGroupsEvaluated,
    repetitionCount,
  );
  const kind = numericKind(modifier.type);
  if (modifier.type === undefined) {
    issues.push("missingType");
  } else if (kind === undefined) {
    issues.push("unsupportedType");
  }

  const operand = numericOperand(modifier.value);
  if (modifier.value === undefined) {
    issues.push("missingValue");
  } else if (operand === undefined) {
    issues.push("invalidValue");
  }

  let output: number | undefined;
  const repetitions = modifier.repeats.length === 0 ? 1 : repetitionCount;
  if (
    repetitions !== undefined &&
    (!Number.isSafeInteger(repetitions) || repetitions < 0)
  ) {
    issues.push("repeatCountInvalid");
  }
  if (issues.length === 0 && kind !== undefined && operand !== undefined) {
    output = applyNumericModifier(
      input,
      kind,
      operand,
      repetitions as number,
    );
    if (!Number.isFinite(output)) {
      issues.push("nonFiniteResult");
    }
  }

  if (
    issues.length === 0 &&
    kind !== undefined &&
    operand !== undefined &&
    repetitions !== undefined &&
    output !== undefined
  ) {
    return {
      step: {
        status: "applied",
        modifier,
        kind,
        input,
        operand,
        repetitions,
        output,
      },
      diagnostics: [],
    };
  }

  return {
    step: {
      status: "unapplied",
      modifier,
      input,
      issues,
      ...(kind === undefined ? {} : { kind }),
      ...(operand === undefined ? {} : { operand }),
    },
    diagnostics: issues.map((issue) => modifierDiagnostic(modifier, issue)),
  };
}

function applicabilityIssues(
  modifier: NumericModifierSource,
  directConditionsEvaluated: boolean,
  conditionGroupsEvaluated: boolean,
  repetitionCount: number | undefined,
): NumericModifierIssue[] {
  const issues: NumericModifierIssue[] = [];
  if (!directConditionsEvaluated && modifier.conditions.length > 0) {
    issues.push("conditional");
  }
  if (!conditionGroupsEvaluated && modifier.conditionGroups.length > 0) {
    issues.push("groupedCondition");
  }
  if (modifier.repeats.length > 0 && repetitionCount === undefined) {
    issues.push("repeated");
  }
  if (modifier.scope !== undefined) {
    issues.push("scoped");
  }
  const unsupportedAttributes = Object.keys(modifier.node.attributes).filter(
    (attribute) =>
      attribute !== "type" &&
      attribute !== "field" &&
      attribute !== "value" &&
      attribute !== "scope",
  );
  if (unsupportedAttributes.length > 0) {
    issues.push("unsupportedAttributes");
  }
  return issues;
}

function numericKind(value: string | undefined): NumericModifierKind | undefined {
  return value === "set" ||
    value === "increment" ||
    value === "decrement" ||
    value === "floor"
    ? value
    : undefined;
}

function numericOperand(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function applyNumericModifier(
  input: number,
  kind: NumericModifierKind,
  operand: number,
  repetitions: number,
): number {
  switch (kind) {
    case "set":
      return repetitions === 0 ? input : operand;
    case "increment":
      return input + operand * repetitions;
    case "decrement":
      return input - operand * repetitions;
    case "floor":
      return repetitions === 0 ? input : Math.max(input, operand);
  }
}

function modifierDiagnostic(
  modifier: NumericModifierSource,
  issue: NumericModifierIssue,
): Diagnostic {
  const descriptions: Record<
    NumericModifierIssue,
    readonly [string, string, string | undefined]
  > = {
    applicabilityUnresolved: [
      "EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED",
      "A numeric modifier's applicability could not be resolved.",
      undefined,
    ],
    conditional: [
      "EVALUATION_NUMERIC_MODIFIER_CONDITIONAL",
      "A numeric modifier has direct conditions that are not evaluated.",
      undefined,
    ],
    groupedCondition: [
      "EVALUATION_NUMERIC_MODIFIER_CONDITION_GROUP_UNSUPPORTED",
      "A numeric modifier has condition groups that are not evaluated.",
      undefined,
    ],
    repeated: [
      "EVALUATION_NUMERIC_MODIFIER_REPEAT_UNSUPPORTED",
      "A numeric modifier has repeat behavior that is not evaluated.",
      undefined,
    ],
    repeatCountInvalid: [
      "EVALUATION_NUMERIC_MODIFIER_REPEAT_COUNT_INVALID",
      "A numeric modifier repeat count is not a non-negative safe integer.",
      undefined,
    ],
    scoped: [
      "EVALUATION_NUMERIC_MODIFIER_SCOPE_UNSUPPORTED",
      "A numeric modifier has scoped behavior that is not evaluated.",
      "scope",
    ],
    unsupportedAttributes: [
      "EVALUATION_NUMERIC_MODIFIER_ATTRIBUTES_UNSUPPORTED",
      "A numeric modifier has generic attributes with unsupported behavior.",
      firstUnsupportedAttribute(modifier),
    ],
    missingType: [
      "EVALUATION_NUMERIC_MODIFIER_TYPE_MISSING",
      "A numeric modifier has no operation type.",
      "type",
    ],
    unsupportedType: [
      "EVALUATION_NUMERIC_MODIFIER_TYPE_UNSUPPORTED",
      `Numeric modifier operation ${modifier.type} is not supported.`,
      "type",
    ],
    missingValue: [
      "EVALUATION_NUMERIC_MODIFIER_VALUE_MISSING",
      "A numeric modifier has no operand value.",
      "value",
    ],
    invalidValue: [
      "EVALUATION_NUMERIC_MODIFIER_VALUE_INVALID",
      "A numeric modifier operand is not a finite number.",
      "value",
    ],
    nonFiniteResult: [
      "EVALUATION_NUMERIC_MODIFIER_RESULT_NONFINITE",
      "A numeric modifier would produce a non-finite result.",
      "value",
    ],
  };
  const [code, message, attribute] = descriptions[issue];
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility"],
    location: {
      source: modifier.source,
      path:
        attribute === undefined
          ? modifier.path
          : [...modifier.path, `@${attribute}`],
    },
    details: {
      issue,
      type: modifier.type,
      value: modifier.value,
      scope: modifier.scope,
      attributes: modifier.node.attributes,
    },
  };
}

function firstUnsupportedAttribute(
  modifier: NumericModifierSource,
): string | undefined {
  return Object.keys(modifier.node.attributes).find(
    (attribute) =>
      attribute !== "type" &&
      attribute !== "field" &&
      attribute !== "value" &&
      attribute !== "scope",
  );
}
