import { useEffect, useMemo, useRef, useState } from "react";

import type { BattleScribeForceDefinition } from "@rosterforge/data-graph";
import type { Roster } from "@rosterforge/roster-model";
import type { Diagnostic } from "@rosterforge/foundation";
import {
  createLocalRosterDraft,
  type LocalRosterDraft,
} from "@rosterforge/persistence";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
  type SelectionOccurrenceId,
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
  removeLocalRosterSelection,
  restoreLocalRosterSession,
  setLocalRosterSelectionAmount,
  setLocalRosterSelectionName,
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
 */
export const defaultAutosaveDelayMs = 2_000;

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
   * The exact roster last written to or read from the draft store.
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
      setActiveDraft(undefined);
      setRosterHistory(createBoundedHistory(result.value));
      setPersistedRoster(undefined);
    }
  }

  function clearRoster() {
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

  function addRootSelection(choice: LocalRosterRootChoice) {
    if (rosterSession === undefined) return;
    const result = addLocalRosterRootSelection(rosterSession, choice, {
      selectionId: selectionOccurrenceId(createEntityId("selection")),
      createSelectionId: () =>
        selectionOccurrenceId(createEntityId("selection")),
    });
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
  }

  function removeSelection(id: SelectionOccurrenceId) {
    if (rosterSession === undefined) return;
    const result = removeLocalRosterSelection(rosterSession, id);
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) commitRosterSession(result.value);
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
    );
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
    setRecoverableRoster(undefined);
    await draftStore.delete(recoveryDraftId);
  }

  async function recoverUnsavedRoster() {
    setRecoverableRoster(undefined);
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

  async function saveRosterDraft() {
    if (loadState.kind !== "loaded" || rosterSession === undefined) return;
    const updatedAt = now();
    const createdAt = activeDraft?.createdAt ?? updatedAt;
    const draft = createLocalRosterDraft({
      id: activeDraft?.id ?? createDraftId(),
      createdAt,
      updatedAt,
      catalogueKey: rosterSession.catalogue.key,
      import: draftImport(loadState.library),
      roster: rosterSession.roster,
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
    const saved = await draftStore.save(draft.value);
    if (!saved.ok) {
      setDraftAction({
        kind: "idle",
        message: "The roster draft was not saved.",
        diagnostics: saved.diagnostics,
      });
      return;
    }

    setActiveDraft({ id: draft.value.id, createdAt });
    setPersistedRoster(rosterSession.roster);
    const listDiagnostics = await refreshDraftShelf();
    setDraftAction({
      kind: "idle",
      message: `Saved ${draft.value.roster.name} in this browser.`,
      diagnostics: [...saved.diagnostics, ...listDiagnostics],
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
      const restored = restoreLocalRosterSession(catalogue, draft.roster);
      setRosterDiagnostics(restored.diagnostics);
      if (!restored.ok) {
        setDraftAction({
          kind: "idle",
          message: "The saved roster draft could not be restored.",
          diagnostics: restored.diagnostics,
        });
        return;
      }

      setRosterHistory(createBoundedHistory(restored.value));
      setActiveDraft({ id: draft.id, createdAt: draft.createdAt });
      setPersistedRoster(restored.value.roster);
      setDraftAction({
        kind: "idle",
        message: `Opened ${draft.roster.name}.`,
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
    setDraftAction({ kind: "deleting", targetId: id, diagnostics: [] });
    const deleted = await draftStore.delete(id);
    if (!deleted.ok) {
      setDraftAction({
        kind: "idle",
        message: "The saved roster draft was not deleted.",
        diagnostics: deleted.diagnostics,
      });
      return;
    }
    if (activeDraft?.id === id) setActiveDraft(undefined);
    const listDiagnostics = await refreshDraftShelf();
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
    autosaveDelayMs,
    draftAction.kind,
    pendingRoster,
    persistedRoster,
  ]);

  // The recovery slot covers the case the draft autosave cannot: a roster the
  // user has never saved. One slot, overwritten, so its cost stays at one
  // catalogue closure however many rosters get tried.
  const recoveryRef = useRef<() => Promise<void>>(async () => undefined);
  recoveryRef.current = async () => {
    if (loadState.kind !== "loaded" || rosterSession === undefined) return;
    const stamp = now();
    const draft = createLocalRosterDraft({
      id: recoveryDraftId,
      createdAt: stamp,
      updatedAt: stamp,
      catalogueKey: rosterSession.catalogue.key,
      import: draftImport(loadState.library),
      roster: rosterSession.roster,
    });
    if (!draft.ok) return;
    await draftStore.save(draft.value);
  };
  useEffect(() => {
    if (pendingRoster === undefined || pendingRoster === persistedRoster) {
      return undefined;
    }
    const timer = setTimeout(() => {
      void recoveryRef.current();
    }, autosaveDelayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [autosaveDelayMs, pendingRoster, persistedRoster]);

  // Once the roster is persisted as a real draft the slot has nothing to
  // recover, so it is cleared rather than left to be offered next session.
  useEffect(() => {
    if (persistedRoster === undefined) return;
    void draftStore.delete(recoveryDraftId);
  }, [draftStore, persistedRoster]);

  // An unsaved roster is lost on reload: saving is manual until a draft exists,
  // and history is held in memory. Say so, and make the browser ask before
  // discarding it.
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
    draftAction,
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
    removeSelection,
    addChildSelection,
    renameSelection,
    setSelectionAmount,
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
