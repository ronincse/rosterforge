import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
  type BattleScribeCatalogueContexts,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import {
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
  createRoster,
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  evaluateRosterBaseCosts,
  evaluateRosterCostsWithSelectionConditions,
  evaluateRosterCostsWithUnconditionalModifiers,
  type RosterCostChoice,
} from "./costs.js";

describe("roster base cost evaluation", () => {
  it("aggregates ordered numeric costs while preserving zero and provenance", () => {
    const context = costContext();
    const base = choice(context, "cost-base");
    const child = choice(context, "cost-child");
    const withBase = addRootSelection(
      emptyRoster(context),
      base,
      "selection-base",
    );
    const roster = addChildSelection(
      withBase,
      child,
      "selection-base",
      "selection-child",
    );

    const evaluated = evaluateRosterBaseCosts(roster, context);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      scope: "base",
      completeness: "complete",
      totals: [
        { typeId: "cost-points", value: 15 },
        { typeId: "cost-supply", value: 0 },
      ],
    });
    expect(
      evaluated.value.selections.map((selection) => selection.occurrence.id),
    ).toEqual(["selection-base", "selection-child"]);
    expect(evaluated.value.selections[0]?.choices[0]).toBe(base);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      status: "included",
      typeId: "cost-points",
      value: 10,
    });
    expect(evaluated.value.selections[0]?.costs[0]?.source).toBe(
      base.costs[0],
    );
    expect(evaluated.value.selections[0]?.costs[1]).toMatchObject({
      status: "included",
      typeId: "cost-supply",
      value: 0,
    });
    expect(evaluated.value.totals[0]?.costType.id).toBe("cost-points");
    expect(evaluated.value.roster).toBe(roster);
    expect(evaluated.value.context).toBe(context);
    expect(Object.hasOwn(evaluated.value, "validity")).toBe(false);
  });

  it("counts repeated roster occurrences independently", () => {
    const context = costContext();
    const base = choice(context, "cost-base");
    const first = addRootSelection(
      emptyRoster(context),
      base,
      "selection-base-1",
    );
    const roster = addRootSelection(first, base, "selection-base-2");

    const evaluated = successful(evaluateRosterBaseCosts(roster, context));

    expect(evaluated.completeness).toBe("complete");
    expect(evaluated.selections).toHaveLength(2);
    expect(evaluated.totals).toMatchObject([
      { typeId: "cost-points", value: 20 },
      { typeId: "cost-supply", value: 0 },
    ]);
  });

  it("multiplies per-unit costs by a positive selection amount", () => {
    const context = costContext();
    const base = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      base,
      "selection-amount",
      2.5,
    );

    const evaluated = successful(evaluateRosterBaseCosts(roster, context));
    const points = evaluated.selections[0]?.costs[0];

    expect(evaluated.completeness).toBe("complete");
    expect(evaluated.selections[0]?.amount).toBe(2.5);
    expect(points).toMatchObject({
      status: "included",
      baseValue: 10,
      value: 10,
      amount: 2.5,
      totalValue: 25,
    });
    expect(evaluated.totals).toMatchObject([
      { typeId: "cost-points", value: 25 },
      { typeId: "cost-supply", value: 0 },
    ]);
  });

  it("excludes malformed and unresolved costs with explicit issues", () => {
    const context = costContext();
    const roster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-issues"),
      "selection-issues",
    );

    const evaluated = evaluateRosterBaseCosts(roster, context);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toEqual([]);
    expect(evaluated.value.selections[0]?.costs).toMatchObject([
      { status: "excluded", issues: ["missingTypeId"], value: 3 },
      {
        status: "excluded",
        issues: ["missingValue"],
        typeId: "cost-points",
      },
      {
        status: "excluded",
        issues: ["missingCostType"],
        typeId: "cost-unknown",
        value: 4,
      },
    ]);
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_COST_MISSING_TYPE_ID",
      "EVALUATION_COST_MISSING_VALUE",
      "EVALUATION_COST_TYPE_MISSING",
    ]);
    expect(evaluated.diagnostics[0]?.location?.path?.at(-1)).toBe("@typeId");
    expect(evaluated.diagnostics[1]?.location?.path?.at(-1)).toBe("@value");
  });

  it("does not guess how duplicate same-type occurrence costs combine", () => {
    const context = costContext();
    const roster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-duplicate"),
      "selection-duplicate",
    );

    const evaluated = evaluateRosterBaseCosts(roster, context);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toEqual([]);
    expect(evaluated.value.selections[0]?.costs).toMatchObject([
      {
        status: "excluded",
        issues: ["duplicateOccurrenceType"],
        value: 10,
      },
      {
        status: "excluded",
        issues: ["duplicateOccurrenceType"],
        value: 5,
      },
    ]);
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_DUPLICATE_OCCURRENCE_COST_TYPE",
      }),
    ]);
  });

  it("retains known base costs but marks modifiers unsupported", () => {
    const context = costContext();
    const roster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-modified"),
      "selection-modified",
    );

    const evaluated = evaluateRosterBaseCosts(roster, context);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toMatchObject([
      { typeId: "cost-points", value: 7 },
    ]);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      status: "included",
      baseValue: 7,
      value: 7,
      modifiers: [expect.objectContaining({ type: "increment" })],
      modifierSequence: { steps: [] },
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_UNSUPPORTED_SELECTION_MODIFIERS",
      }),
    ]);
  });

  it("applies direct unconditional numeric cost modifiers in source order", () => {
    const context = costContext();
    const selected = choice(context, "cost-sequence");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-sequence",
    );

    const evaluated = evaluateRosterCostsWithUnconditionalModifiers(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value.scope).toBe("unconditionalModifiers");
    expect(evaluated.value.completeness).toBe("complete");
    expect(evaluated.value.totals).toMatchObject([
      { typeId: "cost-points", value: 20 },
      { typeId: "cost-supply", value: 0 },
    ]);
    const points = evaluated.value.selections[0]?.costs[0];
    expect(points).toMatchObject({
      status: "included",
      baseValue: 10,
      value: 20,
      modifierSequence: {
        baseValue: 10,
        value: 20,
        completeness: "complete",
        steps: [
          { status: "applied", kind: "increment", input: 10, output: 15 },
          { status: "applied", kind: "decrement", input: 15, output: 13 },
          { status: "applied", kind: "floor", input: 13, output: 20 },
        ],
      },
    });
    expect(
      points?.status === "included"
        ? points.modifierSequence.steps[0]?.modifier
        : undefined,
    ).toBe(selected.modifiers[0]);
  });

  it("keeps unsupported modifier steps observable and provisional", () => {
    const context = costContext();
    const roster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-problems"),
      "selection-problems",
    );

    const evaluated = evaluateRosterCostsWithUnconditionalModifiers(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toMatchObject([
      { typeId: "cost-points", value: 4 },
    ]);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      status: "included",
      baseValue: 4,
      value: 4,
      modifierSequence: {
        completeness: "incomplete",
        steps: [
          { status: "unapplied", issues: ["invalidValue"] },
          { status: "unapplied", issues: ["unsupportedType"] },
          { status: "unapplied", issues: ["conditional"] },
          {
            status: "unapplied",
            issues: ["scoped", "unsupportedAttributes"],
          },
        ],
      },
    });
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_NUMERIC_MODIFIER_VALUE_INVALID",
      "EVALUATION_NUMERIC_MODIFIER_TYPE_UNSUPPORTED",
      "EVALUATION_NUMERIC_MODIFIER_CONDITIONAL",
      "EVALUATION_NUMERIC_MODIFIER_SCOPE_UNSUPPORTED",
      "EVALUATION_NUMERIC_MODIFIER_ATTRIBUTES_UNSUPPORTED",
    ]);
    expect(evaluated.diagnostics.at(-1)?.details?.attributes).toMatchObject({
      affects: "self.entries",
    });
  });

  it("keeps grouped costs inert without selection-condition evaluation", () => {
    const context = costContext();
    const selected = choice(context, "cost-grouped");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-grouped",
    );

    const evaluated = evaluateRosterCostsWithUnconditionalModifiers(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toMatchObject([
      { typeId: "cost-points", value: 4 },
    ]);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      modifierGroups: [selected.modifierGroups[0]],
      modifierSequence: { steps: [] },
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_COST_MODIFIER_GROUP_UNSUPPORTED",
      }),
    ]);
  });

  it("applies direct and grouped costs in deterministic source order", () => {
    const context = costContext();
    const base = choice(context, "cost-base");
    const grouped = choice(context, "cost-group-inspection");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), base, "selection-base"),
      grouped,
      "selection-grouped",
    );

    const evaluated = evaluateRosterCostsWithSelectionConditions(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      scope: "selectionConditions",
      completeness: "complete",
      totals: [
        { typeId: "cost-points", value: 21 },
        { typeId: "cost-supply", value: 0 },
      ],
    });
    expect(evaluated.value.selections[1]?.costs[0]).toMatchObject({
      baseValue: 7,
      value: 11,
      modifierSequence: {
        completeness: "complete",
        steps: [
          { status: "applied", kind: "decrement", input: 7, output: 6 },
          { status: "applied", kind: "increment", input: 6, output: 8 },
          { status: "applied", kind: "set", input: 8, output: 11 },
        ],
      },
      modifierGroupApplicability: [
        {
          localStatus: "applicable",
          status: "applicable",
          completeness: "complete",
          modifierApplicability: [
            {
              localStatus: "applicable",
              status: "applicable",
            },
          ],
          modifierGroups: [
            {
              localStatus: "applicable",
              status: "applicable",
            },
          ],
        },
      ],
    });
    expect(evaluated.diagnostics).toEqual([]);
  });

  it("keeps unsupported grouped arithmetic observable and provisional", () => {
    const context = costContext();
    const selected = choice(context, "cost-group-unsupported");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-group-unsupported",
    );

    const result = evaluateRosterCostsWithSelectionConditions(roster, context);
    const evaluated = successful(result);

    expect(evaluated.completeness).toBe("incomplete");
    expect(evaluated.totals).toMatchObject([
      { typeId: "cost-points", value: 8 },
    ]);
    expect(evaluated.selections[0]?.costs[0]).toMatchObject({
      value: 8,
      modifierSequence: {
        completeness: "incomplete",
        steps: [
          { status: "unapplied", issues: ["unsupportedType"] },
          { status: "unapplied", issues: ["unsupportedType"] },
        ],
      },
    });
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_NUMERIC_MODIFIER_TYPE_UNSUPPORTED",
      "EVALUATION_NUMERIC_MODIFIER_TYPE_UNSUPPORTED",
    ]);
  });

  it("keeps grouped repeats unresolved instead of applying their modifiers", () => {
    const context = costContext();
    const selected = choice(context, "cost-group-repeat");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-group-repeat",
    );

    const result = evaluateRosterCostsWithSelectionConditions(roster, context);
    const evaluated = successful(result);

    expect(evaluated.completeness).toBe("incomplete");
    expect(evaluated.totals).toMatchObject([
      { typeId: "cost-points", value: 8 },
    ]);
    expect(evaluated.selections[0]?.costs[0]).toMatchObject({
      value: 8,
      modifierGroupApplicability: [
        { completeness: "incomplete", status: "applicable" },
      ],
      modifierSequence: {
        completeness: "incomplete",
        steps: [
          {
            status: "unapplied",
            issues: ["applicabilityUnresolved"],
          },
        ],
      },
    });
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_MODIFIER_GROUP_REPEATS_UNSUPPORTED",
      "EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED",
    ]);
  });

  it("applies an exact repeat count to a grouped cost modifier", () => {
    const context = costContext();
    const repeating = choice(context, "cost-group-modifier-repeat");
    const target = choice(context, "cost-repeat-target");
    const withParent = addRootSelection(
      emptyRoster(context),
      repeating,
      "selection-group-modifier-repeat",
    );
    const withFirstTarget = addChildSelection(
      withParent,
      target,
      "selection-group-modifier-repeat",
      "selection-repeat-target-1",
    );
    const roster = addChildSelection(
      withFirstTarget,
      target,
      "selection-group-modifier-repeat",
      "selection-repeat-target-2",
    );

    const result = evaluateRosterCostsWithSelectionConditions(roster, context);
    const evaluated = successful(result);

    expect(evaluated.completeness).toBe("complete");
    expect(evaluated.totals).toMatchObject([
      { typeId: "cost-points", value: 14 },
    ]);
    expect(evaluated.selections[0]?.costs[0]).toMatchObject({
      value: 14,
      repeatReports: [
        { status: "exact", observed: 2, repetitions: 2 },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [
          {
            status: "applied",
            kind: "increment",
            input: 10,
            operand: 2,
            repetitions: 2,
            output: 14,
          },
        ],
      },
    });
    expect(result.diagnostics).toEqual([]);
  });

  it("diagnoses a cost modifier that has no corresponding base cost", () => {
    const context = costContext();
    const roster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-no-base"),
      "selection-no-base",
    );

    const evaluated = evaluateRosterCostsWithUnconditionalModifiers(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toEqual([]);
    expect(evaluated.value.selections[0]?.costs).toEqual([]);
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_COST_MODIFIER_BASE_MISSING",
      }),
    ]);
  });

  it("ignores modifiers that cannot target numeric costs", () => {
    const context = costContext();
    const roster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-noncost-modifier"),
      "selection-noncost",
    );

    const base = successful(evaluateRosterBaseCosts(roster, context));
    const modified = successful(
      evaluateRosterCostsWithUnconditionalModifiers(roster, context),
    );

    expect(base.completeness).toBe("complete");
    expect(modified.completeness).toBe("complete");
    expect(base.totals).toMatchObject([{ value: 6 }]);
    expect(modified.totals).toMatchObject([{ value: 6 }]);
    expect(base.selections[0]?.costs[0]).toMatchObject({ modifiers: [] });
  });

  it("applies a direct modifier when every supported condition is satisfied", () => {
    const context = costContext();
    const base = choice(context, "cost-base");
    const conditional = choice(context, "cost-conditional");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), base, "selection-base"),
      conditional,
      "selection-conditional",
    );

    const evaluated = evaluateRosterCostsWithSelectionConditions(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      scope: "selectionConditions",
      completeness: "complete",
      totals: [
        { typeId: "cost-points", value: 22 },
        { typeId: "cost-supply", value: 0 },
      ],
    });
    expect(evaluated.value.selections[1]?.costs[0]).toMatchObject({
      status: "included",
      baseValue: 4,
      value: 12,
      modifierApplicability: [
        {
          status: "applicable",
          evaluated: true,
          conditions: [{ status: "satisfied", observed: 1 }],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "set", output: 12 }],
      },
    });
  });

  it("applies a direct modifier from a satisfied force-count condition", () => {
    const context = costContext();
    const conditional = choice(context, "cost-force-condition");
    const roster = addRootSelection(
      emptyRoster(context),
      conditional,
      "selection-force-conditional",
    );

    const evaluated = evaluateRosterCostsWithSelectionConditions(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value.completeness).toBe("complete");
    expect(evaluated.value.totals).toMatchObject([{ value: 9 }]);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      baseValue: 4,
      value: 9,
      modifierApplicability: [
        {
          status: "applicable",
          conditions: [
            {
              status: "satisfied",
              observed: 1,
              matching: [roster.forces[0]],
            },
          ],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "set", output: 9 }],
      },
    });
  });

  it("retains an unsatisfied modifier as not applicable", () => {
    const context = costContext();
    const conditional = choice(context, "cost-conditional");
    const roster = addRootSelection(
      emptyRoster(context),
      conditional,
      "selection-conditional",
    );

    const evaluated = evaluateRosterCostsWithSelectionConditions(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value.completeness).toBe("complete");
    expect(evaluated.value.totals).toMatchObject([{ value: 4 }]);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      value: 4,
      modifierApplicability: [
        {
          status: "notApplicable",
          conditions: [{ status: "unsatisfied", observed: 0 }],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "notApplicable", input: 4 }],
      },
    });

    const unconditional = successful(
      evaluateRosterCostsWithUnconditionalModifiers(roster, context),
    );
    expect(unconditional.completeness).toBe("incomplete");
    expect(unconditional.totals).toMatchObject([{ value: 4 }]);
  });

  it("applies supported condition groups without flattening their reports", () => {
    const context = costContext();
    const base = choice(context, "cost-base");
    const grouped = choice(context, "cost-condition-group");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), base, "selection-base"),
      grouped,
      "selection-grouped-condition",
    );

    const evaluated = evaluateRosterCostsWithSelectionConditions(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("complete");
    expect(evaluated.value.totals).toMatchObject([
      { typeId: "cost-points", value: 30 },
      { typeId: "cost-supply", value: 0 },
    ]);
    expect(evaluated.value.selections[1]?.costs[0]).toMatchObject({
      value: 20,
      modifierApplicability: [
        {
          status: "applicable",
          evaluated: true,
          conditions: [],
          conditionGroups: [
            { type: "and", status: "satisfied", completeness: "complete" },
          ],
        },
      ],
      modifierSequence: {
        steps: [
          { status: "applied", kind: "set", output: 20 },
        ],
      },
    });
    expect(evaluated.diagnostics).toEqual([]);
  });

  it("keeps conditional modifiers unresolved when count bounds straddle the threshold", () => {
    const context = costContext();
    const conditional = choice(context, "cost-conditional");
    let roster = addRootSelection(
      emptyRoster(context),
      conditional,
      "selection-conditional",
    );
    roster = successful(
      addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-unknown"),
        definition: {
          kind: "selectionEntry",
          key: rosterDefinitionKey("unknown:key"),
        },
      }),
    );

    const evaluated = evaluateRosterCostsWithSelectionConditions(
      roster,
      context,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toMatchObject([{ value: 4 }]);
    expect(evaluated.value.selections[0]?.costs[0]).toMatchObject({
      modifierApplicability: [
        {
          status: "unresolved",
          conditions: [{ status: "unresolved", minimum: 0, maximum: 1 }],
        },
      ],
      modifierSequence: {
        steps: [
          { status: "unapplied", issues: ["applicabilityUnresolved"] },
        ],
      },
    });
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
      "EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED",
      "EVALUATION_SELECTION_NOT_AVAILABLE",
    ]);
  });

  it("short-circuits selection claims for a different catalogue", () => {
    const context = costContext();
    const valid = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-base"),
      "selection-base",
    );
    const roster: Roster = {
      ...valid,
      catalogue: {
        kind: "catalogue",
        key: rosterDefinitionKey("different:catalogue"),
      },
    };

    const evaluated = evaluateRosterBaseCosts(roster, context);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.value.totals).toEqual([]);
    expect(evaluated.value.selections[0]).toMatchObject({
      status: "unresolved",
      choices: [],
      costs: [],
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CATALOGUE_CONTEXT_MISMATCH",
      }),
    ]);
  });

  it("keeps unavailable choices unresolved in a partial context", () => {
    const documents = visibilityDocuments();
    const graph = resolveBattleScribeDataGraph(documents);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const complete = composeBattleScribeCatalogueContexts(graph.value);
    const limited = composeBattleScribeCatalogueContexts(graph.value, {
      limits: { maxEntryLinkDepth: 64, maxExpandedEntryLinks: 1 },
    });
    expect(complete.ok).toBe(true);
    expect(limited.ok).toBe(true);
    if (!complete.ok || !limited.ok) {
      return;
    }
    const completeContext = catalogueContext(
      complete.value,
      "visibility-primary",
    );
    const limitedContext = catalogueContext(
      limited.value,
      "visibility-primary",
    );
    const linkedChoice = choice(completeContext, "leaf-link");
    const roster = addRootSelection(
      emptyRoster(limitedContext),
      linkedChoice,
      "selection-limited",
    );

    const evaluated = evaluateRosterBaseCosts(roster, limitedContext);

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.selections[0]?.status).toBe("unresolved");
    expect(evaluated.value.completeness).toBe("incomplete");
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({ code: "EVALUATION_SELECTION_UNRESOLVED" }),
    ]);
  });
});

function costContext(): BattleScribeCatalogueContext {
  return catalogueContext(
    contextsFor(["projection.gst", "cost-evaluation.cat"]),
    "cost-evaluation",
  );
}

function visibilityDocuments() {
  return [
    "projection.gst",
    "visibility-primary.cat",
    "visibility-branch.cat",
    "visibility-leaf.cat",
  ].map(parseFixture);
}

function contextsFor(filenames: readonly string[]) {
  const graph = resolveBattleScribeDataGraph(filenames.map(parseFixture));
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Fixture graph must resolve.");
  }
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  expect(contexts.ok).toBe(true);
  if (!contexts.ok) {
    throw new Error("Fixture contexts must compose.");
  }
  return contexts.value;
}

function catalogueContext(
  contexts: BattleScribeCatalogueContexts,
  id: string,
): BattleScribeCatalogueContext {
  const context = contexts.catalogues.find(
    (candidate) => candidate.document.metadata.id === id,
  );
  if (context === undefined) {
    throw new Error(`Missing catalogue context ${id}.`);
  }
  return context;
}

function emptyRoster(context: BattleScribeCatalogueContext): Roster {
  const roster = createRoster({
    id: rosterId("cost-roster"),
    name: "Cost Roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions[0];
  if (force === undefined) {
    throw new Error("Cost fixture requires a force definition.");
  }
  return successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("force-1"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined
          ? {}
          : { sourceId: force.source.id }),
      },
    }),
  );
}

function addRootSelection(
  roster: Roster,
  selected: RosterCostChoice,
  occurrenceId: string,
  amount?: number,
): Roster {
  return successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
      id: selectionOccurrenceId(occurrenceId),
      definition: selectionReference(selected),
      ...(amount === undefined ? {} : { amount }),
    }),
  );
}

function addChildSelection(
  roster: Roster,
  selected: RosterCostChoice,
  parentId: string,
  occurrenceId: string,
): Roster {
  return successful(
    addRosterSelectionToSelection(
      roster,
      selectionOccurrenceId(parentId),
      {
        id: selectionOccurrenceId(occurrenceId),
        definition: selectionReference(selected),
      },
    ),
  );
}

function selectionReference(selected: RosterCostChoice) {
  return {
    kind: selected.kind,
    key: projectionKey(selected.occurrence),
    ...(selected.id === undefined ? {} : { sourceId: selected.id }),
  };
}

function projectionKey(source: {
  readonly source: { readonly sourceId: string };
  readonly path: readonly string[];
}) {
  return rosterDefinitionKeyForSource(source.source.sourceId, source.path);
}

function choice(
  context: BattleScribeCatalogueContext,
  id: string,
): RosterCostChoice {
  const pending = context.roots.roots.map((root) => root.materialized);
  while (pending.length > 0) {
    const selected = pending.shift();
    if (selected === undefined || selected.kind === "unresolvedEntryLink") {
      continue;
    }
    if (selected.id === id) {
      return selected;
    }
    pending.push(
      ...selected.selectionEntries,
      ...selected.selectionEntryGroups,
      ...selected.entryLinks,
    );
  }
  throw new Error(`Missing selection choice ${id}.`);
}

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) {
    throw new Error(`Fixture ${filename} must parse.`);
  }
  return parsed.value;
}

function successful<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
}): T {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected operation to succeed.");
  }
  return result.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-22T00:00:00.000Z",
  };
}
