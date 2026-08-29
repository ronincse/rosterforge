import { describe, expect, it } from "vitest";

import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import {
  sourceId,
  type ValidationCompleteness,
  type ValidationValidity,
} from "@rosterforge/foundation";
import type { Roster } from "@rosterforge/roster-model";

import type {
  RosterCategoryConstraintsInRosterReport,
} from "./category-constraints.js";
import type {
  RosterSelectionConstraintInspectionScope,
  RosterSelectionConstraintReport,
  RosterSelectionConstraintsInRosterReport,
} from "./constraints.js";
import type {
  RosterForceConstraintInspectionScope,
  RosterForceConstraintReport,
  RosterForceConstraintsInRosterReport,
} from "./force-constraints.js";
import type {
  EmptySingleForceRosterStructuralStatus,
  RosterStructuralBoundReport,
  RosterStructuralBoundStatus,
} from "./structural-status.js";
import { composeSupportedRosterValidation } from "./validation.js";

describe("supported roster validation composition", () => {
  it("keeps validity and completeness independent across ordered reports", () => {
    const roster = {} as Roster;
    const context = fixtureContext();
    const structural = structuralReport(
      roster,
      context,
      ["satisfied", "violated"],
      "invalid",
      "complete",
    );
    const selections = selectionReport(
      roster,
      context,
      ["unresolved", "satisfied"],
      "incomplete",
    );
    const forces = forceReport(
      roster,
      context,
      ["violated"],
      "complete",
    );

    const composed = composeSupportedRosterValidation(
      structural,
      selections,
      categoryReport(roster, context, [], "complete"),
      forces,
    );

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.diagnostics).toEqual([]);
    expect(composed.value).toMatchObject({
      validity: "invalid",
      completeness: "incomplete",
      statusCounts: {
        satisfied: 2,
        violated: 2,
        unresolved: 1,
      },
      findingCounts: {
        structural: 1,
        selectionConstraints: 1,
        forceConstraints: 1,
      },
    });
    expect(
      composed.value.findings.map(({ kind, status }) => ({
        kind,
        status,
      })),
    ).toEqual([
      { kind: "structural", status: "violated" },
      { kind: "selectionConstraint", status: "unresolved" },
      { kind: "forceConstraint", status: "violated" },
    ]);
    expect(composed.value.structural).toBe(structural);
    expect(composed.value.selectionConstraints).toBe(selections);
    expect(composed.value.forceConstraints).toBe(forces);
  });

  it("reports valid and complete only when every supported input permits it", () => {
    const roster = {} as Roster;
    const context = fixtureContext();

    const composed = composeSupportedRosterValidation(
      structuralReport(
        roster,
        context,
        ["satisfied"],
        "valid",
        "complete",
      ),
      selectionReport(
        roster,
        context,
        ["satisfied"],
        "complete",
      ),
      categoryReport(roster, context, [], "complete"),
      forceReport(roster, context, [], "complete"),
    );

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value).toMatchObject({
      validity: "valid",
      completeness: "complete",
      findings: [],
      statusCounts: {
        satisfied: 2,
        violated: 0,
        unresolved: 0,
      },
    });
  });

  it("keeps unsupported constraint shapes out of actionable findings", () => {
    const roster = {} as Roster;
    const context = fixtureContext();
    const selections = selectionReport(
      roster,
      context,
      ["unresolved"],
      "incomplete",
      "selectionConditions",
      false,
    );

    const composed = composeSupportedRosterValidation(
      structuralReport(roster, context, [], "valid", "complete"),
      selections,
      categoryReport(roster, context, [], "complete"),
      forceReport(roster, context, [], "complete"),
    );

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value).toMatchObject({
      validity: "valid",
      completeness: "incomplete",
      findings: [],
      statusCounts: {
        satisfied: 0,
        violated: 0,
        unresolved: 0,
      },
    });
    expect(composed.value.selectionConstraints).toBe(selections);
  });

  it("rejects mismatched source reports and unsupported scopes", () => {
    const roster = {} as Roster;
    const otherRoster = {} as Roster;
    const context = fixtureContext();

    const composed = composeSupportedRosterValidation(
      structuralReport(roster, context, [], "valid", "complete"),
      selectionReport(
        otherRoster,
        context,
        [],
        "complete",
        "base",
      ),
      categoryReport(otherRoster, context, [], "complete"),
      forceReport(
        roster,
        context,
        [],
        "complete",
        "unconditionalModifiers",
      ),
    );

    expect(composed.ok).toBe(false);
    expect(composed.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_SUPPORTED_VALIDATION_INPUT_MISMATCH",
      "EVALUATION_SUPPORTED_VALIDATION_SCOPE_MISMATCH",
    ]);
    expect(composed.diagnostics).toEqual([
      expect.objectContaining({
        impacts: ["validation", "internal"],
        location: expect.objectContaining({
          source: expect.objectContaining({
            filename: "validation.cat",
          }),
        }),
      }),
      expect.objectContaining({
        details: {
          selectionScope: "base",
          forceScope: "unconditionalModifiers",
        },
      }),
    ]);
  });
});

function structuralReport(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  statuses: readonly RosterStructuralBoundStatus[],
  validity: ValidationValidity,
  completeness: ValidationCompleteness,
): EmptySingleForceRosterStructuralStatus {
  return {
    roster,
    context,
    validity,
    completeness,
    bounds: statuses.map(
      (status) =>
        ({
          kind: "direct",
          status,
          completeness: "complete",
        }) as RosterStructuralBoundReport,
    ),
  };
}

function categoryReport(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  statuses: readonly RosterStructuralBoundStatus[],
  completeness: ValidationCompleteness,
): RosterCategoryConstraintsInRosterReport {
  return {
    roster,
    context,
    completeness,
    forces: [
      {
        constraints: statuses.map((status) => ({
          status,
          constraintType: "min",
          scope: "roster",
          limit: 1,
        })),
      },
    ],
  } as unknown as RosterCategoryConstraintsInRosterReport;
}

function selectionReport(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  statuses: readonly RosterStructuralBoundStatus[],
  completeness: ValidationCompleteness,
  inspectionScope: RosterSelectionConstraintInspectionScope =
    "selectionConditions",
  actionable = true,
): RosterSelectionConstraintsInRosterReport {
  return {
    roster,
    context,
    inspectionScope,
    completeness,
    selections: [
      {
        constraints: statuses.map(
          (status) =>
            ({
              status,
              ...(actionable
                ? {
                    constraintType: "min",
                    scope: "parent",
                    limit: 1,
                  }
                : {}),
            }) as RosterSelectionConstraintReport,
        ),
      },
    ],
  } as unknown as RosterSelectionConstraintsInRosterReport;
}

function forceReport(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  statuses: readonly RosterStructuralBoundStatus[],
  completeness: ValidationCompleteness,
  inspectionScope: RosterForceConstraintInspectionScope = "conditions",
): RosterForceConstraintsInRosterReport {
  return {
    roster,
    context,
    inspectionScope,
    completeness,
    forces: [
      {
        constraints: statuses.map(
          (status) =>
            ({
              status,
              constraintType: "min",
              scope: "roster",
              limit: 1,
            }) as RosterForceConstraintReport,
        ),
      },
    ],
  } as unknown as RosterForceConstraintsInRosterReport;
}

function fixtureContext(): BattleScribeCatalogueContext {
  return {
    document: {
      projection: {
        source: {
          sourceId: sourceId("fixture:validation"),
          filename: "validation.cat",
          kind: "synthetic",
          importedAt: "2026-07-23T00:00:00.000Z",
        },
        path: ["catalogue"],
      },
    },
  } as unknown as BattleScribeCatalogueContext;
}
