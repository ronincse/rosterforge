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
  planBattleScribeDependencyClosure,
  summarizeBattleScribeRepositoryDocument,
  type BattleScribeDependencyClosurePlan,
  type BattleScribeDependencyRole,
  type BattleScribeRepositoryDocumentSummary,
  type BattleScribeRepositoryIndex,
} from "./dependency-closure.js";
import {
  ingestDownloadedPinnedGitHubFile,
  type PinnedGitHubAcquisitionLimits,
  type PinnedGitHubRepository,
  type PinnedGitHubRepositoryFile,
  type PinnedGitHubRepositoryTree,
  type RepositoryFetch,
} from "./pinned-github.js";
import {
  acquireCachedPinnedGitHubBattleScribeFile,
  readPinnedGitHubTreeFile,
  type GitBlobHasher,
  type PinnedRepositoryByteCache,
  type PinnedRepositoryCacheStatus,
} from "./repository-cache.js";

export interface RemoteBattleScribeRepositoryLimits {
  readonly maxFiles: number;
  readonly maxTotalBytes: number;
}

export const defaultRemoteBattleScribeRepositoryLimits: RemoteBattleScribeRepositoryLimits = {
  maxFiles: 256,
  maxTotalBytes: 256 * 1024 * 1024,
};

interface RemoteRepositoryOperationOptions {
  readonly importedAt: string;
  readonly fetch?: RepositoryFetch;
  readonly signal?: AbortSignal;
  readonly cache?: PinnedRepositoryByteCache;
  readonly hashGitBlob?: GitBlobHasher;
  readonly fileLimits?: Partial<PinnedGitHubAcquisitionLimits>;
  readonly repositoryLimits?: Partial<RemoteBattleScribeRepositoryLimits>;
  readonly ingestionLimits?: Partial<IngestionLimits>;
  readonly onProgress?: (progress: RemoteRepositoryOperationProgress) => void;
}

export interface RemoteRepositoryOperationProgress {
  readonly phase: "indexing" | "acquiring";
  readonly completedFiles: number;
  readonly totalFiles: number;
  readonly currentPath?: string;
  readonly acceptedBytes: number;
}

export type BuildPinnedBattleScribeRepositoryIndexOptions =
  RemoteRepositoryOperationOptions;

export type RemoteRepositoryIndexFileStatus = "indexed" | "rejected";

export interface RemoteRepositoryIndexFileReport {
  readonly index: number;
  readonly file: PinnedGitHubRepositoryFile;
  readonly status: RemoteRepositoryIndexFileStatus;
  readonly diagnostics: readonly Diagnostic[];
  readonly cacheStatus?: PinnedRepositoryCacheStatus;
  readonly summary?: BattleScribeRepositoryDocumentSummary;
}

export interface PinnedBattleScribeRepositoryIndexReport {
  readonly source: PinnedGitHubRepository;
  readonly tree: PinnedGitHubRepositoryTree;
  readonly status: "empty" | "complete" | "partial" | "failed";
  readonly files: readonly RemoteRepositoryIndexFileReport[];
  readonly index: BattleScribeRepositoryIndex;
  readonly totalBytes: number;
}

export type AcquirePinnedBattleScribeDependencyClosureOptions =
  RemoteRepositoryOperationOptions;

export type RemoteDependencyFileStatus = "acquired" | "rejected";

export interface RemoteDependencyFileReport {
  readonly role: BattleScribeDependencyRole;
  readonly summary: BattleScribeRepositoryDocumentSummary;
  readonly status: RemoteDependencyFileStatus;
  readonly diagnostics: readonly Diagnostic[];
  readonly file?: PinnedGitHubRepositoryFile;
  readonly cacheStatus?: PinnedRepositoryCacheStatus;
  readonly document?: ParsedBattleScribeDocument;
}

export interface PinnedBattleScribeDependencyClosureReport {
  readonly source: PinnedGitHubRepository;
  readonly tree: PinnedGitHubRepositoryTree;
  readonly plan: BattleScribeDependencyClosurePlan;
  readonly status: "complete" | "incomplete" | "failed";
  readonly files: readonly RemoteDependencyFileReport[];
  readonly documents: readonly ParsedBattleScribeDocument[];
  readonly totalBytes: number;
}

export async function buildPinnedBattleScribeRepositoryIndex(
  tree: PinnedGitHubRepositoryTree,
  options: BuildPinnedBattleScribeRepositoryIndexOptions,
): Promise<Result<PinnedBattleScribeRepositoryIndexReport>> {
  const repositoryLimits = mergedRepositoryLimits(options.repositoryLimits);
  const preflight = diagnoseRepositoryLimits(tree.files, repositoryLimits);
  if (preflight.length > 0) {
    return failure(preflight);
  }

  const diagnostics: Diagnostic[] = [];
  const reports: RemoteRepositoryIndexFileReport[] = [];
  const summaries: BattleScribeRepositoryDocumentSummary[] = [];
  let totalBytes = 0;
  notifyProgress(options.onProgress, {
    phase: "indexing",
    completedFiles: 0,
    totalFiles: tree.files.length,
    acceptedBytes: 0,
  });

  for (const [index, file] of tree.files.entries()) {
    const read = await readPinnedGitHubTreeFile(tree.source, file, {
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      ...(options.cache === undefined ? {} : { cache: options.cache }),
      ...(options.hashGitBlob === undefined
        ? {}
        : { hashGitBlob: options.hashGitBlob }),
      ...(options.fileLimits === undefined ? {} : { limits: options.fileLimits }),
    });
    diagnostics.push(...read.diagnostics);
    if (!read.ok) {
      reports.push({
        index,
        file,
        status: "rejected",
        diagnostics: read.diagnostics,
      });
      notifyProgress(options.onProgress, {
        phase: "indexing",
        completedFiles: index + 1,
        totalFiles: tree.files.length,
        currentPath: file.path,
        acceptedBytes: totalBytes,
      });
      continue;
    }

    totalBytes += read.value.downloaded.bytes.byteLength;
    if (totalBytes > repositoryLimits.maxTotalBytes) {
      return failure([
        ...diagnostics,
        repositoryLimitDiagnostic(totalBytes, repositoryLimits.maxTotalBytes),
      ]);
    }
    const ingested = await ingestDownloadedPinnedGitHubFile(
      read.value.downloaded,
      {
        importedAt: options.importedAt,
        ...(options.ingestionLimits === undefined
          ? {}
          : { ingestionLimits: options.ingestionLimits }),
      },
    );
    const fileDiagnostics = [...read.diagnostics, ...ingested.diagnostics];
    diagnostics.push(...ingested.diagnostics);
    if (!ingested.ok) {
      reports.push({
        index,
        file,
        status: "rejected",
        diagnostics: fileDiagnostics,
        cacheStatus: read.value.cacheStatus,
      });
      notifyProgress(options.onProgress, {
        phase: "indexing",
        completedFiles: index + 1,
        totalFiles: tree.files.length,
        currentPath: file.path,
        acceptedBytes: totalBytes,
      });
      continue;
    }
    const summary = summarizeBattleScribeRepositoryDocument(
      file.path,
      ingested.value,
    );
    summaries.push(summary);
    reports.push({
      index,
      file,
      status: "indexed",
      diagnostics: fileDiagnostics,
      cacheStatus: read.value.cacheStatus,
      summary,
    });
    notifyProgress(options.onProgress, {
      phase: "indexing",
      completedFiles: index + 1,
      totalFiles: tree.files.length,
      currentPath: file.path,
      acceptedBytes: totalBytes,
    });
  }

  return success(
    {
      source: tree.source,
      tree,
      status: indexStatus(reports),
      files: reports,
      index: { source: tree.source, documents: summaries },
      totalBytes,
    },
    diagnostics,
  );
}

export async function acquirePinnedBattleScribeDependencyClosure(
  tree: PinnedGitHubRepositoryTree,
  index: BattleScribeRepositoryIndex,
  selectedCataloguePath: string,
  options: AcquirePinnedBattleScribeDependencyClosureOptions,
): Promise<Result<PinnedBattleScribeDependencyClosureReport>> {
  if (!samePinnedSource(tree.source, index.source)) {
    return failure([
      remoteDiagnostic(
        "REPOSITORY_CLOSURE_SOURCE_MISMATCH",
        "The repository tree and metadata index do not identify the same pinned source.",
        "error",
        ["import", "security"],
        {
          indexSource: index.source,
          treeSource: tree.source,
        },
      ),
    ]);
  }
  const planned = planBattleScribeDependencyClosure(index, selectedCataloguePath);
  if (!planned.ok) {
    return planned;
  }

  const treeFilesByPath = new Map(tree.files.map((file) => [file.path, file]));
  const plannedTreeFiles = planned.value.files.flatMap(({ document }) => {
    const file = treeFilesByPath.get(document.path);
    return file === undefined ? [] : [file];
  });
  const repositoryLimits = mergedRepositoryLimits(options.repositoryLimits);
  const preflight = diagnoseRepositoryLimits(plannedTreeFiles, repositoryLimits);
  if (preflight.length > 0) {
    return failure([...planned.diagnostics, ...preflight]);
  }

  const diagnostics: Diagnostic[] = [...planned.diagnostics];
  const reports: RemoteDependencyFileReport[] = [];
  const documents: ParsedBattleScribeDocument[] = [];
  let totalBytes = 0;

  notifyProgress(options.onProgress, {
    phase: "acquiring",
    completedFiles: 0,
    totalFiles: planned.value.files.length,
    acceptedBytes: 0,
  });

  for (const [plannedIndex, plannedFile] of planned.value.files.entries()) {
    const file = treeFilesByPath.get(plannedFile.document.path);
    if (file === undefined) {
      const missing = remoteDiagnostic(
        "REPOSITORY_CLOSURE_TREE_FILE_MISSING",
        "A planned dependency path is absent from the pinned repository tree.",
        "warning",
        ["import", "resolution"],
        {
          path: plannedFile.document.path,
          role: plannedFile.role,
          sourceId: plannedFile.document.id,
        },
      );
      diagnostics.push(missing);
      reports.push({
        role: plannedFile.role,
        summary: plannedFile.document,
        status: "rejected",
        diagnostics: [missing],
      });
      notifyProgress(options.onProgress, {
        phase: "acquiring",
        completedFiles: plannedIndex + 1,
        totalFiles: planned.value.files.length,
        currentPath: plannedFile.document.path,
        acceptedBytes: totalBytes,
      });
      continue;
    }

    const acquired = await acquireCachedPinnedGitHubBattleScribeFile(
      tree.source,
      file,
      {
        importedAt: options.importedAt,
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        ...(options.cache === undefined ? {} : { cache: options.cache }),
        ...(options.hashGitBlob === undefined
          ? {}
          : { hashGitBlob: options.hashGitBlob }),
        ...(options.fileLimits === undefined
          ? {}
          : { limits: options.fileLimits }),
        ...(options.ingestionLimits === undefined
          ? {}
          : { ingestionLimits: options.ingestionLimits }),
      },
    );
    diagnostics.push(...acquired.diagnostics);
    if (!acquired.ok) {
      reports.push({
        role: plannedFile.role,
        summary: plannedFile.document,
        status: "rejected",
        diagnostics: acquired.diagnostics,
        file,
      });
      notifyProgress(options.onProgress, {
        phase: "acquiring",
        completedFiles: plannedIndex + 1,
        totalFiles: planned.value.files.length,
        currentPath: plannedFile.document.path,
        acceptedBytes: totalBytes,
      });
      continue;
    }

    const mismatch = diagnoseSummaryMismatch(
      plannedFile.document,
      acquired.value.document,
    );
    if (mismatch !== undefined) {
      diagnostics.push(mismatch);
      reports.push({
        role: plannedFile.role,
        summary: plannedFile.document,
        status: "rejected",
        diagnostics: [...acquired.diagnostics, mismatch],
        file,
        cacheStatus: acquired.value.cacheStatus,
      });
      notifyProgress(options.onProgress, {
        phase: "acquiring",
        completedFiles: plannedIndex + 1,
        totalFiles: planned.value.files.length,
        currentPath: plannedFile.document.path,
        acceptedBytes: totalBytes,
      });
      continue;
    }

    totalBytes += acquired.value.document.sourceBytes.byteLength;
    if (totalBytes > repositoryLimits.maxTotalBytes) {
      return failure([
        ...diagnostics,
        repositoryLimitDiagnostic(totalBytes, repositoryLimits.maxTotalBytes),
      ]);
    }
    documents.push(acquired.value.document);
    reports.push({
      role: plannedFile.role,
      summary: plannedFile.document,
      status: "acquired",
      diagnostics: acquired.diagnostics,
      file,
      cacheStatus: acquired.value.cacheStatus,
      document: acquired.value.document,
    });
    notifyProgress(options.onProgress, {
      phase: "acquiring",
      completedFiles: plannedIndex + 1,
      totalFiles: planned.value.files.length,
      currentPath: plannedFile.document.path,
      acceptedBytes: totalBytes,
    });
  }

  return success(
    {
      source: tree.source,
      tree,
      plan: planned.value,
      status: closureStatus(planned.value, reports),
      files: reports,
      documents,
      totalBytes,
    },
    diagnostics,
  );
}

function mergedRepositoryLimits(
  overrides: Partial<RemoteBattleScribeRepositoryLimits> | undefined,
): RemoteBattleScribeRepositoryLimits {
  return { ...defaultRemoteBattleScribeRepositoryLimits, ...overrides };
}

function diagnoseRepositoryLimits(
  files: readonly PinnedGitHubRepositoryFile[],
  limits: RemoteBattleScribeRepositoryLimits,
): readonly Diagnostic[] {
  if (files.length > limits.maxFiles) {
    return [
      remoteDiagnostic(
        "REPOSITORY_REMOTE_FILE_LIMIT",
        "The pinned repository operation contains too many files.",
        "error",
        ["import", "security"],
        { actualFiles: files.length, limitFiles: limits.maxFiles },
      ),
    ];
  }
  const declaredBytes = files.reduce(
    (total, { byteSize }) => total + (byteSize ?? 0),
    0,
  );
  if (declaredBytes > limits.maxTotalBytes) {
    return [repositoryLimitDiagnostic(declaredBytes, limits.maxTotalBytes)];
  }
  return [];
}

function repositoryLimitDiagnostic(actualBytes: number, limitBytes: number): Diagnostic {
  return remoteDiagnostic(
    "REPOSITORY_REMOTE_TOTAL_SIZE_LIMIT",
    "The pinned repository operation exceeds the total byte limit.",
    "error",
    ["import", "security"],
    { actualBytes, limitBytes },
  );
}

function indexStatus(
  files: readonly RemoteRepositoryIndexFileReport[],
): PinnedBattleScribeRepositoryIndexReport["status"] {
  if (files.length === 0) {
    return "empty";
  }
  const indexed = files.filter(({ status }) => status === "indexed").length;
  if (indexed === files.length) {
    return "complete";
  }
  return indexed === 0 ? "failed" : "partial";
}

function closureStatus(
  plan: BattleScribeDependencyClosurePlan,
  files: readonly RemoteDependencyFileReport[],
): PinnedBattleScribeDependencyClosureReport["status"] {
  const acquired = files.filter(({ status }) => status === "acquired").length;
  if (acquired === 0) {
    return "failed";
  }
  return plan.status === "complete" && acquired === files.length
    ? "complete"
    : "incomplete";
}

function diagnoseSummaryMismatch(
  expected: BattleScribeRepositoryDocumentSummary,
  actual: ParsedBattleScribeDocument,
): Diagnostic | undefined {
  const actualLinkTargetIds = actual.projection.catalogueLinks.map(
    ({ targetId }) => targetId,
  );
  const expectedLinkTargetIds = expected.catalogueLinks.map(
    ({ targetId }) => targetId,
  );
  const matches =
    actual.metadata.kind === expected.kind &&
    actual.metadata.id === expected.id &&
    actual.metadata.name === expected.name &&
    actual.metadata.gameSystemId === expected.gameSystemId &&
    actual.metadata.library === expected.library &&
    equalOptionalIds(actualLinkTargetIds, expectedLinkTargetIds);
  if (matches) {
    return undefined;
  }
  return {
    ...remoteDiagnostic(
      "REPOSITORY_CLOSURE_INDEX_MISMATCH",
      "An acquired document does not match the metadata used to plan its dependency closure.",
      "error",
      ["import", "resolution", "security"],
      {
        actual: {
          kind: actual.metadata.kind,
          id: actual.metadata.id,
          name: actual.metadata.name,
          gameSystemId: actual.metadata.gameSystemId,
          library: actual.metadata.library,
          linkTargetIds: actualLinkTargetIds,
        },
        expected: {
          kind: expected.kind,
          id: expected.id,
          name: expected.name,
          gameSystemId: expected.gameSystemId,
          library: expected.library,
          linkTargetIds: expectedLinkTargetIds,
        },
        path: expected.path,
      },
    ),
    location: { source: actual.source },
  };
}

function equalOptionalIds(
  left: readonly (string | undefined)[],
  right: readonly (string | undefined)[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function samePinnedSource(
  left: PinnedGitHubRepository,
  right: PinnedGitHubRepository,
): boolean {
  return (
    left.provider === right.provider &&
    left.owner === right.owner &&
    left.repository === right.repository &&
    left.revision === right.revision
  );
}

function remoteDiagnostic(
  code: string,
  message: string,
  severity: Diagnostic["severity"],
  impacts: Diagnostic["impacts"],
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return { code, message, severity, impacts, details };
}

function notifyProgress(
  observer: ((progress: RemoteRepositoryOperationProgress) => void) | undefined,
  progress: RemoteRepositoryOperationProgress,
): void {
  try {
    observer?.(progress);
  } catch {
    // Progress observers are informational and cannot change acquisition.
  }
}
