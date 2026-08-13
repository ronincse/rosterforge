import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
  type BattleScribeCatalogueContexts,
  type MaterializedSelectionEntry,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  addRosterChildForceFromCatalogueContext,
  addRosterForceFromCatalogueContext,
  addRosterSelectionToForceFromCatalogueContext,
  addRosterSelectionToSelectionFromCatalogueContext,
  createRosterFromCatalogueContext,
  rosterCatalogueReference,
  rosterForceDefinitionReference,
  rosterSelectionDefinitionReference,
} from "./references.js";

describe("BattleScribe roster builder", () => {
  it("derives stable source-path references and creates an empty roster", () => {
    const { contexts, catalogue } = projectionContexts();
    const context = catalogueContext(contexts, "catalogue-203");

    const reference = rosterCatalogueReference(context);
    const roster = createRosterFromCatalogueContext(context, {
      id: rosterId("roster-1"),
      name: "Context Roster",
    });

    expect(reference).toEqual({
      kind: "catalogue",
      key: JSON.stringify(["fixture:projection.cat", "catalogue"]),
      sourceId: "catalogue-203",
    });
    expect(roster.catalogue).toEqual(reference);
    expect(context.document).toBe(catalogue);
    expect(roster.forces).toEqual([]);
  });

  it("adds context forces and nested visible selections with effective names", () => {
    const { contexts } = projectionContexts();
    const context = catalogueContext(contexts, "catalogue-203");
    const localForce = forceDefinition(context, "force-local");
    const childForce = forceDefinition(context, "force-patrol-child");
    const rootChoice = selectionChoice(context, "entry-alpha");
    const nestedChoice = selectionChoice(context, "entry-option");
    const initial = createRosterFromCatalogueContext(context, {
      id: rosterId("roster-1"),
      name: "Roster",
    });

    const withForce = successful(
      addRosterForceFromCatalogueContext(initial, context, localForce, {
        id: forceOccurrenceId("force-1"),
      }),
    );
    const withChildForce = successful(
      addRosterChildForceFromCatalogueContext(
        withForce,
        context,
        forceOccurrenceId("force-1"),
        childForce,
        { id: forceOccurrenceId("force-child"), name: "" },
      ),
    );
    const withRootSelection = successful(
      addRosterSelectionToForceFromCatalogueContext(
        withChildForce,
        context,
        forceOccurrenceId("force-1"),
        rootChoice,
        { id: selectionOccurrenceId("selection-1"), amount: 2.5 },
      ),
    );
    const withNestedSelection = successful(
      addRosterSelectionToSelectionFromCatalogueContext(
        withRootSelection,
        context,
        selectionOccurrenceId("selection-1"),
        nestedChoice,
        { id: selectionOccurrenceId("selection-child") },
      ),
    );

    expect(withNestedSelection.forces[0]).toMatchObject({
      name: "Local Force",
      forces: [{ id: "force-child", name: "" }],
      selections: [
        {
          id: "selection-1",
          name: "Alpha",
          amount: 2.5,
          selections: [{ id: "selection-child", name: "Option" }],
        },
      ],
    });
    expect(withNestedSelection.forces[0]?.definition).toEqual(
      rosterForceDefinitionReference(localForce),
    );
    expect(
      withNestedSelection.forces[0]?.selections[0]?.definition,
    ).toEqual(rosterSelectionDefinitionReference(rootChoice));
  });

  it("rejects catalogue mismatches and force definitions absent from a context", () => {
    const { contexts } = projectionContexts();
    const catalogue = catalogueContext(contexts, "catalogue-203");
    const library = catalogueContext(contexts, "library-first");
    const localForce = forceDefinition(catalogue, "force-local");
    const libraryForce = forceDefinition(library, "force-library");
    const roster = createRosterFromCatalogueContext(catalogue, {
      id: rosterId("roster-1"),
      name: "Roster",
    });

    expect(
      addRosterForceFromCatalogueContext(roster, library, libraryForce, {
        id: forceOccurrenceId("force-1"),
      }),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_BUILDER_CATALOGUE_CONTEXT_MISMATCH",
        }),
      ],
    });

    const libraryRoster = createRosterFromCatalogueContext(library, {
      id: rosterId("roster-library"),
      name: "Library Roster",
    });
    expect(
      addRosterForceFromCatalogueContext(
        libraryRoster,
        library,
        localForce,
        { id: forceOccurrenceId("force-1") },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_BUILDER_FORCE_NOT_AVAILABLE" }),
      ],
    });
  });

  it("rejects selection choices absent from the target catalogue", () => {
    const contexts = visibilityContexts();
    const primary = catalogueContext(contexts, "visibility-primary");
    const leaf = catalogueContext(contexts, "visibility-leaf");
    const primaryOnly = selectionChoice(primary, "primary-false");
    const roster = createRosterFromCatalogueContext(leaf, {
      id: rosterId("roster-leaf"),
      name: "Leaf",
    });
    const withForce = successful(
      addRosterForceFromCatalogueContext(
        roster,
        leaf,
        forceDefinition(leaf, "force-patrol"),
        { id: forceOccurrenceId("force-1") },
      ),
    );

    expect(
      addRosterSelectionToForceFromCatalogueContext(
        withForce,
        leaf,
        forceOccurrenceId("force-1"),
        primaryOnly,
        { id: selectionOccurrenceId("selection-1") },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_BUILDER_SELECTION_NOT_AVAILABLE",
        }),
      ],
    });
  });

  it("does not accept a choice hidden by partial materialization", () => {
    const documents = visibilityDocuments();
    const graph = resolveBattleScribeDataGraph(documents);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const complete = composeBattleScribeCatalogueContexts(graph.value);
    const limited = composeBattleScribeCatalogueContexts(graph.value, {
      limits: { maxEntryLinkDepth: 64, maxExpandedEntryLinks: 1 },
    });
    expect(complete.ok).toBe(true);
    expect(limited.ok).toBe(true);
    if (!complete.ok || !limited.ok) {
      return;
    }
    const completePrimary = catalogueContext(
      complete.value,
      "visibility-primary",
    );
    const limitedPrimary = catalogueContext(
      limited.value,
      "visibility-primary",
    );
    const linkedChoice = selectionChoice(completePrimary, "leaf-link");
    const roster = createRosterFromCatalogueContext(limitedPrimary, {
      id: rosterId("roster-limited"),
      name: "Limited",
    });
    const withForce = successful(
      addRosterForceFromCatalogueContext(
        roster,
        limitedPrimary,
        forceDefinition(limitedPrimary, "force-patrol"),
        { id: forceOccurrenceId("force-1") },
      ),
    );

    expect(
      addRosterSelectionToForceFromCatalogueContext(
        withForce,
        limitedPrimary,
        forceOccurrenceId("force-1"),
        linkedChoice,
        { id: selectionOccurrenceId("selection-1") },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_BUILDER_SELECTION_NOT_AVAILABLE",
        }),
      ],
    });
  });

  it("propagates roster occurrence errors without evaluating legality", () => {
    const { contexts } = projectionContexts();
    const context = catalogueContext(contexts, "catalogue-203");
    const force = forceDefinition(context, "force-patrol");
    const roster = createRosterFromCatalogueContext(context, {
      id: rosterId("roster-1"),
      name: "Roster",
    });
    const first = successful(
      addRosterForceFromCatalogueContext(roster, context, force, {
        id: forceOccurrenceId("force-1"),
      }),
    );
    const duplicate = addRosterForceFromCatalogueContext(
      first,
      context,
      force,
      { id: forceOccurrenceId("force-1") },
    );

    expect(duplicate).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_DUPLICATE_FORCE_ID" }),
      ],
    });
    expect(Object.hasOwn(first, "validity")).toBe(false);
    expect(Object.hasOwn(first, "costs")).toBe(false);
  });
});

function projectionContexts() {
  const documents = [
    parseFixture("projection.gst"),
    parseFixture("projection.cat"),
    parseFixture("graph-library.cat"),
  ];
  const graph = resolveBattleScribeDataGraph(documents);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Projection graph must resolve.");
  }
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  expect(contexts.ok).toBe(true);
  if (!contexts.ok) {
    throw new Error("Projection contexts must compose.");
  }
  return {
    contexts: contexts.value,
    catalogue: documents[1],
  };
}

function visibilityContexts() {
  const graph = resolveBattleScribeDataGraph(visibilityDocuments());
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Visibility graph must resolve.");
  }
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  expect(contexts.ok).toBe(true);
  if (!contexts.ok) {
    throw new Error("Visibility contexts must compose.");
  }
  return contexts.value;
}

function visibilityDocuments() {
  return [
    "projection.gst",
    "visibility-primary.cat",
    "visibility-branch.cat",
    "visibility-leaf.cat",
  ].map(parseFixture);
}

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) {
    throw new Error(`Fixture ${filename} must parse.`);
  }
  return parsed.value;
}

function catalogueContext(
  contexts: BattleScribeCatalogueContexts,
  id: string,
): BattleScribeCatalogueContext {
  const context = contexts.catalogues.find(
    (candidate) => candidate.document.metadata.id === id,
  );
  if (context === undefined) {
    throw new Error(`Missing catalogue context ${id}.`);
  }
  return context;
}

function forceDefinition(context: BattleScribeCatalogueContext, id: string) {
  const pending = [...context.forces.definitions];
  while (pending.length > 0) {
    const definition = pending.shift();
    if (definition?.source.id === id) {
      return definition;
    }
    if (definition !== undefined) {
      pending.push(...definition.forceEntries);
    }
  }
  throw new Error(`Missing force definition ${id}.`);
}

function selectionChoice(
  context: BattleScribeCatalogueContext,
  id: string,
): MaterializedSelectionEntry {
  const pending = context.roots.roots.map((root) => root.materialized);
  while (pending.length > 0) {
    const choice = pending.shift();
    if (choice === undefined || choice.kind === "unresolvedEntryLink") {
      continue;
    }
    if (choice.id === id) {
      if (choice.kind !== "selectionEntry") {
        throw new Error(`Selection choice ${id} is not an entry.`);
      }
      return choice;
    }
    pending.push(
      ...choice.selectionEntries,
      ...choice.selectionEntryGroups,
      ...choice.entryLinks,
    );
  }
  throw new Error(`Missing selection choice ${id}.`);
}

function successful<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
}): T {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected roster builder command to succeed.");
  }
  return result.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-20T00:00:00.000Z",
  };
}
