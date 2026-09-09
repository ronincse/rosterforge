// @vitest-environment jsdom
/** Exercises real draft validation/storage through the controller lifecycle. */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { localRosterRootChoices } from "./roster-session.js";
import { useRosterForgeAppController } from "./use-app-controller.js";
import { createLocalRosterDraftStore, recoveryDraftId, type StoredRecord } from "./browser-drafts.js";

afterEach(() => { cleanup(); vi.useRealTimers(); });

const files = [
  ["durability.gst", '<gameSystem id="durability-system" name="Durability" battleScribeVersion="2.03" revision="1"><costTypes><costType id="points" name="pts" /></costTypes></gameSystem>'],
  ["durability.cat", '<catalogue id="durability" name="Durability" gameSystemId="durability-system" battleScribeVersion="2.03" revision="1"><forceEntries><forceEntry id="force" name="Army" /></forceEntries><selectionEntries><selectionEntry id="squad" name="Squad" type="unit"><selectionEntries><selectionEntry id="weapon" name="Configured weapon" type="upgrade"><constraints><constraint id="weapon-min" type="min" field="selections" scope="parent" value="1" /></constraints></selectionEntry></selectionEntries><costs><cost name="pts" typeId="points" value="10" /></costs></selectionEntry></selectionEntries></catalogue>'],
].map(([name, xml]) => ({ name: name!, type: "application/xml", arrayBuffer: async () => new TextEncoder().encode(xml!).buffer }));

function setup() {
  const records = new Map<string, StoredRecord>();
  let fail = false;
  let writeGate: Promise<void> | undefined;
  const store = createLocalRosterDraftStore({
    getAll: async () => [...records.values()],
    get: async id => records.get(id),
    put: async record => {
      if (record.id === "named") await writeGate;
      if (fail && record.id === "named") throw new Error("Synthetic write failure");
      records.set(record.id, record);
    },
    delete: async id => { records.delete(id); },
  });
  let entity = 0;
  const mount = () => renderHook(() => useRosterForgeAppController({
    draftStore: store, createBatchId: () => "durability", createDraftId: () => "named",
    createEntityId: kind => `${kind}-${++entity}`, autosaveDelayMs: 100,
  }));
  return {
    store, records, mount, failWrites: () => { fail = true; },
    holdWrites: () => {
      let release!: () => void;
      writeGate = new Promise<void>(resolve => { release = resolve; });
      return release;
    },
  };
}

async function create(hook: ReturnType<ReturnType<typeof setup>["mount"]>) {
  await act(async () => { await hook.result.current.importFiles(files); });
  const catalogue = hook.result.current.selectedCatalogue!;
  act(() => hook.result.current.createRoster(catalogue, catalogue.context.forces.definitions[0]!, "Durability roster"));
  const choice = localRosterRootChoices(catalogue)[0]!;
  act(() => { hook.result.current.addRootSelection(choice); });
}

function edit(hook: ReturnType<ReturnType<typeof setup>["mount"]>, value: number) {
  const id = hook.result.current.rosterSession!.roster.forces[0]!.selections[0]!.id;
  act(() => hook.result.current.renameSelection(id, `Configured squad ${value}`));
}

describe("durable history before validation", () => {
  it.each([20, 21, 100])("saves and reopens the current configured roster after %i edits", async count => {
    const env = setup(); const hook = env.mount(); await create(hook);
    for (let n = 1; n < count; n++) edit(hook, n);
    const current = hook.result.current.rosterSession!.roster;
    const history = hook.result.current.rosterHistory!;
    expect(history.past).toHaveLength(count);
    expect(current.forces[0]!.selections[0]!.selections[0]!.name).toBe("Configured weapon");
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    expect(hook.result.current.draftAction.diagnostics).toEqual([]);
    expect(hook.result.current.unsavedChanges).toBe(false);
    expect(hook.result.current.draftAction.message).toBe("Saved Durability roster in this browser.");
    expect(hook.result.current.rosterHistory).toBe(history);
    const saved = await env.store.load("named");
    expect(saved.ok && saved.value?.roster).toEqual(current);
    expect(saved.ok && saved.value?.history?.past.length).toBe(Math.min(20, count));
    hook.unmount(); const reopened = env.mount();
    await act(async () => { await reopened.result.current.loadRosterDraft("named"); });
    expect(reopened.result.current.rosterSession?.roster).toEqual(current);
    expect(reopened.result.current.unsavedChanges).toBe(false);
    expect(reopened.result.current.rosterHistory?.past).toHaveLength(Math.min(20, count));
    act(() => reopened.result.current.undoRosterEdit());
    expect(reopened.result.current.rosterSession?.roster).toEqual(history.past.at(-1)?.roster);
  });

  it("shares the 20-entry allowance across past and future and preserves current amounts", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    for (let n = 1; n < 100; n++) edit(hook, n);
    const id = hook.result.current.rosterSession!.roster.forces[0]!.selections[0]!.id;
    act(() => hook.result.current.setSelectionAmount(id, 3));
    for (let n = 0; n < 90; n++) act(() => hook.result.current.undoRosterEdit());
    const history = hook.result.current.rosterHistory!;
    expect(history.past).toHaveLength(10); expect(history.future).toHaveLength(90);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    const loaded = await env.store.load("named");
    expect(loaded.ok).toBe(true); if (!loaded.ok) return;
    expect(loaded.value?.roster).toEqual(history.present.roster);
    expect(loaded.value?.history).toEqual({ past: history.past.map(s => s.roster), future: history.future.slice(0, 10).map(s => s.roster) });
    for (let n = 0; n < 90; n++) act(() => hook.result.current.redoRosterEdit());
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    const latest = hook.result.current.rosterSession!.roster;
    expect(latest.forces[0]!.selections[0]!.amount).toBe(3);
    await act(async () => { await hook.result.current.loadRosterDraft("named"); });
    expect(hook.result.current.rosterSession?.roster).toEqual(latest);
  });

  it("autosaves long histories, hides stale success, and keeps failed updates unsaved", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    vi.useFakeTimers();
    for (let n = 0; n < 100; n++) edit(hook, n);
    expect(hook.result.current.unsavedChanges).toBe(true);
    expect(hook.result.current.draftAction.message).toBeUndefined();
    const current = hook.result.current.rosterSession!.roster;
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(hook.result.current.unsavedChanges).toBe(false);
    const saved = await env.store.load("named"); expect(saved.ok && saved.value?.roster).toEqual(current);
    env.failWrites(); edit(hook, 101);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(hook.result.current.unsavedChanges).toBe(true);
    expect(hook.result.current.draftAction.message).toBe("The roster draft was not saved.");
    const unchanged = await env.store.load("named"); expect(unchanged.ok && unchanged.value?.roster).toEqual(current);
  });

  it("writes recovery for a long unsaved editing session", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    vi.useFakeTimers(); for (let n = 0; n < 100; n++) edit(hook, n);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const recovered = await env.store.load(recoveryDraftId);
    expect(recovered.ok && recovered.value?.roster).toEqual(hook.result.current.rosterSession!.roster);
    expect(hook.result.current.unsavedChanges).toBe(true);
    expect(env.records.has("named")).toBe(false);
  });

  it("keeps edits made during a pending save unsaved until their own write completes", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    const current = hook.result.current.rosterSession!.roster;
    const release = env.holdWrites(); let saving!: Promise<void>;
    act(() => { saving = hook.result.current.saveRosterDraft(); });
    expect(hook.result.current.draftAction.kind).toBe("saving");
    expect(hook.result.current.unsavedChanges).toBe(true);
    edit(hook, 42);
    await act(async () => { release(); await saving; });
    expect(hook.result.current.unsavedChanges).toBe(true);
    expect(hook.result.current.draftAction.message).toBeUndefined();
    const saved = await env.store.load("named"); expect(saved.ok && saved.value?.roster).toEqual(current);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    expect(hook.result.current.unsavedChanges).toBe(false);
    expect(hook.result.current.draftAction.message).toBe("Saved Durability roster in this browser.");
  });
});

describe("recovery lifecycle", () => {
  it("preserves another roster's recovery when saving before the new debounce", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    vi.useFakeTimers(); edit(hook, 1);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const original = hook.result.current.rosterSession!.roster;
    await create(hook);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    const recovery = await env.store.load(recoveryDraftId);
    expect(recovery.ok && recovery.value?.roster).toEqual(original);
  });

  it("protects the open roster when its named draft is deleted", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    vi.useFakeTimers();
    await act(async () => { await hook.result.current.deleteRosterDraft("named"); });
    expect(hook.result.current.unsavedChanges).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(env.records.has(recoveryDraftId)).toBe(true);
  });

  it("falls back to recovery after an active draft autosave fails", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    vi.useFakeTimers(); env.failWrites();
    for (let n = 0; n < 100; n++) edit(hook, n);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const recovery = await env.store.load(recoveryDraftId);
    expect(recovery.ok && recovery.value?.roster).toEqual(hook.result.current.rosterSession!.roster);
    expect(hook.result.current.unsavedChanges).toBe(true);
  });

  it.each([false, true])("retains recovered work through reload and first save (failed save: %s)", async failed => {
    const env = setup(); const first = env.mount(); await create(first);
    vi.useFakeTimers(); for (let n = 0; n < 100; n++) edit(first, n);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const original = first.result.current.rosterSession!.roster;
    first.unmount(); const recovered = env.mount();
    await act(async () => { await recovered.result.current.recoverUnsavedRoster(); });
    expect(recovered.result.current.rosterSession?.roster).toEqual(original);
    expect(recovered.result.current.activeDraft).toBeUndefined();
    expect(recovered.result.current.unsavedChanges).toBe(true);
    expect(env.records.has(recoveryDraftId)).toBe(true);
    const guard = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(guard); expect(guard.defaultPrevented).toBe(true);
    recovered.unmount(); const again = env.mount();
    await act(async () => { await again.result.current.recoverUnsavedRoster(); });
    expect(again.result.current.rosterSession?.roster).toEqual(original);
    expect(again.result.current.rosterHistory?.past).toHaveLength(20);
    edit(again, 200);
    const latest = again.result.current.rosterSession!.roster;
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const updatedRecovery = await env.store.load(recoveryDraftId);
    expect(updatedRecovery.ok && updatedRecovery.value?.roster).toEqual(latest);
    expect(env.records.has("named")).toBe(false);
    if (failed) env.failWrites();
    await act(async () => { await again.result.current.saveRosterDraft(); });
    expect(again.result.current.unsavedChanges).toBe(failed);
    expect(env.records.has(recoveryDraftId)).toBe(failed);
    expect(env.records.has("named")).toBe(!failed);
    if (failed) {
      expect(again.result.current.activeDraft).toBeUndefined();
      expect(again.result.current.draftAction.message).toBe("The roster draft was not saved.");
    } else {
      expect(again.result.current.activeDraft?.id).toBe("named");
      again.unmount(); const opened = env.mount();
      await act(async () => { await opened.result.current.loadRosterDraft("named"); });
      expect(opened.result.current.rosterSession?.roster).toEqual(latest);
      expect(opened.result.current.unsavedChanges).toBe(false);
    }
  });

  it("does not let a save from an abandoned session clear newly recovered work", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    vi.useFakeTimers(); edit(hook, 1);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const release = env.holdWrites(); let saving!: Promise<void>;
    act(() => { saving = hook.result.current.saveRosterDraft(); });
    act(() => hook.result.current.clearRoster());
    await act(async () => { await hook.result.current.recoverUnsavedRoster(); });
    edit(hook, 77);
    const restored = hook.result.current.rosterSession!.roster;
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    await act(async () => { release(); await saving; });
    expect(hook.result.current.rosterSession?.roster).toEqual(restored);
    expect(hook.result.current.activeDraft).toBeUndefined();
    expect(hook.result.current.unsavedChanges).toBe(true);
    const recovery = await env.store.load(recoveryDraftId);
    expect(recovery.ok && recovery.value?.roster).toEqual(restored);
  });

  it("keeps recovery when an ordinary named draft is opened and supports explicit discard", async () => {
    const env = setup(); const hook = env.mount(); await create(hook);
    await act(async () => { await hook.result.current.saveRosterDraft(); });
    act(() => hook.result.current.clearRoster()); await create(hook);
    vi.useFakeTimers(); edit(hook, 500);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(env.records.has(recoveryDraftId)).toBe(true);
    await act(async () => { await hook.result.current.loadRosterDraft("named"); });
    expect(hook.result.current.unsavedChanges).toBe(false);
    expect(env.records.has(recoveryDraftId)).toBe(true);
    await act(async () => { await hook.result.current.discardRecoverableRoster(); });
    expect(env.records.has(recoveryDraftId)).toBe(false);
    expect(env.records.has("named")).toBe(true);
  });
});
