import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseBattleScribeJson,
  parseBattleScribeXml,
} from "@rosterforge/battlescribe-data";
import {
  objectId,
  sourceId,
  type SourceFileProvenance,
} from "@rosterforge/foundation";

import { materializeBattleScribeVisibleRoots } from "./materialize.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";
import type { BattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe data graph resolution", () => {
  it("indexes parsed documents and known projected objects without mutating them", () => {
    const gameSystem = parseFixture("projection.gst");
    const catalogue = parseFixture("projection.cat");

    expect(gameSystem.ok).toBe(true);
    expect(catalogue.ok).toBe(true);
    if (!gameSystem.ok || !catalogue.ok) {
      return;
    }

    const graph = resolveBattleScribeDataGraph([
      gameSystem.value,
      catalogue.value,
    ]);

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    expect(graph.value.documentsById.get(gameSystem.value.metadata.id)).toBe(
      gameSystem.value,
    );
    const entryId = gameSystem.value.projection.selectionEntries[0]?.id;
    expect(entryId).toBeDefined();
    if (entryId !== undefined) {
      expect(
        graph.value.objectsById
          .get(entryId)
          ?.some((object) => object.kind === "selectionEntry"),
      ).toBe(true);
    }
    expect(
      Object.hasOwn(catalogue.value.projection.catalogueLinks[0] ?? {}, "target"),
    ).toBe(false);
  });

  it("resolves known cross-document references", () => {
    const graph = resolvedProjectionGraph();

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    expect(referenceTargets(graph.value, "catalogueGameSystem")).toContain(
      "system-203",
    );
    expect(referenceTargets(graph.value, "categoryLink")).toContain(
      "category-unit",
    );
    expect(
      graph.value.objects.some(
        (object) =>
          object.kind === "forceEntry" && object.id === "force-patrol-child",
      ),
    ).toBe(true);
    expect(
      graph.value.references.some(
        (reference) =>
          reference.kind === "categoryLink" &&
          reference.source.node.attributes.id === "force-child-category" &&
          reference.targets.some((target) => target.id === "category-unit"),
      ),
    ).toBe(true);
    expect(referenceTargets(graph.value, "infoLink")).toContain("rule-steady");
    expect(referenceTargets(graph.value, "publicationLink")).toContain(
      "publication-core",
    );
    expect(referenceTargets(graph.value, "costType")).toContain("cost-points");
    expect(referenceTargets(graph.value, "profileType")).toContain(
      "profile-type-unit",
    );
    expect(referenceTargets(graph.value, "characteristicType")).toContain(
      "characteristic-move",
    );
    expect(referenceTargets(graph.value, "entryLink")).toContain("entry-alpha");
    expect(referenceTargets(graph.value, "conditionChild")).toContain(
      "entry-option",
    );
    expect(referenceTargets(graph.value, "repeatChild")).toContain(
      "entry-option",
    );
    // Category-entry rules and profiles are ordinary graph objects, and their
    // info links and type references resolve like any other container's.
    expect(
      graph.value.objects.some(
        (object) => object.kind === "rule" && object.id === "category-rule",
      ),
    ).toBe(true);
    expect(
      graph.value.objects.some(
        (object) =>
          object.kind === "profile" && object.id === "category-profile",
      ),
    ).toBe(true);
    expect(
      graph.value.references.some(
        (reference) =>
          reference.kind === "infoLink" &&
          reference.source.node.attributes.id === "category-info-link" &&
          reference.targets.some((target) => target.id === "rule-steady"),
      ),
    ).toBe(true);
    expect(
      graph.diagnostics.some(
        (diagnostic) => diagnostic.code === "BS_GRAPH_MISSING_REFERENCE",
      ),
    ).toBe(true);
  });

  it("indexes ordered profile definitions and diagnoses missing type references", () => {
    const graph = resolvedProjectionGraph();

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    expect(
      graph.value.objects
        .filter((object) => object.kind === "profileType")
        .map((object) => object.id),
    ).toEqual(["profile-type-unit", "profile-type-ability"]);
    expect(
      graph.value.objects
        .filter((object) => object.kind === "characteristicType")
        .map((object) => object.id),
    ).toEqual([
      "characteristic-move",
      "characteristic-save",
      "characteristic-description",
    ]);
    expect(graph.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_GRAPH_MISSING_REFERENCE",
        details: expect.objectContaining({
          kind: "profileType",
          targetId: "profile-type-missing",
          expectedKinds: ["profileType"],
        }),
        location: expect.objectContaining({
          path: expect.arrayContaining(["@typeId"]),
        }),
      }),
    );
    expect(graph.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_GRAPH_MISSING_REFERENCE",
        details: expect.objectContaining({
          kind: "characteristicType",
          targetId: "characteristic-type-missing",
        }),
      }),
    );
  });

  it("reports source-located diagnostics for missing references instead of throwing", () => {
    const graph = resolvedProjectionGraph();

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    expect(graph.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_GRAPH_MISSING_REFERENCE",
        severity: "warning",
        impacts: ["resolution"],
        details: expect.objectContaining({
          kind: "catalogueLink",
          targetId: "library-second",
        }),
        location: expect.objectContaining({
          path: expect.arrayContaining(["@targetId"]),
        }),
      }),
    );
    expect(graph.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_GRAPH_MISSING_REFERENCE",
        details: expect.objectContaining({
          kind: "conditionChild",
          targetId: "entry-missing",
        }),
      }),
    );
  });

  it("reports duplicate IDs while keeping all occurrences indexed", () => {
    const graph = resolvedProjectionGraph();

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const duplicateEntry = graph.value.objects.find(
      (object) => object.id === "entry-alpha",
    );
    expect(duplicateEntry).toBeDefined();
    if (duplicateEntry !== undefined) {
      expect(graph.value.objectsById.get(duplicateEntry.id)?.length).toBe(2);
    }
    expect(graph.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_GRAPH_DUPLICATE_ID",
        details: expect.objectContaining({
          id: "entry-alpha",
        }),
      }),
    );
  });

  it("detects catalogue-link cycles without resolving dependencies recursively", () => {
    const graph = resolvedProjectionGraph();

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    expect(graph.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_GRAPH_CATALOGUE_LINK_CYCLE",
        impacts: ["resolution"],
        location: expect.objectContaining({
          path: expect.arrayContaining(["@targetId"]),
        }),
        details: expect.objectContaining({
          cycle: ["catalogue-203", "library-first", "catalogue-203"],
        }),
      }),
    );
  });

  it("preserves BattleScribe semantic selectors without treating them as missing IDs", () => {
    const gameSystem = parseJsonDocument("selectors.json", {
      gameSystem: {
        id: "selector-system",
        name: "Selector System",
        revision: 1,
        battleScribeVersion: "2.03",
        selectionEntryGroups: [
          {
            id: "selector-group",
            name: "Selector Group",
            import: true,
            defaultSelectionEntryId: "none",
            infoLinks: [
              {
                id: "opaque-group-link",
                name: "Opaque Group",
                targetId: "opaque-info-group",
                type: "futureInfoGroup",
              },
              {
                id: "opaque-profile-link",
                name: "Opaque Profile",
                targetId: "opaque-info-profile",
                type: "profile",
              },
            ],
            constraints: [
              { id: "scope-model", scope: "model", type: "max", value: 1 },
              { id: "scope-unit", scope: "unit", type: "max", value: 1 },
              {
                id: "scope-root-entry",
                scope: "root-entry",
                type: "max",
                value: 1,
              },
            ],
            modifiers: [
              {
                type: "set",
                field: "hidden",
                value: false,
                conditions: [
                  {
                    type: "atLeast",
                    field: "selections",
                    scope: "self",
                    childId: "any",
                    value: 1,
                  },
                  {
                    type: "atLeast",
                    field: "selections",
                    scope: "unit",
                    childId: "model",
                    value: 1,
                  },
                  {
                    type: "instanceOf",
                    field: "selections",
                    scope: "self",
                    childId: "roster",
                    value: 1,
                  },
                  {
                    type: "instanceOf",
                    field: "selections",
                    scope: "self",
                    childId: "upgrade",
                    value: 1,
                  },
                  {
                    type: "instanceOf",
                    field: "selections",
                    scope: "primary-catalogue",
                    childId: "selector-catalogue",
                    value: 1,
                  },
                ],
                repeats: [
                  {
                    field: "selections",
                    scope: "self",
                    childId: "any",
                    value: 1,
                    repeats: 1,
                  },
                ],
              },
            ],
          },
        ],
        futureInfoGroups: [
          {
            id: "opaque-info-group",
            name: "Opaque Info Group",
            profiles: [
              {
                id: "opaque-info-profile",
                name: "Opaque Info Profile",
                typeId: "opaque-profile-type",
              },
            ],
          },
        ],
      },
    });
    const catalogue = parseJsonDocument("selector-catalogue.json", {
      catalogue: {
        id: "selector-catalogue",
        name: "Selector Catalogue",
        revision: 1,
        battleScribeVersion: "2.03",
        gameSystemId: "selector-system",
        gameSystemRevision: 1,
      },
    });

    expect(gameSystem.ok).toBe(true);
    expect(catalogue.ok).toBe(true);
    if (!gameSystem.ok || !catalogue.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([
      gameSystem.value,
      catalogue.value,
    ]);

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    expect(
      graph.value.references
        .filter(
          ({ kind }) =>
            kind === "defaultSelectionEntry" ||
            kind === "constraintScope" ||
            kind === "conditionChild" ||
            kind === "repeatChild",
        )
        .map(({ targetId }) => targetId),
    ).toEqual(["selector-catalogue"]);
    expect(
      graph.value.references.find(
        ({ kind }) => kind === "conditionChild",
      )?.targets.map(({ kind }) => kind),
    ).toEqual(["catalogue"]);
    expect(
      graph.value.references
        .filter(({ kind }) => kind === "infoLink")
        .map(({ targets, unprojectedTargets }) => ({
          projected: targets.length,
          unprojected: unprojectedTargets.length,
        })),
    ).toEqual([
      { projected: 0, unprojected: 1 },
      { projected: 0, unprojected: 1 },
    ]);
    expect(
      graph.diagnostics.filter(
        ({ code }) => code === "BS_GRAPH_MISSING_REFERENCE",
      ),
    ).toEqual([]);

    const materialized = materializeBattleScribeVisibleRoots(graph.value);
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) {
      return;
    }
    expect(
      materialized.value.catalogues[0]?.selectionEntryGroups[0]?.materialized
        .materializedInfoLinks.map((infoLink) =>
          infoLink.kind === "unresolvedInfoLink"
            ? infoLink.reason
            : infoLink.kind,
        ),
    ).toEqual(["unsupportedType", "unprojectedTarget"]);
    expect(materialized.diagnostics).toEqual([]);
  });

  it("materializes object links only inside the source catalogue dependency scope", () => {
    const mainSystem = parseJsonDocument("main-system.json", {
      gameSystem: {
        id: "main-system",
        name: "Main System",
        revision: 1,
        battleScribeVersion: "2.03",
        sharedSelectionEntries: [
          { id: "shared-entry", name: "Main Definition", type: "unit" },
        ],
      },
    });
    const mainCatalogue = parseJsonDocument("main-catalogue.json", {
      catalogue: {
        id: "main-catalogue",
        name: "Main Catalogue",
        revision: 1,
        battleScribeVersion: "2.03",
        gameSystemId: "main-system",
        gameSystemRevision: 1,
        entryLinks: [
          {
            id: "main-link",
            name: "Main Link",
            targetId: "shared-entry",
            type: "selectionEntry",
          },
        ],
      },
    });
    const otherSystem = parseJsonDocument("other-system.json", {
      gameSystem: {
        id: "other-system",
        name: "Other System",
        revision: 1,
        battleScribeVersion: "2.03",
      },
    });
    const unrelatedCatalogue = parseJsonDocument("other-catalogue.json", {
      catalogue: {
        id: "other-catalogue",
        name: "Other Catalogue",
        revision: 1,
        battleScribeVersion: "2.03",
        gameSystemId: "other-system",
        gameSystemRevision: 1,
        selectionEntries: [
          { id: "shared-entry", name: "Unrelated Definition", type: "unit" },
        ],
      },
    });

    expect(mainSystem.ok).toBe(true);
    expect(mainCatalogue.ok).toBe(true);
    expect(otherSystem.ok).toBe(true);
    expect(unrelatedCatalogue.ok).toBe(true);
    if (
      !mainSystem.ok ||
      !mainCatalogue.ok ||
      !otherSystem.ok ||
      !unrelatedCatalogue.ok
    ) {
      return;
    }

    const graph = resolveBattleScribeDataGraph([
      mainSystem.value,
      mainCatalogue.value,
      otherSystem.value,
      unrelatedCatalogue.value,
    ]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const reference = graph.value.references.find(
      ({ kind, sourceDocument }) =>
        kind === "entryLink" && sourceDocument === mainCatalogue.value,
    );
    expect(
      reference?.targets.map(({ source }) => source.node.attributes.name),
    ).toEqual(["Main Definition", "Unrelated Definition"]);
    expect(
      graph.value.objectsById.get(objectId("shared-entry"))?.length,
    ).toBe(2);
    expect(
      graph.diagnostics.some(
        ({ code, details }) =>
          code === "BS_GRAPH_DUPLICATE_ID" &&
          details?.id === "shared-entry",
      ),
    ).toBe(false);

    const materialized = materializeBattleScribeVisibleRoots(graph.value);
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) {
      return;
    }
    const mainView = materialized.value.catalogues.find(
      ({ document }) => document === mainCatalogue.value,
    );
    expect(mainView?.entryLinks[0]?.materialized).toMatchObject({
      kind: "selectionEntry",
      name: "Main Link",
      definition: { name: "Main Definition" },
    });
  });

  it("groups repeated missing targets while retaining occurrence paths", () => {
    const parsed = parseJsonDocument("repeated-missing.json", {
      gameSystem: {
        id: "repeated-missing-system",
        name: "Repeated Missing System",
        revision: 1,
        battleScribeVersion: "2.03",
        selectionEntries: [
          {
            id: "costed-entry",
            name: "Costed Entry",
            type: "unit",
            costs: [
              { typeId: "absent-cost-type", value: 1 },
              { typeId: "absent-cost-type", value: 2 },
            ],
          },
        ],
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([parsed.value]);

    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    expect(
      graph.diagnostics.filter(
        ({ code }) => code === "BS_GRAPH_MISSING_REFERENCE",
      ),
    ).toEqual([
      expect.objectContaining({
        message:
          "Missing costType target absent-cost-type (2 occurrences).",
        details: expect.objectContaining({
          kind: "costType",
          targetId: "absent-cost-type",
          occurrenceCount: 2,
          occurrencePaths: [
            expect.arrayContaining(["cost[0]", "@typeId"]),
            expect.arrayContaining(["cost[1]", "@typeId"]),
          ],
          omittedOccurrenceCount: 0,
        }),
      }),
    ]);
  });
});

function resolvedProjectionGraph() {
  const gameSystem = parseFixture("projection.gst");
  const catalogue = parseFixture("projection.cat");
  const library = parseFixture("graph-library.cat");

  expect(gameSystem.ok).toBe(true);
  expect(catalogue.ok).toBe(true);
  expect(library.ok).toBe(true);
  if (!gameSystem.ok || !catalogue.ok || !library.ok) {
    throw new Error("Graph fixtures must parse.");
  }

  return resolveBattleScribeDataGraph([
    gameSystem.value,
    catalogue.value,
    library.value,
  ]);
}

function referenceTargets(
  graph: BattleScribeDataGraph,
  kind: string,
): readonly string[] {
  return graph.references
    .filter((reference) => reference.kind === kind)
    .flatMap((reference) => reference.targets.map((target) => target.id));
}

function parseFixture(filename: string) {
  return parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
}

function parseJsonDocument(
  filename: string,
  value: Readonly<Record<string, unknown>>,
) {
  return parseBattleScribeJson(
    new TextEncoder().encode(JSON.stringify(value)),
    { source: provenance(filename) },
  );
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
