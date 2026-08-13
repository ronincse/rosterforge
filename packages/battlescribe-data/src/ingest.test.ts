import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { sourceId, type SourceFileProvenance } from "@rosterforge/foundation";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { ingestBattleScribeFile, parseBattleScribeXml } from "./ingest.js";
import type { OrderedXmlElement, OrderedXmlNode } from "./types.js";

describe("BattleScribe XML ingestion", () => {
  it.each([
    ["minimal.gst", "gameSystem", "synthetic-system", "Synthetic Game", 3],
    [
      "minimal.cat",
      "catalogue",
      "synthetic-catalogue",
      "Synthetic Faction",
      7,
    ],
  ] as const)(
    "parses %s and projects root metadata",
    (filename, kind, id, name, revision) => {
      const result = parseBattleScribeXml(fixtureBytes(filename), {
        source: provenance(filename),
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.value.metadata).toMatchObject({
        kind,
        id,
        name,
        revision,
      });
      expect(result.value.metadata.battleScribeVersion).toBe("2.03");
    },
  );

  it("keeps an unchanged private copy of source bytes", () => {
    const input = fixtureBytes("minimal.gst");
    const expected = input.slice();
    const result = parseBattleScribeXml(input, {
      source: provenance("minimal.gst"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    input.fill(0);
    expect(result.value.sourceBytes).toEqual(expected);
  });

  it("keeps unknown elements and attributes observable", () => {
    const result = parseBattleScribeXml(fixtureBytes("unknown.cat"), {
      source: provenance("unknown.cat"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.root.attributes.experimentalFlag).toBe("retained");
    const futureContainer = findElement(result.value.root, "futureContainer");
    const futureLeaf = findElement(result.value.root, "futureLeaf");
    expect(futureContainer?.attributes.futureAttribute).toBe("visible");
    expect(futureLeaf?.attributes.meaning).toBe("preserved");
    expect(
      futureLeaf?.children.find((node) => node.kind === "text"),
    ).toMatchObject({ value: "future text" });
  });

  it("preserves namespace-qualified names and declarations", () => {
    const result = parseBattleScribeXml(fixtureBytes("namespaced.gst"), {
      source: provenance("namespaced.gst"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.root.name).toBe("bs:gameSystem");
    expect(result.value.metadata.namespaceUri).toBe(
      "http://www.battlescribe.net/schema/gameSystemSchema",
    );
    expect(result.value.root.attributes["xmlns:future"]).toBe(
      "https://rosterforge.example/fixture/future",
    );
    expect(findElement(result.value.root, "future:extension")).toBeDefined();
  });

  it.each([
    ["dtd.gst", "BS_XML_DTD_FORBIDDEN"],
    ["entity.cat", "BS_XML_ENTITY_DECLARATION_FORBIDDEN"],
  ] as const)("rejects forbidden declarations in %s", (filename, code) => {
    const result = parseBattleScribeXml(fixtureBytes(filename), {
      source: provenance(filename),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code,
      impacts: expect.arrayContaining(["security"]),
    });
  });

  it("returns a structured filename-bearing diagnostic for invalid XML", () => {
    const result = parseBattleScribeXml(fixtureBytes("invalid.cat"), {
      source: provenance("invalid.cat"),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "BS_XML_INVALID",
      location: {
        source: {
          filename: "invalid.cat",
        },
      },
    });
  });

  it("enforces configurable XML size limits", () => {
    const input = fixtureBytes("excessive-input.cat");
    const result = parseBattleScribeXml(input, {
      source: provenance("excessive-input.cat"),
      limits: { maxSourceBytes: input.byteLength - 1 },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("BS_XML_SIZE_LIMIT");
  });

  it("enforces a configurable XML element-depth limit", () => {
    const input = xmlBytes(
      '<catalogue id="depth-test" name="Depth Test"><a><b><c /></b></a></catalogue>',
    );
    const result = parseBattleScribeXml(input, {
      source: provenance("depth-test.cat"),
      limits: { maxXmlDepth: 3 },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "BS_XML_STRUCTURE_LIMIT",
      impacts: ["parsing", "security"],
      details: {
        limit: "maxXmlDepth",
        configuredLimit: 3,
        observed: 4,
      },
    });
  });

  it("enforces a configurable ordered XML node-count limit", () => {
    const input = xmlBytes(
      '<catalogue id="node-test" name="Node Test"><a><b /></a></catalogue>',
    );
    const result = parseBattleScribeXml(input, {
      source: provenance("node-test.cat"),
      limits: { maxXmlNodes: 2 },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "BS_XML_STRUCTURE_LIMIT",
      impacts: ["parsing", "security"],
      details: {
        limit: "maxXmlNodes",
        configuredLimit: 2,
        observed: 3,
      },
    });
  });

  it("ingests a single-file compressed catalogue", async () => {
    const zip = new JSZip();
    zip.file("minimal.cat", fixtureBytes("minimal.cat"));
    const archive = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });

    const result = await ingestBattleScribeFile(archive, {
      source: provenance("minimal.catz"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata.kind).toBe("catalogue");
      expect(result.value.source.filename).toBe("minimal.catz");
      expect(result.value.sourceBytes).toEqual(archive);
      expect(result.value.documentSource.filename).toBe("minimal.cat");
      expect(Array.from(result.value.documentBytes)).toEqual(
        Array.from(fixtureBytes("minimal.cat")),
      );
    }
  });

  it("rejects archive traversal paths", async () => {
    const zip = new JSZip();
    zip.file("../minimal.cat", fixtureBytes("minimal.cat"));
    const archive = await zip.generateAsync({ type: "uint8array" });

    const result = await ingestBattleScribeFile(archive, {
      source: provenance("unsafe.catz"),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("BS_ARCHIVE_UNSAFE_PATH");
  });
});

function provenance(filename: string): SourceFileProvenance {
  return {
    sourceId: sourceId(`fixture:${filename}`),
    filename,
    kind: "synthetic",
    importedAt: "2026-06-15T00:00:00.000Z",
  };
}

function xmlBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function findElement(
  root: OrderedXmlElement,
  name: string,
): OrderedXmlElement | undefined {
  for (const child of root.children) {
    if (child.kind !== "element") {
      continue;
    }
    if (child.name === name) {
      return child;
    }
    const nested = findElement(child, name);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

const _orderedNodeTypeCheck: OrderedXmlNode | undefined = undefined;
void _orderedNodeTypeCheck;
