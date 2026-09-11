// @vitest-environment jsdom
// Verify actual UI import/rendering, including stacked modal accessibility.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { App } from "./App.js";
import { createLocalRosterDraftStore, type StoredRecord } from "./browser-drafts.js";

afterEach(cleanup);

it("links attached stat keywords, leaves empty cells blank, and layers rule dialogs without replacing the unit", async () => {
  const records = new Map<string, StoredRecord>();
  const draftStore = createLocalRosterDraftStore({ getAll: async () => [...records.values()], get: async id => records.get(id), put: async r => { records.set(r.id, r); }, delete: async id => { records.delete(id); } });
  let next = 0;
  render(<App draftStore={draftStore} createEntityId={kind => `${kind}-${++next}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: ["projection.gst", "keyword-reference.cat"].map(name => ({ name, type: "application/xml", arrayBuffer: async () => new Uint8Array(readFileSync(`packages/test-fixtures/fixtures/${name}`)).buffer })) } });
  await screen.findByRole("heading", { name: "Keyword Reference" });
  fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
  fireEvent.click(screen.getByRole("button", { name: /Add unit, / }));
  fireEvent.click(screen.getByRole("button", { name: "Add Keyword Readers" }));
  fireEvent.click(screen.getByRole("button", { name: "View unit card for Keyword Readers" }));
  const card = screen.getByRole("dialog", { name: "Unit card for Keyword Readers" });
  const reader = within(card);
  const blankRow = reader.getByText("Reference blade").closest("tr")!;
  // The phone label is decorative; the actual keyword value remains empty.
  expect(blankRow.querySelectorAll("td")[1]?.querySelector(".selection-profile-table-value")?.textContent).toBe("");
  expect(within(blankRow).getByRole("cell", { name: "" })).toBeTruthy();
  expect(reader.queryByText("Empty value")).toBeNull();
  expect(reader.queryByText("Fictional rapid fire reference.")).toBeNull();
  expect(reader.getByRole("button", { name: "View rules for Anti-Infantry 3+" })).toBeTruthy();
  for (const name of ["Psychic Assassin", "Unknown", "Hidden", "Ambiguous"]) {
    expect(reader.queryByRole("button", { name: `View rules for ${name}` })).toBeNull();
  }
  expect(card.textContent).toContain("Must not match Psychic Assassin.");
  expect(reader.getAllByText(/Rule applicability unresolved/)).toHaveLength(1);
  const trigger = reader.getByRole("button", { name: "View rules for Rapid Fire 4" });
  card.scrollTop = 180;
  trigger.focus();
  fireEvent.click(trigger);
  const rule = screen.getByRole("dialog", { name: "Rapid Fire 4" });
  expect(rule.textContent).toContain("Fictional rapid fire reference.");
  expect(card.isConnected).toBe(true);
  expect(card.parentElement?.hasAttribute("hidden")).toBe(false);
  expect(card.parentElement?.getAttribute("aria-hidden")).toBe("true");
  expect(card.parentElement?.hasAttribute("inert")).toBe(true);
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(card.scrollTop).toBe(180);
  const close = within(rule).getByRole("button", { name: "Close" });
  const nestedTrigger = within(rule).getByRole("button", { name: "View reference for rapid fire" });
  nestedTrigger.focus();
  fireEvent.keyDown(nestedTrigger, { key: "Tab" });
  expect(document.activeElement).toBe(close);
  rule.scrollTop = 55;
  fireEvent.click(nestedTrigger);
  const nested = screen.getByRole("dialog", { name: "Rapid Fire" });
  expect(rule.parentElement?.hasAttribute("inert")).toBe(true);
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  fireEvent.keyDown(nested, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(nestedTrigger));
  expect(rule.scrollTop).toBe(55);
  // Cyclic references remain navigable but cannot accumulate unlimited sheets.
  for (let depth = 1; depth < 8; depth++) {
    const current = screen.getByRole("dialog", {name: depth === 1 ? "Rapid Fire 4" : "Rapid Fire"});
    fireEvent.click(within(current).getByRole("button", {name: "View reference for rapid fire"}));
  }
  expect(screen.getByText("Close a reference to follow more links.")).toBeTruthy();
  expect(within(screen.getByRole("dialog", {name:"Rapid Fire"})).queryByRole("button",{name:"View reference for rapid fire"})).toBeNull();
  for (let depth = 7; depth > 0; depth--) fireEvent.keyDown(screen.getByRole("dialog", {name:"Rapid Fire"}), {key:"Escape"});
  fireEvent.keyDown(rule, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(card.scrollTop).toBe(180);
  expect(card.parentElement?.hasAttribute("inert")).toBe(false);
  fireEvent.click(reader.getByRole("button", { name: "View rules for Uncertain" }));
  expect(within(screen.getByRole("dialog", { name: "Uncertain" })).getByText(/Rule applicability unresolved/)).toBeTruthy();
});
