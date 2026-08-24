import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("phone-width layout contracts", () => {
  it("keeps diagnostic and remote-source grids shrinkable", () => {
    // jsdom does not calculate layout. Pin the declarations whose removal made
    // a real Death Guard roster 41 px wider than its 390 px browser viewport.
    expect(styles).toContain(
      ".diagnostic-list {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);",
    );
    expect(styles).toContain(
      ".diagnostic-list li {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr);",
    );
    expect(styles).toContain(
      ".diagnostic-list strong {\n  overflow-wrap: anywhere;",
    );
    expect(styles).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.remote-source-card,[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/u,
    );
  });

  it("leaves sticky-navigation space above fragment targets", () => {
    expect(styles).toContain("html {\n  scroll-padding-top: 84px;\n}");
  });

  it("keeps the player header figures shrinkable to the supported minimum", () => {
    // The phone-width defect was a fixed grid track floor holding the document
    // wider than the viewport. The header's figure grid is that same shape, so
    // pin the min() that lets a figure fall to the container width instead of
    // demanding 140 px it may not have at 320 px.
    expect(styles).toContain(
      ".player-header-figures {\n  display: grid;\n" +
        "  grid-template-columns: repeat(auto-fit, minmax(min(140px, 100%), 1fr));",
    );
    expect(styles).toContain(".player-header-figure {\n  min-width: 0;");
  });
});
