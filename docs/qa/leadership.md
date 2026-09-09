# Leadership and mandatory Warlord checkpoint

Baseline: `9b7354787f58b50f157b0d461c24674e7e53abc2`, branch
`codex/list-builder-ui-overhaul`. Corpus: all 46 JSON files at
`04c62fcd041b3808c39d5c46fd677c704027b979`. No third-party data committed.

## Source evidence and decisions

[New Recruit association documentation](https://github.com/giloushaker/nr-docs/blob/4b93391d049b42f480851af125639cf1ce9d13a3/guide/concepts/associations.md)
describes separate selected occurrences connected by associations.
[Query editor](https://github.com/giloushaker/nr-editor/blob/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/Query.vue)
labels `queryFromSelf` as evaluating from self instead of target.
The implementation uses structured source filters, not Leader prose parsing,
display-name matching, physical reparenting or copied equipment.

The full raw-tree scan found 448 direct associations in 31 documents plus one
shared definition, five links, 398 `action=group` definitions, 349 named Leading,
494 association-field constraints, 341 association-field conditions and 91
association-traversing `affects` values. Historical one-constraint claims describe
a narrower inspection and cannot be reused as current whole-corpus coverage.

Slaughterbound `71c9-b10b-b55f-483e`, association `4e70-b32e-d8c6-b5fe`, targets
Eightbound category `aa38-6b43-3c3e-3ed9` or Exalted Eightbound
`b8d9-6a4b-fd6b-e82d`, with additional source-conditioned alternatives. Eightbound
incoming max-one constraint `d348-09b7-da20-3df6` counts Leader category
`1556-9b56-fba6-4370`; Slaughterbound has no direct Leader category. That runtime
classification remains unverified, so incoming capacity/effects are explicitly
deferred rather than guessing that the name Leading defines category membership.

Warlord category `5c0e-4c31-d51b-e470` owns roster min/max-one selection bounds
`16ac-a6c9-6d9a-d6d5` / `3d50-6d29-4f91-8f73`. The old inspector only walked
force-category links, omitting these definition-owned bounds. The fix inspects
those real definitions once, counts nested upgrades, and keeps source provenance.
No Angron/Warlord identifiers are hardcoded in production.

## Verification

Normal gates: lint, typecheck, test, build, diff check. Suite: 640 passed,
24 optional skipped, 71 passed/five skipped files. Optional pinned command:
`ROSTERFORGE_BSDATA_JSON_DIR=E:/GitHub/wh40k-11e pnpm test apps/web/src/unit-reference.integration.test.ts`
passed both tests, including Angron + Slaughterbound Warlord count 2/1 and exact
Slaughterbound → Eightbound assignment, duplicate identity and endpoint cleanup.

Synthetic tests cover source preservation/materialization, source-vs-target
filters, model exclusion, unknown/malformed flags and children, empty groups,
structural edge mutations, draft roundtrip/rejection, category-owned counts,
child-force exclusion, visible duplicate-Warlord errors and undoable assignment.

Browser UI on isolated origin 5207 loaded World Eaters from the pinned index,
created Leadership QA, added Angron and Slaughterbound, and selected the second
Warlord. Problems showed "Warlord: 1 selection over the maximum", "2 selected,
limit 1"; both unit rows gained attention markers. Review resolved to the mounted
owning unit row, not the hidden designation upgrade. Adding Eightbound exposed it
under Slaughterbound's Leading card. Assignment survived Save draft → Change
roster setup → Open. Desktop and 390×844 attach/detach controls were exercised;
the phone attachment section had equal 271 px client/scroll widths. No browser
warnings/errors. Viewport reset after QA. Screenshot evidence outside the repo:
`C:/CodexACLTest/rf-leadership-phone.png` and `rf-leadership-desktop.png`.

This is Chromium viewport QA, not physical iPhone/Safari or a fresh interactive
New Recruit comparison. Owner screenshots and pinned primary sources establish
the requested comparison. Incoming leader limits, attached effects, shared-link
selection, general association parity and printing attachment relationships are
not claimed complete. User-origin saved rosters were not touched.
