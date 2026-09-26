// Ephemeral image preparation over the selected scalar print snapshot. No
// catalogue traversal, persistence, entity decoding or moving source requests.
import type { ArmyReferenceDocument } from "./army-reference-model.js";
import { decodeReferenceImage, referenceContent, type ReferenceContent } from "./reference-images.js";

export interface PreparedArmyImages {
  readonly content: ReadonlyMap<string, readonly ReferenceContent[]>;
  readonly outcomes: ReadonlyMap<string, string | undefined>;
}

/** Admit every selected occurrence against one document budget, then decode
 * unique payloads once. The caller owns cancellation and retains the result
 * across layout changes. Duplicate bytes never merge caption or ownership. */
export async function prepareArmyReferenceImages(doc: ArmyReferenceDocument, signal?: AbortSignal): Promise<PreparedArmyImages> {
  const content = new Map<string, readonly ReferenceContent[]>();
  const outcomes = new Map<string, string | undefined>();
  const budget = { count: 0, bytes: 0 };
  const texts = [...doc.units.flatMap(unit => unit.profiles.flatMap(profile => profile.fields.map(field => field.value))), ...doc.glossary.map(rule => rule.text)];
  for (const text of texts) {
    const parts = referenceContent(text, budget);
    // Identical fields share parsing results only while every occurrence fits.
    // If a later duplicate exceeds the budget, conservatively reject that
    // payload at all identical fields rather than bypassing occurrence limits.
    const previous = content.get(text);
    if (!previous?.some(part => part.kind === "image" && part.reason)) content.set(text, parts);
  }
  for (const parts of content.values()) for (const part of parts) {
    if (signal?.aborted) return { content, outcomes };
    if (part.kind === "image" && part.image && !outcomes.has(part.image.uri)) outcomes.set(part.image.uri, await decodeReferenceImage(part.image, signal));
  }
  return { content, outcomes };
}

/** Wait on the actual document's images, not its load event. Failures replace
 * the image with escaped text before printing; a closed/changed preview can
 * abort without committing readiness to its replacement. */
export async function settleReferenceDocumentImages(doc: Document, signal?: AbortSignal): Promise<void> {
  const images = [...doc.querySelectorAll<HTMLImageElement>("figure.reference-image img")];
  await Promise.all(images.map(async image => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      await Promise.race([
        image.decode(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 8_000);
          abort = () => reject(new Error("cancelled"));
          signal?.addEventListener("abort", abort, { once: true });
          if (signal?.aborted) abort();
        }),
      ]);
    } catch {
      if (!signal?.aborted) {
        const placeholder = doc.createElement("p");
        placeholder.className = "reference-image-unavailable";
        placeholder.textContent = `${image.alt || "Source diagram"}: Image could not be displayed in this document.`;
        image.replaceWith(placeholder);
      }
    } finally { clearTimeout(timer); if (abort) signal?.removeEventListener("abort", abort); }
  }));
}
