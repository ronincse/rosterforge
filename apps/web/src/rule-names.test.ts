// Fictional XML traverses ingestion, graph materialization and shared references.
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";
import { createRosterPrintViewModel, renderRosterPrintDocument } from "./roster-print.js";
import { printedExplanations } from "./army-reference-sharing.js";
import { expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices, duplicateLocalRosterSelection, setLocalRosterSelectionAmount, restoreLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation } from "./roster-session.js";
import { createUnitReferenceModel } from "./unit-reference-model.js";
import { inspectLocalRule, ruleNameQualification } from "./rule-inspection.js";
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(r.diagnostics.map(d=>d.code).join(",")); return r.value; }
async function setup(operations: string, definitionOperations = "", linkName: string | null = "Echo", extraLinks = "") {
 const library=ok(await prepareLocalCatalogueLibrary([
  {filename:"names.gst",bytes:new TextEncoder().encode('<gameSystem id="g" name="G" revision="1" battleScribeVersion="2.03"><forceEntries><forceEntry id="f" name="F"/></forceEntries></gameSystem>')},
  {filename:"names.cat",bytes:new TextEncoder().encode(`<catalogue id="c" name="C" revision="1" gameSystemId="g" battleScribeVersion="2.03"><sharedRules><rule id="shared" name="Original"><description>Shared explanation X.</description>${definitionOperations}</rule></sharedRules><selectionEntries><selectionEntry id="unit" name="Unit" type="model"><infoLinks><infoLink id="link" ${linkName === null ? "" : `name="${linkName}"`} type="rule" targetId="shared">${operations}</infoLink>${extraLinks}</infoLinks></selectionEntry></selectionEntries></catalogue>`)}
 ],{import:{batchId:"names",importedAt:"2026-09-19T00:00:00Z"}}));
 const c=library.selectableCatalogues[0]!;
 let session=ok(createLocalRosterSession(c,c.context.forces.definitions[0]!,{rosterId:rosterId("r"),forceId:forceOccurrenceId("f"),name:"Names"}));
 session=ok(addLocalRosterRootSelection(session,localRosterRootChoices(c)[0]!,{selectionId:selectionOccurrenceId("u")}));
 const owner=session.roster.forces[0]!.selections[0]!;
 const rule=createUnitReferenceModel(session,owner).rules[0]!.rule;
 return {session,owner,rule};
}
const append=(value: string,extra="")=>`<modifiers><modifier type="append" field="name" value="${value}" ${extra}/></modifiers>`;
it("evaluates an occurrence name once while retaining its original link identity",async()=>{
 const {session,owner,rule}=await setup(append("D3"));
 // Public shared report is the contract, not a renderer-specific concatenation.
 expect(inspectLocalRule(rule.value,session,owner)).toMatchObject({name:{baseValue:"Echo",value:"Echo D3",completeness:"complete"}});
 expect(rule.value.name).toBe("Echo");
 expect(ruleNameQualification(rule.report)).toBe("");
 expect(inspectLocalRule(rule.value,session,owner)).toBe(rule.report);
});

it.each([
 ["definition with explicit link override", "", append("6"), undefined, "incomplete"],
 ["link set", '<modifiers><modifier type="set" field="name" value="Renamed"/></modifiers>', "", "Renamed", "complete"],
 ["empty separator", append("5+",'join=""'), "", "Echo5+", "complete"],
 ["explicit separator", append("6",'join=": "'), "", "Echo: 6", "complete"],
 ["double escaping", append("&amp;quot;"), "", "Echo &quot;", "complete"],
 ["two carriers", append("D3"), append("D3"), undefined, "incomplete"],
 ["unsupported operation", '<modifiers><modifier type="replace" field="name" value="6"/></modifiers>', "", undefined, "incomplete"],
 ["missing operand", '<modifiers><modifier type="append" field="name"/></modifiers>', "", undefined, "incomplete"],
 ["missing field", '<modifiers><modifier type="append" value="6"/></modifiers>', "", undefined, "incomplete"],
 ["unsupported group", '<modifierGroups><modifierGroup type="xor">'+append("6")+'</modifierGroup></modifierGroups>', "", undefined, "incomplete"],
 ["nested supported groups", '<modifierGroups><modifierGroup type="and">'+append("D3")+'<modifierGroups><modifierGroup type="and">'+append("6")+'</modifierGroup></modifierGroups></modifierGroup></modifierGroups>', "", "Echo D3 6", "complete"],
 ["direct then grouped", append("D3")+'<modifierGroups><modifierGroup type="and">'+append("6")+'</modifierGroup></modifierGroups>', "", "Echo D3 6", "complete"],
 ["later set recovery", '<modifiers><modifier type="unknown" field="name" value="?"/><modifier type="set" field="name" value="Recovered"/></modifiers>', "", "Recovered", "incomplete"],
])("%s retains a bounded name result",async(_label,operations,definition,value,completeness)=>{
 const {rule}=await setup(operations!,definition!);
 expect(rule.report.name.value).toBe(value);
 expect(rule.report.name.completeness).toBe(completeness);
 expect(rule.report.completeness).toBe(_label === "missing field" ? "incomplete" : "complete"); // Missing targeting also leaves visibility unknown.
});
const condition=(type:string,value:string,scope="self")=>`<conditions><condition type="${type}" field="selections" scope="${scope}" childId="any" value="${value}"/></conditions>`;
it.each([
 ["atLeast","0","self","Echo 6","complete"],
 ["atMost","0","self","Echo","complete"],
 ["atLeast","0","unsupported",undefined,"incomplete"],
])("evaluates condition %s %s %s at the actual owner",async(type,value,scope,expected,complete)=>{
 const ops=`<modifiers><modifier type="append" field="name" value="6">${condition(type!,value!,scope!)}</modifier></modifiers>`;
 const {rule}=await setup(ops);
 expect(rule.report.name.value).toBe(expected);
 expect(rule.report.name.completeness).toBe(complete);
});
it("keeps an inactive unsupported operation inactive and preserves source-only conditional uncertainty",async()=>{
 const ops=`<modifiers><modifier type="unknown" field="name" value="6">${condition("atMost","0")}</modifier></modifiers>`;
 const {rule}=await setup(ops);
 expect(rule.report.name).toMatchObject({value:"Echo",completeness:"complete"});
 expect(inspectLocalRule(rule.value).name.value).toBeUndefined();
});
it("does not combine an inactive definition write with an active link write",async()=>{
 const definition=`<modifiers><modifier type="append" field="name" value="wrong">${condition("atMost","0")}</modifier></modifiers>`;
 expect((await setup(append("6"),definition)).rule.report.name).toMatchObject({value:"Echo 6",completeness:"complete"});
});
it("refuses a missing occurrence and retains original operation provenance",async()=>{
 const {session,owner,rule}=await setup(append("6"));
 const report=inspectLocalRule(rule.value,session,{...owner,id:selectionOccurrenceId("absent")});
 expect(report.name.value).toBeUndefined();
 expect(report.name.completeness).toBe("incomplete");
 expect(rule.report.name.layers[1]!.steps[0]!.modifier).toBe(("link" in rule.value ? rule.value.link : rule.value).modifiers[0]);
});

it("retains missing-field group ordering and recovers after a supported set",async()=>{
 const {rule}=await setup('<modifierGroups><modifierGroup type="and"><modifiers><modifier type="append" value="?"/><modifier type="set" field="name" value="Recovered"/></modifiers></modifierGroup></modifierGroups>');
 expect(rule.report.name).toMatchObject({value:"Recovered",completeness:"incomplete"});
 expect(rule.report.name.layers[1]!.steps.map(s=>s.status)).toEqual(["unapplied","applied"]);
 const note=ruleNameQualification(rule.report);
 expect(note).toContain("Effective rule name determined");
 expect(note).not.toContain('set name "Recovered"');
 expect(note).not.toContain("source name shown");
});
it("does not lose an inactive grouped missing-field target",async()=>{
 const {rule}=await setup(`<modifierGroups><modifierGroup type="and">${condition("atMost","0")}<modifiers><modifier type="append" value="?"/></modifiers></modifierGroup></modifierGroups>`);
 expect(rule.report.name).toMatchObject({value:"Echo",completeness:"complete"});
 expect(rule.report.name.layers[1]!.steps[0]!.status).toBe("notApplicable");
});
it.each([
 '<modifiers><modifier type="append" field="name" value="6"><repeats><repeat value="2" repeats="1"/></repeats></modifier></modifiers>',
 '<modifierGroups><modifierGroup type="and"><repeats><repeat value="2" repeats="1"/></repeats>'+append("6")+'</modifierGroup></modifierGroups>',
])("keeps repeat shapes unresolved",async operations=>{
 const {rule}=await setup(operations);
 expect(rule.report.name.value).toBeUndefined();
 expect(rule.report.name.completeness).toBe("incomplete");
});

it("isolates conditions on duplicated occurrences through history and saved-source reconstruction",async()=>{
 const ops=`<modifiers><modifier type="append" field="name" value="6">${condition("atLeast","2")}</modifier></modifiers>`;
 const {session,owner}=await setup(ops);
 let serial=0;
 const duplicated=ok(duplicateLocalRosterSelection(session,owner.id,()=>selectionOccurrenceId(`copy-${++serial}`)));
 const copy=duplicated.roster.forces[0]!.selections[1]!;
 const changed=ok(setLocalRosterSelectionAmount(duplicated,copy.id,2));
 const names=(s:typeof session)=>s.roster.forces[0]!.selections.map(o=>createUnitReferenceModel(s,o).rules[0]!.rule.report.name.value);
 expect(names(changed)).toEqual(["Echo","Echo 6"]);
 const history=commitBoundedHistory(createBoundedHistory(duplicated),changed);
 expect(names(undoBoundedHistory(history).present)).toEqual(["Echo","Echo"]);
 expect(names(redoBoundedHistory(undoBoundedHistory(history)).present)).toEqual(["Echo","Echo 6"]);
 const files=changed.catalogue.context.graph.documents.map(d=>({filename:d.source.filename,sourceId:d.source.sourceId,sourceKind:d.source.kind,bytes:d.sourceBytes}));
 const make=(roster:typeof changed.roster)=>ok(createLocalRosterDraft({id:"names",createdAt:"2026-09-19T00:00:00Z",updatedAt:"2026-09-19T00:00:00Z",catalogueKey:changed.catalogue.key,roster,import:{batchId:"names",importedAt:"2026-09-19T00:00:00Z",files}}));
 let restored=changed;
 for(let pass=0;pass<2;pass++) {
  const draft=ok(decodeLocalRosterDraft(make(restored.roster)));
  const library=ok(await prepareLocalCatalogueLibrary(draft.import.files,{import:{batchId:draft.import.batchId,importedAt:draft.import.importedAt}}));
  restored=ok(restoreLocalRosterSession(library.selectableCatalogues.find(c=>c.key===draft.catalogueKey)!,draft.roster));
  expect(names(restored)).toEqual(["Echo","Echo 6"]);
  expect(draft.import.files.map(f=>f.bytes)).toEqual(files.map(f=>f.bytes));
 }
 const model=createRosterPrintViewModel(restored,evaluateLocalRosterCosts(restored),inspectLocalRosterSupportedValidation(restored));
 const rules=model.reference.glossary;
 expect(rules.map(r=>r.name)).toEqual(["Echo","Echo 6"]);
 expect(printedExplanations(rules,t=>t)).toHaveLength(1);
 expect(printedExplanations(rules,t=>t)[0]!.records).toHaveLength(2);
 for(const layout of ["compact","sheets"] as const) {
  const html=renderRosterPrintDocument({...model,layout});
  for(const r of rules) {expect(html).toContain(r.name);expect(html).toContain(`id="${r.anchor}"`);}
 }
});
it("escapes effective rule labels in standalone output without decoding their text again",async()=>{
 const {session}=await setup(append('&lt;img src=x onerror=alert(1)&gt; &amp;quot;'));
 const html=renderRosterPrintDocument(createRosterPrintViewModel(session,evaluateLocalRosterCosts(session),inspectLocalRosterSupportedValidation(session)));
 expect(html).toContain('Echo &lt;img src=x onerror=alert(1)&gt; &amp;quot;');
 expect(html).not.toContain('<img');
});

it("inherits definition-only operations when the link supplies no static override",async()=>{
 expect((await setup("",append("6"),null)).rule.report.name).toMatchObject({baseValue:"Original",value:"Original 6",completeness:"complete"});
});
it("retains both candidates for uncertain carrier precedence",async()=>{
 const {rule}=await setup(append("D3"),append("D3"));
 expect(rule.report.name.layers.map(l=>l.value)).toEqual(["Echo D3","Echo D3"]);
 expect(rule.report.name.diagnostics.some(d=>d.message.includes("precedence"))).toBe(true);
});
it("rejects routed name operations at the owned-rule boundary",async()=>{
 const {rule}=await setup(append("6",'affects="self.entries.recursive"'));
 expect(rule.report.name.value).toBeUndefined();
 expect(rule.report.name.layers[1]!.steps[0]).toMatchObject({status:"unapplied",issues:["unsupportedAttributes"]});
});
it("preserves direct-before-group ordering for noncommutative text operations",async()=>{
 const {rule}=await setup(append("first")+'<modifierGroups><modifierGroup type="and"><modifiers><modifier type="set" field="name" value="Final"/></modifiers></modifierGroup></modifierGroups>');
 expect(rule.report.name.value).toBe("Final");
});

it("keeps different link-owned operands on one definition as distinct scoped rule records",async()=>{
 const {session,owner}=await setup(append("D3"),"","Echo",`<infoLink id="other-link" name="Echo" type="rule" targetId="shared">${append("6")}</infoLink>`);
 const model=createUnitReferenceModel(session,owner);
 expect(model.rules.map(r=>r.rule.report.name.value)).toEqual(["Echo D3","Echo 6"]);
 expect(model.rules.map(r=>r.rule.origin === "Linked" ? r.rule.value.link.id : r.rule.value.id)).toEqual(["link","other-link"]);
 const document=createRosterPrintViewModel(session,evaluateLocalRosterCosts(session),inspectLocalRosterSupportedValidation(session)).reference;
 expect(document.glossary.map(r=>r.name)).toEqual(["Echo D3","Echo 6"]);
 expect(printedExplanations(document.glossary,t=>t)).toHaveLength(1);
});
it("evaluates a direct definition without inventing a link layer",async()=>{
 const {session,owner,rule}=await setup("",append("6"),null);
 if(rule.origin !== "Linked") throw Error("Expected shared definition fixture");
 const direct=inspectLocalRule(rule.value.definition,session,owner);
 expect(direct.name).toMatchObject({baseValue:"Original",value:"Original 6",completeness:"complete"});
 expect(direct.name.layers).toHaveLength(1);
});

it.each(["missing", "ambiguous"])("withholds an effective label for %s materialized owner identity",async kind=>{
 const {session,owner,rule}=await setup(append("6"));
 const context=session.catalogue.context;
 const first=context.roots.roots[0]!;
 if(first.kind!=="selectionEntry") throw Error("Expected direct entry root");
 const materialized=first.materialized;
 if(materialized.kind!=="selectionEntry") throw Error("Expected entry fixture");
 const roots=kind==="missing"?[]:[first,{...first,materialized:{...materialized,occurrence:{...materialized.occurrence}}}];
 const damaged={...session,catalogue:{...session.catalogue,context:{...context,roots:{...context.roots,roots}}}};
 const report=inspectLocalRule(rule.value,damaged,owner);
 expect(report.name.value).toBeUndefined();
 expect(report.name.completeness).toBe("incomplete");
 expect(report.name.layers[1]!.steps[0]!.status).toBe("unapplied");
});
