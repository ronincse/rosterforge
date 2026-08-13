import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import { inspectBattleScribeProfileTypeContainment } from "./profiles.js";
import type { BattleScribeProfileTypeContainment } from "./profiles.js";
import { resolveBattleScribeDataGraph } from "./resolve.js";

describe("BattleScribe profile-type containment inspection", () => {
  it("reports contained, mismatched, and unresolved characteristic types", () => {
    const { result, catalogue } = inspectedProfiles();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const contained = reportForId(result.value.profiles, "catalogue-profile");
    expect(contained.type.status).toBe("resolved");
    expect(contained.characteristics[0]).toMatchObject({
      containment: "contained",
      type: { status: "resolved", targetId: "characteristic-move" },
    });

    const mismatch = reportForId(
      result.value.profiles,
      "containment-mismatch-profile",
    );
    expect(mismatch.sourceDocument).toBe(catalogue);
    expect(mismatch.characteristics.map((item) => item.containment)).toEqual([
      "outsideProfileType",
      "unresolved",
    ]);
    expect(mismatch.characteristics[1]?.type.status).toBe("missingTargetId");
  });

  it("emits a source-located compatibility diagnostic only for definite mismatches", () => {
    const { result } = inspectedProfiles();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "BS_PROFILE_CHARACTERISTIC_TYPE_MISMATCH",
        severity: "warning",
        impacts: ["compatibility", "resolution"],
        location: expect.objectContaining({
          path: expect.arrayContaining(["characteristic[0]", "@typeId"]),
        }),
        details: {
          profileId: "containment-mismatch-profile",
          profileTypeId: "profile-type-unit",
          characteristicTypeId: "characteristic-description",
        },
      }),
    ]);
  });

  it("keeps missing graph references structurally unresolved", () => {
    const { result } = inspectedProfiles();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const missing = reportForId(result.value.profiles, "missing-type-profile");
    expect(missing.type.status).toBe("missing");
    expect(missing.characteristics[0]).toMatchObject({
      containment: "unresolved",
      type: { status: "missing" },
    });
  });

  it("keeps duplicate type targets ambiguous instead of checking containment", () => {
    const firstGameSystem = parseFixture("projection.gst");
    const secondGameSystem = parseFixture("projection.gst");
    const catalogue = parseFixture("projection.cat");
    expect(firstGameSystem.ok).toBe(true);
    expect(secondGameSystem.ok).toBe(true);
    expect(catalogue.ok).toBe(true);
    if (!firstGameSystem.ok || !secondGameSystem.ok || !catalogue.ok) {
      return;
    }
    const graph = resolveBattleScribeDataGraph([
      firstGameSystem.value,
      secondGameSystem.value,
      catalogue.value,
    ]);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      return;
    }

    const result = inspectBattleScribeProfileTypeContainment(graph.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const profile = reportForId(result.value.profiles, "catalogue-profile");
    expect(profile.type).toMatchObject({ status: "ambiguous" });
    expect(profile.type.targets).toHaveLength(2);
    expect(profile.characteristics[0]).toMatchObject({
      containment: "unresolved",
      type: { status: "ambiguous" },
    });
    expect(result.diagnostics).toEqual([]);
  });

  it("includes inline profiles and retains projection and source-byte identity", () => {
    const { result, gameSystem } = inspectedProfiles();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const inline = reportForId(result.value.profiles, "profile-inline");
    expect(inline.source).toBe(
      gameSystem.projection.selectionEntries[0]?.profiles[0],
    );
    expect(inline.source.node).toBe(
      gameSystem.projection.selectionEntries[0]?.profiles[0]?.node,
    );
    expect(inline.sourceDocument).toBe(gameSystem);
    expect(inline.sourceDocument.sourceBytes).toBe(gameSystem.sourceBytes);
    expect(result.value.byProfile.get(inline.source)).toBe(inline);
    expect(Object.hasOwn(inline, "validity")).toBe(false);
  });
});

function inspectedProfiles() {
  const gameSystem = parseFixture("projection.gst");
  const catalogue = parseFixture("projection.cat");
  expect(gameSystem.ok).toBe(true);
  expect(catalogue.ok).toBe(true);
  if (!gameSystem.ok || !catalogue.ok) {
    throw new Error("Profile fixtures must parse.");
  }
  const graph = resolveBattleScribeDataGraph([
    gameSystem.value,
    catalogue.value,
  ]);
  expect(graph.ok).toBe(true);
  if (!graph.ok) {
    throw new Error("Profile fixture graph must resolve.");
  }
  return {
    result: inspectBattleScribeProfileTypeContainment(graph.value),
    gameSystem: gameSystem.value,
    catalogue: catalogue.value,
  };
}

function reportForId(
  profiles: readonly BattleScribeProfileTypeContainment[],
  id: string,
) {
  const profile = Array.from(profiles).find((item) => item.source.id === id);
  if (profile === undefined) {
    throw new Error(`Missing profile containment report ${id}.`);
  }
  return profile;
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
