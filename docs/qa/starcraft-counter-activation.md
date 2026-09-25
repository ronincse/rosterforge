# StarCraft source-default counter activation — 2026-09-25

**Resolved for the evidenced source shape.** Baseline `87f04a84e5fd573246dab7e25bc11f0e76fca3fb`, branch `codex/starcraft-pilot`. The seven frozen StarCraft counters have known inactive source maxima, not active zero caps. Explicit player zero remains an active maximum. This does not complete StarCraft game/reference support.

## Evidence and decision

All original manifests were checked by length and SHA-256: StarCraft `99261754e0449bbaaa04e6890e1625b144f9ece1` (four XML files plus README), 40k A `04c62fcd041b3808c39d5c46fd677c704027b979` and B `5b261ec423d5d017bb733c4f3c0a760b085d5ca5` (eight files each). The configured JSON checkout remains A. No source bytes, pins or downloaded data changed.

The former resolver deliberately returned unresolved for source zero and hidden positive defaults because the old experiment coupled those variables. Projection already retained the numeric default, base hidden flag and ordered modifier nodes. No parser repair was needed.

The New Recruit folder chooser was probed once in IAB and once through the available Edge extension; neither yielded a supported directory upload. No hidden state injection, repeated retries or browser restriction bypass followed. The fictional matrix was **not run through full New Recruit browser XML ingestion**.

Instead, the lead and isolated reviewer examined public implementation served by New Recruit, release marker `nr@36.25`:

- [Runtime BpfpAR20.js](https://www.newrecruit.eu/_nuxt/BpfpAR20.js), SHA-256 `7960c95ad2c7a51a01b13b37d5dc7f40177efe9761e647e73e8fe47a8a15f9fa`.
- [AddList BTXadG3E.js](https://www.newrecruit.eu/_nuxt/BTXadG3E.js), SHA-256 `aea9b7f72b592e76eb7705e63c64137296c646e2019b289f414d28763a5b5de5`.
- [Editor cost metadata](https://github.com/giloushaker/nr-editor/blob/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/CostTypesPanel.vue) corroborates separate default/hidden fields; editor help alone is not the activation evidence.

These are captured moving implementation assets, not a claim that live New Recruit has the pilot's immutable catalogue closure. Copies and the controlled harness remain outside the repository at `C:/CodexACLTest/counter-activation-evidence/` and `C:/CodexACLTest/starcraft-counter-review-20260925/`.

The verified call chain is:

1. `generateCostIndex` retains raw definitions; `getCosts()` returns their base hidden/default fields.
2. AddList `loadBook()` filters `hidden !== true` **before** `getDefaultCost()`. In the controlled case without remembered user/system defaults, absent defaults become -1 and numeric zero is retained.
3. `createRoster`/`setMaxCosts` instantiate a maximum for nonnegative values, including zero. Missing/negative values create no maximum; the setter normalizes the query state to -1.
4. Display `getTotalCosts`/`getStartingCosts` evaluates hidden operations locally. A reveal changes display, not base metadata or initialized maxima.
5. Normal completed creation goes through `addList -> saveList -> doSaveList -> RC -> toJson -> toListJson -> getMaxCosts`, then `selectList -> loadList -> loadRosterFromJson -> do_loadFromInstanceJson -> setMaxCosts`. Serialization includes all resource identities; previously omitted values normalize to -1 on reload. Restore does not run new-army defaults over stored choices.
6. The ordinary condition path (`Ol -> mk -> T_ -> state.eval -> KF.eval`, and reactive `listen`) reads the limit query state. The unrelated HB percentage helper is not its fallback.

**Lifecycle qualification:** before that normal save/reselect, a never-initialized hidden resource's ordinary query reads zero. After completed creation/reopen it reads -1. RF models completed armies and derives that stable state from retained immutable source plus explicit overrides. It does not reproduce the transient New Recruit wizard. Dynamic visibility, remembered New Recruit preferences, and every alternative external import route are not claimed as equivalent.

## Controlled matrix

Project-owned exact XML is committed in `apps/web/src/fixtures/counter-activation/`. Original experiment filenames were `Resource Activation Probe.gst` (1618 bytes, SHA-256 `93362881e626646c7c26f88552c1fb323e1673955ac2f797e7da24b2ff87733c`) and `Activation Laboratory.cat` (13116 bytes, SHA-256 `f477b3094ad178d7c171d1baa25df2af5b40562ab78013d44b6fdfa70d3d6612`). Each distinct Channel A–L identity has a Measure total of 5. Only default and base/revealed visibility vary.

| Channels | Default | Base visible | Base hidden | Base hidden + direct reveal |
| --- | --- | --- | --- | --- |
| A/B/C | absent | no cap, query -1 | no cap, query -1 | no cap, query -1 |
| D/E/F | 0 | cap 0, violated, query 0 | no cap, query -1 | no cap, query -1 |
| G/H/I | 3 | cap 3, violated, query 3 | no cap, query -1 | no cap, query -1 |
| J/K/L | -1 | unbounded, query -1 | no cap, query -1 | no cap, query -1 |

The independent harness extracts original methods verbatim from the hashed assets, uses a .NET XML metadata adapter and minimal queue/selection/store stubs, then executes original creation, setter, comparator, ordinary/reactive query, serialization and restore methods. This is bounded original-method execution, not a second guessed evaluator or a full runtime/browser test. The lead inspected the harness and reran all twelve rows. Original cap-3 validation at totals 5 -> 2 -> 5 yielded violated -> satisfied -> violated. Explicit F=0 created a real violated cap and survived reopen; F=-1 removed it; three further save/reopen rounds were stable. Source metadata remained identical.

A separate normal New Recruit browser control created only temporary anonymous `SC Counter activation control` (live Protoss catalogue13/system12). Daelaam plus Forge showed Gas30. Committed Gas10 produced `Roster has 20 Gas too many (max 10)` and 30/10; Gas30 repaired that error and showed30/30. The seven displayed counters produced no maximum-zero errors. This corroborates enforcement and the positive control, but is not exact frozen-source matrix parity. Existing armies were preserved. Earlier verified explicit-player0/-1 observations are retained.

## Shared RF contract

`resource-limits.ts` owns authored numeric state, source inclusion/omission, display visibility, optional override and effective state. Known base-visible declarations use nonnegative defaults (zero included), -1 unbounded, or absent. Known base-hidden declarations are inactive regardless of a supported direct unconditional reveal. Invalid nonempty numbers remain invalid, including hidden declarations. `sourceActivation` describes inclusion, not by itself an active numeric maximum.

The bounded static adapter accepts ordinary identity/default/hidden metadata and direct unconditional Boolean `set hidden` operations with inert ID/comment metadata. Conflicting, grouped, conditional, malformed or unknown source behavior remains unresolved with a reason. Unknown cost-type/modifier attributes, unrecognized behavioral elements and dynamic limit operations cannot be bypassed by an override. A known display-only unsupported dependency may remain unresolved as source metadata while an explicit known player maximum supplies the effective value; general visibility never runs inside the resolver.

Limit queries read known finite values, -1 for unbounded/absent/inactive completed states, and remain incomplete for invalid/unresolved identities or behavior. No names, leading spaces, game IDs, current balances, or seven-counter exceptions classify resources. Signed totals remain signed; four independently authored negative-supply errors retain their own constraints.

Validation, configuration, totals and print status use the shared result. Inactive budgets have `active:false`, internal nonviolating status `satisfied`, and no applicable maximum comparison. The UI says `no active source limit`; configuration separately shows `Source: limit 0`. Display visibility metadata does not introduce a new summary-hiding policy. Known zero resource maxima also prevent the old Battle Size pending-label heuristic from hiding a real cap in the sticky header.

No saved model/decoder/schema migration was needed. Existing overrides win over supported saved-source defaults; reset removes only the override. Re-evaluation is pure and does not insert overrides, change imported bytes, dirty a roster or save it. Fictional tests re-ingest retained bytes before restore and verify history, isolation and byte preservation.

## Unchanged-input three-army disposition

All seven GST definitions have default0, base hidden=true, one unconditional set-hidden=false operation and the source comment `Required so it does not show on list creation`. The comment is supporting intent, not the runtime proof. Each resolves omitted/inactive, display-visible, query -1 and **not applicable** maximum comparison, with exact signed totals:

| Resource | Exact source ID | Protoss Khalai | Terran Raiders | Zerg Swarm |
| --- | --- | ---: | ---: | ---: |
| Core | 472f-46af-8e02-bfbf | 2 | 0 | 2 |
| Elite | f5f9-3591-0f2d-0a53 | 2 | 0 | 1 |
| Support | 31a6-c1f1-3d47-fa76 | 0 | 3 | 0 |
| Hero | 7e61-585f-b715-85e0 | 1 | 1 | 0 |
| CP | d9d3-e904-3bc1-58f4 | 0 | 3 | 0 |
| BM | 2b0c-c74f-79d5-5637 | 0 | 0 | 2 |
| EN | 2498-bcf5-4ce6-ba10 | 5 | 0 | 0 |

Purchasing remains Protoss1220/1500 Minerals and130/200 Gas; Terran570/600 and60/200; Zerg520/600 and30/200. Shared validation reports respectively61/36/55 satisfied, zero violated/unresolved. Terran's separate missing-cost-type diagnostics still make its workspace/reference coverage limited; the known totals are exact. Complete supported constraint checks do not certify full game/reference support.

## Browser and regression evidence

Original5297/5299 servers, samples and owner tabs were preserved. New plain Vite5301 uses disposable `SC Counter -` copies of the existing exported test fixtures via the production decoder/store; these are identified as copied fixtures, not fresh browser builds. Source data and history were retained. Each was opened using normal shelf controls. A separate `SC Counter - Fresh Zerg` was created through normal setup from retained pinned catalogue data.

Browser observations: all three original ledgers above; all seven configuration rows distinguish authored0 from inactive defaults; Protoss Core0 gives2 over budget, -1 removes the cap, reset restores inactive, undo/redo preserve intent. Fresh Zerg BM0 survived recovery in a separately opened page and save/reopen. Required maps/missions and faction still give three fresh-army violations. Terran Minerals569 gives1 over budget,600 repairs it; removing Barracks makes Core-1 and the independent `Not enough Core Supply.` error, undo restores zero and no error. Copies were saved after repair. Reinforced9/240 and independent6/160 Marines remain present; configured regression checks the complete6/160 -> shield6/180 ->9/240 -> removal6/180 sequence and squad independence. Mission reference remains Skirmish at600; configured tests retain999/1000 versus1001/1500 transitions and all fields. The original report's map-image payload remains untouched. No new PDF/pagination or print-layout acceptance is claimed.

Failing-before reproduction: new fictional shared-path matrix and lifecycle tests failed on baseline (2 failed/4 passed); the matrix observed unresolved source zero instead of known active/inactive states. After repair the focused tests pass. Additional counterexamples retain unknown identities/defaults/attributes/elements, conditional/conflicting/grouped activation and dynamic limits. Four pinned supply channels each independently violate below zero while an explicit maximum0 is satisfied; at zero their supply error clears. Positive supply with maximum0 independently violates the budget.

Independent native review used isolated `starcraft-counter-review-20260925`; found and reproduced unknown-attribute and unknown-direct-element override bypasses. Both were fixed and independently rechecked:30 tests/2files pass, no remaining blocking finding. A single scoped Claude attempt failed expired OAuth refresh before inference; this was not a code review rejection, and no external review is claimed. No retries or account/provider changes.

Final normal suite:1108 passed,35 optional skips,110 files,15.48s. Final configured
suite:1143 passed,zero skips,110 files,47.10s. Lint/typecheck/build/whitespace pass;
202 modules, JS1066.31kB/gzip301.85kB, CSS84.94kB/gzip15.16kB, existing chunk-size
advisory only. Configured inputs retain JSON A, A/B snapshot directory, StarCraft
pilot XML directory and saved Dark Angels print fixture; no PRINT_OUTPUT or new
PDF matrix. One supplemental local disposable-ledger probe passed (1.80s), distinct
from the committed suite; shared print-model status matches each army's qualifications. Logs and sanitized local runtime evidence are under `C:/CodexACLTest/counter-activation-evidence/`. Ordinary/configured test populations overlap and are not additive.

## Remaining boundary

Unknown/conditional/conflicting activation, dynamic/cyclic limits and unsupported query scope/traversal remain qualified. No in-game spending or ability activation semantics were added. Source revision mismatch, orphan cost references, rule precedence/routing and imported formatting qualifications remain. Embedded map-image output remains a material paper/reference blocker; complete-army acceptance remains blocked and final owner print-layout acceptance remains pending. Stop after this checkpoint: no map rendering, source update, migration, broad audit or main integration.
