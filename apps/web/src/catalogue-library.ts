import type { ParsedBattleScribeDocument } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
  type BattleScribeCatalogueContextOptions,
  type BattleScribeCatalogueContexts,
  type BattleScribeDataGraph,
} from "@rosterforge/data-graph";
import {
  failure,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
} from "@rosterforge/foundation";
import {
  importLocalBattleScribeFiles,
  type ImportLocalBattleScribeFilesOptions,
  type LocalBattleScribeFile,
  type LocalBattleScribeImportReport,
} from "@rosterforge/repository";

export interface PrepareLocalCatalogueLibraryOptions {
  readonly import: ImportLocalBattleScribeFilesOptions;
  readonly materialization?: BattleScribeCatalogueContextOptions;
}

export type LocalCatalogueLibraryStatus =
  | "empty"
  | "unavailable"
  | "ready"
  | "partial";

export interface LocalCatalogueChoice {
  readonly key: string;
  readonly id: ObjectId;
  readonly name: string;
  readonly revision?: number;
  readonly gameSystemId?: ObjectId;
  readonly source: SourceFileProvenance;
  readonly document: ParsedBattleScribeDocument;
  readonly context: BattleScribeCatalogueContext;
  readonly materializationTruncated: boolean;
}

export interface LocalCatalogueLibrary {
  readonly status: LocalCatalogueLibraryStatus;
  readonly importReport: LocalBattleScribeImportReport;
  readonly documents: readonly ParsedBattleScribeDocument[];
  readonly gameSystems: readonly ParsedBattleScribeDocument[];
  readonly catalogues: readonly LocalCatalogueChoice[];
  readonly selectableCatalogues: readonly LocalCatalogueChoice[];
  readonly graph: BattleScribeDataGraph;
  readonly contexts: BattleScribeCatalogueContexts;
}

export async function prepareLocalCatalogueLibrary(
  files: readonly LocalBattleScribeFile[],
  options: PrepareLocalCatalogueLibraryOptions,
): Promise<Result<LocalCatalogueLibrary>> {
  const imported = await importLocalBattleScribeFiles(files, options.import);
  if (!imported.ok) {
    return failure(imported.diagnostics);
  }

  return prepareImportedCatalogueLibrary(
    imported.value,
    imported.diagnostics,
    options.materialization,
  );
}

export function prepareImportedCatalogueLibrary(
  imported: LocalBattleScribeImportReport,
  importDiagnostics: readonly Diagnostic[] = [],
  materialization?: BattleScribeCatalogueContextOptions,
): Result<LocalCatalogueLibrary> {

  const diagnostics = [...importDiagnostics];
  const graph = resolveBattleScribeDataGraph(imported.documents);
  diagnostics.push(...graph.diagnostics);
  if (!graph.ok) {
    return failure(diagnostics);
  }

  const contexts = composeBattleScribeCatalogueContexts(
    graph.value,
    materialization,
  );
  diagnostics.push(...contexts.diagnostics);
  if (!contexts.ok) {
    return failure(diagnostics);
  }

  const catalogues = contexts.value.catalogues.map((context) =>
    catalogueChoice(context, contexts.value.roots.truncated),
  );
  const selectableCatalogues = catalogues.filter(
    ({ document }) => document.metadata.library !== true,
  );
  const gameSystems = imported.documents.filter(
    (document) => document.metadata.kind === "gameSystem",
  );

  return success(
    {
      status: libraryStatus(
        imported,
        selectableCatalogues,
        diagnostics.length > 0,
      ),
      importReport: imported,
      documents: imported.documents,
      gameSystems,
      catalogues,
      selectableCatalogues,
      graph: graph.value,
      contexts: contexts.value,
    },
    diagnostics,
  );
}

function catalogueChoice(
  context: BattleScribeCatalogueContext,
  materializationTruncated: boolean,
): LocalCatalogueChoice {
  const { document } = context;
  const metadata = document.metadata;
  return {
    key: `${document.source.sourceId}:${metadata.id}`,
    id: metadata.id,
    name: metadata.name,
    ...(metadata.revision === undefined
      ? {}
      : { revision: metadata.revision }),
    ...(metadata.gameSystemId === undefined
      ? {}
      : { gameSystemId: metadata.gameSystemId }),
    source: document.source,
    document,
    context,
    materializationTruncated,
  };
}

function libraryStatus(
  imported: LocalBattleScribeImportReport,
  catalogues: readonly LocalCatalogueChoice[],
  hasDiagnostics: boolean,
): LocalCatalogueLibraryStatus {
  if (imported.documents.length === 0) {
    return "empty";
  }
  if (catalogues.length === 0) {
    return "unavailable";
  }
  return imported.status === "complete" && !hasDiagnostics
    ? "ready"
    : "partial";
}
