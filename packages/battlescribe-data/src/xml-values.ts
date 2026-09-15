// XML-only value adapter after the existing parser separates lexical contexts.
// No document parsing, DTD expansion, HTML vocabulary, I/O, or recursive decoding.
const predefined: Readonly<Record<string, string>> = Object.freeze({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" });
// Resource policy, not XML grammar: even zero-padded references have bounded tokens.
const maxReferenceLength = 35;

/** A malformed/unsupported reference in one XML value, caught by ingestion. */
export class XmlReferenceError extends Error {
  constructor(readonly offset: number) {
    super("Invalid or unsupported XML character/entity reference.");
    this.name = "XmlReferenceError";
  }
}

/** Decode exactly one XML 1.0 reference layer from ordinary text/attributes.
 * Call only after lexical parsing; never on CDATA, comments, PI data, JSON, or
 * player text. Emitted ampersands are not scanned again. Output cannot expand
 * beyond input size; scans and allocations are linear in the input value.
 */
export function decodeXmlReferences(value: string): string {
  const first = value.indexOf("&");
  if (first < 0) return value;
  const parts: string[] = [];
  let start = 0;
  for (let amp = first; amp >= 0; amp = value.indexOf("&", start)) {
    parts.push(value.slice(start, amp));
    let end = amp + 1;
    while (end < value.length && end - amp <= maxReferenceLength && value[end] !== ";") end++;
    if (end >= value.length || end - amp > maxReferenceLength) throw new XmlReferenceError(amp);
    const token = value.slice(amp + 1, end);
    const named = Object.hasOwn(predefined, token) ? predefined[token] : undefined;
    if (named !== undefined) parts.push(named);
    else {
      const hex = token.startsWith("#x");
      const digits = token.slice(hex ? 2 : 1);
      if (!token.startsWith("#") || !(hex ? /^[0-9a-fA-F]+$/u : /^[0-9]+$/u).test(digits)) throw new XmlReferenceError(amp);
      // Validate before fromCodePoint: invalid numbers never throw RangeError or
      // silently become replacement characters. XML 1.0 Char production [2].
      const code = Number.parseInt(digits, hex ? 16 : 10);
      if (!(code === 9 || code === 10 || code === 13 ||
        (code >= 0x20 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff))) throw new XmlReferenceError(amp);
      parts.push(String.fromCodePoint(code));
    }
    start = end + 1;
  }
  parts.push(value.slice(start));
  return parts.join("");
}
