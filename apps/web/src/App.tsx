import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  BattleScribeForceDefinition,
  MaterializedInfoGroup,
  MaterializedProfileInfoLink,
  MaterializedRuleInfoLink,
  UnresolvedMaterializedInfoLink,
} from "@rosterforge/data-graph";
import {
  isActionableSupportedConstraintReport,
  type RosterForceConstraintReport,
  type RosterSelectionConditionCostReport,
  type RosterSelectionConstraintReport,
  type RosterSelectionConstraintStatus,
  type RosterStructuralBoundReport,
  type RosterStructuralBoundStatus,
  type SupportedRosterValidationFinding,
} from "@rosterforge/evaluation";
import type { Diagnostic } from "@rosterforge/foundation";
import {
  createLocalRosterDraft,
  type LocalRosterDraft,
} from "@rosterforge/persistence";
import {
  forceOccurrenceId,
  rosterId,
  rosterSelectionsAmount,
  selectionOccurrenceId,
  type RosterSelection,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";

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
  evaluateLocalRosterCosts,
  inspectLocalRosterChildChoices,
  inspectLocalRosterRootChoices,
  inspectLocalRosterSupportedValidation,
  localRosterSelectionChoice,
  localRosterSelectionCount,
  removeLocalRosterSelection,
  restoreLocalRosterSession,
  setLocalRosterSelectionAmount,
  setLocalRosterSelectionName,
  type LocalRosterRootChoice,
  type LocalRosterRootChoiceState,
  type LocalRosterChildChoiceGroup,
  type LocalRosterDirectChildChoice,
  type LocalRosterConstraintInspection,
  type LocalRosterSession,
} from "./roster-session.js";

type PrepareLibrary = typeof prepareLocalCatalogueLibrary;

export interface AppProps {
  readonly prepareLibrary?: PrepareLibrary;
  readonly draftStore?: LocalRosterDraftStore;
  readonly createBatchId?: () => string;
  readonly createDraftId?: () => string;
  readonly createEntityId?: (
    kind: "roster" | "force" | "selection",
  ) => string;
  readonly now?: () => string;
}

type LoadState =
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

type DraftShelfState =
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

interface ActiveDraft {
  readonly id: string;
  readonly createdAt: string;
}

interface DraftActionState {
  readonly kind: "idle" | "saving" | "loading" | "deleting";
  readonly targetId?: string;
  readonly message?: string;
  readonly diagnostics: readonly Diagnostic[];
}

const acceptedExtensions = ".gst,.cat,.gstz,.catz,.json";
const defaultDraftStore = createIndexedDbLocalRosterDraftStore();

export function App({
  prepareLibrary = prepareLocalCatalogueLibrary,
  draftStore = defaultDraftStore,
  createBatchId = defaultBatchId,
  createDraftId = defaultDraftId,
  createEntityId = defaultEntityId,
  now = () => new Date().toISOString(),
}: AppProps) {
  const inputId = useId();
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

  function handleFileInput(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    void importFiles(files);
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
    if (result.ok) {
      commitRosterSession(result.value);
    }
  }

  function removeSelection(id: SelectionOccurrenceId) {
    if (rosterSession === undefined) return;
    const result = removeLocalRosterSelection(rosterSession, id);
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) {
      commitRosterSession(result.value);
    }
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
        ? addLocalRosterChildSelection(
            rosterSession,
            parentId,
            choice,
            input,
          )
        : chooseLocalRosterChildGroupEntry(
            rosterSession,
            parentId,
            group.group,
            choice,
            input,
          );
    setRosterDiagnostics(result.diagnostics);
    if (result.ok) {
      commitRosterSession(result.value);
    }
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
    if (result.ok) {
      commitRosterSession(result.value);
    }
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
    if (result.ok) {
      commitRosterSession(result.value);
    }
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
    setDraftAction({
      kind: "loading",
      targetId: id,
      diagnostics: [],
    });
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
    setLoadState({
      kind: "loading",
      fileCount: draft.import.files.length,
    });

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
    setDraftAction({
      kind: "deleting",
      targetId: id,
      diagnostics: [],
    });
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

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="RosterForge home">
          <span className="brand-mark" aria-hidden="true">
            RF
          </span>
          <span>RosterForge</span>
        </a>
        <span className="local-badge">
          <span className="local-dot" aria-hidden="true" />
          Local only
        </span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">BattleScribe 2.03 catalogue reader</p>
          <h1 id="page-title">Bring your catalogue. Keep your data local.</h1>
          <p className="hero-copy">
            Open game-system and catalogue files together. RosterForge reads
            them in this browser session and shows exactly what is ready to use.
          </p>

          <div className="import-actions">
            <label className="primary-action" htmlFor={inputId}>
              {loadState.kind === "loaded"
                ? "Replace local files"
                : "Choose BattleScribe files"}
            </label>
            <input
              className="visually-hidden"
              id={inputId}
              type="file"
              accept={acceptedExtensions}
              multiple
              disabled={draftAction.kind !== "idle"}
              onChange={(event) => handleFileInput(event.currentTarget)}
            />
            <span className="file-hint">GST, CAT, GSTZ, CATZ, or JSON</span>
          </div>

          <p className="privacy-note">
            Files are parsed locally. Nothing is uploaded. Drafts are saved
            only when you choose Save draft.
          </p>
        </section>

        <SavedDraftShelf
          state={draftShelf}
          action={draftAction}
          activeDraftId={activeDraft?.id}
          onLoad={(id) => void loadRosterDraft(id)}
          onDelete={(id) => void deleteRosterDraft(id)}
        />

        <section className="workspace" aria-live="polite" aria-busy={loadState.kind === "loading"}>
          {loadState.kind === "idle" && <IdleState />}
          {loadState.kind === "loading" && (
            <LoadingState fileCount={loadState.fileCount} />
          )}
          {loadState.kind === "failed" && (
            <FailureState
              message={loadState.message}
              diagnostics={loadState.diagnostics}
            />
          )}
          {loadState.kind === "loaded" && (
            <LibraryWorkspace
              library={loadState.library}
              diagnostics={loadState.diagnostics}
              selectedCatalogue={selectedCatalogue}
              rosterSession={rosterSession}
              rosterDiagnostics={rosterDiagnostics}
              onSelect={selectCatalogue}
              onCreateRoster={createRoster}
              onClearRoster={clearRoster}
              onAddRootSelection={addRootSelection}
              onRemoveSelection={removeSelection}
              onAddChildSelection={addChildSelection}
              onRenameSelection={renameSelection}
              onSetSelectionAmount={setSelectionAmount}
              canUndo={(rosterHistory?.past.length ?? 0) > 0}
              canRedo={(rosterHistory?.future.length ?? 0) > 0}
              onUndo={undoRosterEdit}
              onRedo={redoRosterEdit}
              onSaveDraft={() => void saveRosterDraft()}
              isSavingDraft={draftAction.kind === "saving"}
              hasSavedDraft={activeDraft !== undefined}
            />
          )}
        </section>
      </main>

      <footer>
        <span>Open source. Local first.</span>
        <span>BattleScribe data remains yours.</span>
      </footer>
    </div>
  );
}

function SavedDraftShelf({
  state,
  action,
  activeDraftId,
  onLoad,
  onDelete,
}: {
  readonly state: DraftShelfState;
  readonly action: DraftActionState;
  readonly activeDraftId: string | undefined;
  readonly onLoad: (id: string) => void;
  readonly onDelete: (id: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const busy = action.kind !== "idle";
  return (
    <section className="saved-drafts" aria-labelledby="saved-drafts-heading">
      <div className="saved-drafts-heading">
        <div>
          <p className="eyebrow">Browser storage</p>
          <h2 id="saved-drafts-heading">Saved roster drafts</h2>
        </div>
        <span>{formatCount(state.drafts.length, "draft")}</span>
      </div>
      <p className="saved-drafts-note">
        Saved drafts stay in this browser and include the source files needed
        to rebuild their catalogue context.
      </p>

      {state.kind === "loading" ? (
        <p className="saved-drafts-empty" role="status">
          Checking this browser for saved drafts.
        </p>
      ) : state.kind === "failed" ? (
        <div className="saved-drafts-empty">
          <strong>Saved drafts are unavailable</strong>
          <span>The current roster can still be used in memory.</span>
        </div>
      ) : state.drafts.length === 0 ? (
        <p className="saved-drafts-empty">No roster drafts saved yet.</p>
      ) : (
        <div className="saved-draft-list">
          {state.drafts.map((draft) => {
            const confirming = confirmDeleteId === draft.id;
            const isTarget = action.targetId === draft.id;
            return (
              <article
                className="saved-draft-card"
                data-active={activeDraftId === draft.id}
                key={draft.id}
              >
                <div>
                  <strong>{draft.rosterName}</strong>
                  <span>
                    {formatCount(draft.selectionCount, "selection")} |{" "}
                    {formatBytes(draft.totalFileBytes)}
                  </span>
                  <small>Updated {formatTimestamp(draft.updatedAt)}</small>
                </div>
                {confirming ? (
                  <div
                    className="saved-draft-confirm"
                    role="group"
                    aria-label={`Confirm deletion of ${draft.rosterName}`}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setConfirmDeleteId(undefined);
                        onDelete(draft.id);
                      }}
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDeleteId(undefined)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="saved-draft-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onLoad(draft.id)}
                    >
                      {isTarget && action.kind === "loading"
                        ? "Opening..."
                        : "Open"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Delete ${draft.rosterName}`}
                      onClick={() => setConfirmDeleteId(draft.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {(action.message !== undefined || action.kind !== "idle") && (
        <p className="draft-action-status" role="status">
          {action.message ??
            (action.kind === "saving"
              ? "Saving roster draft..."
              : action.kind === "loading"
                ? "Opening saved roster draft..."
                : "Deleting saved roster draft...")}
        </p>
      )}
      <DiagnosticList
        diagnostics={[...state.diagnostics, ...action.diagnostics]}
      />
    </section>
  );
}

function IdleState() {
  return (
    <div className="empty-state">
      <div className="empty-glyph" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>Your catalogue library starts here</h2>
      <p>
        Select a game system and one or more catalogues in the same batch. Valid
        files remain available even when another selected file has a problem.
      </p>
    </div>
  );
}

function LoadingState({ fileCount }: { readonly fileCount: number }) {
  return (
    <div className="loading-state" role="status">
      <span className="loader" aria-hidden="true" />
      <div>
        <h2>Reading {formatCount(fileCount, "file")}</h2>
        <p>Parsing XML and composing catalogue views locally.</p>
      </div>
    </div>
  );
}

function FailureState({
  message,
  diagnostics,
}: {
  readonly message: string;
  readonly diagnostics: readonly Diagnostic[];
}) {
  return (
    <div className="failure-state" role="alert">
      <p className="eyebrow">Import stopped</p>
      <h2>{message}</h2>
      <p>Choose another set of files to try again.</p>
      <DiagnosticList diagnostics={diagnostics} />
    </div>
  );
}

function LibraryWorkspace({
  library,
  diagnostics,
  selectedCatalogue,
  rosterSession,
  rosterDiagnostics,
  onSelect,
  onCreateRoster,
  onClearRoster,
  onAddRootSelection,
  onRemoveSelection,
  onAddChildSelection,
  onRenameSelection,
  onSetSelectionAmount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveDraft,
  isSavingDraft,
  hasSavedDraft,
}: {
  readonly library: LocalCatalogueLibrary;
  readonly diagnostics: readonly Diagnostic[];
  readonly selectedCatalogue: LocalCatalogueChoice | undefined;
  readonly rosterSession: LocalRosterSession | undefined;
  readonly rosterDiagnostics: readonly Diagnostic[];
  readonly onSelect: (key: string) => void;
  readonly onCreateRoster: (
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) => void;
  readonly onClearRoster: () => void;
  readonly onAddRootSelection: (choice: LocalRosterRootChoice) => void;
  readonly onRemoveSelection: (id: SelectionOccurrenceId) => void;
  readonly onAddChildSelection: (
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    group?: LocalRosterChildChoiceGroup,
  ) => void;
  readonly onRenameSelection: (
    id: SelectionOccurrenceId,
    name: string | undefined,
  ) => void;
  readonly onSetSelectionAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onSaveDraft: () => void;
  readonly isSavingDraft: boolean;
  readonly hasSavedDraft: boolean;
}) {
  const importedCount = library.importReport.files.filter(
    ({ status }) => status === "imported",
  ).length;
  const rejectedCount = library.importReport.files.length - importedCount;
  const rosterActive =
    rosterSession !== undefined &&
    rosterSession.catalogue.key === selectedCatalogue?.key;
  const InspectorElement = rosterActive ? "section" : "aside";

  return (
    <div className="library-layout" data-roster-active={rosterActive}>
      {!rosterActive && (
        <section className="library-summary" aria-labelledby="library-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current local batch</p>
            <h2 id="library-heading">Catalogue library</h2>
          </div>
          <StatusBadge status={library.status} />
        </div>

        <div className="summary-grid">
          <SummaryMetric label="Imported" value={String(importedCount)} />
          <SummaryMetric
            label="Roster catalogues"
            value={String(library.selectableCatalogues.length)}
          />
          <SummaryMetric label="Issues" value={String(diagnostics.length)} />
        </div>

        {library.selectableCatalogues.length > 0 ? (
          <div className="catalogue-list" aria-label="Available catalogues">
            {library.selectableCatalogues.map((catalogue) => (
              <button
                className="catalogue-choice"
                data-selected={catalogue.key === selectedCatalogue?.key}
                key={catalogue.key}
                type="button"
                aria-pressed={catalogue.key === selectedCatalogue?.key}
                onClick={() => onSelect(catalogue.key)}
              >
                <span className="catalogue-monogram" aria-hidden="true">
                  {initials(catalogue.name)}
                </span>
                <span className="catalogue-choice-copy">
                  <strong>{catalogue.name}</strong>
                  <span>
                    Revision {catalogue.revision ?? "not specified"}
                  </span>
                </span>
                <span className="choice-arrow" aria-hidden="true">
                  &gt;
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="no-catalogues">
            <h3>No catalogue choices yet</h3>
            <p>
              {library.gameSystems.length > 0
                ? "The game system imported, but this batch did not contain a catalogue."
                : "No BattleScribe catalogue could be read from this batch."}
            </p>
          </div>
        )}

        <ImportReport library={library} rejectedCount={rejectedCount} />
        {diagnostics.length > 0 && (
          <details className="batch-diagnostics">
            <summary>
              Batch diagnostics
              <span>{formatCount(diagnostics.length, "issue")}</span>
            </summary>
            <DiagnosticList diagnostics={diagnostics} />
          </details>
        )}
        </section>
      )}

      <InspectorElement
        className="catalogue-inspector"
        aria-label={rosterActive ? "Roster workspace" : "Catalogue details"}
      >
        {rosterActive ? (
          <RosterOverview
            session={rosterSession}
            diagnostics={rosterDiagnostics}
            onClear={onClearRoster}
            onAddRootSelection={onAddRootSelection}
            onRemoveSelection={onRemoveSelection}
            onAddChildSelection={onAddChildSelection}
            onRenameSelection={onRenameSelection}
            onSetSelectionAmount={onSetSelectionAmount}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            onSaveDraft={onSaveDraft}
            isSavingDraft={isSavingDraft}
            hasSavedDraft={hasSavedDraft}
          />
        ) : selectedCatalogue === undefined ? (
          <div className="inspector-placeholder">
            <p className="eyebrow">Selection</p>
            <h2>No catalogue selected</h2>
            <p>Choose an available catalogue to inspect its composed view.</p>
          </div>
        ) : (
          <CatalogueDetails
            catalogue={selectedCatalogue}
            library={library}
            diagnostics={diagnostics}
            rosterDiagnostics={rosterDiagnostics}
            onCreateRoster={onCreateRoster}
          />
        )}
      </InspectorElement>
    </div>
  );
}

function StatusBadge({ status }: { readonly status: LocalCatalogueLibrary["status"] }) {
  const labels = {
    empty: "Nothing imported",
    unavailable: "Needs a catalogue",
    ready: "Ready",
    partial: "Ready with issues",
  } as const;
  return (
    <span className="status-badge" data-status={status}>
      {labels[status]}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="summary-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ImportReport({
  library,
  rejectedCount,
}: {
  readonly library: LocalCatalogueLibrary;
  readonly rejectedCount: number;
}) {
  return (
    <details className="import-report" open={rejectedCount > 0}>
      <summary>
        File report
        <span>{rejectedCount} rejected</span>
      </summary>
      <ul>
        {library.importReport.files.map((file) => (
          <li key={`${file.index}:${file.source.filename}`}>
            <span className="file-status" data-status={file.status} aria-hidden="true" />
            <span>
              <strong>{file.source.filename}</strong>
              <small>
                {file.status === "imported"
                  ? file.document?.metadata.kind === "catalogue"
                    ? "Catalogue"
                    : "Game system"
                  : file.diagnostics[0]?.message ?? "Rejected"}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CatalogueDetails({
  catalogue,
  library,
  diagnostics,
  rosterDiagnostics,
  onCreateRoster,
}: {
  readonly catalogue: LocalCatalogueChoice;
  readonly library: LocalCatalogueLibrary;
  readonly diagnostics: readonly Diagnostic[];
  readonly rosterDiagnostics: readonly Diagnostic[];
  readonly onCreateRoster: (
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) => void;
}) {
  const gameSystem = library.gameSystems.find(
    ({ metadata }) => metadata.id === catalogue.gameSystemId,
  );
  const sourceDiagnostics = diagnostics.filter(
    ({ location }) =>
      location?.source.sourceId === catalogue.source.sourceId ||
      (catalogue.gameSystemId !== undefined &&
        location?.source.sourceId === gameSystem?.source.sourceId),
  );

  return (
    <div>
      <p className="eyebrow">Selected catalogue</p>
      <h2>{catalogue.name}</h2>
      <p className="catalogue-subtitle">
        {gameSystem?.metadata.name ?? "Game system unavailable"}
      </p>

      <dl className="detail-list">
        <Detail label="Source file" value={catalogue.source.filename} />
        <Detail
          label="Revision"
          value={String(catalogue.revision ?? "Not specified")}
        />
        <Detail
          label="Visible roots"
          value={String(catalogue.context.roots.roots.length)}
        />
        <Detail
          label="Force definitions"
          value={String(catalogue.context.forces.definitions.length)}
        />
        <Detail
          label="Categories"
          value={String(catalogue.context.categories.definitions.length)}
        />
        <Detail
          label="Source size"
          value={formatBytes(catalogue.document.sourceBytes.byteLength)}
        />
      </dl>

      <div className="readiness-note">
        <strong>Catalogue context composed</strong>
        <span>
          Definitions and source provenance are ready for roster setup.
        </span>
      </div>

      <RosterSetup
        key={catalogue.key}
        catalogue={catalogue}
        diagnostics={rosterDiagnostics}
        onCreate={onCreateRoster}
      />

      {sourceDiagnostics.length > 0 && (
        <details className="diagnostic-panel">
          <summary>
            Catalogue diagnostics
            <span>{formatCount(sourceDiagnostics.length, "issue")}</span>
          </summary>
          <DiagnosticList diagnostics={sourceDiagnostics} />
        </details>
      )}
    </div>
  );
}

function RosterSetup({
  catalogue,
  diagnostics,
  onCreate,
}: {
  readonly catalogue: LocalCatalogueChoice;
  readonly diagnostics: readonly Diagnostic[];
  readonly onCreate: (
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) => void;
}) {
  const nameId = useId();
  const forceId = useId();
  const definitions = catalogue.context.forces.definitions;
  const [name, setName] = useState(`${catalogue.name} roster`);
  const [selectedForceKey, setSelectedForceKey] = useState(
    definitions[0] === undefined ? "" : forceDefinitionKey(definitions[0]),
  );
  const selectedForce = definitions.find(
    (definition) => forceDefinitionKey(definition) === selectedForceKey,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "" || selectedForce === undefined) return;
    onCreate(catalogue, selectedForce, trimmedName);
  }

  if (definitions.length === 0) {
    return (
      <div className="roster-setup unavailable-setup">
        <p className="eyebrow">Roster setup</p>
        <h3>No force definitions available</h3>
        <p>
          Import this catalogue with its matching game system to create a
          roster force.
        </p>
      </div>
    );
  }

  return (
    <form className="roster-setup" onSubmit={submit}>
      <div>
        <p className="eyebrow">Roster setup</p>
        <h3>Create an in-memory roster</h3>
      </div>
      <label htmlFor={nameId}>Roster name</label>
      <input
        id={nameId}
        value={name}
        required
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <label htmlFor={forceId}>Starting force</label>
      <select
        id={forceId}
        value={selectedForceKey}
        onChange={(event) => setSelectedForceKey(event.currentTarget.value)}
      >
        {definitions.map((definition) => (
          <option
            key={forceDefinitionKey(definition)}
            value={forceDefinitionKey(definition)}
          >
            {forceDefinitionLabel(definition)}
          </option>
        ))}
      </select>
      <button
        className="create-roster-action"
        type="submit"
        disabled={name.trim() === "" || selectedForce === undefined}
      >
        Create roster
      </button>
      <p className="setup-boundary">
        Creation is structural. Read-only costs appear in the workspace;
        legality is not evaluated.
      </p>
      <DiagnosticList diagnostics={diagnostics} />
    </form>
  );
}

function RosterOverview({
  session,
  diagnostics,
  onClear,
  onAddRootSelection,
  onRemoveSelection,
  onAddChildSelection,
  onRenameSelection,
  onSetSelectionAmount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveDraft,
  isSavingDraft,
  hasSavedDraft,
}: {
  readonly session: LocalRosterSession;
  readonly diagnostics: readonly Diagnostic[];
  readonly onClear: () => void;
  readonly onAddRootSelection: (choice: LocalRosterRootChoice) => void;
  readonly onRemoveSelection: (id: SelectionOccurrenceId) => void;
  readonly onAddChildSelection: (
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    group?: LocalRosterChildChoiceGroup,
  ) => void;
  readonly onRenameSelection: (
    id: SelectionOccurrenceId,
    name: string | undefined,
  ) => void;
  readonly onSetSelectionAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onSaveDraft: () => void;
  readonly isSavingDraft: boolean;
  readonly hasSavedDraft: boolean;
}) {
  const force = session.roster.forces[0];
  const rootFilterId = useId();
  const [rootFilter, setRootFilter] = useState("");
  const rootChoiceInspection = inspectLocalRosterRootChoices(session);
  const rootChoiceGroups = rootChoiceInspection.ok
    ? rootChoiceInspection.value.groups
    : [];
  const normalizedRootFilter = rootFilter.trim().toLowerCase();
  const filteredRootChoiceGroups =
    normalizedRootFilter === ""
      ? rootChoiceGroups
      : rootChoiceGroups
          .map((group) => ({
            ...group,
            choices: group.choices.filter(({ choice }) =>
              rootChoiceLabel(choice)
                .toLowerCase()
                .includes(normalizedRootFilter),
            ),
          }))
          .filter(({ choices }) => choices.length > 0);
  const filteredRootChoiceCount = filteredRootChoiceGroups.reduce(
    (total, { choices }) => total + choices.length,
    0,
  );
  const costResult = evaluateLocalRosterCosts(session);
  const supportedValidation =
    inspectLocalRosterSupportedValidation(session);
  const attentionSelectionIds =
    supportedValidation.ok
      ? supportedValidationSelectionIds(
          supportedValidation.value.status.findings,
        )
      : new Set<string>();
  const validationIssueCount = supportedValidation.ok
    ? supportedValidation.value.status.statusCounts.violated +
      supportedValidation.value.status.statusCounts.unresolved
    : 0;
  const topLevelSelectionCount =
    force === undefined ? 0 : rosterSelectionsAmount(force.selections);
  return (
    <div className="roster-overview">
      <p className="eyebrow">Roster workspace</p>
      <h2>{session.roster.name}</h2>
      <p className="catalogue-subtitle">{session.catalogue.name}</p>

      <div className="roster-metrics">
        <SummaryMetric
          label="Forces"
          value={String(session.roster.forces.length)}
        />
        <SummaryMetric
          label="Selections"
          value={String(localRosterSelectionCount(session))}
        />
      </div>

      <div className="history-actions" aria-label="Roster edit history">
        <button type="button" disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
        <button
          className="save-draft-action"
          type="button"
          disabled={isSavingDraft}
          onClick={onSaveDraft}
        >
          {isSavingDraft
            ? "Saving..."
            : hasSavedDraft
              ? "Update saved draft"
              : "Save draft"}
        </button>
      </div>

      <RosterSupportedValidationRibbon result={supportedValidation} />
      <RosterCostSummary result={costResult} />

      <nav
        className="roster-workspace-nav"
        aria-label="Roster workspace navigation"
      >
        <a
          href="#selected-roster-heading"
          aria-label={`Roster, ${formatCount(
            topLevelSelectionCount,
            "top-level selection",
          )}`}
        >
          <span>Roster</span>
          <strong>{topLevelSelectionCount}</strong>
          <small>top-level selections</small>
        </a>
        <a
          href="#root-choices-heading"
          aria-label={`Add units, ${formatCount(
            filteredRootChoiceCount,
            "available choice",
          )}`}
        >
          <span>Add units</span>
          <strong>{filteredRootChoiceCount}</strong>
          <small>available choices</small>
        </a>
        <a
          href="#roster-checks-heading"
          aria-label={`Checks, ${formatCount(
            validationIssueCount,
            "issue",
          )}`}
        >
          <span>Checks</span>
          <strong>{validationIssueCount}</strong>
          <small>known or unresolved</small>
        </a>
      </nav>

      <section
        className="roster-builder-grid"
        aria-label="Roster builder"
      >
        <section
          className="selected-roster-pane"
          aria-labelledby="selected-roster-heading"
        >
          <div className="builder-pane-heading">
            <div>
              <p className="eyebrow">Your roster</p>
              <h3 id="selected-roster-heading">Selected roster</h3>
            </div>
            <span>
              {formatCount(topLevelSelectionCount, "top-level selection")}
            </span>
          </div>

          <div
            className="force-card"
            id={force === undefined ? undefined : forceAnchor(force.id)}
          >
            <span className="force-kicker">Starting force</span>
            <strong>{forceDefinitionLabel(session.forceDefinition)}</strong>
            <span>{force?.id}</span>
          </div>

          {force === undefined || force.selections.length === 0 ? (
            <div className="empty-selected-roster">
              <strong>No selections added yet</strong>
              <span>
                Browse categories in Add units to begin this roster.
              </span>
            </div>
          ) : (
            <div className="roster-selection-list">
              <ul>
                {force.selections.map((selection) => (
                  <RosterSelectionItem
                    key={selection.id}
                    session={session}
                    selection={selection}
                    attentionSelectionIds={attentionSelectionIds}
                    onAddChild={onAddChildSelection}
                    onRename={onRenameSelection}
                    onSetAmount={onSetSelectionAmount}
                    onRemove={onRemoveSelection}
                  />
                ))}
              </ul>
            </div>
          )}
        </section>

        <section
          className="selection-editor"
          aria-labelledby="root-choices-heading"
        >
          <div className="builder-pane-heading">
            <div>
              <p className="eyebrow">Catalogue browser</p>
              <h3 id="root-choices-heading">Add units</h3>
            </div>
            <span>
              {formatCount(filteredRootChoiceCount, "matching choice")}
            </span>
          </div>

          {rootChoiceGroups.length > 0 && (
            <div className="root-choice-filter">
              <label htmlFor={rootFilterId}>Find a unit or option</label>
              <input
                id={rootFilterId}
                type="search"
                value={rootFilter}
                placeholder="Filter available roots"
                onChange={(event) =>
                  setRootFilter(event.currentTarget.value)
                }
              />
            </div>
          )}

          {rootChoiceGroups.length === 0 ? (
            <p className="no-root-choices">
              This catalogue context has no resolved visible root selections.
            </p>
          ) : filteredRootChoiceGroups.length === 0 ? (
            <p className="no-root-choices">
              No available roots match this filter.
            </p>
          ) : (
            <div className="root-choice-categories">
              {filteredRootChoiceGroups.map((group, index) => (
                <details
                  className="root-choice-category"
                  key={group.key}
                  open={
                    normalizedRootFilter !== "" ||
                    index === 0 ||
                    group.name === "Configuration"
                  }
                >
                  <summary>
                    <strong>{group.name}</strong>
                    <span>{formatCount(group.choices.length, "choice")}</span>
                  </summary>
                  <div className="root-choice-list">
                    {group.choices.map((state) => {
                      const choice = state.choice;
                      const status = rootChoiceStatus(state);
                      const finiteMaximum =
                        state.maximum !== undefined &&
                        Number.isFinite(state.maximum)
                          ? state.maximum
                          : undefined;
                      const maximumReached =
                        finiteMaximum !== undefined &&
                        rosterSelectionsAmount(state.selected) >= finiteMaximum;
                      return (
                        <div
                          className="root-choice"
                          key={rootChoiceKey(choice)}
                          data-completeness={state.completeness}
                        >
                          <span>
                            <strong>{rootChoiceLabel(choice)}</strong>
                            <small>
                              {choice.materialized.kind === "selectionEntry"
                                ? "Selection entry"
                                : "Selection group"}
                              {choice.materialized.hidden === true
                                ? " | Hidden"
                                : ""}
                            </small>
                            {status !== undefined && (
                              <small className="root-choice-status">
                                {status}
                              </small>
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={maximumReached}
                            onClick={() => onAddRootSelection(choice)}
                          >
                            {maximumReached
                              ? `${rootChoiceLabel(choice)} maximum reached`
                              : `Add ${rootChoiceLabel(choice)}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
          {!rootChoiceInspection.ok && (
            <DiagnosticList diagnostics={rootChoiceInspection.diagnostics} />
          )}
          <DiagnosticList diagnostics={diagnostics} />
        </section>
      </section>

      <section
        className="roster-checks"
        aria-labelledby="roster-checks-heading"
      >
        <div>
          <p className="eyebrow">Read-only checks</p>
          <h3 id="roster-checks-heading">Checks and diagnostics</h3>
        </div>
        <RosterStructuralStatus result={supportedValidation} />
        <RosterConstraintSummary result={supportedValidation} />
      </section>

      <button className="secondary-action" type="button" onClick={onClear}>
        Change roster setup
      </button>
    </div>
  );
}

function RosterSupportedValidationRibbon({
  result,
}: {
  readonly result: ReturnType<
    typeof inspectLocalRosterSupportedValidation
  >;
}) {
  if (!result.ok) {
    return (
      <section
        className="supported-validation-ribbon"
        aria-labelledby="supported-validation-heading"
      >
        <div>
          <p className="eyebrow">Supported validation</p>
          <h3 id="supported-validation-heading">
            Roster check unavailable
          </h3>
        </div>
        <p>
          The supported checks could not be composed. Editing remains
          available.
        </p>
        <DiagnosticList diagnostics={result.diagnostics} />
      </section>
    );
  }

  const report = result.value.status;
  const constraintFindings =
    report.findingCounts.selectionConstraints +
    report.findingCounts.forceConstraints;
  return (
    <section
      className="supported-validation-ribbon"
      data-validity={report.validity}
      aria-labelledby="supported-validation-heading"
    >
      <div className="supported-validation-heading">
        <div>
          <p className="eyebrow">Supported validation</p>
          <h3 id="supported-validation-heading">
            Supported roster validation
          </h3>
        </div>
        <div className="validation-badges">
          <span
            className="validity-badge"
            data-validity={report.validity}
          >
            {report.validity === "valid"
              ? "No known violations"
              : "Known violations"}
          </span>
          <span
            className="completeness-badge"
            data-completeness={report.completeness}
          >
            {report.completeness === "complete"
              ? "Complete supported view"
              : "Incomplete supported view"}
          </span>
        </div>
      </div>

      <ul
        className="validation-ribbon-statuses"
        aria-label="Combined validation statuses"
      >
        <ConstraintStatus
          label="Satisfied"
          status="satisfied"
          value={report.statusCounts.satisfied}
        />
        <ConstraintStatus
          label="Violated"
          status="violated"
          value={report.statusCounts.violated}
        />
        <ConstraintStatus
          label="Unresolved"
          status="unresolved"
          value={report.statusCounts.unresolved}
        />
      </ul>

      <nav
        className="validation-ribbon-links"
        aria-label="Supported validation details"
      >
        <a href="#roster-structural-status-heading">
          {formatCount(
            report.findingCounts.structural,
            "structural issue",
          )}
        </a>
        <a href="#roster-constraint-heading">
          {formatCount(constraintFindings, "constraint issue")}
        </a>
      </nav>

      <p className="validation-ribbon-boundary">
        Covers the structural and constraint behavior currently supported by
        RosterForge. It does not establish full BattleScribe legality or block
        edits.
      </p>
    </section>
  );
}

function RosterStructuralStatus({
  result,
}: {
  readonly result: ReturnType<
    typeof inspectLocalRosterSupportedValidation
  >;
}) {
  if (!result.ok) {
    return (
      <section
        className="constraint-summary structural-status-summary"
        aria-labelledby="roster-structural-status-heading"
      >
        <div className="constraint-summary-heading">
          <div>
            <p className="eyebrow">Roster status</p>
            <h3 id="roster-structural-status-heading">
              Structural status unavailable
            </h3>
          </div>
        </div>
        <p className="constraint-boundary">
          Supported structural requirements could not be inspected. This does
          not block roster editing.
        </p>
        <DiagnosticList diagnostics={result.diagnostics} />
      </section>
    );
  }

  const report = result.value.structural;
  const diagnostics = result.value.structuralDiagnostics;
  const satisfied = countStructuralStatus(report.bounds, "satisfied");
  const violated = countStructuralStatus(report.bounds, "violated");
  const unresolved = countStructuralStatus(report.bounds, "unresolved");
  const attentionBounds = report.bounds.filter(
    ({ status }) => status !== "satisfied",
  );
  const satisfiedBounds = report.bounds.filter(
    ({ status }) => status === "satisfied",
  );
  return (
    <section
      className="constraint-summary structural-status-summary"
      aria-labelledby="roster-structural-status-heading"
    >
      <div className="constraint-summary-heading">
        <div>
          <p className="eyebrow">Roster status</p>
          <h3 id="roster-structural-status-heading">
            Supported structural requirements
          </h3>
        </div>
        <div className="validation-badges">
          <span
            className="validity-badge"
            data-validity={report.validity}
          >
            {report.validity === "valid"
              ? "No known violations"
              : "Known violations"}
          </span>
          <span
            className="completeness-badge"
            data-completeness={report.completeness}
          >
            {report.completeness === "complete"
              ? "Complete inspection"
              : "Incomplete inspection"}
          </span>
        </div>
      </div>

      <ul
        className="constraint-status-list"
        aria-label="Structural requirement statuses"
      >
        <ConstraintStatus
          label="Satisfied"
          status="satisfied"
          value={satisfied}
        />
        <ConstraintStatus
          label="Violated"
          status="violated"
          value={violated}
        />
        <ConstraintStatus
          label="Unresolved"
          status="unresolved"
          value={unresolved}
        />
      </ul>

      {report.bounds.length === 0 ? (
        <p className="empty-constraints">
          No supported root, direct-entry, or group bounds apply.
        </p>
      ) : (
        <>
          {attentionBounds.length === 0 ? (
            <p className="empty-constraints">
              All supported structural requirements are currently satisfied.
            </p>
          ) : (
            <StructuralBoundDetails
              title="Requirements needing attention"
              bounds={attentionBounds}
              open
            />
          )}
          {satisfiedBounds.length > 0 && (
            <StructuralBoundDetails
              title="Satisfied structural bounds"
              bounds={satisfiedBounds}
            />
          )}
        </>
      )}

      {diagnostics.length > 0 && (
        <details
          className="constraint-details structural-diagnostics"
          aria-label={`Structural diagnostics ${formatCount(
            diagnostics.length,
            "diagnostic",
          )}`}
        >
          <summary>
            Structural diagnostics
            <span>
              {formatCount(diagnostics.length, "diagnostic")}
            </span>
          </summary>
          <DiagnosticList diagnostics={diagnostics} />
        </details>
      )}

      <p className="constraint-boundary">
        Validity means no supported structural bound is known to be violated.
        Completeness is independent and becomes incomplete when references or
        applicable BattleScribe behavior remain unresolved. This is not full
        roster legality.
      </p>
    </section>
  );
}

function StructuralBoundDetails({
  title,
  bounds,
  open = false,
}: {
  readonly title: string;
  readonly bounds: readonly RosterStructuralBoundReport[];
  readonly open?: boolean;
}) {
  return (
    <details
      className="constraint-details"
      open={open}
      aria-label={`${title} ${formatCount(bounds.length, "bound")}`}
    >
      <summary>
        {title}
        <span>{formatCount(bounds.length, "bound")}</span>
      </summary>
      <ul>
        {bounds.map((bound) => (
          <li
            key={structuralBoundKey(bound)}
            data-status={bound.status}
          >
            <div>
              <strong>{structuralBoundName(bound)}</strong>
              <span>{structuralBoundKind(bound)}</span>
              <a
                className="structural-bound-link"
                href={structuralBoundTarget(bound)}
              >
                {bound.kind === "root"
                  ? "Review available roots"
                  : "Review selection"}
              </a>
            </div>
            <span className="constraint-observation">
              {structuralBoundObservation(bound)}
            </span>
            <span className="constraint-status">
              {constraintStatusLabel(bound.status)}
              {bound.completeness === "incomplete"
                ? " | Incomplete"
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function countStructuralStatus(
  bounds: readonly RosterStructuralBoundReport[],
  status: RosterStructuralBoundStatus,
): number {
  return bounds.filter((bound) => bound.status === status).length;
}

function structuralBoundName(
  bound: RosterStructuralBoundReport,
): string {
  if (bound.kind === "root") {
    return bound.root.materialized.name ?? "Unnamed root choice";
  }
  if (bound.kind === "direct") {
    return bound.choice.name ?? "Unnamed direct choice";
  }
  return bound.group.name ?? "Unnamed selection group";
}

function structuralBoundKind(
  bound: RosterStructuralBoundReport,
): string {
  if (bound.kind === "root") return "Root selection bound";
  const owner = bound.owner.name ?? bound.owner.id;
  if (bound.kind === "direct") {
    return `Direct child bound for ${owner}`;
  }
  return `Transparent group bound for ${owner}`;
}

function structuralBoundObservation(
  bound: RosterStructuralBoundReport,
): string {
  const selected =
    bound.selectedCount === bound.possibleSelectedCount
      ? `Selected ${bound.selectedCount}`
      : `Selected ${bound.selectedCount} to ${bound.possibleSelectedCount}`;
  const minimum =
    bound.minimum === undefined
      ? "unknown minimum"
      : `minimum ${formatNumber(bound.minimum)}`;
  const maximum =
    bound.maximum === undefined
      ? "unknown maximum"
      : Number.isFinite(bound.maximum)
        ? `maximum ${formatNumber(bound.maximum)}`
        : "no finite maximum";
  return `${selected}, ${minimum}, ${maximum}`;
}

function structuralBoundKey(
  bound: RosterStructuralBoundReport,
): string {
  const source =
    bound.kind === "root"
      ? bound.root.materialized.occurrence
      : bound.kind === "direct"
        ? bound.choice.occurrence
        : bound.group.occurrence;
  const owner =
    bound.kind === "root" ? bound.force.id : bound.owner.id;
  return JSON.stringify([
    bound.kind,
    owner,
    source.source.sourceId,
    ...source.path,
  ]);
}

function structuralBoundTarget(
  bound: RosterStructuralBoundReport,
): string {
  return bound.kind === "root"
    ? "#root-choices-heading"
    : `#${selectionAnchor(bound.owner.id)}`;
}

interface ConstraintSummaryItem {
  readonly key: string;
  readonly ownerName: string;
  readonly ownerId: string;
  readonly ownerKind: "Selection" | "Force";
  readonly status: RosterSelectionConstraintStatus;
  readonly completeness: "complete" | "incomplete";
  readonly type: string | undefined;
  readonly scope: string | undefined;
  readonly observed: number | undefined;
  readonly minimum: number;
  readonly maximum: number;
  readonly limit: number | undefined;
  readonly target: string;
}

function RosterConstraintSummary({
  result,
}: {
  readonly result: ReturnType<
    typeof inspectLocalRosterSupportedValidation
  >;
}) {
  if (!result.ok) {
    return (
      <section
        className="constraint-summary"
        aria-labelledby="roster-constraint-heading"
      >
        <div className="constraint-summary-heading">
          <div>
            <p className="eyebrow">Read-only inspection</p>
            <h3 id="roster-constraint-heading">Constraint report unavailable</h3>
          </div>
        </div>
        <p className="constraint-boundary">
          Constraint inspection could not complete. Roster structure is
          unchanged and no edit was blocked.
        </p>
        <DiagnosticList diagnostics={result.diagnostics} />
      </section>
    );
  }

  const report = result.value.constraints;
  const diagnostics = result.value.constraintDiagnostics;
  const items = constraintSummaryItems(report);
  const satisfied = countConstraintStatus(items, "satisfied");
  const violated = countConstraintStatus(items, "violated");
  const unresolved = countConstraintStatus(items, "unresolved");
  const attentionItems = items.filter(
    ({ status }) => status !== "satisfied",
  );
  const satisfiedItems = items.filter(
    ({ status }) => status === "satisfied",
  );
  return (
    <section
      className="constraint-summary"
      aria-labelledby="roster-constraint-heading"
    >
      <div className="constraint-summary-heading">
        <div>
          <p className="eyebrow">Read-only inspection</p>
          <h3 id="roster-constraint-heading">Constraint bounds</h3>
        </div>
        <span
          className="completeness-badge"
          data-completeness={report.completeness}
        >
          {report.completeness === "complete"
            ? "Complete inspection"
            : "Incomplete inspection"}
        </span>
      </div>

      <ul className="constraint-status-list" aria-label="Constraint statuses">
        <ConstraintStatus label="Satisfied" status="satisfied" value={satisfied} />
        <ConstraintStatus label="Violated" status="violated" value={violated} />
        <ConstraintStatus
          label="Unresolved"
          status="unresolved"
          value={unresolved}
        />
      </ul>

      {items.length === 0 ? (
        <p className="empty-constraints">
          No supported actionable constraint bounds apply. Unsupported
          projected constraints remain available in diagnostics.
        </p>
      ) : (
        <>
          {attentionItems.length === 0 ? (
            <p className="empty-constraints">
              All inspected constraint bounds are currently satisfied.
            </p>
          ) : (
            <ConstraintItemDetails
              title="Constraint issues needing attention"
              items={attentionItems}
              open
            />
          )}
          {satisfiedItems.length > 0 && (
            <ConstraintItemDetails
              title="Satisfied constraint bounds"
              items={satisfiedItems}
            />
          )}
        </>
      )}

      {diagnostics.length > 0 && (
        <details
          className="constraint-details"
          aria-label={`Constraint diagnostics ${formatCount(
            diagnostics.length,
            "diagnostic",
          )}`}
        >
          <summary>
            Constraint diagnostics
            <span>{formatCount(diagnostics.length, "diagnostic")}</span>
          </summary>
          <DiagnosticList diagnostics={diagnostics} />
        </details>
      )}

      <p className="constraint-boundary">
        Bounds are inspected independently. They do not produce aggregate
        legality and do not permit or reject edits.
      </p>
    </section>
  );
}

function ConstraintItemDetails({
  title,
  items,
  open = false,
}: {
  readonly title: string;
  readonly items: readonly ConstraintSummaryItem[];
  readonly open?: boolean;
}) {
  return (
    <details
      className="constraint-details"
      open={open}
      aria-label={`${title} ${formatCount(items.length, "bound")}`}
    >
      <summary>
        {title}
        <span>{formatCount(items.length, "bound")}</span>
      </summary>
      <ul>
        {items.map((item) => (
          <li key={item.key} data-status={item.status}>
            <div>
              <strong>{item.ownerName}</strong>
              <span>
                {item.ownerKind} | {constraintTypeLabel(item.type)} |{" "}
                {item.scope ?? "Unspecified scope"}
              </span>
              <a className="constraint-review-link" href={item.target}>
                Review {item.ownerKind.toLowerCase()}
              </a>
            </div>
            <span className="constraint-observation">
              {constraintObservation(item)}
            </span>
            <span className="constraint-status">
              {constraintStatusLabel(item.status)}
              {item.completeness === "incomplete" ? " | Incomplete" : ""}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ConstraintStatus({
  label,
  status,
  value,
}: {
  readonly label: string;
  readonly status: RosterSelectionConstraintStatus;
  readonly value: number;
}) {
  return (
    <li data-status={status}>
      <strong>{value}</strong>
      <span>{label}</span>
    </li>
  );
}

function constraintSummaryItems(
  report: LocalRosterConstraintInspection,
): readonly ConstraintSummaryItem[] {
  const selections = report.selections.selections.flatMap(({ constraints }) =>
    constraints
      .filter(isActionableSupportedConstraintReport)
      .map((constraint) =>
        selectionConstraintSummaryItem(constraint),
      ),
  );
  const forces = report.forces.forces.flatMap(({ constraints }) =>
    constraints
      .filter(isActionableSupportedConstraintReport)
      .map((constraint) => forceConstraintSummaryItem(constraint)),
  );
  return [...selections, ...forces];
}

function selectionConstraintSummaryItem(
  report: RosterSelectionConstraintReport,
): ConstraintSummaryItem {
  return constraintSummaryItem(
    "Selection",
    report.owner.name ?? "Unnamed selection",
    report.owner.id,
    `#${selectionAnchor(report.owner.id)}`,
    report,
  );
}

function forceConstraintSummaryItem(
  report: RosterForceConstraintReport,
): ConstraintSummaryItem {
  return constraintSummaryItem(
    "Force",
    report.owner.name ?? "Unnamed force",
    report.owner.id,
    `#${forceAnchor(report.owner.id)}`,
    report,
  );
}

function constraintSummaryItem(
  ownerKind: "Selection" | "Force",
  ownerName: string,
  ownerId: string,
  target: string,
  report: RosterSelectionConstraintReport | RosterForceConstraintReport,
): ConstraintSummaryItem {
  return {
    key: JSON.stringify([
      ownerKind,
      ownerId,
      report.constraint.source.sourceId,
      ...report.constraint.path,
    ]),
    ownerName,
    ownerId,
    ownerKind,
    target,
    status: report.status,
    completeness: report.completeness,
    type: report.constraintType ?? report.constraint.type,
    scope: report.scope ?? report.constraint.scope,
    observed: report.observed,
    minimum: report.minimum,
    maximum: report.maximum,
    limit: report.limit ?? report.baseLimit ?? report.constraint.value,
  };
}

function countConstraintStatus(
  items: readonly ConstraintSummaryItem[],
  status: RosterSelectionConstraintStatus,
): number {
  return items.filter((item) => item.status === status).length;
}

function constraintTypeLabel(type: string | undefined): string {
  if (type === "min") return "Minimum";
  if (type === "max") return "Maximum";
  return type ?? "Unknown bound";
}

function constraintStatusLabel(
  status: RosterSelectionConstraintStatus,
): string {
  if (status === "satisfied") return "Satisfied";
  if (status === "violated") return "Violated";
  return "Unresolved";
}

function constraintObservation(item: ConstraintSummaryItem): string {
  const limit =
    item.limit === undefined ? "unknown limit" : `limit ${formatNumber(item.limit)}`;
  if (item.observed !== undefined) {
    return `Observed ${formatNumber(item.observed)}, ${limit}`;
  }
  return `Possible ${formatNumber(item.minimum)} to ${formatNumber(
    item.maximum,
  )}, ${limit}`;
}

function RosterCostSummary({
  result,
}: {
  readonly result: ReturnType<typeof evaluateLocalRosterCosts>;
}) {
  if (!result.ok) {
    return (
      <section className="cost-summary" aria-labelledby="roster-cost-heading">
        <div className="cost-summary-heading">
          <div>
            <p className="eyebrow">Read-only evaluation</p>
            <h3 id="roster-cost-heading">Roster costs unavailable</h3>
          </div>
        </div>
        <p className="cost-boundary">
          The supported cost report could not be produced. Roster structure is
          unchanged.
        </p>
        <DiagnosticList diagnostics={result.diagnostics} />
      </section>
    );
  }

  const report = result.value;
  const excluded = excludedCostCount(report);
  const unresolved = report.selections.filter(
    ({ status }) => status !== "resolved",
  ).length;
  return (
    <section className="cost-summary" aria-labelledby="roster-cost-heading">
      <div className="cost-summary-heading">
        <div>
          <p className="eyebrow">Read-only evaluation</p>
          <h3 id="roster-cost-heading">Roster costs</h3>
        </div>
        <span
          className="completeness-badge"
          data-completeness={report.completeness}
        >
          {report.completeness === "complete"
            ? "Complete supported view"
            : "Incomplete supported view"}
        </span>
      </div>

      {report.totals.length === 0 ? (
        <p className="empty-costs">No supported numeric costs yet.</p>
      ) : (
        <ul className="cost-total-list">
          {report.totals.map((total) => (
            <li key={total.typeId}>
              <strong>{formatNumber(total.value)}</strong>
              <span>{total.costType.name ?? total.typeId}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="cost-boundary">
        {report.completeness === "complete"
          ? "All applicable behavior supported by this evaluation scope is reflected in these totals."
          : "These totals exclude unresolved data or behavior outside the supported evaluation scope."}
      </p>

      {(excluded > 0 || unresolved > 0 || result.diagnostics.length > 0) && (
        <details className="cost-details">
          <summary>
            Cost report details
            <span>
              {formatCount(result.diagnostics.length, "diagnostic")}
            </span>
          </summary>
          <dl>
            <Detail label="Excluded costs" value={String(excluded)} />
            <Detail label="Unresolved selections" value={String(unresolved)} />
            <Detail
              label="Diagnostics"
              value={String(result.diagnostics.length)}
            />
          </dl>
          <DiagnosticList diagnostics={result.diagnostics} />
        </details>
      )}
    </section>
  );
}

function excludedCostCount(report: RosterSelectionConditionCostReport): number {
  return report.selections.reduce(
    (total, selection) =>
      total +
      selection.costs.filter(({ status }) => status === "excluded").length,
    0,
  );
}

function RosterSelectionItem({
  session,
  selection,
  attentionSelectionIds,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
}: {
  readonly session: LocalRosterSession;
  readonly selection: RosterSelection;
  readonly attentionSelectionIds: ReadonlySet<string>;
  readonly onAddChild: (
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    group?: LocalRosterChildChoiceGroup,
  ) => void;
  readonly onRename: (
    id: SelectionOccurrenceId,
    name: string | undefined,
  ) => void;
  readonly onSetAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
  readonly onRemove: (id: SelectionOccurrenceId) => void;
}) {
  const childChoices = inspectLocalRosterChildChoices(
    session,
    selection.id,
  );
  const choice = localRosterSelectionChoice(session, selection.id);
  const name = selection.name ?? "Unnamed selection";
  const childrenContainAttention = selection.selections.some((child) =>
    selectionSubtreeHasAttention(child, attentionSelectionIds),
  );
  const [childrenOpen, setChildrenOpen] = useState(
    () =>
      selection.selections.length <= 2 || childrenContainAttention,
  );
  useEffect(() => {
    if (childrenContainAttention) setChildrenOpen(true);
  }, [childrenContainAttention]);
  return (
    <li
      className="roster-selection-item"
      id={selectionAnchor(selection.id)}
    >
      <div className="selection-occurrence">
        <span>
          <strong>{name}</strong>
          <small>{selection.id}</small>
        </span>
        <button
          type="button"
          aria-label={`Remove ${name} ${selection.id}`}
          onClick={() => onRemove(selection.id)}
        >
          Remove
        </button>
      </div>
      {childChoices.ok && childChoices.value.direct.length > 0 && (
        <div className="child-choice-list">
          {childChoices.value.direct.map((direct) => {
            const choiceName = selectionChoiceLabel(direct.choice);
            const status = directChoiceStatus(direct);
            const finiteMaximum =
              direct.maximum !== undefined &&
              Number.isFinite(direct.maximum)
                ? direct.maximum
                : undefined;
            return (
              <span
                className="direct-child-choice"
                key={selectionChoiceKey(direct.choice)}
                data-completeness={direct.completeness}
              >
                <button
                  type="button"
                  aria-label={`Add ${choiceName} to ${name} ${selection.id}`}
                  disabled={
                    finiteMaximum !== undefined &&
                    rosterSelectionsAmount(direct.selected) >= finiteMaximum
                  }
                  onClick={() =>
                    onAddChild(selection.id, direct.choice)
                  }
                >
                  Add {choiceName}
                </button>
                {status !== undefined && <small>{status}</small>}
              </span>
            );
          })}
        </div>
      )}
      {childChoices.ok && childChoices.value.groups.length > 0 && (
        <div className="child-choice-groups">
          {childChoices.value.groups.map((group) => (
            <RosterSelectionChoiceGroup
              key={selectionChoiceKey(group.group)}
              session={session}
              parent={selection}
              parentName={name}
              group={group}
              onChoose={onAddChild}
            />
          ))}
        </div>
      )}
      {!childChoices.ok && (
        <DiagnosticList diagnostics={childChoices.diagnostics} />
      )}
      {choice !== undefined && (
        <RosterSelectionDetails
          choice={choice}
          selection={selection}
          onRename={onRename}
          onSetAmount={onSetAmount}
        />
      )}
      {selection.selections.length > 0 && (
        <details
          className="selection-children"
          open={childrenOpen}
          aria-label={`Selected child occurrences ${formatCount(
            selection.selections.length,
            "selection",
          )}`}
          onToggle={(event) =>
            setChildrenOpen(event.currentTarget.open)
          }
        >
          <summary>
            Selected children
            <span>
              {formatCount(selection.selections.length, "selection")}
            </span>
          </summary>
          <ul>
            {selection.selections.map((child) => (
              <RosterSelectionItem
                key={child.id}
                session={session}
                selection={child}
                attentionSelectionIds={attentionSelectionIds}
                onAddChild={onAddChild}
                onRename={onRename}
                onSetAmount={onSetAmount}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function RosterSelectionChoiceGroup({
  session,
  parent,
  parentName,
  group,
  onChoose,
}: {
  readonly session: LocalRosterSession;
  readonly parent: RosterSelection;
  readonly parentName: string;
  readonly group: LocalRosterChildChoiceGroup;
  readonly onChoose: (
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    group: LocalRosterChildChoiceGroup,
  ) => void;
}) {
  const name =
    group.group.name ?? group.group.id ?? "Unnamed selection group";
  const finiteMaximum =
    group.maximum !== undefined && Number.isFinite(group.maximum)
      ? group.maximum
      : undefined;
  const blocksAdditionalChoices =
    finiteMaximum !== undefined &&
    finiteMaximum !== 1 &&
    rosterSelectionsAmount(group.selected) >= finiteMaximum;

  return (
    <fieldset
      className="child-choice-group"
      aria-label={`${name} choices for ${parentName} ${parent.id}`}
      data-completeness={group.completeness}
    >
      <legend>{name}</legend>
      <span className="child-choice-group-status">
        {selectionGroupStatus(group)}
      </span>
      {group.choices.length === 0 ? (
        <p>No resolved entries are available in this group.</p>
      ) : (
        <div className="child-choice-group-options">
          {group.choices.map((choice) => {
            const selected = group.selected.some(
              (selection) =>
                localRosterSelectionChoice(session, selection.id) ===
                choice,
            );
            const label = selectionChoiceLabel(choice);
            const displayLabel =
              choice.hidden === true ? `${label} (hidden)` : label;
            return (
              <button
                key={selectionChoiceKey(choice)}
                type="button"
                aria-pressed={selected}
                disabled={
                  (finiteMaximum === 1 && selected) ||
                  blocksAdditionalChoices
                }
                onClick={() => onChoose(parent.id, choice, group)}
              >
                {selected
                  ? `${displayLabel} selected`
                  : `Choose ${displayLabel}`}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

type DirectRule = BattleScribeRosterSelectionChoice["rules"][number];
type DirectProfile = BattleScribeRosterSelectionChoice["profiles"][number];

type SelectionRuleDetail =
  | { readonly origin: "Direct"; readonly value: DirectRule }
  | { readonly origin: "Linked"; readonly value: MaterializedRuleInfoLink };

type SelectionProfileDetail =
  | { readonly origin: "Direct"; readonly value: DirectProfile }
  | { readonly origin: "Linked"; readonly value: MaterializedProfileInfoLink };

function RosterSelectionDetails({
  choice,
  selection,
  onRename,
  onSetAmount,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly selection: RosterSelection;
  readonly onRename: (
    id: SelectionOccurrenceId,
    name: string | undefined,
  ) => void;
  readonly onSetAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
}) {
  const rules: readonly SelectionRuleDetail[] = [
    ...choice.rules.map((value) => ({ origin: "Direct" as const, value })),
    ...choice.materializedInfoLinks
      .filter(isMaterializedRuleInfoLink)
      .map((value) => ({ origin: "Linked" as const, value })),
  ];
  const profiles: readonly SelectionProfileDetail[] = [
    ...choice.profiles.map((value) => ({ origin: "Direct" as const, value })),
    ...choice.materializedInfoLinks
      .filter(isMaterializedProfileInfoLink)
      .map((value) => ({ origin: "Linked" as const, value })),
  ];
  const unresolved = choice.materializedInfoLinks.filter(
    isUnresolvedMaterializedInfoLink,
  );
  const infoGroups = [
    ...choice.materializedInfoGroups,
    ...choice.materializedInfoLinks.filter(isMaterializedInfoGroup),
  ];
  return (
    <details className="selection-details">
      <summary>
        <span>Selection details</span>
        <small>
          {formatCount(profiles.length, "profile")},{" "}
          {formatCount(rules.length, "rule")},{" "}
          {formatCount(infoGroups.length, "info group")}
        </small>
      </summary>

      <dl className="selection-definition-details">
        <Detail
          label="Definition"
          value={
            choice.kind === "selectionEntry"
              ? choice.type ?? "Selection entry"
              : "Selection group"
          }
        />
        <Detail label="Source" value={choice.definition.source.filename} />
        <Detail
          label="Hidden"
          value={
            choice.hidden === undefined ? "Not specified" : String(choice.hidden)
          }
        />
      </dl>

      <SelectionNameEditor
        selection={selection}
        definitionName={choice.name}
        onRename={onRename}
      />
      <SelectionAmountEditor
        selection={selection}
        defaultAmount={choice.defaultAmount}
        step={choice.step}
        onSetAmount={onSetAmount}
      />

      {profiles.length > 0 && (
        <section className="selection-info-section">
          <h4>Profiles</h4>
          <div className="selection-profile-list">
            {profiles.map((profile, index) => (
              <SelectionProfile
                key={selectionProfileKey(profile, index)}
                profile={profile}
              />
            ))}
          </div>
        </section>
      )}

      {rules.length > 0 && (
        <section className="selection-info-section">
          <h4>Rules</h4>
          <div className="selection-rule-list">
            {rules.map((rule, index) => (
              <SelectionRule key={selectionRuleKey(rule, index)} rule={rule} />
            ))}
          </div>
        </section>
      )}

      {infoGroups.length > 0 && (
        <section className="selection-info-section">
          <h4>Info groups</h4>
          <div className="selection-info-group-list">
            {infoGroups.map((infoGroup, index) => (
              <SelectionInfoGroup
                key={selectionInfoGroupKey(infoGroup, index)}
                infoGroup={infoGroup}
              />
            ))}
          </div>
        </section>
      )}

      {unresolved.length > 0 && (
        <section className="selection-info-section unresolved-info-links">
          <h4>Unresolved info links</h4>
          <ul>
            {unresolved.map((infoLink, index) => (
              <li key={unresolvedInfoLinkKey(infoLink, index)}>
                <strong>
                  {infoLink.link.name ??
                    infoLink.link.targetId ??
                    "Unnamed info link"}
                </strong>
                <span>{infoLink.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </details>
  );
}

function SelectionNameEditor({
  selection,
  definitionName,
  onRename,
}: {
  readonly selection: RosterSelection;
  readonly definitionName: string | undefined;
  readonly onRename: (
    id: SelectionOccurrenceId,
    name: string | undefined,
  ) => void;
}) {
  const id = useId();
  const [name, setName] = useState(selection.name ?? "");
  useEffect(() => setName(selection.name ?? ""), [selection.name]);
  const trimmed = name.trim();
  const canSave = trimmed !== "" && trimmed !== selection.name;
  const canReset = selection.name !== definitionName;
  return (
    <form
      className="selection-name-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onRename(selection.id, trimmed);
      }}
    >
      <label htmlFor={id}>Occurrence name</label>
      <div>
        <input
          id={id}
          value={name}
          required
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <button type="submit" disabled={!canSave}>
          Rename
        </button>
        <button
          type="button"
          disabled={!canReset}
          onClick={() => onRename(selection.id, definitionName)}
        >
          Reset
        </button>
      </div>
    </form>
  );
}

function SelectionAmountEditor({
  selection,
  defaultAmount,
  step,
  onSetAmount,
}: {
  readonly selection: RosterSelection;
  readonly defaultAmount: string | undefined;
  readonly step: string | undefined;
  readonly onSetAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
}) {
  const id = useId();
  const effectiveAmount = selection.amount ?? 1;
  const [amount, setAmount] = useState(String(effectiveAmount));
  useEffect(() => setAmount(String(effectiveAmount)), [effectiveAmount]);
  const parsed = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const canSave = valid && parsed !== effectiveAmount;
  const numericStep = positiveFiniteNumber(step);
  return (
    <form
      className="selection-amount-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSetAmount(selection.id, parsed);
      }}
    >
      <label htmlFor={id}>Amount</label>
      <div>
        <input
          id={id}
          type="number"
          min="0.000000001"
          step={numericStep ?? "any"}
          value={amount}
          aria-describedby={defaultAmount === undefined ? undefined : `${id}-hint`}
          onChange={(event) => setAmount(event.currentTarget.value)}
        />
        <button type="submit" disabled={!canSave}>
          Set amount
        </button>
        <button
          type="button"
          disabled={selection.amount === undefined}
          onClick={() => onSetAmount(selection.id, undefined)}
        >
          Use 1
        </button>
      </div>
      {defaultAmount !== undefined && (
        <small id={`${id}-hint`}>
          Source default: {defaultAmount}
          {numericStep === undefined ? "" : `; step ${numericStep}`}
        </small>
      )}
    </form>
  );
}

function positiveFiniteNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function SelectionProfile({
  profile,
}: {
  readonly profile: SelectionProfileDetail;
}) {
  const name =
    profile.origin === "Direct"
      ? profile.value.name
      : profile.value.name ?? profile.value.definition.name;
  const { typeName, characteristics } = profile.value;
  const source =
    profile.origin === "Direct"
      ? profile.value.source.filename
      : profile.value.definition.source.filename;
  return (
    <article className="selection-profile">
      <header>
        <div>
          <strong>{name ?? "Unnamed profile"}</strong>
          <span>{typeName ?? "Unspecified profile type"}</span>
        </div>
        <small>
          {profile.origin} | {source}
        </small>
      </header>
      {characteristics.length === 0 ? (
        <p>No characteristics.</p>
      ) : (
        <dl>
          {characteristics.map((characteristic, index) => (
            <div key={selectionCharacteristicKey(characteristic, index)}>
              <dt>
                {characteristic.name ??
                  characteristic.typeId ??
                  "Unnamed characteristic"}
              </dt>
              <dd>
                {characteristic.value === ""
                  ? "Empty value"
                  : characteristic.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

function SelectionRule({ rule }: { readonly rule: SelectionRuleDetail }) {
  const name =
    rule.origin === "Direct"
      ? rule.value.name
      : rule.value.name ?? rule.value.definition.name;
  const { description } = rule.value;
  const source =
    rule.origin === "Direct"
      ? rule.value.source.filename
      : rule.value.definition.source.filename;
  return (
    <article className="selection-rule">
      <header>
        <strong>{name ?? "Unnamed rule"}</strong>
        <small>
          {rule.origin} | {source}
        </small>
      </header>
      <p>
        {description === undefined
          ? "No description provided."
          : description === ""
            ? "Empty description."
            : description}
      </p>
    </article>
  );
}

function SelectionInfoGroup({
  infoGroup,
}: {
  readonly infoGroup: MaterializedInfoGroup;
}) {
  const profiles: readonly SelectionProfileDetail[] = [
    ...infoGroup.profiles.map((value) => ({
      origin: "Direct" as const,
      value,
    })),
    ...infoGroup.materializedInfoLinks
      .filter(isMaterializedProfileInfoLink)
      .map((value) => ({ origin: "Linked" as const, value })),
  ];
  const rules: readonly SelectionRuleDetail[] = [
    ...infoGroup.rules.map((value) => ({
      origin: "Direct" as const,
      value,
    })),
    ...infoGroup.materializedInfoLinks
      .filter(isMaterializedRuleInfoLink)
      .map((value) => ({ origin: "Linked" as const, value })),
  ];
  const nestedGroups = [
    ...infoGroup.materializedInfoGroups,
    ...infoGroup.materializedInfoLinks.filter(isMaterializedInfoGroup),
  ];
  const unresolved = infoGroup.materializedInfoLinks.filter(
    isUnresolvedMaterializedInfoLink,
  );
  return (
    <article className="selection-info-group">
      <header>
        <strong>{infoGroup.name ?? "Unnamed info group"}</strong>
        <small>
          {infoGroup.link === undefined ? "Direct" : "Linked"} |{" "}
          {infoGroup.definition.source.filename}
        </small>
      </header>

      {profiles.length > 0 && (
        <div className="selection-info-group-content">
          <h5>Profiles</h5>
          <div className="selection-profile-list">
            {profiles.map((profile, index) => (
              <SelectionProfile
                key={selectionProfileKey(profile, index)}
                profile={profile}
              />
            ))}
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div className="selection-info-group-content">
          <h5>Rules</h5>
          <div className="selection-rule-list">
            {rules.map((rule, index) => (
              <SelectionRule key={selectionRuleKey(rule, index)} rule={rule} />
            ))}
          </div>
        </div>
      )}

      {nestedGroups.length > 0 && (
        <div className="selection-info-group-content">
          <h5>Nested groups</h5>
          <div className="selection-info-group-list">
            {nestedGroups.map((nestedGroup, index) => (
              <SelectionInfoGroup
                key={selectionInfoGroupKey(nestedGroup, index)}
                infoGroup={nestedGroup}
              />
            ))}
          </div>
        </div>
      )}

      {unresolved.length > 0 && (
        <div className="selection-info-group-content unresolved-info-links">
          <h5>Unresolved info links</h5>
          <ul>
            {unresolved.map((infoLink, index) => (
              <li key={unresolvedInfoLinkKey(infoLink, index)}>
                <strong>
                  {infoLink.link.name ??
                    infoLink.link.targetId ??
                    "Unnamed info link"}
                </strong>
                <span>{infoLink.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function isMaterializedRuleInfoLink(
  infoLink:
    | BattleScribeRosterSelectionChoice["materializedInfoLinks"][number]
    | MaterializedInfoGroup["materializedInfoLinks"][number],
): infoLink is MaterializedRuleInfoLink {
  return infoLink.kind === "ruleInfoLink";
}

function isMaterializedProfileInfoLink(
  infoLink:
    | BattleScribeRosterSelectionChoice["materializedInfoLinks"][number]
    | MaterializedInfoGroup["materializedInfoLinks"][number],
): infoLink is MaterializedProfileInfoLink {
  return infoLink.kind === "profileInfoLink";
}

function isMaterializedInfoGroup(
  infoLink:
    | BattleScribeRosterSelectionChoice["materializedInfoLinks"][number]
    | MaterializedInfoGroup["materializedInfoLinks"][number],
): infoLink is MaterializedInfoGroup {
  return infoLink.kind === "infoGroup";
}

function isUnresolvedMaterializedInfoLink(
  infoLink:
    | BattleScribeRosterSelectionChoice["materializedInfoLinks"][number]
    | MaterializedInfoGroup["materializedInfoLinks"][number],
): infoLink is UnresolvedMaterializedInfoLink {
  return infoLink.kind === "unresolvedInfoLink";
}

function selectionProfileKey(
  profile: SelectionProfileDetail,
  index: number,
): string {
  const value =
    profile.origin === "Direct" ? profile.value : profile.value.definition;
  return JSON.stringify([
    profile.origin,
    value.source.sourceId,
    ...value.path,
    index,
  ]);
}

function selectionRuleKey(rule: SelectionRuleDetail, index: number): string {
  const value = rule.origin === "Direct" ? rule.value : rule.value.definition;
  return JSON.stringify([
    rule.origin,
    value.source.sourceId,
    ...value.path,
    index,
  ]);
}

function selectionInfoGroupKey(
  infoGroup: MaterializedInfoGroup,
  index: number,
): string {
  return JSON.stringify([
    infoGroup.occurrence.source.sourceId,
    ...infoGroup.occurrence.path,
    index,
  ]);
}

function selectionCharacteristicKey(
  characteristic: DirectProfile["characteristics"][number],
  index: number,
): string {
  return JSON.stringify([
    characteristic.source.sourceId,
    ...characteristic.path,
    index,
  ]);
}

function unresolvedInfoLinkKey(
  infoLink: UnresolvedMaterializedInfoLink,
  index: number,
): string {
  return JSON.stringify([
    infoLink.link.source.sourceId,
    ...infoLink.link.path,
    index,
  ]);
}

function Detail({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DiagnosticList({
  diagnostics,
}: {
  readonly diagnostics: readonly Diagnostic[];
}) {
  if (diagnostics.length === 0) return null;
  const visible = diagnostics.slice(0, 50);
  return (
    <ul className="diagnostic-list">
      {visible.map((diagnostic, index) => (
        <li key={`${diagnostic.code}:${index}`}>
          <span data-severity={diagnostic.severity}>{diagnostic.severity}</span>
          <div>
            <strong>{diagnostic.code}</strong>
            <p>{diagnostic.message}</p>
          </div>
        </li>
      ))}
      {diagnostics.length > visible.length && (
        <li className="diagnostic-overflow">
          {formatCount(diagnostics.length - visible.length, "additional issue")}
        </li>
      )}
    </ul>
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 20,
  }).format(value);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
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

function forceDefinitionKey(
  definition: BattleScribeForceDefinition,
): string {
  return JSON.stringify([
    definition.source.source.sourceId,
    ...definition.source.path,
  ]);
}

function forceDefinitionLabel(
  definition: BattleScribeForceDefinition,
): string {
  return definition.source.name ?? definition.source.id ?? "Unnamed force";
}

function rootChoiceKey(choice: LocalRosterRootChoice): string {
  return JSON.stringify([
    choice.visible.source.source.sourceId,
    ...choice.visible.source.path,
  ]);
}

function selectionAnchor(selectionId: SelectionOccurrenceId): string {
  return stableDomAnchor("roster-selection", selectionId);
}

function forceAnchor(forceId: string): string {
  return stableDomAnchor("roster-force", forceId);
}

function supportedValidationSelectionIds(
  findings: readonly SupportedRosterValidationFinding[],
): ReadonlySet<string> {
  const selectionIds = new Set<string>();
  for (const finding of findings) {
    if (finding.kind === "selectionConstraint") {
      selectionIds.add(finding.report.owner.id);
    } else if (
      finding.kind === "structural" &&
      finding.report.kind !== "root"
    ) {
      selectionIds.add(finding.report.owner.id);
    }
  }
  return selectionIds;
}

function selectionSubtreeHasAttention(
  selection: RosterSelection,
  attentionSelectionIds: ReadonlySet<string>,
): boolean {
  return (
    attentionSelectionIds.has(selection.id) ||
    selection.selections.some((child) =>
      selectionSubtreeHasAttention(child, attentionSelectionIds),
    )
  );
}

function stableDomAnchor(prefix: string, value: string): string {
  let first = 2_166_136_261;
  let second = 5_381;
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    first = Math.imul(first ^ code, 16_777_619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${prefix}-${value.length}-${(first >>> 0).toString(36)}-${(
    second >>> 0
  ).toString(36)}`;
}

function rootChoiceLabel(choice: LocalRosterRootChoice): string {
  return (
    choice.materialized.name ??
    choice.materialized.id ??
    "Unnamed selection"
  );
}

function rootChoiceStatus(
  state: LocalRosterRootChoiceState,
): string | undefined {
  const selectedAmount = rosterSelectionsAmount(state.selected);
  const selected = `${selectedAmount} selected`;
  if (state.completeness === "incomplete") {
    return `${selected}; supported bounds are incomplete`;
  }
  if (state.remaining !== undefined && state.remaining > 0) {
    return `${selected}; ${state.remaining} still required`;
  }
  if ((state.minimum ?? 0) > 0) {
    return `${selected}; requirement met`;
  }
  if (
    state.maximum !== undefined &&
    Number.isFinite(state.maximum)
  ) {
    return `${selected} of ${state.maximum} allowed`;
  }
  return selectedAmount > 0 ? selected : undefined;
}

function selectionChoiceKey(
  choice: BattleScribeRosterSelectionChoice,
): string {
  return JSON.stringify([
    choice.occurrence.source.sourceId,
    ...choice.occurrence.path,
  ]);
}

function selectionChoiceLabel(
  choice: BattleScribeRosterSelectionChoice,
): string {
  return choice.name ?? choice.id ?? "Unnamed selection";
}

function selectionGroupStatus(
  group: LocalRosterChildChoiceGroup,
): string {
  const selected = `${rosterSelectionsAmount(group.selected)} selected`;
  if (group.completeness === "incomplete") {
    return `${selected}; supported bounds are incomplete`;
  }
  if (group.remaining !== undefined && group.remaining > 0) {
    return `${selected}; ${group.remaining} still required`;
  }
  if ((group.minimum ?? 0) > 0) {
    return `${selected}; requirement met`;
  }
  if (
    group.maximum !== undefined &&
    Number.isFinite(group.maximum)
  ) {
    return `${selected} of ${group.maximum} allowed`;
  }
  return `${selected}; optional`;
}

function directChoiceStatus(
  direct: LocalRosterDirectChildChoice,
): string | undefined {
  const selectedAmount = rosterSelectionsAmount(direct.selected);
  const selected = `${selectedAmount} selected`;
  if (direct.completeness === "incomplete") {
    return `${selected}; supported bounds are incomplete`;
  }
  if (direct.remaining !== undefined && direct.remaining > 0) {
    return `${selected}; ${direct.remaining} still required`;
  }
  if ((direct.minimum ?? 0) > 0) {
    return `${selected}; requirement met`;
  }
  if (
    direct.maximum !== undefined &&
    Number.isFinite(direct.maximum)
  ) {
    return `${selected} of ${direct.maximum} allowed`;
  }
  return selectedAmount > 0 ? selected : undefined;
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
