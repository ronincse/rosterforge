import { describe, expect, it, vi } from "vitest";

import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  acquireCachedPinnedGitHubBattleScribeFile,
  calculateGitBlobObjectId,
  readPinnedGitHubTreeFile,
  type PinnedRepositoryByteCache,
  type PinnedRepositoryByteCacheEntry,
  type PinnedRepositoryByteCacheKey,
} from "./repository-cache.js";
import {
  pinGitHubRepository,
  type PinnedGitHubRepository,
  type PinnedGitHubRepositoryFile,
  type RepositoryFetch,
} from "./pinned-github.js";

describe("pinned repository byte caching", () => {
  it("calculates the standard Git blob object ID", async () => {
    const bytes = new TextEncoder().encode("hello\n");

    await expect(calculateGitBlobObjectId(bytes)).resolves.toBe(
      "ce013625030ba8dba906f756967f9e9ca394464a",
    );
  });

  it("writes a verified miss and securely ingests the subsequent cache hit", async () => {
    const bytes = new Uint8Array(fixtureBytes("projection-json-catalogue.json"));
    const file = await repositoryFile("Aeldari - Craftworlds.json", bytes);
    const cache = new MemoryByteCache();
    const fetcher = vi.fn<RepositoryFetch>(async () => response(bytes));

    const first = await acquireCachedPinnedGitHubBattleScribeFile(
      pinnedSource(),
      file,
      { cache, fetch: fetcher, importedAt },
    );
    const second = await acquireCachedPinnedGitHubBattleScribeFile(
      pinnedSource(),
      file,
      {
        cache,
        fetch: async () => {
          throw new Error("A cache hit must not request the network.");
        },
        importedAt,
      },
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.value.cacheStatus).toBe("miss");
    expect(second.value.cacheStatus).toBe("hit");
    expect(first.value.document.metadata.id).toBe("json-catalogue");
    expect(second.value.document.metadata.id).toBe("json-catalogue");
    expect(second.value.document.sourceBytes).toEqual(bytes);
    expect(second.value.document.sourceBytes).not.toBe(cache.lastReadBytes);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.writeCount).toBe(1);
    expect(cache.lastKey).toEqual({
      provider: "github",
      owner: "BSData",
      repository: "wh40k-11e",
      revision,
      path: file.path,
      objectId: file.objectId,
    });
  });

  it("replaces an invalid cache entry with a verified network response", async () => {
    const bytes = new Uint8Array(fixtureBytes("projection-json-catalogue.json"));
    const file = await repositoryFile("Aeldari - Craftworlds.json", bytes);
    const corrupt = bytes.slice();
    corrupt[0] = corrupt[0] === 0 ? 1 : 0;
    const cache = new MemoryByteCache();
    await cache.write(cacheKey(file), { bytes: corrupt });

    const read = await readPinnedGitHubTreeFile(pinnedSource(), file, {
      cache,
      fetch: async () => response(bytes),
    });

    expect(read.ok).toBe(true);
    if (!read.ok) {
      return;
    }
    expect(read.value.cacheStatus).toBe("invalid");
    expect(read.value.downloaded.bytes).toEqual(bytes);
    expect(read.diagnostics).toEqual([
      expect.objectContaining({
        code: "REPOSITORY_CACHE_ENTRY_INVALID",
        severity: "warning",
        details: expect.objectContaining({
          objectId: file.objectId,
          reasonCodes: ["REPOSITORY_GITHUB_BLOB_INTEGRITY_MISMATCH"],
        }),
      }),
    ]);
    expect(cache.writeCount).toBe(2);
  });

  it("rejects network bytes that do not match the pinned blob", async () => {
    const expected = new TextEncoder().encode("expected");
    const corrupt = new TextEncoder().encode("expectez");
    const file = await repositoryFile("fictional.cat", expected, undefined);

    const read = await readPinnedGitHubTreeFile(pinnedSource(), file, {
      fetch: async () => response(corrupt),
    });

    expect(read.ok).toBe(false);
    expect(read.diagnostics).toEqual([
      expect.objectContaining({
        code: "REPOSITORY_GITHUB_BLOB_INTEGRITY_MISMATCH",
        severity: "error",
        details: expect.objectContaining({
          expectedObjectId: file.objectId,
        }),
      }),
    ]);
  });

  it("keeps verified acquisition usable when cache reads and writes fail", async () => {
    const bytes = new Uint8Array(fixtureBytes("projection-json-catalogue.json"));
    const file = await repositoryFile("Aeldari - Craftworlds.json", bytes);
    const cache: PinnedRepositoryByteCache = {
      async read() {
        throw new Error("read unavailable");
      },
      async write() {
        throw new Error("write unavailable");
      },
    };

    const acquired = await acquireCachedPinnedGitHubBattleScribeFile(
      pinnedSource(),
      file,
      { cache, fetch: async () => response(bytes), importedAt },
    );

    expect(acquired.ok).toBe(true);
    if (!acquired.ok) {
      return;
    }
    expect(acquired.value.cacheStatus).toBe("unavailable");
    expect(acquired.value.document.metadata.id).toBe("json-catalogue");
    expect(acquired.diagnostics.map(({ code }) => code)).toEqual([
      "REPOSITORY_CACHE_READ_FAILED",
      "REPOSITORY_CACHE_WRITE_FAILED",
    ]);
  });
});

const revision = "54c189f4fd01878351fab05586d3b38d9c7f6ddc";
const importedAt = "2026-08-13T12:00:00.000Z";

class MemoryByteCache implements PinnedRepositoryByteCache {
  readonly #entries = new Map<string, PinnedRepositoryByteCacheEntry>();
  writeCount = 0;
  lastKey: PinnedRepositoryByteCacheKey | undefined;
  lastReadBytes: Uint8Array | undefined;

  async read(
    key: PinnedRepositoryByteCacheKey,
  ): Promise<PinnedRepositoryByteCacheEntry | undefined> {
    this.lastKey = key;
    const entry = this.#entries.get(serializeKey(key));
    if (entry === undefined) {
      return undefined;
    }
    this.lastReadBytes = entry.bytes;
    return {
      bytes: entry.bytes,
      ...(entry.mediaType === undefined ? {} : { mediaType: entry.mediaType }),
    };
  }

  async write(
    key: PinnedRepositoryByteCacheKey,
    entry: PinnedRepositoryByteCacheEntry,
  ): Promise<void> {
    this.writeCount += 1;
    this.lastKey = key;
    this.#entries.set(serializeKey(key), entry);
  }
}

async function repositoryFile(
  path: string,
  bytes: Uint8Array,
  byteSize: number | undefined = bytes.byteLength,
): Promise<PinnedGitHubRepositoryFile> {
  return {
    path,
    objectId: await calculateGitBlobObjectId(bytes),
    ...(byteSize === undefined ? {} : { byteSize }),
  };
}

function pinnedSource(): PinnedGitHubRepository {
  const pinned = pinGitHubRepository({
    owner: "BSData",
    repository: "wh40k-11e",
    revision,
  });
  if (!pinned.ok) {
    throw new Error("The test repository source was not pinned.");
  }
  return pinned.value;
}

function cacheKey(
  file: PinnedGitHubRepositoryFile,
): PinnedRepositoryByteCacheKey {
  return {
    provider: "github",
    owner: "BSData",
    repository: "wh40k-11e",
    revision,
    path: file.path,
    objectId: file.objectId,
  };
}

function serializeKey(key: PinnedRepositoryByteCacheKey): string {
  return JSON.stringify(key);
}

function response(bytes: Uint8Array): Response {
  return new Response(bytes.slice().buffer, {
    status: 200,
    headers: {
      "content-length": String(bytes.byteLength),
      "content-type": "application/json",
    },
  });
}
