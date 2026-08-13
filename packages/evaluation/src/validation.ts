import {
  failure,
  success,
  type Diagnostic,
  type Result,
  type ValidationStatus,
} from "@rosterforge/foundation";

import type {
  RosterForceConstraintReport,
  RosterForceConstraintsInRosterReport,
} from "./force-constraints.js";
import type {
  RosterSelectionConstraintReport,
  RosterSelectionConstraintsInRosterReport,
} from "./constraints.js";
import type {
  EmptySingleForceRosterStructuralStatus,
  RosterStructuralBoundReport,
  RosterStructuralBoundStatus,
} from "./structural-status.js";

export type SupportedRosterValidationStatus =
  RosterStructuralBoundStatus;

export type SupportedRosterValidationFinding =
  | {
      readonly kind: "structural";
      readonly status: SupportedRosterValidationStatus;
      readonly report: RosterStructuralBoundReport;
    }
  | {
      readonly kind: "selectionConstraint";
      readonly status: SupportedRosterValidationStatus;
      readonly report: RosterSelectionConstraintReport;
    }
  | {
      readonly kind: "forceConstraint";
      readonly status: SupportedRosterValidationStatus;
      readonly report: RosterForceConstraintReport;
    };

export interface SupportedRosterValidationStatusCounts {
  readonly satisfied: number;
  readonly violated: number;
  readonly unresolved: number;
}

export interface SupportedRosterValidationFindingCounts {
  readonly structural: number;
  readonly selectionConstraints: number;
  readonly forceConstraints: number;
}

export interface SupportedRosterValidationReport
  extends ValidationStatus {
  readonly structural: EmptySingleForceRosterStructuralStatus;
  readonly selectionConstraints: RosterSelectionConstraintsInRosterReport;
  readonly forceConstraints: RosterForceConstraintsInRosterReport;
  readonly findings: readonly SupportedRosterValidationFinding[];
  readonly statusCounts: SupportedRosterValidationStatusCounts;
  readonly findingCounts: SupportedRosterValidationFindingCounts;
}

export function composeSupportedRosterValidation(
  structural: EmptySingleForceRosterStructuralStatus,
  selectionConstraints: RosterSelectionConstraintsInRosterReport,
  forceConstraints: RosterForceConstraintsInRosterReport,
): Result<SupportedRosterValidationReport> {
  const diagnostics = compositionDiagnostics(
    structural,
    selectionConstraints,
    forceConstraints,
  );
  if (diagnostics.length > 0) return failure(diagnostics);

  const structuralItems = structural.bounds.map((report) => ({
    kind: "structural" as const,
    status: report.status,
    report,
  }));
  const selectionItems = selectionConstraints.selections.flatMap(
    ({ constraints }) =>
      constraints
        .filter(isActionableSupportedConstraintReport)
        .map((report) => ({
        kind: "selectionConstraint" as const,
        status: report.status,
        report,
        })),
  );
  const forceItems = forceConstraints.forces.flatMap(({ constraints }) =>
    constraints
      .filter(isActionableSupportedConstraintReport)
      .map((report) => ({
        kind: "forceConstraint" as const,
        status: report.status,
        report,
      })),
  );
  const items = [...structuralItems, ...selectionItems, ...forceItems];
  const findings = items.filter(
    ({ status }) => status !== "satisfied",
  );
  const statusCounts = {
    satisfied: countStatus(items, "satisfied"),
    violated: countStatus(items, "violated"),
    unresolved: countStatus(items, "unresolved"),
  };
  return success({
    structural,
    selectionConstraints,
    forceConstraints,
    findings,
    statusCounts,
    findingCounts: {
      structural: countFindings(findings, "structural"),
      selectionConstraints: countFindings(
        findings,
        "selectionConstraint",
      ),
      forceConstraints: countFindings(findings, "forceConstraint"),
    },
    validity:
      structural.validity === "invalid" || statusCounts.violated > 0
        ? "invalid"
        : "valid",
    completeness:
      structural.completeness === "complete" &&
      selectionConstraints.completeness === "complete" &&
      forceConstraints.completeness === "complete"
        ? "complete"
        : "incomplete",
  });
}

export function isActionableSupportedConstraintReport(
  report:
    | RosterSelectionConstraintReport
    | RosterForceConstraintReport,
): boolean {
  return (
    report.constraintType !== undefined &&
    report.scope !== undefined &&
    report.limit !== undefined
  );
}

function compositionDiagnostics(
  structural: EmptySingleForceRosterStructuralStatus,
  selectionConstraints: RosterSelectionConstraintsInRosterReport,
  forceConstraints: RosterForceConstraintsInRosterReport,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (
    structural.roster !== selectionConstraints.roster ||
    structural.roster !== forceConstraints.roster ||
    structural.context !== selectionConstraints.context ||
    structural.context !== forceConstraints.context
  ) {
    diagnostics.push(
      validationDiagnostic(
        structural,
        "EVALUATION_SUPPORTED_VALIDATION_INPUT_MISMATCH",
        "Supported validation inputs must retain the same roster and catalogue context objects.",
      ),
    );
  }
  if (
    selectionConstraints.inspectionScope !== "selectionConditions" ||
    forceConstraints.inspectionScope !== "conditions"
  ) {
    diagnostics.push(
      validationDiagnostic(
        structural,
        "EVALUATION_SUPPORTED_VALIDATION_SCOPE_MISMATCH",
        "Supported validation requires selection-condition and force-condition constraint reports.",
        {
          selectionScope: selectionConstraints.inspectionScope,
          forceScope: forceConstraints.inspectionScope,
        },
      ),
    );
  }
  return diagnostics;
}

function validationDiagnostic(
  structural: EmptySingleForceRosterStructuralStatus,
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Diagnostic {
  return {
    code,
    message,
    severity: "error",
    impacts: ["validation", "internal"],
    location: {
      source: structural.context.document.projection.source,
      path: structural.context.document.projection.path,
    },
    ...(details === undefined ? {} : { details }),
  };
}

function countStatus(
  items: readonly {
    readonly status: SupportedRosterValidationStatus;
  }[],
  status: SupportedRosterValidationStatus,
): number {
  return items.filter((item) => item.status === status).length;
}

function countFindings(
  findings: readonly SupportedRosterValidationFinding[],
  kind: SupportedRosterValidationFinding["kind"],
): number {
  return findings.filter((finding) => finding.kind === kind).length;
}
