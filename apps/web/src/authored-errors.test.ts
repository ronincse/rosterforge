/** Fictional signed-resource requirements exercised through the production session. */
import { describe, expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, inspectLocalRosterSupportedValidation, localRosterRootChoices, removeLocalRosterSelection, restoreLocalRosterSession, type LocalRosterSession } from "./roster-session.js";

function ok<T>(result: Result<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.diagnostics)); return result.value; }
const condition = (field = "charge", extra = "") => `<condition field="${field}" scope="roster" childId="any" shared="true" includeChildSelections="true" includeChildForces="true" type="lessThan" value="0" ${extra}/>`;
const error = (message = "Charge exhausted.", query = condition(), extra = "") => `<modifier type="add" field="error" value="${message}" ${extra}><conditions>${query}</conditions></modifier>`;
async function session(modifiers = error(), costModifier = "") {
  const xml = `<catalogue id="fiction" name="Fiction" gameSystemId="system" gameSystemRevision="1" revision="1" battleScribeVersion="2.03"><costTypes><costType id="charge" name="Charge"/><costType id="spare" name="Spare"/></costTypes><forceEntries><forceEntry id="army" name="Army"><modifiers>${modifiers}</modifiers></forceEntry></forceEntries><selectionEntries><selectionEntry id="credit" name="Credit" type="unit"><costs><cost typeId="charge" value="1"/></costs></selectionEntry><selectionEntry id="debit" name="Debit" type="unit"><costs><cost typeId="charge" value="-1"/><cost typeId="spare" value="-2"/></costs>${costModifier}</selectionEntry></selectionEntries></catalogue>`;
  const library = ok(await prepareLocalCatalogueLibrary([{ filename: "fiction.cat", bytes: new TextEncoder().encode(xml) }, { filename: "system.gst", bytes: new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"/>') }], { import: { batchId: "errors", importedAt: "2026-09-14T00:00:00Z" } }));
  const catalogue = library.catalogues[0]!;
  return ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("r"), forceId: forceOccurrenceId("f"), name: "Fiction" }));
}
function add(s: LocalRosterSession, name: string, id: string) { return ok(addLocalRosterRootSelection(s, localRosterRootChoices(s.catalogue).find(c => c.materialized.name === name)!, { selectionId: selectionOccurrenceId(id) })); }
const validation = (s: LocalRosterSession) => ok(inspectLocalRosterSupportedValidation(s)).status;

describe("authored force errors", () => {
  it("preserves positive, zero, negative and repaired balances, including restored state", async () => {
    const empty = await session();
    const positive = add(empty, "Credit", "c");
    const zero = add(positive, "Debit", "d");
    const negative = add(zero, "Debit", "d2");
    for (const s of [empty, positive, zero]) expect(validation(s)).toMatchObject({ validity: "valid", completeness: "complete", findingCounts: { authoredErrors: 0 } });
    expect(validation(negative)).toMatchObject({ validity: "invalid", completeness: "complete", statusCounts: { violated: 1 }, findingCounts: { authoredErrors: 1 } });
    expect(validation(negative).findings.map(f => f.kind)).toEqual(["authoredError"]);
    // Restoration uses the durable roster; the result is recomputed, never saved.
    const restored = ok(restoreLocalRosterSession(negative.catalogue, JSON.parse(JSON.stringify(negative.roster))));
    expect(validation(restored)).toMatchObject({ validity: "invalid", findingCounts: { authoredErrors: 1 } });
    expect(validation(ok(removeLocalRosterSelection(restored, selectionOccurrenceId("d2"))))).toMatchObject({ validity: "valid", completeness: "complete" });
  });
  it.each([
    ["unknown envelope child", error("Unknown").replace(condition(), "<futureCondition/>" )],
    ["condition extension", error("Unknown", condition().replace("/>", "><future/></condition>"))],
    ["invalid flag", error("Unknown", condition().replace('shared="true"', 'shared="future"'))],
    ["container extension", error().replace("<conditions>", '<conditions future="true">')],
    ["missing resource", error("Unknown", condition("missing"))],
    ["unknown condition", error("Unknown", condition().replace('type="lessThan"', 'type="future"'))],
    ["unknown attribute", error("Unknown", condition(), 'future="true"')],
    ["missing message", error("")],
    ["unknown operation", error().replace('type="add"', 'type="replace"')],
    ["unknown condition scope", error("Unknown", condition().replace('scope="roster"', 'scope="self"'))],
  ])("keeps %s unresolved without an invented violation", async (_name, xml) => {
    const result = validation(add(await session(xml), "Debit", "d"));
    expect(result).toMatchObject({ validity: "valid", completeness: "incomplete", statusCounts: { violated: 0, unresolved: 1 } });
  });
  it("propagates uncertainty in the queried resource's modified total", async () => {
    const s = add(await session(error(), '<modifiers><modifier field="charge" type="set" value="2"/></modifiers>'), "Debit", "d");
    expect(validation(s)).toMatchObject({ validity: "valid", completeness: "incomplete", findingCounts: { authoredErrors: 1 } });
  });
  it("retains grouped and repeated error behavior as unresolved", async () => {
    for (const xml of [error().replace('</modifier>', '<repeats><repeat value="1" field="selections" scope="roster" childId="any"/></repeats></modifier>'), '</modifiers><modifierGroups><modifierGroup><modifiers>' + error() + '</modifiers></modifierGroup></modifierGroups><modifiers>']) {
      expect(validation(add(await session(xml), "Debit", "d"))).toMatchObject({ validity: "valid", completeness: "incomplete", statusCounts: { unresolved: 1 } });
    }
  });
  it("does not taint a known resource with unrelated missing cost metadata", async () => {
    const s = add(await session(error(), '<costs><cost typeId="missing" value="0"/></costs>'), "Debit", "d");
    expect(validation(s).authoredErrors).toMatchObject({ completeness: "complete", errors: [{ status: "violated" }] });
  });
  it("counts independent messages individually and excludes inactive errors", async () => {
    const s = add(await session(error() + error("Spare exhausted.", condition("spare"))), "Debit", "d");
    expect(validation(s).statusCounts.violated).toBe(2);
    const repairedCharge = add(s, "Credit", "c");
    expect(validation(repairedCharge).findings.filter(f => f.kind === "authoredError").map(f => f.report.message)).toEqual(["Spare exhausted."]);
  });
  it("deactivates unsupported operations behind a definitely false condition", async () => {
    expect(validation(await session(error("Inactive", condition(), 'future="true"')))).toMatchObject({ validity: "valid", completeness: "complete" });
  });
});
