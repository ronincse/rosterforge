// The same fictional XML metadata feeds the captured primary-method matrix.
// These tests exercise RF ingestion, shared queries, validation and persistence.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { objectId, type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { evaluateRosterCondition, inspectRosterResourceBudgets } from "@rosterforge/evaluation";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, inspectLocalRosterSupportedValidation, localRosterRootChoices, setLocalRosterResourceBudget, restoreLocalRosterSession, type LocalRosterSession } from "./roster-session.js";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";
const gst = readFileSync(new URL("./fixtures/counter-activation/system.xml", import.meta.url), "utf8");
const cat = readFileSync(new URL("./fixtures/counter-activation/catalogue.xml", import.meta.url), "utf8");
function ok<T>(result: Result<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.diagnostics)); return result.value; }
async function fixture(source = gst) {
  const files = [{ filename: "probe.gst", bytes: new TextEncoder().encode(source) }, { filename: "probe.cat", bytes: new TextEncoder().encode(cat) }];
  const library = ok(await prepareLocalCatalogueLibrary(files, { import: { batchId: "counter-probe", importedAt: "2026-09-25T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues[0]!;
  const empty = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("probe"), forceId: forceOccurrenceId("probe-force"), name: "Fictional activation" }));
  const choice = localRosterRootChoices(catalogue).find(c => c.materialized.id === "probe-measure")!;
  const session = ok(addLocalRosterRootSelection(empty, choice, { selectionId: selectionOccurrenceId("measure") }));
  return { session, empty, library, files, choice };
}
const budget = (s: LocalRosterSession, id = "probe-f") => inspectRosterResourceBudgets(s.roster, s.catalogue.context).resources.find(b => b.resource.typeId === id)!;
const set = (s: LocalRosterSession, value: number | undefined, id = "probe-f") => ok(setLocalRosterResourceBudget(s, objectId(id), value));
function query(s: LocalRosterSession, id: string) {
  const choice = localRosterRootChoices(s.catalogue).find(c => c.materialized.id === "probe-measure")!;
  const condition = choice.materialized.profiles.find(p => p.id === `${id}-zero`)!.modifiers[0]!.conditions[0]!;
  return ok(evaluateRosterCondition(s.roster, s.catalogue.context, s.roster.forces[0]!.selections[0]!, condition));
}
it("matches all twelve completed-army reference cases without mutating inputs", async () => {
  const { session: s, empty } = await fixture(); const before = JSON.stringify(s.roster);
  for (let i = 0; i < 12; i++) {
    const id = `probe-${String.fromCharCode(97 + i)}`;
    const active = id === "probe-d" || id === "probe-g";
    expect(budget(s,id).resource).toMatchObject({sourceActivation:i%3===0?"included":"omitted",displayVisibility:i%3===1?"hidden":"visible"});
    expect(budget(s, id)).toMatchObject({ value: 5, exact: true, active, status: active ? "violated" : "satisfied" });
    expect(query(s, id)).toMatchObject({ observed: active ? (id === "probe-d" ? 0 : 3) : -1, completeness: "complete" });
    expect(budget(empty, id).status).toBe("satisfied");
  }
  expect(budget(s).resource.authored).toEqual({ kind: "finite", value: 0 });
  expect(budget(s).resource.effective.kind).toBe("inactive");
  expect(inspectRosterResourceBudgets(s.roster, s.catalogue.context).completeness).toBe("complete");
  expect(JSON.stringify(s.roster)).toBe(before); expect(s.roster.resourceBudgetOverrides).toBeUndefined();
  const findings = ok(inspectLocalRosterSupportedValidation(s)).status.findings.filter(f => f.kind === "resourceBudget" && f.status === "violated");
  expect(findings).toHaveLength(2);
});
it("preserves explicit zero, -1, reset, history, source bytes and legacy reopen", async () => {
  const f = await fixture(); const zero = set(f.session, 0);
  expect(budget(zero)).toMatchObject({ active: true, status: "violated", resource: { effective: { kind: "finite", value: 0 } } });
  expect(query(zero, "probe-f").observed).toBe(0);
  const unlimited = set(zero, -1); expect(budget(unlimited)).toMatchObject({ active: false, status: "satisfied" });
  const positive = set(unlimited, 5); expect(budget(positive).status).toBe("satisfied");
  const reset = set(positive, undefined); expect(budget(reset).resource.effective.kind).toBe("inactive");
  const history = commitBoundedHistory(createBoundedHistory(zero), reset);
  expect(budget(undoBoundedHistory(history).present).status).toBe("violated");
  expect(budget(redoBoundedHistory(undoBoundedHistory(history)).present).active).toBe(false);
  for (const s of [f.session, zero, unlimited, positive, reset]) {
    const source = f.library.importReport;
    const draft = ok(createLocalRosterDraft({ id: "probe", createdAt: source.importedAt, updatedAt: source.importedAt, catalogueKey: s.catalogue.key, roster: s.roster, import: { batchId: source.batchId, importedAt: source.importedAt, files: source.files.map(x => ({ filename: x.source.filename, bytes: x.sourceBytes, sourceId: x.source.sourceId, sourceKind: x.source.kind })) } }));
    const decoded = ok(decodeLocalRosterDraft(structuredClone(draft)));
    const restoredLibrary = ok(await prepareLocalCatalogueLibrary(decoded.import.files,{import:{batchId:decoded.import.batchId,importedAt:decoded.import.importedAt}}));
    const reopened = ok(restoreLocalRosterSession(restoredLibrary.selectableCatalogues[0]!, decoded.roster));
    expect(budget(reopened).resource.effective).toEqual(budget(s).resource.effective);
    expect(decoded.import.files.map(x => Array.from(x.bytes))).toEqual(draft.import.files.map(x => Array.from(x.bytes)));
  }
  expect(budget(f.session).resource.override).toBeUndefined();
});
it.each([
  '<modifiers><modifier type="set" field="hidden" value="false" invented="true"/></modifiers>',
  '<modifiers><modifier type="set" field="hidden" value="false"><conditions><condition type="equalTo" field="limit::probe-f" scope="roster" childId="any" shared="true" value="0"/></conditions></modifier></modifiers>',
  '<modifiers><modifier type="set" field="hidden" value="false"/><modifier type="set" field="hidden" value="true"/></modifiers>',
  '<modifierGroups><modifierGroup><modifiers><modifier type="set" field="hidden" value="false"/></modifiers></modifierGroup></modifierGroups>',
])("retains unsupported source activation %s", async body => {
  const source = gst.replace('<costType id="probe-f" name="Channel F" hidden="true" defaultCostLimit="0"><modifiers><modifier type="set" field="hidden" value="false"/></modifiers></costType>', `<costType id="probe-f" name="Channel F" hidden="true" defaultCostLimit="0">${body}</costType>`);
  const { session } = await fixture(source);
  expect(budget(session).resource.effective.kind).toBe("unresolved");
  expect(query(session, "probe-f").completeness).toBe("incomplete");
  expect(query(session, "probe-g")).toMatchObject({ observed: 3, completeness: "complete" });
});

it.each(['futureLimit="condition:probe-g"','futureActivation="custom"'])("retains unknown declaration attributes after an override: %s", async attr => {
 const {session}=await fixture(gst.replace('id="probe-f"',`id="probe-f" ${attr}`));
 expect(budget(set(session,10)).resource.effective.kind).toBe("unresolved");
 expect(query(set(session,10),"probe-f").completeness).toBe("incomplete");
});
it("retains unknown modifier attributes after an override",async()=>{
 const {session}=await fixture(gst.replaceAll('field="hidden"','field="hidden" futureLimit="dependent"'));
 expect(budget(set(session,10)).resource.effective.kind).toBe("unresolved");
});
it("keeps a visible declaration's real cap when a static operation hides its display",async()=>{
 const {session}=await fixture(gst.replace('<costType id="probe-d" name="Channel D" hidden="false" defaultCostLimit="0"></costType>','<costType id="probe-d" name="Channel D" hidden="false" defaultCostLimit="0"><modifiers><modifier type="set" field="hidden" value="true"/></modifiers></costType>'));
 expect(budget(session,"probe-d").resource).toMatchObject({sourceActivation:"included",displayVisibility:"hidden",effective:{kind:"finite",value:0}});
 expect(budget(session,"probe-d").status).toBe("violated");
});

it("withholds malformed base visibility without changing the declared numeric default",async()=>{
 const {session}=await fixture(gst.replace('id="probe-f" name="Channel F" hidden="true"','id="probe-f" name="Channel F" hidden="perhaps"'));
 expect(budget(session).resource).toMatchObject({authored:{kind:"finite",value:0},sourceActivation:"unresolved",effective:{kind:"unresolved"}});
 expect(query(session,"probe-f").completeness).toBe("incomplete");
});

it("does not let a player value bypass an unknown direct behavioral element",async()=>{
 const {session}=await fixture(gst.replace('<costType id="probe-f" name="Channel F" hidden="true" defaultCostLimit="0">','<costType id="probe-f" name="Channel F" hidden="true" defaultCostLimit="0"><futureLimit value="3"/>'));
 expect(budget(set(session,10)).resource.effective.kind).toBe("unresolved");
});
