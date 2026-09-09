# World Eaters warning repair QA — 2026-09-09

Baseline: `d474d6904735bf3d23bdb3cb3676d17f73e1a3e2`, branch
`codex/list-builder-ui-overhaul`. Corpus: 46 JSON documents at immutable
`04c62fcd041b3808c39d5c46fd677c704027b979` in gitignored
`E:/GitHub/wh40k-11e`. No third-party bytes were changed or committed.

## Findings and decisions

1. Slaughterbound `71c9-b10b-b55f-483e`, Leading association
   `4e70-b32e-d8c6-b5fe`: Deep Strike link `9e4f-353b-6139-6020` and Scouts link
   `957b-d56f-c0fd-ae5b` hide when fewer than one directly associated Possessed
   (`3d1c-7f16-1489-fac3`) exists. Counting the owner itself, model quantity or
   all roster units would be wrong. The saved edge supplies the counterpart.
   Unattached means both links hidden; an eligible Eightbound attachment makes
   both visible. Rule name modification (Scouts suffix) remains separate.
2. Eleven unresolved World Eaters root visibility queries compared a force-owned
   `scope=force` selection identity against Crusade Force `cac3-71d1-ea4b-795d`.
   The evaluator only accepted a selection owner, despite already having the
   exact force occurrence. The force-owner path now uses that same identity test.
3. Three inactive roots generated five suppressed-bound diagnostics. Ordinary
   gated groups on Jakhals/Goremongers include numeric max-six changes plus an
   unrelated primary-category change. Live bound inspection now evaluates the
   applicable numeric steps in inherited order; it does not execute the unrelated
   category operation as a bound. Static grouped seeding remains conservative.
4. Slaughterbound self-cost constraints `f057-dbb8-c402-8240`,
   `23ff-3102-414e-ae76`, `b177-e41a-0f84-eb25` are Battle Honours max-six and
   Weapon Modifications min/max-zero. Raw corpus measurement found 3,958 self-cost
   constraints in 31 documents: 1,319 each of those three families plus one extra
   Battle Honours descendant-count variant. Reusing exact cost observations fixes
   these fields without hiding campaign currencies. Wider cost scopes remain open.
5. Category Docked Vehicle `bdc8-7127-287c-a267` had a min-zero with one direct
   conditional set-one and an unrelated unmodified max-one. A blanket definition
   modifier guard falsely tainted both. Direct modifiers now use the existing
   applicability evaluator; only groups targeting the exact bound stay unsupported.
6. Browser add-Angron also exposed two pre-existing initializer warnings in Mighty
   Champions `f842-6e90-bc5a-80f1`: nested Nachmund Gauntlet and Armageddon Crusade
   Abilities, minima `2ae1-2126-75d9-62ee` / `8132-2831-4549-7a70`. Their static
   descendant minima are zero. No selection is required under either interpretation
   of descendant counting. Only that static zero/traversal-only warning is deferred;
   modified/positive minima, other unknown properties and live checks stay guarded.

Source semantics were checked against the pinned corpus and pinned primary docs:
[New Recruit associations](https://raw.githubusercontent.com/giloushaker/nr-docs/4b93391d049b42f480851af125639cf1ce9d13a3/guide/concepts/associations.md),
[editor query controls](https://raw.githubusercontent.com/giloushaker/nr-editor/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Query.vue).
The raw corpus has 341 association condition leaves; this is not a claim that all
341 are supported. No fresh interactive New Recruit comparison was performed.

## Validation

Synthetic tests cover incoming/outgoing exact endpoints, no-edge zero, distinct
counterpart counting, model amounts, duplicates, stale keys/endpoints, unsupported
definitions, model targets, malformed flags/children and transitive query rejection.
Root-group tests cover inherited gating/order and unknown applicability; self-cost
tests cover own/descendant versus sibling totals, min/max, effective modifiers,
zero currency, unknown values/types, absent base costs and malformed quantities.
Existing uncertainty UI fixtures now explicitly request unsupported transitive
association traversal, rather than using newly supported direct counts as a proxy.

Pinned integration: all four suites pass, 23 tests. World Eaters assertions check
Slaughterbound's three exact zero-cost bounds, no root-summary warnings, no blanket
category modifier warnings, attach/remove rule transitions and Angron initialization.
The Aeldari regression now expects complete structural inspection and the three
resolved self-cost bounds, while retaining five unsupported field diagnostics,
five unsupported constraint-attribute diagnostics, three condition-attribute
diagnostics and one numeric applicability diagnostic. Its two real violations are
missing Character and Warlord (the latter added by the previous checkpoint).

Browser QA used isolated origin `http://127.0.0.1:5210/app/`, actual narrow panel
viewport 518×893, and the seven-document World Eaters dependency closure loaded
through the repository picker. Created Angron + Slaughterbound (430 points): all
reported warning cards absent; 51 structural bounds satisfied, three missing
configuration bounds violated, zero unresolved; 28 constraints satisfied, the
unconfigured points limit violated, zero unresolved. Actual configuration problems
were intentionally retained. Slaughterbound's unattached card has neither special
rule nor an applicability warning. Adding/attaching Eightbound exposes both rules
without uncertainty. Save → reload → reopen preserves this; detach removes the
rules, Undo restores them, Redo removes them. Re-adding Angron after the zero-minimum
repair emits no initializer warning. A fresh browser tab reopened the 430-point
saved draft and its Slaughterbound card with zero warning/error console entries.
Earlier development-only Vite missing-module cache errors were cleared by restarting
the isolated QA server after new helper files were created; they were not ignored
in the fresh-console check. This is browser QA, not physical iPhone/Safari testing.

## Remaining boundary and review

No diagnostic UI suppression, force-limit override, tree reparenting or source-data
rewrite. Incoming association capacity/category classification, general attached
effects, required/multiple/shared-link associations, transitive queries, rule
name/text changes and modified negative/unlimited root-bound semantics remain open.
Attached rosters still correctly carry aggregate compatibility uncertainty.

The isolated native worker investigated the source shapes, supplied the four-file
cost lane and independently reviewed the integrated candidate. The lead reviewed
and integrated the diff, fixed stale-assignment and malformed-cost guard findings,
and reran validation. External Claude review was blocked before execution because
private-source disclosure was not authorized for this task; no source was sent.
The native review found no remaining actionable issue in the final additions.
Review worktree `C:/CodexACLTest/rf-world-eaters-warnings-20260909` is retained.
Final full-gate counts, commits and publication evidence are in `agent-handoff.md`.
