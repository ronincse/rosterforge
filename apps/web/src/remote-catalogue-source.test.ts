import { catalogueSourceContext } from "./catalogue-data-freshness.js";
import { describe, expect, it, vi } from "vitest";
import { createBrowserRemoteCatalogueMetadataCache, type BrowserRemoteMetadataCacheMetadataRecord } from "./browser-remote-metadata-cache.js";

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
  defaultRemoteCatalogueSources,
  indexRemoteCatalogueSource,
  type RemoteCatalogueMetadataCache,
  type RemoteCatalogueMetadataCacheEntry,
  type RemoteCatalogueMetadataCacheKey,
  type RemoteCatalogueSourceDefinition,
} from "./remote-catalogue-source.js";

describe("remote catalogue source", () => {
  it("keeps the existing 40k definition and registers an independent experimental StarCraft pin", () => {
    expect(defaultRemoteCatalogueSources[0]).toEqual({
      id: "bsdata-wh40k-11e-04c62fc",
      title: "Warhammer 40,000 11th Edition",
      gameSystem: "Warhammer 40,000",
      description: "Community-maintained BSData pinned to an immutable Git commit.",
      repository: { owner: "BSData", repository: "wh40k-11e", revision: "04c62fcd041b3808c39d5c46fd677c704027b979" },
      estimatedIndexBytes: 69_647_926,
    });
    const pilot = defaultRemoteCatalogueSources[1]!;
    expect(pilot.repository).toEqual({ owner: "loicmusy", repository: "StarcraftTMG-NR", revision: "99261754e0449bbaaa04e6890e1625b144f9ece1" });
    expect(pilot.title).toMatch(/StarCraft.*experimental/u);
    expect(pilot.description).toMatch(/Experimental/u);
    expect(new Set(defaultRemoteCatalogueSources.map(source => source.id)).size).toBe(defaultRemoteCatalogueSources.length);
    for (const source of defaultRemoteCatalogueSources) expect(pinGitHubRepository(source.repository).ok).toBe(true);
  });

  it("isolates shared byte and metadata caches when switching registered sources", async () => {
    const fixture = await sourceFixture();
    const cache = new MemoryByteCache();
    const metadataCache = new MemoryMetadataCache();
    for (const source of defaultRemoteCatalogueSources) {
      const fetcher = fixtureFetch(fixture, source);
      const first = await indexRemoteCatalogueSource(source, { importedAt, fetch: fetcher, cache, metadataCache });
      expect(first.ok).toBe(true);
      if (!first.ok) throw new Error("Expected source index");
      expect(first.value.metadataCacheStatus).toBe("miss");
      expect(fetcher).toHaveBeenCalledTimes(3);
      const acquired = await acquireRemoteCatalogue(first.value, "minimal.cat", { importedAt, batchId: source.id, fetch: fetcher, cache });
      expect(acquired.ok).toBe(true);
      if (!acquired.ok) throw new Error("Expected source closure");
      expect(acquired.value.closure.source).toMatchObject(source.repository);
      const selected = acquired.value.library.selectableCatalogues.find(c=>c.key===acquired.value.selectedCatalogueKey)!;
      expect(catalogueSourceContext(selected)).toMatchObject({eligible:true,source:source.repository});
      expect(fetcher).toHaveBeenCalledTimes(3);
      const repeat = await indexRemoteCatalogueSource(source, { importedAt, fetch: fetcher, cache, metadataCache });
      expect(repeat.ok && repeat.value.metadataCacheStatus).toBe("hit");
      expect(fetcher).toHaveBeenCalledTimes(4);
      if (!repeat.ok) throw Error("Expected warm source index");
      const warm = await acquireRemoteCatalogue(repeat.value,"minimal.cat",{importedAt,batchId:source.id,fetch:fetcher,cache});
      if (!warm.ok) throw Error("Expected warm source closure");
      const warmChoice=warm.value.library.selectableCatalogues.find(c=>c.key===warm.value.selectedCatalogueKey)!;
      expect(catalogueSourceContext(warmChoice)).toEqual(catalogueSourceContext(selected));
      expect(warm.value.library.importReport.files.map(f=>f.sourceBytes)).toEqual(acquired.value.library.importReport.files.map(f=>f.sourceBytes));
      expect(fetcher).toHaveBeenCalledTimes(4);
    }
  });
  it("indexes, caches, and composes a pinned catalogue closure with download provenance", async () => {
    const fixture = await sourceFixture();
    const fetcher = fixtureFetch(fixture);
    const cache = new MemoryByteCache();
    const metadataCache = new MemoryMetadataCache();
    const progress = vi.fn();

    const indexed = await indexRemoteCatalogueSource(sourceDefinition, {
      cache,
      fetch: fetcher,
      importedAt,
      metadataCache,
      onProgress: progress,
    });

    expect(indexed.ok).toBe(true);
    if (!indexed.ok) return;
    expect(indexed.value.metadataCacheStatus).toBe("miss");
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

    const cachedProgress = vi.fn();
    const reindexed = await indexRemoteCatalogueSource(sourceDefinition, {
      cache,
      fetch: fetcher,
      importedAt: "2026-08-13T20:00:00.000Z",
      metadataCache,
      onProgress: cachedProgress,
    });

    expect(reindexed.ok).toBe(true);
    if (!reindexed.ok) return;
    expect(reindexed.value.metadataCacheStatus).toBe("hit");
    expect(reindexed.value.report.tree).not.toBe(indexed.value.report.tree);
    expect(reindexed.value.report.index.documents).toEqual(
      indexed.value.report.index.documents,
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(cachedProgress).toHaveBeenCalledTimes(2);
    expect(cachedProgress.mock.calls.at(-1)?.[0]).toMatchObject({
      phase: "indexing",
      completedFiles: 2,
      totalFiles: 2,
      acceptedBytes: fixture.totalBytes,
    });
  });

  it("keeps focused catalogue dependencies out of the workspace selector", async () => {
    const fixture = await linkedCatalogueFixture();
    const fetcher = fixtureFetch(fixture);
    const indexed = await indexRemoteCatalogueSource(sourceDefinition, {
      fetch: fetcher,
      importedAt,
    });
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) return;

    expect(indexed.value.catalogues.map(({ path }) => path)).toEqual([
      "dependency.cat",
      "selected.cat",
    ]);
    const acquired = await acquireRemoteCatalogue(
      indexed.value,
      "selected.cat",
      {
        batchId: "focused-remote-batch",
        fetch: fetcher,
        importedAt,
      },
    );
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;

    expect(
      acquired.value.library.documents.map(({ metadata }) => metadata.id),
    ).toEqual([
      "synthetic-system",
      "selected-catalogue",
      "dependency-catalogue",
    ]);
    expect(
      acquired.value.library.catalogues.map(({ name }) => name),
    ).toEqual(["Selected Faction"]);
    expect(
      acquired.value.library.selectableCatalogues.map(({ name }) => name),
    ).toEqual(["Selected Faction"]);
    expect(
      acquired.value.library.selectableCatalogues[0]?.context.roots.roots.some(
        ({ materialized }) =>
          materialized.kind !== "unresolvedEntryLink" &&
          materialized.definitionDocument.metadata.id ===
            "dependency-catalogue",
      ),
    ).toBe(true);
  });

  it("uses repository metadata to quiet inert costs owned outside the focused closure", async () => {
    const fixture = await externalCostTypeFixture();
    const fetcher = fixtureFetch(fixture);
    const indexed = await indexRemoteCatalogueSource(sourceDefinition, {
      fetch: fetcher,
      importedAt,
    });
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) return;

    expect(
      indexed.value.report.index.documents.find(
        ({ path }) => path === "cost-owner.cat",
      )?.costTypeIds,
    ).toEqual(["repository-owned-cost"]);
    const acquired = await acquireRemoteCatalogue(
      indexed.value,
      "selected.cat",
      {
        batchId: "external-cost-type-batch",
        fetch: fetcher,
        importedAt,
      },
    );

    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    expect(
      acquired.value.library.documents.map(({ source }) => source.filename),
    ).not.toContain("cost-owner.cat");
    expect(acquired.diagnostics).toEqual([]);
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
  it("rejects incompatible cached metadata and rebuilds from verified bytes", async () => {
    const fixture = await sourceFixture();
    const fetcher = fixtureFetch(fixture);
    const cache = new MemoryByteCache();
    const initial = await indexRemoteCatalogueSource(sourceDefinition, {
      cache,
      fetch: fetcher,
      importedAt,
    });
    if (!initial.ok) {
      throw new Error("Expected the initial repository index to succeed.");
    }

    const invalidEntry: RemoteCatalogueMetadataCacheEntry = {
      status: initial.value.report.status,
      files: initial.value.report.files.map((file, index) =>
        index === 0
          ? { ...file, file: { ...file.file, path: "moved.cat" } }
          : file,
      ),
      documents: initial.value.report.index.documents,
      totalBytes: initial.value.report.totalBytes,
    };
    const write = vi.fn<RemoteCatalogueMetadataCache["write"]>();
    const result = await indexRemoteCatalogueSource(sourceDefinition, {
      cache,
      fetch: fetcher,
      importedAt,
      metadataCache: {
        read: async () => invalidEntry,
        write,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadataCacheStatus).toBe("invalid");
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "WEB_REMOTE_INDEX_CACHE_ENTRY_INVALID",
    );
    expect(write).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("continues with diagnostics when metadata storage is unavailable", async () => {
    const fixture = await sourceFixture();
    const metadataCache: RemoteCatalogueMetadataCache = {
      read: async () => Promise.reject(new Error("read failed")),
      write: async () => Promise.reject(new Error("write failed")),
    };
    const result = await indexRemoteCatalogueSource(sourceDefinition, {
      fetch: fixtureFetch(fixture),
      importedAt,
      metadataCache,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadataCacheStatus).toBe("unavailable");
    expect(result.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "WEB_REMOTE_INDEX_CACHE_READ_FAILED",
        "WEB_REMOTE_INDEX_CACHE_WRITE_FAILED",
      ]),
    );
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

class MemoryMetadataCache implements RemoteCatalogueMetadataCache {
  readonly #entries = new Map<
    string,
    RemoteCatalogueMetadataCacheEntry
  >();

  async read(
    key: RemoteCatalogueMetadataCacheKey,
  ): Promise<RemoteCatalogueMetadataCacheEntry | undefined> {
    return this.#entries.get(JSON.stringify(key));
  }

  async write(
    key: RemoteCatalogueMetadataCacheKey,
    entry: RemoteCatalogueMetadataCacheEntry,
  ): Promise<void> {
    this.#entries.set(JSON.stringify(key), entry);
  }
}

async function sourceFixture(catalogueName?: string): Promise<SourceFixture> {
  const bytesByPath = new Map([
    ["minimal.cat", catalogueName === undefined ? new Uint8Array(fixtureBytes("minimal.cat")) : new TextEncoder().encode(new TextDecoder().decode(fixtureBytes("minimal.cat")).replace("Synthetic Faction", catalogueName))],
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

async function linkedCatalogueFixture(): Promise<SourceFixture> {
  const encode = (xml: string) => new TextEncoder().encode(xml);
  const bytesByPath = new Map([
    ["minimal.gst", new Uint8Array(fixtureBytes("minimal.gst"))],
    [
      "dependency.cat",
      encode(`<?xml version="1.0" encoding="UTF-8"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"
  id="dependency-catalogue" name="Dependency Faction" revision="1"
  battleScribeVersion="2.03" gameSystemId="synthetic-system" library="false">
  <selectionEntries>
    <selectionEntry id="dependency-unit" name="Dependency Unit" type="unit" import="true" />
  </selectionEntries>
</catalogue>`),
    ],
    [
      "selected.cat",
      encode(`<?xml version="1.0" encoding="UTF-8"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"
  id="selected-catalogue" name="Selected Faction" revision="1"
  battleScribeVersion="2.03" gameSystemId="synthetic-system" library="false">
  <catalogueLinks>
    <catalogueLink id="selected-dependency" name="Dependency"
      targetId="dependency-catalogue" importRootEntries="true" />
  </catalogueLinks>
</catalogue>`),
    ],
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

async function externalCostTypeFixture(): Promise<SourceFixture> {
  const encode = (xml: string) => new TextEncoder().encode(xml);
  const bytesByPath = new Map([
    ["minimal.gst", new Uint8Array(fixtureBytes("minimal.gst"))],
    [
      "cost-owner.cat",
      encode(`<?xml version="1.0" encoding="UTF-8"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"
  id="cost-owner" name="Cost Owner" revision="1"
  battleScribeVersion="2.03" gameSystemId="synthetic-system" library="false">
  <costTypes>
    <costType id="repository-owned-cost" name="Legacy Cost" defaultCostLimit="-1" hidden="true" />
  </costTypes>
</catalogue>`),
    ],
    [
      "selected.cat",
      encode(`<?xml version="1.0" encoding="UTF-8"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"
  id="selected-catalogue" name="Selected Faction" revision="1"
  battleScribeVersion="2.03" gameSystemId="synthetic-system" library="false">
  <selectionEntries>
    <selectionEntry id="legacy-entry" name="Legacy Entry" type="unit" import="true">
      <costs>
        <cost name="Legacy Cost" typeId="repository-owned-cost" value="0" />
      </costs>
    </selectionEntry>
  </selectionEntries>
</catalogue>`),
    ],
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

function fixtureFetch(fixture: SourceFixture, definition = sourceDefinition) {
  const pinned = pinGitHubRepository(definition.repository);
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

it("rebuilds pre-XML metadata from intact verified bytes, then serves a decoded warm hit", async () => {
  const fixture = await sourceFixture("Raynor&apos;s &amp;quot; Fleet");
  const fetcher = fixtureFetch(fixture);
  const cache = new MemoryByteCache();
  const records = new Map<string, unknown>();
  const metadata = new Map<string, BrowserRemoteMetadataCacheMetadataRecord>();
  const clear = vi.fn(async () => { records.clear(); metadata.clear(); });
  const metadataCache = createBrowserRemoteCatalogueMetadataCache({
    get: async id => records.get(id), getAllMetadata: async () => [...metadata.values()],
    put: async (record, sidecar) => { records.set(sidecar.id, record); metadata.set(sidecar.id, sidecar); },
    touch: async sidecar => { metadata.set(sidecar.id, sidecar); },
    delete: async ids => { for (const id of ids) { records.delete(id); metadata.delete(id); } }, clear,
  });
  const first = await indexRemoteCatalogueSource(sourceDefinition, { importedAt, fetch: fetcher, cache, metadataCache });
  expect(first.ok && first.value.metadataCacheStatus).toBe("miss");
  expect(fetcher).toHaveBeenCalledTimes(3);
  const [id, saved] = [...records.entries()][0]!;
  const record = saved as Record<string, unknown>;
  expect(record.version).toBe(4);
  // Represents an old derived record only. The immutable bytes are identical.
  records.set(id, { ...record, version: 3, payload: String(record.payload).replaceAll("Raynor's &quot; Fleet", "Raynor&apos;s &amp;quot; Fleet") });
  const rebuilt = await indexRemoteCatalogueSource(sourceDefinition, { importedAt, fetch: fetcher, cache, metadataCache });
  expect(rebuilt.ok).toBe(true);
  if (!rebuilt.ok) return;
  expect(rebuilt.value.metadataCacheStatus).toBe("miss");
  expect(rebuilt.value.catalogues.find(d => d.kind === "catalogue")?.name).toBe("Raynor's &quot; Fleet");
  expect(fetcher).toHaveBeenCalledTimes(4); // tree only; both verified blobs reused
  const acquired = await acquireRemoteCatalogue(rebuilt.value, "minimal.cat", { importedAt, batchId: "xml-cache", fetch: fetcher, cache });
  expect(acquired.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
  const warm = await indexRemoteCatalogueSource(sourceDefinition, { importedAt, fetch: fetcher, cache, metadataCache });
  expect(warm.ok && warm.value.metadataCacheStatus).toBe("hit");
  expect(warm.ok && warm.value.catalogues.find(d => d.kind === "catalogue")?.name).toBe("Raynor's &quot; Fleet");
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(clear).not.toHaveBeenCalled();
  for (const [path, bytes] of fixture.bytesByPath) expect(await calculateGitBlobObjectId(bytes)).toBe(fixture.objectIdsByPath.get(path));
});
