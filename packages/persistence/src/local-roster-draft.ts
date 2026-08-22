/**
 * The stored shape of a roster draft, and the one validator both writing and
 * reading go through.
 *
 * `createLocalRosterDraft` builds a draft *by decoding it*, so a draft that
 * could not be loaded cannot be created either. There is deliberately no
 * second, laxer path for values this process just produced.
 *
 * Everything arriving here is untrusted, including the app's own earlier
 * output: a record in IndexedDB may have been written by a previous version
 * or edited by hand. Decoding therefore checks structure, timestamps,
 * occurrence-ID uniqueness, and every configured limit rather than trusting
 * the record's shape.
 *
 * Bytes are held as `Uint8Array`, which structured clone preserves and JSON
 * does not — a draft is an IndexedDB record, not a JSON document.
 */

import {
  failure,
  objectId,
  sourceId,
  success,
  type Diagnostic,
  type Result,
  type SourceKind,
} from "@rosterforge/foundation";
import type { LocalBattleScribeFile } from "@rosterforge/repository";
import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
  selectionOccurrenceId,
  type Roster,
  type RosterForce,
  type RosterForceDefinitionReference,
  type RosterSelection,
  type RosterSelectionDefinitionReference,
} from "@rosterforge/roster-model";

/**
 * Checked before anything else is read, so an unrecognised or wrong-version
 * record is refused after two field comparisons rather than after a full walk
 * of a roster that was never going to load.
 */
export const localRosterDraftFormat = "rosterforge/local-roster-draft";
export const localRosterDraftVersion = 1;

/**
 * Bounds on an untrusted draft record.
 *
 * `maxTotalFileBytes` is cumulative across the batch and tested as each
 * file is read, so decoding stops at the file that crosses the line rather
 * than after materialising them all. `maxDefinitionKeyLength` is far
 * larger than `maxTextLength` because a definition key is a
 * JSON-encoded source path, not a user-typed name.
 */
export interface LocalRosterDraftLimits {
  readonly maxFiles: number;
  readonly maxTotalFileBytes: number;
  readonly maxRosterNodes: number;
  readonly maxRosterDepth: number;
  readonly maxTextLength: number;
  readonly maxDefinitionKeyLength: number;
}

export const defaultLocalRosterDraftLimits: LocalRosterDraftLimits = {
  maxFiles: 256,
  maxTotalFileBytes: 256 * 1024 * 1024,
  maxRosterNodes: 50_000,
  maxRosterDepth: 256,
  maxTextLength: 4_096,
  maxDefinitionKeyLength: 65_536,
};

/**
 * The catalogue files a draft was built from, tagged with the batch that
 * produced them.
 *
 * Each file keeps its original `sourceId`, which is what lets a rebuilt
 * batch reproduce the same definition keys the roster references. In the
 * browser the bytes themselves are stored once per `batchId` and this
 * record carries empty placeholders; see `browser-drafts.ts`.
 */
export interface LocalRosterDraftImport {
  readonly batchId: string;
  readonly importedAt: string;
  readonly files: readonly LocalBattleScribeFile[];
}

/**
 * A draft as stored.
 *
 * `catalogueKey` names which catalogue of the batch the roster was built
 * against, so restoring can pick it out of the rebuilt library without
 * inspecting the roster tree.
 */
export interface LocalRosterDraft {
  readonly format: typeof localRosterDraftFormat;
  readonly version: typeof localRosterDraftVersion;
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly catalogueKey: string;
  readonly import: LocalRosterDraftImport;
  readonly roster: Roster;
}

export interface CreateLocalRosterDraftInput {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly catalogueKey: string;
  readonly import: LocalRosterDraftImport;
  readonly roster: Roster;
}

interface DecodeState {
  readonly limits: LocalRosterDraftLimits;
  readonly forceIds: Set<string>;
  readonly selectionIds: Set<string>;
  nodes: number;
  fileBytes: number;
}

class DraftDecodeError extends Error {
  constructor(
    readonly path: readonly string[],
    readonly reason: string,
    readonly limit?: string,
    readonly configured?: number,
    readonly observed?: number,
  ) {
    super(reason);
  }
}

/**
 * Stamps the current format and version onto the input and validates it
 * through `decodeLocalRosterDraft`, so construction and load cannot
 * disagree about what a valid draft is. Inherits that function's byte
 * copy.
 */
export function createLocalRosterDraft(
  input: CreateLocalRosterDraftInput,
  limits?: Partial<LocalRosterDraftLimits>,
): Result<LocalRosterDraft> {
  return decodeLocalRosterDraft(
    {
      format: localRosterDraftFormat,
      version: localRosterDraftVersion,
      ...input,
    },
    limits,
  );
}

/**
 * Validates an untrusted record and returns a draft.
 *
 * **It copies every file's bytes.** `decodeFile` runs `Uint8Array.from`
 * per file, so decoding allocates the whole catalogue closure again — the
 * handoff measured 8.2 MB for one Death Guard import, and the configured
 * ceiling is 256 MB. The browser store decodes on *every* save, so an
 * autosave pays that copy each time it settles even now that the write
 * itself is small.
 *
 * Nothing in the signature suggests any of that, and it was not written
 * down: autosave was built on top of this function and shipped an
 * 8 MB-per-write regression that took two checkpoints to find. Weigh the
 * copy before putting this on a hot path.
 *
 * Reports the *first* problem only — decoding throws internally and the
 * catch turns it into a single diagnostic:
 * `PERSISTENCE_DRAFT_LIMIT_EXCEEDED` when a configured limit was crossed,
 * `PERSISTENCE_DRAFT_INVALID` otherwise, both carrying the path to the
 * offending field. Anything that is not a decode failure is rethrown, so
 * a bug here does not read as a corrupt draft.
 */
export function decodeLocalRosterDraft(
  value: unknown,
  limitOverrides?: Partial<LocalRosterDraftLimits>,
): Result<LocalRosterDraft> {
  const limits = { ...defaultLocalRosterDraftLimits, ...limitOverrides };
  const state: DecodeState = {
    limits,
    forceIds: new Set(),
    selectionIds: new Set(),
    nodes: 0,
    fileBytes: 0,
  };
  try {
    const record = requiredRecord(value, []);
    const format = requiredString(record.format, ["format"], state);
    if (format !== localRosterDraftFormat) {
      return failure([
        diagnostic(
          "PERSISTENCE_DRAFT_FORMAT_UNSUPPORTED",
          `Local roster draft format ${format} is not supported.`,
          { format },
        ),
      ]);
    }
    const version = requiredInteger(record.version, ["version"]);
    if (version !== localRosterDraftVersion) {
      return failure([
        diagnostic(
          "PERSISTENCE_DRAFT_VERSION_UNSUPPORTED",
          `Local roster draft version ${version} is not supported.`,
          { version, supportedVersion: localRosterDraftVersion },
        ),
      ]);
    }

    const createdAt = requiredTimestamp(
      record.createdAt,
      ["createdAt"],
      state,
    );
    const updatedAt = requiredTimestamp(
      record.updatedAt,
      ["updatedAt"],
      state,
    );
    if (Date.parse(updatedAt) < Date.parse(createdAt)) {
      invalid(
        ["updatedAt"],
        "Local roster draft update timestamp precedes its creation timestamp.",
      );
    }
    const draft: LocalRosterDraft = {
      format: localRosterDraftFormat,
      version: localRosterDraftVersion,
      id: requiredString(record.id, ["id"], state),
      createdAt,
      updatedAt,
      catalogueKey: requiredString(
        record.catalogueKey,
        ["catalogueKey"],
        state,
      ),
      import: decodeImport(record.import, state),
      roster: decodeRoster(record.roster, state),
    };
    return success(draft);
  } catch (error: unknown) {
    if (!(error instanceof DraftDecodeError)) throw error;
    const isLimit = error.limit !== undefined;
    return failure([
      diagnostic(
        isLimit ? "PERSISTENCE_DRAFT_LIMIT_EXCEEDED" : "PERSISTENCE_DRAFT_INVALID",
        error.reason,
        {
          path: error.path,
          ...(error.limit === undefined ? {} : { limit: error.limit }),
          ...(error.configured === undefined
            ? {}
            : { configured: error.configured }),
          ...(error.observed === undefined
            ? {}
            : { observed: error.observed }),
        },
      ),
    ]);
  }
}

function decodeImport(value: unknown, state: DecodeState): LocalRosterDraftImport {
  const record = requiredRecord(value, ["import"]);
  const files = requiredArray(record.files, ["import", "files"]);
  enforceLimit(
    files.length <= state.limits.maxFiles,
    ["import", "files"],
    "maxFiles",
    state.limits.maxFiles,
    files.length,
  );
  return {
    batchId: requiredString(record.batchId, ["import", "batchId"], state),
    importedAt: requiredTimestamp(
      record.importedAt,
      ["import", "importedAt"],
      state,
    ),
    files: files.map((file, index) => decodeFile(file, index, state)),
  };
}

function decodeFile(
  value: unknown,
  index: number,
  state: DecodeState,
): LocalBattleScribeFile {
  const path = ["import", "files", String(index)];
  const record = requiredRecord(value, path);
  const bytes = requiredBytes(record.bytes, [...path, "bytes"]);
  state.fileBytes += bytes.byteLength;
  enforceLimit(
    state.fileBytes <= state.limits.maxTotalFileBytes,
    ["import", "files"],
    "maxTotalFileBytes",
    state.limits.maxTotalFileBytes,
    state.fileBytes,
  );
  const mediaType = optionalString(record.mediaType, [...path, "mediaType"], state);
  const origin = optionalString(record.origin, [...path, "origin"], state);
  const retainedSourceId = optionalString(
    record.sourceId,
    [...path, "sourceId"],
    state,
  );
  const sourceKind = optionalSourceKind(
    record.sourceKind,
    [...path, "sourceKind"],
    state,
  );
  return {
    filename: requiredString(record.filename, [...path, "filename"], state),
    bytes: Uint8Array.from(bytes),
    ...(mediaType === undefined ? {} : { mediaType }),
    ...(origin === undefined ? {} : { origin }),
    ...(retainedSourceId === undefined
      ? {}
      : { sourceId: sourceId(retainedSourceId) }),
    ...(sourceKind === undefined ? {} : { sourceKind }),
  };
}

function optionalSourceKind(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): SourceKind | undefined {
  const kind = optionalString(value, path, state);
  if (kind === undefined) return undefined;
  if (kind === "local-file" || kind === "download" || kind === "synthetic") {
    return kind;
  }
  invalid(path, "Imported file source kind is invalid.");
}

function decodeRoster(value: unknown, state: DecodeState): Roster {
  const record = requiredRecord(value, ["roster"]);
  const catalogue = requiredRecord(record.catalogue, ["roster", "catalogue"]);
  const kind = requiredString(
    catalogue.kind,
    ["roster", "catalogue", "kind"],
    state,
  );
  if (kind !== "catalogue") {
    invalid(["roster", "catalogue", "kind"], "Roster catalogue kind is invalid.");
  }
  return {
    id: rosterId(requiredString(record.id, ["roster", "id"], state)),
    name: requiredString(record.name, ["roster", "name"], state),
    catalogue: {
      kind: "catalogue",
      ...decodeDefinitionBase(catalogue, ["roster", "catalogue"], state),
    },
    forces: requiredArray(record.forces, ["roster", "forces"]).map(
      (force, index) =>
        decodeForce(force, ["roster", "forces", String(index)], 1, state),
    ),
  };
}

function decodeForce(
  value: unknown,
  path: readonly string[],
  depth: number,
  state: DecodeState,
): RosterForce {
  countNode(path, depth, state);
  const record = requiredRecord(value, path);
  const definition = decodeForceDefinition(
    record.definition,
    [...path, "definition"],
    state,
  );
  const id = requiredString(record.id, [...path, "id"], state);
  requireUniqueId(id, path, "force", state.forceIds);
  const name = optionalString(record.name, [...path, "name"], state);
  return {
    id: forceOccurrenceId(id),
    definition,
    ...(name === undefined ? {} : { name }),
    forces: requiredArray(record.forces, [...path, "forces"]).map(
      (force, index) =>
        decodeForce(force, [...path, "forces", String(index)], depth + 1, state),
    ),
    selections: requiredArray(record.selections, [...path, "selections"]).map(
      (selection, index) =>
        decodeSelection(
          selection,
          [...path, "selections", String(index)],
          depth + 1,
          state,
        ),
    ),
  };
}

function decodeSelection(
  value: unknown,
  path: readonly string[],
  depth: number,
  state: DecodeState,
): RosterSelection {
  countNode(path, depth, state);
  const record = requiredRecord(value, path);
  const id = requiredString(record.id, [...path, "id"], state);
  requireUniqueId(id, path, "selection", state.selectionIds);
  const name = optionalString(record.name, [...path, "name"], state);
  const amount = optionalPositiveFiniteNumber(record.amount, [
    ...path,
    "amount",
  ]);
  return {
    id: selectionOccurrenceId(id),
    definition: decodeSelectionDefinition(
      record.definition,
      [...path, "definition"],
      state,
    ),
    ...(name === undefined ? {} : { name }),
    ...(amount === undefined ? {} : { amount }),
    selections: requiredArray(record.selections, [...path, "selections"]).map(
      (selection, index) =>
        decodeSelection(
          selection,
          [...path, "selections", String(index)],
          depth + 1,
          state,
        ),
    ),
  };
}

function decodeForceDefinition(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): RosterForceDefinitionReference {
  const record = requiredRecord(value, path);
  const kind = requiredString(record.kind, [...path, "kind"], state);
  if (kind !== "forceEntry") {
    invalid([...path, "kind"], "Force definition kind is invalid.");
  }
  return { kind: "forceEntry", ...decodeDefinitionBase(record, path, state) };
}

function decodeSelectionDefinition(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): RosterSelectionDefinitionReference {
  const record = requiredRecord(value, path);
  const kind = requiredString(record.kind, [...path, "kind"], state);
  if (kind !== "selectionEntry" && kind !== "selectionEntryGroup") {
    invalid([...path, "kind"], "Selection definition kind is invalid.");
  }
  return { kind, ...decodeDefinitionBase(record, path, state) };
}

function decodeDefinitionBase(
  record: Record<string, unknown>,
  path: readonly string[],
  state: DecodeState,
) {
  const key = requiredString(
    record.key,
    [...path, "key"],
    state,
    state.limits.maxDefinitionKeyLength,
    "maxDefinitionKeyLength",
  );
  const sourceId = optionalString(record.sourceId, [...path, "sourceId"], state);
  return {
    key: rosterDefinitionKey(key),
    ...(sourceId === undefined ? {} : { sourceId: objectId(sourceId) }),
  };
}

function countNode(
  path: readonly string[],
  depth: number,
  state: DecodeState,
): void {
  enforceLimit(
    depth <= state.limits.maxRosterDepth,
    path,
    "maxRosterDepth",
    state.limits.maxRosterDepth,
    depth,
  );
  state.nodes += 1;
  enforceLimit(
    state.nodes <= state.limits.maxRosterNodes,
    path,
    "maxRosterNodes",
    state.limits.maxRosterNodes,
    state.nodes,
  );
}

function requireUniqueId(
  id: string,
  path: readonly string[],
  kind: "force" | "selection",
  ids: Set<string>,
): void {
  if (ids.has(id)) {
    invalid([...path, "id"], `Roster contains duplicate ${kind} ID ${id}.`);
  }
  ids.add(id);
}

function requiredRecord(
  value: unknown,
  path: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(path, "Expected an object.");
  }
  return value as Record<string, unknown>;
}

function requiredArray(
  value: unknown,
  path: readonly string[],
): readonly unknown[] {
  if (!Array.isArray(value)) invalid(path, "Expected an array.");
  return value;
}

function requiredString(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
  maxLength = state.limits.maxTextLength,
  limit = "maxTextLength",
): string {
  if (typeof value !== "string") invalid(path, "Expected a string.");
  enforceLimit(value.length <= maxLength, path, limit, maxLength, value.length);
  return value;
}

function optionalString(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): string | undefined {
  return value === undefined ? undefined : requiredString(value, path, state);
}

function requiredInteger(value: unknown, path: readonly string[]): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    invalid(path, "Expected a safe integer.");
  }
  return value;
}

function optionalPositiveFiniteNumber(
  value: unknown,
  path: readonly string[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    invalid(path, "Expected a positive finite number.");
  }
  return value;
}

function requiredTimestamp(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): string {
  const timestamp = requiredString(value, path, state);
  if (!Number.isFinite(Date.parse(timestamp))) {
    invalid(path, "Expected an ISO-compatible timestamp.");
  }
  return timestamp;
}

function requiredBytes(
  value: unknown,
  path: readonly string[],
): Uint8Array {
  if (!(value instanceof Uint8Array)) {
    invalid(path, "Expected a Uint8Array.");
  }
  return value;
}

function enforceLimit(
  condition: boolean,
  path: readonly string[],
  limit: string,
  configured: number,
  observed: number,
): void {
  if (!condition) {
    throw new DraftDecodeError(
      path,
      `Local roster draft exceeded ${limit}.`,
      limit,
      configured,
      observed,
    );
  }
}

function invalid(path: readonly string[], reason: string): never {
  throw new DraftDecodeError(path, reason);
}

function diagnostic(
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts: ["persistence"],
    details,
  };
}
