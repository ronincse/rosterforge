// App adapter for independent rule visibility and effective-name reports. Identity caches belong to an
// immutable session/occurrence and never leak a report into a different roster.
import { evaluateRosterRule, type RuleVisibilityInput, type RosterRuleReport } from "@rosterforge/evaluation";
import type { RosterSelection } from "@rosterforge/roster-model";
import type { LocalRosterSession } from "./roster-session.js";

const cache = new WeakMap<LocalRosterSession, WeakMap<RosterSelection, WeakMap<RuleVisibilityInput, RosterRuleReport>>>();

/** Inspects one rule at its actual occurrence, or explicitly as a source-only preview. */
export function inspectLocalRule(rule: RuleVisibilityInput, session?: LocalRosterSession, owner?: RosterSelection): RosterRuleReport {
  if (session === undefined || owner === undefined) return evaluateRosterRule(rule);
  let owners = cache.get(session);
  if (owners === undefined) { owners = new WeakMap(); cache.set(session, owners); }
  let rules = owners.get(owner);
  if (rules === undefined) { rules = new WeakMap(); owners.set(owner, rules); }
  let report = rules.get(rule);
  if (report === undefined) {
    report = evaluateRosterRule(rule, { roster: session.roster, context: session.catalogue.context, owner });
    rules.set(rule, report);
  }
  return report;
}

/** Qualify only unresolved names and unsupported annotations. Applied name
 * steps remain in the report as provenance, not as unevaluated candidates. */
export function ruleNameQualification(report: RosterRuleReport): string {
  const notes: string[] = [];
  if (report.name.completeness === "incomplete") {
    notes.push(report.name.value === undefined
      ? "Effective rule name unresolved; source name shown."
      : "Effective rule name determined; some earlier name behavior remains unresolved.");
    const unapplied = report.name.layers.flatMap((layer, index) => layer.steps
      .filter(step => step.status === "unapplied")
      .map(step => `${report.name.layers.length === 1 ? "rule" : index === 0 ? "definition" : "link"}: ${step.modifier.type ?? "unknown operation"} name ${JSON.stringify(step.modifier.value ?? "[missing operand]")}`));
    if (unapplied.length) notes.push(`Unevaluated name operations (${unapplied.join("; ")}).`);
  }
  const annotations: string[] = [];
  for (const [index, layer] of report.layers.entries()) {
    const carrier = report.layers.length === 1 ? "rule" : index === 0 ? "definition" : "link";
    const visit = (container: typeof layer.source) => {
      for (const m of container.modifiers.filter(m => m.field === "annotation")) {
        annotations.push(`${carrier}: ${m.type ?? "unknown operation"} annotation ${JSON.stringify(m.value ?? "[missing operand]")}`);
      }
      container.modifierGroups.forEach(g => visit({ ...layer.source, modifiers: g.modifiers, modifierGroups: g.modifierGroups }));
    };
    visit(layer.source);
  }
  if (annotations.length) notes.push(`Source-authored annotation operations are not evaluated (${annotations.join("; ")}).`);
  return notes.join(" ");
}
