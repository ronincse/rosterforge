# RosterForge — Agent Handoff And Work Order

The shared status and work-order document for every model working on this
repository. `AGENTS.md` governs *how* to work. This file records *what is done,
what is left, and what is blocked*.

## Read This First

A new session reads, in this order:

1. **Current Status** — where the project stands right now.
2. **Remaining Work To Feature Complete** — the roadmap. This is the
   authoritative to-do list.
3. The **newest** `## Completed Assignment` entry at the end of this file, for
   the immediate context you are picking up.

Everything between is an **append-only history**. Read an older entry when you
need the reasoning behind a decision — the corpus measurements and the rejected
alternatives are in there, and re-deriving them is expensive. Do not read the
history as a to-do list: each entry ends with a "Next recommended boundary" that
was true when written and is superseded by the roadmap below.

Some entries are explicitly **superseded** by later evidence and say so at the
top. Honour that marking; the conclusions in a superseded entry are wrong.

Then read `git log`, `git status`, `docs/architecture.md`, and
`docs/compatibility.md`.

## Current Status — 2026-08-20 (arithmetic)

RosterForge reads BattleScribe 2.03 community data and builds matched-play
rosters. It is a pnpm/TypeScript monorepo; `docs/architecture.md` owns package
layering and evaluator boundaries, `docs/compatibility.md` owns the exhaustive
record of what is and is not supported, and `docs/diagnostics.md` owns
diagnostic codes.

- **Branch.** Work happens on `main`, which is **ahead of `origin/main` and
  deliberately unpushed** — `AGENTS.md` forbids pushing without the owner
  asking for that step. `git status -sb` gives the current count.
- **Gates.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` all pass. `pnpm test` is **419 passed, 7 skipped (426)**.
  The production build retains only Vite's existing large-chunk warning.
- **Pinned corpus.** `E:\GitHub\wh40k-11e` at commit
  `54c189f4fd01878351fab05586d3b38d9c7f6ddc`, 46 JSON files, gitignored and
  never committed. With `ROSTERFORGE_BSDATA_JSON_DIR` set the integration suite
  is **7 passed**; without it those 7 are the skipped tests.
- **Pushed.** `main` was pushed at `8f1913d`; commits after that are local again.
- **Active area.** Display-fidelity modifiers — Task 8 of the original work
  order, under "Historical Record" below. The characteristic
  and category surfaces both execute a meaningful subset; what remains is in the
  roadmap.

## Remaining Work To Feature Complete

`docs/compatibility.md` is the exhaustive, per-behavior record. **This table is
the map, not the territory** — it groups that record into product milestones so
a new session can see the shape of what is left. Keep both current.

Status values: **Done**, **Next** (take this one), **Open** (ready, unblocked),
**Blocked** (needs an answer recorded below), **Low priority** (in scope, but do
not take it ahead of anything else), and **Deferred** (out of scope until the
owner reprioritises).

### A. Display-fidelity modifiers — *active area*

| Item | Status | Note |
|---|---|---|
| Profile modifier projection | Done | |
| Characteristic `set` | Done | lexical replacement; needs no numeric grammar |
| Characteristic `append` | Done | non-empty `join` only |
| Profile visibility (`hidden`) | Done | all 154 corpus instances fit |
| `affects` grammar parsing | Done | including the selections terminus |
| `affects` traversal execution | Done | own/children/descendants; group rule verified in New Recruit |
| `affects` anchoring at `scope` | Done | confirmed 2026-08-20; see the newest entry |
| Category `add`/`remove`/`set-primary`/`unset-primary` | Done | |
| Effective category membership feeding conditions | Done | single-pass rule; 7 cyclic cases stay unknown |
| Category `affects` routing | Done | filters resolved by modifier-immunity |
| `position` for arithmetic | Done | 1-based index, negative from the end, `0` = all; absent position refused when the value has more than one number |
| Lexical `increment`/`decrement` | Done | plain signed arithmetic, no game-aware inversion — sign convention settled from the corpus, see the 2026-08-20 arithmetic entry |
| **`replace` using `arg` as the search term** | **Next** | strongly evidenced by the `+0` idiom. With it the whole bonus-slot mechanism resolves, including the Attacks values that are still withheld on real weapons. |
| `append` with an empty `join` | Open | unblocks once `replace` lands — it is the bonus-slot idiom's first step |
| `floor`/`ceil` | Open | need a bound rule; a different shape from `increment`/`decrement` |
| `position` on `append` | Open | 4 corpus instances, all Keywords. New Recruit applied one visibly with `position` present and no positional effect, so it looks inert there — the editor does not offer `position` for `append`. |
| `annotation` modifiers | Open | 15 corpus instances. **Rendering observed twice in New Recruit:** the value is appended to the displayed name in parentheses — `Patriarch (Gene Affliction)`, `Manreaper - sweep (Furnace of Plagues)`. It annotates the *name*, and it reaches weapon profiles through the same `affects` routing. |
| `affects` force traversal | Open | 24 selectors; needs a force-collection anchor rule |
| Category filter naming a non-immune category | Blocked | would need a fixpoint instead of the single pass; deliberate |
| `name` modifiers | Open | 7,673 instances but 86% Crusade — sequence last despite the count |

### B. Legality and validation

| Item | Status |
|---|---|
| Two-dimensional validity/completeness contract | Done |
| Structural, selection-condition, and force-constraint reports | Done |
| Aggregate general-constraint enforcement | Deferred |
| Cost limits, grouped-modifier costs, broader cost behavior | Deferred |
| Broader condition semantics and unsupported repeat shapes | Deferred |

### C. Roster interchange

| Item | Status |
|---|---|
| Browser print/save-PDF presentation export | Done |
| `.ros`/`.rosz` ingestion, projection, import | Low priority |
| `.ros`/`.rosz` interchange export | Low priority |
| Exact XML/JSON reserialization | Low priority |

Owner decision, 2026-08-20: **`.ros`/`.rosz` is low priority.** It is a large
feature and it is not what the ecosystem is moving toward — BSData now publishes
catalogue data as JSON, and the tools this product is measured against are
web-based rather than trading BattleScribe roster files.

Note for whoever picks this up: `.ros`/`.rosz` are *roster* files (a saved army
list), which is a separate concern from the `.cat`/`.gst`/`.catz`/`.gstz`
catalogue formats that JSON supersedes — catalogue ingestion already handles both
XML and JSON and is unaffected by this decision. The cost here is that a user
cannot bring an existing army list in from another tool. Revisit if that is
actually asked for.

### D. Catalogue sources and cache

| Item | Status |
|---|---|
| Pinned GitHub browsing, closure acquisition, byte caching, provenance | Done |
| Cache eviction and quota controls, retries, atomic publication | Deferred |
| Repository update discovery, branch tracking, GitHub auth | Deferred |
| Gallery discovery and cache-management UI | Deferred |

### E. Editing and durability

| Item | Status |
|---|---|
| Headless roster commands: add, remove, rename, amount, duplicate, relocate, reorder | Done |
| Browser drafts in IndexedDB with exact definition-key restoration | Done |
| In-memory undo/redo over immutable snapshots | Done |
| Durable undo history and automatic saving | Deferred |
| Sibling-reordering UI, nested-force editing, force renaming, editable cost overrides | Deferred |

### Open questions needing the owner

**None.** Every rule the evaluator executes now rests on either a corpus
measurement or a direct New Recruit observation, not on inference.

The last inferred one — the arithmetic sign convention — was confirmed by
experiment on 2026-08-20. See the arithmetic entry for the observation.

Open and deliberately not chased: what an embedded ID means when it names a
selection entry rather than a category. One corpus instance.

## How To Update This Document

You are writing for a stranger — possibly a different model, with none of your
context. Before you stop, and at the end of every checkpoint:

1. **Append a `## Completed Assignment` entry** at the end of the file with the
   baseline and resulting commit hashes, what changed and *why that decision
   rather than the alternatives*, exact corpus measurements, exact test and gate
   numbers, and what stayed unsupported.
2. **Update "Current Status"** above — the date, gate numbers, branch state. A
   stale status is worse than none, because it is believed.
3. **Update the roadmap table.** Move what you finished to Done, promote the new
   **Next**, and add anything you discovered. If you found work nobody knew
   about, it belongs in the table, not only in your entry's prose.
4. **Update `docs/compatibility.md`** whenever a behavior boundary moved, and
   `docs/architecture.md` and `docs/diagnostics.md` when structure or codes
   changed. The roadmap maps them; it does not replace them.
5. **If you disproved an earlier conclusion**, mark the superseded entry at its
   top and say so in your own. Do not silently leave two contradictory answers
   in the file — the next reader cannot tell which won.

Record what you *did not* do and why, not only what you did. A checkpoint
descoped for a good reason is useful information; one descoped silently reads as
an oversight.

---

## Historical Record

Everything below is append-only. The section immediately following was the
original review that set the work order; the `## Completed Assignment` entries
after it run oldest to newest.

This document began as a response to an earlier handoff summary, written after an
independent audit of the workspace and of the pinned corpus at
`E:\GitHub\wh40k-11e` (commit `54c189f4fd01878351fab05586d3b38d9c7f6ddc`).

## Original Status Snapshot — 2026-08-14

> Superseded by **Current Status** above. Kept because the checkpoint
> entries below refer to the task numbering it introduces. The counts here are
> historical and no longer accurate.

Tasks 1 through 6 below, the first bounded Task 7 presentation-export
checkpoint, and eight Task 8 checkpoints — profile modifier projection,
headless characteristic-display evaluation, its workspace presentation, profile
visibility, `affects` selector parsing, category-entry information projection,
effective category membership, and the category-condition honesty fix — are
complete, as are two checkpoints after them: routed characteristic attribution
and characteristic `append` execution. The current
normal suite passes 409 tests with six skipped, and the pinned real-data suite
passes all six tests. Work now happens on `main`, which was fast-forwarded to
the branch tip on 2026-08-19 and is CI-green. Effective keywords are visible in the roster workspace,
and the category surface is complete apart from `affects`. The shared
work-order file is `agent-handoff.md`; `codex-handoff.md` was renamed in
`f839c21` so a non-Codex model does not skip it.

The staged category plan is now complete through stage three: effective category
membership feeds condition identity. See "Completed Assignment — The Category
Condition Flip" at the end.
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
`git diff --check` pass; the production build retains only Vite's existing
large-chunk warning.

## Completed Assignment — Characteristic Display, 2026-08-14

Baseline `40b60ca`; resulting implementation commit `04444cb`
(`feat: headless characteristic display evaluation`). The branch was not
pushed and no pull request was opened. The worktree was clean at the baseline
and no existing work was reset, cleaned, or rewritten. The optional corpus was
confirmed at `E:\GitHub\wh40k-11e`, commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, clean, 46 JSON files.

### Results

`packages/evaluation/src/characteristics.ts` adds
`evaluateRosterProfileCharacteristics(roster, context, owner, profile)`. It
accepts a direct profile projection or the arrays a materialized profile info
link already exposes by reference, and clones nothing. Boundaries are documented
in `docs/architecture.md` (`Characteristic Display Boundary`),
`docs/compatibility.md`, and `docs/diagnostics.md`.

**Supported operation: `set` only.** `set` replaces the projected lexical value
and never reads the value it replaces, so it needs no numeric grammar for
observed forms such as `3+`, `36"`, and `D6`. Every other observed operation
would require an unestablished rule — lexical arithmetic for
`increment`/`decrement`/`floor`/`ceil`, `join` separator and `position`
placement for `append`, and an `arg` search term for `replace` — so all of them
stay preserved, source-located, and unapplied. The numeric modifier kernel does
**not** fit and is deliberately not reused; the applicability, modifier-group
applicability, and group-execution collectors do fit and are reused unchanged.

Targeting requires `field` to equal an exact characteristic `typeId` on the same
profile. A repeated characteristic type is an ambiguous target, not a
broadcast. Execution keeps the documented order: profile-direct modifiers, then
top-level groups in source order, direct children before nested groups
depth-first. A false condition is an ordinary `notApplicable` step and does not
make a report incomplete. The effective value stays known when no unapplied step
follows the last applied step, so a report can expose a known value while
remaining `incomplete`.

Profile-owned modifiers that do not route to exactly one characteristic on their
own profile — `hidden`, `name`, the observed `annotation` extension, and
characteristic types belonging to another profile — are retained in
`unroutedModifiers`, diagnosed, and make the report incomplete. (`hidden` was
moved out of `unroutedModifiers` by the profile-visibility checkpoint below;
the rest still apply.) Scoped
modifiers, repeats, missing operations or values, unresolved applicability, and
any generic attribute other than the inert `comment` keep their step unapplied.

### Pinned corpus inventory (484 profile-owned characteristic modifiers)

| Dimension | Measurement |
|---|---|
| Ownership | 369 direct, 115 inside the profile's own modifier groups |
| Operations | 213 `append`, 205 `set`, 54 `increment`, 6 `decrement`, 4 `floor`, 2 `replace` |
| Scope | 16 `scope="model"`, 468 scope-free |
| Conditions | 384 with direct conditions, 53 with condition groups, **0 with repeats** |
| Values | 3 omit `value` |
| Extensions | `join` 244, `affects` 16, `arg` 2, `position` 0; 238 carry none |
| Targeting | 478 on their own profile, 6 absent, **0 ambiguous** |
| Executable subset | **173** (`set`, scope-free, extension-free, valued, exactly one target): 117 direct, 56 grouped |
| Unconditional | only 2, both Adeptus Custodes `W 3 → 4` |

All 484 have a condition surface whose shape the existing evaluator already
supports, so applicability is not the limiting factor — operation semantics are.
Separately, the 694 profile-owned modifiers in total include 154 `hidden`, 51
`annotation`, and 5 `name`. The 1,257 characteristic modifiers owned outside
profiles remain out of scope; 1,249 carry `affects`, a `scope`, or both, and the
other 8 sit on info links rather than on the profile they display.

### Checks run

- `pnpm lint` — clean.
- `pnpm typecheck` — clean.
- `pnpm test` — **363 passed, 4 skipped (367 total)**, 43 files passed and 1
  skipped. Previous baseline was 351 passed with 3 skipped; the 12 new tests are
  `packages/evaluation/src/characteristics.test.ts`, and the extra skip is the
  fourth pinned-corpus test.
- `pnpm build` — passed, retaining only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite with `ROSTERFORGE_BSDATA_JSON_DIR` set —
  **4 passed** in 59.24 s.

New pinned assertions: the all-repository test replaces the single 484 count
with the complete summary table above, and a new six-file Adeptus Custodes
closure test (game system, Adeptus Custodes, Imperial Knights Library, Agents of
the Imperium, Titans library, Unaligned Forces) adds a `Custodian Guard` unit,
its `4-5 Custodian Guard` group, and the `Sentinel Blade & Praesidium Shield`
model, then proves `Custodian Guard (Shield)` reports `M 6"`, `T 6`, `Sv 2+`,
**`W 4` from a base `3`**, `LD 6+`, `OC 2`, `InSv 4+` with `completeness:
"complete"` and no diagnostics.

The synthetic fixture `characteristic-display.cat` is project-owned and covers
applied/not-applicable/unapplied steps, group ordering with nested depth-first
children, unsupported operations, `affects`, `scope`, missing values, repeats,
unrouted and ambiguous targets, inert `comment`, unresolved applicability, and
both directions of the known-value rule. No third-party data was committed.

### Remaining questions for this surface

1. **`affects` retargeting is still the blocker for the other 1,257
   characteristic modifiers.** Observed values are owner-relative paths such as
   `self.entries.recursive.profiles.Melee Weapons`, `profiles.Unit`, and forms
   embedding an exact entry ID. Resolving them needs a decision about profile
   *families* selected by `typeName` versus `typeId`, and about recursive entry
   traversal. Nothing here should be guessed from the path grammar alone.
2. **`append` needs both `join` and `position`.** Observed `join` values include
   `",\u00a0"`, `""`, `"\n\n"`, `", "`, `","`, and `"\n"`; `position` is `-1`
   153 times, `""` five times, and `1` three times. Whether `position` counts
   from the end, indexes a separator-delimited token list, or something else is
   not established by the source shape.
3. **`replace` needs `arg` semantics.** Observed `arg` values are mostly `"+0"`
   (270) plus keyword strings; whether `arg` is the search term, a format
   argument, or both is unresolved.
4. **Lexical arithmetic for `increment`/`decrement`/`floor`/`ceil`.** Base values
   include `3+`, `36"`, `-2`, and `D6`. A pinned `decrement` of 1 against a base
   `3+` could mean `2+` or `4+`; the sign convention for inverted characteristics
   is a game rule, not a data shape.
5. **Repeats on characteristic modifiers are unsupported by choice, not by
   difficulty.** The corpus contains none, so supporting them would be
   unproven speculation. `evaluateRosterModifierRepeats` would fit if a future
   corpus needs it: a zero count is a no-op and any positive count applies `set`
   once. This is a cheap follow-up whenever real data justifies it.
6. **Profile-owned `hidden` (154) and `annotation` (51) are undocumented display
   behavior.** `annotation` is not in the 2.03 schema and appears nowhere else in
   the compatibility inventory. Profile visibility is a separate checkpoint;
   until it exists, every affected profile report stays incomplete.
7. **One `set` in `Necrons.json` gives `Keywords` a native JSON Boolean.** It
   projects to the lexical string `true` and is replaced literally. That is
   faithful to the source but is almost certainly an upstream authoring error.

### Next recommended boundary

Completed in the following checkpoint.

## Completed Assignment — Characteristic Presentation, 2026-08-14

Baseline `02254d0`; resulting commit `a42b791`
(`feat: show evaluated characteristics in the roster workspace`). Not pushed, no
pull request. This was the presentation-only follow-up recommended above; it
adds no evaluation semantics.

### Results

`inspectLocalRosterSelectionCharacteristics` in `apps/web/src/roster-session.ts`
evaluates every profile shown for one exact occurrence — direct profiles,
resolved profile info links, and the profiles of recursive info groups — in that
render order, and keys each report by the exact profile object. An occurrence
absent from the roster returns
`APP_ROSTER_CHARACTERISTIC_SELECTION_UNAVAILABLE`.

The workspace renders the effective value when known. A changed characteristic
also shows its source value labelled `Base <value>`, so a displayed number is
never confused with the printed one. An unresolved sequence keeps the source
value visible under an explicit `Effective value unresolved` label rather than
substituting a provisional result — the same rule the cost summary already
follows. An incomplete profile carries a plain-language note plus
`data-completeness` on the profile and on the affected characteristic. A profile
with no evaluated report falls back to the projected text unchanged.

### Checks run

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **366 passed, 4 skipped (370 total)**, 43 files passed and 1
  skipped. The three new tests cover render order, by-profile identity, and the
  unknown-occurrence failure.
- `pnpm build` — passed, only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite — **4 passed** in 46.86 s, unchanged by this
  checkpoint.

The `App.ui.test.tsx` fixture now gives the infantry profile a supported `set`
and the `Fieldcraft` info-group profile an unsupported `increment`. That proves
base-versus-effective display, the unresolved label, and the incomplete note
through the info-group path in one render.

### Next recommended boundary

Completed in the following checkpoint.

## Completed Assignment — Profile Visibility, 2026-08-14

Baseline `c051378`; resulting commit `449c17f` (`feat: evaluate profile
visibility`). Not pushed, no pull request.

### Results

`evaluateRosterProfileVisibility` uses the profile's projected `hidden` flag as
the base and mirrors the selection-visibility contract exactly: `type="set"
field="hidden"`, a Boolean value, no scope, no repeat, and no generic behavior
attribute. Direct owner modifiers run first, then relevant top-level groups in
source order with direct children before nested groups depth-first, reusing the
existing execution collector.

A `hidden` modifier no longer makes a characteristic report incomplete. That
field is a known BattleScribe field this package already executes for
selections, so a modifier naming it definitively cannot change a characteristic
value. Those modifiers moved from `unroutedModifiers` into a separate
`visibilityModifiers` collection: still observable, but visibility owns their
completeness. This follows the existing cost rule that modifiers targeting
non-cost fields do not affect numeric cost completeness. `name` and
`annotation` are unchanged — still unrouted, still incomplete.

The workspace labels a hidden or visibility-unresolved profile and keeps it
rendered. Removing hidden profiles from the panel would be a separate
presentation decision; labelling preserves everything the source declares.

### Pinned corpus inventory (154 profile-owned `hidden` modifiers)

| Dimension | Measurement |
|---|---|
| Ownership | 154 direct, **0 grouped** |
| Operations | 154 `set`, 0 other |
| Values | 154 native Boolean `true`, **0 `false`** |
| Scope / repeats / extensions | 0 / 0 / 0 |
| Conditions | 125 direct conditions, 29 condition groups, **0 unconditional** |
| Supported shape | **154 of 154** |
| Static `hidden="true"` profiles | 1 of 13,451 |

All 154 belong to distinct profiles, and none of those profiles also owns a
`name` or `annotation` modifier — so this checkpoint unblocks every one of
them.

### A projection gap found while pinning these counts

The typed projection sees 13,450 profiles and 153 `hidden` modifiers, not
13,451 and 154. The missing one is real data, not a miscount: the `Recon
Augury` category entry (`40ce-cefb-031e-75a4`) in
`Imperium - Adeptus Mechanicus.json` owns an `Enhanced Augurs` Abilities
profile whose single conditional `set hidden` modifier is the 154th.
BattleScribe 2.03's category-entry surface has no `profiles` collection, so
RosterForge preserves it on the generic ordered source node without projecting
it, and it takes part in no evaluation. Whether `CategoryEntryProjection`
should gain a typed `profiles` collection is a separate projection decision,
deliberately not bundled here. It is documented in `docs/compatibility.md` and
pinned by the corpus guard's comment.

### Checks run

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **373 passed, 4 skipped (377 total)**. Seven new tests: six
  profile-visibility cases in `packages/evaluation` and one adapter case.
- `pnpm build` — passed, only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite — **4 passed** in 43.19 s, including the new
  `profileOwnedVisibilityModifierSummary` guard.

### Next recommended boundary

Partly addressed by the following checkpoint, which closed the grammar question
without committing to execution semantics.

## Completed Assignment — Affects Selector Parsing, 2026-08-14

Baseline `7d3d1b0`; resulting commit `59757d9` (`feat: parse the affects
selector grammar`). Not pushed, no pull request.

This checkpoint deliberately took the inspection-and-reporting exit the original
Task 8 assignment allows: the grammar is now closed and pinned, but nothing
executes, because three semantic decisions remain genuinely unsettled by the
source shape.

### Results

`packages/evaluation/src/affects.ts` adds
`parseBattleScribeAffectsSelector(value)`. It is pure syntax — no roster, no
catalogue, no target selection, no execution — and returns the traversal, an
optional filter ID, an optional profile-type name, and explicit issues. No
evaluator consumes it, so `affects` modifiers remain preserved and unapplied
exactly as before.

The supported shape is
`[self.][entries.][recursive.][<filterId>.]profiles.<profileTypeName>`. The
corpus establishes the traversal contrast itself: both
`self.entries.profiles.X` and `self.entries.recursive.profiles.X` occur, so
`entries` alone is the direct child collection and `recursive` extends it to
descendants. That inference comes from the data's own contrast, not from
outside knowledge.

### Pinned corpus grammar

| Dimension | Measurement |
|---|---|
| Occurrences / distinct values | 1,859 / **79** |
| Segment vocabulary | closed: `self`, `entries`, `forces`, `recursive`, `profiles`, a profile-type name, or one object ID |
| Parses | **1,730 supported**, 129 unsupported |
| Unsupported | 24 force traversals, 106 entry-terminated paths (one value has both) |
| Traversal | 344 owner-only, 168 direct-child, 1,347 recursive |
| Filter IDs | 428 total — 427 category entries, 1 selection entry, **0 unresolved** |
| Profile-type names | only **3 distinct**, all declared; 30 declared types have 30 distinct names |
| Characteristic targets | 1,265 carry `affects`; **1,246** parse into the supported shape |

### The three decisions execution still needs

None is answerable from the source shape, so none was guessed.

1. **Traversal semantics against roster occurrences.** `entries` and
   `recursive` are clear in the abstract, but a roster tree nests occurrences
   through entry links and transparent selection-entry groups. Whether
   `entries` means direct child *occurrences*, direct child *definitions*, or
   something that skips group containers changes which profiles are hit.
2. **Category filtering.** 427 selectors embed a category-entry ID. The
   condition evaluator already treats category-link target IDs as effective
   selection identities, so reusing that rule is the obvious candidate — but
   whether `affects` filters the traversal set or narrows the profile set is
   not established.
3. **Profile-type matching by name.** BattleScribe offers no ID form here; the
   only selector is `profiles.<profileTypeName>`. The project otherwise refuses
   to infer targets from display names, so matching by name is a real policy
   exception even though it is what the format requires. It is safe in this
   corpus (3 names, all declared, no collisions), but that is a property of the
   data, not a guarantee.

A reasonable execution checkpoint would resolve the name against declared
profile types via `typeId` rather than the denormalized `typeName` string,
and would leave any unresolved or ambiguous type incomplete.

### Checks run

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **382 passed, 4 skipped (386 total)**. Nine new parser tests.
- `pnpm build` — passed, only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite — **4 passed** in 45.81 s. The new
  `affectsSelectorSummary` guard runs the real parser over every projected
  modifier and reproduced all of the numbers above on its first run.

### Next recommended boundary

`affects` execution remains blocked on the three decisions above. Category-entry
projection was completed in the checkpoint below; category modifiers are blocked
on a separate decision recorded at the end of this document.

## Completed Assignment — Category-Entry Information, 2026-08-14

Baseline `0056a7a`; resulting commit `42cda92` (`feat: project category-entry
profiles, rules, and info links`). Not pushed, no pull request.

Real BSData puts information collections on category entries even though
BattleScribe 2.03 does not declare them there. Three entries in the pinned
corpus do: `Recon Augury` owns a profile, `Faction: Legions of Excess` owns a
rule, and `Shadow Legion` owns a `rule` info link. All three collections are now
projected, the rules and profiles are indexed as ordinary graph objects, and
their info-link targets and profile type references resolve like any other
container's.

Typed-projection counts now match the source at **13,451 profiles and 154
profile-owned `hidden` modifiers**, closing the 13,450/153 gap the visibility
checkpoint recorded. The corpus guard was updated accordingly.

This is projection only. It does not make a category entry selectable or give it
evaluation behavior, and nothing materializes a category entry into a roster
occurrence, so these profiles and rules are observable through the graph rather
than rendered in occurrence details.

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
clean; `pnpm test` **382 passed, 4 skipped**; pinned real-data suite **4
passed**.

## Completed Assignment — Staged Categories, 2026-08-14

Baseline `bbfae74`. Resulting commits: `ee089b4` (`feat: evaluate effective
category membership`) and `bb19f6a` (`fix: refuse a confident answer for
category-controlled conditions`). Not pushed, no pull request.

The user chose the staged option: execute membership as a display-only report,
fix the honesty gap, measure the condition flip, and bring the flip back as its
own go/no-go. Stages one and two are done and stage three was measured.

### Stage one — effective membership (`ee089b4`)

`evaluateRosterSelectionCategories` reports one occurrence's effective
categories from its materialized category links. Only scope-free,
extension-free `add` and `remove` execute, in the documented order. An `add` of
an existing member records `changed: false`, so inert authoring is
distinguishable from unsupported behavior.

`set-primary` and `unset-primary` do not execute: 322 of the 325
executable-shaped `set-primary` modifiers name a category the owner does not
link and have no sibling `add`, so the operation would have to create membership
to do anything, and 234 owners would gain a second primary unless it also
clears the others. Because a primary operation provably cannot change
membership, it withholds only the primary determination — `categories` stays
known while `primaryCategories` does not.

Executable subset: **283** of 892 (274 `add`, nine `remove`).

### Stage two — the honesty fix (`bb19f6a`)

Category link targets already feed condition identity, so a category-testing
condition could return a confident answer that a modifier would invalidate.
That was the one place in the package where an unsupported modifier produced a
possibly wrong result rather than an unresolved one.

A candidate whose choice carries a `field="category"` modifier naming the
queried category — or one with no value — now reports unresolved. The downgrade
is narrow: a modifier naming a different category is ignored, and an
unaffected candidate still yields an exact count. **This moved none of the
pinned real-data assertions.**

Remaining gap, now documented rather than silent: a scoped category modifier
owned by a *different* occurrence can still reach this one and is not
detectable from the candidate's own choice.

## Measured: the category-condition flip is not worth doing yet

Stage three would feed effective membership into condition identity. Measuring
it first was the right call, because the payoff is far smaller than the risk.

| Bucket | Conditions |
|---|---|
| Unaffected — no modifier touches that category | **3,340** |
| Would stay unresolved — some modifier on that category is unexecutable | **1,580** |
| **Would become knowable** | **127** |
| Total category-referencing conditions | 5,047 |

Of the 100 modifier-controlled categories, only 30 are controlled exclusively by
executable `add`/`remove`. The other 70 are blocked by a scope, a primary
operation, or a generic behavior attribute — and every high-traffic category is
in the blocked set: `Character` (367 condition references), `Infantry` (217),
`Vehicle` (108), `Psyker` (107).

So the flip would rescue 2.5% of the surface while changing the semantics of an
already-shipped evaluation path and introducing a seven-case cycle. **The
bottleneck is not the categories-to-conditions wiring; it is scope resolution
and `set-primary` semantics.** Both are the same retargeting problem `affects`
has.

These numbers are pinned by `categoryConditionImpactSummary` in the real-data
suite, so they stay honest as the data or the executable subset changes. The
guard walks the generic source tree for conditions rather than a typed subset,
because a typed walk missed 164 conditions owned by force entries and cost
types.

### Recommended next boundary

Scope resolution was taken next and is complete; see below.

## Completed Assignment — Modifier Scope Resolution, 2026-08-14

Baseline `ccc8e92`; resulting commit `94a9e47` (`feat: resolve parent and
root-entry modifier scope for categories`). Not pushed, no pull request.

### A correction to the previous recommendation

The prior entry claimed scope resolution would unblock "281 scoped category
modifiers, 1,265 `affects`-bearing characteristic modifiers, and the 70 blocked
categories at once." **The characteristic half of that was wrong.** Of the 1,812
scoped modifiers in the corpus, **1,617 also carry `affects`**, so scope alone
unlocks none of them. Measured honestly, scope-only executable-shaped modifiers
are 150 — all of them `category`.

The category half was right, and larger than expected.

### What was implemented

`parent` and `root-entry` are the two observed scopes whose anchor is a single,
structurally determined occurrence, so both invert cleanly. The modifiers
reaching an occurrence are those declared by its direct children (`parent`) and,
when it is itself top-level, by all its descendants (`root-entry`). An
occurrence can anchor through both at once — a direct child is also a descendant
of its root.

Each inbound modifier's applicability is evaluated against the occurrence that
*declares* it, not the one it reaches. Every step records `origin` and
`declaredBy`. Inbound steps run after the occurrence's own in roster document
order; ordering is observable only when one category is both added and removed
along a single path, which the corpus never does, but the rule is fixed anyway.
A contributor that does not resolve to exactly one materialized choice makes
membership unknown.

`model`, `unit`, `model-or-unit`, and `upgrade` anchor to a nearest typed
ancestor, and `force`/`roster` to collections rather than one occurrence.
Neither is inverted, and neither appears on an executable-shaped category
modifier in the corpus.

### Measured payoff

| Measure | Before | After |
|---|---|---|
| Executable category modifiers | 283 | **428** |
| Blocked categories | 70 | **20** |
| Category conditions that would become knowable | 127 | **1,048** |
| Category conditions staying unresolved | 1,580 | **659** |

All four are pinned by the real-data guard.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **392 passed, 4 skipped (396 total)**.
- Pinned real-data suite — **4 passed**.

### Next recommended boundary

1. **Revisit the category-condition flip.** Its payoff went from 2.5% to 21% of
   the category-condition surface. That was the trigger condition agreed for
   reconsidering it, and it now needs a fresh go/no-go. The evaluation-order
   question and the seven-case cycle are unchanged.
2. **`affects` execution**, still blocked on its three semantic decisions, and
   now additionally on how `affects` composes with `scope` — 1,617 modifiers
   carry both. A plausible reading is that `scope` picks the anchor occurrence
   and the `affects` path navigates from there, making `self` in the path mean
   the scoped occurrence rather than the declaring one. That is an inference,
   not something the data settles.
3. `set-primary` semantics, if a source outside the data can settle whether it
   implies membership and whether it clears other primaries. It is one of the
   two things still blocking the remaining 20 categories.

`name` modifiers remain last despite their raw count, since 86% are Crusade rank
labels.

## Original blocking question — dynamic category membership

Retained for context; superseded by the measurement above.

The `category` modifier surface was inventoried before implementation because
executing it changes the meaning of an already-shipped evaluation surface.

### What the corpus contains

| Dimension | Measurement |
|---|---|
| `field="category"` modifiers | **892** |
| Operations | 532 `add`, 328 `set-primary`, 27 `remove`, 5 `unset-primary` |
| Values | 892 of 892 resolve to a category entry |
| Owners | 747 selection entries, 145 entry links |
| Ownership | 566 direct, 326 grouped |
| Scope | 611 scope-free; 281 scoped (`root-entry` 99, `parent` 78, `model` 68, `upgrade` 31, `force` 4, `roster` 1) |
| Extensions | `affects` 89, `arg` 83, `join` 79, `comment` 2 |
| Conditions | 463 with conditions, 4 with condition groups, 0 repeats |
| Scope-free, extension-free, resolving | **611** — 274 `add`, 325 `set-primary`, 9 `remove`, 3 `unset-primary`; 429 direct, 182 grouped; only **54 unconditional** |

The operations themselves are not the problem. `add`/`remove`/`set-primary`/
`unset-primary` over a membership set derived from the materialized
`categoryLinks` is a well-defined model, and every value resolves.

### Why it is blocked

**Categories already feed condition identity.** `selectionChoiceIdentityIds`
includes every `categoryLink.targetId`, so category membership is already an
input to the condition evaluator. The corpus has **5,047 conditions that
reference a category entry** — 1,991 `instanceOf`, 2,146 `notInstanceOf`, and
910 numeric counts. Those conditions currently evaluate against *static*
category links, and costs, constraints, visibility, and structural status all
depend on them.

Making category modifiers executable therefore forks:

1. **Effective categories feed back into conditions.** Faithful, but it changes
   the result of 5,047 existing conditions and every report built on them. It
   also introduces a real cycle: **7 of the 892 category modifiers have
   conditions that themselves query a category**, so evaluation order has to be
   defined rather than discovered at runtime.
2. **Conditions keep using static links; effective categories stay a separate
   display-only concept.** No existing behavior changes and there is no cycle,
   but the two notions of "category" then disagree, and the second one is not
   used by anything that matters.

Neither is derivable from the data. Option 1 is the larger and riskier change
and would want its own baseline measurement of which pinned assertions move;
option 2 is cheap but arguably not worth doing.

A third possibility is to defer the surface entirely and spend the next
checkpoint on `affects` execution instead, once its own three decisions are
made.

`name` modifiers remain last despite their raw count, since 86% are Crusade rank
labels.

Grouped `hidden` modifiers now participate in read-only visibility. Grouped
cost modifiers now participate in `selectionConditions` cost reports through
the same recursive execution collector. Base and unconditional cost scopes keep
groups inert. Supported operations and exact child repeats execute in the
documented order; unknown group shapes, group-level repeats, unsupported
operations, and unresolved applicability remain observable and incomplete.

The pinned grouped-cost inventory in Task 5 needed correction. Commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc` contains 305 cost-targeting
modifiers in 130 groups: 23 `set`, 131 `increment`, 21 `decrement`, and 130
`divide`. There is no grouped cost `multiply` in that checkout. Of those groups,
123 use `type="and"`, seven omit `type`, none has a group-level repeat, and 23
child modifiers carry repeats.

The Task 6 browser measurement and first headless acquisition slice are
complete. The repository package now validates exact GitHub commit pins, lists
bounded commit trees, streams and securely ingests individual pinned files, and
plans exact-ID catalogue dependency closures from an available metadata index.
Pinned tree files also have a transport-neutral read-through cache contract with
size and Git blob integrity verification. Sequential remote metadata indexing
and focused closure acquisition are also complete, including summary-versus-
download verification. The first `App.tsx` split is complete: a focused
`useRosterForgeAppController` now owns imports, drafts, catalogue selection,
history, and roster commands while `App` retains presentation composition.
Saved drafts, catalogue library/import reporting, catalogue details/roster
setup, workspace states, and shared display primitives are now separate modules.
The complete active roster workspace is now a separate byte-for-byte moved
module as well, leaving `App.tsx` as a small composition root. Defensive,
versioned IndexedDB adapters now persist verified pinned repository bytes and a
bounded metadata report keyed by immutable commit plus tree object ID. The
acquisition UI is complete for one configured immutable WH40K 11e snapshot:
users can index with progress and cancellation, choose a non-library faction
catalogue, acquire its exact-ID dependency closure, and enter the existing
roster flow. Repeat browsing validates the pinned tree, restores matching
metadata without reparsing every source file, and still verifies and re-ingests
the selected closure before publication. Remote documents compose without
reparsing or replacing download provenance. Draft snapshots retain optional
source IDs and source kinds, so reopening a downloaded closure does not silently
rewrite it as a local-file source. Cache eviction, quota controls, additional
source configuration, and repository update discovery remain deferred.

The first Task 7 export checkpoint is complete. The active roster workspace now
builds a standalone print/save-PDF document from the immutable roster and its
existing cost and supported-validation reports. It preserves nested source
order, occurrence and definition IDs, effective quantities, included selection
costs, roster totals, and explicit validity/completeness labels. All imported
and user-authored strings are escaped before writing the new window. Popup
failure remains a retryable UI alert. This is deliberately a presentation
export; faithful `.ros`/`.rosz` interchange remains deferred until the roster
model carries the additional expanded profiles, rules, categories, and link
identity required by the BattleScribe roster schema.

The `localConditionGroups` correction is also complete. The pinned shape is 339
`localConditionGroup` extension objects, all `atLeast`/`selections`/`parent`,
each containing one nested `before` condition and one nested `instanceOf`
condition. They now have a separate typed projection with scalar repeat
metadata and nested conditions preserved by reference. Evaluation emits one
source-located unsupported-extension diagnostic and no longer mistakes an
extension-only group for an empty group. The 59 ordinary condition groups with
type `count` remain preserved strings and unresolved. This corrects the older
claim below that the 339 local records were themselves `before` conditions.

On August 13, 2026, the 46 pinned files (67,554,454 bytes) imported through the
local Chromium application in 3,324 ms end to end. An application probe measured
2,608.4 ms through the post-render boundary and a JavaScript heap increase from
152,078,277 bytes to 821,735,425 bytes, or 638.6 MiB. All 46 files imported, 36
catalogues were selectable, the expected 65 issues remained observable, and the
browser console had no warnings or errors. The measured heap cost makes pinned
dependency-closure acquisition the default recommendation; all-repository
loading remains an explicit compatibility and diagnostics path.

The review's weak grouped assertion and negative-limit question are now closed.
The pinned integration test adds one real Weapon Modifications occurrence and
proves grouped constraint `33dc-ea33-2bce-e0b0` changes from `baseLimit: 0` to
`limit: 2` through one applied grouped increment and no direct modifier. The
corpus guard also pins all 26 negative constraints: 21 `max`, five `min`, 17
selection fields, nine points-cost fields, and parent/force/roster scope counts
of 5/15/6. Every value is `-1`; RosterForge intentionally preserves and
diagnoses them rather than inventing disabled or unbounded sentinel semantics.

---

## 1. Audit Provenance And What Was Not Verified

**Verified.** Your real-data modifier-group inventory reproduces exactly:
1,491 `and` groups with constraint-targeting descendants; 4,038 target
operations comprising 2,865 `increment`, 1,167 `set`, 4 `decrement`, and 2
`multiply`. All four figures match independently. The architecture boundaries
are genuinely enforced (`eslint.config.mjs` `no-restricted-imports` plus
`package-boundaries.test.ts`), and the integration assertions do prove execution
rather than the absence of diagnostics — `baseLimit: 0 → limit: 2000` in
`apps/web/src/bsdata-json.integration.test.ts` is a real behavioural delta.

**Not verified.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
could not be run during the review: the machine holding the worktree has no
Node.js installation on `PATH`. The reported "284 passed, 3 skipped" and
"build passed" remain unconfirmed by the reviewer.

**First action of the next session: re-run all four checks and report the actual
output.** Do not carry the previous numbers forward as established.

---

## 2. The Central Finding

The condition evaluator already decides **95.9%** of every modifier in the
pinned corpus. Execution has been wired for one target field. Roughly half of
the modifier surface is decidable-but-inert.

| Modifier target | Count | Decidable | Executed today |
|---|---|---|---|
| `name` | 7,673 | 100% | none |
| `constraint` | 6,245 | 99.2% | direct + grouped |
| `hidden` | 4,779 | 89.6% | direct only (309 grouped inert) |
| `costType` | 1,939 | 81.5% | direct only (305 grouped inert) |
| `characteristicType` | 1,741 | 99.4% | none |
| `category` | 892 | 99.8% | none |
| **Total** | **24,168** | **95.9%** | **~12,300 (51%)** |

Your proposed next session — grouped cost-targeting modifiers — addresses
**305 modifiers**, tied for the smallest remaining bucket. The collector that
would do it (`collectRosterModifierGroupExecution`) is already written and
already generic. It is a correct task; it is not the highest-value one.

### The larger issue: completeness is being consumed by unreachable content

| | Total | Crusade-only | Matched play |
|---|---|---|---|
| Modifiers | 24,168 | 8,402 (34.8%) | 15,766 |
| Constraints | 26,259 | 4,455 (17.0%) | 21,804 |

86% of the 7,673 `name` modifiers are the five Crusade rank labels
(`(Battle-ready)`, `(Blooded)`, `(Battle-hardened)`, `(Heroic)`, `(Legendary)`,
1,319–1,320 each). All 3,958 constraints with `field=<costType> scope="self"`
are Crusade Battle Honours or Weapon Modifications.

`completeness` is currently a single global flag aggregated over everything
projected, including content that is not reachable from the roster being
evaluated. The practical consequence is that a matched-play roster is
permanently `incomplete` because of narrative-mode content the user never
selected. A flag that is always `incomplete` carries no information, which
defeats the purpose of the two-dimensional validation contract.

**This is the highest-leverage remaining change.** It is what converts the
validation surface from "informative but never conclusive" into conclusive, and
it is the difference between the current app and New Recruit's user experience.

---

## 3. Revised Work Order

Each item is one bounded session. Do not merge them.

### Task 1 — Baseline the checks

Re-run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and report exact
output. Confirm the three real-data integration tests still pass with
`ROSTERFORGE_BSDATA_JSON_DIR` set. No code changes.

### Task 2 — Identity conditions in `parent` and `self` scope

`packages/evaluation/src/conditions.ts` supports `instanceOf`/`notInstanceOf`
for `force`, `ancestor`, `root-entry`, the typed scopes, and
`primary-catalogue`. `parent` and `self` are absent, so they currently emit
`EVALUATION_CONDITION_IDENTITY_SHAPE_UNSUPPORTED`.

The corpus contains **1,084** identity conditions in `parent` scope and **72**
in `self` scope. This is the single largest condition gap in the data, and
`parent` is a depth-1 special case of `ancestor`, which is already implemented
and already tested.

Acceptance: synthetic fixtures covering true, false, and unresolved outcomes in
both scopes; the 1,156 corpus conditions no longer produce identity-shape
diagnostics; `docs/compatibility.md` condition-scope inventory updated.

### Task 3 — Relevance-scoped completeness

Do **not** implement this as "ignore Crusade". Hardcoding game-mode knowledge
would violate the project's own rule against silently dropping unsupported data,
and would not generalise beyond 40k.

Implement it as a general relevance rule: **unsupported projected behavior makes
an evaluated result incomplete only when it could affect that result.**
Unsupported behavior on a definition that is not selected, and not reachable
from the current roster's selected occurrences, belongs in catalogue-level
diagnostics rather than in the roster report's completeness.

There is already precedent for exactly this instinct in the codebase.
`docs/architecture.md` describes the structural report's handling of unselected
roots: such a root "is not promoted into the actionable bound list; its
unsupported behavior still makes the report incomplete and contributes to one
catalogue-level inactive-root diagnostic." That decision solved the actionable
list and deliberately left completeness alone. This task is extending the same
reasoning to completeness itself.

Constraints on the design:
- Excluded behavior must remain observable and diagnosed at catalogue level.
  Nothing is silently discarded.
- The relevance test must be structural (reachability from selected
  occurrences), not a name or keyword match.
- If reachability cannot be determined, the content stays relevant and the
  report stays incomplete. Conservative direction is unchanged.
- Validity semantics do not change. Only the aggregation scope of completeness
  changes.

Acceptance: a configured matched-play Aeldari roster reports
`completeness: "complete"` for its cost total, with Crusade content still
diagnosed at catalogue level; synthetic fixtures prove that reachable
unsupported behavior still forces `incomplete`; `docs/architecture.md` and
`docs/compatibility.md` describe the relevance rule explicitly.

### Task 4 — Generalize grouped execution to `hidden`

Reuse `collectRosterModifierGroupExecution` for
`evaluateRosterSelectionVisibility`. 309 grouped `hidden` modifiers currently
never execute, which means entries that should be hidden stay in the
child-choice surface. Visibility is directly user-facing, so this is worth more
than the same amount of work spent on costs.

Preserve the documented order (direct owner modifiers, then top-level groups in
source order, direct children before nested groups depth-first) and keep
group-level repeats unresolved.

### Task 5 — Generalize grouped execution to costs

Your originally planned session. Same collector, 305 modifiers. Note that
`divide` (140) and `multiply` (1) appear as cost operations and are outside the
supported `set`/`increment`/`decrement`/`floor` kernel; preserve them as
incomplete rather than extending the kernel speculatively in this task.

### Task 6 — Catalogue acquisition

The largest product-level blocker. A user currently has to know that Aeldari
needs 4 specific JSON files and Imperial Knights needs 7, and hand-pick them
from disk. New Recruit presents a faction list.

Implement fetching a pinned BSData repository index and its dependency closure.
All existing rules apply without exception: downloaded bytes are untrusted,
existing byte/archive/JSON limits are enforced before parsing, nothing is
executed, provenance is retained, and failures are diagnostics. Pin the commit
rather than tracking a moving branch.

Before building UX on top of a whole-repository load, **measure it**: the corpus
is 67.6 MB across 1,539,432 JSON nodes and 1,282,724 properties, and the
preserve-everything model retains ordered wrappers plus source ranges for all of
them, plus a 102,982-entry ID index, plus materialization budgeted to 250,000
expansions. A back-of-envelope estimate is 0.5–1 GB of browser heap. The
existing integration proof runs in Node with a much larger default heap. Record
actual browser time and memory figures in `docs/compatibility.md` before
committing further work to the all-repository path.

### Task 7 — Roster export

A browser print/save-PDF presentation path is complete. It retains roster,
catalogue, force, selection, definition, cost, validation, and diagnostic
identities in a serializable view model. It is explicitly not `.ros`/`.rosz`
interchange; that format remains deferred.

### Task 8 — Display-fidelity modifiers

`characteristicType` (1,741, 99.4% decidable, ~96% matched-play relevant) is the
one that matters most here — it is how weapon and model stat changes reach the
profile display. `category` (892) affects dynamic keywords. `name` (7,673) is
86% Crusade and should be sequenced last despite its raw count.

The first bounded checkpoint closed a structural gap: all profiles now project
their ordered direct modifiers and modifier groups, and materialized profile
info links expose those exact arrays by reference.

The second bounded checkpoint (`04444cb`) added headless characteristic-display
evaluation for profile-owned modifiers. Target routing is exact-`typeId` only,
and `set` is the only executed operation. 173 of the 484 profile-owned
characteristic modifiers are in the executable subset; the rest stay preserved,
diagnosed, and incomplete. Generic `affects`, `join`, `arg`, and `position`
remain preserved and unapplied, and `affects` is the documented blocker for the
1,257 characteristic modifiers owned outside profiles. See the completed
assignment above for the full inventory and the open semantic questions.

The third bounded checkpoint (`a42b791`) surfaced that report in the roster
workspace with base-versus-effective display, an explicit unresolved label, and
a per-profile incomplete note. It added no evaluation semantics.

The fourth bounded checkpoint (`449c17f`) added profile visibility. All 154
profile-owned `hidden` modifiers fit the supported Boolean `set` shape, and they
no longer make a characteristic report incomplete.

The fifth bounded checkpoint (`59757d9`) closed the `affects` grammar question
with a pure parser and a pinned corpus guard. It deliberately stops short of
execution; the three remaining semantic decisions are recorded below.

---

## 4. Smaller Corrections

**Two undocumented schema extensions.** The compatibility document enumerates
observed shapes exhaustively, so these are gaps in that inventory:

- `localConditionGroups` — a property that does not exist in BattleScribe 2.03.
  339 conditions of type `before` (also not 2.03) sit at
  `modifiers/conditionGroups/localConditionGroups/conditions`. The string
  `localConditionGroups` appears nowhere in the codebase, so the JSON adapter
  never projects it and those groups project as empty. Behavior fails safe
  (empty group → unresolved), but the shape should be documented and the
  emptiness should be distinguishable from a genuinely empty group.
- `conditionGroups` with `type: "count"` — 59 occurrences, concentrated in
  Genestealer Cults. Unknown type → unresolved, so also safe, also undocumented.

**Negative constraint limits.** `docs/compatibility.md` frames `-1` as an open
question. The corpus contains 26 instances total (21 `max`, 5 `min`). Close it
as "won't fix, 26 instances" rather than leaving it open.

**Weak grouped assertion.** In the real-data integration test, the grouped-path
assertion is `modifierSequence.steps.length > modifiers.length`. That proves an
extra step entered the sequence, not that a grouped step changed a value. Pin a
specific constraint whose effective limit differs *because of* a grouped
modifier, in the style of the existing `baseLimit: 0 → limit: 2000` assertion.

**`apps/web/src/App.tsx` is 3,502 lines** with roughly 70 top-level
declarations — about 40% of the web app in one file. Not urgent, but split it
before roster editing grows further.

---

## 5. Standing Guardrails

- Do not reset, clean, checkout, or revert the worktree. Existing uncommitted
  and untracked work is intentional.
- The two-dimensional validation contract does not change. Task 3 changes what
  completeness aggregates over, never whether unsupported behavior is reported.
- Do not extend the numeric kernel to `divide`, `multiply`, `replace`,
  `set-primary`, `add`, or `append` opportunistically. Each is its own decision.
- Preserve-don't-replace still holds for every new surface.
- Update `docs/architecture.md`, `docs/compatibility.md`, and
  `docs/diagnostics.md` whenever behavior or boundaries change.
- Finish one task completely before starting the next.

---

## Appendix — Reproducing The Numbers

Throwaway audit script. Do not commit it; it reads third-party data.

```python
import json, glob, os, collections

DIR = r"E:\GitHub\wh40k-11e"
docs = [json.load(open(f, encoding="utf-8"))
        for f in sorted(glob.glob(os.path.join(DIR, "*.json")))]

id_kind, name_of = {}, {}
SING = {"selectionEntries":"selectionEntry","sharedSelectionEntries":"selectionEntry",
 "selectionEntryGroups":"selectionEntryGroup","sharedSelectionEntryGroups":"selectionEntryGroup",
 "entryLinks":"entryLink","categoryEntries":"categoryEntry","costTypes":"costType",
 "constraints":"constraint","characteristicTypes":"characteristicType","forceEntries":"forceEntry"}
def idx(n, hint=None):
    if isinstance(n, dict):
        i, nm = n.get("id"), n.get("name")
        if isinstance(i, str):
            if hint: id_kind.setdefault(i, hint)
            if isinstance(nm, str): name_of[i] = nm
        for k, v in n.items(): idx(v, SING.get(k) or hint)
    elif isinstance(n, list):
        for v in n: idx(v, hint)
for d in docs: idx(d)

NUM = {"atLeast","atMost","greaterThan","lessThan","equalTo","notEqualTo"}
IDENT = {"instanceOf","notInstanceOf"}
TYPED = {"unit","model","model-or-unit","upgrade"}
NUM_SCOPES = {"self","parent","root-entry","force","roster"} | TYPED
IDENT_SCOPES = {"force","ancestor","root-entry","primary-catalogue"} | TYPED
ID_KINDS = {"selectionEntry","selectionEntryGroup","entryLink","categoryEntry"}
RANKS = {"(Battle-ready)","(Blooded)","(Battle-hardened)","(Heroic)","(Legendary)"}
reasons = collections.Counter()

def cond_ok(c):
    t, f, s = c.get("type"), c.get("field"), c.get("scope")
    if c.get("percentValue"): return False
    sk = id_kind.get(s)
    if t in NUM:
        if f == "selections": return s in NUM_SCOPES or sk in ID_KINDS
        if f == "forces": return s == "roster" and c.get("shared") is True
        if id_kind.get(f) == "costType": return s == "root-entry" or s in TYPED
        return False
    if t in IDENT:
        ok = s in IDENT_SCOPES or sk in ID_KINDS
        if not ok: reasons[f"ident/scope={s}"] += 1
        return ok
    reasons[f"conditionType={t}"] += 1
    return False

def grp_ok(g):
    if g.get("type") not in ("and","or"): return False
    if not (g.get("conditions") or g.get("conditionGroups")): return False
    return all(cond_ok(c) for c in g.get("conditions") or []) and \
           all(grp_ok(x) for x in g.get("conditionGroups") or [])

def mod_ok(m, inherited):
    return (inherited
            and all(cond_ok(c) for c in m.get("conditions") or [])
            and all(grp_ok(g) for g in m.get("conditionGroups") or [])
            and all(r.get("field") == "selections" and not r.get("percentValue")
                    for r in m.get("repeats") or []))

def mgrp_ok(g):
    return (g.get("type") == "and" and not g.get("repeats")
            and all(cond_ok(c) for c in g.get("conditions") or [])
            and all(grp_ok(x) for x in g.get("conditionGroups") or []))

def bucket(f):
    if f in ("hidden","name","category"): return f
    return id_kind.get(f) or "<unknown-id>"

stats = collections.defaultdict(collections.Counter)
crusade_ids = {i for i, n in name_of.items()
               if "crusade" in n.lower() or n in ("Battle Honours","Weapon Modifications")}

def is_crusade(m, ctx):
    return (m.get("value") in RANKS or m.get("field") in crusade_ids or ctx
            or any(c.get("childId") in crusade_ids or c.get("scope") in crusade_ids
                   for c in m.get("conditions") or []))

def visit(c, inherited, grouped, ctx):
    for m in c.get("modifiers") or []:
        b = bucket(m.get("field")); s = stats[b]
        s["total"] += 1
        s["decidable" if mod_ok(m, inherited) else "undecidable"] += 1
        if grouped: s["grouped"] += 1
        if is_crusade(m, ctx): s["crusade"] += 1
    for g in c.get("modifierGroups") or []:
        visit(g, inherited and mgrp_ok(g), True, ctx)

def walk(n, ctx=False):
    if isinstance(n, dict):
        nm = n.get("name")
        ctx = ctx or (isinstance(nm, str) and "crusade" in nm.lower())
        if "modifiers" in n or "modifierGroups" in n: visit(n, True, False, ctx)
        for k, v in n.items():
            if k not in ("modifiers","modifierGroups"): walk(v, ctx)
    elif isinstance(n, list):
        for v in n: walk(v, ctx)
for d in docs: walk(d)

print(f"{'target':22}{'total':>8}{'decidable':>11}{'%':>8}{'grouped':>9}{'crusade':>9}")
T = D = C = 0
for b, c in sorted(stats.items(), key=lambda kv: -kv[1]["total"]):
    print(f"{b:22}{c['total']:8}{c['decidable']:11}{100*c['decidable']/c['total']:7.1f}%"
          f"{c['grouped']:9}{c['crusade']:9}")
    T += c["total"]; D += c["decidable"]; C += c["crusade"]
print(f"{'TOTAL':22}{T:8}{D:11}{100*D/T:7.1f}%{'':9}{C:9}")
print("\ntop undecidable reasons:")
for k, v in reasons.most_common(8): print(f"  {k:34}{v}")
```

Expected output: 24,168 modifiers, 95.9% decidable, 8,402 Crusade; top
undecidable reason `ident/scope=parent` at 1,084.

## Completed Assignment — The Category Condition Flip, 2026-08-14

Baseline `88e495e`. Resulting commits: `64e8f3b` (`feat: feed effective category
membership into condition identity`) and `27a2801` (`feat: consume effective
categories in cost, constraint, and visibility reports`). Not pushed, no pull
request.

Stage three of the staged category plan, approved after scope resolution moved
its payoff from 2.5% to 21% of the category-condition surface.

### The single-pass rule

Membership and identity are mutually recursive in principle: a category modifier
may carry conditions, and a condition may test a category. This resolves in one
documented pass, not a fixpoint.

Pass one — `indexEffectiveRosterCategories` — evaluates every category
modifier's applicability with **no index in scope**, so a condition inside a
category modifier compares static links. Pass two is every ordinary evaluation,
which consults the finished index. `evaluateRosterSelectionCategories`
deliberately never consumes the index; that is what keeps pass one from
recursing.

The consequence is deliberate and permanent: an occurrence whose category
modifiers depend on category identity keeps unknown membership — seven of 892
modifiers in the pinned corpus. BattleScribe may iterate to a fixpoint instead.
Nothing in the data establishes that, so the chained case is refused.

### Design notes worth knowing

- **Layering.** The index *type* lives in the leaf `selection-context` module so
  the condition layer can accept an index without importing the evaluator that
  produces it. Package layering stays acyclic:
  `selection-context ← conditions ← modifier-applicability ← modifier-groups ←
  categories ← effective-categories`.
- **Authority.** Known membership *replaces* the static links for a category
  target rather than adding to them, so a removed category stops matching even
  though its link is still projected. Non-category identity targets are
  untouched.
- **Memoization.** `effectiveRosterCategories` caches by roster and context
  identity. Sound because every roster command returns a new immutable roster;
  necessary because rebuilding per selection is quadratic.

### Consumers wired

Cost evaluation, selection constraints, force constraints, and selection
visibility each build the index and forward it through modifier applicability
and modifier-group applicability. Composed supported validation inherits it.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **395 passed, 4 skipped (399 total)**. Three new synthetic
  proofs: a modifier-granted category resolving from unresolved to satisfied, a
  removed category ceasing to match, and a cyclic occurrence staying unknown.
- Pinned real-data suite — **4 passed, all assertions unchanged.**

At the time of the flip commits no pinned assertion moved, because the existing
rosters do not exercise a category-controlled condition. That gap is now closed
by the checkpoint below.

## Completed Assignment — Pinning The Flip, 2026-08-17

Baseline `41950db`; resulting commit `e0d3c68` (`test: pin the category flip
against real data`). Not pushed, no pull request.

The flip previously rested on a static measurement. This adds the observed
behavioural delta, in the style of the `Custodian Guard W 3 → 4` pin.

An Adeptus Custodes **Venerable Contemptor Dreadnought** takes its **Character
upgrade**, whose modifier adds the Character category with `scope="root-entry"`.
The Dreadnought does not declare that category statically, so one test proves
the scope inversion and the execution together:

- `baseCategories` excludes Character; `categories` includes it.
- The applied step records `origin: "root-entry-scope"` and `changed: true`.
- The paired `set-primary` stays unapplied without costing membership.

A real condition from the same catalogue — `instanceOf`, `selections`,
`scope="root-entry"`, `childId=Character`, `shared` — is then evaluated both ways
against that roster: **unresolved without the index, satisfied with it.**

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` clean;
`pnpm test` **395 passed, 5 skipped**; pinned real-data suite **5 passed**.

## Completed Assignment — Workspace Keywords, 2026-08-17

Baseline `8835518`; resulting commit `2bbdbb7` (`feat: show effective keywords
in the roster workspace`). Not pushed, no pull request. Presentation only.

`inspectLocalRosterSelectionCategories` resolves membership into display-ready
keywords, naming each category from the composed catalogue definitions and
keeping the raw ID when no definition names one. The occurrence panel lists
effective keywords in order, marks modifier-granted ones, shows removed
keywords struck through rather than hidden, and states plainly when membership
is unresolved — the same preserve-and-label rule the hidden-profile and
base-versus-effective displays use.

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` clean;
`pnpm test` **395 passed, 5 skipped**; pinned real-data suite **5 passed**.

### Next recommended boundary — both need a decision first

1. **`affects` execution.** Three semantic decisions from the parsing
   checkpoint, plus how `affects` composes with `scope` (1,617 modifiers carry
   both). The plausible reading is that `scope` picks the anchor occurrence and
   the `affects` path navigates from there, making `self` mean the scoped
   occurrence rather than the declaring one. That is an inference, not
   something the data settles.
2. **`set-primary` semantics.** One of two things still blocking the remaining
   20 categories. Needs a source outside the data to settle whether it implies
   membership and whether it clears other primaries.

Smaller work that needs no decision, if a session wants it: extend the
category-condition honesty downgrade to inbound scoped modifiers declared by
*other* occurrences, which is still an explicit documented gap.

## Completed Assignment — set-primary Semantics, 2026-08-17

Baseline `ba53ad6`; resulting commit `f6bb1d7` (`feat: execute set-primary and
unset-primary category operations`). Not pushed, no pull request.

This was the research checkpoint: the question was whether a source outside the
data could settle `set-primary`. One could.

### What the sources say

**Membership — settled by direct quote.** The BattleScribe 2.03.00 release notes
state: *"When setting a Category to primary, the Category will be added if it
doesn't already exist."* That is the BattleScribe author, and it explains the
corpus shape that blocked us: 322 of 325 executable-shaped `set-primary`
modifiers name a category their owner does not link.

**Displacement — inference, well corroborated.** Three sources converge: the
BSData wiki calls the primary *"the category in which that entry will be visible
in Roster Editor"*, singular; the release note describes the operation as making
it easier to *move* entries between categories; and BattleScribe issue #18 shows
an entry displaying under exactly one category and moving when its primary
changes.

A counter-signal appeared during implementation and was checked rather than
waved away. The pinned Custodes Character upgrade carries an explicit
`unset-primary Vehicle` beside its `set-primary Character` — which would be
unnecessary if `set-primary` already displaced. The corpus settles it: only
**five of 319** `set-primary` owners pair an `unset-primary`, and **234** owners
would hold more than one primary without displacement, against a documented
single-slot display model. Those five explicit unsets are redundant authoring,
not evidence. Primary status affects presentation rather than legality, which
bounds the cost of the inference being wrong.

`unset-primary` clears the flag and leaves membership alone; nothing suggests
otherwise.

### Sources

- BattleScribe 2.03.00 release notes — <https://github.com/BattleScribe/Pre-Release/issues/17>
- BattleScribe 2.03.00 blog announcement — <http://battlescribe.blogspot.com/2019/08/battlescribe-20300-released.html>
- BSData data-structure overview — <https://github.com/BSData/catalogue-development/wiki/Data-structure-overview>
- Primary-category behaviour report — <https://github.com/BattleScribe/Pre-Release/issues/18>

### Measured payoff

| Measure | Before | After |
|---|---|---|
| Executable category modifiers | 428 | **761** |
| Blocked categories | 20 | **8** |
| Category conditions resolved by effective membership | 1,048 | **1,605** |
| Category conditions still unresolved | 659 | **102** |

For context, the unresolved figure was 1,580 before any of this work. The
remaining eight categories are blocked by generic behavior attributes, chiefly
`affects`.

The `primaryOnly` step flag is gone. It existed because a primary operation
could not change membership, which is no longer true.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **397 passed, 5 skipped (402 total)**.
- Pinned real-data suite — **5 passed**. The Custodes pin now asserts the full
  real sequence: `add Character`, `unset-primary Vehicle`, `set-primary
  Character`, leaving Character the sole primary.

### Next recommended boundary

`affects` execution; see the research checkpoint below, which answered several
of its open questions and corrected one earlier claim.

## Research Checkpoint — `affects` Semantics, 2026-08-17

> **Partly superseded.** Its "Precedence, not composition" finding — that
> `affects` overrides `scope` — was disproved in New Recruit on 2026-08-20.
> The two compose: `scope` chooses where the selector stands, `affects` chooses
> where it walks. See "Completed Assignment — `affects` Anchoring". The rest of
> this entry (profile-type matching, `position`, `modulo`) still holds.

No code change. Documentation only, following the same
search-before-inferring approach that settled `set-primary`.

### The key structural finding

**`affects` is a New Recruit extension, not a BattleScribe 2.03 feature.** It
appears in no BattleScribe release note or schema. Its semantics are defined by
New Recruit, whose data editor is open source
(<https://github.com/giloushaker/nr-editor>). The runtime logic lives in a
private submodule (`giloushaker/nr-shared`, 404), but the editor's own modifier
panel encodes enough to settle several questions.

That also explains why 1,617 modifiers carry **both** `affects` and `scope`:
BattleScribe ignores `affects` and honours `scope`, so authors write both to get
sensible behaviour in each tool.

### Settled

**Profile-type matching.** The segment after `profiles` is matched against
declared **profile type names, case-insensitively**. `all` — or an absent
segment — means any profile type. A name matching no declared profile type is
treated as *invalid authoring*, not as an empty match. This confirms the earlier
inference and adds two refinements we did not have: case-insensitivity and the
`all` sentinel.

**`position`.** The editor tooltip reads: *"1-Based index of the match to
affect. supports negative indexes. 0 = All"*. So `-1` selects the last match,
`1` the first, `0` every match. It is offered only for `replace`, `increment`,
`decrement`, `multiply`, `divide`, `modulo`, `floor`, and `ceil` on `string` or
`string-or-number` fields — so it indexes matches *within a value*, not
placement within an appended list. The pinned corpus has `position` `-1` 153
times, `""` five times, and `1` three times.

**`modulo` exists** as an operation, alongside the kinds already inventoried.

### Corrected

A previous entry proposed that `scope` picks the anchor occurrence and the
`affects` path navigates from there. **That is wrong.** The editor treats them
as alternatives: when `affects` is present and is not the literal `self`, it
determines the target and `scope` is not consulted; otherwise `scope` is. The
value `self` means "no retargeting", falling back to `scope`.

This matters for design: `affects` **overrides** `scope` rather than composing
with it, so the two mechanisms do not need a combination rule — they need a
precedence rule.

### Still open

1. Whether `entries` means direct child occurrences or all descendants. The
   corpus contrast between `self.entries.profiles.X` and
   `self.entries.recursive.profiles.X` implies the former, but nothing external
   confirms it.
2. What an embedded category or entry ID does in the path — filter the traversal
   set, or narrow the selected profiles.
3. Whether the editor's precedence rule is also the runtime rule. It governs the
   editor's field typing, which is strong evidence but not proof.

Those three could be settled by reading New Recruit's runtime behaviour
directly, or by a targeted experiment: build a unit in New Recruit whose upgrade
carries a non-recursive `affects` and observe which nested profiles change.

### Sources

- New Recruit data editor, modifier panel —
  <https://github.com/giloushaker/nr-editor/blob/master/components/catalogue/right_panel/fields/Modifier.vue>
- New Recruit editor repository — <https://github.com/giloushaker/nr-editor>
- BattleScribe 2.03.00 release notes (no `affects`) —
  <https://github.com/BattleScribe/Pre-Release/issues/17>

### Next recommended boundary

Taken in the checkpoint below.

## Completed Assignment — Owner-Relative `affects`, 2026-08-17

Baseline `109396c`; resulting commit `9683ca8` (`feat: execute owner-relative
affects routing for characteristics`). Not pushed, no pull request.

A modifier declared by a profile's **owning selection** now reaches that profile
through an `affects` selector. Only the owner-relative form executes: no
`entries` traversal, no embedded filter ID, ending in
`profiles.<profileTypeName>`. That subset needs neither of the two still-open
decisions, so it could be built without inventing anything.

Selectors that traverse beyond the owner are left alone entirely rather than
recorded as unapplied steps on every profile they might reach — a wrong-looking
incomplete marker on an unrelated profile would be worse than silence about a
modifier that was never routed here.

### Design points

- **Profile-type matching** follows New Recruit's editor: case-insensitive
  against the *declared* type resolved from `typeId` through the graph, never
  against the denormalized `typeName`. `all` matches any type; an unmatched name
  routes nothing.
- **Precedence, not composition.** `affects` overrides `scope`, so a routed
  modifier's scope is not counted against it and neither is the `affects`
  attribute itself.
- **Order.** Routed steps record `origin: "affects"` and run *after* the
  profile's own, keeping a profile-owned modifier authoritative over an
  inherited one.
- **Unresolvable type.** A profile whose type does not resolve uniquely makes
  the report incomplete when its owner carries any `affects` modifier, since one
  might have targeted it.

### Pinned corpus

237 of the 1,246 parsed characteristic selectors take the owner-relative form.
All resolve to a declared profile type, using only `Unit` (187), `Ranged
Weapons` (29), and `Melee Weapons` (21). **156** are `set` operations the
lexical kernel executes; the rest are `increment` (47), `append` (19), `replace`
(13), and `decrement` (2), which remain unapplied for the same
lexical-arithmetic reasons as before.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **400 passed, 5 skipped (405 total)**.
- Pinned real-data suite — **5 passed**, unchanged.

### Next recommended boundary

1. **Settle the two remaining `affects` questions**, ideally by experiment in
   New Recruit: build a unit whose upgrade carries a non-recursive `affects` and
   observe which nested profiles change, then repeat with an embedded category
   ID. That unlocks the ~1,000 traversal selectors, which is where the weapon
   stat changes live.
2. **A pinned real-data proof of owner-relative routing**, in the style of the
   Custodes category pin. Nothing currently exercises it against the corpus, so
   the 156 figure rests on a static count.
3. Smaller decision-free work: extend the category-condition honesty downgrade
   to inbound scoped modifiers declared by other occurrences.

## Completed Assignment — `affects` Traversal Settled, 2026-08-19

Baseline `fec5108`; resulting commit `41ce465` (`feat: accept the group
traversal segment in affects selectors`). Not pushed, no pull request.

Stone ran the New Recruit experiments. Both open questions are now answered by
observation rather than inference, and a grammar segment we had never seen
turned up.

### Method note

Before drawing conclusions, the live BSData files were fetched and compared
against the pinned snapshot, because two modifiers failed to fire and stale data
would have been the boring explanation. It was not: the relevant modifiers exist
verbatim in live data with identical base values, so the non-firing was real
behaviour. One apparent counter-example — a Helbrute `append Assault` that did
nothing — turned out to sit inside a modifier group with its own unmet
`atLeast 1 selections scope=force` condition, so it says nothing about
traversal.

### Settled: `entries` does not enter groups

A Necron **Skorpekh Lord** carries an unconditional
`self.entries.profiles.Melee Weapons` increment of +2 S. Its Flensing claw
stayed at S 6. The weapons are not direct entries — they sit inside the model's
`Wargear` selection-entry group.

A Death Guard **Helbrute** carries `self.entries.recursive.<category>.profiles.
Melee Weapons` +2 A, and its group-resident melee weapons did gain the bonus.

So **`entries` is the direct child *entry* collection and does not descend into
selection-entry groups; `recursive` reaches all descendants.**

This also invalidated an assumption in the analysis tooling, which had been
treating groups as depth-transparent when computing profile depth.

### Settled: the embedded ID filters

With two `Helbrute melee weapon` category members selected, both gained +2 A
(Power scourge 8→10, Helbrute fist 5→7) while `Close combat weapon`, the one
melee profile outside that category, stayed at 5. Dropping to a single member
removed the bonus entirely, matching the modifier's own `atLeast 2` condition.
New Recruit renders modified values in blue, which made the deltas unambiguous.

### New: the `group` traversal segment

Live data contains a `group` segment that the pinned snapshot does not contain
at all — nine distinct values across just Necrons and Death Guard, including
`self.entries.group.recursive.profiles.Ranged Weapons` and
`group.recursive.group.profiles.Unit`. It enters selection-entry groups without
full recursion, independently confirming groups are a traversal step.

The parser now consumes traversal keywords in any order and any number of times,
since `group` occurs leading, after `entries`, and again after `recursive`. It
exposes `entersGroups` separately. Without this the parser would have read
`group` as a filter ID and mis-parsed those paths. No pinned-corpus count moves,
because no pinned selector uses it.

### Still open, and not worth an experiment

What an embedded ID does when it names a **selection entry** rather than a
category. The entire corpus contains one instance.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **403 passed, 5 skipped (408 total)**.
- Pinned real-data suite — **5 passed**, unchanged.

### Next recommended boundary

**Traversal execution.** The semantics are now fully specified, so this needs no
further decisions:

- `own` — the modifier's own owner. *Already implemented.*
- `children` — the owner's direct child **entries**; group members only when the
  selector carries `group`.
- `descendants` — every descendant occurrence.
- An embedded **category** ID filters the target set to occurrences holding that
  category, which the effective-category index already answers.
- The profile type matches case-insensitively against the declared type.

Implementation shape: for a given (owner occurrence, profile), walk the
occurrence's **ancestors** and collect their `affects` modifiers, testing
whether this occurrence falls in each selector's target set. The occurrence tree
flattens groups in browser-built rosters but retains group occurrences in
headless ones, so the route test should count entry steps while treating a
selection-entry-group occurrence as a non-entry step — that way it is correct
under both shapes.

Only `set` executes, as before, so the visible unlock is bounded by the lexical
kernel; the rest become correctly-attributed incompleteness on the right
profile.

## Completed Assignment — Traversal Execution And Pin, 2026-08-19

Commits `72455bf` (traversal execution) and `841e50f` (real-data pin plus a bug
it caught). Pushed; `main` and `codex/recovery-baseline` are level and CI is
green on both.

### Traversal executes

A modifier declared by a profile owner or any ancestor now routes to that
profile when the occurrence falls in its selector target set, using the
semantics Stone verified in New Recruit rather than inferred ones. An embedded
category ID filters through the effective-membership index, so a
modifier-granted category participates. Applicability is evaluated against the
occurrence that *declared* the modifier.

The route test counts entry steps and treats a selection-entry-group occurrence
as a non-entry step, so it holds whether the roster flattens groups (browser
editing) or retains them (headless construction).

### The pin, and the bug it found

A Death Guard Helbrute's `self.entries.recursive.<category>.profiles.Melee
Weapons` increment reaches a Power scourge and a Helbrute hammer sitting **two
group levels** below the model, while `Close combat weapon` — the one melee
profile outside that category — receives no routed step and keeps its known
value. Same discrimination Stone observed.

Writing that pin exposed a real defect. The routed-step merge rebuilt each
characteristic report by spreading the original, and a conditional value spread
cannot remove a key — so a characteristic whose value was known *before* routing
kept that value even when a later routed step made it unknown. That is a
confident wrong answer in exactly the place this evaluator exists to prevent
one. Fixed by rebuilding the report field by field, with a synthetic regression
added because the existing synthetic suite had no case of that shape.

Worth noting for future checkpoints: the real-data pin caught something six
synthetic tests did not.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **406 passed, 6 skipped (412 total)**.
- Pinned real-data suite — **6 passed**.

### Next recommended boundary

1. **Surface routed characteristics in the workspace.** The evaluator now
   reaches weapon profiles, but the occurrence panel does not yet distinguish a
   routed step's origin. Presentation only; no new semantics.
2. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil`, which is
   what still stops real stat lines changing. Needs the sign-convention decision
   for inverted characteristics such as saves — the one question New Recruit
   could answer by experiment if it is worth another round.
3. `append`/`replace`, now that `position` semantics are known: 1-based index of
   the match to affect, negative from the end, `0` meaning all. `join` supplies
   the separator. This is closer to decidable than it was.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One instance corpus-wide.

## Completed Assignment — Routed Attribution, 2026-08-19

Commit `55e27c8`. Presentation only; no new BattleScribe semantics were decided
or guessed.

### What changed

Every characteristic step — applied, not-applicable, and unapplied alike — now
records `declaredBy`, the `RosterSelection` that owns the modifier. It is a
required field rather than an optional one, so a routed step cannot be built
without naming its declarer. For an own step it is the profile's own occurrence
and carries no information; the value is in the routed case.

Occurrence details render `Set by <name>` under a characteristic whose report
contains an `affects`-origin step, and mark the row with `data-routed="true"`
for a left rule in the stylesheet. Without it a weapon shows a Move of 9 when
its own datasheet prints 4 and the panel offers no way to find out why.

The declarer's occurrence name is used, falling back to `another selection` when
the occurrence carries none. That is the name the reader sees in the tree, so it
is the name that lets them navigate to the source.

### Tests

The synthetic evaluation test that already claimed to check attribution only
asserted `origin`; it now asserts that `declaredBy` is the ancestor that owns
the selector and is *not* the occurrence whose profile is being read, which is
the whole content of the claim.

The UI fixture's squad gained a `self.entries.profiles.Unit` set and its Special
Weapon child gained a Unit profile with a conflicting printed value, so the
browser test exercises a real routed disagreement rather than a contrived one.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **406 passed, 6 skipped (412 total)**.
- Pinned real-data suite — **6 passed**.

### Next recommended boundary

Unchanged from the previous section, minus the item this one completed:

1. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil`. This is
   what still stops real stat lines changing. It needs the sign-convention
   decision for inverted characteristics such as saves — whether `increment 1`
   on a `3+` save means `4+` (arithmetic) or `2+` (improvement). New Recruit can
   answer that by experiment; nothing in the corpus settles it, and guessing
   would produce confidently wrong stat lines.
2. `append`/`replace`, now that `position` semantics are known: 1-based index of
   the match to affect, negative from the end, `0` meaning all. `join` supplies
   the separator.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — Characteristic `append`, 2026-08-19

Commit `5eceaec`. This is the first extension of the executable operation set
since `set`, so it was taken as its own decision rather than opportunistically,
per the standing guardrail.

### Why `append` and not `increment`

`append` needs no numeric grammar. It concatenates its value onto the running
value through the separator its `join` attribute declares — text handling, not
arithmetic. That makes it decidable today, whereas `increment` still waits on
the sign convention for inverted characteristics.

### Corpus measurement

490 `append` modifiers target a characteristic type at the pinned commit.

| Outcome | Count | Reason |
|---|---|---|
| Executed | **208** | explicit non-empty `join`, no `arg`, no `position`, valued |
| Withheld | 181 | empty `join` |
| Withheld | 90 | carries `arg` |
| Withheld | 7 | no `join` declared |
| Withheld | 4 | carries `position` |

The 208 executed are 197 `Keywords`, 10 `Description`, and one `M` — weapon
abilities such as Assault, Lethal Hits, Sustained Hits 1, Precision.

### The empty-separator finding

The 181 empty-`join` appends are **not** list appends and executing them would
have been a regression. Every one writes `+0` onto a numeric characteristic. The
corpus then shows, on the same field and owner: 154 `replace`, 78
`increment position=-1 value=1`, 37 `decrement position=-1 value=1`, and smaller
counts at values 2 and 3. 156 of the 271 `+0` appends share a field with a
positioned increment or decrement inside the same file.

So `append "+0"` opens a bonus slot, a positioned `increment`/`decrement` bumps
the digit after the `+`, and a `replace` (the `arg="+0"` family) removes the slot
when it is still zero. `position` is confirmed as *1-based index of the match to
affect within a value*, which is exactly what that idiom needs. This evaluator
executes none of those three, so applying only the append would have printed
`A 2+0` where the source means `A 2` — a confident wrong answer in precisely the
place this evaluator exists to prevent one. Withheld with its own diagnostic.

### The separator is used verbatim

The most common corpus separator is a comma followed by a **non-breaking** space
(U+00A0), not an ordinary one. The real-data pin was written with `", "` first
and failed against a value that looked byte-identical in the diff. Normalising
separators would silently alter displayed text, so the declared `join` is used
exactly as written.

### Tests

Three synthetic tests (chained appends, empty separator, missing separator and
empty input) plus a real-data pin: the pinned Death Guard Helbrute carries an
unconditional grouped `self.entries.recursive.profiles.Ranged Weapons` append,
and its Twin autocannon's Keywords gain `Assault` through the routed step. That
is the first real-data case where a routed step **changes a displayed value**
rather than only proving routing happened.

One existing synthetic fixture had used `append` as a stand-in for "unsupported
operation"; it was switched to `replace` so that test keeps its meaning.

Two stale `docs/compatibility.md` bullets were corrected while there: `affects`
was still listed as parsed-but-never-executed, which owner-relative routing and
traversal execution made wrong two checkpoints ago.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **409 passed, 6 skipped (415 total)**.
- Pinned real-data suite — **6 passed**.

### Follow-up in the same checkpoint

Commit `59f688b`. Enabling `append` made the routed attribution label wrong: it
read `Set by <name>` for every routed step. The verb now tracks the operation
(`Added by` for `append`), covered by the browser test.

### Next recommended boundary

1. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil`. This is
   now the only thing standing between the evaluator and real stat lines
   changing, and it is **blocked on one decision**: on an inverted characteristic
   such as a `3+` save, does `increment 1` mean `4+` (arithmetic on the digit) or
   `2+` (an improvement)? Nothing in the corpus settles it and guessing would
   produce confidently wrong saves. One New Recruit experiment answers it.
   Doing this also requires `position` (1-based index of the match within a
   value), which is now understood, and would then unlock the `+0` bonus-slot
   idiom above.
2. `replace`, which still needs `arg` semantics. The `+0` finding is strong
   evidence that `arg` is the **search term** — 89 of the 90 `arg` values are the
   literal `"+0"` that the append idiom inserts, and removing it is exactly what
   collapsing an unused bonus slot requires. That is inference, not confirmation;
   the same New Recruit session that answers the sign convention could confirm it
   by watching a weapon with an unused slot.

3. **Category `affects` routing** — the one item above that needs no decision
   from Stone. 89 `field="category"` modifiers carry `affects` and none are
   routed today; `packages/evaluation/src/categories.ts` does not consume the
   attribute at all. The routing mechanism already exists in
   `characteristics.ts` (`collectAffectsRoutedModifiers`, `reaches`,
   `routeFromDeclarer`, `passesThroughGroupDefinition`) and the traversal
   semantics were verified in New Recruit, so this is sharing settled machinery
   rather than deciding anything new. Recommended as the next session's work if
   the New Recruit experiments below have not happened yet.

Both blocking questions are for the *same* New Recruit session, so they are
worth batching:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — Cross-Model Handoff Ritual, 2026-08-19

Baseline `f45f0ec`; resulting implementation commit `f839c21`
(`docs: make cross-model handoffs explicit and rename the work-order`).
Process only; no product behavior changed.

### What changed

`AGENTS.md` now leads with Cross-Model Handoffs so it is the first thing a
model reads. The section states that multiple models work on this repository
on purpose — better coverage, and even use of the owner's subscriptions —
that work can move to a different model at any point, and that every
checkpoint is a handoff to a stranger.

Start and end are both required: read the current status and next recommended
boundary at the end of `agent-handoff.md` before starting; leave a complete
handoff before stopping even if the user has not named who continues. The
work-order file was renamed from `codex-handoff.md` to `agent-handoff.md` so
it is not treated as Codex-specific.

### Checks run

Markdown and rename only. `git diff --check` is clean. Lint, typecheck, test,
and build were not re-run; no product source changed.

### Next recommended boundary

Unchanged from the previous section:

1. **Category `affects` routing** — the one item that needs no decision from
   Stone. 89 `field="category"` modifiers carry `affects` and none are routed
   today; `packages/evaluation/src/categories.ts` does not consume the
   attribute at all. The routing mechanism already exists in
   `characteristics.ts` (`collectAffectsRoutedModifiers`, `reaches`,
   `routeFromDeclarer`, `passesThroughGroupDefinition`) and the traversal
   semantics were verified in New Recruit, so this is sharing settled
   machinery rather than deciding anything new.

The two product questions remain blocked on a New Recruit experiment:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

## Completed Assignment — Selections-Terminus `affects`, 2026-08-19

Baseline `785f7b1`; resulting implementation commit `83dfe49`. Parsing only; no
execution was added.

### Correction to the previous handoff

The previous entry recommended category `affects` routing as work that needed
"no decision from Stone" and was "sharing settled machinery rather than
deciding anything new". **That was wrong on both counts**, and the audit that
opened this checkpoint is what showed it. See "The blocker" below. The parser
gap was real and is now closed; execution is not the mechanical follow-on it was
described as.

### What the corpus actually says

All 89 `field="category"` modifiers carrying `affects` are `add`. Every one of
their selectors terminates at an **ID**, never at `profiles.<typeName>` — which
is correct, because `category` lives on the selection and has no profile to
name. The parser was rejecting the entire shape as malformed.

Both dominant filter IDs resolve to category entries, and the mechanism is the
companion to the `+0` append idiom settled in the previous checkpoint: a weapon
in `Attacks Dx Weapon` gets `Attacks Dx+0 Modifier` added, which is the category
that marks an opened bonus slot. The two findings describe one system.

| Selector | Count |
|---|---|
| `self.entries.recursive.<categoryId>` | 73 |
| bare `<categoryId>` | 11 |
| `self.entries.<categoryId>` | 3 |
| `self.entries.forces.recursive.<categoryId>` | 1 |
| other single instances | 1 |

Corpus census after the parser change: **1,835 supported, 24 unsupported** (was
1,730 / 129). All 24 remaining are force traversals. By terminus, 1,753 target
profiles and 106 target occurrences — 89 `category`, 15 `annotation`, two
`decrement` on cost or characteristic fields. The 17 non-category ones are all
blocked by their operation or field anyway, so the selections terminus is
effectively a category-only feature today.

### The blocker for execution

`evaluateRosterSelectionCategories` is **pass one** of the single-pass rule and
must run with no effective-category index in scope. Every one of these 89
selectors filters by a category ID. Resolving that filter needs exactly the
membership pass one is computing, so the naive routing would make every reached
occurrence's membership unknown — a display regression across many weapons, in
exchange for zero categories correctly added.

There is a way through, and it needs a decision rather than a guess. Four of the
five filter categories are granted **only** by static `categoryLink` and never by
any category modifier anywhere in the composed catalogue:

| Filter category | `categoryLink` grants | modifier grants |
|---|---|---|
| Attacks Dx Weapon | 412 | **0** |
| Damage Dx Weapon | 283 | **0** |
| Heretic Astartes Vehicle | 43 | **0** |
| Psychic Weapon | 155 | **0** |
| Vehicle | 508 | 5 |

So a filter category that no modifier can target is **modifier-immune**: its
membership is fully determined by static links, and pass one can resolve it
without consulting the index at all. The proposed rule for the next checkpoint:

> A routed category step whose filter category is modifier-immune resolves in
> pass one against static link membership. A filter category that any modifier
> targets stays unresolved, exactly like the seven existing cyclic cases.

That is provable from the composed catalogue rather than inferred, and it is
deterministic. It is still a new rule and should be landed as its own
checkpoint, with the immunity set computed once per context and the four
immune filters pinned.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **409 passed, 6 skipped (415 total)**.
- Pinned real-data suite — **6 passed**, including the updated census.

### Next recommended boundary

1. **Execute category `affects` routing** using the modifier-immunity rule
   above. Bounded and unblocked, but it is a new rule and not a mechanical
   reuse — budget for the immunity precomputation, the pass-one interaction, and
   a real-data pin on one of the four immune filters.
2. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil` — still
   blocked on the sign convention.
3. `replace` — still blocked on `arg` semantics.

The two product questions remain blocked on one New Recruit experiment:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — Category `affects` Routing, 2026-08-19

> **Partly superseded.** Its "relocated anchor" withholding and the
> `EVALUATION_CATEGORY_MODIFIER_ANCHOR_RELOCATED` diagnostic were removed on
> 2026-08-20 once New Recruit answered the question they were guarding. The
> modifier-immunity rule for category filters still holds.

Baseline `9f8b125`; resulting implementation commit `33e5f2b`.

### What executes now

A category modifier carrying `affects` is targeted by its selector rather than
by its declaring occurrence, so it leaves the own pass and is collected by a
routed pass that runs last. Steps record `origin: "affects"` and `declaredBy`;
neither `affects` nor `scope` counts against a routed step.

The traversal machinery moved to `packages/evaluation/src/affects-routing.ts`
(`reaches`, `routeFromDeclarer`, `passesThroughGroupDefinition`,
`affectsModifiers`, `hasAffectsModifier`). It sits above `selection-context` and
below both `categories` and `characteristics`, so neither imports the other. The
extraction was behavior-neutral — 409 tests green before and after, with no
assertion changes.

### Two things the previous handoff did not anticipate

**1. The filter collides with the single-pass rule.** Every corpus selector of
this shape filters by a category ID, and `evaluateRosterSelectionCategories` is
pass one: it runs with no effective-category index because it is what builds
one. Resolving the filter naively would need exactly the membership being
computed.

Resolved by **modifier immunity**. `modifierTargetedCategoryIds(context)` scans
every document's raw node tree for category modifiers and collects what they
target, memoized per context. A category nothing targets anywhere in the
composed catalogue has membership fixed by static `categoryLink` declarations,
so pass one decides the filter without the index and without guessing. A filter
category some modifier can change leaves membership unknown, exactly like the
seven existing cyclic cases. The scan covers whole documents rather than
roster-reachable choices, because a modifier on an entry this roster never uses
still disproves immunity.

Pinned on real data: `Attacks Dx Weapon` and `Damage Dx Weapon` are immune,
`Vehicle` is not.

**2. Owner-relative routing is vacuous for the entire corpus population.** All
89 category `affects` modifiers are declared on `upgrade` entries that have **no
descendant entries at all**, and all 89 also carry a `scope` (67 `model`, 12
`upgrade`, 4 `force`, 3 `root-entry`, 1 `parent`, 1 `roster`). Under the settled
owner-relative rule every one of them reaches nothing — not a plausible reading
of what the authors wrote.

The competing reading is that `scope` names the anchor and the selector
navigates from there. The 2026-08-17 research explicitly **corrected** an earlier
claim to that effect, concluding from the nr-editor's modifier panel that
`affects` overrides `scope`. That conclusion held for characteristic modifiers,
whose declarers are models that really do own the profiles the selector names.
It does not obviously hold here, and the corpus is evidence against it: 89 of 89
would be dead authoring.

Rather than pick, a selector that does not reach its own occurrence while a
scope names another anchor **withholds** the determination and emits
`EVALUATION_CATEGORY_MODIFIER_ANCHOR_RELOCATED`. Scope-free owner-relative
routing executes normally. The corpus population stays exactly as honest as it
was before — it was already incomplete via `unsupportedAttributes` — while the
settled rule becomes available where it applies.

*Methodological note:* the first audit that produced this finding was wrong. It
walked the node holding the `modifiers` array, which for a grouped modifier is
the `and` condition group rather than the owning entry, and reported 74 of 89
declarers as unnamed. Re-running against the nearest enclosing selection entry
gave the real answer. Worth remembering when auditing modifier ownership.

### Tests

Six synthetic tests: unfiltered routing to direct and group-nested descendants;
`entries` without `recursive` reaching the direct child but **not** the group
child, on a flattened roster where only the definition side distinguishes them;
an immune filter admitting only members; a non-immune filter withholding; the
relocated-anchor withholding; and the declaring occurrence no longer losing its
own determination to its own descendant selector.

Real-data pins: the immunity result above, and that all 89 corpus category
`affects` modifiers carry a scope — the shape the withholding rule keys on.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **415 passed, 6 skipped (421 total)**.
- Pinned real-data suite — **6 passed**.

### Next recommended boundary

1. **Settle the anchor question**, which is now the highest-value item because
   it gates all 89 corpus category modifiers and probably informs the 1,617
   characteristic modifiers carrying both `affects` and `scope`. It is a New
   Recruit experiment: take a character with an Enhancement whose modifier reads
   `add <category> affects="self.entries.recursive.<category>" scope="model"`,
   and see whether the character's weapons gain the category. If they do, `scope`
   relocates the anchor and the owner-relative rule needs qualifying.
2. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil` — blocked on
   the sign convention.
3. `replace` — blocked on `arg` semantics.

All three open questions are New Recruit experiments and can be batched:

- **Anchor relocation.** Does a `scope` on an `affects` modifier move the
  selector's starting point? (new, and the most valuable)
- **Sign convention.** On a `3+` save, does `increment 1` mean `4+` or `2+`?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — `affects` Anchoring, 2026-08-20

Baseline `bc85b5a`; resulting implementation commit `930d078`.

**This supersedes two earlier entries.** The 2026-08-17 research checkpoint's
"Precedence, not composition" finding, and the "relocated anchor" question in the
2026-08-19 category-routing entry, are both resolved by evidence below. Do not
follow their conclusions.

### The evidence

Stone built a Death Guard Lord of Contagion with the Virulent Vectorium
detachment and gave it the Furnace of Plagues enhancement. Result: **both
Manreaper profiles modified** (A and S shown as changed, Devastating Wounds
added to Keywords, weapon names suffixed with the enhancement), and the **Lord's
own Unit profile untouched** — M, T, Sv, W, LD, OC, InSv all unchanged.

Furnace of Plagues (`fc03-ee34-9e65-b5d0`) is `type="upgrade"` with **zero**
child entries, entry links, and groups. It is the Manreaper's *sibling*: both sit
in groups beneath the model. Under the owner-relative rule nothing it declares
could reach anything. Every one of its modifiers carries `scope="model"`.

So `scope` chooses where the selector stands and `affects` chooses where it
walks. They compose. The untouched Unit profile is a second confirmation:
`self.entries.recursive` names the anchor's *descendants*, and the anchor is not
one of them.

### What changed

`resolveAffectsAnchor` in `affects-routing.ts` resolves the anchor per modifier:
the declarer for an absent scope or `self`; `parent`; `root-entry`; and the
nearest ancestor-or-self of a named type for `model`, `unit`, `model-or-unit`,
and `upgrade`. `force` and `roster` name collections rather than one occurrence,
and a typed scope with no matching ancestor has nowhere to stand — both withhold
rather than silently no-op. `routeFromDeclarer` became `routeFromAnchor`.

Both evaluators use it, so this changed characteristic routing as well as
category routing — necessarily, since the confirming evidence is about
characteristic modifiers.

Because an anchor can be a shared ancestor, **any** occurrence can declare a
selector that reaches a given one. The routed collectors now scan the whole
roster in document order rather than the ancestor chain.

The `relocatedAnchor` issue and its diagnostic were removed; they existed only to
avoid guessing at this question.

### A second question answered for free

The same modifier dump decodes the `+0` bonus-slot idiom end to end, on one
entry, in execution order:

1. `append "+0"` join="" to weapons in `Attacks Dx Weapon` — opens the slot
2. `replace` arg="+0" to weapons already in `Attacks Dx+0 Modifier` — collapses a
   slot a previous source opened
3. `increment 1` position=-1 — bumps the digit after the `+`
4. `decrement 1` position=-1 for one excluded category
5. `replace` arg="+0" — removes the slot if the bonus ended at zero
6. `add category "Attacks Dx+0 Modifier"` — marks the weapon so the *next*
   source sees an open slot

This makes **`arg` the search term for `replace`** about as close to confirmed as
the corpus can get: steps 2 and 5 only make sense as "find `+0`, replace with
nothing". It also confirms `position: -1` selects the last numeric match. Both
were listed as open questions; `replace` is now plausibly unblocked, though no
one has watched a slot collapse in the app.

### Tests

Two synthetic tests on a new bearer/enhancement fixture pair: the enhancement's
selector reaches its *sibling* weapon, and does **not** reach the anchor's own
profile. The `affects-owner` fixture lost its `scope="parent"`, which had been
added specifically to assert the now-disproven override rule.

Real-data pin reproducing the screenshots: routed steps reaching the Manreaper
are all attributed to the Furnace of Plagues occurrence, and the Lord's own Unit
profile has none. The Manreaper's Keywords stay unresolved because that append
carries `position` — the anchoring is what the test pins, not the value.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **417 passed, 7 skipped (424 total)**.
- Pinned real-data suite — **7 passed**.

### Useful for future sessions

New Recruit publishes every catalogue entry as a browsable web page, keyed by the
same entry id the corpus JSON carries:
<https://www.newrecruit.eu/wiki/wh40k-11e/warhammer-40%2C000-11th-edition/chaos---death-guard/fc03-ee34-9e65-b5d0/furnace-of-plagues>

It shows an entry's own rendered text. Effects that only appear once an entry is
attached to a bearer still need a built roster to observe.

### Next recommended boundary

1. **`position` support**, which is now the single highest-value item. It gates
   the `increment`/`decrement` steps of the idiom above and the Keywords append
   that Stone can see working in New Recruit but this evaluator still withholds.
   Semantics are known: 1-based index of the match within a value, negative from
   the end, `0` meaning all.
2. **`replace`**, using `arg` as the search term. Strongly evidenced above.
   Together with `position` this would light up the whole `+0` idiom.
3. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil` — still
   blocked on the one remaining experiment.

Only one open question is left for New Recruit:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.
## Completed Assignment — Lexical Arithmetic, 2026-08-20

Baseline `8f1913d`; resulting implementation commit `03376af`.

**This resolves the sign-convention question that three earlier entries recorded
as blocking.** It was answered from the corpus, not by experiment.

### The sign convention

`increment` and `decrement` are **plain signed arithmetic on a number inside the
value**, with no game-aware inversion. `4+` decremented is `3+`; `-1`
decremented is `-2`; `D6+0` incremented at the last match is `D6+1`.

The question was whether `increment 1` on a `3+` save means `4+` (arithmetic) or
`2+` (improvement). Three independent lines of corpus evidence say arithmetic:

| Evidence | Count | Reading |
|---|---|---|
| `decrement` on inverted characteristics (`Sv`/`WS`/`BS`/`LD`) | 60 of 64 | owners are upgrades — *Kabalite Trueborn*, *Spotter*, *Force weapon*. Plain arithmetic makes these improvements. |
| `increment` on the same | 4 | includes *Gene Affliction* raising BS and WS. Plain arithmetic makes an affliction a penalty; the inverted reading would make it a bonus. |
| `decrement` on `AP` (written negative) | 44 of 70 | owners are *Neverblade*, *Razor Claws*, *Cursed Fang*. Signed arithmetic takes `-1` to `-2`, the improvement those names imply. |

The two families point the same way and the `increment` cases point the same way
in reverse, which is what makes this more than a majority argument.

The structural argument agrees independently: `affects` is a New Recruit
extension and New Recruit is generic over arbitrary game systems. Characteristic
types are catalogue-defined data, so nothing tells it that `Sv` is roll-under.
It has no basis for a game-aware inversion, and authors pick whichever operation
produces the right digit.

**Confirmed by experiment, 2026-08-20.** Stone gave a Genestealer Cults
Patriarch the *Gene Affliction* battle scar in New Recruit:

| Stat | Before | After | Data operation |
|---|---|---|---|
| T | 5 | **4** | `decrement T by 1` |
| WS | 2+ | **3+** | `increment WS by 1` |

Both changed for the worse, as a battle scar should, and the data reaches that
with *opposite* verbs. That is only possible if the operation acts on the digit.
The prediction written before the test was exactly this, so the rule is now
observed rather than inferred.

(BS was not observable — a Patriarch carries only melee claws, so no BS is
displayed. WS is the same inverted family and settles it.)

### `position`

New Recruit's editor documents it as the 1-based index of the match to affect,
negative from the end, `0` meaning all. The pinned corpus writes only `-1` (148
arithmetic modifiers) and `1` (3 replaces), plus 5 malformed `""`.

When `position` is **absent** the default is not established. Rather than guess,
a value with more than one number is refused (`ambiguousPosition`); a value with
exactly one number needs no default, because every reading picks the same match.
That covers most real stat lines — `8`, `4+`, `-1`, `24"` — so the refusal is
narrow. Values with no number at all (`-`, `N/A`, `Melee`) are refused with
`noNumericMatch`, malformed positions with `unsupportedPosition`, and non-integer
operands with `nonIntegerOperand`.

A numeric match is `-?\d+`, so the sign travels with the digits. That is what
makes `AP -1` behave and what keeps `D6+2` a two-match value.

### Corpus reach

614 characteristic modifiers are `increment`/`decrement`. 161 characteristic
modifiers carry `position`: 101 `increment -1`, 47 `decrement -1`, 4 `append -1`,
4 `increment ""`, 1 `set ""`, 4 `replace`.

### Tests

Two synthetic tests on new fixture profiles: positioned arithmetic on `D6+0` and
an inverted `4+` save; and the three refusals. Existing fixtures that used
`increment` as a stand-in for "unsupported operation" were switched to `floor`,
which is still unsupported, so those tests keep their meaning rather than being
rewritten around the new behavior.

Two real-data pins now show stat lines changing:

- The Death Guard Helbrute's **Power scourge** goes Attacks `8` → `10`, while
  the *Close combat weapon* outside the filter category keeps its printed `5`.
  Same operation, different answer — which is what makes the category filter
  observable.
- The Lord of Contagion's **Manreaper** gains the +1 Strength visible in Stone's
  New Recruit screenshot. Its Attacks stays unresolved, because the bonus-slot
  idiom's `replace` steps are still unsupported and a partly-applied value is
  still refused.

`docs/diagnostics.md` was missing the three `APPEND_` codes from the earlier
append checkpoint; they are added here alongside the four `ARITHMETIC_` ones.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **419 passed, 7 skipped (426 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **`replace` using `arg` as the search term.** This is the last piece of the
   `+0` bonus-slot idiom. With it, the Attacks values still withheld on real
   weapons resolve, and the mechanism the last three checkpoints kept circling
   finally closes. Evidence for `arg` is in the 2026-08-20 anchoring entry.
2. **`position` on `append`** — 4 corpus instances. New Recruit visibly applied
   one with `position` present and no positional effect, and the editor does not
   offer `position` for `append`, so it looks inert there. Small and evidenced.
3. **`floor`/`ceil`** — need a bound rule, a different shape from the arithmetic
   landed here.
