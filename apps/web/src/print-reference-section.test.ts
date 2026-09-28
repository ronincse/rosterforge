// Fictional source content verifies identity-based presentation ordering only.
import { expect, it } from "vitest";
import { type Result } from "@rosterforge/foundation";
import { rosterId, forceOccurrenceId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createLocalRosterSession, addLocalRosterRootSelection, localRosterRootChoices, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation } from "./roster-session.js";
import { createArmyReferenceDocument } from "./army-reference-model.js";

function ok<T>(r: Result<T>): T { if (!r.ok) throw Error(r.diagnostics.map(d => d.code).join(',')); return r.value; }
it.each([
  ["renamed source labels", "sys-ce49-e853-2fea-6af1", true, false, "", "supporting"],
  ["unrelated system", "other-system", true, false, "", "army"],
  ["missing membership", "sys-ce49-e853-2fea-6af1", false, false, "", "army"],
  ["ambiguous definition", "sys-ce49-e853-2fea-6af1", true, true, "", "army"],
  ["uncertain membership", "sys-ce49-e853-2fea-6af1", true, false, '<modifiers><modifier type="fictional-unknown-operation" field="category" value="9b82-d933-7075-8237"/></modifiers>', "army"],
])("keeps supporting classification bounded: %s", async (_name, system, membership, duplicate, modifiers, section) => {
  const category = '<categoryEntry id="9b82-d933-7075-8237" name="Renamed fictional category"/>';
  const xml = `<catalogue id="catalogue" name="Fiction" gameSystemId="${system}"><categoryEntries>${duplicate ? category : ''}</categoryEntries><selectionEntries><selectionEntry id="choice" name="Unfamiliar choice" type="upgrade">${modifiers}${membership ? '<categoryLinks><categoryLink targetId="9b82-d933-7075-8237" primary="true"/></categoryLinks>' : ''}</selectionEntry></selectionEntries></catalogue>`;
  const gst = `<gameSystem id="${system}" name="Renamed fictional system"><categoryEntries>${category}</categoryEntries><forceEntries><forceEntry id="force" name="Force"/></forceEntries></gameSystem>`;
  const library = ok(await prepareLocalCatalogueLibrary([{ filename: "fiction.cat", bytes: new TextEncoder().encode(xml) }, { filename: "fiction.gst", bytes: new TextEncoder().encode(gst) }], { import: { batchId: "fiction", importedAt: "2026-09-28T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues[0]!;
  let session = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("fiction"), forceId: forceOccurrenceId("fiction"), name: "Fiction" }));
  session = ok(addLocalRosterRootSelection(session, localRosterRootChoices(catalogue)[0]!, { selectionId: selectionOccurrenceId("choice") }));
  const document = createArmyReferenceDocument(session, evaluateLocalRosterCosts(session), inspectLocalRosterSupportedValidation(session));
  expect(document.units[0]?.referenceSection).toBe(section);
});
