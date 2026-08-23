// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogueLibraryPanel } from "./catalogue-library-panel.js";
import type { LocalCatalogueLibrary } from "./catalogue-library.js";

afterEach(cleanup);

describe("catalogue data freshness", () => {
  const source = { owner: "BSData", repository: "wh40k-11e" };

  it("says newer data is available when upstream moved after the import", async () => {
    renderPanel({
      importedAt: "2026-08-01T00:00:00.000Z",
      fetch: jsonFetch({ pushed_at: "2026-08-23T09:47:50Z" }),
    });

    const note = await screen.findByText(/last updated/u);
    expect(note.textContent).toContain("BSData/wh40k-11e");
    expect(note.textContent).toContain("newer catalogue data is available");
    expect(note.parentElement?.dataset.freshness ?? note.dataset.freshness).toBe(
      "stale",
    );
  });

  it("says the import is current when upstream has not moved since", async () => {
    renderPanel({
      importedAt: "2026-08-23T12:00:00.000Z",
      fetch: jsonFetch({ pushed_at: "2026-08-23T09:47:50Z" }),
    });

    const note = await screen.findByText(/last updated/u);
    expect(note.textContent).toContain("this import is current");
    expect(note.textContent).not.toContain("newer catalogue data");
  });

  it("says the data may be out of date when GitHub cannot be reached", async () => {
    // The fallback Stone asked for. Offline, rate-limited and blocked are
    // indistinguishable here, and the honest thing left to say is the same.
    renderPanel({
      importedAt: "2026-08-01T00:00:00.000Z",
      fetch: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/may be out of date/u)).toBeTruthy();
    });
    // The phrase sits inside a <strong>, so assert on the whole sentence.
    const note = screen.getByText(/may be out of date/u).closest("p");
    expect(note?.textContent).toContain("could not reach GitHub");
    expect(note?.dataset.freshness).toBe("unknown");
    // It must not imply the data is current.
    expect(note?.textContent).not.toContain("this import is current");
  });

  function renderPanel({
    importedAt,
    fetch,
  }: {
    readonly importedAt: string;
    readonly fetch: unknown;
  }): void {
    render(
      <CatalogueLibraryPanel
        library={libraryFixture(importedAt)}
        diagnostics={[]}
        selectedCatalogue={undefined}
        onSelect={vi.fn()}
        freshnessOptions={{
          source,
          fetch: fetch as never,
        }}
      />,
    );
  }
});

function jsonFetch(payload: unknown) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

function libraryFixture(importedAt: string): LocalCatalogueLibrary {
  return {
    status: "ready",
    importReport: {
      batchId: "freshness-batch",
      importedAt,
      files: [],
      status: "complete",
    },
    selectableCatalogues: [],
    catalogues: [],
    documents: [],
    gameSystems: [],
  } as unknown as LocalCatalogueLibrary;
}
