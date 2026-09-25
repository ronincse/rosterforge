# StarCraft pre-game requirements and mission visibility

Baseline: `53d3e5f36f1dc0e4471e77fa3a395cfbcfe92a87`, clean and upstream-equal;
print/UI task idle. This follow-up preserves the historical failed acceptance
report and unchanged StarCraft/40k pins. Complete-army acceptance remains blocked.

## A — shared group requirements

The current-code fictional reproduction failed five assertions: shared roster
requirements appeared complete with minimum0, maximumInfinity and remaining0;
unsupported nonshared/traversal variants also appeared complete. Frozen source
inspection reproduced the same omission for Deployment Maps (`2ce1-a1c6-f9fd-44e7`)
and Mission Card (`0b67-92aa-2c8c-613f`). Projection and materialization retained
the bounds. `selectionBounds` filtered non-parent constraints before diagnosis;
transparent groups were absent from durable occurrences, so general validation
could not recover them. Local planning's limitation became false optionality.

The evidenced bounds are static shared roster min/max2 with child-selection
inclusion. Count member amounts across matching group instances, not wrappers,
parent amounts, names or descendants belonging to a concrete member. Existing
source-path membership resolves inline/linked groups and retained wrappers.
[BattleScribe developer explanation](https://github.com/BSData/wh40k-7th-edition/issues/2880)
establishes shared aggregation across parent instances. The
[pinned editor](https://raw.githubusercontent.com/giloushaker/nr-editor/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Query.vue)
warns of nonshared differences; this checkpoint does not generalize that domain.

Configuration and structural validation consume shared constraint results. Counts
span the army while removal controls remain local. Zero/one violate, two satisfy,
and synthetic production-API excess violates. Duplicate shared requirements are
coalesced with source identity, including retained-wrapper general reports.
No arbitrary defaults are selected. Unsupported scopes, sharing, mixed domains,
modifiers and multiple forces remain incomplete; missing group links qualify the
owner. Existing local creation defaults remain intact.

Independent native review found two false-complete risks (context-dependent own
limits coalesced across wrappers; distant ancestor modifiers omitted). Both were
repaired by limiting new execution to static bounds and checking selected ancestry.
Reviewer rerun:32 tests across2 files passed. Primary focused regressions:16 pass;
configured complete suite:1122 pass, zero skips,108 files,41.41s. Lint/typecheck,
build and whitespace gates are recorded in the final handoff. The 40k Guardian
Defenders test now expects nine explicit previously dropped self-scope diagnostics;
its33 initialized additions/41 occurrences and exact defaults remain unchanged.

## B and combined acceptance

Mission visibility implementation, browser evidence, final gates and publication
are recorded below when the second independently reviewable checkpoint completes.
