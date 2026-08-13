import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
  type BattleScribeCatalogueContexts,
  type MaterializedSelectionEntry,
  type MaterializedSelectionEntryGroup,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import {
  addRosterForce,
  addRosterSelectionToForce,
  forceOccurrenceId,
  reparentRosterSelection,
  rosterDefinitionKey,
  rosterId,
  selectionOccurrenceId,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { inspectRosterCompatibility } from "./compatibility.js";
import {
  addRosterChildForceFromCatalogueContext,
  addRosterForceFromCatalogueContext,
  addRosterSelectionToForceFromCatalogueContext,
  addRosterSelectionToSelectionFromCatalogueContext,
  createRosterFromCatalogueContext,
  replaceRosterForceDefinitionFromCatalogueContext,
  replaceRosterSelectionDefinitionFromCatalogueContext,
  rosterForceDefinitionReference,
  rosterSelectionDefinitionReference,
} from "./references.js";

describe("roster catalogue compatibility", () => {
  it("reports directly compatible force and selection relationships", () => {
    const context = catalogueContext(projectionContexts(), "catalogue-203");
    const initial = createRosterFromCatalogueContext(context, {
      id: rosterId("roster-1"),
      name: "Compatible",
    });
    const withForce = successful(
      addRosterForceFromCatalogueContext(
        initial,
        context,
        forceDefinition(context, "force-patrol"),
        { id: forceOccurrenceId("force-1") },
      ),
    );
    const withChildForce = successful(
      addRosterChildForceFromCatalogueContext(
        withForce,
        context,
        forceOccurrenceId("force-1"),
        forceDefinition(context, "force-patrol-child"),
        { id: forceOccurrenceId("force-child") },
      ),
    );
    const withSelection = successful(
      addRosterSelectionToForceFromCatalogueContext(
        withChildForce,
        context,
        forceOccurrenceId("force-1"),
        selectionChoice(context, "entry-alpha"),
        { id: selectionOccurrenceId("selection-1") },
      ),
    );
    const withGroup = successful(
      addRosterSelectionToSelectionFromCatalogueContext(
        withSelection,
        context,
        selectionOccurrenceId("selection-1"),
        selectionGroupChoice(context, "group-options"),
        { id: selectionOccurrenceId("selection-group") },
      ),
    );
    const roster = successful(
      addRosterSelectionToSelectionFromCatalogueContext(
        withGroup,
        context,
        selectionOccurrenceId("selection-group"),
        selectionChoice(context, "entry-option"),
        { id: selectionOccurrenceId("selection-child") },
      ),
    );

    const inspected = inspectRosterCompatibility(roster, context);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics).toEqual([]);
    expect(inspected.value.roster).toBe(roster);
    expect(inspected.value.context).toBe(context);
    expect(inspected.value.catalogueStatus).toBe("matching");
    expect(inspected.value.forces[0]).toMatchObject({
      definitionStatus: "available",
      parentStatus: "compatible",
      forces: [
        {
          definitionStatus: "available",
          parentStatus: "compatible",
        },
      ],
      selections: [
        {
          definitionStatus: "available",
          parentStatus: "compatible",
          selections: [
            {
              definitionStatus: "available",
              parentStatus: "compatible",
              selections: [
                {
                  definitionStatus: "available",
                  parentStatus: "compatible",
                },
              ],
            },
          ],
        },
      ],
    });
    expect(inspected.value.forces[0]?.definitions[0]).toBe(
      forceDefinition(context, "force-patrol"),
    );
  });

  it("diagnoses available definitions beneath incompatible parents", () => {
    const context = catalogueContext(projectionContexts(), "catalogue-203");
    const initial = createRosterFromCatalogueContext(context, {
      id: rosterId("roster-1"),
      name: "Misplaced",
    });
    const withForce = successful(
      addRosterForceFromCatalogueContext(
        initial,
        context,
        forceDefinition(context, "force-local"),
        { id: forceOccurrenceId("force-1") },
      ),
    );
    const withMisplacedForce = successful(
      addRosterChildForceFromCatalogueContext(
        withForce,
        context,
        forceOccurrenceId("force-1"),
        forceDefinition(context, "force-patrol-child"),
        { id: forceOccurrenceId("force-child") },
      ),
    );
    const withSelection = successful(
      addRosterSelectionToForceFromCatalogueContext(
        withMisplacedForce,
        context,
        forceOccurrenceId("force-1"),
        selectionChoice(context, "entry-alpha"),
        { id: selectionOccurrenceId("selection-1") },
      ),
    );
    const nestedSelection = successful(
      addRosterSelectionToSelectionFromCatalogueContext(
        withSelection,
        context,
        selectionOccurrenceId("selection-1"),
        selectionChoice(context, "entry-option"),
        { id: selectionOccurrenceId("selection-child") },
      ),
    );
    const roster = successful(
      reparentRosterSelection(
        nestedSelection,
        selectionOccurrenceId("selection-child"),
        {
          kind: "force",
          parentId: forceOccurrenceId("force-1"),
          index: 1,
        },
      ),
    );

    const inspected = inspectRosterCompatibility(roster, context);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "ROSTER_COMPATIBILITY_FORCE_PARENT_MISMATCH",
      "ROSTER_COMPATIBILITY_SELECTION_PARENT_MISMATCH",
    ]);
    expect(inspected.value.forces[0]?.forces[0]).toMatchObject({
      definitionStatus: "available",
      parentStatus: "incompatible",
    });
    expect(inspected.value.forces[0]?.selections[1]).toMatchObject({
      definitionStatus: "available",
      parentStatus: "incompatible",
    });
    expect(Object.hasOwn(roster, "validity")).toBe(false);
    expect(Object.hasOwn(inspected.value, "validity")).toBe(false);
  });

  it("preserves occurrence state while replacement exposes stale relationships", () => {
    const context = catalogueContext(projectionContexts(), "catalogue-203");
    const roster = compatibleRoster(context);
    const originalForce = roster.forces[0];
    const originalSelection = originalForce?.selections[0];
    const localForce = forceDefinition(context, "force-local");
    const option = selectionChoice(context, "entry-option");
    const replacedForce = successful(
      replaceRosterForceDefinitionFromCatalogueContext(
        roster,
        context,
        forceOccurrenceId("force-1"),
        localForce,
      ),
    );
    const replaced = successful(
      replaceRosterSelectionDefinitionFromCatalogueContext(
        replacedForce,
        context,
        selectionOccurrenceId("selection-1"),
        option,
      ),
    );

    expect(replaced.forces[0]).toMatchObject({
      id: "force-1",
      name: "Patrol",
      forces: [{ id: "force-child" }],
    });
    expect(replaced.forces[0]?.definition).toEqual(
      rosterForceDefinitionReference(localForce),
    );
    expect(replaced.forces[0]?.forces).toBe(originalForce?.forces);
    expect(replaced.forces[0]?.selections[0]).toMatchObject({
      id: "selection-1",
      name: "Alpha",
      selections: [{ id: "selection-group" }],
    });
    expect(replaced.forces[0]?.selections[0]?.definition).toEqual(
      rosterSelectionDefinitionReference(option),
    );
    expect(replaced.forces[0]?.selections[0]?.selections).toBe(
      originalSelection?.selections,
    );

    const inspected = inspectRosterCompatibility(replaced, context);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "ROSTER_COMPATIBILITY_FORCE_PARENT_MISMATCH",
      "ROSTER_COMPATIBILITY_SELECTION_PARENT_MISMATCH",
      "ROSTER_COMPATIBILITY_SELECTION_PARENT_MISMATCH",
    ]);
    expect(inspected.value.forces[0]).toMatchObject({
      definitionStatus: "available",
      parentStatus: "compatible",
      forces: [{ parentStatus: "incompatible" }],
      selections: [
        {
          definitionStatus: "available",
          parentStatus: "incompatible",
          selections: [{ parentStatus: "incompatible" }],
        },
      ],
    });
  });

  it("reports unavailable definitions without cascading parent claims", () => {
    const context = catalogueContext(projectionContexts(), "catalogue-203");
    const initial = createRosterFromCatalogueContext(context, {
      id: rosterId("roster-1"),
      name: "Unknown",
    });
    const withForce = successful(
      addRosterForce(initial, {
        id: forceOccurrenceId("force-unknown"),
        definition: {
          kind: "forceEntry",
          key: rosterDefinitionKey("unknown:force"),
        },
      }),
    );
    const roster = successful(
      addRosterSelectionToForce(
        withForce,
        forceOccurrenceId("force-unknown"),
        {
          id: selectionOccurrenceId("selection-unknown"),
          definition: {
            kind: "selectionEntry",
            key: rosterDefinitionKey("unknown:selection"),
          },
        },
      ),
    );

    const inspected = inspectRosterCompatibility(roster, context);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "ROSTER_COMPATIBILITY_FORCE_NOT_AVAILABLE",
      "ROSTER_COMPATIBILITY_SELECTION_NOT_AVAILABLE",
    ]);
    expect(inspected.value.forces[0]).toMatchObject({
      definitions: [],
      definitionStatus: "unavailable",
      parentStatus: "unresolved",
      selections: [
        {
          choices: [],
          definitionStatus: "unavailable",
          parentStatus: "unresolved",
        },
      ],
    });
  });

  it("keeps missing selections unresolved in a partial context", () => {
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
    const completeContext = catalogueContext(
      complete.value,
      "visibility-primary",
    );
    const limitedContext = catalogueContext(
      limited.value,
      "visibility-primary",
    );
    const linkedChoice = selectionChoice(completeContext, "leaf-link");
    const initial = createRosterFromCatalogueContext(limitedContext, {
      id: rosterId("roster-partial"),
      name: "Partial",
    });
    const withForce = successful(
      addRosterForceFromCatalogueContext(
        initial,
        limitedContext,
        forceDefinition(limitedContext, "force-patrol"),
        { id: forceOccurrenceId("force-1") },
      ),
    );
    const roster = successful(
      addRosterSelectionToForce(withForce, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-limited"),
        definition: rosterSelectionDefinitionReference(linkedChoice),
      }),
    );

    const inspected = inspectRosterCompatibility(roster, limitedContext);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "ROSTER_COMPATIBILITY_SELECTION_UNRESOLVED",
      }),
    ]);
    expect(inspected.value.forces[0]?.selections[0]).toMatchObject({
      choices: [],
      definitionStatus: "unresolved",
      parentStatus: "unresolved",
    });
  });

  it("short-circuits occurrence claims for a different catalogue", () => {
    const contexts = projectionContexts();
    const catalogue = catalogueContext(contexts, "catalogue-203");
    const library = catalogueContext(contexts, "library-first");
    const initial = createRosterFromCatalogueContext(catalogue, {
      id: rosterId("roster-1"),
      name: "Catalogue",
    });
    const roster = successful(
      addRosterForceFromCatalogueContext(
        initial,
        catalogue,
        forceDefinition(catalogue, "force-local"),
        { id: forceOccurrenceId("force-1") },
      ),
    );

    const inspected = inspectRosterCompatibility(roster, library);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "ROSTER_COMPATIBILITY_CATALOGUE_MISMATCH",
      }),
    ]);
    expect(inspected.value.catalogueStatus).toBe("mismatch");
    expect(inspected.value.forces[0]).toMatchObject({
      definitionStatus: "unresolved",
      parentStatus: "unresolved",
    });
    expect(inspected.value.roster).toBe(roster);
  });
});

function projectionContexts() {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("projection.cat"),
    parseFixture("graph-library.cat"),
  ]);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Projection graph must resolve.");
  }
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  expect(contexts.ok).toBe(true);
  if (!contexts.ok) {
    throw new Error("Projection contexts must compose.");
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

function compatibleRoster(context: BattleScribeCatalogueContext) {
  const initial = createRosterFromCatalogueContext(context, {
    id: rosterId("roster-replacement"),
    name: "Replacement",
  });
  const withForce = successful(
    addRosterForceFromCatalogueContext(
      initial,
      context,
      forceDefinition(context, "force-patrol"),
      { id: forceOccurrenceId("force-1") },
    ),
  );
  const withChildForce = successful(
    addRosterChildForceFromCatalogueContext(
      withForce,
      context,
      forceOccurrenceId("force-1"),
      forceDefinition(context, "force-patrol-child"),
      { id: forceOccurrenceId("force-child") },
    ),
  );
  const withSelection = successful(
    addRosterSelectionToForceFromCatalogueContext(
      withChildForce,
      context,
      forceOccurrenceId("force-1"),
      selectionChoice(context, "entry-alpha"),
      { id: selectionOccurrenceId("selection-1") },
    ),
  );
  const withGroup = successful(
    addRosterSelectionToSelectionFromCatalogueContext(
      withSelection,
      context,
      selectionOccurrenceId("selection-1"),
      selectionGroupChoice(context, "group-options"),
      { id: selectionOccurrenceId("selection-group") },
    ),
  );
  return successful(
    addRosterSelectionToSelectionFromCatalogueContext(
      withGroup,
      context,
      selectionOccurrenceId("selection-group"),
      selectionChoice(context, "entry-option"),
      { id: selectionOccurrenceId("selection-child") },
    ),
  );
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

function selectionGroupChoice(
  context: BattleScribeCatalogueContext,
  id: string,
): MaterializedSelectionEntryGroup {
  const pending = context.roots.roots.map((root) => root.materialized);
  while (pending.length > 0) {
    const choice = pending.shift();
    if (choice === undefined || choice.kind === "unresolvedEntryLink") {
      continue;
    }
    if (choice.id === id) {
      if (choice.kind !== "selectionEntryGroup") {
        throw new Error(`Selection choice ${id} is not a group.`);
      }
      return choice;
    }
    pending.push(
      ...choice.selectionEntries,
      ...choice.selectionEntryGroups,
      ...choice.entryLinks,
    );
  }
  throw new Error(`Missing selection group ${id}.`);
}

function successful<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
}): T {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected roster command to succeed.");
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
