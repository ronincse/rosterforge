// XML values are decoded at ingestion before shared projection, never in JSON or UI.
import JSZip from "jszip";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { sourceId } from "@rosterforge/foundation";
import { ingestBattleScribeFile, parseBattleScribeXml } from "./ingest.js";
import type { OrderedXmlElement } from "./types.js";
const source = { sourceId: sourceId("fiction:xml"), filename: "values.cat", kind: "synthetic" as const, importedAt: "2026-09-14T00:00:00Z" };
const bytes = (xml: string) => new TextEncoder().encode(xml);
const document = (value: string) => `<catalogue id="cat" name="${value}" revision="1"><readme>${value}</readme><selectionEntries><selectionEntry id="a&amp;b" name="${value}" type="unit"><profiles><profile id="profile" name="Example"><characteristics><characteristic name="Range" typeId="range">${value}</characteristic></characteristics></profile></profiles></selectionEntry></selectionEntries><entryLinks><entryLink id="link" targetId="a&amp;b" type="selectionEntry"/></entryLinks></catalogue>`;
function parse(xml: string) {
  const result = parseBattleScribeXml(bytes(xml), { source });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}

describe("XML reference values", () => {
  it.each([
    ["&amp;&lt;&gt;&quot;&apos;", "&<>\"'"],
    ["Raynor&apos;s Raiders", "Raynor's Raiders"],
    ["12&quot;", '12"'], ["4&quot;", '4"'],
    ["&#65;&#x41;&#233;&#xE9;&#128578;&#x1F642;", "AAéé🙂🙂"],
    ["&amp;quot; &#38;quot; &#x26;quot;", "&quot; &quot; &quot;"],
    ["&#9;&#10;&#13;", "\t\n\r"],
    ["&#xD7FF;&#xE000;&#xFFFD;&#x10000;&#x10FFFF;", "\uD7FF\uE000\uFFFD\u{10000}\u{10FFFF}"],
    [" é Ω 中 🙂 ", " é Ω 中 🙂 "],
  ])("decodes %s once in attributes and text", (encoded, expected) => {
    const xml = document(encoded);
    const parsed = parse(xml);
    expect(parsed.root.attributes.name).toBe(expected);
    expect(parsed.metadata.name).toBe(expected);
    expect(parsed.metadata.readme).toBe(expected);
    const entry = parsed.projection.selectionEntries[0]!;
    expect(entry.name).toBe(expected);
    expect(entry.id).toBe("a&b");
    expect(parsed.projection.entryLinks[0]!.targetId).toBe("a&b");
    expect(entry.profiles[0]!.characteristics[0]!.value).toBe(expected);
    expect(parsed.sourceBytes).toEqual(bytes(xml));
    expect(parsed.documentBytes).toEqual(bytes(xml));
    expect(createHash("sha256").update(parsed.sourceBytes).digest("hex")).toBe(createHash("sha256").update(bytes(xml)).digest("hex"));
  });
  it("preserves mixed order and literal CDATA, comments and PI attributes", () => {
    const parsed = parse(`<catalogue id="c" name=" n\t n " revision="1"><readme> a&amp;<![CDATA[&quot; &unknown; &#0;]]> b&#x21;<!-- &quot; &unknown; --><?note value="&quot; &unknown;"?><future/> tail </readme></catalogue>`);
    expect(parsed.metadata.name).toBe(" n\t n ");
    expect(parsed.metadata.readme).toBe(' a&&quot; &unknown; &#0; b! tail ');
    const readme = parsed.root.children.find(n => n.kind === "element" && n.name === "readme") as OrderedXmlElement;
    expect(readme.children.map(n => n.kind === "element" ? n.name : n.value)).toEqual([" a&", "&quot; &unknown; &#0;", " b!", " &quot; &unknown; ", "?note", "future", " tail "]);
    expect((readme.children[4] as OrderedXmlElement).attributes.value).toBe("&quot; &unknown;");
  });
  it("keeps encoded angle brackets as data, never parsed structure", () => {
    const parsed = parse(document("&lt;future /&gt;"));
    expect(parsed.metadata.readme).toBe("<future />");
    const readme = parsed.root.children.find(n => n.kind === "element" && n.name === "readme") as OrderedXmlElement;
    expect(readme.children).toEqual([{ kind: "text", value: "<future />" }]);
  });
  it.each(["&bogus;", "&nbsp;", "&AMP;", "&amp", "&", "&;", "&#;", "&#x;", "&#X41;", "&#-1;", "&#+1;", "&#1.2;", "&#xGG;", "&#0;", "&#1;", "&#11;", "&#xD800;", "&#55296;", "&#xDFFF;", "&#xFFFE;", "&#65535;", "&#x110000;", "&#999999999999999999999999999999999999999999999999999999;", "&#000000000000000000000000000000000000000000000000000065;"])("rejects invalid/unsupported reference %s without throwing", value => {
    for (const xml of [document(value), `<catalogue id="c" name="${value}"/>`, `<catalogue id="c" name="n"><readme>${value}</readme></catalogue>`]) {
      let result: ReturnType<typeof parseBattleScribeXml> | undefined;
      expect(() => { result = parseBattleScribeXml(bytes(xml), { source }); }).not.toThrow();
      expect(result?.ok).toBe(false);
      expect(result?.diagnostics.some(d => ["BS_XML_INVALID", "BS_XML_REFERENCE_INVALID"].includes(d.code))).toBe(true);
    }
  });
  it.each(["<!DOCTYPE catalogue SYSTEM 'https://invalid.test/x'>", "<!DOCTYPE catalogue [<!ENTITY x 'value'>]>", "<!ENTITY x SYSTEM 'file:///missing'>", "<!DOCTYPE catalogue [<!ENTITY % x SYSTEM 'https://invalid.test/x'> %x;]>", "<!DOCTYPE catalogue><!DOCTYPE catalogue>"])("rejects declaration before external access: %s", declaration => {
    const fetch = vi.fn(() => { throw new Error("No external access allowed"); });
    vi.stubGlobal("fetch", fetch);
    try {
      const result = parseBattleScribeXml(bytes(declaration + document("name")), { source });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]!.code).toMatch(/BS_XML_(DTD|ENTITY_DECLARATION)_FORBIDDEN/);
      expect(fetch).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it("uses the same values in plain and compressed input while preserving both payloads", async () => {
    const xml = bytes(document("&amp;quot; &#x1F642;"));
    const archive = await new JSZip().file("values.cat", xml).generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const plain = await ingestBattleScribeFile(xml, { source });
    const zipped = await ingestBattleScribeFile(archive, { source: { ...source, filename: "values.catz" } });
    expect(plain.ok && zipped.ok).toBe(true);
    if (!plain.ok || !zipped.ok) return;
    expect(zipped.value.metadata.name).toBe(plain.value.metadata.name);
    expect(zipped.value.metadata.name).toBe("&quot; 🙂");
    expect(zipped.value.sourceBytes).toEqual(archive);
    expect(zipped.value.documentBytes).toEqual(xml);
  });
  it("rejects an invalid compressed XML reference through the same diagnostic boundary", async () => {
    const xml = bytes(document("&#x110000;"));
    const archive = await new JSZip().file("values.cat", xml).generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const result = await ingestBattleScribeFile(archive, { source: { ...source, filename: "values.catz" } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(d => d.code === "BS_XML_REFERENCE_INVALID")).toBe(true);
  });
  it("does not decode JSON values", async () => {
    const input = bytes(JSON.stringify({ catalogue: { id: "c", name: "Raynor&apos;s Raiders", readme: "&quot; &#65;", revision: 1 } }));
    const result = await ingestBattleScribeFile(input, { source: { ...source, filename: "values.json" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata.name).toBe("Raynor&apos;s Raiders");
    expect(result.value.metadata.readme).toBe("&quot; &#65;");
    expect(result.value.sourceBytes).toEqual(input);
  });
});
