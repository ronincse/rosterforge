// Fictional count-dependent composition through the production creation boundary.
// Minima choose amounts, never arbitrary alternatives or later player edits.
import { expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import * as sessions from "./roster-session.js";
import { commitBoundedHistory, createBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";

function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }

async function fixture({launcher = false, query = "launcher", condition = "atLeast", maximum = 9, minimum = 4, linked = false, groupMaximum = 10, second = false, dynamicTarget = false} = {}) {
  const ordinary = `<selectionEntry id="ordinary" name="Ordinary" type="model"><constraints><constraint id="ordinary-min" type="min" value="${minimum}" field="selections" scope="parent" shared="true" /><constraint id="ordinary-max" type="max" value="${maximum}" field="selections" scope="parent" shared="true" /></constraints><modifiers><modifier type="decrement" field="ordinary-min" value="1"><conditions><condition type="${condition}" value="1" field="selections" scope="fiction-squad" childId="${query}" shared="true" /></conditions></modifier><modifier type="decrement" field="ordinary-max" value="1"><repeats><repeat field="selections" scope="fiction-squad" childId="launcher" shared="true" value="1" repeats="1" /></repeats></modifier></modifiers><selectionEntries><selectionEntry id="rifle" name="Rifle" type="upgrade"><constraints><constraint type="min" field="selections" scope="parent" value="1" /></constraints></selectionEntry></selectionEntries></selectionEntry>`;
  const files = [
    {filename:"conditional.gst",bytes:new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"><forceEntries><forceEntry id="force" name="Force" /></forceEntries></gameSystem>')},
    {filename:"conditional.cat",bytes:new TextEncoder().encode(`<catalogue id="catalogue" name="Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="system" gameSystemRevision="1">${linked ? `<sharedSelectionEntries>${ordinary}</sharedSelectionEntries>` : ""}<selectionEntries><selectionEntry id="fiction-squad" name="Unit" type="unit"><selectionEntryGroups><selectionEntryGroup id="models" name="Models"><constraints><constraint id="models-min" type="min" field="selections" scope="parent" value="5" /><constraint id="models-max" type="max" field="selections" scope="parent" value="${groupMaximum}" /></constraints><selectionEntries><selectionEntry id="sergeant" name="Sergeant" type="model"><constraints><constraint type="min" field="selections" scope="parent" value="1" /><constraint type="max" field="selections" scope="parent" value="1" /></constraints></selectionEntry><selectionEntry id="launcher" name="Launcher" type="model"><constraints><constraint type="min" field="selections" scope="parent" value="${launcher ? 1 : 0}" />${dynamicTarget ? '<constraint id="launcher-max" type="max" field="selections" scope="parent" value="1" automatic="true" />' : ""}</constraints>${dynamicTarget ? '<modifiers><modifier type="set" field="launcher-max" value="0"><conditions><condition type="atLeast" field="selections" scope="fiction-squad" childId="ordinary" shared="true" value="1" /></conditions></modifier></modifiers>' : ""}</selectionEntry>${linked ? "" : ordinary}${second ? ordinary.replaceAll("ordinary", "scarce") : ""}</selectionEntries>${linked ? '<entryLinks><entryLink id="ordinary-link" targetId="ordinary" type="selectionEntry" /></entryLinks>' : ""}</selectionEntryGroup></selectionEntryGroups></selectionEntry></selectionEntries></catalogue>`)},
  ];
  const catalogue = ok(await prepareLocalCatalogueLibrary(files,{import:{batchId:"conditional",importedAt:"2026-09-11T00:00:00Z"}})).selectableCatalogues[0]!;
  let n = 0; const next = () => selectionOccurrenceId(`conditional-${++n}`);
  const empty = ok(sessions.createLocalRosterSession(catalogue,catalogue.context.forces.definitions[0]!,{rosterId:rosterId("conditional"),forceId:forceOccurrenceId("force"),name:"Conditional"}));
  const id = next();
  const added = sessions.addLocalRosterRootSelection(empty,sessions.localRosterRootChoices(catalogue)[0]!,{selectionId:id,createSelectionId:next});
  const session = ok(added);
  return {empty,session,id,next,diagnostics:added.diagnostics};
}

const models = (s: sessions.LocalRosterSession, id: ReturnType<typeof selectionOccurrenceId>) => s.roster.forces[0]!.selections.find(s=>s.id === id)!.selections;

it("does not partially fill independently required entries beyond their enclosing group cap", async () => {
  const f = await fixture({second:true,groupMaximum:5});
  expect(models(f.session,f.id)).toHaveLength(1);
  expect(f.diagnostics.some(d=>d.code === "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED")).toBe(true);
});

it("rejects an over-budget augmentation atomically", async () => {
  await expect(fixture({minimum:3000,maximum:4000,groupMaximum:4000})).rejects.toThrow("WEB_ROSTER_CONDITIONAL_INITIALIZATION_UNSTABLE");
});

it("leaves dependencies on dynamic automatic targets pending", async () => {
  const f = await fixture({dynamicTarget:true});
  expect(models(f.session,f.id)).toHaveLength(1);
  expect(f.diagnostics.some(d=>d.code === "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED")).toBe(true);
});

it.each([false,true])("initializes exact required independent occurrences with launcher=%s", async launcher => {
  const f = await fixture({launcher});
  const selected = models(f.session,f.id);
  expect(selected.filter(s=>s.definition.sourceId === "sergeant")).toHaveLength(1);
  const ordinary = selected.filter(s=>s.definition.sourceId === "ordinary");
  expect(ordinary).toHaveLength(launcher ? 3 : 4);
  expect(selected).toHaveLength(5);
  expect(new Set(selected.map(s=>s.id)).size).toBe(5);
  expect(ordinary.every(s=>s.amount === undefined && s.selections.length === 1)).toBe(true);
  expect(f.diagnostics.filter(d=>d.code === "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED")).toEqual([]);
});

it("supports linked definitions without depending on the source child bucket order", async () => {
  const f = await fixture({linked:true,launcher:true});
  expect(models(f.session,f.id).filter(s=>f.session.selectionChoices.get(s.id)?.definitionId === "ordinary")).toHaveLength(3);
});

it.each([
  {condition:"future"}, {query:"ordinary"}, {maximum:3}, {minimum:0},
])("leaves unknown, cyclic, conflicting or ambiguous composition pending: %j", async options => {
  const f = await fixture(options);
  expect(models(f.session,f.id).filter(s=>s.definition.sourceId === "ordinary")).toHaveLength(0);
  expect(models(f.session,f.id)).toHaveLength(1);
});

it("preserves player removal, duplicate identity, history and restoration without refill", async () => {
  const f = await fixture();
  const ordinary = models(f.session,f.id).filter(s=>s.definition.sourceId === "ordinary");
  expect(ordinary).toHaveLength(4);
  const edited = ok(sessions.removeLocalRosterSelection(f.session,ordinary[0]!.id));
  expect(models(edited,f.id)).toHaveLength(4);
  const history = commitBoundedHistory(createBoundedHistory(f.session),edited);
  expect(models(undoBoundedHistory(history).present,f.id)).toHaveLength(5);
  expect(models(redoBoundedHistory(undoBoundedHistory(history)).present,f.id)).toHaveLength(4);
  const duplicate = ok(sessions.duplicateLocalRosterSelection(edited,f.id,f.next));
  const copy = duplicate.roster.forces[0]!.selections.find(s=>s.id !== f.id)!;
  expect(copy.selections).toHaveLength(4);
  expect(copy.selections.some(c=>models(edited,f.id).some(s=>s.id===c.id))).toBe(false);
  const reopened = ok(sessions.restoreLocalRosterSession(duplicate.catalogue,duplicate.roster));
  expect(reopened.roster).toBe(duplicate.roster);
  expect(models(reopened,copy.id)).toHaveLength(4);
});
