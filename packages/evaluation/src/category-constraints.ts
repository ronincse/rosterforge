/**
 * Evaluates force-category links and category-definition counts at roster or
 * parent-force scope against effective membership, including nested upgrades.
 *
 * Force bounds live on a force definition's category links, rather than on a
 * selectable entry. The pinned 40K corpus uses them for the roster-wide
 * Character minimum, including a primary-catalogue exemption modifier. Keeping
 * this as its own report family avoids pretending the rule belongs to an
 * arbitrary selection or to the force-count constraints in
 * `force-constraints.ts`.
 */

import type {
  BattleScribeCatalogueContext,
  BattleScribeCategoryDefinition,
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
export type RosterCategoryConstraintScope = "roster" | "parent";

export interface RosterCategoryConstraintReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterForce;
  readonly definition: BattleScribeForceDefinition;
  readonly categoryLink?: BattleScribeForceCategoryLink;
  readonly categoryDefinition?: BattleScribeCategoryDefinition;
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
 * Collects category-link and category-definition bounds for roster forces.
 *
 * The implementation deliberately supports only the measured corpus shape:
 * finite shared min/max selection bounds. Roster bounds retain the original
 * descendant traversal. Parent bounds count the owning force roots by default,
 * optionally their descendant selections, without crossing into child forces.
 * Any wider BattleScribe shape remains visible as incomplete
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
  let categoryDefinitionsInspected = false;

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
    // Roster definitions apply once; parent definitions apply once per force
    // category context, even with zero selected members. Multiple links never
    // create duplicate definition findings. The source owner remains distinct.
    if (definition) {
      for (const category of context.categories.definitions) {
        for (const constraint of category.source.constraints) {
          if (constraint.scope !== "parent" && categoryDefinitionsInspected) continue;
          const inspected = inspectCategoryConstraint(roster, context, owner, definition,
            ownerResolution, undefined, constraint, effectiveCategories, category);
          diagnostics.push(...inspected.diagnostics);
          if (inspected.ok) constraints.push(inspected.value);
        }
      }
      categoryDefinitionsInspected = true;
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
  categoryLink: BattleScribeForceCategoryLink | undefined,
  constraint: RosterCategoryConstraintSource,
  effectiveCategories: ReadonlyMap<
    RosterSelection,
    readonly ObjectId[] | undefined
  >,
  categoryDefinition?: BattleScribeCategoryDefinition,
): Result<RosterCategoryConstraintReport> {
  const diagnostics: Diagnostic[] = [];
  const constraintType =
    constraint.type === "min" || constraint.type === "max"
      ? constraint.type
      : undefined;
  const scope = constraint.scope === "roster" || constraint.scope === "parent" ? constraint.scope : undefined;
  const baseLimit =
    constraint.value !== undefined &&
    Number.isFinite(constraint.value) &&
    constraint.value >= 0
      ? constraint.value
      : undefined;
  const source = categoryDefinition?.source ?? categoryLink!.source;
  const categoryTargets = categoryDefinition
    ? context.categories.definitions.filter(c => c.source.id === source.id).length
    : categoryLink!.targets.length;
  const categoryId = categoryDefinition
    ? categoryTargets === 1 ? source.id : undefined
    : categoryLink!.status === "resolved" && categoryTargets === 1 ? categoryLink!.targetId : undefined;
  const categoryName =
    categoryDefinition?.source.name ?? categoryLink?.targets[0]?.source.name ??
    source.name ??
    categoryId ??
    "Category";

  const knownAttributes = new Set(["id", "type", "field", "scope", "value", "shared", "percentValue", "includeChildSelections", "includeChildForces", "comment"]);
  const invalidBoolean = ["shared", "percentValue", "includeChildSelections", "includeChildForces"].some(key => constraint.node.attributes[key] !== undefined && !["true", "false", "1", "0"].includes(constraint.node.attributes[key]!));
  const unknownShape = invalidBoolean || Object.keys(constraint.node.attributes).some(key => !knownAttributes.has(key)) || constraint.node.children.some(child => child.kind === "element");
  const parentLinks = categoryDefinition && scope === "parent"
    ? definition.categoryLinks.filter(link => link.targetId === categoryId) : [];
  const parentContextKnown = !categoryDefinition || scope !== "parent" ||
    (parentLinks.length > 0 && parentLinks.every(link => link.status === "resolved" && link.targets.length === 1));
  const supportedShape = !unknownShape && parentContextKnown &&
    categoryId !== undefined &&
    constraintType !== undefined &&
    scope !== undefined &&
    baseLimit !== undefined &&
    constraint.field === "selections" &&
    constraint.shared === true &&
    constraint.percentValue !== true &&
    (scope === "parent"
      ? constraint.includeChildForces !== true
      : constraint.includeChildSelections === true && (categoryDefinition !== undefined || constraint.includeChildForces === true));
  if (!supportedShape) {
    diagnostics.push(
      categoryConstraintDiagnostic(
        constraint,
        "EVALUATION_CATEGORY_CONSTRAINT_SHAPE_UNSUPPORTED",
        "This force-category requirement uses a shape ForceWright does not evaluate yet.",
        {
          categoryStatus: categoryLink?.status ?? "definition",
          categoryTargets,
          type: constraint.type,
          field: constraint.field,
          scope: constraint.scope,
          shared: constraint.shared,
          includeChildSelections: constraint.includeChildSelections,
          includeChildForces: constraint.includeChildForces,
          percentValue: constraint.percentValue,
          value: constraint.value,
          unknownShape,
          parentContextKnown,
        },
      ),
    );
  }

  const constraintId = constraint.id;
  const modifiers =
    constraintId === undefined
      ? []
      : source.modifiers.filter(
          (modifier) => modifier.field === constraintId,
        );
  // At roster scope, direct definition-owned modifiers use the link evaluator.
  // Only modifier groups targeting this exact bound affect its uncertainty.
  const targetsBound = (group: (typeof source.modifierGroups)[number]): boolean => constraintId !== undefined && (group.modifiers.some(modifier => modifier.field === constraintId) || group.modifierGroups.some(targetsBound));
  // Parent ownership is newly bounded to static limits. Reusing force-owned
  // condition context for a category-relative modifier would guess its scope.
  const unsupportedParentModifiers = scope === "parent" && modifiers.length > 0;
  const unsupportedModifiers = source.modifierGroups.some(targetsBound) || unsupportedParentModifiers;
  if (unsupportedModifiers) {
    diagnostics.push(
      categoryConstraintDiagnostic(
        constraint,
        unsupportedParentModifiers ? "EVALUATION_CATEGORY_CONSTRAINT_PARENT_MODIFIERS_UNSUPPORTED" : "EVALUATION_CATEGORY_CONSTRAINT_MODIFIER_GROUPS_UNSUPPORTED",
        "Grouped limits and parent-category limit modifiers are preserved but not evaluated.",
        { modifierGroups: source.modifierGroups.length, categoryDefinition: categoryDefinition !== undefined },
      ),
    );
  }

  const modifierApplicability: RosterModifierApplicabilityReport<RosterCategoryConstraintModifier>[] = [];
  for (const modifier of unsupportedParentModifiers ? [] : modifiers) {
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
      : evaluateNumericModifierSequence(baseLimit, unsupportedParentModifiers ? [] : modifiers, {
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
    const rootForces = new Set(roster.forces);
    const directSelections = new Set(owner.selections);
    for (const { occurrence, force } of rosterSelectionLocations(roster)) {
      if (scope === "parent") {
        if (force !== owner || (constraint.includeChildSelections !== true && !directSelections.has(occurrence))) continue;
      } else if (categoryDefinition && constraint.includeChildForces !== true && !rootForces.has(force)) continue;
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
    unsupportedModifiers
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
      ...(categoryLink ? { categoryLink } : {}),
      ...(categoryDefinition ? { categoryDefinition } : {}),
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
