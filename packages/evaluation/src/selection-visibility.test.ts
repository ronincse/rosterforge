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
  type RosterSelection,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import type { EvaluationSelectionChoice } from "./selection-context.js";
import { evaluateRosterSelectionVisibility } from "./selection-visibility.js";

describe("roster selection visibility", () => {
  it("applies grouped hidden true and false values while retaining group reports", () => {
    const setup = visibilitySetup();
    const hiddenChoice = choice(setup.context, "grouped-hidden-options");
    const visibleChoice = choice(setup.context, "grouped-visible-options");

    const hidden = successful(
      evaluateRosterSelectionVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        hiddenChoice,
      ),
    );
    const visible = successful(
      evaluateRosterSelectionVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        visibleChoice,
      ),
    );

    expect(hidden).toMatchObject({
      status: "hidden",
      hidden: true,
      completeness: "complete",
      modifierApplicability: [],
      modifierGroupApplicability: [
        {
          type: "and",
          localStatus: "applicable",
          status: "applicable",
          completeness: "complete",
          modifierApplicability: [{ status: "applicable" }],
        },
      ],
    });
    expect(hidden.modifierGroupApplicability[0]?.group).toBe(
      hiddenChoice.modifierGroups[0],
    );
    expect(visible).toMatchObject({
      status: "visible",
      hidden: false,
      completeness: "complete",
      modifierGroupApplicability: [
        {
          status: "applicable",
          modifierApplicability: [{ status: "applicable" }],
        },
      ],
    });
  });

  it("runs direct modifiers before top-level groups and nested children depth-first", () => {
    const setup = visibilitySetup();
    const orderedChoice = choice(setup.context, "grouped-order-options");

    const evaluated = successful(
      evaluateRosterSelectionVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        orderedChoice,
      ),
    );

    expect(evaluated).toMatchObject({
      status: "visible",
      hidden: false,
      completeness: "complete",
      modifierApplicability: [{ status: "applicable" }],
      modifierGroupApplicability: [
        {
          modifierApplicability: [{ status: "applicable" }],
          modifierGroups: [
            { modifierApplicability: [{ status: "applicable" }] },
          ],
        },
        { modifierApplicability: [{ status: "applicable" }] },
      ],
    });
    expect(evaluated.modifierGroupApplicability.map(({ group }) => group)).toEqual(
      orderedChoice.modifierGroups,
    );
  });

  it("leaves a grouped modifier inactive when its condition is false", () => {
    const setup = visibilitySetup();
    const hiddenChoice = choice(setup.context, "grouped-hidden-options");
    const condition = choice(setup.context, "regular-options").modifiers[0]
      ?.conditions[0];
    const group = hiddenChoice.modifierGroups[0];
    if (condition === undefined || group === undefined) {
      throw new Error("Expected visibility fixture condition and group.");
    }
    const conditionalChoice: EvaluationSelectionChoice = {
      ...hiddenChoice,
      modifierGroups: [{ ...group, conditions: [condition] }],
    };

    const evaluated = successful(
      evaluateRosterSelectionVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        conditionalChoice,
      ),
    );

    expect(evaluated).toMatchObject({
      status: "visible",
      hidden: false,
      completeness: "complete",
      modifierGroupApplicability: [
        {
          localStatus: "notApplicable",
          status: "notApplicable",
          modifierApplicability: [{ status: "notApplicable" }],
        },
      ],
    });
  });

  it("keeps group repeats and unsupported hidden operations unresolved", () => {
    const setup = visibilitySetup();
    const repeatedChoice = choice(
      setup.context,
      "grouped-repeat-visibility",
    );
    const unsupportedBase = choice(setup.context, "grouped-hidden-options");
    const group = unsupportedBase.modifierGroups[0];
    const modifier = group?.modifiers[0];
    if (group === undefined || modifier === undefined) {
      throw new Error("Expected grouped hidden modifier.");
    }
    const unsupportedChoice: EvaluationSelectionChoice = {
      ...unsupportedBase,
      modifierGroups: [
        {
          ...group,
          modifiers: [{ ...modifier, type: "replace" }],
        },
      ],
    };

    const repeated = evaluateRosterSelectionVisibility(
      setup.roster,
      setup.context,
      setup.owner,
      repeatedChoice,
    );
    const unsupported = evaluateRosterSelectionVisibility(
      setup.roster,
      setup.context,
      setup.owner,
      unsupportedChoice,
    );

    expect(repeated.ok).toBe(true);
    expect(unsupported.ok).toBe(true);
    if (!repeated.ok || !unsupported.ok) return;
    expect(repeated.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      modifierGroupApplicability: [{ completeness: "incomplete" }],
    });
    expect(repeated.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_MODIFIER_GROUP_REPEATS_UNSUPPORTED",
    ]);
    expect(unsupported.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(unsupported.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_SELECTION_VISIBILITY_MODIFIER_UNSUPPORTED",
    ]);
  });
});

function visibilitySetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
} {
  const context = catalogueContext();
  const ownerChoice = choice(context, "visibility-parent");
  let roster = createRoster({
    id: rosterId("selection-visibility-roster"),
    name: "Selection visibility roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions.find(
    ({ source }) => source.id === "force-patrol",
  );
  if (force === undefined) {
    throw new Error("Missing visibility fixture force.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("visibility-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  roster = successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("visibility-force"), {
      id: selectionOccurrenceId("visibility-owner"),
      definition: {
        kind: ownerChoice.kind,
        key: projectionKey(ownerChoice.occurrence),
        ...(ownerChoice.id === undefined ? {} : { sourceId: ownerChoice.id }),
      },
    }),
  );
  const owner = roster.forces[0]?.selections[0];
  if (owner === undefined) {
    throw new Error("Missing visibility fixture owner.");
  }
  return { context, roster, owner };
}

function catalogueContext(): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("conditional-visibility.cat"),
  ]);
  if (!graph.ok) throw new Error("Visibility fixture graph must resolve.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Visibility fixture contexts must compose.");
  const context = contexts.value.catalogues.find(
    ({ document }) => document.metadata.id === "conditional-visibility",
  );
  if (context === undefined) throw new Error("Missing visibility context.");
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
    importedAt: "2026-08-10T00:00:00.000Z",
  };
}
