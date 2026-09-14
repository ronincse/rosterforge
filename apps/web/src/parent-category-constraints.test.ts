/** Fictional parent-category bounds through exact catalogue and roster identities. */
import { describe, expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { addRosterForce, addRosterSelectionToSelection, forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { inspectRosterCategoryConstraintsInRoster } from "@rosterforge/evaluation";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, inspectLocalRosterSupportedValidation, localRosterRootChoices, removeLocalRosterSelection, type LocalRosterSession } from "./roster-session.js";
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }
async function create(attributes = 'shared="true"', types = ["min", "max"], modifier = "", linkOwned = false) {
  const bounds = `<constraints>${types.map(type => `<constraint id="${type}" type="${type}" field="selections" scope="parent" value="1" ${attributes}/>`).join("")}</constraints>${modifier}`;
  const member = (id: string, category: string) => `<selectionEntry id="${id}" name="${id}" type="unit"><categoryLinks><categoryLink id="${id}-role" targetId="${category}"/></categoryLinks></selectionEntry>`;
  const xml = `<catalogue id="fiction" name="Fiction" gameSystemId="system" gameSystemRevision="1" revision="1" battleScribeVersion="2.03"><categoryEntries><categoryEntry id="faction" name="Allegiance">${linkOwned ? "" : bounds}</categoryEntry><categoryEntry id="other" name="Other"/></categoryEntries><forceEntries><forceEntry id="army" name="Army"><categoryLinks><categoryLink id="force-role" targetId="faction">${linkOwned ? bounds : ""}</categoryLink></categoryLinks></forceEntry></forceEntries><selectionEntries>${member("alpha", "faction")}${member("other-unit", "other")}</selectionEntries><sharedSelectionEntries>${member("shared", "faction")}</sharedSelectionEntries><entryLinks><entryLink id="link-a" name="Link A" targetId="shared" type="selectionEntry"/><entryLink id="link-b" name="Link B" targetId="shared" type="selectionEntry"/></entryLinks></catalogue>`;
  const library = ok(await prepareLocalCatalogueLibrary([{ filename: "fiction.cat", bytes: new TextEncoder().encode(xml) }, { filename: "system.gst", bytes: new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"/>') }], { import: { batchId: "categories", importedAt: "2026-09-14T00:00:00Z" } }));
  const catalogue = library.catalogues[0]!;
  return ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("r"), forceId: forceOccurrenceId("f"), name: "Fiction" }));
}
const inspect = (s: LocalRosterSession) => ok(inspectLocalRosterSupportedValidation(s)).status;
const bounds = (s: LocalRosterSession) => inspect(s).categoryConstraints.forces.flatMap(f => f.constraints);
function add(s: LocalRosterSession, source: string, id: string, amount?: number) { return ok(addLocalRosterRootSelection(s, localRosterRootChoices(s.catalogue).find(c => c.materialized.id === source)!, { selectionId: selectionOccurrenceId(id), ...(amount === undefined ? {} : { amount }) })); }
describe("parent category definitions", () => {
  it.each([["min"], ["max"], ["min", "max"]])("evaluates static %j with occurrence amounts and repairs", async (...types) => {
    const empty = await create('shared="true"', types);
    expect(bounds(empty).map(c => c.status)).toEqual(types.map(t => t === "min" ? "violated" : "satisfied"));
    const one = add(empty, "alpha", "a");
    expect(bounds(one).every(c => c.status === "satisfied" && c.observed === 1)).toBe(true);
    const two = add(one, "alpha", "b");
    expect(bounds(two).map(c => c.status)).toEqual(types.map(t => t === "max" ? "violated" : "satisfied"));
    expect(bounds(ok(removeLocalRosterSelection(two, selectionOccurrenceId("b")))).every(c => c.status === "satisfied")).toBe(true);
    expect(bounds(add(empty, "alpha", "amounted", 2)).every(c => c.observed === 2)).toBe(true);
  });
  it("counts distinct links to shared members without deduplication; ignores unrelated categories", async () => {
    const unrelated = add(await create(), "other-unit", "o");
    expect(bounds(unrelated)[0]).toMatchObject({ observed: 0, status: "violated" });
    const two = add(add(unrelated, "link-a", "a"), "link-b", "b");
    expect(bounds(two)[1]).toMatchObject({ observed: 2, status: "violated" });
    expect(inspect(two).statusCounts.violated).toBe(inspect(two).findings.filter(f => f.status === "violated").length);
  });
  it.each(['shared="false"', '', 'shared="future"', 'shared="true" includeChildForces="true"', 'shared="true" future="true"'])("withholds unestablished shape %s", async attrs => {
    expect(inspect(await create(attrs))).toMatchObject({ validity: "valid", completeness: "incomplete" });
    expect(bounds(await create(attrs)).every(c => c.status === "unresolved")).toBe(true);
  });
  it("keeps each force independent and omits nested selections unless requested", async () => {
    for (const recursive of [false, true]) {
      let s = add(await create(`shared="true" includeChildSelections="${recursive}"`), "alpha", "a");
      const root = s.roster.forces[0]!.selections[0]!;
      s = { ...s, roster: ok(addRosterSelectionToSelection(s.roster, root.id, { id: selectionOccurrenceId("nested"), definition: root.definition })) };
      expect(bounds(s)[1]?.observed).toBe(recursive ? 2 : 1);
      s = { ...s, roster: ok(addRosterForce(s.roster, { id: forceOccurrenceId("other"), definition: s.roster.forces[0]!.definition })) };
      const reports = ok(inspectRosterCategoryConstraintsInRoster(s.roster, s.catalogue.context)).forces;
      expect(reports[1]?.constraints[0]).toMatchObject({ observed: 0, status: "violated" });
    }
  });
  it("preserves uncertainty for ambiguous category identity or absent force context", async () => {
    const s = await create();
    const context = s.catalogue.context;
    const duplicate = { ...context, categories: { ...context.categories, definitions: [...context.categories.definitions, context.categories.definitions[0]!] } };
    expect(ok(inspectRosterCategoryConstraintsInRoster(s.roster, duplicate)).completeness).toBe("incomplete");
    const unlinked = { ...context, forces: { ...context.forces, definitions: context.forces.definitions.map(f => ({ ...f, categoryLinks: [] })) } };
    expect(ok(inspectRosterCategoryConstraintsInRoster(s.roster, unlinked)).forces[0]?.constraints[0]).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  });
  it("preserves unresolved membership and parent limit modifiers", async () => {
    const s = add(await create(), "alpha", "a");
    const context = s.catalogue.context;
    // Unknown source keys exercise membership through a restored durable shape.
    const roster = { ...s.roster, forces: s.roster.forces.map(f => ({ ...f, selections: f.selections.map(x => ({ ...x, definition: { ...x.definition, key: "unknown" as typeof x.definition.key } })) })) };
    expect(ok(inspectRosterCategoryConstraintsInRoster(roster, context)).completeness).toBe("incomplete");
    const modified = await create('shared="true"', ["min", "max"], '<modifiers><modifier field="min" type="set" value="0"/></modifiers>');
    expect(bounds(modified)[0]).toMatchObject({ status: "unresolved", completeness: "incomplete", limit: 1 });
    expect(bounds(modified)[1]).toMatchObject({ status: "satisfied", completeness: "complete" });
  });
  it("keeps force-link ownership distinct and reports no duplicated definition bound", async () => {
    const s = await create('shared="true"', ["min", "max"], "", true);
    expect(bounds(s)).toHaveLength(2);
    expect(bounds(s)[0]).toMatchObject({ status: "violated", observed: 0 });
    expect(bounds(s).every(c => c.categoryLink && !c.categoryDefinition)).toBe(true);
    expect(bounds(add(s, "alpha", "a")).every(c => c.status === "satisfied")).toBe(true);
  });
});
