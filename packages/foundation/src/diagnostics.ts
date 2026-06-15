import type { SourceLocation } from "./provenance.js";

export type DiagnosticSeverity = "info" | "warning" | "error";

export type DiagnosticImpactDomain =
  | "import"
  | "parsing"
  | "security"
  | "compatibility"
  | "resolution"
  | "validation"
  | "persistence"
  | "internal";

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly impacts: readonly DiagnosticImpactDomain[];
  readonly location?: SourceLocation;
  readonly details?: Readonly<Record<string, unknown>>;
}
