// Opt-in immutable audit snapshots; ordinary tests never download or embed game data.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, chooseLocalRosterChildGroupEntry, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterChildChoices, localRosterRootChoices, setLocalRosterSelectionAmount } from "./roster-session.js";

const evidence = process.env.ROSTERFORGE_CORRECTNESS_SNAPSHOTS;
const revisions = { frozen: "04c62fcd041b3808c39d5c46fd677c704027b979", "current-upstream": "5b261ec423d5d017bb733c4f3c0a760b085d5ca5" };
function ok<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.diagnostics)); return r.value; }

for (const [dataset, revision] of Object.entries(revisions)) it.skipIf(evidence === undefined)(`counts Intercessor carriers and prices thresholds on ${dataset} ${revision}`, async () => {
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
}, 30000);
