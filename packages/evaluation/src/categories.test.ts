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
  addRosterSelectionToSelection,
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

import { evaluateRosterSelectionCategories } from "./categories.js";
import { evaluateRosterCondition } from "./conditions.js";
import { indexEffectiveRosterCategories } from "./effective-categories.js";
import type { EvaluationSelectionChoice } from "./selection-context.js";

describe("roster selection category membership", () => {
  it("reports static links as the base membership and primary set", () => {
    const setup = categorySetup("static-categories");

    const report = successful(
      evaluateRosterSelectionCategories(
        setup.roster,
        setup.context,
        setup.owner,
        setup.choice,
      ),
    );

    expect(report).toMatchObject({
      baseCategories: ["cat-infantry", "cat-character"],
      categories: ["cat-infantry", "cat-character"],
      basePrimaryCategories: ["cat-infantry"],
      primaryCategories: ["cat-infantry"],
      completeness: "complete",
      steps: [],
    });
  });

  it("adds and removes membership while keeping source order", () => {
    const added = successful(
      evaluateRosterSelectionCategories(
        ...setupArgs(categorySetup("added-category")),
      ),
    );
    const removed = successful(
      evaluateRosterSelectionCategories(
        ...setupArgs(categorySetup("removed-category")),
      ),
    );

    expect(added).toMatchObject({
      baseCategories: ["cat-infantry"],
      categories: ["cat-infantry", "cat-battleline"],
      completeness: "complete",
      steps: [
        { status: "applied", operation: "add", targetId: "cat-battleline", changed: true },
      ],
    });
    expect(removed).toMatchObject({
      baseCategories: ["cat-infantry", "cat-character"],
      categories: ["cat-infantry"],
      completeness: "complete",
      steps: [
        { status: "applied", operation: "remove", targetId: "cat-character", changed: true },
      ],
    });
  });

  it("treats an add of an existing category as an unchanged no-op", () => {
    const report = successful(
      evaluateRosterSelectionCategories(
        ...setupArgs(categorySetup("redundant-add")),
      ),
    );

    expect(report).toMatchObject({
      categories: ["cat-infantry"],
      completeness: "complete",
      steps: [{ status: "applied", changed: false }],
    });
  });

  it("skips an unsatisfied condition without becoming incomplete", () => {
    const report = successful(
      evaluateRosterSelectionCategories(
        ...setupArgs(categorySetup("conditional-category")),
      ),
    );

    expect(report).toMatchObject({
      baseCategories: [],
      categories: ["cat-battleline"],
      completeness: "complete",
      steps: [
        { status: "applied", targetId: "cat-battleline" },
        { status: "notApplicable" },
      ],
    });
  });

  it("runs direct modifiers before groups and children before nested groups", () => {
    const report = successful(
      evaluateRosterSelectionCategories(
        ...setupArgs(categorySetup("grouped-category")),
      ),
    );

    expect(
      report.steps.map((step) =>
        step.status === "applied"
          ? [step.operation, step.targetId, step.grouped]
          : step.status,
      ),
    ).toEqual([
      ["add", "cat-infantry", false],
      ["add", "cat-battleline", true],
      ["remove", "cat-infantry", true],
    ]);
    expect(report).toMatchObject({
      categories: ["cat-battleline"],
      completeness: "complete",
    });
  });

  it("moves the primary flag to the category a set-primary names", () => {
    const setup = categorySetup("primary-operation");

    const evaluated = evaluateRosterSelectionCategories(
      setup.roster,
      setup.context,
      setup.owner,
      setup.choice,
    );
    const report = successful(evaluated);

    expect(evaluated.diagnostics).toEqual([]);
    expect(report).toMatchObject({
      categories: ["cat-infantry", "cat-battleline"],
      basePrimaryCategories: ["cat-infantry"],
      // set-primary displaces the previous primary rather than adding a second.
      primaryCategories: ["cat-battleline"],
      completeness: "complete",
      steps: [
        { status: "applied", operation: "add" },
        { status: "applied", operation: "set-primary" },
      ],
    });
  });

  it("adds a category that only a set-primary names", () => {
    const setup = categorySetup("primary-implies-membership");

    const report = successful(
      evaluateRosterSelectionCategories(
        setup.roster,
        setup.context,
        setup.owner,
        setup.choice,
      ),
    );

    // BattleScribe 2.03: "When setting a Category to primary, the Category will
    // be added if it doesn't already exist."
    expect(report).toMatchObject({
      baseCategories: ["cat-infantry"],
      categories: ["cat-infantry", "cat-character"],
      primaryCategories: ["cat-character"],
      completeness: "complete",
    });
  });

  it("clears a primary flag without removing membership", () => {
    const setup = categorySetup("primary-cleared");

    const report = successful(
      evaluateRosterSelectionCategories(
        setup.roster,
        setup.context,
        setup.owner,
        setup.choice,
      ),
    );

    expect(report).toMatchObject({
      categories: ["cat-infantry"],
      basePrimaryCategories: ["cat-infantry"],
      primaryCategories: [],
      completeness: "complete",
    });
  });

  it("leaves membership unknown for scoped and retargeted modifiers", () => {
    for (const [id, issues] of [
      ["scoped-category", ["scoped"]],
      ["affects-category", ["unsupportedAttributes"]],
    ] as const) {
      const report = successful(
        evaluateRosterSelectionCategories(...setupArgs(categorySetup(id))),
      );

      expect(report).toMatchObject({
        baseCategories: ["cat-infantry"],
        completeness: "incomplete",
        steps: [{ status: "unapplied", issues }],
      });
      expect(report).not.toHaveProperty("categories");
      expect(report).not.toHaveProperty("primaryCategories");
    }
  });
});

describe("inbound scoped category modifiers", () => {
  it("applies a child's parent-scoped and root-entry-scoped operations", () => {
    const setup = anchorSetup();

    const report = successful(
      evaluateRosterSelectionCategories(
        setup.roster,
        setup.context,
        setup.anchor,
        setup.anchorChoice,
      ),
    );

    // The child declares both: add Battleline to its parent, and remove
    // Infantry from its root entry. The anchor is both.
    expect(report).toMatchObject({
      baseCategories: ["cat-infantry"],
      categories: ["cat-battleline"],
      completeness: "complete",
    });
    expect(
      report.steps.map((step) =>
        step.status === "applied"
          ? [step.origin, step.operation, step.targetId]
          : step.status,
      ),
    ).toEqual([
      ["parent-scope", "add", "cat-battleline"],
      ["root-entry-scope", "remove", "cat-infantry"],
    ]);
    for (const step of report.steps) {
      expect(step.declaredBy).toBe(setup.child);
    }
  });

  it("does not let a scoped modifier reach the occurrence that declares it", () => {
    const setup = anchorSetup();

    const report = successful(
      evaluateRosterSelectionCategories(
        setup.roster,
        setup.context,
        setup.child,
        setup.childChoice,
      ),
    );

    // Both modifiers anchor elsewhere, so from the child's own point of view
    // they are unresolved scoped behavior rather than membership changes.
    expect(report.steps.every((step) => step.status === "unapplied")).toBe(
      true,
    );
    expect(report).not.toHaveProperty("categories");
    expect(report.completeness).toBe("incomplete");
  });
});

describe("effective categories feeding condition identity", () => {
  it("resolves a modifier-granted category instead of reporting unresolved", () => {
    const setup = conditionSetup();
    const effectiveCategories = indexEffectiveRosterCategories(
      setup.roster,
      setup.context,
    );

    const withoutIndex = successful(
      evaluateRosterCondition(
        setup.roster,
        setup.context,
        setup.owner,
        probeCondition(setup.probe, 0),
      ),
    );
    const withIndex = successful(
      evaluateRosterCondition(
        setup.roster,
        setup.context,
        setup.owner,
        probeCondition(setup.probe, 0),
        { effectiveCategories },
      ),
    );

    // `added-category` gains Battleline through a modifier. Without the index
    // that count is unknowable; with it the condition is exact.
    expect(withoutIndex.status).toBe("unresolved");
    expect(withIndex).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 1,
    });
  });

  it("stops matching a category that a modifier removed", () => {
    const setup = removalConditionSetup();
    const effectiveCategories = indexEffectiveRosterCategories(
      setup.roster,
      setup.context,
    );

    const evaluated = successful(
      evaluateRosterCondition(
        setup.roster,
        setup.context,
        setup.owner,
        probeCondition(setup.probe, 1),
        { effectiveCategories },
      ),
    );

    // `removed-category` still projects a Character link, but the modifier
    // removes it. Known membership is authoritative, so the count is zero.
    expect(evaluated).toMatchObject({
      status: "unsatisfied",
      completeness: "complete",
      observed: 0,
    });
  });

  it("leaves membership unknown when a category modifier queries a category", () => {
    const setup = cyclicSetup();
    const effectiveCategories = indexEffectiveRosterCategories(
      setup.roster,
      setup.context,
    );

    // The single documented pass evaluates category modifiers without an index,
    // so a modifier whose own condition tests a category cannot resolve. It
    // stays unknown rather than being iterated to a fixpoint.
    expect(effectiveCategories.get(setup.owner)).toBeUndefined();
  });
});

describe("category-modifier-controlled condition identity", () => {
  it("reports a category count as unresolved when a modifier could change it", () => {
    const setup = conditionSetup();

    const battleline = successful(
      evaluateRosterCondition(
        setup.roster,
        setup.context,
        setup.owner,
        probeCondition(setup.probe, 0),
      ),
    );
    const character = successful(
      evaluateRosterCondition(
        setup.roster,
        setup.context,
        setup.owner,
        probeCondition(setup.probe, 1),
      ),
    );

    // `added-category` gains cat-battleline through a modifier, so the count of
    // battleline selections cannot be known from the static links alone.
    expect(battleline.status).toBe("unresolved");
    expect(battleline.completeness).toBe("incomplete");
    // No modifier touches cat-character, so that comparison stays exact. The
    // downgrade is narrow rather than blanket.
    expect(character).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 1,
    });
  });
});

interface CategorySetup {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
  readonly choice: EvaluationSelectionChoice;
}

function setupArgs(
  setup: CategorySetup,
): [Roster, BattleScribeCatalogueContext, RosterSelection, EvaluationSelectionChoice] {
  return [setup.roster, setup.context, setup.owner, setup.choice];
}

function categorySetup(rootId: string): CategorySetup {
  const context = catalogueContext();
  const choice = choiceById(context, rootId);
  let roster = createRoster({
    id: rosterId("category-roster"),
    name: "Category roster",
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
    throw new Error("Missing category fixture force.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("category-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  roster = successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("category-force"), {
      id: selectionOccurrenceId("category-owner"),
      definition: {
        kind: choice.kind,
        key: projectionKey(choice.occurrence),
        ...(choice.id === undefined ? {} : { sourceId: choice.id }),
      },
    }),
  );
  const owner = roster.forces[0]?.selections[0];
  if (owner === undefined) {
    throw new Error("Missing category fixture owner.");
  }
  return { context, roster, owner, choice };
}

function probeCondition(
  probe: EvaluationSelectionChoice,
  index: number,
) {
  const condition = probe.modifiers[index]?.conditions[0];
  if (condition === undefined) {
    throw new Error(`Missing probe condition ${index}.`);
  }
  return condition;
}

function conditionSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
  readonly probe: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  const probe = choiceById(context, "condition-probe");
  const withCategoryModifier = choiceById(context, "added-category");
  const staticCategories = choiceById(context, "static-categories");
  let roster = createRoster({
    id: rosterId("category-condition-roster"),
    name: "Category condition roster",
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
    throw new Error("Missing category fixture force.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("category-condition-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  const added: readonly [EvaluationSelectionChoice, string][] = [
    [probe, "probe-occurrence"],
    [withCategoryModifier, "modified-occurrence"],
    [staticCategories, "static-occurrence"],
  ];
  for (const [choice, id] of added) {
    roster = successful(
      addRosterSelectionToForce(
        roster,
        forceOccurrenceId("category-condition-force"),
        {
          id: selectionOccurrenceId(id),
          definition: {
            kind: choice.kind,
            key: projectionKey(choice.occurrence),
            ...(choice.id === undefined ? {} : { sourceId: choice.id }),
          },
        },
      ),
    );
  }
  const owner = roster.forces[0]?.selections[0];
  if (owner === undefined) {
    throw new Error("Missing category condition owner.");
  }
  return { context, roster, owner, probe };
}

function anchorSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly anchor: RosterSelection;
  readonly child: RosterSelection;
  readonly anchorChoice: EvaluationSelectionChoice;
  readonly childChoice: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  const anchorChoice = choiceById(context, "scope-anchor");
  const childChoice = choiceById(context, "scope-child");
  let roster = createRoster({
    id: rosterId("category-scope-roster"),
    name: "Category scope roster",
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
    throw new Error("Missing category fixture force.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("category-scope-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  roster = successful(
    addRosterSelectionToForce(
      roster,
      forceOccurrenceId("category-scope-force"),
      {
        id: selectionOccurrenceId("anchor-occurrence"),
        definition: {
          kind: anchorChoice.kind,
          key: projectionKey(anchorChoice.occurrence),
          ...(anchorChoice.id === undefined
            ? {}
            : { sourceId: anchorChoice.id }),
        },
      },
    ),
  );
  roster = successful(
    addRosterSelectionToSelection(
      roster,
      selectionOccurrenceId("anchor-occurrence"),
      {
        id: selectionOccurrenceId("child-occurrence"),
        definition: {
          kind: childChoice.kind,
          key: projectionKey(childChoice.occurrence),
          ...(childChoice.id === undefined
            ? {}
            : { sourceId: childChoice.id }),
        },
      },
    ),
  );
  const anchor = roster.forces[0]?.selections[0];
  const child = anchor?.selections[0];
  if (anchor === undefined || child === undefined) {
    throw new Error("Missing category scope occurrences.");
  }
  return { context, roster, anchor, child, anchorChoice, childChoice };
}

function rosterWithSelections(
  context: BattleScribeCatalogueContext,
  label: string,
  entries: readonly (readonly [string, string])[],
): { readonly roster: Roster; readonly selections: readonly RosterSelection[] } {
  let roster = createRoster({
    id: rosterId(`${label}-roster`),
    name: `${label} roster`,
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
    throw new Error("Missing category fixture force.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId(`${label}-force`),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  for (const [choiceId, occurrenceId] of entries) {
    const choice = choiceById(context, choiceId);
    roster = successful(
      addRosterSelectionToForce(roster, forceOccurrenceId(`${label}-force`), {
        id: selectionOccurrenceId(occurrenceId),
        definition: {
          kind: choice.kind,
          key: projectionKey(choice.occurrence),
          ...(choice.id === undefined ? {} : { sourceId: choice.id }),
        },
      }),
    );
  }
  return { roster, selections: roster.forces[0]?.selections ?? [] };
}

function removalConditionSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
  readonly probe: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  // Deliberately excludes `static-categories`, so the only Character link in
  // the force is the one `removed-category` removes.
  const { roster, selections } = rosterWithSelections(context, "removal", [
    ["condition-probe", "removal-probe"],
    ["removed-category", "removal-target"],
  ]);
  const owner = selections[0];
  if (owner === undefined) throw new Error("Missing removal owner.");
  return {
    context,
    roster,
    owner,
    probe: choiceById(context, "condition-probe"),
  };
}

function cyclicSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
} {
  const context = catalogueContext();
  // `cyclic-category` adds Battleline only if a Character is present, and
  // `removed-category` controls Character membership. Pass one cannot settle
  // that, so the cyclic occurrence has unknown membership.
  const { roster, selections } = rosterWithSelections(context, "cyclic", [
    ["cyclic-category", "cyclic-owner"],
    ["removed-category", "cyclic-other"],
  ]);
  const owner = selections[0];
  if (owner === undefined) throw new Error("Missing cyclic owner.");
  return { context, roster, owner };
}

function catalogueContext(): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("category-membership.cat"),
  ]);
  if (!graph.ok) throw new Error("Category fixture graph must resolve.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) throw new Error("Category fixture contexts must compose.");
  const context = contexts.value.catalogues.find(
    ({ document }) => document.metadata.id === "category-membership",
  );
  if (context === undefined) throw new Error("Missing category context.");
  return context;
}

function choiceById(
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
    importedAt: "2026-08-14T00:00:00.000Z",
  };
}
