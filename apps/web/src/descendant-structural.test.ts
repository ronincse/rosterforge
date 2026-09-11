// Exercise current structural counting through real import/session commands;
// creation planning is intentionally a separate, conservative contract.
import { expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import * as sessions from "./roster-session.js";
import { commitBoundedHistory, createBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";

function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }

async function fixture(extra = "", modifiers = "", additionalBounds = "", shared = true, ancestorModifiers = "") {
  const files = [
    { filename: "desc.gst", bytes: new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"><forceEntries><forceEntry id="force" name="Force" /></forceEntries></gameSystem>') },
    { filename: "desc.cat", bytes: new TextEncoder().encode(`<catalogue id="catalogue" name="Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="system" gameSystemRevision="1"><sharedSelectionEntries><selectionEntry id="token" name="Token" type="upgrade"><constraints><constraint id="cap" type="max" value="1" field="selections" scope="parent" shared="${shared}" includeChildSelections="true" ${extra}/>${additionalBounds}</constraints>${modifiers}</selectionEntry></sharedSelectionEntries><selectionEntries><selectionEntry id="unit" name="Unit" type="unit">${ancestorModifiers}<entryLinks><entryLink id="direct" name="Token" type="selectionEntry" targetId="token" /></entryLinks><selectionEntries><selectionEntry id="container" name="Container" type="model"><entryLinks><entryLink id="nested" name="Token" type="selectionEntry" targetId="token" /></entryLinks></selectionEntry></selectionEntries></selectionEntry></selectionEntries></catalogue>`) },
  ];
  const catalogue = ok(await prepareLocalCatalogueLibrary(files, {import:{batchId:"desc",importedAt:"2026-09-11T00:00:00Z"}})).selectableCatalogues[0]!;
  let n = 0; const next = () => selectionOccurrenceId(`desc-${++n}`);
  let session = ok(sessions.createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId("desc"),forceId:forceOccurrenceId("force"),name:"Descendants"}));
  const owner = next();
  session = ok(sessions.addLocalRosterRootSelection(session,sessions.localRosterRootChoices(catalogue)[0]!,{selectionId:owner}));
  return {session,owner,next};
}

function tokenBound(session: sessions.LocalRosterSession, owner: ReturnType<typeof selectionOccurrenceId>) {
  return ok(sessions.inspectLocalRosterStructuralStatus(session)).bounds.find(b => b.kind === "direct" && b.owner.id === owner && b.choice.definitionId === "token")!;
}

it("counts shared linked descendants against the current parent, including removal and history", async () => {
  const f = await fixture("", "", '<constraint id="direct-cap" type="max" value="1" field="selections" scope="parent" shared="true" />'); let session = f.session;
  expect(tokenBound(session,f.owner)).toMatchObject({minimum:0,maximum:1,selectedCount:0,status:"satisfied",completeness:"complete"});
  const choices = ok(sessions.inspectLocalRosterChildChoices(session,f.owner)).direct;
  const direct = choices.find(c=>c.choice.definitionId==="token")!.choice;
  const container = choices.find(c=>c.choice.id==="container")!.choice;
  session = ok(sessions.addLocalRosterChildSelection(session,f.owner,direct,{selectionId:f.next()}));
  expect(tokenBound(session,f.owner)).toMatchObject({selectedCount:1,status:"satisfied",completeness:"complete"});
  const before = session; const nestedOwner = f.next();
  session = ok(sessions.addLocalRosterChildSelection(session,f.owner,container,{selectionId:nestedOwner}));
  const nested = ok(sessions.inspectLocalRosterChildChoices(session,nestedOwner)).direct[0]!.choice;
  const nestedId = f.next();
  session = ok(sessions.addLocalRosterChildSelection(session,nestedOwner,nested,{selectionId:nestedId}));
  expect(tokenBound(session,f.owner)).toMatchObject({selectedCount:2,status:"violated",completeness:"complete"});
  const history = commitBoundedHistory(createBoundedHistory(before),session);
  expect(tokenBound(undoBoundedHistory(history).present,f.owner).status).toBe("satisfied");
  expect(tokenBound(redoBoundedHistory(undoBoundedHistory(history)).present,f.owner).status).toBe("violated");
  session = ok(sessions.removeLocalRosterSelection(session,nestedId));
  expect(tokenBound(session,f.owner)).toMatchObject({selectedCount:1,status:"satisfied"});
  const reopened = ok(sessions.restoreLocalRosterSession(session.catalogue, session.roster));
  expect(reopened.roster).toBe(session.roster);
  expect(tokenBound(reopened,f.owner)).toMatchObject({selectedCount:1,status:"satisfied",completeness:"complete"});
});

it.each([
  ['future="true"', ""],
  ["", '<modifiers><modifier type="set" field="cap" value="0"><conditions><condition type="future" field="selections" scope="parent" value="1" /></conditions></modifier></modifiers>'],
])("retains unsupported descendant behavior (%s)", async (extra, modifiers) => {
  const f = await fixture(extra,modifiers);
  expect(tokenBound(f.session,f.owner)).toMatchObject({status:"unresolved",completeness:"incomplete"});
});

it("keeps a missing descendant minimum violated and a stricter direct cap unresolved", async () => {
  const min = await fixture("", "", '<constraint id="floor" type="min" value="1" field="selections" scope="parent" shared="true" includeChildSelections="true" />');
  expect(tokenBound(min.session,min.owner)).toMatchObject({minimum:1,maximum:1,selectedCount:0,status:"violated",completeness:"complete"});
  const mixed = await fixture("", "", '<constraint id="direct-cap" type="max" value="0" field="selections" scope="parent" shared="true" />');
  expect(tokenBound(mixed.session,mixed.owner)).toMatchObject({status:"unresolved",completeness:"incomplete"});
  const differentIdentity = await fixture("", "", '<constraint id="direct-cap" type="max" value="1" field="selections" scope="parent" shared="false" />');
  expect(tokenBound(differentIdentity.session,differentIdentity.owner)).toMatchObject({status:"unresolved",completeness:"incomplete"});
});

it("does not count a different local link as the same non-shared identity", async () => {
  const f = await fixture("", "", "", false);
  const container = ok(sessions.inspectLocalRosterChildChoices(f.session,f.owner)).direct.find(c=>c.choice.id==="container")!.choice;
  const id = f.next();
  let session = ok(sessions.addLocalRosterChildSelection(f.session,f.owner,container,{selectionId:id}));
  const token = ok(sessions.inspectLocalRosterChildChoices(session,id)).direct[0]!.choice;
  session = ok(sessions.addLocalRosterChildSelection(session,id,token,{selectionId:f.next()}));
  expect(tokenBound(session,f.owner)).toMatchObject({selectedCount:0,status:"satisfied",completeness:"complete"});
});

it("does not declare completeness when an immediate or more distant ancestor modifies the cap", async () => {
  const f = await fixture("", "", "", true, '<modifiers><modifier type="set" field="cap" value="0" /></modifiers>');
  expect(tokenBound(f.session,f.owner)).toMatchObject({status:"unresolved",completeness:"incomplete"});
  const container = ok(sessions.inspectLocalRosterChildChoices(f.session,f.owner)).direct.find(c=>c.choice.id==="container")!.choice;
  const id = f.next();
  const session = ok(sessions.addLocalRosterChildSelection(f.session,f.owner,container,{selectionId:id}));
  expect(tokenBound(session,id)).toMatchObject({status:"unresolved",completeness:"incomplete"});
});
