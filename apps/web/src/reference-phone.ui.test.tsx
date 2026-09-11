// @vitest-environment jsdom
// Generic phone-rendering contract through the real selected reader. Geometry
// is verified in the browser; jsdom only proves semantics and one mounted tree.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const encode = (text: string) => new TextEncoder().encode(text);
const fields = [
  ["shield", "Shields", "D6+2"],
  ["speed", "Speed", "5–9"],
  ["armour", "Armour", "3+ (front only)"],
  ["hp", "HP", "12"],
  ["supply", "Supply", "2 per active bearer"],
  ["long", "Emergency displacement after shield collapse", "Move towards the nearest friendly beacon only after all hostile reactions have resolved."],
] as const;
const characteristic = ([id, name, value]: readonly string[]) => `<characteristic typeId="${id}" name="${name}">${value}</characteristic>`;
const files = [
  { filename: "phone.gst", bytes: encode(`<gameSystem id="phone" name="Fictional System" revision="1" battleScribeVersion="2.03"><forceEntries><forceEntry id="force" name="Patrol" /></forceEntries></gameSystem>`) },
  { filename: "phone.cat", bytes: encode(`<catalogue id="cat" name="Fictional Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="phone" gameSystemRevision="1" library="false"><selectionEntries><selectionEntry id="unit" name="Survey team" type="unit"><profiles>
    <profile id="normal" name="Survey walker — extended observation mode" typeId="unfamiliar" typeName="Expedition telemetry"><characteristics>${fields.map(characteristic).join("")}</characteristics><modifiers><modifier type="increment" field="shield" value="1" /></modifiers></profile>
    <profile id="alternate" name="Survey walker — recovery mode" typeId="unfamiliar" typeName="Expedition telemetry"><characteristics>${fields.slice(0, 2).map(characteristic).join("")}</characteristics></profile>
    <profile id="short" name="Beacon" typeId="signal" typeName="Signal"><characteristics>${characteristic(["band", "Band", "A / B"])}</characteristics></profile>
  </profiles></selectionEntry></selectionEntries></catalogue>`) },
];

it("keeps arbitrary ordered fields, bearer labels, missing values and uncertainty in one reflowable table", async () => {
  let headingHeight = 80;
  let resizeHeading = () => {};
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resizeHeading = callback; }
    observe() {}
    disconnect() {}
  });
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("selected-unit-panel-heading")
      ? new DOMRect(0, 0, 260, headingHeight)
      : originalRect.call(this);
  });
  const prepared = await prepareLocalCatalogueLibrary(files, { import: { batchId: "phone", importedAt: "2026-09-11T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Fixture import failed");
  let id = 0;
  render(<App prepareLibrary={async () => prepared} createEntityId={kind => `${kind}-${++id}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: files.map(file => ({ name: file.filename, arrayBuffer: async () => Uint8Array.from(file.bytes).buffer })) } });
  await screen.findByRole("heading", { name: "Fictional Catalogue" });
  fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
  fireEvent.click(await screen.findByRole("button", { name: /^Add unit,/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add Survey team" }));
  fireEvent.click(screen.getByRole("button", { name: "View unit card" }));
  const dialog = screen.getByRole("dialog", { name: "Unit card for Survey team" });
  const table = within(dialog).getByRole("table", { name: "Expedition telemetry profiles" });
  expect(dialog.style.getPropertyValue("--reference-heading-height")).toBe("80px");
  headingHeight = 300;
  resizeHeading();
  expect(dialog.style.getPropertyValue("--reference-heading-height")).toBe("300px");
  expect(within(table).getAllByRole("columnheader").map(e => e.textContent)).toEqual(["Name", ...fields.map(f => f[1])]);
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(2);
  expect(within(rows[0]!).getByRole("rowheader").textContent).toContain("1× Survey team");
  const cells = within(rows[0]!).getAllByRole("cell");
  for (const [index, [, label, value]] of fields.entries()) {
    expect(cells[index]!.querySelector(".reference-field-label")?.textContent).toBe(label);
    expect(cells[index]!.querySelector(".reference-field-label")?.getAttribute("aria-hidden")).toBe("true");
    expect(cells[index]!.textContent).toContain(value);
  }
  expect(cells[0]!.textContent).toContain("Effective value unresolved");
  expect(within(rows[1]!).getAllByLabelText("Not provided")).toHaveLength(4);
  expect(cells[5]!.classList.contains("reference-field-wide")).toBe(true);
  const signal = within(dialog).getByRole("table", { name: "Signal profiles" });
  expect(within(signal).getAllByRole("cell")).toHaveLength(1);
  expect(within(signal).getByRole("cell").textContent).toContain("A / B");
  // The fallback is a reader preference, not a label-based schema classifier.
  const toggle = within(dialog).getByRole("button", { name: "Compare as table · Expedition telemetry" });
  fireEvent.click(toggle);
  expect(table.closest("section")?.hasAttribute("data-comparison")).toBe(true);
  expect(within(dialog).getByText(/Table comparison keeps columns aligned/)).toBeTruthy();
  expect(within(dialog).getByRole("table", { name: "Expedition telemetry profiles" })).toBe(table);
  expect(within(table).getAllByRole("row").slice(1)).toEqual(rows);
  fireEvent.click(toggle);
  expect(table.closest("section")?.hasAttribute("data-comparison")).toBe(false);
  expect(dialog.querySelectorAll(".unit-reference-reader")).toHaveLength(1);
  expect(dialog.querySelector(".unit-card-view-list")).toBeNull();
});
