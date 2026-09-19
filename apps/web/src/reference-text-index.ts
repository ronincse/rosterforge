// UI reference dictionary, not an applicability/evaluation index. Catalogue
// fallbacks are explicitly source-only and retain their exact source objects.
import type { ProfileProjection, RuleProjection } from "@rosterforge/battlescribe-data";
import type { LocalRosterSession } from "./roster-session.js";
import { inspectLocalRule } from "./rule-inspection.js";
import type { ReferenceProfileGroup, ReferenceRule, UnitReferenceModel } from "./unit-reference-model.js";

export interface TextReference {
  readonly name: string;
  readonly rules: readonly ReferenceRule[];
  readonly profiles: readonly ReferenceProfileGroup[];
  readonly sourceOnly: boolean;
}
export interface TextReferenceMatch { readonly text: string; readonly target: TextReference }
interface Trie { readonly children: Map<string, Trie>; target?: TextReference | null }
export interface ReferenceTextIndex {
  readonly names: ReadonlyMap<string, TextReference | null>;
  readonly trie: Trie;
  readonly limited?: boolean;
}
const cache = new WeakMap<LocalRosterSession["catalogue"], ReferenceTextIndex>();
const word = (value: string) => /[\p{L}\p{N}_]/u.test(value);

/** Compile literal names into a bounded trie. If the full dictionary cannot fit,
 * omit automatic links rather than index a partial, falsely unique dictionary. */
export function createReferenceTextIndex(names: ReadonlyMap<string, TextReference | null>): ReferenceTextIndex {
  if (names.size > 8192 || [...names.keys()].reduce((sum, name) => sum + name.length, 0) > 500_000) return { names: new Map(), trie: { children: new Map() }, limited: true };
  const trie: Trie = { children: new Map() };
  for (const [name, target] of names) {
    let node = trie;
    for (const char of name) {
      if (!node.children.has(char)) node.children.set(char, { children: new Map() });
      node = node.children.get(char)!;
    }
    node.target = target;
  }
  return { names, trie };
}

function add(names: Map<string, TextReference | null>, source: { name?: string; alias?: readonly string[]; noindex?: boolean }, target: TextReference) {
  if (source.noindex) return;
  for (const label of [source.name, ...source.alias ?? []]) {
    const name = label?.trim().toLowerCase();
    // NR's documented minimum avoids turning single-character stat names into
    // links. Bound dictionary terms as well as text scanning for untrusted data.
    if (!name || name.length > 160 || (name.match(/[\p{L}\p{N}]/gu)?.length ?? 0) < 2) continue;
    if (!names.has(name)) { if (names.size <= 8192) names.set(name, target); }
    else if (names.get(name) !== target) names.set(name, null);
  }
}

/** Cache the reachable source dictionary once per immutable catalogue. No
 * arbitrary imported regex, unrelated loaded faction, or invented glossary text.
 * Duplicate names/aliases remain ambiguous, never first-wins. */
export function catalogueReferenceTextIndex(session: LocalRosterSession): ReferenceTextIndex {
  const catalogue = session.catalogue;
  const cached = cache.get(catalogue);
  if (cached) return cached;
  const names = new Map<string, TextReference | null>();
  const reachable = catalogue.context.graph.reachableDocumentsByDocument.get(catalogue.document);
  for (const objects of catalogue.context.graph.objectsById.values()) for (const object of objects) {
    if (object.document !== catalogue.document && !reachable?.has(object.document)) continue;
    if (object.kind === "rule") {
      const value = object.source as RuleProjection;
      if (value.hidden || !value.description?.trim()) continue;
      add(names, value, { name: value.name ?? "Rule", rules: [{ origin: "Direct", value, report: inspectLocalRule(value) }], profiles: [], sourceOnly: true });
    } else if (object.kind === "profile") {
      const value = object.source as ProfileProjection;
      if (value.hidden || !value.characteristics.some(c => c.value.trim())) continue;
      add(names, value, { name: value.name ?? "Ability", rules: [], profiles: [{ profile: { origin: "Direct", value }, report: undefined, members: [] }], sourceOnly: true });
    }
  }
  const result = createReferenceTextIndex(names);
  cache.set(catalogue, result);
  return result;
}

/** Prefer the exact selected material; differing owner reports stay ambiguous.
 * This only changes reference lookup, never which inline rules apply or display. */
export function selectedReferenceTextIndex(base: ReferenceTextIndex, model: Pick<UnitReferenceModel, "rules" | "profiles">): ReferenceTextIndex {
  const names = new Map<string, TextReference | null>();
  for (const group of model.rules) {
    const rule = group.rule;
    const source = rule.origin === "Linked" ? rule.value.definition : rule.value;
    if (source.noindex) continue;
    if (!rule.value.description?.trim() || (rule.report.status === "hidden" && rule.report.completeness === "complete")) continue;
    // A prose mention of the original label still refers to this attached rule.
    // Retain it as an alias to the SAME effective record; competing owners stay
    // ambiguous instead of falling back to an unqualified catalogue definition.
    const name = rule.report.name.value ?? rule.value.name ?? source.name ?? "Rule";
    const aliases = [...new Set([...(source.alias ?? []), source.name, rule.value.name].filter((v): v is string => v !== undefined && v !== name))];
    add(names, { ...source, name, alias: aliases }, { name, rules: [rule], profiles: [], sourceOnly: false });
  }
  for (const group of model.profiles) {
    const source = group.profile.origin === "Linked" ? group.profile.value.definition : group.profile.value;
    if (source.noindex || group.report?.visibility.status === "hidden" || !source.characteristics.some(c => c.value.trim())) continue;
    add(names, { ...source, name: group.report?.name.value ?? source.name ?? "" }, { name: group.report?.name.value ?? source.name ?? "Ability", rules: [], profiles: [group], sourceOnly: group.report === undefined });
  }
  const result = createReferenceTextIndex(new Map([...base.names, ...names]));
  return base.limited ? { ...result, limited: true } : result;
}

/** Longest whole-phrase match with a fixed 160-character walk, not a giant
 * source-derived regex. The caller advances past a match, so links never nest. */
export function matchTextReference(index: ReferenceTextIndex, text: string, start: number): TextReferenceMatch | undefined {
  if (start > 0 && word(text[start - 1]!)) return undefined;
  let node = index.trie;
  let found: TextReferenceMatch | undefined;
  for (let end = start; end < Math.min(text.length, start + 160); end++) {
    const child = node.children.get(text[end]!.toLowerCase());
    if (!child) break;
    node = child;
    if (node.target !== undefined && (end + 1 === text.length || !word(text[end + 1]!))) {
      // A longer ambiguous phrase masks any shorter prefix candidate.
      found = node.target ? { text: text.slice(start, end + 1), target: node.target } : undefined;
    }
  }
  return found;
}
