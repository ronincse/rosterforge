// Bounded public metadata and canonical recorded provenance; no live network.
import { expect, it, vi } from "vitest";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import { identifyPinnedGitHubProvenance, inspectGitHubRepositoryUpdate, pinGitHubRepository, githubRawFileUrl, ingestDownloadedPinnedGitHubFile, type RepositoryFetch } from "./pinned-github.js";
const revision="a".repeat(40),source={owner:"Owner",repository:"Repo",revision};
const date="2026-09-20T00:00:00Z";
function payload(sha:unknown=revision,time:unknown=date){return [{sha,commit:{committer:{date:time}}}];}
it.each([undefined,"", "abcd", "G".repeat(40), "A".repeat(40), null])("rejects invalid revision %s",async sha=>{
 const fetch=vi.fn(async()=>new Response(JSON.stringify(payload(sha)),{status:200}));
 // Passing undefined must remain missing rather than using the helper default.
 if(sha===undefined)fetch.mockImplementation(async()=>new Response(JSON.stringify([{commit:{committer:{date}}}])));
 expect((await inspectGitHubRepositoryUpdate(source,{fetch})).ok).toBe(false);
});
it.each([undefined,null,"", "not a date", "2026-02-30T00:00:00Z", "2026-09-20"]) ("rejects unusable commit date %s",async time=>{
 const body=time===undefined?[{sha:revision}]:payload(revision,time);
 expect((await inspectGitHubRepositoryUpdate(source,{fetch:async()=>new Response(JSON.stringify(body))})).ok).toBe(false);
});
it.each([{},[],[{sha:revision}],[...payload(),...payload()],"not json"])("rejects malformed metadata %j",async body=>{
 expect((await inspectGitHubRepositoryUpdate(source,{fetch:async()=>new Response(typeof body === "string"?body:JSON.stringify(body))})).ok).toBe(false);
});
it("bounds metadata and rejects redirects without following imported destinations",async()=>{
 const big=await inspectGitHubRepositoryUpdate(source,{fetch:async()=>new Response(" ".repeat(65537))});expect(big.ok).toBe(false);
 const redirected=new Response(JSON.stringify(payload()));Object.defineProperty(redirected,"redirected",{value:true});
 expect((await inspectGitHubRepositoryUpdate(source,{fetch:async()=>redirected})).diagnostics[0]?.code).toBe("REPOSITORY_GITHUB_REDIRECT_REJECTED");
 const fetch=vi.fn<RepositoryFetch>(async()=>new Response(JSON.stringify(payload())));
 expect((await inspectGitHubRepositoryUpdate({owner:"bad/host",repository:"Repo"},{fetch})).ok).toBe(false);expect(fetch).not.toHaveBeenCalled();
 await inspectGitHubRepositoryUpdate(source,{fetch});expect(fetch.mock.calls[0]![1]).toMatchObject({redirect:"error"});
});
it.each(["faction.cat","folder/Name, A & B+é.cat"])("round-trips minted provenance for %s",async path=>{
 const pin=pinGitHubRepository(source);if(!pin.ok)throw Error("Pin");
 const bytes=new TextEncoder().encode('<catalogue id="c" name="C" revision="1" battleScribeVersion="2.03" gameSystemId="g"/>');
 const parsed=await ingestDownloadedPinnedGitHubFile({source:pin.value,path,bytes,origin:githubRawFileUrl(pin.value,path)},{importedAt:date});
 if(!parsed.ok)throw Error("Import");expect(identifyPinnedGitHubProvenance(parsed.value.source)).toEqual({repository:pin.value,path});
});
it.each(["../escape.cat","folder/../escape.cat","bad\\name.cat","bad\u0000.cat","file.txt", "folder/"])("rejects noncanonical or unsafe path %s",path=>{
 const value:SourceFileProvenance={sourceId:sourceId(`download:github:Owner/Repo@${revision}:${path}`),filename:path,kind:"download",importedAt:date,origin:`https://raw.githubusercontent.com/Owner/Repo/${revision}/${path}`};
 expect(identifyPinnedGitHubProvenance(value)).toBeUndefined();
});
it("does not upgrade a local file from an origin URL alone",()=>{
 expect(identifyPinnedGitHubProvenance({sourceId:sourceId(`download:github:Owner/Repo@${revision}:file.cat`),filename:"file.cat",kind:"local-file",importedAt:date,origin:`https://raw.githubusercontent.com/Owner/Repo/${revision}/file.cat`})).toBeUndefined();
});

it.each(["2026-09-19T13:11:08-08:00","2026-09-20T01:30:00+05:30"])("accepts valid offset commit time %s",async time=>{
 expect((await inspectGitHubRepositoryUpdate(source,{fetch:async()=>new Response(JSON.stringify(payload(revision,time)))})).ok).toBe(true);
});
