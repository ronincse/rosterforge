# RosterForge UI Design Language

This document keeps the web interface coherent while RosterForge moves from a
catalogue-centred page to a list builder. It adapts current Apple Human
Interface Guidelines to an accessible responsive web application; it does not
copy Apple assets, platform chrome, another roster builder's visual design, or
native-only behavior that the web cannot honestly provide.

`docs/product-vision.md` remains the product authority. This document owns the
shared presentation rules used to express that vision. `docs/architecture.md`
continues to own component and package boundaries.

## Information architecture

RosterForge has two primary screens:

1. **Lists** — saved rosters and the path to create one. Catalogue import and
   repository acquisition are supporting actions, not the page hierarchy.
2. **Roster** — the open army is the full-window primary object. Adding,
   configuring, validating, saving, printing, and reading the roster remain in
   this context.

The browser title names the current content (`Lists` or the roster name), never
the application. An open roster must not mount the Lists hero, import controls,
repository browser, draft shelf, site header, or footer. Returning to Lists
restores those surfaces and any pending recovery or acquisition state.

The large-screen editing layout is roster list plus the selected unit's
inspector. Compact layouts present the inspector and Add unit flow as sheets.
The catalogue is never a permanent peer column, and the application never shows
list, catalogue, and inspector as three simultaneous panes.

## Design principles

- **Content first.** Essential roster information receives the most space;
  acquisition, developer evidence, and uncommon actions move behind explicit
  secondary affordances.
- **Grouped hierarchy.** Battlefield roles and settings use inset grouped
  lists. Spacing, background, and inset hairline separators establish
  relationships without ornamental frames.
- **One interaction vocabulary.** A chevron opens the next level; an
  information-page symbol opens read-only detail; a checkmark communicates a
  selected picker row; a switch controls a binary role such as Warlord; a
  stepper changes bounded quantity.
- **Progressive disclosure.** The first roster view shows selected units and
  selected loadout summaries. Options, datasheets, diagnostics, and source
  evidence appear only when requested or when a problem needs attention.
- **Semantic styling.** Color indicates action, selection, status, or danger
  consistently and never carries meaning alone.
- **Stable adaptation.** Preserve the full layout until it no longer fits, then
  move secondary panes into sheets. Resizing must not unexpectedly reset a
  player's selection or reopen a surface they dismissed.

## Overhaul audit and delivery sequence

The 2026-08-28 audit used the pinned Aeldari catalogue in the running branch at
390 x 844, 768 x 1024, and 1440 x 1000. The page stayed within each viewport,
and the dedicated roster shell, role grouping, compact unit rows, focused
options surface, and modal reference cards were sound structural foundations.
The visual and interaction system was not yet coherent: Configuration consumed
several screens before the army, the permanent catalogue competed with the
roster, document actions were fragmented, and the legacy parchment/pink palette,
condensed uppercase type, small controls, borders, and deep technical detail
still read as a catalogue debugger rather than an installed list builder. The
Lists surface remains a separate legacy experience, and the application has no
manifest, application icons, service-worker boundary, dark theme, or
increased-contrast theme yet.

A fresh review of the current Layout, Lists and tables, Toolbars, Search fields,
Sheets, Materials, and Accessibility guidance confirms this document's intended
direction, with three constraints made explicit:

- translucent material is a restrained navigation/transient-control layer, not
  the content background;
- a sheet is one bounded task with one clear dismissal and retained context,
  never another persistent application column; and
- scalable text, contrast, color-independent state, and safe-area adaptation
  are acceptance criteria rather than a final polish pass.

The prose below describes the target system, not the current implementation.
Deliver it through independently reviewable checkpoints in this order:

| Checkpoint | State | Acceptance boundary |
| --- | --- | --- |
| Roster information architecture | Done | Dedicated roster screen, grouped compact rows, focused options, and modal problems/reference cards |
| Add unit | Done | Closed-by-default grouped search sheet; compact full-screen and search-first, regular centred and Close-first; focus containment/return; close and focus the new row after a successful army add |
| Configuration | Next | Replace the long default-open setup tree with one settings-style summary row while preserving every choice, check, capacity, and Developer detail |
| Active-roster system | Open | Apply shared semantic tokens and reusable navigation, grouped-row, sheet, inspector, picker, switch, stepper, status, and More-menu primitives; remove the legacy visual vocabulary from this screen |
| Lists and creation | Open | Bring saved rosters, creation, source acquisition, recovery, and empty/error states into the same hierarchy and component system without turning import evidence into primary content |
| Reading and document workflows | Open | Reconcile unit datasheets, checks, save/duplicate/print actions, and print hierarchy with the final navigation and disclosure model |
| Installed web app | Open | Add an owned manifest, icons, theme metadata, safe-area behavior, service-worker/update strategy, and an honest offline boundary for already-local data |
| Cross-mode acceptance | Open | Re-run the reference army at phone portrait/landscape, tablet, desktop, and ultrawide; verify 200% reflow, dark appearance, increased contrast, reduced motion, keyboard-only use, screen-reader structure, and print |

Do not combine checkpoints merely to make the page look finished. Each one must
leave the roster fully usable, preserve imported-data and validation honesty,
and pass its own real-browser path before the next visual layer depends on it.

## Shared tokens

The implementation uses semantic custom properties so every component consumes
one system. These initial light values are web equivalents of grouped-system
surfaces; dark and increased-contrast variants must keep the same meanings.

```css
--font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Segoe UI", "Helvetica Neue", sans-serif;
--bg: #f2f2f7;
--bg-elevated: #ffffff;
--label: #000000;
--secondary: rgba(60, 60, 67, 0.6);
--separator: rgba(60, 60, 67, 0.12);
--fill: rgba(120, 120, 128, 0.16);
--tint: #1c6b4a;
--danger: #ff3b30;
--radius: 10px;
--row: 44px;
--pad: 16px;
```

Typography uses the system stack and a small hierarchy: large title 34/700,
headline 17/600, body/control 17/400, subhead 15/400, and footnote/section label
13/600. Use regular through bold weights; never thin text. Size in relative
units where possible and verify that 200% browser text zoom does not clip
content or controls.

Spacing follows an 8-point rhythm: 8, 16, 24, and 32 px, with 20 px only where
the type hierarchy needs its established intermediate gap. Interactive rows and
targets are at least 44 by 44 CSS pixels on touch layouts. Borders are one-pixel
separators. Content groups use a 10 px radius; primary buttons may use 12 px.

## Navigation and actions

An open roster uses one persistent navigation/toolbar layer:

- leading: standard back chevron plus `Lists`;
- title: roster name, with the points summary as its subtitle;
- trailing: one prominent Add unit action and one More menu;
- More: Save, Duplicate, Print, and other uncommon document actions.

Navigation may use restrained translucency and blur so content can scroll below
it, but glass-like material belongs only to navigation and transient controls.
Roster rows and content groups stay on opaque standard surfaces. Do not title a
window `RosterForge`, put destructive actions in the primary position, or keep
parallel text-button rows for commands already in the toolbar/menu.

## Lists, rows, and controls

Each battlefield role is one elevated grouped list with 16 px page margins. A
unit row has a minimum 44 px target, 16 px horizontal padding, one inset
separator, and no ornamental outer stroke or accent border. Its first line is
the unit name plus semantic pills such as Warlord and trailing points/chevron.
Its second line summarizes only selected model types and wargear. A known
problem uses direct player language such as `Needs 4 more models`.

Tapping the row selects it for editing. Read-only information and destructive
removal live in the inspector, not as competing row buttons. A disclosure
chevron means navigation into configuration; the information-page action means
read-only reference and never impersonates navigation.

Use controls according to their meaning:

- filled tint: one primary nondestructive action;
- system red: destructive action, never primary;
- switch: binary role or preference;
- stepper: bounded quantity with the value always visible;
- checkmark row: one choice in a settings-style picker;
- information page: read-only rules or datasheet detail.

## Search, sheets, and inspector

Add unit is a scoped sheet, not a second permanent browser. It opens with a
single search field associated directly with the grouped unit results. On
compact layouts the field receives focus immediately; regular-width tablet
layouts may avoid forcing the software keyboard. Adding the first unit closes
the sheet. `/` focuses search when the roster has keyboard input and `Escape`
dismisses the sheet, restoring focus to Add unit.

Present one sheet at a time. A sheet owns a concise task, a clear dismissal,
focus containment, and focus return. At regular width, selecting a roster row
updates a 320–380 px inspector. At compact width, the same semantic inspector
content appears in a sheet rather than becoming a separately designed editor.

## State, motion, and accessibility

- Pressed and selected rows use `--fill`; focus uses a visible `--tint` ring.
- Color is always paired with text, shape, or accessible state.
- Present/dismiss transitions target 200 ms and become instant under
  `prefers-reduced-motion: reduce`.
- Every icon-only control has an accessible name and at least a 44 px touch
  target where touch interaction is expected.
- Keyboard order follows visual order. Sheets trap focus while open, close with
  Escape, and return focus to their trigger.
- Text, controls, grouped rows, and split layouts are verified at 320 px,
  390 px, regular desktop width, 200% text zoom, dark appearance, increased
  contrast, and reduced motion before the overhaul is accepted.

## Component contract

New presentation work should reuse or introduce primitives for navigation bar,
grouped section, list row, disclosure, information action, sheet, inspector,
search field, checkmark picker, switch, stepper, status line, and action menu.
One-off shadows, radii, spacing, font stacks, uppercase eyebrows, accent borders,
or alternate interaction patterns are regressions unless this document is
deliberately updated first.

## Current guideline basis

- [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG: Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Apple HIG: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [Apple HIG: Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)
- [Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Apple HIG: Split views](https://developer.apple.com/design/human-interface-guidelines/split-views)
- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
