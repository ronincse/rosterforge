import { useEffect, useMemo, useRef, useState } from "react";

import type { BattleScribeForceDefinition } from "@rosterforge/data-graph";
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

  function selectCatalogue(key: string) {
    setSelectedKey(key);
    setActiveDraft(undefined);
    setRosterHistory(undefined);
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
    }
  }

  function clearRoster() {
    setActiveDraft(undefined);
    setRosterHistory(undefined);
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

  return {
    loadState,
    draftShelf,
    draftAction,
    activeDraft,
    selectedCatalogue,
    rosterHistory,
    rosterSession,
    rosterDiagnostics,
    importFiles,
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
