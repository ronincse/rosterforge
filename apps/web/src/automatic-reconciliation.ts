/**
 * Post-edit integration for New Recruit's automatic constraint extension.
 *
 * Evaluation remains read-only in its package. This web boundary probes absent
 * materialized choices in throwaway roster snapshots, then applies supported
 * repairs through caller-provided immutable session operations.
 */

import type {
  BattleScribeCatalogueContext,
  MaterializedSelectionEntryGroup,
} from "@rosterforge/data-graph";
import {
  evaluateRosterSelectionVisibilityPath,
  inspectRosterSelectionConstraintWithSelectionConditions,
  isUnboundedConstraintValue,
} from "@rosterforge/evaluation";
import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from "@rosterforge/foundation";
import {
  addRosterSelectionToSelectionFromCatalogueContext,
  type BattleScribeRosterSelectionChoice,
} from "@rosterforge/roster-builder";
import {
  rosterSelectionAmount,
  rosterSelectionsAmount,
  selectionOccurrenceId,
  type Roster,
  type RosterForce,
  type RosterSelection,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";

type AutomaticConstraint =
  BattleScribeRosterSelectionChoice["constraints"][number];

interface AutomaticReconciliationSession {
  readonly catalogue: {
    readonly context: BattleScribeCatalogueContext;
  };
  readonly roster: Roster;
  readonly selectionChoices: ReadonlyMap<
    SelectionOccurrenceId,
    BattleScribeRosterSelectionChoice
  >;
}

/**
 * Supplies occurrence identity for an automatic choice that is currently
 * absent. Browser callers use the same random-ID factory as explicit adds.
 */
export interface LocalRosterAutomaticReconciliationOptions {
  readonly createSelectionId?: () => SelectionOccurrenceId;
  /**
   * The exact materialized choice changed by the initiating command. New
   * Recruit considers that choice first while filling a group and first while
   * trimming the reversed order, so a direct group edit behaves predictably.
   */
  readonly preferredChoice?: BattleScribeRosterSelectionChoice;
}

interface AutomaticSelectionInput {
  readonly selectionId: SelectionOccurrenceId;
  readonly createSelectionId?: () => SelectionOccurrenceId;
  readonly amount?: number;
}

interface AutomaticReconciliationOperations<
  Session extends AutomaticReconciliationSession,
> {
  readonly addChild: (
    session: Session,
    parentId: SelectionOccurrenceId,
    choice: BattleScribeRosterSelectionChoice,
    input: AutomaticSelectionInput,
  ) => Result<Session>;
  readonly removeSelection: (
    session: Session,
    selectionId: SelectionOccurrenceId,
  ) => Result<Session>;
  readonly setAmount: (
    session: Session,
    selectionId: SelectionOccurrenceId,
    amount: number | undefined,
  ) => Result<Session>;
}

interface SelectedAutomaticSelector {
  readonly key: string;
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly occurrences: readonly RosterSelection[];
}

interface SelectedAutomaticAdjustment {
  readonly kind: "selected";
  readonly selector: SelectedAutomaticSelector;
  readonly constraint: AutomaticConstraint;
  readonly amount: number;
}

interface AbsentAutomaticAdjustment {
  readonly kind: "absent";
  readonly parent: RosterSelection;
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly constraint: AutomaticConstraint;
  readonly amount: number;
}

interface AutomaticGroupAdjustment {
  readonly kind: "group";
  readonly parent: RosterSelection;
  readonly group: MaterializedSelectionEntryGroup;
  readonly path: readonly BattleScribeRosterSelectionChoice[];
  readonly constraint: AutomaticConstraint;
  readonly constraintType: "min" | "max";
  readonly amount: number;
}

type AutomaticSelectionAdjustment =
  | SelectedAutomaticAdjustment
  | AbsentAutomaticAdjustment
  | AutomaticGroupAdjustment;

interface AutomaticSelectionScan {
  readonly adjustments: readonly AutomaticSelectionAdjustment[];
  readonly diagnostics: readonly Diagnostic[];
}

interface AbsentAutomaticCandidate {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly path: readonly BattleScribeRosterSelectionChoice[];
}

interface AutomaticGroupCandidate {
  readonly group: MaterializedSelectionEntryGroup;
  readonly path: readonly BattleScribeRosterSelectionChoice[];
}

interface AutomaticGroupChildState {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly occurrences: readonly RosterSelection[];
  readonly minimum: number;
  readonly maximum: number;
}

interface AutomaticGroupChildInspection {
  readonly states: readonly AutomaticGroupChildState[];
  readonly active: boolean;
  readonly completeness: "complete" | "incomplete";
  readonly diagnostics: readonly Diagnostic[];
}

interface AutomaticGroupMutation {
  readonly kind: "increase" | "decrease";
  readonly state: AutomaticGroupChildState;
  readonly amount: number;
}

const maxAutomaticReconciliationPasses = 10;

/**
 * Reconciles the supported ordinary-entry and selection-entry-group branches
 * of New Recruit's automatic constraint handler after one successful edit.
 *
 * The deployed 35.66 runtime clamps an ordinary selector's aggregate amount
 * whenever an `automatic: true` min or max is violated. Groups distribute a
 * deficit in stable source order and trim an excess in reverse order, respecting
 * each visible child's effective max/min. Unit-typed sub-units still use a
 * distinct unsupported branch. The pinned corpus has 54 modifier-driven true
 * owners: 49 ordinary entries, five direct-child groups, and no unit-typed
 * sub-units. Twelve minima start at zero; eleven ordinary owners have no
 * entry-link wrappers anywhere in the corpus and the group owner has three.
 *
 * Reusing the full Checks report here is not viable: ten passes over a pinned
 * 41-selection Guardian roster measured 30,215.7 ms. Evaluating the two
 * selected Scourge bounds directly measured 407.4 ms for ten passes, while ten
 * complete edits with no absent candidate measured 1.2 ms. This scan therefore
 * visits only selected automatic choices, groups carrying automatic bounds,
 * and absent automatic-minimum children.
 */
export function reconcileLocalRosterAutomaticConstraints<
  Session extends AutomaticReconciliationSession,
>(
  edited: Result<Session>,
  operations: AutomaticReconciliationOperations<Session>,
  options: LocalRosterAutomaticReconciliationOptions = {},
): Result<Session> {
  if (!edited.ok) return edited;

  let session = edited.value;
  const diagnostics = [...edited.diagnostics];
  for (let pass = 0; pass < maxAutomaticReconciliationPasses; pass += 1) {
    const scanned = scanAutomaticSelectionAdjustments(session, options);
    appendUniqueDiagnostics(diagnostics, scanned.diagnostics);
    if (scanned.adjustments.length === 0) {
      return success(session, diagnostics);
    }

    let changed = false;
    for (const adjustment of scanned.adjustments) {
      const applied = applyAutomaticSelectionAdjustment(
        session,
        adjustment,
        operations,
        options,
      );
      appendUniqueDiagnostics(diagnostics, applied.diagnostics);
      if (!applied.ok) return failure(diagnostics);
      changed ||= applied.value.roster !== session.roster;
      session = applied.value;
    }
    if (!changed) {
      appendUniqueDiagnostics(diagnostics, [
        automaticConstraintDiagnostic(
          scanned.adjustments[0]!.constraint,
          "WEB_ROSTER_AUTOMATIC_CONSTRAINT_RECONCILIATION_STALLED",
          "An automatic constraint remained violated, but its selected entry amount could not be changed.",
          { adjustmentKind: scanned.adjustments[0]!.kind },
        ),
      ]);
      return success(session, diagnostics);
    }
  }

  const remaining = scanAutomaticSelectionAdjustments(session, options);
  appendUniqueDiagnostics(diagnostics, remaining.diagnostics);
  if (remaining.adjustments.length > 0) {
    appendUniqueDiagnostics(diagnostics, [
      automaticConstraintDiagnostic(
        remaining.adjustments[0]!.constraint,
        "WEB_ROSTER_AUTOMATIC_CONSTRAINT_RECONCILIATION_LIMIT",
        "Automatic constraint reconciliation did not settle within its pass limit.",
        {
          adjustmentKind: remaining.adjustments[0]!.kind,
          maxPasses: maxAutomaticReconciliationPasses,
        },
      ),
    ]);
  }
  return success(session, diagnostics);
}

function scanAutomaticSelectionAdjustments<
  Session extends AutomaticReconciliationSession,
>(
  session: Session,
  options: LocalRosterAutomaticReconciliationOptions,
): AutomaticSelectionScan {
  const selected = scanSelectedAutomaticAdjustments(session);
  // Settle selected quantities first. An automatic maximum can remove a parent
  // subtree, so absent children must be discovered from the resulting tree.
  if (selected.adjustments.length > 0) return selected;

  const groups = scanAutomaticGroupAdjustments(session);
  const diagnostics = [...selected.diagnostics, ...groups.diagnostics];
  if (groups.adjustments.length > 0) {
    return { adjustments: groups.adjustments, diagnostics };
  }

  const absent = scanAbsentAutomaticAdjustments(session, options);
  return {
    adjustments: absent.adjustments,
    diagnostics: [...diagnostics, ...absent.diagnostics],
  };
}

function scanSelectedAutomaticAdjustments<
  Session extends AutomaticReconciliationSession,
>(session: Session): AutomaticSelectionScan {
  const adjustments: SelectedAutomaticAdjustment[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const selector of selectedAutomaticSelectors(session)) {
    const constraints = selector.choice.constraints.filter(
      isEnabledAutomaticConstraint,
    );
    if (constraints.length === 0) continue;
    // Selection-entry groups are transparent in durable rosters and are
    // scanned from each selected parent's materialized children below.
    if (selector.choice.kind === "selectionEntryGroup") continue;
    if (selector.choice.type === "unit") {
      diagnostics.push(
        ...constraints.map((constraint) =>
          automaticConstraintDiagnostic(
            constraint,
            "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SUBUNIT_RECONCILIATION_UNSUPPORTED",
            "Automatic reconciliation for a selected sub-unit is not supported.",
            { selectorKey: selector.key },
          ),
        ),
      );
      continue;
    }

    const owner = selector.occurrences[0]!;
    const amount = rosterSelectionsAmount(selector.occurrences);
    for (const constraint of constraints) {
      const inspected =
        inspectRosterSelectionConstraintWithSelectionConditions(
          session.roster,
          session.catalogue.context,
          owner,
          constraint,
        );
      appendUniqueDiagnostics(diagnostics, inspected.diagnostics);
      if (
        !inspected.ok ||
        inspected.value.completeness !== "complete" ||
        inspected.value.status !== "violated" ||
        inspected.value.limit === undefined
      ) {
        continue;
      }
      const foreignMatches = inspected.value.matching.filter(
        ({ id }) =>
          !selector.occurrences.some((occurrence) => occurrence.id === id),
      );
      if (foreignMatches.length > 0) {
        diagnostics.push(
          automaticConstraintDiagnostic(
            constraint,
            "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SHARED_SELECTOR_UNSUPPORTED",
            "An automatic constraint counts selections outside its exact materialized choice.",
            {
              selectorKey: selector.key,
              foreignSelectionIds: foreignMatches.map(({ id }) => id),
            },
          ),
        );
        continue;
      }

      const target = inspected.value.limit;
      const needsClamp =
        (inspected.value.constraintType === "min" && amount < target) ||
        (inspected.value.constraintType === "max" && amount > target);
      if (needsClamp && target >= 0 && Number.isFinite(target)) {
        adjustments.push({
          kind: "selected",
          selector,
          constraint,
          amount: target,
        });
        // A min and max pair can describe the same exact quantity. Once one
        // violated bound selects a target, evaluate the pair again after it.
        break;
      }
    }
  }

  return { adjustments, diagnostics };
}

function scanAutomaticGroupAdjustments<
  Session extends AutomaticReconciliationSession,
>(session: Session): AutomaticSelectionScan {
  const adjustments: AutomaticGroupAdjustment[] = [];
  const diagnostics: Diagnostic[] = [];
  let probeSequence = 0;

  const visitSelections = (selections: readonly RosterSelection[]): void => {
    for (const parent of selections) {
      const parentChoice = session.selectionChoices.get(parent.id);
      if (parentChoice !== undefined) {
        for (const candidate of automaticGroupCandidates(parentChoice)) {
          const constraints = candidate.group.constraints.filter(
            isEnabledAutomaticConstraint,
          );
          if (constraints.length === 0) continue;

          const visibility = evaluateRosterSelectionVisibilityPath(
            session.roster,
            session.catalogue.context,
            parent,
            candidate.path,
          );
          appendUniqueDiagnostics(diagnostics, visibility.diagnostics);
          if (
            !visibility.ok ||
            visibility.value.completeness !== "complete" ||
            visibility.value.status !== "visible"
          ) {
            continue;
          }

          if (directGroupChoices(candidate.group).length > 0) {
            diagnostics.push(
              ...constraints.map((constraint) =>
                automaticConstraintDiagnostic(
                  constraint,
                  "WEB_ROSTER_AUTOMATIC_CONSTRAINT_NESTED_GROUP_UNSUPPORTED",
                  "Automatic reconciliation for a group containing nested groups is not supported.",
                  { parentId: parent.id, groupId: candidate.group.id },
                ),
              ),
            );
            continue;
          }

          // A temporary group occurrence gives conditions the same relative
          // self/parent position as New Recruit's non-roster group object. It
          // is used only to evaluate the effective limit and never escapes.
          const probeId = unusedProbeSelectionId(
            session.roster,
            ++probeSequence,
          );
          const probed =
            addRosterSelectionToSelectionFromCatalogueContext(
              session.roster,
              session.catalogue.context,
              parent.id,
              candidate.group,
              { id: probeId },
            );
          appendUniqueDiagnostics(diagnostics, probed.diagnostics);
          if (!probed.ok) continue;
          const probe = findRosterSelection(probed.value.forces, probeId);
          if (probe === undefined) continue;

          const choices = groupEntryChoices(candidate.group);
          const amount = rosterSelectionsAmount(
            parent.selections.filter((selection) => {
              const choice = session.selectionChoices.get(selection.id);
              return choice !== undefined && choices.includes(choice);
            }),
          );
          for (const constraint of constraints) {
            const inspected =
              inspectRosterSelectionConstraintWithSelectionConditions(
                probed.value,
                session.catalogue.context,
                probe,
                constraint,
              );
            appendUniqueDiagnostics(diagnostics, inspected.diagnostics);
            if (
              !inspected.ok ||
              inspected.value.completeness !== "complete" ||
              inspected.value.limit === undefined ||
              !Number.isSafeInteger(inspected.value.limit) ||
              inspected.value.limit < 0 ||
              (inspected.value.constraintType !== "min" &&
                inspected.value.constraintType !== "max")
            ) {
              continue;
            }
            const constraintType = inspected.value.constraintType;
            const target = inspected.value.limit;
            if (
              (constraintType === "min" && amount < target) ||
              (constraintType === "max" && amount > target)
            ) {
              adjustments.push({
                kind: "group",
                parent,
                group: candidate.group,
                path: candidate.path,
                constraint,
                constraintType,
                amount: target,
              });
              // Min/max pairs can describe one quantity. Re-read both after
              // the first violated bound has distributed its adjustment.
              break;
            }
          }
        }
      }
      visitSelections(parent.selections);
    }
  };

  const visitForce = (force: RosterForce): void => {
    visitSelections(force.selections);
    for (const child of force.forces) visitForce(child);
  };
  for (const force of session.roster.forces) visitForce(force);
  return { adjustments, diagnostics };
}

function scanAbsentAutomaticAdjustments<
  Session extends AutomaticReconciliationSession,
>(
  session: Session,
  options: LocalRosterAutomaticReconciliationOptions,
): AutomaticSelectionScan {
  const adjustments: AbsentAutomaticAdjustment[] = [];
  const diagnostics: Diagnostic[] = [];
  let probeSequence = 0;

  const visitSelections = (selections: readonly RosterSelection[]): void => {
    for (const parent of selections) {
      const parentChoice = session.selectionChoices.get(parent.id);
      if (parentChoice !== undefined) {
        for (const candidate of absentAutomaticCandidates(parentChoice)) {
          if (
            (candidate.choice.kind === "selectionEntry" &&
              candidate.choice.type === "unit") ||
            parent.selections.some(
              (selected) =>
                session.selectionChoices.get(selected.id) ===
                candidate.choice,
            )
          ) {
            continue;
          }

          const visibility = evaluateRosterSelectionVisibilityPath(
            session.roster,
            session.catalogue.context,
            parent,
            candidate.path,
          );
          appendUniqueDiagnostics(diagnostics, visibility.diagnostics);
          if (
            !visibility.ok ||
            visibility.value.completeness !== "complete" ||
            visibility.value.status !== "visible"
          ) {
            continue;
          }

          // The ephemeral add changes only the throwaway roster value. Catalogue
          // projections, generic nodes, and imported bytes stay shared.
          const probeId = unusedProbeSelectionId(
            session.roster,
            ++probeSequence,
          );
          const probed =
            addRosterSelectionToSelectionFromCatalogueContext(
              session.roster,
              session.catalogue.context,
              parent.id,
              candidate.choice,
              { id: probeId },
            );
          appendUniqueDiagnostics(diagnostics, probed.diagnostics);
          if (!probed.ok) continue;
          // Builder success preserves the caller's fresh exact ID, so this
          // lookup recovers the single probe occurrence just inserted.
          const probe: RosterSelection = findRosterSelection(
            probed.value.forces,
            probeId,
          )!;
          const probeSession: Session = {
            ...session,
            roster: probed.value,
            selectionChoices: new Map(session.selectionChoices).set(
              probeId,
              candidate.choice,
            ),
          };

          let required = 0;
          let source: AutomaticConstraint | undefined;
          for (const constraint of candidate.choice.constraints.filter(
            isEnabledAutomaticMinimum,
          )) {
            const inspected =
              inspectRosterSelectionConstraintWithSelectionConditions(
                probeSession.roster,
                probeSession.catalogue.context,
                probe,
                constraint,
              );
            appendUniqueDiagnostics(diagnostics, inspected.diagnostics);
            if (
              !inspected.ok ||
              inspected.value.completeness !== "complete" ||
              inspected.value.constraintType !== "min" ||
              inspected.value.limit === undefined ||
              inspected.value.limit <= 0 ||
              !Number.isFinite(inspected.value.limit)
            ) {
              continue;
            }

            const existing = inspected.value.matching.filter(
              ({ id }) => id !== probeId,
            );
            const foreign = existing.filter(
              ({ id }) =>
                session.selectionChoices.get(id) !== candidate.choice,
            );
            // Constraint sharing can count a definition through several
            // wrappers, but commands mutate one exact materialized choice.
            if (foreign.length > 0) {
              diagnostics.push(
                automaticConstraintDiagnostic(
                  constraint,
                  "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SHARED_SELECTOR_UNSUPPORTED",
                  "An absent automatic choice shares its counted identity with another materialized choice.",
                  {
                    parentId: parent.id,
                    choiceId: candidate.choice.id,
                    foreignSelectionIds: foreign.map(({ id }) => id),
                  },
                ),
              );
              // One ambiguous sibling bound withholds this candidate even when
              // an earlier sibling bound produced an otherwise safe deficit.
              required = 0;
              source = undefined;
              break;
            }
            const deficit =
              inspected.value.limit - rosterSelectionsAmount(existing);
            if (deficit > required) {
              required = deficit;
              source = constraint;
            }
          }

          if (required <= 0 || source === undefined) continue;
          if (options.createSelectionId === undefined) {
            diagnostics.push(
              automaticConstraintDiagnostic(
                source,
                "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SELECTION_ID_UNAVAILABLE",
                "An automatic choice became required, but this command supplied no occurrence-ID factory.",
                {
                  parentId: parent.id,
                  choiceId: candidate.choice.id,
                  amount: required,
                },
              ),
            );
            continue;
          }
          adjustments.push({
            kind: "absent",
            parent,
            choice: candidate.choice,
            constraint: source,
            amount: required,
          });
        }
      }
      visitSelections(parent.selections);
    }
  };

  const visitForce = (force: RosterForce): void => {
    visitSelections(force.selections);
    for (const child of force.forces) visitForce(child);
  };
  for (const force of session.roster.forces) visitForce(force);
  return { adjustments, diagnostics };
}

function absentAutomaticCandidates(
  parent: BattleScribeRosterSelectionChoice,
): readonly AbsentAutomaticCandidate[] {
  const candidates: AbsentAutomaticCandidate[] = [];

  const visit = (
    container: BattleScribeRosterSelectionChoice,
    path: readonly BattleScribeRosterSelectionChoice[],
  ): void => {
    const links = container.entryLinks.filter(isResolvedSelectionChoice);
    const entries = [
      ...container.selectionEntries,
      ...links.filter(({ kind }) => kind === "selectionEntry"),
    ];
    for (const choice of entries) {
      if (choice.constraints.some(isEnabledAutomaticMinimum)) {
        candidates.push({ choice, path: [...path, choice] });
      }
    }

    // Groups are transparent for this ordinary-entry branch; their own
    // automatic constraints stay with New Recruit's distinct group algorithm.
    const groups = [
      ...container.selectionEntryGroups,
      ...links.filter(({ kind }) => kind === "selectionEntryGroup"),
    ];
    for (const group of groups) {
      visit(group, [...path, group]);
    }
  };

  visit(parent, []);
  return candidates;
}

function automaticGroupCandidates(
  parent: BattleScribeRosterSelectionChoice,
): readonly AutomaticGroupCandidate[] {
  const candidates: AutomaticGroupCandidate[] = [];

  const visit = (
    container: BattleScribeRosterSelectionChoice,
    path: readonly BattleScribeRosterSelectionChoice[],
  ): void => {
    for (const group of directGroupChoices(container)) {
      const groupPath = [...path, group];
      candidates.push({ group, path: groupPath });
      visit(group, groupPath);
    }
  };

  visit(parent, []);
  return candidates;
}

function directGroupChoices(
  container: BattleScribeRosterSelectionChoice,
): readonly MaterializedSelectionEntryGroup[] {
  return [
    ...container.selectionEntryGroups,
    ...container.entryLinks.filter(
      (choice): choice is MaterializedSelectionEntryGroup =>
        choice.kind === "selectionEntryGroup",
    ),
  ];
}

function groupEntryChoices(
  group: MaterializedSelectionEntryGroup,
): readonly BattleScribeRosterSelectionChoice[] {
  return [
    ...group.selectionEntries,
    ...group.entryLinks.filter(
      (choice): choice is BattleScribeRosterSelectionChoice =>
        choice.kind === "selectionEntry",
    ),
  ];
}

function selectedAutomaticSelectors<
  Session extends AutomaticReconciliationSession,
>(session: Session): readonly SelectedAutomaticSelector[] {
  const selectors: SelectedAutomaticSelector[] = [];

  const visitSelections = (
    parentKey: string,
    selections: readonly RosterSelection[],
  ): void => {
    const byChoice = new Map<
      BattleScribeRosterSelectionChoice,
      RosterSelection[]
    >();
    for (const selection of selections) {
      const choice = session.selectionChoices.get(selection.id);
      if (choice !== undefined) {
        const occurrences = byChoice.get(choice);
        if (occurrences === undefined) {
          byChoice.set(choice, [selection]);
        } else {
          occurrences.push(selection);
        }
      }
    }
    for (const [choice, occurrences] of byChoice) {
      if (!choice.constraints.some(isEnabledAutomaticConstraint)) continue;
      selectors.push({
        key: [
          parentKey,
          choice.occurrence.source.sourceId,
          ...choice.occurrence.path,
        ].join("|"),
        choice,
        occurrences,
      });
    }
    for (const selection of selections) {
      visitSelections(
        "selection:" + selection.id,
        selection.selections,
      );
    }
  };

  const visitForce = (force: RosterForce): void => {
    visitSelections("force:" + force.id, force.selections);
    for (const child of force.forces) visitForce(child);
  };
  for (const force of session.roster.forces) visitForce(force);
  return selectors;
}

function applyAutomaticSelectionAdjustment<
  Session extends AutomaticReconciliationSession,
>(
  session: Session,
  adjustment: AutomaticSelectionAdjustment,
  operations: AutomaticReconciliationOperations<Session>,
  options: LocalRosterAutomaticReconciliationOptions,
): Result<Session> {
  if (adjustment.kind === "group") {
    return applyAutomaticGroupAdjustment(
      session,
      adjustment,
      operations,
      options,
    );
  }

  if (adjustment.kind === "absent") {
    const createSelectionId = options.createSelectionId;
    if (createSelectionId === undefined) return success(session);
    return operations.addChild(
      session,
      adjustment.parent.id,
      adjustment.choice,
      {
        selectionId: createSelectionId(),
        createSelectionId,
        amount: adjustment.amount,
      },
    );
  }

  const liveOccurrences = adjustment.selector.occurrences
    .map(({ id }) => findRosterSelection(session.roster.forces, id))
    .filter(
      (occurrence): occurrence is RosterSelection =>
        occurrence !== undefined,
    );
  const currentAmount = rosterSelectionsAmount(liveOccurrences);
  if (currentAmount === adjustment.amount) return success(session);
  if (liveOccurrences.length === 0) {
    return success(
      session,
      [
        automaticConstraintDiagnostic(
          adjustment.constraint,
          "WEB_ROSTER_AUTOMATIC_CONSTRAINT_ABSENT_CHOICE_UNSUPPORTED",
          "Automatic reconciliation cannot activate a choice whose scanned occurrence disappeared.",
          {
            selectorKey: adjustment.selector.key,
            target: adjustment.amount,
          },
        ),
      ],
    );
  }

  if (currentAmount < adjustment.amount) {
    const occurrence = liveOccurrences[0]!;
    return operations.setAmount(
      session,
      occurrence.id,
      rosterSelectionAmount(occurrence) +
        adjustment.amount -
        currentAmount,
    );
  }

  let working = session;
  let excess = currentAmount - adjustment.amount;
  const diagnostics: Diagnostic[] = [];
  for (const occurrence of [...liveOccurrences].reverse()) {
    if (excess <= 0) break;
    const amount = rosterSelectionAmount(occurrence);
    const changed =
      amount <= excess
        ? operations.removeSelection(working, occurrence.id)
        : operations.setAmount(
            working,
            occurrence.id,
            amount - excess,
          );
    diagnostics.push(...changed.diagnostics);
    if (!changed.ok) return failure(diagnostics);
    working = changed.value;
    excess -= Math.min(excess, amount);
  }
  return success(working, diagnostics);
}

function applyAutomaticGroupAdjustment<
  Session extends AutomaticReconciliationSession,
>(
  session: Session,
  adjustment: AutomaticGroupAdjustment,
  operations: AutomaticReconciliationOperations<Session>,
  options: LocalRosterAutomaticReconciliationOptions,
): Result<Session> {
  const inspected = inspectAutomaticGroupChildren(session, adjustment);
  const diagnostics = [...inspected.diagnostics];
  if (
    !inspected.active ||
    inspected.completeness !== "complete"
  ) {
    return success(session, diagnostics);
  }

  const preferredChoice = options.preferredChoice;
  const createSelectionId = options.createSelectionId;
  const ordered = inspected.states
    .map((state, index) => ({ state, index }))
    .sort(
      (left, right) =>
        Number(right.state.choice === preferredChoice) -
          Number(left.state.choice === preferredChoice) ||
        left.index - right.index,
    )
    .map(({ state }) => state);
  const current = rosterSelectionsAmount(
    ordered.flatMap(({ occurrences }) => occurrences),
  );
  let remaining =
    adjustment.constraintType === "min"
      ? adjustment.amount - current
      : current - adjustment.amount;
  if (remaining <= 0) return success(session, diagnostics);

  const mutations: AutomaticGroupMutation[] = [];
  const candidates =
    adjustment.constraintType === "min"
      ? ordered
      : [...ordered].reverse();
  for (const state of candidates) {
    if (remaining <= 0) break;
    const amount = rosterSelectionsAmount(state.occurrences);
    const available =
      adjustment.constraintType === "min"
        ? state.maximum - amount
        : amount - state.minimum;
    const changed = Math.min(remaining, Math.max(0, available));
    if (changed <= 0) continue;
    mutations.push({
      kind:
        adjustment.constraintType === "min" ? "increase" : "decrease",
      state,
      amount: changed,
    });
    remaining -= changed;
  }

  if (remaining > 0) {
    diagnostics.push(
      automaticConstraintDiagnostic(
        adjustment.constraint,
        "WEB_ROSTER_AUTOMATIC_CONSTRAINT_GROUP_BOUNDS_UNSATISFIABLE",
        "Visible group entries cannot satisfy the current automatic group bound.",
        {
          parentId: adjustment.parent.id,
          groupId: adjustment.group.id,
          constraintType: adjustment.constraintType,
          target: adjustment.amount,
          remaining,
        },
      ),
    );
    return success(session, diagnostics);
  }

  const needsNewOccurrence = mutations.some(
    ({ kind, state }) =>
      kind === "increase" && state.occurrences.length === 0,
  );
  if (needsNewOccurrence && createSelectionId === undefined) {
    diagnostics.push(
      automaticConstraintDiagnostic(
        adjustment.constraint,
        "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SELECTION_ID_UNAVAILABLE",
        "An automatic group needs a new choice, but this command supplied no occurrence-ID factory.",
        {
          parentId: adjustment.parent.id,
          groupId: adjustment.group.id,
          target: adjustment.amount,
        },
      ),
    );
    return success(session, diagnostics);
  }

  let working = session;
  for (const mutation of mutations) {
    if (mutation.kind === "increase") {
      const occurrence = mutation.state.occurrences
        .map(({ id }) => findRosterSelection(working.roster.forces, id))
        .find(
          (candidate): candidate is RosterSelection =>
            candidate !== undefined,
        );
      const changed =
        occurrence === undefined
          ? operations.addChild(
              working,
              adjustment.parent.id,
              mutation.state.choice,
              {
                selectionId: createSelectionId!(),
                createSelectionId: createSelectionId!,
                amount: mutation.amount,
              },
            )
          : operations.setAmount(
              working,
              occurrence.id,
              rosterSelectionAmount(occurrence) + mutation.amount,
            );
      appendUniqueDiagnostics(diagnostics, changed.diagnostics);
      if (!changed.ok) return failure(diagnostics);
      working = changed.value;
      continue;
    }

    let toRemove = mutation.amount;
    for (const original of [...mutation.state.occurrences].reverse()) {
      if (toRemove <= 0) break;
      const occurrence = findRosterSelection(
        working.roster.forces,
        original.id,
      );
      if (occurrence === undefined) continue;
      const amount = rosterSelectionAmount(occurrence);
      const changed =
        amount <= toRemove
          ? operations.removeSelection(working, occurrence.id)
          : operations.setAmount(
              working,
              occurrence.id,
              amount - toRemove,
            );
      appendUniqueDiagnostics(diagnostics, changed.diagnostics);
      if (!changed.ok) return failure(diagnostics);
      working = changed.value;
      toRemove -= Math.min(amount, toRemove);
    }
  }
  return success(working, diagnostics);
}

function inspectAutomaticGroupChildren<
  Session extends AutomaticReconciliationSession,
>(
  session: Session,
  adjustment: AutomaticGroupAdjustment,
): AutomaticGroupChildInspection {
  const diagnostics: Diagnostic[] = [];
  const parent = findRosterSelection(
    session.roster.forces,
    adjustment.parent.id,
  );
  const parentChoice =
    parent === undefined
      ? undefined
      : session.selectionChoices.get(parent.id);
  if (
    parent === undefined ||
    parentChoice === undefined ||
    !automaticGroupCandidates(parentChoice).some(
      ({ group }) => group === adjustment.group,
    )
  ) {
    return {
      states: [],
      active: false,
      completeness: "complete",
      diagnostics,
    };
  }

  const groupVisibility = evaluateRosterSelectionVisibilityPath(
    session.roster,
    session.catalogue.context,
    parent,
    adjustment.path,
  );
  appendUniqueDiagnostics(diagnostics, groupVisibility.diagnostics);
  if (
    !groupVisibility.ok ||
    groupVisibility.value.completeness !== "complete"
  ) {
    return {
      states: [],
      active: false,
      completeness: "incomplete",
      diagnostics,
    };
  }
  if (groupVisibility.value.status !== "visible") {
    return {
      states: [],
      active: false,
      completeness: "complete",
      diagnostics,
    };
  }

  const states: AutomaticGroupChildState[] = [];
  let incomplete = false;
  let probeSequence = 0;
  for (const choice of groupEntryChoices(adjustment.group)) {
    const visibility = evaluateRosterSelectionVisibilityPath(
      session.roster,
      session.catalogue.context,
      parent,
      [...adjustment.path, choice],
    );
    appendUniqueDiagnostics(diagnostics, visibility.diagnostics);
    if (
      !visibility.ok ||
      visibility.value.completeness !== "complete"
    ) {
      incomplete = true;
      continue;
    }
    if (visibility.value.status !== "visible") continue;
    if (choice.kind === "selectionEntry" && choice.type === "unit") {
      diagnostics.push(
        automaticConstraintDiagnostic(
          adjustment.constraint,
          "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SUBUNIT_RECONCILIATION_UNSUPPORTED",
          "Automatic group reconciliation cannot change a unit-typed sub-unit.",
          {
            parentId: parent.id,
            groupId: adjustment.group.id,
            choiceId: choice.id,
          },
        ),
      );
      incomplete = true;
      continue;
    }

    const occurrences = parent.selections.filter(
      (selection) => session.selectionChoices.get(selection.id) === choice,
    );
    const constraints = choice.constraints.filter(
      isPotentialParentSelectionBound,
    );
    let anchor = occurrences[0];
    let probedRoster = session.roster;
    if (anchor === undefined && constraints.length > 0) {
      const probeId = unusedProbeSelectionId(
        session.roster,
        ++probeSequence,
      );
      const probed = addRosterSelectionToSelectionFromCatalogueContext(
        session.roster,
        session.catalogue.context,
        parent.id,
        choice,
        { id: probeId },
      );
      appendUniqueDiagnostics(diagnostics, probed.diagnostics);
      if (!probed.ok) {
        incomplete = true;
        continue;
      }
      probedRoster = probed.value;
      anchor = findRosterSelection(probed.value.forces, probeId);
      if (anchor === undefined) {
        incomplete = true;
        continue;
      }
    }

    let minimum = 0;
    let maximum = Number.POSITIVE_INFINITY;
    for (const constraint of constraints) {
      if (anchor === undefined) {
        incomplete = true;
        continue;
      }
      const inspected =
        inspectRosterSelectionConstraintWithSelectionConditions(
          probedRoster,
          session.catalogue.context,
          anchor,
          constraint,
        );
      appendUniqueDiagnostics(diagnostics, inspected.diagnostics);
      if (
        !inspected.ok ||
        inspected.value.completeness !== "complete" ||
        inspected.value.limit === undefined ||
        !Number.isSafeInteger(inspected.value.limit) ||
        (inspected.value.limit < 0 &&
          !isUnboundedConstraintValue(inspected.value.limit)) ||
        (inspected.value.constraintType !== "min" &&
          inspected.value.constraintType !== "max")
      ) {
        incomplete = true;
        continue;
      }
      // An unbounded bound is known, not unknown: it simply does not narrow
      // the range, so it contributes its fold's identity rather than making
      // the whole reconciliation give up.
      if (inspected.value.constraintType === "min") {
        minimum = Math.max(
          minimum,
          isUnboundedConstraintValue(inspected.value.limit)
            ? 0
            : inspected.value.limit,
        );
      } else {
        maximum = Math.min(
          maximum,
          isUnboundedConstraintValue(inspected.value.limit)
            ? Number.POSITIVE_INFINITY
            : inspected.value.limit,
        );
      }
    }
    if (minimum > maximum) {
      diagnostics.push(
        automaticConstraintDiagnostic(
          constraints[0] ?? adjustment.constraint,
          "WEB_ROSTER_AUTOMATIC_CONSTRAINT_GROUP_CHILD_BOUNDS_CONFLICT",
          "A visible group entry has an effective minimum above its maximum.",
          {
            parentId: parent.id,
            groupId: adjustment.group.id,
            choiceId: choice.id,
            minimum,
            maximum,
          },
        ),
      );
      incomplete = true;
      continue;
    }
    states.push({ choice, occurrences, minimum, maximum });
  }

  return {
    states,
    active: true,
    completeness: incomplete ? "incomplete" : "complete",
    diagnostics,
  };
}

function isPotentialParentSelectionBound(
  constraint: AutomaticConstraint,
): boolean {
  if (
    constraint.field === "selections" &&
    constraint.scope === "parent"
  ) {
    return true;
  }
  return (
    (constraint.type === "min" || constraint.type === "max") &&
    (constraint.field === undefined || constraint.field === "selections") &&
    (constraint.scope === undefined || constraint.scope === "parent")
  );
}

function isEnabledAutomaticConstraint(
  constraint: AutomaticConstraint,
): boolean {
  const value = constraint.node.attributes["automatic"];
  return value === "true" || value === "1";
}

function isEnabledAutomaticMinimum(
  constraint: AutomaticConstraint,
): boolean {
  return (
    isEnabledAutomaticConstraint(constraint) &&
    constraint.type === "min"
  );
}

function unusedProbeSelectionId(
  roster: Roster,
  sequence: number,
): SelectionOccurrenceId {
  let suffix = sequence;
  let candidate = selectionOccurrenceId(
    "__rosterforge_automatic_probe_" + suffix,
  );
  while (findRosterSelection(roster.forces, candidate) !== undefined) {
    suffix += 1;
    candidate = selectionOccurrenceId(
      "__rosterforge_automatic_probe_" + suffix,
    );
  }
  return candidate;
}

function findRosterSelection(
  forces: readonly RosterForce[],
  targetId: SelectionOccurrenceId,
): RosterSelection | undefined {
  for (const force of forces) {
    const direct = findRosterSelectionInList(force.selections, targetId);
    if (direct !== undefined) return direct;
    const nested = findRosterSelection(force.forces, targetId);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function findRosterSelectionInList(
  selections: readonly RosterSelection[],
  targetId: SelectionOccurrenceId,
): RosterSelection | undefined {
  for (const selection of selections) {
    if (selection.id === targetId) return selection;
    const nested = findRosterSelectionInList(
      selection.selections,
      targetId,
    );
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function isResolvedSelectionChoice(
  choice: BattleScribeRosterSelectionChoice["entryLinks"][number],
): choice is BattleScribeRosterSelectionChoice {
  return choice.kind !== "unresolvedEntryLink";
}

function appendUniqueDiagnostics(
  target: Diagnostic[],
  incoming: readonly Diagnostic[],
): void {
  for (const diagnostic of incoming) {
    const duplicate = target.some(
      (candidate) =>
        candidate.code === diagnostic.code &&
        candidate.location?.source.sourceId ===
          diagnostic.location?.source.sourceId &&
        candidate.location?.path?.join("|") ===
          diagnostic.location?.path?.join("|"),
    );
    if (!duplicate) target.push(diagnostic);
  }
}

function automaticConstraintDiagnostic(
  constraint: AutomaticConstraint,
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility"],
    location: {
      source: constraint.source,
      path: constraint.path,
    },
    details,
  };
}
