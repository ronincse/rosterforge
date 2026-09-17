// Print setup receives only a frozen scalar snapshot, not the live source graph.
// Preview and download use identical HTML; printing does not save or edit an army.
import { useEffect, useMemo, useRef, useState } from "react";
import { renderRosterPrintDocument, type RosterPrintViewModel } from "./roster-print.js";
import type { ArmyReferenceLayout } from "./army-reference-html.js";

/** Present a read-only snapshot with two page-flow choices. Native dialog owns
 * modal focus/inertness; closing returns to the roster action that opened it. */
export function RosterPrintDialog({ model, onPrint, onClose }: { readonly model: RosterPrintViewModel; readonly onPrint: (model: RosterPrintViewModel) => boolean; readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [layout, setLayout] = useState<ArmyReferenceLayout>("compact");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const snapshot = useMemo(() => ({ ...model, layout }), [model, layout]);
  const html = useMemo(() => {
    try { return { text: renderRosterPrintDocument(snapshot) }; }
    catch { return { error: "The reference could not be generated. Close this window and try again; your army has not changed." }; }
  }, [snapshot]);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute("open", "");
    return () => { if (dialog?.open && dialog.close) dialog.close(); };
  }, []);
  const save = () => {
    if (!html.text) return;
    try {
      const url = URL.createObjectURL(new Blob([html.text], { type: "text/html;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      // Player names never become paths or Windows reserved characters.
      anchor.download = `forcewright-${model.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0,80) || "army"}-${layout}.html`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setError("HTML download could not start. Your army has not changed; try again."); }
  };
  return <dialog ref={ref} className="army-print-dialog" aria-labelledby="army-print-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><div><p>Army reference</p><h2 id="army-print-title">Print & export</h2></div><button type="button" onClick={onClose}>Close</button></header>
    <div className="army-print-controls"><label>Layout <select value={layout} onChange={e => { if (e.target.value !== layout) { setReady(false); setLayout(e.target.value as ArmyReferenceLayout); } }}><option value="compact">Compact reference</option><option value="sheets">Unit sheets</option></select></label>
      <button type="button" disabled={!ready || !html.text} onClick={() => setError(onPrint(snapshot) ? "" : "The browser blocked the printable roster window or could not open it. Allow popups for this local page and try again.")}>Print / Save PDF</button>
      <button type="button" disabled={!html.text} onClick={save}>Save HTML</button></div>
    <p>Current army snapshot, including unsaved changes. Choose A4 or Letter, portrait, 100% scale in your browser. Turn off browser headers and footers to omit its URL and date.</p>
    <p>{layout === "compact" ? "Compact reference flows unit blocks together." : "Unit sheets starts each unit on a new page; long units continue without shrinking."} HTML works offline without ForceWright.</p>
    {(html.error || error) && <p role="alert">{html.error || error}</p>}
    {html.text && <iframe title="Printable army preview" sandbox="allow-same-origin" srcDoc={html.text} onLoad={event => {
      // Scripts remain forbidden by sandbox and document CSP. Same-origin
      // access lets the parent keep fragment links inside this srcdoc instead
      // of navigating to the application's inherited base URL. The listener
      // belongs to this document and disappears when its snapshot is replaced.
      const previewDocument = event.currentTarget.contentDocument;
      previewDocument?.addEventListener("click", click => {
        const target = click.target as Element | null;
        const href = target?.closest?.("a")?.getAttribute("href");
        if (!href?.startsWith("#")) return;
        click.preventDefault();
        previewDocument.getElementById(href.slice(1))?.scrollIntoView();
      });
      setReady(true);
    }} />}
  </dialog>;
}
