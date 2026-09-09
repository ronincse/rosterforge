# RF-A05 selected reference-card checkpoint — 2026-09-09

## Baseline and scope

Primary checkout was clean at `9c87d68779ed295b4ff8040e7cf90feb056e2d98`,
equal to `origin/codex/list-builder-ui-overhaul`. The bug-fix task was idle;
the audit task was not loaded. No other implementation writer was active.
No branch switch, main merge, PR, evaluator, persistence or archive work.

Pinned corpus: `04c62fcd041b3808c39d5c46fd677c704027b979`. Browser acquisition
processed the pinned repository's 46 files; the integration test uses the exact
eight-file Dark Angels closure, with a revision assertion. No third-party data
is committed. The isolated QA roster uses one Sergeant with Bolt Rifle, Bolt
pistol and Power fist; three ordinary Intercessors; one Intercessor with grenade
launcher. Configuration was left unset; the corresponding known roster problems
remain visible outside the reader and do not determine reference grouping.

## Current-baseline reproduction and final result

In-app Chromium viewport emulation, 390 × 844, root font 17 px. Coordinates are
viewport Y at opening, not historical audit coordinates. The modal client height
is 795 px. Before screenshot was captured inline in the task before production
edits; it shows the long, narrow abilities table ahead of all model stats.

| Measurement | Before at 9c87d68 | RF-A05 |
| --- | ---: | ---: |
| Modal scroll height | 10,527 px | 5,660 px |
| Comparison tables | 22 | 3 |
| First Unit type heading / model stats section | 1,289 px | 222 px |
| First weapon type heading / weapons section | 1,568 px | 548 px |
| Reading order | composition, keywords, abilities, rules, recursive models/equipment | stats, selected weapons, prose abilities/rules, keywords, optional exact details |
| Opening interaction wall time, one sample | 268 ms | 274 ms |

Basic stats previously needed approximately 0.6 screen of scrolling just to
reach the heading; weapons approximately one screen. Both now begin in the
opening viewport, with direct section jumps for later lookups. Phone tables
retain local horizontal scrolling to read all characteristics; ArrowRight on
the focused table region moved it 40 px. No page-wide overflow.

The 16 selected profile groups are 14 stat/weapon rows plus two full-width
abilities. There are 11 rule groups. Different Sergeant and grenade-launcher
loadouts remain attributed; krak and frag remain separate modes. Repeated
ordinary models share rows and rules. A larger squad (one Sergeant, eight
ordinary, one launcher) has the same 16 profile groups, 11 rule groups, three
tables and 5,660 px height; attribution changes to 8× Intercessor. Its opening
interaction sample was 272 ms. These browser timings include tool/input overhead
and are not an isolated React benchmark or evidence of a speed improvement.

The pinned integration projection sample was 6.13 ms for the five-model first
call, 0.98 ms warm, 3.02 ms for the ten-model call (runtime warm). These are
single local samples, not hardware-independent budgets. The reader inspects only
the viewed subtree; exact tree disclosure is lazy and contained 22 occurrences
when explicitly expanded for the five-model squad.

## Equivalence and retained evidence

Grouping requires exact source/link carriers, matching selected lineage/loadout,
complete static report values/names/visibility, and no modifier evidence.
Even equal-value writes and inactive modifier contexts are kept separate.
Unknown/incomplete reports never group across owners. Each member retains its
original owner and choice; cached owner reports and the unchanged recursive
secondary view retain full occurrence/provenance evidence. Information groups
remain scoped rather than flattened. Quantity is the selected occurrence's own
amount, never an ancestor multiplier or a multiplier for attacks.

Synthetic imported fixtures verify static repeats, distinct definitions with
identical names/values, distinct links to shared definitions, equal-value writes,
different effective values (9 versus 6) for owners sharing a profile, unresolved
profile/rule behavior, complete hidden-rule omission, unavailable parents with
resolved descendants, ten repetitions, and independent child equipment amounts.
Existing UI regressions verify effective naming/annotations, routed base values
and declarer labels, keyword popup context, and selected-only lazy details.

## Browser, accessibility and review

- 768 × 1024: 3,800 px card; all three tables fit within their 651 px containers.
- 1440 × 900: 3,271 px card; all tables fit within 1,066 px containers.
- 200% root-text simulation (temporary scoped CSS, removed before gates) at
  391 × 844: 34 px root / 29.75 px table values. Fixed a prose min-content
  overflow; final modal width/scrollWidth both 311 px, page both 376 px.
  Close remains visible and section links reflow. This is text-size simulation,
  not browser zoom or an operating-system accessibility setting.
- Keyboard: Tab to section links, Enter jump focuses target section, focused
  table horizontal scrolling, Shift+Tab from Close to source details, Enter
  expands/collapses lazy details, Tab loops to Close, Escape restores View.
- Existing nested keyword-dialog test preserves covered parent and focus return.
- Print remains a separate unchanged cost/selection model; ordinary print
  regressions pass. No new printed profile feature or physical print test.
- No actual iPhone/Safari, screen-reader or installed-PWA verification. Dark
  appearance/forced colors are not claimed for this bounded checkpoint.

Native independent reviewer `rf_a05_review` used isolated worktree
`C:\CodexACLTest\rf-a05-review-20260909` at the baseline. It reviewed implementation
and test source, found repeated subtree serialization, unavailable-parent
traversal loss and absent prose-inspection warnings; all were fixed and rechecked.
It found no remaining serious correctness concern. It did not independently run
tests or browser QA. Claude's already-recorded exhausted quota was not retried.

Local screenshots (not committed third-party content):
`C:\CodexACLTest\rf-a05-after-phone.png`, `rf-a05-after-desktop.png`,
`rf-a05-large-text.png`. The QA origin is `http://127.0.0.1:5201/`; existing owner
server 5199 was preserved. Temporary reviewer worktree is retained, clean.

## Verification and remaining limits

All normal gates pass: lint, typecheck, 623 passed / 23 skipped tests in
63 passed / five skipped files (646 total, 68 files), build and diff check.
Focused pinned reference/rule-applicability/capacity checks: three tests across
three files passed. The ordinary suite intentionally skips pinned corpus tests.
Build retains the existing >500 kB bundle warning (768.75 kB JS, 211.52 kB gzip).

Conservative grouping intentionally retains repeated static text across distinct
link carriers or loadout scopes, and keeps modifier-bearing or uncertain rows
separate. Nested information groups remain expanded in their existing hierarchy;
their readability is not generalized into new semantics. Very large mixed or
uncertain units can still be long. RF-A04 compatibility limitations and Impulsor
provisional pricing are unchanged. RF-A05 stops here; no later roadmap phase
was started.
