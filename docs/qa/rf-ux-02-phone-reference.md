# RF-UX-02 — Phone reference-table readability

## Boundary and baseline

Owner-authorized single UI checkpoint, 2026-09-11. Selected branch
`codex/list-builder-ui-overhaul`, clean/upstream-equal baseline
`9f372b26b8ebe1afdbe192b638fea4d3fb7f5dab`. “Fix catalog selection errors” was
idle with its latest turn completed before writes. Existing worktrees, preview
servers, owner tabs/storage and QA armies were not changed by test actions.
No main merge, PR, source update, engine or persistence changes.

Fresh Vite origin `http://127.0.0.1:5251/`; eight normal-file imports from clean
`E:/GitHub/wh40k-11e` at immutable
`04c62fcd041b3808c39d5c46fd677c704027b979` (A): Dark Angels, game system,
Space Marines, Imperial Knights Library, Agents, Titans, Heresy Legends and
Unaligned Forces. The browser file-transfer tool took approximately 881 seconds;
this is not an application-import benchmark. No completed audit was repeated.

Disposable `RF-UX-02 phone QA`: five Intercessors (Sergeant with Power fist,
three ordinary, one launcher), duplicated and enlarged to ten (1/8/1), plus
Hellblasters with separate Standard/Supercharge plasma profiles. Saved and
reopened normally: 87 selections, three army units, 14.0MB draft. This is a
reference-reading fixture, not a configured legal army; its setup/role/pistol
findings were not repaired or suppressed. Existing three orphan cost-type
warnings on the accepted full reference army remain a separate source
qualification; that army was not rebuilt or altered here.

## Current browser evidence

Retained screenshots and measurements:
`C:/CodexACLTest/rf-ux-02-evidence-20260911/`.
Before captures precede production edits: `before-390-opening.png`,
`before-390-weapons.png`, `before-390-ten.png`, `before-390-hellblaster.png`.
Matched after captures plus `after-390-modes.png`, `after-390-fist.png`,
`after-390-plasma.png`, six viewport images and `layout-matrix.json` are retained.
These are actual current Chromium in-app renders, not historical NR images.

| Lookup at 390×844 | Before | After |
| --- | --- | --- |
| Sergeant Save / OC | Sv starts x301, clipped at reading edge ~316; OC starts x463, offscreen | Sv3+ and OC2 visibly labelled in opening card; no sideways pan |
| Sergeant Power fist damage | D column starts x466, offscreen; vertical weapon scan plus local horizontal pan | Full Power fist name, `1× Intercessor Sergeant`, D2 in same card; vertical scan only |
| Launcher modes | Long names/bearers squeezed into 150px name column; damage offscreen | Full krak/frag names wrap above each stat grid, bearer1× retained; krakD3 vs frag1 visible without pan |
| Ten-model ownership | Same narrow columns, attribution wraps in name column | 1/8/1 labels survive, same profiles/values; attacks are not multiplied |
| Other unit/modes | Hellblaster profile tables likewise overflow | Standard/Supercharge remain distinct for Sergeant1× and ordinary4×; D1/D2, S7/S8 and AP-2/-3 unchanged |

Before local widths: Unit532 / Ranged556 / Melee556px of content in273px.
After390: each local region274px content/274px viewport. No hidden ordinary
values or horizontal searching. Stats are available on opening; Weapons and
Abilities each have one section jump followed by vertical reading. The change
trades taller rows for full-name/label association, not fewer scroll gestures
or a measured task-time speedup. Screenshots of deeper rows use locator
auto-scroll to frame the named row; no human swipe-count claim is made.

| Viewport | Local content/viewport (all three types) | Layout | Clipped data cells |
| --- | --- | --- | --- |
| 320×844 | 204/204 | Cards | 0 |
| 390×844 | 274/274 | Cards | 0 |
| 430×932 | 314/314 | Cards | 0 |
| 844×390 landscape | 728/728 | Cards | 0 |
| 768×1024 tablet | 652/652 | Cards | 0 |
| 1440×900 desktop | 1066/1066 | Native comparison table | 0 |

All six: page scrollWidth equals clientWidth; 14 statistical rows, 98 value
cells, 24 semantic column headers. RF-A05's16 profile groups include two prose
profiles and remain unchanged. Screenshots visually inspected for wrapping and
readability, not just text-existence assertions. Compact landscape needs
vertical scrolling below the title/navigation; no promise that all stats fit
the opening viewport.

## Generic rendering and interaction

The existing evaluated model, source/loadout/effective-value grouping and
`SelectionCharacteristicValue` remain unchanged. CSS reflows the same table;
no second reader, hidden duplicate controls, raw byte-bearing leaf props, new
catalogue indexes, or per-layout evaluation. One local presentation Set tracks
explicit table preferences. Long fields get space based only on text length;
all identities, labels, values and meaningful order remain intact.

Project-owned fictional test: Shields D6+2, Speed5–9, Armour `3+ (front only)`,
HP12, Supply `2 per active bearer`, long Emergency displacement label/text,
six versus two characteristics in Expedition telemetry, and one Band value
`A / B` in Signal. Unsupported increment retains D6+2 plus **Effective value
unresolved**, a profile-level qualifier and attention material. Missing fields
stay “Not provided” dashes; empty Keywords values stay blank. No invented zero,
abbreviation or numeric interpretation. Browser fixture and screenshots
`fictional-390*.png` demonstrate full-width prose and wrapping.

An explicit **Compare as table** action preserves one table and its control
identity, explains local scrolling, and becomes **Use profile cards**. In the
fictional390 case, content766px / region274px; focusing the region and pressing
Right moved scrollLeft0→40. Returning to cards removed horizontal overflow.
No automatic unfamiliar-type classifier was added. Existing routing still
puts type `Unit` in Stats, other non-Description types in Weapons & equipment;
that previously documented classification limit is not general game support.

Keyboard: Tab from Close reaches Stats with visible outline; Enter on Weapons
focuses its section. Normal390 heading bottom98.33 / target top122.71. Nested
Assault opens above the same card, Escape returns to the exact Assault button,
then Escape returns to the invoking roster View button. Existing layered
reference tests also cover deeper nesting, scroll retention and trap behavior.
Selection & source details mounts the exact occurrence tree only on disclosure.
Accessibility-tree inspection retains a single table/row/cell representation
with source column/row headers; decorative phone labels are aria-hidden.
No physical-device or screen-reader testing was performed.

Larger text: attempted Control-plus had no viewport/DPR/font effect in this
browser, so **no real browser zoom pass is claimed**. Temporary fixture-only
CSS doubled root text17→34px, then was removed. Ordinary390: title bottom231.67,
Stats top255.67; fictional long title bottom567.67, target591.67. No horizontal
overflow; values reflow into fewer columns. Measured title height replaces a
fixed jump offset (independent-review finding). Very long titles at200% occupy
substantial vertical space; full text is retained rather than clipped. Available
application appearance is light-only: no dark theme implementation/visual pass
is claimed, and no global theme was introduced. Print uses its separate
producer; no print layout changed or visual print acceptance claimed.

## Verification and independent review

- Final lint, typecheck, test, build and diff checks pass. Normal suite:
  **716 passed /30 skipped**, **80 passed /6 skipped files**,12.83s.
- Focused initial UI/model/timing run:24passed/4files. Independent isolated
  native run:5passed/3files. Existing renderer timing regression unchanged.
- Pinned A `unit-reference.integration.test.ts`: **2passed**,6.53s total;
  five/ten groups16, exact1/3/1→1/8/1, weapon modes, keyword/leader/Warlord
  reference checks retained. Fixed stale fixture setup to replace one of the
  four newly initialized ordinary models, not add three extra models. No
  creation semantics changed. Broader correctness corpus was not re-audited.
- Production JS815.99kB /gzip225.60kB, CSS82.82kB /gzip14.78kB; existing
  >500kB advisory remains. No before/after interaction speedup claimed.
- Isolated native reviewer examined source/tests and matched rendered evidence.
  No new grouping/value-loss or raw-byte-prop boundary found. Its measured-title
  recommendation was implemented and regression-tested (80→300px resize).
  Antigravity attempt was blocked before execution for private source/screenshot
  export authorization; no payload was sent and no provider/auth workaround used.

Only RF-UX-02 is completed. Broader UI, full cross-mode accessibility, profile
classification, StarCraft pilot and engine/source work remain outside this
checkpoint. Existing validity/completeness policy and orphan-cost qualification
remain authoritative.
