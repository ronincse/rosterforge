import { describe, expect, it } from "vitest";

import { objectId } from "@rosterforge/foundation";
import {
  createLocalRosterDraft,
  type LocalRosterDraft,
} from "@rosterforge/persistence";
import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
  selectionOccurrenceId,
} from "@rosterforge/roster-model";

import {
  createIndexedDbLocalRosterDraftStore,
  createLocalRosterDraftStore,
  type LocalRosterDraftRecordBackend,
} from "./browser-drafts.js";

describe("local roster draft store", () => {
  it("lists valid records newest-first and diagnoses malformed siblings", async () => {
    const older = draft("older", "2026-07-23T12:01:00.000Z");
    const newer = draft("newer", "2026-07-23T12:02:00.000Z");
    const { backend } = memoryBackend([
      older,
      { format: "unknown" },
      newer,
    ]);

    const result = await createLocalRosterDraftStore(backend).list();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map(({ id }) => id)).toEqual(["newer", "older"]);
    expect(result.value[0]).toMatchObject({
      rosterName: "Roster newer",
      fileCount: 1,
      totalFileBytes: 3,
      selectionCount: 1,
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "PERSISTENCE_DRAFT_FORMAT_UNSUPPORTED",
      }),
    ]);
  });

  it("loads a valid record and reports a missing record without failure", async () => {
    const saved = draft("saved", "2026-07-23T12:01:00.000Z");
    const { backend } = memoryBackend([saved]);
    const store = createLocalRosterDraftStore(backend);

    const loaded = await store.load("saved");
    expect(loaded).toMatchObject({
      ok: true,
      value: { id: "saved" },
    });
    expect(await store.load("missing")).toEqual({
      ok: true,
      value: undefined,
      diagnostics: [],
    });
  });

  it("stores batch bytes once and keeps them out of the draft record", async () => {
    const value = draft("saved", "2026-07-23T12:01:00.000Z");
    const sourceBytes = value.import.files[0]!.bytes;
    const { backend, records } = memoryBackend();
    const store = createLocalRosterDraftStore(backend);

    const result = await store.save(value);

    expect(result).toEqual({ ok: true, value: undefined, diagnostics: [] });
    // The draft record keeps placeholders: rewriting it must not rewrite the
    // catalogue, which is megabytes even for one faction.
    const stored = records.get("saved") as LocalRosterDraft | undefined;
    expect(stored?.import.files[0]?.bytes).toEqual(new Uint8Array(0));

    // The bytes live once under the batch, still defensively copied.
    const shared = records.get(
      `files:${value.import.batchId}`,
    ) as { files: readonly { bytes: Uint8Array }[] } | undefined;
    expect(shared?.files[0]?.bytes).toEqual(sourceBytes);
    expect(shared?.files[0]?.bytes).not.toBe(sourceBytes);

    // Loading reassembles them, so callers never see the split.
    const loaded = await store.load("saved");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value?.import.files[0]?.bytes).toEqual(sourceBytes);
  });

  it.each([
    {
      operation: "list",
      code: "PERSISTENCE_DRAFT_READ_FAILED",
    },
    {
      operation: "load",
      code: "PERSISTENCE_DRAFT_READ_FAILED",
    },
    {
      operation: "save",
      code: "PERSISTENCE_DRAFT_WRITE_FAILED",
    },
    {
      operation: "delete",
      code: "PERSISTENCE_DRAFT_DELETE_FAILED",
    },
  ] as const)(
    "maps a backend $operation failure to a persistence diagnostic",
    async ({ operation, code }) => {
      const backend = failingBackend(operation);
      const store = createLocalRosterDraftStore(backend);
      const result =
        operation === "list"
          ? await store.list()
          : operation === "load"
            ? await store.load("saved")
            : operation === "save"
              ? await store.save(
                  draft("saved", "2026-07-23T12:01:00.000Z"),
                )
              : await store.delete("saved");

      expect(result).toEqual({
        ok: false,
        diagnostics: [
          expect.objectContaining({
            code,
            impacts: ["persistence"],
            details: { cause: `${operation} failed` },
          }),
        ],
      });
    },
  );

  it("reports unavailable IndexedDB without throwing", async () => {
    const store = createIndexedDbLocalRosterDraftStore(null);

    expect(await store.list()).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_INDEXEDDB_UNAVAILABLE",
        }),
      ],
    });
  });
});

function draft(id: string, updatedAt: string): LocalRosterDraft {
  const result = createLocalRosterDraft({
    id,
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt,
    catalogueKey: "fixture:catalogue",
    import: {
      batchId: "batch-1",
      importedAt: "2026-07-23T11:59:00.000Z",
      files: [
        {
          filename: "fixture.cat",
          bytes: Uint8Array.from([1, 2, 3]),
        },
      ],
    },
    roster: {
      id: rosterId(`roster-${id}`),
      name: `Roster ${id}`,
      catalogue: {
        kind: "catalogue",
        key: rosterDefinitionKey("fixture:catalogue"),
        sourceId: objectId("catalogue-source"),
      },
      forces: [
        {
          id: forceOccurrenceId(`force-${id}`),
          definition: {
            kind: "forceEntry",
            key: rosterDefinitionKey("fixture:force"),
          },
          forces: [],
          selections: [
            {
              id: selectionOccurrenceId(`selection-${id}`),
              definition: {
                kind: "selectionEntry",
                key: rosterDefinitionKey("fixture:selection"),
              },
              selections: [],
            },
          ],
        },
      ],
    },
  });
  if (!result.ok) {
    throw new Error("Expected fixture draft creation to succeed.");
  }
  return result.value;
}

function memoryBackend(initial: readonly unknown[] = []): {
  readonly backend: LocalRosterDraftRecordBackend;
  readonly records: Map<string, unknown>;
} {
  const records = new Map<string, unknown>();
  for (const [index, record] of initial.entries()) {
    records.set(recordId(record) ?? `unknown-${index}`, record);
  }
  return {
    records,
    backend: {
      getAll: async () => [...records.values()],
      get: async (id) => records.get(id),
      put: async (value) => {
        records.set(value.id, value);
      },
      delete: async (id) => {
        records.delete(id);
      },
    },
  };
}

function recordId(record: unknown): string | undefined {
  if (typeof record !== "object" || record === null) return undefined;
  const id = Reflect.get(record, "id");
  return typeof id === "string" ? id : undefined;
}

function failingBackend(
  operation: "list" | "load" | "save" | "delete",
): LocalRosterDraftRecordBackend {
  const fail = () => Promise.reject(new Error(`${operation} failed`));
  return {
    getAll: operation === "list" ? fail : async () => [],
    get: operation === "load" ? fail : async () => undefined,
    put: operation === "save" ? fail : async () => undefined,
    delete: operation === "delete" ? fail : async () => undefined,
  };
}
