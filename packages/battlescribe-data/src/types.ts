import type {
  ObjectId,
  SourceFileProvenance,
} from "@rosterforge/foundation";

export type BattleScribeDocumentKind = "gameSystem" | "catalogue";

export interface OrderedXmlAttributes {
  readonly [name: string]: string;
}

export interface OrderedXmlElement {
  readonly kind: "element";
  readonly name: string;
  readonly attributes: OrderedXmlAttributes;
  readonly children: readonly OrderedXmlNode[];
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
  readonly root: OrderedXmlElement;
  readonly metadata: BattleScribeRootMetadata;
}

export interface IngestionLimits {
  readonly maxSourceBytes: number;
  readonly maxArchiveEntries: number;
  readonly maxArchiveCompressedBytes: number;
  readonly maxArchiveExpandedBytes: number;
  readonly maxCompressionRatio: number;
}

export const defaultIngestionLimits: IngestionLimits = {
  maxSourceBytes: 16 * 1024 * 1024,
  maxArchiveEntries: 8,
  maxArchiveCompressedBytes: 16 * 1024 * 1024,
  maxArchiveExpandedBytes: 32 * 1024 * 1024,
  maxCompressionRatio: 100,
};
