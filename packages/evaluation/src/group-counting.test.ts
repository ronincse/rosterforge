// Numeric transparent-group membership must not become general selection identity.
import { expect, it } from "vitest";
import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { composeBattleScribeCatalogueContexts, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { objectId, sourceId, type Result } from "@rosterforge/foundation";
import { addRosterForce, addRosterSelectionToForce, addRosterSelectionToSelection, createRoster, forceOccurrenceId, rosterDefinitionKeyForSource, rosterId, selectionOccurrenceId, setRosterSelectionAmount, type Roster } from "@rosterforge/roster-model";
import { evaluateRosterCondition, type RosterSelectionConditionSource } from "./conditions.js";
import { evaluateRosterCostsWithSelectionConditions } from "./costs.js";
import { indexEvaluationChoices } from "./selection-context.js";
import { evaluateRosterRepeat } from "./repeats.js";

const xml = `<catalogue id="groups" gameSystemId="system" name="Groups" revision="1" battleScribeVersion="2.03">
<costTypes><costType id="points" name="Points"/></costTypes><forceEntries><forceEntry id="army" name="Army"/></forceEntries>
<sharedSelectionEntries><selectionEntry id="shared-model" type="model"/></sharedSelectionEntries>
<sharedSelectionEntryGroups><selectionEntryGroup id="shared-group"><entryLinks><entryLink id="linked-model" type="selectionEntry" targetId="shared-model"/></entryLinks></selectionEntryGroup></sharedSelectionEntryGroups>
<selectionEntries><selectionEntry id="squad" type="unit"><costs><cost typeId="points" name="Points" value="80"/></costs>
<modifiers><modifier type="set" field="points" value="150"><conditions><condition type="atLeast" field="selections" scope="self" childId="models" shared="true" includeChildSelections="true" value="6"/></conditions></modifier></modifiers>
<selectionEntryGroups><selectionEntryGroup id="models"><selectionEntries>
<selectionEntry id="sergeant" type="model"><selectionEntries><selectionEntry id="weapon" type="upgrade"/></selectionEntries></selectionEntry>
<selectionEntry id="ordinary" type="model"/><selectionEntry id="launcher" type="model"/>
</selectionEntries><selectionEntryGroups><selectionEntryGroup id="nested"><entryLinks><entryLink id="nested-model" type="selectionEntry" targetId="shared-model"/></entryLinks></selectionEntryGroup></selectionEntryGroups>
</selectionEntryGroup><selectionEntryGroup id="sibling"><selectionEntries><selectionEntry id="unrelated" type="model"/></selectionEntries></selectionEntryGroup></selectionEntryGroups>
<entryLinks><entryLink id="group-link" type="selectionEntryGroup" targetId="shared-group"/></entryLinks>
</selectionEntry></selectionEntries></catalogue>`;

function ok<T>(result: Result<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.diagnostics)); return result.value; }
function fixture(source = xml) {
  const parsed = ok(parseBattleScribeXml(new TextEncoder().encode(source), { source: { sourceId: sourceId("group-test"), filename: "groups.cat", kind: "synthetic", importedAt: "2026-09-10T00:00:00Z" } }));
  const catalogue = ok(parseBattleScribeXml(new TextEncoder().encode('<gameSystem id="system" name="System" revision="1" battleScribeVersion="2.03"/>'), { source: { sourceId: sourceId("group-system"), filename: "groups.gst", kind: "synthetic", importedAt: "2026-09-10T00:00:00Z" } }));
  const context = ok(composeBattleScribeCatalogueContexts(ok(resolveBattleScribeDataGraph([parsed, catalogue])))).catalogues[0]!;
  const choices = [...indexEvaluationChoices(context).byKey.values()].flat();
  function ref(id: string) {
    const choice = choices.find(c => c.id === id)!;
    return { kind: choice.kind, key: rosterDefinitionKeyForSource(choice.occurrence.source.sourceId, choice.occurrence.path), sourceId: objectId(id) };
  }
  const force = context.forces.definitions[0]!.source;
  let roster = ok(addRosterForce(createRoster({ id: rosterId("roster"), name: "Groups", catalogue: { kind: "catalogue", key: rosterDefinitionKeyForSource(context.document.projection.source.sourceId, context.document.projection.path) } }), { id: forceOccurrenceId("army"), definition: { kind: "forceEntry", key: rosterDefinitionKeyForSource(force.source.sourceId, force.path) } }));
  roster = ok(addRosterSelectionToForce(roster, forceOccurrenceId("army"), { id: selectionOccurrenceId("unit"), definition: ref("squad") }));
  const child = (r: Roster, id: string, parent = "unit", amount = 1, selected = id) => ok(addRosterSelectionToSelection(r, selectionOccurrenceId(parent), { id: selectionOccurrenceId(id), definition: ref(selected), amount }));
  const conditionSource = choices.find(c => c.id === "squad")!.modifiers[0]!.conditions[0]!;
  const query = (r: Roster, overrides: Partial<RosterSelectionConditionSource> = {}) => ok(evaluateRosterCondition(r, context, r.forces[0]!.selections[0]!, { ...conditionSource, ...overrides }));
  return { context, roster, child, query, source: conditionSource, ref };
}

it("counts mixed carriers at five/six/ten and applies the authored 80/150/80 adjustment", () => {
  const f = fixture();
  let roster = f.child(f.child(f.child(f.roster, "sergeant"), "ordinary", "unit", 3), "launcher");
  roster = f.child(f.child(roster, "weapon", "sergeant", 20), "unrelated", "unit", 30);
  const inspect = (amount: number, count: number, cost: number) => {
    roster = ok(setRosterSelectionAmount(roster, selectionOccurrenceId("ordinary"), amount));
    expect(f.query(roster)).toMatchObject({ observed: count, completeness: "complete", status: count >= 6 ? "satisfied" : "unsatisfied" });
    const report = ok(evaluateRosterCostsWithSelectionConditions(roster, f.context));
    expect(report.totals[0]!.value).toBe(cost);
    expect(report.completeness).toBe("complete");
  };
  inspect(3, 5, 80); inspect(4, 6, 150); inspect(8, 10, 150); inspect(3, 5, 80);
  expect(f.query(roster, { type: "instanceOf", childId: objectId("models") })).toMatchObject({ status: "unsatisfied", completeness: "complete" });
});

it("counts equivalent separate occurrences, nested groups, and shared group links", () => {
  const f = fixture();
  let roster = f.roster;
  for (let n = 0; n < 6; n++) roster = f.child(roster, `copy-${n}`, "unit", 1, "ordinary");
  roster = f.child(f.child(roster, "nested-model"), "linked-model", "unit", 2);
  expect(f.query(roster)).toMatchObject({ observed: 7, completeness: "complete" });
  for (const target of ["group-link", "shared-group"]) expect(f.query(roster, { childId: objectId(target) })).toMatchObject({ observed: 2, completeness: "complete" });
  expect(f.query(roster, { childId: objectId("shared-group"), shared: false })).toMatchObject({ observed: 0, completeness: "complete" });
  const repeated = ok(evaluateRosterRepeat(roster, f.context, roster.forces[0]!.selections[0]!, { ...f.source, node: { attributes: {} }, field: "selections", scope: "self", childId: objectId("models"), value: 1, repeats: 1, roundUp: false }));
  expect(repeated).toMatchObject({ observed: 7, repetitions: 7, completeness: "complete" });
});

it("does not count persisted group wrappers twice or turn missing placement into zero", () => {
  const f = fixture();
  const wrapped = f.child(f.child(f.roster, "models"), "ordinary", "models", 5);
  expect(f.query(wrapped)).toMatchObject({ observed: 5, completeness: "complete" });
  const misplaced = f.child(f.child(f.roster, "sergeant"), "ordinary", "sergeant", 5);
  expect(f.query(misplaced).completeness).toBe("incomplete");
  expect(f.query(misplaced).observed).toBeUndefined();
  const misplacedWrapper = f.child(f.child(f.child(f.roster, "sergeant"), "models", "sergeant"), "ordinary", "models", 5);
  expect(f.query(misplacedWrapper).completeness).toBe("incomplete");
  const nestedWrapper = f.child(f.child(f.roster, "nested"), "nested-model", "nested", 5);
  expect(f.query(nestedWrapper)).toMatchObject({ observed: 5, completeness: "complete" });
  const empty = f.query(f.roster);
  expect(empty).toMatchObject({ observed: 0, completeness: "complete", status: "unsatisfied" });
});

it("keeps ambiguous linked placement unresolved while allowing a shared membership consensus", () => {
  const f = fixture(xml.replace('<entryLink id="group-link"', '<entryLink id="other-group-link" type="selectionEntryGroup" targetId="shared-group"/><entryLink id="group-link"'));
  const roster = f.child(f.roster, "linked-model");
  expect(f.query(roster, { childId: objectId("group-link") }).completeness).toBe("incomplete");
  expect(f.query(roster, { childId: objectId("shared-group") })).toMatchObject({ observed: 1, completeness: "complete" });
});

it("keeps a dangling authored group link unresolved even with no selected members", () => {
  const f = fixture(xml.replace('targetId="shared-group"', 'targetId="absent-group"'));
  const result = f.query(f.roster, { childId: objectId("group-link") });
  expect(result).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  expect(result.observed).toBeUndefined();
});

it("respects force and child scope without broadening instanceOf or inventing a group scope", () => {
  const f = fixture();
  let roster = f.child(f.roster, "ordinary", "unit", 5);
  roster = ok(addRosterForce(roster, { ...roster.forces[0]!, id: forceOccurrenceId("other-force") }));
  roster = ok(addRosterSelectionToForce(roster, forceOccurrenceId("other-force"), { id: selectionOccurrenceId("other-unit"), definition: f.ref("squad") }));
  roster = f.child(roster, "other-models", "other-unit", 20, "ordinary");
  expect(f.query(roster, { scope: "force" })).toMatchObject({ observed: 5, completeness: "complete" });
  expect(f.query(roster, { scope: "self", includeChildSelections: false })).toMatchObject({ observed: 0, completeness: "complete" });
  expect(f.query(roster, { scope: objectId("models") }).completeness).toBe("incomplete");
  const ordinary = roster.forces[0]!.selections[0]!.selections[0]!;
  expect(ok(evaluateRosterCondition(roster, f.context, ordinary, { ...f.source, type: "instanceOf", scope: "self" }))).toMatchObject({ status: "unsatisfied", completeness: "complete" });
});
