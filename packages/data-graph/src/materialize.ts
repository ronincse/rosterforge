import {
  failure,
  success,
  type Diagnostic,
  type ObjectId,
  type Result,
} from "@rosterforge/foundation";

import type {
  EntryLinkProjection,
  InfoGroupProjection,
  InfoLinkProjection,
  ParsedBattleScribeDocument,
  ProfileProjection,
  ProjectedBattleScribeNode,
  RuleProjection,
  SelectionContainerProjection,
  SelectionEntryGroupProjection,
  SelectionEntryProjection,
} from "@rosterforge/battlescribe-data";

import {
  battleScribeReachableObjectsById,
  type BattleScribeDataGraph,
  type BattleScribeGraphObject,
  type BattleScribeGraphObjectKind,
} from "./resolve.js";
import {
  resolveBattleScribeRootVisibility,
  type BattleScribeCatalogueRootVisibility,
  type BattleScribeRootVisibility,
  type BattleScribeVisibleEntryLinkRoot,
  type BattleScribeVisibleRoot,
  type BattleScribeVisibleSelectionEntryGroupRoot,
  type BattleScribeVisibleSelectionEntryRoot,
} from "./visibility.js";

export type UnresolvedEntryLinkReason =
  | "missingTargetId"
  | "missingTarget"
  | "targetKindMismatch"
  | "ambiguousTarget"
  | "cycle"
  | "resourceLimit";

export type UnresolvedInfoLinkReason =
  | UnresolvedEntryLinkReason
  | "unprojectedTarget"
  | "unsupportedType";

export interface BattleScribeMaterializationLimits {
  readonly maxEntryLinkDepth: number;
  readonly maxExpandedEntryLinks: number;
  readonly maxTotalExpandedEntryLinks: number;
}

export const defaultBattleScribeMaterializationLimits: BattleScribeMaterializationLimits = {
  maxEntryLinkDepth: 64,
  maxExpandedEntryLinks: 50_000,
  maxTotalExpandedEntryLinks: 250_000,
};

export interface BattleScribeMaterializationOptions {
  readonly limits?: Partial<BattleScribeMaterializationLimits>;
}

export interface MaterializedSelectionContainer {
  readonly selectionEntries: readonly MaterializedSelectionEntry[];
  readonly selectionEntryGroups: readonly MaterializedSelectionEntryGroup[];
  readonly entryLinks: readonly MaterializedEntryLink[];
  readonly categoryLinks: SelectionContainerProjection["categoryLinks"];
  readonly infoLinks: SelectionContainerProjection["infoLinks"];
  readonly infoGroups: SelectionContainerProjection["infoGroups"];
  readonly materializedInfoLinks: readonly MaterializedInfoLink[];
  readonly materializedInfoGroups: readonly MaterializedInfoGroup[];
  readonly rules: SelectionContainerProjection["rules"];
  readonly profiles: SelectionContainerProjection["profiles"];
  readonly costs: SelectionContainerProjection["costs"];
  readonly constraints: SelectionContainerProjection["constraints"];
  readonly modifiers: SelectionContainerProjection["modifiers"];
  readonly modifierGroups: SelectionContainerProjection["modifierGroups"];
  readonly publicationLinks: SelectionContainerProjection["publicationLinks"];
}

export interface MaterializedSelectionNodeBase
  extends MaterializedSelectionContainer {
  readonly occurrence: SelectionEntryProjection | SelectionEntryGroupProjection | EntryLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly definitionDocument: ParsedBattleScribeDocument;
  readonly link?: EntryLinkProjection;
  readonly id?: ObjectId;
  readonly definitionId?: ObjectId;
  readonly name?: string;
  readonly hidden?: boolean;
  readonly collective?: boolean;
  readonly import?: boolean;
  readonly defaultAmount?: string;
  readonly step?: string;
}

export interface MaterializedSelectionEntry
  extends MaterializedSelectionNodeBase {
  readonly kind: "selectionEntry";
  readonly occurrence: SelectionEntryProjection | EntryLinkProjection;
  readonly definition: SelectionEntryProjection;
  readonly type?: string;
}

export interface MaterializedSelectionEntryGroup
  extends MaterializedSelectionNodeBase {
  readonly kind: "selectionEntryGroup";
  readonly occurrence: SelectionEntryGroupProjection | EntryLinkProjection;
  readonly definition: SelectionEntryGroupProjection;
  readonly defaultSelectionEntryId?: ObjectId;
}

export interface UnresolvedMaterializedEntryLink {
  readonly kind: "unresolvedEntryLink";
  readonly reason: UnresolvedEntryLinkReason;
  readonly link: EntryLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly candidates: readonly BattleScribeGraphObject[];
}

export type MaterializedEntryLink =
  | MaterializedSelectionEntry
  | MaterializedSelectionEntryGroup
  | UnresolvedMaterializedEntryLink;

export interface MaterializedInfoLinkBase {
  readonly link: InfoLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly definitionDocument: ParsedBattleScribeDocument;
  readonly id?: ObjectId;
  readonly definitionId?: ObjectId;
  readonly name?: string;
  readonly hidden?: boolean;
}

export interface MaterializedRuleInfoLink extends MaterializedInfoLinkBase {
  readonly kind: "ruleInfoLink";
  readonly definition: RuleProjection;
  readonly description?: string;
  readonly publicationLinks: RuleProjection["publicationLinks"];
}

export interface MaterializedProfileInfoLink extends MaterializedInfoLinkBase {
  readonly kind: "profileInfoLink";
  readonly definition: ProfileProjection;
  readonly typeId?: ObjectId;
  readonly typeName?: string;
  readonly characteristics: ProfileProjection["characteristics"];
  readonly modifiers: ProfileProjection["modifiers"];
  readonly modifierGroups: ProfileProjection["modifierGroups"];
  readonly publicationLinks: ProfileProjection["publicationLinks"];
}

export interface MaterializedInfoGroup {
  readonly kind: "infoGroup";
  readonly occurrence: InfoGroupProjection | InfoLinkProjection;
  readonly definition: InfoGroupProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly definitionDocument: ParsedBattleScribeDocument;
  readonly link?: InfoLinkProjection;
  readonly id?: ObjectId;
  readonly definitionId?: ObjectId;
  readonly name?: string;
  readonly hidden?: boolean;
  readonly infoLinks: InfoGroupProjection["infoLinks"];
  readonly infoGroups: InfoGroupProjection["infoGroups"];
  readonly materializedInfoLinks: readonly MaterializedInfoLink[];
  readonly materializedInfoGroups: readonly MaterializedInfoGroup[];
  readonly rules: InfoGroupProjection["rules"];
  readonly profiles: InfoGroupProjection["profiles"];
  readonly modifiers: InfoGroupProjection["modifiers"];
  readonly modifierGroups: InfoGroupProjection["modifierGroups"];
  readonly publicationLinks: InfoGroupProjection["publicationLinks"];
}

export interface UnresolvedMaterializedInfoLink {
  readonly kind: "unresolvedInfoLink";
  readonly reason: UnresolvedInfoLinkReason;
  readonly link: InfoLinkProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly candidates: readonly BattleScribeGraphObject[];
}

export type MaterializedInfoLink =
  | MaterializedRuleInfoLink
  | MaterializedProfileInfoLink
  | MaterializedInfoGroup
  | UnresolvedMaterializedInfoLink;

export interface MaterializedBattleScribeDocument {
  readonly document: ParsedBattleScribeDocument;
  readonly selectionEntries: readonly MaterializedSelectionEntry[];
  readonly selectionEntryGroups: readonly MaterializedSelectionEntryGroup[];
  readonly entryLinks: readonly MaterializedEntryLink[];
}

export interface BattleScribeSelectionMaterialization {
  readonly graph: BattleScribeDataGraph;
  readonly documents: readonly MaterializedBattleScribeDocument[];
  readonly limits: BattleScribeMaterializationLimits;
  readonly expandedEntryLinks: number;
  readonly truncated: boolean;
}

export interface MaterializedVisibleSelectionEntryRoot {
  readonly kind: "selectionEntry";
  readonly visible: BattleScribeVisibleSelectionEntryRoot;
  readonly materialized: MaterializedSelectionEntry;
}

export interface MaterializedVisibleSelectionEntryGroupRoot {
  readonly kind: "selectionEntryGroup";
  readonly visible: BattleScribeVisibleSelectionEntryGroupRoot;
  readonly materialized: MaterializedSelectionEntryGroup;
}

export interface MaterializedVisibleEntryLinkRoot {
  readonly kind: "entryLink";
  readonly visible: BattleScribeVisibleEntryLinkRoot;
  readonly materialized: MaterializedEntryLink;
}

export type MaterializedVisibleRoot =
  | MaterializedVisibleSelectionEntryRoot
  | MaterializedVisibleSelectionEntryGroupRoot
  | MaterializedVisibleEntryLinkRoot;

export interface MaterializedVisibleCatalogueRoots {
  readonly document: ParsedBattleScribeDocument;
  readonly visibility: BattleScribeCatalogueRootVisibility;
  readonly selectionEntries: readonly MaterializedVisibleSelectionEntryRoot[];
  readonly selectionEntryGroups: readonly MaterializedVisibleSelectionEntryGroupRoot[];
  readonly entryLinks: readonly MaterializedVisibleEntryLinkRoot[];
  readonly roots: readonly MaterializedVisibleRoot[];
}

export interface BattleScribeVisibleRootMaterialization {
  readonly graph: BattleScribeDataGraph;
  readonly visibility: BattleScribeRootVisibility;
  readonly catalogues: readonly MaterializedVisibleCatalogueRoots[];
  readonly byDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    MaterializedVisibleCatalogueRoots
  >;
  readonly limits: BattleScribeMaterializationLimits;
  readonly expandedEntryLinks: number;
  readonly truncated: boolean;
}

interface MaterializationContext {
  readonly graph: BattleScribeDataGraph;
  readonly limits: BattleScribeMaterializationLimits;
  readonly diagnostics: Diagnostic[];
  readonly emittedDiagnostics: Set<string>;
  readonly totalExpandedEntryLinks: { value: number };
  expandedEntryLinks: number;
  truncated: boolean;
}

type SelectionDefinition =
  | SelectionEntryProjection
  | SelectionEntryGroupProjection;

export function materializeBattleScribeSelections(
  graph: BattleScribeDataGraph,
  options: BattleScribeMaterializationOptions = {},
): Result<BattleScribeSelectionMaterialization> {
  const limits = {
    ...defaultBattleScribeMaterializationLimits,
    ...options.limits,
  };
  const context: MaterializationContext = {
    graph,
    limits,
    diagnostics: [],
    emittedDiagnostics: new Set(),
    totalExpandedEntryLinks: { value: 0 },
    expandedEntryLinks: 0,
    truncated: false,
  };
  const documents = graph.documents.map((document) => ({
    document,
    selectionEntries: document.projection.selectionEntries.map((entry) =>
      materializeEntry(entry, document, undefined, document, [entry], 0, context),
    ),
    selectionEntryGroups: document.projection.selectionEntryGroups.map((group) =>
      materializeGroup(group, document, undefined, document, [group], 0, context),
    ),
    entryLinks: document.projection.entryLinks.map((link) =>
      materializeEntryLink(link, document, [], 0, context),
    ),
  }));

  return success({
    graph,
    documents,
    limits,
    expandedEntryLinks: context.expandedEntryLinks,
    truncated: context.truncated,
  }, context.diagnostics);
}

export function materializeBattleScribeVisibleRoots(
  graph: BattleScribeDataGraph,
  options: BattleScribeMaterializationOptions = {},
): Result<BattleScribeVisibleRootMaterialization> {
  const visibility = resolveBattleScribeRootVisibility(graph);
  if (!visibility.ok) {
    return failure(visibility.diagnostics);
  }

  const limits = {
    ...defaultBattleScribeMaterializationLimits,
    ...options.limits,
  };
  const diagnostics: Diagnostic[] = [];
  const emittedDiagnostics = new Set<string>();
  const totalExpandedEntryLinks = { value: 0 };
  let truncated = false;
  const materializedBySource = new Map<object, MaterializedVisibleRoot["materialized"]>();
  const catalogues = visibility.value.catalogues.map((catalogue) => {
    const context: MaterializationContext = {
      graph,
      limits,
      diagnostics,
      emittedDiagnostics,
      totalExpandedEntryLinks,
      expandedEntryLinks: 0,
      truncated: false,
    };
    const materialized = materializeVisibleCatalogue(
      catalogue,
      materializedBySource,
      context,
    );
    truncated ||= context.truncated;
    return materialized;
  });

  return success(
    {
      graph,
      visibility: visibility.value,
      catalogues,
      byDocument: new Map(catalogues.map((view) => [view.document, view])),
      limits,
      expandedEntryLinks: totalExpandedEntryLinks.value,
      truncated,
    },
    [...visibility.diagnostics, ...diagnostics],
  );
}

function materializeVisibleCatalogue(
  visibility: BattleScribeCatalogueRootVisibility,
  materializedBySource: Map<object, MaterializedVisibleRoot["materialized"]>,
  context: MaterializationContext,
): MaterializedVisibleCatalogueRoots {
  const roots = visibility.roots.map((root) =>
    materializeVisibleRoot(root, materializedBySource, context),
  );
  return {
    document: visibility.document,
    visibility,
    selectionEntries: roots.filter(
      (root): root is MaterializedVisibleSelectionEntryRoot =>
        root.kind === "selectionEntry",
    ),
    selectionEntryGroups: roots.filter(
      (root): root is MaterializedVisibleSelectionEntryGroupRoot =>
        root.kind === "selectionEntryGroup",
    ),
    entryLinks: roots.filter(
      (root): root is MaterializedVisibleEntryLinkRoot =>
        root.kind === "entryLink",
    ),
    roots,
  };
}

function materializeVisibleRoot(
  visible: BattleScribeVisibleRoot,
  materializedBySource: Map<object, MaterializedVisibleRoot["materialized"]>,
  context: MaterializationContext,
): MaterializedVisibleRoot {
  const cached = materializedBySource.get(visible.source);
  if (visible.kind === "selectionEntry") {
    const materialized =
      cached?.kind === "selectionEntry"
        ? cached
        : materializeEntry(
            visible.source,
            visible.sourceDocument,
            undefined,
            visible.sourceDocument,
            [visible.source],
            0,
            context,
          );
    materializedBySource.set(visible.source, materialized);
    return { kind: "selectionEntry", visible, materialized };
  }
  if (visible.kind === "selectionEntryGroup") {
    const materialized =
      cached?.kind === "selectionEntryGroup"
        ? cached
        : materializeGroup(
            visible.source,
            visible.sourceDocument,
            undefined,
            visible.sourceDocument,
            [visible.source],
            0,
            context,
          );
    materializedBySource.set(visible.source, materialized);
    return { kind: "selectionEntryGroup", visible, materialized };
  }

  const materialized =
    cached === undefined
      ? materializeEntryLink(
          visible.source,
          visible.sourceDocument,
          [],
          0,
          context,
        )
      : cached;
  materializedBySource.set(visible.source, materialized);
  return { kind: "entryLink", visible, materialized };
}

function materializeEntry(
  definition: SelectionEntryProjection,
  definitionDocument: ParsedBattleScribeDocument,
  link: EntryLinkProjection | undefined,
  sourceDocument: ParsedBattleScribeDocument,
  stack: readonly SelectionDefinition[],
  linkDepth: number,
  context: MaterializationContext,
): MaterializedSelectionEntry {
  const occurrence = link ?? definition;
  const common = materializeContainer(
    definition,
    definitionDocument,
    link,
    sourceDocument,
    stack,
    linkDepth,
    context,
  );
  const id = occurrence.id;
  const definitionId = definition.id;
  const name = inherited(link?.name, definition.name);
  const hidden = inherited(link?.hidden, definition.hidden);
  const collective = inherited(link?.collective, definition.collective);
  const imported = inherited(link?.import, definition.import);
  const defaultAmount = inherited(
    link?.defaultAmount,
    definition.defaultAmount,
  );
  const step = inherited(link?.step, definition.step);

  return {
    kind: "selectionEntry",
    occurrence,
    definition,
    sourceDocument,
    definitionDocument,
    ...optionalProperty("link", link),
    ...optionalProperty("id", id),
    ...optionalProperty("definitionId", definitionId),
    ...optionalProperty("name", name),
    ...optionalProperty("hidden", hidden),
    ...optionalProperty("collective", collective),
    ...optionalProperty("import", imported),
    ...optionalProperty("defaultAmount", defaultAmount),
    ...optionalProperty("step", step),
    ...optionalProperty("type", definition.type),
    ...common,
  };
}

function materializeGroup(
  definition: SelectionEntryGroupProjection,
  definitionDocument: ParsedBattleScribeDocument,
  link: EntryLinkProjection | undefined,
  sourceDocument: ParsedBattleScribeDocument,
  stack: readonly SelectionDefinition[],
  linkDepth: number,
  context: MaterializationContext,
): MaterializedSelectionEntryGroup {
  const occurrence = link ?? definition;
  const common = materializeContainer(
    definition,
    definitionDocument,
    link,
    sourceDocument,
    stack,
    linkDepth,
    context,
  );
  const id = occurrence.id;
  const definitionId = definition.id;
  const name = inherited(link?.name, definition.name);
  const hidden = inherited(link?.hidden, definition.hidden);
  const collective = inherited(link?.collective, definition.collective);
  const imported = inherited(link?.import, definition.import);

  return {
    kind: "selectionEntryGroup",
    occurrence,
    definition,
    sourceDocument,
    definitionDocument,
    ...optionalProperty("link", link),
    ...optionalProperty("id", id),
    ...optionalProperty("definitionId", definitionId),
    ...optionalProperty("name", name),
    ...optionalProperty("hidden", hidden),
    ...optionalProperty("collective", collective),
    ...optionalProperty("import", imported),
    ...optionalProperty("defaultAmount", link?.defaultAmount),
    ...optionalProperty("step", link?.step),
    ...optionalProperty(
      "defaultSelectionEntryId",
      definition.defaultSelectionEntryId,
    ),
    ...common,
  };
}

function materializeContainer(
  definition: SelectionDefinition,
  definitionDocument: ParsedBattleScribeDocument,
  link: EntryLinkProjection | undefined,
  sourceDocument: ParsedBattleScribeDocument,
  stack: readonly SelectionDefinition[],
  linkDepth: number,
  context: MaterializationContext,
): MaterializedSelectionContainer {
  return {
    selectionEntries: [
      ...definition.selectionEntries.map((entry) =>
        materializeEntry(entry, definitionDocument, undefined, definitionDocument, [...stack, entry], linkDepth, context),
      ),
      ...(link?.selectionEntries.map((entry) =>
        materializeEntry(entry, sourceDocument, undefined, sourceDocument, [...stack, entry], linkDepth, context),
      ) ?? []),
    ],
    selectionEntryGroups: [
      ...definition.selectionEntryGroups.map((group) =>
        materializeGroup(group, definitionDocument, undefined, definitionDocument, [...stack, group], linkDepth, context),
      ),
      ...(link?.selectionEntryGroups.map((group) =>
        materializeGroup(group, sourceDocument, undefined, sourceDocument, [...stack, group], linkDepth, context),
      ) ?? []),
    ],
    entryLinks: [
      ...definition.entryLinks.map((childLink) =>
        materializeEntryLink(childLink, definitionDocument, stack, linkDepth, context),
      ),
      ...(link?.entryLinks.map((childLink) =>
        materializeEntryLink(childLink, sourceDocument, stack, linkDepth, context),
      ) ?? []),
    ],
    categoryLinks: combined(definition.categoryLinks, link?.categoryLinks),
    infoLinks: combined(definition.infoLinks, link?.infoLinks),
    infoGroups: combined(definition.infoGroups, link?.infoGroups),
    materializedInfoLinks: [
      ...definition.infoLinks.map((infoLink) =>
        materializeInfoLink(infoLink, definitionDocument, context),
      ),
      ...(link?.infoLinks.map((infoLink) =>
        materializeInfoLink(infoLink, sourceDocument, context),
      ) ?? []),
    ],
    materializedInfoGroups: [
      ...definition.infoGroups.map((infoGroup) =>
        materializeInfoGroup(
          infoGroup,
          definitionDocument,
          undefined,
          definitionDocument,
          [infoGroup],
          context,
        ),
      ),
      ...(link?.infoGroups.map((infoGroup) =>
        materializeInfoGroup(
          infoGroup,
          sourceDocument,
          undefined,
          sourceDocument,
          [infoGroup],
          context,
        ),
      ) ?? []),
    ],
    rules: combined(definition.rules, link?.rules),
    profiles: combined(definition.profiles, link?.profiles),
    costs: combined(definition.costs, link?.costs),
    constraints: combined(definition.constraints, link?.constraints),
    modifiers: combined(definition.modifiers, link?.modifiers),
    modifierGroups: combined(definition.modifierGroups, link?.modifierGroups),
    publicationLinks: combined(
      definition.publicationLinks,
      link?.publicationLinks,
    ),
  };
}

function materializeInfoLink(
  link: InfoLinkProjection,
  sourceDocument: ParsedBattleScribeDocument,
  context: MaterializationContext,
  infoGroupStack: readonly InfoGroupProjection[] = [],
): MaterializedInfoLink {
  if (link.targetId === undefined) {
    return unresolvedInfoLink(
      link,
      sourceDocument,
      "missingTargetId",
      [],
      "BS_MATERIALIZATION_MISSING_TARGET",
      "Info link has no target ID.",
      context,
    );
  }

  const expectedKinds = expectedInfoLinkKinds(link);
  if (expectedKinds.length === 0) {
    return opaqueInfoLink(link, sourceDocument, "unsupportedType");
  }

  const allCandidates = battleScribeReachableObjectsById(
    context.graph,
    sourceDocument,
    link.targetId,
  );
  const candidates = allCandidates.filter((candidate) =>
    expectedKinds.includes(candidate.kind),
  );

  if (candidates.length === 0) {
    if (allCandidates.length === 0) {
      const reachableDocuments =
        context.graph.reachableDocumentsByDocument.get(sourceDocument) ??
        new Set([sourceDocument]);
      const unprojectedTargets = (
        context.graph.genericElementsById.get(link.targetId) ?? []
      ).filter(({ document }) => reachableDocuments.has(document));
      if (unprojectedTargets.length > 0) {
        return opaqueInfoLink(link, sourceDocument, "unprojectedTarget");
      }
    }
    const mismatch = allCandidates.length > 0;
    return unresolvedInfoLink(
      link,
      sourceDocument,
      mismatch ? "targetKindMismatch" : "missingTarget",
      allCandidates,
      mismatch
        ? "BS_MATERIALIZATION_TARGET_KIND_MISMATCH"
        : "BS_MATERIALIZATION_MISSING_TARGET",
      mismatch
        ? `Info link target ${link.targetId} has an incompatible kind.`
        : `Info link target ${link.targetId} is missing.`,
      context,
      { expectedKinds },
    );
  }

  if (candidates.length > 1) {
    return unresolvedInfoLink(
      link,
      sourceDocument,
      "ambiguousTarget",
      candidates,
      "BS_MATERIALIZATION_AMBIGUOUS_TARGET",
      `Info link target ${link.targetId} is ambiguous.`,
      context,
      { expectedKinds },
    );
  }

  const target = candidates[0];
  if (target === undefined) {
    throw new Error("A single info materialization candidate must exist.");
  }
  if (target.kind === "rule") {
    return materializedRuleInfoLink(
      link,
      target.source as RuleProjection,
      sourceDocument,
      target.document,
    );
  }
  if (target.kind === "infoGroup") {
    const definition = target.source as InfoGroupProjection;
    const cycleStart = infoGroupStack.indexOf(definition);
    if (cycleStart !== -1) {
      return unresolvedInfoLink(
        link,
        sourceDocument,
        "cycle",
        candidates,
        "BS_MATERIALIZATION_INFO_LINK_CYCLE",
        `Info-group link cycle detected at target ${link.targetId}.`,
        context,
        {
          cycle: [...infoGroupStack.slice(cycleStart), definition].map(
            (infoGroup) => ({
              id: infoGroup.id,
              path: infoGroup.path,
            }),
          ),
        },
      );
    }
    if (infoGroupStack.length >= context.limits.maxEntryLinkDepth) {
      context.truncated = true;
      return unresolvedInfoLink(
        link,
        sourceDocument,
        "resourceLimit",
        candidates,
        "BS_MATERIALIZATION_RESOURCE_LIMIT",
        `Info-group link target ${link.targetId} was not expanded because the maxEntryLinkDepth limit was reached.`,
        context,
        {
          limit: "maxEntryLinkDepth",
          configuredLimit: context.limits.maxEntryLinkDepth,
          linkDepth: infoGroupStack.length,
        },
      );
    }
    return materializeInfoGroup(
      definition,
      target.document,
      link,
      sourceDocument,
      [...infoGroupStack, definition],
      context,
    );
  }
  return materializedProfileInfoLink(
    link,
    target.source as ProfileProjection,
    sourceDocument,
    target.document,
  );
}

function materializeInfoGroup(
  definition: InfoGroupProjection,
  definitionDocument: ParsedBattleScribeDocument,
  link: InfoLinkProjection | undefined,
  sourceDocument: ParsedBattleScribeDocument,
  infoGroupStack: readonly InfoGroupProjection[],
  context: MaterializationContext,
): MaterializedInfoGroup {
  const occurrence = link ?? definition;
  return {
    kind: "infoGroup",
    occurrence,
    definition,
    sourceDocument,
    definitionDocument,
    ...optionalProperty("link", link),
    ...optionalProperty("id", occurrence.id),
    ...optionalProperty("definitionId", definition.id),
    ...optionalProperty("name", inherited(link?.name, definition.name)),
    ...optionalProperty("hidden", inherited(link?.hidden, definition.hidden)),
    infoLinks: definition.infoLinks,
    infoGroups: definition.infoGroups,
    materializedInfoLinks: definition.infoLinks.map((infoLink) =>
      materializeInfoLink(
        infoLink,
        definitionDocument,
        context,
        infoGroupStack,
      ),
    ),
    materializedInfoGroups: definition.infoGroups.map((infoGroup) =>
      materializeInfoGroup(
        infoGroup,
        definitionDocument,
        undefined,
        definitionDocument,
        [...infoGroupStack, infoGroup],
        context,
      ),
    ),
    rules: definition.rules,
    profiles: definition.profiles,
    modifiers: definition.modifiers,
    modifierGroups: definition.modifierGroups,
    publicationLinks: definition.publicationLinks,
  };
}

function materializedRuleInfoLink(
  link: InfoLinkProjection,
  definition: RuleProjection,
  sourceDocument: ParsedBattleScribeDocument,
  definitionDocument: ParsedBattleScribeDocument,
): MaterializedRuleInfoLink {
  return {
    kind: "ruleInfoLink",
    link,
    definition,
    sourceDocument,
    definitionDocument,
    ...optionalProperty("id", link.id),
    ...optionalProperty("definitionId", definition.id),
    ...optionalProperty("name", inherited(link.name, definition.name)),
    ...optionalProperty("hidden", inherited(link.hidden, definition.hidden)),
    ...optionalProperty("description", definition.description),
    publicationLinks: definition.publicationLinks,
  };
}

function materializedProfileInfoLink(
  link: InfoLinkProjection,
  definition: ProfileProjection,
  sourceDocument: ParsedBattleScribeDocument,
  definitionDocument: ParsedBattleScribeDocument,
): MaterializedProfileInfoLink {
  return {
    kind: "profileInfoLink",
    link,
    definition,
    sourceDocument,
    definitionDocument,
    ...optionalProperty("id", link.id),
    ...optionalProperty("definitionId", definition.id),
    ...optionalProperty("name", inherited(link.name, definition.name)),
    ...optionalProperty("hidden", inherited(link.hidden, definition.hidden)),
    ...optionalProperty("typeId", definition.typeId),
    ...optionalProperty("typeName", definition.typeName),
    characteristics: definition.characteristics,
    modifiers: definition.modifiers,
    modifierGroups: definition.modifierGroups,
    publicationLinks: definition.publicationLinks,
  };
}

function unresolvedInfoLink(
  link: InfoLinkProjection,
  sourceDocument: ParsedBattleScribeDocument,
  reason: UnresolvedInfoLinkReason,
  candidates: readonly BattleScribeGraphObject[],
  code: string,
  message: string,
  context: MaterializationContext,
  extraDetails: Readonly<Record<string, unknown>> = {},
): UnresolvedMaterializedInfoLink {
  emitDiagnostic(context, link, {
    code,
    message,
    severity: "warning",
    impacts:
      code === "BS_MATERIALIZATION_RESOURCE_LIMIT"
        ? ["resolution", "security"]
        : ["resolution"],
    location: {
      source: link.source,
      path: [...link.path, "@targetId"],
    },
    details: {
      linkKind: "infoLink",
      targetId: link.targetId,
      reason,
      candidates: candidateDetails(candidates),
      ...extraDetails,
    },
  });
  return { kind: "unresolvedInfoLink", reason, link, sourceDocument, candidates };
}

function opaqueInfoLink(
  link: InfoLinkProjection,
  sourceDocument: ParsedBattleScribeDocument,
  reason: "unprojectedTarget" | "unsupportedType",
): UnresolvedMaterializedInfoLink {
  return {
    kind: "unresolvedInfoLink",
    reason,
    link,
    sourceDocument,
    candidates: [],
  };
}

function materializeEntryLink(
  link: EntryLinkProjection,
  sourceDocument: ParsedBattleScribeDocument,
  stack: readonly SelectionDefinition[],
  linkDepth: number,
  context: MaterializationContext,
): MaterializedEntryLink {
  if (link.targetId === undefined) {
    return unresolvedLink(
      link,
      sourceDocument,
      "missingTargetId",
      [],
      "BS_MATERIALIZATION_MISSING_TARGET",
      "Entry link has no target ID.",
      context,
    );
  }

  const allCandidates = battleScribeReachableObjectsById(
    context.graph,
    sourceDocument,
    link.targetId,
  );
  const expectedKinds = expectedEntryLinkKinds(link);
  const candidates = allCandidates.filter((candidate) =>
    expectedKinds.includes(candidate.kind),
  );

  if (candidates.length === 0) {
    const mismatch = allCandidates.length > 0;
    return unresolvedLink(
      link,
      sourceDocument,
      mismatch ? "targetKindMismatch" : "missingTarget",
      allCandidates,
      mismatch
        ? "BS_MATERIALIZATION_TARGET_KIND_MISMATCH"
        : "BS_MATERIALIZATION_MISSING_TARGET",
      mismatch
        ? `Entry link target ${link.targetId} has an incompatible kind.`
        : `Entry link target ${link.targetId} is missing.`,
      context,
      { expectedKinds },
    );
  }

  if (candidates.length > 1) {
    return unresolvedLink(
      link,
      sourceDocument,
      "ambiguousTarget",
      candidates,
      "BS_MATERIALIZATION_AMBIGUOUS_TARGET",
      `Entry link target ${link.targetId} is ambiguous.`,
      context,
      { expectedKinds },
    );
  }

  const target = candidates[0];
  if (target === undefined) {
    throw new Error("A single materialization candidate must exist.");
  }
  const definition = target.source as SelectionDefinition;
  const cycleStart = stack.indexOf(definition);
  if (cycleStart !== -1) {
    return unresolvedLink(
      link,
      sourceDocument,
      "cycle",
      candidates,
      "BS_MATERIALIZATION_ENTRY_LINK_CYCLE",
      `Entry link cycle detected at target ${link.targetId}.`,
      context,
      {
        cycle: [...stack.slice(cycleStart), definition].map((entry) => ({
          id: entry.id,
          path: entry.path,
        })),
      },
    );
  }

  if (
    linkDepth >= context.limits.maxEntryLinkDepth ||
    context.expandedEntryLinks >= context.limits.maxExpandedEntryLinks ||
    context.totalExpandedEntryLinks.value >=
      context.limits.maxTotalExpandedEntryLinks
  ) {
    context.truncated = true;
    const limit =
      linkDepth >= context.limits.maxEntryLinkDepth
        ? "maxEntryLinkDepth"
        : context.expandedEntryLinks >=
            context.limits.maxExpandedEntryLinks
          ? "maxExpandedEntryLinks"
          : "maxTotalExpandedEntryLinks";
    return unresolvedLink(
      link,
      sourceDocument,
      "resourceLimit",
      candidates,
      "BS_MATERIALIZATION_RESOURCE_LIMIT",
      `Entry link target ${link.targetId} was not expanded because the ${limit} limit was reached.`,
      context,
      {
        limit,
        configuredLimit: context.limits[limit],
        linkDepth,
        expandedEntryLinks: context.expandedEntryLinks,
      },
    );
  }

  context.expandedEntryLinks += 1;
  context.totalExpandedEntryLinks.value += 1;

  const nextStack = [...stack, definition];
  if (target.kind === "selectionEntry") {
    return materializeEntry(
      definition as SelectionEntryProjection,
      target.document,
      link,
      sourceDocument,
      nextStack,
      linkDepth + 1,
      context,
    );
  }
  return materializeGroup(
    definition as SelectionEntryGroupProjection,
    target.document,
    link,
    sourceDocument,
    nextStack,
    linkDepth + 1,
    context,
  );
}

function unresolvedLink(
  link: EntryLinkProjection,
  sourceDocument: ParsedBattleScribeDocument,
  reason: UnresolvedEntryLinkReason,
  candidates: readonly BattleScribeGraphObject[],
  code: string,
  message: string,
  context: MaterializationContext,
  extraDetails: Readonly<Record<string, unknown>> = {},
): UnresolvedMaterializedEntryLink {
  emitDiagnostic(context, link, {
    code,
    message,
    severity: "warning",
    impacts:
      code === "BS_MATERIALIZATION_RESOURCE_LIMIT"
        ? ["resolution", "security"]
        : ["resolution"],
    location: {
      source: link.source,
      path: [...link.path, "@targetId"],
    },
    details: {
      linkKind: "entryLink",
      targetId: link.targetId,
      reason,
      candidates: candidateDetails(candidates),
      ...extraDetails,
    },
  });
  return { kind: "unresolvedEntryLink", reason, link, sourceDocument, candidates };
}

function candidateDetails(
  candidates: readonly BattleScribeGraphObject[],
): readonly Readonly<Record<string, unknown>>[] {
  return candidates.map((candidate) => ({
    kind: candidate.kind,
    id: candidate.id,
    filename: candidate.source.source.filename,
    path: candidate.source.path,
  }));
}

function emitDiagnostic(
  context: MaterializationContext,
  source: ProjectedBattleScribeNode,
  diagnostic: Diagnostic,
): void {
  const key = `${diagnostic.code}:${source.source.sourceId}:${source.path.join("/")}`;
  if (!context.emittedDiagnostics.has(key)) {
    context.emittedDiagnostics.add(key);
    context.diagnostics.push(diagnostic);
  }
}

function expectedEntryLinkKinds(
  link: EntryLinkProjection,
): readonly BattleScribeGraphObjectKind[] {
  if (link.type === "selectionEntry") {
    return ["selectionEntry"];
  }
  if (link.type === "selectionEntryGroup") {
    return ["selectionEntryGroup"];
  }
  return ["selectionEntry", "selectionEntryGroup"];
}

function expectedInfoLinkKinds(
  link: InfoLinkProjection,
): readonly BattleScribeGraphObjectKind[] {
  if (link.type === "rule") {
    return ["rule"];
  }
  if (link.type === "profile") {
    return ["profile"];
  }
  if (link.type === "infoGroup") {
    return ["infoGroup"];
  }
  return [];
}

function inherited<Value>(
  overlay: Value | undefined,
  definition: Value | undefined,
): Value | undefined {
  return overlay === undefined ? definition : overlay;
}

function combined<Value>(
  definition: readonly Value[],
  overlay: readonly Value[] | undefined,
): readonly Value[] {
  return overlay === undefined || overlay.length === 0
    ? definition
    : [...definition, ...overlay];
}

function optionalProperty<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): { readonly [Property in Key]?: Value } {
  return value === undefined ? {} : ({ [key]: value } as { readonly [Property in Key]: Value });
}
