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
  readonly maxFiles: number;
  readonly maxDocuments: number;
  readonly maxDiagnostics: number;
  readonly maxCatalogueLinks: number;
}

export interface BrowserRemoteMetadataCacheRecordBackend {
  readonly get: (id: string) => Promise<unknown>;
  readonly put: (record: unknown) => Promise<void>;
}

const recordFormat = "rosterforge.pinned-repository-metadata-cache";
const recordVersion = 1;
const databaseName = "rosterforge-pinned-repository-metadata-cache";
const databaseVersion = 1;
const objectStoreName = "pinned-repository-metadata";
const gitShaPattern = /^[0-9a-f]{40}$/u;

export const defaultBrowserRemoteMetadataCacheLimits: BrowserRemoteMetadataCacheLimits =
  {
    maxEntryBytes: 32 * 1024 * 1024,
    maxFiles: 4096,
    maxDocuments: 4096,
    maxDiagnostics: 100_000,
    maxCatalogueLinks: 65_536,
  };

export function createBrowserRemoteCatalogueMetadataCache(
  backend: BrowserRemoteMetadataCacheRecordBackend,
  limits: Partial<BrowserRemoteMetadataCacheLimits> = {},
): RemoteCatalogueMetadataCache {
  const resolvedLimits = {
    ...defaultBrowserRemoteMetadataCacheLimits,
    ...limits,
  };
  for (const [name, value] of Object.entries(resolvedLimits)) {
    assertPositiveInteger(value, name);
  }

  return {
    async read(key) {
      const id = cacheRecordId(key);
      const record = await backend.get(id);
      if (record === undefined) return undefined;
      return decodeCacheRecord(record, id, key, resolvedLimits);
    },

    async write(key, entry) {
      const payload = JSON.stringify(entry);
      assertPayloadSize(payload, resolvedLimits.maxEntryBytes);
      decodePayload(JSON.parse(payload) as unknown, resolvedLimits);
      await backend.put({
        id: cacheRecordId(key),
        format: recordFormat,
        version: recordVersion,
        key: { ...key },
        payload,
      });
    },
  };
}

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
): RemoteCatalogueMetadataCacheEntry {
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
  assertPayloadSize(value.payload, limits.maxEntryBytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(value.payload) as unknown;
  } catch {
    throw invalidRecord("does not contain valid JSON");
  }
  return decodePayload(parsed, limits);
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

  const counts = { diagnostics: 0, catalogueLinks: 0 };
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
  counts: { diagnostics: number; catalogueLinks: number },
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
  counts: { diagnostics: number; catalogueLinks: number },
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
    !Array.isArray(value.catalogueLinks)
  ) {
    throw invalidPayload("contains an invalid document summary");
  }
  counts.catalogueLinks += value.catalogueLinks.length;
  if (counts.catalogueLinks > limits.maxCatalogueLinks) {
    throw invalidPayload("contains too many catalogue links");
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

function assertPayloadSize(payload: string, maxEntryBytes: number): void {
  const actualBytes = new TextEncoder().encode(payload).byteLength;
  if (actualBytes > maxEntryBytes) {
    throw new Error(
      `The metadata cache payload exceeds the configured byte limit (${actualBytes} > ${maxEntryBytes}).`,
    );
  }
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
