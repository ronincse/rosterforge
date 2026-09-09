// Synthetic filter tests keep unsupported imported shapes from granting targets.
import { expect, it } from "vitest";
import { parseBattleScribeJson } from "@rosterforge/battlescribe-data";
import { composeBattleScribeCatalogueContexts, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { sourceId } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterDefinitionKeyForSource, rosterId, selectionOccurrenceId, type Roster, type RosterSelection } from "@rosterforge/roster-model";
import { inspectRosterAssociationChoices } from "./associations.js";

function scenario(extra: Record<string, unknown> = {}, conditions: unknown[] = [], conditionGroups: unknown[] = []) {
  const parsed = parseBattleScribeJson(new TextEncoder().encode(JSON.stringify({catalogue:{
    id:"catalogue",gameSystemId:"system",name:"Association filters",battleScribeVersion:"2.03",forceEntries:[{id:"force",name:"Army"}],
    categoryEntries:[{id:"bodyguard",name:"Bodyguard"},{id:"source-role",name:"Source role"}],
    selectionEntries:[
      {id:"leader",name:"Leader",type:"model",categoryLinks:[{id:"role",targetId:"source-role"}],associations:[{id:"leading",name:"Leading",min:0,max:1,scope:"force",childId:"unit",includeChildSelections:true,action:"group",conditions,conditionGroups,...extra}]},
      {id:"unit",name:"Bodyguard unit",type:"unit",categoryLinks:[{id:"unit-category",targetId:"bodyguard"}]},
      {id:"model",name:"Bodyguard model",type:"model",categoryLinks:[{id:"model-category",targetId:"bodyguard"}]},
    ],
  }})), {source:{sourceId:sourceId("association-test"),filename:"associations.json",kind:"synthetic",importedAt:"2026-09-09T00:00:00Z"}});
  if (!parsed.ok) throw new Error("Parse failed");
  const system = parseBattleScribeJson(new TextEncoder().encode(JSON.stringify({gameSystem:{id:"system",name:"System",battleScribeVersion:"2.03"}})), {source:{sourceId:sourceId("association-system"),filename:"system.json",kind:"synthetic",importedAt:"2026-09-09T00:00:00Z"}});
  if (!system.ok) throw new Error("System parse failed");
  const graph = resolveBattleScribeDataGraph([system.value,parsed.value]);
  if (!graph.ok) throw new Error("Graph failed");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Context failed");
  const context = contexts.value.catalogues[0]!;
  const key = (entry: {source:{sourceId:string};path:readonly string[]}) => rosterDefinitionKeyForSource(entry.source.sourceId,entry.path);
  const selections: RosterSelection[] = parsed.value.projection.selectionEntries.map(entry => ({id:selectionOccurrenceId(entry.id!),name:entry.name!,definition:{kind:"selectionEntry",key:key(entry),sourceId:entry.id!},selections:[]}));
  const roster: Roster = {id:rosterId("test"),name:"Test",catalogue:{kind:"catalogue",key:key(parsed.value.projection),sourceId:parsed.value.metadata.id!},forces:[{id:forceOccurrenceId("force"),definition:{kind:"forceEntry",key:key(parsed.value.projection.forceEntries[0]!)},forces:[],selections}]};
  return inspectRosterAssociationChoices(roster,context,selections[0]!)[0]!;
}

const filter = {type:"instanceOf",field:"selections",scope:"self",childId:"bodyguard",value:1,shared:true};

it("uses unit occurrences and switches only queryFromSelf leaves to the leader", () => {
  expect(scenario({},[filter]).candidates.map(c => [c.selection.id,c.status])).toEqual([["unit","satisfied"]]);
  expect(scenario({},[{...filter,childId:"source-role",queryFromSelf:true}]).candidates[0]!.status).toBe("satisfied");
  expect(scenario({},[{...filter,childId:"source-role"}]).candidates[0]!.status).toBe("unsatisfied");
});

it("keeps unsupported shapes and malformed filters unavailable", () => {
  for (const extra of [{futureBehavior:true},{hidden:"garbage"},{includeChildForces:"garbage"},{max:2},{modifiers:[{type:"set",field:"hidden",value:true}]}]) {
    expect(scenario(extra)).toMatchObject({supported:false,candidates:[]});
  }
  expect(scenario({},[],[{type:"and"}]).candidates[0]!.status).toBe("unresolved");
  expect(scenario({},[{...filter,queryFromSelf:"garbage"}]).candidates[0]!.status).toBe("unresolved");
  expect(scenario({},[{...filter,futureChildren:[{id:"unknown"}]}]).candidates[0]!.status).toBe("unresolved");
  expect(scenario({},[],[{type:"and",conditions:[filter],futureChildren:[{id:"unknown"}]}]).candidates[0]!.status).toBe("unresolved");
});
