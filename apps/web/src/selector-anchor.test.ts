// Synthetic import-to-evaluation regression for additive affects self selection.
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";
import { restoreLocalRosterSession } from "./roster-session.js";
import { expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices, removeLocalRosterSelection, duplicateLocalRosterSelection } from "./roster-session.js";
import { createUnitReferenceModel } from "./unit-reference-model.js";
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(r.diagnostics.map(d=>d.code).join(',')); return r.value; }
async function fixture(selector = 'self.entries.recursive.hero.profiles.Body', anchorCategory = 'hero', childCategory = 'hero', scope = 'model', linked = false, bearerType = 'model') {
  const body = (id: string) => `<profiles><profile id="${id}" name="Body" typeId="body" typeName="Body"><characteristics><characteristic typeId="save" name="Protection">3+</characteristic></characteristics></profile></profiles>`;
  const files = [
    ['anchor.gst', '<gameSystem id="g" name="G" revision="1" battleScribeVersion="2.03"><profileTypes><profileType id="body" name="Body"><characteristicTypes><characteristicType id="save" name="Protection"/></characteristicTypes></profileType></profileTypes><categoryEntries><categoryEntry id="hero" name="Hero"/><categoryEntry id="other" name="Other"/></categoryEntries><forceEntries><forceEntry id="f" name="Force"/></forceEntries></gameSystem>'],
    ['anchor.cat', `<catalogue id="c" name="C" revision="1" battleScribeVersion="2.03" gameSystemId="g"><selectionEntries><selectionEntry id="bearer" name="Bearer" type="${bearerType}"><categoryLinks><categoryLink id="hc" targetId="${anchorCategory}"/></categoryLinks>${body('own')}<selectionEntries><selectionEntry id="child" name="Child" type="upgrade"><categoryLinks><categoryLink id="cc" targetId="${childCategory}"/></categoryLinks>${body('descendant')}</selectionEntry><selectionEntry id="plate" name="Plate" type="upgrade"><modifiers><modifier type="set" field="save" value="2+" scope="${scope}" affects="${selector}"/></modifiers></selectionEntry></selectionEntries></selectionEntry></selectionEntries></catalogue>`]
  ];
  if (linked) {
    const xml = files[1]![1]!;
    const start = xml.indexOf("<selectionEntries>");
    const end = xml.lastIndexOf("</selectionEntries>");
    files[1]![1] = xml.slice(0,start) + "<sharedSelectionEntries>" + xml.slice(start+18,end)
      + '</sharedSelectionEntries><entryLinks><entryLink id="bearer-link" targetId="bearer" type="selectionEntry"/></entryLinks></catalogue>';
  }
  const library = ok(await prepareLocalCatalogueLibrary(files.map(([filename,text])=>({filename:filename!,bytes:new TextEncoder().encode(text!)})), {import:{batchId:'anchor',importedAt:'2026-09-19T00:00:00Z'}}));
  const catalogue = library.selectableCatalogues[0]!;
  let session = ok(createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId('r'),forceId:forceOccurrenceId('f'),name:'Anchor'}));
  const id=selectionOccurrenceId('bearer');
  session=ok(addLocalRosterRootSelection(session,localRosterRootChoices(catalogue)[0]!,{selectionId:id}));
  const root=session.selectionChoices.get(id)!;
  for (const child of root.selectionEntries) session=ok(addLocalRosterChildSelection(session,id,child,{selectionId:selectionOccurrenceId(child.id!)}));
  return session;
}
function values(session: Awaited<ReturnType<typeof fixture>>) {
  return createUnitReferenceModel(session,session.roster.forces[0]!.selections[0]!).profiles.map(p=>({id:p.profile.value.id,value:p.report?.report.characteristics[0]?.value,complete:p.report?.report.completeness}));
}
it.each([
  ['self.entries.recursive.hero.profiles.Body','hero','hero','2+','2+'],
  ['entries.recursive.hero.profiles.Body','hero','hero','3+','2+'],
  ['self.entries.recursive.hero.profiles.Body','other','hero','3+','2+'],
  ['self.entries.recursive.hero.profiles.Body','hero','other','2+','3+'],
  ['self.profiles.Body','hero','hero','2+','3+'],
  ['profiles.Body','hero','hero','2+','3+'],
  ['self.entries.hero.profiles.Body','hero','hero','2+','2+'],
  ['entries.hero.profiles.Body','hero','hero','3+','2+'],
  ['self.entries.recursive.hero.profiles.Other','hero','hero','3+','3+'],
])('routes %s without losing anchor/descendant category boundaries',async (selector,anchor,child,own,descendant)=>{
  const s=await fixture(selector,anchor,child);
  expect(values(s)).toEqual([{id:'own',value:own,complete:'complete'},{id:'descendant',value:descendant,complete:'complete'}]);
});
it('keeps independent duplicates and removes the effect with its selected source',async()=>{
  const original=await fixture();
  const duplicated=ok(duplicateLocalRosterSelection(original,selectionOccurrenceId('bearer'),(()=>{let n=0;return()=>selectionOccurrenceId(`copy-${++n}`);})()));
  const removed=ok(removeLocalRosterSelection(duplicated,selectionOccurrenceId('plate')));
  expect(values(removed).map(v=>v.value)).toEqual(['3+','3+']);
  const copy=removed.roster.forces[0]!.selections[1]!;
  expect(createUnitReferenceModel(removed,copy).profiles.map(p=>p.report?.report.characteristics[0]?.value)).toEqual(['2+','2+']);
  expect(values(original).map(v=>v.value)).toEqual(['2+','2+']);
});

it.each(['ancestor','unit','nonsense'])('withholds a complete value for unresolved/unsupported scope %s', async scope=>{
  expect(values(await fixture(undefined,undefined,undefined,scope)).every(v=>v.complete==='incomplete')).toBe(true);
});
it('keeps malformed profile traversal incomplete',async()=>{
  expect(values(await fixture('self.entries.hero.extra.profiles.Body')).every(v=>v.complete==='incomplete')).toBe(true);
});
it('reconstructs the selected effect from original sources and history without stale values',async()=>{
  const selected=await fixture();
  const removed=ok(removeLocalRosterSelection(selected,selectionOccurrenceId('plate')));
  const history=commitBoundedHistory(createBoundedHistory(selected),removed);
  expect(values(undoBoundedHistory(history).present).map(v=>v.value)).toEqual(['2+','2+']);
  expect(values(redoBoundedHistory(undoBoundedHistory(history)).present).map(v=>v.value)).toEqual(['3+','3+']);
  const sources=selected.catalogue.context.graph.documents.map(d=>({filename:d.source.filename,sourceId:d.source.sourceId,sourceKind:d.source.kind,bytes:d.sourceBytes}));
  const draft=ok(createLocalRosterDraft({id:'anchor',createdAt:'2026-09-19T00:00:00Z',updatedAt:'2026-09-19T00:00:00Z',catalogueKey:selected.catalogue.key,roster:selected.roster,import:{batchId:'anchor',importedAt:'2026-09-19T00:00:00Z',files:sources}}));
  const decoded=ok(decodeLocalRosterDraft(draft));
  const library=ok(await prepareLocalCatalogueLibrary(decoded.import.files,{import:{batchId:decoded.import.batchId,importedAt:decoded.import.importedAt}}));
  const reopened=ok(restoreLocalRosterSession(library.selectableCatalogues.find(c=>c.key===decoded.catalogueKey)!,decoded.roster));
  expect(values(reopened)).toEqual(values(selected));
  expect(decoded.import.files.map(f=>f.bytes)).toEqual(sources.map(f=>f.bytes));
});

it("keeps linked definition/category identity when resolving the nearest model anchor",async()=>{
 expect(values(await fixture(undefined,undefined,undefined,"model",true)).map(v=>v.value)).toEqual(["2+","2+"]);
});
it("uses the nearest unit anchor under the existing typed-scope semantics",async()=>{
 expect(values(await fixture(undefined,undefined,undefined,"unit",false,"unit")).map(v=>v.value)).toEqual(["2+","2+"]);
});

// Corrupted identity indexes must not select a possibly different nearest bearer.
it.each(["missing", "ambiguous"])("retains unresolved %s nearest-anchor identity",async kind=>{
 const session=await fixture();
 const owner=session.roster.forces[0]!.selections[0]!;
 const plate=owner.selections.find(s=>s.id === selectionOccurrenceId("plate"))!;
 const { indexEvaluationChoices, rosterSelectionLocations }=await import("../../../packages/evaluation/src/selection-context.js");
 const { resolveAffectsAnchor }=await import("../../../packages/evaluation/src/affects-routing.js");
 const original=indexEvaluationChoices(session.catalogue.context);
 const byKey=new Map(original.byKey);
 const bearer=byKey.get(owner.definition.key)![0]!;
 if(bearer.kind!=="selectionEntry") throw Error("Expected bearer entry");
 if(kind==="missing") byKey.delete(owner.definition.key);
 else byKey.set(owner.definition.key,[bearer,{...bearer,type:"upgrade",occurrence:{...bearer.occurrence}}]);
 expect(resolveAffectsAnchor(plate,"model",rosterSelectionLocations(session.roster),{byKey,partial:false})).toEqual({kind:"unresolved"});
});
