import type { BattleScribeForceDefinition } from "@rosterforge/data-graph";

export function forceDefinitionKey(
  definition: BattleScribeForceDefinition,
): string {
  return JSON.stringify([
    definition.source.source.sourceId,
    ...definition.source.path,
  ]);
}

export function forceDefinitionLabel(
  definition: BattleScribeForceDefinition,
): string {
  return definition.source.name ?? definition.source.id ?? "Unnamed force";
}
