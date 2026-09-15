# Typed-constraint uncertainty follow-up (checkpoint A)

Confirmed and repaired on codex/starcraft-pilot from clean/upstream-equal
`dcf348093d2b519693ed3a75b98fc49de5d6fa2c`, fetched September 14, 2026.
No existing army is claimed to have been falsely accepted.

## Reproduction and boundary

The SC-04 finding reproduced through the current constraint inspector using a
small fictional parsed catalogue and durable roster. Initial corrected expectations
failed in 10 cases while 16 known controls passed. For unit, model, model-or-unit
and upgrade, a missing or mixed-type ambiguous intermediate definition made the
scope resolver report unknown. The inspector dropped candidates but retained
canCollect as permission to observe: bounds 0..0, observed 0, complete, and a
satisfied maximum (or violated minimum). ID-valued containing scopes shared the
same boundary. An unsupported scope also exposed a synthetic observed zero.

The owning constraint boundary now separates permission to collect from knowledge
of the scope. A known absent matching ancestor remains an exact empty set. A known
container with no matching target also remains exact zero. Unknown context receives
EVALUATION_CONSTRAINT_SCOPE_UNRESOLVED, incomplete, range 0..Infinity, no observed
value and unresolved finite-bound status. An authored -1 unbounded sentinel remains
satisfied but incomplete with no count, since absence of a limit is independent
of knowing the count. Existing uncertain candidate bounds retain their behavior.

Constraint callers require known selection-entry types before skipping a location:
missing/unrecognized type, missing definition or conflicting type candidates
cannot be bypassed to find a farther ancestor. Ambiguous candidates agreeing on a
known type can still establish the anchor. Groups remain known non-typed nodes.
This is an opt-in constraint policy; existing condition/repeat behavior is unchanged.
Malformed boolean traversal flags and unknown child envelopes use the existing
unsupported-attributes diagnostic for selection-count constraints as for costs.

Typed constraint traversal still includes the container and only includes its
descendants when explicitly requested. It does not acquire SC-04 numeric unit
condition child-collection semantics. ID traversal, identity matching, forces,
selection amounts and unrelated constraint families are unchanged. No generalized
typed query support or nine-category-owned-40k-requirement repair is implied.

## Verification

36 fictional regressions cover all four typed scopes, min/max, known present,
known empty, absent ancestor, missing and ambiguous definition, missing/unknown
type, agreeing ambiguity, ID-context uncertainty, unsupported envelopes and scopes,
unbounded sentinel and real constraint-report aggregation alongside a known violation.
The aggregate remains invalid/incomplete with one violation and one unresolved item.
Focused existing constraints/validation plus initial 35 new tests: 68 passed/3 files;
final new suite: 36 passed/1 file. Normal gates: lint, typecheck, build and whitespace
passed; 871 passed /31 optional skipped, 87 passed /7 skipped files, 12.02 seconds.
Configured corpus: 28 passed /4 files, no skips, 33.61 seconds (27 existing 40k plus
StarCraft). StarCraft four original hashes and 40k A/B manifests verified by tests;
40k checkout HEAD remains 04c62fcd041b3808c39d5c46fd677c704027b979. Reinforcement,
pricing, Supporting, initialization, budgets, persistence/recovery, reference grouping
and timing regressions retained. Build JS833.52kB; existing chunk advisory only.

Independent native reviewer approved the candidate in an isolated detached worktree.
Claude launcher was already unavailable this session; not retried, no external
review claimed. Reviewer recommendations shaped count/observed/completeness handling,
strict constraint-only type evidence, sentinel protection and comment correction.

Existing worktrees, tabs, armies and servers remain untouched. Main and source pins
unchanged. Separate implementation and handoff commits publish only to the pilot.
Checkpoint B (SC-05 XML values) is the only authorized next implementation.
