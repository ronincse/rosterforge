import { useEffect, useState } from "react";

import {
  inspectGitHubRepositoryUpdate,
  type RepositoryFetch,
} from "@rosterforge/repository";

import { defaultRemoteCatalogueSources } from "./remote-catalogue-source.js";

/**
 * How current the loaded catalogue data is, as far as can honestly be told.
 *
 * Points move between Games Workshop releases and the community catalogues
 * follow at their own pace. On 2026-08-23 a corpus update silently corrected
 * two Dark Angels units this app had been reporting twenty points out, and
 * nothing in the interface suggested the data might be behind. This exists so
 * that is visible rather than discovered at a table.
 *
 * The claim is deliberately narrow. It reports **when the upstream repository
 * last changed**, next to **when this batch was imported**. It does not claim
 * the loaded files came from that repository at all: they may have been chosen
 * from disk, edited, or taken from somewhere else entirely.
 */
export type CatalogueDataFreshness =
  | { readonly kind: "checking" }
  /** Upstream reachable: `lastUpdatedAt` is when it last changed. */
  | {
      readonly kind: "known";
      readonly owner: string;
      readonly repository: string;
      readonly lastUpdatedAt: string;
      readonly importedAt: string;
      /** True when upstream changed after this batch was imported. */
      readonly upstreamIsNewer: boolean;
    }
  /**
   * Upstream unreachable. Offline, rate-limited, or blocked — the app cannot
   * tell which, and it does not matter to the reader: the honest thing left to
   * say is that the data may be out of date.
   */
  | { readonly kind: "unknown"; readonly importedAt: string };

export interface CatalogueDataFreshnessOptions {
  readonly fetch?: RepositoryFetch;
  /** Overridden in tests; defaults to the configured BSData source. */
  readonly source?: { readonly owner: string; readonly repository: string };
}

export function useCatalogueDataFreshness(
  importedAt: string | undefined,
  options: CatalogueDataFreshnessOptions = {},
): CatalogueDataFreshness | undefined {
  const [freshness, setFreshness] = useState<CatalogueDataFreshness>();
  const configured =
    options.source ?? defaultRemoteCatalogueSources[0]?.repository;
  const owner = configured?.owner;
  const repository = configured?.repository;
  const fetcher = options.fetch;

  useEffect(() => {
    if (importedAt === undefined || owner === undefined || repository === undefined) {
      setFreshness(undefined);
      return undefined;
    }
    let cancelled = false;
    setFreshness({ kind: "checking" });
    const controller = new AbortController();
    void inspectGitHubRepositoryUpdate(
      { owner, repository },
      { ...(fetcher === undefined ? {} : { fetch: fetcher }), signal: controller.signal },
    ).then((result) => {
      if (cancelled) return;
      setFreshness(
        result.ok
          ? {
              kind: "known",
              owner,
              repository,
              lastUpdatedAt: result.value.lastUpdatedAt,
              importedAt,
              upstreamIsNewer:
                Date.parse(result.value.lastUpdatedAt) > Date.parse(importedAt),
            }
          : { kind: "unknown", importedAt },
      );
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [importedAt, owner, repository, fetcher]);

  return freshness;
}
