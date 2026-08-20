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

export interface LocalRosterDraftRecordBackend {
  readonly getAll: () => Promise<readonly unknown[]>;
  readonly get: (id: string) => Promise<unknown>;
  readonly put: (draft: LocalRosterDraft) => Promise<void>;
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
      for (const record of records) {
        const decoded = decodeLocalRosterDraft(record);
        diagnostics.push(...decoded.diagnostics);
        // The recovery slot lives in this store but is not a saved draft.
        if (decoded.ok && isShelfDraft(decoded.value)) {
          summaries.push(summarizeDraft(decoded.value));
        }
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
      return record === undefined
        ? success(undefined)
        : decodeLocalRosterDraft(record);
    },

    async save(draft) {
      const decoded = decodeLocalRosterDraft(draft);
      if (!decoded.ok) return decoded;
      try {
        await backend.put(decoded.value);
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
        await backend.delete(id);
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
