import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseBattleScribeJson,
  parseBattleScribeXml,
} from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import {
  materializeBattleScribeSelections,
  type BattleScribeSelectionMaterialization,
  type MaterializedBattleScribeDocument,
} from "./materialize.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe shared selection materialization", () => {
  it("materializes entry links as provenance-preserving effective views", () => {
    const materialization = materializedFixture();
    const document = onlyDocument(materialization.value);
    const source = document.document.projection.entryLinks[0];
    const definition = document.document.projection.sharedSelectionEntries[0];
    const entry = document.entryLinks[0];

    expect(entry?.kind).toBe("selectionEntry");
    if (entry?.kind !== "selectionEntry") {
      return;
    }

    expect(entry.id).toBe("root-entry-link");
    expect(entry.definitionId).toBe("shared-base");
    expect(entry.name).toBe("Local Name");
    expect(entry.type).toBe("unit");
    expect(entry.hidden).toBe(false);
    expect(entry.collective).toBe(false);
    expect(entry.import).toBe(false);
    expect(entry.defaultAmount).toBe("3");
    expect(entry.step).toBe("1");
    expect(entry.link).toBe(source);
    expect(entry.occurrence).toBe(source);
    expect(entry.definition).toBe(definition);
    expect(entry.definition.node).toBe(definition?.node);
    expect(entry.sourceDocument.sourceBytes).toBe(
      document.document.sourceBytes,
    );
  });

  it("appends local overlay collections after definition collections while preserving each order", () => {
    const materialization = materializedFixture();
    const document = onlyDocument(materialization.value);
    const entry = document.entryLinks[0];

    expect(entry?.kind).toBe("selectionEntry");
    if (entry?.kind !== "selectionEntry") {
      return;
    }

    expect(entry.selectionEntries.map((child) => child.id)).toEqual([
      "definition-child",
      "overlay-child",
    ]);
    expect(entry.categoryLinks.map((link) => link.id)).toEqual([
      "definition-category",
      "overlay-category",
    ]);
    expect(entry.costs.map((cost) => cost.value)).toEqual([10, 5]);

    const nestedLink = entry.entryLinks[0];
    expect(nestedLink?.kind).toBe("selectionEntry");
    if (nestedLink?.kind === "selectionEntry") {
      expect(nestedLink.id).toBe("nested-leaf-link");
      expect(nestedLink.definitionId).toBe("shared-leaf");
      expect(nestedLink.name).toBe("Nested Leaf");
    }
  });

  it("materializes rule and profile info links in definition-first order", () => {
    const materialization = materializedFixture();
    const entry = onlyDocument(materialization.value).entryLinks[0];

    expect(entry?.kind).toBe("selectionEntry");
    if (entry?.kind !== "selectionEntry") {
      return;
    }

    expect(entry.materializedInfoLinks.map((info) => info.kind)).toEqual([
      "ruleInfoLink",
      "profileInfoLink",
      "unresolvedInfoLink",
      "unresolvedInfoLink",
      "unresolvedInfoLink",
      "unresolvedInfoLink",
    ]);
    const rule = entry.materializedInfoLinks[0];
    expect(rule?.kind).toBe("ruleInfoLink");
    if (rule?.kind === "ruleInfoLink") {
      expect(rule.id).toBe("definition-rule-info");
      expect(rule.definitionId).toBe("shared-rule");
      expect(rule.name).toBe("Local Rule Name");
      expect(rule.hidden).toBe(false);
      expect(rule.description).toBe("Definition rule text.");
      expect(rule.link).toBe(entry.definition.infoLinks[0]);
      expect(rule.definition.node).toBe(
        rule.definitionDocument.projection.rules[0]?.node,
      );
    }

    const profile = entry.materializedInfoLinks[1];
    expect(profile?.kind).toBe("profileInfoLink");
    if (profile?.kind === "profileInfoLink") {
      expect(profile.id).toBe("overlay-profile-info");
      expect(profile.definitionId).toBe("shared-profile");
      expect(profile.name).toBe("");
      expect(profile.hidden).toBe(false);
      expect(profile.typeId).toBe("profile-type-unit");
      expect(profile.characteristics[0]?.value).toBe("6");
      expect(profile.modifiers).toBe(profile.definition.modifiers);
      expect(profile.modifiers[0]).toMatchObject({
        type: "append",
        field: "characteristic-move",
        value: "+1",
      });
      expect(profile.modifierGroups).toBe(profile.definition.modifierGroups);
      expect(profile.modifierGroups[0]).toMatchObject({
        type: "and",
        modifiers: [{ type: "replace", field: "characteristic-move" }],
      });
    }
  });

  it("keeps unresolved info links observable and source-located", () => {
    const materialization = materializedFixture();
    const entry = onlyDocument(materialization.value).entryLinks[0];

    expect(entry?.kind).toBe("selectionEntry");
    if (entry?.kind !== "selectionEntry") {
      return;
    }
    expect(entry.materializedInfoLinks.slice(2).map((info) =>
      info.kind === "unresolvedInfoLink" ? info.reason : undefined,
    )).toEqual([
      "missingTarget",
      "missingTargetId",
      "ambiguousTarget",
      "targetKindMismatch",
    ]);
    expect(materialization.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_MATERIALIZATION_AMBIGUOUS_TARGET",
        details: expect.objectContaining({
          linkKind: "infoLink",
          targetId: "duplicate-info-target",
        }),
        location: expect.objectContaining({
          path: expect.arrayContaining(["@targetId"]),
        }),
      }),
    );
  });

  it("materializes selection-entry groups without losing target-only fields", () => {
    const materialization = materializedFixture();
    const group = onlyDocument(materialization.value).entryLinks[1];

    expect(group?.kind).toBe("selectionEntryGroup");
    if (group?.kind !== "selectionEntryGroup") {
      return;
    }

    expect(group.id).toBe("root-group-link");
    expect(group.definitionId).toBe("shared-group");
    expect(group.name).toBe("Local Group");
    expect(group.hidden).toBe(false);
    expect(group.collective).toBe(false);
    expect(group.import).toBe(false);
    expect(group.defaultAmount).toBe("1,1");
    expect(group.step).toBe("0");
    expect(group.defaultSelectionEntryId).toBe("group-child");
    expect(group.selectionEntries.map((child) => child.id)).toEqual([
      "group-child",
      "group-overlay-child",
    ]);
  });

  it("keeps source and definition documents distinct for cross-document links", () => {
    const library = parseFixture("materialization.cat");
    const client = parseFixture("materialization-client.cat");
    expect(library.ok).toBe(true);
    expect(client.ok).toBe(true);
    if (!library.ok || !client.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([library.value, client.value]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const materialization = materializeBattleScribeSelections(graph.value);
    expect(materialization.ok).toBe(true);
    if (!materialization.ok) {
      return;
    }
    const clientView = materialization.value.documents.find(
      (view) => view.document === client.value,
    );
    const entry = clientView?.entryLinks[0];

    expect(entry?.kind).toBe("selectionEntry");
    if (entry?.kind !== "selectionEntry") {
      return;
    }
    expect(entry.sourceDocument).toBe(client.value);
    expect(entry.definitionDocument).toBe(library.value);
    expect(entry.link).toBe(client.value.projection.entryLinks[0]);
    expect(entry.definition).toBe(
      library.value.projection.sharedSelectionEntries[0],
    );
    expect(entry.name).toBe("Cross-Document Name");
    expect(entry.hidden).toBe(false);
    expect(entry.collective).toBe(true);
    const profile = entry.materializedInfoLinks[1];
    expect(profile?.kind).toBe("profileInfoLink");
    if (profile?.kind === "profileInfoLink") {
      expect(profile.sourceDocument).toBe(client.value);
      expect(profile.definitionDocument).toBe(library.value);
      expect(profile.name).toBe("Client Profile");
    }
  });

  it("keeps missing, ambiguous, and incompatible links observable with diagnostics", () => {
    const materialization = materializedFixture();
    const links = onlyDocument(materialization.value).entryLinks;

    expect(links[3]).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "missingTarget",
      }),
    );
    expect(links[4]).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "missingTargetId",
      }),
    );
    expect(links[5]).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "ambiguousTarget",
        candidates: expect.arrayContaining([
          expect.objectContaining({ id: "duplicate-target" }),
        ]),
      }),
    );
    expect(links[6]).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "targetKindMismatch",
      }),
    );

    expect(materialization.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BS_MATERIALIZATION_MISSING_TARGET",
          location: expect.objectContaining({
            path: expect.arrayContaining(["@targetId"]),
          }),
        }),
        expect.objectContaining({
          code: "BS_MATERIALIZATION_AMBIGUOUS_TARGET",
        }),
        expect.objectContaining({
          code: "BS_MATERIALIZATION_TARGET_KIND_MISMATCH",
        }),
      ]),
    );
  });

  it("terminates entry-link cycles and reports the source-located chain", () => {
    const materialization = materializedFixture();
    const cycleRoot = onlyDocument(materialization.value).entryLinks[2];

    expect(cycleRoot?.kind).toBe("selectionEntry");
    if (cycleRoot?.kind !== "selectionEntry") {
      return;
    }
    const cycleB = cycleRoot.entryLinks[0];
    expect(cycleB?.kind).toBe("selectionEntry");
    if (cycleB?.kind !== "selectionEntry") {
      return;
    }
    expect(cycleB.entryLinks[0]).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "cycle",
      }),
    );
    expect(materialization.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_MATERIALIZATION_ENTRY_LINK_CYCLE",
        severity: "warning",
        impacts: ["resolution"],
        details: expect.objectContaining({
          targetId: "cycle-a",
          cycle: expect.any(Array),
        }),
      }),
    );
  });

  it("returns a diagnosed partial view when entry-link expansion limits are reached", () => {
    const parsed = parseFixture("materialization.cat");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([parsed.value]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const materialization = materializeBattleScribeSelections(graph.value, {
      limits: {
        maxEntryLinkDepth: 1,
        maxExpandedEntryLinks: 50_000,
      },
    });

    expect(materialization.ok).toBe(true);
    if (!materialization.ok) {
      return;
    }
    expect(materialization.value.truncated).toBe(true);
    expect(materialization.value.expandedEntryLinks).toBeGreaterThan(0);
    const root = onlyDocument(materialization.value).entryLinks[0];
    expect(root?.kind).toBe("selectionEntry");
    if (root?.kind !== "selectionEntry") {
      return;
    }
    expect(root.entryLinks[0]).toEqual(
      expect.objectContaining({
        kind: "unresolvedEntryLink",
        reason: "resourceLimit",
      }),
    );
    expect(materialization.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_MATERIALIZATION_RESOURCE_LIMIT",
        impacts: ["resolution", "security"],
        details: expect.objectContaining({
          limit: "maxEntryLinkDepth",
          configuredLimit: 1,
        }),
      }),
    );

    const countLimited = materializeBattleScribeSelections(graph.value, {
      limits: {
        maxEntryLinkDepth: 64,
        maxExpandedEntryLinks: 1,
      },
    });
    expect(countLimited.ok).toBe(true);
    if (countLimited.ok) {
      expect(countLimited.value.expandedEntryLinks).toBe(1);
      expect(countLimited.value.truncated).toBe(true);
    }
  });

  it("leaves parsed projections and graph reference records unchanged", () => {
    const parsed = parseFixture("materialization.cat");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([parsed.value]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const projection = parsed.value.projection;
    const rootLink = projection.entryLinks[0];
    const referencesBefore = graph.value.references;

    const materialization = materializeBattleScribeSelections(graph.value);

    expect(materialization.ok).toBe(true);
    expect(graph.value.references).toBe(referencesBefore);
    expect(projection.entryLinks[0]).toBe(rootLink);
    expect(Object.hasOwn(rootLink ?? {}, "definition")).toBe(false);
    expect(Object.hasOwn(rootLink ?? {}, "target")).toBe(false);
  });

  it("materializes typed info-group links and their nested rule links", () => {
    const parsed = parseBattleScribeJson(
      fixtureBytes("projection-json-catalogue.json"),
      { source: provenance("projection-json-catalogue.json") },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([parsed.value]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }
    const groupReference = graph.value.references.find(
      ({ kind, targetId }) =>
        kind === "infoLink" && targetId === "json-pathfinder-abilities",
    );
    expect(groupReference?.targets.map(({ kind }) => kind)).toEqual([
      "infoGroup",
    ]);
    expect(groupReference?.unprojectedTargets).toEqual([]);

    const materialization = materializeBattleScribeSelections(graph.value);
    expect(materialization.ok).toBe(true);
    if (!materialization.ok) {
      return;
    }
    const entry = onlyDocument(materialization.value).selectionEntries[0];
    const infoGroup = entry?.materializedInfoLinks[0];
    expect(infoGroup?.kind).toBe("infoGroup");
    if (infoGroup?.kind !== "infoGroup") {
      return;
    }
    expect(infoGroup).toMatchObject({
      id: "json-pathfinder-abilities-link",
      definitionId: "json-pathfinder-abilities",
      name: "Pathfinder Abilities",
      hidden: false,
      profiles: [{ id: "json-forward-survey", name: "Forward Survey" }],
    });
    expect(infoGroup.definition).toBe(parsed.value.projection.infoGroups[0]);
    expect(infoGroup.definitionDocument).toBe(parsed.value);
    expect(infoGroup.materializedInfoLinks).toMatchObject([
      {
        kind: "ruleInfoLink",
        definitionId: "json-group-rule",
        name: "Trail Reader",
      },
    ]);
    expect(infoGroup.materializedInfoGroups).toMatchObject([
      {
        kind: "infoGroup",
        definitionId: "json-survey-methods",
        name: "Survey Methods",
        rules: [{ id: "json-route-marker", name: "Route Marker" }],
      },
    ]);
    expect(
      materialization.diagnostics.some(
        ({ code }) => code === "BS_MATERIALIZATION_MISSING_TARGET",
      ),
    ).toBe(false);
  });

  it("terminates recursive info-group links with a source-located diagnostic", () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        catalogue: {
          selectionEntries: [
            {
              id: "cycle-entry",
              name: "Cycle Entry",
              type: "unit",
              infoLinks: [
                {
                  id: "cycle-entry-link",
                  targetId: "cycle-group-a",
                  type: "infoGroup",
                },
              ],
            },
          ],
          sharedInfoGroups: [
            {
              id: "cycle-group-a",
              name: "Group A",
              infoLinks: [
                {
                  id: "cycle-a-to-b",
                  targetId: "cycle-group-b",
                  type: "infoGroup",
                },
              ],
            },
            {
              id: "cycle-group-b",
              name: "Group B",
              infoLinks: [
                {
                  id: "cycle-b-to-a",
                  targetId: "cycle-group-a",
                  type: "infoGroup",
                },
              ],
            },
          ],
          id: "cycle-catalogue",
          name: "Cycle Catalogue",
          gameSystemId: "cycle-system",
          revision: 1,
          battleScribeVersion: 2.03,
          library: false,
        },
      }),
    );
    const parsed = parseBattleScribeJson(bytes, {
      source: provenance("info-group-cycle.json"),
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([parsed.value]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const materialization = materializeBattleScribeSelections(graph.value);
    expect(materialization.ok).toBe(true);
    if (!materialization.ok) {
      return;
    }
    const groupA =
      onlyDocument(materialization.value).selectionEntries[0]
        ?.materializedInfoLinks[0];
    expect(groupA?.kind).toBe("infoGroup");
    if (groupA?.kind !== "infoGroup") {
      return;
    }
    const groupB = groupA.materializedInfoLinks[0];
    expect(groupB?.kind).toBe("infoGroup");
    if (groupB?.kind !== "infoGroup") {
      return;
    }
    expect(groupB.materializedInfoLinks).toMatchObject([
      {
        kind: "unresolvedInfoLink",
        reason: "cycle",
        link: { id: "cycle-b-to-a", targetId: "cycle-group-a" },
      },
    ]);
    expect(materialization.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "BS_MATERIALIZATION_INFO_LINK_CYCLE",
        location: expect.objectContaining({
          path: [
            "catalogue",
            "sharedInfoGroups[0]",
            "infoGroup[1]",
            "infoLinks[0]",
            "infoLink[0]",
            "@targetId",
          ],
        }),
      }),
    );
  });
});

function materializedFixture() {
  const parsed = parseFixture("materialization.cat");
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error("Materialization fixture must parse.");
  }
  const graph = resolveBattleScribeDataGraph([parsed.value]);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Materialization fixture graph must resolve.");
  }
  const materialization = materializeBattleScribeSelections(graph.value);
  expect(materialization.ok).toBe(true);
  if (!materialization.ok) {
    throw new Error("Materialization must return a read-only view.");
  }
  return materialization;
}

function onlyDocument(
  materialization: BattleScribeSelectionMaterialization,
): MaterializedBattleScribeDocument {
  const document = materialization.documents[0];
  if (document === undefined) {
    throw new Error("Materialization fixture must contain one document.");
  }
  return document;
}

function parseFixture(filename: string) {
  return parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
}

function fixtureBytes(filename: string): Uint8Array {
  return readFileSync(
    new URL(`../../test-fixtures/fixtures/${filename}`, import.meta.url),
  );
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-07-20T00:00:00.000Z",
  };
}
