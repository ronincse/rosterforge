// @vitest-environment jsdom
// Preset application goes through ordinary commands as one history transition.
import { afterEach, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { objectId } from "@rosterforge/foundation";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { useRosterForgeAppController } from "./use-app-controller.js";
afterEach(cleanup);
it('applies both explicit budgets atomically, preserves custom edits and supports undo/redo',async()=>{
 const xml=[['sys.gst','<gameSystem id="sys-ce49-e853-2fea-6af1" name="Fiction" revision="1" battleScribeVersion="2.03"><costTypes><costType id="5bcf-897a-a5c9-d0e8" name="Ore" defaultCostLimit="2000"/><costType id="1719-6214-392e-e53f" name="Fuel" defaultCostLimit="200"/></costTypes><forceEntries><forceEntry id="army" name="Army"/></forceEntries></gameSystem>'],['cat.cat','<catalogue id="cat" name="Fiction" revision="1" gameSystemId="sys-ce49-e853-2fea-6af1" gameSystemRevision="1" battleScribeVersion="2.03"/>']];
 const library=await prepareLocalCatalogueLibrary(xml.map(([filename,text])=>({filename:filename!,bytes:new TextEncoder().encode(text)})),{import:{batchId:'preset',importedAt:'2026-09-28T00:00:00Z'}});
 if(!library.ok)throw Error('fixture');const catalogue=library.value.selectableCatalogues[0]!;
 const {result}=renderHook(()=>useRosterForgeAppController({}));
 act(()=>result.current.openCatalogueLibrary(library.value,[],catalogue.key));
 act(()=>result.current.createRoster(catalogue,catalogue.context.forces.definitions[0]!,'Fiction'));
 const original=result.current.rosterSession!;
 act(()=>result.current.setResourceBudget(objectId('1719-6214-392e-e53f'),73));
 const custom=result.current.rosterSession!;
 act(()=>result.current.applyGameSizePreset('skirmish'));
 expect(result.current.rosterSession!.roster.resourceBudgetOverrides).toEqual(expect.arrayContaining([{typeId:'5bcf-897a-a5c9-d0e8',value:1000},{typeId:'1719-6214-392e-e53f',value:100}]));
 expect(result.current.rosterHistory!.past).toHaveLength(2);
 act(()=>result.current.undoRosterEdit());expect(result.current.rosterSession).toBe(custom);
 act(()=>result.current.redoRosterEdit());
 act(()=>result.current.setResourceBudget(objectId('5bcf-897a-a5c9-d0e8'),1500));
 expect(result.current.rosterSession!.roster.resourceBudgetOverrides!.find(x=>x.typeId==='1719-6214-392e-e53f')!.value).toBe(100);
 const before=result.current.rosterSession;
 act(()=>result.current.applyGameSizePreset('custom'));expect(result.current.rosterSession).toBe(before);
 act(()=>result.current.applyGameSizePreset('standard'));
 expect(result.current.rosterSession!.roster.resourceBudgetOverrides).toEqual(expect.arrayContaining([{typeId:'5bcf-897a-a5c9-d0e8',value:2000},{typeId:'1719-6214-392e-e53f',value:200}]));
 expect(result.current.rosterSession!.catalogue).toBe(original.catalogue);
 expect(result.current.rosterSession!.roster.forces).toBe(original.roster.forces);
});
