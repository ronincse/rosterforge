// Opt-in immutable audit snapshots; ordinary tests never download or embed game data.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { inspectRosterAssociationChoices } from "@rosterforge/evaluation";
import { createUnitReferenceModel } from "./unit-reference-model.js";
import { inspectLocalRosterConstraints, setLocalRosterAssociation } from "./roster-session.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, chooseLocalRosterChildGroupEntry, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterChildChoices, localRosterRootChoices, setLocalRosterSelectionAmount, duplicateLocalRosterSelection, removeLocalRosterSelection } from "./roster-session.js";

const evidence = process.env.ROSTERFORGE_CORRECTNESS_SNAPSHOTS;
const revisions = { frozen: "04c62fcd041b3808c39d5c46fd677c704027b979", "current-upstream": "5b261ec423d5d017bb733c4f3c0a760b085d5ca5" };
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }

async function snapshotCatalogue(dataset: string, revision: string) {
  if (evidence === undefined) throw new Error("Snapshots not configured");
  const manifest = JSON.parse(readFileSync(join(evidence, `${dataset}-manifest.json`), "utf8")) as { commit: string; documents: { path: string; bytes: number; sha256: string; gitBlob: string; id: string; gameSystemId?: string; catalogueLinks: { targetId: string }[] }[] };
  expect(manifest.commit).toBe(revision);
  expect(manifest.documents).toHaveLength(8);
  const ids = new Set(manifest.documents.map(d => d.id));
  const files = manifest.documents.map(d => {
    const bytes = readFileSync(join(evidence, dataset, d.path));
    expect(bytes.byteLength).toBe(d.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(d.sha256);
    expect(createHash("sha1").update(`blob ${bytes.byteLength}\0`).update(bytes).digest("hex")).toBe(d.gitBlob);
    if (d.gameSystemId !== undefined) expect(ids.has(d.gameSystemId)).toBe(true);
    for (const link of d.catalogueLinks) expect(ids.has(link.targetId)).toBe(true);
    return { filename: d.path, bytes: new Uint8Array(bytes) };
  });
  const library = ok(await prepareLocalCatalogueLibrary(files, { import: { batchId: `count-${dataset}`, importedAt: "2026-09-10T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues.find(c => c.id === "470a-6daa-9014-12df")!;
  return catalogue;
}

for (const [dataset, revision] of Object.entries(revisions)) it.skipIf(evidence === undefined)(`counts Intercessor carriers and prices repeated Knights/Impulsors on ${dataset} ${revision}`, async () => {
  const catalogue = await snapshotCatalogue(dataset, revision);
  let n = 0; const next = () => selectionOccurrenceId(`count-${++n}`);
  let session = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions.find(f => f.source.id === "bb9d-299a-ed60-2d8a")!, { rosterId: rosterId("count"), forceId: forceOccurrenceId("force"), name: "Group count", createSelectionId: next }));
  const unitId = next();
  const root = localRosterRootChoices(catalogue).find(c => c.materialized.definitionId === "8da0-4570-c3c-819f")!;
  session = ok(addLocalRosterRootSelection(session, root, { selectionId: unitId, createSelectionId: next }));
  const choices = ok(inspectLocalRosterChildChoices(session, unitId)).groups.flatMap(g => g.choices);
  const ordinaryId = next();
  session = ok(addLocalRosterChildSelection(session, unitId, choices.find(c => c.id === "420-464f-93cb-e019")!, { selectionId: ordinaryId, amount: 3, createSelectionId: next }));
  session = ok(addLocalRosterChildSelection(session, unitId, choices.find(c => c.id === "d735-eafd-a8de-fa80")!, { selectionId: next(), createSelectionId: next }));
  const sergeant = session.roster.forces[0]!.selections.find(s => s.id === unitId)!.selections.find(s => s.definition.sourceId === "8ea3-b125-7273-5ffb")!;
  const sergeantChoices = ok(inspectLocalRosterChildChoices(session, sergeant.id));
  const weapons = sergeantChoices.groups.find(g => g.choices.some(c => c.name === "Power fist"))!;
  session = ok(chooseLocalRosterChildGroupEntry(session, sergeant.id, weapons.group, weapons.choices.find(c => c.name === "Power fist")!, { selectionId: next(), createSelectionId: next }));
  for (const [amount, observed, value] of [[3, 5, 80], [4, 6, 150], [8, 10, 150], [3, 5, 80]]) {
    session = ok(setLocalRosterSelectionAmount(session, ordinaryId, amount!, { createSelectionId: next }));
    const report = ok(evaluateLocalRosterCosts(session));
    const cost = report.selections.find(s => s.occurrence.id === unitId)!.costs.find(c => c.typeId === "51b2-306e-1021-d207")!;
    expect(cost.status).toBe("included");
    if (cost.status !== "included") throw new Error("Missing authored points");
    expect(cost).toMatchObject({ baseValue: 80, value, totalValue: value });
    const applicability = cost.modifierApplicability.find(a => a.modifier.value === "150")!;
    expect(applicability.conditions[0]).toMatchObject({ observed, completeness: "complete", status: observed! >= 6 ? "satisfied" : "unsatisfied" });
    expect(applicability.status).toBe(observed! >= 6 ? "applicable" : "notApplicable");
    expect(cost.modifierSequence.completeness).toBe("complete");
  }
  // Repeated-unit probes use production commands without weakening game limits.
  // These engine-only counts do not claim a legal UI roster at transport maxima.
  function add(definition: string) {
    const id = next();
    session = ok(addLocalRosterRootSelection(session, localRosterRootChoices(catalogue).find(c => c.materialized.definitionId === definition)!, { selectionId: id, createSelectionId: next }));
    return id;
  }
  function prices(definition: string) {
    return ok(evaluateLocalRosterCosts(session)).selections.filter(s => s.choices.some(c => c.definitionId === definition)).map(s => {
      const cost = s.costs.find(c => c.typeId === "51b2-306e-1021-d207")!;
      if (cost.status !== "included") throw new Error("Repeated cost missing");
      expect(cost.modifierSequence.completeness).toBe("complete");
      return cost.value;
    });
  }
  const knights = "a6cc-9a65-dbf1-71b0";
  const firstKnight = add(knights);
  expect(prices(knights)).toEqual([240]);
  add("8da0-4570-c3c-819f"); // Unrelated intervening unit is not a matching copy.
  add(knights);
  session = ok(duplicateLocalRosterSelection(session, firstKnight, next));
  expect(prices(knights)).toEqual([240, 240, 260]);
  session = ok(removeLocalRosterSelection(session, firstKnight));
  expect(prices(knights)).toEqual([240, 240]);
  const impulsor = "bfb1-7512-e1a3-9fa2";
  const preceding = dataset === "frozen" ? 4 : 3;
  for (let n = 0; n <= preceding; n++) add(impulsor);
  expect(prices(impulsor)).toEqual([...Array<number>(preceding).fill(70), 80]);
}, 30000);

for (const [dataset, revision] of Object.entries(revisions)) it.skipIf(evidence === undefined)(`keeps Supporting gates and connected effects live on ${dataset} ${revision}`, async () => {
  const catalogue = await snapshotCatalogue(dataset, revision);
  let n = 0; const next = () => selectionOccurrenceId(`support-${++n}`);
  let session = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions.find(f => f.source.id === "bb9d-299a-ed60-2d8a")!, {rosterId:rosterId("support"),forceId:forceOccurrenceId("force"),name:"Supporting",createSelectionId:next}));
  const roots = localRosterRootChoices(catalogue);
  const add = (name: string) => {
    const root = roots.find(c => c.materialized.name === name)!;
    expect(root).toBeDefined();
    const id = next();
    session = ok(addLocalRosterRootSelection(session, root, {selectionId:id,createSelectionId:next}));
    return id;
  };
  const lieutenant = add("Lieutenant"), body = add("Intercessor Squad"), captain = add("Captain"), unrelated = add("Captain");
  const selection = (id: typeof lieutenant) => session.roster.forces[0]!.selections.find(s => s.id === id)!;
  const association = (id: typeof lieutenant) => inspectRosterAssociationChoices(session.roster, catalogue.context, selection(id))[0]!;
  const supporting = association(lieutenant);
  expect(supporting).toMatchObject({supported:true,declaration:{min:1,max:1}});
  const required = () => ok(inspectLocalRosterConstraints(session)).selections.selections.find(s => s.owner.id === lieutenant)!.constraints.find(c => c.constraint.associationName && c.constraintType === "min")!;
  expect(required()).toMatchObject({status:"violated",observed:0,limit:1,completeness:"complete"});
  const keywords = (id: typeof lieutenant) => createUnitReferenceModel(session, selection(id)).profiles.filter(p => /Weapons$/.test(p.profile.value.typeName ?? "")).flatMap(p => p.report!.report.characteristics.filter(c => c.characteristic.name === "Keywords").map(c => c.value));
  const expectBuff = (id: typeof lieutenant, active: boolean) => {
    const values = keywords(id); expect(values.length).toBeGreaterThan(0);
    for (const value of values) expect((value?.match(/Lethal Hits/g) ?? []).length).toBe(active ? 1 : 0);
  };
  expectBuff(lieutenant,false); expectBuff(body,false);
  session = ok(setLocalRosterAssociation(session, lieutenant, supporting.key, body));
  expect(required()).toMatchObject({status:"satisfied",observed:1,limit:1});
  expectBuff(lieutenant,true); expectBuff(body,true); expectBuff(captain,false);
  session = ok(setLocalRosterAssociation(session,captain,association(captain).key,body));
  expectBuff(captain,true); expectBuff(unrelated,false); expectBuff(captain,true);
  const beforeDuplicate = new Set(session.roster.forces[0]!.selections.map(s=>s.id));
  session = ok(duplicateLocalRosterSelection(session,lieutenant,next));
  const duplicate = session.roster.forces[0]!.selections.find(s=>!beforeDuplicate.has(s.id))!.id;
  expect(session.roster.associations).toHaveLength(2);
  expect(ok(inspectLocalRosterConstraints(session)).selections.selections.find(s=>s.owner.id===duplicate)!.constraints.find(c=>c.constraint.associationName && c.constraintType==="min")).toMatchObject({status:"violated",observed:0});
  session = ok(removeLocalRosterSelection(session,duplicate));
  session = ok(setLocalRosterAssociation(session,lieutenant,supporting.key,undefined));
  expect(required()).toMatchObject({status:"violated",observed:0});
  expectBuff(lieutenant,false); expectBuff(body,false); expectBuff(captain,false);
  session = ok(setLocalRosterAssociation(session,lieutenant,supporting.key,body));
  session = ok(removeLocalRosterSelection(session,body));
  expect(session.roster.associations ?? []).toHaveLength(0);
  expect(required()).toMatchObject({status:"violated",observed:0});
  expectBuff(lieutenant,false); expectBuff(captain,false);
}, 30000);
