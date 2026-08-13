import { DiagnosticList } from "./diagnostic-list.js";
import type { RemoteCatalogueSourceDefinition } from "./remote-catalogue-source.js";
import type { RemoteCatalogueSourceState } from "./use-remote-catalogue-source.js";
import { formatBytes, formatCount } from "./ui-format.js";

export function RemoteCatalogueSourcePanel({
  state,
  sources,
  onBrowse,
  onSelectPath,
  onOpen,
  onCancel,
}: {
  readonly state: RemoteCatalogueSourceState;
  readonly sources: readonly RemoteCatalogueSourceDefinition[];
  readonly onBrowse: (source: RemoteCatalogueSourceDefinition) => void;
  readonly onSelectPath: (path: string) => void;
  readonly onOpen: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <section
      className="remote-source-browser"
      aria-labelledby="remote-source-title"
    >
      <div className="remote-source-heading">
        <div>
          <p className="eyebrow">Pinned community data</p>
          <h2 id="remote-source-title">Browse a catalogue repository</h2>
        </div>
        <span className="remote-source-security">Verified Git blobs</span>
      </div>

      {state.kind === "idle" && (
        <div className="remote-source-list">
          {sources.map((source) => (
            <article className="remote-source-card" key={source.id}>
              <div>
                <strong>{source.title}</strong>
                <p>{source.description}</p>
                <small>
                  {source.repository.owner}/{source.repository.repository} at{" "}
                  {source.repository.revision.slice(0, 7)}
                </small>
              </div>
              <button type="button" onClick={() => onBrowse(source)}>
                Browse catalogues
              </button>
              {source.estimatedIndexBytes !== undefined && (
                <p className="remote-source-note">
                  First browse verifies about{" "}
                  {formatBytes(source.estimatedIndexBytes)}. Verified files are
                  cached in this browser.
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {state.kind === "indexing" && (
        <RemoteProgress
          title={"Indexing " + state.source.title}
          progress={state.progress}
          onCancel={onCancel}
        />
      )}

      {(state.kind === "ready" || state.kind === "acquiring") && (
        <div className="remote-catalogue-picker">
          <label htmlFor="remote-catalogue-path">Faction catalogue</label>
          <select
            id="remote-catalogue-path"
            value={state.selectedPath}
            disabled={state.kind === "acquiring"}
            onChange={(event) => onSelectPath(event.currentTarget.value)}
          >
            {state.index.catalogues.map((catalogue) => (
              <option key={catalogue.path} value={catalogue.path}>
                {catalogue.name}
              </option>
            ))}
          </select>
          <p>
            {formatCount(state.index.catalogues.length, "roster catalogue")} in{" "}
            {formatCount(state.index.report.files.length, "source file")}.
          </p>

          {state.kind === "ready" ? (
            <div className="remote-source-actions">
              <button
                className="primary-action"
                type="button"
                onClick={onOpen}
              >
                {state.loadedPath === state.selectedPath
                  ? "Reload selected catalogue"
                  : "Load selected catalogue"}
              </button>
              {state.message !== undefined && (
                <span role="status">{state.message}</span>
              )}
            </div>
          ) : (
            <RemoteProgress
              title="Acquiring catalogue dependencies"
              progress={state.progress}
              onCancel={onCancel}
              compact
            />
          )}

          {state.diagnostics.length > 0 && (
            <details className="remote-source-diagnostics">
              <summary>
                {formatCount(
                  state.diagnostics.length,
                  "repository diagnostic",
                )}
              </summary>
              <DiagnosticList diagnostics={state.diagnostics} />
            </details>
          )}
        </div>
      )}

      {state.kind === "failed" && (
        <div className="remote-source-failure" role="alert">
          <strong>{state.message}</strong>
          <p>
            Local file import remains available. Retry the immutable source when
            the network is available.
          </p>
          <button type="button" onClick={() => onBrowse(state.source)}>
            Retry repository
          </button>
          <DiagnosticList diagnostics={state.diagnostics} />
        </div>
      )}
    </section>
  );
}

function RemoteProgress({
  title,
  progress,
  onCancel,
  compact = false,
}: {
  readonly title: string;
  readonly progress: Extract<
    RemoteCatalogueSourceState,
    { readonly kind: "indexing" | "acquiring" }
  >["progress"];
  readonly onCancel: () => void;
  readonly compact?: boolean;
}) {
  const detail =
    progress === undefined || progress.phase === "listing"
      ? "Reading the pinned Git tree."
      : formatCount(progress.completedFiles, "file") +
        " of " +
        progress.totalFiles +
        " processed, " +
        formatBytes(progress.acceptedBytes) +
        " accepted.";

  return (
    <div className="remote-source-progress" data-compact={compact} role="status">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        {progress !== undefined &&
          progress.phase !== "listing" &&
          progress.currentPath !== undefined && (
          <small>{progress.currentPath}</small>
        )}
      </div>
      {progress !== undefined &&
        progress.phase !== "listing" &&
        progress.totalFiles > 0 && (
          <progress
            value={progress.completedFiles}
            max={progress.totalFiles}
            aria-label={title}
          />
        )}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
