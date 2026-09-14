# StarCraft authored requirements repair

Historical baseline: `c5a04c9b0c88f748faca765f79e614c1e416bf34` on
`codex/starcraft-pilot`, clean and upstream-equal after fetch. Remote main remains
`bac89b7ed92b088d270e0287c4893ff47d53d04e`. Original checkout and main worktree
are unchanged. Frozen data remains `99261754e0449bbaaa04e6890e1625b144f9ece1`;
the optional regression verifies all four recorded SHA256 values. Historical
`starcraft-pilot-baseline.md` is preserved as pre-repair evidence.

## SC-01 implementation

Force-owned direct add-error modifiers use existing conditional applicability.
Force/roster static resource queries now admit force owners, preserving traversal,
exact queried type, signed values (including ordinary -1) and uncertainty. A
separate authored-error finding enters aggregate validity/completeness and the
problem dialog exactly once per modifier and force. Messages are plain text.

Fictional regressions cover positive/zero/negative/repair, restoration, unknown
resource/condition/scope, malformed or unsupported operations/messages, queried
cost modifiers, groups/repeats, independent messages and inactive errors. The
hashed real Protoss negative-Core regression now expects invalid/complete and
exactly the authored Core message; removing the second Zealots repairs it.

Grouped error execution, other operations/owners/scopes and modified queried
cost totals remain withheld. No budgets, reinforcement, XML, reference metadata,
freshness or source data changes. Browser acceptance and SC-02 follow in this
explicitly authorized batch; this intermediate checkpoint is not full acceptance.

SC-01 gates: 737 passed / 31 optional skipped, 82 passed / 7 skipped files,
10.45s; lint/typecheck/build/whitespace pass. Configured corpus 28 passed in
4 files, no skips,34.63s (27 existing40k +1StarCraft); 40k HEAD verified
04c62fcd041b3808c39d5c46fd677c704027b979. Build819.81kB retains existing advisory.
Native independent review found an unknown nested-condition envelope omission;
lead added a recursive guard before active/inactive classification and new
adversarial tests. Reviewer approved the corrected candidate. Claude launcher
failed before review, so no external findings claimed.
