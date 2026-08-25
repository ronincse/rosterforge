import { describe, expect, it } from "vitest";

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
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
  type RosterSelection,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import type { EvaluationSelectionChoice } from "./selection-context.js";
import {
  inspectEmptySingleForceRosterStructuralStatus,
  type RosterStructuralBoundReport,
} from "./structural-status.js";

describe("empty single-force roster structural status", () => {
  it("reports known violations independently from incomplete bounds", () => {
    const fixture = structuralFixture();
    const roster = fixtureRoster(fixture, { includeManualChoice: false });

    const inspected = inspectEmptySingleForceRosterStructuralStatus(
      roster,
      fixture.context,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value).toMatchObject({
      validity: "invalid",
      completeness: "incomplete",
    });
    expect(
      inspected.value.bounds.map((bound) => ({
        kind: bound.kind,
        name: boundName(bound),
        selectedCount: bound.selectedCount,
        status: bound.status,
        completeness: bound.completeness,
      })),
    ).toEqual([
      {
        kind: "root",
        name: "Initialization Unit",
        selectedCount: 1,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "root",
        name: "Disabled Automatic Root",
        selectedCount: 0,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "root",
        name: "Duplicate Initialization Unit",
        selectedCount: 1,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "root",
        name: "Alpha",
        selectedCount: 0,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "direct",
        name: "Required Model",
        selectedCount: 2,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "direct",
        name: "Modified Child",
        selectedCount: 0,
        status: "unresolved",
        completeness: "incomplete",
      },
      {
        kind: "group",
        name: "Default Group",
        selectedCount: 1,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "group",
        name: "Manual Group",
        selectedCount: 0,
        status: "violated",
        completeness: "complete",
      },
      {
        kind: "direct",
        name: "Required Weapon",
        selectedCount: 1,
        status: "satisfied",
        completeness: "complete",
      },
      {
        kind: "direct",
        name: "Required Weapon",
        selectedCount: 1,
        status: "satisfied",
        completeness: "complete",
      },
    ]);
  });

  it("becomes structurally valid when all supported bounds are satisfied", () => {
    const fixture = structuralFixture();
    const roster = fixtureRoster(fixture, { includeManualChoice: true });

    const inspected = inspectEmptySingleForceRosterStructuralStatus(
      roster,
      fixture.context,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value.validity).toBe("valid");
    expect(inspected.value.completeness).toBe("incomplete");
    expect(
      inspected.value.bounds.filter(
        ({ status }) => status === "violated",
      ),
    ).toEqual([]);
    expect(
      inspected.value.bounds.find(
        (bound) => boundName(bound) === "Manual Group",
      ),
    ).toMatchObject({
      selectedCount: 1,
      possibleSelectedCount: 1,
      status: "satisfied",
      completeness: "complete",
    });
  });

  it("reports supported missing and excess selections as invalid", () => {
    const fixture = structuralFixture();
    const base = fixtureRoster(fixture, { includeManualChoice: true });
    const force = base.forces[0]!;
    const root = force.selections[0]!;
    const withoutRequiredModel: Roster = {
      ...base,
      forces: [
        {
          ...force,
          selections: [
            {
              ...root,
              selections: root.selections.filter(
                ({ definition }) =>
                  definition.sourceId !== fixture.requiredModel.id,
              ),
            },
          ],
        },
      ],
    };
    const missing = inspectEmptySingleForceRosterStructuralStatus(
      withoutRequiredModel,
      fixture.context,
    );
    const duplicateRoot = inspectEmptySingleForceRosterStructuralStatus(
      {
        ...base,
        forces: [
          {
            ...force,
            selections: [
              ...force.selections,
              selection("root-copy", fixture.rootChoice),
            ],
          },
        ],
      },
      fixture.context,
    );

    expect(missing.ok).toBe(true);
    expect(duplicateRoot.ok).toBe(true);
    if (!missing.ok || !duplicateRoot.ok) return;
    expect(missing.value.validity).toBe("invalid");
    expect(
      missing.value.bounds.find(
        (bound) => boundName(bound) === "Required Model",
      ),
    ).toMatchObject({
      selectedCount: 0,
      status: "violated",
    });
    expect(duplicateRoot.value.validity).toBe("invalid");
    expect(
      duplicateRoot.value.bounds.filter(
        ({ kind, status }) =>
          kind === "root" && status === "violated",
      ),
    ).toHaveLength(2);
  });

  it("keeps uncertain references incomplete instead of inventing violations", () => {
    const fixture = structuralFixture();
    const base = fixtureRoster(fixture, { includeManualChoice: false });
    const force = base.forces[0]!;
    const root = force.selections[0]!;
    const requiredModels = root.selections.filter(
      ({ definition }) =>
        definition.sourceId === fixture.requiredModel.id,
    );
    const uncertainChild: RosterSelection = {
      id: selectionOccurrenceId("uncertain-child"),
      definition: {
        kind: "selectionEntry",
        key: rosterDefinitionKey("missing-choice"),
      },
      selections: [],
    };
    const roster: Roster = {
      ...base,
      forces: [
        {
          ...force,
          selections: [
            {
              ...root,
              selections: [
                requiredModels[0]!,
                uncertainChild,
                ...root.selections.filter(
                  ({ definition }) =>
                    definition.sourceId !== fixture.requiredModel.id,
                ),
              ],
            },
          ],
        },
      ],
    };

    const inspected = inspectEmptySingleForceRosterStructuralStatus(
      roster,
      fixture.context,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value).toMatchObject({
      validity: "valid",
      completeness: "incomplete",
    });
    expect(
      inspected.value.bounds.find(
        (bound) => boundName(bound) === "Required Model",
      ),
    ).toMatchObject({
      selectedCount: 1,
      possibleSelectedCount: 2,
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(inspected.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EVALUATION_STRUCTURAL_STATUS_SELECTION_UNRESOLVED",
          impacts: ["validation", "compatibility"],
          details: expect.objectContaining({
            selectionId: "uncertain-child",
          }),
        }),
      ]),
    );
  });

  it("does not promote inactive roots with unknown bounds into findings", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("structural-inactive-root.cat"),
    ]);
    if (!graph.ok) throw new Error("Expected inactive-root fixture graph.");
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) {
      throw new Error("Expected inactive-root fixture contexts.");
    }
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "structural-inactive-root",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "conditional-optional-root",
    );
    if (
      context === undefined ||
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink"
    ) {
      throw new Error("Expected conditional optional root.");
    }
    const roster: Roster = {
      id: rosterId("inactive-root-roster"),
      name: "Inactive root roster",
      catalogue: {
        kind: "catalogue",
        key: rosterDefinitionKeyForSource(
          context.document.projection.source.sourceId,
          context.document.projection.path,
        ),
        sourceId: context.document.metadata.id,
      },
      forces: [
        {
          id: forceOccurrenceId("inactive-root-force"),
          definition: {
            kind: "forceEntry",
            key: rosterDefinitionKey("structural-inactive-force"),
          },
          forces: [],
          selections: [],
        },
      ],
    };

    const inactive = inspectEmptySingleForceRosterStructuralStatus(
      roster,
      context,
    );
    const selected = inspectEmptySingleForceRosterStructuralStatus(
      {
        ...roster,
        forces: [
          {
            ...roster.forces[0]!,
            selections: [selection("conditional-root", root.materialized)],
          },
        ],
      },
      context,
    );

    expect(inactive.ok).toBe(true);
    expect(selected.ok).toBe(true);
    if (!inactive.ok || !selected.ok) return;
    expect(inactive.value).toMatchObject({
      validity: "valid",
      completeness: "complete",
    });
    expect(
      inactive.value.bounds.find(
        (bound) => boundName(bound) === "Conditional Optional Root",
      ),
    ).toBeUndefined();
    expect(inactive.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED",
          details: {
            roots: 1,
            suppressedDiagnostics: 1,
          },
        }),
      ]),
    );
    expect(
      selected.value.bounds.find(
        (bound) => boundName(bound) === "Conditional Optional Root",
      ),
    ).toMatchObject({
      kind: "root",
      selectedCount: 1,
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(selected.value).toMatchObject({
      validity: "valid",
      completeness: "incomplete",
    });
    expect(selected.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code:
            "EVALUATION_ROOT_INITIALIZATION_CONDITIONAL_MODIFIERS_UNSUPPORTED",
          location: expect.objectContaining({
            source: expect.objectContaining({
              filename: "structural-inactive-root.cat",
            }),
          }),
        }),
      ]),
    );
  });

  it("does not enforce groups hidden for the containing force", () => {
    const graph = resolveBattleScribeDataGraph([
      parseFixture("projection.gst"),
      parseFixture("conditional-visibility.cat"),
    ]);
    if (!graph.ok) {
      throw new Error("Expected conditional-visibility fixture graph.");
    }
    const contexts = composeBattleScribeCatalogueContexts(graph.value);
    if (!contexts.ok) {
      throw new Error("Expected conditional-visibility contexts.");
    }
    const context = contexts.value.catalogues.find(
      ({ document }) =>
        document.metadata.id === "conditional-visibility",
    );
    const root = context?.roots.roots.find(
      ({ materialized }) =>
        materialized.kind !== "unresolvedEntryLink" &&
        materialized.id === "visibility-parent",
    );
    const forceDefinition = context?.forces.definitions.find(
      ({ source }) => source.id === "force-patrol",
    );
    if (
      context === undefined ||
      root === undefined ||
      root.materialized.kind === "unresolvedEntryLink" ||
      forceDefinition === undefined
    ) {
      throw new Error("Expected visibility parent and Patrol force.");
    }
    const roster: Roster = {
      id: rosterId("conditional-visibility-roster"),
      name: "Conditional visibility roster",
      catalogue: {
        kind: "catalogue",
        key: rosterDefinitionKeyForSource(
          context.document.projection.source.sourceId,
          context.document.projection.path,
        ),
        sourceId: context.document.metadata.id,
      },
      forces: [
        {
          id: forceOccurrenceId("conditional-visibility-force"),
          definition: {
            kind: "forceEntry",
            key: rosterDefinitionKeyForSource(
              forceDefinition.source.source.sourceId,
              forceDefinition.source.path,
            ),
            ...(forceDefinition.source.id === undefined
              ? {}
              : { sourceId: forceDefinition.source.id }),
          },
          forces: [],
          selections: [selection("visibility-parent", root.materialized)],
        },
      ],
    };

    const inspected = inspectEmptySingleForceRosterStructuralStatus(
      roster,
      context,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(
      inspected.value.bounds
        .filter(({ kind }) => kind === "group")
        .map((bound) => boundName(bound)),
    ).toEqual(["Regular Options"]);
    expect(
      inspected.value.bounds.find(
        (bound) => boundName(bound) === "Regular Options",
      ),
    ).toMatchObject({
      status: "violated",
      completeness: "complete",
    });
    expect(inspected.value.completeness).toBe("complete");
    expect(inspected.diagnostics).toEqual([]);

    // The regression this checkpoint fixed. `Hidden Required Root` carries a
    // force-scoped minimum of 1 and hides itself once the force holds
    // anything, which is the shape an allied library contributes through a
    // `catalogueLink` with `importRootEntries`. Before the fix its bound was
    // enumerated anyway and reported violated, so a correct roster could never
    // be valid and the offending entry was never offered.
    expect(
      inspected.value.bounds
        .filter(({ kind }) => kind === "root")
        .map((bound) => boundName(bound)),
    ).not.toContain("Hidden Required Root");
    expect(inspected.value.validity).toBe("invalid");
  });
});

interface StructuralFixture {
  readonly context: BattleScribeCatalogueContext;
  readonly rootChoice: EvaluationSelectionChoice;
  readonly requiredModel: EvaluationSelectionChoice;
  readonly requiredWeapon: EvaluationSelectionChoice;
  readonly defaultOption: EvaluationSelectionChoice;
  readonly manualOption: EvaluationSelectionChoice;
}

function structuralFixture(): StructuralFixture {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("selection-initialization.cat"),
  ]);
  if (!graph.ok) throw new Error("Expected fixture graph.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Expected fixture contexts.");
  const context = contexts.value.catalogues.find(
    ({ document }) =>
      document.metadata.id === "selection-initialization",
  );
  const root = context?.roots.roots.find(
    ({ materialized }) =>
      materialized.kind !== "unresolvedEntryLink" &&
      materialized.id === "initialization-unit",
  );
  if (
    context === undefined ||
    root === undefined ||
    root.materialized.kind === "unresolvedEntryLink"
  ) {
    throw new Error("Expected initialization root.");
  }
  const requiredModel = root.materialized.selectionEntries.find(
    ({ id }) => id === "required-model",
  );
  const requiredWeapon = requiredModel?.selectionEntries.find(
    ({ id }) => id === "required-weapon",
  );
  const defaultOption = root.materialized.selectionEntryGroups
    .find(({ id }) => id === "default-group")
    ?.selectionEntries.find(({ id }) => id === "default-option");
  const manualOption = root.materialized.selectionEntryGroups
    .find(({ id }) => id === "manual-group")
    ?.selectionEntries.find(({ id }) => id === "manual-option-one");
  if (
    requiredModel === undefined ||
    requiredWeapon === undefined ||
    defaultOption === undefined ||
    manualOption === undefined
  ) {
    throw new Error("Expected initialization descendants.");
  }
  return {
    context,
    rootChoice: root.materialized,
    requiredModel,
    requiredWeapon,
    defaultOption,
    manualOption,
  };
}

function fixtureRoster(
  fixture: StructuralFixture,
  options: { readonly includeManualChoice: boolean },
): Roster {
  const requiredModel = (index: number) =>
    selection(`required-model-${index}`, fixture.requiredModel, [
      selection(`required-weapon-${index}`, fixture.requiredWeapon),
    ]);
  const children = [
    requiredModel(1),
    requiredModel(2),
    selection("default-option", fixture.defaultOption),
    ...(options.includeManualChoice
      ? [selection("manual-option", fixture.manualOption)]
      : []),
  ];
  return {
    id: rosterId("structural-roster"),
    name: "Structural roster",
    catalogue: {
      kind: "catalogue",
      key: rosterDefinitionKeyForSource(
        fixture.context.document.projection.source.sourceId,
        fixture.context.document.projection.path,
      ),
      sourceId: fixture.context.document.metadata.id,
    },
    forces: [
      {
        id: forceOccurrenceId("structural-force"),
        definition: {
          kind: "forceEntry",
          key: rosterDefinitionKey("fixture-force"),
        },
        forces: [],
        selections: [
          selection("initialization-unit", fixture.rootChoice, children),
        ],
      },
    ],
  };
}

function selection(
  id: string,
  choice: EvaluationSelectionChoice,
  selections: readonly RosterSelection[] = [],
): RosterSelection {
  return {
    id: selectionOccurrenceId(id),
    definition: {
      kind: choice.kind,
      key: rosterDefinitionKeyForSource(
        choice.occurrence.source.sourceId,
        choice.occurrence.path,
      ),
      ...(choice.id === undefined ? {} : { sourceId: choice.id }),
    },
    selections,
  };
}

function boundName(bound: RosterStructuralBoundReport): string | undefined {
  if (bound.kind === "root") return bound.root.materialized.name;
  if (bound.kind === "direct") return bound.choice.name;
  return bound.group.name;
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

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-23T00:00:00.000Z",
  };
}
