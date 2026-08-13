import { describe, expect, it } from "vitest";

import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import {
  evaluateNumericModifierSequence,
  type NumericModifierSource,
} from "./modifiers.js";

describe("numeric modifier sequences", () => {
  it("reports missing operation and operand without changing the value", () => {
    const modifier = source({ field: "cost-points" });

    const evaluated = evaluateNumericModifierSequence(4, [modifier]);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      baseValue: 4,
      value: 4,
      completeness: "incomplete",
      steps: [
        {
          status: "unapplied",
          modifier,
          input: 4,
          issues: ["missingType", "missingValue"],
        },
      ],
    });
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_NUMERIC_MODIFIER_TYPE_MISSING",
      "EVALUATION_NUMERIC_MODIFIER_VALUE_MISSING",
    ]);
  });

  it("reports grouped conditions and repeats independently", () => {
    const modifier: NumericModifierSource = {
      ...source({
        type: "increment",
        field: "cost-points",
        value: "2",
      }),
      conditionGroups: [{}],
      repeats: [{}],
    };

    const evaluated = evaluateNumericModifierSequence(4, [modifier]);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.steps[0]).toMatchObject({
      status: "unapplied",
      kind: "increment",
      operand: 2,
      issues: ["groupedCondition", "repeated"],
    });
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_NUMERIC_MODIFIER_CONDITION_GROUP_UNSUPPORTED",
      "EVALUATION_NUMERIC_MODIFIER_REPEAT_UNSUPPORTED",
    ]);
  });

  it("does not commit a non-finite arithmetic result", () => {
    const modifier = source({
      type: "increment",
      field: "cost-points",
      value: String(Number.MAX_VALUE),
    });

    const evaluated = evaluateNumericModifierSequence(Number.MAX_VALUE, [
      modifier,
    ]);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.value).toBe(Number.MAX_VALUE);
    expect(evaluated.value.steps[0]).toMatchObject({
      status: "unapplied",
      issues: ["nonFiniteResult"],
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_NUMERIC_MODIFIER_RESULT_NONFINITE",
      }),
    ]);
  });

  it("applies exact repeat counts without iterating imported data", () => {
    const modifier: NumericModifierSource = {
      ...source({
        type: "increment",
        field: "cost-points",
        value: "2",
      }),
      repeats: [{}],
    };

    const repeated = evaluateNumericModifierSequence(4, [modifier], {
      repetitionCount: () => 3,
    });
    const zero = evaluateNumericModifierSequence(4, [modifier], {
      repetitionCount: () => 0,
    });

    expect(repeated.ok && repeated.value).toMatchObject({
      value: 10,
      completeness: "complete",
      steps: [{ status: "applied", repetitions: 3, output: 10 }],
    });
    expect(zero.ok && zero.value).toMatchObject({
      value: 4,
      completeness: "complete",
      steps: [{ status: "applied", repetitions: 0, output: 4 }],
    });
  });

  it("distinguishes applicable, inactive, and unresolved conditions", () => {
    const modifier: NumericModifierSource = {
      ...source({
        type: "increment",
        field: "cost-points",
        value: "2",
      }),
      conditions: [{}],
    };

    const applicable = evaluateNumericModifierSequence(4, [modifier], {
      applicability: () => "applicable",
    });
    const inactive = evaluateNumericModifierSequence(4, [modifier], {
      applicability: () => "notApplicable",
    });
    const unresolved = evaluateNumericModifierSequence(4, [modifier], {
      applicability: () => "unresolved",
    });

    expect(applicable.ok && applicable.value).toMatchObject({
      value: 6,
      completeness: "complete",
      steps: [{ status: "applied", output: 6 }],
    });
    expect(inactive.ok && inactive.value).toMatchObject({
      value: 4,
      completeness: "complete",
      steps: [{ status: "notApplicable", input: 4 }],
    });
    expect(unresolved.ok && unresolved.value).toMatchObject({
      value: 4,
      completeness: "incomplete",
      steps: [
        { status: "unapplied", issues: ["applicabilityUnresolved"] },
      ],
    });
    expect(unresolved.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED",
      }),
    ]);
  });
});

function source(
  attributes: Readonly<Record<string, string>>,
): NumericModifierSource {
  return {
    ...("type" in attributes ? { type: attributes.type } : {}),
    ...("value" in attributes ? { value: attributes.value } : {}),
    ...("scope" in attributes ? { scope: attributes.scope } : {}),
    conditions: [],
    conditionGroups: [],
    repeats: [],
    source: provenance,
    path: ["catalogue", "modifier"],
    node: { attributes },
  };
}

const provenance: SourceFileProvenance = {
  sourceId: sourceId("fixture:numeric-modifier"),
  filename: "numeric-modifier.cat",
  kind: "synthetic",
  importedAt: "2026-07-22T00:00:00.000Z",
};
