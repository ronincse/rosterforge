# RosterForge — Agent Handoff And Work Order

The shared status and work-order document for every model working on this
repository. `AGENTS.md` governs *how* to work. This file records *what is done,
what is left, and what is blocked*.

## Read This First

A new session reads, in this order:

1. **Current Status** — where the project stands right now.
2. **Remaining Work To Feature Complete** — the roadmap. This is the
   authoritative to-do list.
3. The **newest** `## Completed Assignment` entry at the end of this file, for
   the immediate context you are picking up.

Everything between is an **append-only history**. Read an older entry when you
need the reasoning behind a decision — the corpus measurements and the rejected
alternatives are in there, and re-deriving them is expensive. Do not read the
history as a to-do list: each entry ends with a "Next recommended boundary" that
was true when written and is superseded by the roadmap below.

Some entries are explicitly **superseded** by later evidence and say so at the
top. Honour that marking; the conclusions in a superseded entry are wrong.

Then read `git log`, `git status`, `docs/architecture.md`, and
`docs/compatibility.md`.

## Current Status — 2026-08-24 (Claude lead active; lanes re-verified)

RosterForge reads BattleScribe 2.03 community data and builds matched-play
rosters. It is a pnpm/TypeScript monorepo; `docs/architecture.md` owns package
layering and evaluator boundaries, `docs/compatibility.md` owns the exhaustive
record of what is and is not supported, and `docs/diagnostics.md` owns
diagnostic codes.

- **Branch.** Work happens on `main` and is **pushed at the end of each
  checkpoint**, once every gate passes. You do not need to ask; see `AGENTS.md`
  "Publishing" for what still requires the owner (force-push, history rewrites,
  pull requests). `git status -sb` should normally show no divergence.
- **Active lead.** **Claude is the active lead.** The Codex-to-Claude transfer
  published by `0c7d793`/`d74e07d` is complete, and the pickup checks that
  `docs/agent-workflow.md` "Formal Lead Transfer" requires were repeated against
  `ad2934166b726314ad55ae2db3f95ae4db655b59` and agreed: clean checkout, `HEAD`
  equal to `origin/main`, divergence `0 0`, only the primary worktree, no stash,
  no concurrent writer, and a roadmap `Next` matching the transfer record. The
  last product checkpoint remains
  `e7c872509e02e8eb766a6f857dea09ec2d984f1f`, with no later application change.
  Returning the lead to Codex uses the same procedure.
- **GitHub CLI.** `gh` still holds an invalid `ronincse` token, recorded by the
  outgoing lead and not repaired here. Ordinary `git` fetch and push work; CI
  confirmation and Copilot's GitHub-native lane need the token fixed, and an
  unauthenticated fallback exhausts the public API limit quickly.
- **Agent workflow.** `AGENTS.md` now distinguishes a formal lead handoff from
  bounded delegated work; Codex is the preferred default lead, not the only
  model allowed to own a checkpoint. `docs/agent-workflow.md` records the
  least-privilege task brief, worktree, review, integration, cleanup, handoff,
  push, and CI procedures for native Codex subagents, Claude, Antigravity, Grok,
  and Copilot. Native subagents are the preferred separable lane when Codex
  leads. A browser-capable native Codex subagent is the preferred executor for
  bounded New Recruit Reference Behavior QA after a current capability probe;
  the active Codex lead is the direct fallback and final classifier.
  Antigravity independently analyzes captured QA evidence while its installed
  headless client lacks browser actuation, and Claude handles difficult semantic
  discrepancies needing deep repository or data-format analysis. Native
  spawning, lead and child Browser actuation, all four external read paths, one
  disposable Grok writer, and Antigravity's headless browser limitation were
  exercised. **The Codex CLI is now a documented delegated specialist** for the
  case where the lead is not Codex — plan review, hard debugging, code review,
  bounded analysis, and a second opinion — under `--sandbox read-only`, with the
  explicit warning that it shares the Codex lead's quota and that read-only
  bounds mutation but not command execution. All four external lanes were
  re-verified from a Claude session on 2026-08-24; the Copilot template was
  corrected because `copilot.cmd` silently truncated multi-line prompts.
- **Gates.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` all pass. `pnpm test` is **501 passed, 18 skipped (519)**.
  The production build retains only Vite's existing large-chunk warning.
- **Pinned corpus.** `E:\GitHub\wh40k-11e` at commit
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files, gitignored and
  never committed. With `ROSTERFORGE_BSDATA_JSON_DIR` set the complete suite is
  **519 passed**; without the variable the 18 corpus tests are skipped.
  **The revision moved on 2026-08-23**, from
  `54c189f4fd01878351fab05586d3b38d9c7f6ddc`, and every pinned measurement was
  re-derived. Older entries below still cite the old hash on purpose: they
  record what was true when they were written. Only this block tracks the
  current one.
- **Active area.** Product usability, measured against real lists. The first
  phone-width pass is complete: a real Death Guard add/configure/amount/check
  path fits 390 px and the 320 px supported minimum without horizontal overflow,
  and sticky workspace links leave their targets visible. The broader Grok
  usability audit has now been reconciled into explicit completed and residual
  rows in section F instead of one over-broad `Done` row. A synthetic
  135-selection workspace pass now has a timing-free CI work budget: its 19,275
  indexed choice resolutions must stay at or below 20,000. The live workspace
  now consumes one tested immutable presentation model for costs, violation
  attention, configuration classification, recursive unit totals, and optional
  active-selection ancestry. The compact points-and-problems player header is
  the next bounded boundary.
- **Comments.** The automatic helper records the deployed-runtime branch,
  54-owner split, five-group shape, source/reverse ordering, direct-edit
  priority, temporary group and child probe lifetimes, child-bound guards, and
  the measured hot-path cost. Changed commands document atomic history and
  autosave behavior.

### Picking up from here

The **characteristic operation surface is complete**: `set`, `append`,
`increment`, `decrement`, `replace`, `floor`, and `ceil` all execute, with
`position` placement, `affects` routing anchored at `scope`, category filtering,
and `skipIfPresent` guarding an append. `multiply`/`divide`/`modulo` are
unsupported on purpose — the format defines them and the corpus uses none.

Selection-level `annotation` is complete: direct and grouped modifiers execute,
selections-terminus `affects` routes through a shared collector, and the
workspace decorates occurrence names without mutating their source names.

Section E is **complete**. The repository **byte** cache is bounded to 256 MiB,
and the separate remote-index **metadata** cache is bounded to 32 MiB; both
evict least-recently-used re-downloadable entries and never touch saved drafts.

Initial creation semantics for the New Recruit `automatic` extension are
settled: ordinary minima initialize whether the property is absent, `false`, or
`true`. Live reconciliation now handles selected and absent ordinary entries
and direct-child selection-entry groups after count/query or effective-limit
changes caused by roster edits.

All five modifier-driven group owners in the pinned corpus have only direct
model or upgrade children. Group deficits fill visible choices in source order
up to child maxima; excess trims reverse order down to child minima; and the
exact edited group child gets runtime priority. Effective group limits use an
ephemeral group occurrence so relative `self` and `parent` conditions stay
correct, but durable rosters remain transparent. The pinned GSC path selects
Burrowing Claws when Specialisms moves from zero to one.

Constraint `value="-1"` is **Done** as of 2026-08-24. It is BattleScribe's "no
constraint" sentinel — `max="-1"` admits any count, `min="-1"` demands none —
settled by observation on the New Recruit wiki, which omits such a constraint
from an entry's rendered list entirely. It was the single widest real-data gap
left: **34 of 36 pinned catalogues raised a `-1` complaint on an empty roster**,
before a single unit was added. That is now zero. The detail is in the completed
entry at the end of this file.

The first QA presentation cleanup is **Done**, but it was a bounded subset of
the broader Grok usability audit rather than closure of that audit. The UI now
separates known violations from unresolved coverage instead of making both look
actionable; it keeps zero-value source costs available without promoting them
beside points; it hides generated occurrence IDs while retaining anchors; and
it brings model quantities and selected model/wargear configuration out of the
datasheet depth. Display-name/annotation incompleteness remains observable in
Selection details rather than repeating a banner on every occurrence. The
remaining header, configuration, unit-cost, editing-mode,
amount-control, loadout/Warlord, automatic-shape, and print-output outcomes are
tracked separately in section F.

The **workspace presentation model is Done**. One pure web-layer projection now
owns headline-versus-zero costs, actionable validation attention, exact
Configuration-versus-army classification, recursive top-level selection costs,
and optional active-selection ancestry. It preserves the immutable session,
occurrences, and same-snapshot source reports by reference. The current layout
is intentionally unchanged; the compact points-and-problems header is its first
visible consumer checkpoint.

**Behaviour on a phone is Done.** At 390 x 844, a pinned Death Guard roster was
configured through detachment, battle size, force disposition, Plague Marine
wargear, model amount, and supported checks. Repository diagnostics had made the
document 431 px wide, and fragment links landed headings under the 47 px sticky
nav. Shrinkable grid tracks and an 84 px document scroll offset now keep the
same live roster inside both 390 px and the 320 px supported minimum. The next
bounded item is a tested workspace presentation model; see section F.

Nested automatic groups and unit-typed automatic sub-units remain low priority
because none of the five modifier-driven pinned groups uses either shape.

Origin-wide storage headroom was researched and deferred:
`navigator.storage.estimate()` is approximate, can report an artificial
quota, and cannot safely refuse a write or trigger cache deletion.

Three habits earned the hard way, all worth keeping:

1. **Write the real-data pin.** It caught defects the synthetics missed three
   separate times, including two step-chaining bugs that `set` had been hiding
   for months because it is the only operation that does not read its input.
2. **When a mechanism's pieces sit on different entries, stop analysing and ask
   for an observation.** Two questions stalled for a whole checkpoint each until
   a single New Recruit screenshot settled them.
3. **Ask what a hot path costs before extending it.** Autosave was built on
   `decodeLocalRosterDraft` without anyone noticing it copies every byte of the
   catalogue closure, and shipped an 8 MB-per-write regression. That cost is
   now written on the function.

## Remaining Work To Feature Complete

`docs/compatibility.md` is the exhaustive, per-behavior record. **This table is
the map, not the territory** — it groups that record into product milestones so
a new session can see the shape of what is left. Keep both current.

Status values: **Done**, **Next** (take this one), **Open** (ready, unblocked),
**Blocked** (needs an answer recorded below), **Low priority** (in scope, but do
not take it ahead of anything else), and **Deferred** (out of scope until the
owner reprioritises).

The first phone-width QA pass, deterministic CI performance budget, and tested
workspace presentation model are complete. The compact points-and-problems
player header is the new **Next** and should consume that shared projection
without folding the later configuration split or unit-card restructure into the
same checkpoint. Whole-roster incremental evaluation stays Open. Take the
restored usability rows in the dependency order stated in section F rather than
treating table position or raw status as priority.

### A. Display-fidelity modifiers

| Item | Status | Note |
|---|---|---|
| Profile modifier projection | Done | |
| Characteristic `set` | Done | lexical replacement; needs no numeric grammar |
| Characteristic `append` | Done | every shape executes: absent `join` defaults to a space, empty concatenates, empty base emits no separator |
| Profile visibility (`hidden`) | Done | all 154 corpus instances fit |
| `affects` grammar parsing | Done | including the selections terminus |
| `affects` traversal execution | Done | own/children/descendants; group rule verified in New Recruit |
| `affects` anchoring at `scope` | Done | confirmed 2026-08-20; see the newest entry |
| Category `add`/`remove`/`set-primary`/`unset-primary` | Done | |
| Effective category membership feeding conditions | Done | single-pass rule; 7 cyclic cases stay unknown |
| Category `affects` routing | Done | filters resolved by modifier-immunity |
| `position` for arithmetic | Done | 1-based index, negative from the end, `0` = all; absent position refused when the value has more than one number |
| Lexical `increment`/`decrement` | Done | plain signed arithmetic, no game-aware inversion — sign convention settled from the corpus, see the 2026-08-20 arithmetic entry |
| `replace` using `arg` as the search term | Done | `arg` present on all 189 corpus replaces; a term matching nothing is an applied no-op |
| `append` with an empty `join` | Done | confirmed in New Recruit; the `+0` bonus-slot idiom now runs end to end |
| `floor`/`ceil` | Done | bounds, not rounding — confirmed against a T'au Ethereal |
| `multiply`/`divide`/`modulo` | Open | defined by the format, **zero** corpus instances; do not write a speculative rule |
| `join`/`arg`/`position` outside their operation | Done | inert authoring noise; anything *else* unknown still withholds |
| Profile `annotation` | Done | 522 target profiles; always-empty base; own report so it no longer costs characteristics their completeness |
| Selection `annotation` | Done | 68 target selections; direct/grouped plus selections-terminus routing, rendered after occurrence names |
| Rendering profile annotation | Done | parentheses after the profile name, folded into that profile's completeness |
| `affects` force anchoring | Done | 31 detachment abilities, via a `forces` segment or a `force`/`roster` scope; traversal depth still distinguishes the force's own selections from everything below |
| Withheld routing vs withheld steps | Open | when routing is *unresolvable* the report is incomplete but each characteristic keeps its printed value; when a *step* is unapplied the value is cleared. Now a **rare** path: no corpus modifier reaches it. Reconcile when something makes it common. |
| Selection `name` modifiers | Done | 7,673 instances, overwhelmingly Crusade rank suffixes gated by XP condition groups |
| Profile `name` modifiers | Done | five grouped, condition-gated corpus instances; four `set`, one default-space `append`; exact Mortifier transition pinned |
| Legality and validation | Measured | see section B — much smaller than assumed; the points limit already works |
| Category filter naming a non-immune category | Blocked | would need a fixpoint instead of the single pass; deliberate |


### B. Legality and validation

Measured 2026-08-21. **Far smaller than the roadmap assumed**: 25,932 of 26,259
corpus constraints (98.8%) already fit a supported shape, and the matched-play
points limit works end to end and is now pinned.

| Item | Status | Note |
|---|---|---|
| Two-dimensional validity/completeness contract | Done | |
| Structural, selection-condition, and force-constraint reports | Done | |
| Matched-play points limit | Done | pinned: `max pts` 0 → 1000 on choosing Incursion |
| `unit`/`model`/`root-entry` constraint scopes | Done | 101 corpus constraints; reused the resolver `conditions.ts` already had |

| `automatic` constraint attribute | Done | 109 corpus constraints; it cannot change what a bound means, so bounds carrying it now evaluate |
| `automatic` during initial creation | Done | New Recruit's initializer ignores the extension; supported minima seed for absent, `false`, and `true` |
| `automatic: true` selected ordinary reconciliation | Done | exact choice and parent; add/remove/amount/group-replacement edits; targeted condition-aware bounds; exact Drukhari Scourges transition pinned |
| `automatic: true` absent ordinary activation | Done | 11 base-zero ordinary owners; visible complete minima activate with caller IDs; exact Necron transition pinned |
| `automatic: true` shared-wrapper identity | Low priority | zero entry-link references to the 11 pinned absent owners; cross-wrapper mutation stays diagnosed |
| `automatic: true` selection-entry groups | Done | all five modifier-driven owners have direct model/upgrade children; source-order fill, reverse trim, edited-choice priority; exact GSC Specialisms transition pinned |
| `automatic: true` unit-typed sub-units | Low priority | New Recruit has distinct algorithms; zero pinned modifier-driven owners |
| ID-valued constraint scopes | Done | 116 corpus constraints naming a containing **entry**, not a category; no category index needed |
| Sections C–E | Measured | interchange remains low priority; acquisition and editing durability are complete; remaining source features are deferred |
| `Override points limit?` | Done | the existing exact repeat evaluator handles one amount occurrence; pinned at 1,750 |
| Conditional `defaultAmount` / stepped initialization | Done | direct condition-aware modifiers at the prospective parent; one amounted occurrence at max(minimum, effective default); pinned Incursion 1,000 then edited to 1,750 |
| Comma-delimited `defaultAmount` | Open | 7 of 96 corpus defaults; New Recruit initializes multiple sub-unit instances, which this product does not model |
| Grouped `defaultAmount` modifier ordering | Open | 1 corpus instance; withheld rather than guessed. Smallest remaining real gap |
| Permissive `defaultAmount` numeric parsing | Open | `Number(raw)` at `packages/evaluation/src/selection-default-amount.ts:188` accepts `0x10`, `0b10`, `0o10`, and `1e3`, so a malformed source value initializes silently and reports *complete* instead of raising `EVALUATION_SELECTION_DEFAULT_AMOUNT_INVALID`; the comma case immediately above is already guarded. Raised by a delegated Codex review on 2026-08-24 and **not corpus-measured** — count such values across the 46 pinned documents before deciding it is real, and weigh it against `AGENTS.md`'s untrusted-imported-bytes rule |
| Collapsing ordinary occurrences into one amounted node | Deferred | nested child costs belong to each occurrence and are not multiplied by an ancestor amount, so changing representation first could undercount wargear |
| Grouped-modifier costs, broader cost behavior | Deferred | |

### C. Roster interchange

| Item | Status |
|---|---|
| Browser print/save-PDF presentation export | Done |
| `.ros`/`.rosz` ingestion, projection, import | Low priority |
| `.ros`/`.rosz` interchange export | Low priority |
| Exact XML/JSON reserialization | Low priority |

Owner decision, 2026-08-20: **`.ros`/`.rosz` is low priority.** It is a large
feature and it is not what the ecosystem is moving toward — BSData now publishes
catalogue data as JSON, and the tools this product is measured against are
web-based rather than trading BattleScribe roster files.

Note for whoever picks this up: `.ros`/`.rosz` are *roster* files (a saved army
list), which is a separate concern from the `.cat`/`.gst`/`.catz`/`.gstz`
catalogue formats that JSON supersedes — catalogue ingestion already handles both
XML and JSON and is unaffected by this decision. The cost here is that a user
cannot bring an existing army list in from another tool. Revisit if that is
actually asked for.

### D. Catalogue sources and cache

| Item | Status |
|---|---|
| Pinned GitHub browsing, closure acquisition, byte caching, provenance | Done |
| Draft storage reporting | Done | *draft store*; summaries carry `batchId`, the shelf counts a shared batch once |
| Draft quota failure handling | Done | *draft store*; a refused write is named, an orphaned batch is rolled back, autosave stops retrying |
| Repository byte-cache eviction and quota | Done | 16 MiB per entry, 256 MiB total, LRU sidecars; drafts are never candidates |
| Repository metadata-cache eviction | Done | 32 MiB per entry and total, replacement-aware LRU sidecars; drafts are never candidates |
| Storage headroom before a write | Deferred | estimate is origin-wide, approximate, and can be artificial; real quota failure remains authoritative |
| Retries, atomic publication | Deferred |
| Repository update discovery, branch tracking, GitHub auth | Deferred |
| Gallery discovery and cache-management UI | Deferred |

**Three databases, and they are not the same problem.** Correction to the
2026-08-22 two-store note:

- `rosterforge` / `local-roster-drafts` holds saved drafts. Never evict these
  without an owner decision.
- `rosterforge-pinned-repository-cache` / `pinned-repository-bytes` holds
  downloaded bytes. It now has LRU sidecars and a 256 MiB source-byte bound.
- `rosterforge-pinned-repository-metadata-cache` /
  `pinned-repository-metadata` holds re-downloadable remote-index JSON. It
  now has its own LRU sidecars and a 32 MiB per-entry and total bound.

`navigator.storage.estimate()` is origin-wide, approximate, and can expose an
artificial quota. It cannot safely drive either cache eviction or draft refusal;
approximate reporting remains deferred product UI.

### E. Editing and durability

| Item | Status |
|---|---|
| Headless roster commands: add, remove, rename, amount, duplicate, relocate, reorder | Done |
| Browser drafts in IndexedDB with exact definition-key restoration | Done |
| In-memory undo/redo over immutable snapshots | Done |
| Unsaved-change tracking, indicator, and reload guard | Done |
| Autosave to an already-active draft | Done | debounced, tunable through the existing options seam |
| Unsaved-roster recovery slot | Done | one reserved record, hidden from the shelf, offered not restored |
| Draft byte storage | Done | bytes stored once per import batch, collected when the last draft referencing them goes |
| Comment the public API surface | Done | the four front-door files; 42 → 81 of 668 exports. The remaining 587 are deliberate — see the note below the table |
| Durable undo history | Done | a trimmed tail under `history:<draftId>`; 20 entries capped by a 256 KB budget, restored against one shared catalogue context |
| Sibling-reordering UI, nested-force editing, force renaming, editable cost overrides | Deferred |

**On the remaining 587 undocumented exports.** They are not a backlog item.
The 2026-08-21 research note argued against a blanket sweep and the checkpoint
that acted on it agrees: a retroactive comment written by someone who did not
write the code is confidently wrong often enough to be a liability, and one
restating a type rots at the next refactor. Two candidates would be worth a
bounded pass if someone is already deep in them: `evaluation/characteristics.ts`
(1,964 lines, 8 of 24 exports documented) and `apps/web/src/roster-session.ts`
(1,583 lines, 3 of 41). Neither should be taken ahead of feature work.

### F. Product usability — *active area*

Added 2026-08-23. Sections A–E were written outward from the BattleScribe data
format, and by that measure they are complete. None of them was ever asking
whether a person can build a list they would take to a game. Every row here was
found by **driving the app against a real army**, and the first one had been
invisible to the whole test suite.

The 2026-08-24 roadmap audit restored the unresolved outcomes from Grok's
broader usability review. The completed presentation cleanup below is the
baseline it actually delivered, not an umbrella closure for the residual rows
that follow. Keep each residual bounded and independently reviewable; where a
presentation decision depends on New Recruit behavior, use Reference Behavior
QA before classifying or implementing the discrepancy.

| Item | Status | Note |
|---|---|---|
| Costs match a GW-exported list | Done | all 16 Dark Angels unit costs match the GW list when the Inner Circle Companions occurrence is set to the list's six models; the two old source-data mismatches disappeared at the current corpus pin |
| Evaluation cost makes a real army unusable | Done | the whole-catalogue choice index is now cached per context. Validation at six units 127 s → 26 ms; a fifteen-unit army builds in the browser at 107–409 ms per edit |
| Per-edit evaluation cost | Done | the roster walk and per-choice identity IDs are cached too. Validation at fifteen units 68.8 → 49.7 ms |
| Collapsed panels built anyway | Done | 181 of 214 `<details>` were closed and rebuilt every edit; DOM for a fifteen-unit army 17,505 → 5,700 nodes |
| Reports re-evaluated on unrelated re-renders | Done | `RosterOverview` called costs and validation unmemoised in its body; an autosave state change paid a full re-evaluation |
| History steps re-evaluated a known roster | Done | undo/redo restore a session the history already held; both reports now cached per session. Undo 308 → 73 ms |
| Per-edit evaluation is whole-roster | Open | median ~92 ms at fifteen units, tail ~270 ms. Every *new* edit re-evaluates everything. Needs **incremental evaluation**; no longer urgent at this size |
| A budget test that runs in CI | Done | a synthetic 135-selection costs/structural/selection/force report pass makes 19,275 indexed choice resolutions against a 20,000 ceiling; a duplicated full pass fails at 20,070 without relying on wall time |
| Unfillable required wargear group | Done | not unfillable and not a data defect: a group holding *nested groups* counted nothing towards its own bound. 10 corpus groups are this shape; the Plague Champion now closes at 2 of 2 |
| Force Disposition shows no entries | Done | **not a defect**: the group is conditional on the detachment, in every faction checked. The message now distinguishes "nothing here" from "nothing yet" |
| Community-data mismatch diagnosis | Done | both known GW discrepancies vanished when the corpus was updated: RosterForge had read stale source data faithfully. The actionable product gap was freshness, not a point-by-point GW comparison the app has no source for |
| Surface how current the loaded data is | Done | import date against BSData's last upstream push, one request; falls back to a plain "may be out of date" note when GitHub is unreachable |
| Detachment enhancements never offered | Done | `ancestor` scope resolved against an empty chain for prospective children; 2,635 corpus conditions affected. Four Virulent Vectorium enhancements now offered, and only those |
| Browse pin stale against the measured corpus | Done | the app's configured source was still on the old revision after the re-pin |
| Allied config auto-inserts into a force | Done | roster creation filters roots by visibility; Knights keeps `Code Chivalric`, other factions come up with three config slots |
| NOTICE text offered as an addable unit | Done | roots the catalogue hides are no longer offered; `[Legends]` units hide until `Show Legends` is picked, as in BattleScribe |
| `skipIfPresent` on modifiers | Done | 359 modifiers across 20 files. Semantics pinned on the New Recruit wiki, not inferred: the guard is a **separate string from the appended value**. The pinned Manreaper's Keywords went from blank to the full four |
| First QA presentation cleanup | Done | violation-first checks, reader-hidden occurrence IDs, collapsed zero-value campaign costs, clearer model/wargear/Warlord disclosure, exposed model quantities, and details-level display-name notices; this is the delivered subset, not closure of the rows below |
| Tested workspace presentation model | Done | one pure same-snapshot projection now owns headline/zero costs, violated-selection attention, exact Configuration-versus-army classification, recursive top-level costs, unavailable states, and optional active-selection ancestry; the current DOM consumes it without a layout change |
| Compact points-and-problems player header; remove remaining evaluator chrome | **Next** | points and known problems are prominent and generated IDs are hidden, but costs and checks remain separate technically framed reports rather than one compact player header; preserve the validity/completeness distinction while reducing developer-facing framing |
| Separate configuration from army units | Open | the add browser groups `Configuration` separately, but added configuration and units still share one selected-roster tree |
| Collapsible top-level army units with per-unit costs | Open | large child collections are lazy and collapsed, but top-level unit cards are not collapsible and do not show their evaluated per-unit cost in the live workspace |
| Shop/editor modes and newly-added-unit focus | Open | the current two-pane/anchor layout has no explicit browsing-versus-editing state and does not focus the unit just added; test the interaction at desktop and phone widths |
| Legality-aware model-count controls | Open | model amounts are exposed, positive-finite, source-step-aware, and automatically reconciled where supported; the remaining player control is still free-form and is not generally bounded by known legal minima/maxima |
| Player-facing validation messages | Done | known violations are separated from unresolved coverage, name their owners, and link to exact occurrences while retaining the full-legality boundary |
| Flatten common loadout groups and add dedicated Warlord controls | Open | disclosures are clearer and group replacements work, but common loadout topology remains nested and Warlord is still an ordinary catalogue child rather than a dedicated player control |
| Nested automatic groups and unit-typed automatic sub-units | Low priority | measured ordinary-entry and direct-child group reconciliation is complete; these two remaining autofill shapes are diagnosed and withheld, and none of the five modifier-driven pinned groups uses either shape |
| Print-output usability pass | Open | the escaped print/save-PDF view model includes nested selections, per-selection costs, totals, and supported checks, but no later checkpoint has tested reader hierarchy, pagination, or representative table use |
| Per-file update times | Deferred | the repository-wide freshness signal is shipped. Exact per-file dates would cost one GitHub request for each of 46 files and can be reconsidered only if a demonstrated decision needs that precision |
| Load catalogues directly from BSData | Deferred | owner wants this eventually; the pinned-source browser already does a fixed revision |
| Constraint `value="-1"` | Done | BattleScribe's "no constraint" sentinel, settled by observation on the New Recruit wiki rather than inferred. 48 corpus constraints across 22 files, all of them modifier targets. **34 of 36 catalogues raised a complaint on an empty roster; now zero.** Selection constraints, force constraints, initialization, and the constraint summary all honour it; any other negative still withholds |
| Unicode-normalised name matching | Deferred | GW exports use U+2019 while catalogues use U+0027; activate this with `.ros`/cross-tool import or another feature that actually matches external names |
| Behaviour on a phone | Done | pinned Death Guard add/configure/amount/check path verified at 390 x 844 and 320 x 568; diagnostic grids no longer widen the page, and sticky links leave headings visible |

With the CI budget complete, take the open presentation work in this order:

1. tested workspace presentation model;
2. compact points-and-problems header;
3. configuration separated from army units;
4. collapsible top-level units with per-unit costs;
5. shop/editor modes with newly-added-unit focus;
6. legality-aware model-count controls;
7. common-loadout flattening and dedicated Warlord controls; and
8. print-output usability.

The presentation model intentionally comes before the visible restructuring so
those checkpoints share one tested projection instead of encoding the same
rules independently in components. Reference Behavior QA remains required when
the loadout/Warlord work depends on New Recruit behavior. Do not interleave the
low-priority automatic shapes, deferred acquisition/matching work, or
whole-roster incremental evaluation unless new evidence changes their priority.

### Open questions needing the owner

**Superseded, later on 2026-08-23.** The roadmap does have a `Next` again:
section F, added after driving the app against a real Games Workshop list. The
question below was asked because sections A–E were complete, and the answer
turned out to be that those sections were measuring the wrong thing. Section F
is what a person needs in order to build a list; take from there.

The rest of this section still stands, and is worth re-reading once section F
is short:

Worth putting in front of the owner, roughly in order of how much corpus
evidence backs them:

- **Grouped `defaultAmount` ordering** — one instance; needs its semantics
  pinned by the wiki or an observation before anything is written.
- **Comma-delimited `defaultAmount`** — seven instances, but it needs sub-unit
  modelling the product does not have. A real feature, not a gap-fill.
- **`.ros`/`.rosz` interchange** — already Low priority by the 2026-08-20
  decision. Revisit only if bringing a list in from another tool is actually
  wanted.
- **Something not on this list.** The roadmap was written from the data format
  outward. What the product still lacks as a *product* — for matched play, on a
  phone at a table — has never been the organising question.

On semantics, no question is outstanding: every rule the evaluator executes
rests on a corpus measurement or a direct New Recruit observation, not on
inference. The last inferred one — the arithmetic sign convention — was
confirmed by experiment on 2026-08-20.


## How To Update This Document

You are writing for a stranger — possibly a different model, with none of your
context. Before you stop, and at the end of every checkpoint:

1. **Append a `## Completed Assignment` entry** at the end of the file with the
   baseline and resulting commit hashes, what changed and *why that decision
   rather than the alternatives*, exact corpus measurements, exact test and gate
   numbers, and what stayed unsupported.
2. **Update "Current Status"** above — the date, gate numbers, branch state. A
   stale status is worse than none, because it is believed.
3. **Update the roadmap table.** Move what you finished to Done, promote the new
   **Next**, and add anything you discovered. If you found work nobody knew
   about, it belongs in the table, not only in your entry's prose.
4. **Update `docs/compatibility.md`** whenever a behavior boundary moved, and
   `docs/architecture.md` and `docs/diagnostics.md` when structure or codes
   changed. The roadmap maps them; it does not replace them.
5. **If you disproved an earlier conclusion**, mark the superseded entry at its
   top and say so in your own. Do not silently leave two contradictory answers
   in the file — the next reader cannot tell which won.

Record what you *did not* do and why, not only what you did. A checkpoint
descoped for a good reason is useful information; one descoped silently reads as
an oversight.

---

## Historical Record

Everything below is append-only. The section immediately following was the
original review that set the work order; the `## Completed Assignment` entries
after it run oldest to newest.

This document began as a response to an earlier handoff summary, written after an
independent audit of the workspace and of the pinned corpus at
`E:\GitHub\wh40k-11e` (commit `54c189f4fd01878351fab05586d3b38d9c7f6ddc`).

## Original Status Snapshot — 2026-08-14

> Superseded by **Current Status** above. Kept because the checkpoint
> entries below refer to the task numbering it introduces. The counts here are
> historical and no longer accurate.

Tasks 1 through 6 below, the first bounded Task 7 presentation-export
checkpoint, and eight Task 8 checkpoints — profile modifier projection,
headless characteristic-display evaluation, its workspace presentation, profile
visibility, `affects` selector parsing, category-entry information projection,
effective category membership, and the category-condition honesty fix — are
complete, as are two checkpoints after them: routed characteristic attribution
and characteristic `append` execution. The current
normal suite passes 409 tests with six skipped, and the pinned real-data suite
passes all six tests. Work now happens on `main`, which was fast-forwarded to
the branch tip on 2026-08-19 and is CI-green. Effective keywords are visible in the roster workspace,
and the category surface is complete apart from `affects`. The shared
work-order file is `agent-handoff.md`; `codex-handoff.md` was renamed in
`f839c21` so a non-Codex model does not skip it.

The staged category plan is now complete through stage three: effective category
membership feeds condition identity. See "Completed Assignment — The Category
Condition Flip" at the end.
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
`git diff --check` pass; the production build retains only Vite's existing
large-chunk warning.

## Completed Assignment — Characteristic Display, 2026-08-14

Baseline `40b60ca`; resulting implementation commit `04444cb`
(`feat: headless characteristic display evaluation`). The branch was not
pushed and no pull request was opened. The worktree was clean at the baseline
and no existing work was reset, cleaned, or rewritten. The optional corpus was
confirmed at `E:\GitHub\wh40k-11e`, commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, clean, 46 JSON files.

### Results

`packages/evaluation/src/characteristics.ts` adds
`evaluateRosterProfileCharacteristics(roster, context, owner, profile)`. It
accepts a direct profile projection or the arrays a materialized profile info
link already exposes by reference, and clones nothing. Boundaries are documented
in `docs/architecture.md` (`Characteristic Display Boundary`),
`docs/compatibility.md`, and `docs/diagnostics.md`.

**Supported operation: `set` only.** `set` replaces the projected lexical value
and never reads the value it replaces, so it needs no numeric grammar for
observed forms such as `3+`, `36"`, and `D6`. Every other observed operation
would require an unestablished rule — lexical arithmetic for
`increment`/`decrement`/`floor`/`ceil`, `join` separator and `position`
placement for `append`, and an `arg` search term for `replace` — so all of them
stay preserved, source-located, and unapplied. The numeric modifier kernel does
**not** fit and is deliberately not reused; the applicability, modifier-group
applicability, and group-execution collectors do fit and are reused unchanged.

Targeting requires `field` to equal an exact characteristic `typeId` on the same
profile. A repeated characteristic type is an ambiguous target, not a
broadcast. Execution keeps the documented order: profile-direct modifiers, then
top-level groups in source order, direct children before nested groups
depth-first. A false condition is an ordinary `notApplicable` step and does not
make a report incomplete. The effective value stays known when no unapplied step
follows the last applied step, so a report can expose a known value while
remaining `incomplete`.

Profile-owned modifiers that do not route to exactly one characteristic on their
own profile — `hidden`, `name`, the observed `annotation` extension, and
characteristic types belonging to another profile — are retained in
`unroutedModifiers`, diagnosed, and make the report incomplete. (`hidden` was
moved out of `unroutedModifiers` by the profile-visibility checkpoint below;
the rest still apply.) Scoped
modifiers, repeats, missing operations or values, unresolved applicability, and
any generic attribute other than the inert `comment` keep their step unapplied.

### Pinned corpus inventory (484 profile-owned characteristic modifiers)

| Dimension | Measurement |
|---|---|
| Ownership | 369 direct, 115 inside the profile's own modifier groups |
| Operations | 213 `append`, 205 `set`, 54 `increment`, 6 `decrement`, 4 `floor`, 2 `replace` |
| Scope | 16 `scope="model"`, 468 scope-free |
| Conditions | 384 with direct conditions, 53 with condition groups, **0 with repeats** |
| Values | 3 omit `value` |
| Extensions | `join` 244, `affects` 16, `arg` 2, `position` 0; 238 carry none |
| Targeting | 478 on their own profile, 6 absent, **0 ambiguous** |
| Executable subset | **173** (`set`, scope-free, extension-free, valued, exactly one target): 117 direct, 56 grouped |
| Unconditional | only 2, both Adeptus Custodes `W 3 → 4` |

All 484 have a condition surface whose shape the existing evaluator already
supports, so applicability is not the limiting factor — operation semantics are.
Separately, the 694 profile-owned modifiers in total include 154 `hidden`, 51
`annotation`, and 5 `name`. The 1,257 characteristic modifiers owned outside
profiles remain out of scope; 1,249 carry `affects`, a `scope`, or both, and the
other 8 sit on info links rather than on the profile they display.

### Checks run

- `pnpm lint` — clean.
- `pnpm typecheck` — clean.
- `pnpm test` — **363 passed, 4 skipped (367 total)**, 43 files passed and 1
  skipped. Previous baseline was 351 passed with 3 skipped; the 12 new tests are
  `packages/evaluation/src/characteristics.test.ts`, and the extra skip is the
  fourth pinned-corpus test.
- `pnpm build` — passed, retaining only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite with `ROSTERFORGE_BSDATA_JSON_DIR` set —
  **4 passed** in 59.24 s.

New pinned assertions: the all-repository test replaces the single 484 count
with the complete summary table above, and a new six-file Adeptus Custodes
closure test (game system, Adeptus Custodes, Imperial Knights Library, Agents of
the Imperium, Titans library, Unaligned Forces) adds a `Custodian Guard` unit,
its `4-5 Custodian Guard` group, and the `Sentinel Blade & Praesidium Shield`
model, then proves `Custodian Guard (Shield)` reports `M 6"`, `T 6`, `Sv 2+`,
**`W 4` from a base `3`**, `LD 6+`, `OC 2`, `InSv 4+` with `completeness:
"complete"` and no diagnostics.

The synthetic fixture `characteristic-display.cat` is project-owned and covers
applied/not-applicable/unapplied steps, group ordering with nested depth-first
children, unsupported operations, `affects`, `scope`, missing values, repeats,
unrouted and ambiguous targets, inert `comment`, unresolved applicability, and
both directions of the known-value rule. No third-party data was committed.

### Remaining questions for this surface

1. **`affects` retargeting is still the blocker for the other 1,257
   characteristic modifiers.** Observed values are owner-relative paths such as
   `self.entries.recursive.profiles.Melee Weapons`, `profiles.Unit`, and forms
   embedding an exact entry ID. Resolving them needs a decision about profile
   *families* selected by `typeName` versus `typeId`, and about recursive entry
   traversal. Nothing here should be guessed from the path grammar alone.
2. **`append` needs both `join` and `position`.** Observed `join` values include
   `",\u00a0"`, `""`, `"\n\n"`, `", "`, `","`, and `"\n"`; `position` is `-1`
   153 times, `""` five times, and `1` three times. Whether `position` counts
   from the end, indexes a separator-delimited token list, or something else is
   not established by the source shape.
3. **`replace` needs `arg` semantics.** Observed `arg` values are mostly `"+0"`
   (270) plus keyword strings; whether `arg` is the search term, a format
   argument, or both is unresolved.
4. **Lexical arithmetic for `increment`/`decrement`/`floor`/`ceil`.** Base values
   include `3+`, `36"`, `-2`, and `D6`. A pinned `decrement` of 1 against a base
   `3+` could mean `2+` or `4+`; the sign convention for inverted characteristics
   is a game rule, not a data shape.
5. **Repeats on characteristic modifiers are unsupported by choice, not by
   difficulty.** The corpus contains none, so supporting them would be
   unproven speculation. `evaluateRosterModifierRepeats` would fit if a future
   corpus needs it: a zero count is a no-op and any positive count applies `set`
   once. This is a cheap follow-up whenever real data justifies it.
6. **Profile-owned `hidden` (154) and `annotation` (51) are undocumented display
   behavior.** `annotation` is not in the 2.03 schema and appears nowhere else in
   the compatibility inventory. Profile visibility is a separate checkpoint;
   until it exists, every affected profile report stays incomplete.
7. **One `set` in `Necrons.json` gives `Keywords` a native JSON Boolean.** It
   projects to the lexical string `true` and is replaced literally. That is
   faithful to the source but is almost certainly an upstream authoring error.

### Next recommended boundary

Completed in the following checkpoint.

## Completed Assignment — Characteristic Presentation, 2026-08-14

Baseline `02254d0`; resulting commit `a42b791`
(`feat: show evaluated characteristics in the roster workspace`). Not pushed, no
pull request. This was the presentation-only follow-up recommended above; it
adds no evaluation semantics.

### Results

`inspectLocalRosterSelectionCharacteristics` in `apps/web/src/roster-session.ts`
evaluates every profile shown for one exact occurrence — direct profiles,
resolved profile info links, and the profiles of recursive info groups — in that
render order, and keys each report by the exact profile object. An occurrence
absent from the roster returns
`APP_ROSTER_CHARACTERISTIC_SELECTION_UNAVAILABLE`.

The workspace renders the effective value when known. A changed characteristic
also shows its source value labelled `Base <value>`, so a displayed number is
never confused with the printed one. An unresolved sequence keeps the source
value visible under an explicit `Effective value unresolved` label rather than
substituting a provisional result — the same rule the cost summary already
follows. An incomplete profile carries a plain-language note plus
`data-completeness` on the profile and on the affected characteristic. A profile
with no evaluated report falls back to the projected text unchanged.

### Checks run

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **366 passed, 4 skipped (370 total)**, 43 files passed and 1
  skipped. The three new tests cover render order, by-profile identity, and the
  unknown-occurrence failure.
- `pnpm build` — passed, only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite — **4 passed** in 46.86 s, unchanged by this
  checkpoint.

The `App.ui.test.tsx` fixture now gives the infantry profile a supported `set`
and the `Fieldcraft` info-group profile an unsupported `increment`. That proves
base-versus-effective display, the unresolved label, and the incomplete note
through the info-group path in one render.

### Next recommended boundary

Completed in the following checkpoint.

## Completed Assignment — Profile Visibility, 2026-08-14

Baseline `c051378`; resulting commit `449c17f` (`feat: evaluate profile
visibility`). Not pushed, no pull request.

### Results

`evaluateRosterProfileVisibility` uses the profile's projected `hidden` flag as
the base and mirrors the selection-visibility contract exactly: `type="set"
field="hidden"`, a Boolean value, no scope, no repeat, and no generic behavior
attribute. Direct owner modifiers run first, then relevant top-level groups in
source order with direct children before nested groups depth-first, reusing the
existing execution collector.

A `hidden` modifier no longer makes a characteristic report incomplete. That
field is a known BattleScribe field this package already executes for
selections, so a modifier naming it definitively cannot change a characteristic
value. Those modifiers moved from `unroutedModifiers` into a separate
`visibilityModifiers` collection: still observable, but visibility owns their
completeness. This follows the existing cost rule that modifiers targeting
non-cost fields do not affect numeric cost completeness. `name` and
`annotation` are unchanged — still unrouted, still incomplete.

The workspace labels a hidden or visibility-unresolved profile and keeps it
rendered. Removing hidden profiles from the panel would be a separate
presentation decision; labelling preserves everything the source declares.

### Pinned corpus inventory (154 profile-owned `hidden` modifiers)

| Dimension | Measurement |
|---|---|
| Ownership | 154 direct, **0 grouped** |
| Operations | 154 `set`, 0 other |
| Values | 154 native Boolean `true`, **0 `false`** |
| Scope / repeats / extensions | 0 / 0 / 0 |
| Conditions | 125 direct conditions, 29 condition groups, **0 unconditional** |
| Supported shape | **154 of 154** |
| Static `hidden="true"` profiles | 1 of 13,451 |

All 154 belong to distinct profiles, and none of those profiles also owns a
`name` or `annotation` modifier — so this checkpoint unblocks every one of
them.

### A projection gap found while pinning these counts

The typed projection sees 13,450 profiles and 153 `hidden` modifiers, not
13,451 and 154. The missing one is real data, not a miscount: the `Recon
Augury` category entry (`40ce-cefb-031e-75a4`) in
`Imperium - Adeptus Mechanicus.json` owns an `Enhanced Augurs` Abilities
profile whose single conditional `set hidden` modifier is the 154th.
BattleScribe 2.03's category-entry surface has no `profiles` collection, so
RosterForge preserves it on the generic ordered source node without projecting
it, and it takes part in no evaluation. Whether `CategoryEntryProjection`
should gain a typed `profiles` collection is a separate projection decision,
deliberately not bundled here. It is documented in `docs/compatibility.md` and
pinned by the corpus guard's comment.

### Checks run

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **373 passed, 4 skipped (377 total)**. Seven new tests: six
  profile-visibility cases in `packages/evaluation` and one adapter case.
- `pnpm build` — passed, only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite — **4 passed** in 43.19 s, including the new
  `profileOwnedVisibilityModifierSummary` guard.

### Next recommended boundary

Partly addressed by the following checkpoint, which closed the grammar question
without committing to execution semantics.

## Completed Assignment — Affects Selector Parsing, 2026-08-14

Baseline `7d3d1b0`; resulting commit `59757d9` (`feat: parse the affects
selector grammar`). Not pushed, no pull request.

This checkpoint deliberately took the inspection-and-reporting exit the original
Task 8 assignment allows: the grammar is now closed and pinned, but nothing
executes, because three semantic decisions remain genuinely unsettled by the
source shape.

### Results

`packages/evaluation/src/affects.ts` adds
`parseBattleScribeAffectsSelector(value)`. It is pure syntax — no roster, no
catalogue, no target selection, no execution — and returns the traversal, an
optional filter ID, an optional profile-type name, and explicit issues. No
evaluator consumes it, so `affects` modifiers remain preserved and unapplied
exactly as before.

The supported shape is
`[self.][entries.][recursive.][<filterId>.]profiles.<profileTypeName>`. The
corpus establishes the traversal contrast itself: both
`self.entries.profiles.X` and `self.entries.recursive.profiles.X` occur, so
`entries` alone is the direct child collection and `recursive` extends it to
descendants. That inference comes from the data's own contrast, not from
outside knowledge.

### Pinned corpus grammar

| Dimension | Measurement |
|---|---|
| Occurrences / distinct values | 1,859 / **79** |
| Segment vocabulary | closed: `self`, `entries`, `forces`, `recursive`, `profiles`, a profile-type name, or one object ID |
| Parses | **1,730 supported**, 129 unsupported |
| Unsupported | 24 force traversals, 106 entry-terminated paths (one value has both) |
| Traversal | 344 owner-only, 168 direct-child, 1,347 recursive |
| Filter IDs | 428 total — 427 category entries, 1 selection entry, **0 unresolved** |
| Profile-type names | only **3 distinct**, all declared; 30 declared types have 30 distinct names |
| Characteristic targets | 1,265 carry `affects`; **1,246** parse into the supported shape |

### The three decisions execution still needs

None is answerable from the source shape, so none was guessed.

1. **Traversal semantics against roster occurrences.** `entries` and
   `recursive` are clear in the abstract, but a roster tree nests occurrences
   through entry links and transparent selection-entry groups. Whether
   `entries` means direct child *occurrences*, direct child *definitions*, or
   something that skips group containers changes which profiles are hit.
2. **Category filtering.** 427 selectors embed a category-entry ID. The
   condition evaluator already treats category-link target IDs as effective
   selection identities, so reusing that rule is the obvious candidate — but
   whether `affects` filters the traversal set or narrows the profile set is
   not established.
3. **Profile-type matching by name.** BattleScribe offers no ID form here; the
   only selector is `profiles.<profileTypeName>`. The project otherwise refuses
   to infer targets from display names, so matching by name is a real policy
   exception even though it is what the format requires. It is safe in this
   corpus (3 names, all declared, no collisions), but that is a property of the
   data, not a guarantee.

A reasonable execution checkpoint would resolve the name against declared
profile types via `typeId` rather than the denormalized `typeName` string,
and would leave any unresolved or ambiguous type incomplete.

### Checks run

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **382 passed, 4 skipped (386 total)**. Nine new parser tests.
- `pnpm build` — passed, only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned real-data suite — **4 passed** in 45.81 s. The new
  `affectsSelectorSummary` guard runs the real parser over every projected
  modifier and reproduced all of the numbers above on its first run.

### Next recommended boundary

`affects` execution remains blocked on the three decisions above. Category-entry
projection was completed in the checkpoint below; category modifiers are blocked
on a separate decision recorded at the end of this document.

## Completed Assignment — Category-Entry Information, 2026-08-14

Baseline `0056a7a`; resulting commit `42cda92` (`feat: project category-entry
profiles, rules, and info links`). Not pushed, no pull request.

Real BSData puts information collections on category entries even though
BattleScribe 2.03 does not declare them there. Three entries in the pinned
corpus do: `Recon Augury` owns a profile, `Faction: Legions of Excess` owns a
rule, and `Shadow Legion` owns a `rule` info link. All three collections are now
projected, the rules and profiles are indexed as ordinary graph objects, and
their info-link targets and profile type references resolve like any other
container's.

Typed-projection counts now match the source at **13,451 profiles and 154
profile-owned `hidden` modifiers**, closing the 13,450/153 gap the visibility
checkpoint recorded. The corpus guard was updated accordingly.

This is projection only. It does not make a category entry selectable or give it
evaluation behavior, and nothing materializes a category entry into a roster
occurrence, so these profiles and rules are observable through the graph rather
than rendered in occurrence details.

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
clean; `pnpm test` **382 passed, 4 skipped**; pinned real-data suite **4
passed**.

## Completed Assignment — Staged Categories, 2026-08-14

Baseline `bbfae74`. Resulting commits: `ee089b4` (`feat: evaluate effective
category membership`) and `bb19f6a` (`fix: refuse a confident answer for
category-controlled conditions`). Not pushed, no pull request.

The user chose the staged option: execute membership as a display-only report,
fix the honesty gap, measure the condition flip, and bring the flip back as its
own go/no-go. Stages one and two are done and stage three was measured.

### Stage one — effective membership (`ee089b4`)

`evaluateRosterSelectionCategories` reports one occurrence's effective
categories from its materialized category links. Only scope-free,
extension-free `add` and `remove` execute, in the documented order. An `add` of
an existing member records `changed: false`, so inert authoring is
distinguishable from unsupported behavior.

`set-primary` and `unset-primary` do not execute: 322 of the 325
executable-shaped `set-primary` modifiers name a category the owner does not
link and have no sibling `add`, so the operation would have to create membership
to do anything, and 234 owners would gain a second primary unless it also
clears the others. Because a primary operation provably cannot change
membership, it withholds only the primary determination — `categories` stays
known while `primaryCategories` does not.

Executable subset: **283** of 892 (274 `add`, nine `remove`).

### Stage two — the honesty fix (`bb19f6a`)

Category link targets already feed condition identity, so a category-testing
condition could return a confident answer that a modifier would invalidate.
That was the one place in the package where an unsupported modifier produced a
possibly wrong result rather than an unresolved one.

A candidate whose choice carries a `field="category"` modifier naming the
queried category — or one with no value — now reports unresolved. The downgrade
is narrow: a modifier naming a different category is ignored, and an
unaffected candidate still yields an exact count. **This moved none of the
pinned real-data assertions.**

Remaining gap, now documented rather than silent: a scoped category modifier
owned by a *different* occurrence can still reach this one and is not
detectable from the candidate's own choice.

## Measured: the category-condition flip is not worth doing yet

Stage three would feed effective membership into condition identity. Measuring
it first was the right call, because the payoff is far smaller than the risk.

| Bucket | Conditions |
|---|---|
| Unaffected — no modifier touches that category | **3,340** |
| Would stay unresolved — some modifier on that category is unexecutable | **1,580** |
| **Would become knowable** | **127** |
| Total category-referencing conditions | 5,047 |

Of the 100 modifier-controlled categories, only 30 are controlled exclusively by
executable `add`/`remove`. The other 70 are blocked by a scope, a primary
operation, or a generic behavior attribute — and every high-traffic category is
in the blocked set: `Character` (367 condition references), `Infantry` (217),
`Vehicle` (108), `Psyker` (107).

So the flip would rescue 2.5% of the surface while changing the semantics of an
already-shipped evaluation path and introducing a seven-case cycle. **The
bottleneck is not the categories-to-conditions wiring; it is scope resolution
and `set-primary` semantics.** Both are the same retargeting problem `affects`
has.

These numbers are pinned by `categoryConditionImpactSummary` in the real-data
suite, so they stay honest as the data or the executable subset changes. The
guard walks the generic source tree for conditions rather than a typed subset,
because a typed walk missed 164 conditions owned by force entries and cost
types.

### Recommended next boundary

Scope resolution was taken next and is complete; see below.

## Completed Assignment — Modifier Scope Resolution, 2026-08-14

Baseline `ccc8e92`; resulting commit `94a9e47` (`feat: resolve parent and
root-entry modifier scope for categories`). Not pushed, no pull request.

### A correction to the previous recommendation

The prior entry claimed scope resolution would unblock "281 scoped category
modifiers, 1,265 `affects`-bearing characteristic modifiers, and the 70 blocked
categories at once." **The characteristic half of that was wrong.** Of the 1,812
scoped modifiers in the corpus, **1,617 also carry `affects`**, so scope alone
unlocks none of them. Measured honestly, scope-only executable-shaped modifiers
are 150 — all of them `category`.

The category half was right, and larger than expected.

### What was implemented

`parent` and `root-entry` are the two observed scopes whose anchor is a single,
structurally determined occurrence, so both invert cleanly. The modifiers
reaching an occurrence are those declared by its direct children (`parent`) and,
when it is itself top-level, by all its descendants (`root-entry`). An
occurrence can anchor through both at once — a direct child is also a descendant
of its root.

Each inbound modifier's applicability is evaluated against the occurrence that
*declares* it, not the one it reaches. Every step records `origin` and
`declaredBy`. Inbound steps run after the occurrence's own in roster document
order; ordering is observable only when one category is both added and removed
along a single path, which the corpus never does, but the rule is fixed anyway.
A contributor that does not resolve to exactly one materialized choice makes
membership unknown.

`model`, `unit`, `model-or-unit`, and `upgrade` anchor to a nearest typed
ancestor, and `force`/`roster` to collections rather than one occurrence.
Neither is inverted, and neither appears on an executable-shaped category
modifier in the corpus.

### Measured payoff

| Measure | Before | After |
|---|---|---|
| Executable category modifiers | 283 | **428** |
| Blocked categories | 70 | **20** |
| Category conditions that would become knowable | 127 | **1,048** |
| Category conditions staying unresolved | 1,580 | **659** |

All four are pinned by the real-data guard.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **392 passed, 4 skipped (396 total)**.
- Pinned real-data suite — **4 passed**.

### Next recommended boundary

1. **Revisit the category-condition flip.** Its payoff went from 2.5% to 21% of
   the category-condition surface. That was the trigger condition agreed for
   reconsidering it, and it now needs a fresh go/no-go. The evaluation-order
   question and the seven-case cycle are unchanged.
2. **`affects` execution**, still blocked on its three semantic decisions, and
   now additionally on how `affects` composes with `scope` — 1,617 modifiers
   carry both. A plausible reading is that `scope` picks the anchor occurrence
   and the `affects` path navigates from there, making `self` in the path mean
   the scoped occurrence rather than the declaring one. That is an inference,
   not something the data settles.
3. `set-primary` semantics, if a source outside the data can settle whether it
   implies membership and whether it clears other primaries. It is one of the
   two things still blocking the remaining 20 categories.

`name` modifiers remain last despite their raw count, since 86% are Crusade rank
labels.

## Original blocking question — dynamic category membership

Retained for context; superseded by the measurement above.

The `category` modifier surface was inventoried before implementation because
executing it changes the meaning of an already-shipped evaluation surface.

### What the corpus contains

| Dimension | Measurement |
|---|---|
| `field="category"` modifiers | **892** |
| Operations | 532 `add`, 328 `set-primary`, 27 `remove`, 5 `unset-primary` |
| Values | 892 of 892 resolve to a category entry |
| Owners | 747 selection entries, 145 entry links |
| Ownership | 566 direct, 326 grouped |
| Scope | 611 scope-free; 281 scoped (`root-entry` 99, `parent` 78, `model` 68, `upgrade` 31, `force` 4, `roster` 1) |
| Extensions | `affects` 89, `arg` 83, `join` 79, `comment` 2 |
| Conditions | 463 with conditions, 4 with condition groups, 0 repeats |
| Scope-free, extension-free, resolving | **611** — 274 `add`, 325 `set-primary`, 9 `remove`, 3 `unset-primary`; 429 direct, 182 grouped; only **54 unconditional** |

The operations themselves are not the problem. `add`/`remove`/`set-primary`/
`unset-primary` over a membership set derived from the materialized
`categoryLinks` is a well-defined model, and every value resolves.

### Why it is blocked

**Categories already feed condition identity.** `selectionChoiceIdentityIds`
includes every `categoryLink.targetId`, so category membership is already an
input to the condition evaluator. The corpus has **5,047 conditions that
reference a category entry** — 1,991 `instanceOf`, 2,146 `notInstanceOf`, and
910 numeric counts. Those conditions currently evaluate against *static*
category links, and costs, constraints, visibility, and structural status all
depend on them.

Making category modifiers executable therefore forks:

1. **Effective categories feed back into conditions.** Faithful, but it changes
   the result of 5,047 existing conditions and every report built on them. It
   also introduces a real cycle: **7 of the 892 category modifiers have
   conditions that themselves query a category**, so evaluation order has to be
   defined rather than discovered at runtime.
2. **Conditions keep using static links; effective categories stay a separate
   display-only concept.** No existing behavior changes and there is no cycle,
   but the two notions of "category" then disagree, and the second one is not
   used by anything that matters.

Neither is derivable from the data. Option 1 is the larger and riskier change
and would want its own baseline measurement of which pinned assertions move;
option 2 is cheap but arguably not worth doing.

A third possibility is to defer the surface entirely and spend the next
checkpoint on `affects` execution instead, once its own three decisions are
made.

`name` modifiers remain last despite their raw count, since 86% are Crusade rank
labels.

Grouped `hidden` modifiers now participate in read-only visibility. Grouped
cost modifiers now participate in `selectionConditions` cost reports through
the same recursive execution collector. Base and unconditional cost scopes keep
groups inert. Supported operations and exact child repeats execute in the
documented order; unknown group shapes, group-level repeats, unsupported
operations, and unresolved applicability remain observable and incomplete.

The pinned grouped-cost inventory in Task 5 needed correction. Commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc` contains 305 cost-targeting
modifiers in 130 groups: 23 `set`, 131 `increment`, 21 `decrement`, and 130
`divide`. There is no grouped cost `multiply` in that checkout. Of those groups,
123 use `type="and"`, seven omit `type`, none has a group-level repeat, and 23
child modifiers carry repeats.

The Task 6 browser measurement and first headless acquisition slice are
complete. The repository package now validates exact GitHub commit pins, lists
bounded commit trees, streams and securely ingests individual pinned files, and
plans exact-ID catalogue dependency closures from an available metadata index.
Pinned tree files also have a transport-neutral read-through cache contract with
size and Git blob integrity verification. Sequential remote metadata indexing
and focused closure acquisition are also complete, including summary-versus-
download verification. The first `App.tsx` split is complete: a focused
`useRosterForgeAppController` now owns imports, drafts, catalogue selection,
history, and roster commands while `App` retains presentation composition.
Saved drafts, catalogue library/import reporting, catalogue details/roster
setup, workspace states, and shared display primitives are now separate modules.
The complete active roster workspace is now a separate byte-for-byte moved
module as well, leaving `App.tsx` as a small composition root. Defensive,
versioned IndexedDB adapters now persist verified pinned repository bytes and a
bounded metadata report keyed by immutable commit plus tree object ID. The
acquisition UI is complete for one configured immutable WH40K 11e snapshot:
users can index with progress and cancellation, choose a non-library faction
catalogue, acquire its exact-ID dependency closure, and enter the existing
roster flow. Repeat browsing validates the pinned tree, restores matching
metadata without reparsing every source file, and still verifies and re-ingests
the selected closure before publication. Remote documents compose without
reparsing or replacing download provenance. Draft snapshots retain optional
source IDs and source kinds, so reopening a downloaded closure does not silently
rewrite it as a local-file source. Cache eviction, quota controls, additional
source configuration, and repository update discovery remain deferred.

The first Task 7 export checkpoint is complete. The active roster workspace now
builds a standalone print/save-PDF document from the immutable roster and its
existing cost and supported-validation reports. It preserves nested source
order, occurrence and definition IDs, effective quantities, included selection
costs, roster totals, and explicit validity/completeness labels. All imported
and user-authored strings are escaped before writing the new window. Popup
failure remains a retryable UI alert. This is deliberately a presentation
export; faithful `.ros`/`.rosz` interchange remains deferred until the roster
model carries the additional expanded profiles, rules, categories, and link
identity required by the BattleScribe roster schema.

The `localConditionGroups` correction is also complete. The pinned shape is 339
`localConditionGroup` extension objects, all `atLeast`/`selections`/`parent`,
each containing one nested `before` condition and one nested `instanceOf`
condition. They now have a separate typed projection with scalar repeat
metadata and nested conditions preserved by reference. Evaluation emits one
source-located unsupported-extension diagnostic and no longer mistakes an
extension-only group for an empty group. The 59 ordinary condition groups with
type `count` remain preserved strings and unresolved. This corrects the older
claim below that the 339 local records were themselves `before` conditions.

On August 13, 2026, the 46 pinned files (67,554,454 bytes) imported through the
local Chromium application in 3,324 ms end to end. An application probe measured
2,608.4 ms through the post-render boundary and a JavaScript heap increase from
152,078,277 bytes to 821,735,425 bytes, or 638.6 MiB. All 46 files imported, 36
catalogues were selectable, the expected 65 issues remained observable, and the
browser console had no warnings or errors. The measured heap cost makes pinned
dependency-closure acquisition the default recommendation; all-repository
loading remains an explicit compatibility and diagnostics path.

The review's weak grouped assertion and negative-limit question are now closed.
The pinned integration test adds one real Weapon Modifications occurrence and
proves grouped constraint `33dc-ea33-2bce-e0b0` changes from `baseLimit: 0` to
`limit: 2` through one applied grouped increment and no direct modifier. The
corpus guard also pins all 26 negative constraints: 21 `max`, five `min`, 17
selection fields, nine points-cost fields, and parent/force/roster scope counts
of 5/15/6. Every value is `-1`; RosterForge intentionally preserves and
diagnoses them rather than inventing disabled or unbounded sentinel semantics.

---

## 1. Audit Provenance And What Was Not Verified

**Verified.** Your real-data modifier-group inventory reproduces exactly:
1,491 `and` groups with constraint-targeting descendants; 4,038 target
operations comprising 2,865 `increment`, 1,167 `set`, 4 `decrement`, and 2
`multiply`. All four figures match independently. The architecture boundaries
are genuinely enforced (`eslint.config.mjs` `no-restricted-imports` plus
`package-boundaries.test.ts`), and the integration assertions do prove execution
rather than the absence of diagnostics — `baseLimit: 0 → limit: 2000` in
`apps/web/src/bsdata-json.integration.test.ts` is a real behavioural delta.

**Not verified.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
could not be run during the review: the machine holding the worktree has no
Node.js installation on `PATH`. The reported "284 passed, 3 skipped" and
"build passed" remain unconfirmed by the reviewer.

**First action of the next session: re-run all four checks and report the actual
output.** Do not carry the previous numbers forward as established.

---

## 2. The Central Finding

The condition evaluator already decides **95.9%** of every modifier in the
pinned corpus. Execution has been wired for one target field. Roughly half of
the modifier surface is decidable-but-inert.

| Modifier target | Count | Decidable | Executed today |
|---|---|---|---|
| `name` | 7,673 | 100% | none |
| `constraint` | 6,245 | 99.2% | direct + grouped |
| `hidden` | 4,779 | 89.6% | direct only (309 grouped inert) |
| `costType` | 1,939 | 81.5% | direct only (305 grouped inert) |
| `characteristicType` | 1,741 | 99.4% | none |
| `category` | 892 | 99.8% | none |
| **Total** | **24,168** | **95.9%** | **~12,300 (51%)** |

Your proposed next session — grouped cost-targeting modifiers — addresses
**305 modifiers**, tied for the smallest remaining bucket. The collector that
would do it (`collectRosterModifierGroupExecution`) is already written and
already generic. It is a correct task; it is not the highest-value one.

### The larger issue: completeness is being consumed by unreachable content

| | Total | Crusade-only | Matched play |
|---|---|---|---|
| Modifiers | 24,168 | 8,402 (34.8%) | 15,766 |
| Constraints | 26,259 | 4,455 (17.0%) | 21,804 |

86% of the 7,673 `name` modifiers are the five Crusade rank labels
(`(Battle-ready)`, `(Blooded)`, `(Battle-hardened)`, `(Heroic)`, `(Legendary)`,
1,319–1,320 each). All 3,958 constraints with `field=<costType> scope="self"`
are Crusade Battle Honours or Weapon Modifications.

`completeness` is currently a single global flag aggregated over everything
projected, including content that is not reachable from the roster being
evaluated. The practical consequence is that a matched-play roster is
permanently `incomplete` because of narrative-mode content the user never
selected. A flag that is always `incomplete` carries no information, which
defeats the purpose of the two-dimensional validation contract.

**This is the highest-leverage remaining change.** It is what converts the
validation surface from "informative but never conclusive" into conclusive, and
it is the difference between the current app and New Recruit's user experience.

---

## 3. Revised Work Order

Each item is one bounded session. Do not merge them.

### Task 1 — Baseline the checks

Re-run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and report exact
output. Confirm the three real-data integration tests still pass with
`ROSTERFORGE_BSDATA_JSON_DIR` set. No code changes.

### Task 2 — Identity conditions in `parent` and `self` scope

`packages/evaluation/src/conditions.ts` supports `instanceOf`/`notInstanceOf`
for `force`, `ancestor`, `root-entry`, the typed scopes, and
`primary-catalogue`. `parent` and `self` are absent, so they currently emit
`EVALUATION_CONDITION_IDENTITY_SHAPE_UNSUPPORTED`.

The corpus contains **1,084** identity conditions in `parent` scope and **72**
in `self` scope. This is the single largest condition gap in the data, and
`parent` is a depth-1 special case of `ancestor`, which is already implemented
and already tested.

Acceptance: synthetic fixtures covering true, false, and unresolved outcomes in
both scopes; the 1,156 corpus conditions no longer produce identity-shape
diagnostics; `docs/compatibility.md` condition-scope inventory updated.

### Task 3 — Relevance-scoped completeness

Do **not** implement this as "ignore Crusade". Hardcoding game-mode knowledge
would violate the project's own rule against silently dropping unsupported data,
and would not generalise beyond 40k.

Implement it as a general relevance rule: **unsupported projected behavior makes
an evaluated result incomplete only when it could affect that result.**
Unsupported behavior on a definition that is not selected, and not reachable
from the current roster's selected occurrences, belongs in catalogue-level
diagnostics rather than in the roster report's completeness.

There is already precedent for exactly this instinct in the codebase.
`docs/architecture.md` describes the structural report's handling of unselected
roots: such a root "is not promoted into the actionable bound list; its
unsupported behavior still makes the report incomplete and contributes to one
catalogue-level inactive-root diagnostic." That decision solved the actionable
list and deliberately left completeness alone. This task is extending the same
reasoning to completeness itself.

Constraints on the design:
- Excluded behavior must remain observable and diagnosed at catalogue level.
  Nothing is silently discarded.
- The relevance test must be structural (reachability from selected
  occurrences), not a name or keyword match.
- If reachability cannot be determined, the content stays relevant and the
  report stays incomplete. Conservative direction is unchanged.
- Validity semantics do not change. Only the aggregation scope of completeness
  changes.

Acceptance: a configured matched-play Aeldari roster reports
`completeness: "complete"` for its cost total, with Crusade content still
diagnosed at catalogue level; synthetic fixtures prove that reachable
unsupported behavior still forces `incomplete`; `docs/architecture.md` and
`docs/compatibility.md` describe the relevance rule explicitly.

### Task 4 — Generalize grouped execution to `hidden`

Reuse `collectRosterModifierGroupExecution` for
`evaluateRosterSelectionVisibility`. 309 grouped `hidden` modifiers currently
never execute, which means entries that should be hidden stay in the
child-choice surface. Visibility is directly user-facing, so this is worth more
than the same amount of work spent on costs.

Preserve the documented order (direct owner modifiers, then top-level groups in
source order, direct children before nested groups depth-first) and keep
group-level repeats unresolved.

### Task 5 — Generalize grouped execution to costs

Your originally planned session. Same collector, 305 modifiers. Note that
`divide` (140) and `multiply` (1) appear as cost operations and are outside the
supported `set`/`increment`/`decrement`/`floor` kernel; preserve them as
incomplete rather than extending the kernel speculatively in this task.

### Task 6 — Catalogue acquisition

The largest product-level blocker. A user currently has to know that Aeldari
needs 4 specific JSON files and Imperial Knights needs 7, and hand-pick them
from disk. New Recruit presents a faction list.

Implement fetching a pinned BSData repository index and its dependency closure.
All existing rules apply without exception: downloaded bytes are untrusted,
existing byte/archive/JSON limits are enforced before parsing, nothing is
executed, provenance is retained, and failures are diagnostics. Pin the commit
rather than tracking a moving branch.

Before building UX on top of a whole-repository load, **measure it**: the corpus
is 67.6 MB across 1,539,432 JSON nodes and 1,282,724 properties, and the
preserve-everything model retains ordered wrappers plus source ranges for all of
them, plus a 102,982-entry ID index, plus materialization budgeted to 250,000
expansions. A back-of-envelope estimate is 0.5–1 GB of browser heap. The
existing integration proof runs in Node with a much larger default heap. Record
actual browser time and memory figures in `docs/compatibility.md` before
committing further work to the all-repository path.

### Task 7 — Roster export

A browser print/save-PDF presentation path is complete. It retains roster,
catalogue, force, selection, definition, cost, validation, and diagnostic
identities in a serializable view model. It is explicitly not `.ros`/`.rosz`
interchange; that format remains deferred.

### Task 8 — Display-fidelity modifiers

`characteristicType` (1,741, 99.4% decidable, ~96% matched-play relevant) is the
one that matters most here — it is how weapon and model stat changes reach the
profile display. `category` (892) affects dynamic keywords. `name` (7,673) is
86% Crusade and should be sequenced last despite its raw count.

The first bounded checkpoint closed a structural gap: all profiles now project
their ordered direct modifiers and modifier groups, and materialized profile
info links expose those exact arrays by reference.

The second bounded checkpoint (`04444cb`) added headless characteristic-display
evaluation for profile-owned modifiers. Target routing is exact-`typeId` only,
and `set` is the only executed operation. 173 of the 484 profile-owned
characteristic modifiers are in the executable subset; the rest stay preserved,
diagnosed, and incomplete. Generic `affects`, `join`, `arg`, and `position`
remain preserved and unapplied, and `affects` is the documented blocker for the
1,257 characteristic modifiers owned outside profiles. See the completed
assignment above for the full inventory and the open semantic questions.

The third bounded checkpoint (`a42b791`) surfaced that report in the roster
workspace with base-versus-effective display, an explicit unresolved label, and
a per-profile incomplete note. It added no evaluation semantics.

The fourth bounded checkpoint (`449c17f`) added profile visibility. All 154
profile-owned `hidden` modifiers fit the supported Boolean `set` shape, and they
no longer make a characteristic report incomplete.

The fifth bounded checkpoint (`59757d9`) closed the `affects` grammar question
with a pure parser and a pinned corpus guard. It deliberately stops short of
execution; the three remaining semantic decisions are recorded below.

---

## 4. Smaller Corrections

**Two undocumented schema extensions.** The compatibility document enumerates
observed shapes exhaustively, so these are gaps in that inventory:

- `localConditionGroups` — a property that does not exist in BattleScribe 2.03.
  339 conditions of type `before` (also not 2.03) sit at
  `modifiers/conditionGroups/localConditionGroups/conditions`. The string
  `localConditionGroups` appears nowhere in the codebase, so the JSON adapter
  never projects it and those groups project as empty. Behavior fails safe
  (empty group → unresolved), but the shape should be documented and the
  emptiness should be distinguishable from a genuinely empty group.
- `conditionGroups` with `type: "count"` — 59 occurrences, concentrated in
  Genestealer Cults. Unknown type → unresolved, so also safe, also undocumented.

**Negative constraint limits.** `docs/compatibility.md` frames `-1` as an open
question. The corpus contains 26 instances total (21 `max`, 5 `min`). Close it
as "won't fix, 26 instances" rather than leaving it open.

**Weak grouped assertion.** In the real-data integration test, the grouped-path
assertion is `modifierSequence.steps.length > modifiers.length`. That proves an
extra step entered the sequence, not that a grouped step changed a value. Pin a
specific constraint whose effective limit differs *because of* a grouped
modifier, in the style of the existing `baseLimit: 0 → limit: 2000` assertion.

**`apps/web/src/App.tsx` is 3,502 lines** with roughly 70 top-level
declarations — about 40% of the web app in one file. Not urgent, but split it
before roster editing grows further.

---

## 5. Standing Guardrails

- Do not reset, clean, checkout, or revert the worktree. Existing uncommitted
  and untracked work is intentional.
- The two-dimensional validation contract does not change. Task 3 changes what
  completeness aggregates over, never whether unsupported behavior is reported.
- Do not extend the numeric kernel to `divide`, `multiply`, `replace`,
  `set-primary`, `add`, or `append` opportunistically. Each is its own decision.
- Preserve-don't-replace still holds for every new surface.
- Update `docs/architecture.md`, `docs/compatibility.md`, and
  `docs/diagnostics.md` whenever behavior or boundaries change.
- Finish one task completely before starting the next.

---

## Appendix — Reproducing The Numbers

Throwaway audit script. Do not commit it; it reads third-party data.

```python
import json, glob, os, collections

DIR = r"E:\GitHub\wh40k-11e"
docs = [json.load(open(f, encoding="utf-8"))
        for f in sorted(glob.glob(os.path.join(DIR, "*.json")))]

id_kind, name_of = {}, {}
SING = {"selectionEntries":"selectionEntry","sharedSelectionEntries":"selectionEntry",
 "selectionEntryGroups":"selectionEntryGroup","sharedSelectionEntryGroups":"selectionEntryGroup",
 "entryLinks":"entryLink","categoryEntries":"categoryEntry","costTypes":"costType",
 "constraints":"constraint","characteristicTypes":"characteristicType","forceEntries":"forceEntry"}
def idx(n, hint=None):
    if isinstance(n, dict):
        i, nm = n.get("id"), n.get("name")
        if isinstance(i, str):
            if hint: id_kind.setdefault(i, hint)
            if isinstance(nm, str): name_of[i] = nm
        for k, v in n.items(): idx(v, SING.get(k) or hint)
    elif isinstance(n, list):
        for v in n: idx(v, hint)
for d in docs: idx(d)

NUM = {"atLeast","atMost","greaterThan","lessThan","equalTo","notEqualTo"}
IDENT = {"instanceOf","notInstanceOf"}
TYPED = {"unit","model","model-or-unit","upgrade"}
NUM_SCOPES = {"self","parent","root-entry","force","roster"} | TYPED
IDENT_SCOPES = {"force","ancestor","root-entry","primary-catalogue"} | TYPED
ID_KINDS = {"selectionEntry","selectionEntryGroup","entryLink","categoryEntry"}
RANKS = {"(Battle-ready)","(Blooded)","(Battle-hardened)","(Heroic)","(Legendary)"}
reasons = collections.Counter()

def cond_ok(c):
    t, f, s = c.get("type"), c.get("field"), c.get("scope")
    if c.get("percentValue"): return False
    sk = id_kind.get(s)
    if t in NUM:
        if f == "selections": return s in NUM_SCOPES or sk in ID_KINDS
        if f == "forces": return s == "roster" and c.get("shared") is True
        if id_kind.get(f) == "costType": return s == "root-entry" or s in TYPED
        return False
    if t in IDENT:
        ok = s in IDENT_SCOPES or sk in ID_KINDS
        if not ok: reasons[f"ident/scope={s}"] += 1
        return ok
    reasons[f"conditionType={t}"] += 1
    return False

def grp_ok(g):
    if g.get("type") not in ("and","or"): return False
    if not (g.get("conditions") or g.get("conditionGroups")): return False
    return all(cond_ok(c) for c in g.get("conditions") or []) and \
           all(grp_ok(x) for x in g.get("conditionGroups") or [])

def mod_ok(m, inherited):
    return (inherited
            and all(cond_ok(c) for c in m.get("conditions") or [])
            and all(grp_ok(g) for g in m.get("conditionGroups") or [])
            and all(r.get("field") == "selections" and not r.get("percentValue")
                    for r in m.get("repeats") or []))

def mgrp_ok(g):
    return (g.get("type") == "and" and not g.get("repeats")
            and all(cond_ok(c) for c in g.get("conditions") or [])
            and all(grp_ok(x) for x in g.get("conditionGroups") or []))

def bucket(f):
    if f in ("hidden","name","category"): return f
    return id_kind.get(f) or "<unknown-id>"

stats = collections.defaultdict(collections.Counter)
crusade_ids = {i for i, n in name_of.items()
               if "crusade" in n.lower() or n in ("Battle Honours","Weapon Modifications")}

def is_crusade(m, ctx):
    return (m.get("value") in RANKS or m.get("field") in crusade_ids or ctx
            or any(c.get("childId") in crusade_ids or c.get("scope") in crusade_ids
                   for c in m.get("conditions") or []))

def visit(c, inherited, grouped, ctx):
    for m in c.get("modifiers") or []:
        b = bucket(m.get("field")); s = stats[b]
        s["total"] += 1
        s["decidable" if mod_ok(m, inherited) else "undecidable"] += 1
        if grouped: s["grouped"] += 1
        if is_crusade(m, ctx): s["crusade"] += 1
    for g in c.get("modifierGroups") or []:
        visit(g, inherited and mgrp_ok(g), True, ctx)

def walk(n, ctx=False):
    if isinstance(n, dict):
        nm = n.get("name")
        ctx = ctx or (isinstance(nm, str) and "crusade" in nm.lower())
        if "modifiers" in n or "modifierGroups" in n: visit(n, True, False, ctx)
        for k, v in n.items():
            if k not in ("modifiers","modifierGroups"): walk(v, ctx)
    elif isinstance(n, list):
        for v in n: walk(v, ctx)
for d in docs: walk(d)

print(f"{'target':22}{'total':>8}{'decidable':>11}{'%':>8}{'grouped':>9}{'crusade':>9}")
T = D = C = 0
for b, c in sorted(stats.items(), key=lambda kv: -kv[1]["total"]):
    print(f"{b:22}{c['total']:8}{c['decidable']:11}{100*c['decidable']/c['total']:7.1f}%"
          f"{c['grouped']:9}{c['crusade']:9}")
    T += c["total"]; D += c["decidable"]; C += c["crusade"]
print(f"{'TOTAL':22}{T:8}{D:11}{100*D/T:7.1f}%{'':9}{C:9}")
print("\ntop undecidable reasons:")
for k, v in reasons.most_common(8): print(f"  {k:34}{v}")
```

Expected output: 24,168 modifiers, 95.9% decidable, 8,402 Crusade; top
undecidable reason `ident/scope=parent` at 1,084.

## Completed Assignment — The Category Condition Flip, 2026-08-14

Baseline `88e495e`. Resulting commits: `64e8f3b` (`feat: feed effective category
membership into condition identity`) and `27a2801` (`feat: consume effective
categories in cost, constraint, and visibility reports`). Not pushed, no pull
request.

Stage three of the staged category plan, approved after scope resolution moved
its payoff from 2.5% to 21% of the category-condition surface.

### The single-pass rule

Membership and identity are mutually recursive in principle: a category modifier
may carry conditions, and a condition may test a category. This resolves in one
documented pass, not a fixpoint.

Pass one — `indexEffectiveRosterCategories` — evaluates every category
modifier's applicability with **no index in scope**, so a condition inside a
category modifier compares static links. Pass two is every ordinary evaluation,
which consults the finished index. `evaluateRosterSelectionCategories`
deliberately never consumes the index; that is what keeps pass one from
recursing.

The consequence is deliberate and permanent: an occurrence whose category
modifiers depend on category identity keeps unknown membership — seven of 892
modifiers in the pinned corpus. BattleScribe may iterate to a fixpoint instead.
Nothing in the data establishes that, so the chained case is refused.

### Design notes worth knowing

- **Layering.** The index *type* lives in the leaf `selection-context` module so
  the condition layer can accept an index without importing the evaluator that
  produces it. Package layering stays acyclic:
  `selection-context ← conditions ← modifier-applicability ← modifier-groups ←
  categories ← effective-categories`.
- **Authority.** Known membership *replaces* the static links for a category
  target rather than adding to them, so a removed category stops matching even
  though its link is still projected. Non-category identity targets are
  untouched.
- **Memoization.** `effectiveRosterCategories` caches by roster and context
  identity. Sound because every roster command returns a new immutable roster;
  necessary because rebuilding per selection is quadratic.

### Consumers wired

Cost evaluation, selection constraints, force constraints, and selection
visibility each build the index and forward it through modifier applicability
and modifier-group applicability. Composed supported validation inherits it.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **395 passed, 4 skipped (399 total)**. Three new synthetic
  proofs: a modifier-granted category resolving from unresolved to satisfied, a
  removed category ceasing to match, and a cyclic occurrence staying unknown.
- Pinned real-data suite — **4 passed, all assertions unchanged.**

At the time of the flip commits no pinned assertion moved, because the existing
rosters do not exercise a category-controlled condition. That gap is now closed
by the checkpoint below.

## Completed Assignment — Pinning The Flip, 2026-08-17

Baseline `41950db`; resulting commit `e0d3c68` (`test: pin the category flip
against real data`). Not pushed, no pull request.

The flip previously rested on a static measurement. This adds the observed
behavioural delta, in the style of the `Custodian Guard W 3 → 4` pin.

An Adeptus Custodes **Venerable Contemptor Dreadnought** takes its **Character
upgrade**, whose modifier adds the Character category with `scope="root-entry"`.
The Dreadnought does not declare that category statically, so one test proves
the scope inversion and the execution together:

- `baseCategories` excludes Character; `categories` includes it.
- The applied step records `origin: "root-entry-scope"` and `changed: true`.
- The paired `set-primary` stays unapplied without costing membership.

A real condition from the same catalogue — `instanceOf`, `selections`,
`scope="root-entry"`, `childId=Character`, `shared` — is then evaluated both ways
against that roster: **unresolved without the index, satisfied with it.**

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` clean;
`pnpm test` **395 passed, 5 skipped**; pinned real-data suite **5 passed**.

## Completed Assignment — Workspace Keywords, 2026-08-17

Baseline `8835518`; resulting commit `2bbdbb7` (`feat: show effective keywords
in the roster workspace`). Not pushed, no pull request. Presentation only.

`inspectLocalRosterSelectionCategories` resolves membership into display-ready
keywords, naming each category from the composed catalogue definitions and
keeping the raw ID when no definition names one. The occurrence panel lists
effective keywords in order, marks modifier-granted ones, shows removed
keywords struck through rather than hidden, and states plainly when membership
is unresolved — the same preserve-and-label rule the hidden-profile and
base-versus-effective displays use.

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` clean;
`pnpm test` **395 passed, 5 skipped**; pinned real-data suite **5 passed**.

### Next recommended boundary — both need a decision first

1. **`affects` execution.** Three semantic decisions from the parsing
   checkpoint, plus how `affects` composes with `scope` (1,617 modifiers carry
   both). The plausible reading is that `scope` picks the anchor occurrence and
   the `affects` path navigates from there, making `self` mean the scoped
   occurrence rather than the declaring one. That is an inference, not
   something the data settles.
2. **`set-primary` semantics.** One of two things still blocking the remaining
   20 categories. Needs a source outside the data to settle whether it implies
   membership and whether it clears other primaries.

Smaller work that needs no decision, if a session wants it: extend the
category-condition honesty downgrade to inbound scoped modifiers declared by
*other* occurrences, which is still an explicit documented gap.

## Completed Assignment — set-primary Semantics, 2026-08-17

Baseline `ba53ad6`; resulting commit `f6bb1d7` (`feat: execute set-primary and
unset-primary category operations`). Not pushed, no pull request.

This was the research checkpoint: the question was whether a source outside the
data could settle `set-primary`. One could.

### What the sources say

**Membership — settled by direct quote.** The BattleScribe 2.03.00 release notes
state: *"When setting a Category to primary, the Category will be added if it
doesn't already exist."* That is the BattleScribe author, and it explains the
corpus shape that blocked us: 322 of 325 executable-shaped `set-primary`
modifiers name a category their owner does not link.

**Displacement — inference, well corroborated.** Three sources converge: the
BSData wiki calls the primary *"the category in which that entry will be visible
in Roster Editor"*, singular; the release note describes the operation as making
it easier to *move* entries between categories; and BattleScribe issue #18 shows
an entry displaying under exactly one category and moving when its primary
changes.

A counter-signal appeared during implementation and was checked rather than
waved away. The pinned Custodes Character upgrade carries an explicit
`unset-primary Vehicle` beside its `set-primary Character` — which would be
unnecessary if `set-primary` already displaced. The corpus settles it: only
**five of 319** `set-primary` owners pair an `unset-primary`, and **234** owners
would hold more than one primary without displacement, against a documented
single-slot display model. Those five explicit unsets are redundant authoring,
not evidence. Primary status affects presentation rather than legality, which
bounds the cost of the inference being wrong.

`unset-primary` clears the flag and leaves membership alone; nothing suggests
otherwise.

### Sources

- BattleScribe 2.03.00 release notes — <https://github.com/BattleScribe/Pre-Release/issues/17>
- BattleScribe 2.03.00 blog announcement — <http://battlescribe.blogspot.com/2019/08/battlescribe-20300-released.html>
- BSData data-structure overview — <https://github.com/BSData/catalogue-development/wiki/Data-structure-overview>
- Primary-category behaviour report — <https://github.com/BattleScribe/Pre-Release/issues/18>

### Measured payoff

| Measure | Before | After |
|---|---|---|
| Executable category modifiers | 428 | **761** |
| Blocked categories | 20 | **8** |
| Category conditions resolved by effective membership | 1,048 | **1,605** |
| Category conditions still unresolved | 659 | **102** |

For context, the unresolved figure was 1,580 before any of this work. The
remaining eight categories are blocked by generic behavior attributes, chiefly
`affects`.

The `primaryOnly` step flag is gone. It existed because a primary operation
could not change membership, which is no longer true.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **397 passed, 5 skipped (402 total)**.
- Pinned real-data suite — **5 passed**. The Custodes pin now asserts the full
  real sequence: `add Character`, `unset-primary Vehicle`, `set-primary
  Character`, leaving Character the sole primary.

### Next recommended boundary

`affects` execution; see the research checkpoint below, which answered several
of its open questions and corrected one earlier claim.

## Research Checkpoint — `affects` Semantics, 2026-08-17

> **Partly superseded.** Its "Precedence, not composition" finding — that
> `affects` overrides `scope` — was disproved in New Recruit on 2026-08-20.
> The two compose: `scope` chooses where the selector stands, `affects` chooses
> where it walks. See "Completed Assignment — `affects` Anchoring". The rest of
> this entry (profile-type matching, `position`, `modulo`) still holds.

No code change. Documentation only, following the same
search-before-inferring approach that settled `set-primary`.

### The key structural finding

**`affects` is a New Recruit extension, not a BattleScribe 2.03 feature.** It
appears in no BattleScribe release note or schema. Its semantics are defined by
New Recruit, whose data editor is open source
(<https://github.com/giloushaker/nr-editor>). The runtime logic lives in a
private submodule (`giloushaker/nr-shared`, 404), but the editor's own modifier
panel encodes enough to settle several questions.

That also explains why 1,617 modifiers carry **both** `affects` and `scope`:
BattleScribe ignores `affects` and honours `scope`, so authors write both to get
sensible behaviour in each tool.

### Settled

**Profile-type matching.** The segment after `profiles` is matched against
declared **profile type names, case-insensitively**. `all` — or an absent
segment — means any profile type. A name matching no declared profile type is
treated as *invalid authoring*, not as an empty match. This confirms the earlier
inference and adds two refinements we did not have: case-insensitivity and the
`all` sentinel.

**`position`.** The editor tooltip reads: *"1-Based index of the match to
affect. supports negative indexes. 0 = All"*. So `-1` selects the last match,
`1` the first, `0` every match. It is offered only for `replace`, `increment`,
`decrement`, `multiply`, `divide`, `modulo`, `floor`, and `ceil` on `string` or
`string-or-number` fields — so it indexes matches *within a value*, not
placement within an appended list. The pinned corpus has `position` `-1` 153
times, `""` five times, and `1` three times.

**`modulo` exists** as an operation, alongside the kinds already inventoried.

### Corrected

A previous entry proposed that `scope` picks the anchor occurrence and the
`affects` path navigates from there. **That is wrong.** The editor treats them
as alternatives: when `affects` is present and is not the literal `self`, it
determines the target and `scope` is not consulted; otherwise `scope` is. The
value `self` means "no retargeting", falling back to `scope`.

This matters for design: `affects` **overrides** `scope` rather than composing
with it, so the two mechanisms do not need a combination rule — they need a
precedence rule.

### Still open

1. Whether `entries` means direct child occurrences or all descendants. The
   corpus contrast between `self.entries.profiles.X` and
   `self.entries.recursive.profiles.X` implies the former, but nothing external
   confirms it.
2. What an embedded category or entry ID does in the path — filter the traversal
   set, or narrow the selected profiles.
3. Whether the editor's precedence rule is also the runtime rule. It governs the
   editor's field typing, which is strong evidence but not proof.

Those three could be settled by reading New Recruit's runtime behaviour
directly, or by a targeted experiment: build a unit in New Recruit whose upgrade
carries a non-recursive `affects` and observe which nested profiles change.

### Sources

- New Recruit data editor, modifier panel —
  <https://github.com/giloushaker/nr-editor/blob/master/components/catalogue/right_panel/fields/Modifier.vue>
- New Recruit editor repository — <https://github.com/giloushaker/nr-editor>
- BattleScribe 2.03.00 release notes (no `affects`) —
  <https://github.com/BattleScribe/Pre-Release/issues/17>

### Next recommended boundary

Taken in the checkpoint below.

## Completed Assignment — Owner-Relative `affects`, 2026-08-17

Baseline `109396c`; resulting commit `9683ca8` (`feat: execute owner-relative
affects routing for characteristics`). Not pushed, no pull request.

A modifier declared by a profile's **owning selection** now reaches that profile
through an `affects` selector. Only the owner-relative form executes: no
`entries` traversal, no embedded filter ID, ending in
`profiles.<profileTypeName>`. That subset needs neither of the two still-open
decisions, so it could be built without inventing anything.

Selectors that traverse beyond the owner are left alone entirely rather than
recorded as unapplied steps on every profile they might reach — a wrong-looking
incomplete marker on an unrelated profile would be worse than silence about a
modifier that was never routed here.

### Design points

- **Profile-type matching** follows New Recruit's editor: case-insensitive
  against the *declared* type resolved from `typeId` through the graph, never
  against the denormalized `typeName`. `all` matches any type; an unmatched name
  routes nothing.
- **Precedence, not composition.** `affects` overrides `scope`, so a routed
  modifier's scope is not counted against it and neither is the `affects`
  attribute itself.
- **Order.** Routed steps record `origin: "affects"` and run *after* the
  profile's own, keeping a profile-owned modifier authoritative over an
  inherited one.
- **Unresolvable type.** A profile whose type does not resolve uniquely makes
  the report incomplete when its owner carries any `affects` modifier, since one
  might have targeted it.

### Pinned corpus

237 of the 1,246 parsed characteristic selectors take the owner-relative form.
All resolve to a declared profile type, using only `Unit` (187), `Ranged
Weapons` (29), and `Melee Weapons` (21). **156** are `set` operations the
lexical kernel executes; the rest are `increment` (47), `append` (19), `replace`
(13), and `decrement` (2), which remain unapplied for the same
lexical-arithmetic reasons as before.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **400 passed, 5 skipped (405 total)**.
- Pinned real-data suite — **5 passed**, unchanged.

### Next recommended boundary

1. **Settle the two remaining `affects` questions**, ideally by experiment in
   New Recruit: build a unit whose upgrade carries a non-recursive `affects` and
   observe which nested profiles change, then repeat with an embedded category
   ID. That unlocks the ~1,000 traversal selectors, which is where the weapon
   stat changes live.
2. **A pinned real-data proof of owner-relative routing**, in the style of the
   Custodes category pin. Nothing currently exercises it against the corpus, so
   the 156 figure rests on a static count.
3. Smaller decision-free work: extend the category-condition honesty downgrade
   to inbound scoped modifiers declared by other occurrences.

## Completed Assignment — `affects` Traversal Settled, 2026-08-19

Baseline `fec5108`; resulting commit `41ce465` (`feat: accept the group
traversal segment in affects selectors`). Not pushed, no pull request.

Stone ran the New Recruit experiments. Both open questions are now answered by
observation rather than inference, and a grammar segment we had never seen
turned up.

### Method note

Before drawing conclusions, the live BSData files were fetched and compared
against the pinned snapshot, because two modifiers failed to fire and stale data
would have been the boring explanation. It was not: the relevant modifiers exist
verbatim in live data with identical base values, so the non-firing was real
behaviour. One apparent counter-example — a Helbrute `append Assault` that did
nothing — turned out to sit inside a modifier group with its own unmet
`atLeast 1 selections scope=force` condition, so it says nothing about
traversal.

### Settled: `entries` does not enter groups

A Necron **Skorpekh Lord** carries an unconditional
`self.entries.profiles.Melee Weapons` increment of +2 S. Its Flensing claw
stayed at S 6. The weapons are not direct entries — they sit inside the model's
`Wargear` selection-entry group.

A Death Guard **Helbrute** carries `self.entries.recursive.<category>.profiles.
Melee Weapons` +2 A, and its group-resident melee weapons did gain the bonus.

So **`entries` is the direct child *entry* collection and does not descend into
selection-entry groups; `recursive` reaches all descendants.**

This also invalidated an assumption in the analysis tooling, which had been
treating groups as depth-transparent when computing profile depth.

### Settled: the embedded ID filters

With two `Helbrute melee weapon` category members selected, both gained +2 A
(Power scourge 8→10, Helbrute fist 5→7) while `Close combat weapon`, the one
melee profile outside that category, stayed at 5. Dropping to a single member
removed the bonus entirely, matching the modifier's own `atLeast 2` condition.
New Recruit renders modified values in blue, which made the deltas unambiguous.

### New: the `group` traversal segment

Live data contains a `group` segment that the pinned snapshot does not contain
at all — nine distinct values across just Necrons and Death Guard, including
`self.entries.group.recursive.profiles.Ranged Weapons` and
`group.recursive.group.profiles.Unit`. It enters selection-entry groups without
full recursion, independently confirming groups are a traversal step.

The parser now consumes traversal keywords in any order and any number of times,
since `group` occurs leading, after `entries`, and again after `recursive`. It
exposes `entersGroups` separately. Without this the parser would have read
`group` as a filter ID and mis-parsed those paths. No pinned-corpus count moves,
because no pinned selector uses it.

### Still open, and not worth an experiment

What an embedded ID does when it names a **selection entry** rather than a
category. The entire corpus contains one instance.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **403 passed, 5 skipped (408 total)**.
- Pinned real-data suite — **5 passed**, unchanged.

### Next recommended boundary

**Traversal execution.** The semantics are now fully specified, so this needs no
further decisions:

- `own` — the modifier's own owner. *Already implemented.*
- `children` — the owner's direct child **entries**; group members only when the
  selector carries `group`.
- `descendants` — every descendant occurrence.
- An embedded **category** ID filters the target set to occurrences holding that
  category, which the effective-category index already answers.
- The profile type matches case-insensitively against the declared type.

Implementation shape: for a given (owner occurrence, profile), walk the
occurrence's **ancestors** and collect their `affects` modifiers, testing
whether this occurrence falls in each selector's target set. The occurrence tree
flattens groups in browser-built rosters but retains group occurrences in
headless ones, so the route test should count entry steps while treating a
selection-entry-group occurrence as a non-entry step — that way it is correct
under both shapes.

Only `set` executes, as before, so the visible unlock is bounded by the lexical
kernel; the rest become correctly-attributed incompleteness on the right
profile.

## Completed Assignment — Traversal Execution And Pin, 2026-08-19

Commits `72455bf` (traversal execution) and `841e50f` (real-data pin plus a bug
it caught). Pushed; `main` and `codex/recovery-baseline` are level and CI is
green on both.

### Traversal executes

A modifier declared by a profile owner or any ancestor now routes to that
profile when the occurrence falls in its selector target set, using the
semantics Stone verified in New Recruit rather than inferred ones. An embedded
category ID filters through the effective-membership index, so a
modifier-granted category participates. Applicability is evaluated against the
occurrence that *declared* the modifier.

The route test counts entry steps and treats a selection-entry-group occurrence
as a non-entry step, so it holds whether the roster flattens groups (browser
editing) or retains them (headless construction).

### The pin, and the bug it found

A Death Guard Helbrute's `self.entries.recursive.<category>.profiles.Melee
Weapons` increment reaches a Power scourge and a Helbrute hammer sitting **two
group levels** below the model, while `Close combat weapon` — the one melee
profile outside that category — receives no routed step and keeps its known
value. Same discrimination Stone observed.

Writing that pin exposed a real defect. The routed-step merge rebuilt each
characteristic report by spreading the original, and a conditional value spread
cannot remove a key — so a characteristic whose value was known *before* routing
kept that value even when a later routed step made it unknown. That is a
confident wrong answer in exactly the place this evaluator exists to prevent
one. Fixed by rebuilding the report field by field, with a synthetic regression
added because the existing synthetic suite had no case of that shape.

Worth noting for future checkpoints: the real-data pin caught something six
synthetic tests did not.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **406 passed, 6 skipped (412 total)**.
- Pinned real-data suite — **6 passed**.

### Next recommended boundary

1. **Surface routed characteristics in the workspace.** The evaluator now
   reaches weapon profiles, but the occurrence panel does not yet distinguish a
   routed step's origin. Presentation only; no new semantics.
2. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil`, which is
   what still stops real stat lines changing. Needs the sign-convention decision
   for inverted characteristics such as saves — the one question New Recruit
   could answer by experiment if it is worth another round.
3. `append`/`replace`, now that `position` semantics are known: 1-based index of
   the match to affect, negative from the end, `0` meaning all. `join` supplies
   the separator. This is closer to decidable than it was.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One instance corpus-wide.

## Completed Assignment — Routed Attribution, 2026-08-19

Commit `55e27c8`. Presentation only; no new BattleScribe semantics were decided
or guessed.

### What changed

Every characteristic step — applied, not-applicable, and unapplied alike — now
records `declaredBy`, the `RosterSelection` that owns the modifier. It is a
required field rather than an optional one, so a routed step cannot be built
without naming its declarer. For an own step it is the profile's own occurrence
and carries no information; the value is in the routed case.

Occurrence details render `Set by <name>` under a characteristic whose report
contains an `affects`-origin step, and mark the row with `data-routed="true"`
for a left rule in the stylesheet. Without it a weapon shows a Move of 9 when
its own datasheet prints 4 and the panel offers no way to find out why.

The declarer's occurrence name is used, falling back to `another selection` when
the occurrence carries none. That is the name the reader sees in the tree, so it
is the name that lets them navigate to the source.

### Tests

The synthetic evaluation test that already claimed to check attribution only
asserted `origin`; it now asserts that `declaredBy` is the ancestor that owns
the selector and is *not* the occurrence whose profile is being read, which is
the whole content of the claim.

The UI fixture's squad gained a `self.entries.profiles.Unit` set and its Special
Weapon child gained a Unit profile with a conflicting printed value, so the
browser test exercises a real routed disagreement rather than a contrived one.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **406 passed, 6 skipped (412 total)**.
- Pinned real-data suite — **6 passed**.

### Next recommended boundary

Unchanged from the previous section, minus the item this one completed:

1. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil`. This is
   what still stops real stat lines changing. It needs the sign-convention
   decision for inverted characteristics such as saves — whether `increment 1`
   on a `3+` save means `4+` (arithmetic) or `2+` (improvement). New Recruit can
   answer that by experiment; nothing in the corpus settles it, and guessing
   would produce confidently wrong stat lines.
2. `append`/`replace`, now that `position` semantics are known: 1-based index of
   the match to affect, negative from the end, `0` meaning all. `join` supplies
   the separator.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — Characteristic `append`, 2026-08-19

Commit `5eceaec`. This is the first extension of the executable operation set
since `set`, so it was taken as its own decision rather than opportunistically,
per the standing guardrail.

### Why `append` and not `increment`

`append` needs no numeric grammar. It concatenates its value onto the running
value through the separator its `join` attribute declares — text handling, not
arithmetic. That makes it decidable today, whereas `increment` still waits on
the sign convention for inverted characteristics.

### Corpus measurement

490 `append` modifiers target a characteristic type at the pinned commit.

| Outcome | Count | Reason |
|---|---|---|
| Executed | **208** | explicit non-empty `join`, no `arg`, no `position`, valued |
| Withheld | 181 | empty `join` |
| Withheld | 90 | carries `arg` |
| Withheld | 7 | no `join` declared |
| Withheld | 4 | carries `position` |

The 208 executed are 197 `Keywords`, 10 `Description`, and one `M` — weapon
abilities such as Assault, Lethal Hits, Sustained Hits 1, Precision.

### The empty-separator finding

The 181 empty-`join` appends are **not** list appends and executing them would
have been a regression. Every one writes `+0` onto a numeric characteristic. The
corpus then shows, on the same field and owner: 154 `replace`, 78
`increment position=-1 value=1`, 37 `decrement position=-1 value=1`, and smaller
counts at values 2 and 3. 156 of the 271 `+0` appends share a field with a
positioned increment or decrement inside the same file.

So `append "+0"` opens a bonus slot, a positioned `increment`/`decrement` bumps
the digit after the `+`, and a `replace` (the `arg="+0"` family) removes the slot
when it is still zero. `position` is confirmed as *1-based index of the match to
affect within a value*, which is exactly what that idiom needs. This evaluator
executes none of those three, so applying only the append would have printed
`A 2+0` where the source means `A 2` — a confident wrong answer in precisely the
place this evaluator exists to prevent one. Withheld with its own diagnostic.

### The separator is used verbatim

The most common corpus separator is a comma followed by a **non-breaking** space
(U+00A0), not an ordinary one. The real-data pin was written with `", "` first
and failed against a value that looked byte-identical in the diff. Normalising
separators would silently alter displayed text, so the declared `join` is used
exactly as written.

### Tests

Three synthetic tests (chained appends, empty separator, missing separator and
empty input) plus a real-data pin: the pinned Death Guard Helbrute carries an
unconditional grouped `self.entries.recursive.profiles.Ranged Weapons` append,
and its Twin autocannon's Keywords gain `Assault` through the routed step. That
is the first real-data case where a routed step **changes a displayed value**
rather than only proving routing happened.

One existing synthetic fixture had used `append` as a stand-in for "unsupported
operation"; it was switched to `replace` so that test keeps its meaning.

Two stale `docs/compatibility.md` bullets were corrected while there: `affects`
was still listed as parsed-but-never-executed, which owner-relative routing and
traversal execution made wrong two checkpoints ago.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **409 passed, 6 skipped (415 total)**.
- Pinned real-data suite — **6 passed**.

### Follow-up in the same checkpoint

Commit `59f688b`. Enabling `append` made the routed attribution label wrong: it
read `Set by <name>` for every routed step. The verb now tracks the operation
(`Added by` for `append`), covered by the browser test.

### Next recommended boundary

1. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil`. This is
   now the only thing standing between the evaluator and real stat lines
   changing, and it is **blocked on one decision**: on an inverted characteristic
   such as a `3+` save, does `increment 1` mean `4+` (arithmetic on the digit) or
   `2+` (an improvement)? Nothing in the corpus settles it and guessing would
   produce confidently wrong saves. One New Recruit experiment answers it.
   Doing this also requires `position` (1-based index of the match within a
   value), which is now understood, and would then unlock the `+0` bonus-slot
   idiom above.
2. `replace`, which still needs `arg` semantics. The `+0` finding is strong
   evidence that `arg` is the **search term** — 89 of the 90 `arg` values are the
   literal `"+0"` that the append idiom inserts, and removing it is exactly what
   collapsing an unused bonus slot requires. That is inference, not confirmation;
   the same New Recruit session that answers the sign convention could confirm it
   by watching a weapon with an unused slot.

3. **Category `affects` routing** — the one item above that needs no decision
   from Stone. 89 `field="category"` modifiers carry `affects` and none are
   routed today; `packages/evaluation/src/categories.ts` does not consume the
   attribute at all. The routing mechanism already exists in
   `characteristics.ts` (`collectAffectsRoutedModifiers`, `reaches`,
   `routeFromDeclarer`, `passesThroughGroupDefinition`) and the traversal
   semantics were verified in New Recruit, so this is sharing settled machinery
   rather than deciding anything new. Recommended as the next session's work if
   the New Recruit experiments below have not happened yet.

Both blocking questions are for the *same* New Recruit session, so they are
worth batching:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — Cross-Model Handoff Ritual, 2026-08-19

Baseline `f45f0ec`; resulting implementation commit `f839c21`
(`docs: make cross-model handoffs explicit and rename the work-order`).
Process only; no product behavior changed.

### What changed

`AGENTS.md` now leads with Cross-Model Handoffs so it is the first thing a
model reads. The section states that multiple models work on this repository
on purpose — better coverage, and even use of the owner's subscriptions —
that work can move to a different model at any point, and that every
checkpoint is a handoff to a stranger.

Start and end are both required: read the current status and next recommended
boundary at the end of `agent-handoff.md` before starting; leave a complete
handoff before stopping even if the user has not named who continues. The
work-order file was renamed from `codex-handoff.md` to `agent-handoff.md` so
it is not treated as Codex-specific.

### Checks run

Markdown and rename only. `git diff --check` is clean. Lint, typecheck, test,
and build were not re-run; no product source changed.

### Next recommended boundary

Unchanged from the previous section:

1. **Category `affects` routing** — the one item that needs no decision from
   Stone. 89 `field="category"` modifiers carry `affects` and none are routed
   today; `packages/evaluation/src/categories.ts` does not consume the
   attribute at all. The routing mechanism already exists in
   `characteristics.ts` (`collectAffectsRoutedModifiers`, `reaches`,
   `routeFromDeclarer`, `passesThroughGroupDefinition`) and the traversal
   semantics were verified in New Recruit, so this is sharing settled
   machinery rather than deciding anything new.

The two product questions remain blocked on a New Recruit experiment:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

## Completed Assignment — Selections-Terminus `affects`, 2026-08-19

Baseline `785f7b1`; resulting implementation commit `83dfe49`. Parsing only; no
execution was added.

### Correction to the previous handoff

The previous entry recommended category `affects` routing as work that needed
"no decision from Stone" and was "sharing settled machinery rather than
deciding anything new". **That was wrong on both counts**, and the audit that
opened this checkpoint is what showed it. See "The blocker" below. The parser
gap was real and is now closed; execution is not the mechanical follow-on it was
described as.

### What the corpus actually says

All 89 `field="category"` modifiers carrying `affects` are `add`. Every one of
their selectors terminates at an **ID**, never at `profiles.<typeName>` — which
is correct, because `category` lives on the selection and has no profile to
name. The parser was rejecting the entire shape as malformed.

Both dominant filter IDs resolve to category entries, and the mechanism is the
companion to the `+0` append idiom settled in the previous checkpoint: a weapon
in `Attacks Dx Weapon` gets `Attacks Dx+0 Modifier` added, which is the category
that marks an opened bonus slot. The two findings describe one system.

| Selector | Count |
|---|---|
| `self.entries.recursive.<categoryId>` | 73 |
| bare `<categoryId>` | 11 |
| `self.entries.<categoryId>` | 3 |
| `self.entries.forces.recursive.<categoryId>` | 1 |
| other single instances | 1 |

Corpus census after the parser change: **1,835 supported, 24 unsupported** (was
1,730 / 129). All 24 remaining are force traversals. By terminus, 1,753 target
profiles and 106 target occurrences — 89 `category`, 15 `annotation`, two
`decrement` on cost or characteristic fields. The 17 non-category ones are all
blocked by their operation or field anyway, so the selections terminus is
effectively a category-only feature today.

### The blocker for execution

`evaluateRosterSelectionCategories` is **pass one** of the single-pass rule and
must run with no effective-category index in scope. Every one of these 89
selectors filters by a category ID. Resolving that filter needs exactly the
membership pass one is computing, so the naive routing would make every reached
occurrence's membership unknown — a display regression across many weapons, in
exchange for zero categories correctly added.

There is a way through, and it needs a decision rather than a guess. Four of the
five filter categories are granted **only** by static `categoryLink` and never by
any category modifier anywhere in the composed catalogue:

| Filter category | `categoryLink` grants | modifier grants |
|---|---|---|
| Attacks Dx Weapon | 412 | **0** |
| Damage Dx Weapon | 283 | **0** |
| Heretic Astartes Vehicle | 43 | **0** |
| Psychic Weapon | 155 | **0** |
| Vehicle | 508 | 5 |

So a filter category that no modifier can target is **modifier-immune**: its
membership is fully determined by static links, and pass one can resolve it
without consulting the index at all. The proposed rule for the next checkpoint:

> A routed category step whose filter category is modifier-immune resolves in
> pass one against static link membership. A filter category that any modifier
> targets stays unresolved, exactly like the seven existing cyclic cases.

That is provable from the composed catalogue rather than inferred, and it is
deterministic. It is still a new rule and should be landed as its own
checkpoint, with the immunity set computed once per context and the four
immune filters pinned.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **409 passed, 6 skipped (415 total)**.
- Pinned real-data suite — **6 passed**, including the updated census.

### Next recommended boundary

1. **Execute category `affects` routing** using the modifier-immunity rule
   above. Bounded and unblocked, but it is a new rule and not a mechanical
   reuse — budget for the immunity precomputation, the pass-one interaction, and
   a real-data pin on one of the four immune filters.
2. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil` — still
   blocked on the sign convention.
3. `replace` — still blocked on `arg` semantics.

The two product questions remain blocked on one New Recruit experiment:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — Category `affects` Routing, 2026-08-19

> **Partly superseded.** Its "relocated anchor" withholding and the
> `EVALUATION_CATEGORY_MODIFIER_ANCHOR_RELOCATED` diagnostic were removed on
> 2026-08-20 once New Recruit answered the question they were guarding. The
> modifier-immunity rule for category filters still holds.

Baseline `9f8b125`; resulting implementation commit `33e5f2b`.

### What executes now

A category modifier carrying `affects` is targeted by its selector rather than
by its declaring occurrence, so it leaves the own pass and is collected by a
routed pass that runs last. Steps record `origin: "affects"` and `declaredBy`;
neither `affects` nor `scope` counts against a routed step.

The traversal machinery moved to `packages/evaluation/src/affects-routing.ts`
(`reaches`, `routeFromDeclarer`, `passesThroughGroupDefinition`,
`affectsModifiers`, `hasAffectsModifier`). It sits above `selection-context` and
below both `categories` and `characteristics`, so neither imports the other. The
extraction was behavior-neutral — 409 tests green before and after, with no
assertion changes.

### Two things the previous handoff did not anticipate

**1. The filter collides with the single-pass rule.** Every corpus selector of
this shape filters by a category ID, and `evaluateRosterSelectionCategories` is
pass one: it runs with no effective-category index because it is what builds
one. Resolving the filter naively would need exactly the membership being
computed.

Resolved by **modifier immunity**. `modifierTargetedCategoryIds(context)` scans
every document's raw node tree for category modifiers and collects what they
target, memoized per context. A category nothing targets anywhere in the
composed catalogue has membership fixed by static `categoryLink` declarations,
so pass one decides the filter without the index and without guessing. A filter
category some modifier can change leaves membership unknown, exactly like the
seven existing cyclic cases. The scan covers whole documents rather than
roster-reachable choices, because a modifier on an entry this roster never uses
still disproves immunity.

Pinned on real data: `Attacks Dx Weapon` and `Damage Dx Weapon` are immune,
`Vehicle` is not.

**2. Owner-relative routing is vacuous for the entire corpus population.** All
89 category `affects` modifiers are declared on `upgrade` entries that have **no
descendant entries at all**, and all 89 also carry a `scope` (67 `model`, 12
`upgrade`, 4 `force`, 3 `root-entry`, 1 `parent`, 1 `roster`). Under the settled
owner-relative rule every one of them reaches nothing — not a plausible reading
of what the authors wrote.

The competing reading is that `scope` names the anchor and the selector
navigates from there. The 2026-08-17 research explicitly **corrected** an earlier
claim to that effect, concluding from the nr-editor's modifier panel that
`affects` overrides `scope`. That conclusion held for characteristic modifiers,
whose declarers are models that really do own the profiles the selector names.
It does not obviously hold here, and the corpus is evidence against it: 89 of 89
would be dead authoring.

Rather than pick, a selector that does not reach its own occurrence while a
scope names another anchor **withholds** the determination and emits
`EVALUATION_CATEGORY_MODIFIER_ANCHOR_RELOCATED`. Scope-free owner-relative
routing executes normally. The corpus population stays exactly as honest as it
was before — it was already incomplete via `unsupportedAttributes` — while the
settled rule becomes available where it applies.

*Methodological note:* the first audit that produced this finding was wrong. It
walked the node holding the `modifiers` array, which for a grouped modifier is
the `and` condition group rather than the owning entry, and reported 74 of 89
declarers as unnamed. Re-running against the nearest enclosing selection entry
gave the real answer. Worth remembering when auditing modifier ownership.

### Tests

Six synthetic tests: unfiltered routing to direct and group-nested descendants;
`entries` without `recursive` reaching the direct child but **not** the group
child, on a flattened roster where only the definition side distinguishes them;
an immune filter admitting only members; a non-immune filter withholding; the
relocated-anchor withholding; and the declaring occurrence no longer losing its
own determination to its own descendant selector.

Real-data pins: the immunity result above, and that all 89 corpus category
`affects` modifiers carry a scope — the shape the withholding rule keys on.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **415 passed, 6 skipped (421 total)**.
- Pinned real-data suite — **6 passed**.

### Next recommended boundary

1. **Settle the anchor question**, which is now the highest-value item because
   it gates all 89 corpus category modifiers and probably informs the 1,617
   characteristic modifiers carrying both `affects` and `scope`. It is a New
   Recruit experiment: take a character with an Enhancement whose modifier reads
   `add <category> affects="self.entries.recursive.<category>" scope="model"`,
   and see whether the character's weapons gain the category. If they do, `scope`
   relocates the anchor and the owner-relative rule needs qualifying.
2. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil` — blocked on
   the sign convention.
3. `replace` — blocked on `arg` semantics.

All three open questions are New Recruit experiments and can be batched:

- **Anchor relocation.** Does a `scope` on an `affects` modifier move the
  selector's starting point? (new, and the most valuable)
- **Sign convention.** On a `3+` save, does `increment 1` mean `4+` or `2+`?
- **`arg` semantics.** Does `replace` treat `arg` as the search term? Watching a
  weapon with an unused `+0` bonus slot should show the slot collapsing.

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.

## Completed Assignment — `affects` Anchoring, 2026-08-20

Baseline `bc85b5a`; resulting implementation commit `930d078`.

**This supersedes two earlier entries.** The 2026-08-17 research checkpoint's
"Precedence, not composition" finding, and the "relocated anchor" question in the
2026-08-19 category-routing entry, are both resolved by evidence below. Do not
follow their conclusions.

### The evidence

Stone built a Death Guard Lord of Contagion with the Virulent Vectorium
detachment and gave it the Furnace of Plagues enhancement. Result: **both
Manreaper profiles modified** (A and S shown as changed, Devastating Wounds
added to Keywords, weapon names suffixed with the enhancement), and the **Lord's
own Unit profile untouched** — M, T, Sv, W, LD, OC, InSv all unchanged.

Furnace of Plagues (`fc03-ee34-9e65-b5d0`) is `type="upgrade"` with **zero**
child entries, entry links, and groups. It is the Manreaper's *sibling*: both sit
in groups beneath the model. Under the owner-relative rule nothing it declares
could reach anything. Every one of its modifiers carries `scope="model"`.

So `scope` chooses where the selector stands and `affects` chooses where it
walks. They compose. The untouched Unit profile is a second confirmation:
`self.entries.recursive` names the anchor's *descendants*, and the anchor is not
one of them.

### What changed

`resolveAffectsAnchor` in `affects-routing.ts` resolves the anchor per modifier:
the declarer for an absent scope or `self`; `parent`; `root-entry`; and the
nearest ancestor-or-self of a named type for `model`, `unit`, `model-or-unit`,
and `upgrade`. `force` and `roster` name collections rather than one occurrence,
and a typed scope with no matching ancestor has nowhere to stand — both withhold
rather than silently no-op. `routeFromDeclarer` became `routeFromAnchor`.

Both evaluators use it, so this changed characteristic routing as well as
category routing — necessarily, since the confirming evidence is about
characteristic modifiers.

Because an anchor can be a shared ancestor, **any** occurrence can declare a
selector that reaches a given one. The routed collectors now scan the whole
roster in document order rather than the ancestor chain.

The `relocatedAnchor` issue and its diagnostic were removed; they existed only to
avoid guessing at this question.

### A second question answered for free

The same modifier dump decodes the `+0` bonus-slot idiom end to end, on one
entry, in execution order:

1. `append "+0"` join="" to weapons in `Attacks Dx Weapon` — opens the slot
2. `replace` arg="+0" to weapons already in `Attacks Dx+0 Modifier` — collapses a
   slot a previous source opened
3. `increment 1` position=-1 — bumps the digit after the `+`
4. `decrement 1` position=-1 for one excluded category
5. `replace` arg="+0" — removes the slot if the bonus ended at zero
6. `add category "Attacks Dx+0 Modifier"` — marks the weapon so the *next*
   source sees an open slot

This makes **`arg` the search term for `replace`** about as close to confirmed as
the corpus can get: steps 2 and 5 only make sense as "find `+0`, replace with
nothing". It also confirms `position: -1` selects the last numeric match. Both
were listed as open questions; `replace` is now plausibly unblocked, though no
one has watched a slot collapse in the app.

### Tests

Two synthetic tests on a new bearer/enhancement fixture pair: the enhancement's
selector reaches its *sibling* weapon, and does **not** reach the anchor's own
profile. The `affects-owner` fixture lost its `scope="parent"`, which had been
added specifically to assert the now-disproven override rule.

Real-data pin reproducing the screenshots: routed steps reaching the Manreaper
are all attributed to the Furnace of Plagues occurrence, and the Lord's own Unit
profile has none. The Manreaper's Keywords stay unresolved because that append
carries `position` — the anchoring is what the test pins, not the value.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **417 passed, 7 skipped (424 total)**.
- Pinned real-data suite — **7 passed**.

### Useful for future sessions

New Recruit publishes every catalogue entry as a browsable web page, keyed by the
same entry id the corpus JSON carries:
<https://www.newrecruit.eu/wiki/wh40k-11e/warhammer-40%2C000-11th-edition/chaos---death-guard/fc03-ee34-9e65-b5d0/furnace-of-plagues>

It shows an entry's own rendered text. Effects that only appear once an entry is
attached to a bearer still need a built roster to observe.

### Next recommended boundary

1. **`position` support**, which is now the single highest-value item. It gates
   the `increment`/`decrement` steps of the idiom above and the Keywords append
   that Stone can see working in New Recruit but this evaluator still withholds.
   Semantics are known: 1-based index of the match within a value, negative from
   the end, `0` meaning all.
2. **`replace`**, using `arg` as the search term. Strongly evidenced above.
   Together with `position` this would light up the whole `+0` idiom.
3. **Lexical arithmetic** for `increment`/`decrement`/`floor`/`ceil` — still
   blocked on the one remaining experiment.

Only one open question is left for New Recruit:

- **Sign convention.** On an inverted characteristic such as a `3+` save, does
  `increment 1` mean `4+` (arithmetic on the digit) or `2+` (an improvement)?

Open and not worth chasing: what an embedded ID means when it names a selection
entry rather than a category. One corpus instance.
## Completed Assignment — Lexical Arithmetic, 2026-08-20

Baseline `8f1913d`; resulting implementation commit `03376af`.

**This resolves the sign-convention question that three earlier entries recorded
as blocking.** It was answered from the corpus, not by experiment.

### The sign convention

`increment` and `decrement` are **plain signed arithmetic on a number inside the
value**, with no game-aware inversion. `4+` decremented is `3+`; `-1`
decremented is `-2`; `D6+0` incremented at the last match is `D6+1`.

The question was whether `increment 1` on a `3+` save means `4+` (arithmetic) or
`2+` (improvement). Three independent lines of corpus evidence say arithmetic:

| Evidence | Count | Reading |
|---|---|---|
| `decrement` on inverted characteristics (`Sv`/`WS`/`BS`/`LD`) | 60 of 64 | owners are upgrades — *Kabalite Trueborn*, *Spotter*, *Force weapon*. Plain arithmetic makes these improvements. |
| `increment` on the same | 4 | includes *Gene Affliction* raising BS and WS. Plain arithmetic makes an affliction a penalty; the inverted reading would make it a bonus. |
| `decrement` on `AP` (written negative) | 44 of 70 | owners are *Neverblade*, *Razor Claws*, *Cursed Fang*. Signed arithmetic takes `-1` to `-2`, the improvement those names imply. |

The two families point the same way and the `increment` cases point the same way
in reverse, which is what makes this more than a majority argument.

The structural argument agrees independently: `affects` is a New Recruit
extension and New Recruit is generic over arbitrary game systems. Characteristic
types are catalogue-defined data, so nothing tells it that `Sv` is roll-under.
It has no basis for a game-aware inversion, and authors pick whichever operation
produces the right digit.

**Confirmed by experiment, 2026-08-20.** Stone gave a Genestealer Cults
Patriarch the *Gene Affliction* battle scar in New Recruit:

| Stat | Before | After | Data operation |
|---|---|---|---|
| T | 5 | **4** | `decrement T by 1` |
| WS | 2+ | **3+** | `increment WS by 1` |

Both changed for the worse, as a battle scar should, and the data reaches that
with *opposite* verbs. That is only possible if the operation acts on the digit.
The prediction written before the test was exactly this, so the rule is now
observed rather than inferred.

(BS was not observable — a Patriarch carries only melee claws, so no BS is
displayed. WS is the same inverted family and settles it.)

### `position`

New Recruit's editor documents it as the 1-based index of the match to affect,
negative from the end, `0` meaning all. The pinned corpus writes only `-1` (148
arithmetic modifiers) and `1` (3 replaces), plus 5 malformed `""`.

When `position` is **absent** the default is not established. Rather than guess,
a value with more than one number is refused (`ambiguousPosition`); a value with
exactly one number needs no default, because every reading picks the same match.
That covers most real stat lines — `8`, `4+`, `-1`, `24"` — so the refusal is
narrow. Values with no number at all (`-`, `N/A`, `Melee`) are refused with
`noNumericMatch`, malformed positions with `unsupportedPosition`, and non-integer
operands with `nonIntegerOperand`.

A numeric match is `-?\d+`, so the sign travels with the digits. That is what
makes `AP -1` behave and what keeps `D6+2` a two-match value.

### Corpus reach

614 characteristic modifiers are `increment`/`decrement`. 161 characteristic
modifiers carry `position`: 101 `increment -1`, 47 `decrement -1`, 4 `append -1`,
4 `increment ""`, 1 `set ""`, 4 `replace`.

### Tests

Two synthetic tests on new fixture profiles: positioned arithmetic on `D6+0` and
an inverted `4+` save; and the three refusals. Existing fixtures that used
`increment` as a stand-in for "unsupported operation" were switched to `floor`,
which is still unsupported, so those tests keep their meaning rather than being
rewritten around the new behavior.

Two real-data pins now show stat lines changing:

- The Death Guard Helbrute's **Power scourge** goes Attacks `8` → `10`, while
  the *Close combat weapon* outside the filter category keeps its printed `5`.
  Same operation, different answer — which is what makes the category filter
  observable.
- The Lord of Contagion's **Manreaper** gains the +1 Strength visible in Stone's
  New Recruit screenshot. Its Attacks stays unresolved, because the bonus-slot
  idiom's `replace` steps are still unsupported and a partly-applied value is
  still refused.

`docs/diagnostics.md` was missing the three `APPEND_` codes from the earlier
append checkpoint; they are added here alongside the four `ARITHMETIC_` ones.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **419 passed, 7 skipped (426 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **`replace` using `arg` as the search term.** This is the last piece of the
   `+0` bonus-slot idiom. With it, the Attacks values still withheld on real
   weapons resolve, and the mechanism the last three checkpoints kept circling
   finally closes. Evidence for `arg` is in the 2026-08-20 anchoring entry.
2. **`position` on `append`** — 4 corpus instances. New Recruit visibly applied
   one with `position` present and no positional effect, and the editor does not
   offer `position` for `append`, so it looks inert there. Small and evidenced.
3. **`floor`/`ceil`** — need a bound rule, a different shape from the arithmetic
   landed here.

## Completed Assignment — Characteristic `replace`, 2026-08-20

Baseline `f01a1d8`; resulting implementation commit `f7f288f`.

### `arg` is the search term

Confirmed as far as the corpus can: **`arg` is present on all 189** characteristic
`replace` modifiers, never absent. `value` is absent on 164 of them, so deleting
a match is the dominant use.

| Shape | Count |
|---|---|
| `arg="+0"`, no value | 154 |
| `arg="+0"`, `value=true` | 20 |
| keyword removals (`", Assault"`, `"Devastating Wounds"`, …) | 11 |
| `Rapid Fire N` upgrades, with `position` | 4 |

Authors include the separator in the search term (`", Assault"`) so removing a
keyword leaves no dangling comma — which only makes sense if `arg` is matched
literally.

### The decisions

**A search term that matches nothing is an applied no-op, not a refusal.**
Collapsing a bonus slot on a weapon that never had one is the idiom's normal
path. Refusing there would leave every unmodified weapon's Attacks unresolved,
which is the opposite of the point. This mirrors `add` of a category a selection
already has — an applied step recording no change.

**Refused:** absent or empty `arg`; a `value` of `true`/`false` (20 instances
carry a Boolean where replacement text belongs — substituting the literal would
print `D6true`); and a stray `join`, which has no meaning for a search and
replace. That last one withholds 93 of 189, and is the most likely thing a
future session will want to relax; it is in the roadmap as its own item.

### Two bugs the pin caught

`set` had been hiding both, because it is the only operation that *discards* its
input. Once four operations began *reading* theirs, they surfaced immediately —
and only against real data.

1. **Routed steps did not chain with each other.** Each was handed
   `currentValue(report.steps, …)` — the owner's *own* steps only — so a
   positioned `increment` followed by a routed `replace` saw the pre-increment
   value. Real symptom: a Manreaper's Attacks incremented to 6, then silently
   fell back to 5.
2. **`effectiveValue` assumed an unapplied step before the last applied step
   could not matter.** Its comment said so in as many words: "Every supported
   operation replaces its input rather than reading it." That stopped being true
   three checkpoints ago. A later step can apply cleanly and still be built on an
   input this evaluator could not compute. The value is now unknown whenever an
   unapplied step precedes the end, *unless* an applied `set` sits after it and
   rebuilds from scratch.

Both have synthetic regressions now; without the fixes they read `6+` and `7"`.

**Worth carrying forward:** the second bug is the kind that grows quietly. Every
time an operation is added, check whether it reads its input, and whether any
rule elsewhere assumes it does not.

### Real data

The Lord of Contagion's Manreaper now resolves Attacks **end to end through the
whole bonus-slot idiom**: the `+0` append is filtered away from a weapon whose
Attacks is not a dice expression, both `replace` steps pass through finding
nothing, and the positioned `increment` adds one. That matches what Stone
observed in New Recruit.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **423 passed, 7 skipped (430 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **`append` with an empty `join`, plus `arg` inert on `append`.** Now safe:
   the empty separator was withheld because nothing collapsed an unused slot,
   and `replace` now does. 89 corpus appends also carry a meaningless `arg`.
   Together these close the idiom for weapons whose Attacks *is* a dice
   expression (`D6` → `D6+1`), which is the remaining half of the mechanism.
2. **`position` on `append`** and **`join` on `replace`** — both look inert,
   both unverified. Small, and they unblock 4 and 93 modifiers respectively.
3. **`floor`/`ceil`** — need a bound rule, a different shape from the arithmetic
   already landed.

No open questions require the owner.

## Completed Assignment — Inert Attributes, 2026-08-20

Baseline `06a25fd`; resulting implementation commit `785a961`.

### The rule

New Recruit's editor offers `join` only for `append`, `arg` only for `replace`,
and `position` for `replace` and the arithmetic pair. Where one of those three
appears on an operation outside that set, it is **inert authoring noise** and no
longer withholds the step.

Evidence, per attribute:

| Attribute | Where it is noise | Why we can say so |
|---|---|---|
| `arg` on `append` | 90 instances | **All 90 are identical to that append's own value.** No operation could act on that. |
| `position` on `append` | 4 instances | New Recruit was observed applying a Keywords append carrying `position="-1"` with no positional effect — Stone's Furnace of Plagues screenshot. |
| `join` on `replace` | 93 instances | No separator semantics exist for a search and replace. 82 of the 93 are the empty string. |

Anything **outside** those three still withholds. Only these are known to belong
to specific operations, so only these can be known noise elsewhere. An unknown
extension attribute is still unsupported behavior.

This reverses the narrower rule recorded in the append checkpoint, which held
that `join` "stays unsupported on every other operation, where it has no
established meaning". The evidence above is what changed.

### Real data

The Lord of Contagion's Manreaper now shows **both** changes Stone observed in
New Recruit: the +1 Strength, and the Devastating Wounds keyword. The keyword
was the last thing the append gate withheld.

### The empty-`join` append is not the freebie the last entry predicted

The previous entry said this would unblock "now that `replace` lands", because a
later replace collapses an unused `+0` slot. Measuring it properly says
otherwise, and the next session should not take that claim at face value.

Of 268 empty-`join` appends measured at entry scope, only **87** are followed by
a collapsing `replace` of the same term in the same entry. The other 181 are on
**weapons** — Prism Cannon, Missile Launcher, Eyeburst — and are conditional on a
Crusade weapon upgrade being selected (`Heirloom (A+1)` 103 times,
`Master-worked (D+1)` 64, `Brutal (S+1)` 2).

So the mechanism spans two entities: the *weapon* opens the slot when its upgrade
is present, and an *enhancement* elsewhere bumps or collapses it. Whether the
collapse always accompanies the opening cannot be settled from the modifier lists
alone, and executing the append without it prints `D6+0` where the source means
`D6` — the exact failure the original withholding existed to prevent.

Three ways forward, for whoever takes it:

1. **Observe it.** In New Recruit, give a weapon with a dice-expression Attacks
   its `Heirloom (A+1)` upgrade and see whether the displayed Attacks reads
   `D6+1`, `D6`, or `D6+0`. That settles it in one screenshot.
2. **Look ahead at evaluation time.** The full step list for a characteristic is
   known before any step runs, so the append could execute only when a later step
   consumes the appended text. Correct, but more machinery than the case may
   deserve.
3. **Leave it withheld.** Costs the dice-expression weapons their resolved
   Attacks, which is a narrower population than it first appears.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **424 passed, 7 skipped (431 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **`append` with an empty `join`**, via option 1 above — one New Recruit
   observation settles a 270-modifier population. This is the only item where a
   cheap experiment beats more analysis.
2. **`floor`/`ceil`** — need a bound rule, a different shape from the arithmetic
   already landed.
3. **`annotation` modifiers** — 15 instances, and the rendering is already
   observed twice: the value is appended to the displayed name in parentheses.
4. **`name` modifiers** — 7,673 instances but 86% Crusade; still last.

## Completed Assignment — Bonus Slot Closed, 2026-08-20

Baseline `0f89f5d`; resulting implementation commit `a3ab09f`.

### What changed

An empty `join` is a real separator that concatenates directly, not a missing
one. With `increment`, `decrement`, `replace`, and `position` all executing, the
`+0` bonus-slot idiom now runs end to end.

### The observation that settled it

Stone built an Aeldari Fire Prism with the *Heirloom (A+1)* Crusade upgrade.
Both branches of the idiom are visible on one model:

| Weapon profile | Base Attacks | Displayed | Why |
|---|---|---|---|
| Prism Cannon — dispersed pulse | `2D6` | **`2D6+1`** | a dice expression, so it is in `Attacks Dx Weapon`; the slot opens and the positioned increment bumps it |
| Prism Cannon — focused lances | `2` | **`3`** | not a dice expression, so no slot; the increment hits the number directly |
| Shuriken Cannon | `3` | `3` | no Heirloom, untouched |

The synthetic regression mirrors that model exactly, both branches in one
profile.

### A prediction that was wrong, and why

The `replace` entry predicted this would be a free consequence of `replace`
landing, because a trailing replace collapses an unused slot. **Measuring said
otherwise**, and the correction is worth carrying forward:

Only **87 of 268** empty-separator appends are followed by a collapsing
`replace` in the *same entry*. The other 181 sit on **weapons** — Prism Cannon,
Missile Launcher, Eyeburst — conditional on a Crusade upgrade
(`Heirloom (A+1)` 103, `Master-worked (D+1)` 64, `Brutal (S+1)` 2). Their
increment lives on the upgrade entry and reaches them through `affects` routing.

So the mechanism spans two entities, which is why static analysis of modifier
lists could not settle it and one screenshot could. **When a mechanism's pieces
sit on different entries, stop analysing and ask for an observation.**

### What still withholds

- An **absent** `join`. Nothing establishes a default separator, and unlike an
  empty one it is not written deliberately. 7 corpus instances.
- Appending onto an **empty value through a non-empty separator** — whether the
  separator is emitted with nothing to its left is unestablished. An empty
  separator raises no such question.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **425 passed, 7 skipped (432 total)**.
- Pinned real-data suite — **7 passed**.

### State of the characteristic surface

Executing: `set`, `append`, `increment`, `decrement`, `replace`, with `position`
placement, `affects` routing anchored at `scope`, and category filtering.
Remaining: `floor`/`ceil`, `multiply`/`divide`/`modulo`, `annotation`, and
`name`.

### Next recommended boundary

1. **`floor`/`ceil`** — a bound rule, different in shape from the arithmetic
   already landed. Measure first: this may be smaller than its place in the list
   suggests, and `multiply`/`divide`/`modulo` may be worth folding in.
2. **`annotation` modifiers** — 15 instances, rendering already observed twice:
   the value is appended to the displayed name in parentheses.
3. **`name` modifiers** — 7,673 instances but 86% Crusade; still last.

No open questions require the owner.

## Completed Assignment — Bounds, 2026-08-20

Baseline `234f64a`; resulting implementation commit `55f1c7a`.

### What changed

`floor` raises the selected numeric match to at least its operand; `ceil` lowers
it to at most. Both are **bounds, not rounding**.

### The evidence

A T'au Ethereal settles the shape: Move `6"`, `increment 4`, then `ceil 9`, and
New Recruit displays `9"`. That rules out rounding.

It also has to be a bound rather than a *set*: 23 of the 25 corpus `floor`s pair
with a `decrement` on an inverted characteristic (WS, BS, Sv) at value 2. If
`floor` set the value, every one of those units would display the best possible
save or skill. As a bound, `floor 2` on a save improved to `3+` correctly leaves
it at `3+`.

### Corpus reach

| Operation | Count | Shape |
|---|---|---|
| `floor` | 25 | 23 on WS/BS/Sv at 2; one each bounding OC and M at 0 |
| `ceil` | 8 | all on M at 9 |

**Every operation the pinned corpus uses on a characteristic now executes:**
`set` (415), `append` (490), `increment` (451), `decrement` (163), `replace`
(189), `floor` (25), `ceil` (8).

`multiply`, `divide`, and `modulo` are defined by the format but appear **zero**
times. They stay unsupported deliberately: writing a rule for behavior that
cannot be checked against data is exactly what this project avoids. If a future
corpus adds them, measure first.

### A note on fixtures

Several fixtures had been using `floor` as a stand-in for "an unsupported
operation", and needed swapping to `multiply` so their tests kept their meaning.
That has now happened three times — `increment`, then `replace`, then `floor`.
**Whoever implements the next operation should expect the same**, and should
prefer `multiply` as the stand-in, since it has no corpus instances and so is
the least likely to become supported.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **426 passed, 7 skipped (433 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

The characteristic *operation* surface is complete. What remains on the display
side is other target fields, not other arithmetic:

1. **`annotation` modifiers** — 15 instances. Rendering already observed twice in
   New Recruit: the value is appended to the displayed name in parentheses,
   `Patriarch (Gene Affliction)` and `Manreaper - sweep (Furnace of Plagues)`. It
   annotates the *name*, and reaches weapon profiles through the same `affects`
   routing already built. This is the last small, well-evidenced item.
2. **`name` modifiers** — 7,673 instances but 86% Crusade. Large, and the
   annotation work above will establish how a display name is composed, so it is
   better attempted after.
3. **`affects` force traversal** — 24 selectors; needs a force-collection anchor
   rule, which is a genuinely new decision.

No open questions require the owner.

## Completed Assignment — Annotation, 2026-08-20

> **Partly superseded by Selection Annotation below.** The 590 count here was
> the total for both target kinds, not profile annotation alone. The correct
> split is 522 profile targets and 68 selection targets. `Patriarch (Gene
> Affliction)` is also a profile-target example despite appearing beside a
> selection name in New Recruit. The empty-base and append conclusions remain
> valid.

Baseline `9db002b`; resulting implementation commits `829a63f` (empty-value
append) and `367bbd0` (annotation evaluation).

### Two findings from one measurement

Auditing `annotation` produced a fact that settled an unrelated open question:
**no node in the pinned corpus declares an `annotation` attribute of its own.**
Zero, out of every node in 46 documents.

That means all 590 annotation modifiers append onto an **empty** value through a
`", "` separator. Stone's screenshot shows the result as
`Manreaper - sweep (Furnace of Plagues)` — not `(, Furnace of Plagues)`. So
appending onto an empty value emits no separator, which is the question the
append checkpoint had left open as `emptyAppendInput`. That issue and its
diagnostic are now gone, and an absent `join` is the only append shape that
cannot be executed.

**Worth carrying forward:** the answer came from measuring a *different* field.
When a question stalls, look for another part of the data that has to obey the
same rule.

### Annotation itself

`evaluateRosterProfileAnnotation` reports one profile's effective annotation. It
decorates the profile's *name* rather than being one of its characteristics, so
it gets its own report. Two consequences:

- It reuses the existing step machinery and `affects` routing unchanged — 590
  modifiers, almost all `append`, almost all routed from an enhancement.
- It is no longer classed as unrouted display behavior, so it stops costing the
  characteristic report its completeness. That was a real drag: any profile an
  enhancement annotated had unresolved characteristics for no good reason.

Corpus shape: 590 modifiers, ~560 `append` (mostly `join=", "`), 24 `set`, 1
`replace`. Scopes span `model`, `model-or-unit`, `root-entry`, `upgrade`, and
`roster`, all handled by the anchor rule already in place.

Real data: the Lord of Contagion's Manreaper resolves to `Furnace of Plagues`.

### What this deliberately does not do

- **Selection-level annotation.** `Patriarch (Gene Affliction)` in Stone's other
  screenshot decorates a *unit's* name. Same field, different target, and the
  selection surface has no equivalent evaluator yet.
- **Rendering.** Nothing displays the annotation. The rule is known from two
  observations — parentheses after the name — but the workspace does not use it.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **428 passed, 7 skipped (435 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **Selection-level `annotation`** — the other half of the same field, and the
   smaller of the two remaining display gaps.
2. **Render annotation in the workspace** — parentheses after the name, for both
   profiles and selections. Best done after (1) so one presentation pass covers
   both, matching how characteristics were done.
3. **`name` modifiers** — 7,673 instances but 86% Crusade. Doing (1) and (2)
   first will establish how a display name is composed, which is most of the
   design work this needs.
4. **`affects` force traversal** — 24 selectors; a genuinely new anchor decision.

No open questions require the owner.

## Completed Assignment — Annotation Rendering, 2026-08-20

Baseline `6e75e54`; resulting implementation commit `0b136c8`.

### What changed

A profile's display annotation now renders in parentheses after its name —
`Special Weapon profile (Veteran Issue)` — matching New Recruit. An unresolved
annotation is omitted rather than shown partially; the profile's incomplete note
already reports it.

Annotation completeness folds into the profile's completeness in the browser
inspection, alongside characteristics and visibility.

### A completeness improvement worth naming

Before the annotation work, an `annotation` modifier was classed as *unrouted
display behavior* and made the whole **characteristic** report incomplete. So a
weapon an enhancement merely annotated showed unresolved stats, for no reason
connected to its stats.

Now:

| Case | Before | After |
|---|---|---|
| Annotation resolves cleanly | characteristics incomplete | **complete** |
| Annotation cannot be applied | characteristics incomplete | incomplete, attributed to the *annotation* |

Same honesty, better attribution, and a real gain for the common case.

### Sequencing note

The previous entry recommended doing selection-level annotation *before* any
rendering, so one presentation pass covered both. That was wrong: profile
annotation and selection annotation render at **different sites** — a profile
header versus an occurrence name — so there was no shared pass to save. Doing
the visible half first was the better order.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **428 passed, 7 skipped (435 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **Selection-level `annotation`** — 68 corpus modifiers (53 declared on a
   selection with no `affects`, 15 routed to selections). It needs the
   **selections-terminus** routing collector that `categories.ts` has, not the
   profile-matching one `characteristics.ts` uses, so expect either a third
   collector or a shared extraction. Rendering is then a small follow-on at the
   occurrence-name site.
2. **`name` modifiers** — 7,673 instances but 86% Crusade. Selection annotation
   will establish how an occurrence's display name is composed, which is most of
   the design this needs.
3. **`affects` force traversal** — 24 selectors; a genuinely new anchor decision
   for collection scopes.

No open questions require the owner.

## Completed Assignment — Selection Annotation, 2026-08-20

Baseline `9283c64`; resulting implementation commit `f508c26`
(`feat: render selection annotations`). Not pushed, no pull request.

### What changed

`evaluateRosterSelectionAnnotation` now reports the display decoration for one
exact roster occurrence without changing its projected or roster source name.
Direct modifiers run first, followed by recursively grouped modifiers in source
order and then selections-terminus `affects` modifiers in roster document
order. Profile-terminus annotation on the same declarer is deliberately ignored:
the field name is shared, but the selector target names a different object.

The traversal and anchoring half moved into
`collectAffectsRoutedSelectionModifiers` in `affects-routing.ts`. Category
evaluation reuses it while retaining its modifier-immunity filter rule; selection
annotation applies optional filters through the effective-category index.

The browser adapter resolves the exact occurrence and materialized choice. The
workspace renders a known non-empty value as `Name (Annotation)`, with base
names preserved for commands and accessible labels. Unknown output is omitted
rather than rendered partially, and the occurrence gets an explicit unresolved
annotation note.

### Corpus correction and pin

The earlier 590 count accidentally combined two target kinds. At pinned
`BSData/wh40k-11e` commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`:

- 522 modifiers target profiles: 35 direct, 487 routed; 521 `append` and one
  `replace`; 17 appends omit `join`.
- 68 target selections: 53 direct, 15 routed; 61 grouped, seven ungrouped; 39
  `set` and 29 `append`; 52 have conditions, 16 condition groups, zero repeats,
  zero scopes, and zero filter IDs; seven appends omit `join`.

The optional integration test pins that exact 68-modifier shape across all 46
documents. The seven missing-`join` appends remain preserved, diagnosed, and
incomplete under the already-established append rule. No default separator was
invented.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` pass.
- `pnpm test`: **432 passed, 7 skipped (439 total)**.
- Focused evaluator/session/UI tests: **63 passed**.
- Pinned real-data suite: **7 passed**.

### Remaining behavior and next boundary

This checkpoint adds no catalogue resolution, cost or constraint calculation,
validation command guard, persistence behavior, or new roster semantics.
`multiply`/`divide`/`modulo` remain deliberately unsupported with zero corpus
instances. The 24 `affects` force traversals and 7,673 `name` modifiers remain
open.

Take **`affects` force traversal** next as a corpus-first research checkpoint.
Determine what force collection each scope anchors and which occurrences the 24
selectors reach before writing execution. Keep `name` modifiers last because
86% are Crusade content.

No owner input is currently required.
## Completed Assignment — Force Traversal, 2026-08-21

Baseline `27e9ffd`; resulting implementation commit `202aeae`.

### First, Codex's checkpoint reviewed

`f508c26` (selection annotation) was verified before this work started: all
gates pass, the shared `collectAffectsRoutedSelectionModifiers` extraction is
sound, and `categories.ts` still applies its modifier-immunity filter rule
through it. Its corpus correction stands and is worth repeating: the earlier
**590** annotation count combined both target kinds. The real split is **522
profile targets and 68 selection targets**, and `Patriarch (Gene Affliction)`
was a *profile*-target example — that screenshot row was the Unit profile, not
the occurrence name.

### What changed

A `forces` segment leaves the anchor's subtree and names the roster's forces, so
neither the anchor nor the path to a given occurrence decides anything. The
target set is every occurrence the forces contain, still filtered by the
selector's category and profile type.

### Why this was decidable without an experiment

The measurement made it uniform. All 24 instances share one shape:

```
self.entries.forces.recursive.[<categoryId>.]profiles.<typeName>
```

Their owners are all `upgrade` entries sitting under a **Detachment** —
*Lords of the Warp*, *Devotees of Destruction*, *Cohort Cybernetica*,
*Sanctified Orators*, *Might of the Moritoi*. Detachment abilities are army-wide
by construction, and the declaring upgrade shares **no ancestor** with the units
it reaches, so anchor-relative routing could never have connected them. There is
only one reading that makes 24 of 24 do anything.

Target fields: 4 `annotation`, 3 `decrement LD`, 3 `increment OC`, 3
`increment M`, 2 `append Keywords`, 2 `set InSv`, 2 `increment W`, 2
`increment S`, 1 `add category`, 1 `decrement M`, 1 `increment Range`. Filters
name categories such as `Vehicle`, `Squadron`, `Transport`, `Plasma`,
`Non-Monster Character`.

### The one ambiguity, and its guard

Does `forces` mean *every* force in the roster, or the force *containing the
declarer*? Scopes vary across `roster`, `force`, `parent`, `model-or-unit`, and
`root-entry`, so the scope does not settle it.

It does not have to. With exactly one force and no nested forces the two
readings name the same set — and `apps/web/src/roster-session.ts` **enforces**
that shape, rejecting any saved roster with more than one root force or any
nested force. A headless roster may hold more, and there `forceTraversalReach`
refuses rather than picking a reading.

### The grammar is now closed

The pinned census moves from 1,835 supported / 24 unsupported to **1,859 / 0**.
Every `affects` selector in the corpus parses and executes. Characteristic-
targeting selectors go from 1,246 supported to all 1,265. The
`forceTraversal` issue was removed from `AffectsSelectorIssue` as unreachable.

### A gap found while testing, deliberately not fixed here

Writing the multi-force guard exposed an inconsistency older than this
checkpoint:

| Situation | Report | Characteristic value |
|---|---|---|
| A *step* is unapplied | incomplete | **cleared** |
| Routing is *unresolvable* | incomplete | **keeps its printed value** |

An unresolvable modifier could have targeted any characteristic on the profile,
so keeping every printed value is a more confident answer than the evidence
supports. The report-level `incomplete` does warn, and the browser surfaces it,
so this is not silent — but the two paths should agree.

Fixing it is a broader change than force traversal and would touch every
`partial` path (unreadable ancestors, unsupported selectors, unresolved
anchors), so it is recorded as its own boundary rather than folded in. The new
test asserts today's behavior explicitly so the change is visible when someone
makes it.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **434 passed, 7 skipped (441 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **Withheld routing versus withheld steps** — reconcile the table above. Start
   by measuring how many pinned-corpus profiles actually hit a `partial` routing
   path; if it is rare, the honest behavior costs little.
2. **`name` modifiers** — 7,673 instances but 86% Crusade. Both annotation
   surfaces are done, so how a display name is composed is now established.
3. **Beyond display fidelity** — roadmap sections B through E are largely
   untouched. Legality and validation (section B) is the largest gap that
   affects matched-play use.

No open questions require the owner.

## Completed Assignment — Collection Anchoring, 2026-08-21

Baseline `7a9fd77`; resulting implementation commit `4124659`.

### Started as a different checkpoint

The plan was to fix the honesty gap recorded last time: unresolvable *routing*
leaves a characteristic's printed value in place, while an unapplied *step*
clears it. The first move was to measure how often that path is reached.

The measurement redirected the work. Of 1,859 `affects` modifiers, only **seven**
still hit an unresolvable anchor — all `scope="force"` with no `forces` segment.
And reading them showed they should not be unresolvable at all: they are
detachment abilities of exactly the same class as the 24 the previous checkpoint
handled.

| Owner | Modifier | Selector |
|---|---|---|
| Cult of the Arkifane | `add category` ×4 | `self.entries.recursive.<Lord Discordant>` etc. |
| Cult of the Arkifane | `set InSv 5+` | `self.entries.<Heretic Astartes Vehicle>.profiles.Unit` |
| Lords of Dread | `increment OC 2` | `self.entries.<Knight Character>.profiles.Unit` |
| Solar Spearhead | `increment M 2` | `self.entries.<AC Walker>.profiles.Unit` |

So a collection scope and a `forces` segment mean the same thing: **anchor at
the roster's force collection**. Resolving them was better than making them
honestly unknown.

### It also corrected the previous checkpoint

Force traversal shipped with a shortcut: an `entersForces` selector reached
*every* occurrence, skipping the route entirely. That is right for all 24 —
they all carry `recursive` — but wrong for these seven, four of which use
`self.entries.<categoryId>` with **no** `recursive`. From a force, `entries`
means the force's own selections, not everything beneath them.

`routeFromForce` now measures properly: a root selection is one entry step from
the force, its children two. The new test pins both depths against one rule of
each kind, so collapsing a force anchor back to "everything" fails visibly.

**Worth carrying forward:** a shortcut that happens to be right for every case in
front of you is still a shortcut. This one survived exactly one checkpoint.

### The honesty gap, deferred on evidence

With the seven resolved, no corpus modifier reaches the unresolvable-routing
path at all. The remaining sources are an unreadable occurrence, a profile type
that does not resolve uniquely, `scope="ancestor"` (zero corpus instances), and a
category filter whose membership is unknown. The gap is real but currently
unreachable from real data, so it moves from **Next** to **Open** rather than
being fixed speculatively. Reconcile it when something makes it common.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **435 passed, 7 skipped (442 total)**.
- Pinned real-data suite — **7 passed**.

### Next recommended boundary

1. **`name` modifiers** — 7,673 instances, 86% Crusade. The last large piece of
   display fidelity. Both annotation surfaces are done, so how a display name is
   composed is established; measure the non-Crusade 14% first, since that is
   what matched play actually sees.
2. **Beyond display fidelity** — roadmap sections B through E are largely
   untouched. **Legality and validation** (section B) is the largest gap that
   affects matched-play use, and nothing in it has been measured yet.
3. **Withheld routing vs withheld steps** — see above; unreachable from the
   corpus today.

No open questions require the owner.

## Completed Assignment — Display Names, 2026-08-21

Baseline `3a09575`; resulting implementation commits `689c305` (append
separator default) and `40e701f` (selection names).

### The measurement corrected two earlier claims

**"86% Crusade" was wrong**, or rather right for the wrong reason. Classifying by
catalogue path put only 133 of 7,673 in Crusade sections. Classifying by *value*
tells the real story: 1,319–1,320 instances each of `(Battle-ready)`,
`(Blooded)`, `(Battle-hardened)`, `(Heroic)`, and `(Legendary)` — Crusade rank
suffixes attached directly to unit entries, not filed under a Crusade group.

**"An absent `join` cannot be executed" was also wrong.** 7,503 name appends
declare no `join`, and **none** carries leading whitespace in its value. Stone's
Fire Prism screenshot renders `Fire Prism (Battle-hardened)` — with a space. A
no-separator default would render all 7,503 broken, which shipping community
data would not be. So an absent `join` defaults to a single space, and every
append shape now executes.

The 41 appends that do declare `join=" "` are redundant rather than
load-bearing, matching the copy-paste pattern already seen with `arg` and
`position`.

### The failure mode worth knowing about

Four of the Fire Prism's five rank appends have no conditions *on the modifier*
and sit in an unconditional group. Read naively, every unit would display
`Name (Battle-ready) (Blooded) (Battle-hardened) (Heroic)`.

They are gated by **`conditionGroups` on the modifier itself** — experience-point
bands: `atMost 5`, `>5 atMost 15`, `>15 atMost 30`, `>30 atMost 50`, `>50`.
`evaluateRosterModifierApplicability` already evaluates those, so an unsupported
condition form withholds the name rather than stacking ranks.

The pinned suite now holds that line: a Lord of Contagion in a non-Crusade roster
keeps its plain name. **If a future change makes modifier condition groups
unresolvable, that test is what catches it.**

### The implementation shares rather than copies

Codex's `evaluateRosterSelectionAnnotation` was ~130 lines of passes over own,
grouped, and routed modifiers. `name` needs exactly that with a different field
and a non-empty base, so the function was generalised into
`evaluateSelectionTextField` and both are now thin wrappers. Behavior-neutral:
the annotation tests pass unchanged.

### One product decision

A `name` modifier's base is supplied by the caller, not read from the choice,
because an occurrence may carry a user rename. The browser passes the name
currently displayed, so a rename and a catalogue modifier **compose** — rename a
unit and its rank still follows it — rather than one silently winning. Commands
and accessible labels keep the un-refined name.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **437 passed, 7 skipped (444 total)**.
- Pinned real-data suite — **7 passed**.

### Display fidelity is now essentially complete

Executing: every characteristic operation, `affects` routing with occurrence and
force anchoring, category membership, profile visibility, profile and selection
annotation, and selection names. What remains of section A is five profile-owned
`name` modifiers and two deliberate refusals (a non-immune category filter, and
routing versus steps).

### Next recommended boundary

**Legality and validation — roadmap section B.** It is entirely unmeasured and is
the largest gap that affects matched-play use: aggregate constraint enforcement,
cost limits, and broader condition semantics are all still deferred. Start with a
corpus-first research checkpoint the way display fidelity was started, because
nothing here has numbers attached yet.

Smaller items if a bounded piece is wanted first: profile `name` modifiers (five
instances), or the routing-versus-steps reconciliation (currently unreachable
from corpus data).

No open questions require the owner.

## Research Checkpoint — Legality Measured, 2026-08-21

Baseline `73ea13a`; resulting commit `f37a354`. One pinned test added; no
evaluator behavior changed.

### The roadmap was wrong about the size of this

Section B was recorded as "the largest gap affecting matched-play use", entirely
unmeasured. Measuring first — before building anything on that assumption —
says otherwise.

**Constraint coverage.** The corpus holds 26,259 constraints. Against the shapes
the evaluator accepts, **25,932 (98.8%) already fit**:

| Shape | Count |
|---|---|
| Supported | 25,932 |
| ID-valued (category) scope | 116 |
| Carries `automatic` | 109 |
| `unit` scope | 69 |
| `root-entry` scope | 19 |
| `model` scope | 13 |
| `field="associations"` | 1 |

By kind they are overwhelmingly structural: 14,667 `max selections`, 7,595
`min selections`, 3,958 Crusade limits, and only 19 targeting `pts` directly.
Scopes are 19,056 `parent`, 4,013 `self`, 1,550 `force`, 1,423 `roster` — all
four supported.

### The points limit already works

This was the thing worth checking first, because it is what "is my list legal?"
actually means in matched play.

The game system gives the *Army Roster* force `max pts = 0`, then raises it with
game-system-level modifiers on that constraint: `set 1000`, `set 2000`,
`set 3000`, each gated by a **condition group** requiring the matching battle
size in force scope and the manual override not to be selected. Same
`conditionGroups` mechanism as the Crusade rank names.

The new pinned test builds an Army Roster, adds *Battle Size → 1. Incursion*,
and confirms the effective limit moves from 0 to 1000 — which is what New Recruit
shows Stone as "150 / 1000 pts". It passes today with no code change.

Note the roster shape: the sizes sit in a nested group also called *Battle Size*,
so reaching them takes two hops from the root.

### What is actually left

- **`unit`/`model`/`root-entry` scopes** — 101 constraints. Ordinary
  matched-play limits ("max 1 per unit"), and the largest remaining shape gap.
- **ID-valued scopes** — 116 constraints scoped to a category rather than a
  structural relationship.
- **`automatic`** — 109 constraints carry it and `unsupportedAttributes` does
  not list it, so they trip the attribute check. Measure what it means before
  either supporting or ignoring it; it may be inert noise like `arg` on an
  append, or it may not.
- **`Override points limit?`** — an `increment` carrying `repeats`. Repeat
  shapes stay unsupported, so an overridden limit is honestly incomplete.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **437 passed, 8 skipped (445 total)**.
- Pinned real-data suite — **8 passed**.

### Next recommended boundary

1. **`unit`, `model`, and `root-entry` constraint scopes** — 101 constraints,
   the biggest remaining shape gap, and the same nearest-typed-ancestor
   resolution `resolveAffectsAnchor` already implements for `affects`. Likely
   reusable.
2. **`automatic`** — measure it before deciding. 109 constraints.
3. **ID-valued constraint scopes** — 116 constraints; needs the effective
   category index, so mind the single-pass rule that governs `categories.ts`.

No open questions require the owner.

## Completed Assignment — Constraint Scopes, 2026-08-21

Baseline `aafab17`; resulting implementation commit `ab1c7da`.

### What changed

`unit`, `model`, `model-or-unit`, `upgrade`, and `root-entry` now count as
selection-constraint scopes — 101 corpus constraints, the largest remaining
shape gap. They are ordinary matched-play weapon limits: 43 are "max 1 per
unit", 18 "max 2 per unit".

### Almost none of it was new

`evaluationSelectionScope` already handled every one of these scopes, and
`conditions.ts` already resolved a typed scope to its nearest containing entry.
The two helpers doing it — `typedSelectionTypes` and `nearestTypedSelection` —
were private to `conditions.ts`, so they moved to `selection-context.ts` where
both consumers can reach them. Behavior-neutral: the condition tests passed
unchanged before and after.

The real gain is not the 101 constraints but that **a constraint and a condition
written with the same scope now agree by construction** rather than by
coincidence. They were two implementations of one idea.

**Worth checking elsewhere:** this was the third shared-machinery extraction
after `affects-routing.ts` and `evaluateSelectionTextField`. When a second
consumer needs a private helper, moving it has consistently been cheaper and
safer than reimplementing.

### The refusal

An unresolvable typed scope withholds the count rather than falling back to a
wider set. A roster with no containing unit reports incomplete instead of
silently counting the whole force, which would understate a violation.

### The test uses the shape the corpus writes

Two models under one unit, each taking the same weapon. A `parent` scope sees
one and passes; counted across the unit it is two, which is what the cap means.
Without the fix the test reads 1 and passes for the wrong reason.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **438 passed, 8 skipped (446 total)**.
- Pinned real-data suite — **8 passed**.

### Constraint coverage now

226 of 26,259 corpus constraints remain outside a supported shape — under 1%:
116 ID-valued scopes, 109 carrying `automatic`, and one `associations` field.

### Next recommended boundary

1. **`automatic`** — 109 constraints carry it, and `unsupportedAttributes` does
   not list it, so every one currently trips the attribute check. **Measure what
   it means first.** It may be inert authoring noise like `arg` on an append, or
   it may change whether the constraint is enforced at all; those have opposite
   correct handling.
2. **ID-valued constraint scopes** — 116 constraints scoped to a category. Needs
   the effective-category index, so mind the single-pass rule governing
   `categories.ts`.
3. **Sections C through E** — roster interchange is low priority by owner
   decision; catalogue cache and editing durability are untouched and
   unmeasured.

No open questions require the owner.

## Completed Assignment — Constraint Attributes, 2026-08-21

> **Partially superseded 2026-08-22:** the unverified auto-fill hypothesis below
> is settled by the later Automatic Constraint Initialization assignment.
> Initial creation ignores `automatic`; `true` instead gates later
> constraint-change reconciliation. The bound-evaluation conclusion remains
> valid.

Baseline `3a04a90`; resulting implementation commit `984d427`.

### What changed

109 corpus constraints carry `automatic`, and because the attribute check did
not list it, every one was dismissed as unsupported behavior and reported
incomplete. They are squad sizes and wargear caps — exactly the rules matched
play cares about. They now evaluate.

`message` and `comment` are accepted alongside as inert metadata, matching how
`comment` is already treated on modifiers.

### How the ambiguity was resolved without an experiment

Two readings were plausible and they have opposite correct handling: inert
authoring noise, or a switch that decides whether the constraint is enforced.

The corpus settles it. All 109 carry an **already-supported shape** —
`parent`-scoped `selections` min/max — so the attribute is additive rather than
a semantic switch. And `automatic="false"` sits on:

| Entry | Constraint |
|---|---|
| Khorne Berzerker | `min 5`, `max 19` |
| Recon Troopers | `min 9`, `max 9` |
| Ravener | `min 5`, `max 5` |

Those are squad sizes. They are plainly enforced, so `automatic="false"` cannot
mean "not a real limit". Whichever way it reads, `min 5` is still `min 5`, which
is all the constraint report needs.

A second argument reinforces it: 26,150 constraints carry no `automatic` at all.
If the attribute switched enforcement, its absence would be ambiguous everywhere.
An additive hint with a default is the only coherent reading.

### The part deliberately not done

`automatic` most likely governs whether a roster editor **auto-fills** the squad.
That is unverified, and nothing here consumes it — `initialization.ts` is
untouched.

It is worth someone's attention, though: descendant initialization *does* read
parent-scoped minima (`unsupportedBoundProperties` checks specific properties,
not unknown attributes), so RosterForge will auto-create five Khorne Berzerkers
for a constraint marked `automatic="false"`. Whether New Recruit does the same is
exactly the kind of thing one screenshot would settle.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **439 passed, 8 skipped (447 total)**.
- Pinned real-data suite — **8 passed**.

### Constraint coverage now

**117 of 26,259 remain outside a supported shape — 0.4%**: 116 ID-valued scopes
and one `associations` field.

### Next recommended boundary

1. **ID-valued constraint scopes** — 116 constraints scoped to a category rather
   than a structural relationship. Needs the effective-category index, so mind
   the single-pass rule governing `categories.ts`; `conditions.ts` already has an
   ID-scope resolver worth reading first.
2. **`automatic` and auto-fill** — see above. Cheap to settle with an
   observation, and it changes what a freshly added squad looks like.
3. **Sections C through E** — catalogue cache and editing durability remain
   unmeasured. Roster interchange is low priority by owner decision.

No open questions block work.

## Completed Assignment — Identity Scopes, 2026-08-21

Baseline `1233fa7`; resulting implementation commit `39fdc50`.

### A correction to the previous entry

I recorded these 116 as "scoped to a category" and warned about the single-pass
rule. **Both were wrong.** They name selection *entries*: Troupe, Khorne
Berzerkers, Reavers, Legionaries, Star System. No effective-category index is
involved and `categories.ts` never comes into it.

Measuring what the scope IDs actually resolved to took one query and removed the
whole complication. Worth doing before planning around a dependency.

### What changed

A constraint scope written as an object ID now names a containing occurrence —
`max 4 Players per <Troupe>`, `max 1 Reaver per <Reavers>` — and the count runs
inside it.

Mostly reuse again, the fourth time in this stretch: `conditions.ts` already had
`nearestIdentitySelection`, so it moved to `selection-context.ts` beside the
typed resolver moved there last checkpoint. `evaluationSelectionScope` gained an
`identity` variant that counts within the named occurrence exactly as the typed
scopes already did.

### The shape check, and why it matters

A scope only counts as an identity scope if it **looks like an object ID** —
hexadecimal groups joined by dashes.

Without that, any unrecognised scope string would have been read as an ID,
resolved against nothing, and the bound reported *satisfied* for the wrong
reason. The existing fixture writes `scope="category-unit"` precisely to
exercise the unsupported path, and it caught this: the first attempt turned that
test from "diagnoses an unsupported scope" into a silent pass.

**Worth carrying forward:** when widening what an evaluator accepts, check what
the *existing* negative tests were protecting. That fixture was the only thing
standing between a reasonable-looking change and a class of silently satisfied
constraints.

An identity scope matching no ancestor withholds the count rather than counting
zero, matching the typed-scope rule.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **440 passed, 8 skipped (448 total)**.
- Pinned real-data suite — **8 passed**.

### Section B is effectively done

Every constraint scope the corpus writes is now supported. The remaining shape
gap is **one constraint**: a single `field="associations"`, which is not a
selection count at all.

Constraint coverage went 25,932 → 26,258 of 26,259 across four checkpoints, and
the matched-play points limit is pinned.

### Next recommended boundary

Section B has nothing left worth a checkpoint. The unmeasured areas are:

1. **Section D — catalogue sources and cache.** Cache eviction, quota, retries,
   update discovery, atomic publication. All deferred and none measured.
2. **Section E — editing and durability.** Durable undo history and automatic
   saving are deferred; sibling reordering and force renaming exist headless but
   not in the UI.
3. **`automatic` and auto-fill** — still open, still one observation away, and
   it changes what a freshly added squad looks like.

Both C-through-E areas are product features rather than data semantics, so the
corpus-first method that drove sections A and B does not apply. Expect to start
from what the app does instead.

No open questions block work.

## Completed Assignment — Unsaved-Change Tracking, 2026-08-21

Baseline `98c5d65`; resulting implementation commit `3cf8ddd`.

### Measuring D against E

Both were unmeasured. Section E was worse, and worse than its own roadmap entry
suggested.

| | Section D — cache | Section E — durability |
|---|---|---|
| Failure | storage pressure | **silent loss of work** |
| Surfaced? | yes, browser stores catch and diagnose | **no** |
| Scale | the pinned corpus is 172 MB of JSON | everything since the last manual save |

`saveRosterDraft` was called from exactly one place — a button. Undo history is
in memory. There was no dirty tracking, no indicator, and no unload guard. Close
the tab and the roster was gone, silently. For a tool whose entire activity is
building a list, that is the worst failure available, and it outranked anything
in section D.

### What changed

The controller retains the exact roster last written to or read from the draft
store. Rosters are immutable and every command returns a new one, so **identity
is an exact dirty test** — no deep comparison, no false positives from
re-renders. A new or cleared roster has never been persisted and reads as
unsaved from its first edit.

The workspace shows "Unsaved changes" beside the save button, and a
`beforeunload` listener is registered *only while changes are pending*, so the
browser asks before discarding them and stays silent otherwise.

### What this deliberately does not do

Autosave. The two halves are not equally decided:

- **Saving to an already-active draft on a debounce** is unambiguous. The user
  has already chosen to persist this roster; keeping it current is what they
  asked for. Good next checkpoint.
- **Creating a draft automatically** for a roster never saved is a product
  decision, not a technical one. It changes what the draft shelf means — it
  would fill with unnamed rosters the user never asked to keep. Worth asking
  Stone rather than guessing.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **440 passed, 8 skipped (448 total)**.

### A note on method for sections C–E

Sections A and B were driven by corpus measurement: count the shapes, find the
population, decide from evidence. **That does not transfer here.** These are
product features, and the corpus says nothing about them. The equivalent move is
to read what the app actually does — which is how this gap was found, by
grepping for every call site of `saveRosterDraft` and finding exactly one.

### Next recommended boundary

1. **Autosave to an already-active draft**, debounced. Small, unambiguous, and
   it closes most of the remaining loss window.
2. **Section D — cache limits.** No eviction or quota policy exists. Browser
   stores do catch and diagnose failures, so this degrades visibly rather than
   silently; lower priority than it first looked.
3. **Durable undo history** — survives reload, and depends on how autosave lands.

One question for Stone when convenient: should an unsaved roster autosave into a
new draft automatically, or stay unsaved until asked? Plus the older
`automatic`/auto-fill observation, still open.

## Completed Assignment — Roster Durability, 2026-08-21

Baseline `3cf8ddd`; resulting implementation commits `e806008` (autosave to an
active draft) and `c80e75b` (recovery slot).

Stone chose the sequence and asked for the recovery offer to be a prompt rather
than a silent restore.

### The two halves

**Autosave to an active draft.** Once a roster has a draft the user has already
asked for it to be kept, so edits rewrite it after a two-second debounce —
tunable through the same options seam the id factories and clock already use.
Depending on the roster identity restarts the timer per edit, so a burst writes
once when it settles.

**The recovery slot.** A single reserved record, `__recovery__`, kept current on
the same debounce for *any* unsaved roster. It shares the draft store, so it
reuses that validation and byte limits, but `list` hides it: it never reaches
the shelf and never becomes an entry to prune. Cleared once the roster is
persisted as a real draft.

On the next visit it is **offered, not restored**, naming the roster with
Recover and Discard.

### Why not simply autosave everything

Each draft embeds its own catalogue source bytes — **8.2 MB** for the Death
Guard closure. Autosaving every experiment into the shelf would multiply that
per attempt, on a store with no eviction policy, *and* turn the shelf from "lists
I chose to keep" into a log needing housekeeping. One overwritten slot bounds
the cost to a single closure however many rosters get tried.

That measurement is what decided the design, and it is worth re-checking before
anyone revisits it.

### Testing note

Both tests drive the real flow rather than seeding state. The recovery test
builds a roster, never saves it, confirms the shelf stays empty while the slot
fills, remounts, and finds the offer waiting.

One trap worth recording: with the debounce set to zero the "Unsaved changes"
indicator clears too fast to observe, so asserting on it is racy. Assert on the
**store** instead — it is what actually matters. Also note the UI tests inject
fixed id factories, so a second `add` of the same entry collides; use an amount
change or a rename when a non-destructive edit is needed.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **441 passed, 8 skipped (449 total)**.
- Pinned real-data suite — **8 passed**.

### Next recommended boundary

1. **Durable undo history.** With both saves in place the roster itself survives
   a reload; the undo stack does not. It is the last piece of section E that
   loses anything.
2. **Section D — cache limits.** Still no eviction or quota policy. Browser
   stores catch and diagnose failures, so it degrades visibly rather than
   silently, which keeps it below undo history.
3. **Profile `name` modifiers** — five corpus instances, the last of section A.

Still open, unblocking: the `automatic`/auto-fill observation. Stone judged it
optional because it cannot produce a wrong answer, only a different starting
state.

## Completed Assignment — Draft Write Cost, 2026-08-21

Baseline `32ed963`; resulting implementation commit `126544f`.

### A regression I introduced, found by checking my own work

Before adding durable undo history to the draft record, I checked what a draft
write actually costs. It is worse than I assumed when shipping autosave.

A draft record **embeds its catalogue source bytes**. `decodeLocalRosterDraft`
copies every file through `Uint8Array.from`, and IndexedDB replaces whole
records, so **every write rewrites every byte**.

| | |
|---|---|
| One faction closure (Death Guard) | **8.2 MB** |
| `maxTotalFileBytes` permitted | 256 MB |
| Full pinned corpus, which the app can import | 172 MB |

As a button press that was fine. The previous two commits made it periodic, and
doubled it: the active-draft autosave *and* the recovery slot were both writing
on every settle. At the default two-second debounce that is roughly 8 MB/s of
IndexedDB churn while editing a single faction — and far worse for a larger
import.

**The lesson is the checking, not the bug.** Autosave and the recovery slot both
passed their tests and did exactly what they claimed. The cost only showed up
when the next checkpoint asked "what does one of these writes actually cost?"
before adding to it. Worth doing that before extending any hot path.

### What this commit does

Two bounds, both obviously correct and neither a redesign:

- The recovery slot **skips its write whenever an active draft is already being
  kept current**. A session now writes one record per settle, not two.
- The debounce is **five seconds**, not two, with the reason recorded beside the
  constant so it is not shortened without weighing the cost.

### What it deliberately does not do

Fix the actual problem. **Store the bytes once and have drafts reference them by
import batch.** That also deduplicates bytes across drafts sharing a batch,
which is the largest storage win available anywhere in the app and would soften
section D's missing eviction policy at the same time.

It needs a store schema change plus a fallback for records already written, so
it wants a clear head and its own checkpoint rather than being bolted onto the
work that exposed it. The design is written up in `docs/compatibility.md` under
"Draft Storage Cost".

Sketch for whoever takes it: the current backend is a single id-keyed store, and
`memoryDraftStore` in the UI tests implements that interface, so widening it
breaks tests. Storing the files record under a reserved key in the same store —
`files:<batchId>` — avoids an interface change, but `save` must still validate
the whole draft before splitting it, and `load` must reassemble before decoding.
Check both before committing to an approach.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **441 passed, 8 skipped (449 total)**.

### Next recommended boundary

1. **Draft byte storage** — the fix above. Highest value: it is a correctness-
   adjacent performance defect, it is on a hot path now, and it improves storage
   for every draft.
2. **Durable undo history** — the roster survives a reload; the undo stack does
   not. Worth doing *after* the storage fix, since it would otherwise add to the
   record being rewritten.
3. **Profile `name` modifiers** — five corpus instances, the last of section A.

Still open, unblocking: the `automatic`/auto-fill observation.

## Completed Assignment — Draft Byte Storage, 2026-08-21

**Partly superseded, 2026-08-22.** The work described here stands. Its "Next
recommended boundary" does not: it says durable undo history "is now safe to
attempt: adding history to a draft record no longer means rewriting the
catalogue with it." Removing the catalogue from the write was necessary and not
sufficient. A full 100-entry history is 3.2 MB of roster snapshots on its own,
so it went in its own record instead. See the Durable Undo History entry.

Baseline `c57ade6`; resulting implementation commit `475edb4`.

### What changed

Catalogue bytes now live **once per import batch** under a reserved
`files:<batchId>` key. A draft record keeps empty placeholders, so saving
rewrites only the small record; the batch is written once, on the first save
that references it. `load` and `list` reassemble the two, so nothing outside
the store sees the split.

This is the fix the previous checkpoint specified and deliberately deferred.

### Three consequences

- **Drafts sharing an import batch share one copy of its bytes.** That is the
  largest storage saving available anywhere in the app, and it also softens
  section D's missing eviction policy.
- **A batch is collected when the last draft referencing it is deleted.** Shared
  bytes outlive one draft but not all of them.
- **Records written before the split still load.** Both read paths fall back to
  the embedded files when no batch record exists, so no migration step and no
  version bump were needed.

### The delete test earned its keep

The first working version leaked: deleting a draft left its batch bytes behind
forever. Nothing in the new code noticed — but an existing test asserting
`records.size === 0` after a delete failed immediately, which is what forced the
collection pass.

That is the second time in two days an **existing negative assertion** caught a
gap in new work; the constraint-scope checkpoint was the first. Worth keeping in
mind when widening behavior: the tests protecting the old shape are often the
only thing watching.

### Interface note for whoever touches the store next

`LocalRosterDraftRecordBackend.put` now takes `StoredRecord` — a draft *or* a
batch-files record — rather than a draft, because the store holds two kinds. The
in-memory backend in `App.ui.test.tsx` needed only its map type widened plus an
`asStoredDraft` helper to narrow reads back. Any new backend must key on
`record.id` rather than assuming a draft shape.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **441 passed, 8 skipped (449 total)**.
- Pinned real-data suite — **8 passed**.

### Next recommended boundary

1. **Durable undo history.** The roster now survives a reload; the undo stack
   does not. It is the last thing in section E that loses anything, and it is
   now safe to attempt: adding history to a draft record no longer means
   rewriting the catalogue with it.
2. **Section D — cache eviction and quota.** Still absent, though the byte
   sharing above reduces the pressure.
3. **Profile `name` modifiers** — five corpus instances, the last of section A.

Still open, unblocking: the `automatic`/auto-fill observation.

## Research Note — Comment Coverage, 2026-08-21

No code change. Measured because Stone asked whether the codebase reads well
enough for an unrelated model to pick up.

### The measurement

Across 80 source files, excluding tests:

**42 of 653 exported symbols are documented — 6%.**

The split maps almost exactly onto files touched during recent checkpoints:

| File | Lines | Comment lines | Exports documented |
|---|---|---|---|
| `evaluation/affects-routing.ts` | 328 | 26% | **80%** |
| `evaluation/categories.ts` | 689 | 15% | 31% |
| `evaluation/characteristics.ts` | 1,596 | 14% | 33% |
| `web/browser-drafts.ts` | 356 | 7% | 38% |
| `web/roster-workspace.tsx` | **2,230** | 1% | **0%** |
| `roster-model/commands.ts` | **1,880** | **0** | **0%** (26 exports) |
| `evaluation/conditions.ts` | 1,425 | 1% | 0% |
| `data-graph/resolve.ts` | 1,289 | **0** | 0% |
| `evaluation/initialization.ts` | 1,231 | **0** | 0% |
| `data-graph/materialize.ts` | 1,077 | **0** | 0% |

The largest and oldest files have **no comments at all**. Recent work is the
exception, not the house style.

### Why it matters here, and how much

The project's premise is cross-model handoffs, so a stranger reading
`commands.ts` has only the code. Two things soften that: `agent-handoff.md` and
`docs/architecture.md` already carry the *reasoning*, which is the expensive
part, and 449 tests act as executable specification.

Evidence from one long session, both directions:

- Reading code to answer questions a doc comment would have answered cost
  perhaps 5–10% of the session. Real friction, not fatal.
- **One gap caused a regression.** Nothing recorded that
  `decodeLocalRosterDraft` copies every file's bytes. Autosave was built on top
  of it and created an 8 MB-per-write problem, fixed two checkpoints later. A
  single line on that function would have caught it at design time.

### Recommended scope, and the trap

**Do not sweep all 653 exports.** A retroactive pass by someone who did not
write the code produces *confidently wrong* comments, which are worse than none,
and comments restating a type rot on the next refactor.

Target two things:

1. **The public API surface a stranger meets first** — `roster-model/commands.ts`
   and the `evaluation` entry points. These are the front door and the worst
   documented.
2. **Non-obvious costs and invariants** — the byte copying in
   `decodeLocalRosterDraft`, the single-pass rule, immutability guarantees,
   execution ordering. Exactly the class that caused the regression above.

Skip `battlescribe-data/types.ts` (51 exports that are self-describing shapes)
and anything where the type already says it. Prefer *why* over *what*: the house
style, visible in `affects-routing.ts`, is corpus counts, rejected alternatives,
and observations — not restatement.

Verify each claim against the code before writing it. An unverified comment is a
liability the next reader will trust.

## Completed Assignment — Public API Comments, 2026-08-22

Baseline `6c7599e`; resulting implementation commit `e8075ad`.

This is the checkpoint the previous entry's research note specified. No
behaviour change: the diff is **395 added lines and zero removed**, every added
line a comment or the blank line after a file header.

### The measurement, re-run

| | Before | After |
|---|---|---|
| Exported symbols documented | 42 | **81** |
| Of a total of | 668 | 668 |
| Share | 6% | **12%** |

The note recorded 653 exports and slightly lower line counts — it put
`commands.ts` at 1,880 lines where `wc -l` gives 1,993. My script counts
`export` declarations by line; the difference is method, not content, and both
give 6% before. The script is not committed — it is fifty lines and
re-derivable, and pinning a metric invites optimising for it.

### What was commented, and why those five files

The note named two targets: the public API surface a stranger meets first, and
non-obvious costs and invariants. That resolved to five files:

- **`roster-model/commands.ts`** — 26 exports, 1,993 lines, and not one comment.
  The worst-documented front door in the repository.
- **`roster-model/types.ts`** — selectively. Four comments, not fifteen.
- **`evaluation/index.ts`** — an orientation header. It was a bare list of
  seventeen re-exports, which tells a newcomer nothing about where to start.
- **`evaluation/validation.ts`** — 10 exports; the validity/completeness
  composition rule that `AGENTS.md` treats as the project's central contract.
- **`persistence/local-roster-draft.ts`** — the byte copy the note named by name.

### The three facts most worth having written down

1. **Which commands short-circuit a no-op edit, and which do not.**
   `setRosterSelectionAmount`, both `replace...Definition` commands, both
   `move...` commands, and both `reparent...` commands return the *same* roster
   object when the edit changes nothing. `setRosterForceName`,
   `setRosterSelectionName`, and `renameRoster` do not — writing back the name
   something already has yields a new object.

   That asymmetry is load-bearing rather than cosmetic: `use-app-controller.ts`
   derives both the unsaved-change indicator and the autosave trigger from
   `roster !== persistedRoster`. Renaming a force to its current name marks the
   roster dirty and schedules a write; setting an amount to its current value
   does not. I am recording the behaviour, not calling it a defect — I did not
   find anything that depends on either half, and a documentation checkpoint is
   the wrong place to change it.

2. **`decodeLocalRosterDraft` copies every file's bytes.** `Uint8Array.from`
   per file, so decoding allocates the whole catalogue closure again — 8.2 MB
   for one Death Guard import against a 256 MB configured ceiling. The browser
   store decodes on *every* save, so autosave still pays that copy each time it
   settles, even now that the write itself is small. This is the gap that caused
   the regression two checkpoints ago; it is now on the function.

3. **A definition key is positional, and a retained `sourceId` is what saves
   it.** The key is `JSON.stringify([sourceId, ...path])` with segments like
   `sharedSelectionEntries[3]` — deliberately not the BattleScribe `id`, which
   `data-graph` reports duplicates for rather than assuming unique. Source IDs
   are batch-scoped (`local-file:<batchId>:<index>`), so re-importing the same
   files under a new batch would key differently; draft records retain each
   file's original `sourceId` and `repository` reuses it. That retention is the
   entire mechanism behind "exact definition-key restoration" in the roadmap,
   and nothing said so.

### How the claims were verified

Reading, mostly. Two things needed more:

- The identity behaviour was checked by **probing the built package** rather
  than reasoning about it — a throwaway script over `roster-model/dist` that
  asserted each command's no-op return. It confirmed all seven short-circuits
  and both name-setter exceptions, and confirmed that `2.5` is an accepted
  selection amount while `0`, negatives, `NaN`, and `Infinity` are not.
- The claim that dropping an unreadable constraint report loses no honesty was
  chased through `constraints.ts`: a report missing its type, scope, or limit
  always carries a shape diagnostic, any diagnostic makes that report
  incomplete, and incompleteness propagates to the composed report. Without
  that chain the comment would have been wrong.

One claim was **written and then corrected before committing**: an early draft
said re-importing the same bytes yields the same definition key. It does not —
only the retained `sourceId` makes that true. Worth naming because it is exactly
the failure mode the note warned about: plausible, load-bearing, and wrong.

### What this deliberately did not do

- **Sweep the remaining 587 exports.** The note argued against it and I agree
  after doing the five files: the comments that earned their place came from
  tracing behaviour across packages, which does not scale to 587 and produces
  confident noise when rushed. There is now a paragraph under the section E
  table saying so, so the next model does not read the 12% as a backlog.
- **Comment `battlescribe-data/types.ts`.** 51 exports that are self-describing
  shapes, as the note said.
- **Change any behaviour**, including the name-setter asymmetry in (1).
- **Commit the measurement script.**

### A contradiction fixed in the roadmap

Section E carried **two rows for durable undo history**, one `Open` and one
`Deferred`. The `Deferred` row was residue from `8200db9`, which split
"Durable undo history and automatic saving" to promote autosave and left the
remainder behind; a later commit then added the `Open` row without noticing.
Every recent entry recommends the work, so `Open` wins and the stale row is
gone. The "Picking up from here" paragraph was stale in the same way — it still
named `affects` force traversal as the next target after the roadmap had marked
it Done — and now names durable undo history.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **441 passed, 8 skipped (449 total)**, unchanged.
- Pinned real-data suite with `ROSTERFORGE_BSDATA_JSON_DIR=E:/GitHub/wh40k-11e`
  — **449 passed (46 files)**, i.e. the 8 otherwise-skipped tests pass.
- `docs/compatibility.md`, `docs/architecture.md`, and `docs/diagnostics.md`
  were **not** updated, deliberately: no behaviour boundary, package boundary,
  or diagnostic code moved.

### Owner decision — comments are a standing rule now, not a checkpoint

Stone asked, after reviewing the 12%, whether comment work should continue as a
focus. It should not, and `AGENTS.md` now carries a `## Comments` section saying
so explicitly: **every change ships with the comments that change needs**,
written by whoever holds the context, and comments are part of the completion
criteria alongside tests and diagnostics.

Read that section as a prohibition on sweeps as much as a requirement to
comment. The remaining 587 undocumented exports are not a queue. They get
documented when a checkpoint touches them and can verify what it writes —
which is exactly how `affects-routing.ts` became the best-documented file here.

### Next recommended boundary

1. **Durable undo history.** The last thing in section E that still loses work
   on reload. Read the `commands.ts` header first — whether a command returns a
   new roster is what the existing history and dirty-tracking are built on.
2. **Section D — cache eviction and quota.** Still absent, though the batch byte
   sharing reduced the pressure.
3. **Profile `name` modifiers** — five corpus instances, the last of section A.

Still open, unblocking: the `automatic`/auto-fill observation.

## Completed Assignment — Durable Undo History, 2026-08-22

Baseline `10b5c1b`; resulting implementation commit `2a562fc`.

The last thing in section E that lost work on reload. A saved draft now carries
a tail of its undo history under a reserved `history:<draftId>` key, and
reopening rebuilds the sessions so undo and redo work immediately. The recovery
slot gets one too, because it restores through the same path.

### The measurement came first, and it changed the design

The previous entry expected this to be easy: "adding history to a draft record
no longer means rewriting the catalogue with it." That is true and still not
enough. Measured against the pinned corpus, on a Xenos - Aeldari roster:

| | |
|---|---|
| Roster snapshot, 99 selections | **34 KB** |
| Full in-memory history depth | 100 |
| Naive cost per autosave settle | **3.2 MB** |
| What a draft record costs today | ~34 KB |

3.2 MB every five seconds of active editing is 90× the current write and the
same *class* of defect the draft byte split was written to remove. **Putting the
history in the draft record is not viable**, and that assumption in the Draft
Byte Storage entry should be read as superseded.

The second measurement decided the restore path:

| Restore of one roster | Time |
|---|---|
| 4 selections | 19.1 ms |
| 99 selections | 19.2 ms |

Identical, because `restoreLocalRosterSession` spends all of it in
`indexSelectionChoices`, which walks every root the catalogue materializes and
never looks at the roster. So a per-snapshot restore pays that per entry:

| 20-deep history | Time |
|---|---|
| One `restoreLocalRosterSession` per snapshot | **490 ms** |
| One shared context (`restoreLocalRosterSessions`) | **27 ms** |

### What was built

- **`history:<draftId>`, not the draft record.** Same shape as
  `files:<batchId>`. It also keeps `list` out of it entirely: a shelf summary
  needs a name and a date, and validating twenty snapshots per draft on every
  refresh is work for nothing. `load` is the only reader.
- **Bounded twice.** `maxHistoryEntries` caps 20 across past and future in the
  persistence layer; a **256 KB** budget in the browser store then trims from
  the far end. For a large roster that is roughly seven undo steps, for a small
  one the full twenty. A byte budget because the cost that matters is bytes per
  settle and a snapshot grows with the roster.
- **Past fills before future.** Undo is what anyone reaches for after a reload,
  and handing back a redo stack that outlived the undo steps under it would be
  strange. Both share one budget.
- **`restoreLocalRosterSessions`** takes one shared catalogue context. The
  single-roster entry point delegates to it, so nothing else changed shape.
- **Per-snapshot ID scopes.** The same occurrence IDs recur across snapshots by
  construction — one roster at different moments — so decoding them in the
  shared scope would have rejected every history a draft can hold. Total work
  stays bounded because `maxHistoryEntries` caps the number of scopes.

### The failure this deliberately does not propagate

A snapshot that no longer resolves costs the **history**, never the roster. The
draft opens with an empty stack and reports
`WEB_ROSTER_DRAFT_HISTORY_UNAVAILABLE`. Refusing to open a perfectly good list
because a stale undo step will not rebuild would be the wrong trade, and the
fallback pays a second catalogue index only on that rare path.

### Tests

Nine added, 441 → 450.

- Persistence (4): history decoding with recurring IDs across snapshots, absent
  history staying absent rather than becoming empty, a malformed snapshot
  reporting its own `["history","future","0","name"]` path, and the entry limit.
- Browser store (5): the split and its reassembly, `list` not touching history
  records, the byte budget keeping the tail, the record being removed once
  nothing is left to undo, and collection on delete.
- **The end-to-end one is the one that matters.** `App.ui.test.tsx` now saves a
  draft, edits it, reopens it, and asserts Undo is enabled and reverts the edit.
  I sabotaged `draftHistory` to return an empty past and confirmed it fails
  (`expected true to be false`) before restoring it. A test that cannot fail is
  worth nothing, and this one was cheap to check.

### What this does not do

- **Give an unsaved roster a durable history.** The recovery slot carries one,
  but a roster that has never been saved and never settled has nowhere to put
  it. That is the same boundary unsaved-change tracking already has.
- **Persist history depth beyond the tail.** Restoring 20 and continuing to 100
  in memory is the intended behaviour, not a gap.
- **Handle a draft ID colliding with a reserved key prefix.** `files:` has had
  the same property since the byte split and generated IDs are UUIDs.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **450 passed, 8 skipped (458 total)**.
- Pinned real-data suite with `ROSTERFORGE_BSDATA_JSON_DIR=E:/GitHub/wh40k-11e`
  — **458 passed (46 files)**.
- `docs/compatibility.md` gained a "Draft Undo History" section with the numbers
  above; `docs/diagnostics.md` gained the new code.

### Next recommended boundary

1. **Section D — cache eviction and quota.** The last structural gap in
   durability. The store now holds three record kinds and nothing ever bounds
   the total, so a user who imports several batches has no way to reclaim space
   short of deleting drafts.
2. **Profile `name` modifiers** — five corpus instances, the last of section A.
3. **`automatic` driving auto-fill** — still unverified and unconsumed;
   `initialization.ts` reads parent-scoped minima and does not look at it.

Still open, unblocking: the `automatic`/auto-fill observation.

## Completed Assignment — Draft Storage Reporting, 2026-08-22

Baseline `f7dce17`; resulting implementation commit `f5f54c9`.

A deliberately small checkpoint — the session was near its budget, and this was
the piece of section D worth having before the rest of it.

### The defect

`LocalRosterDraftSummary.totalFileBytes` is the size of a draft's **import
batch**. Since the byte split a batch is stored once and shared by every draft
imported with it, but the shelf printed that figure on every card with nothing
marking it shared. Three drafts on one 8.2 MB catalogue read as **24.6 MB**.

Nobody had lied on purpose: the field meant "this draft's files" when it was
written, and the byte split changed what it meant without changing its name or
its readers. Worth remembering when a storage layer starts sharing something.

### The fix

Summaries carry `batchId`. The shelf groups by it, totals distinct batches in
its heading, and appends "shared" to a card whose batch more than one draft
uses. The doc comment on `totalFileBytes` now says what it is the size of.

### Why this before eviction

An eviction policy scoring drafts by `totalFileBytes` would have been built on
the inflated number. Deleting the largest-looking draft can free **nothing** if
a sibling still references its batch — the batch is only collected when the last
referencing draft goes. That is a policy that reports success and frees no
space, and it would have been hard to spot from the outside.

### Scope, and what is still missing

Reporting only. Still absent, and still section D:

- Nothing bounds the total the store may reach.
- Nothing evicts, by age or size or anything else.
- `navigator.storage.estimate()` is not consulted, so the app cannot say how
  close to the browser's quota it is, and a quota failure surfaces as the
  generic `PERSISTENCE_DRAFT_WRITE_FAILED`.
- The heading counts catalogue batches only. Draft records and
  `history:<draftId>` records are real but small — a history is capped at 256 KB
  against an 8.2 MB batch — and folding them in would need `list` to size
  records it deliberately does not read.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **453 passed, 8 skipped (461 total)**, three added: a new
  `saved-draft-shelf.test.tsx` covering the shared, unshared, and empty cases,
  plus a `batchId` assertion on the existing list test.
- `docs/compatibility.md` gained a "Draft Storage Reporting" section.

### Next recommended boundary

1. **Cache eviction and quota** — the rest of section D, now on honest numbers.
   Read `navigator.storage.estimate()` first and decide whether the policy is
   size-triggered or age-based; note that freeing a draft frees its batch only
   when no sibling draft still references it.
2. **Profile `name` modifiers** — five corpus instances, the last of section A.
3. **`automatic` driving auto-fill** — unverified and unconsumed.

Still open, unblocking: the `automatic`/auto-fill observation.

## Completed Assignment — Quota Failure Handling, 2026-08-22

Baseline `85a9334`; resulting implementation commit `60294ad`.

Second small checkpoint of the session, again scoped to the budget. Section D
is "eviction and quota"; this is the **quota** half, and it turned out to hold
three defects that needed no policy to fix.

### What was wrong

1. **A refused write was indistinguishable from any other.** Out of space
   reported `PERSISTENCE_DRAFT_WRITE_FAILED` with no advice.
2. **A failed save could orphan its batch record forever.** `save` writes the
   batch first and it is by far the largest record. A batch is only reclaimed
   when the last draft referencing it is *deleted*, so a batch written by a save
   that then died had no draft, no referrer, and no path to collection. Worst on
   a quota failure, where the orphan occupies the space that was already short.
3. **Autosave retried the failed write forever.** The effect re-arms on roster
   identity and on `draftAction.kind` returning to idle. A failure updates
   neither `persistedRoster` nor the roster, so it fired again every five
   seconds for the rest of the session — against a browser that had just said it
   was full.

(2) and (3) both predate this checkpoint. (2) arrived with the byte split, (3)
with autosave.

### What changed

- `PERSISTENCE_DRAFT_QUOTA_EXCEEDED`, matched **by error name** rather than
  `instanceof DOMException`: the error crosses from the IndexedDB
  implementation, which under test is a different realm with a different
  `DOMException`. Firefox's historical `NS_ERROR_DOM_QUOTA_REACHED` is treated
  alike. The message names the fix and the catch — shared source files are only
  freed when the last draft sharing them goes.
- A save rolls back **only a batch it created itself**. One that was already
  present belongs to the drafts already referencing it, and deleting it would
  strand them.
- `autosaveBlockedRoster` holds the roster whose save failed and the effect
  skips it. The next edit is a new roster and is tried normally; the save button
  always tries, because that is the user asking.

### Tests

Five added, 453 → 458.

- Store (4): both quota error names mapping to the new code, the rollback of a
  self-created batch, and the negative case — a pre-existing batch surviving a
  later draft's failed save.
- UI (1): a draft saves, the next autosave is refused on space, and no further
  write follows. Removing the block makes it fail with a third write, checked.

The UI store helper needed a `failWritesAfter` option; it deliberately does not
count the recovery slot, which writes before any draft exists and would
otherwise consume the allowance.

### What section D still needs

Failures are legible; nothing yet **prevents** one.

- No bound on total store size, and no eviction by age or size.
- `navigator.storage.estimate()` is still not consulted, so the app cannot warn
  before a write fails, only report afterwards.
- A quota failure during the *recovery slot* write is silent by design
  (`recoveryRef` discards its result). Worth revisiting if the slot ever
  matters more than the active draft.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **458 passed, 8 skipped (466 total)**.
- `docs/compatibility.md` and `docs/diagnostics.md` both updated.

### Next recommended boundary

1. **Eviction and a size bound** — the other half of section D. Start from
   `navigator.storage.estimate()`, and remember that deleting a draft frees its
   batch only when no sibling still references it.
2. **Profile `name` modifiers** — five corpus instances, the last of section A.
3. **`automatic` driving auto-fill** — unverified and unconsumed.

Still open, unblocking: the `automatic`/auto-fill observation.

## Completed Assignment — Repository Byte-Cache Eviction, 2026-08-22

> Measurement correction, 2026-08-22: the 67,554,454-byte figure below is the
> CRLF-expanded Windows checkout, not the exact pinned Git blobs that the remote
> cache stores. Those blobs total 65,641,889 bytes (62.60 MiB). The 256 MiB
> policy and all eviction conclusions are unchanged.

Baseline `cbf0a42`; implementation commit `7c2ac00`
(`feat: bound the repository byte cache`).

Only `rosterforge-pinned-repository-cache` changed. Saved drafts were neither
read nor evicted. The pinned 46-file corpus is **64.42 MiB** (67,554,454 bytes);
its largest file is 7,041,250 bytes. The 256 MiB total comes directly from
`defaultRemoteBattleScribeRepositoryLimits.maxTotalBytes` so one maximally
accepted repository can fit.

LRU won over FIFO because hits reveal reuse. Access time could not live in a byte
record: that would rewrite up to 16 MiB per hit. Versioned sidecars total 13,463
bytes for the corpus, 293 bytes average and 308 maximum.

Database version 2 adds `pinned-repository-byte-metadata`. Writes account for
replacement, then evict oldest byte/sidecar pairs. Valid version-1 records
migrate at time zero; malformed legacy records are discarded. Malformed later
accounting clears only this disposable cache. A failed sidecar touch keeps the
valid hit usable.

`navigator.storage.estimate()` stays separate because it is origin-wide and
includes irreplaceable drafts plus three cache databases.

### Verification

Four tests were added, 458 → **462 passed**. Reversing the comparator made the
LRU test fail before the implementation was restored.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — pass.
- `pnpm test` — **462 passed, 8 skipped (470 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — **8 passed**.
- Build retains only the existing large-chunk warning.

### Correction and next boundary

The incoming handoff omitted the third database,
`rosterforge-pinned-repository-metadata-cache`. It is re-downloadable, limited
to 32 MiB per entry, and unbounded in total. The roadmap now records it.

Take **repository metadata-cache eviction** next as a measure-first checkpoint.
Do not copy the byte-cache limit without measuring its JSON payload and retained
revision count. Then address origin-wide storage headroom.

No owner input is currently required.

## Completed Assignment — Repository Metadata-Cache Eviction, 2026-08-22

Baseline `b13a6c9`; implementation commit `8c58486`
(`feat: bound the repository metadata cache`).

Only the re-downloadable remote-index database and its source-size estimate
changed. The saved-draft database was neither read nor modified.

### Measurement first

The production remote-index path listed the exact pinned GitHub tree while a
read-through test cache served `git show` bytes for commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`. The resulting report is
**181,985 bytes**: 46 file reports, 46 document summaries, 109 catalogue links,
and the one existing invalid-empty-`defaultCostLimit` diagnostic. Exact Git
objects total **65,641,889 bytes (62.60 MiB)**; the seven-file Imperial Knights
closure is **7,521,360 bytes**.

The earlier 67,554,454-byte corpus total measured a Windows checkout after CRLF
expansion. It remains a valid local-file import measurement but was wrong for
remote-download estimates and byte-cache storage. The configured first-browse
estimate and remote-cache documentation now use exact Git-object bytes.

### Policy and implementation

The 32 MiB total matches the existing 32 MiB per-entry limit. It therefore
always admits one maximally accepted report and currently retains 184 pinned
reports of the measured size. LRU won over FIFO because cache hits reveal reuse.
Access time lives in `pinned-repository-metadata-lru`, so a hit rewrites a
small sidecar rather than as much as 32 MiB of JSON.

Database version 2 migrates valid version-1 records with access time zero and
drops malformed legacy records. Writes exclude a replacement's old size,
evict oldest record/sidecar pairs before the atomic put, and clear only this
disposable metadata database when accounting is malformed. A failed sidecar
touch leaves a valid hit usable. Draft records are never candidates.

### Verification

Four tests were added, 462 -> **466 passed**. Reversing the LRU comparator made
the new reuse test fail at its assertion that the recently read report survived;
the correct comparator was then restored.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and
  `git diff --check` — pass.
- `pnpm test` — **466 passed, 8 skipped (474 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — **8 passed**.
- Build retains only the existing large-chunk warning.

### Next boundary

Take **storage headroom before a write** next. It deliberately stayed separate:
`navigator.storage.estimate()` is origin-wide and includes two disposable
caches plus irreplaceable drafts, while deterministic cache bounds can be
settled without choosing a user-data refusal or warning policy. No cache
management UI, retry policy, or draft eviction was added.

## Research Checkpoint — Storage Headroom, 2026-08-22

Baseline `4b2bba5`. Documentation-only checkpoint; no runtime code changed.

The proposed pre-write guard is not implementable honestly with
`navigator.storage.estimate()`:

- The Storage Standard defines usage and quota as estimates for the entire
  origin, not for one of RosterForge's three IndexedDB databases.
- A draft save may create a shared batch, replace a draft, replace or remove a
  history record, and then write the draft. Raw payload size is not the storage
  delta because IndexedDB encoding, compression, allocation, and tombstones are
  implementation details.
- Chromium's predictable-quota change reports an artificial quota for ordinary
  sites while leaving actual enforcement unchanged. WebKit separately warns
  that the reported quota does not guarantee the site can store that amount.

Sources consulted:

- WHATWG Storage Standard:
  <https://storage.spec.whatwg.org/#dom-storagemanager-estimate>
- Chromium predictable reported quota:
  <https://groups.google.com/a/chromium.org/g/blink-dev/c/7q0YGQNVkjs/m/-iee67QrBQAJ>
- WebKit storage policy:
  <https://webkit.org/blog/14403/updates-to-storage-policy/>

Three implementations were rejected:

1. **Block when estimated headroom is below serialized input.** Replacement
   writes can need less space than their input, and the reported quota can be
   artificial; this would reject writes that may succeed.
2. **Clear caches before a draft write.** An estimate cannot prove the draft
   needs that space, so doing this would trade guaranteed downloads for no
   guaranteed benefit.
3. **Warn at an arbitrary percentage.** Chromium can keep the reported
   remainder effectively constant, so the warning would be absent precisely
   when a real quota refusal can still occur.

The reliable boundary stays as implemented: both re-downloadable caches have
deterministic LRU bounds, drafts are never evicted, and a real
`QuotaExceededError` produces `PERSISTENCE_DRAFT_QUOTA_EXCEEDED` with
cleanup guidance. Approximate usage UI or `navigator.storage.persist()` can be
reconsidered as an explicit product feature, not as correctness.

No tests changed. The immediately preceding full gates remain **466 passed,
8 skipped (474 total)**, the pinned corpus is **8 passed**, and CI run
`32602221329` passed all jobs in 41 seconds.

### Next boundary

Return to section A for the final observed display gap: **profile `name`
modifiers**, five pinned-corpus instances. Measure their ownership, routing,
conditions, and expected presentation before implementing them.

## Completed Assignment — Profile Display Names, 2026-08-22

Baseline `d869233`; resulting implementation commit `736d530`
(`feat: evaluate profile display names`).

### Measurement

The pinned 46-document corpus has exactly five profile-owned
`field="name"` modifiers. Four are `set`; the Space Wolves form is `append`
with no `join`, so it uses the established default-space separator. Every one
is inside one top-level `and` group with a single `atLeast 1 selections`
condition. The condition's ID-valued scope names the owning model, `childId`
names selected wargear, and `shared` plus `includeChildSelections` are true.
The modifiers themselves have no conditions, condition groups, repeats, scope,
`affects`, `join`, `arg`, or `position`.

The exact profile IDs are pinned in Adepta Sororitas, Deathwatch (two), Space
Marines, and Space Wolves. The operation values are four shield-specific names
and the `(Storm shield)` suffix.

### Implementation

`evaluateRosterProfileName` is a read-only report over the existing projection.
The caller supplies the base name so a materialized info-link override composes
correctly. Direct profile modifiers run first, then condition-aware modifier
groups in source order, then the already-supported profile-terminus `affects`
path. Unsupported applicable behavior withholds the effective name and makes
only the name/profile inspection incomplete.

`field="name"` is no longer misclassified as an unrouted characteristic
target. The browser session folds the name report into each profile's
completeness and the workspace renders effective name, then parenthesized
annotation. The projected profile, generic node, link wrapper, and source bytes
are never mutated or cloned.

No diagnostic code was added: text operations use the existing structured
characteristic-operation codes, while group and condition failures retain
their existing source-located codes.

### Real-data proof

The new optional test builds the pinned Sororitas Mortifiers root, explicitly
selects model definition `f027-a14f-7bcb-90fd`, then profile
`aa7-bf29-422a-6219`. Before wargear, the grouped step is not applicable and
the value stays `Mortifier`. Selecting Anchorite Sarcophagus
`e8dd-ba31-be8a-ef32` makes that exact step apply and produces
`Mortifier w/ sarcophagus`.

The test also records a useful graph distinction: the visible Mortifiers root
is a catalogue-link occurrence; `3c3f-f02d-c05c-492a` is its `definitionId`,
not its occurrence `id`.

### Verification

Three ordinary tests were added, **466 -> 469 passed**: grouped false and true
paths in the evaluator, plus browser-session composition. The existing UI test
now proves an effective profile name renders before its own annotation. The
optional pinned suite gained the exact Mortifier transition, **8 -> 9 passed**.

For the negative control, grouped name execution was temporarily forced to
`notApplicable`. The new evaluator test failed with both operations left at the
base `Profile Name`; the implementation was restored and the test passed.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — pass.
- `pnpm test` — **469 passed, 9 skipped (478 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — **9 passed**.
- Build retains only the existing large-chunk warning.

### Remaining boundary

All observed profile-name behavior is supported. The six profile-owned
characteristic modifiers targeting another profile remain unrouted, and
`multiply`/`divide`/`modulo` remain deliberately unsupported because the
pinned corpus contains none. No catalogue resolution, cost calculation, or
validation enforcement changed.

Take **`automatic` driving auto-fill** next as a research-first checkpoint.
Inventory its 109 corpus constraints by Boolean value, bound kind, scope, and
selection context; then consult nr-editor or observe New Recruit before
changing `initialization.ts`. Stone previously judged this optional because it
can change only the starting state, not the supported bound result. No owner
input is currently required.

## Completed Assignment — Automatic Constraint Initialization, 2026-08-22

> Trigger correction, 2026-08-22: the final recommendation below is too
> narrow. New Recruit reacts when either the selection query/count or the
> effective constraint value changes and the result is violated. The
> initialization conclusion itself remains correct.

Baseline `e32e520`; resulting implementation commit `973b8c3`
(`fix: accept automatic bounds during initialization`).

### Earlier hypothesis corrected

The earlier suggestion that `automatic="false"` might suppress initial
descendant creation was wrong. New Recruit's initializer reads min, max, and
default selection amounts without consulting `automatic`. A separate
constraint-change handler dispatches repair only when `automatic` is true.
RosterForge now matches that split for initial creation; live repair remains
open.

The evidence came from New Recruit client 35.66, build
`420bf6f1-2795-4c15-b21e-b789f9459b24`. Its shipped runtime has an initializer
path (`Lk` / `Koe` / `Voe`) that reads bounds without `automatic`, followed by
`onConstraintChanged`, which enqueues `automaticConstraintChanged` only for a
truthy property. Handler `Joe` then clamps ordinary entries (`nae`), groups
(`Zoe`), and sub-units (`eae` / `rae` / `tae`). Public nr-editor commit
`2a5edd2767ea6e2fd44d166c20052b7c8aa7818d` added the raw-editor checkbox and a
private runtime-submodule update, but did not itself expose those semantics.

### Corpus measurement

At pinned wh40k-11e commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, all 109 values are native
Booleans: 88 true and 21 false. The constraints comprise 80 maxima and 29
minima; 108 target `selections` and one targets ID
`04b1-67f7-48cb-4f1f`; 108 use `parent` scope and one uses `self`.

Their owners are 85 selection entries, 12 entry links, nine selection-entry
groups, one shared selection entry, and two shared selection-entry groups.
Forty entry owners are models, 46 are upgrades, and 12 are selection-entry
links. `includeChildSelections` is false on 99, true on three, and absent on
seven; `percentValue` and `includeChildForces` are each false on 20 and absent
on 89. Fifty-seven owners carry more than one sibling constraint.

No clean real-data behavior pin exists for the initial true case: every positive
`automatic: true` minimum has modifier-confounded surrounding bounds. The
optional corpus test therefore pins the exact inventory rather than pretending
that a confounded example proves initialization behavior.

### Implementation

`initialization.ts` treats only the generic `automatic` attribute as inert when
screening otherwise-supported root and parent bounds. Supported minima now seed
identically when the extension is absent, false, or true. The extension remains
outside the BattleScribe 2.03 typed projection because it is a New Recruit
extension and its original Boolean text must remain visible on the generic node.

The synthetic fixture has an `automatic="false"` model minimum of two and an
`automatic="true"` upgrade minimum of one. The test proves both initialize,
produce no unsupported diagnostics, and retain the exact generic attribute
values. No command-level reconciliation, bound re-evaluation, catalogue
resolution, or legality enforcement was added.

### Verification

One ordinary test was added, **469 -> 470 passed**. The optional pinned suite
keeps **9 passed** and now asserts the exact 109-instance inventory above.

For the negative control, the recognized attribute was temporarily renamed to
`automatic-sabotaged`. The new synthetic test failed with two
`EVALUATION_INITIALIZATION_CONSTRAINT_UNSUPPORTED` diagnostics naming
`automatic`; the implementation was restored and the focused suite passed.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — pass.
- `pnpm test` — **470 passed, 9 skipped (479 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — **9 passed**.
- Build retains only the existing large-chunk warning.

### Remaining boundary

Take **`automatic: true` post-edit reconciliation** next. Measure the immutable
command cost and inventory affected entry/group/sub-unit paths before extending
the hot edit path. New Recruit clamps these structures only after a relevant
bound changes; ordinary initial creation is complete and should not be revisited.

## Completed Assignment — Selected Automatic Reconciliation, 2026-08-22

Baseline `599ee3f`; resulting implementation commit `1396e10`
(`feat: reconcile selected automatic constraints`).

### Runtime evidence and trigger correction

The deployed New Recruit 35.66 build
`420bf6f1-2795-4c15-b21e-b789f9459b24` corrected the previous entry's
trigger wording. Both `queryChanged` and `valueChanged` call
`onConstraintChanged`. Its computed min/max state means violation, and only a
constraint whose source carries true `automatic` enqueues
`automaticConstraintChanged`. Handler `Joe` then dispatches to separate
ordinary-entry (`nae`), group (`Zoe`), and sub-unit
(`eae`/`rae`/`tae`) branches.

The correct statement is therefore: live repair follows either a changed
selection query/count or a changed effective bound when that change leaves the
automatic constraint violated. Initial creation still ignores the extension.

### Corpus and hot-path measurement

Of 88 `automatic: true` constraints, 74 are modifier-driven across 54
owners: 42 selection entries, six entry links, four selection-entry groups, one
shared selection entry, and one shared selection-entry group. Those owners
resolve to 49 ordinary entries, five groups, and zero unit-typed sub-units.
Fourteen true constraints are static.

Twelve modifier-driven minima start at zero and can make an absent choice newly
required: 11 ordinary owners and one group. Ten positive-minimum dynamic owners
already have a selected occurrence after supported initialization.

The implementation was measured before the hot path changed. Ten complete
Checks inspections over a pinned 41-selection Guardian roster took **30,215.7
ms**, about 3.02 seconds each. Ten targeted evaluations of the selected
Scourge min/max pair took **407.4 ms**, about 40.7 ms per pair. Running the
whole validation report after every click was rejected.

### Implementation

After a successful root add, child add, max-one group replacement, removal, or
amount edit, the web session scans only currently selected exact materialized
choices carrying lexical `automatic="true"` or `automatic="1"`. It groups
repeated occurrences under the same direct parent and invokes the existing
selection-condition constraint evaluator directly.

A complete violated ordinary-entry minimum raises the earliest occurrence. A
complete violated maximum reduces or removes latest occurrences first. Each
clamp is re-evaluated, with a ten-pass guard. The initiating command and every
repair are returned as one immutable session result, so undo, redo, dirty
tracking, recovery, and autosave see one action. Initial session creation uses
the unreconciled add path and retains the already-settled initializer semantics.

Incomplete evaluation never supplies a guessed amount. Selected groups,
unit-typed child selections, a selector that disappears during a pass, a
stalled repair, and the pass guard all have source-located compatibility
diagnostics. Lexical `false`, `0`, absent, and unknown values remain
observable and inert.

### Tests and real-data proof

The fictional fixture proves an amount of one grows to four, selecting an
alternate lowers the dynamic min/max to three, an explicit amount of nine is
clamped back to three, removing the alternate restores four, and
`automatic="false"` remains at one. Adding a duplicate occurrence proves
the maximum removes the newest occurrence and cleans its choice-index entry.
The earlier immutable session remains unchanged.

The pinned Drukhari test builds `Scourges with Shardcarbines`. Model
`6e9b-38a8-e240-7a50` starts at four; selecting alternate model
`313f-6619-806f-c4c7` applies the grouped decrements and changes the
default model to exactly three while retaining the alternate at one.

For the negative control, the enabled-value predicate was temporarily changed
to look for `true-sabotaged`. The focused test failed at the first clamp,
receiving one instead of four; the implementation was restored and the
strengthened test passed.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and
  `git diff --check` — pass.
- `pnpm test` — **471 passed, 10 skipped (481 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — complete
  suite **481 passed**, including 10 corpus tests.
- Build retains only the existing large-chunk warning.

### Remaining boundary

Take **absent ordinary-choice activation** next, but begin with an identity
inventory. A shared constraint counts by definition ID, while the current
repair groups an exact materialized choice under one parent. Determine whether
different wrappers of one shared definition can coexist under that parent in
the pinned corpus; do not silently mutate across wrappers without evidence.

Then implement the 11 ordinary base-zero owner cases if that identity question
settles cleanly. The twelfth base-zero owner is a selection-entry group and
belongs with the five-owner group algorithm. Unit-typed sub-unit repair has no
pinned modifier-driven owner and stays low priority. No catalogue resolution,
cost calculation, general validation enforcement, persistence, or UI behavior
changed.

## Completed Assignment — Absent Automatic Activation, 2026-08-22

Baseline `bd9c104`; resulting implementation commit `75a12e6`
(`feat: activate absent automatic selections`).

### Identity inventory settled first

At pinned wh40k-11e commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, twelve modifier-driven
`automatic: true` minima start at zero and can make an absent choice newly
required. Eleven owners are ordinary entries and one is a selection-entry
group.

The eleven ordinary owners are six Leagues of Votann wargear choices
(EtaCarn plasma gun `8619-9766-108e-f579`, Volkanite disintegrator
`ee96-471c-ef12-d689`, Concussion gauntlet
`4af9-1fdc-54b3-617a`, Plasma blade gauntlet
`e5aa-490d-0302-1725`, Concussion maul
`7719-aa64-5e16-9a9d`, Heavy plasma axe
`697f-710e-738d-4ee3`), four Necron C'tan choices (Singularity Matrix
`e402-fe4a-b246-540e`, Quantum Goad `8389-2298-cdf5-548f`,
Animus Damper `f5b0-0570-d832-eb0b`, Reletavistic Tether
`4b7a-0ee7-9cf0-8434`), and T'au Pulse carbine
`9e02-6828-1052-5cc4`. Tyranid Specialisms
`9c71-7661-3b6b-a27c` is the group case.

All eleven ordinary modifiers set the effective minimum to exactly one. Ten
choices are hidden until the same trigger reveals them; Pulse carbine is already
visible. Searching all 46 documents found **zero entry-link references** to any
of those eleven owner IDs. That settled the common path without inventing
cross-wrapper identity semantics.

### Implementation

The web automatic helper was extracted from `roster-session.ts` so the
selected and absent branches share one bounded command integration point.
Selected clamps settle first. The absent branch then walks direct entries and
transparent groups under selected occurrences in materialized order, skips
already-selected exact choices and unit-typed sub-units, and requires a complete
visible path.

Each candidate is added only to a throwaway immutable roster snapshot. The
existing condition-aware constraint inspector evaluates its effective minimum;
a complete positive deficit creates one real occurrence at that amount through
the caller's selection-ID factory. The temporary ID, probe roster, and temporary
choice-map entry never escape. Catalogue projections, generic nodes, provenance,
and imported bytes remain shared by reference.

Root add, child add, max-one group replacement, remove, and amount commands now
supply or accept the same ID factory. Every automatic activation remains part of
the initiating immutable action, so undo, dirty tracking, recovery, and
autosave do not see an internal edit.

A missing ID factory emits
`WEB_ROSTER_AUTOMATIC_CONSTRAINT_SELECTION_ID_UNAVAILABLE` and preserves
the initiating edit. If a selected or absent effective selector counts an
occurrence from another exact materialized wrapper,
`WEB_ROSTER_AUTOMATIC_CONSTRAINT_SHARED_SELECTOR_UNSUPPORTED` withholds
cross-wrapper mutation. The fictional two-link fixture proves that guard.

### Hot-path measurement

The earlier comparison still governs the design: ten full Checks runs on the
41-selection Guardian roster measured **30,215.7 ms**, while ten targeted
Scourge min/max evaluations measured **407.4 ms**. After the absent scan was
implemented, ten complete amount-command reconciliations on that Guardian
session with no reachable absent candidate measured **1.2 ms total**, about
0.12 ms per edit. The temporary timing instrumentation was removed.

### Tests and real-data proof

The synthetic activation case starts an ordinary choice at a modifier-controlled
minimum of zero, reveals it and raises min/max to one, removes it when the
trigger disappears, and reactivates it when the trigger returns. It also proves
a missing factory emits a source-located structured warning, the earlier session
stays unchanged, and no internal probe ID reaches the roster.

The shared-wrapper case materializes one shared definition through two links.
After the first wrapper is selected and its trigger raises the minimum, the
second wrapper remains absent and the exact foreign occurrence is retained in
the diagnostic.

The pinned Necron test builds the Deceiver, selects Pantheon of Woe
(`1707-57c5-676e-90d9`), and proves Singularity Matrix
(`e402-fe4a-b246-540e`) appears beneath the Deceiver at exactly one.
The prior session remains unchanged.

Two negative controls were run. Disabling the automatic-minimum predicate made
the activation test fail at its first expected ID-unavailable diagnostic.
Disabling only the shared-selector guard made the dedicated wrapper test fail
with no compatibility warning. Both changes were restored and the tests passed.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and
  `git diff --check` — pass.
- `pnpm test` — **473 passed, 11 skipped (484 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — complete
  suite **484 passed**, including 11 corpus tests.
- Build retains only the existing large-chunk warning.

### Remaining boundary

Take **automatic selection-entry-group reconciliation** next. Inventory all
five modifier-driven group owners and reproduce the one base-zero Tyranid
Specialisms transition before implementing New Recruit's distinct group
algorithm. Do not route it through the ordinary-entry amount logic merely
because both branches eventually change a selected count.

Unit-typed sub-unit repair remains low priority because the pinned corpus has
zero modifier-driven owners. Cross-wrapper automatic mutation also remains low
priority and diagnosed: none of the eleven supported absent owners is linked.
No catalogue resolution, cost calculation, general validation enforcement,
persistence, or UI behavior changed.

## Completed Assignment — Automatic Selection-Entry-Group Reconciliation, 2026-08-22

Baseline `38cf4f6`; resulting implementation commit `70b1036`
(`feat: reconcile automatic selection groups`).

### Runtime behavior settled first

The deployed New Recruit 35.66 group branch was read before implementation. It
fills a violated minimum across visible group children in stable interaction
priority/source order up to each child's effective maximum. It trims a violated
maximum in the reverse of that order down to each child's effective minimum.
The exact interacted choice has highest priority, so it is considered first for
a fill and first after reversal for a trim.

A selection-entry group is transparent in RosterForge's durable roster. Adding
a permanent group occurrence was rejected. Extracting only modifier-limit
evaluation into a new public evaluator API was also rejected after verifying
that `roster-builder` can add a group to a throwaway roster: the temporary
occurrence gives `self`, `parent`, typed, and ID-valued conditions the right
relative anchor while reusing the complete condition-aware inspector. It never
enters the returned session or choice map.

### Exact corpus inventory

At pinned wh40k-11e commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, typed-projection traversal
derives exactly five modifier-driven automatic group owners:

- World Eaters Dishonoured `972c-1a7a-a57a-aa0c`: two model children,
  base min/max 1.
- Tyranid Specialisms `9c71-7661-3b6b-a27c`: six upgrade children,
  base min 0/max 1.
- Tyranid Ranged Weapons `93f9-6099-8613-801c`: 21 upgrade children,
  base max 1.
- T'au Krootox Riders `aee2-c887-105a-ea1b`: two model children,
  base max 3.
- T'au Ranged Weapons `82dc-f84f-1b88-b8fd`: 22 upgrade children,
  base max 1.

All five have zero nested direct or linked groups. Resolving all child entry
links finds only model or upgrade targets and zero unit-typed sub-units.
Specialisms is the sole base-zero group minimum and is reached through three
Crucible organism wrappers.

### Implementation

The bounded command reconciler now settles selected ordinary quantities, then
visible automatic groups, then absent ordinary choices. A throwaway group
occurrence supplies the effective group limit. The durable parent continues to
hold its group children directly.

For each violated direct-child group, complete child visibility and effective
parent-scoped min/max bounds are inspected. Deficits fill stable source order
and excess trims reverse order. Root, child, group-choice, removal, and amount
commands pass the exact edited materialized choice so a direct group edit gets
New Recruit's priority. Missing child occurrences use the caller's existing ID
factory. Every change stays in the initiating immutable action.

Nested groups, unit-typed group children, conflicting child bounds, and
unsatisfiable visible-child capacity are source-located compatibility warnings
and produce no partial guessed repair. A missing ID factory preserves the
initiating edit and reports the parent/group/target. Generic nodes, projections,
provenance, and imported bytes remain shared by reference.

Ten complete no-op amount-command reconciliations on the pinned 41-selection
Guardian roster measured **1.3 ms total**, compared with **1.2 ms** before the
group scan.

### Tests and failure proof

The fictional catalogue now has one group whose external trigger raises min/max
from 0/1 to 2/2 and a second group whose selected child raises its minimum.
The focused test proves source-order fill, reverse-order trim, direct-choice
priority, effective child maxima, caller-generated identity, source-located
missing-ID reporting, absence of durable probe/group occurrences, and unchanged
prior sessions.

The full-corpus test pins all five owner IDs, filenames, names, direct child
counts, zero nested groups, and base bounds. The exact GSC integration adds Node
Organism [Crucible] and proves Specialisms selects Burrowing Claws
`0afb-d2ae-1373-773e` at amount one while no selection-entry-group occurrence
survives.

Disabling the group scan made the focused test fail on the first expected
source-order children. The implementation was restored and the test passed.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and
  `git diff --check` — pass.
- Normal `pnpm test` — **474 passed, 12 skipped (486 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — complete
  suite **486 passed**, including 12 corpus tests.
- Build retains only the existing Vite large-chunk warning.

### Remaining boundary

Take the **Override points limit?** configuration next. It uses an
`increment` modifier with `repeats`; inventory that exact projected shape,
measure its applicability and New Recruit result, and implement only the
smallest reusable repeat-evaluation behavior the evidence supports. Do not
generalize the 2,826 corpus repeats from one root configuration.

Automatic distribution through nested groups and automatic unit-typed
sub-units remain low priority because the five modifier-driven pinned groups
exercise neither. Shared-wrapper absent ordinary activation also remains
diagnosed and low priority. No catalogue resolution, cost calculation,
persistence, interchange, or UI behavior changed.

## Completed Assignment — Manual Points Override Evaluation, 2026-08-22

Baseline `cdfc155`; resulting implementation commit `6e6417a`
(`test: pin manual points override`).

### Existing boundary was already sufficient

The roadmap said the `Override points limit?` repeat was unsupported. That
conclusion was stale. The existing exact-count repeat evaluator already handles
the complete real shape: it queries the selection amount once, computes the
repetition count arithmetically, and scales the increment without expanding
iterations or roster nodes. No evaluator production code changed.

Generalizing all repeats was rejected because one configuration construct does
not establish semantics for the remaining corpus shapes. Folding conditional
`defaultAmount` into repeat evaluation was also rejected: constructing the
amounted child and consuming its amount are separate boundaries.

### Exact corpus and New Recruit evidence

At pinned wh40k-11e commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, the 46 files contain
2,826 repeats. Exactly one modifier targets force constraint
`a00c-6979-992f-046b`: Army Roster modifier `increment` with value 1,
repeated once per selection of `Points limit`
(`83ac-f5e5-d3da-5441`) in roster-recursive scope. Its flags are
`shared=true`, `roundUp=false`, `includeChildSelections=true`, and
`includeChildForces=true`.

The public New Recruit wiki renders the same source operation as
`increment max pts 1`, repeated for every one Points limit selection in the
roster recursively. Deployed New Recruit 35.66, build
`420bf6f1-2795-4c15-b21e-b789f9459b24`, applies source
`defaultAmount` modifiers before initializing one quantifiable occurrence at
the maximum of the effective default and minimum.

Corpus-wide there are eight `defaultAmount` modifier targets. Points limit is
the sole entry with `step="250"`; it has minimum selections 500, no static
default, and three conditionally applicable sets to 1,000, 2,000, or 3,000.
That initialization behavior remains the next boundary.

### Regression and failure proof

The optional pinned integration test builds a Death Guard Army Roster, adds
Battle Size and the override, creates one Points limit occurrence at 1,250,
edits its amount to 1,750, and proves the effective maximum, observed repeat
amount, repetition count, and applied increment all become exactly 1,750. It
also proves the prior roster is immutable and the durable tree still has only
one amounted child.

For the negative control, repeat calculation was temporarily forced to zero.
The new test failed with both the effective limit and repetitions receiving zero
instead of 1,750. The evaluator was restored byte-for-byte and the focused test
passed. Assertions intentionally compare compact semantic fields so a failure
does not dump the provenance-heavy report.

### Documentation and verification

`docs/architecture.md`, `docs/compatibility.md`, and
`docs/data-model-notes.md` now separate complete repeat consumption from
incomplete default-amount initialization. No diagnostic, generic projection,
source-byte, provenance, catalogue-resolution, cost, persistence, or UI
boundary changed.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and
  `git diff --check` — pass.
- Normal `pnpm test` — **474 passed, 13 skipped (487 total)**.
- Pinned corpus `54c189f4fd01878351fab05586d3b38d9c7f6ddc` — complete
  suite **487 passed**, including 13 corpus tests.
- Build retains only the existing Vite large-chunk warning.

### Remaining boundary

Take **conditional `defaultAmount` and quantifiable initialization** next.
Preserve the evaluator's constant-time repeat behavior. Determine the smallest
immutable initialization/command representation that creates one Points limit
occurrence at its effective default or minimum, then prove the Incursion and
manual-override paths against the pin. Do not reinterpret the other seven
`defaultAmount` targets or comma-delimited defaults without measuring their
entry types and New Recruit branches first.

## Completed Assignment — Stepped Default Amounts, 2026-08-23

Baseline `ae86af4`; resulting implementation commit `e6abd44`.

**Written by a later session than the one that wrote the code.** The
implementing session committed `e6abd44` and then ran out of usage before it
could write this entry, update the status block, or push. The commit itself was
complete: 16 files, tests, and updates to `architecture`, `compatibility`,
`diagnostics`, and `data-model-notes`.

What that means for this entry: the reasoning below is **transcribed** from
`docs/compatibility.md` and the module comments *inside that commit*, not
reconstructed. What I did myself was verify it — see "Verification by a second
pair of eyes". Where the implementing session's usual failure-proof note would
go, I have said what I could and could not confirm rather than assume it.

### What it does

`packages/evaluation/src/selection-default-amount.ts` evaluates
condition-aware **direct** numeric modifiers targeting a selected entry's
`defaultAmount`, against a temporary prospective child at its real parent. The
web command then creates exactly one durable child at the greater of the minimum
and the effective default, and leaves the amount editable.

The initialization planner has no roster context, so this supplies the
condition-aware half at the command boundary without mutating projections,
generic source nodes, or roster occurrences.

### Exact corpus figures

At the pinned commit `54c189f4fd01878351fab05586d3b38d9c7f6ddc`:

| | |
|---|---|
| Source `defaultAmount` properties | **96** |
| — single numbers | 89 |
| — comma-delimited sub-unit defaults | 7 |
| Modifiers targeting `defaultAmount` | **8** |
| — direct | 7 |
| — through a modifier group | 1 |
| Entries carrying `step` | **1** (`Points limit`, `step="250"`) |

`Points limit` has `min selections=500`, no static `defaultAmount`, and three
conditionally applicable `set defaultAmount` modifiers for 1,000, 2,000, and
3,000. A pinned Incursion test initializes 1,000 automatically and proves an
edit to 1,750 still drives the exact repeat and force limit.

### What it deliberately is not

Not general quantifiable-entry initialization. Only the sole stepped entry uses
the new command path. Three things stay unsupported, each for a stated reason:

- **Comma-delimited defaults** (7 instances). New Recruit uses them to
  initialize multiple sub-unit instances, which RosterForge does not model.
- **Grouped default-amount modifiers** (1 instance). Withheld until their
  ordering is pinned, rather than guessed.
- **Collapsing ordinary occurrences into one amounted node.** Deferred, and the
  reason is worth keeping: nested child costs currently belong to each
  occurrence and are not multiplied by an ancestor amount, so changing the
  representation first could **undercount wargear**. Ordinary entries still use
  occurrence multiplicity.

Invalid or unsupported stepped values stay source-located and fall back
conservatively instead of inventing a default. New diagnostics:
`EVALUATION_INITIALIZATION_STEP_INVALID`,
`EVALUATION_INITIALIZATION_DEFAULT_AMOUNT_INVALID`,
`EVALUATION_INITIALIZATION_DEFAULT_AMOUNT_MULTIPLE_UNSUPPORTED`, and
`EVALUATION_SELECTION_DEFAULT_AMOUNT_MODIFIER_GROUP_UNSUPPORTED`.

### Verification by a second pair of eyes

Everything below I ran myself against `e6abd44`, before pushing someone else's
commit:

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **481 passed, 13 skipped (494 total)**.
- Pinned corpus with `ROSTERFORGE_BSDATA_JSON_DIR=E:/GitHub/wh40k-11e` —
  **494 passed (48 files)**.
- **The new tests have teeth.** I replaced the `defaultAmount` modifier filter
  with an empty list, which makes the evaluator ignore every conditional
  default. Three tests failed across `selection-default-amount.test.ts` and
  `roster-session.test.ts`. Restored, 19 passed. Worth doing before publishing
  work you did not write.

I did **not** verify the deployed New Recruit observation the compatibility doc
cites, nor re-derive the corpus counts. Both are the implementing session's, and
both are consistent with the entry before this one.

### This closes the last actionable roadmap item

With this marked Done, nothing in the roadmap is `Next`. What remains is
deliberate:

- `multiply`/`divide`/`modulo` — zero corpus instances; a speculative rule is
  explicitly unwanted.
- Withheld routing vs withheld steps — no corpus modifier reaches the path.
- Category filter naming a non-immune category — Blocked by design.
- Sections C and D's remainder — low priority or deferred by owner decision.

The three unsupported shapes above are now rows in section B so they are not
lost, but none is obviously the next thing to do. **Choosing the next milestone
is an owner question**, and it is recorded under "Open questions needing the
owner" rather than guessed at here.

### Next recommended boundary

Ask Stone what the next milestone is before starting one. If a technical answer
is needed anyway, in order of corpus support:

1. **Grouped default-amount modifier ordering** — one instance, the smallest
   remaining real gap, and needs its semantics pinned first (wiki or an
   observation, not inference).
2. **Comma-delimited defaults** — seven instances, but needs sub-unit modelling
   the product does not have.
3. **Collapsing ordinary occurrences** — largest, and blocked behind the cost
   representation question above. Read that reason before attempting it.

## Research Note — Driving The App, 2026-08-23

No code change. Stone asked whether RosterForge can build a real 40k list yet.
The roadmap said sections A, B, D, and E were complete, which measures coverage
of the BattleScribe format — not whether the product works. So I ran it.

### Method

`pnpm dev`, plus a throwaway static server for the pinned corpus so the page
could fetch the 46 JSON files and hand them to the real file input. Everything
below went through the actual UI.

### It builds a list

Imported all 46 files (64.4 MB, 36 roster catalogues), selected Chaos - Death
Guard, created an Army Roster, chose the Virulent Vectorium detachment, Strike
Force (2000), and Take and Hold, then added units. Points accumulated, the
points limit applied on choosing a battle size, and adding Plague Marines
auto-populated a Plague Champion plus four marines with default loadouts —
boltgun, plague knives — with special-weapon swaps offered. Undo, redo, save
draft, and print are all present and wired.

That is a working roster builder, not a parser with a UI bolted on.

### One genuine blocker, and one thing that was my mistake

**The blocker.** The Plague Champion has a `Wargear` group requiring 2 of 2
that reports **"No resolved entries are available in this group."** There is
nothing to pick, so the roster cannot reach a valid structural state. It is now
a roadmap row.

**The near-miss.** `Force Disposition` showed the same message and I nearly
recorded it as the same defect. It was not: with only the game system and Death
Guard loaded it had no resolvable entries, and with all 46 files it offers
"Take and Hold". That one was a missing dependency — mine, not the app's. The
Wargear group survives the same test, which is what makes it real.

Same lesson as the corpus work: two identical symptoms, different causes, and
the only way to tell was to change one variable.

### What this does not tell us

- Whether the points are *right*. They accumulate and the limit binds, but I
  did not check a single unit's cost against the codex. Worth a pinned test
  against a known list.
- Anything about a phone. The layout was driven at desktop width only.
- Whether a finished list is usable at a table. Print exists; nobody has taken
  its output to a game.

### Why the roadmap said "complete"

Because it was written outward from the data format, and by that measure it was
telling the truth. "Can Stone build a list he would actually take to a game" was
never one of its rows. That gap is the thing worth fixing about the roadmap, not
just about the code.

## Research Note — The Dark Angels List, 2026-08-23

No code change. Stone supplied a **1,900-point Dark Angels list exported from
Games Workshop's own army builder** (App v2.4.0, Data Version v925) as an
oracle, and asked what testing against it would uncover. It uncovered the
biggest defect found in this project so far, and cleared the cost evaluator of
suspicion at the same time.

### Costs are right. All sixteen units.

Built the list headlessly against the pinned corpus, adding each unit to a Dark
Angels Army Roster and comparing the points delta with GW's figure.

Thirteen matched exactly: Azrael 140, Judiciar 55, Librarian in Terminator
Armour 75, Assault Intercessor Squad 75, Intercessor Squad 80, Ballistus
Dreadnought 150, Bladeguard Veteran Squad 80, Deathwing Knights 240, Eradicator
Squad 90, Outrider Squad 70, Scout Squad 65, Sternguard Veteran Squad 100,
Terminator Squad 160.

The three that did not match are **not evaluator defects**, and checking that
mattered more than the headline number:

| Unit | GW | RosterForge | Why |
|---|---|---|---|
| Inner Circle Companions | 160 | 80 | I added the 3-model default; the list has 6. The data says 80 for three |
| Lion El'Jonson | 265 | 285 | **The corpus says 285.** Community data disagrees with GW |
| Lieutenant with Combi-weapon | 95 | 85 | **The corpus says 85.** Same |

Both discrepancies were confirmed by reading the source JSON directly, not by
trusting the app. So: **the pinned BSData commit is out of step with GW Data
Version v925 on at least two Dark Angels units.** RosterForge reported the data
it was given, faithfully. Worth knowing before anyone files a costing bug — and
worth telling a user, since a list that is legal here could be 20 points wrong
at a tournament.

A fourth apparent failure, `Lion El’Jonson` "NOT FOUND", was my own bug: the GW
export uses U+2019 and the catalogue uses U+0027. Any future import or
list-matching feature needs Unicode normalisation, and that is now known cheaply
rather than during an import checkpoint.

### The blocker: evaluation does not scale

Driving the app in a browser, adding the first five characters locked the tab.
`document.querySelectorAll("*")` timed out at 30 s while trivial JS returned
instantly — a blocked main thread, not slow layout. Measured headlessly:

| Units | Selections | `evaluateLocalRosterCosts` | `inspectLocalRosterSupportedValidation` |
|---|---|---|---|
| 1 | 9 | 74 ms | **3.8 s** |
| 2 | 12 | 65 ms | **41 s** |
| 3 | 15 | 65 ms | **77 s** |
| 4 | 18 | 68 ms | **113 s** |
| 5 | 34 | 4,526 ms | **118 s** |
| 6 | 39 | 5,152 ms | **127 s** |

The workspace runs both on **every edit**. At four units an edit costs roughly
two minutes. The sixteen-unit list this note is named after cannot be built in
the UI at all — I only completed it headlessly by never calling validation.

Note the shape. Validation is already 3.8 s at *one* unit, and roughly ten times
worse by two. Cost evaluation stays flat until squads with children arrive at
unit five, then jumps seventy-fold. Neither looks like a constant factor;
both look like repeated whole-catalogue work per selection. `affects-routing.ts`
and `selection-context.ts` rebuild indexes per call, and
`restoreLocalRosterSession` was already measured at a flat 19 ms of
whole-catalogue indexing per call for exactly that reason — the same shape,
found again somewhere hotter.

### Why nothing caught this

Every existing measurement was of a **write**, never of an **evaluation**. The
draft-byte and undo-history checkpoints both asked "what does one store write
cost?" and got good answers. Nobody asked what one *edit* costs, and the test
suite builds rosters of four to ninety-nine selections without ever timing the
evaluators. The pinned corpus suite takes 83 s for 48 files and that was read as
thoroughness rather than as a signal.

### Recommended next boundary

1. **Profile and fix evaluation scaling.** Nothing else in the product matters
   until an edit is cheap. Start by timing `inspectLocalRosterSupportedValidation`
   against selection count, then look for per-selection whole-catalogue index
   rebuilds — the shared-context fix in `restoreLocalRosterSessions` is the
   pattern that already worked once.
2. **Add a performance gate.** A test that fails when a representative roster
   exceeds a budget per edit. Without one this regresses silently, exactly as it
   did here.
3. The unfillable wargear group, once edits are usable enough to explore it.

## Completed Assignment — Evaluation Performance, 2026-08-23

Baseline `e604ab3`; resulting implementation commit `b056e3f`.

The blocker the Dark Angels list exposed. **Validating a six-unit roster took
127 seconds; it now takes 26 milliseconds.**

### The defect

`indexEvaluationChoices` walks every root the catalogue materializes and every
descendant of each. Eight modules ask for it, several per selection and per
field, and it was rebuilt on every call. Nothing about the caller's roster
changes the result.

Instrumented against a Dark Angels roster holding **one** unit: a single
`inspectLocalRosterStructuralStatus` rebuilt the index **23 times** and visited
**2,844,203 nodes**.

### How it was found

Profiling, not guessing. Splitting validation into halves put 35 s of a 41 s
call in `inspectLocalRosterStructuralStatus`, and `node --cpu-prof` put 22.7% of
all samples in `visit :: selection-context.js` with another 8.1% in
`rosterDefinitionKeyForSource` — the index build and the key construction inside
it. The call count came from temporarily instrumenting the built `dist`, which
is quicker than threading a counter through the source and leaves nothing
behind.

### The fix

A `WeakMap<BattleScribeCatalogueContext, EvaluationChoiceIndex>`. The context is
an immutable projection and the index is a pure function of it, so a cached one
cannot go stale. `WeakMap` rather than `Map` so a discarded context — a
different catalogue selected, a batch re-imported — takes its index with it
instead of pinning the whole materialized tree for the session.

Checked before caching: `EvaluationChoiceIndex` is a `ReadonlyMap` and nothing
outside the builder does more than `.get`, so sharing one instance is safe.

### Measured, at six units

| | Before | After |
|---|---|---|
| Structural inspection | 35,078 ms | **79 ms** |
| Constraint inspection | 6,589 ms | **79 ms** |
| Supported validation | 127,332 ms | **26 ms** |
| Cost evaluation | 5,152 ms | **8 ms** |

The full fifteen-unit list validates in **60 ms**, and growth is now linear in
selection count. In the browser that same army builds with edits of
**107–409 ms**; before this, adding five characters locked the tab so hard that
`document.querySelectorAll("*")` timed out.

**Points are unchanged.** All sixteen units evaluate exactly as before, which
was re-checked against the GW export rather than assumed — a cache that changed
an answer would be worse than the slowness.

### The signal nobody read

The pinned corpus suite dropped from **83 s to 10 s**. That number was visible
on every run for weeks and was read as thoroughness. A suite that slow *because
of a defect* looks exactly like a suite that slow because it is careful.

### The guard

`selection-context.test.ts` asserts the same context returns the same index
object. Identity, not wall clock: a timing budget on a synthetic fixture small
enough to run everywhere would have to be so loose it would never fail, and
would be flaky when it did. Removing the cache fails it immediately, which was
verified by removing it.

One trap worth recording: the first draft asserted `expect(indexA).not.toBe(indexB)`
on two real indexes, and a *failing* run spent **21 seconds** serialising the
materialized tree for the diff. Compare these as booleans and sizes.

### What is left

Per-edit cost still grows with roster size — 107 ms at one unit to 409 ms at
fifteen. Usable, not yet good. `rosterSelectionLocations` and the roster-session
choice index are rebuilt per call in the same shape the fixed one was, and are
the obvious next candidates. That is now section F's `Next`, not a blocker.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **483 passed, 13 skipped (496 total)**, two added.
- Pinned corpus — **496 passed**, in 10 s rather than 83 s.
- The Dark Angels list rebuilt in the browser end to end after the change.

### Next recommended boundary

1. **Per-edit cost.** Profile again at fifteen units and look for the same
   rebuild-per-call shape in `rosterSelectionLocations` and
   `indexSelectionChoices`.
2. **Unfillable required wargear group** — now explorable, since edits are cheap.
3. **A budget test that runs in CI.** The identity guard catches this specific
   regression; nothing yet catches a different one.

## Completed Assignment — Per-Edit Evaluation Cost, 2026-08-23

Baseline `cb998e6`; resulting implementation commit `9902109`.

The second layer of the defect the Dark Angels list exposed, and the point at
which the bottleneck stops being this package.

### Two more of the same shape

Profiling the structural inspection at fifteen units put 10.4% of samples in
`evaluationSelectionIdentityCandidate` and another 17.7% in garbage collection.
Counting the calls, per **single** structural pass over a 143-selection army:

| Function | Calls per pass | What each does |
|---|---|---|
| `rosterSelectionLocations` | **2,763** | re-walks all 143 selections |
| `selectionChoiceIdentityIds` | **28,780** | allocates four arrays and a `Set` |

Both are pure functions of immutable data, both now `WeakMap`-cached. A roster
is immutable and every command returns a new one, so a cached walk cannot
describe a stale tree — an edited roster is a different key, which is exactly
the property the unsaved-change indicator already depends on.

### Measured, at fifteen units

| | Before | After |
|---|---|---|
| Structural inspection | 56.7 ms | **35.3 ms** |
| Constraint inspection | 24.0 ms | **18.5 ms** |
| Supported validation | 68.8 ms | **49.7 ms** |

Points unchanged: the Dark Angels list still totals 1,545 with the same
per-unit figures, re-checked rather than assumed.

### The finding that matters more than the numbers

In the browser the same army now builds at **69–361 ms per edit**, against
107–409 before. That is a much smaller gain than the headless numbers suggest,
and the reason is the useful part: **evaluation is only about 50 ms of that 361.
The rest is React re-rendering the workspace.**

So per-edit cost has stopped being an evaluation problem. Continuing to cache
inside `evaluation` would now be optimising the wrong half. Section F's `Next`
is the render path — memoised components, and probably virtualising the
catalogue browser, which renders 294 add-buttons for Dark Angels.

### Where the evaluator still spends its time

For whoever does come back to it, from the clean profile after this change
(100 structural passes, import excluded):

- `evaluationSelectionIdentityCandidate` — 10.4%. Still the largest. Memoising
  it needs a composite key over six arguments, which is why it was left.
- `evaluateRosterCondition` — 4.3%
- `rosterDefinitionKeyForSource` — 4.1%, a `JSON.stringify` per call
- `selectionsInTree` — 3.5%, another repeated tree walk
- Garbage collection — 13.1%, down from 17.7%

### What is guarded, and what is not

The roster walk is guarded by identity in `selection-context.test.ts`, verified
by removing the cache and watching it fail. The identity-ID cache is internal
and is **not** guarded: exporting it purely to assert on it would widen the
package's surface for a test, and the roster-walk guard already fails if the
caching pattern is removed wholesale. Recorded here rather than left implicit.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **485 passed, 13 skipped (498 total)**, two added.
- Pinned corpus — **498 passed** in 10.6 s.
- The Dark Angels army rebuilt in the browser end to end, 1,545 pts.

### Next recommended boundary

1. **Per-edit render cost** — section F. Profile the React commit, not the
   evaluator. The catalogue browser renders 294 add-buttons.
2. **Unfillable required wargear group** — now cheap to explore.
3. **Warn when community data disagrees with GW points** — two known cases.

## Completed Assignment — Render Path, And A Correction, 2026-08-23

Baseline `d1bb2c9`; resulting implementation commit `6282796`.

### The correction first

The previous entry concluded that per-edit cost was "dominated by React
rendering, not this evaluator". **That was wrong**, and this checkpoint is
mostly the story of finding out.

Cutting the workspace DOM by two thirds barely moved edit time. The measurement
that settled it: **toggling a details panel re-renders in 3 ms**, while adding a
unit is a single **341 ms long task** — and **undo, which adds nothing at all,
costs about the same**. Rendering is cheap. The cost is that every edit
re-evaluates the entire roster.

I had inferred "it must be rendering" from the gap between headless evaluation
(~120 ms) and browser edits (~360 ms), without measuring rendering directly.
The gap is mostly that browser JS is slower than Node on this work, not that
rendering fills it.

### What was still worth doing

Three real defects, found while chasing the wrong theory:

- **A closed `<details>` still builds its contents.** The browser only hides
  them. On a fifteen-unit Dark Angels army **181 of 214 were closed**, and React
  rebuilt every one on every edit. The per-selection details panel and collapsed
  child lists now render only while open: **17,505 DOM nodes → 5,700**.
- **`RosterOverview` called `evaluateLocalRosterCosts` and
  `inspectLocalRosterSupportedValidation` unmemoised in its body.** That
  component re-renders for reasons unrelated to the roster — an autosave moving
  the draft action from `saving` back to `idle` is enough — and each of those
  paid a full re-evaluation of the army. Both are now keyed on the session.
- **`<details>` open state is now controlled explicitly.** jsdom does not
  implement `<details>` toggling at all, so a lazily rendered panel would have
  been permanently shut under test while working fine in a browser. The existing
  UI tests were reaching content that happened to be mounted regardless; they
  now genuinely exercise the toggle.

Edit tail on the same army: **~379 ms → ~258 ms**. Points unchanged at 1,545.

### What per-edit cost actually needs

Incremental evaluation. Today an edit anywhere re-evaluates every selection,
because a modifier anywhere can in principle affect anything. Making that cheap
means establishing what an edit *can* have affected and re-evaluating only
that — an architectural change, not another cache, and worth its own research
checkpoint rather than being bolted on.

Two smaller things would help first and are much cheaper:

- **Do not block the click.** Move the evaluation into a transition so the
  roster updates immediately and the reports catch up. 250 ms of work that does
  not freeze the button is a different experience from 250 ms that does.
- **Undo and redo restore a roster that was already evaluated.** Caching the
  top-level reports by roster identity would make stepping through history
  free. The roster objects are the same ones, so the keys already exist.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **485 passed, 13 skipped (498 total)**, unchanged.
- Pinned corpus — **498 passed**.
- The Dark Angels army rebuilt in the browser, 5,700 DOM nodes, edits 71–270 ms.

### Next recommended boundary

1. **Non-blocking evaluation**, then **cached history steps** — both small, both
   improve the felt experience without touching evaluator architecture.
2. **Incremental evaluation** — the real fix, and a research checkpoint.
3. **Unfillable required wargear group** — still open, still cheap to explore.

## Completed Assignment — History Step Cost, 2026-08-23

Baseline `0804214`; resulting implementation commit — see `git log`.

The first of the two cheap wins the previous entry listed. Undo and redo restore
a session object the history already held, so the roster they display was
evaluated once already. Both whole-roster reports are pure functions of the
session's roster and catalogue context, and a session is immutable, so caching
them per session cannot show a stale answer.

| | Before | After |
|---|---|---|
| Undo | 308 ms | **73–86 ms** |
| Redo | — | **95–104 ms** |
| Edits | 71–270 ms | 58–270 ms, **median ~92 ms** |

What remains on a history step is the workspace re-render, which is consistent
with the 3 ms measured for a single subtree.

### Why the other cheap win was not taken

The previous entry also suggested moving evaluation into a transition so the
click never blocks. At a median of 92 ms that is no longer worth its cost. It
would mean showing a **stale points total** for a moment after each edit, and
this product's whole contract is that it does not report something misleading —
`valid` + `incomplete` exists precisely so a partial answer is never dressed up
as a complete one. A lagging total would need to be visibly marked as
updating, which is a design decision rather than a performance one, and it can
wait until per-edit cost is actually a complaint.

### Where performance now stands

From 127 seconds to validate six units, at the start of the day, to a median
92 ms edit and 73 ms undo on a full fifteen-unit army. The remaining
whole-roster re-evaluation per new edit is recorded as Open rather than Next:
incremental evaluation is a real architectural change and nothing currently
justifies it.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **485 passed, 13 skipped (498 total)**.
- Pinned corpus — **498 passed**.
- Measured in the browser on the Dark Angels army; points still 1,545.

### Next recommended boundary

**The unfillable wargear group.** It is a correctness blocker — the Death Guard
Plague Champion has a `Wargear` group requiring 2 of 2 with no resolvable
entries, so that list can never reach a valid structural state — and it is now
cheap to explore interactively.

## Completed Assignment — Nested Group Bounds, 2026-08-23

Baseline `136ae74`; resulting implementation commit `6015f4f`.

The correctness blocker found by driving the app. It was neither unfillable nor
a data defect, and I nearly recorded it as both.

### Three readings, two of them wrong

1. **"No resolvable entries — a RosterForge gap."** What the UI said, and what
   the roadmap recorded.
2. **"An empty group requiring 2 — a defect in the community data."** What the
   first look at the JSON suggested: `selectionEntries: []`, `entryLinks: []`,
   `constraints: min 2, max 2`. The group ID appears exactly once in all 46
   files, so nothing could ever populate it. I was ready to file this against
   BSData.
3. **The truth.** Dumping every key rather than the two I expected showed
   `selectionEntryGroups: ["Plague knives options", "Boltgun options"]`. The
   group is not empty. It holds *groups*, and its bound counts what is chosen
   beneath it.

The lesson is narrow and worth keeping: **printing the fields you expect will
confirm the theory you already have.** Two of the three keys I checked were
empty, which was all the evidence I thought I needed.

### The rule, and the corpus evidence for it

Of **4,301** selection-entry groups in the pinned corpus, **85** contain only
nested groups and **10** of those carry a bound of their own, across 8
catalogues. Every one reads as a total over its descendants:

| Owner | Group | Bound | Nested |
|---|---|---|---|
| Plague Champion | Wargear | 2 of 2 | two 1-of-1 groups |
| Wolf Scout Pack Leader | Loadout | 2 of 2 | three groups, maxima summing to 4 |
| Oathsworn Campaigns | A Noble Undertaking | max 1 | five unbounded groups |
| Logistics Points | Assigning Logistics | 4 of 4 | four 1-of-1 groups |

The last two settle it. A bound of 2 over sub-groups permitting 4, and a bound
of 1 over groups with no bounds at all, are meaningless unless the parent counts
totals.

### What changed

`RosterSelectionChoiceGroupInspection` gains `countedChoices` — every entry
beneath the group, nested groups included — and the structural bound counts
membership against that instead of `choices`.

`choices` deliberately stays direct. The nested groups are inspected and
rendered in their own right, so folding their entries into the parent would
offer every option twice.

### Proven end to end

Before: `Wargear selected=0 min=2 max=2 violated`, with no way for the user to
change it. After: `selected=1` with the default boltgun, and `selected=2
satisfied` once a plague knives option is chosen. **A Death Guard list can now
reach a valid structural state.**

Guarded twice, both verified by breaking the fix and watching them fail:

- `nested-group-bound.cat`, a synthetic fixture mirroring the 2-of-2-over-two-
  1-of-1s shape, asserting `countedChoices` holds the nested entries while
  `choices` stays empty.
- A pinned corpus test that builds the real Plague Marines squad, checks the
  bound reads 1 of 2, chooses a knives option, and checks it closes.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **486 passed, 14 skipped (500 total)**.
- Pinned corpus — **500 passed**.
- `docs/compatibility.md` gained a "Nested Group Bounds" section.

### Next recommended boundary

**Dark Angels `Force Disposition`.** It still reports nothing selectable with
all 46 files loaded, while the Death Guard one resolves. It is *not* the nested
group shape — that was checked — so it needs its own look, and it blocks a Dark
Angels list the same way this blocked a Death Guard one.

## Completed Assignment — Force Disposition Is Not A Defect, 2026-08-23

Baseline `3505b7d`; resulting implementation commit — see `git log`.

### The third one

Dark Angels `Force Disposition` reported "No resolved entries are available in
this group", the same words as the wargear blocker. The roadmap listed it as the
next correctness defect. It is **not a defect**.

The group is conditional on the detachment. Checked in both factions:

| Catalogue | Before a detachment | After |
|---|---|---|
| Dark Angels | nothing | **Priority Assets** |
| Death Guard | nothing | **Reconnaissance** |

Priority Assets is exactly what Stone's Games Workshop export lists. My earlier
reading came from inspecting the slot *before* choosing a detachment in one
faction and *after* in the other, and concluding the catalogues differed.

That is three times in one day that "no resolvable entries" had a different
cause: a missing dependency, a nested-group bound, and now an order of
operations. The symptom is nearly useless as a diagnosis.

### What was worth changing

The message. "No resolved entries are available in this group" describes a
broken catalogue; "nothing yet, because of a choice you have not made" describes
a roster. A child choice group now carries `hiddenChoiceCount`, and the
workspace says which case it is.

This is the same principle as the validity/completeness contract: do not report
something in a way that implies more than is known.

### Pinned

The corpus suite now builds a Dark Angels roster, asserts the slot offers
nothing while its entries are hidden, chooses the Inner Circle Task Force, and
asserts it then offers exactly `Priority Assets`. Pinned specifically so this is
not investigated a third time.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **486 passed, 15 skipped (501 total)**.
- Pinned corpus — **501 passed**.

### Next recommended boundary

**Warn when the pinned data disagrees with Games Workshop.** The corpus says
Lion El'Jonson is 285 and the Lieutenant with Combi-weapon 85; GW Data Version
v925 says 265 and 95. A list that looks legal here can be twenty points wrong at
a table, and nothing tells the user. That is now the largest honesty gap in the
product, and this project's whole contract is about not being misleading.

Needs an owner decision on *how*: the app cannot know GW's numbers, so the
options are surfacing the data revision, letting a user record a correction, or
simply stating that points come from community data. Worth asking rather than
guessing.

## Completed Assignment — Re-Pinning The Corpus, 2026-08-23

Baseline `824667c`; resulting implementation commit — see `git log`.

Stone updated `E:\GitHub\wh40k-11e` to pick up Games Workshop's points
adjustments. That moved the pinned corpus **298 commits**, changing 41 of 46
files by +83,012/-23,687 lines, and invalidated a large part of the pinned
measurement suite. `AGENTS.md` forbids silently measuring a moving branch, so
this is the re-pin.

`54c189f4fd01878351fab05586d3b38d9c7f6ddc` →
`04c62fcd041b3808c39d5c46fd677c704027b979`.

### The headline: both points discrepancies vanished

The Dark Angels list found two disagreements with GW. Both are gone:

| Unit | GW | Old corpus | New corpus |
|---|---|---|---|
| Lion El'Jonson | 265 | 285 | **265** |
| Lieutenant with Combi-weapon | 95 | 85 | **95** |

So the diagnosis held: **RosterForge read the data faithfully and the data was
stale.** The remaining Inner Circle Companions difference is still the 3-model
default against a 6-model list entry, which is correct.

That reframes the roadmap item. The gap is not correctness, it is **freshness**,
and the owner has asked for that to be surfaced — see the new section F row.

### How the re-pin was done

Not by fitting numbers to output. The largest single change, identity condition
scopes going `self: 72 → 1,840`, was **independently recounted straight from the
JSON** with a script that mirrors the test helper, and matched the app exactly:
`{parent: 1083, self: 1840, localConditionGroupsSelf: 374}`. Six related counts
in a second summary all moved to 374 together, which is the internal consistency
you want before believing a jump like that.

Three assertions were **relaxed rather than renumbered**, because they had
pinned more than they meant to:

- `routed.every(declaredBy === "anchor-furnace")` → `some`. The point is that a
  childless sibling enhancement reaches the weapon by standing on the model its
  scope names. Whether anything *else* also routes there is the catalogue's
  business, and at this revision the Lord of Contagion gained its own.
- The Keywords step list, same reason.
- The Guardian Defenders incomplete-constraint list, now `arrayContaining`.

### Two real gaps the fresh data exposed

**`skipIfPresent` — 359 modifiers across 20 files.** The Lord of Contagion now
carries two grouped `affects` appends with this attribute. It is unsupported, an
unapplied step clears the value, and so **the pinned Manreaper's Keywords went
from resolved to blank**. That is a genuine display regression caused by data,
not by code, and it is the largest single display gap in the product. The values
are the appended keyword strings themselves — `skipIfPresent="Lethal Hits"` on an
append of "Lethal Hits" — which reads as deduplication, but that is inference and
needs the wiki or an observation before anything is written.

**Constraint `value="-1"` — 48 instances**, up from 26: 43 `max`, 5 `min`. One
now sits on the Aeldari `Detachments` group, so that path reports
`EVALUATION_INITIALIZATION_CONSTRAINT_UNSUPPORTED` and stays incomplete. Almost
certainly "no limit", still withheld rather than guessed.

Both are now roadmap rows with their counts.

### Also worth knowing

- Missing references **improved**: `BS_GRAPH_MISSING_REFERENCE` 60 → 34, and
  occurrences 147 → 114. The data got cleaner as well as newer.
- The Aeldari Force Disposition option was renamed `Purge the Foe` →
  `Reconnaissance`.
- Historical entries in this file still cite the old hash **on purpose**. They
  record what was true when written; only the status block tracks the current
  revision.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **486 passed, 15 skipped (501 total)**.
- Pinned corpus at the new revision — **501 passed**.

### Next recommended boundary

**Surface how current the loaded data is** (owner-requested). Identify the game
system and files in play, then report when they last changed upstream in
<https://github.com/BSData>, falling back to a plain "this data may be out of
date" note when the app cannot reach GitHub. The owner also wants direct loading
from that repository eventually; that is a larger feature and can wait.

## Completed Assignment — Catalogue Data Freshness, 2026-08-23

Baseline `46f8115`; resulting implementation commit `7b6ea64`.

Owner-requested, and the direct answer to the honesty gap the Dark Angels list
opened. Updating the corpus silently corrected two units this app had been
reporting twenty points out, and nothing in the interface suggested the data
might be behind.

### What it says

The catalogue library panel now reports when the batch was imported next to when
`BSData/wh40k-11e` last changed upstream:

> Imported Aug 23, 2026, 3:13 PM. BSData/wh40k-11e was last updated Aug 23,
> 2026, 4:47 AM, so this import is current.

When upstream is newer it says **newer catalogue data is available**, and notes
that points can change between releases. Both states are marked in the DOM
(`data-freshness`) and styled as a notice rather than an alarm.

### When it cannot tell

The fallback Stone asked for. Offline, rate-limited, and blocked are
indistinguishable from the browser and the honest sentence is the same either
way: the data comes from the community BSData project and **may be out of
date**, because RosterForge could not reach GitHub to check. It never implies
the data is current.

### Two deliberate limits

- **Repository-wide, not per file.** One request reading `pushed_at`. Per-file
  times would be exact but cost a request each, and 46 catalogue files would
  exhaust an unauthenticated hourly allowance of 60 in a single check. Recorded
  as a roadmap row rather than pretended away.
- **It does not claim provenance.** It reports when the upstream repository last
  changed, not that the loaded files came from it. Files chosen from disk may be
  older, newer, or from somewhere else. Saying more than that would be the exact
  kind of confident-but-wrong statement this project keeps avoiding.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **492 passed, 15 skipped (507 total)**, six added: three in
  `pinned-github.test.ts` for the request, the network failure, and metadata
  with no usable time; three in `catalogue-library-panel.test.tsx` for the
  current, stale, and unreachable messages.
- Pinned corpus — **507 passed**.
- Verified against the **live GitHub API** in the browser, which reported the
  import as current against a repository last pushed to that morning — matching
  the commit timestamp in Stone's local clone.

### Next recommended boundary

**`skipIfPresent`.** 359 modifiers across 20 files, and it currently withholds
printed values — the pinned Manreaper's Keywords are blank because of it. The
values are the appended keyword strings themselves, which reads as
deduplication, but that is inference: pin it against the New Recruit wiki or an
observation before writing a rule. This is now the largest display gap.

## Completed Assignment — Ancestor Scope For Prospective Children, 2026-08-23

Baseline `c523777`; resulting implementation commit `2422bdc`.

Stone had an external model do a QA pass and build real lists. It found four
genuine bugs, one wrong diagnosis, and one repeat of a trap this project has
now fallen into three times. This entry is the worst of the real ones.

### The bug

**Every detachment enhancement was permanently hidden**, which blocks the whole
enhancement game.

Visibility is asked about entries that are *not in the roster yet* — "would this
enhancement be offered on this character" — so the nearest thing that exists,
the parent, is passed as the condition owner. That silently shifts every
relative scope up one link. `ancestor` is where it shows: an enhancement's
ancestors include its bearer, but the bearer's own ancestors do not, and a
top-level character has none at all.

So the gate resolved against an **empty chain**, every `notInstanceOf` faction
condition fired, and nothing was ever offered. The corpus has **2,635**
ancestor-scoped conditions — the fourth most common scope — and 2,633 of them
are `instanceOf`/`notInstanceOf` on `selections`, exactly this shape. A reading
that makes a whole population inert is usually the wrong reading, and this is
the third time that heuristic has paid.

### The fix, and its deliberate narrowness

Conditions take a `prospectiveChild` option, forwarded from visibility through
modifier and modifier-group applicability. When set, `ancestor` includes the
owner.

**Only `ancestor` is corrected.** `self` and `parent` carry the same off-by-one
in principle, but nothing measured shows them misbehaving, and widening a fix
past its evidence is how a fix becomes a regression.

### Proof it still gates

The risk with "make the hidden thing visible" is making everything visible. On a
Death Guard Lord of Contagion:

| Detachment | Enhancements offered |
|---|---|
| Virulent Vectorium | **4** — Daemon Weapon of Nurgle, Furnace of Plagues, Revolting Regeneration, Arch Contaminator |
| Shamblerot Vectorium | **2** — different ones |
| Flyblown Host | 0 |
| *(none chosen)* | **0** |

Four per detachment is the 10th/11th edition pattern, and 22 of the 26 stay
hidden. Pinned in the corpus suite; a unit guard on the scope resolver fails
when the owner is dropped again, verified by dropping it.

### The QA pass, assessed

Worth recording what was and was not real, because the ratio matters:

- **True.** Enhancements hidden (this entry). Allied `importRoot` config
  auto-inserting — an empty Dark Angels roster initialises `Code Chivalric`,
  which is Imperial Knights configuration. The `NOTICE` deprecation string
  offered as an addable unit. And the browse pin still on the old revision,
  which was **my miss** during the re-pin: the app's own source was never
  updated, so Browse would have fetched the revision that was twenty points
  wrong while the freshness banner said "current". Fixed in `c523777`.
- **False.** "Extra models on Inner Circle Companions charged full unit cost."
  Measured: 3 models 80 pts, 4/5/6 models 160 pts — exactly the catalogue's
  `set 160` when `selections > 3`, and exactly GW's 160 for six. The reported
  +240 is what adding the *unit* three more times costs, not models.
- **Misdiagnosed, again.** "Force Disposition inconsistent between factions."
  It is gated on the **detachment**, not battle size, in every faction checked.
  That is the third time a "no options available" symptom has had a different
  cause here, and the second time it was an order-of-operations trap.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **493 passed, 16 skipped (509 total)**.
- Pinned corpus — **509 passed**.

### Next recommended boundary

**Allied `importRoot` configuration initialising into a force.** A Dark Angels
Army Roster starts with `Code Chivalric`, `Deed`, and `Quality` — Imperial
Knights configuration reached through an `importRoot` entry link. It inflates
the roster and puts foreign options in the browser. Measure how many catalogues
link a library this way before choosing a rule.

## Completed Assignment — Allied Configuration, 2026-08-23

Baseline `ed18973`; resulting implementation commit `91a7167`.

The second real bug from the QA pass. An empty Dark Angels roster came up
holding `Code Chivalric`, `Deed` and `Quality` — Imperial Knights configuration.

### The linking is not the bug

**90 of the 109 catalogue links in the corpus set `importRootEntries`.** Pulling
an allied library's roots in is the normal case and it is correct: it is how
Imperial Knights become available to a Space Marine army. A rule that stopped
that would break allied detachments everywhere.

The bug is **initialisation**. It planned from every root carrying a minimum and
never consulted visibility. `Code Chivalric` has `min 1` in force scope and a
`set hidden` gated on the primary catalogue being Knights: required *if it
applies*, and on a Dark Angels force it does not.

### Two supporting changes

- **Visibility accepts a force owner.** A root hangs from the force, not from a
  selection, so there was no owner to evaluate it against. `RosterConditionOwner`
  already allowed a force; visibility did not. It also now only treats a choice
  as a prospective *child selection* when the owner is one, so the ancestor
  correction from the previous entry does not misfire on roots.
- **A `primary-catalogue` identity condition is answerable whoever asked.** It
  is a question about the catalogue, not about the owner, and it was being
  refused outright for a force owner. That is the exact condition `Code
  Chivalric` hides behind.

### The filter is deliberately silent

It only ever *removes* a root it is certain is hidden. Anything it cannot answer
is created exactly as before, so there is no new uncertainty to report.

That mattered in practice: reporting from here added **37 diagnostics** to a
single Aeldari roster creation, almost all `EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED`
from identity conditions that do not accept a force owner. None of them
described anything a user could act on, and QA had already called the issue list
unreadable. A diagnostic that explains nothing is a defect of its own.

### Verified across factions

| Catalogue | Initial configuration |
|---|---|
| Imperium - Imperial Knights | Detachment, Battle Size, Force Disposition, **Code Chivalric** |
| Dark Angels | Battle Size, Detachment, Force Disposition |
| Astra Militarum | Battle Size, Detachment, Force Disposition |
| Death Guard | Battle Size, Detachment, Force Disposition |

Knights keeps its own configuration; nobody else inherits it. Pinned, and the
pin fails when the filter is bypassed — verified by bypassing it.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **493 passed, 17 skipped (510 total)**.
- Pinned corpus — **510 passed**.

### Next recommended boundary

**The `NOTICE` deprecation string offered as an addable unit.** Small, and the
catalogue browser is the first thing a user sees. After that, `skipIfPresent`
remains the largest display gap at 359 modifiers.

## Research Note — The NOTICE Root Is Not A Small Fix, 2026-08-23

**Superseded, later on 2026-08-23.** Its conclusion that `Show/Hide Options` is
unreachable is **wrong**: the scan that showed it printed through `tail` and the
matching line scrolled off. The group is offered in the browser, and the fix
shipped in `707ea12`. The corpus measurements below still hold.

No code change. Investigated the QA finding that the catalogue's deprecation
notice is offered as an addable unit, expecting a filter and finding a
dependency.

### The notice is a visibility problem, not a naming one

One entry, in `Imperium - Agents of the Imperium`, reached from other catalogues
through `importRootEntries`. It is `hidden: false` statically, but carries
`set hidden -> true` when the parent has at least one selection of any kind. As
a root its parent is the force, and a force always has configuration slots, so
**it correctly evaluates as hidden**. A name-based filter would have been a hack
for something the data already answers.

So the fix is to filter root choices by visibility, exactly as roster creation
now does. That was written and measured before being abandoned, for the reason
below.

### Why it is blocked

Filtering roots by visibility hides more than the notice:

| Catalogue | Roots | Would hide |
|---|---|---|
| Chaos - Death Guard | 137 | **72** |
| Imperium - Agents of the Imperium | 113 | **74** |

Every one of them is a `[Legends]` unit, hidden by
`set hidden -> true` when the roster holds fewer than one `Show Legends`
(`9ed-cbf4-bfe5-90bf`). **That is correct BattleScribe behaviour** — Legends
units are meant to be hidden until the toggle is on.

The problem is the toggle. `Show Legends` is a shared entry in the game system,
linked under a group named **`Show/Hide Options`**, and that group is **not among
the root choices**. Selecting it is impossible today, and a scan of every
configuration slot on a fresh Death Guard roster does not find it.

So shipping the filter alone would remove 72 units per faction **with no way to
bring them back** — trading a cosmetic bug for a functional regression. It was
not shipped.

### The order this needs

1. **Make `Show/Hide Options` reachable.** Find out why a game-system
   configuration group is absent from `context.roots.roots` while catalogue
   roots are present. That is a roots-composition question, not a UI one.
2. **Then filter root choices by visibility.** It fixes the notice, gives
   correct Legends behaviour, and needs no special cases.

Doing (2) without (1) is the trap this note exists to record.

### Checks run

No source changed; the working tree is clean. Verified only that the corpus
suite still passes at **17 tests** after the investigation.

### Next recommended boundary

`Show/Hide Options`, as above. If that turns out to be deep, `skipIfPresent`
(359 modifiers, the largest display gap) is the better use of a checkpoint than
forcing the notice fix through.

## Completed Assignment — Hidden Roots, 2026-08-23

Baseline `39f6edc`; resulting implementation commit `707ea12`.

### Correcting the previous note

The research note before this one concluded the notice fix was **blocked**
because `Show/Hide Options` was unreachable. **That was wrong**, and it was
wrong for an embarrassing reason: the scan that "proved" it printed its results
through `tail`, and the line naming the group scrolled off the top. The group is
in `context.roots.roots`, in `localRosterRootChoices`, and is offered in the
browser.

Two things follow. The blocked note is superseded, and the lesson is narrow but
real: **a tool that truncates output can manufacture a negative result.** The
same command that found nothing would have found it with `grep`.

### What was actually true

`Show/Hide Options` is *not* auto-created, and that is correct. It carries
`min 1 force selections` and an **unconditional modifier setting that very
constraint to 0**. It is offered, not required — which is what a display toggle
should be.

Its children are the toggles: `Show Legends`, `Show Unaligned Forces`,
`Show Unaligned Fortifications`, `Show Crucible Characters`, `Show Chaos
Knights`, `Show Titans`.

### The change

Root choices are filtered by visibility, the same conservative rule roster
creation uses: only a root that is *certainly* hidden is dropped.

| Catalogue | Offered before | After | After `Show Legends` |
|---|---|---|---|
| Dark Angels | 111 | **110** | 189 (79 Legends back) |
| Death Guard | 137 | **65** | 104 (39 Legends back) |

The notice is gone, `[Legends]` units hide until asked for — as BattleScribe
does — and `Show/Hide Options` resolves as visible so the toggle never
disappears with the units it controls. That last point is the one that made the
change safe, and it is pinned.

### Two narrow condition gates

A prospective child of a **force** is a root, and a root's parent *is* that
force, so `scope="parent"` names the owner already in hand. Both the shape check
and the collection now allow it, gated on the `prospectiveChild` flag from the
previous entry — because for a *real* force owner, a force constraint,
`parent` means the containing force, which is a different question entirely.

That is the condition the notice hides behind: hide once the parent holds
anything, and a force with configuration slots always does.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **493 passed, 18 skipped (511 total)**.
- Pinned corpus — **511 passed**. The new pin fails when the filter is bypassed.

### Next recommended boundary

**`skipIfPresent`.** 359 modifiers across 20 files, and it currently blanks the
pinned Manreaper's Keywords entirely. Largest remaining display gap. Its values
are the appended keyword strings themselves, which reads as deduplication — but
that is inference, so pin it against the New Recruit wiki or an observation
before writing a rule.

> **Corrected 2026-08-24.** "Its values are the appended keyword strings
> themselves" is true of the sample that was in front of that entry, not of the
> attribute. The Death Guard Vector of Disease appends `Sustained Hits 1` while
> guarding on `Sustained Hits`. The deduplication reading was wrong; see the
> entry below.


## Completed Assignment — `skipIfPresent`, 2026-08-24

Baseline `f09de47`; resulting implementation commit `ae7ed86`.

### What this closes

`skipIfPresent` was the largest remaining display gap: **359 modifiers across 20
corpus files**, all of them `append`. Because an unsupported attribute leaves a
step *unapplied*, and because only `set` discards the value it was handed, an
unapplied append withheld the whole characteristic. The pinned Death Guard
Manreaper's Keywords were **blank** — not "Lethal Hits missing", blank — and a
corpus test existed only to document that degradation.

### The semantics, observed rather than inferred

The previous entry read the attribute as deduplication: its value is usually the
same string being appended, so "append X unless X is already there". That is a
plausible reading of the sample and it is **wrong**.

New Recruit's wiki renders modifiers in prose, and every catalogue entry has a
public URL whose ID is the same ID the corpus carries:
`/wiki/wh40k-11e/warhammer-40%2C000-11th-edition/<catalogue>/<entry-id>/<slug>`.
Two entries were read directly (through the browser — `WebFetch`'s summariser
drops the profile tables):

- **Lord of Contagion** `10a1-5896-98da-8c7c` —
  `append Keywords Lance unless Lance in self.entries.group.recursive.profiles.Melee Weapons`
- **Vector of Disease** `e29b-1c26-3345-3b95` —
  `append Keywords Sustained Hits 1 unless Sustained Hits in root-entry.self.entries.group.recursive.profiles.Melee Weapons`

The second settles it. The appended value is `Sustained Hits 1` and the guard is
`Sustained Hits` — **different strings**. `skipIfPresent` is an independent
guard, not a duplicate check. Three Death Guard modifiers depend on that
difference: a weapon that already carries `Sustained Hits 2` must not also
receive `Sustained Hits 1`, and a deduplication rule would have appended it.

The rendered word is *unless*, and the target of "in" is the same target the
append writes to. Nothing observed suggests the guard reads anywhere else.

### The one design decision

A skipped append is an **applied no-op**, not a refusal. The alternative —
recording it unapplied — reuses existing machinery and is honest about "this
modifier did not run", but it would blank the characteristic through the
withholding rule above, which is exactly the bug being fixed. The precedent is
already in the codebase: a `replace` whose search term matches nothing is
recorded as applied, because the source *meant* nothing to change. Same here.

`skipIfPresent` is added to the supported attribute set **only for `append`**.
On any other operation it stays unsupported and still withholds, because nothing
was observed about what it would mean there and the corpus has no instance.

### Result on the pinned corpus

The Manreaper's Keywords now read
`Lethal Hits, Sustained Hits 1, Lance, Devastating Wounds` — resolved and
`complete`, with no unapplied steps. `Sustained Hits 1` appears **once**. The
corpus test that documented the blank was rewritten to assert restoration,
including the single-occurrence count, so a future deduplication regression
fails loudly.

### Tests

- `packages/evaluation/src/characteristics.test.ts` — a synthetic case covering
  all three shapes at once on one profile: guard present and equal to the value
  (skipped), guard absent (appended), and **guard present but different from the
  value** (skipped). The third is the shape the corpus needs and the one a
  deduplication implementation gets wrong.
- Sabotage-verified: disabling the guard makes it fail.
- `apps/web/src/bsdata-json.integration.test.ts` — the pinned Manreaper case,
  inverted from documenting the degradation to asserting the restoration.

The new fixture profile also required adding `profile-skip-if-present` to the
render-order list in `apps/web/src/roster-session.test.ts`, which pins the whole
fixture's profile order.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **494 passed, 18 skipped (512 total)**.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` — **512 passed**.

### What this did not do

Nothing was written for `skipIfPresent` on a non-`append` operation, and no
guard scope other than "the value being appended to" was implemented. Both are
absent from the corpus and unobserved; guessing either would repeat the mistake
this entry corrects.

### Next recommended boundary

**Constraint `value="-1"`** — 48 corpus constraints, 43 `max` and 5 `min`. The
standing reading is "no limit", but it has been withheld rather than guessed for
the same reason `skipIfPresent` was. It is now cheap to settle: the New Recruit
wiki renders constraints in the same prose, and the corpus entry ID is the URL.
Find a `max="-1"` entry, read what the wiki says its limit is, then write the
rule. If it is "no limit" and RosterForge currently treats it as a literal `-1`,
any entry carrying one is reporting a bound that cannot be satisfied.

> **Corrected 2026-08-24, twice.** First, RosterForge did *not* treat `-1` as a
> literal bound. It withheld — unresolved, incomplete, with a diagnostic — so
> the cost was degraded completeness, not a bound nobody could satisfy. Second,
> "the corpus entry ID is the URL" holds for only
> **5 of the 48**. The rest sit on selection entry groups (23) and category
> entries (20), which have no wiki page of their own — open the owning unit for
> a group, and the force-organisation display for a category entry. The
> measurement in "Picking up from here" supersedes the counts in this
> paragraph, and adds the finding that changes the shape of the work: all 48
> are targets of a modifier, so `-1` is a resting value rather than an authored
> final one.


## Handoff Readiness Pass — 2026-08-24

Not a code checkpoint. No source file changed; `agent-handoff.md` is the only
edit. Recorded because it produced corpus measurements that later sessions
should not have to re-derive, and because it corrects a stale instruction that
would have sent the next reader at finished work.

### What was wrong

"Picking up from here" still named **conditional `defaultAmount` and
quantifiable entry initialization** as the current Next. Section B had recorded
that same item as **Done** since the checkpoint that finished it. Because "Read
This First" sends a new session to Current Status *before* the roadmap table,
the stale paragraph was the first thing a fresh reader would act on. Rewritten
to point at constraint `value="-1"`, and to say explicitly that the old item is
done, so the next reader is not left reconciling two answers.

### Measurements taken (pinned corpus `04c62fcd`)

All figures in the rewritten "Picking up from here" and the section F row come
from a direct pass over the 46 pinned JSON files, not from memory:

- 48 constraints with `value="-1"`; 43 `max`, 5 `min`; 22 files; 46 distinct
  constraint IDs, two of which are duplicated inside their own file.
- Owners: 20 category entries, 12 selection entry groups, 11 shared selection
  entry groups, 5 selection entries.
- 75 modifiers target those constraint IDs — 71 conditional `set`, 4
  unconditional `increment`. **All 48 constraints are targeted.**
- 42 of the 46 IDs are targeted only by conditional modifiers, so `-1` stands
  whenever those conditions are false.
- 22 of the maxes share an owner with a `min` of 1 or more, which a literal
  reading of `-1` makes unsatisfiable.

The last point is strong evidence for "no limit" but was deliberately **not**
written into the roadmap as settled. It is inference from internal consistency,
and this project's rule is that semantics come from observation. The next
session should confirm it before implementing.

### Checks run

Re-run rather than quoted, to confirm the status block is true at handoff:

- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — **494 passed, 18 skipped (512 total)**.
- `pnpm test` with `ROSTERFORGE_BSDATA_JSON_DIR` — **512 passed (50 files)**.
- `pnpm build` — succeeds; only Vite's existing large-chunk warning.
- `git diff --check` — clean.
- Pinned corpus verified at `04c62fcd041b3808c39d5c46fd677c704027b979`,
  46 JSON files, clean working tree.
- No `TODO`/`FIXME`/`HACK` markers and no stray `console.log` in non-test
  source.

### Next recommended boundary

Unchanged: **constraint `value="-1"`**, with the measurements above as the
starting point instead of a first day of counting.

## Completed Assignment — Constraint `value="-1"`, 2026-08-24

Baseline `6b22af6`. The roadmap's Next, taken immediately after the handoff
readiness pass that measured it.

### What it means, and how that was settled

`value="-1"` is BattleScribe's **"no constraint" sentinel**. `max="-1"` admits
any count; `min="-1"` demands none. It is the *absence* of a bound, not a bound
of minus one.

Observed, not inferred — read on the New Recruit wiki through the browser pane,
the same method that settled `skipIfPresent`:

- **Vindicare Assassin's Micromelta Round** (`bcba-352d-f7f2-84ba`). The corpus
  gives it two constraints, `max 1` and `min -1`. The wiki prints exactly one
  line: `max: 1`. The `-1` is not rendered at all.
- **Imperial Knights' Allocated Chivalric Points** (`e7fb-9519-7cd7-9c10`). The
  corpus gives it a single constraint, `max -1`. The wiki prints **no constraint
  section whatsoever**, only the conditional modifier `set max 6 / ancestor is
  Armiger`.

The second is the decisive one: a lone `-1` produces no rendered bound, so the
sentinel is omission rather than a number.

There was also strong internal evidence — 22 of the 43 maxes sit beside a `min`
of 1 or more, so a literal reading makes `min 1 > max -1` unsatisfiable and, for
the Chaos Daemons `Detachment` group, would make every Daemons roster invalid
with no detachment selectable. That argument was deliberately **not** treated as
sufficient. It is inference from internal consistency, and this project settles
semantics by observation. It agreed with the observation, which is worth
recording, but it did not do the settling.

### What the previous behaviour actually was

Worth correcting a claim this document carried for a week: the roadmap said an
entry carrying `-1` "advertises a bound no roster can satisfy". **It did not.**
RosterForge withheld — `status: unresolved`, `completeness: incomplete`, plus a
`VALUE_NEGATIVE_UNSUPPORTED` diagnostic. The cost was degraded completeness and
a stream of diagnostics, not false invalidity. The withholding was working as
designed; it was simply withholding something now known.

### Measured impact

The static count understated this badly. 48 constraints sounds marginal; the
observable effect was not. Creating an **empty roster** in each pinned
catalogue, before adding a single unit:

- **Before: 34 of 36 catalogues raised a constraint-unsupported diagnostic
  citing `-1`.** Every faction except two.
- **After: 0.**

Measured by A/B on the built bundle — the sentinel was disabled, rebuilt, and
re-measured, rather than assuming the baseline.

### What changed

- `packages/evaluation/src/constraints.ts` — owns `UNBOUNDED_CONSTRAINT_VALUE`
  and `isUnboundedConstraintValue`, exported for the other modules.
- `packages/evaluation/src/force-constraints.ts` — the same treatment; category
  entries own 20 of the 48 and are evaluated here.
- `packages/evaluation/src/initialization.ts` — the sentinel contributes its
  **fold identity**: `0` for a minimum, positive infinity for a maximum.
  Initialization folds minima with `Math.max` and maxima with `Math.min`, so
  passing the literal `-1` into `Math.min` would clamp every maximum to -1 and
  the initializer would create nothing.
- `apps/web/src/roster-workspace.tsx` — the constraint summary printed
  `limit -1` at the reader. It now prints `no limit`.
- `apps/web/src/automatic-reconciliation.ts` — an unbounded bound no longer
  marks reconciliation incomplete; it is known, not unknown, and contributes
  its fold identity.

### The decision worth knowing about

**The sentinel is decided from the authored value, never the computed one.**

The first implementation short-circuited inside the shared `constraintStatus`
predicate, on any limit equal to -1. That broke an existing test, correctly: a
constraint with base `0` and a `decrement 1` modifier produces an effective -1,
and that is arithmetic underflow, not an authoring sentinel. Treating the two
alike would have silently converted an unexplained computation into "unbounded".

The fix moved the decision to the call sites, where the base value is known:

- base `-1`, nothing applied → unbounded, satisfied, complete;
- base `-1`, a modifier applies → the modifier's real limit, evaluated normally;
- base `0`, arithmetic goes negative → unchanged, still withholds.

Only exactly `-1` is the sentinel. `-2` still raises
`VALUE_NEGATIVE_UNSUPPORTED`, because nothing was observed about it and the
corpus contains none.

### Tests

- `packages/test-fixtures/fixtures/constraint-links.cat` — added
  `constraint-unbounded-parent`, a `max="-1"` with a conditional `set 1`. This
  is the corpus's dominant shape: all 48 instances are modifier targets, and for
  42 of the 46 distinct IDs every targeting modifier is conditional.
- `packages/evaluation/src/constraints.test.ts` — one test covering both
  halves: with the condition false the sentinel stands (satisfied, complete, no
  diagnostic); with it true the modifier writes a real max of 1 and two
  selections **violate** it. The second half is what stops a naive "-1 disables
  the bound forever" implementation from passing.
- The malformed-value test now uses `-2`, pinning the *edge* of the rule rather
  than the rule, plus a new assertion that `-1` is clean and satisfied.
- Sabotage-verified: disabling the sentinel fails both.
- `apps/web/src/bsdata-json.integration.test.ts` — the Aeldari initialization
  case previously asserted `INITIALIZATION_CONSTRAINT_UNSUPPORTED` citing -1.
  It now asserts `INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED`: the value is
  understood, and what remains is the older, separate rule that a bound whose
  value a modifier computes cannot drive automatic initialization. Three
  assertions in that test moved for the same reason.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **495 passed, 18 skipped (513 total)**.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` — **513 passed**.
- Dev server smoke-checked in the browser: loads clean, no console errors.

### What this did not do

- **The `no limit` display string has no test.** Exercising it needs a `-1`
  constraint in `projection.cat`, which many unrelated UI assertions read, and
  destabilising a shared fixture late in a checkpoint was the worse trade. The
  guard is a single ternary over a tested helper, and its failure mode is
  reverting to the old text. Worth covering with a dedicated fixture next time
  that file is touched.
- Nothing was written for negatives other than `-1`.
- The two duplicated constraint IDs found during the readiness pass
  (`a5cc-f61b-de81-c804`, `4d8f-6e09-606e-788e`) were **left alone**. A modifier
  naming one is ambiguous about which constraint it targets. It did not block
  this work and inventing a disambiguation rule without observing what New
  Recruit does would repeat the mistake this entry corrects.

### Next recommended boundary

**The usability findings from the QA pass**, as one presentation pass — see
section F. Note the change in character: sections A–E could be settled against
the corpus and the wiki, and these cannot. They are judgement calls about what a
person needs to see. Where taste decides rather than correctness, ask the owner.

## Completed Assignment — Product Usability Presentation Pass, 2026-08-24

Baseline `45a5698`; resulting implementation commit `3b84a2f`
(`feat: streamline roster usability`). The worktree already contained the
bounded presentation pass when this session resumed; it was preserved, reviewed,
finished, and verified rather than reset or rewritten.

### What changed

- The workspace navigation, validation ribbon, structural card, and constraint
  card count and expand **known violations** as the actionable set. Unresolved
  bounds remain visible in the completeness counts and in their own collapsed
  disclosures; they no longer inflate the issue links or automatically expand
  a roster subtree.
- Generated force and selection occurrence IDs no longer appear in cards,
  accessible action labels, or choice-group labels. Stable DOM anchors and
  `data-*` attributes retain exact link and regression-test identity.
- Non-zero costs remain the headline. Zero-value source cost fields are kept in
  a collapsed disclosure, so matched-play points stay prominent without
  inventing a game-mode filter or discarding campaign data.
- Selected-child disclosures now say what they contain — models, wargear,
  Warlord, and options — rather than exposing the generic tree shape. A model's
  amount editor is adjacent to the occurrence as `Models in this squad`, not
  behind Selection details.
- Unresolved selection display-name or annotation behavior still falls back to
  the source display and remains marked incomplete, but its reader-facing notice
  moved into Selection details instead of becoming a banner on every card.

### Decisions and rejected alternatives

Validity and completeness remain independent. Treating an unresolved bound as
an actionable violation was rejected because it made unsupported coverage look
like a roster error; hiding unresolved bounds entirely was rejected for the
same reason in reverse. The UI keeps both dimensions and changes only their
presentation priority.

Zero-value cost types are collapsed by evaluated value rather than by names such
as `Crusade`. RosterForge has no game-mode model, and a name filter would both
guess at semantics and silently drop source data. Non-zero campaign values still
deserve attention and therefore remain in the headline.

Occurrence IDs remain implementation identity. Retaining them in anchors avoids
breaking exact issue navigation, but displaying them to disambiguate repeated
units was rejected: occurrence order and names are the reader-facing identity,
and the generated strings added noise to every control.

### Tests and corpus measurements

`apps/web/src/App.ui.test.tsx` keeps the existing 13-test end-to-end local
catalogue flow and now pins all presentation decisions: generated IDs are absent
from visible text but present as exact anchors, zero-value `Crusade: Experience`
is collapsed while Points remains prominent, large initialized children toggle
and expose two model amount editors, unresolved structural bounds are separate
from the one known violation, and an unsupported selection-name operation shows
its notice only after Selection details opens.

At pinned corpus `04c62fcd041b3808c39d5c46fd677c704027b979`, the 46 JSON
files contain **6,631** authored cost values named `Crusade: Experience` or
`Crusade: Battle Honours`: **5,643 zero** and **988 non-zero**. The split is
3,174 Experience and 3,457 Battle Honours values. This supports collapsing
zeroes by current value while keeping the cost types in the report.

### Checks run

- Focused `apps/web/src/App.ui.test.tsx` — **13 passed**.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **495 passed, 18 skipped (513 total)**.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` — **513 passed**
  across 50 test files; corpus checkout clean, 46 JSON files.
- Local Vite browser smoke test — loaded with no console warnings or errors;
  the production build retains only the existing large-chunk warning.

The headless Grok handoff completed the synthetic zero-cost fixture and its
regression assertions before the pause. Two later read-only review attempts made
no changes: one stalled after reading the large handoff history and the other
hit Grok's own file-output error on the diff. Codex completed the focused review
and all gates above.

### What this did not do

No evaluator, command, persistence, or legality behavior changed. Zero-value
costs were not removed, unresolved findings were not reclassified, and generated
IDs were not changed. Warlord remains ordinary catalogue-driven child selection
behavior rather than a new product concept. Phone-width behavior, incremental
evaluation, per-file freshness, community-vs-GW points warnings,
Unicode-normalised matching, and a CI performance budget remain open in section
F.

### Next recommended boundary

**Behaviour on a phone.** Drive a real roster through add, configure, amount,
and checks at a phone viewport. The current CSS claims a full-width fallback,
but no real-list QA has verified density, control order, or disclosure depth at
that width.

## Completed Assignment — Durable Multi-Agent Workflow, 2026-08-24

Baseline `6122d215f102f7b2414c0fe05d565b6abeb07851`; resulting workflow commit
`7bbed36` (`docs: establish delegated agent workflow`). This was a repository
workflow and configuration checkpoint only.

### What changed

- `AGENTS.md` now defines formal active-lead handoffs separately from bounded
  delegation. Codex remains the preferred default lead and normal implementer,
  while any capable model can take ownership through the existing
  `agent-handoff.md` process.
- Delegated workers receive explicit baselines, bounded scopes, least privilege,
  and a dedicated worktree for any possible mutation. They do not write the
  primary checkout, update this handoff, push, open pull requests, deploy, or
  perform unrelated external writes.
- `docs/agent-workflow.md` supplies the role matrix, good and bad delegation
  criteria, complete task-brief contract, allowed-path and stop rules, worktree
  creation and safe cleanup, delegate output contract, lead review and
  integration procedure, checkpoint/push/CI sequence, current executable
  locations, and tested headless command shapes.
- Minimal `CLAUDE.md` imports canonical `AGENTS.md` through Claude Code's
  supported `@AGENTS.md` mechanism. `.gitignore` now keeps
  `CLAUDE.local.md` private alongside the existing Claude local-settings rule.
- Antigravity received no guessed `GEMINI.md` or repository configuration. Its
  installed CLI exposes no documented instruction-file switch, so delegated
  invocations use a new isolated project/worktree and explicitly name the
  repository context they must read.

### Decisions and rejected alternatives

The active lead remains a programmer rather than becoming an orchestration-only
role. Delegation is justified by a concrete benefit — independent review,
specialist reasoning, truly separable work, bounded overflow, or GitHub-native
access — rather than by agent availability.

Repository rules and supported per-invocation CLI controls were enough. A
permissive `.codex/config.toml`, hooks, wrappers, a custom orchestrator, shared
write defaults, and obsolete Gemini compatibility files were rejected because
they would enlarge authority or duplicate canonical instructions without a
demonstrated need.

Read-only labels were not trusted without enforcement. Claude and Copilot used
explicit read/search-only tool sets; Grok used plan mode with subagents and web
disabled; Antigravity, whose CLI lacks the same fine-grained file-tool allowlist,
ran in a disposable worktree. Potential writers always receive a worktree the
lead creates first because Grok's headless `--worktree` flag does not create the
required isolation.

### External-agent verification

- **Claude Code 2.1.240:** after its reported subscription reset, the restricted
  `Read,Grep,Glob` smoke returned `CLAUDE_CONTEXT_OK`, followed `CLAUDE.md` into
  `AGENTS.md`, distinguished handoff from delegation, and located the runbook.
  No write, shell, browser, or persistent-session permission was available.
- **Antigravity 1.1.19:** authenticated plan/sandbox mode in a disposable
  worktree returned `AGY_REPO_OK` and correctly identified `roster-builder` as
  the `data-graph`/`roster-model` boundary. The first probe exposed a stale saved
  OneDrive project path; `--new-project --add-dir <worktree>` corrected it. No
  repository file changed, although normal CLI project/conversation metadata
  remains under the user's `.gemini/antigravity-cli` state.
- **Grok Build 1.0.5:** a plan-mode smoke with subagents and web disabled
  returned `GROK_REPO_OK` and reported the same architecture boundary. The
  installed command uses positional `--single`, not `--prompt`, and warns that
  the user's existing `privacy` configuration key is unrecognized.
- **GitHub Copilot CLI 1.0.80:** with built-in MCP disabled, shell/write denied,
  and only `view,grep,glob` available, returned `COPILOT_CI_OK` and correctly
  summarized the local CI triggers and all required gates. It performed no
  GitHub or filesystem mutation.

The disposable writer test created two worktrees at the exact baseline above:
one for Antigravity analysis and one for Grok writing. Grok created only an
untracked 38-byte `delegated-writer-smoke.txt` containing the requested exact
line plus newline. Codex inspected the status, diff, and bytes, confirmed the
primary checkout never contained the file, and removed both worktrees and both
local branches without merging. `git worktree list` then showed only `main`.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **495 passed, 18 skipped (513 total)** across 50 test files.
- Production build — successful with only the existing large-chunk warning.
- Pinned corpus — not rerun because no application, evaluator, data-format, or
  compatibility behavior changed; the 18 gitignored corpus tests were the
  explicitly reported skips in the normal suite.
- Pre-commit remote refresh — local `HEAD` and `origin/main` both remained
  `6122d215f102f7b2414c0fe05d565b6abeb07851` with divergence `0 0`.

### What this did not do

No RosterForge application code, architecture boundary, compatibility claim,
diagnostic, dependency, build configuration, or product-roadmap status changed.
No delegate committed, pushed, opened a pull request, deployed, or wrote to a
GitHub service. No next feature or phone-width usability work began.

Remaining operational caveats are local and explicit: managed Codex sessions
may need the recorded absolute paths for Claude and Antigravity; Claude quota
exhaustion requires a retry or formal handoff; Antigravity needs
`--new-project` to avoid stale saved project context; and Grok's unrecognized
user-level `privacy` key should not be mistaken for enforced permissions. The
runbook therefore passes restrictive flags on every invocation and uses
worktree isolation whenever enforcement is uncertain.

### Next recommended boundary

**Behaviour on a phone**, unchanged from the product-usability checkpoint.
Drive a real roster through add, configure, amount, and checks at a phone
viewport before changing responsive density, ordering, or disclosure depth.

## Completed Assignment — Native Subagents And Reference Behavior QA, 2026-08-24

> Superseded in part by **Reference Behavior QA Execution Lane Correction,
> 2026-08-24** below. Its Antigravity interactive-executor routing is obsolete;
> the data-comparability and discrepancy-classification protocol remains
> authoritative.

Baseline `9d4d8feb7a33e258cee22c0224fbf51c4506b5a0`; resulting workflow commit
`a5bbdd0` (`docs: add subagent and reference QA lanes`). This follow-up changed
only repository workflow documentation.

### What changed

- `AGENTS.md` now makes native Codex subagents the preferred delegation lane for
  genuinely separable investigation, review, research, or parallel
  implementation when Codex leads and no external model/tool advantage is
  needed. Routine implementation remains with the lead, and native delegation
  never transfers checkpoint ownership.
- The rules explicitly record the verified isolation boundary: native children
  share the parent's repository filesystem and sandbox and receive no automatic
  branch or worktree. Any possible writer therefore uses the existing explicit-
  baseline, one-writer-per-worktree procedure.
- `docs/agent-workflow.md` now includes native Codex subagents in the role matrix
  and six-way affinity decision path, plus the current spawn/result, concurrency,
  shared-workspace, token-cost, and review constraints. No project Codex config
  or custom agent was added because the current mechanism is already enabled.
- A new Reference Behavior QA lane compares bounded army-building scenarios in
  New Recruit and RosterForge without treating New Recruit's visuals or internal
  architecture as a product specification. Antigravity is the preferred
  independent specialist when a JavaScript-capable browser session is actually
  available; the active lead retains final classification and all code/roadmap
  decisions.
- The QA protocol records exact application and pinned-corpus commits, date and
  timezone, system/catalogue/version and entry IDs, browser/client state,
  reproduction steps, both observed behaviors, screenshots/evidence, known
  incompleteness, and authorized temporary New Recruit state. It independently
  classifies data comparability (`exact`, `different`, `unknown`) and behavior
  (`match`, `mismatch`, `inconclusive`, `not-applicable`). Only `exact +
  mismatch` can become a candidate product defect, and the lead still decides.
- Targeted parity QA is optional after meaningful list-building/correctness
  changes or disputed semantics. Broader periodic passes exercise a small set of
  versioned golden roster scenarios. The scenarios are documentation/evidence
  bundles for now; no automation framework was created.

### Decisions and rejected alternatives

Native subagents sit between ordinary lead work and external specialists. Using
an external model for every separable task was rejected because native children
have lower orchestration friction when no model/tool distinction is needed.
Automatically spawning them was also rejected: every child consumes additional
model/tool work, shares the lead's coordination budget, and still needs review.

The current native mechanism was not described as isolated. A bounded child
honored a read-only prompt, but it retained write-capable tools in the parent's
workspace-write sandbox. Task wording proves conduct, not inability to mutate;
the existing worktree rules remain the containment mechanism for writers and
for any read-only task whose permissions cannot be enforced.

New Recruit observations were separated from pinned corpus evidence. Treating
every visible difference as a RosterForge bug was rejected because current New
Recruit data can differ from the repository's pinned BSData revision. The QA
report therefore carries comparability and behavior as independent axes before
assigning a preliminary disposition.

### Capability verification

- Official OpenAI documentation confirms that current Codex releases enable
  subagent workflows by default, can trigger them from direct or applicable
  project instructions, collect their results in the lead thread, and inherit
  the parent sandbox/permission mode.
- This Codex desktop session exposed four concurrent slots including the lead.
  Codex spawned one bounded child at the exact baseline above, passed a read-only
  scope and output contract, received its independent result, and verified that
  it changed no file. The child confirmed the shared-checkout/worktree limitation.
- Antigravity 1.1.19 remained authenticated. `agy agent` listed no custom agent,
  `agy mcp list` reported no configured server, and `agy plugin list` reported no
  imported plugin. A plan/sandbox probe returned `BROWSER_QA_UNAVAILABLE`: the
  headless CLI exposes static `read_url_content` retrieval, not an interactive,
  JavaScript-capable browser/navigation tool.
- Reference QA must therefore use a browser-capable Antigravity client/session
  or browser evidence captured by an authorized lead tool and handed to
  Antigravity for independent analysis. If neither exists, the delegate stops;
  static HTML is not reported as observed app behavior.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **495 passed, 18 skipped (513 total)** across 50 test files.
- Production build — successful with only the existing large-chunk warning.
- Pinned corpus — not rerun because no application, data-format, evaluation, or
  compatibility behavior changed; the normal suite reports its 18 corpus tests
  as skipped without the local environment variable.
- Pre-commit remote refresh — local `HEAD` and `origin/main` both remained
  `9d4d8feb7a33e258cee22c0224fbf51c4506b5a0` with divergence `0 0`.

### What this did not do

No RosterForge application code, dependency, build configuration, architecture,
compatibility claim, diagnostic, or product-roadmap status changed. No New
Recruit comparison scenario was run; this checkpoint defined the protocol and
verified the available browser capability only. No external-agent smoke was
repeated unless its changed role required verification. No product-development
or phone-width work began.

### Next recommended boundary

**Behaviour on a phone**, still unchanged. Drive a real roster through add,
configure, amount, and checks at a phone viewport before changing responsive
density, ordering, or disclosure depth.

## Completed Assignment — Reference Behavior QA Execution Lane Correction, 2026-08-24

Baseline `9e3ad0fa9302185f5fe64c94ff4d3fb24d41e28c`; resulting workflow commit
`fb758b0` (`docs: correct reference QA execution lane`). This checkpoint changed
only repository workflow documentation and did not begin a product checkpoint.

### What changed

- `AGENTS.md` and `docs/agent-workflow.md` now assign interactive New Recruit and
  RosterForge parity execution to a browser-capable Codex agent. A native Codex
  subagent is the preferred lane for a bounded scenario after a current child
  capability probe; the active Codex lead may run the scenario directly and is
  the fallback when child browser access is absent.
- The runbook no longer infers browser-plugin inheritance from sandbox,
  filesystem, or repository-tool inheritance. Every environment must establish
  the child's actual Browser skill and runtime before assigning interactive QA.
- Antigravity remains an independent Reference QA evidence analyst. The
  installed headless `agy` 1.1.19 client may review captured steps, screenshots,
  IDs, observations, and pinned-corpus evidence, but is not described as the
  interactive executor while it lacks browser actuation.
- Claude remains the escalation lane for difficult semantic discrepancies that
  need deep repository, BattleScribe, or New Recruit data-format analysis.
- The comparison protocol is unchanged: data comparability remains `exact`,
  `different`, or `unknown`; behavior remains `match`, `mismatch`,
  `inconclusive`, or `not-applicable`; only `exact + mismatch` can be a candidate
  RosterForge defect, subject to the active lead's final classification.

### Capability verification and decisions

The active Codex lead initialized the Browser runtime, opened an agent-owned Edge
tab at New Recruit, and observed the rendered `My Games` page at
`https://www.newrecruit.eu/app/MySystems`, including `Warhammer 40,000 11th
Edition`. It clicked or submitted nothing and changed no New Recruit or
repository state.

A separate native Codex subagent then inspected its own tool surface rather than
assuming the parent's capabilities. It found and fully read the Browser skill,
found the required browser-use runtime, independently connected to Edge, opened
New Recruit, and returned the same rendered title, route, and visible game-list
evidence. `git status --short` remained empty after the probe.

Making the child the unconditional executor was rejected because tool and plugin
surfaces can change across environments. Treating Antigravity as a hypothetical
browser executor was also rejected: the installed authenticated headless client
was already verified to expose static HTTP retrieval but no interactive browser
actuation. The capability-gated Codex-child lane preserves bounded parallelism
without turning agent availability into a reason to delegate.

### Checks run

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **495 passed, 18 skipped (513 total)** across 50 test files.
- Production build — successful with only the existing large-chunk warning.
- Pinned corpus — not rerun because no application, data-format, evaluation,
  compatibility, or product behavior changed; the normal suite reports its 18
  corpus tests as skipped without the local environment variable.
- Pre-change remote refresh — baseline `HEAD` and `origin/main` both resolved to
  `9e3ad0fa9302185f5fe64c94ff4d3fb24d41e28c` with divergence `0 0`; the primary
  checkout was the only worktree.

### What this did not do

No application code, dependency, build configuration, architecture boundary,
compatibility claim, diagnostic, corpus data, or product-roadmap status changed.
No parity scenario, product checkpoint, phone-width work, pull request,
deployment, or external publication began. The browser probes established tool
capability only and did not construct or modify a New Recruit roster.

### Next recommended boundary

**Behaviour on a phone**, unchanged. Drive a real roster through add,
configure, amount, and checks at a phone viewport before changing responsive
density, ordering, or disclosure depth.

## Completed Assignment — Phone-Width Roster Usability, 2026-08-24

Baseline `60edfb32fff07f719be612a47fb825a8be4605bd`; resulting implementation
commit `6802773` (`fix: contain phone-width roster layout`). This was one bounded
product-usability checkpoint.

### Real-roster QA and findings

Codex used the browser directly at a 390 x 844 viewport against the pinned
BSData source at `04c62fcd041b3808c39d5c46fd677c704027b979`. The live scenario
loaded Chaos - Death Guard revision 10 and its six dependencies, created an Army
Roster, selected Virulent Vectorium, Incursion, and Take and Hold, added Plague
Marines, selected a power fist for the champion, changed one Plague Marine model
amount from 1 to 2, and followed the Checks workspace link. The supported view
moved from two known structural violations after adding the unit to zero after
the wargear and amount edits; 90 points and 3 Detachment Points remained visible.

Two presentation defects were measured:

- Long repository diagnostic codes expanded an implicit grid track. At a 390 px
  viewport the document was 431 px wide, produced horizontal scrolling, and
  clipped the three-column workspace navigation.
- Roster, Add units, Checks, and validation-detail fragment links placed their
  target at viewport `top: 0`, directly under the 47 px sticky workspace nav.

This was RosterForge presentation QA, not a New Recruit semantic discrepancy,
so Reference Behavior QA was not invoked and no parity classification was made.
The lead kept implementation local; a delegate would have required a separate
data/browser setup without a concrete analysis or review advantage for this
small CSS fix.

### What changed and why

- Diagnostic lists now use explicit shrinkable grid tracks, their content track
  uses `minmax(0, 1fr)`, and monospace diagnostic codes may wrap anywhere.
- The remote-source single-column mobile grid also uses `minmax(0, 1fr)` rather
  than `1fr`, whose automatic minimum retained the long code's min-content width.
- The document reserves 84 px above fragment targets. After the change every
  workspace and validation-detail target measured at `top: 84`, below the 47 px
  sticky nav.
- `apps/web/src/styles.test.ts` pins those layout declarations because jsdom
  does not calculate viewport layout. `docs/compatibility.md` now records the
  browser-verified mobile boundary.

Hiding or truncating diagnostics was rejected because the exact code is useful
support evidence. Clipping horizontal overflow at the document was rejected
because it would conceal a layout defect rather than make controls fit. A wider
responsive redesign was unnecessary: after correcting intrinsic sizing, the
existing ordered one-column roster layout completed the real path without
another density or disclosure change.

### Verification

- Post-fix browser measurement at 390 x 844: document width **375 px** within a
  390 px viewport, horizontal offset **0**, and all three workspace targets at
  **84 px** below the viewport top. Browser console: no warnings or errors.
- Post-fix minimum-width measurement at 320 x 568: document width **320 px**,
  horizontal offset **0**, and both validation-detail targets at **84 px**.
- Focused `App.ui.test.tsx` plus `styles.test.ts` — **15 passed**.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **497 passed, 18 skipped (515 total)** across 51 test
  files; production build succeeded with only the existing large-chunk warning.
- Pinned corpus checkout clean at
  `04c62fcd041b3808c39d5c46fd677c704027b979`; complete suite — **515 passed**
  across 51 test files.
- Pre-checkpoint remote refresh — baseline `HEAD` and `origin/main` both
  `60edfb32fff07f719be612a47fb825a8be4605bd`, divergence `0 0`, with only the
  primary worktree.

### What this did not do

No roster command, evaluation, validation, persistence, import, or BattleScribe
semantic behavior changed. The checkpoint did not redesign desktop layout,
change information density, add a device-specific navigation mode, save the QA
roster, modify New Recruit state, or begin any other roadmap item.

### Next recommended boundary

**A deterministic CI performance budget**, as one close checkpoint. Guard one
existing measured hot path without beginning whole-roster incremental
evaluation or expanding into a general benchmark framework.

## Completed Assignment — Usability Roadmap Residual Audit, 2026-08-24

Baseline `49a8dc970520cb7ec7a164cda8853a674ee47d2b`; resulting roadmap commit
`c5f8891` (`docs: restore usability roadmap residuals`). This was a
documentation-only checkpoint requested after comparing the original Grok
usability review with the current application and roadmap.

### What changed

Section F no longer uses one broad `Usability findings from the QA pass — Done`
row to represent both delivered cleanup and the larger review. It now records
the first cleanup as the bounded baseline it actually delivered and restores
explicit rows for:

- the compact points-and-problems header and remaining evaluator chrome;
- a tested workspace presentation model;
- configuration-versus-army separation;
- collapsible top-level units with live per-unit costs;
- shop/editor modes and focus of newly added units;
- legality-aware model-count controls;
- player-facing validation messages, which are already Done;
- flattened common loadouts and a dedicated Warlord control;
- the low-priority nested-group and unit-typed automatic shapes; and
- a print-output usability pass, separately from the completed phone-width pass.

The Current Status and Picking up sections now say that the first presentation
checkpoint was a subset, not closure of the broader audit. The deterministic CI
performance budget remains `Next`; restoring lost roadmap visibility did not
silently reprioritise the already-approved checkpoint.

### Decisions and rejected alternatives

Adding only the wholly unimplemented items was rejected because it would still
lose the unfinished halves of partially delivered outcomes such as the player
header, top-level collapse/per-unit costs, model controls, and print. Reopening
the completed presentation cleanup as a whole was also rejected: its exact
delivered behavior remains true and tested. Each residual therefore states the
existing baseline and the outcome still missing.

The roadmap vocabulary has no `Partial` status. Residual outcomes are `Open`
with their completed slice in the note; the two automatic shapes remain `Low
priority` because the pinned corpus still has no modifier-driven group using
them. Phone behavior and player-facing validation remain `Done`.

No architecture or compatibility document changed because no product behavior,
package boundary, or support claim changed. Reference Behavior QA was not
invoked: this checkpoint classified repository tracking against implemented
code and recorded evidence, not a New Recruit behavioral discrepancy. The edit
stayed with the active lead because a one-file roadmap correction offered no
concrete delegation advantage.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **497 passed, 18 skipped (515 total)** across 51 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, clean and
  intentionally three commits behind its moving `origin/main` — **515 passed**
  across 51 test files.
- Production build succeeded with only the existing large-chunk warning.
- Pre-checkpoint remote refresh — baseline `HEAD` and `origin/main` both
  `49a8dc970520cb7ec7a164cda8853a674ee47d2b`, divergence `0 0`, with only the
  primary worktree.

### What this did not do

No application code, test, dependency, build configuration, architecture
boundary, compatibility claim, diagnostic, corpus data, product behavior, or
roadmap priority changed. None of the restored product residuals began. No New
Recruit scenario, pull request, deployment, or external publication occurred.

### Next recommended boundary

**A deterministic CI performance budget**, unchanged. Keep it one close
checkpoint; the restored usability rows are now visible for later selection
without expanding this checkpoint into implementation.

## Completed Assignment — Usability Roadmap Sequencing, 2026-08-24

Baseline `ab54637c285a511dc7c502f6eae13cdc0fe4254e`; resulting roadmap commit
`9d62150` (`docs: sequence the usability roadmap`). This was a second bounded
documentation-only audit requested after the restored residuals exposed stale
corpus claims and an unordered set of otherwise valid `Open` rows.

### What changed

- The Dark Angels cost row now records the current evidence: all sixteen unit
  costs match the GW-exported list when Inner Circle Companions uses the list's
  six models. The two former source-data discrepancies disappeared at the
  current corpus pin.
- The obsolete `Community data can disagree with GW points — Open` row was
  removed. Its surviving diagnosis is `Done`: RosterForge had read stale data
  faithfully, and the implemented product response is to surface source
  freshness rather than claim a point-by-point GW comparison it cannot perform.
- Per-file update dates moved from `Open` to `Deferred`; the shipped
  repository-wide freshness signal avoids 46 GitHub requests, and no current
  decision needs per-file precision.
- Unicode-normalised name matching moved from `Open` to `Deferred` until
  `.ros`, cross-tool import, or another real external-name consumer exists.
- The deterministic CI budget remains `Next` and now sits beside the measured
  performance work it protects. After it, section F explicitly sequences the
  tested workspace presentation model, compact header, configuration split,
  collapsible costed units, shop/editor focus, legal model controls,
  loadout/Warlord presentation, and print usability.

### Decisions and rejected alternatives

Leaving the old GW rows as historical context was rejected because the roadmap
is authoritative current work, while the append-only research entries already
preserve the old 285/85 measurements. A future community-data mismatch remains
possible, but RosterForge has no independent GW value source; keeping an `Open`
comparison row would promise a capability with no defined input.

The workspace presentation model comes before visible restructuring even though
it changes fewer pixels. The following UI checkpoints otherwise risk deriving
the same costs, validation priority, configuration classification, and active
selection state independently in components. Whole-roster incremental
evaluation stays `Open` but non-urgent, and the low-priority automatic shapes
remain outside this sequence unless new evidence changes their rank.

No Reference Behavior QA was needed: the corrected points facts come from the
already-pinned corpus update and the sequencing is a project decision, not a
New Recruit discrepancy classification. The active lead kept the one-file edit
local because delegation offered no concrete advantage.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **497 passed, 18 skipped (515 total)** across 51 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, clean and
  intentionally three commits behind its moving `origin/main` — **515 passed**
  across 51 test files.
- Production build succeeded with only the existing large-chunk warning.
- Pre-checkpoint remote refresh — baseline `HEAD` and `origin/main` both
  `ab54637c285a511dc7c502f6eae13cdc0fe4254e`, divergence `0 0`, with only the
  primary worktree.

### What this did not do

No application code, test, dependency, build configuration, architecture
boundary, compatibility claim, diagnostic, corpus data, product behavior, or
New Recruit state changed. No restored product residual began, and no pull
request, deployment, or external publication occurred.

### Next recommended boundary

**A deterministic CI performance budget**, unchanged. Keep it one close guard
over an existing measured hot path; do not begin the presentation model or
whole-roster incremental evaluation in the same checkpoint.

## Completed Assignment — Deterministic Evaluation Work Budget, 2026-08-24

Baseline `ca7d0a8c0336f62df0b980be1243a0e1d49ca69c`; resulting implementation
commit `3a67697` (`test: add deterministic evaluation work budget`). This was
the approved close checkpoint after the phone-width pass and usability-roadmap
sequencing.

### What changed

`packages/evaluation/src/performance-budget.test.ts` now builds a fully
synthetic roster with fifteen root units and eight nested choices per unit: 135
selection occurrences, close to the 143-selection Dark Angels roster that
exposed the original performance defect. It executes the same four report
families used by the live workspace after an edit: selection-conditioned costs,
structural status, selection constraints, and force constraints.

The test observes the already-internal catalogue choice index and budgets
indexed resolution requests rather than elapsed milliseconds. The representative
pass makes exactly **19,275** indexed choice lookups and must remain at or below
**20,000**. The existing identity tests still protect reuse of the catalogue
index and flattened roster locations; this new guard catches excessive work
even when those cache identities survive.

### Decisions and rejected alternatives

A wall-clock benchmark was rejected because shared CI runner load would require
either a flaky threshold or enough tolerance to miss the regression. Exporting
instrumentation from `@rosterforge/evaluation` was also rejected: the test lives
inside the evaluation package and observes its internal map without widening the
production API.

The guard covers one complete workspace report pass instead of introducing a
general benchmark framework or beginning incremental evaluation. Its fixed
725-lookup headroom is deliberate. A sabotage run duplicated all four reports;
the count rose to **20,070** and the test failed, proving the ceiling catches a
meaningful extra-work regression. The duplicate calls were then reverted and
the focused suite returned green at the 19,275 baseline.

No Reference Behavior QA or delegation was needed: this checkpoint protects a
locally measured implementation cost and makes no New Recruit behavior claim.
The active lead kept the one-test change local because parallel work offered no
clear advantage.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **498 passed, 18 skipped (516 total)** across 52 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, clean and
  intentionally three commits behind its moving `origin/main` — **516 passed**
  across 52 test files; all 46 JSON documents remained external and gitignored.
- Production build succeeded with only the existing large-chunk warning.
- Pre-checkpoint remote refresh — baseline `HEAD` and `origin/main` both
  `ca7d0a8c0336f62df0b980be1243a0e1d49ca69c`, divergence `0 0`, with only the
  primary worktree.

### What this did not do

No production application or evaluator code, dependency, build configuration,
architecture boundary, compatibility claim, diagnostic, corpus data, or New
Recruit state changed. Whole-roster incremental evaluation did not begin, and
none of the restored presentation outcomes began. No pull request, deployment,
or external publication occurred.

### Next recommended boundary

**A tested workspace presentation model.** Keep it one close checkpoint: define
and test the immutable projection that later header, configuration split,
costed-unit, and shop/editor work will consume without beginning those visible
restructures yet.

## Completed Assignment — Workspace Presentation Model, 2026-08-24

Baseline `9c3faa94c2f07a3eb8a1f10bbac06532a9806eac`; resulting implementation
commit `a494d0e` (`feat: add workspace presentation model`). This was the next
approved close product checkpoint after the deterministic evaluation budget.

### What changed

`apps/web/src/roster-workspace-model.ts` now projects one immutable local roster
session plus its root-choice, cost, and supported-validation reports into a
single reader-facing model. It centralises:

- non-zero headline costs while retaining zero-value source fields;
- supported validity/completeness counts and violated-selection attention;
- exact `Configuration` root classification, with unknown and uncategorized
  roots retained in the army section;
- original-order selected roots split into configuration and army collections;
- recursively aggregated included costs for every selected subtree; and
- exact active-selection and ancestor state when a later editor supplies an
  active occurrence ID.

The model retains the source reports and roster occurrences by reference. A
failed report becomes an explicit unavailable presentation state without
dropping selected occurrences. It allocates one projection node and one small
cost accumulator per selection; `RosterOverview` memoizes the complete model by
immutable session so autosave and unrelated action-state renders do not repeat
that roster-sized work.

The existing workspace now consumes this model for metrics, costs, validation
priority, root groups, recursive selection traversal, and subtree-attention
opening. Structural and constraint detail cards plus print export reuse the
attached same-snapshot reports. No text, layout, navigation, or interaction was
redesigned in this checkpoint.

### Tests and decisions

Three new synthetic tests pin the contract. A Base Unit plus Child Upgrade
projects **15 Points**, retains **0 Supply**, aggregates the child's 5 points
into its top-level unit, and marks child-active ancestry. The initialization
fixture keeps `Units` and `Uncategorized` in the army section while separating
`Configuration`, and promotes a known Manual Group violation to attention. A
third case proves unavailable reports remain explicit while the selected tree
survives.

Putting this model in `evaluation`, `roster-model`, or `roster-builder` was
rejected because headline zero filtering, configuration grouping, attention,
and active editor state are presentation policy. Leaving the derivations in
React was also rejected: each upcoming layout checkpoint would otherwise
repeat and potentially diverge on the same rules. Runtime freezing and a new
state store were unnecessary; the source session and reports are already
immutable snapshots, and readonly projection types preserve that contract.

No Reference Behavior QA or delegation was needed. The checkpoint neither
classifies a New Recruit discrepancy nor changes BattleScribe semantics, and
the active lead retained the tightly coupled model/component/test edit because
another writer offered no clear advantage.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **501 passed, 18 skipped (519 total)** across 53 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, clean and
  intentionally three commits behind its moving `origin/main` — **519 passed**
  across 53 test files; all 46 JSON documents remained external and gitignored.
- Production build succeeded with only the existing large-chunk warning.
- Pre-checkpoint remote refresh — baseline `HEAD` and `origin/main` both
  `9c3faa94c2f07a3eb8a1f10bbac06532a9806eac`, divergence `0 0`, with only the
  primary worktree.

### What this did not do

No evaluator, roster-model, builder, persistence, dependency, diagnostic,
compatibility claim, corpus data, or New Recruit state changed. The compact
header, selected-tree configuration split, collapsible costed unit cards,
shop/editor modes, legal model controls, loadout/Warlord presentation, and
print-output pass did not begin. No pull request, deployment, or external
publication occurred.

### Next recommended boundary

**The compact points-and-problems player header.** Consume the workspace model
to combine the prominent supported costs and known-problem count while
preserving the independent completeness signal. Keep configuration separation
and top-level unit-card restructuring for their following checkpoints.

## Completed Assignment — Codex-To-Claude Lead Transfer, 2026-08-24

Baseline `e7c872509e02e8eb766a6f857dea09ec2d984f1f`; resulting workflow commit
`0c7d793` (`docs: define Claude lead transfer`) and transfer-record commit
`d74e07d` (`docs: record Claude lead handoff`). This was a documentation-only
ownership checkpoint requested after the workspace presentation model was
completed, committed, pushed, and confirmed by CI.

### Transfer state

Codex is the outgoing active lead and Claude is the incoming active lead. At the
start of this checkpoint, `HEAD` and `origin/main` both equalled the baseline,
divergence was `0 0`, the checkout was clean, and `git worktree list` contained
only `E:/GitHub/rosterforge`. No delegated writer or product checkpoint is in
flight. The last published product CI was run
[`32775259189`](https://github.com/ronincse/rosterforge/actions/runs/32775259189),
which completed successfully for that exact baseline.

Git transport credentials successfully pushed the transfer commits. Separately,
`gh auth status` reported that the stored `ronincse` GitHub CLI token is invalid;
the unauthenticated run listing then exhausted its public API limit. The final
Actions result was verified from the public run page instead. Claude should
reauthenticate `gh` before depending on authenticated GitHub-native CLI work;
this does not block ordinary fetch or push with the working Git credentials.

Claude should repeat the `AGENTS.md` session-start checks against the final
published `origin/main` before changing files. Once those checks agree, Claude
owns the primary checkout, ordinary implementation, architectural decisions,
delegate selection, integration, validation, handoff, commits, push, and CI
confirmation. This is a lead transfer, not a Claude Code delegation brief, so
the specialist's read-only default does not apply.

The roadmap intentionally did not move. Its single **Next** row remains the
compact points-and-problems player header. That checkpoint should consume
`apps/web/src/roster-workspace-model.ts`, combine supported headline costs with
the known-problem count, preserve validity and completeness as independent
signals, and remove remaining evaluator-oriented framing. Do not fold the later
configuration split, collapsible costed unit cards, or shop/editor mode into
that checkpoint. Use Reference Behavior QA only if a decision actually depends
on New Recruit behavior.

### Durable workflow correction

`docs/agent-workflow.md` now states when a formal lead transfer becomes active
and what its record must contain: exact baseline and remote relationship,
worktree and writer state, validation and CI evidence, incoming and outgoing
leads, the one Next boundary, and explicit exclusions. It also requires the
incoming lead to stop and reconcile any dirty checkout, remote mismatch,
concurrent writer, named-lead mismatch, or roadmap contradiction before
implementation.

Changing the model-role table or `AGENTS.md` was rejected because both already
say that Claude may become lead only through a formal handoff and that the
active lead receives the complete checkpoint authority. Architecture,
compatibility, and diagnostics documentation also remain unchanged because no
product boundary, behavior, or diagnostic moved.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **501 passed, 18 skipped (519 total)** across 53 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files,
  clean and intentionally three commits behind its moving `origin/main` —
  **519 passed** across 53 test files.
- Production build succeeded with only the existing large-chunk warning.
- Published transfer-record CI run
  [`32776711570`](https://github.com/ronincse/rosterforge/actions/runs/32776711570)
  completed successfully for `d74e07d`.

No delegation or Reference Behavior QA was needed. The work was a small,
repository-local documentation correction, and no behavioral discrepancy was
classified.

### What this did not do

No application code, test, dependency, build configuration, product behavior,
architecture boundary, compatibility claim, diagnostic, corpus data, or New
Recruit state changed. No product checkpoint, pull request, deployment, or
external publication began.

### Next recommended boundary

**The compact points-and-problems player header**, unchanged. Keep it close and
independently reviewable, then complete the normal handoff, push, and CI cycle.

## Completed Assignment — Claude-Lead Delegation Verification, 2026-08-24

Baseline `ad2934166b726314ad55ae2db3f95ae4db655b59`; resulting workflow commit
`b99a7cd` (`docs: add Codex delegation lane and fix Copilot template`) and this
handoff commit. This was the first checkpoint taken by Claude as active lead,
immediately after the Codex-to-Claude transfer recorded in the entry above. It
is a workflow/documentation checkpoint only; the product roadmap's **Next** was
deliberately not started.

### Why this checkpoint at all

The transfer left an untested assumption: `docs/agent-workflow.md` was written
from a Codex lead's seat. Every lane it documents is either Codex itself, a
native Codex child, or an external CLI invoked *by Codex*. Nothing described how
a non-Codex lead reaches Codex, and nothing had been executed from a Claude
session. Rather than assume the runbook transferred, all four external lanes
were run from Claude Code with a bounded read-only prompt and a unique sentinel.
Two of the four documented shapes turned out to be wrong or missing.

### What changed

- **Codex is now a documented delegated specialist** when the lead is not Codex:
  a Role Guidance row, a decision-path row, and a
  `### OpenAI Codex: bounded read-only analysis` template using
  `codex exec --sandbox read-only -C <repo> --ephemeral`. The runbook previously
  described Codex only as lead or as a native child of a Codex lead.
- **The Copilot template was broken as written and is fixed.** It paired a
  multi-line PowerShell here-string with `copilot.cmd`. `cmd.exe` cannot carry a
  newline inside an argument, so only the **first line** of the prompt reached
  the model, silently and with no error. Two runs were lost to this: a prompt
  beginning "Read AGENTS.md first" made Copilot read the file and then ask what
  was wanted, and one beginning "Answer this question now" made it reply that it
  could not see a question. The identical prompt through `copilot.ps1` answered
  correctly, so the template now invokes the `.ps1` shim.
- **`--sandbox read-only` is documented as *not* preventing command execution.**
  The Codex delegate ran `node -e "console.log(Number('0x10'))"` through pwsh,
  unprompted, to settle a question it had raised itself. The isolation section
  now says the mode bounds mutation but not execution, which matters because the
  runbook's own rule is that a tool label is never sufficient evidence.
- **The resolved-executable table gained `codex`** at
  `C:\Users\stone\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe`, plus a
  warning that `Get-ChildItem` returns nothing for that directory on this host
  while `cmd /c dir /s /b` lists it. That trap cost real time: an empty listing
  reads exactly like "Codex is not installed". `copilot` in the same table now
  points at `copilot.ps1`.
- **The Operational Verification Record gained the rehearsal**, including the
  `gh` token state inherited from the transfer.

### Decisions and rejected alternatives

Codex was given the *delegate's* read-only default rather than a writer role.
Its strengths here are review, debugging, and second opinions; a Claude lead
reviewing its own plan is the case where model diversity actually pays. Granting
it a writer worktree by default was rejected as authority nobody had asked for.

The shared-quota warning was written into the role table rather than left as
folklore. Codex delegation spends the same OpenAI allowance a Codex lead spends,
so it is explicitly *not* a workaround when Codex has hit its limit.

Changing `AGENTS.md` was rejected: it already says a capable model may become
lead by formal handoff and that the lead selects delegates. Only the operational
runbook lacked the Codex-as-delegate shape.

Antigravity's smoke used the documented disposable worktree at the exact
baseline, created and removed with the runbook's guarded path check, because its
permissions cannot be proven read-only. Running it against the primary checkout
would have been faster and was rejected: the checkout is the lead's, and at the
time it held work that had not yet been committed.

### Verification

- All four lanes returned a correct, cited answer with its sentinel:
  Antigravity 1.1.19, Grok Build 1.0.5 ($0.0148, `grok-4.6-build`),
  GitHub Copilot CLI 1.0.80 (only via `copilot.ps1`), and codex-cli 0.149.1.
- `codex login status` reported `Logged in using ChatGPT`. This is the only
  **non-mutating** authentication check any of the five CLIs offers; `agy`,
  `grok`, and `copilot` expose only `login`/`logout`, which mutate stored
  credentials, so their authentication is provable only by a successful run.
- Both *edited* command blocks were then re-executed verbatim as written in the
  runbook, the Copilot one with a genuinely multi-line here-string, and both
  returned their sentinel.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **501 passed, 18 skipped (519 total)** across 53 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files,
  clean and gitignored — **519 passed** across 53 test files.
- Production build succeeded with only the existing large-chunk warning.
- The primary checkout ended byte-identical to its baseline after the smoke
  tests, before any edit: clean status, `HEAD` equal to `origin/main`, only
  `main`, only the primary worktree, no stash. The `agy` worktree and its
  `claude/lead-rehearsal` branch were removed.

### A finding this produced, deliberately not acted on

The Codex smoke reviewed `packages/evaluation/src/selection-default-amount.ts`
and reported that `Number(raw)` at line 188 accepts `0x10`, `0b10`, `0o10`, and
`1e3`, so a malformed source value initializes silently and reports *complete*
rather than raising `EVALUATION_SELECTION_DEFAULT_AMOUNT_INVALID`. The line was
read and the claim holds against the code; the comma case immediately above is
already guarded, so the gap is narrow.

It is **not** recorded as a defect and `docs/compatibility.md` was not touched,
because no corpus measurement was taken: whether any of the 46 pinned documents
contains such a value is unknown, and this repository's own rule is to measure
the corpus before deciding what a construct means. It is now a roadmap row in
section B so the next lead can measure it rather than rediscover it.

### What this did not do

No application code, test, dependency, build configuration, product behavior,
architecture boundary, compatibility claim, diagnostic, corpus data, or New
Recruit state changed. The compact points-and-problems player header did not
begin. No Reference Behavior QA ran, and no New Recruit behavior is claimed. The
`gh` token was not repaired. No pull request, deployment, or external
publication occurred.

### Next recommended boundary

**The compact points-and-problems player header**, unchanged and still the
roadmap's single **Next**. It should consume
`apps/web/src/roster-workspace-model.ts`, combine supported headline costs with
the known-problem count, keep validity and completeness independent, and drop
remaining evaluator-oriented framing. Do not fold the configuration split,
collapsible costed unit cards, or shop/editor mode into it.
