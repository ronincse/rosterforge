import { useMemo } from "react";
import { CatalogueSourceStatus } from "./catalogue-source-status.js";
import {
  catalogueSourceContext,
  type CatalogueDataFreshnessOptions,
} from "./catalogue-data-freshness.js";
import type {
  LocalCatalogueChoice,
  LocalCatalogueLibrary,
} from "./catalogue-library.js";
import { DiagnosticList } from "./diagnostic-list.js";
import { formatCount } from "./ui-format.js";

/**
 * Keeps exceptional import state and the uncommon multi-catalogue chooser near
 * roster setup without making the import batch a permanent workspace column.
 */
export function CatalogueSetupContext({
  library,
  diagnostics,
  selectedCatalogue,
  onSelect,
  freshnessOptions,
  sources,
}: {
  readonly library: LocalCatalogueLibrary;
  readonly diagnostics: Parameters<typeof DiagnosticList>[0]["diagnostics"];
  readonly selectedCatalogue: LocalCatalogueChoice | undefined;
  readonly onSelect: (key: string) => void;
  readonly sources?: Parameters<typeof catalogueSourceContext>[1];
  readonly freshnessOptions?: CatalogueDataFreshnessOptions | undefined;
}) {
  const sourceContext = useMemo(() => selectedCatalogue === undefined ? undefined : catalogueSourceContext(selectedCatalogue, sources), [selectedCatalogue, sources]);
  const importedCount = library.importReport.files.filter(({ status }) => status === "imported").length;
  const rejectedCount = library.importReport.files.length - importedCount;
  const showCatalogueChooser = library.selectableCatalogues.length > 1;
  const selectedGameSystemMissing =
    selectedCatalogue?.gameSystemId !== undefined &&
    !library.gameSystems.some(
      ({ metadata }) => metadata.id === selectedCatalogue.gameSystemId,
    );
  const showDeveloperDetails =
    library.importReport.files.length > 0 || diagnostics.length > 0;

  return (
    <section className="catalogue-setup-context" aria-label="Import context">
      {showCatalogueChooser && (
        <div className="catalogue-setup-chooser">
          <label htmlFor="catalogue-setup-choice">Catalogue</label>
          <select
            id="catalogue-setup-choice"
            value={selectedCatalogue?.key ?? ""}
            onChange={(event) => onSelect(event.currentTarget.value)}
          >
            {library.selectableCatalogues.map((catalogue) => (
              <option key={catalogue.key} value={catalogue.key}>
                {catalogue.name}
              </option>
            ))}
          </select>
          <p>
            This import contains multiple roster catalogues. Choose which one
            to use for roster setup.
          </p>
        </div>
      )}

      <CatalogueSourceStatus context={sourceContext} options={freshnessOptions} />

      {rejectedCount > 0 && (
        <div className="catalogue-import-warning" role="alert">
          <strong>{formatCount(rejectedCount, "file")} could not be loaded.</strong>
          <span> Roster setup uses the files that imported successfully.</span>
        </div>
      )}

      {selectedCatalogue?.materializationTruncated && (
        <div className="catalogue-import-warning">
          <strong>Some catalogue entries could not be prepared.</strong>
          <span> Try importing a smaller or more focused set of files.</span>
        </div>
      )}

      {selectedGameSystemMissing && (
        <div className="catalogue-import-warning">
          <strong>The matching game system is missing.</strong>
          <span> Import it with this catalogue before creating a roster.</span>
        </div>
      )}

      {showDeveloperDetails && (
        <details className="catalogue-import-details">
          <summary>
            Developer import details
            <span>
              {formatCount(diagnostics.length, "diagnostic")}
              {rejectedCount > 0 ? `, ${rejectedCount} rejected` : ""}
            </span>
          </summary>
          <ImportReport library={library} />
          {diagnostics.length > 0 && (
            <>
              <p>
                Technical source and reference notes are preserved for
                debugging. They do not by themselves mean that the selected
                catalogue failed to load.
              </p>
              <DiagnosticList diagnostics={diagnostics} />
            </>
          )}
        </details>
      )}
    </section>
  );
}

function ImportReport({
  library,
}: {
  readonly library: LocalCatalogueLibrary;
}) {
  return (
    <div className="import-report">
      <h3>File report</h3>
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
    </div>
  );
}
