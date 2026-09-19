// One ephemeral, scalar-only army document snapshot. Reuses evaluated selected
// references and workspace accounting; neither persistence nor game logic lives here.
import { failure } from "@rosterforge/foundation";
import type { Result } from "@rosterforge/foundation";
import { inspectRosterAssociationChoices, type RosterSelectionConditionCostReport } from "@rosterforge/evaluation";
import { profilePresentationResolver, type MaterializedInfoGroup } from "@rosterforge/data-graph";
import { rosterSelectionAmount, type RosterSelection } from "@rosterforge/roster-model";
import { createRosterWorkspaceViewModel, type RosterWorkspaceCost, type RosterWorkspaceSelection } from "./roster-workspace-model.js";
import { createModelComposition, selectedUpgradeSummary, formatSelectedChoiceSummary } from "./selected-loadout-summary.js";
import { inspectLocalRosterSelectionCategories, isLocalRosterSingletonDesignationChoice, type LocalRosterSession, type LocalRosterSupportedValidationInspection } from "./roster-session.js";
import { createUnitReferenceModel, referenceAttribution, type ReferenceProfileGroup, type ReferenceRule } from "./unit-reference-model.js";
import { categoryRuleDetails } from "./category-rule-details.js";
import { classifyReferenceProfile, orderReferenceProfiles } from "./reference-profile-presentation.js";
import { inspectLocalRule, ruleNameQualification } from "./rule-inspection.js";
import { catalogueReferenceTextIndex, selectedReferenceTextIndex, matchTextReference } from "./reference-text-index.js";
import { referenceTextRuns } from "./reference-rich-text.js";

export interface ArmyReferenceField { readonly name: string; readonly value: string; readonly note: string; }
export interface ArmyReferenceProfile {
  readonly name: string; readonly type: string; readonly section: "model" | "weapon" | "ability" | "additional";
  readonly fields: readonly ArmyReferenceField[]; readonly attribution: string;
  readonly notes: readonly string[]; readonly table: boolean;
  readonly record?: string; readonly effectKey?: string;
  readonly effects?: readonly string[];
  readonly scope?: string;
  readonly members?: readonly { readonly key: string; readonly label: string; readonly amount: number }[];
}
export interface ArmyReferenceRule { readonly anchor: string; readonly name: string; readonly text: string; readonly note: string; readonly users: string[]; readonly parameterNote?: string; }
export interface ArmyReferenceUnit {
  readonly anchor: string; readonly name: string; readonly role: string; readonly configuration: boolean;
  readonly composition: string; readonly options: readonly string[]; readonly costs: readonly RosterWorkspaceCost[];
  readonly profiles: readonly ArmyReferenceProfile[]; readonly rules: readonly string[];
  readonly keywords: readonly string[]; readonly notes: readonly string[]; readonly relationships: string[];
  readonly memberKeywords?: readonly string[];
  readonly sheetUnit?: boolean;
  readonly overview?: string;
  readonly highlights?: readonly string[];
}
export interface ArmyReferenceDocument {
  readonly name: string; readonly catalogue: string; readonly system: string;
  readonly resources: readonly RosterWorkspaceCost[]; readonly status: readonly string[];
  readonly units: readonly ArmyReferenceUnit[]; readonly glossary: readonly ArmyReferenceRule[];
}

/** Resolve the entire current unsaved army once at export time. Only strings,
 * numbers and small arrays leave this boundary; source objects/reports remain
 * transient. Grouping and quantities retain the screen reader's exact contract.
 */
export function createArmyReferenceDocument(session: LocalRosterSession, costs: Result<RosterSelectionConditionCostReport>, validation: Result<LocalRosterSupportedValidationInspection>): ArmyReferenceDocument {
  const workspace = createRosterWorkspaceViewModel(session, { costs, validation, rootChoices: failure([]) }, undefined, true);
  const resolver = profilePresentationResolver(session.catalogue.context.graph);
  const glossary = new Map<string, ArmyReferenceRule>();
  const units: ArmyReferenceUnit[] = [];
  const byOccurrence = new Map<string, ArmyReferenceUnit>();
  const baseIndex = catalogueReferenceTextIndex(session);
  const occurrences = new Map<RosterSelection, string>();
  const topLevels = new Map<RosterSelection, string>();
  workspace.selections.ordered.forEach((selected, index) => {
    const visit = (owner: RosterSelection) => {
      occurrences.set(owner, `S${occurrences.size + 1}`);
      topLevels.set(owner, `U${index + 1}`);
      owner.selections.forEach(visit);
    };
    visit(selected.occurrence);
  });
  const effectKeys = new Map<string, string>();
  let profileCount = 0;
  const addRule = (rule: ReferenceRule, owner: string, user: string, sourceOnly = false): string | undefined => {
    if (rule.report.status === "hidden" && rule.report.completeness === "complete") return;
    const source = rule.origin === "Linked" ? rule.value.definition : rule.value;
    const name = rule.value.name ?? source.name ?? "Unnamed rule";
    const text = rule.value.description ?? "";
    const dynamic = rule.report.completeness !== "complete" || rule.report.layers.some(layer => layer.source.modifiers.length || layer.source.modifierGroups.length);
    const note = sourceOnly ? "Source reference only; applicability is not established." : rule.report.completeness !== "complete" || rule.report.status === "unresolved" ? "Rule applicability is unresolved; source description shown." : "";
    const parameterNote = ruleNameQualification(rule.report);
    // Static identical definitions can share an explanation, but modified or
    // uncertain occurrences never borrow another owner's rule result.
    const key = JSON.stringify([source.source.sourceId, source.path, name, text, note, parameterNote, dynamic ? owner : null]);
    let entry = glossary.get(key);
    if (!entry) { entry = { anchor: `rule-${glossary.size + 1}`, name, text: text.trim() ? text : "No description is available in the selected source.", note, parameterNote, users: [] }; glossary.set(key, entry); }
    if (!entry.users.includes(user)) entry.users.push(user);
    return entry.anchor;
  };
  const profile = (group: ReferenceProfileGroup, path = ""): ArmyReferenceProfile => {
    const value = group.profile.value;
    const report = group.report;
    const presentation = group.presentation ?? classifyReferenceProfile(group.profile, resolver("definition" in value ? value.definition : value));
    const notes = [...presentation.notes];
    if (!report) notes.push("Profile inspection unavailable; source values shown.");
    else {
      if (report.completeness !== "complete") notes.push("Some display behavior is unresolved; values are not a complete result.");
      if (report.visibility.status !== "visible") notes.push(report.visibility.status === "hidden" ? "Hidden by catalogue." : "Visibility unresolved.");
    }
    const name = report?.name.value ?? value.name ?? "Unnamed profile";
    const record = `P${++profileCount}`;
    const steps = report ? [...report.report.characteristics.flatMap(field => field.steps), ...report.name.steps, ...report.annotation.steps] : [];
    // A display alias is not evaluator equivalence. Preserve carrier identity,
    // base values and exact effect provenance internally, including inactive
    // effects; unresolved/own-condition evidence remains isolated by record.
    const source = "definition" in value ? value.definition : value;
    const signature = JSON.stringify([source.source.sourceId, source.path, value.typeId,
      report?.report.characteristics.map(field => [field.typeId, field.baseValue]),
      steps.map(step => [step.modifier.source.sourceId, step.modifier.path, step.modifier.node.attributes, occurrences.get(step.declaredBy), step.origin, step.grouped, step.status, step.input, "output" in step ? step.output : null]),
      !report || report.completeness !== "complete" || report.report.modifierApplicability.length || report.report.modifierGroupApplicability.length || report.visibility.modifierApplicability.length || report.visibility.modifierGroupApplicability.length ? record : null]);
    let effectKey = effectKeys.get(signature);
    if (!effectKey) { effectKey = `E${effectKeys.size + 1}`; effectKeys.set(signature, effectKey); }
    const effects = [...new Set(steps.filter(step => step.status === "applied" && step.input !== step.output).map(step => `${step.modifier.type ?? "Modification"} ${step.modifier.value ?? ""} from ${topLevels.get(step.declaredBy) ?? "selected entry"} / ${step.declaredBy.name ?? session.selectionChoices.get(step.declaredBy.id)?.name ?? "selected effect"}${step.modifier.scope ? ` (scope: ${step.modifier.scope})` : ""}`))];
    return { name: name + (report?.annotation.value ? ` (${report.annotation.value})` : ""), type: value.typeName ?? "Additional information", section: presentation.section,
      record, effectKey, effects, scope: path,
      members: group.members.map(member => ({ key: occurrences.get(member.owner) ?? `${record}-unavailable`, label: member.label, amount: rosterSelectionAmount(member.owner) })),
      attribution: [path, referenceAttribution(group.members)].filter(Boolean).join(" · "), notes,
      table: presentation.layout === "table",
      fields: value.characteristics.map((field, index) => {
        const effective = report?.report.characteristics.find(c => c.characteristic === field);
        return { name: field.name ?? `Field ${index + 1}`, value: effective?.value ?? field.value,
          note: [effective?.completeness === "incomplete" ? "Unresolved; source value shown where effective value is unavailable." : effective && effective.value !== effective.baseValue ? (effective.baseValue.trim() ? `Modified from ${effective.baseValue}.` : "Added to an empty source value.") : ""].filter(Boolean).join(" ") };
      }),
    };
  };
  for (const [position, selected] of workspace.selections.ordered.entries()) {
    const root = selected.occurrence;
    const model = createUnitReferenceModel(session, root);
    const anchor = `unit-${position + 1}`;
    const baseName = root.name ?? session.selectionChoices.get(root.id)?.name ?? "Unnamed selection";
    const name = model.displayNotes.find(n => n.owner === root)?.name ?? baseName;
    const label = `${position + 1}. ${name}`;
    const notes = model.displayNotes.filter(n => n.incomplete).map(n => `${n.name}: display unresolved.`);
    if (model.unavailableOwners.length) notes.push("Some selected content could not be resolved from its source.");
    if (!selected.costs.available || selected.costs.unresolvedSelectionCount || selected.costs.excludedCount) notes.push("Costs are qualified: some selected costs are unresolved or excluded.");
    const rules: string[] = [];
    const add = (rule: ReferenceRule, owner: string, sourceOnly = false, scope = "") => { const id = addRule(rule, owner, [label, scope].filter(Boolean).join(" · "), sourceOnly); if (id && !rules.includes(id)) rules.push(id); };
    model.rules.forEach(group => add(group.rule, group.members.map(m => m.owner.id).join("|"), false, referenceAttribution(group.members)));
    const profiles = orderReferenceProfiles(model.profiles).map(group => profile(group));
    const nested = (group: MaterializedInfoGroup, item: typeof model.supplementary[number], parents: string[]) => {
      const path = [...parents, group.name ?? "Information group"];
      const groups: ReferenceProfileGroup[] = [
        ...group.profiles.map(value => ({ profile: { origin: "Direct" as const, value }, report: item.reports?.get(value), members: [item.member] })),
        ...group.materializedInfoLinks.flatMap(value => value.kind === "profileInfoLink" ? [{ profile: { origin: "Linked" as const, value }, report: item.reports?.get(value), members: [item.member] }] : []),
      ].map(p => ({ ...p, presentation: classifyReferenceProfile(p.profile, resolver("definition" in p.profile.value ? p.profile.value.definition : p.profile.value)) }));
      profiles.push(...orderReferenceProfiles(groups).map(p => profile(p, path.join(" / "))));
      const scope = `${referenceAttribution([item.member])} · ${path.join(" / ")}`;
      for (const value of group.rules) add({ origin: "Direct", value, report: inspectLocalRule(value, session, item.member.owner) }, item.member.owner.id + path.join("/"), false, scope);
      for (const link of group.materializedInfoLinks) {
        if (link.kind === "ruleInfoLink") add({ origin: "Linked", value: link, report: inspectLocalRule(link, session, item.member.owner) }, item.member.owner.id + path.join("/"), false, scope);
        if (link.kind === "infoGroup") nested(link, item, path);
        if (link.kind === "unresolvedInfoLink") notes.push(`${path.join(" / ")}: linked information unavailable.`);
      }
      group.materializedInfoGroups.forEach(g => nested(g, item, path));
    };
    model.supplementary.forEach(item => { item.groups.forEach(g => nested(g, item, [])); if (item.unresolved.length) notes.push(`${item.member.label}: linked information unavailable.`); });
    const keywords: string[] = [];
    const memberKeywords: string[] = [];
    const displayLabel = (node: RosterWorkspaceSelection) => model.displayNotes.find(n => n.owner === node.occurrence)?.name ?? node.occurrence.name ?? session.selectionChoices.get(node.occurrence.id)?.name ?? "Unnamed selection";
    const models: RosterWorkspaceSelection[] = [];
    // Reuse the screen's exact-choice/loadout grouping; prune model branches
    // from the separate unit-level upgrade summary to avoid double counting.
    const nonModel = (node: RosterWorkspaceSelection): RosterWorkspaceSelection[] => {
      const choice = session.selectionChoices.get(node.occurrence.id);
      if (choice?.kind === "selectionEntry" && choice.type === "model") { models.push(node); return []; }
      return [{ ...node, selections: node.selections.flatMap(nonModel) }];
    };
    const remainder = nonModel(selected);
    const composition = createModelComposition(session, models, displayLabel);
    const options = composition.entries.map(entry => `${entry.amount}× ${entry.name}${entry.loadout.length ? ": " + formatSelectedChoiceSummary(entry.loadout) : ""}`);
    const upgrades = selectedUpgradeSummary(session, remainder.flatMap(n => n.selections), new Set(), displayLabel);
    if (upgrades.length) options.push(formatSelectedChoiceSummary(upgrades));
    const visit = (owner: RosterSelection, parents: readonly string[] = []) => {
      const choice = session.selectionChoices.get(owner.id);
      const display = model.displayNotes.find(n => n.owner === owner)?.name ?? owner.name ?? choice?.name ?? "Unnamed selection";
      const categories = inspectLocalRosterSelectionCategories(session, owner.id);
      if (categories.ok && categories.value.categories) {
        for (const category of categories.value.categories) {
          // The category inspector falls back to its ID when no display name
          // resolves. Keep the limitation, never that technical fallback label.
          const categoryName = category.name === category.id ? "Unresolved keyword" : category.name;
          if (category.name === category.id) notes.push(`${display}: a keyword name could not be resolved.`);
          if (owner === root && !keywords.includes(categoryName)) keywords.push(categoryName);
          else if (owner !== root && !keywords.includes(categoryName)) {
            // This is a scoped label list, not another model count. Repeated
            // identical paths may share a label without implying one bearer.
            const scoped = `${[...parents, display].join(" → ")}: ${categoryName}`;
            if (!memberKeywords.includes(scoped)) memberKeywords.push(scoped);
          }
          for (const rule of categoryRuleDetails(session, category.id, owner)) add(rule, owner.id, false, `${[...parents, display].join(" → ")}: ${categoryName}`);
        }
        if (categories.value.completeness !== "complete") notes.push(`${display}: some keyword/category behavior is unresolved.`);
      } else notes.push(`${display}: effective keywords unavailable.`);
      owner.selections.forEach(child => visit(child, owner === root ? [] : [...parents, display]));
    };
    visit(root);
    // Follow only phrases in included explanations. A bounded, cycle-aware text
    // queue includes nested/category references without expanding a source graph.
    const index = selectedReferenceTextIndex(baseIndex, model);
    const texts = [...profiles.flatMap(p => p.fields.map(f => f.value)), ...[...glossary.values()].filter(r => rules.includes(r.anchor)).map(r => r.text), ...keywords, ...memberKeywords];
    const scanned = new Set<string>();
    let references = 0;
    for (const raw of texts) {
      if (scanned.has(raw)) continue;
      scanned.add(raw);
      if (raw.length > 32768) { notes.push("Automatic cross-references limited for oversized text; full source text retained."); continue; }
      const text = referenceTextRuns(raw).map(r => r.text).join("");
      for (let i = 0; i < text.length && references < 256;) {
        const match = matchTextReference(index, text, i);
        if (!match) { i++; continue; }
        references++;
        for (const rule of match.target.rules) {
          const source = rule.origin === "Linked" ? rule.value.definition : rule.value;
          if (match.target.sourceOnly && !isSharedReference(source.path)) continue;
          if (match.target.sourceOnly) add(rule, root.id, true);
          if (rule.value.description) texts.push(rule.value.description);
        }
        // Source-only profile references belong in the appendix, not selected
        // stats. They are explanations, never evidence of purchased equipment.
        for (const p of match.target.profiles) if (match.target.sourceOnly) {
          const source = "definition" in p.profile.value ? p.profile.value.definition : p.profile.value;
          if (!isSharedReference(source.path)) continue;
          const presentation = classifyReferenceProfile(p.profile, resolver(source));
          // An ordinary prose mention of an unselected model/weapon is not a
          // request for its statline. Reuse SC-06's classification to include
          // explanatory abilities only; unknown selected profiles remain above.
          if (presentation.section !== "ability") continue;
          const key = JSON.stringify([source.source.sourceId, source.path, "profile-reference"]);
          let entry = glossary.get(key);
          if (!entry) { entry = { anchor: `rule-${glossary.size + 1}`, name: source.name ?? "Reference", text: source.characteristics.map(c => `${c.name ?? "Field"}: ${c.value}`).join("\n\n"), note: "Source reference only; applicability is not established.", users: [] }; glossary.set(key, entry); }
          if (!entry.users.includes(label)) entry.users.push(label);
          if (!rules.includes(entry.anchor)) rules.push(entry.anchor);
          // Scan authored values, not generated labels such as "Keywords",
          // which can accidentally name an unrelated catalogue ability.
          texts.push(...source.characteristics.map(c => c.value));
        }
        i += match.text.length;
      }
    }
    if (index.limited || references >= 256) notes.push("Automatic reference lookup reached its display limit; attached rules remain included.");
    const rootChoice = session.selectionChoices.get(root.id);
    const unit: ArmyReferenceUnit = { anchor, name: label, role: !selected.role ? "Unassigned" : selected.role.name === selected.role.key ? "Unresolved role" : selected.role.name, configuration: selected.section === "configuration", composition: model.composition ?? `${rosterSelectionAmount(root)}× ${name}`, options,
      overview: composition.total > 0 ? `${composition.total} model${composition.total === 1 ? "" : "s"}` : `${rosterSelectionAmount(root)} selected entr${rosterSelectionAmount(root) === 1 ? "y" : "ies"}`,
      // Highlight explicitly selected non-weapon choices with costs or rules,
      // never guessed defaults or faction-specific option names. Full loadouts
      // remain below even when an unfamiliar choice has no highlight metadata.
      highlights: [...new Set(selectedUpgradeSummary(session, selected.selections, new Set(), displayLabel).filter(upgrade => {
        const find = (node: RosterWorkspaceSelection): boolean => {
          const choice = session.selectionChoices.get(node.occurrence.id);
          return (displayLabel(node) === upgrade.name && Boolean(node.costs.totals.some(c => c.value !== 0) || (choice && isLocalRosterSingletonDesignationChoice(session, choice)) || choice?.rules.length || choice?.profiles.some(p => p.characteristics.some(c => c.name === "Description")))) || node.selections.some(find);
        };
        return find(selected);
      }).map(upgrade => upgrade.name))],
      // Page starts follow explicit entry kind, not system-specific role names.
      // Setup upgrades stay in the reference without consuming empty sheets.
      sheetUnit: (rootChoice?.kind === "selectionEntry" && ["unit", "model"].includes(rootChoice.type ?? "")) || (!rootChoice && selected.section !== "configuration"),
      costs: selected.costs.totals.filter(c => c.value !== 0), profiles, rules, keywords, memberKeywords, notes: [...new Set(notes)], relationships: [] };
    units.push(unit); byOccurrence.set(root.id, unit);
  }
  for (const edge of session.roster.associations ?? []) {
    const source = byOccurrence.get(edge.sourceId), target = byOccurrence.get(edge.targetId);
    const owner = workspace.selections.ordered.find(s => s.occurrence.id === edge.sourceId)?.occurrence;
    const definition = owner ? inspectRosterAssociationChoices(session.roster, session.catalogue.context, owner).find(c => c.key === edge.definitionKey) : undefined;
    const verified = definition?.candidates.some(c => c.selection.id === edge.targetId && c.status === "satisfied");
    const qualifier = verified ? "" : " (eligibility unverified)";
    source?.relationships.push(`${definition?.name ?? "Attachment"}: ${target?.name ?? "unavailable unit"}${qualifier}`);
    target?.relationships.push(`Attached: ${source?.name ?? "unavailable unit"}${qualifier}`);
  }
  const reachable = session.catalogue.context.graph.reachableDocumentsByDocument.get(session.catalogue.document);
  const system = [...reachable ?? []].find(d => d.metadata.kind === "gameSystem")?.metadata.name ?? "";
  return { name: session.roster.name, catalogue: session.catalogue.name, system,
    resources: workspace.costs.activeTotals,
    status: [!workspace.costs.available ? "Supported costs unavailable." : workspace.costs.completeness !== "complete" ? "Some costs are unresolved or excluded; totals are qualified." : "Supported costs complete.",
      !workspace.validation.available ? "Supported checks unavailable." : workspace.validation.validity === "invalid" ? `${workspace.validation.issueCount} known roster problems.` : "No known violations in supported checks.",
      workspace.header.completeness === "incomplete" ? "Some rules are not checked. This is not a claim of full legality." : "Supported checks complete; not a full-game legality certification."], units, glossary: [...glossary.values()] };
}

// A phrase is not an ID link. Source-only lookup must not borrow a local rule
// from an unselected detachment/unit just because it has a generic unique name
// (the pinned corpus has an unrelated local rule named "Keywords"). Attached
// selected rules/groups above remain owner-evaluated and are never filtered.
function isSharedReference(path: readonly string[]): boolean {
  return path.length === 3 && /^(sharedRules|rules|sharedProfiles)\[/.test(path[1] ?? "");
}
