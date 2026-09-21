// @vitest-environment jsdom
// Fictional XML exercises provenance, read-only reporting and saved reconstruction.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { objectId, sourceId, type Result } from "@rosterforge/foundation";
import { githubRawFileUrl, pinGitHubRepository, type GitHubRepositoryPinInput, type LocalBattleScribeFile, type RepositoryFetch } from "@rosterforge/repository";
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { rosterId, forceOccurrenceId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { CatalogueSourceStatus } from "./catalogue-source-status.js";
import { catalogueSourceContext } from "./catalogue-data-freshness.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { defaultRemoteCatalogueSources } from "./remote-catalogue-source.js";
import { createLocalRosterSession, addLocalRosterRootSelection, localRosterRootChoices, restoreLocalRosterSession, setLocalRosterResourceBudget, evaluateLocalRosterCosts } from "./roster-session.js";
afterEach(cleanup);
const date = "2026-09-20T00:00:00Z";
const sc = defaultRemoteCatalogueSources[1]!.repository;
const wh = defaultRemoteCatalogueSources[0]!.repository;
function ok<T>(r:Result<T>):T{if(!r.ok)throw Error(r.diagnostics.map(d=>d.message).join(";"));return r.value;}
function file(filename:string, xml:string, source?:GitHubRepositoryPinInput):LocalBattleScribeFile {
 const bytes=new TextEncoder().encode(xml);
 if(!source) return {filename,bytes};
 const pin=ok(pinGitHubRepository(source));
 return {filename,bytes,sourceKind:"download",sourceId:sourceId(`download:github:${source.owner}/${source.repository}@${source.revision}:${filename}`),origin:githubRawFileUrl(pin,filename)};
}
async function fixture(source?:GitHubRepositoryPinInput, systemSource=source, extra:readonly LocalBattleScribeFile[]=[]) {
 const files=[
  file("core.gst",'<gameSystem id="g" name="Same System" revision="1" battleScribeVersion="2.03"><costTypes><costType id="pts" name="pts" defaultCostLimit="100"/></costTypes><forceEntries><forceEntry id="f" name="Force"/></forceEntries></gameSystem>',systemSource),
  file("faction.cat",'<catalogue id="c" name="Same Catalogue" revision="1" gameSystemId="g" battleScribeVersion="2.03"><selectionEntries><selectionEntry id="unit" name="Sentinel" type="model"><costs><cost typeId="pts" value="10"/></costs></selectionEntry></selectionEntries></catalogue>',source),...extra];
 const library=ok(await prepareLocalCatalogueLibrary(files,{import:{batchId:"same-batch",importedAt:date}}));
 return {library,catalogue:library.selectableCatalogues[0]!,files};
}
function response(revision:string){return new Response(JSON.stringify([{sha:revision,commit:{committer:{date:"2025-01-01T00:00:00Z"}}}]),{status:200});}
function mount(catalogue:Awaited<ReturnType<typeof fixture>>["catalogue"], fetch:RepositoryFetch, now=()=>date) {
 return render(<CatalogueSourceStatus context={catalogueSourceContext(catalogue)} options={{fetch,now}}/>);
}
it.each([sc,wh])("uses recorded $owner/$repository without guessing from names or import time",async source=>{
 const {catalogue}=await fixture(source);const fetch=vi.fn<RepositoryFetch>(async()=>response(source.revision));
 mount(catalogue,fetch);expect(screen.getByText(`Source: ${source.owner}/${source.repository}`)).toBeTruthy();
 expect(fetch).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Check source"}));
 expect(await screen.findByText(/matches the checked repository snapshot as of/)).toBeTruthy();
 expect(fetch).toHaveBeenCalledTimes(1);
 expect(fetch.mock.calls[0]![0]).toBe(`https://api.github.com/repos/${source.owner}/${source.repository}/commits?per_page=1`);
 expect(screen.queryByText(/up to date|newer catalogue data|points changed/i)).toBeNull();
});
it("recent acquisition of an older snapshot compares retained revision, not configured pin",async()=>{
 const source={...sc,revision:"a".repeat(40)};const {catalogue}=await fixture(source);
 expect(catalogueSourceContext(catalogue)).toMatchObject({source,configuredRevision:sc.revision});
 mount(catalogue,vi.fn(async()=>response(sc.revision)));fireEvent.click(screen.getByRole("button",{name:"Check source"}));
 expect((await screen.findByText(/snapshot differs/)).textContent).toContain("selected-file impact and revision chronology are not established");
});
it("limits provenance to the selected dependency closure in a mixed batch",async()=>{
 const extra=file("unrelated.gst",'<gameSystem id="unrelated" name="Other" revision="1" battleScribeVersion="2.03"/>',wh);
 const {catalogue}=await fixture(sc,sc,[extra]);
 expect(catalogueSourceContext(catalogue)).toMatchObject({eligible:true,files:["faction.cat","core.gst"],source:sc});
});
it.each([wh,{...sc,revision:"b".repeat(40)}])("withholds checks for a mixed dependency context",async other=>{
 const {catalogue}=await fixture(sc,other);const fetch=vi.fn();mount(catalogue,fetch);
 expect(screen.getByText(/mixed or incomplete source context/)).toBeTruthy();
 expect(screen.queryByRole("button")).toBeNull();expect(fetch).not.toHaveBeenCalled();
});
it("withholds a closure verdict when a dependency has legacy or missing provenance",async()=>{
 const {files}=await fixture(sc);const legacy={filename:files[0]!.filename,bytes:files[0]!.bytes};
 const library=ok(await prepareLocalCatalogueLibrary([legacy,files[1]!],{import:{batchId:"legacy",importedAt:date}}));
 const fetch=vi.fn();mount(library.selectableCatalogues[0]!,fetch);
 expect(screen.getByText(/mixed or incomplete source context/)).toBeTruthy();expect(fetch).not.toHaveBeenCalled();
 const incomplete=ok(await prepareLocalCatalogueLibrary([files[1]!],{import:{batchId:"missing",importedAt:date}}));
 expect(catalogueSourceContext(incomplete.selectableCatalogues[0]!).eligible).toBe(false);
});
it("does not network for unconfigured repositories or arbitrary imported origins",async()=>{
 const {catalogue}=await fixture({...sc,owner:"Unconfigured"});const fetch=vi.fn();mount(catalogue,fetch);
 expect(catalogueSourceContext(catalogue).eligible).toBe(false);expect(screen.queryByRole("button")).toBeNull();
 const {files}=await fixture(sc);
 const library=ok(await prepareLocalCatalogueLibrary(files.map(f=>({...f,origin:"https://elsewhere.invalid/private"})),{import:{batchId:"forged",importedAt:date}}));
 expect(catalogueSourceContext(library.selectableCatalogues[0]!).source).toBeUndefined();expect(fetch).not.toHaveBeenCalled();
});
it.each(["offline",429,403,503])("keeps %s unavailable without automatic retries",async failure=>{
 const {catalogue}=await fixture(sc);const fetch=vi.fn(async()=>{if(failure==="offline")throw TypeError("offline");return new Response("",{status:failure as number});});
 mount(catalogue,fetch);fireEvent.click(screen.getByRole("button",{name:"Check source"}));
 expect(await screen.findByText(/Check unavailable/)).toBeTruthy();expect(screen.queryByText(/matches the checked/)).toBeNull();expect(fetch).toHaveBeenCalledTimes(1);
 if(failure===429)expect(screen.getByText(/rate limited/)).toBeTruthy();
});
it("labels a prior observation honestly after failure and across reopen",async()=>{
 const {catalogue}=await fixture(sc);let time=date;
 const fetch=vi.fn<RepositoryFetch>().mockResolvedValueOnce(response(sc.revision)).mockResolvedValueOnce(new Response("",{status:429}));
 const view=mount(catalogue,fetch,()=>time);fireEvent.click(screen.getByRole("button",{name:"Check source"}));await screen.findByText(/matches the checked/);
 time="2026-09-21T00:00:00Z";fireEvent.click(screen.getByRole("button",{name:"Check source"}));await screen.findByText(/Check unavailable/);
 const previous=screen.getByText(/Previous check:/).textContent;expect(previous).not.toContain("Sep 21");
 view.unmount();mount(catalogue,fetch,()=>time);expect(screen.getByText(/Check unavailable/)).toBeTruthy();
 expect(screen.getByText(/Previous check:/).textContent).toBe(previous);expect(fetch).toHaveBeenCalledTimes(2);
});
it("rejects a source switch's late state/cache write even if fetch ignores abort",async()=>{
 const a=(await fixture(sc)).catalogue,b=(await fixture(wh)).catalogue;
 const pending:{signal:AbortSignal|undefined;resolve:(r:Response)=>void}[]=[];
 const fetch=vi.fn<RepositoryFetch>((_url,init)=>new Promise(resolve=>pending.push({signal:init?.signal ?? undefined,resolve})));
 const ca=catalogueSourceContext(a),cb=catalogueSourceContext(b);const view=render(<CatalogueSourceStatus context={ca} options={{fetch}}/>);
 fireEvent.click(screen.getByRole("button",{name:"Check source"}));fireEvent.click(screen.getByRole("button",{name:"Check source"}));expect(fetch).toHaveBeenCalledTimes(1);
 view.rerender(<CatalogueSourceStatus context={cb} options={{fetch}}/>);expect(pending[0]!.signal?.aborted).toBe(true);expect(screen.getByText(/not checked/)).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Check source"}));await act(async()=>pending[1]!.resolve(response(wh.revision)));
 expect(screen.getByText(/matches the checked/)).toBeTruthy();await act(async()=>pending[0]!.resolve(response("b".repeat(40))));
 expect(screen.queryByText(/snapshot differs/)).toBeNull();view.rerender(<CatalogueSourceStatus context={ca} options={{fetch}}/>);expect(screen.getByText(/not checked/)).toBeTruthy();
});
it("re-rendering and unmounting cannot start or finish requests",async()=>{
 const {catalogue}=await fixture(sc);const context=catalogueSourceContext(catalogue);let resolve!:(r:Response)=>void;
 const fetch=vi.fn<RepositoryFetch>(()=>new Promise(r=>{resolve=r;}));const view=render(<CatalogueSourceStatus context={context} options={{fetch}}/>);
 for(let i=0;i<10;i++)view.rerender(<CatalogueSourceStatus context={context} options={{fetch}}/>);expect(fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Check source"}));view.unmount();await act(async()=>resolve(response(sc.revision)));
 mount(catalogue,fetch);expect(screen.getByText(/not checked/)).toBeTruthy();
});
it("keeps identical catalogue names/IDs in different repositories out of each other's cache",async()=>{
 const a=(await fixture(sc)).catalogue,b=(await fixture(wh)).catalogue;expect(a.id).toBe(b.id);expect(a.name).toBe(b.name);
 const fetch=vi.fn<RepositoryFetch>(async()=>response(sc.revision));const ca=catalogueSourceContext(a),cb=catalogueSourceContext(b);
 const view=render(<CatalogueSourceStatus context={ca} options={{fetch}}/>);fireEvent.click(screen.getByRole("button",{name:"Check source"}));await screen.findByText(/matches the checked/);
 view.rerender(<CatalogueSourceStatus context={cb} options={{fetch}}/>);expect(screen.getByText(/not checked/)).toBeTruthy();
 view.rerender(<CatalogueSourceStatus context={ca} options={{fetch}}/>);expect(screen.getByText(/matches the checked/)).toBeTruthy();expect(fetch).toHaveBeenCalledTimes(1);
});
it("save/reopen retains old provenance and a check changes no roster, source, budget, history or costs",async()=>{
 const source={...sc,revision:"c".repeat(40)};const {library,catalogue}=await fixture(source);
 let session=ok(createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId("r"),forceId:forceOccurrenceId("f"),name:"Player &quot; name"}));
 const empty=session.roster;session=ok(addLocalRosterRootSelection(session,localRosterRootChoices(catalogue)[0]!,{selectionId:selectionOccurrenceId("u")}));
 session=ok(setLocalRosterResourceBudget(session,objectId("pts"),75));
 const draft=ok(createLocalRosterDraft({id:"saved",createdAt:date,updatedAt:date,catalogueKey:catalogue.key,roster:session.roster,history:{past:[empty],future:[]},import:{batchId:library.importReport.batchId,importedAt:date,files:library.importReport.files.map(({source,sourceBytes})=>({filename:source.filename,bytes:new Uint8Array(sourceBytes),sourceId:source.sourceId,sourceKind:source.kind,origin:source.origin!}))}}));
 const before=JSON.stringify(draft),costs=JSON.stringify(evaluateLocalRosterCosts(session));
 const decoded=ok(decodeLocalRosterDraft(draft));const rebuilt=ok(await prepareLocalCatalogueLibrary(decoded.import.files,{import:decoded.import}));
 const restored=ok(restoreLocalRosterSession(rebuilt.selectableCatalogues.find(c=>c.key===decoded.catalogueKey)!,decoded.roster));
 expect(catalogueSourceContext(restored.catalogue)).toMatchObject({source,configuredRevision:sc.revision});
 mount(restored.catalogue,vi.fn(async()=>response(sc.revision)));fireEvent.click(screen.getByRole("button",{name:"Check source"}));await screen.findByText(/snapshot differs/);
 expect(JSON.stringify(draft)).toBe(before);expect(JSON.stringify(evaluateLocalRosterCosts(session))).toBe(costs);
 expect(restored.roster).toEqual(decoded.roster);expect(restored.roster.name).toBe("Player &quot; name");
 expect(rebuilt.importReport.files.map(f=>Array.from(f.sourceBytes))).toEqual(library.importReport.files.map(f=>Array.from(f.sourceBytes)));
 expect(rebuilt.importReport.files.map(f=>f.source)).toEqual(library.importReport.files.map(f=>f.source));
});

it("bounds observations and separates different retained revisions of the same repository",async()=>{
 const {catalogue}=await fixture(sc);const base=catalogueSourceContext(catalogue);
 const fetch=vi.fn<RepositoryFetch>(async()=>response(sc.revision));
 const contexts=Array.from({length:65},(_,i)=>({...base,key:`revision-${i}`,source:ok(pinGitHubRepository({...sc,revision:i.toString(16).padStart(40,"0")}))}));
 const view=render(<CatalogueSourceStatus context={contexts[0]!} options={{fetch}}/>);
 for(const context of contexts){
  view.rerender(<CatalogueSourceStatus context={context} options={{fetch}}/>);
  expect(screen.getByText(/not checked/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Check source"}));await screen.findByText(/snapshot differs/);
 }
 view.rerender(<CatalogueSourceStatus context={contexts[0]!} options={{fetch}}/>);
 expect(screen.getByText(/not checked/)).toBeTruthy();
 view.rerender(<CatalogueSourceStatus context={contexts[1]!} options={{fetch}}/>);
 expect(screen.getByText(/snapshot differs/)).toBeTruthy();expect(fetch).toHaveBeenCalledTimes(65);
});

it("does not attribute an unusable local check time to a repository success",async()=>{
 const {catalogue}=await fixture(sc);mount(catalogue,vi.fn(async()=>response(sc.revision)),()=>"invalid");
 fireEvent.click(screen.getByRole("button",{name:"Check source"}));
 expect(await screen.findByText(/device did not provide a usable check time/)).toBeTruthy();
 expect(screen.queryByText(/matches the checked/)).toBeNull();
});
