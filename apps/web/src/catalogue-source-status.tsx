// Small source-neutral disclosure shared by setup and the loaded army. No print path.
import { useCatalogueDataFreshness, type CatalogueDataFreshnessOptions, type CatalogueSourceContext, type RepositorySnapshotObservation } from "./catalogue-data-freshness.js";
import { formatTimestamp } from "./ui-format.js";

/** Reports only the recorded source identity and a time-bounded repository observation. */
export function CatalogueSourceStatus({context, options}: {readonly context: CatalogueSourceContext | undefined; readonly options?: CatalogueDataFreshnessOptions | undefined}) {
  const {freshness, check} = useCatalogueDataFreshness(context, options);
  if (!context) return null;
  const observation = freshness.kind === "matches" || freshness.kind === "differs" ? freshness : undefined;
  const prior = "previous" in freshness ? freshness.previous : undefined;
  return <section className="catalogue-data-freshness" aria-label="Catalogue source" data-freshness={freshness.kind}>
    <div><strong>Source: {context.source ? `${context.source.owner}/${context.source.repository}` : "Local import or no recorded source"}</strong></div>
    {freshness.kind === "unestablished" && <p>{context.reason}</p>}
    {freshness.kind === "not-checked" && <p>Recorded source revision identified; repository snapshot not checked.</p>}
    {freshness.kind === "checking" && <p role="status">Checking this source…</p>}
    {freshness.kind === "unavailable" && <p>Check unavailable. {freshness.reason} {freshness.attemptedAt && <>Attempted {timestamp(freshness.attemptedAt)}.</>}</p>}
    {observation && <p>{observationText(observation)}</p>}
    {prior && <p>Previous check: {observationText(prior)}</p>}
    {context.eligible && <button type="button" disabled={freshness.kind === "checking"} onClick={check}>{freshness.kind === "unavailable" ? "Retry source check" : "Check source"}</button>}
    <details className="catalogue-import-details"><summary>Source details</summary>
      <p>Catalogue: {context.catalogueName}. Imported {timestamp(context.importedAt)}; this is an acquisition date, not a data version.</p>
      {context.source && <p>Recorded loaded revision: <code>{context.source.revision}</code></p>}
      {context.configuredRevision && <p>Configured Browse pin: <code>{context.configuredRevision}</code>. Reopening does not change the loaded revision.</p>}
      {observation && <p>Checked repository default-branch snapshot: <code>{observation.revision}</code>.</p>}
      <p>Selected dependency context: {context.files.length} files. Recorded provenance does not certify publisher rules or evaluator support. Checks do not revalidate saved file contents.</p>
      <ul>{context.files.map((file,i)=><li key={`${i}:${file}`}>{file}</li>)}</ul>
    </details>
  </section>;
}
function observationText(o: RepositorySnapshotObservation): string {
  return o.kind === "matches" ? `Recorded source revision matches the checked repository snapshot as of ${timestamp(o.checkedAt)}.` : `Repository snapshot differs as of ${timestamp(o.checkedAt)}; selected-file impact and revision chronology are not established.`;
}
function timestamp(value:string):string { return Number.isFinite(Date.parse(value)) ? formatTimestamp(value) : "unknown time"; }
