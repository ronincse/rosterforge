// Structural assignment lifecycle, independent of any game catalogue.
import { expect, it } from "vitest";
import { createRoster, addRosterForce, addRosterSelectionToForce, duplicateRosterSelection, removeRosterSelection, removeRosterForce } from "./commands.js";
import { forceOccurrenceId, rosterDefinitionKey, rosterId, selectionOccurrenceId } from "./types.js";
import { setRosterAssociation } from "./associations.js";
it("retains exact edges, supports clearing, and prunes deleted endpoints without moving units", () => {
  const force = forceOccurrenceId("force");
  let roster = createRoster({id:rosterId("r"),name:"Roster",catalogue:{kind:"catalogue",key:rosterDefinitionKey("cat")}});
  const addedForce = addRosterForce(roster,{id:force,definition:{kind:"forceEntry",key:rosterDefinitionKey("f")}});
  if (!addedForce.ok) throw new Error("force"); roster=addedForce.value;
  for (const id of ["leader","squad"]) { const added = addRosterSelectionToForce(roster,force,{id:selectionOccurrenceId(id),definition:{kind:"selectionEntry",key:rosterDefinitionKey(id)}}); if (!added.ok) throw new Error("unit"); roster=added.value; }
  const source=selectionOccurrenceId("leader"),target=selectionOccurrenceId("squad"),key=rosterDefinitionKey("leading");
  const result=setRosterAssociation(roster,source,key,target); if(!result.ok)throw new Error("edge");
  expect(result.value.forces).toBe(roster.forces);
  expect(roster.associations).toBeUndefined();
  expect(setRosterAssociation(result.value,source,key,target)).toMatchObject({ok:true,value:result.value});
  expect(setRosterAssociation(roster,source,key,source).ok).toBe(false);
  expect(setRosterAssociation(roster,source,key,selectionOccurrenceId("missing")).ok).toBe(false);
  const copy=duplicateRosterSelection(result.value,source,{selectionId:id=>selectionOccurrenceId(`copy-${id}`)});
  if(!copy.ok)throw new Error("copy"); expect(copy.value.associations).toEqual(result.value.associations);
  const removed=removeRosterSelection(result.value,target);if(!removed.ok)throw new Error("remove");
  expect(removed.value.associations).toBeUndefined();expect(removed.value.forces[0]!.selections[0]!.id).toBe(source);
  const clear=setRosterAssociation(result.value,source,key,undefined);if(!clear.ok)throw new Error("clear");expect(clear.value.associations).toBeUndefined();
  const removedForce=removeRosterForce(result.value,force);if(!removedForce.ok)throw new Error("force removal");expect(removedForce.value.associations).toBeUndefined();
});
