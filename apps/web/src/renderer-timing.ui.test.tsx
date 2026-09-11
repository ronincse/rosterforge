// @vitest-environment jsdom

// Exercises React's development prop timing across a reused, open options panel.
// Source padding is synthetic and bounded: regression failure must not require OOM.
import { performance as nativePerformance } from "node:perf_hooks";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";

// React decides whether timing is supported when its module loads. jsdom's
// console lacks the browser's timestamp hook; install it before React imports,
// but retain the real performance.measure implementation and clone semantics.
const originalTimeStamp = vi.hoisted(() => {
  const original = console.timeStamp;
  if (typeof original !== "function") console.timeStamp = () => {};
  return original;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalTimeStamp === undefined) Reflect.deleteProperty(console, "timeStamp");
  else console.timeStamp = originalTimeStamp;
});

const encode = (text: string) => new TextEncoder().encode(text);
const padding = "x".repeat(32 * 1024);
const files = [
  {
    filename: "timing.gst",
    bytes: encode(`<gameSystem id="timing-system" name="Timing System" revision="1" battleScribeVersion="2.03"><forceEntries><forceEntry id="patrol" name="Patrol" /></forceEntries></gameSystem>`),
  },
  {
    filename: "alpha.cat",
    bytes: encode(`<catalogue id="alpha" name="Timing Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="timing-system" gameSystemRevision="1" library="false"><!--${padding}--><catalogueLinks><catalogueLink id="beta-link" name="Beta Library" targetId="beta" type="catalogue" importRootEntries="true" /></catalogueLinks><selectionEntries><selectionEntry id="alpha-unit" name="Alpha Guard" type="unit" /></selectionEntries></catalogue>`),
  },
  {
    filename: "beta.cat",
    bytes: encode(`<catalogue id="beta" name="Beta Library" revision="1" battleScribeVersion="2.03" gameSystemId="timing-system" gameSystemRevision="1" library="true"><!--${padding}--><selectionEntries><selectionEntry id="beta-unit" name="Beta Guard" type="unit" import="true" /></selectionEntries></catalogue>`),
  },
];

it("keeps cross-document editor and provenance timing bounded while options stay open", async () => {
  const originalBytes = files.map(file => Array.from(file.bytes));
  const maxima = new Map<string, { rows: number; characters: number }>();
  const measure = nativePerformance.measure.bind(nativePerformance);
  vi.spyOn(performance, "measure").mockImplementation((name, options, endMark) => {
    if (typeof options === "object") {
      const detail = options.detail as
        | { devtools?: { properties?: unknown } }
        | undefined;
      const properties = detail?.devtools?.properties;
      const component = name.replace(/^\u200b/u, "");
      if (
        ["RosterSelectionEdit", "ChoiceDeveloperDetails"].includes(component) &&
        Array.isArray(properties)
      ) {
        const characters = properties.reduce<number>((total, pair: unknown) => {
          if (!Array.isArray(pair)) return total;
          return total + pair.reduce<number>(
            (length, value: unknown) => length + (typeof value === "string" ? value.length : 0),
            0,
          );
        }, 0);
        const previous = maxima.get(component);
        maxima.set(component, {
          rows: Math.max(previous?.rows ?? 0, properties.length),
          characters: Math.max(previous?.characters ?? 0, characters),
        });
      }
    }
    // Call the native structured clone unchanged; never swallow an allocation error.
    return Reflect.apply(measure, undefined, [name, options, endMark]) as PerformanceMeasure;
  });

  const prepared = await prepareLocalCatalogueLibrary(files, {
    import: { batchId: "renderer-timing", importedAt: "2026-09-11T00:00:00Z" },
  });
  if (!prepared.ok) throw new Error("Synthetic timing catalogue did not import");
  let nextId = 0;
  render(<App prepareLibrary={async () => prepared} createEntityId={kind => `${kind}-${++nextId}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"), {
    target: { files: files.map(file => ({
      name: file.filename,
      arrayBuffer: async () => Uint8Array.from(file.bytes).buffer,
    })) },
  });
  await screen.findByRole("heading", { name: "Timing Catalogue" });
  fireEvent.change(screen.getByLabelText("Roster name"), { target: { value: "Timing Patrol" } });
  fireEvent.click(screen.getByRole("button", { name: "Create roster" }));
  await screen.findByRole("heading", { name: "Timing Patrol" });

  for (const name of ["Alpha Guard", "Beta Guard"]) {
    fireEvent.click(screen.getByRole("button", { name: /^Add unit,/u }));
    fireEvent.click(screen.getByRole("button", { name: `Add ${name}` }));
    expect(screen.getByRole("button", { name: `Close options for ${name}` })).toBeTruthy();
  }
  // Do not close between units: remounting skips the changed-prop diff entirely.
  fireEvent.click(screen.getByText("Edit selection"));
  expect(screen.getByLabelText("Occurrence name")).toHaveProperty("value", "Beta Guard");
  expect(screen.getByLabelText("Amount")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Configure Alpha Guard" }));
  expect(screen.getByRole("button", { name: "Close options for Alpha Guard" })).toBeTruthy();
  expect(screen.getByLabelText("Occurrence name")).toHaveProperty("value", "Alpha Guard");

  for (const component of ["RosterSelectionEdit", "ChoiceDeveloperDetails"]) {
    const maximum = maxima.get(component);
    expect(maximum, `${component} must actually exercise changed-prop timing`).toBeDefined();
    expect(maximum!.rows, component).toBeLessThan(256);
    expect(maximum!.characters, component).toBeLessThan(4096);
  }
  for (const [index, file] of files.entries()) {
    const document = prepared.value.documents.find(doc => doc.source.filename === file.filename)!;
    expect(Array.from(file.bytes)).toEqual(originalBytes[index]);
    expect(Array.from(document.sourceBytes)).toEqual(originalBytes[index]);
    expect(Array.from(document.documentBytes)).toEqual(originalBytes[index]);
  }
}, 15000);
