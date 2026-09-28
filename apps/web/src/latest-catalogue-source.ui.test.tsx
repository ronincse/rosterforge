// @vitest-environment jsdom
// Controlled completions challenge cancellation and cross-source selection.
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { failure, success, type Result } from "@rosterforge/foundation";
import { defaultRemoteCatalogueSources, type RemoteCatalogueSourceIndex } from "./remote-catalogue-source.js";
import { useRemoteCatalogueSourceController } from "./use-remote-catalogue-source.js";
afterEach(()=>{cleanup();localStorage.clear();});
const source=defaultRemoteCatalogueSources[1]!;
const candidate={definition:{...source,repository:{...source.repository,revision:'a'.repeat(40)}},catalogues:[{path:'fiction.cat'}],diagnostics:[]} as unknown as RemoteCatalogueSourceIndex;
it('aborted and out-of-order staging never updates another context or acquires an army',async()=>{
 const callbacks:((r:Result<RemoteCatalogueSourceIndex>)=>void)[]=[];
 const stage=vi.fn(()=>new Promise<Result<RemoteCatalogueSourceIndex>>(resolve=>callbacks.push(resolve)));
 const onAcquired=vi.fn();const index=vi.fn(async()=>failure([]));
 const {result}=renderHook(()=>useRemoteCatalogueSourceController(onAcquired,{stageLatestSource:stage,indexRemoteSource:index,repositoryByteCache:null,repositoryMetadataCache:null}));
 act(()=>{void result.current.downloadLatestSource(source)});
 act(()=>{result.current.cancelOperation()});
 await act(async()=>{callbacks[0]!(success(candidate))});
 expect(result.current.sources[1]!.repository.revision).toBe(source.repository.revision);
 expect(localStorage.length).toBe(0);
 act(()=>{void result.current.downloadLatestSource(source)});
 await act(async()=>{await result.current.browseSource(defaultRemoteCatalogueSources[0]!)});
 await act(async()=>{callbacks[1]!(success(candidate))});
 expect(result.current.state.kind).toBe('failed');
 expect(result.current.sources[1]!.repository.revision).toBe(source.repository.revision);
 expect(onAcquired).not.toHaveBeenCalled();expect(localStorage.length).toBe(0);
});
it('activates only a successful stage, retains it after remount, and failure keeps it available',async()=>{
 const stage=vi.fn(async()=>success(candidate)); const onAcquired=vi.fn();
 const options={stageLatestSource:stage,repositoryByteCache:null,repositoryMetadataCache:null};
 const first=renderHook(()=>useRemoteCatalogueSourceController(onAcquired,options));
 await act(async()=>{await first.result.current.downloadLatestSource(source)});
 expect(first.result.current.sources[1]!.repository.revision).toBe('a'.repeat(40));
 expect(first.result.current.state).toMatchObject({kind:'ready',message:expect.stringContaining('new armies')});
 expect(onAcquired).not.toHaveBeenCalled(); first.unmount();
 const failed=vi.fn(async()=>failure([]));
 const second=renderHook(()=>useRemoteCatalogueSourceController(onAcquired,{...options,stageLatestSource:failed}));
 expect(second.result.current.sources[1]!.repository.revision).toBe('a'.repeat(40));
 await act(async()=>{await second.result.current.downloadLatestSource(source)});
 expect(second.result.current.sources[1]!.repository.revision).toBe('a'.repeat(40));
 expect(second.result.current.state).toMatchObject({kind:'failed',message:expect.stringContaining('Previous data retained')});
 expect(onAcquired).not.toHaveBeenCalled();
});
