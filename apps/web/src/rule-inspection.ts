// App adapter for pure rule visibility reports. Identity caches belong to an
// immutable session/occurrence and never leak a report into a different roster.
import { evaluateRosterRuleVisibility, type RuleVisibilityInput, type RosterRuleVisibilityReport } from "@rosterforge/evaluation";
import type { RosterSelection } from "@rosterforge/roster-model";
import type { LocalRosterSession } from "./roster-session.js";

const cache = new WeakMap<LocalRosterSession, WeakMap<RosterSelection, WeakMap<RuleVisibilityInput, RosterRuleVisibilityReport>>>();

/** Inspects one rule at its actual occurrence, or explicitly as a source-only preview. */
export function inspectLocalRule(rule: RuleVisibilityInput, session?: LocalRosterSession, owner?: RosterSelection): RosterRuleVisibilityReport {
  if (session === undefined || owner === undefined) return evaluateRosterRuleVisibility(rule);
  let owners = cache.get(session);
  if (owners === undefined) { owners = new WeakMap(); cache.set(session, owners); }
  let rules = owners.get(owner);
  if (rules === undefined) { rules = new WeakMap(); owners.set(owner, rules); }
  let report = rules.get(rule);
  if (report === undefined) {
    report = evaluateRosterRuleVisibility(rule, { roster: session.roster, context: session.catalogue.context, owner });
    rules.set(rule, report);
  }
  return report;
}

/** Preserve authored name/parameter operations without pretending visibility
 * inspection evaluated them. Definition/link and grouped scope stay explicit;
 * these are source operands, never an inferred effective rule name. */
export function ruleNameQualification(report: RosterRuleVisibilityReport): string {
  const notes: string[] = [];
  for (const [index, layer] of report.layers.entries()) {
    const carrier = report.layers.length === 1 ? "rule" : index === 0 ? "definition" : "link";
    const visit = (container: typeof layer.source, grouped: boolean) => {
      for (const modifier of container.modifiers) {
        if (modifier.field !== "name" && modifier.field !== "annotation") continue;
        const conditional = grouped || modifier.conditions.length > 0 || modifier.conditionGroups.length > 0 || modifier.repeats.length > 0 || modifier.scope !== undefined;
        notes.push(`${carrier}${conditional ? "; scoped/conditional" : ""}: ${modifier.type ?? "unknown operation"} ${modifier.field} ${JSON.stringify(modifier.value ?? "[missing operand]")}`);
      }
      container.modifierGroups.forEach(group => visit({ ...layer.source, modifiers: group.modifiers, modifierGroups: group.modifierGroups }, true));
    };
    visit(layer.source, false);
  }
  return notes.length ? `Source-authored rule parameter/name operations, not evaluated (${notes.join("; ")}). Effective parameter remains unverified.` : "";
}
