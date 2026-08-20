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
import {
  affectsModifiers,
  hasAffectsModifier,
  reaches,
  resolveAffectsAnchor,
  routeFromAnchor,
} from "./affects-routing.js";
import { effectiveRosterCategories } from "./effective-categories.js";
import {
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
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
 * The characteristic operations whose target and result are established by the
 * source shape alone. `set` replaces the projected lexical value and never
 * inspects the value it replaces, so it needs no numeric grammar for observed
 * forms such as `3+`, `36"`, or `D6`. `append` concatenates onto that value
 * through a declared `join` separator, which is text handling rather than
 * arithmetic — but only when the separator is non-empty; see
 * `appendSeparator`.
 */
export type RosterCharacteristicModifierKind =
  | "set"
  | "append"
  | "increment"
  | "decrement"
  | "floor"
  | "ceil"
  | "replace";

export type RosterCharacteristicModifierIssue =
  | "applicabilityUnresolved"
  | "repeated"
  | "scoped"
  | "unsupportedAttributes"
  | "missingType"
  | "unsupportedType"
  | "missingValue"
  | "missingSeparator"
  | "nonIntegerOperand"
  | "noNumericMatch"
  | "ambiguousPosition"
  | "unsupportedPosition"
  | "missingSearchTerm"
  | "emptySearchTerm"
  | "booleanReplacement";

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
  /** The occurrence that declared the modifier. */
  readonly declaredBy: RosterSelection;
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
  readonly declaredBy: RosterSelection;
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
  readonly declaredBy: RosterSelection;
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
          "own",
          owner,
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
          "own",
          owner,
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
    // Routed steps chain with each other, not just with the owner's own
    // steps. `set` ignored its input so this was invisible until `append`,
    // `increment`, `decrement`, and `replace` began reading theirs: a
    // positioned increment followed by a routed replace has to see the
    // incremented value.
    const priorRouted = routedSteps.get(report) ?? [];
    const step = evaluateStep<Modifier>(
      currentValue([...report.steps, ...priorRouted], report.baseValue),
      entry.modifier as Modifier,
      entry.grouped,
      evaluated.value.evaluated ? evaluated.value.status : "unresolved",
      "affects",
      entry.declaredBy,
    );
    diagnostics.push(...step.diagnostics);
    routedSteps.set(report, [...priorRouted, step.step]);
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
  origin: RosterCharacteristicStepOrigin,
  declaredBy: RosterSelection,
): {
  readonly step: RosterCharacteristicStep<Modifier>;
  readonly diagnostics: readonly Diagnostic[];
} {
  if (applicability === "notApplicable") {
    return {
      step: {
        status: "notApplicable",
        modifier,
        grouped,
        origin,
        declaredBy,
        input,
      },
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
  // `replace` with no `value` deletes the match, which is how 164 of the 189
  // corpus replaces are written, so an absent value is not a defect there.
  if (modifier.value === undefined && kind !== "replace") {
    issues.push("missingValue");
  }

  // `set` never reads what it replaces; every other operation does, so each
  // has more ways to be undecidable.
  let output = modifier.value;
  if (
    kind === "increment" ||
    kind === "decrement" ||
    kind === "floor" ||
    kind === "ceil"
  ) {
    const operand =
      modifier.value !== undefined && isIntegerText(modifier.value.trim())
        ? Number.parseInt(modifier.value.trim(), 10)
        : undefined;
    if (modifier.value !== undefined && operand === undefined) {
      issues.push("nonIntegerOperand");
    } else if (operand !== undefined) {
      const selection = positionedMatches(
        input,
        modifier.node.attributes["position"],
      );
      if ("issue" in selection) {
        issues.push(selection.issue);
      } else {
        // `floor` is a lower bound and `ceil` an upper one, not rounding. A
        // T'au Ethereal's Move is `6"`, incremented by 4 and then `ceil 9`,
        // and New Recruit shows 9" -- a clamp, not a rounding step. `floor 2`
        // on a `3+` save likewise leaves it alone rather than setting it.
        const map =
          kind === "increment"
            ? (value: number): number => value + operand
            : kind === "decrement"
              ? (value: number): number => value - operand
              : kind === "floor"
                ? (value: number): number => Math.max(value, operand)
                : (value: number): number => Math.min(value, operand);
        output = applyToMatches(input, selection.matches, map);
      }
    }
  }
  if (kind === "replace") {
    const needle = modifier.node.attributes["arg"];
    if (needle === undefined) {
      issues.push("missingSearchTerm");
    } else if (needle === "") {
      // An empty search term matches everywhere and nowhere.
      issues.push("emptySearchTerm");
    } else if (modifier.value === "true" || modifier.value === "false") {
      // 20 corpus replaces carry a Boolean where a replacement string belongs,
      // all of them in the bonus-slot idiom where the intent is deletion.
      // Substituting the literal text would print "D6true".
      issues.push("booleanReplacement");
    } else {
      const found = substringMatches(input, needle);
      if (found.length === 0) {
        // Nothing to replace is an applied no-op, not a failure: removing a
        // bonus slot from a weapon that never had one is the idiom's normal
        // path. This mirrors an `add` of a category the selection already has.
        output = input;
      } else {
        const selection = selectByPosition(
          found,
          modifier.node.attributes["position"],
        );
        if ("issue" in selection) {
          issues.push(selection.issue);
        } else {
          output = spliceSpans(input, selection.matches, modifier.value ?? "");
        }
      }
    }
  }
  if (kind === "append") {
    const separator = appendSeparator(modifier);
    if ("issue" in separator) {
      issues.push(separator.issue);
    } else if (modifier.value !== undefined) {
      // Appending onto an empty value emits no separator, the way any ordinary
      // join behaves. Confirmed against New Recruit on 2026-08-20: the corpus's
      // 590 `annotation` modifiers all append through a `", "` separator onto a
      // field no node ever declares, so every one of them starts from empty --
      // and a Manreaper carrying one displays "(Furnace of Plagues)", not
      // "(, Furnace of Plagues)".
      output =
        input === ""
          ? modifier.value
          : `${input}${separator.separator}${modifier.value}`;
    }
  }

  if (issues.length === 0 && kind !== undefined && output !== undefined) {
    return {
      step: {
        status: "applied",
        modifier,
        grouped,
        origin,
        declaredBy,
        kind,
        input,
        output,
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
      declaredBy,
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
  // Any occurrence in the roster can declare a selector that reaches here: a
  // scope may anchor it at a shared ancestor, which is exactly how an
  // enhancement reaches its bearer's weapons without being their parent.
  // Roster document order keeps step order deterministic.
  const candidates = locations.map(({ occurrence }) => occurrence);

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
    for (const entry of affectsModifiers(choice)) {
      const value = entry.modifier.node.attributes.affects;
      if (value === undefined) continue;
      const selector = parseBattleScribeAffectsSelector(value);
      if (!selector.supported || selector.profileTypeName === undefined) {
        continue;
      }
      // `scope` names where the selector stands; `affects` names where it
      // walks. Confirmed in New Recruit, so the anchor is resolved per
      // modifier rather than assumed to be the declarer.
      const anchor = resolveAffectsAnchor(
        declarer,
        entry.modifier.scope,
        locations,
        choices,
      );
      if (anchor.kind !== "resolved") {
        // A scope naming a collection, or one that cannot be resolved, might
        // have anchored somewhere that reaches this profile.
        partial = true;
        continue;
      }
      const route = routeFromAnchor(anchor.anchor, owner, locations, choices);
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
 * The effective value, or `undefined` when a step this evaluator could not
 * apply leaves it untrustworthy.
 *
 * `set` is the only operation that discards its input, so it repairs whatever
 * came before it: an unapplied step ahead of an applied `set` cannot affect the
 * result. Every other operation *reads* the value it is given, so an unapplied
 * step ahead of one corrupts its input even though the step itself applied
 * cleanly. That case reports unknown rather than a confidently wrong number.
 */
function effectiveValue<Modifier extends RosterCharacteristicModifierSource>(
  steps: readonly RosterCharacteristicStep<Modifier>[],
  baseValue: string,
): string | undefined {
  let lastUnapplied = -1;
  for (let index = 0; index < steps.length; index += 1) {
    if (steps[index]?.status === "unapplied") {
      lastUnapplied = index;
    }
  }
  if (lastUnapplied === -1) return currentValue(steps, baseValue);
  // Nothing after `lastUnapplied` is unapplied, so an applied `set` there
  // rebuilds the value from scratch and everything after it reads a sound
  // input.
  for (let index = steps.length - 1; index > lastUnapplied; index -= 1) {
    const step = steps[index];
    if (step?.status === "applied" && step.kind === "set") {
      return currentValue(steps, baseValue);
    }
  }
  return undefined;
}

function characteristicKind(
  value: string | undefined,
): RosterCharacteristicModifierKind | undefined {
  return value === "set" ||
    value === "append" ||
    value === "increment" ||
    value === "decrement" ||
    value === "floor" ||
    value === "ceil" ||
    value === "replace"
    ? value
    : undefined;
}

/**
 * A signed integer inside a characteristic value, with where it sits.
 *
 * Values are lexical: `10`, `3+`, `-1`, `D6+0`, `24"`. Arithmetic works on
 * the digits and preserves everything around them.
 */
interface NumericMatch {
  readonly start: number;
  readonly end: number;
  readonly value: number;
}

function numericMatches(input: string): readonly NumericMatch[] {
  const out: NumericMatch[] = [];
  for (const match of input.matchAll(/-?\d+/gu)) {
    if (match.index === undefined) continue;
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      value: Number.parseInt(match[0], 10),
    });
  }
  return out;
}

/**
 * Chooses which numeric matches an operation affects.
 *
 * New Recruit's editor documents `position` as the "1-Based index of the match
 * to affect", supporting negative indexes, with `0` meaning all. The pinned
 * corpus only ever writes `-1` and `1`.
 *
 * When `position` is absent the default is **not** established, so a value with
 * more than one number is refused rather than guessed at. A value with exactly
 * one number needs no default: every reading selects the same match.
 */
/** True for a decimal integer, optionally signed. No other numeric forms. */
function isIntegerText(value: string): boolean {
  const body = value.startsWith("-") ? value.slice(1) : value;
  return (
    body.length > 0 &&
    [...body].every((char) => char >= "0" && char <= "9")
  );
}

interface ValueSpan {
  readonly start: number;
  readonly end: number;
}

/** Every occurrence of a literal search term, left to right. */
function substringMatches(input: string, needle: string): readonly ValueSpan[] {
  const out: ValueSpan[] = [];
  let from = 0;
  for (;;) {
    const at = input.indexOf(needle, from);
    if (at === -1) break;
    out.push({ start: at, end: at + needle.length });
    from = at + needle.length;
  }
  return out;
}

/** Overwrites the given spans, right to left so earlier offsets stay valid. */
function spliceSpans(
  input: string,
  spans: readonly ValueSpan[],
  replacement: string,
): string {
  let output = input;
  for (const span of [...spans].reverse()) {
    output = output.slice(0, span.start) + replacement + output.slice(span.end);
  }
  return output;
}

/**
 * Narrows a match list to the one `position` names.
 *
 * Shared by arithmetic and `replace`, because the attribute means the same
 * thing for both: which match within the value to affect.
 */
function selectByPosition<Span extends ValueSpan>(
  matches: readonly Span[],
  declared: string | undefined,
):
  | { readonly matches: readonly Span[] }
  | { readonly issue: RosterCharacteristicModifierIssue } {
  if (declared === undefined) {
    return matches.length <= 1
      ? { matches }
      : { issue: "ambiguousPosition" };
  }
  if (!isIntegerText(declared)) return { issue: "unsupportedPosition" };
  const position = Number.parseInt(declared, 10);
  if (position === 0) return { matches };
  const index = position > 0 ? position - 1 : matches.length + position;
  const selected = matches[index];
  return selected === undefined
    ? { issue: "unsupportedPosition" }
    : { matches: [selected] };
}

function positionedMatches(
  input: string,
  declared: string | undefined,
):
  | { readonly matches: readonly NumericMatch[] }
  | { readonly issue: RosterCharacteristicModifierIssue } {
  const matches = numericMatches(input);
  if (matches.length === 0) return { issue: "noNumericMatch" };
  return selectByPosition(matches, declared);
}

/** Rewrites the selected matches, right to left so earlier offsets stay valid. */
function applyToMatches(
  input: string,
  matches: readonly NumericMatch[],
  map: (value: number) => number,
): string {
  let output = input;
  for (const match of [...matches].reverse()) {
    const next = String(map(match.value));
    output = output.slice(0, match.start) + next + output.slice(match.end);
  }
  return output;
}

/**
 * The separator an `append` joins with, or the reason it cannot be executed.
 *
 * An empty separator is a real separator: it concatenates directly. The corpus
 * uses it to open a `+0` bonus slot that a positioned `increment` then bumps,
 * which this evaluator executes end to end. Confirmed against New Recruit on
 * 2026-08-20: an Aeldari Fire Prism with the *Heirloom (A+1)* upgrade displays
 * its dispersed pulse Attacks as `2D6+1` — slot opened, then incremented —
 * while its focused lances, whose Attacks is a plain `2`, is simply `3`,
 * because the category filter keeps the slot off non-dice values.
 *
 * Only an *absent* `join` is refused. Nothing establishes a default separator,
 * and unlike the empty one it is not written deliberately.
 */
function appendSeparator(
  modifier: RosterCharacteristicModifierSource,
): { readonly separator: string } | { readonly issue: RosterCharacteristicModifierIssue } {
  const declared = modifier.node.attributes["join"];
  if (declared === undefined) return { issue: "missingSeparator" };
  return { separator: declared };
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
  const supported = new Set([
    "type",
    "field",
    "value",
    "scope",
    "comment",
    // `join`, `arg`, and `position` are each consumed by the operations that
    // accept them -- `join` by `append`, `arg` by `replace`, `position` by
    // `replace` and the arithmetic pair -- and are inert authoring noise on
    // the rest. New Recruit's editor offers each only where it applies, so a
    // stray one is copy-paste between modifiers rather than behavior. The
    // corpus agrees: all 90 `arg` attributes on an `append` are identical to
    // that append's own value, which no operation could act on.
    "join",
    "arg",
    "position",
  ]);
  // `join` is the separator `append` concatenates with, so it is part of that
  // operation rather than unrouted behavior. It stays unsupported on every
  // other operation, where it has no established meaning.
  if (modifier.type === "append") {
    supported.add("join");
  }
  // `position` selects which numeric match an arithmetic operation affects, so
  // it is part of that operation rather than unrouted behavior.
  if (modifier.type === "increment" || modifier.type === "decrement") {
    supported.add("position");
  }
  // `arg` is the search term and `position` picks which occurrence of it to
  // rewrite, so both are part of the operation.
  if (modifier.type === "replace") {
    supported.add("arg");
    supported.add("position");
  }
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
    missingSeparator: [
      "EVALUATION_CHARACTERISTIC_APPEND_SEPARATOR_MISSING",
      "An append characteristic modifier declares no join separator.",
      "join",
    ],
    missingSearchTerm: [
      "EVALUATION_CHARACTERISTIC_REPLACE_SEARCH_MISSING",
      "A replace characteristic modifier declares no search term.",
      "arg",
    ],
    emptySearchTerm: [
      "EVALUATION_CHARACTERISTIC_REPLACE_SEARCH_EMPTY",
      "A replace characteristic modifier's search term is empty.",
      "arg",
    ],
    booleanReplacement: [
      "EVALUATION_CHARACTERISTIC_REPLACE_VALUE_BOOLEAN",
      "A replace characteristic modifier's replacement value is a Boolean rather than text.",
      "value",
    ],
    nonIntegerOperand: [
      "EVALUATION_CHARACTERISTIC_ARITHMETIC_OPERAND_UNSUPPORTED",
      "An arithmetic characteristic modifier's value is not an integer.",
      "value",
    ],
    noNumericMatch: [
      "EVALUATION_CHARACTERISTIC_ARITHMETIC_NO_MATCH",
      "An arithmetic characteristic modifier found no number to change in the value.",
      undefined,
    ],
    ambiguousPosition: [
      "EVALUATION_CHARACTERISTIC_ARITHMETIC_POSITION_AMBIGUOUS",
      "An arithmetic characteristic modifier declares no position and the value contains more than one number.",
      "position",
    ],
    unsupportedPosition: [
      "EVALUATION_CHARACTERISTIC_ARITHMETIC_POSITION_UNSUPPORTED",
      "An arithmetic characteristic modifier's position is malformed or selects no match.",
      "position",
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
