// UI-only links from selected profile keyword text to its owner's attached rules.
// No catalogue-wide name search, inferred rules or changes to applicability.
import type { ReferenceProfileGroup, ReferenceRuleGroup, UnitReferenceModel } from "./unit-reference-model.js";

type Characteristic = ReferenceProfileGroup["profile"]["value"]["characteristics"][number];
export interface ReferenceKeywordToken {
  readonly text: string;
  readonly rule?: ReferenceRuleGroup;
}
export interface ReferenceKeywordLinks {
  readonly profiles: ReadonlyMap<ReferenceProfileGroup, ReadonlyMap<Characteristic, readonly ReferenceKeywordToken[]>>;
  readonly inlineRules: readonly ReferenceRuleGroup[];
}

/** Recognizes the authored Keywords column, not arbitrary prose/stat values. */
export function isKeywordCharacteristic(characteristic: Pick<Characteristic, "name">): boolean {
  return characteristic.name?.trim().toLowerCase() === "keywords";
}

function normalized(value: string): string {
  return value.trim().replace(/^\[([^\]]+)\]$/, "$1").replace(/\s+/g, " ").toLowerCase();
}

/** Links only an unambiguous attached rule for every original grouped owner.
 * Numeric/dice suffixes are display parameters (Rapid Fire 4 -> Rapid Fire),
 * not rule evaluation. Exact names take precedence. Ambiguity, missing source
 * text and unknown parameter syntax stay plain; nothing is guessed globally.
 * A rule leaves the inline list only when all its owners have a complete,
 * visible linked reference. Uncertainty remains visible inline AND in its popup.
 */
export function createReferenceKeywordLinks(model: UnitReferenceModel, renderedProfiles: readonly ReferenceProfileGroup[] = model.profiles): ReferenceKeywordLinks {
  const profiles = new Map<ReferenceProfileGroup, ReadonlyMap<Characteristic, readonly ReferenceKeywordToken[]>>();
  const covered = new Map<ReferenceRuleGroup, Set<string>>();
  const byOwner = new Map<string, ReferenceRuleGroup[]>();
  for (const group of model.rules) {
    if (group.rule.report.status === "hidden" && group.rule.report.completeness === "complete") continue;
    if (!group.rule.value.description?.trim()) continue;
    for (const member of group.members) {
      const rules = byOwner.get(member.owner.id) ?? [];
      rules.push(group);
      byOwner.set(member.owner.id, rules);
    }
  }
  for (const group of renderedProfiles) {
    const columns = new Map<Characteristic, readonly ReferenceKeywordToken[]>();
    for (const characteristic of group.profile.value.characteristics.filter(isKeywordCharacteristic)) {
      const report = group.report?.report.characteristics.find(c => c.characteristic === characteristic);
      const text = report?.value ?? characteristic.value;
      const tokens = text.split(/([,;\n]+)/).map((text): ReferenceKeywordToken => {
        if (!text.trim() || /^[,;\n]+$/.test(text)) return { text };
        const label = normalized(text);
        // The pinned corpus attaches the generic Anti rule to parameterized
        // Anti-Infantry / Anti-Monster/Vehicle tokens. Require both target and
        // numeric threshold, not an arbitrary prefix (e.g. Psychic Assassin).
        const generic = /^anti[- ][\p{L}][\p{L} /-]*\s+\d+\+?$/u.test(label) ? "anti"
          : label.replace(/\s+(?:\d+(?:d\d+)?|d\d+)(?:[+-]\d+)?\+?$/i, "");
        const matches = group.members.map(member => {
          const attached = byOwner.get(member.owner.id) ?? [];
          const exact = attached.filter(rule => normalized(rule.rule.value.name ?? "") === label);
          const candidates = exact.length ? exact : attached.filter(rule => normalized(rule.rule.value.name ?? "") === generic);
          return candidates.length === 1 ? candidates[0] : undefined;
        });
        const rule = matches[0];
        if (!rule || matches.some(candidate => candidate !== rule)) return { text };
        if (group.report?.completeness === "complete" && report?.completeness === "complete" && rule.rule.report.completeness === "complete" && rule.rule.report.status === "visible") {
          const owners = covered.get(rule) ?? new Set<string>();
          for (const member of group.members) owners.add(member.owner.id);
          covered.set(rule, owners);
        }
        return { text, rule };
      });
      columns.set(characteristic, tokens);
    }
    profiles.set(group, columns);
  }
  return { profiles, inlineRules: model.rules.filter(group => !group.members.every(member => covered.get(group)?.has(member.owner.id))) };
}
