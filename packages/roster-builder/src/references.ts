import {
  failure,
  type Diagnostic,
  type ObjectId,
  type Result,
} from "@rosterforge/foundation";

import type {
  BattleScribeCatalogueContext,
  BattleScribeForceDefinition,
  MaterializedEntryLink,
  MaterializedSelectionEntry,
  MaterializedSelectionEntryGroup,
} from "@rosterforge/data-graph";

import {
  addRosterChildForce,
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
  createRoster,
  replaceRosterForceDefinition,
  replaceRosterSelectionDefinition,
  rosterDefinitionKeyForSource,
  type AddRosterForceInput,
  type AddRosterSelectionInput,
  type ForceOccurrenceId,
  type Roster,
  type RosterCatalogueReference,
  type RosterForceDefinitionReference,
  type RosterId,
  type RosterSelectionDefinitionReference,
  type SelectionOccurrenceId,
} from "@rosterforge/roster-model";

export type BattleScribeRosterSelectionChoice =
  | MaterializedSelectionEntry
  | MaterializedSelectionEntryGroup;

export interface CreateRosterFromCatalogueInput {
  readonly id: RosterId;
  readonly name: string;
}

export interface AddForceFromCatalogueInput {
  readonly id: AddRosterForceInput["id"];
  readonly name?: string;
}

export interface AddSelectionFromCatalogueInput {
  readonly id: AddRosterSelectionInput["id"];
  readonly name?: string;
  readonly amount?: number;
}

interface ProjectedSource {
  readonly source: {
    readonly sourceId: string;
  };
  readonly path: readonly string[];
  readonly id?: ObjectId;
}

export function rosterCatalogueReference(
  context: BattleScribeCatalogueContext,
): RosterCatalogueReference {
  return {
    kind: "catalogue",
    key: keyForSource(context.document.projection),
    sourceId: context.document.metadata.id,
  };
}

export function rosterForceDefinitionReference(
  definition: BattleScribeForceDefinition,
): RosterForceDefinitionReference {
  return {
    kind: "forceEntry",
    key: keyForSource(definition.source),
    ...(definition.source.id === undefined
      ? {}
      : { sourceId: definition.source.id }),
  };
}

export function rosterSelectionDefinitionReference(
  choice: BattleScribeRosterSelectionChoice,
): RosterSelectionDefinitionReference {
  return {
    kind: choice.kind,
    key: keyForSource(choice.occurrence),
    ...(choice.id === undefined ? {} : { sourceId: choice.id }),
  };
}

export function createRosterFromCatalogueContext(
  context: BattleScribeCatalogueContext,
  input: CreateRosterFromCatalogueInput,
): Roster {
  return createRoster({
    ...input,
    catalogue: rosterCatalogueReference(context),
  });
}

export function addRosterForceFromCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  definition: BattleScribeForceDefinition,
  input: AddForceFromCatalogueInput,
): Result<Roster> {
  const guarded = guardForce(roster, context, definition);
  if (guarded !== undefined) {
    return failure([guarded]);
  }
  return addRosterForce(roster, forceInput(definition, input));
}

export function addRosterChildForceFromCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  parentId: ForceOccurrenceId,
  definition: BattleScribeForceDefinition,
  input: AddForceFromCatalogueInput,
): Result<Roster> {
  const guarded = guardForce(roster, context, definition);
  if (guarded !== undefined) {
    return failure([guarded]);
  }
  return addRosterChildForce(
    roster,
    parentId,
    forceInput(definition, input),
  );
}

export function addRosterSelectionToForceFromCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  parentId: ForceOccurrenceId,
  choice: BattleScribeRosterSelectionChoice,
  input: AddSelectionFromCatalogueInput,
): Result<Roster> {
  const guarded = guardSelection(roster, context, choice);
  if (guarded !== undefined) {
    return failure([guarded]);
  }
  return addRosterSelectionToForce(
    roster,
    parentId,
    selectionInput(choice, input),
  );
}

export function addRosterSelectionToSelectionFromCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  parentId: SelectionOccurrenceId,
  choice: BattleScribeRosterSelectionChoice,
  input: AddSelectionFromCatalogueInput,
): Result<Roster> {
  const guarded = guardSelection(roster, context, choice);
  if (guarded !== undefined) {
    return failure([guarded]);
  }
  return addRosterSelectionToSelection(
    roster,
    parentId,
    selectionInput(choice, input),
  );
}

export function replaceRosterForceDefinitionFromCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  id: ForceOccurrenceId,
  definition: BattleScribeForceDefinition,
): Result<Roster> {
  const guarded = guardForce(roster, context, definition);
  if (guarded !== undefined) {
    return failure([guarded]);
  }
  return replaceRosterForceDefinition(
    roster,
    id,
    rosterForceDefinitionReference(definition),
  );
}

export function replaceRosterSelectionDefinitionFromCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  id: SelectionOccurrenceId,
  choice: BattleScribeRosterSelectionChoice,
): Result<Roster> {
  const guarded = guardSelection(roster, context, choice);
  if (guarded !== undefined) {
    return failure([guarded]);
  }
  return replaceRosterSelectionDefinition(
    roster,
    id,
    rosterSelectionDefinitionReference(choice),
  );
}

function guardForce(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  definition: BattleScribeForceDefinition,
): Diagnostic | undefined {
  const mismatch = contextMismatchDiagnostic(roster, context);
  if (mismatch !== undefined) {
    return mismatch;
  }
  if (!hasForceDefinition(context.forces.definitions, definition.source)) {
    return unavailableForceDiagnostic(definition);
  }
  return undefined;
}

function guardSelection(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  choice: BattleScribeRosterSelectionChoice,
): Diagnostic | undefined {
  const mismatch = contextMismatchDiagnostic(roster, context);
  if (mismatch !== undefined) {
    return mismatch;
  }
  if (!hasSelectionChoice(context, choice)) {
    return unavailableSelectionDiagnostic(choice);
  }
  return undefined;
}

function contextMismatchDiagnostic(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Diagnostic | undefined {
  const expected = rosterCatalogueReference(context);
  if (roster.catalogue.key === expected.key) {
    return undefined;
  }
  return {
    code: "ROSTER_BUILDER_CATALOGUE_CONTEXT_MISMATCH",
    message: "The roster belongs to a different catalogue context.",
    severity: "error",
    impacts: ["resolution"],
    location: {
      source: context.document.projection.source,
      path: context.document.projection.path,
    },
    details: {
      rosterCatalogueKey: roster.catalogue.key,
      contextCatalogueKey: expected.key,
    },
  };
}

function hasForceDefinition(
  definitions: readonly BattleScribeForceDefinition[],
  source: BattleScribeForceDefinition["source"],
): boolean {
  return definitions.some(
    (definition) =>
      definition.source === source ||
      hasForceDefinition(definition.forceEntries, source),
  );
}

function hasSelectionChoice(
  context: BattleScribeCatalogueContext,
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  return context.roots.roots.some((root) =>
    hasMaterializedChoice(root.materialized, choice),
  );
}

function hasMaterializedChoice(
  candidate: MaterializedEntryLink,
  choice: BattleScribeRosterSelectionChoice,
): boolean {
  if (candidate.kind === "unresolvedEntryLink") {
    return false;
  }
  if (
    candidate.kind === choice.kind &&
    candidate.occurrence === choice.occurrence &&
    candidate.definition === choice.definition
  ) {
    return true;
  }
  return (
    candidate.selectionEntries.some((entry) =>
      hasMaterializedChoice(entry, choice),
    ) ||
    candidate.selectionEntryGroups.some((group) =>
      hasMaterializedChoice(group, choice),
    ) ||
    candidate.entryLinks.some((entryLink) =>
      hasMaterializedChoice(entryLink, choice),
    )
  );
}

function forceInput(
  definition: BattleScribeForceDefinition,
  input: AddForceFromCatalogueInput,
): AddRosterForceInput {
  return {
    id: input.id,
    definition: rosterForceDefinitionReference(definition),
    ...effectiveName(input.name, definition.source.name),
  };
}

function selectionInput(
  choice: BattleScribeRosterSelectionChoice,
  input: AddSelectionFromCatalogueInput,
): AddRosterSelectionInput {
  return {
    id: input.id,
    definition: rosterSelectionDefinitionReference(choice),
    ...effectiveName(input.name, choice.name),
    ...(input.amount === undefined ? {} : { amount: input.amount }),
  };
}

function effectiveName(
  override: string | undefined,
  fallback: string | undefined,
): { readonly name?: string } {
  const name = override === undefined ? fallback : override;
  return name === undefined ? {} : { name };
}

function keyForSource(source: ProjectedSource) {
  return rosterDefinitionKeyForSource(
    source.source.sourceId,
    source.path,
  );
}

function unavailableForceDiagnostic(
  definition: BattleScribeForceDefinition,
): Diagnostic {
  return {
    code: "ROSTER_BUILDER_FORCE_NOT_AVAILABLE",
    message: `Force definition ${definition.source.id ?? definition.source.name ?? "without an ID"} is not available in this catalogue context.`,
    severity: "error",
    impacts: ["resolution"],
    location: {
      source: definition.source.source,
      path: definition.source.path,
    },
    details: { sourceId: definition.source.id },
  };
}

function unavailableSelectionDiagnostic(
  choice: BattleScribeRosterSelectionChoice,
): Diagnostic {
  return {
    code: "ROSTER_BUILDER_SELECTION_NOT_AVAILABLE",
    message: `Selection definition ${choice.id ?? choice.name ?? "without an ID"} is not available in this catalogue context.`,
    severity: "error",
    impacts: ["resolution"],
    location: {
      source: choice.occurrence.source,
      path: choice.occurrence.path,
    },
    details: { sourceId: choice.id, kind: choice.kind },
  };
}
