# Conditional creation and completed army — 2026-09-11

Second independently reviewable checkpoint, baseline `c605061` (first repair
`4a30b9f`), selected `codex/list-builder-ui-overhaul`. First checkpoint CI
**34621277621**, exact SHA `c605061f236747c40d72422b7ef697ebc55b5be4`, succeeded.

## Separate mechanism

The structural issue was unsupported descendant counting on current selections.
This issue was missing prospective creation context: static planning could not
determine a conditional minimum before the parent/siblings existed. It was not
an ignored default. Static planning still handles required entries, explicit
group defaults and pending alternatives.

A `04c62fcd041b3808c39d5c46fd677c704027b979` and captured B
`5b261ec423d5d017bb733c4f3c0a760b085d5ca5` remain separate immutable eight-file
BSData/wh40k-11e closures. Integration checks reverify revisions, byte lengths,
SHA256, Git blobs and dependency IDs. No acquisition pin, third-party bytes or
existing saved armies changed.

Intercessor root `8da0-4570-c3c-819f`, group `e371-90b3-5640-949`: min5
`45fe-55b5-82d2-906`, max10 `bb0b-ffb5-17e3-45b5`, no default. Sergeant
`8ea3-b125-7273-5ffb` requires one. Ordinary `420-464f-93cb-e019` has parent/shared
min4 `f374-3874-5382-40ee`, max9 `77bf-35d2-a671-e590`. Its **own** min modifier
decrements one when at least one launcher `d735-eafd-a8de-fa80` exists; its own
max decrements per launcher. Both queries name the containing root ID and shared
selection identity. No sibling-authored modifier is involved.

After static seeding, launcher absent determines four ordinary models; launcher
present determines min3/max8. Each model has an independent occurrence and normal
required equipment. A minimum determines quantity for that required entry, never
permission to pick arbitrary group alternatives.

## Bounded contract

Only own direct min/max modifiers querying uniquely identified non-conditional
siblings in the same parent are admitted. Self/any targets, dependency chains or
cycles, unknown queries, dynamic automatic query targets, grouped modifiers, dynamic visibility, stepped amounts,
ancestor-carried limits, ambiguous aliases and unsupported capacities remain
pending. Conditional minima nested inside automatically seeded child subtrees
are not recursively expanded by this new step. Explicit addition of a new
parent uses the same creation boundary. No unrestricted fixpoint evaluator.

One static seed, at most one conditional augmentation, then verification against
the updated immutable state. Group capacities are checked jointly. Changed
limits, invalid final quantities or exceeding the shared4,096-descendant budget
fail the entire command: no partially augmented roster/history snapshot escapes.
Source-path inspection is bounded to4,096 items/128 levels. Conditional entries
cannot be queried dependencies of other conditional entries. Only an exact,
uniquely attributable static warning is removed after verified resolution.

Later removal, amount edits, duplication and restoration do not rerun the new
step. Existing source-flagged automatic reconciliation stays separate. No model
consolidation, persistence rewrite, scalar-prop or source-provenance regression.

## Regression and review evidence

With the new command step disabled: four synthetic failures (missing ordinary
models), four pending/unsupported cases already pass. Enabled: eleven passing cases
cover absent/present launcher, linked definitions across child buckets, unknown
conditions, self-cycle, conflicting bounds, no-default ambiguity, joint group-cap
rejection, atomic budget rejection, dynamic automatic targets and removal/duplicate/history/restoration.
Independent IDs/amount representation and each model's equipment are asserted.

A/B tests assert five initialized models including four independent ordinary
occurrences, then adapt the legacy amounted-price setup by removing those models
before constructing its special representation. Both verify launcher-present
min3/max8 and five/ten/five pricing. Knights/Impulsor and Supporting cases remain.

Authenticated read-only Claude Code Sonnet5 review confirmed context, dependency
exclusion, atomicity, budget and player-choice preservation. Added an explicit
fail-closed capacity guard for unresolved siblings, joint group-cap test and
shared budget constant in response. Earlier identity checks already reject the
ordinary unresolved-sibling case; the capacity fold is independently conservative.
Only relevant source/sanitized evidence shared, no personal armies or source
datasets wholesale.

Final gates: **715 passed /30 skipped**, **79 passed /6 skipped files**,14.12s;
lint/typecheck/build/whitespace pass. Renderer timing regression unchanged and
passing. Final optional two-file corpus run: **25 passed**, zero failed,40.58s;
full46 documents/36 selectable closures retained. Earlier timed report (35.27s,
before the conservative automatic-target guard) is local at
`C:/CodexACLTest/rf-conditional-corpus-20260911.json`.

Work: ordinary min/max needs two temporary bound probes per inspection, four
across planning/verification, no convergence passes or original-byte copies.
A/B combined creation/pricing/history probes:1,842.80ms/1,028.44ms, including
source import and subsequent edits, not isolated microbenchmarks. Ten fictional
tests31ms (eleven-case final focused run also31ms). Existing build-size advisory
retained (814.74kB), not suppressed. The final guard refuses targets whose
automatic entry/group limits may change in the existing post-command reconciler;
it does not extend reconciliation or add another iteration.

## Ordinary browser acceptance

Own isolated Vite `http://127.0.0.1:5244/app/`, tab7, frozen A through file picker.
Existing5243 saved army and owner5242 tab/storage/servers preserved. New draft
**QA conditional creation**,193 selections,13.6MB shared closure. Console warn/error
list empty. Locator errors were resolved through DOM inspection, not app crashes.
Configuration: Strike Force2000, Gladius Task Force, Priority Assets.

| Selection | Source-derived points and final loadout |
| --- | --- |
| Captain |100: Warlord, Artificer Armour20; default bolt pistol/master-crafted bolter/close combat |
| Lieutenant |45: default pistol/master-crafted bolter/close combat; Supporting to first Intercessors |
| Intercessors5 |80: sergeant Power fist,3 ordinary,1 launcher |
| Intercessors10 |150: same sergeant,8 ordinary,1 launcher |
| Knights5 ×3 |240 /240 /260: each4 maces and1 Great Weapon master |
| Hellblasters5 |110:1 sergeant with manually chosen Bolt pistol,4 ordinary |
| Assault Intercessors5 |75: default sergeant plus4 ordinary |
| Heavy Intercessors5 |100: default4 ordinary plus1 sergeant |
| Impulsor |70: Hull, Bellicatus Missile Array,2 Storm Bolters |
| Redemptor |195: Fist, Heavy Onslaught, Heavy Flamer, Twin Fragstorm |
| Gladiator Lancer |160: Lancer Laser, Hull,Two fragstorm grenade launchers |
| Whirlwind |175: Vengeance Launcher, Armoured Tracks |
| **14 units** | **2,000**, no override |

New Intercessors start1 sergeant/4 ordinary, no initialization warning. Remove
one: four models and a genuine missing-model requirement, no refill. Add launcher,
choose Power fist, duplicate and expand second squad10. Five→ten→five costs
80→150→80; restored second10 for final ledger. Earliest Knights delete1,740 with
remaining240/240; undo2,000, redo1,740, undo2,000.

Remove Captain Warlord: category minimum0/1 violated, local structural cap remains
satisfied. Undo restores. Also choose Lieutenant Warlord: category maximum2/1
violated; undo restores Captain only. Supporting adds exactly one Lethal Hits and
one attribution to each of17 first-squad weapon rows. Detach removes it; retarget
second squad adds there; restore first. Knights cards retain recorded stats,
mace Anti-Monster/Vehicle4+, master Devastating/Sustained, Inner Circle, Attached
Unit, Teleport Homer, Deep Strike and Oath.

Save, leave via Change roster setup, reopen by name:193 selections,14 units2,000,
first Supporting target pressed/second unpressed, Captain Warlord and all loadouts
preserved. Final structural **238 satisfied /0 violated /0 unresolved**;
constraints **378 /0 /0**. No remaining uncertainty in these two checked domains.

## Remaining honest qualification

Overall visible coverage **remains incomplete**, despite zero known violations.
Three excluded zero-valued `pl` costs name missing type `c5fb-5b9b-89f6-86c`:
shared Warlord, Captain default loadout `c6aa-b3a5-4ff3-e0d3`, Gladius
`d2dc-693e-b491-b16d`. Three `EVALUATION_COST_TYPE_MISSING` diagnostics remain.
These unchanged source metadata omissions are not either repaired mechanism; no
guessed definition or suppression. Supported points remain2,000. Blanket complete
legality remains blocked by this qualification and broader documented boundaries.
Scope ends here: no general audit, UI, source migration/acquisition or StarCraft.

The subsequent owner-authorized [orphan-cost investigation](orphan-cost-references.md)
verified the complete pinned repository and equivalent acquisition/import/reopen
paths. It established a bounded source-data limitation, not an RF repair; the
warnings and overall coverage qualification remain intentional.
