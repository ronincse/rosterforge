// Presentation-only qualifications for a demonstrated source/routing mismatch.
// This adapter never executes a modifier or changes an evaluation report.
import {
  affectsModifiers,
  effectiveRosterCategories,
  parseBattleScribeAffectsSelector,
} from "@rosterforge/evaluation";
import type { RosterSelection } from "@rosterforge/roster-model";
import type { LocalRosterProfileCharacteristics, LocalRosterSession } from "./roster-session.js";
import type { ReferenceProfile } from "./unit-reference-model.js";

/** Return notes aligned with the profile's source characteristic array.
 *
 * The supported `entries.recursive` traversal excludes its model anchor. A
 * selected descendant upgrade can nevertheless declare a same-family/field
 * modification using exactly that selector. Surface this narrow discrepancy,
 * without changing traversal, executing conditions, or assuming author intent.
 * Unknown descendants and nested models are boundaries: neither establishes
 * that scope=model would anchor at the supplied owner. Work is linear in the
 * owner's selected non-model descendants and their modifier declarations.
 * Reports/source objects stay transient; only strings leave this boundary.
 */
export function referenceConsistencyFieldNotes(
  session: LocalRosterSession,
  owner: RosterSelection,
  profile: ReferenceProfile,
  report: LocalRosterProfileCharacteristics | undefined,
): readonly (readonly string[])[] {
  const fields = profile.value.characteristics;
  const notes: string[][] = fields.map(() => []);
  const choice = session.selectionChoices.get(owner.id);
  if (choice?.kind !== "selectionEntry" || choice.type !== "model") return notes;
  // Match the evaluator's unique declared profile-type lookup, not a familiar
  // display name or a guessed Unit/Save schema.
  const typeId = profile.value.typeId;
  if (typeId === undefined) return notes;
  const types = (session.catalogue.context.graph.objectsById.get(typeId) ?? [])
    .filter(object => object.kind === "profileType");
  const typeName = types.length === 1 ? (types[0]?.source as { readonly name?: string }).name : undefined;
  if (typeName === undefined) return notes;
  const categoryIndex = effectiveRosterCategories(session.roster, session.catalogue.context);
  if (!categoryIndex.has(owner)) return notes;
  const categories = categoryIndex.get(owner);

  const visit = (selected: RosterSelection): void => {
    const selectedChoice = session.selectionChoices.get(selected.id);
    if (selectedChoice === undefined) return;
    if (selectedChoice.kind === "selectionEntry" && selectedChoice.type === "model") return;
    if (selectedChoice.kind === "selectionEntry" && selectedChoice.type === "upgrade") {
      for (const { modifier } of affectsModifiers(selectedChoice)) {
        if (modifier.scope !== "model") continue;
        const raw = modifier.node.attributes.affects;
        if (raw === undefined) continue;
        const selector = parseBattleScribeAffectsSelector(raw);
        if (!selector.supported || !selector.explicitSelf || selector.target !== "profiles"
          || selector.traversal !== "descendants" || selector.entersGroups || selector.entersForces
          || !selector.segments.includes("entries")) continue;
        const wanted = selector.profileTypeName?.toLowerCase();
        if (wanted !== "all" && wanted !== typeName.toLowerCase()) continue;
        if (selector.filterId !== undefined && !categories?.includes(selector.filterId)) continue;
        for (const [index, field] of fields.entries()) {
          if (field.typeId === undefined || field.typeId !== modifier.field) continue;
          // Do not issue a stale discrepancy if this exact declaration already
          // reached the actual occurrence in a newer/more capable report.
          const evaluated = report?.report.characteristics.find(value => value.characteristic === field);
          if (evaluated?.steps.some(step => step.modifier === modifier && step.declaredBy === selected)) continue;
          const sourceName = selected.name ?? selectedChoice.name ?? "Selected upgrade";
          const operation = [modifier.type, modifier.value].filter(value => value !== undefined).join(" ");
          notes[index]!.push(`${sourceName} declares a source ${field.name ?? "characteristic"} modification${operation ? ` (${operation})` : ""} through a descendant-only model selector. The current evaluator excludes this model's own profile from that selector; this declaration is not reflected in its displayed value. Conditions and intended applicability remain unconfirmed.`);
        }
      }
    }
    selected.selections.forEach(visit);
  };
  owner.selections.forEach(visit);
  return notes;
}
