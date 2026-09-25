// Fictional XML exercises transparent roster requirements through the browser integration boundary.
import { expect, it } from "vitest";
import { type Result } from "@rosterforge/foundation";
import { addRosterSelectionToSelection, rosterDefinitionKeyForSource, setRosterSelectionAmount, forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, addLocalRosterChildSelection, createLocalRosterSession, inspectLocalRosterChildChoices, inspectLocalRosterSupportedValidation, localRosterRootChoices, removeLocalRosterSelection, restoreLocalRosterSession, type LocalRosterSession } from "./roster-session.js";

function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }
const xml = `<catalogue id="fiction" name="Fiction" gameSystemId="system" revision="1" battleScribeVersion="2.03">
<forceEntries><forceEntry id="army" name="Army"/></forceEntries>
<sharedSelectionEntryGroups><selectionEntryGroup id="required" name="Choices"><constraints>
<constraint id="minimum" type="min" field="selections" scope="roster" shared="true" includeChildSelections="true" value="2"/>
<constraint id="maximum" type="max" field="selections" scope="roster" shared="true" includeChildSelections="true" value="2"/>
</constraints><selectionEntries><selectionEntry id="one" name="One" type="upgrade"/><selectionEntry id="two" name="Two" type="upgrade"/><selectionEntry id="three" name="Three" type="upgrade"/></selectionEntries></selectionEntryGroup></sharedSelectionEntryGroups>
<selectionEntries><selectionEntry id="wrapper" name="Setup" type="upgrade"><entryLinks><entryLink id="group-link" type="selectionEntryGroup" targetId="required"/></entryLinks>
<selectionEntryGroups><selectionEntryGroup id="optional" name="Choices"><selectionEntries><selectionEntry id="unrelated" name="One" type="upgrade"/></selectionEntries></selectionEntryGroup></selectionEntryGroups>
</selectionEntry></selectionEntries></catalogue>`;
async function fixture(source = xml) {
  const library = ok(await prepareLocalCatalogueLibrary([
    {filename:"fiction.cat",bytes:new TextEncoder().encode(source)},
    {filename:"fiction.gst",bytes:new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"/>')},
  ], {import:{batchId:"groups",importedAt:"2026-09-25T00:00:00Z"}}));
  const catalogue = library.selectableCatalogues[0]!;
  let sequence=0;
  const next=()=>selectionOccurrenceId(`selection-${++sequence}`);
  const empty=ok(createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId("fiction"),forceId:forceOccurrenceId("army"),name:"Fiction",createSelectionId:next}));
  const root=localRosterRootChoices(catalogue).find(c=>c.materialized.id==="wrapper")!;
  const addRoot=(s:LocalRosterSession)=>ok(addLocalRosterRootSelection(s,root,{selectionId:next(),createSelectionId:next}));
  const session=addRoot(empty);
  const owner=session.roster.forces[0]!.selections[0]!.id;
  const group=(s:LocalRosterSession,id=owner)=>ok(inspectLocalRosterChildChoices(s,id)).groups.find(g=>g.group.definitionId==="required")!;
  const add=(s:LocalRosterSession,name:string,id=owner)=>ok(addLocalRosterChildSelection(s,id,group(s,id).choices.find(c=>c.name===name)!,{selectionId:next(),createSelectionId:next}));
  const bounds=(s:LocalRosterSession)=>ok(inspectLocalRosterSupportedValidation(s)).status.structural.bounds.filter(b=>b.kind==="group"&&b.group.definitionId==="required");
  return {session,owner,group,add,addRoot,bounds,catalogue,library};
}

it("reports an empty shared roster group as required without making arbitrary choices",async()=>{
  const f=await fixture();
  expect(f.session.roster.forces[0]!.selections[0]!.selections).toHaveLength(0);
  expect(f.group(f.session)).toMatchObject({minimum:2,maximum:2,remaining:2,completeness:"complete"});
  expect(f.bounds(f.session)).toMatchObject([{minimum:2,maximum:2,selectedCount:0,status:"violated",completeness:"complete"}]);
});

it("shares exact requirements across wrappers and keeps local controls independent",async()=>{
  const f=await fixture(); let s=f.add(f.session,"One");
  expect(f.group(s).remaining).toBe(1);expect(f.bounds(s)[0]!.status).toBe("violated");
  s=f.addRoot(s);const other=s.roster.forces[0]!.selections[1]!.id;
  s=f.add(s,"Two",other);
  expect(f.group(s).remaining).toBe(0);expect(f.group(s,other).remaining).toBe(0);
  expect(f.group(s).selected).toHaveLength(1);expect(f.group(s,other).selected).toHaveLength(1);
  expect(f.bounds(s)).toMatchObject([{selectedCount:2,status:"satisfied"}]);
  // Production API permits malformed/restored excess; this is not a UI action.
  s=f.add(s,"Three");expect(f.bounds(s)).toMatchObject([{selectedCount:3,status:"violated"}]);
  s=ok(removeLocalRosterSelection(s,s.roster.forces[0]!.selections[0]!.selections[0]!.id));
  expect(f.bounds(s)[0]!.status).toBe("satisfied");
  expect(f.bounds(ok(restoreLocalRosterSession(f.catalogue,s.roster)))[0]!.selectedCount).toBe(2);
  expect(f.group(f.session).remaining).toBe(2);
});

it.each([['shared="true"','shared="false"'],['scope="roster"','scope="unit"'],['includeChildSelections="true"','includeChildSelections="false"']])("withholds unsupported group query %s -> %s",async(from,to)=>{
 const f=await fixture(xml.replaceAll(from,to));
 expect(f.group(f.session).completeness).toBe("incomplete");expect(f.group(f.session).minimum).toBeUndefined();
 expect(f.bounds(f.session)).toMatchObject([{status:"unresolved",completeness:"incomplete"}]);
});

it("leaves a genuinely optional same-name group optional",async()=>{
 const f=await fixture();const optional=ok(inspectLocalRosterChildChoices(f.session,f.owner)).groups.find(g=>g.group.id==="optional")!;
 expect(optional).toMatchObject({minimum:0,maximum:Infinity,remaining:0,completeness:"complete"});
});

it("counts member amounts, excludes unrelated names and wrapper amounts, and preserves undo snapshots",async()=>{
 const f=await fixture(); let s=f.add(f.session,"One");
 const chosen=s.roster.forces[0]!.selections[0]!.selections[0]!;
 s=ok(restoreLocalRosterSession(f.catalogue,ok(setRosterSelectionAmount(s.roster,chosen.id,2))));
 s=ok(restoreLocalRosterSession(f.catalogue,ok(setRosterSelectionAmount(s.roster,f.owner,7))));
 const optional=ok(inspectLocalRosterChildChoices(s,f.owner)).groups.find(g=>g.group.id==="optional")!;
 s=ok(addLocalRosterChildSelection(s,f.owner,optional.choices[0]!,{selectionId:selectionOccurrenceId("unrelated")}));
 expect(f.bounds(s)).toMatchObject([{selectedCount:2,status:"satisfied"}]);
 const history=commitBoundedHistory(createBoundedHistory(f.session),s);
 expect(f.bounds(undoBoundedHistory(history).present)[0]!.status).toBe("violated");
 expect(f.bounds(redoBoundedHistory(undoBoundedHistory(history)).present)[0]!.status).toBe("satisfied");
 const before=JSON.stringify(s.roster);for(let i=0;i<3;i++) f.bounds(s);expect(JSON.stringify(s.roster)).toBe(before);
});

it("retains incomplete requirements through saved draft restoration without changing source bytes",async()=>{
 const f=await fixture();const source=f.library.importReport;
 const draft=ok(createLocalRosterDraft({id:"fiction",createdAt:source.importedAt,updatedAt:source.importedAt,catalogueKey:f.catalogue.key,roster:f.session.roster,import:{batchId:source.batchId,importedAt:source.importedAt,files:source.files.map(x=>({filename:x.source.filename,bytes:x.sourceBytes,sourceId:x.source.sourceId,sourceKind:x.source.kind}))}}));
 const decoded=ok(decodeLocalRosterDraft(structuredClone(draft)));
 const library=ok(await prepareLocalCatalogueLibrary(decoded.import.files,{import:{batchId:decoded.import.batchId,importedAt:decoded.import.importedAt}}));
 const s=ok(restoreLocalRosterSession(library.selectableCatalogues[0]!,decoded.roster));
 expect(s.roster).toEqual(f.session.roster);expect(f.bounds(s)[0]!.status).toBe("violated");
 expect(decoded.import.files.map(x=>Array.from(x.bytes))).toEqual(source.files.map(x=>Array.from(x.sourceBytes)));
});

it("counts retained wrappers once and suppresses duplicate structural/general findings",async()=>{
 const f=await fixture();const group=f.group(f.session).group, child=f.group(f.session).choices[0]!;
 const ref=(c:typeof child)=>({kind:c.kind,key:rosterDefinitionKeyForSource(c.occurrence.source.sourceId,c.occurrence.path)});
 let roster=ok(addRosterSelectionToSelection(f.session.roster,f.owner,{id:selectionOccurrenceId("retained"),definition:ref(group)}));
 roster=ok(addRosterSelectionToSelection(roster,selectionOccurrenceId("retained"),{id:selectionOccurrenceId("leaf"),definition:ref(child)}));
 const s=ok(restoreLocalRosterSession(f.catalogue,roster));
 expect(f.bounds(s)).toMatchObject([{selectedCount:1,status:"violated"}]);
 const status=ok(inspectLocalRosterSupportedValidation(s)).status;
 expect(status.findings.filter(f=>f.kind==="selectionConstraint"&&f.report.constraint.id==="minimum")).toHaveLength(0);
 expect(status.findings.filter(f=>f.kind==="structural"&&f.report.kind==="group"&&f.report.group.definitionId==="required")).toHaveLength(1);
});

it.each([
 ['context-dependent modifier',xml.replace('</constraints>','</constraints><modifiers><modifier type="set" field="minimum" value="3"><conditions><condition type="atLeast" field="selections" scope="parent" childId="two" value="1"/></conditions></modifier></modifiers>')],
 ['modifier',xml.replace('</constraints>','</constraints><modifiers><modifier type="invented" field="minimum" value="2"/></modifiers>')],
 ['ambiguous identity',xml.replace('<sharedSelectionEntryGroups>','<sharedSelectionEntryGroups><selectionEntryGroup id="required" name="Ambiguous"/>')],
 ['missing group',xml.replace('targetId="required"','targetId="missing"')],
 ['unknown attribute',xml.replaceAll('scope="roster"','scope="roster" invented="true"')],
])("does not certify unsupported %s",async(_label,source)=>{
 const f=await fixture(source);
 const result=inspectLocalRosterChildChoices(f.session,f.owner);
 if(result.ok && result.value.groups.some(g=>g.group.definitionId==="required")) expect(f.group(f.session).completeness).toBe("incomplete");
 expect(ok(inspectLocalRosterSupportedValidation(f.session)).status.completeness).toBe("incomplete");
});

it("does not claim general multi-force support",async()=>{
 const f=await fixture();const force=f.session.roster.forces[0]!;
 const roster={...f.session.roster,forces:[force,{...force,id:forceOccurrenceId("other"),selections:[]}]};
 const status=ok(inspectLocalRosterSupportedValidation({...f.session,roster})).status;
 expect(status.completeness).toBe("incomplete");
 expect(f.group({...f.session,roster}).completeness).toBe("incomplete");
});

it("withholds a shared bound targeted by a more distant selected ancestor",async()=>{
 const source=xml.replace('<selectionEntries><selectionEntry id="wrapper"', '<selectionEntries><selectionEntry id="outer" name="Outer" type="unit"><modifiers><modifier type="set" field="minimum" value="3"/></modifiers><selectionEntries><selectionEntry id="wrapper"').replace('</selectionEntry></selectionEntries></catalogue>','</selectionEntry></selectionEntries></selectionEntry></selectionEntries></catalogue>');
 const library=ok(await prepareLocalCatalogueLibrary([{filename:"ancestor.cat",bytes:new TextEncoder().encode(source)},{filename:"system.gst",bytes:new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"/>')}],{import:{batchId:"ancestor",importedAt:"2026-09-25T00:00:00Z"}}));
 const cat=library.selectableCatalogues[0]!;
 let s=ok(createLocalRosterSession(cat,cat.context.forces.definitions[0]!,{rosterId:rosterId("ancestor"),forceId:forceOccurrenceId("f"),name:"Ancestor"}));
 s=ok(addLocalRosterRootSelection(s,localRosterRootChoices(cat)[0]!,{selectionId:selectionOccurrenceId("outer")}));
 const choice=ok(inspectLocalRosterChildChoices(s,selectionOccurrenceId("outer"))).direct[0]!.choice;
 s=ok(addLocalRosterChildSelection(s,selectionOccurrenceId("outer"),choice,{selectionId:selectionOccurrenceId("inner")}));
 expect(ok(inspectLocalRosterChildChoices(s,selectionOccurrenceId("inner"))).groups.find(g=>g.group.definitionId==="required")!.completeness).toBe("incomplete");
});
