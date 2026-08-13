import type {
  LocalCatalogueChoice,
  LocalCatalogueLibrary,
} from "./catalogue-library.js";
import { DiagnosticList } from "./diagnostic-list.js";
import { SummaryMetric } from "./summary-metric.js";
import { formatCount, initials } from "./ui-format.js";

export function CatalogueLibraryPanel({
  library,
  diagnostics,
  selectedCatalogue,
  onSelect,
}: {
  readonly library: LocalCatalogueLibrary;
  readonly diagnostics: Parameters<typeof DiagnosticList>[0]["diagnostics"];
  readonly selectedCatalogue: LocalCatalogueChoice | undefined;
  readonly onSelect: (key: string) => void;
}) {
  const importedCount = library.importReport.files.filter(
    ({ status }) => status === "imported",
  ).length;
  const rejectedCount = library.importReport.files.length - importedCount;

  return (
    <section className="library-summary" aria-labelledby="library-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current local batch</p>
          <h2 id="library-heading">Catalogue library</h2>
        </div>
        <StatusBadge status={library.status} />
      </div>

      <div className="summary-grid">
        <SummaryMetric label="Imported" value={String(importedCount)} />
        <SummaryMetric
          label="Roster catalogues"
          value={String(library.selectableCatalogues.length)}
        />
        <SummaryMetric label="Issues" value={String(diagnostics.length)} />
      </div>

      {library.selectableCatalogues.length > 0 ? (
        <div className="catalogue-list" aria-label="Available catalogues">
          {library.selectableCatalogues.map((catalogue) => (
            <button
              className="catalogue-choice"
              data-selected={catalogue.key === selectedCatalogue?.key}
              key={catalogue.key}
              type="button"
              aria-pressed={catalogue.key === selectedCatalogue?.key}
              onClick={() => onSelect(catalogue.key)}
            >
              <span className="catalogue-monogram" aria-hidden="true">
                {initials(catalogue.name)}
              </span>
              <span className="catalogue-choice-copy">
                <strong>{catalogue.name}</strong>
                <span>Revision {catalogue.revision ?? "not specified"}</span>
              </span>
              <span className="choice-arrow" aria-hidden="true">
                &gt;
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="no-catalogues">
          <h3>No catalogue choices yet</h3>
          <p>
            {library.gameSystems.length > 0
              ? "The game system imported, but this batch did not contain a catalogue."
              : "No BattleScribe catalogue could be read from this batch."}
          </p>
        </div>
      )}

      <ImportReport library={library} rejectedCount={rejectedCount} />
      {diagnostics.length > 0 && (
        <details className="batch-diagnostics">
          <summary>
            Batch diagnostics
            <span>{formatCount(diagnostics.length, "issue")}</span>
          </summary>
          <DiagnosticList diagnostics={diagnostics} />
        </details>
      )}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  readonly status: LocalCatalogueLibrary["status"];
}) {
  const labels = {
    empty: "Nothing imported",
    unavailable: "Needs a catalogue",
    ready: "Ready",
    partial: "Ready with issues",
  } as const;
  return (
    <span className="status-badge" data-status={status}>
      {labels[status]}
    </span>
  );
}

function ImportReport({
  library,
  rejectedCount,
}: {
  readonly library: LocalCatalogueLibrary;
  readonly rejectedCount: number;
}) {
  return (
    <details className="import-report" open={rejectedCount > 0}>
      <summary>
        File report
        <span>{rejectedCount} rejected</span>
      </summary>
      <ul>
        {library.importReport.files.map((file) => (
          <li key={`${file.index}:${file.source.filename}`}>
            <span
              className="file-status"
              data-status={file.status}
              aria-hidden="true"
            />
            <span>
              <strong>{file.source.filename}</strong>
              <small>
                {file.status === "imported"
                  ? file.document?.metadata.kind === "catalogue"
                    ? "Catalogue"
                    : "Game system"
                  : file.diagnostics[0]?.message ?? "Rejected"}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
