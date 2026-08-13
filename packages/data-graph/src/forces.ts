import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
} from "@rosterforge/foundation";

import type {
  BattleScribeProjection,
  CategoryEntryProjection,
  CategoryLinkProjection,
  ForceEntryProjection,
  ParsedBattleScribeDocument,
} from "@rosterforge/battlescribe-data";

import type {
  BattleScribeDataGraph,
  BattleScribeGraphReference,
} from "./resolve.js";

export type BattleScribeForceDefinitionOrigin =
  | {
      readonly kind: "gameSystem";
      readonly document: ParsedBattleScribeDocument;
    }
  | {
      readonly kind: "catalogue";
    };

export type BattleScribeForceCategoryStatus =
  | "missingTargetId"
  | "missing"
  | "resolved"
  | "ambiguous";

export interface BattleScribeForceCategoryTarget {
  readonly source: CategoryEntryProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
}

export interface BattleScribeForceCategoryLink {
  readonly source: CategoryLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly targetId: ObjectId | undefined;
  readonly status: BattleScribeForceCategoryStatus;
  readonly targets: readonly BattleScribeForceCategoryTarget[];
}

export interface BattleScribeForceDefinition {
  readonly source: ForceEntryProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly origin: BattleScribeForceDefinitionOrigin;
  readonly categoryLinks: readonly BattleScribeForceCategoryLink[];
  readonly forceEntries: readonly BattleScribeForceDefinition[];
}

export interface BattleScribeGameSystemForceDefinitions {
  readonly targetId: ObjectId;
  readonly status: "resolved" | "missing" | "ambiguous";
  readonly targetDocuments: readonly ParsedBattleScribeDocument[];
}

export interface BattleScribeCatalogueForceDefinitions {
  readonly document: ParsedBattleScribeDocument;
  readonly gameSystem?: BattleScribeGameSystemForceDefinitions;
  readonly gameSystemDefinitions: readonly BattleScribeForceDefinition[];
  readonly catalogueDefinitions: readonly BattleScribeForceDefinition[];
  readonly definitions: readonly BattleScribeForceDefinition[];
}

export interface BattleScribeForceDefinitions {
  readonly graph: BattleScribeDataGraph;
  readonly catalogues: readonly BattleScribeCatalogueForceDefinitions[];
  readonly byDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    BattleScribeCatalogueForceDefinitions
  >;
}

export function composeBattleScribeForceDefinitions(
  graph: BattleScribeDataGraph,
): Result<BattleScribeForceDefinitions> {
  const diagnostics: Diagnostic[] = [];
  const diagnosticKeys = new Set<string>();
  const referencesBySource = new Map<object, BattleScribeGraphReference>();
  for (const reference of graph.references) {
    if (
      reference.kind === "catalogueGameSystem" ||
      reference.kind === "categoryLink"
    ) {
      referencesBySource.set(reference.source, reference);
    }
  }

  const catalogues = graph.documents
    .filter((document) => document.projection.kind === "catalogue")
    .map((document) =>
      definitionsForCatalogue(
        document,
        referencesBySource,
        diagnostics,
        diagnosticKeys,
      ),
    );

  return success(
    {
      graph,
      catalogues,
      byDocument: new Map(catalogues.map((view) => [view.document, view])),
    },
    diagnostics,
  );
}

function definitionsForCatalogue(
  document: ParsedBattleScribeDocument,
  referencesBySource: ReadonlyMap<object, BattleScribeGraphReference>,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): BattleScribeCatalogueForceDefinitions {
  const catalogueDefinitions = projectDefinitions(
    document.projection.forceEntries,
    document,
    { kind: "catalogue" },
    referencesBySource,
    diagnostics,
    diagnosticKeys,
  );
  const gameSystemResult = gameSystemDefinitions(
    document,
    referencesBySource,
    diagnostics,
    diagnosticKeys,
  );
  const definitions = [
    ...gameSystemResult.definitions,
    ...catalogueDefinitions,
  ];

  return {
    document,
    ...(gameSystemResult.source === undefined
      ? {}
      : { gameSystem: gameSystemResult.source }),
    gameSystemDefinitions: gameSystemResult.definitions,
    catalogueDefinitions,
    definitions,
  };
}

function gameSystemDefinitions(
  document: ParsedBattleScribeDocument,
  referencesBySource: ReadonlyMap<object, BattleScribeGraphReference>,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): {
  readonly source?: BattleScribeGameSystemForceDefinitions;
  readonly definitions: readonly BattleScribeForceDefinition[];
} {
  const targetId = document.projection.metadata.gameSystemId;
  if (targetId === undefined) {
    return { definitions: [] };
  }
  const targets = gameSystemDocuments(
    referencesBySource.get(document.projection),
  );
  const status = targetStatus(targets);
  const source: BattleScribeGameSystemForceDefinitions = {
    targetId,
    status,
    targetDocuments: targets,
  };

  if (status !== "resolved") {
    pushDiagnostic(
      diagnostics,
      diagnosticKeys,
      status === "missing"
        ? "BS_FORCE_DEFINITIONS_MISSING_GAME_SYSTEM"
        : "BS_FORCE_DEFINITIONS_AMBIGUOUS_GAME_SYSTEM",
      status === "missing"
        ? `Cannot compose force definitions from missing game system ${targetId}.`
        : `Cannot compose force definitions from ambiguous game system ${targetId}.`,
      document.projection,
      "@gameSystemId",
      { targetId, candidates: targets.length },
    );
    return { source, definitions: [] };
  }

  const target = targets[0];
  if (target === undefined) {
    return { source, definitions: [] };
  }
  return {
    source,
    definitions: projectDefinitions(
      target.projection.forceEntries,
      target,
      { kind: "gameSystem", document: target },
      referencesBySource,
      diagnostics,
      diagnosticKeys,
    ),
  };
}

function projectDefinitions(
  entries: readonly ForceEntryProjection[],
  sourceDocument: ParsedBattleScribeDocument,
  origin: BattleScribeForceDefinitionOrigin,
  referencesBySource: ReadonlyMap<object, BattleScribeGraphReference>,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): readonly BattleScribeForceDefinition[] {
  return entries.map((source) => ({
    source,
    sourceDocument,
    origin,
    categoryLinks: source.categoryLinks.map((link) =>
      projectCategoryLink(
        link,
        sourceDocument,
        referencesBySource.get(link),
        diagnostics,
        diagnosticKeys,
      ),
    ),
    forceEntries: projectDefinitions(
      source.forceEntries,
      sourceDocument,
      origin,
      referencesBySource,
      diagnostics,
      diagnosticKeys,
    ),
  }));
}

function projectCategoryLink(
  source: CategoryLinkProjection,
  sourceDocument: ParsedBattleScribeDocument,
  reference: BattleScribeGraphReference | undefined,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): BattleScribeForceCategoryLink {
  const targets =
    reference?.targets
      .filter((target) => target.kind === "categoryEntry")
      .map((target) => ({
        source: target.source as CategoryEntryProjection,
        sourceDocument: target.document,
      })) ?? [];
  const status = categoryStatus(source.targetId, targets);
  if (status !== "resolved") {
    const code =
      status === "ambiguous"
        ? "BS_FORCE_DEFINITIONS_AMBIGUOUS_CATEGORY"
        : "BS_FORCE_DEFINITIONS_MISSING_CATEGORY";
    pushDiagnostic(
      diagnostics,
      diagnosticKeys,
      code,
      status === "ambiguous"
        ? `Force category link ${source.id ?? source.name ?? "without an ID"} has an ambiguous target ${source.targetId}.`
        : `Force category link ${source.id ?? source.name ?? "without an ID"} has no resolvable category target.`,
      source,
      "@targetId",
      { targetId: source.targetId, candidates: targets.length, reason: status },
    );
  }
  return {
    source,
    sourceDocument,
    targetId: source.targetId,
    status,
    targets,
  };
}

function categoryStatus(
  targetId: ObjectId | undefined,
  targets: readonly BattleScribeForceCategoryTarget[],
): BattleScribeForceCategoryStatus {
  if (targetId === undefined) {
    return "missingTargetId";
  }
  if (targets.length === 0) {
    return "missing";
  }
  return targets.length === 1 ? "resolved" : "ambiguous";
}

function gameSystemDocuments(
  reference: BattleScribeGraphReference | undefined,
): readonly ParsedBattleScribeDocument[] {
  return (
    reference?.targets
      .filter((target) => target.kind === "gameSystem")
      .map((target) => target.document) ?? []
  );
}

function targetStatus(
  targets: readonly ParsedBattleScribeDocument[],
): "resolved" | "missing" | "ambiguous" {
  if (targets.length === 0) {
    return "missing";
  }
  return targets.length === 1 ? "resolved" : "ambiguous";
}

function pushDiagnostic(
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
  code: string,
  message: string,
  source: BattleScribeProjection | CategoryLinkProjection,
  pathSuffix: string,
  details: Readonly<Record<string, unknown>>,
): void {
  const key = `${code}:${source.source.sourceId}:${source.path.join("/")}`;
  if (diagnosticKeys.has(key)) {
    return;
  }
  diagnosticKeys.add(key);
  diagnostics.push({
    code,
    message,
    severity: "warning",
    impacts: ["resolution"],
    location: {
      source: source.source,
      path: [...source.path, pathSuffix],
    },
    details,
  });
}
