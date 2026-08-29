import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
  type BattleScribeForceDefinition,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import {
  addRosterChildForce,
  addRosterForce,
  addRosterSelectionToForce,
  createRoster,
  forceOccurrenceId,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { inspectRosterCategoryConstraintsInRoster } from "./category-constraints.js";
import type { EvaluationSelectionChoice } from "./selection-context.js";

describe("roster category constraints", () => {
  it("reports and satisfies a roster-wide category minimum", () => {
    const context = catalogueContext();
    const empty = rosterWithChildForce(context);

    const emptyReport = inspectRosterCategoryConstraintsInRoster(empty, context);

    expect(emptyReport.ok).toBe(true);
    if (!emptyReport.ok) return;
    expect(emptyReport.diagnostics).toEqual([]);
    const emptyConstraint = emptyReport.value.forces
      .flatMap(({ constraints }) => constraints)
      .find(({ constraint }) => constraint.id === "force-category-min");
    expect(emptyConstraint).toMatchObject({
      categoryId: "category-unit",
      categoryName: "Unit",
      constraintType: "min",
      scope: "roster",
      baseLimit: 1,
      limit: 1,
      observed: 0,
      status: "violated",
      completeness: "complete",
      modifierApplicability: [
        { status: "notApplicable", evaluated: true },
      ],
    });

    const selected = addSelection(
      empty,
      choice(context, "entry-alpha"),
    );
    const selectedReport = inspectRosterCategoryConstraintsInRoster(
      selected,
      context,
    );

    expect(selectedReport.ok).toBe(true);
    if (!selectedReport.ok) return;
    expect(
      selectedReport.value.forces
        .flatMap(({ constraints }) => constraints)
        .find(({ constraint }) => constraint.id === "force-category-min"),
    ).toMatchObject({
      observed: 1,
      status: "satisfied",
      completeness: "complete",
      matching: [{ id: "category-selection" }],
    });
  });
});

function catalogueContext(): BattleScribeCatalogueContext {
  const filenames = ["projection.gst", "cost-evaluation.cat"];
  const graph = resolveBattleScribeDataGraph(filenames.map(parseFixture));
  if (!graph.ok) throw new Error("Fixture graph must resolve.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Fixture contexts must compose.");
  const context = contexts.value.catalogues.find(
    ({ document }) => document.metadata.id === "cost-evaluation",
  );
  if (context === undefined) throw new Error("Missing fixture catalogue.");
  return context;
}

function rosterWithChildForce(context: BattleScribeCatalogueContext): Roster {
  const root = forceDefinition(context, "force-patrol");
  const child = forceDefinition(context, "force-patrol-child");
  let roster = createRoster({
    id: rosterId("category-constraint-roster"),
    name: "Category Constraint Roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("force-root"),
      definition: forceReference(root),
    }),
  );
  return successful(
    addRosterChildForce(roster, forceOccurrenceId("force-root"), {
      id: forceOccurrenceId("force-child"),
      definition: forceReference(child),
    }),
  );
}

function addSelection(
  roster: Roster,
  selected: EvaluationSelectionChoice,
): Roster {
  return successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("force-root"), {
      id: selectionOccurrenceId("category-selection"),
      definition: {
        kind: selected.kind,
        key: projectionKey(selected.occurrence),
        ...(selected.id === undefined ? {} : { sourceId: selected.id }),
      },
    }),
  );
}

function choice(
  context: BattleScribeCatalogueContext,
  id: string,
): EvaluationSelectionChoice {
  const pending = context.roots.roots.map(({ materialized }) => materialized);
  while (pending.length > 0) {
    const selected = pending.shift();
    if (selected === undefined || selected.kind === "unresolvedEntryLink") {
      continue;
    }
    if (selected.id === id) return selected;
    pending.push(
      ...selected.selectionEntries,
      ...selected.selectionEntryGroups,
      ...selected.entryLinks,
    );
  }
  throw new Error(`Missing selection choice ${id}.`);
}

function forceDefinition(
  context: BattleScribeCatalogueContext,
  id: string,
): BattleScribeForceDefinition {
  const pending = [...context.forces.definitions];
  while (pending.length > 0) {
    const definition = pending.shift();
    if (definition === undefined) continue;
    if (definition.source.id === id) return definition;
    pending.push(...definition.forceEntries);
  }
  throw new Error(`Missing force definition ${id}.`);
}

function forceReference(definition: BattleScribeForceDefinition) {
  return {
    kind: "forceEntry" as const,
    key: projectionKey(definition.source),
    ...(definition.source.id === undefined
      ? {}
      : { sourceId: definition.source.id }),
  };
}

function projectionKey(source: {
  readonly source: { readonly sourceId: string };
  readonly path: readonly string[];
}) {
  return rosterDefinitionKeyForSource(source.source.sourceId, source.path);
}

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) throw new Error(`Fixture ${filename} must parse.`);
  return parsed.value;
}

function successful<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
}): T {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected operation to succeed.");
  }
  return result.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-08-28T00:00:00.000Z",
  };
}
