import type {
  BattleScribeCategoryDefinition,
  BattleScribeForceDefinition,
  MaterializedInfoGroup,
  MaterializedProfileInfoLink,
  MaterializedSelectionEntryGroup,
  MaterializedVisibleRoot,
} from "@rosterforge/data-graph";
import {
  composeSupportedRosterValidation,
  evaluateRosterCostsWithSelectionConditions,
  evaluateRosterProfileAnnotation,
  evaluateRosterProfileCharacteristics,
  evaluateRosterProfileName,
  evaluateRosterProfileVisibility,
  evaluateRosterSelectionAnnotation,
  evaluateRosterSelectionName,
  evaluateRosterSelectionCategories,
  evaluateRosterSelectionVisibility,
  evaluateRosterSelectionVisibilityPath,
  inspectEmptySingleForceRootChoices,
  inspectEmptySingleForceRosterStructuralStatus,
  inspectRosterSelectionChildChoices,
  inspectRosterSelectionDefaultAmount,
  inspectRosterForceConstraintsInRoster,
  inspectRosterSelectionConstraintsInRoster,
  planEmptySingleForceRootInitialization,
  planRosterSelectionInitialization,
  rootSelectionBoundIdentity,
  selectionEntryGroupVisibilityPath,
  type EmptySingleForceRootBoundIdentity,
  type EmptySingleForceRootChoiceInspection,
  type EmptySingleForceRosterStructuralStatus,
  type RosterForceConstraintsInRosterReport,
  type RosterProfileAnnotationReport,
  type RosterProfileCharacteristicReport,
  type RosterProfileNameReport,
  type RosterProfileVisibilityReport,
  type RosterSelectionAnnotationReport,
  type RosterSelectionCategoryReport,
  type RosterSelectionInitializationPlan,
  type RosterSelectionChoiceGroupInspection,
  type RosterSelectionDirectChoiceInspection,
  type RosterSelectionConditionCostReport,
  type RosterSelectionConstraintsInRosterReport,
  type SupportedRosterValidationReport,
} from "@rosterforge/evaluation";
import {
  failure,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type ValidationCompleteness,
} from "@rosterforge/foundation";
import {
  addRosterSelectionToSelectionFromCatalogueContext,
  addRosterSelectionToForceFromCatalogueContext,
  addRosterForceFromCatalogueContext,
  createRosterFromCatalogueContext,
  rosterCatalogueReference,
  type BattleScribeRosterSelectionChoice,
} from "@rosterforge/roster-builder";
import {
  removeRosterSelection,
  rosterDefinitionKeyForSource,
  rosterSelectionAmount,
  rosterSelectionsAmount,
  selectionOccurrenceId,
  setRosterSelectionAmount,
  setRosterSelectionName,
  type ForceOccurrenceId,
  type Roster,
  type RosterForce,
  type RosterSelectionDefinitionReference,
  type RosterId,
  type RosterSelection,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";

import {
  reconcileLocalRosterAutomaticConstraints,
  type LocalRosterAutomaticReconciliationOptions,
} from "./automatic-reconciliation.js";
import type { LocalCatalogueChoice } from "./catalogue-library.js";

export type { LocalRosterAutomaticReconciliationOptions };

export interface CreateLocalRosterSessionInput {
  readonly rosterId: RosterId;
  readonly forceId: ForceOccurrenceId;
  readonly name: string;
  readonly createSelectionId?: () => SelectionOccurrenceId;
}

export interface LocalRosterSession {
  readonly catalogue: LocalCatalogueChoice;
  readonly forceDefinition: BattleScribeForceDefinition;
  readonly roster: Roster;
  readonly selectionChoices: ReadonlyMap<
    SelectionOccurrenceId,
    BattleScribeRosterSelectionChoice
  >;
}

export interface LocalRosterConstraintInspection {
  readonly completeness: ValidationCompleteness;
  readonly selections: RosterSelectionConstraintsInRosterReport;
  readonly forces: RosterForceConstraintsInRosterReport;
}

export type LocalRosterProfile =
  | BattleScribeRosterSelectionChoice["profiles"][number]
  | MaterializedProfileInfoLink;

export interface LocalRosterProfileCharacteristics {
  readonly profile: LocalRosterProfile;
  readonly report: RosterProfileCharacteristicReport;
  /** Effective display name; the projected source name is unchanged. */
  readonly name: RosterProfileNameReport;
  readonly visibility: RosterProfileVisibilityReport;
  /** The display annotation decorating this profile's name, if any. */
  readonly annotation: RosterProfileAnnotationReport;
  readonly completeness: ValidationCompleteness;
}

export interface LocalRosterCategoryEntry {
  readonly id: ObjectId;
  readonly name: string;
  /** True when the category is present only because a modifier added it. */
  readonly added: boolean;
  readonly primary: boolean;
}

export interface LocalRosterCategoryInspection {
  readonly report: RosterSelectionCategoryReport;
  /** Effective keywords in order, present only when membership is known. */
  readonly categories?: readonly LocalRosterCategoryEntry[];
  /** Categories the links declared but a modifier removed. */
  readonly removed: readonly LocalRosterCategoryEntry[];
  readonly completeness: ValidationCompleteness;
}

export interface LocalRosterCharacteristicInspection {
  readonly completeness: ValidationCompleteness;
  readonly profiles: readonly LocalRosterProfileCharacteristics[];
  readonly byProfile: ReadonlyMap<
    LocalRosterProfile,
    LocalRosterProfileCharacteristics
  >;
}

export interface LocalRosterSupportedValidationInspection {
  readonly status: SupportedRosterValidationReport;
  readonly structural: EmptySingleForceRosterStructuralStatus;
  readonly constraints: LocalRosterConstraintInspection;
  readonly structuralDiagnostics: readonly Diagnostic[];
  readonly constraintDiagnostics: readonly Diagnostic[];
}

export type LocalRosterRootChoice = MaterializedVisibleRoot & {
  readonly materialized: BattleScribeRosterSelectionChoice;
};

export interface LocalRosterRootChoiceGroup {
  readonly key: string;
  readonly name: string;
  readonly category?: BattleScribeCategoryDefinition;
  readonly choices: readonly LocalRosterRootChoice[];
}

export interface LocalRosterRootChoiceState {
  readonly choice: LocalRosterRootChoice;
  readonly selected: readonly RosterSelection[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly remaining?: number;
  readonly completeness: ValidationCompleteness;
}

export interface LocalRosterRootChoiceGroupState {
  readonly key: string;
  readonly name: string;
  readonly category?: BattleScribeCategoryDefinition;
  readonly choices: readonly LocalRosterRootChoiceState[];
}

export interface LocalRosterRootChoiceInspection {
  readonly groups: readonly LocalRosterRootChoiceGroupState[];
  readonly completeness: ValidationCompleteness;
}

export interface AddLocalRosterRootSelectionInput {
  readonly selectionId: SelectionOccurrenceId;
  readonly createSelectionId?: () => SelectionOccurrenceId;
  readonly amount?: number;
}

export interface LocalRosterChildChoiceGroup {
  readonly group: MaterializedSelectionEntryGroup;
  /** The entries currently offerable: hidden ones are filtered out. */
  readonly choices: readonly BattleScribeRosterSelectionChoice[];
  /**
   * How many of the group's entries are hidden right now.
   *
   * Lets a caller tell "this group has nothing in it" from "this group has
   * nothing *yet*". `Force Disposition` offers nothing until a detachment is
   * chosen, in every faction checked — Dark Angels then offers Priority Assets
   * and Death Guard offers Reconnaissance. Reporting that as no available
   * entries reads like a broken catalogue rather than an order of operations.
   */
  readonly hiddenChoiceCount: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly selected: readonly RosterSelection[];
  readonly remaining?: number;
  readonly completeness: ValidationCompleteness;
}

export interface LocalRosterDirectChildChoice {
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly selected: readonly RosterSelection[];
  readonly remaining?: number;
  readonly completeness: ValidationCompleteness;
}

export interface LocalRosterChildChoiceInspection {
  readonly direct: readonly LocalRosterDirectChildChoice[];
  readonly groups: readonly LocalRosterChildChoiceGroup[];
  readonly completeness: ValidationCompleteness;
}

export function createLocalRosterSession(
  catalogue: LocalCatalogueChoice,
  forceDefinition: BattleScribeForceDefinition,
  input: CreateLocalRosterSessionInput,
): Result<LocalRosterSession> {
  const roster = createRosterFromCatalogueContext(catalogue.context, {
    id: input.rosterId,
    name: input.name,
  });
  const withForce = addRosterForceFromCatalogueContext(
    roster,
    catalogue.context,
    forceDefinition,
    { id: input.forceId },
  );
  if (!withForce.ok) {
    return withForce;
  }
  let session: LocalRosterSession = {
    catalogue,
    forceDefinition,
    roster: withForce.value,
    selectionChoices: new Map(),
  };
  const diagnostics: Diagnostic[] = [...withForce.diagnostics];
  if (input.createSelectionId === undefined) {
    return success(session, diagnostics);
  }
  // Only roots that would actually be offered are created.
  //
  // A catalogue link with `importRootEntries` pulls an allied library's roots
  // in, and 90 of the 109 links in the pinned corpus do exactly that — it is
  // how Imperial Knights become available to a Space Marine army, so the
  // linking is right. What is not right is *initialising* their configuration:
  // an empty Dark Angels roster came up holding `Code Chivalric`, which is
  // Knights configuration carrying `min 1` in force scope and a `set hidden`
  // gated on the primary catalogue being Knights. It is required *if* it
  // applies, and on a Dark Angels force it does not.
  const force = withForce.value.forces[0];
  const visibleRoots = catalogue.context.roots.roots.filter((root) => {
    if (
      root.materialized.kind === "unresolvedEntryLink" ||
      force === undefined
    ) {
      return true;
    }
    const visibility = evaluateRosterSelectionVisibility(
      withForce.value,
      catalogue.context,
      force,
      root.materialized,
    );
    // Deliberately silent. This filter only ever *removes* a root it is certain
    // is hidden; anything it cannot answer is created exactly as it was before
    // the filter existed, so there is no new uncertainty to report. Most
    // identity conditions do not accept a force owner, so reporting here would
    // add dozens of diagnostics per roster that describe nothing the user can
    // act on — and an unreadable issue list is its own defect.
    return !visibility.ok || visibility.value.status !== "hidden";
  });
  const planned = planEmptySingleForceRootInitialization(visibleRoots);
  diagnostics.push(...planned.diagnostics);
  if (!planned.ok) {
    return failure(diagnostics);
  }
  for (const addition of planned.value.additions) {
    for (let index = 0; index < addition.quantity; index += 1) {
      const added = addLocalRosterRootSelectionUnreconciled(
        session,
        addition.root,
        {
          selectionId: input.createSelectionId(),
          createSelectionId: input.createSelectionId,
        },
      );
      diagnostics.push(...added.diagnostics);
      if (!added.ok) {
        return failure(diagnostics);
      }
      session = added.value;
    }
  }
  return success(session, diagnostics);
}

/**
 * Everything a restore needs that depends on the catalogue rather than on the
 * roster being restored.
 *
 * Building it is the whole cost of a restore: measured against the pinned
 * corpus, `restoreLocalRosterSession` took 19 ms for a 4-selection roster and
 * 19 ms for a 99-selection one, because it walks every root the catalogue
 * materializes before it looks at the roster at all. Restoring an undo history
 * one snapshot at a time would pay that per entry, so the plural form builds
 * this once.
 */
interface LocalRosterRestoreContext {
  readonly catalogue: LocalCatalogueChoice;
  readonly choiceIndex: ReadonlyMap<
    string,
    readonly BattleScribeRosterSelectionChoice[]
  >;
  readonly forceDefinitions: readonly BattleScribeForceDefinition[];
}

function createLocalRosterRestoreContext(
  catalogue: LocalCatalogueChoice,
): LocalRosterRestoreContext {
  return {
    catalogue,
    choiceIndex: indexSelectionChoices(catalogue),
    forceDefinitions: flattenForceDefinitions(
      catalogue.context.forces.definitions,
    ),
  };
}

/**
 * Rebuilds a session for each roster against one shared catalogue context.
 *
 * Used to restore a saved undo history, where every snapshot resolves against
 * the same catalogue. Fails as a unit: a history with one unrestorable snapshot
 * is not a history anyone can step through, so the caller gets the diagnostics
 * rather than a silently shortened stack.
 */
export function restoreLocalRosterSessions(
  catalogue: LocalCatalogueChoice,
  rosters: readonly Roster[],
): Result<readonly LocalRosterSession[]> {
  const context = createLocalRosterRestoreContext(catalogue);
  const sessions: LocalRosterSession[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const roster of rosters) {
    const restored = restoreWithContext(context, roster);
    diagnostics.push(...restored.diagnostics);
    if (!restored.ok) return failure(diagnostics);
    sessions.push(restored.value);
  }
  return success(sessions, diagnostics);
}

export function restoreLocalRosterSession(
  catalogue: LocalCatalogueChoice,
  roster: Roster,
): Result<LocalRosterSession> {
  return restoreWithContext(createLocalRosterRestoreContext(catalogue), roster);
}

function restoreWithContext(
  context: LocalRosterRestoreContext,
  roster: Roster,
): Result<LocalRosterSession> {
  const { catalogue } = context;
  const expectedCatalogue = rosterCatalogueReference(catalogue.context);
  if (
    roster.catalogue.key !== expectedCatalogue.key ||
    (roster.catalogue.sourceId !== undefined &&
      roster.catalogue.sourceId !== expectedCatalogue.sourceId)
  ) {
    return failure([
      restoreDiagnostic(
        catalogue,
        "WEB_ROSTER_DRAFT_CATALOGUE_MISMATCH",
        "The saved roster belongs to a different catalogue context.",
        {
          rosterCatalogueKey: roster.catalogue.key,
          contextCatalogueKey: expectedCatalogue.key,
        },
      ),
    ]);
  }

  const rootForce = roster.forces[0];
  if (
    roster.forces.length !== 1 ||
    rootForce === undefined ||
    rootForce.forces.length > 0
  ) {
    return failure([
      restoreDiagnostic(
        catalogue,
        "WEB_ROSTER_DRAFT_FORCE_STRUCTURE_UNSUPPORTED",
        "The saved roster force structure is not supported by the local editor.",
        {
          rootForceCount: roster.forces.length,
          nestedForceCount:
            rootForce === undefined ? 0 : countNestedForces(rootForce),
        },
      ),
    ]);
  }

  const forceDefinitions = context.forceDefinitions.filter(
    (definition) =>
      rosterDefinitionKeyForSource(
        definition.source.source.sourceId,
        definition.source.path,
      ) === rootForce.definition.key &&
      (rootForce.definition.sourceId === undefined ||
        rootForce.definition.sourceId === definition.source.id),
  );
  if (forceDefinitions.length !== 1) {
    return failure([
      restoreDiagnostic(
        catalogue,
        "WEB_ROSTER_DRAFT_FORCE_UNAVAILABLE",
        "The saved roster force definition is not uniquely available in the rebuilt catalogue context.",
        {
          forceId: rootForce.id,
          definitionKey: rootForce.definition.key,
          matches: forceDefinitions.length,
        },
      ),
    ]);
  }

  const selectionChoices = new Map<
    SelectionOccurrenceId,
    BattleScribeRosterSelectionChoice
  >();
  const diagnostics = restoreSelectionChoices(
    rootForce.selections,
    context.choiceIndex,
    selectionChoices,
    catalogue,
  );
  if (diagnostics.length > 0) return failure(diagnostics);

  return success({
    catalogue,
    forceDefinition: forceDefinitions[0]!,
    roster,
    selectionChoices,
  });
}

export function localRosterRootChoices(
  catalogue: LocalCatalogueChoice,
): readonly LocalRosterRootChoice[] {
  return catalogue.context.roots.roots.filter(isResolvedRootChoice);
}

export function localRosterRootChoiceGroups(
  catalogue: LocalCatalogueChoice,
): readonly LocalRosterRootChoiceGroup[] {
  const categoriesById = new Map<string, BattleScribeCategoryDefinition[]>();
  for (const category of catalogue.context.categories.definitions) {
    const id = category.source.id;
    if (id === undefined) continue;
    const existing = categoriesById.get(id);
    if (existing === undefined) {
      categoriesById.set(id, [category]);
    } else {
      existing.push(category);
    }
  }

  const groups: Array<{
    key: string;
    name: string;
    category?: BattleScribeCategoryDefinition;
    choices: LocalRosterRootChoice[];
  }> = [];
  const groupsByKey = new Map<string, (typeof groups)[number]>();
  for (const choice of localRosterRootChoices(catalogue)) {
    const primary = choice.materialized.categoryLinks.find(
      ({ primary }) => primary === true,
    );
    const matches =
      primary?.targetId === undefined
        ? []
        : (categoriesById.get(primary.targetId) ?? []);
    const category = matches.length === 1 ? matches[0] : undefined;
    const key =
      category === undefined
        ? "uncategorized"
        : JSON.stringify([
            category.source.source.sourceId,
            ...category.source.path,
          ]);
    let group = groupsByKey.get(key);
    if (group === undefined) {
      group =
        category === undefined
          ? {
              key,
              name: "Uncategorized",
              choices: [],
            }
          : {
              key,
              name:
                category.source.name ??
                category.source.id ??
                "Unnamed category",
              category,
              choices: [],
            };
      groups.push(group);
      groupsByKey.set(key, group);
    }
    group.choices.push(choice);
  }
  return groups;
}

export function inspectLocalRosterRootChoices(
  session: LocalRosterSession,
): Result<LocalRosterRootChoiceInspection> {
  const inspected = inspectEmptySingleForceRootChoices(
    session.catalogue.context.roots.roots,
  );
  if (!inspected.ok) return inspected;
  const byRoot = new Map(
    inspected.value.choices.map((choice) => [choice.root, choice]),
  );
  const force = session.roster.forces[0];
  const rootSelections = force?.selections ?? [];
  /**
   * A root the catalogue is currently hiding is not offered.
   *
   * This is what keeps `[Legends]` units out of the browser until `Show
   * Legends` is picked under `Show/Hide Options` — 72 of Death Guard's 137
   * roots, and the same behaviour BattleScribe and New Recruit have. It also
   * removes the deprecation notice that one catalogue ships as a selectable
   * upgrade: it hides itself once the force holds anything, which a force with
   * configuration slots always does.
   *
   * Same conservative rule as roster creation: only a root that is *certainly*
   * hidden is dropped. `Show/Hide Options` itself resolves as visible, so the
   * toggle that brings the rest back never disappears with them.
   */
  const offered = (choice: LocalRosterRootChoice): boolean => {
    if (force === undefined) return true;
    const visibility = evaluateRosterSelectionVisibility(
      session.roster,
      session.catalogue.context,
      force,
      choice.materialized,
    );
    return !visibility.ok || visibility.value.status !== "hidden";
  };
  const groups = localRosterRootChoiceGroups(session.catalogue)
    .map((group): LocalRosterRootChoiceGroupState => ({
      ...group,
      choices: group.choices.filter(offered).map((choice) => {
        const bound = byRoot.get(choice);
        return localRosterRootChoiceState(
          session,
          choice,
          rootSelections,
          bound,
        );
      }),
    }))
    .filter(({ choices }) => choices.length > 0);
  return success(
    {
      groups,
      completeness: inspected.value.completeness,
    },
    inspected.diagnostics,
  );
}

/**
 * The two whole-roster reports, cached per session.
 *
 * Both walk every selection, and both are pure functions of the session's
 * roster and catalogue context. A session is immutable — a command returns a
 * new one for any real change — so a cached report cannot describe a stale
 * roster.
 *
 * The case this is for is **undo and redo**. The history holds the session
 * objects themselves, so stepping back restores one that was already evaluated:
 * measured 2026-08-23, undo on a fifteen-unit Dark Angels army cost 308 ms of
 * re-evaluating a roster whose answers were already known.
 */
const localRosterCostReports = new WeakMap<
  LocalRosterSession,
  Result<RosterSelectionConditionCostReport>
>();

export function evaluateLocalRosterCosts(
  session: LocalRosterSession,
): Result<RosterSelectionConditionCostReport> {
  const cached = localRosterCostReports.get(session);
  if (cached !== undefined) return cached;
  const evaluated = evaluateRosterCostsWithSelectionConditions(
    session.roster,
    session.catalogue.context,
  );
  localRosterCostReports.set(session, evaluated);
  return evaluated;
}

export function inspectLocalRosterConstraints(
  session: LocalRosterSession,
): Result<LocalRosterConstraintInspection> {
  const selections = inspectRosterSelectionConstraintsInRoster(
    session.roster,
    session.catalogue.context,
    { inspectionScope: "selectionConditions" },
  );
  const forces = inspectRosterForceConstraintsInRoster(
    session.roster,
    session.catalogue.context,
    { inspectionScope: "conditions" },
  );
  const diagnostics = [...selections.diagnostics, ...forces.diagnostics];
  if (!selections.ok || !forces.ok) {
    return failure(diagnostics);
  }
  return success(
    {
      completeness:
        selections.value.completeness === "complete" &&
        forces.value.completeness === "complete"
          ? "complete"
          : "incomplete",
      selections: selections.value,
      forces: forces.value,
    },
    diagnostics,
  );
}

/**
 * Evaluates the display annotation decorating one exact roster selection name.
 *
 * This adapter resolves the selected occurrence and materialized choice only;
 * operation, applicability, and routing semantics stay in `evaluation`.
 */
export function inspectLocalRosterSelectionName(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
  baseName: string,
): Result<RosterSelectionAnnotationReport> {
  const occurrence = findRosterSelection(session.roster.forces, selectionId);
  const choice = session.selectionChoices.get(selectionId);
  if (occurrence === undefined || choice === undefined) {
    return failure([
      {
        code: "APP_ROSTER_NAME_SELECTION_UNAVAILABLE",
        message:
          "A selection name inspection requires a known roster selection occurrence and its materialized choice.",
        severity: "error",
        impacts: ["validation"],
        details: { selectionId },
      },
    ]);
  }
  return evaluateRosterSelectionName(
    session.roster,
    session.catalogue.context,
    occurrence,
    choice,
    baseName,
  );
}

export function inspectLocalRosterSelectionAnnotation(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): Result<RosterSelectionAnnotationReport> {
  const occurrence = findRosterSelection(session.roster.forces, selectionId);
  const choice = session.selectionChoices.get(selectionId);
  if (occurrence === undefined || choice === undefined) {
    return failure([
      {
        code: "APP_ROSTER_ANNOTATION_SELECTION_UNAVAILABLE",
        message:
          "A selection annotation inspection requires a known roster selection occurrence and its materialized choice.",
        severity: "error",
        impacts: ["validation"],
        details: { selectionId },
      },
    ]);
  }
  return evaluateRosterSelectionAnnotation(
    session.roster,
    session.catalogue.context,
    occurrence,
    choice,
  );
}

/**
 * Evaluates the displayed name, annotation, visibility, and characteristics
 * of every profile shown for one exact roster selection occurrence: its direct
 * profiles, its resolved profile info
 * links, and the profiles of its recursive info groups, in that render order.
 *
 * The reports are keyed by the exact profile object so the presentation layer
 * can look one up without re-deriving identity. This adapter adds no evaluation
 * semantics; it only supplies the occurrence and catalogue context.
 */
/**
 * Per-selection inspections, cached per session.
 *
 * Both are pure functions of `(session, selectionId)`, and a session is
 * immutable — a command returns a new one for any real change — so a cached
 * entry cannot describe a stale roster. This is the same argument, and the same
 * `WeakMap`-by-session shape, as the two whole-roster reports above.
 *
 * **What this is for is the datasheet being on the open-card path.** A card
 * opens itself whenever it contains a violation, and `containsAttention`
 * propagates recursively (`roster-workspace-model.ts:551`), so a roster under
 * construction can have most of its cards open at once. Characteristic
 * evaluation is not cheap at that volume: each profile costs four evaluator
 * calls, three of which run `collectAffectsRoutedModifiers`, which treats every
 * roster occurrence as a candidate declarer
 * (`packages/evaluation/src/characteristics.ts:1550`).
 *
 * **What this does not do is make an edit cheap.** An edit returns a new
 * session, so every open card misses and recomputes. This cache covers repeated
 * renders *within* one snapshot — opening a second card, local state changes,
 * hover — and undo/redo, which restores a session that was already evaluated.
 * The per-edit cost of many open datasheets is a separate problem; measure it
 * before assuming it needs solving.
 *
 * Cost: one `Map` per session snapshot, holding at most one entry per selection
 * occurrence that was actually inspected. Entries die with their session.
 */
const localRosterCharacteristicInspections = new WeakMap<
  LocalRosterSession,
  Map<SelectionOccurrenceId, Result<LocalRosterCharacteristicInspection>>
>();

const localRosterCategoryInspections = new WeakMap<
  LocalRosterSession,
  Map<SelectionOccurrenceId, Result<LocalRosterCategoryInspection>>
>();

function cachedBySelection<Value>(
  store: WeakMap<LocalRosterSession, Map<SelectionOccurrenceId, Value>>,
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
  compute: () => Value,
): Value {
  let bySelection = store.get(session);
  if (bySelection === undefined) {
    bySelection = new Map();
    store.set(session, bySelection);
  }
  const cached = bySelection.get(selectionId);
  // A miss and a stored `undefined` are indistinguishable through `get`, and
  // both inspections always return a `Result`, so `has` is not needed here.
  if (cached !== undefined) return cached;
  const computed = compute();
  bySelection.set(selectionId, computed);
  return computed;
}

/**
 * Resolves one occurrence's profile characteristics. See
 * {@link localRosterCharacteristicInspections} for the caching contract.
 */
export function inspectLocalRosterSelectionCharacteristics(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): Result<LocalRosterCharacteristicInspection> {
  return cachedBySelection(
    localRosterCharacteristicInspections,
    session,
    selectionId,
    () => computeSelectionCharacteristics(session, selectionId),
  );
}

/**
 * Resolves one occurrence's effective category membership. See
 * {@link localRosterCharacteristicInspections} for the caching contract.
 */
export function inspectLocalRosterSelectionCategories(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): Result<LocalRosterCategoryInspection> {
  return cachedBySelection(
    localRosterCategoryInspections,
    session,
    selectionId,
    () => computeSelectionCategories(session, selectionId),
  );
}

function computeSelectionCharacteristics(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): Result<LocalRosterCharacteristicInspection> {
  const occurrence = findRosterSelection(session.roster.forces, selectionId);
  const choice = session.selectionChoices.get(selectionId);
  if (occurrence === undefined || choice === undefined) {
    return failure([
      {
        code: "APP_ROSTER_CHARACTERISTIC_SELECTION_UNAVAILABLE",
        message:
          "A characteristic inspection requires a known roster selection occurrence and its materialized choice.",
        severity: "error",
        impacts: ["validation"],
        details: { selectionId },
      },
    ]);
  }

  const diagnostics: Diagnostic[] = [];
  const profiles: LocalRosterProfileCharacteristics[] = [];
  const byProfile = new Map<
    LocalRosterProfile,
    LocalRosterProfileCharacteristics
  >();
  let incomplete = false;

  const evaluate = (profile: LocalRosterProfile): void => {
    const report = evaluateRosterProfileCharacteristics(
      session.roster,
      session.catalogue.context,
      occurrence,
      profile,
    );
    const name = evaluateRosterProfileName(
      session.roster,
      session.catalogue.context,
      occurrence,
      profile,
      localRosterProfileBaseName(profile),
    );
    const visibility = evaluateRosterProfileVisibility(
      session.roster,
      session.catalogue.context,
      occurrence,
      profile,
    );
    const annotation = evaluateRosterProfileAnnotation(
      session.roster,
      session.catalogue.context,
      occurrence,
      profile,
    );
    diagnostics.push(
      ...report.diagnostics,
      ...name.diagnostics,
      ...visibility.diagnostics,
      ...annotation.diagnostics,
    );
    if (!report.ok || !name.ok || !visibility.ok || !annotation.ok) {
      incomplete = true;
      return;
    }
    const completeness: ValidationCompleteness =
      report.value.completeness === "complete" &&
      name.value.completeness === "complete" &&
      visibility.value.completeness === "complete" &&
      annotation.value.completeness === "complete"
        ? "complete"
        : "incomplete";
    const entry: LocalRosterProfileCharacteristics = {
      profile,
      report: report.value,
      name: name.value,
      visibility: visibility.value,
      annotation: annotation.value,
      completeness,
    };
    profiles.push(entry);
    byProfile.set(profile, entry);
    incomplete ||= completeness === "incomplete";
  };

  const visitInfoGroup = (group: MaterializedInfoGroup): void => {
    for (const profile of group.profiles) {
      evaluate(profile);
    }
    for (const link of group.materializedInfoLinks) {
      if (link.kind === "profileInfoLink") evaluate(link);
    }
    for (const nested of group.materializedInfoGroups) {
      visitInfoGroup(nested);
    }
    for (const link of group.materializedInfoLinks) {
      if (link.kind === "infoGroup") visitInfoGroup(link);
    }
  };

  for (const profile of choice.profiles) {
    evaluate(profile);
  }
  for (const link of choice.materializedInfoLinks) {
    if (link.kind === "profileInfoLink") evaluate(link);
  }
  for (const group of choice.materializedInfoGroups) {
    visitInfoGroup(group);
  }
  for (const link of choice.materializedInfoLinks) {
    if (link.kind === "infoGroup") visitInfoGroup(link);
  }

  return success(
    {
      completeness: incomplete ? "incomplete" : "complete",
      profiles,
      byProfile,
    },
    diagnostics,
  );
}

function localRosterProfileBaseName(profile: LocalRosterProfile): string {
  const name =
    "definition" in profile
      ? (profile.name ?? profile.definition.name)
      : profile.name;
  return name ?? "Unnamed profile";
}

/**
 * Resolves one occurrence's effective category membership into display-ready
 * keywords, naming each category from the composed catalogue definitions.
 *
 * Categories that no definition names keep their raw ID, so an unresolved
 * target stays visible rather than disappearing.
 */
function computeSelectionCategories(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): Result<LocalRosterCategoryInspection> {
  const occurrence = findRosterSelection(session.roster.forces, selectionId);
  const choice = session.selectionChoices.get(selectionId);
  if (occurrence === undefined || choice === undefined) {
    return failure([
      {
        code: "APP_ROSTER_CATEGORY_SELECTION_UNAVAILABLE",
        message:
          "A category inspection requires a known roster selection occurrence and its materialized choice.",
        severity: "error",
        impacts: ["validation"],
        details: { selectionId },
      },
    ]);
  }
  const evaluated = evaluateRosterSelectionCategories(
    session.roster,
    session.catalogue.context,
    occurrence,
    choice,
  );
  if (!evaluated.ok) {
    return failure(evaluated.diagnostics);
  }

  const names = new Map<string, string>();
  for (const definition of session.catalogue.context.categories.definitions) {
    const { id, name } = definition.source;
    if (id !== undefined && name !== undefined) {
      names.set(id, name);
    }
  }
  const report = evaluated.value;
  const describe = (
    id: ObjectId,
    added: boolean,
  ): LocalRosterCategoryEntry => ({
    id,
    name: names.get(id) ?? id,
    added,
    primary: report.primaryCategories?.includes(id) === true,
  });

  const effective = report.categories;
  return success(
    {
      report,
      ...(effective === undefined
        ? {}
        : {
            categories: effective.map((id) =>
              describe(id, !report.baseCategories.includes(id)),
            ),
          }),
      removed:
        effective === undefined
          ? []
          : report.baseCategories
              .filter((id) => !effective.includes(id))
              .map((id) => describe(id, false)),
      completeness: report.completeness,
    },
    evaluated.diagnostics,
  );
}

export function inspectLocalRosterStructuralStatus(
  session: LocalRosterSession,
): Result<EmptySingleForceRosterStructuralStatus> {
  return inspectEmptySingleForceRosterStructuralStatus(
    session.roster,
    session.catalogue.context,
    {
      materializationPartial: session.catalogue.materializationTruncated,
    },
  );
}

const localRosterValidations = new WeakMap<
  LocalRosterSession,
  Result<LocalRosterSupportedValidationInspection>
>();

/** Cached per session; see `localRosterCostReports` for why. */
export function inspectLocalRosterSupportedValidation(
  session: LocalRosterSession,
): Result<LocalRosterSupportedValidationInspection> {
  const cached = localRosterValidations.get(session);
  if (cached !== undefined) return cached;
  const inspected = inspectSupportedValidation(session);
  localRosterValidations.set(session, inspected);
  return inspected;
}

function inspectSupportedValidation(
  session: LocalRosterSession,
): Result<LocalRosterSupportedValidationInspection> {
  const structural = inspectLocalRosterStructuralStatus(session);
  const constraints = inspectLocalRosterConstraints(session);
  const diagnostics = [...structural.diagnostics, ...constraints.diagnostics];
  if (!structural.ok || !constraints.ok) {
    return failure(diagnostics);
  }
  const status = composeSupportedRosterValidation(
    structural.value,
    constraints.value.selections,
    constraints.value.forces,
  );
  diagnostics.push(...status.diagnostics);
  if (!status.ok) return failure(diagnostics);
  return success(
    {
      status: status.value,
      structural: structural.value,
      constraints: constraints.value,
      structuralDiagnostics: structural.diagnostics,
      constraintDiagnostics: constraints.diagnostics,
    },
    diagnostics,
  );
}

export function localRosterSelectionCount(session: LocalRosterSession): number {
  return session.roster.forces.reduce(
    (total, force) => total + countForceSelections(force),
    0,
  );
}

/**
 * Adds and initializes one root, then reconciles supported ordinary-entry and
 * group automatic bounds and newly required choices as one immutable action.
 */
export function addLocalRosterRootSelection(
  session: LocalRosterSession,
  choice: LocalRosterRootChoice,
  input: AddLocalRosterRootSelectionInput,
): Result<LocalRosterSession> {
  return reconcileEditedSession(
    addLocalRosterRootSelectionUnreconciled(session, choice, input),
    { ...input, preferredChoice: choice.materialized },
  );
}

function addLocalRosterRootSelectionUnreconciled(
  session: LocalRosterSession,
  choice: LocalRosterRootChoice,
  input: AddLocalRosterRootSelectionInput,
): Result<LocalRosterSession> {
  const force = session.roster.forces[0];
  if (force === undefined) {
    return failure([
      {
        code: "WEB_ROSTER_SESSION_FORCE_MISSING",
        message: "The local roster session has no starting force.",
        severity: "error",
        impacts: ["internal"],
        location: {
          source: session.catalogue.document.projection.source,
          path: session.catalogue.document.projection.path,
        },
      },
    ]);
  }
  const updated = addRosterSelectionToForceFromCatalogueContext(
    session.roster,
    session.catalogue.context,
    force.id,
    choice.materialized,
    {
      id: input.selectionId,
      ...(input.amount === undefined ? {} : { amount: input.amount }),
    },
  );
  if (!updated.ok) {
    return updated;
  }
  return initializeAddedSelection(
    session,
    updated.value,
    input.selectionId,
    choice.materialized,
    input.createSelectionId,
    updated.diagnostics,
  );
}

export function localRosterChildChoices(
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
): readonly BattleScribeRosterSelectionChoice[] {
  const parent = localRosterSelectionChoice(session, parentId);
  if (parent === undefined) return [];
  return [
    ...parent.selectionEntries,
    ...parent.selectionEntryGroups,
    ...parent.entryLinks.filter(isResolvedSelectionChoice),
  ];
}

export function inspectLocalRosterChildChoices(
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
): Result<LocalRosterChildChoiceInspection> {
  const parentChoice = localRosterSelectionChoice(session, parentId);
  const parent = findRosterSelection(session.roster.forces, parentId);
  if (parentChoice === undefined || parent === undefined) {
    return failure([
      {
        code: "WEB_ROSTER_CHILD_CHOICE_PARENT_UNAVAILABLE",
        message:
          "The roster selection and its catalogue definition are not both available.",
        severity: "error",
        impacts: ["internal"],
        location: {
          source: session.catalogue.document.projection.source,
          path: session.catalogue.document.projection.path,
        },
        details: {
          parentId,
          occurrenceAvailable: parent !== undefined,
          definitionAvailable: parentChoice !== undefined,
        },
      },
    ]);
  }
  const visibilityDiagnostics: Diagnostic[] = [];
  let visibilityIncomplete = false;
  const inspected = inspectRosterSelectionChildChoices(parentChoice, {
    include: (_choice, path) => {
      const visibility = evaluateRosterSelectionVisibilityPath(
        session.roster,
        session.catalogue.context,
        parent,
        path.slice(1),
      );
      visibilityDiagnostics.push(...visibility.diagnostics);
      if (!visibility.ok) {
        visibilityIncomplete = true;
        return true;
      }
      visibilityIncomplete ||= visibility.value.completeness === "incomplete";
      return visibility.value.status !== "hidden";
    },
  });
  if (!inspected.ok) {
    return inspected;
  }
  const diagnostics = [...visibilityDiagnostics, ...inspected.diagnostics];
  const groups = inspected.value.groups.map((group) => {
    const groupPath = selectionEntryGroupVisibilityPath(
      parentChoice,
      group.group,
    );
    const visibleChoices = group.choices.filter((choice) => {
      const visibility = evaluateRosterSelectionVisibilityPath(
        session.roster,
        session.catalogue.context,
        parent,
        [...groupPath, choice],
      );
      diagnostics.push(...visibility.diagnostics);
      if (!visibility.ok) {
        visibilityIncomplete = true;
        return true;
      }
      visibilityIncomplete ||= visibility.value.completeness === "incomplete";
      return visibility.value.status !== "hidden";
    });
    return localRosterChildChoiceGroup(session, parent, group, visibleChoices);
  });
  return success(
    {
      direct: inspected.value.direct.map((choice) =>
        localRosterDirectChildChoice(session, parent, choice),
      ),
      groups,
      completeness:
        inspected.value.completeness === "complete" && !visibilityIncomplete
          ? "complete"
          : "incomplete",
    },
    diagnostics,
  );
}

export function localRosterSelectionChoice(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): BattleScribeRosterSelectionChoice | undefined {
  return session.selectionChoices.get(selectionId);
}

/**
 * Adds and initializes one child, then reconciles supported ordinary-entry and
 * group automatic bounds and newly required choices as one immutable action.
 */
export function addLocalRosterChildSelection(
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
  choice: BattleScribeRosterSelectionChoice,
  input: AddLocalRosterRootSelectionInput,
): Result<LocalRosterSession> {
  return reconcileEditedSession(
    addLocalRosterChildSelectionUnreconciled(session, parentId, choice, input),
    { ...input, preferredChoice: choice },
  );
}

function addLocalRosterChildSelectionUnreconciled(
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
  choice: BattleScribeRosterSelectionChoice,
  input: AddLocalRosterRootSelectionInput,
): Result<LocalRosterSession> {
  const updated = addRosterSelectionToSelectionFromCatalogueContext(
    session.roster,
    session.catalogue.context,
    parentId,
    choice,
    {
      id: input.selectionId,
      ...(input.amount === undefined ? {} : { amount: input.amount }),
    },
  );
  if (!updated.ok) {
    return updated;
  }
  return initializeAddedSelection(
    session,
    updated.value,
    input.selectionId,
    choice,
    input.createSelectionId,
    updated.diagnostics,
  );
}

/**
 * Chooses one concrete group member, performing a max-one replacement plus
 * supported ordinary and group automatic repair as one immutable action.
 */
export function chooseLocalRosterChildGroupEntry(
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
  group: MaterializedSelectionEntryGroup,
  choice: BattleScribeRosterSelectionChoice,
  input: AddLocalRosterRootSelectionInput,
): Result<LocalRosterSession> {
  const inspected = inspectLocalRosterChildChoices(session, parentId);
  if (!inspected.ok) return inspected;
  const liveGroup = inspected.value.groups.find(
    (candidate) => candidate.group === group,
  );
  if (liveGroup === undefined || !liveGroup.choices.includes(choice)) {
    return failure([
      ...inspected.diagnostics,
      {
        code: "WEB_ROSTER_GROUP_CHOICE_UNAVAILABLE",
        message:
          "The requested entry is not available in the selected entry group.",
        severity: "error",
        impacts: ["internal"],
        location: {
          source: group.occurrence.source,
          path: group.occurrence.path,
        },
        details: {
          parentId,
          groupId: group.id,
          choiceId: choice.id,
        },
      },
    ]);
  }
  if (liveGroup.maximum === 0) {
    return failure([
      ...inspected.diagnostics,
      {
        code: "WEB_ROSTER_GROUP_CHOICE_MAXIMUM_ZERO",
        message: "The selected entry group currently permits no selections.",
        severity: "error",
        impacts: ["compatibility"],
        location: {
          source: group.occurrence.source,
          path: group.occurrence.path,
        },
        details: {
          parentId,
          groupId: group.id,
          choiceId: choice.id,
        },
      },
    ]);
  }

  const diagnostics = [...inspected.diagnostics];
  let working = session;
  if (liveGroup.maximum === 1) {
    const alreadySelected =
      rosterSelectionsAmount(liveGroup.selected) === 1 &&
      localRosterSelectionChoice(session, liveGroup.selected[0]!.id) === choice;
    if (alreadySelected) {
      return success(session, diagnostics);
    }
    for (const selected of liveGroup.selected) {
      const removed = removeLocalRosterSelectionUnreconciled(
        working,
        selected.id,
      );
      diagnostics.push(...removed.diagnostics);
      if (!removed.ok) {
        return failure(diagnostics);
      }
      working = removed.value;
    }
  }

  const added = addLocalRosterChildSelectionUnreconciled(
    working,
    parentId,
    choice,
    input,
  );
  diagnostics.push(...added.diagnostics);
  return added.ok
    ? reconcileEditedSession(success(added.value, diagnostics), {
        ...input,
        preferredChoice: choice,
      })
    : failure(diagnostics);
}

/**
 * Removes one subtree, then reconciles supported ordinary and group automatic
 * bounds. Supplying an ID factory lets a different absent choice become
 * selected in the same immutable action when the removal makes it required.
 */
export function removeLocalRosterSelection(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
  options: LocalRosterAutomaticReconciliationOptions = {},
): Result<LocalRosterSession> {
  const preferredChoice = localRosterSelectionChoice(session, selectionId);
  return reconcileEditedSession(
    removeLocalRosterSelectionUnreconciled(session, selectionId),
    {
      ...options,
      ...(preferredChoice === undefined ? {} : { preferredChoice }),
    },
  );
}

function removeLocalRosterSelectionUnreconciled(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
): Result<LocalRosterSession> {
  const removedIds = selectionSubtreeIds(session.roster.forces, selectionId);
  const updated = removeRosterSelection(session.roster, selectionId);
  if (!updated.ok) {
    return updated;
  }
  const selectionChoices = new Map(session.selectionChoices);
  for (const removedId of removedIds) {
    selectionChoices.delete(removedId);
  }
  return success(
    {
      ...session,
      roster: updated.value,
      selectionChoices,
    },
    updated.diagnostics,
  );
}

export function setLocalRosterSelectionName(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
  name: string | undefined,
): Result<LocalRosterSession> {
  const updated = setRosterSelectionName(session.roster, selectionId, name);
  if (!updated.ok) return updated;
  return success(
    {
      ...session,
      roster: updated.value,
    },
    updated.diagnostics,
  );
}

/**
 * Changes one quantity, then reconciles supported ordinary and group automatic
 * bounds. The returned session contains every repair so history and autosave
 * see one action.
 */
export function setLocalRosterSelectionAmount(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
  amount: number | undefined,
  options: LocalRosterAutomaticReconciliationOptions = {},
): Result<LocalRosterSession> {
  const preferredChoice = localRosterSelectionChoice(session, selectionId);
  return reconcileEditedSession(
    setLocalRosterSelectionAmountUnreconciled(session, selectionId, amount),
    {
      ...options,
      ...(preferredChoice === undefined ? {} : { preferredChoice }),
    },
  );
}

function setLocalRosterSelectionAmountUnreconciled(
  session: LocalRosterSession,
  selectionId: SelectionOccurrenceId,
  amount: number | undefined,
): Result<LocalRosterSession> {
  const updated = setRosterSelectionAmount(session.roster, selectionId, amount);
  if (!updated.ok) return updated;
  return success(
    {
      ...session,
      roster: updated.value,
    },
    updated.diagnostics,
  );
}

const localRosterAutomaticOperations = {
  addChild: addLocalRosterChildSelectionUnreconciled,
  removeSelection: removeLocalRosterSelectionUnreconciled,
  setAmount: setLocalRosterSelectionAmountUnreconciled,
};

function reconcileEditedSession(
  edited: Result<LocalRosterSession>,
  options: LocalRosterAutomaticReconciliationOptions = {},
): Result<LocalRosterSession> {
  return reconcileLocalRosterAutomaticConstraints(
    edited,
    localRosterAutomaticOperations,
    options,
  );
}
function isResolvedRootChoice(
  root: MaterializedVisibleRoot,
): root is LocalRosterRootChoice {
  return root.materialized.kind !== "unresolvedEntryLink";
}

function initializeAddedSelection(
  session: LocalRosterSession,
  roster: Roster,
  selectionId: SelectionOccurrenceId,
  choice: BattleScribeRosterSelectionChoice,
  createSelectionId: (() => SelectionOccurrenceId) | undefined,
  diagnostics: readonly Diagnostic[],
): Result<LocalRosterSession> {
  const selectionChoices = new Map(session.selectionChoices).set(
    selectionId,
    choice,
  );
  if (createSelectionId === undefined) {
    return success({ ...session, roster, selectionChoices }, diagnostics);
  }

  const planned = planRosterSelectionInitialization(choice);
  const allDiagnostics = [...diagnostics, ...planned.diagnostics];
  if (!planned.ok) {
    return failure(allDiagnostics);
  }
  const state: MutableSelectionInitialization = {
    roster,
    selectionChoices,
    diagnostics: allDiagnostics,
    probeSequence: 0,
  };
  const initialized = applySelectionInitialization(
    state,
    session,
    selectionId,
    planned.value,
    createSelectionId,
  );
  if (!initialized) {
    return failure(state.diagnostics);
  }
  return success(
    {
      ...session,
      roster: state.roster,
      selectionChoices: state.selectionChoices,
    },
    state.diagnostics,
  );
}

interface MutableSelectionInitialization {
  roster: Roster;
  readonly selectionChoices: Map<
    SelectionOccurrenceId,
    BattleScribeRosterSelectionChoice
  >;
  readonly diagnostics: Diagnostic[];
  probeSequence: number;
}

function applySelectionInitialization(
  state: MutableSelectionInitialization,
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
  plan: RosterSelectionInitializationPlan,
  createSelectionId: () => SelectionOccurrenceId,
): boolean {
  for (const addition of plan.additions) {
    for (let index = 0; index < addition.quantity; index += 1) {
      const amount = effectiveInitializationAmount(
        state,
        session,
        parentId,
        addition,
      );
      if (amount === false) return false;
      if (amount === 0) continue;

      const selectionId = createSelectionId();
      const added = addRosterSelectionToSelectionFromCatalogueContext(
        state.roster,
        session.catalogue.context,
        parentId,
        addition.choice,
        {
          id: selectionId,
          ...(amount === undefined || amount === 1 ? {} : { amount }),
        },
      );
      state.diagnostics.push(...added.diagnostics);
      if (!added.ok) {
        return false;
      }
      state.roster = added.value;
      state.selectionChoices.set(selectionId, addition.choice);
      if (
        !applySelectionInitialization(
          state,
          session,
          selectionId,
          addition.initialization,
          createSelectionId,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function effectiveInitializationAmount(
  state: MutableSelectionInitialization,
  session: LocalRosterSession,
  parentId: SelectionOccurrenceId,
  addition: RosterSelectionInitializationPlan["additions"][number],
): number | undefined | false {
  if (
    addition.amount === undefined ||
    addition.choice.kind !== "selectionEntry" ||
    !selectionTargetsDefaultAmount(addition.choice)
  ) {
    return addition.amount;
  }

  let probeId: SelectionOccurrenceId;
  do {
    state.probeSequence += 1;
    probeId = selectionOccurrenceId(
      `__rosterforge-initialization-probe-${state.probeSequence}`,
    );
  } while (findRosterSelection(state.roster.forces, probeId) !== undefined);

  // Modifier conditions need the prospective entry at its real parent. The
  // throwaway immutable roster supplies that anchor without consuming a caller
  // ID or leaking a probe occurrence into the durable session or choice map.
  // This costs one extra immutable add and lookup only for a stepped entry with
  // a defaultAmount modifier; the pinned 46-file corpus has exactly one such
  // entry, so ordinary initialization never pays for the probe.
  const probe = addRosterSelectionToSelectionFromCatalogueContext(
    state.roster,
    session.catalogue.context,
    parentId,
    addition.choice,
    {
      id: probeId,
      ...(addition.amount === 0 ? {} : { amount: addition.amount }),
    },
  );
  state.diagnostics.push(...probe.diagnostics);
  if (!probe.ok) return false;
  const owner = findRosterSelection(probe.value.forces, probeId);
  if (owner === undefined) return false;

  const inspected = inspectRosterSelectionDefaultAmount(
    probe.value,
    session.catalogue.context,
    owner,
    addition.choice,
  );
  state.diagnostics.push(...inspected.diagnostics);
  if (
    !inspected.ok ||
    inspected.value.completeness !== "complete" ||
    inspected.value.amount === undefined
  ) {
    return addition.amount;
  }
  return Math.max(addition.minimumAmount ?? 0, inspected.value.amount);
}

function selectionTargetsDefaultAmount(
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  return (
    choice.modifiers.some(({ field }) => field === "defaultAmount") ||
    choice.modifierGroups.some((group) =>
      modifierGroupTargetsDefaultAmount(group),
    )
  );
}

function modifierGroupTargetsDefaultAmount(
  group: BattleScribeRosterSelectionChoice["modifierGroups"][number],
): boolean {
  return (
    group.modifiers.some(({ field }) => field === "defaultAmount") ||
    group.modifierGroups.some(modifierGroupTargetsDefaultAmount)
  );
}

function isResolvedSelectionChoice(
  choice:
    | BattleScribeRosterSelectionChoice
    | {
        readonly kind: "unresolvedEntryLink";
      },
): choice is BattleScribeRosterSelectionChoice {
  return choice.kind !== "unresolvedEntryLink";
}

function localRosterChildChoiceGroup(
  session: LocalRosterSession,
  parent: RosterSelection,
  inspection: RosterSelectionChoiceGroupInspection,
  visibleChoices: readonly BattleScribeRosterSelectionChoice[] = inspection.choices,
): LocalRosterChildChoiceGroup {
  const selected = parent.selections.filter((selection) => {
    const choice = localRosterSelectionChoice(session, selection.id);
    return choice !== undefined && inspection.choices.includes(choice);
  });
  return {
    group: inspection.group,
    choices: visibleChoices,
    hiddenChoiceCount: inspection.choices.length - visibleChoices.length,
    ...(inspection.minimum === undefined
      ? {}
      : {
          minimum: inspection.minimum,
          remaining: Math.max(
            0,
            inspection.minimum - rosterSelectionsAmount(selected),
          ),
        }),
    ...(inspection.maximum === undefined
      ? {}
      : { maximum: inspection.maximum }),
    selected,
    completeness: inspection.completeness,
  };
}

function localRosterRootChoiceState(
  session: LocalRosterSession,
  choice: LocalRosterRootChoice,
  rootSelections: readonly RosterSelection[],
  inspection: EmptySingleForceRootChoiceInspection | undefined,
): LocalRosterRootChoiceState {
  const identity = inspection?.identity;
  const selected = rootSelections.filter((selection) => {
    const selectedChoice = localRosterSelectionChoice(session, selection.id);
    if (selectedChoice === undefined) return false;
    return identity === undefined
      ? selectedChoice === choice.materialized
      : rootBoundIdentitiesEqual(
          identity,
          rootSelectionBoundIdentity(selectedChoice),
        );
  });
  return {
    choice,
    selected,
    ...(inspection?.minimum === undefined
      ? {}
      : {
          minimum: inspection.minimum,
          remaining: Math.max(
            0,
            inspection.minimum - rosterSelectionsAmount(selected),
          ),
        }),
    ...(inspection?.maximum === undefined
      ? {}
      : { maximum: inspection.maximum }),
    completeness: inspection?.completeness ?? "incomplete",
  };
}

function rootBoundIdentitiesEqual(
  left: EmptySingleForceRootBoundIdentity,
  right: EmptySingleForceRootBoundIdentity | undefined,
): boolean {
  return (
    right !== undefined && left.kind === right.kind && left.id === right.id
  );
}

function localRosterDirectChildChoice(
  session: LocalRosterSession,
  parent: RosterSelection,
  inspection: RosterSelectionDirectChoiceInspection,
): LocalRosterDirectChildChoice {
  const selected = parent.selections.filter(
    (selection) =>
      localRosterSelectionChoice(session, selection.id) === inspection.choice,
  );
  return {
    choice: inspection.choice,
    ...(inspection.minimum === undefined
      ? {}
      : {
          minimum: inspection.minimum,
          remaining: Math.max(
            0,
            inspection.minimum - rosterSelectionsAmount(selected),
          ),
        }),
    ...(inspection.maximum === undefined
      ? {}
      : { maximum: inspection.maximum }),
    selected,
    completeness: inspection.completeness,
  };
}

function flattenForceDefinitions(
  definitions: readonly BattleScribeForceDefinition[],
): readonly BattleScribeForceDefinition[] {
  return definitions.flatMap((definition) => [
    definition,
    ...flattenForceDefinitions(definition.forceEntries),
  ]);
}

function indexSelectionChoices(
  catalogue: LocalCatalogueChoice,
): ReadonlyMap<string, readonly BattleScribeRosterSelectionChoice[]> {
  const index = new Map<string, BattleScribeRosterSelectionChoice[]>();
  for (const root of catalogue.context.roots.roots) {
    if (root.materialized.kind === "unresolvedEntryLink") continue;
    indexSelectionChoice(root.materialized, index);
  }
  return index;
}

function indexSelectionChoice(
  choice: BattleScribeRosterSelectionChoice,
  index: Map<string, BattleScribeRosterSelectionChoice[]>,
): void {
  const key = rosterDefinitionKeyForSource(
    choice.occurrence.source.sourceId,
    choice.occurrence.path,
  );
  const existing = index.get(key);
  if (existing === undefined) {
    index.set(key, [choice]);
  } else if (
    !existing.some(
      (candidate) =>
        candidate.kind === choice.kind &&
        candidate.occurrence === choice.occurrence,
    )
  ) {
    existing.push(choice);
  }
  for (const child of [
    ...choice.selectionEntries,
    ...choice.selectionEntryGroups,
    ...choice.entryLinks.filter(isResolvedSelectionChoice),
  ]) {
    indexSelectionChoice(child, index);
  }
}

function restoreSelectionChoices(
  selections: readonly RosterSelection[],
  index: ReadonlyMap<string, readonly BattleScribeRosterSelectionChoice[]>,
  restored: Map<SelectionOccurrenceId, BattleScribeRosterSelectionChoice>,
  catalogue: LocalCatalogueChoice,
): readonly ReturnType<typeof restoreDiagnostic>[] {
  const diagnostics: ReturnType<typeof restoreDiagnostic>[] = [];
  for (const selection of selections) {
    const matches = (index.get(selection.definition.key) ?? []).filter(
      (choice) => selectionDefinitionMatches(selection.definition, choice),
    );
    if (matches.length !== 1) {
      diagnostics.push(
        restoreDiagnostic(
          catalogue,
          matches.length === 0
            ? "WEB_ROSTER_DRAFT_SELECTION_UNAVAILABLE"
            : "WEB_ROSTER_DRAFT_SELECTION_AMBIGUOUS",
          matches.length === 0
            ? "A saved roster selection is not available in the rebuilt catalogue context."
            : "A saved roster selection matches more than one rebuilt catalogue choice.",
          {
            selectionId: selection.id,
            definitionKey: selection.definition.key,
            matches: matches.length,
          },
        ),
      );
    } else {
      restored.set(selection.id, matches[0]!);
    }
    diagnostics.push(
      ...restoreSelectionChoices(
        selection.selections,
        index,
        restored,
        catalogue,
      ),
    );
  }
  return diagnostics;
}

function selectionDefinitionMatches(
  reference: RosterSelectionDefinitionReference,
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  return (
    reference.kind === choice.kind &&
    (reference.sourceId === undefined || reference.sourceId === choice.id)
  );
}

function countNestedForces(force: RosterForce): number {
  return force.forces.reduce(
    (total, child) => total + 1 + countNestedForces(child),
    0,
  );
}

function restoreDiagnostic(
  catalogue: LocalCatalogueChoice,
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
) {
  return {
    code,
    message,
    severity: "error" as const,
    impacts: ["persistence" as const],
    location: {
      source: catalogue.document.projection.source,
      path: catalogue.document.projection.path,
    },
    details,
  };
}

function selectionSubtreeIds(
  forces: Roster["forces"],
  targetId: SelectionOccurrenceId,
): ReadonlySet<SelectionOccurrenceId> {
  for (const force of forces) {
    const found = findSelectionSubtree(force.selections, targetId);
    if (found !== undefined) return found;
    const nested = selectionSubtreeIds(force.forces, targetId);
    if (nested.size > 0) return nested;
  }
  return new Set();
}

function findRosterSelection(
  forces: Roster["forces"],
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
    const child = findRosterSelectionInList(selection.selections, targetId);
    if (child !== undefined) return child;
  }
  return undefined;
}

function findSelectionSubtree(
  selections: readonly RosterSelection[],
  targetId: SelectionOccurrenceId,
): ReadonlySet<SelectionOccurrenceId> | undefined {
  for (const selection of selections) {
    if (selection.id === targetId) {
      return collectSelectionIds(selection);
    }
    const nested = findSelectionSubtree(selection.selections, targetId);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function collectSelectionIds(
  selection: RosterSelection,
): ReadonlySet<SelectionOccurrenceId> {
  const ids = new Set<SelectionOccurrenceId>([selection.id]);
  for (const child of selection.selections) {
    for (const id of collectSelectionIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

function countForceSelections(force: Roster["forces"][number]): number {
  return (
    countSelections(force.selections) +
    force.forces.reduce(
      (total, childForce) => total + countForceSelections(childForce),
      0,
    )
  );
}

function countSelections(selections: readonly RosterSelection[]): number {
  return selections.reduce(
    (total, selection) =>
      total +
      rosterSelectionAmount(selection) +
      countSelections(selection.selections),
    0,
  );
}
