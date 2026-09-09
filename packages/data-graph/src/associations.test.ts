// Synthetic New Recruit association data exercises additive projection and graph transport.
import { describe, expect, it } from "vitest";
import { parseBattleScribeJson } from "@rosterforge/battlescribe-data";
import { sourceId } from "@rosterforge/foundation";
import { resolveBattleScribeDataGraph } from "./resolve.js";
import { materializeBattleScribeSelections } from "./materialize.js";

describe("association source projection", () => {
  it("preserves exact source, filters, overlays and resolvable shared definitions", () => {
    const data = { gameSystem: {
      id: "system", name: "Synthetic association system", revision: 1, battleScribeVersion: "2.03",
      categoryEntries: [{ id: "bodyguard", name: "Bodyguard" }],
      sharedAssociations: [{ id: "shared", name: "Shared attachment", min: 0, max: 1, scope: "force", childId: "unit" }],
      sharedSelectionEntries: [{ id: "leader", name: "Leader", type: "model", associations: [{
        id: "leading", name: "Leading", min: 0, max: 1, scope: "force", childId: "unit",
        label: "", action: "group", includeChildSelections: true, futureBehavior: "retained",
        conditionGroups: [{ type: "or", conditions: [{ type: "instanceOf", field: "selections", scope: "self", childId: "bodyguard", shared: true }],
          conditionGroups: [{ type: "and", conditions: [{ type: "atLeast", field: "selections", scope: "self", childId: "bodyguard", value: 1, queryFromSelf: true }] }],
        }],
      }] }],
      entryLinks: [{ id: "leader-link", targetId: "leader", type: "selectionEntry", associations: [{ id: "local", name: "Local", min: 0, max: 1 }],
        associationLinks: [{ id: "shared-link", targetId: "shared", type: "association", hidden: false, import: true }],
      }],
    } };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const parsed = parseBattleScribeJson(bytes, { source: { sourceId: sourceId("synthetic-associations"), kind: "synthetic", filename: "associations.json", importedAt: "2026-09-09T00:00:00.000Z" } });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const doc = parsed.value;
    expect(doc.sourceBytes).toEqual(bytes);
    const source = doc.projection.sharedSelectionEntries[0]?.associations[0];
    expect(source).toMatchObject({ id: "leading", min: 0, max: 1, childId: "unit", action: "group", label: "" });
    expect(source?.node.attributes.futureBehavior).toBe("retained");
    expect(source?.sourceNode).toBe(source?.node.jsonSource);
    expect(source?.conditionGroups[0]?.conditionGroups[0]?.conditions[0]?.queryFromSelf).toBe(true);
    const resolved = resolveBattleScribeDataGraph([doc]);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const reference = resolved.value.references.find((ref) => ref.kind === "associationLink");
    expect(reference?.targets[0]?.source).toBe(doc.projection.sharedAssociations[0]);
    const materialized = materializeBattleScribeSelections(resolved.value);
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) return;
    const choice = materialized.value.documents[0]?.entryLinks[0];
    expect(choice?.kind).toBe("selectionEntry");
    if (choice?.kind !== "selectionEntry") return;
    expect(choice.associations.map((association) => association.id)).toEqual(["leading", "local"]);
    expect(choice.associations[0]).toBe(source);
    expect(choice.associationLinks[0]).toBe(doc.projection.entryLinks[0]?.associationLinks[0]);
  });
});
