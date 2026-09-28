// Small decisive page-flow fixture. Optional local artifacts use the production
// renderer; no owner army or third-party reference data belongs in this test.
import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderArmyReferenceDocument } from "./army-reference-html.js";
import type { ArmyReferenceDocument } from "./army-reference-model.js";

it("keeps three small units identical while selecting different print flow", () => {
  const reference: ArmyReferenceDocument = {
    name: "Fictional page-flow probe", catalogue: "Fiction", system: "Fiction",
    resources: [], status: ["Fictional layout test"], glossary: [],
    units: ["Alpha", "Beta", "Gamma"].map((name, index) => ({
      anchor: `unit-${index + 1}`, name, role: "Patrol", configuration: false,
      composition: "1 model", options: [], costs: [], profiles: [], rules: [],
      keywords: [], notes: [], relationships: [],
    })),
  };
  const compact = renderArmyReferenceDocument(reference, "compact");
  const sheets = renderArmyReferenceDocument(reference, "sheets");
  expect(compact.replace('body class="compact"', 'body class="sheets"')).toBe(sheets);
  expect(sheets).toContain('.sheets .army-unit{break-before:page}');
  expect(sheets.match(/class="unit army-unit"/g)).toHaveLength(3);
  const directory = process.env.ROSTERFORGE_LAYOUT_PROBE_OUTPUT;
  if (directory) {
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "fiction-compact.html"), compact);
    writeFileSync(join(directory, "fiction-sheets.html"), sheets);
  }
});
