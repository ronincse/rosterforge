// Optional owner-supplied corpus; never embeds or downloads third-party data.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import type { InfoLinkProjection, RuleProjection } from "@rosterforge/battlescribe-data";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, localRosterRootChoices } from "./roster-session.js";
import { inspectLocalRule } from "./rule-inspection.js";

const directory = process.env.ROSTERFORGE_BSDATA_JSON_DIR;
it.skipIf(directory === undefined)("measures pinned rule carriers and checks Templar Vows in both primary catalogues", async () => {
  if (directory === undefined) throw new Error("Corpus not configured");
  // Trust only the explicitly supplied fixture repository for this read-only
  // command; Windows sandbox and owner accounts can differ. No global config.
  expect(execFileSync("git", ["-c", `safe.directory=${resolve(directory).replaceAll("\\", "/")}`, "-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()).toBe("04c62fcd041b3808c39d5c46fd677c704027b979");
  const files = readdirSync(directory).filter(name => name.endsWith(".json")).map(filename => ({ filename, bytes: new Uint8Array(readFileSync(join(directory, filename))) }));
  const prepared = await prepareLocalCatalogueLibrary(files, { import: { batchId: "rule-corpus", importedAt: "2026-09-09T00:00:00Z" } });
  expect(files).toHaveLength(46);
  if (!prepared.ok) throw new Error("Corpus import failed");
  const rules = prepared.value.graph.objects.filter(o => o.kind === "rule").map(o => o.source as RuleProjection);
  expect(rules).toHaveLength(463);
  expect(rules.filter(r => r.modifiers.length > 0)).toHaveLength(24);
  expect(rules.flatMap(r => r.modifiers)).toHaveLength(25);
  expect(rules.flatMap(r => r.modifierGroups)).toHaveLength(0);
  const links = prepared.value.graph.references.filter(r => r.kind === "infoLink").map(r => r.source as InfoLinkProjection).filter(l => l.type === "rule");
  // Four catalogue-root info links (none with link modifiers) remain generic
  // source only; the 9,753 links in rendered selection/category/group paths
  // contain all 189 measured hidden modifiers.
  expect(links).toHaveLength(9753);
  expect(links.flatMap(l => l.modifiers).filter(m => m.field === "hidden")).toHaveLength(189);
  for (const [id, expected] of [["470a-6daa-9014-12df", "hidden"], ["36d3-36bc-68dd-40ac", "visible"]] as const) {
    const catalogue = prepared.value.selectableCatalogues.find(c => c.id === id)!;
    const force = catalogue.context.forces.definitions.find(f => f.source.name === "Army Roster")!;
    let next = 0;
    const created = createLocalRosterSession(catalogue, force, { rosterId: rosterId(`rule-${id}`), forceId: forceOccurrenceId(`force-${id}`), name: "Rule corpus check", createSelectionId: () => selectionOccurrenceId(`rule-${++next}`) });
    if (!created.ok) throw new Error("Corpus roster failed");
    const choice = localRosterRootChoices(catalogue).find(c => c.materialized.name === "Intercessor Squad")!;
    const added = addLocalRosterRootSelection(created.value, choice, { selectionId: selectionOccurrenceId("intercessors"), createSelectionId: () => selectionOccurrenceId(`rule-${++next}`) });
    if (!added.ok) throw new Error("Corpus unit failed");
    const owner = added.value.roster.forces[0]!.selections.find(s => s.id === "intercessors")!;
    const vows = added.value.selectionChoices.get(owner.id)!.materializedInfoLinks.find(l => l.kind === "ruleInfoLink" && l.definitionId === "f26c-4b28-aaea-40cf");
    if (vows?.kind !== "ruleInfoLink") throw new Error("Pinned Templar Vows link missing");
    expect(inspectLocalRule(vows, added.value, owner)).toMatchObject({ status: expected, completeness: "complete" });
  }
}, 120_000);
