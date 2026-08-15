# RosterForge — Review Findings And Revised Work Order

This document is a response to the handoff summary you produced. It was written
after an independent audit of the workspace and of the pinned corpus at
`E:\GitHub\wh40k-11e` (commit `54c189f4fd01878351fab05586d3b38d9c7f6ddc`).

Treat it as a correction to the "Planned Next Work" section of your summary, not
as a replacement for the project's engineering rules. `AGENTS.md` still governs:
one bounded task per session, focused tests, diagnostics, documentation updates,
and all four checks passing before a task is complete.

## Current Status — 2026-08-14

Tasks 1 through 6 below, the first bounded Task 7 presentation-export
checkpoint, and the first three Task 8 checkpoints — profile modifier
projection, headless characteristic-display evaluation, and its workspace
presentation — are complete. The current
normal suite passes 366 tests with four skipped, and the pinned real-data suite
passes all four tests.
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
`unroutedModifiers`, diagnosed, and make the report incomplete. Scoped
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

The open decisions from the previous checkpoint are unchanged and each remains
its own bounded task. In rough value order:

1. **Profile visibility.** 154 profile-owned `hidden` modifiers currently force
   every affected characteristic report incomplete. This is the cheapest way to
   reduce noise, and `evaluateRosterSelectionVisibility` already establishes the
   Boolean `set` pattern to follow.
2. **`affects` retargeting**, which unlocks the other 1,257 characteristic
   modifiers but needs a real decision about profile families and recursive
   entry traversal before any code.
3. **`category` modifiers** (892, 99.8% decidable), which drive dynamic
   keywords.

Do not bundle these. `name` modifiers remain last despite their raw count,
since 86% are Crusade rank labels.

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
