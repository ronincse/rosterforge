# Required attachments and connected effects — 2026-09-10

Candidate based on `42adbb7`, branch `codex/list-builder-ui-overhaul`. This is
Supporting acceptance, not full-army acceptance. Source bytes/pins unchanged.

## Mechanism and evidence

Min1/max1/default-none declarations were rejected as unsupported, incoming
association constraints were not evaluated, and `.group` was incorrectly treated
as authored selection-entry-group traversal. Flattening routed modifier groups
also lost enclosing source gates. The repair separates structural connectivity,
eligibility, bounds and routed applicability, without names/faction assumptions.

Immutable A `04c62fcd041b3808c39d5c46fd677c704027b979` and captured B
`5b261ec423d5d017bb733c4f3c0a760b085d5ca5` each have an eight-file Dark Angels
closure verified by revision, byte length, SHA256, Git-blob SHA1 and dependency IDs.
Independent closure inventory: A/B 51/67 association definitions, 89/93 incoming
association constraints, 44/45 group-cost constraints, 101/120 `.group` modifiers.
These are closure counts, not all-46 counts. The earlier whole-A inventory is
retained in `supporting-reference-evidence.md`. B is not claimed to be latest.

The group enhancement limit uses the hidden source currency, not a count inferred
from labels. Conditional increments work; applicable divide remains explicitly
incomplete. Forty-four/45 source bounds do not establish every possible query.

## Regressions and independent review

Independent original synthetic baseline: seven failures, one passing unsupported
divide case. Candidate: 17 focused tests pass, including four reviewer-discovered
edge cases (ambiguous target IDs, unknown filter children, unknown enclosing
group behavior and unrelated-force uncertainty), and five lifecycle/transitive
checks. Ordinary optional-association coverage is retained. Exact target IDs,
duplicate edges, excess targets, min/default behavior, incoming distinct counts,
evaluated group costs and no stale/repeated weapon append are tested.

Native review used an isolated worktree; lead reviewed/integrated tests and reran
them. Authenticated Claude Code read-only review (actual model Sonnet5) confirmed
the four corrections, with no further confirmed issue. Its possible undefined
root-cost-anchor concern is ruled out by `RosterSelectionLocation.root`'s required
self-root invariant and the existing top-level group-cost tests. No secrets,
personal rosters or third-party source datasets were sent to the external reviewer.

Four optional A/B integration cases pass: the two prior pricing probes and two
new Supporting journeys. Both snapshots verify missing/assigned minimum, the
Lieutenant's own gate, Intercessor weapons, separately Leading Captain, unrelated
Captain, repeated evaluation, duplicate-unattached policy and endpoint deletion.

The full pinned corpus gate also disproved two historical positive-buff assertions:
Lord of Contagion's Sustained Hits/Lance require an attachment; Helbrute's Assault
requires Contagion Engines. Updated tests assert the exact source gates, negative
state, assigned/configured positive state and removal. Furnace and melee-category
effects remain independently checked. Selector inventory now separates128
group-only selectors from descendant traversal (own483/children170, total2562).
Guardian incoming/group-currency diagnostics disappear because their bounds now
evaluate; its remaining unsupported source conditions still retain incompleteness.

Final local gates: lint, typecheck, full tests, build and whitespace pass. Normal
suite689passed/28skipped717tests,75passed/6skipped81files,10.97s. Six optional
pinned suites28passed30.24s, including both A/B pairs and all46 source imports.
External corpus HEAD verified04c62fc and clean; permanent acquisition pin unchanged.
Production build retains the existing large-bundle advisory (808.43kB main JS).

## Actual browser acceptance

Own origin `http://127.0.0.1:5242/app/`, temporary `QA Supporting A`, frozen A via
ordinary file picker. User tabs, storage, servers and armies untouched.

1. Lieutenant alone: required Supporting 0/1 visible; own weapon profiles lack
   Lethal Hits. Five-model Intercessors manually configured 1/3/1.
2. Supporting to Intercessors: requirement clears; weapon rows gain one Lethal
   Hits, with “Added by Lieutenant” provenance. Unassigned Captain unchanged.
3. First Captain Leading the same squad receives Lethal Hits; second Captain
   remains unrelated. Detaching Lieutenant removes the additions from both the
   Captain and Lieutenant, while Captain's separate Leading remains.
4. Undo/redo restores/removes the exact Supporting edge. Duplicate Intercessors
   and retarget Supporting: effect moves to squad2; Captain on squad1 loses it.
5. Assign second Captain to squad1: authored incoming max reports observed2,
   limit1, violated. Detach it to restore the original state.
6. Duplicate Lieutenant: copy has its own missing requirement; original stays
   assigned. Delete squad2: original becomes unassigned. Undo restores its edge.
7. Save410, leave `/app/`, reopen by saved name: original target and squad2 effects
   survive; duplicate remains unassigned. Console warning/error list empty.

Two locator errors used the wrong modal-close name and one post-duplicate read
assumed options would open automatically. DOM inspection identified the actual
controls/state; they were not renderer failures and actions were not repeated.
The separate full-army run DID fail; it is not replaced by this passing journey.

## Remaining boundary

Shared links, broader default/multiple-target shapes, transitive condition queries,
unknown gates and unsupported operations remain incomplete. Configuring real data
can still expose unsupported structural bounds; no general game-legality claim.
No reference UI redesign, source migration or StarCraft work. Full-army replay is
blocked by the new timing-allocation failure recorded in `reference-army-replay.md`.
