// @vitest-environment jsdom
// An exact capacity is independent of provisional spending, including persistence.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App.js";
import { createLocalRosterDraftStore, type StoredRecord } from "./browser-drafts.js";

afterEach(cleanup);

async function setup(unknownLimit = false) {
  const records = new Map<string, StoredRecord>();
  const store = createLocalRosterDraftStore({ getAll: async () => [...records.values()], get: async id => records.get(id), put: async r => { records.set(r.id, r); }, delete: async id => { records.delete(id); } });
  const system = `<gameSystem id="capacity" name="Capacity" revision="1" battleScribeVersion="2.03">
    <costTypes><costType id="tokens" name="Tokens"/><costType id="points" name="Points"/></costTypes>
    <categoryEntries><categoryEntry id="setup" name="Configuration"/></categoryEntries>
    <forceEntries><forceEntry id="army" name="Army"><constraints>
      <constraint id="tokens-max" type="max" field="tokens" scope="force" value="3" shared="true" includeChildSelections="true"/>
      <constraint id="points-max" type="max" field="points" scope="force" value="1500" shared="true" includeChildSelections="true"/>
    </constraints><modifiers><modifier type="${unknownLimit ? "unknown" : "set"}" field="points-max" value="2500">
      <conditions><condition type="atLeast" field="selections" scope="force" childId="large" value="1"/></conditions>
    </modifier></modifiers></forceEntry></forceEntries></gameSystem>`;
  const catalogue = `<catalogue id="fleet" name="Fleet" gameSystemId="capacity" revision="1" battleScribeVersion="2.03">
    <selectionEntries><selectionEntry id="carrier" name="Carrier" type="unit"><costs><cost name="Points" typeId="points" value="70"/></costs>
      <modifiers><modifier type="increment" field="points" value="10"><conditions><condition type="instanceOf" field="associations" scope="self" childId="carrier"/></conditions></modifier></modifiers>
    </selectionEntry><selectionEntry id="large" name="Large battle" type="upgrade">
      <categoryLinks><categoryLink id="setup-link" name="Configuration" targetId="setup" primary="true"/></categoryLinks>
      <costs><cost name="Tokens" typeId="tokens" value="1"/></costs>
      <modifiers><modifier type="increment" field="tokens" value="1"><conditions><condition type="instanceOf" field="associations" scope="self" childId="large"/></conditions></modifier></modifiers>
    </selectionEntry></selectionEntries></catalogue>`;
  let next = 0;
  const props = { draftStore: store, createDraftId: () => "capacity-draft", createEntityId: (kind: string) => `${kind}-${++next}` };
  const view = render(<App {...props} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: [["capacity.gst", system], ["fleet.cat", catalogue]].map(([name, text]) => ({ name, type: "application/xml", arrayBuffer: async () => new TextEncoder().encode(text).buffer })) } });
  await screen.findByRole("heading", { name: "Fleet" });
  fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
  return { view, props };
}

function add(name: string) {
  fireEvent.click(screen.getByRole("button", { name: /Add unit, / }));
  fireEvent.click(screen.getByRole("button", { name: `Add ${name}` }));
}
function nav() { return within(screen.getByRole("navigation", { name: "Roster workspace navigation" })); }
function action(name: string) {
  fireEvent.click(screen.getByRole("button", { name: /Roster actions/ }));
  fireEvent.click(screen.getByRole("menuitem", { name }));
}

it("preserves capacity through provisional costs, edit history, size changes and save/reopen", async () => {
  const { view, props } = await setup();
  expect(nav().getByText("0 / 1,500")).toBeTruthy();
  add("Carrier");
  expect(nav().getByText("70 / 1,500")).toBeTruthy();
  expect(nav().getByText("Provisional total")).toBeTruthy();
  expect(nav().getByText("Provisional total").className).toContain("roster-nav-provisional");
  expect(nav().queryByText(/remaining|over limit/)).toBeNull();
  action("Undo");
  expect(nav().getByText("0 / 1,500")).toBeTruthy();
  action("Redo");
  expect(nav().getByText("Provisional total")).toBeTruthy();
  add("Large battle");
  expect(nav().getByText("70 / 2,500")).toBeTruthy();
  expect(within(screen.getByRole("group", { name: "Configuration" })).getByText("70 / 2,500 Points · provisional total")).toBeTruthy();
  fireEvent.click(screen.getByText("Other roster limits"));
  expect(within(screen.getByRole("region", { name: "Roster report details" })).getByText("Tokens · provisional total")).toBeTruthy();
  action("Save draft");
  await screen.findByText("Saved Fleet roster in this browser.");
  view.unmount(); render(<App {...props} />);
  await screen.findByRole("button", { name: "Open" });
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  await screen.findByRole("heading", { name: "Fleet roster" });
  expect(nav().getByText("70 / 2,500")).toBeTruthy();
  expect(nav().getByText("Provisional total")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove Carrier" }));
  expect(nav().getByText("0 / 2,500")).toBeTruthy();
  expect(nav().getByText("2,500 remaining")).toBeTruthy();
});

it("withholds a genuinely unresolved limit instead of retaining the prior capacity", async () => {
  await setup(true);
  expect(nav().getByText("0 / 1,500")).toBeTruthy();
  add("Large battle");
  add("Carrier");
  expect(nav().queryByText(/1,500|2,500/)).toBeNull();
  expect(nav().getByText("Provisional total").className).toContain("roster-nav-provisional");
  expect(nav().getByRole("link", { name: /70 Points provisional total/ })).toBeTruthy();
});
