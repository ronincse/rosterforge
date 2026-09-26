// Display-only image interpretation over already parsed source prose. This is
// deliberately not a Markdown engine or image codec; original bytes stay upstream.
export const REFERENCE_IMAGE_LIMITS = {
  encoded: 350_000, bytes: 256_000, dimension: 2048, pixels: 4_000_000,
  count: 32, totalBytes: 4_000_000, timeoutMs: 8_000,
} as const;
export interface ReferenceImageBudget { count: number; bytes: number }
export interface AdmittedReferenceImage { readonly uri: string; readonly bytes: number; readonly width: number; readonly height: number }
export type ReferenceContent = { readonly kind: "text"; readonly text: string }
  | { readonly kind: "image"; readonly caption: string; readonly image?: AdmittedReferenceImage; readonly reason?: string };

/** Header admission is not successful decoding. Only baseline/progressive,
 * 8-bit JPEG is supported; platform decoding must succeed before display. */
export function admitReferenceImage(uri: string): AdmittedReferenceImage | string {
  if (!uri.startsWith("data:image/jpeg;base64,")) return "Only embedded JPEG images are supported.";
  const encoded = uri.slice(23);
  if (encoded.length > REFERENCE_IMAGE_LIMITS.encoded) return "Encoded image exceeds the size limit.";
  if (!encoded.length || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return "Invalid image encoding.";
  const bytes = encoded.length / 4 * 3 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  if (bytes > REFERENCE_IMAGE_LIMITS.bytes) return "Image exceeds the byte limit.";
  let data: string;
  try { data = atob(encoded); if (btoa(data) !== encoded) return "Invalid image encoding."; }
  catch { return "Invalid image encoding."; }
  const byte = (n: number) => data.charCodeAt(n);
  const word = (n: number) => byte(n) * 256 + byte(n + 1);
  if (word(0) !== 0xffd8 || word(data.length - 2) !== 0xffd9) return "JPEG signature or end marker is missing.";
  let width = 0, height = 0;
  for (let p = 2; p < data.length - 2;) {
    if (byte(p++) !== 255) return "Malformed JPEG header.";
    while (byte(p) === 255) p++;
    const marker = byte(p++);
    const length = word(p);
    if (length < 2 || !Number.isFinite(length) || p + length > data.length - 2) return "Truncated JPEG header.";
    if (marker === 0xda) return width && height ? { uri, bytes, width, height } : "JPEG dimensions are missing.";
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (![0xc0, 0xc2].includes(marker) || length < 8 || byte(p + 2) !== 8 || width) return "Unsupported JPEG frame.";
      height = word(p + 3); width = word(p + 5);
      if (!width || !height || width > REFERENCE_IMAGE_LIMITS.dimension || height > REFERENCE_IMAGE_LIMITS.dimension || width * height > REFERENCE_IMAGE_LIMITS.pixels) return "Image dimensions exceed the supported limits.";
    }
    p += length;
  }
  return "Incomplete JPEG image.";
}

/** Recognize explicit ![caption](URI) in source prose, excluding escaped and
 * backtick-code spans. Consume only the image's line on malformed syntax, so
 * payloads stay out of text/lookup without swallowing later instructions.
 * Allocation is per span, never per encoded character; no entity decoding. */
export function referenceContent(text: string, budget: ReferenceImageBudget = { count: 0, bytes: 0 }): readonly ReferenceContent[] {
  const result: ReferenceContent[] = [];
  let start = 0, code = 0, tildeFence = 0, overflowShown = false;
  let boundary = text.indexOf("\n");
  if (boundary < 0) boundary = text.length;
  const prose = (value: string) => {
    if (!value) return;
    const last = result.at(-1);
    if (last?.kind === "text") result[result.length - 1] = { kind: "text", text: last.text + value };
    else result.push({ kind: "text", text: value });
  };
  for (let i = 0; i < text.length;) {
    if (i >= boundary) { const next = text.indexOf("\n", i + 1); boundary = next < 0 ? text.length : next; }
    if (i === 0 || text[i - 1] === "\n") {
      const linePrefix = text.slice(i, Math.min(boundary, i + 520));
      const fence = /^ {0,3}(~{3,})/.exec(linePrefix)?.[1]?.length;
      if (fence) { tildeFence = tildeFence ? fence >= tildeFence ? 0 : tildeFence : fence; i = boundary + 1; continue; }
      if (tildeFence || /^(?: {4}|\t)/.test(linePrefix)) { i = boundary + 1; continue; }
    }
    if (text[i] === "\\") { i += 2; continue; }
    if (text[i] === "`") {
      let end = i + 1; while (text[end] === "`") end++;
      const ticks = end - i;
      if (!code) code = ticks; else if (code === ticks) code = 0;
      i = end; continue;
    }
    if (code || text[i] !== "!" || text[i + 1] !== "[") { i++; continue; }
    // Caption lookahead is constant-bounded even for a long malformed line
    // containing thousands of unmatched openers. Line boundaries advance once.
    const captionOffset = text.slice(i + 2, Math.min(boundary, i + 514)).indexOf("](");
    if (captionOffset < 0) { i += 2; continue; }
    const captionEnd = i + 2 + captionOffset;
    const closeOffset = text.slice(captionEnd + 2, boundary).indexOf(")");
    const close = closeOffset < 0 ? -1 : captionEnd + 2 + closeOffset;
    const end = close < 0 || close >= boundary ? boundary : close + 1;
    prose(text.slice(start, i));
    const caption = text.slice(i + 2, captionEnd).trim() || "Source diagram";
    budget.count++;
    if (budget.count > REFERENCE_IMAGE_LIMITS.count) {
      if (!overflowShown) result.push({ kind: "image", caption, reason: "Reference image count limit exceeded; this and further images are unavailable." });
      else prose("\n");
      overflowShown = true; start = end; i = end; continue;
    }
    const admitted = end === boundary && (close < 0 || close >= boundary) ? "Image syntax is incomplete."
      : budget.count > REFERENCE_IMAGE_LIMITS.count ? "Reference image count limit exceeded."
      : admitReferenceImage(text.slice(captionEnd + 2, end - 1));
    if (typeof admitted === "string") result.push({ kind: "image", caption, reason: admitted });
    else if (budget.bytes + admitted.bytes > REFERENCE_IMAGE_LIMITS.totalBytes) result.push({ kind: "image", caption, reason: "Reference image byte limit exceeded." });
    else { budget.bytes += admitted.bytes; result.push({ kind: "image", caption, image: admitted }); }
    start = end; i = end;
  }
  prose(text.slice(start));
  return result;
}

/** Visible prose only: neither admitted nor rejected payloads enter glossary
 * matching. A separator prevents a false phrase across an image boundary. */
export function referenceProse(text: string): string {
  return referenceContent(text).map(part => part.kind === "text" ? part.text : "\n").join("");
}

/** Decode one admitted raster with a bounded lifetime. No remote URL can reach
 * this boundary. Abort releases the temporary element; late completions are inert. */
export function decodeReferenceImage(image: AdmittedReferenceImage, signal?: AbortSignal): Promise<string | undefined> {
  return new Promise(resolve => {
    if (signal?.aborted) { resolve("Image preparation cancelled."); return; }
    const element = new Image();
    let done = false;
    const finish = (reason?: string) => {
      if (done) return;
      done = true; clearTimeout(timer); signal?.removeEventListener("abort", abort);
      element.removeAttribute("src"); resolve(reason);
    };
    const abort = () => finish("Image preparation cancelled.");
    const timer = setTimeout(() => finish("Image decoding timed out."), REFERENCE_IMAGE_LIMITS.timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    element.src = image.uri;
    try { void element.decode().then(() => finish(element.naturalWidth === image.width && element.naturalHeight === image.height ? undefined : "Decoded image dimensions differ from its header."), () => finish("Image could not be decoded.")); }
    catch { finish("Image decoding is unavailable."); }
  });
}
