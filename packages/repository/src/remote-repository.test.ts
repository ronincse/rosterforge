import { describe, expect, it, vi } from "vitest";

import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  buildPinnedBattleScribeRepositoryIndex,
  acquirePinnedBattleScribeDependencyClosure,
} from "./remote-repository.js";
import {
  calculateGitBlobObjectId,
  type PinnedRepositoryByteCache,
  type PinnedRepositoryByteCacheEntry,
  type PinnedRepositoryByteCacheKey,
} from "./repository-cache.js";
import {
  githubRawFileUrl,
  pinGitHubRepository,
  type GitObjectSha,
  type PinnedGitHubRepository,
  type PinnedGitHubRepositoryFile,
  type PinnedGitHubRepositoryTree,
  type RepositoryFetch,
} from "./pinned-github.js";

describe("remote BattleScribe repository orchestration", () => {
  it("indexes sequentially and reacquires only the complete selected closure", async () => {
    const fixture = await repositoryFixture();
    const cache = new MemoryByteCache();
    const fetcher = fixtureFetch(fixture);
    const indexProgress = vi.fn();

    const indexed = await buildPinnedBattleScribeRepositoryIndex(fixture.tree, {
      cache,
      fetch: fetcher,
      importedAt,
      onProgress: indexProgress,
    });

    expect(indexed.ok).toBe(true);
    if (!indexed.ok) {
      return;
    }
    expect(indexed.diagnostics).toEqual([]);
    expect(indexed.value.status).toBe("complete");
    expect(indexed.value.files.map(({ status, cacheStatus }) => [
      status,
      cacheStatus,
    ])).toEqual([
      ["indexed", "miss"],
      ["indexed", "miss"],
      ["indexed", "miss"],
    ]);
    expect(indexed.value.index.documents.map(({ id }) => id)).toEqual([
      "materialization-client",
      "materialization-catalogue",
      "system-203",
    ]);
    expect(indexed.value.totalBytes).toBe(fixture.totalBytes);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(indexProgress.mock.calls.map(([progress]) => progress)).toEqual([
      {
        phase: "indexing",
        completedFiles: 0,
        totalFiles: 3,
        acceptedBytes: 0,
      },
      expect.objectContaining({
        phase: "indexing",
        completedFiles: 1,
        totalFiles: 3,
        currentPath: "materialization-client.cat",
      }),
      expect.objectContaining({
        completedFiles: 2,
        currentPath: "materialization.cat",
      }),
      expect.objectContaining({
        completedFiles: 3,
        currentPath: "projection.gst",
        acceptedBytes: fixture.totalBytes,
      }),
    ]);

    const closureProgress = vi.fn();
    const closure = await acquirePinnedBattleScribeDependencyClosure(
      fixture.tree,
      indexed.value.index,
      "materialization-client.cat",
      { cache, fetch: fetcher, importedAt, onProgress: closureProgress },
    );

    expect(closure.ok).toBe(true);
    if (!closure.ok) {
      return;
    }
    expect(closure.diagnostics).toEqual([]);
    expect(closure.value.status).toBe("complete");
    expect(closure.value.files.map(({ role, summary, cacheStatus }) => [
      role,
      summary.path,
      cacheStatus,
    ])).toEqual([
      ["gameSystem", "projection.gst", "hit"],
      ["selectedCatalogue", "materialization-client.cat", "hit"],
      ["catalogueDependency", "materialization.cat", "hit"],
    ]);
    expect(closure.value.documents.map(({ metadata }) => metadata.id)).toEqual([
      "system-203",
      "materialization-client",
      "materialization-catalogue",
    ]);
    expect(closure.value.documents[1]?.sourceBytes).toEqual(
      fixture.bytesByPath.get("materialization-client.cat"),
    );
    expect(closure.value.documents[1]?.projection.node).toBe(
      closure.value.documents[1]?.root,
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(closureProgress).toHaveBeenCalledTimes(4);
    expect(closureProgress.mock.calls.at(-1)?.[0]).toEqual({
      phase: "acquiring",
      completedFiles: 3,
      totalFiles: 3,
      currentPath: "materialization.cat",
      acceptedBytes: fixture.totalBytes,
    });
  });

  it("keeps progress observers from changing acquisition results", async () => {
    const fixture = await repositoryFixture();

    const indexed = await buildPinnedBattleScribeRepositoryIndex(fixture.tree, {
      fetch: fixtureFetch(fixture),
      importedAt,
      onProgress: () => {
        throw new Error("observer failed");
      },
    });

    expect(indexed.ok).toBe(true);
    expect(indexed.ok && indexed.value.status).toBe("complete");
  });

  it("keeps an incomplete plan usable when a target is absent from the index", async () => {
    const fixture = await repositoryFixture();
    const indexed = await buildPinnedBattleScribeRepositoryIndex(fixture.tree, {
      fetch: fixtureFetch(fixture),
      importedAt,
    });
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) {
      return;
    }
    const incompleteIndex = {
      ...indexed.value.index,
      documents: indexed.value.index.documents.filter(
        ({ id }) => id !== "materialization-catalogue",
      ),
    };

    const closure = await acquirePinnedBattleScribeDependencyClosure(
      fixture.tree,
      incompleteIndex,
      "materialization-client.cat",
      { fetch: fixtureFetch(fixture), importedAt },
    );

    expect(closure.ok).toBe(true);
    if (!closure.ok) {
      return;
    }
    expect(closure.value.status).toBe("incomplete");
    expect(closure.value.documents.map(({ metadata }) => metadata.id)).toEqual([
      "system-203",
      "materialization-client",
    ]);
    expect(closure.diagnostics.map(({ code }) => code)).toEqual([
      "REPOSITORY_DEPENDENCY_TARGET_MISSING",
    ]);
  });

  it("rejects an acquired document whose metadata differs from its plan", async () => {
    const fixture = await repositoryFixture();
    const indexed = await buildPinnedBattleScribeRepositoryIndex(fixture.tree, {
      fetch: fixtureFetch(fixture),
      importedAt,
    });
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) {
      return;
    }
    const tamperedIndex = {
      ...indexed.value.index,
      documents: indexed.value.index.documents.map((summary) =>
        summary.path === "materialization-client.cat"
          ? { ...summary, name: "Tampered Catalogue Name" }
          : summary,
      ),
    };

    const closure = await acquirePinnedBattleScribeDependencyClosure(
      fixture.tree,
      tamperedIndex,
      "materialization-client.cat",
      { fetch: fixtureFetch(fixture), importedAt },
    );

    expect(closure.ok).toBe(true);
    if (!closure.ok) {
      return;
    }
    expect(closure.value.status).toBe("incomplete");
    expect(closure.value.documents.map(({ metadata }) => metadata.id)).toEqual([
      "system-203",
      "materialization-catalogue",
    ]);
    expect(closure.diagnostics).toEqual([
      expect.objectContaining({
        code: "REPOSITORY_CLOSURE_INDEX_MISMATCH",
        severity: "error",
        location: {
          source: expect.objectContaining({
            filename: "materialization-client.cat",
          }),
        },
      }),
    ]);
  });

  it("isolates malformed files while retaining valid remote summaries", async () => {
    const fixture = await repositoryFixture({ includeInvalid: true });

    const indexed = await buildPinnedBattleScribeRepositoryIndex(fixture.tree, {
      fetch: fixtureFetch(fixture),
      importedAt,
    });

    expect(indexed.ok).toBe(true);
    if (!indexed.ok) {
      return;
    }
    expect(indexed.value.status).toBe("partial");
    expect(indexed.value.files.map(({ status }) => status)).toEqual([
      "rejected",
      "indexed",
      "indexed",
      "indexed",
    ]);
    expect(indexed.value.index.documents).toHaveLength(3);
    expect(indexed.diagnostics.map(({ code }) => code)).toEqual([
      "BS_XML_INVALID",
    ]);
  });

  it("preflights repository limits and rejects mismatched pinned sources", async () => {
    const fixture = await repositoryFixture();
    const fetcher = fixtureFetch(fixture);
    const limited = await buildPinnedBattleScribeRepositoryIndex(fixture.tree, {
      fetch: fetcher,
      importedAt,
      repositoryLimits: { maxFiles: 2 },
    });
    const otherSource = pinGitHubRepository({
      owner: "BSData",
      repository: "other-system",
      revision,
    });
    if (!otherSource.ok) {
      throw new Error("The alternate test source was not pinned.");
    }
    const mismatched = await acquirePinnedBattleScribeDependencyClosure(
      fixture.tree,
      { source: otherSource.value, documents: [] },
      "materialization-client.cat",
      { fetch: fetcher, importedAt },
    );

    expect(limited.ok).toBe(false);
    expect(limited.diagnostics[0]?.code).toBe("REPOSITORY_REMOTE_FILE_LIMIT");
    expect(fetcher).not.toHaveBeenCalled();
    expect(mismatched.ok).toBe(false);
    expect(mismatched.diagnostics[0]?.code).toBe(
      "REPOSITORY_CLOSURE_SOURCE_MISMATCH",
    );
  });
});

const revision = "54c189f4fd01878351fab05586d3b38d9c7f6ddc";
const importedAt = "2026-08-13T12:00:00.000Z";

interface RepositoryFixture {
  readonly tree: PinnedGitHubRepositoryTree;
  readonly bytesByPath: ReadonlyMap<string, Uint8Array>;
  readonly totalBytes: number;
}

class MemoryByteCache implements PinnedRepositoryByteCache {
  readonly #entries = new Map<string, PinnedRepositoryByteCacheEntry>();

  async read(
    key: PinnedRepositoryByteCacheKey,
  ): Promise<PinnedRepositoryByteCacheEntry | undefined> {
    return this.#entries.get(JSON.stringify(key));
  }

  async write(
    key: PinnedRepositoryByteCacheKey,
    entry: PinnedRepositoryByteCacheEntry,
  ): Promise<void> {
    this.#entries.set(JSON.stringify(key), entry);
  }
}

async function repositoryFixture(
  options: { readonly includeInvalid?: boolean } = {},
): Promise<RepositoryFixture> {
  const entries: [string, Uint8Array][] = [
    [
      "materialization-client.cat",
      new Uint8Array(fixtureBytes("materialization-client.cat")),
    ],
    ["materialization.cat", new Uint8Array(fixtureBytes("materialization.cat"))],
    ["projection.gst", new Uint8Array(fixtureBytes("projection.gst"))],
  ];
  if (options.includeInvalid === true) {
    entries.unshift([
      "invalid.cat",
      new TextEncoder().encode("not valid BattleScribe XML"),
    ]);
  }
  const bytesByPath = new Map(entries);
  const files: PinnedGitHubRepositoryFile[] = [];
  for (const [path, bytes] of entries) {
    files.push({
      path,
      objectId: await calculateGitBlobObjectId(bytes),
      byteSize: bytes.byteLength,
    });
  }
  return {
    tree: {
      source: pinnedSource(),
      objectId: files[0]?.objectId ?? (revision as GitObjectSha),
      files,
    },
    bytesByPath,
    totalBytes: entries.reduce((total, [, bytes]) => total + bytes.byteLength, 0),
  };
}

function fixtureFetch(fixture: RepositoryFixture) {
  return vi.fn<RepositoryFetch>(async (url) => {
    const entry = [...fixture.bytesByPath.entries()].find(
      ([path]) => githubRawFileUrl(fixture.tree.source, path) === url,
    );
    if (entry === undefined) {
      return new Response("missing", { status: 404 });
    }
    const bytes = entry[1];
    return new Response(bytes.slice().buffer, {
      status: 200,
      headers: {
        "content-length": String(bytes.byteLength),
        "content-type": "application/xml",
      },
    });
  });
}

function pinnedSource(): PinnedGitHubRepository {
  const pinned = pinGitHubRepository({
    owner: "BSData",
    repository: "fictional-system",
    revision,
  });
  if (!pinned.ok) {
    throw new Error("The test repository source was not pinned.");
  }
  return pinned.value;
}
