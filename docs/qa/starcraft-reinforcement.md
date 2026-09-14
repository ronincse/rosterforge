# SC-04: reinforcement condition and reconciliation acceptance

Result: **fixed for the evidenced numeric unit-selection shape**. This does not
establish complete StarCraft support. Baseline92c4c1408919fb05b052025c5bb2e12b59dc03be,
clean and upstream-equal after fetch; only codex/starcraft-pilot was changed.
Mainbac89b7 and the old UI branch69b2095 were preserved. No competing active
Codex writer was observed. The prior budget boundaries remain accepted and open
where documented. The SC-03/07 server5275 and earlier origins remain available.

## Evidence and scope decision

The original failure is retained in starcraft-pilot-baseline.md: Marines with
Shield and Reinforce had one amounted Marine occurrence of6 and230 Minerals.
The unchanged current baseline regression reproduced it. Corrected expectations
failed before production changes: expected9, received6. After fixing a test syntax
error, the fictional suite also exposed the count/quantity/container failures
(8 failed,1 passed); the malformed-flag case identified a missing refusal guard.

Four frozen files match every SHA256 in the original manifest, unchanged source
commit99261754e0449bbaaa04e6890e1625b144f9ece1. GST500146bytes/revision12,
Terran112172bytes/revision13, Protoss92542bytes/revision13, Zerg134299bytes/revision13.
Catalogue-declared GST revision13 remains a source qualification. Exact Marine
IDs are unchanged: unit46b6-0bfa-70ea-ba86, model535b-1f2b-6421-d932,
Reinforce6beb-c060-9e77-4256, Shield2da2-c22c-c732-951c. They appear in evidence
and tests only, never production decisions.

Marine bounds have automatic=true, parent/shared selection min6/max6, explicit
includeChildSelections=false. Two set modifiers raise those bounds to9 when
numeric unit/shared selections of Reinforce are atLeast1. The same omitted-flag
condition changes Shield Minerals20 to30. Reinforce itself is50 Minerals/Core-1;
unit base160/Core-1. No independent model step or reinforcement-specific amount
rule was invented. Selection groups project into direct durable child occurrences;
visual/source nesting alone does not define the candidate set.

A targeted New Recruit army using its already installed StarCraft data showed:
160/6 base,180/6 with Shield,240/9 with Reinforce, then180/6 after removing it.
The Shield control changed20->30->20, the model stepper6->9->6, and total Core
with Terran Armed Forces changed2->1->2. This was performed through ordinary
controls on a disposable army under the owner's standing authorization. Its
My Games surface said last update7days ago. An exact installed source closure,
Terran catalogue revision and runtime build were not independently captured;
matching costs/quantities are behavioral evidence, not immutable data parity.
The earlier budget observation of catalogue13/GST12 is not substituted for an
SC-04 installed-data hash. No fictional matched-data true/false NR comparison
was performed: the earlier directory-chooser limitation remained, and provider
or import setup was not repeated.

The pinned public editor Query.vue at028526ee2bce36ce26f024e33d762ab9f257445b
exposes Type: Unit separately from the child-selection traversal checkbox,
labelled And all child Selections. It does not set all omitted flags true.
Its modern include-self suffix UI also shows why ancestor/self behavior must
not be generalized from one StarCraft case. The existing nearest ancestor-or-self
resolver is retained, including uncertainty for unresolved occurrence definitions;
no new unit-self scope syntax or prospective nested-unit interpretation is added.

**Supported decision:** numeric field=selections, scope=unit queries use the
resolved containing unit's child collection. Omitted/false means direct children;
true widens to descendants, excluding the unit container itself. Normal exact
identity, shared definition/link-local identity, amount counting, and the actual
nearest containing occurrence still govern matches. Sibling units and forces
remain separate; an explicitly recursive query may reach nested descendants
within its own unit. A query declared inside a nested unit anchors there.
The observed NR sequence proves the omitted direct-sibling path. Explicit
false/true behavior is the bounded child-collection interpretation supported by
editor controls, source population and fictional tests, not separately observed
NR parity. A genuinely absent matching ancestor retains existing empty-scope
behavior; an unresolved nearest-unit location does not become a complete zero.

The focused survey found16 StarCraft numeric unit conditions, all omitted/shared
true:10Terran,6Zerg, none in GST/Protoss. Across46 pinned40k JSON documents:
180 numeric unit selection conditions (167true,9omitted,4false),2 unit identity
conditions,1 unit cost-field condition,69 unit selection constraints (68true,
1false), and7 numeric unit repeats (alltrue). Omitted examples include model
counts in Aeldari and Space/Dark Angels; false examples include Chaos Space
Marines choice gates. This was a survey of the affected primitive, not a new
whole-format audit. Pinned40k HEAD04c62fcd041b3808c39d5c46fd677c704027b979 and
correctness snapshot manifests remain unchanged.

## Repair and lifecycle

selection-context.ts supplies a shared child-collection helper, also reused by
existing ID-valued scope traversal without changing it. conditions.ts selects
that helper only for numeric unit selection counts. Both model-bound and Shield
price modifiers consume this same leaf. Identity predicates, direct cost-field
queries, typed constraints and model/model-or-unit/upgrade scope traversal retain
their previous semantics. There is no second price calculator or reconciliation
path. Numeric unit repeats adapt through this same leaf; their adapter now retains
raw boolean and child-envelope evidence so it cannot erase unsupported behavior.
Missing/ambiguous target IDs, malformed boolean flags and unknown child elements
remain incomplete, before active/inactive decisions.

Existing automatic reconciliation changes the same amounted Marine occurrence
6->9->6, preserving its ID and the selected Shield ID. Effective bounds are
6/6->9/9->6/6. The actual source condition observes0/1/0, with complete
unsatisfied/satisfied/unsatisfied applicability. Initial root addition still emits
EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED from the conservative
initialization stage; reinforcement command diagnostics are empty. The ordinary
post-edit reconciler produces the correct final state; no warning suppression or
separate initializer was added. Reconciliation retains its ten-pass bound and
existing command failure policy. A rejected duplicate-ID command leaves the input
roster untouched. No new destructive trimming rule was introduced: the measured
Marine representation is one unconfigured model occurrence whose amount changes.
Existing later nonautomatic-model removal/refill policy remains unchanged.

| State | Unit base | Reinforce | Shield | Minerals | Models | Unit Core |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Base |160|0|0|160|6|-1|
| Shield |160|0|20|180|6|-1|
| Shield + Reinforce |160|50|30|240|9|-2|
| Remove Reinforce |160|0|20|180|6|-1|
| Reinforce first |160|50|0|210|9|-2|
| Then Shield |160|50|30|240|9|-2|

Pinned tests inspect individual contributions, model occurrence amount/identity,
effective min/max and condition observations. Independent neighboring squads,
duplication, subsequent edits, coherent history and repeated reevaluation pass.
Draft decoding preserves both present and history, then a newly composed library
from saved source bytes restores exact roster state/pricing/budget. Five repeated
cost/validation inspections do not rewrite the tree or increment costs/models.
A fictional17Ore threshold is crossed12->18, and a disposable player limit is
used in browser QA; permanent StarCraft defaults are unchanged. Relevant missing
cost metadata still propagates, while exact Minerals remains usable.

## Browser acceptance

Fresh origin http://127.0.0.1:5277, normal pinned Browse -> Terran -> load -> create,
Terran Armed Forces selected. Marines passed both upgrade orders and removal.
One reinforced squad plus a fresh squad showed9/240 and6/160. Duplication retained
9/240; independently editing original and copy demonstrated no shared mutable
state. Final three squads are9/240 Shield+Reinforce,6/180 Shield,6/160 base.
Undo restored9/240 and both choices in one action; redo returned6/180 with Shield.
The enabled Remove one Marine control snaps back to9 under the automatic bound;
Add one remains disabled. This is source-authorized clamping, not ordinary
40k manual refilling.

Set a disposable575Minerals limit: exact580 produces5over; signed Core-1 produces
its separate accepted authored requirement. A fresh same-origin tab offered
Recover roster, restored all three squad states and575 limit, then saved normally.
The original test tab was closed only after recovery verification to avoid two
writers. Change roster setup -> saved shelf Open restored identical9/6/6,
240/180/160,580/575 and selected equipment. Twelve durable selected occurrences
are saved. This is new-tab recovery, not a claimed reload past an unsaved guard.

Additional shape smoke: Marauders base2/150, Kinetic Foam2/170, Reinforce4/320,
remove Reinforce2/170. Source components are150base+130Reinforce+40Foam when
reinforced, restoring20Foam; same unit-scoped sibling mechanism. Temporary
Marauders removed afterwards, leaving the three saved Marine squads unchanged.

Desktop1440x900 and phone390x844 screenshots inspected. Reinforce pressed state,
9-model count, disabled plus, selected Shield, independent squads and budget/supply
findings are readable. Keyboard focus visible; phone client/scroll widths375/375,
no page horizontal overflow. Problem dialog lists budget and Core separately;
Close returns focus to its trigger. Console warning/error capture empty. Viewport
reset and5277 left running. Evidence in the local visualization folder:
sc04-desktop.png, sc04-phone.png, sc04-problems-phone.png, sc04-api-ledger.json.

Reference inspection retains inherited limitations: Marine stats/C-14/Strike are
attributed to1xMarines container, not a multiplied9-model profile; weapons still
contain literal entity text and rules remain in the old classification. The roster
composition/quantity surface shows9. Shield option chip explicitly shows20Minerals
base, while its evaluated contribution is30. No SC05/06 presentation repair or
claim of full reference fidelity. No physical-device, screen-reader or full-game
acceptance was performed.

## Review, gates and remaining boundaries

Lead implemented and integrated. Native reviewer worked in an isolated detached
worktree; Claude's previously unavailable launcher was not repeatedly retried.
Reviewer approved the bounded design and final corrected candidate. Review found
unknown child-envelope execution and repeat adaptation evidence loss; both were
fixed with present/absent trigger, malformed repeat and ambiguous-target cases.
No external provider approval is claimed. Seventeen fictional tests cover depth,
exact/shared/link-local identity, repeated units/forces, nested anchor, failure
immutability, automatic versus manual quantities, pricing, budgets, history,
missing/ambiguous context/targets and unsupported source. Focused17pass1file1.11s.

Final normal suite835passed31optionalSkipped,86passed7skippedfiles,11.99s.
Configured StarCraft/40k28passed4files/no skips28.73s; the final added condition/
diagnostic ledger also passed1file1test1.18s. Lint/typecheck/build/diff pass.
Build188modules,JS833.17kB/gzip230.54,CSS83.38kB/gzip14.87; existing chunk advisory.
40k five/ten/five/repeated pricing, Supporting/connected, structural/category/force,
conditional initialization/no arbitrary refill, Battle Size/budgets/source
qualifications, renderer timing, reference grouping, phone and persistence tests
remain green. No repeat broad manual40k browser acceptance is claimed.

SC04 is fixed for this evidenced shape. Seven source-zero/hidden-default counters,
dynamic limits, Terran orphan types and GST revision mismatch remain qualified.
SC05/06/08 remain open. An inherited typed-constraint uncertainty hole was found
in review: unresolved typed container can fall through as observed0; this numeric
condition repair does not change that constraint execution. It is recorded as a
separate roadmap follow-up, alongside the existing nine40k category-owned bounds.
Prospective nested-unit scope and generalized typed-constraint/cost semantics are
not established by this checkpoint. No source changes, main merge, PR, deployment
or automatic next phase. Final commit and exact CI are recorded in the handoff
and completion response/run history.

Primary editor evidence: [Query controls at recorded commit](https://github.com/giloushaker/nr-editor/blob/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Query.vue).
