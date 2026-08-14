import { useEffect, useRef, useState } from "react";

import type { Diagnostic } from "@rosterforge/foundation";
import type { PinnedRepositoryByteCache } from "@rosterforge/repository";

import { createIndexedDbRemoteCatalogueMetadataCache } from "./browser-remote-metadata-cache.js";
import { createIndexedDbRepositoryByteCache } from "./browser-repository-cache.js";
import {
  acquireRemoteCatalogue,
  defaultRemoteCatalogueSources,
  indexRemoteCatalogueSource,
  type RemoteCatalogueAcquisition,
  type RemoteCatalogueMetadataCache,
  type RemoteCatalogueSourceDefinition,
  type RemoteCatalogueSourceIndex,
  type RemoteCatalogueSourceProgress,
} from "./remote-catalogue-source.js";

type IndexRemoteCatalogueSource = typeof indexRemoteCatalogueSource;
type AcquireRemoteCatalogue = typeof acquireRemoteCatalogue;

export interface RemoteCatalogueSourceControllerOptions {
  readonly remoteSources?: readonly RemoteCatalogueSourceDefinition[];
  readonly repositoryByteCache?: PinnedRepositoryByteCache | null;
  readonly repositoryMetadataCache?: RemoteCatalogueMetadataCache | null;
  readonly indexRemoteSource?: IndexRemoteCatalogueSource;
  readonly acquireRemoteSource?: AcquireRemoteCatalogue;
  readonly createBatchId?: () => string;
  readonly now?: () => string;
}

export type RemoteCatalogueSourceState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "indexing";
      readonly source: RemoteCatalogueSourceDefinition;
      readonly progress?: RemoteCatalogueSourceProgress;
    }
  | {
      readonly kind: "ready";
      readonly index: RemoteCatalogueSourceIndex;
      readonly selectedPath: string;
      readonly diagnostics: readonly Diagnostic[];
      readonly loadedPath?: string;
      readonly message?: string;
    }
  | {
      readonly kind: "acquiring";
      readonly index: RemoteCatalogueSourceIndex;
      readonly selectedPath: string;
      readonly diagnostics: readonly Diagnostic[];
      readonly progress?: RemoteCatalogueSourceProgress;
    }
  | {
      readonly kind: "failed";
      readonly source: RemoteCatalogueSourceDefinition;
      readonly message: string;
      readonly diagnostics: readonly Diagnostic[];
    };

const defaultRepositoryByteCache = createIndexedDbRepositoryByteCache();
const defaultRepositoryMetadataCache =
  createIndexedDbRemoteCatalogueMetadataCache();

export function useRemoteCatalogueSourceController(
  onAcquired: (
    acquisition: RemoteCatalogueAcquisition,
    diagnostics: readonly Diagnostic[],
  ) => void,
  {
    remoteSources = defaultRemoteCatalogueSources,
    repositoryByteCache = defaultRepositoryByteCache,
    repositoryMetadataCache = defaultRepositoryMetadataCache,
    indexRemoteSource = indexRemoteCatalogueSource,
    acquireRemoteSource = acquireRemoteCatalogue,
    createBatchId = defaultBatchId,
    now = () => new Date().toISOString(),
  }: RemoteCatalogueSourceControllerOptions,
) {
  const operationSequence = useRef(0);
  const abortController = useRef<AbortController | undefined>(undefined);
  const [state, setState] = useState<RemoteCatalogueSourceState>({
    kind: "idle",
  });

  useEffect(
    () => () => {
      ++operationSequence.current;
      abortController.current?.abort();
    },
    [],
  );

  function beginOperation(): {
    readonly sequence: number;
    readonly controller: AbortController;
  } {
    ++operationSequence.current;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    return { sequence: operationSequence.current, controller };
  }

  function observeProgress(
    sequence: number,
    progress: RemoteCatalogueSourceProgress,
  ) {
    if (sequence !== operationSequence.current) return;
    setState((current) =>
      current.kind === "indexing" || current.kind === "acquiring"
        ? { ...current, progress }
        : current,
    );
  }

  async function browseSource(source: RemoteCatalogueSourceDefinition) {
    const { sequence, controller } = beginOperation();
    setState({ kind: "indexing", source });

    try {
      const result = await indexRemoteSource(source, {
        importedAt: now(),
        signal: controller.signal,
        ...(repositoryByteCache === null ||
        repositoryByteCache === undefined
          ? {}
          : { cache: repositoryByteCache }),
        ...(repositoryMetadataCache === null ||
        repositoryMetadataCache === undefined
          ? {}
          : { metadataCache: repositoryMetadataCache }),
        onProgress: (progress) => observeProgress(sequence, progress),
      });
      if (sequence !== operationSequence.current) return;
      abortController.current = undefined;
      if (!result.ok) {
        setState({
          kind: "failed",
          source,
          message: "The pinned repository could not be indexed.",
          diagnostics: result.diagnostics,
        });
        return;
      }

      setState({
        kind: "ready",
        index: result.value,
        selectedPath: result.value.catalogues[0]!.path,
        diagnostics: result.diagnostics,
      });
    } catch (error: unknown) {
      if (sequence !== operationSequence.current) return;
      abortController.current = undefined;
      setState({
        kind: "failed",
        source,
        message: "An unexpected error stopped repository indexing.",
        diagnostics: [unexpectedRemoteDiagnostic(error)],
      });
    }
  }

  function selectCataloguePath(path: string) {
    setState((current) => {
      if (current.kind !== "ready") return current;
      return {
        kind: "ready",
        index: current.index,
        selectedPath: path,
        diagnostics: current.diagnostics,
        ...(current.loadedPath === undefined
          ? {}
          : { loadedPath: current.loadedPath }),
      };
    });
  }

  async function openSelectedCatalogue() {
    if (state.kind !== "ready") return;
    const readyState = state;
    const { sequence, controller } = beginOperation();
    setState({
      kind: "acquiring",
      index: readyState.index,
      selectedPath: readyState.selectedPath,
      diagnostics: readyState.diagnostics,
    });

    try {
      const result = await acquireRemoteSource(
        readyState.index,
        readyState.selectedPath,
        {
          batchId: createBatchId(),
          importedAt: now(),
          signal: controller.signal,
          ...(repositoryByteCache === null ||
          repositoryByteCache === undefined
            ? {}
            : { cache: repositoryByteCache }),
          onProgress: (progress) => observeProgress(sequence, progress),
        },
      );
      if (sequence !== operationSequence.current) return;
      abortController.current = undefined;
      if (!result.ok) {
        setState({
          ...readyState,
          message: "The selected catalogue could not be acquired.",
          diagnostics: result.diagnostics,
        });
        return;
      }

      onAcquired(result.value, result.diagnostics);
      setState({
        kind: "ready",
        index: readyState.index,
        selectedPath: readyState.selectedPath,
        diagnostics: result.diagnostics,
        loadedPath: readyState.selectedPath,
        message: "The selected catalogue and its dependencies are ready.",
      });
    } catch (error: unknown) {
      if (sequence !== operationSequence.current) return;
      abortController.current = undefined;
      setState({
        ...readyState,
        message: "An unexpected error stopped catalogue acquisition.",
        diagnostics: [unexpectedRemoteDiagnostic(error)],
      });
    }
  }

  function cancelOperation() {
    ++operationSequence.current;
    abortController.current?.abort();
    abortController.current = undefined;
    setState((current) =>
      current.kind === "acquiring"
        ? {
            kind: "ready",
            index: current.index,
            selectedPath: current.selectedPath,
            diagnostics: current.diagnostics,
            message: "Catalogue acquisition cancelled.",
          }
        : { kind: "idle" },
    );
  }

  function resetSource() {
    ++operationSequence.current;
    abortController.current?.abort();
    abortController.current = undefined;
    setState({ kind: "idle" });
  }

  return {
    state,
    sources: remoteSources,
    browseSource,
    selectCataloguePath,
    openSelectedCatalogue,
    cancelOperation,
    resetSource,
  };
}

function unexpectedRemoteDiagnostic(error: unknown): Diagnostic {
  return {
    code: "WEB_REMOTE_SOURCE_UNEXPECTED_FAILURE",
    message: "An unexpected failure stopped the remote catalogue operation.",
    severity: "error",
    impacts: ["import", "internal"],
    details: {
      cause: error instanceof Error ? error.message : String(error),
    },
  };
}

function defaultBatchId(): string {
  const unique = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
  return "remote-" + unique;
}
