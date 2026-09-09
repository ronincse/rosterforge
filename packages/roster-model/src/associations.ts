// Structural assignment commands only. Eligibility and game effects belong in
// evaluation; an edge stores three small identifiers, never source/model data.
import { failure, success, type Result } from "@rosterforge/foundation";
import type { Roster, RosterAssociation, RosterForce, RosterSelection, SelectionOccurrenceId, RosterDefinitionKey } from "./types.js";

function selectionIds(roster: Roster): Set<SelectionOccurrenceId> {
  const ids = new Set<SelectionOccurrenceId>();
  const pending: (RosterForce | RosterSelection)[] = [...roster.forces];
  while (pending.length) {
    const item = pending.pop()!;
    pending.push(...item.selections);
    if ("forces" in item) pending.push(...item.forces);
    else ids.add(item.id);
  }
  return ids;
}

/** Set one assignment for a source/definition pair, or clear it. Existing
 * occurrence identities and tree ordering are retained. No-op preserves identity.
 * Endpoint validation walks the roster once; only the small edge array is copied. */
export function setRosterAssociation(roster: Roster, sourceId: SelectionOccurrenceId, definitionKey: RosterDefinitionKey, targetId: SelectionOccurrenceId | undefined): Result<Roster> {
  const ids = selectionIds(roster);
  if (!ids.has(sourceId) || (targetId !== undefined && (!ids.has(targetId) || targetId === sourceId)) || !definitionKey || (roster.associations?.length ?? 0) >= 1000 && targetId !== undefined && !roster.associations?.some(a => a.sourceId === sourceId && a.definitionKey === definitionKey)) {
    return failure([{ code: "ROSTER_ASSOCIATION_INVALID", message: "An assignment needs distinct existing source and target selections and a definition.", severity: "error", impacts: ["validation"] }]);
  }
  const current = roster.associations ?? [];
  const existing = current.find(a => a.sourceId === sourceId && a.definitionKey === definitionKey);
  if (existing?.targetId === targetId) return success(roster);
  const remaining = current.filter(a => a !== existing);
  const associations: readonly RosterAssociation[] = targetId === undefined ? remaining : [...remaining, { sourceId, targetId, definitionKey }];
  if (!associations.length) { const rest = { ...roster }; delete rest.associations; return success(rest); }
  return success({ ...roster, associations });
}

/** Remove only dangling edges after a structural deletion. No unit is removed
 * because it was attached to another. Copies start unattached: their fresh IDs
 * do not inherit any edge; original assignments remain unchanged. */
export function pruneRosterAssociations(roster: Roster): Roster {
  if (!roster.associations?.length) return roster;
  const ids = selectionIds(roster);
  const associations = roster.associations.filter(a => ids.has(a.sourceId) && ids.has(a.targetId));
  if (associations.length === roster.associations.length) return roster;
  if (!associations.length) { const rest = { ...roster }; delete rest.associations; return rest; }
  return { ...roster, associations };
}
