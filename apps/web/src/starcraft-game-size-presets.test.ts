// Fictional XML exercises preset eligibility through the ordinary catalogue path.
import { describe, expect, it } from "vitest";
import type { Result } from "@rosterforge/foundation";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import { starcraftGameSizePresets } from "./starcraft-game-size-presets.js";

const systemId = "sys-ce49-e853-2fea-6af1";
const minerals = "5bcf-897a-a5c9-d0e8";
const gas = "1719-6214-392e-e53f";
const costs = `<costType id="${minerals}" name="Fictional ore" defaultCostLimit="77"/><costType id="${gas}" name="Fictional fuel" defaultCostLimit="9"/>`;
function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
async function fixture({ game = systemId, systemCosts = costs, catalogueCosts = "", links = "", extraFiles = [] as string[], omitSystem = false } = {}) {
  const xml = `<catalogue id="fiction" name="StarCraft lookalike label" revision="1" gameSystemId="${game}" gameSystemRevision="1" battleScribeVersion="2.03"><costTypes>${catalogueCosts}</costTypes><catalogueLinks>${links}</catalogueLinks><forceEntries><forceEntry id="army" name="Army"/></forceEntries></catalogue>`;
  const system = `<gameSystem id="${game}" name="Deliberately renamed system" revision="1" battleScribeVersion="2.03"><costTypes>${systemCosts}</costTypes></gameSystem>`;
  const files = [{ filename: "fiction.cat", bytes: new TextEncoder().encode(xml) },
    ...(!omitSystem ? [{ filename: "fiction.gst", bytes: new TextEncoder().encode(system) }] : []),
    ...extraFiles.map((text, index) => ({ filename: `extra-${index}.gst`, bytes: new TextEncoder().encode(text) }))];
  const library = ok(await prepareLocalCatalogueLibrary(files, {
    import: { batchId: "fictional-presets", importedAt: "2026-09-28T00:00:00Z" },
  }));
  return library.catalogues.find(catalogue => catalogue.id === "fiction")!.context;
}

describe("StarCraft game-size preset eligibility", () => {
  it("offers only the two versioned published pairs despite different labels/defaults", async () => {
    const context = await fixture();
    const before = context.graph.documents.map(document => [...document.sourceBytes]);
    const choices = starcraftGameSizePresets(context);
    expect(choices).toEqual([
      expect.objectContaining({ id: "skirmish", label: "Skirmish", mineralsTypeId: minerals, minerals: 1000, gasTypeId: gas, gas: 100 }),
      expect.objectContaining({ id: "standard", label: "Standard", mineralsTypeId: minerals, minerals: 2000, gasTypeId: gas, gas: 200 }),
    ]);
    expect(choices.every(choice => choice.ruleVersion === "Organised Play Guide v1.0" && choice.sourceUrl.endsWith("StarCraft-TMG-Organised-Play_EN.pdf"))).toBe(true);
    expect(starcraftGameSizePresets(context)).toBe(choices);
    expect(Object.isFrozen(choices)).toBe(true);
    expect(choices.every(Object.isFrozen)).toBe(true);
    expect(context.graph.documents.map(document => [...document.sourceBytes])).toEqual(before);
  });

  it("does not infer game identity from the display name or familiar currency IDs", async () => {
    expect(starcraftGameSizePresets(await fixture({ game: "different-system" }))).toEqual([]);
  });

  it.each([minerals, gas])("requires the exact currency ID %s", async missing => {
    const remaining = missing === minerals ? gas : minerals;
    expect(starcraftGameSizePresets(await fixture({ systemCosts: `<costType id="${remaining}" name="Present"/><costType id="lookalike" name="${missing === gas ? "Gas" : "Minerals"}"/>` }))).toEqual([]);
  });

  it.each([minerals, gas])("rejects duplicate currency ID %s in the GST or catalogue", async duplicate => {
    const extra = `<costType id="${duplicate}" name="Duplicate"/>`;
    expect(starcraftGameSizePresets(await fixture({ systemCosts: costs + extra }))).toEqual([]);
    expect(starcraftGameSizePresets(await fixture({ catalogueCosts: extra }))).toEqual([]);
  });

  it("requires currencies to belong to the resolved game system", async () => {
    expect(starcraftGameSizePresets(await fixture({ systemCosts: "", catalogueCosts: costs }))).toEqual([]);
    expect(starcraftGameSizePresets(await fixture({ omitSystem: true, catalogueCosts: costs }))).toEqual([]);
  });

  it("rejects an ambiguous game-system reference", async () => {
    expect(starcraftGameSizePresets(await fixture({ extraFiles: [`<gameSystem id="${systemId}" name="Duplicate system" revision="2" battleScribeVersion="2.03"/>`] }))).toEqual([]);
  });

  it("does not certify currency uniqueness through an unresolved dependency", async () => {
    const context = await fixture({ links: '<catalogueLink id="missing-link" name="Missing library" targetId="missing" type="catalogue" importRootEntries="true"/>' });
    expect(starcraftGameSizePresets(context)).toEqual([]);
  });

  it("ignores identical currencies in unrelated imported games", async () => {
    const context = await fixture({ extraFiles: [`<gameSystem id="unrelated" name="Unrelated game" revision="1" battleScribeVersion="2.03"><costTypes>${costs}</costTypes></gameSystem>`] });
    expect(starcraftGameSizePresets(context)).toHaveLength(2);
  });
});
