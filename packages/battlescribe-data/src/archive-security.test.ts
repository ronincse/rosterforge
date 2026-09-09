// Small synthetic archives exercise the actual decompressor boundary, not just
// the diagnostic returned after an oversized payload has already been inflated.
import { createRequire } from "node:module";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sourceId } from "@rosterforge/foundation";
import { ingestBattleScribeFile } from "./ingest.js";
import { fixtureBytes } from "@rosterforge/test-fixtures";
import * as rawInflate from "pako/lib/zlib/inflate.js";

vi.mock("pako/lib/zlib/inflate.js", async (importOriginal) => {
  const actual = await importOriginal<typeof rawInflate>();
  return { ...actual, inflate: vi.fn(actual.inflate) };
});

const require = createRequire(import.meta.url);
const compressedObject = require("jszip/lib/compressedObject.js") as {
  prototype: { getContentWorker(): { on(event: string, callback: (chunk: { data: Uint8Array }) => void): void } };
};
const source = { sourceId: sourceId("archive-security"), filename: "security.catz", kind: "synthetic" as const, importedAt: "2026-09-09T00:00:00Z" };

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("archive resource boundary", () => {
  it("rejects declared oversized output before any decompression", async () => {
    const zip = new JSZip();
    zip.file("security.cat", "x".repeat(2 * 1024 * 1024));
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const original = compressedObject.prototype.getContentWorker;
    let expanded = 0;
    vi.spyOn(compressedObject.prototype, "getContentWorker").mockImplementation(function (this: object) {
      const worker = original.call(this);
      worker.on("data", (chunk) => { expanded += chunk.data.length; });
      return worker;
    });
    const result = await ingestBattleScribeFile(bytes, {
      source,
      limits: { maxArchiveExpandedBytes: 1024, maxCompressionRatio: 10_000 },
    });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_EXPANDED_SIZE_LIMIT");
    expect(expanded).toBe(0);
  });

  it.each(["expanded", "ratio"] as const)("stops forged output at the actual %s boundary plus one byte", async (bound) => {
    const bytes = await archive({ "security.cat": "x".repeat(2 * 1024 * 1024) });
    patchExpandedSize(bytes, 1);
    const actual = await vi.importActual<typeof rawInflate>("pako/lib/zlib/inflate.js");
    const inflate = actual.inflate;
    let generated = 0;
    const spy = vi.spyOn(rawInflate, "inflate").mockImplementation((stream, flush) => {
      const status = inflate(stream, flush);
      generated += stream.next_out;
      return status;
    });
    const compressed = new DataView(bytes.buffer).getUint32(centralOffsets(bytes)[0]! + 20, true);
    const limit = bound === "expanded" ? 1024 : compressed;
    const result = await ingestBattleScribeFile(bytes, {
      source,
      limits: { maxArchiveExpandedBytes: bound === "expanded" ? 1024 : 4 * 1024 * 1024, maxCompressionRatio: bound === "expanded" ? 10_000 : 1 },
    });
    expect(spy).toHaveBeenCalled();
    expect(generated).toBe(limit + 1);
    expect(result.diagnostics[0]).toMatchObject({ code: bound === "expanded" ? "BS_ARCHIVE_EXPANDED_SIZE_LIMIT" : "BS_ARCHIVE_COMPRESSION_RATIO_LIMIT", details: { actualBytes: limit + 1, limitBytes: limit } });
  });

  it.each(["gst", "cat"] as const)("accepts bounded %s archives and preserves original and extracted bytes", async (extension) => {
    const xml = fixtureBytes(`minimal.${extension}`);
    const bytes = await archive({ [`nested/minimal.${extension}`]: xml });
    const original = bytes.slice();
    const result = await ingestBattleScribeFile(bytes, { source: { ...source, filename: `minimal.${extension}z` } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    bytes.fill(0);
    expect(result.value.sourceBytes).toEqual(original);
    expect(Array.from(result.value.documentBytes)).toEqual(Array.from(xml));
    expect(result.value.documentSource.filename).toBe(`nested/minimal.${extension}`);
  });

  it.each(["STORE", "DEFLATE"] as const)("keeps CRC validation for %s archives", async (compression) => {
    const bytes = await archive({ "minimal.cat": fixtureBytes("minimal.cat") }, compression);
    const view = new DataView(bytes.buffer);
    for (const offset of centralOffsets(bytes)) view.setUint32(offset + 16, 123, true);
    view.setUint32(14, 123, true);
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]).toMatchObject({ code: "BS_ARCHIVE_INVALID", details: { cause: "Archive CRC32 mismatch." } });
  });

  it("rejects a forged STORE payload before copying its oversized data", async () => {
    const bytes = await archive({ "minimal.cat": "x".repeat(2048) }, "STORE");
    patchExpandedSize(bytes, 1);
    const result = await ingestBattleScribeFile(bytes, { source, limits: { maxArchiveExpandedBytes: 1024 } });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_EXPANDED_SIZE_LIMIT");
  });

  it("rejects dishonest small lengths even when actual output fits the limit", async () => {
    const bytes = await archive({ "minimal.cat": fixtureBytes("minimal.cat") });
    patchExpandedSize(bytes, 1);
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]).toMatchObject({ code: "BS_ARCHIVE_INVALID", details: { cause: "Archive expanded length does not match its metadata." } });
  });

  it.each([
    ["compressed", { maxArchiveCompressedBytes: 1 }, { "minimal.cat": "x" }, "BS_ARCHIVE_COMPRESSED_SIZE_LIMIT"],
    ["entry", { maxArchiveEntries: 1 }, { "a.cat": "x", "b.cat": "x" }, "BS_ARCHIVE_ENTRY_LIMIT"],
    ["multi", {}, { "a.cat": "x", "b.cat": "x" }, "BS_ARCHIVE_CONTENTS"],
    ["extension", {}, { "wrong.txt": "x" }, "BS_ARCHIVE_CONTENTS"],
    ["path", {}, { "../minimal.cat": "x" }, "BS_ARCHIVE_UNSAFE_PATH"],
    ["ratio", { maxCompressionRatio: 1 }, { "minimal.cat": "x".repeat(4096) }, "BS_ARCHIVE_COMPRESSION_RATIO_LIMIT"],
  ] as const)("rejects %s violations without decompressing", async (_, limits, entries, code) => {
    const bytes = await archive(entries);
    const zipSpy = vi.spyOn(compressedObject.prototype, "getContentWorker");
    const inflateSpy = vi.spyOn(rawInflate, "inflate");
    const result = await ingestBattleScribeFile(bytes, { source, limits });
    expect(result.diagnostics[0]?.code).toBe(code);
    expect(zipSpy).not.toHaveBeenCalled();
    expect(inflateSpy).not.toHaveBeenCalled();
  });

  it("rejects declared directory payloads without decompressing them", async () => {
    const bytes = await archive({ "ignored": "x".repeat(2 * 1024 * 1024), "minimal.cat": fixtureBytes("minimal.cat") });
    // Keep a real payload behind the directory flag to catch eager CRC passes.
    new DataView(bytes.buffer).setUint32(centralOffsets(bytes)[0]! + 38, 0x10, true);
    const zipSpy = vi.spyOn(compressedObject.prototype, "getContentWorker");
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_CONTENTS");
    expect(zipSpy).not.toHaveBeenCalled();
    expect(rawInflate.inflate).not.toHaveBeenCalled();
  });

  it("reports malformed archives instead of rejecting the import promise", async () => {
    const result = await ingestBattleScribeFile(new Uint8Array([1, 2, 3]), { source });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_INVALID");
  });

  it("accepts exact-limit output across several bounded inflater buffers", async () => {
    const xml = `<catalogue id="boundary" name="Boundary"><comment>${"x".repeat(40_000)}</comment></catalogue>`;
    const bytes = await archive({ "minimal.cat": xml });
    const result = await ingestBattleScribeFile(bytes, { source, limits: { maxArchiveExpandedBytes: xml.length, maxCompressionRatio: 10_000 } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.documentBytes.length).toBe(xml.length);
  });

  it("rejects a truncated deflate stream even when it produced the expected XML bytes", async () => {
    const bytes = await archive({ "minimal.cat": fixtureBytes("minimal.cat") });
    const view = new DataView(bytes.buffer);
    const central = centralOffsets(bytes)[0]!;
    const shorterSize = view.getUint32(central + 20, true) - 1;
    view.setUint32(central + 20, shorterSize, true);
    view.setUint32(18, shorterSize, true);
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_INVALID");
  });

  it("does not flatten duplicate file names before enforcing the file count", async () => {
    const bytes = await archive({ "a.cat": "x", "b.cat": "x" });
    const needle = new TextEncoder().encode("b.cat");
    for (let i = 0; i <= bytes.length - needle.length; i += 1) {
      if (needle.every((byte, j) => bytes[i + j] === byte)) bytes[i] = "a".charCodeAt(0);
    }
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_CONTENTS");
    expect(rawInflate.inflate).not.toHaveBeenCalled();
  });

  it("rejects unsafe directory names before path sanitization", async () => {
    const bytes = await archive({ "../unsafe/": "", "minimal.cat": fixtureBytes("minimal.cat") });
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_UNSAFE_PATH");
    expect(rawInflate.inflate).not.toHaveBeenCalled();
  });

  it("counts directory records in the configured entry budget", async () => {
    const bytes = await archive({ "dir/": "", "minimal.cat": fixtureBytes("minimal.cat") });
    const result = await ingestBattleScribeFile(bytes, { source, limits: { maxArchiveEntries: 1 } });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_ENTRY_LIMIT");
    expect(rawInflate.inflate).not.toHaveBeenCalled();
  });

  it("accepts genuine empty directory records without inflating them", async () => {
    const bytes = await archive({ "dir/": "", "minimal.cat": fixtureBytes("minimal.cat") });
    const zipSpy = vi.spyOn(compressedObject.prototype, "getContentWorker");
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.ok).toBe(true);
    expect(zipSpy).not.toHaveBeenCalled();
    expect(rawInflate.inflate).toHaveBeenCalledTimes(1);
  });

  it("finishes empty deflate output deterministically before XML rejection", async () => {
    const bytes = await archive({ "minimal.cat": "a" });
    const view = new DataView(bytes.buffer);
    const central = centralOffsets(bytes)[0]!;
    const start = 30 + view.getUint16(26, true) + view.getUint16(28, true);
    bytes.set([3, 0], start); // Complete raw DEFLATE stream for zero bytes.
    view.setUint32(14, 0, true);
    view.setUint32(18, 2, true);
    view.setUint32(22, 0, true);
    view.setUint32(central + 16, 0, true);
    view.setUint32(central + 20, 2, true);
    view.setUint32(central + 24, 0, true);
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]?.code).toBe("BS_XML_INVALID");
    expect(rawInflate.inflate).toHaveBeenCalledTimes(1);
  });

  it("fails closed on inconsistent central directory counts", async () => {
    const bytes = await archive({ "minimal.cat": fixtureBytes("minimal.cat") });
    new DataView(bytes.buffer).setUint16(bytes.length - 22 + 10, 2, true);
    const result = await ingestBattleScribeFile(bytes, { source });
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_INVALID");
    expect(rawInflate.inflate).not.toHaveBeenCalled();
  });
});

async function archive(entries: Readonly<Record<string, string | Uint8Array>>, compression: "STORE" | "DEFLATE" = "DEFLATE"): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(entries)) zip.file(name, content, { createFolders: false });
  return zip.generateAsync({ type: "uint8array", compression });
}

function centralOffsets(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer);
  const offsets: number[] = [];
  for (let offset = 0; offset <= bytes.length - 46; offset += 1) {
    if (view.getUint32(offset, true) === 0x02014b50) offsets.push(offset);
  }
  return offsets;
}

function patchExpandedSize(bytes: Uint8Array, size: number): void {
  const view = new DataView(bytes.buffer);
  view.setUint32(22, size, true);
  for (const offset of centralOffsets(bytes)) view.setUint32(offset + 24, size, true);
}
