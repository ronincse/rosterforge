import { describe, expect, it, vi } from "vitest";

import { fixtureBytes } from "@rosterforge/test-fixtures";
import {
  calculateGitBlobObjectId,
  githubRawFileUrl,
  pinGitHubRepository,
  type GitObjectSha,
  type PinnedRepositoryByteCache,
  type PinnedRepositoryByteCacheEntry,
  type PinnedRepositoryByteCacheKey,
  type RepositoryFetch,
} from "@rosterforge/repository";

import {
  acquireRemoteCatalogue,
  indexRemoteCatalogueSource,
  type RemoteCatalogueSourceDefinition,
} from "./remote-catalogue-source.js";

describe("remote catalogue source", () => {
  it("indexes and composes a pinned catalogue closure with download provenance", async () => {
    const fixture = await sourceFixture();
    const fetcher = fixtureFetch(fixture);
    const cache = new MemoryByteCache();
    const progress = vi.fn();

    const indexed = await indexRemoteCatalogueSource(sourceDefinition, {
      cache,
      fetch: fetcher,
      importedAt,
      onProgress: progress,
    });

    expect(indexed.ok).toBe(true);
    if (!indexed.ok) return;
    expect(indexed.value.catalogues.map(({ path, id, name }) => ({
      path,
      id,
      name,
    }))).toEqual([
      {
        path: "minimal.cat",
        id: "synthetic-catalogue",
        name: "Synthetic Faction",
      },
    ]);
    expect(indexed.value.report.totalBytes).toBe(fixture.totalBytes);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(progress.mock.calls[0]?.[0]).toEqual({
      phase: "listing",
      completedFiles: 0,
      acceptedBytes: 0,
    });
    expect(progress.mock.calls.at(-1)?.[0]).toMatchObject({
      phase: "indexing",
      completedFiles: 2,
      totalFiles: 2,
      acceptedBytes: fixture.totalBytes,
    });

    progress.mockClear();
    const acquired = await acquireRemoteCatalogue(
      indexed.value,
      "minimal.cat",
      {
        batchId: "remote-batch",
        cache,
        fetch: fetcher,
        importedAt,
        onProgress: progress,
      },
    );

    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    expect(acquired.value.closure.status).toBe("complete");
    expect(acquired.value.library.documents).toBe(
      acquired.value.library.importReport.documents,
    );
    expect(
      acquired.value.library.documents.map(({ metadata }) => metadata.id),
    ).toEqual(["synthetic-system", "synthetic-catalogue"]);
    expect(
      acquired.value.library.importReport.files.map(({ source }) => ({
        filename: source.filename,
        kind: source.kind,
      })),
    ).toEqual([
      { filename: "minimal.gst", kind: "download" },
      { filename: "minimal.cat", kind: "download" },
    ]);
    expect(acquired.value.library.documents[1]?.sourceBytes).toEqual(
      fixture.bytesByPath.get("minimal.cat"),
    );
    expect(acquired.value.library.selectableCatalogues[0]?.key).toBe(
      acquired.value.selectedCatalogueKey,
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(progress.mock.calls.at(-1)?.[0]).toMatchObject({
      phase: "acquiring",
      completedFiles: 2,
      totalFiles: 2,
      acceptedBytes: fixture.totalBytes,
    });
  });

  it("rejects a moving or abbreviated revision before network access", async () => {
    const fetcher = vi.fn<RepositoryFetch>();
    const result = await indexRemoteCatalogueSource(
      {
        ...sourceDefinition,
        repository: {
          ...sourceDefinition.repository,
          revision: "main",
        },
      },
      { fetch: fetcher, importedAt },
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe(
      "REPOSITORY_GITHUB_REVISION_NOT_PINNED",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});

const revision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const importedAt = "2026-08-13T18:00:00.000Z";
const sourceDefinition: RemoteCatalogueSourceDefinition = {
  id: "fictional",
  title: "Fictional System",
  gameSystem: "Synthetic Game",
  description: "A pinned test source.",
  repository: {
    owner: "BSData",
    repository: "fictional-system",
    revision,
  },
};

interface SourceFixture {
  readonly bytesByPath: ReadonlyMap<string, Uint8Array>;
  readonly objectIdsByPath: ReadonlyMap<string, GitObjectSha>;
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

async function sourceFixture(): Promise<SourceFixture> {
  const bytesByPath = new Map([
    ["minimal.cat", new Uint8Array(fixtureBytes("minimal.cat"))],
    ["minimal.gst", new Uint8Array(fixtureBytes("minimal.gst"))],
  ]);
  const objectIdsByPath = new Map<string, GitObjectSha>();
  for (const [path, bytes] of bytesByPath) {
    objectIdsByPath.set(path, await calculateGitBlobObjectId(bytes));
  }
  return {
    bytesByPath,
    objectIdsByPath,
    totalBytes: [...bytesByPath.values()].reduce(
      (total, bytes) => total + bytes.byteLength,
      0,
    ),
  };
}

function fixtureFetch(fixture: SourceFixture) {
  const pinned = pinGitHubRepository(sourceDefinition.repository);
  if (!pinned.ok) throw new Error("Expected the test source to be pinned.");

  return vi.fn<RepositoryFetch>(async (url) => {
    if (url.startsWith("https://api.github.com/")) {
      const body = JSON.stringify({
        sha: revision,
        truncated: false,
        tree: [...fixture.bytesByPath.entries()].map(([path, bytes]) => ({
          path,
          mode: "100644",
          type: "blob",
          sha: fixture.objectIdsByPath.get(path),
          size: bytes.byteLength,
        })),
      });
      return new Response(body, {
        status: 200,
        headers: {
          "content-length": String(new TextEncoder().encode(body).byteLength),
          "content-type": "application/json",
        },
      });
    }

    const entry = [...fixture.bytesByPath.entries()].find(
      ([path]) => githubRawFileUrl(pinned.value, path) === url,
    );
    if (entry === undefined) return new Response("missing", { status: 404 });
    return new Response(entry[1].slice().buffer, {
      status: 200,
      headers: {
        "content-length": String(entry[1].byteLength),
        "content-type": "application/xml",
      },
    });
  });
}
