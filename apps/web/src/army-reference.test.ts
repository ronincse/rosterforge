// Synthetic selected-reference agreement and hostile/oversized document safety.
import { expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { failure, type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createLocalRosterSession, addLocalRosterRootSelection, addLocalRosterChildSelection, localRosterRootChoices, setLocalRosterSelectionAmount, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation } from "./roster-session.js";
import { createUnitReferenceModel, referenceAttribution } from "./unit-reference-model.js";
import { createArmyReferenceDocument, type ArmyReferenceDocument } from "./army-reference-model.js";
import { renderArmyReferenceDocument } from "./army-reference-html.js";

function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(r.diagnostics.map(d => d.code).join(",")); return r.value; }
async function army() {
  const library = ok(await prepareLocalCatalogueLibrary(["projection.gst", "unit-reference.cat"].map(filename => {
    let text = readFileSync(`packages/test-fixtures/fixtures/${filename}`, "utf8");
    if (filename === "unit-reference.cat") text = text
      .replace('<selectionEntry id="reference-model" name="Reference Model" type="model">', '<selectionEntry id="reference-model" name="Reference Model" type="model"><categoryLinks><categoryLink targetId="model-keyword" /></categoryLinks>')
      .replace('<selectionEntries>', '<categoryEntries><categoryEntry id="model-keyword" name="Model-only Psyker"><infoLinks><infoLink targetId="ward-two" type="rule" /></infoLinks></categoryEntry></categoryEntries><selectionEntries>')
      .replace('This stays attached to its group and owner.', 'This stays attached to its group and owner. See Secondary Ward.')
      .replace('<sharedRules>', '<sharedRules><rule id="ward-two" name="Secondary Ward"><description>See Tertiary Ward.</description></rule><rule id="ward-three" name="Tertiary Ward"><description>A full nested explanation. See Secondary Ward.</description></rule>');
    return { filename, bytes: new TextEncoder().encode(text) };
  }), { import: { batchId: "print-synthetic", importedAt: "2026-09-17T00:00:00Z" } }));
  const c = library.selectableCatalogues.find(c => c.id === "reference")!;
  let s = ok(createLocalRosterSession(c, c.context.forces.definitions[0]!, { rosterId: rosterId("paper"), forceId: forceOccurrenceId("force"), name: "Literal &amp; <img src=x onerror=alert(1)>" }));
  const root = localRosterRootChoices(c).find(c => c.materialized.id === "reference-squad")!;
  s = ok(addLocalRosterRootSelection(s, root, { selectionId: selectionOccurrenceId("unit") }));
  const model = s.selectionChoices.get(selectionOccurrenceId("unit"))!.selectionEntries[0]!;
  for (let i = 0; i < 3; i++) {
    s = ok(addLocalRosterChildSelection(s, selectionOccurrenceId("unit"), model, { selectionId: selectionOccurrenceId(`model-${i}`) }));
    s = ok(addLocalRosterChildSelection(s, selectionOccurrenceId(`model-${i}`), model.selectionEntries[0]!, { selectionId: selectionOccurrenceId(`weapon-${i}`) }));
  }
  s = ok(setLocalRosterSelectionAmount(s, selectionOccurrenceId("model-0"), 3));
  return s;
}

it("agrees with selected reader values/grouping, retains nested rules and exports all forces without mutation", async () => {
  const original = await army();
  // Move a selected occurrence into a second force: document traversal must not
  // depend on the editor's currently visible primary-force selection list.
  const first = original.roster.forces[0]!;
  const session = { ...original, roster: { ...original.roster, forces: [{ ...first, selections: [] }, { ...first, id: forceOccurrenceId("second"), selections: first.selections }] } };
  const before = JSON.stringify(session.roster);
  const reader = createUnitReferenceModel(session, first.selections[0]!);
  const d = createArmyReferenceDocument(session, evaluateLocalRosterCosts(session), inspectLocalRosterSupportedValidation(session));
  expect(d.units).toHaveLength(1);
  expect(d.units[0]?.keywords).not.toContain("Model-only Psyker");
  expect(d.units[0]?.memberKeywords?.some(k => k.includes("Reference Model: Model-only Psyker"))).toBe(true);
  expect(d.glossary.some(r => r.name === "Tertiary Ward" && r.text.includes("full nested explanation"))).toBe(true);
  expect(d.glossary.length).toBeLessThan(25);
  expect(d.units[0]?.options.some(o => o.startsWith("5× Reference Model:"))).toBe(true);
  expect(d.units[0]?.composition).toBe(reader.composition);
  for (const group of reader.profiles) {
    const values = group.profile.value.characteristics.map(c => group.report?.report.characteristics.find(f => f.characteristic === c)?.value ?? c.value);
    expect(d.units[0]?.profiles).toContainEqual(expect.objectContaining({ name: group.report?.name.value ?? group.profile.value.name, attribution: referenceAttribution(group.members), fields: expect.arrayContaining(values.map(value => expect.objectContaining({ value }))) }));
  }
  expect(d.glossary.some(r => r.name === "Scoped rule")).toBe(true);
  expect(d.glossary.filter(r => r.name === "Uncertain rule")).toHaveLength(3);
  expect(d.glossary.some(r => r.name === "Hidden rule")).toBe(false);
  expect(d.units[0]?.notes.join(" ")).toContain("linked information unavailable");
  expect(d.units[0]?.profiles.find(p => p.name === "Enhanced Model")?.fields[0]).toMatchObject({ value: "7", note: "Modified from 6." });
  expect(JSON.stringify(session.roster)).toBe(before);
  const text = JSON.stringify(d);
  expect(text).not.toMatch(/sourceBytes|selectionChoices|modifierApplicability|sourceId|definitionKey/);
  const compact = renderArmyReferenceDocument(d), sheets = renderArmyReferenceDocument(d, "sheets");
  expect(compact.replace('class="compact"', 'class="sheets"')).toBe(sheets);
  expect(compact).toContain("Literal &amp;amp; &lt;img");
  expect(compact).not.toContain("<img");
});

it("keeps empty and unavailable results honest", async () => {
  const s = await army();
  const empty = { ...s, roster: { ...s.roster, forces: [] } };
  const d = createArmyReferenceDocument(empty, failure([]), failure([]));
  expect(d.units).toEqual([]);
  expect(d.status.join(" ")).toContain("Supported costs unavailable");
  expect(renderArmyReferenceDocument(d)).toContain("No selections in this army");
});

it("renders oversized unfamiliar schemas, rule variants, empty keywords and malicious source text without assets", () => {
  const prose = Array.from({ length: 42 }, (_, i) => `Paragraph ${i + 1}. **Hold formation.** *Keep the full explanation.* This fictional unit crosses rough ground, protects its allies, and resolves every selected effect in order. Do not multiply its profile values by its model count.`).join("\n\n");
  const unit = { anchor: "unit-1", name: "1. Archive Guardians", role: "Core", configuration: false, composition: "6× Guardian; 1× Captain", options: ["Captain: 1× Custom blade", "Guardians: 6× Arc rifle"], costs: [{ typeId: "energy", name: "Energy", value: 75 }], profiles: [
    { name: "Arc rifle - focus", type: "Unfamiliar schema", section: "additional" as const, attribution: "6× Guardian", notes: ["Role unavailable; all fields retained."], table: true, fields: Array.from({ length: 12 }, (_, i) => ({ name: `Field ${i + 1}`, value: `${i}`, note: "" })) },
    { name: "Arc rifle - sweep", type: "Weapon", section: "weapon" as const, attribution: "6× Guardian", notes: [], table: true, fields: [{ name: "Attacks", value: "2", note: "" }, { name: "Keywords", value: "", note: "" }] },
    { name: "Unabridged orders", type: "Ability", section: "ability" as const, attribution: "1× Captain", notes: [], table: false, fields: [{ name: "Description", value: prose, note: "" }, { name: "Literal source", value: '<script>alert(1)</script> [bad](javascript:alert(1)) &amp;', note: "" }] },
  ], rules: ["rule-1", "rule-2"], keywords: ["Guardian"], notes: ["Costs unresolved; supported subtotal only."], relationships: ["Leading: 2. Archive Guardians"] };
  const d: ArmyReferenceDocument = { name: "Oversized fictional reference", catalogue: "Synthetic", system: "Fictional system", resources: [{ typeId: "energy", name: "Energy", value: 75, limit: 100, provisional: true }, { typeId: "gas", name: "Gas", value: 4, limit: 10 }], status: ["Known problems; some rules not checked."], units: [unit, { ...unit, anchor: "unit-2", name: "2. Archive Guardians", costs: [{ typeId: "energy", name: "Energy", value: 90 }], profiles: unit.profiles.slice(0, 2) }], glossary: [{ anchor: "rule-1", name: "Shield", text: "Variant one: protect one ally.", note: "", users: [unit.name] }, { anchor: "rule-2", name: "Shield", text: "Variant two: protect two allies.", note: "Different applicable scope.", users: ["2. Archive Guardians"] }] };
  for (const layout of ["compact", "sheets"] as const) {
    const html = renderArmyReferenceDocument(d, layout);
    for (const value of ["Field 12", "Paragraph 42", "Variant one", "Variant two", "75 Energy", "90 Energy", "6× Guardian", "Arc rifle - sweep"]) expect(html).toContain(value);
    expect(html).not.toMatch(/<script|href="javascript:|Empty value|overflow:auto|overflow:hidden/);
    expect(html).toMatch(/<strong>.*?Hold formation\..*?<\/strong>/);
    expect(html).toContain('<thead><tr><th>1. Archive Guardians · Arc rifle - focus<small>');
    if (process.env.ROSTERFORGE_PRINT_OUTPUT) { mkdirSync(process.env.ROSTERFORGE_PRINT_OUTPUT, { recursive: true }); writeFileSync(join(process.env.ROSTERFORGE_PRINT_OUTPUT, `stress-${layout}.html`), html); }
  }
});
