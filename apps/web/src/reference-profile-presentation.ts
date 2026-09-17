// Pure selected-reference classification. Source roles outrank the deliberately
// narrow legacy label fallback; no applicability or accounting lives here.
import type { ProfilePresentation } from "@rosterforge/data-graph";
import type { ReferenceProfile, ReferenceProfileGroup } from "./unit-reference-model.js";
export interface ReferenceProfilePresentation extends ProfilePresentation {
  readonly section: "model" | "weapon" | "ability" | "additional";
  readonly layout: "table" | "fields";
  readonly legacy: boolean;
}

/** Interpret only resolved static hints. Missing/explicitly unsupported metadata
 * never opts into a legacy heuristic. Duplicate field identities use a field
 * list so a table's alignment cannot silently replace one authored value.
 */
export function classifyReferenceProfile(profile: ReferenceProfile, metadata: ProfilePresentation): ReferenceProfilePresentation {
  let section: ReferenceProfilePresentation["section"] = "additional";
  let legacy = false;
  const description = profile.value.characteristics.some(c => c.name?.toLowerCase() === "description");
  if (metadata.role.state === "supported") {
    section = metadata.role.value === "tag" ? "additional" : metadata.role.value!;
  } else if (metadata.role.state === "absent") {
    const name = profile.value.typeName?.toLowerCase();
    // These labels preserve the verified 40k reader only when the source has
    // not declared a role. Unfamiliar types are never presumed to be equipment.
    if (description) { section = "ability"; legacy = true; }
    else if (name === "unit") { section = "model"; legacy = true; }
    else if (name === "ranged weapons" || name === "melee weapons" || name === "weapon") { section = "weapon"; legacy = true; }
  }
  const keys = profile.value.characteristics.map((c, i) => c.typeId ?? c.name ?? `field-${i}`);
  const fields = section === "ability" || (legacy && description) || metadata.characteristics.some(c => c.state === "supported") || new Set(keys).size !== keys.length;
  return { ...metadata, section, layout: fields ? "fields" : "table", legacy };
}

/** Copy and order type groups within a semantic section. Stable ties retain
 * first encounter, then original profile order; absent/invalid indices follow
 * all valid indices. The source and durable roster arrays are never sorted.
 */
export function orderReferenceProfiles(groups: readonly ReferenceProfileGroup[]): ReferenceProfileGroup[] {
  const typeOrder = new Map<string, number>();
  for (const [index, group] of groups.entries()) {
    const key = group.presentation?.typeKey ?? `unresolved-${index}`;
    if (!typeOrder.has(key)) typeOrder.set(key, index);
  }
  return groups.map((group, index) => ({ group, index })).sort((a, b) => {
    const left = a.group.presentation, right = b.group.presentation;
    const l = left?.order.state === "supported" ? left.order.value! : Infinity;
    const r = right?.order.state === "supported" ? right.order.value! : Infinity;
    return (l === r ? 0 : l < r ? -1 : 1)
      || (typeOrder.get(left?.typeKey ?? `unresolved-${a.index}`)! - typeOrder.get(right?.typeKey ?? `unresolved-${b.index}`)!)
      || a.index - b.index;
  }).map(item => item.group);
}

/** Stable source identity for scalar metadata passed through nested information
 * groups. Linked wrappers consult the exact definition, never the link label. */
export function referenceProfileSourceKey(profile: ReferenceProfile): string {
  const definition = "definition" in profile.value ? profile.value.definition : profile.value;
  return JSON.stringify([definition.source.sourceId, definition.path]);
}
