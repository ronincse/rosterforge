# RosterForge Engineering Rules

Four documents divide the work, and confusing them wastes checkpoints:

| Document | Answers |
| --- | --- |
| `docs/product-vision.md` | **What RosterForge is becoming** — north star, acceptance, non-goals |
| `docs/architecture.md` | **How** the software is structured |
| `docs/compatibility.md` | **What** imported behavior is supported |
| `agent-handoff.md` | **What remains**, and what happens next |

This file governs *how to work*. Read `docs/product-vision.md` before arguing a
priority: it carries the v1/v2 acceptance definitions, the reference army every
feature-complete claim is measured against, and the five-question decision test
for newly discovered work.

## Cross-Model Handoffs

Multiple models work on this repository. That is intentional: it gives better
coverage of the work, and it spreads usage across the owner's subscriptions.
A session that starts here may be continued by a different model. A session
that ends here may never resume on the same model. Work can move to another
model at any point, so treat every checkpoint as a handoff to a stranger.

`agent-handoff.md` is the shared status and work-order document. It is not
Codex-specific.

- At the start of every session, and before starting any checkpoint, read
  `agent-handoff.md`: its "Read This First", "Current Status", and "Remaining
  Work To Feature Complete" sections, then the newest completed-assignment entry
  at the end. Then read `git status`, recent `git log`, and the architecture and
  compatibility documents.
- At the end of every checkpoint, and before stopping a session, leave the
  next model a complete handoff even if the user has not named who continues.
  Keep the checkpoint bounded and independently reviewable. Commit it
  separately, then follow `agent-handoff.md`'s own "How To Update This
  Document" section: append an entry with the baseline and resulting commits,
  the decision and the alternatives rejected, exact test and corpus
  measurements, and remaining unsupported behavior — then update the status
  block and the roadmap table so they stay true.
- The roadmap is the record of what is left before the product is feature
  complete, not just of what comes next. Work you discover belongs in it even
  when you are not the one who will do it. A finding that lives only in your
  entry's prose is a finding the next model will not act on.
- If you disprove an earlier conclusion, mark the superseded entry at its top
  and say so in your own. Never leave two contradictory answers in the file
  without saying which won.
- Treat `AGENTS.md` and the package boundaries as authoritative when a handoff
  note is stale or ambiguous. Preserve existing user or model changes; never
  reset, clean, or rewrite history to obtain a preferred baseline.
- A lead can vanish mid-checkpoint — quota exhaustion, a session or tool
  failure, lost context — without publishing a transfer. When the owner appoints
  you in that situation, treat the repository as mid-checkpoint: record the full
  state before touching it, preserve every uncommitted change as evidence of
  what the last lead was doing, finish the checkpoint already in progress rather
  than starting the roadmap's next one, and ask the owner instead of guessing or
  discarding. `docs/agent-workflow.md` "Interrupted Lead Takeover" is the
  procedure.
- For changes justified by pinned real data, extend the optional gitignored
  corpus integration test and verify the configured repository revision. Never
  commit third-party game data or silently measure a moving branch.

## Active Leads And Delegated Workers

Codex is the preferred default lead and primary implementer, but any capable
model may become the active lead through a formal handoff recorded in
`agent-handoff.md`. Delegating a bounded task does not transfer lead ownership.

- The active lead owns the plan, primary implementation work, architectural
  decisions, delegate briefs, integration, final review, validation, handoff,
  commits, push, and CI confirmation. Delegation is a normal part of substantive
  checkpoint planning, not a transfer of any of those responsibilities.
- Before implementing a substantive application-code checkpoint, identify work
  that can proceed independently and launch a useful bounded investigation,
  review, test-analysis, risk-discovery, plan-review, or non-overlapping writer
  lane early enough for its findings to affect the result. The fact that the
  lead could do the work itself is not, by itself, a reason to skip delegation.
  Target zero delegates for tiny, mechanical, or documentation-only work; one
  useful delegate for a normal product checkpoint; one or two for complex or
  cross-cutting work; and an independent review by the capable non-lead frontier
  model for semantic, architectural, or high-risk correctness work when that
  model is available. Large separable implementations may use writer delegates
  under the worktree rules below.
- These targets guide judgment; they are not numeric quotas. Skip delegation
  when a checkpoint is genuinely atomic or mechanical, or when safe briefing,
  isolation, review, and integration would clearly cost more than the lane is
  likely to return. Do not create duplicate investigations, overlapping
  writers, unnecessary model calls, or work merely to fill a target. When a
  substantive checkpoint uses no delegate, briefly record why the exception was
  appropriate in its completion report; trivial or mechanical work needs no
  explanation.
- Prefer the active lead's **own** native subagent mechanism for ordinary
  separable investigation, review, research, test analysis, risk discovery,
  plan review, or bounded implementation that does not need another model's
  particular strengths or tools, and only where that mechanism's capabilities
  have actually been verified for the task. Route independent review, hard
  debugging, and second opinions to the capable non-lead frontier model: Claude
  when Codex leads, the Codex CLI when Claude leads and Codex quota is available.
  Use Antigravity for captured Reference Behavior QA evidence analysis, Grok for
  bounded overflow implementation, Copilot for GitHub and Actions work, and a
  verified browser-capable native agent for interactive Reference QA. Affinities
  are guidance rather than permission to fan out; `docs/agent-workflow.md` holds
  the full table.
- A delegated worker owns only the task brief it receives. It must not edit the
  primary checkout, expand scope, update `agent-handoff.md`, push, open a pull
  request, deploy, or perform other external writes. It may commit only when the
  brief explicitly requests a commit. Reference QA may create only the temporary
  New Recruit roster state explicitly authorized by its brief; it does not
  authorize publishing, sharing, or unrelated account/service changes.
- Read-only work is read-only only when tool permissions enforce it. If that
  cannot be proved, run the worker in a disposable worktree. Every delegated
  write uses a dedicated worktree at an explicit baseline, with one writer per
  worktree. Parallel writer scopes should not overlap unless the lead explicitly
  requests competing alternatives and will integrate them as alternatives.
  Native subagents — Codex's and Claude's alike — share the parent filesystem
  and checkout; neither mechanism provides worktree isolation on its own, and a
  subagent type labelled "read-only" is not read-only if it still holds a shell.
  A native child that might write gets a dedicated worktree like any other
  writer.
- **Native subagents do not necessarily inherit these instructions.** A native
  Claude subagent in the current desktop app starts without `CLAUDE.md` or
  `AGENTS.md` in its context, so a brief that assumes the repository rules apply
  is a brief that silently does not. Name the files the worker must read, or
  give it the rules directly. Verify inheritance rather than assuming it.
- Grant the least tool and service access needed for the task. Treat a worker's
  findings, tests, and claimed completion as untrusted input until the active
  lead reviews the diff and reruns the relevant checks.

The command templates, task-brief contract, worktree procedure, role guidance,
and integration checklist live in `docs/agent-workflow.md`.

## Publishing

Pushing is how work reaches the next model. A checkpoint that stays local is
invisible to anyone working from a fresh clone, so **push your own commits** —
you do not need to ask.

- **Push at the end of a checkpoint, once every gate passes**: `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check`. Never push
  work you have not verified; CI is a second opinion, not the first one.
- **Push the documentation with the code.** The handoff entry, status block, and
  roadmap belong in the same push as the change they describe, so the remote is
  never a state no document explains.
- **Confirm CI afterwards** and say what it reported. A green local run and a red
  remote one is exactly the discrepancy the next model needs told about.
- **If someone else's unpushed commits are sitting on the branch**, verify them
  against the same gates before pushing them along with yours, and say in your
  report whose work you published.
- **Sign every commit with the model that wrote it.** Git records the owner's
  account as author whatever model did the work, so a trailer is the only thing
  in `git log` that tells one model's checkpoint from another's. End every
  commit message with a blank line and a `Co-Authored-By:` trailer naming your
  model:

  - `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
  - `Co-Authored-By: Codex <noreply@openai.com>`
  - `Co-Authored-By: Grok Build <noreply@x.ai>`
  - `Co-Authored-By: GitHub Copilot <noreply@github.com>`
  - `Co-Authored-By: Antigravity <noreply@google.com>`

  Name the specific model when you know it, the way `Claude Opus 5` does. The
  point is to tell two checkpoints apart a month later, not to record a vendor.
  These addresses are this repository's convention and are deliberately
  unroutable; if your CLI emits its own trailer by default, keep that form and
  record it here rather than maintaining two spellings of the same agent.

  When you integrate a delegated worker's commit, keep its trailer and add
  yours beneath it, so the log shows both who wrote the change and who
  published it.

  **Absence stopped being meaningful on 2026-08-24.** Earlier commits carry a
  trailer only when Claude wrote them, because Claude's tooling added one and
  nothing asked it of anyone else. An unmarked historical commit therefore tells
  you only that Claude did not make it. Do not rewrite history to backfill one.

Still ask first:

- **Force-pushing or rewriting remote history.** Both can destroy work that is
  not yours, and neither is ever needed by the ordinary checkpoint rhythm. If a
  push is rejected, reconcile by merging or rebasing your own local commits, not
  by overwriting the remote.
- **Opening pull requests.** This repository ships directly to `main` with CI as
  the gate; a PR is a different, outward-facing act and is not part of the
  normal loop.
- **Anything that leaves this repository** — publishing packages, deploying,
  posting to an external service.

## Researching BattleScribe And New Recruit Semantics

Do not guess at data-format semantics. Several conclusions in the handoff were
reached by searching rather than inferring, and at least one confident inference
was later disproved by evidence. Prefer, in this order:

1. **The pinned corpus.** Measure how a construct is actually used across all 46
   documents before deciding what it means. A reading that makes a whole
   population of modifiers inert is usually the wrong reading.
2. **The New Recruit wiki.** Every catalogue entry is a public page, keyed by the
   same entry `id` the corpus JSON carries, so a corpus audit can produce the URL
   directly: <https://www.newrecruit.eu/wiki/wh40k-11e/warhammer-40%2C000-11th-edition>
   It shows an entry's own rendered text, abilities, and rules.
3. **BattleScribe release notes and the open-source New Recruit data editor**
   (`giloushaker/nr-editor`). The editor's modifier panel encodes which
   attributes an operation accepts. Its runtime lives in a private submodule, so
   it constrains the answer without always settling it.
4. **Ask the owner to observe it in New Recruit.** Effects that only appear once
   an entry is attached to a bearer need a built roster. Say exactly what to
   build and what to look at.

`affects` is a New Recruit extension, not a BattleScribe 2.03 feature; the
BattleScribe schema and release notes will not describe it.

Interactive New Recruit comparisons follow the Reference Behavior QA lane in
`docs/agent-workflow.md`. Prefer a browser-capable native subagent **of the
active lead** for a bounded interactive scenario, after verifying that child's
browser tool in the current environment; if that capability is unavailable, the
active lead performs the browser work directly. Sandbox or filesystem
inheritance does not prove browser inheritance — probe it. New Recruit is a
JavaScript application whose static HTML carries none of the rendered state, so
a fetch-only tool cannot do this work. The installed headless Antigravity client
analyzes captured steps, screenshots, IDs, observations, and corpus evidence
independently but is not the interactive executor. Escalate difficult semantic
or data-format discrepancies to the capable non-lead frontier model — Claude
when Codex leads, the Codex CLI when Claude leads. New Recruit is a moving
reference:
record data and version evidence, and never classify a difference as a
RosterForge defect until the active lead distinguishes catalogue drift,
intentional differences, known unsupported behavior, roadmap work, and an
actual behavioral defect.

## Architecture

- Follow package direction in `docs/architecture.md`; circular dependencies are
  forbidden.
- React, Vite, Zustand, and UI concerns belong only in `apps/web`.
- `foundation` has no workspace dependencies.
- `battlescribe-data` may depend only on `foundation` and parsing/archive
  libraries.
- `roster-model` may depend only on `foundation`.
- `persistence` may depend only on `foundation`, `repository`, and
  `roster-model`; browser storage adapters belong in `apps/web`.
- `roster-builder` is the integration boundary between `data-graph` and
  `roster-model`; it must not perform cost, constraint, modifier, or legality
  evaluation.
- Evaluation code must remain deterministic and independent of React,
  persistence, and browser components.

## Imported Data

- Treat all imported and downloaded bytes as untrusted.
- Preserve the original imported source bytes unchanged.
- Preserve unknown XML elements and attributes semantically.
- Reject DTD and entity declarations before normal XML parsing.
- Do not use `eval`, `new Function`, dynamic code generation, or executable
  expressions from imported data.
- Enforce configured source and archive limits. Reject archive traversal paths.
- Missing references and cycles are diagnostics, not crashes.

## Validation

- Validation has two independent dimensions:
  `validity: "valid" | "invalid"` and
  `completeness: "complete" | "incomplete"`.
- Unsupported applicable behavior must set completeness to `incomplete`.
- Never silently ignore unsupported data or report incomplete validation as
  complete.

## Comments

Code you write is code a stranger inherits, possibly a different model with none
of your context. **Every change ships with the comments that change needs**,
written while you still hold the understanding that makes them correct.

- **Comment as you go; do not schedule sweeps.** A retroactive pass by someone
  who did not write the code produces confidently wrong comments, and a wrong
  comment is worse than none because the next reader trusts it instead of
  checking. `packages/evaluation/src/affects-routing.ts` is well documented
  because each checkpoint recorded what it had just verified.
- **Verify every claim against the code before writing it.** Read the call
  sites; run the thing if reading is not enough. If you cannot confirm what
  something does, say so in `agent-handoff.md` rather than guessing in a
  comment.
- **Prefer why over what.** Corpus counts, rejected alternatives, and recorded
  observations earn their place. A comment restating a type is noise and rots at
  the next refactor. `affects-routing.ts` is the house style.
- **Always write down non-obvious costs and invariants.** What a function
  allocates or rewrites on a hot path, what identity or ordering guarantees
  callers depend on, what a value's absence means. This is the class that has
  actually caused regressions here: nothing recorded that
  `decodeLocalRosterDraft` copies every imported byte, and autosave was built on
  top of it.
- **Give every new or changed export a doc comment** unless the type genuinely
  says everything — plain data shapes need none. When you change what an
  existing export does, update its comment in the same commit or delete it.
- **Head a new file with what it is for** and how it fits the package direction,
  not a list of its contents.

Comment quality is reviewable work. A comment you cannot defend against the code
should not be committed.

## Tests And Documentation

- Use project-owned synthetic fixtures in normal tests.
- Third-party fixtures must be pinned, downloaded explicitly, and gitignored.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Update architecture, compatibility, and diagnostics documentation when
  behavior or boundaries change.

## Completion

A coding task is complete only when scoped implementation, focused tests,
diagnostics, comments, documentation, and all relevant checks pass. Do not
continue into later project phases without an explicit request.
