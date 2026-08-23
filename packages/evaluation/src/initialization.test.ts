import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  inspectEmptySingleForceRootChoices,
  inspectRosterSelectionChildChoices,
  inspectRosterSelectionChoiceGroups,
  planEmptySingleForceRootInitialization,
  planRosterSelectionInitialization,
} from "./initialization.js";

describe("nested selection entry groups", () => {
  /**
   * A group may hold other groups instead of entries and still bound what is
   * chosen beneath it. Ten groups in the pinned corpus are this shape,
   * including the Death Guard Plague Champion's `Wargear` — 2 of 2 over two
   * 1-of-1 groups. Before this was handled the parent counted nothing, so it
   * read as permanently violated and the roster could never become valid.
   *
   * `choices` stays direct so a caller does not offer every option twice;
   * `countedChoices` is what the bound counts.
   */
  it("counts nested entries towards the parent bound but does not offer them", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("nested-group-bound.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) => document.metadata.id === "nested-group-bound",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "nested-unit",
    );
    if (root === undefined || root.materialized.kind === "unresolvedEntryLink") {
      throw new Error("Expected nested unit root.");
    }

    const inspected = inspectRosterSelectionChoiceGroups(root.materialized);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const wargear = inspected.value.groups.find(
      ({ group }) => group.id === "nested-wargear",
    );
    expect(wargear?.minimum).toBe(2);
    expect(wargear?.maximum).toBe(2);
    // Nothing to offer directly: its options live in the two nested groups,
    // which are inspected in their own right.
    expect(wargear?.choices).toEqual([]);
    expect(
      wargear?.countedChoices.map(({ name }) => name).sort(),
    ).toEqual(["Blade", "Hammer", "Pistol", "Rifle"]);

    const melee = inspected.value.groups.find(
      ({ group }) => group.id === "nested-melee",
    );
    expect(melee?.choices.map(({ name }) => name)).toEqual([
      "Blade",
      "Hammer",
    ]);
  });
});

describe("roster selection initialization", () => {
  it("initializes minima regardless of the automatic extension value", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("cost-evaluation.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) => document.metadata.id === "cost-evaluation",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "auto-squad",
    );
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected automatic-constraint fixture root.");
    }

    const planned = planRosterSelectionInitialization(root.materialized);

    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.diagnostics).toEqual([]);
    expect(planned.value).toMatchObject({
      completeness: "complete",
      plannedSelectionCount: 3,
      additions: [
        {
          choice: { id: "auto-model", name: "Auto Model" },
          quantity: 2,
        },
        {
          choice: { id: "auto-upgrade", name: "Auto Upgrade" },
          quantity: 1,
        },
      ],
    });
    expect(
      root.materialized.selectionEntries.map((choice) => [
        choice.id,
        choice.constraints[0]?.node.attributes["automatic"],
      ]),
    ).toEqual([
      ["auto-model", "false"],
      ["auto-upgrade", "true"],
    ]);
  });

  it("plans unconditional minimum children and transparent group defaults", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("selection-initialization.cat"),
    ]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) return;
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    expect(contexts.ok).toBe(true);
    if (!contexts.ok) return;
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "selection-initialization",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "initialization-unit",
    );
    expect(root).toBeDefined();
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      return;
    }

    const planned = planRosterSelectionInitialization(root.materialized);

    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.value).toMatchObject({
      choice: root.materialized,
      completeness: "incomplete",
      plannedSelectionCount: 5,
      additions: [
        {
          choice: { id: "required-model", name: "Required Model" },
          quantity: 2,
          initialization: {
            completeness: "complete",
            plannedSelectionCount: 1,
            additions: [
              {
                choice: {
                  id: "required-weapon",
                  name: "Required Weapon",
                },
                quantity: 1,
              },
            ],
          },
        },
        {
          choice: { id: "default-option", name: "Default Option" },
          quantity: 1,
          initialization: {
            plannedSelectionCount: 0,
            additions: [],
          },
        },
      ],
      pendingChoices: [
        {
          group: { id: "manual-group", name: "Manual Group" },
          minimum: 1,
          remaining: 1,
          reason: "defaultDisabled",
        },
      ],
    });
    expect(
      planned.value.additions.some(
        ({ choice }) => choice.kind === "selectionEntryGroup",
      ),
    ).toBe(false);
    expect(planned.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        impacts: ["compatibility"],
        location: expect.objectContaining({
          source: expect.objectContaining({
            filename: "selection-initialization.cat",
          }),
          path: expect.arrayContaining(["constraints[0]", "constraint[0]"]),
        }),
        details: { constraintId: "modified-child-min" },
      }),
    ]);
  });

  it("suppresses automatic additions when the expanded plan exceeds its limit", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("selection-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "selection-initialization",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "initialization-unit",
    );
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected initialization root.");
    }

    const planned = planRosterSelectionInitialization(root.materialized, {
      maxPlannedSelections: 4,
    });

    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.value).toMatchObject({
      completeness: "incomplete",
      plannedSelectionCount: 0,
      additions: [],
    });
    expect(planned.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      "EVALUATION_INITIALIZATION_RESOURCE_LIMIT",
    ]);
  });

  it("inspects transparent groups and their concrete choices in source order", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("selection-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "selection-initialization",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "initialization-unit",
    );
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected initialization root.");
    }

    const inspected = inspectRosterSelectionChoiceGroups(
      root.materialized,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.diagnostics).toEqual([]);
    expect(inspected.value).toMatchObject({
      choice: root.materialized,
      completeness: "complete",
      groups: [
        {
          group: { id: "default-group", name: "Default Group" },
          minimum: 1,
          maximum: 1,
          completeness: "complete",
          choices: [
            { id: "default-option", name: "Default Option" },
            { id: "alternate-option", name: "Alternate Option" },
          ],
        },
        {
          group: { id: "manual-group", name: "Manual Group" },
          minimum: 1,
          maximum: 1,
          completeness: "complete",
          choices: [
            { id: "manual-option-one", name: "Manual Option One" },
            { id: "manual-option-two", name: "Manual Option Two" },
          ],
        },
      ],
    });
    expect(
      inspected.value.groups.flatMap(({ choices }) =>
        choices.map(({ kind }) => kind),
      ),
    ).toEqual([
      "selectionEntry",
      "selectionEntry",
      "selectionEntry",
      "selectionEntry",
    ]);
  });

  it("inspects direct child bounds without guessing modified quantities", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("selection-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "selection-initialization",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "initialization-unit",
    );
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected initialization root.");
    }

    const inspected = inspectRosterSelectionChildChoices(
      root.materialized,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value).toMatchObject({
      completeness: "incomplete",
      direct: [
        {
          choice: { id: "required-model", name: "Required Model" },
          minimum: 2,
          maximum: 2,
          completeness: "complete",
        },
        {
          choice: { id: "modified-child", name: "Modified Child" },
          completeness: "incomplete",
        },
      ],
    });
    expect(inspected.value.direct[1]).not.toHaveProperty("minimum");
    expect(inspected.value.direct[1]).not.toHaveProperty("maximum");
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        details: { constraintId: "modified-child-min" },
      }),
    ]);
  });

  it("plans required roots after applying supported unconditional modifiers", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("selection-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "selection-initialization",
    );
    if (context === undefined) {
      throw new Error("Expected initialization context.");
    }

    const planned = planEmptySingleForceRootInitialization(
      context.roots.roots,
    );

    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.diagnostics).toEqual([]);
    expect(planned.value).toMatchObject({
      completeness: "complete",
      plannedSelectionCount: 1,
      additions: [
        {
          root: {
            materialized: {
              id: "initialization-unit",
              name: "Initialization Unit",
            },
          },
          quantity: 1,
        },
      ],
    });
  });

  it("inspects all resolved root bounds and shared identities in order", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("selection-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "selection-initialization",
    );
    if (context === undefined) {
      throw new Error("Expected initialization context.");
    }

    const inspected = inspectEmptySingleForceRootChoices(
      context.roots.roots,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.diagnostics).toEqual([]);
    expect(inspected.value).toMatchObject({
      completeness: "complete",
      choices: [
        {
          root: {
            materialized: {
              name: "Initialization Unit",
            },
          },
          identity: {
            kind: "definition",
            id: "initialization-unit",
          },
          minimum: 1,
          maximum: 1,
          completeness: "complete",
        },
        {
          root: {
            materialized: {
              name: "Automatic Reconciliation Unit",
            },
          },
          identity: {
            kind: "occurrence",
            id: "automatic-reconciliation-unit",
          },
          minimum: 0,
          completeness: "complete",
        },
        {
          root: {
            materialized: {
              name: "Disabled Automatic Root",
            },
          },
          minimum: 0,
          maximum: 1,
          completeness: "complete",
        },
        {
          root: {
            materialized: {
              name: "Duplicate Initialization Unit",
            },
          },
          identity: {
            kind: "definition",
            id: "initialization-unit",
          },
          minimum: 1,
          maximum: 1,
          completeness: "complete",
        },
        {
          root: {
            materialized: {
              name: "Alpha",
            },
          },
          identity: {
            kind: "occurrence",
            id: "entry-alpha",
          },
          minimum: 0,
          maximum: 3,
          completeness: "complete",
        },
      ],
    });
  });
  it("plans one amounted occurrence for a stepped selection minimum", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("stepped-default-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "stepped-default-initialization",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "stepped-default-root",
    );
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected the stepped fixture root.");
    }

    const planned = planRosterSelectionInitialization(root.materialized);

    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.diagnostics).toEqual([]);
    expect(planned.value).toMatchObject({
      completeness: "complete",
      plannedSelectionCount: 2,
      additions: [
        {
          choice: {
            id: "stepped-default-trigger",
            name: "Default Trigger",
          },
          quantity: 1,
        },
        {
          choice: {
            id: "stepped-default-amount",
            name: "Stepped Amount",
            step: "250",
          },
          quantity: 1,
          amount: 500,
          minimumAmount: 500,
        },
      ],
    });
  });

  it("diagnoses invalid stepped initialization values at their source", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("stepped-default-initialization.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) throw new Error("Expected fixture contexts.");
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "stepped-default-initialization",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "stepped-default-root",
    );
    if (
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected the stepped fixture root.");
    }
    const stepped = root.materialized.selectionEntries.find(
      ({ id }) => id === "stepped-default-amount",
    );
    if (stepped === undefined) {
      throw new Error("Expected the stepped fixture child.");
    }

    const invalidStep = planRosterSelectionInitialization({
      ...root.materialized,
      selectionEntries: [{ ...stepped, step: "not-a-number" }],
    });
    const multipleDefaults = planRosterSelectionInitialization({
      ...root.materialized,
      selectionEntries: [
        {
          ...stepped,
          defaultAmount: "1,1",
        },
      ],
    });

    expect(invalidStep.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_INITIALIZATION_STEP_INVALID",
        location: expect.objectContaining({
          path: [...stepped.occurrence.path, "@step"],
        }),
        details: { value: "not-a-number" },
      }),
    ]);
    expect(multipleDefaults.diagnostics).toEqual([
      expect.objectContaining({
        code:
          "EVALUATION_INITIALIZATION_DEFAULT_AMOUNT_MULTIPLE_UNSUPPORTED",
        location: expect.objectContaining({
          path: [...stepped.occurrence.path, "@defaultAmount"],
        }),
        details: { value: "1,1" },
      }),
    ]);
    expect(invalidStep.ok && multipleDefaults.ok).toBe(true);
    if (!invalidStep.ok || !multipleDefaults.ok) return;
    expect(invalidStep.value.completeness).toBe("incomplete");
    expect(multipleDefaults.value.completeness).toBe("incomplete");
    expect(invalidStep.value.additions).toEqual([]);
    expect(multipleDefaults.value.additions).toEqual([]);
  });
});

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) {
    throw new Error(`Fixture ${filename} must parse.`);
  }
  return parsed.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-23T00:00:00.000Z",
  };
}
