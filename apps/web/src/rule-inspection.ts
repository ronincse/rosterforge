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
