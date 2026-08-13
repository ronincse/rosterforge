import { describe, expect, it } from "vitest";

import { objectId } from "@rosterforge/foundation";

import {
  addRosterChildForce,
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
  createRoster,
  duplicateRosterForce,
  duplicateRosterSelection,
  moveRosterForce,
  moveRosterSelection,
  reparentRosterForce,
  reparentRosterSelection,
  removeRosterForce,
  removeRosterSelection,
  replaceRosterForceDefinition,
  replaceRosterSelectionDefinition,
  renameRoster,
  setRosterForceName,
  setRosterSelectionAmount,
  setRosterSelectionName,
} from "./commands.js";
import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
  rosterSelectionAmount,
  selectionOccurrenceId,
  type RosterForceDefinitionReference,
  type RosterSelectionDefinitionReference,
} from "./types.js";

describe("immutable roster construction", () => {
  it("creates an empty roster while retaining its catalogue reference", () => {
    const catalogue = {
      kind: "catalogue" as const,
      key: rosterDefinitionKey("fixture:catalogue"),
      sourceId: objectId("catalogue-203"),
    };

    const roster = createRoster({
      id: rosterId("roster-1"),
      name: "First Roster",
      catalogue,
    });

    expect(roster).toEqual({
      id: "roster-1",
      name: "First Roster",
      catalogue,
      forces: [],
    });
    expect(roster.catalogue).toBe(catalogue);
  });

  it("appends root and child forces in order with structural sharing", () => {
    const initial = emptyRoster();
    const first = successful(
      addRosterForce(initial, {
        id: forceOccurrenceId("force-1"),
        definition: forceDefinition("force-definition-1"),
        name: "",
      }),
    );
    const second = successful(
      addRosterForce(first, {
        id: forceOccurrenceId("force-2"),
        definition: forceDefinition("force-definition-2"),
      }),
    );
    const unchangedSecondForce = second.forces[1];
    const nested = successful(
      addRosterChildForce(second, forceOccurrenceId("force-1"), {
        id: forceOccurrenceId("force-child"),
        definition: forceDefinition("force-definition-child"),
      }),
    );

    expect(initial.forces).toEqual([]);
    expect(nested.forces.map((force) => force.id)).toEqual([
      "force-1",
      "force-2",
    ]);
    expect(nested.forces[0]?.name).toBe("");
    expect(nested.forces[0]?.forces[0]?.id).toBe("force-child");
    expect(nested.forces[1]).toBe(unchangedSecondForce);
  });

  it("allows repeated definitions when occurrence IDs remain distinct", () => {
    const definition = forceDefinition("shared-force-definition");
    const first = successful(
      addRosterForce(emptyRoster(), {
        id: forceOccurrenceId("force-1"),
        definition,
      }),
    );
    const second = successful(
      addRosterForce(first, {
        id: forceOccurrenceId("force-2"),
        definition,
      }),
    );

    expect(second.forces).toHaveLength(2);
    expect(second.forces[0]?.definition).toBe(definition);
    expect(second.forces[1]?.definition).toBe(definition);
  });

  it("appends nested selections and preserves unaffected occurrences", () => {
    const withForce = successful(
      addRosterForce(emptyRoster(), {
        id: forceOccurrenceId("force-1"),
        definition: forceDefinition("force-definition-1"),
      }),
    );
    const first = successful(
      addRosterSelectionToForce(withForce, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-1"),
        definition: selectionDefinition("selection-definition-1"),
      }),
    );
    const second = successful(
      addRosterSelectionToForce(first, forceOccurrenceId("force-1"), {
        id: selectionOccurrenceId("selection-2"),
        definition: selectionDefinition("selection-definition-2"),
      }),
    );
    const unchangedSecondSelection = second.forces[0]?.selections[1];
    const nested = successful(
      addRosterSelectionToSelection(
        second,
        selectionOccurrenceId("selection-1"),
        {
          id: selectionOccurrenceId("selection-child"),
          definition: selectionDefinition("selection-definition-child"),
          name: "Child",
        },
      ),
    );

    expect(
      nested.forces[0]?.selections.map((selection) => selection.id),
    ).toEqual(["selection-1", "selection-2"]);
    expect(
      nested.forces[0]?.selections[0]?.selections[0],
    ).toMatchObject({ id: "selection-child", name: "Child" });
    expect(nested.forces[0]?.selections[1]).toBe(unchangedSecondSelection);
  });

  it("rejects duplicate force and selection occurrence IDs", () => {
    const withForce = successful(
      addRosterForce(emptyRoster(), {
        id: forceOccurrenceId("force-1"),
        definition: forceDefinition("force-definition-1"),
      }),
    );
    const duplicateForce = addRosterChildForce(
      withForce,
      forceOccurrenceId("force-1"),
      {
        id: forceOccurrenceId("force-1"),
        definition: forceDefinition("another-force-definition"),
      },
    );
    expect(duplicateForce).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_DUPLICATE_FORCE_ID" }),
      ],
    });

    const withSelection = successful(
      addRosterSelectionToForce(
        withForce,
        forceOccurrenceId("force-1"),
        {
          id: selectionOccurrenceId("selection-1"),
          definition: selectionDefinition("selection-definition-1"),
        },
      ),
    );
    const duplicateSelection = addRosterSelectionToSelection(
      withSelection,
      selectionOccurrenceId("selection-1"),
      {
        id: selectionOccurrenceId("selection-1"),
        definition: selectionDefinition("another-selection-definition"),
      },
    );
    expect(duplicateSelection).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_DUPLICATE_SELECTION_ID",
        }),
      ],
    });
  });

  it("diagnoses missing parents without changing the original roster", () => {
    const roster = emptyRoster();
    const missingForce = addRosterSelectionToForce(
      roster,
      forceOccurrenceId("missing-force"),
      {
        id: selectionOccurrenceId("selection-1"),
        definition: selectionDefinition("selection-definition-1"),
      },
    );
    const missingSelection = addRosterSelectionToSelection(
      roster,
      selectionOccurrenceId("missing-selection"),
      {
        id: selectionOccurrenceId("selection-2"),
        definition: selectionDefinition("selection-definition-2"),
      },
    );

    expect(missingForce).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_MISSING_PARENT_FORCE",
        }),
      ],
    });
    expect(missingSelection).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_MISSING_PARENT_SELECTION",
        }),
      ],
    });
    expect(roster.forces).toEqual([]);
  });

  it("does not introduce quantities, costs, evaluation, or validity state", () => {
    const roster = emptyRoster();

    expect(Object.hasOwn(roster, "costs")).toBe(false);
    expect(Object.hasOwn(roster, "validity")).toBe(false);
    expect(Object.hasOwn(roster, "completeness")).toBe(false);
    expect(Object.hasOwn(roster, "quantity")).toBe(false);
  });
});

describe("immutable roster editing", () => {
  it("renames the roster without copying its force tree", () => {
    const roster = editableRoster();
    const renamed = renameRoster(roster, "");

    expect(renamed.name).toBe("");
    expect(renamed.forces).toBe(roster.forces);
    expect(roster.name).toBe("Roster");
  });

  it("sets and clears nested force names with structural sharing", () => {
    const roster = editableRoster();
    const untouchedSecondForce = roster.forces[1];
    const named = successful(
      setRosterForceName(
        roster,
        forceOccurrenceId("force-child"),
        "Renamed Child",
      ),
    );
    const cleared = successful(
      setRosterForceName(
        named,
        forceOccurrenceId("force-child"),
        undefined,
      ),
    );

    expect(named.forces[0]?.forces[0]?.name).toBe("Renamed Child");
    expect(named.forces[1]).toBe(untouchedSecondForce);
    expect(Object.hasOwn(cleared.forces[0]?.forces[0] ?? {}, "name")).toBe(
      false,
    );
    expect(roster.forces[0]?.forces[0]?.name).toBe("Child Force");
  });

  it("sets nested selection names while preserving sibling identity", () => {
    const roster = editableRoster();
    const untouchedSibling = roster.forces[0]?.selections[1];
    const named = successful(
      setRosterSelectionName(
        roster,
        selectionOccurrenceId("selection-child"),
        "",
      ),
    );

    expect(
      named.forces[0]?.selections[0]?.selections[0]?.name,
    ).toBe("");
    expect(named.forces[0]?.selections[1]).toBe(untouchedSibling);
    expect(
      roster.forces[0]?.selections[0]?.selections[0]?.name,
    ).toBe("Child Selection");
  });

  it("sets positive finite selection amounts while absent remains one", () => {
    const roster = editableRoster();
    const untouchedSibling = roster.forces[0]?.selections[1];
    const selectionId = selectionOccurrenceId("selection-child");
    const updated = successful(
      setRosterSelectionAmount(roster, selectionId, 2.5),
    );
    const selection = updated.forces[0]?.selections[0]?.selections[0];

    expect(selection?.amount).toBe(2.5);
    expect(selection === undefined ? undefined : rosterSelectionAmount(selection)).toBe(2.5);
    expect(updated.forces[0]?.selections[1]).toBe(untouchedSibling);

    const cleared = successful(
      setRosterSelectionAmount(updated, selectionId, undefined),
    );
    const defaulted = cleared.forces[0]?.selections[0]?.selections[0];
    expect(Object.hasOwn(defaulted ?? {}, "amount")).toBe(false);
    expect(defaulted === undefined ? undefined : rosterSelectionAmount(defaulted)).toBe(1);

    for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(setRosterSelectionAmount(roster, selectionId, amount)).toEqual({
        ok: false,
        diagnostics: [
          expect.objectContaining({
            code: "ROSTER_MODEL_INVALID_SELECTION_AMOUNT",
          }),
        ],
      });
    }
  });

  it("validates amounts when adding selections and preserves them when duplicating", () => {
    const roster = editableRoster();
    expect(
      addRosterSelectionToForce(
        roster,
        forceOccurrenceId("force-1"),
        {
          id: selectionOccurrenceId("invalid-amount"),
          definition: selectionDefinition("invalid-amount-definition"),
          amount: 0,
        },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_INVALID_SELECTION_AMOUNT",
        }),
      ],
    });

    const withAmount = successful(
      setRosterSelectionAmount(
        roster,
        selectionOccurrenceId("selection-1"),
        3,
      ),
    );
    const duplicated = successful(
      duplicateRosterSelection(
        withAmount,
        selectionOccurrenceId("selection-1"),
        {
          selectionId: (id) => selectionOccurrenceId(`amount-copy-${id}`),
        },
      ),
    );
    expect(duplicated.forces[0]?.selections[1]?.amount).toBe(3);
  });

  it("replaces a nested force definition without changing occurrence state", () => {
    const roster = editableRoster();
    const source = roster.forces[0]?.forces[0];
    const untouchedRoot = roster.forces[1];
    const definition = forceDefinition("replacement-force-definition");
    const replaced = successful(
      replaceRosterForceDefinition(
        roster,
        forceOccurrenceId("force-child"),
        definition,
      ),
    );
    const replacement = replaced.forces[0]?.forces[0];

    expect(replacement).not.toBe(source);
    expect(replacement).toMatchObject({
      id: "force-child",
      name: "Child Force",
    });
    expect(replacement?.definition).toBe(definition);
    expect(replacement?.forces).toBe(source?.forces);
    expect(replacement?.selections).toBe(source?.selections);
    expect(replaced.forces[1]).toBe(untouchedRoot);
    expect(source?.definition.key).not.toBe(definition.key);
  });

  it("replaces a nested selection definition without clearing descendants", () => {
    const roster = editableRoster();
    const source = roster.forces[0]?.selections[0];
    const untouchedSibling = roster.forces[0]?.selections[1];
    const untouchedRoot = roster.forces[1];
    const definition = selectionDefinition("replacement-selection-definition");
    const replaced = successful(
      replaceRosterSelectionDefinition(
        roster,
        selectionOccurrenceId("selection-1"),
        definition,
      ),
    );
    const replacement = replaced.forces[0]?.selections[0];

    expect(replacement).not.toBe(source);
    expect(replacement).toMatchObject({
      id: "selection-1",
      name: "First Selection",
      selections: [{ id: "selection-child" }],
    });
    expect(replacement?.definition).toBe(definition);
    expect(replacement?.selections).toBe(source?.selections);
    expect(replaced.forces[0]?.selections[1]).toBe(untouchedSibling);
    expect(replaced.forces[1]).toBe(untouchedRoot);
  });

  it("treats equal definitions as no-ops and diagnoses missing replacements", () => {
    const roster = editableRoster();
    const forceDefinitionCopy = {
      ...roster.forces[0]!.definition,
    };
    const selectionDefinitionCopy = {
      ...roster.forces[0]!.selections[0]!.definition,
    };

    expect(
      successful(
        replaceRosterForceDefinition(
          roster,
          forceOccurrenceId("force-1"),
          forceDefinitionCopy,
        ),
      ),
    ).toBe(roster);
    expect(
      successful(
        replaceRosterSelectionDefinition(
          roster,
          selectionOccurrenceId("selection-1"),
          selectionDefinitionCopy,
        ),
      ),
    ).toBe(roster);
    expect(
      replaceRosterForceDefinition(
        roster,
        forceOccurrenceId("missing-force"),
        forceDefinition("replacement-force"),
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_FORCE" }),
      ],
    });
    expect(
      replaceRosterSelectionDefinition(
        roster,
        selectionOccurrenceId("missing-selection"),
        selectionDefinition("replacement-selection"),
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_SELECTION" }),
      ],
    });
  });

  it("removes a force and its complete subtree", () => {
    const roster = editableRoster();
    const untouchedSecondForce = roster.forces[1];
    const removed = successful(
      removeRosterForce(roster, forceOccurrenceId("force-child")),
    );

    expect(removed.forces[0]?.forces).toEqual([]);
    expect(removed.forces[1]).toBe(untouchedSecondForce);
    expect(roster.forces[0]?.forces[0]).toMatchObject({
      id: "force-child",
      selections: [{ id: "child-force-selection" }],
    });
  });

  it("removes a selection and all nested selections", () => {
    const roster = editableRoster();
    const untouchedSibling = roster.forces[0]?.selections[1];
    const removed = successful(
      removeRosterSelection(roster, selectionOccurrenceId("selection-1")),
    );

    expect(removed.forces[0]?.selections).toEqual([untouchedSibling]);
    expect(roster.forces[0]?.selections[0]).toMatchObject({
      id: "selection-1",
      selections: [{ id: "selection-child" }],
    });
  });

  it("reorders root forces without copying force occurrences", () => {
    const roster = editableRoster();
    const firstForce = roster.forces[0];
    const secondForce = roster.forces[1];
    const moved = successful(
      moveRosterForce(roster, forceOccurrenceId("force-2"), 0),
    );

    expect(moved.forces.map((force) => force.id)).toEqual([
      "force-2",
      "force-1",
    ]);
    expect(moved.forces[0]).toBe(secondForce);
    expect(moved.forces[1]).toBe(firstForce);
    expect(roster.forces.map((force) => force.id)).toEqual([
      "force-1",
      "force-2",
    ]);
  });

  it("reorders nested forces within their existing parent", () => {
    const roster = successful(
      addRosterChildForce(
        editableRoster(),
        forceOccurrenceId("force-1"),
        {
          id: forceOccurrenceId("force-child-2"),
          definition: forceDefinition("force-definition-child-2"),
        },
      ),
    );
    const firstChild = roster.forces[0]?.forces[0];
    const secondChild = roster.forces[0]?.forces[1];
    const untouchedRoot = roster.forces[1];
    const moved = successful(
      moveRosterForce(roster, forceOccurrenceId("force-child-2"), 0),
    );

    expect(moved.forces[0]?.forces.map((force) => force.id)).toEqual([
      "force-child-2",
      "force-child",
    ]);
    expect(moved.forces[0]?.forces[0]).toBe(secondChild);
    expect(moved.forces[0]?.forces[1]).toBe(firstChild);
    expect(moved.forces[1]).toBe(untouchedRoot);
  });

  it("reorders root and nested selections within their existing parents", () => {
    const roster = editableRoster();
    const firstSelection = roster.forces[0]?.selections[0];
    const secondSelection = roster.forces[0]?.selections[1];
    const movedRoot = successful(
      moveRosterSelection(
        roster,
        selectionOccurrenceId("selection-2"),
        0,
      ),
    );

    expect(
      movedRoot.forces[0]?.selections.map((selection) => selection.id),
    ).toEqual(["selection-2", "selection-1"]);
    expect(movedRoot.forces[0]?.selections[0]).toBe(secondSelection);
    expect(movedRoot.forces[0]?.selections[1]).toBe(firstSelection);

    const withNestedSibling = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("selection-1"),
        {
          id: selectionOccurrenceId("selection-child-2"),
          definition: selectionDefinition("selection-definition-child-2"),
        },
      ),
    );
    const firstChild =
      withNestedSibling.forces[0]?.selections[0]?.selections[0];
    const secondChild =
      withNestedSibling.forces[0]?.selections[0]?.selections[1];
    const untouchedRootForce = withNestedSibling.forces[1];
    const movedNested = successful(
      moveRosterSelection(
        withNestedSibling,
        selectionOccurrenceId("selection-child-2"),
        0,
      ),
    );

    expect(
      movedNested.forces[0]?.selections[0]?.selections.map(
        (selection) => selection.id,
      ),
    ).toEqual(["selection-child-2", "selection-child"]);
    expect(movedNested.forces[0]?.selections[0]?.selections[0]).toBe(
      secondChild,
    );
    expect(movedNested.forces[0]?.selections[0]?.selections[1]).toBe(
      firstChild,
    );
    expect(movedNested.forces[1]).toBe(untouchedRootForce);
  });

  it("returns the original roster when an occurrence is already in place", () => {
    const roster = editableRoster();

    expect(
      successful(moveRosterForce(roster, forceOccurrenceId("force-1"), 0)),
    ).toBe(roster);
    expect(
      successful(
        moveRosterSelection(
          roster,
          selectionOccurrenceId("selection-2"),
          1,
        ),
      ),
    ).toBe(roster);
  });

  it("diagnoses invalid reorder indices and missing occurrences", () => {
    const roster = editableRoster();
    const invalidForce = moveRosterForce(
      roster,
      forceOccurrenceId("force-1"),
      2,
    );
    const invalidSelection = moveRosterSelection(
      roster,
      selectionOccurrenceId("selection-child"),
      0.5,
    );

    expect(invalidForce).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_INVALID_REORDER_INDEX",
          details: {
            id: "force-1",
            kind: "force",
            siblingCount: 2,
            toIndex: 2,
          },
        }),
      ],
    });
    expect(invalidSelection).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_INVALID_REORDER_INDEX",
          details: {
            id: "selection-child",
            kind: "selection",
            siblingCount: 1,
            toIndex: 0.5,
          },
        }),
      ],
    });
    expect(
      moveRosterForce(roster, forceOccurrenceId("missing-force"), 0),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_FORCE" }),
      ],
    });
    expect(
      moveRosterSelection(
        roster,
        selectionOccurrenceId("missing-selection"),
        0,
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_SELECTION" }),
      ],
    });
  });

  it("duplicates a complete force subtree after its source", () => {
    const roster = editableRoster();
    const source = roster.forces[0];
    const untouchedSibling = roster.forces[1];
    const duplicated = successful(
      duplicateRosterForce(roster, forceOccurrenceId("force-1"), {
        forceId: (id) => forceOccurrenceId(`copy-${id}`),
        selectionId: (id) => selectionOccurrenceId(`copy-${id}`),
      }),
    );
    const copy = duplicated.forces[1];

    expect(duplicated.forces.map((force) => force.id)).toEqual([
      "force-1",
      "copy-force-1",
      "force-2",
    ]);
    expect(copy).toMatchObject({
      id: "copy-force-1",
      name: "First Force",
      forces: [{ id: "copy-force-child" }],
      selections: [
        {
          id: "copy-selection-1",
          selections: [{ id: "copy-selection-child" }],
        },
        { id: "copy-selection-2" },
      ],
    });
    expect(copy).not.toBe(source);
    expect(copy?.forces).not.toBe(source?.forces);
    expect(copy?.selections).not.toBe(source?.selections);
    expect(copy?.definition).toBe(source?.definition);
    expect(copy?.forces[0]?.definition).toBe(source?.forces[0]?.definition);
    expect(copy?.selections[0]?.definition).toBe(
      source?.selections[0]?.definition,
    );
    expect(duplicated.forces[2]).toBe(untouchedSibling);
  });

  it("duplicates a nested selection subtree as an independent sibling", () => {
    const roster = editableRoster();
    const source = roster.forces[0]?.selections[0];
    const untouchedRootForce = roster.forces[1];
    const duplicated = successful(
      duplicateRosterSelection(
        roster,
        selectionOccurrenceId("selection-1"),
        {
          selectionId: (id) => selectionOccurrenceId(`copy-${id}`),
        },
      ),
    );
    const copy = duplicated.forces[0]?.selections[1];

    expect(
      duplicated.forces[0]?.selections.map((selection) => selection.id),
    ).toEqual(["selection-1", "copy-selection-1", "selection-2"]);
    expect(copy).toMatchObject({
      id: "copy-selection-1",
      name: "First Selection",
      selections: [{ id: "copy-selection-child" }],
    });
    expect(copy).not.toBe(source);
    expect(copy?.selections).not.toBe(source?.selections);
    expect(copy?.definition).toBe(source?.definition);
    expect(copy?.selections[0]?.definition).toBe(
      source?.selections[0]?.definition,
    );
    expect(duplicated.forces[1]).toBe(untouchedRootForce);

    const renamedCopy = successful(
      setRosterSelectionName(
        duplicated,
        selectionOccurrenceId("copy-selection-1"),
        "Independent Copy",
      ),
    );
    expect(renamedCopy.forces[0]?.selections[1]?.name).toBe(
      "Independent Copy",
    );
    expect(renamedCopy.forces[0]?.selections[0]?.name).toBe(
      "First Selection",
    );
  });

  it("rejects every generated occurrence ID collision atomically", () => {
    const roster = editableRoster();
    const forceCollision = duplicateRosterForce(
      roster,
      forceOccurrenceId("force-1"),
      {
        forceId: () => forceOccurrenceId("force-2"),
        selectionId: (id) => selectionOccurrenceId(`copy-${id}`),
      },
    );
    const selectionCollision = duplicateRosterSelection(
      roster,
      selectionOccurrenceId("selection-1"),
      {
        selectionId: () => selectionOccurrenceId("copy-selection"),
      },
    );

    expect(forceCollision).toEqual({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "ROSTER_MODEL_DUPLICATE_FORCE_ID",
          details: { id: "force-2", kind: "force" },
        }),
      ]),
    });
    expect(selectionCollision).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_DUPLICATE_SELECTION_ID",
          details: { id: "copy-selection", kind: "selection" },
        }),
      ],
    });
    expect(roster.forces).toHaveLength(2);
    expect(roster.forces[0]?.selections).toHaveLength(2);
  });

  it("diagnoses missing duplication sources before requesting IDs", () => {
    const roster = editableRoster();
    let requestedId = false;
    const missingForce = duplicateRosterForce(
      roster,
      forceOccurrenceId("missing-force"),
      {
        forceId: (id) => {
          requestedId = true;
          return id;
        },
        selectionId: (id) => id,
      },
    );

    expect(missingForce).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_FORCE" }),
      ],
    });
    expect(requestedId).toBe(false);
    expect(
      duplicateRosterSelection(
        roster,
        selectionOccurrenceId("missing-selection"),
        { selectionId: (id) => id },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_SELECTION" }),
      ],
    });
  });

  it("reparents forces between root and nested sibling collections", () => {
    const roster = editableRoster();
    const secondForce = roster.forces[1];
    const nested = successful(
      reparentRosterForce(roster, forceOccurrenceId("force-2"), {
        kind: "force",
        parentId: forceOccurrenceId("force-1"),
        index: 1,
      }),
    );

    expect(nested.forces.map((force) => force.id)).toEqual(["force-1"]);
    expect(nested.forces[0]?.forces.map((force) => force.id)).toEqual([
      "force-child",
      "force-2",
    ]);
    expect(nested.forces[0]?.forces[1]).toBe(secondForce);

    const childForce = roster.forces[0]?.forces[0];
    const rooted = successful(
      reparentRosterForce(roster, forceOccurrenceId("force-child"), {
        kind: "root",
        index: 1,
      }),
    );
    expect(rooted.forces.map((force) => force.id)).toEqual([
      "force-1",
      "force-child",
      "force-2",
    ]);
    expect(rooted.forces[0]?.forces).toEqual([]);
    expect(rooted.forces[1]).toBe(childForce);
    expect(rooted.forces[2]).toBe(roster.forces[1]);
  });

  it("reparents selections between force and selection parents", () => {
    const roster = editableRoster();
    const secondSelection = roster.forces[0]?.selections[1];
    const nested = successful(
      reparentRosterSelection(
        roster,
        selectionOccurrenceId("selection-2"),
        {
          kind: "selection",
          parentId: selectionOccurrenceId("selection-1"),
          index: 1,
        },
      ),
    );

    expect(
      nested.forces[0]?.selections.map((selection) => selection.id),
    ).toEqual(["selection-1"]);
    expect(
      nested.forces[0]?.selections[0]?.selections.map(
        (selection) => selection.id,
      ),
    ).toEqual(["selection-child", "selection-2"]);
    expect(nested.forces[0]?.selections[0]?.selections[1]).toBe(
      secondSelection,
    );

    const childSelection =
      roster.forces[0]?.selections[0]?.selections[0];
    const movedToForce = successful(
      reparentRosterSelection(
        roster,
        selectionOccurrenceId("selection-child"),
        {
          kind: "force",
          parentId: forceOccurrenceId("force-child"),
          index: 1,
        },
      ),
    );
    expect(
      movedToForce.forces[0]?.selections[0]?.selections,
    ).toEqual([]);
    expect(
      movedToForce.forces[0]?.forces[0]?.selections.map(
        (selection) => selection.id,
      ),
    ).toEqual(["child-force-selection", "selection-child"]);
    expect(movedToForce.forces[0]?.forces[0]?.selections[1]).toBe(
      childSelection,
    );
  });

  it("supports same-parent relocation and identity no-ops", () => {
    const roster = editableRoster();
    const firstSelection = roster.forces[0]?.selections[0];
    const reordered = successful(
      reparentRosterSelection(
        roster,
        selectionOccurrenceId("selection-1"),
        {
          kind: "force",
          parentId: forceOccurrenceId("force-1"),
          index: 1,
        },
      ),
    );

    expect(
      reordered.forces[0]?.selections.map((selection) => selection.id),
    ).toEqual(["selection-2", "selection-1"]);
    expect(reordered.forces[0]?.selections[1]).toBe(firstSelection);
    expect(
      successful(
        reparentRosterForce(roster, forceOccurrenceId("force-2"), {
          kind: "root",
          index: 1,
        }),
      ),
    ).toBe(roster);
    expect(
      successful(
        reparentRosterSelection(
          roster,
          selectionOccurrenceId("selection-2"),
          {
            kind: "force",
            parentId: forceOccurrenceId("force-1"),
            index: 1,
          },
        ),
      ),
    ).toBe(roster);
  });

  it("rejects force and selection reparenting cycles", () => {
    const roster = editableRoster();

    expect(
      reparentRosterForce(roster, forceOccurrenceId("force-1"), {
        kind: "force",
        parentId: forceOccurrenceId("force-child"),
        index: 0,
      }),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_REPARENT_CYCLE",
          details: {
            id: "force-1",
            kind: "force",
            parentId: "force-child",
            parentKind: "force",
          },
        }),
      ],
    });
    expect(
      reparentRosterSelection(
        roster,
        selectionOccurrenceId("selection-1"),
        {
          kind: "selection",
          parentId: selectionOccurrenceId("selection-child"),
          index: 0,
        },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_REPARENT_CYCLE",
          details: {
            id: "selection-1",
            kind: "selection",
            parentId: "selection-child",
            parentKind: "selection",
          },
        }),
      ],
    });
    expect(roster.forces[0]?.forces[0]?.id).toBe("force-child");
    expect(roster.forces[0]?.selections[0]?.id).toBe("selection-1");
  });

  it("diagnoses missing reparenting parents and sources", () => {
    const roster = editableRoster();

    expect(
      reparentRosterForce(roster, forceOccurrenceId("force-2"), {
        kind: "force",
        parentId: forceOccurrenceId("missing-force"),
        index: 0,
      }),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_MISSING_PARENT_FORCE",
        }),
      ],
    });
    expect(
      reparentRosterSelection(
        roster,
        selectionOccurrenceId("selection-2"),
        {
          kind: "selection",
          parentId: selectionOccurrenceId("missing-selection"),
          index: 0,
        },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_MISSING_PARENT_SELECTION",
        }),
      ],
    });
    expect(
      reparentRosterForce(roster, forceOccurrenceId("missing-force"), {
        kind: "root",
        index: 0,
      }),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_FORCE" }),
      ],
    });
  });

  it("validates reparenting insertion indices after source removal", () => {
    const roster = editableRoster();

    expect(
      reparentRosterForce(roster, forceOccurrenceId("force-2"), {
        kind: "force",
        parentId: forceOccurrenceId("force-1"),
        index: 2,
      }),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_INVALID_REPARENT_INDEX",
          details: {
            id: "force-2",
            kind: "force",
            parentId: "force-1",
            parentKind: "force",
            siblingCount: 1,
            toIndex: 2,
          },
        }),
      ],
    });
    expect(
      reparentRosterSelection(
        roster,
        selectionOccurrenceId("selection-child"),
        {
          kind: "force",
          parentId: forceOccurrenceId("force-child"),
          index: 2,
        },
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "ROSTER_MODEL_INVALID_REPARENT_INDEX",
          details: {
            id: "selection-child",
            kind: "selection",
            parentId: "force-child",
            parentKind: "force",
            siblingCount: 1,
            toIndex: 2,
          },
        }),
      ],
    });
    expect(roster.forces).toHaveLength(2);
  });

  it("diagnoses missing edit targets without returning changed state", () => {
    const roster = editableRoster();

    expect(
      setRosterForceName(
        roster,
        forceOccurrenceId("missing-force"),
        "Missing",
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_FORCE" }),
      ],
    });
    expect(
      removeRosterSelection(
        roster,
        selectionOccurrenceId("missing-selection"),
      ),
    ).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: "ROSTER_MODEL_MISSING_SELECTION" }),
      ],
    });
  });
});

function emptyRoster() {
  return createRoster({
    id: rosterId("roster-1"),
    name: "Roster",
    catalogue: {
      kind: "catalogue",
      key: rosterDefinitionKey("fixture:catalogue"),
      sourceId: objectId("catalogue-203"),
    },
  });
}

function forceDefinition(key: string): RosterForceDefinitionReference {
  return {
    kind: "forceEntry",
    key: rosterDefinitionKey(`fixture:${key}`),
    sourceId: objectId(key),
  };
}

function selectionDefinition(
  key: string,
): RosterSelectionDefinitionReference {
  return {
    kind: "selectionEntry",
    key: rosterDefinitionKey(`fixture:${key}`),
    sourceId: objectId(key),
  };
}

function editableRoster() {
  const firstForce = successful(
    addRosterForce(emptyRoster(), {
      id: forceOccurrenceId("force-1"),
      definition: forceDefinition("force-definition-1"),
      name: "First Force",
    }),
  );
  const secondForce = successful(
    addRosterForce(firstForce, {
      id: forceOccurrenceId("force-2"),
      definition: forceDefinition("force-definition-2"),
      name: "Second Force",
    }),
  );
  const childForce = successful(
    addRosterChildForce(secondForce, forceOccurrenceId("force-1"), {
      id: forceOccurrenceId("force-child"),
      definition: forceDefinition("force-definition-child"),
      name: "Child Force",
    }),
  );
  const childForceSelection = successful(
    addRosterSelectionToForce(
      childForce,
      forceOccurrenceId("force-child"),
      {
        id: selectionOccurrenceId("child-force-selection"),
        definition: selectionDefinition("child-force-selection-definition"),
      },
    ),
  );
  const firstSelection = successful(
    addRosterSelectionToForce(
      childForceSelection,
      forceOccurrenceId("force-1"),
      {
        id: selectionOccurrenceId("selection-1"),
        definition: selectionDefinition("selection-definition-1"),
        name: "First Selection",
      },
    ),
  );
  const secondSelection = successful(
    addRosterSelectionToForce(
      firstSelection,
      forceOccurrenceId("force-1"),
      {
        id: selectionOccurrenceId("selection-2"),
        definition: selectionDefinition("selection-definition-2"),
        name: "Second Selection",
      },
    ),
  );
  return successful(
    addRosterSelectionToSelection(
      secondSelection,
      selectionOccurrenceId("selection-1"),
      {
        id: selectionOccurrenceId("selection-child"),
        definition: selectionDefinition("selection-definition-child"),
        name: "Child Selection",
      },
    ),
  );
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
