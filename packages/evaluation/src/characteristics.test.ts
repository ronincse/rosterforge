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

function traversalSetup(): {
  readonly context: BattleScribeCatalogueContext;
  readonly roster: Roster;
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
  if (directChild === undefined || groupChild === undefined) {
    throw new Error("Missing traversal occurrences.");
  }
  return { context, roster, directChild, groupChild, directChoice, groupChoice };
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
