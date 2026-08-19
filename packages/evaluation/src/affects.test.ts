import { describe, expect, it } from "vitest";

import { parseBattleScribeAffectsSelector } from "./affects.js";

describe("battleScribe affects selector", () => {
  it("parses the owner's own profiles", () => {
    expect(parseBattleScribeAffectsSelector("profiles.Unit")).toMatchObject({
      supported: true,
      traversal: "own",
      explicitSelf: false,
      entersGroups: false,
      profileTypeName: "Unit",
      issues: [],
    });
  });

  it("separates direct children from all descendants", () => {
    expect(
      parseBattleScribeAffectsSelector("self.entries.profiles.Unit"),
    ).toMatchObject({
      supported: true,
      traversal: "children",
      explicitSelf: true,
      profileTypeName: "Unit",
    });
    expect(
      parseBattleScribeAffectsSelector(
        "self.entries.recursive.profiles.Melee Weapons",
      ),
    ).toMatchObject({
      supported: true,
      traversal: "descendants",
      profileTypeName: "Melee Weapons",
    });
  });

  it("treats group as a traversal segment in every observed position", () => {
    // All four occur in live BSData; none appear in the pinned snapshot.
    expect(
      parseBattleScribeAffectsSelector("group.profiles.Unit"),
    ).toMatchObject({
      supported: true,
      traversal: "children",
      entersGroups: true,
      profileTypeName: "Unit",
    });
    expect(
      parseBattleScribeAffectsSelector(
        "self.entries.group.recursive.profiles.Melee Weapons",
      ),
    ).toMatchObject({
      supported: true,
      traversal: "descendants",
      entersGroups: true,
      profileTypeName: "Melee Weapons",
    });
    expect(
      parseBattleScribeAffectsSelector("group.recursive.group.profiles.Unit"),
    ).toMatchObject({
      supported: true,
      traversal: "descendants",
      entersGroups: true,
      profileTypeName: "Unit",
    });
    expect(
      parseBattleScribeAffectsSelector(
        "self.entries.group.recursive.group.profiles.Ranged Weapons",
      ),
    ).toMatchObject({
      supported: true,
      traversal: "descendants",
      entersGroups: true,
      profileTypeName: "Ranged Weapons",
    });
  });

  it("distinguishes a direct-entry traversal from one entering groups", () => {
    // Verified in New Recruit: entries alone does not reach group members.
    expect(
      parseBattleScribeAffectsSelector("self.entries.profiles.Unit"),
    ).toMatchObject({ traversal: "children", entersGroups: false });
    expect(
      parseBattleScribeAffectsSelector("self.entries.group.profiles.Unit"),
    ).toMatchObject({ traversal: "children", entersGroups: true });
  });

  it("keeps a bare group selector unsupported for lack of a profile target", () => {
    expect(parseBattleScribeAffectsSelector("group")).toMatchObject({
      supported: false,
      traversal: "children",
      entersGroups: true,
      issues: ["noProfileSelector"],
    });
    expect(
      parseBattleScribeAffectsSelector("group.a98a-4cc0-5f02-e078"),
    ).toMatchObject({
      supported: false,
      entersGroups: true,
      filterId: "a98a-4cc0-5f02-e078",
      issues: ["noProfileSelector"],
    });
  });

  it("records a single filter ID without resolving its kind", () => {
    const parsed = parseBattleScribeAffectsSelector(
      "self.entries.recursive.84c4-6d1e-e724-bd6e.profiles.Melee Weapons",
    );

    expect(parsed).toMatchObject({
      supported: true,
      traversal: "descendants",
      filterId: "84c4-6d1e-e724-bd6e",
      profileTypeName: "Melee Weapons",
      issues: [],
    });
  });

  it("keeps a leading filter ID without an entries traversal", () => {
    expect(
      parseBattleScribeAffectsSelector("e993-e086-6de1-12af.profiles.Unit"),
    ).toMatchObject({
      supported: true,
      traversal: "own",
      explicitSelf: false,
      filterId: "e993-e086-6de1-12af",
      profileTypeName: "Unit",
    });
  });

  it("retains profile-type names containing spaces and punctuation", () => {
    expect(
      parseBattleScribeAffectsSelector("profiles.Try Dat Button! - D6"),
    ).toMatchObject({
      supported: true,
      profileTypeName: "Try Dat Button! - D6",
    });
  });

  it("does not support force traversal", () => {
    const parsed = parseBattleScribeAffectsSelector(
      "self.entries.forces.recursive.dbd4-63-af05-998.profiles.Unit",
    );

    expect(parsed).toMatchObject({
      supported: false,
      traversal: "descendants",
      filterId: "dbd4-63-af05-998",
      profileTypeName: "Unit",
      issues: ["forceTraversal"],
    });
  });

  it("does not support a path that stops at an entry", () => {
    for (const value of [
      "self.entries.recursive",
      "self.entries.recursive.4986-bf86-beb4-13ac",
      "4986-bf86-beb4-13ac",
      "self.entries",
    ]) {
      expect(parseBattleScribeAffectsSelector(value)).toMatchObject({
        supported: false,
        issues: ["noProfileSelector"],
      });
    }
  });

  it("reports an empty or incomplete selector", () => {
    expect(parseBattleScribeAffectsSelector("")).toMatchObject({
      supported: false,
      issues: ["empty"],
    });
    expect(
      parseBattleScribeAffectsSelector("self.entries.profiles"),
    ).toMatchObject({
      supported: false,
      issues: ["missingProfileTypeName"],
    });
  });

  it("retains the exact source value and segments", () => {
    const parsed = parseBattleScribeAffectsSelector(
      "self.entries.recursive.profiles.Ranged Weapons",
    );

    expect(parsed.value).toBe(
      "self.entries.recursive.profiles.Ranged Weapons",
    );
    expect(parsed.segments).toEqual([
      "self",
      "entries",
      "recursive",
      "profiles",
      "Ranged Weapons",
    ]);
  });
});
