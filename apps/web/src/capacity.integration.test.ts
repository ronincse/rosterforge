// Optional pinned-data regression for capacity versus provisional spending.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createRosterWorkspaceViewModel } from "./roster-workspace-model.js";
import { addLocalRosterRootSelection, chooseLocalRosterChildGroupEntry, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterChildChoices, inspectLocalRosterRootChoices, inspectLocalRosterSupportedValidation, localRosterRootChoices, removeLocalRosterSelection } from "./roster-session.js";

const directory = process.env.ROSTERFORGE_BSDATA_JSON_DIR;
it.skipIf(directory === undefined)("keeps the pinned Dark Angels capacity across Impulsor and Battle Size edits", async () => {
  if (directory === undefined) throw new Error("Corpus not configured");
  expect(execFileSync("git", ["-c", `safe.directory=${resolve(directory).replaceAll("\\", "/")}`, "-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()).toBe("04c62fcd041b3808c39d5c46fd677c704027b979");
  // Exact closure measured at the pin; no third-party data is embedded/downloaded.
  const names = ["Imperium - Dark Angels.json", "Warhammer 40,000.json", "Imperium - Space Marines.json", "Imperium - Imperial Knights - Library.json", "Imperium - Agents of the Imperium.json", "Library - Titans.json", "Library - Astartes Heresy Legends.json", "Unaligned Forces.json"];
  const prepared = await prepareLocalCatalogueLibrary(names.map(filename => ({ filename, bytes: new Uint8Array(readFileSync(join(directory, filename))) })), { import: { batchId: "capacity-corpus", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Pinned import failed");
  const catalogue = prepared.value.selectableCatalogues.find(c => c.id === "470a-6daa-9014-12df")!;
  const force = catalogue.context.forces.definitions.find(f => f.source.name === "Army Roster")!;
  let n = 0;
  const next = () => selectionOccurrenceId(`capacity-${++n}`);
  const created = createLocalRosterSession(catalogue, force, { rosterId: rosterId("capacity-roster"), forceId: forceOccurrenceId("capacity-force"), name: "Capacity check", createSelectionId: next });
  if (!created.ok) throw new Error("Roster failed");
  let session = created.value;
  function choose(parentName: string, name: string) {
    const parent = session.roster.forces[0]!.selections.find(s => s.name === parentName)!;
    const choices = inspectLocalRosterChildChoices(session, parent.id);
    if (!choices.ok) throw new Error("Child inspection failed");
    const group = choices.value.groups.find(g => g.choices.some(c => c.name === name))!;
    const result = chooseLocalRosterChildGroupEntry(session, parent.id, group.group, group.choices.find(c => c.name === name)!, { selectionId: next(), createSelectionId: next });
    if (!result.ok) throw new Error(`Choice failed: ${name}`);
    session = result.value;
  }
  function add(name: string) {
    const id = next();
    const choice = localRosterRootChoices(catalogue).find(c => c.materialized.name === name)!;
    const result = addLocalRosterRootSelection(session, choice, { selectionId: id, createSelectionId: next });
    if (!result.ok) throw new Error(`Add failed: ${name}`);
    session = result.value;
    return id;
  }
  function inspect(value: number, limit: number, provisional: boolean) {
    const costs = evaluateLocalRosterCosts(session);
    const validation = inspectLocalRosterSupportedValidation(session);
    if (!costs.ok || !validation.ok) throw new Error("Evaluation failed");
    const points = validation.value.constraints.forces.forces.flatMap(f => f.constraints).find(c => c.constraint.field === "51b2-306e-1021-d207")!;
    expect(points).toMatchObject({ limit, limitCompleteness: "complete", modifierSequence: { completeness: "complete", value: limit }, costEvaluation: { exact: !provisional } });
    if (provisional) {
      expect(points).toMatchObject({ completeness: "incomplete", status: "unresolved", costEvaluation: { unresolvedCosts: 1 } });
      expect(costs.diagnostics.map(d => d.code)).toContain("EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED");
    }
    const model = createRosterWorkspaceViewModel(session, { costs, validation, rootChoices: inspectLocalRosterRootChoices(session) });
    const shown = model.costs.activeTotals.find(c => c.typeId === "51b2-306e-1021-d207");
    expect(shown).toMatchObject({ value, limit });
    expect(shown?.provisional === true).toBe(provisional);
    return model;
  }
  choose("Battle Size", "2. Strike Force (2000 Point limit)");
  choose("Detachment", "Gladius Task Force");
  choose("Force Disposition", "Priority Assets");
  add("Captain"); add("Intercessor Squad");
  inspect(160, 2000, false);
  const configuration = session.roster.forces[0]!.selections.slice(0, 3);
  const transport = add("Impulsor");
  const model = inspect(230, 2000, true);
  expect(session.roster.forces[0]!.selections.slice(0, 3)).toEqual(configuration);
  expect(model.costs.activeTotals.some(c => c.name === "Detachment Points" && c.value === 3 && c.limit === 3)).toBe(true);
  choose("Battle Size", "1. Incursion (1000 Point limit)");
  inspect(230, 1000, true);
  const removed = removeLocalRosterSelection(session, transport);
  if (!removed.ok) throw new Error("Remove failed");
  session = removed.value;
  inspect(160, 1000, false);
}, 120_000);
