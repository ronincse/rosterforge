// @vitest-environment jsdom
// Repeated-copy prices depend on durable occurrence order, including UI history/storage.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App.js";
import { createLocalRosterDraftStore, type StoredRecord } from "./browser-drafts.js";

afterEach(cleanup);
const local = `<conditionGroups><conditionGroup type="and"><localConditionGroups><localConditionGroup type="atLeast" value="2" scope="parent" field="selections" includeChildSelections="true" includeChildForces="true" repeats="1"><conditions><condition type="before" value="1" field="selections" scope="self" childId="any" shared="true"/><condition type="instanceOf" value="1" field="selections" scope="self" childId="knight" shared="true"/></conditions></localConditionGroup></localConditionGroups></conditionGroup></conditionGroups>`;
async function setup() {
  const records = new Map<string, StoredRecord>();
  const store = createLocalRosterDraftStore({ getAll: async () => [...records.values()], get: async id => records.get(id), put: async r => { records.set(r.id, r); }, delete: async id => { records.delete(id); } });
  let n = 0;
  const props = { draftStore: store, createDraftId: () => "pricing-draft", createEntityId: (kind: string) => `${kind}-${++n}` };
  const view = render(<App {...props} />);
  const system = '<gameSystem id="pricing" name="Pricing" revision="1" battleScribeVersion="2.03"><costTypes><costType id="points" name="Points"/></costTypes><forceEntries><forceEntry id="army" name="Army"><constraints><constraint id="cap" type="max" value="2000" field="points" scope="force" shared="true" includeChildSelections="true"/></constraints></forceEntry></forceEntries></gameSystem>';
  const catalogue = `<catalogue id="fleet" name="Fleet" gameSystemId="pricing" revision="1" battleScribeVersion="2.03"><selectionEntries><selectionEntry id="knight" name="Knight" type="unit"><costs><cost typeId="points" name="Points" value="240"/></costs><modifiers><modifier type="increment" field="points" value="20">${local}</modifier></modifiers></selectionEntry><selectionEntry id="other" name="Other" type="unit"><costs><cost typeId="points" name="Points" value="10"/></costs></selectionEntry></selectionEntries></catalogue>`;
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), { target: { files: [["pricing.gst", system], ["fleet.cat", catalogue]].map(([name, text]) => ({ name, type: "application/xml", arrayBuffer: async () => new TextEncoder().encode(text).buffer })) } });
  await screen.findByRole("heading", { name: "Fleet" });
  fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
  return { view, props };
}
function add(name: string) { fireEvent.click(screen.getByRole("button", { name: /Add unit, / })); fireEvent.click(screen.getByRole("button", { name: `Add ${name}` })); }
function action(name: string) { fireEvent.click(screen.getByRole("button", { name: /Roster actions/ })); fireEvent.click(screen.getByRole("menuitem", { name })); }
function total(value: string) { expect(within(screen.getByRole("navigation", { name: "Roster workspace navigation" })).getByText(`${value} / 2,000`)).toBeTruthy(); }

it("recomputes preceding-copy pricing through duplication, earlier deletion, undo/redo and saved reopen", async () => {
  const { view, props } = await setup();
  add("Knight"); total("240");
  add("Other"); add("Knight"); total("490");
  fireEvent.click(screen.getAllByRole("button", { name: "Duplicate Knight" })[0]!); total("750");
  fireEvent.click(screen.getAllByRole("button", { name: "Remove Knight" })[0]!); total("490");
  action("Undo"); total("750"); action("Redo"); total("490"); action("Undo"); total("750");
  action("Save draft"); await screen.findByText("Saved Fleet roster in this browser.");
  view.unmount(); render(<App {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open" }));
  await screen.findByRole("heading", { name: "Fleet roster" }); total("750");
  expect(screen.queryByText("EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED")).toBeNull();
});
