// Live root bounds must reuse group applicability without changing static seeding.
import { expect, it } from "vitest";
import { parseBattleScribeJson } from "@rosterforge/battlescribe-data";
import { composeBattleScribeCatalogueContexts, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { sourceId } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterDefinitionKeyForSource, rosterId, type Roster } from "@rosterforge/roster-model";
import { inspectSingleForceRootChoices, inspectEmptySingleForceRootChoices } from "./initialization.js";

function scenario(unknown = false) {
  const parsed = parseBattleScribeJson(new TextEncoder().encode(JSON.stringify({ catalogue: {
    id: "catalogue", gameSystemId: "system", name: "Live groups", battleScribeVersion: "2.03",
    forceEntries: [{ id: "normal", name: "Normal" }, { id: "campaign", name: "Campaign" }],
    selectionEntries: [{ id: "required", name: "Required", type: "unit",
      constraints: [{ id: "minimum", type: "max", field: "selections", scope: "force", shared: true, value: 1 }],
      modifiers: [{ type: "set", field: "minimum", value: 1 }],
      modifierGroups: [{ type: "and",
        conditions: [{ type: unknown ? "future" : "instanceOf", field: "selections", scope: "force", childId: "campaign", value: 1, shared: true }],
        modifiers: [{ type: "increment", field: "minimum", value: 1 }],
        modifierGroups: [{ type: "and", modifiers: [{ type: "increment", field: "minimum", value: 1 }] }],
      }],
    }],
  } })), { source: { sourceId: sourceId("live-groups"), filename: "live-groups.json", kind: "synthetic", importedAt: "2026-09-09T00:00:00Z" } });
  if (!parsed.ok) throw new Error("Parse failed");
  const graph = resolveBattleScribeDataGraph([parsed.value]);
  if (!graph.ok) throw new Error("Graph failed");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Context failed");
  const context = contexts.value.catalogues[0]!;
  const key = (entry: { source: { sourceId: string }; path: readonly string[] }) => rosterDefinitionKeyForSource(entry.source.sourceId, entry.path);
  const roster = (index: number): Roster => ({ id: rosterId("test"), name: "Test", catalogue: { kind: "catalogue", key: key(parsed.value.projection) }, forces: [{ id: forceOccurrenceId("force"), definition: { kind: "forceEntry", key: key(parsed.value.projection.forceEntries[index]!) }, selections: [], forces: [] }] });
  return { context, roster };
}

it("evaluates inherited nested groups in order only in the matching live force", () => {
  const { context, roster } = scenario();
  for (const [forceIndex, minimum] of [[0, 1], [1, 3]]) {
    const current = roster(forceIndex!);
    const result = inspectSingleForceRootChoices(current, context, current.forces[0]!, context.roots.roots);
    expect(result.ok && result.value.choices[0]).toMatchObject({ maximum: minimum, completeness: "complete" });
    expect(result.diagnostics).toEqual([]);
  }
  const staticResult = inspectEmptySingleForceRootChoices(context.roots.roots);
  expect(staticResult.ok && staticResult.value.completeness).toBe("incomplete");
});

it("retains uncertainty for unsupported group applicability", () => {
  const { context, roster } = scenario(true);
  const current = roster(0);
  const result = inspectSingleForceRootChoices(current, context, current.forces[0]!, context.roots.roots);
  expect(result.ok && result.value.choices[0]).toMatchObject({ completeness: "incomplete" });
  expect(result.ok && result.value.choices[0]?.maximum).toBeUndefined();
});
