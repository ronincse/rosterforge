import type { Diagnostic } from "@rosterforge/foundation";

import { DiagnosticList } from "./diagnostic-list.js";
import { formatCount } from "./ui-format.js";

export function IdleState() {
  return (
    <div className="empty-state">
      <div className="empty-glyph" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>Your catalogue library starts here</h2>
      <p>
        Select a game system and one or more catalogues in the same batch. Valid
        files remain available even when another selected file has a problem.
      </p>
    </div>
  );
}

export function LoadingState({ fileCount }: { readonly fileCount: number }) {
  return (
    <div className="loading-state" role="status">
      <span className="loader" aria-hidden="true" />
      <div>
        <h2>Reading {formatCount(fileCount, "file")}</h2>
        <p>Parsing XML and composing catalogue views locally.</p>
      </div>
    </div>
  );
}

export function FailureState({
  message,
  diagnostics,
}: {
  readonly message: string;
  readonly diagnostics: readonly Diagnostic[];
}) {
  return (
    <div className="failure-state" role="alert">
      <p className="eyebrow">Import stopped</p>
      <h2>{message}</h2>
      <p>Choose another set of files to try again.</p>
      <DiagnosticList diagnostics={diagnostics} />
    </div>
  );
}
