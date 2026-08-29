import { describe, expect, it } from "vitest";

import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  ingestBattleScribeFile,
  parseBattleScribeJson,
} from "./ingest.js";
import type {
  OrderedJsonObject,
  OrderedJsonValue,
  OrderedXmlElement,
} from "./types.js";

describe("BattleScribe JSON ingestion", () => {
  it.each([
    [
      "projection-json-game-system.json",
      "gameSystem",
      "json-system",
      "Fictional JSON System",
      4,
    ],
    [
      "projection-json-catalogue.json",
      "catalogue",
      "json-catalogue",
      "Fictional JSON Catalogue",
      2,
    ],
  ] as const)(
    "parses %s and projects root metadata",
    (filename, kind, id, name, revision) => {
      const result = parseBattleScribeJson(fixtureBytes(filename), {
        source: provenance(filename),
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.value).toMatchObject({
        sourceFormat: "json",
        metadata: {
          kind,
          id,
          name,
          revision,
          battleScribeVersion: "2.03",
        },
      });
      expect(result.value.sourceRoot.kind).toBe("object");
      expect(result.value.projection.sourceNode).toBe(
        result.value.root.jsonSource,
      );
    },
  );

  it("keeps an unchanged private copy of JSON source bytes", () => {
    const input = fixtureBytes("projection-json-catalogue.json");
    const expected = input.slice();
    const result = parseBattleScribeJson(input, {
      source: provenance("projection-json-catalogue.json"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    input.fill(0);
    expect(result.value.sourceBytes).toEqual(expected);
    expect(result.value.documentBytes).toEqual(expected);
  });

  it("projects collections in order while retaining false, zero, and IDs", () => {
    const result = parseCatalogue();

    expect(result.projection.catalogueLinks.map(({ name }) => name)).toEqual([
      "First Library",
      "Second Library",
    ]);
    expect(result.projection.catalogueLinks[0]).toMatchObject({
      id: "json-first-link",
      targetId: "json-first-library",
      importRootEntries: false,
    });
    expect(result.projection.selectionEntries.map(({ name }) => name)).toEqual([
      "Pathfinders",
      "Rangers",
    ]);
    expect(result.projection.selectionEntries[0]).toMatchObject({
      id: "json-pathfinders",
      hidden: false,
      collective: false,
      costs: [{ value: 0 }],
      constraints: [
        {
          value: 0,
          shared: false,
          includeChildSelections: false,
          includeChildForces: false,
        },
      ],
      modifiers: [
        {
          type: "future-modifier-kind",
          value: "0",
          conditions: [{ value: "0", shared: false }],
        },
      ],
    });
    expect(result.projection.catalogueLinks[1]?.type).toBe(
      "future-link-kind",
    );
    expect(result.projection.infoGroups[0]).toMatchObject({
      id: "json-pathfinder-abilities",
      name: "Pathfinder Abilities",
      hidden: false,
      profiles: [{ id: "json-forward-survey", name: "Forward Survey" }],
      infoLinks: [
        {
          id: "json-group-rule-link",
          targetId: "json-group-rule",
          type: "rule",
        },
      ],
      infoGroups: [
        {
          id: "json-survey-methods",
          name: "Survey Methods",
          rules: [{ id: "json-route-marker", name: "Route Marker" }],
        },
      ],
      modifiers: [{ type: "set", value: "false", field: "hidden" }],
    });
    expect(
      result.projection.selectionEntries[0]?.infoLinks[0],
    ).toMatchObject({
      id: "json-pathfinder-abilities-link",
      targetId: "json-pathfinder-abilities",
      type: "infoGroup",
      hidden: false,
    });
    expect(result.projection.rules.map(({ id }) => id)).toEqual([
      "json-group-rule",
      "json-root-rule",
    ]);
    expect(result.projection.rules[1]).toMatchObject({
      name: "Field Doctrine",
      description: "Keep the patrol in a mutually supporting formation.",
    });
  });

  it("projects local condition-group extensions without flattening them", () => {
    const result = parseCatalogue();
    const group =
      result.projection.selectionEntries[0]?.modifiers[0]
        ?.conditionGroups[0];
    const localGroup = group?.localConditionGroups[0];

    expect(group).toMatchObject({
      type: "and",
      conditions: [],
      conditionGroups: [],
      localConditionGroups: [
        {
          type: "atLeast",
          value: "1",
          field: "selections",
          scope: "parent",
          repeats: 1,
          includeChildSelections: true,
          includeChildForces: true,
          conditions: [
            { type: "before", childId: "any" },
            {
              type: "instanceOf",
              childId: "json-pathfinders",
              childName: "Pathfinders",
            },
          ],
        },
      ],
    });
    expect(localGroup?.node.name).toBe("localConditionGroup");
    expect(localGroup?.sourceNode.kind).toBe("object");
    expect(localGroup?.node.jsonSource).toBe(localGroup?.sourceNode);
  });

  it("projects element text and keeps the corresponding JSON objects accessible", () => {
    const result = parseCatalogue();
    const surveyor = result.projection.sharedSelectionEntries[0];
    const profile = surveyor?.profiles[0];

    expect(profile?.characteristics.map(({ value }) => value)).toEqual([
      "7",
      "",
    ]);
    expect(profile?.modifiers.map(({ type }) => type)).toEqual([
      "append",
      "future-display-kind",
    ]);
    expect(profile?.modifiers[0]).toMatchObject({
      field: "json-resolve",
      value: "Steady",
    });
    expect(profile?.modifiers[0]?.node.attributes["join"]).toBe(", ");
    expect(profile?.modifiers[0]?.node.attributes["affects"]).toBe(
      "self.profiles.Scout",
    );
    expect(profile?.modifiers[1]?.value).toBe("0");
    expect(profile?.modifiers[1]?.node.attributes["futureBehavior"]).toBe(
      "retained",
    );
    expect(profile?.modifierGroups[0]).toMatchObject({
      type: "and",
      comment: "JSON profile characteristic group",
      modifiers: [{ type: "replace", field: "json-resolve" }],
      conditions: [{ type: "atLeast", scope: "self", value: "1" }],
    });
    expect(
      profile?.modifierGroups[0]?.modifiers[0]?.node.attributes["arg"],
    ).toBe("old");
    expect(
      profile?.modifierGroups[0]?.modifiers[0]?.node.attributes["join"],
    ).toBe("");
    expect(surveyor?.rules[0]?.description).toBe(
      "Can chart an unexplored route.",
    );
    expect(profile?.sourceNode.kind).toBe("object");
    expect(profile?.node.jsonSource).toBe(profile?.sourceNode);
  });

  it("preserves unknown properties and arrays in the ordered JSON tree", () => {
    const result = parseCatalogue();
    const sourceRoot = asObject(result.sourceRoot);
    const catalogue = asObject(property(sourceRoot, "catalogue"));
    const futureCollection = property(catalogue, "futureCollection");

    expect(property(catalogue, "futureRootFlag")).toMatchObject({
      kind: "string",
      value: "retained",
    });
    expect(futureCollection.kind).toBe("array");
    if (futureCollection.kind !== "array") {
      return;
    }
    expect(
      futureCollection.items.map((item) =>
        property(asObject(item), "name"),
      ),
    ).toMatchObject([
      { kind: "string", value: "Unknown One" },
      { kind: "string", value: "Unknown Two" },
    ]);
    expect(property(asObject(item(futureCollection, 1)), "futureValue")).toEqual(
      expect.objectContaining({ kind: "boolean", value: false }),
    );
  });

  it("source-locates invalid typed JSON values", () => {
    const result = parseBattleScribeJson(
      fixtureBytes("invalid-projection-json-catalogue.json"),
      {
        source: provenance("invalid-projection-json-catalogue.json"),
      },
    );

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BS_PROJECTION_INVALID_ATTRIBUTE",
          location: expect.objectContaining({
            source: expect.objectContaining({
              filename: "invalid-projection-json-catalogue.json",
            }),
            start: expect.objectContaining({
              offset: expect.any(Number),
              line: expect.any(Number),
              column: expect.any(Number),
            }),
            path: ["catalogue", "@revision"],
          }),
        }),
        expect.objectContaining({
          code: "BS_PROJECTION_INVALID_ATTRIBUTE",
          location: expect.objectContaining({
            path: [
              "catalogue",
              "costTypes[0]",
              "costType[0]",
              "@defaultCostLimit",
            ],
            start: expect.any(Object),
          }),
        }),
      ]),
    );
  });

  it("treats an empty cost-type default limit as absent without losing source text", () => {
    const result = parseBattleScribeJson(
      new TextEncoder().encode(
        JSON.stringify({
          gameSystem: {
            id: "empty-limit-system",
            name: "Empty Limit System",
            revision: 1,
            battleScribeVersion: "2.03",
            costTypes: [
              {
                id: "cost-optional",
                name: "Optional Cost",
                defaultCostLimit: "",
              },
            ],
          },
        }),
      ),
      { source: provenance("empty-cost-limit.json") },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagnostics).toEqual([]);
    const costType = result.value.projection.costTypes[0];
    expect(costType).toBeDefined();
    expect(Object.hasOwn(costType ?? {}, "defaultCostLimit")).toBe(false);
    expect(costType?.node.attributes.defaultCostLimit).toBe("");
  });

  it("returns a structured diagnostic for invalid JSON", () => {
    const result = parseBattleScribeJson(
      new TextEncoder().encode(
        '{"catalogue":{"id":"broken","name":"Broken",}}',
      ),
      { source: provenance("broken.json") },
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "BS_JSON_INVALID",
      location: {
        source: { filename: "broken.json" },
        start: {
          offset: expect.any(Number),
          line: 1,
          column: expect.any(Number),
        },
      },
    });
  });

  it("enforces JSON depth and node-count limits", () => {
    const depth = parseBattleScribeJson(
      new TextEncoder().encode(
        '{"catalogue":{"id":"depth","name":"Depth","future":{"nested":true}}}',
      ),
      {
        source: provenance("depth.json"),
        limits: { maxJsonDepth: 3 },
      },
    );
    const nodes = parseBattleScribeJson(
      new TextEncoder().encode(
        '{"catalogue":{"id":"nodes","name":"Nodes"}}',
      ),
      {
        source: provenance("nodes.json"),
        limits: { maxJsonNodes: 2 },
      },
    );

    expect(depth.ok).toBe(false);
    expect(depth.diagnostics[0]).toMatchObject({
      code: "BS_JSON_STRUCTURE_LIMIT",
      details: { limit: "maxJsonDepth", configuredLimit: 3 },
    });
    expect(nodes.ok).toBe(false);
    expect(nodes.diagnostics[0]).toMatchObject({
      code: "BS_JSON_STRUCTURE_LIMIT",
      details: { limit: "maxJsonNodes", configuredLimit: 2 },
    });
  });

  it("accepts JSON through the public file-ingestion entry point", async () => {
    const result = await ingestBattleScribeFile(
      fixtureBytes("projection-json-catalogue.json"),
      { source: provenance("projection-json-catalogue.json") },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceFormat).toBe("json");
      expect(result.value.metadata.kind).toBe("catalogue");
    }
  });
});

function parseCatalogue() {
  const result = parseBattleScribeJson(
    fixtureBytes("projection-json-catalogue.json"),
    { source: provenance("projection-json-catalogue.json") },
  );
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Expected the synthetic JSON catalogue to parse.");
  }
  return result.value;
}

function property(
  object: OrderedJsonObject,
  name: string,
): OrderedJsonValue {
  const value = object.entries.find((entry) => entry.name === name)?.value;
  if (value === undefined) {
    throw new Error(`Missing JSON property ${name}.`);
  }
  return value;
}

function asObject(
  value: OrderedJsonValue | OrderedXmlElement,
): OrderedJsonObject {
  if (value.kind !== "object") {
    throw new Error("Expected an ordered JSON object.");
  }
  return value;
}

function item(
  array: Extract<OrderedJsonValue, { readonly kind: "array" }>,
  index: number,
): OrderedJsonValue {
  const value = array.items[index];
  if (value === undefined) {
    throw new Error(`Missing JSON array item ${index}.`);
  }
  return value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-23T00:00:00.000Z",
  };
}
