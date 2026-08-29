import type {
  BattleScribeDocumentKind,
  CatalogueLinkProjection,
  ParsedBattleScribeDocument,
} from "@rosterforge/battlescribe-data";

import {
  failure,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
  type SourceFileProvenance,
  type SourceLocation,
} from "@rosterforge/foundation";

import type { PinnedGitHubRepository } from "./pinned-github.js";

export interface RepositoryCatalogueLinkSummary {
  readonly targetId?: ObjectId;
  readonly name?: string;
  readonly location?: SourceLocation;
}

export interface BattleScribeRepositoryDocumentSummary {
  readonly path: string;
  readonly kind: BattleScribeDocumentKind;
  readonly id: ObjectId;
  readonly name: string;
  readonly gameSystemId?: ObjectId;
  readonly library?: boolean;
  readonly costTypeIds: readonly ObjectId[];
  readonly catalogueLinks: readonly RepositoryCatalogueLinkSummary[];
  readonly source?: SourceFileProvenance;
}

export interface BattleScribeRepositoryIndex {
  readonly source: PinnedGitHubRepository;
  readonly documents: readonly BattleScribeRepositoryDocumentSummary[];
}

export type BattleScribeDependencyRole =
  | "gameSystem"
  | "selectedCatalogue"
  | "catalogueDependency";

export interface PlannedBattleScribeRepositoryDocument {
  readonly role: BattleScribeDependencyRole;
  readonly document: BattleScribeRepositoryDocumentSummary;
}

export interface BattleScribeDependencyClosurePlan {
  readonly source: PinnedGitHubRepository;
  readonly selectedCatalogue: BattleScribeRepositoryDocumentSummary;
  readonly status: "complete" | "incomplete";
  readonly files: readonly PlannedBattleScribeRepositoryDocument[];
}

export function summarizeBattleScribeRepositoryDocument(
  path: string,
  document: ParsedBattleScribeDocument,
): BattleScribeRepositoryDocumentSummary {
  return {
    path,
    kind: document.metadata.kind,
    id: document.metadata.id,
    name: document.metadata.name,
    ...(document.metadata.gameSystemId === undefined
      ? {}
      : { gameSystemId: document.metadata.gameSystemId }),
    ...(document.metadata.library === undefined
      ? {}
      : { library: document.metadata.library }),
    costTypeIds: document.projection.costTypes.flatMap(({ id }) =>
      id === undefined ? [] : [id],
    ),
    catalogueLinks: document.projection.catalogueLinks.map(summarizeCatalogueLink),
    source: document.source,
  };
}

export function planBattleScribeDependencyClosure(
  index: BattleScribeRepositoryIndex,
  selectedCataloguePath: string,
): Result<BattleScribeDependencyClosurePlan> {
  const matchingRoots = index.documents.filter(
    (document) => document.path === selectedCataloguePath,
  );
  if (matchingRoots.length === 0) {
    return failure([
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_ROOT_MISSING",
        "The selected catalogue path is not present in the pinned repository index.",
        "error",
        { path: selectedCataloguePath },
      ),
    ]);
  }
  if (matchingRoots.length > 1) {
    return failure([
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_ROOT_AMBIGUOUS",
        "The selected catalogue path occurs more than once in the pinned repository index.",
        "error",
        { path: selectedCataloguePath, occurrences: matchingRoots.length },
      ),
    ]);
  }

  const selectedCatalogue = matchingRoots[0];
  if (selectedCatalogue === undefined) {
    throw new Error("A matching dependency root was not retained.");
  }
  if (selectedCatalogue.kind !== "catalogue") {
    return failure([
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_ROOT_NOT_CATALOGUE",
        "The selected repository document is not a catalogue.",
        "error",
        { kind: selectedCatalogue.kind, path: selectedCatalogue.path },
        sourceLocation(selectedCatalogue),
      ),
    ]);
  }

  const diagnostics: Diagnostic[] = [];
  const byId = indexDocumentsById(index.documents);
  const gameSystem = resolveGameSystem(selectedCatalogue, byId, diagnostics);
  const catalogueDocuments: BattleScribeRepositoryDocumentSummary[] = [];
  const visited = new Set<string>();
  const active: BattleScribeRepositoryDocumentSummary[] = [];
  visitCatalogue(
    selectedCatalogue,
    selectedCatalogue.gameSystemId,
    byId,
    visited,
    active,
    catalogueDocuments,
    diagnostics,
  );

  const files: PlannedBattleScribeRepositoryDocument[] = [];
  if (gameSystem !== undefined) {
    files.push({ role: "gameSystem", document: gameSystem });
  }
  for (const [position, document] of catalogueDocuments.entries()) {
    files.push({
      role: position === 0 ? "selectedCatalogue" : "catalogueDependency",
      document,
    });
  }

  return success(
    {
      source: index.source,
      selectedCatalogue,
      status: diagnostics.some(isIncompleteDependencyDiagnostic)
        ? "incomplete"
        : "complete",
      files,
    },
    diagnostics,
  );
}

function summarizeCatalogueLink(
  link: CatalogueLinkProjection,
): RepositoryCatalogueLinkSummary {
  return {
    ...(link.targetId === undefined ? {} : { targetId: link.targetId }),
    ...(link.name === undefined ? {} : { name: link.name }),
    location: { source: link.source, path: link.path },
  };
}

function indexDocumentsById(
  documents: readonly BattleScribeRepositoryDocumentSummary[],
): ReadonlyMap<ObjectId, readonly BattleScribeRepositoryDocumentSummary[]> {
  const mutable = new Map<ObjectId, BattleScribeRepositoryDocumentSummary[]>();
  for (const document of documents) {
    const existing = mutable.get(document.id);
    if (existing === undefined) {
      mutable.set(document.id, [document]);
    } else {
      existing.push(document);
    }
  }
  return mutable;
}

function resolveGameSystem(
  catalogue: BattleScribeRepositoryDocumentSummary,
  byId: ReadonlyMap<ObjectId, readonly BattleScribeRepositoryDocumentSummary[]>,
  diagnostics: Diagnostic[],
): BattleScribeRepositoryDocumentSummary | undefined {
  if (catalogue.gameSystemId === undefined) {
    diagnostics.push(
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_GAME_SYSTEM_ID_MISSING",
        "The selected catalogue does not declare a game-system ID.",
        "warning",
        { catalogueId: catalogue.id, path: catalogue.path },
        sourceLocation(catalogue),
      ),
    );
    return undefined;
  }
  const matches = byId.get(catalogue.gameSystemId) ?? [];
  if (matches.length === 0) {
    diagnostics.push(
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_GAME_SYSTEM_MISSING",
        "The selected catalogue's game system is absent from the repository index.",
        "warning",
        {
          catalogueId: catalogue.id,
          path: catalogue.path,
          targetId: catalogue.gameSystemId,
        },
        sourceLocation(catalogue),
      ),
    );
    return undefined;
  }
  if (matches.length > 1) {
    diagnostics.push(
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_GAME_SYSTEM_AMBIGUOUS",
        "The selected catalogue's game-system ID resolves to multiple repository documents.",
        "warning",
        {
          catalogueId: catalogue.id,
          occurrences: matches.length,
          path: catalogue.path,
          targetId: catalogue.gameSystemId,
        },
        sourceLocation(catalogue),
      ),
    );
    return undefined;
  }
  const match = matches[0];
  if (match?.kind !== "gameSystem") {
    diagnostics.push(
      dependencyDiagnostic(
        "REPOSITORY_DEPENDENCY_GAME_SYSTEM_KIND_MISMATCH",
        "The selected catalogue's game-system ID resolves to a non-game-system document.",
        "warning",
        {
          actualKind: match?.kind,
          catalogueId: catalogue.id,
          path: catalogue.path,
          targetId: catalogue.gameSystemId,
        },
        sourceLocation(catalogue),
      ),
    );
    return undefined;
  }
  return match;
}

function visitCatalogue(
  catalogue: BattleScribeRepositoryDocumentSummary,
  expectedGameSystemId: ObjectId | undefined,
  byId: ReadonlyMap<ObjectId, readonly BattleScribeRepositoryDocumentSummary[]>,
  visited: Set<string>,
  active: BattleScribeRepositoryDocumentSummary[],
  ordered: BattleScribeRepositoryDocumentSummary[],
  diagnostics: Diagnostic[],
): void {
  if (visited.has(catalogue.path)) {
    return;
  }
  visited.add(catalogue.path);
  active.push(catalogue);
  ordered.push(catalogue);

  for (const link of catalogue.catalogueLinks) {
    if (link.targetId === undefined) {
      diagnostics.push(
        dependencyDiagnostic(
          "REPOSITORY_DEPENDENCY_TARGET_ID_MISSING",
          "A catalogue link does not declare a target ID.",
          "warning",
          { linkName: link.name, sourceId: catalogue.id, sourcePath: catalogue.path },
          link.location,
        ),
      );
      continue;
    }
    const matches = byId.get(link.targetId) ?? [];
    if (matches.length === 0) {
      diagnostics.push(
        dependencyDiagnostic(
          "REPOSITORY_DEPENDENCY_TARGET_MISSING",
          "A catalogue dependency is absent from the repository index.",
          "warning",
          {
            linkName: link.name,
            sourceId: catalogue.id,
            sourcePath: catalogue.path,
            targetId: link.targetId,
          },
          link.location,
        ),
      );
      continue;
    }
    if (matches.length > 1) {
      diagnostics.push(
        dependencyDiagnostic(
          "REPOSITORY_DEPENDENCY_TARGET_AMBIGUOUS",
          "A catalogue dependency ID resolves to multiple repository documents.",
          "warning",
          {
            linkName: link.name,
            occurrences: matches.length,
            sourceId: catalogue.id,
            sourcePath: catalogue.path,
            targetId: link.targetId,
          },
          link.location,
        ),
      );
      continue;
    }
    const target = matches[0];
    if (target?.kind !== "catalogue") {
      diagnostics.push(
        dependencyDiagnostic(
          "REPOSITORY_DEPENDENCY_TARGET_KIND_MISMATCH",
          "A catalogue dependency ID resolves to a non-catalogue document.",
          "warning",
          {
            actualKind: target?.kind,
            linkName: link.name,
            sourceId: catalogue.id,
            sourcePath: catalogue.path,
            targetId: link.targetId,
          },
          link.location,
        ),
      );
      continue;
    }
    if (
      expectedGameSystemId !== undefined &&
      target.gameSystemId !== expectedGameSystemId
    ) {
      diagnostics.push(
        dependencyDiagnostic(
          "REPOSITORY_DEPENDENCY_GAME_SYSTEM_MISMATCH",
          "A catalogue dependency belongs to a different or unspecified game system.",
          "warning",
          {
            actualGameSystemId: target.gameSystemId,
            expectedGameSystemId,
            sourceId: catalogue.id,
            sourcePath: catalogue.path,
            targetId: target.id,
            targetPath: target.path,
          },
          link.location,
        ),
      );
      continue;
    }

    const activePosition = active.findIndex((item) => item.path === target.path);
    if (activePosition >= 0) {
      diagnostics.push(
        dependencyDiagnostic(
          "REPOSITORY_DEPENDENCY_CYCLE",
          "A catalogue dependency cycle was detected and traversal stopped at the repeated path.",
          "warning",
          {
            paths: [...active.slice(activePosition).map((item) => item.path), target.path],
          },
          link.location,
        ),
      );
      continue;
    }
    visitCatalogue(
      target,
      expectedGameSystemId,
      byId,
      visited,
      active,
      ordered,
      diagnostics,
    );
  }

  active.pop();
}

function isIncompleteDependencyDiagnostic(diagnostic: Diagnostic): boolean {
  return diagnostic.code !== "REPOSITORY_DEPENDENCY_CYCLE";
}

function sourceLocation(
  document: BattleScribeRepositoryDocumentSummary,
): SourceLocation | undefined {
  return document.source === undefined ? undefined : { source: document.source };
}

function dependencyDiagnostic(
  code: string,
  message: string,
  severity: Diagnostic["severity"],
  details: Readonly<Record<string, unknown>>,
  location?: SourceLocation,
): Diagnostic {
  return {
    code,
    message,
    severity,
    impacts: ["import", "resolution"],
    ...(location === undefined ? {} : { location }),
    details,
  };
}
