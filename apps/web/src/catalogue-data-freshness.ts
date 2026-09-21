// Read-only source observations. No roster, persistence or acquisition mutation.
import { useEffect, useRef, useState } from "react";
import { identifyPinnedGitHubProvenance, inspectGitHubRepositoryUpdate, type PinnedGitHubRepository, type RepositoryFetch } from "@rosterforge/repository";
import type { LocalCatalogueChoice } from "./catalogue-library.js";
import { defaultRemoteCatalogueSources } from "./remote-catalogue-source.js";

export interface CatalogueSourceContext {
  readonly key: string;
  readonly catalogueName: string;
  readonly importedAt: string;
  readonly source?: PinnedGitHubRepository;
  readonly configuredRevision?: string;
  readonly files: readonly string[];
  readonly eligible: boolean;
  readonly reason?: string;
}
export interface RepositorySnapshotObservation {
  readonly kind: "matches" | "differs";
  readonly checkedAt: string;
  readonly revision: string;
}
export type CatalogueDataFreshness =
  | { readonly kind: "unestablished" }
  | { readonly kind: "not-checked" }
  | { readonly kind: "checking"; readonly previous?: RepositorySnapshotObservation }
  | RepositorySnapshotObservation
  | { readonly kind: "unavailable"; readonly attemptedAt?: string; readonly reason: string; readonly previous?: RepositorySnapshotObservation };
export interface CatalogueDataFreshnessOptions {
  readonly fetch?: RepositoryFetch;
  readonly now?: () => string;
}

/** Uses only canonical retained download provenance in the selected dependency
 * closure. The configured pin is contextual metadata, never the loaded revision.
 * Closure follows game-system/catalogue-link edges, not individual entry links.
 * A mixed/unresolved document closure cannot borrow the selected file's repository claim.
 */
export function catalogueSourceContext(catalogue: LocalCatalogueChoice, sources = defaultRemoteCatalogueSources): CatalogueSourceContext {
  const { document, graph } = catalogue.context;
  const closure = graph.reachableDocumentsByDocument.get(document) ?? new Set([document]);
  const recorded = identifyPinnedGitHubProvenance(document.source)?.repository;
  const definition = recorded === undefined ? undefined : sources.find(s => s.repository.owner.toLowerCase() === recorded.owner.toLowerCase() && s.repository.repository.toLowerCase() === recorded.repository.toLowerCase());
  const same = [...closure].every(d => {
    const candidate = identifyPinnedGitHubProvenance(d.source)?.repository;
    return candidate !== undefined && recorded !== undefined && repositoryKey(candidate) === repositoryKey(recorded);
  });
  const unresolved = graph.references.some(r => closure.has(r.sourceDocument) && (r.kind === "catalogueLink" || r.kind === "catalogueGameSystem") && r.targets.length !== 1);
  const reason = recorded === undefined ? "Repository freshness cannot be established for this import."
    : definition === undefined ? "This recorded repository is not configured for freshness checks."
    : !same || unresolved ? "Repository freshness cannot be established for this catalogue's mixed or incomplete source context."
    : undefined;
  return {
    key: JSON.stringify([catalogue.key, [...closure].map(d => d.source.sourceId).sort()]),
    catalogueName: catalogue.name, importedAt: document.source.importedAt,
    ...(recorded === undefined ? {} : {source:recorded}),
    ...(definition === undefined ? {} : {configuredRevision:definition.repository.revision}),
    files: [...closure].map(d => d.source.filename), eligible: reason === undefined,
    ...(reason === undefined ? {} : {reason}),
  };
}
function repositoryKey(source: PinnedGitHubRepository): string {
  return JSON.stringify([source.owner.toLowerCase(), source.repository.toLowerCase(), source.revision]);
}
type Settled = RepositorySnapshotObservation | Extract<CatalogueDataFreshness, {kind:"unavailable"}>;
// Derived metadata only, bounded to 64 observations per fetch adapter. Nothing is
// persisted or treated as a new observation on reopen. No automatic requests.
const caches = new WeakMap<RepositoryFetch, Map<string, Settled>>();
const defaultNow = () => new Date().toISOString();
function cacheFor(fetcher: RepositoryFetch): Map<string, Settled> {
  let cache = caches.get(fetcher);
  if (!cache) { cache = new Map(); caches.set(fetcher, cache); }
  return cache;
}
function previous(state: CatalogueDataFreshness): RepositorySnapshotObservation | undefined {
  return state.kind === "matches" || state.kind === "differs" ? state : "previous" in state ? state.previous : undefined;
}

/** Explicit bounded checks, keyed to the loaded catalogue and retained revision.
 * Render-time identity guards hide stale state before effects clean up; aborted
 * or replaced work cannot write state OR the shared observation cache.
 */
export function useCatalogueDataFreshness(context: CatalogueSourceContext | undefined, options: CatalogueDataFreshnessOptions = {}) {
  const fetcher = options.fetch ?? globalThis.fetch;
  const now = options.now ?? defaultNow;
  const cache = cacheFor(fetcher);
  const key = context?.eligible && context.source ? repositoryKey(context.source) : undefined;
  const initial: CatalogueDataFreshness = key === undefined ? {kind:"unestablished"} : cache.get(key) ?? {kind:"not-checked"};
  const [state, setState] = useState<{context: typeof context; fetcher: RepositoryFetch; value: CatalogueDataFreshness}>();
  const active = useRef<{context: typeof context; controller: AbortController} | undefined>(undefined);
  const value = state?.context === context && state?.fetcher === fetcher ? state.value : initial;
  useEffect(() => () => { active.current?.controller.abort(); active.current = undefined; }, [context, fetcher]);
  function check() {
    if (context === undefined || !context.eligible || context.source === undefined || key === undefined || active.current !== undefined) return;
    const controller = new AbortController();
    const operation = {context, controller};
    active.current = operation;
    const prior = previous(value);
    setState({context, fetcher, value:{kind:"checking", ...(prior ? {previous:prior} : {})}});
    void inspectGitHubRepositoryUpdate(context.source, {fetch:fetcher, signal:controller.signal}).catch(() => ({ok:false as const, diagnostics:[]})).then(result => {
      if (controller.signal.aborted || active.current !== operation) return;
      active.current = undefined;
      const timestamp = now();
      const validTime = Number.isFinite(Date.parse(timestamp));
      const status = result.diagnostics.map(d => d.details?.["status"]).find(s => typeof s === "number");
      const next: Settled = result.ok && validTime ? {
        kind: result.value.revision === context.source!.revision ? "matches" : "differs",
        checkedAt: timestamp, revision: result.value.revision,
      } : {kind:"unavailable", ...(validTime ? {attemptedAt:timestamp} : {}),
        reason: !validTime ? "This device did not provide a usable check time." : status === 429 ? "GitHub rate limited this check." : typeof status === "number" ? `GitHub returned HTTP ${status}.` : "Could not check this source.",
        ...(prior ? {previous:prior} : {}),
      };
      cache.delete(key); cache.set(key, next);
      if (cache.size > 64) cache.delete(cache.keys().next().value!);
      setState({context, fetcher, value:next});
    });
  }
  return {context, freshness:value, check};
}
