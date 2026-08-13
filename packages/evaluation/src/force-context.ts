import type {
  BattleScribeCatalogueContext,
  BattleScribeForceDefinition,
} from "@rosterforge/data-graph";

import type { ObjectId } from "@rosterforge/foundation";

import {
  rosterDefinitionKeyForSource,
  type Roster,
  type RosterDefinitionKey,
  type RosterForce,
} from "@rosterforge/roster-model";

export type EvaluationForceStatus =
  | "resolved"
  | "unavailable"
  | "ambiguous"
  | "unresolved";

export interface EvaluationForceIndex {
  readonly byKey: ReadonlyMap<
    RosterDefinitionKey,
    readonly BattleScribeForceDefinition[]
  >;
}

export interface EvaluationForceResolution {
  readonly occurrence: RosterForce;
  readonly status: EvaluationForceStatus;
  readonly definitions: readonly BattleScribeForceDefinition[];
}

export type EvaluationForceCandidateStatus =
  | "match"
  | "different"
  | "unresolved";

export interface EvaluationForceIdentityCandidate {
  readonly occurrence: RosterForce;
  readonly resolution: EvaluationForceResolution;
  readonly status: EvaluationForceCandidateStatus;
  readonly effectiveIds: readonly ObjectId[];
}

export interface RosterForceLocation {
  readonly occurrence: RosterForce;
  readonly parent?: RosterForce;
}

export function indexEvaluationForces(
  context: BattleScribeCatalogueContext,
): EvaluationForceIndex {
  const byKey = new Map<
    RosterDefinitionKey,
    BattleScribeForceDefinition[]
  >();

  const visit = (definition: BattleScribeForceDefinition): void => {
    const key = rosterDefinitionKeyForSource(
      definition.source.source.sourceId,
      definition.source.path,
    );
    const candidates = byKey.get(key);
    if (candidates === undefined) {
      byKey.set(key, [definition]);
    } else if (!candidates.includes(definition)) {
      candidates.push(definition);
    }
    for (const child of definition.forceEntries) {
      visit(child);
    }
  };

  for (const definition of context.forces.definitions) {
    visit(definition);
  }
  return { byKey };
}

export function resolveEvaluationForce(
  occurrence: RosterForce,
  forces: EvaluationForceIndex,
  catalogueMatches: boolean,
): EvaluationForceResolution {
  const definitions = catalogueMatches
    ? forces.byKey.get(occurrence.definition.key) ?? []
    : [];
  const status: EvaluationForceStatus = !catalogueMatches
    ? "unresolved"
    : definitions.length === 1
      ? "resolved"
      : definitions.length > 1
        ? "ambiguous"
        : "unavailable";
  return { occurrence, status, definitions };
}

export function rosterForceLocations(
  roster: Roster,
): readonly RosterForceLocation[] {
  const locations: RosterForceLocation[] = [];

  const visit = (occurrence: RosterForce, parent?: RosterForce): void => {
    locations.push({ occurrence, ...(parent === undefined ? {} : { parent }) });
    for (const child of occurrence.forces) {
      visit(child, occurrence);
    }
  };

  for (const force of roster.forces) {
    visit(force);
  }
  return locations;
}

export function evaluationForceIdentityCandidate(
  occurrence: RosterForce,
  forces: EvaluationForceIndex,
  catalogueMatches: boolean,
  targetId: ObjectId | undefined,
): EvaluationForceIdentityCandidate {
  const resolution = resolveEvaluationForce(
    occurrence,
    forces,
    catalogueMatches,
  );
  const effectiveIds = resolution.definitions.flatMap((definition) =>
    definition.source.id === undefined ? [] : [definition.source.id],
  );
  const matches = effectiveIds.map((id) => id === targetId);
  const status =
    resolution.status !== "resolved" || matches.length !== 1
      ? consistentCandidateStatus(matches)
      : matches[0]
        ? "match"
        : "different";
  return { occurrence, resolution, status, effectiveIds };
}

export function rosterForcesInScope(
  roster: Roster,
  includeChildForces: boolean,
): readonly RosterForce[] {
  return includeChildForces
    ? forcesInTree(roster.forces)
    : roster.forces;
}

function forcesInTree(forces: readonly RosterForce[]): readonly RosterForce[] {
  return forces.flatMap((force) => [force, ...forcesInTree(force.forces)]);
}

function consistentCandidateStatus(
  matches: readonly boolean[],
): EvaluationForceCandidateStatus {
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
