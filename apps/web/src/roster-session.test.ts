import { describe, expect, it } from "vitest";

import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
  selectionOccurrenceId,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import {
  addLocalRosterChildSelection,
  addLocalRosterRootSelection,
  chooseLocalRosterChildGroupEntry,
  createLocalRosterSession,
  evaluateLocalRosterCosts,
  inspectLocalRosterChildChoices,
  inspectLocalRosterConstraints,
  inspectLocalRosterRootChoices,
  inspectLocalRosterSelectionAnnotation,
  inspectLocalRosterSelectionCharacteristics,
  inspectLocalRosterStructuralStatus,
  inspectLocalRosterSupportedValidation,
  localRosterChildChoices,
  localRosterRootChoiceGroups,
  localRosterRootChoices,
  localRosterSelectionChoice,
  localRosterSelectionCount,
  removeLocalRosterSelection,
  restoreLocalRosterSession,
  setLocalRosterSelectionAmount,
  setLocalRosterSelectionName,
} from "./roster-session.js";

describe("createLocalRosterSession", () => {
  it("creates one context-backed roster force while retaining source identity", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        { filename: "projection.cat", bytes: fixtureBytes("projection.cat") },
      ],
      {
        import: {
          batchId: "roster-session",
          importedAt: "2026-07-23T15:00:00.000Z",
        },
      },
    );

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "catalogue-203",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "force-local",
    );
    expect(catalogue).toBeDefined();
    expect(force).toBeDefined();
    if (catalogue === undefined || force === undefined) return;

    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-setup-1"),
      forceId: forceOccurrenceId("force-setup-1"),
      name: "First Local Roster",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.diagnostics).toEqual([]);
    expect(created.value.catalogue).toBe(catalogue);
    expect(created.value.forceDefinition).toBe(force);
    expect(created.value.roster).toMatchObject({
      id: "roster-setup-1",
      name: "First Local Roster",
      catalogue: {
        kind: "catalogue",
        sourceId: "catalogue-203",
      },
      forces: [
        {
          id: "force-setup-1",
          name: "Local Force",
          forces: [],
          selections: [],
        },
      ],
    });

    const rootChoice = localRosterRootChoices(catalogue)[0];
    expect(rootChoice).toBeDefined();
    if (rootChoice === undefined) return;
    const first = addLocalRosterRootSelection(created.value, rootChoice, {
      selectionId: selectionOccurrenceId("selection-setup-1"),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = addLocalRosterRootSelection(first.value, rootChoice, {
      selectionId: selectionOccurrenceId("selection-setup-2"),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.value.roster.forces[0]?.selections).toMatchObject([
      { id: "selection-setup-1", name: "Alpha" },
      { id: "selection-setup-2", name: "Alpha" },
    ]);
    expect(second.value.roster.forces[0]?.selections[0]?.definition).toEqual(
      second.value.roster.forces[0]?.selections[1]?.definition,
    );
    expect(second.value.catalogue).toBe(catalogue);
    expect(
      localRosterSelectionChoice(
        second.value,
        selectionOccurrenceId("selection-setup-1"),
      ),
    ).toBe(rootChoice.materialized);

    const childChoice = localRosterChildChoices(
      second.value,
      selectionOccurrenceId("selection-setup-1"),
    )[0];
    expect(childChoice).toBeDefined();
    if (childChoice === undefined) return;
    const withChild = addLocalRosterChildSelection(
      second.value,
      selectionOccurrenceId("selection-setup-1"),
      childChoice,
      { selectionId: selectionOccurrenceId("selection-child-1") },
    );
    expect(withChild.ok).toBe(true);
    if (!withChild.ok) return;
    expect(
      withChild.value.roster.forces[0]?.selections[0]?.selections,
    ).toMatchObject([{ id: "selection-child-1", name: "Options" }]);
    expect(
      localRosterSelectionChoice(
        withChild.value,
        selectionOccurrenceId("selection-child-1"),
      ),
    ).toBe(childChoice);
    expect(localRosterSelectionCount(withChild.value)).toBe(3);

    const renamed = setLocalRosterSelectionName(
      withChild.value,
      selectionOccurrenceId("selection-setup-1"),
      "Veteran Alpha",
    );
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.value.roster.forces[0]?.selections[0]).toMatchObject({
      id: "selection-setup-1",
      name: "Veteran Alpha",
      definition:
        withChild.value.roster.forces[0]?.selections[0]?.definition,
      selections:
        withChild.value.roster.forces[0]?.selections[0]?.selections,
    });
    expect(renamed.value.selectionChoices).toBe(
      withChild.value.selectionChoices,
    );

    const amounted = setLocalRosterSelectionAmount(
      renamed.value,
      selectionOccurrenceId("selection-setup-1"),
      2.5,
    );
    expect(amounted.ok).toBe(true);
    if (!amounted.ok) return;
    expect(amounted.value.roster.forces[0]?.selections[0]?.amount).toBe(2.5);
    expect(amounted.value.selectionChoices).toBe(renamed.value.selectionChoices);

    const costs = evaluateLocalRosterCosts(withChild.value);
    expect(costs.ok).toBe(true);
    if (!costs.ok) return;
    expect(costs.value.roster).toBe(withChild.value.roster);
    expect(costs.value.context).toBe(catalogue.context);
    expect(
      costs.value.selections.map(({ occurrence }) => occurrence.id),
    ).toEqual([
      "selection-setup-1",
      "selection-child-1",
      "selection-setup-2",
    ]);

    const constraints = inspectLocalRosterConstraints(withChild.value);
    expect(constraints.ok).toBe(true);
    if (!constraints.ok) return;
    expect(constraints.value.selections.roster).toBe(withChild.value.roster);
    expect(constraints.value.selections.context).toBe(catalogue.context);
    expect(constraints.value.forces.roster).toBe(withChild.value.roster);
    expect(constraints.value.forces.context).toBe(catalogue.context);
    expect(constraints.value.selections.selections).toHaveLength(3);
    expect(constraints.value.forces.forces).toHaveLength(1);
    expect(Object.hasOwn(constraints.value, "validity")).toBe(false);

    const removed = removeLocalRosterSelection(
      withChild.value,
      selectionOccurrenceId("selection-setup-1"),
    );
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(
      removed.value.roster.forces[0]?.selections.map(({ id }) => id),
    ).toEqual(["selection-setup-2"]);
    expect(
      removed.value.selectionChoices.has(
        selectionOccurrenceId("selection-child-1"),
      ),
    ).toBe(false);
    expect(second.value.roster.forces[0]?.selections).toHaveLength(2);
    expect(localRosterSelectionCount(removed.value)).toBe(1);
  });

  it("initializes a stepped conditional default as one amounted child", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "stepped-default-initialization.cat",
          bytes: fixtureBytes("stepped-default-initialization.cat"),
        },
      ],
      {
        import: {
          batchId: "stepped-default-initialization",
          importedAt: "2026-08-22T00:00:00.000Z",
        },
      },
    );
    if (!prepared.ok) throw new Error("Expected fixture catalogue.");
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "stepped-default-initialization",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "stepped-default-force",
    );
    const root = catalogue === undefined
      ? undefined
      : localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.id === "stepped-default-root",
        );
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      throw new Error("Expected the stepped initialization choices.");
    }
    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("stepped-default-roster"),
      forceId: forceOccurrenceId("stepped-default-force"),
      name: "Stepped Default Roster",
    });
    if (!created.ok) throw new Error("Expected roster session.");
    let nextId = 0;

    const initialized = addLocalRosterRootSelection(
      created.value,
      root,
      {
        selectionId: selectionOccurrenceId("stepped-default-root"),
        createSelectionId: () =>
          selectionOccurrenceId(`stepped-default-child-${++nextId}`),
      },
    );

    expect(initialized.ok).toBe(true);
    if (!initialized.ok) return;
    expect(initialized.diagnostics).toEqual([]);
    expect(nextId).toBe(2);
    expect(localRosterSelectionCount(initialized.value)).toBe(1_002);
    expect(initialized.value.selectionChoices.size).toBe(3);
    expect(
      initialized.value.roster.forces[0]?.selections[0]?.selections,
    ).toMatchObject([
      {
        id: "stepped-default-child-1",
        name: "Default Trigger",
      },
      {
        id: "stepped-default-child-2",
        name: "Stepped Amount",
        amount: 1000,
      },
    ]);
    expect(created.value.roster.forces[0]?.selections).toEqual([]);
    expect(
      [...initialized.value.selectionChoices.keys()].some((id) =>
        id.startsWith("__rosterforge-initialization-probe-"),
      ),
    ).toBe(false);
  });
  it("atomically expands supported minimum children and explicit defaults", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "selection-initialization.cat",
          bytes: fixtureBytes("selection-initialization.cat"),
        },
      ],
      {
        import: {
          batchId: "roster-initialization",
          importedAt: "2026-07-23T15:30:00.000Z",
        },
      },
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "selection-initialization",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "initialization-force",
    );
    const root = catalogue === undefined
      ? undefined
      : localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.id === "initialization-unit",
        );
    expect(catalogue).toBeDefined();
    expect(force).toBeDefined();
    expect(root).toBeDefined();
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      return;
    }
    expect(
      localRosterRootChoiceGroups(catalogue).map((group) => ({
        name: group.name,
        choices: group.choices.map(({ materialized }) =>
          materialized.name),
      })),
    ).toEqual([
      {
        name: "Units",
        choices: [
          "Initialization Unit",
          "Automatic Reconciliation Unit",
          "Duplicate Initialization Unit",
        ],
      },
      {
        name: "Configuration",
        choices: ["Disabled Automatic Root"],
      },
      {
        name: "Uncategorized",
        choices: ["Alpha"],
      },
    ]);
    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-initialization"),
      forceId: forceOccurrenceId("force-initialization"),
      name: "Initialized roster",
    });
    if (!created.ok) throw new Error("Expected roster creation.");
    let nextId = 0;

    const initialized = addLocalRosterRootSelection(
      created.value,
      root,
      {
        selectionId: selectionOccurrenceId("selection-initialization-root"),
        createSelectionId: () =>
          selectionOccurrenceId(`selection-auto-${++nextId}`),
      },
    );

    expect(initialized.ok).toBe(true);
    if (!initialized.ok) return;
    expect(initialized.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
    ]);
    expect(nextId).toBe(5);
    expect(localRosterSelectionCount(initialized.value)).toBe(6);
    expect(initialized.value.selectionChoices.size).toBe(6);
    const selectedRoot =
      initialized.value.roster.forces[0]?.selections[0];
    expect(selectedRoot?.name).toBe("Initialization Unit");
    expect(selectedRoot?.selections.map(({ name }) => name)).toEqual([
      "Required Model",
      "Required Model",
      "Default Option",
    ]);
    expect(
      selectedRoot?.selections
        .filter(({ name }) => name === "Required Model")
        .map(({ selections }) => selections.map(({ name }) => name)),
    ).toEqual([["Required Weapon"], ["Required Weapon"]]);
    expect(
      selectedRoot?.selections.some(
        ({ name }) =>
          name === "Default Group" ||
          name === "Manual Group" ||
          name === "Modified Child",
      ),
    ).toBe(false);

    const childChoices = inspectLocalRosterChildChoices(
      initialized.value,
      selectionOccurrenceId("selection-initialization-root"),
    );
    expect(childChoices.ok).toBe(true);
    if (!childChoices.ok) return;
    expect(childChoices.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
    ]);
    expect(childChoices.value.direct).toMatchObject([
      {
        choice: { id: "required-model", name: "Required Model" },
        minimum: 2,
        maximum: 2,
        remaining: 0,
        selected: [
          { name: "Required Model" },
          { name: "Required Model" },
        ],
        completeness: "complete",
      },
      {
        choice: { id: "modified-child", name: "Modified Child" },
        selected: [],
        completeness: "incomplete",
      },
    ]);
    expect(childChoices.value.groups).toMatchObject([
      {
        group: { id: "default-group", name: "Default Group" },
        minimum: 1,
        maximum: 1,
        remaining: 0,
        selected: [{ name: "Default Option" }],
        choices: [
          { id: "default-option", name: "Default Option" },
          { id: "alternate-option", name: "Alternate Option" },
        ],
      },
      {
        group: { id: "manual-group", name: "Manual Group" },
        minimum: 1,
        maximum: 1,
        remaining: 1,
        selected: [],
        choices: [
          { id: "manual-option-one", name: "Manual Option One" },
          { id: "manual-option-two", name: "Manual Option Two" },
        ],
      },
    ]);
    const pendingStructuralStatus =
      inspectLocalRosterStructuralStatus(initialized.value);
    expect(pendingStructuralStatus.ok).toBe(true);
    if (!pendingStructuralStatus.ok) return;
    expect(pendingStructuralStatus.value).toMatchObject({
      validity: "invalid",
      completeness: "incomplete",
    });
    expect(
      pendingStructuralStatus.value.bounds.find(
        (bound) =>
          bound.kind === "group" &&
          bound.group.id === "manual-group",
      ),
    ).toMatchObject({
      selectedCount: 0,
      status: "violated",
      completeness: "complete",
    });
    const pendingValidation =
      inspectLocalRosterSupportedValidation(initialized.value);
    expect(pendingValidation.ok).toBe(true);
    if (!pendingValidation.ok) return;
    expect(pendingValidation.value.status).toMatchObject({
      validity: "invalid",
      completeness: "incomplete",
      statusCounts: {
        violated: 1,
      },
    });
    expect(pendingValidation.value.status.structural).toBe(
      pendingValidation.value.structural,
    );
    expect(pendingValidation.value.status.selectionConstraints).toBe(
      pendingValidation.value.constraints.selections,
    );
    expect(pendingValidation.value.status.forceConstraints).toBe(
      pendingValidation.value.constraints.forces,
    );
    const manualGroup = childChoices.value.groups[1];
    const manualOptionTwo = manualGroup?.choices[1];
    if (manualGroup === undefined || manualOptionTwo === undefined) {
      throw new Error("Expected the manual group choices.");
    }
    const manuallyChosen = chooseLocalRosterChildGroupEntry(
      initialized.value,
      selectionOccurrenceId("selection-initialization-root"),
      manualGroup.group,
      manualOptionTwo,
      { selectionId: selectionOccurrenceId("selection-manual-two") },
    );
    expect(manuallyChosen.ok).toBe(true);
    if (!manuallyChosen.ok) return;
    expect(
      manuallyChosen.value.roster.forces[0]?.selections[0]?.selections
        .map(({ name }) => name),
    ).toEqual([
      "Required Model",
      "Required Model",
      "Default Option",
      "Manual Option Two",
    ]);
    expect(localRosterSelectionCount(manuallyChosen.value)).toBe(7);
    const satisfiedStructuralStatus =
      inspectLocalRosterStructuralStatus(manuallyChosen.value);
    expect(satisfiedStructuralStatus.ok).toBe(true);
    if (!satisfiedStructuralStatus.ok) return;
    expect(satisfiedStructuralStatus.value).toMatchObject({
      validity: "valid",
      completeness: "incomplete",
    });
    expect(
      satisfiedStructuralStatus.value.bounds.filter(
        ({ status }) => status === "violated",
      ),
    ).toEqual([]);
    const satisfiedValidation =
      inspectLocalRosterSupportedValidation(manuallyChosen.value);
    expect(satisfiedValidation.ok).toBe(true);
    if (!satisfiedValidation.ok) return;
    expect(satisfiedValidation.value.status).toMatchObject({
      validity: "valid",
      completeness: "incomplete",
      statusCounts: {
        violated: 0,
      },
    });
    expect(
      satisfiedValidation.value.status.statusCounts.unresolved,
    ).toBeGreaterThan(0);

    const refreshedChoices = inspectLocalRosterChildChoices(
      manuallyChosen.value,
      selectionOccurrenceId("selection-initialization-root"),
    );
    if (!refreshedChoices.ok) {
      throw new Error("Expected refreshed group choices.");
    }
    const refreshedManualGroup = refreshedChoices.value.groups[1];
    const manualOptionOne = refreshedManualGroup?.choices[0];
    if (
      refreshedManualGroup === undefined ||
      manualOptionOne === undefined
    ) {
      throw new Error("Expected the refreshed manual group.");
    }
    const replaced = chooseLocalRosterChildGroupEntry(
      manuallyChosen.value,
      selectionOccurrenceId("selection-initialization-root"),
      refreshedManualGroup.group,
      manualOptionOne,
      { selectionId: selectionOccurrenceId("selection-manual-one") },
    );
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(
      replaced.value.roster.forces[0]?.selections[0]?.selections
        .map(({ name }) => name),
    ).toEqual([
      "Required Model",
      "Required Model",
      "Default Option",
      "Manual Option One",
    ]);
    expect(
      replaced.value.selectionChoices.has(
        selectionOccurrenceId("selection-manual-two"),
      ),
    ).toBe(false);
    expect(
      manuallyChosen.value.roster.forces[0]?.selections[0]?.selections
        .at(-1)?.name,
    ).toBe("Manual Option Two");

    const duplicateId = addLocalRosterRootSelection(
      created.value,
      root,
      {
        selectionId: selectionOccurrenceId("selection-duplicate-root"),
        createSelectionId: () =>
          selectionOccurrenceId("selection-duplicate-root"),
      },
    );
    expect(duplicateId.ok).toBe(false);
    expect(duplicateId.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      "ROSTER_MODEL_DUPLICATE_SELECTION_ID",
    ]);
    expect(created.value.roster.forces[0]?.selections).toEqual([]);

    let automaticId = 0;
    const automaticallyCreated = createLocalRosterSession(
      catalogue,
      force,
      {
        rosterId: rosterId("roster-automatic-roots"),
        forceId: forceOccurrenceId("force-automatic-roots"),
        name: "Automatic roots",
        createSelectionId: () =>
          selectionOccurrenceId(`selection-created-${++automaticId}`),
      },
    );
    expect(automaticallyCreated.ok).toBe(true);
    if (!automaticallyCreated.ok) return;
    expect(
      automaticallyCreated.diagnostics.map(({ code }) => code),
    ).toEqual([
      "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
    ]);
    expect(automaticId).toBe(6);
    expect(localRosterSelectionCount(automaticallyCreated.value)).toBe(6);
    expect(
      automaticallyCreated.value.roster.forces[0]?.selections.map(
        ({ name }) => name,
      ),
    ).toEqual(["Initialization Unit"]);
    const rootChoiceStates = inspectLocalRosterRootChoices(
      automaticallyCreated.value,
    );
    expect(rootChoiceStates.ok).toBe(true);
    if (!rootChoiceStates.ok) return;
    expect(rootChoiceStates.diagnostics).toEqual([]);
    const stateByName = new Map(
      rootChoiceStates.value.groups.flatMap(({ choices }) =>
        choices.map((state) => [
          state.choice.materialized.name,
          state,
        ] as const),
      ),
    );
    expect(stateByName.get("Initialization Unit")).toMatchObject({
      minimum: 1,
      maximum: 1,
      remaining: 0,
      selected: [{ name: "Initialization Unit" }],
      completeness: "complete",
    });
    expect(stateByName.get("Duplicate Initialization Unit")).toMatchObject({
      minimum: 1,
      maximum: 1,
      remaining: 0,
      selected: [{ name: "Initialization Unit" }],
      completeness: "complete",
    });
    expect(stateByName.get("Disabled Automatic Root")).toMatchObject({
      minimum: 0,
      maximum: 1,
      remaining: 0,
      selected: [],
      completeness: "complete",
    });
  });

  it("clamps selected ordinary entries for automatic true constraints", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "selection-initialization.cat",
          bytes: fixtureBytes("selection-initialization.cat"),
        },
      ],
      {
        import: {
          batchId: "roster-automatic-reconciliation",
          importedAt: "2026-08-22T19:00:00.000Z",
        },
      },
    );
    if (!prepared.ok) {
      throw new Error("Expected automatic reconciliation fixture.");
    }
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "selection-initialization",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "initialization-force",
    );
    const root = catalogue === undefined
      ? undefined
      : localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.id === "automatic-reconciliation-unit",
        );
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      throw new Error("Expected automatic reconciliation choices.");
    }

    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-automatic-reconciliation"),
      forceId: forceOccurrenceId("force-automatic-reconciliation"),
      name: "Automatic reconciliation",
    });
    if (!created.ok) throw new Error("Expected roster creation.");
    const withRoot = addLocalRosterRootSelection(created.value, root, {
      selectionId: selectionOccurrenceId("automatic-reconciliation-root"),
    });
    if (!withRoot.ok) throw new Error("Expected reconciliation root.");

    const choices = localRosterChildChoices(
      withRoot.value,
      selectionOccurrenceId("automatic-reconciliation-root"),
    );
    const automatic = choices.find(
      ({ id }) => id === "automatic-default-model",
    );
    const alternate = choices.find(
      ({ id }) => id === "automatic-alternate-model",
    );
    const manual = choices.find(({ id }) => id === "manual-default-model");
    if (
      automatic === undefined ||
      alternate === undefined ||
      manual === undefined
    ) {
      throw new Error("Expected reconciliation child choices.");
    }

    const withAutomatic = addLocalRosterChildSelection(
      withRoot.value,
      selectionOccurrenceId("automatic-reconciliation-root"),
      automatic,
      {
        selectionId: selectionOccurrenceId("automatic-default-occurrence"),
        amount: 1,
      },
    );
    expect(withAutomatic.ok).toBe(true);
    if (!withAutomatic.ok) return;
    expect(withAutomatic.diagnostics).toEqual([]);
    expect(
      withAutomatic.value.roster.forces[0]?.selections[0]?.selections[0],
    ).toMatchObject({
      id: "automatic-default-occurrence",
      amount: 4,
    });

    const withDuplicate = addLocalRosterChildSelection(
      withAutomatic.value,
      selectionOccurrenceId("automatic-reconciliation-root"),
      automatic,
      {
        selectionId: selectionOccurrenceId(
          "automatic-duplicate-occurrence",
        ),
      },
    );
    expect(withDuplicate.ok).toBe(true);
    if (!withDuplicate.ok) return;
    expect(
      withDuplicate.value.roster.forces[0]?.selections[0]?.selections.map(
        ({ id, amount }) => ({ id, amount }),
      ),
    ).toEqual([
      { id: "automatic-default-occurrence", amount: 4 },
    ]);
    expect(
      withDuplicate.value.selectionChoices.has(
        selectionOccurrenceId("automatic-duplicate-occurrence"),
      ),
    ).toBe(false);

    const withAlternate = addLocalRosterChildSelection(
      withDuplicate.value,
      selectionOccurrenceId("automatic-reconciliation-root"),
      alternate,
      {
        selectionId: selectionOccurrenceId("automatic-alternate-occurrence"),
      },
    );
    expect(withAlternate.ok).toBe(true);
    if (!withAlternate.ok) return;
    expect(withAlternate.diagnostics).toEqual([]);
    expect(
      withAlternate.value.roster.forces[0]?.selections[0]?.selections[0],
    ).toMatchObject({
      id: "automatic-default-occurrence",
      amount: 3,
    });
    expect(
      withAutomatic.value.roster.forces[0]?.selections[0]?.selections[0]
        ?.amount,
    ).toBe(4);

    const inflated = setLocalRosterSelectionAmount(
      withAlternate.value,
      selectionOccurrenceId("automatic-default-occurrence"),
      9,
    );
    expect(inflated.ok).toBe(true);
    if (!inflated.ok) return;
    expect(
      inflated.value.roster.forces[0]?.selections[0]?.selections[0]?.amount,
    ).toBe(3);

    const withoutAlternate = removeLocalRosterSelection(
      inflated.value,
      selectionOccurrenceId("automatic-alternate-occurrence"),
    );
    expect(withoutAlternate.ok).toBe(true);
    if (!withoutAlternate.ok) return;
    expect(withoutAlternate.diagnostics).toEqual([]);
    expect(
      withoutAlternate.value.roster.forces[0]?.selections[0]?.selections[0]
        ?.amount,
    ).toBe(4);

    const withManual = addLocalRosterChildSelection(
      withoutAlternate.value,
      selectionOccurrenceId("automatic-reconciliation-root"),
      manual,
      {
        selectionId: selectionOccurrenceId("manual-default-occurrence"),
        amount: 1,
      },
    );
    expect(withManual.ok).toBe(true);
    if (!withManual.ok) return;
    expect(
      withManual.value.roster.forces[0]?.selections[0]?.selections.find(
        ({ id }) => id === "manual-default-occurrence",
      )?.amount,
    ).toBe(1);
  });

  it("fills and trims automatic groups in New Recruit order", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "selection-initialization.cat",
          bytes: fixtureBytes("selection-initialization.cat"),
        },
      ],
      {
        import: {
          batchId: "roster-automatic-groups",
          importedAt: "2026-08-22T19:30:00.000Z",
        },
      },
    );
    if (!prepared.ok) throw new Error("Expected automatic group fixture.");
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "selection-initialization",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "initialization-force",
    );
    const root =
      catalogue === undefined
        ? undefined
        : localRosterRootChoices(catalogue).find(
            ({ materialized }) =>
              materialized.id === "automatic-reconciliation-unit",
          );
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      throw new Error("Expected automatic group choices.");
    }

    let generatedId = 0;
    const createSelectionId = () =>
      selectionOccurrenceId("automatic-group-generated-" + ++generatedId);
    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-automatic-groups"),
      forceId: forceOccurrenceId("force-automatic-groups"),
      name: "Automatic groups",
    });
    if (!created.ok) throw new Error("Expected automatic group roster.");
    const withRoot = addLocalRosterRootSelection(created.value, root, {
      selectionId: selectionOccurrenceId("automatic-group-root"),
      createSelectionId,
    });
    if (!withRoot.ok) throw new Error("Expected automatic group root.");

    const inspected = inspectLocalRosterChildChoices(
      withRoot.value,
      selectionOccurrenceId("automatic-group-root"),
    );
    if (!inspected.ok) throw new Error("Expected child group inspection.");
    const sourceGroup = inspected.value.groups.find(
      ({ group }) => group.id === "automatic-source-group",
    );
    const preferredGroup = inspected.value.groups.find(
      ({ group }) => group.id === "automatic-preferred-group",
    );
    const trigger = localRosterChildChoices(
      withRoot.value,
      selectionOccurrenceId("automatic-group-root"),
    ).find(({ id }) => id === "automatic-activation-trigger");
    const preferredSecond = preferredGroup?.choices.find(
      ({ id }) => id === "automatic-preferred-second",
    );
    if (
      sourceGroup === undefined ||
      preferredGroup === undefined ||
      trigger === undefined ||
      preferredSecond === undefined
    ) {
      throw new Error("Expected both automatic groups and their triggers.");
    }

    const withoutFactory = addLocalRosterChildSelection(
      withRoot.value,
      selectionOccurrenceId("automatic-group-root"),
      trigger,
      {
        selectionId: selectionOccurrenceId(
          "automatic-group-trigger-without-factory",
        ),
      },
    );
    expect(withoutFactory.ok).toBe(true);
    if (!withoutFactory.ok) return;
    expect(withoutFactory.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SELECTION_ID_UNAVAILABLE",
        severity: "warning",
        impacts: ["compatibility"],
        location: {
          source: expect.objectContaining({
            filename: "selection-initialization.cat",
          }),
          path: expect.any(Array),
        },
        details: {
          parentId: "automatic-group-root",
          groupId: "automatic-source-group",
          target: 2,
        },
      }),
    );
    expect(
      withoutFactory.value.roster.forces[0]
        ?.selections[0]?.selections.some((selection) => {
          const choice = localRosterSelectionChoice(
            withoutFactory.value,
            selection.id,
          );
          return choice?.id === "automatic-source-first" ||
            choice?.id === "automatic-source-second";
        }),
    ).toBe(false);
    expect(
      withRoot.value.roster.forces[0]?.selections[0]?.selections.some(
        ({ id }) => id === "automatic-group-trigger-without-factory",
      ),
    ).toBe(false);
    const withTrigger = addLocalRosterChildSelection(
      withRoot.value,
      selectionOccurrenceId("automatic-group-root"),
      trigger,
      {
        selectionId: selectionOccurrenceId(
          "automatic-group-trigger-occurrence",
        ),
        createSelectionId,
      },
    );
    expect(withTrigger.ok).toBe(true);
    if (!withTrigger.ok) return;
    expect(withTrigger.diagnostics).toEqual([]);
    const sourceSelections = withTrigger.value.roster.forces[0]
      ?.selections[0]?.selections.flatMap((selection) => {
        const choice = localRosterSelectionChoice(
          withTrigger.value,
          selection.id,
        );
        return choice?.id === "automatic-source-first" ||
          choice?.id === "automatic-source-second"
          ? [{ choiceId: choice.id, amount: selection.amount ?? 1 }]
          : [];
      });
    expect(sourceSelections).toEqual([
      { choiceId: "automatic-source-first", amount: 1 },
      { choiceId: "automatic-source-second", amount: 1 },
    ]);

    const withoutTrigger = removeLocalRosterSelection(
      withTrigger.value,
      selectionOccurrenceId("automatic-group-trigger-occurrence"),
      { createSelectionId },
    );
    expect(withoutTrigger.ok).toBe(true);
    if (!withoutTrigger.ok) return;
    expect(withoutTrigger.diagnostics).toEqual([]);
    expect(
      withoutTrigger.value.roster.forces[0]
        ?.selections[0]?.selections.flatMap((selection) => {
          const choice = localRosterSelectionChoice(
            withoutTrigger.value,
            selection.id,
          );
          return choice?.id === "automatic-source-first" ||
            choice?.id === "automatic-source-second"
            ? [choice.id]
            : [];
        }),
    ).toEqual(["automatic-source-first"]);
    expect(sourceSelections).toHaveLength(2);

    const withPreferred = addLocalRosterChildSelection(
      withoutTrigger.value,
      selectionOccurrenceId("automatic-group-root"),
      preferredSecond,
      {
        selectionId: selectionOccurrenceId(
          "automatic-preferred-second-occurrence",
        ),
        createSelectionId,
      },
    );
    expect(withPreferred.ok).toBe(true);
    if (!withPreferred.ok) return;
    expect(withPreferred.diagnostics).toEqual([]);
    expect(
      withPreferred.value.roster.forces[0]
        ?.selections[0]?.selections.flatMap((selection) => {
          const choice = localRosterSelectionChoice(
            withPreferred.value,
            selection.id,
          );
          return choice?.id === "automatic-preferred-first" ||
            choice?.id === "automatic-preferred-second"
            ? [{ choiceId: choice.id, amount: selection.amount ?? 1 }]
            : [];
        }),
    ).toEqual([
      { choiceId: "automatic-preferred-second", amount: 2 },
    ]);
  });
  it("activates absent ordinary entries for automatic true minima", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "selection-initialization.cat",
          bytes: fixtureBytes("selection-initialization.cat"),
        },
      ],
      {
        import: {
          batchId: "roster-automatic-activation",
          importedAt: "2026-08-22T20:00:00.000Z",
        },
      },
    );
    if (!prepared.ok) {
      throw new Error("Expected automatic activation fixture.");
    }
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "selection-initialization",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "initialization-force",
    );
    const root = catalogue === undefined
      ? undefined
      : localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.id === "automatic-reconciliation-unit",
        );
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      throw new Error("Expected automatic activation choices.");
    }

    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-automatic-activation"),
      forceId: forceOccurrenceId("force-automatic-activation"),
      name: "Automatic activation",
    });
    if (!created.ok) throw new Error("Expected roster creation.");
    const withoutFactory = addLocalRosterRootSelection(
      created.value,
      root,
      {
        selectionId: selectionOccurrenceId(
          "automatic-activation-no-factory-root",
        ),
      },
    );
    expect(withoutFactory.ok).toBe(true);
    if (!withoutFactory.ok) return;
    const unavailable = withoutFactory.diagnostics.find(
      ({ code }) =>
        code ===
        "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SELECTION_ID_UNAVAILABLE",
    );
    expect(unavailable).toMatchObject({
      severity: "warning",
      impacts: ["compatibility"],
      location: {
        source: expect.objectContaining({
          filename: "selection-initialization.cat",
        }),
        path: expect.any(Array),
      },
      details: {
        parentId: "automatic-activation-no-factory-root",
        choiceId: "automatic-default-model",
        amount: 4,
      },
    });
    expect(unavailable?.location?.path).not.toHaveLength(0);
    expect(
      withoutFactory.value.roster.forces[0]?.selections[0]?.selections,
    ).toEqual([]);

    let generatedId = 0;
    const createSelectionId = () =>
      selectionOccurrenceId(
        "automatic-generated-" + ++generatedId,
      );
    const withRoot = addLocalRosterRootSelection(created.value, root, {
      selectionId: selectionOccurrenceId("automatic-activation-root"),
      createSelectionId,
    });
    expect(withRoot.ok).toBe(true);
    if (!withRoot.ok) return;
    expect(
      withRoot.value.roster.forces[0]?.selections[0]?.selections.find(
        (selection) =>
          localRosterSelectionChoice(
            withRoot.value,
            selection.id,
          )?.id === "automatic-default-model",
      ),
    ).toMatchObject({ amount: 4 });

    const trigger = localRosterChildChoices(
      withRoot.value,
      selectionOccurrenceId("automatic-activation-root"),
    ).find(({ id }) => id === "automatic-activation-trigger");
    if (trigger === undefined) {
      throw new Error("Expected the automatic activation trigger.");
    }
    const withTrigger = addLocalRosterChildSelection(
      withRoot.value,
      selectionOccurrenceId("automatic-activation-root"),
      trigger,
      {
        selectionId: selectionOccurrenceId(
          "automatic-activation-trigger-occurrence",
        ),
        createSelectionId,
      },
    );
    expect(withTrigger.ok).toBe(true);
    if (!withTrigger.ok) return;
    expect(withTrigger.diagnostics).toEqual([]);
    const activated = withTrigger.value.roster.forces[0]
      ?.selections[0]?.selections.find(
        (selection) =>
          localRosterSelectionChoice(
            withTrigger.value,
            selection.id,
          )?.id === "automatic-activated-upgrade",
      );
    expect(activated).toMatchObject({ amount: 1 });
    expect(
      withTrigger.value.roster.forces[0]?.selections[0]?.selections.some(
        ({ id }) => id.startsWith("__rosterforge_automatic_probe_"),
      ),
    ).toBe(false);
    expect(
      withRoot.value.roster.forces[0]?.selections[0]?.selections.some(
        (selection) =>
          localRosterSelectionChoice(
            withRoot.value,
            selection.id,
          )?.id === "automatic-activated-upgrade",
      ),
    ).toBe(false);

    const withoutTrigger = removeLocalRosterSelection(
      withTrigger.value,
      selectionOccurrenceId(
        "automatic-activation-trigger-occurrence",
      ),
      { createSelectionId },
    );
    expect(withoutTrigger.ok).toBe(true);
    if (!withoutTrigger.ok) return;
    expect(
      withoutTrigger.value.roster.forces[0]?.selections[0]?.selections.some(
        (selection) =>
          localRosterSelectionChoice(
            withoutTrigger.value,
            selection.id,
          )?.id === "automatic-activated-upgrade",
      ),
    ).toBe(false);

    const reactivated = addLocalRosterChildSelection(
      withoutTrigger.value,
      selectionOccurrenceId("automatic-activation-root"),
      trigger,
      {
        selectionId: selectionOccurrenceId(
          "automatic-activation-second-trigger",
        ),
        createSelectionId,
      },
    );
    expect(reactivated.ok).toBe(true);
    if (!reactivated.ok) return;
    expect(
      reactivated.value.roster.forces[0]?.selections[0]?.selections.some(
        (selection) =>
          localRosterSelectionChoice(
            reactivated.value,
            selection.id,
          )?.id === "automatic-activated-upgrade",
      ),
    ).toBe(true);
  });
  it("withholds absent automatic activation across shared wrappers", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "selection-initialization.cat",
          bytes: fixtureBytes("selection-initialization.cat"),
        },
      ],
      {
        import: {
          batchId: "roster-automatic-shared",
          importedAt: "2026-08-22T20:10:00.000Z",
        },
      },
    );
    if (!prepared.ok) throw new Error("Expected fixture preparation.");
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "selection-initialization",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "initialization-force",
    );
    const root = catalogue === undefined
      ? undefined
      : localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.id === "automatic-reconciliation-unit",
        );
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      throw new Error("Expected shared automatic choices.");
    }

    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-automatic-shared"),
      forceId: forceOccurrenceId("force-automatic-shared"),
      name: "Shared automatic",
    });
    if (!created.ok) throw new Error("Expected roster creation.");
    let generatedId = 0;
    const createSelectionId = () =>
      selectionOccurrenceId("shared-generated-" + ++generatedId);
    const withRoot = addLocalRosterRootSelection(created.value, root, {
      selectionId: selectionOccurrenceId("automatic-shared-root"),
      createSelectionId,
    });
    if (!withRoot.ok) throw new Error("Expected automatic root selection.");

    const choices = localRosterChildChoices(
      withRoot.value,
      selectionOccurrenceId("automatic-shared-root"),
    );
    const first = choices.find(
      ({ id }) => id === "automatic-shared-first-link",
    );
    const trigger = choices.find(
      ({ id }) => id === "automatic-shared-trigger",
    );
    if (first === undefined || trigger === undefined) {
      throw new Error("Expected shared wrapper and trigger choices.");
    }

    const withFirst = addLocalRosterChildSelection(
      withRoot.value,
      selectionOccurrenceId("automatic-shared-root"),
      first,
      {
        selectionId: selectionOccurrenceId(
          "automatic-shared-first-occurrence",
        ),
        createSelectionId,
      },
    );
    if (!withFirst.ok) throw new Error("Expected first shared wrapper.");
    const withTrigger = addLocalRosterChildSelection(
      withFirst.value,
      selectionOccurrenceId("automatic-shared-root"),
      trigger,
      {
        selectionId: selectionOccurrenceId(
          "automatic-shared-trigger-occurrence",
        ),
        createSelectionId,
      },
    );
    expect(withTrigger.ok).toBe(true);
    if (!withTrigger.ok) return;

    expect(withTrigger.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "WEB_ROSTER_AUTOMATIC_CONSTRAINT_SHARED_SELECTOR_UNSUPPORTED",
        severity: "warning",
        impacts: ["compatibility"],
        location: {
          source: expect.objectContaining({
            filename: "selection-initialization.cat",
          }),
          path: expect.any(Array),
        },
        details: {
          parentId: "automatic-shared-root",
          choiceId: "automatic-shared-second-link",
          foreignSelectionIds: [
            "automatic-shared-first-occurrence",
          ],
        },
      }),
    );
    const sharedOccurrences =
      withTrigger.value.roster.forces[0]?.selections[0]?.selections.filter(
        (selection) =>
          localRosterSelectionChoice(
            withTrigger.value,
            selection.id,
          )?.definitionId === "automatic-shared-choice",
      ) ?? [];
    expect(sharedOccurrences).toHaveLength(1);
    expect(sharedOccurrences[0]?.id).toBe(
      "automatic-shared-first-occurrence",
    );
  });

  it("restores exact materialized choices from structural definition keys", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        { filename: "projection.cat", bytes: fixtureBytes("projection.cat") },
      ],
      {
        import: {
          batchId: "roster-restore",
          importedAt: "2026-07-23T16:00:00.000Z",
        },
      },
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "catalogue-203",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "force-local",
    );
    if (catalogue === undefined || force === undefined) {
      throw new Error("Expected fixture catalogue and force.");
    }

    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("roster-restore-1"),
      forceId: forceOccurrenceId("force-restore-1"),
      name: "Restored roster",
    });
    if (!created.ok) throw new Error("Expected roster creation to succeed.");
    const rootChoice = localRosterRootChoices(catalogue)[0];
    if (rootChoice === undefined) throw new Error("Expected a root choice.");
    const withRoot = addLocalRosterRootSelection(
      created.value,
      rootChoice,
      { selectionId: selectionOccurrenceId("selection-restore-root") },
    );
    if (!withRoot.ok) throw new Error("Expected root selection to succeed.");
    const childChoice = localRosterChildChoices(
      withRoot.value,
      selectionOccurrenceId("selection-restore-root"),
    )[0];
    if (childChoice === undefined) throw new Error("Expected a child choice.");
    const withChild = addLocalRosterChildSelection(
      withRoot.value,
      selectionOccurrenceId("selection-restore-root"),
      childChoice,
      { selectionId: selectionOccurrenceId("selection-restore-child") },
    );
    if (!withChild.ok) throw new Error("Expected child selection to succeed.");

    const duplicatedRoot = {
      ...rootChoice,
      materialized: { ...rootChoice.materialized },
    } as typeof rootChoice;
    const duplicatedCatalogue = {
      ...catalogue,
      context: {
        ...catalogue.context,
        roots: {
          ...catalogue.context.roots,
          roots: [...catalogue.context.roots.roots, duplicatedRoot],
        },
      },
    };
    const restored = restoreLocalRosterSession(
      duplicatedCatalogue,
      withChild.value.roster,
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.roster).toBe(withChild.value.roster);
    expect(restored.value.forceDefinition).toBe(force);
    expect(
      restored.value.selectionChoices.get(
        selectionOccurrenceId("selection-restore-root"),
      ),
    ).toBe(rootChoice.materialized);
    expect(
      restored.value.selectionChoices.get(
        selectionOccurrenceId("selection-restore-child"),
      ),
    ).toBe(childChoice);

    const rosterForce = withChild.value.roster.forces[0]!;
    const rosterSelection = rosterForce.selections[0]!;
    const unavailable = restoreLocalRosterSession(catalogue, {
      ...withChild.value.roster,
      forces: [
        {
          ...rosterForce,
          selections: [
            {
              ...rosterSelection,
              definition: {
                ...rosterSelection.definition,
                key: rosterDefinitionKey("missing-choice"),
              },
            },
          ],
        },
      ],
    });
    expect(unavailable).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "WEB_ROSTER_DRAFT_SELECTION_UNAVAILABLE",
          impacts: ["persistence"],
          location: expect.objectContaining({
            source: catalogue.document.projection.source,
          }),
        }),
      ],
    });
  });

  it("hides child groups excluded by the selected force identity", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
        {
          filename: "conditional-visibility.cat",
          bytes: fixtureBytes("conditional-visibility.cat"),
        },
      ],
      {
        import: {
          batchId: "roster-conditional-visibility",
          importedAt: "2026-07-24T00:00:00.000Z",
        },
      },
    );
    if (!prepared.ok) {
      throw new Error("Expected conditional-visibility library.");
    }
    const catalogue = prepared.value.catalogues.find(
      ({ id }) => id === "conditional-visibility",
    );
    const force = catalogue?.context.forces.definitions.find(
      ({ source }) => source.id === "force-patrol",
    );
    const root = catalogue === undefined
      ? undefined
      : localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.id === "visibility-parent",
        );
    if (
      catalogue === undefined ||
      force === undefined ||
      root === undefined
    ) {
      throw new Error("Expected conditional-visibility roster choices.");
    }
    const created = createLocalRosterSession(catalogue, force, {
      rosterId: rosterId("conditional-visibility-roster"),
      forceId: forceOccurrenceId("conditional-visibility-force"),
      name: "Conditional visibility roster",
    });
    if (!created.ok) throw new Error("Expected roster creation.");
    const withParent = addLocalRosterRootSelection(
      created.value,
      root,
      {
        selectionId: selectionOccurrenceId(
          "conditional-visibility-parent",
        ),
      },
    );
    if (!withParent.ok) throw new Error("Expected parent selection.");

    const inspected = inspectLocalRosterChildChoices(
      withParent.value,
      selectionOccurrenceId("conditional-visibility-parent"),
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value.groups.map(({ group }) => group.name)).toEqual([
      "Regular Options",
      "Grouped Visible Options",
      "Grouped Order Options",
    ]);
    expect(inspected.value.groups[0]?.choices.map(({ name }) => name)).toEqual([
      "Regular Option",
    ]);
    expect(inspected.value.groups[1]?.choices.map(({ name }) => name)).toEqual([
      "Grouped Visible Option",
    ]);
    expect(inspected.value.groups[2]?.choices.map(({ name }) => name)).toEqual([
      "Grouped Order Option",
    ]);
    expect(inspected.value.completeness).toBe("complete");
    expect(inspected.diagnostics).toEqual([]);
  });
});

describe("inspectLocalRosterSelectionAnnotation", () => {
  it("adapts one exact occurrence's annotation report", async () => {
    const session = await characteristicSession(
      "affects-owner",
      "affects-owner-occurrence",
    );

    const inspected = inspectLocalRosterSelectionAnnotation(
      session,
      selectionOccurrenceId("affects-owner-occurrence"),
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value).toMatchObject({
      baseValue: "",
      value: "Own Selection",
      completeness: "complete",
    });
  });

  it("rejects an occurrence that is not in the roster", async () => {
    const session = await characteristicSession();

    const inspected = inspectLocalRosterSelectionAnnotation(
      session,
      selectionOccurrenceId("missing-occurrence"),
    );

    expect(inspected.ok).toBe(false);
    expect(inspected.diagnostics.map(({ code }) => code)).toEqual([
      "APP_ROSTER_ANNOTATION_SELECTION_UNAVAILABLE",
    ]);
  });
});

describe("inspectLocalRosterSelectionCharacteristics", () => {
  it("reports every profile of one occurrence in render order", async () => {
    const session = await characteristicSession();

    const inspected = inspectLocalRosterSelectionCharacteristics(
      session,
      selectionOccurrenceId("characteristic-owner-occurrence"),
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(
      inspected.value.profiles.map(({ profile }) => profile.id),
    ).toEqual([
      "profile-direct-set",
      "profile-conditional",
      "profile-grouped-order",
      "profile-grouped-conditional",
      "profile-unsupported-operations",
      "profile-clamped",
      "profile-bonus-slot",
      "profile-inert-attributes",
      "profile-corrupted-input",
      "profile-replace",
      "profile-replace-nomatch",
      "profile-arithmetic",
      "profile-arithmetic-refused",
      "profile-append",
      "profile-skip-if-present",
      "profile-append-empty",
      "profile-extension-attributes",
      "profile-scoped",
      "profile-missing-value",
      "profile-unrouted",
      "profile-ambiguous-target",
      "profile-inert-comment",
      "profile-known-after-unapplied",
      "profile-unknown-after-applied",
      "profile-unresolved-applicability",
      "profile-hidden-static",
      "profile-hidden-conditional",
      "profile-hidden-inactive",
      "profile-hidden-grouped",
      "profile-hidden-unsupported",
      "profile-repeated",
    ]);
    expect(inspected.value.profiles[0]?.report).toMatchObject({
      completeness: "complete",
      characteristics: [
        { baseValue: '6"', value: '8"' },
        { baseValue: "4+", value: "4+" },
      ],
    });
    // Unsupported display behavior on any profile makes the occurrence-wide
    // inspection incomplete without discarding the supported reports.
    expect(inspected.value.completeness).toBe("incomplete");
  });

  it("keys each report by the exact profile object", async () => {
    const session = await characteristicSession();
    const choice = localRosterSelectionChoice(
      session,
      selectionOccurrenceId("characteristic-owner-occurrence"),
    );
    if (choice === undefined) throw new Error("Expected owner choice.");

    const inspected = inspectLocalRosterSelectionCharacteristics(
      session,
      selectionOccurrenceId("characteristic-owner-occurrence"),
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    for (const profile of choice.profiles) {
      expect(inspected.value.byProfile.get(profile)?.profile).toBe(profile);
    }
    expect(inspected.value.byProfile.size).toBe(
      inspected.value.profiles.length,
    );
  });

  it("reports visibility beside characteristics and shares completeness", async () => {
    const session = await characteristicSession();

    const inspected = inspectLocalRosterSelectionCharacteristics(
      session,
      selectionOccurrenceId("characteristic-owner-occurrence"),
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const byId = new Map(
      inspected.value.profiles.map((entry) => [String(entry.profile.id), entry]),
    );
    expect(byId.get("profile-hidden-conditional")).toMatchObject({
      visibility: { status: "hidden", hidden: true },
      completeness: "complete",
    });
    expect(byId.get("profile-hidden-inactive")?.visibility.status).toBe(
      "visible",
    );
    expect(byId.get("profile-hidden-grouped")?.visibility.status).toBe(
      "visible",
    );
    // Unresolved visibility makes the entry incomplete even though its
    // characteristic values are fully known.
    expect(byId.get("profile-hidden-unsupported")).toMatchObject({
      visibility: { status: "unresolved" },
      report: { completeness: "complete" },
      completeness: "incomplete",
    });
  });

  it("composes a condition-gated effective profile name", async () => {
    const selectionId = selectionOccurrenceId(
      "profile-name-owner-occurrence",
    );
    const session = await characteristicSession(
      "profile-name-owner",
      selectionId,
    );
    const trigger = localRosterChildChoices(session, selectionId)[0];
    if (trigger === undefined) throw new Error("Expected name trigger.");
    const withTrigger = addLocalRosterChildSelection(
      session,
      selectionId,
      trigger,
      {
        selectionId: selectionOccurrenceId(
          "profile-name-trigger-occurrence",
        ),
      },
    );
    if (!withTrigger.ok) throw new Error("Expected name trigger selection.");

    const inspected = inspectLocalRosterSelectionCharacteristics(
      withTrigger.value,
      selectionId,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.value.profiles[0]).toMatchObject({
      name: {
        baseValue: "Profile Name",
        value: "Profile Name w/ shield (Veteran)",
        completeness: "complete",
      },
      report: { completeness: "complete", unroutedModifiers: [] },
      completeness: "complete",
    });
  });
  it("rejects an occurrence that is not in the roster", async () => {
    const session = await characteristicSession();

    const inspected = inspectLocalRosterSelectionCharacteristics(
      session,
      selectionOccurrenceId("missing-occurrence"),
    );

    expect(inspected.ok).toBe(false);
    expect(inspected.diagnostics.map(({ code }) => code)).toEqual([
      "APP_ROSTER_CHARACTERISTIC_SELECTION_UNAVAILABLE",
    ]);
  });
});

async function characteristicSession(
  rootId = "characteristic-owner",
  occurrenceId = "characteristic-owner-occurrence",
) {
  const prepared = await prepareLocalCatalogueLibrary(
    [
      { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
      {
        filename: "characteristic-display.cat",
        bytes: fixtureBytes("characteristic-display.cat"),
      },
    ],
    {
      import: {
        batchId: "roster-characteristic-display",
        importedAt: "2026-08-14T00:00:00.000Z",
      },
    },
  );
  if (!prepared.ok) {
    throw new Error("Expected characteristic-display library.");
  }
  const catalogue = prepared.value.catalogues.find(
    ({ id }) => id === "characteristic-display",
  );
  const force = catalogue?.context.forces.definitions.find(
    ({ source }) => source.id === "force-patrol",
  );
  const root = catalogue === undefined
    ? undefined
    : localRosterRootChoices(catalogue).find(
        ({ materialized }) => materialized.id === rootId,
      );
  if (catalogue === undefined || force === undefined || root === undefined) {
    throw new Error("Expected characteristic-display roster choices.");
  }
  const created = createLocalRosterSession(catalogue, force, {
    rosterId: rosterId("characteristic-roster"),
    forceId: forceOccurrenceId("characteristic-force"),
    name: "Characteristic roster",
  });
  if (!created.ok) throw new Error("Expected roster creation.");
  const withOwner = addLocalRosterRootSelection(created.value, root, {
    selectionId: selectionOccurrenceId(occurrenceId),
  });
  if (!withOwner.ok) throw new Error("Expected owner selection.");
  return withOwner.value;
}
