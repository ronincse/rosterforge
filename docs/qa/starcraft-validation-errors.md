# StarCraft authored requirements repair

Historical baseline: `c5a04c9b0c88f748faca765f79e614c1e416bf34` on
`codex/starcraft-pilot`, clean and upstream-equal after fetch. Remote main remains
`bac89b7ed92b088d270e0287c4893ff47d53d04e`. Original checkout and main worktree
are unchanged. Frozen data remains `99261754e0449bbaaa04e6890e1625b144f9ece1`;
the optional regression verifies all four recorded SHA256 values. Historical
`starcraft-pilot-baseline.md` is preserved as pre-repair evidence.

## SC-01 implementation

Force-owned direct add-error modifiers use existing conditional applicability.
Force/roster static resource queries now admit force owners, preserving traversal,
exact queried type, signed values (including ordinary -1) and uncertainty. A
separate authored-error finding enters aggregate validity/completeness and the
problem dialog exactly once per modifier and force. Messages are plain text.

Fictional regressions cover positive/zero/negative/repair, restoration, unknown
resource/condition/scope, malformed or unsupported operations/messages, queried
cost modifiers, groups/repeats, independent messages and inactive errors. The
hashed real Protoss negative-Core regression now expects invalid/complete and
exactly the authored Core message; removing the second Zealots repairs it.

Grouped error execution, other operations/owners/scopes and modified queried
cost totals remain withheld. No budgets, reinforcement, XML, reference metadata,
freshness or source data changes. Browser acceptance and SC-02 results are recorded below; this is bounded
requirement support, not full StarCraft acceptance.

SC-01 gates: 737 passed / 31 optional skipped, 82 passed / 7 skipped files,
10.45s; lint/typecheck/build/whitespace pass. Configured corpus 28 passed in
4 files, no skips,34.63s (27 existing40k +1StarCraft); 40k HEAD verified
04c62fcd041b3808c39d5c46fd677c704027b979. Build819.81kB retains existing advisory.
Native independent review found an unknown nested-condition envelope omission;
lead added a recursive guard before active/inactive classification and new
adversarial tests. Reviewer approved the corrected candidate. Claude launcher
failed before review, so no external findings claimed.

## SC-02 implementation and source boundary

SC-02 began clean/upstream-equal at eab0663853e2cfc77797a927507c8905e0d26d29.
Static shared parent min/max selection bounds now count effective category members
in the owning force. Definition-owned bounds require a unique category and resolved
force-category context, run once per force rather than per selected member, and
retain their definition source. Link-owned bounds retain their actual link source.
Repeated occurrences/amounts and distinct links to shared entries all contribute;
other categories/forces do not. Omitted child-selection traversal counts roots;
explicit true counts descendants within that force. No general multi-force UI.

The three frozen faction min/max pairs now report missing/one/two/remove as
violated/satisfied/violated/satisfied in the configured production-API regression.
Protoss and Terran own the bounds on definitions; Zerg owns them on its force link.
There is no duplicate definition finding for Zerg. A test lookup originally chose
a hidden Terran unit named Raynor&apos;s Raiders instead of the identically named
faction. Exact category-qualified choice identity fixed the test; no production
identity bug or source repair was inferred from a label collision.

13 fictional cases cover individual min/max and combined exact-one limits,
amounts, repeated shared aliases, unrelated categories, parent/descendant domains,
separate force instances, missing or ambiguous identity/context, unknown membership,
unsupported modifiers/flags and link-vs-definition ownership. Parent shared=false
or omitted, child-force traversal, percent/unknown shapes and limit modifiers
remain unresolved. Unsupported parent modifiers are retained without executing
their condition/arithmetic in an invented category context; the limit shown is
only the authored base. Prior roster-scoped direct modifier support is unchanged.

## Browser acceptance (2026-09-14)

Fresh origin http://127.0.0.1:5273/ serves this pilot worktree, preserving original
5271 saved diagnostics and all other worktrees/origins. Every scenario started via
normal pinned Browse/index/load/create; no storage/state injection. Three catalogues
report zero import diagnostics and revision13, at the unchanged recorded pin.

| Scenario | Observed result |
| --- | --- |
| Protoss empty | 1 known problem: Faction, 1 more selection required; observed0/limit1 |
| Add Daelaam | 0 known violations |
| Add Khalai | 1 known problem: Faction, 1 selection over maximum; observed2/limit1 |
| Remove Khalai | 0 known violations |
| Daelaam + one Zealots | 160 Minerals, Core1; no authored error |
| Duplicate Zealots | 320 Minerals, Core-1; exactly one Not enough Core Supply. problem |
| Save, reload, ordinary shelf Open | Same authored problem and 11 selections restored |
| Remove second Zealots | Error disappears; 160 Minerals/Core1; autosaved7 selections |
| Terran empty/Armed Forces/Raynor faction/remove extra | Known faction violations1/0/1/0; detail counts0/1/2/1 |
| Armed Forces + four Marines | 640 provisional Minerals/Core-1; exactly one Core error; some rules not checked remains |
| Remove fourth Marines | 480 provisional Minerals/Core0; Core error clears; cost coverage remains limited |
| Zerg empty | 1 missing-faction problem; force-link section correctly shows0/1 required |
| Zerg Swarm + Zerglings | Faction1/1, 180 Minerals/Core2, twelve independent models;0 known violations |

Protoss/Terran states exercise ordinary duplicate/remove actions. Zerg excess and
repair were verified in the configured API test; browser coverage is missing/one
faction plus ordinary unit state, not full faction acceptance. All three armies
are saved at5273 for owner testing. The server is deliberately left running at the
owner's request; browser viewport reset after checks. Captured console warn/error
list empty. No screen-reader/device/print/New Recruit equivalence claim.

At390x844 the authored error and faction maximum text wrap within the dialog,
with Close/Review readable; at1440x900 the authored message is readable. Existing
UI reused; no redesign. Screenshots remain local at
C:/Users/stone/.codex/visualizations/2026/09/12/01a09368-161b-7c60-a3c6-b0afa598b7de/
(sc01-phone.png,sc01-desktop.png,sc02-faction-phone.png,sc01-terran-incomplete.png).

## Shared regression and newly exposed uncertainty

Configured StarCraft plus pinned40k:28 passed in4files, no skips,36.70s. The27
existing40k cases protect reference-army composition, repeated-unit pricing,
Supporting/connected effects, structural/category/force checks, orphan costs and
conditional initialization. Standard tests also cover renderer timing safety,
persistence/recovery/save/reopen and existing phone/reference presentation.

Collecting previously skipped category-definition shapes exposes nine additional
unsupported bounds in the pinned Guardian Defenders test context. They are six
currency bounds (Tyranids, Drukhari, Astra Militarum, Heretic Astartes, Legiones
Daemonica, Adeptus Mechanicus; queried ID51b2-306e-1021-d207), plus Imperial Knights,
Crucible and3DP Detachment selection bounds. Eight scope=force, one scope=roster;
seven base values=-1, remaining3/1. All remain unresolved, with no invented
violation. Exact names/fields/scopes/values and nine shape diagnostics are now
asserted. The old test already remained incomplete for other applicable behavior;
this change makes the omitted source requirements explicit. This is a new coverage
finding, not implementation of category-owned cost/force bounds. No broader40k
audit or game-data update was performed.

Independent native reviewer approved both checkpoints in a dedicated worktree;
SC-01's unknown-source-envelope blocker was fixed with tests. SC-02 review's
provisional-limit concern was addressed by withholding parent modifier execution.
Claude launch unavailable, no external review claimed. Lead reviewed the diff and
ran the gates. SC-01 code39b2009 plus handoffeab0663 published; exact handoff CI
34858488003 passed. Code-only run34858409481 was superseded/cancelled by handoff CI.
Final SC-02 gates:750 passed /31 optional skipped,83 passed/7 skipped files,
12.10s; lint/typecheck/build/whitespace pass. Build820.22kB/gzip226.81kB retains
the existing size advisory. Final commit/CI are in the completion report and handoff.

## Remaining scope and recommendation

No SC-03 budgets, SC-04 reinforcement, XML entity handling, reference metadata,
formatting/freshness/source update, PR or main integration. Gas210/default200 still
produces no known budget violation, default limits remain unenforced and limit::
queries unsupported; Marines reinforced6/230 is preserved as an unrelated failure
reproduction. Terran source orphan types and revision metadata mismatch remain.
Recommended next checkpoint is SC-03/07 default budgets and limit queries/resource
summary, only after a new owner assignment. Category-owned40k force/cost limits
need their own source-driven follow-up. Stop after SC-01/02.
