# Owner-feedback batch completion — 2026-09-28

Baseline a82c78c; only codex/starcraft-pilot. Separate checkpoints:

| Checkpoint | Implementation | Evidence |
| --- | --- | --- |
| A print presets | e7910b7; lint-only test follow-up ecda707 | [Preset reproduction](owner-feedback-presets.md) |
| B automatic balances | e41a716 | [Accounting and presentation](automatic-resource-presentation.md) |
| C latest snapshot acquisition | acb7232 | [Acquisition contract](latest-source-acquisition.md) |
| D explicit game-size pairs | b742143 | [Publisher evidence and presets](starcraft-game-size-presets.md) |

Owner's actual two downloaded HTML files are preserved byte-for-byte. They differ
only by layout class, contain two maps and three army units. Paired final Letter
PDFs are8/8pages with unit starts4/5/6 versus5/6/7. Fictional pair1/4pages is the
decisive counterexample. Every one of21pages was visually reviewed. No pagination
repair was justified; continuous screen preview is now clearly explained.
No blanket owner-layout approval, physical printing or publisher-map certification.

Additional normal-control browser acceptance at isolated5305: new Nerazim army,
two maps Acropolis/Breach and missions Frontlines/Hold Position. Compact->Sheets
->Compact generated DOM snapshots have corresponding body classes, two images,
and enabled SaveHTML/Print after settlement. Production Blob-download tests
inspect contents in both directions; delayed-image preset test prevents stale
authorization. Owner's supplied actual downloads were rendered and inspected;
this run does not claim a newly observed OS download or native print dialog.

Cold latest acquisition resolves445a410f; warm acquisition reports already at
checked snapshot, metadata hit; reload retains chosen445a410f alongside configured
baseline99261754. 40k card remains04c62fcd. Old Feedback - Old Protoss reopens
with recorded99261754,480M/0G, independent default2000/200 and original faction
arithmetic after refresh. New Feedback - Nerazim Latest reopens with445a410f,
Nerazim/Zeratul,230M/0G, explicit2000/200 budgets, two maps/two missions and zero
known supported violations. Its rule/model content remains visible. This is
bounded supported checking, not certification of full game legality.

Fresh B journey used no counter maxima: Daelaam and consumers yield Core0;
Gateway adds Core1/EN1 and25Gas, removal reverses it. Another Zealot unit yields
Core-2 and authored supply error. Undo/redo/repair and faction replacement behave
coherently. D explicit Skirmish applies1000/100; custom1500/73 survives independent
edits; Standard applies2000/200 and one undo restores both previous values.

Phone390 resource/preset controls visually inspected and readable. Desktop1280
DOM has scrollWidth1265 with controls inside viewport; IAB screenshot captures
only a cropped host area, so no full-width desktop screenshot acceptance claimed.
Viewport override reset. Disposable new tab retained; original5303 tab/storage,
owner HTMLs, other worktrees and servers preserved. Both5303 and5305 remain running.

Independent isolated native A/PDF/B/C/D review found no remaining blocker. Review
suggestions added image-layout race coverage, qualified contribution wording,
retained closure diagnostics and tested a complete index with missing dependency.
Another isolated native delegate supplied the pure preset module/tests; primary
lead reviewed/integrated and owns controller/UI/acquisition and final gates.
Prior Claude OAuth failure was not retried; no external-provider review claimed.

Normal suite1159passed/36optional skips,124files,28.09s. Configured1195passed/
zero skips,124files,63.92s. These populations overlap. Configured old40k JSONA,
A/B snapshots, oldStarCraft XML, new445a410f XML and saved Dark Angels reference
all execute. Includes renderer timing, initialization, pricing, Supporting,
history/recovery, reference/map security/readiness and explicit budget checks.
Lint/typecheck/build/whitespace pass; final build207modules, JS1083.56kB,
CSS85.76kB, existing bundle advisory. Final spacing-only CSS checked again with
lint/typecheck/build. Raw logs/private browser/PDF artifacts remain outside Git
at C:/CodexACLTest/owner-feedback-20260928/.

No source fixture rewrite, old-army migration, dynamic/cyclic limits, imported
format expressions, in-game tracking, main integration or wider audit. Existing
precedence/routing, orphan-cost, source-revision and evaluator-support
qualifications remain. Final owner print-layout acceptance remains pending.
Final handoff follows separately; publication response records exact-final CI.
