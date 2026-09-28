// Bounded source-identity presentation policy at the web adapter. Category
// labels are not semantics; an unknown source keeps the neutral fallback.
import type { RosterSelection } from "@rosterforge/roster-model";
import { inspectLocalRosterSelectionCategories, type LocalRosterSession } from "./roster-session.js";

/** Recognize the verified StarCraft setup category only in its uniquely
 * resolved owning system. This affects document order, never applicability or
 * selection validity. Renaming labels cannot move a unit or hide its content. */
export function isSupportingReferenceSelection(session: LocalRosterSession, owner: RosterSelection): boolean {
  const systemId = "sys-ce49-e853-2fea-6af1", categoryId = "9b82-d933-7075-8237";
  const { graph, document } = session.catalogue.context;
  if (document.projection.metadata.gameSystemId !== systemId) return false;
  const references = graph.references.filter(r => r.sourceDocument === document && r.kind === "catalogueGameSystem");
  const target = references[0]?.targets[0];
  if (references.length !== 1 || references[0]?.targets.length !== 1 || target?.kind !== "gameSystem" || target.id !== systemId) return false;
  const closure = graph.reachableDocumentsByDocument.get(document);
  if (!closure?.has(target.document)) return false;
  const definitions = [...closure].flatMap(member => member.projection.categoryEntries.filter(c => c.id === categoryId).map(() => member));
  if (definitions.length !== 1 || definitions[0] !== target.document) return false;
  const result = inspectLocalRosterSelectionCategories(session, owner.id);
  if (!result.ok || result.value.completeness !== "complete" || result.value.report.primaryCategories === undefined) return false;
  const primary = result.value.categories?.filter(c => c.primary) ?? [];
  return primary.length === 1 && primary[0]?.id === categoryId;
}
