import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from "@rosterforge/foundation";

import type {
  ForceOccurrenceId,
  Roster,
  RosterCatalogueReference,
  RosterForce,
  RosterForceDefinitionReference,
  RosterId,
  RosterSelection,
  RosterSelectionDefinitionReference,
  SelectionOccurrenceId,
} from "./types.js";

export interface CreateRosterInput {
  readonly id: RosterId;
  readonly name: string;
  readonly catalogue: RosterCatalogueReference;
}

export interface AddRosterForceInput {
  readonly id: ForceOccurrenceId;
  readonly definition: RosterForceDefinitionReference;
  readonly name?: string;
}

export interface AddRosterSelectionInput {
  readonly id: SelectionOccurrenceId;
  readonly definition: RosterSelectionDefinitionReference;
  readonly name?: string;
  readonly amount?: number;
}

export interface DuplicateRosterSelectionIds {
  readonly selectionId: (
    sourceId: SelectionOccurrenceId,
  ) => SelectionOccurrenceId;
}

export interface DuplicateRosterForceIds
  extends DuplicateRosterSelectionIds {
  readonly forceId: (sourceId: ForceOccurrenceId) => ForceOccurrenceId;
}

export type RosterForceDestination =
  | { readonly kind: "root"; readonly index: number }
  | {
      readonly kind: "force";
      readonly parentId: ForceOccurrenceId;
      readonly index: number;
    };

export type RosterSelectionDestination =
  | {
      readonly kind: "force";
      readonly parentId: ForceOccurrenceId;
      readonly index: number;
    }
  | {
      readonly kind: "selection";
      readonly parentId: SelectionOccurrenceId;
      readonly index: number;
    };

type ForceParent =
  | { readonly kind: "root" }
  | { readonly kind: "force"; readonly id: ForceOccurrenceId };

type SelectionParent =
  | { readonly kind: "force"; readonly id: ForceOccurrenceId }
  | { readonly kind: "selection"; readonly id: SelectionOccurrenceId };

interface ForceLocation {
  readonly force: RosterForce;
  readonly parent: ForceParent;
  readonly index: number;
}

interface SelectionLocation {
  readonly selection: RosterSelection;
  readonly parent: SelectionParent;
  readonly index: number;
}

interface ForceUpdate {
  readonly found: boolean;
  readonly forces: readonly RosterForce[];
}

interface SelectionUpdate {
  readonly found: boolean;
  readonly forces: readonly RosterForce[];
}

interface SelectionTreeUpdate {
  readonly found: boolean;
  readonly selections: readonly RosterSelection[];
}

interface ForceReorder {
  readonly status: "missing" | "invalidIndex" | "unchanged" | "changed";
  readonly forces: readonly RosterForce[];
  readonly siblingCount?: number;
}

interface SelectionReorder {
  readonly status: "missing" | "invalidIndex" | "unchanged" | "changed";
  readonly forces: readonly RosterForce[];
  readonly siblingCount?: number;
}

interface SelectionTreeReorder {
  readonly status: "missing" | "invalidIndex" | "unchanged" | "changed";
  readonly selections: readonly RosterSelection[];
  readonly siblingCount?: number;
}

export function createRoster(input: CreateRosterInput): Roster {
  return { ...input, forces: [] };
}

export function addRosterForce(
  roster: Roster,
  input: AddRosterForceInput,
): Result<Roster> {
  if (hasForce(roster.forces, input.id)) {
    return failure([duplicateForceDiagnostic(input.id)]);
  }
  return success({
    ...roster,
    forces: [...roster.forces, createForce(input)],
  });
}

export function addRosterChildForce(
  roster: Roster,
  parentId: ForceOccurrenceId,
  input: AddRosterForceInput,
): Result<Roster> {
  if (hasForce(roster.forces, input.id)) {
    return failure([duplicateForceDiagnostic(input.id)]);
  }
  const update = appendChildForce(
    roster.forces,
    parentId,
    createForce(input),
  );
  if (!update.found) {
    return failure([missingForceDiagnostic(parentId)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function addRosterSelectionToForce(
  roster: Roster,
  parentId: ForceOccurrenceId,
  input: AddRosterSelectionInput,
): Result<Roster> {
  if (!validSelectionAmount(input.amount)) {
    return failure([invalidSelectionAmountDiagnostic(input.id, input.amount)]);
  }
  if (hasSelectionInForces(roster.forces, input.id)) {
    return failure([duplicateSelectionDiagnostic(input.id)]);
  }
  const update = appendSelectionToForce(
    roster.forces,
    parentId,
    createSelection(input),
  );
  if (!update.found) {
    return failure([missingForceDiagnostic(parentId)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function addRosterSelectionToSelection(
  roster: Roster,
  parentId: SelectionOccurrenceId,
  input: AddRosterSelectionInput,
): Result<Roster> {
  if (!validSelectionAmount(input.amount)) {
    return failure([invalidSelectionAmountDiagnostic(input.id, input.amount)]);
  }
  if (hasSelectionInForces(roster.forces, input.id)) {
    return failure([duplicateSelectionDiagnostic(input.id)]);
  }
  const update = appendSelectionToSelectionInForces(
    roster.forces,
    parentId,
    createSelection(input),
  );
  if (!update.found) {
    return failure([missingSelectionDiagnostic(parentId)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function renameRoster(roster: Roster, name: string): Roster {
  return { ...roster, name };
}

export function setRosterForceName(
  roster: Roster,
  id: ForceOccurrenceId,
  name: string | undefined,
): Result<Roster> {
  const update = updateForceName(roster.forces, id, name);
  if (!update.found) {
    return failure([missingForceOccurrenceDiagnostic(id)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function setRosterSelectionName(
  roster: Roster,
  id: SelectionOccurrenceId,
  name: string | undefined,
): Result<Roster> {
  const update = updateSelectionNameInForces(roster.forces, id, name);
  if (!update.found) {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function setRosterSelectionAmount(
  roster: Roster,
  id: SelectionOccurrenceId,
  amount: number | undefined,
): Result<Roster> {
  if (!validSelectionAmount(amount)) {
    return failure([invalidSelectionAmountDiagnostic(id, amount)]);
  }
  const update = updateSelectionAmountInForces(roster.forces, id, amount);
  if (!update.found) {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }
  return success(
    update.forces === roster.forces
      ? roster
      : { ...roster, forces: update.forces },
  );
}

export function replaceRosterForceDefinition(
  roster: Roster,
  id: ForceOccurrenceId,
  definition: RosterForceDefinitionReference,
): Result<Roster> {
  const update = updateForceDefinition(roster.forces, id, definition);
  if (!update.found) {
    return failure([missingForceOccurrenceDiagnostic(id)]);
  }
  return success(
    update.forces === roster.forces
      ? roster
      : { ...roster, forces: update.forces },
  );
}

export function replaceRosterSelectionDefinition(
  roster: Roster,
  id: SelectionOccurrenceId,
  definition: RosterSelectionDefinitionReference,
): Result<Roster> {
  const update = updateSelectionDefinitionInForces(
    roster.forces,
    id,
    definition,
  );
  if (!update.found) {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }
  return success(
    update.forces === roster.forces
      ? roster
      : { ...roster, forces: update.forces },
  );
}

export function removeRosterForce(
  roster: Roster,
  id: ForceOccurrenceId,
): Result<Roster> {
  const update = removeForce(roster.forces, id);
  if (!update.found) {
    return failure([missingForceOccurrenceDiagnostic(id)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function removeRosterSelection(
  roster: Roster,
  id: SelectionOccurrenceId,
): Result<Roster> {
  const update = removeSelectionInForces(roster.forces, id);
  if (!update.found) {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }
  return success({ ...roster, forces: update.forces });
}

export function moveRosterForce(
  roster: Roster,
  id: ForceOccurrenceId,
  toIndex: number,
): Result<Roster> {
  const update = reorderForce(roster.forces, id, toIndex);
  if (update.status === "missing") {
    return failure([missingForceOccurrenceDiagnostic(id)]);
  }
  if (update.status === "invalidIndex") {
    return failure([
      invalidReorderIndexDiagnostic(
        "force",
        id,
        toIndex,
        update.siblingCount ?? 0,
      ),
    ]);
  }
  return success(
    update.status === "unchanged"
      ? roster
      : { ...roster, forces: update.forces },
  );
}

export function moveRosterSelection(
  roster: Roster,
  id: SelectionOccurrenceId,
  toIndex: number,
): Result<Roster> {
  const update = reorderSelectionInForces(roster.forces, id, toIndex);
  if (update.status === "missing") {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }
  if (update.status === "invalidIndex") {
    return failure([
      invalidReorderIndexDiagnostic(
        "selection",
        id,
        toIndex,
        update.siblingCount ?? 0,
      ),
    ]);
  }
  return success(
    update.status === "unchanged"
      ? roster
      : { ...roster, forces: update.forces },
  );
}

export function duplicateRosterForce(
  roster: Roster,
  id: ForceOccurrenceId,
  ids: DuplicateRosterForceIds,
): Result<Roster> {
  const source = findForce(roster.forces, id);
  if (source === undefined) {
    return failure([missingForceOccurrenceDiagnostic(id)]);
  }

  const duplication = duplicateForceSubtree(roster, source, ids);
  if (duplication.diagnostics.length > 0) {
    return failure(duplication.diagnostics);
  }

  const update = insertForceAfter(roster.forces, id, duplication.force);
  return success({ ...roster, forces: update.forces });
}

export function duplicateRosterSelection(
  roster: Roster,
  id: SelectionOccurrenceId,
  ids: DuplicateRosterSelectionIds,
): Result<Roster> {
  const source = findSelectionInForces(roster.forces, id);
  if (source === undefined) {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }

  const duplication = duplicateSelectionSubtree(roster, source, ids);
  if (duplication.diagnostics.length > 0) {
    return failure(duplication.diagnostics);
  }

  const update = insertSelectionAfterInForces(
    roster.forces,
    id,
    duplication.selection,
  );
  return success({ ...roster, forces: update.forces });
}

export function reparentRosterForce(
  roster: Roster,
  id: ForceOccurrenceId,
  destination: RosterForceDestination,
): Result<Roster> {
  const source = locateForce(roster.forces, id, { kind: "root" });
  if (source === undefined) {
    return failure([missingForceOccurrenceDiagnostic(id)]);
  }
  if (destination.kind === "force") {
    const parent = findForce(roster.forces, destination.parentId);
    if (parent === undefined) {
      return failure([missingForceDiagnostic(destination.parentId)]);
    }
    if (
      destination.parentId === id ||
      hasForce(source.force.forces, destination.parentId)
    ) {
      return failure([
        reparentCycleDiagnostic(
          "force",
          id,
          destination.kind,
          destination.parentId,
        ),
      ]);
    }
  }
  if (sameForceParent(source.parent, destination)) {
    if (source.index === destination.index) {
      return success(roster);
    }
  }

  const removed = removeForce(roster.forces, id);
  const siblingCount = forceDestinationCount(removed.forces, destination);
  if (!validInsertionIndex(destination.index, siblingCount)) {
    return failure([
      invalidReparentIndexDiagnostic(
        "force",
        id,
        destination,
        siblingCount,
      ),
    ]);
  }
  const forces =
    destination.kind === "root"
      ? insertAt(removed.forces, destination.index, source.force)
      : insertForceIntoParent(
          removed.forces,
          destination.parentId,
          destination.index,
          source.force,
        ).forces;
  return success({ ...roster, forces });
}

export function reparentRosterSelection(
  roster: Roster,
  id: SelectionOccurrenceId,
  destination: RosterSelectionDestination,
): Result<Roster> {
  const source = locateSelectionInForces(roster.forces, id);
  if (source === undefined) {
    return failure([missingSelectionOccurrenceDiagnostic(id)]);
  }
  if (destination.kind === "force") {
    if (findForce(roster.forces, destination.parentId) === undefined) {
      return failure([missingForceDiagnostic(destination.parentId)]);
    }
  } else {
    const parent = findSelectionInForces(roster.forces, destination.parentId);
    if (parent === undefined) {
      return failure([missingSelectionDiagnostic(destination.parentId)]);
    }
    if (
      destination.parentId === id ||
      hasSelection(source.selection.selections, destination.parentId)
    ) {
      return failure([
        reparentCycleDiagnostic(
          "selection",
          id,
          destination.kind,
          destination.parentId,
        ),
      ]);
    }
  }
  if (sameSelectionParent(source.parent, destination)) {
    if (source.index === destination.index) {
      return success(roster);
    }
  }

  const removed = removeSelectionInForces(roster.forces, id);
  const siblingCount = selectionDestinationCount(
    removed.forces,
    destination,
  );
  if (!validInsertionIndex(destination.index, siblingCount)) {
    return failure([
      invalidReparentIndexDiagnostic(
        "selection",
        id,
        destination,
        siblingCount,
      ),
    ]);
  }
  const update =
    destination.kind === "force"
      ? insertSelectionIntoForce(
          removed.forces,
          destination.parentId,
          destination.index,
          source.selection,
        )
      : insertSelectionIntoSelectionInForces(
          removed.forces,
          destination.parentId,
          destination.index,
          source.selection,
        );
  return success({ ...roster, forces: update.forces });
}

function createForce(input: AddRosterForceInput): RosterForce {
  return { ...input, forces: [], selections: [] };
}

function createSelection(input: AddRosterSelectionInput): RosterSelection {
  return { ...input, selections: [] };
}

function updateForceName(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
  name: string | undefined,
): ForceUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === id) {
      return {
        found: true,
        forces: replaceAt(forces, index, forceWithName(force, name)),
      };
    }
    const nested = updateForceName(force.forces, id, name);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function updateForceDefinition(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
  definition: RosterForceDefinitionReference,
): ForceUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === id) {
      if (sameForceDefinition(force.definition, definition)) {
        return { found: true, forces };
      }
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, definition }),
      };
    }
    const nested = updateForceDefinition(force.forces, id, definition);
    if (nested.found) {
      return nested.forces === force.forces
        ? { found: true, forces }
        : {
            found: true,
            forces: replaceAt(forces, index, {
              ...force,
              forces: nested.forces,
            }),
          };
    }
  }
  return { found: false, forces };
}

function removeForce(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
): ForceUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === id) {
      return {
        found: true,
        forces: forces.filter((_, currentIndex) => currentIndex !== index),
      };
    }
    const nested = removeForce(force.forces, id);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function updateSelectionNameInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
  name: string | undefined,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = updateSelectionName(force.selections, id, name);
    if (selections.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, {
          ...force,
          selections: selections.selections,
        }),
      };
    }
    const nested = updateSelectionNameInForces(force.forces, id, name);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function updateSelectionName(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
  name: string | undefined,
): SelectionTreeUpdate {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === id) {
      return {
        found: true,
        selections: replaceAt(
          selections,
          index,
          selectionWithName(selection, name),
        ),
      };
    }
    const nested = updateSelectionName(selection.selections, id, name);
    if (nested.found) {
      return {
        found: true,
        selections: replaceAt(selections, index, {
          ...selection,
          selections: nested.selections,
        }),
      };
    }
  }
  return { found: false, selections };
}

function updateSelectionAmountInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
  amount: number | undefined,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = updateSelectionAmount(force.selections, id, amount);
    if (selections.found) {
      return selections.selections === force.selections
        ? { found: true, forces }
        : {
            found: true,
            forces: replaceAt(forces, index, {
              ...force,
              selections: selections.selections,
            }),
          };
    }
    const nested = updateSelectionAmountInForces(force.forces, id, amount);
    if (nested.found) {
      return nested.forces === force.forces
        ? { found: true, forces }
        : {
            found: true,
            forces: replaceAt(forces, index, {
              ...force,
              forces: nested.forces,
            }),
          };
    }
  }
  return { found: false, forces };
}

function updateSelectionAmount(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
  amount: number | undefined,
): SelectionTreeUpdate {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === id) {
      if (selection.amount === amount) {
        return { found: true, selections };
      }
      return {
        found: true,
        selections: replaceAt(
          selections,
          index,
          selectionWithAmount(selection, amount),
        ),
      };
    }
    const nested = updateSelectionAmount(selection.selections, id, amount);
    if (nested.found) {
      return nested.selections === selection.selections
        ? { found: true, selections }
        : {
            found: true,
            selections: replaceAt(selections, index, {
              ...selection,
              selections: nested.selections,
            }),
          };
    }
  }
  return { found: false, selections };
}

function updateSelectionDefinitionInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
  definition: RosterSelectionDefinitionReference,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = updateSelectionDefinition(
      force.selections,
      id,
      definition,
    );
    if (selections.found) {
      return selections.selections === force.selections
        ? { found: true, forces }
        : {
            found: true,
            forces: replaceAt(forces, index, {
              ...force,
              selections: selections.selections,
            }),
          };
    }
    const nested = updateSelectionDefinitionInForces(
      force.forces,
      id,
      definition,
    );
    if (nested.found) {
      return nested.forces === force.forces
        ? { found: true, forces }
        : {
            found: true,
            forces: replaceAt(forces, index, {
              ...force,
              forces: nested.forces,
            }),
          };
    }
  }
  return { found: false, forces };
}

function updateSelectionDefinition(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
  definition: RosterSelectionDefinitionReference,
): SelectionTreeUpdate {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === id) {
      if (sameSelectionDefinition(selection.definition, definition)) {
        return { found: true, selections };
      }
      return {
        found: true,
        selections: replaceAt(selections, index, {
          ...selection,
          definition,
        }),
      };
    }
    const nested = updateSelectionDefinition(
      selection.selections,
      id,
      definition,
    );
    if (nested.found) {
      return nested.selections === selection.selections
        ? { found: true, selections }
        : {
            found: true,
            selections: replaceAt(selections, index, {
              ...selection,
              selections: nested.selections,
            }),
          };
    }
  }
  return { found: false, selections };
}

function sameForceDefinition(
  left: RosterForceDefinitionReference,
  right: RosterForceDefinitionReference,
): boolean {
  return (
    left.kind === right.kind &&
    left.key === right.key &&
    left.sourceId === right.sourceId
  );
}

function sameSelectionDefinition(
  left: RosterSelectionDefinitionReference,
  right: RosterSelectionDefinitionReference,
): boolean {
  return (
    left.kind === right.kind &&
    left.key === right.key &&
    left.sourceId === right.sourceId
  );
}

function removeSelectionInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = removeSelection(force.selections, id);
    if (selections.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, {
          ...force,
          selections: selections.selections,
        }),
      };
    }
    const nested = removeSelectionInForces(force.forces, id);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function removeSelection(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
): SelectionTreeUpdate {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === id) {
      return {
        found: true,
        selections: selections.filter(
          (_, currentIndex) => currentIndex !== index,
        ),
      };
    }
    const nested = removeSelection(selection.selections, id);
    if (nested.found) {
      return {
        found: true,
        selections: replaceAt(selections, index, {
          ...selection,
          selections: nested.selections,
        }),
      };
    }
  }
  return { found: false, selections };
}

function forceWithName(
  force: RosterForce,
  name: string | undefined,
): RosterForce {
  if (name === undefined) {
    return {
      id: force.id,
      definition: force.definition,
      forces: force.forces,
      selections: force.selections,
    };
  }
  return { ...force, name };
}

function selectionWithName(
  selection: RosterSelection,
  name: string | undefined,
): RosterSelection {
  if (name === undefined) {
    return {
      id: selection.id,
      definition: selection.definition,
      ...(selection.amount === undefined
        ? {}
        : { amount: selection.amount }),
      selections: selection.selections,
    };
  }
  return { ...selection, name };
}

function selectionWithAmount(
  selection: RosterSelection,
  amount: number | undefined,
): RosterSelection {
  if (amount === undefined) {
    const result: RosterSelection = {
      id: selection.id,
      definition: selection.definition,
      ...(selection.name === undefined ? {} : { name: selection.name }),
      selections: selection.selections,
    };
    return result;
  }
  return { ...selection, amount };
}

function validSelectionAmount(amount: number | undefined): boolean {
  return amount === undefined || (Number.isFinite(amount) && amount > 0);
}

function reorderForce(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
  toIndex: number,
): ForceReorder {
  const currentIndex = forces.findIndex((force) => force.id === id);
  if (currentIndex >= 0) {
    if (!validIndex(toIndex, forces.length)) {
      return {
        status: "invalidIndex",
        forces,
        siblingCount: forces.length,
      };
    }
    if (currentIndex === toIndex) {
      return { status: "unchanged", forces };
    }
    return {
      status: "changed",
      forces: moveAt(forces, currentIndex, toIndex),
    };
  }
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const nested = reorderForce(force.forces, id, toIndex);
    if (nested.status === "missing") {
      continue;
    }
    if (nested.status !== "changed") {
      return { ...nested, forces };
    }
    return {
      status: "changed",
      forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
    };
  }
  return { status: "missing", forces };
}

function reorderSelectionInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
  toIndex: number,
): SelectionReorder {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = reorderSelection(force.selections, id, toIndex);
    if (selections.status !== "missing") {
      if (selections.status !== "changed") {
        return { ...selections, forces };
      }
      return {
        status: "changed",
        forces: replaceAt(forces, index, {
          ...force,
          selections: selections.selections,
        }),
      };
    }
    const nested = reorderSelectionInForces(force.forces, id, toIndex);
    if (nested.status === "missing") {
      continue;
    }
    if (nested.status !== "changed") {
      return { ...nested, forces };
    }
    return {
      status: "changed",
      forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
    };
  }
  return { status: "missing", forces };
}

function reorderSelection(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
  toIndex: number,
): SelectionTreeReorder {
  const currentIndex = selections.findIndex((selection) => selection.id === id);
  if (currentIndex >= 0) {
    if (!validIndex(toIndex, selections.length)) {
      return {
        status: "invalidIndex",
        selections,
        siblingCount: selections.length,
      };
    }
    if (currentIndex === toIndex) {
      return { status: "unchanged", selections };
    }
    return {
      status: "changed",
      selections: moveAt(selections, currentIndex, toIndex),
    };
  }
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    const nested = reorderSelection(selection.selections, id, toIndex);
    if (nested.status === "missing") {
      continue;
    }
    if (nested.status !== "changed") {
      return { ...nested, selections };
    }
    return {
      status: "changed",
      selections: replaceAt(selections, index, {
        ...selection,
        selections: nested.selections,
      }),
    };
  }
  return { status: "missing", selections };
}

function validIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function moveAt<T>(
  values: readonly T[],
  fromIndex: number,
  toIndex: number,
): readonly T[] {
  const moved = values[fromIndex];
  if (moved === undefined) {
    return values;
  }
  const result = values.filter((_, index) => index !== fromIndex);
  result.splice(toIndex, 0, moved);
  return result;
}

function findForce(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
): RosterForce | undefined {
  for (const force of forces) {
    if (force.id === id) {
      return force;
    }
    const nested = findForce(force.forces, id);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function locateForce(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
  parent: ForceParent,
): ForceLocation | undefined {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === id) {
      return { force, parent, index };
    }
    const nested = locateForce(force.forces, id, {
      kind: "force",
      id: force.id,
    });
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function findSelectionInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
): RosterSelection | undefined {
  for (const force of forces) {
    const selection = findSelection(force.selections, id);
    if (selection !== undefined) {
      return selection;
    }
    const nested = findSelectionInForces(force.forces, id);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function locateSelectionInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
): SelectionLocation | undefined {
  for (const force of forces) {
    const selection = locateSelection(force.selections, id, {
      kind: "force",
      id: force.id,
    });
    if (selection !== undefined) {
      return selection;
    }
    const nested = locateSelectionInForces(force.forces, id);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function findSelection(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
): RosterSelection | undefined {
  for (const selection of selections) {
    if (selection.id === id) {
      return selection;
    }
    const nested = findSelection(selection.selections, id);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function locateSelection(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
  parent: SelectionParent,
): SelectionLocation | undefined {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === id) {
      return { selection, parent, index };
    }
    const nested = locateSelection(selection.selections, id, {
      kind: "selection",
      id: selection.id,
    });
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function sameForceParent(
  parent: ForceParent,
  destination: RosterForceDestination,
): boolean {
  return parent.kind === destination.kind &&
    (parent.kind === "root" || destination.kind === "root"
      ? true
      : parent.id === destination.parentId);
}

function sameSelectionParent(
  parent: SelectionParent,
  destination: RosterSelectionDestination,
): boolean {
  return (
    parent.kind === destination.kind && parent.id === destination.parentId
  );
}

function forceDestinationCount(
  forces: readonly RosterForce[],
  destination: RosterForceDestination,
): number {
  if (destination.kind === "root") {
    return forces.length;
  }
  return findForce(forces, destination.parentId)?.forces.length ?? 0;
}

function selectionDestinationCount(
  forces: readonly RosterForce[],
  destination: RosterSelectionDestination,
): number {
  return destination.kind === "force"
    ? (findForce(forces, destination.parentId)?.selections.length ?? 0)
    : (findSelectionInForces(forces, destination.parentId)?.selections.length ??
        0);
}

function validInsertionIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= length;
}

function insertForceIntoParent(
  forces: readonly RosterForce[],
  parentId: ForceOccurrenceId,
  index: number,
  forceToInsert: RosterForce,
): ForceUpdate {
  for (let currentIndex = 0; currentIndex < forces.length; currentIndex += 1) {
    const force = forces[currentIndex];
    if (force === undefined) {
      continue;
    }
    if (force.id === parentId) {
      return {
        found: true,
        forces: replaceAt(forces, currentIndex, {
          ...force,
          forces: insertAt(force.forces, index, forceToInsert),
        }),
      };
    }
    const nested = insertForceIntoParent(
      force.forces,
      parentId,
      index,
      forceToInsert,
    );
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, currentIndex, {
          ...force,
          forces: nested.forces,
        }),
      };
    }
  }
  return { found: false, forces };
}

function insertSelectionIntoForce(
  forces: readonly RosterForce[],
  parentId: ForceOccurrenceId,
  index: number,
  selection: RosterSelection,
): SelectionUpdate {
  for (let currentIndex = 0; currentIndex < forces.length; currentIndex += 1) {
    const force = forces[currentIndex];
    if (force === undefined) {
      continue;
    }
    if (force.id === parentId) {
      return {
        found: true,
        forces: replaceAt(forces, currentIndex, {
          ...force,
          selections: insertAt(force.selections, index, selection),
        }),
      };
    }
    const nested = insertSelectionIntoForce(
      force.forces,
      parentId,
      index,
      selection,
    );
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, currentIndex, {
          ...force,
          forces: nested.forces,
        }),
      };
    }
  }
  return { found: false, forces };
}

function insertSelectionIntoSelectionInForces(
  forces: readonly RosterForce[],
  parentId: SelectionOccurrenceId,
  index: number,
  selection: RosterSelection,
): SelectionUpdate {
  for (let currentIndex = 0; currentIndex < forces.length; currentIndex += 1) {
    const force = forces[currentIndex];
    if (force === undefined) {
      continue;
    }
    const selections = insertSelectionIntoSelection(
      force.selections,
      parentId,
      index,
      selection,
    );
    if (selections.found) {
      return {
        found: true,
        forces: replaceAt(forces, currentIndex, {
          ...force,
          selections: selections.selections,
        }),
      };
    }
    const nested = insertSelectionIntoSelectionInForces(
      force.forces,
      parentId,
      index,
      selection,
    );
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, currentIndex, {
          ...force,
          forces: nested.forces,
        }),
      };
    }
  }
  return { found: false, forces };
}

function insertSelectionIntoSelection(
  selections: readonly RosterSelection[],
  parentId: SelectionOccurrenceId,
  index: number,
  selectionToInsert: RosterSelection,
): SelectionTreeUpdate {
  for (
    let currentIndex = 0;
    currentIndex < selections.length;
    currentIndex += 1
  ) {
    const selection = selections[currentIndex];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === parentId) {
      return {
        found: true,
        selections: replaceAt(selections, currentIndex, {
          ...selection,
          selections: insertAt(
            selection.selections,
            index,
            selectionToInsert,
          ),
        }),
      };
    }
    const nested = insertSelectionIntoSelection(
      selection.selections,
      parentId,
      index,
      selectionToInsert,
    );
    if (nested.found) {
      return {
        found: true,
        selections: replaceAt(selections, currentIndex, {
          ...selection,
          selections: nested.selections,
        }),
      };
    }
  }
  return { found: false, selections };
}

function insertAt<T>(
  values: readonly T[],
  index: number,
  value: T,
): readonly T[] {
  return [...values.slice(0, index), value, ...values.slice(index)];
}

function duplicateForceSubtree(
  roster: Roster,
  source: RosterForce,
  ids: DuplicateRosterForceIds,
): {
  readonly force: RosterForce;
  readonly diagnostics: readonly Diagnostic[];
} {
  const forceIds = new Set<ForceOccurrenceId>();
  const selectionIds = new Set<SelectionOccurrenceId>();
  collectRosterIds(roster.forces, forceIds, selectionIds);
  const diagnostics: Diagnostic[] = [];
  const force = copyForce(source, ids, forceIds, selectionIds, diagnostics);
  return { force, diagnostics };
}

function duplicateSelectionSubtree(
  roster: Roster,
  source: RosterSelection,
  ids: DuplicateRosterSelectionIds,
): {
  readonly selection: RosterSelection;
  readonly diagnostics: readonly Diagnostic[];
} {
  const selectionIds = new Set<SelectionOccurrenceId>();
  collectSelectionIdsInForces(roster.forces, selectionIds);
  const diagnostics: Diagnostic[] = [];
  const selection = copySelection(
    source,
    ids,
    selectionIds,
    diagnostics,
  );
  return { selection, diagnostics };
}

function copyForce(
  source: RosterForce,
  ids: DuplicateRosterForceIds,
  forceIds: Set<ForceOccurrenceId>,
  selectionIds: Set<SelectionOccurrenceId>,
  diagnostics: Diagnostic[],
): RosterForce {
  const id = ids.forceId(source.id);
  if (forceIds.has(id)) {
    diagnostics.push(duplicateForceDiagnostic(id));
  }
  forceIds.add(id);
  return {
    ...source,
    id,
    forces: source.forces.map((force) =>
      copyForce(force, ids, forceIds, selectionIds, diagnostics),
    ),
    selections: source.selections.map((selection) =>
      copySelection(selection, ids, selectionIds, diagnostics),
    ),
  };
}

function copySelection(
  source: RosterSelection,
  ids: DuplicateRosterSelectionIds,
  selectionIds: Set<SelectionOccurrenceId>,
  diagnostics: Diagnostic[],
): RosterSelection {
  const id = ids.selectionId(source.id);
  if (selectionIds.has(id)) {
    diagnostics.push(duplicateSelectionDiagnostic(id));
  }
  selectionIds.add(id);
  return {
    ...source,
    id,
    selections: source.selections.map((selection) =>
      copySelection(selection, ids, selectionIds, diagnostics),
    ),
  };
}

function collectRosterIds(
  forces: readonly RosterForce[],
  forceIds: Set<ForceOccurrenceId>,
  selectionIds: Set<SelectionOccurrenceId>,
): void {
  for (const force of forces) {
    forceIds.add(force.id);
    collectSelectionIds(force.selections, selectionIds);
    collectRosterIds(force.forces, forceIds, selectionIds);
  }
}

function collectSelectionIdsInForces(
  forces: readonly RosterForce[],
  selectionIds: Set<SelectionOccurrenceId>,
): void {
  for (const force of forces) {
    collectSelectionIds(force.selections, selectionIds);
    collectSelectionIdsInForces(force.forces, selectionIds);
  }
}

function collectSelectionIds(
  selections: readonly RosterSelection[],
  selectionIds: Set<SelectionOccurrenceId>,
): void {
  for (const selection of selections) {
    selectionIds.add(selection.id);
    collectSelectionIds(selection.selections, selectionIds);
  }
}

function insertForceAfter(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
  duplicate: RosterForce,
): ForceUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === id) {
      return {
        found: true,
        forces: insertAfter(forces, index, duplicate),
      };
    }
    const nested = insertForceAfter(force.forces, id, duplicate);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function insertSelectionAfterInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
  duplicate: RosterSelection,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = insertSelectionAfter(force.selections, id, duplicate);
    if (selections.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, {
          ...force,
          selections: selections.selections,
        }),
      };
    }
    const nested = insertSelectionAfterInForces(
      force.forces,
      id,
      duplicate,
    );
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function insertSelectionAfter(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
  duplicate: RosterSelection,
): SelectionTreeUpdate {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === id) {
      return {
        found: true,
        selections: insertAfter(selections, index, duplicate),
      };
    }
    const nested = insertSelectionAfter(
      selection.selections,
      id,
      duplicate,
    );
    if (nested.found) {
      return {
        found: true,
        selections: replaceAt(selections, index, {
          ...selection,
          selections: nested.selections,
        }),
      };
    }
  }
  return { found: false, selections };
}

function insertAfter<T>(
  values: readonly T[],
  index: number,
  value: T,
): readonly T[] {
  return [
    ...values.slice(0, index + 1),
    value,
    ...values.slice(index + 1),
  ];
}

function appendChildForce(
  forces: readonly RosterForce[],
  parentId: ForceOccurrenceId,
  child: RosterForce,
): ForceUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === parentId) {
      return {
        found: true,
        forces: replaceAt(forces, index, {
          ...force,
          forces: [...force.forces, child],
        }),
      };
    }
    const nested = appendChildForce(force.forces, parentId, child);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function appendSelectionToForce(
  forces: readonly RosterForce[],
  parentId: ForceOccurrenceId,
  selection: RosterSelection,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    if (force.id === parentId) {
      return {
        found: true,
        forces: replaceAt(forces, index, {
          ...force,
          selections: [...force.selections, selection],
        }),
      };
    }
    const nested = appendSelectionToForce(force.forces, parentId, selection);
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function appendSelectionToSelectionInForces(
  forces: readonly RosterForce[],
  parentId: SelectionOccurrenceId,
  selection: RosterSelection,
): SelectionUpdate {
  for (let index = 0; index < forces.length; index += 1) {
    const force = forces[index];
    if (force === undefined) {
      continue;
    }
    const selections = appendSelectionToSelection(
      force.selections,
      parentId,
      selection,
    );
    if (selections.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, {
          ...force,
          selections: selections.selections,
        }),
      };
    }
    const nested = appendSelectionToSelectionInForces(
      force.forces,
      parentId,
      selection,
    );
    if (nested.found) {
      return {
        found: true,
        forces: replaceAt(forces, index, { ...force, forces: nested.forces }),
      };
    }
  }
  return { found: false, forces };
}

function appendSelectionToSelection(
  selections: readonly RosterSelection[],
  parentId: SelectionOccurrenceId,
  child: RosterSelection,
): {
  readonly found: boolean;
  readonly selections: readonly RosterSelection[];
} {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    if (selection.id === parentId) {
      return {
        found: true,
        selections: replaceAt(selections, index, {
          ...selection,
          selections: [...selection.selections, child],
        }),
      };
    }
    const nested = appendSelectionToSelection(
      selection.selections,
      parentId,
      child,
    );
    if (nested.found) {
      return {
        found: true,
        selections: replaceAt(selections, index, {
          ...selection,
          selections: nested.selections,
        }),
      };
    }
  }
  return { found: false, selections };
}

function hasForce(
  forces: readonly RosterForce[],
  id: ForceOccurrenceId,
): boolean {
  return forces.some(
    (force) => force.id === id || hasForce(force.forces, id),
  );
}

function hasSelectionInForces(
  forces: readonly RosterForce[],
  id: SelectionOccurrenceId,
): boolean {
  return forces.some(
    (force) =>
      hasSelection(force.selections, id) ||
      hasSelectionInForces(force.forces, id),
  );
}

function hasSelection(
  selections: readonly RosterSelection[],
  id: SelectionOccurrenceId,
): boolean {
  return selections.some(
    (selection) =>
      selection.id === id || hasSelection(selection.selections, id),
  );
}

function replaceAt<T>(
  values: readonly T[],
  index: number,
  value: T,
): readonly T[] {
  return values.map((current, currentIndex) =>
    currentIndex === index ? value : current,
  );
}

function duplicateForceDiagnostic(id: ForceOccurrenceId): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_DUPLICATE_FORCE_ID",
    `Force occurrence ID ${id} already exists.`,
    { id, kind: "force" },
  );
}

function duplicateSelectionDiagnostic(id: SelectionOccurrenceId): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_DUPLICATE_SELECTION_ID",
    `Selection occurrence ID ${id} already exists.`,
    { id, kind: "selection" },
  );
}

function missingForceDiagnostic(id: ForceOccurrenceId): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_MISSING_PARENT_FORCE",
    `Parent force occurrence ${id} does not exist.`,
    { id, kind: "force" },
  );
}

function missingSelectionDiagnostic(id: SelectionOccurrenceId): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_MISSING_PARENT_SELECTION",
    `Parent selection occurrence ${id} does not exist.`,
    { id, kind: "selection" },
  );
}

function missingForceOccurrenceDiagnostic(id: ForceOccurrenceId): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_MISSING_FORCE",
    `Force occurrence ${id} does not exist.`,
    { id, kind: "force" },
  );
}

function missingSelectionOccurrenceDiagnostic(
  id: SelectionOccurrenceId,
): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_MISSING_SELECTION",
    `Selection occurrence ${id} does not exist.`,
    { id, kind: "selection" },
  );
}

function invalidSelectionAmountDiagnostic(
  id: SelectionOccurrenceId,
  amount: number | undefined,
): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_INVALID_SELECTION_AMOUNT",
    `Selection occurrence ${id} must have a positive finite amount.`,
    { id, kind: "selection", amount },
  );
}

function invalidReorderIndexDiagnostic(
  kind: "force" | "selection",
  id: ForceOccurrenceId | SelectionOccurrenceId,
  toIndex: number,
  siblingCount: number,
): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_INVALID_REORDER_INDEX",
    `Cannot move ${kind} occurrence ${id} to sibling index ${toIndex}.`,
    { id, kind, toIndex, siblingCount },
  );
}

function invalidReparentIndexDiagnostic(
  kind: "force" | "selection",
  id: ForceOccurrenceId | SelectionOccurrenceId,
  destination: RosterForceDestination | RosterSelectionDestination,
  siblingCount: number,
): Diagnostic {
  const parent =
    destination.kind === "root"
      ? { parentKind: destination.kind }
      : { parentKind: destination.kind, parentId: destination.parentId };
  return structuralDiagnostic(
    "ROSTER_MODEL_INVALID_REPARENT_INDEX",
    `Cannot insert ${kind} occurrence ${id} at sibling index ${destination.index}.`,
    {
      id,
      kind,
      toIndex: destination.index,
      siblingCount,
      ...parent,
    },
  );
}

function reparentCycleDiagnostic(
  kind: "force" | "selection",
  id: ForceOccurrenceId | SelectionOccurrenceId,
  parentKind: "force" | "selection",
  parentId: ForceOccurrenceId | SelectionOccurrenceId,
): Diagnostic {
  return structuralDiagnostic(
    "ROSTER_MODEL_REPARENT_CYCLE",
    `Cannot move ${kind} occurrence ${id} beneath itself or its descendant.`,
    { id, kind, parentKind, parentId },
  );
}

function structuralDiagnostic(
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts: ["internal"],
    details,
  };
}
