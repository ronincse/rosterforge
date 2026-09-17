// Print-only display sharing. Original scalar records remain intact: a shared
// row/body is a presentation alias, not source or evaluator equivalence.
import type { ArmyReferenceProfile, ArmyReferenceRule } from "./army-reference-model.js";

export interface PrintedProfileRow { readonly profile: ArmyReferenceProfile; readonly records: readonly ArmyReferenceProfile[]; }
export interface PrintedExplanation { readonly html: string; readonly records: readonly ArmyReferenceRule[]; }

/** Share complete displayed statlines only inside one unit. Effect signatures
 * and qualifications are part of the key; every original member mapping stays
 * on its record. Missing provenance prevents sharing, not attribution. */
export function printedProfileRows(profiles: readonly ArmyReferenceProfile[]): PrintedProfileRow[] {
  const rows = new Map<string, { profile: ArmyReferenceProfile; records: ArmyReferenceProfile[] }>();
  for (const [index, profile] of profiles.entries()) {
    const key = JSON.stringify([profile.name, profile.type, profile.section, profile.scope, profile.fields, profile.notes, profile.table, profile.effectKey ?? `unverified-${index}`]);
    const row = rows.get(key);
    if (row) row.records.push(profile);
    else rows.set(key, { profile, records: [profile] });
  }
  return [...rows.values()];
}

/** Compare the COMPLETE safely rendered body, not names or fuzzy/plain text.
 * A mapping for each old anchor remains next to the one shared explanation. */
export function printedExplanations(rules: readonly ArmyReferenceRule[], render: (text: string) => string): PrintedExplanation[] {
  const groups = new Map<string, { html: string; records: ArmyReferenceRule[] }>();
  for (const rule of rules) {
    const html = render(rule.text);
    const group = groups.get(html);
    if (group) group.records.push(rule);
    else groups.set(html, { html, records: [rule] });
  }
  return [...groups.values()].sort((a, b) => a.records[0]!.name.localeCompare(b.records[0]!.name));
}
