// Synthetic filter tests keep unsupported imported shapes from granting targets.
import { expect, it } from "vitest";
import { parseBattleScribeJson } from "@rosterforge/battlescribe-data";
import { composeBattleScribeCatalogueContexts, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { sourceId } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterDefinitionKeyForSource, rosterId, selectionOccurrenceId, type Roster, type RosterSelection } from "@rosterforge/roster-model";
import { inspectRosterAssociationChoices } from "./associations.js";
import { evaluateRosterCondition } from "./conditions.js";
import { effectiveRosterCategories } from "./effective-categories.js";
import { objectId } from "@rosterforge/foundation";

function buildScenario(extra: Record<string, unknown> = {}, conditions: unknown[] = [], conditionGroups: unknown[] = []) {
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
  return { roster, context, selections, parsed: parsed.value };
}

function scenario(extra: Record<string, unknown> = {}, conditions: unknown[] = [], conditionGroups: unknown[] = []) {
  const { roster, context, selections } = buildScenario(extra, conditions, conditionGroups);
  return inspectRosterAssociationChoices(roster, context, selections[0]!)[0]!;
}

const filter = {type:"instanceOf",field:"selections",scope:"self",childId:"bodyguard",value:1,shared:true};

it("offers required single targets while none remains an unassigned default", () => {
  expect(scenario({min:1,defaultSelectionEntryId:"none",sortIndex:2},[filter])).toMatchObject({supported:true,candidates:[{status:"satisfied"}]});
  expect(scenario({min:1,defaultSelectionEntryId:"unknown"},[filter]).supported).toBe(false);
});

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
  // Unknown raw filter structure rejects the declaration for saved-edge queries
  // too, rather than being projected away into an apparently supported edge.
  expect(scenario({},[{...filter,futureChildren:[{id:"unknown"}]}])).toMatchObject({supported:false,candidates:[]});
  expect(scenario({},[],[{type:"and",conditions:[filter],futureChildren:[{id:"unknown"}]}])).toMatchObject({supported:false,candidates:[]});
});

it("counts direct attached counterparts, not the owner or the target's model amount", () => {
  const { roster, context, selections, parsed } = buildScenario({}, [filter]);
  const [leader, unit] = selections as [RosterSelection, RosterSelection, RosterSelection];
  const definitionKey = inspectRosterAssociationChoices(roster, context, leader)[0]!.key;
  const condition = {
    type: "lessThan", field: "associations", scope: "self", shared: true,
    childId: objectId("bodyguard"), value: "1", source: parsed.projection.source,
    path: [...parsed.projection.path, "test-condition"], node: { attributes: {} },
  };
  const check = (current: Roster, owner = leader, query = condition) => {
    const result = evaluateRosterCondition(current, context, owner, query, { effectiveCategories: effectiveRosterCategories(current, context) });
    if (!result.ok) throw new Error("Evaluation failed");
    return result;
  };
  expect(check(roster).value).toMatchObject({ status: "satisfied", observed: 0, completeness: "complete" });
  const attached = { ...roster, associations: [{ sourceId: leader.id, targetId: unit.id, definitionKey }] };
  expect(check(attached).value).toMatchObject({ status: "unsatisfied", observed: 1, completeness: "complete" });
  expect(check(attached, unit, { ...condition, childId: objectId("source-role") }).value).toMatchObject({ status: "unsatisfied", observed: 1, completeness: "complete" });
  const multiplied = { ...attached, forces: [{ ...attached.forces[0]!, selections: [leader, { ...unit, amount: 8 }, selections[2]!] }] };
  expect(check(multiplied).value.observed).toBe(1);
  expect(check({ ...attached, associations: [...attached.associations, ...attached.associations] }).value.observed).toBe(1);
  expect(check(roster, leader, { ...condition, childId: objectId("source-role") }).value.observed).toBe(0);
  expect(check(attached, selections[2]!).value.observed).toBe(0);
});

it("keeps malformed association edges and wider query shapes unresolved", () => {
  const { roster, context, selections, parsed } = buildScenario();
  const leader = selections[0]!;
  const key = inspectRosterAssociationChoices(roster, context, leader)[0]!.key;
  const condition = {
    type: "atLeast", field: "associations", scope: "self", shared: true,
    childId: objectId("any"), value: "1", source: parsed.projection.source,
    path: [...parsed.projection.path, "test-condition"], node: { attributes: {} },
  };
  for (const edge of [
    { sourceId: leader.id, targetId: selectionOccurrenceId("missing"), definitionKey: key },
    { sourceId: leader.id, targetId: selections[2]!.id, definitionKey: key },
    { sourceId: leader.id, targetId: selections[1]!.id, definitionKey: rosterDefinitionKeyForSource("missing", []) },
  ]) {
    const result = evaluateRosterCondition({ ...roster, associations: [edge] }, context, leader, condition);
    expect(result.ok && result.value).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  }
  for (const query of [
    { ...condition, scope: "roster" },
    { ...condition, includeChildSelections: true },
    { ...condition, includeChildForces: true },
    { ...condition, node: { attributes: { traverseAssociationGroup: "true" } } },
    { ...condition, node: { attributes: { includeChildSelections: "garbage" } } },
    { ...condition, node: { attributes: {}, children: [{ kind: "element", name: "futureBehavior" }] } },
  ]) {
    const result = evaluateRosterCondition(roster, context, leader, query);
    expect(result.ok && result.value).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  }
});

it("does not certify stored attachments whose definition has become unsupported", () => {
  for (const extra of [{ max: 2 }, { futureBehavior: true }, { hidden: "garbage" }, { modifiers: [{ type: "set", field: "hidden", value: true }] }]) {
    const { roster, context, selections, parsed } = buildScenario(extra);
    const leader = selections[0]!;
    const definitionKey = inspectRosterAssociationChoices(roster, context, leader)[0]!.key;
    const condition = { type: "atLeast", field: "associations", scope: "self", shared: true, childId: objectId("any"), value: "1", source: parsed.projection.source, path: parsed.projection.path, node: { attributes: {} } };
    const result = evaluateRosterCondition({ ...roster, associations: [{ sourceId: leader.id, targetId: selections[1]!.id, definitionKey }] }, context, leader, condition);
    expect(result.ok && result.value).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  }
});
