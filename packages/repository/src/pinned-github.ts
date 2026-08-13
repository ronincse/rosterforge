import {
  ingestBattleScribeFile,
  type IngestionLimits,
  type ParsedBattleScribeDocument,
} from "@rosterforge/battlescribe-data";

import {
  failure,
  sourceId,
  success,
  type Brand,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
} from "@rosterforge/foundation";

export type GitCommitSha = Brand<string, "GitCommitSha">;
export type GitObjectSha = Brand<string, "GitObjectSha">;

export interface PinnedGitHubRepository {
  readonly provider: "github";
  readonly owner: string;
  readonly repository: string;
  readonly revision: GitCommitSha;
}

export interface GitHubRepositoryPinInput {
  readonly owner: string;
  readonly repository: string;
  readonly revision: string;
}

export interface PinnedGitHubRepositoryFile {
  readonly path: string;
  readonly objectId: GitObjectSha;
  readonly byteSize?: number;
}

export interface PinnedGitHubRepositoryTree {
  readonly source: PinnedGitHubRepository;
  readonly objectId: GitObjectSha;
  readonly files: readonly PinnedGitHubRepositoryFile[];
}

export interface DownloadedPinnedRepositoryFile {
  readonly source: PinnedGitHubRepository;
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mediaType?: string;
  readonly origin: string;
}

export interface PinnedGitHubAcquisitionLimits {
  readonly maxIndexBytes: number;
  readonly maxTreeEntries: number;
  readonly maxPathLength: number;
  readonly maxFileBytes: number;
}

export const defaultPinnedGitHubAcquisitionLimits: PinnedGitHubAcquisitionLimits = {
  maxIndexBytes: 4 * 1024 * 1024,
  maxTreeEntries: 4096,
  maxPathLength: 4096,
  maxFileBytes: 16 * 1024 * 1024,
};

export type RepositoryFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface ListPinnedGitHubRepositoryFilesOptions {
  readonly fetch?: RepositoryFetch;
  readonly signal?: AbortSignal;
  readonly limits?: Partial<PinnedGitHubAcquisitionLimits>;
}

export interface DownloadPinnedGitHubFileOptions {
  readonly fetch?: RepositoryFetch;
  readonly signal?: AbortSignal;
  readonly limits?: Partial<PinnedGitHubAcquisitionLimits>;
}

export interface AcquirePinnedGitHubBattleScribeFileOptions
  extends DownloadPinnedGitHubFileOptions {
  readonly importedAt: string;
  readonly ingestionLimits?: Partial<IngestionLimits>;
}

export interface IngestDownloadedPinnedGitHubFileOptions {
  readonly importedAt: string;
  readonly ingestionLimits?: Partial<IngestionLimits>;
}

const commitShaPattern = /^[0-9a-f]{40}$/u;
const ownerPattern = /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/u;
const repositoryPattern = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/u;
const supportedExtensions = new Set([".cat", ".catz", ".gst", ".gstz", ".json"]);

export function pinGitHubRepository(
  input: GitHubRepositoryPinInput,
): Result<PinnedGitHubRepository> {
  const diagnostics: Diagnostic[] = [];
  if (!ownerPattern.test(input.owner)) {
    diagnostics.push(
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_OWNER_INVALID",
        "The GitHub repository owner is invalid.",
        ["import", "security"],
        { owner: input.owner },
      ),
    );
  }
  if (!repositoryPattern.test(input.repository)) {
    diagnostics.push(
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_NAME_INVALID",
        "The GitHub repository name is invalid.",
        ["import", "security"],
        { repository: input.repository },
      ),
    );
  }
  if (!commitShaPattern.test(input.revision)) {
    diagnostics.push(
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_REVISION_NOT_PINNED",
        "The GitHub repository revision must be a full lowercase commit SHA.",
        ["import", "security"],
        { revision: input.revision },
      ),
    );
  }
  if (diagnostics.length > 0) {
    return failure(diagnostics);
  }
  return success({
    provider: "github",
    owner: input.owner,
    repository: input.repository,
    revision: input.revision as GitCommitSha,
  });
}

export async function listPinnedGitHubRepositoryFiles(
  source: PinnedGitHubRepository,
  options: ListPinnedGitHubRepositoryFilesOptions = {},
): Promise<Result<PinnedGitHubRepositoryTree>> {
  const limits = acquisitionLimits(options.limits);
  const fetcher = options.fetch ?? globalThis.fetch;
  const url = githubTreeUrl(source);
  const response = await fetchResponse(fetcher, url, options.signal);
  if (!response.ok) {
    return response;
  }
  const responseDiagnostic = diagnoseResponse(response.value, url);
  if (responseDiagnostic !== undefined) {
    return failure([responseDiagnostic]);
  }
  const body = await readBoundedResponse(
    response.value,
    limits.maxIndexBytes,
    "REPOSITORY_GITHUB_INDEX_SIZE_LIMIT",
    "The GitHub repository tree exceeds the index byte limit.",
  );
  if (!body.ok) {
    return body;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body.value));
  } catch (error: unknown) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_INDEX_INVALID",
        "The GitHub repository tree is not valid UTF-8 JSON.",
        ["import", "parsing"],
        { cause: errorMessage(error) },
      ),
    ]);
  }

  return parseGitHubTree(source, parsed, limits);
}

export async function downloadPinnedGitHubFile(
  source: PinnedGitHubRepository,
  path: string,
  options: DownloadPinnedGitHubFileOptions = {},
): Promise<Result<DownloadedPinnedRepositoryFile>> {
  const limits = acquisitionLimits(options.limits);
  const pathDiagnostic = diagnoseRepositoryPath(path, limits.maxPathLength);
  if (pathDiagnostic !== undefined) {
    return failure([pathDiagnostic]);
  }
  if (!supportedExtensions.has(extensionOf(path))) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_FILE_UNSUPPORTED",
        "The requested repository file is not a supported BattleScribe source.",
        ["import", "compatibility"],
        { path },
      ),
    ]);
  }

  const fetcher = options.fetch ?? globalThis.fetch;
  const url = githubRawFileUrl(source, path);
  const response = await fetchResponse(fetcher, url, options.signal);
  if (!response.ok) {
    return response;
  }
  const responseDiagnostic = diagnoseResponse(response.value, url);
  if (responseDiagnostic !== undefined) {
    return failure([responseDiagnostic]);
  }
  const body = await readBoundedResponse(
    response.value,
    limits.maxFileBytes,
    "REPOSITORY_GITHUB_FILE_SIZE_LIMIT",
    "The downloaded repository file exceeds the byte limit.",
  );
  if (!body.ok) {
    return body;
  }

  const mediaType = response.value.headers.get("content-type")?.trim();
  return success({
    source,
    path,
    bytes: body.value,
    ...(mediaType === undefined || mediaType.length === 0 ? {} : { mediaType }),
    origin: url,
  });
}

export async function acquirePinnedGitHubBattleScribeFile(
  source: PinnedGitHubRepository,
  path: string,
  options: AcquirePinnedGitHubBattleScribeFileOptions,
): Promise<Result<ParsedBattleScribeDocument>> {
  const downloaded = await downloadPinnedGitHubFile(source, path, options);
  if (!downloaded.ok) {
    return downloaded;
  }
  const ingested = await ingestDownloadedPinnedGitHubFile(downloaded.value, options);
  if (!ingested.ok) {
    return failure([...downloaded.diagnostics, ...ingested.diagnostics]);
  }
  return success(ingested.value, [
    ...downloaded.diagnostics,
    ...ingested.diagnostics,
  ]);
}

export async function ingestDownloadedPinnedGitHubFile(
  downloaded: DownloadedPinnedRepositoryFile,
  options: IngestDownloadedPinnedGitHubFileOptions,
): Promise<Result<ParsedBattleScribeDocument>> {
  const provenance = downloadProvenance(downloaded, options.importedAt);
  const ingested = await ingestBattleScribeFile(downloaded.bytes, {
    source: provenance,
    ...(options.ingestionLimits === undefined
      ? {}
      : { limits: options.ingestionLimits }),
  });
  return ingested;
}

export function githubRawFileUrl(
  source: PinnedGitHubRepository,
  path: string,
): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repository)}/${source.revision}/${encodedPath}`;
}

function githubTreeUrl(source: PinnedGitHubRepository): string {
  return `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repository)}/git/trees/${source.revision}?recursive=1`;
}

function acquisitionLimits(
  overrides: Partial<PinnedGitHubAcquisitionLimits> | undefined,
): PinnedGitHubAcquisitionLimits {
  return { ...defaultPinnedGitHubAcquisitionLimits, ...overrides };
}

async function fetchResponse(
  fetcher: RepositoryFetch,
  url: string,
  signal: AbortSignal | undefined,
): Promise<Result<Response>> {
  try {
    const response = await fetcher(url, {
      headers: {
        Accept: "application/vnd.github+json, application/json, application/octet-stream",
      },
      redirect: "error",
      ...(signal === undefined ? {} : { signal }),
    });
    if (!response.ok) {
      return failure([
        repositoryDiagnostic(
          "REPOSITORY_GITHUB_REQUEST_FAILED",
          "GitHub did not return the requested repository resource.",
          ["import"],
          { status: response.status, statusText: response.statusText, url },
        ),
      ]);
    }
    return success(response);
  } catch (error: unknown) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_REQUEST_FAILED",
        "The GitHub repository request failed.",
        ["import"],
        { cause: errorMessage(error), url },
      ),
    ]);
  }
}

function diagnoseResponse(response: Response, expectedUrl: string): Diagnostic | undefined {
  if (response.redirected || (response.url.length > 0 && response.url !== expectedUrl)) {
    return repositoryDiagnostic(
      "REPOSITORY_GITHUB_REDIRECT_REJECTED",
      "The GitHub repository request redirected away from its pinned URL.",
      ["import", "security"],
      { actualUrl: response.url, expectedUrl },
    );
  }
  return undefined;
}

async function readBoundedResponse(
  response: Response,
  maxBytes: number,
  limitCode: string,
  limitMessage: string,
): Promise<Result<Uint8Array>> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const declaredBytes = Number(declaredLength);
    if (Number.isSafeInteger(declaredBytes) && declaredBytes > maxBytes) {
      return failure([
        repositoryDiagnostic(limitCode, limitMessage, ["import", "security"], {
          actualBytes: declaredBytes,
          limitBytes: maxBytes,
        }),
      ]);
    }
  }
  if (response.body === null) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_BODY_UNAVAILABLE",
        "The GitHub repository response body is unavailable for bounded reading.",
        ["import", "security"],
      ),
    ]);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      totalBytes += next.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return failure([
          repositoryDiagnostic(limitCode, limitMessage, ["import", "security"], {
            actualBytes: totalBytes,
            limitBytes: maxBytes,
          }),
        ]);
      }
      chunks.push(next.value.slice());
    }
  } catch (error: unknown) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_BODY_READ_FAILED",
        "The GitHub repository response body could not be read.",
        ["import"],
        { cause: errorMessage(error) },
      ),
    ]);
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return success(bytes);
}

function parseGitHubTree(
  source: PinnedGitHubRepository,
  parsed: unknown,
  limits: PinnedGitHubAcquisitionLimits,
): Result<PinnedGitHubRepositoryTree> {
  if (!isRecord(parsed) || !isGitObjectSha(parsed.sha) || !Array.isArray(parsed.tree)) {
    return invalidTree("The GitHub repository tree has an unsupported shape.");
  }
  if (parsed.truncated === true) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_INDEX_TRUNCATED",
        "GitHub truncated the pinned repository tree.",
        ["import", "compatibility"],
      ),
    ]);
  }
  if (parsed.tree.length > limits.maxTreeEntries) {
    return failure([
      repositoryDiagnostic(
        "REPOSITORY_GITHUB_TREE_ENTRY_LIMIT",
        "The GitHub repository tree contains too many entries.",
        ["import", "security"],
        { actualEntries: parsed.tree.length, limitEntries: limits.maxTreeEntries },
      ),
    ]);
  }

  const files: PinnedGitHubRepositoryFile[] = [];
  const seenPaths = new Set<string>();
  for (const item of parsed.tree) {
    if (!isRecord(item) || item.type !== "blob") {
      continue;
    }
    if (typeof item.path !== "string" || !isGitObjectSha(item.sha)) {
      return invalidTree("A GitHub repository file entry has an unsupported shape.");
    }
    if (!supportedExtensions.has(extensionOf(item.path))) {
      continue;
    }
    const pathDiagnostic = diagnoseRepositoryPath(item.path, limits.maxPathLength);
    if (pathDiagnostic !== undefined) {
      return failure([pathDiagnostic]);
    }
    if (seenPaths.has(item.path)) {
      return failure([
        repositoryDiagnostic(
          "REPOSITORY_GITHUB_PATH_DUPLICATE",
          "The GitHub repository tree contains a duplicate BattleScribe path.",
          ["import", "security"],
          { path: item.path },
        ),
      ]);
    }
    seenPaths.add(item.path);
    const byteSize = nonNegativeInteger(item.size);
    files.push({
      path: item.path,
      objectId: item.sha as GitObjectSha,
      ...(byteSize === undefined ? {} : { byteSize }),
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return success({
    source,
    objectId: parsed.sha as GitObjectSha,
    files,
  });
}

function invalidTree(message: string): Result<never> {
  return failure([
    repositoryDiagnostic(
      "REPOSITORY_GITHUB_INDEX_INVALID",
      message,
      ["import", "parsing"],
    ),
  ]);
}

function diagnoseRepositoryPath(path: string, maxPathLength: number): Diagnostic | undefined {
  const segments = path.split("/");
  const invalid =
    path.length === 0 ||
    path.length > maxPathLength ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    containsControlCharacter(path) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..");
  if (!invalid) {
    return undefined;
  }
  return repositoryDiagnostic(
    "REPOSITORY_GITHUB_PATH_UNSAFE",
    "The GitHub repository path is unsafe or exceeds the configured limit.",
    ["import", "security"],
    { path, limitCharacters: maxPathLength },
  );
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

function downloadProvenance(
  downloaded: DownloadedPinnedRepositoryFile,
  importedAt: string,
): SourceFileProvenance {
  return {
    sourceId: sourceId(
      `download:github:${downloaded.source.owner}/${downloaded.source.repository}@${downloaded.source.revision}:${downloaded.path}`,
    ),
    filename: downloaded.path,
    kind: "download",
    importedAt,
    ...(downloaded.mediaType === undefined
      ? {}
      : { mediaType: downloaded.mediaType }),
    origin: downloaded.origin,
  };
}

function extensionOf(path: string): string {
  const filename = path.split("/").at(-1) ?? path;
  const index = filename.lastIndexOf(".");
  return index < 0 ? "" : filename.slice(index).toLowerCase();
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function isGitObjectSha(value: unknown): value is string {
  return typeof value === "string" && commitShaPattern.test(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function repositoryDiagnostic(
  code: string,
  message: string,
  impacts: Diagnostic["impacts"],
  details?: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts,
    ...(details === undefined ? {} : { details }),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
