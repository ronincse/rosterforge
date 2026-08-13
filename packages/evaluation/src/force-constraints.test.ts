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
  rosterDefinitionKey,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  inspectRosterForceConstraint,
  inspectRosterForceConstraintWithConditions,
  inspectRosterForceConstraintWithUnconditionalModifiers,
  inspectRosterForceConstraints,
  inspectRosterForceConstraintsInRoster,
} from "./force-constraints.js";
import type { EvaluationSelectionChoice } from "./selection-context.js";

describe("roster force constraints", () => {
  it("counts shared force definitions across nested roster forces", () => {
    const context = catalogueContext();
    const roster = rosterWithChildForces(context, 2);
    const child = forceDefinition(context, "force-patrol-child");
    const owner = roster.forces[0]?.forces[0];
    const constraint = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-max",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterForceConstraint(
      roster,
      context,
      owner,
      constraint,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics).toEqual([]);
    expect(inspected.value).toMatchObject({
      constraintType: "max",
      scope: "roster",
      baseStatus: "violated",
      status: "violated",
      completeness: "complete",
      observed: 2,
      limit: 1,
      targetIds: ["force-patrol-child"],
      candidates: [
        { status: "different", effectiveIds: ["force-patrol"] },
        { status: "match", effectiveIds: ["force-patrol-child"] },
        { status: "match", effectiveIds: ["force-patrol-child"] },
      ],
    });
    expect(inspected.value.matching).toEqual(roster.forces[0]?.forces);
    expect(inspected.value.constraint).toBe(constraint);
    expect(inspected.value.owner).toBe(owner);
    expect("validity" in inspected.value).toBe(false);
  });

  it("preserves targeting modifiers without treating base status as effective", () => {
    const context = catalogueContext();
    const roster = rosterWithChildForces(context, 2);
    const child = forceDefinition(context, "force-patrol-child");
    const owner = roster.forces[0]?.forces[0];
    const constraint = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-modified",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterForceConstraint(
      roster,
      context,
      owner,
      constraint,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.value).toMatchObject({
      baseStatus: "violated",
      status: "unresolved",
      completeness: "incomplete",
      observed: 2,
      limit: 1,
      modifiers: [{ type: "set", value: "2" }],
      modifierGroups: [],
    });
    expect(inspected.value.modifiers[0]).toBe(child.source.modifiers[0]);
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        location: {
          source: child.source.modifiers[0]?.source,
          path: child.source.modifiers[0]?.path,
        },
      }),
    ]);
  });

  it("applies a direct force-constraint modifier when its condition is satisfied", () => {
    const context = catalogueContext();
    const roster = rosterWithChildForces(context, 2);
    const child = forceDefinition(context, "force-patrol-child");
    const owner = roster.forces[0]?.forces[0];
    const constraint = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-modified",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const unconditional =
      inspectRosterForceConstraintWithUnconditionalModifiers(
        roster,
        context,
        owner,
        constraint,
      );
    const conditional = inspectRosterForceConstraintWithConditions(
      roster,
      context,
      owner,
      constraint,
    );
    const collection = inspectRosterForceConstraints(
      roster,
      context,
      owner,
      { inspectionScope: "conditions" },
    );

    expect(unconditional.ok).toBe(true);
    expect(conditional.ok).toBe(true);
    expect(collection.ok).toBe(true);
    if (!unconditional.ok || !conditional.ok || !collection.ok) {
      return;
    }
    expect(unconditional.value).toMatchObject({
      inspectionScope: "unconditionalModifiers",
      baseLimit: 1,
      limit: 1,
      baseStatus: "violated",
      status: "unresolved",
      completeness: "incomplete",
      modifierSequence: {
        completeness: "incomplete",
        steps: [{ status: "unapplied", input: 1 }],
      },
    });
    expect(unconditional.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_NUMERIC_MODIFIER_CONDITIONAL",
      }),
    ]);

    expect(conditional.diagnostics).toEqual([]);
    expect(conditional.value).toMatchObject({
      inspectionScope: "conditions",
      baseLimit: 1,
      limit: 2,
      baseStatus: "violated",
      status: "satisfied",
      completeness: "complete",
      modifierApplicability: [
        {
          localStatus: "applicable",
          status: "applicable",
          evaluated: true,
          conditions: [
            {
              status: "satisfied",
              observed: 1,
              matching: [roster.forces[0]],
            },
          ],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "set", output: 2 }],
      },
    });
    expect(conditional.value.modifierApplicability[0]?.owner).toBe(owner);
    expect(collection.value.inspectionScope).toBe("conditions");
    expect(
      collection.value.constraints.find(
        (report) =>
          report.constraint.id === "force-child-roster-modified",
      ),
    ).toMatchObject({
      inspectionScope: "conditions",
      baseStatus: "violated",
      status: "satisfied",
      limit: 2,
    });
  });

  it("applies a grouped force-constraint modifier when its condition is satisfied", () => {
    const context = catalogueContext();
    const roster = rosterWithChildForces(context, 2);
    const child = forceDefinition(context, "force-patrol-child");
    const owner = roster.forces[0]?.forces[0];
    const constraint = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-grouped",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const unconditional =
      inspectRosterForceConstraintWithUnconditionalModifiers(
        roster,
        context,
        owner,
        constraint,
      );
    const conditional = inspectRosterForceConstraintWithConditions(
      roster,
      context,
      owner,
      constraint,
    );

    expect(unconditional.ok).toBe(true);
    expect(conditional.ok).toBe(true);
    if (!unconditional.ok || !conditional.ok) {
      return;
    }
    expect(unconditional.value).toMatchObject({
      baseStatus: "violated",
      status: "unresolved",
      limit: 1,
      modifierSequence: { completeness: "complete", steps: [] },
    });
    expect(unconditional.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_FORCE_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED",
      }),
    ]);
    expect(conditional.diagnostics).toEqual([]);
    expect(conditional.value).toMatchObject({
      inspectionScope: "conditions",
      baseLimit: 1,
      limit: 2,
      baseStatus: "violated",
      status: "satisfied",
      completeness: "complete",
      modifierGroupApplicability: [
        {
          group: { comment: "Grouped force limit" },
          localStatus: "applicable",
          conditions: [{ status: "satisfied", observed: 1 }],
          modifierApplicability: [{ status: "applicable" }],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "increment", output: 2 }],
      },
    });
  });

  it("inspects an exact cost-type constraint in its parent force scope", () => {
    const context = catalogueContext();
    const selected = choice(context, "cost-base");
    const roster = addSelectionToForce(
      rosterWithChildForces(context, 1),
      "force-root",
      selected,
      "selection-base",
    );
    const child = forceDefinition(context, "force-patrol-child");
    const owner = roster.forces[0]?.forces[0];
    const source = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-max",
    );
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined) {
      return;
    }
    const constraint = {
      ...source,
      field: "cost-points",
      scope: "parent",
      value: 10,
      includeChildSelections: true,
      node: {
        ...source.node,
        attributes: {
          ...source.node.attributes,
          field: "cost-points",
          scope: "parent",
          value: "10",
          message: "Points limit",
        },
      },
    };

    const inspected = inspectRosterForceConstraintWithConditions(
      roster,
      context,
      owner,
      constraint,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.diagnostics).toEqual([]);
    expect(inspected.value).toMatchObject({
      constraintType: "max",
      scope: "parent",
      baseStatus: "satisfied",
      status: "satisfied",
      completeness: "complete",
      observed: 10,
      minimum: 10,
      maximum: 10,
      baseLimit: 10,
      limit: 10,
      targetIds: ["cost-points"],
      costEvaluation: {
        typeId: "cost-points",
        value: 10,
        exact: true,
        unresolvedSelections: 0,
        unresolvedCosts: 0,
        modifiersWithoutBaseCost: 0,
      },
    });
    expect(inspected.value.costEvaluation?.selections).toHaveLength(1);
    expect(
      inspected.value.costEvaluation?.selections[0]?.occurrence,
    ).toBe(roster.forces[0]?.selections[0]);
    expect(inspected.value.costEvaluation?.report.roster).toBe(roster);
  });

  it("leaves a cost-type constraint unresolved when its total is provisional", () => {
    const context = catalogueContext();
    const selected = choice(context, "cost-problems");
    const roster = addSelectionToForce(
      rosterWithChildForces(context, 1),
      "force-child-1",
      selected,
      "selection-problems",
    );
    const child = forceDefinition(context, "force-patrol-child");
    const owner = roster.forces[0]?.forces[0];
    const source = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-max",
    );
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined) {
      return;
    }
    const constraint = {
      ...source,
      field: "cost-points",
      scope: "force",
      value: 4,
      includeChildSelections: true,
      node: {
        ...source.node,
        attributes: {
          ...source.node.attributes,
          field: "cost-points",
          scope: "force",
          value: "4",
        },
      },
    };

    const inspected = inspectRosterForceConstraintWithConditions(
      roster,
      context,
      owner,
      constraint,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.value).toMatchObject({
      baseStatus: "unresolved",
      status: "unresolved",
      completeness: "incomplete",
      minimum: 0,
      maximum: Number.POSITIVE_INFINITY,
      costEvaluation: {
        typeId: "cost-points",
        exact: false,
        unresolvedSelections: 0,
        unresolvedCosts: 1,
        modifiersWithoutBaseCost: 0,
      },
    });
    expect(inspected.value.observed).toBeUndefined();
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_FORCE_CONSTRAINT_COST_UNRESOLVED",
        location: {
          source: source.source,
          path: [...source.path, "@field"],
        },
      }),
    ]);
  });

  it("collects every force definition constraint in roster order", () => {
    const context = catalogueContext();
    const roster = rosterWithChildForces(context, 2);
    const owner = roster.forces[0]?.forces[0];
    expect(owner).toBeDefined();
    if (owner === undefined) {
      return;
    }

    const selected = inspectRosterForceConstraints(roster, context, owner);
    const rosterWide = inspectRosterForceConstraintsInRoster(roster, context);
    const rosterWideConditional = inspectRosterForceConstraintsInRoster(
      roster,
      context,
      { inspectionScope: "conditions" },
    );

    expect(selected.ok).toBe(true);
    expect(rosterWide.ok).toBe(true);
    expect(rosterWideConditional.ok).toBe(true);
    if (!selected.ok || !rosterWide.ok || !rosterWideConditional.ok) {
      return;
    }
    expect(selected.value.constraints.map((item) => item.constraint.id)).toEqual(
      [
        "force-child-roster-max",
        "force-child-roster-modified",
        "force-child-roster-grouped",
      ],
    );
    expect(selected.value.constraints).toMatchObject([
      { status: "violated" },
      { baseStatus: "violated", status: "unresolved" },
      { baseStatus: "violated", status: "unresolved" },
    ]);
    expect(rosterWide.value.forces.map((item) => item.owner.id)).toEqual([
      "force-root",
      "force-child-1",
      "force-child-2",
    ]);
    expect(rosterWide.value.completeness).toBe("incomplete");
    expect(rosterWide.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_FORCE_CONSTRAINT_FIELD_UNSUPPORTED",
      "EVALUATION_FORCE_CONSTRAINT_SCOPE_UNSUPPORTED",
      "EVALUATION_FORCE_CONSTRAINT_SHARED_UNSUPPORTED",
      "EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      "EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      "EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      "EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED",
    ]);
    expect("status" in rosterWide.value).toBe(false);
    expect("validity" in rosterWide.value).toBe(false);
    expect(rosterWideConditional.value.inspectionScope).toBe("conditions");
    expect(
      rosterWideConditional.value.forces.every(
        (force) =>
          force.inspectionScope === "conditions" &&
          force.constraints.every(
            (report) => report.inspectionScope === "conditions",
          ),
      ),
    ).toBe(true);
  });

  it("retains bounded status when a force definition is unresolved", () => {
    const context = catalogueContext();
    const child = forceDefinition(context, "force-patrol-child");
    let roster = rosterWithChildForces(context, 2);
    roster = successful(
      addRosterChildForce(roster, forceOccurrenceId("force-root"), {
        id: forceOccurrenceId("force-unknown"),
        definition: {
          kind: "forceEntry",
          key: rosterDefinitionKey("unavailable-force-definition"),
        },
      }),
    );
    const owner = roster.forces[0]?.forces[0];
    const source = child.source.constraints.find(
      (candidate) => candidate.id === "force-child-roster-max",
    );
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined) {
      return;
    }

    const inspected = inspectRosterForceConstraint(
      roster,
      context,
      owner,
      { ...source, value: 2 },
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      minimum: 2,
      maximum: 3,
      limit: 2,
    });
    expect(inspected.value.observed).toBeUndefined();
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_FORCE_CONSTRAINT_CANDIDATES_UNRESOLVED",
        location: { source: source.source, path: source.path },
      }),
    ]);
  });
});

function catalogueContext(): BattleScribeCatalogueContext {
  const filenames = ["projection.gst", "cost-evaluation.cat"];
  const graph = resolveBattleScribeDataGraph(filenames.map(parseFixture));
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
    throw new Error("Missing cost evaluation catalogue context.");
  }
  return context;
}

function rosterWithChildForces(
  context: BattleScribeCatalogueContext,
  children: number,
): Roster {
  const root = forceDefinition(context, "force-patrol");
  const child = forceDefinition(context, "force-patrol-child");
  let roster = createRoster({
    id: rosterId("force-constraint-roster"),
    name: "Force Constraint Roster",
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
  for (let index = 0; index < children; index += 1) {
    roster = successful(
      addRosterChildForce(roster, forceOccurrenceId("force-root"), {
        id: forceOccurrenceId(`force-child-${index + 1}`),
        definition: forceReference(child),
      }),
    );
  }
  return roster;
}

function addSelectionToForce(
  roster: Roster,
  forceId: string,
  selected: EvaluationSelectionChoice,
  occurrenceId: string,
): Roster {
  return successful(
    addRosterSelectionToForce(roster, forceOccurrenceId(forceId), {
      id: selectionOccurrenceId(occurrenceId),
      definition: selectionReference(selected),
    }),
  );
}

function selectionReference(selected: EvaluationSelectionChoice) {
  return {
    kind: selected.kind,
    key: projectionKey(selected.occurrence),
    ...(selected.id === undefined ? {} : { sourceId: selected.id }),
  };
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

function forceDefinition(
  context: BattleScribeCatalogueContext,
  id: string,
): BattleScribeForceDefinition {
  const pending = [...context.forces.definitions];
  while (pending.length > 0) {
    const definition = pending.shift();
    if (definition === undefined) {
      continue;
    }
    if (definition.source.id === id) {
      return definition;
    }
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
