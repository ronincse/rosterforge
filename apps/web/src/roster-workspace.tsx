import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

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
  type RosterCategoryConstraintReport,
  type RosterSelectionInitializationPlan,
  type RosterForceConstraintReport,
  type RosterProfileCharacteristicReport,
  type RosterSelectionConstraintReport,
  type RosterSelectionConstraintStatus,
  type RosterStructuralBoundReport,
  type RosterStructuralBoundStatus,
  type SupportedRosterValidationFinding,
} from "@rosterforge/evaluation";
import type {
  RuleProjection,
} from "@rosterforge/battlescribe-data";
import type {
  Diagnostic,
  ObjectId,
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
  type RosterWorkspaceRootChoiceGroup,
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

interface KeywordRulePreview {
  readonly keyword: string;
  readonly rules: readonly SelectionRuleDetail[];
}

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
  onDuplicateSelection,
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
  draftActionMessage,
  draftActionDiagnostics = [],
}: {
  readonly session: LocalRosterSession;
  readonly diagnostics: readonly Diagnostic[];
  readonly onClear: () => void;
  readonly onAddRootSelection: (
    choice: LocalRosterRootChoice,
  ) => SelectionOccurrenceId | undefined;
  readonly onDuplicateSelection: (
    id: SelectionOccurrenceId,
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
  /** Save/autosave feedback stays with the open roster after the library unmounts. */
  readonly draftActionMessage?: string | undefined;
  readonly draftActionDiagnostics?: readonly Diagnostic[];
}) {
  const rootFilterId = useId();
  const [rootFilter, setRootFilter] = useState("");
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueInitialFocus, setCatalogueInitialFocus] = useState<
    "close" | "search"
  >("close");
  const [printBlocked, setPrintBlocked] = useState(false);
  const [activeSelectionId, setActiveSelectionId] =
    useState<SelectionOccurrenceId>();
  const [pendingAddedSelectionFocus, setPendingAddedSelectionFocus] =
    useState<SelectionOccurrenceId>();
  const [viewedSelectionId, setViewedSelectionId] =
    useState<SelectionOccurrenceId>();
  const [keywordRulePreview, setKeywordRulePreview] =
    useState<KeywordRulePreview>();
  const [problemsOpen, setProblemsOpen] = useState(false);
  const actionsMenuId = useId();
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [previewedChoice, setPreviewedChoice] =
    useState<BattleScribeRosterSelectionChoice>();
  const previewReturnFocus = useRef<HTMLElement | null>(null);
  const unitCardReturnFocus = useRef<HTMLElement | null>(null);
  const keywordRuleReturnFocus = useRef<HTMLElement | null>(null);
  const problemsReturnFocus = useRef<HTMLElement | null>(null);
  const catalogueReturnFocus = useRef<HTMLElement | null>(null);
  const actionsMenu = useRef<HTMLDivElement | null>(null);
  const actionsMenuTrigger = useRef<HTMLButtonElement | null>(null);
  const rootFilterInput = useRef<HTMLInputElement | null>(null);
  const [pendingSelectionAnchor, setPendingSelectionAnchor] =
    useState<string>();
  const [pendingConfigurationAnchor, setPendingConfigurationAnchor] =
    useState<string>();
  const [pendingArmyRuleAnchor, setPendingArmyRuleAnchor] =
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
  const rootChoiceInspection = workspace.reports.rootChoices;
  const configurationReferenceSelectionIds = useMemo(
    () => requiredConfigurationReferenceSelectionIds(rootChoiceInspection),
    [rootChoiceInspection],
  );
  const sourceConfigurationGroup = workspace.selections.groups.find(
    ({ role }) => role.key === "configuration",
  );
  const configurationRules =
    sourceConfigurationGroup?.selections.filter((selection) =>
      configurationReferenceSelectionIds.has(selection.occurrence.id),
    ) ?? [];
  const configurationSelections =
    sourceConfigurationGroup?.selections.filter(
      (selection) => !configurationRules.includes(selection),
    ) ?? [];
  const configurationGroup =
    sourceConfigurationGroup === undefined || configurationSelections.length === 0
      ? undefined
      : {
          ...sourceConfigurationGroup,
          selections: configurationSelections,
          amount: rosterSelectionsAmount(
            configurationSelections.map(({ occurrence }) => occurrence),
          ),
        };
  const configurationRulesGroup =
    sourceConfigurationGroup === undefined || configurationRules.length === 0
      ? undefined
      : {
          ...sourceConfigurationGroup,
          selections: configurationRules,
          amount: rosterSelectionsAmount(
            configurationRules.map(({ occurrence }) => occurrence),
          ),
        };
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
  const nonRemovableRootSelectionIds = useMemo(
    () => requiredRootSelectionIds(rootChoiceInspection),
    [rootChoiceInspection],
  );
  const rootSelectionCanDuplicate = useMemo(
    () => rootSelectionDuplicationCapacity(rootChoiceInspection),
    [rootChoiceInspection],
  );
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
  const openProblems = (trigger: HTMLElement) => {
    problemsReturnFocus.current = trigger;
    setProblemsOpen(true);
  };
  const closeProblems = () => {
    setProblemsOpen(false);
    const returnFocus = problemsReturnFocus.current;
    problemsReturnFocus.current = null;
    queueMicrotask(() => {
      if (returnFocus !== null && document.contains(returnFocus)) {
        returnFocus.focus();
      }
    });
  };
  const closeActionsMenu = (restoreFocus: boolean) => {
    setActionsMenuOpen(false);
    if (!restoreFocus) return;
    queueMicrotask(() => actionsMenuTrigger.current?.focus());
  };
  const runRosterAction = (action: () => void) => {
    // Dismiss the command surface before a print popup, persistence update, or
    // history mutation can synchronously move or replace the roster beneath it.
    setActionsMenuOpen(false);
    action();
    queueMicrotask(() => actionsMenuTrigger.current?.focus());
  };
  const closeUnitCard = () => {
    setViewedSelectionId(undefined);
    const returnFocus = unitCardReturnFocus.current;
    unitCardReturnFocus.current = null;
    queueMicrotask(() => {
      if (returnFocus !== null && document.contains(returnFocus)) {
        returnFocus.focus();
      }
    });
  };
  const openUnitCard = (
    selectionId: SelectionOccurrenceId,
    trigger: HTMLElement,
  ) => {
    unitCardReturnFocus.current = trigger;
    setViewedSelectionId(selectionId);
  };
  const openKeywordRules = (
    preview: KeywordRulePreview,
    trigger: HTMLButtonElement,
  ) => {
    keywordRuleReturnFocus.current = trigger;
    setKeywordRulePreview(preview);
  };
  const closeKeywordRules = () => {
    setKeywordRulePreview(undefined);
    const returnFocus = keywordRuleReturnFocus.current;
    keywordRuleReturnFocus.current = null;
    queueMicrotask(() => {
      if (returnFocus !== null && document.contains(returnFocus)) {
        returnFocus.focus();
      }
    });
  };
  const duplicateArmySelection = (
    selectionId: SelectionOccurrenceId,
  ): SelectionOccurrenceId | undefined => {
    const duplicateId = onDuplicateSelection(selectionId);
    if (duplicateId !== undefined) setPendingAddedSelectionFocus(duplicateId);
    return duplicateId;
  };
  const removeArmySelection = (selectionId: SelectionOccurrenceId) => {
    if (activeSelectionId === selectionId) setActiveSelectionId(undefined);
    if (viewedSelectionId === selectionId) setViewedSelectionId(undefined);
    onRemoveSelection(selectionId);
  };
  const openCatalogue = (
    trigger: HTMLElement | null,
    focus: "close" | "search" = compactAddUnitSearchPreferred()
      ? "search"
      : "close",
  ) => {
    catalogueReturnFocus.current = trigger;
    setCatalogueInitialFocus(focus);
    setCatalogueOpen(true);
    if (focus === "search") {
      queueMicrotask(() => rootFilterInput.current?.focus());
    }
  };
  const closeCatalogue = (restoreFocus = true) => {
    setCatalogueOpen(false);
    const returnFocus = catalogueReturnFocus.current;
    catalogueReturnFocus.current = null;
    if (!restoreFocus) return;
    queueMicrotask(() => {
      if (returnFocus !== null && document.contains(returnFocus)) {
        returnFocus.focus();
      }
    });
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const visibleDialog = document.querySelector(
        '.choice-preview-backdrop:not([hidden]) [role="dialog"][aria-modal="true"]',
      );
      if (
        event.key !== "/" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        editableKeyboardTarget(event.target) ||
        (visibleDialog !== null && visibleDialog.id !== "add-unit-dialog")
      ) {
        return;
      }
      event.preventDefault();
      if (catalogueOpen) {
        rootFilterInput.current?.focus();
        return;
      }
      openCatalogue(
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
        "search",
      );
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });
  useEffect(() => {
    if (!catalogueOpen) return;
    // The catalogue can be much taller than the roster. Keep wheel, touch, and
    // keyboard scrolling inside the modal task so dismissal returns to the
    // same roster position rather than a displaced background document.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [catalogueOpen]);
  useEffect(() => {
    if (!actionsMenuOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !actionsMenu.current?.contains(event.target)
      ) {
        closeActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [actionsMenuOpen]);
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
    if (pendingSelectionAnchor === undefined) return;
    const target = document.getElementById(pendingSelectionAnchor);
    if (target === null) return;
    // A check can target a child that is mounted only in the selected unit's
    // options panel. Focus that unit first, then complete the original jump
    // after React has rendered the exact stable anchor.
    target.scrollIntoView?.({ block: "start" });
    setPendingSelectionAnchor(undefined);
  }, [activeSelectionId, pendingSelectionAnchor, session]);
  useEffect(() => {
    if (pendingAddedSelectionFocus === undefined) return;
    const row = document.getElementById(
      selectionAnchor(pendingAddedSelectionFocus),
    );
    const disclosure = row?.querySelector<HTMLElement>(
      ".roster-unit-row-disclosure",
    );
    if (disclosure == null) return;
    disclosure.focus();
    setPendingAddedSelectionFocus(undefined);
  }, [pendingAddedSelectionFocus, workspace]);
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
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [armyRulesOpen, setArmyRulesOpen] = useState(false);
  const previousConfigurationState = useRef({
    rosterId: workspace.rosterId,
    hasConfiguration,
    needsAttention: configurationNeedsAttention,
  });
  useEffect(() => {
    const previous = previousConfigurationState.current;
    const rosterChanged = previous.rosterId !== workspace.rosterId;
    if (rosterChanged) {
      setConfigurationOpen(false);
    } else if (
      previous.hasConfiguration &&
      !previous.needsAttention &&
      configurationNeedsAttention
    ) {
      // A new violation reveals its repair controls. Existing invalid setup
      // still starts compact and can be deliberately closed after review.
      setConfigurationOpen(true);
    } else if (!hasConfiguration) {
      setConfigurationOpen(false);
    }

    previousConfigurationState.current = {
      rosterId: workspace.rosterId,
      hasConfiguration,
      needsAttention: configurationNeedsAttention,
    };
  }, [configurationNeedsAttention, hasConfiguration, workspace.rosterId]);
  useEffect(() => {
    if (!configurationOpen || pendingConfigurationAnchor === undefined) return;
    const target = document.getElementById(pendingConfigurationAnchor);
    if (target === null) return;
    // Configuration descendants can be behind two disclosures: the compact
    // settings row and their owning selection card. Reveal both, then put the
    // keyboard cursor on the exact report target instead of merely changing
    // the URL fragment behind a closed editor.
    target.scrollIntoView?.({ block: "start" });
    target.focus({ preventScroll: true });
    setPendingConfigurationAnchor(undefined);
  }, [configurationOpen, pendingConfigurationAnchor, session]);
  useEffect(() => {
    if (!armyRulesOpen || pendingArmyRuleAnchor === undefined) return;
    const target = document.getElementById(pendingArmyRuleAnchor);
    if (target === null) return;
    target.scrollIntoView?.({ block: "start" });
    target.focus({ preventScroll: true });
    setPendingArmyRuleAnchor(undefined);
  }, [armyRulesOpen, pendingArmyRuleAnchor, session]);
  const limitBearingCost = workspace.costs.available
    ? headlineRosterCost(workspace)
    : undefined;
  const limitPending = pointsLimitPending(workspace, limitBearingCost);
  const configurationCostLimits = workspace.costs.available
    ? configurationRelevantCostLimits(
        configurationGroup,
        session,
        workspace.costs.activeTotals,
      )
    : [];
  const configurationSummaryCostLimits: readonly (RosterWorkspaceCost & {
    readonly limit: number;
  })[] = [
    ...(limitBearingCost?.limit === undefined
      ? []
      : [
          limitBearingCost as RosterWorkspaceCost & {
            readonly limit: number;
          },
        ]),
    ...configurationCostLimits.filter(
      ({ typeId }) => typeId !== limitBearingCost?.typeId,
    ),
  ];
  return (
    <div className="roster-overview">
      <nav
        className="roster-workspace-nav"
        aria-label="Roster workspace navigation"
      >
        <a
          className="roster-nav-roster"
          href="#selected-roster-heading"
          aria-label={
            limitBearingCost === undefined
              ? `${workspace.name}, ${workspace.catalogueName}; ${formatCount(
                  armyTopLevelSelectionCount,
                  "army selection",
                )}`
              : limitPending
                ? `${workspace.name}, ${workspace.catalogueName}; ${formatNumber(
                    limitBearingCost.value,
                  )} ${limitBearingCost.name} used, limit pending`
                : limitBearingCost.limit === undefined
                  ? `${workspace.name}, ${workspace.catalogueName}; ${formatNumber(
                      limitBearingCost.value,
                    )} ${limitBearingCost.name} used`
              : `${workspace.name}, ${workspace.catalogueName}; ${formatNumber(
                  limitBearingCost.value,
                )} of ${formatNumber(limitBearingCost.limit)} ${limitBearingCost.name} used`
          }
        >
          <span className="roster-nav-identity">
            <h2 className="roster-nav-title">{workspace.name}</h2>
            <small className="roster-nav-faction">
              {workspace.catalogueName}
            </small>
          </span>
          <span className="roster-nav-budget">
            {limitBearingCost === undefined ? (
              <>
                <strong>{armyTopLevelSelectionCount}</strong>
                <small>army selections</small>
              </>
            ) : limitPending ? (
              <>
                <strong>{formatNumber(limitBearingCost.value)}</strong>
                <small>{limitBearingCost.name}; limit pending</small>
              </>
            ) : limitBearingCost.limit === undefined ? (
              <>
                <strong>{formatNumber(limitBearingCost.value)}</strong>
                <small>{limitBearingCost.name} used</small>
              </>
            ) : (
              <>
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
          </span>
        </a>
        <button
          className="add-unit-trigger"
          type="button"
          aria-controls={catalogueOpen ? "add-unit-dialog" : undefined}
          aria-expanded={catalogueOpen}
          aria-haspopup="dialog"
          aria-label={`Add unit, ${formatCount(
            filteredRootChoiceCount,
            "available choice",
          )}`}
          onClick={(event) => openCatalogue(event.currentTarget)}
        >
          <span>Add unit</span>
          <strong>{filteredRootChoiceCount}</strong>
          <small>available choices</small>
        </button>
        <button
          className="roster-problems-trigger"
          type="button"
          aria-controls={problemsOpen ? "roster-problems-dialog" : undefined}
          aria-expanded={problemsOpen}
          aria-haspopup="dialog"
          aria-label={
            workspace.validation.available
              ? `Open roster problems, ${formatCount(
                  validationIssueCount,
                  "known violation",
                )}`
              : "Open roster problems, checks unavailable"
          }
          data-problems={
            !workspace.validation.available
              ? "unavailable"
              : validationIssueCount === 0
                ? "none"
                : "present"
          }
          onClick={(event) => openProblems(event.currentTarget)}
        >
          <WarningTriangleIcon />
          <strong>
            {workspace.validation.available ? validationIssueCount : "—"}
          </strong>
        </button>
        <div className="roster-actions-menu" ref={actionsMenu}>
          <button
            ref={actionsMenuTrigger}
            className="roster-actions-trigger"
            type="button"
            aria-controls={actionsMenuId}
            aria-expanded={actionsMenuOpen}
            aria-haspopup="menu"
            aria-label={
              unsavedChanges
                ? "Roster actions, unsaved changes"
                : "Roster actions"
            }
            data-unsaved={unsavedChanges ? "true" : undefined}
            onClick={() => setActionsMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown") return;
              event.preventDefault();
              setActionsMenuOpen(true);
              queueMicrotask(() => {
                actionsMenu.current
                  ?.querySelector<HTMLButtonElement>(
                    '[role="menuitem"]:not(:disabled)',
                  )
                  ?.focus();
              });
            }}
          >
            <RosterActionsIcon />
          </button>
          {actionsMenuOpen && (
            <div
              className="roster-actions-popover"
              id={actionsMenuId}
              role="menu"
              aria-label="Roster actions"
              onKeyDown={(event) => {
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="menuitem"]:not(:disabled)',
                  ),
                );
                const current = items.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const nextIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : event.key === "ArrowDown"
                        ? (current + 1 + items.length) % items.length
                        : event.key === "ArrowUp"
                          ? (current - 1 + items.length) % items.length
                          : undefined;
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeActionsMenu(true);
                } else if (nextIndex !== undefined) {
                  event.preventDefault();
                  items[nextIndex]?.focus();
                }
              }}
            >
              <div className="roster-actions-popover-heading">
                <strong>Roster actions</strong>
                <small data-unsaved={unsavedChanges ? "true" : undefined}>
                  {unsavedChanges ? "Unsaved changes" : "All changes saved"}
                </small>
              </div>
              <div className="roster-actions-history">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canUndo}
                  onClick={() => runRosterAction(onUndo)}
                >
                  Undo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canRedo}
                  onClick={() => runRosterAction(onRedo)}
                >
                  Redo
                </button>
              </div>
              <button
                className="save-draft-action"
                type="button"
                role="menuitem"
                disabled={isSavingDraft}
                onClick={() => runRosterAction(onSaveDraft)}
              >
                {isSavingDraft
                  ? "Saving..."
                  : hasSavedDraft
                    ? "Update saved draft"
                    : "Save draft"}
              </button>
              <button
                className="print-roster-action"
                type="button"
                role="menuitem"
                onClick={() =>
                  runRosterAction(() =>
                    setPrintBlocked(
                      !onPrintRoster(
                        createRosterPrintViewModel(
                          session,
                          costResult,
                          supportedValidation,
                        ),
                      ),
                    ),
                  )
                }
              >
                Print / Save PDF
              </button>
              <button
                className="change-roster-setup-action"
                type="button"
                role="menuitem"
                onClick={onClear}
              >
                Change roster setup
              </button>
            </div>
          )}
        </div>
      </nav>
      {(draftActionMessage !== undefined || isSavingDraft) && (
        <p className="draft-action-status" role="status">
          {draftActionMessage ?? "Saving roster draft..."}
        </p>
      )}
      <DiagnosticList diagnostics={draftActionDiagnostics} />
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
          revealAnchor={pendingConfigurationAnchor}
          costLimits={configurationSummaryCostLimits}
          session={session}
          selectionCanAddAnother={selectionCanAddAnother}
          onAddChild={onAddChildSelection}
          onRename={onRenameSelection}
          onSetAmount={onSetSelectionAmount}
          onRemove={onRemoveSelection}
          nonRemovableSelectionIds={nonRemovableRootSelectionIds}
          onPreviewChoice={openChoicePreview}
        />
      )}

      {configurationRules.length > 0 && (
        <RosterArmyRulesSection
          selections={configurationRules}
          open={armyRulesOpen}
          onToggle={() => setArmyRulesOpen((current) => !current)}
          session={session}
          selectionCanAddAnother={selectionCanAddAnother}
          onAddChild={onAddChildSelection}
          onRename={onRenameSelection}
          onSetAmount={onSetSelectionAmount}
          onRemove={onRemoveSelection}
          onPreviewChoice={openChoicePreview}
        />
      )}

      <section
        className="roster-builder-grid"
        aria-label="Roster builder"
        data-catalogue-open="false"
        data-options-open={activeSelection !== undefined}
      >
        <section
          className="selected-roster-pane"
          id={force === undefined ? undefined : forceAnchor(force.id)}
          data-force-id={force?.id}
          aria-labelledby="selected-roster-heading"
          data-options-open={activeSelection !== undefined}
        >
          <div className="builder-pane-heading">
            <h3 id="selected-roster-heading" tabIndex={-1}>
              Your roster
            </h3>
            <span>
              {formatCount(
                armyTopLevelSelectionCount,
                "army selection",
              )}
            </span>
          </div>

          {force === undefined || armyGroups.length === 0 ? (
            <div className="empty-selected-roster">
              <strong>No units added yet</strong>
              <span>Choose Add unit to begin building this army.</span>
            </div>
          ) : (
            <div className="roster-selection-list">
              {/* One group per battlefield role, in catalogue order, so the
                  tree reads like an army list rather than a flat tree. The
                  configuration group lives before the sticky workspace so it
                  can be completed and dismissed before unit building begins.
                  Optional empty groups remain hidden. A supported positive
                  role minimum deliberately seeds an empty group so the roster
                  itself shows what is still required. */}
              {armyGroups.map((group) => (
                <RosterSelectionSection
                  key={group.role.key}
                  heading={group.role.name}
                  anchorId={stableDomAnchor("roster-role", group.role.key)}
                  roleKnown={group.role.known}
                  selections={group.selections}
                  amount={group.amount}
                  requirement={group.requirement}
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
                  selectionCanDuplicate={rootSelectionCanDuplicate}
                  onViewUnit={openUnitCard}
                  onDuplicateUnit={duplicateArmySelection}
                  onRemoveUnit={removeArmySelection}
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
              onView={(trigger) =>
                openUnitCard(activeSelection.occurrence.id, trigger)
              }
              onDuplicate={() =>
                duplicateArmySelection(activeSelection.occurrence.id)
              }
              canDuplicate={
                (rootSelectionCanDuplicate.get(
                  activeSelection.occurrence.id,
                ) ?? true) &&
                (selectionCanAddAnother.get(activeSelection.occurrence.id) ??
                  true)
              }
              viewed={
                viewedSelectionId === activeSelection.occurrence.id
              }
            />
          )}
        </section>

      </section>

      {catalogueOpen && (
        <AddUnitDialog
          covered={previewedChoice !== undefined}
          filterId={rootFilterId}
          filterInput={rootFilterInput}
          filter={rootFilter}
          initialFocus={catalogueInitialFocus}
          groups={rootChoiceGroups}
          filteredGroups={filteredRootChoiceGroups}
          filteredCount={filteredRootChoiceCount}
          normalizedFilter={normalizedRootFilter}
          inspection={rootChoiceInspection}
          onFilterChange={setRootFilter}
          onClose={() => closeCatalogue()}
          onAdd={(choice, armyChoice) => {
            const selectionId = onAddRootSelection(choice);
            if (selectionId === undefined) return;
            if (armyChoice) {
              setActiveSelectionId(selectionId);
              setPendingAddedSelectionFocus(selectionId);
              closeCatalogue(false);
            }
          }}
          onPreviewChoice={openChoicePreview}
        />
      )}

      {previewedChoice !== undefined && (
        <CatalogueChoicePreviewDialog
          choice={previewedChoice}
          onClose={closeChoicePreview}
        />
      )}

      {viewedSelection !== undefined && (
        <RosterUnitCardView
          covered={keywordRulePreview !== undefined}
          session={session}
          selectionModel={viewedSelection}
          selectionCanAddAnother={selectionCanAddAnother}
          onAddChild={onAddChildSelection}
          onRename={onRenameSelection}
          onSetAmount={onSetSelectionAmount}
          onRemove={onRemoveSelection}
          onViewKeywordRules={openKeywordRules}
          onClose={closeUnitCard}
        />
      )}

      {keywordRulePreview !== undefined && (
        <KeywordRulesDialog
          preview={keywordRulePreview}
          onClose={closeKeywordRules}
        />
      )}

      {problemsOpen && (
        <RosterProblemsDialog
          result={supportedValidation}
          onClose={closeProblems}
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
          const configurationOwner =
            decodedTargetId === undefined || configurationGroup === undefined
              ? undefined
              : topLevelWorkspaceSelectionContainingAnchor(
                  [configurationGroup],
                  decodedTargetId,
                );
          const armyRuleOwner =
            decodedTargetId === undefined ||
            configurationRulesGroup === undefined
              ? undefined
              : topLevelWorkspaceSelectionContainingAnchor(
                  [configurationRulesGroup],
                  decodedTargetId,
                );
          if (
            decodedTargetId !== undefined &&
            ((target !== null &&
              target.closest(".roster-configuration") !== null) ||
              configurationOwner !== undefined)
          ) {
            // Exact report links can point into setup. Reveal that target
            // before the browser follows the fragment instead of leaving it
            // inside a player-collapsed details element.
            event.preventDefault();
            setConfigurationOpen(true);
            setPendingConfigurationAnchor(decodedTargetId);
            return;
          }
          if (decodedTargetId !== undefined && armyRuleOwner !== undefined) {
            event.preventDefault();
            setArmyRulesOpen(true);
            setPendingArmyRuleAnchor(decodedTargetId);
            return;
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
                    workspace.header.completeness === "complete"
                      ? "all supported rules checked"
                      : "some rules not checked"
                  }`
                : "Checks unavailable"}
            </span>
          </summary>
          <div className="roster-checks-report-body">
            <RosterStructuralStatus result={supportedValidation} />
            <RosterConstraintSummary result={supportedValidation} />
            <RosterReportDetails workspace={workspace} />
          </div>
        </details>
      </section>

    </div>
  );
}

/** The focused catalogue task opened from the roster's primary Add unit action. */
function AddUnitDialog({
  covered,
  filterId,
  filterInput,
  filter,
  initialFocus,
  groups,
  filteredGroups,
  filteredCount,
  normalizedFilter,
  inspection,
  onFilterChange,
  onAdd,
  onPreviewChoice,
  onClose,
}: {
  readonly covered: boolean;
  readonly filterId: string;
  readonly filterInput: RefObject<HTMLInputElement | null>;
  readonly filter: string;
  readonly initialFocus: "close" | "search";
  readonly groups: readonly RosterWorkspaceRootChoiceGroup[];
  readonly filteredGroups: readonly RosterWorkspaceRootChoiceGroup[];
  readonly filteredCount: number;
  readonly normalizedFilter: string;
  readonly inspection: ReturnType<typeof inspectLocalRosterRootChoices>;
  readonly onFilterChange: (value: string) => void;
  readonly onAdd: (choice: LocalRosterRootChoice, armyChoice: boolean) => void;
  readonly onPreviewChoice: PreviewChoiceHandler;
  readonly onClose: () => void;
}) {
  return (
    <div
      className="choice-preview-backdrop add-unit-sheet-backdrop"
      role="presentation"
      hidden={covered}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key === "Tab") trapDialogFocus(event.currentTarget, event);
      }}
    >
      <section
        id="add-unit-dialog"
        className="choice-preview-dialog add-unit-dialog selection-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-unit-heading"
      >
        <header className="choice-preview-heading add-unit-heading">
          <div>
            <span className="eyebrow">Army catalogue</span>
            <h3 id="add-unit-heading">Add unit</h3>
          </div>
          <div className="add-unit-heading-actions">
            <span>{formatCount(filteredCount, "matching choice")}</span>
            <button
              type="button"
              autoFocus={initialFocus === "close"}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        {groups.length > 0 && (
          <div className="root-choice-filter add-unit-search">
            <label htmlFor={filterId}>Search units and options</label>
            <input
              ref={filterInput}
              id={filterId}
              type="search"
              value={filter}
              autoFocus={initialFocus === "search"}
              placeholder="Unit name"
              onChange={(event) =>
                onFilterChange(event.currentTarget.value)
              }
            />
          </div>
        )}

        {groups.length === 0 ? (
          <p className="no-root-choices">
            This catalogue context has no resolved visible root selections.
          </p>
        ) : filteredGroups.length === 0 ? (
          <p className="no-root-choices">
            No available units or options match this search.
          </p>
        ) : (
          <div className="root-choice-categories add-unit-results">
            {filteredGroups.map((group, index) => (
              <details
                className="root-choice-category"
                key={group.key}
                open={
                  normalizedFilter !== "" ||
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
                      rosterSelectionsAmount(state.selected) >= finiteMaximum;
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
                              onClick={() =>
                                onAdd(choice, group.section === "army")
                              }
                            >
                              <span aria-hidden="true">+</span>
                            </button>
                            <ChoicePreviewButton
                              choice={choice.materialized}
                              onPreview={onPreviewChoice}
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
        {!inspection.ok && (
          <DiagnosticList diagnostics={inspection.diagnostics} />
        )}
      </section>
    </div>
  );
}

/** Only the full-screen compact sheet raises search as its initial task. */
function compactAddUnitSearchPreferred(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 560px)").matches
  );
}

/** `/` is a roster shortcut only when it won't replace text being edited. */
function editableKeyboardTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}

/**
 * Prefers the currency actually used by addable army units.
 *
 * A game system may declare a setup-only currency such as Detachment Points
 * before ordinary unit points. Declaration order is still the fallback, but a
 * non-zero authored cost on an army root is stronger evidence for the sticky
 * roster budget than a cost used only by Configuration choices. Exact type ids
 * carry the decision; display names are never treated as currency identities.
 */
function headlineRosterCost(
  workspace: RosterWorkspaceViewModel,
): RosterWorkspaceCost | undefined {
  if (!workspace.costs.available) return undefined;
  const armyCostTypeIds = new Set<string>();
  if (workspace.rootChoices.available) {
    for (const group of workspace.rootChoices.groups) {
      if (group.section !== "army") continue;
      for (const { choice } of group.choices) {
        for (const cost of choice.materialized.costs) {
          if (
            cost.typeId !== undefined &&
            cost.value !== undefined &&
            Number.isFinite(cost.value) &&
            cost.value !== 0
          ) {
            armyCostTypeIds.add(cost.typeId);
          }
        }
      }
    }
  }
  const totals = workspace.costs.activeTotals;
  return (
    totals.find(
      ({ typeId, limit }) =>
        limit !== undefined && armyCostTypeIds.has(typeId),
    ) ??
    totals.find(({ typeId }) => armyCostTypeIds.has(typeId)) ??
    totals.find(({ limit }) => limit !== undefined) ??
    totals[0]
  );
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

/** The compact warning glyph stays code-native and inherits the control state. */
function WarningTriangleIcon() {
  return (
    <svg
      className="roster-warning-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      focusable="false"
    >
      <path d="M12 3.5 21 20.5H3Z" />
      <path d="M12 8.5v6" />
      <circle cx="12" cy="17.5" r="1" />
    </svg>
  );
}

/** Compact command glyph for the sticky roster action menu. */
function RosterActionsIcon() {
  return (
    <svg
      className="roster-actions-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      focusable="false"
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

/**
 * Cost coverage and source evidence retained below the actionable checks.
 *
 * These details used to live in a large player header before the roster. They
 * remain observable because completeness and provenance cannot be discarded,
 * but keeping them inside the existing evidence disclosure lets the sticky
 * identity and the army list lead the normal workflow.
 */
function RosterReportDetails({
  workspace,
}: {
  readonly workspace: RosterWorkspaceViewModel;
}) {
  const { costs, validation, header } = workspace;
  const costDiagnostics = costs.diagnostics.length;
  const validationDiagnostics = validation.diagnostics.length;
  const zeroTotals = costs.zeroTotals;
  const headlineCost = costs.available
    ? headlineRosterCost(workspace)
    : undefined;
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
    <section
      className="roster-report-details"
      aria-label="Roster report details"
    >
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
  readonly ownerKind: "Selection" | "Category" | "Force";
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
  const categories = report.categories.forces.flatMap(({ constraints }) =>
    constraints
      .filter(isActionableSupportedConstraintReport)
      .map((constraint) => categoryConstraintSummaryItem(constraint)),
  );
  const forces = report.forces.forces.flatMap(({ constraints }) =>
    constraints
      .filter(isActionableSupportedConstraintReport)
      .map((constraint) => forceConstraintSummaryItem(constraint)),
  );
  return [...selections, ...categories, ...forces];
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

function categoryConstraintSummaryItem(
  report: RosterCategoryConstraintReport,
): ConstraintSummaryItem {
  return constraintSummaryItem(
    "Category",
    report.categoryName,
    report.categoryId ?? report.categoryLink.source.id ?? report.owner.id,
    report.categoryId === undefined
      ? "#root-choices-heading"
      : `#${stableDomAnchor("roster-role", report.categoryId)}`,
    report,
  );
}

function constraintSummaryItem(
  ownerKind: "Selection" | "Category" | "Force",
  ownerName: string,
  ownerId: string,
  target: string,
  report:
    | RosterSelectionConstraintReport
    | RosterCategoryConstraintReport
    | RosterForceConstraintReport,
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
 * Configuration is one concise settings row until the player opens it or a
 * later edit introduces attention. The presentation model remains the sole
 * authority on which selections belong here.
 */
function RosterConfigurationSection({
  group,
  anchorId,
  open,
  onToggle,
  revealAnchor,
  costLimits,
  session,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  nonRemovableSelectionIds,
  onPreviewChoice,
}: {
  readonly group: RosterWorkspaceSelectionGroup;
  readonly anchorId: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  /** Stable report target whose owning setup cards must be revealed. */
  readonly revealAnchor?: string | undefined;
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
  /** Required roots whose removal would immediately violate a known minimum. */
  readonly nonRemovableSelectionIds: ReadonlySet<SelectionOccurrenceId>;
  readonly onPreviewChoice: PreviewChoiceHandler;
}) {
  const containsAttention = group.selections.some(
    (selection) => selection.containsAttention,
  );
  // Top-level configuration entries are labels such as Battle Size and
  // Detachment. Their selected descendants are the concise values a player
  // needs when the full editor is collapsed; exact choice identity and source
  // order are preserved without interpreting display names.
  const selectedValues = selectedUpgradeSummary(
    session,
    group.selections.flatMap(({ selections }) => selections),
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
            <span className="roster-configuration-name">
              {group.role.name}
            </span>
            <span className="roster-configuration-subtitle">
              {selectedValues.length > 0
                ? formatSelectedChoiceSummary(selectedValues)
                : formatCount(group.amount, "setting")}
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
            <span className="roster-configuration-chevron" aria-hidden="true">
              &#8250;
            </span>
            <span className="visually-hidden">
              {open
                ? "Hide configuration details"
                : "Show configuration details"}
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
          autoCollapseWhenRequirementsMet
          revealAnchor={revealAnchor}
          onAddChild={onAddChild}
          onRename={onRename}
          onSetAmount={onSetAmount}
          onRemove={onRemove}
          allowRemove={(selection) =>
            !nonRemovableSelectionIds.has(selection.occurrence.id)
          }
          onPreviewChoice={onPreviewChoice}
        />
      </div>
    </details>
  );
}

/**
 * Required catalogue reference entries that describe the whole army.
 *
 * Some catalogues file these under Configuration solely so roster constraints
 * can require one occurrence. A leaf with authored rules or profiles is not a
 * player choice, so it stays available as read-only reference material without
 * competing with Battle Size, Detachment, or the unit list.
 */
function RosterArmyRulesSection({
  selections,
  open,
  onToggle,
  session,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onPreviewChoice,
}: {
  readonly selections: readonly RosterWorkspaceSelection[];
  readonly open: boolean;
  readonly onToggle: () => void;
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
  const names = selections.map(({ occurrence }) => ({
    key: occurrence.id,
    name: occurrence.name ?? "Unnamed reference",
    amount: rosterSelectionAmount(occurrence),
  }));
  return (
    <details className="roster-army-rules" aria-label="Army rules" open={open}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <span className="roster-army-rules-title">
          <strong>Army rules</strong>
          <small>{formatSelectedChoiceSummary(names)}</small>
        </span>
        <span className="roster-army-rules-meta">
          {formatCount(selections.length, "reference")}
          <span aria-hidden="true">&#8250;</span>
          <span className="visually-hidden">
            {open ? "Hide army rules" : "Show army rules"}
          </span>
        </span>
      </summary>
      <div className="roster-army-rules-body">
        <RosterTopLevelSelectionList
          roleKnown
          selections={selections}
          session={session}
          selectionCanAddAnother={selectionCanAddAnother}
          collapsible={false}
          presentation="card"
          allowRemove={() => false}
          showKeywords={false}
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
 * Identifies required Configuration leaves whose roster role is explanatory.
 *
 * BattleScribe catalogues sometimes file an army-wide rule as Configuration so
 * a roster-wide minimum can ensure the reference entry exists. Requiring a
 * complete positive minimum, no selectable descendants, and substantive
 * authored information keeps optional informational upgrades in their normal
 * editor and avoids display-name special cases.
 */
function requiredConfigurationReferenceSelectionIds(
  result: ReturnType<typeof inspectLocalRosterRootChoices>,
): ReadonlySet<SelectionOccurrenceId> {
  const ids = new Set<SelectionOccurrenceId>();
  if (!result.ok) return ids;
  for (const group of result.value.groups) {
    for (const state of group.choices) {
      if (
        state.completeness !== "complete" ||
        state.minimum === undefined ||
        !Number.isFinite(state.minimum) ||
        state.minimum <= 0 ||
        directCatalogueChoices(state.choice.materialized).length > 0
      ) {
        continue;
      }
      const information = catalogueChoiceInformation(state.choice.materialized);
      if (
        information.profiles.length === 0 &&
        information.rules.length === 0 &&
        information.infoGroups.length === 0 &&
        information.unresolved.length === 0
      ) {
        continue;
      }
      for (const selection of state.selected) ids.add(selection.id);
    }
  }
  return ids;
}

/**
 * Returns exact roots whose removal would breach a complete positive minimum.
 *
 * Surplus occurrences stay removable and unresolved bounds stay permissive;
 * hiding a destructive control is justified only by the same evaluated root
 * state the Add browser and supported checks already use.
 */
function requiredRootSelectionIds(
  result: ReturnType<typeof inspectLocalRosterRootChoices>,
): ReadonlySet<SelectionOccurrenceId> {
  const ids = new Set<SelectionOccurrenceId>();
  if (!result.ok) return ids;
  for (const group of result.value.groups) {
    for (const state of group.choices) {
      if (
        state.completeness !== "complete" ||
        state.minimum === undefined ||
        !Number.isFinite(state.minimum) ||
        state.minimum <= 0
      ) {
        continue;
      }
      const selectedAmount = rosterSelectionsAmount(state.selected);
      for (const selection of state.selected) {
        if (selectedAmount - rosterSelectionAmount(selection) < state.minimum) {
          ids.add(selection.id);
        }
      }
    }
  }
  return ids;
}

/**
 * Returns exact roots that still fit inside their complete root-choice maximum.
 *
 * An unresolved maximum stays permissive because the editor must not invent a
 * restriction. Amount is included because duplicating one occurrence copies
 * that occurrence's effective amount, not merely one abstract selection.
 */
function rootSelectionDuplicationCapacity(
  result: ReturnType<typeof inspectLocalRosterRootChoices>,
): ReadonlyMap<SelectionOccurrenceId, boolean> {
  const capacity = new Map<SelectionOccurrenceId, boolean>();
  if (!result.ok) return capacity;
  for (const group of result.value.groups) {
    for (const state of group.choices) {
      const selectedAmount = rosterSelectionsAmount(state.selected);
      for (const selection of state.selected) {
        capacity.set(
          selection.id,
          state.completeness !== "complete" ||
            state.maximum === undefined ||
            !Number.isFinite(state.maximum) ||
            isUnboundedConstraintValue(state.maximum) ||
            selectedAmount + rosterSelectionAmount(selection) <= state.maximum,
        );
      }
    }
  }
  return capacity;
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
  requirement,
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
  selectionCanDuplicate,
  onViewUnit,
  onDuplicateUnit,
  onRemoveUnit,
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
  readonly requirement?: RosterWorkspaceSelectionGroup["requirement"];
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
  readonly selectionCanDuplicate: ReadonlyMap<SelectionOccurrenceId, boolean>;
  readonly onViewUnit: (
    id: SelectionOccurrenceId,
    trigger: HTMLButtonElement,
  ) => void;
  readonly onDuplicateUnit: (
    id: SelectionOccurrenceId,
  ) => SelectionOccurrenceId | undefined;
  readonly onRemoveUnit: (id: SelectionOccurrenceId) => void;
}) {
  // `containsAttention` is deliberately only a routing signal here. A role can
  // point the reader toward a problem below it, but only the exact selection's
  // `attention` flag may label a row as violating something.
  const containsAttention =
    requirement?.status === "violated" ||
    selections.some((selection) => selection.containsAttention);
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
          {requirement?.minimum !== undefined ? (
            <span
              className="roster-role-requirement"
              data-status={requirement.status}
            >
              {formatNumber(requirement.selected)} /{" "}
              {formatNumber(requirement.minimum)} required
            </span>
          ) : (
            <span>{formatCount(amount, "selection")}</span>
          )}
        </div>
      </div>
      {selections.length === 0 ? (
        <p className="roster-selection-section-empty">
          Add {heading.toLocaleLowerCase()} units to meet this requirement.
        </p>
      ) : (
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
          selectionCanDuplicate={selectionCanDuplicate}
          onViewUnit={onViewUnit}
          onDuplicateUnit={onDuplicateUnit}
          onRemoveUnit={onRemoveUnit}
        />
      )}
    </section>
  );
}

type RosterSelectionPresentation = "combined" | "row" | "options" | "card";
type RosterSelectionItemPresentation = Exclude<
  RosterSelectionPresentation,
  "row"
>;

function RosterTopLevelSelectionList({
  roleKnown,
  selections,
  session,
  selectionCanAddAnother,
  collapsible,
  initiallyOpen = false,
  autoCollapseWhenRequirementsMet = false,
  revealAnchor,
  presentation = "combined",
  allowRemove = () => true,
  showKeywords = true,
  onSelect,
  selectionCanDuplicate,
  onViewUnit,
  onDuplicateUnit,
  onRemoveUnit,
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
  /** Collapses a setup card after its last known required choice is selected. */
  readonly autoCollapseWhenRequirementsMet?: boolean;
  /** Stable descendant anchor whose owning cards must be mounted and open. */
  readonly revealAnchor?: string | undefined;
  readonly presentation?: RosterSelectionPresentation;
  /** Presentation-only root removal policy from evaluated root-choice bounds. */
  readonly allowRemove?: (selection: RosterWorkspaceSelection) => boolean;
  /** Army-wide reference entries do not expose their source filing category. */
  readonly showKeywords?: boolean;
  readonly onSelect?: ((id: SelectionOccurrenceId) => void) | undefined;
  readonly selectionCanDuplicate?:
    | ReadonlyMap<SelectionOccurrenceId, boolean>
    | undefined;
  readonly onViewUnit?:
    | ((id: SelectionOccurrenceId, trigger: HTMLButtonElement) => void)
    | undefined;
  readonly onDuplicateUnit?:
    | ((id: SelectionOccurrenceId) => SelectionOccurrenceId | undefined)
    | undefined;
  readonly onRemoveUnit?: ((id: SelectionOccurrenceId) => void) | undefined;
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
        {selections.map((selection) =>
          presentation === "row" ? (
            <RosterUnitRow
              key={selection.occurrence.id}
              session={session}
              selectionModel={selection}
              onSelect={onSelect}
              canDuplicate={
                (selectionCanDuplicate?.get(selection.occurrence.id) ?? true) &&
                (selectionCanAddAnother.get(selection.occurrence.id) ?? true)
              }
              onView={onViewUnit}
              onDuplicate={onDuplicateUnit}
              onRemove={onRemoveUnit}
            />
          ) : (
            <RosterSelectionItem
              key={selection.occurrence.id}
              session={session}
              selectionModel={selection}
              selectionCanAddAnother={selectionCanAddAnother}
              topLevel
              collapsible={collapsible}
              initiallyOpen={initiallyOpen}
              autoCollapseWhenRequirementsMet={
                autoCollapseWhenRequirementsMet
              }
              revealAnchor={revealAnchor}
              presentation={presentation}
              allowRemove={allowRemove(selection)}
              showKeywords={showKeywords}
              onAddChild={onAddChild}
              onRename={onRename}
              onSetAmount={onSetAmount}
              onRemove={onRemove}
              onPreviewChoice={onPreviewChoice}
            />
          ),
        )}
      </ul>
    </>
  );
}

interface RosterSelectionDisplayName {
  readonly sourceName: string;
  readonly annotatedName: string;
  readonly incomplete: boolean;
}

/** Resolves the same effective display name for list, editor, and card views. */
function useRosterSelectionDisplayName(
  session: LocalRosterSession,
  selectionModel: RosterWorkspaceSelection,
): RosterSelectionDisplayName {
  const selection = selectionModel.occurrence;
  const sourceName = selection.name ?? "Unnamed selection";
  const annotation = useMemo(
    () => inspectLocalRosterSelectionAnnotation(session, selection.id),
    [session, selection.id],
  );
  const evaluatedName = useMemo(
    () => inspectLocalRosterSelectionName(session, selection.id, sourceName),
    [session, selection.id, sourceName],
  );
  const displayName =
    evaluatedName.ok && evaluatedName.value.value !== undefined
      ? evaluatedName.value.value
      : sourceName;
  const annotationValue = annotation.ok ? annotation.value.value : undefined;
  return {
    sourceName,
    annotatedName:
      annotationValue === undefined || annotationValue === ""
        ? displayName
        : `${displayName} (${annotationValue})`,
    incomplete:
      !evaluatedName.ok ||
      evaluatedName.value.completeness === "incomplete" ||
      !annotation.ok ||
      annotation.value.completeness === "incomplete",
  };
}

/**
 * One compact army-list row with direct reference and occurrence actions.
 *
 * Configure still owns the large disclosure target. View, Duplicate, and
 * Remove are independent siblings rather than nested buttons, so each command
 * remains reachable without first changing the selected-unit inspector.
 */
function RosterUnitRow({
  session,
  selectionModel,
  onSelect,
  canDuplicate,
  onView,
  onDuplicate,
  onRemove,
}: {
  readonly session: LocalRosterSession;
  readonly selectionModel: RosterWorkspaceSelection;
  readonly onSelect?: ((id: SelectionOccurrenceId) => void) | undefined;
  readonly canDuplicate: boolean;
  readonly onView?:
    | ((id: SelectionOccurrenceId, trigger: HTMLButtonElement) => void)
    | undefined;
  readonly onDuplicate?:
    | ((id: SelectionOccurrenceId) => SelectionOccurrenceId | undefined)
    | undefined;
  readonly onRemove?: ((id: SelectionOccurrenceId) => void) | undefined;
}) {
  const selection = selectionModel.occurrence;
  const { annotatedName, incomplete } = useRosterSelectionDisplayName(
    session,
    selectionModel,
  );
  const choice = localRosterSelectionChoice(session, selection.id);
  const promotedModels = selectionModel.selections.filter((child) => {
    const childChoice = localRosterSelectionChoice(
      session,
      child.occurrence.id,
    );
    return (
      choice?.kind === "selectionEntry" &&
      choice.type === "unit" &&
      childChoice?.kind === "selectionEntry" &&
      childChoice.type === "model"
    );
  });
  const composition =
    promotedModels.length === 0
      ? undefined
      : createModelComposition(session, promotedModels);
  const childChoices = inspectLocalRosterChildChoices(session, selection.id);
  const selectedRoles = childChoices.ok
    ? childChoices.value.direct
        .filter(
          ({ choice: childChoice, selected }) =>
            selected.length > 0 &&
            isLocalRosterSingletonDesignationChoice(session, childChoice),
        )
        .map(({ choice: childChoice }) => ({
          key: selectionChoiceKey(childChoice),
          name: selectionChoiceLabel(childChoice),
        }))
    : [];
  const roleChoiceKeys = new Set(
    childChoices.ok
      ? childChoices.value.direct
          .filter(({ choice: childChoice }) =>
            isLocalRosterSingletonDesignationChoice(session, childChoice),
          )
          .map(({ choice: childChoice }) => selectionChoiceKey(childChoice))
      : [],
  );
  const selectedOptions =
    composition === undefined
      ? selectedUpgradeSummary(
          session,
          selectionModel.selections,
          roleChoiceKeys,
        )
      : [];
  const attentionLabel = selectionModel.attention
    ? "Known violation"
    : selectionModel.containsAttention
      ? "Needs attention"
      : undefined;
  const focusAfterRemoval = (trigger: HTMLButtonElement) => {
    const row = trigger.closest(".roster-unit-row");
    const next = row?.nextElementSibling?.querySelector<HTMLElement>(
      ".roster-unit-row-disclosure",
    );
    const previous = row?.previousElementSibling?.querySelector<HTMLElement>(
      ".roster-unit-row-disclosure",
    );
    onRemove?.(selection.id);
    queueMicrotask(() => {
      const target =
        next !== null && next !== undefined && document.contains(next)
          ? next
          : previous !== null &&
              previous !== undefined &&
              document.contains(previous)
            ? previous
            : document.getElementById("selected-roster-heading");
      target?.focus();
    });
  };
  return (
    <li
      className="roster-unit-row"
      id={selectionAnchor(selection.id)}
      data-occurrence-id={selection.id}
      data-active={selectionModel.active ? "true" : undefined}
      data-attention={
        selectionModel.attention
          ? "violation"
          : selectionModel.containsAttention
            ? "descendant"
            : undefined
      }
      data-display-completeness={incomplete ? "incomplete" : "complete"}
    >
      <button
        type="button"
        className="roster-unit-row-disclosure"
        aria-expanded={selectionModel.active}
        aria-controls="selected-unit-options-panel"
        aria-label={`Configure ${annotatedName}`}
        onClick={() => onSelect?.(selection.id)}
      >
        <span className="roster-unit-row-copy">
          <span className="roster-unit-row-title">
            <strong>{annotatedName}</strong>
            <span className="roster-unit-row-pills">
              {selectedRoles.map((role) => (
                <span className="unit-row-pill" key={role.key}>
                  {role.name}
                </span>
              ))}
              {attentionLabel !== undefined && (
                <span className="unit-row-pill" data-attention="true">
                  {attentionLabel}
                </span>
              )}
            </span>
          </span>
          {composition !== undefined ? (
            <UnitCompositionSummary
              unitName={annotatedName}
              composition={composition}
              compact
            />
          ) : (
            selectedOptions.length > 0 && (
              <span className="unit-row-selected-options">
                {formatSelectedChoiceSummary(selectedOptions)}
              </span>
            )
          )}
        </span>
        <span className="roster-unit-row-trailing">
          <SelectionCostTotals costs={selectionModel.costs} />
          <span className="roster-unit-row-chevron" aria-hidden="true">
            &#8250;
          </span>
        </span>
      </button>
      <div className="roster-unit-row-actions" aria-label={`Actions for ${annotatedName}`}>
        <button
          type="button"
          aria-label={`View unit card for ${annotatedName}`}
          aria-haspopup="dialog"
          onClick={(event) => onView?.(selection.id, event.currentTarget)}
        >
          View
        </button>
        <button
          type="button"
          aria-label={`Duplicate ${annotatedName}`}
          disabled={!canDuplicate}
          title={canDuplicate ? undefined : "Unit maximum reached"}
          onClick={() => onDuplicate?.(selection.id)}
        >
          Duplicate
        </button>
        <button
          type="button"
          aria-label={`Remove ${annotatedName}`}
          onClick={(event) => focusAfterRemoval(event.currentTarget)}
        >
          Remove
        </button>
      </div>
    </li>
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

/** Dedicated editing surface for the currently focused army unit. */
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
  onDuplicate,
  canDuplicate,
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
  readonly onView: (trigger: HTMLButtonElement) => void;
  readonly onDuplicate: () => SelectionOccurrenceId | undefined;
  readonly canDuplicate: boolean;
  readonly viewed: boolean;
}) {
  const name = selectionModel.occurrence.name ?? "Unnamed unit";
  const removeUnit = () => {
    onClose();
    onRemove(selectionModel.occurrence.id);
    queueMicrotask(() =>
      document.getElementById("selected-roster-heading")?.focus(),
    );
  };
  return (
    <section
      id="selected-unit-options-panel"
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
            onClick={(event) => onView(event.currentTarget)}
          >
            View unit card
          </button>
          <button
            type="button"
            aria-label={`Duplicate ${name}`}
            disabled={!canDuplicate}
            title={canDuplicate ? undefined : "Unit maximum reached"}
            onClick={onDuplicate}
          >
            Duplicate unit
          </button>
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={removeUnit}
          >
            Remove unit
          </button>
          <button
            type="button"
            aria-label={`Close options for ${name}`}
            onClick={onClose}
          >
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

/** Read-only modal datasheet for the unit chosen with the row View action. */
function RosterUnitCardView({
  covered,
  session,
  selectionModel,
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onViewKeywordRules,
  onClose,
}: {
  readonly covered: boolean;
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
  readonly onViewKeywordRules: (
    preview: KeywordRulePreview,
    trigger: HTMLButtonElement,
  ) => void;
  readonly onClose: () => void;
}) {
  const name = selectionModel.occurrence.name ?? "Unnamed unit";
  return (
    <div
      className="choice-preview-backdrop"
      hidden={covered}
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
        if (event.key === "Tab") trapDialogFocus(event.currentTarget, event);
      }}
    >
      <section
        id="selected-unit-card-view"
        className="choice-preview-dialog unit-card-view-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Unit card for ${name}`}
      >
        <div className="selected-unit-panel-heading">
          <div>
            <span className="eyebrow">Unit reference</span>
            <h3 id="selected-unit-card-heading">{name}</h3>
          </div>
          <button
            type="button"
            autoFocus
            aria-label={`Close unit card for ${name}`}
            onClick={onClose}
          >
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
            onViewKeywordRules={onViewKeywordRules}
          />
        </ul>
      </section>
    </div>
  );
}

/** One keyword's source-authored rules, layered over the owning unit card. */
function KeywordRulesDialog({
  preview,
  onClose,
}: {
  readonly preview: KeywordRulePreview;
  readonly onClose: () => void;
}) {
  const headingId = useId();
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
        if (event.key === "Tab") trapDialogFocus(event.currentTarget, event);
      }}
    >
      <section
        className="choice-preview-dialog keyword-rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <header className="choice-preview-heading">
          <div>
            <span className="eyebrow">Keyword reference</span>
            <h3 id={headingId}>{preview.keyword}</h3>
          </div>
          <button type="button" autoFocus onClick={onClose}>
            Close
          </button>
        </header>
        <section className="selection-info-section">
          <h4>Rules</h4>
          <div className="selection-rule-list">
            {preview.rules.map((rule, index) => (
              <SelectionRule key={selectionRuleKey(rule, index)} rule={rule} />
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

/** Player-facing problem summary opened from the roster's persistent counters. */
function RosterProblemsDialog({
  result,
  onClose,
}: {
  readonly result: ReturnType<typeof inspectLocalRosterSupportedValidation>;
  readonly onClose: () => void;
}) {
  const findings = result.ok
    ? result.value.status.findings.filter(({ status }) => status === "violated")
    : [];
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
        if (event.key === "Tab") trapDialogFocus(event.currentTarget, event);
      }}
    >
      <section
        id="roster-problems-dialog"
        className="choice-preview-dialog roster-problems-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Roster problems"
      >
        <header className="choice-preview-heading">
          <div>
            <span className="eyebrow">Roster checks</span>
            <h3>{formatCount(findings.length, "known problem")}</h3>
          </div>
          <button type="button" autoFocus onClick={onClose}>
            Close
          </button>
        </header>
        {!result.ok ? (
          <div className="roster-problems-content">
            <p>Roster checks are unavailable.</p>
            <DiagnosticList diagnostics={result.diagnostics} />
          </div>
        ) : findings.length === 0 ? (
          <p className="choice-preview-empty">No supported rule is known to be violated.</p>
        ) : (
          <ul className="roster-problem-list">
            {findings.map((finding) => (
              <li key={validationFindingKey(finding)}>
                <div>
                  <strong>{validationFindingMessage(finding)}</strong>
                  <span>{validationFindingObservation(finding)}</span>
                </div>
                <a
                  href={validationFindingTarget(finding)}
                  onClick={onClose}
                >
                  Review
                </a>
              </li>
            ))}
          </ul>
        )}
        {result.ok && result.value.status.completeness === "incomplete" && (
          <p className="roster-problems-coverage">
            Some catalogue behavior is not checked yet. Developer evidence
            remains available in Checks and diagnostics below the workspace.
          </p>
        )}
      </section>
    </div>
  );
}

function validationFindingMessage(
  finding: SupportedRosterValidationFinding,
): string {
  if (finding.kind === "categoryConstraint") {
    const { categoryName, constraintType, limit, observed, minimum } =
      finding.report;
    if (constraintType === "min" && limit !== undefined) {
      const selected = observed ?? minimum;
      return `${categoryName}: ${formatCount(
        Math.max(0, limit - selected),
        "more selection",
      )} required`;
    }
    if (constraintType === "max" && limit !== undefined) {
      const selected = observed ?? minimum;
      return `${categoryName}: ${formatCount(
        Math.max(0, selected - limit),
        "selection",
      )} over the maximum`;
    }
    return `${categoryName} requirement`;
  }
  if (finding.kind === "structural") {
    return structuralBoundName(finding.report);
  }
  const item =
    finding.kind === "selectionConstraint"
      ? selectionConstraintSummaryItem(finding.report)
      : forceConstraintSummaryItem(finding.report);
  return `${item.ownerName}: ${constraintTypeLabel(item.type)} requirement`;
}

function validationFindingObservation(
  finding: SupportedRosterValidationFinding,
): string {
  if (finding.kind === "categoryConstraint") {
    const { observed, minimum, maximum, limit } = finding.report;
    const selected = observed ?? (minimum === maximum ? minimum : undefined);
    return `${
      selected === undefined
        ? `${formatNumber(minimum)}–${formatNumber(maximum)} selected`
        : `${formatNumber(selected)} selected`
    }, ${limit === undefined ? "limit unresolved" : `limit ${formatNumber(limit)}`}`;
  }
  if (finding.kind === "structural") {
    return structuralBoundObservation(finding.report);
  }
  return constraintObservation(
    finding.kind === "selectionConstraint"
      ? selectionConstraintSummaryItem(finding.report)
      : forceConstraintSummaryItem(finding.report),
  );
}

function validationFindingTarget(
  finding: SupportedRosterValidationFinding,
): string {
  if (finding.kind === "categoryConstraint") {
    return finding.report.categoryId === undefined
      ? "#root-choices-heading"
      : `#${stableDomAnchor("roster-role", finding.report.categoryId)}`;
  }
  if (finding.kind === "structural") return structuralBoundTarget(finding.report);
  if (finding.kind === "selectionConstraint") {
    return `#${selectionAnchor(finding.report.owner.id)}`;
  }
  return `#${forceAnchor(finding.report.owner.id)}`;
}

function validationFindingKey(
  finding: SupportedRosterValidationFinding,
): string {
  if (finding.kind === "structural") return structuralBoundKey(finding.report);
  return JSON.stringify([
    finding.kind,
    finding.report.constraint.source.sourceId,
    ...finding.report.constraint.path,
  ]);
}

function trapDialogFocus(
  container: HTMLElement,
  event: { readonly shiftKey: boolean; preventDefault(): void },
): void {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

type ChildChoiceRequirementState =
  | "not-required"
  | "unknown"
  | "unsatisfied"
  | "satisfied";

/**
 * Reduces one setup card's child inspection to a safe collapse decision.
 *
 * Only complete positive minima count. Optional choices should not dismiss a
 * settings card, and unresolved bounds must remain available rather than
 * looking complete. `remaining` already aggregates all exact occurrences the
 * evaluator says the bound counts.
 */
function childChoiceRequirementState(
  result: ReturnType<typeof inspectLocalRosterChildChoices>,
): ChildChoiceRequirementState {
  if (!result.ok || result.value.completeness === "incomplete") {
    return "unknown";
  }
  const required = [...result.value.direct, ...result.value.groups].filter(
    ({ minimum }) => (minimum ?? 0) > 0,
  );
  if (required.length === 0) return "not-required";
  if (
    required.some(
      ({ completeness, remaining }) =>
        completeness === "incomplete" || remaining === undefined,
    )
  ) {
    return "unknown";
  }
  return required.some(({ remaining }) => remaining! > 0)
    ? "unsatisfied"
    : "satisfied";
}

function RosterSelectionItem({
  session,
  selectionModel,
  topLevel = false,
  collapsible = false,
  initiallyOpen = false,
  autoCollapseWhenRequirementsMet = false,
  revealAnchor,
  collapseChildren = false,
  presentation = "combined",
  embedded = false,
  hideOccurrence = false,
  allowRemove = true,
  showKeywords = true,
  amountBounds = [],
  selectionCanAddAnother,
  onAddChild,
  onRename,
  onSetAmount,
  onRemove,
  onPreviewChoice,
  onViewKeywordRules,
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
   * Setup-only behavior: close after the last known required choice is met.
   */
  readonly autoCollapseWhenRequirementsMet?: boolean;
  /** Stable descendant anchor that must remain reachable from a report link. */
  readonly revealAnchor?: string | undefined;
  /**
   * Keeps a promoted model's own wargear subtree lazy unless it needs
   * attention.
   */
  readonly collapseChildren?: boolean;
  /** Renders the combined editor, focused options, or read-only unit card. */
  readonly presentation?: RosterSelectionItemPresentation;
  /** Omits the duplicate occurrence row and stable anchor inside a panel. */
  readonly embedded?: boolean;
  /** Lets the panel heading replace only its top selection's row. */
  readonly hideOccurrence?: boolean;
  readonly allowRemove?: boolean;
  readonly showKeywords?: boolean;
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
  readonly onViewKeywordRules?:
    | ((preview: KeywordRulePreview, trigger: HTMLButtonElement) => void)
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
  const {
    sourceName: name,
    annotatedName,
    incomplete: displayNameIncomplete,
  } = useRosterSelectionDisplayName(session, selectionModel);
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
  const childrenContainRevealTarget =
    revealAnchor !== undefined &&
    configurableSelections.some((child) =>
      workspaceSelectionContainsAnchor(child, revealAnchor),
    );
  const selectionContainsRevealTarget =
    revealAnchor !== undefined &&
    workspaceSelectionContainsAnchor(selectionModel, revealAnchor);
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
    if (childrenContainAttention || childrenContainRevealTarget) {
      setChildrenOpen(true);
    }
  }, [childrenContainAttention, childrenContainRevealTarget]);
  const cardBodyId = useId();
  // A collapsible unit starts closed so a fifteen-unit army is a scannable
  // list of names and costs rather than fifteen open datasheets. The one
  // exception is the same as the child rule above: a unit holding a known
  // violation opens itself, because a problem nobody can see is worse than a
  // longer page. Unresolved bounds stay in the checks and do not expand it.
  const [cardOpen, setCardOpen] = useState(
    () => !collapsible || initiallyOpen || selectionModel.containsAttention,
  );
  const cardToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (
      collapsible &&
      (selectionModel.containsAttention || selectionContainsRevealTarget)
    ) {
      setCardOpen(true);
    }
  }, [
    collapsible,
    selectionContainsRevealTarget,
    selectionModel.containsAttention,
  ]);
  const setupRequirementState = autoCollapseWhenRequirementsMet
    ? childChoiceRequirementState(childChoices)
    : "not-required";
  const previousKnownSetupRequirementState = useRef<
    "unsatisfied" | "satisfied" | undefined
  >(undefined);
  useEffect(() => {
    if (
      setupRequirementState === "unknown" ||
      setupRequirementState === "not-required"
    ) {
      return;
    }
    const previous = previousKnownSetupRequirementState.current;
    previousKnownSetupRequirementState.current = setupRequirementState;
    if (
      autoCollapseWhenRequirementsMet &&
      previous === "unsatisfied" &&
      setupRequirementState === "satisfied" &&
      !selectionModel.containsAttention
    ) {
      setCardOpen(false);
      queueMicrotask(() => cardToggleRef.current?.focus());
    }
  }, [
    autoCollapseWhenRequirementsMet,
    setupRequirementState,
    selectionModel.containsAttention,
  ]);
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
      id={embedded ? undefined : selectionAnchor(selection.id)}
      tabIndex={embedded ? undefined : -1}
      data-occurrence-id={selection.id}
      data-section={selectionModel.section}
      data-active={!embedded && selectionModel.active ? "true" : undefined}
      aria-current={!embedded && selectionModel.active ? "true" : undefined}
      data-attention={selectionModel.attention ? "violation" : undefined}
      data-display-completeness={
        displayNameIncomplete ? "incomplete" : "complete"
      }
    >
      {!hideOccurrence && <div className="selection-occurrence">
        <span className="selection-occurrence-heading">
          {collapsible ? (
            <button
              ref={cardToggleRef}
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
                  const label = childSelectionChoiceLabel(choice, direct.choice);
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
                const choiceName = childSelectionChoiceLabel(
                  choice,
                  direct.choice,
                );
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
              displayNameIncomplete={displayNameIncomplete}
              showKeywords={showKeywords}
              onViewKeywordRules={onViewKeywordRules}
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
                    revealAnchor={revealAnchor}
                    presentation={presentation}
                    embedded={presentation === "card"}
                    allowRemove={false}
                    onAddChild={onAddChild}
                    onRename={onRename}
                    onSetAmount={onSetAmount}
                    onRemove={onRemove}
                    onPreviewChoice={onPreviewChoice}
                    onViewKeywordRules={onViewKeywordRules}
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
                    onViewKeywordRules={onViewKeywordRules}
                    revealAnchor={revealAnchor}
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
                      revealAnchor={revealAnchor}
                      onAddChild={onAddChild}
                      onRename={onRename}
                      onSetAmount={onSetAmount}
                      onRemove={onRemove}
                      onPreviewChoice={onPreviewChoice}
                      onViewKeywordRules={onViewKeywordRules}
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
    readonly loadout: readonly SelectedChoiceSummary[];
  }[];
}

interface SelectedChoiceSummary {
  readonly key: string;
  readonly name: string;
  readonly amount: number;
}

/** Collects selected upgrade occurrences without inferring equipment by name. */
function selectedUpgradeSummary(
  session: LocalRosterSession,
  selections: readonly RosterWorkspaceSelection[],
  excludedChoiceKeys: ReadonlySet<string> = new Set(),
): readonly SelectedChoiceSummary[] {
  const entries = new Map<string, SelectedChoiceSummary>();
  const visit = (selection: RosterWorkspaceSelection): void => {
    const choice = localRosterSelectionChoice(
      session,
      selection.occurrence.id,
    );
    if (
      choice?.kind === "selectionEntry" &&
      choice.type === "upgrade" &&
      !excludedChoiceKeys.has(selectionChoiceKey(choice))
    ) {
      const key = selectionChoiceKey(choice);
      const existing = entries.get(key);
      entries.set(key, {
        key,
        name: selectionChoiceLabel(choice),
        amount:
          (existing?.amount ?? 0) +
          rosterSelectionAmount(selection.occurrence),
      });
    }
    for (const child of selection.selections) visit(child);
  };
  for (const selection of selections) visit(selection);
  return [...entries.values()];
}

function formatSelectedChoiceSummary(
  choices: readonly SelectedChoiceSummary[],
): string {
  return choices
    .map(({ amount, name }) => (amount > 1 ? `${amount}× ${name}` : name))
    .join(" · ");
}

/**
 * Folds exact promoted model occurrences into the compact unit-card summary.
 *
 * Repeated occurrences and one occurrence with an amount override are the two
 * legal roster shapes for multiple models. Both count through the roster-model
 * helper. Grouping keys come from the exact materialized model and selected
 * upgrade choices rather than player renames or profile-name guesses, so two
 * models of one type remain separate when their selected loadouts differ.
 */
function createModelComposition(
  session: LocalRosterSession,
  models: readonly RosterWorkspaceSelection[],
): UnitComposition {
  const entries = new Map<
    string,
    {
      key: string;
      name: string;
      amount: number;
      loadout: readonly SelectedChoiceSummary[];
    }
  >();
  let total = 0;
  for (const model of models) {
    const occurrence = model.occurrence;
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
    const loadout = selectedUpgradeSummary(session, model.selections);
    const loadoutKey = loadout
      .map(({ key: choiceKey, amount: choiceAmount }) =>
        `${choiceKey}:${choiceAmount}`,
      )
      .join("|");
    const compositionKey = `${key}:${loadoutKey}`;
    total += amount;
    const existing = entries.get(compositionKey);
    entries.set(compositionKey, {
      key: compositionKey,
      name,
      amount: (existing?.amount ?? 0) + amount,
      loadout,
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
  compact = false,
}: {
  readonly unitName: string;
  readonly composition: UnitComposition;
  readonly compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className="unit-composition unit-composition-compact"
        role="region"
        aria-label={`Unit composition for ${unitName}`}
      >
        {composition.entries.map((entry) => (
          <span className="unit-composition-line" key={entry.key}>
            <span>
              {entry.amount}× {entry.name}
            </span>
            {entry.loadout.length > 0 && (
              <span>{formatSelectedChoiceSummary(entry.loadout)}</span>
            )}
          </span>
        ))}
      </span>
    );
  }
  return (
    <section
      className="unit-composition"
      aria-label={`Unit composition for ${unitName}`}
    >
      <ul>
        {composition.entries.map((entry) => (
          <li key={entry.key}>
            <span aria-hidden="true">&bull;</span>
            <span className="unit-composition-copy">
              <span>
                {entry.amount}&times; {entry.name}
              </span>
              {entry.loadout.length > 0 && (
                <span>{formatSelectedChoiceSummary(entry.loadout)}</span>
              )}
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
  if (!catalogueChoiceHasPreviewInformation(choice)) return null;
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
    information.infoGroups.length > 0
  );
}

const catalogueChoicePreviewAvailabilityCache = new WeakMap<
  BattleScribeRosterSelectionChoice,
  boolean
>();

/**
 * Keeps the info affordance honest without discarding useful unit previews.
 *
 * Keywords and unresolved references alone are diagnostic/source evidence,
 * not a player-facing reference card. A unit may still be informative through
 * its initialized composition or available model profiles, so those branches
 * are planned before suppressing the button.
 */
function catalogueChoiceHasPreviewInformation(
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  const cached = catalogueChoicePreviewAvailabilityCache.get(choice);
  if (cached !== undefined) return cached;
  if (catalogueChoiceHasOwnInformation(choice)) {
    catalogueChoicePreviewAvailabilityCache.set(choice, true);
    return true;
  }
  if (choice.kind !== "selectionEntry" || choice.type !== "unit") {
    catalogueChoicePreviewAvailabilityCache.set(choice, false);
    return false;
  }
  const plan = planRosterSelectionInitialization(choice);
  if (!plan.ok) {
    catalogueChoicePreviewAvailabilityCache.set(choice, false);
    return false;
  }
  const plannedChoices = new Set<BattleScribeRosterSelectionChoice>();
  collectPlannedChoices(plan.value, plannedChoices);
  const availableBranches = catalogueUnitModelBranches(
    choice,
    plannedChoices,
  );
  const available =
    plan.value.additions.length > 0 || availableBranches.length > 0;
  catalogueChoicePreviewAvailabilityCache.set(choice, available);
  return available;
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
  const parentChoice = localRosterSelectionChoice(session, parent.id);
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
            const label = childSelectionChoiceLabel(parentChoice, choice);
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
  showKeywords = true,
  onViewKeywordRules,
}: {
  readonly session: LocalRosterSession;
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly selection: RosterSelection;
  readonly displayNameIncomplete: boolean;
  readonly showKeywords?: boolean;
  readonly onViewKeywordRules?:
    | ((preview: KeywordRulePreview, trigger: HTMLButtonElement) => void)
    | undefined;
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

      {showKeywords && categories.ok === true && (
        <SelectionKeywords
          session={session}
          inspection={categories.value}
          onViewRules={onViewKeywordRules}
        />
      )}

      {profiles.length > 0 && (
        <section className="selection-info-section">
          <h4>Profiles</h4>
          <SelectionProfileTables profiles={profiles} reports={reports} />
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
  session,
  inspection,
  onViewRules,
}: {
  readonly session: LocalRosterSession;
  readonly inspection: LocalRosterCategoryInspection;
  readonly onViewRules?:
    | ((preview: KeywordRulePreview, trigger: HTMLButtonElement) => void)
    | undefined;
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
          {categories.map((category) => {
            const rules = categoryRuleDetails(session, category.id);
            return (
              <li
                key={category.id}
                data-added={category.added ? "true" : undefined}
                data-primary={category.primary ? "true" : undefined}
              >
                {rules.length > 0 && onViewRules !== undefined ? (
                  <button
                    type="button"
                    className="keyword-rule-button"
                    aria-label={`View rules for keyword ${category.name}`}
                    aria-haspopup="dialog"
                    onClick={(event) =>
                      onViewRules(
                        { keyword: category.name, rules },
                        event.currentTarget,
                      )
                    }
                  >
                    {category.name}
                  </button>
                ) : (
                  category.name
                )}
                {category.added && <small>added</small>}
              </li>
            );
          })}
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

/**
 * Resolves rules attached to one unambiguous effective category definition.
 *
 * Category identity, not display text, is the join key. Ambiguous definitions
 * and links stay plain keywords so a convenient popup never guesses which
 * imported rule the player meant; those resolution facts remain in diagnostics.
 */
function categoryRuleDetails(
  session: LocalRosterSession,
  categoryId: ObjectId,
): readonly SelectionRuleDetail[] {
  const definitions = session.catalogue.context.categories.definitions.filter(
    ({ source }) => source.id === categoryId,
  );
  const definition = definitions.length === 1 ? definitions[0] : undefined;
  if (definition === undefined) return [];

  const rules: SelectionRuleDetail[] = definition.source.rules.map((value) => ({
    origin: "Direct",
    value,
  }));
  for (const link of definition.source.infoLinks) {
    const reference = session.catalogue.context.graph.references.find(
      (candidate) => candidate.kind === "infoLink" && candidate.source === link,
    );
    const target = reference?.targets.length === 1 ? reference.targets[0] : undefined;
    if (target?.kind !== "rule") continue;
    rules.push({ origin: "Direct", value: target.source as RuleProjection });
  }
  return rules;
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

interface SelectionProfileColumn {
  readonly key: string;
  readonly label: string;
}

/**
 * Packs profiles of the same authored type into native comparison tables.
 *
 * The old one-card-per-profile layout repeated labels around every value and
 * made a unit reference several screens tall. Tables preserve source order and
 * all effective-value annotations while giving model and weapon stats the
 * compact scan pattern players use during list building. Overflow is contained
 * by the table wrapper rather than widening the roster or dialog.
 */
function SelectionProfileTables({
  profiles,
  reports,
}: {
  readonly profiles: readonly SelectionProfileDetail[];
  readonly reports:
    | ReadonlyMap<LocalRosterProfile, LocalRosterProfileCharacteristics>
    | undefined;
}) {
  const groups = new Map<string, SelectionProfileDetail[]>();
  for (const profile of profiles) {
    const key = profile.value.typeId ?? profile.value.typeName ?? "unspecified";
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [profile]);
    else group.push(profile);
  }
  return (
    <div className="selection-profile-table-list">
      {[...groups.entries()].map(([key, groupedProfiles]) => {
        const columns = selectionProfileColumns(groupedProfiles);
        const typeName =
          groupedProfiles[0]?.value.typeName ?? "Unspecified profile type";
        return (
          <section className="selection-profile-table-group" key={key}>
            <h5>{typeName}</h5>
            <div className="selection-profile-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    {columns.map((column) => (
                      <th scope="col" key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedProfiles.map((profile, index) => {
                    const report = reports?.get(profile.value);
                    return (
                      <tr
                        key={selectionProfileKey(profile, index)}
                        data-completeness={report?.completeness}
                      >
                        <th scope="row">
                          {selectionProfileDisplayName(profile, report)}
                          {report?.visibility.status === "hidden" && (
                            <small>Hidden by catalogue</small>
                          )}
                          {report?.visibility.status === "unresolved" && (
                            <small>Visibility unresolved</small>
                          )}
                        </th>
                        {columns.map((column) => {
                          const characteristic = profile.value.characteristics.find(
                            (candidate, candidateIndex) =>
                              selectionProfileColumnKey(
                                candidate,
                                candidateIndex,
                              ) === column.key,
                          );
                          const characteristicReport =
                            characteristic === undefined
                              ? undefined
                              : report?.report.characteristics.find(
                                  (candidate) =>
                                    candidate.characteristic === characteristic,
                                );
                          return (
                            <td key={column.key}>
                              {characteristic === undefined ? (
                                <span aria-label="Not provided">—</span>
                              ) : (
                                <SelectionCharacteristicValue
                                  characteristic={characteristic}
                                  report={characteristicReport}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function selectionProfileColumns(
  profiles: readonly SelectionProfileDetail[],
): readonly SelectionProfileColumn[] {
  const columns = new Map<string, SelectionProfileColumn>();
  for (const profile of profiles) {
    profile.value.characteristics.forEach((characteristic, index) => {
      const key = selectionProfileColumnKey(characteristic, index);
      if (!columns.has(key)) {
        columns.set(key, {
          key,
          label:
            characteristic.name ?? characteristic.typeId ?? "Characteristic",
        });
      }
    });
  }
  return [...columns.values()];
}

function selectionProfileColumnKey(
  characteristic: DirectProfile["characteristics"][number],
  index: number,
): string {
  return characteristic.typeId ?? characteristic.name ?? `column-${index}`;
}

function selectionProfileDisplayName(
  profile: SelectionProfileDetail,
  report: LocalRosterProfileCharacteristics | undefined,
): string {
  const baseName =
    profile.origin === "Direct"
      ? (profile.value.name ?? "Unnamed profile")
      : (profile.value.name ??
        profile.value.definition.name ??
        "Unnamed profile");
  const displayName = report?.name.value ?? baseName;
  const annotation = report?.annotation.value;
  return annotation === undefined || annotation === ""
    ? displayName
    : `${displayName} (${annotation})`;
}

function SelectionCharacteristicValue({
  characteristic,
  report,
}: {
  readonly characteristic: DirectProfile["characteristics"][number];
  readonly report:
    RosterProfileCharacteristicReport["characteristics"][number] | undefined;
}) {
  const modified = report !== undefined && report.steps.length > 0;
  const unresolved = modified && report.value === undefined;
  const displayed = report?.value ?? characteristic.value;
  const changed = modified && !unresolved && displayed !== report.baseValue;
  const routedStep = report?.steps.find((step) => step.origin === "affects");
  const routedName =
    routedStep === undefined
      ? undefined
      : (routedStep.declaredBy.name ?? "another selection");
  const routedVerb =
    routedStep !== undefined &&
    routedStep.status !== "notApplicable" &&
    routedStep.kind === "append"
      ? "Added"
      : "Set";
  return (
    <span className="selection-profile-table-value">
      <span>{displayed === "" ? "Empty value" : displayed}</span>
      {changed && (
        <small>Base {report.baseValue === "" ? "empty value" : report.baseValue}</small>
      )}
      {unresolved && <small>Effective value unresolved</small>}
      {routedName !== undefined && <small>{routedVerb} by {routedName}</small>}
    </span>
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

/** Removes source ordering only inside the Battle Size presentation. */
function childSelectionChoiceLabel(
  parent: BattleScribeRosterSelectionChoice | undefined,
  child: BattleScribeRosterSelectionChoice,
): string {
  const label = selectionChoiceLabel(child);
  return selectionChoiceLabel(parent ?? child).trim().toLocaleLowerCase() ===
    "battle size"
    ? label.replace(/^\d+\.\s+/u, "")
    : label;
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
