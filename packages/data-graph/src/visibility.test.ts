import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import { resolveBattleScribeDataGraph } from "./resolve.js";
import {
  resolveBattleScribeRootVisibility,
  type BattleScribeCatalogueRootVisibility,
} from "./visibility.js";

describe("BattleScribe catalogue-root visibility", () => {
  it("keeps local roots and imports only explicitly eligible external roots", () => {
    const { primary } = visibleFixtures();

    expect(primary.selectionEntries.map((root) => root.source.id)).toEqual([
      "primary-false",
      "primary-absent-root",
      "entry-alpha",
      "branch-visible",
      "leaf-first",
      "leaf-second",
    ]);
    expect(
      primary.selectionEntryGroups.map((root) => root.source.id),
    ).toEqual(["primary-group", "leaf-group"]);
    expect(primary.entryLinks.map((root) => root.source.id)).toEqual([
      "primary-link",
      "leaf-link",
    ]);

    const visibleIds = primary.roots.map((root) => root.source.id);
    expect(visibleIds).not.toContain("branch-false");
    expect(visibleIds).not.toContain("leaf-false");
    expect(visibleIds).not.toContain("leaf-absent");
    expect(visibleIds).not.toContain("leaf-shared");
    expect(visibleIds).not.toContain("primary-shared");
  });

  it("traverses enabled imports depth-first while deduplicating cycles and repeated catalogues", () => {
    const { primary } = visibleFixtures();

    expect(
      primary.catalogueImports.map((attempt) => [
        attempt.link.id,
        attempt.status,
      ]),
    ).toEqual([
      ["primary-branch", "resolved"],
      ["branch-leaf", "resolved"],
      ["leaf-cycle", "alreadyVisible"],
      ["branch-missing", "missing"],
      ["primary-leaf-again", "alreadyVisible"],
      ["primary-disabled", "disabled"],
      ["primary-absent", "disabled"],
    ]);

    const leaf = primary.selectionEntries.find(
      (root) => root.source.id === "leaf-first",
    );
    expect(leaf?.origin.kind).toBe("catalogueImport");
    if (leaf?.origin.kind === "catalogueImport") {
      expect(leaf.origin.path.map((link) => link.id)).toEqual([
        "primary-branch",
        "branch-leaf",
      ]);
    }
    expect(
      primary.selectionEntries.filter(
        (root) => root.source.id === "leaf-first",
      ),
    ).toHaveLength(1);
  });

  it("preserves absent and explicit false import controls as distinct source values", () => {
    const { primary } = visibleFixtures();
    const explicitFalse = primary.catalogueImports.find(
      (attempt) => attempt.link.id === "primary-disabled",
    );
    const absent = primary.catalogueImports.find(
      (attempt) => attempt.link.id === "primary-absent",
    );

    expect(explicitFalse?.status).toBe("disabled");
    expect(explicitFalse?.link.importRootEntries).toBe(false);
    expect(explicitFalse?.targetDocuments).toHaveLength(1);
    expect(absent?.status).toBe("disabled");
    expect(absent?.link.importRootEntries).toBeUndefined();
    expect(absent?.targetDocuments).toHaveLength(1);
    expect(
      Object.hasOwn(absent?.link ?? {}, "importRootEntries"),
    ).toBe(false);
  });

  it("retains projected nodes, generic XML nodes, provenance, and source bytes by reference", () => {
    const { primary, documents } = visibleFixtures();
    const leafDocument = documents.find(
      (document) => document.metadata.id === "visibility-leaf",
    );
    const visibleLeaf = primary.selectionEntries.find(
      (root) => root.source.id === "leaf-first",
    );

    expect(visibleLeaf?.sourceDocument).toBe(leafDocument);
    expect(visibleLeaf?.source).toBe(
      leafDocument?.projection.selectionEntries[0],
    );
    expect(visibleLeaf?.source.node).toBe(
      leafDocument?.projection.selectionEntries[0]?.node,
    );
    expect(visibleLeaf?.source.source).toBe(leafDocument?.source);
    expect(visibleLeaf?.sourceDocument.sourceBytes).toBe(
      leafDocument?.sourceBytes,
    );
  });

  it("reports source-located missing imports without fetching documents", () => {
    const { visibility, primary, documents } = visibleFixtures();
    const missing = primary.catalogueImports.find(
      (attempt) => attempt.link.id === "branch-missing",
    );

    expect(missing).toEqual(
      expect.objectContaining({
        status: "missing",
        targetId: "visibility-missing",
        targetDocuments: [],
      }),
    );
    expect(visibility.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_ROOT_VISIBILITY_MISSING_CATALOGUE",
        severity: "warning",
        impacts: ["resolution"],
        location: expect.objectContaining({
          path: expect.arrayContaining(["@targetId"]),
        }),
        details: expect.objectContaining({
          targetId: "visibility-missing",
          candidates: 0,
        }),
      }),
    );
    expect(visibility.value.graph.documents).toHaveLength(documents.length);
  });

  it("keeps ambiguous catalogue imports unresolved and observable", () => {
    const documents = parsedFixtures();
    const duplicateLeaf = parseFixture(
      "visibility-leaf.cat",
      "visibility-leaf-copy.cat",
    );
    expect(duplicateLeaf.ok).toBe(true);
    if (!duplicateLeaf.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([
      ...documents,
      duplicateLeaf.value,
    ]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const visibility = resolveBattleScribeRootVisibility(graph.value);
    expect(visibility.ok).toBe(true);
    if (!visibility.ok) {
      return;
    }
    const primary = catalogueView(visibility.value.catalogues, "visibility-primary");
    const ambiguous = primary.catalogueImports.find(
      (attempt) => attempt.link.id === "branch-leaf",
    );

    expect(ambiguous?.status).toBe("ambiguous");
    expect(ambiguous?.targetDocuments).toHaveLength(2);
    expect(primary.roots.map((root) => root.source.id)).not.toContain(
      "leaf-first",
    );
    expect(visibility.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_ROOT_VISIBILITY_AMBIGUOUS_CATALOGUE",
        details: expect.objectContaining({
          targetId: "visibility-leaf",
          candidates: 2,
        }),
      }),
    );
  });
});

function visibleFixtures() {
  const documents = parsedFixtures();
  const graph = resolveBattleScribeDataGraph(documents);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Visibility graph must resolve.");
  }
  const visibility = resolveBattleScribeRootVisibility(graph.value);
  expect(visibility.ok).toBe(true);
  if (!visibility.ok) {
    throw new Error("Visibility projection must succeed.");
  }
  return {
    documents,
    visibility,
    primary: catalogueView(
      visibility.value.catalogues,
      "visibility-primary",
    ),
  };
}

function parsedFixtures() {
  return [
    "projection.gst",
    "visibility-primary.cat",
    "visibility-branch.cat",
    "visibility-leaf.cat",
  ].map((filename) => {
    const parsed = parseFixture(filename);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(`Fixture ${filename} must parse.`);
    }
    return parsed.value;
  });
}

function catalogueView(
  catalogues: readonly BattleScribeCatalogueRootVisibility[],
  id: string,
): BattleScribeCatalogueRootVisibility {
  const view = catalogues.find(
    (catalogue) => catalogue.document.metadata.id === id,
  );
  if (view === undefined) {
    throw new Error(`Missing catalogue visibility view ${id}.`);
  }
  return view;
}

function parseFixture(filename: string, provenanceName = filename) {
  return parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(provenanceName),
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
