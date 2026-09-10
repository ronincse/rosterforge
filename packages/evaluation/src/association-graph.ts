// Structural association connectivity, shared by queries and affects routing.
// This layer must not import condition/category evaluation: those consumers can
// themselves ask about these edges. Eligibility and legality are separate checks.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import { rosterDefinitionKeyForSource, type Roster, type RosterSelection } from "@rosterforge/roster-model";
import { isSupportedDirectAssociation } from "./association-shape.js";
import { indexEvaluationChoices, resolveEvaluationSelection, rosterMatchesCatalogueContext, rosterSelectionLocations } from "./selection-context.js";

export interface AssociationReach {
  readonly selections: readonly RosterSelection[];
  readonly unresolved: boolean;
}

interface AssociationGraph {
  readonly adjacent: ReadonlyMap<RosterSelection, ReadonlySet<RosterSelection>>;
  readonly uncertain: ReadonlySet<RosterSelection>;
  readonly incomplete: boolean;
}

// One graph per immutable roster/context pair, not per profile or query. Values
// share occurrence/source references; edits create a new roster cache key.
const graphs = new WeakMap<Roster, WeakMap<BattleScribeCatalogueContext, AssociationGraph>>();
const traversalLimit = 4096;

function graphFor(roster: Roster, context: BattleScribeCatalogueContext): AssociationGraph {
  let byContext = graphs.get(roster);
  if (!byContext) { byContext = new WeakMap(); graphs.set(roster, byContext); }
  const cached = byContext.get(context);
  if (cached) return cached;
  const locations = rosterSelectionLocations(roster);
  const byId = new Map<string, typeof locations[number][]>();
  for (const location of locations) {
    const matches = byId.get(location.occurrence.id) ?? [];
    matches.push(location); byId.set(location.occurrence.id, matches);
  }
  const adjacent = new Map<RosterSelection, Set<RosterSelection>>();
  const uncertain = new Set<RosterSelection>();
  const choices = indexEvaluationChoices(context);
  const incomplete = !rosterMatchesCatalogueContext(roster, context) || (roster.associations?.length ?? 0) > traversalLimit;
  for (const edge of (roster.associations ?? []).slice(0, traversalLimit)) {
    const sources = byId.get(edge.sourceId) ?? [];
    const targets = byId.get(edge.targetId) ?? [];
    const source = sources[0], target = targets[0];
    const definition = source && resolveEvaluationSelection(source.occurrence, choices, !incomplete);
    const declarations = definition?.status === "resolved" ? definition.choices[0]!.associations.filter(a => rosterDefinitionKeyForSource(a.source.sourceId, a.path) === edge.definitionKey) : [];
    const targetDefinition = target && resolveEvaluationSelection(target.occurrence, choices, !incomplete);
    if (sources.length !== 1 || targets.length !== 1 || !source || !target || source === target || source.force !== target.force || declarations.length !== 1 || !isSupportedDirectAssociation(declarations[0]!) || targetDefinition?.status !== "resolved" || targetDefinition.choices[0]?.kind !== "selectionEntry" || targetDefinition.choices[0]?.type !== "unit") {
      for (const location of [...sources, ...targets]) uncertain.add(location.occurrence);
      continue;
    }
    // Group action is an undirected connection. Declarers may be root models;
    // only the authored target is restricted to a unit. Duplicate paths must not
    // duplicate profile effects or charge the same scoped cost twice.
    for (const [from, to] of [[source.occurrence, target.occurrence], [target.occurrence, source.occurrence]] as const) {
      const neighbors = adjacent.get(from) ?? new Set<RosterSelection>();
      neighbors.add(to); adjacent.set(from, neighbors);
    }
  }
  const result = { adjacent, uncertain, incomplete };
  byContext.set(context, result);
  return result;
}

/** Returns direct counterparts or the connected group (including the anchor).
 * Traversal is bounded and cycle-safe; result order is durable roster order,
 * never edge insertion order or visual grouping. Unreadable incident edges
 * withhold exactness without contaminating unrelated components. */
export function rosterAssociationReach(roster: Roster, context: BattleScribeCatalogueContext, owner: RosterSelection, transitive = false): AssociationReach {
  const graph = graphFor(roster, context);
  const locations = rosterSelectionLocations(roster);
  const found = locations.filter(l => l.occurrence.id === owner.id);
  let unresolved = graph.incomplete || found.length !== 1 || found[0]?.occurrence !== owner;
  const visited = new Set<RosterSelection>([owner]);
  const pending = [owner];
  let work = 0;
  while (pending.length) {
    const current = pending.pop()!;
    unresolved ||= graph.uncertain.has(current);
    for (const next of graph.adjacent.get(current) ?? []) {
      if (++work > traversalLimit) { unresolved = true; pending.length = 0; break; }
      if (visited.has(next)) continue;
      visited.add(next);
      if (transitive) pending.push(next);
    }
  }
  if (!transitive) visited.delete(owner);
  return { selections: locations.filter(l => visited.has(l.occurrence)).map(l => l.occurrence), unresolved };
}
