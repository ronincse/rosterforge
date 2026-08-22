import { describe, expect, it } from "vitest";

import { objectId, sourceId } from "@rosterforge/foundation";
import type { GitObjectSha } from "@rosterforge/repository";

import {
  createBrowserRemoteCatalogueMetadataCache,
  createIndexedDbRemoteCatalogueMetadataCache,
  type BrowserRemoteMetadataCacheMetadataRecord,
  type BrowserRemoteMetadataCacheRecordBackend,
} from "./browser-remote-metadata-cache.js";
import type {
  RemoteCatalogueMetadataCacheEntry,
  RemoteCatalogueMetadataCacheKey,
} from "./remote-catalogue-source.js";

describe("browser remote catalogue metadata cache", () => {
  it("round-trips a defensive copy of metadata and diagnostics", async () => {
    const { backend, metadata, records } = memoryBackend();
    const cache = createBrowserRemoteCatalogueMetadataCache(
      backend,
      {},
      () => 12,
    );
    const entry = validEntry();

    await cache.write(cacheKey(), entry);
    (
      entry.documents[0] as {
        name: string;
      }
    ).name = "Mutated after write";

    const first = await cache.read(cacheKey());
    expect(first).toEqual(validEntry());
    expect(first?.documents[0]?.source?.kind).toBe("download");
    expect(first?.files[0]?.diagnostics[0]?.location?.start).toEqual({
      offset: 12,
      line: 2,
      column: 4,
    });

    (
      first!.documents[0] as {
        name: string;
      }
    ).name = "Mutated after read";
    expect((await cache.read(cacheKey()))?.documents[0]?.name).toBe(
      "Fictional Catalogue",
    );
    expect(records.size).toBe(1);
    expect([...metadata.values()][0]).toMatchObject({
      byteLength: payloadBytes(validEntry()),
      lastAccessedAt: 12,
    });
  });

  it("isolates records by immutable repository and tree identity", async () => {
    const { backend } = memoryBackend();
    const cache = createBrowserRemoteCatalogueMetadataCache(backend);
    await cache.write(cacheKey(), validEntry());

    expect(
      await cache.read(
        cacheKey({
          treeObjectId:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as GitObjectSha,
        }),
      ),
    ).toBeUndefined();
  });

  it.each([
    { name: "non-object record", record: "invalid" },
    {
      name: "unknown format",
      record: validRecord({ format: "unknown" }),
    },
    {
      name: "mismatched key",
      record: validRecord({
        key: cacheKey({
          treeObjectId:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as GitObjectSha,
        }),
      }),
    },
    {
      name: "invalid JSON",
      record: validRecord({ payload: "{" }),
    },
    {
      name: "invalid payload",
      record: validRecord({ payload: JSON.stringify({}) }),
    },
  ])("rejects a $name", async ({ record }) => {
    const cache = createBrowserRemoteCatalogueMetadataCache(
      fixedRecordBackend(record),
    );

    await expect(cache.read(cacheKey())).rejects.toThrow(/metadata cache/i);
  });

  it("bounds serialized payloads on write and read", async () => {
    const { backend } = memoryBackend();
    const cache = createBrowserRemoteCatalogueMetadataCache(backend, {
      maxEntryBytes: 2,
    });

    await expect(cache.write(cacheKey(), validEntry())).rejects.toThrow(
      /byte limit/i,
    );
    await expect(
      createBrowserRemoteCatalogueMetadataCache(
        fixedRecordBackend(validRecord()),
        { maxEntryBytes: 2 },
      ).read(cacheKey()),
    ).rejects.toThrow(/byte limit/i);
  });

  it("bounds decoded collections and diagnostic counts", async () => {
    const entry = validEntry();
    const file = entry.files[0]!;
    await expect(
      createBrowserRemoteCatalogueMetadataCache(memoryBackend().backend, {
        maxFiles: 1,
      }).write(cacheKey(), {
        ...entry,
        files: [file, file],
      }),
    ).rejects.toThrow(/file collection/i);

    await expect(
      createBrowserRemoteCatalogueMetadataCache(memoryBackend().backend, {
        maxDiagnostics: 1,
      }).write(cacheKey(), {
        ...entry,
        files: [
          {
            ...file,
            diagnostics: [
              ...file.diagnostics,
              ...file.diagnostics,
            ],
          },
        ],
      }),
    ).rejects.toThrow(/too many diagnostics/i);
  });

  it("evicts least-recently-used indexes before exceeding the total bound", async () => {
    const { backend, metadata, records } = memoryBackend();
    const bytes = payloadBytes(validEntry());
    let time = 0;
    const cache = createBrowserRemoteCatalogueMetadataCache(
      backend,
      { maxEntryBytes: bytes, maxTotalBytes: bytes * 2 },
      () => ++time,
    );
    const first = cacheKey({ repository: "first" });
    const second = cacheKey({ repository: "second" });
    const third = cacheKey({ repository: "third" });

    await cache.write(first, validEntry());
    await cache.write(second, validEntry());
    await cache.read(first);
    await cache.write(third, validEntry());

    expect(await cache.read(first)).toBeDefined();
    expect(await cache.read(second)).toBeUndefined();
    expect(await cache.read(third)).toBeDefined();
    expect(records.size).toBe(2);
    expect(
      [...metadata.values()].reduce<number>(
        (total, record) =>
          total +
          (record as BrowserRemoteMetadataCacheMetadataRecord).byteLength,
        0,
      ),
    ).toBe(bytes * 2);
  });

  it("accounts for a replacement without double-counting its old payload", async () => {
    const { backend, records } = memoryBackend();
    const bytes = payloadBytes(validEntry());
    let time = 0;
    const cache = createBrowserRemoteCatalogueMetadataCache(
      backend,
      { maxEntryBytes: bytes, maxTotalBytes: bytes * 2 },
      () => ++time,
    );
    const first = cacheKey({ repository: "first" });
    const second = cacheKey({ repository: "second" });

    await cache.write(first, validEntry());
    await cache.write(second, validEntry());
    await cache.write(first, validEntry());

    expect(await cache.read(second)).toBeDefined();
    expect(records.size).toBe(2);
  });

  it("clears unaccountable metadata before accepting a new index", async () => {
    const { backend, metadata, records } = memoryBackend();
    records.set("orphan", { id: "orphan", payload: "{}" });
    metadata.set("broken", { id: "broken" });

    const cache = createBrowserRemoteCatalogueMetadataCache(backend);
    await cache.write(cacheKey(), validEntry());

    expect(records.size).toBe(1);
    expect(metadata.size).toBe(1);
    expect([...metadata.values()][0]).toMatchObject({
      byteLength: payloadBytes(validEntry()),
    });
  });

  it("keeps a valid hit usable when its LRU touch fails", async () => {
    const cache = createBrowserRemoteCatalogueMetadataCache(
      fixedRecordBackend(validRecord(), {
        touch: async () => Promise.reject(new Error("touch failed")),
      }),
    );

    await expect(cache.read(cacheKey())).resolves.toEqual(validEntry());
  });

  it("propagates backend failures to the best-effort service boundary", async () => {
    const cache = createBrowserRemoteCatalogueMetadataCache({
      get: async () => Promise.reject(new Error("read failed")),
      getAllMetadata: async () => [],
      put: async () => Promise.reject(new Error("write failed")),
      touch: async () => undefined,
      delete: async () => undefined,
      clear: async () => undefined,
    });

    await expect(cache.read(cacheKey())).rejects.toThrow("read failed");
    await expect(cache.write(cacheKey(), validEntry())).rejects.toThrow(
      "write failed",
    );
  });

  it("returns no adapter when IndexedDB is unavailable", () => {
    expect(createIndexedDbRemoteCatalogueMetadataCache(null)).toBeUndefined();
  });

  it("rejects invalid limits during construction", () => {
    expect(() =>
      createBrowserRemoteCatalogueMetadataCache(memoryBackend().backend, {
        maxDocuments: 0,
      }),
    ).toThrow(/positive safe integer/i);
    expect(() =>
      createBrowserRemoteCatalogueMetadataCache(memoryBackend().backend, {
        maxTotalBytes: 0,
      }),
    ).toThrow(/positive safe integer/i);
    expect(() =>
      createBrowserRemoteCatalogueMetadataCache(memoryBackend().backend, {
        maxEntryBytes: 3,
        maxTotalBytes: 2,
      }),
    ).toThrow(/must not exceed/i);
  });
});

function validEntry(): RemoteCatalogueMetadataCacheEntry {
  const source = {
    sourceId: sourceId("download:fictional.cat"),
    filename: "fictional.cat",
    kind: "download" as const,
    importedAt: "2026-08-13T19:00:00.000Z",
    mediaType: "application/json",
    origin: "https://example.test/fictional.cat",
  };
  const summary = {
    path: "fictional.cat",
    kind: "catalogue" as const,
    id: objectId("fictional-catalogue"),
    name: "Fictional Catalogue",
    gameSystemId: objectId("fictional-system"),
    library: false,
    catalogueLinks: [
      {
        targetId: objectId("fictional-library"),
        name: "Fictional Library",
        location: {
          source,
          path: ["catalogue", "catalogueLinks", "catalogueLink"],
        },
      },
    ],
    source,
  };
  return {
    status: "complete",
    totalBytes: 123,
    files: [
      {
        index: 0,
        file: {
          path: "fictional.cat",
          objectId:
            "1111111111111111111111111111111111111111" as GitObjectSha,
          byteSize: 123,
        },
        status: "indexed",
        cacheStatus: "hit",
        diagnostics: [
          {
            code: "BS_TEST_DIAGNOSTIC",
            message: "A preserved synthetic diagnostic.",
            severity: "warning",
            impacts: ["import", "compatibility"],
            location: {
              source,
              start: { offset: 12, line: 2, column: 4 },
              path: ["catalogue", "@library"],
            },
            details: { value: "unexpected" },
          },
        ],
        summary,
      },
    ],
    documents: [summary],
  };
}

function cacheKey(
  overrides: Partial<RemoteCatalogueMetadataCacheKey> = {},
): RemoteCatalogueMetadataCacheKey {
  return {
    provider: "github",
    owner: "BSData",
    repository: "fictional-system",
    revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    treeObjectId:
      "1111111111111111111111111111111111111111" as GitObjectSha,
    ...overrides,
  };
}

function validRecord(overrides: Record<string, unknown> = {}): unknown {
  const key = cacheKey();
  return {
    id: JSON.stringify([
      key.provider,
      key.owner,
      key.repository,
      key.revision,
      key.treeObjectId,
    ]),
    format: "rosterforge.pinned-repository-metadata-cache",
    version: 1,
    key,
    payload: JSON.stringify(validEntry()),
    ...overrides,
  };
}

function memoryBackend(): {
  readonly backend: BrowserRemoteMetadataCacheRecordBackend;
  readonly records: Map<string, unknown>;
  readonly metadata: Map<string, unknown>;
} {
  const records = new Map<string, unknown>();
  const metadata = new Map<string, unknown>();
  return {
    records,
    metadata,
    backend: {
      get: async (id) => records.get(id),
      getAllMetadata: async () => [...metadata.values()],
      put: async (record, sidecar) => {
        if (typeof record !== "object" || record === null) {
          throw new Error("Expected an object record.");
        }
        const id = Reflect.get(record, "id");
        if (typeof id !== "string") throw new Error("Expected a record ID.");
        records.set(id, record);
        metadata.set(sidecar.id, sidecar);
      },
      touch: async (sidecar) => {
        if (records.has(sidecar.id)) metadata.set(sidecar.id, sidecar);
      },
      delete: async (ids) => {
        for (const id of ids) {
          records.delete(id);
          metadata.delete(id);
        }
      },
      clear: async () => {
        records.clear();
        metadata.clear();
      },
    },
  };
}

function fixedRecordBackend(
  record: unknown,
  overrides: Partial<BrowserRemoteMetadataCacheRecordBackend> = {},
): BrowserRemoteMetadataCacheRecordBackend {
  const metadata = new Map<
    string,
    BrowserRemoteMetadataCacheMetadataRecord
  >();
  return {
    get: async () => record,
    getAllMetadata: async () => [...metadata.values()],
    put: async (_stored, sidecar) => {
      metadata.set(sidecar.id, sidecar);
    },
    touch: async (sidecar) => {
      metadata.set(sidecar.id, sidecar);
    },
    delete: async (ids) => {
      for (const id of ids) metadata.delete(id);
    },
    clear: async () => metadata.clear(),
    ...overrides,
  };
}

function payloadBytes(entry: RemoteCatalogueMetadataCacheEntry): number {
  return new TextEncoder().encode(JSON.stringify(entry)).byteLength;
}
