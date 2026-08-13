import {
  objectId,
  success,
  type Diagnostic,
  type Result,
  type SourceFileProvenance,
} from "@rosterforge/foundation";

import type {
  BattleScribeProjection,
  BattleScribeRootMetadata,
  CatalogueLinkProjection,
  CategoryEntryProjection,
  CategoryLinkProjection,
  CharacteristicProjection,
  CharacteristicTypeProjection,
  ConditionGroupProjection,
  ConditionProjection,
  ConstraintProjection,
  CostProjection,
  CostTypeProjection,
  EntryLinkProjection,
  ForceEntryProjection,
  InfoGroupProjection,
  InfoLinkProjection,
  LocalConditionGroupProjection,
  ModifierGroupProjection,
  ModifierProjection,
  OrderedXmlElement,
  ProfileProjection,
  ProfileTypeProjection,
  ProjectedBattleScribeNode,
  PublicationLinkProjection,
  PublicationProjection,
  RepeatProjection,
  RuleProjection,
  SelectionContainerProjection,
  SelectionEntryGroupProjection,
  SelectionEntryProjection,
} from "./types.js";

interface ProjectionContext {
  readonly source: SourceFileProvenance;
  readonly diagnostics: Diagnostic[];
}

interface LocatedElement {
  readonly node: OrderedXmlElement;
  readonly path: readonly string[];
}

export function projectBattleScribeDocument(
  root: OrderedXmlElement,
  metadata: BattleScribeRootMetadata,
  source: SourceFileProvenance,
): Result<BattleScribeProjection> {
  const context: ProjectionContext = { source, diagnostics: [] };
  const located = { node: root, path: [localName(root.name)] };

  const projection: BattleScribeProjection = {
    ...base(located, context),
    kind: metadata.kind,
    metadata,
    catalogueLinks: mapContainer(located, "catalogueLinks", "catalogueLink", context, projectCatalogueLink),
    costTypes: mapContainer(located, "costTypes", "costType", context, projectCostType),
    profileTypes: mapContainer(located, "profileTypes", "profileType", context, projectProfileType),
    categoryEntries: mapContainer(located, "categoryEntries", "categoryEntry", context, projectCategoryEntry),
    forceEntries: mapContainer(located, "forceEntries", "forceEntry", context, projectForceEntry),
    selectionEntries: mapContainer(located, "selectionEntries", "selectionEntry", context, projectSelectionEntry),
    selectionEntryGroups: mapContainer(located, "selectionEntryGroups", "selectionEntryGroup", context, projectSelectionEntryGroup),
    sharedSelectionEntries: mapContainer(located, "sharedSelectionEntries", "selectionEntry", context, projectSelectionEntry),
    sharedSelectionEntryGroups: mapContainer(located, "sharedSelectionEntryGroups", "selectionEntryGroup", context, projectSelectionEntryGroup),
    entryLinks: mapContainer(located, "entryLinks", "entryLink", context, projectEntryLink),
    infoGroups: mapContainer(located, "sharedInfoGroups", "infoGroup", context, projectInfoGroup),
    rules: mapContainer(located, "sharedRules", "rule", context, projectRule),
    profiles: mapContainer(located, "sharedProfiles", "profile", context, projectProfile),
    publications: mapContainer(located, "publications", "publication", context, projectPublication),
  };

  return success(projection, context.diagnostics);
}

function projectCatalogueLink(
  located: LocatedElement,
  context: ProjectionContext,
): CatalogueLinkProjection {
  return {
    ...link(located, context),
    ...optionalString(located.node, "type"),
    ...optionalBoolean(located, "importRootEntries", context),
  };
}

function projectSelectionEntry(
  located: LocatedElement,
  context: ProjectionContext,
): SelectionEntryProjection {
  return {
    ...identified(located, context),
    ...selectionContainer(located, context),
    ...optionalString(located.node, "type"),
    ...optionalString(located.node, "defaultAmount"),
    ...optionalString(located.node, "step"),
    ...optionalBoolean(located, "hidden", context),
    ...optionalBoolean(located, "collective", context),
    ...optionalBoolean(located, "import", context),
  };
}

function projectSelectionEntryGroup(
  located: LocatedElement,
  context: ProjectionContext,
): SelectionEntryGroupProjection {
  return {
    ...identified(located, context),
    ...selectionContainer(located, context),
    ...optionalBoolean(located, "hidden", context),
    ...optionalBoolean(located, "collective", context),
    ...optionalBoolean(located, "import", context),
    ...optionalId(located.node, "defaultSelectionEntryId"),
  };
}

function projectEntryLink(
  located: LocatedElement,
  context: ProjectionContext,
): EntryLinkProjection {
  return {
    ...link(located, context),
    ...selectionContainer(located, context),
    ...optionalString(located.node, "type"),
    ...optionalString(located.node, "defaultAmount"),
    ...optionalString(located.node, "step"),
    ...optionalBoolean(located, "collective", context),
    ...optionalBoolean(located, "import", context),
  };
}

function selectionContainer(
  located: LocatedElement,
  context: ProjectionContext,
): SelectionContainerProjection {
  return {
    selectionEntries: mapContainer(located, "selectionEntries", "selectionEntry", context, projectSelectionEntry),
    selectionEntryGroups: mapContainer(located, "selectionEntryGroups", "selectionEntryGroup", context, projectSelectionEntryGroup),
    entryLinks: mapContainer(located, "entryLinks", "entryLink", context, projectEntryLink),
    categoryLinks: mapContainer(located, "categoryLinks", "categoryLink", context, projectCategoryLink),
    infoLinks: mapContainer(located, "infoLinks", "infoLink", context, projectInfoLink),
    infoGroups: mapContainer(located, "infoGroups", "infoGroup", context, projectInfoGroup),
    rules: mapContainer(located, "rules", "rule", context, projectRule),
    profiles: mapContainer(located, "profiles", "profile", context, projectProfile),
    costs: mapContainer(located, "costs", "cost", context, projectCost),
    constraints: mapContainer(located, "constraints", "constraint", context, projectConstraint),
    modifiers: mapContainer(located, "modifiers", "modifier", context, projectModifier),
    modifierGroups: mapContainer(located, "modifierGroups", "modifierGroup", context, projectModifierGroup),
    publicationLinks: mapContainer(located, "publicationLinks", "publicationLink", context, projectPublicationLink),
  };
}

function projectCategoryEntry(
  located: LocatedElement,
  context: ProjectionContext,
): CategoryEntryProjection {
  return {
    ...identified(located, context),
    ...optionalBoolean(located, "hidden", context),
    publicationLinks: mapContainer(located, "publicationLinks", "publicationLink", context, projectPublicationLink),
    constraints: mapContainer(located, "constraints", "constraint", context, projectConstraint),
    modifiers: mapContainer(located, "modifiers", "modifier", context, projectModifier),
    modifierGroups: mapContainer(located, "modifierGroups", "modifierGroup", context, projectModifierGroup),
  };
}

function projectCategoryLink(
  located: LocatedElement,
  context: ProjectionContext,
): CategoryLinkProjection {
  return {
    ...link(located, context),
    ...optionalBoolean(located, "primary", context),
  };
}

function projectInfoLink(
  located: LocatedElement,
  context: ProjectionContext,
): InfoLinkProjection {
  return {
    ...link(located, context),
    ...optionalString(located.node, "type"),
  };
}

function projectInfoGroup(
  located: LocatedElement,
  context: ProjectionContext,
): InfoGroupProjection {
  return {
    ...identified(located, context),
    ...optionalBoolean(located, "hidden", context),
    infoLinks: mapContainer(located, "infoLinks", "infoLink", context, projectInfoLink),
    infoGroups: mapContainer(located, "infoGroups", "infoGroup", context, projectInfoGroup),
    rules: mapContainer(located, "rules", "rule", context, projectRule),
    profiles: mapContainer(located, "profiles", "profile", context, projectProfile),
    modifiers: mapContainer(located, "modifiers", "modifier", context, projectModifier),
    modifierGroups: mapContainer(located, "modifierGroups", "modifierGroup", context, projectModifierGroup),
    publicationLinks: mapContainer(located, "publicationLinks", "publicationLink", context, projectPublicationLink),
  };
}

function projectRule(
  located: LocatedElement,
  context: ProjectionContext,
): RuleProjection {
  return {
    ...identified(located, context),
    ...optionalBoolean(located, "hidden", context),
    ...optionalChildText(located, "description"),
    publicationLinks: mapContainer(located, "publicationLinks", "publicationLink", context, projectPublicationLink),
  };
}

function projectProfile(
  located: LocatedElement,
  context: ProjectionContext,
): ProfileProjection {
  return {
    ...identified(located, context),
    ...optionalBoolean(located, "hidden", context),
    ...optionalId(located.node, "typeId"),
    ...optionalString(located.node, "typeName"),
    characteristics: mapContainer(located, "characteristics", "characteristic", context, projectCharacteristic),
    publicationLinks: mapContainer(located, "publicationLinks", "publicationLink", context, projectPublicationLink),
  };
}

function projectProfileType(
  located: LocatedElement,
  context: ProjectionContext,
): ProfileTypeProjection {
  return {
    ...identified(located, context),
    characteristicTypes: mapContainer(
      located,
      "characteristicTypes",
      "characteristicType",
      context,
      projectCharacteristicType,
    ),
  };
}

function projectCharacteristicType(
  located: LocatedElement,
  context: ProjectionContext,
): CharacteristicTypeProjection {
  return {
    ...identified(located, context),
    ...optionalString(located.node, "defaultValue"),
  };
}

function projectCharacteristic(
  located: LocatedElement,
  context: ProjectionContext,
): CharacteristicProjection {
  return {
    ...base(located, context),
    ...optionalString(located.node, "name"),
    ...optionalId(located.node, "typeId"),
    value: directText(located.node),
  };
}

function projectPublication(
  located: LocatedElement,
  context: ProjectionContext,
): PublicationProjection {
  return {
    ...identified(located, context),
    ...optionalString(located.node, "shortName"),
    ...optionalString(located.node, "publisher"),
    ...optionalString(located.node, "publicationDate"),
    ...optionalString(located.node, "publisherUrl"),
    ...optionalBoolean(located, "hidden", context),
  };
}

function projectPublicationLink(
  located: LocatedElement,
  context: ProjectionContext,
): PublicationLinkProjection {
  return {
    ...link(located, context),
    ...optionalString(located.node, "page"),
  };
}

function projectForceEntry(
  located: LocatedElement,
  context: ProjectionContext,
): ForceEntryProjection {
  return {
    ...identified(located, context),
    ...optionalBoolean(located, "hidden", context),
    forceEntries: mapContainer(located, "forceEntries", "forceEntry", context, projectForceEntry),
    categoryLinks: mapContainer(located, "categoryLinks", "categoryLink", context, projectCategoryLink),
    constraints: mapContainer(located, "constraints", "constraint", context, projectConstraint),
    modifiers: mapContainer(located, "modifiers", "modifier", context, projectModifier),
    modifierGroups: mapContainer(located, "modifierGroups", "modifierGroup", context, projectModifierGroup),
    publicationLinks: mapContainer(located, "publicationLinks", "publicationLink", context, projectPublicationLink),
  };
}

function projectCostType(
  located: LocatedElement,
  context: ProjectionContext,
): CostTypeProjection {
  return {
    ...identified(located, context),
    ...optionalNumber(located, "defaultCostLimit", context),
    ...optionalBoolean(located, "hidden", context),
    modifiers: mapContainer(located, "modifiers", "modifier", context, projectModifier),
    modifierGroups: mapContainer(located, "modifierGroups", "modifierGroup", context, projectModifierGroup),
  };
}

function projectCost(
  located: LocatedElement,
  context: ProjectionContext,
): CostProjection {
  return {
    ...base(located, context),
    ...optionalString(located.node, "name"),
    ...optionalId(located.node, "typeId"),
    ...optionalNumber(located, "value", context),
  };
}

function projectConstraint(
  located: LocatedElement,
  context: ProjectionContext,
): ConstraintProjection {
  return {
    ...identified(located, context),
    ...optionalString(located.node, "type"),
    ...optionalString(located.node, "field"),
    ...optionalString(located.node, "scope"),
    ...optionalNumber(located, "value", context),
    ...optionalBoolean(located, "percentValue", context),
    ...optionalBoolean(located, "shared", context),
    ...optionalBoolean(located, "includeChildSelections", context),
    ...optionalBoolean(located, "includeChildForces", context),
    ...optionalBoolean(located, "roundUp", context),
  };
}

function projectModifier(
  located: LocatedElement,
  context: ProjectionContext,
): ModifierProjection {
  return {
    ...base(located, context),
    ...optionalString(located.node, "type"),
    ...optionalString(located.node, "field"),
    ...optionalString(located.node, "scope"),
    ...optionalString(located.node, "value"),
    conditions: mapContainer(located, "conditions", "condition", context, projectCondition),
    conditionGroups: mapContainer(located, "conditionGroups", "conditionGroup", context, projectConditionGroup),
    repeats: mapContainer(located, "repeats", "repeat", context, projectRepeat),
  };
}

function projectModifierGroup(
  located: LocatedElement,
  context: ProjectionContext,
): ModifierGroupProjection {
  return {
    ...base(located, context),
    ...optionalString(located.node, "type"),
    ...optionalString(located.node, "comment"),
    modifiers: mapContainer(located, "modifiers", "modifier", context, projectModifier),
    modifierGroups: mapContainer(located, "modifierGroups", "modifierGroup", context, projectModifierGroup),
    conditions: mapContainer(located, "conditions", "condition", context, projectCondition),
    conditionGroups: mapContainer(located, "conditionGroups", "conditionGroup", context, projectConditionGroup),
    repeats: mapContainer(located, "repeats", "repeat", context, projectRepeat),
  };
}

function projectCondition(
  located: LocatedElement,
  context: ProjectionContext,
): ConditionProjection {
  return {
    ...base(located, context),
    ...optionalId(located.node, "id"),
    ...optionalString(located.node, "type"),
    ...optionalString(located.node, "field"),
    ...optionalString(located.node, "scope"),
    ...optionalId(located.node, "childId"),
    ...optionalString(located.node, "childName"),
    ...optionalString(located.node, "comment"),
    ...optionalString(located.node, "value"),
    ...optionalBoolean(located, "percentValue", context),
    ...optionalBoolean(located, "shared", context),
    ...optionalBoolean(located, "includeChildSelections", context),
    ...optionalBoolean(located, "includeChildForces", context),
  };
}

function projectConditionGroup(
  located: LocatedElement,
  context: ProjectionContext,
): ConditionGroupProjection {
  return {
    ...base(located, context),
    ...optionalString(located.node, "type"),
    conditions: mapContainer(located, "conditions", "condition", context, projectCondition),
    conditionGroups: mapContainer(located, "conditionGroups", "conditionGroup", context, projectConditionGroup),
    localConditionGroups: mapContainer(located, "localConditionGroups", "localConditionGroup", context, projectLocalConditionGroup),
  };
}

function projectLocalConditionGroup(
  located: LocatedElement,
  context: ProjectionContext,
): LocalConditionGroupProjection {
  return {
    ...projectCondition(located, context),
    ...optionalNumber(located, "repeats", context),
    conditions: mapContainer(located, "conditions", "condition", context, projectCondition),
    conditionGroups: mapContainer(located, "conditionGroups", "conditionGroup", context, projectConditionGroup),
    localConditionGroups: mapContainer(located, "localConditionGroups", "localConditionGroup", context, projectLocalConditionGroup),
  };
}

function projectRepeat(
  located: LocatedElement,
  context: ProjectionContext,
): RepeatProjection {
  return {
    ...base(located, context),
    ...optionalId(located.node, "id"),
    ...optionalString(located.node, "field"),
    ...optionalString(located.node, "scope"),
    ...optionalId(located.node, "childId"),
    ...optionalString(located.node, "childName"),
    ...optionalNumber(located, "value", context),
    ...optionalNumber(located, "repeats", context),
    ...optionalBoolean(located, "percentValue", context),
    ...optionalBoolean(located, "shared", context),
    ...optionalBoolean(located, "includeChildSelections", context),
    ...optionalBoolean(located, "includeChildForces", context),
    ...optionalBoolean(located, "roundUp", context),
  };
}

function base(
  located: LocatedElement,
  context: ProjectionContext,
): ProjectedBattleScribeNode {
  return {
    source: context.source,
    path: located.path,
    node: located.node,
    sourceNode: located.node.jsonSource ?? located.node,
  };
}

function identified(located: LocatedElement, context: ProjectionContext) {
  return {
    ...base(located, context),
    ...optionalId(located.node, "id"),
    ...optionalString(located.node, "name"),
  };
}

function link(located: LocatedElement, context: ProjectionContext) {
  return {
    ...identified(located, context),
    ...optionalId(located.node, "targetId"),
    ...optionalBoolean(located, "hidden", context),
  };
}

function mapContainer<T>(
  parent: LocatedElement,
  containerName: string,
  itemName: string,
  context: ProjectionContext,
  project: (located: LocatedElement, context: ProjectionContext) => T,
): readonly T[] {
  const container = childElements(parent, containerName)[0];
  if (container === undefined) {
    return [];
  }
  return childElements(container, itemName).map((item) => project(item, context));
}

function childElements(
  parent: LocatedElement,
  expectedName: string,
): readonly LocatedElement[] {
  const matches = parent.node.children.filter(
    (child): child is OrderedXmlElement =>
      child.kind === "element" && localName(child.name) === expectedName,
  );
  return matches.map((node, index) => ({
    node,
    path: [...parent.path, `${expectedName}[${index}]`],
  }));
}

function optionalString(
  node: OrderedXmlElement,
  attribute: string,
): Readonly<Record<string, string>> {
  const value = node.attributes[attribute];
  return value === undefined ? {} : { [attribute]: value };
}

function optionalId(
  node: OrderedXmlElement,
  attribute: string,
): Readonly<Record<string, ReturnType<typeof objectId>>> {
  const value = node.attributes[attribute];
  return value === undefined ? {} : { [attribute]: objectId(value) };
}

function optionalBoolean(
  located: LocatedElement,
  attribute: string,
  context: ProjectionContext,
): Readonly<Record<string, boolean>> {
  const value = located.node.attributes[attribute];
  if (value === undefined) {
    return {};
  }
  if (value === "true" || value === "1") {
    return { [attribute]: true };
  }
  if (value === "false" || value === "0") {
    return { [attribute]: false };
  }
  invalidTypedValue(located, attribute, value, "Boolean", context);
  return {};
}

function optionalNumber(
  located: LocatedElement,
  attribute: string,
  context: ProjectionContext,
): Readonly<Record<string, number>> {
  const value = located.node.attributes[attribute];
  if (value === undefined) {
    return {};
  }
  if (value.trim() !== "" && Number.isFinite(Number(value))) {
    return { [attribute]: Number(value) };
  }
  invalidTypedValue(located, attribute, value, "number", context);
  return {};
}

function optionalChildText(
  located: LocatedElement,
  childName: string,
): Readonly<Record<string, string>> {
  const child = childElements(located, childName)[0];
  return child === undefined ? {} : { [childName]: directText(child.node) };
}

function directText(node: OrderedXmlElement): string {
  return node.children
    .filter((child) => child.kind === "text")
    .map((child) => child.value)
    .join("");
}

function invalidTypedValue(
  located: LocatedElement,
  attribute: string,
  value: string,
  expectedType: string,
  context: ProjectionContext,
): void {
  const range =
    located.node.jsonSource?.kind === "object"
      ? located.node.jsonSource.entries.find(
          (entry) => entry.name === attribute,
        )?.value.range
      : undefined;
  context.diagnostics.push({
    code: "BS_PROJECTION_INVALID_ATTRIBUTE",
    message: `Invalid ${expectedType} value "${value}" for ${attribute}.`,
    severity: "error",
    impacts: ["parsing", "compatibility"],
    location: {
      source: context.source,
      path: [...located.path, `@${attribute}`],
      ...(range === undefined
        ? {}
        : { start: range.start, end: range.end }),
    },
    details: { attribute, expectedType, value },
  });
}

function localName(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? name : name.slice(colon + 1);
}
