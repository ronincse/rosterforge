import type {
  IngestionLimits,
  JsonSourcePosition,
  JsonSourceRange,
  OrderedJsonArray,
  OrderedJsonBoolean,
  OrderedJsonNull,
  OrderedJsonNumber,
  OrderedJsonObject,
  OrderedJsonProperty,
  OrderedJsonString,
  OrderedJsonValue,
  OrderedXmlAttributes,
  OrderedXmlElement,
  OrderedXmlNode,
} from "./types.js";

export type OrderedJsonParseResult =
  | {
      readonly ok: true;
      readonly value: OrderedJsonValue;
    }
  | {
      readonly ok: false;
      readonly kind: "syntax";
      readonly message: string;
      readonly range: JsonSourceRange;
    }
  | {
      readonly ok: false;
      readonly kind: "limit";
      readonly limit: "maxJsonDepth" | "maxJsonNodes";
      readonly configuredLimit: number;
      readonly observed: number;
      readonly range: JsonSourceRange;
    };

export function parseOrderedJson(
  text: string,
  limits: IngestionLimits,
): OrderedJsonParseResult {
  try {
    return { ok: true, value: new OrderedJsonParser(text, limits).parse() };
  } catch (error: unknown) {
    if (error instanceof JsonLimitError) {
      return {
        ok: false,
        kind: "limit",
        limit: error.limit,
        configuredLimit: error.configuredLimit,
        observed: error.observed,
        range: error.range,
      };
    }
    if (error instanceof JsonSyntaxError) {
      return {
        ok: false,
        kind: "syntax",
        message: error.message,
        range: error.range,
      };
    }
    throw error;
  }
}

export function jsonObjectProperty(
  object: OrderedJsonObject,
  name: string,
): OrderedJsonProperty | undefined {
  return object.entries.find((entry) => entry.name === name);
}

export function jsonObjectProperties(
  object: OrderedJsonObject,
  name: string,
): readonly OrderedJsonProperty[] {
  return object.entries.filter((entry) => entry.name === name);
}

export function battleScribeElementFromJson(
  name: string,
  object: OrderedJsonObject,
): OrderedXmlElement {
  return convertObject(name, object);
}

const textChildProperties = new Set(["description", "readme"]);

const collectionItemNames: Readonly<Record<string, string>> = {
  catalogueLinks: "catalogueLink",
  categoryEntries: "categoryEntry",
  categoryLinks: "categoryLink",
  characteristics: "characteristic",
  characteristicTypes: "characteristicType",
  conditionGroups: "conditionGroup",
  conditions: "condition",
  constraints: "constraint",
  costs: "cost",
  costTypes: "costType",
  entryLinks: "entryLink",
  forceEntries: "forceEntry",
  infoGroups: "infoGroup",
  infoLinks: "infoLink",
  localConditionGroups: "localConditionGroup",
  modifierGroups: "modifierGroup",
  modifiers: "modifier",
  profiles: "profile",
  profileTypes: "profileType",
  publicationLinks: "publicationLink",
  publications: "publication",
  repeats: "repeat",
  rules: "rule",
  selectionEntries: "selectionEntry",
  selectionEntryGroups: "selectionEntryGroup",
  sharedProfiles: "profile",
  sharedInfoGroups: "infoGroup",
  sharedRules: "rule",
  sharedSelectionEntries: "selectionEntry",
  sharedSelectionEntryGroups: "selectionEntryGroup",
};

function convertObject(
  name: string,
  source: OrderedJsonObject,
): OrderedXmlElement {
  const attributes: Record<string, string> = {};
  const children: OrderedXmlNode[] = [];

  for (const property of source.entries) {
    if (property.name === "$text") {
      const text = jsonPrimitiveText(property.value);
      if (text !== undefined) {
        children.push({ kind: "text", value: text });
      }
      continue;
    }

    if (textChildProperties.has(property.name)) {
      const text = jsonPrimitiveText(property.value);
      if (text !== undefined) {
        children.push({
          kind: "element",
          name: property.name,
          attributes: {},
          children: [{ kind: "text", value: text }],
          jsonSource: property.value,
        });
        continue;
      }
    }

    if (property.value.kind === "array") {
      children.push(convertArrayContainer(property.name, property.value));
      continue;
    }
    if (property.value.kind === "object") {
      children.push(convertObject(property.name, property.value));
      continue;
    }

    const attribute = jsonPrimitiveAttribute(property.value);
    if (attribute !== undefined) {
      attributes[property.name] = attribute;
    }
  }

  return {
    kind: "element",
    name,
    attributes: attributes as OrderedXmlAttributes,
    children,
    jsonSource: source,
  };
}

function convertArrayContainer(
  name: string,
  source: OrderedJsonArray,
): OrderedXmlElement {
  const itemName = collectionItemNames[name] ?? singularName(name);
  return {
    kind: "element",
    name,
    attributes: {},
    children: source.items.map((item) => convertArrayItem(itemName, item)),
    jsonSource: source,
  };
}

function convertArrayItem(
  name: string,
  source: OrderedJsonValue,
): OrderedXmlElement {
  if (source.kind === "object") {
    return convertObject(name, source);
  }
  const text = jsonPrimitiveText(source);
  return {
    kind: "element",
    name,
    attributes: {},
    children: text === undefined ? [] : [{ kind: "text", value: text }],
    jsonSource: source,
  };
}

function jsonPrimitiveAttribute(value: OrderedJsonValue): string | undefined {
  switch (value.kind) {
    case "string":
      return value.value;
    case "number":
      return value.raw;
    case "boolean":
      return value.value ? "true" : "false";
    case "null":
    case "array":
    case "object":
      return undefined;
  }
}

function jsonPrimitiveText(value: OrderedJsonValue): string | undefined {
  return jsonPrimitiveAttribute(value);
}

function singularName(name: string): string {
  if (name.endsWith("ies")) {
    return `${name.slice(0, -3)}y`;
  }
  if (name.endsWith("s")) {
    return name.slice(0, -1);
  }
  return "item";
}

class OrderedJsonParser {
  private index = 0;
  private line = 1;
  private column = 1;
  private nodeCount = 0;

  public constructor(
    private readonly text: string,
    private readonly limits: IngestionLimits,
  ) {}

  public parse(): OrderedJsonValue {
    this.skipWhitespace();
    const value = this.parseValue(1);
    this.skipWhitespace();
    if (this.index !== this.text.length) {
      this.fail("Unexpected content after the JSON value.");
    }
    return value;
  }

  private parseValue(depth: number): OrderedJsonValue {
    const start = this.position();
    this.reserveNode(depth, start);
    const current = this.peek();
    switch (current) {
      case "{":
        return this.parseObject(start, depth);
      case "[":
        return this.parseArray(start, depth);
      case '"':
        return this.parseString(start);
      case "t":
        return this.parseBoolean(start, true);
      case "f":
        return this.parseBoolean(start, false);
      case "n":
        return this.parseNull(start);
      default:
        if (current === "-" || isDigit(current)) {
          return this.parseNumber(start);
        }
        this.fail("Expected a JSON value.", start);
    }
  }

  private parseObject(
    start: JsonSourcePosition,
    depth: number,
  ): OrderedJsonObject {
    this.advance();
    this.skipWhitespace();
    const entries: OrderedJsonProperty[] = [];
    if (this.peek() === "}") {
      this.advance();
      return { kind: "object", entries, range: this.range(start) };
    }

    while (true) {
      if (this.peek() !== '"') {
        this.fail("Expected a quoted object property name.");
      }
      const nameStart = this.position();
      const name = this.parseStringToken(nameStart);
      this.skipWhitespace();
      if (this.peek() !== ":") {
        this.fail('Expected ":" after the object property name.');
      }
      this.advance();
      this.skipWhitespace();
      entries.push({
        name: name.value,
        nameRange: name.range,
        value: this.parseValue(depth + 1),
      });
      this.skipWhitespace();
      if (this.peek() === "}") {
        this.advance();
        break;
      }
      if (this.peek() !== ",") {
        this.fail('Expected "," or "}" after the object property value.');
      }
      this.advance();
      this.skipWhitespace();
    }

    return { kind: "object", entries, range: this.range(start) };
  }

  private parseArray(
    start: JsonSourcePosition,
    depth: number,
  ): OrderedJsonArray {
    this.advance();
    this.skipWhitespace();
    const items: OrderedJsonValue[] = [];
    if (this.peek() === "]") {
      this.advance();
      return { kind: "array", items, range: this.range(start) };
    }

    while (true) {
      items.push(this.parseValue(depth + 1));
      this.skipWhitespace();
      if (this.peek() === "]") {
        this.advance();
        break;
      }
      if (this.peek() !== ",") {
        this.fail('Expected "," or "]" after the array item.');
      }
      this.advance();
      this.skipWhitespace();
    }

    return { kind: "array", items, range: this.range(start) };
  }

  private parseString(start: JsonSourcePosition): OrderedJsonString {
    return this.parseStringToken(start);
  }

  private parseStringToken(start: JsonSourcePosition): OrderedJsonString {
    const startOffset = this.index;
    this.advance();
    while (this.index < this.text.length) {
      const current = this.peek();
      if (current === '"') {
        this.advance();
        const raw = this.text.slice(startOffset, this.index);
        let value: unknown;
        try {
          value = JSON.parse(raw);
        } catch {
          this.fail("Invalid JSON string escape.", start);
        }
        if (typeof value !== "string") {
          this.fail("Invalid JSON string.", start);
        }
        return { kind: "string", value, range: this.range(start) };
      }
      if (current === "\\") {
        this.advance();
        const escaped = this.peek();
        if (!'"\\/bfnrtu'.includes(escaped)) {
          this.fail("Invalid JSON string escape.");
        }
        this.advance();
        if (escaped === "u") {
          for (let index = 0; index < 4; index += 1) {
            if (!isHexDigit(this.peek())) {
              this.fail("Invalid Unicode escape in JSON string.");
            }
            this.advance();
          }
        }
        continue;
      }
      if (current.charCodeAt(0) < 0x20) {
        this.fail("Unescaped control character in JSON string.");
      }
      this.advance();
    }
    this.fail("Unterminated JSON string.", start);
  }

  private parseNumber(start: JsonSourcePosition): OrderedJsonNumber {
    const match =
      /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(
        this.text.slice(this.index),
      );
    const raw = match?.[0];
    if (raw === undefined) {
      this.fail("Invalid JSON number.", start);
    }
    for (let index = 0; index < raw.length; index += 1) {
      this.advance();
    }
    return {
      kind: "number",
      value: Number(raw),
      raw,
      range: this.range(start),
    };
  }

  private parseBoolean(
    start: JsonSourcePosition,
    value: boolean,
  ): OrderedJsonBoolean {
    this.consumeLiteral(value ? "true" : "false", start);
    return { kind: "boolean", value, range: this.range(start) };
  }

  private parseNull(start: JsonSourcePosition): OrderedJsonNull {
    this.consumeLiteral("null", start);
    return { kind: "null", range: this.range(start) };
  }

  private consumeLiteral(
    literal: string,
    start: JsonSourcePosition,
  ): void {
    if (!this.text.startsWith(literal, this.index)) {
      this.fail(`Invalid JSON literal; expected ${literal}.`, start);
    }
    for (let index = 0; index < literal.length; index += 1) {
      this.advance();
    }
  }

  private reserveNode(depth: number, start: JsonSourcePosition): void {
    if (depth > this.limits.maxJsonDepth) {
      throw new JsonLimitError(
        "maxJsonDepth",
        this.limits.maxJsonDepth,
        depth,
        { start, end: this.position() },
      );
    }
    const observed = this.nodeCount + 1;
    if (observed > this.limits.maxJsonNodes) {
      throw new JsonLimitError(
        "maxJsonNodes",
        this.limits.maxJsonNodes,
        observed,
        { start, end: this.position() },
      );
    }
    this.nodeCount = observed;
  }

  private skipWhitespace(): void {
    while (this.peek() !== "" && " \t\r\n".includes(this.peek())) {
      this.advance();
    }
  }

  private peek(): string {
    return this.text[this.index] ?? "";
  }

  private advance(): void {
    const current = this.text[this.index];
    if (current === undefined) {
      return;
    }
    this.index += 1;
    if (current === "\r") {
      if (this.text[this.index] === "\n") {
        this.index += 1;
      }
      this.line += 1;
      this.column = 1;
      return;
    }
    if (current === "\n") {
      this.line += 1;
      this.column = 1;
      return;
    }
    this.column += 1;
  }

  private position(): JsonSourcePosition {
    return {
      offset: this.index,
      line: this.line,
      column: this.column,
    };
  }

  private range(start: JsonSourcePosition): JsonSourceRange {
    return { start, end: this.position() };
  }

  private fail(message: string, start = this.position()): never {
    throw new JsonSyntaxError(message, {
      start,
      end: this.position(),
    });
  }
}

class JsonSyntaxError extends Error {
  public constructor(
    message: string,
    public readonly range: JsonSourceRange,
  ) {
    super(message);
  }
}

class JsonLimitError extends Error {
  public constructor(
    public readonly limit: "maxJsonDepth" | "maxJsonNodes",
    public readonly configuredLimit: number,
    public readonly observed: number,
    public readonly range: JsonSourceRange,
  ) {
    super(`JSON exceeded ${limit}.`);
  }
}

function isDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

function isHexDigit(value: string): boolean {
  return /^[0-9A-Fa-f]$/u.test(value);
}
