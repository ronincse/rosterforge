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
  CharacteristicProjection,
  ConditionGroupProjection,
  ConditionProjection,
  ConstraintProjection,
  CostProjection,
  EntryLinkProjection,
  ForceEntryProjection,
  InfoGroupProjection,
  InfoLinkProjection,
  LocalConditionGroupProjection,
  ModifierGroupProjection,
  ModifierProjection,
  OrderedXmlElement,
  ParsedBattleScribeDocument,
  ProfileProjection,
  ProfileTypeProjection,
  ProjectedBattleScribeNode,
  PublicationLinkProjection,
  RepeatProjection,
  SelectionEntryGroupProjection,
  SelectionEntryProjection,
} from "@rosterforge/battlescribe-data";

export type BattleScribeGraphObjectKind =
  | "gameSystem"
  | "catalogue"
  | "costType"
  | "profileType"
  | "characteristicType"
  | "categoryEntry"
  | "forceEntry"
  | "selectionEntry"
  | "selectionEntryGroup"
  | "entryLink"
  | "infoGroup"
  | "rule"
  | "profile"
  | "publication";

export type BattleScribeReferenceKind =
  | "catalogueGameSystem"
  | "catalogueLink"
  | "entryLink"
  | "categoryLink"
  | "infoLink"
  | "publicationLink"
  | "costType"
  | "profileType"
  | "characteristicType"
  | "defaultSelectionEntry"
  | "constraintScope"
  | "conditionChild"
  | "repeatChild";

export interface BattleScribeGraphObject {
  readonly kind: BattleScribeGraphObjectKind;
  readonly id: ObjectId;
  readonly document: ParsedBattleScribeDocument;
  readonly source: ProjectedBattleScribeNode;
}

export interface BattleScribeGenericElement {
  readonly id: ObjectId;
  readonly document: ParsedBattleScribeDocument;
  readonly node: OrderedXmlElement;
}

export interface BattleScribeGraphReference {
  readonly kind: BattleScribeReferenceKind;
  readonly source: ProjectedBattleScribeNode;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly targetId: ObjectId;
  readonly expectedKinds: readonly BattleScribeGraphObjectKind[];
  readonly targets: readonly BattleScribeGraphObject[];
  readonly unprojectedTargets: readonly BattleScribeGenericElement[];
  readonly pathSuffix: string;
}

export interface BattleScribeDataGraph {
  readonly documents: readonly ParsedBattleScribeDocument[];
  readonly documentsById: ReadonlyMap<ObjectId, ParsedBattleScribeDocument>;
  readonly reachableDocumentsByDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    ReadonlySet<ParsedBattleScribeDocument>
  >;
  readonly objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>;
  readonly genericElementsById: ReadonlyMap<
    ObjectId,
    readonly BattleScribeGenericElement[]
  >;
  readonly objects: readonly BattleScribeGraphObject[];
  readonly references: readonly BattleScribeGraphReference[];
}

/** Repository-level facts that refine diagnostics without changing resolution. */
export interface ResolveBattleScribeDataGraphOptions {
  readonly knownRepositoryCostTypeIds?: ReadonlySet<ObjectId>;
}

const lexicalConstraintScopes = new Set([
  "force",
  "model",
  "parent",
  "root-entry",
  "roster",
  "self",
  "unit",
]);
const lexicalChildIds = new Set([
  "any",
  "model",
  "none",
  "roster",
  "unit",
  "upgrade",
]);
const genericElementsByObjectIndex = new WeakMap<
  ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  ReadonlyMap<ObjectId, readonly BattleScribeGenericElement[]>
>();

export function resolveBattleScribeDataGraph(
  documents: readonly ParsedBattleScribeDocument[],
  options: ResolveBattleScribeDataGraphOptions = {},
): Result<BattleScribeDataGraph> {
  const diagnostics: Diagnostic[] = [];
  const objects = documents.flatMap((document) => objectsForDocument(document));
  const objectsById = indexObjects(objects);
  const genericElementsById = indexGenericElements(documents);
  const documentsById = indexDocuments(documents);
  const reachableDocumentsByDocument = indexReachableDocuments(documents);
  genericElementsByObjectIndex.set(
    objectsById,
    genericElementsById,
  );

  for (const entries of duplicateObjectsInResolutionScopes(
    documents,
    objects,
    reachableDocumentsByDocument,
  )) {
    if (entries.length > 1) {
      diagnostics.push(duplicateIdDiagnostic(entries));
    }
  }

  const references = documents.flatMap((document) =>
    referencesForDocument(document, objectsById, diagnostics),
  );
  diagnostics.push(...missingReferenceDiagnostics(references, options));
  diagnostics.push(...catalogueCycleDiagnostics(documents, references));

  return success({
    documents,
    documentsById,
    reachableDocumentsByDocument,
    objectsById,
    genericElementsById,
    objects,
    references,
  }, diagnostics);
}

function objectsForDocument(
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  const projection = document.projection;
  return [
    documentObject(document),
    ...projection.costTypes.flatMap((costType) =>
      identifiedObject("costType", costType, document),
    ),
    ...projection.profileTypes.flatMap((profileType) =>
      objectsForProfileType(profileType, document),
    ),
    ...projection.categoryEntries.flatMap((categoryEntry) =>
      objectsForCategoryEntry(categoryEntry, document),
    ),
    ...projection.forceEntries.flatMap((forceEntry) =>
      objectsForForceEntry(forceEntry, document),
    ),
    ...projection.selectionEntries.flatMap((entry) =>
      objectsForSelectionEntry(entry, document),
    ),
    ...projection.selectionEntryGroups.flatMap((group) =>
      objectsForSelectionEntryGroup(group, document),
    ),
    ...projection.sharedSelectionEntries.flatMap((entry) =>
      objectsForSelectionEntry(entry, document),
    ),
    ...projection.sharedSelectionEntryGroups.flatMap((group) =>
      objectsForSelectionEntryGroup(group, document),
    ),
    ...projection.entryLinks.flatMap((entryLink) =>
      objectsForEntryLink(entryLink, document),
    ),
    ...projection.infoGroups.flatMap((infoGroup) =>
      objectsForInfoGroup(infoGroup, document),
    ),
    ...projection.rules.flatMap((rule) =>
      identifiedObject("rule", rule, document),
    ),
    ...projection.profiles.flatMap((profile) =>
      identifiedObject("profile", profile, document),
    ),
    ...projection.publications.flatMap((publication) =>
      identifiedObject("publication", publication, document),
    ),
  ];
}

function documentObject(
  document: ParsedBattleScribeDocument,
): BattleScribeGraphObject {
  return {
    kind: document.projection.kind,
    id: document.metadata.id,
    document,
    source: document.projection,
  };
}

function objectsForProfileType(
  profileType: ProfileTypeProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("profileType", profileType, document),
    ...profileType.characteristicTypes.flatMap((characteristicType) =>
      identifiedObject("characteristicType", characteristicType, document),
    ),
  ];
}

function objectsForCategoryEntry(
  categoryEntry: CategoryEntryProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("categoryEntry", categoryEntry, document),
    ...categoryEntry.rules.flatMap((rule) =>
      identifiedObject("rule", rule, document),
    ),
    ...categoryEntry.profiles.flatMap((profile) =>
      identifiedObject("profile", profile, document),
    ),
  ];
}

function objectsForForceEntry(
  forceEntry: ForceEntryProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("forceEntry", forceEntry, document),
    ...forceEntry.forceEntries.flatMap((child) =>
      objectsForForceEntry(child, document),
    ),
  ];
}

function objectsForSelectionEntry(
  entry: SelectionEntryProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("selectionEntry", entry, document),
    ...entry.selectionEntries.flatMap((child) =>
      objectsForSelectionEntry(child, document),
    ),
    ...entry.selectionEntryGroups.flatMap((group) =>
      objectsForSelectionEntryGroup(group, document),
    ),
    ...entry.entryLinks.flatMap((entryLink) =>
      objectsForEntryLink(entryLink, document),
    ),
    ...entry.infoGroups.flatMap((infoGroup) =>
      objectsForInfoGroup(infoGroup, document),
    ),
    ...entry.rules.flatMap((rule) => identifiedObject("rule", rule, document)),
    ...entry.profiles.flatMap((profile) =>
      identifiedObject("profile", profile, document),
    ),
  ];
}

function objectsForSelectionEntryGroup(
  group: SelectionEntryGroupProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("selectionEntryGroup", group, document),
    ...group.selectionEntries.flatMap((child) =>
      objectsForSelectionEntry(child, document),
    ),
    ...group.selectionEntryGroups.flatMap((child) =>
      objectsForSelectionEntryGroup(child, document),
    ),
    ...group.entryLinks.flatMap((entryLink) =>
      objectsForEntryLink(entryLink, document),
    ),
    ...group.infoGroups.flatMap((infoGroup) =>
      objectsForInfoGroup(infoGroup, document),
    ),
    ...group.rules.flatMap((rule) => identifiedObject("rule", rule, document)),
    ...group.profiles.flatMap((profile) =>
      identifiedObject("profile", profile, document),
    ),
  ];
}

function objectsForEntryLink(
  entryLink: EntryLinkProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("entryLink", entryLink, document),
    ...entryLink.selectionEntries.flatMap((child) =>
      objectsForSelectionEntry(child, document),
    ),
    ...entryLink.selectionEntryGroups.flatMap((group) =>
      objectsForSelectionEntryGroup(group, document),
    ),
    ...entryLink.entryLinks.flatMap((child) =>
      objectsForEntryLink(child, document),
    ),
    ...entryLink.infoGroups.flatMap((infoGroup) =>
      objectsForInfoGroup(infoGroup, document),
    ),
    ...entryLink.rules.flatMap((rule) =>
      identifiedObject("rule", rule, document),
    ),
    ...entryLink.profiles.flatMap((profile) =>
      identifiedObject("profile", profile, document),
    ),
  ];
}

function objectsForInfoGroup(
  infoGroup: InfoGroupProjection,
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  return [
    ...identifiedObject("infoGroup", infoGroup, document),
    ...infoGroup.infoGroups.flatMap((child) =>
      objectsForInfoGroup(child, document),
    ),
    ...infoGroup.rules.flatMap((rule) =>
      identifiedObject("rule", rule, document),
    ),
    ...infoGroup.profiles.flatMap((profile) =>
      identifiedObject("profile", profile, document),
    ),
  ];
}

function identifiedObject(
  kind: BattleScribeGraphObjectKind,
  source: ProjectedBattleScribeNode & { readonly id?: ObjectId },
  document: ParsedBattleScribeDocument,
): readonly BattleScribeGraphObject[] {
  if (source.id === undefined) {
    return [];
  }
  return [{ kind, id: source.id, document, source }];
}

function referencesForDocument(
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  const projection = document.projection;
  return [
    ...gameSystemReference(projection, document, objectsById, diagnostics),
    ...projection.catalogueLinks.flatMap((link) =>
      targetReference(
        "catalogueLink",
        link,
        document,
        link.targetId,
        ["catalogue"],
        objectsById,
        diagnostics,
        "@targetId",
      ),
    ),
    ...projection.costTypes.flatMap((costType) =>
      referencesForModifierCarrier(costType, document, objectsById, diagnostics),
    ),
    ...projection.categoryEntries.flatMap((entry) =>
      referencesForCategoryEntry(entry, document, objectsById, diagnostics),
    ),
    ...projection.forceEntries.flatMap((entry) =>
      referencesForForceEntry(entry, document, objectsById, diagnostics),
    ),
    ...projection.selectionEntries.flatMap((entry) =>
      referencesForSelectionEntry(entry, document, objectsById, diagnostics),
    ),
    ...projection.selectionEntryGroups.flatMap((group) =>
      referencesForSelectionEntryGroup(group, document, objectsById, diagnostics),
    ),
    ...projection.sharedSelectionEntries.flatMap((entry) =>
      referencesForSelectionEntry(entry, document, objectsById, diagnostics),
    ),
    ...projection.sharedSelectionEntryGroups.flatMap((group) =>
      referencesForSelectionEntryGroup(group, document, objectsById, diagnostics),
    ),
    ...projection.entryLinks.flatMap((entryLink) =>
      referencesForEntryLink(entryLink, document, objectsById, diagnostics),
    ),
    ...projection.infoGroups.flatMap((infoGroup) =>
      referencesForInfoGroup(infoGroup, document, objectsById, diagnostics),
    ),
    ...projection.rules.flatMap((rule) =>
      referencesForPublicationLinks(rule.publicationLinks, document, objectsById, diagnostics),
    ),
    ...projection.profiles.flatMap((profile) =>
      referencesForProfile(profile, document, objectsById, diagnostics),
    ),
  ];
}

function gameSystemReference(
  projection: BattleScribeProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return targetReference(
    "catalogueGameSystem",
    projection,
    document,
    projection.metadata.gameSystemId,
    ["gameSystem"],
    objectsById,
    diagnostics,
    "@gameSystemId",
  );
}

function referencesForCategoryEntry(
  entry: CategoryEntryProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...referencesForPublicationLinks(entry.publicationLinks, document, objectsById, diagnostics),
    ...referencesForModifierCarrier(entry, document, objectsById, diagnostics),
    ...entry.constraints.flatMap((constraint) =>
      referencesForConstraint(constraint, document, objectsById, diagnostics),
    ),
    ...entry.infoLinks.flatMap((infoLink) =>
      targetReference(
        "infoLink",
        infoLink,
        document,
        infoLink.targetId,
        expectedInfoLinkKinds(infoLink),
        objectsById,
        diagnostics,
      ),
    ),
    ...entry.profiles.flatMap((profile) =>
      referencesForProfile(profile, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForForceEntry(
  entry: ForceEntryProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...referencesForCategoryLinks(entry.categoryLinks, document, objectsById, diagnostics),
    ...referencesForPublicationLinks(entry.publicationLinks, document, objectsById, diagnostics),
    ...referencesForModifierCarrier(entry, document, objectsById, diagnostics),
    ...entry.constraints.flatMap((constraint) =>
      referencesForConstraint(constraint, document, objectsById, diagnostics),
    ),
    ...entry.forceEntries.flatMap((child) =>
      referencesForForceEntry(child, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForSelectionEntry(
  entry: SelectionEntryProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...referencesForSelectionContainer(entry, document, objectsById, diagnostics),
    ...entry.selectionEntries.flatMap((child) =>
      referencesForSelectionEntry(child, document, objectsById, diagnostics),
    ),
    ...entry.selectionEntryGroups.flatMap((group) =>
      referencesForSelectionEntryGroup(group, document, objectsById, diagnostics),
    ),
    ...entry.entryLinks.flatMap((entryLink) =>
      referencesForEntryLink(entryLink, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForSelectionEntryGroup(
  group: SelectionEntryGroupProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...(group.defaultSelectionEntryId === undefined ||
    lexicalChildIds.has(group.defaultSelectionEntryId)
      ? []
      : targetReference(
          "defaultSelectionEntry",
          group,
          document,
          group.defaultSelectionEntryId,
          ["selectionEntry", "entryLink"],
          objectsById,
          diagnostics,
          "@defaultSelectionEntryId",
        )),
    ...referencesForSelectionContainer(group, document, objectsById, diagnostics),
    ...group.selectionEntries.flatMap((entry) =>
      referencesForSelectionEntry(entry, document, objectsById, diagnostics),
    ),
    ...group.selectionEntryGroups.flatMap((child) =>
      referencesForSelectionEntryGroup(child, document, objectsById, diagnostics),
    ),
    ...group.entryLinks.flatMap((entryLink) =>
      referencesForEntryLink(entryLink, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForEntryLink(
  entryLink: EntryLinkProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...targetReference(
      "entryLink",
      entryLink,
      document,
      entryLink.targetId,
      expectedEntryLinkKinds(entryLink),
      objectsById,
      diagnostics,
    ),
    ...referencesForSelectionContainer(entryLink, document, objectsById, diagnostics),
    ...entryLink.selectionEntries.flatMap((entry) =>
      referencesForSelectionEntry(entry, document, objectsById, diagnostics),
    ),
    ...entryLink.selectionEntryGroups.flatMap((group) =>
      referencesForSelectionEntryGroup(group, document, objectsById, diagnostics),
    ),
    ...entryLink.entryLinks.flatMap((child) =>
      referencesForEntryLink(child, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForSelectionContainer(
  container: SelectionEntryProjection | SelectionEntryGroupProjection | EntryLinkProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...referencesForCategoryLinks(container.categoryLinks, document, objectsById, diagnostics),
    ...container.infoLinks.flatMap((infoLink) =>
      targetReference(
        "infoLink",
        infoLink,
        document,
        infoLink.targetId,
        expectedInfoLinkKinds(infoLink),
        objectsById,
        diagnostics,
      ),
    ),
    ...container.infoGroups.flatMap((infoGroup) =>
      referencesForInfoGroup(infoGroup, document, objectsById, diagnostics),
    ),
    ...container.rules.flatMap((rule) =>
      referencesForPublicationLinks(
        rule.publicationLinks,
        document,
        objectsById,
        diagnostics,
      ),
    ),
    ...container.profiles.flatMap((profile) =>
      referencesForProfile(profile, document, objectsById, diagnostics),
    ),
    ...referencesForPublicationLinks(container.publicationLinks, document, objectsById, diagnostics),
    ...container.costs.flatMap((cost) =>
      targetReference("costType", cost, document, cost.typeId, ["costType"], objectsById, diagnostics, "@typeId"),
    ),
    ...container.constraints.flatMap((constraint) =>
      referencesForConstraint(constraint, document, objectsById, diagnostics),
    ),
    ...referencesForModifierCarrier(container, document, objectsById, diagnostics),
  ];
}

function referencesForInfoGroup(
  infoGroup: InfoGroupProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...infoGroup.infoLinks.flatMap((infoLink) =>
      targetReference(
        "infoLink",
        infoLink,
        document,
        infoLink.targetId,
        expectedInfoLinkKinds(infoLink),
        objectsById,
        diagnostics,
      ),
    ),
    ...infoGroup.infoGroups.flatMap((child) =>
      referencesForInfoGroup(child, document, objectsById, diagnostics),
    ),
    ...infoGroup.rules.flatMap((rule) =>
      referencesForPublicationLinks(
        rule.publicationLinks,
        document,
        objectsById,
        diagnostics,
      ),
    ),
    ...infoGroup.profiles.flatMap((profile) =>
      referencesForProfile(profile, document, objectsById, diagnostics),
    ),
    ...referencesForModifierCarrier(
      infoGroup,
      document,
      objectsById,
      diagnostics,
    ),
    ...referencesForPublicationLinks(
      infoGroup.publicationLinks,
      document,
      objectsById,
      diagnostics,
    ),
  ];
}

function referencesForProfile(
  profile: ProfileProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...targetReference(
      "profileType",
      profile,
      document,
      profile.typeId,
      ["profileType"],
      objectsById,
      diagnostics,
      "@typeId",
    ),
    ...profile.characteristics.flatMap((characteristic) =>
      referencesForCharacteristic(
        characteristic,
        document,
        objectsById,
        diagnostics,
      ),
    ),
    ...referencesForPublicationLinks(
      profile.publicationLinks,
      document,
      objectsById,
      diagnostics,
    ),
  ];
}

function referencesForCharacteristic(
  characteristic: CharacteristicProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return targetReference(
    "characteristicType",
    characteristic,
    document,
    characteristic.typeId,
    ["characteristicType"],
    objectsById,
    diagnostics,
    "@typeId",
  );
}

function referencesForCategoryLinks(
  links: readonly CategoryLinkProjection[],
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return links.flatMap((link) =>
    targetReference("categoryLink", link, document, link.targetId, ["categoryEntry"], objectsById, diagnostics),
  );
}

function referencesForPublicationLinks(
  links: readonly PublicationLinkProjection[],
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return links.flatMap((link) =>
    targetReference("publicationLink", link, document, link.targetId, ["publication"], objectsById, diagnostics),
  );
}

function referencesForConstraint(
  constraint: ConstraintProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  if (
    constraint.scope === undefined ||
    lexicalConstraintScopes.has(constraint.scope)
  ) {
    return [];
  }
  return targetReference(
    "constraintScope",
    constraint,
    document,
    constraint.scope as ObjectId,
    ["categoryEntry", "selectionEntry", "selectionEntryGroup", "forceEntry"],
    objectsById,
    diagnostics,
    "@scope",
  );
}

function referencesForModifierCarrier(
  carrier: {
    readonly modifiers: readonly ModifierProjection[];
    readonly modifierGroups: readonly ModifierGroupProjection[];
  },
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...carrier.modifiers.flatMap((modifier) =>
      referencesForModifier(modifier, document, objectsById, diagnostics),
    ),
    ...carrier.modifierGroups.flatMap((group) =>
      referencesForModifierGroup(group, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForModifier(
  modifier: ModifierProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...modifier.conditions.flatMap((condition) =>
      referencesForCondition(condition, document, objectsById, diagnostics),
    ),
    ...modifier.conditionGroups.flatMap((group) =>
      referencesForConditionGroup(group, document, objectsById, diagnostics),
    ),
    ...modifier.repeats.flatMap((repeat) =>
      referencesForRepeat(repeat, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForModifierGroup(
  group: ModifierGroupProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...group.modifiers.flatMap((modifier) =>
      referencesForModifier(modifier, document, objectsById, diagnostics),
    ),
    ...group.modifierGroups.flatMap((child) =>
      referencesForModifierGroup(child, document, objectsById, diagnostics),
    ),
    ...group.conditions.flatMap((condition) =>
      referencesForCondition(condition, document, objectsById, diagnostics),
    ),
    ...group.conditionGroups.flatMap((child) =>
      referencesForConditionGroup(child, document, objectsById, diagnostics),
    ),
    ...group.repeats.flatMap((repeat) =>
      referencesForRepeat(repeat, document, objectsById, diagnostics),
    ),
  ];
}

function referencesForConditionGroup(
  group: ConditionGroupProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...group.conditions.flatMap((condition) =>
      referencesForCondition(condition, document, objectsById, diagnostics),
    ),
    ...group.conditionGroups.flatMap((child) =>
      referencesForConditionGroup(child, document, objectsById, diagnostics),
    ),
    ...group.localConditionGroups.flatMap((child) =>
      referencesForLocalConditionGroup(
        child,
        document,
        objectsById,
        diagnostics,
      ),
    ),
  ];
}

function referencesForLocalConditionGroup(
  group: LocalConditionGroupProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  return [
    ...referencesForCondition(group, document, objectsById, diagnostics),
    ...group.conditions.flatMap((condition) =>
      referencesForCondition(condition, document, objectsById, diagnostics),
    ),
    ...group.conditionGroups.flatMap((child) =>
      referencesForConditionGroup(child, document, objectsById, diagnostics),
    ),
    ...group.localConditionGroups.flatMap((child) =>
      referencesForLocalConditionGroup(
        child,
        document,
        objectsById,
        diagnostics,
      ),
    ),
  ];
}

function referencesForCondition(
  condition: ConditionProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  if (
    condition.childId === undefined ||
    lexicalChildIds.has(condition.childId) ||
    condition.scope === "primary-catalogue"
  ) {
    // `primary-catalogue` compares the current catalogue's identity with the
    // authored childId. The childId is a scalar selector, not an object that
    // must be reachable in the focused dependency closure. Treating it as a
    // graph edge produced false missing-reference warnings whenever another
    // faction catalogue named its own ID here.
    return [];
  }
  return targetReference(
    "conditionChild",
    condition,
    document,
    condition.childId,
    [
      "gameSystem",
      "catalogue",
      "categoryEntry",
      "selectionEntry",
      "selectionEntryGroup",
      "entryLink",
      "forceEntry",
      "profile",
    ],
    objectsById,
    diagnostics,
    "@childId",
  );
}

function referencesForRepeat(
  repeat: RepeatProjection,
  document: ParsedBattleScribeDocument,
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  diagnostics: Diagnostic[],
): readonly BattleScribeGraphReference[] {
  if (repeat.childId === undefined || lexicalChildIds.has(repeat.childId)) {
    return [];
  }
  return targetReference(
    "repeatChild",
    repeat,
    document,
    repeat.childId,
    [
      "categoryEntry",
      "selectionEntry",
      "selectionEntryGroup",
      "entryLink",
      "forceEntry",
      "profile",
    ],
    objectsById,
    diagnostics,
    "@childId",
  );
}

function targetReference(
  kind: BattleScribeReferenceKind,
  source: ProjectedBattleScribeNode,
  sourceDocument: ParsedBattleScribeDocument,
  targetId: ObjectId | undefined,
  expectedKinds: readonly BattleScribeGraphObjectKind[],
  objectsById: ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]>,
  _diagnostics: Diagnostic[],
  pathSuffix = "@targetId",
): readonly BattleScribeGraphReference[] {
  if (targetId === undefined) {
    return [];
  }
  const targets = (objectsById.get(targetId) ?? []).filter((target) =>
    expectedKinds.includes(target.kind),
  );
  const projectedNodes = new Set(
    (objectsById.get(targetId) ?? []).map(({ source: targetSource }) =>
      targetSource.node
    ),
  );
  const unprojectedTargets = (
    genericElementsByObjectIndex.get(objectsById)?.get(targetId) ?? []
  ).filter(({ node }) => !projectedNodes.has(node));
  const reference: BattleScribeGraphReference = {
    kind,
    source,
    sourceDocument,
    targetId,
    expectedKinds,
    targets,
    unprojectedTargets,
    pathSuffix,
  };
  return [reference];
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

function indexObjects(
  objects: readonly BattleScribeGraphObject[],
): ReadonlyMap<ObjectId, readonly BattleScribeGraphObject[]> {
  const index = new Map<ObjectId, BattleScribeGraphObject[]>();
  for (const object of objects) {
    const existing = index.get(object.id);
    if (existing === undefined) {
      index.set(object.id, [object]);
    } else {
      existing.push(object);
    }
  }
  return index;
}

function indexGenericElements(
  documents: readonly ParsedBattleScribeDocument[],
): ReadonlyMap<ObjectId, readonly BattleScribeGenericElement[]> {
  const index = new Map<ObjectId, BattleScribeGenericElement[]>();
  for (const document of documents) {
    indexGenericElement(document.root, document, index);
  }
  return index;
}

function indexGenericElement(
  node: OrderedXmlElement,
  document: ParsedBattleScribeDocument,
  index: Map<ObjectId, BattleScribeGenericElement[]>,
): void {
  const rawId = node.attributes.id;
  if (rawId !== undefined && rawId.length > 0) {
    const id = rawId as ObjectId;
    const existing = index.get(id) ?? [];
    existing.push({ id, document, node });
    index.set(id, existing);
  }
  for (const child of node.children) {
    if (child.kind === "element") {
      indexGenericElement(child, document, index);
    }
  }
}

function indexReachableDocuments(
  documents: readonly ParsedBattleScribeDocument[],
): ReadonlyMap<
  ParsedBattleScribeDocument,
  ReadonlySet<ParsedBattleScribeDocument>
> {
  const documentsById = new Map<ObjectId, ParsedBattleScribeDocument[]>();
  for (const document of documents) {
    const existing = documentsById.get(document.metadata.id) ?? [];
    existing.push(document);
    documentsById.set(document.metadata.id, existing);
  }

  return new Map(
    documents.map((document) => [
      document,
      reachableDocuments(document, documentsById),
    ]),
  );
}

function reachableDocuments(
  source: ParsedBattleScribeDocument,
  documentsById: ReadonlyMap<
    ObjectId,
    readonly ParsedBattleScribeDocument[]
  >,
): ReadonlySet<ParsedBattleScribeDocument> {
  const reachable = new Set<ParsedBattleScribeDocument>();
  const pending = [source];

  while (pending.length > 0) {
    const document = pending.pop();
    if (document === undefined || reachable.has(document)) {
      continue;
    }
    reachable.add(document);
    if (document.projection.kind !== "catalogue") {
      continue;
    }

    const gameSystemId = document.projection.metadata.gameSystemId;
    if (gameSystemId !== undefined) {
      pending.push(
        ...(documentsById.get(gameSystemId) ?? []).filter(
          (candidate) => candidate.projection.kind === "gameSystem",
        ),
      );
    }
    for (const link of document.projection.catalogueLinks) {
      if (link.targetId === undefined) {
        continue;
      }
      pending.push(
        ...(documentsById.get(link.targetId) ?? []).filter(
          (candidate) => candidate.projection.kind === "catalogue",
        ),
      );
    }
  }

  return reachable;
}

function duplicateObjectsInResolutionScopes(
  documents: readonly ParsedBattleScribeDocument[],
  objects: readonly BattleScribeGraphObject[],
  reachableDocumentsByDocument: ReadonlyMap<
    ParsedBattleScribeDocument,
    ReadonlySet<ParsedBattleScribeDocument>
  >,
): readonly (readonly BattleScribeGraphObject[])[] {
  const objectsByDocument = new Map<
    ParsedBattleScribeDocument,
    BattleScribeGraphObject[]
  >();
  for (const object of objects) {
    const existing = objectsByDocument.get(object.document) ?? [];
    existing.push(object);
    objectsByDocument.set(object.document, existing);
  }

  const duplicates: BattleScribeGraphObject[][] = [];
  const emitted = new Set<string>();
  for (const source of documents) {
    const byId = new Map<ObjectId, BattleScribeGraphObject[]>();
    for (const document of reachableDocumentsByDocument.get(source) ?? [
      source,
    ]) {
      for (const object of objectsByDocument.get(document) ?? []) {
        const existing = byId.get(object.id) ?? [];
        existing.push(object);
        byId.set(object.id, existing);
      }
    }
    for (const entries of byId.values()) {
      if (entries.length < 2) {
        continue;
      }
      const key = entries
        .map(
          (entry) =>
            `${entry.kind}:${entry.source.source.sourceId}:${entry.source.path.join("/")}`,
        )
        .sort()
        .join("|");
      if (!emitted.has(key)) {
        emitted.add(key);
        duplicates.push(entries);
      }
    }
  }
  return duplicates;
}

function indexDocuments(
  documents: readonly ParsedBattleScribeDocument[],
): ReadonlyMap<ObjectId, ParsedBattleScribeDocument> {
  return new Map(documents.map((document) => [document.metadata.id, document]));
}

export function battleScribeReachableObjectsById(
  graph: BattleScribeDataGraph,
  sourceDocument: ParsedBattleScribeDocument,
  targetId: ObjectId,
): readonly BattleScribeGraphObject[] {
  const reachableDocuments =
    graph.reachableDocumentsByDocument.get(sourceDocument) ??
    new Set([sourceDocument]);
  return (graph.objectsById.get(targetId) ?? []).filter((target) =>
    reachableDocuments.has(target.document),
  );
}

function missingReferenceDiagnostics(
  references: readonly BattleScribeGraphReference[],
  options: ResolveBattleScribeDataGraphOptions,
): readonly Diagnostic[] {
  const groups = new Map<string, BattleScribeGraphReference[]>();
  for (const reference of references) {
    if (
      reference.targets.length > 0 ||
      reference.unprojectedTargets.length > 0
    ) {
      continue;
    }
    if (isKnownRepositoryZeroCostReference(reference, options)) {
      // Focused repository closures intentionally omit unrelated catalogues.
      // A verified repository index can prove that a zero-value legacy cost's
      // definition survives outside that closure. Keep the unresolved reference
      // available to later evaluation, but do not mislabel it as repository-missing.
      continue;
    }
    const key = [
      reference.sourceDocument.source.sourceId,
      reference.kind,
      reference.targetId,
      reference.expectedKinds.join(","),
    ].join(":");
    const existing = groups.get(key) ?? [];
    existing.push(reference);
    groups.set(key, existing);
  }
  return [...groups.values()].map(missingReferenceDiagnostic);
}

function isKnownRepositoryZeroCostReference(
  reference: BattleScribeGraphReference,
  options: ResolveBattleScribeDataGraphOptions,
): boolean {
  return (
    reference.kind === "costType" &&
    (reference.source as CostProjection).value === 0 &&
    options.knownRepositoryCostTypeIds?.has(reference.targetId) === true
  );
}

function missingReferenceDiagnostic(
  references: readonly BattleScribeGraphReference[],
): Diagnostic {
  const reference = references[0];
  if (reference === undefined) {
    throw new Error("Missing-reference diagnostic requires an occurrence.");
  }
  const occurrencePaths = references
    .slice(0, 25)
    .map(({ source, pathSuffix }) => [...source.path, pathSuffix]);
  const occurrenceSuffix =
    references.length === 1 ? "" : ` (${references.length} occurrences)`;
  return {
    code: "BS_GRAPH_MISSING_REFERENCE",
    message: `Missing ${reference.kind} target ${reference.targetId}${occurrenceSuffix}.`,
    severity: "warning",
    impacts: ["resolution"],
    location: {
      source: reference.source.source,
      path: [...reference.source.path, reference.pathSuffix],
    },
    details: {
      kind: reference.kind,
      targetId: reference.targetId,
      expectedKinds: reference.expectedKinds,
      occurrenceCount: references.length,
      occurrencePaths,
      omittedOccurrenceCount: Math.max(0, references.length - occurrencePaths.length),
    },
  };
}

function duplicateIdDiagnostic(
  entries: readonly BattleScribeGraphObject[],
): Diagnostic {
  const first = entries[0];
  if (first === undefined) {
    throw new Error("Duplicate ID diagnostic requires at least one object.");
  }
  return {
    code: "BS_GRAPH_DUPLICATE_ID",
    message: `ID ${first.id} appears in multiple graph objects.`,
    severity: "warning",
    impacts: ["resolution"],
    location: {
      source: first.source.source,
      path: first.source.path,
    },
    details: {
      id: first.id,
      occurrences: entries.map((entry) => ({
        kind: entry.kind,
        filename: entry.source.source.filename,
        path: entry.source.path,
      })),
    },
  };
}

function catalogueCycleDiagnostics(
  documents: readonly ParsedBattleScribeDocument[],
  references: readonly BattleScribeGraphReference[],
): readonly Diagnostic[] {
  const catalogueIds = new Set(
    documents
      .filter((document) => document.metadata.kind === "catalogue")
      .map((document) => document.metadata.id),
  );
  const edges = new Map<ObjectId, BattleScribeGraphReference[]>();
  for (const reference of references) {
    if (
      reference.kind === "catalogueLink" &&
      catalogueIds.has(reference.sourceDocument.metadata.id) &&
      reference.targets.some((target) => target.kind === "catalogue")
    ) {
      const existing = edges.get(reference.sourceDocument.metadata.id) ?? [];
      existing.push(reference);
      edges.set(reference.sourceDocument.metadata.id, existing);
    }
  }

  const diagnostics: Diagnostic[] = [];
  const emitted = new Set<string>();
  const visited = new Set<ObjectId>();
  const activeIndexes = new Map<ObjectId, number>();
  for (const document of documents) {
    if (
      document.metadata.kind !== "catalogue" ||
      visited.has(document.metadata.id)
    ) {
      continue;
    }
    findCatalogueCycles(
      document.metadata.id,
      edges,
      [],
      visited,
      activeIndexes,
      diagnostics,
      emitted,
    );
  }
  return diagnostics;
}

function findCatalogueCycles(
  current: ObjectId,
  edges: ReadonlyMap<ObjectId, readonly BattleScribeGraphReference[]>,
  stack: readonly ObjectId[],
  visited: Set<ObjectId>,
  activeIndexes: Map<ObjectId, number>,
  diagnostics: Diagnostic[],
  emitted: Set<string>,
): void {
  visited.add(current);
  activeIndexes.set(current, stack.length);
  const nextStack = [...stack, current];

  for (const reference of edges.get(current) ?? []) {
    const next = reference.targetId;
    const cycleStart = activeIndexes.get(next);
    if (cycleStart !== undefined) {
      const cycle = [...nextStack.slice(cycleStart), next];
      const key = [...new Set(cycle)].sort().join(">");
      if (!emitted.has(key)) {
        emitted.add(key);
        diagnostics.push({
          code: "BS_GRAPH_CATALOGUE_LINK_CYCLE",
          message: `Catalogue link cycle detected: ${cycle.join(" -> ")}.`,
          severity: "warning",
          impacts: ["resolution"],
          location: {
            source: reference.source.source,
            path: [...reference.source.path, "@targetId"],
          },
          details: { cycle },
        });
      }
    } else if (!visited.has(next)) {
      findCatalogueCycles(
        next,
        edges,
        nextStack,
        visited,
        activeIndexes,
        diagnostics,
        emitted,
      );
    }
  }

  activeIndexes.delete(current);
}
