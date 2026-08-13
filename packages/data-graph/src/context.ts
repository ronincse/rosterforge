import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from "@rosterforge/foundation";

import type { ParsedBattleScribeDocument } from "@rosterforge/battlescribe-data";

import {
  composeBattleScribeCategoryDefinitions,
  type BattleScribeCatalogueCategoryDefinitions,
  type BattleScribeCategoryDefinitions,
} from "./categories.js";
import {
  composeBattleScribeForceDefinitions,
  type BattleScribeCatalogueForceDefinitions,
  type BattleScribeForceDefinitions,
} from "./forces.js";
import {
  materializeBattleScribeVisibleRoots,
  type BattleScribeMaterializationOptions,
  type BattleScribeVisibleRootMaterialization,
  type MaterializedVisibleCatalogueRoots,
} from "./materialize.js";
import {
  inspectBattleScribeProfileTypeContainment,
  type BattleScribeProfileContainmentReport,
} from "./profiles.js";
import type { BattleScribeDataGraph } from "./resolve.js";

export type BattleScribeCatalogueContextOptions =
  BattleScribeMaterializationOptions;

export interface BattleScribeCatalogueContext {
  readonly graph: BattleScribeDataGraph;
  readonly document: ParsedBattleScribeDocument;
  readonly roots: MaterializedVisibleCatalogueRoots;
  readonly forces: BattleScribeCatalogueForceDefinitions;
  readonly categories: BattleScribeCatalogueCategoryDefinitions;
}

export interface BattleScribeCatalogueContexts {
  readonly graph: BattleScribeDataGraph;
  readonly roots: BattleScribeVisibleRootMaterialization;
  readonly forces: BattleScribeForceDefinitions;
  readonly categories: BattleScribeCategoryDefinitions;
  readonly profileContainment: BattleScribeProfileContainmentReport;
  readonly catalogues: readonly BattleScribeCatalogueContext[];
  readonly byDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    BattleScribeCatalogueContext
  >;
}

export function composeBattleScribeCatalogueContexts(
  graph: BattleScribeDataGraph,
  options: BattleScribeCatalogueContextOptions = {},
): Result<BattleScribeCatalogueContexts> {
  const diagnostics: Diagnostic[] = [];

  const roots = materializeBattleScribeVisibleRoots(graph, options);
  diagnostics.push(...roots.diagnostics);
  if (!roots.ok) {
    return failure(diagnostics);
  }

  const forces = composeBattleScribeForceDefinitions(graph);
  diagnostics.push(...forces.diagnostics);
  if (!forces.ok) {
    return failure(diagnostics);
  }

  const categories = composeBattleScribeCategoryDefinitions(graph);
  diagnostics.push(...categories.diagnostics);
  if (!categories.ok) {
    return failure(diagnostics);
  }

  const profileContainment = inspectBattleScribeProfileTypeContainment(graph);
  diagnostics.push(...profileContainment.diagnostics);
  if (!profileContainment.ok) {
    return failure(diagnostics);
  }

  const catalogues: BattleScribeCatalogueContext[] = [];
  for (const rootView of roots.value.catalogues) {
    const forceView = forces.value.byDocument.get(rootView.document);
    const categoryView = categories.value.byDocument.get(rootView.document);
    if (forceView === undefined || categoryView === undefined) {
      diagnostics.push(inconsistentViewDiagnostic(rootView.document));
      return failure(diagnostics);
    }
    catalogues.push({
      graph,
      document: rootView.document,
      roots: rootView,
      forces: forceView,
      categories: categoryView,
    });
  }

  return success(
    {
      graph,
      roots: roots.value,
      forces: forces.value,
      categories: categories.value,
      profileContainment: profileContainment.value,
      catalogues,
      byDocument: new Map(catalogues.map((view) => [view.document, view])),
    },
    diagnostics,
  );
}

function inconsistentViewDiagnostic(
  document: ParsedBattleScribeDocument,
): Diagnostic {
  return {
    code: "BS_CATALOGUE_CONTEXT_INCONSISTENT_VIEW",
    message: `Catalogue context components disagree for document ${document.metadata.id}.`,
    severity: "error",
    impacts: ["internal"],
    location: {
      source: document.projection.source,
      path: document.projection.path,
    },
    details: { documentId: document.metadata.id },
  };
}
