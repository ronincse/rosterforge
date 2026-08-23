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
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { indexEvaluationChoices } from "./selection-context.js";

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
