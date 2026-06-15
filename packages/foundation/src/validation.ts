import type { Diagnostic } from "./diagnostics.js";

export type ValidationValidity = "valid" | "invalid";
export type ValidationCompleteness = "complete" | "incomplete";

export interface ValidationStatus {
  readonly validity: ValidationValidity;
  readonly completeness: ValidationCompleteness;
}

export interface ValidationReport extends ValidationStatus {
  readonly diagnostics: readonly Diagnostic[];
}
