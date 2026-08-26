import { useEffect, useId, useMemo, useState } from "react";

import type {
  MaterializedInfoGroup,
  MaterializedProfileInfoLink,
  MaterializedRuleInfoLink,
  UnresolvedMaterializedInfoLink,
} from "@rosterforge/data-graph";
import {
  isActionableSupportedConstraintReport,
  isUnboundedConstraintValue,
  type RosterForceConstraintReport,
  type RosterProfileCharacteristicReport,
  type RosterSelectionConstraintReport,
  type RosterSelectionConstraintStatus,
  type RosterStructuralBoundReport,
  type RosterStructuralBoundStatus,
} from "@rosterforge/evaluation";
import type {
  Diagnostic,
  ValidationCompleteness,
} from "@rosterforge/foundation";
import {
  rosterSelectionAmount,
  rosterSelectionsAmount,
  type RosterSelection,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";

import { Detail } from "./detail-row.js";
import { DiagnosticList } from "./diagnostic-list.js";
import { forceDefinitionLabel } from "./force-definition.js";
import {
  evaluateLocalRosterCosts,
  inspectLocalRosterChildChoices,
  inspectLocalRosterRootChoices,
  inspectLocalRosterSelectionCategories,
  inspectLocalRosterSelectionAnnotation,
  inspectLocalRosterSelectionName,
  inspectLocalRosterSelectionCharacteristics,
  inspectLocalRosterSupportedValidation,
  localRosterSelectionChoice,
  type LocalRosterChildChoiceGroup,
  type LocalRosterCategoryInspection,
  type LocalRosterConstraintInspection,
  type LocalRosterDirectChildChoice,
  type LocalRosterProfile,
  type LocalRosterProfileCharacteristics,
  type LocalRosterRootChoice,
  type LocalRosterRootChoiceState,
  type LocalRosterSession,
} from "./roster-session.js";
import {
  createRosterWorkspaceViewModel,
  type RosterWorkspaceCost,
  type RosterWorkspaceSelection,
  type RosterWorkspaceSelectionCosts,
  type RosterWorkspaceSelectionGroup,
  type RosterWorkspaceViewModel,
} from "./roster-workspace-model.js";
import {
  createRosterPrintViewModel,
  type RosterPrintViewModel,
} from "./roster-print.js";
import { formatCount, formatNumber } from "./ui-format.js";

export function RosterOverview({
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
  onPrintRoster,
  isSavingDraft,
  hasSavedDraft,
  unsavedChanges,
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
  readonly onPrintRoster: (roster: RosterPrintViewModel) => boolean;
  readonly isSavingDraft: boolean;
  readonly hasSavedDraft: boolean;
  readonly unsavedChanges: boolean;
}) {
  const rootFilterId = useId();
  const [rootFilter, setRootFilter] = useState("");
  const [catalogueOpen, setCatalogueOpen] = useState(
    catalogueInitiallyOpen,
  );
  const [configurationOpen, setConfigurationOpen] = useState(true);
  const [printBlocked, setPrintBlocked] = useState(false);
  // One memoized projection keeps every reader-facing rule on the same
  // immutable session snapshot. Layout components consume this model; the raw
  // reports remain attached for the existing detailed inspectors and print
  // export until their later presentation checkpoints.
  const workspace = useMemo(
    () =>
      createRosterWorkspaceViewModel(session, {
        rootChoices: inspectLocalRosterRootChoices(session),
        costs: evaluateLocalRosterCosts(session),
        validation: inspectLocalRosterSupportedValidation(session),
      }),
    [session],
  );
  const force = workspace.primaryForce;
  const configurationGroup = workspace.selections.groups.find(
    ({ role }) => role.key === "configuration",
  );
  const hasConfiguration = configurationGroup !== undefined;
  const armyGroups = workspace.selections.groups.filter(
    ({ role }) => role.key !== "configuration",
  );
  const armyTopLevelSelectionCount = armyGroups.reduce(
    (count, group) => count + group.amount,
    0,
  );
  const rootChoiceInspection = workspace.reports.rootChoices;
  const rootChoiceGroups = workspace.rootChoices.groups;
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
  const costResult = workspace.reports.costs;
  const supportedValidation = workspace.reports.validation;
  // A group's total bound cannot answer whether one concrete member may be
  // repeated: Aeldari Detachments is unbounded while Warhost itself is max
  // one. Reuse the same-snapshot effective constraint reports already paid for
  // by the workspace model so Add another follows the exact occurrence. An
  // unresolved report stays permissive and incomplete rather than inventing a
  // limit; the separate deselect control still prevents an accidental re-add.
  const selectionCanAddAnother = useMemo(() => {
    const capacity = new Map<SelectionOccurrenceId, boolean>();
    if (!supportedValidation.ok) return capacity;
    for (const selection of
      supportedValidation.value.constraints.selections.selections) {
      const reachedMaximum = selection.constraints.some(
        (constraint) =>
          constraint.constraintType === "max" &&
          constraint.scope === "parent" &&
          constraint.constraint.field === "selections" &&
          constraint.completeness === "complete" &&
          constraint.limit !== undefined &&
          constraint.observed !== undefined &&
          Number.isFinite(constraint.limit) &&
          !isUnboundedConstraintValue(constraint.limit) &&
          constraint.observed >= constraint.limit,
      );
      capacity.set(selection.owner.id, !reachedMaximum);
    }
    return capacity;
  }, [supportedValidation]);
  const validationIssueCount = workspace.validation.issueCount;
  // A clean, complete roster can keep evaluator evidence out of the reading
  // path. Anything less certain opens itself: hiding an incomplete-but-valid
  // report would be just as misleading as hiding a known violation. A changed
  // problem count reopens it even when incompleteness was already keeping the
  // broad attention flag true; otherwise a newly introduced defect could stay
  // behind a disclosure the user closed earlier.
  const checksNeedAttention =
    !workspace.validation.available ||
    workspace.validation.validity !== "valid" ||
    workspace.validation.completeness === "incomplete";
  const [checksOpen, setChecksOpen] = useState(checksNeedAttention);
  useEffect(() => {
    if (checksNeedAttention) setChecksOpen(true);
  }, [checksNeedAttention, validationIssueCount]);
  const configurationNeedsAttention =
    configurationGroup?.selections.some(
      (selection) => selection.containsAttention,
    ) ?? false;
  useEffect(() => {
    // A newly-invalid setup must not remain hidden behind a disclosure the
    // player closed while it was valid. They may still close it deliberately
    // after reviewing the problem.
    if (configurationNeedsAttention) setConfigurationOpen(true);
  }, [configurationNeedsAttention]);
  useEffect(() => {
    // Each roster's setup is encountered open. Removing and later restoring
    // the configuration group is likewise a new setup encounter; ordinary
    // edits keep the player's explicit disclosure choice.
    if (hasConfiguration) setConfigurationOpen(true);
  }, [hasConfiguration, workspace.rosterId]);
  const limitBearingCost = workspace.costs.available
    ? workspace.costs.activeTotals.find(({ limit }) => limit !== undefined)
    : undefined;
  return (
    <div className="roster-overview">
      <RosterPlayerHeader workspace={workspace} />

      <div className="history-actions" aria-label="Roster actions">
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
        {/* Saving is manual, so an unsaved roster is lost on reload, and its
            undo history with it: a saved draft carries a trimmed history, one
            that was never saved has nowhere to put it. Say so rather than
            letting it look persisted. */}
        {unsavedChanges && (
          <span className="unsaved-changes" role="status">
            Unsaved changes
          </span>
        )}
        <button
          className="print-roster-action"
          type="button"
          onClick={() =>
            setPrintBlocked(
              !onPrintRoster(
                createRosterPrintViewModel(
                  session,
                  costResult,
                  supportedValidation,
                ),
              ),
            )
          }
        >
          Print / Save PDF
        </button>
      </div>
      {printBlocked && (
        <p className="print-roster-error" role="alert">
          The browser blocked the printable roster window. Allow popups for this
          local page and try again.
        </p>
      )}

      {configurationGroup !== undefined && (
        <RosterConfigurationSection
          group={configurationGroup}
          anchorId={stableDomAnchor(
            "roster-role",
            configurationGroup.role.key,
          )}
          open={configurationOpen}
          onToggle={() => setConfigurationOpen((open) => !open)}
          headlineCost={limitBearingCost}
          session={session}
          selectionCanAddAnother={selectionCanAddAnother}
          onAddChild={onAddChildSelection}
          onRename={onRenameSelection}
          onSetAmount={onSetSelectionAmount}
          onRemove={onRemoveSelection}
        />
      )}

      <nav
        className="roster-workspace-nav"
        aria-label="Roster workspace navigation"
      >
        <a
          href="#selected-roster-heading"
          aria-label={
            limitBearingCost?.limit === undefined
              ? `Roster, ${formatCount(
                  armyTopLevelSelectionCount,
                  "army selection",
                )}`
              : `Roster, ${formatNumber(limitBearingCost.value)} of ${formatNumber(
                  limitBearingCost.limit,
                )} ${limitBearingCost.name} used`
          }
        >
          {limitBearingCost?.limit === undefined ? (
            <>
              <span>Roster</span>
              <strong>{armyTopLevelSelectionCount}</strong>
              <small>army selections</small>
            </>
          ) : (
            <>
              <span>{limitBearingCost.name} used</span>
              <strong>
                {formatNumber(limitBearingCost.value)} /{" "}
                {formatNumber(limitBearingCost.limit)}
              </strong>
              <small>
                {limitBearingCost.value > limitBearingCost.limit
                  ? `${formatNumber(
                      limitBearingCost.value - limitBearingCost.limit,
                    )} over limit`
                  : `${formatNumber(
                      limitBearingCost.limit - limitBearingCost.value,
                    )} remaining`}
              </small>
            </>
          )}
        </a>
        <button
          type="button"
          aria-controls={catalogueOpen ? "root-choices-pane" : undefined}
          aria-expanded={catalogueOpen}
          aria-label={`${catalogueOpen ? "Hide" : "Show"} catalogue, ${formatCount(
            filteredRootChoiceCount,
            "available choice",
          )}`}
          onClick={() => setCatalogueOpen((open) => !open)}
        >
          <span>{catalogueOpen ? "Hide catalogue" : "Show catalogue"}</span>
          <strong>{filteredRootChoiceCount}</strong>
          <small>available choices</small>
        </button>
        <a
          href="#roster-checks-heading"
          aria-label={`Checks, ${formatCount(
            validationIssueCount,
            "known violation",
          )}`}
        >
          <span>Checks</span>
          <strong>{validationIssueCount}</strong>
          <small>known violations</small>
        </a>
      </nav>

      <section
        className="roster-builder-grid"
        aria-label="Roster builder"
        data-catalogue-open={catalogueOpen}
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
              {formatCount(
                armyTopLevelSelectionCount,
                "army selection",
              )}
            </span>
          </div>

          {/* Occurrence IDs stay on data attributes for anchors and tests.
              They are not shown to the reader. */}
          <div
            className="force-card"
            id={force === undefined ? undefined : forceAnchor(force.id)}
            data-force-id={force?.id}
          >
            <span className="force-kicker">Starting force</span>
            <strong>{forceDefinitionLabel(session.forceDefinition)}</strong>
          </div>

          {force === undefined || armyGroups.length === 0 ? (
            <div className="empty-selected-roster">
              <strong>No units added yet</strong>
              <span>Browse Add units to begin building this army.</span>
            </div>
          ) : (
            <div className="roster-selection-list">
              {/* One group per battlefield role, in catalogue order, so the
                  tree reads like an army list rather than a flat tree. The
                  configuration group lives before the sticky workspace so it
                  can be completed and dismissed before unit building begins.
                  A group renders only when it holds something: the add browser
                  exposes every role for discovery, and a missing required one
                  surfaces as a known problem in the checks rather than as an
                  empty heading here. */}
              {armyGroups.map((group) => (
                <RosterSelectionSection
                  key={group.role.key}
                  heading={group.role.name}
                  anchorId={stableDomAnchor("roster-role", group.role.key)}
                  roleKnown={group.role.known}
                  selections={group.selections}
                  amount={group.amount}
                  section="army"
                  collapsible
                  session={session}
                  selectionCanAddAnother={selectionCanAddAnother}
                  onAddChild={onAddChildSelection}
                  onRename={onRenameSelection}
                  onSetAmount={onSetSelectionAmount}
                  onRemove={onRemoveSelection}
                />
              ))}
            </div>
          )}
        </section>

        {catalogueOpen && (
          <section
            id="root-choices-pane"
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
                      group.section === "configuration"
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
                          rosterSelectionsAmount(state.selected) >=
                            finiteMaximum;
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
          </section>
        )}
      </section>

      {/* Command diagnostics also come from controls inside the roster pane.
          Keep them outside the optional catalogue so hiding the browser never
          hides an add, remove, rename, or amount failure. */}
      <DiagnosticList diagnostics={diagnostics} />

      <section
        className="roster-checks"
        aria-labelledby="roster-checks-heading"
        onClick={(event) => {
          if (!(event.target instanceof Element)) return;
          const anchor = event.target.closest(
            'a[href^="#"]',
          );
          const targetId = anchor?.getAttribute("href")?.slice(1);
          const target =
            targetId === undefined
              ? null
              : document.getElementById(decodeURIComponent(targetId));
          if (
            target !== null &&
            target.closest(".roster-configuration") !== null
          ) {
            // Exact report links can point into setup. Reveal that target
            // before the browser follows the fragment instead of leaving it
            // inside a player-collapsed details element.
            setConfigurationOpen(true);
          }
        }}
      >
        <div className="roster-checks-heading">
          <p className="eyebrow">Read-only checks</p>
          <h3 id="roster-checks-heading">Checks and diagnostics</h3>
        </div>
        <details
          className="roster-checks-report"
          aria-label="Detailed supported evidence"
          open={checksOpen}
        >
          <summary
            onClick={(event) => {
              // The `open` attribute is controlled so an attention transition
              // cannot race a delayed native toggle event from the prior click.
              event.preventDefault();
              setChecksOpen((open) => !open);
            }}
          >
            <span>Detailed supported evidence</span>
            <span>
              {workspace.validation.available
                ? `${formatCount(validationIssueCount, "known violation")} | ${
                    workspace.validation.completeness === "complete"
                      ? "complete inspection"
                      : "incomplete inspection"
                  }`
                : "Checks unavailable"}
            </span>
          </summary>
          <div className="roster-checks-report-body">
            <RosterStructuralStatus result={supportedValidation} />
            <RosterConstraintSummary result={supportedValidation} />
          </div>
        </details>
      </section>

      <button className="secondary-action" type="button" onClick={onClear}>
        Change roster setup
      </button>
    </div>
  );
}

/**
 * Starts narrow workspaces in the roster-first reading view while keeping the
 * catalogue present on desktop. This is intentionally an initial placement
 * decision, not a live media-query subscription: resizing must not overwrite a
 * reader's explicit catalogue choice.
 */
function catalogueInitiallyOpen(): boolean {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    !window.matchMedia("(max-width: 850px)").matches
  );
}

/**
 * The player-facing header: what the list is, what it costs, and what is wrong
 * with it.
 *
 * This replaces the separate cost and validation cards. Those framed the same
 * two numbers in the vocabulary of the thing that produced them — "Read-only
 * evaluation", "Supported validation", a satisfied/violated/unresolved triple —
 * rather than the vocabulary of the person reading them. A player acts on two
 * figures, the cost totals and the number of known problems, so those lead.
 *
 * Nothing the cards carried is dropped. Zero-value source costs, excluded and
 * unresolved counts, diagnostics, and the per-report completeness breakdown all
 * move into the disclosure below, and the two violation links appear only when
 * they point at something, so a clean roster stops reporting its own zeroes.
 *
 * Validity and completeness stay independent signals, as `AGENTS.md` requires:
 * "no known violations" and "the supported view is complete" are different
 * claims, and a roster can honestly be the first without being the second.
 * The completeness shown here is the model's conservative fold across both
 * reports; see `RosterWorkspaceHeaderSummary`.
 */
function RosterPlayerHeader({
  workspace,
}: {
  readonly workspace: RosterWorkspaceViewModel;
}) {
  const { costs, validation, header } = workspace;
  const structuralViolations = validation.available
    ? validation.structuralViolationCount
    : 0;
  const constraintViolations = validation.available
    ? validation.constraintViolationCount
    : 0;
  const costDiagnostics = costs.diagnostics.length;
  const validationDiagnostics = validation.diagnostics.length;
  const zeroTotals = costs.zeroTotals;
  // Two sibling disclosures rather than one nested pair. The zero-value cost
  // fields are a browsing affordance a player may open on their own; burying
  // them inside the report details would put them two clicks deep and behind an
  // unrelated heading.
  const hasReportDetails =
    costs.excludedCount > 0 ||
    costs.unresolvedSelectionCount > 0 ||
    costDiagnostics > 0 ||
    validationDiagnostics > 0 ||
    header.incomplete.length > 0;
  return (
    // A named landmark, not a bare <header>: nested inside the workspace
    // section a <header> element carries no role at all, so neither assistive
    // technology nor a role query could reach the roster's headline figures.
    <section
      className="roster-player-header"
      aria-label="Roster summary"
      data-validity={validation.available ? validation.validity : undefined}
    >
      <div className="player-header-identity">
        <h2>{workspace.name}</h2>
        <p className="catalogue-subtitle">{workspace.catalogueName}</p>
      </div>

      <div className="player-header-figures">
        {!costs.available ? (
          <p className="player-header-figure" data-figure="unavailable">
            <strong>&mdash;</strong>
            <span>costs unavailable</span>
          </p>
        ) : costs.activeTotals.length === 0 ? (
          <p className="player-header-figure" data-figure="empty">
            <strong>0</strong>
            <span>costs so far</span>
          </p>
        ) : (
          costs.activeTotals.map((total) => (
            <p className="player-header-figure" key={total.typeId}>
              <strong>
                {formatNumber(total.value)}
                {total.limit === undefined
                  ? ""
                  : ` / ${formatNumber(total.limit)}`}
              </strong>
              <span>{total.name}</span>
            </p>
          ))
        )}
        {validation.available ? (
          <a
            className="player-header-figure player-header-problems"
            href="#roster-checks-heading"
            data-problems={validation.issueCount === 0 ? "none" : "present"}
            aria-label={`Checks, ${formatCount(
              validation.issueCount,
              "known problem",
            )}`}
          >
            <strong>{validation.issueCount}</strong>
            <span>
              {validation.issueCount === 1 ? "known problem" : "known problems"}
            </span>
          </a>
        ) : (
          <p className="player-header-figure" data-figure="unavailable">
            <strong>&mdash;</strong>
            <span>checks unavailable</span>
          </p>
        )}
      </div>

      <div className="player-header-signals">
        {validation.available && (
          <span className="validity-badge" data-validity={validation.validity}>
            {validation.validity === "valid"
              ? "No known violations"
              : "Known violations"}
          </span>
        )}
        <span
          className="completeness-badge"
          data-completeness={header.completeness}
        >
          {header.completeness === "complete"
            ? "Complete supported view"
            : "Incomplete supported view"}
        </span>
      </div>

      {(structuralViolations > 0 || constraintViolations > 0) && (
        <nav className="player-header-links" aria-label="Known problems">
          {structuralViolations > 0 && (
            <a href="#roster-structural-status-heading">
              {formatCount(structuralViolations, "structural violation")}
            </a>
          )}
          {constraintViolations > 0 && (
            <a href="#roster-constraint-heading">
              {formatCount(constraintViolations, "constraint violation")}
            </a>
          )}
        </nav>
      )}

      <p className="player-header-boundary">
        Supported checks and costs only. This does not establish full
        BattleScribe legality, and it never blocks an edit.
      </p>

      {/* Community catalogues attach campaign bookkeeping fields to every
          unit, so a matched-play list carries a wall of zeroes. They stay
          reachable without standing beside the points. */}
      {zeroTotals.length > 0 && (
        <details
          className="player-header-details"
          aria-label={`Zero-value source cost fields ${formatCount(
            zeroTotals.length,
            "field",
          )}`}
        >
          <summary>
            Zero-value source cost fields
            <span>{formatCount(zeroTotals.length, "field")}</span>
          </summary>
          <ul className="zero-cost-list">
            {zeroTotals.map((total) => (
              <li key={total.typeId}>{total.name}</li>
            ))}
          </ul>
        </details>
      )}

      {hasReportDetails && (
        <details className="player-header-details">
          <summary>
            Report details
            <span>
              {formatCount(
                costDiagnostics + validationDiagnostics,
                "diagnostic",
              )}
            </span>
          </summary>

          {header.incomplete.length > 0 && (
            <p className="player-header-incomplete">
              {`Incomplete: ${header.incomplete
                .map((report) =>
                  report === "costs"
                    ? costs.available
                      ? "costs exclude unresolved data or unsupported behavior"
                      : "the cost report could not be produced"
                    : validation.available
                      ? "checks exclude behavior outside the supported scope"
                      : "the supported checks could not be composed",
                )
                .join("; ")}.`}
            </p>
          )}

          <dl>
            <Detail
              label="Excluded costs"
              value={String(costs.excludedCount)}
            />
            <Detail
              label="Unresolved selections"
              value={String(costs.unresolvedSelectionCount)}
            />
          </dl>
          <DiagnosticList diagnostics={costs.diagnostics} />
          <DiagnosticList diagnostics={validation.diagnostics} />
        </details>
      )}
    </section>
  );
}

function RosterStructuralStatus({
  result,
}: {
  readonly result: ReturnType<typeof inspectLocalRosterSupportedValidation>;
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
  const violatedBounds = report.bounds.filter(
    ({ status }) => status === "violated",
  );
  const unresolvedBounds = report.bounds.filter(
    ({ status }) => status === "unresolved",
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
          <span className="validity-badge" data-validity={report.validity}>
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
        <ConstraintStatus label="Violated" status="violated" value={violated} />
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
          {violatedBounds.length === 0 ? (
            <p className="empty-constraints">
              No supported structural requirement is known to be violated.
            </p>
          ) : (
            <StructuralBoundDetails
              title="Structural violations"
              bounds={violatedBounds}
              open
            />
          )}
          {unresolvedBounds.length > 0 && (
            <StructuralBoundDetails
              title="Unresolved structural bounds"
              bounds={unresolvedBounds}
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
            <span>{formatCount(diagnostics.length, "diagnostic")}</span>
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
          <li key={structuralBoundKey(bound)} data-status={bound.status}>
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
              {bound.completeness === "incomplete" ? " | Incomplete" : ""}
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

function structuralBoundName(bound: RosterStructuralBoundReport): string {
  if (bound.kind === "root") {
    return bound.root.materialized.name ?? "Unnamed root choice";
  }
  if (bound.kind === "direct") {
    return bound.choice.name ?? "Unnamed direct choice";
  }
  return bound.group.name ?? "Unnamed selection group";
}

function structuralBoundKind(bound: RosterStructuralBoundReport): string {
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

function structuralBoundKey(bound: RosterStructuralBoundReport): string {
  const source =
    bound.kind === "root"
      ? bound.root.materialized.occurrence
      : bound.kind === "direct"
        ? bound.choice.occurrence
        : bound.group.occurrence;
  const owner = bound.kind === "root" ? bound.force.id : bound.owner.id;
  return JSON.stringify([
    bound.kind,
    owner,
    source.source.sourceId,
    ...source.path,
  ]);
}

function structuralBoundTarget(bound: RosterStructuralBoundReport): string {
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
  readonly result: ReturnType<typeof inspectLocalRosterSupportedValidation>;
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
            <h3 id="roster-constraint-heading">
              Constraint report unavailable
            </h3>
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
  const violatedItems = items.filter(({ status }) => status === "violated");
  const unresolvedItems = items.filter(({ status }) => status === "unresolved");
  const satisfiedItems = items.filter(({ status }) => status === "satisfied");
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
        <ConstraintStatus
          label="Satisfied"
          status="satisfied"
          value={satisfied}
        />
        <ConstraintStatus label="Violated" status="violated" value={violated} />
        <ConstraintStatus
          label="Unresolved"
          status="unresolved"
          value={unresolved}
        />
      </ul>

      {items.length === 0 ? (
        <p className="empty-constraints">
          No supported actionable constraint bounds apply. Unsupported projected
          constraints remain available in diagnostics.
        </p>
      ) : (
        <>
          {violatedItems.length === 0 ? (
            <p className="empty-constraints">
              No inspected constraint bound is known to be violated.
            </p>
          ) : (
            <ConstraintItemDetails
              title="Constraint violations"
              items={violatedItems}
              open
            />
          )}
          {unresolvedItems.length > 0 && (
            <ConstraintItemDetails
              title="Unresolved constraint bounds"
              items={unresolvedItems}
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
      .map((constraint) => selectionConstraintSummaryItem(constraint)),
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
  // `-1` is the "no bound" sentinel, not a limit of minus one. Printing the
  // raw number would tell the reader they had exceeded a negative allowance.
  const limit =
    item.limit === undefined
      ? "unknown limit"
      : isUnboundedConstraintValue(item.limit)
        ? "no limit"
        : `limit ${formatNumber(item.limit)}`;
  if (item.observed !== undefined) {
    return `Observed ${formatNumber(item.observed)}, ${limit}`;
  }
  return `Possible ${formatNumber(item.minimum)} to ${formatNumber(
    item.maximum,
  )}, ${limit}`;
}

/**
 * The full-width setup step that precedes the sticky building workspace.
 *
 * Configuration remains present and expanded on first encounter, but the
 * player can collapse the whole step after choosing battle size, detachment,
 * and related options. The presentation model remains the sole authority on
 * which selections belong here.
 */
function RosterConfigurationSection({
  group,
  anchorId,
  open,
  onToggle,
  headlineCost,
  session,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
}: {
  readonly group: RosterWorkspaceSelectionGroup;
  readonly anchorId: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly headlineCost: RosterWorkspaceCost | undefined;
  readonly session: LocalRosterSession;
  readonly selectionCanAddAnother: ReadonlyMap<SelectionOccurrenceId, boolean>;
  readonly onAddChild: (
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    childGroup?: LocalRosterChildChoiceGroup,
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
  const containsAttention = group.selections.some(
    (selection) => selection.containsAttention,
  );
  return (
    <details
      className="roster-configuration"
      aria-labelledby={anchorId}
      open={open}
    >
      <summary
        onClick={(event) => {
          // Keep the disclosure controlled so roster updates cannot reset the
          // player's choice or race the attention-driven reopen above.
          event.preventDefault();
          onToggle();
        }}
      >
        <h3
          className="roster-configuration-summary-heading"
          id={anchorId}
          aria-label={group.role.name}
        >
          <span className="roster-configuration-title">
            <span className="eyebrow">Army setup</span>
            <span className="roster-configuration-name">
              {group.role.name}
            </span>
          </span>
          <span className="roster-configuration-meta">
            {headlineCost?.limit !== undefined && (
              <strong>
                {formatNumber(headlineCost.value)} /{" "}
                {formatNumber(headlineCost.limit)} {headlineCost.name}
              </strong>
            )}
            {containsAttention && (
              <span className="roster-configuration-attention">
                Contains known violation
              </span>
            )}
            <span>{formatCount(group.amount, "selection")}</span>
            <span>
              {open ? "Collapse configuration" : "Expand configuration"}
            </span>
          </span>
        </h3>
      </summary>
      <div className="roster-configuration-body">
        <RosterTopLevelSelectionList
          roleKnown={group.role.known}
          selections={group.selections}
          session={session}
          selectionCanAddAnother={selectionCanAddAnother}
          collapsible
          initiallyOpen
          onAddChild={onAddChild}
          onRename={onRename}
          onSetAmount={onSetAmount}
          onRemove={onRemove}
        />
      </div>
    </details>
  );
}

/**
 * One titled battlefield-role group inside the selected-roster tree.
 *
 * Renders nothing when empty. The amount is the model's summed occurrence
 * amount, matching the pane heading rather than counting nodes. This component
 * only renders the grouping already decided by the presentation model.
 */
function RosterSelectionSection({
  heading,
  anchorId,
  roleKnown,
  selections,
  amount,
  section,
  collapsible,
  session,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
}: {
  readonly heading: string;
  readonly anchorId: string;
  /**
   * False when the evaluator withheld these selections' effective primary
   * category, so the group says the role is unestablished instead of implying
   * the units genuinely have none.
   */
  readonly roleKnown: boolean;
  readonly selections: readonly RosterWorkspaceSelection[];
  readonly amount: number;
  readonly section: "configuration" | "army";
  /**
   * Army units start collapsed. Configuration entries start open inside the
   * already-collapsible setup step, then remember the player's own disclosure
   * choices as they work through it.
   */
  readonly collapsible: boolean;
  readonly session: LocalRosterSession;
  readonly selectionCanAddAnother: ReadonlyMap<SelectionOccurrenceId, boolean>;
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
  if (selections.length === 0) return null;
  // `containsAttention` is deliberately only a routing signal here. A role can
  // point the reader toward a problem below it, but only the exact selection's
  // `attention` flag may label a row as violating something.
  const containsAttention = selections.some(
    (selection) => selection.containsAttention,
  );
  return (
    <section
      className="roster-selection-section"
      aria-labelledby={anchorId}
      data-section={section}
    >
      <div
        className="roster-selection-section-heading"
        data-contains-attention={containsAttention}
      >
        <h4 id={anchorId}>{heading}</h4>
        <div className="roster-selection-section-meta">
          {containsAttention && <span>Contains known violation</span>}
          <span>{formatCount(amount, "selection")}</span>
        </div>
      </div>
      <RosterTopLevelSelectionList
        roleKnown={roleKnown}
        selections={selections}
        session={session}
        selectionCanAddAnother={selectionCanAddAnother}
        collapsible={collapsible}
        onAddChild={onAddChild}
        onRename={onRename}
        onSetAmount={onSetAmount}
        onRemove={onRemove}
      />
    </section>
  );
}

function RosterTopLevelSelectionList({
  roleKnown,
  selections,
  session,
  selectionCanAddAnother,
  collapsible,
  initiallyOpen = false,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
}: {
  readonly roleKnown: boolean;
  readonly selections: readonly RosterWorkspaceSelection[];
  readonly session: LocalRosterSession;
  readonly selectionCanAddAnother: ReadonlyMap<SelectionOccurrenceId, boolean>;
  readonly collapsible: boolean;
  readonly initiallyOpen?: boolean;
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
  return (
    <>
      {!roleKnown && (
        <p className="roster-selection-section-note">
          A category modifier moves these between roles, and that operation is
          not supported yet, so their battlefield role is not established here.
        </p>
      )}
      <ul className="roster-top-level-selection-list">
        {selections.map((selection) => (
          <RosterSelectionItem
            key={selection.occurrence.id}
            session={session}
            selectionModel={selection}
            selectionCanAddAnother={selectionCanAddAnother}
            topLevel
            collapsible={collapsible}
            initiallyOpen={initiallyOpen}
            onAddChild={onAddChild}
            onRename={onRename}
            onSetAmount={onSetAmount}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </>
  );
}

function RosterSelectionItem({
  session,
  selectionModel,
  topLevel = false,
  collapsible = false,
  initiallyOpen = false,
  collapseChildren = false,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
}: {
  readonly session: LocalRosterSession;
  readonly selectionModel: RosterWorkspaceSelection;
  /** Shows the recursive cost the projection already computed for this node. */
  readonly topLevel?: boolean;
  /** Collapses everything below the occurrence row behind a disclosure. */
  readonly collapsible?: boolean;
  /** Starts a collapsible setup occurrence open on first encounter. */
  readonly initiallyOpen?: boolean;
  /**
   * Keeps a promoted model's own wargear subtree lazy unless it needs
   * attention.
   */
  readonly collapseChildren?: boolean;
  readonly selectionCanAddAnother: ReadonlyMap<SelectionOccurrenceId, boolean>;
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
  const selection = selectionModel.occurrence;
  const childChoices = inspectLocalRosterChildChoices(session, selection.id);
  const choice = localRosterSelectionChoice(session, selection.id);
  const annotation = useMemo(
    () => inspectLocalRosterSelectionAnnotation(session, selection.id),
    [session, selection.id],
  );
  const name = selection.name ?? "Unnamed selection";
  // A catalogue `name` modifier refines the displayed name — the corpus uses it
  // for Crusade rank suffixes such as "(Battle-hardened)". It runs on whatever
  // the occurrence is currently called, so a user rename composes with it.
  const evaluatedName = useMemo(
    () => inspectLocalRosterSelectionName(session, selection.id, name),
    [session, selection.id, name],
  );
  const displayName =
    evaluatedName.ok && evaluatedName.value.value !== undefined
      ? evaluatedName.value.value
      : name;
  const nameIncomplete =
    !evaluatedName.ok || evaluatedName.value.completeness === "incomplete";
  const annotationValue = annotation.ok ? annotation.value.value : undefined;
  const annotatedName =
    annotationValue === undefined || annotationValue === ""
      ? displayName
      : `${displayName} (${annotationValue})`;
  const annotationIncomplete =
    !annotation.ok || annotation.value.completeness === "incomplete";
  // Only direct model children of a collapsible army card move into the reading
  // surface. Recursing would flatten automatic sub-units, while promoting
  // upgrades merely because they carry a profile would turn the unit card back
  // into the configuration tree this checkpoint is trying to keep lazy.
  const promotedModels: RosterWorkspaceSelection[] = [];
  const configurableSelections: RosterWorkspaceSelection[] = [];
  for (const child of selectionModel.selections) {
    const childChoice = localRosterSelectionChoice(
      session,
      child.occurrence.id,
    );
    if (
      choice !== undefined &&
      collapsible &&
      childChoice?.kind === "selectionEntry" &&
      childChoice.type === "model"
    ) {
      promotedModels.push(child);
    } else {
      // Unknown choices stay configurable. Treating an unresolved type as a
      // model would hide it from the only complete editing tree.
      configurableSelections.push(child);
    }
  }
  const childrenContainAttention = configurableSelections.some(
    ({ containsAttention }) => containsAttention,
  );
  const configurableSelectionLabel =
    promotedModels.length > 0
      ? "Wargear, Warlord and options"
      : "Models, wargear, Warlord and options";
  const configurableSelectionSummary =
    promotedModels.length > 0
      ? "Configure wargear, Warlord & options"
      : "Configure models, wargear & options";
  // A small ordinary subtree stays open when no promoted model section precedes
  // it. Promoted models keep their own options shut by default, and a unit with
  // promoted models keeps the remaining configuration out of the reading path.
  // Known descendant violations still open the exact disclosure that owns them;
  // unresolved bounds stay in the checks and do not expand the tree.
  const [childrenOpen, setChildrenOpen] = useState(
    () =>
      (!collapseChildren &&
        promotedModels.length === 0 &&
        configurableSelections.length <= 2) ||
      childrenContainAttention,
  );
  useEffect(() => {
    if (childrenContainAttention) setChildrenOpen(true);
  }, [childrenContainAttention]);
  const cardBodyId = useId();
  // A collapsible unit starts closed so a fifteen-unit army is a scannable
  // list of names and costs rather than fifteen open datasheets. The one
  // exception is the same as the child rule above: a unit holding a known
  // violation opens itself, because a problem nobody can see is worse than a
  // longer page. Unresolved bounds stay in the checks and do not expand it.
  const [cardOpen, setCardOpen] = useState(
    () => !collapsible || initiallyOpen || selectionModel.containsAttention,
  );
  useEffect(() => {
    if (collapsible && selectionModel.containsAttention) setCardOpen(true);
  }, [collapsible, selectionModel.containsAttention]);
  const bodyVisible = !collapsible || cardOpen;
  // This summary intentionally counts only direct children whose materialized
  // catalogue type is exactly `model`. Unresolved choices stay in the editing
  // tree rather than being guessed into a squad composition.
  const modelComposition =
    topLevel &&
    choice?.kind === "selectionEntry" &&
    choice.type === "unit" &&
    promotedModels.length > 0
      ? createModelComposition(session, promotedModels)
      : undefined;
  return (
    <li
      className="roster-selection-item"
      id={selectionAnchor(selection.id)}
      data-occurrence-id={selection.id}
      data-attention={selectionModel.attention ? "violation" : undefined}
      data-display-completeness={
        nameIncomplete || annotationIncomplete ? "incomplete" : "complete"
      }
    >
      <div className="selection-occurrence">
        <span className="selection-occurrence-heading">
          {collapsible ? (
            <button
              type="button"
              className="unit-card-toggle"
              aria-expanded={cardOpen}
              aria-controls={cardBodyId}
              onClick={() => setCardOpen((current) => !current)}
            >
              <strong>{annotatedName}</strong>
            </button>
          ) : (
            <strong>{annotatedName}</strong>
          )}
          {modelComposition !== undefined && (
            <span className="unit-model-total">
              {formatCount(modelComposition.total, "model")}
            </span>
          )}
        </span>
        <div className="selection-occurrence-actions">
          {/* This is presence, not a count: more than one supported finding can
              share an owner. The detailed checks remain authoritative and
              link back to this exact stable row. */}
          {selectionModel.attention && (
            <a
              className="selection-violation-link"
              href="#roster-checks-heading"
              aria-label={`Review known violations for ${annotatedName}`}
            >
              Known violation
            </a>
          )}
          {topLevel && <SelectionCostTotals costs={selectionModel.costs} />}
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={() => onRemove(selection.id)}
          >
            Remove
          </button>
        </div>
      </div>
      {modelComposition !== undefined && (
        <UnitCompositionSummary
          unitName={annotatedName}
          composition={modelComposition}
        />
      )}
      {/* Rendering the body only while open keeps a closed unit's child
          choices, datasheet, and subtree off the render path entirely, the
          same reason the children list below is lazy. */}
      {bodyVisible && (
        <div className="selection-card-body" id={cardBodyId}>
          {childChoices.ok && childChoices.value.direct.length > 0 && (
            <div className="child-choice-list">
              {childChoices.value.direct.map((direct) => {
                const choiceName = selectionChoiceLabel(direct.choice);
                const status = directChoiceStatus(direct);
                const selectedOccurrence = direct.selected.at(-1);
                const selectedAmount = rosterSelectionsAmount(direct.selected);
                const finiteMaximum =
                  direct.maximum !== undefined &&
                  Number.isFinite(direct.maximum)
                    ? direct.maximum
                    : undefined;
                const canAddAnother =
                  selectedOccurrence !== undefined &&
                  (finiteMaximum === undefined ||
                    selectedAmount < finiteMaximum) &&
                  (selectionCanAddAnother.get(selectedOccurrence.id) ?? true);
                if (
                  isModelChoice(direct.choice) &&
                  finiteMaximum !== 1
                ) {
                  return (
                    <ModelQuantityChoice
                      key={selectionChoiceKey(direct.choice)}
                      label={choiceName}
                      amount={selectedAmount}
                      completeness={direct.completeness}
                      status={status}
                      canIncrease={
                        (finiteMaximum === undefined ||
                          selectedAmount < finiteMaximum) &&
                        (selectedOccurrence === undefined || canAddAnother)
                      }
                      selectedOccurrence={selectedOccurrence}
                      onIncrease={() =>
                        onAddChild(selection.id, direct.choice)
                      }
                      onSetAmount={onSetAmount}
                      onRemove={onRemove}
                    />
                  );
                }
                const removalWouldViolateRequiredUpgrade =
                  directUpgradeRemovalWouldViolateMinimum(direct);
                return (
                  <span
                    className="direct-child-choice"
                    key={selectionChoiceKey(direct.choice)}
                    data-completeness={direct.completeness}
                    data-selected={
                      selectedOccurrence === undefined ? undefined : "true"
                    }
                  >
                    <button
                      type="button"
                      aria-pressed={selectedOccurrence !== undefined}
                      disabled={
                        removalWouldViolateRequiredUpgrade ||
                        (selectedOccurrence === undefined &&
                          finiteMaximum !== undefined &&
                          selectedAmount >= finiteMaximum)
                      }
                      onClick={() =>
                        selectedOccurrence === undefined
                          ? onAddChild(selection.id, direct.choice)
                          : onRemove(selectedOccurrence.id)
                      }
                    >
                      {selectedAmount > 1
                        ? `${choiceName} (${selectedAmount} selected)`
                        : choiceName}
                    </button>
                    {canAddAnother && (
                      <button
                        type="button"
                        onClick={() => onAddChild(selection.id, direct.choice)}
                      >
                        Add another {choiceName}
                      </button>
                    )}
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
                  selectionCanAddAnother={selectionCanAddAnother}
                  onChoose={onAddChild}
                  onSetAmount={onSetAmount}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
          {!childChoices.ok && (
            <DiagnosticList diagnostics={childChoices.diagnostics} />
          )}
          {/* Squad size lives on the model entry. Keep the amount editor here,
              not inside Selection details, so it is reachable without opening the
              datasheet. */}
          {choice?.kind === "selectionEntry" && choice.type === "model" && (
            <SelectionAmountEditor
              selection={selection}
              defaultAmount={choice.defaultAmount}
              step={choice.step}
              onSetAmount={onSetAmount}
              label="Models in this squad"
            />
          )}
          {choice !== undefined && (
            <>
              <RosterSelectionDatasheet
                session={session}
                choice={choice}
                selection={selection}
                displayNameIncomplete={nameIncomplete || annotationIncomplete}
              />
              {promotedModels.length > 0 && (
                <section className="selection-models" aria-label="Models">
                  <div className="selection-models-heading">
                    <h4>Models</h4>
                    <span>
                      {formatCount(
                        rosterSelectionsAmount(
                          promotedModels.map(({ occurrence }) => occurrence),
                        ),
                        "model",
                      )}
                    </span>
                  </div>
                  <ul>
                    {promotedModels.map((model) => (
                      <RosterSelectionItem
                        key={model.occurrence.id}
                        session={session}
                        selectionModel={model}
                        selectionCanAddAnother={selectionCanAddAnother}
                        collapsible
                        collapseChildren
                        onAddChild={onAddChild}
                        onRename={onRename}
                        onSetAmount={onSetAmount}
                        onRemove={onRemove}
                      />
                    ))}
                  </ul>
                </section>
              )}
              <RosterSelectionEdit
                choice={choice}
                selection={selection}
                onRename={onRename}
                onSetAmount={onSetAmount}
              />
            </>
          )}
          {configurableSelections.length > 0 && (
            <details
              className="selection-children"
              open={childrenOpen}
              aria-label={`${configurableSelectionLabel} for ${name}; ${formatCount(
                configurableSelections.length,
                "selection",
              )}`}
            >
              {/* Same controlled summary as Selection details: jsdom does not
                  toggle `<details>`, so a native click would set `open` without
                  rendering the lazy children. */}
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setChildrenOpen((current) => !current);
                }}
              >
                {configurableSelectionSummary}
                <span>
                  {formatCount(configurableSelections.length, "selection")}
                </span>
              </summary>
              {/* Same reason as the details panel: a collapsed list is still
                  built, and a squad of five models starts collapsed. Rendering it
                  only while open keeps a closed squad off the render path. */}
              {childrenOpen && (
                <ul>
                  {configurableSelections.map((child) => (
                    <RosterSelectionItem
                      key={child.occurrence.id}
                      session={session}
                      selectionModel={child}
                      selectionCanAddAnother={selectionCanAddAnother}
                      onAddChild={onAddChild}
                      onRename={onRename}
                      onSetAmount={onSetAmount}
                      onRemove={onRemove}
                    />
                  ))}
                </ul>
              )}
            </details>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The recursive cost the projection already folded for one selection.
 *
 * Reads `RosterWorkspaceSelection.costs`, which includes descendants, so a
 * squad's total already carries its wargear. Zero and unavailable totals render
 * nothing: a matched-play list should not grow a row of `0 Crusade: Experience`
 * beside every unit, and the header's disclosure remains where the full source
 * cost picture lives.
 */
function SelectionCostTotals({
  costs,
}: {
  readonly costs: RosterWorkspaceSelectionCosts;
}) {
  if (!costs.available) return null;
  const active = costs.totals.filter(({ value }) => value !== 0);
  if (active.length === 0) return null;
  return (
    <span className="selection-cost-totals">
      {active.map((total) => (
        <span key={total.typeId}>
          <strong>{formatNumber(total.value)}</strong> {total.name}
        </span>
      ))}
    </span>
  );
}

interface UnitComposition {
  readonly total: number;
  readonly entries: readonly {
    readonly key: string;
    readonly name: string;
    readonly amount: number;
  }[];
}

/**
 * Folds exact promoted model occurrences into the compact unit-card summary.
 *
 * Repeated occurrences and one occurrence with an amount override are the two
 * legal roster shapes for multiple models. Both count through the roster-model
 * helper. Grouping keys come from the exact materialized model choice rather
 * than a player rename or display-only name modifier, so the rows describe
 * catalogue model types without inventing loadout text.
 */
function createModelComposition(
  session: LocalRosterSession,
  models: readonly RosterWorkspaceSelection[],
): UnitComposition {
  const entries = new Map<
    string,
    { key: string; name: string; amount: number }
  >();
  let total = 0;
  for (const { occurrence } of models) {
    const amount = rosterSelectionAmount(occurrence);
    const choice = localRosterSelectionChoice(session, occurrence.id);
    const name =
      choice === undefined
        ? occurrence.name ?? "Unnamed model"
        : selectionChoiceLabel(choice);
    const key =
      choice === undefined
        ? `occurrence:${occurrence.id}`
        : selectionChoiceKey(choice);
    total += amount;
    const existing = entries.get(key);
    entries.set(key, {
      key,
      name,
      amount: (existing?.amount ?? 0) + amount,
    });
  }
  return {
    total,
    entries: [...entries.values()],
  };
}

function UnitCompositionSummary({
  unitName,
  composition,
}: {
  readonly unitName: string;
  readonly composition: UnitComposition;
}) {
  return (
    <section
      className="unit-composition"
      aria-label={`Unit composition for ${unitName}`}
    >
      <ul>
        {composition.entries.map((entry) => (
          <li key={entry.key}>
            <span aria-hidden="true">&bull;</span>
            <span>
              {entry.amount}&times; {entry.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function isModelChoice(
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  return choice.kind === "selectionEntry" && choice.type === "model";
}

/**
 * Prevents the quick-choice control from removing mandatory direct wargear.
 *
 * Replacement weapons live in selection-entry groups, so they deliberately
 * bypass this rule. Incomplete bounds also remain editable: treating an
 * unresolved minimum as authoritative would turn unsupported semantics into a
 * silently enforced restriction.
 */
function directUpgradeRemovalWouldViolateMinimum(
  direct: LocalRosterDirectChildChoice,
): boolean {
  if (
    direct.choice.kind !== "selectionEntry" ||
    direct.choice.type !== "upgrade" ||
    direct.completeness !== "complete" ||
    direct.minimum === undefined ||
    !Number.isFinite(direct.minimum) ||
    direct.minimum <= 0
  ) {
    return false;
  }

  const selectedOccurrence = direct.selected.at(-1);
  return (
    selectedOccurrence !== undefined &&
    rosterSelectionsAmount(direct.selected) -
      rosterSelectionAmount(selectedOccurrence) <
      direct.minimum
  );
}

/** Describes the one-model mutation behind a quantity control's minus button. */
export function modelQuantityDecreaseAction(
  selection: RosterSelection,
):
  | { readonly kind: "setAmount"; readonly amount: number }
  | { readonly kind: "remove" } {
  const amount = rosterSelectionAmount(selection);
  return amount > 1
    ? { kind: "setAmount", amount: amount - 1 }
    : { kind: "remove" };
}

/**
 * Explicit count controls for repeatable model choices.
 *
 * A plus creates a fresh occurrence because copies may later carry different
 * configured subtrees. A minus reduces an amount override by one when present,
 * otherwise it removes only the newest occurrence. That makes each click a
 * one-model change without flattening distinct loadouts into one occurrence.
 */
function ModelQuantityChoice({
  label,
  amount,
  completeness,
  status,
  canIncrease,
  selectedOccurrence,
  onIncrease,
  onSetAmount,
  onRemove,
}: {
  readonly label: string;
  readonly amount: number;
  readonly completeness: ValidationCompleteness;
  readonly status?: string | undefined;
  readonly canIncrease: boolean;
  readonly selectedOccurrence?: RosterSelection | undefined;
  readonly onIncrease: () => void;
  readonly onSetAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
  readonly onRemove: (id: SelectionOccurrenceId) => void;
}) {
  return (
    <span
      className="model-quantity-choice"
      data-completeness={completeness}
    >
      <strong>{label}</strong>
      <span className="model-quantity-controls">
        <button
          type="button"
          aria-label={`Remove one ${label}`}
          disabled={selectedOccurrence === undefined}
          onClick={() => {
            if (selectedOccurrence === undefined) return;
            const action = modelQuantityDecreaseAction(selectedOccurrence);
            if (action.kind === "setAmount") {
              onSetAmount(
                selectedOccurrence.id,
                action.amount,
              );
            } else {
              onRemove(selectedOccurrence.id);
            }
          }}
        >
          &minus;
        </button>
        <output aria-label={`${label} selected count`}>{amount}</output>
        <button
          type="button"
          aria-label={`Add one ${label}`}
          disabled={!canIncrease}
          onClick={onIncrease}
        >
          +
        </button>
      </span>
      {status !== undefined && <small>{status}</small>}
    </span>
  );
}

function RosterSelectionChoiceGroup({
  session,
  parent,
  parentName,
  group,
  selectionCanAddAnother,
  onChoose,
  onSetAmount,
  onRemove,
}: {
  readonly session: LocalRosterSession;
  readonly parent: RosterSelection;
  readonly parentName: string;
  readonly group: LocalRosterChildChoiceGroup;
  readonly selectionCanAddAnother: ReadonlyMap<SelectionOccurrenceId, boolean>;
  readonly onChoose: (
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    group: LocalRosterChildChoiceGroup,
  ) => void;
  readonly onSetAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
  readonly onRemove: (id: SelectionOccurrenceId) => void;
}) {
  const name = group.group.name ?? group.group.id ?? "Unnamed selection group";
  const finiteMaximum =
    group.maximum !== undefined && Number.isFinite(group.maximum)
      ? group.maximum
      : undefined;
  const selectedAmount = rosterSelectionsAmount(group.selected);
  const blocksAdditionalChoices =
    finiteMaximum !== undefined &&
    finiteMaximum !== 1 &&
    selectedAmount >= finiteMaximum;
  const groupAllowsAnotherCopy =
    finiteMaximum === undefined || selectedAmount < finiteMaximum;

  return (
    <fieldset
      className="child-choice-group"
      aria-label={`${name} choices for ${parentName}`}
      data-completeness={group.completeness}
    >
      <legend>{name}</legend>
      <span className="child-choice-group-status">
        {selectionGroupStatus(group)}
      </span>
      {group.choices.length === 0 ? (
        // "Nothing here" and "nothing yet" look identical to a user otherwise,
        // and the second is much more common: a group whose options depend on a
        // detachment offers none until one is chosen.
        <p>
          {group.hiddenChoiceCount > 0
            ? `No options are available yet: ${group.hiddenChoiceCount} ${
                group.hiddenChoiceCount === 1 ? "entry" : "entries"
              } in this group depend on a choice not yet made.`
            : "No entries are defined in this group."}
        </p>
      ) : (
        <div className="child-choice-group-options">
          {group.choices.map((choice) => {
            const selectedOccurrences = group.selected.filter(
              (selection) =>
                localRosterSelectionChoice(session, selection.id) === choice,
            );
            const selectedOccurrence = selectedOccurrences.at(-1);
            const selected = selectedOccurrence !== undefined;
            const selectedChoiceAmount = rosterSelectionsAmount(
              selectedOccurrences,
            );
            const canAddAnother =
              selectedOccurrence !== undefined &&
              groupAllowsAnotherCopy &&
              (selectionCanAddAnother.get(selectedOccurrence.id) ?? true);
            const label = selectionChoiceLabel(choice);
            const displayLabel =
              choice.hidden === true ? `${label} (hidden)` : label;
            if (isModelChoice(choice) && finiteMaximum !== 1) {
              return (
                <ModelQuantityChoice
                  key={selectionChoiceKey(choice)}
                  label={displayLabel}
                  amount={selectedChoiceAmount}
                  completeness={group.completeness}
                  canIncrease={
                    !blocksAdditionalChoices &&
                    (selectedOccurrence === undefined || canAddAnother)
                  }
                  selectedOccurrence={selectedOccurrence}
                  onIncrease={() => onChoose(parent.id, choice, group)}
                  onSetAmount={onSetAmount}
                  onRemove={onRemove}
                />
              );
            }
            return selectedOccurrence === undefined ? (
              <button
                key={selectionChoiceKey(choice)}
                type="button"
                aria-pressed={false}
                disabled={blocksAdditionalChoices}
                onClick={() => onChoose(parent.id, choice, group)}
              >
                {displayLabel}
              </button>
            ) : (
              <span
                className="child-choice-group-selected-option"
                key={selectionChoiceKey(choice)}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  // Repeated choices can carry different configured subtrees.
                  // Remove only the newest one so recovery is undoable and
                  // never silently destroys the older configured copies.
                  onClick={() => onRemove(selectedOccurrence.id)}
                >
                  {selectedChoiceAmount > 1
                    ? `${displayLabel} (${selectedChoiceAmount} selected)`
                    : displayLabel}
                </button>
                {canAddAnother && (
                  <button
                    type="button"
                    onClick={() => onChoose(parent.id, choice, group)}
                  >
                    Add another {displayLabel}
                  </button>
                )}
              </span>
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

function RosterSelectionDatasheet({
  session,
  choice,
  selection,
  displayNameIncomplete,
}: {
  readonly session: LocalRosterSession;
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly selection: RosterSelection;
  readonly displayNameIncomplete: boolean;
}) {
  // The datasheet is the reason a player opens a unit, so it is no longer behind
  // a second click. Laziness is preserved by *mounting*: this component renders
  // only inside `selection-card-body`, which exists only when the card is open
  // (`bodyVisible`), so a closed unit still computes nothing. That matters for
  // the same reason as before — a closed `<details>` built its contents anyway,
  // and on a fifteen-unit Dark Angels army 181 of 214 were closed while React
  // rebuilt every one of them on every edit.
  //
  // Both inspections are cached per session (`roster-session.ts`), which covers
  // repeated renders within one snapshot but *not* an edit, since an edit makes
  // a new session. Measured cost of many open datasheets per edit is recorded in
  // the checkpoint entry.
  const characteristics = useMemo(
    () => inspectLocalRosterSelectionCharacteristics(session, selection.id),
    [session, selection.id],
  );
  const categories = useMemo(
    () => inspectLocalRosterSelectionCategories(session, selection.id),
    [session, selection.id],
  );
  const reports =
    characteristics.ok === true ? characteristics.value.byProfile : undefined;
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
    <div className="selection-datasheet">
      {/* Keep unresolved display-name warnings, but not as a banner on
          every occurrence. Completeness of the name report is unchanged. */}
      {displayNameIncomplete && (
        <p className="selection-annotation-completeness">
          Some display naming is unresolved for this selection.
        </p>
      )}

      {categories.ok === true && (
        <SelectionKeywords inspection={categories.value} />
      )}

      {profiles.length > 0 && (
        <section className="selection-info-section">
          <h4>Profiles</h4>
          <div className="selection-profile-list">
            {profiles.map((profile, index) => (
              <SelectionProfile
                key={selectionProfileKey(profile, index)}
                profile={profile}
                report={reports?.get(profile.value)}
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
                reports={reports}
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
    </div>
  );
}

function RosterSelectionEdit({
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
  const [editing, setEditing] = useState(false);
  return (
    // Renaming an occurrence, setting a non-model amount, and the definition
    // provenance rows are build-time work, not reading material. Open state is
    // controlled because jsdom does not implement native `<details>` toggling.
    <details className="selection-edit" open={editing}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          setEditing((current) => !current);
        }}
      >
        <span>Edit selection</span>
        <small>Name, amount, and source</small>
      </summary>
      {editing && (
        <>
          <dl className="selection-definition-details">
            <Detail
              label="Definition"
              value={
                choice.kind === "selectionEntry"
                  ? (choice.type ?? "Selection entry")
                  : "Selection group"
              }
            />
            <Detail
              label="Source"
              value={choice.definition.source.filename}
            />
            <Detail
              label="Hidden"
              value={
                choice.hidden === undefined
                  ? "Not specified"
                  : String(choice.hidden)
              }
            />
          </dl>
          <SelectionNameEditor
            selection={selection}
            definitionName={choice.name}
            onRename={onRename}
          />
          {(choice.kind !== "selectionEntry" || choice.type !== "model") && (
            <SelectionAmountEditor
              selection={selection}
              defaultAmount={choice.defaultAmount}
              step={choice.step}
              onSetAmount={onSetAmount}
            />
          )}
        </>
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
  label = "Amount",
}: {
  readonly selection: RosterSelection;
  readonly defaultAmount: string | undefined;
  readonly step: string | undefined;
  readonly onSetAmount: (
    id: SelectionOccurrenceId,
    amount: number | undefined,
  ) => void;
  readonly label?: string;
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
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          type="number"
          min="0.000000001"
          step={numericStep ?? "any"}
          value={amount}
          aria-describedby={
            defaultAmount === undefined ? undefined : `${id}-hint`
          }
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

function SelectionKeywords({
  inspection,
}: {
  readonly inspection: LocalRosterCategoryInspection;
}) {
  const { categories, removed, completeness } = inspection;
  if (categories === undefined && removed.length === 0) {
    return (
      <section className="selection-info-section selection-keywords">
        <h4>Keywords</h4>
        <p className="keywords-unresolved">
          Effective keywords are unresolved for this selection.
        </p>
      </section>
    );
  }
  return (
    <section
      className="selection-info-section selection-keywords"
      data-completeness={completeness}
    >
      <h4>Keywords</h4>
      {categories === undefined ? (
        <p className="keywords-unresolved">
          Effective keywords are unresolved for this selection.
        </p>
      ) : categories.length === 0 ? (
        <p>No keywords.</p>
      ) : (
        <ul className="keyword-list">
          {categories.map((category) => (
            <li
              key={category.id}
              data-added={category.added ? "true" : undefined}
              data-primary={category.primary ? "true" : undefined}
            >
              {category.name}
              {category.added && <small>added</small>}
            </li>
          ))}
        </ul>
      )}
      {/* A removed keyword is shown struck through rather than hidden, so the
          source declaration stays visible. */}
      {removed.length > 0 && (
        <ul className="keyword-list removed-keywords">
          {removed.map((category) => (
            <li key={category.id}>
              <s>{category.name}</s>
              <small>removed</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SelectionProfile({
  profile,
  report,
}: {
  readonly profile: SelectionProfileDetail;
  readonly report: LocalRosterProfileCharacteristics | undefined;
}) {
  const baseName =
    profile.origin === "Direct"
      ? (profile.value.name ?? "Unnamed profile")
      : (profile.value.name ??
        profile.value.definition.name ??
        "Unnamed profile");
  const { typeName, characteristics } = profile.value;
  // Effective name runs before annotation: "Mortifier w/ sarcophagus" can
  // still receive a separate parenthesized decoration. An unresolved name
  // falls back to the source while the profile's incomplete note stays visible.
  const displayName = report?.name.value ?? baseName;
  const annotation = report?.annotation.value;
  const annotatedName =
    annotation === undefined || annotation === ""
      ? displayName
      : `${displayName} (${annotation})`;
  const source =
    profile.origin === "Direct"
      ? profile.value.source.filename
      : profile.value.definition.source.filename;
  return (
    <article
      className="selection-profile"
      {...(report === undefined
        ? {}
        : { "data-completeness": report.completeness })}
    >
      <header>
        <div>
          <strong>{annotatedName}</strong>
          <span>{typeName ?? "Unspecified profile type"}</span>
        </div>
        <small>
          {profile.origin} | {source}
        </small>
      </header>
      {/* A hidden profile is labelled, never removed, so nothing the source
          declares disappears from the occurrence. */}
      {report?.visibility.status === "hidden" && (
        <p className="profile-visibility">Hidden by this catalogue.</p>
      )}
      {report?.visibility.status === "unresolved" && (
        <p className="profile-visibility">Visibility unresolved.</p>
      )}
      {report?.completeness === "incomplete" && (
        <p className="profile-completeness">
          Some display behavior on this profile is unsupported, so these values
          are not a complete result.
        </p>
      )}
      {characteristics.length === 0 ? (
        <p>No characteristics.</p>
      ) : (
        <dl>
          {characteristics.map((characteristic, index) => (
            <SelectionCharacteristic
              key={selectionCharacteristicKey(characteristic, index)}
              characteristic={characteristic}
              report={report?.report.characteristics.find(
                (candidate) => candidate.characteristic === characteristic,
              )}
            />
          ))}
        </dl>
      )}
    </article>
  );
}

function SelectionCharacteristic({
  characteristic,
  report,
}: {
  readonly characteristic: DirectProfile["characteristics"][number];
  readonly report:
    RosterProfileCharacteristicReport["characteristics"][number] | undefined;
}) {
  const modified = report !== undefined && report.steps.length > 0;
  const unresolved = modified && report.value === undefined;
  // An unresolved sequence still shows the source value, labelled as the base,
  // so nothing provisional is presented as an effective result.
  const displayed = report?.value ?? characteristic.value;
  const changed = modified && !unresolved && displayed !== report.baseValue;
  // A step routed here by another selection's `affects` selector is worth
  // naming: without it the reader cannot tell why a weapon's stat differs from
  // the one printed on its own datasheet.
  const routedStep = report?.steps.find((step) => step.origin === "affects");
  const routedName =
    routedStep === undefined
      ? undefined
      : (routedStep.declaredBy.name ?? "another selection");
  // The verb has to match the operation. An `append` adds to the printed value
  // rather than replacing it, and calling that "set" would misdescribe what the
  // reader is looking at.
  const routedVerb =
    routedStep !== undefined &&
    routedStep.status !== "notApplicable" &&
    routedStep.kind === "append"
      ? "Added"
      : "Set";
  return (
    <div
      {...(report === undefined
        ? {}
        : { "data-completeness": report.completeness })}
      {...(routedName === undefined ? {} : { "data-routed": "true" })}
    >
      <dt>
        {characteristic.name ??
          characteristic.typeId ??
          "Unnamed characteristic"}
      </dt>
      <dd>
        <span>{displayed === "" ? "Empty value" : displayed}</span>
        {changed && (
          <small>
            Base {report.baseValue === "" ? "empty value" : report.baseValue}
          </small>
        )}
        {unresolved && <small>Effective value unresolved</small>}
        {routedName !== undefined && (
          <small>
            {routedVerb} by {routedName}
          </small>
        )}
      </dd>
    </div>
  );
}

function SelectionRule({ rule }: { readonly rule: SelectionRuleDetail }) {
  const name =
    rule.origin === "Direct"
      ? rule.value.name
      : (rule.value.name ?? rule.value.definition.name);
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
  reports,
}: {
  readonly infoGroup: MaterializedInfoGroup;
  readonly reports:
    | ReadonlyMap<LocalRosterProfile, LocalRosterProfileCharacteristics>
    | undefined;
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
                report={reports?.get(profile.value)}
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
                reports={reports}
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
    choice.materialized.name ?? choice.materialized.id ?? "Unnamed selection"
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
  if (state.maximum !== undefined && Number.isFinite(state.maximum)) {
    return `${selected} of ${state.maximum} allowed`;
  }
  return selectedAmount > 0 ? selected : undefined;
}

function selectionChoiceKey(choice: BattleScribeRosterSelectionChoice): string {
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

function selectionGroupStatus(group: LocalRosterChildChoiceGroup): string {
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
  if (group.maximum !== undefined && Number.isFinite(group.maximum)) {
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
  if (directUpgradeRemovalWouldViolateMinimum(direct)) {
    return `${selected}; required`;
  }
  if ((direct.minimum ?? 0) > 0) {
    return `${selected}; requirement met`;
  }
  if (direct.maximum !== undefined && Number.isFinite(direct.maximum)) {
    return `${selected} of ${direct.maximum} allowed`;
  }
  return selectedAmount > 0 ? selected : undefined;
}
