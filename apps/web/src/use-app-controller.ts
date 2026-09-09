import { useEffect, useMemo, useRef, useState } from "react";

import type { BattleScribeForceDefinition } from "@rosterforge/data-graph";
import type { Roster } from "@rosterforge/roster-model";
import { success, type Diagnostic, type Result } from "@rosterforge/foundation";
import {
  createLocalRosterDraft,
  defaultLocalRosterDraftLimits,
  type LocalRosterDraft,
  type LocalRosterDraftHistory,
} from "@rosterforge/persistence";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
  type SelectionOccurrenceId,
  type RosterDefinitionKey,
} from "@rosterforge/roster-model";

import {
  prepareLocalCatalogueLibrary,
  type LocalCatalogueChoice,
  type LocalCatalogueLibrary,
} from "./catalogue-library.js";
import {
  readBrowserBattleScribeFiles,
  type BrowserFileSource,
} from "./browser-files.js";
import {
  createIndexedDbLocalRosterDraftStore,
  recoveryDraftId,
  type LocalRosterDraftStore,
  type LocalRosterDraftSummary,
} from "./browser-drafts.js";
import { createRecoverySlot } from "./recovery-slot.js";
import {
  commitBoundedHistory,
  createBoundedHistory,
  redoBoundedHistory,
  undoBoundedHistory,
  type BoundedHistory,
} from "./history.js";
import {
  addLocalRosterChildSelection,
  addLocalRosterRootSelection,
  chooseLocalRosterChildGroupEntry,
  createLocalRosterSession,
  duplicateLocalRosterSelection,
  removeLocalRosterSelection,
  restoreLocalRosterSession,
  restoreLocalRosterSessions,
  setLocalRosterSelectionAmount,
  setLocalRosterSelectionName,
  setLocalRosterAssociation,
  type LocalRosterChildChoiceGroup,
  type LocalRosterRootChoice,
  type LocalRosterSession,
} from "./roster-session.js";

type PrepareLibrary = typeof prepareLocalCatalogueLibrary;

export interface RosterForgeAppControllerOptions {
  readonly prepareLibrary?: PrepareLibrary;
  readonly draftStore?: LocalRosterDraftStore;
  readonly createBatchId?: () => string;
  readonly createDraftId?: () => string;
  readonly createEntityId?: (
    kind: "roster" | "force" | "selection",
  ) => string;
  readonly now?: () => string;
  /** Debounce before an active draft is rewritten. See {@link defaultAutosaveDelayMs}. */
  readonly autosaveDelayMs?: number;
}

export type LoadState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly fileCount: number }
  | {
      readonly kind: "loaded";
      readonly library: LocalCatalogueLibrary;
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly kind: "failed";
      readonly message: string;
      readonly diagnostics: readonly Diagnostic[];
    };

export type DraftShelfState =
  | {
      readonly kind: "loading";
      readonly drafts: readonly LocalRosterDraftSummary[];
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly kind: "ready";
      readonly drafts: readonly LocalRosterDraftSummary[];
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly kind: "failed";
      readonly drafts: readonly LocalRosterDraftSummary[];
      readonly diagnostics: readonly Diagnostic[];
    };

/**
 * How long the roster must sit unchanged before an active draft is rewritten.
 *
 * Long enough that a burst of edits writes once, short enough that a closed tab
 * loses seconds rather than minutes.
 *
 * It is deliberately not shorter. A draft record embeds its catalogue source
 * bytes — 8.2 MB for one faction, and the app permits importing far more — and
 * every write rewrites all of them. Until drafts reference their bytes instead
 * of carrying them, this delay is what bounds the churn.
 */
export const defaultAutosaveDelayMs = 5_000;

/** What the recovery prompt needs to describe an unsaved roster. */
export interface RecoverableRoster {
  readonly rosterName: string;
  readonly updatedAt: string;
}

export interface ActiveDraft {
  readonly id: string;
  readonly createdAt: string;
}

export interface DraftActionState {
  readonly kind: "idle" | "saving" | "loading" | "deleting";
  readonly targetId?: string;
  readonly message?: string;
  readonly diagnostics: readonly Diagnostic[];
  /** A success message describes this immutable snapshot, not later edits. */
  readonly savedRoster?: Roster;
}

const defaultDraftStore = createIndexedDbLocalRosterDraftStore();

export function useRosterForgeAppController({
  prepareLibrary = prepareLocalCatalogueLibrary,
  draftStore = defaultDraftStore,
  createBatchId = defaultBatchId,
  createDraftId = defaultDraftId,
  createEntityId = defaultEntityId,
  now = () => new Date().toISOString(),
  autosaveDelayMs = defaultAutosaveDelayMs,
}: RosterForgeAppControllerOptions) {
  const importSequence = useRef(0);
  // Saves belong to a session generation, not merely to whichever roster is
  // current when storage finishes. Edits keep the generation; navigation does not.
  const savingSequence = useRef<number | undefined>(undefined);
  const recoveryEpoch = useRef(0);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleRecoveryRef = useRef<() => void>(() => undefined);
  useEffect(() => () => { ++importSequence.current; }, []);
  const draftListSequence = useRef(0);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "idle" });
  const [draftShelf, setDraftShelf] = useState<DraftShelfState>({
    kind: "loading",
    drafts: [],
    diagnostics: [],
  });
  const [draftAction, setDraftAction] = useState<DraftActionState>({
    kind: "idle",
    diagnostics: [],
  });
  const [activeDraft, setActiveDraft] = useState<ActiveDraft>();
  /**
   * The exact roster last written to or read from a named draft (not recovery).
   *
   * Rosters are immutable and every command returns a new one, so identity is
   * an exact test for "has anything changed since it was persisted" — no
   * comparison, no false positives from re-renders.
   */
  const [persistedRoster, setPersistedRoster] = useState<Roster>();
  /**
   * A roster found in the recovery slot at startup, offered rather than
   * restored: silently reopening stale work is its own kind of surprise.
   */
  const [recoverableRoster, setRecoverableRoster] =
    useState<RecoverableRoster>();
  /**
   * The roster whose last automatic save failed.
   *
   * Autosave re-arms on the roster identity and on `draftAction` returning to
   * idle, so a failure would otherwise retry the same bytes every few seconds
   * for the rest of the session. That is worst in the case most likely to cause
   * it: a browser out of room, where retrying writes megabytes it cannot take.
   * The next edit produces a new roster and is tried normally, and the save
   * button always is, because that is the user asking.
   */
  const [autosaveBlockedRoster, setAutosaveBlockedRoster] = useState<Roster>();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [rosterHistory, setRosterHistory] =
    useState<BoundedHistory<LocalRosterSession>>();
  const [rosterDiagnostics, setRosterDiagnostics] = useState<
    readonly Diagnostic[]
  >([]);
  const rosterSession = rosterHistory?.present;

  useEffect(() => {
    let cancelled = false;
    const sequence = ++draftListSequence.current;
    void draftStore.list().then((result) => {
      if (cancelled || sequence !== draftListSequence.current) return;
      setDraftShelf(
        result.ok
          ? {
              kind: "ready",
              drafts: result.value,
              diagnostics: result.diagnostics,
            }
          : {
              kind: "failed",
              drafts: [],
              diagnostics: result.diagnostics,
            },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [draftStore]);

  const selectedCatalogue = useMemo(() => {
    if (loadState.kind !== "loaded") return undefined;
    return loadState.library.selectableCatalogues.find(
      (catalogue) => catalogue.key === selectedKey,
    );
  }, [loadState, selectedKey]);

  async function importFiles(files: readonly BrowserFileSource[]) {
    if (files.length === 0) return;
    const sequence = ++importSequence.current;
    setActiveDraft(undefined);
    setDraftAction({ kind: "idle", diagnostics: [] });
    setRosterHistory(undefined);
    setPersistedRoster(undefined);
    setRosterDiagnostics([]);
    setLoadState({ kind: "loading", fileCount: files.length });

    try {
      const localFiles = await readBrowserBattleScribeFiles(files);
      const result = await prepareLibrary(localFiles, {
        import: {
          batchId: createBatchId(),
          importedAt: now(),
        },
      });
      if (sequence !== importSequence.current) return;

      if (!result.ok) {
        setSelectedKey(undefined);
        setLoadState({
          kind: "failed",
          message: "The selected batch could not be imported.",
          diagnostics: result.diagnostics,
        });
        return;
      }

      setSelectedKey(result.value.selectableCatalogues[0]?.key);
      setLoadState({
        kind: "loaded",
        library: result.value,
        diagnostics: result.diagnostics,
      });
    } catch (error: unknown) {
      if (sequence !== importSequence.current) return;
      setSelectedKey(undefined);
      setLoadState({
        kind: "failed",
        message: fileReadMessage(error),
        diagnostics: [],
      });
    }
  }

  function openCatalogueLibrary(
    library: LocalCatalogueLibrary,
    diagnostics: readonly Diagnostic[],
    catalogueKey: string,
  ) {
    ++importSequence.current;
    setActiveDraft(undefined);
    setDraftAction({ kind: "idle", diagnostics: [] });
    setRosterHistory(undefined);
    setPersistedRoster(undefined);
    setRosterDiagnostics([]);
    setSelectedKey(catalogueKey);
    setLoadState({
      kind: "loaded",
      library,
      diagnostics,
    });
  }

  function selectCatalogue(key: string) {
    ++importSequence.current;
    setDraftAction({ kind: "idle", diagnostics: [] });
    setSelectedKey(key);
    setActiveDraft(undefined);
    setRosterHistory(undefined);
    setPersistedRoster(undefined);
    setRosterDiagnostics([]);
  }

  function createRoster(
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) {
    const result = createLocalRosterSession(catalogue, forceDefinition, {
      rosterId: rosterId(createEntityId("roster")),
      forceId: forceOccurrenceId(createEntityId("force")),
      name,
      createSelectionId: () =>
        selectionOccurrenceId(createEntityId("selection")),
    });
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) {
      ++importSequence.current;
      setDraftAction({ kind: "idle", diagnostics: [] });
      setActiveDraft(undefined);
      setRosterHistory(createBoundedHistory(result.value));
      setPersistedRoster(undefined);
    }
  }

  function clearRoster() {
    ++importSequence.current;
    setDraftAction({ kind: "idle", diagnostics: [] });
    setActiveDraft(undefined);
    setRosterHistory(undefined);
    setPersistedRoster(undefined);
    setRosterDiagnostics([]);
  }

  function commitRosterSession(session: LocalRosterSession) {
    setRosterHistory((history) =>
      history === undefined
        ? createBoundedHistory(session)
        : commitBoundedHistory(history, session),
    );
  }

  function undoRosterEdit() {
    setRosterHistory((history) =>
      history === undefined ? history : undoBoundedHistory(history),
    );
    setRosterDiagnostics([]);
  }

  function redoRosterEdit() {
    setRosterHistory((history) =>
      history === undefined ? history : redoBoundedHistory(history),
    );
    setRosterDiagnostics([]);
  }

  function addRootSelection(
    choice: LocalRosterRootChoice,
  ): SelectionOccurrenceId | undefined {
    if (rosterSession === undefined) return undefined;
    const newSelectionId = selectionOccurrenceId(createEntityId("selection"));
    const result = addLocalRosterRootSelection(rosterSession, choice, {
      selectionId: newSelectionId,
      createSelectionId: () =>
        selectionOccurrenceId(createEntityId("selection")),
    });
    setRosterDiagnostics(result.diagnostics);
    if (!result.ok) return undefined;
    commitRosterSession(result.value);
    return newSelectionId;
  }

  function removeSelection(id: SelectionOccurrenceId) {
    if (rosterSession === undefined) return;
    const result = removeLocalRosterSelection(rosterSession, id, {
      createSelectionId: () =>
        selectionOccurrenceId(createEntityId("selection")),
    });
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
  }

  function duplicateSelection(
    id: SelectionOccurrenceId,
  ): SelectionOccurrenceId | undefined {
    if (rosterSession === undefined) return undefined;
    const duplicatedRootId = selectionOccurrenceId(
      createEntityId("selection"),
    );
    const result = duplicateLocalRosterSelection(
      rosterSession,
      id,
      (sourceId) =>
        sourceId === id
          ? duplicatedRootId
          : selectionOccurrenceId(createEntityId("selection")),
    );
    setRosterDiagnostics(result.diagnostics);
    if (!result.ok) return undefined;
    commitRosterSession(result.value);
    return duplicatedRootId;
  }

  function addChildSelection(
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    group?: LocalRosterChildChoiceGroup,
  ) {
    if (rosterSession === undefined) return;
    const input = {
      selectionId: selectionOccurrenceId(createEntityId("selection")),
      createSelectionId: () =>
        selectionOccurrenceId(createEntityId("selection")),
    };
    const result =
      group === undefined
        ? addLocalRosterChildSelection(rosterSession, parentId, choice, input)
        : chooseLocalRosterChildGroupEntry(
            rosterSession,
            parentId,
            group.group,
            choice,
            input,
          );
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
  }

  function renameSelection(
    selectionId: SelectionOccurrenceId,
    name: string | undefined,
  ) {
    if (rosterSession === undefined) return;
    const result = setLocalRosterSelectionName(
      rosterSession,
      selectionId,
      name,
    );
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
  }

  function setSelectionAmount(
    selectionId: SelectionOccurrenceId,
    amount: number | undefined,
  ) {
    if (rosterSession === undefined) return;
    const result = setLocalRosterSelectionAmount(
      rosterSession,
      selectionId,
      amount,
      {
        createSelectionId: () =>
          selectionOccurrenceId(createEntityId("selection")),
      },
    );
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
  }

  function setAssociation(sourceId: SelectionOccurrenceId, key: RosterDefinitionKey, targetId: SelectionOccurrenceId | undefined) {
    if (!rosterSession) return;
    const result = setLocalRosterAssociation(rosterSession, sourceId, key, targetId);
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await draftStore.load(recoveryDraftId);
      if (cancelled || !found.ok || found.value === undefined) return;
      setRecoverableRoster({
        rosterName: found.value.roster.name,
        updatedAt: found.value.updatedAt,
      });
    })();
    return () => {
      cancelled = true;
    };
    // The slot is read once per session; later writes are this session's own.
  }, [draftStore]);

  async function discardRecoverableRoster() {
    const sequence = importSequence.current;
    const epoch = ++recoveryEpoch.current;
    const cleared = await recoverySlot.clear();
    // A later save/discard or session transition owns the recovery decision now.
    if (sequence !== importSequence.current || epoch !== recoveryEpoch.current) return;
    if (cleared.ok) setRecoverableRoster(undefined);
    else {
      setDraftAction({ kind: "idle", message: "Recovery could not be discarded.", diagnostics: cleared.diagnostics });
      // Bind one ordinary debounce to this decision now. A React state signal
      // could render after a later successful clear in the same batch and arm
      // under its epoch, resurrecting deliberately discarded work. The shared
      // timer instead retains this epoch and reads the live roster when due.
      scheduleRecoveryRef.current();
    }
  }

  async function recoverUnsavedRoster() {
    await loadRosterDraft(recoveryDraftId);
  }

  async function refreshDraftShelf() {
    const sequence = ++draftListSequence.current;
    const result = await draftStore.list();
    if (sequence !== draftListSequence.current) return result.diagnostics;
    setDraftShelf(
      result.ok
        ? {
            kind: "ready",
            drafts: result.value,
            diagnostics: result.diagnostics,
          }
        : {
            kind: "failed",
            drafts: [],
            diagnostics: result.diagnostics,
          },
    );
    return result.diagnostics;
  }

  /**
   * The undo history in the shape a draft stores: rosters, not sessions.
   *
   * A `LocalRosterSession` also holds catalogue projections and a choice index,
   * none of which are serialisable and all of which are rebuilt on restore. The
   * roster is the only part worth keeping. Bound the combined past/future count
   * before strict draft validation; the store's later byte trimming cannot
   * rescue an envelope the decoder already rejected. Spend the shared allowance
   * on the nearest past entries before future entries; past stays oldest-first,
   * matching the store's policy, without changing the live 100-step history.
   */
  function draftHistory(
    history: BoundedHistory<LocalRosterSession>,
  ): LocalRosterDraftHistory {
    const limit = defaultLocalRosterDraftLimits.maxHistoryEntries;
    const past = history.past.slice(-limit).map(({ roster }) => roster);
    return {
      past,
      future: history.future
        .slice(0, limit - past.length)
        .map(({ roster }) => roster),
    };
  }

  async function saveRosterDraft() {
    if (loadState.kind !== "loaded" || rosterSession === undefined) return;
    const sequence = importSequence.current;
    if (savingSequence.current === sequence) return;
    const updatedAt = now();
    const createdAt = activeDraft?.createdAt ?? updatedAt;
    const draft = createLocalRosterDraft({
      id: activeDraft?.id ?? createDraftId(),
      createdAt,
      updatedAt,
      catalogueKey: rosterSession.catalogue.key,
      import: draftImport(loadState.library),
      roster: rosterSession.roster,
      ...(rosterHistory === undefined
        ? {}
        : { history: draftHistory(rosterHistory) }),
    });
    if (!draft.ok) {
      setDraftAction({
        kind: "idle",
        message: "This roster could not be prepared for local saving.",
        diagnostics: draft.diagnostics,
      });
      return;
    }

    setDraftAction({
      kind: "saving",
      targetId: draft.value.id,
      diagnostics: [],
    });
    savingSequence.current = sequence;
    const saved = await draftStore.save(draft.value);
    if (savingSequence.current === sequence) savingSequence.current = undefined;
    if (sequence !== importSequence.current) return;
    if (!saved.ok) {
      setAutosaveBlockedRoster(rosterSession.roster);
      setDraftAction({
        kind: "idle",
        message: "The roster draft was not saved.",
        diagnostics: saved.diagnostics,
      });
      return;
    }

    setAutosaveBlockedRoster(undefined);
    setActiveDraft({ id: draft.value.id, createdAt });
    setPersistedRoster(rosterSession.roster);
    // Only a completed named save replaces recovery. Opening a draft or
    // restoring recovery is not a write. FIFO ordering prevents an older slot
    // write from resurrecting recovery after this successful save.
    ++recoveryEpoch.current;
    const cleared = await recoverySlot.clear(rosterSession.roster.id);
    if (sequence !== importSequence.current) return;
    if (cleared.ok) {
      const remaining = await draftStore.load(recoveryDraftId);
      if (sequence !== importSequence.current) return;
      if (remaining.ok && remaining.value === undefined) setRecoverableRoster(undefined);
    }
    const listDiagnostics = await refreshDraftShelf();
    if (sequence !== importSequence.current) return;
    setDraftAction({
      kind: "idle",
      message: `Saved ${draft.value.roster.name} in this browser.`,
      savedRoster: rosterSession.roster,
      diagnostics: [...saved.diagnostics, ...cleared.diagnostics, ...listDiagnostics],
    });
  }

  async function loadRosterDraft(id: string) {
    const sequence = ++importSequence.current;
    setDraftAction({ kind: "loading", targetId: id, diagnostics: [] });
    const loaded = await draftStore.load(id);
    if (sequence !== importSequence.current) return;
    if (!loaded.ok) {
      setDraftAction({
        kind: "idle",
        message: "The saved roster draft could not be opened.",
        diagnostics: loaded.diagnostics,
      });
      return;
    }
    if (loaded.value === undefined) {
      setDraftAction({
        kind: "idle",
        message: "That saved roster draft no longer exists.",
        diagnostics: [
          draftUiDiagnostic(
            "PERSISTENCE_DRAFT_NOT_FOUND",
            "The requested local roster draft was not found.",
            { draftId: id },
          ),
        ],
      });
      await refreshDraftShelf();
      return;
    }

    const draft = loaded.value;
    setActiveDraft(undefined);
    setRosterHistory(undefined);
    setPersistedRoster(undefined);
    setRosterDiagnostics([]);
    setLoadState({ kind: "loading", fileCount: draft.import.files.length });

    try {
      const prepared = await prepareLibrary(draft.import.files, {
        import: {
          batchId: draft.import.batchId,
          importedAt: draft.import.importedAt,
        },
      });
      if (sequence !== importSequence.current) return;
      if (!prepared.ok) {
        const diagnostics = [...loaded.diagnostics, ...prepared.diagnostics];
        setSelectedKey(undefined);
        setLoadState({
          kind: "failed",
          message: "The saved draft files could not be imported.",
          diagnostics,
        });
        setDraftAction({
          kind: "idle",
          message: "The saved roster draft could not be opened.",
          diagnostics,
        });
        return;
      }

      const catalogue = prepared.value.selectableCatalogues.find(
        ({ key }) => key === draft.catalogueKey,
      );
      const libraryDiagnostics = [
        ...loaded.diagnostics,
        ...prepared.diagnostics,
      ];
      setLoadState({
        kind: "loaded",
        library: prepared.value,
        diagnostics: libraryDiagnostics,
      });
      if (catalogue === undefined) {
        const diagnostic = draftUiDiagnostic(
          "WEB_ROSTER_DRAFT_CATALOGUE_UNAVAILABLE",
          "The saved catalogue is not available after rebuilding the imported batch.",
          { draftId: draft.id, catalogueKey: draft.catalogueKey },
        );
        setSelectedKey(prepared.value.selectableCatalogues[0]?.key);
        setRosterDiagnostics([diagnostic]);
        setDraftAction({
          kind: "idle",
          message: "The saved roster draft could not be restored.",
          diagnostics: [diagnostic],
        });
        return;
      }

      setSelectedKey(catalogue.key);
      const restored = restoreDraftSessions(catalogue, draft);
      setRosterDiagnostics(restored.diagnostics);
      if (!restored.ok) {
        setDraftAction({
          kind: "idle",
          message: "The saved roster draft could not be restored.",
          diagnostics: restored.diagnostics,
        });
        return;
      }

      setRosterHistory(restored.value);
      const recovering = id === recoveryDraftId;
      // The reserved recovery slot is a safety copy, never a named draft or
      // evidence of a user save. Keep it durable until save/discard succeeds.
      setActiveDraft(recovering ? undefined : { id: draft.id, createdAt: draft.createdAt });
      setPersistedRoster(recovering ? undefined : restored.value.present.roster);
      if (recovering) setRecoverableRoster(undefined);
      setDraftAction({
        kind: "idle",
        message: recovering
          ? `Recovered ${draft.roster.name}. Save a draft to keep it.`
          : `Opened ${draft.roster.name}.`,
        diagnostics: loaded.diagnostics,
      });
    } catch (error: unknown) {
      if (sequence !== importSequence.current) return;
      const diagnostic = draftUiDiagnostic(
        "PERSISTENCE_DRAFT_RESTORE_FAILED",
        "An unexpected error stopped the saved roster draft from opening.",
        {
          draftId: draft.id,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
      setSelectedKey(undefined);
      setLoadState({
        kind: "failed",
        message: "The saved draft files could not be imported.",
        diagnostics: [diagnostic],
      });
      setDraftAction({
        kind: "idle",
        message: "The saved roster draft could not be opened.",
        diagnostics: [diagnostic],
      });
    }
  }

  async function deleteRosterDraft(id: string) {
    const sequence = importSequence.current;
    setDraftAction({ kind: "deleting", targetId: id, diagnostics: [] });
    const deleted = await draftStore.delete(id);
    if (sequence !== importSequence.current) return;
    if (!deleted.ok) {
      setDraftAction({
        kind: "idle",
        message: "The saved roster draft was not deleted.",
        diagnostics: deleted.diagnostics,
      });
      return;
    }
    if (activeDraft?.id === id) {
      setActiveDraft(undefined);
      setPersistedRoster(undefined);
    }
    const listDiagnostics = await refreshDraftShelf();
    if (sequence !== importSequence.current) return;
    setDraftAction({
      kind: "idle",
      message: "Deleted the saved roster draft.",
      diagnostics: [...deleted.diagnostics, ...listDiagnostics],
    });
  }

  // Once a roster has an active draft the user has already asked for it to be
  // kept, so keeping it current needs no further prompting. This deliberately
  // does not create a draft for a roster that has never been saved: that would
  // fill the shelf with entries nobody asked for, at roughly 8 MB of catalogue
  // bytes each. The recovery slot covers that case instead.
  const saveRef = useRef(saveRosterDraft);
  saveRef.current = saveRosterDraft;
  const pendingRoster = rosterSession?.roster;
  useEffect(() => {
    if (activeDraft === undefined) return undefined;
    if (pendingRoster === undefined || pendingRoster === persistedRoster) {
      return undefined;
    }
    if (pendingRoster === autosaveBlockedRoster) return undefined;
    if (draftAction.kind !== "idle") return undefined;
    // Depending on the roster identity restarts the timer on every edit, so a
    // burst of changes writes once when it settles.
    const timer = setTimeout(() => {
      void saveRef.current();
    }, autosaveDelayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [
    activeDraft,
    autosaveBlockedRoster,
    autosaveDelayMs,
    draftAction.kind,
    pendingRoster,
    persistedRoster,
  ]);

  // The recovery slot covers the case the draft autosave cannot: a roster the
  // user has never saved. One slot, overwritten, so its cost stays at one
  // catalogue closure however many rosters get tried.
  const recoverySlot = useMemo(() => createRecoverySlot(draftStore), [
    draftStore,
  ]);
  const recoveryRef = useRef<() => Promise<void>>(async () => undefined);
  recoveryRef.current = async () => {
    if (loadState.kind !== "loaded" || rosterSession === undefined) return;
    // The debounce timer can outlive the render that persisted the roster, so
    // the writer re-checks here rather than trusting the effect cleanup to have
    // cancelled it first.
    if (rosterSession.roster === persistedRoster) return;
    const stamp = now();
    const draft = createLocalRosterDraft({
      id: recoveryDraftId,
      createdAt: stamp,
      updatedAt: stamp,
      catalogueKey: rosterSession.catalogue.key,
      import: draftImport(loadState.library),
      roster: rosterSession.roster,
      ...(rosterHistory === undefined
        ? {}
        : { history: draftHistory(rosterHistory) }),
    });
    const sequence = importSequence.current;
    const written = draft.ok ? await recoverySlot.write(draft.value) : draft;
    if (!written.ok && sequence === importSequence.current) {
      setRosterDiagnostics(written.diagnostics);
    }
  };
  scheduleRecoveryRef.current = () => {
    clearTimeout(recoveryTimer.current);
    recoveryTimer.current = undefined;
    if (pendingRoster === undefined || pendingRoster === persistedRoster) {
      return;
    }
    // Normally a named draft is already kept current. After a failed autosave,
    // also try recovery; both remain best effort if browser storage is full.
    if (activeDraft !== undefined && autosaveBlockedRoster === undefined) return;
    const epoch = recoveryEpoch.current;
    const sequence = importSequence.current;
    recoveryTimer.current = setTimeout(() => {
      recoveryTimer.current = undefined;
      if (epoch === recoveryEpoch.current && sequence === importSequence.current) void recoveryRef.current();
    }, autosaveDelayMs);
  };
  useEffect(() => {
    // Edits and a failed explicit discard share one debounce. Neither failed
    // writes nor ordinary re-renders schedule another attempt; a subsequent
    // edit replaces the timer and unmount cancels it.
    scheduleRecoveryRef.current();
    return () => {
      clearTimeout(recoveryTimer.current);
      recoveryTimer.current = undefined;
    };
  }, [activeDraft, autosaveBlockedRoster, autosaveDelayMs, pendingRoster, persistedRoster]);

  // Recovery is best effort, not a user save. Keep reload protection until a
  // named draft write has actually persisted this exact roster snapshot.
  const unsavedChanges =
    rosterSession !== undefined && rosterSession.roster !== persistedRoster;
  useEffect(() => {
    if (!unsavedChanges) return undefined;
    const guard = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => {
      window.removeEventListener("beforeunload", guard);
    };
  }, [unsavedChanges]);

  return {
    loadState,
    unsavedChanges,
    recoverableRoster,
    recoverUnsavedRoster,
    discardRecoverableRoster,
    draftShelf,
    // A completed write may describe an older snapshot if the player edited
    // during saving. Keep its diagnostics but never imply newer edits saved.
    draftAction: draftAction.savedRoster !== undefined &&
      draftAction.savedRoster !== rosterSession?.roster
      ? { kind: draftAction.kind, diagnostics: draftAction.diagnostics }
      : draftAction,
    activeDraft,
    selectedCatalogue,
    rosterHistory,
    rosterSession,
    rosterDiagnostics,
    importFiles,
    openCatalogueLibrary,
    selectCatalogue,
    createRoster,
    clearRoster,
    addRootSelection,
    duplicateSelection,
    removeSelection,
    addChildSelection,
    renameSelection,
    setSelectionAmount,
    setAssociation,
    undoRosterEdit,
    redoRosterEdit,
    saveRosterDraft,
    loadRosterDraft,
    deleteRosterDraft,
  };
}

function fileReadMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `The browser could not read the selected files: ${detail}`;
}

/**
 * Rebuilds the session history a draft carried, or the present roster alone.
 *
 * The snapshots and the present roster all resolve against the same catalogue,
 * so they are restored in one pass: rebuilding the choice index per snapshot
 * measured 490 ms for a 20-deep history against 27 ms shared.
 *
 * A snapshot that no longer resolves costs the history, never the roster. Undo
 * is worth less than the list itself, so an unrestorable history falls back to
 * an empty one and says so, rather than refusing to open the draft.
 */
function restoreDraftSessions(
  catalogue: LocalCatalogueChoice,
  draft: LocalRosterDraft,
): Result<BoundedHistory<LocalRosterSession>> {
  const past = draft.history?.past ?? [];
  const future = draft.history?.future ?? [];
  if (past.length > 0 || future.length > 0) {
    const restored = restoreLocalRosterSessions(catalogue, [
      ...past,
      draft.roster,
      ...future,
    ]);
    const present = restored.ok ? restored.value[past.length] : undefined;
    if (restored.ok && present !== undefined) {
      return success(
        {
          past: restored.value.slice(0, past.length),
          present,
          future: restored.value.slice(past.length + 1),
        },
        restored.diagnostics,
      );
    }
  }

  const present = restoreLocalRosterSession(catalogue, draft.roster);
  if (!present.ok) return present;
  return success(createBoundedHistory(present.value), [
    ...present.diagnostics,
    ...(past.length + future.length === 0
      ? []
      : [
          draftUiDiagnostic(
            "WEB_ROSTER_DRAFT_HISTORY_UNAVAILABLE",
            "The saved undo history could not be rebuilt, so the draft opened without it.",
            {
              draftId: draft.id,
              entries: past.length + future.length,
            },
          ),
        ]),
  ]);
}

function draftImport(
  library: LocalCatalogueLibrary,
): LocalRosterDraft["import"] {
  return {
    batchId: library.importReport.batchId,
    importedAt: library.importReport.importedAt,
    files: library.importReport.files.map(({ source, sourceBytes }) => ({
      filename: source.filename,
      bytes: sourceBytes,
      ...(source.mediaType === undefined
        ? {}
        : { mediaType: source.mediaType }),
      ...(source.origin === undefined ? {} : { origin: source.origin }),
      sourceId: source.sourceId,
      sourceKind: source.kind,
    })),
  };
}

function draftUiDiagnostic(
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

function defaultBatchId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `batch-${Date.now().toString(36)}`;
}

function defaultDraftId(): string {
  const unique = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
  return `draft-${unique}`;
}

function defaultEntityId(
  kind: "roster" | "force" | "selection",
): string {
  const unique = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
  return `${kind}-${unique}`;
}
