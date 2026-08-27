import { useEffect, useId, useMemo, useRef, useState } from "react";

import type {
  MaterializedInfoGroup,
  MaterializedProfileInfoLink,
  MaterializedRuleInfoLink,
  MaterializedSelectionContainer,
  MaterializedSelectionEntryGroup,
  UnresolvedMaterializedInfoLink,
} from "@rosterforge/data-graph";
import {
  isActionableSupportedConstraintReport,
  isUnboundedConstraintValue,
  planRosterSelectionInitialization,
  type RosterSelectionInitializationPlan,
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
  isLocalRosterSingletonDesignationChoice,
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
import {
  selectionAmountChangeAllowed,
  selectionAmountSatisfiesBounds,
  type KnownSelectionAmountBound,
} from "./selection-amount-policy.js";
import { formatCount, formatNumber } from "./ui-format.js";

type PreviewChoiceHandler = (
  choice: BattleScribeRosterSelectionChoice,
  trigger: HTMLButtonElement,
) => void;

interface RosterSelectionChoiceGroupNode {
  readonly group: LocalRosterChildChoiceGroup;
  readonly children: readonly RosterSelectionChoiceGroupNode[];
}

/**
 * Restores the authored group hierarchy from the evaluator's intentionally
 * flat inspection list. Object identity is stable across materialization, so
 * nested groups never need display-name or source-ID guessing.
 */
function rosterSelectionChoiceGroupTree(
  groups: readonly LocalRosterChildChoiceGroup[],
): readonly RosterSelectionChoiceGroupNode[] {
  const byGroup = new Map(groups.map((group) => [group.group, group]));
  const childrenByGroup = new Map<
    MaterializedSelectionEntryGroup,
    MaterializedSelectionEntryGroup[]
  >();
  const nested = new Set<MaterializedSelectionEntryGroup>();
  for (const { group } of groups) {
    const children = [
      ...group.selectionEntryGroups,
      ...group.entryLinks.filter(
        (entry): entry is MaterializedSelectionEntryGroup =>
          entry.kind === "selectionEntryGroup",
      ),
    ].filter((entry) => byGroup.has(entry));
    childrenByGroup.set(group, children);
    for (const child of children) nested.add(child);
  }
  const build = (
    group: LocalRosterChildChoiceGroup,
  ): RosterSelectionChoiceGroupNode => ({
    group,
    children: (childrenByGroup.get(group.group) ?? []).map((child) =>
      build(byGroup.get(child)!),
    ),
  });
  return groups
    .filter(({ group }) => !nested.has(group))
    .map((group) => build(group));
}

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
  readonly onAddRootSelection: (
    choice: LocalRosterRootChoice,
  ) => SelectionOccurrenceId | undefined;
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
  const [activeSelectionId, setActiveSelectionId] =
    useState<SelectionOccurrenceId>();
  const [viewedSelectionId, setViewedSelectionId] =
    useState<SelectionOccurrenceId>();
  const [previewedChoice, setPreviewedChoice] =
    useState<BattleScribeRosterSelectionChoice>();
  const previewReturnFocus = useRef<HTMLElement | null>(null);
  const [pendingSelectionAnchor, setPendingSelectionAnchor] =
    useState<string>();
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
      }, activeSelectionId),
    [session, activeSelectionId],
  );
  const force = workspace.primaryForce;
  const configurationGroup = workspace.selections.groups.find(
    ({ role }) => role.key === "configuration",
  );
  const hasConfiguration = configurationGroup !== undefined;
  const armyGroups = workspace.selections.groups.filter(
    ({ role }) => role.key !== "configuration",
  );
  const activeSelection = topLevelWorkspaceSelection(
    armyGroups,
    activeSelectionId,
  );
  const viewedSelection = topLevelWorkspaceSelection(
    armyGroups,
    viewedSelectionId,
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
  const openChoicePreview: PreviewChoiceHandler = (choice, trigger) => {
    previewReturnFocus.current = trigger;
    setPreviewedChoice(choice);
  };
  const closeChoicePreview = () => {
    setPreviewedChoice(undefined);
    const returnFocus = previewReturnFocus.current;
    previewReturnFocus.current = null;
    queueMicrotask(() => {
      if (returnFocus !== null && document.contains(returnFocus)) {
        returnFocus.focus();
      }
    });
  };
  useEffect(() => {
    if (activeSelectionId !== undefined && activeSelection === undefined) {
      setActiveSelectionId(undefined);
    }
  }, [activeSelection, activeSelectionId]);
  useEffect(() => {
    if (viewedSelectionId !== undefined && viewedSelection === undefined) {
      setViewedSelectionId(undefined);
    }
  }, [viewedSelection, viewedSelectionId]);
  useEffect(() => {
    if (viewedSelectionId === undefined) return;
    // View is a reading action, so reveal the full-width card after React
    // mounts it instead of leaving it below a long army and making the click
    // appear to have done nothing. Depend on the requested identity rather
    // than the projected selection object: every roster edit rebuilds that
    // object, and re-scrolling an already-open card steals the player's place.
    const card = document.getElementById("selected-unit-card-view");
    if (typeof card?.scrollIntoView === "function") {
      card.scrollIntoView({ block: "start" });
    }
  }, [viewedSelectionId]);
  useEffect(() => {
    if (pendingSelectionAnchor === undefined) return;
    const target = document.getElementById(pendingSelectionAnchor);
    if (target === null) return;
    // A check can target a child that is mounted only in the selected unit's
    // options panel. Focus that unit first, then complete the original jump
    // after React has rendered the exact stable anchor.
    target.scrollIntoView?.({ block: "start" });
    setPendingSelectionAnchor(undefined);
  }, [activeSelectionId, pendingSelectionAnchor, session]);
  // A known violation opens its actionable evidence. Incompleteness remains a
  // separate visible signal in the player header, but it does not force the
  // evaluator report open: raw coverage evidence is useful on demand and made
  // every otherwise-clean roster read like a debugger.
  const checksNeedAttention =
    !workspace.validation.available ||
    workspace.validation.validity !== "valid";
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
    ? headlineRosterCost(workspace.costs.activeTotals)
    : undefined;
  const configurationCostLimits = workspace.costs.available
    ? configurationRelevantCostLimits(
        configurationGroup,
        session,
        workspace.costs.activeTotals,
      )
    : [];
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
          costLimits={configurationCostLimits}
          session={session}
          selectionCanAddAnother={selectionCanAddAnother}
          onAddChild={onAddChildSelection}
          onRename={onRenameSelection}
          onSetAmount={onSetSelectionAmount}
          onRemove={onRemoveSelection}
          onPreviewChoice={openChoicePreview}
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
        data-options-open={activeSelection !== undefined}
      >
        <section
          className="selected-roster-pane"
          aria-labelledby="selected-roster-heading"
          data-options-open={activeSelection !== undefined}
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
                  onPreviewChoice={openChoicePreview}
                  onSelect={setActiveSelectionId}
                  onView={(selectionId) =>
                    setViewedSelectionId((current) =>
                      current === selectionId ? undefined : selectionId,
                    )
                  }
                  viewedSelectionId={viewedSelectionId}
                />
              ))}
            </div>
          )}

          {activeSelection !== undefined && (
            <RosterUnitOptionsPanel
              session={session}
              selectionModel={activeSelection}
              selectionCanAddAnother={selectionCanAddAnother}
              onAddChild={onAddChildSelection}
              onRename={onRenameSelection}
              onSetAmount={onSetSelectionAmount}
              onRemove={onRemoveSelection}
              onPreviewChoice={openChoicePreview}
              onClose={() => setActiveSelectionId(undefined)}
              onView={() =>
                setViewedSelectionId((current) =>
                  current === activeSelection.occurrence.id
                    ? undefined
                    : activeSelection.occurrence.id,
                )
              }
              viewed={
                viewedSelectionId === activeSelection.occurrence.id
              }
            />
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
                        const costDescriptionId =
                          catalogueChoiceCosts(choice.materialized).length === 0
                            ? undefined
                            : choiceCostDescriptionId(
                                "root",
                                choice.materialized,
                              );
                        return (
                          <div
                            className="root-choice"
                            key={rootChoiceKey(choice)}
                            data-completeness={state.completeness}
                          >
                            <span className="root-choice-copy">
                              <span className="root-choice-heading">
                                <strong>{rootChoiceLabel(choice)}</strong>
                                <ChoiceCostBadges
                                  choice={choice.materialized}
                                  id={costDescriptionId}
                                />
                              </span>
                              <small className="root-choice-status">
                                <span>{status.value}</span>
                                {status.sourceMaximum && (
                                  <span
                                    className="root-choice-status-qualifier"
                                    title="Source maximum; roster options can change this number."
                                  >
                                    base
                                  </span>
                                )}
                              </small>
                            </span>
                            <span className="root-choice-actions">
                              <span className="choice-segmented-control">
                                <button
                                  type="button"
                                  className="root-choice-add"
                                  aria-describedby={costDescriptionId}
                                  aria-label={
                                    maximumReached
                                      ? `${rootChoiceLabel(choice)} maximum reached`
                                      : `Add ${rootChoiceLabel(choice)}`
                                  }
                                  title={
                                    maximumReached
                                      ? `${rootChoiceLabel(choice)} maximum reached`
                                      : `Add ${rootChoiceLabel(choice)}`
                                  }
                                  disabled={maximumReached}
                                  onClick={() => {
                                    const selectionId =
                                      onAddRootSelection(choice);
                                    if (
                                      selectionId !== undefined &&
                                      group.section === "army"
                                    ) {
                                      setActiveSelectionId(selectionId);
                                    }
                                  }}
                                >
                                  <span aria-hidden="true">+</span>
                                </button>
                                <ChoicePreviewButton
                                  choice={choice.materialized}
                                  onPreview={openChoicePreview}
                                />
                              </span>
                            </span>
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

      {previewedChoice !== undefined && (
        <CatalogueChoicePreviewDialog
          choice={previewedChoice}
          onClose={closeChoicePreview}
        />
      )}

      {viewedSelection !== undefined && (
        <RosterUnitCardView
          session={session}
          selectionModel={viewedSelection}
          selectionCanAddAnother={selectionCanAddAnother}
          onAddChild={onAddChildSelection}
          onRename={onRenameSelection}
          onSetAmount={onSetSelectionAmount}
          onRemove={onRemoveSelection}
          onClose={() => setViewedSelectionId(undefined)}
        />
      )}

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
          const decodedTargetId =
            targetId === undefined
              ? undefined
              : decodeURIComponent(targetId);
          const target =
            decodedTargetId === undefined
              ? null
              : document.getElementById(decodedTargetId);
          if (
            target !== null &&
            target.closest(".roster-configuration") !== null
          ) {
            // Exact report links can point into setup. Reveal that target
            // before the browser follows the fragment instead of leaving it
            // inside a player-collapsed details element.
            setConfigurationOpen(true);
          }
          if (target === null && decodedTargetId !== undefined) {
            const owner = topLevelWorkspaceSelectionContainingAnchor(
              armyGroups,
              decodedTargetId,
            );
            if (owner !== undefined) {
              event.preventDefault();
              setActiveSelectionId(owner.occurrence.id);
              setPendingSelectionAnchor(decodedTargetId);
            }
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
                      ? "all supported rules checked"
                      : "some rules not checked"
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

/** Uses the presentation model's source-stable order for the primary capacity. */
function headlineRosterCost(
  totals: readonly RosterWorkspaceCost[],
): RosterWorkspaceCost | undefined {
  return totals.find(({ limit }) => limit !== undefined) ?? totals[0];
}

/**
 * Distinguishes an unset setup-derived points cap from a literal zero limit.
 *
 * The Aeldari force authors a zero base maximum and lets the Battle Size
 * choice set 1,000/2,000/3,000. Showing `515 / 0` before that required choice
 * is made is numerically faithful but reads like a broken evaluator, so the
 * player surface names the pending setup while the underlying report stays
 * unchanged.
 */
function pointsLimitPending(
  workspace: RosterWorkspaceViewModel,
  cost: RosterWorkspaceCost | undefined,
): boolean {
  if (cost?.limit !== 0) return false;
  const battleSize = workspace.selections.ordered.find(
    ({ occurrence }) => occurrence.name === "Battle Size",
  );
  return battleSize !== undefined && battleSize.occurrence.selections.length === 0;
}

/** Translates evaluator coverage codes into bounded player-facing reasons. */
function ruleCoverageReasons(
  diagnostics: readonly Diagnostic[],
): readonly string[] {
  const codes = new Set(diagnostics.map(({ code }) => code));
  const reasons: string[] = [];
  if (
    codes.has(
      "EVALUATION_ROOT_INITIALIZATION_CONDITIONAL_MODIFIERS_UNSUPPORTED",
    )
  ) {
    reasons.push(
      "Some unit limits depend on roster setup in a way RosterForge cannot evaluate yet.",
    );
  }
  if (codes.has("EVALUATION_STRUCTURAL_STATUS_ROOT_VISIBILITY_UNRESOLVED")) {
    reasons.push(
      "Some catalogue entries have conditional availability that RosterForge cannot resolve yet.",
    );
  }
  if (
    codes.has("EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED") ||
    codes.has("EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED")
  ) {
    reasons.push(
      "Some selection limits use modifier shapes RosterForge cannot evaluate yet.",
    );
  }
  if (
    codes.has("EVALUATION_CONSTRAINT_FIELD_UNSUPPORTED") ||
    codes.has("EVALUATION_CONSTRAINT_ATTRIBUTES_UNSUPPORTED")
  ) {
    reasons.push(
      "Some catalogue-specific limits use fields or attributes RosterForge cannot inspect yet.",
    );
  }
  return reasons.length > 0
    ? reasons
    : [
        "One or more imported rule shapes are not supported yet; exact evidence remains in Developer diagnostics.",
      ];
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
  const headlineCost = costs.available
    ? headlineRosterCost(costs.activeTotals)
    : undefined;
  const limitPending = pointsLimitPending(workspace, headlineCost);
  const secondaryTotals = costs.available
    ? costs.activeTotals.filter((total) => total !== headlineCost)
    : [];
  // Two sibling disclosures rather than one nested pair. The zero-value cost
  // fields are a browsing affordance a player may open on their own; burying
  // them inside the report details would put them two clicks deep and behind an
  // unrelated heading.
  const hasReportDetails =
    costs.excludedCount > 0 ||
    costs.unresolvedSelectionCount > 0 ||
    costDiagnostics > 0 ||
    header.incomplete.length > 0;
  const coverageReasons = validation.available
    ? ruleCoverageReasons(validation.diagnostics)
    : [];
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
        ) : headlineCost === undefined ? (
          <p className="player-header-figure" data-figure="empty">
            <strong>0</strong>
            <span>costs so far</span>
          </p>
        ) : (
          <p className="player-header-figure" key={headlineCost.typeId}>
            <strong>
              {formatNumber(headlineCost.value)}
              {limitPending || headlineCost.limit === undefined
                ? ""
                : ` / ${formatNumber(headlineCost.limit)}`}
            </strong>
            <span>
              {limitPending
                ? `${headlineCost.name} so far — choose Battle Size`
                : `${headlineCost.name}${
                    headlineCost.limit === undefined ? "" : " used"
                  }`}
            </span>
          </p>
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
            ? "Supported checks complete"
            : "Some rules not checked"}
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

      {secondaryTotals.length > 0 && (
        <details className="player-header-details">
          <summary>
            Other roster limits
            <span>{formatCount(secondaryTotals.length, "limit")}</span>
          </summary>
          <ul className="other-cost-list">
            {secondaryTotals.map((total) => (
              <li key={total.typeId}>
                <strong>
                  {formatNumber(total.value)}
                  {total.limit === undefined
                    ? ""
                    : ` / ${formatNumber(total.limit)}`}
                </strong>
                <span>
                  {total.name}
                  {total.limit === undefined ? "" : " used"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hasReportDetails && (
        <details className="player-header-details">
          <summary>
            Report details
            <span>
              {header.completeness === "incomplete"
                ? "Coverage limited"
                : formatCount(
                    costDiagnostics + validationDiagnostics,
                    "diagnostic",
                  )}
            </span>
          </summary>

          {header.incomplete.length > 0 && (
            <p className="player-header-incomplete">
              {`RosterForge could not ${header.incomplete
                .map((report) =>
                  report === "costs"
                    ? costs.available
                      ? "evaluate every catalogue cost"
                      : "produce the cost report"
                    : validation.available
                      ? "check every applicable catalogue rule"
                      : "produce the supported checks",
                )
                .join(" or ")}. Known problems only cover the checks that completed.`}
            </p>
          )}

          {validation.available &&
            validation.completeness === "incomplete" && (
              <div className="player-header-coverage-reasons">
                <strong>Why some rules were not checked</strong>
                <ul>
                  {coverageReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
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
          {costDiagnostics > 0 && (
            <details className="player-header-developer-diagnostics">
              <summary>
                Developer cost diagnostics
                <span>
                  {formatCount(costDiagnostics, "diagnostic")}
                </span>
              </summary>
              <p>
                Technical evidence for unsupported or unresolved catalogue
                behavior. These codes are not player actions or additional
                known violations.
              </p>
              <DiagnosticList diagnostics={costs.diagnostics} />
            </details>
          )}
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
              ? "All supported rules checked"
              : "Some rules not checked"}
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
          aria-label={`Developer structural diagnostics ${formatCount(
            diagnostics.length,
            "diagnostic",
          )}`}
        >
          <summary>
            Developer structural diagnostics
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
            ? "All supported rules checked"
            : "Some rules not checked"}
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
          aria-label={`Developer constraint diagnostics ${formatCount(
            diagnostics.length,
            "diagnostic",
          )}`}
        >
          <summary>
            Developer constraint diagnostics
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
  costLimits,
  session,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onPreviewChoice,
}: {
  readonly group: RosterWorkspaceSelectionGroup;
  readonly anchorId: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  /** Evaluated roster capacities that remain useful after setup is collapsed. */
  readonly costLimits: readonly (RosterWorkspaceCost & {
    readonly limit: number;
  })[];
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
  readonly onPreviewChoice: PreviewChoiceHandler;
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
            {costLimits.map((cost) => (
              <strong key={cost.typeId}>
                {formatNumber(cost.value)} / {formatNumber(cost.limit)}{" "}
                {cost.name}
              </strong>
            ))}
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
          onPreviewChoice={onPreviewChoice}
        />
      </div>
    </details>
  );
}

/**
 * Keeps setup-only currencies beside the setup they constrain.
 *
 * The roster report already owns evaluated values and finite maxima. This
 * helper only matches their exact type ids against selected configuration
 * costs and immediately available configuration choices; it does not evaluate
 * an unselected choice or infer a currency from a display name. In particular,
 * the empty Detachment owner exposes its point budget through its child choices
 * before the player selects one.
 */
function configurationRelevantCostLimits(
  group: RosterWorkspaceSelectionGroup | undefined,
  session: LocalRosterSession,
  totals: readonly RosterWorkspaceCost[],
): readonly (RosterWorkspaceCost & { readonly limit: number })[] {
  if (group === undefined) return [];
  const typeIds = new Set<string>();
  const collectChoice = (choice: BattleScribeRosterSelectionChoice): void => {
    for (const cost of choice.costs) {
      // Community entries carry zero placeholders for every campaign currency.
      // A choice makes a setup budget relevant only when it actually spends it.
      if (
        cost.typeId !== undefined &&
        cost.value !== undefined &&
        Number.isFinite(cost.value) &&
        cost.value !== 0
      ) {
        typeIds.add(cost.typeId);
      }
    }
  };
  const visitSelection = (selection: RosterWorkspaceSelection): void => {
    if (selection.costs.available) {
      for (const cost of selection.costs.totals) {
        if (cost.value !== 0) typeIds.add(cost.typeId);
      }
    }
    const choices = inspectLocalRosterChildChoices(
      session,
      selection.occurrence.id,
    );
    if (choices.ok) {
      for (const direct of choices.value.direct) collectChoice(direct.choice);
      for (const childGroup of choices.value.groups) {
        for (const choice of childGroup.choices) collectChoice(choice);
      }
    }
    for (const child of selection.selections) visitSelection(child);
  };
  for (const selection of group.selections) visitSelection(selection);
  return totals.filter(
    (
      total,
    ): total is RosterWorkspaceCost & { readonly limit: number } =>
      total.limit !== undefined && typeIds.has(total.typeId),
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
  onPreviewChoice,
  onSelect,
  onView,
  viewedSelectionId,
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
  readonly onPreviewChoice: PreviewChoiceHandler;
  readonly onSelect: (id: SelectionOccurrenceId) => void;
  readonly onView: (id: SelectionOccurrenceId) => void;
  readonly viewedSelectionId?: SelectionOccurrenceId | undefined;
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
        onPreviewChoice={onPreviewChoice}
        presentation="row"
        onSelect={onSelect}
        onView={onView}
        viewedSelectionId={viewedSelectionId}
      />
    </section>
  );
}

type RosterSelectionPresentation = "combined" | "row" | "options" | "card";

function RosterTopLevelSelectionList({
  roleKnown,
  selections,
  session,
  selectionCanAddAnother,
  collapsible,
  initiallyOpen = false,
  presentation = "combined",
  onSelect,
  onView,
  viewedSelectionId,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onPreviewChoice,
}: {
  readonly roleKnown: boolean;
  readonly selections: readonly RosterWorkspaceSelection[];
  readonly session: LocalRosterSession;
  readonly selectionCanAddAnother: ReadonlyMap<SelectionOccurrenceId, boolean>;
  readonly collapsible: boolean;
  readonly initiallyOpen?: boolean;
  readonly presentation?: RosterSelectionPresentation;
  readonly onSelect?: ((id: SelectionOccurrenceId) => void) | undefined;
  readonly onView?: ((id: SelectionOccurrenceId) => void) | undefined;
  readonly viewedSelectionId?: SelectionOccurrenceId | undefined;
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
  readonly onPreviewChoice?:
    | PreviewChoiceHandler
    | undefined;
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
            presentation={presentation}
            onSelect={onSelect}
            onView={onView}
            viewed={viewedSelectionId === selection.occurrence.id}
            onAddChild={onAddChild}
            onRename={onRename}
            onSetAmount={onSetAmount}
            onRemove={onRemove}
            onPreviewChoice={onPreviewChoice}
          />
        ))}
      </ul>
    </>
  );
}

/** Finds the exact top-level army unit that owns ephemeral workspace focus. */
function topLevelWorkspaceSelection(
  groups: readonly RosterWorkspaceSelectionGroup[],
  selectionId: SelectionOccurrenceId | undefined,
): RosterWorkspaceSelection | undefined {
  if (selectionId === undefined) return undefined;
  for (const group of groups) {
    const selection = group.selections.find(
      ({ occurrence }) => occurrence.id === selectionId,
    );
    if (selection !== undefined) return selection;
  }
  return undefined;
}

/** Finds the army row whose selected subtree contains one stable report link. */
function topLevelWorkspaceSelectionContainingAnchor(
  groups: readonly RosterWorkspaceSelectionGroup[],
  anchorId: string,
): RosterWorkspaceSelection | undefined {
  for (const group of groups) {
    const selection = group.selections.find((candidate) =>
      workspaceSelectionContainsAnchor(candidate, anchorId),
    );
    if (selection !== undefined) return selection;
  }
  return undefined;
}

function workspaceSelectionContainsAnchor(
  selection: RosterWorkspaceSelection,
  anchorId: string,
): boolean {
  return (
    selectionAnchor(selection.occurrence.id) === anchorId ||
    selection.selections.some((child) =>
      workspaceSelectionContainsAnchor(child, anchorId),
    )
  );
}

/**
 * Dedicated editing surface for the currently focused army unit.
 *
 * It deliberately reuses `RosterSelectionItem`'s option controls. Required
 * wargear, repeatable models, and grouped choices therefore keep one mutation
 * path even though their presentation moved out of the compact army list.
 */
function RosterUnitOptionsPanel({
  session,
  selectionModel,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onPreviewChoice,
  onClose,
  onView,
  viewed,
}: {
  readonly session: LocalRosterSession;
  readonly selectionModel: RosterWorkspaceSelection;
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
  readonly onPreviewChoice: PreviewChoiceHandler;
  readonly onClose: () => void;
  readonly onView: () => void;
  readonly viewed: boolean;
}) {
  const name = selectionModel.occurrence.name ?? "Unnamed unit";
  return (
    <section
      className="selected-unit-options"
      aria-label={`Unit options for ${name}`}
      aria-labelledby="selected-unit-options-heading"
    >
      <div className="selected-unit-panel-heading">
        <div>
          <span className="eyebrow">Selected unit</span>
          <h3 id="selected-unit-options-heading">Unit options for {name}</h3>
        </div>
        <div className="selected-unit-panel-actions">
          <button
            type="button"
            aria-expanded={viewed}
            aria-controls="selected-unit-card-view"
            onClick={onView}
          >
            View unit card
          </button>
          <button type="button" aria-label={`Close options for ${name}`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <ul className="roster-top-level-selection-list selected-unit-options-list">
        <RosterSelectionItem
          session={session}
          selectionModel={selectionModel}
          selectionCanAddAnother={selectionCanAddAnother}
          topLevel
          presentation="options"
          embedded
          hideOccurrence
          allowRemove={false}
          onAddChild={onAddChild}
          onRename={onRename}
          onSetAmount={onSetAmount}
          onRemove={onRemove}
          onPreviewChoice={onPreviewChoice}
        />
      </ul>
    </section>
  );
}

/** Read-only full-width datasheet for the unit chosen with the row View action. */
function RosterUnitCardView({
  session,
  selectionModel,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onClose,
}: {
  readonly session: LocalRosterSession;
  readonly selectionModel: RosterWorkspaceSelection;
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
  readonly onClose: () => void;
}) {
  const name = selectionModel.occurrence.name ?? "Unnamed unit";
  return (
    <section
      className="unit-card-view-panel"
      id="selected-unit-card-view"
      aria-label={`Unit card for ${name}`}
      aria-labelledby="selected-unit-card-heading"
    >
      <div className="selected-unit-panel-heading">
        <div>
          <span className="eyebrow">Unit reference</span>
          <h3 id="selected-unit-card-heading">Unit card for {name}</h3>
        </div>
        <button type="button" aria-label={`Close unit card for ${name}`} onClick={onClose}>
          Close
        </button>
      </div>
      <ul className="roster-top-level-selection-list unit-card-view-list">
        <RosterSelectionItem
          session={session}
          selectionModel={selectionModel}
          selectionCanAddAnother={selectionCanAddAnother}
          topLevel
          presentation="card"
          embedded
          hideOccurrence
          allowRemove={false}
          onAddChild={onAddChild}
          onRename={onRename}
          onSetAmount={onSetAmount}
          onRemove={onRemove}
        />
      </ul>
    </section>
  );
}

function RosterSelectionItem({
  session,
  selectionModel,
  topLevel = false,
  collapsible = false,
  initiallyOpen = false,
  collapseChildren = false,
  presentation = "combined",
  onSelect,
  onView,
  viewed = false,
  embedded = false,
  hideOccurrence = false,
  allowRemove = true,
  amountBounds = [],
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onPreviewChoice,
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
  /** Selects the compact row, edits it, or renders its read-only unit card. */
  readonly presentation?: RosterSelectionPresentation;
  readonly onSelect?: ((id: SelectionOccurrenceId) => void) | undefined;
  readonly onView?: ((id: SelectionOccurrenceId) => void) | undefined;
  readonly viewed?: boolean;
  /** Omits the duplicate occurrence row and stable anchor inside a panel. */
  readonly embedded?: boolean;
  /** Lets the panel heading replace only its top selection's row. */
  readonly hideOccurrence?: boolean;
  readonly allowRemove?: boolean;
  /** Complete aggregate bounds inherited from this occurrence's parent choice. */
  readonly amountBounds?: readonly KnownSelectionAmountBound[];
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
  readonly onPreviewChoice?:
    | PreviewChoiceHandler
    | undefined;
}) {
  const selection = selectionModel.occurrence;
  const childChoices = inspectLocalRosterChildChoices(session, selection.id);
  const choice = localRosterSelectionChoice(session, selection.id);
  const rosterRoleChoices = childChoices.ok
    ? childChoices.value.direct.filter(({ choice: childChoice }) =>
        isLocalRosterSingletonDesignationChoice(session, childChoice),
      )
    : [];
  const ordinaryDirectChoices = childChoices.ok
    ? childChoices.value.direct.filter(
        ({ choice: childChoice }) =>
          !rosterRoleChoices.some(
            ({ choice: roleChoice }) => roleChoice === childChoice,
          ),
      )
    : [];
  const childChoiceGroupTree = childChoices.ok
    ? rosterSelectionChoiceGroupTree(childChoices.value.groups)
    : [];
  const completeAmountBounds = [
    ...knownSelectionAmountBounds(session, selection.id),
    ...amountBounds,
  ];
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
      topLevel &&
      childChoice?.kind === "selectionEntry" &&
      childChoice.type === "model"
    ) {
      promotedModels.push(child);
    } else if (
      presentation === "card" ||
      childChoice === undefined ||
      !rosterRoleChoices.some(
        ({ choice: roleChoice }) => roleChoice === childChoice,
      )
    ) {
      // Unknown choices stay configurable. Treating an unresolved type as a
      // model would hide it from the only complete editing tree. A recognized
      // selected roster role has its own control above the loadout groups, but
      // remains in the full card so authored information is not discarded.
      configurableSelections.push(child);
    }
  }
  const childrenContainAttention = configurableSelections.some(
    ({ containsAttention }) => containsAttention,
  );
  const configurableSelectionLabel =
    promotedModels.length > 0
      ? "Wargear and options"
      : "Models, wargear and options";
  const configurableSelectionSummary =
    promotedModels.length > 0
      ? "Configure wargear & options"
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
  const bodyVisible =
    presentation !== "row" && (!collapsible || cardOpen);
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
      id={embedded ? undefined : selectionAnchor(selection.id)}
      data-occurrence-id={selection.id}
      data-active={!embedded && selectionModel.active ? "true" : undefined}
      aria-current={!embedded && selectionModel.active ? "true" : undefined}
      data-attention={selectionModel.attention ? "violation" : undefined}
      data-display-completeness={
        nameIncomplete || annotationIncomplete ? "incomplete" : "complete"
      }
    >
      {!hideOccurrence && <div className="selection-occurrence">
        <span className="selection-occurrence-heading">
          {presentation === "row" ? (
            <button
              type="button"
              className="unit-card-select"
              aria-pressed={selectionModel.active}
              aria-label={`Configure ${annotatedName}`}
              onClick={() => onSelect?.(selection.id)}
            >
              <strong>{annotatedName}</strong>
            </button>
          ) : collapsible ? (
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
          {presentation === "row" && (
            <button
              type="button"
              className="unit-card-view"
              aria-expanded={viewed}
              aria-controls="selected-unit-card-view"
              onClick={() => onView?.(selection.id)}
            >
              View
            </button>
          )}
          {allowRemove && (
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => onRemove(selection.id)}
            >
              Remove
            </button>
          )}
        </div>
      </div>}
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
          {presentation !== "card" && (
            <>
          {rosterRoleChoices.length > 0 && (
            <section
              className="roster-role-choices"
              aria-label={`Roster role for ${name}`}
            >
              <div className="roster-role-heading">
                <h4>Roster role</h4>
                <span>Choose independently; roster checks enforce the limit.</span>
              </div>
              <div className="roster-role-options">
                {rosterRoleChoices.map((direct) => {
                  const label = selectionChoiceLabel(direct.choice);
                  const selectedOccurrence = direct.selected.at(-1);
                  const costDescriptionId =
                    catalogueChoiceCosts(direct.choice).length === 0
                      ? undefined
                      : choiceCostDescriptionId(
                          `${selection.id}:role`,
                          direct.choice,
                        );
                  return (
                    <span
                      className="roster-role-option"
                      key={selectionChoiceKey(direct.choice)}
                      data-selected={
                        selectedOccurrence === undefined ? undefined : "true"
                      }
                    >
                      <span
                        className="choice-segmented-control"
                        data-selected={
                          selectedOccurrence === undefined ? undefined : "true"
                        }
                      >
                        <button
                          type="button"
                          aria-label={label}
                          aria-describedby={costDescriptionId}
                          aria-pressed={selectedOccurrence !== undefined}
                          onClick={() =>
                            selectedOccurrence === undefined
                              ? onAddChild(selection.id, direct.choice)
                              : onRemove(selectedOccurrence.id)
                          }
                        >
                          <span className="choice-button-copy">
                            <span>{label}</span>
                            <ChoiceCostBadges
                              choice={direct.choice}
                              id={costDescriptionId}
                            />
                          </span>
                        </button>
                        {onPreviewChoice !== undefined && (
                          <ChoicePreviewButton
                            choice={direct.choice}
                            onPreview={onPreviewChoice}
                          />
                        )}
                      </span>
                      <small>
                        {selectedOccurrence === undefined
                          ? "Not selected for this unit"
                          : "Selected for this unit"}
                      </small>
                    </span>
                  );
                })}
              </div>
            </section>
          )}
          {ordinaryDirectChoices.length > 0 && (
            <div className="child-choice-list">
              {ordinaryDirectChoices.map((direct) => {
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
                const costDescriptionId =
                  catalogueChoiceCosts(direct.choice).length === 0
                    ? undefined
                    : choiceCostDescriptionId(selection.id, direct.choice);
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
                      choice={direct.choice}
                      onPreview={onPreviewChoice}
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
                    <span
                      className="choice-segmented-control"
                      data-selected={
                        selectedOccurrence === undefined ? undefined : "true"
                      }
                    >
                      <button
                        type="button"
                        aria-label={
                          selectedAmount > 1
                            ? `${choiceName} (${selectedAmount} selected)`
                            : choiceName
                        }
                        aria-describedby={costDescriptionId}
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
                        <span className="choice-button-copy">
                          <span>
                            {selectedAmount > 1
                              ? `${choiceName} (${selectedAmount} selected)`
                              : choiceName}
                          </span>
                          <ChoiceCostBadges
                            choice={direct.choice}
                            id={costDescriptionId}
                          />
                        </span>
                      </button>
                      {onPreviewChoice !== undefined && (
                        <ChoicePreviewButton
                          choice={direct.choice}
                          onPreview={onPreviewChoice}
                        />
                      )}
                    </span>
                    {canAddAnother && (
                      <button
                        type="button"
                        aria-label={`Add another ${choiceName}`}
                        aria-describedby={costDescriptionId}
                        onClick={() => onAddChild(selection.id, direct.choice)}
                      >
                        <span className="choice-button-copy">
                          <span>Add another {choiceName}</span>
                          <ChoiceCostBadges choice={direct.choice} />
                        </span>
                      </button>
                    )}
                    {status !== undefined && <small>{status}</small>}
                  </span>
                );
              })}
            </div>
          )}
          {childChoiceGroupTree.length > 0 && (
            <div className="child-choice-groups">
              {childChoiceGroupTree.map((node) => (
                <RosterSelectionChoiceGroup
                  key={selectionChoiceKey(node.group.group)}
                  session={session}
                  parent={selection}
                  parentName={name}
                  node={node}
                  selectionCanAddAnother={selectionCanAddAnother}
                  onChoose={onAddChild}
                  onSetAmount={onSetAmount}
                  onRemove={onRemove}
                  onPreviewChoice={onPreviewChoice}
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
              bounds={completeAmountBounds}
              onSetAmount={onSetAmount}
              label="Models in this squad"
            />
          )}
            </>
          )}
          {choice !== undefined && presentation !== "options" && (
            <RosterSelectionDatasheet
              session={session}
              choice={choice}
              selection={selection}
              displayNameIncomplete={nameIncomplete || annotationIncomplete}
            />
          )}
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
                    amountBounds={childSelectionAmountBounds(
                      model.occurrence,
                      childChoices,
                    )}
                    selectionCanAddAnother={selectionCanAddAnother}
                    collapsible={presentation !== "card"}
                    collapseChildren={presentation !== "card"}
                    presentation={presentation}
                    embedded={presentation === "card"}
                    allowRemove={false}
                    onAddChild={onAddChild}
                    onRename={onRename}
                    onSetAmount={onSetAmount}
                    onRemove={onRemove}
                    onPreviewChoice={onPreviewChoice}
                  />
                ))}
              </ul>
            </section>
          )}
          {choice !== undefined && presentation !== "card" && (
            <>
              <RosterSelectionEdit
                choice={choice}
                selection={selection}
                onRename={onRename}
                onSetAmount={onSetAmount}
              />
              {/* The normal selected-card datasheet already ends with this
                  disclosure. Options-only presentation omits that datasheet,
                  so it carries the single retained copy here instead. */}
              {presentation === "options" && (
                <ChoiceDeveloperDetails choice={choice} />
              )}
            </>
          )}
          {configurableSelections.length > 0 && (
            presentation === "card" ? (
              <ul className="selection-card-children">
                {configurableSelections.map((child) => (
                  <RosterSelectionItem
                    key={child.occurrence.id}
                    session={session}
                    selectionModel={child}
                    amountBounds={childSelectionAmountBounds(
                      child.occurrence,
                      childChoices,
                    )}
                    selectionCanAddAnother={selectionCanAddAnother}
                    presentation="card"
                    embedded
                    allowRemove={false}
                    onAddChild={onAddChild}
                    onRename={onRename}
                    onSetAmount={onSetAmount}
                    onRemove={onRemove}
                    onPreviewChoice={onPreviewChoice}
                  />
                ))}
              </ul>
            ) : (
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
                      amountBounds={childSelectionAmountBounds(
                        child.occurrence,
                        childChoices,
                      )}
                      selectionCanAddAnother={selectionCanAddAnother}
                      presentation={presentation}
                      onAddChild={onAddChild}
                      onRename={onRename}
                      onSetAmount={onSetAmount}
                      onRemove={onRemove}
                      onPreviewChoice={onPreviewChoice}
                    />
                  ))}
                </ul>
              )}
              </details>
            )
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

interface CatalogueChoiceCost {
  readonly key: string;
  readonly name: string;
  readonly value: number;
  readonly dynamic: boolean;
}

/**
 * Returns the first finite, non-zero cost authored on a catalogue choice.
 *
 * This is deliberately a starting-cost label, not a speculative evaluation of
 * an unselected roster occurrence. Conditional modifiers need an occurrence,
 * its initialized children, and the current roster context; inventing that
 * context in the catalogue would make a dynamic unit price look exact. Once a
 * choice is selected, the unit card continues to show the evaluated recursive
 * total instead. Source order is retained because catalogues put their primary
 * list-building currency first; showing every non-zero bookkeeping currency
 * turned an upgrade into a row of campaign counters.
 */
function catalogueChoiceCosts(
  choice: BattleScribeRosterSelectionChoice,
): readonly CatalogueChoiceCost[] {
  const index = choice.costs.findIndex(
    ({ value }) => value !== undefined && Number.isFinite(value) && value !== 0,
  );
  const cost = choice.costs[index];
  if (cost?.value === undefined) return [];
  const dynamic =
    cost.typeId !== undefined &&
    (choice.modifiers.some(({ field }) => field === cost.typeId) ||
      choice.modifierGroups.some((group) =>
        modifierGroupTargetsCost(group, cost.typeId!),
      ));
  return [
    {
      key: `${cost.typeId ?? cost.name ?? "cost"}:${index}`,
      name: cost.name ?? cost.typeId ?? "cost",
      value: cost.value,
      dynamic,
    },
  ];
}

function modifierGroupTargetsCost(
  group: BattleScribeRosterSelectionChoice["modifierGroups"][number],
  typeId: string,
): boolean {
  return (
    group.modifiers.some(({ field }) => field === typeId) ||
    group.modifierGroups.some((nested) =>
      modifierGroupTargetsCost(nested, typeId),
    )
  );
}

function ChoiceCostBadges({
  choice,
  id,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly id?: string | undefined;
}) {
  const costs = catalogueChoiceCosts(choice);
  if (costs.length === 0) return null;
  return (
    <span
      className="choice-cost-badges"
      id={id}
      title="Source starting cost; options and roster conditions can change the evaluated total."
    >
      {costs.map((cost) => (
        <span className="choice-cost-badge" key={cost.key}>
          {formatNumber(cost.value)} {cost.name}
          {cost.dynamic && (
            <span className="choice-cost-qualifier"> base</span>
          )}
        </span>
      ))}
    </span>
  );
}

function choiceCostDescriptionId(
  scope: string,
  choice: BattleScribeRosterSelectionChoice,
): string {
  return stableDomAnchor(
    "choice-cost",
    `${scope}:${selectionChoiceKey(choice)}`,
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

/** Opens source-authored information without selecting or mutating the choice. */
function ChoicePreviewButton({
  choice,
  onPreview,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly onPreview: PreviewChoiceHandler;
}) {
  const label = selectionChoiceLabel(choice);
  return (
    <button
      className="choice-preview-button"
      type="button"
      aria-label={`View information for ${label}`}
      title={`View information for ${label}`}
      onClick={(event) => onPreview(choice, event.currentTarget)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        focusable="false"
      >
        <path d="M5.5 2.75h8.25l4.75 4.75v13.75h-13Z" />
        <path d="M13.75 2.75V7.5h4.75" />
        <circle cx="12" cy="10.75" r="0.7" fill="currentColor" stroke="none" />
        <path d="M12 13.5v4" />
      </svg>
      <span className="visually-hidden">View information for {label}</span>
    </button>
  );
}

interface CatalogueChoiceInformation {
  readonly profiles: readonly SelectionProfileDetail[];
  readonly rules: readonly SelectionRuleDetail[];
  readonly infoGroups: readonly MaterializedInfoGroup[];
  readonly unresolved: readonly UnresolvedMaterializedInfoLink[];
  readonly keywords: readonly string[];
}

interface CatalogueAvailableBranch {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly showOwnInformation: boolean;
  readonly children: readonly CatalogueAvailableBranch[];
}

/**
 * Reads only authored catalogue information from a materialized choice.
 *
 * Category links contribute a keyword only when they carry a human-authored
 * name. Hex identifiers sometimes occupy the name field in imported data; the
 * preview filters those just as the selected-card projection avoids exposing
 * opaque target IDs to players.
 */
function catalogueChoiceInformation(
  choice: BattleScribeRosterSelectionChoice,
): CatalogueChoiceInformation {
  const keywords = [
    ...new Set(
      choice.categoryLinks
        .map(({ name }) => name?.trim())
        .filter(
          (name): name is string =>
            name !== undefined &&
            name !== "" &&
            !looksLikeOpaqueCatalogueCode(name),
        ),
    ),
  ];
  return {
    profiles: [
      ...choice.profiles.map((value) => ({
        origin: "Direct" as const,
        value,
      })),
      ...choice.materializedInfoLinks
        .filter(isMaterializedProfileInfoLink)
        .map((value) => ({ origin: "Linked" as const, value })),
    ],
    rules: [
      ...choice.rules.map((value) => ({
        origin: "Direct" as const,
        value,
      })),
      ...choice.materializedInfoLinks
        .filter(isMaterializedRuleInfoLink)
        .map((value) => ({ origin: "Linked" as const, value })),
    ],
    infoGroups: [
      ...choice.materializedInfoGroups,
      ...choice.materializedInfoLinks.filter(isMaterializedInfoGroup),
    ],
    unresolved: choice.materializedInfoLinks.filter(
      isUnresolvedMaterializedInfoLink,
    ),
    keywords,
  };
}

function looksLikeOpaqueCatalogueCode(value: string): boolean {
  return /^(?:[0-9a-f]{4,8}-){2,}[0-9a-f]{4,12}$/iu.test(value);
}

function catalogueChoiceHasOwnInformation(
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  const information = catalogueChoiceInformation(choice);
  return (
    information.profiles.length > 0 ||
    information.rules.length > 0 ||
    information.infoGroups.length > 0 ||
    information.unresolved.length > 0 ||
    information.keywords.length > 0
  );
}

function directCatalogueChoices(
  container: MaterializedSelectionContainer,
): readonly BattleScribeRosterSelectionChoice[] {
  return [
    ...container.selectionEntries,
    ...container.selectionEntryGroups,
    ...container.entryLinks.filter(
      (entryLink): entryLink is BattleScribeRosterSelectionChoice =>
        entryLink.kind !== "unresolvedEntryLink",
    ),
  ];
}

function collectPlannedChoices(
  plan: RosterSelectionInitializationPlan,
  choices: Set<BattleScribeRosterSelectionChoice>,
): void {
  for (const addition of plan.additions) {
    choices.add(addition.choice);
    collectPlannedChoices(addition.initialization, choices);
  }
}

/**
 * Keeps unselected catalogue material separate from the initialization plan.
 *
 * A planned entry can still contain unplanned alternatives, so it remains as a
 * context-only branch when such descendants exist. Selection-entry groups are
 * structural headings rather than roster occurrences and are retained only
 * when they lead to informative choices.
 */
function catalogueAvailableBranches(
  container: MaterializedSelectionContainer,
  plannedChoices: ReadonlySet<BattleScribeRosterSelectionChoice>,
): readonly CatalogueAvailableBranch[] {
  return directCatalogueChoices(container)
    .map((choice) =>
      plannedChoices.has(choice)
        ? undefined
        : catalogueAvailableBranch(choice, plannedChoices),
    )
    .filter(
      (branch): branch is CatalogueAvailableBranch => branch !== undefined,
    );
}

function catalogueAvailableBranch(
  choice: BattleScribeRosterSelectionChoice,
  plannedChoices: ReadonlySet<BattleScribeRosterSelectionChoice>,
): CatalogueAvailableBranch | undefined {
  const children = catalogueAvailableBranches(choice, plannedChoices);
  const showOwnInformation =
    !plannedChoices.has(choice) && catalogueChoiceHasOwnInformation(choice);
  return showOwnInformation || children.length > 0
    ? { choice, showOwnInformation, children }
    : undefined;
}

/**
 * Limits the unit's alternate surface to model profiles and their equipment.
 *
 * Unit roots can also carry entire Crusade advancement libraries. Those are
 * valid catalogue branches but not useful datasheet alternatives, and mounting
 * even their collapsed headings turns a quick unit preview into a second
 * catalogue browser. Structural groups remain as context on paths to models.
 */
function catalogueUnitModelBranches(
  container: MaterializedSelectionContainer,
  plannedChoices: ReadonlySet<BattleScribeRosterSelectionChoice>,
): readonly CatalogueAvailableBranch[] {
  return directCatalogueChoices(container).flatMap((choice) => {
    if (choice.kind === "selectionEntry" && choice.type === "model") {
      const branch = plannedChoices.has(choice)
        ? (() => {
            const children = catalogueAvailableBranches(
              choice,
              plannedChoices,
            );
            return children.length === 0
              ? undefined
              : { choice, showOwnInformation: false, children };
          })()
        : catalogueAvailableBranch(choice, plannedChoices);
      return branch === undefined ? [] : [branch];
    }
    if (choice.kind !== "selectionEntryGroup") return [];
    const children = catalogueUnitModelBranches(choice, plannedChoices);
    return children.length === 0
      ? []
      : [{ choice, showOwnInformation: false, children }];
  });
}

function CatalogueChoiceInformationSections({
  choice,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
}) {
  const { profiles, rules, infoGroups, unresolved, keywords } =
    catalogueChoiceInformation(choice);
  return (
    <>
      {profiles.length > 0 && (
        <section className="selection-info-section">
          <h4>Profiles</h4>
          <div className="selection-profile-list">
            {profiles.map((profile, index) => (
              <SelectionProfile
                key={selectionProfileKey(profile, index)}
                profile={profile}
                report={undefined}
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
                reports={undefined}
              />
            ))}
          </div>
        </section>
      )}
      {keywords.length > 0 && (
        <section className="selection-info-section selection-keywords">
          <h4>Keywords</h4>
          <ul className="keyword-list">
            {keywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        </section>
      )}
      {unresolved.length > 0 && (
        <section className="selection-info-section unresolved-info-links">
          <h4>Unavailable linked information</h4>
          <ul>
            {unresolved.map((infoLink, index) => (
              <li key={unresolvedInfoLinkKey(infoLink, index)}>
                <strong>
                  {infoLink.link.name ??
                    infoLink.link.targetId ??
                    "Unnamed linked information"}
                </strong>
                <span>
                  This information could not be loaded from the imported
                  catalogue.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ChoiceDeveloperDetails choice={choice} />
    </>
  );
}

interface ChoiceDeveloperProvenance {
  readonly sources: readonly string[];
  readonly unresolved: readonly UnresolvedMaterializedInfoLink[];
}

/**
 * Collects imported provenance for the collapsed developer disclosure.
 *
 * Player cards intentionally omit source filenames and materializer reason
 * codes, but those details remain available for debugging and corpus evidence.
 * The traversal mirrors the information already rendered by the card and does
 * not resolve, mutate, or silently drop an unavailable link.
 */
function choiceDeveloperProvenance(
  choice: BattleScribeRosterSelectionChoice,
): ChoiceDeveloperProvenance {
  const sources = new Set<string>([choice.definition.source.filename]);
  const unresolved: UnresolvedMaterializedInfoLink[] = [];
  const visitInfoGroup = (infoGroup: MaterializedInfoGroup): void => {
    sources.add(infoGroup.definition.source.filename);
    for (const profile of infoGroup.profiles) {
      sources.add(profile.source.filename);
    }
    for (const rule of infoGroup.rules) sources.add(rule.source.filename);
    for (const infoLink of infoGroup.materializedInfoLinks) {
      if (isMaterializedProfileInfoLink(infoLink)) {
        sources.add(infoLink.definition.source.filename);
      } else if (isMaterializedRuleInfoLink(infoLink)) {
        sources.add(infoLink.definition.source.filename);
      } else if (isMaterializedInfoGroup(infoLink)) {
        visitInfoGroup(infoLink);
      } else {
        unresolved.push(infoLink);
      }
    }
    for (const nested of infoGroup.materializedInfoGroups) {
      visitInfoGroup(nested);
    }
  };

  for (const profile of choice.profiles) sources.add(profile.source.filename);
  for (const rule of choice.rules) sources.add(rule.source.filename);
  for (const infoGroup of choice.materializedInfoGroups) {
    visitInfoGroup(infoGroup);
  }
  for (const infoLink of choice.materializedInfoLinks) {
    if (isMaterializedProfileInfoLink(infoLink)) {
      sources.add(infoLink.definition.source.filename);
    } else if (isMaterializedRuleInfoLink(infoLink)) {
      sources.add(infoLink.definition.source.filename);
    } else if (isMaterializedInfoGroup(infoLink)) {
      visitInfoGroup(infoLink);
    } else {
      unresolved.push(infoLink);
    }
  }
  return { sources: [...sources], unresolved };
}

function ChoiceDeveloperDetails({
  choice,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
}) {
  const provenance = choiceDeveloperProvenance(choice);
  return (
    <details className="selection-developer-details">
      <summary>Developer details</summary>
      <dl>
        <Detail label="Source files" value={provenance.sources.join(", ")} />
      </dl>
      {provenance.unresolved.length > 0 && (
        <ul>
          {provenance.unresolved.map((infoLink, index) => (
            <li key={unresolvedInfoLinkKey(infoLink, index)}>
              <strong>
                {infoLink.link.name ??
                  infoLink.link.targetId ??
                  "Unnamed linked information"}
              </strong>
              <span>
                {infoLink.reason}
                {infoLink.link.targetId === undefined
                  ? ""
                  : `; target ${infoLink.link.targetId}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function CataloguePlannedChoice({
  addition,
  parentAmount,
}: {
  readonly addition: RosterSelectionInitializationPlan["additions"][number];
  readonly parentAmount: number;
}) {
  const amount =
    parentAmount * addition.quantity * (addition.amount ?? 1);
  return (
    <article className="choice-preview-planned-choice">
      <header>
        <strong>
          {amount}&times; {selectionChoiceLabel(addition.choice)}
        </strong>
        <small>
          {addition.choice.kind === "selectionEntry" &&
          addition.choice.type === "model"
            ? "Model"
            : "Initial equipment or option"}
        </small>
      </header>
      <CatalogueChoiceInformationSections choice={addition.choice} />
      {addition.initialization.additions.length > 0 && (
        <div className="choice-preview-planned-children">
          {addition.initialization.additions.map((child, index) => (
            <CataloguePlannedChoice
              key={`${selectionChoiceKey(child.choice)}:${index}`}
              addition={child}
              parentAmount={amount}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function CatalogueAvailableChoice({
  branch,
}: {
  readonly branch: CatalogueAvailableBranch;
}) {
  const [open, setOpen] = useState(false);
  const label = selectionChoiceLabel(branch.choice);
  if (!branch.showOwnInformation) {
    return (
      <section className="choice-preview-available-context">
        <h5>{label}</h5>
        <div className="choice-preview-available-children">
          {branch.children.map((child, index) => (
            <CatalogueAvailableChoice
              key={`${selectionChoiceKey(child.choice)}:${index}`}
              branch={child}
            />
          ))}
        </div>
      </section>
    );
  }
  return (
    <details
      className="choice-preview-available-choice"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{label}</summary>
      {open && (
        <>
          <CatalogueChoiceInformationSections choice={branch.choice} />
          {branch.children.length > 0 && (
            <div className="choice-preview-available-children">
              {branch.children.map((child, index) => (
                <CatalogueAvailableChoice
                  key={`${selectionChoiceKey(child.choice)}:${index}`}
                  branch={child}
                />
              ))}
            </div>
          )}
        </>
      )}
    </details>
  );
}

/**
 * Catalogue-authored information for a choice before it has a roster owner.
 *
 * The preview deliberately does not create an ephemeral occurrence. Effective
 * names, keywords, visibility, and characteristic modifiers can depend on the
 * parent and wider roster, so presenting those values here would turn an
 * attractive shortcut into false rules evidence. The selected card remains
 * the authoritative effective view after the player makes the choice.
 */
function CatalogueChoicePreviewDialog({
  choice,
  onClose,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly onClose: () => void;
}) {
  const headingId = useId();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const information = catalogueChoiceInformation(choice);
  const initializationResult =
    choice.kind === "selectionEntry" && choice.type === "unit"
      ? planRosterSelectionInitialization(choice)
      : undefined;
  const initialization =
    initializationResult?.ok === true ? initializationResult.value : undefined;
  const plannedChoices = new Set<BattleScribeRosterSelectionChoice>();
  if (initialization !== undefined) {
    collectPlannedChoices(initialization, plannedChoices);
  }
  const availableBranches =
    initialization === undefined
      ? []
      : catalogueUnitModelBranches(choice, plannedChoices);
  const hasInformation =
    catalogueChoiceHasOwnInformation(choice) ||
    (initialization?.additions.length ?? 0) > 0 ||
    availableBranches.length > 0;
  const label = selectionChoiceLabel(choice);
  return (
    <div
      className="choice-preview-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key === "Tab") {
          const focusable = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          );
          const first = focusable[0];
          const last = focusable.at(-1);
          if (first === undefined || last === undefined) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement === last
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <section
        className="choice-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <header className="choice-preview-heading">
          <div>
            <span className="eyebrow">Catalogue preview</span>
            <h3 id={headingId}>{label}</h3>
          </div>
          <button type="button" autoFocus onClick={onClose}>
            Close
          </button>
        </header>
        {!hasInformation && (
          <p className="choice-preview-empty">
            No rules, profiles, or information groups are attached to this
            choice.
          </p>
        )}
        <div className="selection-datasheet choice-preview-content">
          {(information.profiles.length > 0 ||
            information.rules.length > 0 ||
            information.infoGroups.length > 0 ||
            information.unresolved.length > 0 ||
            information.keywords.length > 0) && (
            <CatalogueChoiceInformationSections choice={choice} />
          )}
          {initialization !== undefined &&
            initialization.additions.length > 0 && (
              <section className="selection-info-section choice-preview-composition">
                <h4>Initial unit composition</h4>
                <div className="choice-preview-planned-list">
                  {initialization.additions.map((addition, index) => (
                    <CataloguePlannedChoice
                      key={`${selectionChoiceKey(addition.choice)}:${index}`}
                      addition={addition}
                      parentAmount={1}
                    />
                  ))}
                </div>
                {(initialization.completeness === "incomplete" ||
                  initialization.pendingChoices.length > 0) && (
                  <p className="choice-preview-plan-note">
                    Some initial choices depend on unsupported or unresolved
                    catalogue behavior and are not presented as selected here.
                  </p>
                )}
              </section>
            )}
          {availableBranches.length > 0 && (
            <details
              className="choice-preview-options"
              onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
            >
              <summary>
                <strong>Available model options and alternate profiles</strong>
                <span>
                  {availableBranches.length}{" "}
                  {availableBranches.length === 1 ? "branch" : "branches"}
                </span>
              </summary>
              {optionsOpen && (
                <>
                  <p>
                    These catalogue branches are available but are not
                    presented as equipped in the initial composition.
                  </p>
                  <div className="choice-preview-available-list">
                    {availableBranches.map((branch, index) => (
                      <CatalogueAvailableChoice
                        key={`${selectionChoiceKey(branch.choice)}:${index}`}
                        branch={branch}
                      />
                    ))}
                  </div>
                </>
              )}
            </details>
          )}
        </div>
      </section>
    </div>
  );
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
  choice,
  label,
  amount,
  completeness,
  status,
  canIncrease,
  selectedOccurrence,
  onIncrease,
  onSetAmount,
  onRemove,
  onPreview,
}: {
  readonly choice: BattleScribeRosterSelectionChoice;
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
  readonly onPreview?:
    | PreviewChoiceHandler
    | undefined;
}) {
  const costDescriptionId = useId();
  const hasCost = catalogueChoiceCosts(choice).length > 0;
  return (
    <span
      className="model-quantity-choice"
      data-completeness={completeness}
    >
      <span className="model-quantity-heading">
        <strong>
          <span>{label}</span>
          <ChoiceCostBadges
            choice={choice}
            id={hasCost ? costDescriptionId : undefined}
          />
        </strong>
        {onPreview !== undefined && (
          <ChoicePreviewButton choice={choice} onPreview={onPreview} />
        )}
      </span>
      <span className="model-quantity-controls">
        <button
          type="button"
          aria-label={`Remove one ${label}`}
          aria-describedby={hasCost ? costDescriptionId : undefined}
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
          aria-describedby={hasCost ? costDescriptionId : undefined}
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
  node,
  selectionCanAddAnother,
  onChoose,
  onSetAmount,
  onRemove,
  onPreviewChoice,
}: {
  readonly session: LocalRosterSession;
  readonly parent: RosterSelection;
  readonly parentName: string;
  readonly node: RosterSelectionChoiceGroupNode;
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
  readonly onPreviewChoice?:
    | PreviewChoiceHandler
    | undefined;
}) {
  const { group, children } = node;
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

  const nestedGroups = children.map((child) => (
    <RosterSelectionChoiceGroup
      key={selectionChoiceKey(child.group.group)}
      session={session}
      parent={parent}
      parentName={parentName}
      node={child}
      selectionCanAddAnother={selectionCanAddAnother}
      onChoose={onChoose}
      onSetAmount={onSetAmount}
      onRemove={onRemove}
      onPreviewChoice={onPreviewChoice}
    />
  ));

  if (
    group.choices.length === 0 &&
    group.hiddenChoiceCount === 0 &&
    children.length > 0
  ) {
    return (
      <section
        className="child-choice-group-wrapper"
        role="group"
        aria-label={`${name} choices for ${parentName}`}
        data-completeness={group.completeness}
      >
        <div className="child-choice-group-wrapper-heading">
          <strong>{name}</strong>
          <span>{selectionGroupStatus(group)}</span>
        </div>
        <div className="child-choice-group-children">{nestedGroups}</div>
      </section>
    );
  }

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
            const costDescriptionId =
              catalogueChoiceCosts(choice).length === 0
                ? undefined
                : choiceCostDescriptionId(parent.id, choice);
            if (isModelChoice(choice) && finiteMaximum !== 1) {
              return (
                <ModelQuantityChoice
                  key={selectionChoiceKey(choice)}
                  choice={choice}
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
                  onPreview={onPreviewChoice}
                />
              );
            }
            return selectedOccurrence === undefined ? (
              <span
                className="child-choice-group-option"
                key={selectionChoiceKey(choice)}
              >
                <span className="choice-segmented-control">
                  <button
                    type="button"
                    aria-label={displayLabel}
                    aria-describedby={costDescriptionId}
                    aria-pressed={false}
                    disabled={blocksAdditionalChoices}
                    onClick={() => onChoose(parent.id, choice, group)}
                  >
                    <span className="choice-button-copy">
                      <span>{displayLabel}</span>
                      <ChoiceCostBadges
                        choice={choice}
                        id={costDescriptionId}
                      />
                    </span>
                  </button>
                  {onPreviewChoice !== undefined && (
                    <ChoicePreviewButton
                      choice={choice}
                      onPreview={onPreviewChoice}
                    />
                  )}
                </span>
              </span>
            ) : (
              <span
                className="child-choice-group-selected-option"
                key={selectionChoiceKey(choice)}
              >
                <span
                  className="choice-segmented-control"
                  data-selected="true"
                >
                  <button
                    type="button"
                    aria-label={
                      selectedChoiceAmount > 1
                        ? `${displayLabel} (${selectedChoiceAmount} selected)`
                        : displayLabel
                    }
                    aria-describedby={costDescriptionId}
                    aria-pressed={selected}
                    // Repeated choices can carry different configured subtrees.
                    // Remove only the newest one so recovery is undoable and
                    // never silently destroys the older configured copies.
                    onClick={() => onRemove(selectedOccurrence.id)}
                  >
                    <span className="choice-button-copy">
                      <span>
                        {selectedChoiceAmount > 1
                          ? `${displayLabel} (${selectedChoiceAmount} selected)`
                          : displayLabel}
                      </span>
                      <ChoiceCostBadges
                        choice={choice}
                        id={costDescriptionId}
                      />
                    </span>
                  </button>
                  {onPreviewChoice !== undefined && (
                    <ChoicePreviewButton
                      choice={choice}
                      onPreview={onPreviewChoice}
                    />
                  )}
                </span>
                {canAddAnother && (
                  <button
                    type="button"
                    aria-label={`Add another ${displayLabel}`}
                    aria-describedby={costDescriptionId}
                    onClick={() => onChoose(parent.id, choice, group)}
                  >
                    <span className="choice-button-copy">
                      <span>Add another {displayLabel}</span>
                      <ChoiceCostBadges choice={choice} />
                    </span>
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      {children.length > 0 && (
        <div className="child-choice-group-children">{nestedGroups}</div>
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
          <h4>Unavailable linked information</h4>
          <ul>
            {unresolved.map((infoLink, index) => (
              <li key={unresolvedInfoLinkKey(infoLink, index)}>
                <strong>
                  {infoLink.link.name ??
                    infoLink.link.targetId ??
                    "Unnamed linked information"}
                </strong>
                <span>
                  This information could not be loaded from the imported
                  catalogue.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ChoiceDeveloperDetails choice={choice} />
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
    // Renaming an occurrence and setting a non-model amount are build-time
    // work, not reading material. Imported provenance lives in the adjacent
    // Developer details disclosure rather than leaking filenames into this
    // ordinary editing surface. Open state is controlled because jsdom does
    // not implement native `<details>` toggling.
    <details className="selection-edit" open={editing}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          setEditing((current) => !current);
        }}
      >
        <span>Edit selection</span>
        <small>Name and amount</small>
      </summary>
      {editing && (
        <>
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

const knownSelectionAmountBoundsCache = new WeakMap<
  LocalRosterSession,
  ReadonlyMap<SelectionOccurrenceId, readonly KnownSelectionAmountBound[]>
>();

/**
 * Indexes exact complete selection constraints once per immutable session.
 *
 * A selection constraint's `observed` value is the aggregate under its declared
 * parent scope. The amount policy applies only the edited occurrence's delta to
 * that aggregate, preserving sibling contributions and condition-aware limits.
 */
function knownSelectionAmountBounds(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): readonly KnownSelectionAmountBound[] {
  let index = knownSelectionAmountBoundsCache.get(session);
  if (index === undefined) {
    const built = new Map<
      SelectionOccurrenceId,
      readonly KnownSelectionAmountBound[]
    >();
    const validation = inspectLocalRosterSupportedValidation(session);
    if (validation.ok) {
      for (const selection of validation.value.constraints.selections.selections) {
        const bounds: KnownSelectionAmountBound[] = [];
        for (const constraint of selection.constraints) {
          if (
            (constraint.constraintType !== "min" &&
              constraint.constraintType !== "max") ||
            constraint.scope !== "parent" ||
            constraint.constraint.field !== "selections" ||
            constraint.completeness !== "complete" ||
            constraint.limit === undefined ||
            constraint.observed === undefined ||
            !Number.isFinite(constraint.limit) ||
            !Number.isFinite(constraint.observed) ||
            !constraint.matching.some(({ id }) => id === selection.owner.id) ||
            (constraint.constraintType === "max" &&
              isUnboundedConstraintValue(constraint.limit))
          ) {
            continue;
          }
          bounds.push({
            type: constraint.constraintType,
            limit: constraint.limit,
            observed: constraint.observed,
          });
        }
        built.set(selection.owner.id, bounds);
      }
    }
    index = built;
    knownSelectionAmountBoundsCache.set(session, index);
  }
  return index.get(selectionId) ?? [];
}

/**
 * Adds a complete group aggregate when the edited occurrence belongs to it.
 * Exact entry constraints come from `knownSelectionAmountBounds`; direct
 * choice inspection is intentionally not duplicated here. Group constraints
 * have no roster occurrence of their own, so the parent inspection is their
 * authoritative editing boundary.
 */
function childSelectionAmountBounds(
  selection: RosterSelection,
  inspection: ReturnType<typeof inspectLocalRosterChildChoices>,
): readonly KnownSelectionAmountBound[] {
  if (!inspection.ok) return [];
  const group = inspection.value.groups.find((candidate) =>
    candidate.selected.some(({ id }) => id === selection.id),
  );
  if (group === undefined || group.completeness !== "complete") return [];

  const observed = rosterSelectionsAmount(group.selected);
  const bounds: KnownSelectionAmountBound[] = [];
  if (group.minimum !== undefined && Number.isFinite(group.minimum)) {
    bounds.push({ type: "min", limit: group.minimum, observed });
  }
  if (
    group.maximum !== undefined &&
    Number.isFinite(group.maximum) &&
    !isUnboundedConstraintValue(group.maximum)
  ) {
    bounds.push({ type: "max", limit: group.maximum, observed });
  }
  return bounds;
}

function SelectionAmountEditor({
  selection,
  defaultAmount,
  step,
  bounds = [],
  onSetAmount,
  label = "Amount",
}: {
  readonly selection: RosterSelection;
  readonly defaultAmount: string | undefined;
  readonly step: string | undefined;
  readonly bounds?: readonly KnownSelectionAmountBound[];
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
  const allowed =
    valid && selectionAmountChangeAllowed(effectiveAmount, parsed, bounds);
  const canSave = allowed && parsed !== effectiveAmount;
  const canUseOne =
    selection.amount !== undefined &&
    selectionAmountChangeAllowed(effectiveAmount, 1, bounds);
  const currentSatisfiesBounds = selectionAmountSatisfiesBounds(
    effectiveAmount,
    bounds,
  );
  const numericStep = positiveFiniteNumber(step);
  const hintId = `${id}-hint`;
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
          aria-invalid={valid && !allowed ? "true" : undefined}
          aria-describedby={
            defaultAmount === undefined && bounds.length === 0
              ? undefined
              : hintId
          }
          onChange={(event) => setAmount(event.currentTarget.value)}
        />
        <button type="submit" disabled={!canSave}>
          Set amount
        </button>
        <button
          type="button"
          disabled={!canUseOne}
          onClick={() => onSetAmount(selection.id, undefined)}
        >
          Use 1
        </button>
      </div>
      {(defaultAmount !== undefined || bounds.length > 0) && (
        <small id={hintId}>
          {defaultAmount === undefined
            ? ""
            : `Source default: ${defaultAmount}${
                numericStep === undefined ? "" : `; step ${numericStep}`
              }. `}
          {bounds.length === 0
            ? ""
            : valid && !allowed
              ? currentSatisfiesBounds
                ? "Choose a value within the complete known model limits."
                : "Choose a value that moves the roster toward its complete known model limits without worsening another."
              : currentSatisfiesBounds
                ? "Complete known model limits apply."
                : "This roster is outside a complete known model limit; changes toward legality remain available."}
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
  // A completely known empty set is absence, not player-facing information.
  // Incomplete evaluation still renders below because hiding uncertainty would
  // silently turn unsupported category behavior into a confident empty answer.
  if (
    completeness === "complete" &&
    categories?.length === 0 &&
    removed.length === 0
  ) {
    return null;
  }
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
      ) : categories.length === 0 && completeness === "incomplete" ? (
        <p className="keywords-unresolved">
          Effective keywords are incomplete for this selection.
        </p>
      ) : categories.length === 0 ? null : (
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
  return (
    <article className="selection-rule">
      <header>
        <strong>{name ?? "Unnamed rule"}</strong>
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
          <h5>Unavailable linked information</h5>
          <ul>
            {unresolved.map((infoLink, index) => (
              <li key={unresolvedInfoLinkKey(infoLink, index)}>
                <strong>
                  {infoLink.link.name ??
                    infoLink.link.targetId ??
                    "Unnamed linked information"}
                </strong>
                <span>
                  This information could not be loaded from the imported
                  catalogue.
                </span>
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

interface RootChoiceStatus {
  readonly value: string;
  readonly sourceMaximum: boolean;
}

function rootChoiceStatus(
  state: LocalRosterRootChoiceState,
): RootChoiceStatus {
  const selectedAmount = rosterSelectionsAmount(state.selected);
  if (state.maximum !== undefined && Number.isFinite(state.maximum)) {
    return {
      value: `${formatNumber(selectedAmount)} / ${formatNumber(state.maximum)}`,
      sourceMaximum: false,
    };
  }
  const sourceMaximum = catalogueRootSourceMaximum(state.choice.materialized);
  return {
    value:
      sourceMaximum === undefined
        ? formatNumber(selectedAmount)
        : `${formatNumber(selectedAmount)} / ${formatNumber(sourceMaximum)}`,
    sourceMaximum: sourceMaximum !== undefined,
  };
}

/**
 * Returns the tightest authored force/roster repetition maximum for a root.
 *
 * Conditional modifiers can change this value after roster configuration, so
 * this is presentation fallback only: it is visibly qualified as `base` and
 * never disables Add. A fully evaluated maximum from the root inspection wins
 * above and remains the only value allowed to enforce capacity.
 */
function catalogueRootSourceMaximum(
  choice: BattleScribeRosterSelectionChoice,
): number | undefined {
  const maxima = choice.constraints
    .filter(
      ({ type, field, scope, value, percentValue }) =>
        type === "max" &&
        field === "selections" &&
        (scope === "force" || scope === "roster") &&
        percentValue !== true &&
        value !== undefined &&
        Number.isSafeInteger(value) &&
        value >= 0,
    )
    .map(({ value }) => value!);
  return maxima.length === 0 ? undefined : Math.min(...maxima);
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
