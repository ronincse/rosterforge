import { describe, expect, it, vi } from "vitest";

import { failure } from "@rosterforge/foundation";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
} from "@rosterforge/roster-model";
import { fixtureBytes } from "@rosterforge/test-fixtures";

import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import {
  createRosterPrintViewModel,
  openRosterPrintView,
  renderRosterPrintDocument,
  type RosterPrintWindow,
} from "./roster-print.js";
import {
  addLocalRosterChildSelection,
  addLocalRosterRootSelection,
  createLocalRosterSession,
  evaluateLocalRosterCosts,
  inspectLocalRosterSupportedValidation,
  localRosterChildChoices,
  localRosterRootChoices,
  setLocalRosterSelectionAmount,
  setLocalRosterSelectionName,
  type LocalRosterSession,
} from "./roster-session.js";

describe("roster print export", () => {
  it("preserves ordered roster identities, quantities, costs, and check status", async () => {
    const session = await printableSession();
    const costs = evaluateLocalRosterCosts(session);
    const validation = inspectLocalRosterSupportedValidation(session);

    expect(costs.ok).toBe(true);
    expect(validation.ok).toBe(true);

    const model = createRosterPrintViewModel(session, costs, validation);

    expect(model).toMatchObject({
      rosterId: "print-roster",
      name: "Print <Patrol>",
      catalogueName: "Projection Catalogue",
      catalogueId: "catalogue-203",
      forces: [
        {
          occurrenceId: "print-force",
          definitionId: "force-local",
          name: "Local Force",
          selections: [
            {
              occurrenceId: "print-root-first",
              definitionId: "entry-alpha",
              name: "Veteran <Alpha>",
              amount: 2.5,
              selections: [
                {
                  occurrenceId: "print-child",
                  name: "Options",
                  amount: 1,
                },
              ],
            },
            {
              occurrenceId: "print-root-second",
              definitionId: "entry-alpha",
              name: "Alpha",
              amount: 1,
            },
          ],
        },
      ],
    });
    expect(model.forces[0]?.selections.map(({ occurrenceId }) => occurrenceId))
      .toEqual(["print-root-first", "print-root-second"]);
    expect(model.forces[0]?.selections[0]?.selections.map(
      ({ occurrenceId }) => occurrenceId,
    )).toEqual(["print-child"]);

    if (costs.ok && model.costs.available) {
      expect(model.costs.completeness).toBe(costs.value.completeness);
      expect(model.costs.totals).toEqual(
        costs.value.totals.map((total) => ({
          typeId: total.typeId,
          name: total.costType.name ?? total.typeId,
          value: total.value,
        })),
      );
      expect(model.forces[0]?.selections[0]?.costs).toEqual(
        costs.value.selections[0]?.costs.flatMap((cost) =>
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
    if (validation.ok && model.validation.available) {
      expect(model.validation).toMatchObject({
        validity: validation.value.status.validity,
        completeness: validation.value.status.completeness,
        satisfied: validation.value.status.statusCounts.satisfied,
        violated: validation.value.status.statusCounts.violated,
        unresolved: validation.value.status.statusCounts.unresolved,
      });
    }

    const document = renderRosterPrintDocument(model);
    expect(document).toContain("Print &lt;Patrol&gt;");
    expect(document).toContain("Veteran &lt;Alpha&gt;");
    expect(document).not.toContain("Print <Patrol>");
    expect(document).not.toContain("Veteran <Alpha>");
    expect(document.indexOf("print-root-first")).toBeLessThan(
      document.indexOf("print-root-second"),
    );
    expect(document.indexOf("print-root-first")).toBeLessThan(
      document.indexOf("print-child"),
    );
    expect(document).toContain("2.5 x Veteran &lt;Alpha&gt;");
    expect(document).toContain("Roster occurrence ID");
    expect(document).toContain("Catalogue source ID");
    expect(document).toContain("not a BattleScribe .ros or .rosz interchange file");
  });

  it("opens a self-contained print window and reports blocked or failed windows", async () => {
    const session = await printableSession();
    const model = createRosterPrintViewModel(
      session,
      evaluateLocalRosterCosts(session),
      inspectLocalRosterSupportedValidation(session),
    );
    const write = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    const target: RosterPrintWindow = {
      opener: "calling-window",
      document: {
        open: vi.fn(),
        write,
        close: vi.fn(),
      },
      focus,
      print,
    };

    expect(openRosterPrintView(model, () => target)).toBe(true);
    expect(target.opener).toBeNull();
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(renderRosterPrintDocument(model));
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();

    expect(openRosterPrintView(model, () => null)).toBe(false);
    expect(
      openRosterPrintView(model, () => {
        throw new Error("popup API unavailable");
      }),
    ).toBe(false);
    expect(
      openRosterPrintView(model, () => ({
        ...target,
        document: {
          ...target.document,
          write: () => {
            throw new Error("print window unavailable");
          },
        },
      })),
    ).toBe(false);
  });

  it("keeps unavailable supported reports explicit in the print model", async () => {
    const session = await printableSession();
    const unavailable = failure([
      {
        code: "PRINT_TEST_UNAVAILABLE",
        message: "Synthetic report failure.",
        severity: "error",
        impacts: ["validation"],
      },
    ]);

    const model = createRosterPrintViewModel(
      session,
      unavailable,
      unavailable,
    );
    const document = renderRosterPrintDocument(model);

    expect(model.costs).toEqual({
      available: false,
      totals: [],
      diagnosticCount: 1,
    });
    expect(model.validation).toEqual({
      available: false,
      diagnosticCount: 1,
    });
    expect(document).toContain("Supported costs unavailable");
    expect(document).toContain("Supported checks unavailable");
    expect(document).toContain("1 diagnostic");
  });
});

async function printableSession(): Promise<LocalRosterSession> {
  const prepared = await prepareLocalCatalogueLibrary(
    [
      { filename: "projection.gst", bytes: fixtureBytes("projection.gst") },
      { filename: "projection.cat", bytes: fixtureBytes("projection.cat") },
    ],
    {
      import: {
        batchId: "roster-print",
        importedAt: "2026-08-13T16:00:00.000Z",
      },
    },
  );
  if (!prepared.ok) throw new Error("Expected printable fixture import.");

  const catalogue = prepared.value.catalogues.find(
    ({ id }) => id === "catalogue-203",
  );
  const force = catalogue?.context.forces.definitions.find(
    ({ source }) => source.id === "force-local",
  );
  if (catalogue === undefined || force === undefined) {
    throw new Error("Expected printable catalogue and force.");
  }

  const created = createLocalRosterSession(catalogue, force, {
    rosterId: rosterId("print-roster"),
    forceId: forceOccurrenceId("print-force"),
    name: "Print <Patrol>",
  });
  if (!created.ok) throw new Error("Expected printable roster creation.");

  const root = localRosterRootChoices(catalogue)[0];
  if (root === undefined) throw new Error("Expected printable root choice.");
  const first = addLocalRosterRootSelection(created.value, root, {
    selectionId: selectionOccurrenceId("print-root-first"),
  });
  if (!first.ok) throw new Error("Expected first printable root.");

  const child = localRosterChildChoices(
    first.value,
    selectionOccurrenceId("print-root-first"),
  )[0];
  if (child === undefined) throw new Error("Expected printable child choice.");
  const withChild = addLocalRosterChildSelection(
    first.value,
    selectionOccurrenceId("print-root-first"),
    child,
    { selectionId: selectionOccurrenceId("print-child") },
  );
  if (!withChild.ok) throw new Error("Expected printable child.");

  const second = addLocalRosterRootSelection(withChild.value, root, {
    selectionId: selectionOccurrenceId("print-root-second"),
  });
  if (!second.ok) throw new Error("Expected second printable root.");

  const renamed = setLocalRosterSelectionName(
    second.value,
    selectionOccurrenceId("print-root-first"),
    "Veteran <Alpha>",
  );
  if (!renamed.ok) throw new Error("Expected printable rename.");

  const amounted = setLocalRosterSelectionAmount(
    renamed.value,
    selectionOccurrenceId("print-root-first"),
    2.5,
  );
  if (!amounted.ok) throw new Error("Expected printable amount.");
  return amounted.value;
}
