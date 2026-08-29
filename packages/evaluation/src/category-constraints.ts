/**
 * Evaluates force-category bounds against effective roster membership.
 *
 * These bounds live on a force definition's category links, rather than on a
 * selectable entry. The pinned 40K corpus uses them for the roster-wide
 * Character minimum, including a primary-catalogue exemption modifier. Keeping
 * this as its own report family avoids pretending the rule belongs to an
 * arbitrary selection or to the force-count constraints in
 * `force-constraints.ts`.
 */

import type {
  BattleScribeCatalogueContext,
  BattleScribeForceCategoryLink,
  BattleScribeForceDefinition,
} from "@rosterforge/data-graph";
import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type ValidationCompleteness,
} from "@rosterforge/foundation";
import {
  rosterSelectionAmount,
  type Roster,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

import { effectiveRosterCategories } from "./effective-categories.js";
import {
  indexEvaluationForces,
  resolveEvaluationForce,
  rosterForceLocations,
  type EvaluationForceResolution,
} from "./force-context.js";
import {
  evaluateNumericModifierSequence,
  type NumericModifierSequenceReport,
} from "./modifiers.js";
import {
  evaluateRosterModifierApplicability,
  type RosterModifierApplicabilityReport,
} from "./modifier-applicability.js";
import {
  expectedCatalogueKey,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
} from "./selection-context.js";

export type RosterCategoryConstraintSource =
  BattleScribeForceCategoryLink["source"]["constraints"][number];
export type RosterCategoryConstraintModifier =
  BattleScribeForceCategoryLink["source"]["modifiers"][number];
export type RosterCategoryConstraintStatus =
  | "satisfied"
  | "violated"
  | "unresolved";
export type RosterCategoryConstraintType = "min" | "max";
export type RosterCategoryConstraintScope = "roster";

export interface RosterCategoryConstraintReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterForce;
  readonly definition: BattleScribeForceDefinition;
  readonly categoryLink: BattleScribeForceCategoryLink;
  readonly constraint: RosterCategoryConstraintSource;
  readonly ownerResolution: EvaluationForceResolution;
  readonly categoryId?: ObjectId;
  readonly categoryName: string;
  readonly constraintType?: RosterCategoryConstraintType;
  readonly scope?: RosterCategoryConstraintScope;
  readonly baseLimit?: number;
  readonly limit?: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly observed?: number;
  readonly baseStatus: RosterCategoryConstraintStatus;
  readonly status: RosterCategoryConstraintStatus;
  readonly completeness: ValidationCompleteness;
  readonly matching: readonly RosterSelection[];
  readonly unresolved: readonly RosterSelection[];
  readonly modifiers: readonly RosterCategoryConstraintModifier[];
  readonly modifierApplicability: readonly RosterModifierApplicabilityReport<RosterCategoryConstraintModifier>[];
  readonly modifierSequence?: NumericModifierSequenceReport<RosterCategoryConstraintModifier>;
}

export interface RosterCategoryConstraintsForForceReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterForce;
  readonly ownerResolution: EvaluationForceResolution;
  readonly definition?: BattleScribeForceDefinition;
  readonly completeness: ValidationCompleteness;
  readonly constraints: readonly RosterCategoryConstraintReport[];
}

export interface RosterCategoryConstraintsInRosterReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly completeness: ValidationCompleteness;
  readonly forces: readonly RosterCategoryConstraintsForForceReport[];
}

/**
 * Collects category-link bounds for every force occurrence in a roster.
 *
 * The implementation deliberately supports only the measured corpus shape:
 * finite min/max selection bounds at roster scope with child selections and
 * forces included. Any wider BattleScribe shape remains visible as incomplete
 * validation rather than being guessed into a legality result.
 */
export function inspectRosterCategoryConstraintsInRoster(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Result<RosterCategoryConstraintsInRosterReport> {
  const diagnostics: Diagnostic[] = [];
  const forces: RosterCategoryConstraintsForForceReport[] = [];
  const catalogueMatches = rosterMatchesCatalogueContext(roster, context);
  const forceIndex = indexEvaluationForces(context);
  const effectiveCategories = effectiveRosterCategories(roster, context);

  for (const { occurrence: owner } of rosterForceLocations(roster)) {
    const ownerResolution = resolveEvaluationForce(
      owner,
      forceIndex,
      catalogueMatches,
    );
    const definition =
      ownerResolution.status === "resolved"
        ? ownerResolution.definitions[0]
        : undefined;
    if (definition === undefined) {
      diagnostics.push(
        collectionDiagnostic(
          "EVALUATION_CATEGORY_CONSTRAINT_OWNER_DEFINITION_UNRESOLVED",
          "The force definition carrying category requirements could not be resolved uniquely.",
          {
            occurrenceId: owner.id,
            status: ownerResolution.status,
            candidates: ownerResolution.definitions.length,
          },
        ),
      );
    }

    const constraints: RosterCategoryConstraintReport[] = [];
    for (const categoryLink of definition?.categoryLinks ?? []) {
      for (const constraint of categoryLink.source.constraints) {
        const inspected = inspectCategoryConstraint(
          roster,
          context,
          owner,
          definition!,
          ownerResolution,
          categoryLink,
          constraint,
          effectiveCategories,
        );
        diagnostics.push(...inspected.diagnostics);
        if (inspected.ok) constraints.push(inspected.value);
      }
    }
    forces.push({
      roster,
      context,
      owner,
      ownerResolution,
      ...(definition === undefined ? {} : { definition }),
      completeness:
        definition !== undefined &&
        constraints.every(({ completeness }) => completeness === "complete")
          ? "complete"
          : "incomplete",
      constraints,
    });
  }

  if (!catalogueMatches) {
    diagnostics.push(
      collectionDiagnostic(
        "EVALUATION_CATEGORY_CONSTRAINT_CATALOGUE_CONTEXT_MISMATCH",
        "The roster belongs to a different catalogue context.",
        {
          rosterCatalogueKey: roster.catalogue.key,
          contextCatalogueKey: expectedCatalogueKey(context),
        },
      ),
    );
  }

  return success(
    {
      roster,
      context,
      completeness:
        diagnostics.length === 0 &&
        forces.every(({ completeness }) => completeness === "complete")
          ? "complete"
          : "incomplete",
      forces,
    },
    diagnostics,
  );
}

function inspectCategoryConstraint(
  roster: Roster,
  context: BattleScribeCatalogueContext,
  owner: RosterForce,
  definition: BattleScribeForceDefinition,
  ownerResolution: EvaluationForceResolution,
  categoryLink: BattleScribeForceCategoryLink,
  constraint: RosterCategoryConstraintSource,
  effectiveCategories: ReadonlyMap<
    RosterSelection,
    readonly ObjectId[] | undefined
  >,
): Result<RosterCategoryConstraintReport> {
  const diagnostics: Diagnostic[] = [];
  const constraintType =
    constraint.type === "min" || constraint.type === "max"
      ? constraint.type
      : undefined;
  const scope = constraint.scope === "roster" ? "roster" : undefined;
  const baseLimit =
    constraint.value !== undefined &&
    Number.isFinite(constraint.value) &&
    constraint.value >= 0
      ? constraint.value
      : undefined;
  const categoryId =
    categoryLink.status === "resolved" && categoryLink.targets.length === 1
      ? categoryLink.targetId
      : undefined;
  const categoryName =
    categoryLink.targets[0]?.source.name ??
    categoryLink.source.name ??
    categoryId ??
    "Category";

  const supportedShape =
    categoryId !== undefined &&
    constraintType !== undefined &&
    scope !== undefined &&
    baseLimit !== undefined &&
    constraint.field === "selections" &&
    constraint.shared === true &&
    constraint.percentValue !== true &&
    constraint.includeChildSelections === true &&
    constraint.includeChildForces === true;
  if (!supportedShape) {
    diagnostics.push(
      categoryConstraintDiagnostic(
        constraint,
        "EVALUATION_CATEGORY_CONSTRAINT_SHAPE_UNSUPPORTED",
        "This force-category requirement uses a shape RosterForge does not evaluate yet.",
        {
          categoryStatus: categoryLink.status,
          categoryTargets: categoryLink.targets.length,
          type: constraint.type,
          field: constraint.field,
          scope: constraint.scope,
          shared: constraint.shared,
          includeChildSelections: constraint.includeChildSelections,
          includeChildForces: constraint.includeChildForces,
          percentValue: constraint.percentValue,
          value: constraint.value,
        },
      ),
    );
  }

  const constraintId = constraint.id;
  const modifiers =
    constraintId === undefined
      ? []
      : categoryLink.source.modifiers.filter(
          (modifier) => modifier.field === constraintId,
        );
  if (categoryLink.source.modifierGroups.length > 0) {
    diagnostics.push(
      categoryConstraintDiagnostic(
        constraint,
        "EVALUATION_CATEGORY_CONSTRAINT_MODIFIER_GROUPS_UNSUPPORTED",
        "Grouped modifiers on force-category requirements are preserved but not evaluated.",
        { modifierGroups: categoryLink.source.modifierGroups.length },
      ),
    );
  }

  const modifierApplicability: RosterModifierApplicabilityReport<RosterCategoryConstraintModifier>[] = [];
  for (const modifier of modifiers) {
    const evaluated = evaluateRosterModifierApplicability(
      roster,
      context,
      owner,
      modifier,
      { effectiveCategories },
    );
    diagnostics.push(...evaluated.diagnostics);
    if (evaluated.ok) modifierApplicability.push(evaluated.value);
  }
  const applicabilityByModifier = new Map(
    modifierApplicability.map((report) => [report.modifier, report] as const),
  );
  const modifierSequence =
    baseLimit === undefined
      ? undefined
      : evaluateNumericModifierSequence(baseLimit, modifiers, {
          applicability: (modifier) => {
            const report = applicabilityByModifier.get(modifier);
            return report?.evaluated === true ? report.status : undefined;
          },
          conditionGroupsEvaluated: (modifier) =>
            applicabilityByModifier.get(modifier)?.evaluated === true,
        });
  if (modifierSequence !== undefined) {
    diagnostics.push(...modifierSequence.diagnostics);
  }
  const limit = modifierSequence?.ok
    ? modifierSequence.value.value
    : baseLimit;

  const matching: RosterSelection[] = [];
  const unresolved: RosterSelection[] = [];
  let minimum = 0;
  let maximum = 0;
  if (supportedShape) {
    for (const { occurrence } of rosterSelectionLocations(roster)) {
      const amount = rosterSelectionAmount(occurrence);
      const categories = effectiveCategories.get(occurrence);
      if (!Number.isFinite(amount) || amount < 0) {
        unresolved.push(occurrence);
        maximum = Number.POSITIVE_INFINITY;
      } else if (categories === undefined) {
        unresolved.push(occurrence);
        maximum += amount;
      } else if (categories.includes(categoryId)) {
        matching.push(occurrence);
        minimum += amount;
        maximum += amount;
      }
    }
  }
  if (unresolved.length > 0) {
    diagnostics.push(
      categoryConstraintDiagnostic(
        constraint,
        "EVALUATION_CATEGORY_CONSTRAINT_MEMBERSHIP_UNRESOLVED",
        "Some roster selections have unknown effective category membership.",
        { unresolved: unresolved.length, minimum, maximum },
      ),
    );
  }

  const baseStatus = constraintStatus(
    supportedShape,
    constraintType,
    baseLimit,
    minimum,
    maximum,
  );
  const status =
    modifierSequence?.ok === false ||
    modifierSequence?.value.completeness === "incomplete" ||
    categoryLink.source.modifierGroups.length > 0
      ? "unresolved"
      : constraintStatus(
          supportedShape,
          constraintType,
          limit,
          minimum,
          maximum,
        );

  return success(
    {
      roster,
      context,
      owner,
      definition,
      categoryLink,
      constraint,
      ownerResolution,
      ...(categoryId === undefined ? {} : { categoryId }),
      categoryName,
      ...(constraintType === undefined ? {} : { constraintType }),
      ...(scope === undefined ? {} : { scope }),
      ...(baseLimit === undefined ? {} : { baseLimit }),
      ...(limit === undefined ? {} : { limit }),
      minimum,
      maximum,
      ...(minimum === maximum ? { observed: minimum } : {}),
      baseStatus,
      status,
      completeness: diagnostics.length === 0 ? "complete" : "incomplete",
      matching,
      unresolved,
      modifiers,
      modifierApplicability,
      ...(modifierSequence?.ok === true
        ? { modifierSequence: modifierSequence.value }
        : {}),
    },
    diagnostics,
  );
}

function constraintStatus(
  supported: boolean,
  type: RosterCategoryConstraintType | undefined,
  limit: number | undefined,
  minimum: number,
  maximum: number,
): RosterCategoryConstraintStatus {
  if (!supported || type === undefined || limit === undefined) {
    return "unresolved";
  }
  if (type === "min") {
    if (minimum >= limit) return "satisfied";
    return maximum < limit ? "violated" : "unresolved";
  }
  if (maximum <= limit) return "satisfied";
  return minimum > limit ? "violated" : "unresolved";
}

function categoryConstraintDiagnostic(
  constraint: RosterCategoryConstraintSource,
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility", "validation"],
    location: { source: constraint.source, path: constraint.path },
    details,
  };
}

function collectionDiagnostic(
  code: string,
  message: string,
  details: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility", "resolution"],
    details,
  };
}
