import { describe, expect, it } from "vitest";

import { fixtureBytes } from "@rosterforge/test-fixtures";
import { importLocalBattleScribeFiles } from "@rosterforge/repository";

import {
  prepareImportedCatalogueLibrary,
  prepareLocalCatalogueLibrary,
} from "./catalogue-library.js";

const importOptions = {
  batchId: "catalogue-library-test",
  importedAt: "2026-07-22T18:00:00.000Z",
};

describe("prepareLocalCatalogueLibrary", () => {
  it("composes already-ingested documents without replacing provenance", async () => {
    const imported = await importLocalBattleScribeFiles(
      [
        { filename: "minimal.gst", bytes: fixtureBytes("minimal.gst") },
        { filename: "minimal.cat", bytes: fixtureBytes("minimal.cat") },
      ],
      importOptions,
    );
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const result = prepareImportedCatalogueLibrary(
      imported.value,
      imported.diagnostics,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.documents[1]).toBe(imported.value.documents[1]);
    expect(result.value.catalogues[0]?.source).toBe(
      imported.value.documents[1]?.source,
    );
    expect(result.value.catalogues[0]?.document.sourceBytes).toBe(
      imported.value.documents[1]?.sourceBytes,
    );
  });

  it("turns a matched local game system and catalogue into a stable choice", async () => {
    const gstBytes = fixtureBytes("minimal.gst");
    const catBytes = fixtureBytes("minimal.cat");

    const result = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gstBytes },
        { filename: "minimal.cat", bytes: catBytes },
      ],
      { import: importOptions },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.diagnostics).toEqual([]);
    expect(result.value.status).toBe("ready");
    expect(result.value.gameSystems.map(({ metadata }) => metadata.id)).toEqual([
      "synthetic-system",
    ]);
    expect(result.value.catalogues).toHaveLength(1);
    expect(result.value.selectableCatalogues).toEqual(
      result.value.catalogues,
    );
    const [choice] = result.value.catalogues;
    expect(choice).toMatchObject({
      id: "synthetic-catalogue",
      name: "Synthetic Faction",
      revision: 7,
      gameSystemId: "synthetic-system",
      materializationTruncated: false,
    });
    expect(choice?.key).toBe(
      "local-file:catalogue-library-test:1:synthetic-catalogue",
    );
    expect(choice?.context).toBe(result.value.contexts.catalogues[0]);
    expect(choice?.document).toBe(result.value.importReport.documents[1]);
    expect(Array.from(choice?.document.sourceBytes ?? [])).toEqual(
      Array.from(catBytes),
    );
  });

  it("keeps a composed catalogue ready when it has non-fatal source notes", async () => {
    const imported = await importLocalBattleScribeFiles(
      [
        { filename: "minimal.gst", bytes: fixtureBytes("minimal.gst") },
        { filename: "minimal.cat", bytes: fixtureBytes("minimal.cat") },
      ],
      importOptions,
    );
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const result = prepareImportedCatalogueLibrary(imported.value, [
      {
        code: "BS_PROJECTION_INVALID_ATTRIBUTE",
        message: "An optional source value was not numeric.",
        severity: "error",
        impacts: ["compatibility"],
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("ready");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BS_PROJECTION_INVALID_ATTRIBUTE",
        }),
      ]),
    );
  });

  it("composes matched BattleScribe JSON documents into a catalogue choice", async () => {
    const result = await prepareLocalCatalogueLibrary(
      [
        {
          filename: "projection-json-game-system.json",
          bytes: fixtureBytes("projection-json-game-system.json"),
        },
        {
          filename: "projection-json-catalogue.json",
          bytes: fixtureBytes("projection-json-catalogue.json"),
        },
      ],
      { import: importOptions },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.value.documents.map(({ sourceFormat }) => sourceFormat),
    ).toEqual(["json", "json"]);
    expect(result.value.gameSystems[0]?.metadata.id).toBe("json-system");
    expect(result.value.catalogues).toHaveLength(1);
    expect(result.value.selectableCatalogues).toEqual(
      result.value.catalogues,
    );
    expect(result.value.catalogues[0]).toMatchObject({
      id: "json-catalogue",
      name: "Fictional JSON Catalogue",
      gameSystemId: "json-system",
    });
    expect(
      result.value.catalogues[0]?.context.roots.selectionEntries.map(
        ({ materialized }) => materialized.name,
      ),
    ).toEqual(["Pathfinders", "Rangers"]);
  });

  it("keeps valid catalogue choices when another selected file is rejected", async () => {
    const result = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: fixtureBytes("minimal.gst") },
        { filename: "invalid.cat", bytes: fixtureBytes("invalid.cat") },
        { filename: "minimal.cat", bytes: fixtureBytes("minimal.cat") },
      ],
      { import: importOptions },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe("partial");
    expect(result.value.importReport.status).toBe("partial");
    expect(result.value.catalogues.map(({ id }) => id)).toEqual([
      "synthetic-catalogue",
    ]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("reports an imported game system without catalogues as unavailable", async () => {
    const result = await prepareLocalCatalogueLibrary(
      [{ filename: "minimal.gst", bytes: fixtureBytes("minimal.gst") }],
      { import: importOptions },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe("unavailable");
    expect(result.value.gameSystems).toHaveLength(1);
    expect(result.value.catalogues).toEqual([]);
    expect(result.value.selectableCatalogues).toEqual([]);
  });

  it("retains library catalogues without offering them as roster choices", async () => {
    const result = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "graph-library.cat",
          bytes: fixtureBytes("graph-library.cat"),
        },
        { filename: "projection.cat", bytes: fixtureBytes("projection.cat") },
      ],
      { import: importOptions },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.catalogues.map(({ id }) => id)).toEqual([
      "library-first",
      "catalogue-203",
    ]);
    expect(result.value.selectableCatalogues.map(({ id }) => id)).toEqual([
      "catalogue-203",
    ]);
  });

  it("exposes a catalogue while diagnosing its missing game system", async () => {
    const result = await prepareLocalCatalogueLibrary(
      [{ filename: "minimal.cat", bytes: fixtureBytes("minimal.cat") }],
      { import: importOptions },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe("partial");
    expect(result.value.gameSystems).toEqual([]);
    expect(result.value.catalogues.map(({ id }) => id)).toEqual([
      "synthetic-catalogue",
    ]);
    expect(
      result.diagnostics.some(
        ({ code }) => code === "BS_GRAPH_MISSING_REFERENCE",
      ),
    ).toBe(true);
  });
});
