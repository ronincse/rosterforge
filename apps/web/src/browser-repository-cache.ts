import {
  defaultRemoteBattleScribeRepositoryLimits,
  type PinnedRepositoryByteCache,
  type PinnedRepositoryByteCacheEntry,
  type PinnedRepositoryByteCacheKey,
} from "@rosterforge/repository";

export interface BrowserRepositoryCacheLimits {
  readonly maxEntryBytes: number;
  readonly maxTotalBytes: number;
}

export interface BrowserRepositoryCacheMetadataRecord {
  readonly id: string;
  readonly format: string;
  readonly version: number;
  readonly byteLength: number;
  readonly lastAccessedAt: number;
}

/**
 * Browser storage primitives kept below the repository cache contract.
 *
 * Metadata is separate because touching an LRU timestamp inside a byte record
 * would rewrite up to 16 MiB on every hit. Across the pinned 46-file corpus,
 * sidecars total 13,463 bytes (293 bytes average) beside 62.60 MiB of exact Git-blob source.
 * `delete` and `clear` affect both stores so byte records cannot outlive the
 * accounting used for eviction.
 */
export interface BrowserRepositoryCacheRecordBackend {
  readonly get: (id: string) => Promise<unknown>;
  readonly getAllMetadata: () => Promise<readonly unknown[]>;
  readonly put: (
    record: unknown,
    metadata: BrowserRepositoryCacheMetadataRecord,
  ) => Promise<void>;
  readonly touch: (
    metadata: BrowserRepositoryCacheMetadataRecord,
  ) => Promise<void>;
  readonly delete: (ids: readonly string[]) => Promise<void>;
  readonly clear: () => Promise<void>;
}

const recordFormat = "rosterforge.pinned-repository-byte-cache";
const recordVersion = 1;
const metadataFormat = "rosterforge.pinned-repository-byte-cache-metadata";
const metadataVersion = 1;
const databaseName = "rosterforge-pinned-repository-cache";
const databaseVersion = 2;
const objectStoreName = "pinned-repository-bytes";
const metadataStoreName = "pinned-repository-byte-metadata";

export const defaultBrowserRepositoryCacheLimits: BrowserRepositoryCacheLimits =
  {
    maxEntryBytes: 16 * 1024 * 1024,
    // Match the repository package's acquisition ceiling: one maximally sized
    // source can fit, but old pinned revisions cannot accumulate forever.
    maxTotalBytes: defaultRemoteBattleScribeRepositoryLimits.maxTotalBytes,
  };

/**
 * Adapts browser records to the repository byte-cache contract with an LRU
 * total-byte bound. Reads copy bytes and touch only the small metadata sidecar;
 * writes evict re-downloadable records before storing the replacement.
 */
export function createBrowserRepositoryByteCache(
  backend: BrowserRepositoryCacheRecordBackend,
  limits: Partial<BrowserRepositoryCacheLimits> = {},
  now: () => number = Date.now,
): PinnedRepositoryByteCache {
  const resolvedLimits = {
    ...defaultBrowserRepositoryCacheLimits,
    ...limits,
  };
  assertPositiveInteger(resolvedLimits.maxEntryBytes, "maxEntryBytes");
  assertPositiveInteger(resolvedLimits.maxTotalBytes, "maxTotalBytes");
  if (resolvedLimits.maxEntryBytes > resolvedLimits.maxTotalBytes) {
    throw new Error("maxEntryBytes must not exceed maxTotalBytes.");
  }

  return {
    async read(key) {
      const id = cacheRecordId(key);
      const record = await backend.get(id);
      if (record === undefined) return undefined;
      const decoded = decodeCacheRecord(record, id, key, resolvedLimits);
      try {
        await backend.touch(
          cacheMetadata(id, decoded.bytes.byteLength, timestamp(now)),
        );
      } catch {
        // A stale LRU timestamp may evict this disposable entry sooner, but it
        // must never turn verified cached bytes into a network miss.
      }
      return decoded;
    },

    async write(key, entry) {
      assertCacheEntry(entry, resolvedLimits);
      const id = cacheRecordId(key);
      const accessedAt = timestamp(now);
      const storedMetadata = await backend.getAllMetadata();
      let evicted: readonly string[];
      try {
        const metadata = storedMetadata.map(decodeCacheMetadata);
        evicted = evictionIds(
          metadata,
          id,
          entry.bytes.byteLength,
          resolvedLimits.maxTotalBytes,
        );
      } catch {
        // Metadata is the authority for the total bound. Since every byte is
        // re-downloadable, clearing an unaccountable cache is safer than
        // allowing it to grow without a bound or permanently refusing writes.
        await backend.clear();
        evicted = [];
      }
      if (evicted.length > 0) await backend.delete(evicted);
      await backend.put(
        {
          id,
          format: recordFormat,
          version: recordVersion,
          key: { ...key },
          bytes: entry.bytes.slice(),
          ...(entry.mediaType === undefined
            ? {}
            : { mediaType: entry.mediaType }),
        },
        cacheMetadata(id, entry.bytes.byteLength, accessedAt),
      );
    },
  };
}

/** Creates the IndexedDB-backed, bounded repository byte cache when available. */
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

function cacheMetadata(
  id: string,
  byteLength: number,
  lastAccessedAt: number,
): BrowserRepositoryCacheMetadataRecord {
  return {
    id,
    format: metadataFormat,
    version: metadataVersion,
    byteLength,
    lastAccessedAt,
  };
}

function decodeCacheMetadata(
  value: unknown,
): BrowserRepositoryCacheMetadataRecord {
  if (!isRecord(value)) throw new Error("Cache metadata is not an object.");
  if (
    typeof value.id !== "string" ||
    value.format !== metadataFormat ||
    value.version !== metadataVersion ||
    !nonNegativeSafeInteger(value.byteLength) ||
    !nonNegativeSafeInteger(value.lastAccessedAt)
  ) {
    throw new Error("Cache metadata is invalid.");
  }
  return {
    id: value.id,
    format: value.format,
    version: value.version,
    byteLength: value.byteLength,
    lastAccessedAt: value.lastAccessedAt,
  };
}

function evictionIds(
  metadata: readonly BrowserRepositoryCacheMetadataRecord[],
  writtenId: string,
  writtenBytes: number,
  maxTotalBytes: number,
): readonly string[] {
  const retained = metadata.filter(({ id }) => id !== writtenId);
  let totalBytes = retained.reduce(
    (total, record) => safeByteTotal(total, record.byteLength),
    writtenBytes,
  );
  const oldestFirst = [...retained].sort((left, right) => {
    if (left.lastAccessedAt !== right.lastAccessedAt) {
      return left.lastAccessedAt - right.lastAccessedAt;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  const evicted: string[] = [];
  for (const record of oldestFirst) {
    if (totalBytes <= maxTotalBytes) break;
    evicted.push(record.id);
    totalBytes -= record.byteLength;
  }
  return evicted;
}

function safeByteTotal(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error("Cache metadata total exceeds a safe integer.");
  }
  return total;
}

function timestamp(now: () => number): number {
  const value = now();
  if (!nonNegativeSafeInteger(value)) {
    throw new Error("Cache timestamps must be non-negative safe integers.");
  }
  return value;
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
    throw new Error(name + " must be a positive safe integer.");
  }
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function indexedDbBackend(
  indexedDb: IDBFactory,
): BrowserRepositoryCacheRecordBackend {
  return {
    async get(id) {
      return withObjectStore(indexedDb, "readonly", (store) => store.get(id));
    },
    async getAllMetadata() {
      return withObjectStore(
        indexedDb,
        "readonly",
        (store) => store.getAll(),
        metadataStoreName,
      );
    },
    async put(record, metadata) {
      await withCacheStores(indexedDb, "readwrite", (bytes, sidecars) => {
        bytes.put(record);
        sidecars.put(metadata);
      });
    },
    async touch(metadata) {
      await withObjectStore(
        indexedDb,
        "readwrite",
        (store) => store.put(metadata),
        metadataStoreName,
      );
    },
    async delete(ids) {
      await withCacheStores(indexedDb, "readwrite", (bytes, sidecars) => {
        for (const id of ids) {
          bytes.delete(id);
          sidecars.delete(id);
        }
      });
    },
    async clear() {
      await withCacheStores(indexedDb, "readwrite", (bytes, sidecars) => {
        bytes.clear();
        sidecars.clear();
      });
    },
  };
}

async function withObjectStore<Value>(
  indexedDb: IDBFactory,
  mode: IDBTransactionMode,
  request: (store: IDBObjectStore) => IDBRequest<Value>,
  storeName = objectStoreName,
): Promise<Value> {
  const database = await openDatabase(indexedDb);
  try {
    const transaction = database.transaction(storeName, mode);
    const completion = transactionCompletion(transaction);
    const value = await requestResult(
      request(transaction.objectStore(storeName)),
    );
    await completion;
    return value;
  } finally {
    database.close();
  }
}

async function withCacheStores(
  indexedDb: IDBFactory,
  mode: IDBTransactionMode,
  requests: (bytes: IDBObjectStore, metadata: IDBObjectStore) => void,
): Promise<void> {
  const database = await openDatabase(indexedDb);
  try {
    const transaction = database.transaction(
      [objectStoreName, metadataStoreName],
      mode,
    );
    const completion = transactionCompletion(transaction);
    requests(
      transaction.objectStore(objectStoreName),
      transaction.objectStore(metadataStoreName),
    );
    await completion;
  } finally {
    database.close();
  }
}

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDb.open(databaseName, databaseVersion);
    request.onupgradeneeded = (event) => {
      const transaction = request.transaction;
      if (transaction === null) {
        throw new Error("IndexedDB upgrade did not provide a transaction.");
      }
      const bytes = request.result.objectStoreNames.contains(objectStoreName)
        ? transaction.objectStore(objectStoreName)
        : request.result.createObjectStore(objectStoreName, { keyPath: "id" });
      const metadata = request.result.objectStoreNames.contains(
        metadataStoreName,
      )
        ? transaction.objectStore(metadataStoreName)
        : request.result.createObjectStore(metadataStoreName, { keyPath: "id" });
      if (event.oldVersion < 2) migrateLegacyRecords(bytes, metadata);
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

function migrateLegacyRecords(
  bytes: IDBObjectStore,
  metadata: IDBObjectStore,
): void {
  const cursorRequest = bytes.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (cursor === null) return;
    const sidecar = legacyCacheMetadata(cursor.value);
    if (sidecar === undefined) {
      cursor.delete();
    } else {
      metadata.put(sidecar);
    }
    cursor.continue();
  };
}

function legacyCacheMetadata(
  value: unknown,
): BrowserRepositoryCacheMetadataRecord | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.format !== recordFormat ||
    value.version !== recordVersion ||
    !isCacheKey(value.key) ||
    cacheRecordId(value.key) !== value.id ||
    !(value.bytes instanceof Uint8Array) ||
    value.bytes.byteLength >
      defaultBrowserRepositoryCacheLimits.maxEntryBytes ||
    (value.mediaType !== undefined && typeof value.mediaType !== "string")
  ) {
    return undefined;
  }
  // Version-1 records have no access time. Zero makes them the first eviction
  // candidates without pretending to know when they were actually used.
  return cacheMetadata(value.id, value.bytes.byteLength, 0);
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