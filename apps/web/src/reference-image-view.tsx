// Trusted raster leaves receive admitted scalar data only, never source graphs.
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { decodeReferenceImage, REFERENCE_IMAGE_LIMITS, type AdmittedReferenceImage, type ReferenceContent } from "./reference-images.js";

export const PreparedReferenceImages = createContext<ReadonlyMap<string, string | undefined> | undefined>(undefined);
// This mounted-reader budget is deliberately shared across stacked dialogs.
// Closing a reader returns its reservation; no durable army data is involved.
const mounted = { count: 0, bytes: 0 };

/** Display one already admitted span. Export supplies frozen decode outcomes;
 * the live reader prepares only mounted images and cancels on replacement. */
export function ReferenceImageView({ part }: { readonly part: Extract<ReferenceContent, { kind: "image" }> }) {
  const prepared = useContext(PreparedReferenceImages);
  const [outcome, setOutcome] = useState<{ uri: string; reason?: string }>();
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const image = part.image;
  useEffect(() => {
    if (!image || prepared) return;
    if (mounted.count >= REFERENCE_IMAGE_LIMITS.count || mounted.bytes + image.bytes > REFERENCE_IMAGE_LIMITS.totalBytes) {
      setOutcome({ uri: image.uri, reason: "Open-reference image limit exceeded. Close another reference and reopen this one." }); return;
    }
    mounted.count++; mounted.bytes += image.bytes;
    const controller = new AbortController();
    void decodeReferenceImage(image, controller.signal).then(reason => {
      if (!controller.signal.aborted) setOutcome({ uri: image.uri, ...(reason ? { reason } : {}) });
    });
    return () => { controller.abort(); mounted.count--; mounted.bytes -= image.bytes; };
  }, [image, prepared]);
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
  }, [expanded]);
  const close = () => { dialog.current?.close(); setExpanded(false); trigger.current?.focus(); };
  const reason = part.reason ?? (image && prepared ? prepared.has(image.uri) ? prepared.get(image.uri) : "Image has not been prepared." : outcome?.uri === image?.uri ? outcome?.reason : undefined);
  const ready = image && (prepared ? prepared.has(image.uri) : outcome?.uri === image.uri) && !reason;
  const raster = (value: AdmittedReferenceImage) => <img src={value.uri} width={value.width} height={value.height} alt={part.caption} onError={() => setOutcome({ uri: value.uri, reason: "Image could not be displayed." })} />;
  return <figure className="reference-image">
    {ready ? raster(image) : <p className="reference-image-unavailable">{part.caption}: {reason ?? "Preparing image…"}</p>}
    <figcaption>{part.caption}</figcaption>
    {ready && !prepared && <button type="button" ref={trigger} onClick={() => setExpanded(true)}>Enlarge {part.caption}</button>}
    {expanded && ready && <dialog className="reference-image-dialog" ref={dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }} onKeyDown={event => event.stopPropagation()}>
      <header><h3 id={id}>{part.caption}</h3><button type="button" onClick={close}>Close</button></header>
      <div className="reference-image-scroll" tabIndex={0} aria-label="Full size diagram, scroll to inspect">{raster(image)}</div>
    </dialog>}
  </figure>;
}
