import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
} from "@rosterforge/data-graph";
import {
  sourceId,
  type SourceFileProvenance,
} from "@rosterforge/foundation";
import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  indexEvaluationChoices,
  rosterSelectionLocations,
} from "./selection-context.js";

describe("evaluation choice index", () => {
  /**
   * The guard on the worst performance defect this project has had.
   *
   * Building this index walks the whole catalogue. Eight modules ask for it,
   * several per selection and per field, and before it was cached a single
   * structural inspection of a one-unit Dark Angels roster rebuilt it 23 times
   * and visited 2.84 million nodes. Validating six units took 127 seconds.
   *
   * Identity rather than timing: a wall-clock budget on a synthetic fixture
   * this small would have to be so loose it would never fail, and would be
   * flaky when it did. If the cache is removed, this fails immediately and
   * says why.
   */
  it("builds one index per catalogue context and reuses it", () => {
    const context = fixtureContext();

    const first = indexEvaluationChoices(context);
    const second = indexEvaluationChoices(context);

    expect(second).toBe(first);
    expect(second.byKey).toBe(first.byKey);
  });

  it("indexes each context separately", () => {
    const one = fixtureContext();
    const other = fixtureContext();

    // Freshly composed contexts are different objects describing the same
    // documents, so each gets its own entry rather than colliding.
    //
    // Compared as booleans and key counts on purpose: an index holds the whole
    // materialized tree, and handing one to `expect` makes a failure spend
    // twenty seconds serialising it.
    expect(one === other).toBe(false);
    expect(indexEvaluationChoices(one) === indexEvaluationChoices(other)).toBe(
      false,
    );
    expect(indexEvaluationChoices(other).byKey.size).toBe(
      indexEvaluationChoices(one).byKey.size,
    );
  });
});

describe("roster selection locations", () => {
  /**
   * The second half of the same defect.
   *
   * Seven modules flatten the roster this way, several inside loops. Measured
   * 2026-08-23 on a 143-selection Dark Angels army: **2,763 walks in a single
   * structural inspection**, each visiting every selection.
   *
   * Rosters are immutable and every command returns a new one, so a cached walk
   * cannot describe a stale tree — an edited roster is a different key.
   */
  it("walks a roster once and reuses the result", () => {
    const roster = fixtureRoster();

    expect(rosterSelectionLocations(roster)).toBe(
      rosterSelectionLocations(roster),
    );
  });

  it("walks an edited roster separately", () => {
    const roster = fixtureRoster();
    const edited: Roster = { ...roster, name: "Edited" };

    const first = rosterSelectionLocations(roster);
    const second = rosterSelectionLocations(edited);

    // Booleans, not the arrays: a location holds the occurrence and all of its
    // ancestors, so a failing deep comparison prints the whole tree.
    expect(first === second).toBe(false);
    expect(second.length).toBe(first.length);
  });
});

function fixtureRoster(): Roster {
  return {
    id: rosterId("locations"),
    name: "Locations",
    catalogue: {
      kind: "catalogue",
      key: rosterDefinitionKey("fixture:catalogue"),
    },
    forces: [
      {
        id: forceOccurrenceId("force-1"),
        definition: {
          kind: "forceEntry",
          key: rosterDefinitionKey("fixture:force"),
        },
        forces: [],
        selections: [
          {
            id: selectionOccurrenceId("parent"),
            definition: {
              kind: "selectionEntry",
              key: rosterDefinitionKey("fixture:parent"),
            },
            selections: [
              {
                id: selectionOccurrenceId("child"),
                definition: {
                  kind: "selectionEntry",
                  key: rosterDefinitionKey("fixture:child"),
                },
                selections: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

function fixtureContext(): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("selection-initialization.cat"),
  ]);
  if (!graph.ok) throw new Error("Expected fixture graph.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Expected fixture contexts.");
  const context = contexts.value.catalogues.find(
    ({ document }) => document.metadata.id === "selection-initialization",
  );
  if (context === undefined) throw new Error("Expected fixture context.");
  return context;
}

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) throw new Error(`Expected fixture ${filename} to parse.`);
  return parsed.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-08-23T00:00:00.000Z",
  };
}
