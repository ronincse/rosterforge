// Shared non-recursive shape gate for assignment UI and saved-edge queries.
import type { EvaluationSelectionChoice } from "./selection-context.js";
import type { OrderedXmlElement } from "@rosterforge/battlescribe-data";

function validFilterCollections(node: OrderedXmlElement, depth = 0): boolean {
  if (depth > 32) return false;
  const names = new Set<string>();
  for (const collection of node.children) {
    if (collection.kind !== "element") continue;
    const item = collection.name === "conditions" ? "condition" : collection.name === "conditionGroups" ? "conditionGroup" : undefined;
    if (!item || names.has(collection.name) || Object.keys(collection.attributes).length) return false;
    names.add(collection.name);
    for (const child of collection.children) {
      if (child.kind !== "element") continue;
      if (child.name !== item || (item === "condition" ? child.children.some(c => c.kind === "element") : !validFilterCollections(child, depth + 1))) return false;
    }
  }
  return true;
}

/** Recognizes direct optional/required single-unit group associations. An authored
 * default `none` means no edge, not satisfaction of the minimum. It does not evaluate filters: doing so during an
 * association condition would recursively re-enter condition evaluation. */
export function isSupportedDirectAssociation(association: EvaluationSelectionChoice["associations"][number]): boolean {
  const allowed = new Set(["id", "name", "min", "max", "scope", "childId", "childName", "action", "label", "hidden", "includeChildSelections", "includeChildForces", "defaultSelectionEntryId", "sortIndex"]);
  const invalidBoolean = ["hidden", "includeChildSelections", "includeChildForces"].some(key => association.node.attributes[key] !== undefined && !["true", "false", "1", "0"].includes(association.node.attributes[key]!));
  const unknown = invalidBoolean || !validFilterCollections(association.node) || Object.keys(association.node.attributes).some(key => !allowed.has(key)) || association.node.children.some(child => child.kind === "element" && !["conditions", "conditionGroups"].includes(child.name));
  const defaultId = association.node.attributes.defaultSelectionEntryId;
  return !unknown && (defaultId === undefined || defaultId === "none") && association.scope === "force" && association.childId === "unit" && association.action === "group" && (association.min === 0 || association.min === 1) && association.max === 1 && association.includeChildSelections === true && association.includeChildForces !== true && association.hidden !== true;
}
