# SC-03/07 resource budgets — supported behavior and evidence

> Historical report: the source-zero/base-hidden activation uncertainty below was
> resolved for the evidenced static shape on 2026-09-25. See
> [counter activation](starcraft-counter-activation.md). Original observations and
> their limitations are retained; dynamic/unknown activation remains unsupported.

Baseline: 81a15e2cee6f7bc54544904d3492e5093fb98c50, pilot branch only.
StarCraft pin remains 99261754e0449bbaaa04e6890e1625b144f9ece1.

## Evidence recorded before implementation

The frozen GST declares Minerals (5bcf-897a-a5c9-d0e8) default 2000 and
Gas (1719-6214-392e-e53f) default 200. Seven other exact cost identities
have explicit zero defaults. Their names, leading whitespace and hidden flags
are presentation, not enforcement selectors. Signed composition is separately
checked by the accepted authored-error channel.

The New Recruit editor at 028526ee2bce36ce26f024e33d762ab9f257445b,
components/catalogue/right_panel/CostTypesPanel.vue, labels defaultCostLimit
as a numeric field and explicitly documents -1 = No limit. This evidence is
specific to budget metadata; it does not change signed costs or constraints.
Query.vue builds fields as limit:: followed by the exact cost ID and labels
them as resource limits. The frozen Deployment Maps selection modifiers use
scope=roster, childId=any, shared=true, false descendant flags, numeric
comparisons greaterThan 1000 or lessThan 1001. The supported leaf must read
configured limits rather than spending. Other enclosing behavior remains
independently qualified.

Existing projection treats the exact empty defaultCostLimit as no typed default,
retaining the raw attribute without a diagnostic. Missing declarations remain
absent. Malformed nonempty declarations retain a diagnostic and must never be
mistaken for absence or zero. Duplicate reachable identities are ambiguous.

At the initial evidence checkpoint, zero behavior was not established and the
targeted New Recruit installation was blocked by automatic approval review.
The owner subsequently authorized all New Recruit use; the observation below
supersedes that pending-approval state and establishes explicit player zero.

## Architecture decision

A pure effective-limit resolver reads immutable roster overrides and saved-source
context only. Conditions may consume this resolver. Cost evaluation consumes
conditions. Budget validation consumes evaluated costs through queryCostConstraint,
which isolates currencies and does not treat uncertain signed subtotals as lower
bounds. Limits never call costs, conditions, force constraints or validation.
Unsupported dynamic limit metadata must remain unresolved, including cycles.

Player choices live separately from source bytes, keyed by exact identity in the
roster catalogue context. Reset removes the override. Immutable commands retain
selection/force identities and flow through normal history and draft decoding;
no source bytes are copied on an edit. Overrides do not replace independent
force/category restrictions. No purchasing classification is inferred from names.

Independent native architectural review confirmed these seams and identified the
existing decoder as a mandatory change: it reconstructs fields and would otherwise
drop overrides from present and history snapshots. Claude could not launch
(access denied); no installation or billing work was attempted.

The implementation below preserves these evidence boundaries; no full-legality claim is made.

## Reference observation and supported interpretation (before implementation)

Owner explicitly approved New Recruit use and temporary data. New Recruit's
current StarCraft list reports catalogue revision13/GST12; this is observation
of a moving reference, not a verified immutable closure. Fresh creation offered
Minerals2000/Gas200. Daelaam plus Forge had Core3/Elite2 without maximum-zero
findings. Committed Gas10 produced a max10 error for total30; explicit Gas0
produced `Roster has 30 Gas too many (max 0)`; Gas-1 removed that error.
The control commits keyboard input, whereas direct fill did not persist.

Source zero and creation-hidden are confounded in those counters. Independent
review rejected generalizing either property alone. Supported defaults are
unambiguous positive finite, creation-visible declarations; default-1 is
unbounded per editor documentation. Zero source defaults and hidden-positive
activation remain unresolved, without invented maximum-zero errors. Explicit
player zero and -1 are supported irrespective of display visibility. This is a
precise compatibility boundary, not a claim that hidden resources are exempt.
Missing/empty defaults are absent. Reset returns to the saved source state,
including its uncertainty. Malformed or ambiguous identity cannot be repaired
by assigning an override to an arbitrarily selected source definition.

A fictional reference import was attempted to separate visibility from zero,
but the browser directory chooser did not provide a supported file-chooser event.
No broader reference installation investigation is part of this checkpoint.

## Implemented checks and browser acceptance

The unchanged four-file SHA256 manifest is verified by the configured corpus test.
Protoss seven Forges now yields exact Gas210 against default200: one budget
violation. Override210 clears it; reset restores it. Minerals remains independent.
The real dm00 Deployment Maps leaf observes 2000 -> 1000 -> 2000 and resolves
satisfied -> unsatisfied -> satisfied; no spent-cost substitution occurs.
Reinforced Marines remain six models/230, then180 after removal; SC-04 is unchanged.
Seven source-zero limits remain unresolved with no invented purchase violation.

Fresh origin http://127.0.0.1:5275, normal Browse/faction/load/create, all three:
- Protoss: Daelaam plus seven Forges, 210/200 finding and 210 override/repair;
  reset, undo/redo, save/reopen override and save/reopen reset all verified.
  At Minerals2000, map options include Acropolis; at1000, Abandoned Camp replaces
  that set. Reset restores the first set and retains the selected Abandoned Camp.
- Terran: Terran Armed Forces plus Marines160, Minerals100 override gives60 over;
  Gas remains200. Unrelated orphan cost metadata remains qualified. A new tab
  shows Recover roster for this unsaved army and restores the100 override,
  exact160 total and violation; recovered state saved normally.
- Zerg: Zerg Swarm plus twelve-model Zerglings180/Core2, default2000/200 then
  Minerals180 gives an exact satisfied cap; separate saved army. Other armies'
  overrides are not shared.

Actual desktop1440, phone390, and focused320 captures are in the local evidence
folder C:/Users/stone/.codex/visualizations/2026/09/12/01a09368-161b-7c60-a3c6-b0afa598b7de:
sc03-desktop.png, sc03-phone-390.png, sc03-controls-320.png,
sc03-problem-390.png. The phone problem dialog was inspected after its animation
settled; closing it returned focus to Open roster problems. Console warnings
and errors were empty at the end of acceptance.
At320 the content/scroll widths both305 (classic scrollbar), no horizontal
page overflow. Labelled inputs, wrapped buttons and visible keyboard focus checked.
Keyboard clear+Apply rejects an unfinished value rather than writing0; Enter commits
valid text. A real App UI regression verifies Apply/reset focus and undo/redo.
Browser automation fill-empty did not generate a React change; actual keyboard
clear was used to verify player behavior. The same tool caveat affected NR input.

Independent native review approved after three corrections: unknown source behavior
envelopes withheld; foreign cost reports incomplete even with inactive limits;
and resource-budget findings included in findingCounts. Claude's executable
could not launch (access denied); no agent installation or billing changes.

## Final validation

Normal suite: 818 passed, 31 optional skipped; 85 passed / 7 skipped files,
25.46 seconds. Configured frozen-corpus suite: 28 passed / 4 files, no skips,
52.22 seconds (27 existing 40k checks plus the expanded StarCraft acceptance).
40k HEAD remains 04c62fcd041b3808c39d5c46fd677c704027b979; correctness A/B
manifests and all four StarCraft hashes execute unchanged. Resource/style/
validation composition focus: 34 passed / 3 files, 1.13 seconds. Storage lane:
104 passed / 2 files, then included in the lead's full suite.

Final lint, typecheck, build and whitespace gates pass. After removing three
unsupported Testing Library type options, the real App UI test was rerun:
1 passed / 1 file, 3.82 seconds; final static/build gates followed. Earlier
Windows newline-sensitive style failures were corrected by restoring LF, then
the full suite passed. Build: 188 modules; JS 831.83 kB / gzip 230.28 kB,
CSS 83.38 kB / gzip 14.87 kB; the existing large-chunk advisory remains.
No repeat full 40k manual browser run, physical-device, screen-reader or
full-game acceptance is claimed. Exact published commit and CI are recorded
in the completion response/run history; the separate handoff names code commits.

## Remaining boundaries

Source-default zero and creation-hidden positive activation still need a controlled
reference observation separating those properties. They remain unresolved, including
all seven StarCraft counters; explicit player zero/-1 are supported. Unknown limit
expressions, cycles, unsupported query scopes/traversal/envelopes remain incomplete.
No full legality, unsupported mission/default-group semantics, reinforcement/XML/
profile-format/freshness repair, multiforce expansion, source update, main merge,
PR, deployment, or release. The nine40k category-owned force/cost requirements
remain separately tracked and unresolved. Existing original servers/armies/origins
are preserved; the new5275 server remains running for the owner.

Primary editor evidence:
[CostTypesPanel at recorded commit](https://github.com/giloushaker/nr-editor/blob/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/CostTypesPanel.vue),
[Query panel at recorded commit](https://github.com/giloushaker/nr-editor/blob/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Query.vue).
