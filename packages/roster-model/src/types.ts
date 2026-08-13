import type { Brand, ObjectId } from "@rosterforge/foundation";

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

export interface RosterSelection {
  readonly id: SelectionOccurrenceId;
  readonly definition: RosterSelectionDefinitionReference;
  readonly name?: string;
  readonly amount?: number;
  readonly selections: readonly RosterSelection[];
}

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
