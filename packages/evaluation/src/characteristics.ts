import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";

import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type ValidationCompleteness,
} from "@rosterforge/foundation";

import type { Roster, RosterSelection } from "@rosterforge/roster-model";

import { parseBattleScribeAffectsSelector } from "./affects.js";
import { effectiveRosterCategories } from "./effective-categories.js";
import {
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  type EvaluationChoiceIndex,
  type EvaluationSelectionChoice,
} from "./selection-context.js";

import {
  evaluateRosterModifierApplicability,
  type RosterModifierApplicabilityReport,
  type RosterModifierApplicabilitySource,
} from "./modifier-applicability.js";
import {
  collectRosterModifierGroupExecution,
  evaluateRosterModifierGroupApplicability,
  type RosterModifierGroupApplicabilityReport,
  type RosterModifierGroupSource,
} from "./modifier-groups.js";
import type { NumericModifierApplicability } from "./modifiers.js";

/**
 * The only characteristic operation whose target and result are established by
 * the source shape alone. `set` replaces the projected lexical value and never
 * inspects the value it replaces, so it needs no numeric grammar for observed
 * forms such as `3+`, `36"`, or `D6`.
 */
export type RosterCharacteristicModifierKind = "set";

export type RosterCharacteristicModifierIssue =
  | "applicabilityUnresolved"
  | "repeated"
  | "scoped"
  | "unsupportedAttributes"
  | "missingType"
  | "unsupportedType"
  | "missingValue";

export type RosterCharacteristicRoutingReason =
  | "missingField"
  | "characteristicAbsent"
  | "characteristicAmbiguous";

export interface RosterCharacteristicSource {
  readonly name?: string;
  readonly typeId?: ObjectId;
  readonly value: string;
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
}

export interface RosterCharacteristicModifierSource
  extends RosterModifierApplicabilitySource {
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly value?: string;
  readonly repeats: readonly unknown[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: {
    readonly attributes: Readonly<Record<string, string>>;
  };
}

export interface RosterCharacteristicProfileSource<
  Characteristic extends RosterCharacteristicSource =
    RosterCharacteristicSource,
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> {
  readonly id?: ObjectId;
  readonly name?: string;
  readonly typeId?: ObjectId;
  readonly typeName?: string;
  readonly hidden?: boolean;
  readonly characteristics: readonly Characteristic[];
  readonly modifiers: readonly Modifier[];
  readonly modifierGroups: readonly RosterModifierGroupSource<Modifier>[];
}

/**
 * The field a profile-owned modifier uses to control its own visibility. It is
 * a known BattleScribe field with the same Boolean `set` semantics already
 * executed for selection visibility, so a modifier targeting it definitively
 * does not name a characteristic type.
 */
const visibilityField = "hidden";

/**
 * Where a step's modifier was declared. `own` means the profile declared it;
 * `affects` means the profile's owning selection declared it and routed it here
 * with an `affects` selector.
 */
export type RosterCharacteristicStepOrigin = "own" | "affects";

export interface AppliedRosterCharacteristicStep<
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> {
  readonly status: "applied";
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly origin: RosterCharacteristicStepOrigin;
  readonly kind: RosterCharacteristicModifierKind;
  readonly input: string;
  readonly output: string;
}

export interface NotApplicableRosterCharacteristicStep<
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> {
  readonly status: "notApplicable";
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly origin: RosterCharacteristicStepOrigin;
  readonly input: string;
}

export interface UnappliedRosterCharacteristicStep<
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> {
  readonly status: "unapplied";
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly origin: RosterCharacteristicStepOrigin;
  readonly input: string;
  readonly issues: readonly RosterCharacteristicModifierIssue[];
  readonly kind?: RosterCharacteristicModifierKind;
}

export type RosterCharacteristicStep<
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> =
  | AppliedRosterCharacteristicStep<Modifier>
  | NotApplicableRosterCharacteristicStep<Modifier>
  | UnappliedRosterCharacteristicStep<Modifier>;

export interface UnroutedRosterCharacteristicModifier<
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> {
  readonly modifier: Modifier;
  readonly grouped: boolean;
  readonly reason: RosterCharacteristicRoutingReason;
}

export interface RosterCharacteristicReport<
  Characteristic extends RosterCharacteristicSource =
    RosterCharacteristicSource,
  Modifier extends RosterCharacteristicModifierSource =
    RosterCharacteristicModifierSource,
> {
  readonly characteristic: Characteristic;
  readonly typeId?: ObjectId;
  readonly baseValue: string;
  readonly value?: string;
  readonly completeness: ValidationCompleteness;
  readonly steps: readonly RosterCharacteristicStep<Modifier>[];
}

export interface RosterProfileCharacteristicReport<
  Profile extends RosterCharacteristicProfileSource =
    RosterCharacteristicProfileSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly profile: Profile;
  readonly characteristics: readonly RosterCharacteristicReport<
    Profile["characteristics"][number],
    Profile["modifiers"][number]
  >[];
  readonly unroutedModifiers: readonly UnroutedRosterCharacteristicModifier<
    Profile["modifiers"][number]
  >[];
  /**
   * Profile-owned modifiers targeting `hidden`. They cannot change a
   * characteristic value, so they do not affect this report's completeness;
   * `evaluateRosterProfileVisibility` owns their execution and completeness.
   */
  readonly visibilityModifiers: readonly Profile["modifiers"][number][];
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<
    Profile["modifiers"][number]
  >[];
  readonly modifierGroupApplicability: readonly RosterModifierGroupApplicabilityReport<
    Profile["modifierGroups"][number]
  >[];
  readonly completeness: ValidationCompleteness;
}

export type RosterProfileVisibilityStatus =
  | "visible"
  | "hidden"
  | "unresolved";

export interface RosterProfileVisibilityReport<
  Profile extends RosterCharacteristicProfileSource =
    RosterCharacteristicProfileSource,
> {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterSelection;
  readonly profile: Profile;
  readonly status: RosterProfileVisibilityStatus;
  readonly hidden?: boolean;
  readonly completeness: ValidationCompleteness;
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<
    Profile["modifiers"][number]
  >[];
  readonly modifierGroupApplicability: readonly RosterModifierGroupApplicabilityReport<
    Profile["modifierGroups"][number]
  >[];
}

/**
 * Reports the effective displayed characteristics of one projected profile for
 * one exact roster selection occurrence.
 *
 * The profile's own ordered modifiers run first, then its top-level modifier
 * groups in source order with each group's direct modifiers before nested
 * groups depth-first. That is the same execution order already documented for
 * grouped cost, constraint, and visibility execution.
 *
 * A modifier reaches a characteristic only when its `field` equals that
 * characteristic's exact `typeId` on this profile. Targets are never inferred
 * from display names, and `affects`, `join`, `arg`, `position`, `scope`, or any
 * other generic attribute keeps the modifier observable and unapplied.
 */
export function evaluateRosterProfileCharacteristics<
  Profile extends RosterCharacteristicProfileSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  profile: Profile,
): Result<RosterProfileCharacteristicReport<Profile>> {
  type Modifier = Profile["modifiers"][number];
  type Characteristic = Profile["characteristics"][number];

  const diagnostics: Diagnostic[] = [];

  const routable = routableCharacteristicTypeIds(profile.characteristics);
  const unroutedModifiers: UnroutedRosterCharacteristicModifier<Modifier>[] =
    [];
  const visibilityModifiers: Modifier[] = [];
  for (const { modifier, grouped } of profileOwnedModifiers<Modifier>(
    profile,
  )) {
    if (modifier.field === visibilityField) {
      visibilityModifiers.push(modifier);
      continue;
    }
    const reason = routingReason(modifier, routable);
    if (reason === undefined) {
      continue;
    }
    unroutedModifiers.push({ modifier, grouped, reason });
    diagnostics.push(routingDiagnostic(modifier, reason));
  }

  const modifierApplicability: RosterModifierApplicabilityReport<Modifier>[] =
    [];
  const directTargets = profile.modifiers.filter((modifier) =>
    targetsRoutableCharacteristic(modifier, routable),
  );
  for (const modifier of directTargets) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      modifierApplicability.push(evaluated.value);
    }
  }
  let lostDirect = modifierApplicability.length !== directTargets.length;

  const modifierGroupApplicability: RosterModifierGroupApplicabilityReport<
    Profile["modifierGroups"][number]
  >[] = [];
  const relevantGroups = profile.modifierGroups.filter((group) =>
    groupTargetsRoutableCharacteristic(group, routable),
  );
  for (const group of relevantGroups) {
    const evaluated = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      group,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) {
      modifierGroupApplicability.push(evaluated.value);
    }
  }
  let lostGrouped = modifierGroupApplicability.length !== relevantGroups.length;

  const characteristics: RosterCharacteristicReport<
    Characteristic,
    Modifier
  >[] = [];
  const routedSteps = new Map<
    RosterCharacteristicReport<Characteristic, Modifier>,
    RosterCharacteristicStep<Modifier>[]
  >();
  for (const characteristic of profile.characteristics) {
    const typeId = characteristic.typeId;
    // A duplicated type on one profile is reported as an ambiguous target
    // instead of being applied to every matching characteristic.
    const routedTypeId =
      typeId !== undefined && routable.get(typeId) === 1 ? typeId : undefined;

    const steps: RosterCharacteristicStep<Modifier>[] = [];
    if (routedTypeId !== undefined) {
      for (const report of modifierApplicability) {
        if (report.modifier.field !== routedTypeId) {
          continue;
        }
        const step = evaluateStep<Modifier>(
          currentValue(steps, characteristic.value),
          report.modifier,
          false,
          report.evaluated ? report.status : "unresolved",
        );
        steps.push(step.step);
        diagnostics.push(...step.diagnostics);
      }

      const grouped = collectRosterModifierGroupExecution<Modifier>(
        modifierGroupApplicability,
        routedTypeId,
      );
      const expectedGrouped = relevantGroups.reduce(
        (count, group) =>
          count + groupedTargetCount<Modifier>(group, routedTypeId),
        0,
      );
      if (grouped.entries.length !== expectedGrouped) {
        lostGrouped = true;
      }
      for (const entry of grouped.entries) {
        const step = evaluateStep<Modifier>(
          currentValue(steps, characteristic.value),
          entry.modifier,
          true,
          entry.evaluated ? entry.status : "unresolved",
        );
        steps.push(step.step);
        diagnostics.push(...step.diagnostics);
      }
    }

    const value = effectiveValue(steps, characteristic.value);
    characteristics.push({
      characteristic,
      ...(typeId === undefined ? {} : { typeId }),
      baseValue: characteristic.value,
      ...(value === undefined ? {} : { value }),
      completeness: steps.some(({ status }) => status === "unapplied")
        ? "incomplete"
        : "complete",
      steps,
    });
  }

  // Modifiers declared by the owning selection can route here with an
  // `affects` selector. Only the owner-relative form is executed; see
  // `collectAffectsRoutedModifiers`.
  const routed = collectAffectsRoutedModifiers(roster, context, owner, profile);
  if (routed.partial) {
    lostDirect = true;
  }
  for (const entry of routed.modifiers) {
    const typeId = entry.modifier.field as ObjectId | undefined;
    if (typeId === undefined || routable.get(typeId) !== 1) {
      continue;
    }
    const report = characteristics.find(
      ({ characteristic }) => characteristic.typeId === typeId,
    );
    if (report === undefined) {
      continue;
    }
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      entry.declaredBy,
      entry.modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      lostDirect = true;
      continue;
    }
    const step = evaluateStep<Modifier>(
      currentValue(report.steps, report.baseValue),
      entry.modifier as Modifier,
      entry.grouped,
      evaluated.value.evaluated ? evaluated.value.status : "unresolved",
      "affects",
    );
    diagnostics.push(...step.diagnostics);
    routedSteps.set(report, [...(routedSteps.get(report) ?? []), step.step]);
  }
  const finalised = characteristics.map((report) => {
    const extra = routedSteps.get(report);
    if (extra === undefined) {
      return report;
    }
    const steps = [...report.steps, ...extra];
    const value = effectiveValue(steps, report.baseValue);
    // Rebuilt field by field rather than spread: a routed step can make a
    // previously known value unknown, and spreading would carry the stale
    // `value` through because a conditional spread cannot remove a key.
    return {
      characteristic: report.characteristic,
      ...(report.typeId === undefined ? {} : { typeId: report.typeId }),
      baseValue: report.baseValue,
      ...(value === undefined ? {} : { value }),
      completeness: steps.some(({ status }) => status === "unapplied")
        ? ("incomplete" as const)
        : ("complete" as const),
      steps,
    };
  });

  lostDirect ||= modifierApplicability.some(
    ({ completeness }) => completeness === "incomplete",
  );
  lostGrouped ||= modifierGroupApplicability.some(
    ({ completeness }) => completeness === "incomplete",
  );

  const completeness: ValidationCompleteness =
    !lostDirect &&
    !lostGrouped &&
    unroutedModifiers.length === 0 &&
    finalised.every(({ completeness: child }) => child === "complete") &&
    diagnostics.length === 0
      ? "complete"
      : "incomplete";

  return success(
    {
      roster,
      context,
      owner,
      profile,
      characteristics: finalised,
      unroutedModifiers,
      visibilityModifiers,
      modifierApplicability,
      modifierGroupApplicability,
      completeness,
    },
    diagnostics,
  );
}

/**
 * Reports whether one projected profile is displayed for one exact roster
 * selection occurrence.
 *
 * This mirrors `evaluateRosterSelectionVisibility`: the supported shape is a
 * `type="set" field="hidden"` modifier with a Boolean value, no scope, no
 * repeat, and no generic behavior attribute. Direct owner modifiers run first,
 * then relevant top-level groups in source order with each group's direct
 * modifiers before nested groups depth-first.
 *
 * A hidden profile is reported, never removed. Presentation decides what to do
 * with the status.
 */
export function evaluateRosterProfileVisibility<
  Profile extends RosterCharacteristicProfileSource,
>(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  profile: Profile,
): Result<RosterProfileVisibilityReport<Profile>> {
  type Modifier = Profile["modifiers"][number];

  const diagnostics: Diagnostic[] = [];
  const modifierApplicability: RosterModifierApplicabilityReport<Modifier>[] =
    [];
  const modifierGroupApplicability: RosterModifierGroupApplicabilityReport<
    Profile["modifierGroups"][number]
  >[] = [];
  let hidden = profile.hidden ?? false;
  let known = true;

  const applyStep = (modifier: Modifier, applicable: boolean | undefined) => {
    const value = booleanModifierValue(modifier);
    if (
      modifier.type !== "set" ||
      value === undefined ||
      modifier.scope !== undefined ||
      modifier.repeats.length > 0 ||
      unsupportedAttributes(modifier).length > 0
    ) {
      known = false;
      diagnostics.push(
        characteristicDiagnostic(
          modifier,
          "EVALUATION_PROFILE_VISIBILITY_MODIFIER_UNSUPPORTED",
          "A profile hidden-state modifier has unsupported behavior, so effective visibility is unresolved.",
          undefined,
          {
            type: modifier.type,
            value: modifier.value,
            scope: modifier.scope,
            repeats: modifier.repeats.length,
            attributes: modifier.node.attributes,
          },
        ),
      );
      return;
    }
    if (applicable === undefined) {
      known = false;
    } else if (applicable) {
      hidden = value;
      known = true;
    }
  };

  for (const modifier of profile.modifiers.filter(
    ({ field }) => field === visibilityField,
  )) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      known = false;
      continue;
    }
    modifierApplicability.push(evaluated.value);
    const status = evaluated.value.evaluated
      ? evaluated.value.status
      : "unresolved";
    applyStep(
      modifier,
      status === "unresolved"
        ? undefined
        : status === "applicable",
    );
  }

  const relevantGroups = profile.modifierGroups.filter((group) =>
    groupTargetsField(group, visibilityField),
  );
  for (const group of relevantGroups) {
    const evaluated = evaluateRosterModifierGroupApplicability(
      roster,
      context,
      owner,
      group,
    );
    diagnostics.push(...evaluated.diagnostics);
    if (!evaluated.ok) {
      known = false;
      continue;
    }
    modifierGroupApplicability.push(evaluated.value);
  }
  const grouped = collectRosterModifierGroupExecution<Modifier>(
    modifierGroupApplicability,
    visibilityField,
  );
  const expectedGrouped = relevantGroups.reduce(
    (count, group) => count + groupedTargetCount<Modifier>(group, visibilityField),
    0,
  );
  if (
    modifierGroupApplicability.length !== relevantGroups.length ||
    grouped.entries.length !== expectedGrouped
  ) {
    known = false;
  }
  for (const entry of grouped.entries) {
    applyStep(
      entry.modifier,
      !entry.evaluated || entry.status === "unresolved"
        ? undefined
        : entry.status === "applicable",
    );
  }

  return success(
    {
      roster,
      context,
      owner,
      profile,
      status: known ? (hidden ? "hidden" : "visible") : "unresolved",
      ...(known ? { hidden } : {}),
      completeness:
        diagnostics.length === 0 &&
        modifierApplicability.every(
          ({ completeness }) => completeness === "complete",
        ) &&
        modifierGroupApplicability.every(
          ({ completeness }) => completeness === "complete",
        )
          ? "complete"
          : "incomplete",
      modifierApplicability,
      modifierGroupApplicability,
    },
    diagnostics,
  );
}

function booleanModifierValue(
  modifier: RosterCharacteristicModifierSource,
): boolean | undefined {
  if (modifier.value === "true") return true;
  if (modifier.value === "false") return false;
  return undefined;
}

function evaluateStep<
  Modifier extends RosterCharacteristicModifierSource,
>(
  input: string,
  modifier: Modifier,
  grouped: boolean,
  applicability: NumericModifierApplicability,
  origin: RosterCharacteristicStepOrigin = "own",
): {
  readonly step: RosterCharacteristicStep<Modifier>;
  readonly diagnostics: readonly Diagnostic[];
} {
  if (applicability === "notApplicable") {
    return {
      step: { status: "notApplicable", modifier, grouped, origin, input },
      diagnostics: [],
    };
  }

  const issues: RosterCharacteristicModifierIssue[] = [];
  if (applicability === "unresolved") {
    issues.push("applicabilityUnresolved");
  }
  if (modifier.repeats.length > 0) {
    issues.push("repeated");
  }
  // `affects` overrides `scope` in New Recruit, which is what authors target
  // when they write both, so a routed modifier's scope is not an issue.
  if (modifier.scope !== undefined && origin === "own") {
    issues.push("scoped");
  }
  if (unsupportedAttributes(modifier, origin).length > 0) {
    issues.push("unsupportedAttributes");
  }

  const kind = characteristicKind(modifier.type);
  if (modifier.type === undefined) {
    issues.push("missingType");
  } else if (kind === undefined) {
    issues.push("unsupportedType");
  }
  if (modifier.value === undefined) {
    issues.push("missingValue");
  }

  if (issues.length === 0 && kind !== undefined && modifier.value !== undefined) {
    return {
      step: {
        status: "applied",
        modifier,
        grouped,
        origin,
        kind,
        input,
        output: modifier.value,
      },
      diagnostics: [],
    };
  }

  return {
    step: {
      status: "unapplied",
      modifier,
      grouped,
      origin,
      input,
      issues,
      ...(kind === undefined ? {} : { kind }),
    },
    diagnostics: issues.map((issue) =>
      modifierDiagnostic(modifier, issue, origin),
    ),
  };
}

/**
 * Collects modifiers that route to this profile through an `affects` selector.
 *
 * A selector is declared by some occurrence and reaches outward, so this walks
 * the profile owner's ancestors — and the owner itself — and asks, for each
 * `affects` modifier found, whether this occurrence falls in its target set.
 *
 * Traversal semantics were verified against New Recruit on 2026-08-19:
 *
 * - `own` reaches only the declaring occurrence.
 * - `children` reaches its direct child **entries**. Selection-entry group
 *   members are reached only when the selector carries an explicit `group`
 *   segment.
 * - `descendants` reaches every descendant.
 *
 * An embedded category ID filters the target set to occurrences holding that
 * category, using the same effective membership that condition identity uses.
 * An embedded ID naming anything else routes nothing; the corpus contains one
 * such instance and its meaning is unestablished.
 *
 * The route test counts *entry* steps and treats a selection-entry-group
 * occurrence as a non-entry step, so it is correct whether the roster flattens
 * groups — as browser editing does — or retains group occurrences, as headless
 * construction can.
 */
function collectAffectsRoutedModifiers(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterSelection,
  profile: RosterCharacteristicProfileSource,
): {
  readonly modifiers: readonly {
    readonly modifier: RosterCharacteristicModifierSource;
    readonly grouped: boolean;
    readonly declaredBy: RosterSelection;
  }[];
  readonly partial: boolean;
} {
  if (!rosterMatchesCatalogueContext(roster, context)) {
    return { modifiers: [], partial: false };
  }
  const choices = indexEvaluationChoices(context);
  const locations = rosterSelectionLocations(roster);
  const ownerLocation = locations.find(
    (location) => location.occurrence === owner,
  );
  if (ownerLocation === undefined) {
    return { modifiers: [], partial: false };
  }

  const typeName = declaredProfileTypeName(context, profile);
  // Nearest ancestor first is irrelevant to the result but keeps step order
  // deterministic: outermost declaration runs first, like source order.
  const chain = [...ownerLocation.ancestors].reverse();
  const candidates = [...chain, owner];

  const collected: {
    readonly modifier: RosterCharacteristicModifierSource;
    readonly grouped: boolean;
    readonly declaredBy: RosterSelection;
  }[] = [];
  let partial = false;

  for (const declarer of candidates) {
    const resolution = resolveEvaluationSelection(declarer, choices, true);
    const choice = resolution.choices[0];
    if (resolution.status !== "resolved" || choice === undefined) {
      // An unreadable ancestor might declare a selector aimed here.
      partial = true;
      continue;
    }
    if (!hasAffectsModifier(choice)) {
      continue;
    }
    if (typeName === undefined) {
      // Without a resolved profile type no selector can be matched by name,
      // and one of these might have targeted this profile.
      partial = true;
      continue;
    }
    const route = routeFromDeclarer(declarer, owner, locations, choices);
    for (const entry of affectsModifiers(choice)) {
      const value = entry.modifier.node.attributes.affects;
      if (value === undefined) continue;
      const selector = parseBattleScribeAffectsSelector(value);
      if (!selector.supported || selector.profileTypeName === undefined) {
        continue;
      }
      const wanted = selector.profileTypeName.toLowerCase();
      if (wanted !== "all" && wanted !== typeName.toLowerCase()) {
        continue;
      }
      if (!reaches(selector, route)) {
        continue;
      }
      if (selector.filterId !== undefined) {
        const categories = effectiveRosterCategories(roster, context).get(
          owner,
        );
        if (categories === undefined) {
          // Membership unknown, so whether the filter admits this occurrence
          // cannot be decided either way.
          partial = true;
          continue;
        }
        if (!categories.includes(selector.filterId)) {
          continue;
        }
      }
      collected.push({
        modifier: entry.modifier,
        grouped: entry.grouped,
        declaredBy: declarer,
      });
    }
  }
  return { modifiers: collected, partial };
}

interface AffectsRoute {
  /** Entry steps between the declarer and this occurrence; 0 means the same. */
  readonly entrySteps: number;
  /** True when reaching it passed through a selection-entry group. */
  readonly viaGroup: boolean;
  readonly reachable: boolean;
}

function reaches(
  selector: { readonly traversal: string; readonly entersGroups: boolean },
  route: AffectsRoute,
): boolean {
  if (!route.reachable) return false;
  if (selector.traversal === "own") return route.entrySteps === 0;
  if (route.entrySteps === 0) return false;
  if (route.viaGroup && !selector.entersGroups) {
    // `entries` alone does not descend into groups; `recursive` does.
    if (selector.traversal !== "descendants") return false;
  }
  return selector.traversal === "descendants" || route.entrySteps === 1;
}

function routeFromDeclarer(
  declarer: RosterSelection,
  owner: RosterSelection,
  locations: readonly {
    readonly occurrence: RosterSelection;
    readonly ancestors: readonly RosterSelection[];
  }[],
  choices: EvaluationChoiceIndex,
): AffectsRoute {
  if (declarer === owner) {
    return { entrySteps: 0, viaGroup: false, reachable: true };
  }
  const ownerLocation = locations.find(
    (location) => location.occurrence === owner,
  );
  if (ownerLocation === undefined) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  const index = ownerLocation.ancestors.indexOf(declarer);
  if (index === -1) {
    return { entrySteps: 0, viaGroup: false, reachable: false };
  }
  // `ancestors` is nearest-first, so everything before the declarer plus the
  // occurrence itself is the path walked down from it.
  const path = [...ownerLocation.ancestors.slice(0, index), owner];
  let entrySteps = 0;
  let viaGroup = false;
  for (const step of path) {
    const resolution = resolveEvaluationSelection(step, choices, true);
    const choice = resolution.choices[0];
    if (choice?.kind === "selectionEntryGroup") {
      viaGroup = true;
      continue;
    }
    entrySteps += 1;
  }
  if (!viaGroup) {
    // A flattened roster keeps group members as direct children, so the
    // definition side decides whether the hop passed through a group.
    viaGroup = passesThroughGroupDefinition(declarer, path[0], choices);
  }
  return { entrySteps, viaGroup, reachable: true };
}

/**
 * True when the child's definition is a member of one of the parent's
 * selection-entry groups rather than one of its direct entries.
 */
function passesThroughGroupDefinition(
  parent: RosterSelection,
  child: RosterSelection | undefined,
  choices: EvaluationChoiceIndex,
): boolean {
  if (child === undefined) return false;
  const parentChoice = resolveEvaluationSelection(parent, choices, true)
    .choices[0];
  const childChoice = resolveEvaluationSelection(child, choices, true)
    .choices[0];
  if (parentChoice === undefined || childChoice === undefined) return false;
  const direct = [
    ...parentChoice.selectionEntries,
    ...parentChoice.entryLinks.filter(
      (link): link is EvaluationSelectionChoice =>
        link.kind !== "unresolvedEntryLink",
    ),
  ];
  if (direct.includes(childChoice)) return false;
  const inGroups = (group: EvaluationSelectionChoice): boolean =>
    group.selectionEntries.includes(
      childChoice as (typeof group.selectionEntries)[number],
    ) ||
    group.entryLinks.some((link) => link === childChoice) ||
    group.selectionEntryGroups.some(inGroups);
  return parentChoice.selectionEntryGroups.some(inGroups);
}

function affectsModifiers(choice: EvaluationSelectionChoice): readonly {
  readonly modifier: RosterCharacteristicModifierSource;
  readonly grouped: boolean;
}[] {
  const out: {
    readonly modifier: RosterCharacteristicModifierSource;
    readonly grouped: boolean;
  }[] = [];
  const visit = (group: {
    readonly modifiers: readonly RosterCharacteristicModifierSource[];
    readonly modifierGroups: readonly unknown[];
  }): void => {
    for (const modifier of group.modifiers) {
      if (modifier.node.attributes.affects !== undefined) {
        out.push({ modifier, grouped: true });
      }
    }
    for (const child of group.modifierGroups) {
      visit(child as Parameters<typeof visit>[0]);
    }
  };
  for (const modifier of choice.modifiers) {
    if (modifier.node.attributes.affects !== undefined) {
      out.push({ modifier, grouped: false });
    }
  }
  for (const group of choice.modifierGroups) {
    visit(group);
  }
  return out;
}

function hasAffectsModifier(choice: EvaluationSelectionChoice): boolean {
  const inGroup = (group: {
    readonly modifiers: readonly { readonly node: { readonly attributes: Readonly<Record<string, string>> } }[];
    readonly modifierGroups: readonly unknown[];
  }): boolean =>
    group.modifiers.some(
      (modifier) => modifier.node.attributes.affects !== undefined,
    ) ||
    (group.modifierGroups as readonly Parameters<typeof inGroup>[0][]).some(
      inGroup,
    );
  return (
    choice.modifiers.some(
      (modifier) => modifier.node.attributes.affects !== undefined,
    ) || choice.modifierGroups.some(inGroup)
  );
}

function declaredProfileTypeName(
  context: BattleScribeCatalogueContext,
  profile: RosterCharacteristicProfileSource,
): string | undefined {
  if (profile.typeId === undefined) return undefined;
  const candidates = (
    context.graph.objectsById.get(profile.typeId) ?? []
  ).filter((object) => object.kind === "profileType");
  if (candidates.length !== 1) return undefined;
  const name = (candidates[0]?.source as { readonly name?: string }).name;
  return typeof name === "string" && name !== "" ? name : undefined;
}

function currentValue<Modifier extends RosterCharacteristicModifierSource>(
  steps: readonly RosterCharacteristicStep<Modifier>[],
  baseValue: string,
): string {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step !== undefined && step.status === "applied") {
      return step.output;
    }
  }
  return baseValue;
}

/**
 * The effective value is known when nothing after the last applied step could
 * still change it. Every supported operation replaces its input rather than
 * reading it, so an unapplied step before the last applied step cannot affect
 * the result. An unapplied step after it leaves the value unknown.
 */
function effectiveValue<Modifier extends RosterCharacteristicModifierSource>(
  steps: readonly RosterCharacteristicStep<Modifier>[],
  baseValue: string,
): string | undefined {
  let lastApplied = -1;
  for (let index = 0; index < steps.length; index += 1) {
    if (steps[index]?.status === "applied") {
      lastApplied = index;
    }
  }
  for (let index = lastApplied + 1; index < steps.length; index += 1) {
    if (steps[index]?.status === "unapplied") {
      return undefined;
    }
  }
  return currentValue(steps, baseValue);
}

function characteristicKind(
  value: string | undefined,
): RosterCharacteristicModifierKind | undefined {
  return value === "set" ? value : undefined;
}

function routableCharacteristicTypeIds(
  characteristics: readonly RosterCharacteristicSource[],
): ReadonlyMap<ObjectId, number> {
  const counts = new Map<ObjectId, number>();
  for (const { typeId } of characteristics) {
    if (typeId !== undefined) {
      counts.set(typeId, (counts.get(typeId) ?? 0) + 1);
    }
  }
  return counts;
}

function targetsRoutableCharacteristic(
  modifier: RosterCharacteristicModifierSource,
  routable: ReadonlyMap<ObjectId, number>,
): boolean {
  return (
    modifier.field !== undefined &&
    routable.get(modifier.field as ObjectId) === 1
  );
}

function routingReason(
  modifier: RosterCharacteristicModifierSource,
  routable: ReadonlyMap<ObjectId, number>,
): RosterCharacteristicRoutingReason | undefined {
  if (modifier.field === undefined) {
    return "missingField";
  }
  const matches = routable.get(modifier.field as ObjectId) ?? 0;
  if (matches === 1) {
    return undefined;
  }
  return matches === 0 ? "characteristicAbsent" : "characteristicAmbiguous";
}

function groupTargetsRoutableCharacteristic<
  Modifier extends RosterCharacteristicModifierSource,
>(
  group: RosterModifierGroupSource<Modifier>,
  routable: ReadonlyMap<ObjectId, number>,
): boolean {
  return (
    group.modifiers.some((modifier) =>
      targetsRoutableCharacteristic(modifier, routable),
    ) ||
    group.modifierGroups.some((child) =>
      groupTargetsRoutableCharacteristic(child, routable),
    )
  );
}

function groupTargetsField<
  Modifier extends RosterCharacteristicModifierSource,
>(group: RosterModifierGroupSource<Modifier>, field: string): boolean {
  return (
    group.modifiers.some((modifier) => modifier.field === field) ||
    group.modifierGroups.some((child) => groupTargetsField(child, field))
  );
}

function groupedTargetCount<
  Modifier extends RosterCharacteristicModifierSource,
>(group: RosterModifierGroupSource<Modifier>, typeId: string): number {
  return (
    group.modifiers.filter(({ field }) => field === typeId).length +
    group.modifierGroups.reduce(
      (count, child) => count + groupedTargetCount<Modifier>(child, typeId),
      0,
    )
  );
}

function profileOwnedModifiers<
  Modifier extends RosterCharacteristicModifierSource,
>(
  profile: RosterCharacteristicProfileSource<
    RosterCharacteristicSource,
    Modifier
  >,
): readonly { readonly modifier: Modifier; readonly grouped: boolean }[] {
  const owned: { readonly modifier: Modifier; readonly grouped: boolean }[] =
    profile.modifiers.map((modifier) => ({ modifier, grouped: false }));

  const visit = (group: RosterModifierGroupSource<Modifier>): void => {
    for (const modifier of group.modifiers) {
      owned.push({ modifier, grouped: true });
    }
    for (const child of group.modifierGroups) {
      visit(child);
    }
  };
  for (const group of profile.modifierGroups) {
    visit(group);
  }
  return owned;
}

/**
 * `comment` is already treated as inert metadata on modifier groups and
 * conditions, so it does not make a characteristic modifier unsupported here.
 */
function unsupportedAttributes(
  modifier: RosterCharacteristicModifierSource,
  origin: RosterCharacteristicStepOrigin = "own",
): readonly string[] {
  const supported = new Set(["type", "field", "value", "scope", "comment"]);
  // A routed modifier reached this profile *because* of its selector, and its
  // scope is overridden, so neither counts against it.
  if (origin === "affects") {
    supported.add("affects");
  }
  return Object.keys(modifier.node.attributes).filter(
    (attribute) => !supported.has(attribute),
  );
}

function modifierDiagnostic(
  modifier: RosterCharacteristicModifierSource,
  issue: RosterCharacteristicModifierIssue,
  origin: RosterCharacteristicStepOrigin = "own",
): Diagnostic {
  const descriptions: Record<
    RosterCharacteristicModifierIssue,
    readonly [string, string, string | undefined]
  > = {
    applicabilityUnresolved: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_APPLICABILITY_UNRESOLVED",
      "A characteristic modifier's applicability could not be resolved.",
      undefined,
    ],
    repeated: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_REPEAT_UNSUPPORTED",
      "A characteristic modifier has repeat behavior that is not evaluated.",
      undefined,
    ],
    scoped: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_SCOPE_UNSUPPORTED",
      "A characteristic modifier has scoped behavior that is not evaluated.",
      "scope",
    ],
    unsupportedAttributes: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_ATTRIBUTES_UNSUPPORTED",
      "A characteristic modifier has generic attributes with unsupported behavior.",
      unsupportedAttributes(modifier, origin)[0],
    ],
    missingType: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_TYPE_MISSING",
      "A characteristic modifier has no operation type.",
      "type",
    ],
    unsupportedType: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_TYPE_UNSUPPORTED",
      `Characteristic modifier operation ${modifier.type} is not supported.`,
      "type",
    ],
    missingValue: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_VALUE_MISSING",
      "A characteristic modifier has no replacement value.",
      "value",
    ],
  };
  const [code, message, attribute] = descriptions[issue];
  return characteristicDiagnostic(modifier, code, message, attribute, {
    issue,
    type: modifier.type,
    field: modifier.field,
    value: modifier.value,
    scope: modifier.scope,
    attributes: modifier.node.attributes,
  });
}

function routingDiagnostic(
  modifier: RosterCharacteristicModifierSource,
  reason: RosterCharacteristicRoutingReason,
): Diagnostic {
  const descriptions: Record<
    RosterCharacteristicRoutingReason,
    readonly [string, string, string | undefined]
  > = {
    missingField: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_TARGET_MISSING",
      "A profile-owned modifier has no target field, so its display behavior is unknown.",
      "field",
    ],
    characteristicAbsent: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_TARGET_MISSING",
      "A profile-owned modifier does not target a characteristic type on its own profile.",
      "field",
    ],
    characteristicAmbiguous: [
      "EVALUATION_CHARACTERISTIC_MODIFIER_TARGET_AMBIGUOUS",
      "A profile has more than one characteristic of the modifier's target type.",
      "field",
    ],
  };
  const [code, message, attribute] = descriptions[reason];
  return characteristicDiagnostic(modifier, code, message, attribute, {
    reason,
    type: modifier.type,
    field: modifier.field,
    attributes: modifier.node.attributes,
  });
}

function characteristicDiagnostic(
  modifier: RosterCharacteristicModifierSource,
  code: string,
  message: string,
  attribute: string | undefined,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["validation", "compatibility"],
    location: {
      source: modifier.source,
      path:
        attribute === undefined
          ? modifier.path
          : [...modifier.path, `@${attribute}`],
    },
    details,
  };
}
