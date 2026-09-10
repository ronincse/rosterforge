// Applicability for routed modifiers retains their enclosing source groups.
// Kept above structural routing to avoid a routing -> conditions -> categories
// dependency cycle. Always evaluate at the declarer, never at the recipient.
import { success, type Result } from "@rosterforge/foundation";
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import type { OrderedXmlElement } from "@rosterforge/battlescribe-data";
import type { Roster, RosterSelection } from "@rosterforge/roster-model";
import { evaluateRosterModifierApplicability, type RosterModifierApplicabilitySource } from "./modifier-applicability.js";
import { evaluateRosterModifierGroupApplicability, collectRosterModifierGroupExecution, type RosterModifierGroupApplicabilityOptions } from "./modifier-groups.js";
import type { NumericModifierApplicability } from "./modifiers.js";
import { indexEvaluationChoices, resolveEvaluationSelection } from "./selection-context.js";

function readableEnvelope(root: OrderedXmlElement): boolean {
  const grammar: Record<string, readonly string[]> = {
    modifierGroup: ["modifiers", "modifierGroups", "conditions", "conditionGroups", "repeats", "comment"],
    modifier: ["conditions", "conditionGroups", "repeats", "comment"],
    conditionGroup: ["conditions", "conditionGroups"], modifiers: ["modifier"], modifierGroups: ["modifierGroup"],
    conditions: ["condition"], conditionGroups: ["conditionGroup"], repeats: ["repeat"], condition: [], repeat: [], comment: [],
  };
  let budget = 4096;
  const visit = (node: OrderedXmlElement, depth: number): boolean => {
    if (--budget < 0 || depth > 64 || !grammar[node.name]) return false;
    const containers = new Set<string>();
    for (const child of node.children) {
      if (child.kind !== "element") continue;
      if (!grammar[node.name]!.includes(child.name)) return false;
      if (["conditions", "conditionGroups", "modifiers", "modifierGroups", "repeats"].includes(child.name)) {
        if (containers.has(child.name) || Object.keys(child.attributes).length) return false;
        containers.add(child.name);
      }
      if (!visit(child, depth + 1)) return false;
    }
    return true;
  };
  return visit(root, 0);
}

/** Evaluate a routed leaf with the whole enclosing group's inherited gates.
 * The exact source modifier identity is retained through routing. A missing
 * group/leaf stays unresolved, not unconditional. Evaluation never mutates a
 * profile, so repeated rendering starts from the same authored base value. */
export function evaluateRoutedApplicability(roster: Roster, context: BattleScribeCatalogueContext, declarer: RosterSelection, modifier: RosterModifierApplicabilitySource, groupPath: readonly number[] | undefined, options: RosterModifierGroupApplicabilityOptions = {}): Result<{readonly evaluated: boolean; readonly status: NumericModifierApplicability}> {
  if (!groupPath) return evaluateRosterModifierApplicability(roster, context, declarer, modifier, options);
  const resolution = resolveEvaluationSelection(declarer, indexEvaluationChoices(context), true);
  const group = resolution.status === "resolved" ? resolution.choices[0]?.modifierGroups[groupPath[0]!] : undefined;
  if (!group || !modifier.field) return success({evaluated:false,status:"unresolved"});
  // The typed projection preserves unknown source behavior in its raw tree.
  // Missing typed predicates must not convert an unknown enclosing gate into
  // an unconditional cross-unit write.
  if (!readableEnvelope(group.node)) return success({evaluated:false,status:"unresolved"});
  const report = evaluateRosterModifierGroupApplicability(roster, context, declarer, group, options);
  if (!report.ok) return report;
  const entries = collectRosterModifierGroupExecution([report.value], modifier.field).entries.filter(entry => entry.modifier === modifier);
  return success(entries.length === 1 ? {evaluated:entries[0]!.evaluated,status:entries[0]!.status} : {evaluated:false,status:"unresolved"}, report.diagnostics);
}
