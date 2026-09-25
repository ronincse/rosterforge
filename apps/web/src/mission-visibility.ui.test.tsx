// @vitest-environment jsdom
// Fictional XML reaches ingestion, effective references, screen and standalone HTML.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { objectId, type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { App } from "./App.js";
import { addLocalRosterRootSelection, createLocalRosterSession, inspectLocalRosterSelectionCharacteristics, inspectLocalRosterSupportedValidation, evaluateLocalRosterCosts, localRosterRootChoices, setLocalRosterResourceBudget, restoreLocalRosterSession } from "./roster-session.js";
import { createUnitReferenceModel } from "./unit-reference-model.js";
import { createArmyReferenceDocument } from "./army-reference-model.js";
import { renderArmyReferenceDocument } from "./army-reference-html.js";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";
afterEach(cleanup);
function ok<T>(r:Result<T>):T{if(!r.ok)throw new Error(JSON.stringify(r.diagnostics));return r.value;}
const profile=(id:string,condition:string,identity=true,attrs="",hidden="false",value="true")=>`<profile id="${id}" name="${id}" typeId="mission" typeName="Mission" hidden="${hidden}"><characteristics><characteristic typeId="text" name="Parameters">Full safe &lt;script&gt;${id}&lt;/script&gt; payload.</characteristic></characteristics><modifiers><modifier ${identity?`id="identity-${id}"`:""} type="set" field="hidden" value="${value}" ${attrs}><conditions><condition type="${condition}" field="limit::points" scope="roster" childId="any" shared="true" value="1000"/></conditions></modifier></modifiers></profile>`;
const game='<gameSystem id="system" name="Fiction" revision="1" battleScribeVersion="2.03"><costTypes><costType id="points" name="Points" defaultCostLimit="1500"/></costTypes><profileTypes><profileType id="mission" name="Mission" kind="ability"><characteristicTypes><characteristicType id="text" name="Parameters" kind="longText"/></characteristicTypes></profileType></profileTypes><forceEntries><forceEntry id="army" name="Army"/></forceEntries></gameSystem>';
const cat=(identity=true,attrs="")=>`<catalogue id="cat" name="Fiction" revision="1" battleScribeVersion="2.03" gameSystemId="system"><selectionEntries>${["Alpha","Beta"].map(name=>`<selectionEntry id="${name}" name="${name}" type="upgrade"><profiles>${profile(name+" Small","greaterThan",identity,attrs)}${profile(name+" Large","atMost",identity,attrs)}</profiles><infoGroups><infoGroup id="nested-${name}" name="Details"><profiles><profile id="hidden-${name}" name="Hidden nested ${name}" hidden="true" typeId="mission"/></profiles></infoGroup></infoGroups></selectionEntry>`).join("")}</selectionEntries></catalogue>`;
async function fixture(identity=true,attrs="",source=cat(identity,attrs)){
 const files=[{filename:"fiction.gst",bytes:new TextEncoder().encode(game)},{filename:"fiction.cat",bytes:new TextEncoder().encode(source)}];
 const prepared=await prepareLocalCatalogueLibrary(files,{import:{batchId:"visibility",importedAt:"2026-09-25T00:00:00Z"}});
 const library=ok(prepared),catalogue=library.selectableCatalogues[0]!;
 let session=ok(createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId("mission"),forceId:forceOccurrenceId("army"),name:"Mission checks"}));
 for(const root of localRosterRootChoices(catalogue))session=ok(addLocalRosterRootSelection(session,root,{selectionId:selectionOccurrenceId(root.materialized.name!)}));
 return {files,prepared,library,session,catalogue};
}
it("treats exact modifier id as retained metadata and follows the budget, independently for two missions",async()=>{
 const f=await fixture();const without=await fixture(false);
 for(const limit of [999,1000,1001,600,1500,1000]){
  const session=ok(setLocalRosterResourceBudget(f.session,objectId("points"),limit));
  const control=ok(setLocalRosterResourceBudget(without.session,objectId("points"),limit));
  const before=JSON.stringify(session.roster);
  for(const owner of session.roster.forces[0]!.selections){
   const reports=ok(inspectLocalRosterSelectionCharacteristics(session,owner.id));
   const other=ok(inspectLocalRosterSelectionCharacteristics(control,owner.id));
   expect([...reports.byProfile.values()].map(r=>[r.visibility.status,r.visibility.completeness])).toEqual([...other.byProfile.values()].map(r=>[r.visibility.status,r.visibility.completeness]));
   expect([...reports.byProfile.keys()].filter(p=>p.id?.includes("Small")||p.id?.includes("Large")).every(p=>p.modifiers[0]!.node.attributes.id?.startsWith("identity-"))).toBe(true);
   const names=createUnitReferenceModel(session,owner).profiles.map(p=>p.profile.value.name);
   expect(names).toEqual([`${owner.name} ${limit<=1000?"Small":"Large"}`]);
  }
  const document=createArmyReferenceDocument(session,evaluateLocalRosterCosts(session),inspectLocalRosterSupportedValidation(session));
  const html=renderArmyReferenceDocument(document);
  expect(document.units.flatMap(u=>u.profiles).map(p=>p.name)).toEqual([`Alpha ${limit<=1000?"Small":"Large"}`,`Beta ${limit<=1000?"Small":"Large"}`]);
  expect(html).not.toContain("Hidden nested");expect(html).toContain("Full safe");expect(html).not.toContain("<script>Alpha");
  expect(JSON.stringify(session.roster)).toBe(before);
  const history=commitBoundedHistory(createBoundedHistory(f.session),session);
  expect(undoBoundedHistory(history).present).toBe(f.session);expect(redoBoundedHistory(undoBoundedHistory(history)).present).toBe(session);
  const reopened=ok(restoreLocalRosterSession(f.catalogue,structuredClone(session.roster)));
  expect(createUnitReferenceModel(reopened,reopened.roster.forces[0]!.selections[0]!).profiles.map(p=>p.profile.value.name)).toEqual([`Alpha ${limit<=1000?"Small":"Large"}`]);
 }
 const reset=ok(setLocalRosterResourceBudget(ok(setLocalRosterResourceBudget(f.session,objectId("points"),999)),objectId("points"),undefined));
 expect(createUnitReferenceModel(reset,reset.roster.forces[0]!.selections[0]!).profiles[0]!.profile.value.name).toBe("Alpha Large");
});
it.each(['invented="true"','targetId="unknown"','scope="unestablished"'])("retains genuine uncertainty for %s",async attrs=>{
 const f=await fixture(true,attrs);const owner=f.session.roster.forces[0]!.selections[0]!;
 const profiles=createUnitReferenceModel(f.session,owner).profiles;
 expect(profiles).toHaveLength(2);expect(profiles.every(p=>p.report?.visibility.completeness==="incomplete")).toBe(true);
});
it("retains unknown conditions and supports a source-defined reveal of a default-hidden profile",async()=>{
 const unknown=await fixture(true,"",cat().replaceAll('field="limit::points"','field="limit::absent"'));
 expect(createUnitReferenceModel(unknown.session,unknown.session.roster.forces[0]!.selections[0]!).profiles.every(p=>p.report?.visibility.status==="unresolved")).toBe(true);
 const revealed=await fixture(true,"",cat().replaceAll('hidden="false"','hidden="true"').replaceAll('field="hidden" value="true"','field="hidden" value="false"'));
 expect(createUnitReferenceModel(revealed.session,revealed.session.roster.forces[0]!.selections[0]!).profiles.map(p=>p.profile.value.name)).toEqual(["Alpha Small"]);
});
it("omits definite inactive profiles in the actual selected reader while retaining full safe active fields",async()=>{
 const f=await fixture();let id=0;render(<App prepareLibrary={async()=>f.prepared} createEntityId={kind=>`${kind}-${++id}`}/>);
 fireEvent.change(screen.getByLabelText("Choose BattleScribe files"),{target:{files:f.files.map(file=>({name:file.filename,arrayBuffer:async()=>Uint8Array.from(file.bytes).buffer}))}});
 await screen.findByRole("button",{name:"Create roster"});fireEvent.click(screen.getByRole("button",{name:"Create roster"}));
 fireEvent.click(await screen.findByRole("button",{name:/^Add unit,/}));fireEvent.click(screen.getByRole("button",{name:"Add Alpha"}));
 fireEvent.click(screen.getByRole("button",{name:"View unit card"}));const dialog=screen.getByRole("dialog",{name:"Unit card for Alpha"});
 expect(within(dialog).getByText("Alpha Large",{exact:true,selector:"strong"})).toBeTruthy();expect(within(dialog).queryByText("Alpha Small",{exact:true,selector:"strong"})).toBeNull();
 expect(dialog.textContent).not.toContain("Hidden nested Alpha");expect(dialog.textContent).toContain("Full safe <script>Alpha Large</script> payload.");expect(dialog.querySelector("script")).toBeNull();
});

it("review: linked profiles and grouped ID-bearing visibility share complete-hidden filtering",async()=>{
 const linked=profile("Linked Hidden","greaterThan");
 let source=cat().replace('<selectionEntries>',`<sharedProfiles>${linked}</sharedProfiles><selectionEntries>`);
 for(const name of ["Alpha","Beta"]) source=source.replace(`<infoGroups><infoGroup id="nested-${name}"`,`<infoLinks><infoLink id="link-${name}" targetId="Linked Hidden" type="profile"/></infoLinks><infoGroups><infoGroup id="nested-${name}"`);
 // The direct Alpha Large modifier moves into an unconditional group; its own
 // budget condition and ID still belong to the same underlying profile.
 const direct=profile('Alpha Large','atMost');
 source=source.replace(direct,direct.replace('<modifiers>','<modifierGroups><modifierGroup type="and"><modifiers>').replace('</modifiers>','</modifiers></modifierGroup></modifierGroups>'));
 const f=await fixture(true,"",source);
 for(const limit of [600,1500]){
  const session=ok(setLocalRosterResourceBudget(f.session,objectId("points"),limit));
  for(const owner of session.roster.forces[0]!.selections){
   const reports=ok(inspectLocalRosterSelectionCharacteristics(session,owner.id));
   if(owner.name==="Alpha") expect([...reports.byProfile.values()].find(p=>p.profile.name==="Alpha Large")!.visibility).toMatchObject({status:limit>1000?"visible":"hidden",completeness:"complete"}); const linkedReport=[...reports.byProfile.values()].find(p=>p.profile.name==="Linked Hidden")!;
   expect(linkedReport.visibility).toMatchObject({status:limit>1000?"hidden":"visible",completeness:"complete"});
   expect(createUnitReferenceModel(session,owner).profiles.some(p=>p.profile.value.name==="Linked Hidden")).toBe(limit<=1000);
  }
  const document=createArmyReferenceDocument(session,evaluateLocalRosterCosts(session),inspectLocalRosterSupportedValidation(session));
  expect(document.units.flatMap(u=>u.profiles).filter(p=>p.name==="Linked Hidden")).toHaveLength(limit<=1000?2:0);
 }
});
