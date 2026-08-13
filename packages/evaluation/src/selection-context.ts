import type {
  BattleScribeCatalogueContext,
  MaterializedEntryLink,
  MaterializedSelectionEntry,
  MaterializedSelectionEntryGroup,
} from "@rosterforge/data-graph";

import { objectId, type ObjectId } from "@rosterforge/foundation";

import {
  rosterDefinitionKeyForSource,
  type Roster,
  type RosterDefinitionKey,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

export type EvaluationSelectionChoice =
  | MaterializedSelectionEntry
  | MaterializedSelectionEntryGroup;

export type EvaluationSelectionStatus =
  | "resolved"
  | "unavailable"
  | "ambiguous"
  | "unresolved";

export interface EvaluationChoiceIndex {
  readonly byKey: ReadonlyMap<
    RosterDefinitionKey,
    readonly EvaluationSelectionChoice[]
  >;
  readonly partial: boolean;
}

export interface EvaluationSelectionResolution {
  readonly occurrence: RosterSelection;
  readonly status: EvaluationSelectionStatus;
  readonly choices: readonly EvaluationSelectionChoice[];
}

export type EvaluationSelectionScope =
  | "self"
  | "parent"
  | "ancestor"
  | "root-entry"
  | "unit"
  | "model"
  | "model-or-unit"
  | "upgrade"
  | "force"
  | "roster";

export type EvaluationSelectionCandidateStatus =
  | "match"
  | "different"
  | "unresolved";

export interface EvaluationSelectionIdentityCandidate {
  readonly occurrence: RosterSelection;
  readonly resolution: EvaluationSelectionResolution;
  readonly status: EvaluationSelectionCandidateStatus;
  readonly effectiveIds: readonly ObjectId[];
}

export interface RosterSelectionLocation {
  readonly occurrence: RosterSelection;
  readonly parent: RosterForce | RosterSelection;
  readonly force: RosterForce;
  readonly ancestors: readonly RosterSelection[];
  readonly root: RosterSelection;
}

export function expectedCatalogueKey(
  context: BattleScribeCatalogueContext,
): RosterDefinitionKey {
  return rosterDefinitionKeyForSource(
    context.document.projection.source.sourceId,
    context.document.projection.path,
  );
}

export function rosterMatchesCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): boolean {
  return roster.catalogue.key === expectedCatalogueKey(context);
}

export function indexEvaluationChoices(
  context: BattleScribeCatalogueContext,
): EvaluationChoiceIndex {
  const byKey = new Map<
    RosterDefinitionKey,
    EvaluationSelectionChoice[]
  >();
  let partial = false;

  const visit = (choice: MaterializedEntryLink): void => {
    if (choice.kind === "unresolvedEntryLink") {
      partial ||= choice.reason === "resourceLimit";
      return;
    }
    const key = rosterDefinitionKeyForSource(
      choice.occurrence.source.sourceId,
      choice.occurrence.path,
    );
    const candidates = byKey.get(key);
    if (candidates === undefined) {
      byKey.set(key, [choice]);
    } else if (
      !candidates.some(
        (candidate) =>
          candidate.kind === choice.kind &&
          candidate.occurrence === choice.occurrence,
      )
    ) {
      candidates.push(choice);
    }
    for (const child of choice.selectionEntries) {
      visit(child);
    }
    for (const child of choice.selectionEntryGroups) {
      visit(child);
    }
    for (const child of choice.entryLinks) {
      visit(child);
    }
  };

  for (const root of context.roots.roots) {
    visit(root.materialized);
  }
  return { byKey, partial };
}

export function resolveEvaluationSelection(
  occurrence: RosterSelection,
  choices: EvaluationChoiceIndex,
  catalogueMatches: boolean,
): EvaluationSelectionResolution {
  const candidates = catalogueMatches
    ? (choices.byKey.get(occurrence.definition.key) ?? []).filter(
        (choice) => choice.kind === occurrence.definition.kind,
      )
    : [];
  return {
    occurrence,
    status: resolutionStatus(candidates, choices.partial, catalogueMatches),
    choices: candidates,
  };
}

export function rosterSelectionLocations(
  roster: Roster,
): readonly RosterSelectionLocation[] {
  const locations: RosterSelectionLocation[] = [];

  const visitSelection = (
    occurrence: RosterSelection,
    parent: RosterForce | RosterSelection,
    force: RosterForce,
    ancestors: readonly RosterSelection[],
    root: RosterSelection,
  ): void => {
    locations.push({ occurrence, parent, force, ancestors, root });
    for (const child of occurrence.selections) {
      visitSelection(child, occurrence, force, [occurrence, ...ancestors], root);
    }
  };
  const visitForce = (force: RosterForce): void => {
    for (const occurrence of force.selections) {
      visitSelection(occurrence, force, force, [], occurrence);
    }
    for (const child of force.forces) {
      visitForce(child);
    }
  };

  for (const force of roster.forces) {
    visitForce(force);
  }
  return locations;
}

export function evaluationSelectionIdentityCandidate(
  occurrence: RosterSelection,
  choices: EvaluationChoiceIndex,
  catalogueMatches: boolean,
  targetId: ObjectId | undefined,
  shared: boolean,
): EvaluationSelectionIdentityCandidate {
  const resolution = resolveEvaluationSelection(
    occurrence,
    choices,
    catalogueMatches,
  );
  const identities = resolution.choices.map((choice) => {
    const effectiveIds = selectionChoiceIdentityIds(choice, shared);
    return {
      effectiveIds,
      matches:
        targetId !== undefined &&
        (targetId === objectId("any") || effectiveIds.includes(targetId)),
    };
  });
  const effectiveIds = uniqueIds(
    identities.flatMap((identity) => identity.effectiveIds),
  );
  const matches = identities.map((identity) => identity.matches);
  const status = targetId === undefined
    ? "unresolved"
    : resolution.status !== "resolved" || matches.length !== 1
      ? consistentCandidateStatus(matches)
      : matches[0]
        ? "match"
        : "different";
  return { occurrence, resolution, status, effectiveIds };
}

export function evaluationSelectionScope(
  roster: Roster,
  owner: RosterSelectionLocation,
  scope: EvaluationSelectionScope,
  includeChildSelections: boolean,
  includeChildForces: boolean,
  typedScope?: RosterSelection,
): readonly RosterSelection[] {
  if (scope === "self") {
    return selectionsInTree([owner.occurrence], includeChildSelections);
  }
  if (scope === "parent") {
    return selectionsBelowParent(
      owner.parent,
      includeChildSelections,
      includeChildForces,
    );
  }
  if (scope === "ancestor") {
    return owner.ancestors;
  }
  if (scope === "root-entry") {
    return selectionsInTree([owner.root], includeChildSelections);
  }
  if (
    scope === "unit" ||
    scope === "model" ||
    scope === "model-or-unit" ||
    scope === "upgrade"
  ) {
    return typedScope === undefined
      ? []
      : selectionsInTree([typedScope], includeChildSelections);
  }
  if (scope === "force") {
    return selectionsInForces(
      [owner.force],
      includeChildSelections,
      includeChildForces,
    );
  }
  return selectionsInForces(
    roster.forces,
    includeChildSelections,
    includeChildForces,
  );
}

export function evaluationSelectionTree(
  occurrence: RosterSelection,
  includeChildSelections: boolean,
): readonly RosterSelection[] {
  return selectionsInTree([occurrence], includeChildSelections);
}

export function evaluationSelectionsInForces(
  forces: readonly RosterForce[],
  includeChildSelections: boolean,
  includeChildForces: boolean,
): readonly RosterSelection[] {
  return selectionsInForces(
    forces,
    includeChildSelections,
    includeChildForces,
  );
}

function selectionChoiceIdentityIds(
  choice: EvaluationSelectionChoice,
  shared: boolean,
): readonly ObjectId[] {
  const selectionId = shared ? choice.definitionId : choice.id;
  return uniqueIds([
    ...(selectionId === undefined ? [] : [selectionId]),
    ...choice.categoryLinks.flatMap((link) =>
      link.targetId === undefined ? [] : [link.targetId],
    ),
    ...(choice.kind === "selectionEntry" && choice.type !== undefined
      ? [objectId(choice.type)]
      : []),
  ]);
}

function uniqueIds(ids: readonly ObjectId[]): readonly ObjectId[] {
  return [...new Set(ids)];
}

function consistentCandidateStatus(
  matches: readonly boolean[],
): EvaluationSelectionCandidateStatus {
  if (matches.length === 0) {
    return "unresolved";
  }
  if (matches.every(Boolean)) {
    return "match";
  }
  if (matches.every((value) => !value)) {
    return "different";
  }
  return "unresolved";
}

function selectionsBelowParent(
  parent: RosterForce | RosterSelection,
  includeChildSelections: boolean,
  includeChildForces: boolean,
): readonly RosterSelection[] {
  const selections = selectionsInTree(
    parent.selections,
    includeChildSelections,
  );
  if (!("forces" in parent) || !includeChildForces) {
    return selections;
  }
  return [
    ...selections,
    ...selectionsInForces(
      parent.forces,
      includeChildSelections,
      includeChildForces,
    ),
  ];
}

function selectionsInForces(
  forces: readonly RosterForce[],
  includeChildSelections: boolean,
  includeChildForces: boolean,
): readonly RosterSelection[] {
  return forces.flatMap((force) => [
    ...selectionsInTree(force.selections, includeChildSelections),
    ...(includeChildForces
      ? selectionsInForces(
          force.forces,
          includeChildSelections,
          includeChildForces,
        )
      : []),
  ]);
}

function selectionsInTree(
  selections: readonly RosterSelection[],
  includeChildren: boolean,
): readonly RosterSelection[] {
  if (!includeChildren) {
    return selections;
  }
  return selections.flatMap((selection) => [
    selection,
    ...selectionsInTree(selection.selections, true),
  ]);
}

function resolutionStatus(
  candidates: readonly EvaluationSelectionChoice[],
  partial: boolean,
  catalogueMatches: boolean,
): EvaluationSelectionStatus {
  if (!catalogueMatches) {
    return "unresolved";
  }
  if (candidates.length === 1) {
    return "resolved";
  }
  if (candidates.length > 1) {
    return "ambiguous";
  }
  return partial ? "unresolved" : "unavailable";
}
