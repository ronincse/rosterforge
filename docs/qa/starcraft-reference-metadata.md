# SC-06: declarative reference metadata

Status: roles, static ordering and characteristic layout delivered. Source-authored
formatting remains deferred; SC-06 is not wholly complete.
Baseline: `0149238fbbda1f1a2990c7823b294883305c72cc`.
Frozen StarCraft source: `99261754e0449bbaaa04e6890e1625b144f9ece1`.

## Contract

Profile type identity resolves in the defining profile's document and reachable
catalogue/dependency closure. Multiple reachable declarations remain ambiguous,
consistent with the existing materialized-link boundary.
Ambiguous, missing, malformed, unknown and unsupported dynamic hints remain
inspectable presentation uncertainty, not new legality findings. Characteristics
resolve only inside that resolved type. Linked profiles use their definition.

Recognized static kinds are model, weapon, ability and tag. They route to Model
stats, Selected weapons & equipment, Abilities & rules and Additional information,
respectively. Unrecognized explicit roles use neutral additional information.
Only genuinely absent roles may use the verified legacy Unit, Description and
weapon-type label fallbacks. Other absent types remain neutral. A longText field
can request prose layout without inventing a profile role. Applicability and
visibility reports remain separate and unchanged.

Within each fixed semantic section, finite non-negative integer sortIndex values
order profile-type groups ascending. Explicit values precede absent/invalid values;
ties and unsorted type groups preserve first encounter, with profile order stable
inside each type group (an A/B/A sequence groups as A/A/B). No English phase ordering,
source-array mutation, durable ordering or dynamic metadata execution is added.

Every characteristic is retained in authored order. longText uses a full-width
field; annotation remains labeled text attached to its profile. Mixed profiles
retain short fields and all long fields, including unnamed fields. Cost and Supply
remain reference values, never new purchasing/resource semantics. Existing safe
rich text and effective-value evidence remain authoritative. Empty, missing, zero
and unresolved values are not replaced with authored formatRule output.

The public editor explicitly offers these roles and labels longText as description /
long text and annotation as annotation/cost. Its profile-type order control edits
sortIndex; the order UI places entries without an index after indexed entries.
This supports the static subset above, not claims about its private runtime:
- [ProfileType.vue](https://github.com/giloushaker/nr-editor/blob/a347b0d96f71e40fffb30d8994897d276638c43f/components/catalogue/right_panel/fields/ProfileType.vue)
- [CharacteristicType.vue](https://github.com/giloushaker/nr-editor/blob/a347b0d96f71e40fffb30d8994897d276638c43f/components/catalogue/right_panel/fields/CharacteristicType.vue)
- [SortOrder.vue](https://github.com/giloushaker/nr-editor/blob/a347b0d96f71e40fffb30d8994897d276638c43f/components/catalogue/right_panel/fields/SortOrder.vue)

## Before

At isolated origin 5281, normal Browse/load/create and Shield/Reinforce controls
produced 6/160 -> 6/180 -> 9/240. The saved disposable draft is named
`SC06 pre-change Marines`. Its selected reference shows Stimpack and Combat Shield
(Rules (Movement Phase), type ec1d-63b8-de26-1894) as Effect/Cost columns under
Weapons & equipment, between Assault Weapon and Combat Weapon. Unit-owned
profiles say 1x Marines; that is ownership, not the nine-model composition.
C-14 Rifle retains decoded 12-inch text. Desktop 1440 and phone 390 baseline
screenshots are retained outside the repository in the session evidence folder.

Source-authored formatting remains deferred. No full StarCraft compatibility
claim follows from improved presentation.


## Frozen examples and results

All examples below use the unchanged manifest in starcraft-pilot-baseline.md.
Profile identities, not display labels, select their type definitions in the
profile definition's reachable dependency closure. The ten GST profile types
contain four observed roles; seven characteristic format rules remain inert.

| Selected profile / exact identity | Type identity / metadata | Repaired selected reference |
| --- | --- | --- |
| Marine / 74d2-7be5-c0fe-34ad | Unit 18be-d8b9-8024-4925, model, index 1 | Model stats; source owners separate from actual 9/6-model composition |
| C-14 Rifle / 135f-4d13-ea93-602d | Assault Weapon e8b6-5b29-e80c-a3b3, weapon, index 2 | Weapons, distinct from Combat Weapon 7b96-11fe-e87a-e61c, index 3 |
| Stimpack / cedc-b9f6-3d53-5ae3; Combat Shield / 3501-7421-3370-82a0 | Movement ec1d-63b8-de26-1894, ability, no index; Effect 1c06-5502-fb5a-616e longText; Cost e11e-d579-0142-8de4 annotation | Abilities with phase label, full Effect and associated Cost; previously equipment columns |
| Restoration / e1ee-c45e-2390-2106 | Any Phase a305-fb8b-8be3-f0fe, ability, index 4 | Abilities before unsorted Movement profiles |
| Force Field / 3bed-bc23-eac6-223a; Guardian Shield / 2271-b066-bdd9-af32 | Movement ability above | Full prose and activation annotations, stable source order |
| Squadron / fc8c-6bff-6d80-b316; Metabolic Boost / 48be-d8b9-d2f4-1f6b | Any Phase index 4; Assault 07ee-ef54-fbf7-5ca9, ability, no index | Zerg Abilities; Squadron precedes the unsorted Assault group |
| Abandoned Camp / dm-profile-00 | Deployment Map f4ab-3b0f-781c-91de, absent kind, index 7; both fields longText | Neutral Additional information; Setup and unnamed field both retained |
| Divide and Conquer / c76d-ab1c-ca2b-96ae and 571f-e41c-de1a-7c01 | Mission Card fa2f-c1b9-95af-1670, ability, index 5 | Both authored variants retained with all seven short/long fields and unresolved visibility evidence |

Before-code browser screenshots directly establish the Marines placement defect.
Other factions' before-placement follows the inspected generic classification path;
it was not separately photographed before implementation. A fictional ability
with unfamiliar fields and the misleading typeName Unit failed the Abilities
assertion before the renderer change and passes through actual import/create/render
afterward. No faction, weapon-name, phase-substring or ID allowlist classifies it.

## Boundaries and implementation

Typed XML and JSON projections expose kind/sortIndex. data-graph's graph-owned
resolver caches scalar presentation hints and exact source/path type keys, including
id-less profiles and nested information groups. Missing definitions, multiple
reachable candidates and duplicate characteristic declarations remain unresolved or
ambiguous. A catalogue-local duplicate is not presumed unique merely because the
graph's separate duplicate-ID diagnostic suppresses that case. Characteristics
resolve inside their unique containing type, never by a global field name.

Explicit unknown/blank/non-string/duplicate JSON metadata and dynamic metadata
modifiers cannot silently opt into legacy heuristics. sortIndex accepts decimal
non-negative safe integers only. Negative, fractional, exponent, nonnumeric and
unsafe values remain inspectable fallback. Dynamic hints are not executed.
Presentation details expose these states; no new army violation is fabricated.
Existing visibility/completeness/effective-value reports remain authoritative.

The headless web classification adds scalar metadata to the existing conservative
reference groups. It does not widen grouping equivalence, merge different owner
reports or enumerate unselected catalogue alternatives. Nested information groups
keep their hierarchy and original owner reports, using a scalar source-key map
for the same role/layout behavior. No new document/byte-bearing leaf prop or React
graph resolver was introduced. The original exact-occurrence disclosure remains.

Ability fields use labeled cards; longText takes the full row and annotations stay
attached to their profile. Duplicate field identities use the field-list layout
rather than losing a value during column alignment. All source fields and their
order survive, including empty, zero, unnamed, modified, hidden and unresolved
values. The existing safe rich-text renderer receives the already parsed value.
Encoded script-looking text stays inert; double-escaped values remain literal.
The mission's source Opponent&amp;#x27;s therefore correctly remains
Opponent&#x27;s after one XML layer. The map's large authored markdown/data-image
field is retained as inert text (36,830 characters; zero rendered images), not
truncated or loaded as an external resource.

Composition sums actual selected model occurrences/amounts independently, without
ancestor multiplication. If an owner is unavailable the summary is omitted.
Profile owner attribution remains distinct; neither composition nor role multiplies
attacks or profile values. Numeric annotation Cost and tag Supply have an explicit
fictional regression: 999/888 reference values leave actual Tokens/Supply purchases
at 7/2 before and after reference projection. A player label containing &quot;
remains unchanged. No tag becomes a game keyword.

## Browser and saved-source acceptance

Isolated http://127.0.0.1:5281 used only disposable armies. Existing tabs, browser
origins, armies, worktrees and any running servers were preserved. At session start
older advertised preview ports were not listening; this checkpoint leaves 5281
running. Screenshots are local session evidence, not committed third-party data.

- **Terran:** normal Browse/load/create, 6/160 -> Shield 6/180 -> reinforced 9/240.
  The draft saved before presentation edits reopens with 9/240 and corrected
  sections. C-14 retains 12-inch text; Movement abilities retain complete prose
  and Cost. Removing Reinforce leaves 6/180 with Shield checked. A 225 Minerals
  player limit survives save/reopen with the same selected source identities.
- **Pre-game:** normal controls select Abandoned Camp and Divide and Conquer;
  no legality bypass. Map fields remain neutral. Both mission variants retain
  all seven fields, including their unresolved visibility/completeness warning.
  Supply 8/4 remains reference text; Minerals stays 180 of the 225 limit.
  Another save/reopen preserves map, mission, six Marines, Shield and budget.
- **Protoss:** warm Browse explicitly reports restored metadata, load has zero
  import diagnostics. New SC06 Sentries has 2 models/130 Minerals. Restoration,
  Force Field and Guardian Shield show complete 4/8-inch, apostrophe and 1 PE
  content under Abilities. Save/reopen repeats the correct placement and values.
- **Zerg:** warm Browse/load has zero import diagnostics. SC06 Zerg has 12
  Zerglings/180 Minerals; Squadron, Devastating Charge and Metabolic Boost retain
  full text/1 BM annotation. Model RoA remains 2, not multiplied by twelve.
  Missing Faction/Core Supply findings remain. The disposable draft was saved.
- **Layout:** actual screenshots at 1440 and 390 for all three factions, and a
  focused Marines 320 prose check. No horizontal page/reader overflow in the
  measured phone cases; one reference content tree. Section jumps, keyboard-opened
  nested C-14 popup, Escape and exact trigger focus return passed. Exact source
  disclosure retained model/child ownership. No physical-device, screen-reader,
  dark-mode or print/PDF pagination claim.

Screenshot names include sc06-before-marines-{desktop,phone}.png,
sc06-after-marines-abilities-{1440,390,320}.png, sc06-sentries-{1440,390}.png,
sc06-zerg-{1440,390}.png, sc06-zerg-abilities-390.png, sc06-map-desktop.png,
and sc06-mission-{desktop,390}.png. They reside in the session visualization
folder ending 01a09368-161b-7c60-a3c6-b0afa598b7de.

Repository metadata summaries do not contain profile presentation metadata.
Warm byte-cache acquisition re-ingests verified bytes, and saved drafts rebuild
the graph from retained sources. No cache invalidation, byte-cache identity,
source pin, database or draft-format change is needed. SC-05 metadata schema 4,
legacy path-scoped XML identity aliases and unresolved budget-alias behavior stay
unchanged. Original source files and all four manifest hashes remain exact.
No player/copied labels are rewritten. Existing persistence/recovery tests protect
associations and bytes; repeated browser reopen protects the changed display path.
Print's generated model contains names/quantities/costs/findings, not these profile
characteristics; generated-output regressions pass without a print layout change.

## Review, verification and remaining work

Primary implementation, integration and browser acceptance were lead-owned.
A bounded native reviewer used detached starcraft-reference-review at baseline
0149238, reviewed source/diffs/fictional tests, and approved the final nested-group
extension with no remaining actionable issue. Review challenged identity closure,
conflicting/malformed metadata, duplicate fields, nested groups, missing metadata,
raw-byte boundaries and saved compatibility. Seven extra resolver cases address
malformed JSON, duplicates and id-less nested profiles. Final review caught a
fixture replacing a different Supply field; the corrected test explicitly asserts
packet Cost 999 and tag Supply 888 before checking the unchanged 7/2 ledger. The reviewer did not run
tests in its dependency-free worktree; all executed gate results below are lead
results. The known Claude launcher remained unavailable and was not retried;
this is not an external Claude review claim.

Final lint, typecheck, build and whitespace gates pass. Normal tests: 957 passed,
32 optional corpus skips; 92 passed / 7 skipped files, 14.84s. The dedicated
fictional import/render/accounting file passes both tests. Build: 191 modules,
JS 841.09 kB (gzip 233.03), CSS 83.98 kB (gzip 15.01); existing chunk-size advisory
only. Final configured run after review correction: 989 tests passed, 99 files,
zero skips, 44.29s. All seven optional integration files executed, including
30 existing 40k corpus checks and two StarCraft checks. Pricing, Supporting,
initialization, budgets, persistence/recovery, XML/JSON safety, reference grouping
and the renderer timing regression remain covered. No data pin or third-party
file changed. Source-authored formatting (seven format rules), dynamic
presentation hints, source freshness, additional budget activation/dynamic limits,
general typed queries and broader 40k category work remain unsupported/deferred.
The known source revision mismatch and orphan cost types remain qualified.
This checkpoint improves reference presentation; it does not establish full
StarCraft legality or parity with a moving reference application.
