import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
  type MaterializedSelectionEntry,
} from "@rosterforge/data-graph";
import {
  objectId,
  sourceId,
  type SourceFileProvenance,
} from "@rosterforge/foundation";
import {
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
  createRoster,
  forceOccurrenceId,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { inspectRosterSelectionDefaultAmount } from "./selection-default-amount.js";

describe("selection default amounts", () => {
  it("applies a direct conditional default at the prospective parent", () => {
    const fixture = steppedFixture();
    const report = inspectRosterSelectionDefaultAmount(
      fixture.roster,
      fixture.context,
      fixture.owner,
      fixture.choice,
    );

    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.diagnostics).toEqual([]);
    expect(report.value).toMatchObject({
      baseAmount: 0,
      amount: 1_000,
      completeness: "complete",
      modifierApplicability: [
        {
          status: "applicable",
          completeness: "complete",
          conditions: [{ status: "satisfied", observed: 1 }],
        },
      ],
      modifierSequence: {
        value: 1_000,
        completeness: "complete",
        steps: [{ status: "applied", input: 0, output: 1_000 }],
      },
    });
  });

  it("locates invalid and multiple source defaults on the attribute", () => {
    const fixture = steppedFixture();
    const invalid = inspectRosterSelectionDefaultAmount(
      fixture.roster,
      fixture.context,
      fixture.owner,
      {
        ...fixture.choice,
        defaultAmount: "not-a-number",
        modifiers: [],
      },
    );
    const multiple = inspectRosterSelectionDefaultAmount(
      fixture.roster,
      fixture.context,
      fixture.owner,
      {
        ...fixture.choice,
        defaultAmount: "1,1",
        modifiers: [],
      },
    );

    for (const report of [invalid, multiple]) {
      expect(report.ok).toBe(true);
      if (!report.ok) continue;
      expect(report.value.completeness).toBe("incomplete");
      expect(report.value).not.toHaveProperty("amount");
      expect(report.diagnostics[0]?.location).toEqual({
        source: fixture.choice.occurrence.source,
        path: [...fixture.choice.occurrence.path, "@defaultAmount"],
      });
    }
    expect(invalid.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_SELECTION_DEFAULT_AMOUNT_INVALID",
    ]);
    expect(multiple.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_SELECTION_DEFAULT_AMOUNT_MULTIPLE_UNSUPPORTED",
    ]);
  });

  it("withholds grouped defaults and rejects an invalid result", () => {
    const fixture = steppedFixture();
    const modifier = fixture.choice.modifiers[0];
    if (modifier === undefined) {
      throw new Error("Expected the fixture default modifier.");
    }
    const negative = inspectRosterSelectionDefaultAmount(
      fixture.roster,
      fixture.context,
      fixture.owner,
      {
        ...fixture.choice,
        modifiers: [
          {
            ...modifier,
            value: "-1",
            conditions: [],
          },
        ],
      },
    );
    const grouped = inspectRosterSelectionDefaultAmount(
      fixture.roster,
      fixture.context,
      fixture.owner,
      {
        ...fixture.choice,
        modifiers: [],
        modifierGroups: [
          {
            type: "and",
            source: modifier.source,
            path: [...modifier.path, "modifierGroup[synthetic]"],
            node: modifier.node,
            sourceNode: modifier.sourceNode,
            modifiers: [modifier],
            modifierGroups: [],
            conditions: [],
            conditionGroups: [],
            repeats: [],
          },
        ],
      },
    );

    expect(negative.ok && negative.value).toMatchObject({
      completeness: "incomplete",
    });
    if (negative.ok) {
      expect(negative.value).not.toHaveProperty("amount");
    }
    expect(negative.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_SELECTION_DEFAULT_AMOUNT_RESULT_INVALID",
    ]);
    expect(grouped.ok && grouped.value).toMatchObject({
      baseAmount: 0,
      amount: 0,
      completeness: "incomplete",
    });
    expect(grouped.diagnostics).toEqual([
      expect.objectContaining({
        code:
          "EVALUATION_SELECTION_DEFAULT_AMOUNT_MODIFIER_GROUP_UNSUPPORTED",
        location: {
          source: modifier.source,
          path: [...modifier.path, "modifierGroup[synthetic]"],
        },
        details: { modifierGroups: 1 },
      }),
    ]);
  });
});

function steppedFixture(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: Roster["forces"][number]["selections"][number];
  readonly choice: MaterializedSelectionEntry;
} {
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
  )?.materialized;
  if (
    context === undefined ||
    root === undefined ||
    root.kind === "unresolvedEntryLink"
  ) {
    throw new Error("Expected stepped fixture context and root.");
  }
  const trigger = root.selectionEntries.find(
    ({ id }) => id === "stepped-default-trigger",
  );
  const choice = root.selectionEntries.find(
    ({ id }) => id === "stepped-default-amount",
  );
  const force = context.forces.definitions[0];
  if (trigger === undefined || choice === undefined || force === undefined) {
    throw new Error("Expected stepped fixture definitions.");
  }

  let roster = createRoster({
    id: rosterId("default-amount-roster"),
    name: "Default Amount Roster",
    catalogue: definitionReference(context.document.projection, "catalogue"),
  });
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("default-amount-force"),
      definition: definitionReference(force.source, "forceEntry"),
    }),
  );
  roster = successful(
    addRosterSelectionToForce(
      roster,
      forceOccurrenceId("default-amount-force"),
      {
        id: selectionOccurrenceId("default-amount-root"),
        definition: definitionReference(root.occurrence, "selectionEntry"),
      },
    ),
  );
  for (const [id, selected, amount] of [
    ["default-amount-trigger", trigger, undefined],
    ["default-amount-owner", choice, 500],
  ] as const) {
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("default-amount-root"),
        {
          id: selectionOccurrenceId(id),
          definition: definitionReference(
            selected.occurrence,
            "selectionEntry",
          ),
          ...(amount === undefined ? {} : { amount }),
        },
      ),
    );
  }
  const owner = roster.forces[0]?.selections[0]?.selections[1];
  if (owner === undefined) throw new Error("Expected default-amount owner.");
  return { context, roster, owner, choice };
}

function definitionReference<
  const Kind extends "catalogue" | "forceEntry" | "selectionEntry",
>(
  source: {
    readonly source: SourceFileProvenance;
    readonly path: readonly string[];
    readonly node?: { readonly attributes: Readonly<Record<string, string>> };
  },
  kind: Kind,
) {
  const sourceIdValue = source.node?.attributes["id"];
  return {
    kind,
    key: rosterDefinitionKeyForSource(source.source.sourceId, source.path),
    ...(sourceIdValue === undefined
      ? {}
      : { sourceId: objectId(sourceIdValue) }),
  };
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

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) throw new Error(`Fixture ${filename} must parse.`);
  return parsed.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-08-22T00:00:00.000Z",
  };
}
