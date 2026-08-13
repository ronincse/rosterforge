import { describe, expect, it } from "vitest";

import type {
  GitObjectSha,
  PinnedRepositoryByteCacheKey,
} from "@rosterforge/repository";

import {
  createBrowserRepositoryByteCache,
  createIndexedDbRepositoryByteCache,
  type BrowserRepositoryCacheRecordBackend,
} from "./browser-repository-cache.js";

describe("browser repository byte cache", () => {
  it("copies bytes on write and read while preserving media type", async () => {
    const { backend, records } = memoryBackend();
    const cache = createBrowserRepositoryByteCache(backend);
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

  it("propagates backend failures for repository-level diagnostics", async () => {
    const backend: BrowserRepositoryCacheRecordBackend = {
      get: async () => Promise.reject(new Error("read failed")),
      put: async () => Promise.reject(new Error("write failed")),
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
    id: JSON.stringify([
      key.provider,
      key.owner,
      key.repository,
      key.revision,
      key.path,
      key.objectId,
    ]),
    format: "rosterforge.pinned-repository-byte-cache",
    version: 1,
    key,
    bytes: Uint8Array.from([1, 2, 3]),
    ...overrides,
  };
}

function memoryBackend(): {
  readonly backend: BrowserRepositoryCacheRecordBackend;
  readonly records: Map<string, unknown>;
} {
  const records = new Map<string, unknown>();
  return {
    records,
    backend: {
      get: async (id) => records.get(id),
      put: async (record) => {
        if (typeof record !== "object" || record === null) {
          throw new Error("Expected an object record.");
        }
        const id = Reflect.get(record, "id");
        if (typeof id !== "string") throw new Error("Expected a record ID.");
        records.set(id, record);
      },
    },
  };
}

function fixedRecordBackend(
  record: unknown,
): BrowserRepositoryCacheRecordBackend {
  return {
    get: async () => record,
    put: async () => undefined,
  };
}
