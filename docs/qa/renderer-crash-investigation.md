# Renderer hang investigation — 2026-09-10

Status: unresolved. A new interrupted run on 2026-09-10 captured a React
development-profiling `performance.measure` cloning/OOM exception; see
`reference-army-replay.md`. This identifies the immediate throwing operation,
not the root cause of memory pressure or the older host-level crash. No repair
or successful full-army acceptance is claimed.

The remainder records the earlier investigation before that new trace.
Owner continuation after this investigation changes the stopping policy:
"Observed previously; cause unresolved; not reproduced during follow-up;
monitor for recurrence. Not a prerequisite for continuing implementation."
Historical observations below remain unchanged. Dedicated investigation is
paused unless recurrence supplies new evidence; any interrupted acceptance run
must remain recorded as failed rather than replaced by a successful retry.
Baseline: `e1408348da5b6a4430f05abd2a34ee855cc987c1`, clean tracked tree on
`codex/list-builder-ui-overhaul`. The owner requested crash isolation before any
other work. Supporting, full-army acceptance and the UI roadmap remain paused.

## What the original failure establishes

The prior own-browser tab at `http://127.0.0.1:5240/app/` showed a crash screen
after adding the first Deathwing Knights to saved `QA frozen A correctness`:
one Intercessor Squad, 1 sergeant / 3 ordinary / 1 grenade launcher, 80 points.
Configuration was unselected. Frozen A is
`04c62fcd041b3808c39d5c46fd677c704027b979`.

A narrow inspection of the local desktop log establishes this sequence (UTC):

- 21:01:00: input-dispatch timeout for own tab 2, web contents 15.
- 21:01:01 and 21:01:09: focus-emulation command timeouts.
- 21:01:13.138: browser host logs `IAB browser page unresponsive` for port 5240.
- 21:01:13.717: the host's crash interstitial loads.

There is no recovered RosterForge exception stack, OOM diagnosis or renderer
exit reason in that sequence. The screen therefore establishes an unresponsive
page, not the cause of the hang. These timestamps are from
`codex-desktop-146b1a9c-317a-4376-8223-3376335f1ff8-56136-t0-i1-134916-0.log`.
Unrelated desktop errors are not attributed to the RosterForge renderer.

Correction to the prior handoff: the failed tab was left untouched during that
turn, but did not survive turn-end browser cleanup. This investigation's initial
inventory contained only the owner's tab. The saved QA draft and recorded
failure evidence survived; the failed renderer's live heap did not.

## Actual browser checks, unchanged production code

Only own origin 5240 was operated. Owner tabs, armies and preview servers
5199/5216 were untouched. A fresh own tab reopened the same saved QA draft.
An ignored development HTML entry imports the actual `src/main.tsx`, including
StrictMode, and records native browser heap samples, DOM node counts and global
errors to its console. It does not inject roster state or replace application
components. Scratch entry: `apps/web/.cache/crash-probe.html`; not shipped.

- First Knights addition succeeds, showing 240 points and 320 total.
- 51 remove/add cycles (102 roster edits) succeed through normal browser controls.
- Browser JS heap settles near 189 MB after initial addition; sampled heap after
  cycles 11/31/51 is approximately 302/301/338 MB. These are unforced samples,
  not retained-heap measurements or a proof against all leaks. DOM returns to
  approximately 2,323 nodes after additions.
- Explicit Update saved draft succeeds beyond the 100-entry edit-history limit.
- Navigation to the ordinary `/app/` entry and reopening succeeds at 320 points.
- Remove Knights; edit Intercessors 5 -> 6 -> 10 -> 5; explicitly save at 80.
  Switch to a separate own diagnostic tab, return, search and add first Knights:
  succeeds again at 320. No console warnings/errors were reported in these checks.

This is a small-roster browser stability result, not full local-pricing or army
acceptance. In particular, the original long-lived session's exact live-update
history is unavailable. No HMR, GPU or browser-host cause has been established.

## Independent isolated investigation

Native reviewer worked in disposable detached worktree
`C:/CodexACLTest/rf-renderer-review-20260910`, baseline e140834. Its scratch
`apps/web/src/renderer-retention-review.ui.test.tsx` renders the actual App in
jsdom using the frozen eight-file closure with SHA-256 and Git-blob verification.
The lead reviewed the test and independently exercised the actual browser above.

With event-loop yields, a 2 GB heap cap and explicit GC, 120 remove/add cycles
(240 edits), six explicit saves pass in 65.11 seconds. After saves at cycles
60/80/100/120, heap is 457.7/454.4/456.6/458.1 MiB; unmount reduces it to 93.7 MiB.
History retains per-session cached reports, but this measured population
plateaus. Graph/materialization references are shared rather than copied per
edit. An initial no-yield test accumulated queued callbacks and is not evidence
of a real-browser leak. A 12-cycle timing run measured add-unit median 150.1 ms,
maximum 218.4 ms, excluding DOM-query lookup.
The separate StrictMode 12-cycle run also passes (9.49 seconds; add-unit maximum
311.8 ms). Its scratch report and test remain in the reviewer worktree.

jsdom does not cover layout/GPU, real IndexedDB cloning or HMR and cannot prove
browser acceptance. No speculative cache eviction, importer rewrite or swallowed
diagnostic was implemented. External review remains approval-blocked; no source
was transmitted and no alternative external provider was used.

## Remaining boundary

The original failure remains unexplained, not fixed. Preserve any recurrence
with the tab explicitly retained across turns, exact action/timing, console and
browser-host diagnostics before reload. A reproducible failing path or retained
failure trace is needed to select and verify a causal repair. Do not promote the
crash row to Done or resume later correctness work on the strength of these passes.

Normal gates rerun on unchanged application code: lint, typecheck, test, build
and whitespace checks pass. Tests: 671 passed / 26 skipped, 74 passed / 6 skipped
files, 12.74 seconds. Build retains its existing 802.05 kB bundle advisory.
The own regular-app tab is explicitly marked for handoff at 320 saved points;
the extra scratch tab is closed and own preview 5240 is left running.
