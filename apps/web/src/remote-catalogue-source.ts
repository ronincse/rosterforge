import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from "@rosterforge/foundation";
import {
  acquirePinnedBattleScribeDependencyClosure,
  buildPinnedBattleScribeRepositoryIndex,
  listPinnedGitHubRepositoryFiles,
  pinGitHubRepository,
  type BattleScribeRepositoryDocumentSummary,
  type GitHubRepositoryPinInput,
  type GitObjectSha,
  type LocalBattleScribeFileImportReport,
  type LocalBattleScribeImportReport,
  type PinnedBattleScribeDependencyClosureReport,
  type PinnedBattleScribeRepositoryIndexReport,
  type PinnedGitHubRepositoryTree,
  type PinnedRepositoryByteCache,
  type RemoteRepositoryIndexFileReport,
  type RemoteRepositoryOperationProgress,
  type RepositoryFetch,
} from "@rosterforge/repository";

import {
  prepareImportedCatalogueLibrary,
  type LocalCatalogueLibrary,
} from "./catalogue-library.js";

export interface RemoteCatalogueSourceDefinition {
  readonly id: string;
  readonly title: string;
  readonly gameSystem: string;
  readonly description: string;
  readonly repository: GitHubRepositoryPinInput;
  readonly estimatedIndexBytes?: number;
}

export const defaultRemoteCatalogueSources: readonly RemoteCatalogueSourceDefinition[] =
  [
    {
      id: "bsdata-wh40k-11e-54c189f",
      title: "Warhammer 40,000 11th Edition",
      gameSystem: "Warhammer 40,000",
      description:
        "Community-maintained BSData pinned to an immutable Git commit.",
      repository: {
        owner: "BSData",
        repository: "wh40k-11e",
        revision: "54c189f4fd01878351fab05586d3b38d9c7f6ddc",
      },
      estimatedIndexBytes: 67_554_454,
    },
  ];

export type RemoteCatalogueSourceProgress =
  | {
      readonly phase: "listing";
      readonly completedFiles: 0;
      readonly acceptedBytes: 0;
    }
  | RemoteRepositoryOperationProgress;

export type RemoteCatalogueMetadataCacheStatus =
  | "hit"
  | "miss"
  | "invalid"
  | "unavailable";

export interface RemoteCatalogueMetadataCacheKey {
  readonly provider: "github";
  readonly owner: string;
  readonly repository: string;
  readonly revision: string;
  readonly treeObjectId: GitObjectSha;
}

export interface RemoteCatalogueMetadataCacheEntry {
  readonly status: PinnedBattleScribeRepositoryIndexReport["status"];
  readonly files: readonly RemoteRepositoryIndexFileReport[];
  readonly documents: readonly BattleScribeRepositoryDocumentSummary[];
  readonly totalBytes: number;
}

export interface RemoteCatalogueMetadataCache {
  read(
    key: RemoteCatalogueMetadataCacheKey,
  ): Promise<RemoteCatalogueMetadataCacheEntry | undefined>;
  write(
    key: RemoteCatalogueMetadataCacheKey,
    entry: RemoteCatalogueMetadataCacheEntry,
  ): Promise<void>;
}

export interface IndexRemoteCatalogueSourceOptions {
  readonly importedAt: string;
  readonly fetch?: RepositoryFetch;
  readonly signal?: AbortSignal;
  readonly cache?: PinnedRepositoryByteCache;
  readonly metadataCache?: RemoteCatalogueMetadataCache;
  readonly onProgress?: (progress: RemoteCatalogueSourceProgress) => void;
}

export interface RemoteCatalogueSourceIndex {
  readonly definition: RemoteCatalogueSourceDefinition;
  readonly report: PinnedBattleScribeRepositoryIndexReport;
  readonly catalogues: readonly BattleScribeRepositoryDocumentSummary[];
  readonly metadataCacheStatus: RemoteCatalogueMetadataCacheStatus;
}

export interface AcquireRemoteCatalogueOptions
  extends IndexRemoteCatalogueSourceOptions {
  readonly batchId: string;
}

export interface RemoteCatalogueAcquisition {
  readonly sourceIndex: RemoteCatalogueSourceIndex;
  readonly closure: PinnedBattleScribeDependencyClosureReport;
  readonly library: LocalCatalogueLibrary;
  readonly selectedCatalogueKey: string;
}

export async function indexRemoteCatalogueSource(
  definition: RemoteCatalogueSourceDefinition,
  options: IndexRemoteCatalogueSourceOptions,
): Promise<Result<RemoteCatalogueSourceIndex>> {
  const pinned = pinGitHubRepository(definition.repository);
  if (!pinned.ok) return pinned;

  notifyProgress(options.onProgress, {
    phase: "listing",
    completedFiles: 0,
    acceptedBytes: 0,
  });
  const tree = await listPinnedGitHubRepositoryFiles(pinned.value, {
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (!tree.ok) return tree;

  const diagnostics = [...tree.diagnostics];
  let metadataCacheStatus: RemoteCatalogueMetadataCacheStatus =
    options.metadataCache === undefined ? "unavailable" : "miss";
  if (options.metadataCache !== undefined) {
    try {
      const cached = await options.metadataCache.read(
        metadataCacheKey(tree.value),
      );
      if (cached !== undefined) {
        const restored = restoreMetadataCacheEntry(tree.value, cached);
        if (restored !== undefined) {
          notifyProgress(options.onProgress, {
            phase: "indexing",
            completedFiles: restored.files.length,
            totalFiles: restored.files.length,
            acceptedBytes: restored.totalBytes,
          });
          return sourceIndexResult(definition, restored, "hit", [
            ...diagnostics,
            ...restored.files.flatMap(({ diagnostics }) => diagnostics),
          ]);
        }
        metadataCacheStatus = "invalid";
        diagnostics.push(
          metadataCacheDiagnostic(
            "WEB_REMOTE_INDEX_CACHE_ENTRY_INVALID",
            "The cached repository metadata does not match the pinned Git tree.",
            ["import", "security"],
            { sourceId: definition.id },
          ),
        );
      }
    } catch (error: unknown) {
      metadataCacheStatus = "unavailable";
      diagnostics.push(
        metadataCacheDiagnostic(
          "WEB_REMOTE_INDEX_CACHE_READ_FAILED",
          "The repository metadata cache could not be read.",
          ["import", "persistence", "internal"],
          { cause: errorMessage(error), sourceId: definition.id },
        ),
      );
    }
  }

  const indexed = await buildPinnedBattleScribeRepositoryIndex(tree.value, {
    importedAt: options.importedAt,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.cache === undefined ? {} : { cache: options.cache }),
    ...(options.onProgress === undefined
      ? {}
      : { onProgress: options.onProgress }),
  });
  if (!indexed.ok) {
    return failure([...diagnostics, ...indexed.diagnostics]);
  }
  diagnostics.push(...indexed.diagnostics);

  if (options.metadataCache !== undefined) {
    try {
      await options.metadataCache.write(
        metadataCacheKey(tree.value),
        metadataCacheEntry(indexed.value),
      );
    } catch (error: unknown) {
      diagnostics.push(
        metadataCacheDiagnostic(
          "WEB_REMOTE_INDEX_CACHE_WRITE_FAILED",
          "The repository metadata index could not be cached.",
          ["import", "persistence", "internal"],
          { cause: errorMessage(error), sourceId: definition.id },
        ),
      );
    }
  }

  return sourceIndexResult(
    definition,
    indexed.value,
    metadataCacheStatus,
    diagnostics,
  );
}

export async function acquireRemoteCatalogue(
  sourceIndex: RemoteCatalogueSourceIndex,
  selectedCataloguePath: string,
  options: AcquireRemoteCatalogueOptions,
): Promise<Result<RemoteCatalogueAcquisition>> {
  const acquired = await acquirePinnedBattleScribeDependencyClosure(
    sourceIndex.report.tree,
    sourceIndex.report.index,
    selectedCataloguePath,
    {
      importedAt: options.importedAt,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      ...(options.cache === undefined ? {} : { cache: options.cache }),
      ...(options.onProgress === undefined
        ? {}
        : { onProgress: options.onProgress }),
    },
  );
  if (!acquired.ok) return acquired;

  const importReport = closureImportReport(
    acquired.value,
    options.batchId,
    options.importedAt,
  );
  const prepared = prepareImportedCatalogueLibrary(
    importReport,
    acquired.diagnostics,
  );
  if (!prepared.ok) return prepared;

  const selectedSummary = acquired.value.plan.selectedCatalogue;
  const selected = prepared.value.selectableCatalogues.find(
    ({ document }) =>
      document.metadata.id === selectedSummary.id &&
      document.source.filename === selectedSummary.path,
  );
  if (selected === undefined) {
    return failure([
      ...prepared.diagnostics,
      remoteSourceDiagnostic(
        "WEB_REMOTE_CATALOGUE_UNAVAILABLE",
        "The acquired catalogue is not available after composition.",
        ["import", "resolution"],
        {
          path: selectedSummary.path,
          sourceId: selectedSummary.id,
        },
        selectedSummary,
      ),
    ]);
  }

  return success(
    {
      sourceIndex,
      closure: acquired.value,
      library: prepared.value,
      selectedCatalogueKey: selected.key,
    },
    prepared.diagnostics,
  );
}

function sourceIndexResult(
  definition: RemoteCatalogueSourceDefinition,
  report: PinnedBattleScribeRepositoryIndexReport,
  metadataCacheStatus: RemoteCatalogueMetadataCacheStatus,
  diagnostics: readonly Diagnostic[],
): Result<RemoteCatalogueSourceIndex> {
  const catalogues = report.index.documents.filter(
    (document) =>
      document.kind === "catalogue" && document.library !== true,
  );
  if (catalogues.length === 0) {
    return failure([
      ...diagnostics,
      remoteSourceDiagnostic(
        "WEB_REMOTE_CATALOGUE_INDEX_EMPTY",
        "The pinned source contains no roster catalogues.",
        ["import", "compatibility"],
        { sourceId: definition.id },
      ),
    ]);
  }

  return success(
    {
      definition,
      report,
      catalogues,
      metadataCacheStatus,
    },
    diagnostics,
  );
}

function metadataCacheKey(
  tree: PinnedGitHubRepositoryTree,
): RemoteCatalogueMetadataCacheKey {
  return {
    provider: tree.source.provider,
    owner: tree.source.owner,
    repository: tree.source.repository,
    revision: tree.source.revision,
    treeObjectId: tree.objectId,
  };
}

function metadataCacheEntry(
  report: PinnedBattleScribeRepositoryIndexReport,
): RemoteCatalogueMetadataCacheEntry {
  return {
    status: report.status,
    files: report.files,
    documents: report.index.documents,
    totalBytes: report.totalBytes,
  };
}

function restoreMetadataCacheEntry(
  tree: PinnedGitHubRepositoryTree,
  entry: RemoteCatalogueMetadataCacheEntry,
): PinnedBattleScribeRepositoryIndexReport | undefined {
  if (
    !indexStatusValue(entry.status) ||
    !Array.isArray(entry.files) ||
    !Array.isArray(entry.documents) ||
    !Number.isSafeInteger(entry.totalBytes) ||
    entry.totalBytes < 0 ||
    entry.files.length !== tree.files.length
  ) {
    return undefined;
  }

  const files: RemoteRepositoryIndexFileReport[] = [];
  for (const [index, treeFile] of tree.files.entries()) {
    const cached = entry.files[index];
    if (
      cached === undefined ||
      cached.index !== index ||
      !sameTreeFile(cached.file, treeFile) ||
      !Array.isArray(cached.diagnostics) ||
      (cached.status !== "indexed" && cached.status !== "rejected") ||
      (cached.cacheStatus !== undefined &&
        ![
          "hit",
          "miss",
          "invalid",
          "unavailable",
        ].includes(cached.cacheStatus)) ||
      (cached.status === "indexed"
        ? cached.summary === undefined ||
          cached.summary.path !== treeFile.path
        : cached.summary !== undefined)
    ) {
      return undefined;
    }
    files.push({ ...cached, file: treeFile });
  }

  const summaries = files.flatMap(({ summary }) =>
    summary === undefined ? [] : [summary],
  );
  if (
    entry.documents.length !== summaries.length ||
    !entry.documents.every((document, index) =>
      sameDocumentSummary(document, summaries[index]),
    ) ||
    entry.status !== derivedIndexStatus(files)
  ) {
    return undefined;
  }

  const declaredBytes = tree.files.reduce(
    (total, file) => total + (file.byteSize ?? 0),
    0,
  );
  const allSizesDeclared = tree.files.every(
    ({ byteSize }) => byteSize !== undefined,
  );
  if (
    allSizesDeclared &&
    (entry.totalBytes > declaredBytes ||
      (entry.status === "complete" && entry.totalBytes !== declaredBytes))
  ) {
    return undefined;
  }

  return {
    source: tree.source,
    tree,
    status: entry.status,
    files,
    index: {
      source: tree.source,
      documents: entry.documents,
    },
    totalBytes: entry.totalBytes,
  };
}

function sameTreeFile(
  left: RemoteRepositoryIndexFileReport["file"],
  right: RemoteRepositoryIndexFileReport["file"],
): boolean {
  return (
    left.path === right.path &&
    left.objectId === right.objectId &&
    left.byteSize === right.byteSize
  );
}

function sameDocumentSummary(
  left: BattleScribeRepositoryDocumentSummary,
  right: BattleScribeRepositoryDocumentSummary | undefined,
): boolean {
  return (
    right !== undefined &&
    left.path === right.path &&
    left.kind === right.kind &&
    left.id === right.id &&
    left.name === right.name &&
    left.gameSystemId === right.gameSystemId &&
    left.library === right.library &&
    Array.isArray(left.catalogueLinks) &&
    Array.isArray(right.catalogueLinks) &&
    left.catalogueLinks.length === right.catalogueLinks.length &&
    left.catalogueLinks.every(
      (link, index) =>
        link.targetId === right.catalogueLinks[index]?.targetId &&
        link.name === right.catalogueLinks[index]?.name,
    )
  );
}

function derivedIndexStatus(
  files: readonly RemoteRepositoryIndexFileReport[],
): PinnedBattleScribeRepositoryIndexReport["status"] {
  if (files.length === 0) return "empty";
  const indexed = files.filter(({ status }) => status === "indexed").length;
  if (indexed === files.length) return "complete";
  return indexed === 0 ? "failed" : "partial";
}

function indexStatusValue(
  value: unknown,
): value is PinnedBattleScribeRepositoryIndexReport["status"] {
  return (
    value === "empty" ||
    value === "complete" ||
    value === "partial" ||
    value === "failed"
  );
}

function metadataCacheDiagnostic(
  code: string,
  message: string,
  impacts: Diagnostic["impacts"],
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts,
    details,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function closureImportReport(
  closure: PinnedBattleScribeDependencyClosureReport,
  batchId: string,
  importedAt: string,
): LocalBattleScribeImportReport {
  const files: LocalBattleScribeFileImportReport[] = [];
  for (const [index, file] of closure.files.entries()) {
    if (file.document === undefined) continue;
    files.push({
      index,
      source: file.document.source,
      sourceBytes: file.document.sourceBytes,
      status: "imported",
      diagnostics: file.diagnostics,
      document: file.document,
    });
  }

  return {
    batchId,
    importedAt,
    status:
      closure.status === "complete"
        ? "complete"
        : closure.documents.length === 0
          ? "failed"
          : "partial",
    files,
    documents: closure.documents,
  };
}

function remoteSourceDiagnostic(
  code: string,
  message: string,
  impacts: Diagnostic["impacts"],
  details: Readonly<Record<string, unknown>>,
  source?: BattleScribeRepositoryDocumentSummary,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts,
    details,
    ...(source?.source === undefined
      ? {}
      : { location: { source: source.source } }),
  };
}

function notifyProgress(
  observer:
    | ((progress: RemoteCatalogueSourceProgress) => void)
    | undefined,
  progress: RemoteCatalogueSourceProgress,
): void {
  try {
    observer?.(progress);
  } catch {
    // Progress observers are informational and cannot change acquisition.
  }
}
