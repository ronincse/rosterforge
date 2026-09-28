// Fictional repositories exercise the production integrity/staging path without
// relying on moving public data or changing an existing army's source context.
import { expect, it, vi } from "vitest";
import { fixtureBytes } from "@rosterforge/test-fixtures";
import { calculateGitBlobObjectId, type RepositoryFetch, type PinnedRepositoryByteCacheEntry } from "@rosterforge/repository";
import { defaultRemoteCatalogueSources, acquireRemoteCatalogue } from "./remote-catalogue-source.js";
import { stageLatestCatalogueSource, selectedCatalogueSource, retainCatalogueSource } from "./latest-catalogue-source.js";
const source = defaultRemoteCatalogueSources[1]!;
const revision = "a".repeat(40), importedAt = "2026-09-28T00:00:00Z";
async function fixture(broken = false, missingDependency = false) {
 const entries = await Promise.all(["minimal.gst","minimal.cat"].map(async path => {
   const original = new Uint8Array(fixtureBytes(path));
   const bytes = missingDependency && path.endsWith('.cat') ? new TextEncoder().encode(new TextDecoder().decode(original).replace('gameSystemId="synthetic-system"','gameSystemId="absent-system"')) : original;
   return {path,bytes,sha:await calculateGitBlobObjectId(bytes)};
 }));
 const fetch = vi.fn<RepositoryFetch>(async url => {
   if (url.endsWith('/commits?per_page=1')) return Response.json([{sha:revision,commit:{committer:{date:importedAt}}}]);
   if (url.includes('/git/trees/')) return Response.json({sha:revision,truncated:false,tree:entries.map(e=>({path:e.path,sha:e.sha,size:e.bytes.length,type:'blob',mode:'100644'}))});
   const entry = entries.find(e=>url.endsWith('/'+e.path));
   return entry && !(broken && entry.path==='minimal.cat') ? new Response(entry.bytes.slice().buffer) : new Response('failed',{status:503});
 });
 const records = new Map<string,PinnedRepositoryByteCacheEntry>();
 const cache = {read:async (key:unknown)=>records.get(JSON.stringify(key)),write:async(key:unknown,value:PinnedRepositoryByteCacheEntry)=>{records.set(JSON.stringify(key),value)}};
 return {fetch,cache,records};
}
it('resolves once and stages complete immutable cold/warm closures; selection survives reload independently of baseline',async()=>{
 const f=await fixture(); const opts={...f,importedAt};
 const first=await stageLatestCatalogueSource(source,opts); expect(first.ok).toBe(true); if(!first.ok)throw Error('stage');
 expect(first.value.definition.repository.revision).toBe(revision);
 expect(f.fetch.mock.calls.filter(([url])=>url.endsWith('/commits?per_page=1'))).toHaveLength(1);
 expect(f.fetch.mock.calls.filter(([url])=>url.includes('raw.githubusercontent')).every(([url])=>url.includes('/'+revision+'/'))).toBe(true);
 const blobCount=f.fetch.mock.calls.filter(([url])=>url.includes('raw.githubusercontent')).length;
 expect(blobCount).toBe(2);
 const warm=await stageLatestCatalogueSource(source,opts);expect(warm.ok).toBe(true);
 expect(f.fetch.mock.calls.filter(([url])=>url.includes('raw.githubusercontent'))).toHaveLength(2);
 const loaded=await acquireRemoteCatalogue(first.value,'minimal.cat',{...opts,batchId:'new-army'});
 expect(loaded.ok && loaded.value.closure.source.revision).toBe(revision);
 const records=new Map<string,string>(); const storage={getItem:(key:string)=>records.get(key)??null,setItem:(key:string,value:string)=>{records.set(key,value)}};
 expect(retainCatalogueSource(source,first.value.definition,storage)).toBe(true);
 expect(selectedCatalogueSource(source,storage).repository.revision).toBe(revision);
 expect(source.repository.revision).toBe('99261754e0449bbaaa04e6890e1625b144f9ece1');
 expect(selectedCatalogueSource(defaultRemoteCatalogueSources[0]!,storage)).toBe(defaultRemoteCatalogueSources[0]);
});
it('rejects partial downloads, aborts, malformed metadata and rate limits without activating a selection',async()=>{
 const broken=await fixture(true);expect((await stageLatestCatalogueSource(source,{...broken,importedAt})).ok).toBe(false);
 const controller=new AbortController();controller.abort();const f=await fixture();
 expect((await stageLatestCatalogueSource(source,{...f,importedAt,signal:controller.signal})).ok).toBe(false);
 for(const response of [new Response('limited',{status:429}),Response.json([{sha:'moving-main'}]),Response.json([])]) {
   const fetch=vi.fn(async()=>response);
   expect((await stageLatestCatalogueSource(source,{fetch,importedAt})).ok).toBe(false);expect(fetch).toHaveBeenCalledOnce();
 }
});
it('rejects an entirely parsed index when a catalogue dependency closure cannot be acquired',async()=>{
 const f=await fixture(false,true);
 expect((await stageLatestCatalogueSource(source,{...f,importedAt})).ok).toBe(false);
 expect(f.fetch.mock.calls.filter(([url])=>url.includes('raw.githubusercontent'))).toHaveLength(2);
});
it('ignores malformed, cross-baseline and URL-shaped stored revisions; storage failure preserves in-memory usability',()=>{
 for(const raw of ['{}','{bad',JSON.stringify({baseline:source.repository.revision,revision:'https://evil.test'}),JSON.stringify({baseline:'other',revision})])
   expect(selectedCatalogueSource(source,{getItem:()=>raw})).toBe(source);
 expect(selectedCatalogueSource(source,{getItem:()=>{throw Error('blocked')}})).toBe(source);
 expect(retainCatalogueSource(source,{...source,repository:{...source.repository,revision}}, {setItem:()=>{throw Error('full')}})).toBe(false);
 expect(retainCatalogueSource(source,defaultRemoteCatalogueSources[0]!,{setItem:vi.fn()})).toBe(false);
});
