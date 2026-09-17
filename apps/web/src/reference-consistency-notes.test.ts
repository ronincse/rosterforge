// Fictional cases for the local reference qualification; no game-data fixture.
import { expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices } from "./roster-session.js";
import { createUnitReferenceModel } from "./unit-reference-model.js";
import { referenceConsistencyFieldNotes } from "./reference-consistency-notes.js";

function ok<T>(result: Result<T>): T { if (!result.ok) throw new Error(result.diagnostics.map(d => d.code).join(",")); return result.value; }
async function fixture(selector = "self.entries.recursive.hero.profiles.Body", field = "save", scope = "model", nestedModel = false) {
  const files = [
    ["notes.gst", '<gameSystem id="notes-system" name="Notes" revision="1" battleScribeVersion="2.03"><profileTypes><profileType id="body" name="Body"><characteristicTypes><characteristicType id="save" name="Protection" /></characteristicTypes></profileType></profileTypes><categoryEntries><categoryEntry id="hero" name="Hero" /></categoryEntries><forceEntries><forceEntry id="force" name="Force" /></forceEntries></gameSystem>'],
    ["notes.cat", `<catalogue id="notes" name="Notes" revision="1" battleScribeVersion="2.03" gameSystemId="notes-system" gameSystemRevision="1"><selectionEntries><selectionEntry id="bearer" name="Bearer" type="model"><categoryLinks><categoryLink id="hero-link" targetId="hero" /></categoryLinks><profiles><profile id="body-profile" name="Body" typeId="body" typeName="Body"><characteristics><characteristic typeId="save" name="Protection">3+</characteristic></characteristics></profile></profiles><selectionEntries><selectionEntry id="upgrade" name="Ward plate" type="${nestedModel ? "model" : "upgrade"}"><modifierGroups><modifierGroup type="and"><modifiers><modifier type="set" field="${field}" value="2+" scope="${scope}" affects="${selector}" /></modifiers></modifierGroup></modifierGroups></selectionEntry></selectionEntries></selectionEntry></selectionEntries></catalogue>`],
  ];
  const library = ok(await prepareLocalCatalogueLibrary(files.map(([filename, text]) => ({ filename: filename!, bytes: new TextEncoder().encode(text!) })), { import: { batchId: "reference-notes", importedAt: "2026-09-17T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues[0]!;
  let session = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("notes"), forceId: forceOccurrenceId("force"), name: "Notes" }));
  session = ok(addLocalRosterRootSelection(session, localRosterRootChoices(catalogue)[0]!, { selectionId: selectionOccurrenceId("bearer") }));
  const upgrade = session.selectionChoices.get(selectionOccurrenceId("bearer"))!.selectionEntries[0]!;
  session = ok(addLocalRosterChildSelection(session, selectionOccurrenceId("bearer"), upgrade, { selectionId: selectionOccurrenceId("upgrade") }));
  const owner = session.roster.forces[0]!.selections[0]!;
  const group = createUnitReferenceModel(session, owner).profiles[0]!;
  return { session, owner, group };
}

it("qualifies a matching descendant-only declaration without executing it or changing its report", async () => {
  const { session, owner, group } = await fixture();
  const before = JSON.stringify(session.roster);
  const report = group.report!;
  expect(report.report.characteristics[0]).toMatchObject({ baseValue: "3+", value: "3+", completeness: "complete", steps: [] });
  const notes = referenceConsistencyFieldNotes(session, owner, group.profile, report);
  expect(notes[0]).toHaveLength(1);
  expect(notes[0]![0]).toContain("Ward plate declares a source Protection modification (set 2+)");
  expect(notes[0]![0]).toContain("Conditions and intended applicability remain unconfirmed");
  expect(report.report.characteristics[0]).toMatchObject({ value: "3+", completeness: "complete", steps: [] });
  expect(JSON.stringify(session.roster)).toBe(before);
  expect(JSON.stringify(notes)).not.toMatch(/sourceId|sourceBytes|modifierGroups|body-profile/);
});

it("does not mislabel other fields, types, filters, scopes, association paths or nested-model anchors", async () => {
  for (const [selector, field, scope, nested] of [
    ["self.entries.recursive.other.profiles.Body", "save", "model", false],
    ["self.entries.recursive.hero.profiles.Other", "save", "model", false],
    ["self.entries.recursive.hero.profiles.Body", "other", "model", false],
    ["self.entries.recursive.hero.profiles.Body", "save", "unit", false],
    ["self.profiles.Body", "save", "model", false],
    ["self.entries.group.recursive.profiles.Body", "save", "model", false],
    ["self.entries.recursive.hero.profiles.Body", "save", "model", true],
  ] as const) {
    const { session, owner, group } = await fixture(selector, field, scope, nested);
    expect(referenceConsistencyFieldNotes(session, owner, group.profile, group.report)).toEqual([[]]);
  }
});
