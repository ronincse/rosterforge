// Fictional admission, context and resource boundaries; platform behavior has
// separate DOM/readiness coverage rather than pretending headers are a codec.
import { expect, it } from "vitest";
import { admitReferenceImage, referenceContent, referenceProse, REFERENCE_IMAGE_LIMITS } from "./reference-images.js";
import { fictionalJpeg } from "./reference-image-fixture.js";

it("admits the evidenced JPEG syntax and preserves ordered prose and owners", () => {
  const text = `Before **setup**. ![North](${fictionalJpeg}) Middle ![South](${fictionalJpeg}) After.`;
  const parts = referenceContent(text);
  expect(parts.map(p => p.kind)).toEqual(["text", "image", "text", "image", "text"]);
  expect(parts[1]).toMatchObject({ caption: "North", image: { width: 32, height: 24 } });
  expect(parts[3]).toMatchObject({ caption: "South" });
  expect(referenceProse(text)).toBe("Before **setup**. \n Middle \n After.");
});

it("leaves escaped, inline-code, fenced-code, links and data-looking prose inert", () => {
  for (const text of [`\\![literal](${fictionalJpeg})`, `\`![literal](${fictionalJpeg})\``, `\`\`\`\n![literal](${fictionalJpeg})\n\`\`\``, `[ordinary](${fictionalJpeg})`, fictionalJpeg]) {
    expect(referenceContent(text)).toEqual([{ kind: "text", text }]);
  }
});

it.each(["https://example.invalid/image.jpg", "//example.invalid/a", "file:///private.jpg", "blob:imported", "data:image/svg+xml;base64,PHN2Zz4=", "data:text/html;base64,PGI+", "data:image/png;base64,AAAA", "data:image/jpeg;base64,@@==", "data:image/jpeg;base64,AAAA", "data:image/jpeg;base64,/9j/", "data:image/jpeg;base64,AA=A"])("contains rejected image %s without displaying its payload", uri => {
  expect(referenceContent(`before ![Map](${uri}) after`)).toEqual([{ kind: "text", text: "before " }, expect.objectContaining({ kind: "image", caption: "Map", reason: expect.any(String) }), { kind: "text", text: " after" }]);
});

it("bounds encoded/decoded bytes, pixels/dimensions and document occurrence budgets", () => {
  expect(admitReferenceImage("data:image/jpeg;base64," + "A".repeat(REFERENCE_IMAGE_LIMITS.encoded + 1))).toContain("Encoded");
  expect(admitReferenceImage("data:image/jpeg;base64," + "AAAA".repeat(86_000))).toContain("byte limit");
  const data = Uint8Array.from(atob(fictionalJpeg.slice(23)), c => c.charCodeAt(0));
  const sof = data.findIndex((n, i) => n === 255 && data[i + 1] === 192);
  for (const dimension of [0, 2049, 2048]) {
    const copy = data.slice();
    copy[sof + 5] = dimension >> 8; copy[sof + 6] = dimension & 255;
    copy[sof + 7] = dimension >> 8; copy[sof + 8] = dimension & 255;
    expect(admitReferenceImage("data:image/jpeg;base64," + btoa(String.fromCharCode(...copy)))).toContain("dimensions");
  }
  expect(referenceContent(`![Map](${fictionalJpeg})`, { count: 32, bytes: 0 })[0]).toMatchObject({ reason: expect.stringContaining("count") });
  expect(referenceContent(`![Map](${fictionalJpeg})`, { count: 0, bytes: 4_000_000 })[0]).toMatchObject({ reason: expect.stringContaining("byte limit") });
});

it("contains truncated syntax and retains following instructions", () => {
  expect(referenceContent("Before ![Map](data:image/jpeg;base64,broken\nAfter setup.")).toEqual([{ kind: "text", text: "Before " }, expect.objectContaining({ reason: "Image syntax is incomplete." }), { kind: "text", text: "\nAfter setup." }]);
});
