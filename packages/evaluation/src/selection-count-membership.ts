// Numeric queries count concrete carriers through authored transparent groups.
// This is deliberately separate from instanceOf/category identity and roster state.
import { battleScribeReachableObjectsById, type BattleScribeCatalogueContext, type MaterializedEntryLink } from "@rosterforge/data-graph";
import type { ObjectId } from "@rosterforge/foundation";
import { rosterDefinitionKeyForSource, type Roster, type RosterDefinitionKey, type RosterSelection } from "@rosterforge/roster-model";
import { indexEvaluationChoices, resolveEvaluationSelection, rosterSelectionLocations, type EvaluationSelectionChoice, type EvaluationSelectionIdentityCandidate, type RosterSelectionLocation } from "./selection-context.js";

type GroupPath = readonly EvaluationSelectionChoice[];
type Placements = ReadonlyMap<RosterDefinitionKey, readonly GroupPath[]>;

// A parent template's flattened child frontier is immutable. Stop at concrete
// entries: their wargear belongs to them, never to their containing model group.
// Cache these small frontiers, not a transitive ancestor-ID union for every node.
const childPlacements = new WeakMap<EvaluationSelectionChoice, Placements>();
const rootPlacements = new WeakMap<BattleScribeCatalogueContext, Placements>();
const groupTargets = new WeakMap<BattleScribeCatalogueContext, Map<ObjectId, "resolved" | "unresolved" | undefined>>();
// One O(n) occurrence index per immutable roster avoids a full roster scan per
// candidate in every condition/repeat. Duplicate object placement remains unknown.
const locationsByOccurrence = new WeakMap<Roster, ReadonlyMap<RosterSelection, RosterSelectionLocation | undefined>>();

/** Identifies numeric group targets, including authored links to shared groups. */
export function isSelectionGroupCountTarget(context: BattleScribeCatalogueContext, id: ObjectId): boolean {
  return selectionGroupCountTargetStatus(context, id) !== undefined;
}

/** A dangling/ambiguous group link is recognizable but cannot support an exact
 * empty count. Cache graph lookup results per immutable context and target ID. */
export function selectionGroupCountTargetStatus(context: BattleScribeCatalogueContext, id: ObjectId): "resolved" | "unresolved" | undefined {
  let targets = groupTargets.get(context);
  if (targets === undefined) {
    targets = new Map();
    groupTargets.set(context, targets);
  }
  if (targets.has(id)) return targets.get(id);
  const objects = battleScribeReachableObjectsById(context.graph, context.document, id);
  const groups = objects.filter(o => o.kind === "selectionEntryGroup" || (o.kind === "entryLink" && o.source.node.attributes["type"] === "selectionEntryGroup"));
  let status: "resolved" | "unresolved" | undefined = groups.length === 0 ? undefined : "unresolved";
  if (groups.length === 1 && objects.length === 1) {
    const group = groups[0]!;
    if (group.kind === "selectionEntryGroup") status = "resolved";
    else {
      const references = context.graph.references.filter(r => r.source === group.source && r.kind === "entryLink");
      if (references.length === 1 && references[0]!.targets.length === 1 && references[0]!.targets[0]!.kind === "selectionEntryGroup") status = "resolved";
    }
  }
  targets.set(id, status);
  return status;
}

/** Resolves membership in the candidate's actual parent frontier. Multiple
 * indistinguishable paths must agree; missing placement is unknown, not zero.
 * Call only for numeric selection counts; ordinary identity is unchanged. */
export function selectionGroupCountCandidate(
  candidate: EvaluationSelectionIdentityCandidate,
  roster: Roster,
  context: BattleScribeCatalogueContext,
  target: ObjectId,
  shared: boolean,
): EvaluationSelectionIdentityCandidate {
  let locations = locationsByOccurrence.get(roster);
  if (locations === undefined) {
    const index = new Map<RosterSelection, RosterSelectionLocation | undefined>();
    for (const location of rosterSelectionLocations(roster)) index.set(location.occurrence, index.has(location.occurrence) ? undefined : location);
    locations = index;
    locationsByOccurrence.set(roster, locations);
  }
  const location = locations.get(candidate.occurrence);
  if (location === undefined || candidate.resolution.status !== "resolved") return { ...candidate, status: "unresolved" };
  // Persisted wrappers are not additional carriers. Their children are counted
  // independently, just as when those wrappers are omitted from durable state.
  if (candidate.resolution.choices[0]?.kind === "selectionEntryGroup") return { ...candidate, status: "different" };
  const choices = indexEvaluationChoices(context);
  const chain = [location];
  for (const ancestor of location.ancestors) {
    const resolution = resolveEvaluationSelection(ancestor, choices, true);
    if (resolution.status !== "resolved") return { ...candidate, status: "unresolved" };
    if (resolution.choices[0]!.kind !== "selectionEntryGroup") break;
    const parentLocation = locations.get(ancestor);
    if (parentLocation === undefined) return { ...candidate, status: "unresolved" };
    chain.push(parentLocation);
  }
  let possible = new Set([false]);
  // Validate each persisted wrapper's own placement too. Otherwise moving a
  // known group below an unrelated concrete entry could manufacture membership.
  for (const member of chain) {
    const paths = pathsAtLocation(member, context);
    if (paths.length === 0) return { ...candidate, status: "unresolved" };
    const matches = paths.map(path => path.some(group =>
      // 23 pinned queries name the group-link occurrence even with shared=true.
      group.id === target || (shared && group.definitionId === target)));
    possible = new Set([...possible].flatMap(previous => matches.map(match => previous || match)));
  }
  const status = possible.size !== 1 ? "unresolved" : possible.has(true) ? "match" : "different";
  return { ...candidate, status, effectiveIds: status === "match" ? [...new Set([...candidate.effectiveIds, target])] : candidate.effectiveIds };
}

function pathsAtLocation(location: RosterSelectionLocation, context: BattleScribeCatalogueContext): readonly GroupPath[] {
  if ("forces" in location.parent) {
    let roots = rootPlacements.get(context);
    if (roots === undefined) {
      roots = placements(context.roots.roots.map(r => r.materialized));
      rootPlacements.set(context, roots);
    }
    return roots.get(location.occurrence.definition.key) ?? [];
  } else {
    const parent = resolveEvaluationSelection(location.parent, indexEvaluationChoices(context), true);
    if (parent.status !== "resolved") return [];
    return parent.choices.flatMap(p => {
      let frontier = childPlacements.get(p);
      if (frontier === undefined) {
        frontier = placements([...p.selectionEntries, ...p.selectionEntryGroups, ...p.entryLinks], p.kind === "selectionEntryGroup" ? [p] : []);
        childPlacements.set(p, frontier);
      }
      return frontier.get(location.occurrence.definition.key) ?? [];
    });
  }
}

function placements(roots: readonly MaterializedEntryLink[], parents: GroupPath = []): Placements {
  const result = new Map<RosterDefinitionKey, GroupPath[]>();
  const visit = (choice: MaterializedEntryLink, path: GroupPath): void => {
    if (choice.kind === "unresolvedEntryLink") return;
    const key = rosterDefinitionKeyForSource(choice.occurrence.source.sourceId, choice.occurrence.path);
    const paths = result.get(key) ?? [];
    paths.push(path);
    result.set(key, paths);
    if (choice.kind !== "selectionEntryGroup") return;
    const nested = [...path, choice];
    for (const child of [...choice.selectionEntries, ...choice.selectionEntryGroups, ...choice.entryLinks]) visit(child, nested);
  };
  for (const root of roots) visit(root, parents);
  return result;
}
