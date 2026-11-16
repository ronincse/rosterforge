# Saved-Draft Duplication — Evidence

Checkpoint evidence for whole-draft duplication, the last missing verb in
`docs/product-vision.md` step 5 ("save, reopen, duplicate, and revise"). Before
this change the saved-draft shelf offered Open and Delete only; unit-occurrence
duplication inside an open roster already shipped and is a different feature.

Baseline `dbcd308`. Implementation in `packages/persistence`
(`duplicateLocalRosterDraft`), `apps/web/src/use-app-controller.ts`
(`duplicateRosterDraft`, `copiedDraftName`) and
`apps/web/src/saved-draft-shelf.tsx` (the Duplicate control).

## The contract

A copy is an independent draft that:

- takes a **new draft ID** and **new roster ID**, and fresh timestamps;
- takes a **distinct name** — `(copy)`, then `(copy 2)`, without stacking
  suffixes on a copy of a copy;
- keeps the source's **import batch ID, source files and catalogue key**, so
  the catalogue closure is shared rather than stored again;
- keeps **force and selection occurrence IDs verbatim**;
- carries **no undo history**;
- copies **what is stored, not what is open**, and leaves the active draft,
  the open roster, `persistedRoster`, the recovery slot and
  `autosaveBlockedRoster` untouched.

### Why a new roster ID is required, not optional

`recoverySlot.clear(rosterId)` deletes the recovery slot only when the stored
roster's ID matches (`apps/web/src/recovery-slot.ts`). Two drafts sharing a
roster ID would let a save of one discard an unsaved recovery offer belonging
to the other. `controller-durability.test.tsx` already pins that ownership
check for two distinct rosters.

### Why occurrence IDs stay verbatim

Uniqueness is scoped to a single decoded draft — `decodeLocalRosterDraft`
builds its `forceIds`/`selectionIds` sets per call, and each history snapshot
gets its own scope. Nothing compares occurrence IDs across records, and the
object-store key is the draft ID. Re-minting would also break
`roster.associations`, whose endpoints are validated against that same
per-draft set, so fresh IDs with un-remapped edges are refused outright.
`duplicateRosterForce` mints new IDs only because it inserts a copy *beside its
source within one roster*, where collision is real.

## Measured cost

Three full passes over the catalogue closure per click: the store's `load`
structured-clones the batch record out of IndexedDB, `duplicateLocalRosterDraft`
decodes it, and `save` decodes it again — roughly 8.2 MB each for one faction.

Writing the stored placeholder record straight back would cost none of that,
and was rejected: a placeholder-bytes draft reaching `save` while its batch
record is absent writes an **empty** batch record, after which both the copy
and its source load zero-byte files with no diagnostic. Validation on every
write is the house rule, and this is a deliberate click rather than a hot path.

## Automated coverage

18 new tests. `pnpm test`: **1189 passed, 38 skipped, 1227 total; 119 files
passed, 10 skipped, 129 total**, against 1171/38 at the baseline.

`packages/persistence/src/local-roster-draft.test.ts` (5):
shared batch and files; fresh draft/roster identity with occurrence IDs kept;
history dropped; associations carried over intact and still decoding; a copy
validated rather than trusted.

`apps/web/src/draft-duplication.test.tsx` (11): a second draft sharing the one
stored batch; the open session and autosave left on the source; the last saved
state copied with the exclusion stated in the message; clean history with the
source's history untouched; shared bytes kept until the last of the two drafts
is deleted; repeated copies numbered without collision; a draft already gone
reported without writing; a refused write reported with the shelf unchanged; a
pre-split legacy source still yielding two openable drafts; a new draft ID with
the source record and its history byte-identical and exactly one record
written; and the naming rule itself.

`apps/web/src/saved-draft-shelf.test.tsx` (2): a per-card Duplicate control
reporting the exact draft ID, and only the copying card marked while every
shelf control is disabled.

## Browser evidence

Dev server on 5173 in an isolated browser profile; disposable data only, no
owner armies or storage touched. The profile had no catalogue, so a valid draft
record was seeded directly into IndexedDB (`rosterforge` /
`local-roster-drafts`) and every step after that ran through the real shelf,
controller and store.

| Step | Observed |
| --- | --- |
| Seeded draft listed | card `QA Patrol`, with `Duplicate QA Patrol` and `Delete QA Patrol` controls |
| Duplicate clicked | card `QA Patrol (copy)`; status `Copied this roster draft as QA Patrol (copy).`; no console errors |
| Stored records | copy under a fresh draft key with roster ID `roster-80f0…` against the source's `qa-roster-1`; same `batchId`; one `files:qa-batch` record; no history record |
| Reload | the copy persisted; shelf showed both drafts |
| Duplicate again | `QA Patrol (copy 2)`; 3 distinct draft keys, 3 distinct roster IDs, **1** batch record, 0 history records |
| Shelf rendering | 3 cards, "3 drafts", each copy marked `shared` |
| Delete one copy | remaining drafts `QA Patrol`, `QA Patrol (copy)`; `files:qa-batch` **kept** |
| Delete the rest | store empty — the shared batch was collected with the last referencing draft |

The delete steps exercise the refcounting hazard that had no test before this
checkpoint, in both directions.

## Not verified, and not claimed

- **No pinned-corpus run.** The 10 optional corpus integration files were
  skipped in this checkout; this is synthetic-fixture and seeded-record
  evidence, not reference-army evidence.
- **No import journey.** The browser profile had no catalogue, and the file
  input could not be driven from an isolated world, so duplication was not
  exercised against a draft built by importing real catalogue files in the
  browser. The automated controller tests do cover that path end to end with
  real XML fixtures.
- **No reopen of a copy.** The seeded record had no source files, so Open was
  never exercised on a copy in the browser.
- **No quota, multi-tab or phone-width evidence.** A copy adds one small
  record, but quota refusal, the two-tab interleaving described below, and
  390 px layout of the third card were not measured.

## Known boundaries this checkpoint does not move

- **Duplicating a pre-split legacy draft stores the closure twice.** Such a
  record carries its own bytes and has no batch record, so the copy's save
  creates one. Both drafts stay openable; no migration is attempted.
- **Batch collection trusts decoding.** A sibling draft that fails to decode
  does not count as a referencer, so deleting the other copy can collect bytes
  the survivor still needs. Pre-existing; duplication raises the number of
  drafts per batch and therefore the exposure.
- **Two tabs on one database are not serialised.** Each backend call is its own
  IndexedDB transaction, so a delete running between a duplicate's batch probe
  and its record write could collect the batch the new copy depends on. In one
  tab the shelf disables its controls and autosave waits for idle.
- **Roster names are not unique and cannot be edited after creation.**
  `renameRoster` exists in `roster-model` but has no call site in `apps/web`,
  so the generated copy name is the user's only distinguishing label and there
  is no in-app remedy if two drafts end up sharing one.
