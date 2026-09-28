// Separate optional frozen snapshot; never replace the original pilot fixtures.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createUnitReferenceModel } from "./unit-reference-model.js";
import { addLocalRosterRootSelection, createLocalRosterSession, evaluateLocalRosterCosts, localRosterRootChoices, restoreLocalRosterSession } from "./roster-session.js";
const directory=process.env.ROSTERFORGE_STARCRAFT_LATEST_DIR;
const files=[['Protoss.cat','ccb624c9d9119425599e0de6caf53fd35af4045a3c6af492b7aae15e7b50d73b'],['Starcraft The Miniature Game.gst','4ee80375b5939fb1d11e43e78baf35f6dbcec697ca736340d9c7eb04a3d00a18'],['Terrans.cat','348152c6fe2bfccd263cf39fd1cc4afc86197ec6186c4009b52de913ee4d6be9'],['Zergs.cat','e75e469f3c850ccc3eb3df27f830440e2245bb3e13b83cf5dac92b218a875967']] as const;
function ok<T>(result:Result<T>):T {if(!result.ok)throw Error(JSON.stringify(result.diagnostics));return result.value;}
it.skipIf(!directory)('checks Nerazim/Zeratul in frozen 445a410f without relabeling old fixtures',async()=>{
 const inputs=files.map(([filename,hash])=>{const bytes=new Uint8Array(readFileSync(join(directory!,filename)));expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);return {filename,bytes};});
 const options={import:{batchId:'latest-445a410f',importedAt:'2026-09-28T00:00:00Z'}};
 const library=ok(await prepareLocalCatalogueLibrary(inputs,options));
 const catalogue=library.selectableCatalogues.find(c=>c.name==='Protoss')!;let n=0;
 const next=()=>selectionOccurrenceId(`latest-${++n}`);
 let session=ok(createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId('latest'),forceId:forceOccurrenceId('army'),name:'Latest fiction test',createSelectionId:next}));
 for(const id of ['3fd8-47cc-7cf1-c106','5acd-670a-e60e-75a3']) {
   const choice=localRosterRootChoices(catalogue).find(c=>c.materialized.id===id)!;expect(choice).toBeDefined();
   session=ok(addLocalRosterRootSelection(session,choice,{selectionId:next(),createSelectionId:next}));
 }
 const zeratul=session.roster.forces[0]!.selections.find(s=>s.name==='Zeratul')!;
 expect(createUnitReferenceModel(session,zeratul).profiles.length).toBeGreaterThan(0);
 const totals=ok(evaluateLocalRosterCosts(session)).totals;
 expect(totals.find(t=>t.typeId==='5bcf-897a-a5c9-d0e8')!.value).toBe(230);
 expect(totals.find(t=>t.typeId==='7e61-585f-b715-85e0')!.value).toBe(0);
 const draft=ok(createLocalRosterDraft({id:'latest',createdAt:options.import.importedAt,updatedAt:options.import.importedAt,catalogueKey:catalogue.key,roster:session.roster,import:{...options.import,files:inputs}}));
 const decoded=ok(decodeLocalRosterDraft(structuredClone(draft)));
 const restored=ok(await prepareLocalCatalogueLibrary(decoded.import.files,options));
 const reopened=ok(restoreLocalRosterSession(restored.selectableCatalogues.find(c=>c.name==='Protoss')!,decoded.roster));
 expect(ok(evaluateLocalRosterCosts(reopened)).totals.map(t=>[t.typeId,t.value])).toEqual(totals.map(t=>[t.typeId,t.value]));
 expect(decoded.import.files.map(f=>f.bytes)).toEqual(inputs.map(f=>f.bytes));
});
