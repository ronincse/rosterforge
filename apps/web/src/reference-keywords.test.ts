// Presentation joins use real synthetic imports, with owner/report variants to
// exercise conservative linking without inventing evaluator semantics.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices } from "./roster-session.js";
import { createUnitReferenceModel, type ReferenceProfileGroup } from "./unit-reference-model.js";
import { createReferenceKeywordLinks, isKeywordCharacteristic } from "./reference-keywords.js";

async function reference() {
  const prepared = await prepareLocalCatalogueLibrary(["projection.gst", "keyword-reference.cat"].map(filename => ({ filename, bytes: new Uint8Array(readFileSync(`packages/test-fixtures/fixtures/${filename}`)) })), { import: { batchId: "keyword-test", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Import failed");
  const catalogue = prepared.value.selectableCatalogues.find(c => c.id === "keyword-reference")!;
  const created = createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("keywords"), forceId: forceOccurrenceId("force"), name: "Keywords" });
  if (!created.ok) throw new Error("Create failed");
  const added = addLocalRosterRootSelection(created.value, localRosterRootChoices(catalogue).find(c => c.materialized.id === "keyword-unit")!, { selectionId: selectionOccurrenceId("unit") });
  if (!added.ok) throw new Error("Add failed");
  return createUnitReferenceModel(added.value, added.value.roster.forces[0]!.selections[0]!);
}

function withKeywords(group: ReferenceProfileGroup, value: string): ReferenceProfileGroup {
  // Change the effective report only; the source characteristic stays intact.
  return { ...group, report: { ...group.report!, report: { ...group.report!.report, characteristics: group.report!.report.characteristics.map(c => isKeywordCharacteristic(c.characteristic) ? { ...c, value } : c) } } };
}

it("uses effective text, exact names before bounded parameter forms, and preserves token text", async () => {
  const model = await reference();
  const source = model.profiles[0]!;
  const text = "Rapid Fire D6+3, [Rapid Fire 4]; Anti-Monster/Vehicle 3+, Psychic Assassin, Unknown";
  const group = withKeywords(source, text);
  const linked = createReferenceKeywordLinks({ ...model, profiles: [group] });
  const tokens = [...linked.profiles.get(group)!.values()][0]!;
  expect(tokens.map(t => t.text).join("")).toBe(text);
  expect(tokens.filter(t => t.rule).map(t => t.rule!.rule.value.name)).toEqual(["Rapid Fire", "Rapid Fire", "Anti"]);
  expect(source.profile.value.characteristics.find(isKeywordCharacteristic)?.value).not.toBe(text);
  const rapid = model.rules.find(r => r.rule.value.name === "Rapid Fire")!;
  if (rapid.rule.origin !== "Direct") throw new Error("Expected synthetic direct rule");
  const exact = { ...rapid, rule: { ...rapid.rule, value: { ...rapid.rule.value, name: "Rapid Fire 4" } } };
  const exactGroup = withKeywords(source, "Rapid Fire 4");
  const exactTokens = [...createReferenceKeywordLinks({ ...model, profiles: [exactGroup], rules: [rapid, exact] }).profiles.get(exactGroup)!.values()][0]!;
  expect(exactTokens[0]?.rule).toBe(exact);
});

it("retains ambiguous, incomplete, uncovered and unrendered rules inline", async () => {
  const model = await reference();
  const linked = createReferenceKeywordLinks(model);
  expect(linked.inlineRules.map(r => r.rule.value.name)).not.toContain("Rapid Fire");
  expect(linked.inlineRules.map(r => r.rule.value.name)).toEqual(expect.arrayContaining(["Psychic", "Uncertain", "Ambiguous"]));
  expect(createReferenceKeywordLinks(model, []).inlineRules).toEqual(model.rules);
  const group = model.profiles[0]!;
  const uncertain = { ...group, report: { ...group.report!, completeness: "incomplete" as const } };
  expect(createReferenceKeywordLinks({ ...model, profiles: [uncertain] }).inlineRules).toEqual(model.rules);
  const rapid = model.rules.find(r => r.rule.value.name === "Rapid Fire")!;
  const member = rapid.members[0]!;
  const other = { ...member, owner: { ...member.owner, id: selectionOccurrenceId("other") } };
  const shared = { ...rapid, members: [member, other] };
  expect(createReferenceKeywordLinks({ ...model, rules: [shared] }).inlineRules).toEqual([shared]);
  const grouped = { ...group, members: [member, other] };
  const separate = { ...rapid, members: [other] };
  const divergent = createReferenceKeywordLinks({ ...model, profiles: [grouped], rules: [rapid, separate] });
  expect([...divergent.profiles.get(grouped)!.values()][0]!.some(t => t.rule)).toBe(false);
  expect(divergent.inlineRules).toEqual([rapid, separate]);
});
