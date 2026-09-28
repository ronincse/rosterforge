// Offline paper presentation over scalar facts. Display aliases do not merge
// evaluator records, rule scope, or selected bearer identities.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreparedReferenceImages } from "./reference-image-view.js";
import type { PreparedArmyImages } from "./army-reference-images.js";
import { referenceContent } from "./reference-images.js";
import { ReferenceRichText } from "./reference-rich-text.js";
import type { ArmyReferenceDocument, ArmyReferenceProfile, ArmyReferenceUnit } from "./army-reference-model.js";
import { printedExplanations, printedProfileRows, type PrintedProfileRow } from "./army-reference-sharing.js";
export type ArmyReferenceLayout = "compact" | "sheets";
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
type Rich = (text: string) => string;
const costs = (items: ArmyReferenceUnit["costs"]) => items.map(c => c.value + (c.limit === undefined ? "" : " / " + c.limit) + " " + escape(c.name === c.typeId ? "Unnamed resource" : c.name) + (c.provisional ? " (provisional)" : "")).join(" · ");
const ref = (anchor: string) => anchor.replace("unit-", "U").replace("rule-", "R");
const bareName = (unit: ArmyReferenceUnit) => unit.name.replace(/^\d+\.\s*/, "");
const isArmy = (unit: ArmyReferenceUnit) => unit.sheetUnit ?? !unit.configuration;
type PrintedUnit = ArmyReferenceUnit & { readonly aliases: ReadonlyMap<string, string> };
const sectionLabels = { model: "Model stats", weapon: "Weapons & equipment", ability: "Abilities", additional: "Additional information" };

/** Compose two paper templates from the same frozen facts. Neither template
 * evaluates or mutates the document; source prose always uses the safe reader. */
export function renderArmyReferenceDocument(doc: ArmyReferenceDocument, layout: ArmyReferenceLayout = "compact", images?: PreparedArmyImages): string {
  const rich: Rich = text => renderToStaticMarkup(createElement(PreparedReferenceImages.Provider, { value: images?.outcomes ?? new Map() }, createElement(ReferenceRichText, { text, ...(images?.content.get(text) ? { content: images.content.get(text)! } : {}) })));
  const rules = new Map(doc.glossary.map(rule => [rule.anchor, rule]));
  const legend = new Map<string, string>();
  const mark = (note: string) => {
    if (!note) return "";
    let id = legend.get(note);
    if (!id) { id = "N" + (legend.size + 1); legend.set(note, id); }
    return '<a class="note-marker" href="#note-' + id + '" aria-label="Note ' + id + '">[' + id + "]</a>";
  };
  const compactUser = (user: string) => {
    const owner = doc.units.find(unit => user === unit.name || user.startsWith(unit.name + " · "));
    if (!owner) return escape(user);
    const rest = user.slice(owner.name.length);
    return '<a href="#' + owner.anchor + '">' + ref(owner.anchor) + "</a>" + (rest === " · 1× " + bareName(owner) ? "" : escape(rest));
  };
  const profiles = (unit: PrintedUnit): string => Object.entries(sectionLabels).map(([section, label]) => {
    const rows = printedProfileRows(unit.profiles.filter(profile => profile.section === section));
    if (!rows.length) return "";
    const blocks: string[] = [];
    for (let i = 0; i < rows.length;) {
      const first = rows[i]!;
      if (layout === "sheets" && section === "model" && isTable(first.profile)) { blocks.push(renderStatPanel(first, unit, mark, rich)); i++; continue; }
      if (section === "ability") { blocks.push(renderAbility(first, unit, mark, rich, layout)); i++; continue; }
      if (!isTable(first.profile)) { blocks.push(renderProfile(first, unit, mark, rich)); i++; continue; }
      const tableRows = [first];
      while (++i < rows.length) {
        const next = rows[i]!;
        if (!isTable(next.profile) || next.profile.type !== first.profile.type || JSON.stringify(next.profile.fields.map(f => f.name)) !== JSON.stringify(first.profile.fields.map(f => f.name))) break;
        tableRows.push(next);
      }
      blocks.push(renderTable(tableRows, unit, mark, rich));
    }
    return '<section class="profile-section section-' + section + '"><h3>' + label + "</h3>" + blocks.join("") + "</section>";
  }).join("");
  const renderUnit = (unit: ArmyReferenceUnit) => {
    const aliases = new Map<string, string>();
    for (const profile of unit.profiles) for (const member of profile.members ?? []) {
      if (member.label.length > 24 && member.label !== bareName(unit) && !aliases.has(member.label)) aliases.set(member.label, `B${aliases.size + 1}`);
    }
    const displayed = { ...unit, aliases };
    const scopedLabel = (label: string) => {
      const prefix = [...aliases.keys()].sort((a, b) => b.length - a.length).find(key => label === key || label.startsWith(key + " → "));
      return prefix ? aliases.get(prefix)! + label.slice(prefix.length) : label;
    };
    const memberKeywords = new Map<string, string[]>();
    for (const item of unit.memberKeywords ?? []) {
      const split = item.lastIndexOf(": ");
      const bearer = split < 0 ? "Selected entry" : item.slice(0, split);
      const keyword = split < 0 ? item : item.slice(split + 2);
      const items = memberKeywords.get(bearer) ?? []; items.push(keyword); memberKeywords.set(bearer, items);
    }
    const referenced = unit.rules.map(id => rules.get(id)).filter(rule => rule !== undefined);
    // Only exact duplicate composition is omitted. A loadout with a changed
    // bearer, quantity or option remains verbatim; labels never drive grouping.
    const options = unit.options.filter(option => !isArmy(unit) || option !== unit.composition);
    const composition = isArmy(unit) ? '<p class="composition">' + escape(unit.composition) + "</p>" : "";
    const title = '<h2>' + escape(bareName(unit)) + ' <span class="unit-ref">' + ref(unit.anchor) + "</span></h2>";
    const heading = layout === "compact"
      ? '<header class="unit-heading compact-heading"><div>' + title + composition + '</div><p class="unit-cost">' + costs(unit.costs) + "</p></header>"
      : '<header class="unit-heading sheet-heading"><div><p class="unit-role">' + escape(unit.role) + '</p>' + title + '</div><div class="sheet-cost">' + costs(unit.costs) + '</div></header><div class="sheet-composition">' + composition + "</div>";
    return '<article class="unit ' + (isArmy(unit) ? "army-unit" : "configuration") + '" id="' + unit.anchor + '">' + heading
      + '<div class="unit-meta">' + (options.length ? '<p class="loadout"><strong>Equipment / selections:</strong> ' + escape(options.join("; ")) + "</p>" : "")
      + unit.relationships.map(r => '<p class="relationship"><strong>Relationship:</strong> ' + escape(r) + "</p>").join("") + '</div>'
      + (aliases.size ? '<p class="bearer-legend"><strong>Bearer labels:</strong> ' + [...aliases].map(([label, alias]) => escape(alias + " = " + label)).join("; ") + "</p>" : "")
      + profiles(displayed)
      + (!unit.profiles.length && isArmy(unit) ? "<p>No profile data is available for this selection.</p>" : "")
      + '<div class="unit-tail"><p class="tail-owner">' + escape(bareName(unit)) + ' · ' + ref(unit.anchor) + '</p>'
      + (unit.keywords.length ? "<p><strong>Keywords:</strong> " + escape(unit.keywords.join(", ")) + "</p>" : "")
      + [...memberKeywords].map(([owner, keywords]) => "<p><strong>" + escape(scopedLabel(owner)) + ":</strong> " + escape(keywords.join(", ")) + "</p>").join("")
      + (referenced.length ? "<p><strong>Rules:</strong> " + referenced.map(rule => '<a href="#' + rule.anchor + '">' + escape(rule.name) + " [" + ref(rule.anchor) + "]</a>" + (rule.note ? mark(rule.note) : "")).join("; ") + "</p>" : "")
      + referenced.filter(rule => rule.parameterNote).map(rule => '<p class="qualification parameter"><strong>' + escape(rule.name) + " [" + ref(rule.anchor) + "]:</strong> " + parameterNote(rule.parameterNote!, mark) + "</p>").join("")
      + unit.notes.map(note => '<p class="qualification">' + escape(note) + "</p>").join("") + "</div></article>";
  };
  const army = doc.units.filter(isArmy), setup = doc.units.filter(unit => !isArmy(unit));
  const supporting = setup.filter(unit => unit.referenceSection === "supporting");
  const armyReference = setup.filter(unit => !supporting.includes(unit));
  // Copy presentation order only. Original anchors keep occurrence references
  // stable after setup containers move behind the combat selections.
  const body = army.map((unit, index) => (index === 0 || army[index - 1]!.role !== unit.role ? '<h2 class="category-heading">' + escape(unit.role) + '</h2>' : '') + renderUnit(unit)).join("");
  const glossary = printedExplanations(doc.glossary, rich).map(group => {
    const byLabel = new Map<string, typeof group.records[number][]>();
    for (const record of group.records) {
      const key = JSON.stringify([record.name, record.note, record.parameterNote]);
      const items = byLabel.get(key) ?? []; items.push(record); byLabel.set(key, items);
    }
    const mappings = [...byLabel.values()].map(records => {
      const first = records[0]!;
      return '<div class="rule-mapping"><strong>' + escape(first.name) + "</strong>" + (first.note ? mark(first.note) : "")
        + "<p>" + records.map(record => '<span id="' + record.anchor + '"><strong>[' + ref(record.anchor) + "]</strong> " + record.users.map(compactUser).join("; ") + "</span>").join(" · ") + "</p>"
        + (first.parameterNote ? '<p class="qualification">' + parameterNote(first.parameterNote, mark) + "</p>" : "") + "</div>";
    }).join("");
    const heading = escape(group.records[0]!.name) + " · " + group.records.map(rule => ref(rule.anchor)).join(", ");
    return '<article class="explanation">' + (group.records[0]!.text.length > 1200 ? mappings + '<table class="prose"><thead><tr><th>' + heading + ' · explanation (continued if split)</th></tr></thead><tbody><tr><td>' + group.html + "</td></tr></tbody></table>" : '<div class="short-explanation">' + mappings + group.html + "</div>") + "</article>";
  }).join("");
  const configuration = setup.length ? '<nav class="reference-nav" aria-label="Army and supporting references">' + [
    ["Army reference", armyReference] as const, ["Supporting setup & missions", supporting] as const,
  ].filter(([, units]) => units.length).map(([label, units]) => '<p><strong>' + label + ':</strong> ' + units.map(unit => '<a href="#' + unit.anchor + '">' + escape(bareName(unit)) + ' [' + ref(unit.anchor) + ']</a>' + (unit.options.length ? ' — ' + escape(unit.options.join('; ')) : '')).join(' · ') + '</p>').join('') + '</nav>' : '';
  const index = army.map(unit => '<tr><th scope="row"><a href="#' + unit.anchor + '">' + ref(unit.anchor) + " · " + escape(bareName(unit)) + "</a></th><td>" + escape(unit.overview ?? unit.composition) + "</td><td>" + costs(unit.costs) + (unit.highlights?.length ? " · " + escape(unit.highlights.join(", ")) : "") + unit.relationships.map(r => "<small>" + escape(r.replace(/: (\d+)\. /, ": U$1 · ")) + "</small>").join("") + "</td></tr>").join("");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><title>' + escape(doc.name) + " - ForceWright</title><style>" + styles + '</style></head><body class="' + layout + '"><main>'
    + '<section class="overview"><header><p class="brand">ForceWright · Army reference</p><h1>' + escape(doc.name) + "</h1><p>" + escape([doc.system, doc.catalogue].filter(Boolean).join(" · ")) + '</p></header><p class="resource-summary">' + costs(doc.resources) + '</p><p class="status">' + doc.status.map(escape).join(" ") + "</p>"
    + '<h2>Army index</h2><table class="index"><thead><tr><th>Unit</th><th>Size</th><th>Resources / highlights / relationships</th></tr></thead><tbody>' + index + "</tbody></table>" + configuration
    + (!doc.units.length ? "<p>No selections in this army.</p>" : "")
    + '<p class="reader-note">Full selected loadouts follow. U/R/P/N are document references, not page numbers. Reading notes and qualifications follow the glossary.</p></section>'
    + body + (armyReference.length ? '<section class="army-reference"><h2 class="document-section">Army reference</h2>' + armyReference.map(renderUnit).join('') + '</section>' : '')
    + (supporting.length ? '<section class="supporting-reference"><h2 class="document-section">Supporting setup & missions</h2>' + supporting.map(renderUnit).join('') + '</section>' : '')
    + (glossary ? '<section class="glossary"><h2 class="document-section">Rules & reference glossary</h2><p class="reader-note">Each R reference retains its unit/bearer scope below; identical full bodies are printed once.</p>' + glossary + "</section>" : "")
    + '<section class="note-legend"><h2>Reading notes & qualifications</h2><p>U = selection, R = rule/scope, P = original profile record, N = note below. Shared rows/bodies do not merge source rules or prove applicability. Quantities describe selected entries, never multiplied Attacks or Damage. A slash denotes a supported resource limit; activation costs are rule text, not army spending.</p>' + [...legend].map(([note, id]) => '<p id="note-' + id + '"><strong>[' + id + "]</strong> " + escape(note) + "</p>").join("") + "</section>"
    + "<footer>ForceWright presentation export, not a BattleScribe .ros or .rosz interchange file.</footer></main></body></html>";
}

function isTable(profile: ArmyReferenceProfile): boolean {
  const tokens = profile.fields.map(field => Math.max(...[field.name, field.value].flatMap(value => value.split(/\s+/).map(word => word.length)), 0));
  return profile.table && profile.fields.length > 0 && profile.fields.length <= 8 && tokens.every(length => length <= 22) && tokens.reduce((sum, length) => sum + Math.max(3, length), 0) <= 78 && profile.fields.every(field => field.value.length < 100 && !field.value.includes("\n"));
}

function parameterNote(note: string, mark: (note: string) => string): string {
  const match = /^Source-authored rule parameter\/name operations, not evaluated \((.*)\)\. Effective parameter remains unverified\.$/.exec(note);
  return match ? "Unevaluated source operation: " + escape(match[1]!) + mark("Rule name/parameter operations are source metadata, not evaluated results. Effective parameters and applicability remain unverified.") : escape(note);
}

function attribution(row: PrintedProfileRow, unit: PrintedUnit): string {
  if (row.records.every(record => record.members?.length)) {
    const groups = new Map<string, { members: Map<string, number>; records: string[] }>();
    for (const record of row.records) for (const member of record.members!) {
      const group = groups.get(member.label) ?? { members: new Map<string, number>(), records: [] };
      group.members.set(member.key, member.amount);
      if (record.record && !group.records.includes(record.record)) group.records.push(record.record);
      groups.set(member.label, group);
    }
    return (row.profile.scope ? escape(row.profile.scope) + " · " : "") + [...groups].map(([label, group]) => escape([...group.members.values()].reduce((sum, amount) => sum + amount, 0) + "× " + (label === bareName(unit) ? "this selection" : unit.aliases.get(label) ?? label)) + " [" + group.records.join(", ") + "]").join("; ");
  }
  const values = new Map<string, string[]>();
  for (const record of row.records) {
    const list = values.get(record.attribution) ?? [];
    if (record.record) list.push(record.record);
    values.set(record.attribution, list);
  }
  return [...values].map(([label, records]) => escape(label === "1× " + bareName(unit) ? "This selection" : label) + (records.length ? " [" + records.join(", ") + "]" : "")).join("; ");
}

function rowIdentity(row: PrintedProfileRow): string {
  // Machine-checkable scalar mapping accompanies the printed original-record
  // IDs. Every bearer and quantity remains recoverable in standalone HTML.
  return 'data-profile-records="' + escape(JSON.stringify(row.records.map(record => ({ record: record.record, members: record.members, effect: record.effectKey, scope: record.scope, attribution: record.attribution })))) + '"';
}

// Sheets expose short model characteristics as a scan-friendly panel. All
// authored field labels, local qualifications and bearer mappings survive.
function renderStatPanel(row: PrintedProfileRow, unit: PrintedUnit, mark: (note: string) => string, rich: Rich): string {
  const profile = row.profile;
  return '<section class="stat-panel" ' + rowIdentity(row) + '><h4>' + escape(profile.name) + profile.notes.map(mark).join('') + ' <span class="stat-type">' + escape(profile.type) + '</span></h4><p class="attribution">' + attribution(row, unit) + '</p><dl class="stat-grid">' + profile.fields.map(field => '<div' + (field.value.length > 5 ? ' class="long-stat" style="flex-grow:' + Math.min(3, Math.ceil(field.value.length / 5)) + '"' : '') + '><dt>' + escape(field.name) + '</dt><dd>' + rich(field.value) + '</dd></div>').join('') + '</dl>'
    + profile.fields.filter(field => field.note).map(field => '<p class="qualification">' + escape(field.name + ': ' + field.note) + '</p>').join('') + effectNotes([row]) + '</section>';
}

// Field length changes arrangement, never meaning: short labelled activation
// metadata sits beside long effects on sheets, in a single row on compact.
// Unknown field names remain literal labels; no game-specific phase vocabulary.
function renderAbility(row: PrintedProfileRow, unit: PrintedUnit, mark: (note: string) => string, rich: Rich, layout: ArmyReferenceLayout): string {
  const profile = row.profile;
  // Keep the longest value in the main reading region even when all fields
  // are short (a short effect must not send its cost to a different place).
  const longest = profile.fields.reduce<typeof profile.fields[number] | undefined>((best, f) => !best || f.value.length > best.value.length ? f : best, undefined);
  const short = profile.fields.filter(field => field !== longest && field.value.length <= 70 && !field.value.includes('\n') && !referenceContent(field.value).some(part => part.kind === 'image'));
  const long = profile.fields.filter(field => !short.includes(field));
  const field = (f: ArmyReferenceProfile['fields'][number]) => '<div class="ability-field"><strong>' + escape(f.name) + ':</strong> ' + rich(f.value) + (f.note ? '<p class="qualification">' + escape(f.note) + '</p>' : '') + '</div>';
  const heading = escape(profile.name) + profile.notes.map(mark).join('');
  const owner = '<small>' + attribution(row, unit) + '</small>';
  if (layout === 'compact') return '<table class="ability compact-ability" ' + rowIdentity(row) + '><thead><tr><th>' + heading + ' <span class="ability-phase">' + escape(profile.type) + ' · ' + ref(unit.anchor) + '</span></th></tr></thead><tbody><tr><td>' + owner + profile.fields.map(field).join('') + '</td></tr></tbody></table>' + effectNotes([row]);
  return '<table class="ability sheet-ability" ' + rowIdentity(row) + '><colgroup><col style="width:28%"><col style="width:72%"></colgroup><thead><tr><th colspan="2">' + ref(unit.anchor) + ' · ' + heading + ' <span class="continuation-context">/ ' + escape(bareName(unit)) + '</span></th></tr></thead><tbody><tr><td class="ability-activation"><strong>' + escape(profile.type) + '</strong>' + owner + short.map(field).join('') + '</td><td class="ability-effect">' + long.map(field).join('') + '</td></tr></tbody></table>' + effectNotes([row]);
}

function renderTable(rows: readonly PrintedProfileRow[], unit: PrintedUnit, mark: (note: string) => string, rich: Rich): string {
  const first = rows[0]!.profile;
  // Longest unbroken tokens reserve room for Keyword/INSTANT, rather than
  // allocating the same width to them as a one-digit numerical neighbor.
  const weights = first.fields.map((field, index) => Math.max(3, ...[field.name, ...rows.map(row => row.profile.fields[index]!.value)].flatMap(value => value.split(/\s+/).map(word => word.length + 1))));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const columns = weights.map(weight => '<col style="width:' + 73 * weight / total + '%">').join("");
  const localNotes = new Map<string, string>();
  const localMark = (note: string) => { let id = localNotes.get(note); if (!id) { id = String(localNotes.size + 1); localNotes.set(note, id); } return "<sup>[" + id + "]</sup>"; };
  const table = '<table class="profile"><colgroup><col style="width:27%">' + columns + '</colgroup><thead><tr><th colspan="' + (first.fields.length + 1) + '" class="profile-title">' + ref(unit.anchor) + " · " + escape(first.type) + "</th></tr><tr><th>Profile / selected bearer</th>" + first.fields.map(field => '<th scope="col">' + escape(field.name) + "</th>").join("") + "</tr></thead><tbody>"
    + rows.map(row => "<tr " + rowIdentity(row) + '><th scope="row">' + escape(row.profile.name) + row.profile.notes.map(mark).join("") + "<small>" + attribution(row, unit) + "</small></th>" + row.profile.fields.map(field => "<td>" + rich(field.value) + (field.note ? localMark(row.profile.name + " / " + field.name + ": " + field.note) : "") + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
  return table + [...localNotes].map(([note, id]) => '<p class="qualification local-note">[' + id + "] " + escape(note) + "</p>").join("")
    + effectNotes(rows);
}

function effectNotes(rows: readonly PrintedProfileRow[]): string {
  return [...new Set(rows.flatMap(row => row.records.flatMap(record => record.effects ?? [])))].map(effect => '<p class="effect-note">Evaluated effect [' + rows.flatMap(row => row.records.filter(record => record.effects?.includes(effect)).map(record => record.record)).filter(Boolean).join(", ") + "]: " + escape(effect) + "</p>").join("");
}

function renderProfile(row: PrintedProfileRow, unit: PrintedUnit, mark: (note: string) => string, rich: Rich): string {
  const profile = row.profile;
  const ordinaryDescription = profile.fields.length === 1 && profile.fields[0]?.name === "Description" && profile.type === "Abilities";
  const heading = escape(profile.name) + profile.notes.map(mark).join("");
  const sameOwner = profile.attribution === "1× " + bareName(unit);
  const context = (ordinaryDescription ? "" : escape(profile.type)) + (sameOwner ? "" : (ordinaryDescription ? "" : " · ") + attribution(row, unit));
  const fields = profile.fields.map(field => (ordinaryDescription ? "" : "<h5>" + escape(field.name) + "</h5>") + rich(field.value) + (field.note ? '<p class="qualification">' + escape(field.note) + "</p>" : ""));
  if (profile.fields.some(field => referenceContent(field.value).some(part => part.kind === "image"))) return '<section class="profile-fields map-profile" ' + rowIdentity(row) + '><h4>' + ref(unit.anchor) + " · " + heading + "</h4><p>" + context + "</p>" + fields.join("") + effectNotes([row]) + "</section>";
  if (profile.fields.length > 8 || profile.fields.some(field => field.value.length > 700 || field.value.split("\n").length > 6)) return '<table class="prose" ' + rowIdentity(row) + "><thead><tr><th>" + ref(unit.anchor) + " · " + heading + (ordinaryDescription && profile.attribution === "1× " + bareName(unit) ? "" : "<small>" + context + "</small>") + "</th></tr></thead><tbody>" + fields.map(field => "<tr><td>" + field + "</td></tr>").join("") + "</tbody></table>" + effectNotes([row]);
  return '<section class="profile-fields" ' + rowIdentity(row) + "><h4>" + heading + "</h4>" + (context ? '<p class="attribution">' + context + "</p>" : "") + fields.map((field, index) => '<div class="field' + (!profile.fields[index]!.value.includes("\n") && profile.fields[index]!.value.length < 600 ? " inline-field" : "") + '">' + field + "</div>").join("") + effectNotes([row]) + "</section>";
}

const styles = `
.reference-image{margin:2mm 0 4mm;break-inside:avoid;max-width:100%}.reference-image img{display:block;width:100%;height:auto;max-height:180mm;object-fit:contain;print-color-adjust:exact;-webkit-print-color-adjust:exact}.reference-image figcaption{font-weight:bold;text-align:center}.reference-image-unavailable{border:1px solid #888;padding:2mm}.map-profile h5{break-after:avoid}

@page{margin:14mm;@bottom-center{content:"Page " counter(page) " of " counter(pages);font:9pt Arial;color:#333}}
*{box-sizing:border-box}html{font:10.5pt/1.28 Arial,Helvetica,sans-serif;color:#111;background:#fff}body{margin:0}main{max-width:185mm;margin:auto}h1{font-size:21pt;margin:2mm 0}h2{font-size:14pt;margin:3mm 0 1.5mm}h3{font-size:11.5pt;margin:2.5mm 0 1mm}h4{font-size:10.5pt;margin:0}h5{font-size:10pt;margin:1.5mm 0 .5mm}p{margin:1mm 0}a{color:inherit;text-decoration:underline}small{display:block;font-size:9pt;font-weight:normal;line-height:1.2;margin-top:.7mm}h1,h2,h3,h4,h5,.rule-mapping{break-after:avoid}p,li{orphans:2;widows:2}table{width:100%;border-collapse:collapse;margin:1.5mm 0 2mm}th,td{border:.2mm solid #888;padding:1.1mm;text-align:left;vertical-align:top;overflow-wrap:break-word}th{font-weight:700}thead{display:table-header-group}tr{break-inside:avoid}table p{margin:0}.profile{table-layout:fixed}.profile th:not(.profile-title){font-size:9pt}.profile td{font-size:10.5pt}.profile-title{font-size:10pt;border-bottom:.4mm solid #333}.profile .reference-rich-text{overflow-wrap:normal;word-break:normal}.profile small{font-size:8.8pt}.index{table-layout:fixed}.index th:first-child{width:44%}.index td,.index th{padding:1.1mm 1.4mm}.index small{margin-top:.4mm}.prose tr{break-inside:auto}.prose td{border:0;padding:1mm 0}.prose thead th{border:0;border-top:.25mm solid #777;padding:1.5mm 0}.brand{font-size:9pt;letter-spacing:.1em;text-transform:uppercase}.resource-summary{font-size:12pt;font-weight:bold}.status,.reader-note{font-size:9pt}.status{border-left:.7mm solid #555;padding-left:2mm;margin:2mm 0}.setup p{margin:1mm 0}.setup-keywords{font-size:9pt}.qualification,.attribution,.effect-note{font-size:9pt}.qualification{font-style:italic}.note-marker{font-size:8pt;vertical-align:super;white-space:nowrap;margin-left:.4mm}.unit{margin:3mm 0}.unit-heading{border-top:.7mm solid #222;border-bottom:.25mm solid #888;padding:1mm 0;break-inside:avoid;break-after:avoid}.unit-heading h2{margin:0}.composition,.loadout,.relationship{break-after:avoid}.loadout,.unit-tail{font-size:9.5pt}.unit-tail h3{font-size:10pt}.unit-tail{border-top:.25mm solid #aaa;padding-top:1mm}.profile-fields{margin:1.5mm 0 2mm}.profile-fields .field{break-inside:avoid}.field{margin:.6mm 0}.reference-rich-text{white-space:pre-wrap;overflow-wrap:break-word}.reference-rich-text p{margin:1mm 0}.reference-rich-text ul,.reference-rich-text ol{margin:1mm 0;padding-left:5mm}.reference-rich-text [role=heading]{font-weight:bold;break-after:avoid}.reference-small-caps{font-variant:small-caps}.reference-text-table{overflow:visible}.explanation{margin:2.5mm 0 4mm}.rule-mapping{font-size:9.5pt;margin:1mm 0}.rule-mapping>strong{font-size:11pt}.rule-mapping p{margin:.7mm 0}.local-note,.effect-note{margin:.7mm 0}.sheets .overview{break-after:page}.sheets .army-unit{break-before:page}.glossary{break-before:page}.note-legend p{font-size:9pt;break-inside:avoid}footer{border-top:.25mm solid #999;margin-top:3mm;padding-top:1mm;font-size:8pt}
@media screen{body{background:#e9e9e6;padding:5mm}main{background:#fff;padding:8mm;max-width:210mm;box-shadow:0 2px 15px #0002}.sheets .army-unit{margin-top:10mm}}
.index th:first-child{width:40%}.index th:nth-child(2){width:13%}.bearer-legend{font-size:9pt;break-after:avoid}.index td,.index th{padding:1.3mm}.profile-section>h3{break-after:avoid}.unit-tail{break-inside:avoid}.note-legend{break-inside:avoid}
.inline-field h5,.inline-field>.reference-rich-text,.inline-field>.reference-rich-text>p{display:inline}.inline-field h5:after{content:": "}.glossary{break-before:auto}.unit-tail{break-inside:auto}.unit-tail h3{break-after:avoid}.profile td>.reference-rich-text{display:inline}.profile td>.reference-rich-text>p{display:inline}
.glossary>.reader-note{break-after:avoid}
.short-explanation{break-inside:avoid}
@media print{main{max-width:none}.reference-text-table table{table-layout:fixed}.reference-text-table th,.reference-text-table td{overflow-wrap:break-word}.unit,.profile-section,.profile-fields,.glossary,.explanation{break-inside:auto}}
.unit-ref{font-size:10pt;font-weight:normal;white-space:nowrap}.unit-heading{display:flex;justify-content:space-between;gap:4mm}.unit-heading .composition{font-size:10pt;font-weight:normal;margin-top:1mm}.unit-cost,.sheet-cost{font-size:10pt;max-width:38%;text-align:right}.compact .unit{border:.25mm solid #555;padding:2mm 2.5mm;box-decoration-break:clone}.compact-heading{border-top:0;padding-top:0}.compact .unit-heading h2{font-size:13pt}.compact .unit-meta{display:flex;gap:3mm;flex-wrap:wrap}.compact .unit-meta>p{flex:1 1 60mm}.unit-meta:empty,.unit-tail:empty,.sheet-composition:empty{display:none}.sheet-heading{border-top:1mm solid #111;border-bottom:.5mm solid #111;padding:3mm 0}.sheet-heading h2{font-size:23pt;line-height:1.12}.sheet-heading .unit-role{font-size:9pt;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1.5mm}.sheet-cost{font-size:12pt;font-weight:bold}.sheet-composition{font-size:11pt;margin:2mm 0}.sheets .profile-section>h3{font-size:10pt;text-transform:uppercase;letter-spacing:.06em;border-bottom:.3mm solid #777;padding:1mm 0}.stat-panel{border:.4mm solid #222;padding:2mm;margin:2mm 0;break-inside:avoid}.stat-panel h4{font-size:12pt}.stat-grid{display:flex;margin:2mm 0 0;gap:0}.stat-grid>div{flex:1;min-width:0;border-left:.2mm solid #888;padding:1mm;text-align:center}.stat-grid>div:first-child{border:0}.stat-grid dt{font-size:9pt;font-weight:bold}.stat-grid dd{font-size:17pt;font-weight:bold;margin:1mm 0}.ability{table-layout:fixed;margin:1.5mm 0 2mm}.ability th,.ability td{border:0;padding:1mm 1.5mm}.ability thead th{font-size:9pt;border-top:.25mm solid #999;text-align:left}.ability tr{break-inside:auto}.ability .ability-name,.ability .ability-activation{width:28%}.ability-name{font-size:10.5pt}.ability-field{margin:.7mm 0}.ability-field>.reference-rich-text,.ability-field>.reference-rich-text>p:only-child{display:inline}.ability-field>strong{font-size:9.5pt}.compact-ability thead th{padding:.5mm 0;font-size:8.5pt;color:#444}.sheet-ability thead th{font-size:11pt;border-top:.5mm solid #333;border-bottom:.2mm solid #888;padding:1.8mm 1mm}.sheet-ability .ability-activation{border-right:.2mm solid #888;font-size:9.5pt}.sheet-ability .ability-effect{padding-left:3mm}.continuation-context{font-size:9pt;font-weight:normal}.category-heading{font-size:11pt;text-transform:uppercase;letter-spacing:.07em;margin-top:5mm;break-after:avoid}.reference-nav{font-size:9.5pt;border-top:.25mm solid #aaa;padding-top:1mm;margin-top:2mm}.document-section{border-bottom:.6mm solid #111;padding-bottom:2mm;margin-top:6mm}.unit-tail{margin-top:2mm;padding-top:1.5mm}.sheets .army-reference,.sheets .supporting-reference{break-before:page}
@media print{.sheets .category-heading{display:none}.stat-panel,.unit-heading{break-inside:avoid}.unit{overflow:visible}.ability-field{orphans:2;widows:2}}
.compact-ability{margin:1mm 0}.compact-ability thead th{font-size:10.5pt;padding:1mm 0 .5mm;color:#111}.compact-ability td{padding:0 0 1mm}.compact-ability .ability-field{display:inline;margin-right:2mm}.compact-ability td>small{display:inline;margin-right:2mm}.ability-phase{font-size:9pt;font-weight:normal}.compact .profile-section>h3{margin-top:2mm}.compact .unit-tail{font-size:9pt}
.stat-type{font-size:9pt;font-weight:normal}.stat-grid{flex-wrap:wrap}.stat-grid>div{flex-basis:16mm}.stat-grid>.long-stat{flex-basis:27mm}.long-stat dd{font-size:12pt}
.tail-owner{font-size:9pt;font-weight:bold}.unit-tail{break-inside:avoid}.profile-section:has(+ .unit-tail){break-after:avoid}.profile-section:has(+ .unit-tail)>:last-child{break-after:avoid}
/* Keep multi-paragraph prose in block formatting contexts; the inline compact
   treatment is for adjacent short fields, not their paragraph containers. */
.ability-field:has(.reference-rich-text>p+p),.ability-field>.reference-rich-text:has(>p+p){display:block}
`;
