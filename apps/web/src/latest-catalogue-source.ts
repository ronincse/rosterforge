// Explicit acquisition of a new immutable snapshot. This app adapter stages
// repository data; it never receives or mutates an open roster or saved draft.
import { failure, success, type Result } from "@rosterforge/foundation";
import { inspectGitHubRepositoryUpdate, pinGitHubRepository } from "@rosterforge/repository";
import { acquireRemoteCatalogue, indexRemoteCatalogueSource, type IndexRemoteCatalogueSourceOptions, type RemoteCatalogueSourceDefinition, type RemoteCatalogueSourceIndex } from "./remote-catalogue-source.js";

/** Resolve the default tip once, then verify every roster closure at that SHA.
 * Existing immutable caches may gain verified files, but no selection is
 * activated here. The caller must check cancellation before committing it. */
export async function stageLatestCatalogueSource(source: RemoteCatalogueSourceDefinition,
  options: IndexRemoteCatalogueSourceOptions): Promise<Result<RemoteCatalogueSourceIndex>> {
  const latest = await inspectGitHubRepositoryUpdate(source.repository, options);
  if (!latest.ok) return latest;
  const candidate = { ...source, repository: { ...source.repository, revision: latest.value.revision } };
  const indexed = await indexRemoteCatalogueSource(candidate, options);
  if (!indexed.ok) return indexed;
  if (indexed.value.report.status !== "complete") return incomplete();
  const diagnostics = [...indexed.diagnostics];
  for (const catalogue of indexed.value.catalogues) {
    if (options.signal?.aborted) return incomplete();
    const closure = await acquireRemoteCatalogue(indexed.value, catalogue.path, { ...options, batchId: "latest-stage" });
    if (!closure.ok) return closure;
    if (closure.value.closure.status !== "complete") return incomplete();
    diagnostics.push(...closure.diagnostics);
  }
  return options.signal?.aborted ? incomplete() : success(indexed.value, diagnostics);
}

function incomplete(): Result<never> {
  return failure([{code:"WEB_LATEST_SNAPSHOT_INCOMPLETE", message:"The new snapshot was not completely verified. Previous data is retained.",severity:"error",impacts:["import"]}]);
}

const key = (source: RemoteCatalogueSourceDefinition) => `rosterforge-source-selection-v1:${source.repository.owner.toLowerCase()}/${source.repository.repository.toLowerCase()}`;

/** Only a revision can be restored; persisted strings never supply a URL or
 * repository. This preference is not army provenance and never rewrites pins. */
export function selectedCatalogueSource(source: RemoteCatalogueSourceDefinition, storage: Pick<Storage,"getItem"> | undefined): RemoteCatalogueSourceDefinition {
  try {
    const raw = storage?.getItem(key(source));
    if (!raw || raw.length > 1024) return source;
    const record: unknown = JSON.parse(raw);
    if (typeof record !== "object" || record === null || !("revision" in record) || !("baseline" in record)
      || record.baseline !== source.repository.revision || typeof record.revision !== "string") return source;
    const validated = pinGitHubRepository({...source.repository, revision:record.revision});
    return validated.ok ? {...source, repository:{...source.repository, revision:validated.value.revision}} : source;
  } catch { return source; }
}

/** Persist only after complete staging. A storage failure leaves the old
 * record intact and is reported by the caller; in-memory selection still works. */
export function retainCatalogueSource(baseline: RemoteCatalogueSourceDefinition, selected: RemoteCatalogueSourceDefinition, storage: Pick<Storage,"setItem"> | undefined): boolean {
  if (baseline.repository.owner !== selected.repository.owner || baseline.repository.repository !== selected.repository.repository || !pinGitHubRepository(selected.repository).ok) return false;
  try {
    if (!storage) return false;
    storage.setItem(key(baseline), JSON.stringify({baseline:baseline.repository.revision, revision:selected.repository.revision}));
    return true;
  } catch { return false; }
}

/** Browser storage can be denied even when its global property exists. */
export function sourceSelectionStorage(): Storage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}
