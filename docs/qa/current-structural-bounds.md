# Current descendant bounds — 2026-09-11

Baseline `f024d9b364656211d49963122e94ea8d588d0afe`, selected branch
`codex/list-builder-ui-overhaul`. This is the first of two separately authorized
mechanisms; conditional creation is not changed by this repair.

## Reproduction and cause

Ordinary browser tab 6, `http://127.0.0.1:5243/app/`, existing saved
`QA measured scalar repair`: 14 units / 2,000 points, original completed ledger
in `grok-renderer-repair.md`. Before edits: structural 236 satisfied / 0 violated /
2 unresolved; constraints 378 / 0 / 0. No roster/storage edits were made.

| Exact owner in that army | Source definition | Selected Warlord | Source link |
| --- | --- | --- | --- |
| Captain, DOM occurrence anchor `roster-selection-46-rnifvh-122z6bl` | `6c10-5b51-5bc0-8d2c` | 1 | `a89c-b01e-ffab-8ebb` |
| Lieutenant, DOM occurrence anchor `roster-selection-46-jyeqx3-rprlep` | `ce15-e87e-7cff-b129` | 0 | `a576-1af3-987a-399c` |

These are exact browser occurrence anchors, not claimed to be the underlying
opaque selection IDs. Synthetic/integration reproduction uses explicit caller
IDs. Both links materialize shared definition `caa-f869-3cbd-b48e` from
`Imperium - Space Marines.json`. Its constraint `1d6a-f04f-acb6-7b66` at
`catalogue/sharedSelectionEntries[0]/selectionEntry[0]/constraints[0]/constraint[0]`
is parent-scoped, shared selections, maximum 1, includeChildSelections true,
includeChildForces false, non-percentage. Both links overlay direct-parent
maximum 1 `ad60-fb6-5cf4-f118`. There are no modifiers or conditions on these
bounds. Absence of a local minimum means 0, not an unknown minimum. The separate
army-wide Warlord requirement remains a category constraint, not this local cap.

`structural-status.inspectSelectionTree` calls the live child inspector, which
shares `selectionBounds` with creation planning. `unsupportedBoundProperties`
rejects descendant inclusion. The resulting initialization-worded diagnostic
`EVALUATION_INITIALIZATION_CONSTRAINT_UNSUPPORTED` withheld both displayed limits.
The missing capability was counting matching descendants, not discovering the
player's intention. Classification A: an applicable counting shape unsupported
by this structural inspector (already supported by the separate constraint
inspector). It was not stale saved initialization state or an inactive rule.

## Repair and deliberate limits

Live direct-entry inspection counts actual descendants using the shared cached
source-identity resolver, preserving ambiguous candidates as uncertain. Shared
definitions match across links; non-shared identities retain link scope. A
direct maximum at least as permissive as a same-identity descendant maximum is
mathematically redundant: the direct set is a subset. Other mixed count domains,
dynamic descendant bounds, unknown properties and unresolved identities remain
incomplete. No faction/name/ID checks or aggregate-status substitutions.

One subtree walk per applicable row, cached catalogue identity index, no roster
copy or source-byte copy. Static creation remains conservative. The first fixture
fails when the new live capability is disabled (unknown instead of max1), then
passes enabled, including nested duplicate violation/removal/history/restoration.
Immutable A/B tests verify both eight-file manifests (revision, byte length,
SHA256, Git blob and dependencies) and both character states through restoration.

The unchanged saved browser army now reports structural **238 / 0 / 0**, with
constraint **378 / 0 / 0** and unchanged 2,000 points. These two domains are
complete; aggregate coverage still retains three missing-type zero-valued `pl`
costs. See `conditional-initialization.md`. No universal legality claim.

## Validation

Final candidate gates: lint, typecheck, build, whitespace pass; normal suite
704 passed / 30 skipped, 78 passed / 6 skipped files, 11.11s. Two optional corpus
suites: 25 passed, 34.83s, including 36 focused closures / 46 source documents.
External corpus HEAD verified `04c62fcd041b3808c39d5c46fd677c704027b979`.
Existing bundle-size advisory retained (809.85 kB); no renderer instrumentation
or source-byte retention changes. Final review/gates and publication are recorded
in the handoff entry. Full new-army replay follows the second checkpoint.

Authenticated Claude Code read-only review (Sonnet 5) confirmed subset dominance,
identity and uncertainty propagation. Added synthetic equal-cap folding,
non-dominated cap, mismatched identity, local links and ancestor-modifier tests.
The review's more-distant-ancestor concern was treated as a correctness risk:
the new live capability now rejects modifiers from resolved selected ancestors,
and unresolved ancestry withholds it. The initial review's hypothesis of a zero
minimum causing the two warnings was disproved by the exact source maxima above.
Its proposed root-initialization expansion is out of this batch's scope. No
credentials, saved armies or whole third-party datasets were sent for review.
