import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";

import type { ObjectId } from "@rosterforge/foundation";

import type { Roster, RosterSelection } from "@rosterforge/roster-model";

import { evaluateRosterSelectionCategories } from "./categories.js";
import {
  indexEvaluationChoices,
  resolveEvaluationSelection,
  rosterMatchesCatalogueContext,
  rosterSelectionLocations,
  type EffectiveCategoryIndex,
} from "./selection-context.js";

/**
 * Builds the effective category membership of every selection occurrence in a
 * roster, so condition identity can compare what a unit's categories actually
 * are rather than only what its links statically declare.
 *
 * ## The single-pass rule
 *
 * Category membership and condition identity are mutually recursive in
 * principle: a category modifier may carry conditions, and a condition may test
 * a category. This index resolves that with one documented pass rather than a
 * fixpoint.
 *
 * Pass one — this function — evaluates every category modifier's applicability
 * with **no** index available, so any condition it contains compares static
 * links and a category-controlled comparison stays unresolved. Pass two is
 * every ordinary evaluation, which consults the finished index.
 *
 * The consequence is deliberate and permanent: an occurrence whose category
 * modifiers depend on category identity resolves to unknown membership and
 * stays that way. In the pinned corpus that is seven of 892 category modifiers.
 * BattleScribe may iterate to a fixpoint instead; nothing in the data
 * establishes that, so this evaluator refuses the chained case rather than
 * guessing at it.
 *
 * An occurrence absent from the index, or present with `undefined`, has unknown
 * membership and must fall back to the conservative unresolved comparison.
 */
export function indexEffectiveRosterCategories(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): EffectiveCategoryIndex {
  const membership = new Map<RosterSelection, readonly ObjectId[] | undefined>();
  if (!rosterMatchesCatalogueContext(roster, context)) {
    return membership;
  }
  const choices = indexEvaluationChoices(context);

  for (const { occurrence } of rosterSelectionLocations(roster)) {
    const resolution = resolveEvaluationSelection(occurrence, choices, true);
    const choice = resolution.choices[0];
    if (resolution.status !== "resolved" || choice === undefined) {
      membership.set(occurrence, undefined);
      continue;
    }
    // Evaluated without an index in scope: this is pass one.
    const evaluated = evaluateRosterSelectionCategories(
      roster,
      context,
      occurrence,
      choice,
    );
    membership.set(
      occurrence,
      evaluated.ok ? evaluated.value.categories : undefined,
    );
  }
  return membership;
}
