import { createArmyReferenceDocument, type ArmyReferenceDocument } from "./army-reference-model.js";
import { renderArmyReferenceDocument, type ArmyReferenceLayout } from "./army-reference-html.js";
import type { RosterSelectionConditionCostReport } from "@rosterforge/evaluation";
import type {
  Result,
  ValidationCompleteness,
  ValidationValidity,
} from "@rosterforge/foundation";
import {
  rosterSelectionAmount,
  type RosterForce,
  type RosterSelection,
} from "@rosterforge/roster-model";

import { forceDefinitionLabel } from "./force-definition.js";
import type {
  LocalRosterSession,
  LocalRosterSupportedValidationInspection,
} from "./roster-session.js";

export interface RosterPrintCost {
  readonly typeId: string;
  readonly name: string;
  readonly value: number;
}

export interface RosterPrintSelection {
  readonly occurrenceId: string;
  readonly definitionKey: string;
  readonly definitionId?: string;
  readonly definitionKind: "selectionEntry" | "selectionEntryGroup";
  readonly type?: string;
  readonly name: string;
  readonly amount: number;
  readonly costs: readonly RosterPrintCost[];
  readonly selections: readonly RosterPrintSelection[];
}

export interface RosterPrintForce {
  readonly occurrenceId: string;
  readonly definitionKey: string;
  readonly definitionId?: string;
  readonly name: string;
  readonly forces: readonly RosterPrintForce[];
  readonly selections: readonly RosterPrintSelection[];
}

export type RosterPrintCostStatus =
  | {
      readonly available: true;
      readonly completeness: ValidationCompleteness;
      readonly totals: readonly RosterPrintCost[];
      readonly diagnosticCount: number;
    }
  | {
      readonly available: false;
      readonly totals: readonly [];
      readonly diagnosticCount: number;
    };

export type RosterPrintValidationStatus =
  | {
      readonly available: true;
      readonly validity: ValidationValidity;
      readonly completeness: ValidationCompleteness;
      readonly satisfied: number;
      readonly violated: number;
      readonly unresolved: number;
      readonly diagnosticCount: number;
    }
  | {
      readonly available: false;
      readonly diagnosticCount: number;
    };

export interface RosterPrintViewModel {
  readonly reference: ArmyReferenceDocument;
  readonly layout?: ArmyReferenceLayout;
  readonly rosterId: string;
  readonly name: string;
  readonly catalogueName: string;
  readonly catalogueKey: string;
  readonly catalogueId?: string;
  readonly costs: RosterPrintCostStatus;
  readonly validation: RosterPrintValidationStatus;
  readonly forces: readonly RosterPrintForce[];
}

type LocalRosterCostResult = Result<RosterSelectionConditionCostReport>;
type LocalRosterValidationResult =
  Result<LocalRosterSupportedValidationInspection>;

/** Freeze current unsaved reference facts for preview, download and printing.
 * Legacy scalar identity fields remain an internal compatibility contract only. */
export function createRosterPrintViewModel(
  session: LocalRosterSession,
  costResult: LocalRosterCostResult,
  validationResult: LocalRosterValidationResult,
): RosterPrintViewModel {
  const costsBySelection = selectionCostIndex(costResult);
  return {
    reference: createArmyReferenceDocument(session, costResult, validationResult),
    rosterId: session.roster.id,
    name: session.roster.name,
    catalogueName: session.catalogue.name,
    catalogueKey: session.roster.catalogue.key,
    ...(session.roster.catalogue.sourceId === undefined
      ? {}
      : { catalogueId: session.roster.catalogue.sourceId }),
    costs: printCostStatus(costResult),
    validation: printValidationStatus(validationResult),
    forces: session.roster.forces.map((force, index) =>
      createPrintForce(
        session,
        force,
        index === 0 ? forceDefinitionLabel(session.forceDefinition) : undefined,
        costsBySelection,
      ),
    ),
  };
}

/** Render the selected snapshot, never the technical identity tree. */
export function renderRosterPrintDocument(roster: RosterPrintViewModel): string {
  return renderArmyReferenceDocument(roster.reference, roster.layout);
}

export interface RosterPrintWindow {
  readonly document: {
    open(): void;
    write(content: string): void;
    close(): void;
  };
  opener: unknown;
  focus(): void;
  print(): void;
}

export type RosterPrintWindowFactory = () => RosterPrintWindow | null;

/** Open a user-initiated, script-free document. A successful return means the
 * browser accepted the print request, never that the user saved or printed it.
 * Inline styles and system fonts avoid asynchronous asset-loading races. */
export function openRosterPrintView(
  roster: RosterPrintViewModel,
  openWindow: RosterPrintWindowFactory = openBrowserPrintWindow,
): boolean {
  try {
    const target = openWindow();
    if (target === null) return false;
    target.opener = null;
    target.document.open();
    target.document.write(renderRosterPrintDocument(roster));
    target.document.close();
    target.focus();
    target.print();
    return true;
  } catch {
    return false;
  }
}

function createPrintForce(
  session: LocalRosterSession,
  force: RosterForce,
  definitionName: string | undefined,
  costsBySelection: ReadonlyMap<string, readonly RosterPrintCost[]>,
): RosterPrintForce {
  return {
    occurrenceId: force.id,
    definitionKey: force.definition.key,
    ...(force.definition.sourceId === undefined
      ? {}
      : { definitionId: force.definition.sourceId }),
    name:
      force.name ??
      definitionName ??
      force.definition.sourceId ??
      "Unnamed force",
    forces: force.forces.map((child) =>
      createPrintForce(session, child, undefined, costsBySelection),
    ),
    selections: force.selections.map((selection) =>
      createPrintSelection(session, selection, costsBySelection),
    ),
  };
}

function createPrintSelection(
  session: LocalRosterSession,
  selection: RosterSelection,
  costsBySelection: ReadonlyMap<string, readonly RosterPrintCost[]>,
): RosterPrintSelection {
  const choice = session.selectionChoices.get(selection.id);
  return {
    occurrenceId: selection.id,
    definitionKey: selection.definition.key,
    ...(selection.definition.sourceId === undefined
      ? {}
      : { definitionId: selection.definition.sourceId }),
    definitionKind: selection.definition.kind,
    ...(choice?.kind === "selectionEntry" && choice.type !== undefined
      ? { type: choice.type }
      : {}),
    name:
      selection.name ??
      choice?.name ??
      choice?.id ??
      "Unnamed selection",
    amount: rosterSelectionAmount(selection),
    costs: costsBySelection.get(selection.id) ?? [],
    selections: selection.selections.map((child) =>
      createPrintSelection(session, child, costsBySelection),
    ),
  };
}

function printCostStatus(
  result: LocalRosterCostResult,
): RosterPrintCostStatus {
  if (!result.ok) {
    return {
      available: false,
      totals: [],
      diagnosticCount: result.diagnostics.length,
    };
  }
  return {
    available: true,
    completeness: result.value.completeness,
    totals: result.value.totals.map((total) => ({
      typeId: total.typeId,
      name: total.costType.name ?? total.typeId,
      value: total.value,
    })),
    diagnosticCount: result.diagnostics.length,
  };
}

function printValidationStatus(
  result: LocalRosterValidationResult,
): RosterPrintValidationStatus {
  if (!result.ok) {
    return {
      available: false,
      diagnosticCount: result.diagnostics.length,
    };
  }
  const status = result.value.status;
  return {
    available: true,
    validity: status.validity,
    completeness: status.completeness,
    satisfied: status.statusCounts.satisfied,
    violated: status.statusCounts.violated,
    unresolved: status.statusCounts.unresolved,
    diagnosticCount: result.diagnostics.length,
  };
}

function selectionCostIndex(
  result: LocalRosterCostResult,
): ReadonlyMap<string, readonly RosterPrintCost[]> {
  const index = new Map<string, readonly RosterPrintCost[]>();
  if (!result.ok) return index;

  for (const evaluation of result.value.selections) {
    index.set(
      evaluation.occurrence.id,
      evaluation.costs.flatMap((cost) =>
        cost.status === "included"
          ? [
              {
                typeId: cost.typeId,
                name: cost.costType.name ?? cost.typeId,
                value: cost.totalValue,
              },
            ]
          : [],
      ),
    );
  }
  return index;
}

function openBrowserPrintWindow(): RosterPrintWindow | null {
  return globalThis.open("", "_blank");
}
