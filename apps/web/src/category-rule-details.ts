// Shared owner-aware category rules for screen references and paper exports.
import type { ObjectId } from "@rosterforge/foundation";
import type { RuleProjection } from "@rosterforge/battlescribe-data";
import type { RosterSelection } from "@rosterforge/roster-model";
import type { LocalRosterSession } from "./roster-session.js";
import type { ReferenceRule } from "./unit-reference-model.js";
import { inspectLocalRule } from "./rule-inspection.js";

/** Resolve only unambiguous category definitions and rule links, preserving
 * the link carrier and occurrence-specific applicability used on screen. */
export function categoryRuleDetails(
  session: LocalRosterSession,
  categoryId: ObjectId,
  owner: RosterSelection,
): readonly ReferenceRule[] {
  const definitions = session.catalogue.context.categories.definitions.filter(
    ({ source }) => source.id === categoryId,
  );
  const definition = definitions.length === 1 ? definitions[0] : undefined;
  if (definition === undefined) return [];

  const rules: ReferenceRule[] = definition.source.rules.map((value) => ({
    origin: "Direct",
    value,
    report: inspectLocalRule(value, session, owner),
  }));
  for (const link of definition.source.infoLinks) {
    const reference = session.catalogue.context.graph.references.find(
      (candidate) => candidate.kind === "infoLink" && candidate.source === link,
    );
    const target = reference?.targets.length === 1 ? reference.targets[0] : undefined;
    if (target?.kind !== "rule") continue;
    const source = target.source as RuleProjection;
    const hidden = link.hidden ?? source.hidden;
    const name = link.name ?? source.name;
    // Preserve the keyword's link carrier; its visibility may differ from the
    // shared definition used by another category or occurrence.
    const value = {
      definition: source, link,
      ...(hidden === undefined ? {} : { hidden }),
      ...(name === undefined ? {} : { name }),
      ...(source.description === undefined ? {} : { description: source.description }),
    };
    rules.push({ origin: "Linked", value, report: inspectLocalRule(value, session, owner) });
  }
  return rules;
}
