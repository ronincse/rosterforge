// Real synthetic imports exercise the presentation boundary without mocking evaluation.
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices, setLocalRosterSelectionAmount } from "./roster-session.js";
import { createUnitReferenceModel, referenceAttribution } from "./unit-reference-model.js";

async function squad(count: number) {
  const prepared = await prepareLocalCatalogueLibrary(["projection.gst", "unit-reference.cat"].map(filename => ({ filename, bytes: new Uint8Array(readFileSync(`packages/test-fixtures/fixtures/${filename}`)) })), { import: { batchId: "reference-test", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Import failed");
  const catalogue = prepared.value.selectableCatalogues.find(c => c.id === "reference")!;
  const created = createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("reference-roster"), forceId: forceOccurrenceId("reference-force"), name: "Reference" });
  if (!created.ok) throw new Error("Create failed");
  let session = created.value;
  const root = localRosterRootChoices(catalogue).find(c => c.materialized.id === "reference-squad")!;
  const added = addLocalRosterRootSelection(session, root, { selectionId: selectionOccurrenceId("unit") });
  if (!added.ok) throw new Error("Add failed");
  session = added.value;
  const choice = session.selectionChoices.get(selectionOccurrenceId("unit"))!.selectionEntries[0]!;
  for (let i = 0; i < count; i++) {
    const child = addLocalRosterChildSelection(session, selectionOccurrenceId("unit"), choice, { selectionId: selectionOccurrenceId(`model-${i}`) });
    if (!child.ok) throw new Error("Model failed");
    const weapon = addLocalRosterChildSelection(child.value, selectionOccurrenceId(`model-${i}`), choice.selectionEntries[0]!, { selectionId: selectionOccurrenceId(`weapon-${i}`) });
    if (!weapon.ok) throw new Error("Weapon failed");
    session = weapon.value;
  }
  return session;
}

it("groups static repeats, retains distinct sources, effective values, modifier evidence and uncertainty", async () => {
  const session = await squad(3);
  const rosterBefore = session.roster;
  const model = createUnitReferenceModel(session, session.roster.forces[0]!.selections[0]!);
  const named = (name: string) => model.profiles.filter(g => g.profile.value.name === name);
  expect(named("Reference Model")).toHaveLength(2); // same text/value, different source definitions
  expect(named("Reference Model").map(g => g.members.length)).toEqual([3, 3]);
  expect(named("Shared linked profile")).toHaveLength(2);
  expect(named("Shared linked profile").every(g => g.members.length === 3)).toBe(true);
  expect(model.rules.filter(g => g.rule.value.name === "Shared linked rule")).toHaveLength(2);
  expect(named("Enhanced Model")).toHaveLength(3);
  expect(named("Enhanced Model").map(g => g.report?.report.characteristics[0]?.value)).toEqual(["7", "7", "7"]);
  expect(named("Same Value")).toHaveLength(3); // same final value does not erase write context
  expect(named("Uncertain Model")).toHaveLength(3);
  expect(named("Uncertain Model").every(g => g.report?.completeness === "incomplete")).toBe(true);
  expect(model.rules.find(g => g.rule.value.name === "Plain rule")?.members).toHaveLength(3);
  expect(model.rules.filter(g => g.rule.value.name === "Uncertain rule")).toHaveLength(3);
  expect(model.rules.filter(g => g.rule.value.name === "Uncertain rule").every(g => g.rule.report.completeness === "incomplete")).toBe(true);
  expect(model.rules.some(g => g.rule.value.name === "Hidden rule")).toBe(false);
  expect(model.supplementary).toHaveLength(3);
  expect(model.supplementary.every(g => g.groups[0]?.name === "Scoped information" && g.unresolved.length === 1)).toBe(true);
  expect(session.roster).toBe(rosterBefore);
});

it("keeps ten selected copies compact without fabricating ancestor-multiplied equipment amounts", async () => {
  const session = await squad(10);
  const model = createUnitReferenceModel(session, session.roster.forces[0]!.selections[0]!);
  const weapons = model.profiles.filter(g => g.profile.value.name === "Reference weapon");
  expect(weapons).toHaveLength(1);
  expect(referenceAttribution(weapons[0]!.members)).toBe("10× Reference Model");
  const changed = setLocalRosterSelectionAmount(session, selectionOccurrenceId("model-0"), 3);
  if (!changed.ok) throw new Error("Amount failed");
  const next = createUnitReferenceModel(changed.value, changed.value.roster.forces[0]!.selections[0]!);
  const split = next.profiles.filter(g => g.profile.value.name === "Reference weapon");
  expect(split).toHaveLength(2); // different bearer quantity/loadout context
  expect(split.map(g => referenceAttribution(g.members))).toEqual(["1× Reference Model", "9× Reference Model"]);
  expect(split.every(g => g.report?.report.characteristics[0]?.value === "2")).toBe(true);
  const conditional = next.profiles.filter(g => g.profile.value.name === "Conditional Model");
  expect(conditional[0]?.report?.report.characteristics[0]?.value).toBe("9");
  expect(conditional.slice(1).every(g => g.report?.report.characteristics[0]?.value === "6")).toBe(true);
});

it("preserves resolved descendants below an unavailable parent with explicit unknown scope", async () => {
  const session = await squad(2);
  const choices = new Map(session.selectionChoices);
  choices.delete(selectionOccurrenceId("unit"));
  const model = createUnitReferenceModel({ ...session, selectionChoices: choices }, session.roster.forces[0]!.selections[0]!);
  expect(model.unavailableOwners.map(s => s.id)).toEqual(["unit"]);
  expect(model.profiles.some(g => g.profile.value.name === "Reference weapon")).toBe(true);
});
