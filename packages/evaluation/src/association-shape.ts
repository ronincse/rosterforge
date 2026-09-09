// Shared non-recursive shape gate for assignment UI and saved-edge queries.
import type { EvaluationSelectionChoice } from "./selection-context.js";

/** Recognizes only the direct optional single-unit association shape that the
 * roster can currently save. It does not evaluate filters: doing so during an
 * association condition would recursively re-enter condition evaluation. */
export function isSupportedDirectAssociation(association: EvaluationSelectionChoice["associations"][number]): boolean {
  const allowed = new Set(["id", "name", "min", "max", "scope", "childId", "childName", "action", "label", "hidden", "includeChildSelections", "includeChildForces"]);
  const invalidBoolean = ["hidden", "includeChildSelections", "includeChildForces"].some(key => association.node.attributes[key] !== undefined && !["true", "false", "1", "0"].includes(association.node.attributes[key]!));
  const unknown = invalidBoolean || Object.keys(association.node.attributes).some(key => !allowed.has(key)) || association.node.children.some(child => child.kind === "element" && !["conditions", "conditionGroups"].includes(child.name));
  return !unknown && association.scope === "force" && association.childId === "unit" && association.action === "group" && association.min === 0 && association.max === 1 && association.includeChildSelections === true && association.includeChildForces !== true && association.hidden !== true;
}
