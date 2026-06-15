import type { Diagnostic } from "./diagnostics.js";

export type Result<Value> =
  | {
      readonly ok: true;
      readonly value: Value;
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly Diagnostic[];
    };

export function success<Value>(
  value: Value,
  diagnostics: readonly Diagnostic[] = [],
): Result<Value> {
  return { ok: true, value, diagnostics };
}

export function failure(diagnostics: readonly Diagnostic[]): Result<never> {
  return { ok: false, diagnostics };
}
