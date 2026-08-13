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
  type LocalBattleScribeFileImportReport,
  type LocalBattleScribeImportReport,
  type PinnedBattleScribeDependencyClosureReport,
  type PinnedBattleScribeRepositoryIndexReport,
  type PinnedRepositoryByteCache,
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

export interface IndexRemoteCatalogueSourceOptions {
  readonly importedAt: string;
  readonly fetch?: RepositoryFetch;
  readonly signal?: AbortSignal;
  readonly cache?: PinnedRepositoryByteCache;
  readonly onProgress?: (progress: RemoteCatalogueSourceProgress) => void;
}

export interface RemoteCatalogueSourceIndex {
  readonly definition: RemoteCatalogueSourceDefinition;
  readonly report: PinnedBattleScribeRepositoryIndexReport;
  readonly catalogues: readonly BattleScribeRepositoryDocumentSummary[];
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
    return failure([...tree.diagnostics, ...indexed.diagnostics]);
  }

  const diagnostics = [...tree.diagnostics, ...indexed.diagnostics];
  const catalogues = indexed.value.index.documents.filter(
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
      report: indexed.value,
      catalogues,
    },
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
