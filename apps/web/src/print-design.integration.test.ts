// Optional frozen-source presentation reconstruction; no private export or
// third-party data is committed. IDs in generated artifacts are disposable.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { objectId, type Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { createLocalRosterDraft } from "@rosterforge/persistence";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createRosterPrintViewModel, renderRosterPrintDocument } from "./roster-print.js";
import { createLocalRosterSession, addLocalRosterRootSelection, addLocalRosterChildSelection, localRosterRootChoices, inspectLocalRosterChildChoices, evaluateLocalRosterCosts, inspectLocalRosterSupportedValidation, setLocalRosterResourceBudget } from "./roster-session.js";

const directory = process.env.ROSTERFORGE_STARCRAFT_LATEST_DIR;
function ok<T>(r: Result<T>): T { if (!r.ok) throw Error(r.diagnostics.map(d => d.message).join("\n")); return r.value; }
it.skipIf(!directory)("reconstructs a five-unit Nerazim print reference through frozen ingestion and evaluated facts", async () => {
  const files = [["Protoss.cat", "ccb624c9d9119425599e0de6caf53fd35af4045a3c6af492b7aae15e7b50d73b"], ["Starcraft The Miniature Game.gst", "4ee80375b5939fb1d11e43e78baf35f6dbcec697ca736340d9c7eb04a3d00a18"]];
  const inputs = files.map(([filename, hash]) => {
    const bytes = new Uint8Array(readFileSync(join(directory!, filename!)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
    return { filename: filename!, bytes };
  });
  const library = ok(await prepareLocalCatalogueLibrary(inputs, { import: { batchId: "print-design", importedAt: "2026-09-28T00:00:00Z" } }));
  const catalogue = library.selectableCatalogues.find(c => c.name === "Protoss")!;
  let serial = 0;
  const next = () => selectionOccurrenceId(`print-design-${++serial}`);
  let session = ok(createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, { rosterId: rosterId("print-design"), forceId: forceOccurrenceId("print-design"), name: "Nerazim reference reconstruction", createSelectionId: next }));
  session = ok(setLocalRosterResourceBudget(session, objectId("5bcf-897a-a5c9-d0e8"), 1000));
  session = ok(setLocalRosterResourceBudget(session, objectId("1719-6214-392e-e53f"), 100));
  for (const name of ["Nerazim", "Zeratul", "Zealots", "Adepts", "Stalker", "Stalker", "Forge", "Gateway", "Twilight Council"]) {
    const choice = localRosterRootChoices(catalogue).find(c => c.materialized.name === name)!;
    expect(choice, name).toBeDefined();
    session = ok(addLocalRosterRootSelection(session, choice, { selectionId: next(), createSelectionId: next }));
  }
  const select = (ownerName: string, names: readonly string[], occurrence = 0) => {
    const owner = session.roster.forces[0]!.selections.filter(s => s.name === ownerName)[occurrence]!;
    expect(owner, ownerName).toBeDefined();
    for (const name of names) {
      const inspection = ok(inspectLocalRosterChildChoices(session, owner.id));
      const choice = [...inspection.direct.map(c => c.choice), ...inspection.groups.flatMap(g => g.choices)].find(c => c.name === name)!;
      expect(choice, name).toBeDefined();
      session = ok(addLocalRosterChildSelection(session, owner.id, choice, { selectionId: next(), createSelectionId: next }));
    }
  };
  select("Deployment Maps", ["Dirt Side", "Agria Valley"]);
  select("Mission Card", ["Hold Position", "Artefact Hunt"]);
  select("Adepts", ["Resonating Glaives", "Glaive Strike"]);
  select("Stalker", ["Path of Shadows", "Fury of the Nerazim"], 0);
  select("Stalker", ["Path of Shadows", "Fury of the Nerazim"], 1);
  const before = JSON.stringify(session.roster);
  const model = createRosterPrintViewModel(session, evaluateLocalRosterCosts(session), inspectLocalRosterSupportedValidation(session));
  expect(model.reference.units.filter(u => u.sheetUnit)).toHaveLength(5);
  expect(model.reference.units.filter(u => u.name.endsWith("Stalker"))).toHaveLength(2);
  expect(model.reference.resources).toEqual(expect.arrayContaining([expect.objectContaining({ name: " Minerals", value: 1000, limit: 1000 }), expect.objectContaining({ name: "  Gas", value: 100, limit: 100 })]));
  expect(model.reference.units.filter(u => u.referenceSection === "supporting").map(u => u.anchor)).toEqual(["unit-1", "unit-2"]);
  for (const [index, input] of inputs.entries()) expect(createHash("sha256").update(input.bytes).digest("hex")).toBe(files[index]![1]);
  const output = process.env.ROSTERFORGE_PRINT_DESIGN_OUTPUT;
  if (output) {
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, "nerazim-model.json"), JSON.stringify(model));
    const draft = ok(createLocalRosterDraft({ id: "print-design-disposable", createdAt: "2026-09-28T00:00:00Z", updatedAt: "2026-09-28T00:00:00Z", catalogueKey: catalogue.key, roster: session.roster, import: { batchId: "print-design", importedAt: "2026-09-28T00:00:00Z", files: inputs } }));
    writeFileSync(join(output, "nerazim-draft.json"), JSON.stringify(draft, (_key, value: unknown) => value instanceof Uint8Array ? [...value] : value));
    for (const layout of ["compact", "sheets"] as const) writeFileSync(join(output, `candidate-${layout}.html`), renderRosterPrintDocument({ ...model, layout }));
  }
  expect(JSON.stringify(session.roster)).toBe(before);
}, 120_000);
