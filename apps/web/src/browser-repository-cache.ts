import type {
  PinnedRepositoryByteCache,
  PinnedRepositoryByteCacheEntry,
  PinnedRepositoryByteCacheKey,
} from "@rosterforge/repository";

export interface BrowserRepositoryCacheLimits {
  readonly maxEntryBytes: number;
}

export interface BrowserRepositoryCacheRecordBackend {
  readonly get: (id: string) => Promise<unknown>;
  readonly put: (record: unknown) => Promise<void>;
}

const recordFormat = "rosterforge.pinned-repository-byte-cache";
const recordVersion = 1;
const databaseName = "rosterforge-pinned-repository-cache";
const databaseVersion = 1;
const objectStoreName = "pinned-repository-bytes";

export const defaultBrowserRepositoryCacheLimits: BrowserRepositoryCacheLimits =
  {
    maxEntryBytes: 16 * 1024 * 1024,
  };

export function createBrowserRepositoryByteCache(
  backend: BrowserRepositoryCacheRecordBackend,
  limits: Partial<BrowserRepositoryCacheLimits> = {},
): PinnedRepositoryByteCache {
  const resolvedLimits = {
    ...defaultBrowserRepositoryCacheLimits,
    ...limits,
  };
  assertPositiveInteger(resolvedLimits.maxEntryBytes, "maxEntryBytes");

  return {
    async read(key) {
      const id = cacheRecordId(key);
      const record = await backend.get(id);
      if (record === undefined) return undefined;
      return decodeCacheRecord(record, id, key, resolvedLimits);
    },

    async write(key, entry) {
      assertCacheEntry(entry, resolvedLimits);
      await backend.put({
        id: cacheRecordId(key),
        format: recordFormat,
        version: recordVersion,
        key: { ...key },
        bytes: entry.bytes.slice(),
        ...(entry.mediaType === undefined
          ? {}
          : { mediaType: entry.mediaType }),
      });
    },
  };
}

export function createIndexedDbRepositoryByteCache(
  indexedDb: IDBFactory | null | undefined = browserIndexedDb(),
  limits: Partial<BrowserRepositoryCacheLimits> = {},
): PinnedRepositoryByteCache | undefined {
  if (indexedDb === undefined || indexedDb === null) return undefined;
  return createBrowserRepositoryByteCache(indexedDbBackend(indexedDb), limits);
}

function decodeCacheRecord(
  value: unknown,
  expectedId: string,
  expectedKey: PinnedRepositoryByteCacheKey,
  limits: BrowserRepositoryCacheLimits,
): PinnedRepositoryByteCacheEntry {
  if (!isRecord(value)) throw new Error("The cache record is not an object.");
  if (value.id !== expectedId) throw new Error("The cache record ID is invalid.");
  if (value.format !== recordFormat || value.version !== recordVersion) {
    throw new Error("The cache record format is unsupported.");
  }
  if (!isCacheKey(value.key) || !cacheKeysEqual(value.key, expectedKey)) {
    throw new Error("The cache record key does not match the requested file.");
  }
  if (!(value.bytes instanceof Uint8Array)) {
    throw new Error("The cache record bytes are invalid.");
  }
  if (value.bytes.byteLength > limits.maxEntryBytes) {
    throw new Error("The cache record exceeds the configured byte limit.");
  }
  if (value.mediaType !== undefined && typeof value.mediaType !== "string") {
    throw new Error("The cache record media type is invalid.");
  }
  return {
    bytes: value.bytes.slice(),
    ...(value.mediaType === undefined ? {} : { mediaType: value.mediaType }),
  };
}

function assertCacheEntry(
  entry: PinnedRepositoryByteCacheEntry,
  limits: BrowserRepositoryCacheLimits,
): void {
  if (!(entry.bytes instanceof Uint8Array)) {
    throw new Error("Cache entry bytes must be a Uint8Array.");
  }
  if (entry.bytes.byteLength > limits.maxEntryBytes) {
    throw new Error("Cache entry bytes exceed the configured byte limit.");
  }
  if (entry.mediaType !== undefined && typeof entry.mediaType !== "string") {
    throw new Error("Cache entry mediaType must be a string when present.");
  }
}

function cacheRecordId(key: PinnedRepositoryByteCacheKey): string {
  return JSON.stringify([
    key.provider,
    key.owner,
    key.repository,
    key.revision,
    key.path,
    key.objectId,
  ]);
}

function isCacheKey(value: unknown): value is PinnedRepositoryByteCacheKey {
  if (!isRecord(value)) return false;
  return (
    value.provider === "github" &&
    typeof value.owner === "string" &&
    typeof value.repository === "string" &&
    typeof value.revision === "string" &&
    typeof value.path === "string" &&
    typeof value.objectId === "string"
  );
}

function cacheKeysEqual(
  left: PinnedRepositoryByteCacheKey,
  right: PinnedRepositoryByteCacheKey,
): boolean {
  return (
    left.provider === right.provider &&
    left.owner === right.owner &&
    left.repository === right.repository &&
    left.revision === right.revision &&
    left.path === right.path &&
    left.objectId === right.objectId
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
}

function indexedDbBackend(
  indexedDb: IDBFactory,
): BrowserRepositoryCacheRecordBackend {
  return {
    async get(id) {
      return withObjectStore(indexedDb, "readonly", (store) => store.get(id));
    },
    async put(record) {
      await withObjectStore(indexedDb, "readwrite", (store) =>
        store.put(record),
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
