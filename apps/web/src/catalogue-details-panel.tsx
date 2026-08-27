import { useId, useState, type FormEvent } from "react";

import type { BattleScribeForceDefinition } from "@rosterforge/data-graph";
import type { Diagnostic } from "@rosterforge/foundation";

import type {
  LocalCatalogueChoice,
  LocalCatalogueLibrary,
} from "./catalogue-library.js";
import { Detail } from "./detail-row.js";
import { DiagnosticList } from "./diagnostic-list.js";
import {
  forceDefinitionKey,
  forceDefinitionLabel,
} from "./force-definition.js";
import { formatBytes, formatCount } from "./ui-format.js";

export function CatalogueDetails({
  catalogue,
  library,
  diagnostics,
  rosterDiagnostics,
  onCreateRoster,
}: {
  readonly catalogue: LocalCatalogueChoice;
  readonly library: LocalCatalogueLibrary;
  readonly diagnostics: readonly Diagnostic[];
  readonly rosterDiagnostics: readonly Diagnostic[];
  readonly onCreateRoster: (
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) => void;
}) {
  const gameSystem = library.gameSystems.find(
    ({ metadata }) => metadata.id === catalogue.gameSystemId,
  );
  const sourceDiagnostics = diagnostics.filter(
    ({ location }) =>
      location?.source.sourceId === catalogue.source.sourceId ||
      (catalogue.gameSystemId !== undefined &&
        location?.source.sourceId === gameSystem?.source.sourceId),
  );

  return (
    <div>
      <p className="eyebrow">Selected catalogue</p>
      <h2>{catalogue.name}</h2>
      <p className="catalogue-subtitle">
        {gameSystem?.metadata.name ?? "Game system unavailable"}
      </p>

      <dl className="detail-list">
        <Detail label="Source file" value={catalogue.source.filename} />
        <Detail
          label="Revision"
          value={String(catalogue.revision ?? "Not specified")}
        />
        <Detail
          label="Visible roots"
          value={String(catalogue.context.roots.roots.length)}
        />
        <Detail
          label="Force definitions"
          value={String(catalogue.context.forces.definitions.length)}
        />
        <Detail
          label="Categories"
          value={String(catalogue.context.categories.definitions.length)}
        />
        <Detail
          label="Source size"
          value={formatBytes(catalogue.document.sourceBytes.byteLength)}
        />
      </dl>

      <div className="readiness-note">
        <strong>Catalogue context composed</strong>
        <span>Definitions and source provenance are ready for roster setup.</span>
      </div>

      <RosterSetup
        key={catalogue.key}
        catalogue={catalogue}
        diagnostics={rosterDiagnostics}
        onCreate={onCreateRoster}
      />

      {sourceDiagnostics.length > 0 && (
        <details className="diagnostic-panel">
          <summary>
            Developer catalogue notes
            <span>{formatCount(sourceDiagnostics.length, "diagnostic")}</span>
          </summary>
          <p>
            Preserved source-data details for debugging. These notes do not by
            themselves prevent roster setup.
          </p>
          <DiagnosticList diagnostics={sourceDiagnostics} />
        </details>
      )}
    </div>
  );
}

function RosterSetup({
  catalogue,
  diagnostics,
  onCreate,
}: {
  readonly catalogue: LocalCatalogueChoice;
  readonly diagnostics: readonly Diagnostic[];
  readonly onCreate: (
    catalogue: LocalCatalogueChoice,
    forceDefinition: BattleScribeForceDefinition,
    name: string,
  ) => void;
}) {
  const nameId = useId();
  const forceId = useId();
  const definitions = catalogue.context.forces.definitions;
  const [name, setName] = useState(`${catalogue.name} roster`);
  const [selectedForceKey, setSelectedForceKey] = useState(
    definitions[0] === undefined ? "" : forceDefinitionKey(definitions[0]),
  );
  const selectedForce = definitions.find(
    (definition) => forceDefinitionKey(definition) === selectedForceKey,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "" || selectedForce === undefined) return;
    onCreate(catalogue, selectedForce, trimmedName);
  }

  if (definitions.length === 0) {
    return (
      <div className="roster-setup unavailable-setup">
        <p className="eyebrow">Roster setup</p>
        <h3>No force definitions available</h3>
        <p>
          Import this catalogue with its matching game system to create a roster
          force.
        </p>
      </div>
    );
  }

  return (
    <form className="roster-setup" onSubmit={submit}>
      <div>
        <p className="eyebrow">Roster setup</p>
        <h3>Create an in-memory roster</h3>
      </div>
      <label htmlFor={nameId}>Roster name</label>
      <input
        id={nameId}
        value={name}
        required
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <label htmlFor={forceId}>Starting force</label>
      <select
        id={forceId}
        value={selectedForceKey}
        onChange={(event) => setSelectedForceKey(event.currentTarget.value)}
      >
        {definitions.map((definition) => (
          <option
            key={forceDefinitionKey(definition)}
            value={forceDefinitionKey(definition)}
          >
            {forceDefinitionLabel(definition)}
          </option>
        ))}
      </select>
      <button
        className="create-roster-action"
        type="submit"
        disabled={name.trim() === "" || selectedForce === undefined}
      >
        Create roster
      </button>
      <p className="setup-boundary">
        Creation is structural. Read-only costs appear in the workspace;
        legality is not evaluated.
      </p>
      <DiagnosticList diagnostics={diagnostics} />
    </form>
  );
}
