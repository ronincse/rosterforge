// Fictional unit-scoped counts drive existing automatic quantities and pricing.
// No game identities or alternate reconciliation/calculation path are used.
import { expect, it } from "vitest";
import { objectId, type Result } from "@rosterforge/foundation";
import { evaluateRosterCondition, evaluateRosterRepeat, inspectRosterResourceBudgets } from "@rosterforge/evaluation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId, rosterDefinitionKey, type RosterSelection } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import * as sessions from "./roster-session.js";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";

function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }
async function fixture(flag = "", query = "trigger", automatic = true, envelope = "", ambiguous = false) {
  const condition = `<condition type="atLeast" value="1" field="selections" scope="unit" childId="${query}" shared="true" ${flag}>${envelope}</condition>`;
  const trigger = '<selectionEntry id="trigger" name="Switch" type="upgrade"><costs><cost typeId="ore" value="5" /></costs></selectionEntry>';
  const models = `<selectionEntry id="crew" name="Crew" type="model"><constraints>${["min","max"].map(t=>`<constraint id="crew-${t}" type="${t}" field="selections" scope="parent" shared="true" value="2" automatic="${automatic}"/>`).join("")}</constraints><modifiers>${["min","max"].map(t=>`<modifier field="crew-${t}" type="set" value="3"><conditions>${condition}</conditions></modifier>`).join("")}</modifiers></selectionEntry>`;
  const tool = `<selectionEntry id="tool" name="Tool" type="upgrade"><costs><cost typeId="ore" value="2" /></costs><modifiers><modifier type="set" field="ore" value="3"><conditions>${condition}</conditions></modifier></modifiers><selectionEntries>${trigger.replaceAll('id="trigger"','id="nested-trigger"')}</selectionEntries></selectionEntry>`;
  const xml = `<catalogue id="cat" name="Fiction" revision="1" battleScribeVersion="2.03" gameSystemId="sys"><costTypes><costType id="ore" name="Ore" defaultCostLimit="17" /></costTypes><forceEntries><forceEntry id="force" name="Force"/></forceEntries><sharedSelectionEntries>${trigger}${ambiguous?trigger:""}</sharedSelectionEntries><selectionEntries><selectionEntry id="squad" name="Squad" type="unit"><costs><cost typeId="ore" value="10"/></costs><selectionEntries>${models}${tool}<selectionEntry id="box" name="Box" type="upgrade"><entryLinks><entryLink id="nested-link" targetId="trigger" type="selectionEntry"/></entryLinks></selectionEntry><selectionEntry id="inner-unit" name="Inner unit" type="unit"><selectionEntries><selectionEntry id="inner-owner" name="Inner owner" type="upgrade"/></selectionEntries></selectionEntry></selectionEntries><entryLinks><entryLink id="switch-link" targetId="trigger" type="selectionEntry"/></entryLinks></selectionEntry></selectionEntries></catalogue>`;
  const catalogue=ok(await prepareLocalCatalogueLibrary([{filename:"fiction.cat",bytes:new TextEncoder().encode(xml)},{filename:"sys.gst",bytes:new TextEncoder().encode('<gameSystem id="sys" name="System" revision="1" battleScribeVersion="2.03"/>')}],{import:{batchId:"reinforcement",importedAt:"2026-09-14T00:00:00Z"}})).selectableCatalogues[0]!;
  let n=0; const next=()=>selectionOccurrenceId(`r-${++n}`);
  let session=ok(sessions.createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId("fiction"),forceId:forceOccurrenceId("force"),name:"Fiction",createSelectionId:next}));
  const id=next(); session=ok(sessions.addLocalRosterRootSelection(session,sessions.localRosterRootChoices(catalogue)[0]!,{selectionId:id,createSelectionId:next}));
  const add=(s:sessions.LocalRosterSession,parent:typeof id,name:string)=>{const choices=ok(sessions.inspectLocalRosterChildChoices(s,parent));const choice=[...choices.direct.map(c=>c.choice),...choices.groups.flatMap(g=>g.choices)].find(c=>c.name===name)!;return ok(sessions.addLocalRosterChildSelection(s,parent,choice,{selectionId:next(),createSelectionId:next}));};
  const root=(s:sessions.LocalRosterSession)=>s.roster.forces[0]!.selections.find(x=>x.id===id)!;
  const child=(s:sessions.LocalRosterSession,name:string)=>root(s).selections.find(x=>x.name===name)!;
  const crew=(s:sessions.LocalRosterSession)=>root(s).selections.filter(x=>x.name==="Crew").reduce((n,x)=>n+(x.amount??1),0);
  const cost=(s:sessions.LocalRosterSession)=>ok(sessions.evaluateLocalRosterCosts(s)).totals.find(t=>t.typeId==="ore")!.value;
  const choice=ok(sessions.inspectLocalRosterChildChoices(session,id)).direct.find(c=>c.choice.name==="Crew")!.choice;
  const source=choice.modifiers[0]!.conditions[0]!;
  const observe=(s:sessions.LocalRosterSession,owner:RosterSelection,attrs:Record<string,unknown>={})=>ok(evaluateRosterCondition(s.roster,s.catalogue.context,owner,{...source,...attrs,node:{...source.node,attributes:{...source.node.attributes,...Object.fromEntries(Object.entries(attrs).map(([k,v])=>[k,String(v)]))}}}));
  return {session,id,next,add,root,child,crew,cost,observe,source};
}

it.each(["", 'includeChildSelections="false"', 'includeChildSelections="true"'])("counts direct linked unit children with traversal %s and repairs quantities/prices",async flag=>{
 const f=await fixture(flag);let s=f.session;expect(f.crew(s)).toBe(2);expect(f.cost(s)).toBe(10);
 s=f.add(s,f.id,"Tool");expect(f.cost(s)).toBe(12); const before=s;
 s=f.add(s,f.id,"Switch"); expect(f.crew(s)).toBe(3);expect(f.cost(s)).toBe(18);
 expect(f.observe(s,f.child(s,"Crew"))).toMatchObject({observed:1,status:"satisfied",completeness:"complete"});
 expect(f.observe(s,f.child(s,"Tool"))).toMatchObject({observed:1,status:"satisfied"});
 expect(inspectRosterResourceBudgets(s.roster,s.catalogue.context).resources[0]).toMatchObject({value:18,status:"violated",exact:true});
 const history=commitBoundedHistory(createBoundedHistory(before),s);expect(undoBoundedHistory(history).present).toBe(before);expect(redoBoundedHistory(undoBoundedHistory(history)).present).toBe(s);
 for(let i=0;i<3;i++){s=ok(sessions.removeLocalRosterSelection(s,f.child(s,"Switch").id));expect(f.crew(s)).toBe(2);expect(f.cost(s)).toBe(12);expect(f.child(s,"Tool").id).toBe(f.child(before,"Tool").id);s=f.add(s,f.id,"Switch");expect(f.crew(s)).toBe(3);expect(f.cost(s)).toBe(18);}
 for(let i=0;i<3;i++)expect(f.cost(s)).toBe(18);
});
it.each(["", 'includeChildSelections="false"', 'includeChildSelections="true"'])("honors nested traversal %s without counting the unit container",async flag=>{
 const f=await fixture(flag);let s=f.add(f.session,f.id,"Box");s=f.add(s,f.child(s,"Box").id,"Switch");
 expect(f.observe(s,f.child(s,"Crew")).observed).toBe(flag.includes('"true"')?1:0);
 expect(f.observe(s,f.child(s,"Crew"),{childId:objectId("squad")}).observed).toBe(0);
 expect(f.observe(s,f.child(s,"Crew"),{childId:objectId("nested-link"),shared:false}).observed).toBe(flag.includes('"true"')?1:0);
});
it("keeps repeated units, duplicates, nearest nested unit and later edits independent",async()=>{
 const f=await fixture();let s=f.add(f.add(f.session,f.id,"Tool"),f.id,"Switch");s=ok(sessions.duplicateLocalRosterSelection(s,f.id,f.next));
 const copy=s.roster.forces[0]!.selections.find(x=>x.id!==f.id)!;expect(copy.selections.reduce((n,x)=>n+(x.name==="Crew"?(x.amount??1):0),0)).toBe(3);
 s=ok(sessions.removeLocalRosterSelection(s,copy.selections.find(x=>x.name==="Switch")!.id));expect(f.crew(s)).toBe(3);expect(f.cost(s)).toBe(30);
 expect(f.observe(s,s.roster.forces[0]!.selections.find(x=>x.id===copy.id)!.selections.find(x=>x.name==="Tool")!).observed).toBe(0);
 s=f.add(s,f.id,"Inner unit");s=f.add(s,f.child(s,"Inner unit").id,"Inner owner");expect(f.observe(s,f.child(s,"Inner unit").selections[0]!).observed).toBe(0);
 const restored=ok(sessions.restoreLocalRosterSession(s.catalogue,JSON.parse(JSON.stringify(s.roster))));expect(restored.roster).toEqual(s.roster);expect(f.cost(restored)).toBe(30);
});
it("supports reverse upgrade order and preserves deliberately removed nonautomatic models",async()=>{
 const f=await fixture();let s=f.add(f.session,f.id,"Switch");expect(f.crew(s)).toBe(3);expect(f.cost(s)).toBe(15);s=f.add(s,f.id,"Tool");expect(f.cost(s)).toBe(18);s=ok(sessions.removeLocalRosterSelection(s,f.child(s,"Tool").id));expect(f.cost(s)).toBe(15);
 const manual=await fixture("","trigger",false);const manualSelected=manual.add(manual.session,manual.id,"Crew");const edited=ok(sessions.removeLocalRosterSelection(manualSelected,manual.child(manualSelected,"Crew").id));expect(manual.crew(manual.add(edited,manual.id,"Switch"))).toBeLessThan(2);
});
it("keeps unsupported flags and missing identity unresolved",async()=>{
 const f=await fixture();expect(f.observe(f.session,f.child(f.session,"Crew"),{includeChildSelections:"maybe"})).toMatchObject({status:"unresolved",completeness:"incomplete"});
 expect(f.observe(f.session,f.child(f.session,"Crew"),{childId:objectId("absent-definition")})).toMatchObject({status:"unresolved",completeness:"incomplete"});
});

it("does not turn an unresolved containing unit into a complete zero",async()=>{
 const f=await fixture(); const root=f.root(f.session);
 const broken={...f.session,roster:{...f.session.roster,forces:f.session.roster.forces.map(force=>({...force,selections:force.selections.map(x=>x.id===root.id?{...x,definition:{...x.definition,key:rosterDefinitionKey("missing-context")}}:x)}))}};
 expect(f.observe(broken,f.child(broken,"Crew"))).toMatchObject({status:"unresolved",completeness:"incomplete"});
 expect(f.observe(broken,f.child(broken,"Crew")).observed).toBeUndefined();
});
it("keeps exact link identity distinct from the shared definition",async()=>{
 const f=await fixture();const s=f.add(f.session,f.id,"Switch");const owner=f.child(s,"Crew");
 expect(f.observe(s,owner,{childId:objectId("switch-link"),shared:false}).observed).toBe(1);
 expect(f.observe(s,owner,{childId:objectId("trigger"),shared:false}).observed).toBe(0);
 expect(f.observe(s,owner,{childId:objectId("trigger"),shared:true}).observed).toBe(1);
});

it.each([false,true])("withholds unknown unit condition envelopes, trigger=%s",async selected=>{
 const f=await fixture("","trigger",true,"<futureBehavior/>");let s=f.add(f.session,f.id,"Tool");if(selected)s=f.add(s,f.id,"Switch");
 expect(f.observe(s,f.child(s,"Tool"))).toMatchObject({status:"unresolved",completeness:"incomplete"});
 expect(ok(sessions.evaluateLocalRosterCosts(s)).completeness).toBe("incomplete");
});
it("withholds an ambiguous target before counting",async()=>{
 const f=await fixture("","trigger",true,"",true);
 expect(f.observe(f.session,f.root(f.session))).toMatchObject({status:"unresolved",completeness:"incomplete"});
});
it("adapts numeric unit repeats without losing count or unsupported-source evidence",async()=>{
 const f=await fixture();const s=f.add(f.session,f.id,"Switch");
 const repeat={field:"selections",scope:"unit",childId:objectId("trigger"),shared:true,value:1,repeats:2,source:f.source.source,path:f.source.path,node:{attributes:{}}};
 expect(ok(evaluateRosterRepeat(s.roster,s.catalogue.context,f.child(s,"Crew"),repeat))).toMatchObject({observed:1,repetitions:2,status:"exact"});
 expect(ok(evaluateRosterRepeat(s.roster,s.catalogue.context,f.child(s,"Crew"),{...repeat,childId:objectId("squad"),includeChildSelections:true}))).toMatchObject({observed:0,repetitions:0});
 for(const node of [{attributes:{includeChildSelections:"maybe"}},{attributes:{},children:[{kind:"element",name:"futureBehavior",attributes:{}}]}])
  expect(ok(evaluateRosterRepeat(s.roster,s.catalogue.context,f.child(s,"Crew"),{...repeat,node}))).toMatchObject({status:"unresolved",completeness:"incomplete"});
});

it("keeps a matching trigger in another force outside the owning unit",async()=>{
 const f=await fixture();const armed=f.add(f.session,f.id,"Switch");
 const clone=(x:RosterSelection):RosterSelection=>({...x,id:selectionOccurrenceId(`other-${x.id}`),selections:x.selections.map(clone)});
 const other={...armed.roster.forces[0]!,id:forceOccurrenceId("other-force"),selections:armed.roster.forces[0]!.selections.map(clone)};
 const combined={...f.session,roster:{...f.session.roster,forces:[...f.session.roster.forces,other]}};
 expect(f.observe(combined,f.child(combined,"Crew")).observed).toBe(0);
 expect(f.observe(combined,other.selections[0]!.selections.find(x=>x.name==="Crew")!).observed).toBe(1);
});
it("leaves the original roster untouched when a command cannot add the trigger",async()=>{
 const f=await fixture();const before=JSON.stringify(f.session.roster);
 const choice=ok(sessions.inspectLocalRosterChildChoices(f.session,f.id)).direct.find(x=>x.choice.name==="Switch")!.choice;
 const failed=sessions.addLocalRosterChildSelection(f.session,f.id,choice,{selectionId:f.id,createSelectionId:f.next});
 expect(failed.ok).toBe(false);expect(JSON.stringify(f.session.roster)).toBe(before);expect(f.crew(f.session)).toBe(2);expect(f.cost(f.session)).toBe(10);
});
