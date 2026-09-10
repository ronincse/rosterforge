# Transparent-group numeric counting — 2026-09-10

Checkpoint 1, baseline semantic code `adffb03`; parent checkpoint `f835fbd`
contains only compact-status presentation. No source IDs/prices hard-coded in
production. Local import coverage is distinct from remote repository metadata.

## Reproduction and repair

Selected models retained their concrete definition but omitted their authored
transparent group. Numeric queries reused ordinary identity and returned complete
zero. Count membership now resolves the actual parent frontier, stops at concrete
entries, includes nested/link/shared groups, and validates persisted wrappers.
Neither wrappers nor nested equipment are additional carriers. Missing placement
is unresolved, not zero. Group-valued scopes remain expressly unsupported.

The original baseline independently fails both frozen integration cases at the
first five-model state: observed 0, complete, unsatisfied. Candidate passes both.
Six synthetic tests cover mixed 1/3/1 composition, 5/6/10/5 thresholds, amounts
versus occurrences, equipment/siblings/other forces, nested and explicit wrappers,
linked/shared identities, ambiguous paths, missing placement, dangling group links,
repeats, empty groups and unchanged identity comparisons.

| Immutable data | Models (sergeant/ordinary/launcher) | Authored base | Adjustment | Result |
| --- | --- | --- | --- | --- |
| A and B | 1/3/1 | 80 | count 5, SET150 inactive | 80 |
| A and B | 1/4/1 | 80 | count 6, SET150 active | 150 |
| A and B | 1/8/1 | 80 | count 10, SET150 active | 150 |
| A and B | return 1/3/1 | 80 | count 5, SET150 inactive | 80 |

A: `04c62fcd041b3808c39d5c46fd677c704027b979`.
B: captured `5b261ec423d5d017bb733c4f3c0a760b085d5ca5`, not a moving latest.
Each eight-file closure is verified by manifest revision, byte length, SHA256,
Git blob SHA1 and complete catalogue/game-system dependency IDs. API fixture
includes Power fist sergeant; values assert the specific authored adjustment's
condition evidence and complete numeric modifier sequence.

## Corpus and neighboring consumers

Isolated review measured all 46 documents at A: 340 numeric group-target leaves,
27 documents, 109 target IDs; 317 definition/23 group-link targets, all shared.
292 include child selections, 48 false/absent. Consumers: 205 cost, 48 constraint,
43 hidden, 19 error, 19 association eligibility, 3 category, 1 name and 2 modifier
group gates. 31 repeat queries: 22 cost and 9 constraint. Existing 3,269 direct
group constraints (3,268 selection /1 cost) use their separate bound machinery;
this does not rewrite those aggregators. Ten group-valued condition scopes now
withhold instead of silently yielding zero. Thirteen group-target identity
predicates are not broadened.

## Review, browser and checks

The native reviewer independently reproduced a misplaced persisted-wrapper leak
and dangling group-link false zero in the first candidate; both fixes and
regressions were accepted. An occurrence index avoids a new O(n²) candidate scan.
Reviewer final verification: baseline two integration failures; candidate nine
passing checks including its two independently retained edge regressions.
Claude was approval-blocked before execution; no source sent.

Actual browser at isolated origin 5240: normal import of A closure, create
temporary `QA frozen A correctness`, add Intercessor Squad, use plus/minus to
build 1/3/1, 1/4/1, 1/8/1, then return 1/3/1. Visible unit prices 80/150/150/80;
save through the normal menu. No renderer crash. Browser sergeant retained its
default close-combat weapon; Power fist is covered by production API tests.
This is not a complete army journey: required setup/Warlord and source-init/local
metadata warnings remain, and no claim of full legality or Supporting support is
made. User previews/tabs/saved armies were not operated.

Lint/typecheck/build/whitespace pass. Normal suite 658 pass /26 skip across
73 passed /6 skipped files (684 tests). Existing five pinned integration suites:
24 pass, 29.62 seconds. Two new immutable-snapshot tests pass. Existing build
large-bundle advisory remains, main JS 798.10 kB.

Next authorized checkpoints: local-condition-group repeated-unit pricing,
required Supporting with effects, then dense army replay and per-unit ledger.
