# RosterForge

RosterForge is an open-source, local-first army list builder intended to read
BattleScribe 2.03 community data without copying BattleScribe implementation or
assets.

This repository currently contains the first development slice:

- a pnpm and TypeScript workspace;
- shared identifiers, provenance, diagnostics, results, and validation contracts;
- secure `.gst`, `.cat`, `.gstz`, and `.catz` ingestion;
- original synthetic fixtures and focused parser/security tests.

Roster construction, catalogue resolution, evaluation, persistence, and the web
interface are deliberately not implemented yet.

## Requirements

- Node.js 24 or a current supported LTS release
- pnpm 11

## Commands

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See `docs/architecture.md`, `docs/compatibility.md`, and
`docs/diagnostics.md` for current boundaries and behavior.
