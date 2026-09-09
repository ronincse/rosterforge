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
  expect(blankRow.querySelectorAll("td")[1]?.textContent).toBe("");
  expect(reader.queryByText("Empty value")).toBeNull();
  expect(reader.queryByText("Fictional rapid fire reference.")).toBeNull();
  expect(reader.getByRole("button", { name: "View rules for Anti-Infantry 3+" })).toBeTruthy();
  for (const name of ["Psychic Assassin", "Unknown", "Hidden", "Ambiguous"]) {
    expect(reader.queryByRole("button", { name: `View rules for ${name}` })).toBeNull();
  }
  expect(reader.getByText("Must not match Psychic Assassin.")).toBeTruthy();
  expect(reader.getAllByText(/Rule applicability unresolved/)).toHaveLength(1);
  const trigger = reader.getByRole("button", { name: "View rules for Rapid Fire 4" });
  card.scrollTop = 180;
  trigger.focus();
  fireEvent.click(trigger);
  const rule = screen.getByRole("dialog", { name: "Rapid Fire 4" });
  expect(within(rule).getByText("Fictional rapid fire reference.")).toBeTruthy();
  expect(card.isConnected).toBe(true);
  expect(card.parentElement?.hasAttribute("hidden")).toBe(false);
  expect(card.parentElement?.getAttribute("aria-hidden")).toBe("true");
  expect(card.parentElement?.hasAttribute("inert")).toBe(true);
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(card.scrollTop).toBe(180);
  const close = within(rule).getByRole("button", { name: "Close" });
  close.focus();
  fireEvent.keyDown(close, { key: "Tab" });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(rule, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(card.scrollTop).toBe(180);
  expect(card.parentElement?.hasAttribute("inert")).toBe(false);
  fireEvent.click(reader.getByRole("button", { name: "View rules for Uncertain" }));
  expect(within(screen.getByRole("dialog", { name: "Uncertain" })).getByText(/Rule applicability unresolved/)).toBeTruthy();
});
