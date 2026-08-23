import type {
  BattleScribeCatalogueContext,
  MaterializedEntryLink,
  MaterializedSelectionEntry,
  MaterializedSelectionEntryGroup,
} from "@rosterforge/data-graph";

import { objectId, type ObjectId } from "@rosterforge/foundation";

import {
  rosterDefinitionKeyForSource,
  type Roster,
  type RosterDefinitionKey,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

export type EvaluationSelectionChoice =
  | MaterializedSelectionEntry
  | MaterializedSelectionEntryGroup;

export type EvaluationSelectionStatus =
  | "resolved"
  | "unavailable"
  | "ambiguous"
  | "unresolved";

export interface EvaluationChoiceIndex {
  readonly byKey: ReadonlyMap<
    RosterDefinitionKey,
    readonly EvaluationSelectionChoice[]
  >;
  readonly partial: boolean;
}

export interface EvaluationSelectionResolution {
  readonly occurrence: RosterSelection;
  readonly status: EvaluationSelectionStatus;
  readonly choices: readonly EvaluationSelectionChoice[];
}

export type EvaluationSelectionScope =
  | "self"
  | "parent"
  | "ancestor"
  | "root-entry"
  | "unit"
  | "model"
  | "model-or-unit"
  | "upgrade"
  | "force"
  | "roster"
  /** A scope written as an object ID, naming a containing occurrence. */
  | "identity";

export type EvaluationSelectionCandidateStatus =
  | "match"
  | "different"
  | "unresolved";

export interface EvaluationSelectionIdentityCandidate {
  readonly occurrence: RosterSelection;
  readonly resolution: EvaluationSelectionResolution;
  readonly status: EvaluationSelectionCandidateStatus;
  readonly effectiveIds: readonly ObjectId[];
}

/**
 * Effective category membership per selection occurrence, built by
 * `indexEffectiveRosterCategories`. An occurrence mapped to `undefined`, or
 * absent entirely, has unknown membership.
 *
 * The type lives in this leaf module so the condition layer can accept an index
 * without importing the evaluator that produces it.
 */
export type EffectiveCategoryIndex = ReadonlyMap<
  RosterSelection,
  readonly ObjectId[] | undefined
>;

export interface RosterSelectionLocation {
  readonly occurrence: RosterSelection;
  readonly parent: RosterForce | RosterSelection;
  readonly force: RosterForce;
  readonly ancestors: readonly RosterSelection[];
  readonly root: RosterSelection;
}

export function expectedCatalogueKey(
  context: BattleScribeCatalogueContext,
): RosterDefinitionKey {
  return rosterDefinitionKeyForSource(
    context.document.projection.source.sourceId,
    context.document.projection.path,
  );
}

export function rosterMatchesCatalogueContext(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): boolean {
  return roster.catalogue.key === expectedCatalogueKey(context);
}

/**
 * One built index per catalogue context, for as long as the context lives.
 *
 * Building it walks every root the catalogue materializes and every descendant
 * of each, which is the single most expensive thing this package does. Nothing
 * about a caller's roster changes the result, but eight modules ask for it, and
 * several ask per selection and per field.
 *
 * Measured 2026-08-23 against a Dark Angels roster holding **one** unit: a
 * single `inspectLocalRosterStructuralStatus` rebuilt this **23 times** and
 * visited **2.84 million** nodes doing it. That is the whole reason a six-unit
 * roster took two minutes to validate.
 *
 * A `BattleScribeCatalogueContext` is an immutable projection and this index is
 * a pure function of it, so a cached one cannot go stale. `WeakMap` rather than
 * `Map` so a context that is discarded — a different catalogue selected, a
 * batch re-imported — takes its index with it instead of pinning the whole
 * materialized tree forever.
 */
const evaluationChoiceIndexes = new WeakMap<
  BattleScribeCatalogueContext,
  EvaluationChoiceIndex
>();

export function indexEvaluationChoices(
  context: BattleScribeCatalogueContext,
): EvaluationChoiceIndex {
  const cached = evaluationChoiceIndexes.get(context);
  if (cached !== undefined) return cached;
  const built = buildEvaluationChoiceIndex(context);
  evaluationChoiceIndexes.set(context, built);
  return built;
}

function buildEvaluationChoiceIndex(
  context: BattleScribeCatalogueContext,
): EvaluationChoiceIndex {
  const byKey = new Map<
    RosterDefinitionKey,
    EvaluationSelectionChoice[]
  >();
  let partial = false;

  const visit = (choice: MaterializedEntryLink): void => {
    if (choice.kind === "unresolvedEntryLink") {
      partial ||= choice.reason === "resourceLimit";
      return;
    }
    const key = rosterDefinitionKeyForSource(
      choice.occurrence.source.sourceId,
      choice.occurrence.path,
    );
    const candidates = byKey.get(key);
    if (candidates === undefined) {
      byKey.set(key, [choice]);
    } else if (
      !candidates.some(
        (candidate) =>
          candidate.kind === choice.kind &&
          candidate.occurrence === choice.occurrence,
      )
    ) {
      candidates.push(choice);
    }
    for (const child of choice.selectionEntries) {
      visit(child);
    }
    for (const child of choice.selectionEntryGroups) {
      visit(child);
    }
    for (const child of choice.entryLinks) {
      visit(child);
    }
  };

  for (const root of context.roots.roots) {
    visit(root.materialized);
  }
  return { byKey, partial };
}

export function resolveEvaluationSelection(
  occurrence: RosterSelection,
  choices: EvaluationChoiceIndex,
  catalogueMatches: boolean,
): EvaluationSelectionResolution {
  const candidates = catalogueMatches
    ? (choices.byKey.get(occurrence.definition.key) ?? []).filter(
        (choice) => choice.kind === occurrence.definition.kind,
      )
    : [];
  return {
    occurrence,
    status: resolutionStatus(candidates, choices.partial, catalogueMatches),
    choices: candidates,
  };
}

/**
 * One walk per roster, for as long as that roster object lives.
 *
 * Every caller wants the same flattened view of an immutable tree, and seven
 * modules ask for it — several inside loops. Measured 2026-08-23 on a 143
 * selection Dark Angels army: **2,763 calls in a single structural
 * inspection**, each re-walking all 143 selections.
 *
 * Rosters are immutable and every command returns a new one, so a cached walk
 * cannot describe a stale tree: a changed roster is a different key. That is
 * the same property the unsaved-change indicator relies on.
 */
const rosterLocations = new WeakMap<
  Roster,
  readonly RosterSelectionLocation[]
>();

export function rosterSelectionLocations(
  roster: Roster,
): readonly RosterSelectionLocation[] {
  const cached = rosterLocations.get(roster);
  if (cached !== undefined) return cached;
  const walked = walkRosterSelectionLocations(roster);
  rosterLocations.set(roster, walked);
  return walked;
}

function walkRosterSelectionLocations(
  roster: Roster,
): readonly RosterSelectionLocation[] {
  const locations: RosterSelectionLocation[] = [];

  const visitSelection = (
    occurrence: RosterSelection,
    parent: RosterForce | RosterSelection,
    force: RosterForce,
    ancestors: readonly RosterSelection[],
    root: RosterSelection,
  ): void => {
    locations.push({ occurrence, parent, force, ancestors, root });
    for (const child of occurrence.selections) {
      visitSelection(child, occurrence, force, [occurrence, ...ancestors], root);
    }
  };
  const visitForce = (force: RosterForce): void => {
    for (const occurrence of force.selections) {
      visitSelection(occurrence, force, force, [], occurrence);
    }
    for (const child of force.forces) {
      visitForce(child);
    }
  };

  for (const force of roster.forces) {
    visitForce(force);
  }
  return locations;
}

export function evaluationSelectionIdentityCandidate(
  occurrence: RosterSelection,
  choices: EvaluationChoiceIndex,
  catalogueMatches: boolean,
  targetId: ObjectId | undefined,
  shared: boolean,
  effectiveCategories?: EffectiveCategoryIndex,
): EvaluationSelectionIdentityCandidate {
  // When effective membership is known for this occurrence it is authoritative
  // for a category comparison: it already accounts for every supported add and
  // remove, including ones anchored here from another occurrence.
  const known = effectiveCategories?.get(occurrence);
  const resolution = resolveEvaluationSelection(
    occurrence,
    choices,
    catalogueMatches,
  );
  const identities = resolution.choices.map((choice) => {
    const effectiveIds = selectionChoiceIdentityIds(choice, shared);
    // A category target is one this occurrence either now has or statically
    // declared; a `remove` leaves it in the links but out of the known set.
    const categoryTarget =
      targetId !== undefined &&
      (known?.includes(targetId) === true ||
        choice.categoryLinks.some((link) => link.targetId === targetId));
    return {
      effectiveIds,
      // Without a known membership set, a category modifier that could add or
      // remove the queried category makes this comparison unknowable from the
      // static links alone, so the candidate stays unresolved rather than
      // guessing. With one, the index already accounts for it.
      categoryModifierControlled:
        known === undefined &&
        targetId !== undefined &&
        selectionChoiceCategoryModifierControls(choice, targetId),
      matches:
        targetId !== undefined &&
        (targetId === objectId("any") ||
          // Known membership is authoritative for a category, replacing the
          // static links rather than adding to them: a removed category must
          // stop matching even though its link is still projected.
          (known !== undefined && categoryTarget
            ? known.includes(targetId)
            : effectiveIds.includes(targetId))),
    };
  });
  const effectiveIds = uniqueIds(
    identities.flatMap((identity) => identity.effectiveIds),
  );
  const matches = identities.map((identity) => identity.matches);
  const categoryModifierControlled = identities.some(
    (identity) => identity.categoryModifierControlled,
  );
  const status = targetId === undefined || categoryModifierControlled
    ? "unresolved"
    : resolution.status !== "resolved" || matches.length !== 1
      ? consistentCandidateStatus(matches)
      : matches[0]
        ? "match"
        : "different";
  return { occurrence, resolution, status, effectiveIds };
}

/**
 * Where a typed scope resolved to, or that it could not be resolved.
 *
 * An absent `occurrence` with `unresolved: false` means the roster genuinely
 * has no ancestor of that type, which is a different answer from not knowing.
 */
export interface TypedSelectionScopeResolution {
  readonly occurrence?: RosterSelection;
  readonly unresolved: boolean;
}

/** The selection-entry types a typed scope name accepts. */
export function typedSelectionTypes(
  scope: string | undefined,
): readonly string[] | undefined {
  switch (scope) {
    case "unit":
      return ["unit"];
    case "model":
      return ["model"];
    case "model-or-unit":
      return ["model", "unit"];
    case "upgrade":
      return ["upgrade"];
    default:
      return undefined;
  }
}

/**
 * The nearest ancestor-or-self whose definition carries one of `types`.
 *
 * Shared by condition and constraint scope resolution: `unit`, `model`,
 * `model-or-unit`, and `upgrade` all name a containing entry by its type.
 */
export function nearestTypedSelection(
  owner: RosterSelectionLocation,
  choices: EvaluationChoiceIndex,
  catalogueMatches: boolean,
  types: readonly string[],
): TypedSelectionScopeResolution {
  for (const occurrence of [owner.occurrence, ...owner.ancestors]) {
    const resolution = resolveEvaluationSelection(
      occurrence,
      choices,
      catalogueMatches,
    );
    const typedStates = resolution.choices.map(
      (choice) =>
        choice.kind === "selectionEntry" &&
        choice.type !== undefined &&
        types.includes(choice.type),
    );
    if (typedStates.length > 0 && typedStates.every(Boolean)) {
      return { occurrence, unresolved: false };
    }
    if (
      resolution.status === "resolved" ||
      (typedStates.length > 0 && typedStates.every((value) => !value))
    ) {
      continue;
    }
    return { unresolved: true };
  }
  return { unresolved: false };
}

/**
 * The nearest ancestor-or-self matching a scope written as an object ID.
 *
 * Shared by condition and constraint scope resolution. The corpus writes
 * these against selection entries — `max 4 Players per <Troupe>` — so an
 * absent category index only leaves a category-identity scope unresolved.
 */
export function nearestIdentitySelection(
  owner: RosterSelectionLocation,
  choices: EvaluationChoiceIndex,
  catalogueMatches: boolean,
  targetId: ObjectId,
  effectiveCategories: EffectiveCategoryIndex | undefined,
): TypedSelectionScopeResolution {
  for (const occurrence of [owner.occurrence, ...owner.ancestors]) {
    const local = evaluationSelectionIdentityCandidate(
      occurrence,
      choices,
      catalogueMatches,
      targetId,
      false,
      effectiveCategories,
    );
    const shared = evaluationSelectionIdentityCandidate(
      occurrence,
      choices,
      catalogueMatches,
      targetId,
      true,
      effectiveCategories,
    );
    if (local.status === "match" || shared.status === "match") {
      return { occurrence, unresolved: false };
    }
    if (local.status === "different" && shared.status === "different") {
      continue;
    }
    return { unresolved: true };
  }
  return { unresolved: false };
}

export function evaluationSelectionScope(
  roster: Roster,
  owner: RosterSelectionLocation,
  scope: EvaluationSelectionScope,
  includeChildSelections: boolean,
  includeChildForces: boolean,
  typedScope?: RosterSelection,
  prospectiveChild = false,
): readonly RosterSelection[] {
  if (scope === "self") {
    return selectionsInTree([owner.occurrence], includeChildSelections);
  }
  if (scope === "parent") {
    return selectionsBelowParent(
      owner.parent,
      includeChildSelections,
      includeChildForces,
    );
  }
  if (scope === "ancestor") {
    // A prospective child's ancestors include the owner it would hang from.
    // Without this an enhancement asked about on a top-level character sees an
    // empty chain, and every faction gate in the corpus fires the wrong way.
    return prospectiveChild
      ? [owner.occurrence, ...owner.ancestors]
      : owner.ancestors;
  }
  if (scope === "root-entry") {
    return selectionsInTree([owner.root], includeChildSelections);
  }
  if (scope === "identity") {
    // An ID-valued scope names the containing entry whose child collection is
    // queried. False means direct children; true widens to all descendants.
    // Counting the container itself made all 214 direct-only ID-scoped
    // conditions in the pinned 46-file corpus inert.
    return typedScope === undefined
      ? []
      : selectionsInTree(
          typedScope.selections,
          includeChildSelections,
        );
  }
  if (
    scope === "unit" ||
    scope === "model" ||
    scope === "model-or-unit" ||
    scope === "upgrade"
  ) {
    return typedScope === undefined
      ? []
      : selectionsInTree([typedScope], includeChildSelections);
  }
  if (scope === "force") {
    return selectionsInForces(
      [owner.force],
      includeChildSelections,
      includeChildForces,
    );
  }
  return selectionsInForces(
    roster.forces,
    includeChildSelections,
    includeChildForces,
  );
}

export function evaluationSelectionTree(
  occurrence: RosterSelection,
  includeChildSelections: boolean,
): readonly RosterSelection[] {
  return selectionsInTree([occurrence], includeChildSelections);
}

export function evaluationSelectionsInForces(
  forces: readonly RosterForce[],
  includeChildSelections: boolean,
  includeChildForces: boolean,
): readonly RosterSelection[] {
  return selectionsInForces(
    forces,
    includeChildSelections,
    includeChildForces,
  );
}

/**
 * Identity IDs per choice, keyed by which of the two forms was asked for.
 *
 * A choice is materialized catalogue data and never changes, so this is a pure
 * function of `(choice, shared)` — but it allocates four arrays and a Set every
 * call, and a single structural inspection of a 143 selection army made
 * **28,780** of them. Garbage collection was 17% of the profile.
 */
const choiceIdentityIds = new WeakMap<
  EvaluationSelectionChoice,
  { shared?: readonly ObjectId[]; own?: readonly ObjectId[] }
>();

function selectionChoiceIdentityIds(
  choice: EvaluationSelectionChoice,
  shared: boolean,
): readonly ObjectId[] {
  const cached = choiceIdentityIds.get(choice);
  const hit = shared ? cached?.shared : cached?.own;
  if (hit !== undefined) return hit;
  const built = buildSelectionChoiceIdentityIds(choice, shared);
  const entry = cached ?? {};
  if (shared) entry.shared = built;
  else entry.own = built;
  if (cached === undefined) choiceIdentityIds.set(choice, entry);
  return built;
}

function buildSelectionChoiceIdentityIds(
  choice: EvaluationSelectionChoice,
  shared: boolean,
): readonly ObjectId[] {
  const selectionId = shared ? choice.definitionId : choice.id;
  return uniqueIds([
    ...(selectionId === undefined ? [] : [selectionId]),
    ...choice.categoryLinks.flatMap((link) =>
      link.targetId === undefined ? [] : [link.targetId],
    ),
    ...(choice.kind === "selectionEntry" && choice.type !== undefined
      ? [objectId(choice.type)]
      : []),
  ]);
}

function uniqueIds(ids: readonly ObjectId[]): readonly ObjectId[] {
  return [...new Set(ids)];
}

/**
 * Whether a `field="category"` modifier on this choice could change whether the
 * queried category is a member.
 *
 * A modifier naming the exact category is relevant. So is one with no value,
 * because its target cannot be determined. A modifier naming a different
 * category cannot affect this comparison and is ignored, which keeps the
 * conservative downgrade narrow.
 *
 * A scoped category modifier owned by another occurrence can still reach this
 * one, and that case is not detectable from this choice alone. It remains an
 * explicit gap recorded in `docs/compatibility.md`.
 */
function selectionChoiceCategoryModifierControls(
  choice: EvaluationSelectionChoice,
  targetId: ObjectId,
): boolean {
  const relevant = (modifier: {
    readonly field?: string;
    readonly value?: string;
  }): boolean =>
    modifier.field === "category" &&
    (modifier.value === undefined || modifier.value === targetId);

  const inGroup = (group: {
    readonly modifiers: readonly { readonly field?: string; readonly value?: string }[];
    readonly modifierGroups: readonly unknown[];
  }): boolean =>
    group.modifiers.some(relevant) ||
    (group.modifierGroups as readonly Parameters<typeof inGroup>[0][]).some(
      inGroup,
    );

  return choice.modifiers.some(relevant) || choice.modifierGroups.some(inGroup);
}

function consistentCandidateStatus(
  matches: readonly boolean[],
): EvaluationSelectionCandidateStatus {
  if (matches.length === 0) {
    return "unresolved";
  }
  if (matches.every(Boolean)) {
    return "match";
  }
  if (matches.every((value) => !value)) {
    return "different";
  }
  return "unresolved";
}

function selectionsBelowParent(
  parent: RosterForce | RosterSelection,
  includeChildSelections: boolean,
  includeChildForces: boolean,
): readonly RosterSelection[] {
  const selections = selectionsInTree(
    parent.selections,
    includeChildSelections,
  );
  if (!("forces" in parent) || !includeChildForces) {
    return selections;
  }
  return [
    ...selections,
    ...selectionsInForces(
      parent.forces,
      includeChildSelections,
      includeChildForces,
    ),
  ];
}

function selectionsInForces(
  forces: readonly RosterForce[],
  includeChildSelections: boolean,
  includeChildForces: boolean,
): readonly RosterSelection[] {
  return forces.flatMap((force) => [
    ...selectionsInTree(force.selections, includeChildSelections),
    ...(includeChildForces
      ? selectionsInForces(
          force.forces,
          includeChildSelections,
          includeChildForces,
        )
      : []),
  ]);
}

function selectionsInTree(
  selections: readonly RosterSelection[],
  includeChildren: boolean,
): readonly RosterSelection[] {
  if (!includeChildren) {
    return selections;
  }
  return selections.flatMap((selection) => [
    selection,
    ...selectionsInTree(selection.selections, true),
  ]);
}

function resolutionStatus(
  candidates: readonly EvaluationSelectionChoice[],
  partial: boolean,
  catalogueMatches: boolean,
): EvaluationSelectionStatus {
  if (!catalogueMatches) {
    return "unresolved";
  }
  if (candidates.length === 1) {
    return "resolved";
  }
  if (candidates.length > 1) {
    return "ambiguous";
  }
  return partial ? "unresolved" : "unavailable";
}
