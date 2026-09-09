// Rules and their links retain executable metadata without replacing source nodes.
import { expect, it } from "vitest";
import { fixtureBytes } from "@rosterforge/test-fixtures";
import { sourceId } from "@rosterforge/foundation";
import { parseBattleScribeXml } from "./ingest.js";

it("projects rule and rule-link modifiers while preserving original source", () => {
  const bytes = fixtureBytes("rule-visibility.cat");
  const parsed = parseBattleScribeXml(bytes, { source: { sourceId: sourceId("rules"), filename: "rules.cat", kind: "synthetic", importedAt: "2026-09-09T00:00:00Z" } });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const owner = parsed.value.projection.selectionEntries[0]!;
  expect(owner.rules.find(({ id }) => id === "rv-direct-conditional")).toHaveProperty("modifiers", [expect.objectContaining({ field: "hidden", value: "true" })]);
  expect(owner.rules.find(({ id }) => id === "rv-direct-grouped")).toHaveProperty("modifierGroups", expect.arrayContaining([expect.objectContaining({ type: "and" })]));
  expect(owner.infoLinks.find(({ id }) => id === "rv-linked-unhide")).toHaveProperty("modifiers", [expect.objectContaining({ field: "hidden", value: "false" })]);
  expect(parsed.value.sourceBytes).toEqual(bytes);
  const rulesNode = owner.node.children.find(node => node.kind === "element" && node.name === "rules");
  expect(rulesNode?.kind).toBe("element");
  if (rulesNode?.kind === "element") expect(owner.rules[0]!.node).toBe(rulesNode.children.find(node => node.kind === "element"));
});
