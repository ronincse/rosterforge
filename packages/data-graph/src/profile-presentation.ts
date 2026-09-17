// Headless, display-only metadata resolution. This never changes applicability,
// evaluation or source objects; leaf consumers receive scalar data, not documents.
import type { OrderedXmlElement, ProfileProjection, ProfileTypeProjection } from "@rosterforge/battlescribe-data";
import { battleScribeReachableObjectsById, type BattleScribeDataGraph } from "./resolve.js";

export type PresentationHintState = "absent" | "supported" | "unknown" | "malformed" | "dynamic" | "unresolved" | "ambiguous";
export type ProfileRole = "model" | "weapon" | "ability" | "tag";
export type CharacteristicRole = "longText" | "annotation";
export interface PresentationHint<T> {
  readonly state: PresentationHintState;
  readonly value?: T;
  readonly raw?: string;
}
export interface ProfilePresentation {
  readonly typeKey: string;
  readonly typeStatus: "resolved" | "missing" | "ambiguous";
  readonly role: PresentationHint<ProfileRole>;
  readonly order: PresentationHint<number>;
  /** Positional correspondence preserves duplicate and unnamed fields. */
  readonly characteristics: readonly PresentationHint<CharacteristicRole>[];
  readonly notes: readonly string[];
}

function dynamic(node: OrderedXmlElement, field: string): boolean {
  return node.children.some(child => child.kind === "element" &&
    (child.name === "modifier" && child.attributes.field === field ||
      (child.name === "modifiers" || child.name === "modifierGroups" || child.name === "modifierGroup") && dynamic(child, field)));
}
function malformedJson(node: OrderedXmlElement, field: string, allowed: readonly string[]): boolean {
  if (node.jsonSource?.kind !== "object") return false;
  const values = node.jsonSource.entries.filter(p => p.name === field);
  return values.length > 1 || values.some(p => !allowed.includes(p.value.kind));
}
function kind<T extends string>(node: OrderedXmlElement, supported: readonly T[]): PresentationHint<T> {
  const raw = node.attributes.kind;
  if (malformedJson(node, "kind", ["string"])) return { state: "malformed" };
  if (dynamic(node, "kind")) return { state: "dynamic", ...(raw === undefined ? {} : { raw }) };
  if (raw === undefined) return { state: "absent" };
  if (raw.trim() === "") return { state: "malformed", raw };
  return supported.includes(raw as T) ? { state: "supported", value: raw as T, raw } : { state: "unknown", raw };
}
function order(type: ProfileTypeProjection): PresentationHint<number> {
  const raw = type.node.attributes.sortIndex;
  if (malformedJson(type.node, "sortIndex", ["string", "number"])) return { state: "malformed" };
  if (dynamic(type.node, "sortIndex")) return { state: "dynamic", ...(raw === undefined ? {} : { raw }) };
  if (raw === undefined) return { state: "absent" };
  // The evidenced editor writes non-negative integral indices. Do not accept
  // Number's hexadecimal/exponent coercions or unsafe integer rounding.
  if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(type.sortIndex) || (type.sortIndex ?? -1) < 0) return { state: "malformed", raw };
  return { state: "supported", value: type.sortIndex!, raw };
}
const resolvers = new WeakMap<BattleScribeDataGraph, (profile: ProfileProjection) => ProfilePresentation>();

/** Resolve exact profile/type identities in the profile definition's dependency
 * closure. The immutable graph owns one index/cache, including id-less profiles
 * and profiles inside information groups. As with materialized links, multiple reachable candidates stay ambiguous.
 */
export function profilePresentationResolver(graph: BattleScribeDataGraph): (profile: ProfileProjection) => ProfilePresentation {
  const cached = resolvers.get(graph);
  if (cached) return cached;
  const documents = new Map(graph.references.filter(r => r.kind === "profileType").map(r => [r.source, r.sourceDocument]));
  const cache = new WeakMap<ProfileProjection, ProfilePresentation>();
  const resolve = (profile: ProfileProjection): ProfilePresentation => {
    const previous = cache.get(profile);
    if (previous) return previous;
    const document = documents.get(profile);
    const reachable = document && profile.typeId ? battleScribeReachableObjectsById(graph, document, profile.typeId).filter(o => o.kind === "profileType") : [];
    const candidates = reachable;
    const target = candidates.length === 1 ? candidates[0] : undefined;
    const type = target?.source as ProfileTypeProjection | undefined;
    const status = type ? "resolved" : candidates.length > 1 ? "ambiguous" : "missing";
    const unresolved = { state: status === "ambiguous" ? "ambiguous" : "unresolved" } as const;
    const role = type ? kind(type.node, ["model", "weapon", "ability", "tag"] as const) : unresolved;
    const ordering = type ? order(type) : unresolved;
    const characteristics = profile.characteristics.map(characteristic => {
      if (!type) return unresolved;
      const matches = type.characteristicTypes.filter(c => characteristic.typeId !== undefined && c.id === characteristic.typeId);
      if (matches.length !== 1) return { state: matches.length > 1 ? "ambiguous" : "unresolved" } as const;
      return kind(matches[0]!.node, ["longText", "annotation"] as const);
    });
    const notes: string[] = [];
    if (status !== "resolved") notes.push(`Profile type presentation is ${status}; neutral layout shown.`);
    const note = (label: string, hint: PresentationHint<unknown>) => {
      if (hint.state !== "supported" && hint.state !== "absent") notes.push(`${label}: ${hint.state}${hint.raw === undefined ? "" : ` (${hint.raw})`}.`);
    };
    if (type) { note("Profile role", role); note("Profile ordering", ordering); }
    characteristics.forEach((hint, i) => note(`Field ${i + 1} presentation`, hint));
    if (type?.characteristicTypes.some(c => c.node.children.some(n => n.kind === "element" && n.name === "formatRules"))) notes.push("Source-authored formatting rules are not applied.");
    const value: ProfilePresentation = {
      typeKey: type ? JSON.stringify([target!.document.source.sourceId, type.path]) : JSON.stringify([profile.source.sourceId, profile.typeId ?? profile.path]),
      typeStatus: status, role, order: ordering, characteristics, notes,
    };
    cache.set(profile, value);
    return value;
  };
  resolvers.set(graph, resolve);
  return resolve;
}
