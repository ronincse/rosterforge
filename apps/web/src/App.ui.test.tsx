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
  recoveryDraftId,
  type LocalRosterDraftRecordBackend,
  type StoredRecord,
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

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
    <costType
      id="cost-experience"
      name="Crusade: Experience"
      defaultCostLimit="-1"
    />
  </costTypes>
  <profileTypes>
    <profileType id="profile-type-unit" name="Unit">
      <characteristicTypes>
        <characteristicType id="characteristic-move" name="Move" />
        <characteristicType
          id="characteristic-keywords"
          name="Keywords"
        />
      </characteristicTypes>
    </profileType>
    <profileType id="profile-type-weapon" name="Ranged Weapons">
      <characteristicTypes>
        <characteristicType id="weapon-range" name="Range" />
        <characteristicType id="weapon-attacks" name="A" />
        <characteristicType id="weapon-skill" name="BS" />
        <characteristicType id="weapon-strength" name="S" />
        <characteristicType id="weapon-ap" name="AP" />
        <characteristicType id="weapon-damage" name="D" />
        <characteristicType id="weapon-keywords" name="Keywords" />
      </characteristicTypes>
    </profileType>
  </profileTypes>
  <categoryEntries>
    <categoryEntry id="cat-infantry" name="Infantry" hidden="false" />
    <categoryEntry id="cat-battleline" name="Battleline" hidden="false" />
  </categoryEntries>
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
      <categoryLinks>
        <categoryLink id="squad-infantry" name="Infantry"
          targetId="cat-infantry" primary="false" />
      </categoryLinks>
      <modifiers>
        <modifier type="add" field="category" value="cat-battleline" />
        <!-- A catalogue name modifier, the shape the corpus uses for Crusade
             rank suffixes. No join, so the separator defaults to a space. -->
        <modifier type="append" field="name" value="(Elite)" />
        <modifier
          type="set"
          field="characteristic-move"
          value="9"
          affects="self.entries.profiles.Unit"
        />
        <modifier
          type="append"
          field="characteristic-keywords"
          value="Assault"
          join=", "
          affects="self.entries.profiles.Unit"
        />
        <modifier
          type="append"
          field="annotation"
          value="Veteran Issue"
          join=", "
          affects="self.entries.profiles.Unit"
        />
      </modifiers>
      <costs>
        <cost name="Points" typeId="cost-points" value="80" />
        <!-- A campaign bookkeeping field that evaluates to zero. The
             workspace must keep it in the cost report without promoting it
             beside matched-play points. -->
        <cost
          name="Crusade: Experience"
          typeId="cost-experience"
          value="0"
        />
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
          <modifiers>
            <modifier type="set" field="characteristic-move" value="8" />
            <modifier type="append" field="annotation"
              value="Veteran Issue" join=", " />
          </modifiers>
          <modifierGroups>
            <modifierGroup type="and">
              <modifiers>
                <modifier type="set" field="name"
                  value="Veteran Infantry profile" />
              </modifiers>
              <conditions>
                <condition type="atLeast" field="selections"
                  scope="self" childId="any" value="1" />
              </conditions>
            </modifierGroup>
          </modifierGroups>
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
          <modifiers>
            <!-- Unsupported display-name behavior keeps the source name but
                 makes its completeness warning a details-level concern. -->
            <modifier type="multiply" field="name" value="2" />
            <modifier type="append" field="annotation"
              value="Master-crafted" join=", " />
          </modifiers>
          <profiles>
            <profile
              id="profile-special-weapon"
              name="Special Weapon profile"
              typeId="profile-type-unit"
              typeName="Unit"
            >
              <characteristics>
                <characteristic
                  name="Move"
                  typeId="characteristic-move"
                >4</characteristic>
                <characteristic
                  name="Keywords"
                  typeId="characteristic-keywords"
                >Heavy</characteristic>
              </characteristics>
            </profile>
          </profiles>
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
            >
              <rules>
                <rule id="rule-mobile-doctrine" name="Mobile Advance">
                  <description>Keep moving while the enemy reacts.</description>
                </rule>
              </rules>
            </selectionEntry>
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
    <selectionEntry id="entry-veteran-fireteam" name="Veteran Fireteam" type="unit">
      <categoryLinks>
        <categoryLink id="veteran-infantry" name="Infantry"
          targetId="cat-infantry" primary="false" />
        <categoryLink id="veteran-code" name="9CF8-50F3-F6F5-EA4C"
          targetId="opaque-veteran-code" primary="false" />
      </categoryLinks>
      <rules>
        <rule id="rule-disciplined-fire" name="Disciplined Fire">
          <description>This unit remains accurate while advancing.</description>
        </rule>
      </rules>
      <selectionEntries>
        <selectionEntry id="entry-veteran" name="Veteran" type="model"
          defaultAmount="5" step="1">
          <constraints>
            <constraint id="veteran-min" type="min" field="selections"
              scope="parent" value="5" />
            <constraint id="veteran-max" type="max" field="selections"
              scope="parent" value="10" />
          </constraints>
          <profiles>
            <profile id="profile-veteran" name="Veteran"
              typeId="profile-type-unit" typeName="Unit">
              <characteristics>
                <characteristic name="Move"
                  typeId="characteristic-move">6</characteristic>
                <characteristic name="Keywords"
                  typeId="characteristic-keywords">Infantry</characteristic>
              </characteristics>
            </profile>
          </profiles>
          <selectionEntries>
            <selectionEntry id="entry-service-rifle" name="Service rifle"
              type="upgrade">
              <constraints>
                <constraint id="service-rifle-min" type="min"
                  field="selections" scope="parent" value="1" />
                <constraint id="service-rifle-max" type="max"
                  field="selections" scope="parent" value="1" />
              </constraints>
              <profiles>
                <profile id="profile-service-rifle" name="Service rifle"
                  typeId="profile-type-weapon" typeName="Ranged Weapons">
                  <characteristics>
                    <characteristic name="Range"
                      typeId="weapon-range">24</characteristic>
                    <characteristic name="A"
                      typeId="weapon-attacks">2</characteristic>
                    <characteristic name="BS"
                      typeId="weapon-skill">3+</characteristic>
                    <characteristic name="S"
                      typeId="weapon-strength">4</characteristic>
                    <characteristic name="AP"
                      typeId="weapon-ap">-1</characteristic>
                    <characteristic name="D"
                      typeId="weapon-damage">1</characteristic>
                    <characteristic name="Keywords"
                      typeId="weapon-keywords">Assault</characteristic>
                  </characteristics>
                </profile>
              </profiles>
            </selectionEntry>
            <selectionEntry id="entry-plasma-rifle" name="Plasma rifle"
              type="upgrade">
              <profiles>
                <profile id="profile-plasma-rifle" name="Plasma rifle"
                  typeId="profile-type-weapon" typeName="Ranged Weapons">
                  <characteristics>
                    <characteristic name="Range"
                      typeId="weapon-range">18</characteristic>
                    <characteristic name="A"
                      typeId="weapon-attacks">1</characteristic>
                    <characteristic name="BS"
                      typeId="weapon-skill">3+</characteristic>
                    <characteristic name="S"
                      typeId="weapon-strength">7</characteristic>
                    <characteristic name="AP"
                      typeId="weapon-ap">-2</characteristic>
                    <characteristic name="D"
                      typeId="weapon-damage">2</characteristic>
                  </characteristics>
                </profile>
              </profiles>
            </selectionEntry>
          </selectionEntries>
        </selectionEntry>
      </selectionEntries>
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
          <modifiers>
            <modifier
              type="multiply"
              field="characteristic-move"
              value="1"
            />
            <modifier type="set" field="hidden" value="true" />
          </modifiers>
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

function addUnitTrigger(): HTMLElement {
  return screen.getByRole("button", { name: /^Add unit,/u });
}

function openAddUnitDialog(): HTMLElement {
  fireEvent.click(addUnitTrigger());
  return screen.getByRole("dialog", { name: "Add unit" });
}

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
      await screen.findByRole("heading", {
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
      await screen.findByRole("heading", { name: "Projection Catalogue" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Catalogue")).toBeNull();
    expect(screen.queryByText("Graph Library")).toBeNull();
  });

  it("imports a browser file selection into a full-width roster setup", async () => {
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

    expect(
      await screen.findByRole("heading", { name: "Synthetic Faction" }),
    ).toBeTruthy();
    expect(screen.getByText("Synthetic Game")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Roster setup" })).toBeTruthy();
    expect(screen.queryByText("Catalogue library")).toBeNull();
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

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    expect(screen.getByText(/1 file could not be loaded/u)).toBeTruthy();
    fireEvent.click(screen.getByText("Developer import details"));
    expect(screen.getByText("invalid.cat")).toBeTruthy();
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

    await screen.findByRole("heading", { name: "Synthetic Faction" });
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
      screen.queryByText("Catalogue library"),
    ).toBeNull();
    expect(screen.getByRole("region", { name: "Open roster" })).toBeTruthy();
    expect(document.title).toBe("First Patrol");
    expect(screen.queryByLabelText("RosterForge home")).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: "Build your roster. Keep your data local.",
      }),
    ).toBeNull();
    expect(screen.queryByLabelText("Replace local files")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Saved roster drafts" }),
    ).toBeNull();
    expect(screen.getAllByText("Patrol Detachment")).toHaveLength(2);
    expect(rosterForce("force-ui")).toBeTruthy();
    expect(screen.queryByText("force-ui")).toBeNull();
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Roster workspace navigation",
    });
    expect(
      within(workspaceNavigation).getByRole("heading", {
        name: "First Patrol",
      }),
    ).toBeTruthy();
    expect(within(workspaceNavigation).getByText("Synthetic Faction")).toBeTruthy();
    expect(
      within(workspaceNavigation).getByText("Add unit"),
    ).toBeTruthy();
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "First Patrol, Synthetic Faction; 0 army selections",
      }),
    ).toHaveProperty("hash", "#selected-roster-heading");
    const problemsButton = within(workspaceNavigation).getByRole("button", {
      name: "Open roster problems, 0 known violations",
    });
    expect(problemsButton.dataset.problems).toBe("none");
    expect(
      within(workspaceNavigation)
        .getByRole("button", {
          name: "Add unit, 2 available choices",
        })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    expect(
      within(selectedRoster).getByText("No units added yet"),
    ).toBeTruthy();
    // Identity, budget, and known problems live in the compact sticky bar;
    // report evidence stays collapsed below the ordinary roster workflow.
    expect(
      screen.queryByRole("region", { name: "Roster summary" }),
    ).toBeNull();
    expect(
      within(workspaceNavigation).queryByRole("link", {
        name: /structural violation/u,
      }),
    ).toBeNull();
    expect(
      within(workspaceNavigation).queryByRole("link", {
        name: /constraint violation/u,
      }),
    ).toBeNull();
    const checksReport = screen.getByRole("group", {
      name: /Detailed supported evidence/u,
    });
    expect(checksReport.hasAttribute("open")).toBe(false);
    expect(
      within(checksReport).getByText(
        "0 known violations | all supported rules checked",
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(checksReport).getByText("Detailed supported evidence"),
    );
    expect(checksReport.hasAttribute("open")).toBe(true);
    const rosterReportDetails = screen.getByRole("region", {
      name: "Roster report details",
    });
    expect(
      within(rosterReportDetails).queryByRole("group", {
        name: /Zero-value source cost fields/u,
      }),
    ).toBeNull();
    const structuralStatus = screen.getByRole("region", {
      name: "Supported structural requirements",
    });
    expect(
      within(structuralStatus).getByText("No known violations"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("All supported rules checked"),
    ).toBeTruthy();
    const constraints = screen.getByRole("region", {
      name: "Constraint bounds",
    });
    expect(
      within(constraints).getByText("All supported rules checked"),
    ).toBeTruthy();
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

    expect(screen.queryByRole("dialog", { name: "Add unit" })).toBeNull();
    const catalogueToggle = within(workspaceNavigation).getByRole("button", {
      name: "Add unit, 2 available choices",
    });
    fireEvent.click(catalogueToggle);
    expect(catalogueToggle.getAttribute("aria-expanded")).toBe("true");
    expect(catalogueToggle.getAttribute("aria-controls")).toBe(
      "add-unit-dialog",
    );
    let editor = screen.getByRole("dialog", { name: "Add unit" });
    const closeCatalogue = within(editor).getByRole("button", {
      name: "Close",
    });
    expect(document.activeElement).toBe(closeCatalogue);
    fireEvent.keyDown(editor, { key: "/" });
    expect(document.activeElement).toBe(
      within(editor).getByRole("searchbox", {
        name: "Search units and options",
      }),
    );
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Add unit" })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(catalogueToggle));
    expect(catalogueToggle.getAttribute("aria-expanded")).toBe("false");
    expect(catalogueToggle.hasAttribute("aria-controls")).toBe(false);
    expect(selectedRoster).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "Roster builder" })
        .getAttribute("data-catalogue-open"),
    ).toBe("false");
    fireEvent.click(catalogueToggle);
    expect(catalogueToggle.getAttribute("aria-expanded")).toBe("true");
    editor = screen.getByRole("dialog", { name: "Add unit" });
    expect(within(editor).getByText("Uncategorized")).toBeTruthy();
    const rootFilter = within(editor).getByLabelText(
      "Search units and options",
    );
    expect(within(editor).getByText("2 matching choices")).toBeTruthy();
    const unitInformationButton = within(editor).getByRole("button", {
      name: "View information for Veteran Fireteam",
    });
    fireEvent.click(unitInformationButton);
    const unitPreview = screen.getByRole("dialog", {
      name: "Veteran Fireteam",
    });
    expect(
      within(unitPreview).queryByText(/source-authored catalogue values/u),
    ).toBeNull();
    expect(
      within(unitPreview).getByText("Initial unit composition"),
    ).toBeTruthy();
    expect(within(unitPreview).getByText("5× Veteran")).toBeTruthy();
    expect(within(unitPreview).getByText("5× Service rifle")).toBeTruthy();
    expect(within(unitPreview).getByText("Disciplined Fire")).toBeTruthy();
    expect(
      within(unitPreview).getByText(
        "This unit remains accurate while advancing.",
      ),
    ).toBeTruthy();
    expect(within(unitPreview).getAllByText("24").length).toBeGreaterThan(0);
    expect(
      within(unitPreview).getAllByText("Infantry").length,
    ).toBeGreaterThan(0);
    expect(
      within(unitPreview).queryByText("9CF8-50F3-F6F5-EA4C"),
    ).toBeNull();
    const availableOptions = within(unitPreview)
      .getByText("Available model options and alternate profiles")
      .closest("summary");
    expect(availableOptions).toBeTruthy();
    const availableOptionsDetails = availableOptions!.closest("details");
    expect(availableOptionsDetails).toBeTruthy();
    availableOptionsDetails!.open = true;
    fireEvent(availableOptionsDetails!, new Event("toggle"));
    await waitFor(() =>
      expect(
        within(unitPreview).getAllByText("Plasma rifle").length,
      ).toBeGreaterThan(0),
    );
    expect(rosterSelection("selection-ui-1")).toBeNull();
    fireEvent.keyDown(unitPreview, { key: "Escape" });
    await waitFor(() =>
      expect(document.activeElement).toBe(unitInformationButton),
    );
    fireEvent.change(rootFilter, { target: { value: "missing" } });
    expect(
      within(editor).getByText(
        "No available units or options match this search.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Add Infantry Squad" }),
    ).toBeNull();
    fireEvent.change(rootFilter, { target: { value: "infantry" } });
    expect(within(editor).getByText("1 matching choice")).toBeTruthy();
    expect(screen.getByRole("button", {
      name: "Add Infantry Squad",
    })).toBeTruthy();
    const rootPreviewButton = within(editor).getByRole("button", {
      name: "View information for Infantry Squad",
    });
    const rootAddButton = within(editor).getByRole("button", {
      name: "Add Infantry Squad",
    });
    const rootChoiceCard = rootAddButton.closest(".root-choice");
    expect(rootChoiceCard).toBeTruthy();
    expect(rootAddButton.textContent).toBe("+");
    expect(within(rootChoiceCard as HTMLElement).getByText("80 Points")).toBeTruthy();
    // This synthetic root deliberately has no supported force-wide maximum,
    // so the compact counter does not invent a denominator.
    expect(within(rootChoiceCard as HTMLElement).getByText("0")).toBeTruthy();
    expect(rootPreviewButton.parentElement).toBe(rootAddButton.parentElement);
    expect(rootPreviewButton.parentElement?.classList).toContain(
      "choice-segmented-control",
    );
    fireEvent.click(rootPreviewButton);
    const rootPreview = screen.getByRole("dialog", {
      name: "Infantry Squad",
    });
    expect(within(rootPreview).getByText("Hold Ground")).toBeTruthy();
    expect(
      within(rootPreview).getByText("Remain on the objective."),
    ).toBeTruthy();
    expect(rosterSelection("selection-ui-1")).toBeNull();
    const closeRootPreview = within(rootPreview).getByRole("button", {
      name: "Close",
    });
    expect(document.activeElement).toBe(closeRootPreview);
    fireEvent.keyDown(rootPreview, { key: "Tab" });
    expect(document.activeElement).toBe(closeRootPreview);
    fireEvent.keyDown(rootPreview, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Infantry Squad" }),
    ).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(rootPreviewButton));
    expect(screen.getByRole("dialog", { name: "Add unit" })).toBeTruthy();
    fireEvent.click(within(editor).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(document.activeElement).toBe(catalogueToggle));
    fireEvent.click(catalogueToggle);
    editor = screen.getByRole("dialog", { name: "Add unit" });
    expect(
      within(editor).getByLabelText("Search units and options"),
    ).toHaveProperty("value", "infantry");
    fireEvent.click(
      screen.getByRole("button", { name: "Add Infantry Squad" }),
    );
    await waitFor(() => {
      expect(rosterSelection("selection-ui-1")).toBeTruthy();
    });
    // A successful army add closes the focused catalogue task while keeping
    // the new unit selected in the dedicated options surface.
    expect(screen.queryByRole("dialog", { name: "Add unit" })).toBeNull();
    let unitOptions = screen.getByRole("region", {
      name: "Unit options for Infantry Squad",
    });
    expect(screen.queryByText("selection-ui-1")).toBeNull();
    // The catalogue's name modifier refines the displayed name.
    expect(screen.getByText("Infantry Squad (Elite)")).toBeTruthy();
    // The tree groups top-level selections by battlefield role. This squad's
    // only category link carries primary="false", so it genuinely declares no
    // primary and is filed under "Other" rather than being guessed into
    // Infantry — the category it merely belongs to. The fixture has no
    // Configuration root either, and an empty role renders no heading at all.
    const armySection = screen.getByRole("region", { name: "Other" });
    expect(screen.queryByRole("region", { name: "Infantry" })).toBeNull();
    expect(
      within(armySection).getByText("Infantry Squad (Elite)"),
    ).toBeTruthy();
    expect(within(armySection).getByText("1 selection")).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Configuration" }),
    ).toBeNull();
    expect(
      within(armySection).getByText("Contains known violation"),
    ).toBeTruthy();
    const compactUnitRow = rosterSelection("selection-ui-1");
    expect(
      within(compactUnitRow as HTMLElement).getByText("Known violation"),
    ).toBeTruthy();
    expect(rosterSelection("selection-ui-1")?.dataset.attention).toBe(
      "violation",
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(compactUnitRow as HTMLElement).getByRole("button", {
          name: "Configure Infantry Squad (Elite)",
        }),
      ),
    );

    // The unit card carries its recursive cost in the always-visible row, so a
    // collapsed army still shows what each unit is worth.
    const unitCard = armySection.querySelector(".selection-cost-totals");
    expect(unitCard?.textContent).toContain("80");
    expect(unitCard?.textContent).toContain("Points");

    const unitSelector = within(armySection).getByRole("button", {
      name: "Configure Infantry Squad (Elite)",
    });
    expect(unitSelector.getAttribute("aria-expanded")).toBe("true");
    expect(unitSelector.getAttribute("aria-controls")).toBe(
      "selected-unit-options-panel",
    );
    expect(
      within(compactUnitRow as HTMLElement).getAllByRole("button"),
    ).toHaveLength(1);
    // Army rows remain compact. Viewing and removal live in the focused
    // inspector instead of multiplying controls on every list row.
    expect(armySection.querySelector(".selection-card-body")).toBeNull();
    expect(armySection.querySelector(".selection-datasheet")).toBeNull();
    expect(within(armySection).queryByText("Keywords")).toBeNull();
    const viewButton = within(unitOptions).getByRole("button", {
      name: "View unit card",
    });
    fireEvent.click(viewButton);
    expect(viewButton.getAttribute("aria-expanded")).toBe("true");
    let unitCardView = screen.getByRole("dialog", {
      name: "Unit card for Infantry Squad",
    });
    expect(within(workspaceNavigation).getByText("80")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("Points used")).toBeTruthy();
    const zeroCosts = within(rosterReportDetails).getByRole("group", {
      name: "Zero-value source cost fields 1 field",
    });
    expect(zeroCosts.hasAttribute("open")).toBe(false);
    expect(
      within(zeroCosts).getByText("Crusade: Experience"),
    ).toBeTruthy();
    expect(undo).toHaveProperty("disabled", false);
    expect(redo).toHaveProperty("disabled", true);
    expect(unitCardView.querySelector(".selection-datasheet")).toBeTruthy();
    const editDisclosure = unitOptions.querySelector(".selection-edit");
    expect(editDisclosure?.hasAttribute("open")).toBe(false);
    // Effective keywords include one the catalogue only grants by modifier.
    expect(within(unitCardView).getByText("Keywords")).toBeTruthy();
    expect(within(unitCardView).getByText("Battleline")).toBeTruthy();
    expect(within(unitCardView).getByText("added")).toBeTruthy();
    // Profile-name groups run before the separately routed annotation.
    expect(
      within(unitCardView).getByText(
        "Veteran Infantry profile (Veteran Issue)",
      ),
    ).toBeTruthy();
    expect(within(unitCardView).getAllByText("Move")).toHaveLength(2);
    // A supported profile set replaces the displayed value and keeps the
    // source value visible as the base.
    expect(within(unitCardView).getByText("8")).toBeTruthy();
    expect(within(unitCardView).getByText("Base 6")).toBeTruthy();
    expect(within(unitCardView).queryByText("6")).toBeNull();
    expect(within(unitCardView).getByText("Hold Ground")).toBeTruthy();
    expect(
      within(unitCardView).getByText("Remain on the objective."),
    ).toBeTruthy();
    expect(within(unitCardView).getByText("Shared Tactics")).toBeTruthy();
    expect(within(unitCardView).getByText("Advance together.")).toBeTruthy();
    expect(within(unitCardView).getByText("Info groups")).toBeTruthy();
    expect(within(unitCardView).getByText("Fieldcraft")).toBeTruthy();
    expect(within(unitCardView).getByText("Forward Observer")).toBeTruthy();
    // An unsupported increment leaves the info-group profile's effective value
    // unresolved, so the source value stays visible and is labelled.
    expect(within(unitCardView).getByText("Scout 6")).toBeTruthy();
    expect(
      within(unitCardView).getByText("Effective value unresolved"),
    ).toBeTruthy();
    // A hidden profile is labelled rather than removed.
    expect(
      within(unitCardView).getByText("Hidden by this catalogue."),
    ).toBeTruthy();
    expect(
      within(unitCardView).getByText(
        "Some display behavior on this profile is unsupported, so these values are not a complete result.",
      ),
    ).toBeTruthy();
    expect(
      within(unitCardView).getByText("Coordinated Scouting"),
    ).toBeTruthy();
    expect(
      within(unitCardView).getByText("Share every route discovered."),
    ).toBeTruthy();
    // Player-facing profile and rule headers no longer expose import filenames
    // or direct/linked implementation vocabulary. Provenance remains available
    // under one explicit developer disclosure.
    expect(
      unitCardView.querySelector(".selection-profile header small"),
    ).toBeNull();
    expect(
      unitCardView.querySelector(".selection-rule header small"),
    ).toBeNull();
    const developerDetails = within(unitCardView)
      .getByText("Developer details")
      .closest("details");
    expect(developerDetails).toBeTruthy();
    expect(
      within(developerDetails as HTMLElement).getByText(
        "minimal.cat, minimal.gst",
      ),
    ).toBeTruthy();
    // Renaming is editing, so it moved behind `Edit selection` with the rest.
    fireEvent.click(within(unitOptions).getByText("Edit selection"));
    fireEvent.change(
      within(unitOptions).getByLabelText("Occurrence name"),
      {
        target: { value: "Veterans" },
      },
    );
    fireEvent.click(
      within(unitOptions).getByRole("button", { name: "Rename" }),
    );
    expect(
      within(selectedRoster).getAllByText("Veterans (Elite)").length,
    ).toBeGreaterThan(0);
    unitOptions = screen.getByRole("region", {
      name: "Unit options for Veterans",
    });
    const amountInput = within(unitOptions).getByLabelText("Amount");
    fireEvent.change(amountInput, { target: { value: "2" } });
    fireEvent.click(
      within(unitOptions).getByRole("button", { name: "Set amount" }),
    );
    expect(within(workspaceNavigation).getByText("160")).toBeTruthy();
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "First Patrol, Synthetic Faction; 160 Points used",
      }),
    ).toBeTruthy();
    fireEvent.click(
      within(selectedRoster).getByRole("button", { name: "Use 1" }),
    );

    editor = openAddUnitDialog();
    fireEvent.click(within(editor).getByRole("button", {
      name: "Add Infantry Squad",
    }));
    expect(rosterSelection("selection-ui-2")).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Infantry Squad (Elite)"),
    ).toHaveLength(1);
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "First Patrol, Synthetic Faction; 160 Points used",
      }),
    ).toBeTruthy();
    expect(within(workspaceNavigation).getByText("160")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("Points used")).toBeTruthy();
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
      name: "Constraint violations 2 bounds",
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
    expect(problemsButton.dataset.problems).toBe("present");

    const veterans = rosterSelection("selection-ui-1");
    expect(veterans).toBeTruthy();
    fireEvent.click(
      within(veterans as HTMLElement).getByRole("button", {
        name: "Configure Veterans (Elite)",
      }),
    );
    unitOptions = screen.getByRole("region", {
      name: "Unit options for Veterans",
    });
    fireEvent.click(
      within(unitOptions).getByRole("button", {
        name: "Special Weapon",
      }),
    );
    await waitFor(() => {
      expect(rosterSelection("selection-ui-3")).toBeTruthy();
    });
    expect(
      within(unitOptions).getByText("Special Weapon (Master-crafted)"),
    ).toBeTruthy();
    expect(within(workspaceNavigation).getByText("170")).toBeTruthy();
    const selectedWeaponControl = within(unitOptions).getByRole("button", {
      name: "Special Weapon",
    });
    expect(
      within(selectedWeaponControl).getByText("10 Points"),
    ).toBeTruthy();
    expect(selectedWeaponControl.getAttribute("aria-pressed")).toBe("true");
    expect(selectedWeaponControl).toHaveProperty("disabled", false);
    expect(
      within(unitOptions).getByRole("button", {
        name: "Add another Special Weapon",
      }),
    ).toBeTruthy();

    // The weapon's own datasheet says 4; the squad's `affects` selector routes a
    // set to it. The panel has to name the declarer, or the reader cannot tell
    // why the printed value and the displayed value disagree.
    unitCardView = screen.getByRole("dialog", {
      name: "Unit card for Veterans",
    });
    const weaponNode = within(unitCardView);
    expect(
      weaponNode.getByText("Special Weapon (Master-crafted)"),
    ).toBeTruthy();
    // The unresolved-naming notice now rides with the datasheet rather than
    // waiting behind a second click, so it is visible as soon as the card is.
    expect(
      weaponNode.getByText(
        "Some display naming is unresolved for this selection.",
      ),
    ).toBeTruthy();
    expect(
      weaponNode.getByText("Special Weapon profile (Veteran Issue)"),
    ).toBeTruthy();
    expect(weaponNode.getByText("9")).toBeTruthy();
    expect(weaponNode.getByText("Base 4")).toBeTruthy();
    expect(weaponNode.getByText("Set by Veterans")).toBeTruthy();
    // The verb tracks the operation: the same declarer appends a keyword, and
    // calling that "set" would misdescribe the row.
    expect(weaponNode.getByText("Heavy, Assault")).toBeTruthy();
    expect(weaponNode.getByText("Base Heavy")).toBeTruthy();
    expect(weaponNode.getByText("Added by Veterans")).toBeTruthy();
    // A display annotation renders in parentheses after the profile name, the
    // way New Recruit shows it.

    // The same quick-choice control removes the newest exact occurrence. A
    // distinct Add-another action keeps genuinely repeatable direct choices
    // additive without making the selected control add by accident.
    fireEvent.click(selectedWeaponControl);
    await waitFor(() => {
      expect(rosterSelection("selection-ui-3")).toBeNull();
    });
    expect(
      within(veterans as HTMLElement)
        .queryByRole("button", { name: "Special Weapon" }),
    ).toBeNull();
    expect(
      within(unitOptions)
        .getByRole("button", { name: "Special Weapon" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    fireEvent.click(undo);
    await waitFor(() => {
      expect(rosterSelection("selection-ui-3")).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Veterans",
      }),
    );
    expect(rosterSelection("selection-ui-1")).toBeNull();
    expect(rosterSelection("selection-ui-3")).toBeNull();
    expect(rosterSelection("selection-ui-2")).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Infantry Squad (Elite)"),
    ).toHaveLength(1);
    expect(within(workspaceNavigation).getByText("80")).toBeTruthy();
    expect(
      constraintStatusText(constraints, "Satisfied"),
    ).toBe("2Satisfied");
    expect(
      constraintStatusText(constraints, "Violated"),
    ).toBe("0Violated");
    expect(problemsButton.dataset.problems).toBe("present");
    expect(
      within(constraints).queryByRole("group", {
        name: /Constraint violations/u,
      }),
    ).toBeNull();
    expect(
      within(constraints).getByRole("group", {
        name: "Satisfied constraint bounds 2 bounds",
      }),
    ).toBeTruthy();

    fireEvent.click(undo);
    expect(rosterSelection("selection-ui-1")).toBeTruthy();
    fireEvent.click(
      within(rosterSelection("selection-ui-1") as HTMLElement).getByRole(
        "button",
        { name: "Configure Veterans (Elite)" },
      ),
    );
    expect(rosterSelection("selection-ui-3")).toBeTruthy();
    expect(
      within(selectedRoster).getAllByText("Veterans (Elite)").length,
    ).toBeGreaterThan(0);
    expect(within(workspaceNavigation).getByText("170")).toBeTruthy();
    expect(redo).toHaveProperty("disabled", false);

    fireEvent.click(redo);
    expect(rosterSelection("selection-ui-1")).toBeNull();
    expect(rosterSelection("selection-ui-3")).toBeNull();
    expect(rosterSelection("selection-ui-2")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("80")).toBeTruthy();

    fireEvent.click(changeRosterSetup);
    expect(screen.getByRole("region", { name: "Roster setup" })).toBeTruthy();
    expect(document.title).toBe("Lists");
    expect(screen.getByLabelText("RosterForge home")).toBeTruthy();
    expect(screen.getByLabelText("Replace local files")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Saved roster drafts" }),
    ).toBeTruthy();
    expect(screen.queryByText("Catalogue library")).toBeNull();
    expect(
      screen.queryByRole("navigation", {
        name: "Roster workspace navigation",
      }),
    ).toBeNull();
  });

  it("keeps the evaluated points limit visible and names imported keywords", async () => {
    const systemSource = new TextDecoder().decode(gameSystemBytes);
    const pointsLimitedSource = systemSource.replace(
      /(id="force-roster-max"[\s\S]*?\/>\s*)(<\/constraints>)/u,
      `$1<constraint
          id="force-experience-max"
          type="max"
          field="cost-experience"
          scope="force"
          value="4"
          shared="true"
          includeChildSelections="true"
          includeChildForces="true"
        />
        <constraint
          id="force-points-max"
          type="max"
          field="cost-points"
          scope="force"
          value="2000"
          shared="true"
          includeChildSelections="true"
          includeChildForces="true"
        />
      $2`,
    );
    expect(pointsLimitedSource).not.toBe(systemSource);
    const catalogueSource = new TextDecoder().decode(catalogueBytes);
    const importedKeywordSource = catalogueSource.replace(
      /(<categoryLink id="squad-infantry"[\s\S]*?\/>)/u,
      `$1
        <categoryLink id="squad-anhrathe" name="Anhrathe"
          targetId="opaque-imported-category-id" primary="false" />`,
    );
    expect(importedKeywordSource).not.toBe(catalogueSource);
    const system = xmlBytes(pointsLimitedSource);
    const catalogue = xmlBytes(importedKeywordSource);
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: system },
        { filename: "minimal.cat", bytes: catalogue },
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
          browserFile("minimal.gst", system),
          browserFile("minimal.cat", catalogue),
        ],
      },
    });

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Roster workspace navigation",
    });
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Synthetic Faction roster, Synthetic Faction; 0 of 2,000 Points used",
      }),
    ).toBeTruthy();
    expect(within(workspaceNavigation).getByText("0 / 2,000")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("2,000 remaining")).toBeTruthy();
    expect(document.querySelector(".player-header-figures")).toBeNull();
    const checksReport = screen.getByRole("group", {
      name: /Detailed supported evidence/u,
    });
    fireEvent.click(within(checksReport).getByText("Detailed supported evidence"));
    const rosterReportDetails = screen.getByRole("region", {
      name: "Roster report details",
    });
    const otherLimits = within(rosterReportDetails)
      .getByText("Other roster limits")
      .closest("details");
    expect(otherLimits).toBeTruthy();
    expect(
      within(otherLimits as HTMLElement).getByText("Crusade: Experience used"),
    ).toBeTruthy();

    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );
    await waitFor(() => {
      expect(
        within(workspaceNavigation).getByRole("link", {
          name: "Synthetic Faction roster, Synthetic Faction; 80 of 2,000 Points used",
        }),
      ).toBeTruthy();
    });
    expect(within(workspaceNavigation).getByText("80 / 2,000")).toBeTruthy();
    expect(within(workspaceNavigation).getByText("1,920 remaining")).toBeTruthy();
    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    fireEvent.click(
      within(selectedRoster).getByRole("button", {
        name: "View unit card",
      }),
    );
    const unitCard = screen.getByRole("dialog", {
      name: "Unit card for Infantry Squad",
    });
    expect(within(unitCard).getByText("Anhrathe")).toBeTruthy();
    expect(
      within(unitCard).queryByText("opaque-imported-category-id"),
    ).toBeNull();
  });

  it("starts a phone-width roster with the catalogue out of the way", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(max-width: 560px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
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
    render(<App prepareLibrary={prepare} />);
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("minimal.gst", gameSystemBytes),
          browserFile("minimal.cat", catalogueBytes),
        ],
      },
    });

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));

    const catalogueToggle = await screen.findByRole("button", {
      name: "Add unit, 2 available choices",
    });
    expect(catalogueToggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog", { name: "Add unit" })).toBeNull();
    expect(
      screen.getByRole("region", { name: "Selected roster" }),
    ).toBeTruthy();

    fireEvent.click(catalogueToggle);
    expect(catalogueToggle.getAttribute("aria-expanded")).toBe("true");
    const editor = screen.getByRole("dialog", { name: "Add unit" });
    const search = within(editor).getByRole("searchbox", {
      name: "Search units and options",
    });
    await waitFor(() => expect(document.activeElement).toBe(search));

    const close = within(editor).getByRole("button", { name: "Close" });
    const previewButtons = within(editor).getAllByRole("button", {
      name: /^View information for /u,
    });
    const lastPreview = previewButtons.at(-1);
    expect(lastPreview).toBeDefined();
    lastPreview?.focus();
    fireEvent.keyDown(editor, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    close.focus();
    fireEvent.keyDown(editor, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastPreview);

    fireEvent.keyDown(editor, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(catalogueToggle));
    fireEvent.keyDown(document, { key: "/" });
    const reopenedEditor = screen.getByRole("dialog", { name: "Add unit" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(reopenedEditor).getByRole("searchbox", {
          name: "Search units and options",
        }),
      ),
    );
  });

  it("presents selection groups as replaceable concrete choices", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
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

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );

    expect(
      within(rosterSelection("selection-ui-group-1") as HTMLElement).getByText(
        "Known violation",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Contains known violation")).toBeTruthy();
    const checksReport = screen.getByRole("group", {
      name: /Detailed supported evidence/u,
    });
    expect(checksReport.hasAttribute("open")).toBe(true);
    expect(
      within(checksReport).getByText(
        "1 known violation | all supported rules checked",
      ),
    ).toBeTruthy();

    const structuralStatus = screen.getByRole("region", {
      name: "Supported structural requirements",
    });
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Roster workspace navigation",
    });
    const checksButton = within(workspaceNavigation).getByRole("button", {
      name: "Open roster problems, 1 known violation",
    });
    expect(checksButton.dataset.problems).toBe("present");
    fireEvent.click(checksButton);
    const problemsDialog = screen.getByRole("dialog", {
      name: "Roster problems",
    });
    expect(problemsDialog.id).toBe("roster-problems-dialog");
    expect(checksButton.getAttribute("aria-controls")).toBe(
      "roster-problems-dialog",
    );
    fireEvent.keyDown(problemsDialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(checksButton));
    expect(checksButton.hasAttribute("aria-controls")).toBe(false);
    expect(
      within(structuralStatus).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("1Violated");
    const missingDoctrine = within(structuralStatus).getByRole("group", {
      name: "Structural violations 1 bound",
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
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByText("0 selected; 1 still required"),
    ).toBeTruthy();
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "View information for Mobile Doctrine",
      }),
    );
    const doctrinePreview = screen.getByRole("dialog", {
      name: "Mobile Doctrine",
    });
    expect(within(doctrinePreview).getByText("Mobile Advance")).toBeTruthy();
    expect(
      within(doctrinePreview).getByText(
        "Keep moving while the enemy reacts.",
      ),
    ).toBeTruthy();
    expect(rosterSelection("selection-ui-group-2")).toBeNull();
    fireEvent.click(within(doctrinePreview).getByRole("button", { name: "Close" }));
    fireEvent.click(
      within(checksReport).getByText("Detailed supported evidence"),
    );
    expect(checksReport.hasAttribute("open")).toBe(false);
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    );

    await waitFor(() => {
      expect(rosterSelection("selection-ui-group-2")).toBeTruthy();
    });
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    ).toHaveProperty("disabled", false);
    expect(
      within(doctrine).getByText("1 selected; requirement met"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "View unit card" }),
    );
    const unitCard = screen.getByRole("dialog", {
      name: "Unit card for Infantry Squad",
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
    const selectedDoctrine = unitCard.querySelector(
      '[data-occurrence-id="selection-ui-group-2"]',
    );
    expect(selectedDoctrine).toBeTruthy();
    expect(
      within(selectedDoctrine as HTMLElement).queryByText("Keywords"),
    ).toBeNull();
    expect(
      within(structuralStatus).getByText("No known violations"),
    ).toBeTruthy();
    expect(checksButton.dataset.problems).toBe("none");
    expect(
      screen.queryByRole("link", {
        name: "Review known violations for Infantry Squad (Elite)",
      }),
    ).toBeNull();
    expect(screen.queryByText("Contains known violation")).toBeNull();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("0Violated");
    expect(
      within(structuralStatus).getByText(
        "No supported structural requirement is known to be violated.",
      ),
    ).toBeTruthy();
    expect(
      within(structuralStatus).queryByRole("group", {
        name: /Structural violations/u,
      }),
    ).toBeNull();
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    );

    await waitFor(() => {
      expect(rosterSelection("selection-ui-group-2")).toBeNull();
    });
    // Editing the roster updates the open dialog without moving the document.
    expect(scrollIntoView).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(checksReport.hasAttribute("open")).toBe(true);
    });
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByText("0 selected; 1 still required"),
    ).toBeTruthy();
    expect(checksButton.dataset.problems).toBe("present");
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    );
    await waitFor(() => {
      expect(rosterSelection("selection-ui-group-3")).toBeTruthy();
    });
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Defensive Doctrine",
      }),
    );

    await waitFor(() => {
      expect(rosterSelection("selection-ui-group-4")).toBeTruthy();
    });
    expect(rosterSelection("selection-ui-group-3")).toBeNull();
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByRole("button", {
        name: "Defensive Doctrine",
      }),
    ).toHaveProperty("disabled", false);
    expect(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    ).toBeTruthy();
  });

  it("deselects an already selected choice when a group permits several", async () => {
    const source = new TextDecoder().decode(catalogueBytes);
    const multipleChoiceSource = source.replace(
      /(id="group-squad-doctrine-max"[\s\S]*?value=")1("\s*\/>)/u,
      (_match, prefix: string, suffix: string) => `${prefix}2${suffix}`,
    );
    expect(multipleChoiceSource).not.toBe(source);
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        {
          filename: "minimal.cat",
          bytes: xmlBytes(multipleChoiceSource),
        },
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
            ? `selection-ui-multiple-group-${++selectionIndex}`
            : `${kind}-ui-multiple-group`
        }
      />,
    );
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("minimal.gst", gameSystemBytes),
          browserFile("minimal.cat", xmlBytes(multipleChoiceSource)),
        ],
      },
    });

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );

    let doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    );
    await waitFor(() => {
      expect(rosterSelection("selection-ui-multiple-group-2")).toBeTruthy();
    });

    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByText("1 selected; requirement met"),
    ).toBeTruthy();
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Add another Mobile Doctrine",
      }),
    );

    await waitFor(() => {
      expect(rosterSelection("selection-ui-multiple-group-3")).toBeTruthy();
    });
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByText("2 selected; requirement met"),
    ).toBeTruthy();
    expect(
      within(doctrine).queryByRole("button", {
        name: "Add another Mobile Doctrine",
      }),
    ).toBeNull();
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine (2 selected)",
      }),
    );

    await waitFor(() => {
      expect(rosterSelection("selection-ui-multiple-group-3")).toBeNull();
    });
    expect(rosterSelection("selection-ui-multiple-group-2")).toBeTruthy();
    doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByText("1 selected; requirement met"),
    ).toBeTruthy();
    expect(
      within(doctrine).getByRole("button", {
        name: "Add another Mobile Doctrine",
      }),
    ).toBeTruthy();
  });

  it("honors an exact choice maximum inside an unbounded group", async () => {
    const source = new TextDecoder().decode(catalogueBytes);
    const unboundedGroupSource = source
      .replace(
        /(id="group-squad-doctrine-max"[\s\S]*?value=")1("\s*\/>)/u,
        (_match, prefix: string, suffix: string) => `${prefix}-1${suffix}`,
      )
      .replace(
        /(<selectionEntry\s+id="entry-mobile-doctrine"[\s\S]*?type="upgrade"\s*>)/u,
        `$1
              <constraints>
                <constraint
                  id="entry-mobile-doctrine-max"
                  type="max"
                  field="selections"
                  scope="parent"
                  value="1"
                />
              </constraints>
            `,
      );
    expect(unboundedGroupSource).not.toBe(source);
    const unboundedGroupBytes = xmlBytes(unboundedGroupSource);
    const prepared = await prepareLocalCatalogueLibrary(
      [
        { filename: "minimal.gst", bytes: gameSystemBytes },
        { filename: "minimal.cat", bytes: unboundedGroupBytes },
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
          browserFile("minimal.gst", gameSystemBytes),
          browserFile("minimal.cat", unboundedGroupBytes),
        ],
      },
    });

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );
    let doctrine = screen.getByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    fireEvent.click(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    );

    doctrine = await screen.findByRole("group", {
      name: "Squad Doctrine choices for Infantry Squad",
    });
    expect(
      within(doctrine).getByRole("button", {
        name: "Mobile Doctrine",
      }),
    ).toBeTruthy();
    expect(
      within(doctrine).queryByRole("button", {
        name: "Add another Mobile Doctrine",
      }),
    ).toBeNull();
    expect(
      within(doctrine).getByRole("button", {
        name: "Defensive Doctrine",
      }),
    ).toBeTruthy();
  });

  it("flattens wrapper loadouts and gives singleton roster roles a dedicated control", async () => {
    const gameSystem = workspaceFixtureBytes("projection.gst");
    const catalogue = workspaceFixtureBytes("nested-group-bound.cat");
    let selectionIndex = 0;
    render(
      <App
        createEntityId={(kind) =>
          kind === "selection"
            ? `nested-ui-selection-${++selectionIndex}`
            : `nested-ui-${kind}`
        }
      />,
    );
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("projection.gst", gameSystem),
          browserFile("nested-group-bound.cat", catalogue),
        ],
      },
    });

    await screen.findByRole("heading", { name: "Nested Group Bound" });
    const force = screen.getByLabelText("Starting force");
    const nestedForce = Array.from(force.querySelectorAll("option")).find(
      ({ textContent }) => textContent === "Nested Force",
    );
    fireEvent.change(force, { target: { value: nestedForce?.value } });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Nested Unit" }),
    );
    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    fireEvent.click(
      within(selectedRoster).getByRole("button", {
        name: "Configure Nested Unit",
      }),
    );
    const options = within(selectedRoster).getByRole("region", {
      name: "Unit options for Nested Unit",
    });

    const role = within(options).getByRole("region", {
      name: "Roster role for Nested Unit",
    });
    const warlord = within(role).getByRole("button", { name: "Warlord" });
    expect(warlord.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(warlord);
    expect(warlord.getAttribute("aria-pressed")).toBe("true");
    expect(within(role).getByText("Selected for this unit")).toBeTruthy();
    fireEvent.click(warlord);
    expect(warlord.getAttribute("aria-pressed")).toBe("false");

    const wargear = within(options).getByRole("group", {
      name: "Wargear choices for Nested Unit",
    });
    expect(within(wargear).queryByText("No entries are defined in this group.")).toBeNull();
    expect(within(wargear).getByText("0 selected; 2 still required")).toBeTruthy();
    const melee = within(wargear).getByRole("group", {
      name: "Melee options choices for Nested Unit",
    });
    const ranged = within(wargear).getByRole("group", {
      name: "Ranged options choices for Nested Unit",
    });
    fireEvent.click(within(melee).getByRole("button", { name: "Blade" }));
    fireEvent.click(within(ranged).getByRole("button", { name: "Pistol" }));
    expect(within(wargear).getByText("2 selected; requirement met")).toBeTruthy();
  });

  it("places the whole configuration step before the sticky builder", async () => {
    const initializationGameSystemSource = new TextDecoder()
      .decode(workspaceFixtureBytes("projection.gst"))
      // Put the setup-only currency first to prove the sticky budget does not
      // mistake game-system declaration order for roster-points semantics.
      .replace(
        /(\s*<bs:costType id="cost-points"[^>]*\/>)(\s*<bs:costType id="cost-supply"[^>]*\/>)/u,
        "$2$1",
      )
      .replace('name="Supply"', 'name="Detachment Points"')
      .replace(
        /(<bs:costType id="cost-supply"[^>]*?)hidden="true"/u,
        '$1hidden="false"',
      );
    const initializationGameSystem = xmlBytes(
      initializationGameSystemSource,
    );
    const initializationCatalogueSource = new TextDecoder()
      .decode(workspaceFixtureBytes("selection-initialization.cat"))
      .replace(
        '<forceEntry id="initialization-force" name="Initialization Force" />',
        `<forceEntry id="initialization-force" name="Initialization Force">
      <constraints>
        <constraint id="configuration-detachment-points-max"
          type="max" field="cost-supply" scope="force" value="3"
          shared="true" includeChildSelections="true"
          includeChildForces="true" />
        <constraint id="configuration-points-max"
          type="max" field="cost-points" scope="force" value="2000"
          shared="true" includeChildSelections="true"
          includeChildForces="true" />
      </constraints>
    </forceEntry>`,
      )
      .replace(
        /(<selectionEntry id="initialization-unit"[\s\S]*?<\/categoryLinks>)/u,
        `$1
      <costs>
        <cost name="Points" typeId="cost-points" value="80" />
      </costs>`,
      )
      .replace(
        /(<selectionEntry id="disabled-automatic-root"[\s\S]*?<\/categoryLinks>)/u,
        `$1
      <selectionEntryGroups>
        <selectionEntryGroup id="configuration-detachments"
          name="Detachments">
          <constraints>
            <constraint id="configuration-detachments-min" type="min"
              field="selections" scope="parent" value="1" shared="true" />
          </constraints>
          <selectionEntries>
            <selectionEntry id="configuration-warhost" name="Warhost"
              type="upgrade">
              <costs>
                <cost name="Detachment Points" typeId="cost-supply"
                  value="3" />
              </costs>
            </selectionEntry>
          </selectionEntries>
        </selectionEntryGroup>
      </selectionEntryGroups>`,
      )
      .replace(
        /(<\/selectionEntry>\s*<\/selectionEntries>\s*<sharedSelectionEntries>)/u,
        `</selectionEntry>
    <selectionEntry id="configuration-battle-size" name="Battle Size"
      type="upgrade">
      <categoryLinks>
        <categoryLink id="configuration-battle-size-category"
          name="Configuration"
          targetId="initialization-category-configuration" primary="true" />
      </categoryLinks>
      <constraints>
        <constraint id="configuration-battle-size-max" type="max"
          field="selections" scope="force" value="1" shared="true" />
      </constraints>
    </selectionEntry>
    <selectionEntry id="configuration-detachment" name="Detachment"
      type="upgrade">
      <categoryLinks>
        <categoryLink id="configuration-detachment-category"
          name="Configuration"
          targetId="initialization-category-configuration" primary="true" />
      </categoryLinks>
      <constraints>
        <constraint id="configuration-detachment-max" type="max"
          field="selections" scope="force" value="1" shared="true" />
      </constraints>
    </selectionEntry>
  </selectionEntries>
  <sharedSelectionEntries>`,
      );
    const initializationCatalogue = xmlBytes(
      initializationCatalogueSource,
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("projection.gst", initializationGameSystem),
          browserFile(
            "selection-initialization.cat",
            initializationCatalogue,
          ),
        ],
      },
    });

    await screen.findByRole("heading", { name: "Selection Initialization" });
    const force = screen.getByLabelText("Starting force");
    const initializationForce = Array.from(
      force.querySelectorAll("option"),
    ).find(({ textContent }) => textContent === "Initialization Force");
    fireEvent.change(force, {
      target: { value: initializationForce?.value },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));

    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", {
        name: "Add Disabled Automatic Root",
      }),
    );
    // Add in the opposite order to the required workflow. Presentation must
    // still put Battle Size before Detachment without mutating roster order.
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Detachment" }),
    );
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Battle Size" }),
    );
    fireEvent.click(within(editor).getByRole("button", { name: "Close" }));

    const configuration = await screen.findByRole("group", {
      name: "Configuration",
    });
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Roster workspace navigation",
    });
    const rosterBuilder = screen.getByRole("region", {
      name: "Roster builder",
    });
    expect(
      workspaceNavigation.compareDocumentPosition(configuration) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      configuration.compareDocumentPosition(rosterBuilder) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    const configurationSummary = configuration.querySelector<HTMLElement>(
      ":scope > summary",
    );
    expect(configurationSummary).not.toBeNull();
    expect(configuration.hasAttribute("open")).toBe(false);
    expect(
      within(configuration).getByRole("heading", { name: "Configuration" }),
    ).toBeTruthy();
    expect(
      within(configuration).getByText("80 / 2,000 Points"),
    ).toBeTruthy();
    expect(
      within(configuration).getByText("0 / 3 Detachment Points"),
    ).toBeTruthy();
    expect(
      within(configuration).getByText("Contains known violation"),
    ).toBeTruthy();
    expect(
      within(configuration).getByText("3 settings"),
    ).toBeTruthy();
    fireEvent.click(configurationSummary as HTMLElement);
    expect(configuration.hasAttribute("open")).toBe(true);
    expect(
      within(configuration).getByText("Disabled Automatic Root", {
        selector: "strong",
      }),
    ).toBeTruthy();
    const battleSizeSelection = within(configuration).getByText(
      "Battle Size",
      { selector: "strong" },
    );
    const detachmentSelection = within(configuration).getByText(
      "Detachment",
      { selector: "strong" },
    );
    expect(
      battleSizeSelection.compareDocumentPosition(detachmentSelection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    const configurationSelectionToggle = within(configuration).getByRole(
      "button",
      { name: "Disabled Automatic Root" },
    );
    expect(configurationSelectionToggle.getAttribute("aria-expanded")).toBe(
      "true",
    );
    fireEvent.click(configurationSelectionToggle);
    expect(configurationSelectionToggle.getAttribute("aria-expanded")).toBe(
      "false",
    );
    fireEvent.click(configurationSelectionToggle);
    expect(configurationSelectionToggle.getAttribute("aria-expanded")).toBe(
      "true",
    );
    fireEvent.click(
      within(configuration).getByRole("button", { name: "Warhost" }),
    );
    const collapsedConfigurationSelection = within(configuration).getByRole(
      "button",
      { name: "Disabled Automatic Root" },
    );
    expect(collapsedConfigurationSelection.getAttribute("aria-expanded")).toBe(
      "false",
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(collapsedConfigurationSelection);
    });
    // Removing a setting is not completion. Reopen the card, clear Warhost,
    // and keep the now-empty section visible so the player can repair it.
    fireEvent.click(collapsedConfigurationSelection);
    fireEvent.click(
      within(configuration).getByRole("button", { name: "Warhost" }),
    );
    // A new setup violation reopens the repair controls, but once visible the
    // player can deliberately collapse the still-invalid section.
    expect(configuration.hasAttribute("open")).toBe(true);
    fireEvent.click(configurationSummary as HTMLElement);
    expect(configuration.hasAttribute("open")).toBe(false);
    fireEvent.click(configurationSummary as HTMLElement);
    const reopenedConfigurationSelection = within(configuration).getByRole(
      "button",
      { name: "Disabled Automatic Root" },
    );
    expect(reopenedConfigurationSelection.getAttribute("aria-expanded")).toBe(
      "true",
    );
    fireEvent.click(
      within(configuration).getByRole("button", { name: "Warhost" }),
    );
    expect(
      within(configuration)
        .getByRole("button", { name: "Disabled Automatic Root" })
        .getAttribute("aria-expanded"),
    ).toBe("false");

    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    expect(
      within(selectedRoster).queryByText("Disabled Automatic Root"),
    ).toBeNull();
    // Configuration is setup, not an army unit. Its Detachment Point capacity
    // stays beside setup, while the sticky builder leads with the currency
    // actually authored on army choices even though it was declared second.
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Selection Initialization roster, Selection Initialization; 80 of 2,000 Points used",
      }),
    ).toBeTruthy();
    expect(within(workspaceNavigation).getByText("80 / 2,000")).toBeTruthy();
    const rosterReportDetails = screen.getByRole("region", {
      name: "Roster report details",
    });
    const otherLimits = within(rosterReportDetails)
      .getByText("Other roster limits")
      .closest("details");
    expect(otherLimits).toBeTruthy();
    expect(
      within(otherLimits as HTMLElement).getByText("3 / 3"),
    ).toBeTruthy();
    expect(
      within(otherLimits as HTMLElement).getByText(
        "Detachment Points used",
      ),
    ).toBeTruthy();

    expect(
      configuration.querySelector(".roster-configuration-subtitle")
        ?.textContent,
    ).toContain("Warhost");
    fireEvent.click(configurationSummary as HTMLElement);
    expect(configuration.hasAttribute("open")).toBe(false);
    expect(
      within(configuration).getByText("80 / 2,000 Points"),
    ).toBeTruthy();
    expect(
      within(configuration).getByText("3 / 3 Detachment Points"),
    ).toBeTruthy();
    fireEvent.click(configurationSummary as HTMLElement);
    expect(configuration.hasAttribute("open")).toBe(true);

    // A detailed-check link must reveal a configuration target the player
    // previously collapsed before the browser follows its fragment.
    const configurationTarget = configuration.querySelector<HTMLElement>(
      "[data-occurrence-id]",
    );
    expect(configurationTarget).not.toBeNull();
    const reviewLink = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#roster-selection-"]'),
    ).find(
      ({ hash }) => hash === `#${configurationTarget?.id}`,
    );
    expect(reviewLink).toBeDefined();
    fireEvent.click(configurationSummary as HTMLElement);
    expect(configuration.hasAttribute("open")).toBe(false);
    fireEvent.click(reviewLink as HTMLAnchorElement);
    expect(configuration.hasAttribute("open")).toBe(true);
    await waitFor(() => {
      expect(document.activeElement).toBe(configurationTarget);
    });
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

    await screen.findByRole("heading", {
      name: "Selection Initialization",
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

    const selectedRoster = screen.getByRole("region", {
      name: "Selected roster",
    });
    // The unit summary stays useful while collapsed: exact model children are
    // counted across repeated occurrences and grouped by their catalogue name.
    const composition = within(selectedRoster).getByRole("region", {
      name: "Unit composition for Initialization Unit",
    });
    expect(within(composition).getByText("2× Required Model")).toBeTruthy();
    expect(within(composition).getByText("Required Weapon")).toBeTruthy();
    fireEvent.click(
      within(selectedRoster).getByRole("button", {
        name: "Configure Initialization Unit",
      }),
    );
    const unitOptions = within(selectedRoster).getByRole("region", {
      name: "Unit options for Initialization Unit",
    });

    // Direct models remain individually collapsible in the options panel. A
    // model with a known violation opens so its required wargear stays visible.
    const initializedModels = within(unitOptions).getByRole("region", {
      name: "Models",
    });
    const modelToggles = within(initializedModels).getAllByRole("button", {
      name: "Required Model",
    });
    expect(modelToggles).toHaveLength(2);
    expect(modelToggles[0]?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(modelToggles[0]!);
    expect(modelToggles[0]?.getAttribute("aria-expanded")).toBe("true");
    // Editing options do not duplicate the datasheet. The separate View action
    // owns the complete reader-facing card.
    expect(within(initializedModels).queryByText("Required Model profile")).toBeNull();
    expect(
      within(initializedModels).getAllByLabelText("Models in this squad"),
    ).toHaveLength(1);
    const boundedAmountInput = within(initializedModels).getByLabelText(
      "Models in this squad",
    );
    fireEvent.change(boundedAmountInput, { target: { value: "2" } });
    expect(boundedAmountInput.getAttribute("aria-invalid")).toBe("true");
    expect(
      within(initializedModels).getByRole("button", { name: "Set amount" }),
    ).toHaveProperty("disabled", true);
    expect(
      within(initializedModels).getByText(
        "Choose a value within the complete known model limits.",
      ),
    ).toBeTruthy();
    fireEvent.change(boundedAmountInput, { target: { value: "1" } });
    const firstRequiredWeapon = within(initializedModels).getAllByRole(
      "button",
      {
        name: "Required Weapon",
        pressed: true,
      },
    );
    expect(firstRequiredWeapon).toHaveLength(1);
    expect(firstRequiredWeapon[0]).toHaveProperty("disabled", true);
    expect(
      within(initializedModels).getByText("1 selected; required"),
    ).toBeTruthy();
    fireEvent.click(firstRequiredWeapon[0]!);
    expect(firstRequiredWeapon[0]?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(modelToggles[1]!);
    expect(modelToggles[1]?.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(
      within(unitOptions).getByRole("button", { name: "View unit card" }),
    );
    const unitCard = screen.getByRole("dialog", {
      name: "Unit card for Initialization Unit",
    });
    expect(
      within(unitCard).getAllByText("Required Model profile"),
    ).toHaveLength(2);
    expect(
      within(unitOptions).queryByText("Default Option", {
        selector: "strong",
      }),
    ).toBeNull();
    const initializedChildren = within(unitOptions).getByRole("group", {
      name: "Wargear and options for Initialization Unit; 1 selection",
    });
    expect(initializedChildren.hasAttribute("open")).toBe(false);
    fireEvent.click(
      within(initializedChildren).getByText(
        "Configure wargear & options",
      ),
    );
    expect(initializedChildren.hasAttribute("open")).toBe(true);
    expect(
      within(initializedChildren).getByText("Default Option", {
        selector: "strong",
      }),
    ).toBeTruthy();
    expect(
      within(unitOptions).getByRole("button", {
        name: "Modified Child",
      }),
    ).toHaveProperty("disabled", false);
    expect(
      within(initializedChildren).queryByText("Required Model profile"),
    ).toBeNull();

    const firstModel = rosterSelection("selection-ui-bound-2");
    expect(firstModel).toBeTruthy();
    const firstModelChildren = within(firstModel as HTMLElement).getByRole(
      "group",
      {
        name: "Models, wargear and options for Required Model; 1 selection",
      },
    );
    expect(firstModelChildren.hasAttribute("open")).toBe(false);
    fireEvent.click(
      within(firstModelChildren).getByText(
        "Configure models, wargear & options",
      ),
    );
    expect(rosterSelection("selection-ui-bound-3")).toBeTruthy();

    // Closing one exact model's options leaves the unit's always-visible
    // composition summary and independent unit card intact.
    fireEvent.click(modelToggles[0]!);
    expect(modelToggles[0]?.getAttribute("aria-expanded")).toBe("false");
    expect(within(unitCard).getAllByText("Required Model profile")).toHaveLength(2);
    expect(within(composition).getByText("2× Required Model")).toBeTruthy();

    fireEvent.click(
      within(unitOptions).getByRole("button", {
        name: "Close options for Initialization Unit",
      }),
    );
    expect(
      within(selectedRoster).queryByRole("region", { name: "Models" }),
    ).toBeNull();
    expect(
      within(selectedRoster).getByRole("region", {
        name: "Unit composition for Initialization Unit",
      }),
    ).toBeTruthy();
    fireEvent.click(
      within(selectedRoster).getByRole("button", {
        name: "Configure Initialization Unit",
      }),
    );
    const checksReport = screen.getByRole("group", {
      name: /Detailed supported evidence/u,
    });
    expect(checksReport.hasAttribute("open")).toBe(true);
    expect(
      within(checksReport).getByText(/some rules not checked/u),
    ).toBeTruthy();
    const structuralStatus = screen.getByRole("region", {
      name: "Supported structural requirements",
    });
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Roster workspace navigation",
    });
    const problemsButton = within(workspaceNavigation).getByRole("button", {
      name: "Open roster problems, 1 known violation",
    });
    expect(problemsButton.dataset.problems).toBe("present");
    // The detailed evidence summary folds both reports into one status and
    // does so conservatively: an incomplete check makes the whole view incomplete.
    expect(
      within(checksReport).getByText(/Some rules not checked/u),
    ).toBeTruthy();
    const rosterReportDetails = screen.getByRole("region", {
      name: "Roster report details",
    });
    const reportDetailsSummary = within(rosterReportDetails).getByText(
      "Report details",
    );
    fireEvent.click(reportDetailsSummary);
    expect(
      within(rosterReportDetails).getByText(
        /RosterForge could not check every applicable catalogue rule/u,
      ),
    ).toBeTruthy();
    expect(
      within(rosterReportDetails).queryByText(
        "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      ),
    ).toBeNull();
    expect(
      within(structuralStatus).getByText("Known violations"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("Some rules not checked"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("1Violated");
    const initialViolations = within(structuralStatus).getByRole("group", {
      name: "Structural violations 1 bound",
    });
    expect(within(initialViolations).getByText("Manual Group")).toBeTruthy();
    expect(within(initialViolations).queryByText("Modified Child")).toBeNull();
    const unresolvedBounds = within(structuralStatus).getByRole("group", {
      name: "Unresolved structural bounds 1 bound",
    });
    expect(unresolvedBounds.hasAttribute("open")).toBe(false);
    expect(within(unresolvedBounds).getByText("Modified Child")).toBeTruthy();
    const reviewSelectionLinks = within(initialViolations).getAllByRole(
      "link",
      { name: "Review selection" },
    );
    expect(reviewSelectionLinks).toHaveLength(1);
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
    const developerStructuralDiagnostics = within(structuralStatus).getByRole(
      "group",
      {
        name: "Developer structural diagnostics 1 diagnostic",
      },
    );
    expect(developerStructuralDiagnostics.hasAttribute("open")).toBe(false);
    expect(
      within(developerStructuralDiagnostics).getByText(
        "EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED",
      ),
    ).toBeTruthy();
    const editor = openAddUnitDialog();
    expect(within(editor).getByText("Units")).toBeTruthy();
    expect(within(editor).getByText("Configuration")).toBeTruthy();
    expect(within(editor).getByText("Uncategorized")).toBeTruthy();
    const initializationMaximum = within(editor).getByRole("button", {
      name: "Initialization Unit maximum reached",
    });
    expect(initializationMaximum).toHaveProperty("disabled", true);
    expect(
      within(
        initializationMaximum.closest(".root-choice") as HTMLElement,
      ).getByText("1 / 1"),
    ).toBeTruthy();
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
    const removeRequiredModel = await screen.findByRole("button", {
      name: "Remove one Required Model",
    });
    const addRequiredModel = screen.getByRole("button", {
      name: "Add one Required Model",
    });
    expect(
      screen.getByLabelText("Required Model selected count").textContent,
    ).toBe("2");
    expect(addRequiredModel).toHaveProperty("disabled", true);
    expect(
      screen.getByText("2 selected; requirement met"),
    ).toBeTruthy();

    fireEvent.click(removeRequiredModel);

    expect(rosterSelection("selection-ui-bound-4")).toBeNull();
    expect(rosterSelection("selection-ui-bound-5")).toBeNull();
    expect(rosterSelection("selection-ui-bound-2")).toBeTruthy();
    expect(within(composition).getByText("1× Required Model")).toBeTruthy();
    expect(
      screen.getByText("1 selected; 1 still required"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("2Violated");
    expect(
      within(structuralStatus).getByRole("group", {
        name: "Structural violations 2 bounds",
      }),
    ).toBeTruthy();

    // The same aggregate bounds now permit a single remaining occurrence to
    // repair the squad from one model to two. Resetting that occurrence to one
    // would recreate the minimum violation, so the convenience action is
    // bounded too. Undo returns to the under-minimum state for the dedicated
    // plus control exercised below.
    const remainingModel = rosterSelection("selection-ui-bound-2");
    expect(remainingModel).toBeTruthy();
    const remainingModelToggle = within(
      remainingModel as HTMLElement,
    ).getByRole("button", { name: "Required Model" });
    if (remainingModelToggle.getAttribute("aria-expanded") === "false") {
      fireEvent.click(remainingModelToggle);
    }
    const recoveryAmountInput = within(
      remainingModel as HTMLElement,
    ).getByLabelText("Models in this squad");
    fireEvent.change(recoveryAmountInput, { target: { value: "2" } });
    const setRecoveryAmount = within(
      remainingModel as HTMLElement,
    ).getByRole("button", { name: "Set amount" });
    expect(setRecoveryAmount).toHaveProperty("disabled", false);
    fireEvent.click(setRecoveryAmount);
    expect(within(composition).getByText("2× Required Model")).toBeTruthy();
    expect(
      within(remainingModel as HTMLElement).getByRole("button", {
        name: "Use 1",
      }),
    ).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(composition).getByText("1× Required Model")).toBeTruthy();
    fireEvent.click(addRequiredModel);

    await waitFor(() => {
      expect(rosterSelection("selection-ui-bound-7")).toBeTruthy();
    });
    const restoredModel = rosterSelection("selection-ui-bound-7");
    expect(restoredModel).toBeTruthy();
    fireEvent.click(
      within(restoredModel as HTMLElement).getByRole("button", {
        name: "Required Model",
      }),
    );
    const restoredModelChildren = within(restoredModel as HTMLElement).getByRole(
      "group",
      {
        name: "Models, wargear and options for Required Model; 1 selection",
      },
    );
    expect(restoredModelChildren.hasAttribute("open")).toBe(false);
    fireEvent.click(
      within(restoredModelChildren).getByText(
        "Configure models, wargear & options",
      ),
    );
    expect(rosterSelection("selection-ui-bound-8")).toBeTruthy();
    expect(addRequiredModel).toHaveProperty("disabled", true);
    expect(within(composition).getByText("2× Required Model")).toBeTruthy();
    expect(
      screen.getByText("2 selected; requirement met"),
    ).toBeTruthy();
    expect(
      constraintStatusText(structuralStatus, "Violated"),
    ).toBe("1Violated");
    expect(
      within(structuralStatus).getByRole("group", {
        name: "Structural violations 1 bound",
      }),
    ).toBeTruthy();

    // Resolve the last known violation while leaving the modifier-driven bound
    // unresolved. The player-visible coverage badge stays honest, and a report
    // the player already has open is not closed out from under them.
    const manualGroup = screen.getByRole("group", {
      name: "Manual Group choices for Initialization Unit",
    });
    fireEvent.click(
      within(manualGroup).getByRole("button", { name: "Manual Option One" }),
    );
    await waitFor(() => {
      expect(problemsButton.dataset.problems).toBe("none");
    });
    expect(
      within(checksReport).getByText(/Some rules not checked/u),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("No known violations"),
    ).toBeTruthy();
    expect(
      within(structuralStatus).getByText("Some rules not checked"),
    ).toBeTruthy();
    expect(constraintStatusText(structuralStatus, "Violated")).toBe(
      "0Violated",
    );
    expect(checksReport.hasAttribute("open")).toBe(true);
  });

  it("offers to recover an unsaved roster from a previous session", async () => {
    const { store, records } = memoryDraftStore();
    const mount = () =>
      render(
        <App
          draftStore={store}
          createBatchId={() => "recover-batch"}
          createDraftId={() => "recover-draft"}
          createEntityId={(kind) => `${kind}-recover`}
          now={() => "2026-07-23T18:00:00.000Z"}
          autosaveDelayMs={0}
        />,
      );

    mount();
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("minimal.gst", gameSystemBytes),
          browserFile("minimal.cat", catalogueBytes),
        ],
      },
    });
    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.change(screen.getByLabelText("Roster name"), {
      target: { value: "Recovered Patrol" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );

    // Never saved as a draft, so the shelf stays empty while the recovery
    // slot fills. That separation is the whole point of the slot.
    await waitFor(() => {
      expect(records.has("__recovery__")).toBe(true);
    });
    expect(records.has("recover-draft")).toBe(false);

    // A new session finds it and offers it rather than reopening silently.
    cleanup();
    mount();
    const prompt = await screen.findByRole("region", {
      name: "Unsaved roster",
    });
    expect(within(prompt).getByText("Recovered Patrol")).toBeTruthy();

    // Starting a different roster makes the open list the sole primary
    // surface, but it does not silently discard the recovery offer. Returning
    // to Lists reveals the same pending decision again.
    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("minimal.gst", gameSystemBytes),
          browserFile("minimal.cat", catalogueBytes),
        ],
      },
    });
    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    expect(screen.queryByRole("region", { name: "Unsaved roster" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Change roster setup" }),
    );
    const restoredPrompt = await screen.findByRole("region", {
      name: "Unsaved roster",
    });
    fireEvent.click(
      within(restoredPrompt).getByRole("button", { name: "Discard" }),
    );
    await waitFor(() => {
      expect(records.has("__recovery__")).toBe(false);
    });
    expect(screen.queryByRole("region", { name: "Unsaved roster" })).toBeNull();
  });

  it("stops autosaving after a quota failure until the roster changes", async () => {
    // Autosave re-arms on roster identity and on the action returning to idle,
    // so without a block a full browser is rewritten every few seconds for the
    // rest of the session - and quota is exactly the failure that persists.
    const { store, writes } = memoryDraftStore({ failWritesAfter: 1 });
    render(
      <App
        draftStore={store}
        printRoster={() => true}
        createBatchId={() => "quota-batch"}
        createDraftId={() => "quota-draft"}
        createEntityId={(kind) => `${kind}-quota`}
        now={() => "2026-08-22T17:00:00.000Z"}
        autosaveDelayMs={0}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
      target: {
        files: [
          browserFile("minimal.gst", gameSystemBytes),
          browserFile("minimal.cat", catalogueBytes),
        ],
      },
    });
    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.change(screen.getByLabelText("Roster name"), {
      target: { value: "Quota Patrol" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );
    await waitFor(() => {
      expect(rosterSelection("selection-quota")).toBeTruthy();
    });

    // The first save is allowed through, so a draft becomes active.
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText(/Saved Quota Patrol in this browser\./u);
    expect(writes()).toBe(1);

    // The next edit autosaves, and the store refuses on space.
    // Non-model `Amount` lives only behind `Edit selection`; reaching it here
    // is what keeps that disclosure honestly named rather than a debug panel.
    fireEvent.click(screen.getByText("Edit selection"));
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set amount" }));
    await screen.findByText(/out of room for saved roster drafts/u);
    const afterFailure = writes();
    expect(afterFailure).toBe(2);

    // The roster is unchanged, so nothing retries it. Before the block this
    // rearmed every time the action returned to idle.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(writes()).toBe(afterFailure);
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("saves, reopens, and confirms deletion of a browser-local draft", async () => {
    const { store, records } = memoryDraftStore();
    const printRoster = vi.fn(() => false);
    render(
      <App
        draftStore={store}
        printRoster={printRoster}
        createBatchId={() => "draft-ui-batch"}
        createDraftId={() => "draft-ui"}
        createEntityId={(kind) => `${kind}-draft-ui`}
        now={() => "2026-07-23T17:00:00.000Z"}
        autosaveDelayMs={0}
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

    await screen.findByRole("heading", { name: "Synthetic Faction" });
    fireEvent.change(screen.getByLabelText("Roster name"), {
      target: { value: "Saved Patrol" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
    const editor = openAddUnitDialog();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add Infantry Squad" }),
    );
    await waitFor(() => {
      expect(rosterSelection("selection-draft-ui")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));
    expect(printRoster).toHaveBeenCalledOnce();
    expect(printRoster).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Saved Patrol",
        catalogueName: "Synthetic Faction",
        forces: [
          expect.objectContaining({
            selections: [
              expect.objectContaining({
                occurrenceId: "selection-draft-ui",
                name: "Infantry Squad",
              }),
            ],
          }),
        ],
      }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "The browser blocked the printable roster window.",
    );

    // Saving is manual, so an edited roster is lost on reload until it has a
    // draft. The workspace has to say so before it is saved.
    expect(screen.getByText("Unsaved changes")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Saved Saved Patrol in this browser.");
    // ...and stop saying so once it is.
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Saved roster drafts" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Update saved draft" }),
    ).toBeTruthy();

    // With a draft active the user has already asked for this roster to be
    // kept, so a further edit rewrites it without another click.
    const storedAmount = (): number | undefined =>
      asStoredDraft(records.get("draft-ui"))?.roster.forces[0]?.selections[0]
        ?.amount;
    // Non-model `Amount` lives only behind `Edit selection`; reaching it here
    // is what keeps that disclosure honestly named rather than a debug panel.
    fireEvent.click(screen.getByText("Edit selection"));
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set amount" }));
    await waitFor(() => {
      expect(storedAmount()).toBe(3);
    });
    // The rewrite is what clears the indicator, so it also proves the
    // persisted roster is the one now on screen.
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    const saved = asStoredDraft(records.get("draft-ui"));
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
    // The bytes live once under the batch rather than in the draft, so
    // rewriting a draft on every autosave does not rewrite the catalogue.
    const batch = records.get("files:draft-ui-batch") as
      | { files: readonly { bytes: Uint8Array }[] }
      | undefined;
    expect(Array.from(batch?.files[0]?.bytes ?? [])).toEqual(
      Array.from(gameSystemBytes),
    );
    expect(Array.from(batch?.files[1]?.bytes ?? [])).toEqual(
      Array.from(catalogueBytes),
    );
    expect(saved?.import.files[0]?.bytes.byteLength).toBe(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Change roster setup" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Saved Patrol" }),
    ).toBeNull();
    const restoredShelf = screen.getByRole("region", {
      name: "Saved roster drafts",
    });
    expect(within(restoredShelf).getByText("Saved Patrol")).toBeTruthy();
    fireEvent.click(
      within(restoredShelf).getByRole("button", { name: "Open" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Saved Patrol" }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(rosterSelection("selection-draft-ui")).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Update saved draft" }),
    ).toBeTruthy();

    // The undo stack came back with the roster. Before the history was stored
    // this button was disabled after a reopen, and the amount edit above was
    // unreachable for the rest of the session.
    const reopenedUndo = screen.getByRole("button", { name: "Undo" });
    expect(reopenedUndo.hasAttribute("disabled")).toBe(false);
    fireEvent.click(reopenedUndo);
    await waitFor(() => {
      expect(storedAmount()).toBeUndefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Change roster setup" }),
    );
    const deletionShelf = screen.getByRole("region", {
      name: "Saved roster drafts",
    });
    fireEvent.click(
      within(deletionShelf).getByRole("button", {
        name: "Delete Saved Patrol",
      }),
    );
    fireEvent.click(
      within(deletionShelf).getByRole("button", { name: "Confirm delete" }),
    );
    await within(deletionShelf).findByText("No roster drafts saved yet.");
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

function rosterForce(occurrenceId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-force-id="${occurrenceId}"]`,
  );
}

function rosterSelection(occurrenceId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-occurrence-id="${occurrenceId}"]`,
  );
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

/** The store also holds shared batch-file records; narrow to real drafts. */
function asStoredDraft(
  record: StoredRecord | undefined,
): LocalRosterDraft | undefined {
  return record !== undefined && "roster" in record ? record : undefined;
}

function memoryDraftStore(options?: {
  readonly failWritesAfter?: number;
}): {
  readonly store: ReturnType<typeof createLocalRosterDraftStore>;
  readonly records: Map<string, StoredRecord>;
  readonly writes: () => number;
} {
  const records = new Map<string, StoredRecord>();
  let draftWrites = 0;
  const backend: LocalRosterDraftRecordBackend = {
    getAll: async () => [...records.values()],
    get: async (id) => records.get(id),
    put: async (draft) => {
      // The recovery slot writes before any draft exists; it is not the write
      // under test and must not consume the allowance.
      if ("roster" in draft && draft.id !== recoveryDraftId) {
        draftWrites += 1;
        if (
          options?.failWritesAfter !== undefined &&
          draftWrites > options.failWritesAfter
        ) {
          const error = new Error("The quota has been exceeded.");
          error.name = "QuotaExceededError";
          throw error;
        }
      }
      records.set(draft.id, draft);
    },
    delete: async (id) => {
      records.delete(id);
    },
  };
  return {
    store: createLocalRosterDraftStore(backend),
    records,
    writes: () => draftWrites,
  };
}
