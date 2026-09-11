# Reference-army orphan cost references — 2026-09-11

## Conclusion and baseline

**Outcome B: source-data limitation; no application repair needed.** The three
selected costs reference a type that is absent from the complete pinned
repository, not a definition lost by RosterForge. Keep their source-located
warnings and incomplete aggregate cost coverage. Supported primary points and
the inspected structural/constraint domains remain independently established.
This is not a claim of full BattleScribe/New Recruit legality.

Baseline: clean selected `codex/list-builder-ui-overhaul`, HEAD and upstream
`b1058b44dc8a8566a9fdea9de357b1dd0b82bb70`. Existing worktrees, servers, tabs and
armies were preserved. No source pin, imported bytes, saved-army migration,
evaluator, reporting policy or UI changed. This is a documentation-only
checkpoint, not another engine repair.

Primary data: **BSData/wh40k-11e** at
`04c62fcd041b3808c39d5c46fd677c704027b979` (A). Verified the configured checkout
revision and scanned immutable Git objects, not its working-tree files. All
46 JSON documents were structurally inspected; an exact-ID Git search over
all tracked content independently limited matches to Space Marines. The eight
files retained in the reference draft each match the existing A manifest's
byte length, SHA256 and Git blob SHA1. B's captured eight-file closure was not
needed to establish A's result; no full-repository B claim is made. No moving
snapshot or foreign definition was substituted.

## Exact identity and locations

Missing type ID: `c5fb-5b9b-89f6-86c`. Every occurrence in A is a `cost.typeId`
reference: **10 distinct authored costs, all numeric zero, all in
`Imperium - Space Marines.json`**. There are **zero declarations**, duplicate
declarations, modifier-field references, condition/constraint/repeat references,
or other string matches to this ID anywhere in that repository. The selected
closure is complete, including the game system and all authored dependencies.
An unrelated catalogue does not declare the ID either.

The completed army instantiates exactly these three different source entries
once each; this is neither one warning repeated for a single materialized entry
nor three copies of the Warlord definition. The other seven costs are not
selected in this army. All three retain label `pl`, value `0`, exact type ID,
source provenance and zero resolved cost-type candidates. The label does not
establish what the resource means, its limits, or its applicability.

| Owner | Source definition | Actual occurrence in the copied reference army | Authored JSON path, under `catalogue/` |
| --- | --- | --- | --- |
| Gladius Task Force | `d2dc-693e-b491-b16d` | `selection-e006b44f-3a3b-467c-bfa3-52fd0a782f84` | `sharedSelectionEntryGroups[0]/selectionEntries[0]/costs[10]` |
| Captain's default loadout | `c6aa-b3a5-4ff3-e0d3` | `selection-767c5fa8-579e-4ef9-bfeb-aff1526c058a` | `sharedSelectionEntries[180]/selectionEntryGroups[0]/selectionEntries[0]/costs[0]` |
| Shared Warlord, selected through Captain link `a89c-b01e-ffab-8ebb` | `caa-f869-3cbd-b48e` | `selection-7dafe1e7-34aa-4d39-9e46-a99a3685e433` | `sharedSelectionEntries[0]/costs[0]` |

The normalized projection/diagnostic paths intentionally differ from raw JSON
array paths. They retain XML-compatible container/item segments:

```text
catalogue/sharedSelectionEntryGroups[0]/selectionEntryGroup[0]/selectionEntries[0]/selectionEntry[0]/costs[0]/cost[10]/@typeId
catalogue/sharedSelectionEntries[0]/selectionEntry[180]/selectionEntryGroups[0]/selectionEntryGroup[0]/selectionEntries[0]/selectionEntry[0]/costs[0]/cost[0]/@typeId
catalogue/sharedSelectionEntries[0]/selectionEntry[0]/costs[0]/cost[0]/@typeId
```

## Source-to-status trace

1. The preserved bytes contain the three cost objects above and no matching
   `costType` declaration. `battlescribe-data/src/project.ts:projectCost` retains
   the name, type ID, numeric value, generic node and source path. Cost-type
   projection is a separate declaration surface; a cost label cannot create one.
2. `data-graph/src/resolve.ts` indexes declared cost types and creates exact
   `costType` reference edges. These edges have no target. Materialization keeps
   the original cost projection, including the shared Warlord cost on its link.
3. `evaluation/src/costs.ts:costDraft` finds zero candidate types and records
   `missingCostType`. `evaluateChoiceCosts` preserves each excluded item and
   `costIssueDiagnostic` emits `EVALUATION_COST_TYPE_MISSING`, with the actual
   occurrence ID, definition key, zero candidates and source path. No total is
   manufactured for the missing type. Cost completeness becomes `incomplete`.
4. Supported validation is a separate composition: the unchanged army has
   `validity: valid`, `completeness: complete` **for supported checks**, 238
   structural and 378 constraint checks satisfied. The cost report does not
   silently become complete because these domains pass.
5. `apps/web/src/roster-workspace-model.ts:workspaceHeaderSummary` folds costs
   and checks conservatively. The ordinary reopened UI says **"0 known
   violations | some rules not checked"**, **"Coverage limited"**, and
   **"RosterForge could not evaluate every catalogue cost. Known problems only
   cover the checks that completed."** It shows **3 excluded costs**, **0
   unresolved selections**, and the three retained warning codes under Developer
   cost diagnostics. This wording accurately describes the current boundary.

## Acquisition, import and restoration comparison

Used isolated origins 5245 (local) and 5247 (Browse), never writing the original
5244 draft database. A read-only call to the normal draft store copied exactly
`QA conditional creation`; its original timestamp and records were not edited.
The normal Browse UI on 5247 indexed 46 documents / 36 selectable catalogues,
then loaded Dark Angels and its eight-file closure with zero load diagnostics.
Zero load diagnostics does not mean selected-cost completeness.

To avoid rebuilding 193 selections, a disposable browser evidence harness used
the production import/acquisition, restoration, cost/validation and draft-store
APIs with this same army. Local import consumed its complete verified A closure.
Remote acquisition used the ordinary UI's verified metadata/byte caches and the
same production service. Only the disposable remote copy's source-provenance
keys were rebound to the acquired files' IDs; authored IDs, paths, selection
quantities/loadouts and association endpoints were unchanged. There was no
production migration. Both copies were saved through the normal draft store,
loaded/reimported, and then opened from the **ordinary app's saved-draft shelf**.
The helper is test setup, not a claim that the whole army was manually rebuilt
through Browse or that a new local file-picker journey was repeated.

| Path | Resolved candidates for missing ID | Points | Structural satisfied / violated / unresolved | Constraint satisfied / violated / unresolved | Missing-type diagnostics |
| --- | --- | --- | --- | --- | --- |
| Complete A local import, same army | 0 | 2,000 | 238 / 0 / 0 | 378 / 0 / 0 | 3 |
| Local save/reopen, including normal app | 0 | 2,000 | 238 / 0 / 0 | 378 / 0 / 0 | 3 |
| Pinned Browse acquisition, same army | 0 | 2,000 | 238 / 0 / 0 | 378 / 0 / 0 | 3 |
| Browse save/reopen, including normal app | 0 | 2,000 | 238 / 0 / 0 | 378 / 0 / 0 | 3 |

Repository summaries contain declared `costTypeIds`, not complete cost-type
objects. The actual 46-document index contains **no declaration for this ID**.
`remote-catalogue-source.ts` supplies that set to graph diagnostic classification,
not evaluation resolution. `resolve.ts:isNonBlockingCostReference` can defer
named-cost missing-reference messages at catalogue load, and can recognize a
repository-known zero-valued reference; neither case resolves an edge or includes
a selected cost. A display label, an existence hint outside the closure, an
actual in-context definition and an unresolved edge are distinct states.

Drafts intentionally persist original closure bytes and provenance, not the
repository-wide index. `use-app-controller.ts:openRosterDraft` rebuilds via
`prepareLibrary` before `restoreLocalRosterSession`. Existence hints from outside
the closure are not an evaluation input promised by that contract. In this case
there is no relevant missing hint to lose, nor a definition to restore. Both
paths preserve **all eight source files byte-for-byte** after save/load. No
acquisition, projection, indexing or restoration defect was demonstrated.

## Actual impact and remaining uncertainty

**Primary points:** no demonstrated effect on the supported 2,000-point total
or its limit. `queryCostConstraint` filters exact type IDs. An excluded item
with a different *known* ID does not make a points observation unresolved; an
item lacking a type ID would, but that is not this case. Included point modifier
sequences and the force points requirement remain complete.

**Other resources/composition:** no authored dependency on the orphan type was
found. The other ten reported currencies remain separate: points 2,000,
Detachment Points 3, Enhancements 1, and seven zero totals. This does not establish
the absent resource's meaning, display/limit metadata, or external game rules.
RosterForge correctly withholds that type's total rather than claiming zero is
an evaluated currency total. Warlord, loadout and Gladius selections still count
in selection/category queries; their existence is not removed with their costs.

**Direct/grouped/indirect mechanisms:** direct and nested-group numeric cost
modifiers match `field === typeId`. Conditions, cost constraints and supported
cost observations likewise require an explicit type identity; repeats do not
infer a resource from a label. Broad `affects` routing selects occurrences, not
an arbitrary cost field: its field match is still exact. The complete A scan
found no field/query/repeat/other occurrence of this ID beyond the ten cost
references. Therefore no authored operation in the inspected pinned data was
found that changes these zero bases, queries their totals, routes a change to
them, or makes another supported requirement depend on their values. The
absence of such dependencies **and** the evaluated supported reports establish
the bounded impact, not the zero values alone.

The scan is not a complete semantic proof for every interpreter. Unknown
extensions, opaque/label-based all-resource behavior, absent metadata and rules
not encoded in these files cannot be inferred from an exact-reference scan.
No concrete applicable unsupported operation was identified that warrants an
additional engine checkpoint. Do not generalize this conclusion to other
missing types, nonzero values, future snapshots or armies. Retaining the warning
and aggregate incompleteness is intentional, not a failure to finish this task.

## Reference acceptance and review

Both copied armies reopen with 193 selections, 14 units, unchanged configuration
(Strike Force / Gladius / Priority Assets), Captain Warlord, and Lieutenant
Supporting to the first Intercessors. Its 17 weapon-keyword rows retain Lethal
Hits. Model quantities and loadouts were inspected in the ordinary reopened UI:
Intercessors 1 Sergeant + 3/8 ordinary + 1 launcher, Sergeants' Power fists;
three Knights units each four maces and a Great Weapon master; the previously
chosen pistols, launcher, vehicle weapons and two-weapon occurrences remain.

The freshly evaluated ledger is unchanged: Captain100, Lieutenant45,
Intercessors80/150, Knights240/240/260, Hellblasters110, Assault Intercessors75,
Heavy Intercessors100, Impulsor70, Redemptor195, Lancer160, Whirlwind175 = **2,000**.
All three setup roots contribute zero primary points. This report does not
repeat or claim new interactive delete/undo/redo/retarget testing; those accepted
repairs remain covered by their unchanged tests. Normal reopened remote app's
warning/error console was empty; developer source warnings remain visible.

Claude Code 2.1.240 was attempted with Read/Grep/Glob only, no shell/writes/agents,
Chrome, or MCP services. It reached its session quota before returning findings;
no successful Claude review is claimed and it was not retried. An independent
native reviewer in isolated worktree `C:/CodexACLTest/rf-cost-review-20260911`
completed the impact challenge at the exact baseline, with no edits or external
services. The lead verified its code references. Review confirmed exact-resource
isolation and the metadata distinction, and explicitly required the qualified
"no authored dependency found" conclusion rather than universal harmlessness.

Local disposable evidence is retained outside the repository at
`C:/CodexACLTest/rf-cost-evidence-20260911`: exact source-role scan, copied draft,
local/remote before-and-after scalar reports and harness sources. No third-party
source data or saved army is committed. An initial repository lint attempt found
only the temporary evidence helpers inside `.cache`; they were moved outside
the checkout before the clean gate rerun, not exempted via lint configuration.

Fresh gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and
`git diff --check` passed. Standard suite **715 passed / 30 skipped**, **79 passed
/ 6 skipped files**, 22.53s. Unchanged optional corpus pair **25 passed / 2 files**,
51.36s, including A/B manifest verification and existing renderer-adjacent,
pricing, Supporting and initialization coverage. Existing 814.74kB bundle-size
advisory remains; it was not suppressed. No fictional regression fixture was
added because no production mechanism was repaired. Exact publication/CI is
recorded in the handoff and completion response, not inferred from prior runs.

**Recommendation: continue ordinary product work with this documented source
qualification when the owner authorizes that work. No specific RosterForge
correctness blocker remains from these three references. Stop this assignment;
do not invent the type, suppress warnings or change shared completeness policy.**
