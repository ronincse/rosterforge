# RosterForge Engineering Rules

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

## Cross-Model Handoffs

- `codex-handoff.md` is the shared cross-model status and work-order document.
  Read it with `git status`, recent `git log`, and the architecture and
  compatibility documents before starting a new checkpoint.
- Treat `AGENTS.md` and the package boundaries as authoritative when a handoff
  note is stale or ambiguous. Preserve existing user or model changes; never
  reset, clean, or rewrite history to obtain a preferred baseline.
- Keep each handoff checkpoint bounded and independently reviewable. Commit it
  separately, then update `codex-handoff.md` with the baseline and resulting
  commit, exact tests and corpus measurements, remaining unsupported behavior,
  and the next recommended boundary.
- For changes justified by pinned real data, extend the optional gitignored
  corpus integration test and verify the configured repository revision. Never
  commit third-party game data or silently measure a moving branch.
- Do not push branches, open pull requests, or rewrite remote history unless the
  user explicitly requests that publication step.

## Completion

A coding task is complete only when scoped implementation, focused tests,
diagnostics, documentation, and all relevant checks pass. Do not continue into
later project phases without an explicit request.
