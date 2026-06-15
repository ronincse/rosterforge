import type { SourceId } from "./ids.js";

export type SourceKind = "local-file" | "download" | "synthetic";

export interface SourceFileProvenance {
  readonly sourceId: SourceId;
  readonly filename: string;
  readonly kind: SourceKind;
  readonly importedAt: string;
  readonly mediaType?: string;
  readonly origin?: string;
}

export interface SourcePosition {
  readonly offset?: number;
  readonly line?: number;
  readonly column?: number;
}

export interface SourceLocation {
  readonly source: SourceFileProvenance;
  readonly start?: SourcePosition;
  readonly end?: SourcePosition;
  readonly path?: readonly string[];
}
