# StarCraft pilot acceptance — 2026-09-25

## Decision

**B — blocked for complete-army acceptance.** Three representative armies can be
built, priced within the supported resources, saved, recovered and revised.
That is useful owner-testable progress, not full StarCraft support. A confirmed
application defect drops the authored map/mission group requirements and labels
both groups optional. Seven source-default counter activations remain materially
unresolved. Selected mission variants remain unresolved, and selected map image
payloads print as long literal text. These prevent an unqualified BUILD → VALIDATE
→ PLAY acceptance for every tested faction.

The primary Protoss and secondary Terran screen combat-reference tasks passed
within the detailed boundary below. Zerg construction/save/reopen passed that
same limited boundary. Offline exported-file rendering has outcome **C** because
the browser tool blocked file navigation; no bypass or offline-rendering claim.
Final owner print-design acceptance remains pending independently of this result.
Application code, source pins and third-party bytes were not changed.

## Baseline and reproducibility

- Tested application: `1df38cfc58a8b7a2a6d18c24702a09f67434ce15`, clean and
  upstream-equal after fetch, branch `codex/starcraft-pilot`, checkout
  `C:/CodexACLTest/forcewright-starcraft-pilot`. Later acceptance/handoff commits
  contain documentation only. No reset to an earlier handoff.
- Windows, Node24.19.0, installed Vitest4.1.8, ordinary Vite8.1.5; Chromium-based
  Codex in-app browser. Desktop1440×1000 and phone390×844.
- Worktrees/processes and active tasks inspected. `Redesign list-builder UI` was
  idle. Existing main/UI/reviewer worktrees, owner tabs/storage and unrelated
  processes were preserved. No listener existed at historical5295 (or5271/5293)
  at baseline. Its old QA server file contains acquisition replay, but was not
  restarted or used.
- Dedicated **http://127.0.0.1:5297/** runs plain Vite from the pilot `apps/web`.
  Its first shelf was empty. No acquisition replay or production overrides.
  Live Browse → experimental StarCraft → index → Protoss → load → create passed;
  four pinned blobs / three faction catalogues. Subsequent Terran/Zerg Browse
  explicitly reported ordinary cached metadata. All acquisitions retained
  verified pinned bytes. No moving-source substitution or local-import fallback.
- A Windows `EBUSY` watcher error stopped this isolated server while a completed
  Dark Angels fixture was copied into its gitignored `.cache`. Only5297 was
  restarted, with the same plain Vite command and no application change. Saved
  armies reopened afterward. The final server is left running for owner testing.

Pins are unchanged:

| Input | Immutable revision | Verified closure |
| --- | --- | --- |
| StarCraft | `99261754e0449bbaaa04e6890e1625b144f9ece1` | Manifest files; each army uses GST + its faction CAT, no catalogue links |
| 40k A | `04c62fcd041b3808c39d5c46fd677c704027b979` | Eight-file manifest and original reference-draft bytes |
| 40k B | `5b261ec423d5d017bb733c4f3c0a760b085d5ca5` | Eight-file manifest; configured regression tests |

| StarCraft file | Bytes | SHA256 |
| --- | ---: | --- |
| Starcraft The Miniature Game.gst | 500146 | `ae9e9e9dbbff610794215a475f7af5a352ee61665dec59152167fb54be11e4c4` |
| Protoss.cat | 92542 | `97f0ab73c9a366110274826f6af2d9b76e58cc3a415cc5200251b89e79974398` |
| Terrans.cat | 112172 | `01959a98e416429b079ea5fd173c9e197a21595d15b47681acf9bc36d7d854c0` |
| Zergs.cat | 134299 | `f9c64766547db386ec2b2b0f3ee7e465fef7dbf47f2b21ae8984e7e1edc394bd` |

Frozen files remain in `C:/CodexACLTest/starcraft-pilot-evidence/data`.
Evidence and exports are local, outside version control:
`C:/Users/stone/.codex/visualizations/2026/09/12/01a09368-161b-7c60-a3c6-b0afa598b7de/pilot-acceptance-20260925/`.
Files include `targets-before-build.md`, `protoss-compact.html`,
`acceptance-drafts.json`, `saved-source-evidence.json`, `html-static-evidence.json`,
review probes/results and gate logs. No personal armies or bulk game data were
published or transferred to an external reviewer.

## Targets and source-led ledgers

Targets were written before browser outcomes. Source inspection corrected the
initial proposal explicitly, rather than silently substituting a passing army:

- Original Protoss proposal used **Daelaam**, Praetor Guards and no Observer.
  It is not a passed target: Guards `84f3-7234-2df2-12d5` are hidden unless
  **Khalai** `41ab-8fa0-e055-c722` is selected, and Sentries consume Support.
  Before building the final units, the browser army was restarted as the separate
  **Khalai alternative**, with an Observer. Its independent target became1220M/
  130G. This is an authored faction restriction, not an RF visibility defect.
- The initial Terran target lacked Barracks. Independent source arithmetic
  predicted Core−1; the browser reproduced it. The explicit repaired alternative
  adds Barracks25G/+1Core/+1CP, retaining the failed intermediate570M/35G.
- Metabolic Boost is an inherent Zergling ability, not a purchased upgrade.
  The selected purchase is Adrenal Glands20M. No invented Metabolic Boost cost.
- Setup is not guessed from empty wrappers: each source group authors exactly
  two choices. The selected pairs below are offered by the corresponding budget
  threshold. Their enforcement/reference qualifications remain explicit.

Expected costs were read independently from authored XML IDs, amounts and
modifiers by the lead and isolated reviewer. Production evaluation was then
compared with those expectations. Sparse vectors below mean all other defined
resources are zero; allowance labels use the resolved cost-type ID (e.g. an
instance labelled EP still resolves to EN), not guessed semantics from text.

### Primary: SC Acceptance - Protoss Khalai

| Selection | Quantity/equipment | Minerals: base + upgrade | Gas | Signed allowance/consumption |
| --- | --- | ---: | ---: | --- |
| Khalai faction | Exactly one faction | 0 | 0 | Core+3, Elite+2, Hero+1, EN+1 |
| Zealots | 3; Leg Enhancements | 160+20=180 | 0 | Core−2 |
| Adepts | 4; Resonating Glaives | 150+20=170 | 0 | Core−1 |
| Stalker | 1 authored upgrade child; Path of Shadows | 170+20=190 | 0 | Elite−1 |
| Sentries | 2; Solid-Field Projector | 130+20=150 | 0 | Support−1 |
| Praetor Guards | 3; inherent Leg Enhancements | 280 | 0 | Elite−2 |
| Artanis | 1 | 250 | 0 | Hero−1 |
| Forge | 1 tactical selection | 0 | 30 | Elite+1, EN+1 |
| Gate Chronoboosted | 1 tactical selection | 0 | 35 | Core+1, Elite+1, EN+1 |
| Power Field | 1 tactical selection | 0 | 40 | Core+1, Elite+1, Hero+1, EN+1 |
| Observer | 1 tactical selection | 0 | 25 | Support+1, EN+1 |
| Deployment Maps | Acropolis; Breach | 0 | 0 | None |
| Mission Card | Divide and Conquer; Frontlines | 0 | 0 | None |
| **Total** | 13 roots / 34 persisted selections | **1220** | **130** | **Core2, Elite2, Support0, Hero1, CP0, BM0, EN5** |

Final Minerals override **1500**, source Gas limit200; remaining280M/70G.
Source default Minerals2000 is retained behind the override. Fourteen described
figures comprise thirteen source-typed models plus the Stalker upgrade child
`f8b4-e37c-19da-a050`; RF does not relabel it a model. No extra20 is charged for
the Guards' inherent profile. Supported cost calculation is complete.

### Secondary: SC Acceptance - Terran Raiders

| Selection | Quantity/equipment | Minerals | Gas | Signed allowance/consumption |
| --- | --- | ---: | ---: | --- |
| Raynor's Raiders faction | `60b3-fffd-a15a-4cea`, not the same-named230M unit | 0 | 0 | Core+3, Support+1, Hero+1, CP+1 |
| Marines A | 9; Combat Shield + Reinforce | 160+50+30=240 | 0 | Core−2 |
| Marines B | 6; neither upgrade | 160 | 0 | Core−1 |
| Marauders | 2; Kinetic Foam | 150+20=170 | 0 | Core−1 |
| Academy | 1 tactical selection | 0 | 35 | Support+2, CP+1 |
| Barracks | Explicit repair to original target | 0 | 25 | Core+1, CP+1 |
| Deployment Maps | Abandoned Camp; Agria Valley | 0 | 0 | None |
| Mission Card | Divide and Conquer; Frontlines | 0 | 0 | None |
| **Total** | 8 roots / 18 persisted selections / 17 models | **570** | **60** | **Core0, Elite0, Support3, Hero1, CP3, BM0, EN0** |

Final Minerals override600, Gas source200; remaining30M/140G. Marines Shield is
20 for six and30 for nine under its own supported unit-count condition. The two
Marine occurrences each reference five absent source cost types: ten diagnostics,
so total cost coverage is **incomplete**, even though the defined resource ledger
matches. No missing zero-valued cost was reinterpreted or suppressed.

### Smaller case: SC Acceptance - Zerg Swarm

| Selection | Quantity/equipment | Minerals | Gas | Signed allowance/consumption |
| --- | --- | ---: | ---: | --- |
| Zerg Swarm | Exactly one faction | 0 | 0 | Core+3, Elite+1, Support+1, BM+1 |
| Zerglings | 12; Adrenal Glands | 180+20=200 | 0 | Core−1 |
| Roaches | 3 authored upgrade children | 170 | 0 | Core−1 |
| Queen | 1 model | 150 | 0 | Support−1 |
| Evolution Chamber | 1 tactical selection | 0 | 30 | Core+1, BM+1 |
| Deployment Maps | Abandoned Camp; Agria Valley | 0 | 0 | None |
| Mission Card | Divide and Conquer; Frontlines | 0 | 0 | None |
| **Total** | 7 roots / 27 persisted selections | **520** | **30** | **Core2, Elite1, Support0, Hero0, CP0, BM2, EN0** |

Final Minerals override600, Gas source200; remaining80M/170G. Sixteen described
figures comprise thirteen source-typed models and three Roach upgrade children
`0674-8198-2994-bdeb`. Supported cost calculation is complete.

## Integrated workflow observations

All StarCraft roster construction used ordinary visible controls; no prebuilt
StarCraft roster was injected. The later evidence helper only exported their
saved drafts. The Dark Angels exception is explicitly described below.

| Exercise | Observed result |
| --- | --- |
| Missing/excess faction | Primary empty army reports minimum0/1. Khalai clears it; adding Daelaam produces maximum2/1; removal clears it. Terran/Zerg empty states also show missing faction. |
| Protoss negative/zero supply | Temporary extra Zealots at Core0 yields Core−2 and “Not enough Core Supply.” Removal returns0 and clears the finding. Later Observer repairs Sentries' Support−1 to0. Zero counters may disappear from the compact resource summary; this is not proof of budget activation. |
| Terran negative/zero supply | MarinesA+B consume3Core; Marauders make−1. Problem dialog agrees with summary. Academy leaves−1; Barracks returns0 and zero known violations. |
| Exceeded/repaired purchase budget | Protoss1220 at limit1000 gives220over and one violation;1500 clears it. Terran570 at500 gives70over and one violation;600 clears it. |
| Limit-conditioned configuration | Protoss1500 offers Acropolis/Breach; Terran/Zerg600 offer Abandoned Camp/Agria Valley. Predicate uses configured limit, not current spend. Mission profile conditions resolve but display remains uncertain (below). |
| Marines regression | A:6/160 → Shield6/180 → Reinforce9/240 → remove Reinforce6/180 → final9/240. B added separately remains6/160 with both controls unchecked. |
| Primary revision/history | Save → reload → shelf Open preserves selections/1500. Remove Leg Enhancements1220→1200; Undo restores1220/checked; Redo restores1200/unchecked; reselect/save/reload/Open returns final1220. |
| Terran recovery | Before first save, open a second tab on5297 → Recover roster. Restores570/600,60G,9+6 Marines, Marauders2, setup pairs and source. Original test tab closed, recovered tab saved normally. No owner data failure injection. |
| Terran revision/history | Normal saved Open; remove Foam570→550; Undo570; Redo550; reselect/save/reload/Open570. Both Marine quantities and600override persist. |
| Zerg save/reopen | Normal save/reload/Open retains520/600,30G,12Zerglings,3Roach,Queen, both setup pairs and checked Adrenal Glands. No separate Zerg recovery claim. |

Each final restored validation is **valid/incomplete**, zero known violations,
with exactly seven unresolved resource-limit findings. This is explicitly not
complete legality: omitted pre-game bounds are a defect, and selected-reference
uncertainty is reported separately from those seven aggregate findings.

The exported final drafts retain history (Protoss20 past, Terran19, Zerg11;
all future stacks empty after final edits). All six StarCraft payload hashes
match the frozen files exactly, canonical downloaded source identity and restored
revision remain99261754, and overrides remain1500/600/600. Read-only restore,
validation, cost and reference inspection leave each restored roster unchanged.
The final backup preserves the source bytes rather than reserialized XML.

## Reference and paper tasks

Primary Sentries lookup, desktop and phone:

- Selected composition2×Sentry remains separate from source-owner1×Sentries.
  Shd2, Spd4/7, Eva6+, Arm5+, HP4, Size1 and Supply1:0|2:1 are readable.
- Assault Disruption Beam8", all targets, RoA2, Hit2+, Damage1, INSTANT; combat
  beam rangeE, ground, RoA2, Hit3+, Damage1. Empty Surge/S.Die remain explicit.
- Full Restoration (within4", remove all debuffs, Reaction1PE), Force Field
  (8" placement, crossing/removal restrictions, Active1PE), Guardian Shield and
  selected Solid-Field Projector survive. Unselected Hallucination is absent.
  Following Force Field opens the same full shared reference and annotation.
- Phone390×844 uses labelled cards without ordinary horizontal scrolling; full
  effects/costs remain reachable. Desktop1440×1000 retains all fields and prose.

Terran MarinesA lookup, desktop and phone:

- Spd4/7, Eva5+, Arm5+, HP2, Size2 and authored supply thresholds are readable;
  blank Shd is “Empty value,” not a fabricated zero. Composition9×Marine identifies
  squad size separately from the1×Marines source-owner labels.
- C-14 Rifle12", all targets, RoA2, Hit3+, Light surge, D3, Damage1; combat Strike
  rangeE, ground, RoA1, Hit5+, Damage1. No unselected Rocket Launcher or Bayonet.
- Full Stimpack damage/speed/Precision effect and Active1CP survive; selected
  Combat Shield full evade eligibility and Active1CP survive under Movement Phase.
  Following the C-14 Rifle reference preserves its12"/D3/1 fields. BUFF, PRECISION
  and NON-LETHAL DAMAGE rules retain full prose.
- Neither this check nor a purchased upgrade claims an activated in-game buff is
  permanently applied to base statistics. Known conditional Shield price and model
  changes are distinguished from unresolved limits/blank-field formatting.

The actual primary **Compact** preview was generated through Roster actions →
Print / Save PDF, and **Save HTML** downloaded the unmodified standalone document.
`protoss-compact.html` is188498bytes, SHA256
`6587499126dd87e93621b8a7543678ea335dc1800ea91f7a4e8568da1ca79777`.
Its selected totals, six combat units, model/source distinction, upgrades, full
Sentry prose and setup names agree with the saved primary. Both mission-size
variants retain uncertainty annotations. Maps preserve Setup prose but also
render two literal Markdown/data-image blocks (50013 and49854characters), a
material paper/reference-usability limitation, not a deliberately trimmed sample.
The document has no script, image or external resource-loading attributes under
static HTML inspection. This inspection does **not** substitute for offline render.

Opening that saved file using `file:///.../protoss-compact.html` was denied by the
browser tool's URL policy. No alternate surface, proxy or browser workaround was
used. The file is provided for owner retrieval. No PDF was generated; no actual
pagination, physical print or whole-app offline claim. Prior Unit sheets/40k PDF
matrices remain historical evidence only, not rerun or granted owner acceptance.

## Applicable limitations and smallest reproductions

| Mechanism / classification | Selected occurrence and impact | Reliance / next bounded work |
| --- | --- | --- |
| **1. Confirmed application defect: dropped pre-game group bounds** | All armies' Deployment Maps and Mission Card. Both author roster-scoped shared selections min/max2 including children; UI reports0selected/optional and child report is complete0..Infinity with no diagnostic. Can omit required setup without a corresponding finding. | Wrapper existence is checked; nested exact-two is not. Preserve unsupported applicability as incomplete at owning group/structural boundary before separately establishing execution semantics. |
| **2. Applicable unsupported behavior: zero/hidden-default activation** | All seven Core/Elite/Support/Hero/CP/BM/EN counters in all armies. Source declares0/hiddentrue plus unconditional hiddenfalse modifier. Could affect allowed composition/resources. Separate negative errors cover only four supply types; they do not settle maximum-zero activation or CP/BM/EN meaning. | Supported Minerals/Gas ceilings and signed sums work. Do not invent max0 or call counters cosmetic/exempt. Needs controlled source/reference evidence before activation support. Prevents complete-army acceptance. |
| **2. Applicable unsupported profile visibility** | Both selected mission cards, four profile diagnostics per army. Standard Engagement and Skirmish variants both remain visible/unresolved; affects effective setup reference. | Limit predicates evaluate completely and invert at1000 as authored. `characteristics.ts:unsupportedAttributes` rejects modifier `id`; investigate verified inert-ID handling with bounded visibility tests, not general query expansion. |
| **2. Unsupported map image interpretation with demonstrated usability impact** | Acropolis/Breach primary fields contain50013/49854characters; Terran/Zerg Abandoned Camp/Agria Valley36830/34320. Literal Markdown/data-image payload, no image interpretation. | Source/Setup prose is retained, but primary paper output is not acceptable as a practical map reference. Requires a separately approved bounded safe embedded-image policy; no arbitrary markup/images/external loading. Not XML decoding loss. |
| **3. Source-data limitation: missing cost types** | Two selected Marine roots each contain five zero-valued undefined type IDs; ten diagnostics. | Defined-resource totals match, but full cost coverage remains incomplete. Do not suppress zeros or modify third-party data. |
| **3. Source metadata discrepancy** | GST revision12, each faction declares13. All tested immutable closures. | Exact bytes/dependency context identified; compatibility/version intent is not certified. No pin refresh. |
| **3. Authored model typing / faction restriction** | Stalker1 and Roach3 children are upgrades; Guards Khalai-only. | Preserve source distinctions and initial target failure. No invented model count repair or Daelaam success claim. |
| **4. Presentation-only for inspected fields** | Seven authored formatRules are exactly `^$`→`-`: UnitShd and Assault/Combat Surge/S.Die/Keyword. Selected blanks show “Empty value.” | Inspected nonempty stats/prose/arithmetic unaffected. No general claim that formatting expressions are harmless. Map payloads are a different mechanism. |
| **5. Environment/tool limitation** | Offline file navigation blocked; one Vite Windows watcher interruption recovered. | Online browser journey/artifact creation verified; offline rendering and PDF pagination not established. |
| **6. Unexercised beyond bounded cases** | Broader rule carrier/link precedence, routing, dynamic limits, other factions/units/options and game-play activation combinations. | Fourteen selected rule reports (11Terran,3Zerg) have complete names/visibility; no selected rule-name precedence ambiguity found. Do not generalize to all imports or later roadmap behavior. |

Minimal ordinary-control reproduction of the confirmed defect: from the frozen
Protoss closure create an army, add Khalai, open Deployment Maps and Mission Card
without children. Each says optional; aggregate has zero known violations, while
seven unrelated resource-limit warnings keep the overall state incomplete. This
incompleteness does not honestly account for the dropped setup requirements.

Exact authored group/bound identities:

| Owner | Group | Min/max IDs |
| --- | --- | --- |
| Deployment Maps `d444-6767-cbfc-bf56` | `2ce1-a1c6-f9fd-44e7` | `8ad5-439a-6995-e45a-min`, `8ad5-439a-6995-e45a-max` |
| Mission Card `64dc-91cd-0746-c7d3` | `0b67-92aa-2c8c-613f` | `d962-3552-7a38-0c38-min`, `d962-3552-7a38-0c38-max` |

Independent actual XML import/create/Khalai/child-inspection probe confirms both
minimum0, maximumInfinity, remaining0, completenesscomplete, diagnostics[].
`initialization.ts:selectionBounds` filters via `isPotentialParentSelectionBound`
before diagnosis; explicit roster scopes are discarded. Structural validation
contains only two root-wrapper bounds and generic constraints omit the group IDs.
The isolated probe characterizes the defect; it is not a new normal-suite success
criterion that encodes an intended requirement. No repair was made.

## Bounded 40k smoke and independent review

A gitignored evidence page on5297 copied only the authorized established draft
through the existing decoder and IndexedDB store, with a separate draft ID/name.
This is **adapter-seeded disposable-copy reopening**, not from-zero browser
construction or browser file-import acceptance. All StarCraft samples predated
this helper and were created by normal controls.

`Acceptance - Dark Angels reference copy` retains14army units plus three setup
roots,2000points and the original eight A-snapshot payloads byte-for-byte. Original
file hash remains`9f0f9b94152102db6fddb378f34eaea9855874dc0b12ceb9ebfa0441cdc4937c`.
Normal Open verifies Captain2+ / base3+ / Set by Artificer Armour, Feel No Pain5+;
Impulsor Deadly DemiseD3 / Firing Deck6; Lieutenant Supporting checked on
Intercessor squad1 and not squad2, with Lethal Hits “Added by Lieutenant” in the
attached squad's profiles. Update saved draft/reload/Open retains14/2000 and
Captain2+/5+. Source status honestly says local/no recorded source, repository
freshness cannot be established. No universal40k compatibility claim.

Independent native reviewer worked in detached baseline worktree
`C:/CodexACLTest/starcraft-acceptance-review-20260925`, isolated because native shell
permissions cannot enforce read-only access. The lane was source-led arithmetic,
configuration/limitation analysis and actual production-API execution, not a
review of the lead's summary. It read the frozen selected definitions and ran:

1. Minimal import/create/Khalai/group inspection (1test passed,1.12s).
2. Restore each of the three exported browser-built drafts; compare retained-byte
   hashes, provenance, budgets, costs, validation, per-root reference reports and
   unchanged roster (1test passed,1.59s).

The lead read the probes, checked the implicated source boundaries and reran both:
**2tests passed,2files,2.00s**. No external-provider review is claimed; native
execution was useful for local frozen-data/probe verification without provider
setup or transfer. No third-party data is committed. The reviewer did not run the
browser journeys; the lead did. This distinction is intentional.

## Gates and publication

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check`: pass.
  Existing build chunk-size advisory only.
- Normal `pnpm test`: **1072 passed /34 optional skipped**,99passed+8skipped files
  of107;16.31s.
- Configured `pnpm test --maxWorkers=4`: **1106 passed /0 skipped**,107files;58.45s.
  These overlap the normal tests; do not add them as separate coverage populations.
- Configuration: `ROSTERFORGE_BSDATA_JSON_DIR=E:/GitHub/wh40k-11e`,
  `ROSTERFORGE_CORRECTNESS_SNAPSHOTS=C:/CodexACLTest/rf-data-parity-evidence-20260910`,
  `ROSTERFORGE_STARCRAFT_PILOT_DIR=C:/CodexACLTest/starcraft-pilot-evidence/data`,
  `ROSTERFORGE_PRINT_DARK_ANGELS=C:/CodexACLTest/rf-cost-evidence-20260911/cost-reference-draft.json`.
  No PRINT_OUTPUT. Existing XML/JSON, costs, Supporting, initialization, budgets,
  persistence/recovery, reference grouping and renderer-timing coverage executes.
- An initial lint attempt caught undeclared browser globals in the new gitignored
  evidence helper. Its globals were declared; the full final gates above passed.
  No production code, assertion or timeout was weakened.
- Publication is documentation/evidence metadata only on`codex/starcraft-pilot`.
  Result commits are recorded in the separate handoff; exact-final CI receipt is
  recorded in Actions and the completion response. No main/PR/deploy/source update.

## Owner samples and next boundaries

Leave plain preview **http://127.0.0.1:5297/** running. Its ordinary shelf contains:

- **SC Acceptance - Protoss Khalai** —1220/1500M,130/200G.
- **SC Acceptance - Terran Raiders** —570/600M,60/200G.
- **SC Acceptance - Zerg Swarm** —520/600M,30/200G.
- **Acceptance - Dark Angels reference copy** —14units/2000points.

The complete primary HTML and draft backup are in the local evidence directory
above. They contain frozen game content and remain uncommitted. Owner can inspect
that HTML offline; this assignment did not overcome the tool restriction.

At most the next three implementation checkpoints, each requiring a new owner
assignment, in priority order:

1. **Pre-game group uncertainty safeguard.** Stop dropping applicable unsupported
   roster-scoped group bounds; report incomplete requirements at the owning
   boundary. Establish exact-two execution separately if evidence supports it.
2. **Source-default counter activation.** Controlled evidence for the seven
   zero/hidden counters; implement only demonstrated semantics, preserving
   negative-supply and purchase-budget distinctions. No guessed maximum-zero.
3. **Mission profile visibility.** Verify inert modifier-ID treatment, then a
   bounded repair/tests for selected Standard Engagement versus Skirmish profiles
   while retaining unsupported behavior and source provenance.

Map image/reference policy remains a recorded material paper-usability limitation,
not hidden by those priorities or folded into an unauthorized print redesign.
Completing the first three alone would not certify paper readiness. Stop after
this acceptance report; no proposed repair or next format feature has begun.
