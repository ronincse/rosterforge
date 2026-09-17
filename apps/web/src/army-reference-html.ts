// Self-contained paper presentation over a scalar snapshot. No external assets,
// scripts, source markup execution, or accounting in this renderer.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferenceRichText } from "./reference-rich-text.js";
import type { ArmyReferenceDocument, ArmyReferenceProfile, ArmyReferenceUnit } from "./army-reference-model.js";
export type ArmyReferenceLayout = "compact" | "sheets";
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const rich = (text: string) => renderToStaticMarkup(createElement(ReferenceRichText, { text }));
const costs = (items: ArmyReferenceUnit["costs"]) => items.map(c => `${c.value}${c.limit === undefined ? "" : ` / ${c.limit}`} ${escape(c.name === c.typeId ? "Unnamed resource" : c.name)}${c.provisional ? " (provisional)" : ""}`).join(" · ");
const sectionLabels = { model: "Model stats", weapon: "Weapons & equipment", ability: "Abilities", additional: "Additional information" };

/** Both presets render exactly the same immutable facts; only page-flow CSS
 * differs. Plain player labels are escaped, source prose uses the screen's safe
 * rich-text component without a link environment. No dynamic source HTML. */
export function renderArmyReferenceDocument(doc: ArmyReferenceDocument, layout: ArmyReferenceLayout = "compact"): string {
  const rules = new Map(doc.glossary.map(r => [r.anchor, r]));
  const grouped = new Map<string, ArmyReferenceUnit[]>();
  for (const unit of doc.units) { const key = unit.configuration ? "Configuration & army reference" : unit.role; const list = grouped.get(key) ?? []; list.push(unit); grouped.set(key, list); }
  const profiles = (unit: ArmyReferenceUnit): string => Object.entries(sectionLabels).map(([section, label]) => {
    const entries = unit.profiles.filter(p => p.section === section);
    if (!entries.length) return "";
    // Stat tables repeat their owner. Oversized prose uses fragmentable rows
    // with repeating context; ordinary short abilities stay in normal flow.
    const blocks: string[] = [];
    for (let i = 0; i < entries.length;) {
      const first = entries[i]!;
      if (!isTable(first)) { blocks.push(renderProfile(first, unit.name)); i++; continue; }
      const rows = [first];
      // Compatible columns share a table, never a profile identity. Every
      // equivalence group keeps its own row, values, quantity and attribution.
      while (++i < entries.length) {
        const next = entries[i]!;
        if (!isTable(next) || next.type !== first.type || JSON.stringify(next.fields.map(f => f.name)) !== JSON.stringify(first.fields.map(f => f.name))) break;
        rows.push(next);
      }
      blocks.push(renderTable(rows, unit.name));
    }
    return `<section><h3>${label}</h3>${blocks.join("")}</section>`;
  }).join("");
  const unit = (u: ArmyReferenceUnit) => `<article class="unit ${(u.sheetUnit ?? !u.configuration) ? "army-unit" : "configuration"}" id="${u.anchor}">
    <header class="unit-heading"><h2>${escape(u.name)}</h2><p>${escape(u.role)}${u.costs.length ? " · " + costs(u.costs) : ""}</p></header>
    ${(u.sheetUnit ?? !u.configuration) ? `<p class="composition"><strong>Composition:</strong> ${escape(u.composition)}</p>` : ""}
    ${u.relationships.map(r => `<p class="relationship">${escape(r)}</p>`).join("")}
    ${u.options.length ? `<p class="loadout"><strong>Selected options:</strong> ${escape(u.options.join("; "))}</p>` : ""}
    ${profiles(u)}
    ${u.profiles.length === 0 && (u.sheetUnit ?? !u.configuration) ? "<p>No profile data is available for this selection.</p>" : ""}
    <table class="prose unit-tail"><thead><tr><th>${escape(u.name)} · Keywords & references</th></tr></thead><tbody><tr><td>
    ${u.keywords.length ? `<p class="keywords"><strong>Keywords:</strong> ${escape(u.keywords.join(", "))}</p>` : ""}
    ${u.memberKeywords?.length ? `<p class="keywords"><strong>Additional model / equipment keywords:</strong> ${escape(u.memberKeywords.join("; "))}</p>` : ""}
    ${u.rules.length ? `<p class="rule-references"><strong>Rule explanations:</strong> ${u.rules.map(id => `<a href="#${id}">${escape(rules.get(id)?.name ?? "Reference")} [${id.replace("rule-", "R")}]</a>`).join("; ")}</p>` : ""}
    ${u.rules.map(id => rules.get(id)).filter(r => r?.parameterNote).map(r => `<p class="qualification">${escape(r!.name)} [${r!.anchor.replace("rule-", "R")}]: ${escape(r!.parameterNote!)}</p>`).join("")}
    ${u.notes.map(n => `<p class="qualification">${escape(n)}</p>`).join("")}</td></tr></tbody></table></article>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(doc.name)} - ForceWright</title><style>${styles}</style></head><body class="${layout}"><main>
    <section class="overview"><header><p class="brand">ForceWright · Army reference</p><h1>${escape(doc.name)}</h1><p>${escape([doc.system, doc.catalogue].filter(Boolean).join(" · "))}</p></header>
    <p class="resource-summary">${costs(doc.resources)}</p>
    <div class="status">${doc.status.map(s => `<p>${escape(s)}</p>`).join("")}</div>
    <h2>Army index</h2><table class="index"><thead><tr><th>Selection / composition / options</th><th>Role</th><th>Resources / attachments</th></tr></thead><tbody>${doc.units.map(u => `<tr><th scope="row"><a href="#${u.anchor}">${escape(u.name)}</a><small>${escape(u.composition)}</small>${u.options.length ? `<small>${escape(u.options.join("; "))}</small>` : ""}</th><td>${escape(u.role)}</td><td>${costs(u.costs)}${u.relationships.map(r => `<small>${escape(r)}</small>`).join("")}</td></tr>`).join("")}</tbody></table>
    ${doc.units.length ? "" : "<p>No selections in this army.</p>"}
    <p class="reader-note">Quantities describe selected models or equipment, not multiplied attacks or damage. Resource values retain signed counters; a slash denotes a supported limit. Ability activation costs are reference text, not army spending. Rule references [R…] point to the glossary. Values and checks describe the supported source evaluation only.</p></section>
    ${[...grouped].map(([role, entries]) => `<section class="category"><h2 class="category-title">${escape(role)}</h2>${entries.map(unit).join("")}</section>`).join("")}
    ${doc.glossary.length ? `<section class="glossary"><h2>Rules & reference glossary</h2>${doc.glossary.map(r => {
      const heading = `${escape(r.name)} [${r.anchor.replace("rule-", "R")}]`;
      const scope = `<p class="used-by">Referenced by: ${escape(r.users.join("; "))}</p>${r.note ? `<p class="qualification">${escape(r.note)}</p>` : ""}${r.parameterNote ? `<p class="qualification">${escape(r.parameterNote)}</p>` : ""}`;
      // Only an individual long explanation uses a repeating header. The
      // appendix itself stays ordinary flow, not an unbreakable nested table.
      return r.text.length > 1200 ? `<article class="long-rule" id="${r.anchor}"><table class="prose"><thead><tr><th>${heading}${scope}</th></tr></thead><tbody><tr><td>${rich(r.text)}</td></tr></tbody></table></article>` : `<article id="${r.anchor}"><h3>${heading}</h3>${scope}${rich(r.text)}</article>`;
    }).join("")}</section>` : ""}
    <footer>ForceWright presentation export, not a BattleScribe .ros or .rosz interchange file.</footer></main></body></html>`;
}

function isTable(p: ArmyReferenceProfile): boolean {
  return p.table && p.fields.length > 0 && p.fields.length <= 8 && p.fields.every(f => f.value.length < 100 && !f.value.includes("\n"));
}

function renderTable(rows: readonly ArmyReferenceProfile[], owner: string): string {
  const first = rows[0]!;
  // Fixed tables prevent paper overflow, but equal columns crush prose cells.
  // Bounded content weights reserve room without guessing a game's stat schema.
  const weights = first.fields.map((field, i) => Math.min(3, Math.max(1, Math.ceil(Math.max(field.name.length, ...rows.map(p => p.fields[i]!.value.length)) / 8))));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const columns = weights.map(weight => `<col style="width:${72 * weight / totalWeight}%">`).join("");
  return `<table class="profile"><colgroup><col class="name-column">${columns}</colgroup><thead><tr><th colspan="${first.fields.length + 1}" class="profile-title">${escape(owner)} · ${escape(first.type)}</th></tr><tr><th class="profile-name">Profile / selected bearer</th>${first.fields.map(f => `<th scope="col">${escape(f.name)}</th>`).join("")}</tr></thead><tbody>${rows.map(p => `<tr><th scope="row">${escape(p.name)}<small>${escape(p.attribution)}</small></th>${p.fields.map(f => `<td>${rich(f.value)}${f.note ? `<small>${escape(f.note)}</small>` : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>${[...new Set(rows.flatMap(p => p.notes))].map(n => `<p class="qualification">${escape(n)}</p>`).join("")}`;
}

function renderProfile(p: ArmyReferenceProfile, owner: string): string {
  const intro = `<h4>${escape(p.name)}</h4><p class="attribution">${escape(p.attribution)}</p>`;
  const notes = p.notes.map(n => `<p class="qualification">${escape(n)}</p>`).join("");
  if (isTable(p)) return renderTable([p], owner);
  // Wide unknown schemas also become long vertical blocks. Repeat their owner
  // when fields continue onto another sheet, just as for oversized prose.
  if (p.fields.length > 8 || p.fields.some(f => f.value.length > 1200)) return `<table class="prose"><thead><tr><th>${escape(owner)} · ${escape(p.name)}<small>${escape(p.type)} · ${escape(p.attribution)}</small></th></tr></thead><tbody>${p.fields.map(f => `<tr><td><h5>${escape(f.name)}</h5>${rich(f.value)}${f.note ? `<p class="qualification">${escape(f.note)}</p>` : ""}</td></tr>`).join("")}</tbody></table>${notes}`;
  return `<section class="profile-fields"><p class="profile-context">${escape(owner)} · ${escape(p.type)}</p>${intro}${p.fields.map(f => `<div class="field"><h5>${escape(f.name)}</h5>${rich(f.value)}${f.note ? `<p class="qualification">${escape(f.note)}</p>` : ""}</div>`).join("")}${notes}</section>`;
}

const styles = `
@page{margin:14mm}
.profile-fields .field,.glossary article:not(.long-rule){break-inside:avoid}.reference-rich-text{orphans:3;widows:3}.glossary .used-by,.glossary .qualification{break-after:avoid}.unit-tail p{orphans:3;widows:3}.unit-tail{font-weight:normal}table.profile,table.index{table-layout:fixed}.profile .name-column{width:28%}body{overflow-wrap:anywhere}
*{box-sizing:border-box}html{font:10.5pt/1.35 Arial,Helvetica,sans-serif;color:#111;background:white}body{margin:0}main{max-width:185mm;margin:0 auto}h1{font-size:23pt;margin:2mm 0}h2{font-size:15pt;margin:4mm 0 2mm}h3{font-size:12pt;margin:3mm 0 1.5mm}h4{font-size:11pt;margin:0}h5{font-size:9pt;margin:2mm 0 1mm}p{margin:1.5mm 0}a{color:inherit;text-decoration:underline}small{display:block;font-size:9pt;font-weight:normal;line-height:1.3;margin-top:1mm}h1,h2,h3,h4,h5,.profile-context{break-after:avoid}p,li{orphans:3;widows:3}table{width:100%;border-collapse:collapse;table-layout:auto;margin:2mm 0 3mm}th,td{border:.25mm solid #888;padding:1.5mm;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{font-weight:700}thead{display:table-header-group}tr{break-inside:avoid}table p{margin:0}table .reference-rich-text{font-size:inherit}.index th:first-child{width:44%}.index th:nth-child(2){width:18%}.profile-name{width:28%}.profile td{font-size:10pt}.profile small{font-size:8.5pt}.prose tr{break-inside:auto}.prose td{border:0;padding:1mm 0}.prose thead th{border:0;border-top:.3mm solid #777;padding:2mm 0}.profile-title{font-size:10pt;border-bottom:.5mm solid #333}.profile th:not(.profile-title){font-size:9pt}.brand{font-size:9pt;letter-spacing:.1em;text-transform:uppercase}.resource-summary{font-size:13pt;font-weight:700;overflow-wrap:anywhere}.status{border-left:.7mm solid #555;padding-left:3mm;margin:3mm 0}.status p{font-size:9.5pt}.reader-note,.qualification,.used-by,.attribution,.profile-context{font-size:9pt}.qualification{font-style:italic}.unit{margin:3mm 0 4mm}.unit-heading{border-top:.8mm solid #222;border-bottom:.3mm solid #777;padding:1mm 0;break-inside:avoid;break-after:avoid}.unit-heading h2{margin:0}.composition{break-after:avoid}.loadout,.keywords,.rule-references{font-size:9.5pt}.category-title{border-bottom:.5mm solid #222;padding-bottom:1mm}.profile-fields{margin:2mm 0 3mm;padding-bottom:2mm;border-bottom:.25mm solid #aaa}.field{margin:1mm 0}.profile-fields h4,.attribution{break-after:avoid}.profile-fields .field:first-of-type{break-before:avoid}.unit-ending{break-inside:avoid}.field h5{break-after:avoid}.reference-rich-text{white-space:pre-wrap;overflow-wrap:anywhere}.reference-rich-text p{margin:1.5mm 0}.reference-rich-text ul,.reference-rich-text ol{margin:1.5mm 0;padding-left:5mm}.reference-rich-text [role=heading]{font-weight:bold;break-after:avoid}.reference-small-caps{font-variant:small-caps}.reference-text-table{overflow:visible}.glossary article{margin:3mm 0 5mm}.used-by{margin-bottom:2mm}.sheets .overview{break-after:page}.sheets .army-unit{break-before:page}.sheets .category-title{display:none}footer{border-top:.3mm solid #999;margin-top:5mm;padding-top:2mm;font-size:8pt}
@media screen{body{background:#e9e9e6;padding:5mm}main{background:white;padding:8mm;max-width:210mm;box-shadow:0 2px 15px #0002}.sheets .unit{margin-top:10mm}.sheets .army-unit{border-top:2mm solid #ccc}}
@media print{main{max-width:none}.reference-text-table table{table-layout:fixed}.reference-text-table th,.reference-text-table td{overflow-wrap:anywhere}.unit,.category,.profile-fields,.glossary,article{break-inside:auto}}
`;
