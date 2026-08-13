import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
} from "@rosterforge/foundation";

import type {
  BattleScribeProjection,
  CategoryEntryProjection,
  ParsedBattleScribeDocument,
} from "@rosterforge/battlescribe-data";

import type {
  BattleScribeDataGraph,
  BattleScribeGraphReference,
} from "./resolve.js";

export type BattleScribeCategoryDefinitionOrigin =
  | {
      readonly kind: "gameSystem";
      readonly document: ParsedBattleScribeDocument;
    }
  | {
      readonly kind: "catalogue";
    };

export interface BattleScribeCategoryDefinition {
  readonly source: CategoryEntryProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly origin: BattleScribeCategoryDefinitionOrigin;
}

export interface BattleScribeGameSystemCategoryDefinitions {
  readonly targetId: ObjectId;
  readonly status: "resolved" | "missing" | "ambiguous";
  readonly targetDocuments: readonly ParsedBattleScribeDocument[];
}

export interface BattleScribeCatalogueCategoryDefinitions {
  readonly document: ParsedBattleScribeDocument;
  readonly gameSystem?: BattleScribeGameSystemCategoryDefinitions;
  readonly gameSystemDefinitions: readonly BattleScribeCategoryDefinition[];
  readonly catalogueDefinitions: readonly BattleScribeCategoryDefinition[];
  readonly definitions: readonly BattleScribeCategoryDefinition[];
}

export interface BattleScribeCategoryDefinitions {
  readonly graph: BattleScribeDataGraph;
  readonly catalogues: readonly BattleScribeCatalogueCategoryDefinitions[];
  readonly byDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    BattleScribeCatalogueCategoryDefinitions
  >;
}

export function composeBattleScribeCategoryDefinitions(
  graph: BattleScribeDataGraph,
): Result<BattleScribeCategoryDefinitions> {
  const diagnostics: Diagnostic[] = [];
  const gameSystemReferences = new Map<object, BattleScribeGraphReference>();
  for (const reference of graph.references) {
    if (reference.kind === "catalogueGameSystem") {
      gameSystemReferences.set(reference.source, reference);
    }
  }

  const catalogues = graph.documents
    .filter((document) => document.projection.kind === "catalogue")
    .map((document) =>
      definitionsForCatalogue(
        document,
        gameSystemReferences.get(document.projection),
        diagnostics,
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
  gameSystemReference: BattleScribeGraphReference | undefined,
  diagnostics: Diagnostic[],
): BattleScribeCatalogueCategoryDefinitions {
  const catalogueDefinitions = projectDefinitions(
    document.projection.categoryEntries,
    document,
    { kind: "catalogue" },
  );
  const gameSystemResult = gameSystemDefinitions(
    document,
    gameSystemReference,
    diagnostics,
  );

  return {
    document,
    ...(gameSystemResult.source === undefined
      ? {}
      : { gameSystem: gameSystemResult.source }),
    gameSystemDefinitions: gameSystemResult.definitions,
    catalogueDefinitions,
    definitions: [
      ...gameSystemResult.definitions,
      ...catalogueDefinitions,
    ],
  };
}

function gameSystemDefinitions(
  document: ParsedBattleScribeDocument,
  reference: BattleScribeGraphReference | undefined,
  diagnostics: Diagnostic[],
): {
  readonly source?: BattleScribeGameSystemCategoryDefinitions;
  readonly definitions: readonly BattleScribeCategoryDefinition[];
} {
  const targetId = document.projection.metadata.gameSystemId;
  if (targetId === undefined) {
    return { definitions: [] };
  }
  const targets =
    reference?.targets
      .filter((target) => target.kind === "gameSystem")
      .map((target) => target.document) ?? [];
  const status = targetStatus(targets);
  const source: BattleScribeGameSystemCategoryDefinitions = {
    targetId,
    status,
    targetDocuments: targets,
  };

  if (status !== "resolved") {
    diagnostics.push(
      gameSystemDiagnostic(document.projection, targetId, status, targets),
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
      target.projection.categoryEntries,
      target,
      { kind: "gameSystem", document: target },
    ),
  };
}

function projectDefinitions(
  definitions: readonly CategoryEntryProjection[],
  sourceDocument: ParsedBattleScribeDocument,
  origin: BattleScribeCategoryDefinitionOrigin,
): readonly BattleScribeCategoryDefinition[] {
  return definitions.map((source) => ({ source, sourceDocument, origin }));
}

function targetStatus(
  targets: readonly ParsedBattleScribeDocument[],
): "resolved" | "missing" | "ambiguous" {
  if (targets.length === 0) {
    return "missing";
  }
  return targets.length === 1 ? "resolved" : "ambiguous";
}

function gameSystemDiagnostic(
  source: BattleScribeProjection,
  targetId: ObjectId,
  status: "missing" | "ambiguous",
  targets: readonly ParsedBattleScribeDocument[],
): Diagnostic {
  return {
    code:
      status === "missing"
        ? "BS_CATEGORY_DEFINITIONS_MISSING_GAME_SYSTEM"
        : "BS_CATEGORY_DEFINITIONS_AMBIGUOUS_GAME_SYSTEM",
    message:
      status === "missing"
        ? `Cannot compose category definitions from missing game system ${targetId}.`
        : `Cannot compose category definitions from ambiguous game system ${targetId}.`,
    severity: "warning",
    impacts: ["resolution"],
    location: {
      source: source.source,
      path: [...source.path, "@gameSystemId"],
    },
    details: { targetId, candidates: targets.length },
  };
}
