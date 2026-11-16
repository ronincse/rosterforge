// @vitest-environment jsdom
/**
 * Whole-draft duplication through the real controller and draft store.
 *
 * `docs/product-vision.md` step 5 is "save, reopen, duplicate, and revise", and
 * duplicate was the missing verb: the shelf offered Open and Delete only. What
 * is worth testing here is not that a second card appears but what the copy
 * shares, what it must not inherit, and what it must leave alone — the batch
 * bytes, the undo history, and the session the user is still editing.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { localRosterRootChoices } from "./roster-session.js";
import {
  copiedDraftName,
  useRosterForgeAppController,
} from "./use-app-controller.js";
import {
  createLocalRosterDraftStore,
  type StoredRecord,
} from "./browser-drafts.js";
import type { LocalRosterDraft } from "@rosterforge/persistence";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const files = [
  [
    "duplication.gst",
    '<gameSystem id="duplication-system" name="Duplication" battleScribeVersion="2.03" revision="1"><costTypes><costType id="points" name="pts" /></costTypes></gameSystem>',
  ],
  [
    "duplication.cat",
    '<catalogue id="duplication" name="Duplication" gameSystemId="duplication-system" battleScribeVersion="2.03" revision="1"><forceEntries><forceEntry id="force" name="Army" /></forceEntries><selectionEntries><selectionEntry id="squad" name="Squad" type="unit"><costs><cost name="pts" typeId="points" value="10" /></costs></selectionEntry></selectionEntries></catalogue>',
  ],
].map(([name, xml]) => ({
  name: name!,
  type: "application/xml",
  arrayBuffer: async () => new TextEncoder().encode(xml!).buffer,
}));

function setup() {
  const records = new Map<string, StoredRecord>();
  const writes: string[] = [];
  let failWrites = false;
  const store = createLocalRosterDraftStore({
    getAll: async () => [...records.values()],
    get: async (id) => records.get(id),
    put: async (record) => {
      if (failWrites && record.id.startsWith("draft-")) {
        throw new Error("Synthetic write failure");
      }
      writes.push(record.id);
      records.set(record.id, record);
    },
    delete: async (id) => {
      records.delete(id);
    },
  });
  // Every duplication must mint its own key, so unlike the durability harness
  // this counts rather than returning a fixed id.
  let draft = 0;
  let entity = 0;
  const mount = () =>
    renderHook(() =>
      useRosterForgeAppController({
        draftStore: store,
        createBatchId: () => "duplication",
        createDraftId: () => `draft-${++draft}`,
        createEntityId: (kind) => `${kind}-${++entity}`,
        autosaveDelayMs: 100,
      }),
    );
  return {
    store,
    records,
    writes,
    mount,
    failWrites: () => {
      failWrites = true;
    },
    batchRecords: () =>
      [...records.keys()].filter((key) => key.startsWith("files:")),
    draftRecords: () =>
      [...records.keys()].filter((key) => key.startsWith("draft-")),
  };
}

type Hook = ReturnType<ReturnType<typeof setup>["mount"]>;

/** Loads a draft and narrows the `Result`, failing the test if it is absent. */
async function loadedDraft(
  env: ReturnType<typeof setup>,
  id: string,
): Promise<LocalRosterDraft> {
  const loaded = await env.store.load(id);
  if (!loaded.ok || loaded.value === undefined) {
    throw new Error(`Expected saved roster draft ${id} to load.`);
  }
  return loaded.value;
}

async function createAndSave(hook: Hook) {
  await act(async () => {
    await hook.result.current.importFiles(files);
  });
  const catalogue = hook.result.current.selectedCatalogue!;
  act(() =>
    hook.result.current.createRoster(
      catalogue,
      catalogue.context.forces.definitions[0]!,
      "Patrol",
    ),
  );
  const choice = localRosterRootChoices(catalogue)[0]!;
  act(() => {
    hook.result.current.addRootSelection(choice);
  });
  await act(async () => {
    await hook.result.current.saveRosterDraft();
  });
}

function rename(hook: Hook, value: string) {
  const id =
    hook.result.current.rosterSession!.roster.forces[0]!.selections[0]!.id;
  act(() => hook.result.current.renameSelection(id, value));
}

describe("saved draft duplication", () => {
  it("adds a second draft that shares the one stored batch", async () => {
    // The shared batch is the whole reason the copy is cheap: a second batch
    // record would store the catalogue closure twice, 8.2 MB per faction.
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    expect(env.batchRecords()).toEqual(["files:duplication"]);

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    expect(env.draftRecords().sort()).toEqual(["draft-1", "draft-2"]);
    expect(env.batchRecords()).toEqual(["files:duplication"]);
    const copy = await env.store.load("draft-2");
    const source = await env.store.load("draft-1");
    expect(copy.ok && copy.value?.import.batchId).toBe("duplication");
    expect(copy.ok && copy.value?.roster.name).toBe("Patrol (copy)");
    expect(copy.ok && copy.value?.roster.forces).toEqual(
      source.ok ? source.value?.roster.forces : undefined,
    );
    expect(copy.ok && copy.value?.roster.id).not.toBe(
      source.ok ? source.value?.roster.id : undefined,
    );
    expect(hook.result.current.draftShelf.drafts.map((d) => d.rosterName)).toEqual(
      expect.arrayContaining(["Patrol", "Patrol (copy)"]),
    );
    expect(hook.result.current.draftAction.diagnostics).toEqual([]);
    expect(hook.result.current.draftAction.message).toBe(
      "Copied this roster draft as Patrol (copy).",
    );
  });

  it("leaves the open session on the source draft and autosaves it, not the copy", async () => {
    // Making the copy active would silently redirect the user's next edits
    // into a draft they only asked to have copied.
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    const open = hook.result.current.rosterSession!.roster;

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    expect(hook.result.current.activeDraft?.id).toBe("draft-1");
    expect(hook.result.current.rosterSession?.roster).toBe(open);
    expect(hook.result.current.unsavedChanges).toBe(false);

    vi.useFakeTimers();
    rename(hook, "Edited after copying");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const edited = hook.result.current.rosterSession!.roster;
    const source = await env.store.load("draft-1");
    const copy = await env.store.load("draft-2");
    expect(source.ok && source.value?.roster).toEqual(edited);
    expect(copy.ok && copy.value?.roster.forces[0]?.selections[0]?.name).not.toBe(
      "Edited after copying",
    );
  });

  it("copies the last saved state and says so when edits are unsaved", async () => {
    // The shelf lists saved drafts, so a shelf action copies what is stored.
    // That is defensible but invisible, which is why the message states it.
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    const saved = hook.result.current.rosterSession!.roster;
    vi.useFakeTimers();
    rename(hook, "Unsaved edit");
    expect(hook.result.current.unsavedChanges).toBe(true);

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    const copy = await env.store.load("draft-2");
    expect(copy.ok && copy.value?.roster.forces).toEqual(saved.forces);
    expect(hook.result.current.draftAction.message).toBe(
      "Copied the last saved version as Patrol (copy). Unsaved changes are not in the copy.",
    );
    // The edit is still the user's to save, and still unsaved.
    expect(hook.result.current.unsavedChanges).toBe(true);
  });

  it("gives the copy a clean history and leaves the source history alone", async () => {
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    rename(hook, "One edit");
    await act(async () => {
      await hook.result.current.saveRosterDraft();
    });
    const sourceHistory = await env.store.load("draft-1");
    expect(sourceHistory.ok && sourceHistory.value?.history?.past.length).toBe(2);

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    const copy = await env.store.load("draft-2");
    const source = await env.store.load("draft-1");
    expect(copy.ok && copy.value?.history).toBeUndefined();
    expect(env.records.has("history:draft-2")).toBe(false);
    expect(source.ok && source.value?.history?.past.length).toBe(2);
  });

  it("keeps the shared bytes until the last of the two drafts is deleted", async () => {
    // Batch collection is refcounted by scanning the remaining drafts, so a
    // copy has to keep its source's bytes alive after the source goes.
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    await act(async () => {
      await hook.result.current.deleteRosterDraft("draft-1");
    });
    expect(env.batchRecords()).toEqual(["files:duplication"]);
    const survivor = await env.store.load("draft-2");
    expect(survivor.ok && survivor.value?.import.files).toHaveLength(2);

    await act(async () => {
      await hook.result.current.deleteRosterDraft("draft-2");
    });
    expect(env.batchRecords()).toEqual([]);
  });

  it("numbers repeated copies instead of colliding on one name", async () => {
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });
    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });
    // Copying a copy must not stack suffixes.
    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-2");
    });

    const names = hook.result.current.draftShelf.drafts.map(
      (draft) => draft.rosterName,
    );
    expect([...names].sort()).toEqual(
      [
        "Patrol",
        "Patrol (copy)",
        "Patrol (copy 2)",
        "Patrol (copy 3)",
      ].sort(),
    );
    expect(new Set(names).size).toBe(4);
  });

  it("still produces two openable drafts from a pre-split legacy source", async () => {
    // Drafts written before source bytes were split out carry their own bytes
    // and have no `files:` record. Copying one therefore cannot share a batch
    // that does not exist: the copy's save creates the batch record from the
    // bytes it was handed. Both drafts stay openable with their real bytes —
    // but the closure is now stored twice, inline in the legacy record and
    // once in the new batch record. That is the one case where duplication is
    // not cheap, and it is recorded rather than migrated.
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    // Re-shape the store into the legacy layout: real bytes inline, no batch.
    env.records.set("draft-1", await loadedDraft(env, "draft-1"));
    env.records.delete("files:duplication");
    expect(env.batchRecords()).toEqual([]);

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    expect(hook.result.current.draftAction.diagnostics).toEqual([]);
    for (const id of ["draft-1", "draft-2"]) {
      const loaded = await loadedDraft(env, id);
      expect(loaded.import.files).toHaveLength(2);
      for (const file of loaded.import.files) {
        expect(file.bytes.byteLength).toBeGreaterThan(0);
      }
    }
    expect(env.batchRecords()).toEqual(["files:duplication"]);
  });

  it("writes a new draft id and leaves the source record and its history byte-identical", async () => {
    // The nearest wrong implementation reuses the save path, which prefers
    // `activeDraft?.id` — with a draft open that overwrites the source and
    // takes its history with it, which reads as a duplicate that silently
    // destroyed the original.
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    rename(hook, "One edit");
    await act(async () => {
      await hook.result.current.saveRosterDraft();
    });
    // Reference identity, not deep equality: any rewrite of these records
    // would put a freshly decoded object in the map, so this catches an
    // overwrite that happened to produce identical content.
    const sourceBefore = env.records.get("draft-1");
    const historyBefore = env.records.get("history:draft-1");
    expect(sourceBefore).toBeDefined();
    expect(historyBefore).toBeDefined();
    const writesBefore = env.writes.length;

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    expect(env.records.get("draft-1")).toBe(sourceBefore);
    expect(env.records.get("history:draft-1")).toBe(historyBefore);
    expect(env.records.has("draft-2")).toBe(true);
    // Exactly one record written: the copy's own. No batch, no history.
    expect(env.writes.slice(writesBefore)).toEqual(["draft-2"]);
  });

  it("reports a draft that is already gone without writing anything", async () => {
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    env.records.delete("draft-1");

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    expect(env.draftRecords()).toEqual([]);
    expect(hook.result.current.draftAction.kind).toBe("idle");
    expect(hook.result.current.draftAction.message).toBe(
      "That saved roster draft is no longer in this browser.",
    );
  });

  it("reports a refused write and leaves the shelf as it was", async () => {
    const env = setup();
    const hook = env.mount();
    await createAndSave(hook);
    env.failWrites();

    await act(async () => {
      await hook.result.current.duplicateRosterDraft("draft-1");
    });

    expect(env.draftRecords()).toEqual(["draft-1"]);
    expect(hook.result.current.draftAction.message).toBe(
      "The roster draft was not copied.",
    );
    expect(hook.result.current.draftAction.diagnostics.length).toBeGreaterThan(0);
    expect(hook.result.current.activeDraft?.id).toBe("draft-1");
  });
});

describe("copy naming", () => {
  it("does not stack suffixes and fills the lowest free number", () => {
    expect(copiedDraftName("Patrol", [])).toBe("Patrol (copy)");
    expect(copiedDraftName("Patrol", ["Patrol (copy)"])).toBe("Patrol (copy 2)");
    expect(copiedDraftName("Patrol (copy)", ["Patrol (copy)"])).toBe(
      "Patrol (copy 2)",
    );
    expect(
      copiedDraftName("Patrol (copy 2)", ["Patrol (copy)", "Patrol (copy 3)"]),
    ).toBe("Patrol (copy 2)");
  });
});
