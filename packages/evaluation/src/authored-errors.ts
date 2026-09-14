/**
 * Source-authored force errors are a separate validation channel, not numeric
 * bounds. Conditions reuse the deterministic query engine; prose is only text.
 */
import type { BattleScribeCatalogueContext, BattleScribeForceDefinition } from "@rosterforge/data-graph";
import { success, type Diagnostic, type Result, type ValidationCompleteness } from "@rosterforge/foundation";
import type { Roster, RosterForce } from "@rosterforge/roster-model";
import { effectiveRosterCategories } from "./effective-categories.js";
import { indexEvaluationForces, resolveEvaluationForce, rosterForceLocations } from "./force-context.js";
import { evaluateRosterModifierApplicability } from "./modifier-applicability.js";
import { rosterMatchesCatalogueContext } from "./selection-context.js";

type ErrorModifier = BattleScribeForceDefinition["source"]["modifiers"][number];
type ErrorGroup = BattleScribeForceDefinition["source"]["modifierGroups"][number];
export interface RosterAuthoredErrorReport {
  readonly owner: RosterForce;
  readonly modifier: ErrorModifier;
  readonly message: string;
  readonly status: "satisfied" | "violated" | "unresolved";
  readonly completeness: ValidationCompleteness;
}
export interface RosterAuthoredErrorsReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly errors: readonly RosterAuthoredErrorReport[];
  readonly completeness: ValidationCompleteness;
}

/**
 * Evaluates each direct force-owned add-error once per force occurrence.
 * Grouped error execution is withheld, with a source-located unresolved item.
 * Static cost queries preserve signed values and refuse modified/unknown totals;
 * no cost evaluation is recursively invoked from this validation pass.
 */
export function inspectRosterAuthoredErrors(roster: Roster, context: BattleScribeCatalogueContext): Result<RosterAuthoredErrorsReport> {
  const diagnostics: Diagnostic[] = [];
  const errors: RosterAuthoredErrorReport[] = [];
  const index = indexEvaluationForces(context);
  const matches = rosterMatchesCatalogueContext(roster, context);
  const effectiveCategories = effectiveRosterCategories(roster, context);
  for (const { occurrence: owner } of rosterForceLocations(roster)) {
    const resolution = resolveEvaluationForce(owner, index, matches);
    if (resolution.status !== "resolved") {
      diagnostics.push({ code: "EVALUATION_AUTHORED_ERROR_OWNER_UNRESOLVED", severity: "warning", impacts: ["validation", "resolution"], message: "The force carrying authored requirements could not be resolved uniquely.", details: { ownerId: owner.id, status: resolution.status } });
      continue;
    }
    const source = resolution.definitions[0]!.source;
    const inspect = (modifier: ErrorModifier, grouped: boolean): void => {
      if (modifier.field !== "error") return;
      const applicability = evaluateRosterModifierApplicability(roster, context, owner, modifier, { effectiveCategories });
      // A known false gate deactivates even an unsupported operation. Group gates
      // are withheld, so a grouped leaf can never be claimed active here.
      const structureKnown = supportedErrorTree(modifier.node);
      const inactive = structureKnown && applicability.ok && applicability.value.completeness === "complete" && applicability.value.status === "notApplicable";
      const shape = structureKnown && !grouped && modifier.type === "add" && typeof modifier.value === "string" && modifier.value.trim().length > 0 &&
        modifier.scope === undefined && modifier.repeats.length === 0 &&
        Object.keys(modifier.node.attributes).every(key => ["id", "type", "field", "value", "comment"].includes(key)) &&
        modifier.node.children.every(child => child.kind !== "element" || ["conditions", "conditionGroups", "comment"].includes(child.name));
      const complete = inactive || (shape && applicability.ok && applicability.value.evaluated && applicability.value.completeness === "complete" && applicability.value.status !== "unresolved");
      if (!inactive) diagnostics.push(...applicability.diagnostics);
      if (!inactive && !shape) diagnostics.push({ code: "EVALUATION_AUTHORED_ERROR_SHAPE_UNSUPPORTED", severity: "warning", impacts: ["validation", "compatibility"], message: "This authored error uses an unsupported operation, group, repeat, scope or source shape.", location: { source: modifier.source, path: modifier.path } });
      errors.push({ owner, modifier, message: typeof modifier.value === "string" && modifier.value.trim() ? modifier.value : "Authored requirement", status: inactive ? "satisfied" : complete ? "violated" : "unresolved", completeness: complete ? "complete" : "incomplete" });
    };
    source.modifiers.forEach(modifier => inspect(modifier, false));
    const visit = (group: ErrorGroup): void => { group.modifiers.forEach(modifier => inspect(modifier, true)); group.modifierGroups.forEach(visit); };
    source.modifierGroups.forEach(visit);
  }
  return success({ roster, context, errors, completeness: diagnostics.length === 0 && errors.every(error => error.completeness === "complete") ? "complete" : "incomplete" }, diagnostics);
}

/** Reject retained but unprojected behavior before trusting a condition result. */
function supportedErrorTree(node: ErrorModifier["node"]): boolean {
  const allowedChildren: Readonly<Record<string, readonly string[]>> = {
    modifier: ["conditions", "conditionGroups", "comment"],
    conditions: ["condition"], conditionGroups: ["conditionGroup"],
    conditionGroup: ["conditions", "conditionGroups", "comment"], condition: [], comment: [],
  };
  const children = node.children.filter(child => child.kind === "element");
  const allowed = allowedChildren[node.name];
  if (!allowed || children.some(child => !allowed.includes(child.name))) return false;
  if (["conditions", "conditionGroups"].includes(node.name) && Object.keys(node.attributes).length > 0) return false;
  if (node.name === "conditionGroup" && Object.keys(node.attributes).some(key => !["id", "type", "comment"].includes(key))) return false;
  if (["modifier", "conditionGroup"].includes(node.name) && ["conditions", "conditionGroups"].some(name => children.filter(child => child.name === name).length > 1)) return false;
  if (["shared", "percentValue", "includeChildSelections", "includeChildForces"].some(key => node.attributes[key] !== undefined && !["true", "false", "1", "0"].includes(node.attributes[key]!))) return false;
  return children.every(supportedErrorTree);
}
