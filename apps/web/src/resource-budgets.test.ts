// Fictional resource budgets through production session, query, and history APIs.
import { describe, expect, it } from "vitest";
import { objectId, type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { evaluateRosterCondition, inspectRosterResourceBudgets, resolveRosterResourceLimits } from "@rosterforge/evaluation";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation, localRosterRootChoices, setLocalRosterResourceBudget, restoreLocalRosterSession, type LocalRosterSession } from "./roster-session.js";
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }
const queryXml = (extra = "") => `<condition id="q" field="limit::ore" scope="roster" childId="any" shared="true" type="greaterThan" value="50" ${extra}/>`;
async function fixture({ declaration = 'defaultCostLimit="100"', types = "", modifier = "", extraCost = "", force = "", typeBody = "" } = {}) {
 const xml = `<catalogue id="fiction" name="Budget fiction" revision="1" gameSystemId="sys" gameSystemRevision="1" battleScribeVersion="2.03"><costTypes><costType id="ore" name="Ore" ${declaration}>${typeBody}</costType><costType id="fuel" name="Fuel" defaultCostLimit="10"/>${types}</costTypes><forceEntries><forceEntry id="army" name="Army">${force}</forceEntry></forceEntries><selectionEntries><selectionEntry id="unit" name="Unit" type="unit"><costs><cost typeId="ore" value="20"/><cost typeId="fuel" value="3"/>${extraCost}</costs>${modifier}</selectionEntry><selectionEntry id="maps" name="Maps" type="upgrade"><modifiers><modifier field="hidden" type="set" value="true"><conditions>${queryXml()}</conditions></modifier></modifiers></selectionEntry></selectionEntries></catalogue>`;
 const library = ok(await prepareLocalCatalogueLibrary([{ filename: "fiction.cat", bytes: new TextEncoder().encode(xml) }, { filename: "sys.gst", bytes: new TextEncoder().encode('<gameSystem id="sys" name="System" revision="1" battleScribeVersion="2.03"/>') }], { import: { batchId: "budgets", importedAt: "2026-09-14T00:00:00Z" } }));
 const catalogue = library.catalogues[0]!;
 return ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("r"), forceId: forceOccurrenceId("f"), name: "Budget fiction" }));
}
function add(s: LocalRosterSession, amount = 1) { return ok(addLocalRosterRootSelection(s, localRosterRootChoices(s.catalogue).find(c => c.materialized.name === "Unit")!, { selectionId: selectionOccurrenceId("u"), amount })); }
function budgets(s: LocalRosterSession) { return inspectRosterResourceBudgets(s.roster, s.catalogue.context); }
function ore(s: LocalRosterSession) { return budgets(s).resources.find(b => b.resource.typeId === "ore")!; }
function set(s: LocalRosterSession, value: number | undefined, id = "ore") { return ok(setLocalRosterResourceBudget(s, objectId(id), value)); }
function query(s: LocalRosterSession, edits = {}) {
 const c = localRosterRootChoices(s.catalogue).find(c => c.materialized.name === "Maps")!.materialized.modifiers[0]!.conditions[0]!;
 return ok(evaluateRosterCondition(s.roster, s.catalogue.context, s.roster.forces[0]!, { ...c, ...edits }));
}
describe("effective resource budgets", () => {
 it("uses independent currencies and below/at/above limits with evaluated costs", async () => {
  const base = await fixture();
  for (const [amount, status] of [[4,"satisfied"],[5,"satisfied"],[6,"violated"]] as const) expect(ore(add(base, amount))).toMatchObject({ status, exact: true, value: amount * 20 });
  expect(budgets(add(base,4)).resources.find(b => b.resource.typeId === "fuel")).toMatchObject({ status: "violated", value: 12 });
  expect(ore(add(await fixture({ modifier: '<modifiers><modifier field="ore" type="set" value="120"/></modifiers>' })))).toMatchObject({ value:120, status:"violated", exact:true });
 });
 it("shares defaults, explicit zero, no limit, and reset with limit queries", async () => {
  const base = add(await fixture());
  expect(query(base)).toMatchObject({observed:100,status:"satisfied",completeness:"complete"});
  const changed = set(base, 20);
  expect(query(changed)).toMatchObject({observed:20,status:"unsatisfied"});
  expect(ore(changed).status).toBe("satisfied");
  expect(ore(set(base,0))).toMatchObject({status:"violated",resource:{effective:{kind:"finite",value:0}}});
  expect(ore(set(base,-1))).toMatchObject({status:"satisfied",active:false,resource:{effective:{kind:"unbounded"}}});
  expect(query(set(base,-1)).observed).toBe(-1);
  const reset = set(changed,undefined);
  expect(reset.roster.resourceBudgetOverrides).toBeUndefined();
  expect(query(reset).observed).toBe(100);
  expect(base.roster.forces).toBe(changed.roster.forces);
  expect(base.catalogue).toBe(changed.catalogue);
  expect(query(base).observed).toBe(100);
  expect(ore(set(changed,1,"fuel")).resource.effective).toEqual({kind:"finite",value:20});
  expect(query(ok(restoreLocalRosterSession(changed.catalogue, JSON.parse(JSON.stringify(changed.roster))))).observed).toBe(20);
 });
 it.each([
  ['',"absent","absent",-1],['defaultCostLimit=""',"absent","absent",-1],['defaultCostLimit="-1"',"unbounded","unbounded",-1],
  ['defaultCostLimit="0"',"finite","finite",0],['defaultCostLimit="100" hidden="true"',"finite","inactive",-1],
  ['defaultCostLimit="bad"',"invalid","invalid",undefined],['defaultCostLimit="-2"',"invalid","invalid",undefined],
 ] as const)("preserves declared state %s",async (declaration,authored,effective,observed) => {
  const base = await fixture({declaration}); expect(ore(base).resource.authored.kind).toBe(authored);
  expect(ore(base).resource.effective.kind).toBe(effective);
  if (observed === undefined) expect(query(base).status).toBe("unresolved");
  else expect(query(base)).toMatchObject({observed,completeness:"complete"});
  expect(ore(set(base,0)).resource.effective).toEqual({kind:"finite",value:0});
  expect(ore(set(set(base,0),undefined)).resource.effective.kind).toBe(effective);
 });
 it("does not exempt hidden resources with explicit overrides",async () => {
  const s=add(await fixture({declaration:'hidden="true" defaultCostLimit="0"'}));
  expect(ore(set(s,0)).status).toBe("violated");
 });
 it("does not substitute missing or ambiguous identities or unsupported scopes",async () => {
  const s=await fixture();
  for(const edits of [{field:"limit::missing"},{field:"limit::ore::extra"},{scope:"force"},{scope:"self"},{shared:false},{includeChildSelections:true}]) expect(query(s,edits)).toMatchObject({status:"unresolved",completeness:"incomplete"});
  const duplicate=await fixture({types:'<costType id="ore" name="Other Ore" defaultCostLimit="5"/>'});
  expect(ore(duplicate).resource.effective.kind).toBe("unresolved");
  expect(setLocalRosterResourceBudget(duplicate,objectId("ore"),5).ok).toBe(false);
  expect(query(duplicate).status).toBe("unresolved");
 });
 it("diagnoses dynamic limit dependencies without recursive evaluation",async () => {
  const s=await fixture({typeBody:`<modifiers><modifier field="defaultCostLimit" type="set" value="20"><conditions>${queryXml()}</conditions></modifier></modifiers>`});
  expect(ore(set(s,100)).resource.effective.kind).toBe("unresolved");
  expect(query(s).status).toBe("unresolved");
 });
 it("updates limit-dependent modified prices through immutable edits",async () => {
  const s=add(await fixture({modifier:`<modifiers><modifier field="ore" type="set" value="60"><conditions>${queryXml()}</conditions></modifier></modifiers>`}));
  expect(ore(s)).toMatchObject({value:60,exact:true});
  expect(ore(set(s,40))).toMatchObject({value:20,exact:true});
  expect(ore(set(set(s,40),undefined)).value).toBe(60);
 });
 it("isolates orphan currencies and withholds uncertain signed arithmetic",async () => {
  const orphan=add(await fixture({extraCost:'<cost typeId="orphan" value="0"/>'}));
  expect(ore(orphan)).toMatchObject({exact:true,value:20});
  const unknown=add(await fixture({modifier:'<modifiers><modifier field="ore" type="future" value="-1000"/></modifiers>'}));
  expect(ore(set(unknown,0))).toMatchObject({exact:false,status:"unresolved"});
  expect(budgets(unknown).resources.find(b=>b.resource.typeId === "fuel")?.exact).toBe(true);
 });
 it("retains independently authored force restrictions alongside player budgets",async () => {
  const s=add(await fixture({force:'<constraints><constraint id="separate" field="ore" type="max" value="10" scope="force" shared="true" includeChildSelections="true"/></constraints>'}));
  const status=ok(inspectLocalRosterSupportedValidation(set(s,1000))).status;
  expect(status.findings.some(f=>f.kind==="forceConstraint" && f.status==="violated")).toBe(true);
  expect(status.findings.some(f=>f.kind==="resourceBudget" && f.status==="violated")).toBe(false);
 });
 it("withholds unknown source behavior envelopes even behind a player override",async () => {
  const s=await fixture({typeBody:'<modifiers><futureModifier field="defaultCostLimit" value="20"/></modifiers>'});
  expect(ore(set(s,100)).resource.effective.kind).toBe("unresolved");
 });
 it("rejects a foreign cost report even when all known budgets are inactive",async () => {
  const s=set(await fixture({declaration:'defaultCostLimit="-1"'}),-1,"fuel");
  const foreign=add(await fixture());
  const report=inspectRosterResourceBudgets(s.roster,s.catalogue.context,ok(evaluateLocalRosterCosts(foreign)));
  expect(report.completeness).toBe("incomplete");
  expect(report.diagnostics.map(d=>d.code)).toContain("EVALUATION_RESOURCE_BUDGET_COST_CONTEXT_MISMATCH");
 });
 it("never writes malformed entered values or clears a budget implicitly",async () => {
  const s=set(await fixture(),20);
  for(const value of [NaN,Infinity,-2]) expect(setLocalRosterResourceBudget(s,objectId("ore"),value).ok).toBe(false);
  expect(resolveRosterResourceLimits(s.roster,s.catalogue.context).resources[0]?.override).toBe(20);
 });
});
