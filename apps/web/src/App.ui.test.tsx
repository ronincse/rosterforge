// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { failure, success } from "@rosterforge/foundation";
import type { LocalRosterDraft } from "@rosterforge/persistence";

import { App } from "./App.js";
import {
  createLocalRosterDraftStore,
  type LocalRosterDraftRecordBackend,
} from "./browser-drafts.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import {
  acquireRemoteCatalogue,
  indexRemoteCatalogueSource,
  type RemoteCatalogueAcquisition,
  type RemoteCatalogueSourceDefinition,
  type RemoteCatalogueSourceIndex,
} from "./remote-catalogue-source.js";

import type { BrowserFileSource } from "./browser-files.js";

afterEach(cleanup);

const fixedOptions = {
  import: {
    batchId: "ui-result",
    importedAt: "2026-07-23T14:00:00.000Z",
  },
};

const gameSystemBytes = xmlBytes(`<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema"
  id="synthetic-system" name="Synthetic Game" revision="3"
  battleScribeVersion="2.03">
  <costTypes>
    <costType id="cost-points" name="Points" defaultCostLimit="-1" />
  </costTypes>
  <profileTypes>
    <profileType id="profile-type-unit" name="Unit">
      <characteristicTypes>
        <characteristicType id="characteristic-move" name="Move" />
      </characteristicTypes>
    </profileType>
  </profileTypes>
  <forceEntries>
    <forceEntry id="force-patrol" name="Patrol Detachment">
      <constraints>
        <constraint
          id="force-roster-max"
          type="max"
          field="forces"
          scope="roster"
          value="1"
          shared="true"
          includeChildForces="true"
        />
      </constraints>
    </forceEntry>
  </forceEntries>
  <sharedRules>
    <rule id="rule-shared-tactics" name="Shared Tactics">
      <description>Advance together.</description>
    </rule>
    <rule id="rule-coordinated-scouting" name="Coordinated Scouting">
      <description>Share every route discovered.</description>
    </rule>
  </sharedRules>
</gameSystem>`);
const catalogueBytes = xmlBytes(`<?xml version="1.0" encoding="UTF-8"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"
  id="synthetic-catalogue" name="Synthetic Faction" revision="7"
  battleScribeVersion="2.03" gameSystemId="synthetic-system"
  gameSystemRevision="3" library="false">
  <selectionEntries>
    <selectionEntry id="entry-infantry" name="Infantry Squad" type="unit">
      <costs>
        <cost name="Points" typeId="cost-points" value="80" />
      </costs>
      <constraints>
        <constraint
          id="entry-parent-max"
          type="max"
          field="selections"
          scope="parent"
          value="1"
        />
      </constraints>
      <infoLinks>
        <infoLink
          id="info-shared-tactics"
          name="Shared Tactics"
          targetId="rule-shared-tactics"
          type="rule"
        />
        <infoLink
          id="info-fieldcraft"
          name="Fieldcraft"
          targetId="info-group-fieldcraft"
          type="infoGroup"
        />
      </infoLinks>
      <profiles>
        <profile
          id="profile-infantry"
          name="Infantry profile"
          typeId="profile-type-unit"
          typeName="Unit"
        >
          <characteristics>
            <characteristic
              name="Move"
              typeId="characteristic-move"
            >6</characteristic>
          </characteristics>
        </profile>
      </profiles>
      <rules>
        <rule id="rule-hold-ground" name="Hold Ground">
          <description>Remain on the objective.</description>
        </rule>
      </rules>
      <selectionEntries>
        <selectionEntry
          id="entry-special-weapon"
          name="Special Weapon"
          type="upgrade"
        >
          <costs>
            <cost name="Points" typeId="cost-points" value="10" />
          </costs>
        </selectionEntry>
      </selectionEntries>
      <selectionEntryGroups>
        <selectionEntryGroup
          id="group-squad-doctrine"
          name="Squad Doctrine"
          defaultSelectionEntryId="none"
        >
          <selectionEntries>
            <selectionEntry
              id="entry-mobile-doctrine"
              name="Mobile Doctrine"
              type="upgrade"
            />
            <selectionEntry
              id="entry-defensive-doctrine"
              name="Defensive Doctrine"
              type="upgrade"
            />
          </selectionEntries>
          <constraints>
            <constraint
              id="group-squad-doctrine-min"
              type="min"
              field="selections"
              scope="parent"
              value="1"
            />
            <constraint
              id="group-squad-doctrine-max"
              type="max"
              field="selections"
              scope="parent"
              value="1"
            />
          </constraints>
        </selectionEntryGroup>
      </selectionEntryGroups>
    </selectionEntry>
  </selectionEntries>
  <sharedInfoGroups>
    <infoGroup id="info-group-fieldcraft" name="Fieldcraft">
      <profiles>
        <profile
          id="profile-forward-observer"
          name="Forward Observer"
          typeId="profile-type-unit"
          typeName="Unit"
        >
          <characteristics>
            <characteristic
              name="Move"
              typeId="characteristic-move"
            >Scout 6</characteristic>
          </characteristics>
        </profile>
      </profiles>
      <infoLinks>
        <infoLink
          id="info-coordinated-scouting"
          name="Coordinated Scouting"
          targetId="rule-coordinated-scouting"
          type="rule"
        />
      </infoLinks>
    </infoGroup>
  </sharedInfoGroups>
  <sharedSelectionEntries />
</catalogue>`);
const invalidCatalogueBytes = xmlBytes("<catalogue>");
const remoteSourceDefinition: RemoteCatalogueSourceDefinition = {
  id: "fictional-remote",
  title: "Fictional Repository",
  gameSystem: "Synthetic Game",
  description: "A pinned fictional source.",
  repository: {
    owner: "BSData",
    repository: "fictional-system",
    revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
};

describe("App local catalogue flow", () => {
  it("browses a pinned source and opens the selected catalogue library", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "minimal.cat", bytes: catalogueBytes },
      ],
      fixedOptions,
    );
    if (!prepared.ok) {
      throw new Error("Expected the remote UI fixture library to compose.");
    }
    const choice = prepared.value.selectableCatalogues[0]!;
    const sourceIndex = {
      definition: remoteSourceDefinition,
      catalogues: [
        {
          path: "minimal.cat",
          kind: "catalogue",
          id: choice.id,
          name: choice.name,
          gameSystemId: choice.gameSystemId,
          library: false,
          catalogueLinks: [],
        },
      ],
      report: {
        files: [{}, {}],
      },
      metadataCacheStatus: "hit",
    } as unknown as RemoteCatalogueSourceIndex;
    const indexRemote = vi.fn<typeof indexRemoteCatalogueSource>(
      async (_source, options) => {
        options.onProgress?.({
          phase: "indexing",
          completedFiles: 2,
          totalFiles: 2,
          currentPath: "minimal.gst",
          acceptedBytes:
            gameSystemBytes.byteLength + catalogueBytes.byteLength,
        });
        return success(sourceIndex);
      },
    );
    const acquisition: RemoteCatalogueAcquisition = {
      sourceIndex,
      closure: {} as RemoteCatalogueAcquisition["closure"],
      library: prepared.value,
      selectedCatalogueKey: choice.key,
    };
    const acquireRemote = vi.fn<typeof acquireRemoteCatalogue>(
      async (_index, path, options) => {
        options.onProgress?.({
          phase: "acquiring",
          completedFiles: 2,
          totalFiles: 2,
          currentPath: path,
          acceptedBytes:
            gameSystemBytes.byteLength + catalogueBytes.byteLength,
        });
        return success(acquisition);
      },
    );

    render(
      <App
        remoteSources={[remoteSourceDefinition]}
        repositoryByteCache={null}
        indexRemoteSource={indexRemote}
        acquireRemoteSource={acquireRemote}
        createBatchId={() => "remote-ui-batch"}
        now={() => "2026-08-13T18:30:00.000Z"}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Browse catalogues" }),
    );
    const picker = await screen.findByLabelText("Faction catalogue");
    expect((picker as HTMLSelectElement).value).toBe("minimal.cat");
    expect(screen.getByText("Synthetic Faction")).toBeTruthy();
    expect(
      screen.getByText(/Metadata restored from this browser/),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Load selected catalogue" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Synthetic Faction" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "The selected catalogue and its dependencies are ready.",
      ),
    ).toBeTruthy();
    expect(indexRemote).toHaveBeenCalledOnce();
    expect(acquireRemote.mock.calls[0]?.[1]).toBe("minimal.cat");
    expect(screen.getByLabelText("Replace local files")).toBeTruthy();
  });

  it("cancels remote indexing without replacing the workspace", async () => {
    let requestSignal: AbortSignal | undefined;
    const indexRemote = vi.fn<typeof indexRemoteCatalogueSource>(
      (_source, options) => {
        requestSignal = options.signal;
        return new Promise<
          Awaited<ReturnType<typeof indexRemoteCatalogueSource>>
        >(() => undefined);
      },
    );

    render(
      <App
        remoteSources={[remoteSourceDefinition]}
        repositoryByteCache={null}
        indexRemoteSource={indexRemote}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Browse catalogues" }),
    );
    expect(
      await screen.findByText("Indexing Fictional Repository"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(requestSignal?.aborted).toBe(true);
    expect(
      await screen.findByRole("button", { name: "Browse catalogues" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Your catalogue library starts here",
      }),
    ).toBeTruthy();
  });

  it("loads BattleScribe JSON through the browser file-selection flow", async () => {
    const jsonGameSystemBytes = jsonBytes({
      gameSystem: {
        xmlns: "http://www.battlescribe.net/schema/gameSystemSchema",
        id: "ui-json-system",
        name: "Fictional JSON System",
        revision: 1,
        battleScribeVersion: 2.03,
        type: "gameSystem",
      },
    });
    const jsonCatalogueBytes = jsonBytes({
      catalogue: {
        selectionEntries: [],
        xmlns: "http://www.battlescribe.net/schema/catalogueSchema",
        library: false,
        id: "ui-json-catalogue",
        name: "Fictional JSON Catalogue",
        gameSystemId: "ui-json-system",
        gameSystemRevision: 1,
        revision: 1,
        battleScribeVersion: 2.03,
        type: "catalogue",
      },
    });

    render(
      <App
        prepareLibrary={prepareLocalCatalogueLibrary}
        createBatchId={() => "ui-json-request"}
        now={() => "2026-07-23T14:01:00.000Z"}
      />,
    );

    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [
            browserFile(
              "projection-json-game-system.json",
              jsonGameSystemBytes,
              "application/json",
            ),
            browserFile(
              "projection-json-catalogue.json",
              jsonCatalogueBytes,
              "application/json",
            ),
          ],
        },
      },
    );

    expect(
      await screen.findByRole("button", {
        name: /Fictional JSON Catalogue/u,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Fictional JSON Catalogue",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Fictional JSON System")).toBeTruthy();
  });

  it("keeps library catalogues out of roster setup choices", async () => {
    const projectionGameSystem = workspaceFixtureBytes("projection.gst");
    const graphLibrary = workspaceFixtureBytes("graph-library.cat");
    const projectionCatalogue = workspaceFixtureBytes("projection.cat");
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "projection.gst", bytes: projectionGameSystem },
        { filename: "graph-library.cat", bytes: graphLibrary },
        { filename: "projection.cat", bytes: projectionCatalogue },
      ],
      fixedOptions,
    );
    const prepare = vi.fn<typeof prepareLocalCatalogueLibrary>(
      async () => prepared,
    );

    render(<App prepareLibrary={prepare} />);
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("projection.gst", projectionGameSystem),
          browserFile("graph-library.cat", graphLibrary),
          browserFile("projection.cat", projectionCatalogue),
        ],
      },
    });

    expect(
      await screen.findByRole("button", {
        name: /Projection Catalogue/u,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: /Graph Library/u,
      }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Projection Catalogue" }),
    ).toBeTruthy();
    expect(screen.getByText("Roster catalogues")).toBeTruthy();
  });

  it("imports a browser file selection and exposes an accessible catalogue choice", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "minimal.cat", bytes: catalogueBytes },
      ],
      fixedOptions,
    );
    const prepare = vi.fn<typeof prepareLocalCatalogueLibrary>(
      async () => prepared,
    );

    render(
      <App
        prepareLibrary={prepare}
        createBatchId={() => "ui-request"}
        now={() => "2026-07-23T14:01:00.000Z"}
      />,
    );

    const fileInput = screen.getByLabelText("Choose BattleScribe files");
    expect(fileInput.getAttribute("accept")).toContain(".json");
    fireEvent.change(
      fileInput,
      {
        target: {
          files: [
            browserFile("minimal.gst", gameSystemBytes),
            browserFile("minimal.cat", catalogueBytes),
          ],
        },
      },
    );

    const choice = await screen.findByRole("button", {
      name: /Synthetic Faction/u,
    });
    expect(choice.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "Synthetic Faction" })).toBeTruthy();
    expect(screen.getByText("Synthetic Game")).toBeTruthy();
    expect(screen.getByText("Catalogue context composed")).toBeTruthy();
    expect(prepare).toHaveBeenCalledOnce();

    const [files, options] = prepare.mock.calls[0] ?? [];
    expect(files?.map(({ filename }) => filename)).toEqual([
      "minimal.gst",
      "minimal.cat",
    ]);
    expect(options).toMatchObject({
      import: {
        batchId: "ui-request",
        importedAt: "2026-07-23T14:01:00.000Z",
      },
    });
  });

  it("keeps a valid catalogue visible beside a rejected sibling file", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "invalid.cat", bytes: invalidCatalogueBytes },
        { filename: "minimal.cat", bytes: catalogueBytes },
      ],
      fixedOptions,
    );
    const prepare = vi.fn<typeof prepareLocalCatalogueLibrary>(
      async () => prepared,
    );

    render(<App prepareLibrary={prepare} />);
    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [browserFile("selection.cat", catalogueBytes)],
        },
      },
    );

    expect(
      await screen.findByRole("button", { name: /Synthetic Faction/u }),
    ).toBeTruthy();
    expect(screen.getByText("Ready with issues")).toBeTruthy();
    expect(screen.getByText("invalid.cat")).toBeTruthy();
    expect(screen.getByText("1 rejected")).toBeTruthy();
    expect(screen.getByText("Batch diagnostics")).toBeTruthy();
    expect(screen.getByText("BS_XML_INVALID")).toBeTruthy();
  });

  it("announces batch-level import failures and permits another selection", async () => {
    const prepare = vi.fn<typeof prepareLocalCatalogueLibrary>(async () =>
      failure([
        {
          code: "REPOSITORY_LOCAL_IMPORT_FILE_LIMIT",
          message: "The local import contains too many files.",
          severity: "error" as const,
          impacts: ["import" as const, "security" as const],
        },
      ]),
    );

    render(<App prepareLibrary={prepare} />);
    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [browserFile("too-many.cat", catalogueBytes)],
        },
      },
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("The selected batch could not be imported.");
    expect(alert.textContent).toContain("REPOSITORY_LOCAL_IMPORT_FILE_LIMIT");
    await waitFor(() => {
      expect(screen.getByLabelText("Choose BattleScribe files")).toBeTruthy();
    });
  });

  it("creates a named structural roster from the selected starting force", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "minimal.cat", bytes: catalogueBytes },
      ],
      fixedOptions,
    );
    const prepare = vi.fn<typeof prepareLocalCatalogueLibrary>(
      async () => prepared,
    );

    let selectionIndex = 0;
    render(
      <App
        prepareLibrary={prepare}
        createEntityId={(kind) =>
          kind === "selection"
            ? `selection-ui-${++selectionIndex}`
            : `${kind}-ui`
        }
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [
            browserFile("minimal.gst", gameSystemBytes),
            browserFile("minimal.cat", catalogueBytes),
          ],
        },
      },
    );

    await screen.findByRole("button", { name: /Synthetic Faction/u });
    fireEvent.change(screen.getByLabelText("Roster name"), {
      target: { value: "First Patrol" },
    });
    expect(screen.getByLabelText("Starting force")).toHaveProperty(
      "value",
      expect.stringContaining("forceEntries"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));

    expect(
      await screen.findByRole("heading", { name: "First Patrol" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Catalogue library" }),
    ).toBeNull();
    expect(
      screen.getByRole("region", { name: "Roster workspace" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Patrol Detachment")).toHaveLength(2);
    expect(screen.getByText("force-ui")).toBeTruthy();
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Roster workspace navigation",
    });
    expect(within(workspaceNavigation).getByText("Roster")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("Add units")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("Checks")).toBeTruthy();
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Roster, 0 top-level selections",
      }),
    ).toHaveProperty("hash", "#selected-roster-heading");
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Add units, 1 available choice",
      }),
    ).toHaveProperty("hash", "#root-choices-heading");
    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    expect(
      within(selectedRoster).getByText("No selections added yet"),
    ).toBeTruthy();
    const supportedValidation = screen.getByRole("region", {
      name: "Supported roster validation",
    });
    expect(
      within(supportedValidation).getByText("No known violations"),
    ).toBeTruthy();
    expect(
      within(supportedValidation).getByRole("link", {
        name: "0 constraint issues",
      }),
    ).toBeTruthy();
    expect(
      within(supportedValidation).getByText("Complete supported view"),
    ).toBeTruthy();
    expect(
      constraintStatusText(supportedValidation, "Violated"),
    ).toBe("0Violated");
    expect(
      within(supportedValidation).getByRole("link", {
        name: "0 structural issues",
      }),
    ).toHaveProperty("hash", "#roster-structural-status-heading");
    expect(
      within(supportedValidation).getByRole("link", {
        name: "0 constraint issues",
      }),
    ).toHaveProperty("hash", "#roster-constraint-heading");
    const costs = screen.getByRole("region", { name: "Roster costs" });
    expect(
      within(costs).getByText("No supported numeric costs yet."),
    ).toBeTruthy();
    expect(within(costs).getByText("Complete supported view")).toBeTruthy();
    const structuralStatus = screen.getByRole("region", {
      name: "Supported structural requirements",
    });
    expect(
      within(structuralStatus).getByText("No known violations"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("Complete inspection"),
    ).toBeTruthy();
    const constraints = screen.getByRole("region", {
      name: "Constraint bounds",
    });
    expect(within(constraints).getByText("Complete inspection")).toBeTruthy();
    expect(
      constraintStatusText(constraints, "Satisfied"),
    ).toBe("1Satisfied");
    expect(
      constraintStatusText(constraints, "Violated"),
    ).toBe("0Violated");
    const initialSatisfiedConstraints = within(constraints).getByRole(
      "group",
      { name: "Satisfied constraint bounds 1 bound" },
    );
    const reviewForce = within(initialSatisfiedConstraints).getByRole(
      "link",
      { name: "Review force" },
    );
    const forceTarget = reviewForce.getAttribute("href");
    expect(
      forceTarget === null
        ? null
        : document.getElementById(forceTarget.slice(1)),
    ).toBeTruthy();
    const changeRosterSetup = screen.getByRole("button", {
      name: "Change roster setup",
    });
    expect(changeRosterSetup).toBeTruthy();
    const undo = screen.getByRole("button", { name: "Undo" });
    const redo = screen.getByRole("button", { name: "Redo" });
    expect(undo).toHaveProperty("disabled", true);
    expect(redo).toHaveProperty("disabled", true);

    const editor = screen.getByRole("region", { name: "Add units" });
    expect(within(editor).getByText("Uncategorized")).toBeTruthy();
    const rootFilter = within(editor).getByLabelText(
      "Find a unit or option",
    );
    expect(within(editor).getByText("1 matching choice")).toBeTruthy();
    fireEvent.change(rootFilter, { target: { value: "missing" } });
    expect(
      within(editor).getByText("No available roots match this filter."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Add Infantry Squad" }),
    ).toBeNull();
    fireEvent.change(rootFilter, { target: { value: "infantry" } });
    expect(within(editor).getByText("1 matching choice")).toBeTruthy();
    const addInfantry = screen.getByRole("button", {
      name: "Add Infantry Squad",
    });
    fireEvent.click(addInfantry);
    expect(await screen.findByText("selection-ui-1")).toBeTruthy();
    expect(undo).toHaveProperty("disabled", false);
    expect(redo).toHaveProperty("disabled", true);
    const selectionDetails =
      within(selectedRoster).getByText("Selection details");
    expect(
      within(selectedRoster).getByText(
        "1 profile, 2 rules, 1 info group",
      ),
    ).toBeTruthy();
    fireEvent.click(selectionDetails);
    expect(within(selectedRoster).getByText("Infantry profile")).toBeTruthy();
    expect(within(selectedRoster).getAllByText("Move")).toHaveLength(2);
    expect(within(selectedRoster).getByText("6")).toBeTruthy();
    expect(within(selectedRoster).getByText("Hold Ground")).toBeTruthy();
    expect(
      within(selectedRoster).getByText("Remain on the objective."),
    ).toBeTruthy();
    expect(within(selectedRoster).getByText("Shared Tactics")).toBeTruthy();
    expect(within(selectedRoster).getByText("Advance together.")).toBeTruthy();
    expect(within(selectedRoster).getByText("Info groups")).toBeTruthy();
    expect(within(selectedRoster).getByText("Fieldcraft")).toBeTruthy();
    expect(within(selectedRoster).getByText("Forward Observer")).toBeTruthy();
    expect(within(selectedRoster).getByText("Scout 6")).toBeTruthy();
    expect(
      within(selectedRoster).getByText("Coordinated Scouting"),
    ).toBeTruthy();
    expect(
      within(selectedRoster).getByText("Share every route discovered."),
    ).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Direct | minimal.cat"),
    ).toHaveLength(3);
    expect(
      within(selectedRoster).getAllByText("Linked | minimal.gst"),
    ).toHaveLength(2);
    expect(
      within(selectedRoster).getByText("Linked | minimal.cat"),
    ).toBeTruthy();
    fireEvent.change(
      within(selectedRoster).getByLabelText("Occurrence name"),
      {
        target: { value: "Veterans" },
      },
    );
    fireEvent.click(
      within(selectedRoster).getByRole("button", { name: "Rename" }),
    );
    expect(
      within(selectedRoster).getAllByText("Veterans").length,
    ).toBeGreaterThan(0);
    const amountInput = within(selectedRoster).getByLabelText("Amount");
    fireEvent.change(amountInput, { target: { value: "2" } });
    fireEvent.click(
      within(selectedRoster).getByRole("button", { name: "Set amount" }),
    );
    expect(within(costs).getByText("160")).toBeTruthy();
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Roster, 2 top-level selections",
      }),
    ).toBeTruthy();
    fireEvent.click(
      within(selectedRoster).getByRole("button", { name: "Use 1" }),
    );

    fireEvent.click(addInfantry);
    expect(screen.getByText("selection-ui-2")).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Infantry Squad"),
    ).toHaveLength(1);
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Roster, 2 top-level selections",
      }),
    ).toBeTruthy();
    expect(within(costs).getByText("160")).toBeTruthy();
    expect(within(costs).getByText("Points")).toBeTruthy();
    expect(
      constraintStatusText(constraints, "Satisfied"),
    ).toBe("1Satisfied");
    expect(
      constraintStatusText(constraints, "Violated"),
    ).toBe("2Violated");
    expect(
      within(constraints).getAllByText("Observed 2, limit 1"),
    ).toHaveLength(2);
    const constraintAttention = within(constraints).getByRole("group", {
      name: "Constraint issues needing attention 2 bounds",
    });
    const constraintReviewLinks = within(
      constraintAttention,
    ).getAllByRole("link", { name: "Review selection" });
    expect(constraintReviewLinks).toHaveLength(2);
    for (const link of constraintReviewLinks) {
      const target = link.getAttribute("href");
      expect(
        target === null
          ? null
          : document.getElementById(target.slice(1)),
      ).toBeTruthy();
    }
    expect(
      within(supportedValidation).getByText("Known violations"),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Add Special Weapon to Veterans selection-ui-1",
      }),
    );
    expect(await screen.findByText("selection-ui-3")).toBeTruthy();
    expect(screen.getByText("Special Weapon")).toBeTruthy();
    expect(within(costs).getByText("170")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /Add Special Weapon/u }),
    ).toHaveLength(2);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Veterans selection-ui-1",
      }),
    );
    expect(screen.queryByText("selection-ui-1")).toBeNull();
    expect(screen.queryByText("selection-ui-3")).toBeNull();
    expect(screen.getByText("selection-ui-2")).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Infantry Squad"),
    ).toHaveLength(1);
    expect(within(costs).getByText("80")).toBeTruthy();
    expect(
      constraintStatusText(constraints, "Satisfied"),
    ).toBe("2Satisfied");
    expect(
      constraintStatusText(constraints, "Violated"),
    ).toBe("0Violated");
    expect(
      within(supportedValidation).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      within(constraints).queryByRole("group", {
        name: /Constraint issues needing attention/u,
      }),
    ).toBeNull();
    expect(
      within(constraints).getByRole("group", {
        name: "Satisfied constraint bounds 2 bounds",
      }),
    ).toBeTruthy();

    fireEvent.click(undo);
    expect(screen.getByText("selection-ui-1")).toBeTruthy();
    expect(screen.getByText("selection-ui-3")).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Veterans").length,
    ).toBeGreaterThan(0);
    expect(within(costs).getByText("170")).toBeTruthy();
    expect(redo).toHaveProperty("disabled", false);

    fireEvent.click(redo);
    expect(screen.queryByText("selection-ui-1")).toBeNull();
    expect(screen.queryByText("selection-ui-3")).toBeNull();
    expect(screen.getByText("selection-ui-2")).toBeTruthy();
    expect(within(costs).getByText("80")).toBeTruthy();

    fireEvent.click(changeRosterSetup);
    expect(
      screen.getByRole("region", { name: "Catalogue library" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("complementary", { name: "Catalogue details" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("navigation", {
        name: "Roster workspace navigation",
      }),
    ).toBeNull();
  });

  it("presents selection groups as replaceable concrete choices", async () => {
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "minimal.cat", bytes: catalogueBytes },
      ],
      fixedOptions,
    );
    const prepare = vi.fn<typeof prepareLocalCatalogueLibrary>(
      async () => prepared,
    );
    let selectionIndex = 0;
    render(
      <App
        prepareLibrary={prepare}
        createEntityId={(kind) =>
          kind === "selection"
            ? `selection-ui-group-${++selectionIndex}`
            : `${kind}-ui-group`
        }
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [
            browserFile("minimal.gst", gameSystemBytes),
            browserFile("minimal.cat", catalogueBytes),
          ],
        },
      },
    );

    await screen.findByRole("button", { name: /Synthetic Faction/u });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Infantry Squad" }),
    );

    const structuralStatus = screen.getByRole("region", {
      name: "Supported structural requirements",
    });
    const supportedValidation = screen.getByRole("region", {
      name: "Supported roster validation",
    });
    expect(
      within(supportedValidation).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      within(supportedValidation).getByText("Complete supported view"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("1Violated");
    const missingDoctrine = within(structuralStatus).getByRole("group", {
      name: "Requirements needing attention 1 bound",
    });
    const reviewDoctrine = within(missingDoctrine).getByRole("link", {
      name: "Review selection",
    });
    const doctrineTarget = reviewDoctrine.getAttribute("href");
    expect(doctrineTarget?.startsWith("#roster-selection-")).toBe(true);
    expect(
      doctrineTarget === null
        ? null
        : document.getElementById(doctrineTarget.slice(1)),
    ).toBeTruthy();
    let doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad selection-ui-group-1",
    });
    expect(
      within(doctrine).getByText("0 selected; 1 still required"),
    ).toBeTruthy();
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Choose Mobile Doctrine",
      }),
    );

    expect(await screen.findByText("selection-ui-group-2")).toBeTruthy();
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad selection-ui-group-1",
    });
    expect(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine selected",
      }),
    ).toHaveProperty("disabled", true);
    expect(
      within(doctrine).getByText("1 selected; requirement met"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("No known violations"),
    ).toBeTruthy();
    expect(
      within(supportedValidation).getByText("No known violations"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("0Violated");
    expect(
      within(structuralStatus).getByText(
        "All supported structural requirements are currently satisfied.",
      ),
    ).toBeTruthy();
    expect(
      within(structuralStatus).queryByRole("group", {
        name: /Requirements needing attention/u,
      }),
    ).toBeNull();
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Choose Defensive Doctrine",
      }),
    );

    expect(await screen.findByText("selection-ui-group-3")).toBeTruthy();
    expect(screen.queryByText("selection-ui-group-2")).toBeNull();
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad selection-ui-group-1",
    });
    expect(
      within(doctrine).getByRole("button", {
        name: "Defensive Doctrine selected",
      }),
    ).toHaveProperty("disabled", true);
    expect(
      within(doctrine).getByRole("button", {
        name: "Choose Mobile Doctrine",
      }),
    ).toBeTruthy();
  });

  it("shows and restores supported required direct children", async () => {
    const initializationGameSystem = workspaceFixtureBytes("projection.gst");
    const initializationCatalogue = workspaceFixtureBytes(
      "selection-initialization.cat",
    );
    let selectionIndex = 0;
    render(
      <App
        createEntityId={(kind) =>
          kind === "selection"
            ? `selection-ui-bound-${++selectionIndex}`
            : `${kind}-ui-bound`
        }
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [
            browserFile("projection.gst", initializationGameSystem),
            browserFile(
              "selection-initialization.cat",
              initializationCatalogue,
            ),
          ],
        },
      },
    );

    await screen.findByRole("button", {
      name: /Selection Initialization/u,
    });
    const force = screen.getByLabelText("Starting force");
    const initializationForce = Array.from(
      force.querySelectorAll("option"),
    ).find(({ textContent }) => textContent === "Initialization Force");
    expect(initializationForce).toBeDefined();
    fireEvent.change(force, {
      target: { value: initializationForce?.value },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));

    const editor = screen.getByRole("region", { name: "Add units" });
    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    const initializedChildren = within(selectedRoster).getByRole("group", {
      name: "Selected child occurrences 3 selections",
    });
    expect(initializedChildren.hasAttribute("open")).toBe(false);
    fireEvent.click(
      within(initializedChildren).getByText("3 selections"),
    );
    expect(initializedChildren.hasAttribute("open")).toBe(true);
    const structuralStatus = screen.getByRole("region", {
      name: "Supported structural requirements",
    });
    const supportedValidation = screen.getByRole("region", {
      name: "Supported roster validation",
    });
    expect(
      within(supportedValidation).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      within(supportedValidation).getByText(
        "Incomplete supported view",
      ),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("Incomplete inspection"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("1Violated");
    const initialAttention = within(structuralStatus).getByRole("group", {
      name: "Requirements needing attention 2 bounds",
    });
    expect(within(initialAttention).getByText("Modified Child")).toBeTruthy();
    expect(within(initialAttention).getByText("Manual Group")).toBeTruthy();
    expect(within(initialAttention).queryByText("Required Model")).toBeNull();
    const reviewSelectionLinks = within(initialAttention).getAllByRole(
      "link",
      { name: "Review selection" },
    );
    expect(reviewSelectionLinks).toHaveLength(2);
    const firstSelectionTarget =
      reviewSelectionLinks[0]?.getAttribute("href");
    expect(
      firstSelectionTarget === null ||
        firstSelectionTarget === undefined
        ? null
        : document.getElementById(firstSelectionTarget.slice(1)),
    ).toBeTruthy();
    const satisfiedBounds = within(structuralStatus).getByRole("group", {
      name: "Satisfied structural bounds 8 bounds",
    });
    expect(satisfiedBounds.hasAttribute("open")).toBe(false);
    expect(
      within(structuralStatus).getByRole("group", {
        name: "Structural diagnostics 1 diagnostic",
      }),
    ).toBeTruthy();
    expect(within(editor).getByText("Units")).toBeTruthy();
    expect(within(editor).getByText("Configuration")).toBeTruthy();
    expect(within(editor).getByText("Uncategorized")).toBeTruthy();
    expect(
      within(editor).getByRole("button", {
        name: "Initialization Unit maximum reached",
      }),
    ).toHaveProperty("disabled", true);
    expect(
      within(editor).getByRole("button", {
        name: "Duplicate Initialization Unit maximum reached",
      }),
    ).toHaveProperty("disabled", true);
    expect(
      within(editor).getByRole("button", {
        name: "Add Disabled Automatic Root",
      }),
    ).toHaveProperty("disabled", false);
    const addRequiredModel = await screen.findByRole("button", {
      name: "Add Required Model to Initialization Unit selection-ui-bound-1",
    });
    expect(addRequiredModel).toHaveProperty("disabled", true);
    expect(
      screen.getByText("2 selected; requirement met"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Required Model selection-ui-bound-2",
      }),
    );

    expect(screen.queryByText("selection-ui-bound-2")).toBeNull();
    expect(screen.queryByText("selection-ui-bound-3")).toBeNull();
    expect(addRequiredModel).toHaveProperty("disabled", false);
    expect(
      screen.getByText("1 selected; 1 still required"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("2Violated");
    expect(
      within(structuralStatus).getByRole("group", {
        name: "Requirements needing attention 3 bounds",
      }),
    ).toBeTruthy();
    fireEvent.click(addRequiredModel);

    expect(await screen.findByText("selection-ui-bound-7")).toBeTruthy();
    expect(await screen.findByText("selection-ui-bound-8")).toBeTruthy();
    expect(addRequiredModel).toHaveProperty("disabled", true);
    expect(
      screen.getByText("2 selected; requirement met"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("1Violated");
    expect(
      within(structuralStatus).getByRole("group", {
        name: "Requirements needing attention 2 bounds",
      }),
    ).toBeTruthy();
  });

  it("saves, reopens, and confirms deletion of a browser-local draft", async () => {
    const { store, records } = memoryDraftStore();
    render(
      <App
        draftStore={store}
        createBatchId={() => "draft-ui-batch"}
        createDraftId={() => "draft-ui"}
        createEntityId={(kind) => `${kind}-draft-ui`}
        now={() => "2026-07-23T17:00:00.000Z"}
      />,
    );

    const shelf = screen.getByRole("region", {
      name: "Saved roster drafts",
    });
    await within(shelf).findByText("No roster drafts saved yet.");
    fireEvent.change(
      screen.getByLabelText("Choose BattleScribe files"),
      {
        target: {
          files: [
            browserFile("minimal.gst", gameSystemBytes),
            browserFile("minimal.cat", catalogueBytes),
          ],
        },
      },
    );

    await screen.findByRole("button", { name: /Synthetic Faction/u });
    fireEvent.change(screen.getByLabelText("Roster name"), {
      target: { value: "Saved Patrol" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Infantry Squad" }),
    );
    expect(await screen.findByText("selection-draft-ui")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await within(shelf).findByText("Saved Saved Patrol in this browser.");
    expect(within(shelf).getByText("Saved Patrol")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Update saved draft" }),
    ).toBeTruthy();
    const saved = records.get("draft-ui");
    expect(saved).toMatchObject({
      id: "draft-ui",
      catalogueKey: expect.any(String),
      import: {
        batchId: "draft-ui-batch",
        files: [
          {
            filename: "minimal.gst",
            sourceId: "local-file:draft-ui-batch:0",
            sourceKind: "local-file",
          },
          {
            filename: "minimal.cat",
            sourceId: "local-file:draft-ui-batch:1",
            sourceKind: "local-file",
          },
        ],
      },
      roster: {
        name: "Saved Patrol",
      },
    });
    expect(Array.from(saved?.import.files[0]?.bytes ?? [])).toEqual(
      Array.from(gameSystemBytes),
    );
    expect(Array.from(saved?.import.files[1]?.bytes ?? [])).toEqual(
      Array.from(catalogueBytes),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Change roster setup" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Saved Patrol" }),
    ).toBeNull();
    fireEvent.click(within(shelf).getByRole("button", { name: "Open" }));

    expect(
      await screen.findByRole("heading", { name: "Saved Patrol" }),
    ).toBeTruthy();
    expect(await screen.findByText("selection-draft-ui")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Update saved draft" }),
    ).toBeTruthy();

    fireEvent.click(
      within(shelf).getByRole("button", { name: "Delete Saved Patrol" }),
    );
    fireEvent.click(
      within(shelf).getByRole("button", { name: "Confirm delete" }),
    );
    await within(shelf).findByText("No roster drafts saved yet.");
    expect(records.size).toBe(0);
  });
});

function constraintStatusText(
  region: HTMLElement,
  label: "Satisfied" | "Violated" | "Unresolved",
): string | null {
  const statuses = within(region).getByRole("list", {
    name: /statuses$/u,
  });
  return within(statuses).getByText(label).parentElement?.textContent ?? null;
}

function browserFile(
  name: string,
  bytes: Uint8Array,
  type = "application/xml",
): BrowserFileSource {
  return {
    name,
    type,
    arrayBuffer: async () => Uint8Array.from(bytes).buffer,
  };
}

function xmlBytes(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function workspaceFixtureBytes(filename: string): Uint8Array {
  return readFileSync(
    resolve("packages", "test-fixtures", "fixtures", filename),
  );
}

function memoryDraftStore(): {
  readonly store: ReturnType<typeof createLocalRosterDraftStore>;
  readonly records: Map<string, LocalRosterDraft>;
} {
  const records = new Map<string, LocalRosterDraft>();
  const backend: LocalRosterDraftRecordBackend = {
    getAll: async () => [...records.values()],
    get: async (id) => records.get(id),
    put: async (draft) => {
      records.set(draft.id, draft);
    },
    delete: async (id) => {
      records.delete(id);
    },
  };
  return {
    store: createLocalRosterDraftStore(backend),
    records,
  };
}
