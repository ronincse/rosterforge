// Preserve the ZIP parser's complete entry list before its public facade
// flattens duplicate names and sanitizes directory paths. No CRC or inflation
// happens here; those belong after ingestion policy checks in archive-output.
import ZipEntries from "jszip/lib/zipEntries.js";
import { utf8decode } from "jszip/lib/utf8.js";

export interface ArchiveEntryMetadata {
  readonly name: string;
  readonly dir: boolean;
  readonly _data: {
    readonly compressedSize: number;
    readonly uncompressedSize: number;
    readonly crc32: number;
    readonly compressedContent: Uint8Array;
    readonly compression: { readonly magic: "\u0000\u0000" | "\u0008\u0000" };
  };
}

/** Reads metadata and compressed byte views only. The pinned private API is
 * checked at runtime and fails closed; it must never fall back to eager CRC.
 */
export function readArchiveMetadata(bytes: Uint8Array): readonly ArchiveEntryMetadata[] {
  const archive = new ZipEntries({ decodeFileName: utf8decode });
  archive.load(bytes);
  if (!Array.isArray(archive.files) || archive.centralDirRecords !== archive.files.length) {
    throw new Error("Archive central-directory record count is inconsistent.");
  }
  return archive.files.map((entry: unknown) => {
    if (!record(entry) || typeof entry.fileNameStr !== "string" || typeof entry.dir !== "boolean") {
      throw new Error("Invalid archive entry metadata.");
    }
    const data = entry.decompressed;
    if (
      !record(data) ||
      !nonnegativeInteger(data.compressedSize) ||
      !nonnegativeInteger(data.uncompressedSize) ||
      typeof data.crc32 !== "number" || !Number.isInteger(data.crc32) ||
      !(data.compressedContent instanceof Uint8Array) ||
      data.compressedContent.length !== data.compressedSize ||
      !record(data.compression) ||
      (data.compression.magic !== "\u0000\u0000" && data.compression.magic !== "\u0008\u0000")
    ) {
      throw new Error("Invalid archive compressed payload metadata.");
    }
    return {
      name: entry.fileNameStr,
      dir: entry.dir,
      _data: {
        compressedSize: data.compressedSize,
        uncompressedSize: data.uncompressedSize,
        crc32: data.crc32,
        compressedContent: data.compressedContent,
        compression: { magic: data.compression.magic },
      },
    };
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
