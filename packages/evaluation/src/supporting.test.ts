// Regression coverage for occurrence-based attachments and inherited effects.
import { expect, it } from "vitest";
import { parseBattleScribeJson } from "@rosterforge/battlescribe-data";
import { composeBattleScribeCatalogueContexts, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { sourceId } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterDefinitionKeyForSource, rosterId, selectionOccurrenceId, type Roster, type RosterSelection } from "@rosterforge/roster-model";
import { inspectRosterAssociationChoices } from "./associations.js";
import { evaluateRosterProfileCharacteristics } from "./characteristics.js";
import { inspectRosterSelectionConstraints, inspectRosterSelectionConstraintWithSelectionConditions } from "./constraints.js";


it("counts incoming matching source occurrences independently of target model quantity",()=>{
 const bound={id:"incoming",type:"max",field:"associations",scope:"self",shared:true,childId:"source-role",value:1};
 const f=buildScenario({},[filter],[],{}, {constraints:[bound]});
 const leader=f.selections[0]!,unit={...f.selections[1]!,amount:5};
 const second={...leader,id:selectionOccurrenceId("second-source")};
 const definitionKey=inspectRosterAssociationChoices(f.roster,f.context,leader)[0]!.key;
 const edge={sourceId:leader.id,targetId:unit.id,definitionKey};
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader,unit,second]}],associations:[edge,edge,{...edge,sourceId:second.id}]};
 const result=inspectRosterSelectionConstraintWithSelectionConditions(roster,f.context,unit,f.parsed.projection.selectionEntries[1]!.constraints[0]!);
 expect(result.ok && result.value).toMatchObject({observed:2,status:"violated",completeness:"complete"});
});

it.each(["base","increment","divide"])("uses evaluated enhancement currency across the association component (%s)",operation=>{
 const bound={id:"group-cost",type:"max",field:"enhancement-cost",scope:"root-entry",shared:true,childId:"any",value:1,includeChildSelections:true,includeChildForces:false,traverseAssociationGroup:true};
 const f=buildScenario({},[filter],[],{costs:[{name:"Synthetic currency",typeId:"enhancement-cost",value:1}],...(operation!=="base"?{modifiers:[{type:operation,field:"enhancement-cost",value:operation==="divide"?2:1}]}:{})},{constraints:[bound]});
 const leader=f.selections[0]!,unit=f.selections[1]!,second={...leader,id:selectionOccurrenceId("second-source")};
 const unrelated={...leader,id:selectionOccurrenceId("unrelated-source")};
 const definitionKey=inspectRosterAssociationChoices(f.roster,f.context,leader)[0]!.key;
 const edge={sourceId:leader.id,targetId:unit.id,definitionKey};
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader,unit,second,unrelated]}],associations:[edge,edge,{...edge,sourceId:second.id}]};
 // The no-group self check separates an unsupported numeric operation from scope failures.
 const source=f.parsed.projection.selectionEntries[1]!.constraints[0]!;
 const own=inspectRosterSelectionConstraintWithSelectionConditions(roster,f.context,leader,{...source,scope:"self",node:{attributes:{}},includeChildSelections:false});
 if(operation==="divide")expect(own.ok && own.value).toMatchObject({completeness:"incomplete",status:"unresolved"});
 else expect(own.ok && own.value).toMatchObject({observed:operation==="increment"?2:1,completeness:"complete"});
 const result=inspectRosterSelectionConstraintWithSelectionConditions(roster,f.context,unit,source);
 if(operation==="divide")expect(result.ok && result.value).toMatchObject({status:"unresolved",completeness:"incomplete"});
 else expect(result.ok && result.value).toMatchObject({observed:operation==="increment"?4:2,status:"violated",completeness:"complete"});
});

it("routes one gated append to an associated body's weapon and clears it on detach",()=>{
 const f=buildScenario({},[filter],[],{
  modifierGroups:[{type:"and",conditions:[{type:"atLeast",field:"associations",scope:"self",childId:"any",shared:true,value:1,includeChildSelections:false}],modifiers:[{type:"append",field:"keywords",value:"Buff",affects:"self.entries.group.recursive.profiles.Weapons",join:", "}]}],
 },{selectionEntries:[{id:"body-gun",name:"Body gun",type:"upgrade",profiles:[{id:"body-gun-profile",name:"Body gun",typeId:"weapons",characteristics:[{name:"Keywords",typeId:"keywords",$text:"Base"}]}]}]});
 const leader=f.selections[0]!,definition=f.parsed.projection.selectionEntries[1]!.selectionEntries[0]!;
 const gun: RosterSelection={id:selectionOccurrenceId("body-gun"),name:"Body gun",definition:{kind:"selectionEntry",key:rosterDefinitionKeyForSource(definition.source.sourceId,definition.path),sourceId:definition.id!},selections:[]};
 const unit={...f.selections[1]!,selections:[gun]};
 const definitionKey=inspectRosterAssociationChoices(f.roster,f.context,leader)[0]!.key;
 const edge={sourceId:leader.id,targetId:unit.id,definitionKey};
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader,unit]}]};
 const check=(current:Roster)=>{const r=evaluateRosterProfileCharacteristics(current,f.context,gun,definition.profiles[0]!);return r.ok?r.value.characteristics[0]!.value:"failed";};
 expect(check(roster)).toBe("Base");
 expect(check({...roster,associations:[edge,edge]})).toBe("Base, Buff");
 expect(check({...roster,associations:[]})).toBe("Base");
});

function buildScenario(extra: Record<string, unknown> = {}, conditions: unknown[] = [], conditionGroups: unknown[] = [], entryExtra: Record<string, unknown> = {}, unitExtra: Record<string, unknown> = {}, otherExtra: Record<string, unknown> = {}) {
  const parsed = parseBattleScribeJson(new TextEncoder().encode(JSON.stringify({catalogue:{
    id:"catalogue",gameSystemId:"system",name:"Association filters",battleScribeVersion:"2.03",forceEntries:[{id:"force",name:"Army"}],
    costTypes:[{id:"enhancement-cost",name:"Synthetic enhancement currency",hidden:true}],profileTypes:[{id:"weapons",name:"Weapons",characteristicTypes:[{id:"keywords",name:"Keywords"}]}],categoryEntries:[{id:"bodyguard",name:"Bodyguard"},{id:"source-role",name:"Source role"}],
    selectionEntries:[
      {id:"leader",name:"Leader",type:"model",categoryLinks:[{id:"role",targetId:"source-role"}],associations:[{id:"leading",name:"Leading",min:0,max:1,scope:"force",childId:"unit",includeChildSelections:true,action:"group",conditions,conditionGroups,...extra}],...entryExtra},
      {id:"unit",name:"Bodyguard unit",type:"unit",categoryLinks:[{id:"unit-category",targetId:"bodyguard"}],...unitExtra},
      {id:"model",name:"Bodyguard model",type:"model",categoryLinks:[{id:"model-category",targetId:"bodyguard"}],...otherExtra},
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
it("withholds a routed append when its enclosing source group contains unknown behavior",()=>{
 const f=buildScenario({},[filter],[],{
  selectionEntries:[{id:"gun",name:"Gun",type:"upgrade",profiles:[{id:"p",name:"Gun",typeId:"weapons",characteristics:[{name:"Keywords",typeId:"keywords",$text:"Base"}]}]}],
  modifierGroups:[{type:"and",futureGate:[{value:true}],modifiers:[{type:"append",field:"keywords",value:"Buff",affects:"self.entries.group.recursive.profiles.Weapons",join:", "}]}],
 });
 const definition=f.parsed.projection.selectionEntries[0]!.selectionEntries[0]!;
 const gun:RosterSelection={id:selectionOccurrenceId("gun"),definition:{kind:"selectionEntry",key:rosterDefinitionKeyForSource(definition.source.sourceId,definition.path),sourceId:definition.id!},selections:[]};
 const leader={...f.selections[0]!,selections:[gun]};
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader]}]};
 const r=evaluateRosterProfileCharacteristics(roster,f.context,gun,definition.profiles[0]!);
 expect(r.ok && r.value).toMatchObject({completeness:"incomplete"});
 if(r.ok)expect(r.value.characteristics[0]!.value).toBeUndefined();
});

it("reports required outgoing min/max through attach, retarget, excess and detach",()=>{
 const f=buildScenario({min:1,defaultSelectionEntryId:"none"},[filter]);
 const leader=f.selections[0]!,first=f.selections[1]!,second={...first,id:selectionOccurrenceId("second-body")};
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader,first,second]}]};
 const key=inspectRosterAssociationChoices(roster,f.context,leader)[0]!.key;
 const edge={sourceId:leader.id,targetId:first.id,definitionKey:key};
 const check=(r:Roster)=>{const v=inspectRosterSelectionConstraints(r,f.context,leader,{inspectionScope:"selectionConditions"}); if(!v.ok)throw Error("inspection"); return v.value.constraints.filter(c=>c.constraint.associationName).map(c=>({type:c.constraint.type,status:c.status,observed:c.observed,completeness:c.completeness}));};
 const valid=[{type:"min",status:"satisfied",observed:1,completeness:"complete"},{type:"max",status:"satisfied",observed:1,completeness:"complete"}];
 expect(check(roster)).toEqual([{type:"min",status:"violated",observed:0,completeness:"complete"},{type:"max",status:"satisfied",observed:0,completeness:"complete"}]);
 expect(check({...roster,associations:[edge,edge]})).toEqual(valid);
 expect(check({...roster,associations:[{...edge,targetId:second.id}]})).toEqual(valid);
 expect(check({...roster,associations:[edge,{...edge,targetId:second.id}]}).find(c=>c.type==="max")).toMatchObject({observed:2,status:"violated"});
 expect(check({...roster,associations:[]})).toEqual(check(roster));
 expect(check({...roster,associations:[{...edge,targetId:selectionOccurrenceId("missing")}]}).every(c=>c.status==="unresolved" && c.completeness==="incomplete")).toBe(true);
});

it.each([{min:1,max:2,defaultSelectionEntryId:"none"},{min:1,defaultSelectionEntryId:"invented-default"},{min:1,defaultSelectionEntryId:"none",futureLimit:true}])("withholds unsupported outgoing bound shape %j",extra=>{
 const f=buildScenario(extra,[filter]);
 const r=inspectRosterSelectionConstraints(f.roster,f.context,f.selections[0]!,{inspectionScope:"selectionConditions"});
 expect(r.ok && r.value).toMatchObject({completeness:"incomplete"});
 if(r.ok)expect(r.value.constraints.filter(c=>c.constraint.associationName).every(c=>c.status==="unresolved")).toBe(true);
});

it("routes through source -> body <- other source once and clears stale recipients on retarget",()=>{
 const weapon=(id:string)=>({id,name:id,type:"upgrade",profiles:[{id:id+"-p",name:id,typeId:"weapons",characteristics:[{name:"Keywords",typeId:"keywords",$text:"Base"}]}]});
 const f=buildScenario({min:1,defaultSelectionEntryId:"none"},[filter],[],{
 selectionEntries:[weapon("leader-gun")],
 modifierGroups:[{type:"and",conditions:[{type:"atLeast",field:"associations",scope:"self",childId:"any",shared:true,value:1,includeChildSelections:false}],modifiers:[{type:"append",field:"keywords",value:"Buff",affects:"self.entries.group.recursive.profiles.Weapons",join:", "}]}],
 },{selectionEntries:[weapon("body-gun")]},{
 selectionEntries:[weapon("other-gun")],associations:[{id:"other-leading",min:0,max:1,scope:"force",childId:"unit",action:"group",includeChildSelections:true,conditions:[filter]}],
 });
 const definitions=f.parsed.projection.selectionEntries.map(d=>d.selectionEntries[0]!);
 const guns=definitions.map((d,i):RosterSelection=>({id:selectionOccurrenceId("gun-"+i),definition:{kind:"selectionEntry",key:rosterDefinitionKeyForSource(d.source.sourceId,d.path),sourceId:d.id!},selections:[]}));
 const selected=f.selections.map((s,i)=>({...s,selections:[guns[i]!]}));
 const leader=selected[0]!,body=selected[1]!,other=selected[2]!;
 const replacementGun={...guns[1]!,id:selectionOccurrenceId("new-body-gun")};
 const replacement={...body,id:selectionOccurrenceId("new-body"),selections:[replacementGun]};
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader,body,other,replacement]}]};
 const firstKey=inspectRosterAssociationChoices(roster,f.context,leader)[0]!.key, otherKey=inspectRosterAssociationChoices(roster,f.context,other)[0]!.key;
 const firstEdge={sourceId:leader.id,targetId:body.id,definitionKey:firstKey},otherEdge={sourceId:other.id,targetId:body.id,definitionKey:otherKey};
 const values=(r:Roster)=>[...guns,replacementGun].map((gun,i)=>{const result=evaluateRosterProfileCharacteristics(r,f.context,gun,definitions[i===3?1:i]!.profiles[0]!);expect(result.ok && result.value.completeness).toBe("complete");return result.ok?result.value.characteristics[0]!.value:"failed";});
 expect(values(roster)).toEqual(["Base","Base","Base","Base"]);
 expect(values({...roster,associations:[firstEdge,otherEdge,firstEdge]})).toEqual(["Base, Buff","Base, Buff","Base, Buff","Base"]);
 expect(values({...roster,associations:[{...firstEdge,targetId:replacement.id},otherEdge]})).toEqual(["Base, Buff","Base","Base","Base, Buff"]);
 expect(values({...roster,associations:[otherEdge]})).toEqual(["Base","Base","Base","Base"]);
});
it("does not certify outgoing required bounds against an ambiguous target occurrence ID",()=>{
 const f=buildScenario({min:1,defaultSelectionEntryId:"none"},[filter]);
 const leader=f.selections[0]!,unit=f.selections[1]!;
 const key=inspectRosterAssociationChoices(f.roster,f.context,leader)[0]!.key;
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader,unit,{...unit}]}],associations:[{sourceId:leader.id,targetId:unit.id,definitionKey:key}]};
 const r=inspectRosterSelectionConstraints(roster,f.context,leader,{inspectionScope:"selectionConditions"});
 expect(r.ok && r.value).toMatchObject({completeness:"incomplete"});
 if(r.ok)expect(r.value.constraints.filter(c=>c.constraint.associationName).every(c=>c.status==="unresolved")).toBe(true);
});

it("does not grant eligibility when a raw conditions collection has unknown children",()=>{
 const f=buildScenario({},[filter]);
 const a=f.parsed.projection.selectionEntries[0]!.associations[0]!;
 const collection=a.node.children.find(c=>c.kind==="element" && c.name==="conditions")!;
 // Represents an additive unknown child retained by the parser, not a typed predicate.
 (collection as unknown as {children:unknown[]}).children.push({kind:"element",name:"futurePredicate",attributes:{},children:[]});
 expect(inspectRosterAssociationChoices(f.roster,f.context,f.selections[0]!)[0]!).toMatchObject({supported:false,candidates:[]});
});

it("does not contaminate an unrelated force profile with an unresolved group edge",()=>{
 const f=buildScenario({},[filter],[],{modifiers:[{type:"append",field:"keywords",value:"Buff",affects:"self.entries.group.recursive.profiles.Weapons",join:", "}]},
 {selectionEntries:[{id:"gun",type:"upgrade",name:"Gun",profiles:[{id:"p",name:"Gun",typeId:"weapons",characteristics:[{name:"Keywords",typeId:"keywords",$text:"Base"}]}]}]});
 const leader=f.selections[0]!,definition=f.parsed.projection.selectionEntries[1]!.selectionEntries[0]!;
 const gun:RosterSelection={id:selectionOccurrenceId("gun"),definition:{kind:"selectionEntry",key:rosterDefinitionKeyForSource(definition.source.sourceId,definition.path),sourceId:definition.id!},selections:[]};
 const unit={...f.selections[1]!,selections:[gun]};
 const key=inspectRosterAssociationChoices(f.roster,f.context,leader)[0]!.key;
 const roster={...f.roster,forces:[{...f.roster.forces[0]!,selections:[leader]},{...f.roster.forces[0]!,id:forceOccurrenceId("other"),selections:[unit]}],associations:[{sourceId:leader.id,targetId:selectionOccurrenceId("missing"),definitionKey:key}]};
 const r=evaluateRosterProfileCharacteristics(roster,f.context,gun,definition.profiles[0]!);
 expect(r.ok && r.value).toMatchObject({completeness:"complete"});
 if(r.ok)expect(r.value.characteristics[0]!.value).toBe("Base");
});




it("offers the measured required default-none source association",()=>{
 expect(scenario({min:1,defaultSelectionEntryId:"none"},[filter])).toMatchObject({supported:true,candidates:[{status:"satisfied"}]});
});
it("keeps source eligibility independent of neutral sortIndex metadata",()=>{
 expect(scenario({},[{...filter,sortIndex:14}]).candidates[0]!.status).toBe("satisfied");
});
it("does not apply a grouped routed weapon append before its source gate is satisfied",()=>{
 const fixture=buildScenario({},[filter],[],{
  selectionEntries:[{id:"gun",name:"Gun",type:"upgrade",profiles:[{id:"gun-profile",name:"Gun",typeId:"weapons",characteristics:[{name:"Keywords",typeId:"keywords",$text:""}]}]}],
  modifierGroups:[{type:"and",conditions:[{type:"atLeast",field:"associations",scope:"self",childId:"any",shared:true,value:1,includeChildSelections:false}],modifiers:[{type:"append",field:"keywords",value:"Buff",affects:"self.entries.group.recursive.profiles.Weapons",join:", "}]}],
 });
 const leader=fixture.selections[0]!;
 const weaponDefinition=fixture.parsed.projection.selectionEntries[0]!.selectionEntries[0]!;
 const weapon: RosterSelection={id:selectionOccurrenceId("gun"),name:"Gun",definition:{kind:"selectionEntry",key:rosterDefinitionKeyForSource(weaponDefinition.source.sourceId,weaponDefinition.path),sourceId:weaponDefinition.id!},selections:[]};
 const owner={...leader,selections:[weapon]};
 const roster={...fixture.roster,forces:[{...fixture.roster.forces[0]!,selections:[owner,...fixture.selections.slice(1)]}]};
 const result=evaluateRosterProfileCharacteristics(roster,fixture.context,weapon,weaponDefinition.profiles[0]!);
 expect(result.ok).toBe(true);
 if(result.ok)expect(result.value.characteristics[0]!.value).toBe("");
});
