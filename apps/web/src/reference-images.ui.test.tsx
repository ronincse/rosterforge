// @vitest-environment jsdom
// Real DOM boundary assertions with deterministic platform failure/race doubles.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ReferenceRichText } from "./reference-rich-text.js";
import { fictionalJpeg } from "./reference-image-fixture.js";
import { prepareArmyReferenceImages, settleReferenceDocumentImages } from "./army-reference-images.js";
import { renderArmyReferenceDocument } from "./army-reference-html.js";
import type { ArmyReferenceDocument } from "./army-reference-model.js";
import { admitReferenceImage, decodeReferenceImage } from "./reference-images.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
function platform() {
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, writable: true, value: () => Promise.resolve() });
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(32);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(24);
  return vi.spyOn(HTMLImageElement.prototype, "decode");
}
function documentFor(text: string): ArmyReferenceDocument {
  return { name: `Player ![name](${fictionalJpeg})`, catalogue: "Fiction", system: "Fiction", resources: [], status: [], glossary: [], units: [{ anchor: "unit-1", name: "Map choice", role: "Setup", configuration: true, composition: "", options: [], costs: [], rules: [], keywords: [], notes: [], relationships: [], profiles: [{ name: "North map", type: "Deployment Map", section: "additional", attribution: "Selected map", notes: [], table: false, fields: [{ name: "Setup", value: "Place markers.", note: "" }, { name: "Diagram", value: text, note: "" }] }] }] };
}

it("renders rejected remote/HTML/SVG as escaped captioned failures without an image or fetch", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const caption = '<img src=x onerror="alert(1)"> &quot;';
  const { container } = render(<ReferenceRichText text={`Before ![${caption}](https://example.invalid/a) After ![svg](data:image/svg+xml;base64,PHN2Zz4=)`} />);
  expect(container.querySelector("img,script,a")).toBeNull();
  expect(container.textContent).toContain(caption);
  expect(container.textContent).toContain("After");
  expect(container.textContent).not.toContain("https:");
  expect(fetch).not.toHaveBeenCalled();
});

it("shows decode failure and ignores a late result for an unmounted image", async () => {
  const decode = platform().mockRejectedValue(new Error("corrupt"));
  const { container, rerender } = render(<ReferenceRichText text={`![Map](${fictionalJpeg})`} />);
  await screen.findByText("Map: Image could not be decoded.");
  expect(container.querySelector("img")).toBeNull();
  let finish!: () => void;
  decode.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  rerender(<ReferenceRichText text={`![Replacement](${fictionalJpeg})`} />);
  rerender(<ReferenceRichText text="Another document" />);
  finish();
  await waitFor(() => expect(container.textContent).toBe("Another document"));
});

it("bounds decode timeout and abort, releasing the temporary source", async () => {
  vi.useFakeTimers(); platform().mockImplementation(() => new Promise(() => undefined));
  const image = admitReferenceImage(fictionalJpeg); if (typeof image === "string") throw Error(image);
  const aborted = new AbortController(); const first = decodeReferenceImage(image, aborted.signal);
  aborted.abort(); expect(await first).toContain("cancelled");
  const second = decodeReferenceImage(image);
  await vi.advanceTimersByTimeAsync(8000); expect(await second).toContain("timed out");
});

it("freezes shared screen/export admission, distinct captions and data with restrictive CSP", async () => {
  const decode = platform();
  const doc = documentFor(`Before ![North](${fictionalJpeg}) Between ![South](${fictionalJpeg}) After`);
  const before = JSON.stringify(doc);
  const images = await prepareArmyReferenceImages(doc);
  expect(decode).toHaveBeenCalledTimes(1);
  for (const layout of ["compact", "sheets"] as const) {
    const html = renderArmyReferenceDocument(doc, layout, images);
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect([...parsed.querySelectorAll("img")].map(img => img.alt)).toEqual(["North", "South"]);
    expect(parsed.querySelector("img")?.getAttribute("src")).toBe(fictionalJpeg);
    expect(parsed.querySelector(".map-profile")?.textContent).toContain("Place markers.");
    expect(parsed.querySelector(".map-profile")?.textContent).not.toContain("base64");
    expect(parsed.querySelector("script,iframe,object,img[onerror]")).toBeNull();
    expect(parsed.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content")).toContain("default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    expect(parsed.querySelector("h1")?.textContent).toBe(doc.name);
  }
  expect(decode).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(doc)).toBe(before);
});

it("keeps failed decoding visible in standalone HTML and actual document readiness", async () => {
  platform().mockRejectedValue(Error("corrupt"));
  const doc = documentFor(`![Map](${fictionalJpeg})`);
  const html = renderArmyReferenceDocument(doc, "compact", await prepareArmyReferenceImages(doc));
  const parsed = new DOMParser().parseFromString(html, "text/html");
  expect(parsed.querySelector("img")).toBeNull();
  expect(parsed.querySelector(".map-profile")?.textContent).toContain("could not be decoded");
  document.body.innerHTML = '<figure class="reference-image"><img alt="Map"></figure>';
  await settleReferenceDocumentImages(document);
  expect(document.querySelector("img")).toBeNull();
  expect(document.body.textContent).toContain("could not be displayed");
});

it("keeps a source-name label inert and preserves literal entity-looking captions", () => {
  platform();
  const { container } = render(<ReferenceRichText text={`![&quot;](${fictionalJpeg})`} wholeReference inlineOnly />);
  expect(container.querySelector("img,figure")).toBeNull();
  expect(container.textContent).toContain("&quot;");
});
