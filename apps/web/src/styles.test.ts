import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("phone-width layout contracts", () => {
  it("does not turn the 320 px support floor into horizontal overflow", () => {
    expect(styles).toContain("min-width: min(320px, 100%);");
  });

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

  it("gives unit selection and options the full usable phone width", () => {
    // The unit row owns one full-width disclosure; View and Remove move into
    // the selected-unit panel instead of squeezing the row at 320 px. That
    // panel must also collapse back to one column rather than becoming a third
    // persistent desktop pane.
    expect(styles).toContain(
      ".roster-unit-row-disclosure {\n  display: grid;\n" +
        "  grid-template-columns: minmax(0, 1fr) auto;",
    );
    expect(styles).toMatch(
      /@media \(max-width: 560px\) \{[\s\S]*?\.selected-unit-panel-heading button \{\n {4}min-height: 44px;/u,
    );
    expect(styles).toMatch(
      /@media \(max-width: 850px\) \{[\s\S]*?\.selected-roster-pane\[data-options-open="true"\] \{\n {4}grid-template-columns: 1fr;/u,
    );
  });

  it("keeps catalogue rows compact while making disclosure controls obvious", () => {
    expect(styles).toContain(
      ".root-choice {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;",
    );
    expect(styles).toContain(
      ".root-choice-category > summary::before {\n  content: \"\\203A\";",
    );
    expect(styles).toContain(
      ".unit-card-toggle::before {\n  display: inline-block;\n  width: 18px;",
    );
    expect(styles).toContain(
      '--display-font:\n    "Bahnschrift SemiCondensed", Bahnschrift',
    );
  });

  it("turns Add unit into an accessible regular sheet and compact full-screen task", () => {
    // The catalogue no longer owns permanent page width. Pin the modal bounds,
    // touch-target floor, visible keyboard focus, and compact safe-area rules
    // that were verified in the real browser at the supported widths.
    expect(styles).toContain(
      ".add-unit-dialog {\n  display: grid;\n  width: min(760px, 100%);",
    );
    expect(styles).toContain(
      ".choice-preview-heading.add-unit-heading button,\n" +
        ".add-unit-dialog .root-choice-actions .choice-segmented-control > button {\n" +
        "  min-width: 44px;\n" +
        "  min-height: 44px;",
    );
    expect(styles).toContain(
      ".add-unit-dialog .root-choice-filter input:focus-visible {\n" +
        "  outline: 3px solid rgba(28, 107, 74, 0.42);",
    );
    expect(styles).toMatch(
      /@media \(max-width: 560px\) \{[\s\S]*?\.add-unit-dialog \{\n {4}width: 100%;[\s\S]*?height: 100dvh;[\s\S]*?\.add-unit-heading \{[\s\S]*?env\(safe-area-inset-top\)/u,
    );
  });

  it("keeps roster configuration a compact settings row", () => {
    // The complete setup tree remains mounted below this disclosure, but its
    // default footprint must stay one tap-sized row at every supported width.
    expect(styles).toContain(
      ".roster-configuration > summary {\n  display: block;\n  min-height: 64px;",
    );
    expect(styles).toContain(
      ".roster-configuration-summary-heading {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;",
    );
    expect(styles).toContain(
      ".roster-configuration > summary:focus-visible {\n  outline: 3px solid rgba(28, 107, 74, 0.42);",
    );
    expect(styles).toContain(
      ".roster-configuration[open] .roster-configuration-chevron {\n  transform: rotate(90deg);",
    );
  });

  it("keeps glass surfaces distinct, legible, and progressively enhanced", () => {
    // Blur is an enhancement, not the only source of separation. Pin opaque
    // enough surfaces and borders alongside the WebKit path and accessibility
    // fallbacks because these cards repeat throughout a phone-width roster.
    expect(styles).toContain(
      ".roster-workspace-nav {\n  position: sticky;\n  z-index: 5;\n  top: 0;",
    );
    expect(styles).toMatch(
      /\.roster-workspace-nav \{[\s\S]*?background: rgba\(29, 68, 53, 0\.82\);[\s\S]*?-webkit-backdrop-filter: blur\(26px\) saturate\(115%\);[\s\S]*?backdrop-filter: blur\(26px\) saturate\(115%\);/u,
    );
    expect(styles).toContain(
      '.roster-selection-section[data-section="army"]\n' +
        "  > .roster-top-level-selection-list {\n" +
        "  display: grid;\n  gap: 10px;\n  overflow: visible;\n" +
        "  background: transparent;\n  border: 0;",
    );
    expect(styles).toMatch(
      /\.roster-unit-row \{[\s\S]*?background: var\(--card-material\);[\s\S]*?border-radius: var\(--corner-radius\);[\s\S]*?-webkit-backdrop-filter: blur\(18px\) saturate\(115%\);[\s\S]*?backdrop-filter: blur\(18px\) saturate\(115%\);/u,
    );
    expect(styles).not.toContain(".roster-unit-row + .roster-unit-row");
    expect(styles).toMatch(
      /\.choice-preview-backdrop \{[\s\S]*?background: rgba\(19, 32, 26, 0\.7\);[\s\S]*?@supports[\s\S]*?\.choice-preview-backdrop \{[\s\S]*?-webkit-backdrop-filter: blur\(20px\) saturate\(90%\);[\s\S]*?backdrop-filter: blur\(20px\) saturate\(90%\);/u,
    );
    expect(styles).toContain(
      "@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {",
    );
    expect(styles).toContain("@media (forced-colors: active) {");
  });

  it("uses one exposed-corner radius throughout the active roster", () => {
    expect(styles).toContain("--corner-radius: 14px;");
    expect(styles).toContain(
      "button,\ninput,\nselect {\n  border-radius: var(--corner-radius);",
    );
    expect(styles).toMatch(
      /\.roster-selection-item \{[\s\S]*?background: var\(--nested-card-material\);[\s\S]*?border-radius: var\(--corner-radius\);[\s\S]*?box-shadow:/u,
    );
    expect(styles).toMatch(
      /\.direct-child-choice \{[\s\S]*?background: var\(--nested-card-material\);[\s\S]*?border-radius: var\(--corner-radius\);[\s\S]*?box-shadow:/u,
    );
    expect(styles).toMatch(
      /\.model-quantity-choice \{[\s\S]*?background: var\(--nested-card-material\);[\s\S]*?border-radius: var\(--corner-radius\);[\s\S]*?box-shadow:/u,
    );
    expect(styles).toMatch(
      /\.child-choice-group \{[\s\S]*?background: var\(--nested-card-material\);[\s\S]*?border-radius: var\(--corner-radius\);[\s\S]*?box-shadow:/u,
    );
    expect(styles).toContain(
      "border-radius: var(--corner-radius) 0 0 var(--corner-radius);",
    );
    expect(styles).toContain(
      "border-radius: 0 var(--corner-radius) var(--corner-radius) 0;",
    );

    // Rectilinear roster surfaces consume the shared token. A zero radius is
    // reserved for square internal seams and full-bleed/surface-free wrappers.
    const activeRosterStyles = styles.slice(
      styles.indexOf(".roster-setup {"),
      styles.indexOf(".remote-source-browser"),
    );
    const offSystemRadii = [...activeRosterStyles.matchAll(/border-radius:\s*([^;]+);/gu)]
      .map((match) => match[1]?.trim() ?? "")
      .filter((radius) => radius !== "0" && !radius.includes("var(--corner-radius)"));

    expect(offSystemRadii).toEqual([]);
  });
});
