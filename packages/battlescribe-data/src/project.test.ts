import { describe, expect, it } from "vitest";

import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { parseBattleScribeXml } from "./ingest.js";
import type { OrderedXmlElement } from "./types.js";

describe("BattleScribe 2.03 typed projections", () => {
  it("projects known GST structures and nested evaluation data without evaluating it", () => {
    const result = parseFixture("projection.gst");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const projection = result.value.projection;
    expect(projection.kind).toBe("gameSystem");
    expect(projection.metadata).toMatchObject({
      id: "system-203",
      revision: 0,
      authorName: "",
      authorContact: "fixture@example.test",
      authorUrl: "https://rosterforge.example/fixture",
      type: "future-game-system-kind",
      readme: "",
    });
    expect(projection.publications[0]).toMatchObject({
      id: "publication-core",
      shortName: "",
    });
    expect(projection.costTypes.map((costType) => costType.id)).toEqual([
      "cost-points",
      "cost-supply",
    ]);
    expect(projection.profileTypes.map((profileType) => profileType.id)).toEqual([
      "profile-type-unit",
      "profile-type-ability",
    ]);
    expect(
      projection.profileTypes[0]?.characteristicTypes.map(
        (characteristicType) => characteristicType.id,
      ),
    ).toEqual(["characteristic-move", "characteristic-save"]);
    expect(
      projection.profileTypes[0]?.characteristicTypes[0]?.defaultValue,
    ).toBe("");
    expect(
      projection.profileTypes[0]?.characteristicTypes[1]?.defaultValue,
    ).toBeUndefined();
    expect(projection.categoryEntries[0]?.publicationLinks[0]?.targetId).toBe(
      "publication-core",
    );
    expect(projection.forceEntries[0]?.constraints[0]).toMatchObject({
      scope: "force",
      value: 0,
      includeChildForces: true,
    });
    expect(projection.forceEntries[0]?.forceEntries[0]).toMatchObject({
      id: "force-patrol-child",
      name: "Patrol Detachment",
      hidden: true,
    });
    expect(
      projection.forceEntries[0]?.forceEntries[0]?.categoryLinks[0]?.targetId,
    ).toBe("category-unit");

    const entry = projection.selectionEntries[0];
    expect(entry).toMatchObject({
      defaultAmount: "1,1",
      step: "0",
    });
    expect(entry?.selectionEntryGroups[0]?.selectionEntries[0]?.id).toBe(
      "entry-option",
    );
    expect(entry?.infoLinks[0]).toMatchObject({
      targetId: "rule-steady",
      type: "rule",
    });
    expect(entry?.modifiers[0]?.conditions[0]).toMatchObject({
      id: "condition-option",
      childName: "Option",
      comment: "Fixture comment",
    });
    expect(entry?.profiles[0]?.characteristics[0]).toMatchObject({
      name: "Move",
      value: "7",
    });

    const sharedProfile = projection.profiles[0];
    expect(sharedProfile?.modifiers.map((modifier) => modifier.type)).toEqual([
      "append",
      "future-display-kind",
    ]);
    expect(sharedProfile?.modifiers[0]).toMatchObject({
      field: "characteristic-move",
      value: "+1",
      conditions: [
        {
          type: "atLeast",
          field: "selections",
          scope: "parent",
          childId: "entry-alpha",
          value: "1",
        },
      ],
    });
    expect(sharedProfile?.modifiers[0]?.node.attributes["join"]).toBe(" / ");
    expect(sharedProfile?.modifiers[0]?.node.attributes["affects"]).toBe(
      "self.profiles.Unit",
    );
    expect(sharedProfile?.modifiers[1]?.node.attributes["futureBehavior"]).toBe(
      "retained",
    );
    expect(sharedProfile?.modifierGroups[0]).toMatchObject({
      type: "and",
      comment: "Profile characteristic group",
      modifiers: [{ type: "replace", field: "characteristic-save" }],
      conditions: [{ type: "atLeast", scope: "self", value: "1" }],
    });
    expect(
      sharedProfile?.modifierGroups[0]?.modifiers[0]?.node.attributes["arg"],
    ).toBe("4+");
    expect(
      sharedProfile?.modifierGroups[0]?.modifiers[0]?.node.attributes["join"],
    ).toBe("");
    expect(entry?.constraints.map((constraint) => constraint.scope)).toEqual([
      "parent",
      "roster",
      "self",
      "category-unit",
    ]);
    expect(entry?.modifiers.map((modifier) => modifier.type)).toEqual([
      "replace",
      "floor",
      "future-kind",
    ]);
    expect(
      entry?.modifiers[0]?.conditionGroups[0]?.conditionGroups[0]?.type,
    ).toBe("or");
    expect(entry?.modifiers[0]?.repeats[0]).toMatchObject({
      id: "repeat-option",
      scope: "self",
      childName: "Option",
      value: 0,
      repeats: 2,
      roundUp: false,
    });
    expect(entry?.modifierGroups[0]).toMatchObject({
      type: "and",
      comment: "Fixture modifier group",
      modifiers: [{ type: "increment" }],
    });
  });

  it("projects CAT metadata, catalogue links, shared entries, groups, and entry links", () => {
    const result = parseFixture("projection.cat");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.projection.metadata).toMatchObject({
      kind: "catalogue",
      gameSystemId: "system-203",
      gameSystemRevision: 0,
      library: false,
    });
    expect(
      result.value.projection.catalogueLinks.map((link) => link.targetId),
    ).toEqual(["library-first", "library-second"]);
    expect(result.value.projection.catalogueLinks[1]?.type).toBe(
      "future-link-kind",
    );
    expect(
      result.value.projection.sharedSelectionEntries[0]?.entryLinks[0],
    ).toMatchObject({
      id: "entry-link-shared",
      targetId: "entry-alpha",
      defaultAmount: "0",
      step: "250",
      import: false,
    });
    expect(
      result.value.projection.sharedSelectionEntryGroups[0]
        ?.selectionEntries[0]?.id,
    ).toBe("shared-group-entry");
    expect(result.value.projection.profiles[0]).toMatchObject({
      id: "catalogue-profile",
      typeId: "profile-type-unit",
      typeName: "Unit",
    });
    expect(result.value.projection.profiles[0]?.characteristics[0]).toMatchObject({
      typeId: "characteristic-move",
      value: "8",
    });
  });

  it("preserves repeated element order", () => {
    const result = parseFixture("projection.cat");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.value.projection.catalogueLinks.map((link) => link.name),
      ).toEqual(["First Library", "Second Library"]);
    }
  });

  it("distinguishes absent values from explicit false, zero, and empty strings", () => {
    const gameSystem = parseFixture("projection.gst");
    const catalogue = parseFixture("projection.cat");

    expect(gameSystem.ok).toBe(true);
    expect(catalogue.ok).toBe(true);
    if (!gameSystem.ok || !catalogue.ok) {
      return;
    }

    expect(gameSystem.value.projection.metadata.revision).toBe(0);
    expect(gameSystem.value.projection.costTypes[0]).toMatchObject({
      defaultCostLimit: 0,
      hidden: false,
    });
    expect(
      gameSystem.value.projection.selectionEntries[0]?.costs[0]?.value,
    ).toBe(0);
    expect(gameSystem.value.projection.publications[0]?.shortName).toBe("");
    expect(catalogue.value.projection.metadata.library).toBe(false);
    expect(catalogue.value.projection.metadata.authorName).toBeUndefined();
    expect(catalogue.value.projection.metadata.readme).toBeUndefined();
    expect(
      catalogue.value.projection.sharedSelectionEntryGroups[0]?.hidden,
    ).toBeUndefined();
  });

  it("keeps source IDs, target IDs, unknown values, attributes, and elements observable", () => {
    const result = parseFixture("projection.gst");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const entry = result.value.projection.selectionEntries[0];
    expect(entry?.id).toBe("entry-alpha");
    expect(entry?.categoryLinks[0]?.targetId).toBe("category-unit");
    expect(entry?.modifiers[2]).toMatchObject({
      type: "future-kind",
      value: "",
    });
    expect(entry?.modifiers[2]?.node.attributes["future:flag"]).toBe("retained");
    expect(
      result.value.projection.profileTypes[0]?.node.attributes["future:format"],
    ).toBe("retained");
    expect(
      entry?.node.children.some(
        (child) =>
          child.kind === "element" && child.name === "future:extension",
      ),
    ).toBe(true);
  });

  it("produces structured source-located diagnostics for invalid typed values", () => {
    const result = parseFixture("invalid-projection.cat");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.metadata.revision).toBeUndefined();
    expect(
      result.value.projection.sharedSelectionEntries[0]?.hidden,
    ).toBeUndefined();
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "BS_PROJECTION_INVALID_ATTRIBUTE",
      ),
    ).toHaveLength(8);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_PROJECTION_INVALID_ATTRIBUTE",
        location: {
          source: expect.objectContaining({
            filename: "invalid-projection.cat",
          }),
          path: expect.arrayContaining(["@value"]),
        },
        details: expect.objectContaining({
          attribute: "value",
          value: "free",
        }),
      }),
    );
    expect(
      result.value.projection.sharedSelectionEntries[0]?.modifiers[0]?.type,
    ).toBe("mystery");
  });

  it("retains the exact generic nodes used by important projected objects", () => {
    const result = parseFixture("projection.gst");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const entry = result.value.projection.selectionEntries[0];
    expect(entry?.node).toBe(
      findElement(result.value.root, "selectionEntry", "entry-alpha"),
    );
    expect(entry?.source).toBe(result.value.documentSource);
    expect(entry?.path).toEqual([
      "gameSystem",
      "selectionEntries[0]",
      "selectionEntry[0]",
    ]);
  });

  it("retains original source bytes alongside projections", () => {
    const input = fixtureBytes("projection.cat");
    const expected = input.slice();
    const result = parseBattleScribeXml(input, {
      source: provenance("projection.cat"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    input.fill(0);
    expect(result.value.sourceBytes).toEqual(expected);
    expect(result.value.documentBytes).toEqual(expected);
  });

  it("does not resolve catalogue targets or evaluate projected expressions", () => {
    const result = parseFixture("projection.cat");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const missingTarget = result.value.projection.catalogueLinks[0];
    expect(missingTarget?.targetId).toBe("library-first");
    expect(Object.hasOwn(missingTarget ?? {}, "target")).toBe(false);
    expect(
      result.diagnostics.some((diagnostic) =>
        diagnostic.impacts.includes("resolution"),
      ),
    ).toBe(false);
  });
});

function parseFixture(filename: string) {
  return parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-06-15T00:00:00.000Z",
  };
}

function findElement(
  root: OrderedXmlElement,
  name: string,
  id: string,
): OrderedXmlElement | undefined {
  for (const child of root.children) {
    if (child.kind !== "element") {
      continue;
    }
    const localName = child.name.includes(":")
      ? child.name.slice(child.name.indexOf(":") + 1)
      : child.name;
    if (localName === name && child.attributes.id === id) {
      return child;
    }
    const nested = findElement(child, name, id);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}
