// @vitest-environment jsdom
// A large but small-resolution fictional JPEG reproduces the old prose fallback.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ReferenceRichText } from "./reference-rich-text.js";
import { fictionalJpeg } from "./reference-image-fixture.js";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("renders an oversized encoded map as one image without dropping setup prose", async () => {
  // Legal JPEG COM segments increase encoded length without allocating pixels.
  const bytes = atob(fictionalJpeg.slice(23));
  const padded = bytes.slice(0, 2) + "\xff\xfe\x80\x02" + "x".repeat(32768) + bytes.slice(2);
  const uri = "data:image/jpeg;base64," + btoa(padded);
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: () => Promise.resolve() });
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(32);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(24);
  const { container } = render(<ReferenceRichText text={`Before setup. ![Fictional map](${uri}) After setup.`} />);
  await waitFor(() => expect(screen.getByRole("img", { name: "Fictional map" }).getAttribute("src")).toBe(uri));
  expect(container.textContent).toContain("Before setup.");
  expect(container.textContent).toContain("After setup.");
  expect(container.textContent).not.toContain("base64");
  expect(container.querySelectorAll("*").length).toBeLessThan(30);
});
