# RosterForge Engineering Rules

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
- For changes justified by pinned real data, extend the optional gitignored
  corpus integration test and verify the configured repository revision. Never
  commit third-party game data or silently measure a moving branch.
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

## Tests And Documentation

- Use project-owned synthetic fixtures in normal tests.
- Third-party fixtures must be pinned, downloaded explicitly, and gitignored.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Update architecture, compatibility, and diagnostics documentation when
  behavior or boundaries change.

## Completion

A coding task is complete only when scoped implementation, focused tests,
diagnostics, documentation, and all relevant checks pass. Do not continue into
later project phases without an explicit request.
