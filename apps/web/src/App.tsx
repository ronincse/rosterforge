import { useEffect, useId } from "react";

import type { BattleScribeForceDefinition } from "@rosterforge/data-graph";
import type { Diagnostic } from "@rosterforge/foundation";

import type {
  LocalCatalogueChoice,
  LocalCatalogueLibrary,
} from "./catalogue-library.js";
import { CatalogueDetails } from "./catalogue-details-panel.js";
import { CatalogueSetupContext } from "./catalogue-library-panel.js";
import { RosterOverview } from "./roster-workspace.js";
import { SavedDraftShelf } from "./saved-draft-shelf.js";
import { RemoteCatalogueSourcePanel } from "./remote-catalogue-source-panel.js";
import {
  useRemoteCatalogueSourceController,
  type RemoteCatalogueSourceControllerOptions,
} from "./use-remote-catalogue-source.js";
import {
  openRosterPrintView,
  type RosterPrintViewModel,
} from "./roster-print.js";
import {
  useRosterForgeAppController,
  type RosterForgeAppControllerOptions,
} from "./use-app-controller.js";
import {
  FailureState,
  IdleState,
  LoadingState,
} from "./workspace-states.js";

export type AppProps = RosterForgeAppControllerOptions &
  RemoteCatalogueSourceControllerOptions & {
    readonly printRoster?: (roster: RosterPrintViewModel) => boolean;
  };

const acceptedExtensions = ".gst,.cat,.gstz,.catz,.json";

export function App(props: AppProps) {
  const inputId = useId();
  const {
    loadState,
    draftShelf,
    draftAction,
    activeDraft,
    unsavedChanges,
    recoverableRoster,
    recoverUnsavedRoster,
    discardRecoverableRoster,
    selectedCatalogue,
    rosterHistory,
    rosterSession,
    rosterDiagnostics,
    openCatalogueLibrary,
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
  } = useRosterForgeAppController(props);

  const remoteSource = useRemoteCatalogueSourceController(
    (acquisition, diagnostics) =>
      openCatalogueLibrary(
        acquisition.library,
        diagnostics,
        acquisition.selectedCatalogueKey,
      ),
    props,
  );

  function handleFileInput(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    remoteSource.resetSource();
    void importFiles(files);
  }

  const activeRosterSession =
    loadState.kind === "loaded" &&
    rosterSession !== undefined &&
    rosterSession.catalogue.key === selectedCatalogue?.key
      ? rosterSession
      : undefined;
  useEffect(() => {
    // A browser tab represents the object the player is working on. Keep the
    // library and an open roster distinct here as well as in the visible shell.
    document.title = activeRosterSession?.roster.name ?? "Lists";
  }, [activeRosterSession?.roster.name]);

  return (
    <div
      className="app-shell"
      data-screen={activeRosterSession === undefined ? "library" : "roster"}
    >
      {activeRosterSession !== undefined ? (
        <main className="roster-screen">
          <section
            className="workspace roster-screen-workspace"
            aria-live="polite"
            aria-label="Open roster"
          >
            <div className="roster-screen-content">
              <RosterOverview
                session={activeRosterSession}
                diagnostics={rosterDiagnostics}
                onClear={clearRoster}
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
                onPrintRoster={props.printRoster ?? openRosterPrintView}
                isSavingDraft={draftAction.kind === "saving"}
                hasSavedDraft={activeDraft !== undefined}
                unsavedChanges={unsavedChanges}
                draftActionMessage={draftAction.message}
                draftActionDiagnostics={draftAction.diagnostics}
              />
            </div>
          </section>
        </main>
      ) : (
        <>
          <header className="site-header">
            <a className="brand" href="/" aria-label="RosterForge home">
              <span className="brand-mark" aria-hidden="true">
                RF
              </span>
              <span>RosterForge</span>
            </a>
            <span className="local-badge">
              <span className="local-dot" aria-hidden="true" />
              Local processing
            </span>
          </header>

          <main>
            <section className="hero" aria-labelledby="page-title">
              <p className="eyebrow">BattleScribe 2.03 catalogue reader</p>
              <h1 id="page-title">Build your roster. Keep your data local.</h1>
              <p className="hero-copy">
                Browse a pinned community repository or open game-system and
                catalogue files together. RosterForge verifies and reads them
                in this browser.
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
                Catalogue data is parsed locally. Nothing is uploaded. Drafts
                are saved when you choose Save draft, and kept current after
                that. Unsaved work is held for recovery until you save or
                discard it.
              </p>
            </section>

            {/* Offered rather than restored: silently reopening stale work from
                a previous session is its own kind of surprise. */}
            {recoverableRoster !== undefined && (
              <section className="recovery-prompt" aria-label="Unsaved roster">
                <p>
                  An unsaved roster from your last session was found:{" "}
                  <strong>{recoverableRoster.rosterName}</strong>.
                </p>
                <div className="recovery-actions">
                  <button
                    type="button"
                    onClick={() => void recoverUnsavedRoster()}
                  >
                    Recover roster
                  </button>
                  <button
                    type="button"
                    onClick={() => void discardRecoverableRoster()}
                  >
                    Discard
                  </button>
                </div>
              </section>
            )}

            <RemoteCatalogueSourcePanel
              state={remoteSource.state}
              sources={remoteSource.sources}
              onBrowse={(source) => void remoteSource.browseSource(source)}
              onSelectPath={remoteSource.selectCataloguePath}
              onOpen={() => void remoteSource.openSelectedCatalogue()}
              onCancel={remoteSource.cancelOperation}
            />

            <SavedDraftShelf
              state={draftShelf}
              action={draftAction}
              activeDraftId={activeDraft?.id}
              onLoad={(id) => void loadRosterDraft(id)}
              onDelete={(id) => void deleteRosterDraft(id)}
            />

            <section
              className="workspace"
              aria-live="polite"
              aria-busy={loadState.kind === "loading"}
            >
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
                  rosterDiagnostics={rosterDiagnostics}
                  onSelect={selectCatalogue}
                  onCreateRoster={createRoster}
                />
              )}
            </section>
          </main>

          <footer>
            <span>Open source. Local first.</span>
            <span>BattleScribe data remains yours.</span>
          </footer>
        </>
      )}
    </div>
  );
}
function LibraryWorkspace({
  library,
  diagnostics,
  selectedCatalogue,
  rosterDiagnostics,
  onSelect,
  onCreateRoster,
}: {
  readonly library: LocalCatalogueLibrary;
  readonly diagnostics: readonly Diagnostic[];
  readonly selectedCatalogue: LocalCatalogueChoice | undefined;
  readonly rosterDiagnostics: readonly Diagnostic[];
  readonly onSelect: (key: string) => void;
  readonly onCreateRoster: (
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) => void;
}) {
  return (
    <div className="library-layout">
      <section className="catalogue-inspector" aria-label="Roster setup">
        <CatalogueSetupContext
          library={library}
          diagnostics={diagnostics}
          selectedCatalogue={selectedCatalogue}
          onSelect={onSelect}
        />
        {selectedCatalogue === undefined ? (
          <div className="inspector-placeholder">
            <p className="eyebrow">Selection</p>
            <h2>No catalogue selected</h2>
            <p>Choose an available catalogue to continue.</p>
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
      </section>
    </div>
  );
}
