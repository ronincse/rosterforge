// @vitest-environment jsdom
// Browser-independent checks for snapshot/layout readiness and safe downloads.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RosterPrintDialog } from "./roster-print-dialog.js";
import type { RosterPrintViewModel } from "./roster-print.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const model: RosterPrintViewModel = {
  name: "Unsaved <army> / &amp;", rosterId: "private", catalogueName: "Fiction", catalogueKey: "private",
  costs: { available: false, totals: [], diagnosticCount: 0 }, validation: { available: false, diagnosticCount: 0 }, forces: [],
  reference: { name: "Unsaved <army> / &amp;", catalogue: "Fiction", system: "Synthetic", resources: [], status: ["Incomplete"], units: [], glossary: [] },
};

it("prints the ready selected layout, reports blocking and cancels without editing its snapshot", () => {
  const before = JSON.stringify(model), print = vi.fn(() => false), close = vi.fn();
  render(<RosterPrintDialog model={model} onPrint={print} onClose={close} />);
  const frame = screen.getByTitle("Printable army preview");
  const button = screen.getByRole("button", { name: "Print / Save PDF" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.load(frame);
  fireEvent.click(button);
  expect(print).toHaveBeenLastCalledWith({ ...model, layout: "compact" });
  expect(screen.getByRole("alert").textContent).toContain("Allow popups");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "sheets" } });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(frame.getAttribute("srcdoc")).toContain('class="sheets"');
  fireEvent.load(frame);
  fireEvent.click(button);
  expect(print).toHaveBeenLastCalledWith({ ...model, layout: "sheets" });
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(close).toHaveBeenCalledOnce();
  expect(JSON.stringify(model)).toBe(before);
});

it("downloads standalone HTML independently of a loaded/allowed print window", () => {
  vi.useFakeTimers();
  const create = vi.fn(() => "blob:fiction"), revoke = vi.fn();
  vi.stubGlobal("URL", class extends URL { static override createObjectURL = create; static override revokeObjectURL = revoke; });
  let filename = "";
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
  const print = vi.fn(() => false);
  render(<RosterPrintDialog model={model} onPrint={print} onClose={() => undefined} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "sheets" } });
  fireEvent.click(screen.getByRole("button", { name: "Save HTML" }));
  expect(create).toHaveBeenCalledWith(expect.any(Blob));
  expect(filename).toBe("forcewright-Unsaved army  amp-sheets.html");
  expect(print).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000);
  expect(revoke).toHaveBeenCalledWith("blob:fiction");
});
