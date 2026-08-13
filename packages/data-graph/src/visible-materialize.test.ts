import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import {
  materializeBattleScribeSelections,
  materializeBattleScribeVisibleRoots,
  type BattleScribeVisibleRootMaterialization,
  type MaterializedVisibleCatalogueRoots,
} from "./materialize.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe visible-root materialization", () => {
  it("materializes local, game-system, and catalogue-imported roots in visibility order", () => {
    const materialization = composedFixture();
    const primary = catalogueView(materialization.value, "visibility-primary");

    expect(
      primary.selectionEntries.map((root) => root.materialized.id),
    ).toEqual([
      "primary-false",
      "primary-absent-root",
      "entry-alpha",
      "branch-visible",
      "leaf-first",
      "leaf-second",
    ]);
    expect(
      primary.selectionEntryGroups.map((root) => root.materialized.id),
    ).toEqual(["primary-group", "leaf-group"]);
    expect(primary.entryLinks.map((root) => root.visible.source.id)).toEqual([
      "primary-link",
      "leaf-link",
    ]);
    expect(primary.roots.map((root) => root.visible.source.id)).toEqual(
      primary.visibility.roots.map((root) => root.source.id),
    );
  });

  it("keeps visibility origin, occurrence, definition, and source documents distinct", () => {
    const materialization = composedFixture();
    const primary = catalogueView(materialization.value, "visibility-primary");
    const importedLink = primary.entryLinks.find(
      (root) => root.visible.source.id === "leaf-link",
    );

    expect(importedLink?.visible.origin.kind).toBe("catalogueImport");
    if (importedLink?.visible.origin.kind === "catalogueImport") {
      expect(importedLink.visible.origin.path.map((link) => link.id)).toEqual([
        "primary-branch",
        "branch-leaf",
      ]);
    }
    expect(importedLink?.materialized.kind).toBe("selectionEntry");
    if (importedLink?.materialized.kind === "selectionEntry") {
      expect(importedLink.materialized.occurrence).toBe(
        importedLink.visible.source,
      );
      expect(importedLink.materialized.sourceDocument).toBe(
        importedLink.visible.sourceDocument,
      );
      expect(importedLink.materialized.definition.id).toBe("leaf-shared");
      expect(importedLink.materialized.definitionDocument).toBe(
        importedLink.visible.sourceDocument,
      );
      expect(importedLink.materialized.definition.node).toBe(
        importedLink.materialized.definitionDocument.projection
          .sharedSelectionEntries[0]?.node,
      );
    }
  });

  it("shares immutable materialized roots reached by multiple catalogue views", () => {
    const materialization = composedFixture();
    const primary = catalogueView(materialization.value, "visibility-primary");
    const leaf = catalogueView(materialization.value, "visibility-leaf");
    const imported = primary.selectionEntries.find(
      (root) => root.visible.source.id === "leaf-first",
    );
    const local = leaf.selectionEntries.find(
      (root) => root.visible.source.id === "leaf-first",
    );

    expect(imported?.visible).not.toBe(local?.visible);
    expect(imported?.visible.source).toBe(local?.visible.source);
    expect(imported?.materialized).toBe(local?.materialized);
    expect(imported?.materialized.definition).toBe(imported?.visible.source);
    expect(imported?.materialized.definition.node).toBe(
      imported?.visible.source.node,
    );
  });

  it("combines visibility diagnostics and materialization limits into a partial composed view", () => {
    const documents = parsedFixtures();
    const graph = resolveBattleScribeDataGraph(documents);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const standard = materializeBattleScribeSelections(graph.value);
    const composed = materializeBattleScribeVisibleRoots(graph.value, {
      limits: {
        maxEntryLinkDepth: 64,
        maxExpandedEntryLinks: 1,
        maxTotalExpandedEntryLinks: 1,
      },
    });

    expect(standard.ok).toBe(true);
    expect(composed.ok).toBe(true);
    if (!composed.ok) {
      return;
    }
    expect(composed.value.expandedEntryLinks).toBe(1);
    expect(composed.value.truncated).toBe(true);
    const primary = catalogueView(composed.value, "visibility-primary");
    const limited = primary.entryLinks.find(
      (root) => root.visible.source.id === "leaf-link",
    );
    expect(limited?.materialized).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "resourceLimit",
      }),
    );
    expect(composed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BS_ROOT_VISIBILITY_MISSING_CATALOGUE",
        }),
        expect.objectContaining({
          code: "BS_MATERIALIZATION_RESOURCE_LIMIT",
        }),
      ]),
    );
    expect(graph.value.documents).toEqual(documents);
  });
});

function composedFixture() {
  const graph = resolveBattleScribeDataGraph(parsedFixtures());
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Composed fixture graph must resolve.");
  }
  const materialization = materializeBattleScribeVisibleRoots(graph.value);
  expect(materialization.ok).toBe(true);
  if (!materialization.ok) {
    throw new Error("Visible roots must materialize.");
  }
  return materialization;
}

function catalogueView(
  materialization: BattleScribeVisibleRootMaterialization,
  id: string,
): MaterializedVisibleCatalogueRoots {
  const view = materialization.catalogues.find(
    (catalogue) => catalogue.document.metadata.id === id,
  );
  if (view === undefined) {
    throw new Error(`Missing visible-root materialization ${id}.`);
  }
  return view;
}

function parsedFixtures() {
  return [
    "projection.gst",
    "visibility-primary.cat",
    "visibility-branch.cat",
    "visibility-leaf.cat",
  ].map((filename) => {
    const parsed = parseBattleScribeXml(fixtureBytes(filename), {
      source: provenance(filename),
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(`Fixture ${filename} must parse.`);
    }
    return parsed.value;
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
