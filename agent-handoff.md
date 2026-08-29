# RosterForge — Agent Handoff And Work Order

The shared status and work-order document for every model working on this
repository. `AGENTS.md` governs *how* to work. This file records *what is done,
what is left, and what is blocked*.

It does **not** define what the product is. `docs/product-vision.md` does:
the north star, the BUILD → VALIDATE → PLAY lifecycle, the v1 and v2 acceptance
definitions, the reference army those claims are measured against, the
non-goals, and the five-question decision test. `docs/architecture.md` defines
*how* the software is structured, and `docs/compatibility.md` defines *what*
imported behavior is supported. A roadmap row here that cannot be justified
against the vision should be challenged rather than inherited.

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

## Current Status — 2026-08-29 (sticky roster identity simplified; active-roster system remains Next)

RosterForge reads BattleScribe 2.03 community data and builds matched-play
rosters. It is a pnpm/TypeScript monorepo; `docs/architecture.md` owns package
layering and evaluator boundaries, `docs/compatibility.md` owns the exhaustive
record of what is and is not supported, and `docs/diagnostics.md` owns
diagnostic codes.

- **Branch.** Stable `main` remains at `3e9d05d`, where CI is green. The owner
  requested that the major interface overhaul proceed on the isolated
  `codex/list-builder-ui-overhaul` branch so an overreaching design can be
  abandoned without destabilising the product. Push each verified checkpoint
  to that branch, but do not merge it to `main` or open a pull request without
  the owner's explicit review. See `AGENTS.md` "Publishing" for the remaining
  external-write rules.
- **Commit attribution.** Every commit must now end with a `Co-Authored-By:`
  trailer naming the model that wrote it; `AGENTS.md` "Publishing" holds the
  exact strings. Git authors every commit as the owner's account, so this
  trailer is the only thing in `git log` that separates one model's checkpoint
  from another's. Before this rule, 134 of 197 commits carried a trailer and all
  134 said `Claude Opus 5`, because Claude's tooling added one unprompted and
  nothing asked it of anyone else. An unmarked commit older than 2026-08-24
  therefore means only "not Claude". History was not rewritten.
- **Active lead.** **Codex resumed the lead on 2026-08-26.** The formal pickup
  checks passed at `9a7ea3b54ed663b72b615823e092b8cc51509bcb`: clean checkout,
  `HEAD` equal to freshly fetched `origin/main`, divergence `0 0`, only the
  primary worktree, no stash, no concurrent writer, and a roadmap `Next`
  matching the transfer record. Child-model statlines, bounded catalogue
  placement, inline known-violation markers, explicit group-choice
  deselection, stable name-only choice labels, detailed report demotion,
  persistent points capacity, readable imported keywords, direct-choice
  toggles, wide-screen use, and a full-width collapsible configuration step
  were then completed under the resumed
  lead. Configuration selections and exact model occurrences now collapse
  independently; repeatable model choices use explicit minus/count/plus
  controls; and collapsed unit cards retain an exact total-and-type model
  composition summary. Direct required upgrades with complete known minima now
  remain visibly selected and cannot be removed below their floor; replacement
  groups and unresolved bounds retain their existing permissive behavior. Army
  unit rows are now compact grouped-list disclosures: each row carries exact
  model/loadout composition, structural role/status pills, recursive points,
  and one action that focuses the dedicated options surface. Read-only View and
  destructive Remove actions live in that inspector rather than competing on
  every row. The catalogue is now a closed-by-default Add unit sheet rather
  than a permanent builder column; compact layouts use the full viewport and
  focus search, regular layouts use a centred modal and focus Close, and a
  successful army add closes the task and focuses the new row. The outer
  builder never becomes a permanent three-pane layout, and nested validation
  links focus the owning unit before resolving a lazy anchor. The advanced
  per-occurrence model editor now applies complete
  known selection and transparent-group minima/maxima to their observed
  aggregates, rejects new known violations, and permits monotonic recovery from
  already-invalid state; incomplete bounds remain permissive. Concrete root,
  direct-child, repeatable-model, and grouped choices now have visually
  integrated page-information actions. Unit previews expose authored
  unit/model statlines, rules, keywords, supported static initial equipment,
  and separately collapsed model/loadout alternatives without creating a
  roster occurrence; completely known empty keyword sets no longer render an
  empty section. Catalogue roots now lead with one authored cost, a compact
  selected/maximum count, a plus-only add action, and a larger disclosure
  marker; conditional source maxima are labelled `base` and never enforced as
  evaluated capacity. Detachment choices and costed upgrades use the same cost
  treatment. The sticky navigator keeps one source-stable primary capacity while
  secondary currencies move under `Other roster limits`, and imported
  filenames and materializer reason codes are confined to collapsed Developer
  details. Typography is larger and uses a condensed block face from the local
  system font stack. Common transparent loadout wrappers now present their
  authored
  child groups as one shallow hierarchy while retaining aggregate bounds, and
  exact one-per-roster upgrade roles such as Warlord have a dedicated toggle
  above ordinary loadout controls. Configuration now keeps its relevant
  evaluated secondary capacity visible while collapsed, including the live
  Detachment Point total and limit. The sticky navigator now
  prefer a finite-limit currency actually authored on addable army roots, so
  roster Points remain primary even when Detachment Points are declared first;
  Configuration and secondary-limit details retain the Detachment Point budget.
  Configuration presentation also puts Battle Size before Detachment without
  rewriting durable roster order. JSON catalogue-root `rules` collections now
  join `sharedRules` in the typed projection, so Aeldari Battle Focus resolves
  to its authored rule text instead of a player-facing unavailable fallback. An
  open unit card now scrolls into view only when the player explicitly opens a
  different card, not whenever any roster interaction rebuilds its projection.
  Validation coverage uses player language (`Some rules not checked`), does not
  force an otherwise-valid technical report open, and keeps exact evaluator
  codes in collapsed Developer structural/constraint disclosures rather than
  duplicating them in the player workflow. Supported direct conditional root
  modifiers now evaluate against the live single-force roster: pinned
  Incursion maxima are Dire Avengers 2 and Guardian Defenders 4, and selected
  root validation uses the same effective limit. Import and graph diagnostics
  are retained as collapsed Developer notes rather than making a fully usable
  catalogue look partially loaded; `primary-catalogue` identity literals no
  longer create false missing-reference warnings. Focused repository loads now
  materialize and expose only the catalogue the player selected while retaining
  every transitive dependency in the graph for linked roots and definitions;
  the Dark Angels closure no longer promotes Space Marines and Agents to peer
  workspace buttons, and its Space Marine unit choices remain available.
  Roster setup now occupies the full workspace width without a persistent
  catalogue-library summary column. Intentional multi-catalogue local imports
  retain a compact labelled chooser; stale/unknown data, rejected files,
  truncation, and missing-game-system states remain visible, while the complete
  file report and batch diagnostics stay in collapsed Developer details. Live
  selected-child inspection now evaluates a modifier-driven constraint when
  the constraint and modifier belong to the same direct choice or transparent
  group. Pinned Aeldari `Detachments` is exactly max one for Incursion after a
  3 Detachment Point choice and remains unbounded at Strike Force; the former
  unresolved group bound and its compatibility diagnostic are gone. Static
  pre-selection initialization and ancestor-carried child modifiers remain
  conservative and diagnostic. On the isolated overhaul branch, an open roster
  now mounts a dedicated full-window screen instead of remaining nested in the
  Lists/import shell; closing it restores the preserved library, recovery, and
  acquisition state. A durable Apple-informed web design-language contract now
  owns navigation, grouped-list, sheet, inspector, typography, spacing,
  accessibility, and responsive conventions for the remaining overhaul.
  Required configuration cards collapse after their last known required child
  choice is satisfied, retain optional/incomplete state, return focus to their
  disclosure, and reopen for supported attention. Force-definition category
  minima now enter supported validation as their own report family. The pinned
  Aeldari Character requirement therefore appears directly in an empty roster
  role as `0 / 1 required`, and the same violation appears in a modal problem
  sheet opened from either persistent Checks counter. Unit View actions now
  open a modal reference sheet with compact semantic profile tables instead of
  inserting a long card into the roster document; Escape restores focus to the
  invoking View button. Configuration is now a closed-by-default settings row
  with selected setup values, primary and setup capacities, visible attention,
  and exact validation-link reveal into the complete retained editor. The
  sticky roster navigator now uses a dense blurred material, every top-level
  army unit owns a separately spaced thicker material card, and the shared
  modal overlay blurs the whole viewport behind its sharp task surface. Blur
  remains progressively enhanced with opaque reduced-transparency,
  increased-contrast, and forced-colors fallbacks. Every active-roster
  rectilinear card, field, dialog, disclosure, and button now consumes one 14 px
  corner token; joined controls retain that radius only on exposed corners,
  while full-bleed and surface-free wrappers remain square. Nested unit and
  Configuration options are distinct higher-opacity inset material cards inside
  their overall group without adding a backdrop filter to every child. A style
  contract rejects new off-system numeric radii in the active-roster CSS.
  The former large roster summary card is now removed. The sticky navigator is
  the first workspace element and carries the roster name, chosen faction,
  preferred live cost, Add unit count, and one compact warning triangle/count.
  Combined cost/check completeness, secondary limits, zero-value source fields,
  and Developer cost diagnostics remain under Detailed supported evidence below
  the roster rather than being discarded or repeated above it.
  **The `Next` remains the complete shared active-roster component and token
  system; these owner-requested material and card-geometry slices did not claim
  that broader migration.**
- **Prior transfer.** The Codex-to-Claude transfer
  published by `0c7d793`/`d74e07d` is complete, and the pickup checks that
  `docs/agent-workflow.md` "Formal Lead Transfer" requires were repeated against
  `ad2934166b726314ad55ae2db3f95ae4db655b59` and agreed: clean checkout, `HEAD`
  equal to `origin/main`, divergence `0 0`, only the primary worktree, no stash,
  no concurrent writer, and a roadmap `Next` matching the transfer record. The
  transfer itself was taken at product baseline
  `e7c872509e02e8eb766a6f857dea09ec2d984f1f`, which is a historical fact about
  the transfer and not a current pointer. For where the product stands now, read
  the roadmap and the newest completed entry rather than any commit named in
  this bullet — that is what they are for, and a second moving pointer here only
  goes stale. Returning the lead to Codex uses the same procedure.
- **GitHub CLI.** `gh` 2.97.0 is **working and authenticated** from a Claude
  Code session: `gh auth status` shows the `ronincse` keyring token with
  `gist, read:org, repo, workflow`, `gh api rate_limit` returned 4,994 of 5,000
  remaining, and `gh run watch` confirmed this checkpoint's CI. The outgoing
  lead's "invalid token" note is superseded — the credential is fine, and the
  failure was almost certainly the Codex sandbox being unable to read the
  Windows keyring, the same authentication-store dependency already recorded
  for Copilot. Do not reauthenticate on the strength of the old note; run
  `gh auth status` in your own environment first.
- **Agent workflow.** `AGENTS.md` distinguishes a formal lead handoff from
  bounded delegated work; Codex is the preferred default lead, not the only
  model allowed to own a checkpoint. Routing is now **lead-neutral**: the active
  lead implements, while native and external lanes are chosen intentionally for
  their actual strengths, permissions, information value, and coordination cost.
  Preserving lead capacity through real work on another provider is now an
  explicit legitimate benefit, and a two-native-checkpoint streak breaker makes
  the next lead look for a useful external lane without manufacturing work to
  satisfy a quota. The capable non-lead frontier model still reviews where model
  diversity matters — Claude when Codex leads, the Codex CLI when Claude leads
  and its quota allows. Two transfer modes exist: the planned **Formal Lead Transfer**,
  and an **Interrupted Lead Takeover** for a lead that vanishes mid-checkpoint
  without publishing one, which preserves the dirty tree as evidence and
  finishes the checkpoint already in progress.
  `docs/agent-workflow.md` holds the least-privilege task brief, worktree,
  review, integration, cleanup, handoff, push, and CI procedures for native
  subagents of either lead, the Codex CLI, Claude Code, Antigravity, Grok, and
  Copilot. Bounded New Recruit Reference Behavior QA goes to a verified
  browser-capable native subagent of the active lead, with that lead as the
  direct fallback and final classifier; **both lanes are verified for Codex and
  for Claude**. Antigravity independently analyzes captured QA evidence; the
  installed headless `agy` 1.1.19 client verified on 2026-08-24 exposes only
  static HTTP retrieval, which cannot reach New Recruit's rendered state, so it
  is not an executor **at that version**. The lane stays capability-gated rather
  than closed by policy: re-probe after an upgrade and record what it can
  actually do. Native spawning for both leads, lead and child browser
  actuation for both, all four external read paths, and one disposable Grok
  writer were exercised. The Codex CLI is a documented delegated specialist
  under `--sandbox read-only`, sharing the Codex lead's quota, and read-only
  there bounds mutation but not command execution. A native Claude child does
  **not** inherit `CLAUDE.md`/`AGENTS.md` and holds a shell despite its
  read-only role label, so its brief must name the rules and any possible write
  needs a worktree. The Copilot template was corrected because `copilot.cmd`
  silently truncated multi-line prompts. **Substantive application checkpoints
  now plan delegation up front:** zero delegates is normal for tiny/mechanical
  or documentation-only work, a normal product checkpoint targets one useful
  lane, complex work targets one or two, and semantic/architectural/high-risk
  correctness work expects model-diverse review when available. These are
  judgment-based targets, not quotas; the lead remains primary implementer and
  sole integrator, validator, handoff author, publisher, and CI owner.
- **Gates.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` all pass. `pnpm test` is **532 passed, 19 skipped (551)**.
  The production build retains only Vite's existing large-chunk warning.
- **Pinned corpus.** `E:\GitHub\wh40k-11e` at commit
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files, gitignored and
  never committed. With `ROSTERFORGE_BSDATA_JSON_DIR` set the complete suite is
  **551 passed**; without the variable the 19 corpus tests are skipped.
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
  active-selection ancestry. The sticky navigator consumes that model for the
  roster identity, preferred live cost, and compact known-problem count; the
  conservative combined completeness fold remains under Detailed supported
  evidence. The selected-roster tree now consumes the model's
  classification too, rendering `Configuration` and `Army units` as separate
  titled sections, and army cards now collapse behind their name while showing
  the projection's recursive per-unit cost. **The owner then stated the product
  goal and settled the sequencing**: this is for building a viable 40k list, so
  the list and its unit stats are the focus, and building splits into a
  choosing phase and a reading phase where the catalogue gets out of the way.
  Section F opens with that goal. The initial list-first restructure is complete
  and the broader interface overhaul continues as bounded checkpoints;
  **battlefield-role grouping is done** — the tree now reads
  Configuration, Character, Battleline, Vehicle and so on, from each unit's
  effective primary category. Top-level unit and direct child-model statlines
  now share one modal unit-card action; upgrades and nested model wargear remain
  behind their exact configuration disclosures. The permanent catalogue column
  is gone. Add unit now opens a grouped, filterable task that retains search
  state, uses a full-screen compact sheet and centred regular modal, keeps
  catalogue preview separate, and returns the player to the roster after a
  successful army add.
  Battlefield-role headings now signal when they contain a known violation,
  and only the exact owning selection row receives the inline `Known violation`
  marker and reciprocal link to Checks. Unresolved coverage remains separate
  and never marks a roster row. Grouped concrete choices now separate removal
  from addition: the option keeps the same visible name while its existing
  filled/pressed state communicates selection, clicking a selected option
  deselects one newest matching occurrence, and legitimate repeats use an
  explicit `Add another` action constrained by both the aggregate group and the
  exact occurrence's effective maximum. Configuration no longer occupies an
  army-list role block: it is a closed-by-default settings row after the
  sticky navigator and before the roster builder. Its compact summary preserves exact
  selected values, primary and setup capacities, and known attention while the
  complete editor remains one action away. New supported attention reopens the
  controls, and exact validation links reveal and focus hidden configuration
  targets.
- **Product definition.** `docs/product-vision.md` now carries the north star,
  the BUILD → VALIDATE → PLAY lifecycle, the v1 and v2 acceptance definitions,
  the reference army (**2,000-point Dark Angels**, detachment, character with an
  enhancement, squad with wargear replacements, dedicated transport), the
  non-goals, and a five-question decision test for new work. `.ros`/`.rosz`
  interchange is now a **stated non-goal**, not a deferral. The newest entry at
  this file's end carries a roadmap review against that bar — recommendations
  only; **no row was reordered or restatused**, and it names one missing v1
  milestone: nobody has ever built the reference army.
- **Reference army.** That milestone has now had its first run, against pinned
  BSData `04c62fc` and Dark Angels revision 3. Detachment, enhancement, wargear
  replacement, dedicated transport, and save/reopen/revise all worked; the run
  stopped at **325 points across five units** rather than a full 2,000. It found
  a **false known violation** — `Code Chivalric`, an Imperial Knights entry, is
  reported violated on every Dark Angels roster and cannot be satisfied — which
  is now the **Next**. It also found that roster duplicate is unreachable in the
  UI, and that "non-zero" is the wrong rule for the headline cost.
- **The reference army is now built in full**: a legal 2,000-point Unforgiven
  Task Force, 16 costed units summing exactly, every genuine violation resolved.
  With the army correct, RosterForge reports **1 structural violation and 0
  constraint violations — and that one violation is the phantom `Code
  Chivalric`**. It cannot currently call a correct Dark Angels army legal. The
  full run also found that a 13.6 MB draft is **not durable when the shelf says
  it is saved**: reloading ~1.5 s after saving lost the last 330 points, while
  an 8 s wait restored all 2,000. **Costs are now verified against Games
  Workshop's official Munitorum Field Manual v1.2**: 11 of the reference army's
  12 unit costs matched exactly, and the one mismatch — Intercessor Squad, 80 in
  the pinned data against 75 in MFM — was traced to BSData lagging GW, not to
  RosterForge, by reading `pts: 80` straight out of the corpus. MFM also prices
  many units by copy count (1st–2nd versus 3rd+); the reference army never
  crosses a tier, so that behavior is **untested in either direction**.
- **The phantom violation is fixed.** Root bound enumeration now honours dynamic
  visibility, the same rule the add browser already used, so a root the player
  is never offered no longer contributes a requirement. A configured Dark
  Angels roster reports **0 known problems, "NO KNOWN VIOLATIONS"**; before it
  could not be legal at all. A delegated `codex exec` review caught a real bug
  in the first attempt — a hidden root that is *selected* must keep its bounds
  — and the corpus caught the completeness change.
- **Save durability is not a defect.** Measured and independently audited on
  2026-08-26: a save takes about 1 s, the unsaved-changes indicator clears only
  when it completes, and every save-then-reload round-tripped exactly. A
  mid-write kill does lose the in-flight edit, but the `beforeunload` guard is
  active then, so a real user is warned. The commit ordering is now pinned by a
  test. The delegated audit did find a real **recovery-slot resurrection race**
  on a roster's first save, which was fixed the same day: both slot writers now
  queue on one chain (`apps/web/src/recovery-slot.ts`) so the clear cannot be
  overtaken by a write already in flight. **Local durability now has no known
  defect.**
- **CI recovered.** Run `#32997233432` for the child-model handoff at `ab8bb7e`
  passed and checks the full tree including the earlier recovery-slot,
  top-level datasheet and delegation-policy work. The old `95d9a79` run remains
  wedged as queued with no jobs, but later green runs supersede it as
  verification evidence.
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

The first phone-width QA pass, deterministic CI performance budget, tested
workspace presentation model, compact sticky identity hierarchy, battlefield-role grouping,
one-click unit/model statlines, focused catalogue task, inline
violation markers, safe group-choice controls, and report-section demotion are
complete. Persistent limit-bearing costs, wide-screen use, readable imported
keywords, stronger configuration separation, and safe direct-choice controls
are complete too. The selected-unit workspace, bounded per-occurrence model
amount editor, loadout/Warlord presentation, catalogue readability pass,
configuration cost-capacity summary, root JSON rule projection, stable unit-card
scroll behavior, player-readable check coverage, condition-aware live root
maxima, the scoped Add unit sheet, and the compact Configuration summary are
complete. The owner has now
reprioritised the product around the
list-builder overhaul on `codex/list-builder-ui-overhaul`; the dedicated active
roster shell, compact grouped army rows, focused reference dialogs, Add unit
sheet, compact Configuration row, and requested blurred-material foundations
are its completed seams. **Apply the complete shared active-roster
component/token system Next.** The remaining pinned Aeldari matched-play
coverage, roster duplication,
and whole-roster incremental evaluation stay Open. Take the overhaul sequence
in the dependency order stated in section F rather than treating table position
or raw status as priority.

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
| Structural, selection-condition, force-category, and force-constraint reports | Done | pinned category-link coverage is two Character minima across the 46-document corpus; wider category shapes remain incomplete |
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

**What this product is for.** Stated by the owner on 2026-08-24, and the measure
every row below should be judged against: building a **viable list for the
chosen game system**, 40k first. Two things follow from that.

1. **The list, and the stats of the units in it, are the focus.** Not the
   evaluator's reports. Costs and checks matter because they tell a player
   whether the list is legal and affordable; they are not the subject of the
   page.
2. **Building has two phases with different needs.** While choosing units,
   browsing the catalogue should be pleasant. Once the list exists, scrolling
   it to find a unit's stats and rules must be effortless, and **the catalogue
   should get out of the way**. A finished list is something you read at a
   table, not something you keep shopping in.

New Recruit is the **usability baseline**, not a design to copy. Matching its
information architecture where it is better is intended; reproducing its visual
design, markup, or code is not, and the Reference Behavior QA boundary still
applies.

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
| Full-width roster setup and import-context demotion | Done | removed the persistent catalogue-library column and its batch metrics/cards; setup is one primary full-width region. A labelled chooser appears only for intentional multi-catalogue local imports, actionable import/freshness warnings remain visible, and full file/diagnostic evidence stays under Developer details |
| Detachment enhancements never offered | Done | `ancestor` scope resolved against an empty chain for prospective children; 2,635 corpus conditions affected. Four Virulent Vectorium enhancements now offered, and only those |
| Browse pin stale against the measured corpus | Done | the app's configured source was still on the old revision after the re-pin |
| Allied config auto-inserts into a force | Done | roster creation filters roots by visibility; Knights keeps `Code Chivalric`, other factions come up with three config slots |
| NOTICE text offered as an addable unit | Done | roots the catalogue hides are no longer offered; `[Legends]` units hide until `Show Legends` is picked, as in BattleScribe |
| `skipIfPresent` on modifiers | Done | 359 modifiers across 20 files. Semantics pinned on the New Recruit wiki, not inferred: the guard is a **separate string from the appended value**. The pinned Manreaper's Keywords went from blank to the full four |
| First QA presentation cleanup | Done | violation-first checks, reader-hidden occurrence IDs, collapsed zero-value campaign costs, clearer model/wargear/Warlord disclosure, exposed model quantities, and details-level display-name notices; this is the delivered subset, not closure of the rows below |
| Tested workspace presentation model | Done | one pure same-snapshot projection now owns headline/zero costs, violated-selection attention, exact Configuration-versus-army classification, recursive top-level costs, unavailable states, and optional active-selection ancestry; the current DOM consumes it without a layout change |
| Compact points-and-problems player header; remove remaining evaluator chrome | Done (superseded) | the separate cost and validation cards, `Forces`/`Selections` metrics, and satisfied/violated/unresolved triple were removed. The later owner-directed sticky-identity checkpoint removed the interim `Roster summary` card too: roster name, faction, preferred cost, and compact warning/count now live in the sticky bar, while the conservative completeness fold and retained cost evidence live under Detailed supported evidence |
| Separate configuration from army units | Done (superseded) | the selected-roster tree renders two titled sections, `Configuration` first then `Army units`, consuming the projection's existing classification; empty sections render nothing, and per-section labels use the same summed-amount measure as the pane heading. Verified on a pinned Death Guard roster: Detachment/Battle Size/Force Disposition in Configuration, Lord of Contagion in Army units, 3 + 1 matching `4 top-level selections` |
| Collapsible top-level army units with per-unit costs | Done | army cards collapse behind the unit name as the disclosure control and render their body only while open. Configuration selections start open but now collapse independently inside the outer setup step, and promoted direct model occurrences collapse independently inside a unit. Every selection card reopens when it gains supported attention. The always-visible unit row shows recursive cost plus exact total-and-type model composition |
| Build phase and reference phase | Done | Newly added and explicitly selected army units focus one dedicated options surface that reuses the existing mutation controls; configuration never enters it. Compact rows retain cost and exact model composition, and a separate `View` opens the complete read-only card. The outer builder is roster list plus options at two columns maximum; the catalogue is a transient Add unit sheet and phone widths use its full viewport. Nested validation links focus their owning unit before resolving lazy anchors |
| Headline cost against its points limit | Done | complete finite force-cost maxima are projected by exact cost-type ID, never guessed from names. Limit-bearing totals render even at zero; the sticky workspace bar keeps used, maximum, and remaining capacity visible while scrolling. Live pinned Aeldari QA showed `90 / 2,000 pts` and `1,910 remaining`; Detachment Points and Enhancements retained their own source limits without displacing points from the sticky lead |
| Wide-screen workspace and configuration setup | Done | the fixed 1,240 px application-shell cap was removed while viewport gutters remain; the original 1,920 px measurement was a 1,865 px shell with a 1,351 px roster and 400 px catalogue, and Add unit has since removed that catalogue column entirely. Configuration remains a full-width, closed-by-default setup disclosure after the sticky navigator and before the roster builder; its summary repeats exact capacity, the whole step and each configuration selection collapse independently, validation links reveal hidden targets, and configuration does not inflate the army-selection count |
| Imported category IDs leak into Keywords | Done | an imported materialized entry can carry category links whose definitions are outside the primary catalogue's local category view. The authored link name is now the fallback after canonical local definitions, so pinned Corsair Voidscarred renders Anhrathe/Aeldari/etc. rather than five opaque target IDs; unresolved semantics are not hidden by an ID-shape regex |
| Legality-aware model-count controls | Done | repeatable exact model choices use visible minus/count/plus controls: plus adds a distinct occurrence, minus removes only one model, and known maxima disable plus. The advanced per-occurrence editor evaluates complete condition-aware selection and transparent-group minima/maxima against their observed aggregates; legal state cannot create a known violation, already-invalid state may make a monotonic partial repair, and incomplete bounds remain permissive/incomplete |
| Player-facing validation messages | Done | known violations are separated from unresolved coverage, name their owners, and link to exact occurrences while retaining the full-legality boundary |
| Preview catalogue choices before selection; suppress empty Keywords sections | Done | concrete root, direct-child, repeatable-model, and grouped choices use a visually attached page-information action. The modal exposes authored rules, profiles, readable source keywords, supported static initial unit/model/equipment composition, and separately collapsed model/loadout alternatives without mutating the roster or claiming roster-dependent values are effective. Completely known empty keyword sets render no section; removed, incomplete, and unresolved evidence stays visible |
| Flatten common loadout groups and add dedicated Warlord controls | Done | the evaluator's flat inspection remains intact, while the workspace reconstructs exact materialized group ancestry so a choice-less `Wargear` wrapper becomes context around its Melee/Ranged children instead of a false empty fieldset; aggregate parent status now counts those descendant selections. One-per-roster upgrade categories with exact authored min/max-one roster constraints render as a dedicated `Roster role` toggle above loadouts, without name/ID inference, blocking invalid zero/multiple states, or auto-transferring the role |
| Catalogue cost, count, and control readability | Done | root units show one authored source cost, a compact selected/maximum counter, a plus-only add segment, and a larger category disclosure; detachment and costed upgrade choices show their own source currency. Dynamic values are visibly qualified as `base`. The sticky budget prefers a finite-limit currency authored on addable army roots by exact cost-type ID, so roster Points remain primary even when Detachment Points are declared first; Detachment Points stay visible with Configuration and other roster limits. Configuration presents Battle Size before Detachment without changing stored roster order. Import provenance and materializer reason codes stay behind explicit disclosures rather than competing with player actions |
| Condition-aware root repetition maxima in the add catalogue | Done | supported direct conditional modifiers evaluate against the current single-force roster while static pre-roster initialization stays conservative. Pinned Incursion limits are Dire Avengers 2 (base 3) and Guardian Defenders 4 (base 6); the catalogue counter and structural validation consume the same effective maxima, and unresolved applicability still withholds rather than guesses |
| Remaining pinned Aeldari matched-play check coverage | Open | classify and close the remaining valid-but-incomplete families independently: one relevant root has unresolved visibility, and selected units retain unsupported association attributes/fields plus hidden Crusade Battle Honours and Weapon Modifications constraint fields. The selected Detachments modifier-driven bound is done: owner-local live evaluation proves max one for Incursion with a 3 Detachment Point choice and unbounded for Strike Force. Measure each remaining shape and use Reference Behavior QA where semantics are not settled; do not suppress a diagnostic merely because it is campaign-oriented or technically phrased |
| Selected group choices re-add themselves instead of deselecting | Done | each concrete choice keeps one stable name-only label and communicates state through its filled `aria-pressed` styling; clicking a selected choice removes it. Legitimate repeated entries retain a separate `Add another` control while aggregate and exact effective capacity remain. Existing accidental duplicates are removed newest-first, one undoable configured subtree at a time |
| Selected direct choices require scrolling to Remove | Done | direct entry and entry-link quick choices now use the same stable name-only toggle: clicking a selected choice removes the newest exact occurrence. Legitimate repeats retain a separate `Add another` action while direct and effective exact maxima have capacity. Pinned Corsair Voidscarred's max-one Mistshield toggled from the same button and correctly exposed no add-another action |
| Required direct wargear can be stripped from a model | Done | a selected direct `upgrade` with a complete positive minimum is disabled only when removing the newest occurrence would breach that minimum. Pinned Dark Reaper Close combat weapons and the regular model's Reaper Launcher are protected; the Exarch's grouped Reaper Launcher remains replaceable. Surplus copies remain removable and incomplete bounds remain permissive |
| Nested automatic groups and unit-typed automatic sub-units | Low priority | measured ordinary-entry and direct-child group reconciliation is complete; these two remaining autofill shapes are diagnosed and withheld, and none of the five modifier-driven pinned groups uses either shape |
| Unit stats and rules are buried two disclosures deep | Done | top-level units render Keywords, Profiles, Rules and info groups after one unit-card expansion, with editing behind `Edit selection`. Direct child selections whose resolved entry type is exactly `model` render in an accessible `Models` section; each exact model occurrence is independently collapsible, while its name remains in an always-visible total-and-type unit composition summary. The remaining upgrade tree and model wargear stay lazy and preserve attention-driven opening; unknown types are never guessed into the model surface |
| `Code Chivalric` reported violated on every Dark Angels roster | Done | found by the 2026-08-24 reference-army run. A Dark Angels roster reports a violated root-selection bound for `Code Chivalric` — an **Imperial Knights** configuration entry — as `Selected 0, minimum 1, maximum 1`. The entry is **not among the 110 offered roots**, so the player cannot satisfy it, and its `Review available roots` link points at a browser that does not contain it. The visibility filter recorded in `Allied config auto-inserts into a force` fixed creation and browsing; structural bound inspection still enumerates the hidden allied root. This is a **false known violation** on the v1 reference path — the north star's honesty clause and acceptance proxy 3 both fail. The full 2,000-point run settled its impact exactly: with every genuine violation resolved, the finished legal army reports **100 structural bounds satisfied, 1 violated, 0 constraint violations** — and that single violation is this phantom one. RosterForge cannot currently report a correct Dark Angels army as legal |
| A saved draft is not durable immediately after the shelf shows it saved | Not reproducible | **The premise was wrong; see the 2026-08-26 entry.** Measured: the save takes about 1 s, and the unsaved-changes indicator clears in the *same tick* the save completes — it does not clear early. Every save-then-reload round-tripped exactly (360, 425, 495 pts). Killing the page mid-write does lose the in-flight edit, but the UI still shows `Saving…` and `Unsaved changes` then, so the `beforeunload` guard is registered and a real user is warned; only a programmatic reload bypasses it. An independent `codex exec` audit reached the same conclusion from the code. The commit ordering that makes this safe is now pinned by a test |
| Recovery slot can be resurrected after it is cleared | Done | found by the delegated durability audit, verified in the code, fixed 2026-08-26. On a roster's **first** save the recovery write and `void draftStore.delete(recoveryDraftId)` were both fire-and-forget, so a write already in flight could finish *after* the delete and recreate `__recovery__` holding the pre-save roster — never losing work, but offering a later session a stale recovery of a roster it already has. Both operations now queue on one chain in `apps/web/src/recovery-slot.ts`, so the store applies them in request order; the writer additionally re-checks `roster === persistedRoster`, because the debounce timer can outlive the render that persisted the roster. Ordering, not exclusion, is the fix — see the 2026-08-26 entry |
| Child-model statlines are still two expansions deep | Done | direct model occurrences are partitioned from the unit's configuration children and rendered once, immediately below the unit datasheet. The model row keeps its name, amount control, statline, edit disclosure and removal action; its own wargear/options subtree starts closed unless attention requires it. Non-model children remain in the parent configure disclosure, and nested/unit-typed sub-units are deliberately not flattened |
| Quantity-tiered unit pricing is untested | Open | GW's Munitorum Field Manual v1.2 prices many units by how many copies the army takes — `YOUR 1ST TO 2ND UNITS COST` versus `YOUR 3RD + UNIT COSTS`, e.g. a third Ballistus Dreadnought or Bladeguard Veteran Squad costs more than the first two. BSData stores a flat base `pts` plus a few modifiers, so the escalation, if modelled at all, is modifier-driven — exactly the class of behavior the reference army exists to exercise. **The 2,000-point army built on 2026-08-24 never crossed a tier boundary**, so RosterForge's handling of it is unverified in either direction. Extend the reference scenario to include a third copy of a tiered unit, then classify |
| Pinned BSData can lag GW's official points | Open | measured 2026-08-24: at corpus pin `04c62fc`, Intercessor Squad is `pts: 80` in `Imperium - Space Marines.json` while MFM v1.2 prices it at 75. RosterForge reported 80, which is **faithful to its source**. This is the same pattern the `Community-data mismatch diagnosis` row already recorded — the actionable gap is freshness, not cost evaluation. It is concrete evidence for the open question of whether v1 requires *current* BSData or merely *compatible* BSData; the freshness signal already shipped, and a player can import today's files themselves |
| Roster duplicate is not reachable by a user | Open | `duplicateRosterSelection` and `duplicateRosterForce` exist with tests and section E marks the command set Done, which is true headlessly. Confirmed in the running app that there is **no duplicate affordance anywhere**: the saved-draft shelf offers Open and Delete only. `docs/product-vision.md` workflow step 5 is "save, reopen, **duplicate**, and revise", so v1 is incomplete by definition until this is exposed. The owner placed the newly surfaced check-coverage work ahead of duplication; keep the eventual checkpoint bounded to the saved-roster user path and exact persistence/identity behavior |
| A 2,000-point draft is 13.6 MB | Open | measured on the reference-army run: a 5-unit, 325-point Dark Angels draft stored 13.6 MB because drafts embed the source closure so they survive catalogue changes. Quota handling exists and this is by design, but it bounds how many armies a player can keep and has never been given an explicit product answer. Decide the intended number of saved armies before treating it as a defect or as fine |
| Reference-army acceptance scenario | Open | **completed in full 2026-08-24** against pinned BSData `04c62fc`, Dark Angels revision 3: a legal **2,000-point** Unforgiven Task Force, 16 costed units, sum verified by hand, every genuine violation resolved. Costs were then verified against Games Workshop's official Munitorum Field Manual (v1.2): **11 of the 12 unit costs matched exactly**, and the single mismatch was traced to BSData lagging GW, not to RosterForge. That axis is now closed. Re-run it after each list-first checkpoint; that is what makes "v1 complete" measurable rather than asserted |
| Battlefield-role grouping in the selected-roster tree | Done | group selected units the way an army list reads — Configuration, Epic Hero, Character, Battleline, Infantry, Vehicle and so on — instead of one flat army section. Group by **effective** categories, which `effectiveRosterCategories` already indexes per occurrence, not by the static primary category link the add browser uses: modifiers can add or remove a category at runtime, and the synthetic fixture does exactly that. Subsumes the Configuration/Army split, which becomes the first role group |
| Violations shown in place on the row that is wrong | Done | battlefield-role headings use `containsAttention` only to signal a problem below them; exact selection rows use `attention` for a visible `Known violation` link to the retained Checks section. Ancestors are never mislabeled as the owner, root/force findings stay in the sticky warning and detailed checks rather than being guessed onto a role, unresolved/incomplete coverage never marks a row, and the warning/report counts remain authoritative when several findings share one owner |
| Report sections demoted below the list | Done | the checks heading and all exact anchors stay visible below the builder, while structural status, constraint bounds, diagnostics and full evidence share one quiet disclosure. Clean complete reports start collapsed; unavailable, invalid or incomplete reports open themselves, and a changed known-violation count reopens evidence after a manual close. Validity, completeness and unsupported behavior remain explicit |
| List-builder UI overhaul | Next | **Owner-prioritised on 2026-08-28 and isolated on `codex/list-builder-ui-overhaul`.** The dedicated roster screen, compact grouped army rows, required empty roles, focused problem/reference dialogs, closed-by-default Add unit sheet, compact Configuration settings row, blurred navigator/unit-card/modal-backdrop material foundation, separate inset nested-option cards, one shared 14 px exposed-corner rule, and simplified sticky roster identity/warning hierarchy are Done. Configuration retains its full editor while summarizing selected values, exact primary/setup capacities, and known attention. **Next:** complete the remaining shared active-roster component/token system, then bring Lists/creation into it, reconcile document workflows, add the installed-PWA boundary, and complete cross-mode accessibility/print acceptance. Re-run the reference army after each bounded checkpoint |
| Print-output usability pass | Open | the escaped print/save-PDF view model includes nested selections, per-selection costs, totals, and supported checks, but no later checkpoint has tested reader hierarchy, pagination, or representative table use |
| Per-file update times | Deferred | the repository-wide freshness signal is shipped. Exact per-file dates would cost one GitHub request for each of 46 files and can be reconsidered only if a demonstrated decision needs that precision |
| Load catalogues directly from BSData | Deferred | owner wants this eventually; the pinned-source browser already does a fixed revision |
| Constraint `value="-1"` | Done | BattleScribe's "no constraint" sentinel, settled by observation on the New Recruit wiki rather than inferred. 48 corpus constraints across 22 files, all of them modifier targets. **34 of 36 catalogues raised a complaint on an empty roster; now zero.** Selection constraints, force constraints, initialization, and the constraint summary all honour it; any other negative still withholds |
| Unicode-normalised name matching | Deferred | GW exports use U+2019 while catalogues use U+0027; activate this with `.ros`/cross-tool import or another feature that actually matches external names |
| Behaviour on a phone | Done | pinned Death Guard add/configure/amount/check path verified at 390 x 844 and 320 x 568; diagnostic grids no longer widen the page, and sticky links leave headings visible |

The earlier list-first sequence and the subsequent usability refinements are
complete. The owner accepted the 2026-08-28 comprehensive usability review and
requested a deliberately isolated interface overhaul. Keep these checkpoints
bounded and independently reviewable:

1. ~~pin roster Points as the headline budget and order Battle Size before
   Detachment~~ — done on `main`;
2. ~~separate Lists from the full-window active roster~~ — done on the overhaul
   branch;
3. ~~compact grouped army rows with loadout summaries, Warlord/status pills,
   trailing points, and one disclosure vocabulary~~ — done on the overhaul
   branch;
3a. ~~surface required empty roles and move checks/unit references into compact
   modal sheets~~ — done on the overhaul branch;
4. ~~an Add unit sheet with search and grouped results; close it after the first
   successful army add~~ — done on the overhaul branch;
5. ~~collapse Configuration to one settings-style summary row while preserving
   all validation and details~~ — done on the overhaul branch;
6. complete the shared system tokens and reusable navigation, row, sheet,
   inspector, picker, switch, stepper, status, and More-menu primitives across
   the active roster — **Next**. The requested dense-blur navigator, separate
   top-level unit materials, and blurred modal backdrop are already delivered;
7. bring Lists, roster creation, source acquisition, recovery, and their
   empty/error states into the same component system;
8. reconcile datasheets, checks, save/duplicate/print, and print hierarchy with
   the final navigation and disclosure model;
9. add the installed-web-app boundary: owned manifest/icons, theme metadata,
   safe areas, service-worker/update strategy, and an honest offline contract;
   and
10. re-run the reference army at phone portrait/landscape, tablet, desktop, and
    ultrawide, including 200% reflow, dark/increased-contrast/reduced-motion,
    keyboard, screen-reader structure, and print acceptance.

The shell boundary comes before row and sheet styling because those components
must be designed for a roster screen, not for the catalogue-centred page they
replace. Print-output usability is independent of all of this and may be taken
after the new hierarchy settles.

The restructure consumes work that already exists rather than adding evaluation
plumbing. The projection carries classification, recursive per-unit costs,
violation attention, and active-selection ancestry, and
`effectiveRosterCategories` already indexes battlefield-role membership per
occurrence. That is why doing this now is cheaper than doing it after two more
checkpoints inside the current shape.

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

**This paragraph's conclusion was superseded on 2026-08-24**; see "Claude-Lead
Delegation Verification" at the end of this file. The token is not invalid. It
is valid, and the failure below was environment-specific.

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
- Published CI run
  [`32778054967`](https://github.com/ronincse/rosterforge/actions/runs/32778054967)
  completed successfully for `48d4942`, with Lint, Typecheck, Test, Build, and
  Check whitespace all green. A follow-up commit corrects the `gh` note below
  and carries its own run.

### A correction to the transfer entry above

The transfer entry recorded that the stored `ronincse` GitHub CLI token is
invalid and told the incoming lead to reauthenticate. **That is wrong, and its
paragraph is now marked superseded.** From this Claude Code session `gh` 2.97.0
is fully authenticated: `gh auth status` shows the keyring token with
`gist, read:org, repo, workflow`, `gh api rate_limit` returned 4,994 of 5,000
core requests remaining, and `gh run list`/`gh run watch` both worked, which is
how this checkpoint's CI was confirmed.

The credential was never the problem. The most likely cause is that the Codex
sandbox could not reach the Windows keyring holding it — the same
authentication-store dependency this runbook already records for Copilot. That
was not reproduced from here, so it stays a probable cause rather than a
measured one. The durable lesson is narrower and worth keeping: an auth failure
observed inside one agent's sandbox is evidence about that sandbox, not about
the credential, and it should be re-checked from the new environment before the
next lead acts on it.

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
begin. No Reference Behavior QA ran, and no New Recruit behavior is claimed. No
credential was changed: `gh` needed no repair, and the earlier note claiming it
did was corrected rather than acted on. No pull request, deployment, or external
publication occurred.

### Next recommended boundary

**The compact points-and-problems player header**, unchanged and still the
roadmap's single **Next**. It should consume
`apps/web/src/roster-workspace-model.ts`, combine supported headline costs with
the known-problem count, keep validity and completeness independent, and drop
remaining evaluator-oriented framing. Do not fold the configuration split,
collapsible costed unit cards, or shop/editor mode into it.

## Completed Assignment — Commit Attribution Convention, 2026-08-24

Baseline `813ee922ae43434252e0b947259f38d01ee2426f`; resulting commit recorded
below. A bounded governance change made at the owner's request, immediately
after the delegation-verification checkpoint. No product work began.

### The problem, measured

Git authors every commit in this repository as
`Stone Edwards <stone.edwards@gmail.com>`, whichever model did the work. In a
repository whose organising premise is that work moves between models, `git log`
could not answer "who wrote this checkpoint".

The history was measured rather than assumed, and the first reading was wrong.
An initial `git log -3` sample suggested no commit had ever carried a trailer;
the full survey found the opposite. Of 197 commits, **134 carry a
`Co-Authored-By:` trailer and 63 carry none**. Exactly one trailer value has
ever appeared: `Claude Opus 5 <noreply@anthropic.com>`. The 63 unmarked commits
are the three initial 2026-06-15 commits plus the Codex sessions, including all
21 commits made on 2026-08-24 before this checkpoint.

So attribution already existed, but only for one model, only by accident of
Claude's tooling adding it unprompted, and readable only as *absence* — which
cannot distinguish Codex from Grok from a Claude session that dropped it.
Nothing in `AGENTS.md`, `docs/agent-workflow.md`, or `README.md` mentioned
commit messages, trailers, or attribution at all.

### What changed

`AGENTS.md` "Publishing" now requires every commit to end with a
`Co-Authored-By:` trailer naming the model that wrote it, and lists the exact
string for each of the five agents. `docs/agent-workflow.md` carries the same
requirement at the two points where it tells an agent to commit: the checkpoint
sequence, and the delegated writer's output contract, where the trailer lets the
lead see whose work it is integrating.

Two rules make the change safe to inherit. A lead integrating a delegate's
commit keeps the delegate's trailer and adds its own, so the log shows both the
writer and the publisher. And absence is explicitly declared meaningless from
2026-08-24 onward, with the historical reading — "unmarked means not Claude" —
written down so it is not lost.

### Decisions and rejected alternatives

**Rewriting history to backfill trailers was rejected**, and the prohibition
written into the rule. It would require a force-push over 197 commits, which
`AGENTS.md` already reserves for the owner, and it would fabricate attribution
for commits whose author can only be inferred.

**A commit hook or CI check was rejected for now.** The repository has no commit
tooling at all — no hooks, no husky, no commitlint — and CI checks only lint,
typecheck, test, build, and whitespace. Adding enforcement machinery for a
one-line convention costs more than it protects, and a rule every agent reads at
session start is the cheaper mechanism. If trailers turn out to be dropped in
practice, a `git log` audit will show it and enforcement can be reconsidered
against evidence.

**A custom trailer token such as `Agent:` was rejected** in favour of
`Co-Authored-By:`, which 134 existing commits already use, which `git
interpret-trailers` and GitHub both understand, and which needs no explanation
to a human reader.

The addresses are repository convention and deliberately unroutable. Where a CLI
already emits its own default trailer, the rule says to keep that form and
record it rather than maintain two spellings of one agent — the exact strings
for Codex, Grok, Copilot, and Antigravity have not yet been observed in the
wild, only defined here, and should be corrected on first contact.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **501 passed, 18 skipped (519 total)** across 53 test
  files. Documentation-only change; no test covers it.
- The survey above is reproducible with
  `git log --format='%H%x09%(trailers:only,valueonly,separator=%x2C)'`.

### What this did not do

No application code, test, dependency, build configuration, product behavior,
architecture boundary, compatibility claim, diagnostic, corpus data, or New
Recruit state changed. No history was rewritten and no commit was amended. No
enforcement tooling was added. The compact points-and-problems player header did
not begin.

### Next recommended boundary

**The compact points-and-problems player header**, still the roadmap's single
**Next** and now twice deferred by owner-requested governance work. It should
consume `apps/web/src/roster-workspace-model.ts`, combine supported headline
costs with the known-problem count, keep validity and completeness independent,
and drop remaining evaluator-oriented framing.

## Completed Assignment — Compact Player Header, 2026-08-24

Baseline `875dc26e8dfc151c4e160c988940c95e8ea3ce01`; resulting implementation
commit `5f5db22` (`feat: combine roster costs and checks into one player
header`) and this handoff commit. The roadmap's **Next**, taken by the Claude
lead after the transfer.

### What changed

The workspace's two report cards are gone, replaced by one `Roster summary`
header that consumes `apps/web/src/roster-workspace-model.ts`. It carries the
roster identity, the supported cost totals, and the known-problem count, in that
order, because those are the two figures a player acts on.

Removed with them: the `Read-only evaluation` and `Supported validation`
eyebrows, the `Roster costs` and `Supported roster validation` headings, the
`Forces`/`Selections` metric pair, and the satisfied/violated/unresolved status
triple. That triple was not lost — the structural and constraint sections below
already render their own counts, which is where a reader who wants them is
going anyway.

Nothing else was dropped. Zero-value source cost fields keep their own closed
disclosure, and excluded costs, unresolved selections, both diagnostic lists,
and a per-report completeness sentence moved into a sibling `Report details`
disclosure. The two violation links now appear only when the count is non-zero,
so a clean roster stops reporting its own zeroes.

### The completeness fold, and why the model owns it

One header cannot carry the two completeness badges the two cards did. The fold
lives in the presentation model as `header.completeness` and
`header.incomplete`, not in the component, because it is exactly the kind of
reader-facing rule the model was built to centralise.

It is deliberately conservative: `complete` only when **both** reports are
available *and* complete. An unavailable report counts as incomplete, because a
report that could not be composed has established completeness no more than one
that returned `incomplete`, and `AGENTS.md` forbids reporting incomplete
validation as complete. `header.incomplete` names each report that fell short so
the disclosure can say which. Root-choice completeness is excluded: it describes
the add-units browser, not the header.

Validity and completeness remain independent badges. A roster with no known
violations is not thereby a roster whose supported view is complete, and the
pinned Death Guard roster is exactly that case.

### Decisions and rejected alternatives

**A points-versus-limit figure was rejected as out of scope.** A matched-play
header ideally reads `1180 / 2000 pts`, and the limit exists — the force
constraint report already carries it. Surfacing it means plumbing force
constraints into the presentation model, which is a different boundary and
overlaps the open legality-aware controls row. It is recorded as a new roadmap
candidate rather than smuggled in here.

**Naming the headline cost type was rejected.** The header renders whatever
non-zero cost types the catalogue defines rather than looking for `pts`. The
pinned Death Guard roster happens to render `120 pts`; a catalogue with two
active cost types gets two figures, and neither is guessed to be the important
one.

**A bare `<header>` element was rejected** after checking what it maps to.
Nested inside the workspace `<section>`, `<header>` carries no ARIA role at all,
so neither assistive technology nor a role query could reach the headline
figures. It is a `<section aria-label="Roster summary">`.

**Nesting the zero-cost list inside the report disclosure was rejected.** It put
a browsing affordance two clicks deep behind an unrelated heading, and broke the
existing closed-by-default assertion. They are siblings.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **503 passed, 18 skipped (521 total)** across 53 test
  files, up two model tests and one style contract.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files —
  **521 passed** across 53 test files.
- Production build succeeded with only the existing large-chunk warning.
- The change is net **-39 lines** across seven files: the header and its styles
  are smaller than the two cards they replace.

Browser verification against real data, not only jsdom. The pinned BSData
repository was indexed in the app (46 files) and `Chaos - Death Guard` loaded at
revision 10. An empty roster showed `0 costs so far`, `2 known problems`,
`KNOWN VIOLATIONS`, `INCOMPLETE SUPPORTED VIEW`, and a `2 structural violations`
link with **no** `0 constraint violations` counterpart. Adding a Lord of
Contagion moved it to `120 pts`, `3 known problems`, and both violation links.
Every header and nav anchor resolved to an existing element, and the console
reported no errors.

Layout was measured rather than eyeballed, since a fixed grid track floor is the
exact defect the phone-width checkpoint fixed:

| Viewport | `document.scrollWidth` | Figures | Overflowing elements |
|---|---|---|---|
| 1265 px | 1265 | side by side, 539 px | 0 |
| 390 px | 390 | stacked, 266 px | 0 |
| 320 px | 320 | stacked, 196 px | 0 |

`styles.test.ts` now pins the `minmax(min(140px, 100%), 1fr)` and `min-width: 0`
that make that true.

One test expectation was written wrong and corrected by the run rather than
argued with: the cost fixture's costs are complete while its checks are not, so
the model test asserts `incomplete: ["checks"]` and documents that the fold must
name only the half that failed. A fourth test forces a real validation report's
completeness up to prove `complete` is reachable at all, guarding against a
vacuously always-incomplete fold.

### What this did not do

No evaluator, session, persistence, or roster-model code changed; the projection
still does not evaluate, mutate, filter, legalize, or persist. No behavior
boundary moved, so `docs/compatibility.md` and `docs/diagnostics.md` are
untouched. Configuration separation, collapsible costed unit cards, shop/editor
modes, and print-output usability did not begin. No Reference Behavior QA ran:
this checkpoint makes no claim about New Recruit behavior, only about which of
RosterForge's own numbers lead. No pull request, deployment, or external
publication occurred.

### Next recommended boundary

**Separate configuration from army units**, the roadmap's new **Next**. The
presentation model already classifies every root and every top-level selection
into `configuration` or `army` and exposes `selections.configuration` and
`selections.army`; the selected-roster tree still renders `selections.ordered`
as one undivided list. That checkpoint should consume the existing split rather
than re-deriving it, and should not fold in collapsible costed unit cards.

## Completed Assignment — Lead-Neutral Workflow, 2026-08-24

Baseline `7a1010a8645542e231dc89acd51be1cc87527fb5`; resulting workflow commit
`919787c` (`docs: make lead ownership and delegation model-neutral`) and this
handoff commit. A bounded governance checkpoint requested by the owner after
exercising Claude as the active lead exposed several places where the workflow
still assumed Codex. No application code changed, and no product checkpoint
began.

### 1. Two transfer modes instead of one

The existing **Formal Lead Transfer** is unchanged and remains correct for a
planned handover. What it could not cover is the failure mode this whole
workflow exists to survive: it requires the outgoing lead to stop cleanly,
document, commit, push, and confirm CI — which is exactly what a lead that has
just run out of quota, lost its session, or lost its context cannot do.

`docs/agent-workflow.md` now adds **Interrupted Lead Takeover**. The owner
appoints a lead directly; that appointment is the authority, because no transfer
record exists. The incoming lead treats the repository as mid-checkpoint,
records `git status`, the complete tracked and untracked diff, the
`HEAD`/`origin/main` relationship, commits, branches, worktrees, stash, and any
delegated writer state **before** touching anything, then reconstructs what the
previous lead was doing and finishes that checkpoint rather than starting the
roadmap's next one.

The rule that matters most is the destructive one: never reset, clean, check out
over, stash away, or force-push to manufacture a tidy baseline. An unexplained
dirty tree is the only surviving record of an interrupted lead's intent, so
discarding it destroys the very thing recovery depends on. Genuine ambiguity or
any needed destructive action goes to the owner instead. The takeover and its
reconstructed baseline are recorded here before the checkpoint is published, and
must distinguish what was verified from what was inferred.

### 2. The decision model is now written for "the active lead"

The role and decision tables described ordinary development and native subagent
work from Codex's seat. They now read: ordinary development to the active lead;
cleanly separable work to that lead's **own** native subagent mechanism, where
verified; independent frontier-model review to the capable non-lead model;
bounded reference QA to a verified browser-capable native subagent of the active
lead, with the lead as fallback; captured-evidence analysis to Antigravity;
bounded overflow to Grok; GitHub/Actions to Copilot.

Model-specific guidance sits beneath that general rule rather than replacing it.
When Codex leads, Codex implements, Codex children are the first parallel lane,
and Claude reviews. When Claude leads, Claude implements, Claude children are
the first parallel lane where verified, and the Codex CLI reviews when its quota
is available. Affinities stay advisory. No worktree, least-privilege, review, or
validation requirement was weakened; the native-subagent rows gained
restrictions rather than losing them.

### 3. Native Claude subagents — verified, not assumed

Two read-only probes were spawned from this Claude Code Desktop session with the
`Agent` tool at `Explore` type. Both ran in the background, returned their
result to the lead thread, and changed no file; the checkout was clean after
each.

| Property | Result |
| --- | --- |
| Spawn / return | `Agent` tool with `subagent_type`; result arrives as a task notification in the lead thread, and is **not** shown to the user |
| Filesystem | The lead's own checkout and working directory; no branch, worktree, or copy |
| Repository instructions | **Not inherited** — neither `CLAUDE.md` nor `AGENTS.md` was in the child's starting context |
| Read-only enforcement | **None from the agent type.** `Explore` lacks `Write`/`Edit` but holds `Bash` *and* `PowerShell` |
| Sandbox | Shell tools expose `dangerouslyDisableSandbox`, so commands are sandboxed by default; the actual boundary is **unknown** and was deliberately not probed |
| Nesting | **None** — the child has no `Agent`/`Task` tool |
| Browser | `mcp__Claude_Browser__*` loaded directly in the child, and working |
| Concurrency | No numeric limit visible from either side. **Unknown** |

Two of those change how a brief must be written, and both are recorded in the
runbook. **Repository rules must be named in the brief**, because a native
Claude child told to "follow `AGENTS.md`" has never read it — this differs from
the `claude --print` CLI delegate, which *does* receive the rules through
`CLAUDE.md`'s import, so the two Claude lanes are not equivalent. And
**`Explore` is a read-only role, not a read-only permission set**: under the
existing rule that read-only counts only when tool permissions enforce it, a
native Claude child is never proven read-only, so anything that might write gets
a disposable worktree and the lead checks status afterwards regardless.

Sandbox enforcement was left unknown on purpose. Establishing it means
attempting a write, and this was a read-only checkpoint.

### 4. Claude-side browser Reference QA — verified at both levels

The Claude lead navigated `https://www.newrecruit.eu/app/`, followed its
client-side route to `/app/MySystems`, read the rendered `My Games` list
including `Warhammer 40,000 11th Edition — last update: 9 hours ago`, and
executed in-page JavaScript. A native Claude subagent independently did the
same. Nothing was clicked, signed into, published, or persisted.

**A native Claude subagent can therefore perform interactive Reference Behavior
QA in this environment**, so the preferred/fallback order now holds for a Claude
lead exactly as it did for a Codex lead. The Codex path is retained, not
replaced.

The lead independently confirmed the JavaScript requirement rather than
accepting the delegate's claim: `curl` of `/app/MySystems` returns a
**3,238-byte** Nuxt shell whose body is an empty `__nuxt` div, and grepping it
for `My Games`, `last update`, and `Update All` returns **zero** matches while
all three are in the live DOM. This is now written into the capability gate,
because it is the durable reason Antigravity's static `read_url_content` can
never be an executor.

### 5. Environment limitations found

- **Screenshots fail while the Browser pane is hidden**, for lead and child
  alike: a screenshot returns "the Browser pane is not displayed, so the page is
  not compositing frames". Reference QA evidence must plan on rendered text,
  accessibility trees, and in-page JavaScript reads; an image needs the owner to
  open the pane.
- **The in-app browser profile is not disposable.** It already held five
  installed New Recruit game systems with update timestamps. Record pre-existing
  state rather than assuming a clean profile.
- **Native Claude children cannot nest**, so a parallel fan-out is one level
  deep and the lead coordinates it.
- **A child's report is untrusted input.** The capability probe returned output
  the harness flagged as instruction-shaped and neutralized before it reached
  the lead — the mechanism working as intended, and a reminder that a delegate's
  report is data to verify.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **503 passed, 18 skipped (521 total)** across 53 test files,
  unchanged: this checkpoint touched no code and no test.
- Only `AGENTS.md` and `docs/agent-workflow.md` changed.
- Every capability claim added to the documentation is labelled as officially
  documented, empirically verified here on 2026-08-24, or unknown.

### What this did not do

No application, test, dependency, build, architecture, compatibility,
diagnostic, corpus, or New Recruit state changed. No orchestration script, hook,
framework, or permissive global configuration was added. No sandbox boundary was
probed by attempting a write. Configuration separation — the roadmap's **Next**
— did not begin, and the roadmap table is unchanged because no product work
moved.

### Next recommended boundary

**Separate configuration from army units**, still the roadmap's single **Next**
and untouched by this checkpoint. The presentation model already exposes
`selections.configuration` and `selections.army`; the selected-roster tree still
renders `selections.ordered` as one undivided list.

## Completed Assignment — Configuration Split, 2026-08-24

Baseline `57d2463690a5a72fb538ba3936157e487bd0df79`; resulting implementation
commit `7dadf96` (`feat: separate configuration from army units in the roster
tree`) and this handoff commit. The roadmap's **Next**, taken immediately after
a two-line stale-wording correction to this file.

### What changed

The selected-roster tree rendered `selections.ordered` as one undivided list
even though the presentation model had classified every top-level selection as
`configuration` or `army` since the projection checkpoint. It now renders two
titled sections — **Configuration** first, then **Army units** — each a labelled
region with its own count.

Configuration leads because it is what a player sets before the army:
detachment, battle size, force disposition. Within a section, source order is
preserved, because `configuration` and `army` are order-preserving filters of
`ordered` rather than re-sorted lists.

A section with no entries renders **nothing at all**. A roster with no
configuration shows its army units directly rather than an empty heading above
them. The add browser already exposes both groups for discovery, and a missing
*required* configuration surfaces as a known problem in the checks — a better
place for that signal than a permanently empty section in the tree.

`RosterSelectionSection` groups what the model already classified. It does not
decide membership, and its comment says so, because that decision belongs to the
projection and would rot if a component started duplicating it.

### The counting decision

The pane heading says "N top-level selections" using `rosterSelectionsAmount`,
which sums occurrence **amounts**, not nodes: a unit taken twice counts as two.
Labelling the new sections with `array.length` would have been a different
measure, and the two would visibly disagree the moment anyone took a second of
anything.

So the model gained `configurationAmount` and `armyAmount`, summed the same way,
with the invariant that they add to `topLevelSelectionCount`. That invariant is
asserted in the model test and was confirmed in the live app: 3 + 1 against a
pane heading of `4 top-level selections`. The cost is two extra top-level-sized
arrays per session, negligible beside the recursive per-selection walk that
already runs there, and it buys one consistent answer to "how much is in this
roster" instead of two.

### Decisions and rejected alternatives

**Collapsible sections were rejected.** `<details>` around each group would have
pre-empted the next roadmap row, which is collapsible top-level *unit cards*
with per-unit costs. Plain headed groups keep this checkpoint to the split
itself and leave that decision where it belongs.

**Always rendering both headings was rejected.** Symmetry would have been
tidier, but an empty `Configuration` heading on every unconfigured roster is
exactly the developer-facing chrome the previous checkpoint removed, and the
validation checks already carry the actionable signal.

**Re-deriving the split in the component was rejected** — the projection exists
so that presentation rules live in one tested place. The component consumes
`selections.configuration` and `selections.army` directly.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **503 passed, 18 skipped (521 total)** across 53 test
  files. Two existing tests gained assertions rather than new files being added.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files —
  **521 passed** across 53 test files.
- Production build succeeded with only the existing large-chunk warning.

Verified in the browser against real data, because the synthetic UI fixture has
no `Configuration` root and therefore cannot exercise the interesting half. A
pinned `Chaos - Death Guard` roster auto-initialized three configuration
entries, which rendered as **Configuration — 3 selections** (Detachment, Battle
Size, Force Disposition) with **no** empty army section. Adding a Lord of
Contagion produced **Army units — 1 selection** beside it, and 3 + 1 matched the
pane's `4 top-level selections`. At the 320 px supported minimum,
`document.scrollWidth` stayed at 320 with zero overflowing elements and both
sections at 201 px. No console errors.

The synthetic UI test asserts the other half deliberately: that catalogue has no
configuration root, so it proves an empty section renders nothing rather than an
empty heading.

### What this did not do

No evaluator, session, persistence, or roster-model code changed; the projection
still does not evaluate, mutate, filter, legalize, or persist. No behavior
boundary moved, so `docs/compatibility.md` and `docs/diagnostics.md` are
untouched. Sections are not collapsible, unit cards show no per-unit cost, and
no shop/editor mode was introduced. No Reference Behavior QA ran: this makes no
claim about New Recruit behavior, only about how RosterForge groups what it
already classified.

### Next recommended boundary

**Collapsible top-level army units with per-unit costs**, the roadmap's new
**Next**. The projection already carries recursive per-selection cost totals, so
that checkpoint should read them rather than compute anything, and should keep
the section grouping introduced here rather than reworking it.

## Completed Assignment — Collapsible Costed Unit Cards, 2026-08-24

Baseline `f5b13107c950c5b2bf6cc9df5942cc29d389802d`; resulting implementation
commit `4ecfd68` (`feat: collapse army unit cards and show their per-unit
cost`) and this handoff commit. The roadmap's **Next**, taken directly after the
configuration split.

### What changed

Top-level army cards are now collapsible, and every top-level card shows the
recursive cost the projection had already folded for it.

The **unit name is the disclosure control** — a full-width button, not a
separate chevron — so the hit target is the width of the card. That mattered
more than it sounds; see the phone-width note below.

A collapsible card **renders its body only while open**. Child choices, the
amount editor, Selection details, and the whole child subtree stay off the
render path, the same laziness the nested children list already used. Measured
on a real roster: one collapsed unit keeps **45 DOM nodes** off the page
(385 → 430 when a single Lord of Contagion was expanded).

`SelectionCostTotals` reads `RosterWorkspaceSelection.costs`, which already
includes descendants, so a squad's figure carries its wargear. It computes
nothing. Zero and unavailable totals render nothing, so a matched-play list does
not grow a `0 Crusade: Experience` beside every unit — the header's disclosure
remains where the full source cost picture lives.

### Decisions and rejected alternatives

**Collapsed by default, with one exception.** A card opens itself when it holds
a known violation, reusing the exact attention rule the children list already
had. A problem hidden behind a disclosure is worse than a longer page.
Unresolved bounds stay in the checks and do not expand anything. Defaulting to
*open* was rejected: it would have preserved current behavior and added nothing,
and the roadmap row exists precisely because a fifteen-unit army is unusable
fully expanded.

**Configuration cards do not collapse.** The row asked for collapsible *army*
units, and burying the detachment, battle-size, and force-disposition pickers
behind a click would hide the first thing a player has to set. The section
component passes `collapsible` per section, so the rule is one prop rather than
a condition scattered through the card.

**Newly-added-unit focus was deliberately not built.** It is the next roadmap
row, and adding it here would have merged two checkpoints.

### A phone-width defect found and fixed in the same pass

The first implementation shared the occurrence row between the name, the cost,
and Remove. At the 320 px supported minimum that left the disclosure control —
the thing you have to tap — **78 px wide and two lines tall**, about a third of
the card. At 390 px it was still only 148 px.

A `max-width: 560px` rule now gives the name the full row and drops the cost and
Remove onto their own line beneath it. The control went to **175 px at 320 px**
and 245 px at 390 px, with `document.scrollWidth` still equal to the viewport
and zero overflowing elements at both sizes. Desktop is unchanged: at 1265 px
the name and actions remain side by side in a 500 px pane. `styles.test.ts` pins
both the stacking rule and the full-width control.

This is the second time a card grid has been measured rather than eyeballed and
the measurement changed the design. It is worth keeping the habit.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test
  files: one new style contract, plus collapse assertions added to the existing
  workspace flow test.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files —
  **522 passed** across 53 test files.
- Production build succeeded with only the existing large-chunk warning.

Verified in the browser on a pinned `Chaos - Death Guard` roster:

| Card | Toggle | Default | Cost | Body rendered |
|---|---|---|---|---|
| Detachment / Battle Size / Force Disposition | none | expanded | none (all zero) | yes |
| Plague Marines | yes | **expanded** — holds a known violation | `90 pts` | yes |
| Lord of Contagion | yes | **collapsed** | `120 pts` | **no** |

Clicking the Lord of Contagion control flipped `aria-expanded` to `true`,
rendered the body, and its `aria-controls` resolved to that body's id. No
console errors from the change.

One note on how the synthetic tests behave, because it confused the first
reading: the UI fixture's Infantry Squad carries a known violation, so it
auto-opens. That is why the pre-existing tests that click into its datasheet
still passed unchanged after cards became collapsible. The new assertions pin
that rule explicitly rather than leaving it as a coincidence, and drive the
toggle both ways.

### What this did not do

No evaluator, session, persistence, or roster-model code changed. The projection
was not modified at all this checkpoint — the recursive totals it already
carried were simply read. No behavior boundary moved, so
`docs/compatibility.md` and `docs/diagnostics.md` are untouched. No shop/editor
mode, no newly-added-unit focus, no legality-aware amount controls. No Reference
Behavior QA ran: this makes no claim about New Recruit behavior.

### Next recommended boundary

**Shop/editor modes and newly-added-unit focus**, the roadmap's new **Next**.
The two-pane layout still has no explicit browsing-versus-editing state and does
not focus the unit just added. The projection already exposes
`activeSelectionId` with `active` and `containsActiveSelection` ancestry on
every node, which is
what a focus mode needs; that checkpoint should consume it rather than add
another mechanism, and should test the interaction at desktop and phone widths.

## Completed Assignment — List-First Product Direction Recorded, 2026-08-24

Baseline `d5f38514ad198e3ec3362b93e190bd27d65c740b`; resulting commit recorded
below. A documentation-only checkpoint capturing an owner observation that would
otherwise have been lost between sessions. No code changed and no product
checkpoint began.

### Why this is a checkpoint and not a note

The owner observed that New Recruit makes the army list far more central than
RosterForge does, and that the product will not be usable until it is more about
the list. They explicitly said it does not have to be done yet — which is
exactly the condition under which a finding disappears. `AGENTS.md` requires
discovered work to reach the roadmap rather than live in prose, so it is a
roadmap row with its evidence attached.

### What was observed in New Recruit

A temporary local Death Guard `Army Roster` list was created in the app on
2026-08-24 to see the list editor, and **deleted afterwards**; the app reported
`1 lists deleted!` and the Lists view returned to the empty state it started in.
The session was signed out throughout — the page itself said "You are using New
Recruit without an Account" — so nothing synced and no account state changed.

- The list **is** the page: route `/app/Lists/<id>`, and the document title
  becomes the list name.
- The body is organised by **battlefield role**: `Configuration`, `Epic Hero`,
  `Character`, `Battleline`, `Infantry`, `Swarm`, `Beast`, `Vehicle`,
  `Dedicated Transport`, `Fortification`, and three `Allies:` groups.
- Category headings carry **counts against limits inline** — `Character (0/1)`.
- **Violations are attached in place.** The `Character` heading carried an error
  icon whose title was `• Roster requires 1 selections more of Character`. There
  is no separate checks report collecting them.
- Chrome is a thin top bar: list name, `Export`, `Report Issue`, `List Options`.
- No cost report, validation report, or diagnostics pane competes with the list
  for the page.

### How RosterForge differs today

The workspace splits the screen between a selected-roster pane and an add
browser, and follows it with `Checks and diagnostics`, structural status, and
constraint bounds as co-equal full-width sections. Validation is *collected*
into those sections and linked back to occurrences rather than shown where it
happened. Top-level selections group into `Configuration` and `Army units`, not
by battlefield role.

Each of those was a defensible local decision. Together they mean the list
shares the page with its own reports instead of being the page.

### The boundary this does not cross

This records **what is emphasized** — an information-architecture observation.
It is not permission to copy New Recruit's visual design, markup, data
structures, or code, and the Reference Behavior QA section's prohibition is
unchanged. No behavioral claim is made: nothing here is a compatibility finding,
a defect, or a data-comparability result, so `docs/compatibility.md` is
untouched and the exact/different/unknown and match/mismatch classifications do
not apply.

### The sequencing question left open for the owner

The new row is not a fifth item after the four remaining presentation rows. It
is a claim that the workspace's shape is wrong, and two of those rows are partly
answers to it: shop/editor modes and legality-aware amount controls would both
be designed differently inside a list-first layout.

The roadmap now says so and asks the owner to choose between taking the
list-first restructure first — plausibly split into bounded checkpoints such as
battlefield-role grouping, then in-place violations, then demoting the report
sections — or continuing in the current order and reshaping afterwards. It also
forbids silently reordering those rows without recording the decision. This lead
deliberately did **not** make that call: it is a product-direction decision with
several checkpoints of consequence.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test files,
  unchanged; this checkpoint touched no code and no test.
- Only `agent-handoff.md` changed.

### What this did not do

No application, test, dependency, build, architecture, compatibility,
diagnostic, or corpus state changed. No restructuring began, and the roadmap's
current **Next** was not reassigned. The only external state touched was the
temporary New Recruit list described above, which was removed.

### Next recommended boundary

**Ask the owner to settle the sequencing question above**, then take whichever
row that answer selects. If the answer is "continue as ordered", the **Next**
remains shop/editor modes with newly-added-unit focus, consuming the
projection's existing `activeSelectionId` ancestry.

## Completed Assignment — Battlefield-Role Grouping, 2026-08-24

Baseline `8203b5f79345bc146334b3686562f0c50a6dc71d`; resulting commits `3aa3356`
(`docs: state the product goal and settle the list-first sequencing`), `45af7b1`
(`feat: group the roster tree by battlefield role`), and this handoff commit.
The first of the four list-first restructure rows.

### The goal this now serves

The owner stated the product goal on 2026-08-24 and it is recorded at the top of
section F: build a **viable list for the chosen game system**, 40k first. The
list and its unit stats are the focus, not the evaluator's reports; and building
splits into a *choosing* phase, where the catalogue should be pleasant, and a
*reading* phase, where the catalogue gets out of the way and stats and rules are
what you scroll. New Recruit is the usability baseline, not a design to copy.

The owner also settled the sequencing: take the list-first restructure now
rather than after the remaining rows. The roadmap records why — the old
shop/editor row was a two-pane concept the restructure dissolves, so building it
first would have been building it twice.

### What changed

The selected-roster tree now renders one titled group per battlefield role, in
catalogue order, instead of the `Configuration` / `Army units` split shipped
earlier the same day. That split is marked **Done (superseded)**: Configuration
survives as the first role group, which is what it always was.

Verified against a pinned Death Guard roster — the tree read **Configuration**
(Detachment, Battle Size, Force Disposition), **Character** (Lord of Contagion),
**Battleline** (Plague Marines), **Vehicle** (Foetid Bloat-drone), with
3 + 1 + 1 + 1 matching the pane's `6 top-level selections`. A later state added
an **Infantry** group in the correct catalogue position. That is an army list
rather than a tree.

### The decision that mattered: which category is the role

A unit belongs to many categories; it occupies one role. BattleScribe already
answers this, and `packages/evaluation/src/categories.ts` had settled it with
corpus evidence before this checkpoint: the primary category is "the category in
which that entry will be visible in Roster Editor", singular, and `set-primary`
displaces any previous primary.

So grouping uses the **effective primary category**, not the declared category
link the add browser groups by, because a modifier can move an entry between
roles. The add browser's static reading stays correct for *choices*, which have
no occurrence to evaluate; it would have been wrong for *selections*.

The evaluator withholds `primaryCategories` exactly when a `set-primary` or
`unset-primary` operation applied, since those are not executed. Absent means
**unknown**, never "no primary". Such a selection is filed under `Other` with
`known: false`, and the group renders a note saying the role is not established
rather than implying the units have none. A selection that genuinely declares no
primary also lands in `Other`, but with `known: true` and no note — the two
cases are distinguishable, which is the point.

The synthetic UI fixture turned out to be the second case: its squad's only
category link carries `primary="false"`, so it correctly files under `Other`
rather than under `Infantry`, the category it merely belongs to. The test now
pins that, and asserts no `Infantry` group is invented.

### What this costs, and why that is written on the function

This puts one category evaluation per **top-level** selection on the per-edit
path. The two expensive pieces are already memoized — `indexEvaluationChoices`
by catalogue context, `rosterSelectionLocations` by roster identity — so neither
rebuilds here. What is not memoized is the per-call inbound-contribution scan
over every location, plus the category-name map
`inspectLocalRosterSelectionCategories` rebuilds over every catalogue
definition.

Added work is therefore about `topLevel × (allSelections + categoryDefinitions)`
— roughly **4,900 iterations** for a fifteen-unit Death Guard roster at 190
categories. Small today, and no console errors or visible latency appeared in
the browser, but it is **superlinear in roster size**, which is the exact shape
that produced the 127-second validation regression this project already fixed
once. `topLevelRole` records the cost and names the remedy — a batched
primary-category index built once per roster beside `effectiveRosterCategories`
— so the next reader does not reach for per-call caching instead.

Browser timings were attempted and are **not** reported: React's asynchronous
commit dominated them, and a promise-based measurement hung the hidden preview
pane. The analytic bound above is what is actually known.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test
  files, unchanged in count: existing tests were rewritten to the new grouping
  rather than added to.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files —
  **522 passed** across 53 test files.
- At the 320 px supported minimum, `document.scrollWidth` stayed 320 with zero
  overflowing elements; desktop 1265 px likewise. No console errors.

### What this did not do

No evaluator, session, persistence, or roster-model code changed — the role
comes from an existing inspector. No behavior boundary moved, so
`docs/compatibility.md` and `docs/diagnostics.md` are untouched. Unit stats are
still two disclosures deep, violations are still collected into report sections
rather than shown in place, and the report sections are still co-equal with the
list. Those are rows 2, 3 and 4 of the restructure. No Reference Behavior QA
ran: New Recruit informed the *goal*, and no behavioral claim is made here.

### Next recommended boundary

**Unit stats and rules readable without two expansions**, row 2. The datasheet
already exists — `SelectionKeywords`, profiles, rules and info groups all render
inside `Selection details` — but reaching a statline currently costs opening the
unit card and then opening `Selection details`. The collapsible-card checkpoint
added that second level, which is right for scanning a fifteen-unit army and
wrong for reading it at a table. That checkpoint should resolve the tension
between the two phases rather than simply undoing the collapse.

## Completed Assignment — Product Vision, 2026-08-24

Baseline `e33911259a4960478afe32405e946010fb073890`; resulting commit recorded
below. Documentation only: no application code changed, and no newly discovered
roadmap work began.

### What changed

`docs/product-vision.md` is new. It carries the north star, the product
definition and end-to-end workflow, behavioral-compatibility scope, the
validity/completeness honesty rule stated as a *product* requirement rather than
an engineering one, the BUILD → VALIDATE → PLAY lifecycle, roster-first UX
principles with four testable acceptance proxies, the reference army, the v1 and
v2 acceptance definitions, the non-goals, and the five-question decision test.

`AGENTS.md` and this file gained a four-document map: vision defines *what
RosterForge is becoming*, architecture *how* it is structured, compatibility
*what* imported behavior is supported, and this file *what remains*.

### The `.ros`/`.rosz` decision: a stated non-goal

It had been "deferred" since 2026-08-20 and appeared in neither goals nor
non-goals. It is now a **non-goal for both v1 and v2**, for three reasons:

1. It is the opposite of the v1 bar. v1 is defined as completing the workflow
   *without needing BattleScribe or New Recruit*; interchange is a feature for
   interoperating with them.
2. The reference army is built "from zero", so import cannot block v1 by
   construction, and a finished list is read at the table in v2 rather than
   exported.
3. BSData publishes catalogues as JSON and the comparison tools are web-based
   rather than trading roster files — the owner's original reasoning, and it
   still holds.

The architectural implication is the real cost and is recorded with the
decision: faithful interchange requires the roster model to carry expanded
profiles, rules, categories, and link identity from the BattleScribe roster
schema — content it deliberately resolves from the catalogue instead. Adding it
widens the immutable roster, which is the object persisted into every saved
draft. This project already shipped one 8 MB per-write autosave regression by
not noticing what a persisted structure costs; this would be the same class of
change on purpose. The print/save-PDF path is a presentation export and is
unaffected.

The reversal condition is written down: a user actually asking to bring a list
in from another tool, with a real use case. `.ros` ingestion (onboarding) is
separable from `.ros` export (sharing).

### Roadmap review — recommendations only, nothing reordered

No row's status or position was changed. These are recommendations for the owner
or the next lead.

**Priorities that materially change now that v1 is the bar**

1. **`Load catalogues directly from BSData` (F, Deferred) is the sharpest
   tension the vision exposes.** v1 says "import **current** BSData", but the
   application browses a *pinned* revision, and the roadmap already records a
   real defect caused by that pin going stale. Either promote this to a v1 goal
   or amend v1 to say "compatible BSData", which is the phrase the workflow list
   uses. Those are different products; the owner should pick rather than let the
   wording decide by accident.
2. **`Headline cost against its points limit` (F, Open) should rise.** The
   reference army is defined *by* its 2,000-point limit, and a points limit is
   legality, not decoration — decision test 2. A player cannot tell they have
   built a 2,000-point army without it.
3. **`multiply`/`divide`/`modulo` (A, Open) should be relabelled a non-goal.**
   Every prose statement about it already says it is unsupported on purpose
   because the corpus uses none. Under the new non-goals that is settled, not
   open work.
4. **The three `.ros`/`.rosz` rows (C, Low priority) should become non-goals**
   per the decision above. `Exact XML/JSON reserialization` should be classified
   *separately* rather than swept in: it concerns catalogue bytes, not roster
   interchange, and was not examined here.
5. **`Unicode-normalised name matching` (F, Deferred)** waits on "`.ros`/
   cross-tool import or another feature that actually matches external names".
   One of its two triggers is now gone; the note should be updated so it is not
   waiting on something that will never arrive.

**Missing milestone required to reach v1**

**An end-to-end reference-army acceptance scenario.** The roadmap has no row for
building and validating the 2,000-point Dark Angels army, so "v1 complete" is
currently unmeasurable. Every browser verification in this project has used
**Death Guard**; the committed reference army is **Dark Angels with an
enhancement, wargear replacements, and a dedicated transport** — a combination
nobody has driven. Recommend adding it as a v1 milestone.

**Status statements that are plainly stale**

- `multiply`/`divide`/`modulo` = `Open` (see above).
- The three `.ros`/`.rosz` rows = `Low priority` (see above).
- Section B's `Sections C–E | Measured` row still says "interchange remains low
  priority", which this checkpoint supersedes.

### Remaining v1 work ranked by the decision test

1. **Reference-army acceptance scenario** — test 1 by definition, and the only
   item that reveals what the rest of the list actually is.
2. **Headline cost against its points limit** — tests 2 and 4.
3. **Unit stats and rules buried two disclosures deep** *(current Next)* —
   test 4 for v1, test 3 for v2.
4. **Violations shown in place** — test 4; also serves acceptance proxy 3.
5. **Report sections demoted below the list** — test 4.
6. **Permissive `defaultAmount` parsing** — test 2, but still unmeasured against
   the corpus; the measurement should precede the work.
7. **Legality-aware model-count controls** — test 4; validation already catches
   an illegal count today.
8. **Loadout flattening and Warlord controls** — test 4; needs Reference QA.
9. **Per-edit whole-roster evaluation** — test 4 (speed), not urgent at measured
   sizes.

**The single next item should be building and validating the reference army
end to end.** v1 is *defined* by that army and nobody has ever built it, so
every other ranking above is speculation until someone does. This project's
most-repeated lesson — recorded three separate times in this file — is that
driving the app against a real army finds what the test suite cannot; the whole
of section F exists because of it. Doing that first either confirms the list
above or replaces it with real findings, and it does so before more effort is
spent on rows that may turn out not to matter.

That is a recommendation. The current **Next** row was left untouched.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test files,
  unchanged: no code or test was touched.
- Files changed: `docs/product-vision.md` (new), `AGENTS.md`,
  `agent-handoff.md`.
- The north star sentence was verified byte-for-byte against the text supplied
  by the owner.

### What this did not do

No application, test, dependency, build, architecture, compatibility,
diagnostic, or corpus state changed. No roadmap row was reordered, restatused,
added, or removed. None of the newly identified work was started, including the
reference-army scenario recommended above.

### Next recommended boundary

**Build and validate the reference army end to end** — the 2,000-point Dark
Angels army with a detachment, a character carrying an enhancement, a squad
using wargear replacements, and a dedicated transport, on current BSData — and
record what breaks. If the owner prefers to continue the list-first restructure
instead, the standing **Next** row remains unit stats and rules readable without
two expansions.

## Completed Assignment — Reference Army Run, 2026-08-24

Baseline `dbcc43560e8d9b0bf003377c9a08a3f1eff713d5`; resulting commit recorded
below. Documentation only: no application code changed. This is the first run of
the acceptance scenario `docs/product-vision.md` defines v1 against, and it was
taken because v1 is measured by an army nobody had ever built.

### Data and scope

Pinned BSData `04c62fcd041b3808c39d5c46fd677c704027b979` (2026-08-23) through
the application's own browse pin, `Imperium - Dark Angels.json` **revision 3**,
292 visible roots, 152 categories. Built in the browser against the local dev
server.

**The run was partial, and that matters for how its results are read.** It
exercised every *structural* requirement of the reference army — detachment,
battle size, a character carrying an enhancement, a squad using wargear
replacements, and a dedicated transport — plus save, reopen, and revise. It did
**not** build to a full 2,000 points, stopping at **325 points across five
units**, and it did not check costs against an external known-good Dark Angels
list. Those two gaps are recorded in the new roadmap row rather than glossed.

### What worked

- Pinned browse, catalogue load, and roster creation.
- `2. Strike Force (2000 Point limit)` and the `Unforgiven Task Force`
  detachment.
- **Force Disposition was correctly empty until a detachment existed**, then
  offered `Take and Hold` — the `Force Disposition shows no entries` row
  confirmed on a second faction.
- **Enhancements were offered** — `Shroud of Heroes`, `Stubborn Tenacity`,
  `Weapons of the First Legion` — confirming `Detachment enhancements never
  offered` on Dark Angels.
- **Modifier-driven cost change**: the Captain went 85 → **110 pts** on taking
  Shroud of Heroes, and the roster total 235 → **260**.
- **Cost aggregation**: 85 + 80 + 70 = 235, matching the header exactly.
- **Wargear replacement**: the Sergeant's `Close combat weapon` became `Power
  fist`, with the squad correctly staying at 80 pts.
- **Role grouping** read Configuration / Character / Battleline / Dedicated
  Transport.
- **Durability**: save → full page reload → Open restored 260 pts, all four
  groups, the enhancement, and the Power fist. Revising after reopen added a
  Rhino for 325 pts and autosaved.

That is a real v1 workflow completing end to end, and none of it needed
BattleScribe or New Recruit.

### What it found

**1. `Code Chivalric` is reported violated on every Dark Angels roster.** A
root-selection bound demands `Selected 0, minimum 1, maximum 1` of `Code
Chivalric` — an **Imperial Knights** configuration entry — and marks it
`Violated`. The entry is **not among the 110 offered roots**, so no player
action can satisfy it, and its `Review available roots` link points at a
browser that does not contain it. It persisted through the entire build.

The `Allied config auto-inserts into a force` fix filtered roots by visibility
for creation and browsing. Structural bound inspection evidently still
enumerates the hidden allied root. The observable consequence is that
RosterForge tells a Dark Angels player their legal army has a known violation
they cannot fix — the exact failure the north star's second clause exists to
prevent, and a direct failure of acceptance proxy 3.

This is the most important result of the run and is now the roadmap's **Next**.

**2. "Non-zero" is the wrong rule for the headline cost.** Immediately after
configuring a 2,000-point roster with no units, the headline figure read
**`2 Detachment Points`** — `pts` was still 0, and zero totals are filtered out,
so a bookkeeping field became the number the player sees. After the enhancement
the header carried three figures: `260 pts | 2 Detachment Points | 1
Enhancements`, two of them counters rather than costs anyone builds against.
The existing `Headline cost against its points limit` row now carries this
evidence: limit-bearing cost types should lead.

**3. Roster duplicate is not reachable.** Confirmed in the running app — the
saved-draft shelf offers Open and Delete only, and there is no duplicate
affordance anywhere. The commands exist and section E is honest that the
*command set* is done. Workflow step 5 in the vision is "save, reopen,
**duplicate**, and revise", so v1 is incomplete until it is exposed.

**4. A 325-point, five-unit draft occupies 13.6 MB.** By design: drafts embed
the source closure so they survive catalogue changes, and quota handling exists.
Recorded as an open product question — how many saved armies is a player
entitled to? — rather than as a defect.

### One thing that is not a finding

The renderer was disposed once mid-run while opening the draft with the browser
pane hidden. It recovered on reload, the draft was intact, and it did not recur.
The cause was not established, and a hidden-pane harness failure had already
occurred earlier in this session for an unrelated reason. It is **not** recorded
as an application defect, because the evidence does not support that.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test files,
  unchanged: no code or test was touched.
- Only `agent-handoff.md` changed.

### What this did not do

No application, test, dependency, build, architecture, compatibility,
diagnostic, or corpus state changed. None of the four findings was fixed. The
list-first restructure did not advance. No Reference Behavior QA against New
Recruit ran; every observation here is about RosterForge against its own
acceptance definition.

### Next recommended boundary

**Fix the `Code Chivalric` false violation.** It is the only finding that makes
the application actively dishonest about legality, it affects every roster of
the faction the reference army uses, and by the vision's decision test it
outranks the remaining presentation work on question 2. Start from the
difference between how root *visibility* filtering and root *bound* enumeration
select their roots — the former was fixed, the latter apparently was not.

The standing presentation row, unit stats and rules readable without two
expansions, moves to second and is unchanged otherwise.

## Completed Assignment — Full Reference Army Run, 2026-08-24

Baseline `4a1489e3e76e9748a1bdf2998d6f564c3c73295e`; resulting commit recorded
below. Documentation only: no application code changed. This supersedes the
partial run recorded in the entry above, which stopped at 325 points.

### The army that was built

Pinned BSData `04c62fcd041b3808c39d5c46fd677c704027b979`,
`Imperium - Dark Angels.json` **revision 3**. Strike Force (2,000-point limit),
**Unforgiven Task Force** detachment, Take and Hold disposition.

| Role | Units |
| --- | --- |
| Character | Captain in Terminator Armour **110** *(Shroud of Heroes enhancement)* |
| Epic Hero | Azrael **140** |
| Infantry | Hellblaster Squad **110**, Deathwing Knights **240**, Deathwing Terminator Squad **165**, Bladeguard Veteran Squad **80**, Inner Circle Companions **160** *(6 models)*, Hellblaster Squad **110** |
| Battleline | Intercessor Squad **80** *(5 models)*, Intercessor Squad **80** *(5 models)* |
| Dedicated Transport | Impulsor **70**, Rhino **65**, Impulsor **70** |
| Vehicle | Ballistus Dreadnought **150**, Land Raider **220**, Ballistus Dreadnought **150** |

Sixteen costed units summing to **exactly 2,000 points**, verified by hand
against the header. Every reference-army requirement is present: a detachment, a
character carrying an enhancement, a squad using wargear replacements (the
Intercessor Sergeant's close combat weapon replaced by a Power fist), and a
dedicated transport.

**Every genuine violation was resolved before the run was called complete.** The
first pass at 2,000 points reported seven structural violations; six were real
and correct — two Intercessor Squads at one model against a 5–10 minimum, two
Impulsors missing a required sponson, two Hellblaster Sergeants missing a
required pistol. Filling the squads to five models and choosing the required
options cleared all six, and none of them changed the points total, which is
correct for this data.

### Final validation state

- Structural: **100 satisfied, 1 violated, 15 unresolved**.
- Constraints: **224 satisfied, 0 violated, 69 unresolved**.
- Completeness: **incomplete**, as it should be while unresolved bounds exist.

The single remaining violation is `Code Chivalric`. **RosterForge cannot report
a correct, legal, fully configured 2,000-point Dark Angels army as legal**, and
the only reason is a phantom Imperial Knights requirement. That is the sharpest
possible statement of the defect's impact, and it is why it is the **Next**.

### What the full run proved that the partial one could not

- **Cost aggregation at scale.** Sixteen units, hand-verified to 2,000 exactly.
- **Quantity-scaled costs.** Inner Circle Companions 3 → 6 models moved
  80 → 160, matching the pinned GW-list finding.
- **Unit-priced squads do not scale.** Intercessor Squad stayed 80 while going
  from 1 to 5 models, which is correct — the cost is on the unit, not the model.
- **Legality-aware amount controls are genuinely missing.** Typing 6 into a
  Deathwing Knight amount produced a 10-model unit; the checks correctly caught
  it as `Observed 9, limit 4`, but nothing stopped the entry. Reverting cleared
  it. Real evidence for that open row.
- **A suspected cost defect was disproved.** Deathwing Knights held at 240 pts
  across that illegal 5 → 10 model change, which looked like a missing
  bracket price. The constraint report settled it: the configuration was
  illegal, so there was no bracket to price. Recorded because the wrong
  conclusion was the tempting one.

### A durability finding the partial run missed

> **Superseded on 2026-08-26.** The conclusion below — that the write is not
> committed when the shelf claims it is — is wrong. Measurement and an
> independent code audit both found the save durable, and the unsaved-changes
> indicator clears only on completion. See "Save Durability Not Reproducible"
> at the end of this file. What the observation most likely captured was a
> programmatic reload landing mid-write, which bypasses the `beforeunload`
> guard a real user would get.

Clicking `Update saved draft` on the 13.6 MB draft and reloading about **1.5
seconds** later restored the roster **330 points light** — the last three units
were gone — even though the shelf row had already updated to the new selection
count. Repeating the save and waiting **8 seconds** before reloading restored
all 2,000 points and every group exactly.

So the write is not committed at the moment the shelf claims it is. A player who
saves and immediately closes the tab can lose work, which is a direct failure of
the v1 clause "save, reopen, and revise". Whether the unsaved-changes indicator
also clears early was **not** verified and is not claimed.

It is ranked immediately after `Code Chivalric` rather than ahead of it: silent
data loss is the more severe failure, but it needs a narrow race, while the
phantom violation is unconditional on every roster of the faction and breaks the
north star's central promise.

### Draft size, clarified

The partial run recorded 13.6 MB for 17 selections. The full army stored **120
selections in the same 13.6 MB**. The size is the embedded catalogue closure,
not the army, and drafts sharing an import share those bytes. That materially
softens the open row: the cost is per distinct catalogue, not per roster.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test files,
  unchanged: no code or test was touched.
- Only `agent-handoff.md` changed.

### What this did not do

No application, test, dependency, build, architecture, compatibility,
diagnostic, or corpus state changed. No finding was fixed. Costs were **not**
checked against an external known-good Dark Angels list, which remains the one
unverified axis of the acceptance definition. No Reference Behavior QA against
New Recruit ran.

### Next recommended boundary

**Fix the `Code Chivalric` false violation**, then the save-durability race.
Start from the difference between how root *visibility* filtering and root
*bound* enumeration select their roots: the former was corrected by the earlier
allied-configuration fix and the latter evidently was not.

## Completed Assignment — Costs Verified Against GW's MFM, 2026-08-24

Baseline `954c07606e07673588014d9e564fcea222c500ee`; resulting commit recorded
below. Documentation only: no application code changed. This closes the one
axis of the v1 acceptance definition the full reference-army run could not.

### Source

Games Workshop's official Munitorum Field Manual, **v1.2**, at
<https://mfm.warhammer-community.com/en/dark-angels>, supplied by the owner.
Non-essential cookies were declined before reading. The page is a public,
authoritative points list, which is precisely what "materially correct costs"
had previously lacked a reference for.

Only the twelve unit costs appearing in the reference army were extracted and
compared. GW's points tables are their copyrighted content; this file records
the **result** of the comparison and the single disagreeing value, not a
reproduction of their list.

### Result: 11 of 12 matched exactly

Captain in Terminator Armour, Azrael, Hellblaster Squad, Deathwing Knights,
Deathwing Terminator Squad, Bladeguard Veteran Squad, Inner Circle Companions
(at six models), Impulsor, Rhino, Ballistus Dreadnought, and Land Raider all
matched RosterForge's reported cost exactly, including the two units whose cost
scales with model count.

The one disagreement was **Intercessor Squad: RosterForge 80, MFM v1.2 75**.

### The mismatch is data freshness, not a cost defect

Checked directly against the pinned corpus rather than inferred:
`Imperium - Space Marines.json` at pin `04c62fc` carries `pts: 80` for
`Intercessor Squad`. RosterForge reported 80. **It read its source correctly.**

This reproduces exactly the pattern the `Community-data mismatch diagnosis` row
already recorded — RosterForge reading stale community data faithfully, with the
actionable gap being freshness rather than cost evaluation. It is now recorded
as its own row, because it is also concrete evidence for the open question of
whether v1 requires *current* BSData or merely *compatible* BSData. The
freshness signal already ships, and a player can import today's files
themselves, so this is not v1-blocking; it is a decision the owner should make
deliberately.

The practical effect on the reference army is small and worth stating plainly:
priced against MFM v1.2 the same list totals **1,990**, not 2,000, because two
Intercessor Squads are each 5 points cheaper than the pinned data believes.

### A gap in the acceptance scenario itself

MFM v1.2 prices many units by **how many copies the army takes** — `YOUR 1ST TO
2ND UNITS COST` versus `YOUR 3RD + UNIT COSTS`. A third Ballistus Dreadnought or
a third Bladeguard Veteran Squad costs more than the first two.

BSData stores a flat base `pts` on the entry plus a small number of modifiers,
so that escalation, if modelled at all, has to be modifier-driven — exactly the
class of behavior the reference army exists to exercise. **The 2,000-point army
built earlier today never crossed a tier boundary**: two Ballistus, two
Impulsors, two Intercessor Squads, two Hellblaster Squads, all inside their
first tier.

So RosterForge's handling of quantity-tiered pricing is **unverified in either
direction** — not shown correct, not shown broken. That is a hole in the
scenario, not just in the product, and it is now a roadmap row: extend the
reference army to include a third copy of a tiered unit, then classify.

Finding this is the strongest argument yet that the reference army earns its
place. Twelve units priced correctly proved a great deal; the thirteenth, which
nobody thought to add, is where the next real question lives.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test files,
  unchanged: no code or test was touched.
- Only `agent-handoff.md` changed.

### What this did not do

No application, test, dependency, build, architecture, compatibility,
diagnostic, or corpus state changed. The corpus pin was **not** advanced, and no
attempt was made to reconcile BSData with MFM v1.2 — that is a data question,
not a code one. No finding from the reference-army run was fixed. The tiered
pricing behavior was not tested, only identified.

### Next recommended boundary

Unchanged: **fix the `Code Chivalric` false violation**, then the
save-durability race. The two rows added here are investigations rather than
defects, and neither is blocking.

## Completed Assignment — `Code Chivalric` False Violation, 2026-08-24

Baseline `f2181782dcd4bf7c5098da16892363d18217640e`; resulting implementation
commit `209787f` (`fix: stop reporting bounds for roots the player is never
offered`) and this handoff commit. The roadmap's **Next**, found by the
reference-army run.

### The defect

A Dark Angels roster reported a violated root bound for `Code Chivalric` —
`Selected 0, minimum 1, maximum 1` — that no player could satisfy. The entry is
an Imperial Knights configuration root that reaches the closure because
`Imperium - Dark Angels.json` carries a `catalogueLink` to
`Imperium - Imperial Knights - Library` with `importRootEntries="true"`. It is
statically `hidden="false"`, so nothing static excluded it, and it only becomes
hidden once the force is known.

### Root cause: two readings of the same question

The add browser and the bound enumeration both walk `context.roots.roots`, and
both filter out `unresolvedEntryLink` with identical predicates. The divergence
is that only one of them evaluates *dynamic* visibility.

- `apps/web/src/roster-session.ts`, `inspectLocalRosterRootChoices`: its
  `offered` predicate calls `evaluateRosterSelectionVisibility` against the
  current force and drops roots that are certainly hidden. This is what takes
  the Dark Angels catalogue's **292 visible roots down to the 110 offered**.
- `packages/evaluation/src/structural-status.ts`: enumerated every root with no
  visibility evaluation at all. `isRelevantRootBound` filters on bound shape
  only — minimum above zero, finite maximum, or incomplete-with-selections —
  which `Code Chivalric` passes.

Both are answering "can the player put this in the roster". When they
disagreed, the roster reported a violation for something it never offered.

### The fix, and the two ways the first attempt was wrong

Root bound enumeration now consults the same visibility evaluator the browser
uses. Both corrections below came from review rather than from the tests, which
is worth recording.

**Delegated review caught a real bug.** The first version skipped every
certainly-hidden root. An independent `codex exec --sandbox read-only` review
pointed out that a root can be *selected* and then become hidden, and blanket
skipping would suppress its genuine bounds — two occurrences of a now-hidden
`max="1"` root would quietly stop being a violation, which is this same defect
inverted. The rule is now: skip only a root that is certainly hidden **and has
no selected occurrence**.

**The completeness signal had to be narrowed.** The same review argued that an
undecidable visibility must make the status incomplete rather than merely
retaining the bound, since whether that bound applies was never established.
Implemented as one aggregate
`EVALUATION_STRUCTURAL_STATUS_ROOT_VISIBILITY_UNRESOLVED` diagnostic. The first
attempt counted every root with unresolved visibility and immediately turned a
synthetic fixture incomplete for a root that had no relevant bound at all. Only
a bound actually being **reported** can be uncertain, so the count now happens
inside the relevance branch. Roots whose visibility cannot change any reported
outcome are ignored.

### Verification

The regression test was proved to catch the defect rather than assumed to.
`conditional-visibility.cat` gained a `Hidden Required Root` — force-scoped
minimum of 1, hides itself once the force holds anything, which is the shape an
allied library contributes. With the fix reverted the test fails with
`expected [ 'Hidden Required Root', 'Alpha' ] to not include 'Hidden Required
Root'`; restored, it passes.

Measured in the browser on real pinned data, Dark Angels revision 3:

| Roster state | Before | After |
| --- | --- | --- |
| Freshly created | 3 structural violations, one of them `Code Chivalric` | **2**, both genuine — Battle Size and Force Disposition unchosen |
| Battle size, detachment and disposition chosen | still violated by `Code Chivalric` | **0 known problems, "NO KNOWN VIOLATIONS"**, 0 constraint violations |

**RosterForge can now report a correct Dark Angels roster as legal.** Before
this, it could not, for any Dark Angels roster at all.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- Normal `pnpm test` — **504 passed, 18 skipped (522 total)** across 53 test
  files.
- Pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` — **522 passed**.
  The corpus caught the change: the Guardian Defenders scenario now emits one
  additional `EVALUATION_STRUCTURAL_STATUS_ROOT_VISIBILITY_UNRESOLVED`, because
  exactly **one root in real data** carries a relevant bound whose visibility
  cannot be decided. That expectation was updated with the reason, not relaxed.
- `docs/compatibility.md` and `docs/diagnostics.md` updated: the boundary moved
  and a diagnostic code was added.

### What this did not do

The save-durability race is untouched and remains the next item. No presentation
work, no roadmap reordering beyond marking this row Done. Completeness still
reports `incomplete` on these rosters, correctly — unresolved bounds remain.

### Next recommended boundary

**The save-durability race.** Saving a 13.6 MB draft and reloading ~1.5 s later
lost the last 330 points while the shelf already showed the new state; an 8 s
wait restored everything. Establish whether the unsaved-changes indicator also
clears before the write commits, since that is what decides whether a player is
warned before closing the tab.

## Completed Assignment — Save Durability Not Reproducible, 2026-08-26

Baseline `b8f78e0d63bb91b4a767c3b627ee438460e6c23b`; resulting test commit
`e26eca2` (`test: pin that a draft save waits for its IndexedDB commit`) and
this handoff commit. The roadmap's **Next**, investigated and closed as **not a
defect**, with one genuine hazard found alongside it.

### The reported defect does not reproduce

The row claimed a saved draft was not durable once the shelf showed it saved.
Two independent lines of evidence say otherwise.

**Measured in the browser.** A save takes about **1 s**, and the
unsaved-changes indicator clears in the *same tick* the save completes — the
open question from the previous entry, now answered: **it does not clear
early**.
Every save-then-reload round-tripped exactly, at 360, 425 and 495 points across
separate attempts, including a reload issued immediately after completion.

Reloading **40 ms** into a save does lose the in-flight edit — 715 on screen,
495 restored. But at that moment the UI still showed `Saving…` **and** `Unsaved
changes`. `unsavedChanges` is `roster !== persistedRoster`, `persistedRoster` is
set only after `await draftStore.save(...)` resolves, and the `beforeunload`
guard is registered for exactly that window
(`use-app-controller.ts:766-777`). A real user is warned; only a programmatic
`location.reload()` slips past, which is what the original observation did.

**Confirmed independently.** A delegated `codex exec --sandbox read-only` audit
of the save, autosave, recovery and load paths concluded "not reproducible from
the code", reasoning that the autosave timer calls `saveRef.current()` and so
uses the latest render's roster, that autosave is blocked while another draft
action runs, that manual saving is disabled during a save, and that recovery
writes use a distinct `__recovery__` key. It noted that explaining the original
observation "requires a later same-ID writer; this controller exposes none".
That matches the measurements rather than merely agreeing with them.

The most likely explanation of the original report is a programmatic reload
landing mid-write while the shelf reading came from a separate tool call. The
earlier entry is marked superseded.

### What was hardened anyway

The durability guarantee rested entirely on reading `withObjectStore` and
noticing it awaits `transactionCompletion`. Nothing pinned it. A request
succeeding is not a commit, and resolving on `onsuccess` would let the
controller set `persistedRoster`, clear the indicator, drop the unload guard and
refresh the shelf while the write could still abort — the app would claim saved
before it was.

`browser-drafts.test.ts` now pins the ordering with an IndexedDB stand-in whose
requests succeed on a microtask while transactions commit only on a macrotask.
Draining a hundred microtask turns finishes every request with nothing
committed, so a store resolving on request success is distinguishable from one
that waits. **Proved by sabotage**: replacing `await completion` with `void
completion` fails the test with `expected true to be false`; restored, all 18
pass.

### A real hazard found by the delegate

Verified in the code rather than taken on trust. On a roster's **first** save,
`use-app-controller.ts:748` schedules the recovery write and `:758-761` runs
`void draftStore.delete(recoveryDraftId)` once `persistedRoster` is set. Both
are fire-and-forget, so a recovery write already in flight can finish *after*
the delete and recreate `__recovery__` holding the pre-save roster.

The saved draft is untouched, so this cannot lose work. What it can do is offer
a later session a stale recovery for a roster that was already saved. It is now
the **Next** row, with two candidate fixes recorded: sequence the delete against
any in-flight recovery write, or make the recovery write a no-op once an active
draft exists.

This is the second time delegation caught something the lead's own reading
missed, and both were ordering hazards. Worth continuing to route this class of
question to a second model.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **505 passed, 18 skipped (523 total)** across 53 test files, one
  new test.
- The sabotage run above, both directions.
- Browser measurements on a real pinned Dark Angels roster: save duration,
  indicator timing, three successful round-trips, and one deliberate mid-write
  reload.

### What this did not do

No application code changed at all — only a test was added. The recovery-slot
race was **not** fixed, only verified and recorded. No presentation work. The
corpus suite was not re-run for this change because it touches no evaluation
path; the normal suite covers the store.

### Next recommended boundary

**Fix the recovery-slot resurrection race.** It is small, it is the last known
durability wart, and leaving it means a player can be offered a stale recovery
of a roster they already saved.

## Completed Assignment — Recovery Slot Resurrection Race, 2026-08-26

Baseline `95d9a79d3d70bf254a9ef2044ab85a027e7c8f17`; resulting implementation
commit and this handoff commit. The roadmap's **Next**, found by the previous
checkpoint's delegated durability audit and fixed here.

### The defect

The unsaved-roster recovery slot is one record at `__recovery__`, written by a
debounced effect while a roster has never been saved and deleted by a second
effect once it becomes a real draft. Both were fire-and-forget — `await` inside
a `void`ed call — so the two effects raced. A slot write copies a whole
catalogue closure and takes about a second on real data, which is long enough
for the delete to be issued, complete, and then be undone by the write landing
behind it. `__recovery__` would be recreated holding the **pre-save** roster.

Nothing is lost: the saved draft is untouched, and the next session's shelf
still has it. What the player gets is a recovery offer for a roster they already
saved — a prompt to restore an older version of work that is not missing.

### The fix: ordering, not exclusion

`apps/web/src/recovery-slot.ts` is new and owns the slot. Both operations queue
onto a single promise chain, so the store applies them in the order they were
*requested* rather than the order they happen to finish. A clear requested after
a write always lands after it.

Exclusion was the obvious alternative and is wrong. Refusing the write while a
save is in progress leaves the pre-existing case uncovered — the write is
already in flight when the save begins — and a lock would have to be released
on every early return in the writer. Ordering needs neither.

Two details are deliberate:

- **A rejected operation must not poison the queue.** `tail.then(op, op)` runs
  the successor from both handlers: it only needs the earlier store access to be
  *finished*, not to have succeeded. A failed write that stranded the clear
  would leave the slot populated for every later session — the same defect by a
  different route. Pinned by the second test.
- **The chain is bounded by work in flight, not by session length.** Each
  operation replaces the tail, so a settled tail is discarded rather than
  retained.

The writer additionally re-checks `rosterSession.roster === persistedRoster`.
This is not redundant with the effect cleanup: the debounce timer is a macrotask
and React flushes effects in a scheduler task, so a timer can fire after the
render that persisted the roster but before that render's cleanup clears it.

### Verification

**Proved by sabotage, not assumed.** Replacing the chain with a direct
`operation()` — exactly the old fire-and-forget shape — fails the new test with
`expected [ 'save:started', 'delete:started' ] to deeply equal [ 'save:started' ]`.
That is the defect itself in the log: the delete ran while the write was still
in flight, so the write would have landed after it. Restored, both tests pass.

Measured in the running app on synthetic fixtures (`projection.gst` plus
`projection.cat`), which keeps saves fast enough to interleave by hand:

| Step | Result |
| --- | --- |
| Edit an unsaved roster, wait out the debounce | `__recovery__` and `history:__recovery__` written — the feature still works |
| Edit, then Save 100 ms before the debounce fires | both slot records gone, and **still gone** when sampled at 0.5, 1, 2, 4 and 8 s |
| Reload | one saved draft on the shelf, **no recovery offered** |

The browser run is a regression check on a user-facing feature, not proof of the
fix: a fixture roster saves in milliseconds, so the race window barely exists
there. The sabotage test is the proof.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean.
- `pnpm test` — **507 passed, 18 skipped (525 total)** across 54 test files, two
  new tests.
- **CI did not run, and these two commits have no remote verification.** GitHub
  Actions was in a `major_outage` (incident <https://stspg.io/pg14nv9m3095>,
  impact critical, from 15:11 UTC) across this whole checkpoint. Run #85 for the
  baseline `95d9a79` sat queued with **zero jobs created** and wedged in
  inconsistent state — `gh run cancel` answered "Cannot cancel a workflow run
  that is completed" while the REST run object still read `queued`, which is the
  incident's database failover showing through. The push of `49d27c0` created
  **no run at all**, because inbound Actions traffic was throttled. `ci.yml`
  triggers only on `push` and `pull_request`, so there is no `workflow_dispatch`
  to re-fire it and a run cannot be obtained retroactively.

  **The next push is what verifies this work remotely** — CI checks the whole
  tree rather than a diff, so the next checkpoint's run covers `33775ee` and
  `49d27c0` along with its own change. Treat those two commits as locally
  verified only until then. Adding `workflow_dispatch:` to the workflow would
  remove this whole failure mode and is worth its own small checkpoint; it was
  deliberately not smuggled into this one.

### What this did not do

No evaluation, parsing or presentation code changed; the corpus suite was not
re-run because nothing it covers was touched. `discardRecoverableRoster` now
also goes through the slot, which is a consistency change rather than a fix —
its race was benign, since a session's own later write is legitimate.

A delegated `codex exec --sandbox read-only` review of this diff confirmed the
fix — "correctly closes the reported resurrection race" — and agreed the identity
guard is neither redundant nor over-broad, since roster values are immutable so
identity *is* the persisted-state test. It named one thing worth recording that
the implementation had not: the clear is deliberately delayed behind a write, so
an operation that never settled would strand everything behind it. That is a
liveness trade required for ordering rather than another resurrection path, and
it is bounded here because the store settles on all three terminal IndexedDB
events — `oncomplete`, `onerror`, `onabort`. The comment in `recovery-slot.ts`
now says so. This is the third consecutive checkpoint where a second model
improved an ordering argument; keep routing this class of question out.

### Next recommended boundary

**Unit stats and rules readable without hunting** — restored as the roadmap's
**Next**, which is what it was before the durability detour. Local durability
now has no known defect, so the north star's first goal is once again the thing
standing between this product and v1.

## Completed Assignment — One-Click Unit Datasheets, 2026-08-26

Baseline `7bf2b57`; resulting implementation commit and this handoff commit. The
roadmap's **Next**, and the first checkpoint taken against the north star's first
goal.

**This row is NOT Done.** See "Why the row stays In progress" before reading it
as closed.

### What shipped

Reaching a top-level unit's statline cost **two** expansions: open the unit card,
then open "Selection details". It now costs **one**. Opening a unit card renders
Keywords, Profiles and Rules directly in the card body.

Editing and provenance moved behind a secondary disclosure named **`Edit
selection`** — occurrence rename, non-model `Amount`, and the Definition/Source/
Hidden rows. The name matters and was a review correction: non-model `Amount` is
reachable *only* there, so a panel named for "details", or treated as debug
material, would have been a discoverability regression. Model amounts keep their
promoted editor on the card body.

Laziness is preserved by **mounting**, not by a flag: the datasheet renders only
inside `selection-card-body`, which exists only when the card is open. A closed
unit still computes nothing, which is what the original 181-of-214 regression
comment was protecting.

### The design was wrong twice, and delegation caught both

Three delegates ran in three lanes. Each changed the outcome.

**A native `Explore` subagent mapped the rendering.** It established that there
are **three** disclosure levels, not two — `selection-children` means a child
model's statline is three deep — and that the print path is **not** prior art:
`RosterPrintSelection` carries no profiles, rules, keywords or info groups at
all. It also found the decisive cost fact: the statline *text* is free
(materialized at load), but *effective values* cost four evaluator calls per
profile, three of which run `collectAffectsRoutedModifiers`, which treats every
roster occurrence as a candidate declarer. Verified by the lead at
`packages/evaluation/src/characteristics.ts:1550` before being acted on.

**Antigravity analysed the captured reference evidence and found two errors.**
First, an earlier draft claimed PDF export *is* New Recruit's answer to reading
an army at a table — a negative the evidence does not carry, since the QA never
opened List Options nor loaded the `/app/list/:id` read route. Second, and more
useful: **interaction count is not equivalence.** A near-fullscreen modal is an
overlay that displaces nothing; an inline expansion reflows the list. Matching
the click count does not match the ergonomics. Both corrections are in the plan.

**Codex rejected the plan's central claim.** The plan said merging was
cost-neutral because army cards default closed. Codex pointed out that
`containsAttention` propagates recursively, so a roster under construction opens
cards in **bulk**, and the attention effect only ever opens — never closes — so a
card stays hot after its violation is resolved. Verified by the lead at
`roster-workspace-model.ts:551`. Codex also supplied the correct CSS direction
(reuse the auto-fit `dl` grid, introduce no fixed table) and the `Edit selection`
naming argument.

### Reference behavior, observed rather than assumed

Delegated browser QA on New Recruit, 7 units / 1015 pts. **One click** reaches a
statline there, via an always-visible per-row eye icon opening a datasheet, and
**zero-interaction statlines do not exist there either** — its rows carry name,
count, points and loadout only. That settled the target as one expansion rather
than zero.

Collection caveats, recorded because they bound the evidence: screenshots were
impossible and real input events never reached the page, so the worker drove the
SPA with synthetic DOM events and read state back from the live DOM. It declined
to click Export to Link because that publishes to their server. The same
non-compositing limitation bit the lead later — **`requestAnimationFrame` never
fires in this browser pane**, which cost three timed-out measurements before it
was identified. Do not use rAF to settle a measurement in this environment.

### Measured, on the real pinned catalogue

Codex's objection deserved a measurement rather than an argument. Pinned BSData
`04c62fc`, Dark Angels revision 3, 292 visible roots, built to 34 cards:

| Open datasheets | Edit time |
| --- | --- |
| 9 | 101, 103, 131 ms |
| 31-33 | 127, 139, 175 ms |

A **3.5x increase in open datasheets costs about 1.4x edit time** — sublinear,
because fixed per-edit work (cost evaluation, structural validation) dominates
the marginal datasheet. The bulk-open case is therefore affordable, which is the
answer to the review objection. Note the 3 to 9 jump happened *on its own* as
units with unsatisfied bounds were added: Codex's worst case occurs naturally,
not only when forced.

**Acceptance proxy 2 holds on real data**: 390 px viewport, **34 open
datasheets**, `documentElement.scrollWidth === clientWidth`, zero overflowing
descendants inside any datasheet, widest datasheet element 244.7 px. This is why
the existing auto-fit `dl` grid was reused rather than replaced.

### A cache was added, and it does less than it first appears

`inspectLocalRosterSelectionCharacteristics` and
`inspectLocalRosterSelectionCategories` are now memoized per session, extending
the `WeakMap`-by-session pattern `roster-session.ts` already used for the two
whole-roster reports.

**It does not make an edit cheap.** An edit returns a new session, so every open
card misses and recomputes. It covers repeated renders within one snapshot —
opening a second card, local state changes — and undo/redo, which restores an
already-evaluated session. An earlier version of the comment claimed it solved
the per-edit bulk cost; that claim was wrong and was corrected in the code rather
than left for the next reader to trust.

### Why the row stays In progress

`selection-children` is untouched, so a squad's **model** statlines remain two
expansions deep: unit card, then "Configure models, wargear and options", then
that child's datasheet. Codex raised this and it is right — marking the row Done
would be false. A child-statline follow-up row is added.

### What this did not do

**Catalogue placement is untouched**, which is the other half of the owner's
stated goal: once the list is created, the catalogue needs to be out of the way.
Antigravity flagged the omission. It is already the "Build phase and reference
phase" row, deliberately sequenced after the list is list-first, and that row now
carries the measured New Recruit geometry — on desktop its roster is squeezed to
about 34% of window width with a unit selected, while mobile hides the catalogue
entirely.

No before/after comparison against the old two-click build was taken; the numbers
above are all post-change. The relevant question was whether bulk-open regresses,
and the sublinear scaling answers that directly.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check` — clean.
- `pnpm test` — **507 passed, 18 skipped (525)** across 54 files.
- Pinned corpus at `04c62fc` — **525 passed (525)**, all 54 files.
- Browser measurements above, on real Dark Angels data.
- **CI: partially recovered, and an earlier claim in this entry was wrong.**
  GitHub Actions was in a critical outage for most of this session
  (<https://stspg.io/pg14nv9m3095>, from 15:11 UTC). An earlier draft of this
  entry said no run existed for `33775ee`, `49d27c0` or `7bf2b57`. That was true
  when written and is **no longer true**: Actions caught up and created both runs
  retroactively, and both **passed** — `#32990527086` for `7bf2b57` and
  `#32990612032` for `49d27c0`. Because CI checks the whole tree, those two green
  runs also cover `33775ee`, which never had a run of its own (it was pushed
  together with `49d27c0`, and Actions creates one run per push, for the head
  SHA).

  Still outstanding: `95d9a79`'s run `#32985164048` is wedged in inconsistent
  state — `gh run cancel` answers "Cannot cancel a workflow run that is
  completed" while the REST object still reads `queued`, with zero jobs created —
  and **this checkpoint's own commit had no run at push time**, with Actions
  still reporting `major_outage`. `ci.yml` triggers only on `push` and
  `pull_request`, so no run can be fired manually. Codex: run `gh run list`
  before assuming this checkpoint is unverified; a run may have appeared since.

### Next recommended boundary

**Child-model statlines**, then **catalogue placement**. The first finishes the
row this checkpoint opened; the second is the other half of the stated goal and
is the larger win. Adding `workflow_dispatch:` to `ci.yml` is a small worthwhile
side task that would have removed this session's entire CI blind spot.

## Completed Assignment — Routine Bounded Delegation, 2026-08-26

Baseline `9a7ea3b54ed663b72b615823e092b8cc51509bcb`; resulting workflow commit
`71d2e31` and this handoff commit. Codex resumed the formal lead at the clean,
freshly fetched baseline with `HEAD == origin/main`, divergence `0 0`, one
worktree, no stash, no concurrent writer, and child-model statlines still the
roadmap `Next`.

### What changed

`AGENTS.md` and `docs/agent-workflow.md` now make useful bounded delegation a
normal part of substantive checkpoint planning instead of an opt-in step whose
lowest-friction reading was to do everything in the lead thread.

The active lead remains primary implementer and retains architecture,
integration, final review, validation, handoff, commits, push, and CI. The new
planning budget is deliberately small:

- zero delegates is normal for tiny, mechanical, or documentation-only work;
- a normal product checkpoint targets one useful delegate;
- complex or cross-cutting work targets one or two useful delegates;
- semantic, architectural, or high-risk correctness work expects an independent
  capable non-lead frontier review when available; and
- large separable implementation may use writer delegates only under the
  existing worktree rules.

The lead plans and launches a useful lane early enough to affect implementation,
tests, or acceptance. Capability to do the work personally is no longer a reason
to skip that step. The targets remain judgment-based rather than quotas: no
duplicate investigations, overlapping writers, unnecessary model calls, or
delegation whose safe briefing, isolation, review, and integration cost exceeds
its likely value. A substantive no-delegate exception is stated in its
completion report; trivial and mechanical work needs no explanation.

### Decisions and preserved boundaries

The correction changes cadence, not authority or access. It preserves the
required task brief, least privilege, native-child capability checks, dedicated
writer worktrees, one writer per worktree, Codex review of delegated code,
Reference Behavior QA classification and browser gates, and all external-write
rules.

The alternative of requiring a fixed number of model calls was rejected because
it would reward fan-out rather than useful independence. Keeping only the old
"concrete advantage" wording was also rejected because recent Codex and Claude
sessions showed that it consistently delayed or suppressed reviews that later
caught real defects and incorrect assumptions.

No delegate was used for this documentation-only correction. That is the normal
zero-delegate case under the policy itself: there was no independent product or
code question, and a second documentation lane would have cost more to brief and
verify than this bounded wording change could return.

### Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning.
- `pnpm test` — **507 passed, 18 skipped (525)** across 54 files.
- Pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **525 passed
  (525)** across 54 files. Its branch is three commits behind its moving remote;
  the exact pin was not changed.
- CI before this push: `#32993598971` for `9a7ea3b` passed. The workflow
  correction's own run is recorded after publication.

### What this did not do

No application code, tests, architecture, compatibility boundary, diagnostic,
product behavior, corpus data, service configuration, or agent installation
changed. The roadmap was not reordered or restatused.

### Next recommended boundary

**Child-model statlines**, exercising the new cadence with at least one useful
bounded delegate launched before implementation is finished.

## Completed Assignment — One-Click Child-Model Statlines, 2026-08-26

Baseline `83dac0e8e7f9bc6f2f02060a5eef40c46caa332f`; resulting implementation
commit `979e45f` and this handoff commit. The roadmap's `Next`, completed under
the resumed Codex lead with one bounded native Codex delegate launched before
implementation.

### What shipped

Opening a top-level army unit now renders its direct model occurrences in an
accessible `Models` section immediately below the unit datasheet. A squad's
model statline therefore costs the same **one unit-card expansion** as the
top-level statline instead of another trip through `selection-children`.

The promotion is exact and deliberately shallow:

- only direct children whose materialized choice resolves to a selection entry
  with `type="model"` move into the reading surface;
- each model still renders through `RosterSelectionItem`, retaining its name,
  amount control, datasheet, `Edit selection`, removal action, diagnostics and
  child-choice controls;
- the parent unit's remaining upgrades stay in `Configure wargear, Warlord &
  options` and render only when opened;
- each promoted model's own `Models, wargear, Warlord and options` disclosure
  starts closed unless descendant attention requires it; and
- unknown child choices, configuration selections, nested sub-units and
  unit-typed automatic descendants are never guessed or flattened. They retain
  the complete recursive configuration tree.

Closed unit cards still mount none of this. The existing unit-card laziness is
therefore preserved; the new work begins only after the player opens the unit.
The datasheet and edit panel were split into focused internal components so the
model section can sit between reading material and build-time provenance without
duplicating model DOM, anchors, controls or evaluator work.

### Delegation changed the result

The early read-only native Codex lane found the existing
`selection-initialization.cat` scenario, which already creates the exact mixed
shape needed for proof: two direct model occurrences, two nested required
weapons and one non-model upgrade. That avoided expanding the broad UI fixture.
It also caught the need for a promoted model's own small child subtree to start
closed; the old convenience rule auto-opened every subtree of two or fewer
children, which would have exposed wargear while claiming to preserve laziness.

The same delegate then reviewed the implementation diff and found two defects
before commit:

1. the first version removed the word `models` from every recursive disclosure,
   including configuration and nested shapes where no models were promoted; the
   final copy is conditional and preserves the old complete label there; and
2. the first partition could remove resolved model children from the fallback
   tree when their parent's own materialized choice was unavailable; the final
   guard promotes nothing unless the parent choice exists, so the defensive path
   remains complete.

The delegate found no duplicate anchors or normal-path React state defect.
Codex reviewed each claim against the diff, reran the focused test after both
corrections, and ran every final gate independently.

### Tests and live QA

The project-owned fixture now gives `Required Model` a small Unit profile. The
UI regression proves, before opening any configuration disclosure, that both
model profiles and both amount controls are mounted while the parent upgrade and
nested weapons are not. It then proves the parent upgrade opens without
duplicating models, a model's nested weapon opens independently, collapsing the
unit removes the whole `Models` region, and remove/re-add restores a model while
keeping its required weapon lazy until requested.

Local browser QA repeated that path against the live Vite application:

- two model profiles visible with the unit open;
- parent configuration and both model wargear disclosures initially closed;
- opening parent configuration retained exactly two model profiles;
- collapsing the unit changed the `Models` region count from 1 to 0, reopening
  restored it to 1; and
- zero browser-console errors.

At a 390 x 844 viewport the document measured 375 px client and scroll width,
the model region measured 229 px client and scroll width, and no descendant
overflowed. This browser uses a 15 px non-overlay scrollbar; at a 335 px outer
viewport the document's supported content width was exactly 320 px, document
client and scroll width were both 320 px, the model region was 175/175 px, and
no model descendant overflowed. An exact 320 px outer viewport leaves only 305
px after that scrollbar and therefore meets the pre-existing `body` 320 px
minimum by scrolling; the promoted models were not the overflow source.

### Verification

- focused `App.ui.test.tsx` — **13 passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **507 passed, 18 skipped (525)** across 54 files; and
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **525 passed
  (525)** across all 54 files; and
- GitHub Actions `#32997233432` for `ab8bb7e` — **passed**.

The prior one-click datasheet Reference Behavior QA already established the
bounded interaction target: New Recruit also requires one interaction to open a
datasheet and offers no zero-interaction statline. This checkpoint did not
classify a new New Recruit discrepancy or depend on a new moving-reference fact,
so it did not create another external roster or repeat that interactive run.

### What this did not do

No evaluator, roster model, architecture, compatibility boundary, diagnostic,
corpus pin or third-party data changed. Recursive model promotion is deliberately
out of scope because it would flatten nested/unit-typed automatic sub-units.
The existing recursive `containsAttention` model and effects still drive unit
and exact-child auto-opening; this checkpoint did not invent a contradictory
fixture solely to add another attention transition test.

### Next recommended boundary

**Catalogue placement**, the bounded first half of `Build phase and reference
phase`. Make the catalogue pleasant while choosing and able to get out of the
way while reading; do not absorb newly-added-unit focus or broader mode semantics
into the same checkpoint.

## Completed Assignment — Reader-Controlled Catalogue Placement, 2026-08-26

Baseline `fe3c8ec9167e0af81696f114423ce2eff7173484`; resulting implementation
commit `bc95371` and this handoff commit. Codex completed the roadmap's bounded
catalogue-placement half as active lead, with one read-only native Codex lane
launched before implementation to inspect the layout, state and test seams.

### What shipped

The roster workspace now treats catalogue placement as a reader choice rather
than a permanent equal-width pane:

- desktop starts with the catalogue present as a bounded 320–400 px sidebar and
  gives the roster the remaining width;
- the sticky workspace navigation exposes an explicit Show/Hide catalogue
  disclosure, with its available-choice count and accessible expanded state;
- hiding the catalogue unmounts its potentially large choice tree and expands
  the selected roster to the full builder width;
- a newly opened workspace at the existing 850 px responsive breakpoint starts
  roster-first, with the catalogue closed but explicitly reopenable; and
- catalogue filtering survives hide/show, while adding a unit deliberately does
  not change placement. Newly-added-unit focus and broader phase semantics stay
  in their later roadmap checkpoint.

The responsive initializer runs only when `RosterOverview` mounts. It does not
subscribe to viewport changes, because resizing must not overwrite the user's
explicit placement choice. Root-choice inspection diagnostics remain with the
catalogue; command diagnostics from add/remove/rename/amount operations remain
outside it, so hiding the browser cannot hide an error from a still-visible
roster control.

### Delegation changed the result

The early read-only lane agreed that local `RosterOverview` presentation state
was the correct seam and rejected controller, draft-persistence, and phase-mode
changes. Its review then caught four issues before commit: the catalogue still
owned more width than the roster, the nav action copy was ambiguous, the mobile
default lacked a regression test, and controller-supplied roster diagnostics
would have disappeared with the catalogue. Codex verified those findings in
the call sites and incorporated each correction. The same review recommended
conditional unmounting for the catalogue's large DOM; the collapsed control
therefore omits `aria-controls` rather than pointing to a nonexistent target,
while retaining `aria-expanded` as its disclosure state.

### Reference evidence and live QA

No new moving-reference discrepancy was classified. The implementation used
the already captured 2026-08-26 Reference Behavior QA evidence recorded in the
roadmap: New Recruit keeps a 400 px desktop catalogue, hides it on mobile, and
offers explicit auto/always-hide settings. RosterForge adopts the supported
interaction goal — present while choosing, removable while reading, roster-first
on phone — without copying New Recruit's three-pane geometry or automatic mode
policy.

Live browser QA used the pinned Death Guard catalogue at desktop and 390 x 844:

- at 1440 px the open builder measured 1,143 px, with a 727 px roster and exact
  400 px catalogue; hiding expanded the roster to the full 1,143 px and removed
  the catalogue DOM;
- a `plague` filter retained all six matches across hide/show;
- a fresh 390 x 844 workspace started with zero catalogue panes, reopened to a
  293 px single-column catalogue, and closed again through the same control;
- document client and scroll width both stayed 375 px at that phone viewport;
  and
- the browser console reported zero errors.

### Verification

- focused `App.ui.test.tsx` — **14 passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **508 passed, 18 skipped (526)** across 54 files; and
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **526 passed
  (526)** across all 54 files. Its branch is four commits behind its moving
  remote; the exact pin was intentionally not changed; and
- GitHub Actions `#33000424121` for `a8e6063` — **passed**.

### What this did not do

No evaluator, roster model, controller, persistence format, architecture,
compatibility boundary, diagnostic code, corpus data, or third-party data
changed. The preference is session-local rather than persisted. Adding a unit
does not focus it, automatically hide the catalogue, or introduce shop/editor
modes. No external Reference QA roster was created during this checkpoint.

### Next recommended boundary

**Violations shown in place on the row that is wrong.** The presentation model
already carries `attention` and `containsAttention`; render that signal on the
affected battlefield-role or selection row without weakening the existing
validity/completeness boundary or removing the detailed checks.

## Completed Assignment — Inline Known-Violation Markers, 2026-08-26

Baseline `a423b1116cbf5307ecd205b6f8db4871b95b055b`; resulting implementation
commit `2a7d960` and this handoff commit. Codex completed the next list-first
presentation checkpoint as active lead, with one read-only native Codex lane
launched before implementation to audit ownership semantics, accessibility,
and regression seams.

### What shipped

Known supported-validation violations now appear where the player can act on
them:

- a battlefield-role heading says `Contains known violation` when one of its
  selected subtrees contains an actionable finding;
- only the exact owning selection row receives the red `Known violation`
  marker and styling;
- that marker links to the retained Checks section, whose detailed finding in
  turn still links back to the exact stable occurrence anchor; and
- resolving a finding removes both the exact-row marker and its containing role
  signal on the next immutable roster snapshot.

The marker is deliberately a presence signal rather than an issue count.
Several findings can share one owner, and a role signal repeats location
awareness rather than representing another problem; the player header and
composed validation report remain the authoritative count.

The existing presentation model owns the safety boundary. `attention` means the
exact owner of a violated structural direct/group bound or selection constraint.
`containsAttention` propagates only enough ancestry to open disclosures and
signal the containing role. Ancestor selections therefore are not mislabeled as
violating. Structural root findings and force constraints have no selection
owner and remain in the header/detailed checks; unresolved and incomplete
findings remain separately reported and never create inline markers.

### Delegation changed the result

The early read-only lane verified that no evaluator or model-policy change was
needed and rejected deriving markers independently in React from raw findings.
It made three boundaries explicit before commit: use `attention`, never
`containsAttention`, on an exact row; do not turn a marker into a count; and do
not guess root or force failures onto a battlefield role. It also identified the
existing Squad Doctrine flow as the best dynamic regression seam and called out
the new marker/Remove action row for phone-width QA. Codex reviewed each claim
against `supportedValidationSelectionIds`, the projection recursion and the
rendering diff before accepting it.

### Reference evidence and live QA

No new moving-reference discrepancy was classified. The checkpoint used the
already recorded Reference Behavior QA observation that New Recruit attaches a
Character requirement to its category heading rather than leaving every problem
in a detached report. RosterForge follows that information-architecture goal
with its own role and exact-selection surfaces; it does not copy New Recruit's
markup, iconography or category-limit presentation.

Live browser QA used the pinned Death Guard catalogue. Its initial Configuration
group showed exact markers on Battle Size and Force Disposition while Detachment
remained unmarked. Adding Plague Marines surfaced the exact Plague Champion
owner under a signaled Battleline group, without marking the ancestor unit as
the owner. Selecting Strike Force, Virulent Vectorium and Take and Hold removed
both Configuration row markers and that role signal while leaving the unrelated
Plague Champion marker intact. The inline link reached Checks at the sticky-bar
offset, and a detailed `Review selection` link still resolved to a mounted exact
row.

At 390 x 844 the document measured 375 px client and scroll width; at a 335 px
outer viewport it measured the supported 320 px content width for both. All
three marked action rows had equal client and scroll widths at both sizes, and
the browser console reported zero errors.

### Verification

- focused `App.ui.test.tsx` plus `roster-workspace-model.test.ts` — **18
  passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **508 passed, 18 skipped (526)** across 54 files; and
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **526 passed
  (526)** across all 54 files. Its branch is four commits behind its moving
  remote; the exact pin was intentionally not changed; and
- GitHub Actions `#33003087114` for `5f527f1` — **passed**.

### What this did not do

No evaluator, validation composition, roster model, controller, persistence,
architecture, compatibility boundary, diagnostic code, corpus data, or
third-party data changed. Detailed Checks, structural status and constraint
bounds remain in their existing full-width position; demoting them is the next
separate checkpoint. Root/force violations are not assigned to a selection or
role that does not own them. Category limit copy, missing-role rows, full
legality, and broader build/reference modes remain outside this slice.

### Next recommended boundary

**Demote the report sections below the list.** Keep the compact player header,
inline markers, exact reciprocal links, validity/completeness distinction,
unsupported-behavior diagnostics, and full detailed evidence, but make the
army list visually primary instead of giving the reports co-equal page weight.

## Completed Assignment — Explicit Group-Choice Deselection, 2026-08-26

Baseline `558def142ee6266a86f3d721b7735028c1349e3f`; resulting implementation
commit `4a75d14` and this handoff commit. The owner interrupted the roadmap with
a bounded interaction defect: clicking the already-selected Aeldari `Warhost`
choice added another occurrence and increased the group counter indefinitely.
Codex fixed that defect as active lead without beginning report demotion.

### What shipped

A group member's selected state is no longer an overloaded add command:

- one selected occurrence renders an enabled `Deselect <choice>` action;
- repeated occurrences render `Remove one <choice> (<n> selected)` and remove
  only the newest matching occurrence, preserving older independently
  configured subtrees and making recovery one immutable undoable edit at a
  time;
- a repeat-capable exact choice retains a separate `Add another <choice>`
  action while both its aggregate group and its effective exact parent maximum
  have capacity; and
- choosing a different member of a supported max-one group still performs the
  existing atomic replacement.

The exact-capacity decision reuses the supported-validation report already
computed for the same immutable workspace snapshot. A complete finite
parent-scoped `selections` maximum suppresses `Add another` when its observed
amount reaches the effective limit. The `-1` sentinel remains unbounded, and an
unknown or incomplete exact bound stays permissive and incomplete rather than
being guessed. Removal remains available at a maximum and below a manual
minimum; the existing validation surface reports the resulting violation.

### Delegation changed the result

One read-only native Codex lane was launched before implementation to trace
group commands, exact-child capacity, and regression seams. Its pinned-corpus
scan found at least **1,707** statically direct shapes where both the group and
the concrete child legitimately permit multiple or unbounded copies: 691 model
entries and 1,016 upgrades. That disproved the lead's first pure-toggle design,
which would have fixed Warhost by removing the only way to add legal repeated
models or wargear. The final design therefore separates Deselect/Remove from
Add another and consumes effective exact-occurrence constraints instead of
guessing from the group maximum alone. Codex reviewed the finding against the
Aeldari source and the live constraint-report types before accepting it.

### Live QA and discrepancy classification

The saved pinned Aeldari roster reproduced the defect before the change:
`Warhost selected` changed the Detachments status from `1 selected` to `2
selected`, then `3 selected`, without offering removal. The source topology
explains why group-only policy failed: `Detachments` is unbounded in the current
Strike Force state, while the concrete Warhost entry carries an effective
parent maximum of one.

After the change, the accidentally duplicated live state recovered
`3 -> 2 -> 1 -> 0` through explicit newest-first removal, then `Choose Warhost`
restored the original single selection. A fresh final toggle measured `1 -> 0
-> 1`; at one selected the group offered `Deselect Warhost`, no `Add another
Warhost`, and every distinct detachment remained separately chooseable. The
saved draft was left restored at one Warhost, and the local web application was
left running for owner review.

No moving-reference behavior was needed to classify this checkpoint. The owner
reported the exact broken RosterForge interaction, and the fix preserves the
repository's established permissive-edit and independent validity/completeness
contract. No New Recruit roster or external Reference Behavior QA state was
created.

### Verification

- focused `App.ui.test.tsx` — **16 passed**, including max-one deselection and
  replacement, legitimate two-copy add/remove behavior, and an Aeldari-shaped
  unbounded group with an exact max-one member;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **510 passed, 18 skipped (528)** across 54 files; and
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **528 passed
  (528)** across all 54 files. Its branch is four commits behind its moving
  remote; the exact pin was intentionally not changed.

- GitHub Actions `#33005781196` for `948544a` — **passed**.

### What this did not do

No evaluator semantics, constraint composition, roster model, controller,
persistence format, architecture boundary, diagnostic code, corpus data, or
third-party data changed. The UI still permits an edit when support is unknown;
it merely makes add and remove intent explicit. Common-loadout flattening,
dedicated Warlord controls, model-count controls, and report demotion remain
separate roadmap work.

### Next recommended boundary

**Demote the report sections below the list.** This defect checkpoint does not
reorder the approved list-first sequence. Keep the compact player header,
inline markers, exact reciprocal links, validity/completeness distinction,
unsupported-behavior diagnostics, and full detailed evidence while making the
army list visually primary.

## Completed Assignment — Stable Group-Choice Labels, 2026-08-26

Baseline `cdad03f095b3f9367e5332586c6daf0511c9ef74`; resulting implementation
commit `77b0aa2` and this handoff commit. At the owner's request, Codex completed
one atomic presentation follow-up to the group-choice deselection checkpoint.

Every concrete group choice now keeps its source display name in both states:
`Warhost` before selection and `Warhost` after selection. The existing filled
button styling and `aria-pressed` state carry selection instead of visible
`Choose`/`Deselect` prefixes. A repeated exact choice retains its amount suffix
when more than one copy exists, and the separate `Add another <choice>` action
remains explicit because it performs a different operation.

This checkpoint used no delegate. It was a genuinely atomic label/test
correction with no semantic, architectural, or separable investigation lane;
briefing and integrating another worker would have cost more than the change.

Live browser QA reopened the saved pinned Aeldari roster. The visible Warhost
label stayed identical while `aria-pressed` changed `true -> false -> true` and
the Detachments status changed `1 selected -> 0 selected -> 1 selected`. The
saved roster was restored to one Warhost and the local app was left running for
owner review. No New Recruit behavior or external Reference QA state was
needed: this was an owner-directed RosterForge copy decision.

Verification:

- focused `App.ui.test.tsx` — **16 passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **510 passed, 18 skipped (528)** across 54 files; and
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **528 passed
  (528)** across all 54 files. The pin was intentionally unchanged; and
- GitHub Actions `#33007682794` for `4025db2` — **passed**.

No evaluator, validation, roster command, persistence, architecture,
compatibility, diagnostic, corpus, or third-party data changed. Report-section
demotion remains **Next**.

## Completed Assignment — Cross-Provider Delegation Planning, 2026-08-26

Baseline `14e406c6feb83213cfd718cd7fb59474b8063e0d`; resulting policy commit
`81b2232` and this handoff commit. At the owner's request, Codex made one bounded
workflow correction before returning to the product roadmap.

`AGENTS.md` and `docs/agent-workflow.md` no longer treat the active lead's native
children as the blanket first lane for ordinary separable work. Checkpoint
planning now makes the native-versus-external choice explicit. Native children
remain strongest for low-overhead, implementation-adjacent work that benefits
from the lead's current context; external specialists remain strongest for
independent review, semantic or architectural analysis, difficult debugging,
long read-only work, different reasoning, specialist tools, and suitable tasks
that can use a separate provider allowance.

Cross-provider capacity balancing is now a legitimate concrete delegation
benefit when the assigned work actually needs doing. It is weighed against
independence, tool fit, parallel progress, context preservation, review quality,
and coordination cost rather than used as a reason to call models merely to
burn quota. If two consecutive substantive checkpoints used only native
delegation, the next lead must explicitly look for a useful external lane; it
uses one when suitable and records why not when none exists. The existing
checkpoint budgets, lead ownership, least-privilege briefs, primary-checkout and
worktree rules, external-write restrictions, integration responsibility, and
Reference Behavior QA protocol are unchanged.

This documentation-only checkpoint used no delegate. It was an atomic policy
edit whose review and integration overhead would have exceeded the value of a
delegated lane; the revised policy will be exercised on the substantive report-
demotion checkpoint immediately after publication.

Verification:

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **510 passed, 18 skipped (528)** across 54 files; and
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **528 passed
  (528)** across all 54 files. The pin was intentionally unchanged.

No application code, evaluator behavior, validation composition, persistence,
architecture boundary, compatibility claim, diagnostic, corpus data, or third-
party data changed. No roadmap row moved: **report-section demotion remains
Next**.

## Completed Assignment — Detailed Report Demotion, 2026-08-26

Baseline `199f0340ad20938e990217aaec46f2eed11c0a28`; resulting implementation
commit `b573d4b` and this handoff commit. Codex completed the last bounded row of
the approved list-first restructure as active lead.

The Checks heading and every existing fragment target remain permanently
visible below the roster builder. The structural-status and constraint-bound
cards, diagnostics, counts, satisfied evidence, unresolved evidence and exact
review links now live inside one accessible `Detailed supported evidence`
disclosure. A clean, complete roster starts with that evidence collapsed. Checks
that are unavailable, invalid or incomplete open it automatically, so an
incomplete-but-valid roster cannot look confidently clean. A changed known-
violation count reopens evidence after a manual close, while the summary itself
always states the current known-violation count and inspection completeness.

This structure was chosen instead of wrapping the whole Checks region or each
fragment target in a closed disclosure. Keeping `#roster-checks-heading`,
`#roster-structural-status-heading` and `#roster-constraint-heading` on the
always-reachable path preserves the sticky navigation, player-header links,
inline selection-to-check links and report-to-selection links without relying
on browser-specific fragment navigation to reveal a closed ancestor. It also
avoids duplicating the full reports or weakening their validity/completeness
language merely to reduce visual weight.

### Delegation and review

An early constrained read-only Claude Code review inspected the exact baseline
with only `Read`, `Grep` and `Glob`. It identified two risks the lead's first
layout sketch had not covered: fragment-link tests only proved target existence,
not visibility, and the existing incomplete fixture was also invalid, leaving
the valid-but-incomplete honesty case untested. The implementation therefore
keeps the report anchors outside the collapsing body, opens on incompleteness as
well as invalidity, and extends the fixture until its last known violation is
resolved while its unsupported modifier-driven bound remains incomplete.

Live browser QA found one additional race after that review: closing an already
incomplete native `<details>` and immediately creating a violation could let the
old toggle event overwrite the attention-driven reopen. The summary now owns
the controlled toggle directly. Repeating the exact sequence changed the saved
Aeldari roster from `0 known violations` to `1`, reopened the report, and then
returned to `0` after Warhost was restored.

### Verification

- focused `App.ui.test.tsx` — **16 passed**, covering clean collapsed evidence,
  automatic violated and incomplete states, a valid-but-incomplete state, and
  reopening after a changed known-violation count;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **510 passed, 18 skipped (528)** across 54 files;
- pinned corpus `E:\GitHub\wh40k-11e` at
  `04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON files — **528 passed
  (528)** across all 54 files; and
- live desktop and 390 x 844 QA on the saved pinned Aeldari roster — Warhost was
  restored selected, the incomplete report remained honest at zero known
  violations, the collapsed row fit a 292 px content width, and the 390 px page
  measured 375 px of document width with no horizontal overflow; and
- GitHub Actions `#33011045411` for `7b45a87` — **passed**.

No New Recruit behavior was needed to classify this checkpoint: it changes
RosterForge's hierarchy around retained evidence, not imported game semantics.
No evaluator, validation composition, roster command, persistence, architecture
boundary, compatibility claim, diagnostic, corpus data or third-party data
changed. The local application remains running at `http://127.0.0.1:5173/`, the
saved Aeldari roster is restored to one Warhost, and the checks disclosure is
left collapsed for owner review.

### Next recommended boundary

**Complete the remaining build-versus-reference phase behavior.** Keep the
reader-controlled catalogue placement already shipped; make newly added units
easy to find and refine the choosing-to-reading transition without recreating
the old two-pane concept or copying New Recruit's squeezed three-pane geometry.

## Completed Assignment — Roster Orientation And Direct Choices, 2026-08-26

Baseline `7ab7b0b900dee3aa03d808e720d3f2e87670c0ef`; resulting implementation
commit `1b44cfb` and this handoff commit. The owner supplied one wide-screen
Aeldari screenshot and six usability findings. Codex kept the selected-unit
editor/view redesign as the next bounded checkpoint and completed the five
independent defects that could ship without pre-empting that architecture.

### What shipped

- Complete finite force-cost maxima are joined to evaluated totals by cost-type
  ID. A limit-bearing total renders at zero, the header shows used / maximum,
  and the sticky workspace link shows used / maximum plus remaining or overage.
  No cost name such as `pts` is treated as semantic.
- Imported materialized choices use their authored category-link names only as
  a fallback after canonical local category definitions. The pinned Corsair
  Voidscarred now shows readable Keywords instead of opaque target IDs; no
  ID-shaped content is hidden heuristically.
- Direct quick choices now follow the already-shipped group-choice contract:
  the stable selected button removes the newest exact occurrence, and a
  separate `Add another` action remains only while direct and effective exact
  maxima allow it. Existing immutable commands, reconciliation, undo, and
  validation remain authoritative.
- The application shell no longer stops at 1,240 px. Viewport gutters remain,
  the catalogue remains bounded at 320–400 px, and the roster consumes the
  recovered desktop width.
- Configuration retains its existing semantic role and expanded behavior but
  now sits in a tinted, gold-edged section clearly divided from the battlefield-
  role army groups.

### Delegation changed the plan

A read-only native Codex lane was launched before implementation to trace the
owner's Mistshield example through pinned data and the current choice model. It
proved Mistshield is not a group member: Voidscarred Felarch directly links the
shared Mistshield selection entry, with complete parent-scoped maximum one.
That ruled out changing the group controller and kept the fix in the direct-
choice presentation, using the existing `onRemove` command and exact-capacity
index. The same review identified the project-owned repeatable Special Weapon
fixture, which now proves the selected control removes while a distinct Add-
another path survives. Codex reviewed the data IDs, materialization path,
current diff, and all resulting tests before accepting the finding.

### Evidence and validation

The screenshot's five opaque keyword strings were category target IDs. The
pinned Aeldari source gives those exact targets authored names including
Anhrathe, Corsair Voidscarred, Aeldari, Ynnari, and Corsairs and Travelling
Players. An optional real-data assertion now builds the exact Corsair path,
checks those readable names, and pins Mistshield as a direct complete max-one
choice.

Live browser QA on the saved pinned Aeldari roster measured:

- at a 1,920 x 1,080 viewport, a 1,865 px shell, 1,351 px roster pane, and
  400 px catalogue pane, with no horizontal overflow;
- the sticky navigation fixed at the viewport top showing `90 / 2,000 pts` and
  `1,910 remaining`;
- the strengthened Configuration section at 1,314 px wide with its distinct
  background and 4 px edge;
- Corsair Voidscarred with no opaque category IDs visible; and
- Mistshield `aria-pressed=false -> true -> false` from the same stable button,
  with zero `Add another Mistshield` controls at its complete maximum one.

The temporary Corsair and Mistshield edits were undone. The saved roster was
left at its original 90 points, and the local application remains running at
`http://127.0.0.1:5173/` for owner review.

Verification:

- focused workspace model and UI — **21 passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` — **511 passed, 18 skipped (529)** across 54 files; and
- optional exact Aeldari assertion at pinned corpus
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **1 passed, 17 skipped** in
  its focused integration file; and
- GitHub Actions `#33014746560` for `d5b35b9` — **passed** all repository CI
  gates.

No New Recruit behavior was needed to classify these owner-observed
RosterForge defects. No evaluator semantics, constraint composition, roster
command, persistence format, architecture direction, compatibility claim,
diagnostic, corpus data, or third-party data changed.

### Next recommended boundary

**Build the selected-unit workspace.** Adding or selecting a unit should focus
it, its configurable options should occupy a dedicated editing surface instead
of expanding inline through the army list, and a separate `View` action should
open the complete unit card. Preserve the explicit catalogue placement, the
new full-width shell, list-first reading mode, one-click datasheets, sticky
points capacity, attention routing, and phone-width no-overflow contract. Do
not copy New Recruit's squeezed permanent three-pane desktop geometry.

## Completed Assignment — Configuration Before The Roster Workspace, 2026-08-26

Baseline `015e53bab941ffc3e106ee6367e374aced90d3fd`; resulting implementation
commit `1abcaea` and this handoff commit. The owner requested that setup read as
a step completed before unit building rather than as one role inside the army
list.

Configuration now renders as one full-width, default-open disclosure after the
roster summary/actions and before the sticky navigator and roster/catalogue
grid. Detachment, battle size, force disposition, and every other existing
configuration row retain their exact controls and remain expanded inside that
outer disclosure. Collapsing the whole section removes them from the building
path without mutating or persisting roster state. A new roster or a removed and
restored configuration group opens setup again; ordinary roster edits preserve
the player's explicit open/closed choice. A newly introduced known violation
also reopens setup, and detailed report links reveal an exact configuration
target before following its fragment.

Configuration no longer contributes to the Selected roster count or empty
state. Those now use only the presentation model's army groups and their summed
amounts, so a configuration-only force says `No units added yet` and an amount-
greater-than-one unit is not undercounted. No evaluator, controller, roster,
command, persistence, or classification rule changed.

The earlier always-visible points requirement remains intact across the new
document order. While expanded setup scrolls, its own sticky heading repeats the
same exact limit-bearing used/maximum cost; when Configuration ends, the normal
sticky workspace navigator takes over. This was preferred to moving the
navigator ahead of setup, which would contradict the requested sequence, or to
adding a separate fixed overlay.

### Delegation and review

One read-only native Codex lane reviewed the component, model contract, test
seams, accessibility, sticky behavior, and mobile risks before and after
implementation. Its early review caught an amount-count defect in the lead's
first draft (`group.selections.length` instead of `group.amount`) and identified
the exact-validation-link disclosure risk. Its final diff review caught two
additional regressions before commit: Configuration had lost heading semantics,
and nested configuration lists had fallen outside the old list-reset selector.
The final code uses an accessible `h3`, restores all nested list resets, and
pins exact-link reveal behavior in the UI test. Codex independently reviewed
and reran every resulting check.

### Evidence and validation

Live browser QA reopened the unchanged saved pinned Aeldari roster at 90 points.
At 1,920 x 1,080, Configuration and the navigator each measured 1,767 px wide,
and document width was 1,905 px against a 1,920 px viewport. Configuration
preceded the navigator, which preceded the roster/catalogue grid. At scroll Y
2,039 the Configuration summary was sticky at viewport top `0`, still showing
`90 / 2,000 pts`; collapsing reduced the section to 79 px, and the ordinary
navigator reached sticky top `0` once the builder scrolled. At 390 x 844, the
document measured 375 px with no horizontal overflow, and the wrapped setup
summary, configuration section, and navigator each stayed within that width.
The final DOM exposed Configuration as an `h3`, and every nested configuration
list computed `list-style-type: none`.

Verification:

- focused `App.ui.test.tsx` — **18 passed**, including document order,
  default-open collapse/reopen, configuration exclusion from the army count,
  and exact validation-link reveal;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning; and
- `pnpm test` — **512 passed, 18 skipped (530)** across 54 files.
- GitHub Actions `#33017234229` for `fce72bd` — **passed** all repository CI
  gates.

The optional corpus suite was not rerun because this checkpoint changes only
web presentation and uses no new imported-data semantic claim. The configured
corpus remains pinned at
`04c62fcd041b3808c39d5c46fd677c704027b979`; the live roster was loaded from
that saved pinned source. No New Recruit comparison was needed: this is an
owner-directed RosterForge layout decision, not a reference-behavior
classification. The local application remains running at
`http://127.0.0.1:5173/`, with the saved Aeldari roster unchanged and
Configuration left open for owner review.

### Next recommended boundary

**Build the selected-unit workspace.** Newly-added focus, the dedicated options
surface, and the separate full-card `View` action apply only to army groups;
configuration remains in this setup disclosure and must not take over the unit
editor. Preserve explicit catalogue placement, sticky points capacity,
attention routing, full-width use, and the phone-width no-overflow contract.

## Completed Assignment — Multi-Model Unit Controls And Composition, 2026-08-26

Baseline `30e55ee32744177653a8803bc469e91bebdaf3c3`; resulting implementation
commit `eb7d4f0` and this handoff commit. The owner supplied a New Recruit
composition screenshot and requested a bounded usability refinement before the
selected-unit workspace.

Configuration selections now start open but collapse independently inside the
outer Configuration step. Direct model occurrences likewise have independent
disclosures, so opening a unit no longer renders every model datasheet and
editor at once. The existing attention transition still reopens any selection
that gains a supported violation.

Repeatable choices whose materialized entry type is exactly `model` use an
explicit minus/count/plus control in both direct and group choice paths.
Upgrades and max-one model choices keep the stable select/deselect behavior.
Plus creates a new occurrence because copies can carry different configured
subtrees. Minus decreases the newest occurrence's amount override by one, or
removes only that newest occurrence when its effective amount is one. Complete
known maxima disable plus; unresolved bounds remain permissive and incomplete,
and minimum violations remain recoverable rather than blocking removal.

Every top-level unit with exact direct model children now keeps a compact
composition summary visible even while the unit is collapsed: one total model
count beside the unit name and one row per exact materialized catalogue model
choice below it. Repeated occurrences and amount overrides are summed. Grouping
uses definition identity and catalogue model names, not player renames,
display-only name modifiers, guessed keywords, profiles, or inferred wargear.
Unknown child types stay out of the summary and remain in the complete editing
tree.

### Delegation and review

Codex remained primary implementer and launched one constrained external Claude
Code review before the implementation settled, using only `Read`, `Grep`, and
`Glob`. Claude independently confirmed the occurrence-versus-amount mutation
split, direct/group model gating, permissive unresolved-bound behavior, and
reuse of attention-driven disclosures. It also identified a real naming risk
in the lead's first draft: grouping by occurrence display name would split
player-renamed copies and merge catalogue-identical copies inconsistently with
the requested notion of model type. The final code groups by exact materialized
choice identity and uses the catalogue model name. Codex reviewed that finding,
the full diff, and every resulting check before accepting it.

### Reference evidence and validation

The supplied screenshot showed New Recruit presenting `5 Dark Reapers` with
composition lines for `1x Dark Reaper Exarch: Reaper Launcher` and `4x Dark
Reaper`. It was used as owner-approved information-architecture evidence, not
as proof of an imported-behavior defect. No interactive New Recruit execution
or discrepancy classification was needed because this checkpoint changes only
RosterForge controls and presentation.

Live browser QA used the unchanged saved pinned Aeldari source at
`04c62fcd041b3808c39d5c46fd677c704027b979`:

- Guardian Defenders rendered `11 models`, split truthfully into `10x Guardian
  Defender` and `1x Heavy Weapon Platform`, while its unit card was collapsed;
- Force Disposition independently changed expanded -> collapsed -> expanded,
  removing and restoring only its body;
- a temporary Wraithguard rendered `5 models` and `5x Wraithguard`; all five
  model occurrences started independently collapsed, and opening one exposed
  exactly one `Models in this squad` editor;
- Wraithguard minus changed 5 -> 4, refreshed the composition to `4x`, and
  enabled plus; plus restored 4 -> 5 and disabled itself at the complete known
  maximum; and
- at 390 x 844 the page measured 375 px document width with no horizontal
  overflow. At the 320 x 568 override, document scroll width matched the 320 px
  viewport while the 150 px quantity control and 175 px composition row stayed
  inside the single-column roster card.

The temporary Wraithguard edits were removed, autosave completed, and the saved
roster was restored to its original one-unit, 90-point state.

Verification:

- focused workspace and UI — **513 passed, 18 skipped (531)** across 55 files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean; the production build retains only Vite's existing
  large-chunk warning; and
- the optional corpus suite was not rerun because no evaluator, imported-data
  semantic, compatibility claim, diagnostic, persisted format, architecture
  boundary, corpus data, or third-party data changed; and
- GitHub Actions `#33020750626` for `54c8218` — **passed** every repository CI
  gate.

### Next recommended boundary

**Build the selected-unit workspace.** Newly added or explicitly selected army
units should focus a dedicated options surface, while a separate `View` action
opens the full card. Reuse the exact model counts and explicit quantity
controls from this checkpoint; do not recreate them in a second state model.
Keep Configuration outside that editor, preserve reader-controlled catalogue
placement and attention routing, and define the mobile transition without a
permanent three-pane phone layout.

## Completed Assignment — Required Direct Wargear Protection, 2026-08-26

Baseline `682cc2c2dd66cf482c4b86c350b4067f3bb730a2`; resulting implementation
commit `4c4cd12e10b979c740feace6e6311645ea76b66c` and this handoff commit. The
owner reported that a Dark Reaper could be stripped of the weapons every model
must carry, while the Dark Reaper Exarch's replaceable launcher correctly
needed to remain editable.

The direct quick-choice control now distinguishes a complete known minimum
from an optional or unresolved bound. A selected direct `upgrade` is disabled
only when removing its newest exact occurrence would take the summed selected
amount below that minimum. This amount-aware floor leaves genuine surplus
copies removable. The selected state remains visible and its status says that
the choice is required.

The restriction intentionally stops at direct upgrades. Repeatable model
quantity controls retain their separately documented recoverable-minimum
behavior, root selections remain removable with their whole subtree, and
selection-entry group members retain ordinary deselection and atomic max-one
replacement. Incomplete bounds remain permissive rather than turning
unsupported modifier semantics into a guessed UI restriction.

### Delegation and review

Codex remained the primary implementer and launched a constrained read-only
Claude Code semantic review before implementation, with only repository read
and search tools. Claude independently traced the direct/group/model render
branches, the evaluated bound and completeness contract, and the pinned Dark
Reaper topology. It recommended the final amount-subtraction rule, called out
the incomplete-bound exception, and confirmed that the Exarch launcher's
grouped replacement path must remain untouched. Codex reviewed those findings,
the implementation diff, the corpus assertion, and every validation result
before accepting them.

### Reference behavior and corpus evidence

The pinned BSData repository was verified clean at
`04c62fcd041b3808c39d5c46fd677c704027b979`. Its Aeldari Library defines the
regular Dark Reaper's `Close combat weapon` and `Reaper Launcher` as direct
`upgrade` children with parent-scoped `min=1` and `max=1`. The Exarch instead
has a direct minimum-one `Close combat weapon` plus a minimum-one, maximum-one
`Weapon` group whose default Reaper Launcher can be replaced by Missile
Launcher, Shuriken Cannon, or Tempest Launcher. The optional integration test
now pins that distinction through the materialized roster session rather than
only reading source JSON.

Interactive Reference Behavior QA created one temporary Aeldari roster in New
Recruit and added Dark Reapers. DOM evidence showed both `Close combat weapon`
inputs and the regular model's `Reaper Launcher` checked, disabled, and marked
`constant`. The Exarch's selected Reaper Launcher and its alternative weapon
inputs were enabled. That confirms the owner's report as a RosterForge
behavioral discrepancy rather than catalogue drift, intentional difference,
known unsupported behavior, or unrelated roadmap work. The temporary New
Recruit roster was deleted after capturing the evidence.

Verification:

- focused `App.ui.test.tsx` — **18 passed**;
- focused pinned Aeldari integration scenario — **1 passed, 17 skipped**;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  the production build retains only Vite's existing large-chunk warning;
- `pnpm test` without the optional corpus — **513 passed, 18 skipped (531)**
  across 55 files;
- full optional corpus suite with `ROSTERFORGE_BSDATA_JSON_DIR` set — **531
  passed** across 55 files; and
- GitHub Actions `#33022413129` for `d0cc0b5` — **passed** every repository CI
  gate.

No evaluator rule, roster command, persisted format, package boundary,
diagnostic, corpus data, or third-party data changed. `docs/compatibility.md`
now records the UI enforcement boundary.

### Next recommended boundary

**Build the selected-unit workspace.** Newly added or explicitly selected army
units should focus a dedicated options surface, while a separate `View` action
opens the complete unit card. Reuse this checkpoint's required-choice state,
exact model counts, and quantity controls; do not create a second editability
model. Configuration stays outside the selected-unit editor, and the roadmap's
existing mobile, catalogue-placement, attention-routing, and full-width
constraints remain authoritative.

## Completed Assignment — Selected-Unit Workspace, 2026-08-26

Baseline `89a95fd14687fccd7c9d51035ee7939a0ddb7aa4`; resulting implementation
commit `001071ed6bd2baafed9b074c4f21614724283313` and this handoff commit.

Army units now render as compact selectable rows whose always-visible content
retains recursive cost and exact model composition. Adding an army root returns
its generated occurrence ID and focuses that new row without closing or opening
the catalogue. Clicking an existing row changes only the ephemeral focused
unit. Configuration roots deliberately do not enter this selection model.

The focused unit mounts one dedicated options region that reuses the existing
direct-choice, group-choice, model-quantity, required-upgrade, nested-selection,
rename, and amount controls. It is a presentation mode over the same component,
not another editability implementation. A separate row-level `View` action
mounts the complete read-only unit card below the builder and scrolls it into
view; it contains selected child/model datasheets but no editing controls.

The outer builder still has at most two columns. With the catalogue open those
columns remain roster and catalogue, and options stack within the roster pane.
With the catalogue hidden, the selected-roster pane uses the reclaimed width
for list and options columns. Both arrangements collapse to one column below
850 px; the unit card stays outside the grid rather than manufacturing a
permanent list/options/catalogue layout. Active and viewed IDs are React state
only and never enter the immutable roster session, undo history, or saved draft.

Validation anchors remain exact despite lazy option rendering. If a detailed
check targets a nested selection that is not mounted, the click finds its
owning top-level army unit in the immutable workspace tree, focuses that unit,
then completes the scroll after the exact stable anchor appears. Configuration
links retain their existing disclosure-reveal behavior.

### Delegation and review

Codex remained primary implementer and launched external review before coding.
Antigravity 1.1.21 received a least-privilege plan brief in a disposable
worktree, but its headless permission layer denied repository commands, so it
returned no evidence and was not treated as a completed review. The same clean
worktree then carried a bounded Grok Build 1.0.5 plan review with subagents and
web disabled. Grok independently recommended one coherent checkpoint, ephemeral
focus state, reuse of the existing presentation model and editing controls, a
row-level independent View action, no automatic catalogue placement changes,
and no permanent third column. It also found the nested validation-anchor risk
that the final implementation closes. Codex checked those findings against the
actual source, corrected Grok's mistaken claim that the controller already
returned the new selection ID, reviewed the final diff, and reran every gate.
The disposable worktree and branch were removed after review.

### Browser QA and validation

Live browser QA used the unchanged saved pinned Aeldari roster at
`04c62fcd041b3808c39d5c46fd677c704027b979`, still one Guardian Defenders unit
at 90 / 2,000 points:

- selecting Guardian Defenders set its row pressed state and opened `Unit
  options for Guardian Defenders`;
- opening the catalogue left that options region mounted; at 1,440 px the
  outer builder measured exactly two columns, 871.33 px roster + 400 px
  catalogue;
- hiding the catalogue changed the inner roster pane to exactly two columns,
  836 px list + 400 px options, using the reclaimed width;
- `View unit card` opened an independent read-only card with 34 selected
  datasheet surfaces and zero `aria-pressed` editing controls; and
- at 390 px the document measured 375 px wide with one-column builder/options,
  and at the supported 320 px minimum document scroll width equalled the
  viewport exactly. No horizontal overflow occurred.

The viewport override was reset and the local RosterForge tab was left open
with Guardian Defenders selected and its unit card visible for owner review.

Verification:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- `pnpm test` — **513 passed, 18 skipped (531)** across 55 files;
- production build — clean except for Vite's existing large-chunk warning;
- optional corpus suite — not rerun because no evaluator, imported-data
  semantic, diagnostic, persisted format, corpus data, or third-party data
  changed; and
- GitHub Actions `#33032266694` for `d98d3ea` — **passed** every repository CI
  gate.

### Next recommended boundary

**Bound the advanced per-occurrence model amount editor.** The dedicated
minus/count/plus controls already enforce complete known maxima one model at a
time. Bring the remaining free-form `Models in this squad` editor under the
same complete known minimum/maximum contract without turning incomplete bounds
into guessed restrictions or blocking recovery from an already-invalid roster.

## Completed Assignment — Bounded Per-Occurrence Model Amounts, 2026-08-27

Baseline `3f76416321c97bb00be6e9abd64c601abeabf7eb`; resulting implementation
commit `d4b1421e2ea6eeb99590caac021cf8c9c1506b17` and this handoff commit.

The advanced `Models in this squad` editor now consumes the same-snapshot
condition-aware selection reports and complete transparent-group inspection
already used by the workspace. Each bound retains the aggregate amount it
actually observed. A proposed edit replaces only the current occurrence's
contribution, so five distinct one-model occurrences under a maximum of five
correctly reject changing one occurrence to two; the editor never mistakes the
aggregate maximum for a per-input maximum.

Complete known minima and maxima constrain a roster that currently satisfies
them. Already-invalid state remains recoverable: a candidate may fully satisfy
the known bounds, or may strictly improve at least one known violation without
worsening another. This permits partial repair when no single edit can reach a
legal aggregate. The controlled submit and `Use 1` convenience action share the
same policy, and an invalid candidate is named beside the input. Bounds whose
effective report or transparent group remains incomplete do not become guessed
restrictions.

The policy is a pure web-presentation helper. Moving legality into
`roster-model` was rejected because structural amount commands deliberately
remain game-agnostic. A native HTML `min`/`max` clamp was rejected because it
would apply an aggregate as though it belonged to one input and can trap an
already-invalid roster. Recomputing constraints separately for the editor was
also rejected; the immutable session already caches the authoritative
same-snapshot supported-validation report.

### Delegation and review

Codex remained the primary implementer and launched Claude Code 2.1.240 as a
bounded read-only semantic reviewer before implementation. Its tool set was
limited to `Read`, `Grep`, and `Glob`; shell, write, browser, session persistence,
and external services were unavailable. Claude changed no file and reported no
permission denial. It independently identified the critical distinction between
one occurrence amount and the sibling-inclusive observed aggregate, confirmed
that no evaluator or roster-model change was needed, and pointed out that the
brief's named `roster-workspace.test.tsx` did not exist.

Claude recommended enforcing only increases above a maximum, matching the
dedicated minus control's deliberately permissive minimum behavior. Codex did
not adopt that narrower conclusion because this checkpoint's approved roadmap
boundary explicitly names complete known minima and maxima. The final policy
instead reconciles both requirements: legal state cannot create either known
violation, while invalid state may move monotonically toward legality. Codex
reviewed the full implementation diff and reran all focused and repository
gates before accepting the checkpoint.

### Browser QA and validation

Live browser QA used application commit `d4b1421` and the unchanged saved
pinned Aeldari source at `04c62fcd041b3808c39d5c46fd677c704027b979`:

- a temporary Wraithguard unit began at five one-model occurrences and the
  opened advanced editor reported that complete known model limits apply;
- entering `2` for one occurrence would have raised the observed aggregate to
  six, so the input became invalid, `Set amount` stayed disabled, and the
  player-facing hint named the complete known limit;
- removing one model made the squad's observed amount four. Entering `2` for
  one remaining occurrence was accepted and restored the aggregate to five;
- after that repair, `Use 1` was disabled because it would have recreated the
  complete known minimum violation; and
- three reversible Undo actions removed the amount edit, restored the removed
  model, and removed the temporary unit. Autosave settled with the saved roster
  back at one Guardian Defenders unit, 90 / 2,000 points, no Wraithguard, and no
  unsaved indicator. The local app and verified tab were left open.

This was targeted RosterForge interaction QA, not a New Recruit discrepancy
classification. No interactive Reference Behavior QA was run because the
checkpoint implements an explicitly approved RosterForge editing policy and
does not claim a New Recruit mismatch, data-version match, or parity defect.

Verification:

- focused policy and UI run — **518 passed, 18 skipped (536)** across 56 test
  files after adding five pure policy cases and the bounded editor interaction;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- full `pnpm test` — **518 passed, 18 skipped (536)** across 56 files;
- production build — clean except for Vite's existing large-chunk warning;
- optional corpus suite — not rerun because no evaluator, imported-data
  semantic, diagnostic, persisted format, corpus data, or third-party data
  changed; and
- GitHub Actions `#33090159557` for `82cc21d` — **passed** every repository CI
  gate.

### Next recommended boundary

**Flatten common loadout groups and add a dedicated Warlord control.** Keep the
underlying transparent group and child-selection semantics intact while
projecting common wargear choices into a shallower player surface. Treat
Warlord as a dedicated control only where the catalogue's existing exact child
choice identifies it; do not infer it from display text. Capture targeted
Reference Behavior QA evidence for representative loadout replacement and
Warlord scenarios before classifying any parity discrepancy.

## Completed Assignment — Pre-Selection Choice Previews And Empty Keywords, 2026-08-27

> **Partially superseded by the corrective checkpoint immediately below.** The
> non-mutating source/effective boundary and empty-keyword behavior remain
> authoritative. The separate eye control, shallow unit content, and associated
> alignment conclusion do not; owner review replaced them with an attached
> page-information control and richer unit/model previews.

Baseline `69c078872ce21762922bdc9880516d6b8e91f620`; resulting implementation
commit `822c46ebe1e45d3862c798bda51f95e69261545e` and this handoff commit. This
bounded owner-observed usability checkpoint was inserted ahead of the existing
loadout/Warlord `Next`; that roadmap row remains next rather than being silently
absorbed.

Concrete root, direct-child, repeatable-model, and grouped-choice controls now
carry an independent eye-labelled action. It opens a modal containing the
already-materialized choice's source-authored profiles, rules, information
groups, and unresolved info-link evidence without running an add command. The
modal has an accessible name and modal role, moves focus to Close, contains Tab
focus, closes on Escape or backdrop click, and returns focus to its still-mounted
trigger.

The preview intentionally does **not** synthesize a temporary roster occurrence.
Effective names, keywords, visibility, and characteristic modifiers can depend
on the prospective parent and wider roster; presenting them from a fake owner
would make an attractive shortcut into false rules evidence. The modal therefore
states that it is the catalogue definition and leaves roster-dependent effective
inspection to the selected card. Reusing the selected-card evaluator through an
ephemeral mutation, selecting and undoing invisibly, and storing preview state in
the immutable roster or draft were rejected for the same reason. The state is
transient web presentation state owned by `roster-workspace.tsx`.

`SelectionKeywords` now returns no section when category inspection is complete,
has zero active categories, and has no removed source categories. Incomplete or
unresolved evaluation remains visible; a completely known selection with only
removed categories shows that struck-through evidence without a false
"incomplete" message. This preserves the validity/completeness boundary while
removing the player-facing `No keywords.` chrome from entries such as the points
choice.

### Delegation and review

Codex remained the primary implementer and launched authenticated Grok Build
1.0.5 in plan mode before implementation was finalized. The brief allowed only
local read/search over the named workspace files, disabled web search and
subagents, and forbade edits, commits, handoff changes, pushes, and external
writes. Both bounded attempts reached their configured turn ceilings after
reading more context than expected; `git status` confirmed no delegate-created
change.

The narrowed review still identified one real edge case: zero active keywords
plus removed source keywords must show the removed evidence without calling the
result incomplete. Codex adopted that correction and its focus-return guard.
Codex rejected the review's contradictory claims that modal roles and empty-set
coverage were absent because direct inspection showed the current diff already
contained them. The delegated output was treated as untrusted review input, not
accepted wholesale.

### Browser QA and validation

Live browser QA used application commit `822c46e` and the unchanged saved pinned
Aeldari source at `04c62fcd041b3808c39d5c46fd677c704027b979`:

- clicking `View rules for Warhost` opened a `Warhost` catalogue-preview dialog
  containing `Martial Grace` and its full source description;
- Warhost remained selected, the roster summary remained exactly 90 / 2,000
  points, and closing the dialog returned to the unchanged setup;
- every visible Detachment option exposed its own labelled preview action; and
- the selected `2. Strike Force (2000 Point limit)` occurrence rendered no
  Keywords section, while its Configuration parent and later Force Disposition
  selection retained their real keyword sections.

This was targeted RosterForge interaction QA, not Reference Behavior QA. New
Recruit supplied the owner's usability inspiration, but no behavioral mismatch,
data-version comparison, or parity defect was classified, so no external roster
scenario was required.

Verification:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- full `pnpm test` — **518 passed, 18 skipped (536)** across 56 files;
- production build — clean except for Vite's existing large-chunk warning;
- optional corpus suite — not rerun because no evaluator, imported-data
  semantics, diagnostic, persisted format, corpus data, or third-party data
  changed; and
- GitHub Actions `#33092692909` for `35ab2f4` — **passed** every repository CI
  gate.

### Next recommended boundary

**Flatten common loadout groups and add a dedicated Warlord control.** Preserve
the existing transparent group and exact child-selection semantics, and capture
the roadmap's targeted Reference Behavior QA evidence before classifying any
parity discrepancy.

## Completed Assignment — Integrated Information Controls And Rich Unit Previews, 2026-08-27

Baseline `43efb41a022392aaf75f62565d00e00983801646`; resulting implementation
commit `bf4d0fd4d168390b536d8c2fc8244fd97352df4a` and this handoff commit. This is
the bounded owner-review correction to the immediately preceding preview
checkpoint; the loadout/Warlord roadmap row remains `Next`.

The separate eye button was creating both visual clutter and a real catalogue
layout regression: its independent fixed-width flex/grid slot squeezed long
configuration labels into a few characters. Every mutation and information
action remains a separate semantic `<button>`, but the siblings now share one
segmented visual surface and one border. The mutation button stays first in
source order, retains `aria-pressed` or `disabled`, and the information segment
remains independently focusable and enabled. The icon is now RosterForge's
folded-page outline with a lowercase information mark, and its accessible name
is `View information for …` rather than the too-narrow `View rules for …`.
Repeatable model cards attach the same information action to their card header.

Unit previews now reuse `planRosterSelectionInitialization` as a pure,
non-mutating projection. Supported static minima and defaults produce an
`Initial unit composition` hierarchy whose quantities multiply through model
and equipment descendants. Source unit/model statlines, weapon profiles,
abilities, rules, info groups, and human-readable named category links render
through the existing profile/rule components. Hex-like imported category codes
are filtered from this player-facing source-keyword list. Model/loadout choices
outside that static plan are kept under one lazy `Available model options and
alternate profiles` disclosure; structural groups remain as headings, while
each informative alternative mounts its profiles only when opened.

The preview still does **not** create a roster occurrence. Roster-dependent
names, visibility, effective keywords, modifier results, and conditional
defaults remain authoritative only after selection. An incomplete static plan
is labelled rather than guessed. Rendering the selected-card evaluator against
a fake owner, flattening every optional branch, and recursively mounting the
unit's entire Crusade advancement library were rejected: the first would claim
false effective evidence, the second would erase source context, and the third
turned one bounded card into a second catalogue browser. Alternate traversal is
therefore deliberately limited to model profiles and their equipment branches.

### Delegation and review

Codex remained the primary implementer and launched one native read-only review
at baseline `43efb41a` before implementation. The brief named `AGENTS.md`, the
handoff/workflow documents, the exact UI/CSS/test and materialization files,
forbade edits and external actions, and asked specifically about compound
controls, accessibility, alignment, recursive unit data, default-versus-
alternate semantics, and coverage. The worker changed no files.

The review correctly traced the alignment problem to the independent root,
direct, and grouped action slots; recommended sibling semantic buttons inside a
segmented visual wrapper; identified the materialized entry/group/link boundary
for safe traversal; and warned against presenting optional equipment as
equipped or mounting every nested branch. Codex verified those findings in the
source, retained the existing modal focus/Escape/backdrop behavior, added lazy
alternate mounting, reviewed the final diff, and reran every gate.

### Browser QA and validation

Live browser QA used the unchanged saved pinned Aeldari source at
`04c62fcd041b3808c39d5c46fd677c704027b979` and a 90 / 2,000 point roster:

- at a 1,280 × 720 viewport, each 345.33 px configuration root gave its label
  136.89 px and its combined action 171.11 px; `Battle Focus - Agile
  Manoeuvres` remained a readable label instead of collapsing to the narrow
  column in the owner's screenshot;
- selected and maximum-reached controls showed the attached page-information
  segment, and the information action remained separately named in the
  accessibility tree;
- the Dire Avengers preview showed `Bladestorm`, `Battle Focus`, seven authored
  keywords, 4× Dire Avenger plus 1× Dire Avenger Exarch statlines, 4× Close
  Combat Weapon, 4× Avenger shuriken catapult, the linked Assault rule, and the
  Exarch's initial close-combat profile;
- opening the one model-alternative branch exposed the Exarch weapon choices
  and their nested weapon profiles, while `Crusade` and `Aspect Shrine Token`
  did not enter that datasheet-oriented surface; and
- opening and closing previews did not change the roster's 90 / 2,000 points or
  selected occurrences.

The owner's New Recruit screenshots supplied the requested information
hierarchy, not a behavioral-discrepancy claim. No RosterForge/New Recruit
semantic mismatch was classified, so interactive Reference Behavior QA and its
data-comparability protocol were not invoked.

Verification:

- delegated read-only review — completed; no worker files changed;
- focused synthetic UI fixture — a five-model unit now proves source keyword
  filtering, multiplied required weapon profiles, alternate-profile laziness,
  non-mutation, focus return, and sibling mutation/information controls;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- full `pnpm test` — **518 passed, 18 skipped (536)** across 56 files;
- production build — clean except for Vite's existing large-chunk warning;
- optional corpus suite — not rerun because evaluation semantics, imported-data
  projection, diagnostics, persisted formats, corpus data, and third-party data
  did not change; and
- GitHub Actions `#33099588754` for `d4a099b` — **passed** every repository CI
  gate.

### Next recommended boundary

**Flatten common loadout groups and add a dedicated Warlord control.** Preserve
the exact transparent-group and child-selection semantics beneath the shallower
player surface. Capture the roadmap's targeted representative loadout and
Warlord Reference Behavior QA evidence before classifying any parity
discrepancy.

## Completed Assignment — Shallow Loadout Hierarchy And Roster Roles, 2026-08-27

Baseline `ff85b3569a1dd297589a5b3475261edc938da587`; resulting implementation
commit `531d6659e06384fee0a89a00fa01cccf7edd0a7b` and this handoff commit. Codex
remained the active lead and primary implementer.

The evaluator deliberately returns every inspected selection-entry group in a
flat list: `choices` contains entries offered directly by that group, while
`countedChoices` contains descendant entries that satisfy its bound. The web
adapter had incorrectly calculated a group's selected state from `choices`, so a
choice-less wrapper such as `Wargear` always displayed zero even after its
Melee and Ranged children were satisfied. The adapter now counts exact
`countedChoices`, and the workspace reconstructs the authored parent/child group
hierarchy by materialized object identity. A pure wrapper is presented as one
shallow context heading around its real child controls rather than as a false
empty fieldset. Mixed groups and genuinely empty or conditionally hidden groups
retain their existing messages and controls.

Warlord is no longer promoted by display text or a faction-specific entry ID.
The pinned game system defines one category with exact selection constraints of
minimum 1 and maximum 1 at roster scope: Warlord category
`5c0e-4c31-d51b-e470`. Twenty-five JSON files reference that category, with 30
category links in total, while the string `Warlord` appears in 698 name fields;
name matching would therefore be both noisy and brittle. The session adapter
now identifies an exact materialized `upgrade` only when one uniquely resolved
category link carries both authored roster-scoped bounds. Missing, ambiguous,
modified, or differently shaped categories fail closed.

Recognized choices render once in a dedicated `Roster role` surface above the
ordinary direct choices and loadout groups. The stable choice name is the
toggle, selected state uses `aria-pressed`, and the existing immutable add/remove
commands remain authoritative. Selected Warlord occurrences stay available to
the full read-only unit card but no longer duplicate themselves in the options
subtree. Generic direct-choice and group behavior is unchanged.

Automatic transfer, disabling the last Warlord, and rejecting a second Warlord
were considered and rejected. They would add new command semantics not present
in the catalogue and would contradict the reference behavior below. The UI
permits zero or multiple roles as editable invalid states; existing validation
reports the roster-scoped minimum or maximum violation.

### Delegation, Reference Behavior QA, and classification

Delegation was planned before implementation. Authenticated Claude Code ran a
bounded read-only repository analysis with only Read/Grep/Glob access and no
edits, shell, browser, commits, handoff changes, pushes, or external writes. It
correctly identified the `choices` versus `countedChoices` adapter defect and
recommended reconstructing the group tree at the web presentation boundary by
object identity rather than changing the evaluator. Codex verified and adopted
those findings, then implemented and reviewed the final diff itself.

A verified browser-capable native Codex worker executed the bounded New Recruit
scenario on 2026-08-27 13:03 CDT in an anonymous/local Aeldari roster
`6a8f555d736363a9ed95befc`, viewport 1617 × 1260. New Recruit exposed the game
system as `827374861----nr` and said it was updated one day earlier, but exposed
no exact client or catalogue revision; data comparability is therefore
**unknown**, not assumed equivalent to the pinned corpus.

Observed Dark Reaper Exarch behavior: the model had a required disabled Close
combat weapon and a nested `Weapon (1/1)` group containing Missile Launcher,
Reaper Launcher, Shuriken Cannon, and Tempest Launcher. Selecting another weapon
automatically replaced the current one. Clicking the selected weapon again was
allowed, producing `Weapon (0/1)` and a visible required-selection error until
Reaper Launcher was restored. This confirms the existing RosterForge max-one
replacement plus explicit-deselection behavior; the discrepancy was the false
wrapper presentation and count, a roadmap presentation defect rather than a new
selection-semantic defect.

Observed Warlord behavior: Autarch and Farseer each showed a standalone Warlord
checkbox immediately above Wargear. Zero, one, or two Warlords were all editable;
zero produced a missing-Warlord error, two produced a maximum-one error, and New
Recruit did not transfer or reject the second designation. This supports the
dedicated RosterForge control while preserving permissive invalid intermediate
states and validation. The temporary reference roster ended with the Autarch as
its sole Warlord and the Dark Reaper Exarch's Reaper Launcher restored.

Antigravity was not used as interactive executor: the installed headless client
still lacks browser actuation. No difficult unresolved semantic discrepancy
remained for a second evidence-analysis pass after the browser observation,
pinned-corpus measurement, and Claude review agreed.

### Tests, corpus, and browser validation

The project-owned nested-group fixture now includes both a two-of-two Wargear
wrapper over two one-of-one child groups and a structurally identified singleton
roster role. Session coverage proves the wrapper progresses from zero to Blade
plus Pistol and reaches its aggregate requirement. UI coverage proves the false
empty message is absent, the child hierarchy is accessible, parent status
updates to two selected, and Warlord toggles off/on from its dedicated surface.

The optional real-data integration test loads the pinned Aeldari Autarch and
asserts that the structural classifier returns exactly `Warlord`. The pinned
checkout `E:\GitHub\wh40k-11e` was verified clean at
`04c62fcd041b3808c39d5c46fd677c704027b979`; its local branch is four commits
behind the moving remote by design and was not updated.

Post-implementation browser QA at 2026-08-27 13:21 CDT used the running local
app at 1617 × 1209 and imported the two synthetic fixture files through the
normal file chooser. Wargear rendered as context around its distinct Melee and
Ranged groups; Blade then Pistol advanced the parent from zero of two to
`2 selected; requirement met`, reducing structural violations from three to
zero. Warlord appeared above Wargear, toggled off/on repeatedly with correct
`aria-pressed` and status text, and the final selected Warlord/Blade/Pistol state
had zero known violations. The page had no horizontal overflow, unnamed visible
buttons, overlap, clipping, or ambiguous accessible group names. The roster
remained unsaved in memory and no repository file or unrelated browser state was
changed.

Verification:

- authenticated Claude read-only analysis and native browser Reference QA —
  completed; neither worker changed repository files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **520 passed, 18 skipped (538)** across 56 files;
- pinned 46-document corpus suite — **538 passed (538)** across 56 files;
- production build — clean except for Vite's existing large-chunk warning; and
- GitHub Actions `#33103292710` for `3c58a28` — **passed** every repository CI
  gate.

### Remaining unsupported behavior

This checkpoint did not change evaluator group semantics, automatic nested-group
initialization, unit-typed automatic sub-units, persisted formats, or global
constraint handling. The roadmap's low-priority nested automatic shapes remain
unsupported and explicit. Exact New Recruit data comparability remains unknown.

### Next recommended boundary

**Expose roster duplication in the saved-roster workflow.** The immutable
duplication commands already exist and are tested headlessly, but no player can
reach them. Keep the checkpoint bounded to a visible saved-roster action,
identity-safe copied state, persistence, and focused browser validation; this
closes the explicit duplicate step in the v1 product workflow without widening
into export, sharing, or roster-file interchange.

## Completed Assignment — Catalogue Costs And Readability, 2026-08-27

Baseline `169599ce461b43187f27ea532ace9b2cf58c8aa9`; resulting implementation
commit `cac612c98a83cd0fa98be793ce547215a7df9084` and this handoff commit. Codex
remained the active lead, primary implementer, integrator, reviewer, validator,
and publisher.

Catalogue roots now show the first authored non-zero cost in source order, the
selected amount and supported maximum in a compact counter, a plus-only add
segment, and the existing folded-page information segment. The same cost badge
is present on direct upgrades, grouped choices, repeatable model choices, and
detachment options, so the source's own currencies remain distinct: points are
not guessed by name and Detachment Points are not relabelled as points. A root
whose cost type is targeted by a modifier is visibly qualified as `base` rather
than presented as an evaluated total.

The same honesty boundary applies to catalogue repetition maxima. Pinned Dire
Avengers authors force-scoped maximum constraint `3734-a76b-08f4-7518` at 3,
but a conditional modifier sets it to 2 for Incursion. The static root
inspection deliberately withholds the final maximum because it cannot evaluate
that live-roster condition. The catalogue therefore shows `0 / 3 base`; only a
fully evaluated `state.maximum` can disable Add. Showing a bare `0` omitted
useful source information, while enforcing 3 or presenting it as final would be
incorrect. The remaining condition-aware evaluation work is an explicit Open
roadmap row.

The roster header now chooses its primary capacity from the game system's exact
cost-type declaration order. This is stable before and after the first unit is
added and does not depend on force-constraint order or display-name matching.
Secondary active currencies such as Enhancements and Detachment Points move
under `Other roster limits`; zero-value source fields remain in their existing
disclosure. The common player path consequently leads with points and known
problems rather than an unexplained enhancement counter.

Player-facing cards no longer print `Direct`/`Linked`, imported `.json`
filenames, or the materializer reason `unprojectedTarget`. Unavailable links use
one neutral explanation. Exact source filenames, unresolved target IDs, and raw
reason codes remain preserved under one collapsed Developer details disclosure;
the duplicated disclosure beside ordinary selection editing was removed. No
imported evidence or diagnostic boundary was deleted.

Typography moved to a local condensed system stack led by Bahnschrift, with a
17 px root size and stronger weights. Root category disclosures have a 28 px
filled chevron, unit/model disclosure triangles are larger, and phone-width
root rows keep one compact action column. No hosted font or new asset dependency
was introduced.

### Delegation and review

Delegation was launched before implementation. Grok Build received a bounded
read-only audit brief but exhausted its client turn budget before returning a
finding and changed no repository files. Authenticated Claude Opus 5 then
completed the useful external read-only lane without edits or external writes.
It identified two issues the lead had not initially handled: community data can
carry several simultaneous non-zero campaign currencies, and the first
evaluated/constraint-reported cost is not a stable points-headline policy.
Codex verified both against the source and adopted the source-order/one-cost
presentation above. Claude also warned against inventing denominators for
incomplete bounds and against removing provenance rather than demoting it.
Codex reviewed the final diff and reran every gate; no delegated code was
accepted.

### Browser QA, corpus, and validation

Lead Codex used the browser-capable local QA lane against the running app and a
fresh pinned Aeldari import at
`04c62fcd041b3808c39d5c46fd677c704027b979`:

- Dire Avengers showed `75 pts base`, `0 / 3 base`, plus, and the attached
  information-page segment; Wraithguard showed its authored 145 pts without a
  dynamic qualifier;
- Detachment choices showed their authored Detachment Points, including
  Armoured Warhost at 1 and Warhost at 3;
- the primary header remained points while two secondary active limits were
  available under `Other roster limits`;
- the Dire Avengers catalogue preview retained unit/model statlines, rules,
  profiles, initial equipment, keywords, and Developer details while its closed
  player-facing text contained neither `.json` nor `unprojectedTarget`;
- at 390 × 844 the document measured 375 px wide inside a 390 px viewport, with
  no horizontal overflow; the 46 px category row, 28 px chevron, cost badges,
  counters, plus controls, and information segments remained visible and
  aligned; and
- the computed root style was the intended 17 px Bahnschrift-led stack.

The owner's New Recruit screenshots informed the desired information hierarchy,
not a behavioral-discrepancy classification. No interactive reference parity
claim was made, so the Reference Behavior QA discrepancy protocol did not need
a New Recruit execution for this checkpoint.

Verification:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **521 passed, 18 skipped (539)** across 56 files;
- pinned 46-document corpus suite — **539 passed (539)** across 56 files;
- production build — clean except for Vite's existing large-chunk warning; and
- GitHub Actions `#33110587886` for `033f566` — **passed** every repository CI
  gate.

### Remaining unsupported behavior

This checkpoint did not add live condition evaluation for unselected root
maxima, change the permissive/incomplete editing contract, alter persisted
formats, or change cost/constraint evaluation semantics. Source-authored `base`
values are informational; only evaluated values enforce roster edits. The new
Open roadmap row records that distinction.

### Next recommended boundary

**Expose roster duplication in the saved-roster workflow.** Keep the existing
bounded scope: a visible saved-roster action, identity-safe copied state,
persistence, and focused browser validation, without widening into sharing,
export, or roster-file interchange.

## Completed Assignment — Detachment Budget And Root JSON Rules, 2026-08-27

Baseline `4b191734f395036eb7d4dddda9b98bef42fd89b5`; resulting implementation
commit `411853f` and this handoff commit. Codex remained the active lead, primary
implementer, integrator, reviewer, validator, and publisher.

Configuration now carries its own evaluated capacity summary. A setup currency
appears there only when an exact cost-type id is both used by the selected or
immediately available configuration subtree and has a finite evaluated roster
limit. This keeps `Detachment Points` visible after configuration collapses,
without guessing from display names or restoring the wall of zero-value campaign
placeholders. The existing evaluator remains authoritative for both value and
limit; unselected catalogue costs do not invent a denominator.

BattleScribe JSON root `rules` collections now feed the same typed projection as
XML-style `sharedRules`. The generic source tree and original bytes were already
preserved, but those root rules were absent from `projection.rules`, so ordinary
info-link resolution could only report `unprojectedTarget`. Projecting the
observed alternate container fixes every such target generically. No Aeldari id,
rule name, remote lookup, or player-facing fallback suppression is special-cased.

### Delegation, evidence, and discrepancy classification

Delegation was launched before implementation. Authenticated Claude Code ran a
bounded read-only repository analysis with Read/Grep/Glob access and no shell,
edits, subagents, commits, handoff changes, pushes, or external writes. It ruled
out a selected-card-only resolver/session defect because preview and selected
cards share the same materialized info-link path, and confirmed that the
Detachment Point allowance should reuse evaluated force constraints rather than
be inferred from catalogue labels. Codex then measured the pinned data, found
the missing root-container projection, implemented the correction, reviewed the
complete diff, and reran every gate. No delegated code was accepted.

The owner's New Recruit screenshots captured on 2026-08-27 show Battle Focus
with full text both in the Dire Avengers card and in the top-level Battle Focus
- Agile Manoeuvres configuration. The exact New Recruit client and catalogue
revision are not available, so direct data comparability remains unknown. The
pinned imported bytes independently settle the classification: Aeldari Library
contains the linked target `c324-e193-e23c-7d2e` and its full text, while the
baseline app emitted `unprojectedTarget`. This was an actual RosterForge JSON
projection defect, not catalogue drift, an intentional product difference,
known unsupported behavior, or merely future roadmap work. The Detachment Point
capacity display is a usability correction over already-supported evaluated
semantics, not a new semantic discrepancy.

### Tests, corpus, and browser validation

The project-owned JSON fixture now includes a root `rules` definition and a
linked catalogue entry; projection and materialization tests prove it becomes a
resolved rule info link. The optional real-data integration test pins Dire
Avengers' Battle Focus id and authored text, plus the Strike Force Detachment
Point maximum and evaluated value.

At pinned corpus revision `04c62fcd041b3808c39d5c46fd677c704027b979`, five of
46 JSON documents have a non-empty root `rules` array and 24 use
`sharedRules`; Aeldari Library contains four root rules. Lead Codex imported all
46 documents through the running local app, created a fresh Aeldari roster,
selected Strike Force and Warhost, and added Dire Avengers. The collapsed-ready
configuration summary changed from `0 / 3 Detachment Points` to `3 / 3`, and the
unit card contained the full Battle Focus text with no unavailable-information
fallback. The temporary roster remains unsaved; no saved draft or unrelated
browser state was overwritten.

Verification:

- authenticated Claude read-only analysis — completed and changed no files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **521 passed, 18 skipped (539)** across 56 files;
- pinned 46-document corpus suite — **539 passed (539)** across 56 files; and
- production build — clean except for Vite's existing large-chunk warning; and
- GitHub Actions `#33113808066` for `44671ee` — **passed** every repository CI
  gate.

### Remaining unsupported behavior

This checkpoint recognizes the two root rule-container spellings measured in
the pinned corpus; it does not speculate about unobserved JSON aliases. It does
not change rule evaluation, cost/constraint semantics, persisted formats, or
condition-aware root repetition maxima. Exact New Recruit data comparability
remains unknown. The roadmap's existing Open rows remain accurate.

### Next recommended boundary

**Expose roster duplication in the saved-roster workflow.** Keep the existing
bounded scope: one visible saved-roster action, identity-safe copied state,
persistence, and focused browser validation without widening into sharing,
export, or roster-file interchange.

## Completed Assignment — Stable Unit Cards And Player-Readable Coverage, 2026-08-27

Baseline `d0b981fdfd1f94621737bb5bbc85680be0701699`; resulting implementation
commit `affacbf` and this handoff commit. Codex remained the active lead, primary
implementer, integrator, reviewer, validator, and publisher.

An open full-width unit card now scrolls into view only when its requested
occurrence id changes. The old effect depended on the projected selection
object, which is recreated after any roster edit or selected-unit change; every
new object consequently called `scrollIntoView` and stole the player's place.
The identity-only dependency preserves the deliberate first reveal while an
already-open card updates in place without another scroll.

The player header now says `Supported checks complete` or `Some rules not
checked` instead of the evaluator phrase `Complete/Incomplete supported view`.
Its Report details explains that known problems cover completed checks. Raw
validation codes are no longer duplicated there; the exact ordered diagnostics
remain under collapsed `Developer structural diagnostics` and `Developer
constraint diagnostics` in the detailed Checks evidence. Cost diagnostics keep
an equivalent nested Developer disclosure because they have no other report
home. An incomplete-but-valid roster no longer forces the technical Checks card
open, but the independent visible coverage badge remains, so uncertainty is not
hidden or promoted into a false legality claim.

The shared conditional-root warning now says that the effective limit is
unresolved. Its prior text claimed a required automatic quantity even when the
real Aeldari case was an optional repetition maximum, so that wording was a
presentation defect. The diagnostic code, severity, source, completeness effect,
and underlying conservative evaluator behavior are unchanged. The technical
introductory paragraph about source-authored and roster-dependent values was
also removed from catalogue preview cards; it described implementation limits
without helping the player use the card.

### Delegation and classification

A native Codex worker received an early bounded read-only audit in disposable
worktree `E:\GitHub\rosterforge-warning-audit` at the exact baseline. It read the
repository rules and traced the completeness fold and diagnostic pipeline without
editing, committing, browsing, pushing, or performing external writes. It
confirmed that `Incomplete supported view` was not a legality failure, identified
the misleading reuse of automatic-quantity wording for live root maxima, and
caught that validation diagnostics were duplicated in both the header and Checks
cards. Codex verified and adopted those findings, implemented the final diff,
and reran every gate. The audit worktree was verified clean and removed afterward;
no delegated code was accepted.

Classification is intentionally split. The repeated card scroll was an actual
RosterForge UI bug. The opaque coverage badge, forced-open debugger surface,
duplicated raw warnings, and conditional-root message were player-presentation
defects. The incomplete state itself is not a bug: it truthfully records imported
behavior RosterForge has not evaluated. Marking that state complete or deleting
its evidence would violate the independent validity/completeness contract.

### Tests, corpus, and browser validation

UI coverage proves that opening a card scrolls exactly once and a subsequent
selection edit does not scroll it again. It also proves the new complete and
limited-coverage wording, player explanation, absence of raw codes from the
roster summary, continued availability of the exact code in a collapsed
Developer disclosure, and absence of the catalogue-preview implementation note.

Lead browser QA used the running local app and the saved pinned Aeldari roster.
The valid roster showed `0 known problems`, `Some rules not checked`, and a
collapsed detailed-evidence section. Report details contained only the coverage
explanation and zero unresolved cost counts. The Dire Avengers preview opened
directly into rules/profiles with no technical introduction. After opening the
Guardian Defenders card, scrolling back to its roster row, and choosing
`Configure Guardian Defenders`, the card stayed 2,591 px below the viewport
instead of pulling the page back to it; no roster selection was changed by that
focus test.

Verification:

- bounded native Codex read-only audit — completed and changed no files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **521 passed, 18 skipped (539)** across 56 files;
- pinned 46-document corpus suite — **539 passed (539)** across 56 files; and
- production build — clean except for Vite's existing large-chunk warning; and
- GitHub Actions [CI #33116122637](https://github.com/ronincse/rosterforge/actions/runs/33116122637)
  for handoff commit `e98a303` — passed every repository CI gate.

### Remaining unsupported behavior and roadmap correction

This checkpoint did not make the outstanding evaluator warnings disappear. It
made their meaning and location appropriate. The owner's request puts their
semantic closure ahead of saved-roster duplication. The existing conditional
root repetition row is now `Next`; it covers Dire Avengers 3→2 and Guardian
Defenders 6→4 under Incursion. A new Open row retains the remaining pinned
Aeldari families: one relevant unresolved root visibility decision, association
fields/attributes, and hidden Crusade Battle Honours/Weapon Modifications
constraint fields. Each needs evidence-backed semantics or an evidence-backed
applicability exclusion, never a UI-only suppression. Roster duplication returns
to Open until those coverage checkpoints are complete.

### Next recommended boundary

**Evaluate condition-aware root repetition maxima against the live roster.**
Keep it bounded to supported condition applicability, effective root maximum,
catalogue count/plus behavior, the existing incomplete fallback for unresolved
conditions, and exact Dire Avengers/Guardian Defenders pinned assertions. Do not
widen it into association semantics, campaign constraints, or roster duplication.

## Completed Assignment — Conditional Root Limits And Honest Diagnostic Presentation, 2026-08-27

Baseline `2527fcc`; resulting implementation commit `839149a` and this handoff
commit. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

Supported direct conditional modifiers on root selection bounds now evaluate
against the current single-force roster. The static creation path is unchanged:
before setup selections exist it still withholds conditional values rather than
guessing. The live add catalogue and structural report now share the effective
maximum, so pinned Aeldari Incursion changes Dire Avengers from base 3 to 2 and
Guardian Defenders from base 6 to 4. Complete applicability produces complete
bounds; unsupported or unresolved applicability remains incomplete.

The data graph no longer treats a `primary-catalogue` condition's `childId` as
an object dependency. That value is the catalogue identity being compared, so
requiring its target catalogue in a focused faction closure created false
missing-reference warnings. The four remaining Aeldari closure warnings are all
cross-catalogue `costType` targets and remain preserved; resolving whether those
definitions must join the closure is separate work, not a reason to suppress
them. The invalid empty `defaultCostLimit` is real malformed upstream source
data. Projection still preserves the raw value, omits the invalid typed number,
and reports it without blocking the otherwise usable catalogue.

Library readiness now describes whether the imported catalogue can actually be
used: all files accepted, required game system present, and root materialization
complete. Non-fatal projection and graph diagnostics are collapsed under
Developer notes rather than changing a usable library to `Ready with issues`.
Rejected files, missing game systems, and truncation still produce a partial
state. The library metric now reports rejected files instead of equating every
technical diagnostic with an application issue.

Roster coverage wording is consistent throughout: `Some rules not checked`
replaces `Incomplete inspection`, and Report details translates the exact
diagnostic families into player-readable reasons while retaining every raw code
in the existing Developer disclosures. A setup-derived zero points cap now says
to choose Battle Size rather than displaying a confusing used/zero fraction.
Fresh-roster Battle Size and Force Disposition minima remain genuine known
violations; they are not hidden or reclassified.

### Delegation, classification, and evidence

A native Codex worker received an early bounded read-only audit in disposable
worktree `E:\GitHub\rosterforge-diagnostic-audit` at the exact baseline. It read
the repository rules and traced projection, graph, evaluator, and presentation
behavior without editing, committing, browsing, pushing, or performing external
writes. It distinguished source-data faults, closure false alarms, genuine setup
violations, and evaluator coverage gaps; it also caught that inactive dynamic
roots do not themselves make completeness incomplete. Codex reviewed and
adopted those findings, implemented the final diff, and reran every gate. No
delegated code was accepted.

Lead browser QA reproduced the owner's pinned Aeldari states before the change:
the four-file closure had one invalid empty numeric plus ten grouped missing
references, while a configured Guardian Defenders roster had zero known
violations but incomplete structural and constraint coverage. After the change,
the saved roster still showed `90 / 2,000`, zero known problems, and the honest
`Some rules not checked` badge. A later hot-reload detail probe was blocked by
the browser URL policy, so the new expanded explanatory copy is covered by the
automated UI suite rather than claimed as a completed second browser action.

### Tests, corpus, and remaining work

The project-owned graph test proves an unloaded `primary-catalogue` identity
literal creates no graph edge or false missing-reference diagnostic. Structural
tests prove a direct conditional root maximum changes with live roster state.
The pinned Aeldari integration test proves Incursion's exact 2/4 maxima, removes
the former Guardian unresolved root bound, and pins the focused closure at one
invalid numeric diagnostic plus four `costType` missing-reference groups.

Verification:

- bounded native Codex read-only audit — completed and changed no files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **522 passed, 18 skipped (540)** across 56 files;
- pinned 46-document corpus suite — **540 passed (540)** across 56 files; and
- production build — clean except for Vite's existing large-chunk warning.

This checkpoint does not claim complete BattleScribe legality. One relevant
root visibility decision, the selected Detachments group's modifier-driven
bound, selected-unit association attributes/fields, hidden Crusade constraint
fields, and the four focused-closure cost-type references remain explicit. They
are the promoted `Next`; roster duplication remains Open behind them.

### Next recommended boundary

**Close one measured family from remaining pinned Aeldari matched-play check
coverage.** Start by inventorying the exact unresolved root visibility and
selected Detachments group shapes, then choose the smallest semantics that can
be proven from the pinned corpus and Reference Behavior QA. Keep Crusade cost
fields separate unless the evidence shows they share the same rule.

## Completed Assignment — Focused Remote Catalogue Composition, 2026-08-27

Baseline `f791a0b`; resulting implementation commit `4b2138c` and this handoff
commit. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

Selecting the Space Marines dependency from a remotely acquired Dark Angels
library could block the browser thread and eventually crash the tab. The
Space Marines catalogue was not missing or malformed: it is a valid standalone
repository choice and a valid dependency whose imported roots supply ordinary
Space Marine units to Dark Angels. The defect was the boundary between focused
repository acquisition and generic local multi-file import. The remote path
fed its whole dependency closure into generic composition, which eagerly built
an independent root context for every catalogue-kind document and then exposed
every non-library dependency as a peer workspace choice.

Focused acquisition now passes the exact selected document identity into root
materialization. The graph still contains the game system and every transitive
catalogue dependency, so linked roots and definitions resolve normally, but
only the requested catalogue receives a materialized context and selectable
workspace. Local file import is unchanged and still exposes every non-library
catalogue the player intentionally imported together. Choosing Space Marines
as the primary faction remains available from the top-level repository selector
and acquires its own focused closure; switching a Dark Angels dependency button
was never an ally-force editor.

### Delegation and review

Claude Sonnet 5 received an early bounded read-only audit in disposable
worktree `E:\GitHub\rosterforge-dark-angels-audit` at the exact baseline. Its
brief named the repository rules, prohibited writes and external actions, and
asked it to trace dependency classification, root materialization, and likely
CPU/heap amplification. It independently confirmed that Space Marines is a
real non-library catalogue, identified scope-unaware eager context composition,
and rejected rewriting authored `library` metadata or tightening global
materialization limits. Codex reproduced the failure, reviewed the findings,
implemented the narrower document-identity scope, and verified the clean audit
worktree before removing it. No delegated code was accepted.

### Tests, corpus, and browser validation

Synthetic repository coverage now proves that a selected catalogue can import
roots from a second playable non-library catalogue without exposing that
dependency as a peer workspace. Data-graph coverage proves that exact-document
context scoping retains dependency resolution. The optional real-corpus test
imports the pinned 46-document set, composes only Dark Angels, asserts one
selectable context, and proves at least one materialized root still resolves to
the Space Marines document.

Lead browser QA reproduced the pre-fix Dark Angels → Space Marines switch as a
browser action that did not return within 20 seconds. After the correction, the
cached eight-file Dark Angels closure loaded and composed in about 1.5 seconds,
reported one roster catalogue instead of three, and offered no dependency
switch. Creating its Army Roster took about 0.4 seconds; searching `Intercessor`
returned Assault Intercessors with Jump Packs, Assault Intercessor Squad, Heavy
Intercessor Squad, and Intercessor Squad, confirming that linked Space Marine
content was retained.

Verification:

- authenticated Claude read-only analysis — completed and changed no files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **524 passed, 19 skipped (543)** across 57 files;
- pinned 46-document corpus suite at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **543 passed (543)** across
  57 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint does not add nested/allied forces, change catalogue-link
semantics, or alter local multi-catalogue import. It also does not redesign
nested definition memoization inside the one selected context; the existing
materialization depth and expansion budgets remain the safety boundary there.
The roadmap's pinned Aeldari coverage families remain open and unchanged.

### Next recommended boundary

**Close one measured family from remaining pinned Aeldari matched-play check
coverage.** Start with the exact unresolved root visibility and selected
Detachments-group shapes. Preserve independent completeness reporting and use
Reference Behavior QA before classifying any semantic discrepancy.

## Completed Assignment — Full-Width Roster Setup, 2026-08-27

Baseline `66d4cef`; resulting implementation commit `a209e75` and this handoff
commit. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The persistent `Catalogue library` column duplicated the selected catalogue,
used half of the setup width for import metrics and catalogue cards, and made a
normal focused repository load look like a two-surface workflow. Roster setup
now occupies one primary full-width region. A labelled native catalogue chooser
appears only when a local import intentionally exposes multiple playable
catalogues; the normal focused repository path keeps the selected catalogue as
the single setup identity without a redundant card.

The column was not deleted by dropping its evidence. Current/checking freshness
chatter and generic ready/partial badges are gone from the player surface, but
stale or unknown data remains visible. Rejected files, materialization
truncation, and a missing matching game system each have a concrete setup
warning. The complete ordered file report and exact batch diagnostics remain in
collapsed `Developer import details`. Source metadata and selected-catalogue
diagnostics remain in the existing catalogue details. Clearing an active roster
returns to this same full-width setup without changing the imported library.

### Delegation and review

A native Codex child received an early bounded read-only audit in disposable
worktree `E:\GitHub\rosterforge-library-panel-audit` at the exact baseline. Its
brief named the repository rules, prohibited writes and external actions, and
asked it to identify the minimum restructuring, tests, accessibility risks, and
information that could not safely disappear. It caught that the old generic
`Partially loaded` badge could represent real truncation or a missing game
system; Codex retained both conditions as explicit warnings, reviewed the
result, and removed the verified clean worktree. No delegated code was
accepted.

### Tests, corpus, and browser validation

Component coverage proves current data stays quiet, stale and unknown data stay
visible, a one-catalogue setup has no chooser, and an intentional two-catalogue
setup exposes a labelled selector that changes the selected key. Application UI
coverage now synchronizes on the primary catalogue heading, proves the obsolete
library region is absent, verifies the full-width setup landmark before and
after clearing a roster, and retains rejected-file details and exact diagnostic
codes.

Lead browser QA used the already-running Dark Angels workspace. After clearing
the roster, the setup region measured **1,223 px** inside a **1,225 px**
workspace at a **1,265 px** viewport; the setup and library shell shared the
same x-coordinate, and no `Catalogue library` heading remained. The roster-name
field, starting-force selector, and create action used the resulting width.

Verification:

- bounded native Codex read-only audit — completed and changed no files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- focused setup/UI suite — **24 passed** across 2 files;
- ordinary suite — **526 passed, 19 skipped (545)** across 57 files;
- pinned 46-document corpus suite at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **545 passed (545)** across
  57 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint does not change catalogue composition, local multi-catalogue
semantics, source metadata, roster creation, or evaluator behavior. It also does
not take the broader setup-copy and selected-catalogue metadata cleanup suggested
by the review; those details were outside the owner's bounded request and remain
available rather than being silently removed. The pinned Aeldari coverage
families remain open and unchanged.

### Next recommended boundary

**Close one measured family from remaining pinned Aeldari matched-play check
coverage.** Start with the exact unresolved root visibility and selected
Detachments-group shapes. Preserve independent completeness reporting and use
Reference Behavior QA before classifying any semantic discrepancy.

## Completed Assignment — Live Modifier-Driven Child Bounds, 2026-08-27

Baseline `42818fc`; resulting implementation commit `cd6fddb` and this handoff
commit. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The pinned Aeldari `Detachments` group has a parent-scoped maximum whose `-1`
sentinel becomes `1` only for Incursion with a selected 3 Detachment Point
choice. Static initialization correctly lacks that roster state, but live child
inspection had reused the same conservative path and left the bound unresolved.

Live inspection now evaluates a modifier-driven child constraint when the
constraint and modifier are carried by the same direct choice or transparent
group. It adds one collision-safe occurrence to an immutable temporary roster,
uses the existing selection-constraint evaluator, and discards the probe. This
preserves established condition scopes and ordering without persisting group
wrappers. Static inspection is unchanged, and ancestor-carried modifiers remain
diagnostic because their cross-carrier ordering is not established. Rejected
alternatives were static folding without roster state, generalizing every
carrier path, suppressing the diagnostic, and persisting transparent groups.

Claude Code completed an early authenticated, bounded read-only semantic audit
without changing files. It independently selected this family as the smallest
safe closure and identified the same owner-local versus ancestor-carried
boundary. Codex reviewed and applied that finding; no delegated code was
accepted.

Lead Reference Behavior QA created the temporary New Recruit list
`RosterForge QA - Aeldari Incursion bound 2026-08-27`. Incursion plus Warhost
showed `Detachments (1/1)` and `3 / 3 Detachment Points`; switching the same
roster to Strike Force removed the group-wide `1/1` limit. The list remains in
New Recruit because deleting it is a separate destructive browser action.

Project-owned tests pin the same-owner conditional group before and after its
trigger while retaining an ancestor-carried modifier as explicitly incomplete.
The real-data guard proves max one at Incursion, unbounded at Strike Force, and
complete live structural validation.

Verification:

- focused evaluator/web suites — **52 passed** across 4 files;
- focused pinned Aeldari suite — **18 passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **526 passed, 19 skipped (545)** across 57 files;
- pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` —
  **545 passed (545)** across 57 files; and
- production build — clean except for Vite's existing large-chunk warning.

Remaining Aeldari coverage consists of one relevant unresolved root visibility
decision, selected-unit association attributes/fields, hidden Crusade Battle
Honours and Weapon Modifications constraint fields, and four focused-closure
cost-type references.

### Next recommended boundary

**Close the one remaining relevant Aeldari root-visibility decision.** Inventory
its exact owner, modifier carriers, conditions, and diagnostic first. Use
Reference Behavior QA if the pinned source does not settle applicability; keep
association and hidden Crusade fields as separate later families.

## Completed Assignment — Roster Budget Priority And Setup Order, 2026-08-28

Baseline `092422a`; resulting implementation commit `3b92c12` and this handoff
commit. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The sticky navigator and full player header had selected their headline cost by
game-system declaration order. A setup-only currency such as Detachment Points
could therefore replace the ordinary roster-points budget even though unit
choices do not spend it. Both surfaces now prefer a finite-limit cost type with
non-zero authored costs on addable army roots, using exact cost-type IDs rather
than display-name guesses. Declaration order remains a conservative fallback,
and Detachment Points remain visible in the Configuration summary and Other
roster limits instead of disappearing.

The Configuration presentation now places Battle Size before Detachment because
army size establishes both available roster points and Detachment Points before
the player spends the latter. The priority uses each occurrence's immutable
materialized source choice name and a stable presentation-only sort. It does not
rewrite durable roster occurrence order, and unknown configuration choices keep
their source-relative order. Rejected alternatives were cost-name matching,
hard-coding a cost-type ID, hiding Detachment Points, treating source declaration
order as semantic priority, and mutating roster order.

### Delegation and review

A native Codex child received an early bounded read-only audit. Its brief named
the repository rules, prohibited writes and external actions, and asked it to
trace the cost and configuration-order data flow and identify regression risks.
It changed no files. The audit found the declaration-order dependency, confirmed
that setup currencies already use exact type IDs, and recommended immutable
source-choice names plus DOM ordering. Codex reviewed and implemented those
findings; no delegated code was accepted.

### Tests, corpus, and validation

The synthetic UI fixture deliberately declares Detachment Points before Points,
gives both finite limits, and adds Detachment before Battle Size. It proves that
both persistent summaries still lead with **80 / 2,000 Points**, that **0 / 3
Detachment Points** remains visible in Configuration and Other roster limits,
and that Battle Size precedes Detachment in the rendered workflow.

Verification:

- bounded native Codex read-only audit — completed and changed no files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **526 passed, 19 skipped (545)** across 57 files;
- pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` —
  **545 passed (545)** across 57 files; and
- production build — clean except for Vite's existing large-chunk warning.

The in-app browser's URL policy blocked localhost browser control, so no browser
workaround was attempted. The presentation behavior is covered by component DOM
assertions and the pinned real-data suite; this is a validation-environment
limitation rather than a classified product discrepancy.

### Remaining unsupported behavior

This checkpoint changes only presentation priority and ordering. It does not
change cost evaluation, Battle Size or Detachment semantics, initialization,
durable roster order, validation completeness, or any remaining pinned Aeldari
coverage family.

### Next recommended boundary

**Close the one remaining relevant Aeldari root-visibility decision.** Inventory
its exact owner, modifier carriers, conditions, and diagnostic first. Use
Reference Behavior QA if the pinned source does not settle applicability; keep
association and hidden Crusade fields as separate later families.

## Completed Assignment — Dedicated Active-Roster Shell, 2026-08-28

Baseline `3e9d05d`; resulting implementation commit `de83473` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` is intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The owner accepted a comprehensive usability review and asked that the major
interface overhaul proceed on a separate branch in case its direction proves
unusable. This first bounded checkpoint establishes the correct screen boundary
without restyling every nested roster component: an active roster now mounts as
the sole full-window primary surface. Lists/import/repository acquisition,
recovery, saved-draft management, setup, the site header, and the footer are not
mounted beside it. Closing the roster restores the same imported library,
pending recovery offer, remote-source state, and saved-list shelf without a
reload. The browser title is `Lists` or the active roster name.

Save and autosave state used to be rendered only by the saved-draft shelf.
Because that shelf now belongs exclusively to Lists, its player-facing status
and diagnostics move with the active roster. Tests pin successful save feedback,
quota failure, update/reopen/delete behavior, and the pending-recovery round
trip across the screen boundary.

### Design direction and decisions

`docs/ui-design-language.md` is the durable presentation contract for the
remaining work. It adapts current Apple Human Interface Guidelines for layout,
grouped lists, toolbars, search, sheets, split views, materials, typography,
color, and accessibility into semantic web tokens and reusable component
contracts. It requires one interaction vocabulary, 44 px touch targets,
system-font typography, progressive disclosure, restrained navigation material,
opaque content surfaces, compact/regular adaptations, and dark/high-contrast/
reduced-motion verification. It does not copy Apple assets, native-only
behavior, New Recruit markup, or New Recruit's visual design.

The rejected alternatives were CSS-hiding the old library shell, keeping the
catalogue as a permanent roster peer, rebuilding controller state when moving
between screens, and attempting the whole visual overhaul in one checkpoint.
They respectively preserve the wrong accessibility tree, keep the product
catalogue-centred, risk losing user state, or make review and rollback too
coarse.

### Delegation and review

Authenticated Claude Code received an early bounded read-only architecture and
regression-risk brief. Its tools were limited to Read/Grep/Glob in plan mode; it
could not write, execute shell commands, use a browser, or perform external
writes. It changed no files. The review identified the correct `App`-level
screen boundary and caught two state hazards before implementation: save status
would disappear with the draft shelf, and a pending recovery offer must survive
temporarily opening a different roster. Codex implemented and independently
validated those findings; no delegated code was accepted.

### Tests and validation

Verification on the implementation commit:

- focused DOM coverage for the dedicated screen, document title, absent library
  chrome, screen restoration, save/quota feedback, and recovery persistence;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **526 passed, 19 skipped (545)** across 57 files;
- pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` —
  **545 passed (545)** across 57 files; and
- production build — clean except for Vite's existing large-chunk warning.

The in-app browser's URL policy continued to block localhost browser control,
so no workaround or alternate browser surface was attempted. Component DOM
tests and the pinned real-data suite provide the available validation for this
structural checkpoint.

### Remaining work and next boundary

This is the first seam of the overhaul, not its visual completion. Existing
expanded army cards, catalogue controls, Configuration presentation, and visual
tokens remain in the active roster until their own bounded checkpoints. The
remaining pinned Aeldari matched-play coverage stays Open rather than being
discarded by the owner-directed reprioritisation.

**Next: replace the current army cards with compact grouped roster rows.** Each
row should show the unit name, selected model/loadout summary, semantic roles or
attention, trailing points, and one clear disclosure affordance. Editing and
read-only reference belong in the inspector/detail flow rather than competing
View/Remove buttons on every row. Re-run the reference army before accepting
the row model.

## Completed Assignment — Setup Auto-Collapse And Compact Grouped Army Rows, 2026-08-28

Baseline `969d617`; resulting implementation commits `4e3666c` and `4c190a7`
and this handoff commit on `codex/list-builder-ui-overhaul`. Stable `main`
remains intentionally unchanged. Codex remained the active lead, primary
implementer, integrator, reviewer, validator, and publisher.

Required setup cards now collapse only when their known child-choice state
transitions from unsatisfied to satisfied. Optional-only cards and incomplete
or unresolved bounds do not collapse by inference; a supported violation
reopens its owner. When the completed choice unmounts, focus returns to the
card disclosure. Rejected alternatives were collapsing after any subtree edit,
collapsing an initially satisfied restored card, and treating unknown bounds as
complete.

Army selections now use a dedicated compact row rather than the full recursive
editor in a row presentation mode. Each battlefield-role group is one inset
list. A unit row has exactly one disclosure button and shows its evaluated
display name, exact direct-model composition grouped by selected upgrade
identity, structurally recognized designation and attention pills, recursive
cost, and trailing chevron. The focused inspector reuses the existing editor
and now owns `View unit card`, `Remove unit`, and Close; removal closes the
inspector and returns focus to the selected-roster heading. Exact occurrence
anchors and detailed validation links remain authoritative.

Loadouts are derived only from materialized `upgrade` choices and exact choice
keys. Model types with different selected loadouts stay separate. No profile or
name inference was added. Rejected alternatives were retaining View/Remove on
every row, maintaining a second mutation implementation for the compact list,
guessing equipment from profile text, or flattening unknown/nested selections
into model composition.

### Delegation and review

A native Codex child received an early bounded read-only interaction and risk
audit and changed no files. It identified the strict unsatisfied-to-satisfied
configuration transition, attention precedence, focus-return requirement, and
the dedicated one-button row seam before implementation was complete. Codex
reviewed and implemented those findings; no delegated code was accepted.

### Browser, tests, corpus, and validation

Lead browser QA used the running pinned Aeldari saved roster. At regular width,
Guardian Defenders rendered as one **64 px** row with exactly one button,
`aria-controls="selected-unit-options-panel"`, composition/loadout text, and
**90 pts**. At a 390 px viewport override the browser document measured **375
px client and scroll width**, so there was no horizontal overflow; the row used
the available **302.67 px**, and all three inspector actions measured **44 px**
high. The live row showed `10× Guardian Defender` with Close Combat Weapon and
Shuriken Catapult plus `1× Heavy Weapon Platform` with Shuriken Cannon and
Close Combat Weapon. The full 2,000-point Dark Angels reference roster was not
rebuilt interactively in the disposable browser context; the immutable pinned
corpus and existing saved Aeldari roster supplied the bounded real-data checks.

Verification:

- focused application UI suite — **19 passed**;
- responsive style-contract suite — **5 passed**;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **526 passed, 19 skipped (545)** across 57 files;
- pinned corpus at `04c62fcd041b3808c39d5c46fd677c704027b979` —
  **545 passed (545)** across 57 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint changes presentation and focus behavior only. It does not
change roster evaluation, imported-data semantics, validation completeness,
durable occurrence order, or the remaining pinned Aeldari coverage families.
The permanent catalogue browser is still present beside the roster; replacing
it with the scoped Add unit sheet is the next overhaul seam. Configuration's
outer summary and the shared visual-token/component migration remain later
bounded checkpoints.

### Next recommended boundary

**Build the Add unit sheet.** Use the existing grouped/filterable root-choice
projection, make Add unit the roster-level entry point, focus search on compact
layouts, close after the first successful add, restore focus on dismissal, and
keep catalogue preview independent from mutation. Preserve the current exact
cost/count controls and do not redesign the inspector in the same checkpoint.

## Completed Assignment — Required Roles And Focused Reference Sheets, 2026-08-28

Baseline `2361488`; resulting implementation commit `78bd60d` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` remains intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

This bounded correction closes three usability gaps before the Add unit sheet.
Force-definition category-link bounds are now preserved by projection and
evaluated as a fourth validation family against effective category membership.
The supported slice is the exact pinned shape: finite selection minima/maxima
at roster scope with child selections and forces included, plus ordered direct
numeric modifiers. Unsupported shapes, grouped modifiers, or unresolved
membership stay incomplete rather than being guessed. A force-owned
`primary-catalogue` identity condition is now accepted by the ordinary
condition shape guard, which lets the authored exemption modifier run.

The workspace presentation folds a positive active category minimum into the
matching battlefield-role group even when no unit has been selected. A pinned
Aeldari roster therefore shows **Character — 0 / 1 required** and marks that
group as containing a known violation. Optional empty catalogue roles remain
hidden, and the retained constraint evidence now includes Category owners and
links back to the role heading.

Both persistent Checks affordances now open one modal player-facing problem
sheet instead of moving the page to the technical evidence below the builder.
Each known violation has plain-language observed/limit text and retains an
exact Review link. `View unit card` likewise opens a modal reference sheet
instead of injecting a long surface into the roster document. Profile rows of
the same authored type render in compact native tables with one header row,
horizontal overflow contained inside the table wrapper, and effective-value
annotations preserved. Escape and backdrop dismissal are supported, Tab is
contained, and focus returns to the invoking control.

Rejected alternatives were treating category minima as structural root bounds,
guessing a missing role from category names, rendering every optional empty
role, replacing the retained developer evidence with the modal, and copying
New Recruit's styling or eye icon. The report family remains evaluator-owned;
the web layer only presents its supported result.

### Delegation and review

A native Codex child performed an early read-only seam and accessibility audit
from a disposable worktree at the baseline and changed no files. It identified
the missing category-constraint report family, the safe empty-role seeding
boundary, modal focus requirements, and the existing profile presentation seam.
An authenticated Claude Code read-only review independently recommended the
same fourth report family, effective-category counting, conservative unresolved
behavior, and an early corpus measurement. Codex reviewed both findings and
implemented the bounded result; no delegated code was accepted.

### Corpus, browser, tests, and validation

Across all **46** pinned JSON documents at
`04c62fcd041b3808c39d5c46fd677c704027b979`, only **2** constraints are authored
on force-definition category links. Both are Character minimum 1, field
`selections`, scope `roster`, with child selections and forces included; both
carry a direct conditional `set 0` modifier and no modifier group. The pinned
Aeldari integration assertion now proves a configured Guardian roster with no
Character is invalid with exactly one violated Category finding: observed 0,
limit 1, complete.

Lead browser QA used the running pinned Aeldari saved roster. The selected
roster showed `Character`, `Contains known violation`, and `0 / 1 required`.
The header reported one known problem; clicking it opened `Roster problems`
with `Character: 1 more selection required`, `0 selected, limit 1`, and the
exact role Review link. Detailed evidence reported 78 satisfied, 1 violated,
and 3 unresolved constraint bounds, with the violation labelled `Category |
Minimum | roster`. Guardian Defenders opened in `Unit card for Guardian
Defenders` with compact Abilities, Unit, Ranged Weapons, and Melee Weapons
tables. Escape closed the sheet and returned focus to `View unit card`.

Verification:

- focused application UI suite — **19 passed**;
- ordinary `pnpm test` — **527 passed, 19 skipped (546)** across 58 files;
- pinned Aeldari integration file — **18 passed** at corpus revision
  `04c62fcd041b3808c39d5c46fd677c704027b979`;
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` — clean;
  and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

Wider category-bound scopes, fields, inclusion flags, shared values, and
modifier groups remain unresolved and diagnostic. The existing selected-unit
options surface is still inline by design; it is persistent editing content,
not a temporary reference surface. The full 2,000-point Dark Angels reference
army was not rebuilt interactively in this bounded correction. The Add unit
sheet, compact Configuration summary, shared component-token migration, and
post-hierarchy print/phone pass remain in the recorded overhaul order.

### Next recommended boundary

**Build the Add unit sheet**, still the single roadmap `Next`. Reuse the
existing grouped/filterable root-choice projection, open it from a roster-level
action with search focused on compact layouts, close it after the first
successful add, restore focus on dismissal, and keep catalogue preview
independent from mutation. Do not redesign Configuration or the inspector in
the same checkpoint.

## Completed Assignment — Focused Add Unit Sheet And Overhaul Roadmap, 2026-08-28

Baseline `6a87a7b`; resulting implementation commit `bec6f25` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` remains intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The permanent catalogue column is gone. The persistent roster action now opens
the same immutable grouped/filterable root-choice projection as a scoped Add
unit dialog, preserving source order, category grouping, counts, source costs,
effective maxima, exact mutation behavior, diagnostics, and filter state. The
sheet is closed by default. It fills the viewport through the 560 px compact
breakpoint and focuses search; above that breakpoint it is centred and focuses
Close. `/` opens or focuses search without replacing an editable field,
Escape/backdrop/Close contain and restore focus, and background scrolling is
locked while the task is active.

A successful army-root add closes the sheet, selects the new occurrence, and
focuses its roster-row disclosure. Failed additions and Configuration-root
additions leave the sheet and filter intact. Opening catalogue information
temporarily hides the Add unit dialog so the accessibility tree and painted UI
contain only one modal; closing the preview restores its exact information
button. Add and information buttons now meet the 44 x 44 px touch-target floor,
including the more-specific legacy segmented-control cascade found by live
measurement.

The branch-specific design audit is recorded in `docs/ui-design-language.md`.
The dedicated roster shell and grouped rows are sound foundations, but the
legacy visual vocabulary, long Configuration step, separate Lists experience,
fragmented document actions, missing dark/high-contrast variants, and absent
manifest/icons/service-worker boundary remain. The roadmap now carries those
as explicit bounded checkpoints instead of implying that the active roster
alone completes the overhaul. Current Apple Layout, Lists and tables, Toolbars,
Search fields, Sheets, Materials, and Accessibility guidance informed the
sheet and roadmap: material stays out of content, one sheet owns one task, and
safe areas, scalable text, contrast, and color-independent states are acceptance
criteria.

Rejected alternatives were retaining a desktop catalogue column, rebuilding
or filtering the root projection, clearing search on dismissal, closing after
Configuration additions, exposing two simultaneous `aria-modal` dialogs, and
starting the generic component/token migration inside this bounded checkpoint.

### Delegation and review

A native Codex child performed an early read-only seam, interaction, test, and
accessibility audit in a disposable worktree at the exact baseline and changed
no files. It identified the controller's successful-occurrence-ID seam, the
need to retain Configuration additions and failed mutations, compact versus
regular initial focus, the two-modal preview risk, the 44 px target gap, and the
focused test locations. Codex reviewed and implemented the findings. The
verified-clean audit worktree was removed afterward; no delegated code was
accepted.

### Browser, tests, corpus, and validation

Lead browser QA used the running pinned Aeldari catalogue. At 390 px the full
sheet focused search, stayed exactly within the viewport, exposed one modal,
and retained its search while previewing Wraithguard. The preview temporarily
removed Add unit from layout and returned focus to `View information for
Wraithguard`. Searching for and adding Farseer closed the sheet and focused
`Configure Farseer`; the live roster showed the new 65-point Character. All 170
live root add/information controls measured at least 44 x 44 px after the cascade
correction.

Responsive measurements covered 320 x 568, 390 x 844, 430 x 932, the 560/561 px
compact boundary, 768 x 1024 tablet, 844 x 390 compact landscape, 1440 x 1000,
and 1920 x 1080. The 320, 390, and 430 sheets filled their viewport; the 768 px
sheet measured 720 px wide and the desktop/ultrawide sheet remained capped at
760 px. Document scroll widths equalled their client widths and each sheet rect
stayed inside its viewport at every measured size. The final focus check proved
560 px search-first, 561 px
Close-first, 768 px Close-first, in-sheet `/` focus, and trigger restoration.
Exact browser text-only zoom, dark appearance, and increased contrast remain
future cross-mode acceptance rather than being inferred from narrow-width QA.

Verification:

- focused Add unit and responsive style suites — **25 passed** across 2 files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **528 passed, 19 skipped (547)** across 58 files;
- pinned 46-document corpus at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **547 passed (547)** across
  58 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This presentation checkpoint does not alter evaluation, root visibility,
mutation guards, imported-data semantics, validation completeness, persistent
formats, or the remaining pinned Aeldari behavior families. Configuration is
still a long default-open tree. The active roster still uses legacy colors,
type, spacing, and one-off controls; Lists/creation, document workflows,
installed-PWA behavior, dark/high-contrast appearance, exact 200% text reflow,
screen-reader acceptance, and final print/responsive acceptance remain recorded
in the roadmap. The full 2,000-point Dark Angels army was not rebuilt
interactively in this bounded checkpoint; the pinned corpus and live Aeldari
add/preview path supplied the real-data checks.

### Next recommended boundary

**Collapse Configuration to one settings-style summary row.** Preserve every
configuration choice, exact points and secondary-capacity summary, validation
link and attention state, automatic reopen behavior, and collapsed Developer
detail. Do not begin the shared visual-token/component migration in the same
checkpoint.

## Completed Assignment — Compact Configuration Settings Row, 2026-08-28

Baseline `b3944fb`; resulting implementation commit `943c15f` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` remains intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

Configuration no longer makes every active roster begin with several screens
of setup controls. Its full-width outer disclosure is closed by default and
reads as one settings-style row: the role name, exact selected descendant
upgrade values in existing source order, the evaluated headline capacity, each
distinct setup-relevant finite capacity, a text known-violation state, and one
chevron. The complete existing selection tree stays mounted and opens on
demand, so authored choices, editing behavior, diagnostics, and Developer
details are preserved rather than rebuilt or hidden by a new projection.

Initial attention is visible without forcing a recovered or newly encountered
roster open. A later clean-to-invalid transition opens the repair controls, but
the player can deliberately close an invalid section after review. Required
inner setup cards retain their established unsatisfied-to-satisfied collapse
and focus return. Exact check links now recognize configuration ownership even
when a descendant is not mounted, open each owning disclosure, scroll to the
stable selection anchor, and focus it for keyboard users.

Rejected alternatives were a second setup sheet or inspector, unmounting the
editor while collapsed, rebuilding a parallel typed settings model, inferring
currencies or settings from display names, hiding attention to hold a fixed row
height, and combining this checkpoint with the broader token/component
migration. Those options either duplicated interaction state, weakened
validation reachability, or expanded the checkpoint beyond its bounded seam.

### Delegation and review

A native Codex child performed an early read-only summary, attention, focus,
and test-risk audit from a disposable worktree at the exact baseline and
changed no files. It identified the safe outer-disclosure boundary, exact-ID
capacity deduplication, selected-descendant summary seam, initial-versus-new
attention distinction, and nested validation-link risk. Codex reviewed and
implemented those findings. The verified-clean audit worktree was removed; no
delegated code was accepted.

### Browser, tests, corpus, and validation

Lead browser QA used the running pinned Aeldari recovered roster. The collapsed
Configuration surface measured about **102 px** high at 320/390 px and **65 px**
at 768/1440 px, down from the prior roughly **3,568 px** expanded setup body.
At 320, 390, 768, and 1440 px the document never exceeded the viewport width.
The live row showed `1. Incursion (1000 Point limit)`, `65 / 1,000 pts`,
`0 / 2 Detachment Points`, and `Contains known violation`. Mouse disclosure,
exact nested Review-link reveal, scrolling, and programmatic focus of the
target selection were exercised in the real browser. The Vite server at
`http://127.0.0.1:5174/` was intentionally left running at the owner's request
for inspection.

Verification:

- focused application UI and responsive style suites — **26 passed** across 2
  files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **529 passed, 19 skipped (548)** across 58 files;
- pinned 46-document corpus at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **548 passed (548)** across
  58 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint changes presentation and focus routing only. It does not alter
evaluation, root visibility, mutations, imported-data semantics, validation
completeness, persistent formats, or the remaining pinned Aeldari behavior
families. The active roster still mixes legacy color, typography, spacing, and
one-off control rules. Lists/creation, document workflows, installed-PWA
behavior, dark/high-contrast appearance, exact 200% text reflow, screen-reader
acceptance, and final print/responsive acceptance remain recorded in the
overhaul roadmap. The full 2,000-point Dark Angels army was not rebuilt in this
bounded presentation checkpoint.

### Next recommended boundary

**Apply the shared active-roster component and token system.** Introduce the
semantic tokens and reusable navigation, grouped-row, sheet, inspector, picker,
switch, stepper, status, and More-menu primitives on the active roster without
pulling Lists/creation or installed-PWA work into the same checkpoint. Preserve
the now-settled Add unit and Configuration interaction contracts while changing
their visual vocabulary.

## Completed Assignment — Blurred Material Foundations, 2026-08-29

Baseline `e439e6e`; resulting implementation commit `f6a1b42` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` remains intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The sticky Roster/Add unit/Checks navigator now uses a dense dark-green material
with an 82% base surface, 26 px background blur, restrained saturation, a soft
edge highlight, and enough opacity that its live counts remain readable while
page color passes beneath it. Its small secondary labels were lightened after a
contrast audit. The navigator's dimensions and `top: 0` sticky contract remain
unchanged, so the existing 84 px fragment offset still clears it.

The army-role list no longer paints one shared clipped box. It is a transparent
grid with a measured 10 px gap, and every top-level unit owns its own rounded,
72% standard-material card with 18 px blur, border, highlight, and elevation.
Active selection and known-attention states now add to that base elevation
instead of replacing it. Nested configuration, selections, inspectors, and
reference content deliberately remain ordinary surfaces so a large roster does
not become a stack of filtered panes.

Every active-roster modal already shared the same overlay boundary. That overlay
now applies a 20 px backdrop blur to the entire viewport while leaving its
dialog child sharp. Unsupported browsers retain the prior darker scrim; the
lighter blurred scrim is gated behind `@supports`. Reduced-transparency,
increased-contrast, and forced-colors preferences disable the blur and restore
opaque or system-color surfaces. No blur is animated and no `will-change` hint
keeps these layers permanently promoted.

Exact-minimum QA also exposed a pre-existing Windows scrollbar interaction:
`body { min-width: 320px }` widened a 320 px window when a classic 15 px vertical
scrollbar reduced its layout viewport to 305 px. The support floor is now capped
at the available width. The same browser changed from document/client widths
`320 / 305` to `305 / 305`, removing the horizontal scrollbar without changing
the declared 320 px supported window size.

The design-language, architecture, and compatibility records now distinguish
the navigator's denser glass-like navigation material from the thicker standard
material on top-level unit content. They also record the shared full-viewport
modal blur. This is a bounded visual foundation, not completion of the broader
semantic token and reusable-control migration.

### Decisions and rejected alternatives

Apple's current Materials guidance informed the hierarchy: the functional
navigator uses the stronger glass-like treatment, while repeated unit content
uses a thicker standard material. A clear, highly transparent navigator was
rejected because the owner explicitly preferred blur and legibility. Applying
glass to every nested selection or editor was rejected because it would weaken
content hierarchy and create many more composited layers on a phone. Filtering
the application root was rejected because it would blur the dialog as well as
its surroundings; `backdrop-filter` on the overlay preserves the intended sharp
task surface. A translucent-only implementation was rejected in favour of dark
fallback scrims and opaque accessibility modes.

### Delegation and review

A native Codex child performed an early read-only CSS-boundary, modal-coverage,
contrast, accessibility, performance, and documentation audit from a disposable
worktree at the exact baseline. It confirmed that the existing JSX already
provided separate unit `<li>` elements and one overlay class for Add unit, unit
reference, problems, and catalogue preview, so no behavioral rewrite was
warranted. Codex reviewed and implemented the findings. The audit worktree was
verified clean and removed; no delegated code was accepted.

### Browser, tests, corpus, and validation

Lead browser QA used the project-owned Selection Initialization game-system and
catalogue fixtures, created `Initialization Force`, and exercised separate
`Initialization Unit` and `Automatic Reconciliation Unit` cards. The live
computed styles measured a 10 px card gap, 18 px card blur, 26 px navigator
blur, and 20 px modal blur. Add unit changed from an exact full-screen 560 x 800
task to a 513.3 px-wide centred task with 24 px side insets at 561 px. Unit
reference, Add unit, and Roster problems all left the dialog sharp while the
entire underlying viewport visibly blurred.

Responsive measurements covered 320 x 568, 390 x 844, the 560/561 px Add unit
boundary, 768 x 1024, 844 x 390, 1440 x 1000, and 1920 x 1080. Document and
client widths matched after the 320 px correction. At 844 x 390 the navigator
remained at `top: 0` after a 650 px scroll; tablet card separation measured
9.99998 px; and the ultrawide document/client widths both measured 1,905 px.
The browser showed active and attention cards retaining their material and
semantic state at portrait, landscape, tablet, and desktop widths.

Verification:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **531 passed, 19 skipped (550 total)** across 58 files;
- pinned 46-document corpus at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **550 passed (550)** across
  58 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint changes presentation only. It does not alter evaluation, root
visibility, mutation behavior, imported-data semantics, validation completeness,
persistent formats, or the remaining pinned Aeldari behavior families. The full
active-roster semantic token and reusable navigation/row/sheet/inspector/control
migration remains Next. Lists/creation, document workflows, installed-PWA
behavior, dark appearance, exact 200% reflow, screen-reader acceptance, and
final print/cross-mode acceptance remain recorded in the roadmap. The CSS
preference fallbacks were added but do not claim that later cross-mode acceptance
is complete. The full 2,000-point Dark Angels army was not rebuilt in this
bounded material checkpoint.

### Next recommended boundary

**Complete the shared active-roster component and token system.** Consolidate
the remaining legacy colors, typography, spacing, and one-off navigation, row,
sheet, inspector, picker, switch, stepper, status, and More-menu rules without
pulling Lists/creation, installed-PWA, or print acceptance into the same
checkpoint. Preserve the settled Add unit, Configuration, unit-card, and modal
interaction contracts while completing their reusable visual vocabulary.

## Completed Assignment — Unified Active-Roster Card Geometry, 2026-08-29

Baseline `1163b5b`; resulting implementation commit `3ce9ac7` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` remains intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

Every exposed rectangular corner in the active roster now consumes one shared
14 px token. Cards, fields, dialogs, disclosures, standalone buttons, badges,
and status surfaces therefore use the same geometry. Joined mutation and
information controls preserve the 14 px radius on their exterior corners and
square only the internal seam. True circles remain circular, and the compact
full-viewport Add unit sheet and intentionally surface-free synthetic wrappers
remain square because they expose no card corner.

The existing selection hierarchy now expresses each nested option as a
separate inset material card inside its overall group. Ordinary direct choices,
repeatable model steppers, selection-entry groups, promoted model rows,
configuration selections, role choices, profile/rule information, constraint
rows, and Add unit results reuse their existing semantic wrappers rather than
introducing parallel JSX or interaction state. Nested cards use a higher-opacity
surface, shared translucent border, inset highlight, and shallow elevation. They
do not add `backdrop-filter` at each level, avoiding a multiplied compositing
cost on deeply configured phone-width rosters. The selected-unit inspector's
synthetic root wrapper remains surface-free so it is the overall group rather
than a redundant card around every real child.

The design-language contract now treats the shared radius as a standing rule.
A stylesheet regression test scans the active-roster layer and rejects any new
numeric `border-radius` other than zero for an internal seam, full-bleed task,
or surface-free wrapper. Architecture and compatibility records describe the
presentation boundary and explicitly state that selection and evaluation
semantics are unchanged.

### Decisions and rejected alternatives

The established 14 px unit-card radius won over retaining the previous 2, 3, 4,
5, 6, 8, 10, 12, 16, and pill-specific radii. A second radius for buttons was
rejected because it recreated the inconsistency the owner identified. Fully
round pill radii were also rejected for rectangular badges; they now consume the
same token and remain visually soft at their current height. Applying a backdrop
filter to every nested option was rejected because the higher-opacity inset
material already carries the page color and hierarchy without creating dozens
of extra filtered layers. Rebuilding the JSX around a new card component was
rejected because the existing semantic boundaries already match the requested
visual hierarchy and no behavioral change was needed.

### Delegation and review

A native Codex child performed an early read-only JSX-boundary, radius-cascade,
responsive, performance, and test-risk audit from a disposable worktree at the
exact baseline. It identified the selected-unit synthetic-root exception, the
joined-control cascade, the full-screen-sheet exception, existing fieldset and
profile-table clipping risks, and the documentation conflict with nested cards.
Codex reviewed and implemented those findings. The audit worktree was verified
clean and removed; no delegated code was accepted.

### Browser, tests, corpus, and validation

Lead browser QA reused the running project-owned Selection Initialization
fixture with `Initialization Unit`, `Automatic Reconciliation Unit`, grouped
source/preferred choices, repeatable models, and a newly selected
`Disabled Automatic Root` Configuration entry. At desktop and 390 x 844, the
individual nested choices, two group fieldsets, model steppers, unit cards, and
Configuration selection all computed to 14 px. Joined controls computed to
`14px 0 0 14px` and `0 14px 14px 0`; all visible ordinary buttons consumed the
same exposed radius. The full-bleed roster shell computed to zero as intended.

At 320 x 568 and 390 x 844, document scroll width equalled client width. The
regular Add unit dialog computed to 14 px at 561 px; its compact full-viewport
form computed to zero at 560 px while its buttons remained 14 px. A nested
choice information dialog and its Close button both computed to 14 px, and the
shared overlay retained a live 20 px viewport blur while the dialog stayed
sharp. The browser console reported no errors. Exact 200% text zoom, dark
appearance, increased-contrast rendering, and screen-reader acceptance remain
future cross-mode acceptance rather than being inferred from this geometry QA.

Verification:

- focused responsive-style suite — **10 passed** across one file;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **532 passed, 19 skipped (551 total)** across 58 files;
- pinned 46-document corpus at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **551 passed (551)** across
  58 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint changes presentation only. It does not alter evaluation, root
visibility, mutation behavior, imported-data semantics, validation completeness,
persistent formats, or the remaining pinned Aeldari behavior families. The
shared 14 px rule is complete for the active roster; the legacy Lists and remote
source surfaces are intentionally outside this checkpoint and retain their
existing radii until the recorded Lists/creation migration. The active roster
still has remaining legacy color, typography, spacing, and one-off component
rules. Document workflows, installed-PWA behavior, dark appearance, exact 200%
reflow, screen-reader acceptance, and final print/cross-mode acceptance remain
recorded in the roadmap. The full 2,000-point Dark Angels army was not rebuilt
in this bounded presentation checkpoint.

### Next recommended boundary

**Complete the remaining shared active-roster component and token system.**
Consolidate the legacy colors, typography, spacing, and one-off navigation, row,
sheet, inspector, picker, switch, stepper, status, and More-menu rules without
pulling Lists/creation, installed-PWA, or print acceptance into the same
checkpoint. Preserve the settled card-material, radius, Add unit,
Configuration, unit-card, and modal interaction contracts.

## Completed Assignment — Simplified Sticky Roster Identity And Warning, 2026-08-29

Baseline `86f77e6`; resulting implementation commit `1e6fd53` and this handoff
commit on `codex/list-builder-ui-overhaul`. Stable `main` remains intentionally
unchanged. Codex remained the active lead, primary implementer, integrator,
reviewer, validator, and publisher.

The large player-facing roster summary card before the builder is gone. The
sticky blurred navigator is now the first element of the active workspace and
its flexible leading destination carries the roster name, chosen
catalogue/faction, and preferred evaluated cost. The Add unit destination keeps
its available-choice count. Checks no longer competes as a third equal-width
destination: one code-native warning triangle and visible count occupy a 44 px
control, become red only for known violations, remain neutral at zero, and name
an unavailable report rather than presenting a false zero.

Removing prominence did not remove evidence. The legality boundary, zero-value
source cost fields, every secondary evaluated currency, the conservative
cost-plus-validation completeness fold, incomplete-coverage reasons, excluded
cost counts, unresolved selections, and Developer cost diagnostics now live in
the existing Detailed supported evidence disclosure below the roster beside
the structural and constraint reports. The disclosure summary consumes the
combined report completeness rather than validation completeness alone.

The problems trigger keeps its existing modal and trigger-reference path. It
now exposes `aria-haspopup`, `aria-expanded`, and a live `aria-controls` target;
the dialog has the matching stable ID. Escape and Close continue to restore
focus. Save, update, undo/redo, and print actions remain reachable in their
existing action row. The navigator moved ahead of Configuration so an expanded
settings tree can never delay the sticky identity by several screens; the
former negative history-row margin was removed.

### Decisions and rejected alternatives

The roster name, faction, live budget, Add unit action, and compact problem
status won over retaining a second identity/metrics card because those are the
only values needed continuously while building. A text `Checks` button and
separate structural/constraint links in the bar were rejected because they
recreated the prominence the owner asked to remove; exact findings remain in
the problem sheet and detailed evidence. Cost and completeness evidence was
moved rather than deleted because unsupported imported behavior must remain
observable and incomplete. Red at zero was rejected because it would signal an
error that does not exist. The warning stayed a 44 px target even though its
painted content is small, preserving phone and keyboard usability.

### Delegation and review

A native Codex child performed an early read-only identity/data-flow,
accessibility, responsive-layout, test, and documentation audit from a
disposable worktree at exact baseline `86f77e6`. It identified the required
first-child navigator placement, combined-completeness dependency, retained
secondary/zero cost evidence, trigger focus path, responsive truncation needs,
and stale architecture promises. Codex reviewed and implemented those findings.
The audit worktree was verified clean and removed; no delegated code was
accepted.

### Browser, tests, corpus, and validation

Lead browser QA recovered the project-owned Selection Initialization roster in
the already-running preview. At the normal 781 px browser viewport, the
navigator was the first workspace child, measured 56 px high with computed
`blur(26px) saturate(1.15)`, and the warning measured 44 x 47 px. The former
`.roster-player-header` was absent. At a 390 px window the document/client
widths were 375/375, the bar tracks measured 208.646 / 77.354 / 44 px, and the
roster title and faction both remained present with overflow containment. At
the supported 320 px window the document/client widths were 305/305, the
identity retained 138.646 px, Add unit 77 px, and the warning 44 px; there was
no horizontal overflow.

Opening the one-known-violation problem sheet at 320 px computed a 20 px full-
viewport backdrop blur with the dialog sharp, focused Close, and exposed the
matching `roster-problems-dialog` control relationship. Closing restored focus
to `Open roster problems, 1 known violation` and cleared `aria-controls`. The
temporary responsive viewport override was reset, the roster remains open in
the preview, and the development server was deliberately left running for the
owner.

Verification:

- focused UI/style run — **532 passed, 19 skipped (551 total)** across 58 files;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check` — clean;
- ordinary suite — **532 passed, 19 skipped (551 total)** across 58 files;
- pinned 46-document corpus at
  `04c62fcd041b3808c39d5c46fd677c704027b979` — **551 passed (551)** across
  58 files; and
- production build — clean except for Vite's existing large-chunk warning.

### Remaining unsupported behavior

This checkpoint changes presentation only. It does not alter evaluation, root
visibility, mutation behavior, imported-data semantics, validation
completeness, persistent formats, or the remaining pinned Aeldari behavior
families. The warning presents known violations only; incomplete coverage stays
separate under Detailed supported evidence by design. The remaining shared
active-roster token/component work, Lists/creation migration, document action
menu and duplicate workflow, installed-PWA behavior, dark appearance, exact
200% reflow, screen-reader acceptance, and final print/cross-mode acceptance
remain in the roadmap. The full 2,000-point Dark Angels army was not rebuilt in
this bounded hierarchy checkpoint.

### Next recommended boundary

**Complete the remaining shared active-roster component and token system.**
Consolidate legacy colors, typography, spacing, and one-off navigation, row,
sheet, inspector, picker, switch, stepper, status, and More-menu rules while
preserving the settled sticky identity/warning, evidence, card-material,
radius, Add unit, Configuration, unit-card, and modal contracts.
