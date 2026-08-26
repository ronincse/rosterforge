import type { Result } from "@rosterforge/foundation";
import type { LocalRosterDraft } from "@rosterforge/persistence";

import {
  recoveryDraftId,
  type LocalRosterDraftStore,
} from "./browser-drafts.js";

/**
 * Serializes the single unsaved-roster recovery slot against its own writers.
 *
 * The slot is one key (`recoveryDraftId`) with two writers that fire from
 * independent React effects: a debounced write while a roster has never been
 * saved, and a clear once it becomes a real draft. Both were fire-and-forget,
 * and a slot write copies a whole catalogue closure, so a write already in
 * flight could finish *after* the clear and recreate the slot holding the
 * pre-save roster. Nothing is lost — the saved draft is untouched — but a later
 * session is then offered a stale recovery of a roster it already has.
 *
 * Ordering, not exclusion, is what fixes that: every operation queues onto one
 * chain, so the store applies them in the order they were requested rather than
 * the order they happen to finish.
 */
export interface RecoverySlot {
  /** Overwrite the slot. Resolves once this write reaches the store. */
  readonly write: (draft: LocalRosterDraft) => Promise<Result<void>>;
  /** Empty the slot, after any write requested before it has been applied. */
  readonly clear: () => Promise<Result<void>>;
}

/**
 * Creates a slot over `store`. One instance per store: two instances would keep
 * two chains and reintroduce exactly the interleaving this prevents.
 */
export function createRecoverySlot(store: LocalRosterDraftStore): RecoverySlot {
  // The tail of the queue. Each operation awaits it, then becomes the new tail,
  // so the chain length is bounded by work in flight rather than by session
  // length: a settled tail is discarded as soon as the next operation replaces
  // it.
  let tail: Promise<void> = Promise.resolve();

  // The clear is deliberately delayed behind a write already in flight, which
  // is the whole point but is also a liveness trade: an operation that never
  // settled would strand every operation behind it. Bounded in practice because
  // the store settles on all three terminal IndexedDB events — `oncomplete`,
  // `onerror` and `onabort` (`browser-drafts.ts:496-512`) — so the delay is one
  // transaction, not indefinite.
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    // Both handlers run `operation`: a failed predecessor must not cancel its
    // successor, which only needs the earlier store access to be *finished*.
    const run = tail.then(operation, operation);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    write: (draft) => enqueue(() => store.save(draft)),
    clear: () => enqueue(() => store.delete(recoveryDraftId)),
  };
}
