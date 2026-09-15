import type { OrderedXmlElement } from "@rosterforge/battlescribe-data";
import { evaluateRosterCondition, inspectRosterResourceBudgets } from "@rosterforge/evaluation";
// Optional pinned validation regression plus explicit remaining pilot reproductions.
// Download the four immutable files listed in docs/qa/starcraft-pilot-baseline.md
// into ROSTERFORGE_STARCRAFT_PILOT_DIR. Source bytes are never rewritten.
import { createLocalRosterDraft, decodeLocalRosterDraft } from "@rosterforge/persistence";
import { createBoundedHistory, commitBoundedHistory, undoBoundedHistory, redoBoundedHistory } from "./history.js";
import { duplicateLocalRosterSelection, restoreLocalRosterSession } from "./roster-session.js";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { objectId, type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterChildChoices, inspectLocalRosterSupportedValidation, localRosterRootChoices, removeLocalRosterSelection, setLocalRosterResourceBudget, type LocalRosterSession } from "./roster-session.js";

const directory = process.env.ROSTERFORGE_STARCRAFT_PILOT_DIR;
const files = [
  ["Starcraft The Miniature Game.gst", "ae9e9e9dbbff610794215a475f7af5a352ee61665dec59152167fb54be11e4c4"],
  ["Terrans.cat", "01959a98e416429b079ea5fd173c9e197a21595d15b47681acf9bc36d7d854c0"],
  ["Protoss.cat", "97f0ab73c9a366110274826f6af2d9b76e58cc3a415cc5200251b89e79974398"],
  ["Zergs.cat", "f9c64766547db386ec2b2b0f3ee7e465fef7dbf47f2b21ae8984e7e1edc394bd"],
] as const;
function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}

it.skipIf(!directory)("checks frozen StarCraft authored requirements and preserves unrelated pilot gaps", async () => {
  if (!directory) throw new Error("Pilot data not configured");
  const library = ok(await prepareLocalCatalogueLibrary(files.map(([filename, hash]) => {
    const bytes = new Uint8Array(readFileSync(join(directory, filename)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
    return { filename, bytes };
  }), { import: { batchId: "starcraft-pilot", importedAt: "2026-09-12T02:00:00Z" } }));
  expect(library.selectableCatalogues).toHaveLength(3);
  let n = 0;
  const next = () => selectionOccurrenceId(`pilot-${++n}`);
  const create = (name: string) => {
    const catalogue = library.selectableCatalogues.find(c => c.name === name)!;
    return ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId(name), forceId: forceOccurrenceId(name), name, createSelectionId: next }));
  };
  const addRoot = (session: LocalRosterSession, name: string) => {
    const id = next();
    const result = addLocalRosterRootSelection(session, localRosterRootChoices(session.catalogue).find(c => c.materialized.name === name)!, { selectionId: id, createSelectionId: next });
    return { id, session: ok(result), diagnostics: result.diagnostics.map(d=>d.code) };
  };
  const ledger = (session: LocalRosterSession) => {
    const result = evaluateLocalRosterCosts(session);
    const costs = ok(result);
    return { totals: costs.totals.map(t => ({ id: t.typeId, value: t.value })), completeness: costs.completeness, diagnostics: result.diagnostics.map(d => ({ code: d.code, details: d.details })) };
  };
  let terran = addRoot(create("Terran"), "Terran Armed Forces").session;
  const marine = addRoot(terran, "Marines"); terran = marine.session;
  const base = ledger(terran);
  const children = ok(inspectLocalRosterChildChoices(terran, marine.id));
  const shield = children.groups.flatMap(g => g.choices).find(c => c.name === "Combat Shield")!;
  terran = ok(addLocalRosterChildSelection(terran, marine.id, shield, { selectionId: next(), createSelectionId: next }));
  const shieldOnly = ledger(terran);
  const reinforceId = next();
  const reinforcementResult = addLocalRosterChildSelection(terran, marine.id, children.direct.find(c => c.choice.name === "Reinforce")!.choice, { selectionId: reinforceId, createSelectionId: next });
  terran = ok(reinforcementResult);
  expect(reinforcementResult.diagnostics.some(d=>d.code.includes("RECONCILIATION_STALLED") || d.code.includes("RECONCILIATION_LIMIT"))).toBe(false);
  const reinforcedSession = terran;
  const reinforced = ledger(terran);
  const models = terran.roster.forces[0]!.selections.find(s => s.id === marine.id)!.selections.filter(s => s.name === "Marine");
  // SC-04 acceptance retains the original reproduction with corrected expectations.
  expect(models).toHaveLength(1);
  expect(models[0]!.amount).toBe(9);
  expect(reinforced.totals.find(t => t.id === "5bcf-897a-a5c9-d0e8")?.value).toBe(240);
  terran = ok(removeLocalRosterSelection(terran, reinforceId));
  const removed = ledger(terran);
  expect(removed.totals.find(t => t.id === "5bcf-897a-a5c9-d0e8")?.value).toBe(180);

  // Observe durable amounted models, modified bounds, and each independent cost
  // contribution. Matching an aggregate alone could hide offsetting mistakes.
  const mineralIdSC = objectId("5bcf-897a-a5c9-d0e8");
  const coreIdSC = objectId("472f-46af-8e02-bfbf");
  const unit = (s: LocalRosterSession, id = marine.id) => s.roster.forces[0]!.selections.find(x=>x.id===id)!;
  const model = (s: LocalRosterSession, id = marine.id) => unit(s,id).selections.filter(x=>x.definition.sourceId === "535b-1f2b-6421-d932");
  const mineral = (s: LocalRosterSession) => ok(evaluateLocalRosterCosts(s)).totals.find(t=>t.typeId===mineralIdSC)!.value;
  const contributions = (s: LocalRosterSession) => ok(evaluateLocalRosterCosts(s)).selections.flatMap(x=>x.costs).filter(c=>c.status==="included" && c.typeId===mineralIdSC).map(c=>({name:c.occurrence.name,base:c.status==="included"?c.baseValue:undefined,value:c.value}));
  expect(base.totals.find(t=>t.id===mineralIdSC)?.value).toBe(160);
  expect(shieldOnly.totals.find(t=>t.id===mineralIdSC)?.value).toBe(180);
  expect(contributions(reinforcedSession)).toEqual(expect.arrayContaining([{name:"Marines",base:160,value:160},{name:"Reinforce",base:50,value:50},{name:"Combat Shield",base:20,value:30}]));
  expect(contributions(terran)).toContainEqual({name:"Combat Shield",base:20,value:20});
  expect(reinforced.totals.find(t=>t.id===coreIdSC)?.value).toBe(1);
  expect(removed.totals.find(t=>t.id===coreIdSC)?.value).toBe(2);
  expect(model(terran)).toHaveLength(1);expect(model(terran)[0]!.amount).toBe(6);
  const actualCondition=children.direct.find(c=>c.choice.name==="Marine")!.choice.modifiers[0]!.conditions[0]!;
  const conditionLedger=[marine.session,reinforcedSession,terran].map(s=>{const r=ok(evaluateRosterCondition(s.roster,s.catalogue.context,model(s)[0]!,actualCondition));return {observed:r.observed,status:r.status,completeness:r.completeness};});
  expect(conditionLedger).toEqual([{observed:0,status:"unsatisfied",completeness:"complete"},{observed:1,status:"satisfied",completeness:"complete"},{observed:0,status:"unsatisfied",completeness:"complete"}]);
  const boundsSC = ok(inspectLocalRosterSupportedValidation(reinforcedSession)).constraints.selections.selections.flatMap(s=>s.constraints).filter(c=>c.owner.id===model(reinforcedSession)[0]!.id);
  expect(boundsSC.filter(c=>c.constraint.id?.startsWith("1c8b-f6de-f59b-aa24")).map(c=>({base:c.constraint.value,limit:c.limit,observed:c.observed,status:c.status}))).toEqual([{base:6,limit:9,observed:9,status:"satisfied"},{base:6,limit:9,observed:9,status:"satisfied"}]);
  const history=commitBoundedHistory(createBoundedHistory(reinforcedSession),terran);
  expect(undoBoundedHistory(history).present).toBe(reinforcedSession);
  expect(redoBoundedHistory(undoBoundedHistory(history)).present).toBe(terran);
  const secondMarine=addRoot(terran,"Marines");terran=secondMarine.session;
  const addChildSC=(s:LocalRosterSession,id:typeof marine.id,name:string)=>{const view=ok(inspectLocalRosterChildChoices(s,id));const c=[...view.direct.map(x=>x.choice),...view.groups.flatMap(x=>x.choices)].find(x=>x.name===name)!;return ok(addLocalRosterChildSelection(s,id,c,{selectionId:next(),createSelectionId:next}));};
  terran=addChildSC(terran,secondMarine.id,"Reinforce");expect(mineral(terran)).toBe(390);
  terran=addChildSC(terran,secondMarine.id,"Combat Shield");expect(mineral(terran)).toBe(420);
  expect(model(terran)[0]!.amount).toBe(6);expect(model(terran,secondMarine.id)[0]!.amount).toBe(9);
  terran=ok(duplicateLocalRosterSelection(terran,secondMarine.id,next));
  const copy=terran.roster.forces[0]!.selections.filter(x=>x.name==="Marines").find(x=>x.id!==marine.id && x.id!==secondMarine.id)!;
  expect(model(terran,copy.id)[0]!.amount).toBe(9);expect(mineral(terran)).toBe(660);
  terran=ok(removeLocalRosterSelection(terran,copy.selections.find(x=>x.definition.sourceId==="6beb-c060-9e77-4256")!.id));
  expect(model(terran,copy.id)[0]!.amount).toBe(6);expect(model(terran,secondMarine.id)[0]!.amount).toBe(9);expect(mineral(terran)).toBe(600);
  terran=ok(setLocalRosterResourceBudget(terran,mineralIdSC,599));
  expect(inspectRosterResourceBudgets(terran.roster,terran.catalogue.context).resources.find(r=>r.resource.typeId===mineralIdSC)).toMatchObject({value:600,exact:true,status:"violated"});
  const draft=ok(createLocalRosterDraft({id:"sc04",createdAt:"2026-09-14T00:00:00Z",updatedAt:"2026-09-14T00:00:00Z",catalogueKey:terran.catalogue.key,roster:terran.roster,history:{past:[reinforcedSession.roster],future:[]},import:{batchId:library.importReport.batchId,importedAt:library.importReport.importedAt,files:library.importReport.files.map(({source,sourceBytes})=>({filename:source.filename,bytes:sourceBytes,sourceId:source.sourceId,sourceKind:source.kind}))}}));
  const decoded=ok(decodeLocalRosterDraft(structuredClone(draft)));
  const reopenedLibrary=ok(await prepareLocalCatalogueLibrary(decoded.import.files,{import:{batchId:decoded.import.batchId,importedAt:decoded.import.importedAt}}));
  const reopened=ok(restoreLocalRosterSession(reopenedLibrary.selectableCatalogues.find(c=>c.key===decoded.catalogueKey)!,decoded.roster));
  expect(reopened.roster).toEqual(terran.roster);expect(mineral(reopened)).toBe(600);expect(decoded.history!.past[0]).toEqual(reinforcedSession.roster);
  const idsBefore=JSON.stringify(reopened.roster);for(let i=0;i<5;i++){expect(mineral(reopened)).toBe(600);inspectLocalRosterSupportedValidation(reopened);}expect(JSON.stringify(reopened.roster)).toBe(idsBefore);

  let protoss = create("Protoss");
  const validation = (session: LocalRosterSession) => {
    const status = ok(inspectLocalRosterSupportedValidation(session)).status;
    return { validity: status.validity, completeness: status.completeness, counts: status.statusCounts };
  };
  const missingFaction = validation(protoss);
  protoss = addRoot(protoss, "Daelaam").session;
  expect(validation(protoss)).toMatchObject({ validity: "valid", counts: { violated: 0 } });
  const extraFaction = addRoot(protoss, "Khalai");
  expect(validation(extraFaction.session)).toMatchObject({ validity: "invalid", counts: { violated: 1 } });
  protoss = ok(removeLocalRosterSelection(extraFaction.session, extraFaction.id));
  expect(validation(protoss)).toMatchObject({ validity: "valid", counts: { violated: 0 } });
  protoss = addRoot(protoss, "Zealots").session;
  const positive = ledger(protoss);
  const second = addRoot(protoss, "Zealots"); protoss = second.session;
  const negative = ledger(protoss);
  const negativeValidation = validation(protoss);
  expect(missingFaction).toMatchObject({ validity: "invalid", completeness: "incomplete", counts: { violated: 1 } });
  expect(negativeValidation).toMatchObject({ validity: "invalid", completeness: "incomplete" });
  expect(ok(inspectLocalRosterSupportedValidation(protoss)).status.findings.filter(f => f.kind === "authoredError").map(f => f.report.message)).toEqual(["Not enough Core Supply."]);
  expect(negative.totals.find(t => t.id === "472f-46af-8e02-bfbf")?.value).toBe(-1);
  protoss = ok(removeLocalRosterSelection(protoss, second.id));
  const repaired = ledger(protoss);
  expect(validation(protoss)).toMatchObject({ validity: "valid", completeness: "incomplete" });
  for (let i = 0; i < 7; i++) protoss = addRoot(protoss, "Forge").session;
  const gasOverBudget = ledger(protoss);
  const gasValidation = validation(protoss);
  expect(gasOverBudget.totals.find(t => t.id === "1719-6214-392e-e53f")?.value).toBe(210);
  expect(gasValidation).toMatchObject({ validity: "invalid", completeness: "incomplete" });
  const gasId = objectId("1719-6214-392e-e53f");
  const mineralId = objectId("5bcf-897a-a5c9-d0e8");
  const resource = (s: LocalRosterSession, id = gasId) => inspectRosterResourceBudgets(s.roster, s.catalogue.context).resources.find(b => b.resource.typeId === id)!;
  expect(resource(protoss)).toMatchObject({ value:210, exact:true, status:"violated", resource:{effective:{kind:"finite",value:200}} });
  const gasOverride = ok(setLocalRosterResourceBudget(protoss, gasId, 210));
  expect(resource(gasOverride).status).toBe("satisfied");
  expect(resource(ok(setLocalRosterResourceBudget(gasOverride, gasId, undefined))).status).toBe("violated");
  expect(resource(gasOverride, mineralId).resource.effective).toEqual({kind:"finite",value:2000});
  // Exercise the actual saved-source Deployment Maps leaf, independently of
  // unsupported parent/default-selection behavior surrounding it.
  const gst = [...protoss.catalogue.context.graph.reachableDocumentsByDocument.get(protoss.catalogue.context.document)!].find(d => d.metadata.kind === "gameSystem")!;
  const maps = gst.projection.sharedSelectionEntries.find(e => e.id === "d444-6767-cbfc-bf56")!;
  const camp = maps.selectionEntryGroups[0]!.selectionEntries[0]!;
  const leaf = camp.modifiers.flatMap(m => m.conditions).find(c => c.field === `limit::${mineralId}`)!;
  expect(leaf).toBeDefined();
  const checkLeaf = (s: LocalRosterSession) => ok(evaluateRosterCondition(s.roster,s.catalogue.context,s.roster.forces[0]!,leaf));
  expect(checkLeaf(protoss)).toMatchObject({observed:2000,status:"satisfied",completeness:"complete"});
  const small = ok(setLocalRosterResourceBudget(gasOverride,mineralId,1000));
  expect(checkLeaf(small)).toMatchObject({observed:1000,status:"unsatisfied",completeness:"complete"});
  expect(resource(small).resource.effective).toEqual({kind:"finite",value:210});
  expect(checkLeaf(ok(setLocalRosterResourceBudget(small,mineralId,undefined))).observed).toBe(2000);
  expect(inspectRosterResourceBudgets(protoss.roster,protoss.catalogue.context).resources.filter(b=>b.resource.effective.kind === "unresolved")).toHaveLength(7);
  for (const name of ["Terran", "Zerg"]) {
    let s = create(name);
    const bounds = (session: LocalRosterSession) => ok(inspectLocalRosterSupportedValidation(session)).status.categoryConstraints.forces.flatMap(f => f.constraints).filter(c => c.categoryName === "Faction");
    expect(bounds(s).map(c => c.status)).toEqual(["violated", "satisfied"]);
    expect(bounds(s).every(c => name === "Zerg" ? c.categoryLink !== undefined && c.categoryDefinition === undefined : c.categoryDefinition !== undefined)).toBe(true);
    const factionId = bounds(s)[0]!.categoryId;
    const choices = localRosterRootChoices(s.catalogue).filter(c => c.materialized.categoryLinks.some(link => link.targetId === factionId));
    expect(choices.length).toBeGreaterThan(0);
    const addFaction = (base: LocalRosterSession, index: number) => {
      const id = next();
      return { id, session: ok(addLocalRosterRootSelection(base, choices[index]!, { selectionId: id, createSelectionId: next })) };
    };
    // Faction and unit names can coincide. Use the exact category-qualified
    // choice, never a name lookup that silently selects a different source.
    const first = addFaction(s, 0); s = first.session;
    expect(bounds(s).map(c => c.status)).toEqual(["satisfied", "satisfied"]);
    const second = addFaction(s, choices.length - 1);
    expect(bounds(second.session).map(c => ({ status: c.status, observed: c.observed }))).toEqual([{ status: "satisfied", observed: 2 }, { status: "violated", observed: 2 }]);
    expect(bounds(ok(removeLocalRosterSelection(second.session, second.id))).map(c => c.status)).toEqual(["satisfied", "satisfied"]);
  }
  const report = JSON.stringify({ initializationDiagnostics:marine.diagnostics, reinforcementDiagnostics:reinforcementResult.diagnostics.map(d=>d.code), conditionLedger, base, shieldOnly, reinforced, models: models.map(s => ({ id:s.id, amount:s.amount })), removed, missingFaction, positive, negative, negativeValidation, repaired, gasOverBudget, gasValidation }, null, 2);
  console.log(report);
  // Explicit opt-in artifact path keeps ordinary and corpus test runs read-only.
  if (process.env.ROSTERFORGE_STARCRAFT_PILOT_REPORT) writeFileSync(process.env.ROSTERFORGE_STARCRAFT_PILOT_REPORT, report);
}, 30000);

it.skipIf(!directory)("decodes the frozen SC-05 source values without changing source identities or bytes", async () => {
  if (!directory) throw new Error("Pilot data not configured");
  const inputs = files.map(([filename, hash]) => {
    const bytes = new Uint8Array(readFileSync(join(directory, filename)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
    return { filename, bytes };
  });
  const library = ok(await prepareLocalCatalogueLibrary(inputs, { import: { batchId: "sc05", importedAt: "2026-09-14T00:00:00Z" } }));
  const elements = (root: OrderedXmlElement): readonly OrderedXmlElement[] => [root, ...root.children.flatMap(n => n.kind === "element" ? elements(n) : [])];
  for (const document of library.documents) {
    const original = inputs.find(f => f.filename === document.source.filename)!;
    expect(document.sourceBytes).toEqual(original.bytes);
    expect(document.documentBytes).toEqual(original.bytes);
    // Every frozen source ID already used literal syntax, so existing army and
    // association/source identities do not need even the legacy XML alias.
    expect(elements(document.root).filter(e => e.xmlRawId !== undefined)).toEqual([]);
  }
  const terran = library.selectableCatalogues.find(c => c.name === "Terran")!;
  const marines = localRosterRootChoices(terran).find(c => c.materialized.id === "46b6-0bfa-70ea-ba86")!.materialized;
  expect(marines.materializedInfoLinks.filter(p => p.kind === "profileInfoLink").find(p => p.name === "C-14 Rifle")?.characteristics.find(c => c.name === "Rng")?.value).toBe('12"');
  const raynor = localRosterRootChoices(terran).find(c => c.materialized.id === "60b3-fffd-a15a-4cea")!;
  expect(raynor.materialized.name).toBe("Raynor's Raiders");
  expect(raynor.materialized.occurrence.node.attributes.name).toBe("Raynor's Raiders");
  const protoss = library.selectableCatalogues.find(c => c.name === "Protoss")!;
  const sentries = localRosterRootChoices(protoss).find(c => c.materialized.name === "Sentries")!.materialized;
  expect(sentries.profiles.find(p => p.id === "e1ee-c45e-2390-2106")?.characteristics[0]?.value).toBe('Use when a Friendly Unit Within 4" receives a DEBUFF. Remove all DEBUFFS from it.');
  expect(sentries.profiles.find(p => p.id === "3bed-bc23-eac6-223a")?.characteristics[0]?.value).toBe('Set a Force Field token Within 8" in an unoccupied space. Units of Size 2 or lower cannot move across Force Fields. Models of Size 3 or more can move over it, and it\'s then removed.');
  expect(library.selectableCatalogues.find(c => c.name === "Zerg")).toBeDefined();
}, 30000);
