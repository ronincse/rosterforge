import { describe, expect, it } from "vitest";

import {
  parseBattleScribeXml,
  type ProfileProjection,
} from "@rosterforge/battlescribe-data";
import {
  composeBattleScribeCatalogueContexts,
  resolveBattleScribeDataGraph,
  type BattleScribeCatalogueContext,
} from "@rosterforge/data-graph";
import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import {
  addRosterForce,
  addRosterSelectionToForce,
  addRosterSelectionToSelection,
  createRoster,
  forceOccurrenceId,
  rosterDefinitionKeyForSource,
  rosterId,
  selectionOccurrenceId,
  type Roster,
  type RosterSelection,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import {
  evaluateRosterProfileCharacteristics,
  evaluateRosterProfileVisibility,
} from "./characteristics.js";
import type { EvaluationSelectionChoice } from "./selection-context.js";

describe("roster profile characteristic display", () => {
  it("applies a direct unconditional set and leaves other characteristics alone", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-direct-set"),
      ),
    );

    expect(report).toMatchObject({
      completeness: "complete",
      unroutedModifiers: [],
      characteristics: [
        {
          baseValue: '6"',
          value: '8"',
          completeness: "complete",
          steps: [
            { status: "applied", kind: "set", input: '6"', output: '8"', grouped: false },
          ],
        },
        { baseValue: "4+", value: "4+", completeness: "complete", steps: [] },
      ],
    });
    expect(report.characteristics[0]?.characteristic).toBe(
      profile(setup.ownerChoice, "profile-direct-set").characteristics[0],
    );
    expect(report.modifierApplicability).toHaveLength(1);
  });

  it("skips a false condition without making the report incomplete", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-conditional"),
      ),
    );

    expect(report).toMatchObject({
      completeness: "complete",
      characteristics: [
        {
          baseValue: '6"',
          value: '7"',
          completeness: "complete",
          steps: [
            { status: "applied", output: '7"' },
            { status: "notApplicable", input: '7"' },
          ],
        },
      ],
    });
  });

  it("runs direct modifiers, then groups in source order with children before nested groups", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-grouped-order"),
      ),
    );

    expect(
      report.characteristics[0]?.steps.map((step) =>
        step.status === "applied"
          ? { output: step.output, grouped: step.grouped }
          : step.status,
      ),
    ).toEqual([
      { output: "A", grouped: false },
      { output: "B", grouped: true },
      { output: "C", grouped: true },
      { output: "D", grouped: true },
    ]);
    expect(report).toMatchObject({
      completeness: "complete",
      characteristics: [{ value: "D" }],
    });
    expect(report.modifierGroupApplicability).toHaveLength(2);
  });

  it("keeps an unsatisfied group inert while retaining its applicability tree", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-grouped-conditional"),
      ),
    );

    expect(report).toMatchObject({
      completeness: "complete",
      characteristics: [
        {
          baseValue: '6"',
          value: '6"',
          steps: [{ status: "notApplicable", grouped: true }],
        },
      ],
      modifierGroupApplicability: [
        { localStatus: "notApplicable", status: "notApplicable" },
      ],
    });
  });

  it("preserves unsupported operations as unapplied steps with unknown values", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-unsupported-operations"),
      ),
    );

    expect(report.completeness).toBe("incomplete");
    expect(
      report.characteristics.map((entry) => "value" in entry),
    ).toEqual([false, false]);
    expect(report.characteristics[0]?.steps).toMatchObject([
      { status: "unapplied", issues: ["unsupportedAttributes", "unsupportedType"] },
    ]);
    expect(report.characteristics[1]?.steps).toMatchObject([
      { status: "unapplied", issues: ["unsupportedType"] },
    ]);
  });

  it("ignores an attribute the operation does not accept", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-inert-attributes"),
      ),
    );

    // New Recruit's editor offers `join` only for `append`, `arg` only for
    // `replace`, and `position` for neither of those two. A stray one is
    // copy-paste between modifiers, and New Recruit was observed applying an
    // append that carried a `position` with no positional effect.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "Assault",
      value: "Assault, Heavy",
    });
    expect(report.characteristics[1]).toMatchObject({
      baseValue: "4+",
      value: "2+",
    });
    expect(report.completeness).toBe("complete");
  });

  it("refuses a value an unapplied step fed into a reading operation", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-corrupted-input"),
      ),
    );

    // The increment applied cleanly, but it read a value an unsupported
    // `floor` had already made unknown. Reporting its result would be a
    // confidently wrong number. Only `set` repairs an unknown input, because
    // it is the one operation that does not read what it replaces.
    expect(report.characteristics[0]?.steps.map(({ status }) => status)).toEqual([
      "unapplied",
      "applied",
    ]);
    expect(report.characteristics[0]).not.toHaveProperty("value");
  });

  it("replaces a literal search term, deleting it when no value is given", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-replace"),
      ),
    );

    // `arg` is the search term. An absent `value` deletes the match, which is
    // how 164 of the corpus's 189 replaces are written.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "D6+0",
      value: "D6",
      steps: [{ status: "applied", kind: "replace", output: "D6" }],
    });
    // Corpus authors include the separator in the search term so removing a
    // keyword does not leave a dangling comma.
    expect(report.characteristics[1]).toMatchObject({
      baseValue: "Assault, Lethal Hits",
      value: "Assault",
    });
    expect(report.completeness).toBe("complete");
  });

  it("treats a replace that matches nothing as an applied no-op", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-replace-nomatch"),
      ),
    );

    // Collapsing a bonus slot on a weapon that never had one is the idiom's
    // normal path. Refusing here would leave every unmodified weapon's
    // Attacks unresolved, so it is an applied step that changes nothing.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "11",
      value: "11",
      steps: [{ status: "applied", kind: "replace", output: "11" }],
    });
    // A Boolean is not replacement text; substituting it would print `4true`.
    expect(report.characteristics[1]?.steps).toMatchObject([
      { status: "unapplied", issues: ["booleanReplacement"] },
    ]);
    expect(report.characteristics[1]).not.toHaveProperty("value");
  });

  it("applies lexical arithmetic to the positioned numeric match", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-arithmetic"),
      ),
    );

    // `position: -1` is the last number, so the bonus slot's 0 changes and the
    // dice expression around it is preserved untouched.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "D6+0",
      value: "D6+1",
      steps: [{ status: "applied", kind: "increment", output: "D6+1" }],
    });
    // Arithmetic is plain and signed: `decrement` on a `4+` save gives `3+`,
    // which is the improvement the corpus authors write it for. The evaluator
    // does not know or care that a save is inverted -- New Recruit is generic
    // over game systems and cannot know either.
    expect(report.characteristics[1]).toMatchObject({
      baseValue: "4+",
      value: "3+",
      steps: [{ status: "applied", kind: "decrement", output: "3+" }],
    });
    expect(report.completeness).toBe("complete");
  });

  it("refuses arithmetic it cannot place or cannot perform", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-arithmetic-refused"),
      ),
    );

    // No declared position and two numbers in the value: the default is not
    // established, so which number to change is a guess.
    expect(report.characteristics[0]?.steps).toMatchObject([
      { status: "unapplied", issues: ["ambiguousPosition"] },
    ]);
    // `-` has no number to change at all.
    expect(report.characteristics[1]?.steps).toMatchObject([
      { status: "unapplied", issues: ["noNumericMatch"] },
    ]);
    expect(report.characteristics[0]).not.toHaveProperty("value");
    expect(report.characteristics[1]).not.toHaveProperty("value");
    expect(report.completeness).toBe("incomplete");
  });

  it("chains appends through their declared separator", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-append"),
      ),
    );

    // Each append reads the running value, so the second joins onto the first
    // result rather than onto the projected base.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "Assault",
      value: "Assault, Heavy, Lethal Hits",
      steps: [
        { status: "applied", kind: "append", output: "Assault, Heavy" },
        {
          status: "applied",
          kind: "append",
          input: "Assault, Heavy",
          output: "Assault, Heavy, Lethal Hits",
        },
      ],
    });
  });

  it("concatenates directly when the separator is empty", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-append"),
      ),
    );

    // An empty separator is a real separator, not a missing one.
    expect(report.characteristics[1]).toMatchObject({
      baseValue: "4+",
      value: "4+0",
      steps: [{ status: "applied", kind: "append", output: "4+0" }],
    });
  });

  it("clamps rather than rounds for floor and ceil", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-clamped"),
      ),
    );

    // A T'au Ethereal's Move is 6", incremented by 4 and then `ceil 9`, and
    // New Recruit shows 9". So `ceil` is an upper bound, not a rounding step,
    // and the text around the number survives.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: '6"',
      value: '9"',
    });
    // `floor 2` on a save improved to 3+ leaves it at 3+. If floor *set* the
    // value instead of bounding it, this would read 2+ and every unit with
    // this pairing would show the best possible save.
    expect(report.characteristics[1]).toMatchObject({
      baseValue: "4+",
      value: "3+",
    });
    expect(report.completeness).toBe("complete");
  });

  it("runs the bonus-slot idiom end to end", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-bonus-slot"),
      ),
    );

    // Confirmed against New Recruit with an Aeldari Fire Prism carrying the
    // Heirloom (A+1) upgrade. A dice expression opens a `+0` slot, the
    // positioned increment bumps it, and the trailing replace finds nothing
    // left to collapse.
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "2D6",
      value: "2D6+1",
    });
    // The same Fire Prism's other profile has a plain Attacks of 2 and simply
    // reads 3: no slot is opened, so the increment hits the number itself.
    expect(report.characteristics[1]).toMatchObject({
      baseValue: "2",
      value: "3",
    });
    expect(report.completeness).toBe("complete");
  });

  it("withholds an append with no separator, and joins onto an empty value", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-append-empty"),
      ),
    );

    // Appending onto an empty value emits no separator, the way any ordinary
    // join behaves. Every one of the corpus's 590 `annotation` modifiers
    // starts from empty and appends through `", "`, and New Recruit shows
    // "(Furnace of Plagues)" rather than "(, Furnace of Plagues)".
    expect(report.characteristics[0]).toMatchObject({
      baseValue: "",
      value: "Assault",
      steps: [{ status: "applied", kind: "append", output: "Assault" }],
    });
    // An absent separator is still refused: nothing establishes a default.
    expect(report.characteristics[1]?.steps).toMatchObject([
      { status: "unapplied", issues: ["missingSeparator"] },
    ]);
    expect(report.characteristics[1]).not.toHaveProperty("value");
  });

  it("does not execute a modifier carrying generic behavior attributes", () => {
    const setup = characteristicSetup();

    const evaluated = evaluateRosterProfileCharacteristics(
      setup.roster,
      setup.context,
      setup.owner,
      profile(setup.ownerChoice, "profile-extension-attributes"),
    );

    expect(evaluated.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_CHARACTERISTIC_MODIFIER_ATTRIBUTES_UNSUPPORTED",
    ]);
    const report = successful(evaluated);
    expect(report).toMatchObject({
      completeness: "incomplete",
      characteristics: [
        {
          baseValue: '6"',
          steps: [{ status: "unapplied", issues: ["unsupportedAttributes"] }],
        },
      ],
    });
    expect(report.characteristics[0]).not.toHaveProperty("value");
  });

  it("leaves scoped, valueless, and repeated modifiers unapplied", () => {
    const setup = characteristicSetup();

    for (const [id, issues] of [
      ["profile-scoped", ["scoped"]],
      ["profile-missing-value", ["missingValue"]],
      ["profile-repeated", ["repeated"]],
    ] as const) {
      const report = successful(
        evaluateRosterProfileCharacteristics(
          setup.roster,
          setup.context,
          setup.owner,
          profile(setup.ownerChoice, id),
        ),
      );
      expect(report).toMatchObject({
        completeness: "incomplete",
        characteristics: [
          { baseValue: '6"', steps: [{ status: "unapplied", issues }] },
        ],
      });
      expect(report.characteristics[0]).not.toHaveProperty("value");
    }
  });

  it("reports a profile-owned modifier that names no characteristic on its profile", () => {
    const setup = characteristicSetup();

    const evaluated = evaluateRosterProfileCharacteristics(
      setup.roster,
      setup.context,
      setup.owner,
      profile(setup.ownerChoice, "profile-unrouted"),
    );
    const report = successful(evaluated);

    expect(report).toMatchObject({
      completeness: "incomplete",
      unroutedModifiers: [
        { grouped: false, reason: "characteristicAbsent" },
      ],
      characteristics: [{ baseValue: '6"', value: '6"', steps: [] }],
    });
    expect(evaluated.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_CHARACTERISTIC_MODIFIER_TARGET_MISSING",
    ]);
    expect(report.unroutedModifiers[0]?.modifier.field).toBe(
      "characteristic-description",
    );
    // A hidden modifier cannot change a characteristic value, so it is split
    // out for the visibility evaluator rather than counted as unrouted.
    expect(report.visibilityModifiers.map(({ field }) => field)).toEqual([
      "hidden",
    ]);
  });

  it("refuses to guess when one profile repeats a characteristic type", () => {
    const setup = characteristicSetup();

    const evaluated = evaluateRosterProfileCharacteristics(
      setup.roster,
      setup.context,
      setup.owner,
      profile(setup.ownerChoice, "profile-ambiguous-target"),
    );

    expect(evaluated.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_CHARACTERISTIC_MODIFIER_TARGET_AMBIGUOUS",
    ]);
    expect(successful(evaluated)).toMatchObject({
      completeness: "incomplete",
      unroutedModifiers: [{ reason: "characteristicAmbiguous" }],
      characteristics: [
        { baseValue: '6"', value: '6"', steps: [] },
        { baseValue: '7"', value: '7"', steps: [] },
      ],
    });
  });

  it("treats an author comment as inert metadata", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-inert-comment"),
      ),
    );

    expect(report).toMatchObject({
      completeness: "complete",
      characteristics: [{ value: '8"' }],
    });
  });

  it("keeps the effective value known only when nothing follows the last applied step", () => {
    const setup = characteristicSetup();

    const known = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-known-after-unapplied"),
      ),
    );
    const unknown = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-unknown-after-applied"),
      ),
    );

    expect(known).toMatchObject({
      completeness: "incomplete",
      characteristics: [{ value: '9"' }],
    });
    expect(unknown.completeness).toBe("incomplete");
    expect(unknown.characteristics[0]).not.toHaveProperty("value");
  });

  it("leaves a modifier unapplied when its applicability is unresolved", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-unresolved-applicability"),
      ),
    );

    expect(report).toMatchObject({
      completeness: "incomplete",
      characteristics: [
        {
          steps: [
            { status: "unapplied", issues: ["applicabilityUnresolved"] },
          ],
        },
      ],
    });
    expect(report.characteristics[0]).not.toHaveProperty("value");
  });
});

describe("affects-routed characteristic modifiers", () => {
  it("routes an owning selection's modifier to its own matching profiles", () => {
    const setup = characteristicSetup("affects-owner");

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-routed-unit"),
      ),
    );

    // Move is set by an affects selector that also carries a scope; affects
    // overrides scope, so the modifier applies rather than being withheld.
    expect(report).toMatchObject({
      completeness: "complete",
      characteristics: [
        {
          baseValue: '6"',
          value: '9"',
          steps: [{ status: "applied", origin: "affects", output: '9"' }],
        },
        // Matched case-insensitively against the declared profile type.
        { baseValue: "4+", value: "2+" },
      ],
    });
  });

  it("routes only to the profile type the selector names", () => {
    const setup = characteristicSetup("affects-owner");

    const ability = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-routed-ability"),
      ),
    );

    // The Unit-targeted modifiers must not reach an Ability profile, and the
    // Ability-targeted one must.
    expect(ability).toMatchObject({
      completeness: "complete",
      characteristics: [{ baseValue: "Base text", value: "Rewritten" }],
    });
    expect(ability.characteristics[0]?.steps).toHaveLength(1);
  });

  it("does not execute a selector that traverses beyond the owner", () => {
    const setup = characteristicSetup("affects-owner");

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-routed-unit"),
      ),
    );

    // The recursive selector is left alone entirely: it neither applies nor
    // appears as an unapplied step on this profile.
    expect(
      report.characteristics[0]?.steps.every(
        (step) => step.status === "applied",
      ),
    ).toBe(true);
    expect(report.characteristics[0]?.value).toBe('9"');
  });
});

describe("affects traversal", () => {
  it("reaches a direct child entry but not a group member without `group`", () => {
    const setup = traversalSetup();

    const direct = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.directChild,
        profile(setup.directChoice, "profile-direct-child"),
      ),
    );
    const grouped = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.groupChild,
        profile(setup.groupChoice, "profile-group-child"),
      ),
    );

    // Verified in New Recruit: `self.entries` does not descend into a
    // selection-entry group, so only the direct child's Move changes.
    expect(direct.characteristics[0]).toMatchObject({
      baseValue: '6"',
      value: '8"',
    });
    expect(grouped.characteristics[0]).toMatchObject({
      baseValue: '6"',
      value: '6"',
    });
    // `self.entries.group` adds group traversal, so Save reaches both.
    expect(direct.characteristics[1]).toMatchObject({ value: "2+" });
    expect(grouped.characteristics[1]).toMatchObject({ value: "2+" });
  });

  it("clears a known value when a later routed step cannot be applied", () => {
    const setup = staleValueSetup();

    const report = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.child,
        profile(setup.childChoice, "profile-stale-child"),
      ),
    );

    // A routed `set` makes Move known, then a routed unsupported `increment`
    // must take it back to unknown rather than leaving the earlier value.
    expect(report.characteristics[0]?.steps).toMatchObject([
      { status: "applied", origin: "affects", output: '8"' },
      { status: "unapplied", origin: "affects" },
    ]);
    expect(report.characteristics[0]).not.toHaveProperty("value");
    expect(report.characteristics[0]?.completeness).toBe("incomplete");
  });

  it("stands the selector on the occurrence its scope names", () => {
    const setup = bearerSetup();

    const weapon = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.weapon,
        profile(setup.weaponChoice, "profile-bearer-weapon"),
      ),
    );

    // The enhancement declaring this modifier is the weapon's *sibling*, not
    // its ancestor, and has no children at all. It reaches the weapon only
    // because `scope="model"` stands the selector on the bearer.
    expect(weapon.characteristics[0]).toMatchObject({
      baseValue: '4"',
      value: '9"',
      steps: [{ status: "applied", origin: "affects", output: '9"' }],
    });
    expect(weapon.completeness).toBe("complete");
  });

  it("chains routed steps with each other, not only with the owner's own", () => {
    const setup = bearerSetup();

    const weapon = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.weapon,
        profile(setup.weaponChoice, "profile-bearer-weapon"),
      ),
    );

    // The enhancement routes an increment and then a replace at the same
    // characteristic. Save 5+ increments to 6+, and only then does the
    // replace find its "6". If each routed step were handed the owner's
    // value instead of the running one, the replace would match nothing and
    // the answer would be 6+.
    const save = weapon.characteristics[1];
    expect(save).toMatchObject({
      baseValue: "5+",
      value: "2+",
    });
    expect(save?.steps.map(({ status }) => status)).toEqual([
      "applied",
      "applied",
    ]);
  });

  it("does not let a descendant selector reach the anchor itself", () => {
    const setup = bearerSetup();

    const bearer = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.bearer,
        profile(setup.bearerChoice, "profile-bearer-unit"),
      ),
    );

    // Confirmed in New Recruit: the Lord of Contagion's own Unit profile is
    // untouched while its weapons change. `self.entries.recursive` names the
    // anchor's descendants, and the anchor is not one of them.
    expect(bearer.characteristics[0]).toMatchObject({
      baseValue: '6"',
      value: '6"',
      steps: [],
    });
    expect(bearer.completeness).toBe("complete");
  });

  it("attributes a routed step to the occurrence that declared it", () => {
    const setup = traversalSetup();

    const grouped = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.groupChild,
        profile(setup.groupChoice, "profile-group-child"),
      ),
    );

    const applied = grouped.characteristics[1]?.steps ?? [];
    expect(applied).toMatchObject([{ status: "applied", origin: "affects" }]);
    // The declarer is the ancestor that owns the selector, not the occurrence
    // whose profile is being read. A reader shown only the changed value has no
    // way to find the source without this.
    expect(applied[0]?.declaredBy.id).toBe(setup.owner.id);
    expect(applied[0]?.declaredBy.id).not.toBe(setup.groupChild.id);
  });
});

describe("roster profile visibility", () => {
  it("reports a profile with no hidden behavior as visible", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-direct-set"),
      ),
    );

    expect(report).toMatchObject({
      status: "visible",
      hidden: false,
      completeness: "complete",
      modifierApplicability: [],
      modifierGroupApplicability: [],
    });
  });

  it("uses the projected hidden flag when no modifier applies", () => {
    const setup = characteristicSetup();

    const report = successful(
      evaluateRosterProfileVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-hidden-static"),
      ),
    );

    expect(report).toMatchObject({
      status: "hidden",
      hidden: true,
      completeness: "complete",
    });
  });

  it("applies a satisfied hidden modifier and skips an unsatisfied one", () => {
    const setup = characteristicSetup();

    const hidden = successful(
      evaluateRosterProfileVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-hidden-conditional"),
      ),
    );
    const visible = successful(
      evaluateRosterProfileVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-hidden-inactive"),
      ),
    );

    expect(hidden).toMatchObject({
      status: "hidden",
      hidden: true,
      completeness: "complete",
      modifierApplicability: [{ status: "applicable" }],
    });
    expect(visible).toMatchObject({
      status: "visible",
      hidden: false,
      completeness: "complete",
      modifierApplicability: [{ status: "notApplicable" }],
    });
  });

  it("lets a grouped modifier reveal a statically hidden profile", () => {
    const setup = characteristicSetup();
    const source = profile(setup.ownerChoice, "profile-hidden-grouped");

    const report = successful(
      evaluateRosterProfileVisibility(
        setup.roster,
        setup.context,
        setup.owner,
        source,
      ),
    );

    expect(report).toMatchObject({
      status: "visible",
      hidden: false,
      completeness: "complete",
      modifierGroupApplicability: [{ status: "applicable" }],
    });
    expect(report.modifierGroupApplicability[0]?.group).toBe(
      source.modifierGroups[0],
    );
  });

  it("leaves an unsupported hidden operation unresolved and incomplete", () => {
    const setup = characteristicSetup();

    const evaluated = evaluateRosterProfileVisibility(
      setup.roster,
      setup.context,
      setup.owner,
      profile(setup.ownerChoice, "profile-hidden-unsupported"),
    );
    const report = successful(evaluated);

    expect(evaluated.diagnostics.map(({ code }) => code)).toEqual([
      "EVALUATION_PROFILE_VISIBILITY_MODIFIER_UNSUPPORTED",
    ]);
    expect(report).toMatchObject({
      status: "unresolved",
      completeness: "incomplete",
    });
    expect(report).not.toHaveProperty("hidden");
  });

  it("keeps characteristic values complete while visibility is unresolved", () => {
    const setup = characteristicSetup();

    const characteristics = successful(
      evaluateRosterProfileCharacteristics(
        setup.roster,
        setup.context,
        setup.owner,
        profile(setup.ownerChoice, "profile-hidden-unsupported"),
      ),
    );

    expect(characteristics).toMatchObject({
      completeness: "complete",
      unroutedModifiers: [],
      characteristics: [{ baseValue: '6"', value: '6"' }],
    });
    expect(characteristics.visibilityModifiers).toHaveLength(1);
  });
});

function characteristicSetup(rootId = "characteristic-owner"): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
  readonly ownerChoice: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  const ownerChoice = choice(context, rootId);
  let roster = createRoster({
    id: rosterId("characteristic-roster"),
    name: "Characteristic roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions.find(
    ({ source }) => source.id === "force-patrol",
  );
  if (force === undefined) {
    throw new Error("Missing characteristic fixture force.");
  }
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("characteristic-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  roster = successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("characteristic-force"), {
      id: selectionOccurrenceId("characteristic-owner-occurrence"),
      definition: {
        kind: ownerChoice.kind,
        key: projectionKey(ownerChoice.occurrence),
        ...(ownerChoice.id === undefined ? {} : { sourceId: ownerChoice.id }),
      },
    }),
  );
  const owner = roster.forces[0]?.selections[0];
  if (owner === undefined) {
    throw new Error("Missing characteristic fixture owner.");
  }
  return { context, roster, owner, ownerChoice: ownerChoice };
}

/**
 * A model carrying an enhancement and a weapon, mirroring the shape confirmed
 * in New Recruit: the enhancement has no children, so its selector can only
 * reach the weapon by standing on the model its `scope` names.
 */
function bearerSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly bearer: RosterSelection;
  readonly weapon: RosterSelection;
  readonly bearerChoice: EvaluationSelectionChoice;
  readonly weaponChoice: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  const bearerChoice = choice(context, "affects-bearer");
  const enhancementChoice = choice(context, "bearer-enhancement");
  const weaponChoice = choice(context, "bearer-weapon");
  let roster = createRoster({
    id: rosterId("bearer-roster"),
    name: "Bearer roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions.find(
    ({ source }) => source.id === "force-patrol",
  );
  if (force === undefined) throw new Error("Missing bearer fixture force.");
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("bearer-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  roster = successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("bearer-force"), {
      id: selectionOccurrenceId("bearer-occurrence"),
      definition: {
        kind: bearerChoice.kind,
        key: projectionKey(bearerChoice.occurrence),
        ...(bearerChoice.id === undefined ? {} : { sourceId: bearerChoice.id }),
      },
    }),
  );
  for (const [label, child] of [
    ["enhancement", enhancementChoice],
    ["weapon", weaponChoice],
  ] as const) {
    roster = successful(
      addRosterSelectionToSelection(
        roster,
        selectionOccurrenceId("bearer-occurrence"),
        {
          id: selectionOccurrenceId(`bearer-${label}`),
          definition: {
            kind: child.kind,
            key: projectionKey(child.occurrence),
            ...(child.id === undefined ? {} : { sourceId: child.id }),
          },
        },
      ),
    );
  }
  const bearer = roster.forces[0]?.selections[0];
  const weapon = bearer?.selections[1];
  if (bearer === undefined || weapon === undefined) {
    throw new Error("Missing bearer occurrences.");
  }
  return { context, roster, bearer, weapon, bearerChoice, weaponChoice };
}

function traversalSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly owner: RosterSelection;
  readonly directChild: RosterSelection;
  readonly groupChild: RosterSelection;
  readonly directChoice: EvaluationSelectionChoice;
  readonly groupChoice: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  const ownerChoice = choice(context, "affects-traversal");
  const directChoice = choice(context, "direct-child");
  const groupChoice = choice(context, "group-child");
  let roster = createRoster({
    id: rosterId("affects-traversal-roster"),
    name: "Affects traversal roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions.find(
    ({ source }) => source.id === "force-patrol",
  );
  if (force === undefined) throw new Error("Missing traversal fixture force.");
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("traversal-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  const reference = (candidate: EvaluationSelectionChoice) => ({
    kind: candidate.kind,
    key: projectionKey(candidate.occurrence),
    ...(candidate.id === undefined ? {} : { sourceId: candidate.id }),
  });
  roster = successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("traversal-force"), {
      id: selectionOccurrenceId("traversal-owner"),
      definition: reference(ownerChoice),
    }),
  );
  // Both children are added directly under the owner, the way browser editing
  // flattens groups away. The group member is still a group member by
  // definition, which is what the traversal rule tests.
  roster = successful(
    addRosterSelectionToSelection(
      roster,
      selectionOccurrenceId("traversal-owner"),
      {
        id: selectionOccurrenceId("traversal-direct"),
        definition: reference(directChoice),
      },
    ),
  );
  roster = successful(
    addRosterSelectionToSelection(
      roster,
      selectionOccurrenceId("traversal-owner"),
      {
        id: selectionOccurrenceId("traversal-group"),
        definition: reference(groupChoice),
      },
    ),
  );
  const owner = roster.forces[0]?.selections[0];
  const directChild = owner?.selections[0];
  const groupChild = owner?.selections[1];
  if (
    owner === undefined ||
    directChild === undefined ||
    groupChild === undefined
  ) {
    throw new Error("Missing traversal occurrences.");
  }
  return {
    context,
    roster,
    owner,
    directChild,
    groupChild,
    directChoice,
    groupChoice,
  };
}

function staleValueSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
  readonly child: RosterSelection;
  readonly childChoice: EvaluationSelectionChoice;
} {
  const context = catalogueContext();
  const ownerChoice = choice(context, "affects-stale-value");
  const childChoice = choice(context, "stale-child");
  let roster = createRoster({
    id: rosterId("stale-value-roster"),
    name: "Stale value roster",
    catalogue: {
      kind: "catalogue",
      key: projectionKey(context.document.projection),
      sourceId: context.document.metadata.id,
    },
  });
  const force = context.forces.definitions.find(
    ({ source }) => source.id === "force-patrol",
  );
  if (force === undefined) throw new Error("Missing stale-value force.");
  roster = successful(
    addRosterForce(roster, {
      id: forceOccurrenceId("stale-force"),
      definition: {
        kind: "forceEntry",
        key: projectionKey(force.source),
        ...(force.source.id === undefined ? {} : { sourceId: force.source.id }),
      },
    }),
  );
  const reference = (candidate: EvaluationSelectionChoice) => ({
    kind: candidate.kind,
    key: projectionKey(candidate.occurrence),
    ...(candidate.id === undefined ? {} : { sourceId: candidate.id }),
  });
  roster = successful(
    addRosterSelectionToForce(roster, forceOccurrenceId("stale-force"), {
      id: selectionOccurrenceId("stale-owner"),
      definition: reference(ownerChoice),
    }),
  );
  roster = successful(
    addRosterSelectionToSelection(
      roster,
      selectionOccurrenceId("stale-owner"),
      {
        id: selectionOccurrenceId("stale-child"),
        definition: reference(childChoice),
      },
    ),
  );
  const child = roster.forces[0]?.selections[0]?.selections[0];
  if (child === undefined) throw new Error("Missing stale-value child.");
  return { context, roster, child, childChoice };
}

function catalogueContext(): BattleScribeCatalogueContext {
  const graph = resolveBattleScribeDataGraph([
    parseFixture("projection.gst"),
    parseFixture("characteristic-display.cat"),
  ]);
  if (!graph.ok) throw new Error("Characteristic fixture graph must resolve.");
  const contexts = composeBattleScribeCatalogueContexts(graph.value);
  if (!contexts.ok) {
    throw new Error("Characteristic fixture contexts must compose.");
  }
  const context = contexts.value.catalogues.find(
    ({ document }) => document.metadata.id === "characteristic-display",
  );
  if (context === undefined) {
    throw new Error("Missing characteristic context.");
  }
  return context;
}

function profile(
  owner: EvaluationSelectionChoice,
  id: string,
): ProfileProjection {
  const found = owner.profiles.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Missing fixture profile ${id}.`);
  return found;
}

function choice(
  context: BattleScribeCatalogueContext,
  id: string,
): EvaluationSelectionChoice {
  const pending = context.roots.roots.map((root) => root.materialized);
  while (pending.length > 0) {
    const selected = pending.shift();
    if (selected === undefined || selected.kind === "unresolvedEntryLink") {
      continue;
    }
    if (selected.id === id) return selected;
    pending.push(
      ...selected.selectionEntries,
      ...selected.selectionEntryGroups,
      ...selected.entryLinks,
    );
  }
  throw new Error(`Missing selection choice ${id}.`);
}

function projectionKey(source: {
  readonly source: { readonly sourceId: string };
  readonly path: readonly string[];
}) {
  return rosterDefinitionKeyForSource(source.source.sourceId, source.path);
}

function parseFixture(filename: string) {
  const parsed = parseBattleScribeXml(fixtureBytes(filename), {
    source: provenance(filename),
  });
  if (!parsed.ok) throw new Error(`Fixture ${filename} must parse.`);
  return parsed.value;
}

function successful<T>(result: {
  readonly ok: boolean;
  readonly value?: T;
}): T {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected operation to succeed.");
  }
  return result.value;
}

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-08-14T00:00:00.000Z",
  };
}
