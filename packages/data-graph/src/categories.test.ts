import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import { composeBattleScribeCategoryDefinitions } from "./categories.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe category-definition composition", () => {
  it("composes ordered game-system and catalogue-local category definitions", () => {
    const { result, gameSystem, catalogue } = composedCategories();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const view = result.value.byDocument.get(catalogue);
    expect(view).toBeDefined();
    if (view === undefined) {
      return;
    }

    expect(view.gameSystem).toEqual({
      targetId: "system-203",
      status: "resolved",
      targetDocuments: [gameSystem],
    });
    expect(view.definitions.map((definition) => definition.source.id)).toEqual([
      "category-unit",
      "category-local",
      "category-duplicate",
      "category-duplicate",
    ]);
    expect(view.gameSystemDefinitions[0]?.origin).toEqual({
      kind: "gameSystem",
      document: gameSystem,
    });
    expect(view.catalogueDefinitions[0]?.origin).toEqual({ kind: "catalogue" });
  });

  it("does not inherit category definitions from linked catalogues", () => {
    const { result, catalogue } = composedCategories();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(
      result.value.byDocument
        .get(catalogue)
        ?.definitions.some(
          (definition) => definition.source.id === "category-library",
        ),
    ).toBe(false);
  });

  it("retains source projections, generic XML, provenance, and bytes", () => {
    const { result, gameSystem, catalogue } = composedCategories();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const definition = result.value.byDocument.get(catalogue)
      ?.gameSystemDefinitions[0];
    expect(definition?.source).toBe(gameSystem.projection.categoryEntries[0]);
    expect(definition?.source.node).toBe(
      gameSystem.projection.categoryEntries[0]?.node,
    );
    expect(definition?.sourceDocument).toBe(gameSystem);
    expect(definition?.sourceDocument.sourceBytes).toBe(gameSystem.sourceBytes);
  });

  it("keeps local categories when the matching game system is unavailable", () => {
    const catalogue = parseFixture("projection.cat");
    expect(catalogue.ok).toBe(true);
    if (!catalogue.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([catalogue.value]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const result = composeBattleScribeCategoryDefinitions(graph.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.catalogues[0]?.gameSystem?.status).toBe("missing");
    expect(
      result.value.catalogues[0]?.catalogueDefinitions.map(
        (definition) => definition.source.id,
      ),
    ).toEqual([
      "category-local",
      "category-duplicate",
      "category-duplicate",
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_CATEGORY_DEFINITIONS_MISSING_GAME_SYSTEM",
        location: expect.objectContaining({
          path: expect.arrayContaining(["@gameSystemId"]),
        }),
      }),
    );
  });

  it("does not choose between duplicate matching game systems", () => {
    const firstGameSystem = parseFixture("projection.gst");
    const secondGameSystem = parseFixture("projection.gst");
    const catalogue = parseFixture("projection.cat");
    expect(firstGameSystem.ok).toBe(true);
    expect(secondGameSystem.ok).toBe(true);
    expect(catalogue.ok).toBe(true);
    if (!firstGameSystem.ok || !secondGameSystem.ok || !catalogue.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([
      firstGameSystem.value,
      secondGameSystem.value,
      catalogue.value,
    ]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const result = composeBattleScribeCategoryDefinitions(graph.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.catalogues[0]?.gameSystem).toMatchObject({
      status: "ambiguous",
      targetDocuments: [firstGameSystem.value, secondGameSystem.value],
    });
    expect(result.value.catalogues[0]?.gameSystemDefinitions).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_CATEGORY_DEFINITIONS_AMBIGUOUS_GAME_SYSTEM",
      }),
    );
  });
});

function composedCategories() {
  const gameSystem = parseFixture("projection.gst");
  const catalogue = parseFixture("projection.cat");
  const library = parseFixture("graph-library.cat");
  expect(gameSystem.ok).toBe(true);
  expect(catalogue.ok).toBe(true);
  expect(library.ok).toBe(true);
  if (!gameSystem.ok || !catalogue.ok || !library.ok) {
    throw new Error("Category fixtures must parse.");
  }
  const graph = resolveBattleScribeDataGraph([
    gameSystem.value,
    catalogue.value,
    library.value,
  ]);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Category fixture graph must resolve.");
  }

  return {
    result: composeBattleScribeCategoryDefinitions(graph.value),
    gameSystem: gameSystem.value,
    catalogue: catalogue.value,
  };
}

function parseFixture(filename: string) {
  return parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
}

function fixtureBytes(filename: string): Uint8Array {
  return readFileSync(
    new URL(`../../test-fixtures/fixtures/${filename}`, import.meta.url),
  );
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-20T00:00:00.000Z",
  };
}
