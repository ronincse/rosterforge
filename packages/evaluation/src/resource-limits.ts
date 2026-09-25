// Resolves roster budget configuration from saved source declarations only.
// This module must never import conditions, costs, or constraint evaluation:
// limit-dependent prices are downstream consumers, not inputs to limits.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import { type Diagnostic, type ObjectId } from "@rosterforge/foundation";
import type { Roster } from "@rosterforge/roster-model";
import { rosterMatchesCatalogueContext } from "./selection-context.js";

type CostType = BattleScribeCatalogueContext["document"]["projection"]["costTypes"][number];
export type ResourceLimitState =
  | { readonly kind: "finite"; readonly value: number }
  | { readonly kind: "unbounded"; readonly value: -1 }
  | { readonly kind: "absent" }
  | { readonly kind: "inactive" }
  | { readonly kind: "unresolved" | "invalid"; readonly reason: string };
export interface EffectiveResourceLimit {
  readonly typeId: ObjectId;
  readonly definitions: readonly CostType[];
  readonly authored: ResourceLimitState;
  readonly sourceActivation: "included" | "omitted" | "unresolved";
  readonly displayVisibility: "visible" | "hidden" | "unresolved";
  readonly override?: number;
  readonly effective: ResourceLimitState;
  readonly provenance: "source" | "player";
}
export interface EffectiveResourceLimits {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly resources: readonly EffectiveResourceLimit[];
  readonly diagnostics: readonly Diagnostic[];
}

/** Resolves exact reachable identities in source order. No spending or dynamic
 * source expressions run here, so cycles cannot recurse. No cache is necessary:
 * this scans declarations and overrides, never the selection tree. */
export function resolveRosterResourceLimits(roster: Roster, context: BattleScribeCatalogueContext): EffectiveResourceLimits {
  const reachable = context.graph.reachableDocumentsByDocument.get(context.document) ?? new Set([context.document]);
  const byId = new Map<ObjectId, CostType[]>();
  const diagnostics: Diagnostic[] = [];
  for (const document of reachable) for (const definition of document.projection.costTypes) {
    if (definition.id === undefined) {
      diagnostics.push(limitDiagnostic("EVALUATION_RESOURCE_LIMIT_ID_MISSING", "A resource declaration has no identity."));
      continue;
    }
    byId.set(definition.id, [...(byId.get(definition.id) ?? []), definition]);
  }
  for (const override of roster.resourceBudgetOverrides ?? []) if (!byId.has(override.typeId)) byId.set(override.typeId, []);
  const resources = [...byId].map(([typeId, definitions]): EffectiveResourceLimit => {
    const definition = definitions.length === 1 ? definitions[0] : undefined;
    const overrides = (roster.resourceBudgetOverrides ?? []).filter(item => item.typeId === typeId);
    const authored = definition === undefined ? unresolved("Resource identity is missing or ambiguous.") : sourceLimit(definition);
    const display = definition === undefined ? { visibility: "unresolved" as const, reason: "Resource identity is missing or ambiguous." } : staticVisibility(definition);
    const sourceActivation = display.reason !== undefined ? "unresolved" : definition?.hidden === true ? "omitted" : "included";
    // A completed NR army has serialized/reloaded its creation limits. Base-hidden
    // declarations were omitted, irrespective of an unconditional display reveal.
    // RF derives that stable state from immutable saved source, without inserting
    // overrides or reproducing the transient NR wizard's absent-query zero.
    let effective: ResourceLimitState = authored.kind === "invalid" || authored.kind === "unresolved" ? authored
      : display.reason !== undefined ? unresolved(display.reason)
      : sourceActivation === "omitted" ? { kind: "inactive" } : authored;
    const override = overrides[0]?.value;
    if (!rosterMatchesCatalogueContext(roster, context)) effective = unresolved("Roster catalogue context does not match.");
    else if (definition === undefined || overrides.length > 1) effective = unresolved("Resource identity or override is missing or ambiguous.");
    else if (override !== undefined) effective = numericLimit(override);
    // Unknown dynamic limit behavior cannot be bypassed by a player value.
    // It may describe a dependency cycle, but evaluating it to find out would
    // violate the limits -> conditions -> costs dependency direction.
    if (definition !== undefined && hasDynamicLimit(definition)) effective = unresolved("Dynamic resource limits are unsupported; limit dependencies are not evaluated.");
    if (effective.kind === "invalid" || effective.kind === "unresolved") diagnostics.push(limitDiagnostic(
      effective.kind === "invalid" ? "EVALUATION_RESOURCE_LIMIT_INVALID" : "EVALUATION_RESOURCE_LIMIT_UNRESOLVED", effective.reason, typeId));
    return { typeId, definitions, authored, sourceActivation, displayVisibility: display.visibility, effective, provenance: overrides.length ? "player" : "source", ...(override === undefined ? {} : { override }) };
  });
  return { roster, context, resources, diagnostics };
}
function sourceLimit(definition: CostType): ResourceLimitState {
  const raw = definition.node.attributes.defaultCostLimit;
  if (raw === undefined || raw === "") return { kind: "absent" };
  const value = definition.defaultCostLimit;
  if (value === undefined) return { kind: "invalid", reason: "The source default is not a finite number." };
  return numericLimit(value);
}

/** Returns the supported completed-army query scalar, separately from cap activity.
 * Absent/inactive defaults have no maximum; -1 matches normal NR save/reselect,
 * not its transient pre-save wizard. Unknown identities/behavior yield no scalar. */
export function resourceLimitQueryValue(state: ResourceLimitState): number | undefined {
  return state.kind === "finite" || state.kind === "unbounded" ? state.value
    : state.kind === "inactive" || state.kind === "absent" ? -1 : undefined;
}

// Visibility is an independent display fact. This deliberately does not call
// conditions: their limit queries are downstream of this resolver. Broader
// conditional/grouped or conflicting operations remain a specific unknown.
function staticVisibility(definition: CostType): { visibility: "visible" | "hidden" | "unresolved"; reason?: string } {
  const unknown = () => ({ visibility: "unresolved" as const, reason: "Source activation requires supported static visibility metadata; conditional, grouped, conflicting or unknown behavior is unsupported." });
  const attributes = definition.node.attributes;
  if (attributes.hidden !== undefined && definition.hidden === undefined) return unknown();
  if (Object.keys(attributes).some(key => !["id", "name", "hidden", "defaultCostLimit", "comment"].includes(key))) return unknown();
  let hidden = definition.hidden ?? false;
  let assigned: boolean | undefined;
  for (const child of definition.node.children) {
    if (child.kind !== "element" || child.name === "comment") continue;
    if (child.name !== "modifiers" || Object.keys(child.attributes).length > 0) return unknown();
    for (const modifier of child.children) {
      if (modifier.kind !== "element" || modifier.name === "comment") continue;
      const a = modifier.attributes;
      if (modifier.name !== "modifier" || a.type !== "set" || a.field !== "hidden" ||
          !["true", "false", "1", "0"].includes(a.value ?? "") ||
          Object.keys(a).some(key => !["id", "type", "field", "value", "comment"].includes(key)) ||
          modifier.children.some(node => node.kind === "element" && node.name !== "comment")) return unknown();
      const next = a.value === "true" || a.value === "1";
      if (assigned !== undefined && assigned !== next) return unknown();
      assigned = next;
      hidden = next;
    }
  }
  return { visibility: hidden ? "hidden" : "visible" };
}

function numericLimit(value: number): ResourceLimitState {
  if (value === -1) return { kind: "unbounded", value: -1 };
  if (Number.isFinite(value) && value >= 0) return { kind: "finite", value };
  return { kind: "invalid", reason: "A resource budget must be nonnegative or -1 for no limit." };
}
function unresolved(reason: string): ResourceLimitState { return { kind: "unresolved", reason }; }
function hasDynamicLimit(definition: CostType): boolean {
  const containers: Readonly<Record<string, string>> = { modifiers: "modifier", modifierGroups: "modifierGroup", conditions: "condition", conditionGroups: "conditionGroup", repeats: "repeat", localConditionGroups: "localConditionGroup" };
  const allowed = new Set([...Object.keys(containers), ...Object.values(containers), "comment"]);
  const visit = (node: CostType["node"]): boolean => {
    // An override replaces a known default, not arbitrary imported behavior.
    // Unknown attributes could change activation or the limit itself.
    if (node.name === "costType" && Object.keys(node.attributes).some(key => !["id", "name", "hidden", "defaultCostLimit", "comment"].includes(key))) return true;
    if (node.name === "modifier" && Object.keys(node.attributes).some(key => !["id", "type", "field", "value", "comment"].includes(key))) return true;
    for (const child of node.children) {
      if (child.kind !== "element") continue;
      // Unknown source syntax inside a behavior envelope cannot silently turn
      // a potentially dynamic limit into a supposedly static source default.
      if (containers[node.name] !== undefined && (child.name !== containers[node.name] || Object.keys(node.attributes).length > 0)) return true;
      if (!allowed.has(child.name)) return true;
      if (child.name === "modifier" && child.attributes.field !== "hidden" && child.attributes.field !== "name") return true;
      if (allowed.has(child.name) && visit(child)) return true;
    }
    return false;
  };
  return visit(definition.node);
}
function limitDiagnostic(code: string, message: string, typeId?: ObjectId): Diagnostic {
  return { code, message, severity: "warning", impacts: ["compatibility"], details: { ...(typeId === undefined ? {} : { typeId }) } };
}
