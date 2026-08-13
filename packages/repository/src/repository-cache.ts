import type {
  IngestionLimits,
  ParsedBattleScribeDocument,
} from "@rosterforge/battlescribe-data";

import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from "@rosterforge/foundation";

import {
  defaultPinnedGitHubAcquisitionLimits,
  downloadPinnedGitHubFile,
  githubRawFileUrl,
  ingestDownloadedPinnedGitHubFile,
  type DownloadedPinnedRepositoryFile,
  type GitObjectSha,
  type PinnedGitHubAcquisitionLimits,
  type PinnedGitHubRepository,
  type PinnedGitHubRepositoryFile,
  type RepositoryFetch,
} from "./pinned-github.js";

export interface PinnedRepositoryByteCacheKey {
  readonly provider: "github";
  readonly owner: string;
  readonly repository: string;
  readonly revision: string;
  readonly path: string;
  readonly objectId: GitObjectSha;
}

export interface PinnedRepositoryByteCacheEntry {
  readonly bytes: Uint8Array;
  readonly mediaType?: string;
}

export interface PinnedRepositoryByteCache {
  read(
    key: PinnedRepositoryByteCacheKey,
  ): Promise<PinnedRepositoryByteCacheEntry | undefined>;
  write(
    key: PinnedRepositoryByteCacheKey,
    entry: PinnedRepositoryByteCacheEntry,
  ): Promise<void>;
}

export type GitBlobHasher = (bytes: Uint8Array) => Promise<GitObjectSha>;

export type PinnedRepositoryCacheStatus =
  | "hit"
  | "miss"
  | "invalid"
  | "unavailable";

export interface ReadPinnedGitHubTreeFileOptions {
  readonly fetch?: RepositoryFetch;
  readonly signal?: AbortSignal;
  readonly limits?: Partial<PinnedGitHubAcquisitionLimits>;
  readonly cache?: PinnedRepositoryByteCache;
  readonly hashGitBlob?: GitBlobHasher;
}

export interface ReadPinnedGitHubTreeFileReport {
  readonly file: PinnedGitHubRepositoryFile;
  readonly downloaded: DownloadedPinnedRepositoryFile;
  readonly cacheStatus: PinnedRepositoryCacheStatus;
}

export interface AcquireCachedPinnedGitHubBattleScribeFileOptions
  extends ReadPinnedGitHubTreeFileOptions {
  readonly importedAt: string;
  readonly ingestionLimits?: Partial<IngestionLimits>;
}

export interface AcquiredCachedPinnedGitHubBattleScribeFile {
  readonly file: PinnedGitHubRepositoryFile;
  readonly cacheStatus: PinnedRepositoryCacheStatus;
  readonly document: ParsedBattleScribeDocument;
}

export async function readPinnedGitHubTreeFile(
  source: PinnedGitHubRepository,
  file: PinnedGitHubRepositoryFile,
  options: ReadPinnedGitHubTreeFileOptions = {},
): Promise<Result<ReadPinnedGitHubTreeFileReport>> {
  const diagnostics: Diagnostic[] = [];
  const key = repositoryCacheKey(source, file);
  const limits = {
    ...defaultPinnedGitHubAcquisitionLimits,
    ...options.limits,
  };
  const hasher = options.hashGitBlob ?? calculateGitBlobObjectId;
  let cacheStatus: PinnedRepositoryCacheStatus =
    options.cache === undefined ? "unavailable" : "miss";

  if (options.cache !== undefined) {
    try {
      const cached = await options.cache.read(key);
      if (cached !== undefined) {
        const cachedBytes = cached.bytes.slice();
        const validated = await validatePinnedBlob(
          file,
          cachedBytes,
          limits.maxFileBytes,
          hasher,
        );
        if (validated.ok) {
          return success(
            {
              file,
              cacheStatus: "hit",
              downloaded: downloadedFile(
                source,
                file.path,
                cachedBytes,
                cached.mediaType,
              ),
            },
            diagnostics,
          );
        }
        cacheStatus = "invalid";
        diagnostics.push(
          cacheDiagnostic(
            "REPOSITORY_CACHE_ENTRY_INVALID",
            "A cached pinned repository file failed size or Git blob verification.",
            "warning",
            ["import", "security"],
            {
              objectId: file.objectId,
              path: file.path,
              reasonCodes: validated.diagnostics.map(({ code }) => code),
            },
          ),
        );
      }
    } catch (error: unknown) {
      cacheStatus = "unavailable";
      diagnostics.push(
        cacheDiagnostic(
          "REPOSITORY_CACHE_READ_FAILED",
          "The pinned repository byte cache could not be read.",
          "warning",
          ["import", "internal"],
          { cause: errorMessage(error), path: file.path },
        ),
      );
    }
  }

  const downloaded = await downloadPinnedGitHubFile(source, file.path, options);
  if (!downloaded.ok) {
    return failure([...diagnostics, ...downloaded.diagnostics]);
  }
  const validated = await validatePinnedBlob(
    file,
    downloaded.value.bytes,
    limits.maxFileBytes,
    hasher,
  );
  if (!validated.ok) {
    return failure([...diagnostics, ...validated.diagnostics]);
  }

  if (options.cache !== undefined) {
    try {
      await options.cache.write(key, {
        bytes: downloaded.value.bytes.slice(),
        ...(downloaded.value.mediaType === undefined
          ? {}
          : { mediaType: downloaded.value.mediaType }),
      });
    } catch (error: unknown) {
      diagnostics.push(
        cacheDiagnostic(
          "REPOSITORY_CACHE_WRITE_FAILED",
          "The verified pinned repository file could not be cached.",
          "warning",
          ["import", "internal"],
          { cause: errorMessage(error), path: file.path },
        ),
      );
    }
  }

  return success(
    { file, downloaded: downloaded.value, cacheStatus },
    [...diagnostics, ...downloaded.diagnostics],
  );
}

export async function acquireCachedPinnedGitHubBattleScribeFile(
  source: PinnedGitHubRepository,
  file: PinnedGitHubRepositoryFile,
  options: AcquireCachedPinnedGitHubBattleScribeFileOptions,
): Promise<Result<AcquiredCachedPinnedGitHubBattleScribeFile>> {
  const read = await readPinnedGitHubTreeFile(source, file, options);
  if (!read.ok) {
    return read;
  }
  const ingested = await ingestDownloadedPinnedGitHubFile(
    read.value.downloaded,
    options,
  );
  if (!ingested.ok) {
    return failure([...read.diagnostics, ...ingested.diagnostics]);
  }
  return success(
    {
      file,
      cacheStatus: read.value.cacheStatus,
      document: ingested.value,
    },
    [...read.diagnostics, ...ingested.diagnostics],
  );
}

export async function calculateGitBlobObjectId(
  bytes: Uint8Array,
): Promise<GitObjectSha> {
  if (globalThis.crypto?.subtle === undefined) {
    throw new Error("Web Crypto is unavailable for Git blob verification.");
  }
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const payload = new Uint8Array(header.byteLength + bytes.byteLength);
  payload.set(header, 0);
  payload.set(bytes, header.byteLength);
  const digest = await globalThis.crypto.subtle.digest("SHA-1", payload.buffer);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("") as GitObjectSha;
}

function repositoryCacheKey(
  source: PinnedGitHubRepository,
  file: PinnedGitHubRepositoryFile,
): PinnedRepositoryByteCacheKey {
  return {
    provider: source.provider,
    owner: source.owner,
    repository: source.repository,
    revision: source.revision,
    path: file.path,
    objectId: file.objectId,
  };
}

async function validatePinnedBlob(
  file: PinnedGitHubRepositoryFile,
  bytes: Uint8Array,
  maxFileBytes: number,
  hasher: GitBlobHasher,
): Promise<Result<GitObjectSha>> {
  if (bytes.byteLength > maxFileBytes) {
    return failure([
      cacheDiagnostic(
        "REPOSITORY_GITHUB_FILE_SIZE_LIMIT",
        "The repository file exceeds the configured byte limit.",
        "error",
        ["import", "security"],
        { actualBytes: bytes.byteLength, limitBytes: maxFileBytes, path: file.path },
      ),
    ]);
  }
  if (file.byteSize !== undefined && bytes.byteLength !== file.byteSize) {
    return failure([
      cacheDiagnostic(
        "REPOSITORY_GITHUB_BLOB_SIZE_MISMATCH",
        "The repository file size does not match the pinned Git tree entry.",
        "error",
        ["import", "security"],
        {
          actualBytes: bytes.byteLength,
          expectedBytes: file.byteSize,
          path: file.path,
        },
      ),
    ]);
  }

  let actualObjectId: GitObjectSha;
  try {
    actualObjectId = await hasher(bytes);
  } catch (error: unknown) {
    return failure([
      cacheDiagnostic(
        "REPOSITORY_GITHUB_BLOB_INTEGRITY_UNAVAILABLE",
        "The repository file's Git blob identity could not be calculated.",
        "error",
        ["import", "security"],
        { cause: errorMessage(error), path: file.path },
      ),
    ]);
  }
  if (actualObjectId !== file.objectId) {
    return failure([
      cacheDiagnostic(
        "REPOSITORY_GITHUB_BLOB_INTEGRITY_MISMATCH",
        "The repository file does not match the pinned Git blob object ID.",
        "error",
        ["import", "security"],
        {
          actualObjectId,
          expectedObjectId: file.objectId,
          path: file.path,
        },
      ),
    ]);
  }
  return success(actualObjectId);
}

function downloadedFile(
  source: PinnedGitHubRepository,
  path: string,
  bytes: Uint8Array,
  mediaType: string | undefined,
): DownloadedPinnedRepositoryFile {
  return {
    source,
    path,
    bytes,
    ...(mediaType === undefined ? {} : { mediaType }),
    origin: githubRawFileUrl(source, path),
  };
}

function cacheDiagnostic(
  code: string,
  message: string,
  severity: Diagnostic["severity"],
  impacts: Diagnostic["impacts"],
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return { code, message, severity, impacts, details };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
