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
  type RosterResourceBudgetOverride,
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
  readonly maxHistoryEntries: number;
}

export const defaultLocalRosterDraftLimits: LocalRosterDraftLimits = {
  maxFiles: 256,
  maxTotalFileBytes: 256 * 1024 * 1024,
  maxRosterNodes: 50_000,
  maxRosterDepth: 256,
  maxTextLength: 4_096,
  maxDefinitionKeyLength: 65_536,
  maxHistoryEntries: 20,
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
/**
 * The undo history a draft carries across a reload.
 *
 * Deliberately shallower than the in-memory history, which stays at 100. A
 * roster snapshot is small on its own — 34 KB for a 99-selection list,
 * measured against the pinned corpus — but a store rewrites whole records, so
 * persisting all 100 would put 3.2 MB on every autosave and undo the write
 * bound the previous checkpoint established. Twenty entries, further capped by
 * a byte budget in the browser store, keeps a reload-surviving history at a few
 * hundred KB.
 */
export interface LocalRosterDraftHistory {
  /** Oldest first. The present roster is `roster`, not the end of this list. */
  readonly past: readonly Roster[];
  /** Nearest first, so `future[0]` is what one redo restores. */
  readonly future: readonly Roster[];
}

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
  readonly history?: LocalRosterDraftHistory;
}

export interface CreateLocalRosterDraftInput {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly catalogueKey: string;
  readonly import: LocalRosterDraftImport;
  readonly roster: Roster;
  readonly history?: LocalRosterDraftHistory;
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

/** What a copy must be given, because it must not inherit it. */
export interface DuplicateLocalRosterDraftInput {
  /** The copy's own draft key. Never the source's. */
  readonly id: string;
  /**
   * The copy's roster identity.
   *
   * A fresh one is required rather than optional. The recovery slot is cleared
   * by roster id — `clear(rosterId)` deletes the slot only when the stored
   * roster's id matches — so two drafts sharing a roster id would let a save of
   * one discard an unsaved recovery offer belonging to the other.
   */
  readonly rosterId: Roster["id"];
  /** The copy's roster name, which is also its only label on the shelf. */
  readonly name: string;
  /** Both timestamps: a copy is new, however old its source is. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Copies a stored draft into an independent one.
 *
 * **The import is carried over by reference, batch id included, and that is the
 * point.** Batch bytes are stored once under their own record and shared by
 * every draft of that batch, so a copy that keeps the source's `batchId` costs
 * one small record instead of a second catalogue closure — 8.2 MB for a single
 * faction. The store's `delete` already reclaims a batch only when no draft
 * still references it, so sharing stays correct when either copy goes.
 *
 * **Occurrence ids are kept verbatim.** `decodeLocalRosterDraft` builds its
 * `forceIds`/`selectionIds` sets per call, so uniqueness is scoped to one
 * draft and two drafts may legitimately use the same occurrence ids. Minting
 * fresh ones would mean walking and rewriting the whole tree to buy nothing;
 * `duplicateRosterForce` mints only because it inserts beside its source
 * *within one roster*, where collision is real.
 *
 * **History is deliberately dropped.** Undo steps are stored per draft under
 * `history:<draftId>`, and inheriting them would let a copy be undone back
 * through edits that were never made to it.
 *
 * The result is validated like any other draft, so a source that has become
 * invalid cannot be laundered into a valid copy. Inherits
 * `decodeLocalRosterDraft`'s whole-closure byte copy.
 */
export function duplicateLocalRosterDraft(
  source: LocalRosterDraft,
  input: DuplicateLocalRosterDraftInput,
  limits?: Partial<LocalRosterDraftLimits>,
): Result<LocalRosterDraft> {
  return createLocalRosterDraft(
    {
      id: input.id,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      catalogueKey: source.catalogueKey,
      import: source.import,
      roster: { ...source.roster, id: input.rosterId, name: input.name },
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
    const history = decodeHistory(record.history, state);
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
      roster: decodeRoster(record.roster, ["roster"], state),
      ...(history === undefined ? {} : { history }),
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

function decodeRoster(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): Roster {
  const record = requiredRecord(value, path);
  const catalogue = requiredRecord(record.catalogue, [...path, "catalogue"]);
  const kind = requiredString(
    catalogue.kind,
    [...path, "catalogue", "kind"],
    state,
  );
  if (kind !== "catalogue") {
    invalid([...path, "catalogue", "kind"], "Roster catalogue kind is invalid.");
  }
  const forces = requiredArray(record.forces, [...path, "forces"]).map(
    (force, index) => decodeForce(force, [...path, "forces", String(index)], 1, state),
  );
  const resourceBudgetOverrides = decodeResourceBudgetOverrides(
    record.resourceBudgetOverrides, [...path, "resourceBudgetOverrides"], state,
  );
  const pairs = new Set<string>();
  const associations = record.associations === undefined ? undefined : requiredArray(record.associations, [...path, "associations"]).map((value, index) => {
    if (index >= 1000) invalid([...path, "associations"], "Too many roster assignments.");
    const at = [...path, "associations", String(index)];
    const edge = requiredRecord(value, at);
    const sourceId = requiredString(edge.sourceId, [...at, "sourceId"], state);
    const targetId = requiredString(edge.targetId, [...at, "targetId"], state);
    const definitionKey = requiredString(edge.definitionKey, [...at, "definitionKey"], state);
    const pair = JSON.stringify([sourceId, definitionKey]);
    if (sourceId === targetId || !state.selectionIds.has(sourceId) || !state.selectionIds.has(targetId) || pairs.has(pair)) invalid(at, "Assignment endpoints or source/definition identity are invalid.");
    pairs.add(pair);
    return { sourceId: selectionOccurrenceId(sourceId), targetId: selectionOccurrenceId(targetId), definitionKey: rosterDefinitionKey(definitionKey) };
  });
  return {
    id: rosterId(requiredString(record.id, [...path, "id"], state)),
    name: requiredString(record.name, [...path, "name"], state),
    catalogue: {
      kind: "catalogue",
      ...decodeDefinitionBase(catalogue, [...path, "catalogue"], state),
    },
    forces,
    ...(associations?.length ? { associations } : {}),
    ...(resourceBudgetOverrides?.length ? { resourceBudgetOverrides } : {}),
  };
}

/**
 * The same check covers present and history rosters. Limit the array before
 * allocating decoded records; each snapshot has its own exact-ID namespace.
 * Unknown override fields are rejected because silently discarding a future
 * limit mode could change the meaning of a saved player's budget.
 */
function decodeResourceBudgetOverrides(
  value: unknown,
  path: readonly string[],
  state: DecodeState,
): readonly RosterResourceBudgetOverride[] | undefined {
  if (value === undefined) return undefined;
  const entries = requiredArray(value, path);
  if (entries.length > 1000) invalid(path, "Too many resource budget overrides.");
  const identities = new Set<string>();
  return Array.from(entries, (value, index) => {
    const at = [...path, String(index)];
    const entry = requiredRecord(value, at);
    if (Object.keys(entry).some((key) => key !== "typeId" && key !== "value")) {
      invalid(at, "Resource budget override fields are unsupported.");
    }
    const typeId = requiredString(entry.typeId, [...at, "typeId"], state);
    if (!typeId.trim().length || identities.has(typeId)) {
      invalid([...at, "typeId"], "Resource budget identity must be nonempty and unique.");
    }
    if (typeof entry.value !== "number" || !Number.isFinite(entry.value) ||
        (entry.value < 0 && entry.value !== -1)) {
      invalid([...at, "value"], "Resource budget must be finite and nonnegative or -1.");
    }
    identities.add(typeId);
    return { typeId: objectId(typeId), value: entry.value };
  });
}

/**
 * Decodes the undo snapshots, each in its own ID and node scope.
 *
 * They are separate rosters rather than parts of one, so the same occurrence ID
 * appearing in the present roster and in an undo snapshot is expected — it is
 * the same selection before an edit. Sharing the scope would reject every
 * history a draft could hold. Total work stays bounded because
 * `maxHistoryEntries` caps how many scopes there can be.
 */
function decodeHistory(
  value: unknown,
  state: DecodeState,
): LocalRosterDraftHistory | undefined {
  if (value === undefined) return undefined;
  const record = requiredRecord(value, ["history"]);
  const past = requiredArray(record.past, ["history", "past"]);
  const future = requiredArray(record.future, ["history", "future"]);
  enforceLimit(
    past.length + future.length <= state.limits.maxHistoryEntries,
    ["history"],
    "maxHistoryEntries",
    state.limits.maxHistoryEntries,
    past.length + future.length,
  );
  const decodeEntries = (
    entries: readonly unknown[],
    key: string,
  ): readonly Roster[] =>
    entries.map((entry, index) =>
      decodeRoster(
        entry,
        ["history", key, String(index)],
        historyEntryState(state),
      ),
    );
  return {
    past: decodeEntries(past, "past"),
    future: decodeEntries(future, "future"),
  };
}

function historyEntryState(state: DecodeState): DecodeState {
  return {
    limits: state.limits,
    forceIds: new Set(),
    selectionIds: new Set(),
    nodes: 0,
    fileBytes: state.fileBytes,
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
