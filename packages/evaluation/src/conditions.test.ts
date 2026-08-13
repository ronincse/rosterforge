import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
} from "@rosterforge/data-graph";
import {
  objectId,
  sourceId,
  type SourceFileProvenance,
} from "@rosterforge/foundation";
import {
  addRosterChildForce,
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
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
  evaluateRosterCondition,
  evaluateRosterSelectionCondition,
  evaluateRosterSelectionConditionGroup,
  type RosterSelectionConditionGroupSource,
  type RosterSelectionConditionSource,
} from "./conditions.js";
import type { EvaluationSelectionChoice } from "./selection-context.js";
import { evaluateRosterRepeat } from "./repeats.js";

describe("roster selection conditions", () => {
  it("counts matching sibling selections in parent scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const base = choice(context, "cost-base");
    const problems = choice(context, "cost-problems");
    const roster = addRootSelection(
      addRootSelection(emptyRoster(context), base, "selection-base"),
      problems,
      "selection-owner",
    );
    const owner = roster.forces[0]?.selections[1];
    const condition = problems.modifiers[2]?.conditions[0];
    expect(owner).toBeDefined();
    expect(condition).toBeDefined();
    if (owner === undefined || condition === undefined) {
      return;
    }

    const evaluated = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      condition,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      comparison: "atLeast",
      scope: "parent",
      minimum: 1,
      maximum: 1,
      observed: 1,
      expected: 1,
    });
    expect(evaluated.value.matching).toEqual([
      roster.forces[0]?.selections[0],
    ]);
  });

  it("uses selection amounts for selection-count conditions", () => {
    const context = catalogueContext(
      ["projection.gst", "cost-evaluation.cat"],
      "cost-evaluation",
    );
    const base = choice(context, "cost-base");
    const problems = choice(context, "cost-problems");
    const roster = addRootSelection(
      addRootSelection(
        emptyRoster(context),
        base,
        "selection-base-amount",
        2.5,
      ),
      problems,
      "selection-owner-amount",
    );
    const owner = roster.forces[0]?.selections[1];
    const source = problems.modifiers[2]?.conditions[0];
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined || base.id === undefined) {
      return;
    }

    const evaluated = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        condition(source, {
          type: "equalTo",
          scope: "parent",
          childId: base.id,
          value: "2.5",
        }),
      ),
    );

    expect(evaluated).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      minimum: 2.5,
      maximum: 2.5,
      observed: 2.5,
    });
  });

  it("derives exact rounded repeat counts from roster selection amounts", () => {
    const context = catalogueContext(
      ["projection.gst", "cost-evaluation.cat"],
      "cost-evaluation",
    );
    const base = choice(context, "cost-base");
    const problems = choice(context, "cost-problems");
    const roster = addRootSelection(
      addRootSelection(
        emptyRoster(context),
        base,
        "selection-repeat-base",
        2.5,
      ),
      problems,
      "selection-repeat-owner",
    );
    const owner = roster.forces[0]?.selections[1];
    expect(owner).toBeDefined();
    if (owner === undefined || base.id === undefined) {
      return;
    }
    const repeat = {
      field: "selections",
      scope: "roster",
      childId: base.id,
      value: 1,
      repeats: 2,
      percentValue: false,
      shared: false,
      includeChildSelections: true,
      includeChildForces: true,
      roundUp: false,
      source: base.occurrence.source,
      path: [...base.occurrence.path, "fixtureRepeat"],
      node: {
        attributes: {
          field: "selections",
          scope: "roster",
          childId: base.id,
          value: "1",
          repeats: "2",
          roundUp: "false",
        },
      },
    } as const;

    const roundedDown = successful(
      evaluateRosterRepeat(roster, context, owner, repeat),
    );
    const roundedUp = successful(
      evaluateRosterRepeat(roster, context, roster.forces[0]!, {
        ...repeat,
        roundUp: true,
        node: {
          attributes: { ...repeat.node.attributes, roundUp: "true" },
        },
      }),
    );
    const empty = emptyRoster(context);
    const absent = successful(
      evaluateRosterRepeat(empty, context, empty.forces[0]!, repeat),
    );
    const invalid = evaluateRosterRepeat(roster, context, owner, {
      ...repeat,
      value: 0,
      node: {
        attributes: { ...repeat.node.attributes, value: "0" },
      },
    });

    expect(roundedDown).toMatchObject({
      status: "exact",
      completeness: "complete",
      observed: 2.5,
      repetitions: 4,
    });
    expect(roundedUp).toMatchObject({
      status: "exact",
      completeness: "complete",
      observed: 2.5,
      repetitions: 6,
    });
    expect(absent).toMatchObject({
      status: "exact",
      completeness: "complete",
      observed: 0,
      repetitions: 0,
    });
    expect(invalid).toMatchObject({
      ok: true,
      value: {
        status: "unresolved",
        completeness: "incomplete",
      },
      diagnostics: [
        {
          code: "EVALUATION_REPEAT_VALUE_INVALID",
          location: {
            source: repeat.source,
            path: [...repeat.path, "@value"],
          },
        },
      ],
    });
  });

  it("honors child-selection inclusion in roster scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const parent = choice(context, "cost-base");
    const child = choice(context, "cost-child");
    const problems = choice(context, "cost-problems");
    let roster = addRootSelection(
      emptyRoster(context),
      parent,
      "selection-parent",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-parent"),
        {
          id: selectionOccurrenceId("selection-child"),
          definition: selectionReference(child),
        },
      ),
    );
    roster = addRootSelection(roster, problems, "selection-owner");
    const owner = roster.forces[0]?.selections[1];
    const source = problems.modifiers[2]?.conditions[0];
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined || child.id === undefined) {
      return;
    }
    const direct = condition(source, {
      scope: "roster",
      childId: child.id,
      includeChildSelections: false,
    });
    const recursive = condition(source, {
      scope: "roster",
      childId: child.id,
      includeChildSelections: true,
    });

    const directResult = successful(
      evaluateRosterSelectionCondition(roster, context, owner, direct),
    );
    const recursiveResult = successful(
      evaluateRosterSelectionCondition(roster, context, owner, recursive),
    );

    expect(directResult).toMatchObject({
      status: "unsatisfied",
      observed: 0,
    });
    expect(recursiveResult).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
  });

  it("counts the owner occurrence in self scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const base = choice(context, "cost-base");
    const problems = choice(context, "cost-problems");
    const roster = addRootSelection(
      emptyRoster(context),
      base,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    const source = problems.modifiers[2]?.conditions[0];
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined || base.id === undefined) {
      return;
    }

    const evaluated = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        condition(source, {
          type: "equalTo",
          scope: "self",
          childId: base.id,
          value: "1",
          includeChildSelections: false,
        }),
      ),
    );

    expect(evaluated).toMatchObject({
      scope: "self",
      status: "satisfied",
      observed: 1,
      matching: [owner],
    });
  });

  it("includes self descendants only when explicitly requested", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const parent = choice(context, "cost-base");
    const child = choice(context, "cost-child");
    const problems = choice(context, "cost-problems");
    let roster = addRootSelection(
      emptyRoster(context),
      parent,
      "selection-parent",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-parent"),
        {
          id: selectionOccurrenceId("selection-child"),
          definition: selectionReference(child),
        },
      ),
    );
    const owner = roster.forces[0]?.selections[0];
    const source = problems.modifiers[2]?.conditions[0];
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined || child.id === undefined) {
      return;
    }
    const direct = condition(source, {
      type: "equalTo",
      scope: "self",
      childId: child.id,
      value: "1",
      includeChildSelections: false,
    });
    const recursive = condition(source, {
      type: "equalTo",
      scope: "self",
      childId: child.id,
      value: "1",
      includeChildSelections: true,
    });

    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, direct),
      ),
    ).toMatchObject({ status: "unsatisfied", observed: 0 });
    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, recursive),
      ),
    ).toMatchObject({ status: "satisfied", observed: 1 });
  });

  it("evaluates ancestor and root-entry identity against IDs and categories", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const root = choice(context, "cost-base");
    const upgrade = choice(context, "cost-child");
    const detail = choice(context, "cost-detail");
    let roster = addRootSelection(
      emptyRoster(context),
      root,
      "selection-root",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-root"),
        {
          id: selectionOccurrenceId("selection-upgrade"),
          definition: selectionReference(upgrade),
        },
      ),
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-upgrade"),
        {
          id: selectionOccurrenceId("selection-detail"),
          definition: selectionReference(detail),
        },
      ),
    );
    const rootOccurrence = roster.forces[0]?.selections[0];
    const upgradeOccurrence = rootOccurrence?.selections[0];
    const owner = upgradeOccurrence?.selections[0];
    if (rootOccurrence === undefined || upgradeOccurrence === undefined || owner === undefined) {
      return;
    }

    const ancestorCategory = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "instanceOf",
          scope: "ancestor",
          childId: objectId("category-relic"),
        }),
      ),
    );
    const ancestorId = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "instanceOf",
          scope: "ancestor",
          childId: objectId("cost-base"),
        }),
      ),
    );
    const rootCategory = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "instanceOf",
          scope: "root-entry",
          childId: objectId("category-character"),
        }),
      ),
    );

    expect(ancestorCategory).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      matching: [upgradeOccurrence],
    });
    expect(ancestorId).toMatchObject({
      status: "satisfied",
      matching: [rootOccurrence],
    });
    expect(rootCategory).toMatchObject({
      status: "satisfied",
      matching: [rootOccurrence],
    });
  });

  it("evaluates self and immediate-parent identity without including descendants or siblings", () => {
    const context = catalogueContext(
      ["projection.gst", "cost-evaluation.cat"],
      "cost-evaluation",
    );
    const root = choice(context, "cost-base");
    const upgrade = choice(context, "cost-child");
    const detail = choice(context, "cost-detail");
    let roster = addRootSelection(
      emptyRoster(context),
      root,
      "selection-root",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-root"),
        {
          id: selectionOccurrenceId("selection-upgrade"),
          definition: selectionReference(upgrade),
        },
      ),
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-upgrade"),
        {
          id: selectionOccurrenceId("selection-detail"),
          definition: selectionReference(detail),
        },
      ),
    );
    const parent = roster.forces[0]?.selections[0]?.selections[0];
    const owner = parent?.selections[0];
    if (parent === undefined || owner === undefined) {
      return;
    }

    const cases = [
      {
        condition: syntheticCondition({
          type: "instanceOf",
          scope: "self",
          childId: objectId("model"),
        }),
        status: "satisfied",
        matching: [owner],
      },
      {
        condition: syntheticCondition({
          type: "instanceOf",
          scope: "self",
          childId: objectId("cost-base"),
        }),
        status: "unsatisfied",
        matching: [],
      },
      {
        condition: syntheticCondition({
          type: "notInstanceOf",
          scope: "self",
          childId: objectId("cost-detail"),
        }),
        status: "unsatisfied",
        matching: [owner],
      },
      {
        condition: syntheticCondition({
          type: "notInstanceOf",
          scope: "self",
          childId: objectId("category-relic"),
        }),
        status: "satisfied",
        matching: [],
      },
      {
        condition: syntheticCondition({
          type: "instanceOf",
          scope: "parent",
          childId: objectId("category-relic"),
        }),
        status: "satisfied",
        matching: [parent],
      },
      {
        condition: syntheticCondition({
          type: "instanceOf",
          scope: "parent",
          childId: objectId("cost-detail"),
          includeChildSelections: true,
        }),
        status: "unsatisfied",
        matching: [],
      },
      {
        condition: syntheticCondition({
          type: "notInstanceOf",
          scope: "parent",
          childId: objectId("cost-child"),
        }),
        status: "unsatisfied",
        matching: [parent],
      },
      {
        condition: syntheticCondition({
          type: "notInstanceOf",
          scope: "parent",
          childId: objectId("category-character"),
        }),
        status: "satisfied",
        matching: [],
      },
    ] as const;

    for (const expected of cases) {
      const evaluated = successful(
        evaluateRosterSelectionCondition(
          roster,
          context,
          owner,
          expected.condition,
        ),
      );
      expect(evaluated).toMatchObject({
        status: expected.status,
        completeness: "complete",
        observed: expected.matching.length,
        matching: expected.matching,
      });
    }
    expect(
      successful(
        evaluateRosterSelectionCondition(
          roster,
          context,
          parent,
          syntheticCondition({
            type: "instanceOf",
            scope: "self",
            childId: objectId("cost-detail"),
            includeChildSelections: true,
          }),
        ),
      ),
    ).toMatchObject({
      status: "unsatisfied",
      completeness: "complete",
      observed: 0,
      matching: [],
    });
    const rootOwner = roster.forces[0]?.selections[0];
    if (rootOwner === undefined) {
      return;
    }
    expect(
      successful(
        evaluateRosterSelectionCondition(
          roster,
          context,
          rootOwner,
          syntheticCondition({
            type: "instanceOf",
            scope: "parent",
            childId: objectId("cost-base"),
          }),
        ),
      ),
    ).toMatchObject({
      status: "unsatisfied",
      completeness: "complete",
      observed: 0,
      candidates: [],
    });
  });

  it("keeps unresolved self and parent identity candidates conservative", () => {
    const context = catalogueContext(
      ["projection.gst", "cost-evaluation.cat"],
      "cost-evaluation",
    );
    const root = choice(context, "cost-base");
    const detail = choice(context, "cost-detail");
    let roster = addRootSelection(
      emptyRoster(context),
      root,
      "selection-root",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-root"),
        {
          id: selectionOccurrenceId("selection-unknown"),
          definition: {
            kind: "selectionEntry",
            key: rosterDefinitionKey("unknown:identity-scope"),
          },
        },
      ),
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-unknown"),
        {
          id: selectionOccurrenceId("selection-detail"),
          definition: selectionReference(detail),
        },
      ),
    );
    const unresolvedOwner =
      roster.forces[0]?.selections[0]?.selections[0];
    const childOwner = unresolvedOwner?.selections[0];
    if (unresolvedOwner === undefined || childOwner === undefined) {
      return;
    }

    const self = evaluateRosterSelectionCondition(
      roster,
      context,
      unresolvedOwner,
      syntheticCondition({
        type: "instanceOf",
        scope: "self",
        childId: objectId("cost-child"),
      }),
    );
    const parent = evaluateRosterSelectionCondition(
      roster,
      context,
      childOwner,
      syntheticCondition({
        type: "notInstanceOf",
        scope: "parent",
        childId: objectId("cost-child"),
      }),
    );

    expect(self.ok).toBe(true);
    expect(parent.ok).toBe(true);
    if (!self.ok || !parent.ok) {
      return;
    }
    for (const evaluated of [self, parent]) {
      expect(evaluated.value).toMatchObject({
        status: "unresolved",
        completeness: "incomplete",
        minimum: 0,
        maximum: 1,
        candidates: [{ status: "unresolved" }],
      });
      expect(evaluated.value.observed).toBeUndefined();
      expect(evaluated.diagnostics).toEqual([
        expect.objectContaining({
          code: "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
        }),
      ]);
    }
  });

  it("counts root-entry and nearest typed-selection scopes", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const root = choice(context, "cost-base");
    const upgrade = choice(context, "cost-child");
    const detail = choice(context, "cost-detail");
    let roster = addRootSelection(
      emptyRoster(context),
      root,
      "selection-root",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-root"),
        {
          id: selectionOccurrenceId("selection-upgrade"),
          definition: selectionReference(upgrade),
        },
      ),
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-upgrade"),
        {
          id: selectionOccurrenceId("selection-detail"),
          definition: selectionReference(detail),
        },
      ),
    );
    const owner = roster.forces[0]?.selections[0]?.selections[0]?.selections[0];
    if (owner === undefined) {
      return;
    }

    const rootTypes = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "root-entry",
          childId: objectId("upgrade"),
          value: "1",
          includeChildSelections: true,
        }),
      ),
    );
    const rootAny = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "root-entry",
          childId: objectId("any"),
          value: "3",
          includeChildSelections: true,
        }),
      ),
    );
    const upgradeChildren = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "upgrade",
          childId: objectId("cost-detail"),
          value: "1",
          includeChildSelections: true,
        }),
      ),
    );
    const upgradeCategory = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "instanceOf",
          scope: "upgrade",
          childId: objectId("category-relic"),
        }),
      ),
    );
    const unitChildren = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "unit",
          childId: objectId("cost-child"),
          value: "1",
          includeChildSelections: true,
        }),
      ),
    );
    const modelSelf = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "model",
          childId: objectId("any"),
          value: "1",
          includeChildSelections: false,
        }),
      ),
    );
    const modelOrUnitIdentity = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "instanceOf",
          scope: "model-or-unit",
          childId: objectId("model"),
        }),
      ),
    );
    const selectionIdScope = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "cost-base",
          childId: objectId("cost-detail"),
          value: "1",
          includeChildSelections: true,
        }),
      ),
    );
    const categoryIdScope = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          scope: "category-character",
          childId: objectId("upgrade"),
          value: "1",
          includeChildSelections: true,
        }),
      ),
    );

    expect(rootTypes).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
    expect(rootAny).toMatchObject({
      status: "satisfied",
      observed: 3,
    });
    expect(upgradeChildren).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
    expect(upgradeCategory).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
    expect(unitChildren).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
    expect(modelSelf).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
    expect(modelOrUnitIdentity).toMatchObject({
      status: "satisfied",
      observed: 1,
    });
    expect(selectionIdScope).toMatchObject({
      status: "satisfied",
      observed: 1,
      scope: "cost-base",
    });
    expect(categoryIdScope).toMatchObject({
      status: "satisfied",
      observed: 1,
      scope: "category-character",
    });
  });

  it("diagnoses an unresolved nearest-upgrade scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const root = choice(context, "cost-base");
    let roster = addRootSelection(
      emptyRoster(context),
      root,
      "selection-root",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-root"),
        {
          id: selectionOccurrenceId("selection-unknown"),
          definition: {
            kind: "selectionEntry",
            key: rosterDefinitionKey("unknown:upgrade-scope"),
          },
        },
      ),
    );
    const owner = roster.forces[0]?.selections[0]?.selections[0];
    if (owner === undefined) {
      return;
    }

    const evaluated = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      syntheticCondition({
        type: "instanceOf",
        scope: "upgrade",
        childId: objectId("category-relic"),
      }),
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      candidates: [],
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_SCOPE_CANDIDATES_UNRESOLVED",
        location: expect.objectContaining({
          path: expect.arrayContaining(["@scope"]),
        }),
      }),
    ]);
  });

  it("does not treat unsupported or missing ID-valued scopes as empty selections", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const root = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      root,
      "selection-root",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) {
      throw new Error("Expected a root selection.");
    }

    const forceScope = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      syntheticCondition({
        type: "equalTo",
        scope: "force-patrol",
        childId: objectId("cost-base"),
        value: "0",
      }),
    );
    const missingScope = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      syntheticCondition({
        type: "equalTo",
        scope: "missing-scope-id",
        childId: objectId("cost-base"),
        value: "0",
      }),
    );

    expect(forceScope.ok).toBe(true);
    expect(missingScope.ok).toBe(true);
    if (!forceScope.ok || !missingScope.ok) {
      return;
    }
    expect(forceScope.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      candidates: [],
    });
    expect(forceScope.value.observed).toBeUndefined();
    expect(forceScope.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_SCOPE_TARGET_KIND_UNSUPPORTED",
        location: expect.objectContaining({
          path: expect.arrayContaining(["@scope"]),
        }),
        details: expect.objectContaining({
          targetId: "force-patrol",
          targetKinds: ["forceEntry"],
        }),
      }),
    ]);
    expect(missingScope.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      candidates: [],
    });
    expect(missingScope.value.observed).toBeUndefined();
    expect(missingScope.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_SCOPE_TARGET_NOT_FOUND",
        location: expect.objectContaining({
          path: expect.arrayContaining(["@scope"]),
        }),
        details: expect.objectContaining({
          targetId: "missing-scope-id",
          targetKinds: [],
        }),
      }),
    ]);
  });

  it("sums exact projected cost fields in a filtered selection scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const base = choice(context, "cost-base");
    const child = choice(context, "cost-child");
    let roster = addRootSelection(
      emptyRoster(context),
      base,
      "selection-base",
    );
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-base"),
        {
          id: selectionOccurrenceId("selection-child"),
          definition: selectionReference(child),
        },
      ),
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) {
      throw new Error("Expected a root selection.");
    }

    const allPoints = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          field: "cost-points",
          scope: "root-entry",
          childId: objectId("any"),
          value: "15",
          includeChildSelections: true,
        }),
      ),
    );
    const childPoints = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          field: "cost-points",
          scope: "root-entry",
          childId: objectId("cost-child"),
          value: "5",
          includeChildSelections: true,
        }),
      ),
    );
    const explicitZero = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "equalTo",
          field: "cost-supply",
          scope: "self",
          childId: objectId("cost-base"),
          value: "0",
        }),
      ),
    );

    expect(allPoints).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 15,
      minimum: 15,
      maximum: 15,
    });
    expect(allPoints.candidates).toHaveLength(2);
    expect(allPoints.matching).toEqual([
      roster.forces[0]?.selections[0],
      roster.forces[0]?.selections[0]?.selections[0],
    ]);
    expect(childPoints).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 5,
    });
    expect(explicitZero).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 0,
    });
  });

  it("leaves dynamic and malformed cost-field conditions unresolved", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const modifiedRoster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-modified"),
      "selection-modified",
    );
    const malformedRoster = addRootSelection(
      emptyRoster(context),
      choice(context, "cost-issues"),
      "selection-malformed",
    );
    const modifiedOwner = modifiedRoster.forces[0]?.selections[0];
    const malformedOwner = malformedRoster.forces[0]?.selections[0];
    if (modifiedOwner === undefined || malformedOwner === undefined) {
      throw new Error("Expected root selections.");
    }
    const source = syntheticCondition({
      type: "equalTo",
      field: "cost-points",
      scope: "self",
      childId: objectId("any"),
      value: "0",
    });

    const modified = evaluateRosterSelectionCondition(
      modifiedRoster,
      context,
      modifiedOwner,
      source,
    );
    const malformed = evaluateRosterSelectionCondition(
      malformedRoster,
      context,
      malformedOwner,
      source,
    );

    expect(modified.ok).toBe(true);
    expect(malformed.ok).toBe(true);
    if (!modified.ok || !malformed.ok) {
      return;
    }
    expect(modified.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(modified.value.observed).toBeUndefined();
    expect(modified.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_COST_MODIFIERS_UNSUPPORTED",
      }),
    ]);
    expect(malformed.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(malformed.value.observed).toBeUndefined();
    expect(malformed.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_COST_VALUE_UNRESOLVED",
      }),
    ]);
  });

  it("honors child-force inclusion in force scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const base = choice(context, "cost-base");
    const problems = choice(context, "cost-problems");
    let roster = addRootSelection(
      emptyRoster(context),
      problems,
      "selection-owner",
    );
    const definition = roster.forces[0]?.definition;
    if (definition === undefined) {
      throw new Error("Expected a root force.");
    }
    roster = successful(
      addRosterChildForce(roster, forceOccurrenceId("force-1"), {
        id: forceOccurrenceId("force-child"),
        definition,
      }),
    );
    roster = successful(
      addRosterSelectionToForce(roster, forceOccurrenceId("force-child"), {
        id: selectionOccurrenceId("selection-base"),
        definition: selectionReference(base),
      }),
    );
    const owner = roster.forces[0]?.selections[0];
    const source = problems.modifiers[2]?.conditions[0];
    expect(owner).toBeDefined();
    expect(source).toBeDefined();
    if (owner === undefined || source === undefined || base.id === undefined) {
      return;
    }
    const direct = condition(source, {
      scope: "force",
      childId: base.id,
      includeChildForces: false,
    });
    const recursive = condition(source, {
      scope: "force",
      childId: base.id,
      includeChildForces: true,
    });

    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, direct),
      ),
    ).toMatchObject({ status: "unsatisfied", observed: 0 });
    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, recursive),
      ),
    ).toMatchObject({ status: "satisfied", observed: 1 });
  });

  it("counts shared force definitions in roster scope", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const problems = choice(context, "cost-problems");
    let roster = addRootSelection(
      emptyRoster(context),
      problems,
      "selection-owner",
    );
    const definition = roster.forces[0]?.definition;
    if (definition === undefined) {
      throw new Error("Expected a root force.");
    }
    roster = successful(
      addRosterChildForce(roster, forceOccurrenceId("force-1"), {
        id: forceOccurrenceId("force-child"),
        definition,
      }),
    );
    const owner = roster.forces[0]?.selections[0];
    expect(owner).toBeDefined();
    if (owner === undefined) {
      return;
    }
    const direct = syntheticCondition({
      type: "equalTo",
      field: "forces",
      scope: "roster",
      childId: objectId("force-patrol"),
      value: "1",
      shared: true,
      includeChildForces: false,
    });
    const recursive = condition(direct, {
      value: "2",
      includeChildForces: true,
    });

    const directResult = successful(
      evaluateRosterSelectionCondition(roster, context, owner, direct),
    );
    const recursiveResult = successful(
      evaluateRosterSelectionCondition(roster, context, owner, recursive),
    );

    expect(directResult).toMatchObject({
      status: "satisfied",
      scope: "roster",
      observed: 1,
      matching: [roster.forces[0]],
    });
    expect(recursiveResult).toMatchObject({
      status: "satisfied",
      observed: 2,
      matching: [roster.forces[0], roster.forces[0]?.forces[0]],
      candidates: [
        { status: "match", effectiveIds: ["force-patrol"] },
        { status: "match", effectiveIds: ["force-patrol"] },
      ],
    });
  });

  it("diagnoses non-shared force-count conditions", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const problems = choice(context, "cost-problems");
    const roster = addRootSelection(
      emptyRoster(context),
      problems,
      "selection-owner",
    );
    const owner = roster.forces[0]?.selections[0];
    expect(owner).toBeDefined();
    if (owner === undefined) {
      return;
    }

    const evaluated = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      syntheticCondition({
        field: "forces",
        scope: "roster",
        childId: objectId("force-patrol"),
        shared: false,
      }),
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      candidates: [],
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_SHARED_UNSUPPORTED",
      }),
    ]);
  });

  it("evaluates supported count conditions for an exact force owner", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0];
    expect(owner).toBeDefined();
    expect(selected.id).toBeDefined();
    if (owner === undefined || selected.id === undefined) {
      return;
    }
    const source = syntheticCondition({
      field: "forces",
      scope: "roster",
      childId: objectId("force-patrol"),
      shared: true,
    });
    const selectionSource = syntheticCondition({
      field: "selections",
      scope: "force",
      childId: selected.id,
      shared: false,
      includeChildSelections: true,
    });

    const evaluated = evaluateRosterCondition(
      roster,
      context,
      owner,
      source,
    );
    const selections = evaluateRosterCondition(
      roster,
      context,
      owner,
      selectionSource,
    );
    const unsupported = evaluateRosterCondition(
      roster,
      context,
      owner,
      condition(selectionSource, {
        field: "cost-points",
        shared: false,
      }),
    );

    expect(evaluated.ok).toBe(true);
    expect(selections.ok).toBe(true);
    expect(unsupported.ok).toBe(true);
    if (!evaluated.ok || !selections.ok || !unsupported.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(selections.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      owner,
      status: "satisfied",
      observed: 1,
      matching: [owner],
    });
    expect(selections.value).toMatchObject({
      owner,
      status: "satisfied",
      observed: 1,
      matching: [roster.forces[0]?.selections[0]],
    });
    expect(unsupported.value.status).toBe("unresolved");
    expect(unsupported.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED",
      }),
    ]);
  });

  it("uses shared definition identity for linked selections", () => {
    const context = catalogueContext([
      "projection.gst",
      "materialization.cat",
    ], "materialization-catalogue");
    const linked = choice(context, "root-entry-link");
    const roster = addRootSelection(
      emptyRoster(context),
      linked,
      "selection-linked",
    );
    const owner = roster.forces[0]?.selections[0];
    expect(owner).toBeDefined();
    if (
      owner === undefined ||
      linked.id === undefined ||
      linked.definitionId === undefined
    ) {
      return;
    }
    const local = syntheticCondition({
      childId: linked.id,
      shared: false,
    });
    const shared = syntheticCondition({
      childId: linked.definitionId,
      shared: true,
    });

    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, local),
      ),
    ).toMatchObject({ status: "satisfied", observed: 1 });
    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, shared),
      ),
    ).toMatchObject({ status: "satisfied", observed: 1 });
  });

  it.each([
    ["atLeast", "1", "satisfied"],
    ["atMost", "0", "unsatisfied"],
    ["greaterThan", "0", "satisfied"],
    ["lessThan", "1", "unsatisfied"],
    ["equalTo", "1", "satisfied"],
    ["notEqualTo", "1", "unsatisfied"],
  ] as const)("evaluates %s selection-count comparisons", (type, value, status) => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined || selected.id === undefined) {
      return;
    }
    const source = syntheticCondition({
      type,
      value,
      childId: selected.id,
    });

    expect(
      successful(
        evaluateRosterSelectionCondition(roster, context, owner, source),
      ).status,
    ).toBe(status);
  });

  it("reports unresolved candidates while retaining count bounds", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    let roster = emptyRoster(context);
    roster = successful(
      addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-unknown"),
        definition: {
          kind: "selectionEntry",
          key: rosterDefinitionKey("unknown:key"),
        },
      }),
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) {
      return;
    }
    const source = syntheticCondition({
      type: "atLeast",
      value: "2",
      childId: objectId("cost-base"),
    });

    const evaluated = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      source,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      status: "unsatisfied",
      completeness: "incomplete",
      minimum: 0,
      maximum: 1,
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
      }),
    ]);
  });

  it("preserves unsupported condition forms with located diagnostics", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined || selected.id === undefined) {
      return;
    }
    const source: RosterSelectionConditionSource = {
      ...syntheticCondition({ childId: selected.id }),
      type: "instanceOf",
      field: "forces",
      scope: "ancestor",
      percentValue: true,
      node: {
        attributes: {
          type: "instanceOf",
          field: "forces",
          scope: "ancestor",
          childId: selected.id,
          value: "1",
          percentValue: "true",
          extensionBehavior: "future",
        },
      },
    };

    const evaluated = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      source,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.status).toBe("unresolved");
    expect(evaluated.value.condition).toBe(source);
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_CONDITION_SCOPE_UNSUPPORTED",
      "EVALUATION_CONDITION_SHARED_UNSUPPORTED",
      "EVALUATION_CONDITION_IDENTITY_SHAPE_UNSUPPORTED",
      "EVALUATION_CONDITION_ATTRIBUTES_UNSUPPORTED",
    ]);
    expect(evaluated.diagnostics.at(-1)?.location?.path?.at(-1)).toBe(
      "@extensionBehavior",
    );
  });

  it("evaluates containing-force identity conditions for selection owners", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) return;
    const instanceOf = syntheticCondition({
      type: "instanceOf",
      field: "selections",
      scope: "force",
      childId: objectId("force-patrol"),
      value: "1",
      shared: true,
    });
    const notInstanceOf = syntheticCondition({
      ...instanceOf,
      type: "notInstanceOf",
      childId: objectId("force-patrol-child"),
    });

    const instance = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      instanceOf,
    );
    const notInstance = evaluateRosterSelectionCondition(
      roster,
      context,
      owner,
      notInstanceOf,
    );

    expect(instance.ok).toBe(true);
    expect(notInstance.ok).toBe(true);
    if (!instance.ok || !notInstance.ok) return;
    expect(instance.value).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      identityComparison: "instanceOf",
      observed: 1,
      expected: 1,
      matching: [{ id: "force-1" }],
    });
    expect(notInstance.value).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      identityComparison: "notInstanceOf",
      observed: 0,
      expected: 1,
      matching: [],
    });
    expect(instance.diagnostics).toEqual([]);
    expect(notInstance.diagnostics).toEqual([]);
  });

  it("evaluates primary-catalogue identity without a roster-tree surrogate", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) {
      return;
    }
    const instance = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "instanceOf",
          scope: "primary-catalogue",
          childId: objectId("cost-evaluation"),
        }),
      ),
    );
    const different = successful(
      evaluateRosterSelectionCondition(
        roster,
        context,
        owner,
        syntheticCondition({
          type: "notInstanceOf",
          field: "forces",
          scope: "primary-catalogue",
          childId: objectId("another-catalogue"),
          shared: true,
        }),
      ),
    );

    expect(instance).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 1,
      matching: [context.document],
      candidates: [
        {
          occurrence: context.document,
          status: "match",
          effectiveIds: ["cost-evaluation"],
        },
      ],
    });
    expect(different).toMatchObject({
      status: "satisfied",
      completeness: "complete",
      observed: 0,
      matching: [],
    });
  });

  it("combines nested AND and OR groups without flattening them", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined || selected.id === undefined) {
      return;
    }
    const satisfied = syntheticCondition({ childId: selected.id });
    const unsatisfied = syntheticCondition({
      childId: objectId("cost-child"),
    });
    const nested = syntheticConditionGroup("and", [satisfied, satisfied]);
    const root = syntheticConditionGroup("or", [unsatisfied], [nested]);

    const evaluated = evaluateRosterSelectionConditionGroup(
      roster,
      context,
      owner,
      root,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.diagnostics).toEqual([]);
    expect(evaluated.value).toMatchObject({
      group: root,
      type: "or",
      status: "satisfied",
      completeness: "complete",
      conditions: [{ status: "unsatisfied" }],
      conditionGroups: [
        {
          group: nested,
          type: "and",
          status: "satisfied",
          conditions: [
            { status: "satisfied" },
            { status: "satisfied" },
          ],
        },
      ],
    });
  });

  it("retains incomplete branches even when OR truth is decisive", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    let roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    roster = successful(
      addRosterSelectionToForce(roster, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-unknown"),
        definition: {
          kind: "selectionEntry",
          key: rosterDefinitionKey("unknown:group-key"),
        },
      }),
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined || selected.id === undefined) {
      return;
    }
    const known = syntheticCondition({ childId: selected.id });
    const unresolved = syntheticCondition({
      childId: objectId("cost-child"),
    });
    const group = syntheticConditionGroup("or", [known, unresolved]);

    const evaluated = evaluateRosterSelectionConditionGroup(
      roster,
      context,
      owner,
      group,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      status: "satisfied",
      completeness: "incomplete",
      conditions: [
        { status: "satisfied" },
        { status: "unresolved", minimum: 0, maximum: 1 },
      ],
    });
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
      }),
      expect.objectContaining({
        code: "EVALUATION_CONDITION_CANDIDATES_UNRESOLVED",
      }),
    ]);
  });

  it("diagnoses empty and unknown condition groups", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) {
      return;
    }
    const group: RosterSelectionConditionGroupSource = {
      ...syntheticConditionGroup("and"),
      type: "xor",
      node: {
        attributes: { type: "xor", extensionBehavior: "future" },
      },
    };

    const evaluated = evaluateRosterSelectionConditionGroup(
      roster,
      context,
      owner,
      group,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value.status).toBe("unresolved");
    expect(evaluated.diagnostics.map((item) => item.code)).toEqual([
      "EVALUATION_CONDITION_GROUP_TYPE_UNSUPPORTED",
      "EVALUATION_CONDITION_GROUP_EMPTY",
      "EVALUATION_CONDITION_GROUP_ATTRIBUTES_UNSUPPORTED",
    ]);
  });

  it("keeps local condition groups observable and unresolved", () => {
    const context = catalogueContext([
      "projection.gst",
      "cost-evaluation.cat",
    ], "cost-evaluation");
    const selected = choice(context, "cost-base");
    const roster = addRootSelection(
      emptyRoster(context),
      selected,
      "selection-base",
    );
    const owner = roster.forces[0]?.selections[0];
    if (owner === undefined) {
      return;
    }
    const localGroup = {
      ...syntheticCondition({
        type: "atLeast",
        field: "selections",
        scope: "parent",
        value: "1",
      }),
      repeats: 1,
      conditions: [syntheticCondition({ type: "before" })],
      conditionGroups: [],
      localConditionGroups: [],
      path: ["catalogue", "localConditionGroup"],
    };
    const group: RosterSelectionConditionGroupSource = {
      ...syntheticConditionGroup("and"),
      localConditionGroups: [localGroup],
    };

    const evaluated = evaluateRosterSelectionConditionGroup(
      roster,
      context,
      owner,
      group,
    );

    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      return;
    }
    expect(evaluated.value).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
      conditions: [],
      conditionGroups: [],
      localConditionGroups: [localGroup],
    });
    expect(evaluated.value.group).toBe(group);
    expect(evaluated.diagnostics).toEqual([
      expect.objectContaining({
        code: "EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED",
        details: { count: 1 },
        location: {
          source: localGroup.source,
          path: localGroup.path,
        },
      }),
    ]);
  });
});

function catalogueContext(
  filenames: readonly string[],
  id: string,
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
    id: rosterId("condition-roster"),
    name: "Condition Roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions[0];
  if (force === undefined) {
    throw new Error("Condition fixture requires a force definition.");
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
      definition: selectionReference(selected),
      ...(amount === undefined ? {} : { amount }),
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

function projectionKey(source: {
  readonly source: { readonly sourceId: string };
  readonly path: readonly string[];
}) {
  return rosterDefinitionKeyForSource(source.source.sourceId, source.path);
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

function condition(
  source: RosterSelectionConditionSource,
  values: Partial<RosterSelectionConditionSource>,
): RosterSelectionConditionSource {
  return { ...source, ...values };
}

function syntheticCondition(
  values: Partial<RosterSelectionConditionSource>,
): RosterSelectionConditionSource {
  return {
    type: "atLeast",
    field: "selections",
    scope: "parent",
    childId: objectId("cost-base"),
    value: "1",
    shared: false,
    includeChildSelections: false,
    includeChildForces: false,
    source: provenance("synthetic-condition.cat"),
    path: ["catalogue", "condition"],
    node: {
      attributes: {
        type: "atLeast",
        field: "selections",
        scope: "parent",
        childId: "cost-base",
        value: "1",
      },
    },
    ...values,
  };
}

function syntheticConditionGroup(
  type: string,
  conditions: readonly RosterSelectionConditionSource[] = [],
  conditionGroups: readonly RosterSelectionConditionGroupSource[] = [],
): RosterSelectionConditionGroupSource {
  return {
    type,
    conditions,
    conditionGroups,
    source: provenance("synthetic-condition-group.cat"),
    path: ["catalogue", "conditionGroup"],
    node: { attributes: { type } },
  };
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
