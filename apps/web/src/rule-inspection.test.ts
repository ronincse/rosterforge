// Synthetic end-to-end rule projection/materialization/evaluation coverage.
import { describe, expect, it } from "vitest";
import { fixtureBytes } from "@rosterforge/test-fixtures";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { evaluateRosterRuleVisibility } from "@rosterforge/evaluation";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices } from "./roster-session.js";
import { inspectLocalRule, ruleNameQualification } from "./rule-inspection.js";
import { objectId } from "@rosterforge/foundation";

async function setup(alternate = false, numericBooleans = false) {
  const original = new TextDecoder().decode(fixtureBytes("rule-visibility.cat"));
  const xml = numericBooleans ? original.replaceAll('hidden="true"', 'hidden="1"').replaceAll('hidden="false"', 'hidden="0"') : original;
  const prepared = await prepareLocalCatalogueLibrary([
    { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
    { filename: "rule-visibility.cat", bytes: new TextEncoder().encode(alternate ? xml.replace('id="rule-visibility"', 'id="visiting-catalogue"') : xml) },
  ], { import: { batchId: "rule-test", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Fixture library failed");
  const catalogue = prepared.value.selectableCatalogues.find(c => c.id === (alternate ? "visiting-catalogue" : "rule-visibility"))!;
  const force = catalogue.context.forces.definitions[0]!;
  const created = createLocalRosterSession(catalogue, force, { rosterId: rosterId("rule-roster"), forceId: forceOccurrenceId("rule-force"), name: "Rules" });
  if (!created.ok) throw new Error("Fixture creation failed");
  const root = localRosterRootChoices(catalogue).find(c => c.materialized.id === "rv-owner")!;
  const added = addLocalRosterRootSelection(created.value, root, { selectionId: selectionOccurrenceId("rule-owner") });
  if (!added.ok) throw new Error("Fixture selection failed");
  const session = added.value;
  const owner = session.roster.forces[0]!.selections.find(s => s.id === "rule-owner")!;
  const choice = session.selectionChoices.get(owner.id)!;
  const rule = (id: string) => {
    const found = choice.rules.find(r => r.id === id) ?? choice.materializedInfoLinks.find(r => r.kind === "ruleInfoLink" && r.id === id);
    if (found === undefined || ("kind" in found && found.kind !== "ruleInfoLink")) throw new Error(`Rule ${id} absent`);
    return found;
  };
  return { session, owner, choice, rule };
}

describe("rule applicability", () => {
  it("evaluates direct name operands and qualifies unresolved conditional operands", async () => {
    const { rule } = await setup();
    const source = rule("rv-direct-conditional");
    if ("definition" in source) throw new Error("Direct fixture required");
    const modifier = { ...source.modifiers[0]!, field: "name", type: "append", value: "D3", conditions: [], conditionGroups: [], repeats: [] };
    delete modifier.scope;
    const changed = { ...source, modifiers: [modifier] };
    const report = inspectLocalRule({ definition: source, link: changed });
    expect(report.name.value).toBe(`${source.name} D3`);
    expect(ruleNameQualification(report)).toBe("");
    expect(ruleNameQualification(inspectLocalRule(source))).toBe("");
    const conditional = { ...changed, modifiers: [{ ...modifier, conditions: source.modifiers[0]!.conditions }] };
    expect(ruleNameQualification(inspectLocalRule(conditional))).toContain("Effective rule name unresolved");
  });
  it("inherits static visibility when linked inputs omit the materialized flag", async () => {
    const { rule } = await setup();
    const hidden = rule("rv-direct-hidden");
    const visible = rule("rv-direct-visible");
    if ("definition" in hidden || "definition" in visible) throw new Error("Direct fixtures required");
    const link = { modifiers: visible.modifiers, modifierGroups: visible.modifierGroups, source: visible.source, path: visible.path, node: visible.node };
    expect(evaluateRosterRuleVisibility({ definition: hidden, link })).toMatchObject({ status: "hidden", completeness: "complete" });
    expect(evaluateRosterRuleVisibility({ definition: hidden, link: { ...link, hidden: false } })).toMatchObject({ status: "visible", completeness: "complete" });
    expect(evaluateRosterRuleVisibility({ definition: visible, link: { ...link, hidden: true } })).toMatchObject({ status: "hidden", completeness: "complete" });
  });
  it("accepts static XML 1/0 Boolean attributes on direct and linked rules", async () => {
    const { session, owner, rule } = await setup(false, true);
    expect(inspectLocalRule(rule("rv-direct-hidden"), session, owner)).toMatchObject({ status: "hidden", completeness: "complete" });
    expect(inspectLocalRule(rule("rv-linked-unhide"), session, owner)).toMatchObject({ status: "visible", completeness: "complete" });
    expect(inspectLocalRule(rule("rv-linked-conditional"), session, owner)).toMatchObject({ status: "visible", completeness: "complete" });
  });
  it.each([
    ["rv-direct-visible", "visible", "complete"],
    ["rv-direct-hidden", "hidden", "complete"],
    ["rv-direct-conditional", "hidden", "complete"],
    ["rv-direct-grouped", "visible", "complete"],
    ["rv-direct-unresolved", "unresolved", "incomplete"],
    ["rv-direct-invalid", "unresolved", "incomplete"],
    ["rv-linked-conditional", "visible", "complete"],
    ["rv-linked-unhide", "visible", "complete"],
    ["rv-linked-conflict", "unresolved", "incomplete"],
  ])("evaluates %s as %s (%s)", async (id, status, completeness) => {
    const { session, owner, rule } = await setup();
    const source = rule(id!);
    const report = inspectLocalRule(source, session, owner);
    expect(report).toMatchObject({ status, completeness });
    expect(inspectLocalRule(source, session, owner)).toBe(report);
  });
  it("uses the actual primary catalogue for both direct and linked rules", async () => {
    const { session, owner, rule } = await setup(true);
    expect(inspectLocalRule(rule("rv-direct-conditional"), session, owner).status).toBe("visible");
    expect(inspectLocalRule(rule("rv-linked-conditional"), session, owner).status).toBe("hidden");
    expect(inspectLocalRule(rule("rv-linked-unhide"), session, owner).status).toBe("hidden");
  });
  it("reports source-preview uncertainty without fabricating an occurrence", async () => {
    const { rule } = await setup();
    expect(inspectLocalRule(rule("rv-linked-conditional"))).toMatchObject({ status: "unresolved", completeness: "incomplete" });
    expect(inspectLocalRule(rule("rv-direct-hidden"))).toMatchObject({ status: "hidden", completeness: "complete" });
  });
  it("retains earlier uncertainty even after a supported final set", async () => {
    const { session, owner, rule } = await setup();
    const source = rule("rv-direct-unresolved");
    if ("definition" in source) throw new Error("Direct fixture required");
    const modifier = source.modifiers[0]!;
    const recovered = { ...source, modifiers: [...source.modifiers, { ...modifier, conditions: [], conditionGroups: [], value: "false", node: { ...modifier.node, attributes: { type: "set", field: "hidden", value: "false" } } }] };
    expect(evaluateRosterRuleVisibility(recovered, { roster: session.roster, context: session.catalogue.context, owner })).toMatchObject({ status: "visible", completeness: "incomplete" });
  });
  it("keeps unresolved conditions unresolved for a missing occurrence", async () => {
    const { session, owner, rule } = await setup();
    const absent = { ...owner, id: selectionOccurrenceId("not-in-roster") };
    expect(inspectLocalRule(rule("rv-direct-conditional"), session, absent).completeness).toBe("incomplete");
  });
  it("supplies effective categories to rule conditions", async () => {
    const { session, owner, rule } = await setup();
    const source = rule("rv-direct-conditional");
    if ("definition" in source) throw new Error("Direct fixture required");
    const modifier = source.modifiers[0]!;
    const condition = modifier.conditions[0]!;
    const scoped = { ...source, modifiers: [{ ...modifier, conditions: [{ ...condition, scope: "self", childId: objectId("rv-keyword") }] }] };
    expect(inspectLocalRule(scoped, session, owner)).toMatchObject({ status: "hidden", completeness: "complete" });
  });
  it.each(["unknown-scope", "malformed-value", "unknown-attribute"])("contains %s without hiding uncertainty", async kind => {
    const { session, owner, rule } = await setup();
    const source = rule("rv-direct-conditional");
    if ("definition" in source) throw new Error("Direct fixture required");
    const modifier = source.modifiers[0]!;
    const changed = kind === "unknown-scope" ? { ...modifier, scope: "unknown" } : kind === "malformed-value" ? { ...modifier, value: "perhaps" } : { ...modifier, node: { ...modifier.node, attributes: { ...modifier.node.attributes, futureBehavior: "yes" } } };
    expect(inspectLocalRule({ ...source, modifiers: [changed] }, session, owner)).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  });
});
