import type { RosterSelectionConditionCostReport } from "@rosterforge/evaluation";
import type {
  Result,
  ValidationCompleteness,
  ValidationValidity,
} from "@rosterforge/foundation";
import {
  rosterSelectionAmount,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

import { forceDefinitionLabel } from "./force-definition.js";
import type {
  LocalRosterSession,
  LocalRosterSupportedValidationInspection,
} from "./roster-session.js";

export interface RosterPrintCost {
  readonly typeId: string;
  readonly name: string;
  readonly value: number;
}

export interface RosterPrintSelection {
  readonly occurrenceId: string;
  readonly definitionKey: string;
  readonly definitionId?: string;
  readonly definitionKind: "selectionEntry" | "selectionEntryGroup";
  readonly type?: string;
  readonly name: string;
  readonly amount: number;
  readonly costs: readonly RosterPrintCost[];
  readonly selections: readonly RosterPrintSelection[];
}

export interface RosterPrintForce {
  readonly occurrenceId: string;
  readonly definitionKey: string;
  readonly definitionId?: string;
  readonly name: string;
  readonly forces: readonly RosterPrintForce[];
  readonly selections: readonly RosterPrintSelection[];
}

export type RosterPrintCostStatus =
  | {
      readonly available: true;
      readonly completeness: ValidationCompleteness;
      readonly totals: readonly RosterPrintCost[];
      readonly diagnosticCount: number;
    }
  | {
      readonly available: false;
      readonly totals: readonly [];
      readonly diagnosticCount: number;
    };

export type RosterPrintValidationStatus =
  | {
      readonly available: true;
      readonly validity: ValidationValidity;
      readonly completeness: ValidationCompleteness;
      readonly satisfied: number;
      readonly violated: number;
      readonly unresolved: number;
      readonly diagnosticCount: number;
    }
  | {
      readonly available: false;
      readonly diagnosticCount: number;
    };

export interface RosterPrintViewModel {
  readonly rosterId: string;
  readonly name: string;
  readonly catalogueName: string;
  readonly catalogueKey: string;
  readonly catalogueId?: string;
  readonly costs: RosterPrintCostStatus;
  readonly validation: RosterPrintValidationStatus;
  readonly forces: readonly RosterPrintForce[];
}

type LocalRosterCostResult = Result<RosterSelectionConditionCostReport>;
type LocalRosterValidationResult =
  Result<LocalRosterSupportedValidationInspection>;

export function createRosterPrintViewModel(
  session: LocalRosterSession,
  costResult: LocalRosterCostResult,
  validationResult: LocalRosterValidationResult,
): RosterPrintViewModel {
  const costsBySelection = selectionCostIndex(costResult);
  return {
    rosterId: session.roster.id,
    name: session.roster.name,
    catalogueName: session.catalogue.name,
    catalogueKey: session.roster.catalogue.key,
    ...(session.roster.catalogue.sourceId === undefined
      ? {}
      : { catalogueId: session.roster.catalogue.sourceId }),
    costs: printCostStatus(costResult),
    validation: printValidationStatus(validationResult),
    forces: session.roster.forces.map((force, index) =>
      createPrintForce(
        session,
        force,
        index === 0 ? forceDefinitionLabel(session.forceDefinition) : undefined,
        costsBySelection,
      ),
    ),
  };
}

export function renderRosterPrintDocument(
  roster: RosterPrintViewModel,
): string {
  return [
    "<!doctype html>",
    "<html lang='en'><head>",
    "<meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<meta http-equiv='Content-Security-Policy' ",
    "content=\"default-src 'none'; style-src 'unsafe-inline'\">",
    "<title>",
    escapeHtml(roster.name),
    " - RosterForge</title>",
    "<style>",
    printStyles,
    "</style></head><body>",
    "<main>",
    "<header class='document-header'>",
    "<p class='brand'>RosterForge roster summary</p>",
    "<h1>",
    escapeHtml(roster.name),
    "</h1>",
    "<p class='catalogue'>",
    escapeHtml(roster.catalogueName),
    "</p>",
    "<dl class='identity-list'>",
    printIdentity("Roster occurrence ID", roster.rosterId),
    printIdentity("Catalogue source ID", roster.catalogueId),
    printIdentity("Catalogue definition key", roster.catalogueKey),
    "</dl>",
    "</header>",
    renderCostSummary(roster.costs),
    renderValidationSummary(roster.validation),
    "<section class='forces'><h2>Forces and selections</h2>",
    roster.forces.length === 0
      ? "<p>No forces are present in this roster.</p>"
      : "<ol>" + roster.forces.map(renderPrintForce).join("") + "</ol>",
    "</section>",
    "<footer>",
    "<strong>Scope note:</strong> This is a RosterForge presentation export, ",
    "not a BattleScribe .ros or .rosz interchange file. Costs and checks only ",
    "describe the supported evaluation scope shown above.",
    "</footer>",
    "</main></body></html>",
  ].join("");
}

export interface RosterPrintWindow {
  readonly document: {
    open(): void;
    write(content: string): void;
    close(): void;
  };
  opener: unknown;
  focus(): void;
  print(): void;
}

export type RosterPrintWindowFactory = () => RosterPrintWindow | null;

export function openRosterPrintView(
  roster: RosterPrintViewModel,
  openWindow: RosterPrintWindowFactory = openBrowserPrintWindow,
): boolean {
  try {
    const target = openWindow();
    if (target === null) return false;
    target.opener = null;
    target.document.open();
    target.document.write(renderRosterPrintDocument(roster));
    target.document.close();
    target.focus();
    target.print();
    return true;
  } catch {
    return false;
  }
}

function createPrintForce(
  session: LocalRosterSession,
  force: RosterForce,
  definitionName: string | undefined,
  costsBySelection: ReadonlyMap<string, readonly RosterPrintCost[]>,
): RosterPrintForce {
  return {
    occurrenceId: force.id,
    definitionKey: force.definition.key,
    ...(force.definition.sourceId === undefined
      ? {}
      : { definitionId: force.definition.sourceId }),
    name:
      force.name ??
      definitionName ??
      force.definition.sourceId ??
      "Unnamed force",
    forces: force.forces.map((child) =>
      createPrintForce(session, child, undefined, costsBySelection),
    ),
    selections: force.selections.map((selection) =>
      createPrintSelection(session, selection, costsBySelection),
    ),
  };
}

function createPrintSelection(
  session: LocalRosterSession,
  selection: RosterSelection,
  costsBySelection: ReadonlyMap<string, readonly RosterPrintCost[]>,
): RosterPrintSelection {
  const choice = session.selectionChoices.get(selection.id);
  return {
    occurrenceId: selection.id,
    definitionKey: selection.definition.key,
    ...(selection.definition.sourceId === undefined
      ? {}
      : { definitionId: selection.definition.sourceId }),
    definitionKind: selection.definition.kind,
    ...(choice?.kind === "selectionEntry" && choice.type !== undefined
      ? { type: choice.type }
      : {}),
    name:
      selection.name ??
      choice?.name ??
      choice?.id ??
      "Unnamed selection",
    amount: rosterSelectionAmount(selection),
    costs: costsBySelection.get(selection.id) ?? [],
    selections: selection.selections.map((child) =>
      createPrintSelection(session, child, costsBySelection),
    ),
  };
}

function printCostStatus(
  result: LocalRosterCostResult,
): RosterPrintCostStatus {
  if (!result.ok) {
    return {
      available: false,
      totals: [],
      diagnosticCount: result.diagnostics.length,
    };
  }
  return {
    available: true,
    completeness: result.value.completeness,
    totals: result.value.totals.map((total) => ({
      typeId: total.typeId,
      name: total.costType.name ?? total.typeId,
      value: total.value,
    })),
    diagnosticCount: result.diagnostics.length,
  };
}

function printValidationStatus(
  result: LocalRosterValidationResult,
): RosterPrintValidationStatus {
  if (!result.ok) {
    return {
      available: false,
      diagnosticCount: result.diagnostics.length,
    };
  }
  const status = result.value.status;
  return {
    available: true,
    validity: status.validity,
    completeness: status.completeness,
    satisfied: status.statusCounts.satisfied,
    violated: status.statusCounts.violated,
    unresolved: status.statusCounts.unresolved,
    diagnosticCount: result.diagnostics.length,
  };
}

function selectionCostIndex(
  result: LocalRosterCostResult,
): ReadonlyMap<string, readonly RosterPrintCost[]> {
  const index = new Map<string, readonly RosterPrintCost[]>();
  if (!result.ok) return index;

  for (const evaluation of result.value.selections) {
    index.set(
      evaluation.occurrence.id,
      evaluation.costs.flatMap((cost) =>
        cost.status === "included"
          ? [
              {
                typeId: cost.typeId,
                name: cost.costType.name ?? cost.typeId,
                value: cost.totalValue,
              },
            ]
          : [],
      ),
    );
  }
  return index;
}

function renderCostSummary(costs: RosterPrintCostStatus): string {
  if (!costs.available) {
    return [
      "<section class='status-card' data-status='unavailable'>",
      "<h2>Supported costs unavailable</h2>",
      "<p>The cost report could not be produced. ",
      formatCount(costs.diagnosticCount, "diagnostic"),
      " remain observable in RosterForge.</p></section>",
    ].join("");
  }

  return [
    "<section class='status-card' data-status='",
    costs.completeness,
    "'><div class='status-heading'><h2>Roster costs</h2><strong>",
    costs.completeness === "complete"
      ? "Supported costs complete"
      : "Some costs not evaluated",
    "</strong></div>",
    costs.totals.length === 0
      ? "<p>No supported numeric costs are present.</p>"
      : "<ul class='totals'>" +
        costs.totals
          .map(
            (cost) =>
              "<li><strong>" +
              escapeHtml(formatNumber(cost.value)) +
              "</strong><span>" +
              escapeHtml(cost.name) +
              "</span><small>" +
              escapeHtml(cost.typeId) +
              "</small></li>",
          )
          .join("") +
        "</ul>",
    costs.completeness === "complete"
      ? "<p>All applicable behavior supported by this cost scope is reflected.</p>"
      : "<p>Totals exclude unresolved data or behavior outside the supported cost scope.</p>",
    "</section>",
  ].join("");
}

function renderValidationSummary(
  validation: RosterPrintValidationStatus,
): string {
  if (!validation.available) {
    return [
      "<section class='status-card' data-status='unavailable'>",
      "<h2>Supported checks unavailable</h2>",
      "<p>The supported validation report could not be produced. ",
      formatCount(validation.diagnosticCount, "diagnostic"),
      " remain observable in RosterForge.</p></section>",
    ].join("");
  }

  return [
    "<section class='status-card' data-status='",
    validation.validity,
    "'><div class='status-heading'><h2>Supported checks</h2><strong>",
    validation.validity === "valid" ? "No known violations" : "Known violations",
    "</strong></div><dl class='check-counts'>",
    "<div><dt>Satisfied</dt><dd>",
    String(validation.satisfied),
    "</dd></div><div><dt>Violated</dt><dd>",
    String(validation.violated),
    "</dd></div><div><dt>Unresolved</dt><dd>",
    String(validation.unresolved),
    "</dd></div></dl>",
    "<p>",
    validation.completeness === "complete"
      ? "The supported roster check is complete."
      : "The supported roster check is incomplete; this is not a claim of full legality.",
    "</p></section>",
  ].join("");
}

function renderPrintForce(force: RosterPrintForce): string {
  return [
    "<li class='force'><article><header><p>Force</p><h3>",
    escapeHtml(force.name),
    "</h3>",
    "<dl class='identity-list compact'>",
    printIdentity("Occurrence ID", force.occurrenceId),
    printIdentity("Definition ID", force.definitionId),
    printIdentity("Definition key", force.definitionKey),
    "</dl></header>",
    force.selections.length === 0
      ? "<p>No selections.</p>"
      : "<ol class='selections'>" +
        force.selections.map(renderPrintSelection).join("") +
        "</ol>",
    force.forces.length === 0
      ? ""
      : "<ol class='nested-forces'>" +
        force.forces.map(renderPrintForce).join("") +
        "</ol>",
    "</article></li>",
  ].join("");
}

function renderPrintSelection(selection: RosterPrintSelection): string {
  const definitionLabel =
    selection.type ??
    (selection.definitionKind === "selectionEntry"
      ? "Selection entry"
      : "Selection group");
  return [
    "<li class='selection'><article><div class='selection-heading'><span><strong>",
    escapeHtml(formatNumber(selection.amount)),
    " x ",
    escapeHtml(selection.name),
    "</strong><small>",
    escapeHtml(definitionLabel),
    "</small></span>",
    renderSelectionCosts(selection.costs),
    "</div><dl class='identity-list compact'>",
    printIdentity("Occurrence ID", selection.occurrenceId),
    printIdentity("Definition ID", selection.definitionId),
    printIdentity("Definition key", selection.definitionKey),
    "</dl>",
    selection.selections.length === 0
      ? ""
      : "<ol>" + selection.selections.map(renderPrintSelection).join("") + "</ol>",
    "</article></li>",
  ].join("");
}

function renderSelectionCosts(costs: readonly RosterPrintCost[]): string {
  if (costs.length === 0) return "";
  return (
    "<span class='selection-costs'>" +
    costs
      .map(
        (cost) =>
          "<span><strong>" +
          escapeHtml(formatNumber(cost.value)) +
          "</strong> " +
          escapeHtml(cost.name) +
          "</span>",
      )
      .join("") +
    "</span>"
  );
}

function printIdentity(label: string, value: string | undefined): string {
  if (value === undefined) return "";
  return [
    "<div><dt>",
    escapeHtml(label),
    "</dt><dd>",
    escapeHtml(value),
    "</dd></div>",
  ].join("");
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "Unresolved";
}

function formatCount(value: number, noun: string): string {
  return String(value) + " " + noun + (value === 1 ? "" : "s");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openBrowserPrintWindow(): RosterPrintWindow | null {
  return globalThis.open("", "_blank");
}

const printStyles = [
  "@page{margin:14mm}",
  "*{box-sizing:border-box}",
  "html{font:10pt/1.45 Arial,sans-serif;color:#17231d;background:#fff}",
  "body{margin:0}",
  "main{max-width:190mm;margin:0 auto}",
  "h1,h2,h3,p{margin-top:0}",
  "h1{margin-bottom:2mm;font-size:24pt}",
  "h2{font-size:14pt}",
  "h3{margin-bottom:2mm;font-size:12pt}",
  "ol,ul{padding-left:6mm}",
  ".document-header{padding-bottom:5mm;border-bottom:2px solid #274f40}",
  ".brand{margin-bottom:1mm;color:#476558;font-size:8pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase}",
  ".catalogue{font-size:12pt;color:#476558}",
  ".identity-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1mm 5mm;margin:3mm 0 0}",
  ".identity-list div{min-width:0}",
  ".identity-list dt{font-size:7pt;font-weight:700;text-transform:uppercase;color:#607069}",
  ".identity-list dd{margin:0;overflow-wrap:anywhere;font:7.5pt/1.35 Consolas,monospace}",
  ".identity-list.compact{margin-top:2mm}",
  ".status-card{margin:5mm 0;padding:4mm;border:1px solid #b8c4bd;break-inside:avoid}",
  ".status-card[data-status='invalid'],.status-card[data-status='incomplete'],.status-card[data-status='unavailable']{border-left:3px solid #9a552f}",
  ".status-heading,.selection-heading{display:flex;justify-content:space-between;gap:5mm}",
  ".status-heading h2{margin-bottom:2mm}",
  ".status-heading>strong{font-size:8pt}",
  ".totals{display:flex;gap:6mm;margin:1mm 0 3mm;padding:0;list-style:none}",
  ".totals li{display:grid}",
  ".totals li>strong{font-size:18pt}",
  ".totals small{font:7pt Consolas,monospace;color:#607069}",
  ".check-counts{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin:1mm 0 3mm}",
  ".check-counts div{padding:2mm;background:#eef2ef}",
  ".check-counts dt{font-size:8pt}",
  ".check-counts dd{margin:0;font-size:15pt;font-weight:700}",
  ".forces>ol,.nested-forces{padding:0;list-style:none}",
  ".force{margin:4mm 0;break-inside:avoid-page}",
  ".force>article{padding:4mm;border:1px solid #8fa197}",
  ".force header>p{margin-bottom:0;font-size:7pt;font-weight:700;text-transform:uppercase;color:#607069}",
  ".selections,.selection ol{margin:3mm 0 0}",
  ".selection{margin:2mm 0;break-inside:avoid}",
  ".selection>article{padding:2.5mm;border-left:2px solid #cad4ce;background:#f7f8f6}",
  ".selection-heading>span:first-child{display:grid}",
  ".selection-heading small{color:#607069}",
  ".selection-costs{display:grid;text-align:right;font-size:8pt}",
  "footer{margin-top:7mm;padding-top:3mm;border-top:1px solid #8fa197;font-size:8pt;color:#4e5f56}",
].join("");
