import type {
  ObjectId,
  SourceFileProvenance,
} from "@rosterforge/foundation";

export type BattleScribeDocumentKind = "gameSystem" | "catalogue";
export type BattleScribeSourceFormat = "xml" | "json";

export interface JsonSourcePosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface JsonSourceRange {
  readonly start: JsonSourcePosition;
  readonly end: JsonSourcePosition;
}

export interface OrderedJsonProperty {
  readonly name: string;
  readonly nameRange: JsonSourceRange;
  readonly value: OrderedJsonValue;
}

export interface OrderedJsonObject {
  readonly kind: "object";
  readonly entries: readonly OrderedJsonProperty[];
  readonly range: JsonSourceRange;
}

export interface OrderedJsonArray {
  readonly kind: "array";
  readonly items: readonly OrderedJsonValue[];
  readonly range: JsonSourceRange;
}

export interface OrderedJsonString {
  readonly kind: "string";
  readonly value: string;
  readonly range: JsonSourceRange;
}

export interface OrderedJsonNumber {
  readonly kind: "number";
  readonly value: number;
  readonly raw: string;
  readonly range: JsonSourceRange;
}

export interface OrderedJsonBoolean {
  readonly kind: "boolean";
  readonly value: boolean;
  readonly range: JsonSourceRange;
}

export interface OrderedJsonNull {
  readonly kind: "null";
  readonly range: JsonSourceRange;
}

export type OrderedJsonValue =
  | OrderedJsonObject
  | OrderedJsonArray
  | OrderedJsonString
  | OrderedJsonNumber
  | OrderedJsonBoolean
  | OrderedJsonNull;

export interface OrderedXmlAttributes {
  readonly [name: string]: string;
}

export interface OrderedXmlElement {
  readonly kind: "element";
  readonly name: string;
  readonly attributes: OrderedXmlAttributes;
  readonly children: readonly OrderedXmlNode[];
  readonly jsonSource?: OrderedJsonValue;
}

export interface OrderedXmlText {
  readonly kind: "text";
  readonly value: string;
}

export interface OrderedXmlComment {
  readonly kind: "comment";
  readonly value: string;
}

export type OrderedXmlNode =
  | OrderedXmlElement
  | OrderedXmlText
  | OrderedXmlComment;

export interface BattleScribeRootMetadata {
  readonly kind: BattleScribeDocumentKind;
  readonly id: ObjectId;
  readonly name: string;
  readonly revision?: number;
  readonly battleScribeVersion?: string;
  readonly authorName?: string;
  readonly authorContact?: string;
  readonly authorUrl?: string;
  readonly type?: string;
  readonly readme?: string;
  readonly gameSystemId?: ObjectId;
  readonly gameSystemRevision?: number;
  readonly library?: boolean;
  readonly namespaceUri?: string;
  readonly attributes: OrderedXmlAttributes;
}

export interface ParsedBattleScribeDocument {
  readonly source: SourceFileProvenance;
  readonly sourceBytes: Uint8Array;
  readonly documentSource: SourceFileProvenance;
  readonly documentBytes: Uint8Array;
  readonly sourceFormat: BattleScribeSourceFormat;
  readonly sourceRoot: OrderedXmlElement | OrderedJsonObject;
  readonly root: OrderedXmlElement;
  readonly metadata: BattleScribeRootMetadata;
  readonly projection: BattleScribeProjection;
}

export interface IngestionLimits {
  readonly maxSourceBytes: number;
  readonly maxXmlDepth: number;
  readonly maxXmlNodes: number;
  readonly maxJsonDepth: number;
  readonly maxJsonNodes: number;
  readonly maxArchiveEntries: number;
  readonly maxArchiveCompressedBytes: number;
  readonly maxArchiveExpandedBytes: number;
  readonly maxCompressionRatio: number;
}

export const defaultIngestionLimits: IngestionLimits = {
  maxSourceBytes: 16 * 1024 * 1024,
  maxXmlDepth: 256,
  maxXmlNodes: 500_000,
  maxJsonDepth: 256,
  maxJsonNodes: 500_000,
  maxArchiveEntries: 8,
  maxArchiveCompressedBytes: 16 * 1024 * 1024,
  maxArchiveExpandedBytes: 32 * 1024 * 1024,
  maxCompressionRatio: 100,
};

export interface ProjectedBattleScribeNode {
  readonly source: SourceFileProvenance;
  readonly path: readonly string[];
  readonly node: OrderedXmlElement;
  readonly sourceNode: OrderedXmlElement | OrderedJsonValue;
}

export interface IdentifiedBattleScribeNode extends ProjectedBattleScribeNode {
  readonly id?: ObjectId;
  readonly name?: string;
}

export interface LinkBattleScribeNode extends IdentifiedBattleScribeNode {
  readonly targetId?: ObjectId;
  readonly hidden?: boolean;
}

export interface BattleScribeProjection extends ProjectedBattleScribeNode {
  readonly kind: BattleScribeDocumentKind;
  readonly metadata: BattleScribeRootMetadata;
  readonly catalogueLinks: readonly CatalogueLinkProjection[];
  readonly costTypes: readonly CostTypeProjection[];
  readonly profileTypes: readonly ProfileTypeProjection[];
  readonly categoryEntries: readonly CategoryEntryProjection[];
  readonly forceEntries: readonly ForceEntryProjection[];
  readonly selectionEntries: readonly SelectionEntryProjection[];
  readonly selectionEntryGroups: readonly SelectionEntryGroupProjection[];
  readonly sharedSelectionEntries: readonly SelectionEntryProjection[];
  readonly sharedSelectionEntryGroups: readonly SelectionEntryGroupProjection[];
  readonly entryLinks: readonly EntryLinkProjection[];
  readonly infoGroups: readonly InfoGroupProjection[];
  readonly rules: readonly RuleProjection[];
  readonly profiles: readonly ProfileProjection[];
  readonly publications: readonly PublicationProjection[];
}

export interface CatalogueLinkProjection extends LinkBattleScribeNode {
  readonly type?: string;
  readonly importRootEntries?: boolean;
}

export interface SelectionEntryProjection
  extends IdentifiedBattleScribeNode,
    SelectionContainerProjection {
  readonly type?: string;
  readonly defaultAmount?: string;
  readonly step?: string;
  readonly hidden?: boolean;
  readonly collective?: boolean;
  readonly import?: boolean;
}

export interface SelectionEntryGroupProjection
  extends IdentifiedBattleScribeNode,
    SelectionContainerProjection {
  readonly hidden?: boolean;
  readonly collective?: boolean;
  readonly import?: boolean;
  readonly defaultSelectionEntryId?: ObjectId;
}

export interface SelectionContainerProjection {
  readonly selectionEntries: readonly SelectionEntryProjection[];
  readonly selectionEntryGroups: readonly SelectionEntryGroupProjection[];
  readonly entryLinks: readonly EntryLinkProjection[];
  readonly categoryLinks: readonly CategoryLinkProjection[];
  readonly infoLinks: readonly InfoLinkProjection[];
  readonly infoGroups: readonly InfoGroupProjection[];
  readonly rules: readonly RuleProjection[];
  readonly profiles: readonly ProfileProjection[];
  readonly costs: readonly CostProjection[];
  readonly constraints: readonly ConstraintProjection[];
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
  readonly publicationLinks: readonly PublicationLinkProjection[];
}

export interface EntryLinkProjection
  extends LinkBattleScribeNode,
    SelectionContainerProjection {
  readonly type?: string;
  readonly defaultAmount?: string;
  readonly step?: string;
  readonly collective?: boolean;
  readonly import?: boolean;
}

export interface CategoryEntryProjection extends IdentifiedBattleScribeNode {
  readonly hidden?: boolean;
  readonly publicationLinks: readonly PublicationLinkProjection[];
  readonly constraints: readonly ConstraintProjection[];
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
}

export interface CategoryLinkProjection extends LinkBattleScribeNode {
  readonly primary?: boolean;
}

export interface InfoLinkProjection extends LinkBattleScribeNode {
  readonly type?: string;
}

export interface InfoGroupProjection extends IdentifiedBattleScribeNode {
  readonly hidden?: boolean;
  readonly infoLinks: readonly InfoLinkProjection[];
  readonly infoGroups: readonly InfoGroupProjection[];
  readonly rules: readonly RuleProjection[];
  readonly profiles: readonly ProfileProjection[];
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
  readonly publicationLinks: readonly PublicationLinkProjection[];
}

export interface RuleProjection extends IdentifiedBattleScribeNode {
  readonly hidden?: boolean;
  readonly description?: string;
  readonly publicationLinks: readonly PublicationLinkProjection[];
}

export interface ProfileProjection extends IdentifiedBattleScribeNode {
  readonly hidden?: boolean;
  readonly typeId?: ObjectId;
  readonly typeName?: string;
  readonly characteristics: readonly CharacteristicProjection[];
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
  readonly publicationLinks: readonly PublicationLinkProjection[];
}

export interface ProfileTypeProjection extends IdentifiedBattleScribeNode {
  readonly characteristicTypes: readonly CharacteristicTypeProjection[];
}

export interface CharacteristicTypeProjection
  extends IdentifiedBattleScribeNode {
  readonly defaultValue?: string;
}

export interface CharacteristicProjection extends ProjectedBattleScribeNode {
  readonly name?: string;
  readonly typeId?: ObjectId;
  readonly value: string;
}

export interface PublicationProjection extends IdentifiedBattleScribeNode {
  readonly shortName?: string;
  readonly publisher?: string;
  readonly publicationDate?: string;
  readonly publisherUrl?: string;
  readonly hidden?: boolean;
}

export interface PublicationLinkProjection extends LinkBattleScribeNode {
  readonly page?: string;
}

export interface ForceEntryProjection extends IdentifiedBattleScribeNode {
  readonly hidden?: boolean;
  readonly forceEntries: readonly ForceEntryProjection[];
  readonly categoryLinks: readonly CategoryLinkProjection[];
  readonly constraints: readonly ConstraintProjection[];
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
  readonly publicationLinks: readonly PublicationLinkProjection[];
}

export interface CostTypeProjection extends IdentifiedBattleScribeNode {
  readonly defaultCostLimit?: number;
  readonly hidden?: boolean;
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
}

export interface CostProjection extends ProjectedBattleScribeNode {
  readonly name?: string;
  readonly typeId?: ObjectId;
  readonly value?: number;
}

export interface ConstraintProjection extends IdentifiedBattleScribeNode {
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly value?: number;
  readonly percentValue?: boolean;
  readonly shared?: boolean;
  readonly includeChildSelections?: boolean;
  readonly includeChildForces?: boolean;
  readonly roundUp?: boolean;
}

export interface ModifierProjection extends ProjectedBattleScribeNode {
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly value?: string;
  readonly conditions: readonly ConditionProjection[];
  readonly conditionGroups: readonly ConditionGroupProjection[];
  readonly repeats: readonly RepeatProjection[];
}

export interface ModifierGroupProjection extends ProjectedBattleScribeNode {
  readonly type?: string;
  readonly comment?: string;
  readonly modifiers: readonly ModifierProjection[];
  readonly modifierGroups: readonly ModifierGroupProjection[];
  readonly conditions: readonly ConditionProjection[];
  readonly conditionGroups: readonly ConditionGroupProjection[];
  readonly repeats: readonly RepeatProjection[];
}

export interface ConditionProjection extends ProjectedBattleScribeNode {
  readonly id?: ObjectId;
  readonly type?: string;
  readonly field?: string;
  readonly scope?: string;
  readonly childId?: ObjectId;
  readonly childName?: string;
  readonly comment?: string;
  readonly value?: string;
  readonly percentValue?: boolean;
  readonly shared?: boolean;
  readonly includeChildSelections?: boolean;
  readonly includeChildForces?: boolean;
}

export interface ConditionGroupProjection extends ProjectedBattleScribeNode {
  readonly type?: string;
  readonly conditions: readonly ConditionProjection[];
  readonly conditionGroups: readonly ConditionGroupProjection[];
  readonly localConditionGroups: readonly LocalConditionGroupProjection[];
}

export interface LocalConditionGroupProjection extends ConditionProjection {
  readonly repeats?: number;
  readonly conditions: readonly ConditionProjection[];
  readonly conditionGroups: readonly ConditionGroupProjection[];
  readonly localConditionGroups: readonly LocalConditionGroupProjection[];
}

export interface RepeatProjection extends ProjectedBattleScribeNode {
  readonly id?: ObjectId;
  readonly field?: string;
  readonly scope?: string;
  readonly childId?: ObjectId;
  readonly childName?: string;
  readonly value?: number;
  readonly repeats?: number;
  readonly percentValue?: boolean;
  readonly shared?: boolean;
  readonly includeChildSelections?: boolean;
  readonly includeChildForces?: boolean;
  readonly roundUp?: boolean;
}
