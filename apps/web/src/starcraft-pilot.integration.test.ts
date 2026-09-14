import { evaluateRosterCondition, inspectRosterResourceBudgets } from "@rosterforge/evaluation";
// Optional pinned validation regression plus explicit remaining pilot reproductions.
// Download the four immutable files listed in docs/qa/starcraft-pilot-baseline.md
// into ROSTERFORGE_STARCRAFT_PILOT_DIR. Source bytes are never rewritten.
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
    return { id, session: ok(addLocalRosterRootSelection(session, localRosterRootChoices(session.catalogue).find(c => c.materialized.name === name)!, { selectionId: id, createSelectionId: next })) };
  };
  const ledger = (session: LocalRosterSession) => {
    const result = evaluateLocalRosterCosts(session);
    const costs = ok(result);
    return { totals: costs.totals.map(t => ({ id: t.typeId, value: t.value })), completeness: costs.completeness, diagnostics: result.diagnostics.map(d => ({ code: d.code, details: d.details })) };
  };
  let terran = create("Terran");
  const marine = addRoot(terran, "Marines"); terran = marine.session;
  const base = ledger(terran);
  const children = ok(inspectLocalRosterChildChoices(terran, marine.id));
  const shield = children.groups.flatMap(g => g.choices).find(c => c.name === "Combat Shield")!;
  terran = ok(addLocalRosterChildSelection(terran, marine.id, shield, { selectionId: next(), createSelectionId: next }));
  const shieldOnly = ledger(terran);
  const reinforceId = next();
  terran = ok(addLocalRosterChildSelection(terran, marine.id, children.direct.find(c => c.choice.name === "Reinforce")!.choice, { selectionId: reinforceId, createSelectionId: next }));
  const reinforced = ledger(terran);
  const models = terran.roster.forces[0]!.selections.find(s => s.id === marine.id)!.selections.filter(s => s.name === "Marine");
  // These assertions pin the demonstrated failure; they are not expected rules.
  expect(models).toHaveLength(1);
  expect(models[0]!.amount).toBe(6);
  expect(reinforced.totals.find(t => t.id === "5bcf-897a-a5c9-d0e8")?.value).toBe(230);
  terran = ok(removeLocalRosterSelection(terran, reinforceId));
  const removed = ledger(terran);
  expect(removed.totals.find(t => t.id === "5bcf-897a-a5c9-d0e8")?.value).toBe(180);

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
  const report = JSON.stringify({ base, shieldOnly, reinforced, models: models.map(s => ({ id:s.id, amount:s.amount })), removed, missingFaction, positive, negative, negativeValidation, repaired, gasOverBudget, gasValidation }, null, 2);
  console.log(report);
  // Explicit opt-in artifact path keeps ordinary and corpus test runs read-only.
  if (process.env.ROSTERFORGE_STARCRAFT_PILOT_REPORT) writeFileSync(process.env.ROSTERFORGE_STARCRAFT_PILOT_REPORT, report);
}, 30000);
