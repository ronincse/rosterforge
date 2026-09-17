// Opt-in RF-A05 regression on the audit pin. Never embeds third-party source.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterChildSelection, addLocalRosterRootSelection, chooseLocalRosterChildGroupEntry, createLocalRosterSession, inspectLocalRosterChildChoices, localRosterRootChoices } from "./roster-session.js";
import { createUnitReferenceModel, referenceAttribution } from "./unit-reference-model.js";
import { createReferenceKeywordLinks, isKeywordCharacteristic } from "./reference-keywords.js";
import { catalogueReferenceTextIndex, selectedReferenceTextIndex, matchTextReference } from "./reference-text-index.js";
import { referenceTextRuns } from "./reference-rich-text.js";
import { inspectRosterAssociationChoices } from "@rosterforge/evaluation";
import { addLocalRosterChildSelection as addLeadershipChoice, inspectLocalRosterConstraints, inspectLocalRosterStructuralStatus, setLocalRosterAssociation, removeLocalRosterSelection, duplicateLocalRosterSelection } from "./roster-session.js";

const directory = process.env.ROSTERFORGE_BSDATA_JSON_DIR;
it.skipIf(!directory)("groups the audit's selected five and ten model Intercessor loadouts at the exact pin", async () => {
  if (!directory) throw new Error("Corpus not configured");
  expect(execFileSync("git", ["-c", `safe.directory=${resolve(directory).replaceAll("\\", "/")}`, "-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()).toBe("04c62fcd041b3808c39d5c46fd677c704027b979");
  const names = ["Imperium - Dark Angels.json", "Warhammer 40,000.json", "Imperium - Space Marines.json", "Imperium - Imperial Knights - Library.json", "Imperium - Agents of the Imperium.json", "Library - Titans.json", "Library - Astartes Heresy Legends.json", "Unaligned Forces.json"];
  const prepared = await prepareLocalCatalogueLibrary(names.map(filename => ({ filename, bytes: new Uint8Array(readFileSync(join(directory, filename))) })), { import: { batchId: "reference-corpus", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Import failed");
  const catalogue = prepared.value.selectableCatalogues.find(c => c.id === "470a-6daa-9014-12df")!;
  let n = 0;
  const next = () => selectionOccurrenceId(`ref-${++n}`);
  const created = createLocalRosterSession(catalogue, catalogue.context.forces.definitions.find(f => f.source.name === "Army Roster")!, { rosterId: rosterId("reference-roster"), forceId: forceOccurrenceId("reference-force"), name: "Reference QA", createSelectionId: next });
  if (!created.ok) throw new Error("Create failed");
  const unitId = next();
  const added = addLocalRosterRootSelection(created.value, localRosterRootChoices(catalogue).find(c => c.materialized.name === "Intercessor Squad")!, { selectionId: unitId, createSelectionId: next });
  if (!added.ok) throw new Error("Add failed");
  let session = added.value;
  const unit = () => session.roster.forces[0]!.selections.find(s => s.id === unitId)!;
  function addModel(name: string) {
    const choices = inspectLocalRosterChildChoices(session, unitId);
    if (!choices.ok) throw new Error("Inspect failed");
    const choice = choices.value.groups.flatMap(g => g.choices).find(c => c.name === name)!;
    const result = addLocalRosterChildSelection(session, unitId, choice, { selectionId: next(), createSelectionId: next });
    if (!result.ok) throw new Error("Model failed");
    session = result.value;
  }
  // Creation now supplies four independent ordinary models. Swap one for the
  // launcher instead of adding three more on top of those initialized models.
  const ordinary = unit().selections.filter(s => s.name === "Intercessor");
  expect(ordinary).toHaveLength(4);
  addModel("Intercessor w/ Grenade Launcher");
  const removed = removeLocalRosterSelection(session, ordinary[0]!.id);
  if (!removed.ok) throw new Error("Ordinary model removal failed");
  session = removed.value;
  const sergeant = unit().selections.find(s => s.name === "Intercessor Sergeant")!;
  const choices = inspectLocalRosterChildChoices(session, sergeant.id);
  if (!choices.ok) throw new Error("Inspect failed");
  const group = choices.value.groups.find(g => g.choices.some(c => c.name === "Power fist"))!;
  const chosen = chooseLocalRosterChildGroupEntry(session, sergeant.id, group.group, group.choices.find(c => c.name === "Power fist")!, { selectionId: next(), createSelectionId: next });
  if (!chosen.ok) throw new Error("Loadout failed");
  session = chosen.value;
  const start = performance.now();
  const model = createUnitReferenceModel(session, unit());
  const coldMs = performance.now() - start;
  const warmStart = performance.now();
  createUnitReferenceModel(session, unit());
  const warmMs = performance.now() - warmStart;
  expect(model.profiles).toHaveLength(16);
  const legacyModels = model.profiles.filter(g => g.profile.value.typeName === "Unit");
  const legacyWeapons = model.profiles.filter(g => ["Ranged Weapons", "Melee Weapons"].includes(g.profile.value.typeName ?? ""));
  expect(legacyModels.length).toBeGreaterThan(0);
  expect(legacyWeapons.length).toBeGreaterThan(0);
  expect(legacyModels.every(g => g.presentation?.section === "model" && g.presentation.legacy)).toBe(true);
  expect(legacyWeapons.every(g => g.presentation?.section === "weapon" && g.presentation.legacy)).toBe(true);

  expect(model.profiles.filter(g => g.profile.value.typeName === "Unit").map(g => referenceAttribution(g.members))).toEqual(["1× Intercessor Sergeant", "3× Intercessor", "1× Intercessor w/ Grenade Launcher"]);
  expect(model.profiles.filter(g => g.profile.value.name?.includes("grenade launcher")).map(g => g.profile.value.name)).toEqual(["➤ Astartes grenade launcher - krak", "➤ Astartes grenade launcher - frag"]);
  expect(model.profiles.find(g => g.profile.value.name === "Power fist")?.members[0]?.label).toBe("Intercessor Sergeant");
  expect(model.rules.some(g => g.rule.value.name === "Templar Vows")).toBe(false);
  for (let i = 0; i < 5; i++) addModel("Intercessor");
  const largerStart = performance.now();
  const larger = createUnitReferenceModel(session, unit());
  expect(larger.profiles).toHaveLength(model.profiles.length);
  expect(larger.rules).toHaveLength(model.rules.length);
  expect(larger.profiles.filter(g => g.profile.value.typeName === "Unit").map(g => referenceAttribution(g.members))).toContain("8× Intercessor");
  console.info("RF-A05 projection measurements", { fiveColdMs: coldMs, fiveWarmMs: warmMs, tenColdMs: performance.now() - largerStart, profileGroups: model.profiles.length, ruleGroups: model.rules.length });
}, 120_000);

it.skipIf(!directory)("links the pinned Chaos Terminator Rapid Fire 4 and keeps empty melee keywords blank", async () => {
  if (!directory) throw new Error("Corpus not configured");
  expect(execFileSync("git", ["-c", `safe.directory=${resolve(directory).replaceAll("\\", "/")}`, "-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()).toBe("04c62fcd041b3808c39d5c46fd677c704027b979");
  const names = readdirSync(directory).filter(name => name.endsWith(".json"));
  const prepared = await prepareLocalCatalogueLibrary(names.map(filename => ({ filename, bytes: new Uint8Array(readFileSync(join(directory, filename))) })), { import: { batchId: "keyword-corpus", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Import failed");
  const catalogue = prepared.value.selectableCatalogues.find(c => c.name === "Chaos - World Eaters")!;
  let n = 0;
  const next = () => selectionOccurrenceId(`keyword-${++n}`);
  const created = createLocalRosterSession(catalogue, catalogue.context.forces.definitions.find(f => f.source.name === "Army Roster")!, { rosterId: rosterId("keyword-roster"), forceId: forceOccurrenceId("keyword-force"), name: "Keyword QA", createSelectionId: next });
  if (!created.ok) throw new Error("Create failed");
  const unitId = next();
  const added = addLocalRosterRootSelection(created.value, localRosterRootChoices(catalogue).find(c => c.materialized.name === "Chaos Terminators")!, { selectionId: unitId, createSelectionId: next });
  if (!added.ok) throw new Error("Add failed");
  const model = createUnitReferenceModel(added.value, added.value.roster.forces[0]!.selections.find(s => s.id === unitId)!);
  const linked = createReferenceKeywordLinks(model);
  const tokens = [...linked.profiles.values()].flatMap(columns => [...columns.values()].flat());
  expect(tokens.filter(t => t.text.trim() === "Rapid Fire 4").length).toBeGreaterThan(0);
  expect(tokens.filter(t => t.text.trim() === "Rapid Fire 4").every(t => t.rule?.rule.value.name === "Rapid Fire")).toBe(true);
  expect(linked.inlineRules.some(r => r.rule.value.name === "Rapid Fire")).toBe(false);
  expect(model.profiles.filter(p => p.profile.value.name === "Accursed weapon").length).toBeGreaterThan(0);
  expect(model.profiles.filter(p => p.profile.value.name === "Accursed weapon").every(p => p.profile.value.characteristics.find(isKeywordCharacteristic)?.value.trim() === "")).toBe(true);
  const angronId = next();
  const angron = addLocalRosterRootSelection(added.value, localRosterRootChoices(catalogue).find(c => c.materialized.name === "Angron")!, { selectionId: angronId, createSelectionId: next });
  if (!angron.ok) throw new Error("Angron failed");
  expect(angron.diagnostics).toEqual([]);
  const angronModel = createUnitReferenceModel(angron.value, angron.value.roster.forces[0]!.selections.find(s => s.id === angronId)!);
  const index = selectedReferenceTextIndex(catalogueReferenceTextIndex(angron.value), angronModel);
  const demise = matchTextReference(index, "Deadly Demise X", 0)!;
  expect(demise.target.rules[0]?.value.description).toBeTruthy();
  expect(demise.target.sourceOnly).toBe(false);
  const warp = matchTextReference(index, "Warp Blades", 0)!;
  expect(warp.target.profiles[0]?.profile.value.id).toBe("fbfe-9079-46e0-0cbf");
  expect(warp.target.sourceOnly).toBe(true);
  expect(matchTextReference(index, "Deployment", 0)).toBeUndefined();
  const description = demise.target.rules[0]!.value.description!;
  const runs = referenceTextRuns(description);
  expect(runs.some(r => (r.style & 2) && r.text.includes("Example"))).toBe(true);
  expect(runs.map(r => r.text).join("")).not.toContain("**");
  let leadership = angron.value;
  const slaughterId = next();
  const bodyguardId = next();
  for (const [name, id] of [["Slaughterbound", slaughterId], ["Eightbound", bodyguardId]] as const) {
    const addedUnit = addLocalRosterRootSelection(leadership, localRosterRootChoices(catalogue).find(c => c.materialized.name === name)!, { selectionId: id, createSelectionId: next });
    if (!addedUnit.ok) throw new Error(`Cannot add ${name}`);
    leadership = addedUnit.value;
  }
  const childChoices = inspectLocalRosterChildChoices(leadership, slaughterId);
  if (!childChoices.ok) throw new Error("Missing Slaughterbound choices");
  const warlord = childChoices.value.direct.find(c => c.choice.name === "Warlord")!.choice;
  const twoWarlords = addLeadershipChoice(leadership, slaughterId, warlord, { selectionId: next(), createSelectionId: next });
  if (!twoWarlords.ok) throw new Error("Second Warlord failed");
  const checks = inspectLocalRosterConstraints(twoWarlords.value);
  if (!checks.ok) throw new Error("Check failed");
  expect(checks.value.categories.forces.flatMap(f => f.constraints).find(c => c.categoryName === "Warlord" && c.constraintType === "max")).toMatchObject({status:"violated",observed:2,limit:1,completeness:"complete"});
  expect(checks.diagnostics.map(d => d.code)).not.toContain("EVALUATION_CATEGORY_CONSTRAINT_MODIFIER_GROUPS_UNSUPPORTED");
  // Keep the original self-cost regression separate from incoming attachment
  // bounds, which are now evaluated by the Supporting checkpoint.
  const slaughterCosts = checks.value.selections.selections.find(s => s.owner.id === slaughterId)!.constraints.filter(c => ["75bb-ded1-c86d-bdf0", "716d-91b7-d55a-1022"].includes(c.constraint.field ?? ""));
  expect(slaughterCosts).toHaveLength(3);
  expect(slaughterCosts.map(c => ({ status: c.status, observed: c.observed, completeness: c.completeness }))).toEqual(Array.from({ length: 3 }, () => ({ status: "satisfied", observed: 0, completeness: "complete" })));
  const source = twoWarlords.value.roster.forces[0]!.selections.find(s => s.id === slaughterId)!;
  const associationRules = (current: typeof leadership) => createUnitReferenceModel(current, current.roster.forces[0]!.selections.find(s => s.id === slaughterId)!).rules.filter(r => r.rule.value.name === "Deep Strike" || r.rule.value.name === "Scouts");
  expect(associationRules(twoWarlords.value)).toEqual([]);
  const structural = inspectLocalRosterStructuralStatus(twoWarlords.value);
  expect(structural.diagnostics.map(d => d.code)).not.toContain("EVALUATION_STRUCTURAL_STATUS_ROOT_VISIBILITY_UNRESOLVED");
  expect(structural.diagnostics.map(d => d.code)).not.toContain("EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED");
  const leading = inspectRosterAssociationChoices(twoWarlords.value.roster, catalogue.context, source).find(c => c.name === "Leading")!;
  expect(leading.supported).toBe(true);
  expect(leading.candidates.find(c => c.selection.id === bodyguardId)?.status).toBe("satisfied");
  const attached = setLocalRosterAssociation(twoWarlords.value, slaughterId, leading.key, bodyguardId);
  if (!attached.ok) throw new Error("Attachment failed");
  expect(attached.value.roster.associations).toEqual([{sourceId:slaughterId,targetId:bodyguardId,definitionKey:leading.key}]);
  expect(associationRules(attached.value).map(r => r.rule.value.name)).toEqual(["Deep Strike", "Scouts"]);
  expect(associationRules(attached.value).every(r => r.rule.report.completeness === "complete")).toBe(true);
  const copied = duplicateLocalRosterSelection(attached.value, slaughterId, next);
  expect(copied.ok).toBe(true);
  if (copied.ok) expect(copied.value.roster.associations).toEqual(attached.value.roster.associations);
  const removed = removeLocalRosterSelection(attached.value, bodyguardId, {createSelectionId: next});
  expect(removed.ok).toBe(true);
  if (removed.ok) {
    expect(removed.value.roster.associations).toBeUndefined();
    expect(associationRules(removed.value)).toEqual([]);
  }
  console.info("Keyword reference corpus", { documents: names.length, profileGroups: model.profiles.length, ruleGroups: model.rules.length, inlineRules: linked.inlineRules.length, linkedTokens: tokens.filter(t => t.rule).length });
}, 120_000);
