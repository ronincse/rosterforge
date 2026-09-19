// Selected-unit reading projection. This UI-only layer retains the original
// owners/reports; it neither changes selections nor evaluates new game semantics.
import { profilePresentationResolver } from "@rosterforge/data-graph";
import { classifyReferenceProfile, referenceProfileSourceKey, type ReferenceProfilePresentation } from "./reference-profile-presentation.js";
import type { MaterializedInfoGroup, MaterializedProfileInfoLink, MaterializedRuleInfoLink, UnresolvedMaterializedInfoLink } from "@rosterforge/data-graph";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";
import type { RosterRuleReport } from "@rosterforge/evaluation";
import { rosterSelectionAmount, type RosterSelection } from "@rosterforge/roster-model";
import { inspectLocalRule } from "./rule-inspection.js";
import { inspectLocalRosterSelectionCharacteristics, inspectLocalRosterSelectionName, inspectLocalRosterSelectionAnnotation, type LocalRosterProfileCharacteristics, type LocalRosterSession } from "./roster-session.js";

export type ReferenceProfile =
  | { readonly origin: "Direct"; readonly value: BattleScribeRosterSelectionChoice["profiles"][number] }
  | { readonly origin: "Linked"; readonly value: MaterializedProfileInfoLink };
export type ReferenceRule = (
  | { readonly origin: "Direct"; readonly value: BattleScribeRosterSelectionChoice["rules"][number] }
  | { readonly origin: "Linked"; readonly value: Pick<MaterializedRuleInfoLink, "definition" | "link" | "hidden" | "name" | "description"> }
) & { readonly report: RosterRuleReport };
export interface ReferenceMember {
  readonly owner: RosterSelection;
  readonly choice: BattleScribeRosterSelectionChoice;
  readonly label: string;
}
export interface ReferenceProfileGroup {
  readonly presentation?: ReferenceProfilePresentation | undefined;
  readonly profile: ReferenceProfile;
  readonly report: LocalRosterProfileCharacteristics | undefined;
  readonly members: readonly ReferenceMember[];
}
export interface ReferenceRuleGroup {
  readonly rule: ReferenceRule;
  readonly members: readonly ReferenceMember[];
}
export interface UnitReferenceModel {
  readonly composition?: string;
  readonly unavailableOwners: readonly RosterSelection[];
  readonly displayNotes: readonly { owner: RosterSelection; name: string; incomplete: boolean }[];
  readonly profiles: readonly ReferenceProfileGroup[];
  readonly rules: readonly ReferenceRuleGroup[];
  readonly supplementary: readonly {
    member: ReferenceMember;
    presentations: ReadonlyMap<string, ReferenceProfilePresentation>;
    groups: readonly MaterializedInfoGroup[];
    unresolved: readonly UnresolvedMaterializedInfoLink[];
    reports: ReadonlyMap<ReferenceProfile["value"], LocalRosterProfileCharacteristics> | undefined;
  }[];
}

/** Build only the viewed selected subtree, once per immutable session/modal.
 *
 * Equivalence is deliberately conservative: identical source carriers, selected
 * lineage/loadout and complete static effective output. Any modifier evidence
 * (even an inactive write or a write yielding the same value) isolates its owner.
 * Information-group scope is not flattened: its existing owner-aware renderer
 * remains authoritative. No full report is serialized: those contain the roster
 * and catalogue graph. Reports stay attached to their OWN representative, never
 * in a merged map keyed by a shared source profile.
 */
export function createUnitReferenceModel(session: LocalRosterSession, root: RosterSelection): UnitReferenceModel {
  const resolvePresentation = profilePresentationResolver(session.catalogue.context.graph);
  const composition = new Map<string, number>();
  const identities = new Map<object, number>();
  const identity = (value: object): number => {
    let id = identities.get(value);
    if (id === undefined) { id = identities.size; identities.set(value, id); }
    return id;
  };
  const profileGroups = new Map<string, { presentation: ReferenceProfilePresentation; profile: ReferenceProfile; report: LocalRosterProfileCharacteristics | undefined; members: ReferenceMember[] }>();
  const ruleGroups = new Map<string, { rule: ReferenceRule; members: ReferenceMember[] }>();
  const supplementary: UnitReferenceModel["supplementary"][number][] = [];
  const unavailableOwners: RosterSelection[] = [];
  const displayNotes: UnitReferenceModel["displayNotes"][number][] = [];
  const carrier = (value: ReferenceProfile["value"] | ReferenceRule["value"]) => "definition" in value
    ? [identity(value.definition), identity(value.link)] : [identity(value)];
  const dynamic = (value: { modifiers: readonly unknown[]; modifierGroups: readonly unknown[] }) => value.modifiers.length + value.modifierGroups.length > 0;
  const loadoutIds = new Map<RosterSelection, number>();
  const loadoutSignatures = new Map<string, number>();
  // Intern bottom-up once. Carrying full ancestor subtrees into every profile
  // key would repeatedly serialize the entire squad as its model count grows.
  const loadout = (owner: RosterSelection): number => {
    const cached = loadoutIds.get(owner);
    if (cached !== undefined) return cached;
    const choice = session.selectionChoices.get(owner.id);
    const signature = JSON.stringify([choice && identity(choice.definition), choice && identity(choice.occurrence), owner.name, rosterSelectionAmount(owner), owner.selections.map(loadout)]);
    let id = loadoutSignatures.get(signature);
    if (id === undefined) { id = loadoutSignatures.size; loadoutSignatures.set(signature, id); }
    loadoutIds.set(owner, id);
    return id;
  };
  const visit = (owner: RosterSelection, lineage: readonly unknown[], labels: readonly string[]) => {
    const choice = session.selectionChoices.get(owner.id);
    if (choice === undefined) {
      unavailableOwners.push(owner);
      // Broken parent resolution must not suppress known selected descendants,
      // or equate their uncertain scope with another occurrence's scope.
      for (const child of owner.selections) visit(child, [...lineage, owner.id], [...labels, owner.name ?? "Unavailable selection"]);
      return;
    }
    const sourceName = owner.name ?? choice.name ?? "Unnamed selection";
    const name = inspectLocalRosterSelectionName(session, owner.id, sourceName);
    const annotation = inspectLocalRosterSelectionAnnotation(session, owner.id);
    const annotationValue = annotation.ok ? annotation.value.value : undefined;
    const effectiveName = name.ok ? name.value.value ?? sourceName : sourceName;
    const label = annotationValue ? `${effectiveName} (${annotationValue})` : effectiveName;
    const namingIncomplete = !name.ok || name.value.completeness === "incomplete" || !annotation.ok || annotation.value.completeness === "incomplete";
    const namingDynamic = namingIncomplete || (name.ok && name.value.steps.length > 0) || (annotation.ok && annotation.value.steps.length > 0);
    if (label !== sourceName || namingIncomplete) displayNotes.push({ owner, name: label, incomplete: namingIncomplete });
    if (choice.kind === "selectionEntry" && choice.type === "model") composition.set(label, (composition.get(label) ?? 0) + rosterSelectionAmount(owner));
    const path = [...labels, label];
    const scope = [...lineage, [identity(choice.definition), identity(choice.occurrence), loadout(owner), label, namingDynamic ? owner.id : null]];
    // The profile itself names the equipment; attribution names its selected
    // bearer. Exact full paths remain in the occurrence disclosure.
    const bearer = choice.kind === "selectionEntry" && choice.type === "model" ? path.slice(1) : path.slice(1, -1);
    const member: ReferenceMember = { owner, choice, label: (bearer.length ? bearer : [label]).join(" → ") };
    const inspection = inspectLocalRosterSelectionCharacteristics(session, owner.id);
    const reports = inspection.ok ? inspection.value.byProfile : undefined;
    const profiles: ReferenceProfile[] = [
      ...choice.profiles.map(value => ({ origin: "Direct" as const, value })),
      ...choice.materializedInfoLinks.filter((v): v is MaterializedProfileInfoLink => v.kind === "profileInfoLink").map(value => ({ origin: "Linked" as const, value })),
    ];
    for (const profile of profiles) {
      const report = reports?.get(profile.value);
      const modified = dynamic(profile.value) || ("definition" in profile.value && (dynamic(profile.value.definition) || dynamic(profile.value.link))) || report === undefined || report.completeness !== "complete"
        || report.name.steps.length > 0 || report.annotation.steps.length > 0
        || report.visibility.modifierApplicability.length > 0 || report.visibility.modifierGroupApplicability.length > 0
        || report.report.modifierApplicability.length > 0 || report.report.modifierGroupApplicability.length > 0
        || report.report.characteristics.some(c => c.steps.length > 0);
      const key = JSON.stringify([scope, carrier(profile.value), profile.value.typeId, profile.value.typeName,
        report?.name.value, report?.annotation.value, report?.visibility.status,
        report?.report.characteristics.map(c => [c.characteristic.typeId, c.baseValue, c.value, c.completeness]),
        modified ? owner.id : null]);
      const group = profileGroups.get(key);
      if (group) group.members.push(member);
      else profileGroups.set(key, { profile, report, members: [member], presentation: classifyReferenceProfile(profile, resolvePresentation("definition" in profile.value ? profile.value.definition : profile.value)) });
    }
    const rules: ReferenceRule[] = [
      ...choice.rules.map(value => ({ origin: "Direct" as const, value, report: inspectLocalRule(value, session, owner) })),
      ...choice.materializedInfoLinks.filter((v): v is MaterializedRuleInfoLink => v.kind === "ruleInfoLink").map(value => ({ origin: "Linked" as const, value, report: inspectLocalRule(value, session, owner) })),
    ];
    for (const rule of rules) {
      if (rule.report.status === "hidden" && rule.report.completeness === "complete") continue;
      const unique = rule.report.name.completeness !== "complete" || rule.report.completeness !== "complete" || rule.report.layers.some(layer => dynamic(layer.source));
      const key = JSON.stringify([scope, carrier(rule.value), rule.report.name.value, rule.value.name, rule.value.description, rule.report.status, unique ? owner.id : null]);
      const group = ruleGroups.get(key);
      if (group) group.members.push(member);
      else ruleGroups.set(key, { rule, members: [member] });
    }
    const groups = [...choice.materializedInfoGroups, ...choice.materializedInfoLinks.filter((v): v is MaterializedInfoGroup => v.kind === "infoGroup")];
    const unresolved = choice.materializedInfoLinks.filter((v): v is UnresolvedMaterializedInfoLink => v.kind === "unresolvedInfoLink");
    if (groups.length || unresolved.length) {
      // Retain authored group hierarchy. Only scalar hints cross the additional
      // reader boundary; each group's existing owner reports remain authoritative.
      const presentations = new Map<string, ReferenceProfilePresentation>();
      const collect = (group: MaterializedInfoGroup) => {
        const nestedProfiles: ReferenceProfile[] = [
          ...group.profiles.map(value => ({ origin: "Direct" as const, value })),
          ...group.materializedInfoLinks.filter((link): link is MaterializedProfileInfoLink => link.kind === "profileInfoLink").map(value => ({ origin: "Linked" as const, value })),
        ];
        for (const profile of nestedProfiles) presentations.set(referenceProfileSourceKey(profile), classifyReferenceProfile(profile, resolvePresentation("definition" in profile.value ? profile.value.definition : profile.value)));
        for (const nested of [...group.materializedInfoGroups, ...group.materializedInfoLinks.filter((link): link is MaterializedInfoGroup => link.kind === "infoGroup")]) collect(nested);
      };
      groups.forEach(collect);
      supplementary.push({ member, groups, unresolved, reports, presentations });
    }
    for (const child of owner.selections) visit(child, scope, path);
  };
  visit(root, [], []);
  return { ...(unavailableOwners.length === 0 && composition.size > 0 ? { composition: [...composition].map(([name, count]) => `${count}× ${name}`).join("; ") } : {}), profiles: [...profileGroups.values()], rules: [...ruleGroups.values()], supplementary, unavailableOwners, displayNotes };
}

/** Selected quantities are independent, never multiplied by ancestor amounts. */
export function referenceAttribution(members: readonly ReferenceMember[]): string {
  const labels = new Map<string, number>();
  for (const member of members) labels.set(member.label, (labels.get(member.label) ?? 0) + rosterSelectionAmount(member.owner));
  return [...labels].map(([label, quantity]) => `${quantity}× ${label}`).join("; ");
}
