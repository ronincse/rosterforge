// @vitest-environment jsdom

// Keep global supported validation and its narrower evidence cards honest about
// their separate scopes. Synthetic source constraints drive the real evaluator.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { failure, success } from "@rosterforge/foundation";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import * as sessions from "./roster-session.js";
import { RosterOverview } from "./roster-workspace.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const callbacks = {
  diagnostics: [], onClear: () => {}, onAddRootSelection: () => undefined,
  onDuplicateSelection: () => undefined, onRemoveSelection: () => {},
  onAddChildSelection: () => {}, onRenameSelection: () => {},
  onSetSelectionAmount: () => {}, canUndo: false, canRedo: false,
  onUndo: () => {}, onRedo: () => {}, onSaveDraft: () => {},
  onPrintRoster: () => true, isSavingDraft: false, hasSavedDraft: false,
  unsavedChanges: false,
};

async function fixture(structural: boolean, constraint: boolean) {
  const category = `<categoryEntries><categoryEntry id="leader" name="Leader"><constraints><constraint id="leader-min" type="min" value="${constraint ? 1 : 0}" field="selections" scope="roster" shared="true" includeChildSelections="true" /></constraints></categoryEntry></categoryEntries>`;
  const files = [
    { filename: "scope.gst", bytes: new TextEncoder().encode(`<gameSystem id="scope-system" name="Scope System" revision="1" battleScribeVersion="2.03">${category}<forceEntries><forceEntry id="patrol" name="Patrol" /></forceEntries></gameSystem>`) },
    { filename: "scope.cat", bytes: new TextEncoder().encode(`<catalogue id="scope" name="Scope Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="scope-system" gameSystemRevision="1"><selectionEntries><selectionEntry id="unit" name="Required Guard" type="unit"><constraints><constraint id="root-min" type="min" field="selections" scope="force" shared="true" value="${structural ? 1 : 0}" /></constraints><categoryLinks><categoryLink id="leader-link" name="Leader" targetId="leader" primary="true" /></categoryLinks></selectionEntry></selectionEntries></catalogue>`) },
  ];
  const prepared = await prepareLocalCatalogueLibrary(files, { import: { batchId: "scope", importedAt: "2026-09-11T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Scope fixture import failed");
  const catalogue = prepared.value.selectableCatalogues[0]!;
  const created = sessions.createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, {
    rosterId: rosterId("scope-roster"), forceId: forceOccurrenceId("scope-force"), name: "Scope Patrol",
  });
  if (!created.ok) throw new Error("Scope fixture creation failed");
  return created.value;
}

function assertScope(total: number, structural: boolean, structuralIncomplete = false, constraintIncomplete = false) {
  expect(screen.getByRole("button", { name: `Open roster problems, ${total} known ${total === 1 ? "violation" : "violations"}` })).toBeTruthy();
  const card = screen.getByRole("region", { name: "Supported structural requirements" });
  expect(within(card).getByText("Structural checks")).toBeTruthy();
  expect(within(card).getByText(structural ? "Known structural violations" : "No known structural violations")).toBeTruthy();
  expect(within(card).getByText(structuralIncomplete ? "Some structural checks unresolved" : "Supported structural checks complete")).toBeTruthy();
  const constraints = screen.getByRole("region", { name: "Constraint bounds" });
  expect(within(constraints).getByText(constraintIncomplete ? "Some constraint checks unresolved" : "Supported constraint checks complete")).toBeTruthy();
  expect(within(card).queryByText("No known violations")).toBeNull();
  expect(within(card).queryByText("All supported rules checked")).toBeNull();
  expect(card.querySelector('.constraint-status-list [data-status="violated"] strong')?.textContent).toBe(structural ? "1" : "0");
  expect(constraints.querySelector('.constraint-status-list [data-status="violated"] strong')?.textContent).toBe(String(total - (structural ? 1 : 0)));
  expect(screen.getByText(`${total} known ${total === 1 ? "violation" : "violations"} | ${structuralIncomplete || constraintIncomplete ? "some rules not checked" : "all supported rules checked"}`)).toBeTruthy();
}

it.each([
  { name: "structural only", structural: true, constraint: false, total: 1 },
  { name: "nonstructural only", structural: false, constraint: true, total: 1 },
  { name: "mixed", structural: true, constraint: true, total: 2 },
  { name: "complete with zero known", structural: false, constraint: false, total: 0 },
])("labels $name evidence without replacing domain status with aggregate status", async ({ structural, constraint, total }) => {
  const session = await fixture(structural, constraint);
  render(<RosterOverview session={session} {...callbacks} />);
  assertScope(total, structural);
});

it.each(["structural", "constraint"] as const)("does not call zero-known incomplete %s coverage globally complete", async domain => {
  const session = await fixture(false, false);
  const inspected = sessions.inspectLocalRosterSupportedValidation(session);
  if (!inspected.ok) throw new Error("Scope fixture inspection failed");
  // This pair tests presentation of independent coverage dimensions, not the
  // evaluator's unsupported-source detection. Retain real bounds and validity;
  // inject only an incomplete domain and its aggregate completeness.
  vi.spyOn(sessions, "inspectLocalRosterSupportedValidation").mockReturnValue(success({
    ...inspected.value,
    status: { ...inspected.value.status, completeness: "incomplete" },
    ...(domain === "structural"
      ? { structural: { ...inspected.value.structural, completeness: "incomplete" } }
      : { constraints: { ...inspected.value.constraints, completeness: "incomplete" } }),
  }));
  render(<RosterOverview session={session} {...callbacks} />);
  assertScope(0, false, domain === "structural", domain === "constraint");
  expect(screen.getByText("0 known violations | some rules not checked")).toBeTruthy();
});

it("updates global and scoped counts together after a real structural edit", async () => {
  const session = await fixture(true, true);
  const view = render(<RosterOverview session={session} {...callbacks} />);
  assertScope(2, true);
  const edited = sessions.addLocalRosterRootSelection(session, sessions.localRosterRootChoices(session.catalogue)[0]!, { selectionId: selectionOccurrenceId("added-guard") });
  if (!edited.ok) throw new Error("Scope fixture edit failed");
  view.rerender(<RosterOverview session={edited.value} {...callbacks} />);
  assertScope(0, false);
  expect(screen.getByText("0 known violations | all supported rules checked")).toBeTruthy();
});

it("renders unavailable inspection without green success badges", async () => {
  const session = await fixture(false, false);
  vi.spyOn(sessions, "inspectLocalRosterSupportedValidation").mockReturnValue(failure([]));
  render(<RosterOverview session={session} {...callbacks} />);
  expect(screen.getByText("Checks unavailable")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Structural status unavailable" })).toBeTruthy();
  expect(screen.queryByText("No known structural violations")).toBeNull();
  expect(screen.queryByText("Supported structural checks complete")).toBeNull();
  expect(screen.queryByText("Supported constraint checks complete")).toBeNull();
  expect(screen.queryByText("0 known violations | all supported rules checked")).toBeNull();
});
