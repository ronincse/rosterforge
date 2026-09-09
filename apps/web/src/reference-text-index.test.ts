// Names/aliases are a bounded presentation index over real synthetic imports.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { forceOccurrenceId, rosterId } from "@rosterforge/roster-model";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { createLocalRosterSession } from "./roster-session.js";
import { catalogueReferenceTextIndex, matchTextReference } from "./reference-text-index.js";

it("projects aliases/noindex without altering bytes, limits scope and rejects ambiguity", async () => {
  const catalogue = { id: "text", name: "Text", gameSystemId: "system-203", battleScribeVersion: "2.03", library: false,
    sharedRules: [
      { id: "burst", name: "Burst", alias: ["BLASTING", 42, null], description: "A fictional burst." },
      { id: "exclude", name: "Excluded", alias: ["Forbidden"], noindex: true, description: "Do not index." },
      { id: "one", name: "A", description: "Too short." },
      { id: "same1", name: "Same", description: "One." }, { id: "same2", name: "Same", description: "Two." },
    ], sharedProfiles: [{ id: "warp", name: "5. Alternate", alias: ["Alternate"], characteristics: [{name: "Description", $text: "A fictional alternate ability."}] }],
  };
  const bytes = new TextEncoder().encode(JSON.stringify({catalogue}));
  const prepared = await prepareLocalCatalogueLibrary([{filename: "projection.gst", bytes: new Uint8Array(readFileSync("packages/test-fixtures/fixtures/projection.gst"))}, {filename: "text.json", bytes}, {filename: "other.json", bytes: new TextEncoder().encode(JSON.stringify({catalogue:{id:"other", name:"Other", gameSystemId:"system-203", sharedRules:[{id:"outsider",name:"Outsider",description:"Unrelated."}]}}))}], { import: { batchId: "rich", importedAt: "2026-09-09T00:00:00Z" } });
  if (!prepared.ok) throw new Error("Import failed");
  const choice = prepared.value.selectableCatalogues.find(c => c.id === "text")!;
  const created = createLocalRosterSession(choice, choice.context.forces.definitions[0]!, {rosterId: rosterId("text"),forceId:forceOccurrenceId("force"),name:"Text"});
  if (!created.ok) throw new Error("Create failed");
  const index = catalogueReferenceTextIndex(created.value);
  expect(choice.document.projection.rules.find(r => r.id === "burst")?.alias).toEqual(["BLASTING"]);
  expect(new TextDecoder().decode(bytes)).toBe(JSON.stringify({catalogue}));
  expect(choice.document.sourceBytes).toEqual(bytes);
  expect(choice.document.documentBytes).toEqual(bytes);
  expect(matchTextReference(index, "blasting", 0)?.target.name).toBe("Burst");
  expect(matchTextReference(index, "Burst X", 0)?.text).toBe("Burst");
  expect(matchTextReference(index, "Alternate", 0)?.target.profiles).toHaveLength(1);
  expect(matchTextReference(index, "Alternate", 0)?.target.sourceOnly).toBe(true);
  for (const text of ["Excluded", "Forbidden", "A", "Same", "Outsider", "Bursting", "xBurst"]) expect(matchTextReference(index, text, 0)).toBeUndefined();
  expect(catalogueReferenceTextIndex(created.value)).toBe(index);
});
