import { describe, expect, it, vi } from "vitest";

import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  acquirePinnedGitHubBattleScribeFile,
  inspectGitHubRepositoryUpdate,
  downloadPinnedGitHubFile,
  githubRawFileUrl,
  listPinnedGitHubRepositoryFiles,
  pinGitHubRepository,
  type PinnedGitHubRepository,
  type RepositoryFetch,
} from "./pinned-github.js";

const revision = "54c189f4fd01878351fab05586d3b38d9c7f6ddc";
const treeObjectId = "1111111111111111111111111111111111111111";

describe("pinned GitHub repository acquisition", () => {
  it("accepts only exact commit pins and rejects moving revisions", () => {
    const pinned = pinGitHubRepository({
      owner: "BSData",
      repository: "wh40k-11e",
      revision,
    });
    const moving = pinGitHubRepository({
      owner: "BSData",
      repository: "wh40k-11e",
      revision: "main",
    });

    expect(pinned).toEqual({
      ok: true,
      diagnostics: [],
      value: {
        provider: "github",
        owner: "BSData",
        repository: "wh40k-11e",
        revision,
      },
    });
    expect(moving.ok).toBe(false);
    expect(moving.diagnostics).toEqual([
      expect.objectContaining({ code: "REPOSITORY_GITHUB_REVISION_NOT_PINNED" }),
    ]);
  });

  it("lists supported files from a bounded pinned tree in stable path order", async () => {
    const fetcher = vi.fn<RepositoryFetch>(async () =>
      jsonResponse({
        sha: treeObjectId,
        truncated: false,
        tree: [
          {
            path: "README.md",
            type: "blob",
            sha: "2222222222222222222222222222222222222222",
            size: 10,
          },
          {
            path: "Warhammer 40,000.json",
            type: "blob",
            sha: "3333333333333333333333333333333333333333",
            size: 100,
          },
          {
            path: "Aeldari/Aeldari.cat",
            type: "blob",
            sha: "4444444444444444444444444444444444444444",
            size: 200,
          },
        ],
      }),
    );

    const listed = await listPinnedGitHubRepositoryFiles(pinnedSource(), {
      fetch: fetcher,
    });

    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      return;
    }
    expect(listed.value.source).toBe(pinnedSourceValue);
    expect(listed.value.objectId).toBe(treeObjectId);
    expect(listed.value.files).toEqual([
      {
        path: "Aeldari/Aeldari.cat",
        objectId: "4444444444444444444444444444444444444444",
        byteSize: 200,
      },
      {
        path: "Warhammer 40,000.json",
        objectId: "3333333333333333333333333333333333333333",
        byteSize: 100,
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      `https://api.github.com/repos/BSData/wh40k-11e/git/trees/${revision}?recursive=1`,
      expect.objectContaining({ redirect: "error" }),
    );
  });

  it("rejects unsafe tree paths and truncated repository indexes", async () => {
    const unsafe = await listPinnedGitHubRepositoryFiles(pinnedSource(), {
      fetch: async () =>
        jsonResponse({
          sha: treeObjectId,
          truncated: false,
          tree: [
            {
              path: "../outside.cat",
              type: "blob",
              sha: "5555555555555555555555555555555555555555",
            },
          ],
        }),
    });
    const truncated = await listPinnedGitHubRepositoryFiles(pinnedSource(), {
      fetch: async () =>
        jsonResponse({ sha: treeObjectId, truncated: true, tree: [] }),
    });

    expect(unsafe.ok).toBe(false);
    expect(unsafe.diagnostics[0]?.code).toBe("REPOSITORY_GITHUB_PATH_UNSAFE");
    expect(truncated.ok).toBe(false);
    expect(truncated.diagnostics[0]?.code).toBe(
      "REPOSITORY_GITHUB_INDEX_TRUNCATED",
    );
  });

  it("streams a downloaded JSON file through secure ingestion with provenance", async () => {
    const fixture = fixtureBytes("projection-json-catalogue.json");
    const fetcher = vi.fn<RepositoryFetch>(async () =>
      new Response(new Uint8Array(fixture).buffer, {
        status: 200,
        headers: {
          "content-length": String(fixture.byteLength),
          "content-type": "application/json",
        },
      }),
    );

    const acquired = await acquirePinnedGitHubBattleScribeFile(
      pinnedSource(),
      "Aeldari - Craftworlds.json",
      {
        fetch: fetcher,
        importedAt: "2026-08-13T12:00:00.000Z",
      },
    );

    expect(acquired.ok, JSON.stringify(acquired.diagnostics, null, 2)).toBe(true);
    if (!acquired.ok) {
      return;
    }
    expect(acquired.value).toMatchObject({
      sourceFormat: "json",
      sourceRoot: { kind: "object" },
      metadata: {
        kind: "catalogue",
        id: "json-catalogue",
        gameSystemId: "json-system",
      },
      source: {
        sourceId: `download:github:BSData/wh40k-11e@${revision}:Aeldari - Craftworlds.json`,
        filename: "Aeldari - Craftworlds.json",
        kind: "download",
        importedAt: "2026-08-13T12:00:00.000Z",
        mediaType: "application/json",
        origin: githubRawFileUrl(
          pinnedSource(),
          "Aeldari - Craftworlds.json",
        ),
      },
    });
    expect(acquired.value.sourceBytes).toEqual(new Uint8Array(fixture));
    expect(acquired.value.sourceBytes).not.toBe(fixture);
    expect(acquired.value.projection.node).toBe(acquired.value.root);
  });

  it("rejects declared and streamed file sizes above the configured limit", async () => {
    const declared = await downloadPinnedGitHubFile(
      pinnedSource(),
      "oversized.cat",
      {
        limits: { maxFileBytes: 4 },
        fetch: async () =>
          new Response(new Uint8Array([1]).buffer, {
            status: 200,
            headers: { "content-length": "5" },
          }),
      },
    );
    const streamed = await downloadPinnedGitHubFile(
      pinnedSource(),
      "oversized.cat",
      {
        limits: { maxFileBytes: 4 },
        fetch: async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.enqueue(new Uint8Array([4, 5, 6]));
              },
            }),
            { status: 200 },
          ),
      },
    );

    expect(declared.ok).toBe(false);
    expect(declared.diagnostics[0]).toMatchObject({
      code: "REPOSITORY_GITHUB_FILE_SIZE_LIMIT",
      details: { actualBytes: 5, limitBytes: 4 },
    });
    expect(streamed.ok).toBe(false);
    expect(streamed.diagnostics[0]).toMatchObject({
      code: "REPOSITORY_GITHUB_FILE_SIZE_LIMIT",
      details: { actualBytes: 6, limitBytes: 4 },
    });
  });
});

const pinnedSourceValue = createPinnedSource();

function pinnedSource(): PinnedGitHubRepository {
  return pinnedSourceValue;
}

function createPinnedSource(): PinnedGitHubRepository {
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

describe("upstream repository freshness", () => {
  const source = { owner: "BSData", repository: "wh40k-11e" };

  it("reports when the repository was last pushed to", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        pushed_at: "2026-08-23T09:47:50Z",
        default_branch: "main",
        // Real payloads carry far more; only these two are read.
        stargazers_count: 412,
      }),
    ) as unknown as RepositoryFetch;

    const status = await inspectGitHubRepositoryUpdate(source, {
      fetch: fetcher,
    });

    expect(status).toEqual({
      ok: true,
      value: {
        owner: "BSData",
        repository: "wh40k-11e",
        lastUpdatedAt: "2026-08-23T09:47:50Z",
        defaultBranch: "main",
      },
      diagnostics: [],
    });
    // One request. Asking per file would exhaust an unauthenticated hourly
    // allowance on a single catalogue.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fails without throwing when the network is unavailable", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as RepositoryFetch;

    const status = await inspectGitHubRepositoryUpdate(source, {
      fetch: fetcher,
    });

    // The caller falls back to saying the data may be out of date, so this must
    // be a diagnostic rather than an exception.
    expect(status.ok).toBe(false);
    expect(status.diagnostics).toEqual([
      expect.objectContaining({ code: "REPOSITORY_GITHUB_REQUEST_FAILED" }),
    ]);
  });

  it("refuses metadata with no usable update time", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ default_branch: "main" }),
    ) as unknown as RepositoryFetch;

    const status = await inspectGitHubRepositoryUpdate(source, {
      fetch: fetcher,
    });

    expect(status.ok).toBe(false);
    expect(status.diagnostics).toEqual([
      expect.objectContaining({ code: "REPOSITORY_GITHUB_UPDATE_INVALID" }),
    ]);
  });
});

function jsonResponse(value: unknown): Response {
  const body = JSON.stringify(value);
  return new Response(body, {
    status: 200,
    headers: {
      "content-length": String(new TextEncoder().encode(body).byteLength),
      "content-type": "application/json",
    },
  });
}
