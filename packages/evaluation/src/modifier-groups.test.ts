import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import {
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

import {
  collectRosterModifierGroupExecution,
  evaluateRosterModifierGroupApplicability,
  type RosterModifierGroupSource,
} from "./modifier-groups.js";
import { evaluateRosterModifierApplicability } from "./modifier-applicability.js";
import type { EvaluationSelectionChoice } from "./selection-context.js";

describe("roster modifier-group applicability", () => {
  it("retains the projected group tree while evaluating nested conditions", () => {
    const context = catalogueContext();
    const base = choice(context, "cost-base");
    const grouped = choice(context, "cost-group-inspection");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), base, "selection-base"),
      grouped,
      "selection-grouped",
    );
    const owner = roster.forces[0]?.selections[1];
    const group = grouped.modifierGroups[0];
    expect(owner).toBeDefined();
    expect(group).toBeDefined();
    if (owner === undefined || group === undefined) {
      return;
    }

    const evaluated = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      group,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      type: "and",
      localStatus: "applicable",
      status: "applicable",
      completeness: "complete",
      conditions: [{ status: "satisfied", observed: 1 }],
      modifierApplicability: [
        {
          localStatus: "applicable",
          status: "applicable",
          completeness: "complete",
          conditions: [{ status: "satisfied", observed: 1 }],
        },
      ],
      modifierGroups: [
        {
          type: "and",
          localStatus: "applicable",
          status: "applicable",
          completeness: "complete",
          conditionGroups: [
            {
              type: "or",
              status: "satisfied",
              conditions: [
                { status: "satisfied" },
                { status: "unsatisfied" },
              ],
            },
          ],
        },
      ],
    });
    expect(evaluated.value.group).toBe(group);
    expect(evaluated.value.modifiers).toBe(group.modifiers);
    expect(evaluated.value.modifierApplicability[0]?.modifier).toBe(
      group.modifiers[0],
    );
    expect(evaluated.value.modifierGroups[0]?.group).toBe(
      group.modifierGroups[0],
    );
    const execution = collectRosterModifierGroupExecution(
      [evaluated.value],
      "cost-points",
    );
    expect(execution.modifiers).toEqual([
      group.modifiers[0],
      group.modifierGroups[0]?.modifiers[0],
    ]);
    expect(execution.entries).toMatchObject([
      { status: "applicable", evaluated: true },
      { status: "applicable", evaluated: true },
    ]);
  });

  it("combines parent and child applicability without flattening groups", () => {
    const context = catalogueContext();
    const grouped = choice(context, "cost-group-inspection");
    const roster = addRootSelection(
      emptyRoster(context),
      grouped,
      "selection-grouped",
    );
    const owner = roster.forces[0]?.selections[0];
    const projected = grouped.modifierGroups[0];
    const projectedChild = projected?.modifierGroups[0];
    expect(owner).toBeDefined();
    expect(projected).toBeDefined();
    expect(projectedChild).toBeDefined();
    if (
      owner === undefined ||
      projected === undefined ||
      projectedChild === undefined
    ) {
      return;
    }
    const child: RosterModifierGroupSource = {
      ...projectedChild,
      conditions: [],
      conditionGroups: [],
    };
    const group: RosterModifierGroupSource = {
      ...projected,
      modifierGroups: [child],
    };

    const evaluated = successful(
      evaluateRosterModifierGroupApplicability(
        roster,
        context,
        owner,
        group,
      ),
    );

    expect(evaluated).toMatchObject({
      localStatus: "notApplicable",
      status: "notApplicable",
      modifierApplicability: [
        {
          localStatus: "applicable",
          status: "notApplicable",
        },
      ],
      modifierGroups: [
        {
          localStatus: "applicable",
          status: "notApplicable",
        },
      ],
    });
  });

  it("inspects a direct modifier independently of arithmetic", () => {
    const context = catalogueContext();
    const base = choice(context, "cost-base");
    const grouped = choice(context, "cost-group-inspection");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), base, "selection-base"),
      grouped,
      "selection-grouped",
    );
    const owner = roster.forces[0]?.selections[1];
    const modifier = grouped.modifierGroups[0]?.modifiers[0];
    expect(owner).toBeDefined();
    expect(modifier).toBeDefined();
    if (owner === undefined || modifier === undefined) {
      return;
    }

    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
      { inheritedStatus: "unresolved" },
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      localStatus: "applicable",
      status: "unresolved",
      evaluated: true,
      completeness: "complete",
      conditions: [{ status: "satisfied", observed: 1 }],
    });
    expect(evaluated.value.modifier).toBe(modifier);
  });

  it("diagnoses unsupported group shapes and preserved repeats", () => {
    const context = catalogueContext();
    const grouped = choice(context, "cost-grouped");
    const roster = addRootSelection(
      emptyRoster(context),
      grouped,
      "selection-grouped",
    );
    const owner = roster.forces[0]?.selections[0];
    const projected = grouped.modifierGroups[0];
    expect(owner).toBeDefined();
    expect(projected).toBeDefined();
    if (owner === undefined || projected === undefined) {
      return;
    }

    const unsupported: RosterModifierGroupSource = {
      ...projected,
      type: "future-group",
      modifiers: [],
      modifierGroups: [],
      node: {
        attributes: {
          type: "future-group",
          extensionBehavior: "future",
        },
      },
    };
    const unsupportedResult = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      unsupported,
    );
    expect(unsupportedResult.ok).toBe(true);
    if (!unsupportedResult.ok) {
      return;
    }
    expect(unsupportedResult.value).toMatchObject({
      localStatus: "unresolved",
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(unsupportedResult.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_MODIFIER_GROUP_TYPE_UNSUPPORTED",
      "EVALUATION_MODIFIER_GROUP_EMPTY",
      "EVALUATION_MODIFIER_GROUP_ATTRIBUTES_UNSUPPORTED",
    ]);
    expect(unsupportedResult.diagnostics[0]?.location).toEqual({
      source: projected.source,
      path: [...projected.path, "@type"],
    });

    const repeated: RosterModifierGroupSource = {
      ...projected,
      repeats: [
        {
          source: projected.source,
          path: [...projected.path, "repeats", "repeat[0]"],
        },
      ],
    };
    const repeatedResult = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      repeated,
    );
    expect(repeatedResult.ok).toBe(true);
    if (!repeatedResult.ok) {
      return;
    }
    expect(repeatedResult.value).toMatchObject({
      localStatus: "applicable",
      status: "applicable",
      completeness: "incomplete",
    });
    expect(repeatedResult.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_MODIFIER_GROUP_REPEATS_UNSUPPORTED",
        location: {
          source: projected.source,
          path: [...projected.path, "repeats", "repeat[0]"],
        },
      }),
    ]);
    expect(
      collectRosterModifierGroupExecution(
        [repeatedResult.value],
        "cost-points",
      ).entries,
    ).toMatchObject([{ status: "unresolved", evaluated: true }]);
  });
});

function catalogueContext(): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("cost-evaluation.cat"),
  ]);
  if (!graph.ok) {
    throw new Error("Fixture graph must resolve.");
  }
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) {
    throw new Error("Fixture contexts must compose.");
  }
  const context = contexts.value.catalogues.find(
    (candidate) => candidate.document.metadata.id === "cost-evaluation",
  );
  if (context === undefined) {
    throw new Error("Missing cost evaluation context.");
  }
  return context;
}

function emptyRoster(context: BattleScribeCatalogueContext): Roster {
  let roster = createRoster({
    id: rosterId("modifier-group-roster"),
    name: "Modifier Group Roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions[0];
  if (force === undefined) {
    throw new Error("Modifier-group fixture requires a force definition.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("force-1"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined
          ? {}
          : { sourceId: force.source.id }),
      },
    }),
  );
  return roster;
}

function addRootSelection(
  roster: Roster,
  selected: EvaluationSelectionChoice,
  id: string,
): Roster {
  return successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
      id: selectionOccurrenceId(id),
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
  const pending = context.roots.roots.map((root) => root.materialized);
  while (pending.length > 0) {
    const selected = pending.shift();
    if (selected === undefined || selected.kind === "unresolvedEntryLink") {
      continue;
    }
    if (selected.id === id) {
      return selected;
    }
    pending.push(
      ...selected.selectionEntries,
      ...selected.selectionEntryGroups,
      ...selected.entryLinks,
    );
  }
  throw new Error(`Missing selection choice ${id}.`);
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
  if (!parsed.ok) {
    throw new Error(`Fixture ${filename} must parse.`);
  }
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
    importedAt: "2026-07-22T00:00:00.000Z",
  };
}
