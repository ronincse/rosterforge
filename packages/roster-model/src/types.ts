/**
 * The roster tree: what a saved army list is, independent of any catalogue.
 *
 * A roster stores *references* to definitions, never copies of them. That is
 * what lets a draft outlive the bytes it was built from and be re-resolved
 * against a rebuilt catalogue — and it is why nothing here can answer what a
 * selection costs or whether it is legal.
 *
 * The commands that produce these values live in `commands.js`.
 */

import type { Brand, ObjectId } from "@rosterforge/foundation";

/**
 * Branded so the four kinds of string cannot be swapped by accident. Force
 * and selection occurrence IDs matter most: they are separate namespaces,
 * and passing one where the other belongs would silently find nothing
 * rather than fail to compile.
 */
export type RosterId = Brand<string, "RosterId">;
export type ForceOccurrenceId = Brand<string, "ForceOccurrenceId">;
export type SelectionOccurrenceId = Brand<string, "SelectionOccurrenceId">;
export type RosterDefinitionKey = Brand<string, "RosterDefinitionKey">;

export function rosterId(value: string): RosterId {
  return value as RosterId;
}

export function forceOccurrenceId(value: string): ForceOccurrenceId {
  return value as ForceOccurrenceId;
}

export function selectionOccurrenceId(value: string): SelectionOccurrenceId {
  return value as SelectionOccurrenceId;
}

export function rosterDefinitionKey(value: string): RosterDefinitionKey {
  return value as RosterDefinitionKey;
}

/**
 * Builds the key a roster uses to name one definition.
 *
 * The identity is *positional*: a source ID plus the path to the node
 * within that document, whose segments look like
 * `sharedSelectionEntries[3]`. It is deliberately not the BattleScribe
 * `id`, which `data-graph` treats as possibly duplicated — it reports
 * collisions as diagnostics rather than assuming uniqueness.
 *
 * `JSON.stringify` of an array rather than a joined string, so a path
 * segment containing the separator cannot forge another entry's key.
 *
 * A source ID is batch-scoped (`local-file:<batchId>:<index>`), so the
 * same files re-imported under a new batch would key differently. Draft
 * records retain each file's original `sourceId` and `repository` reuses
 * it, which is the whole reason a saved draft resolves against a rebuilt
 * batch. What still breaks the key is a catalogue release that moves an
 * entry within its document.
 */
export function rosterDefinitionKeyForSource(
  sourceId: string,
  path: readonly string[],
): RosterDefinitionKey {
  return rosterDefinitionKey(JSON.stringify([sourceId, ...path]));
}

interface RosterDefinitionReferenceBase {
  readonly key: RosterDefinitionKey;
  readonly sourceId?: ObjectId;
}

export interface RosterCatalogueReference
  extends RosterDefinitionReferenceBase {
  readonly kind: "catalogue";
}

export interface RosterForceDefinitionReference
  extends RosterDefinitionReferenceBase {
  readonly kind: "forceEntry";
}

export interface RosterSelectionDefinitionReference
  extends RosterDefinitionReferenceBase {
  readonly kind: "selectionEntry" | "selectionEntryGroup";
}

export interface Roster {
  readonly id: RosterId;
  readonly name: string;
  readonly catalogue: RosterCatalogueReference;
  readonly forces: readonly RosterForce[];
}

export interface RosterForce {
  readonly id: ForceOccurrenceId;
  readonly definition: RosterForceDefinitionReference;
  readonly name?: string;
  readonly forces: readonly RosterForce[];
  readonly selections: readonly RosterSelection[];
}

/**
 * `name` and `amount` are overrides, absent when there is nothing to
 * override — and an absent `amount` means one. The commands clear them by
 * removing the key rather than storing `undefined`, so the absence
 * survives a round trip through the draft store.
 */
export interface RosterSelection {
  readonly id: SelectionOccurrenceId;
  readonly definition: RosterSelectionDefinitionReference;
  readonly name?: string;
  readonly amount?: number;
  readonly selections: readonly RosterSelection[];
}

/** Always read `amount` through this: absent means one, not zero. */
export function rosterSelectionAmount(selection: RosterSelection): number {
  return selection.amount ?? 1;
}

export function rosterSelectionsAmount(
  selections: readonly RosterSelection[],
): number {
  return selections.reduce(
    (total, selection) => total + rosterSelectionAmount(selection),
    0,
  );
}
