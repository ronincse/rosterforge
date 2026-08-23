import type {
  BattleScribeCatalogueContext,
} from "@rosterforge/data-graph";

import {
  success,
  type Diagnostic,
  type Result,
  type ValidationCompleteness,
  type ValidationStatus,
} from "@rosterforge/foundation";

import {
  rosterDefinitionKeyForSource,
  rosterSelectionAmount,
  type Roster,
  type RosterForce,
  type RosterSelection,
  type RosterSelectionDefinitionReference,
} from "@rosterforge/roster-model";

import {
  inspectEmptySingleForceRootChoices,
  inspectRosterSelectionChildChoices,
  rootSelectionBoundIdentity,
  type EmptySingleForceRootBoundIdentity,
  type EmptySingleForceRootChoiceInspection,
  type EmptySingleForceRootInitializationChoice,
  type RosterSelectionChoiceGroupInspection,
  type RosterSelectionDirectChoiceInspection,
} from "./initialization.js";
import {
  indexEvaluationChoices,
  rosterMatchesCatalogueContext,
  type EvaluationSelectionChoice,
  type EvaluationSelectionResolution,
} from "./selection-context.js";
import {
  evaluateRosterSelectionVisibilityPath,
} from "./selection-visibility.js";

export type RosterStructuralBoundStatus =
  | "satisfied"
  | "violated"
  | "unresolved";

interface RosterStructuralBoundReportBase {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly selected: readonly RosterSelection[];
  readonly selectedCount: number;
  readonly possibleSelectedCount: number;
  readonly status: RosterStructuralBoundStatus;
  readonly completeness: ValidationCompleteness;
}

export interface RosterStructuralRootBoundReport
  extends RosterStructuralBoundReportBase {
  readonly kind: "root";
  readonly force: RosterForce;
  readonly root: EmptySingleForceRootInitializationChoice;
}

export interface RosterStructuralDirectBoundReport
  extends RosterStructuralBoundReportBase {
  readonly kind: "direct";
  readonly owner: RosterSelection;
  readonly choice: EvaluationSelectionChoice;
}

export interface RosterStructuralGroupBoundReport
  extends RosterStructuralBoundReportBase {
  readonly kind: "group";
  readonly owner: RosterSelection;
  readonly group: RosterSelectionChoiceGroupInspection["group"];
  readonly choices: readonly EvaluationSelectionChoice[];
}

export type RosterStructuralBoundReport =
  | RosterStructuralRootBoundReport
  | RosterStructuralDirectBoundReport
  | RosterStructuralGroupBoundReport;

export interface EmptySingleForceRosterStructuralStatus
  extends ValidationStatus {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly bounds: readonly RosterStructuralBoundReport[];
}

export interface RosterStructuralStatusOptions {
  readonly materializationPartial?: boolean;
}

type CandidateMembership = "match" | "different" | "unresolved";

interface StructuralInspectionState {
  readonly diagnostics: Diagnostic[];
  incomplete: boolean;
}

export function inspectEmptySingleForceRosterStructuralStatus(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  options: RosterStructuralStatusOptions = {},
): Result<EmptySingleForceRosterStructuralStatus> {
  const state: StructuralInspectionState = {
    diagnostics: [],
    incomplete: false,
  };
  const force = supportedSingleForce(roster, context, state);
  if (force === undefined) {
    return structuralStatus(roster, context, [], state);
  }

  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  if (!catalogueMatches) {
    markIncomplete(
      state,
      structuralDiagnostic(
        context,
        "EVALUATION_STRUCTURAL_STATUS_CATALOGUE_MISMATCH",
        "The roster does not refer to the catalogue being used for structural inspection.",
        {
          rosterCatalogueKey: roster.catalogue.key,
        },
      ),
    );
  }

  const materializationPartial =
    options.materializationPartial ??
    indexEvaluationChoices(context).partial;
  if (materializationPartial) {
    markIncomplete(
      state,
      structuralDiagnostic(
        context,
        "EVALUATION_STRUCTURAL_STATUS_CHOICE_INDEX_PARTIAL",
        "The catalogue choice index is partial, so some roster selections cannot be structurally inspected.",
      ),
    );
  }
  const bounds: RosterStructuralBoundReport[] = [];
  const rootCandidates = context.roots.roots.flatMap((root) =>
    root.materialized.kind === "unresolvedEntryLink"
      ? []
      : [root.materialized],
  );
  const resolutions = new Map<
    RosterSelection,
    EvaluationSelectionResolution
  >();
  for (const occurrence of force.selections) {
    const resolution = resolveSelectionFromCandidates(
      occurrence,
      rootCandidates,
      catalogueMatches,
      materializationPartial,
    );
    resolutions.set(occurrence, resolution);
    if (
      resolution.status !== "resolved" ||
      resolution.choices.length !== 1
    ) {
      markIncomplete(
        state,
        unresolvedSelectionDiagnostic(context, occurrence, resolution),
      );
    }
  }
  let inactiveIncompleteRoots = 0;
  let inactiveDiagnosticCount = 0;
  for (const root of context.roots.roots) {
    const rootInspection = inspectEmptySingleForceRootChoices([root]);
    if (!rootInspection.ok) {
      state.incomplete = true;
      state.diagnostics.push(...rootInspection.diagnostics);
      continue;
    }
    const inspection = rootInspection.value.choices[0];
    if (inspection === undefined) continue;
    const report = rootBoundReport(
      force,
      inspection,
      resolutions,
      catalogueMatches,
    );
    if (isRelevantRootBound(inspection, report)) {
      state.diagnostics.push(...rootInspection.diagnostics);
      if (rootInspection.value.completeness === "incomplete") {
        state.incomplete = true;
      }
      bounds.push(report);
    } else if (
      rootInspection.value.completeness === "incomplete" ||
      rootInspection.diagnostics.length > 0
    ) {
      inactiveIncompleteRoots += 1;
      inactiveDiagnosticCount += rootInspection.diagnostics.length;
    }
  }
  if (inactiveIncompleteRoots > 0) {
    state.diagnostics.push(
      structuralDiagnostic(
        context,
        "EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED",
        "Some inactive root choices have unsupported dynamic bounds; they remain catalogue-level diagnostics until selected.",
        {
          roots: inactiveIncompleteRoots,
          suppressedDiagnostics: inactiveDiagnosticCount,
        },
      ),
    );
  }

  for (const occurrence of force.selections) {
    const resolution = resolutions.get(occurrence);
    if (
      resolution?.status === "resolved" &&
      resolution.choices.length === 1
    ) {
      inspectSelectionTree(
        roster,
        occurrence,
        resolution.choices[0]!,
        context,
        catalogueMatches,
        materializationPartial,
        bounds,
        state,
      );
    }
  }

  if (
    bounds.some(({ completeness }) => completeness === "incomplete")
  ) {
    state.incomplete = true;
  }
  return structuralStatus(roster, context, bounds, state);
}

function inspectSelectionTree(
  roster: Roster,
  owner: RosterSelection,
  ownerChoice: EvaluationSelectionChoice,
  context: BattleScribeCatalogueContext,
  catalogueMatches: boolean,
  choiceIndexPartial: boolean,
  bounds: RosterStructuralBoundReport[],
  state: StructuralInspectionState,
): void {
  const childInspection = inspectRosterSelectionChildChoices(ownerChoice, {
    include: (_choice, path) =>
      isStructurallyVisible(
        roster,
        context,
        owner,
        path.slice(1),
        state,
      ),
  });
  state.diagnostics.push(...childInspection.diagnostics);
  if (!childInspection.ok) {
    state.incomplete = true;
    return;
  }
  const childCandidates = uniqueChoices([
    ...childInspection.value.direct.map(({ choice }) => choice),
    ...childInspection.value.groups.flatMap(({ choices }) => choices),
  ]);
  const childResolutions = owner.selections.map((selection) => {
    const resolution = resolveSelectionFromCandidates(
      selection,
      childCandidates,
      catalogueMatches,
      choiceIndexPartial,
    );
    if (
      resolution.status !== "resolved" ||
      resolution.choices.length !== 1
    ) {
      markIncomplete(
        state,
        unresolvedSelectionDiagnostic(context, selection, resolution),
      );
    }
    return { selection, resolution };
  });

  for (const direct of childInspection.value.direct) {
    if (!isRelevantBound(direct)) continue;
    bounds.push(directBoundReport(owner, direct, childResolutions));
  }
  for (const group of childInspection.value.groups) {
    if (!isRelevantBound(group)) continue;
    bounds.push(groupBoundReport(owner, group, childResolutions));
  }
  for (const child of childResolutions) {
    if (
      child.resolution.status === "resolved" &&
      child.resolution.choices.length === 1
    ) {
      inspectSelectionTree(
        roster,
        child.selection,
        child.resolution.choices[0]!,
        context,
        catalogueMatches,
        choiceIndexPartial,
        bounds,
        state,
      );
    }
  }
}

function isStructurallyVisible(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  choices: readonly EvaluationSelectionChoice[],
  state: StructuralInspectionState,
): boolean {
  const visibility = evaluateRosterSelectionVisibilityPath(
    roster,
    context,
    owner,
    choices,
  );
  state.diagnostics.push(...visibility.diagnostics);
  if (!visibility.ok) {
    state.incomplete = true;
    return false;
  }
  if (visibility.value.completeness === "incomplete") {
    state.incomplete = true;
  }
  return visibility.value.status === "visible";
}

function resolveSelectionFromCandidates(
  occurrence: RosterSelection,
  candidates: readonly EvaluationSelectionChoice[],
  catalogueMatches: boolean,
  candidatesPartial: boolean,
): EvaluationSelectionResolution {
  const matches = catalogueMatches
    ? candidates.filter((choice) =>
        selectionDefinitionMatches(occurrence.definition, choice),
      )
    : [];
  return {
    occurrence,
    status:
      matches.length === 1
        ? "resolved"
        : matches.length > 1
          ? "ambiguous"
          : catalogueMatches && !candidatesPartial
            ? "unavailable"
            : "unresolved",
    choices: matches,
  };
}

function selectionDefinitionMatches(
  definition: RosterSelectionDefinitionReference,
  choice: EvaluationSelectionChoice,
): boolean {
  return (
    definition.kind === choice.kind &&
    definition.key ===
      rosterDefinitionKeyForSource(
        choice.occurrence.source.sourceId,
        choice.occurrence.path,
      ) &&
    (definition.sourceId === undefined ||
      definition.sourceId === choice.id)
  );
}

function uniqueChoices(
  choices: readonly EvaluationSelectionChoice[],
): readonly EvaluationSelectionChoice[] {
  return choices.filter(
    (choice, index) => choices.indexOf(choice) === index,
  );
}

function supportedSingleForce(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  state: StructuralInspectionState,
): RosterForce | undefined {
  const force = roster.forces[0];
  if (
    roster.forces.length === 1 &&
    force !== undefined &&
    force.forces.length === 0
  ) {
    return force;
  }
  markIncomplete(
    state,
    structuralDiagnostic(
      context,
      "EVALUATION_STRUCTURAL_STATUS_FORCE_STRUCTURE_UNSUPPORTED",
      "Structural status currently supports exactly one root force and no nested forces.",
      {
        rootForceCount: roster.forces.length,
        nestedForceCount:
          force === undefined ? 0 : countNestedForces(force),
      },
    ),
  );
  return undefined;
}

function rootBoundReport(
  force: RosterForce,
  inspection: EmptySingleForceRootChoiceInspection,
  resolutions: ReadonlyMap<
    RosterSelection,
    EvaluationSelectionResolution
  >,
  catalogueMatches: boolean,
): RosterStructuralRootBoundReport {
  const selected: RosterSelection[] = [];
  const uncertain: RosterSelection[] = [];
  for (const occurrence of force.selections) {
    const membership = rootMembership(
      resolutions.get(occurrence),
      inspection.root,
      inspection.identity,
    );
    if (membership === "match") selected.push(occurrence);
    if (membership === "unresolved") uncertain.push(occurrence);
  }
  const report = boundState(
    inspection.minimum,
    inspection.maximum,
    selected,
    uncertain,
    inspection.completeness,
    catalogueMatches,
  );
  return {
    kind: "root",
    force,
    root: inspection.root,
    ...report,
  };
}

function directBoundReport(
  owner: RosterSelection,
  inspection: RosterSelectionDirectChoiceInspection,
  children: readonly {
    readonly selection: RosterSelection;
    readonly resolution: EvaluationSelectionResolution | undefined;
  }[],
): RosterStructuralDirectBoundReport {
  const membership = childMembership(
    children,
    (choice) => choice === inspection.choice,
  );
  return {
    kind: "direct",
    owner,
    choice: inspection.choice,
    ...boundState(
      inspection.minimum,
      inspection.maximum,
      membership.selected,
      membership.uncertain,
      inspection.completeness,
      true,
    ),
  };
}

function groupBoundReport(
  owner: RosterSelection,
  inspection: RosterSelectionChoiceGroupInspection,
  children: readonly {
    readonly selection: RosterSelection;
    readonly resolution: EvaluationSelectionResolution | undefined;
  }[],
): RosterStructuralGroupBoundReport {
  // A group whose children are groups still bounds what is chosen beneath it,
  // so membership counts nested entries as well as its own.
  const membership = childMembership(
    children,
    (choice) => inspection.countedChoices.includes(choice),
  );
  return {
    kind: "group",
    owner,
    group: inspection.group,
    choices: inspection.choices,
    ...boundState(
      inspection.minimum,
      inspection.maximum,
      membership.selected,
      membership.uncertain,
      inspection.completeness,
      true,
    ),
  };
}

function childMembership(
  children: readonly {
    readonly selection: RosterSelection;
    readonly resolution: EvaluationSelectionResolution | undefined;
  }[],
  matches: (choice: EvaluationSelectionChoice) => boolean,
): {
  readonly selected: readonly RosterSelection[];
  readonly uncertain: readonly RosterSelection[];
} {
  const selected: RosterSelection[] = [];
  const uncertain: RosterSelection[] = [];
  for (const child of children) {
    const membership = candidateMembership(child.resolution, matches);
    if (membership === "match") selected.push(child.selection);
    if (membership === "unresolved") uncertain.push(child.selection);
  }
  return { selected, uncertain };
}

function rootMembership(
  resolution: EvaluationSelectionResolution | undefined,
  root: EmptySingleForceRootInitializationChoice,
  identity: EmptySingleForceRootBoundIdentity | undefined,
): CandidateMembership {
  return candidateMembership(resolution, (choice) =>
    identity === undefined
      ? choice === root.materialized
      : rootBoundIdentitiesEqual(
          identity,
          rootSelectionBoundIdentity(choice),
        ),
  );
}

function candidateMembership(
  resolution: EvaluationSelectionResolution | undefined,
  matches: (choice: EvaluationSelectionChoice) => boolean,
): CandidateMembership {
  if (resolution === undefined || resolution.choices.length === 0) {
    return "unresolved";
  }
  const candidates = resolution.choices.map(matches);
  if (candidates.every(Boolean)) return "match";
  if (candidates.every((candidate) => !candidate)) return "different";
  return "unresolved";
}

function boundState(
  minimum: number | undefined,
  maximum: number | undefined,
  selected: readonly RosterSelection[],
  uncertain: readonly RosterSelection[],
  completeness: ValidationCompleteness,
  contextAvailable: boolean,
): RosterStructuralBoundReportBase {
  const selectedAmounts = selectionAmountBounds(selected);
  const uncertainAmounts = selectionAmountBounds(uncertain);
  const selectedCount = selectedAmounts.minimum;
  const possibleSelectedCount =
    selectedAmounts.maximum === Number.POSITIVE_INFINITY ||
    uncertainAmounts.maximum === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : selectedAmounts.maximum + uncertainAmounts.maximum;
  return {
    ...(minimum === undefined ? {} : { minimum }),
    ...(maximum === undefined ? {} : { maximum }),
    selected,
    selectedCount,
    possibleSelectedCount,
    status: boundStatus(
      minimum,
      maximum,
      selectedCount,
      possibleSelectedCount,
    ),
    completeness:
      completeness === "complete" &&
      uncertain.length === 0 &&
      selectedAmounts.exact &&
      uncertainAmounts.exact &&
      contextAvailable
        ? "complete"
        : "incomplete",
  };
}

function selectionAmountBounds(selections: readonly RosterSelection[]): {
  readonly minimum: number;
  readonly maximum: number;
  readonly exact: boolean;
} {
  let minimum = 0;
  for (const selection of selections) {
    const amount = rosterSelectionAmount(selection);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        minimum,
        maximum: Number.POSITIVE_INFINITY,
        exact: false,
      };
    }
    minimum += amount;
  }
  return { minimum, maximum: minimum, exact: true };
}

function boundStatus(
  minimum: number | undefined,
  maximum: number | undefined,
  selectedCount: number,
  possibleSelectedCount: number,
): RosterStructuralBoundStatus {
  if (minimum === undefined || maximum === undefined) {
    return "unresolved";
  }
  if (
    possibleSelectedCount < minimum ||
    selectedCount > maximum
  ) {
    return "violated";
  }
  if (
    selectedCount >= minimum &&
    possibleSelectedCount <= maximum
  ) {
    return "satisfied";
  }
  return "unresolved";
}

function isRelevantBound(bound: {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly completeness: ValidationCompleteness;
}): boolean {
  return (
    bound.completeness === "incomplete" ||
    (bound.minimum !== undefined && bound.minimum > 0) ||
    (bound.maximum !== undefined &&
      bound.maximum !== Number.POSITIVE_INFINITY)
  );
}

function isRelevantRootBound(
  inspection: EmptySingleForceRootChoiceInspection,
  report: RosterStructuralRootBoundReport,
): boolean {
  return (
    (inspection.minimum !== undefined && inspection.minimum > 0) ||
    (inspection.maximum !== undefined &&
      inspection.maximum !== Number.POSITIVE_INFINITY) ||
    (inspection.completeness === "incomplete" &&
      report.selectedCount > 0)
  );
}

function structuralStatus(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  bounds: readonly RosterStructuralBoundReport[],
  state: StructuralInspectionState,
): Result<EmptySingleForceRosterStructuralStatus> {
  const diagnostics = uniqueDiagnostics(state.diagnostics);
  return success(
    {
      roster,
      context,
      bounds,
      validity: bounds.some(({ status }) => status === "violated")
        ? "invalid"
        : "valid",
      completeness:
        state.incomplete ||
        bounds.some(
          ({ completeness }) => completeness === "incomplete",
        )
          ? "incomplete"
          : "complete",
    },
    diagnostics,
  );
}

function uniqueDiagnostics(
  diagnostics: readonly Diagnostic[],
): readonly Diagnostic[] {
  const keys = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = JSON.stringify([
      diagnostic.code,
      diagnostic.location?.source.sourceId,
      diagnostic.location?.path,
      diagnostic.details,
    ]);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function unresolvedSelectionDiagnostic(
  context: BattleScribeCatalogueContext,
  selection: RosterSelection,
  resolution: EvaluationSelectionResolution | undefined,
): Diagnostic {
  return structuralDiagnostic(
    context,
    "EVALUATION_STRUCTURAL_STATUS_SELECTION_UNRESOLVED",
    "A roster selection definition is not uniquely available for structural inspection.",
    {
      selectionId: selection.id,
      definitionKey: selection.definition.key,
      resolutionStatus: resolution?.status ?? "unavailable",
      matches: resolution?.choices.length ?? 0,
    },
  );
}

function structuralDiagnostic(
  context: BattleScribeCatalogueContext,
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["validation", "compatibility"],
    location: {
      source: context.document.projection.source,
      path: context.document.projection.path,
    },
    ...(details === undefined ? {} : { details }),
  };
}

function markIncomplete(
  state: StructuralInspectionState,
  diagnostic: Diagnostic,
): void {
  state.incomplete = true;
  state.diagnostics.push(diagnostic);
}

function rootBoundIdentitiesEqual(
  left: EmptySingleForceRootBoundIdentity,
  right: EmptySingleForceRootBoundIdentity | undefined,
): boolean {
  return (
    right !== undefined &&
    left.kind === right.kind &&
    left.id === right.id
  );
}

function countNestedForces(force: RosterForce): number {
  return force.forces.reduce(
    (count, child) => count + 1 + countNestedForces(child),
    0,
  );
}
