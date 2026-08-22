import { useState } from "react";

import { DiagnosticList } from "./diagnostic-list.js";
import type { LocalRosterDraftSummary } from "./browser-drafts.js";
import type {
  DraftActionState,
  DraftShelfState,
} from "./use-app-controller.js";
import { formatBytes, formatCount, formatTimestamp } from "./ui-format.js";

/**
 * What the saved drafts actually cost this browser, and how many share each
 * batch.
 *
 * A draft summary reports its whole import batch, and batches are stored once
 * and shared, so summing the cards would count a catalogue closure again for
 * every draft that shares it — 8.2 MB per repeat for one faction. Counting each
 * batch once is the only number that means anything to someone deciding what to
 * delete.
 */
function sharedBatchBytes(drafts: readonly LocalRosterDraftSummary[]): {
  readonly total: number;
  readonly drafts: ReadonlyMap<string, number>;
} {
  const bytesByBatch = new Map<string, number>();
  const draftsByBatch = new Map<string, number>();
  for (const draft of drafts) {
    bytesByBatch.set(draft.batchId, draft.totalFileBytes);
    draftsByBatch.set(
      draft.batchId,
      (draftsByBatch.get(draft.batchId) ?? 0) + 1,
    );
  }
  let total = 0;
  for (const bytes of bytesByBatch.values()) total += bytes;
  return { total, drafts: draftsByBatch };
}

export function SavedDraftShelf({
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
  const batchBytes = sharedBatchBytes(state.drafts);
  return (
    <section className="saved-drafts" aria-labelledby="saved-drafts-heading">
      <div className="saved-drafts-heading">
        <div>
          <p className="eyebrow">Browser storage</p>
          <h2 id="saved-drafts-heading">Saved roster drafts</h2>
        </div>
        <span>
          {formatCount(state.drafts.length, "draft")}
          {batchBytes.total === 0
            ? ""
            : ` | ${formatBytes(batchBytes.total)}`}
        </span>
      </div>
      <p className="saved-drafts-note">
        Saved drafts stay in this browser and include the source files needed
        to rebuild their catalogue context. Drafts imported together share one
        copy of those files.
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
                    {(batchBytes.drafts.get(draft.batchId) ?? 1) > 1
                      ? " shared"
                      : ""}
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
