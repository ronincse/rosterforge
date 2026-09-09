// Candidate eligibility for the measured same-force, single-target association
// shape. Assignment is independent of selection containment and effect routing.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import type { ConditionProjection, ConditionGroupProjection } from "@rosterforge/battlescribe-data";
import { rosterDefinitionKeyForSource, type Roster, type RosterDefinitionKey, type RosterSelection } from "@rosterforge/roster-model";
import { evaluateRosterCondition, type RosterConditionStatus } from "./conditions.js";
import { effectiveRosterCategories } from "./effective-categories.js";
import { indexEvaluationChoices, resolveEvaluationSelection, rosterSelectionLocations, rosterMatchesCatalogueContext, type EvaluationSelectionChoice } from "./selection-context.js";

export interface RosterAssociationChoice {
  readonly key: RosterDefinitionKey;
  readonly name: string;
  readonly supported: boolean;
  readonly candidates: readonly { selection: RosterSelection; status: RosterConditionStatus }[];
}

/** Inspect source-authored filters for each target occurrence. queryFromSelf
 * switches only that leaf's evaluation owner; it never changes saved identity.
 * Unknown shapes/conditions stay unavailable, not permissive. Cached category
 * membership is reused across the candidate walk; no source nodes are mutated. */
export function inspectRosterAssociationChoices(roster: Roster, context: BattleScribeCatalogueContext, owner: RosterSelection): readonly RosterAssociationChoice[] {
  const locations = rosterSelectionLocations(roster);
  const location = locations.find(l => l.occurrence.id === owner.id);
  if (!location || !rosterMatchesCatalogueContext(roster, context)) return [];
  const choices = indexEvaluationChoices(context);
  const resolved = resolveEvaluationSelection(owner, choices, true);
  if (resolved.status !== "resolved") return [];
  const definition = resolved.choices[0]!;
  const effectiveCategories = effectiveRosterCategories(roster, context);
  const combine = (states: readonly RosterConditionStatus[], type: string): RosterConditionStatus => {
    if (type === "and") return states.includes("unsatisfied") ? "unsatisfied" : states.includes("unresolved") ? "unresolved" : "satisfied";
    if (type === "or") return states.includes("satisfied") ? "satisfied" : states.includes("unresolved") ? "unresolved" : "unsatisfied";
    return "unresolved";
  };
  function candidateStatus(association: EvaluationSelectionChoice["associations"][number], target: RosterSelection): RosterConditionStatus {
    let budget = 4096;
    const leaf = (condition: ConditionProjection): RosterConditionStatus => {
      if (--budget < 0 || condition.node.children.some(child => child.kind === "element")) return "unresolved";
      const raw = condition.node.attributes.queryFromSelf;
      if (raw !== undefined && raw !== "true" && raw !== "false") return "unresolved";
      const attributes = { ...condition.node.attributes };
      delete attributes.queryFromSelf;
      const result = evaluateRosterCondition(roster, context, raw === "true" ? owner : target,
        { ...condition, node: { ...condition.node, attributes } }, { effectiveCategories });
      return result.ok ? result.value.status : "unresolved";
    };
    const group = (value: ConditionGroupProjection, depth: number): RosterConditionStatus => {
      if (--budget < 0 || depth > 32 || value.localConditionGroups?.length || (!value.conditions.length && !value.conditionGroups.length) || Object.keys(value.node.attributes).some(k => k !== "id" && k !== "type") || value.node.children.some(child => child.kind === "element" && !["conditions", "conditionGroups"].includes(child.name))) return "unresolved";
      return combine([...value.conditions.map(leaf), ...value.conditionGroups.map(g => group(g, depth + 1))], value.type ?? "");
    };
    return combine([...association.conditions.map(leaf), ...association.conditionGroups.map(g => group(g, 0))], "and");
  }
  return definition.associations.map(association => {
    const allowed = new Set(["id", "name", "min", "max", "scope", "childId", "childName", "action", "label", "hidden", "includeChildSelections", "includeChildForces"]);
    const invalidBoolean = ["hidden", "includeChildSelections", "includeChildForces"].some(key => association.node.attributes[key] !== undefined && !["true", "false", "1", "0"].includes(association.node.attributes[key]!));
    const unknown = invalidBoolean || Object.keys(association.node.attributes).some(key => !allowed.has(key)) || association.node.children.some(child => child.kind === "element" && !["conditions", "conditionGroups"].includes(child.name));
    const supported = !unknown && association.scope === "force" && association.childId === "unit" && association.action === "group" && association.min === 0 && association.max === 1 && association.includeChildSelections === true && association.includeChildForces !== true && association.hidden !== true;
    return {
      key: rosterDefinitionKeyForSource(association.source.sourceId, association.path),
      name: association.name ?? "Attachment",
      supported,
      candidates: supported ? locations.filter(l => l.force === location.force && l.occurrence.id !== owner.id).flatMap(({ occurrence: target }) => {
        const targetDefinition = resolveEvaluationSelection(target, choices, true);
        if (targetDefinition.status !== "resolved" || targetDefinition.choices[0]?.kind !== "selectionEntry" || targetDefinition.choices[0]?.type !== "unit") return [];
        return [{ selection: target, status: candidateStatus(association, target) }];
      }) : [],
    };
  });
}
