import { describe, expect, it } from "vitest";

import type {
  GitObjectSha,
  PinnedRepositoryByteCacheKey,
} from "@rosterforge/repository";

import {
  createBrowserRepositoryByteCache,
  createIndexedDbRepositoryByteCache,
  type BrowserRepositoryCacheMetadataRecord,
  type BrowserRepositoryCacheRecordBackend,
} from "./browser-repository-cache.js";

describe("browser repository byte cache", () => {
  it("copies bytes on write and read while preserving media type", async () => {
    const { backend, metadata, records } = memoryBackend();
    const cache = createBrowserRepositoryByteCache(backend, {}, () => 12);
    const source = Uint8Array.from([1, 2, 3]);

    await cache.write(cacheKey(), {
      bytes: source,
      mediaType: "application/json",
    });
    source[0] = 9;

    const stored = [...records.values()][0] as { bytes: Uint8Array };
    expect(stored.bytes).toEqual(Uint8Array.from([1, 2, 3]));
    expect(stored.bytes).not.toBe(source);

    const firstRead = await cache.read(cacheKey());
    expect(firstRead).toEqual({
      bytes: Uint8Array.from([1, 2, 3]),
      mediaType: "application/json",
    });
    firstRead!.bytes[1] = 8;
    expect((await cache.read(cacheKey()))?.bytes).toEqual(
      Uint8Array.from([1, 2, 3]),
    );
    expect([...metadata.values()][0]).toMatchObject({
      byteLength: 3,
      lastAccessedAt: 12,
    });
  });

  it("isolates records by immutable blob identity", async () => {
    const { backend } = memoryBackend();
    const cache = createBrowserRepositoryByteCache(backend);
    await cache.write(cacheKey(), { bytes: Uint8Array.from([1]) });

    expect(
      await cache.read(
        cacheKey({
          objectId:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as GitObjectSha,
        }),
      ),
    ).toBeUndefined();
  });

  it.each([
    { name: "non-object", record: "invalid" },
    {
      name: "unknown format",
      record: validRecord({ format: "unknown" }),
    },
    {
      name: "mismatched key",
      record: validRecord({
        key: cacheKey({ path: "different.cat" }),
      }),
    },
    {
      name: "invalid bytes",
      record: validRecord({ bytes: [1, 2, 3] }),
    },
    {
      name: "invalid media type",
      record: validRecord({ mediaType: 42 }),
    },
  ])("rejects a $name cache record", async ({ record }) => {
    const cache = createBrowserRepositoryByteCache(
      fixedRecordBackend(record),
    );

    await expect(cache.read(cacheKey())).rejects.toThrow(/cache record/i);
  });

  it("bounds records on both write and read", async () => {
    const { backend } = memoryBackend();
    const cache = createBrowserRepositoryByteCache(backend, {
      maxEntryBytes: 2,
    });

    await expect(
      cache.write(cacheKey(), { bytes: Uint8Array.from([1, 2, 3]) }),
    ).rejects.toThrow(/byte limit/i);

    const oversized = validRecord({ bytes: Uint8Array.from([1, 2, 3]) });
    await expect(
      createBrowserRepositoryByteCache(fixedRecordBackend(oversized), {
        maxEntryBytes: 2,
      }).read(cacheKey()),
    ).rejects.toThrow(/byte limit/i);
  });

  it("evicts least-recently-used bytes before exceeding the total bound", async () => {
    const { backend, records } = memoryBackend();
    let time = 0;
    const cache = createBrowserRepositoryByteCache(
      backend,
      { maxEntryBytes: 4, maxTotalBytes: 5 },
      () => ++time,
    );
    const first = cacheKey({ path: "first.cat" });
    const second = cacheKey({ path: "second.cat" });
    const third = cacheKey({ path: "third.cat" });

    await cache.write(first, { bytes: Uint8Array.from([1, 1]) });
    await cache.write(second, { bytes: Uint8Array.from([2, 2]) });
    await cache.read(first);
    await cache.write(third, { bytes: Uint8Array.from([3, 3]) });

    expect(await cache.read(first)).toBeDefined();
    expect(await cache.read(second)).toBeUndefined();
    expect(await cache.read(third)).toBeDefined();
    expect(
      [...records.values()].reduce<number>(
        (total, record) =>
          total + (record as { bytes: Uint8Array }).bytes.byteLength,
        0,
      ),
    ).toBe(4);
  });

  it("accounts for a replacement without double-counting its old bytes", async () => {
    const { backend, records } = memoryBackend();
    let time = 0;
    const cache = createBrowserRepositoryByteCache(
      backend,
      { maxEntryBytes: 4, maxTotalBytes: 5 },
      () => ++time,
    );
    const first = cacheKey({ path: "first.cat" });
    const second = cacheKey({ path: "second.cat" });

    await cache.write(first, { bytes: Uint8Array.from([1, 1, 1]) });
    await cache.write(second, { bytes: Uint8Array.from([2, 2]) });
    await cache.write(first, { bytes: Uint8Array.from([1]) });

    expect(await cache.read(second)).toBeDefined();
    expect(records.size).toBe(2);
  });

  it("clears unaccountable cache records before accepting a new write", async () => {
    const { backend, metadata, records } = memoryBackend();
    records.set("orphan", { id: "orphan", bytes: Uint8Array.from([9]) });
    metadata.set("broken", { id: "broken" });

    const cache = createBrowserRepositoryByteCache(backend);
    await cache.write(cacheKey(), { bytes: Uint8Array.from([1]) });

    expect(records.size).toBe(1);
    expect(metadata.size).toBe(1);
    expect([...metadata.values()][0]).toMatchObject({ byteLength: 1 });
  });

  it("keeps a valid hit usable when its LRU touch fails", async () => {
    const record = validRecord();
    const backend = fixedRecordBackend(record, {
      touch: async () => Promise.reject(new Error("touch failed")),
    });
    const cache = createBrowserRepositoryByteCache(backend);

    await expect(cache.read(cacheKey())).resolves.toMatchObject({
      bytes: Uint8Array.from([1, 2, 3]),
    });
  });

  it("propagates backend failures for repository-level diagnostics", async () => {
    const backend: BrowserRepositoryCacheRecordBackend = {
      get: async () => Promise.reject(new Error("read failed")),
      getAllMetadata: async () => [],
      put: async () => Promise.reject(new Error("write failed")),
      touch: async () => undefined,
      delete: async () => undefined,
      clear: async () => undefined,
    };
    const cache = createBrowserRepositoryByteCache(backend);

    await expect(cache.read(cacheKey())).rejects.toThrow("read failed");
    await expect(
      cache.write(cacheKey(), { bytes: Uint8Array.from([1]) }),
    ).rejects.toThrow("write failed");
  });

  it("returns no adapter when IndexedDB is unavailable", () => {
    expect(createIndexedDbRepositoryByteCache(null)).toBeUndefined();
  });

  it("rejects invalid adapter limits during construction", () => {
    expect(() =>
      createBrowserRepositoryByteCache(memoryBackend().backend, {
        maxEntryBytes: 0,
      }),
    ).toThrow(/positive safe integer/i);
    expect(() =>
      createBrowserRepositoryByteCache(memoryBackend().backend, {
        maxTotalBytes: 0,
      }),
    ).toThrow(/positive safe integer/i);
    expect(() =>
      createBrowserRepositoryByteCache(memoryBackend().backend, {
        maxEntryBytes: 3,
        maxTotalBytes: 2,
      }),
    ).toThrow(/must not exceed/i);
  });
});

function cacheKey(
  overrides: Partial<PinnedRepositoryByteCacheKey> = {},
): PinnedRepositoryByteCacheKey {
  return {
    provider: "github",
    owner: "BSData",
    repository: "wh40k-11e",
    revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    path: "Imperium - Imperial Knights.json",
    objectId: "1111111111111111111111111111111111111111" as GitObjectSha,
    ...overrides,
  };
}

function validRecord(overrides: Record<string, unknown> = {}): unknown {
  const key = cacheKey();
  return {
    id: recordId(key),
    format: "rosterforge.pinned-repository-byte-cache",
    version: 1,
    key,
    bytes: Uint8Array.from([1, 2, 3]),
    ...overrides,
  };
}

function recordId(key: PinnedRepositoryByteCacheKey): string {
  return JSON.stringify([
    key.provider,
    key.owner,
    key.repository,
    key.revision,
    key.path,
    key.objectId,
  ]);
}

function memoryBackend(): {
  readonly backend: BrowserRepositoryCacheRecordBackend;
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
  overrides: Partial<BrowserRepositoryCacheRecordBackend> = {},
): BrowserRepositoryCacheRecordBackend {
  const metadata = new Map<string, BrowserRepositoryCacheMetadataRecord>();
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