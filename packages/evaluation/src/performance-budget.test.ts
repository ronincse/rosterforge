/**
 * Deterministic work budget for the whole-roster reports run after an edit.
 *
 * This lives beside the evaluation internals so it can count indexed choice
 * resolution without exporting performance instrumentation to consumers.
 */

import { describe, expect, it, vi } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
} from "@rosterforge/data-graph";
import {
  sourceId,
  type SourceFileProvenance,
} from "@rosterforge/foundation";
import {
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
  createRoster,
  forceOccurrenceId,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { inspectRosterSelectionConstraintsInRoster } from "./constraints.js";
import { evaluateRosterCostsWithSelectionConditions } from "./costs.js";
import { inspectRosterForceConstraintsInRoster } from "./force-constraints.js";
import {
  indexEvaluationChoices,
  type EvaluationSelectionChoice,
} from "./selection-context.js";
import { inspectEmptySingleForceRosterStructuralStatus } from "./structural-status.js";

describe("whole-roster evaluation work budget", () => {
  it("bounds indexed choice resolution for a representative workspace pass", () => {
    const context = fixtureContext();
    const roster = representativeRoster(context);
    const choiceIndex = indexEvaluationChoices(context);
    const lookup = vi.spyOn(choiceIndex.byKey, "get");

    const costs = evaluateRosterCostsWithSelectionConditions(roster, context);
    const structural = inspectEmptySingleForceRosterStructuralStatus(
      roster,
      context,
    );
    const selections = inspectRosterSelectionConstraintsInRoster(
      roster,
      context,
      { inspectionScope: "selectionConditions" },
    );
    const forces = inspectRosterForceConstraintsInRoster(roster, context, {
      inspectionScope: "conditions",
    });
    const indexedChoiceLookups = lookup.mock.calls.length;
    lookup.mockRestore();

    expect(costs.ok).toBe(true);
    expect(structural.ok).toBe(true);
    expect(selections.ok).toBe(true);
    expect(forces.ok).toBe(true);

    // Count work, not wall time: runner load cannot make this budget flaky.
    // The separate identity guards prove the catalogue index and roster walk
    // caches survive; this catches a report adding excessive indexed
    // resolution requests while those lower-level caches still exist.
    expect(indexedChoiceLookups).toBeLessThanOrEqual(20_000);
  });
});

function representativeRoster(context: BattleScribeCatalogueContext): Roster {
  const force = context.forces.definitions.find(
    ({ source }) => source.id === "force-local",
  );
  if (force === undefined) throw new Error("Expected the local force.");
  const root = choice(context, "entry-alpha");
  const option = choice(context, "entry-option");
  let roster = createRoster({
    id: rosterId("evaluation-performance-budget"),
    name: "Evaluation Performance Budget",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("force-performance-budget"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined
          ? {}
          : { sourceId: force.source.id }),
      },
    }),
  );

  // Fifteen units with eight nested choices each gives 135 selection
  // occurrences, close to the 143-selection roster used to diagnose the
  // original regression while remaining fully synthetic and deterministic.
  for (let rootIndex = 0; rootIndex < 15; rootIndex += 1) {
    const rootId = selectionOccurrenceId(`performance-root-${rootIndex}`);
    roster = successful(
      addRosterSelectionToForce(
        roster,
        forceOccurrenceId("force-performance-budget"),
        {
          id: rootId,
          definition: selectionReference(root),
        },
      ),
    );
    for (let childIndex = 0; childIndex < 8; childIndex += 1) {
      roster = successful(
        addRosterSelectionToSelection(roster, rootId, {
          id: selectionOccurrenceId(
            `performance-option-${rootIndex}-${childIndex}`,
          ),
          definition: selectionReference(option),
        }),
      );
    }
  }
  return roster;
}

function fixtureContext(): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("projection.cat"),
  ]);
  if (!graph.ok) throw new Error("Expected fixture graph.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Expected fixture contexts.");
  const context = contexts.value.catalogues.find(
    ({ document }) => document.metadata.id === "catalogue-203",
  );
  if (context === undefined) throw new Error("Expected fixture context.");
  return context;
}

function choice(
  context: BattleScribeCatalogueContext,
  id: string,
): EvaluationSelectionChoice {
  const pending = context.roots.roots.map((root) => root.materialized);
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

function selectionReference(selected: EvaluationSelectionChoice) {
  return {
    kind: selected.kind,
    key: projectionKey(selected.occurrence),
    ...(selected.id === undefined ? {} : { sourceId: selected.id }),
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
  if (!parsed.ok) throw new Error(`Expected fixture ${filename} to parse.`);
  return parsed.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-08-24T00:00:00.000Z",
  };
}

function successful<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
}): T {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected roster operation to succeed.");
  }
  return result.value;
}
