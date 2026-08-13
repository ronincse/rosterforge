import { XMLParser, XMLValidator } from "fast-xml-parser";
import JSZip from "jszip";

import {
  failure,
  objectId,
  success,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
} from "@rosterforge/foundation";

import {
  defaultIngestionLimits,
  type BattleScribeDocumentKind,
  type BattleScribeRootMetadata,
  type IngestionLimits,
  type OrderedJsonObject,
  type OrderedXmlAttributes,
  type OrderedXmlElement,
  type OrderedXmlNode,
  type ParsedBattleScribeDocument,
} from "./types.js";
import { projectBattleScribeDocument } from "./project.js";
import {
  battleScribeElementFromJson,
  jsonObjectProperties,
  parseOrderedJson,
} from "./json.js";

const textDecoder = new TextDecoder("utf-8", { fatal: true });
const declarationPattern = /<!\s*(DOCTYPE|ENTITY)\b/iu;

const parser = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: "",
  commentPropName: "#comment",
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  preserveOrder: true,
  processEntities: false,
  removeNSPrefix: false,
  trimValues: false,
});

export interface IngestBattleScribeOptions {
  readonly source: SourceFileProvenance;
  readonly limits?: Partial<IngestionLimits>;
}

export async function ingestBattleScribeFile(
  input: Uint8Array,
  options: IngestBattleScribeOptions,
): Promise<Result<ParsedBattleScribeDocument>> {
  const limits = { ...defaultIngestionLimits, ...options.limits };
  const extension = extensionOf(options.source.filename);

  if (extension === ".gstz" || extension === ".catz") {
    return ingestArchive(input, options.source, limits, extension);
  }

  if (extension === ".json") {
    return parseJsonDocument(input, options.source, limits);
  }

  if (extension !== ".gst" && extension !== ".cat") {
    return failure([
      diagnostic(
        "BS_IMPORT_UNSUPPORTED_EXTENSION",
        `Unsupported BattleScribe file extension for ${options.source.filename}.`,
        options.source,
        ["import", "compatibility"],
      ),
    ]);
  }

  return parseXmlDocument(input, options.source, limits, extension);
}

export function parseBattleScribeJson(
  input: Uint8Array,
  options: IngestBattleScribeOptions,
): Result<ParsedBattleScribeDocument> {
  const limits = { ...defaultIngestionLimits, ...options.limits };
  const extension = extensionOf(options.source.filename);

  if (extension !== ".json") {
    return failure([
      diagnostic(
        "BS_IMPORT_UNSUPPORTED_EXTENSION",
        `Expected a .json source, received ${options.source.filename}.`,
        options.source,
        ["import", "compatibility"],
      ),
    ]);
  }

  return parseJsonDocument(input, options.source, limits);
}

export function parseBattleScribeXml(
  input: Uint8Array,
  options: IngestBattleScribeOptions,
): Result<ParsedBattleScribeDocument> {
  const limits = { ...defaultIngestionLimits, ...options.limits };
  const extension = extensionOf(options.source.filename);

  if (extension !== ".gst" && extension !== ".cat") {
    return failure([
      diagnostic(
        "BS_IMPORT_UNSUPPORTED_EXTENSION",
        `Expected a .gst or .cat source, received ${options.source.filename}.`,
        options.source,
        ["import", "compatibility"],
      ),
    ]);
  }

  return parseXmlDocument(input, options.source, limits, extension);
}

async function ingestArchive(
  input: Uint8Array,
  source: SourceFileProvenance,
  limits: IngestionLimits,
  archiveExtension: ".gstz" | ".catz",
): Promise<Result<ParsedBattleScribeDocument>> {
  if (input.byteLength > limits.maxArchiveCompressedBytes) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_COMPRESSED_SIZE_LIMIT",
        `Archive ${source.filename} exceeds the compressed size limit.`,
        source,
        ["import", "security"],
        { actualBytes: input.byteLength, limitBytes: limits.maxArchiveCompressedBytes },
      ),
    ]);
  }

  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(input, {
      checkCRC32: true,
      createFolders: false,
    });
  } catch (error: unknown) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_INVALID",
        `Could not read archive ${source.filename}.`,
        source,
        ["import", "parsing"],
        { cause: errorMessage(error) },
      ),
    ]);
  }

  const files = Object.values(archive.files).filter((entry) => !entry.dir);
  if (files.length > limits.maxArchiveEntries) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_ENTRY_LIMIT",
        `Archive ${source.filename} contains too many files.`,
        source,
        ["import", "security"],
        { actualEntries: files.length, limitEntries: limits.maxArchiveEntries },
      ),
    ]);
  }

  const expectedExtension = archiveExtension === ".gstz" ? ".gst" : ".cat";
  const candidates = files.filter(
    (entry) =>
      isSafeArchiveEntry(entry) &&
      extensionOf(entry.name) === expectedExtension,
  );

  if (files.some((entry) => !isSafeArchiveEntry(entry))) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_UNSAFE_PATH",
        `Archive ${source.filename} contains an unsafe path.`,
        source,
        ["import", "security"],
      ),
    ]);
  }

  if (candidates.length !== 1 || files.length !== 1) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_CONTENTS",
        `Archive ${source.filename} must contain exactly one ${expectedExtension} file.`,
        source,
        ["import", "compatibility", "security"],
        { candidateCount: candidates.length, fileCount: files.length },
      ),
    ]);
  }

  const candidate = candidates[0];
  if (candidate === undefined) {
    throw new Error("Archive candidate invariant failed.");
  }

  const archiveMetadata = (
    candidate as JSZip.JSZipObject & {
      readonly _data?: {
        readonly compressedSize?: number;
        readonly uncompressedSize?: number;
      };
    }
  )._data;
  const compressedSize = archiveMetadata?.compressedSize;
  const expandedSize = archiveMetadata?.uncompressedSize;
  if (
    typeof expandedSize === "number" &&
    expandedSize > limits.maxArchiveExpandedBytes
  ) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_EXPANDED_SIZE_LIMIT",
        `Archive entry ${candidate.name} exceeds the expanded size limit.`,
        source,
        ["import", "security"],
        { actualBytes: expandedSize, limitBytes: limits.maxArchiveExpandedBytes },
      ),
    ]);
  }

  if (
    typeof compressedSize === "number" &&
    typeof expandedSize === "number" &&
    compressedSize > 0 &&
    expandedSize / compressedSize > limits.maxCompressionRatio
  ) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_COMPRESSION_RATIO_LIMIT",
        `Archive entry ${candidate.name} exceeds the compression ratio limit.`,
        source,
        ["import", "security"],
      ),
    ]);
  }

  const xmlBytes = await candidate.async("uint8array");
  if (xmlBytes.byteLength > limits.maxArchiveExpandedBytes) {
    return failure([
      diagnostic(
        "BS_ARCHIVE_EXPANDED_SIZE_LIMIT",
        `Archive entry ${candidate.name} exceeds the expanded size limit.`,
        source,
        ["import", "security"],
      ),
    ]);
  }

  const innerSource: SourceFileProvenance = {
    ...source,
    filename: candidate.name,
    origin: source.origin ?? source.filename,
  };
  const parsed = parseXmlDocument(
    xmlBytes,
    innerSource,
    limits,
    expectedExtension,
  );
  if (!parsed.ok) {
    return parsed;
  }
  return success(
    {
      ...parsed.value,
      source,
      sourceBytes: input.slice(),
    },
    parsed.diagnostics,
  );
}

function parseXmlDocument(
  input: Uint8Array,
  source: SourceFileProvenance,
  limits: IngestionLimits,
  extension: ".gst" | ".cat",
): Result<ParsedBattleScribeDocument> {
  if (input.byteLength > limits.maxSourceBytes) {
    return failure([
      diagnostic(
        "BS_XML_SIZE_LIMIT",
        `Source ${source.filename} exceeds the XML size limit.`,
        source,
        ["import", "security"],
        { actualBytes: input.byteLength, limitBytes: limits.maxSourceBytes },
      ),
    ]);
  }

  let xml: string;
  try {
    xml = textDecoder.decode(input);
  } catch (error: unknown) {
    return failure([
      diagnostic(
        "BS_XML_ENCODING",
        `Source ${source.filename} is not valid UTF-8.`,
        source,
        ["parsing"],
        { cause: errorMessage(error) },
      ),
    ]);
  }

  const declaration = declarationPattern.exec(xml);
  if (declaration !== null) {
    const declarationName = declaration[1]?.toUpperCase() ?? "DECLARATION";
    return failure([
      diagnostic(
        declarationName === "DOCTYPE"
          ? "BS_XML_DTD_FORBIDDEN"
          : "BS_XML_ENTITY_DECLARATION_FORBIDDEN",
        `${declarationName} declarations are forbidden in ${source.filename}.`,
        source,
        ["parsing", "security"],
        { declaration: declarationName, offset: declaration.index },
      ),
    ]);
  }

  const validation = XMLValidator.validate(xml, {
    allowBooleanAttributes: true,
  });
  if (validation !== true) {
    return failure([
      diagnostic(
        "BS_XML_INVALID",
        `Invalid XML in ${source.filename}: ${validation.err.msg}`,
        source,
        ["parsing"],
        {
          line: validation.err.line,
          column: validation.err.col,
          code: validation.err.code,
        },
      ),
    ]);
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (error: unknown) {
    return failure([
      diagnostic(
        "BS_XML_PARSE_FAILED",
        `Could not parse XML in ${source.filename}.`,
        source,
        ["parsing"],
        { cause: errorMessage(error) },
      ),
    ]);
  }

  const conversion = convertOrderedDocument(parsed, limits);
  if (!conversion.ok) {
    return failure([
      diagnostic(
        "BS_XML_STRUCTURE_LIMIT",
        `XML in ${source.filename} exceeds the ${conversion.limit} limit.`,
        source,
        ["parsing", "security"],
        {
          limit: conversion.limit,
          configuredLimit: conversion.configuredLimit,
          observed: conversion.observed,
        },
      ),
    ]);
  }
  const documentNodes = conversion.nodes;
  const root = documentNodes.find(
    (node): node is OrderedXmlElement =>
      node.kind === "element" && !node.name.startsWith("?"),
  );
  if (root === undefined) {
    return failure([
      diagnostic(
        "BS_XML_ROOT_MISSING",
        `Source ${source.filename} does not contain a root element.`,
        source,
        ["parsing"],
      ),
    ]);
  }

  const expectedRoot = extension === ".gst" ? "gameSystem" : "catalogue";
  if (localName(root.name) !== expectedRoot) {
    return failure([
      diagnostic(
        "BS_XML_ROOT_MISMATCH",
        `Expected <${expectedRoot}> in ${source.filename}, found <${root.name}>.`,
        source,
        ["parsing", "compatibility"],
      ),
    ]);
  }

  const metadataResult = projectMetadata(root, source);
  if (!metadataResult.ok) {
    return metadataResult;
  }
  const projectionResult = projectBattleScribeDocument(
    root,
    metadataResult.value,
    source,
  );
  if (!projectionResult.ok) {
    return projectionResult;
  }
  const preservedBytes = input.slice();

  return success(
    {
      source,
      sourceBytes: preservedBytes,
      documentSource: source,
      documentBytes: preservedBytes,
      sourceFormat: "xml",
      sourceRoot: root,
      root,
      metadata: metadataResult.value,
      projection: projectionResult.value,
    },
    [...metadataResult.diagnostics, ...projectionResult.diagnostics],
  );
}

function parseJsonDocument(
  input: Uint8Array,
  source: SourceFileProvenance,
  limits: IngestionLimits,
): Result<ParsedBattleScribeDocument> {
  if (input.byteLength > limits.maxSourceBytes) {
    return failure([
      diagnostic(
        "BS_JSON_SIZE_LIMIT",
        `Source ${source.filename} exceeds the JSON size limit.`,
        source,
        ["import", "security"],
        { actualBytes: input.byteLength, limitBytes: limits.maxSourceBytes },
      ),
    ]);
  }

  let json: string;
  try {
    json = textDecoder.decode(input);
  } catch (error: unknown) {
    return failure([
      diagnostic(
        "BS_JSON_ENCODING",
        `Source ${source.filename} is not valid UTF-8.`,
        source,
        ["parsing"],
        { cause: errorMessage(error) },
      ),
    ]);
  }

  const parsed = parseOrderedJson(json, limits);
  if (!parsed.ok) {
    if (parsed.kind === "limit") {
      return failure([
        {
          ...diagnostic(
            "BS_JSON_STRUCTURE_LIMIT",
            `JSON in ${source.filename} exceeds the ${parsed.limit} limit.`,
            source,
            ["parsing", "security"],
            {
              limit: parsed.limit,
              configuredLimit: parsed.configuredLimit,
              observed: parsed.observed,
            },
          ),
          location: {
            source,
            start: parsed.range.start,
            end: parsed.range.end,
          },
        },
      ]);
    }
    return failure([
      {
        ...diagnostic(
          "BS_JSON_INVALID",
          `Invalid JSON in ${source.filename}: ${parsed.message}`,
          source,
          ["parsing"],
        ),
        location: {
          source,
          start: parsed.range.start,
          end: parsed.range.end,
        },
      },
    ]);
  }

  if (parsed.value.kind !== "object") {
    return failure([
      jsonRootDiagnostic(
        "BS_JSON_ROOT_INVALID",
        `Source ${source.filename} must contain a JSON object at the document root.`,
        source,
        parsed.value.range,
      ),
    ]);
  }

  const rootProperties = [
    ...jsonObjectProperties(parsed.value, "gameSystem"),
    ...jsonObjectProperties(parsed.value, "catalogue"),
  ];
  if (rootProperties.length === 0) {
    return failure([
      jsonRootDiagnostic(
        "BS_JSON_ROOT_MISSING",
        `Source ${source.filename} does not contain a gameSystem or catalogue root property.`,
        source,
        parsed.value.range,
      ),
    ]);
  }
  if (rootProperties.length > 1) {
    return failure([
      jsonRootDiagnostic(
        "BS_JSON_ROOT_AMBIGUOUS",
        `Source ${source.filename} contains multiple BattleScribe root properties.`,
        source,
        parsed.value.range,
      ),
    ]);
  }

  const rootProperty = rootProperties[0];
  if (rootProperty === undefined || rootProperty.value.kind !== "object") {
    const range = rootProperty?.value.range ?? parsed.value.range;
    return failure([
      jsonRootDiagnostic(
        "BS_JSON_ROOT_INVALID",
        `The BattleScribe root property in ${source.filename} must contain an object.`,
        source,
        range,
      ),
    ]);
  }

  const root = battleScribeElementFromJson(
    rootProperty.name,
    rootProperty.value,
  );
  const metadataResult = projectMetadata(root, source);
  if (!metadataResult.ok) {
    return metadataResult;
  }
  const projectionResult = projectBattleScribeDocument(
    root,
    metadataResult.value,
    source,
  );
  if (!projectionResult.ok) {
    return projectionResult;
  }
  const preservedBytes = input.slice();

  return success(
    {
      source,
      sourceBytes: preservedBytes,
      documentSource: source,
      documentBytes: preservedBytes,
      sourceFormat: "json",
      sourceRoot: parsed.value,
      root,
      metadata: metadataResult.value,
      projection: projectionResult.value,
    },
    [...metadataResult.diagnostics, ...projectionResult.diagnostics],
  );
}

interface XmlConversionState {
  nodeCount: number;
  failure?: {
    readonly limit: "maxXmlDepth" | "maxXmlNodes";
    readonly configuredLimit: number;
    readonly observed: number;
  };
}

type XmlConversionResult =
  | {
      readonly ok: true;
      readonly nodes: readonly OrderedXmlNode[];
    }
  | {
      readonly ok: false;
      readonly limit: "maxXmlDepth" | "maxXmlNodes";
      readonly configuredLimit: number;
      readonly observed: number;
    };

function convertOrderedDocument(
  value: unknown,
  limits: IngestionLimits,
): XmlConversionResult {
  const state: XmlConversionState = { nodeCount: 0 };
  const nodes = convertOrderedNodes(value, limits, state, 0);
  return state.failure === undefined
    ? { ok: true, nodes }
    : { ok: false, ...state.failure };
}

function convertOrderedNodes(
  value: unknown,
  limits: IngestionLimits,
  state: XmlConversionState,
  depth: number,
): readonly OrderedXmlNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const nodes: OrderedXmlNode[] = [];
  for (const rawNode of value) {
    if (state.failure !== undefined) {
      break;
    }
    if (!isRecord(rawNode)) {
      continue;
    }

    const attributes = parseAttributes(rawNode[":@"]);
    for (const [name, childValue] of Object.entries(rawNode)) {
      if (name === ":@") {
        continue;
      }
      if (name === "#text") {
        if (!reserveXmlNode(state, limits)) {
          break;
        }
        nodes.push({ kind: "text", value: String(childValue) });
        continue;
      }
      if (name === "#comment") {
        if (!reserveXmlNode(state, limits)) {
          break;
        }
        nodes.push({ kind: "comment", value: commentValue(childValue) });
        continue;
      }
      const childDepth = depth + 1;
      if (childDepth > limits.maxXmlDepth) {
        state.failure = {
          limit: "maxXmlDepth",
          configuredLimit: limits.maxXmlDepth,
          observed: childDepth,
        };
        break;
      }
      if (!reserveXmlNode(state, limits)) {
        break;
      }
      nodes.push({
        kind: "element",
        name,
        attributes,
        children: convertOrderedNodes(childValue, limits, state, childDepth),
      });
    }
  }
  return nodes;
}

function reserveXmlNode(
  state: XmlConversionState,
  limits: IngestionLimits,
): boolean {
  const observed = state.nodeCount + 1;
  if (observed > limits.maxXmlNodes) {
    state.failure = {
      limit: "maxXmlNodes",
      configuredLimit: limits.maxXmlNodes,
      observed,
    };
    return false;
  }
  state.nodeCount = observed;
  return true;
}

function parseAttributes(value: unknown): OrderedXmlAttributes {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, attributeValue]) => [
      name,
      String(attributeValue),
    ]),
  );
}

function projectMetadata(
  root: OrderedXmlElement,
  source: SourceFileProvenance,
): Result<BattleScribeRootMetadata> {
  const id = root.attributes.id;
  const name = root.attributes.name;
  if (id === undefined || name === undefined) {
    return failure([
      diagnostic(
        "BS_XML_METADATA_REQUIRED",
        `Root element in ${source.filename} must have id and name attributes.`,
        source,
        ["parsing", "compatibility"],
      ),
    ]);
  }

  const kind: BattleScribeDocumentKind =
    localName(root.name) === "gameSystem" ? "gameSystem" : "catalogue";
  const diagnostics: Diagnostic[] = [];
  const revision = parseOptionalInteger(
    root.attributes.revision,
    "revision",
    root,
    source,
    diagnostics,
  );
  const gameSystemRevision = parseOptionalInteger(
    root.attributes.gameSystemRevision,
    "gameSystemRevision",
    root,
    source,
    diagnostics,
  );
  const library = parseOptionalBoolean(
    root.attributes.library,
    "library",
    root,
    source,
    diagnostics,
  );
  const namespaceUri =
    root.attributes.xmlns ??
    root.attributes[`xmlns:${prefixOf(root.name)}`];
  const readme = directChildText(root, "readme");

  const metadata: BattleScribeRootMetadata = {
    kind,
    id: objectId(id),
    name,
    attributes: root.attributes,
    ...(revision === undefined ? {} : { revision }),
    ...(root.attributes.battleScribeVersion === undefined
      ? {}
      : { battleScribeVersion: root.attributes.battleScribeVersion }),
    ...(root.attributes.authorName === undefined
      ? {}
      : { authorName: root.attributes.authorName }),
    ...(root.attributes.authorContact === undefined
      ? {}
      : { authorContact: root.attributes.authorContact }),
    ...(root.attributes.authorUrl === undefined
      ? {}
      : { authorUrl: root.attributes.authorUrl }),
    ...(root.attributes.type === undefined
      ? {}
      : { type: root.attributes.type }),
    ...(readme === undefined ? {} : { readme }),
    ...(root.attributes.gameSystemId === undefined
      ? {}
      : { gameSystemId: objectId(root.attributes.gameSystemId) }),
    ...(gameSystemRevision === undefined ? {} : { gameSystemRevision }),
    ...(library === undefined ? {} : { library }),
    ...(namespaceUri === undefined ? {} : { namespaceUri }),
  };
  return success(metadata, diagnostics);
}

function directChildText(
  root: OrderedXmlElement,
  expectedName: string,
): string | undefined {
  const child = root.children.find(
    (node): node is OrderedXmlElement =>
      node.kind === "element" && localName(node.name) === expectedName,
  );
  if (child === undefined) {
    return undefined;
  }
  return child.children
    .filter((node) => node.kind === "text")
    .map((node) => node.value)
    .join("");
}

function diagnostic(
  code: string,
  message: string,
  source: SourceFileProvenance,
  impacts: Diagnostic["impacts"],
  details?: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts,
    location: { source },
    ...(details === undefined ? {} : { details }),
  };
}

function jsonRootDiagnostic(
  code: string,
  message: string,
  source: SourceFileProvenance,
  range: OrderedJsonObject["range"],
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts: ["parsing", "compatibility"],
    location: {
      source,
      start: range.start,
      end: range.end,
    },
  };
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function localName(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? name : name.slice(colon + 1);
}

function prefixOf(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? "" : name.slice(0, colon);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function commentValue(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0];
    if (isRecord(first) && first["#text"] !== undefined) {
      return String(first["#text"]);
    }
  }
  return String(value);
}

function parseOptionalInteger(
  value: string | undefined,
  attribute: string,
  root: OrderedXmlElement,
  source: SourceFileProvenance,
  diagnostics: Diagnostic[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    diagnostics.push(invalidMetadataAttribute(attribute, value, "integer", root, source));
    return undefined;
  }
  return Number.parseInt(value, 10);
}

function parseOptionalBoolean(
  value: string | undefined,
  attribute: string,
  root: OrderedXmlElement,
  source: SourceFileProvenance,
  diagnostics: Diagnostic[],
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  diagnostics.push(invalidMetadataAttribute(attribute, value, "Boolean", root, source));
  return undefined;
}

function invalidMetadataAttribute(
  attribute: string,
  value: string,
  expectedType: string,
  root: OrderedXmlElement,
  source: SourceFileProvenance,
): Diagnostic {
  const range =
    root.jsonSource?.kind === "object"
      ? root.jsonSource.entries.find(
          (entry) => entry.name === attribute,
        )?.value.range
      : undefined;
  return {
    code: "BS_PROJECTION_INVALID_ATTRIBUTE",
    message: `Invalid ${expectedType} value "${value}" for ${attribute}.`,
    severity: "error",
    impacts: ["parsing", "compatibility"],
    location: {
      source,
      path: [localName(root.name), `@${attribute}`],
      ...(range === undefined
        ? {}
        : { start: range.start, end: range.end }),
    },
    details: { attribute, expectedType, value },
  };
}

function isSafeArchivePath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return (
    normalized !== "" &&
    !normalized.startsWith("/") &&
    !/^[A-Za-z]:\//u.test(normalized) &&
    !normalized.split("/").includes("..")
  );
}

function isSafeArchiveEntry(entry: JSZip.JSZipObject): boolean {
  const unsafeOriginalName = (
    entry as JSZip.JSZipObject & { readonly unsafeOriginalName?: string }
  ).unsafeOriginalName;
  return (
    isSafeArchivePath(entry.name) &&
    (unsafeOriginalName === undefined || isSafeArchivePath(unsafeOriginalName))
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
