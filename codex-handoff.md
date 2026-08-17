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
checkpoint, and eight Task 8 checkpoints — profile modifier projection,
headless characteristic-display evaluation, its workspace presentation, profile
visibility, `affects` selector parsing, category-entry information projection,
effective category membership, and the category-condition honesty fix — are
complete. The current
normal suite passes 395 tests with five skipped, and the pinned real-data suite
passes all five tests.

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

### Next recommended boundary

1. **`affects` execution** — three semantic decisions from the parsing
   checkpoint, plus how `affects` composes with `scope` (1,617 modifiers carry
   both). The plausible reading is that `scope` picks the anchor occurrence and
   the `affects` path navigates from there, but that is an inference.
2. **`set-primary` semantics** — one of two things still blocking the remaining
   20 categories. Needs a source outside the data.
3. **Surface effective categories in the workspace** — unit cards could show
   effective keywords, which is now backed by a proven evaluator. Presentation
   only, no new semantics.
