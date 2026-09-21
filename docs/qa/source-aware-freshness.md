# SC-08: source-aware provenance and repository observations

Date: 2026-09-20. Baseline: `63aedea60b4a17dddd8c08e9c7b942a10044e464`.
Scope: `codex/starcraft-pilot` only. Implementation/receipt is in the current
handoff and completion response. Final owner print-layout acceptance remains pending.

## Reproduction and actual callers

The production setup caller passed only `library.importReport.importedAt` to
`useCatalogueDataFreshness`, with no source override from App. Its fallback was
`defaultRemoteCatalogueSources[0]` (BSData/wh40k-11e). Normally acquired StarCraft
and unproven local imports therefore inherited the 40k check; normally acquired
40k happened to select the right repository. Tests could supply an override;
that does not establish that the production caller did. The old inspector read
repository `pushed_at`, compared it with import time, and described a later date
as newer catalogue data. Earlier/equal dates suppressed the message; they were
not affirmative proof of current data. Failure copy named BSData for every source.

A small fictional XML local-import regression failed before the repair: one
unsolicited default-repository request instead of zero. It now passes. The old
setup component unmounted after roster creation: reopening an army did not have
an active source status there. We do not claim every saved army previously made
a wrong request. Original cancellation avoided some late writes; the new explicit
check, persistent army disclosure and shared cache require stronger context guards.

## Retained provenance contract

The selected catalogue's document closure follows game-system and catalogue-link
edges. Its original download kind, canonical `download:github:owner/repo@SHA:path`
ID, filename and encoded raw origin must agree, using existing repository/path
validation. Every document in that closure must record the same repository and
immutable revision, and document edges must resolve uniquely. Unrelated files in
a mixed import batch do not inherit or taint that closure's claim. Missing,
ambiguous, mixed or legacy provenance remains unknown. Entry-level evaluator
resolution is independent; this does not certify reference/evaluator completeness.

Only repository identities in application-configured source descriptors may be
checked. No labels, catalogue IDs, Browse selection or imported arbitrary URLs
choose the endpoint. Setup follows its selected loaded catalogue; an open army
follows its own session catalogue, including after restore. The configured Browse
pin is separate contextual information and never replaces a retained older SHA.

No new persisted field, schema version, database name or migration is needed:
existing drafts retain source kind/ID/origin/path and bytes. Canonical metadata
is a recorded provenance assertion, not authentication of a manually edited draft.
Acquisition's existing Git blob verification is unchanged. Checks do not revalidate
saved file contents. Local file imports cannot acquire repository provenance merely
from a familiar name or an origin URL.

## Exact observation and failure contract

A Check/Retry makes one public request through the existing repository adapter:
`GET /repos/{owner}/{repo}/commits?per_page=1`. GitHub's
[commit-list documentation](https://docs.github.com/en/rest/commits/commits#list-commits)
specifies the repository default branch when `sha` is omitted. The adapter bounds
the response to 64 KiB, rejects redirects, validates one full lowercase 40-hex SHA
and a real seconds-resolution ISO timestamp (UTC or explicit offset), and returns
structured failure for missing/malformed values, transport errors and HTTP errors.
Commit dates are metadata only, never compared with import dates.

Explicit states: unestablished, identified/not checked, checking, matches, differs,
and unavailable. Equality means **recorded source revision matches the checked
repository snapshot as of the check time**. Inequality means **different snapshot;
selected-file impact and revision chronology are not established**. Neither means
publisher rules are current, points changed, full game support, or ancestry proved.
Import dates remain labelled acquisition dates. There is no updater control.

HTTP 429 is identified; other reliable HTTP statuses remain visible; undifferentiated
failures say “Could not check this source.” An unusable local check time withholds
success with its own explanation. A failed retry can show a **previous check** with
its original timestamp; it never becomes a new success. Session-memory observations
are scoped by fetch adapter/repository/retained revision and bounded to 64 entries.
They are not persisted. Reload starts not checked; same-session reuse retains the
original observation time. No automatic polling, render-triggered requests or retries.

Async work is bound to the memoized loaded context and fetch adapter. A changed
context or unmount aborts it; an operation identity guard discards late responses
before state or cache writes even if a fetch adapter ignores abort. Repeated clicks
cannot create concurrent checks. Changing configured-source identity can deliberately
cancel a pending check; production uses stable descriptors. Sharing completed
repository observations across eligible catalogues at the same revision is safe
because no selected-file claim is made.

## Non-mutation and coverage

Only a small scalar provenance context reaches the status component; raw source
bytes never enter the leaf. The hook owns React state and an ephemeral metadata
cache, with no roster/controller/persistence writes. A check does not replace bytes,
change pins, evaluate new data, edit selections/budgets/prices/history/recovery,
mark dirty, autosave, or add live claims to printed output.

Fictional tests exercise actual ingestion/projection, normal remote indexing and
acquisition (fresh and warm cache), and saved restoration. Coverage includes both
configured repositories, identical names/IDs, old saved SHA versus configured pin,
unrelated mixed files versus mixed dependency closure, missing/legacy/unconfigured
sources, encoded canonical paths, invalid SHA/date/calendar/JSON/oversize/redirect,
offline/429/403/503, previous observations, same-repository revision cache isolation,
65-entry eviction, duplicate clicks, rerenders, out-of-order results and unmount.
Snapshot/byte/cost/budget/history assertions preserve saved state and player labels.
All original chooser tests remain. No third-party dataset was added to Git.

## Browser acceptance

Isolated origin `http://127.0.0.1:5295/`, ordinary Browse/load/create/save/Open controls.
Gitignored QA transport replays verified immutable source bytes/tree metadata through
the production acquisition adapters. These are frozen acquisition replays, **not live
GitHub downloads**. Source pins remain StarCraft `99261754e0449bbaaa04e6890e1625b144f9ece1`,
40k A `04c62fcd041b3808c39d5c46fd677c704027b979`, B
`5b261ec423d5d017bb733c4f3c0a760b085d5ca5`. Server startup verified frozen manifests.

- Terran Browse/load/create: correct `loicmusy/StarcraftTMG-NR`, two-file closure.
  Live metadata at displayed Sep 20 22:14 matched `99261754...`. Loaded and configured
  SHAs remained separate. Marines 6/160 -> Shield 6/180 -> Reinforce 9/240 -> removal
  6/180. Saved and reopened at 180, same source, no inferred fresh observation.
- Browse 40k while the saved Terran army existed, then Open Terran: StarCraft remained
  authoritative. The setup could display a 40k Browse choice while the loaded Terran
  context still identified StarCraft until another catalogue was actually loaded.
- Dark Angels Browse/load/create: `BSData/wh40k-11e`, eight-file closure, A loaded.
  Live metadata at displayed 22:18 returned `07656840caa938d5d9d495488be9719c7f75dbd3`;
  UI said different snapshot, with no selected-file/chronology claim. Save/reload/Open
  retained BSData and A. Creating the army while a setup check was pending cancelled
  that work; the new context started not checked and could be checked explicitly.
- QA metadata selector injected a controlled HTTP 429 through the normal check
  adapter: unavailable/retry, previous success timestamp preserved. This was a
  **mocked response**, not an observed live GitHub rate limit. Saved Terran still
  showed “All changes saved”, unchanged 180 cost and undo/redo availability; shelf
  timestamp remained 22:16. No freshness operation required Update saved draft.
- Disposable copy of the pre-checkpoint retained reference army opened normally:
  local/no recorded source, freshness unestablished, no Check button; 14 units/2,000,
  Captain Sv2+/Feel No Pain 5+, Impulsor Deadly Demise D3/Firing Deck 6. Original draft
  unchanged (SHA-256 `9f0f9b94152102db6fddb378f34eaea9855874dc0b12ceb9ebfa0441cdc4937c`).
- Ordinary file chooser imported fictional local GST/CAT named Terran: local/no
  recorded source, unestablished, no guessed check. Name does not identify repository.
- Screens inspected at 1440x1000 and 390x844: StarCraft identity, different-snapshot
  disclosure and long SHAs wrap; 40k identity and unavailable/retry remain readable.
  Technical details are collapsed by default. Existing violation styling stays separate.

Deterministic tests, not a changing public repository, establish race/error/cache
boundaries. No print layout or PDF matrix was changed or retested. Other tabs,
origins, saved armies and preview servers were preserved; 5295 stays running.

## Independent review and dispositions

Two bounded tools-disabled Claude Opus 5 reviews covered design then actual changed
source/diff and fictional tests. No personal armies, secrets or third-party datasets
were sent. The reviewer had no execution or repository tool access; its output's
textual simulated Write block is not a tool execution. Lead inspected all findings.

Accepted: single SHA endpoint instead of `pushed_at`, bounded metadata, canonical
encoded path reuse, explicit unknown/unavailable states, late-cache guards, recorded
provenance wording, one application-owned configured-source list, valid ISO offsets,
and local-clock failure wording. The early claim that acquisition did not verify
blobs was disproved by repository-cache.ts (not in its initial packet). Mint-only
provenance/storage changes were rejected because retained saved descriptors already
serve restoration and no new authentication claim is made. Document closure is
explicitly narrower than all evaluator links. Reference-identity cancellation is
intentional for changed loaded contexts; production memoization and rerender tests
keep ordinary renders from starting/cancelling checks. No general async framework.

## Gates and stopping boundary

Final `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `git diff --check`
pass. Normal: 1,072 passed / 34 optional skips, 99 passed / 8 skipped files (107 total).
Configured: 1,106 passed / zero skips, 107 files. Configured variables supply the
40k JSON corpus, both correctness snapshots, frozen StarCraft and retained reference
army; no PDF-output variable. Pricing, Supporting, initialization, budgets, persistence,
recovery, reference grouping, explicit-self/rule labels, reinforcement and renderer
timing remain covered. Existing large-bundle advisory only. Early stylesheet
line-ending and new test descriptor typing mistakes were fixed before final gates;
no test removed or weakened. Exact durations/publication in handoff/completion.

SC-08 is complete for this contract. Per-file impact/history, source updating,
migration, dynamic/zero-hidden budgets, imported formatting, broad typed semantics,
rule precedence/routing, orphan costs and full StarCraft support remain outside it.
No main, PR, deployment, source-pin update or print acceptance claim. Stop here.
