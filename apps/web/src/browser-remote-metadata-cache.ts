import type {
  Diagnostic,
  DiagnosticImpactDomain,
  DiagnosticSeverity,
  ObjectId,
  SourceFileProvenance,
  SourceId,
  SourceLocation,
  SourcePosition,
} from "@rosterforge/foundation";
import type {
  BattleScribeRepositoryDocumentSummary,
  GitObjectSha,
  PinnedGitHubRepositoryFile,
  PinnedRepositoryCacheStatus,
  RemoteRepositoryIndexFileReport,
  RepositoryCatalogueLinkSummary,
} from "@rosterforge/repository";

import type {
  RemoteCatalogueMetadataCache,
  RemoteCatalogueMetadataCacheEntry,
  RemoteCatalogueMetadataCacheKey,
} from "./remote-catalogue-source.js";

export interface BrowserRemoteMetadataCacheLimits {
  readonly maxEntryBytes: number;
  readonly maxTotalBytes: number;
  readonly maxFiles: number;
  readonly maxDocuments: number;
  readonly maxDiagnostics: number;
  readonly maxCatalogueLinks: number;
  readonly maxCostTypeIds: number;
}

/**
 * Browser storage primitives kept below the remote-index cache contract.
 *
 * Access metadata is separate because touching an LRU timestamp in the main
 * record would rewrite a payload accepted at up to 32 MiB on every cache hit.
 * Delete and clear operations keep records and accounting sidecars paired.
 */
export interface BrowserRemoteMetadataCacheRecordBackend {
  readonly get: (id: string) => Promise<unknown>;
  readonly getAllMetadata: () => Promise<readonly unknown[]>;
  readonly put: (
    record: unknown,
    metadata: BrowserRemoteMetadataCacheMetadataRecord,
  ) => Promise<void>;
  readonly touch: (
    metadata: BrowserRemoteMetadataCacheMetadataRecord,
  ) => Promise<void>;
  readonly delete: (ids: readonly string[]) => Promise<void>;
  readonly clear: () => Promise<void>;
}

export interface BrowserRemoteMetadataCacheMetadataRecord {
  readonly id: string;
  readonly format: string;
  readonly version: number;
  readonly byteLength: number;
  readonly lastAccessedAt: number;
}

const recordFormat = "rosterforge.pinned-repository-metadata-cache";
const recordVersion = 2;
const legacyRecordVersion = 1;
const metadataFormat =
  "rosterforge.pinned-repository-metadata-cache-metadata";
const metadataVersion = 1;
const databaseName = "rosterforge-pinned-repository-metadata-cache";
const databaseVersion = 2;
const objectStoreName = "pinned-repository-metadata";
const metadataStoreName = "pinned-repository-metadata-lru";
const gitShaPattern = /^[0-9a-f]{40}$/u;

export const defaultBrowserRemoteMetadataCacheLimits: BrowserRemoteMetadataCacheLimits =
  {
    maxEntryBytes: 32 * 1024 * 1024,
    // One maximally accepted index can fit. The pinned 46-document index is
    // currently 181,985 bytes, so real revisions remain plentiful but bounded.
    maxTotalBytes: 32 * 1024 * 1024,
    maxFiles: 4096,
    maxDocuments: 4096,
    maxDiagnostics: 100_000,
    maxCatalogueLinks: 65_536,
    maxCostTypeIds: 65_536,
  };

/**
 * Adapts browser records to the remote-index cache contract with an LRU
 * total-byte bound. Valid hits survive a failed best-effort sidecar touch.
 */
export function createBrowserRemoteCatalogueMetadataCache(
  backend: BrowserRemoteMetadataCacheRecordBackend,
  limits: Partial<BrowserRemoteMetadataCacheLimits> = {},
  now: () => number = Date.now,
): RemoteCatalogueMetadataCache {
  const resolvedLimits = {
    ...defaultBrowserRemoteMetadataCacheLimits,
    ...limits,
  };
  for (const [name, value] of Object.entries(resolvedLimits)) {
    assertPositiveInteger(value, name);
  }
  if (resolvedLimits.maxEntryBytes > resolvedLimits.maxTotalBytes) {
    throw new Error("maxEntryBytes must not exceed maxTotalBytes.");
  }

  return {
    async read(key) {
      const id = cacheRecordId(key);
      const record = await backend.get(id);
      if (record === undefined) return undefined;
      if (
        isRecord(record) &&
        record.format === recordFormat &&
        record.version === legacyRecordVersion
      ) {
        // Version 1 predates repository cost-type summaries. Treating this
        // expected schema transition as corruption would surface a false
        // Developer warning; the verified index rebuild will replace it.
        return undefined;
      }
      const decoded = decodeCacheRecord(record, id, key, resolvedLimits);
      try {
        await backend.touch(
          cacheMetadata(id, decoded.byteLength, timestamp(now)),
        );
      } catch {
        // A stale LRU timestamp may evict this disposable index sooner, but it
        // must never turn a valid cached index into a network miss.
      }
      return decoded.entry;
    },

    async write(key, entry) {
      const payload = JSON.stringify(entry);
      const byteLength = payloadByteLength(payload);
      assertPayloadSize(byteLength, resolvedLimits.maxEntryBytes);
      decodePayload(JSON.parse(payload) as unknown, resolvedLimits);
      const id = cacheRecordId(key);
      const accessedAt = timestamp(now);
      const storedMetadata = await backend.getAllMetadata();
      let evicted: readonly string[];
      try {
        evicted = evictionIds(
          storedMetadata.map(decodeCacheMetadata),
          id,
          byteLength,
          resolvedLimits.maxTotalBytes,
        );
      } catch {
        // Sidecars are authoritative for the total bound. Every index can be
        // rebuilt, so clear unaccountable records before accepting a write.
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
          payload,
        },
        cacheMetadata(id, byteLength, accessedAt),
      );
    },
  };
}

/** Creates the bounded IndexedDB remote-index cache when available. */
export function createIndexedDbRemoteCatalogueMetadataCache(
  indexedDb: IDBFactory | null | undefined = browserIndexedDb(),
  limits: Partial<BrowserRemoteMetadataCacheLimits> = {},
): RemoteCatalogueMetadataCache | undefined {
  if (indexedDb === undefined || indexedDb === null) return undefined;
  return createBrowserRemoteCatalogueMetadataCache(
    indexedDbBackend(indexedDb),
    limits,
  );
}

function decodeCacheRecord(
  value: unknown,
  expectedId: string,
  expectedKey: RemoteCatalogueMetadataCacheKey,
  limits: BrowserRemoteMetadataCacheLimits,
): {
  readonly entry: RemoteCatalogueMetadataCacheEntry;
  readonly byteLength: number;
} {
  if (!isRecord(value)) throw invalidRecord("is not an object");
  if (value.id !== expectedId) throw invalidRecord("has an invalid ID");
  if (value.format !== recordFormat || value.version !== recordVersion) {
    throw invalidRecord("uses an unsupported format");
  }
  if (!isCacheKey(value.key) || !cacheKeysEqual(value.key, expectedKey)) {
    throw invalidRecord("does not match the requested pinned tree");
  }
  if (typeof value.payload !== "string") {
    throw invalidRecord("does not contain a JSON payload");
  }
  const byteLength = payloadByteLength(value.payload);
  assertPayloadSize(byteLength, limits.maxEntryBytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(value.payload) as unknown;
  } catch {
    throw invalidRecord("does not contain valid JSON");
  }
  return {
    entry: decodePayload(parsed, limits),
    byteLength,
  };
}

function decodePayload(
  value: unknown,
  limits: BrowserRemoteMetadataCacheLimits,
): RemoteCatalogueMetadataCacheEntry {
  if (!isRecord(value)) throw invalidPayload("is not an object");
  if (!indexStatus(value.status)) {
    throw invalidPayload("has an invalid index status");
  }
  if (!nonNegativeSafeInteger(value.totalBytes)) {
    throw invalidPayload("has an invalid total byte count");
  }
  if (!Array.isArray(value.files) || value.files.length > limits.maxFiles) {
    throw invalidPayload("has an invalid file collection");
  }
  if (
    !Array.isArray(value.documents) ||
    value.documents.length > limits.maxDocuments
  ) {
    throw invalidPayload("has an invalid document collection");
  }

  const counts = { diagnostics: 0, catalogueLinks: 0, costTypeIds: 0 };
  return {
    status: value.status,
    totalBytes: value.totalBytes,
    files: value.files.map((file) => decodeFile(file, counts, limits)),
    documents: value.documents.map((document) =>
      decodeDocument(document, counts, limits),
    ),
  };
}

function decodeFile(
  value: unknown,
  counts: { diagnostics: number; catalogueLinks: number; costTypeIds: number },
  limits: BrowserRemoteMetadataCacheLimits,
): RemoteRepositoryIndexFileReport {
  if (!isRecord(value)) throw invalidPayload("contains a non-object file");
  if (!nonNegativeSafeInteger(value.index)) {
    throw invalidPayload("contains an invalid file index");
  }
  if (value.status !== "indexed" && value.status !== "rejected") {
    throw invalidPayload("contains an invalid file status");
  }
  if (!Array.isArray(value.diagnostics)) {
    throw invalidPayload("contains invalid file diagnostics");
  }
  counts.diagnostics += value.diagnostics.length;
  if (counts.diagnostics > limits.maxDiagnostics) {
    throw invalidPayload("contains too many diagnostics");
  }
  if (
    value.cacheStatus !== undefined &&
    !cacheStatus(value.cacheStatus)
  ) {
    throw invalidPayload("contains an invalid byte-cache status");
  }

  const summary =
    value.summary === undefined
      ? undefined
      : decodeDocument(value.summary, counts, limits);
  return {
    index: value.index,
    file: decodeTreeFile(value.file),
    status: value.status,
    diagnostics: value.diagnostics.map(decodeDiagnostic),
    ...(value.cacheStatus === undefined
      ? {}
      : { cacheStatus: value.cacheStatus }),
    ...(summary === undefined ? {} : { summary }),
  };
}

function decodeTreeFile(value: unknown): PinnedGitHubRepositoryFile {
  if (
    !isRecord(value) ||
    typeof value.path !== "string" ||
    !gitSha(value.objectId) ||
    (value.byteSize !== undefined &&
      !nonNegativeSafeInteger(value.byteSize))
  ) {
    throw invalidPayload("contains an invalid pinned tree file");
  }
  return {
    path: value.path,
    objectId: value.objectId as GitObjectSha,
    ...(value.byteSize === undefined ? {} : { byteSize: value.byteSize }),
  };
}

function decodeDocument(
  value: unknown,
  counts: { diagnostics: number; catalogueLinks: number; costTypeIds: number },
  limits: BrowserRemoteMetadataCacheLimits,
): BattleScribeRepositoryDocumentSummary {
  if (
    !isRecord(value) ||
    typeof value.path !== "string" ||
    (value.kind !== "gameSystem" && value.kind !== "catalogue") ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.gameSystemId !== undefined &&
      typeof value.gameSystemId !== "string") ||
    (value.library !== undefined && typeof value.library !== "boolean") ||
    !Array.isArray(value.catalogueLinks) ||
    !Array.isArray(value.costTypeIds) ||
    !value.costTypeIds.every((id) => typeof id === "string")
  ) {
    throw invalidPayload("contains an invalid document summary");
  }
  counts.catalogueLinks += value.catalogueLinks.length;
  if (counts.catalogueLinks > limits.maxCatalogueLinks) {
    throw invalidPayload("contains too many catalogue links");
  }
  counts.costTypeIds += value.costTypeIds.length;
  if (counts.costTypeIds > limits.maxCostTypeIds) {
    throw invalidPayload("contains too many cost-type IDs");
  }

  const source =
    value.source === undefined ? undefined : decodeSource(value.source);
  return {
    path: value.path,
    kind: value.kind,
    id: value.id as ObjectId,
    name: value.name,
    ...(value.gameSystemId === undefined
      ? {}
      : { gameSystemId: value.gameSystemId as ObjectId }),
    ...(value.library === undefined ? {} : { library: value.library }),
    costTypeIds: value.costTypeIds as ObjectId[],
    catalogueLinks: value.catalogueLinks.map(decodeCatalogueLink),
    ...(source === undefined ? {} : { source }),
  };
}

function decodeCatalogueLink(
  value: unknown,
): RepositoryCatalogueLinkSummary {
  if (
    !isRecord(value) ||
    (value.targetId !== undefined && typeof value.targetId !== "string") ||
    (value.name !== undefined && typeof value.name !== "string")
  ) {
    throw invalidPayload("contains an invalid catalogue link");
  }
  const location =
    value.location === undefined
      ? undefined
      : decodeLocation(value.location);
  return {
    ...(value.targetId === undefined
      ? {}
      : { targetId: value.targetId as ObjectId }),
    ...(value.name === undefined ? {} : { name: value.name }),
    ...(location === undefined ? {} : { location }),
  };
}

function decodeDiagnostic(value: unknown): Diagnostic {
  if (
    !isRecord(value) ||
    typeof value.code !== "string" ||
    typeof value.message !== "string" ||
    !diagnosticSeverity(value.severity) ||
    !Array.isArray(value.impacts) ||
    !value.impacts.every(diagnosticImpact)
  ) {
    throw invalidPayload("contains an invalid diagnostic");
  }
  if (value.details !== undefined && !isRecord(value.details)) {
    throw invalidPayload("contains invalid diagnostic details");
  }
  const location =
    value.location === undefined
      ? undefined
      : decodeLocation(value.location);
  return {
    code: value.code,
    message: value.message,
    severity: value.severity,
    impacts: value.impacts,
    ...(location === undefined ? {} : { location }),
    ...(value.details === undefined ? {} : { details: value.details }),
  };
}

function decodeLocation(value: unknown): SourceLocation {
  if (!isRecord(value)) throw invalidPayload("contains an invalid location");
  const start =
    value.start === undefined ? undefined : decodePosition(value.start);
  const end = value.end === undefined ? undefined : decodePosition(value.end);
  if (
    value.path !== undefined &&
    (!Array.isArray(value.path) ||
      !value.path.every((segment) => typeof segment === "string"))
  ) {
    throw invalidPayload("contains an invalid source path");
  }
  return {
    source: decodeSource(value.source),
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
    ...(value.path === undefined
      ? {}
      : { path: value.path as readonly string[] }),
  };
}

function decodeSource(value: unknown): SourceFileProvenance {
  if (
    !isRecord(value) ||
    typeof value.sourceId !== "string" ||
    typeof value.filename !== "string" ||
    (value.kind !== "local-file" &&
      value.kind !== "download" &&
      value.kind !== "synthetic") ||
    typeof value.importedAt !== "string" ||
    (value.mediaType !== undefined && typeof value.mediaType !== "string") ||
    (value.origin !== undefined && typeof value.origin !== "string")
  ) {
    throw invalidPayload("contains invalid source provenance");
  }
  return {
    sourceId: value.sourceId as SourceId,
    filename: value.filename,
    kind: value.kind,
    importedAt: value.importedAt,
    ...(value.mediaType === undefined ? {} : { mediaType: value.mediaType }),
    ...(value.origin === undefined ? {} : { origin: value.origin }),
  };
}

function decodePosition(value: unknown): SourcePosition {
  if (
    !isRecord(value) ||
    (value.offset !== undefined && !nonNegativeSafeInteger(value.offset)) ||
    (value.line !== undefined && !nonNegativeSafeInteger(value.line)) ||
    (value.column !== undefined && !nonNegativeSafeInteger(value.column))
  ) {
    throw invalidPayload("contains an invalid source position");
  }
  return {
    ...(value.offset === undefined ? {} : { offset: value.offset }),
    ...(value.line === undefined ? {} : { line: value.line }),
    ...(value.column === undefined ? {} : { column: value.column }),
  };
}

function cacheRecordId(key: RemoteCatalogueMetadataCacheKey): string {
  return JSON.stringify([
    key.provider,
    key.owner,
    key.repository,
    key.revision,
    key.treeObjectId,
  ]);
}

function isCacheKey(
  value: unknown,
): value is RemoteCatalogueMetadataCacheKey {
  return (
    isRecord(value) &&
    value.provider === "github" &&
    typeof value.owner === "string" &&
    typeof value.repository === "string" &&
    gitSha(value.revision) &&
    gitSha(value.treeObjectId)
  );
}

function cacheKeysEqual(
  left: RemoteCatalogueMetadataCacheKey,
  right: RemoteCatalogueMetadataCacheKey,
): boolean {
  return (
    left.provider === right.provider &&
    left.owner === right.owner &&
    left.repository === right.repository &&
    left.revision === right.revision &&
    left.treeObjectId === right.treeObjectId
  );
}

function indexStatus(
  value: unknown,
): value is RemoteCatalogueMetadataCacheEntry["status"] {
  return (
    value === "empty" ||
    value === "complete" ||
    value === "partial" ||
    value === "failed"
  );
}

function cacheStatus(value: unknown): value is PinnedRepositoryCacheStatus {
  return (
    value === "hit" ||
    value === "miss" ||
    value === "invalid" ||
    value === "unavailable"
  );
}

function diagnosticSeverity(
  value: unknown,
): value is DiagnosticSeverity {
  return value === "info" || value === "warning" || value === "error";
}

function diagnosticImpact(
  value: unknown,
): value is DiagnosticImpactDomain {
  return (
    value === "import" ||
    value === "parsing" ||
    value === "security" ||
    value === "compatibility" ||
    value === "resolution" ||
    value === "validation" ||
    value === "persistence" ||
    value === "internal"
  );
}

function payloadByteLength(payload: string): number {
  return new TextEncoder().encode(payload).byteLength;
}

function assertPayloadSize(actualBytes: number, maxEntryBytes: number): void {
  if (actualBytes > maxEntryBytes) {
    throw new Error(
      `The metadata cache payload exceeds the configured byte limit (${actualBytes} > ${maxEntryBytes}).`,
    );
  }
}

function cacheMetadata(
  id: string,
  byteLength: number,
  lastAccessedAt: number,
): BrowserRemoteMetadataCacheMetadataRecord {
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
): BrowserRemoteMetadataCacheMetadataRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.format !== metadataFormat ||
    value.version !== metadataVersion ||
    !nonNegativeSafeInteger(value.byteLength) ||
    !nonNegativeSafeInteger(value.lastAccessedAt)
  ) {
    throw new Error("Metadata cache accounting is invalid.");
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
  metadata: readonly BrowserRemoteMetadataCacheMetadataRecord[],
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
    throw new Error("Metadata cache total exceeds a safe integer.");
  }
  return total;
}

function timestamp(now: () => number): number {
  const value = now();
  if (!nonNegativeSafeInteger(value)) {
    throw new Error(
      "Metadata cache timestamps must be non-negative safe integers.",
    );
  }
  return value;
}

function gitSha(value: unknown): value is string {
  return typeof value === "string" && gitShaPattern.test(value);
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
}

function invalidRecord(reason: string): Error {
  return new Error(`The metadata cache record ${reason}.`);
}

function invalidPayload(reason: string): Error {
  return new Error(`The metadata cache payload ${reason}.`);
}

function indexedDbBackend(
  indexedDb: IDBFactory,
): BrowserRemoteMetadataCacheRecordBackend {
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
      await withCacheStores(indexedDb, "readwrite", (records, sidecars) => {
        records.put(record);
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
      await withCacheStores(indexedDb, "readwrite", (records, sidecars) => {
        for (const id of ids) {
          records.delete(id);
          sidecars.delete(id);
        }
      });
    },
    async clear() {
      await withCacheStores(indexedDb, "readwrite", (records, sidecars) => {
        records.clear();
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
  requests: (records: IDBObjectStore, metadata: IDBObjectStore) => void,
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
      const records = request.result.objectStoreNames.contains(objectStoreName)
        ? transaction.objectStore(objectStoreName)
        : request.result.createObjectStore(objectStoreName, { keyPath: "id" });
      const metadata = request.result.objectStoreNames.contains(
        metadataStoreName,
      )
        ? transaction.objectStore(metadataStoreName)
        : request.result.createObjectStore(metadataStoreName, { keyPath: "id" });
      if (event.oldVersion < 2) migrateLegacyRecords(records, metadata);
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
  records: IDBObjectStore,
  metadata: IDBObjectStore,
): void {
  const cursorRequest = records.openCursor();
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
): BrowserRemoteMetadataCacheMetadataRecord | undefined {
  try {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      value.format !== recordFormat ||
      value.version !== recordVersion ||
      !isCacheKey(value.key) ||
      cacheRecordId(value.key) !== value.id ||
      typeof value.payload !== "string"
    ) {
      return undefined;
    }
    const byteLength = payloadByteLength(value.payload);
    assertPayloadSize(
      byteLength,
      defaultBrowserRemoteMetadataCacheLimits.maxEntryBytes,
    );
    decodePayload(
      JSON.parse(value.payload) as unknown,
      defaultBrowserRemoteMetadataCacheLimits,
    );
    // Version-1 records predate access tracking. Zero makes them the oldest
    // candidates without inventing a last-used time.
    return cacheMetadata(value.id, byteLength, 0);
  } catch {
    return undefined;
  }
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
