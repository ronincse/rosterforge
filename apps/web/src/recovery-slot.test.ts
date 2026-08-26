import { describe, expect, it } from "vitest";

import { objectId, success, type Result } from "@rosterforge/foundation";
import {
  createLocalRosterDraft,
  type LocalRosterDraft,
} from "@rosterforge/persistence";
import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
} from "@rosterforge/roster-model";

import {
  recoveryDraftId,
  type LocalRosterDraftStore,
} from "./browser-drafts.js";
import { createRecoverySlot } from "./recovery-slot.js";

describe("recovery slot", () => {
  it("clears after a write already in flight rather than racing it", async () => {
    const { store, log, settleSave } = recordingStore();
    const slot = createRecoverySlot(store);

    // The shape the controller produces: a debounced slot write starts, and the
    // roster is saved as a real draft before that write reaches the store.
    const writing = slot.write(recoveryDraft());
    const clearing = slot.clear();
    // Draining microtasks is what a fire-and-forget pair would need to reach
    // the store; the clear must still not have been issued.
    for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
    expect(log).toEqual(["save:started"]);

    settleSave();
    await Promise.all([writing, clearing]);

    expect(log).toEqual(["save:started", "save:finished", "delete:started"]);
  });

  it("keeps ordering when an earlier operation rejects", async () => {
    const failures: LocalRosterDraftStore = {
      list: async () => success([]),
      load: async () => success(undefined),
      save: async () => {
        throw new Error("quota");
      },
      delete: async () => success(undefined),
    };
    const slot = createRecoverySlot(failures);

    // A failed write must not strand the clear: the slot would then stay
    // populated for every later session.
    await expect(slot.write(recoveryDraft())).rejects.toThrow("quota");
    await expect(slot.clear()).resolves.toMatchObject({ ok: true });
  });
});

/**
 * A store whose `save` blocks until released, so a test can hold a write in
 * flight and observe what the slot does with a clear requested meanwhile.
 */
function recordingStore(): {
  readonly store: LocalRosterDraftStore;
  readonly log: string[];
  readonly settleSave: () => void;
} {
  const log: string[] = [];
  let release = (): void => undefined;
  const saved = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    log,
    settleSave: () => {
      release();
    },
    store: {
      list: async () => success([]),
      load: async () => success(undefined),
      save: async (): Promise<Result<void>> => {
        log.push("save:started");
        await saved;
        log.push("save:finished");
        return success(undefined);
      },
      delete: async (): Promise<Result<void>> => {
        log.push("delete:started");
        return success(undefined);
      },
    },
  };
}

function recoveryDraft(): LocalRosterDraft {
  const result = createLocalRosterDraft({
    id: recoveryDraftId,
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    catalogueKey: "fixture:catalogue",
    import: {
      batchId: "batch-1",
      importedAt: "2026-07-23T11:59:00.000Z",
      files: [{ filename: "fixture.cat", bytes: Uint8Array.from([1, 2, 3]) }],
    },
    roster: {
      id: rosterId("roster-recovery"),
      name: "Roster recovery",
      catalogue: {
        kind: "catalogue",
        key: rosterDefinitionKey("fixture:catalogue"),
        sourceId: objectId("catalogue-source"),
      },
      forces: [
        {
          id: forceOccurrenceId("force-recovery"),
          definition: {
            kind: "forceEntry",
            key: rosterDefinitionKey("fixture:force"),
          },
          forces: [],
          selections: [],
        },
      ],
    },
  });
  if (!result.ok) throw new Error("Expected fixture draft creation to succeed.");
  return result.value;
}
