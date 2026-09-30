// Source-identity UI policy for StarCraft setup and counters. This adapter
// partitions presentation only; stored occurrences and evaluation stay intact.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import type { RosterResourceBudgetsReport } from "@rosterforge/evaluation";
import { rosterSelectionsAmount } from "@rosterforge/roster-model";
import { inspectLocalRosterSelectionCategories, type LocalRosterSession } from "./roster-session.js";
import type { RosterWorkspaceRootChoiceGroup, RosterWorkspaceSelectionGroup, RosterWorkspaceViewModel } from "./roster-workspace-model.js";

const systemId = "sys-ce49-e853-2fea-6af1";
const categories = [
  ["9b82-d933-7075-8237", systemId, "pregame"],
  ["5eca-d421-1fdc-a95f", "a993-a28e-5c72-5b0a", "faction"],
  ["acb5-b55f-9492-5149", "a993-a28e-5c72-5b0a", "tactical"],
  ["e4d8-c158-a9fd-08ba", "d5ca-ef26-b879-bdc1", "faction"],
  ["45a9-5def-355b-0560", "d5ca-ef26-b879-bdc1", "tactical"],
  ["7786-b4c1-7de3-915c", "9853-7f07-916b-d7d3", "faction"],
  ["6042-132c-4895-cde4", "9853-7f07-916b-d7d3", "tactical"],
] as const;
const counterIds = ["5bcf-897a-a5c9-d0e8", "1719-6214-392e-e53f", "472f-46af-8e02-bfbf", "f5f9-3591-0f2d-0a53", "7e61-585f-b715-85e0", "31a6-c1f1-3d47-fa76"];

function resolvedSystem(context: BattleScribeCatalogueContext) {
  const { graph, document } = context;
  if (document.projection.metadata.gameSystemId !== systemId) return undefined;
  const references = graph.references.filter(r => r.sourceDocument === document && r.kind === "catalogueGameSystem");
  const target = references[0]?.targets[0];
  if (references.length !== 1 || references[0]?.targets.length !== 1 || target?.kind !== "gameSystem" || target.id !== systemId) return undefined;
  const closure = graph.reachableDocumentsByDocument.get(document);
  if (!closure?.has(document) || !closure.has(target.document)) return undefined;
  if ([...closure].filter(d => d.metadata.kind === "gameSystem").length !== 1 || graph.references.some(r => closure.has(r.sourceDocument) && (r.kind === "catalogueGameSystem" || r.kind === "catalogueLink") && r.targets.length !== 1)) return undefined;
  return { document: target.document, closure };
}

/** Separates verified setup roots for the live UI, including secondary Tactical
 * membership on Zerg Creep cards. Unknown/ambiguous categories stay visible in
 * the ordinary list. Names never confer setup identity. Each selected root is
 * inspected once; no retained bytes or stored selections are copied/rewritten.
 * Verified panels exist before selection, including when no choices are visible.
 * The shared workspace model remains unchanged for print/export consumers. */
export function starcraftWorkspaceSections(session: LocalRosterSession, workspace: RosterWorkspaceViewModel) {
  const system = resolvedSystem(session.catalogue.context);
  const known = new Map<string, { name: string; order: number; kind: "pregame" | "faction" | "tactical" }>();
  if (system) for (const [id, owner, kind] of categories) {
    const definitions = [...system.closure].flatMap(d => d.projection.categoryEntries.filter(c => c.id === id).map(c => ({ c, d })));
    const match = definitions[0];
    if (definitions.length === 1 && match?.d.metadata.id === owner) known.set(id, { name: match.c.name ?? id, order: known.size, kind });
  }
  const categoryFor = (ids: readonly string[]) => {
    const matches = [...new Set(ids)].filter(id => known.has(id));
    return matches.length === 1 ? matches[0] : undefined;
  };
  const setupChoices = new Map<string, RosterWorkspaceRootChoiceGroup>();
  const unitChoices: RosterWorkspaceRootChoiceGroup[] = [];
  for (const group of workspace.rootChoices.groups) {
    const choices = group.choices.filter(state => {
      const choice = state.choice.materialized;
      // Kerrigan's Swarm is authored as a unit despite being a Faction. The
      // verified setup category, not that type or the display label, owns this.
      const id = categoryFor(choice.categoryLinks.flatMap(link => link.targetId ? [link.targetId] : []));
      if (!id) return true;
      const bucket = setupChoices.get(id);
      setupChoices.set(id, { key: id, name: known.get(id)!.name, section: "configuration", choices: [...(bucket?.choices ?? []), state] });
      return false;
    });
    if (choices.length) unitChoices.push({ ...group, choices });
  }
  const setupSelections = new Map<string, RosterWorkspaceSelectionGroup>();
  const armyGroups: RosterWorkspaceSelectionGroup[] = [];
  for (const group of workspace.selections.groups) {
    if (group.selections.length === 0 && known.has(group.role.key)) {
      // A positive source minimum can seed an empty role. Its controls belong
      // to the same setup panel, never a second 'Add faction units' army role.
      setupSelections.set(group.role.key, group);
      continue;
    }
    const selections = group.selections.filter(selection => {
      if (!system || !session.selectionChoices.has(selection.occurrence.id)) return true;
      const inspection = inspectLocalRosterSelectionCategories(session, selection.occurrence.id);
      const id = inspection.ok && inspection.value.completeness === "complete"
        ? categoryFor(inspection.value.categories?.map(c => c.id) ?? []) : undefined;
      if (!id) return true;
      const category = known.get(id)!;
      const bucket = setupSelections.get(id);
      const members = [...(bucket?.selections ?? []), selection];
      setupSelections.set(id, { role: { key: id, name: category.name, order: category.order, known: true }, selections: members, amount: rosterSelectionsAmount(members.map(s => s.occurrence)) });
      return false;
    });
    // Keep original requirements on unsplit roles. A mixed role's global bound
    // still appears in validation; don't mislabel it as a bound on a subset.
    if (selections.length || group.selections.length === 0) armyGroups.push(selections.length === group.selections.length ? group : { role: group.role, selections, amount: rosterSelectionsAmount(selections.map(s => s.occurrence)) });
  }
  const order = (id: string) => known.get(id)?.order ?? 0;
  // Seed verified panels before anything is selected. Otherwise Faction and
  // Tactical disappear exactly when the player needs their selection controls.
  const setupPanels = [...known].map(([id, category]) => ({
    kind: category.kind,
    group: setupSelections.get(id) ?? { role: { key: id, name: category.name, order: category.order, known: true }, selections: [], amount: 0 },
    choices: setupChoices.get(id) ?? { key: id, name: category.name, section: "configuration" as const, choices: [] },
  }));
  return { enabled: known.size > 0, unitChoices, setupPanels, setupChoices: [...setupChoices.values()].sort((a, b) => order(a.key) - order(b.key)), armyGroups, setupGroups: [...setupSelections.values()].sort((a, b) => a.role.order - b.role.order) };
}

/** Returns the six verified GST resource reports in stable UI order, including
 * zero. Supply is a signed authored balance, never an inferred used/allowance
 * pair. Exactness and any explicit maximum remain evaluator-owned. */
export function starcraftWorkspaceCounters(report: RosterResourceBudgetsReport) {
  const system = resolvedSystem(report.context);
  if (!system) return [];
  return counterIds.flatMap((id, index) => {
    const definitions = [...system.closure].flatMap(d => d.projection.costTypes.filter(c => c.id === id).map(() => d));
    const item = report.resources.find(r => r.resource.typeId === id);
    return definitions.length === 1 && definitions[0] === system.document && item
      ? [{ ...item, balance: index >= 2 }] : [];
  });
}
