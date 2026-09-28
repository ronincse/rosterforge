// @vitest-environment jsdom
// Semantic preservation across intentionally different print compositions.
import { expect, it } from "vitest";
import { renderArmyReferenceDocument } from "./army-reference-html.js";
import type { ArmyReferenceDocument } from "./army-reference-model.js";

it("retains unknown labels, paragraphs, scope, effects and links across distinct templates", () => {
  const unit = { anchor: "unit-2", name: "2. Same name", role: "Fictional role", configuration: false, composition: "3× Crew", options: ["3× Crew", "Second bearer: different blade"], costs: [{ typeId: "r", name: "Resource", value: 17 }], profiles: [
    { record: "P1", name: "Sentinel", type: "Unknown defensive schema", section: "model" as const, fields: [{ name: "Barrier", value: "7+", note: "Modified from 8+." }, { name: "Range pair", value: "1: 1 | 2-3: 2", note: "" }], attribution: "2× Shield crew", notes: [], table: true, effects: ["Applied ward from U3"], members: [{ key: "S1", label: "Shield crew", amount: 2 }] },
    { record: "P2", name: "Different mode", type: "Unfamiliar beam", section: "weapon" as const, fields: [{ name: "Impact", value: "D3", note: "" }], attribution: "1× Second bearer", notes: [], table: true },
    { record: "P3", name: "Orders", type: "Fictional activation window", section: "ability" as const, fields: [{ name: "Effect", value: "First paragraph.\n\nSecond paragraph with **full text**.", note: "Unknown applicability." }, { name: "Activation", value: "Reaction (2 Energy)", note: "" }], attribution: "1× Second bearer", notes: ["Formatting not evaluated."], table: false },
  ], rules: ["rule-1"], keywords: ["Fiction"], notes: ["Costs qualified."], relationships: ["Supports U3"] };
  const doc: ArmyReferenceDocument = { name: "Unsaved snapshot", system: "Fiction", catalogue: "Fiction", resources: [{ typeId: "r", name: "Resource", value: 34, limit: 50 }], status: ["Unresolved checks."], units: [
    { ...unit, anchor: "unit-1", name: "1. Setup", sheetUnit: false, referenceSection: "supporting", profiles: [], options: ["Map selection"], rules: [] },
    unit, { ...unit, anchor: "unit-3", name: "3. Same name", profiles: [] },
    { ...unit, anchor: "unit-4", name: "4. Army doctrine", sheetUnit: false, referenceSection: "army", profiles: [] },
  ], glossary: [{ anchor: "rule-1", name: "Full shared rule", text: "Full reusable explanation.", note: "Source reference only.", users: [unit.name] }] };
  const before = JSON.stringify(doc);
  const pages = ["compact", "sheets"].map(layout => new DOMParser().parseFromString(renderArmyReferenceDocument(doc, layout as "compact" | "sheets"), "text/html"));
  for (const page of pages) {
    const selected = page.getElementById("unit-2")!;
    expect([...page.querySelectorAll('article.unit')].map(e => e.id)).toEqual(["unit-2", "unit-3", "unit-4", "unit-1"]);
    for (const text of ["Unknown defensive schema", "Barrier", "7+", "1: 1 | 2-3: 2", "Modified from 8+.", "D3", "Reaction (2 Energy)", "First paragraph.", "Second paragraph with full text.", "1× Second bearer", "Supports U3", "Applied ward from U3"]) expect(selected.textContent).toContain(text);
    expect(selected.querySelector('.loadout')?.textContent).toBe("Equipment / selections: Second bearer: different blade");
    expect(page.querySelector('#unit-4 .loadout')?.textContent).toContain("3× Crew");
    expect(selected.querySelectorAll('.ability-field .reference-rich-text p')).toHaveLength(3);
    expect([...selected.querySelectorAll('[data-profile-records]')].flatMap(e => JSON.parse(e.getAttribute('data-profile-records')!)).map(r => r.record)).toEqual(["P1", "P2", "P3"]);
    for (const a of page.querySelectorAll('a[href^="#"]')) expect(page.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull();
    expect(page.body.textContent).not.toContain("No child option selected");
  }
  expect(pages[0]!.querySelector('#unit-2 .stat-panel')).toBeNull();
  expect(pages[1]!.querySelector('#unit-2 .stat-panel')).not.toBeNull();
  expect(pages[0]!.querySelector('#unit-2 .compact-ability')).not.toBeNull();
  expect(pages[1]!.querySelector('#unit-2 .ability-activation')?.textContent).toContain("Reaction (2 Energy)");
  expect(pages[1]!.querySelector('#unit-2 .ability-effect')?.textContent).toContain("Second paragraph");
  expect(JSON.stringify(doc)).toBe(before);
});
