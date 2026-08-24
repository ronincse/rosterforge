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
  rosterDefinitionKey,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  inspectRosterSelectionConstraints,
  inspectRosterSelectionConstraintsInRoster,
  inspectRosterSelectionConstraint,
  inspectRosterSelectionConstraintWithSelectionConditions,
  inspectRosterSelectionConstraintWithUnconditionalModifiers,
  type RosterSelectionConstraintSource,
} from "./constraints.js";
import {
  indexEvaluationChoices,
  resolveEvaluationSelection,
  type EvaluationSelectionChoice,
} from "./selection-context.js";

describe("roster selection constraints", () => {
  it("deduplicates rematerialized wrappers for the same projected occurrence", () => {
    const context = catalogueContext();
    const selected = choice(context, "entry-alpha");
    const root = context.roots.roots.find(
      ({ materialized }) => materialized === selected,
    );
    expect(root).toBeDefined();
    if (root === undefined) {
      return;
    }
    const duplicate = {
      ...root,
      materialized: { ...selected },
    } as typeof root;
    const duplicatedContext: BattleScribeCatalogueContext = {
      ...context,
      roots: {
        ...context.roots,
        roots: [...context.roots.roots, duplicate],
      },
    };
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-alpha",
    );
    const occurrence = roster.forces[0]?.selections[0];
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) {
      return;
    }

    const resolution = resolveEvaluationSelection(
      occurrence,
      indexEvaluationChoices(duplicatedContext),
      true,
    );

    expect(resolution.status).toBe("resolved");
    expect(resolution.choices).toHaveLength(1);
    expect(resolution.choices[0]?.occurrence).toBe(selected.occurrence);
  });

  it("counts a constraint scoped by a containing entry id", () => {
    const context = catalogueContext();
    let roster = addRootSelection(
      emptyRoster(context),
      choice(context, "beef-cafe"),
      "id-root",
    );
    const addChild = (parent: string, id: string, child: string): void => {
      const entry = choice(context, id);
      roster = successful(
        addRosterSelectionToSelection(roster, selectionOccurrenceId(parent), {
          id: selectionOccurrenceId(child),
          definition: {
            kind: entry.kind,
            key: projectionKey(entry.occurrence),
            ...(entry.id === undefined ? {} : { sourceId: entry.id }),
          },
        }),
      );
    };
    addChild("id-root", "id-model-a", "id-model-1");
    addChild("id-root", "id-model-b", "id-model-2");
    addChild("id-model-1", "id-player", "id-player-1");
    addChild("id-model-2", "id-player", "id-player-2");

    const inspected = inspectRosterSelectionConstraintsInRoster(roster, context);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const report = inspected.value.selections
      .flatMap(({ constraints }) => constraints)
      .find(
        (candidate) =>
          candidate.constraint.node.attributes["id"] === "id-player-max",
      );

    // The scope names the Troupe by its own id, so the count spans both
    // models. A `parent` scope would see one each and pass.
    expect(report).toBeDefined();
    expect(report?.observed).toBe(2);
    expect(report?.limit).toBe(1);
    expect(report?.status).toBe("violated");
  });

  it("evaluates a bound carrying the automatic attribute", () => {
    const context = catalogueContext();
    let roster = addRootSelection(
      emptyRoster(context),
      choice(context, "auto-squad"),
      "auto-root",
    );
    // One model where the squad requires two.
    roster = successful(
      addRosterSelectionToSelection(roster, selectionOccurrenceId("auto-root"), {
        id: selectionOccurrenceId("auto-model-1"),
        definition: {
          kind: choice(context, "auto-model").kind,
          key: projectionKey(choice(context, "auto-model").occurrence),
          ...(choice(context, "auto-model").id === undefined
            ? {}
            : { sourceId: choice(context, "auto-model").id }),
        },
      }),
    );

    const inspected = inspectRosterSelectionConstraintsInRoster(roster, context);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const report = inspected.value.selections
      .flatMap(({ constraints }) => constraints)
      .find(
        (candidate) =>
          candidate.constraint.node.attributes["id"] === "auto-model-min",
      );

    // The `automatic` flag gates later bound-change repair, not initial
    // construction or whether the minimum holds. In the corpus it sits on
    // rules like Khorne Berzerker "min 5", which are plainly enforced, so the
    // bound is still evaluated rather than dismissed as an unknown attribute.
    expect(report).toBeDefined();
    expect(report?.status).toBe("violated");
    expect(report?.observed).toBe(1);
    expect(report?.limit).toBe(2);
  });

  it("counts a unit-scoped constraint across the whole unit", () => {
    const context = catalogueContext();
    let roster = addRootSelection(emptyRoster(context), choice(context, "scope-unit"), "scope-root");
    const addChild = (parent: string, id: string, child: string): void => {
      roster = successful(
        addRosterSelectionToSelection(roster, selectionOccurrenceId(parent), {
          id: selectionOccurrenceId(child),
          definition: {
            kind: choice(context, id).kind,
            key: projectionKey(choice(context, id).occurrence),
            ...(choice(context, id).id === undefined
              ? {}
              : { sourceId: choice(context, id).id }),
          },
        }),
      );
    };
    addChild("scope-root", "scope-model-a", "model-a");
    addChild("scope-root", "scope-model-b", "model-b");
    addChild("model-a", "scope-weapon-a", "weapon-a");
    addChild("model-b", "scope-weapon-a", "weapon-b");

    const inspected = inspectRosterSelectionConstraintsInRoster(roster, context);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const report = inspected.value.selections
      .flatMap(({ constraints }) => constraints)
      .find(
        (candidate) =>
          candidate.constraint.node.attributes["id"] === "scope-weapon-a-max",
      );
    expect(report).toBeDefined();

    // Each model holds one, so a `parent` scope would see 1 and pass. Counted
    // across the unit it is 2, which is what the cap actually means.
    expect(report?.observed).toBe(2);
    expect(report?.limit).toBe(1);
    expect(report?.status).toBe("violated");
  });

  it("collects selection reports in deterministic roster order", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    const option = choice(context, "entry-option");
    let roster = addRootSelection(
      emptyRoster(context),
      alpha,
      "selection-alpha",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-alpha"),
        {
          id: selectionOccurrenceId("selection-option"),
          definition: {
            kind: option.kind,
            key: projectionKey(option.occurrence),
            ...(option.id === undefined ? {} : { sourceId: option.id }),
          },
        },
      ),
    );
    roster = addRootSelection(
      roster,
      alpha,
      "selection-alpha-second",
    );

    const inspected = inspectRosterSelectionConstraintsInRoster(
      roster,
      context,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.value).toMatchObject({
      completeness: "incomplete",
      selections: [
        { constraints: expect.any(Array) },
        { constraints: [] },
        { constraints: expect.any(Array) },
      ],
    });
    expect(inspected.value.selections.map((item) => item.owner.id)).toEqual([
      "selection-alpha",
      "selection-option",
      "selection-alpha-second",
    ]);
    expect(inspected.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_CONSTRAINT_SCOPE_UNSUPPORTED",
      "EVALUATION_CONSTRAINT_SCOPE_UNSUPPORTED",
    ]);
    expect("status" in inspected.value).toBe(false);
    expect("validity" in inspected.value).toBe(false);
  });

  it("propagates modifier inspection scope through constraint collections", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    expect(owner).toBeDefined();
    if (owner === undefined) {
      return;
    }

    const selected = inspectRosterSelectionConstraints(
      roster,
      context,
      owner,
      { inspectionScope: "selectionConditions" },
    );
    const rosterWide = inspectRosterSelectionConstraintsInRoster(
      roster,
      context,
      { inspectionScope: "selectionConditions" },
    );

    expect(selected.ok).toBe(true);
    expect(rosterWide.ok).toBe(true);
    if (!selected.ok || !rosterWide.ok) {
      return;
    }
    expect(selected.value.inspectionScope).toBe("selectionConditions");
    expect(
      selected.value.constraints.find(
        (report) =>
          report.constraint.id === "constraint-conditional-parent",
      ),
    ).toMatchObject({
      inspectionScope: "selectionConditions",
      baseStatus: "violated",
      status: "satisfied",
      baseLimit: 1,
      limit: 2,
    });
    expect(rosterWide.value.inspectionScope).toBe("selectionConditions");
    expect(
      rosterWide.value.selections.every(
        (selection) =>
          selection.inspectionScope === "selectionConditions" &&
          selection.constraints.every(
            (report) => report.inspectionScope === "selectionConditions",
          ),
      ),
    ).toBe(true);
    expect("status" in rosterWide.value).toBe(false);
    expect("validity" in rosterWide.value).toBe(false);
  });

  it("distinguishes shared definition identity from entry-link identity", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    const shared = first.constraints.find(
      (candidate) => candidate.id === "constraint-shared-parent",
    );
    const linkLocal = first.constraints.find(
      (candidate) => candidate.id === "constraint-link-parent",
    );
    expect(owner).toBeDefined();
    expect(shared).toBeDefined();
    expect(linkLocal).toBeDefined();
    if (
      owner === undefined ||
      shared === undefined ||
      linkLocal === undefined
    ) {
      return;
    }

    const sharedResult = successful(
      inspectRosterSelectionConstraint(
        roster,
        context,
        owner,
        shared,
      ),
    );
    const localResult = successful(
      inspectRosterSelectionConstraint(
        roster,
        context,
        owner,
        linkLocal,
      ),
    );

    expect(sharedResult).toMatchObject({
      status: "violated",
      observed: 2,
      targetIds: ["shared-constrained"],
    });
    expect(localResult).toMatchObject({
      status: "satisfied",
      observed: 1,
      targetIds: ["constraint-link-one"],
    });
    expect(sharedResult.matching).toEqual(roster.forces[0]?.selections);
    expect(localResult.matching).toEqual([owner]);
  });

  it("separates base status from unsupported constraint modifiers", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-modified-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraint(
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
    expect(inspected.value.modifiers[0]).toBe(first.modifiers[0]);
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        location: {
          source: first.modifiers[0]?.source,
          path: first.modifiers[0]?.path,
        },
      }),
    ]);

    const modified = inspectRosterSelectionConstraintWithUnconditionalModifiers(
      roster,
      context,
      owner,
      constraint,
    );
    expect(modified.ok).toBe(true);
    if (!modified.ok) {
      return;
    }
    expect(modified.diagnostics).toEqual([]);
    expect(modified.value).toMatchObject({
      inspectionScope: "unconditionalModifiers",
      baseLimit: 1,
      limit: 2,
      baseStatus: "violated",
      status: "satisfied",
      completeness: "complete",
      modifierSequence: {
        baseValue: 1,
        value: 2,
        completeness: "complete",
        steps: [{ status: "applied", kind: "set", output: 2 }],
      },
    });
  });

  it("detects nested modifier groups targeting a constraint", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-group-modified-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const result = inspectRosterSelectionConstraint(
      roster,
      context,
      owner,
      constraint,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const inspected = result.value;

    expect(inspected).toMatchObject({
      baseStatus: "violated",
      status: "unresolved",
      completeness: "incomplete",
      modifiers: [],
      modifierGroups: [{ type: "and" }],
    });
    expect(inspected.modifierGroups[0]).toBe(first.modifierGroups[0]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
        location: {
          source: first.modifierGroups[0]?.source,
          path: first.modifierGroups[0]?.path,
        },
      }),
    ]);

    const modified = inspectRosterSelectionConstraintWithUnconditionalModifiers(
      roster,
      context,
      owner,
      constraint,
    );
    expect(modified.ok).toBe(true);
    if (!modified.ok) {
      return;
    }
    expect(modified.value).toMatchObject({
      baseStatus: "violated",
      status: "unresolved",
      modifierSequence: { completeness: "complete", steps: [] },
    });
    expect(modified.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED",
      }),
    ]);
  });

  it("does not apply conditional constraint modifiers in unconditional scope", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-conditional-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraintWithUnconditionalModifiers(
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
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_NUMERIC_MODIFIER_CONDITIONAL",
      }),
    ]);
  });

  it("applies constraint modifiers whose selection conditions are satisfied", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-conditional-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraintWithSelectionConditions(
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
      inspectionScope: "selectionConditions",
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
          conditions: [{ status: "satisfied", observed: 2 }],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "set", output: 2 }],
      },
    });
  });

  it("does not apply constraint modifiers whose conditions are unsatisfied", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const roster = addRootSelection(
      emptyRoster(context),
      first,
      "selection-link-one",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-conditional-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraintWithSelectionConditions(
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
      baseLimit: 1,
      limit: 1,
      baseStatus: "satisfied",
      status: "satisfied",
      completeness: "complete",
      modifierApplicability: [
        {
          status: "notApplicable",
          conditions: [{ status: "unsatisfied", observed: 1 }],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "notApplicable", input: 1 }],
      },
    });
  });

  /**
   * The shape that made this worth implementing.
   *
   * `value="-1"` is not a bound of minus one, it is the absence of a bound.
   * Settled by observation on 2026-08-24: New Recruit's wiki omits such a
   * constraint from an entry's rendered list entirely — the Vindicare
   * Assassin's Micromelta Round carries `max 1` and `min -1` and the page
   * prints only `max: 1`, and the Imperial Knights' Allocated Chivalric Points
   * carries a lone `max -1` and prints no constraint section at all.
   *
   * Both halves matter. The sentinel must not be read as a bound below zero,
   * which would report every selection as violating its own maximum; and it
   * must not swallow the real limit a modifier writes over it.
   */
  it("treats an unbounded limit as no bound until a modifier sets one", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-unbounded-parent",
    );
    expect(constraint).toBeDefined();
    if (constraint === undefined) {
      return;
    }

    const single = addRootSelection(
      emptyRoster(context),
      first,
      "selection-link-one",
    );
    const singleOwner = single.forces[0]?.selections[0];
    expect(singleOwner).toBeDefined();
    if (singleOwner === undefined) {
      return;
    }

    const unbounded = inspectRosterSelectionConstraintWithSelectionConditions(
      single,
      context,
      singleOwner,
      constraint,
    );

    expect(unbounded.ok).toBe(true);
    if (!unbounded.ok) {
      return;
    }
    // The condition is unsatisfied, so the sentinel is what stands. It costs
    // nothing: no diagnostic, and completeness stays complete.
    expect(unbounded.diagnostics).toEqual([]);
    expect(unbounded.value).toMatchObject({
      baseLimit: -1,
      limit: -1,
      baseStatus: "satisfied",
      status: "satisfied",
      completeness: "complete",
    });

    const pair = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const pairOwner = pair.forces[0]?.selections[0];
    expect(pairOwner).toBeDefined();
    if (pairOwner === undefined) {
      return;
    }

    const bounded = inspectRosterSelectionConstraintWithSelectionConditions(
      pair,
      context,
      pairOwner,
      constraint,
    );

    expect(bounded.ok).toBe(true);
    if (!bounded.ok) {
      return;
    }
    // Now the modifier applies and writes a real maximum of 1 over the
    // sentinel. Two selections exceed it, so the constraint is violated —
    // proving the sentinel does not permanently disable the bound.
    expect(bounded.value).toMatchObject({
      baseLimit: -1,
      limit: 1,
      status: "violated",
      completeness: "complete",
    });
  });

  it("applies nested grouped constraint modifiers with inherited conditions", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const second = choice(context, "constraint-link-two");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), first, "selection-link-one"),
      second,
      "selection-link-two",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-group-modified-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraintWithSelectionConditions(
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
      inspectionScope: "selectionConditions",
      baseLimit: 1,
      limit: 2,
      baseStatus: "violated",
      status: "satisfied",
      completeness: "complete",
      modifierGroupApplicability: [
        {
          group: { comment: "Grouped selection limit" },
          localStatus: "applicable",
          status: "applicable",
          conditions: [{ status: "satisfied", observed: 2 }],
          modifierGroups: [
            {
              localStatus: "applicable",
              status: "applicable",
              modifierApplicability: [
                { localStatus: "applicable", status: "applicable" },
              ],
            },
          ],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "increment", output: 2 }],
      },
    });
    expect(inspected.diagnostics).toEqual([]);
  });

  it("does not apply grouped constraint modifiers with unsatisfied inherited conditions", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const roster = addRootSelection(
      emptyRoster(context),
      first,
      "selection-link-one",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-group-modified-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraintWithSelectionConditions(
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
      baseLimit: 1,
      limit: 1,
      baseStatus: "satisfied",
      status: "satisfied",
      completeness: "complete",
      modifierGroupApplicability: [
        {
          localStatus: "notApplicable",
          status: "notApplicable",
          conditions: [{ status: "unsatisfied", observed: 1 }],
          modifierGroups: [
            {
              status: "notApplicable",
              modifierApplicability: [{ status: "notApplicable" }],
            },
          ],
        },
      ],
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "notApplicable", input: 1 }],
      },
    });
  });

  it("diagnoses a negative effective constraint limit", () => {
    const context = catalogueContext(
      ["projection.gst", "constraint-links.cat"],
      "constraint-links",
    );
    const first = choice(context, "constraint-link-one");
    const roster = addRootSelection(
      emptyRoster(context),
      first,
      "selection-link-one",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = first.constraints.find(
      (candidate) => candidate.id === "constraint-negative-effective",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraintWithUnconditionalModifiers(
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
      baseLimit: 0,
      limit: -1,
      baseStatus: "satisfied",
      status: "unresolved",
      completeness: "incomplete",
      modifierSequence: {
        completeness: "complete",
        steps: [{ status: "applied", kind: "decrement", output: -1 }],
      },
    });
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_EFFECTIVE_VALUE_NEGATIVE_UNSUPPORTED",
      }),
    ]);
  });

  it("inspects every owner constraint in projected order", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    const roster = addRootSelection(
      emptyRoster(context),
      alpha,
      "selection-alpha",
    );
    const owner = roster.forces[0]?.selections[0];
    expect(owner).toBeDefined();
    if (owner === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraints(
      roster,
      context,
      owner,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.value).toMatchObject({
      completeness: "incomplete",
      constraints: [
        { status: "satisfied", observed: 1, limit: 1 },
        { status: "satisfied", observed: 1, limit: 3 },
        { status: "satisfied", observed: 1, limit: 0 },
        { status: "unresolved", limit: 2 },
      ],
    });
    expect(inspected.value.choice).toBe(alpha);
    expect(inspected.value.constraints.map((item) => item.constraint.id)).toEqual(
      [
        "constraint-parent",
        "constraint-roster",
        "constraint-self",
        "constraint-id",
      ],
    );
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_SCOPE_UNSUPPORTED",
      }),
    ]);
    expect("status" in inspected.value).toBe(false);
    expect("validity" in inspected.value).toBe(false);
  });

  it("reports a parent maximum without setting roster validity", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), alpha, "selection-alpha-1"),
      alpha,
      "selection-alpha-2",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = alpha.constraints.find(
      (candidate) => candidate.id === "constraint-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraint(
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
      status: "violated",
      completeness: "complete",
      minimum: 2,
      maximum: 2,
      observed: 2,
      limit: 1,
      targetIds: ["entry-alpha"],
      matching: roster.forces[0]?.selections,
    });
    expect(inspected.value.constraint).toBe(constraint);
    expect(inspected.value.owner).toBe(owner);
    expect("validity" in inspected.value).toBe(false);
  });

  it("uses selection amounts for selection-count constraints", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    const roster = addRootSelection(
      addRootSelection(
        emptyRoster(context),
        alpha,
        "selection-alpha-amount",
        2,
      ),
      alpha,
      "selection-alpha-default-amount",
    );
    const owner = roster.forces[0]?.selections[0];
    const constraint = alpha.constraints.find(
      (candidate) => candidate.id === "constraint-parent",
    );
    expect(owner).toBeDefined();
    expect(constraint).toBeDefined();
    if (owner === undefined || constraint === undefined) {
      return;
    }

    const inspected = successful(
      inspectRosterSelectionConstraint(roster, context, owner, constraint),
    );

    expect(inspected).toMatchObject({
      status: "violated",
      completeness: "complete",
      minimum: 3,
      maximum: 3,
      observed: 3,
      limit: 1,
    });
  });

  it("supports self, force, and roster selection-count scopes", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), alpha, "selection-alpha-1"),
      alpha,
      "selection-alpha-2",
    );
    const owner = roster.forces[0]?.selections[0];
    const source = alpha.constraints.find(
      (candidate) => candidate.id === "constraint-roster",
    );
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined) {
      return;
    }

    const self = successful(
      inspectRosterSelectionConstraint(
        roster,
        context,
        owner,
        constraint(source, { type: "min", scope: "self", value: 1 }),
      ),
    );
    const force = successful(
      inspectRosterSelectionConstraint(
        roster,
        context,
        owner,
        constraint(source, { type: "max", scope: "force", value: 1 }),
      ),
    );
    const rosterWide = successful(
      inspectRosterSelectionConstraint(
        roster,
        context,
        owner,
        constraint(source, { type: "max", scope: "roster", value: 2 }),
      ),
    );

    expect(self).toMatchObject({
      status: "satisfied",
      scope: "self",
      observed: 1,
    });
    expect(force).toMatchObject({
      status: "violated",
      scope: "force",
      observed: 2,
    });
    expect(rosterWide).toMatchObject({
      status: "satisfied",
      scope: "roster",
      observed: 2,
    });
  });

  it("retains decisive constraint status with unresolved candidates", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    let roster = addRootSelection(
      emptyRoster(context),
      alpha,
      "selection-alpha",
    );
    roster = successful(
      addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-unknown"),
        definition: {
          kind: "selectionEntry",
          key: rosterDefinitionKey("unavailable-definition"),
        },
      }),
    );
    const owner = roster.forces[0]?.selections[0];
    const source = alpha.constraints.find(
      (candidate) => candidate.id === "constraint-parent",
    );
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined) {
      return;
    }

    const inspected = inspectRosterSelectionConstraint(
      roster,
      context,
      owner,
      constraint(source, { value: 0 }),
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }
    expect(inspected.value).toMatchObject({
      status: "violated",
      completeness: "incomplete",
      minimum: 1,
      maximum: 2,
      limit: 0,
    });
    expect(inspected.value.observed).toBeUndefined();
    expect(inspected.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_CANDIDATES_UNRESOLVED",
        location: {
          source: source.source,
          path: source.path,
        },
      }),
    ]);

    const uncertain = successful(
      inspectRosterSelectionConstraint(
        roster,
        context,
        owner,
        constraint(source, { value: 1 }),
      ),
    );
    expect(uncertain).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      minimum: 1,
      maximum: 2,
      limit: 1,
    });
  });

  it("diagnoses unsupported scopes and malformed limit behavior", () => {
    const context = catalogueContext();
    const alpha = choice(context, "entry-alpha");
    const roster = addRootSelection(
      emptyRoster(context),
      alpha,
      "selection-alpha",
    );
    const owner = roster.forces[0]?.selections[0];
    const idScoped = alpha.constraints.find(
      (candidate) => candidate.id === "constraint-id",
    );
    const parent = alpha.constraints.find(
      (candidate) => candidate.id === "constraint-parent",
    );
    expect(owner).toBeDefined();
    expect(idScoped).toBeDefined();
    expect(parent).toBeDefined();
    if (owner === undefined || idScoped === undefined || parent === undefined) {
      return;
    }

    const idResult = inspectRosterSelectionConstraint(
      roster,
      context,
      owner,
      idScoped,
    );
    expect(idResult.ok).toBe(true);
    if (!idResult.ok) {
      return;
    }
    expect(idResult.value.status).toBe("unresolved");
    expect(idResult.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_SCOPE_UNSUPPORTED",
        location: {
          source: idScoped.source,
          path: [...idScoped.path, "@scope"],
        },
      }),
    ]);

    const malformed: RosterSelectionConstraintSource = {
      ...parent,
      value: Number.NaN,
      percentValue: true,
      node: {
        attributes: {
          ...parent.node.attributes,
          value: "not-a-number",
          percentValue: "true",
          futureBehavior: "preserved",
        },
      },
    };
    const malformedResult = inspectRosterSelectionConstraint(
      roster,
      context,
      owner,
      malformed,
    );
    expect(malformedResult.ok).toBe(true);
    if (!malformedResult.ok) {
      return;
    }
    expect(malformedResult.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(malformedResult.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_CONSTRAINT_VALUE_INVALID",
      "EVALUATION_CONSTRAINT_PERCENT_UNSUPPORTED",
      "EVALUATION_CONSTRAINT_ATTRIBUTES_UNSUPPORTED",
    ]);

    // `-1` is the "no bound" sentinel and is supported; a *different* negative
    // is still unexplained, so it must keep withholding. This pins the edge of
    // the rule rather than the rule itself.
    const negativeResult = inspectRosterSelectionConstraint(
      roster,
      context,
      owner,
      constraint(parent, { value: -2 }),
    );
    expect(negativeResult.ok).toBe(true);
    if (!negativeResult.ok) {
      return;
    }
    expect(negativeResult.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONSTRAINT_VALUE_NEGATIVE_UNSUPPORTED",
      }),
    ]);

    const unboundedResult = inspectRosterSelectionConstraint(
      roster,
      context,
      owner,
      constraint(parent, { value: -1 }),
    );
    expect(unboundedResult.ok).toBe(true);
    if (!unboundedResult.ok) {
      return;
    }
    // Settled by observation on 2026-08-24: New Recruit's wiki omits a `-1`
    // constraint from an entry's rendered constraint list entirely, so it is
    // the absence of a bound and cannot be violated or cost completeness.
    expect(unboundedResult.diagnostics).toEqual([]);
    expect(unboundedResult.value).toMatchObject({
      status: "satisfied",
      completeness: "complete",
    });
  });
});

function catalogueContext(
  filenames: readonly string[] = ["projection.gst", "cost-evaluation.cat"],
  id = "cost-evaluation",
): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph(filenames.map(parseFixture));
  if (!graph.ok) {
    throw new Error("Fixture graph must resolve.");
  }
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) {
    throw new Error("Fixture contexts must compose.");
  }
  const context = contexts.value.catalogues.find(
    (candidate) => candidate.document.metadata.id === id,
  );
  if (context === undefined) {
    throw new Error(`Missing catalogue context ${id}.`);
  }
  return context;
}

function emptyRoster(context: BattleScribeCatalogueContext): Roster {
  let roster = createRoster({
    id: rosterId("constraint-roster"),
    name: "Constraint Roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions[0];
  if (force === undefined) {
    throw new Error("Constraint fixture requires a force definition.");
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
  amount?: number,
): Roster {
  return successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
      id: selectionOccurrenceId(id),
      definition: {
        kind: selected.kind,
        key: projectionKey(selected.occurrence),
        ...(selected.id === undefined ? {} : { sourceId: selected.id }),
      },
      ...(amount === undefined ? {} : { amount }),
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

function constraint(
  source: RosterSelectionConstraintSource,
  values: Partial<RosterSelectionConstraintSource>,
): RosterSelectionConstraintSource {
  return { ...source, ...values };
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
