import { describe, expect, it } from "vitest";

import { failure, success } from "@rosterforge/foundation";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import {
  addLocalRosterChildSelection,
  addLocalRosterRootSelection,
  createLocalRosterSession,
  evaluateLocalRosterCosts,
  inspectLocalRosterRootChoices,
  inspectLocalRosterSupportedValidation,
  localRosterChildChoices,
  localRosterRootChoices,
  type LocalRosterSession,
} from "./roster-session.js";
import { createRosterWorkspaceViewModel } from "./roster-workspace-model.js";

describe("roster workspace presentation model", () => {
  it("projects headline and recursive costs with active selection ancestry", async () => {
    const session = await costedSession();
    const activeSelectionId = selectionOccurrenceId("workspace-cost-child");
    const reports = workspaceReports(session);
    const model = createRosterWorkspaceViewModel(
      session,
      reports,
      activeSelectionId,
    );

    expect(model).toMatchObject({
      rosterId: "workspace-cost-roster",
      name: "Workspace Cost Roster",
      catalogueName: "Cost Evaluation Catalogue",
      forceCount: 1,
      selectionCount: 2,
      topLevelSelectionCount: 1,
      activeSelectionId: "workspace-cost-child",
      costs: {
        available: true,
        activeTotals: [{ typeId: "cost-points", name: "Points", value: 15 }],
        zeroTotals: [{ typeId: "cost-supply", name: "Supply", value: 0 }],
      },
    });
    expect(model.reports).toBe(reports);
    // This fixture's costs are complete while its checks are not, so the fold
    // has to name only the report that actually fell short rather than blaming
    // both for one incomplete half.
    expect(model.costs.available && model.costs.completeness).toBe("complete");
    expect(model.header).toEqual({
      completeness: "incomplete",
      incomplete: ["checks"],
    });
    expect(model.selections.configuration).toEqual([]);
    expect(model.selections.army).toHaveLength(1);

    const root = model.selections.army[0];
    const child = root?.selections[0];
    expect(root?.occurrence).toBe(
      session.roster.forces[0]?.selections[0],
    );
    expect(root).toMatchObject({
      section: "army",
      active: false,
      containsActiveSelection: true,
      costs: {
        available: true,
        totals: [
          { typeId: "cost-points", name: "Points", value: 15 },
          { typeId: "cost-supply", name: "Supply", value: 0 },
        ],
      },
    });
    expect(child).toMatchObject({
      active: true,
      containsActiveSelection: true,
      costs: {
        available: true,
        totals: [{ typeId: "cost-points", name: "Points", value: 5 }],
      },
    });
    expect(
      model.rootChoices.groups.every(({ section }) => section === "army"),
    ).toBe(true);
  });

  it("classifies configuration separately and promotes only violations to attention", async () => {
    const session = await configuredSession();
    const unit = session.roster.forces[0]?.selections.find(
      ({ id }) => id === selectionOccurrenceId("workspace-unit"),
    );
    const activeSelectionId = unit?.selections[0]?.id;
    if (activeSelectionId === undefined) {
      throw new Error("Expected an initialized unit child.");
    }
    const model = createRosterWorkspaceViewModel(
      session,
      workspaceReports(session),
      activeSelectionId,
    );

    expect(
      model.rootChoices.groups.map(({ name, section }) => ({ name, section })),
    ).toEqual([
      { name: "Units", section: "army" },
      { name: "Configuration", section: "configuration" },
      { name: "Uncategorized", section: "army" },
    ]);
    expect(
      model.selections.configuration.map(({ occurrence }) => occurrence.name),
    ).toEqual(["Disabled Automatic Root"]);
    expect(
      model.selections.army.map(({ occurrence }) => occurrence.name),
    ).toEqual(["Initialization Unit"]);

    const projectedUnit = model.selections.army[0];
    expect(projectedUnit).toMatchObject({
      active: false,
      containsActiveSelection: true,
      attention: true,
      containsAttention: true,
    });
    expect(
      projectedUnit?.selections.some(({ active }) => active),
    ).toBe(true);
    expect(model.validation.available).toBe(true);
    if (model.validation.available) {
      expect(model.validation.validity).toBe("invalid");
      expect(model.validation.issueCount).toBeGreaterThan(0);
      expect(model.validation.attentionSelectionIds).toContain(
        selectionOccurrenceId("workspace-unit"),
      );
    }
  });

  it("keeps unavailable source reports explicit without dropping selections", async () => {
    const session = await costedSession();
    const diagnostic = {
      code: "WORKSPACE_MODEL_TEST_UNAVAILABLE",
      message: "Synthetic unavailable report.",
      severity: "error" as const,
      impacts: ["validation" as const],
    };
    const unavailable = failure([diagnostic]);
    const model = createRosterWorkspaceViewModel(session, {
      rootChoices: unavailable,
      costs: unavailable,
      validation: unavailable,
    });

    expect(model.costs).toEqual({
      available: false,
      activeTotals: [],
      zeroTotals: [],
      excludedCount: 0,
      unresolvedSelectionCount: 0,
      diagnostics: [diagnostic],
    });
    expect(model.validation).toMatchObject({
      available: false,
      issueCount: 0,
      diagnostics: [diagnostic],
    });
    expect(model.rootChoices).toEqual({
      available: false,
      choiceCount: 0,
      groups: [],
      diagnostics: [diagnostic],
    });
    expect(model.selections.ordered).toHaveLength(1);
    expect(model.selections.ordered[0]?.costs.available).toBe(false);
    // A report that could not be composed has established completeness no more
    // than one that reported `incomplete`. Both must fold to `incomplete`.
    expect(model.header).toEqual({
      completeness: "incomplete",
      incomplete: ["costs", "checks"],
    });
  });

  it("reports a complete header only when every presented report is complete", async () => {
    // The guard against a vacuously always-incomplete fold. Every other case
    // here is incomplete for a real reason, so one case has to prove `complete`
    // is reachable at all. The validation report is a real one with only its
    // completeness raised, rather than a fabricated shape.
    const session = await costedSession();
    const reports = workspaceReports(session);
    if (!reports.validation.ok) {
      throw new Error("Expected a composed validation report.");
    }
    const model = createRosterWorkspaceViewModel(session, {
      ...reports,
      validation: success({
        ...reports.validation.value,
        status: {
          ...reports.validation.value.status,
          completeness: "complete" as const,
        },
      }),
    });

    expect(model.header).toEqual({ completeness: "complete", incomplete: [] });
  });
});

function workspaceReports(session: LocalRosterSession) {
  return {
    rootChoices: inspectLocalRosterRootChoices(session),
    costs: evaluateLocalRosterCosts(session),
    validation: inspectLocalRosterSupportedValidation(session),
  };
}

async function costedSession(): Promise<LocalRosterSession> {
  const session = await createSession(
    "cost-evaluation.cat",
    "cost-evaluation",
    "force-patrol",
    "workspace-cost-roster",
    "Workspace Cost Roster",
  );
  const root = localRosterRootChoices(session.catalogue).find(
    ({ materialized }) => materialized.id === "cost-base",
  );
  if (root === undefined) throw new Error("Expected the costed root.");
  const withRoot = addLocalRosterRootSelection(session, root, {
    selectionId: selectionOccurrenceId("workspace-cost-root"),
  });
  if (!withRoot.ok) throw new Error("Expected the costed root to add.");
  const child = localRosterChildChoices(
    withRoot.value,
    selectionOccurrenceId("workspace-cost-root"),
  ).find(({ id }) => id === "cost-child");
  if (child === undefined) throw new Error("Expected the costed child.");
  const withChild = addLocalRosterChildSelection(
    withRoot.value,
    selectionOccurrenceId("workspace-cost-root"),
    child,
    { selectionId: selectionOccurrenceId("workspace-cost-child") },
  );
  if (!withChild.ok) throw new Error("Expected the costed child to add.");
  return withChild.value;
}

async function configuredSession(): Promise<LocalRosterSession> {
  let session = await createSession(
    "selection-initialization.cat",
    "selection-initialization",
    "initialization-force",
    "workspace-sections-roster",
    "Workspace Sections Roster",
  );
  const roots = localRosterRootChoices(session.catalogue);
  const unit = roots.find(
    ({ materialized }) => materialized.id === "initialization-unit",
  );
  const configuration = roots.find(
    ({ materialized }) => materialized.id === "disabled-automatic-root",
  );
  if (unit === undefined || configuration === undefined) {
    throw new Error("Expected unit and configuration roots.");
  }
  let generatedId = 0;
  const withUnit = addLocalRosterRootSelection(session, unit, {
    selectionId: selectionOccurrenceId("workspace-unit"),
    createSelectionId: () =>
      selectionOccurrenceId(`workspace-unit-child-${++generatedId}`),
  });
  if (!withUnit.ok) throw new Error("Expected the unit root to add.");
  session = withUnit.value;
  const withConfiguration = addLocalRosterRootSelection(
    session,
    configuration,
    { selectionId: selectionOccurrenceId("workspace-configuration") },
  );
  if (!withConfiguration.ok) {
    throw new Error("Expected the configuration root to add.");
  }
  return withConfiguration.value;
}

async function createSession(
  catalogueFilename: string,
  catalogueId: string,
  forceId: string,
  sessionId: string,
  name: string,
): Promise<LocalRosterSession> {
  const prepared = await prepareLocalCatalogueLibrary(
    [
      { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
      { filename: catalogueFilename, bytes: fixtureBytes(catalogueFilename) },
    ],
    {
      import: {
        batchId: `workspace-model-${catalogueId}`,
        importedAt: "2026-08-24T00:00:00.000Z",
      },
    },
  );
  if (!prepared.ok) throw new Error("Expected workspace fixture import.");
  const catalogue = prepared.value.catalogues.find(
    ({ id }) => id === catalogueId,
  );
  const force = catalogue?.context.forces.definitions.find(
    ({ source }) => source.id === forceId,
  );
  if (catalogue === undefined || force === undefined) {
    throw new Error("Expected workspace catalogue and force.");
  }
  const created = createLocalRosterSession(catalogue, force, {
    rosterId: rosterId(sessionId),
    forceId: forceOccurrenceId(`force-${sessionId}`),
    name,
  });
  if (!created.ok) throw new Error("Expected workspace session creation.");
  return created.value;
}
