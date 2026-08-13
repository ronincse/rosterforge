import type { Diagnostic } from "@rosterforge/foundation";

import { formatCount } from "./ui-format.js";

export function DiagnosticList({
  diagnostics,
}: {
  readonly diagnostics: readonly Diagnostic[];
}) {
  if (diagnostics.length === 0) return null;
  const visible = diagnostics.slice(0, 50);
  return (
    <ul className="diagnostic-list">
      {visible.map((diagnostic, index) => (
        <li key={`${diagnostic.code}:${index}`}>
          <span data-severity={diagnostic.severity}>{diagnostic.severity}</span>
          <div>
            <strong>{diagnostic.code}</strong>
            <p>{diagnostic.message}</p>
          </div>
        </li>
      ))}
      {diagnostics.length > visible.length && (
        <li className="diagnostic-overflow">
          {formatCount(diagnostics.length - visible.length, "additional issue")}
        </li>
      )}
    </ul>
  );
}
