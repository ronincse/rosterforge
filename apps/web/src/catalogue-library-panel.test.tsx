// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogueSetupContext } from "./catalogue-library-panel.js";
import type { LocalCatalogueLibrary } from "./catalogue-library.js";

afterEach(cleanup);

describe("catalogue data freshness", () => {
  // SC-08 compares recorded revisions; acquisition time is contextual only.

  it("reports a different repository snapshot without claiming selected files changed", async () => {
    renderPanel({
      importedAt: "2026-08-01T00:00:00.000Z",
      fetch: jsonFetch([{sha:"b".repeat(40),commit:{committer:{date:"2026-08-23T09:47:50Z"}}}]),
    });

    fireEvent.click(screen.getByRole("button", {name:"Check source"}));
    const note = await screen.findByText(/snapshot differs/u);
    expect(screen.getByText("Source: BSData/wh40k-11e")).toBeTruthy();
    expect(note.textContent).toContain("selected-file impact and revision chronology are not established");
    expect(note.closest("section")?.dataset.freshness).toBe("differs");
  });

  it("shows an explicit snapshot match even when acquisition is recent", async () => {
    const fetch = jsonFetch([{sha:"a".repeat(40),commit:{committer:{date:"2026-08-23T09:47:50Z"}}}]);
    renderPanel({
      importedAt: "2026-08-23T12:00:00.000Z",
      fetch,
    });

    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name:"Check source"}));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText(/matches the checked repository snapshot/)).toBeTruthy();
  });

  it("keeps a failed check unavailable without claiming a match", async () => {
    // A network exception does not establish whether this is offline or blocked.
    renderPanel({
      importedAt: "2026-08-01T00:00:00.000Z",
      fetch: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    fireEvent.click(screen.getByRole("button", {name:"Check source"}));
    const note = await screen.findByText(/Check unavailable/u);
    expect(note.textContent).toContain("Could not check this source");
    expect(note.closest("section")?.dataset.freshness).toBe("unavailable");
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
      <CatalogueSetupContext
        library={libraryFixture(importedAt)}
        diagnostics={[]}
        selectedCatalogue={catalogueChoice("freshness", "Fixture", importedAt)}
        onSelect={vi.fn()}
        freshnessOptions={{
          fetch: fetch as never,
        }}
      />,
    );
  }
});

describe("catalogue setup context", () => {
  it("shows a labelled chooser only for an intentional multi-catalogue batch", () => {
    const onSelect = vi.fn();
    const first = catalogueChoice("first", "First Catalogue");
    const second = catalogueChoice("second", "Second Catalogue");
    const library = {
      ...libraryFixture("2026-08-23T12:00:00.000Z"),
      selectableCatalogues: [first, second],
      catalogues: [first, second],
    } as LocalCatalogueLibrary;

    render(
      <CatalogueSetupContext
        library={library}
        diagnostics={[]}
        selectedCatalogue={first}
        onSelect={onSelect}
        freshnessOptions={currentFreshnessOptions()}
      />,
    );

    const chooser = screen.getByLabelText("Catalogue");
    expect((chooser as HTMLSelectElement).value).toBe("first");
    fireEvent.change(chooser, { target: { value: "second" } });
    expect(onSelect).toHaveBeenCalledWith("second");
  });

  it("does not show a chooser for one playable catalogue", () => {
    const only = catalogueChoice("only", "Only Catalogue");
    render(
      <CatalogueSetupContext
        library={
          {
            ...libraryFixture("2026-08-23T12:00:00.000Z"),
            selectableCatalogues: [only],
            catalogues: [only],
          } as LocalCatalogueLibrary
        }
        diagnostics={[]}
        selectedCatalogue={only}
        onSelect={vi.fn()}
        freshnessOptions={currentFreshnessOptions()}
      />,
    );

    expect(screen.queryByLabelText("Catalogue")).toBeNull();
  });
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

function catalogueChoice(key: string, name: string, importedAt = "2026-08-23T12:00:00Z") {
  const revision = "a".repeat(40);
  const source = {sourceId:`download:github:BSData/wh40k-11e@${revision}:fixture.cat`, filename:"fixture.cat", kind:"download", importedAt, origin:`https://raw.githubusercontent.com/BSData/wh40k-11e/${revision}/fixture.cat`};
  const document = {source};
  const graph = {reachableDocumentsByDocument:new Map([[document,new Set([document])]]),references:[]};
  return {
    source, document, context:{document,graph},
    key,
    name,
    materializationTruncated: false,
  } as unknown as LocalCatalogueLibrary["selectableCatalogues"][number];
}

function currentFreshnessOptions() {
  return {
    fetch: jsonFetch([{sha:"a".repeat(40),commit:{committer:{date:"2026-08-01T00:00:00Z"}}}]),
  };
}

it("SC-08 does not query a guessed repository for an unproven local import", async () => {
 const { prepareLocalCatalogueLibrary } = await import("./catalogue-library.js");
 const result = await prepareLocalCatalogueLibrary([
  {filename:"local.gst",bytes:new TextEncoder().encode('<gameSystem id="g" name="G" revision="1" battleScribeVersion="2.03"/>')},
  {filename:"local.cat",bytes:new TextEncoder().encode('<catalogue id="c" name="Local" gameSystemId="g" revision="1" battleScribeVersion="2.03"/>')},
 ],{import:{batchId:"local",importedAt:"2026-09-20T00:00:00Z"}});
 if(!result.ok) throw Error("Fixture import failed");
 const fetch = vi.fn(async()=>new Response("{}",{status:503}));
 render(<CatalogueSetupContext library={result.value} diagnostics={[]} selectedCatalogue={result.value.selectableCatalogues[0]} onSelect={vi.fn()} freshnessOptions={{fetch}}/>);
 expect(fetch).not.toHaveBeenCalled();
 expect(screen.getByText(/Repository freshness cannot be established/)).toBeTruthy();
});
