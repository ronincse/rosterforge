import {
  decodeLocalRosterDraft,
  type LocalRosterDraft,
} from "@rosterforge/persistence";
import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from "@rosterforge/foundation";
import type { RosterForce, RosterSelection } from "@rosterforge/roster-model";

export interface LocalRosterDraftSummary {
  readonly id: string;
  readonly rosterName: string;
  readonly catalogueKey: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fileCount: number;
  readonly totalFileBytes: number;
  readonly selectionCount: number;
}

export interface LocalRosterDraftStore {
  readonly list: () => Promise<Result<readonly LocalRosterDraftSummary[]>>;
  readonly load: (
    id: string,
  ) => Promise<Result<LocalRosterDraft | undefined>>;
  readonly save: (draft: LocalRosterDraft) => Promise<Result<void>>;
  readonly delete: (id: string) => Promise<Result<void>>;
}

/** Anything the store keeps: a draft, or a batch's shared source files. */
export type StoredRecord = LocalRosterDraft | DraftFilesRecord;

/**
 * The source files of one import batch, stored once and referenced by every
 * draft that came from it.
 *
 * A draft record embeds its catalogue bytes, and IndexedDB replaces whole
 * records, so leaving them there meant every autosave rewrote every byte — 8.2
 * MB for one faction, far more for a wider import. Batch bytes never change, so
 * they are written once and the draft record keeps empty placeholders.
 */
export interface DraftFilesRecord {
  readonly id: string;
  readonly files: readonly LocalRosterDraft["import"]["files"][number][];
}

export interface LocalRosterDraftRecordBackend {
  readonly getAll: () => Promise<readonly unknown[]>;
  readonly get: (id: string) => Promise<unknown>;
  readonly put: (record: StoredRecord) => Promise<void>;
  readonly delete: (id: string) => Promise<void>;
}

const databaseName = "rosterforge";
const databaseVersion = 1;
const objectStoreName = "local-roster-drafts";

/**
 * The reserved key for the unsaved-roster recovery slot.
 *
 * It shares the draft store so it reuses the same validation and byte limits,
 * but it is not a draft the user asked to keep: `list` hides it so it never
 * reaches the shelf. Exactly one exists at a time, which bounds its cost to one
 * catalogue closure rather than one per experiment.
 */
export const recoveryDraftId = "__recovery__";

const filesKeyPrefix = "files:";

function filesKey(batchId: string): string {
  return `${filesKeyPrefix}${batchId}`;
}

function isFilesRecord(value: unknown): value is DraftFilesRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    (value as { id: string }).id.startsWith(filesKeyPrefix) &&
    Array.isArray((value as { files?: unknown }).files)
  );
}

/** The draft as stored: real bytes live in the batch's files record. */
function withoutBytes(draft: LocalRosterDraft): LocalRosterDraft {
  return {
    ...draft,
    import: {
      ...draft.import,
      files: draft.import.files.map((file) => ({
        ...file,
        bytes: new Uint8Array(0),
      })),
    },
  };
}

function withFiles(
  draft: LocalRosterDraft,
  files: DraftFilesRecord["files"],
): LocalRosterDraft {
  return { ...draft, import: { ...draft.import, files } };
}

export function createLocalRosterDraftStore(
  backend: LocalRosterDraftRecordBackend,
): LocalRosterDraftStore {
  return {
    async list() {
      let records: readonly unknown[];
      try {
        records = await backend.getAll();
      } catch (error: unknown) {
        return operationFailure(
          "PERSISTENCE_DRAFT_READ_FAILED",
          "Saved roster drafts could not be listed.",
          error,
        );
      }

      const summaries: LocalRosterDraftSummary[] = [];
      const diagnostics: Diagnostic[] = [];
      const filesByKey = new Map<string, DraftFilesRecord["files"]>();
      for (const record of records) {
        if (isFilesRecord(record)) filesByKey.set(record.id, record.files);
      }
      for (const record of records) {
        if (isFilesRecord(record)) continue;
        const decoded = decodeLocalRosterDraft(record);
        diagnostics.push(...decoded.diagnostics);
        // The recovery slot lives in this store but is not a saved draft.
        if (!decoded.ok || !isShelfDraft(decoded.value)) continue;
        // Records written before bytes were split still carry their own.
        const files =
          filesByKey.get(filesKey(decoded.value.import.batchId)) ??
          decoded.value.import.files;
        summaries.push(summarizeDraft(withFiles(decoded.value, files)));
      }
      summaries.sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
          left.id.localeCompare(right.id),
      );
      return success(summaries, diagnostics);
    },

    async load(id) {
      let record: unknown;
      try {
        record = await backend.get(id);
      } catch (error: unknown) {
        return operationFailure(
          "PERSISTENCE_DRAFT_READ_FAILED",
          "The saved roster draft could not be read.",
          error,
        );
      }
      if (record === undefined) return success(undefined);
      const decoded = decodeLocalRosterDraft(record);
      if (!decoded.ok) return decoded;
      const stored = await backend.get(filesKey(decoded.value.import.batchId));
      // A record written before the split carries its own bytes.
      const files = isFilesRecord(stored)
        ? stored.files
        : decoded.value.import.files;
      return success(
        withFiles(decoded.value, files),
        decoded.diagnostics,
      );
    },

    async save(draft) {
      const decoded = decodeLocalRosterDraft(draft);
      if (!decoded.ok) return decoded;
      try {
        // Batch bytes never change, so they are written once and every later
        // save of any draft from that batch writes only the small record.
        const key = filesKey(decoded.value.import.batchId);
        if ((await backend.get(key)) === undefined) {
          await backend.put({ id: key, files: decoded.value.import.files });
        }
        await backend.put(withoutBytes(decoded.value));
        return success(undefined);
      } catch (error: unknown) {
        return operationFailure(
          "PERSISTENCE_DRAFT_WRITE_FAILED",
          "The roster draft could not be saved in this browser.",
          error,
        );
      }
    },

    async delete(id) {
      try {
        // Learn which batch this draft referenced before it is gone.
        const removed = await backend.get(id);
        const decoded =
          removed === undefined ? undefined : decodeLocalRosterDraft(removed);
        await backend.delete(id);

        // Shared bytes outlive one draft, but not all of them: collect the
        // batch once nothing references it, or it leaks megabytes forever.
        if (decoded?.ok === true) {
          const batchId = decoded.value.import.batchId;
          const remaining = await backend.getAll();
          const stillUsed = remaining.some((record) => {
            if (isFilesRecord(record)) return false;
            const other = decodeLocalRosterDraft(record);
            return other.ok && other.value.import.batchId === batchId;
          });
          if (!stillUsed) await backend.delete(filesKey(batchId));
        }
        return success(undefined);
      } catch (error: unknown) {
        return operationFailure(
          "PERSISTENCE_DRAFT_DELETE_FAILED",
          "The saved roster draft could not be deleted.",
          error,
        );
      }
    },
  };
}

export function createIndexedDbLocalRosterDraftStore(
  indexedDb: IDBFactory | null | undefined = browserIndexedDb(),
): LocalRosterDraftStore {
  if (indexedDb === undefined || indexedDb === null) {
    return unavailableDraftStore();
  }
  return createLocalRosterDraftStore(indexedDbBackend(indexedDb));
}

function indexedDbBackend(
  indexedDb: IDBFactory,
): LocalRosterDraftRecordBackend {
  return {
    async getAll() {
      return withObjectStore(indexedDb, "readonly", (store) => store.getAll());
    },
    async get(id) {
      return withObjectStore(indexedDb, "readonly", (store) => store.get(id));
    },
    async put(draft) {
      await withObjectStore(indexedDb, "readwrite", (store) =>
        store.put(draft),
      );
    },
    async delete(id) {
      await withObjectStore(indexedDb, "readwrite", (store) =>
        store.delete(id),
      );
    },
  };
}

async function withObjectStore<Value>(
  indexedDb: IDBFactory,
  mode: IDBTransactionMode,
  request: (store: IDBObjectStore) => IDBRequest<Value>,
): Promise<Value> {
  const database = await openDatabase(indexedDb);
  try {
    const transaction = database.transaction(objectStoreName, mode);
    const completion = transactionCompletion(transaction);
    const value = await requestResult(
      request(transaction.objectStore(objectStoreName)),
    );
    await completion;
    return value;
  } finally {
    database.close();
  }
}

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDb.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(objectStoreName)) {
        request.result.createObjectStore(objectStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      settled = true;
      reject(request.error ?? new Error("IndexedDB open failed."));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error("IndexedDB upgrade was blocked by another tab."));
    };
  });
}

function requestResult<Value>(request: IDBRequest<Value>): Promise<Value> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function browserIndexedDb(): IDBFactory | undefined {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

function unavailableDraftStore(): LocalRosterDraftStore {
  const unavailable = () =>
    failure([
      persistenceDiagnostic(
        "PERSISTENCE_INDEXEDDB_UNAVAILABLE",
        "This browser does not make IndexedDB available, so local roster drafts cannot be used.",
      ),
    ]);
  return {
    list: async () => unavailable(),
    load: async () => unavailable(),
    save: async () => unavailable(),
    delete: async () => unavailable(),
  };
}

function isShelfDraft(draft: LocalRosterDraft): boolean {
  return draft.id !== recoveryDraftId;
}

function summarizeDraft(draft: LocalRosterDraft): LocalRosterDraftSummary {
  return {
    id: draft.id,
    rosterName: draft.roster.name,
    catalogueKey: draft.catalogueKey,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    fileCount: draft.import.files.length,
    totalFileBytes: draft.import.files.reduce(
      (total, file) => total + file.bytes.byteLength,
      0,
    ),
    selectionCount: draft.roster.forces.reduce(
      (total, force) => total + countForceSelections(force),
      0,
    ),
  };
}

function countForceSelections(force: RosterForce): number {
  return (
    countSelections(force.selections) +
    force.forces.reduce(
      (total, child) => total + countForceSelections(child),
      0,
    )
  );
}

function countSelections(selections: readonly RosterSelection[]): number {
  return selections.reduce(
    (total, selection) =>
      total + 1 + countSelections(selection.selections),
    0,
  );
}

function operationFailure(
  code: string,
  message: string,
  error: unknown,
): Result<never> {
  return failure([
    persistenceDiagnostic(code, message, {
      cause: error instanceof Error ? error.message : String(error),
    }),
  ]);
}

function persistenceDiagnostic(
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts: ["persistence"],
    ...(details === undefined ? {} : { details }),
  };
}
