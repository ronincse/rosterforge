// Fictional saved-source round trips protect legacy identity and player ownership.
import { expect, it } from "vitest";
import { inspectRosterResourceBudgets } from "@rosterforge/evaluation";
import { objectId, type Result } from "@rosterforge/foundation";
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation, localRosterRootChoices, removeLocalRosterSelection, restoreLocalRosterSession, setLocalRosterResourceBudget, setLocalRosterSelectionName } from "./roster-session.js";
import { createRosterPrintViewModel, renderRosterPrintDocument } from "./roster-print.js";
const xml = `<catalogue id="cat&amp;x" name="Fleet&apos;s &amp;quot; name" revision="1">
<costTypes><costType id="ore" name="Ore" defaultCostLimit="200"/></costTypes>
<forceEntries><forceEntry id="force&amp;x" name="Fleet&apos;s Force"/></forceEntries>
<selectionEntries><selectionEntry id="unit&amp;x" name="Unit&apos;s &amp;quot; name" type="unit">
<costs><cost typeId="ore" value="10"/></costs>
<profiles><profile id="p" name="Range"><characteristics><characteristic name="Range" typeId="rng">12&quot; &amp;quot;</characteristic></characteristics></profile></profiles>
<rules><rule id="r" name="Rule"><description>&lt;script&gt;inert&lt;/script&gt; &#38;quot;</description></rule></rules>
</selectionEntry></selectionEntries></catalogue>`;
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }

it("reopens old XML spelling at exact source paths without changing saved labels, IDs, bytes or budgets", async () => {
  const input = new TextEncoder().encode(xml);
  const library = ok(await prepareLocalCatalogueLibrary([{ filename: "values.cat", bytes: input }], { import: { batchId: "xml-draft", importedAt: "2026-09-14T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues[0]!;
  let session = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("xml-draft"), forceId: forceOccurrenceId("force"), name: "Player &quot; army" }));
  const choice = localRosterRootChoices(catalogue)[0]!;
  session = ok(addLocalRosterRootSelection(session, choice, { selectionId: selectionOccurrenceId("unit") }));
  expect(session.roster.forces[0]!.selections[0]!.name).toBe("Unit's &quot; name");
  session = ok(setLocalRosterResourceBudget(session, objectId("ore"), 9));
  // This models exactly the old fields copied by roster-builder before decoding.
  // A player's identical spelling is indistinguishable; both must stay untouched.
  const old = { ...session.roster, catalogue: { ...session.roster.catalogue, sourceId: objectId("cat&amp;x") }, forces: session.roster.forces.map(f => ({ ...f, name: "Fleet&apos;s Force", definition: { ...f.definition, sourceId: objectId("force&amp;x") }, selections: f.selections.map(s => ({ ...s, name: "Unit&apos;s &amp;quot; name", definition: { ...s.definition, sourceId: objectId("unit&amp;x") } })) })) };
  const draft = ok(createLocalRosterDraft({ id: "legacy", createdAt: "2026-09-14T00:00:00Z", updatedAt: "2026-09-14T00:00:00Z", catalogueKey: catalogue.key, roster: old, history: { past: [old], future: [] }, import: { batchId: library.importReport.batchId, importedAt: library.importReport.importedAt, files: library.importReport.files.map(({ source, sourceBytes }) => ({ filename: source.filename, bytes: sourceBytes, sourceId: source.sourceId, sourceKind: source.kind })) } }));
  let stored = draft;
  for (let i = 0; i < 3; i++) {
    const decoded = ok(decodeLocalRosterDraft(structuredClone(stored)));
    const rebuilt = ok(await prepareLocalCatalogueLibrary(decoded.import.files, { import: { batchId: decoded.import.batchId, importedAt: decoded.import.importedAt } }));
    session = ok(restoreLocalRosterSession(rebuilt.selectableCatalogues[0]!, decoded.roster));
    expect(session.roster).toEqual(old);
    expect(decoded.history!.past[0]).toEqual(old);
    expect(decoded.import.files[0]!.bytes).toEqual(input);
    expect(session.selectionChoices.get(selectionOccurrenceId("unit"))?.name).toBe("Unit's &quot; name");
    expect(session.selectionChoices.get(selectionOccurrenceId("unit"))?.profiles[0]?.characteristics[0]?.value).toBe('12" &quot;');
    const validation = ok(inspectLocalRosterSupportedValidation(session));
    expect(validation.status.statusCounts.violated).toBe(1);
    expect(validation.status.findings.filter(f => f.kind === "resourceBudget")).toHaveLength(1);
    expect(validation.status.structural.completeness).toBe("complete");
    stored = ok(createLocalRosterDraft({ ...decoded, roster: session.roster }));
  }
  const renamed = ok(setLocalRosterSelectionName(session, selectionOccurrenceId("unit"), "Player &apos; name"));
  const restored = ok(restoreLocalRosterSession(session.catalogue, renamed.roster));
  expect(restored.roster.forces[0]!.selections[0]!.name).toBe("Player &apos; name");
  const added = ok(addLocalRosterRootSelection(restored, localRosterRootChoices(restored.catalogue)[0]!, { selectionId: selectionOccurrenceId("new-unit") }));
  expect(added.roster.forces[0]!.selections[1]!.name).toBe("Unit's &quot; name");
  const removed = ok(removeLocalRosterSelection(added, selectionOccurrenceId("new-unit")));
  expect(removed.roster).toEqual(restored.roster);
  const print = renderRosterPrintDocument(createRosterPrintViewModel(restored, evaluateLocalRosterCosts(restored), inspectLocalRosterSupportedValidation(restored)));
  expect(print).toContain("Player &amp;quot; army");
  expect(print).not.toContain("<script>inert</script>");
  // A similarly spelled ID with the wrong original source identity cannot match.
  const wrong = { ...old, catalogue: { ...old.catalogue, sourceId: objectId("other&amp;x") } };
  expect(restoreLocalRosterSession(session.catalogue, wrong).ok).toBe(false);
});

it("retains a legacy budget identity without guessing when it lacks a source path", async () => {
  const input = new TextEncoder().encode(xml.replaceAll('"ore"', '"ore&amp;x"'));
  const library = ok(await prepareLocalCatalogueLibrary([{ filename: "values.cat", bytes: input }], { import: { batchId: "xml-budget", importedAt: "2026-09-14T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues[0]!;
  const base = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("r"), forceId: forceOccurrenceId("f"), name: "Budget" }));
  const old = { ...base.roster, resourceBudgetOverrides: [{ typeId: objectId("ore&amp;x"), value: 9 }] };
  const restored = ok(restoreLocalRosterSession(catalogue, old));
  expect(restored.roster).toEqual(old);
  const report = inspectRosterResourceBudgets(restored.roster, catalogue.context);
  expect(report.completeness).toBe("incomplete");
  expect(report.resources.find(r => r.resource.typeId === "ore&amp;x")).toMatchObject({ status: "unresolved" });
  expect(report.resources.find(r => r.resource.typeId === "ore&x")?.resource.override).toBeUndefined();
});
