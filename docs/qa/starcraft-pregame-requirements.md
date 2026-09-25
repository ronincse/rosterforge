# StarCraft pre-game requirements and mission visibility

Baseline: `53d3e5f36f1dc0e4471e77fa3a395cfbcfe92a87`, clean and upstream-equal;
print/UI task idle. This follow-up preserves the historical failed acceptance
report and unchanged StarCraft/40k pins. Complete-army acceptance remains blocked.

## A — shared group requirements

The current-code fictional reproduction failed five assertions: shared roster
requirements appeared complete with minimum 0, maximum Infinity and remaining 0;
unsupported nonshared/traversal variants also appeared complete. Frozen source
inspection reproduced the same omission for Deployment Maps (`2ce1-a1c6-f9fd-44e7`)
and Mission Card (`0b67-92aa-2c8c-613f`). Projection and materialization retained
the bounds. `selectionBounds` filtered non-parent constraints before diagnosis;
transparent groups were absent from durable occurrences, so general validation
could not recover them. Local planning's limitation became false optionality.

The evidenced bounds are static shared roster min/max 2 with child-selection
inclusion. Count member amounts across matching group instances, not wrappers,
parent amounts, names or descendants belonging to a concrete member. Existing
source-path membership resolves inline/linked groups and retained wrappers.
[BattleScribe developer explanation](https://github.com/BSData/wh40k-7th-edition/issues/2880)
establishes shared aggregation across parent instances. The
[pinned editor](https://raw.githubusercontent.com/giloushaker/nr-editor/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Query.vue)
warns of nonshared differences; this checkpoint does not generalize that domain.

Configuration and structural validation consume shared constraint results. Counts
span the army while removal controls remain local. Zero/one violate, two satisfy,
and synthetic production-API excess violates. Duplicate shared requirements are
coalesced with source identity, including retained-wrapper general reports.
No arbitrary defaults are selected. Unsupported scopes, sharing, mixed domains,
modifiers and multiple forces remain incomplete; missing group links qualify the
owner. Existing local creation defaults remain intact.

Independent native review found two false-complete risks (context-dependent own
limits coalesced across wrappers; distant ancestor modifiers omitted). Both were
repaired by limiting new execution to static bounds and checking selected ancestry.
Reviewer rerun: 32 tests across 2 files passed. Primary focused regressions: 16 pass;
configured complete suite: 1122 pass, zero skips, 108 files, 41.41s. Lint/typecheck,
build and whitespace gates are recorded in the final handoff. The 40k Guardian
Defenders test now expects nine explicit previously dropped self-scope diagnostics;
its 33 initialized additions / 41 occurrences and exact defaults remain unchanged.

## B - mission visibility

The isolated fictional reproduction compared otherwise identical XML modifiers
with/without `id`: the ID-bearing path was unresolved although its limit condition
was complete. Three initial tests failed (one UI failure also required a correctly
scoped selector). The owning visibility attribute check treated identity metadata
as behavior. Only exact `id` is now accepted there; no import stripping, suffix
allowlist, general characteristic change, or condition/precedence bypass.

The [pinned editor modifier UI](https://raw.githubusercontent.com/giloushaker/nr-editor/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Modifier.vue)
models profile `hidden` as Boolean `set`; its
[ID remapping code](https://raw.githubusercontent.com/giloushaker/nr-editor/028526ee2bce36ce26f024e33d762ab9f257445b/assets/editor/bs_editor.ts)
separates node identity from modifier field references. This is editor/source
corroboration, not a claim of complete schema conformance.

Frozen Divide and Conquer (`867c-9d4b-143d-eca1`) and Frontlines
(`0bea-4ed7-720a-e4c3`) each have two default-visible profiles. Their own modifiers
have only `id`, `type=set`, `field=hidden`, `value=true`; no scope, repeats, affects,
or groups. The roster `limit::5bcf-897a-a5c9-d0e8` conditions have complete exact
limit context. Standard profiles hide below 1001; Skirmish profiles hide above 1000.
The four modifier IDs remain projected and retained:
`b474-7e47-89af-8c52`, `1f86-b0e8-e12f-3f38`,
`60fd-7937-08ef-ac78`, `0495-3a9a-5ea1-90ca`.

`showReferenceProfile` is shared by ordinary selected-unit, supplementary-group
and army-print models. It omits only complete known-hidden profiles. Raw reports
and technical source disclosures retain every source record; unresolved/no-report
profiles stay visible. Seven fictional tests cover independent missions, ID
parity, default-hidden reveal, true/false/unknown conditions, unknown attributes
(including another *Id attribute), unresolved scope, linked/shared profile and
grouped modifiers, repeated limit/reset/history/restore, actual App rendering and
safe generated HTML. Existing missing/ambiguous target and unsupported-carrier
coverage remains. The frozen integration adds 60 profile observations across all
three factions at 999/1000/1001/600/1500, checking full Format fields in both models.

## Browser and lifecycle evidence

Plain Vite **http://127.0.0.1:5299/**, separate storage origin from preserved 5297.
A new Protoss army used ordinary live pinned Browse/download/load/create controls.
Khalai plus empty wrappers showed two actionable violations. Saving/reopening
preserved them. Maps and missions each followed 0 -> 1 -> 2: required two, required one,
then requirement met. Further choices disabled at the maximum; API fictional tests
cover restored excess. Removing a mission restored the violation; Undo/Redo and
reselection restored the corresponding states. No arbitrary choices were created.
Problem links routed to the owner configuration. Phone 390x844 controls/problems
and full mission reference, and desktop 1280x720 references, were inspected.

Disposable complete copies were prepared from the existing three-army acceptance
export, with only separate draft identities/names, then loaded through a temporary
origin-restricted test page using the production decoder/IndexedDB store. This was
adapter-seeded copying, not a claim of rebuilding all three armies in the browser.
A fourth pre-repair-format fixture copied Zerg and removed only its map/mission
children (and cleared fixture history). It is a constructed incomplete legacy copy,
not evidence that an owner's previously saved incomplete army was discovered.
Normal Open restored its unchanged 520M/30G ledger and two selected 0 / min 2 / max 2
violations without rewriting choices.

| Disposable saved army | Ledger / Minerals limit | Retained pairs / active references |
| --- | --- | --- |
| SC Pregame - Khalai setup | Minimal configuration | Acropolis/Breach; Divide and Conquer/Frontlines; both Standard at source 2000 |
| SC Pregame - Protoss Khalai |1220M/130G /1500 | Acropolis/Breach; same mission pair; two Standard Engagement profiles |
| SC Pregame - Terran Raiders |570M/60G /600 | Abandoned Camp/Agria Valley; same mission pair; two Skirmish Level profiles |
| SC Pregame - Zerg Swarm |520M/30G /600 | Abandoned Camp/Agria Valley; same mission pair; two Skirmish Level profiles |
| SC Pregame - Incomplete legacy copy |520M/30G /600 | No map/mission children; two missing requirements |

Protoss normal budget controls 999/1000 showed only Skirmish Level; 1001 showed only
Standard Engagement, despite spending 1220 throughout. Reset restored source 2000;
explicit 1500 was restored, autosaved and reopened with both Standard profiles and
both selected pairs intact. Terran/Zerg copies were independently reopened. Terran
retained separate Marine squads 9/240 and 6/160; full reinforcement/removal behavior
remains covered by configured tests. Original acceptance samples/tabs/server 5297
were not changed. The five disposable drafts and server 5299 remain available.

Actual Terran Compact Print & export preview contained two Skirmish mission
profiles with all seven fields and P3/P4 -> U2 mapping; no Standard mission variant.
The generated iframe and visible mission section were inspected. Literal map
payloads still make the document impractical: no paper-ready, PDF pagination or
offline-file-opening claim. No new image/HTML privileges were introduced.

## Review and gates

A committed separately as `d628979`; B follows separately. Claude Code was attempted
once with tools disabled and sanitized source/diffs/fictional tests; OAuth refresh
failed before inference. No retry, provider changes or external review claim.
An isolated native reviewer challenged shared-vs-parent identity, unknown-vs-optional,
deduplication, modifier metadata, and screen/print agreement. A blockers were fixed
as described above. Final B review found no blocker; 58 focused tests plus linked/
grouped challenge passed (overlapping primary populations), and 20 frozen-profile
comparisons confirmed ID parity. Lead read the changes and reran relevant checks.

A configured suite: 1122 passed, zero skips, 108 files, 41.41s. B normal suite: 1095
passed/35 opt-in skipped, 109 files, 25.12s. Final configured suite: 1130 passed,
zero skips, 109 files, 44.69s. The configured run includes pinned 40k JSON, A/B
correctness snapshots, StarCraft XML and saved Dark Angels print fixture. Lint,
typecheck, build and whitespace gates pass (existing bundle-size advisory only).
Final source verification matched all manifest sizes/SHA-256 values: five StarCraft
files (four XML plus README) and eight files in each 40k A/B closure;
the configured 40k JSON checkout remains at A. No source pin changed.
No timeout or game arithmetic assertion was weakened. The new print assertion
uses profile type/fields rather than an incorrect unprefixed print-unit label.

## Classification and stopping boundary

**A: fixed for the evidenced static shared roster group shape.** Nonshared or
unsupported scopes/traversal, multiple/nested forces, modified bounds and uncertain
identity remain incomplete. Shared requirements are not reinterpreted per parent.
**B: fixed for the evidenced profile visibility shape.** Exact ID metadata no
longer causes uncertainty; other unsupported behavior/precedence stays qualified.

Complete-army acceptance remains **B - blocked**. Seven zero/hidden-default counter
activations, map embedded-image interpretation, source revision mismatch, orphan
cost types, unestablished rule precedence and imported formatting remain open.
Owner print-layout acceptance remains pending. No counter activation, map rendering,
source update, migration, broad audit, main integration or further checkpoint.
