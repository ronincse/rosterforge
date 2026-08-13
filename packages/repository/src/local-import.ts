import {
  ingestBattleScribeFile,
  type IngestionLimits,
  type ParsedBattleScribeDocument,
} from "@rosterforge/battlescribe-data";

import {
  failure,
  sourceId,
  success,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
} from "@rosterforge/foundation";

export interface LocalBattleScribeFile {
  readonly filename: string;
  readonly bytes: Uint8Array;
  readonly mediaType?: string;
  readonly origin?: string;
}

export interface LocalBattleScribeImportLimits {
  readonly maxFiles: number;
  readonly maxTotalBytes: number;
}

export const defaultLocalBattleScribeImportLimits: LocalBattleScribeImportLimits = {
  maxFiles: 256,
  maxTotalBytes: 256 * 1024 * 1024,
};

export interface ImportLocalBattleScribeFilesOptions {
  readonly batchId: string;
  readonly importedAt: string;
  readonly limits?: Partial<LocalBattleScribeImportLimits>;
  readonly ingestionLimits?: Partial<IngestionLimits>;
}

export type LocalBattleScribeFileImportStatus = "imported" | "rejected";
export type LocalBattleScribeBatchStatus =
  | "empty"
  | "complete"
  | "partial"
  | "failed";

export interface LocalBattleScribeFileImportReport {
  readonly index: number;
  readonly source: SourceFileProvenance;
  readonly sourceBytes: Uint8Array;
  readonly status: LocalBattleScribeFileImportStatus;
  readonly diagnostics: readonly Diagnostic[];
  readonly document?: ParsedBattleScribeDocument;
}

export interface LocalBattleScribeImportReport {
  readonly batchId: string;
  readonly importedAt: string;
  readonly status: LocalBattleScribeBatchStatus;
  readonly files: readonly LocalBattleScribeFileImportReport[];
  readonly documents: readonly ParsedBattleScribeDocument[];
}

export async function importLocalBattleScribeFiles(
  files: readonly LocalBattleScribeFile[],
  options: ImportLocalBattleScribeFilesOptions,
): Promise<Result<LocalBattleScribeImportReport>> {
  const limits = {
    ...defaultLocalBattleScribeImportLimits,
    ...options.limits,
  };
  const limitDiagnostics = diagnoseBatchLimits(files, limits);
  if (limitDiagnostics.length > 0) {
    return failure(limitDiagnostics);
  }

  const diagnostics: Diagnostic[] = [];
  const reports: LocalBattleScribeFileImportReport[] = [];
  const documents: ParsedBattleScribeDocument[] = [];

  for (const [index, file] of files.entries()) {
    const source = localSource(file, options, index);
    try {
      const imported = await ingestBattleScribeFile(file.bytes, {
        source,
        ...(options.ingestionLimits === undefined
          ? {}
          : { limits: options.ingestionLimits }),
      });
      diagnostics.push(...imported.diagnostics);
      if (imported.ok) {
        documents.push(imported.value);
        reports.push({
          index,
          source,
          sourceBytes: imported.value.sourceBytes,
          status: "imported",
          diagnostics: imported.diagnostics,
          document: imported.value,
        });
      } else {
        reports.push({
          index,
          source,
          sourceBytes: file.bytes.slice(),
          status: "rejected",
          diagnostics: imported.diagnostics,
        });
      }
    } catch (error: unknown) {
      const unexpected = unexpectedImportDiagnostic(source, error);
      diagnostics.push(unexpected);
      reports.push({
        index,
        source,
        sourceBytes: file.bytes.slice(),
        status: "rejected",
        diagnostics: [unexpected],
      });
    }
  }

  return success(
    {
      batchId: options.batchId,
      importedAt: options.importedAt,
      status: batchStatus(reports),
      files: reports,
      documents,
    },
    diagnostics,
  );
}

function localSource(
  file: LocalBattleScribeFile,
  options: ImportLocalBattleScribeFilesOptions,
  index: number,
): SourceFileProvenance {
  return {
    sourceId: sourceId(`local-file:${options.batchId}:${index}`),
    filename: file.filename,
    kind: "local-file",
    importedAt: options.importedAt,
    ...(file.mediaType === undefined ? {} : { mediaType: file.mediaType }),
    ...(file.origin === undefined ? {} : { origin: file.origin }),
  };
}

function diagnoseBatchLimits(
  files: readonly LocalBattleScribeFile[],
  limits: LocalBattleScribeImportLimits,
): readonly Diagnostic[] {
  if (files.length > limits.maxFiles) {
    return [
      batchDiagnostic(
        "REPOSITORY_LOCAL_IMPORT_FILE_LIMIT",
        "The local import contains too many files.",
        { actualFiles: files.length, limitFiles: limits.maxFiles },
      ),
    ];
  }
  const totalBytes = files.reduce(
    (total, file) => total + file.bytes.byteLength,
    0,
  );
  if (totalBytes > limits.maxTotalBytes) {
    return [
      batchDiagnostic(
        "REPOSITORY_LOCAL_IMPORT_TOTAL_SIZE_LIMIT",
        "The local import exceeds the total byte limit.",
        { actualBytes: totalBytes, limitBytes: limits.maxTotalBytes },
      ),
    ];
  }
  return [];
}

function batchStatus(
  files: readonly LocalBattleScribeFileImportReport[],
): LocalBattleScribeBatchStatus {
  if (files.length === 0) {
    return "empty";
  }
  const imported = files.filter((file) => file.status === "imported").length;
  if (imported === files.length) {
    return "complete";
  }
  return imported === 0 ? "failed" : "partial";
}

function unexpectedImportDiagnostic(
  source: SourceFileProvenance,
  error: unknown,
): Diagnostic {
  return {
    code: "REPOSITORY_LOCAL_IMPORT_UNEXPECTED_FAILURE",
    message: `Unexpected failure while importing ${source.filename}.`,
    severity: "error",
    impacts: ["import", "internal"],
    location: { source },
    details: { cause: errorMessage(error) },
  };
}

function batchDiagnostic(
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts: ["import", "security"],
    details,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
