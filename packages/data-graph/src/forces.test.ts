import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import { composeBattleScribeForceDefinitions } from "./forces.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe force-definition composition", () => {
  it("composes ordered game-system and catalogue definitions with nested forces", () => {
    const { result, gameSystem, catalogue } = composedProjectionForces();

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
      "force-patrol",
      "force-local",
    ]);
    expect(
      view.definitions.some(
        (definition) => definition.source.id === "force-library",
      ),
    ).toBe(false);
    expect(view.gameSystemDefinitions[0]?.forceEntries[0]?.source).toBe(
      gameSystem.projection.forceEntries[0]?.forceEntries[0],
    );
    expect(view.gameSystemDefinitions[0]?.forceEntries[0]?.origin).toEqual({
      kind: "gameSystem",
      document: gameSystem,
    });
    expect(view.catalogueDefinitions[0]?.origin).toEqual({ kind: "catalogue" });
  });

  it("resolves force categories without choosing missing or ambiguous targets", () => {
    const { result, catalogue } = composedProjectionForces();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const definition = result.value.byDocument.get(catalogue)
      ?.catalogueDefinitions[0];
    expect(definition).toBeDefined();
    if (definition === undefined) {
      return;
    }

    expect(
      definition.categoryLinks.map((categoryLink) => categoryLink.status),
    ).toEqual(["resolved", "ambiguous", "missing", "missingTargetId"]);
    expect(definition.categoryLinks[0]?.targets[0]?.source.id).toBe(
      "category-local",
    );
    expect(definition.categoryLinks[1]?.targets).toHaveLength(2);
    expect(definition.categoryLinks[2]?.targets).toEqual([]);
    expect(definition.categoryLinks[3]).toMatchObject({
      targetId: undefined,
      targets: [],
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BS_FORCE_DEFINITIONS_AMBIGUOUS_CATEGORY",
          details: expect.objectContaining({ reason: "ambiguous" }),
        }),
        expect.objectContaining({
          code: "BS_FORCE_DEFINITIONS_MISSING_CATEGORY",
          details: expect.objectContaining({ reason: "missing" }),
        }),
        expect.objectContaining({
          code: "BS_FORCE_DEFINITIONS_MISSING_CATEGORY",
          details: expect.objectContaining({ reason: "missingTargetId" }),
        }),
      ]),
    );
  });

  it("retains projections, generic nodes, source documents, and original bytes", () => {
    const { result, gameSystem, catalogue } = composedProjectionForces();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const view = result.value.byDocument.get(catalogue);
    const definition = view?.gameSystemDefinitions[0];
    expect(definition?.source).toBe(gameSystem.projection.forceEntries[0]);
    expect(definition?.source.node).toBe(
      gameSystem.projection.forceEntries[0]?.node,
    );
    expect(definition?.sourceDocument).toBe(gameSystem);
    expect(definition?.sourceDocument.sourceBytes).toBe(gameSystem.sourceBytes);
    expect(definition?.source.constraints[0]?.value).toBe(0);
    expect(Object.hasOwn(definition ?? {}, "validity")).toBe(false);
  });

  it("reports a missing game system while retaining catalogue-local definitions", () => {
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

    const result = composeBattleScribeForceDefinitions(graph.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.catalogues[0]?.gameSystem?.status).toBe("missing");
    expect(
      result.value.catalogues[0]?.catalogueDefinitions.map(
        (definition) => definition.source.id,
      ),
    ).toEqual(["force-local"]);
    expect(result.value.catalogues[0]?.gameSystemDefinitions).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_FORCE_DEFINITIONS_MISSING_GAME_SYSTEM",
        location: expect.objectContaining({
          path: expect.arrayContaining(["@gameSystemId"]),
        }),
      }),
    );
  });

  it("does not choose between duplicate game-system definitions", () => {
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

    const result = composeBattleScribeForceDefinitions(graph.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.catalogues[0]?.gameSystem).toMatchObject({
      status: "ambiguous",
      targetDocuments: [firstGameSystem.value, secondGameSystem.value],
    });
    expect(result.value.catalogues[0]?.gameSystemDefinitions).toEqual([]);
    expect(
      result.value.catalogues[0]?.catalogueDefinitions.map(
        (definition) => definition.source.id,
      ),
    ).toEqual(["force-local"]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_FORCE_DEFINITIONS_AMBIGUOUS_GAME_SYSTEM",
      }),
    );
  });
});

function composedProjectionForces() {
  const gameSystem = parseFixture("projection.gst");
  const catalogue = parseFixture("projection.cat");
  const library = parseFixture("graph-library.cat");
  expect(gameSystem.ok).toBe(true);
  expect(catalogue.ok).toBe(true);
  expect(library.ok).toBe(true);
  if (!gameSystem.ok || !catalogue.ok || !library.ok) {
    throw new Error("Force fixtures must parse.");
  }
  const graph = resolveBattleScribeDataGraph([
    gameSystem.value,
    catalogue.value,
    library.value,
  ]);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Force fixture graph must resolve.");
  }

  return {
    result: composeBattleScribeForceDefinitions(graph.value),
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
