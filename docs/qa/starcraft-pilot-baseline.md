# StarCraft compatibility pilot baseline

> Historical reproduction: SC01/02 repaired authored/faction requirements,
> SC03/07 repaired supported budgets, and [SC04](starcraft-reinforcement.md)
> now verifies Marines6/9/6 and160/180/240/180. Original failed observations below
> are preserved as baseline evidence, not current acceptance expectations.
> [SC-05](starcraft-xml-text.md) now repairs parsed XML reference values; the
> literal-escape observations below remain the historical pre-repair evidence.

## Result and boundary

ForceWright can directly download this StarCraft snapshot, create all three
factions, configure selected choices, and display their reference content.
Terran and Protoss save/reopen passed. This is **experimental, not full support**:
reinforcement conditions, authored errors, faction requirements, default budgets,
and reference metadata expose concrete gaps. No parser, evaluator, roster-model,
persistence, or reference-grouping implementation was changed.

Application baseline: fetched `origin/main`
`bac89b7ed92b088d270e0287c4893ff47d53d04e`, identical to the historical accepted
main supplied by the owner. Its [CI run 34663443701](https://github.com/ronincse/rosterforge/actions/runs/34663443701)
passed. Pilot branch `codex/starcraft-pilot`, dedicated worktree
`C:/CodexACLTest/forcewright-starcraft-pilot`. The existing integration/main and
UI-overhaul checkouts, servers, source checkouts and personal armies were preserved.
Related Codex tasks were idle/not loaded at start; no competing active writer
was observed. Source-registration/test commit:
`be1494d16c9904065b9c54373d600da6c0541979`. Publication commit and exact CI result
are recorded in the handoff and completion response; this report travels with
the tested source change.

The only production change appends one source to
`apps/web/src/remote-catalogue-source.ts`. The existing panel and controller already
map multiple definitions, so no selector, downloader or acquisition framework
was added. Original 40k definition, pin, namespaces and identifiers are unchanged.

## Frozen data and dependency manifest

Repository [loicmusy/StarcraftTMG-NR](https://github.com/loicmusy/StarcraftTMG-NR/tree/99261754e0449bbaaa04e6890e1625b144f9ece1),
selected default-branch tip `99261754e0449bbaaa04e6890e1625b144f9ece1`.
Resolved once at task start; it matches the owner's last observed tip. All
subsequent tree/blob/raw references use this pin. Git tree API returned
`sha=99261754e0449bbaaa04e6890e1625b144f9ece1`, `truncated=false`, six blobs:
the four data files below, README and `.gitignore`. Preserve this returned identity
rather than inventing a different tree hash.

| File | Bytes | Git blob SHA-1 | SHA-256 |
| --- | ---: | --- | --- |
| Starcraft The Miniature Game.gst | 500146 | 26fc76c0349b76b5f17b6fce203544380910c420 | ae9e9e9dbbff610794215a475f7af5a352ee61665dec59152167fb54be11e4c4 |
| Terrans.cat | 112172 | 269bcc559e323a2ee870444e0bd2764ffd604455 | 01959a98e416429b079ea5fd173c9e197a21595d15b47681acf9bc36d7d854c0 |
| Protoss.cat | 92542 | d998e38dc673d7f3a47fa015c598f0088ca69042 | 97f0ab73c9a366110274826f6af2d9b76e58cc3a415cc5200251b89e79974398 |
| Zergs.cat | 134299 | 5c6f595c008911846511442c44e3cf0cec145d5c | f9c64766547db386ec2b2b0f3ee7e465fef7dbf47f2b21ae8984e7e1edc394bd |

Four data files total **839159 bytes**. Independently downloaded Git blobs were
decoded to original bytes and checked against Git blob identities and sizes;
SHA-256 values above are also enforced by the optional reproduction test.
README: 2251 bytes, blob `decaa2faa655e68aa403f0bd87a55bf2c3d71d50`, SHA-256
`1c50ffb2ed5d75325bbfc32fb42389826d3e3185d7290cf00d4b0b74f86f073e`.
Its badge says **1.4beta** and it disclaims publisher affiliation. This is a
community data label, not an independent verification against publisher rules.

| Document | Declared ID | Revision | Declared system revision | Normal closure |
| --- | --- | ---: | ---: | --- |
| Game system | sys-ce49-e853-2fea-6af1 | 12 | — | — |
| Terran | d5ca-ef26-b879-bdc1 | 13 | 13 | GST + Terrans.cat, 612318 bytes |
| Protoss | a993-a28e-5c72-5b0a | 13 | 13 | GST + Protoss.cat, 592688 bytes |
| Zerg | 9853-7f07-916b-d7d3 | 13 | 13 | GST + Zergs.cat, 634445 bytes |

All declare BattleScribe 2.03. No catalogue links or library catalogues occur.
Every faction references the same system ID. **Loaded revision is 12**, despite
the catalogue declarations of 13; no source was normalized or repaired. Full
four-document ID inspection found zero unresolved `targetId` links, zero missing
profile-type IDs and zero missing characteristic-type IDs. This does not claim
every arbitrary extension field is a resolved graph reference.

Five absent cost-type IDs occur twice each, as zero costs on Marines and
Marauders: `e617-ddca-8728-f42f`, `8a22-4e4a-7691-7495`,
`d8b1-aeb3-2f7a-33e5`, `7729-67ea-f187-8aca`, `687e-4a48-77a3-096f`.
None is defined anywhere in the frozen repository. The engine correctly emits
`EVALUATION_COST_TYPE_MISSING` and keeps Terran costs incomplete; zero values do
not justify inventing type metadata or suppressing the qualification.

## Mechanisms actually present

Counts across the four unchanged XML documents: 143 selection entries, 53 groups,
98 modifiers, **zero modifier groups**, 109 conditions, 20 condition groups,
135 constraints (32 with `automatic=true`), 248 profiles, 28 rules, 735 costs.
There are 12 force `add error` modifiers: Core/Elite/Support/Hero negative-balance
messages in each faction. Conditional visibility includes `limit::<cost-id>`.

GST lines 14–66 declare these exact currencies (display names below trim spaces
only for readability; identity, not the spaces or name, determines arithmetic):

| ID | Label | Default limit | Source visibility |
| --- | --- | ---: | --- |
| 5bcf-897a-a5c9-d0e8 | Minerals | 2000 | no hidden flag |
| 1719-6214-392e-e53f | Gas | 200 | no hidden flag |
| 472f-46af-8e02-bfbf | Core | 0 | hidden=true; direct set hidden=false |
| f5f9-3591-0f2d-0a53 | Elite | 0 | same |
| 31a6-c1f1-3d47-fa76 | Support | 0 | same |
| 7e61-585f-b715-85e0 | Hero | 0 | same |
| d9d3-e904-3bc1-58f4 | CP | 0 | same |
| 2b0c-c74f-79d5-5637 | BM | 0 | same |
| 2498-bcf5-4ce6-ba10 | EN | 0 | same |

Signed costs survive: factions/buildings grant allowances and units consume
them. An ordinary cost of −1 is not the constraint sentinel. Positive allowances
are not interchangeable with spendable purchase budgets; no universal Points
translation is supported by the evidence. No editable Minerals/Gas limit control
was found in normal setup. The explicit default limits survive typed projection
but are not used by engine/application budget validation.

Ten profile types declare model(1), weapon(2), ability(5), tag(1), and absent
kind(1), with `sortIndex`, characteristic `kind=longText/annotation`, and seven
`formatRule` regex definitions that turn empty values into a dash. These survive
in generic nodes; typed profile metadata and current reference routing do not
execute those presentation extensions. Arbitrary imported regex execution is
already deliberately disabled; no rule prose was interpreted as game logic.

## Browser acquisition and journeys

Real Codex in-app Chromium, fresh `http://127.0.0.1:5271/`, Vite strict port
started from the pilot worktree. Visible experimental second source and original
40k card prove the served change; server command/cwd establish checkout identity.
The origin initially showed zero saved drafts. No artificial browser state,
file-upload shortcut, patched initialization or alternate downloader was used.

Browse StarCraft → index four files → choose faction → Load selected catalogue
→ normal Army setup succeeded for all factions, with **0 import diagnostics**.
Terran/Protoss/Zerg exposed 21/22/27 roots, one force definition each, and
17/17/18 categories. Later visits reported metadata restored from this browser.
The inherited listing/index/dependency/blob-verification/cache/ingestion path
was used. Complete import does not imply complete evaluation.

| Faction | Create/configure | Save/reference |
| --- | --- | --- |
| Terran | Auto-created Deployment Maps and Mission Card; Marines, Shield, Reinforce, duplicate, Terran Armed Forces | Saved/reopened two Shield squads at 360 Minerals, each six models; later faction addition autosaved. Reference readable with issues below |
| Protoss | Daelaam, Zealots + Leg Enhancements, Stalker + Path of Shadows, Sentries; later Forge | Saved/reopened three units at 500 Minerals and correct selected quantities; later Forge adds 30 Gas. 500 is incidental arithmetic, not a translated army size |
| Zerg | Auto-created pre-game roots, added Zerglings at 180 Minerals / −1 Core, twelve separate model occurrences | Reference inspected, smoke draft saved; no Zerg reopen/configuration acceptance claim |

Terran saved shelf before faction: 8 selections, 598.0 KB; after faction: 9.
Each Marine squad has **one amounted model occurrence of six**, not six distinct
model occurrences. Protoss initial saved roster: 14 selections, 578.8 KB;
Zealots have three distinct model occurrences, Sentries two, Stalker one.
Zerg smoke: 15 selections, 619.6 KB, twelve Zergling occurrences. Source-defined
pre-game containers initialize but their nested choices were not fully configured.
These are diagnostic armies, not accepted legal army lists.

Zerg differs materially: Faction min/max one is on the **force category link**
(Zergs.cat:115–120), while Terran/Protoss put it on the category definition.
Zerg shows “0 / 1 required” and incomplete checks; missing faction still yields
zero known violations. It also has a Creep category and more nested groups.
No full faction support is inferred from this smoke check.

## Resource and requirement experiments

Terrans.cat:137–230 defines Marines `46b6-0bfa-70ea-ba86`, Marine model
`535b-1f2b-6421-d932`, Reinforce `6beb-c060-9e77-4256`, Shield
`2da2-c22c-c732-951c`. Expected reinforcement outcomes below follow the authored
Reinforce conditions; **New Recruit parity was not tested**.

| Choice state | Source-intended Minerals/models | Observed Minerals/models | Core |
| --- | --- | --- | ---: |
| Base Marines | 160 / 6 | 160 / 6 | −1 |
| Combat Shield | 180 / 6 | 180 / 6 | −1 |
| Shield + Reinforce | 240 / 9 | **230 / 6** | −2 |
| Remove Reinforce | 180 / 6 | 180 / 6 | −1 |
| Duplicate unreinforced Shield squad | 360 / 12 total | 360 / 12 total | −2 |

Gas/Elite/Support/Hero remain zero in each single-squad probe. Five missing
zero-cost type references keep these costs incomplete. An initialization warning
`EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED` appears on addition.
The ordinary Remove one Marine action returns to six through automatic
reconciliation; Add one remains disabled even while Reinforce is selected.
No successful nine-model transition is claimed.

The implementation cause is confirmed: `conditions.ts:452–464,542–548` selects
nearest unit scope with absent `includeChildSelections` treated as false;
`selection-context.ts:477–485` consequently observes only the Marines container,
not its Reinforce child. Count zero leaves model bounds six and Shield price 20.
This is a source-intent mismatch with a reproducible cause; whether the format
requires broader typed-scope semantics remains a targeted reference question
before a repair. Do not silently change every scope or rewrite this source.

Protoss browser purchase ledger:

| Selection | Minerals | Gas | Core | Elite | Support | EN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Daelaam | 0 | 0 | +3 | +1 | +1 | +1 |
| Zealots + Leg Enhancements | 180 | 0 | −2 | 0 | 0 | 0 |
| Stalker + Path of Shadows | 190 | 0 | 0 | −1 | 0 | 0 |
| Sentries | 130 | 0 | 0 | 0 | −1 | 0 |
| Forge, added after reopen | 0 | 30 | 0 | +1 | 0 | +1 |
| Final sum | 500 | 30 | +1 | +1 | 0 | +2 |

Hero/CP/BM are zero. Visible cards retain Gas and signed counters separately;
the headline prioritizes Minerals and does not expose all balances/budgets.

Deliberately invalid cases through ordinary controls:

- No Protoss faction, then Daelaam plus Khalai: both show zero known violations
  and “all supported rules checked”. Remove Khalai repairs the authored maximum.
- Daelaam plus **two upgraded Zealot squads**: 360 Minerals, Core **−1**,
  zero known violations/all supported checked. Remove the duplicate repairs
  Core to +1. Expected authored message: “Not enough Core Supply.”
- Seven Forge purchases: **210 Gas**, above declared default 200; zero known
  violations/all supported checked. Remove six copies returns Gas to 30.

Supplemental unchanged-production-API probe uses exact hashed files, normal
session creation/add/remove APIs and no browser injection. Base Zealots instead
of upgrades yield the same +1 → −1 → +1 Core transitions at160→320→160 Minerals.
Negative case reports `valid/complete`, satisfied20/violated0/unresolved0;
missing-faction case6/0/0; Gas210 case13/0/0. All are **reproductions of gaps**,
not assertions that those armies are legal. Minerals over-budget was not separately
crossed in the browser; the same absent default-limit execution path applies.

## Findings and next capabilities

| ID / priority | Classification and evidence | Required next boundary |
| --- | --- | --- |
| SC-01 / high | Unsupported authored errors with **false completeness**. All12 force `field=error` modifiers are retained but not executed. Protoss negative Core still valid/complete. `validation.ts:97`, `force-constraints.ts:438` compose constraint targets, no error-message channel | Diagnose applicable unexecuted error behavior first, then implement scoped conditions/messages with invalid→repair tests |
| SC-02 / high | Unreported unsupported parent-scoped category-definition constraints. `category-constraints.ts:177–180` skips everything except roster/selections definitions; no diagnostic. Empty/two-faction Protoss stays complete | Generic category-definition ownership/scope handling or explicit incompleteness; preserve Zerg's distinct force-link behavior |
| SC-03 / high | Default resource limits projected, not enforced or editable. `project.ts:384–408` retains limits; `roster-workspace-model.ts:420–468` derives capacity only from force constraints. Gas210 gets no violation | Separate roster purchase budgets from signed composition balances, add data-driven default/override lifecycle; do not treat every zero limit as purchase budget |
| SC-04 / high | Reinforcement source-intent mismatch: six/230 instead of nine/240; exact cause above, reference semantics unverified | Resolve typed-unit scope semantics with targeted reference evidence, then bounded condition/reconciliation/cost tests |
| SC-05 / medium | Demonstrated XML value/display defect: `12&quot;`, `4&quot;`, `Raynor&apos;s Raiders` reach UI literally. `battlescribe-data/src/ingest.ts:43` disables entity processing | Safely decode built-in/numeric XML escapes while retaining original bytes and rejecting DTD/custom entities; renderer safety regression |
| SC-06 / medium | Presentation metadata unsupported: ability profiles under Weapons & equipment, empty fields say Empty value rather than authored dash. `project.ts:305–329` does not project kind/order/format; `roster-workspace.tsx:3567` classifies by Unit/Description labels | Project trusted declarative roles/order, classify by metadata with fallback, assess bounded formatting separately; no arbitrary regex/prose execution |
| SC-07 / medium | Missing application summary/control: multiple currency amounts exist but headline shows one; allowance counters can be called “used”; metadata-driven cost visibility is not executed | Resource-aware summary after SC-03 semantics, no label-based meaning inference |
| SC-08 / low | Inherited freshness is 40k-specific: `catalogue-data-freshness.ts:55` defaults to source0; `catalogue-library-panel.tsx:135` offline prose says BSData | Bind freshness to acquired provenance or honestly suppress unknown-source claims; no updater |
| SC-D1 | Source limitation: system12 vs declared13; five absent cost types/ten zero references | Preserve provenance/diagnostics; obtain corrected upstream snapshot only in a separately authorized pin update |

Additional bounded gap: GST Deployment Maps conditions query `limit::<MineralsID>`
(around line365). `conditions.ts:1070–1083` has no limit query field. Pre-game
selection visibility/default completion needs its own budget-dependent probe;
the initialized container alone is not proof of supported mission setup.

Dependency-aware sequence: (1) honesty for SC-01/02 and source qualifications;
(2) resource/budget state and limit queries SC-03/07; (3) resolve SC-04 semantics
and repair only the demonstrated shape; (4) safe XML value decoding SC-05 and
metadata-based reference SC-06; (5) source-aware freshness SC-08 and rerun the
same saved-army/reference scenarios. Each is a future bounded assignment.

## Visual evidence, limits and reproduction

Evidence retained outside tracked source at
`C:/CodexACLTest/starcraft-pilot-evidence/`: original `data/`, `tree.json`,
`manifest.json`, `mechanism-summary.json`, `engine-ledger.json`, browser snapshots,
console capture and gate logs. No third-party data or personal roster is committed.

Screenshots: `terran-reference-390.png`, `terran-reference-1440.png`,
`protoss-reference-390.png`, `protoss-reference-320.png`,
`zerg-reference-390.png`, `protoss-two-factions.png`,
`protoss-negative-core-complete.png`, `terran-negative-core-no-problem.png`.
Phone profiles retain all inspected labels and values, wrapping at320/390;
320 document client/scroll widths both305 excluding scrollbar. Desktop1440×900
uses tables. Sentry Shd2/Spd4/7/Eva6+/Arm5+/HP4/Size1 are readable. Marine and
Zergling empty Shd remains explicitly empty. Ability prose is readable but in
the wrong section; entity escapes remain visible. Root-owned profiles say
`1× Marines/Sentries/Zerglings`, correctly reflecting source ownership rather
than multiplying attacks, but not communicating actual model count in the card.
Selected Combat Shield is included; unselected alternative weapons are not.

No physical iPhone, screen reader, dark appearance, installed app, print,
offline/network-throttled performance, full unit survey or New Recruit parity
acceptance was performed. No benchmark claim. Captured browser warn/error log
was empty; application diagnostics were observed separately in UI/API reports.
Supplemental PowerShell raw HTTPS failed locally, so developer inspection used
GitHub immutable blob bytes; **browser direct download itself succeeded**.

Reproduce: fresh origin → experimental source → Browse → choose faction → Load
→ Army → Create. Follow named choices above. For the optional API reproduction,
download the four exact files/hash-check them, set
`ROSTERFORGE_STARCRAFT_PILOT_DIR` to that directory, and run
`pnpm test apps/web/src/starcraft-pilot.integration.test.ts`.
Optional `ROSTERFORGE_STARCRAFT_PILOT_REPORT` writes the compact observed ledger
to an explicit local path. Without data configuration the test is visibly skipped;
its pass means **baseline reproduced**, not support passed.

## Regression protection and independent review

New synthetic tests freeze the full existing 40k definition, verify immutable
StarCraft identity, exercise both normal UI source buttons and failure handling,
and share byte/metadata caches across both repositories to verify independent
misses, subsequent hits and source provenance. Existing repository security,
corruption/failure, persistence/recovery, renderer timing and phone-reference
tests remain unchanged.

Normal gates: lint/typecheck/build/whitespace pass; **720 passed /31 optional
skipped**,81 passed/7 skipped files (17.37s final full run). Configured corpus
run: **28 passed /4 files, zero skips** (41.57s): 27 existing pinned40k checks
plus one StarCraft reproduction. 40k checkout HEAD verified
`04c62fcd041b3808c39d5c46fd677c704027b979`; existing A/B manifests/hash checks
executed using their original environment variables. Build remains subject to
the existing >500KB advisory. Final publication CI is recorded with exact SHA.

Claude bounded read-only review was attempted with Read/Grep/Glob only, but the
installed executable failed to launch in this shell (`StandardOutputEncoding`);
no successful external review is claimed and no installation/authentication was
attempted. A native reviewer used isolated
`C:/CodexACLTest/starcraft-pilot-review`, read source and frozen definitions,
independently identified typed-scope, category-scope, freshness and authored-error
boundaries; lead verified the cited paths and reproduced the runtime findings.
Final candidate/report review approved with no blockers. The reviewer checked
manifest arithmetic, engine ledgers and scope qualifications. Its source-card
wording suggestion was applied: no reference to a report that the card cannot
open. Review did not rerun the lead's gates or claim New Recruit verification.

Publication verification: checkpoint commit
`ddb3a2e968963fc89a1f1d246d9d06a7b2ba2811` passed
[CI run 34668661561](https://github.com/ronincse/rosterforge/actions/runs/34668661561)
with the `verify` job successful (lint, typecheck, standard tests, build and
whitespace). This receipt is a documentation-only follow-up; its own final CI
result is recorded in the completion response. Main remained at the baseline.

Stop here: source registration, baseline evidence and plan only. No main push,
merge, PR, deployment, updater, data correction or broad semantic implementation.
