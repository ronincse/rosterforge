# Distinct print templates — 2026-09-28

Baseline `c044f2fe2c60b73df389d9302e3a02f0aa572712`, clean, fetched and equal
to upstream on `codex/starcraft-pilot`. Shared print/UI task was idle; other
worktrees, owner Downloads, saved armies and playable origin 5303 were preserved.
This checkpoint replaces the former pagination-only design contract. It does
not grant final owner acceptance or expand game-rule support.

## Current design contract

Both templates consume the same evaluated scalar document and safe rich-text,
image, profile-sharing and explanation-sharing helpers. No duplicate evaluator,
new persistence identity, imported template execution or source refresh.

| Compact reference | Unit sheets |
| --- | --- |
| Bordered flowing unit blocks; name/composition and evaluated cost together | Strong title/role/cost band and concise composition |
| Tight full-width model/weapon tables | Prominent labelled model-stat panels; separate full-width weapon tables |
| Short labelled ability fields inline, full prose retained | Short metadata beside full prose; source profile type remains visible |
| Adjacent loadout/relationship regions when space permits | Clear vertical reading order and compact keyword/rule footer |
| Units share pages where they fit | Each combat occurrence starts a new printed page; long units continue |

The ability split is a field-length presentation heuristic, not recognition of
arbitrary game phases or effect semantics. Every label/value remains literal;
the longest field stays in the main region. Unknown/long schemas retain readable
full-field fallback. Multi-paragraph prose retains block formatting, with no
text splitting or second decoding pass. No forced one-page sheets or tiny type.

Order is overview, combat references, army references, supporting setup/missions,
then glossary/qualifications. Original U/P/R identities remain stable. A selected
unit/model descendant makes its root a combat sheet. Supporting placement uses
the existing complete category report and a bounded verified identity pair:
StarCraft `sys-ce49-e853-2fea-6af1`, category `9b82-d933-7075-8237`, uniquely
resolved in its owning system. English names, flatten flags and mandatory counts
are not classification evidence. Unknown/ambiguous non-units stay in army reference.
This changes document order only, not roster ordering or applicability.

Exact duplicate composition is omitted from unit options only when composition
is printed; other loadouts survive. Routine empty-option filler is removed.
Repeated headings and explicit name/U footers identify continuations, including
the two separate Stalkers. No equivalence changes to shared rows or rule bodies.

## Principal case and provenance

Owner `forcewright-Protoss roster-{compact,sheets} (1).html` files were inspected
read-only. They are presentation baselines, not editable drafts or proof of saved
provenance. New Recruit HTML and pretty PDF informed visual hierarchy only.

The optional integration fixture reconstructs the latest Nerazim selection through
production ingestion/session commands using already frozen `445a410f0c7880f389217c7381d89bc1502f4366`
Protoss/GST files, checked by SHA256. It has Zeratul, three Zealots, four Adepts with
Resonating Glaives/Glaive Strike, two distinct Stalkers each with Path of Shadows
and Fury of the Nerazim, Forge/Gateway/Twilight Council, Dirt Side/Agria Valley,
and Skirmish Hold Position/Artefact Hunt. Totals and explicit limits are 1000
Minerals /1000 and 100 Gas /100. There are 11 roots, 30 selected occurrences,
five combat references and 44 profile records. It has a new disposable name/ID
and local-import provenance; no owner save history or repository descriptor is
invented. All 44 profile record mappings and rendered value multisets match the
owner baseline in both templates, as do both exact embedded image URIs.

Baseline pins remain SC `99261754e0449bbaaa04e6890e1625b144f9ece1`, 40k A
`04c62fcd041b3808c39d5c46fd677c704027b979`, B `5b261ec423d5d017bb733c4f3c0a760b085d5ca5`.
The separate 445a evidence is not a pin update. No third-party bytes are committed.

## Direction, browser and paper evidence

Before the full matrix, Zeratul and Zealots were rendered from the same production
model in both candidates, compared with previous output and New Recruit hierarchy,
and independently reviewed. The reviewer caught a missing source profile-type
label, paragraph-formatting risk and cramped Supply value; all were corrected.
At identical 734px unit width the final Compact Zeratul is 858px high versus
1135px previously (about 24% less), with all seven abilities and ordinary body size.
Sheets is 1262px with visibly different stat/ability organization; page counts are
not the design criterion.

On isolated origin 5307, a visible disposable fixture installer called the
production IndexedDB draft store, then ordinary saved-army Open, unit card,
Roster actions and Print controls were used. This was a reconstructed draft,
not an owner-file import or a claimed fresh Browse journey. Zeratul's screen
stats/weapons/abilities match both outputs. Final Compact → Sheets → Compact
retains identical Compact HTML, five stat panels only in Sheets, and two fully
decoded maps throughout. All changes saved and disabled Undo/Redo remain after
printing; the test also asserts the original session/source bytes are unchanged.

Both actual Save HTML downloads were found in Downloads, copied unchanged to the
evidence directory and opened independently by file URL with networking disabled:
two 540×540 maps, zero external requests, zero broken fragment links. They are
distinct from captured preview HTML. The download-event observer timed out on an
earlier attempt even though the file was written; this is not a failed download.
Print / Save PDF was invoked through the normal control; the native OS dialog is
not observable in IAB, so native-dialog/physical printing is not claimed. Unit
tests verify the selected document passed to that existing print window.

The principal Nerazim PDFs were generated from those actual downloaded files in offline Edge
155.0.4283.18: Letter/A4 portrait, 100%, CSS 14mm margins, browser headers/footers
and print backgrounds off. Application page counters remain. Continuous preview
is explicitly not exact pagination. Auxiliary 40k and fictional PDFs use HTML
from the production-renderer test harness, not UI downloads.

| Final sample | Compact | Sheets | Visual inspection |
| --- | ---: | ---: | --- |
| Nerazim Letter | 11 | 17 | Every page |
| Nerazim A4 | 11 | 16 | Every page |
| Four-entry 40k reference excerpt, Letter | 11 | 13 | Every page |
| Fictional unfamiliar schema / long unit, Letter | 6 | 7 | Every page |

All 92 final pages inspected: lead 35 (primary Compact22 + fictional13), isolated
reviewers 57 (primary Sheets33 + 40k24), plus overlapping reading checks. Final
paragraph-style adjustment changed only primary Compact page10 on each paper size
and fictional Compact pages; these were inspected again. Other final page rasters
were byte-identical to reviewed versions. A suspected stress footer overlap was
disproved by exact PDF text bounds (body ≤743.3pt, content edge752.3pt, footer768.4pt).
No clipped tables/maps, lost paragraphs or unowned continuation remains in these
samples. Whole maps and new-unit page starts still create whitespace; short
continuations/notes pages remain. No physical printer, PDF tagging or universal
browser certification.

Reading tasks passed: Zeratul Arm/Eva5+, blade Dmg2 and bearer, Prophetic Vision
Reaction(1PE) and full effect; Adepts Glaive Strike ownership; U7/U8 distinct
Stalkers; maps/setup and glossary scope. The labelled four-entry 40k excerpt
retains full-army 2000pt context: Captain Sv2+/Armour FNP5+, distinct 5/10-model
Intercessors and launcher D3/D1 bearer, attached Lieutenant Lethal Hits only on
U6, Impulsor Deadly Demise D3/Firing Deck6 and complete transport/ability text.
The full 14-unit integration test retains 47 rule records and all profile/member
mappings. The fictional 42-paragraph ability and 12-field unknown schema retain
all text, separate owners and harmless script-looking literal data.

## Verification and boundaries

Focused coverage includes semantic parity/immutable input, source-identity versus
renamed/ambiguous/unsupported categories, full latest reconstruction, distinct
DOM compositions, selected Blob/print documents, maps and safe rich text. Tests
that required identical template markup now compare facts and record mappings.
Normal suite: 1165 passed, 37 optional skipped (127 files); configured suite:
1202 passed, zero skipped, all 127 files. These populations overlap. Lint,
typecheck, build and whitespace gates pass; existing large-bundle advisory remains.

Configured inputs: BSDATA_JSON_DIR=E:/GitHub/wh40k-11e;
CORRECTNESS_SNAPSHOTS=C:/CodexACLTest/rf-data-parity-evidence-20260910;
STARCRAFT_PILOT_DIR=C:/CodexACLTest/starcraft-pilot-evidence/data;
PRINT_DARK_ANGELS=C:/CodexACLTest/rf-cost-evidence-20260911/cost-reference-draft.json;
STARCRAFT_LATEST_DIR=C:/CodexACLTest/starcraft-map-review-20260926/.cache/owner-feedback/445a410f0c7880f389217c7381d89bc1502f4366.
Each uses the existing ROSTERFORGE_ prefix. Fictional fixtures remain normal tests.

Independent review used two isolated native reviewers: early design/classification,
final code and visual reading tasks. Claude's previously recorded OAuth limitation
was not retried; no external review is claimed. Reviewer feedback led to explicit
type/paragraph/Supply fixes, named continuation footers, precise four-entry excerpt
labelling and composition-dedup guarding. Lead retained implementation/integration.

Private samples, scripts, hashes and logs: `C:/CodexACLTest/print-design-20260928/`.
Actual final download hashes: Compact `681d886a65b575da884258f3a32d15bf88fd6a9082502a1eebb75e9fd68d766`;
Sheets `12453ba729a69be07785b8da6e79dfed83b5fcd4314ed63aad0c58b80c5fe536`.
No new diagnostic codes, evaluator semantics, source pins, storage or image policy.
Precedence/routing/imported-format/source/orphan-cost qualifications remain.
Stop after this print checkpoint; owner layout acceptance remains pending.
