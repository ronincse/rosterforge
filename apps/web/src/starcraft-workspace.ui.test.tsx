// @vitest-environment jsdom
// Fictional source values exercise the real importer, session and live UI.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import type { Result } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { App } from "./App.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { addLocalRosterRootSelection, createLocalRosterSession, evaluateLocalRosterCosts, inspectLocalRosterRootChoices, inspectLocalRosterSupportedValidation, localRosterRootChoices, restoreLocalRosterSession } from "./roster-session.js";
import { createRosterWorkspaceViewModel } from "./roster-workspace-model.js";
import { starcraftWorkspaceCounters, starcraftWorkspaceSections } from "./starcraft-workspace-presentation.js";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function ok<T>(r: Result<T>): T { if (!r.ok) throw Error(JSON.stringify(r.diagnostics)); return r.value; }
const system = "sys-ce49-e853-2fea-6af1", catId = "a993-a28e-5c72-5b0a";
const pregame = "9b82-d933-7075-8237", faction = "5eca-d421-1fdc-a95f", tactical = "acb5-b55f-9492-5149";
const ids = ["5bcf-897a-a5c9-d0e8", "1719-6214-392e-e53f", "472f-46af-8e02-bfbf", "f5f9-3591-0f2d-0a53", "7e61-585f-b715-85e0", "31a6-c1f1-3d47-fa76"];
const names = ["Minerals", "Gas", "Core", "Elite", "Hero", "Support"];
const costs = (values: readonly number[]) => `<costs>${values.map((value, i) => `<cost typeId="${ids[i]}" value="${value}"/>`).join("")}</costs>`;
const category = (id: string, primary = true) => `<categoryLink targetId="${id}" primary="${primary}"/>`;
const entry = (id: string, name: string, links: string, content = "", type = "upgrade") => `<selectionEntry id="${id}" name="${name}" type="${type}"><categoryLinks>${links}</categoryLinks>${content}</selectionEntry>`;
async function fixture(options: { wrongSystem?: boolean; duplicate?: boolean; renamed?: boolean } = {}) {
  const sys = options.wrongSystem ? "unrelated" : system;
  const game = `<gameSystem id="${sys}" name="Fictional system" revision="1" battleScribeVersion="2.03"><costTypes>${ids.map((id, i) => `<costType id="${id}" name="${names[i]}"${i < 2 ? ` defaultCostLimit="${i === 0 ? 1000 : 100}"` : ""}/>`).join("")}</costTypes><categoryEntries><categoryEntry id="${pregame}" name="${options.renamed ? "Renamed scenarios" : "Pre-Game Selections"}"/></categoryEntries><forceEntries><forceEntry id="army" name="Army"/></forceEntries></gameSystem>`;
  const catalogue = `<catalogue id="${catId}" gameSystemId="${sys}" name="Fictional faction" revision="1" battleScribeVersion="2.03"><categoryEntries><categoryEntry id="${faction}" name="${options.renamed ? "Renamed affiliation" : "Faction"}"/><categoryEntry id="${tactical}" name="Tactical Cards"/><categoryEntry id="creep" name="Creep"/><categoryEntry id="core-category" name="Core"/>${options.duplicate ? `<categoryEntry id="${faction}" name="Collision"/>` : ""}</categoryEntries><selectionEntries>
  ${entry("faction", "Faction choice", category(faction), costs([0, 0, 2, 1, 0, 0]), "unit")}
  ${entry("map", "Deployment Maps", category(pregame), `<selectionEntries>${entry("survey", "Survey map", "", `<constraints><constraint id="map-max" type="max" field="selections" scope="parent" value="1" shared="true"/></constraints><profiles><profile id="map-reference" name="Survey map"><characteristics><characteristic name="Description">Keep the whole map text.</characteristic></characteristics></profile></profiles>`)}</selectionEntries>`)}
  ${entry("mission", "Mission Cards", category(pregame))}
  ${entry("tactical", "Tactical choice", category("creep") + category(tactical, false), costs([0, 0, 1]))}
  ${entry("unit", "Marine unit", category("core-category"), costs([160, 10, -1]), "unit")}
  </selectionEntries></catalogue>`;
  const files = [{ filename: "fiction.gst", bytes: new TextEncoder().encode(game) }, { filename: "fiction.cat", bytes: new TextEncoder().encode(catalogue) }];
  const prepared = await prepareLocalCatalogueLibrary(files, { import: { batchId: "setup-ui", importedAt: "2026-09-30T00:00:00Z" } });
  const library = ok(prepared), cat = library.selectableCatalogues[0]!;
  const session = ok(createLocalRosterSession(cat, cat.context.forces.definitions[0]!, { rosterId: rosterId("setup"), forceId: forceOccurrenceId("army"), name: "Setup test" }));
  return { files, prepared, cat, session };
}
function view(session: Awaited<ReturnType<typeof fixture>>["session"]) {
  const model = createRosterWorkspaceViewModel(session, { costs: evaluateLocalRosterCosts(session), rootChoices: inspectLocalRosterRootChoices(session), validation: inspectLocalRosterSupportedValidation(session) });
  return starcraftWorkspaceSections(session, model);
}
it("classifies renamed setup, secondary tactical membership and a unit-typed faction by verified identities", async () => {
  const f = await fixture({ renamed: true });
  const choices = view(f.session);
  expect(choices.unitChoices.flatMap(g => g.choices.map(c => c.choice.materialized.name))).toEqual(["Marine unit"]);
  expect(choices.setupChoices.flatMap(g => g.choices.map(c => c.choice.materialized.name))).toEqual(["Deployment Maps", "Mission Cards", "Faction choice", "Tactical choice"]);
  let session = f.session;
  for (const root of localRosterRootChoices(f.cat)) session = ok(addLocalRosterRootSelection(session, root, { selectionId: selectionOccurrenceId(root.materialized.name!) }));
  const before = JSON.stringify(session.roster);
  const partition = view(session);
  expect(partition.armyGroups.flatMap(g => g.selections.map(s => s.occurrence.name))).toEqual(["Marine unit"]);
  expect(partition.setupGroups.flatMap(g => g.selections)).toHaveLength(4);
  expect(view(ok(restoreLocalRosterSession(f.cat, structuredClone(session.roster)))).setupGroups.map(g => g.amount)).toEqual(partition.setupGroups.map(g => g.amount));
  expect(JSON.stringify(session.roster)).toBe(before);
});
it("does not infer setup or counters from labels in another system, and leaves ambiguous categories visible", async () => {
  const wrong = await fixture({ wrongSystem: true });
  expect(view(wrong.session).setupChoices).toEqual([]);
  expect(starcraftWorkspaceCounters(ok(inspectLocalRosterSupportedValidation(wrong.session)).status.resourceBudgets)).toEqual([]);
  const collision = await fixture({ duplicate: true });
  expect(view(collision.session).unitChoices.flatMap(g => g.choices.map(c => c.choice.materialized.name))).toContain("Faction choice");
});
it("retains zero, negative and provisional balances and keeps an optional cap distinct from an allowance", async () => {
  const f = await fixture();
  const report = ok(inspectLocalRosterSupportedValidation(f.session)).status.resourceBudgets;
  const counters = starcraftWorkspaceCounters(report);
  expect(counters.map(c => [c.resource.typeId, c.value, c.balance])).toEqual(ids.map((id, i) => [id, 0, i >= 2]));
  const changed = { ...report, resources: report.resources.map(r => r.resource.typeId === ids[2] ? { ...r, value: -2, exact: false, resource: { ...r.resource, effective: { kind: "finite" as const, value: 0 } } } : r) };
  expect(starcraftWorkspaceCounters(changed)[2]).toMatchObject({ value: -2, exact: false, balance: true, resource: { effective: { kind: "finite", value: 0 } } });
});
it("offers setup separately from Add unit, edits a nested map and keeps setup costs in all six sticky counters", async () => {
  const f = await fixture(); let serial = 0;
  render(<App prepareLibrary={async () => f.prepared} createEntityId={kind => `${kind}-${++serial}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: f.files.map(file => ({ name: file.filename, arrayBuffer: async () => Uint8Array.from(file.bytes).buffer })) } });
  fireEvent.click(await screen.findByRole("button", { name: "Create roster" }));
  const counters = screen.getByLabelText("Army resource counters");
  expect(counters.closest("nav")).toBeTruthy();
  for (const name of names) expect(within(counters).getByText(name)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Choose setup options" }));
  const setup = screen.getByRole("dialog", { name: "Choose setup options" });
  expect(within(setup).queryByText("Marine unit")).toBeNull();
  fireEvent.click(within(setup).getByRole("button", { name: "Select Faction choice" }));
  fireEvent.click(within(setup).getByRole("button", { name: "Select Deployment Maps" }));
  fireEvent.click(within(setup).getByRole("button", { name: "Select Tactical choice" }));
  fireEvent.click(within(setup).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Choose setup options" })).toBeNull());
  const settings = screen.getByRole("region", { name: "Army setup" });
  expect(settings.textContent).toContain("Faction choice");
  expect(screen.getByRole("heading", { name: "Your roster" }).parentElement!.textContent).toContain("0 army selections");
  fireEvent.click(within(settings).getByRole("button", { name: "Survey map", pressed: false }));
  expect(settings.textContent).toContain("Survey map");
  expect(within(counters).getByText("Core").parentElement!.textContent).toContain("3balance");
  // Detailed evidence can target a selected child behind both setup and card
  // disclosures. Opening setup alone must still complete the exact jump.
  const mapTargetId = within(settings).getByRole("button", { name: "Remove Survey map" }).closest<HTMLElement>("li[id]")!.id;
  const mapToggle = within(settings).getByRole("button", { name: "Deployment Maps" });
  if (mapToggle.getAttribute("aria-expanded") === "true") fireEvent.click(mapToggle);
  expect(document.getElementById(mapTargetId)).toBeNull();
  const pregameGroup = within(settings).getByRole("group", { name: "Pre-Game Selections" });
  fireEvent.click(pregameGroup.querySelector("summary")!);
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#roster-selection-"]')].find(a => a.hash === `#${mapTargetId}`)!;
  expect(link).toBeTruthy();
  fireEvent.click(link);
  await waitFor(() => expect(document.activeElement).toBe(document.getElementById(mapTargetId)));
  expect(pregameGroup.hasAttribute("open")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /^Add unit,/ }));
  const units = screen.getByRole("dialog", { name: "Add unit" });
  expect(within(units).queryByText("Faction choice")).toBeNull();
  expect(within(units).queryByText("Deployment Maps")).toBeNull();
  fireEvent.click(within(units).getByRole("button", { name: "Add Marine unit" }));
  expect(screen.getByRole("heading", { name: "Your roster" }).parentElement!.textContent).toContain("1 army selection");
  expect(within(counters).getByText("Minerals").parentElement!.textContent).toContain("160 / 1,000");
  expect(within(counters).getByText("Gas").parentElement!.textContent).toContain("10 / 100");
  expect(within(counters).getByText("Core").parentElement!.textContent).toContain("2balance");
  fireEvent.click(within(settings).getByRole("button", { name: "Remove Tactical choice" }));
  expect(within(counters).getByText("Core").parentElement!.textContent).toContain("1balance");
});

it("reserves the measured sticky height across wrapping changes and restores document scrolling on exit", async () => {
  let height = 164, resize = () => {}, disconnected = false;
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  });
  const rect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) { return this.classList.contains("roster-workspace-nav") ? new DOMRect(0, 0, 375, height) : rect.call(this); });
  const f = await fixture(); let serial = 0;
  const style = document.documentElement.style, previous = style.getPropertyValue("--roster-nav-offset");
  style.setProperty("--roster-nav-offset", "91px");
  const mounted = render(<App prepareLibrary={async () => f.prepared} createEntityId={kind => `${kind}-${++serial}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: f.files.map(file => ({ name: file.filename, arrayBuffer: async () => Uint8Array.from(file.bytes).buffer })) } });
  fireEvent.click(await screen.findByRole("button", { name: "Create roster" }));
  expect(style.getPropertyValue("--roster-nav-offset")).toBe("176px");
  height = 100; resize();
  expect(style.getPropertyValue("--roster-nav-offset")).toBe("112px");
  mounted.unmount();
  expect(disconnected).toBe(true);
  expect(style.getPropertyValue("--roster-nav-offset")).toBe("91px");
  if (previous) style.setProperty("--roster-nav-offset", previous); else style.removeProperty("--roster-nav-offset");
});
