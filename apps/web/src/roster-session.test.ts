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
      "profile-append",
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

async function characteristicSession() {
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
        ({ materialized }) => materialized.id === "characteristic-owner",
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
    selectionId: selectionOccurrenceId("characteristic-owner-occurrence"),
  });
  if (!withOwner.ok) throw new Error("Expected owner selection.");
  return withOwner.value;
}
