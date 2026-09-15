// Fictional end-to-end constraint scopes distinguish unknown context from empty counts.
import { describe, expect, it } from "vitest";
import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { composeBattleScribeCatalogueContexts, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { sourceId } from "@rosterforge/foundation";
import { addRosterForce, addRosterSelectionToForce, addRosterSelectionToSelection, createRoster, forceOccurrenceId, rosterDefinitionKey, rosterDefinitionKeyForSource, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { composeSupportedRosterValidation } from "./validation.js";
import { inspectRosterSelectionConstraintWithSelectionConditions, inspectRosterSelectionConstraintsInRoster } from "./constraints.js";

function ok<T>(result: { ok: boolean; value?: T }): T {
  if (!result.ok || result.value === undefined) throw new Error("Fixture must succeed");
  return result.value;
}

function fixture(scope: string, mode: "present" | "empty" | "absent" | "missing" | "ambiguous" | "agreeing" | "missing-type" | "unknown-type" = "present") {
  const containerType = scope === "model-or-unit" ? "unit" : scope === "beef-cafe" ? "unit" : scope;
  const ownerType = containerType === "upgrade" ? "model" : "upgrade";
  const xml = `<catalogue id="cat" name="Fictional" revision="1" battleScribeVersion="2.03" gameSystemId="sys" gameSystemRevision="1">
    <forceEntries><forceEntry id="force" name="Force"/></forceEntries>
    <selectionEntries>
      <selectionEntry id="beef-cafe" name="Container" ${mode === "missing-type" ? "" : `type="${mode === "unknown-type" ? "future" : containerType}"`}/>
      <selectionEntry id="owner" name="Choice" type="${ownerType}"><constraints>
        <constraint id="bound" type="max" field="selections" scope="${scope}" value="0" includeChildSelections="true"/>
        <constraint id="known" type="min" field="selections" scope="self" value="2"/>
      </constraints></selectionEntry>
    </selectionEntries></catalogue>`;
  const parsed = ok(parseBattleScribeXml(new TextEncoder().encode(xml), { source: { sourceId: sourceId("fiction:typed.cat"), filename: "typed.cat", kind: "synthetic", importedAt: "2026-09-14T00:00:00Z" } }));
  let context = ok(composeBattleScribeCatalogueContexts(ok(resolveBattleScribeDataGraph([parsed])))).catalogues[0]!;
  const containerRoot = context.roots.roots[0]!;
  const container = containerRoot.materialized;
  const ownerChoice = context.roots.roots[1]!.materialized;
  if (container.kind !== "selectionEntry" || ownerChoice.kind !== "selectionEntry") throw new Error("Expected entries");
  if (mode === "ambiguous" || mode === "agreeing") {
    // Distinct projected definitions at one source key model an ambiguous resolution.
    const duplicate = { ...containerRoot, materialized: { ...container, occurrence: { ...container.occurrence }, type: mode === "agreeing" ? containerType : ownerType } } as typeof containerRoot;
    context = { ...context, roots: { ...context.roots, roots: [...context.roots.roots, duplicate] } };
  }
  const key = (value: { source: { sourceId: string }; path: readonly string[] }) => rosterDefinitionKeyForSource(value.source.sourceId, value.path);
  let roster = createRoster({ id: rosterId("fiction"), name: "Fiction", catalogue: { kind: "catalogue", key: key(parsed.projection), sourceId: parsed.metadata.id } });
  roster = ok(addRosterForce(roster, { id: forceOccurrenceId("force"), definition: { kind: "forceEntry", key: key(context.forces.definitions[0]!.source) } }));
  const ownerInput = { id: selectionOccurrenceId("owner"), definition: { kind: "selectionEntry" as const, key: key(ownerChoice.occurrence), sourceId: ownerChoice.id! } };
  if (mode === "absent") roster = ok(addRosterSelectionToForce(roster, forceOccurrenceId("force"), ownerInput));
  else {
    roster = ok(addRosterSelectionToForce(roster, forceOccurrenceId("force"), { id: selectionOccurrenceId("container"), definition: { kind: "selectionEntry", key: mode === "missing" ? rosterDefinitionKey("missing") : key(container.occurrence) } }));
    roster = ok(addRosterSelectionToSelection(roster, selectionOccurrenceId("container"), ownerInput));
  }
  const owner = mode === "absent" ? roster.forces[0]!.selections[0]! : roster.forces[0]!.selections[0]!.selections[0]!;
  const constraint = { ...ownerChoice.constraints[0]!, includeChildSelections: mode !== "empty" };
  return { roster, context, owner, constraint };
}

const scopes = ["unit", "model", "model-or-unit", "upgrade"];
describe.each(scopes)("%s constraint context", scope => {
  it.each(["present", "empty", "absent"] as const)("preserves known %s min/max counts", mode => {
    const f = fixture(scope, mode);
    for (const type of ["min", "max"]) {
      const report = ok(inspectRosterSelectionConstraintWithSelectionConditions(f.roster, f.context, f.owner, { ...f.constraint, type, value: 1 }));
      const observed = mode === "present" ? 1 : 0;
      expect(report).toMatchObject({ observed, minimum: observed, maximum: observed, completeness: "complete", status: type === "min" ? observed === 1 ? "satisfied" : "violated" : "satisfied" });
    }
  });
  it.each(["missing", "ambiguous", "missing-type", "unknown-type"] as const)("withholds %s nearest context for min/max", mode => {
    const f = fixture(scope, mode);
    for (const type of ["min", "max"]) {
      const result = inspectRosterSelectionConstraintWithSelectionConditions(f.roster, f.context, f.owner, { ...f.constraint, type, value: 1 });
      expect(ok(result)).toMatchObject({ status: "unresolved", completeness: "incomplete", minimum: 0, maximum: Infinity });
      expect(ok(result).observed).toBeUndefined();
      expect(result.diagnostics.map(d => d.code)).toContain("EVALUATION_CONSTRAINT_SCOPE_UNRESOLVED");
    }
    const all = ok(inspectRosterSelectionConstraintsInRoster(f.roster, f.context, { inspectionScope: "selectionConditions" }));
    expect(all.completeness).toBe("incomplete");
    const bounds = all.selections.flatMap(s => s.constraints);
    expect(bounds.find(b => b.constraint.id === "bound")?.status).toBe("unresolved");
    expect(bounds.find(b => b.constraint.id === "known")).toMatchObject({ status: "violated", observed: 1, completeness: "complete" });
  });
  it("retains an agreeing ambiguous type and does not broaden direct traversal", () => {
    const f = fixture(scope, "agreeing");
    const report = ok(inspectRosterSelectionConstraintWithSelectionConditions(f.roster, f.context, f.owner, f.constraint));
    expect(report).toMatchObject({ observed: 1, status: "violated", completeness: "complete" });
  });
});

it("keeps ID-scoped uncertainty at the same container boundary", () => {
  const f = fixture("beef-cafe", "missing");
  const report = ok(inspectRosterSelectionConstraintWithSelectionConditions(f.roster, f.context, f.owner, f.constraint));
  expect(report).toMatchObject({ status: "unresolved", completeness: "incomplete" });
  expect(report.observed).toBeUndefined();
});

it("does not expose synthetic zero for unsupported scope or traversal envelopes", () => {
  const f = fixture("unit");
  for (const constraint of [
    { ...f.constraint, scope: "ancestor" },
    { ...f.constraint, node: { ...f.constraint.node, attributes: { ...f.constraint.node.attributes, includeChildSelections: "future" } } },
    { ...f.constraint, node: { ...f.constraint.node, children: [{ kind: "element" }] } },
  ]) {
    const report = ok(inspectRosterSelectionConstraintWithSelectionConditions(f.roster, f.context, f.owner, constraint));
    expect(report).toMatchObject({ status: "unresolved", completeness: "incomplete" });
    expect(report.observed).toBeUndefined();
  }
});

it("retains unbounded semantics but not an exact count for unknown context", () => {
  const f = fixture("unit", "missing");
  const report = ok(inspectRosterSelectionConstraintWithSelectionConditions(f.roster, f.context, f.owner, { ...f.constraint, value: -1 }));
  expect(report).toMatchObject({ status: "satisfied", completeness: "incomplete" });
  expect(report.observed).toBeUndefined();
});

it("composes real unresolved and known violated bounds without losing either", () => {
  const f = fixture("unit", "missing");
  const selections = ok(inspectRosterSelectionConstraintsInRoster(f.roster, f.context, { inspectionScope: "selectionConditions" }));
  const structural = { roster: f.roster, context: f.context, bounds: [], validity: "valid" as const, completeness: "complete" as const };
  const composed = ok(composeSupportedRosterValidation(
    structural, selections,
    { roster: f.roster, context: f.context, forces: [], completeness: "complete" } as unknown as Parameters<typeof composeSupportedRosterValidation>[2],
    { roster: f.roster, context: f.context, forces: [], inspectionScope: "conditions", completeness: "complete" },
    { roster: f.roster, context: f.context, errors: [], completeness: "complete" },
    { roster: f.roster, context: f.context, resources: [], completeness: "complete", diagnostics: [] },
  ));
  expect(composed).toMatchObject({ validity: "invalid", completeness: "incomplete", statusCounts: { satisfied: 0, violated: 1, unresolved: 1 } });
});
