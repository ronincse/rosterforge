# RF-UX-01 compact uncertainty containment — 2026-09-10

Baseline: `adffb03a7a4ff3affae37ed8d19aa101c9bd0b99`, branch
`codex/list-builder-ui-overhaul`. This is checkpoint 0 of the authorized
correctness batch, not completion of pricing, Supporting, or full-army acceptance.

## Failing before, passing after

At an actual 390-pixel iframe viewport in the in-app Chromium browser, the
baseline provisional caption had computed `display: none`, width 0, height 0.
The header still showed `70 / 1,500` and one known violation. Two added assertions
failed before the change: missing compact-preservation class, and absent
provisional text when the independently evaluated limit was unresolved.

After repair, real browser screenshots and computed layout show the entire
`Provisional total` caption at both 390 and 320 pixels, with zero and one known
violation. Caption box: 74.15 by 12 CSS pixels, `display: block`. The same header
retains `70 / 1,500`, no remaining arithmetic, and a separate violation indicator.
At 320 pixels the roster identity truncates, but cost qualification does not.
This is viewport emulation, not physical-phone or Safari testing.

Used a temporary synthetic Carrier costing 70 with an unsupported condition,
a known 1,500 capacity, and a required Command category. Adding/removing the
synthetic Commander changes only the known-violation count. Imported through
the normal file picker; saved/reopened through the app. QA origin 5240 and its
own tab are separate from the owner's 5199/5216 previews, tabs and saved armies.
The iframe harness avoids changing a browser-wide viewport on the owner's tab.

## Boundary and validation

Only critical provisional captions escape compact routine-caption hiding.
Unknown capacity no longer masks spending uncertainty; where no per-currency
exactness witness exists, the incomplete cost report is conservatively provisional.
Known capacities and their stronger per-currency evidence are unchanged.
No evaluator or source-data changes, no new diagnostics, no general restyling.

Focused tests: 2 pass (both failed before). Full normal suite: 652 pass / 24 skip,
72 passed / five skipped files. Lint, typecheck, build and whitespace pass.
Existing large-bundle build advisory remains (795.24 kB main JS).
Optional pinned Dark Angels capacity integration: 1 pass, eight-file closure at
`04c62fcd041b3808c39d5c46fd677c704027b979`; no data pin change. No B-snapshot
pricing assertion is claimed by this presentation checkpoint.

Native isolated investigation is already informing the next counting checkpoint.
This atomic presentation change did not need a second overlapping writer.
Claude review was blocked before launch by the approval system; no private source
was sent and no retry/bypass was attempted.
