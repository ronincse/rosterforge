import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import { composeBattleScribeCatalogueContexts } from "./context.js";
import type {
  BattleScribeCatalogueContext,
  BattleScribeCatalogueContexts,
} from "./context.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe catalogue contexts", () => {
  it("composes existing root, force, category, and profile views by identity", () => {
    const { result, catalogue } = projectionContext();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const context = result.value.byDocument.get(catalogue);
    expect(context).toBeDefined();
    if (context === undefined) {
      return;
    }

    expect(context.graph).toBe(result.value.graph);
    expect(context.roots).toBe(result.value.roots.byDocument.get(catalogue));
    expect(context.forces).toBe(
      result.value.forces.byDocument.get(catalogue),
    );
    expect(context.categories).toBe(
      result.value.categories.byDocument.get(catalogue),
    );
    expect(context.roots.selectionEntries[0]?.materialized.id).toBe(
      "entry-alpha",
    );
    expect(context.forces.definitions.map((item) => item.source.id)).toEqual([
      "force-patrol",
      "force-local",
    ]);
    expect(
      context.categories.definitions.map((item) => item.source.id),
    ).toEqual([
      "category-unit",
      "category-local",
      "category-duplicate",
      "category-duplicate",
    ]);
    expect(
      result.value.profileContainment.profiles.some(
        (profile) => profile.source.id === "containment-mismatch-profile",
      ),
    ).toBe(true);
  });

  it("combines component diagnostics once in deterministic stage order", () => {
    const { result } = projectionContext();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain("BS_ROOT_VISIBILITY_MISSING_CATALOGUE");
    expect(codes).toContain("BS_FORCE_DEFINITIONS_AMBIGUOUS_CATEGORY");
    expect(codes).toContain("BS_FORCE_DEFINITIONS_MISSING_CATEGORY");
    expect(codes).toContain("BS_PROFILE_CHARACTERISTIC_TYPE_MISMATCH");
    expect(codes).not.toContain("BS_GRAPH_DUPLICATE_ID");
    expect(codes.indexOf("BS_ROOT_VISIBILITY_MISSING_CATALOGUE")).toBeLessThan(
      codes.indexOf("BS_FORCE_DEFINITIONS_AMBIGUOUS_CATEGORY"),
    );
    expect(
      codes.indexOf("BS_FORCE_DEFINITIONS_AMBIGUOUS_CATEGORY"),
    ).toBeLessThan(
      codes.indexOf("BS_PROFILE_CHARACTERISTIC_TYPE_MISMATCH"),
    );
    expect(
      codes.filter(
        (code) => code === "BS_PROFILE_CHARACTERISTIC_TYPE_MISMATCH",
      ),
    ).toHaveLength(1);
  });

  it("uses independent per-catalogue budgets under the total materialization cap", () => {
    const graph = resolveBattleScribeDataGraph(visibilityFixtures());
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const result = composeBattleScribeCatalogueContexts(graph.value, {
      limits: {
        maxEntryLinkDepth: 64,
        maxExpandedEntryLinks: 1,
        maxTotalExpandedEntryLinks: 100,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.roots.expandedEntryLinks).toBe(2);
    expect(result.value.roots.truncated).toBe(true);
    const primary = catalogueContext(result.value, "visibility-primary");
    expect(
      primary.roots.entryLinks.some(
        (root) =>
          root.materialized.kind === "unresolvedEntryLink" &&
          root.materialized.reason === "resourceLimit",
      ),
    ).toBe(true);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "BS_MATERIALIZATION_RESOURCE_LIMIT" }),
    );
  });

  it("retains partial local definitions without adding roster or validation behavior", () => {
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

    const result = composeBattleScribeCatalogueContexts(graph.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const context = result.value.catalogues[0];
    expect(context?.forces.catalogueDefinitions).toHaveLength(1);
    expect(context?.categories.catalogueDefinitions).toHaveLength(3);
    expect(context?.forces.gameSystem?.status).toBe("missing");
    expect(context?.categories.gameSystem?.status).toBe("missing");
    expect(Object.hasOwn(context ?? {}, "roster")).toBe(false);
    expect(Object.hasOwn(context ?? {}, "validity")).toBe(false);
  });
});

function projectionContext() {
  const gameSystem = parseFixture("projection.gst");
  const catalogue = parseFixture("projection.cat");
  const library = parseFixture("graph-library.cat");
  expect(gameSystem.ok).toBe(true);
  expect(catalogue.ok).toBe(true);
  expect(library.ok).toBe(true);
  if (!gameSystem.ok || !catalogue.ok || !library.ok) {
    throw new Error("Catalogue context fixtures must parse.");
  }
  const graph = resolveBattleScribeDataGraph([
    gameSystem.value,
    catalogue.value,
    library.value,
  ]);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Catalogue context graph must resolve.");
  }
  return {
    result: composeBattleScribeCatalogueContexts(graph.value),
    catalogue: catalogue.value,
  };
}

function catalogueContext(
  contexts: BattleScribeCatalogueContexts,
  id: string,
): BattleScribeCatalogueContext {
  const context = contexts.catalogues.find(
    (catalogue) => catalogue.document.metadata.id === id,
  );
  if (context === undefined) {
    throw new Error(`Missing catalogue context ${id}.`);
  }
  return context;
}

function visibilityFixtures() {
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
