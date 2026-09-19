// Opt-in document acceptance over frozen private/local fixtures. Only generated
// scalar documents leave the test; third-party source bytes stay gitignored.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { objectId, type Result } from "@rosterforge/foundation";
import { decodeLocalRosterDraft } from "@rosterforge/persistence";
import { rosterId, forceOccurrenceId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createLocalRosterSession, restoreLocalRosterSession, localRosterRootChoices, addLocalRosterRootSelection, addLocalRosterChildSelection, inspectLocalRosterChildChoices, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation, setLocalRosterResourceBudget, type LocalRosterSession } from "./roster-session.js";
import { createRosterPrintViewModel, renderRosterPrintDocument } from "./roster-print.js";
import { printedProfileRows } from "./army-reference-sharing.js";

const starcraft = process.env.ROSTERFORGE_STARCRAFT_PILOT_DIR;
const darkAngels = process.env.ROSTERFORGE_PRINT_DARK_ANGELS;
const output = process.env.ROSTERFORGE_PRINT_OUTPUT;
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(r.diagnostics.map(d => `${d.code}: ${d.message}`).join("\n")); return r.value; }
function document(session: LocalRosterSession, name: string) {
  const before = JSON.stringify(session.roster);
  const model = createRosterPrintViewModel(session, evaluateLocalRosterCosts(session), inspectLocalRosterSupportedValidation(session));
  for (const layout of ["compact", "sheets"] as const) {
    const html = renderRosterPrintDocument({ ...model, layout });
    expect(html).not.toMatch(/<script|<img|<link|onerror=/);
    expect(html).not.toContain("sourceBytes");
    expect(html).toContain("Army index");
    if (output) { mkdirSync(output, { recursive: true }); writeFileSync(join(output, `${name}-${layout}.html`), html); }
  }
  if (output) writeFileSync(join(output, `${name}-facts.json`), JSON.stringify(model.reference, null, 2));
  expect(JSON.stringify(session.roster)).toBe(before);
  return model.reference;
}

it.skipIf(!starcraft)("exports pinned reinforced Terran and Protoss facts through both production layouts", async () => {
  const files = [
    ["Starcraft The Miniature Game.gst", "ae9e9e9dbbff610794215a475f7af5a352ee61665dec59152167fb54be11e4c4"],
    ["Terrans.cat", "01959a98e416429b079ea5fd173c9e197a21595d15b47681acf9bc36d7d854c0"],
    ["Protoss.cat", "97f0ab73c9a366110274826f6af2d9b76e58cc3a415cc5200251b89e79974398"],
    ["Zergs.cat", "f9c64766547db386ec2b2b0f3ee7e465fef7dbf47f2b21ae8984e7e1edc394bd"],
  ];
  const library = ok(await prepareLocalCatalogueLibrary(files.map(([filename, hash]) => {
    const bytes = new Uint8Array(readFileSync(join(starcraft!, filename!)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
    return { filename: filename!, bytes };
  }), { import: { batchId: "print-pilot", importedAt: "2026-09-17T00:00:00Z" } }));
  let serial = 0;
  const next = () => selectionOccurrenceId(`print-pilot-${++serial}`);
  const create = (name: string) => {
    const c = library.selectableCatalogues.find(c => c.name === name)!;
    return ok(createLocalRosterSession(c, c.context.forces.definitions[0]!, { rosterId: rosterId(name), forceId: forceOccurrenceId(name), name: `${name} print reference`, createSelectionId: next }));
  };
  const add = (s: LocalRosterSession, name: string) => {
    const id = next();
    return { id, session: ok(addLocalRosterRootSelection(s, localRosterRootChoices(s.catalogue).find(c => c.materialized.name === name)!, { selectionId: id, createSelectionId: next })) };
  };
  let terran = add(create("Terran"), "Terran Armed Forces").session;
  const marine = add(terran, "Marines"); terran = marine.session;
  const choices = ok(inspectLocalRosterChildChoices(terran, marine.id));
  const shield = choices.groups.flatMap(g => g.choices).find(c => c.name === "Combat Shield")!;
  terran = ok(addLocalRosterChildSelection(terran, marine.id, shield, { selectionId: next(), createSelectionId: next }));
  terran = ok(addLocalRosterChildSelection(terran, marine.id, choices.direct.find(c => c.choice.name === "Reinforce")!.choice, { selectionId: next(), createSelectionId: next }));
  terran = ok(setLocalRosterResourceBudget(terran, objectId("5bcf-897a-a5c9-d0e8"), 225));
  const td = document(terran, "terran");
  expect(td.units.find(u => u.name.endsWith("Marines"))?.composition).toBe("9× Marine");
  expect(td.resources).toContainEqual(expect.objectContaining({ name: " Minerals", value: 240, limit: 225 }));
  expect(td.units.flatMap(u => u.profiles)).toContainEqual(expect.objectContaining({ name: "Combat Shield", section: "ability" }));
  let protoss = add(create("Protoss"), "Daelaam").session;
  protoss = add(protoss, "Sentries").session;
  const pd = document(protoss, "protoss");
  expect(pd.units.find(u => u.name.endsWith("Sentries"))?.composition).toBe("2× Sentry");
  expect(pd.units.flatMap(u => u.profiles).filter(p => p.section === "ability").some(p => p.fields.some(f => f.name === "Cost"))).toBe(true);
}, 120_000);

it.skipIf(!darkAngels)("restores the disposable 14-unit Dark Angels copy without changing its frozen bytes", async () => {
  const bytes = readFileSync(darkAngels!);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe("9f0f9b94152102db6fddb378f34eaea9855874dc0b12ceb9ebfa0441cdc4937c");
  const raw = JSON.parse(bytes.toString()) as { import: { files: { bytes: number[] | Uint8Array }[] } };
  for (const file of raw.import.files) file.bytes = new Uint8Array(file.bytes);
  const original = ok(decodeLocalRosterDraft(raw));
  const library = ok(await prepareLocalCatalogueLibrary(original.import.files, { import: { batchId: original.import.batchId, importedAt: original.import.importedAt } }));
  const catalogue = library.selectableCatalogues.find(c => c.key === original.catalogueKey)!;
  const session = ok(restoreLocalRosterSession(catalogue, original.roster));
  const d = document(session, "dark-angels");
  expect(d.units.filter(u => !u.configuration)).toHaveLength(14);
  expect(d.units.filter(u => u.name.endsWith("Intercessor Squad")).slice(0, 2).map(u => u.costs.find(c => c.name === "pts")?.value)).toEqual([80, 150]);
  expect(d.units.filter(u => u.name.endsWith("Deathwing Knights")).map(u => u.costs.find(c => c.name === "pts")?.value)).toEqual([240, 240, 260]);
  expect(d.resources).toContainEqual(expect.objectContaining({ value: 2000 }));
  expect(d.units.some(u => u.relationships.length > 0)).toBe(true);
  expect(d.glossary.length).toBeGreaterThan(5);
  const captain = d.units.find(u => u.name.endsWith("Captain"))!;
  expect(captain.highlights).toEqual(expect.arrayContaining(["Warlord", "Artificer Armour"]));
  expect(captain.profiles.flatMap(p => p.fields)).toContainEqual(expect.objectContaining({ name: "Sv", value: "2+", note: "Modified from 3+." }));
  const impulsor = d.units.find(u => u.name.endsWith("Impulsor"))!;
  for (const unit of d.units) {
    const rows = printedProfileRows(unit.profiles);
    expect(rows.flatMap(row => row.records).map(record => record.record).sort()).toEqual(unit.profiles.map(record => record.record).sort());
    expect(rows.flatMap(row => row.records).flatMap(record => record.members ?? []).sort((a, b) => a.key.localeCompare(b.key))).toEqual(unit.profiles.flatMap(record => record.members ?? []).sort((a, b) => a.key.localeCompare(b.key)));
  }
  const five = d.units.find(u => u.name.endsWith("Intercessor Squad") && u.overview === "5 models")!;
  expect(five.profiles).toHaveLength(22);
  expect(printedProfileRows(five.profiles).length).toBeLessThan(22);
  for (const [name, operand] of [["Deadly Demise", "D3"], ["Firing Deck", "6"]]) {
    const rule = d.glossary.find(r => impulsor.rules.includes(r.anchor) && r.name === name)!;
    expect(rule.parameterNote).toContain(`append name "${operand}"`);
    expect(rule.parameterNote).toContain("not evaluated");
  }
  expect(d.glossary.some(r => ["Impulsor", "Incinerator", "Keywords"].includes(r.name))).toBe(false);
  expect(d.units.flatMap(u => u.keywords)).not.toContain("e21f-8e64-c5d-7df0");
  expect(readFileSync(darkAngels!).equals(bytes)).toBe(true);
}, 180_000);
