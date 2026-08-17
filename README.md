# RosterForge

RosterForge is an open-source, local-first army list builder intended to read
BattleScribe 2.03 community data without copying BattleScribe implementation or
assets.

This repository currently contains the first development slice:

- a pnpm and TypeScript workspace;
- shared identifiers, provenance, diagnostics, results, and validation contracts;
- secure `.gst`, `.cat`, `.gstz`, `.catz`, and BattleScribe 2.03 JSON
  ingestion;
- bounded local-file batch import with ordered partial-success reports;
- read-only typed BattleScribe 2.03 projections over generic XML or ordered
  JSON source trees;
- read-only catalogue graph indexing and link/reference diagnostics;
- catalogue-root visibility views over caller-supplied game systems and
  catalogues;
- catalogue-facing force-definition views with nested force entries and
  explicit category-target states;
- catalogue-facing category-definition views and structural profile-type
  containment reports;
- unified read-only catalogue contexts joining roots, forces, categories, and
  profile compatibility over one shared graph;
- immutable structural rosters with nested force and selection occurrences and
  optional positive finite selection amounts, guarded construction, naming,
  definition replacement, subtree duplication, relocation, sibling reordering,
  and subtree-removal commands;
- context-backed roster construction with stable source-path references and
  structural availability guards;
- read-only roster compatibility reports for catalogue matching, definition
  availability, and direct parent-child structure;
- deterministic read-only base and direct-unconditional cost aggregation with
  amount-scaled totals, per-cost provenance, ordered numeric modifier steps, and explicit
  completeness for unresolved or unsupported behavior;
- direct conditional cost modifiers using supported selection- or force-count
  conditions and nested AND/OR groups, with explicit applicable,
  not-applicable, and unresolved states;
- recursive read-only modifier-group applicability reports for the observed
  `and` shape, retaining exact projected groups and local/effective child
  modifier applicability;
- read-only selection-count condition reports across self, parent, force, and
  roster scopes plus shared roster-scope force counts, with bounded results for
  unresolved candidates;
- exact reports and numeric execution for the supported selection-count repeat
  subset, including floor/round-up behavior and zero-repeat no-ops;
- read-only `min`/`max` selection-constraint reports over those same scopes,
  with interval results plus ordered per-selection and roster-wide inspection,
  but no roster validity mutation;
- ordered direct-unconditional numeric constraint-limit modifiers with separate
  base/effective limits and statuses;
- direct and grouped conditional constraint-limit modifiers using the supported
  selection-count condition and nested condition-group forms, with inherited
  applicability and deterministic ordered numeric steps;
- read-only roster-scope force-count constraints with projected force identity,
  bounded candidate results, direct and grouped conditional limit modifiers,
  ordered force collections, and no legality state;
- composed materialized views of those visible roots with shared expansion
  budgets and provenance;
- provenance-preserving materialized views for linked shared selection entries,
  groups, rules, and profiles;
- a headless application catalogue library that composes imported local files
  into ordered, provenance-preserving catalogue choices;
- a responsive local-only web interface for selecting files, retaining partial
  imports, choosing a catalogue, and inspecting its composed context;
- structural in-memory roster setup from a selected catalogue and starting
  force, backed by immutable roster-model state;
- guarded visible-root additions to that force, with repeated definitions
  represented as distinct selection occurrences;
- guarded recursive child additions from materialized entries, groups, and
  resolved entry links;
- occurrence-specific selection-subtree removal over immutable roster snapshots;
- read-only conditional-scope cost totals with explicit report completeness and
  retained evaluation diagnostics;
- composed supported validation over structural, selection-condition, and
  force-condition reports, with independent validity and completeness and no
  full-legality claim;
- issue-first validation details with stable links to exact roster
  occurrences, plus collapsible initialized selection subtrees;
- focused responsive roster-building workspace with persistent Roster, Add
  units, and Checks navigation plus separate selected-roster and
  catalogue-browser panes;
- occurrence-level direct and linked rule/profile details with characteristics,
  source filenames, and observable unresolved info links;
- headless read-only characteristic-display reports for one profile and one
  roster occurrence, executing exact-`typeId` lexical `set` modifiers in
  owner-direct then grouped source order while preserving unsupported
  operations, extensions, and unrouted profile modifiers as incomplete;
- read-only profile visibility for direct and grouped Boolean `set` hidden
  modifiers, using the projected profile flag as the base;
- occurrence keywords in the roster workspace, showing effective categories
  with added markers, struck-through removals, and an explicit unresolved state;
- read-only effective category membership per roster occurrence, executing
  scope-free `add`/`remove` while preserving `set-primary`/`unset-primary` as
  an unresolved primary determination;
- pure parsing of the observed `affects` selector grammar into traversal,
  optional filter ID, and profile-type name, with explicit unsupported issues
  and no resolution or execution;
- evaluated characteristic values in occurrence details, showing the effective
  value, the source value as a labelled base when it changed, an explicit
  unresolved label, a hidden/unresolved visibility label, and a per-profile
  incomplete note;
- bounded in-memory undo and redo over exact immutable roster-session snapshots;
- occurrence-specific selection rename and reset-to-definition-name controls;
- occurrence-specific amount editing with source default/step visibility,
  amount-aware costs and checks, and undo/redo participation;
- standalone browser print/save-PDF presentation export preserving nested roster
  order, occurrence and definition IDs, quantities, supported costs, and
  supported-check validity/completeness without claiming .ros compatibility;
- explicit browser-local roster drafts in IndexedDB, retaining source bytes and
  reopening through secure import and exact definition-key restoration;
- immutable pinned GitHub repository browsing with visible per-file progress,
  cancellation, non-library faction selection, verified dependency-closure
  acquisition, defensive IndexedDB byte and metadata caching, and preserved
  download provenance;
- original synthetic fixtures and focused parser/security/resolution tests.

Pinned GitHub tree listing, bounded individual-file downloads, download
provenance, Git blob verification, sequential metadata indexing, and focused
exact-ID dependency-closure acquisition are available through the headless
repository package and one immutable WH40K 11e snapshot is available in the web
source picker. Additional source configuration, repository update discovery,
cache management, and retries remain deferred,
along with broader condition application, dynamic source-default amounts,
non-`set` characteristic operations, `affects` retargeting execution,
`join`/`arg`/`position` behavior, characteristic modifiers owned outside their
profile, modifier-group repeats, constraint
enforcement, full legality validation, automatic saving, durable undo history,
roster reordering, and BattleScribe .ros/.rosz import and interchange export.

## Requirements

- Node.js 24 or a current supported LTS release
- pnpm 11

## Commands

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See `docs/architecture.md`, `docs/compatibility.md`, and
`docs/diagnostics.md` for current boundaries and behavior.
