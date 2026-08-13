import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { sourceId } from "@rosterforge/foundation";

import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  importLocalBattleScribeFiles,
  type ImportLocalBattleScribeFilesOptions,
} from "./local-import.js";

describe("local BattleScribe batch import", () => {
  it("retains ordered partial-success results and rejected source bytes", async () => {
    const gameSystemBytes = fixtureBytes("minimal.gst");
    const catalogueBytes = fixtureBytes("minimal.cat");
    const invalidBytes = fixtureBytes("invalid.cat");
    const unsupportedBytes = new TextEncoder().encode("not BattleScribe data");

    const imported = await importLocalBattleScribeFiles(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "invalid.cat", bytes: invalidBytes },
        { filename: "notes.txt", bytes: unsupportedBytes },
        { filename: "minimal.cat", bytes: catalogueBytes },
      ],
      options,
    );

    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }
    expect(imported.value).toMatchObject({
      batchId: "batch-test",
      importedAt: "2026-07-22T18:00:00.000Z",
      status: "partial",
      files: [
        { index: 0, status: "imported" },
        { index: 1, status: "rejected" },
        { index: 2, status: "rejected" },
        { index: 3, status: "imported" },
      ],
    });
    expect(imported.value.documents.map((item) => item.metadata.kind)).toEqual([
      "gameSystem",
      "catalogue",
    ]);
    expect(imported.value.files.map((item) => item.source.sourceId)).toEqual([
      "local-file:batch-test:0",
      "local-file:batch-test:1",
      "local-file:batch-test:2",
      "local-file:batch-test:3",
    ]);
    expect(imported.value.files[0]?.sourceBytes).toBe(
      imported.value.documents[0]?.sourceBytes,
    );
    expect(imported.value.files[0]?.sourceBytes).not.toBe(gameSystemBytes);
    expect(imported.value.files[1]?.sourceBytes).toEqual(invalidBytes);
    expect(imported.value.files[1]?.sourceBytes).not.toBe(invalidBytes);
    expect(imported.diagnostics.map((item) => item.code)).toContain(
      "BS_IMPORT_UNSUPPORTED_EXTENSION",
    );
    expect(imported.value.files[1]?.diagnostics.length).toBeGreaterThan(0);
    expect(imported.value.files[2]?.diagnostics).toEqual([
      expect.objectContaining({ code: "BS_IMPORT_UNSUPPORTED_EXTENSION" }),
    ]);
  });

  it("retains explicit source provenance when re-ingesting saved bytes", async () => {
    const retainedSourceId = sourceId(
      "download:github:BSData/fictional@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:minimal.cat",
    );

    const imported = await importLocalBattleScribeFiles(
      [
        {
          filename: "minimal.cat",
          bytes: fixtureBytes("minimal.cat"),
          origin: "https://example.test/minimal.cat",
          sourceId: retainedSourceId,
          sourceKind: "download",
        },
      ],
      options,
    );

    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.value.files[0]?.source).toMatchObject({
      sourceId: retainedSourceId,
      kind: "download",
      filename: "minimal.cat",
      origin: "https://example.test/minimal.cat",
    });
    expect(imported.value.documents[0]?.source).toBe(
      imported.value.files[0]?.source,
    );
  });

  it("imports a compressed file while retaining archive and XML bytes", async () => {
    const xmlBytes = fixtureBytes("minimal.cat");
    const archive = new JSZip();
    archive.file("minimal.cat", xmlBytes);
    const archiveBytes = await archive.generateAsync({ type: "uint8array" });

    const imported = await importLocalBattleScribeFiles(
      [{ filename: "minimal.catz", bytes: archiveBytes }],
      options,
    );

    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }
    expect(imported.diagnostics).toEqual([]);
    expect(imported.value.status).toBe("complete");
    const file = imported.value.files[0];
    const document = imported.value.documents[0];
    expect(file?.sourceBytes).toBe(document?.sourceBytes);
    expect(document?.sourceBytes).toEqual(archiveBytes);
    expect(Array.from(document?.documentBytes ?? [])).toEqual(
      Array.from(xmlBytes),
    );
    expect(document?.source.filename).toBe("minimal.catz");
    expect(document?.documentSource.filename).toBe("minimal.cat");
  });

  it("imports BattleScribe JSON while retaining its generic source tree", async () => {
    const jsonBytes = fixtureBytes("projection-json-catalogue.json");
    const imported = await importLocalBattleScribeFiles(
      [{ filename: "projection-json-catalogue.json", bytes: jsonBytes }],
      options,
    );

    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }
    expect(imported.value.status).toBe("complete");
    expect(imported.value.documents[0]).toMatchObject({
      sourceFormat: "json",
      sourceRoot: { kind: "object" },
      metadata: {
        kind: "catalogue",
        id: "json-catalogue",
      },
    });
    expect(imported.value.documents[0]?.sourceBytes).not.toBe(jsonBytes);
    expect(imported.value.documents[0]?.sourceBytes).toEqual(jsonBytes);
  });

  it("reports empty and all-rejected batches without throwing", async () => {
    const empty = await importLocalBattleScribeFiles([], options);
    const rejected = await importLocalBattleScribeFiles(
      [{ filename: "notes.txt", bytes: new Uint8Array([1, 2, 3]) }],
      options,
    );

    expect(empty.ok && empty.value).toMatchObject({
      status: "empty",
      files: [],
      documents: [],
    });
    expect(rejected.ok && rejected.value).toMatchObject({
      status: "failed",
      files: [{ status: "rejected" }],
      documents: [],
    });
  });

  it("rejects an oversized batch before parsing any file", async () => {
    const imported = await importLocalBattleScribeFiles(
      [
        { filename: "minimal.gst", bytes: fixtureBytes("minimal.gst") },
        { filename: "minimal.cat", bytes: fixtureBytes("minimal.cat") },
      ],
      { ...options, limits: { maxFiles: 1 } },
    );

    expect(imported.ok).toBe(false);
    expect(imported.diagnostics).toEqual([
      expect.objectContaining({
        code: "REPOSITORY_LOCAL_IMPORT_FILE_LIMIT",
        details: { actualFiles: 2, limitFiles: 1 },
      }),
    ]);
  });
});

const options: ImportLocalBattleScribeFilesOptions = {
  batchId: "batch-test",
  importedAt: "2026-07-22T18:00:00.000Z",
};
