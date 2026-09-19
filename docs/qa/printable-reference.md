# Printable army reference checkpoint

Baseline: `4fb397cc8b287fc8896ab68057e7bdb3e285c37e` on
`codex/starcraft-pilot`, clean and published; SC-06 writer idle.

## Reference mapping (before implementation)

The supplied New Recruit unit-sheet PDF has 18 Letter pages; all inspected.
Page 1 is an army/configuration index; pages 2-15 are named unit sheets with
selected composition, equipment, stats, abilities and relationships; pages
16-18 contain army/shared rules. The second PDF, the printed HTML, has 10 Letter
pages; all inspected. Pages 1-8 flow category/unit blocks, pages 8-9 hold the
glossary, and page 10 is blank apart from browser chrome.

Use the overview, stats-first hierarchy, full rule descriptions and glossary.
Compact flows units; Unit sheets starts each occurrence on a fresh page.
Avoid the sample's cramped side columns, joined model quantities, cross-unit
deduplication, browser URLs/timestamps and trailing blank page. Full-width prose
and conservative within-unit grouping take priority over matching page counts.
The examples are layout evidence, never game-data input.

HTML source/style inspection found inline click/hover handlers and extension
artifacts. Original bytes remain unchanged outside the repository. Local HTML
browser navigation was denied by tool security policy. The owner explicitly
approved proceeding from the HTML source/styles and supplied rendered PDFs;
no alternate browser workaround was attempted.

## Delivered contract and before/after

Before: the print renderer led with roster/catalogue/definition keys and an
ordered technical selection tree, costs and check counters; it had no ordinary
selected profile/ability reader. After: the overview names configuration,
composition, equipment, resources/limits and explicit attachments, followed by
stats-first category/unit blocks and full explanations. Compact is the default;
Unit sheets changes page starts, not substantive content. No second PDF engine,
template editor, engine rule inference or persisted document state was added.

The model reuses the selected reference/effective-value/grouping contract,
SC-06 role/order/layout metadata, shared cost rollup and extracted loadout and
category-rule helpers. Root and descendant keywords are distinguished. Different
occurrences, scopes and uncertain rule variants stay separate; glossary entries
carry public unit/bearer/group ownership. Source-only phrase matches are limited
to unambiguous root shared definitions, not local rules in unselected units.
Attached descriptions are not restricted by that source-only lookup guard.

## Reproducible inputs and positive content checks

- Dark Angels: disposable restoration of
  `C:\CodexACLTest\rf-cost-evidence-20260911\cost-reference-draft.json`, SHA256
  `9f0f9b94152102db6fddb378f34eaea9855874dc0b12ceb9ebfa0441cdc4937c`.
  Frozen original bytes compare unchanged after rendering. All 17 roots remain
  (3 setup, 14 army units), 2000/2000 points with inherited cost qualifications;
  Intercessors 5/80 and 10/150, Knights 240/240/260 remain distinct. The selected
  Lieutenant Supporting edge and affected Intercessor weapon values remain.
  Effective/uncertain values agree with the shared reader, not the New Recruit
  sample's independent Aeldari catalogue. The Redemptor's unresolved category
  name is explained without exposing its ID.
- Terran: exact StarCraft `99261754` four-file hashes asserted by the optional
  test. Terran Armed Forces plus Marines with Combat Shield and Reinforce:
  9 Marines, 240 Minerals, configured limit225, signed supply counters, full
  ability Effect/Cost fields. Activation costs remain prose, not expenditure.
- Protoss: same pinned closure, Daelaam plus Sentries2/130. Full Restoration,
  Force Field and Guardian Shield text, 4/8-inch distances, apostrophes,
  activation annotations and INSTANT explanation remain.
- Fictional: mixed5-model composition/loadouts, second-force traversal,
  modified values, hidden/unresolved variants, nested/category-linked rules
  and a reference cycle. Oversized document has 42 complete paragraphs,
  12-field unfamiliar schema, two weapon modes, same-name units with different
  costs, two Shield variants, multiple qualified resources and malicious-looking
  literal text. Empty Keywords cells stay empty. Both presets have identical
  substantive HTML. Failed/no-data reports are visibly qualified.

Optional variables: `ROSTERFORGE_BSDATA_JSON_DIR=E:\GitHub\wh40k-11e`,
`ROSTERFORGE_CORRECTNESS_SNAPSHOTS=C:\CodexACLTest\rf-data-parity-evidence-20260910`,
`ROSTERFORGE_STARCRAFT_PILOT_DIR=C:\CodexACLTest\starcraft-pilot-evidence\data`,
and `ROSTERFORGE_PRINT_DARK_ANGELS` as above. 40k HEAD remains
`04c62fcd041b3808c39d5c46fd677c704027b979`; A/B manifests and all SC hashes
unchanged. No third-party exports, army bytes or corpus files are committed.

## Retained samples and paper evidence

Evidence root (outside the repository, not an OS temp directory):
`C:\Users\stone\.codex\visualizations\2026\08\29\01a04b68-d064-74e0-bab5-9ff1859fb65b\print-reference`.
Under `output`, `{dark-angels,terran,protoss,stress}-{compact,sheets}.html`
are the real production exports; corresponding `-{A4,Letter}.pdf` are browser
outputs of exactly those files. Open an HTML file directly in a browser or a
PDF in a viewer. They need no ForceWright server, catalogue, fonts or network.
These are local personal samples, not repository fixtures or published armies.

The optional integration tests and synthetic test write those HTML files when
`ROSTERFORGE_PRINT_OUTPUT` names that output directory. `render-output.cjs`
uses headless Microsoft Edge154.0.4258.18 with all network requests blocked,
portrait Letter/A4, scale1 (100%), CSS14mm margins, backgrounds off, browser
headers/footers off. It consumes the exact exported HTML, not a hand-authored
PDF approximation. `pdf-settings.json` records the twelve real-army PDFs;
`pdf-settings-stress-final.json` supersedes its four stress entries.

| Document | Compact A4 | Compact Letter | Sheets A4 | Sheets Letter |
| --- | ---: | ---: | ---: | ---: |
| Dark Angels | 33 | 36 | 42 | 44 |
| Terran | 4 | 4 | 4 | 4 |
| Protoss | 4 | 4 | 4 | 4 |
| Oversized fictional | 6 | 6 | 7 | 7 |

All213 final pages are covered by visual review, not just text extraction.
`output/pages-review6` contains the final real-army PNGs, text and manifest;
`output/pages-stress-final` contains the final stress equivalents. Earlier
review folders and the review6 stress images are superseded. The lead inspected
all32 StarCraft pages. The independent reviewer inspected all155 Dark Angels
pages and the final26 stress pages. Pair images retain each page at1400px
height; every beginning, middle, continuation and final page was opened.

Iteration corrected overflowing/crushed stat columns, isolated short glossary
headings, anonymous long-prose and unit-tail continuations, and finally the
12-field unknown-schema continuation. The last change affects only profiles
with more than8 fields; real-army scalar facts have zero such profiles, so their
accepted documents are unchanged. Full-width prose, repeating table context
and bounded weighted columns preserve content without shrink-to-fit. Some
short Unit-sheet continuation pages and narrow StarCraft word wrapping remain
paper-efficiency tradeoffs, not missing content or clipping.

## Ordinary browser workflow (separate from PDF generation)

Dedicated origin `http://127.0.0.1:5291/`; existing origins/armies/servers and
user tabs were preserved. A disposable Dark Angels copy opened via Saved drafts
at2000 points. The normal action menu opens the new preview and both layouts.
Its exported HTML and Terran HTML opened independently in a separate tab.

In a separate Edge QA session, normal local-file import/create/add produced an
**unsaved** Protoss army with Daelaam and Sentries, 130 Minerals. Print / Save PDF
opened the actual populated browser print window. Both Save HTML buttons
downloaded real files to Downloads, named
`forcewright-Print QA unsaved Protoss-{compact,sheets}.html`. Preview index links
scroll within the preview. Closing the print window/preview leaves130 and the
unsaved status unchanged. The controls use one immutable snapshot; export never
saves, edits or migrates the army. Blob downloads work independently of print.

The in-app browser did not expose native print/download completion. Edge exposed
the populated print window and actual downloads, but OS print-dialog chrome was
not controllable. Therefore the16 PDF files use the owner-authorized headless
Edge path above. No claim of clicking a native Save-PDF button, completing a
physical job, or exercising another browser's pagination. Blocked popup and
generation-error messaging, layout readiness, cancellation and independent
download are additionally covered by UI tests.

## Independent review and limits

The lead implemented and integrated; the isolated native reviewer used
`E:\GitHub\rosterforge\.codex-print-review` at4fb397c and read-only candidate
inspection. The installed Claude launcher was already unavailable; no reinstall,
repeated retry or external-review claim. Review challenged quantity/keyword
scope, source-only rule leakage, nested descriptions/cycles, bearer attribution,
safe rendering and every Dark Angels/final stress page. Findings were corrected
and reviewed again; no remaining blocking finding.

The PDF skill's render/inspect loop drove the pagination corrections. CSS supports
the tested settings; physical printers, universal browsers, accessibility of PDF
tagging and arbitrary pathological source documents are not certified. SC-06
format expressions/dynamic hints, orphan cost definitions, source revision
mismatch, general association semantics and budget gaps remain unchanged.
Automatic phrase lookup is bounded (256 matches/unit,32768 chars/text); full
attached text remains even when lookup is limited. Ambiguous or unselected local
explanations are not guessed. Conservative dedup can repeat identical-looking
owner-dependent descriptions. No new diagnostic code or evaluator semantics.

## Regression gates

Final lint, typecheck, build and `git diff --check` pass. The configured
`pnpm test --maxWorkers=4` run passes 996 tests in 102 files with zero skips
(48.56s). The ordinary `pnpm test` run passes 962 tests with 34 optional corpus
skips (94 passed/8 skipped files, 19.42s). Focused final synthetic tests pass
3/3. Build: 199 modules, JS 1043.42kB/gzip295.35, CSS85.01kB/gzip15.20;
the existing large-chunk advisory remains.

One heavily concurrent configured run had 995 passes and one existing App UI
5000ms timeout; the final configured rerun uses at most four workers without
changing its timeout or assertions. Both configured corpus families execute;
the ordinary run's skips are not counted as corpus verification.

## Owner-review follow-up: reference consistency (2026-09-17)

> Historical reproduction: the Captain anchor exclusion and unevaluated rule-name
> observations below are superseded by the [2026-09-19 shared-engine batch](reference-engine-correctness.md).
> Original artifacts and all other historical observations remain intact.

The infrastructure above is accepted as a foundation, not final owner acceptance
of paper usability. Baseline PDFs and frozen inputs remain unchanged. Follow-up
starts from pilot `6f615c5496e298515d2162a9aa304f32574c394c`.

Captain occurrence `selection-24c1843d-3935-4ca6-82a5-03ab794c4376`, entry
`6c10-5b51-5bc0-8d2c`, profile `c1ba-2289-ba1-9cb8`, has Sv characteristic
`450-a17e-9d5e-29da`: base/effective `3+`, complete, no applied steps. Selected
Artificer Armour `e57e-d55a-be75-2205` declares `set 2+` and an annotation via
`scope=model`, `self.entries.recursive.9cfd-1c32-585f-7d5c.profiles.Unit`.
The anchor is that Captain; descendant traversal excludes the anchor itself.
`reachesAffectsTarget` returns false without uncertainty. Screen and print both
receive 3+; print did not discard an evaluated 2+. This is a demonstrated
source-selector/routing consistency gap, NOT proof to change global traversal.
The projection now gives a specific local note for this narrowly identified
selector shape, matching selected upgrade, profile type, field and category.
It preserves values/reports and explicitly withholds intended applicability.
Follow-up needed: establish this selector's intended anchor semantics against
pinned source and observed reference behavior before any engine/source repair.

Impulsor `bfb1-7512-e1a3-9fa2` has Deadly Demise link
`58e0-31f7-43d3-b1ef` (`append name D3`) and Firing Deck link
`31bc-9145-ac64-454e` (`append name 6`). Rule inspection evaluates visibility,
not names; there is no effective rule-name report to project. Screen and print
now expose source-authored operands with explicit unevaluated qualification,
including definition/link and conditional/grouped distinction. They do not
compute or assert effective parameters. A dedicated rule-name evaluation
boundary with conditions/precedence tests remains separate work. Armour's
Feel No Pain append `5+` is covered by the same presentation boundary.

Independent isolated trace reproduced both cases. Synthetic qualification and
rule tests: 22 passed; frozen Dark Angels projection regression: 1 passed
(the unrelated StarCraft test unconfigured in that targeted run). No source,
evaluator, storage or saved-army mutation. Full final gates follow presentation.

## Owner-review follow-up: density and final paper evidence (2026-09-17)

This supersedes the earlier 213-page layout evidence for the revised candidate,
not the preserved baseline files or foundation acceptance. Final owner acceptance
of paper usability remains pending. Correctness/projection is separate commit
`0aac6eb`; the following presentation commit retains all scalar source records.

The overview is one row per army occurrence with size, resources, meaningful
selected upgrades and explicit relationships. Configuration stays configuration;
full loadouts remain in the unit details. Original order and U references agree.
Print-only profile aliases compare complete fields/notes/nested scope and
conservative effect signatures, not names alone. Exact safe rendered explanation
bodies are shared with all original R mappings, names, parameters, owners and
selected/source-only qualifications. Distinct scopes, incomplete effects and
changed values/notes remain separate. No evaluator-equivalence change.

Repeated ordinary ability labels/root attribution are removed only when context
already supplies them; unfamiliar named fields and SC phase/Effect/Cost remain.
B bearer legends preserve equipment keywords and quantities; P records identify
affected profiles. N legends share identical qualifications, while Captain's Sv
and Impulsor's authored D3/6 operations stay local. Long/unknown profiles reflow
vertically; ordinary body remains 10.5pt/1.28 Arial, not shrink-to-fit.

### Final retained matrix

Evidence root:
`C:\Users\stone\.codex\visualizations\2026\08\29\01a04b68-d064-74e0-bab5-9ff1859fb65b\print-reference-followup`.
`output` holds eight production HTML files, sixteen matching PDFs, scalar facts
and `pdf-settings.json`. **Only `output/pages-final-reviewed` is the final PNG,
text and page-manifest evidence**; earlier iteration folders are superseded.
The baseline review folder and original print-reference evidence are untouched.

| Document | Compact A4 before → after | Compact Letter | Sheets A4 | Sheets Letter |
| --- | ---: | ---: | ---: | ---: |
| Dark Angels | 33 → 21 | 36 → 22 | 42 → 24 | 44 → 27 |
| Terran | 4 → 3 | 4 → 3 | 4 → 4 | 4 → 4 |
| Protoss | 4 → 2 | 4 → 3 | 4 → 4 | 4 → 4 |
| Oversized fictional | 6 → 5 | 6 → 6 | 7 → 7 | 7 → 7 |

Dark Angels overview shrinks from three pages to one; Sheets also removes its
separate mostly-empty configuration page. Compact Letter: overview p1, units
p2–17, glossary p17–22 (p17 shared). Compact A4: overview p1, units p1–16,
glossary p16–20, reading notes p21. Sheets A4: overview p1, units p2–19,
glossary p19–23, reading notes p24. Shared pages are not double-counted totals.
Sheets Letter: overview p1, units p2–22, glossary/notes p22–27 (p22 shared).

The old Sheets Letter short tails on p7/16/30/32 no longer exist in those units:
Captain now spans p2–3, Assault Intercessors p15, Redemptor p20, Gladiator p21.
This is not a one-page-per-unit claim. Other short Letter tails remain at p14
(Hellblaster keywords/rules), p17 (Heavy Intercessor rules) and p19 (Impulsor
rules/parameter qualifications). U-prefixed rule context identifies their owner.
Captain has some whitespace before its sizeable Leader block. Compact loadouts
can continue across pages with repeated context. Final A4 reading-note pages
are sparse but self-contained. Stress Sheets A4 p5 contains only a rule line and
cost qualification; fresh-unit page policy remains. No arbitrary page target.

Rendering: exact production HTML, headless Edge154.0.4258.18, blocked network,
portrait Letter/A4, scale1, CSS14mm margins, backgrounds off, browser headers off,
`preferCSSPageSize:false`. CSS-generated Page X of Y footers are visually verified;
U/R/P/N remain document references, explicitly not page numbers. No second PDF
engine or post-generation document patching. Existing servers were not restarted.

Lead visually inspected all 27 StarCraft and 25 stress pages. Protoss Keyword
and INSTANT no longer split mid-word; activation fields stay distinct. All42
stress paragraphs, both weapon modes, all12 unfamiliar fields, same-name distinct
Shield rules, literal unsafe-looking text and uncertainty survive. No clipping
or overlapping text found. Independent Dark Angels review is recorded below.

### Regression gates and browser check

Final lint/typecheck/build and whitespace checks pass. Ordinary suite:967 passed,
34 expected optional corpus skips,95 passed/8 skipped files,21.01s. Configured
`pnpm test --maxWorkers=4`:1001 passed,103 files,zero skips,62.69s. Final focused
artifact generation:7/7 passed. Build201 modules,JS1053.53kB/gzip298.72,
CSS85.01kB/gzip15.20; existing chunk advisory only. The configured final run does
not set `ROSTERFORGE_PRINT_OUTPUT`, so it does not mutate reviewed artifacts.
Both pinned corpus families and the frozen Dark Angels SHA above execute.

Focused tests preserve every original member, changed value/qualification/effect
variants, nested information scope, setup relationships, long/fallback effect
notes, rule anchors, exact-body sharing, differing parameters/text/markup and
both presets' substantive facts. Source objects/bytes do not enter leaves.
Normal existing 5291 QA copy: open preview, switch both presets, follow U14 index
link, close; still14 units/2000 points and no save/edit. User origins/tabs remain.
The earlier unsaved/download/native-window foundation checks remain historical
evidence, not a claim they were repeated in this follow-up.

Remaining accuracy boundaries: Captain intended selector-anchor applicability
requires separate evidence before engine repair; rule-name conditions/precedence
need a dedicated effective-metadata boundary. Neither is silently resolved by
sharing or layout. Source revisions, saved armies, budgets, main and storage
remain unchanged; no full-accuracy, universal-browser or physical-print claim.

### Independent final review

Isolated native reviewer at `E:\GitHub\rosterforge\.codex-print-density-review`
reviewed all94 final Dark Angels pages (21+22+24+27), with no blocking layout
finding. Together with lead coverage, all146 final pages were visually inspected.
The reviewer directly checked final facts against HTML:17 selections,14 army
units,131 original profile records →104 displayed rows, all131 unique P IDs and
213 profile-member records represented exactly; zero mismatches in members,
effect keys, nested scope or original attribution. All47 rule/scope records map
to25 exact rendered bodies; fourteen Oath of Moment and four Deadly Demise
explanations each share their body without merging occurrence mappings.

Actual reading tasks passed: Lancer Laser Destroyer Damage D6+3 and its single
bearer/P122 (Compact Letter p16, Sheets Letter p21); U6 Bolt Rifle's one Sergeant,
three ordinary Intercessors and one B1 grenade-launcher bearer (p5 Compact/p6
Sheets), distinct from U7's unmodified unit; Oath's fourteen U4–U17 mappings
(Compact Letter p21/Sheets p26); Impulsor source-authored D3/6 operations and N3
unevaluated boundary; Captain Sv3+ beside the specific selector-gap warning p2.
These are lookup/preservation checks, not independent game-rule certification.

Review findings corrected before the final gates: quantity aggregation, nested
information scope, setup-only relationships, affected-P attribution, fallback
effect notes and short glossary body keeps. Claude2.1.240 was available, but an
external review invocation was denied before execution for private-code transfer
authority; no code was sent and no retry/external-review claim is made. Native
independent review completed the bounded lane. The PDF skill's render/inspect
workflow drove the pagination checks and corrections.

Revised owner samples are copied, not regenerated, to
`C:\Users\stone\Downloads\ForceWright Print Review 2026-09-17 Revised`:
Dark Angels Compact Letter, Sheets Letter, Protoss Sheets A4 and Dark Angels
Compact HTML. `REVIEW-NOTES.md` records application/handoff commits, paper
settings and SHA256 hashes. Original review samples remain intact and private.
