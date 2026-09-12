// @vitest-environment jsdom
// Registration wiring uses synthetic failures; no third-party data or network.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { failure } from "@rosterforge/foundation";
import { App } from "./App.js";
import { defaultRemoteCatalogueSources, type indexRemoteCatalogueSource } from "./remote-catalogue-source.js";

afterEach(cleanup);

it.each(defaultRemoteCatalogueSources)("selects $title through the existing browser and retains failure handling", async (source) => {
  const index = vi.fn<typeof indexRemoteCatalogueSource>(async () => failure([{
    code: "REPOSITORY_GITHUB_HTTP_ERROR", message: "Synthetic download failure", severity: "error", impacts: ["import"],
  }]));
  render(<App repositoryByteCache={null} repositoryMetadataCache={null} indexRemoteSource={index} />);
  const card = screen.getByText(source.title).closest("article")!;
  fireEvent.click(within(card).getByRole("button", { name: "Browse catalogues" }));
  expect(await screen.findByText("Synthetic download failure")).toBeTruthy();
  expect(index.mock.calls[0]?.[0]).toBe(source);
  expect(screen.getByRole("heading", { name: "Your catalogue library starts here" })).toBeTruthy();
});
