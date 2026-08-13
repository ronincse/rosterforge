import {
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
} from "@rosterforge/foundation";

import type {
  BattleScribeProjection,
  CatalogueLinkProjection,
  EntryLinkProjection,
  ParsedBattleScribeDocument,
  SelectionEntryGroupProjection,
  SelectionEntryProjection,
} from "@rosterforge/battlescribe-data";

import type {
  BattleScribeDataGraph,
  BattleScribeGraphReference,
} from "./resolve.js";

export type BattleScribeRootImportStatus =
  | "disabled"
  | "resolved"
  | "missing"
  | "ambiguous"
  | "alreadyVisible";

export type BattleScribeRootOrigin =
  | {
      readonly kind: "catalogue";
    }
  | {
      readonly kind: "gameSystem";
      readonly document: ParsedBattleScribeDocument;
    }
  | {
      readonly kind: "catalogueImport";
      readonly path: readonly CatalogueLinkProjection[];
    };

interface BattleScribeVisibleRootBase {
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly origin: BattleScribeRootOrigin;
}

export interface BattleScribeVisibleSelectionEntryRoot
  extends BattleScribeVisibleRootBase {
  readonly kind: "selectionEntry";
  readonly source: SelectionEntryProjection;
}

export interface BattleScribeVisibleSelectionEntryGroupRoot
  extends BattleScribeVisibleRootBase {
  readonly kind: "selectionEntryGroup";
  readonly source: SelectionEntryGroupProjection;
}

export interface BattleScribeVisibleEntryLinkRoot
  extends BattleScribeVisibleRootBase {
  readonly kind: "entryLink";
  readonly source: EntryLinkProjection;
}

export type BattleScribeVisibleRoot =
  | BattleScribeVisibleSelectionEntryRoot
  | BattleScribeVisibleSelectionEntryGroupRoot
  | BattleScribeVisibleEntryLinkRoot;

export interface BattleScribeCatalogueRootImport {
  readonly link: CatalogueLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly targetId: ObjectId | undefined;
  readonly status: BattleScribeRootImportStatus;
  readonly targetDocuments: readonly ParsedBattleScribeDocument[];
  readonly path: readonly CatalogueLinkProjection[];
}

export interface BattleScribeGameSystemRootImport {
  readonly targetId: ObjectId;
  readonly status: "resolved" | "missing" | "ambiguous";
  readonly targetDocuments: readonly ParsedBattleScribeDocument[];
}

export interface BattleScribeCatalogueRootVisibility {
  readonly document: ParsedBattleScribeDocument;
  readonly gameSystem?: BattleScribeGameSystemRootImport;
  readonly catalogueImports: readonly BattleScribeCatalogueRootImport[];
  readonly selectionEntries: readonly BattleScribeVisibleSelectionEntryRoot[];
  readonly selectionEntryGroups: readonly BattleScribeVisibleSelectionEntryGroupRoot[];
  readonly entryLinks: readonly BattleScribeVisibleEntryLinkRoot[];
  readonly roots: readonly BattleScribeVisibleRoot[];
}

export interface BattleScribeRootVisibility {
  readonly graph: BattleScribeDataGraph;
  readonly catalogues: readonly BattleScribeCatalogueRootVisibility[];
  readonly byDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    BattleScribeCatalogueRootVisibility
  >;
}

interface MutableCatalogueVisibility {
  document: ParsedBattleScribeDocument;
  gameSystem?: BattleScribeGameSystemRootImport;
  catalogueImports: BattleScribeCatalogueRootImport[];
  selectionEntries: BattleScribeVisibleSelectionEntryRoot[];
  selectionEntryGroups: BattleScribeVisibleSelectionEntryGroupRoot[];
  entryLinks: BattleScribeVisibleEntryLinkRoot[];
  roots: BattleScribeVisibleRoot[];
  seenRoots: Set<object>;
}

interface PendingCatalogueLink {
  readonly link: CatalogueLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly path: readonly CatalogueLinkProjection[];
}

export function resolveBattleScribeRootVisibility(
  graph: BattleScribeDataGraph,
): Result<BattleScribeRootVisibility> {
  const diagnostics: Diagnostic[] = [];
  const diagnosticKeys = new Set<string>();
  const referencesBySource = new Map<object, BattleScribeGraphReference>();
  for (const reference of graph.references) {
    if (
      reference.kind === "catalogueLink" ||
      reference.kind === "catalogueGameSystem"
    ) {
      referencesBySource.set(reference.source, reference);
    }
  }

  const catalogues = graph.documents
    .filter((document) => document.projection.kind === "catalogue")
    .map((document) =>
      visibilityForCatalogue(
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

function visibilityForCatalogue(
  document: ParsedBattleScribeDocument,
  referencesBySource: ReadonlyMap<object, BattleScribeGraphReference>,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): BattleScribeCatalogueRootVisibility {
  const view: MutableCatalogueVisibility = {
    document,
    catalogueImports: [],
    selectionEntries: [],
    selectionEntryGroups: [],
    entryLinks: [],
    roots: [],
    seenRoots: new Set(),
  };
  appendRoots(view, document, { kind: "catalogue" }, false);
  importGameSystemRoots(
    view,
    referencesBySource.get(document.projection),
    diagnostics,
    diagnosticKeys,
  );

  const visitedDocuments = new Set<ParsedBattleScribeDocument>([document]);
  const pending = rootLinkTasks(document, []);
  while (pending.length > 0) {
    const task = pending.pop();
    if (task === undefined) {
      break;
    }
    processCatalogueLink(
      task,
      view,
      pending,
      visitedDocuments,
      referencesBySource,
      diagnostics,
      diagnosticKeys,
    );
  }

  return view;
}

function importGameSystemRoots(
  view: MutableCatalogueVisibility,
  reference: BattleScribeGraphReference | undefined,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): void {
  const targetId = view.document.projection.metadata.gameSystemId;
  if (targetId === undefined) {
    return;
  }
  const targets = catalogueDocuments(reference, "gameSystem");
  const status = targetStatus(targets);
  view.gameSystem = { targetId, status, targetDocuments: targets };

  if (status === "resolved") {
    const target = targets[0];
    if (target !== undefined) {
      appendRoots(view, target, { kind: "gameSystem", document: target }, true);
    }
    return;
  }

  pushDiagnostic(
    diagnostics,
    diagnosticKeys,
    status === "missing"
      ? "BS_ROOT_VISIBILITY_MISSING_GAME_SYSTEM"
      : "BS_ROOT_VISIBILITY_AMBIGUOUS_GAME_SYSTEM",
    status === "missing"
      ? `Cannot import roots from missing game system ${targetId}.`
      : `Cannot import roots from ambiguous game system ${targetId}.`,
    view.document.projection,
    "@gameSystemId",
    { targetId, candidates: targets.length },
  );
}

function processCatalogueLink(
  task: PendingCatalogueLink,
  view: MutableCatalogueVisibility,
  pending: PendingCatalogueLink[],
  visitedDocuments: Set<ParsedBattleScribeDocument>,
  referencesBySource: ReadonlyMap<object, BattleScribeGraphReference>,
  diagnostics: Diagnostic[],
  diagnosticKeys: Set<string>,
): void {
  const { link, sourceDocument, path } = task;
  const targets = catalogueDocuments(referencesBySource.get(link), "catalogue");
  if (link.importRootEntries !== true) {
    view.catalogueImports.push({
      link,
      sourceDocument,
      targetId: link.targetId,
      status: "disabled",
      targetDocuments: targets,
      path,
    });
    return;
  }

  const targetStatusValue = targetStatus(targets);
  if (targetStatusValue !== "resolved") {
    view.catalogueImports.push({
      link,
      sourceDocument,
      targetId: link.targetId,
      status: targetStatusValue,
      targetDocuments: targets,
      path,
    });
    pushDiagnostic(
      diagnostics,
      diagnosticKeys,
      targetStatusValue === "missing"
        ? "BS_ROOT_VISIBILITY_MISSING_CATALOGUE"
        : "BS_ROOT_VISIBILITY_AMBIGUOUS_CATALOGUE",
      targetStatusValue === "missing"
        ? `Cannot import roots from missing catalogue ${link.targetId ?? "target"}.`
        : `Cannot import roots from ambiguous catalogue ${link.targetId ?? "target"}.`,
      link,
      "@targetId",
      { targetId: link.targetId, candidates: targets.length },
    );
    return;
  }

  const target = targets[0];
  if (target === undefined) {
    return;
  }
  if (visitedDocuments.has(target)) {
    view.catalogueImports.push({
      link,
      sourceDocument,
      targetId: link.targetId,
      status: "alreadyVisible",
      targetDocuments: targets,
      path,
    });
    return;
  }

  visitedDocuments.add(target);
  view.catalogueImports.push({
    link,
    sourceDocument,
    targetId: link.targetId,
    status: "resolved",
    targetDocuments: targets,
    path,
  });
  appendRoots(view, target, { kind: "catalogueImport", path }, true);
  pending.push(...rootLinkTasks(target, path));
}

function rootLinkTasks(
  document: ParsedBattleScribeDocument,
  parentPath: readonly CatalogueLinkProjection[],
): PendingCatalogueLink[] {
  return [...document.projection.catalogueLinks]
    .reverse()
    .map((link) => ({
      link,
      sourceDocument: document,
      path: [...parentPath, link],
    }));
}

function appendRoots(
  view: MutableCatalogueVisibility,
  sourceDocument: ParsedBattleScribeDocument,
  origin: BattleScribeRootOrigin,
  imported: boolean,
): void {
  const projection = sourceDocument.projection;
  for (const source of eligible(projection.selectionEntries, imported)) {
    appendRoot(view, {
      kind: "selectionEntry",
      source,
      sourceDocument,
      origin,
    });
  }
  for (const source of eligible(projection.selectionEntryGroups, imported)) {
    appendRoot(view, {
      kind: "selectionEntryGroup",
      source,
      sourceDocument,
      origin,
    });
  }
  for (const source of eligible(projection.entryLinks, imported)) {
    appendRoot(view, { kind: "entryLink", source, sourceDocument, origin });
  }
}

function eligible<
  T extends SelectionEntryProjection | SelectionEntryGroupProjection | EntryLinkProjection,
>(roots: readonly T[], imported: boolean): readonly T[] {
  return imported ? roots.filter((root) => root.import === true) : roots;
}

function appendRoot(
  view: MutableCatalogueVisibility,
  root: BattleScribeVisibleRoot,
): void {
  if (view.seenRoots.has(root.source)) {
    return;
  }
  view.seenRoots.add(root.source);
  view.roots.push(root);
  if (root.kind === "selectionEntry") {
    view.selectionEntries.push(root);
  } else if (root.kind === "selectionEntryGroup") {
    view.selectionEntryGroups.push(root);
  } else {
    view.entryLinks.push(root);
  }
}

function catalogueDocuments(
  reference: BattleScribeGraphReference | undefined,
  kind: "catalogue" | "gameSystem",
): readonly ParsedBattleScribeDocument[] {
  return (
    reference?.targets
      .filter((target) => target.kind === kind)
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
  source: BattleScribeProjection | CatalogueLinkProjection,
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
