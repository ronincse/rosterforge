// Pure rule visibility, separate from profile characteristics and UI. Definition
// and info-link carriers stay distinct because effective precedence is unproven.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import type { Diagnostic, SourceFileProvenance, ValidationCompleteness } from "@rosterforge/foundation";
import type { Roster } from "@rosterforge/roster-model";
import type { RosterConditionOwner } from "./conditions.js";
import type { RosterCharacteristicModifierSource } from "./characteristics.js";
import { effectiveRosterCategories } from "./effective-categories.js";
import { evaluateRosterModifierApplicability } from "./modifier-applicability.js";
import { collectRosterModifierGroupExecution, evaluateRosterModifierGroupApplicability, type RosterModifierGroupSource } from "./modifier-groups.js";

export interface RuleVisibilitySource {
  readonly name?: string;
  readonly hidden?: boolean;
  readonly modifiers: readonly RosterCharacteristicModifierSource[];
  readonly modifierGroups: readonly RosterModifierGroupSource<RosterCharacteristicModifierSource>[];
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: { readonly attributes: Readonly<Record<string, string>> };
}
export type RuleVisibilityInput = RuleVisibilitySource | {
  readonly name?: string;
  readonly definition: RuleVisibilitySource;
  readonly link: RuleVisibilitySource;
  readonly hidden?: boolean;
};
export interface RuleVisibilityContext {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly owner: RosterConditionOwner;
}
export interface RuleVisibilityLayer {
  readonly source: RuleVisibilitySource;
  readonly status: "visible" | "hidden" | "unresolved";
  readonly written: boolean;
  readonly completeness: ValidationCompleteness;
}
export interface RosterRuleVisibilityReport {
  readonly status: "visible" | "hidden" | "unresolved";
  readonly completeness: ValidationCompleteness;
  readonly layers: readonly RuleVisibilityLayer[];
  readonly diagnostics: readonly Diagnostic[];
}

/** Evaluates static/direct/grouped rule visibility in an exact occurrence.
 * Without an occurrence this is a source preview: conditional behavior remains
 * explicitly unresolved. Reports retain both source layers and all uncertainty,
 * even if a later supported set establishes a final Boolean value.
 */
export function evaluateRosterRuleVisibility(rule: RuleVisibilityInput, environment?: RuleVisibilityContext): RosterRuleVisibilityReport {
  const sources = "definition" in rule ? [rule.definition, rule.link] : [rule];
  const diagnostics: Diagnostic[] = [];
  // Callers may supply the original carriers without a materialized hidden flag.
  // Preserve the materializer's static link-over-definition inheritance there.
  const base = rule.hidden ?? ("definition" in rule ? rule.link.hidden ?? rule.definition.hidden : undefined) ?? false;
  const options = environment === undefined ? undefined : { effectiveCategories: effectiveRosterCategories(environment.roster, environment.context) };
  const layers = sources.map((source): RuleVisibilityLayer => {
    let hidden = base;
    let known = true;
    let incomplete = false;
    let written = false;
    const unresolved = (at: Pick<RuleVisibilitySource, "source" | "path">, message: string) => {
      known = false; incomplete = true; written = true;
      diagnostics.push({ code: "EVALUATION_RULE_VISIBILITY_UNRESOLVED", severity: "warning", message, impacts: ["validation", "compatibility"], location: { source: at.source, path: at.path } });
    };
    const staticHidden = source.node.attributes.hidden;
    // XML Boolean attributes also accept 1/0, as the typed projector does.
    if (staticHidden !== undefined && !["true", "false", "1", "0"].includes(staticHidden)) unresolved(source, "This rule has an invalid static hidden value.");

    const apply = (modifier: RosterCharacteristicModifierSource, status: "applicable" | "notApplicable" | "unresolved", complete = true) => {
      incomplete ||= !complete;
      // An inactive unsupported operation cannot affect this rule's visibility.
      if (status === "notApplicable") return;
      if (status === "unresolved" || modifier.field !== "hidden" || modifier.type !== "set" || !["true", "false"].includes(modifier.value ?? "") || modifier.scope !== undefined || modifier.repeats.length > 0 || Object.keys(modifier.node.attributes).some(key => !["type", "field", "value", "comment"].includes(key))) {
        unresolved(modifier, "This rule's visibility depends on unsupported or unresolved modifier behavior.");
        return;
      }
      written = true; hidden = modifier.value === "true"; known = true;
    };
    for (const modifier of source.modifiers.filter(relevant)) {
      if (environment === undefined) {
        const conditional = modifier.conditions.length + modifier.conditionGroups.length > 0;
        apply(modifier, conditional ? "unresolved" : "applicable");
        continue;
      }
      const evaluated = evaluateRosterModifierApplicability(environment.roster, environment.context, environment.owner, modifier, options);
      diagnostics.push(...evaluated.diagnostics);
      apply(modifier, evaluated.ok && evaluated.value.evaluated ? evaluated.value.status : "unresolved", evaluated.ok && evaluated.value.completeness === "complete");
    }
    for (const group of source.modifierGroups.filter(groupRelevant)) {
      if (environment === undefined) {
        unresolved(group, "This rule's grouped visibility needs a roster occurrence to determine applicability.");
        continue;
      }
      const evaluated = evaluateRosterModifierGroupApplicability(environment.roster, environment.context, environment.owner, group, options);
      diagnostics.push(...evaluated.diagnostics);
      if (!evaluated.ok) { unresolved(group, "This rule's modifier group could not be evaluated."); continue; }
      incomplete ||= evaluated.value.completeness === "incomplete";
      const entries = collectRosterModifierGroupExecution([evaluated.value], "hidden").entries;
      if (entries.length !== countHidden(group)) unresolved(group, "This rule's modifier group contains unresolved targets.");
      for (const entry of entries) apply(entry.modifier, entry.evaluated ? entry.status : "unresolved", evaluated.value.completeness === "complete");
    }
    return { source, status: known ? hidden ? "hidden" : "visible" : "unresolved", written, completeness: incomplete ? "incomplete" : "complete" };
  });
  const writes = layers.filter(layer => layer.written);
  let status: RosterRuleVisibilityReport["status"] = writes[0]?.status ?? (base ? "hidden" : "visible");
  if (writes.some(layer => layer.status !== status)) {
    status = "unresolved";
    diagnostics.push({ code: "EVALUATION_RULE_VISIBILITY_LAYER_CONFLICT", severity: "warning", message: "This rule has conflicting definition and link visibility; effective precedence is not established.", impacts: ["validation", "compatibility"], location: { source: sources[0]!.source, path: sources[0]!.path } });
  }
  return { status, completeness: status === "unresolved" || layers.some(layer => layer.completeness === "incomplete") ? "incomplete" : "complete", layers, diagnostics };
}

function relevant(modifier: RosterCharacteristicModifierSource): boolean { return modifier.field === "hidden" || modifier.field === undefined; }
function groupRelevant(group: RosterModifierGroupSource<RosterCharacteristicModifierSource>): boolean { return group.modifiers.some(relevant) || group.modifierGroups.some(groupRelevant); }
function countHidden(group: RosterModifierGroupSource<RosterCharacteristicModifierSource>): number { return group.modifiers.filter(relevant).length + group.modifierGroups.reduce((sum, child) => sum + countHidden(child), 0); }
