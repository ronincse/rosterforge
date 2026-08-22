// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalRosterDraftSummary } from "./browser-drafts.js";
import { SavedDraftShelf } from "./saved-draft-shelf.js";

afterEach(cleanup);

describe("saved draft shelf storage reporting", () => {
  it("counts a shared import batch once and says which cards share it", () => {
    // Both drafts came from the same import, so the browser holds one 8 MB
    // catalogue closure, not two. Adding the cards up would claim 16 MB.
    renderShelf([
      summary({ id: "a", rosterName: "Patrol", batchId: "batch-1" }),
      summary({ id: "b", rosterName: "Strike Force", batchId: "batch-1" }),
    ]);

    const shelf = screen.getByRole("region", { name: "Saved roster drafts" });
    expect(within(shelf).getByText(/2 drafts/u).textContent).toContain(
      "8.0 MB",
    );
    for (const name of ["Patrol", "Strike Force"]) {
      const card = within(shelf).getByText(name).parentElement;
      expect(card?.textContent).toContain("8.0 MB shared");
    }
  });

  it("totals separate batches and leaves an unshared card unmarked", () => {
    renderShelf([
      summary({ id: "a", rosterName: "Patrol", batchId: "batch-1" }),
      summary({
        id: "b",
        rosterName: "Onslaught",
        batchId: "batch-2",
        totalFileBytes: 2 * 1024 * 1024,
      }),
    ]);

    const shelf = screen.getByRole("region", { name: "Saved roster drafts" });
    expect(within(shelf).getByText(/2 drafts/u).textContent).toContain(
      "10.0 MB",
    );
    const card = within(shelf).getByText("Patrol").parentElement;
    expect(card?.textContent).toContain("8.0 MB");
    expect(card?.textContent).not.toContain("shared");
  });

  it("omits the total when nothing is saved", () => {
    renderShelf([]);

    const shelf = screen.getByRole("region", { name: "Saved roster drafts" });
    expect(within(shelf).getByText("0 drafts").textContent).toBe("0 drafts");
    expect(
      within(shelf).getByText("No roster drafts saved yet."),
    ).toBeTruthy();
  });
});

function renderShelf(drafts: readonly LocalRosterDraftSummary[]): void {
  render(
    <SavedDraftShelf
      state={{ kind: "ready", drafts, diagnostics: [] }}
      action={{ kind: "idle", diagnostics: [] }}
      activeDraftId={undefined}
      onLoad={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

function summary(
  overrides: Partial<LocalRosterDraftSummary> &
    Pick<LocalRosterDraftSummary, "id" | "rosterName" | "batchId">,
): LocalRosterDraftSummary {
  return {
    catalogueKey: "fixture:catalogue",
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:05:00.000Z",
    fileCount: 2,
    totalFileBytes: 8 * 1024 * 1024,
    selectionCount: 4,
    ...overrides,
  };
}
