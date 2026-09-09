// @vitest-environment jsdom
// Rule-specific uncertainty must survive every player-facing reference surface.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { App } from "./App.js";
import { createLocalRosterDraftStore, type StoredRecord } from "./browser-drafts.js";

afterEach(cleanup);

async function open() {
  const records = new Map<string, StoredRecord>();
  const draftStore = createLocalRosterDraftStore({ getAll: async () => [...records.values()], get: async id => records.get(id), put: async r => { records.set(r.id, r); }, delete: async id => { records.delete(id); } });
  let next = 0;
  render(<App draftStore={draftStore} createEntityId={kind => `${kind}-${++next}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: ["projection.gst", "rule-visibility.cat"].map(name => ({ name, type: "application/xml", arrayBuffer: async () => new Uint8Array(readFileSync(resolve("packages/test-fixtures/fixtures", name))).buffer })) } });
  await screen.findByRole("heading", { name: "Rule Visibility", exact: true });
  fireEvent.click(screen.getByRole("button", { name: "Create roster", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: /Add unit, / }));
}

it("hides resolved inapplicable rules while retaining per-rule uncertainty and linked keyword context", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Add Signal Wardens", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "View unit card for Signal Wardens", exact: true }));
  const card = within(screen.getByRole("dialog", { name: "Unit card for Signal Wardens" }));
  expect(card.queryByText("Archived Signal")).toBeNull();
  expect(card.queryByText("Visiting Signal")).toBeNull();
  expect(card.queryByText("Silent Relay")).toBeNull();
  expect(card.getByText("Always Available")).toBeTruthy();
  expect(card.getByText("Associated Signal").closest("article")?.getAttribute("data-completeness")).toBe("incomplete");
  expect(card.getAllByText("Home Signal").length).toBeGreaterThan(0);
  expect(card.getAllByText(/Rule applicability unresolved/).length).toBeGreaterThan(0);
  fireEvent.click(card.getByRole("button", { name: "View rules for keyword Signal", exact: true }));
  const keyword = within(screen.getByRole("dialog", { name: "Signal", exact: true }));
  expect(keyword.getByText("Shared Signal").closest("article")?.getAttribute("data-completeness")).toBe("incomplete");
  expect(keyword.getByText(/Rule applicability unresolved/)).toBeTruthy();
});

it("source-only previews identify conditional rule applicability as unconfirmed", async () => {
  await open();
  fireEvent.click(screen.getByRole("button", { name: "View information for Signal Wardens", exact: true }));
  expect(screen.getAllByText("Home Signal").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Rule applicability unresolved/).length).toBeGreaterThan(0);
  expect(screen.queryByText("Archived Signal")).toBeNull();
});
