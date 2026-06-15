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
  type OrderedXmlAttributes,
  type OrderedXmlElement,
  type OrderedXmlNode,
  type ParsedBattleScribeDocument,
} from "./types.js";

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

  const documentNodes = convertOrderedNodes(parsed);
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

  return success({
    source,
    sourceBytes: input.slice(),
    documentSource: source,
    documentBytes: input.slice(),
    root,
    metadata: metadataResult.value,
  });
}

function convertOrderedNodes(value: unknown): readonly OrderedXmlNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const nodes: OrderedXmlNode[] = [];
  for (const rawNode of value) {
    if (!isRecord(rawNode)) {
      continue;
    }

    const attributes = parseAttributes(rawNode[":@"]);
    for (const [name, childValue] of Object.entries(rawNode)) {
      if (name === ":@") {
        continue;
      }
      if (name === "#text") {
        nodes.push({ kind: "text", value: String(childValue) });
        continue;
      }
      if (name === "#comment") {
        nodes.push({ kind: "comment", value: commentValue(childValue) });
        continue;
      }
      nodes.push({
        kind: "element",
        name,
        attributes,
        children: convertOrderedNodes(childValue),
      });
    }
  }
  return nodes;
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
  const revision = parseOptionalInteger(root.attributes.revision);
  const gameSystemRevision = parseOptionalInteger(
    root.attributes.gameSystemRevision,
  );
  const namespaceUri =
    root.attributes.xmlns ??
    root.attributes[`xmlns:${prefixOf(root.name)}`];

  const metadata: BattleScribeRootMetadata = {
    kind,
    id: objectId(id),
    name,
    attributes: root.attributes,
    ...(revision === undefined ? {} : { revision }),
    ...(root.attributes.battleScribeVersion === undefined
      ? {}
      : { battleScribeVersion: root.attributes.battleScribeVersion }),
    ...(root.attributes.gameSystemId === undefined
      ? {}
      : { gameSystemId: objectId(root.attributes.gameSystemId) }),
    ...(gameSystemRevision === undefined ? {} : { gameSystemRevision }),
    ...(root.attributes.library === undefined
      ? {}
      : { library: root.attributes.library === "true" }),
    ...(namespaceUri === undefined ? {} : { namespaceUri }),
  };
  return success(metadata);
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

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/u.test(value)) {
    return undefined;
  }
  return Number.parseInt(value, 10);
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
