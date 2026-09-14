import type { RosterResourceBudget, RosterResourceBudgetsReport } from "./resource-budgets.js";
/**
 * Folds the validation reports into the one answer the UI shows.
 *
 * The two dimensions stay independent, which is the rule the rest of the
 * evaluator is built around. `validity` says whether the roster breaks a
 * rule this evaluator understands. `completeness` says whether it
 * understood everything that applied. An incomplete report is not an
 * invalid one, and `valid` + `incomplete` is the honest answer for a roster
 * using behaviour RosterForge does not execute yet — never `valid` +
 * `complete` by omission.
 *
 * "Supported" throughout this file means the subset of BattleScribe
 * validation this evaluator executes; `docs/compatibility.md` is the
 * exhaustive record of where that boundary sits.
 */

import {
  failure,
  success,
  type Diagnostic,
  type Result,
  type ValidationStatus,
} from "@rosterforge/foundation";

import type { RosterAuthoredErrorReport, RosterAuthoredErrorsReport } from "./authored-errors.js";

import type {
  RosterCategoryConstraintReport,
  RosterCategoryConstraintsInRosterReport,
} from "./category-constraints.js";
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

/**
 * Structural bounds and constraints share one status vocabulary so
 * findings from all report sources can sit in a single list.
 */
export type SupportedRosterValidationStatus =
  RosterStructuralBoundStatus;

export type SupportedRosterValidationFinding =
  | { readonly kind: "resourceBudget"; readonly status: SupportedRosterValidationStatus; readonly report: RosterResourceBudget }
  | { readonly kind: "authoredError"; readonly status: SupportedRosterValidationStatus; readonly report: RosterAuthoredErrorReport }
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
      readonly kind: "categoryConstraint";
      readonly status: SupportedRosterValidationStatus;
      readonly report: RosterCategoryConstraintReport;
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
  readonly resourceBudgets: number;
  readonly authoredErrors: number;
  readonly structural: number;
  readonly selectionConstraints: number;
  readonly categoryConstraints: number;
  readonly forceConstraints: number;
}

export interface SupportedRosterValidationReport
  extends ValidationStatus {
  readonly structural: EmptySingleForceRosterStructuralStatus;
  readonly selectionConstraints: RosterSelectionConstraintsInRosterReport;
  readonly categoryConstraints: RosterCategoryConstraintsInRosterReport;
  readonly forceConstraints: RosterForceConstraintsInRosterReport;
  readonly authoredErrors: RosterAuthoredErrorsReport;
  readonly resourceBudgets: RosterResourceBudgetsReport;
  readonly findings: readonly SupportedRosterValidationFinding[];
  readonly statusCounts: SupportedRosterValidationStatusCounts;
  readonly findingCounts: SupportedRosterValidationFindingCounts;
}

/**
 * Composes structural, selection-, category-, and force-constraint reports
 * and authored-error/resource-budget reports into a roster verdict. Callers must
 * supply all reports for the same immutable roster/context; this only folds inputs.
 *
 * Fails rather than composing when the reports did not come from the same
 * roster and catalogue context objects, or when the constraint reports
 * were produced at the wrong inspection scope. Both are caller mistakes
 * that would otherwise yield a confident answer about a roster nobody
 * asked about, which is worse than no answer.
 *
 * `validity` turns invalid on a structural failure or any violated bound.
 * An `unresolved` bound does not: the evaluator could not decide, which is
 * not the same as deciding against. Completeness is taken from the
 * inputs' own completeness flags, never inferred from the status counts.
 *
 * `findings` is everything that is not `satisfied`, so it carries violated
 * and unresolved items together — the UI needs both in front of the user.
 */
export function composeSupportedRosterValidation(
  structural: EmptySingleForceRosterStructuralStatus,
  selectionConstraints: RosterSelectionConstraintsInRosterReport,
  categoryConstraints: RosterCategoryConstraintsInRosterReport,
  forceConstraints: RosterForceConstraintsInRosterReport,
  authoredErrors: RosterAuthoredErrorsReport,
  resourceBudgets: RosterResourceBudgetsReport,
): Result<SupportedRosterValidationReport> {
  const diagnostics = [...compositionDiagnostics(
    structural,
    selectionConstraints,
    categoryConstraints,
    forceConstraints,
  )];
  if ((authoredErrors.roster !== structural.roster || authoredErrors.context !== structural.context)) {
    return failure([validationDiagnostic(structural, "EVALUATION_SUPPORTED_VALIDATION_INPUT_MISMATCH", "Authored errors must retain the same roster and catalogue context objects.")]);
  }
  if (diagnostics.length > 0) return failure(diagnostics);
  if (resourceBudgets.roster !== structural.roster || resourceBudgets.context !== structural.context) return failure([validationDiagnostic(structural, "EVALUATION_SUPPORTED_VALIDATION_INPUT_MISMATCH", "Resource budgets must retain the same roster and catalogue context objects.")]);
  diagnostics.push(...resourceBudgets.diagnostics);

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
  const categoryItems = categoryConstraints.forces.flatMap(({ constraints }) =>
    constraints
      .filter(isActionableSupportedConstraintReport)
      .map((report) => ({
        kind: "categoryConstraint" as const,
        status: report.status,
        report,
      })),
  );
  const items = [
    ...resourceBudgets.resources.filter(report => report.active).map(report => ({ kind: "resourceBudget" as const, status: report.status, report })),
    ...structuralItems,
    ...selectionItems,
    ...categoryItems,
    ...forceItems,
    ...authoredErrors.errors.map(report => ({ kind: "authoredError" as const, status: report.status, report })),
  ];
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
    categoryConstraints,
    forceConstraints,
    authoredErrors,
    resourceBudgets,
    findings,
    statusCounts,
    findingCounts: {
      resourceBudgets: countFindings(findings, "resourceBudget"),
      authoredErrors: countFindings(findings, "authoredError"),
      structural: countFindings(findings, "structural"),
      selectionConstraints: countFindings(
        findings,
        "selectionConstraint",
      ),
      categoryConstraints: countFindings(findings, "categoryConstraint"),
      forceConstraints: countFindings(findings, "forceConstraint"),
    },
    validity:
      structural.validity === "invalid" || statusCounts.violated > 0
        ? "invalid"
        : "valid",
    completeness:
      resourceBudgets.completeness === "complete" &&
      authoredErrors.completeness === "complete" &&
      structural.completeness === "complete" &&
      selectionConstraints.completeness === "complete" &&
      categoryConstraints.completeness === "complete" &&
      forceConstraints.completeness === "complete"
        ? "complete"
        : "incomplete",
  }, diagnostics);
}

/**
 * True when a constraint report has enough shape to be worth counting.
 *
 * A report missing its type, scope, or limit describes a constraint the
 * evaluator could not read at all; surfacing it as `unresolved` would put
 * an item in front of the user that names nothing they can act on.
 *
 * Dropping it costs no honesty. `constraints.ts` records a shape
 * diagnostic for each missing piece, any diagnostic makes that report
 * incomplete, and incompleteness propagates up to the composed report —
 * so the roster is still reported as not fully understood.
 */
export function isActionableSupportedConstraintReport(
  report:
    | RosterSelectionConstraintReport
    | RosterCategoryConstraintReport
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
  categoryConstraints: RosterCategoryConstraintsInRosterReport,
  forceConstraints: RosterForceConstraintsInRosterReport,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (
    structural.roster !== selectionConstraints.roster ||
    structural.roster !== categoryConstraints.roster ||
    structural.roster !== forceConstraints.roster ||
    structural.context !== selectionConstraints.context ||
    structural.context !== categoryConstraints.context ||
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
