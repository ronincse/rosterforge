import { success, type Diagnostic, type Result } from "@rosterforge/foundation";

import type {
  BattleScribeCatalogueContext,
  BattleScribeForceDefinition,
  MaterializedEntryLink,
  MaterializedSelectionEntry,
  MaterializedSelectionEntryGroup,
} from "@rosterforge/data-graph";

import type {
  Roster,
  RosterDefinitionKey,
  RosterForce,
  RosterSelection,
} from "@rosterforge/roster-model";

import {
  rosterCatalogueReference,
  rosterForceDefinitionReference,
  rosterSelectionDefinitionReference,
  type BattleScribeRosterSelectionChoice,
} from "./references.js";

export type RosterCompatibilityDefinitionStatus =
  | "available"
  | "unavailable"
  | "unresolved";

export type RosterCompatibilityParentStatus =
  | "compatible"
  | "incompatible"
  | "unresolved";

export interface RosterForceCompatibility {
  readonly occurrence: RosterForce;
  readonly definitions: readonly BattleScribeForceDefinition[];
  readonly definitionStatus: RosterCompatibilityDefinitionStatus;
  readonly parentStatus: RosterCompatibilityParentStatus;
  readonly forces: readonly RosterForceCompatibility[];
  readonly selections: readonly RosterSelectionCompatibility[];
}

export interface RosterSelectionCompatibility {
  readonly occurrence: RosterSelection;
  readonly choices: readonly BattleScribeRosterSelectionChoice[];
  readonly definitionStatus: RosterCompatibilityDefinitionStatus;
  readonly parentStatus: RosterCompatibilityParentStatus;
  readonly selections: readonly RosterSelectionCompatibility[];
}

export interface RosterCompatibilityReport {
  readonly roster: Roster;
  readonly context: BattleScribeCatalogueContext;
  readonly catalogueStatus: "matching" | "mismatch";
  readonly forces: readonly RosterForceCompatibility[];
}

interface CompatibilityIndex {
  readonly forcesByKey: ReadonlyMap<
    RosterDefinitionKey,
    readonly BattleScribeForceDefinition[]
  >;
  readonly rootForceKeys: ReadonlySet<RosterDefinitionKey>;
  readonly childForceKeys: ReadonlyMap<
    RosterDefinitionKey,
    ReadonlySet<RosterDefinitionKey>
  >;
  readonly selectionsByKey: ReadonlyMap<
    RosterDefinitionKey,
    readonly BattleScribeRosterSelectionChoice[]
  >;
  readonly rootSelectionKeys: ReadonlySet<RosterDefinitionKey>;
  readonly childSelectionKeys: ReadonlyMap<
    RosterDefinitionKey,
    ReadonlySet<RosterDefinitionKey>
  >;
  readonly partialSelectionParents: ReadonlySet<RosterDefinitionKey>;
  readonly partialSelections: boolean;
  readonly partialRoots: boolean;
}

interface MutableCompatibilityIndex {
  readonly forcesByKey: Map<
    RosterDefinitionKey,
    BattleScribeForceDefinition[]
  >;
  readonly rootForceKeys: Set<RosterDefinitionKey>;
  readonly childForceKeys: Map<
    RosterDefinitionKey,
    Set<RosterDefinitionKey>
  >;
  readonly selectionsByKey: Map<
    RosterDefinitionKey,
    BattleScribeRosterSelectionChoice[]
  >;
  readonly rootSelectionKeys: Set<RosterDefinitionKey>;
  readonly childSelectionKeys: Map<
    RosterDefinitionKey,
    Set<RosterDefinitionKey>
  >;
  readonly partialSelectionParents: Set<RosterDefinitionKey>;
  partialSelections: boolean;
  partialRoots: boolean;
}

type SelectionParent =
  | { readonly kind: "force"; readonly occurrence: RosterForce }
  | { readonly kind: "selection"; readonly occurrence: RosterSelection };

export function inspectRosterCompatibility(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Result<RosterCompatibilityReport> {
  const diagnostics: Diagnostic[] = [];
  const catalogueStatus =
    roster.catalogue.key === rosterCatalogueReference(context).key
      ? "matching"
      : "mismatch";
  if (catalogueStatus === "mismatch") {
    diagnostics.push(catalogueMismatchDiagnostic(roster, context));
  }

  const index = buildCompatibilityIndex(context);
  const forces = roster.forces.map((force) =>
    inspectForce(
      force,
      undefined,
      catalogueStatus,
      index,
      diagnostics,
    ),
  );

  return success(
    { roster, context, catalogueStatus, forces },
    diagnostics,
  );
}

function inspectForce(
  occurrence: RosterForce,
  parent: RosterForce | undefined,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  index: CompatibilityIndex,
  diagnostics: Diagnostic[],
): RosterForceCompatibility {
  const definitions = index.forcesByKey.get(occurrence.definition.key) ?? [];
  const definitionStatus = definitionStatusFor(
    definitions.length,
    catalogueStatus,
    false,
  );
  const parentStatus = forceParentStatus(
    occurrence,
    parent,
    definitionStatus,
    catalogueStatus,
    index,
  );
  emitForceDiagnostics(
    occurrence,
    parent,
    catalogueStatus,
    definitionStatus,
    parentStatus,
    diagnostics,
  );

  return {
    occurrence,
    definitions,
    definitionStatus,
    parentStatus,
    forces: occurrence.forces.map((force) =>
      inspectForce(
        force,
        occurrence,
        catalogueStatus,
        index,
        diagnostics,
      ),
    ),
    selections: occurrence.selections.map((selection) =>
      inspectSelection(
        selection,
        { kind: "force", occurrence },
        catalogueStatus,
        index,
        diagnostics,
      ),
    ),
  };
}

function inspectSelection(
  occurrence: RosterSelection,
  parent: SelectionParent,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  index: CompatibilityIndex,
  diagnostics: Diagnostic[],
): RosterSelectionCompatibility {
  const choices = index.selectionsByKey.get(occurrence.definition.key) ?? [];
  const definitionStatus = definitionStatusFor(
    choices.length,
    catalogueStatus,
    index.partialSelections,
  );
  const parentStatus = selectionParentStatus(
    occurrence,
    parent,
    definitionStatus,
    catalogueStatus,
    index,
  );
  emitSelectionDiagnostics(
    occurrence,
    parent,
    catalogueStatus,
    definitionStatus,
    parentStatus,
    diagnostics,
  );

  return {
    occurrence,
    choices,
    definitionStatus,
    parentStatus,
    selections: occurrence.selections.map((selection) =>
      inspectSelection(
        selection,
        { kind: "selection", occurrence },
        catalogueStatus,
        index,
        diagnostics,
      ),
    ),
  };
}

function definitionStatusFor(
  candidateCount: number,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  partial: boolean,
): RosterCompatibilityDefinitionStatus {
  if (catalogueStatus === "mismatch") {
    return "unresolved";
  }
  if (candidateCount > 0) {
    return "available";
  }
  return partial ? "unresolved" : "unavailable";
}

function forceParentStatus(
  occurrence: RosterForce,
  parent: RosterForce | undefined,
  definitionStatus: RosterCompatibilityDefinitionStatus,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  index: CompatibilityIndex,
): RosterCompatibilityParentStatus {
  if (catalogueStatus === "mismatch" || definitionStatus !== "available") {
    return "unresolved";
  }
  if (parent === undefined) {
    return index.rootForceKeys.has(occurrence.definition.key)
      ? "compatible"
      : "incompatible";
  }
  if (!index.forcesByKey.has(parent.definition.key)) {
    return "unresolved";
  }
  return index.childForceKeys
    .get(parent.definition.key)
    ?.has(occurrence.definition.key)
    ? "compatible"
    : "incompatible";
}

function selectionParentStatus(
  occurrence: RosterSelection,
  parent: SelectionParent,
  definitionStatus: RosterCompatibilityDefinitionStatus,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  index: CompatibilityIndex,
): RosterCompatibilityParentStatus {
  if (catalogueStatus === "mismatch" || definitionStatus !== "available") {
    return "unresolved";
  }
  if (parent.kind === "force") {
    if (index.rootSelectionKeys.has(occurrence.definition.key)) {
      return "compatible";
    }
    return index.partialRoots ? "unresolved" : "incompatible";
  }
  if (!index.selectionsByKey.has(parent.occurrence.definition.key)) {
    return "unresolved";
  }
  if (
    index.childSelectionKeys
      .get(parent.occurrence.definition.key)
      ?.has(occurrence.definition.key)
  ) {
    return "compatible";
  }
  return index.partialSelectionParents.has(parent.occurrence.definition.key)
    ? "unresolved"
    : "incompatible";
}

function buildCompatibilityIndex(
  context: BattleScribeCatalogueContext,
): CompatibilityIndex {
  const index: MutableCompatibilityIndex = {
    forcesByKey: new Map(),
    rootForceKeys: new Set(),
    childForceKeys: new Map(),
    selectionsByKey: new Map(),
    rootSelectionKeys: new Set(),
    childSelectionKeys: new Map(),
    partialSelectionParents: new Set(),
    partialSelections: false,
    partialRoots: false,
  };

  for (const definition of context.forces.definitions) {
    const key = rosterForceDefinitionReference(definition).key;
    index.rootForceKeys.add(key);
    indexForce(definition, index);
  }
  for (const root of context.roots.roots) {
    if (root.materialized.kind === "unresolvedEntryLink") {
      if (root.materialized.reason === "resourceLimit") {
        index.partialSelections = true;
        index.partialRoots = true;
      }
      continue;
    }
    const key = rosterSelectionDefinitionReference(root.materialized).key;
    index.rootSelectionKeys.add(key);
    indexSelection(root.materialized, index);
  }
  return index;
}

function indexForce(
  definition: BattleScribeForceDefinition,
  index: MutableCompatibilityIndex,
): void {
  const key = rosterForceDefinitionReference(definition).key;
  appendCandidate(index.forcesByKey, key, definition);
  const children = childSet(index.childForceKeys, key);
  for (const child of definition.forceEntries) {
    children.add(rosterForceDefinitionReference(child).key);
    indexForce(child, index);
  }
}

function indexSelection(
  choice: BattleScribeRosterSelectionChoice,
  index: MutableCompatibilityIndex,
): void {
  const key = rosterSelectionDefinitionReference(choice).key;
  appendCandidate(index.selectionsByKey, key, choice);
  const children = childSet(index.childSelectionKeys, key);
  for (const child of directSelectionChildren(choice)) {
    children.add(rosterSelectionDefinitionReference(child).key);
    indexSelection(child, index);
  }
  if (
    choice.entryLinks.some(
      (link) =>
        link.kind === "unresolvedEntryLink" &&
        link.reason === "resourceLimit",
    )
  ) {
    index.partialSelections = true;
    index.partialSelectionParents.add(key);
  }
}

function directSelectionChildren(
  choice: BattleScribeRosterSelectionChoice,
): readonly BattleScribeRosterSelectionChoice[] {
  return [
    ...choice.selectionEntries,
    ...choice.selectionEntryGroups,
    ...choice.entryLinks.filter(isResolvedSelection),
  ];
}

function isResolvedSelection(
  value: MaterializedEntryLink,
): value is MaterializedSelectionEntry | MaterializedSelectionEntryGroup {
  return value.kind !== "unresolvedEntryLink";
}

function appendCandidate<Key, Value>(
  values: Map<Key, Value[]>,
  key: Key,
  value: Value,
): void {
  const candidates = values.get(key);
  if (candidates === undefined) {
    values.set(key, [value]);
  } else {
    candidates.push(value);
  }
}

function childSet<Key>(
  values: Map<Key, Set<Key>>,
  key: Key,
): Set<Key> {
  const existing = values.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const created = new Set<Key>();
  values.set(key, created);
  return created;
}

function emitForceDiagnostics(
  occurrence: RosterForce,
  parent: RosterForce | undefined,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  definitionStatus: RosterCompatibilityDefinitionStatus,
  parentStatus: RosterCompatibilityParentStatus,
  diagnostics: Diagnostic[],
): void {
  if (catalogueStatus === "mismatch") {
    return;
  }
  if (definitionStatus === "unavailable") {
    diagnostics.push(
      compatibilityDiagnostic(
        "ROSTER_COMPATIBILITY_FORCE_NOT_AVAILABLE",
        `Force occurrence ${occurrence.id} references a definition unavailable in this catalogue context.`,
        occurrence,
        parent,
      ),
    );
  }
  if (parentStatus === "incompatible") {
    diagnostics.push(
      compatibilityDiagnostic(
        "ROSTER_COMPATIBILITY_FORCE_PARENT_MISMATCH",
        `Force occurrence ${occurrence.id} is not a direct child of its roster parent in this catalogue context.`,
        occurrence,
        parent,
      ),
    );
  }
}

function emitSelectionDiagnostics(
  occurrence: RosterSelection,
  parent: SelectionParent,
  catalogueStatus: RosterCompatibilityReport["catalogueStatus"],
  definitionStatus: RosterCompatibilityDefinitionStatus,
  parentStatus: RosterCompatibilityParentStatus,
  diagnostics: Diagnostic[],
): void {
  if (catalogueStatus === "mismatch") {
    return;
  }
  if (definitionStatus === "unavailable") {
    diagnostics.push(
      compatibilityDiagnostic(
        "ROSTER_COMPATIBILITY_SELECTION_NOT_AVAILABLE",
        `Selection occurrence ${occurrence.id} references a definition unavailable in this catalogue context.`,
        occurrence,
        parent.occurrence,
      ),
    );
  } else if (definitionStatus === "unresolved") {
    diagnostics.push(
      compatibilityDiagnostic(
        "ROSTER_COMPATIBILITY_SELECTION_UNRESOLVED",
        `Selection occurrence ${occurrence.id} could not be resolved in the partial catalogue context.`,
        occurrence,
        parent.occurrence,
      ),
    );
  }
  if (parentStatus === "incompatible") {
    diagnostics.push(
      compatibilityDiagnostic(
        "ROSTER_COMPATIBILITY_SELECTION_PARENT_MISMATCH",
        `Selection occurrence ${occurrence.id} is not a direct child of its roster parent in this catalogue context.`,
        occurrence,
        parent.occurrence,
      ),
    );
  } else if (
    parentStatus === "unresolved" &&
    definitionStatus === "available"
  ) {
    diagnostics.push(
      compatibilityDiagnostic(
        "ROSTER_COMPATIBILITY_SELECTION_PARENT_UNRESOLVED",
        `The parent relationship for selection occurrence ${occurrence.id} could not be resolved in the partial catalogue context.`,
        occurrence,
        parent.occurrence,
      ),
    );
  }
}

function compatibilityDiagnostic(
  code: string,
  message: string,
  occurrence: RosterForce | RosterSelection,
  parent: RosterForce | RosterSelection | undefined,
): Diagnostic {
  return {
    code,
    message,
    severity: "warning",
    impacts: ["compatibility", "resolution"],
    details: {
      occurrenceId: occurrence.id,
      definitionKey: occurrence.definition.key,
      ...(parent === undefined
        ? { parentKind: "root" }
        : {
            parentKind:
              "forces" in parent ? "force" : "selection",
            parentOccurrenceId: parent.id,
            parentDefinitionKey: parent.definition.key,
          }),
    },
  };
}

function catalogueMismatchDiagnostic(
  roster: Roster,
  context: BattleScribeCatalogueContext,
): Diagnostic {
  return {
    code: "ROSTER_COMPATIBILITY_CATALOGUE_MISMATCH",
    message: "The roster belongs to a different catalogue context.",
    severity: "warning",
    impacts: ["compatibility", "resolution"],
    details: {
      rosterCatalogueKey: roster.catalogue.key,
      contextCatalogueKey: rosterCatalogueReference(context).key,
    },
  };
}
