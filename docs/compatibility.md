# Compatibility

## Implemented

- Uncompressed BattleScribe 2.03-style `.gst` and `.cat` XML ingestion
- ZIP-based `.gstz` and `.catz` ingestion with one matching XML entry
- BattleScribe 2.03 JSON game-system and catalogue ingestion from `.json`
  files, including native Boolean and number values plus `$text` content
- Root metadata projection for game systems and catalogues, including optional
  author fields, observed root type, and readme text
- Typed, read-only BattleScribe 2.03 projections for:
  - catalogue links and game-system references;
  - cost types, publications, and publication links;
  - category entries, including their observed profiles, rules, and info
    links, and recursively nested force entries;
  - selection entries, selection-entry groups, shared entries, and entry links;
  - category links, info links, shared and inline info groups, rules, profiles,
    and characteristics;
  - profile-owned ordered modifiers and modifier groups;
  - profile types and their ordered characteristic-type definitions;
  - costs, constraints, modifiers, modifier groups, conditions, nested
    condition groups, observed JSON local condition groups, and repeats
- Ordered preservation of unknown XML elements and attributes
- Ordered preservation of unknown JSON properties, duplicate properties,
  arrays, primitive types, and source ranges
- Original imported-source and extracted-document byte retention
- Bounded local-file batch import for `.gst`, `.cat`, `.gstz`, `.catz`, and
  `.json`, with deterministic per-file provenance, ordered partial-success
  reports, and retained rejected bytes
- Headless application composition from one local batch to ordered catalogue
  choices, preserving the exact parsed documents, catalogue contexts, source
  IDs, BattleScribe IDs, diagnostics, and original bytes
- Responsive React/Vite browser shell for selecting multiple local
  BattleScribe files, retaining partial-import results, choosing an imported
  catalogue, and inspecting source and composed-context counts
- Accessible loading, batch-failure, empty, unavailable, ready, and
  ready-with-issues states, with ordered file status and diagnostic summaries
- In-memory roster setup from one selected catalogue and one ordered top-level
  force definition, using guarded roster-builder references and caller-created
  branded occurrence IDs
- Structural roster overview with force and recursive selection-occurrence
  counts, explicit non-validation messaging, and a return-to-setup action
- Ordered visible-root selection choices added directly to the starting force
  through roster-builder guards, with repeated clicks creating distinct
  immutable occurrences
- Optional positive finite amounts on selection occurrences, with absent
  amounts meaning one; immutable add/set/clear/duplicate commands, version-1
  draft persistence, undo/redo, and a browser amount editor
- Lexical projection and link-over-definition materialization of selection
  `defaultAmount` and `step`, without silently treating comma-delimited source
  extensions as one numeric value
- Visible roots organized into accessible primary-category disclosures while
  preserving within-category root order and an explicit uncategorized bucket
  for absent, secondary-only, missing, or ambiguous category targets
- Case-insensitive local root-name filtering with ordered matching categories,
  live match counts, and an explicit no-match state
- Live force/roster root selected and required counts, shared-definition
  counting across alternate visible links, and disabled add controls at
  supported maxima
- Recursive direct child choices from materialized selection entries and
  resolved entry links, with selection-entry groups rendered as transparent,
  ordered chooser containers over their concrete entries
- Live group selected/required counts and atomic replacement for supported
  max-one groups, with every concrete nested addition routed through
  roster-builder guards
- Live direct-entry selected/required counts and disabled browser add controls
  at supported maxima, including restoration guidance after a required
  initialized occurrence is removed
- Read-only conservative initialization plans for unconditional non-negative
  integer parent-selection minima, repeated entry occurrences, transparent
  selection-entry-group containers, and exact direct group defaults
- Empty-single-force initialization plans for visible entry roots with simple
  force- or roster-scoped minima and supported unconditional numeric bound
  modifiers
- Atomic session creation with required roots added in visible source order
  when the browser supplies descendant occurrence IDs
- Atomic browser-session expansion of supported required descendants using
  caller-generated branded IDs, including nested required entries and explicit
  defaults, with a 4,096-descendant per-selection planning limit
- Hidden root labeling and conservative exclusion of unresolved materialized
  roots from add controls
- Occurrence-specific selection-subtree removal preserving repeated siblings,
  prior immutable roster snapshots, and exact materialized choices for
  surviving occurrences
- Expandable occurrence details for direct and resolved linked profiles,
  rules, and recursively nested info groups, with ordered characteristics,
  direct/linked origin, definition source filenames, and unresolved info-link
  reasons
- In-memory undo and redo for successful structural edits, retaining exact
  immutable session snapshots, clearing redo after a branched edit, and capping
  retained past snapshots at 100
- Recursive occurrence-specific selection rename and reset-to-definition-name
  controls, with non-empty trimmed custom names and undo/redo participation
- Versioned, bounded local-roster-draft envelopes retaining ordered source
  bytes, source IDs and kinds, import metadata, source-scoped catalogue
  identity, branded occurrence IDs, optional names, and immutable roster
  structure
- Explicit IndexedDB save/update, reopen, and confirmed-delete controls, with
  newest-first summaries and no upload or automatic saving
- Draft restoration through the ordinary secure import, graph, and context
  pipeline, followed by exact force and materialized-selection matching from
  stable definition keys
- Defensive stored-record decoding with format/version checks, byte and roster
  limits, duplicate occurrence rejection, and structured persistence
  diagnostics
- Read-only roster cost totals from the selection-condition evaluation scope,
  with amount-scaled totals, per-unit values, ordered cost types, explicit
  complete/incomplete labeling, excluded and unresolved counts, and retained
  evaluation diagnostics
- Read-only roster-wide selection-condition and force-condition constraint
  collections, with independent bound statuses, explicit completeness, ordered
  details, and no aggregate legality or edit guards
- Read-only aggregate structural status for supported visible-root,
  direct-entry, and transparent-group selection bounds in the browser's
  single-force roster shape, with independent validity and completeness
- Parent-contextual descendant resolution, known-versus-possible selected
  counts, and conservative unresolved states that avoid false violations from
  missing or ambiguous roster references
- Browser structural-status badges and ordered bound details that recompute
  after edits and history changes without becoming command guards or a
  full-legality claim
- Issue-first structural presentation with owner names, stable links to the
  relevant selected occurrence or root editor, collapsed satisfied bounds,
  and separately retained diagnostics
- Relevance-scoped structural completeness: unsupported dynamic bounds on a
  proven inactive root remain in one catalogue-level diagnostic but do not
  make the roster report incomplete until the root is selected
- Conditional child visibility for direct and recursively grouped Boolean
  `set` modifiers, with retained applicability trees, owner-direct then
  group-source ordering, and direct-before-nested group execution
- Pinned WH40K 11e coverage for all 309 observed grouped hidden modifiers: 295
  set `true`, 14 set `false`, all scope-free and repeat-free in top-level
  `and` groups
- Headless composition of structural, selection-condition constraint, and
  force-condition constraint reports produced from the same immutable roster
  snapshot, with ordered findings and independent validity and completeness
- Composition input guards for report identity and inspection scope; the
  composer preserves its three source reports by reference and does not
  re-evaluate them or guard roster commands
- Compact browser supported-validation ribbon with separate validity and
  completeness badges, combined status counts, per-domain issue links, and
  retained structural and constraint detail cards
- Issue-first constraint presentation with stable links to exact selection
  occurrences or the owning force, collapsed satisfied bounds, and separately
  retained diagnostics; unsupported constraint shapes remain incomplete and
  diagnostic without inflating actionable issue counts
- Collapsible recursive selection-child collections, with large initialized
  subtrees closed by default and validation-owned ancestor paths opened
  automatically
- Persistent Roster, Add units, and Checks workspace navigation with live
  counts, a two-pane desktop builder, and ordered full-width mobile fallback
- Focused active-roster layout that uses the full library shell and restores
  the unchanged catalogue batch summary when roster setup is cleared
- Library-marked catalogues retained for composition and diagnostics but
  excluded from ordered roster-catalogue choices
- Selected-roster empty state and catalogue category browser kept as separate
  accessible regions without changing root visibility or add behavior
- DTD/entity declaration rejection and configurable byte, archive, XML-depth,
  XML-node, JSON-depth, and JSON-node limits
- Structured diagnostics for invalid Boolean and numeric projected attributes
- Read-only graph indexing for already-parsed game systems and catalogues
- Reference records for game-system references, catalogue links, entry links,
  category links, info links, publication links, cost-type references,
  selection-entry-group defaults, ID-valued constraint scopes, condition
  child IDs, repeat child IDs, profile types, and characteristic types
- Generic ID indexing that distinguishes a preserved, unprojected target from
  an ID absent from every supplied document
- BattleScribe selector classification for observed lexical scopes and child
  selectors, including `model`, `unit`, `root-entry`, `any`, `upgrade`,
  `roster`, and the group-default sentinel `none`
- Resolution diagnostics for missing references, duplicate IDs, and
  catalogue-link cycles, with repeated equal missing targets grouped per
  source document
- Structural materialization of direct and entry-linked selection entries and
  selection-entry groups across the caller-supplied graph
- Link-local scalar overrides with absent-value fallback, plus ordered
  definition-first collection layering
- Observable unresolved entry links and diagnostics for missing target IDs,
  missing targets, incompatible kinds, ambiguous targets, and cycles
- Provenance-preserving rule, profile, and recursive info-group views for info
  links, including unresolved missing, incompatible, ambiguous, and cyclic
  targets
- Observable unsupported info-link types and info links into unprojected
  generic targets without false missing-target diagnostics
- Configurable entry-link depth, per-catalogue expansion, and aggregate
  expansion budgets with diagnosed partial materialization when a budget is
  reached
- Per-catalogue visibility views for local, game-system, and linked-catalogue
  root selection entries, selection-entry groups, and entry links
- Explicit `importRootEntries="true"` and external-root `import="true"` gating,
  with deterministic transitive traversal and source-document deduplication
- Observable disabled, missing, ambiguous, and already-visible catalogue-root
  import attempts, with source-located diagnostics for blocked targets
- Composed visible-root materialization retaining visibility origin,
  occurrence, definition, source document, and definition document separately
- Shared immutable materialized roots for repeated catalogue paths, with
  independent per-catalogue budgets under one aggregate call cap
- Per-catalogue force-definition composition for matching game-system and
  catalogue-local definitions, preserving each source collection and combined
  game-system-first order
- Recursive force-definition views with provenance and explicit resolved,
  missing, ambiguous, and missing-target-ID category-link states
- Per-catalogue category-definition composition retaining separate ordered
  game-system and catalogue-local definitions without linked-catalogue imports
- Structural profile/characteristic containment reports with explicit type
  target states and diagnostics for definite cross-profile-type mismatches
- Unified catalogue contexts retaining the exact visible-root materialization,
  force, category, and graph-wide profile-containment views
- Per-catalogue entry-link expansion budgets, a 250,000-expansion aggregate
  cap, and deterministic combined stage diagnostics for every catalogue in a
  composed context
- Immutable roster, nested force-occurrence, and nested selection-occurrence
  types with caller-supplied branded IDs
- Ordered append commands for root forces, child forces, force selections, and
  child selections, with persistent structural sharing
- Immutable roster renaming, optional force/selection name setting and clearing,
  and complete force/selection subtree removal
- Same-parent force and selection reordering by strict zero-based sibling index,
  with persistent structural sharing
- Atomic force and selection subtree duplication immediately after the source,
  using caller-supplied ID mappers and independent occurrence trees
- Cycle-safe force relocation between the roster root and force parents, plus
  selection relocation between force and selection parents
- Non-destructive force and selection definition replacement preserving IDs,
  names, and descendant trees, with semantic identity no-ops
- Observable opaque definition keys and optional BattleScribe source IDs,
  allowing repeated definitions with distinct occurrence IDs
- Context-backed catalogue, force, and materialized-selection references using
  deterministic provenance-and-path keys
- Guarded roster commands rejecting catalogue mismatches, force definitions
  absent from the context, and selections absent from the materialized tree
- Context-backed definition replacement using the same catalogue and
  availability guards as construction
- Standalone browser print/save-PDF presentation export preserving roster,
  catalogue, force, and selection identities; ordered nested selections;
  explicit quantities; included per-selection costs; roster totals; and
  supported-check validity, completeness, and status counts
- Every printed imported or user-authored value is HTML-escaped, and the output
  carries an explicit presentation-only scope note rather than claiming
  BattleScribe roster-file compatibility or full legality
- Unresolved and resource-limited entry links remain unavailable to roster
  construction, while roster-model occurrence diagnostics pass through intact
- Read-only roster compatibility reports retaining occurrence and context
  objects while exposing definition and direct-parent statuses separately
- Diagnostic-only force and selection hierarchy inspection, with conservative
  unresolved states for catalogue mismatch and partial materialization
- Deterministic base cost aggregation for roster selection occurrences,
  retaining projected costs, resolved cost types, and source provenance
- Ordered per-selection cost reports and totals, including explicit zero and
  independent counting of repeated occurrences
- Evaluation completeness and structured exclusion of missing, ambiguous, or
  duplicate same-occurrence costs instead of guessed totals
- Ordered direct-unconditional numeric cost modifiers for `set`, `increment`,
  `decrement`, and `floor`, with exact modifier provenance and base/current
  values retained on each included cost
- Provisional modifier reports that preserve unsupported steps and make
  completeness incomplete instead of silently applying or discarding them
- Read-only selection-count condition reports for self, parent, root-entry,
  nearest unit/model/upgrade, nearest model-or-unit, force, and roster scopes,
  including child-selection and child-force traversal flags
- Force-owned selection-count conditions in force scope, retaining the exact
  force owner and honoring explicit child-selection and child-force traversal
- Shared force-definition count conditions in roster scope, with explicit
  child-force traversal and force-definition candidate reports
- Selection-owned `instanceOf` and `notInstanceOf` conditions for the exact
  owner, immediate selection parent, containing force, ancestors, root entry,
  nearest typed selection, and primary catalogue, including category IDs,
  selection IDs, type tokens, and `any`
- Six numeric count comparisons with exact or bounded counts, entry-link versus
  shared-definition identity, and conservative unresolved candidates
- Read-only non-negative `min`/`max` selection-constraint reports for self,
  parent, force, and roster scopes, with bounded counts and no validity state
- Ordered per-selection constraint collections retaining every projected child
  report without computing aggregate status or legality
- Roster-wide depth-first selection-constraint inspection with deterministic
  collection and diagnostic order and completeness only
- Optional base, unconditional-modifier, or selection-condition scope applied
  consistently across per-selection and roster-wide constraint collections
- Constraint reports retain local direct/grouped modifiers targeting the
  constraint ID and separate static `baseStatus` from unresolved effective
  status
- A separate unconditional constraint scope applies ordered direct `set`,
  `increment`, `decrement`, and `floor` limit modifiers through the shared
  numeric kernel while retaining base/effective limits and statuses
- A separate conditional constraint scope evaluates supported selection-count
  conditions and nested condition groups for direct and grouped numeric limit
  modifiers, retaining ordered applicability and numeric-step reports
- Conditional constraint reports expose relevant modifier-group applicability
  trees and execute supported descendants in deterministic
  direct-before-nested order
- Read-only force-owned `min`/`max` constraints for explicit shared force
  identity in roster scope, including ordered nested-force candidates and
  bounded unresolved counts
- Read-only force-owned cost-type constraints in parent or force scope, with
  exact selection-condition cost totals, explicit child traversal, retained
  cost reports, and conservative unresolved subtotals
- Ordered per-force and roster-wide force-constraint collections with
  completeness only and no aggregate status or validity
- Unconditional direct and condition-aware direct/grouped numeric
  force-constraint modifiers, retaining base/effective limits, applicability,
  and exact step reports
- Direct and grouped conditional numeric cost modifiers whose ordinary
  condition lists use supported selection- or force-count forms, with inherited
  AND applicability semantics
- Recursive `and`/`or` condition-group reports preserving nested tree shape,
  with supported groups participating in modifier applicability
- Recursive read-only applicability reports for observed `and` modifier
  groups, preserving parent inheritance, conditions, exact child objects, and
  each child modifier's local versus effective applicability
- Conditional cost items expose relevant modifier-group applicability trees
  and execute supported children in deterministic direct-before-nested order
- Explicit applicable, not-applicable, and unresolved modifier steps; false
  conditions do not make an otherwise complete cost report incomplete
- Exact selection-count repeat reports for supported direct modifiers,
  including divisor/multiplier arithmetic, `roundUp`, zero repetitions, and
  amount-aware force or roster queries
- Amount-aware selection conditions, selection and force constraints,
  structural status, choice maxima, and recursive browser counts
- Read-only characteristic-display reports for one projected profile and one
  exact roster selection occurrence, with base values, ordered applied,
  not-applicable, and unapplied steps, retained applicability trees, and
  independent completeness
- Exact `typeId` characteristic targeting with explicit absent and ambiguous
  target states; display names never select a target
- Lexical `set` execution for direct and recursively grouped profile modifiers,
  using owner-direct then group-source ordering and direct-before-nested group
  execution
- Effective characteristic values that stay known when no unapplied step follows
  the last applied step, even while the report remains incomplete
- Browser occurrence details that show the effective characteristic value, the
  source value labelled as the base when it changed, an explicit unresolved
  label when a sequence cannot be completed, and a per-profile incomplete note;
  direct profiles, linked profile info links, and recursive info-group profiles
  all use the same evaluated report
- Characteristic `append` with a declared non-empty `join` separator, used
  verbatim, chaining through successive appends; appends with no separator, an
  empty separator, or nothing to append onto stay preserved, diagnosed, and
  unapplied rather than producing a value the source does not mean
- Attribution for characteristics changed by another selection's `affects`
  selector, naming the declaring occurrence in occurrence details with a verb
  matching the operation, so a value that differs from the profile's own
  datasheet is traceable to its source
- Read-only profile visibility for direct and recursively grouped Boolean `set`
  `hidden` modifiers, using the projected profile flag as the base and the same
  owner-direct then group-source execution order as selection visibility
- Hidden and visibility-unresolved profiles labelled in occurrence details
  rather than removed, so nothing the source declares disappears
- Occurrence keywords in the browser: effective categories in order, an added
  marker for modifier-granted ones, removed categories struck through rather
  than hidden, and an explicit unresolved state
- A pinned real-data proof of the flip: an Adeptus Custodes Venerable
  Contemptor Dreadnought acquires the Character category from its Character
  upgrade's `root-entry`-scoped modifier, and a real catalogue `instanceOf`
  condition testing that category moves from unresolved to satisfied
- Cost, selection-constraint, force-constraint, and visibility reports all
  consuming the effective-category index, so composed supported validation
  answers category conditions exactly rather than reporting them unresolved
- Effective category membership feeding condition identity through an explicit
  per-roster index, resolved in one documented pass: category-modifier
  applicability is decided against static links, then every ordinary evaluation
  consults the finished membership. Known membership replaces the static links
  for a category target, so a removed category stops matching
- Permanent refusal of the chained case: an occurrence whose category modifiers
  themselves depend on category identity keeps unknown membership rather than
  being iterated to a fixpoint
- Conservative category identity without an index: a condition candidate whose
  choice carries a category modifier naming the queried category reports
  unresolved instead of a confident answer derived from static links alone
- Read-only effective category membership for one roster selection occurrence,
  executing `add` and `remove` over the occurrence's materialized category links
  in owner-direct then grouped source order, with inert no-op steps
  distinguishable from unsupported ones
- Inbound `parent` and `root-entry` modifier scope, inverted so a modifier
  declared by a child or descendant reaches the occurrence it anchors to, with
  applicability evaluated against the declaring occurrence and every step
  recording its origin
- Independent membership and primary reporting: a `set-primary` or
  `unset-primary` operation withholds only the primary determination, while
  every other unsupported shape withholds effective membership too
- Pure decomposition of the observed `affects` selector grammar into traversal,
  optional filter ID, terminus, and profile-type name, with force traversal the
  only remaining unsupported shape; parsing performs no resolution and no
  execution
- Selector terminus: a path ending in `profiles.<typeName>` targets profiles, a
  path stopping before it targets the reached occurrences themselves, which is
  what a selection-level field such as `category` requires
- `affects` routing anchored at the modifier's `scope`, for both category and
  characteristic modifiers, so an enhancement reaches its bearer's wargear
  without being its parent; supported anchors are the declarer, `parent`,
  `root-entry`, and the nearest `model`/`unit`/`model-or-unit`/`upgrade`
  ancestor-or-self
- An embedded filter category on a routed category modifier, resolved from
  static links when no modifier anywhere in the composed catalogue can change
  membership in it

## Parsed But Not Evaluated

- Unsupported condition forms applied to modifiers; grouped cost arithmetic
  outside selection-condition reports, modifiers with their own scope, and
  unsupported, multiple, or extension-driven repeats
- Characteristic operations other than `set` and `append`: `increment`,
  `decrement`, `floor`, `ceil`, and `replace` each need an unestablished lexical
  arithmetic or search rule for observed values such as `3+`, `36"`, and `D6`.
  They remain ordered, observable, and unapplied.
- `append` whose `join` separator is absent or empty, and `append` onto an empty
  value. An empty separator is the corpus's bonus-slot idiom, completed by a
  positioned `increment`/`decrement` and a later `replace` that are themselves
  unevaluated, so executing it alone would display a value the source does not
  mean.
- `affects` selectors whose traversal leaves the anchor's subtree, chiefly force
  traversal; routing to the anchor's own, child, and descendant occurrences and
  profiles is executed.
- `affects` modifiers whose `scope` names a collection (`force`, `roster`) or a
  type with no matching ancestor; there is no single occurrence to stand on, so
  the determination is withheld rather than treated as a no-op.
- Category `affects` filters naming a category that some modifier can change;
  deciding them needs the membership pass one is computing.
- Generic `arg` and `position` behavior on characteristic modifiers, `join` on
  any operation other than `append`, and characteristic modifiers owned by
  selection entries, entry links, info links, or info groups rather than by the
  profile itself
- Profile-owned `name` and observed `annotation` modifiers; they are retained as
  unrouted display behavior and make a characteristic report incomplete rather
  than being silently ignored
- Observed JSON local condition-group combination behavior and ordinary
  condition groups whose preserved type is `count`
- Conditional, modified, percentage, malformed, extension-driven, or
  non-parent selection bounds for automatic descendant initialization
- Structural bounds outside visible roots and direct parent/group selection
  counts, including conditional eligibility and nested-force roster status
- Cost-type metadata modifiers, dynamic selection defaults, default cost
  limits, unsupported constraint and condition forms, unsupported repeat
  shapes, and broader validation behavior
- Group-level repeats, multiply repeated, extension-driven, or otherwise
  unsupported force-constraint modifiers and force-owned constraint shapes
  outside shared roster-scope `field="forces"` counts or exact parent/force
  cost-type totals
- Projected costs remain unevaluated when their type or numeric value is
  unavailable, ambiguous, or duplicated on one materialized occurrence
- Unknown elements, attributes, and namespaces
- Info-group modifiers, modifier groups, and publication links remain
  projected and observable but do not gain evaluation behavior through
  info-group materialization.
- Known structures and fields not included in the current typed surface

## Deferred

- Cache eviction and quota controls, retries, repository update discovery,
  and atomic publication of a downloaded closure
- Inferring catalogue paths from catalogue-link names without downloading and
  verifying exact target IDs; visibility still uses only documents supplied to
  graph resolution by the caller
- Behavioral merge rules for duplicate costs, constraints, modifiers, rules,
  profiles, and other layered collections
- Force-definition inheritance or merging across catalogue links
- Category-definition inheritance or merging across catalogue links
- Automatic application of source `defaultAmount`, dynamic modifiers targeting
  it, comma-delimited default semantics, and hard enforcement of source `step`;
  supported initialization minima remain distinct occurrences
- Conditional or grouped automatic-root requirements, implicit choices for
  groups whose default is absent or `none`, and post-edit maximum enforcement
- `.ros`/`.rosz` ingestion, projection, import, and interchange export;
  browser print/save-PDF is presentation output only
- Grouped-modifier costs, broader cost-limit behavior, aggregate general-
  constraint enforcement, broader condition semantics, and full legality
  validation
- Exact XML or JSON reserialization
- Additional remote source configuration, GitHub authentication, branch/update
  tracking, gallery discovery, and cache management UI
- Sibling reordering, nested-force editing, force renaming, editable cost
  overrides, durable history, publication rendering, aggregate legality,
  validation, and `.ros`/`.rosz` interchange UI

## Uncertain

- Full tolerance parity with BattleScribe for malformed XML
- Full tolerance parity with every producer of BattleScribe-shaped JSON
- Non-ZIP compressed files mislabeled as `.gstz` or `.catz`
- Archives containing metadata or more than one candidate XML document
- BattleScribe structures not represented by the current projection types,
  including roster documents
- BattleScribe duplicate-ID tolerance rules beyond preserving every occurrence
  and reporting diagnostics
- Exact BattleScribe behavior when a link and definition contain costs of the
  same type; base evaluation preserves both, excludes that occurrence/type from
  totals, and marks completeness incomplete
- Exact BattleScribe parity for transitively imported roots and for catalogues
  reachable through more than one enabled path; RosterForge currently traverses
  enabled links depth-first, exposes the first path, and deduplicates the source
  document
- Whether categories should eventually participate in selectable-root or
  roster-facing APIs; category definitions now have a separate composition API
  but remain non-selectable structural definitions
- Whether linked-catalogue force entries should contribute definitions to a
  consuming catalogue; the current force view deliberately includes only the
  matching game system and the catalogue itself
- Whether profile and characteristic `typeName` display text should receive a
  separate consistency report; containment currently uses IDs only
- Exact characteristic modifier target selection when `field` is a
  characteristic-type ID but generic `affects` selects profile families,
  recursive entries, or other owner-relative paths
- Migration policy for future local-roster-draft versions; version 1 currently
  preserves generated occurrence IDs and opaque definition keys as strings
- Whether automatic initialization should prefer repeated occurrences or one
  explicit amount when either representation could satisfy the same minimum
- Exact BattleScribe eligibility beyond direct projected hierarchy, including
  category, hidden, constraint, and modifier behavior
- Exact BattleScribe parity for child-modifier execution order and failure
  semantics inside a modifier group. RosterForge uses direct owner modifiers,
  then top-level groups in source order, with each group's direct children
  before nested groups

Uncertain or unsupported behavior must be diagnosed rather than silently
accepted in later layers.

## Schema And Real-Data Tolerance

The projection follows the BattleScribe 2.03 game-system and catalogue schema
shape while remaining tolerant of real BSData extensions. In particular,
modifier kinds are strings. Values observed outside the schema's closed set,
including `replace` and `floor`, are preserved rather than rejected.

The JSON files observed in `BSData/wh40k-11e` are a JSON serialization of that
same BattleScribe 2.03 shape, not a separate roster domain. Arrays represent
repeated collections, native properties represent XML attributes or simple
text children, and `$text` represents text on attributed elements such as
characteristics. Root objects retain the historical catalogue or game-system
namespace and declare `battleScribeVersion` `2.03`.

At commit `54c189f4fd01878351fab05586d3b38d9c7f6ddc`, all 46 JSON files import:
one game system and 45 catalogues. All 45 catalogue contexts compose. One
explicit typed-value discrepancy is retained and diagnosed:
`Warhammer 40,000.json` gives the hidden `Enhancements` cost type an empty
string `defaultCostLimit`. An empty string is not treated as absence or zero,
so its typed numeric property is absent and
`BS_PROJECTION_INVALID_ATTRIBUTE` remains observable.

On August 13, 2026, the same 46-file checkout was measured through the local
Vite application in a Chromium browser on Windows. The selected files totalled
67,554,454 bytes (64.42 MiB). From file selection to a visible catalogue
library, the end-to-end browser operation took 3,324 ms. A temporary
development-only probe measured 2,608.4 ms from the start of application import
through two animation frames after the loaded state was committed. JavaScript
heap usage rose from 152,078,277 bytes (145.0 MiB) to 821,735,425 bytes
(783.7 MiB), an increase of 669,657,148 bytes (638.6 MiB). The probe was removed
after measurement.

The measured result retained all 46 imports, exposed 36 non-library catalogue
choices, rendered 823 DOM elements, and produced no browser-console warnings or
errors. Its 65 issues were the expected one invalid projected attribute, two
duplicate-ID groups, 60 grouped missing-reference diagnostics representing 147
source occurrences, and two entry-link cycles. Whole-repository import remains
a supported compatibility path, but its heap cost is too high to make it the
default acquisition design. Repository acquisition should load a selected
catalogue's pinned dependency closure and retain the all-repository path for
explicit diagnostics and compatibility testing.

The first headless acquisition boundary now supports GitHub repositories pinned
to exact full commit SHAs. It can list a bounded recursive commit tree, retain
supported file paths plus blob IDs and sizes, stream one exact raw file under a
byte limit, assign download provenance, and pass those bytes through ordinary
BattleScribe ingestion. It does not track branches or `latest` assets and does
not treat the remote source as trusted merely because it is pinned.

When a caller supplies the optional byte-cache interface, tree-file acquisition
verifies both the declared size and Git blob object ID before accepting a cache
hit or network response. Corrupt cache entries fall back to the network;
unavailable cache storage does not block a valid download. The web application
has defensive IndexedDB adapters for copied source bytes and bounded metadata.
Byte records are isolated by provider, repository, commit, path, and blob ID.
Metadata records are isolated by provider, repository, commit, and pinned tree
object ID; their versioned JSON payloads are bounded and structurally decoded
before service-level report/tree consistency checks. Malformed, oversized,
unavailable, or tree-incompatible metadata falls back to fresh sequential
indexing. No eviction policy or quota-management UI is implemented yet.

The headless orchestrator can now build a compact remote metadata index by
processing the pinned tree sequentially, then acquire only the selected
catalogue's exact-ID closure. Parsed documents and source arrays from the full
indexing pass are not retained by the report; a caller-supplied durable byte
cache avoids a second network transfer. Closure documents are re-ingested and
must match the root identity and ordered catalogue-link target IDs used by the
plan before they are exposed. Indexing and closure acquisition expose
best-effort per-file progress snapshots suitable for cancellation-aware UI.
The browser now presents an immutable WH40K 11e source, progress and
cancellation for indexing and closure acquisition, non-library faction
selection, repository diagnostics, focused closure composition, and durable
compact metadata indexing. A metadata hit avoids full-repository reparsing but
does not bypass tree listing, verified closure acquisition, secure ingestion, or
summary matching. A successful closure replaces the active library only after
composition succeeds. Local file import remains available. Cache management,
additional source configuration, and repository update discovery remain
deferred.

Already-ingested closure documents can now use the same graph/context
composition path as local batches without changing their download provenance or
source-byte identity. This is composition only; it does not imply dependency
resolution beyond the acquired closure or any evaluation behavior.

At the August 13, 2026 inspection point, `BSData/wh40k-11e` had no latest
GitHub release asset and the official BSData gallery registry did not contain
an 11th-edition repository record. The pinned checkout itself also has no
BattleScribe repository-index file mapping root IDs to paths. Consequently, the
current generic boundary uses the exact Git commit tree rather than depending
on a moving gallery or release package. Building the root-ID index therefore
requires one bounded sequential pass over supported source files. A future
curated or upstream manifest may optimize that pass only if downloaded document
IDs are still verified.

The pure closure planner has a pinned-corpus proof at commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`. From the complete parsed metadata
index it derives a complete seven-file Imperial Knights closure and a complete
four-file Aeldari closure with no dependency diagnostics. Both begin with
`Warhammer 40,000.json`; dependencies follow catalogue-link declaration order
with transitive children visited depth-first. Normal acquisition and planner
tests use fictional data and mocked responses, so no third-party files or live
network dependency enter the standard suite.

A read-only orchestration proof against the same external checkout indexed all
46 files sequentially from 67,554,454 verified cached bytes, then reacquired the
seven-file Imperial Knights closure entirely from cache. The focused closure
retained 7,737,141 source bytes. Serializing the bounded metadata-cache entry
produced 182,354 bytes for 46 document summaries, 109 catalogue links, and one
diagnostic, comfortably below the 32 MiB browser limit. Both operation statuses
were `complete`; the only diagnostic was the existing source-located invalid
empty `defaultCostLimit` from `Warhammer 40,000.json`. Acquisition completeness
here means every planned source was verified and ingested, not that all
projected BattleScribe behavior is supported or legal.

The pinned JSON also extends the 2.03 condition-group shape in two ways. It has
339 `localConditionGroup` objects under ordinary `and` groups. Every local
object uses `type="atLeast"`, `field="selections"`, and `scope="parent"`, and
contains one nested `before` condition plus one nested `instanceOf` condition.
It also has 59 ordinary condition groups with the unknown type `count`.
RosterForge projects local objects and their nested conditions separately,
retains `count` as a string, and keeps both behaviors unresolved rather than
misclassifying local-bearing groups as empty or inventing extension semantics.

The same corpus contains 97 selection entries or entry links with
`defaultAmount` or `step` metadata. Eighty-nine defaults are native JSON
numbers, while seven are comma-delimited strings: six `"1,1"` values and one
`"1,1,1"`. One Points Limit entry supplies `step` as the string `"250"`.
These values cannot share one lossless numeric projection, so both fields stay
lexical and the generic JSON node remains authoritative. The editor displays
the source default and uses a positive numeric step only as an input hint; it
does not infer comma semantics or apply dynamic defaults.

Across those files, 2,826 repeats all query `field="selections"`. Observed
divisors are positive, multipliers are non-negative integers, 2,824 use floor
behavior and two set `roundUp: true`. Real repeat and condition objects also
carry schema-adjacent metadata such as `id`, `childName`, and condition
`comment`; these strings are projected and treated as inert. Percentage,
generic-extension, multiple-repeat, and modifier-group repeat execution remains
unsupported even when the source shape is preserved.

Selecting all 46 documents together now composes without truncating
materialization. Repository-wide typed reference candidates support observed
shared cost types and reverse references from shared definitions, while
effective entry/info links are limited to the source document's
catalogue/game-system closure. Equal IDs in unrelated catalogues therefore do
not make a roster definition ambiguous. The corpus still has two duplicate-ID
groups that can coexist in a resolution closure and two real entry-link cycles.

Observed selector strings are preserved but no longer diagnosed as missing
IDs. Constraint scopes include `model`, `unit`, and `root-entry`; condition and
repeat child selectors include `any`, `model`, `roster`, and `upgrade`; 141
selection-entry groups use `defaultSelectionEntryId: "none"`. Conditions in
`primary-catalogue` scope also use catalogue document IDs, which resolve as
document targets rather than selection objects.

The same pinned JSON corpus contains 109 constraint objects with a native
Boolean `automatic` property that is not part of the supported BattleScribe
2.03 typed constraint surface. The generic JSON/XML node retains each value.
Initialization ignores max-only occurrences when no automatic minimum is
needed; if such an extension affects a bound required for automatic expansion,
the planner leaves that expansion incomplete instead of inventing semantics.

The Army Roster force definition has one constraint with a native `message`
property, also outside the 2.03 typed constraint surface. Its exact text remains
on the generic node. Force-constraint inspection treats it as non-behavioral
display metadata; it does not parse the `{value}` placeholder or alter the
numeric limit.

The corpus contains 59 shared info-group definitions and 129 links of observed
type `infoGroup`. These now project and materialize as recursive,
provenance-preserving groups. Their nested profiles and rule links are visible
in roster occurrence details. Enabling this typed path introduces no additional
diagnostics at the pinned commit. The JSON adapter requires an explicit
`sharedInfoGroups` array-to-`infoGroup` item mapping; ordinary English
singularization would incorrectly produce `sharedInfoGroup`.

At the pinned commit, the remaining missing-reference reports all identify IDs
absent from every supplied file: 66 occurrences of 57 distinct
selection-entry-group defaults, plus 81 cost occurrences grouped under three
undefined cost-type IDs (`8349-b76c-37ea-696b`,
`46a1-6b58-ecdd-8087`, and `c5fb-5b9b-89f6-86c`). Grouped diagnostics retain
the first source location, total occurrence count, and up to 25 occurrence
paths. These are real-data discrepancies rather than JSON compatibility
failures.

A seven-file Imperial Knights dependency closure at the same commit composes
without exhausting the materialization budget: the game system, Imperial
Knights catalogue and library, Agents of the Imperium, Adeptus Mechanicus,
Titans library, and Unaligned Forces. The integration test creates an Imperial
Knights roster session, adds a linked-library `Knight Paladin`, traverses its
Wargear group to the expected weapon choices, and evaluates its base total as
375 points. The all-repository test also proves every non-library catalogue has
at least one force definition and one resolved root choice. A focused closure
remains faster to import, but all-repository selection is also supported by the
compatibility test.

A four-file Aeldari closure proves the supported initialization and transparent
choice behavior against real data. Creating an empty Army Roster adds Detachment,
`Battle Focus - Agile Manoeuvres`, Battle Size, and Force Disposition from
their effective minimums in visible source order. Show/Hide Options has an
unconditional modifier that reduces its minimum to zero, so it remains
optional. Conditional Crusade-only roots are omitted without action
diagnostics.

Battle Size then exposes its required max-one group as the ordered concrete
choices Incursion, Strike Force, and Onslaught. Selecting Strike Force creates
that entry directly under Battle Size, not an intermediate group occurrence.
The sibling Boarding Actions group is hidden for an Army Roster by its observed
`notInstanceOf` force condition, so it is neither offered nor reported as a
second required Battle Size. Static hidden entries can still remain labeled
when an unsupported modifier makes their effective state unresolved; an entry
whose effective hidden state is definitively true is not offered.

`Guardian Defenders` then uses parent minima of 10 Guardian Defender models and
one Heavy Weapon Platform. Each model's required weapons also use parent
minima. The linked Heavy Weapons group has a minimum of one and names its
Shuriken Cannon entry link as `defaultSelectionEntryId`. Adding the unit creates
33 descendants, or 34 occurrences for the unit subtree and 39 total including
the four initialized roots and selected Strike Force, without selecting
optional Crusade branches. The complete integration path also chooses Warhost
and Purge the Foe, producing 41 occurrences.

That configured roster totals 90 points, spends three Detachment Points on
Warhost, and spends zero Enhancements. The supported-validation composition has
no known violations. Its points maximum is now exactly 2,000: the standard
Strike Force set operation is followed by the optional Points Limit repeat,
whose absent selection produces a supported zero-repetition no-op. Grouped
selection constraints on the configured roster now contribute numeric steps
without group-unsupported diagnostics. Overall completeness remains incomplete
where other projected behavior is unsupported; this result is still supported
validation rather than full BattleScribe legality.

The optional real-data integration test reads an external clone without
committing third-party data:

```powershell
$env:ROSTERFORGE_BSDATA_JSON_DIR = "E:\GitHub\wh40k-11e"
pnpm exec vitest run apps/web/src/bsdata-json.integration.test.ts
```

The pinned 10th-edition game system also contains `set-primary` and `add`
modifier kinds and generic modifier attributes such as `affects`, `arg`,
`join`, and `position`; repeats use an observed `roundUp` attribute. These
remain available through the generic XML node, including on modifiers owned by
profiles. Numeric evaluation supports `floor` as a minimum because the pinned
data orders it after decrements to cap the lower bound. `replace`,
`set-primary`, `add`, string `append`, characteristic-targeting operations,
and all behavior-bearing generic attributes remain preserved and unapplied.

At the same pinned commit, 1,741 modifiers target characteristic-type IDs. Of
those, 484 are profile-owned; 1,151 are inside modifier groups and 700 carry
nonnumeric values. The observed operations are 490 `append`, 415 `set`, 451
`increment`, 163 `decrement`, 189 `replace`, 25 `floor`, and 8 `ceil`. Across
this target set, `affects` appears 1,265 times, `join` 759 times, `arg` 286
times, and `position` 161 times. The 1,257 modifiers owned by selection
entries, entry links, info links, and selection-entry groups are outside the
current display boundary. 1,249 of them carry `affects`, a `scope`, or both, so
retargeting must be understood before they can execute. The remaining eight are
owned by info links, where the modifier sits on the link rather than on the
profile it displays; that owner relationship is a separate decision.

The 484 profile-owned characteristic modifiers are the inventory behind the
current display evaluator. 369 are direct and 115 are inside the profile's own
modifier groups. Their operations are 213 `append`, 205 `set`, 54 `increment`,
six `decrement`, four `floor`, and two `replace`. 384 carry direct conditions,
53 carry condition groups, and none carries a repeat. Sixteen use `scope="model"`
and three omit `value`. As generic extensions, `join` appears 244 times,
`affects` 16 times, `arg` twice, and `position` never; 238 modifiers carry none
of the four. 478 name a characteristic type present on their own profile, six do
not, and no profile in the corpus repeats a characteristic type, so no observed
target is ambiguous.

That leaves an executable subset of 173 modifiers — 117 direct and 56 grouped —
that are `set`, scope-free, extension-free, valued, and matched to exactly one
characteristic on their own profile. Only two of them are unconditional: the
Adeptus Custodes `Custodian Guard (Shield)` and `Custodian Guard (Vexilla)`
profiles each raise `W` from `3` to `4`. Every one of the 484 has a condition
surface whose shape the existing evaluator already supports, so applicability is
not the limiting factor; operation semantics are. One `set` in `Necrons.json`
gives the `Keywords` characteristic of `Staff of light` a native JSON Boolean;
that value projects to the lexical string `true` and is replaced literally
rather than being reinterpreted.

The pinned corpus also contains 694 profile-owned modifiers in total. Besides
the 478 that route to a characteristic on their own profile, 154 target
`hidden`, 51 target an undocumented `annotation` field, five target `name`, and
six name a characteristic type belonging to another profile.

The 154 `hidden` modifiers now execute through profile-visibility evaluation.
Every one is a direct `set` with a native JSON Boolean `true`, no scope, no
repeat, and no generic attribute, so all 154 fit the supported shape; 125 carry
direct conditions and 29 carry condition groups, and none is unconditional. No
profile-owned `hidden` modifier is grouped and none sets `false`. Exactly one of
the 13,451 projected-and-generic profiles declares a static `hidden="true"`.
Because a `hidden` modifier cannot change a characteristic value, it no longer
makes a characteristic report incomplete; visibility owns its own completeness.
The remaining `annotation`, `name`, and cross-profile characteristic modifiers
are still retained as unrouted display behavior and still make their
characteristic report incomplete.

The pinned corpus contains 892 `field="category"` modifiers: 532 `add`, 328
`set-primary`, 27 `remove`, and five `unset-primary`. All 892 values resolve to
a category entry. They are owned by 747 selection entries and 145 entry links,
566 directly and 326 inside modifier groups. 611 are scope-free; the 281 scoped
forms use `root-entry` 99, `parent` 78, `model` 68, `upgrade` 31, `force` four,
and `roster` once. Generic attributes appear as `affects` 89, `arg` 83, and
`join` 79. 463 carry conditions, four carry condition groups, and none carries a
repeat.

The executable subset is **761** — every `add`, `remove`, `set-primary`, and
`unset-primary` that is extension-free, repeat-free, resolving, and either
scope-free or using the supported `parent`/`root-entry` anchors. It was 283
before scope resolution and 428 before `set-primary` execution. `add` is unambiguous: 273
of the 274 create a new membership and one is redundant with an existing link.
`set-primary` now executes too. The BattleScribe 2.03.00 release notes settle
the membership half outright — "When setting a Category to primary, the Category
will be added if it doesn't already exist" — matching the 322 of 325
executable-shaped instances that name a category their owner does not link.
Displacement of a previous primary is an inference from the single-slot display
model, corroborated by the corpus: only five of 319 `set-primary` owners pair an
`unset-primary`, and 234 owners would hold more than one primary without
displacement.

Conditions now refuse to answer confidently when a candidate's own category
modifier names the queried category, so a category-controlled comparison reports
unresolved and incomplete instead of a possibly wrong match. The downgrade is
narrow: a modifier naming a different category is ignored, and a candidate with
no relevant modifier still produces an exact count. A scoped category modifier
owned by a *different* occurrence can still reach this one, and that case is not
detectable from the candidate alone; it remains an explicit gap. At the pinned
commit this change moved none of the existing real-data assertions.

Feeding effective membership into condition identity was measured before being
attempted, and scope resolution changed the answer substantially. Of the 5,047
category-referencing conditions, 3,340 name a category no modifier touches.
Before `parent`/`root-entry` anchors were supported, only 127 would have become
knowable and 1,580 would have stayed unresolved, with 70 of the 100
modifier-controlled categories blocked. Scope resolution moved that to 1,048 and
659 with 20 blocked, and executing `set-primary` moved it again to **1,605
knowable and 102 unresolved**, with only **8** categories still blocked.

Those last eight are blocked by generic behavior attributes, chiefly `affects`.
Note that scope resolution unlocked no characteristic modifiers at all: of the
1,812 scoped modifiers in the corpus, 1,617 also carry `affects`, so that
surface needs both mechanisms and a rule for how they compose.

Category membership is **not** yet an input to condition evaluation. The corpus
has 5,047 conditions that reference a category entry — 1,991 `instanceOf`, 2,146
`notInstanceOf`, and 910 numeric counts — and they continue to compare the
static materialized links. Feeding effective membership back into condition
identity would change every report built on those conditions, and seven of the
892 category modifiers have conditions that themselves query a category, so an
evaluation order would have to be defined first. That remains an open decision.

The `affects` selector grammar is closed at the pinned commit. Its 1,859
occurrences use only 79 distinct values, and every segment falls into a small
closed vocabulary: `self`, `entries`, `forces`, `recursive`, `profiles`, a
profile-type name, or one object ID. Nothing is unresolved and nothing is
unclassified.

Parsing those 1,859 values yields 1,835 supported selectors and 24 unsupported
ones, all 24 force traversals. Traversal splits 344 owner-only, 168 direct-child,
and 1,347 recursive. By terminus, 1,753 target profiles and 106 target the
reached occurrences; 89 of those 106 are `category` modifiers, 15 are
`annotation`, and two are `decrement` on cost or characteristic fields. One
selections-terminus value also carries a force traversal and so stays
unsupported. 428 selectors embed
one filter ID: 427 resolve to a category entry and one to a selection entry, and
none is unresolved. Only three distinct profile-type names appear across the
whole corpus, and all three are declared profile types; the 30 declared types
have 30 distinct names, so no name is ambiguous.

Of the 1,265 characteristic-targeting modifiers that carry `affects`, 1,246
parse into the supported shape. That is a statement about syntax only; nothing
executes them yet.

`affects` is a **New Recruit extension rather than a BattleScribe 2.03
feature** — it appears in no BattleScribe release note or schema. That explains
why 1,617 modifiers carry both `affects` and a `scope`: BattleScribe ignores the
former and honours the latter, so authors write both.

New Recruit's open-source data editor settles part of the grammar. The segment
after `profiles` matches a declared profile-type **name, case-insensitively**,
with `all` or an absent segment meaning any type and an unmatched name treated
as invalid authoring. The `position` attribute is a 1-based index of which match
within a value to affect, where negative counts from the end and `0` means all;
it applies to string operations such as `replace`, not to append placement.
`affects` and `scope` **compose**: the scope chooses the occurrence the selector
stands on, the selector chooses where it walks from there. An earlier reading
had `affects` override `scope` outright; New Recruit disproved it on 2026-08-20
(see the architecture document's `affects` anchoring section).

Traversal now executes for every verified form. A selector declared by *any*
occurrence routes to this profile when the occurrence falls in its target set:
`own` reaches the anchor, `children` its direct child entries plus group members
when the selector carries `group`, and `descendants` every descendant. An embedded category ID filters the set using the same
effective membership condition identity uses; unknown membership leaves the
report incomplete rather than guessing.

Only `set` executes, so the visible unlock stays bounded by the lexical kernel.
Everything else becomes correctly-attributed incompleteness on the profile it
would have reached, instead of silence.

A pinned proof exercises the whole path against real data. A Death Guard
Helbrute's `self.entries.recursive.<category>.profiles.Melee Weapons` increment
reaches a Power scourge and a Helbrute hammer that sit **two group levels**
below the model, while `Close combat weapon` — the one melee profile outside
that category — receives no routed step at all and keeps its known value. That
is the same discrimination confirmed in New Recruit. The routed step is
unapplied rather than applied, carrying both `unsupportedType` for `increment`
and `unsupportedAttributes` for the modifier's `position: -1`, so the profile
reports an unknown Attacks value rather than a wrong one.

Both remaining questions were settled by experiment against New Recruit on
2026-08-19, using units whose live data matches the pinned snapshot verbatim.

**Traversal.** A Necron Skorpekh Lord's unconditional
`self.entries.profiles.Melee Weapons` increment does *not* change its Flensing
claw, because that weapon sits inside the model's `Wargear` selection-entry
group. A Death Guard Helbrute's `self.entries.recursive.…` increment *does*
change equivalent group members. So `entries` is the direct child **entry**
collection and does not descend into groups, while `recursive` reaches all
descendants.

**The embedded ID filters.** With two `Helbrute melee weapon` category members
selected, both gained +2 Attacks while the `Close combat weapon` — the one melee
profile outside that category — was unchanged. Dropping to one member removed
the bonus, matching the modifier's own `atLeast 2` condition.

Live data also carries a **`group`** traversal segment that the pinned snapshot
does not contain at all: forms such as
`self.entries.group.recursive.profiles.Ranged Weapons` and
`group.recursive.group.profiles.Unit`. It is the author's way of entering
selection-entry groups without full recursion, which independently confirms that
groups are a traversal step rather than transparent. The parser accepts the
keyword in any position; no pinned-corpus count changes, because no pinned
selector uses it.

One question stays open, and is not worth an experiment: what an embedded ID
does when it names a selection entry rather than a category. The whole corpus
contains a single instance.

Three category entries in the corpus carry information collections that
BattleScribe 2.03 does not declare on a category entry. `Recon Augury`
(`40ce-cefb-031e-75a4`) in `Imperium - Adeptus Mechanicus.json` owns the
`Enhanced Augurs` Abilities profile, whose single conditional `set hidden`
modifier is the 154th. `Faction: Legions of Excess` in
`Chaos - Emperor's Children.json` owns a rule, and `Shadow Legion` in
`Chaos - Chaos Daemons Library.json` owns a `rule` info link. All three
collections are now projected, indexed as ordinary graph objects, and their
references resolve like any other container's, so typed-projection counts match
the source: 13,451 profiles and 154 profile-owned `hidden` modifiers.

Projecting them does not make category entries selectable or give them
evaluation behavior. Category definitions remain structural, and nothing
materializes a category entry into a roster occurrence, so these profiles and
rules are observable through the graph rather than rendered in occurrence
details.

The integration proof imports the six-file Adeptus Custodes closure — the game
system, Adeptus Custodes, Imperial Knights Library, Agents of the Imperium,
Titans library, and Unaligned Forces — adds a `Custodian Guard` unit, its
`4-5 Custodian Guard` group, and the `Sentinel Blade & Praesidium Shield` model,
then evaluates that model's `Custodian Guard (Shield)` profile. The report is
`complete`, emits no diagnostics, and yields `M 6"`, `T 6`, `Sv 2+`, `W 4`,
`LD 6+`, `OC 2`, `InSv 4+` from a base `W` of `3`.

The same pinned corpus contains selection-count conditions using all six
supported numeric comparisons plus `instanceOf` and `notInstanceOf`. Observed
scopes include `parent`, `force`, `roster`, `self`, `ancestor`, `root-entry`,
`primary-catalogue`, `upgrade`, `model`, `unit`, and `model-or-unit`; condition
fields also include `forces`, cost-type IDs, and characteristic-type IDs.

The ordinary projected condition surface contains 1,084 identity comparisons
in `parent` scope and 72 in `self` scope. These now inspect the immediate
selection parent or exact owner, respectively, without treating numeric
parent-scope siblings or child-traversal flags as identity candidates.
Unavailable or ambiguous definitions remain unresolved rather than becoming a
known mismatch.

Real JSON also contains 339 `localConditionGroups` extensions beneath ordinary
condition groups. Each observed local group includes a non-2.03 `before`
condition and a self-scoped identity condition. The generic ordered JSON/XML
tree preserves this extension, but it is not projected into the ordinary
condition-group collection; the enclosing projected group therefore remains
empty, diagnostic, and unresolved. These 339 preserved identity conditions are
separate from the 72 ordinary projected self-scope conditions. A further 59
ordinary condition groups use unknown `type="count"`; they remain projected as
unknown strings and unresolved.

Across all 46 pinned 11th-edition JSON documents, 3,587 conditions use
`ancestor`, `root-entry`, or `upgrade`. The supported shape covers 3,442 of
them: identity-only ancestor checks, root-entry selection counts and identity,
and nearest-upgrade selection counts and identity. Category target IDs account
for most ancestor identity checks; selection IDs, entry-link IDs, `any`, and
selection type tokens are also retained as effective identities. The remaining
145 use cost-type fields. The 143 root-entry forms now use the conservative
static-cost path; the two numeric ancestor forms stay incomplete. Shared
force-definition counts in roster scope and containing-force identity remain
supported. All 769 observed `primary-catalogue` conditions are identity
comparisons and now compare the exact selected catalogue document ID; one uses
the otherwise ignored `forces` field and the rest use `selections`. Other
identity and field/scope combinations remain incomplete. Generic `childName`
and condition `id` attributes are preserved and treated as non-behavioral
metadata.

The Army Roster force definition also owns numeric selection-count conditions
with `field="selections"` and `scope="force"` or `scope="roster"`. They query Battle Size and
override selections while setting force-owned constraint limits. The evaluator
now counts those selections from the exact force or top-level roster collection
and follows the explicit child traversal flags. The three target constraints use reachable
Detachment Points, points, and Enhancements cost-type IDs in parent or force
scope. Their selection totals are now inspected exactly; the standard direct
points-limit repeat is supported. Supported constraint and cost groups use
inherited applicability and deterministic ordered arithmetic in their
condition-aware reports. Other modifier surfaces remain incomplete.

The corpus also contains 490 conditions scoped to `unit`, `model`, or
`model-or-unit`. The nearest typed owner-or-ancestor interpretation supports
482 of them, including three that query the static Crusade Experience cost
field. Eight have no comparison type and retain their existing missing-type
diagnostics.

In total, 148 observed conditions query the Crusade Experience or Battle
Honours cost types. The 146 root-entry or typed-scope forms can sum filtered
projected base costs when every matched roster occurrence is uniquely resolved
and has no modifier targeting that cost. The two numeric ancestor forms remain
unsupported. Modifier-controlled, malformed, or duplicate matched costs remain
unresolved at runtime; this deliberately avoids recursive effective-cost
evaluation.

All 1,044 observed ID-valued condition scopes query numeric selection counts.
Their targets resolve to 1,028 selection entries, ten selection-entry groups,
and six entry links, so the nearest effective owner-or-ancestor interpretation
supports their scope shape. Category-entry scope IDs are supported by the same
identity model and covered synthetically. Missing targets and IDs that resolve
to force entries or other object kinds remain incomplete instead of producing
an exact zero count.

The pinned game system contains 301 constraints. Common compatible shapes use
`type="min"` or `type="max"`, `field="selections"`, and parent, force, or roster
scope; it also contains self and root-entry scopes, `field="forces"`,
characteristic-ID fields, negative `-1` limits, and an observed generic
`negative` attribute. There are 26 negative limits: 21 `max` and five `min`;
17 target selections and nine target the points cost type; five use parent,
15 force, and six roster scope. The standalone inspector supports only
non-negative selection counts in self, parent, force, and roster scope.
RosterForge intentionally does not reinterpret `-1` as zero, infinity, or a
disabled bound because that sentinel meaning is not established by the source
shape. The values remain projected and produce incomplete source-located
diagnostics. This is a closed compatibility decision, not an open modeling
question.

Two constraints in the pinned game system are owned by the nested `Crusade
Army` force entry and use `field="forces"`, `scope="roster"`, and
`shared="true"`: a minimum of zero and a maximum of one. Both explicitly
include child forces. This establishes the current force-constraint inspection
identity shape. The pinned 11th-edition Army Roster adds the three cost-type
forms above. A synthetic exact parent-scope total and an incomplete modifier
sequence cover both outcomes without committing third-party game data.

Fifty-nine modifiers in that pinned game system target projected constraint
IDs: 57 use `set` and two use `increment`. The current inspector detects
targeting modifiers present on the resolved owner choice, retains them, and
marks effective status unresolved in base scope. Eleven direct `set` targets
have no conditions, condition groups, repeats, scope, or behavior extension and
are structurally eligible for the unconditional scope. Supported conditions on
direct targets can instead participate in the conditional scope. It does not
search ancestor and force-definition modifier surfaces.

Across all 46 files at pinned 11th-edition commit
`54c189f4fd01878351fab05586d3b38d9c7f6ddc`, 1,491 `and` modifier groups
contain descendants targeting projected constraint IDs. Their 4,038 target
operations comprise 2,865 `increment`, 1,167 `set`, four `decrement`, and two
unsupported `multiply` values. The corpus includes 14 group-level conditions,
three group-level condition groups, one nested group, one group-level repeat,
1,187 child-modifier condition lists, 234 child condition groups, and 2,687
child repeats. Most groups also carry an inert `comment` string. RosterForge
preserves all of these; supported numeric children execute in the documented
order, while the two unknown operations and group-level repeat remain
incomplete and source-located.

The same corpus contains 305 cost-targeting modifiers in 130 modifier groups:
23 `set`, 131 `increment`, 21 `decrement`, and 130 unsupported `divide`
operations. All are top-level group children. Of the containing groups, 123 use
`type="and"` and seven omit `type`; none has a group-level repeat. Twenty-three
child modifiers carry selection-count repeats. The condition-aware cost report
executes supported children and exact supported child repeats. Missing group
types, `divide`, unresolved applicability, and unsupported repeat shapes remain
preserved, source-located, and incomplete.

At pinned commit `52914f259d4e509379fc653e3b13d2e38edb102e`, the
10th-edition game system contains 40 modifier groups. Every group uses
`type="and"`, contains a direct modifier collection, has no nested modifier
group, and has no group-level condition, condition-group, or repeat collection.
Some child modifiers do carry their own conditions. Together with the richer
11th-edition shapes above, this supports the recursive `and` applicability and
bounded constraint-execution surface. It does not establish exact BattleScribe
ordering parity or semantics for other group types. Unknown group types remain
preserved and unresolved rather than rejected.

Representative checks used:

- BattleScribe 2.03 schema URLs under
  `https://www.battlescribe.net/schema/`;
- `BSData/wh40k-10e`, `Warhammer 40,000.gst`, observed blob
  `576537b414cad9c95febc0fe531d616eb5cb2f15`;
- `BSData/wh40k-9e`, `Warhammer 40,000.gst`, observed blob
  `b810f0fc73c47566d0bff5b46e6823c205e226a7`.
- `BSData/wh40k-10e`, commit
  `52914f259d4e509379fc653e3b13d2e38edb102e`, where faction catalogues use
  `importRootEntries="true"` for linked roots and root entries use
  `import="true"`;
- the same pinned data's `Imperium - Adeptus Titanicus.cat` and
  `Library - Titans.cat`, which demonstrate that shared targets remain useful
  through a catalogue link without root importing.
- the pinned 10th-edition game system's ordered profile-type and
  characteristic-type definitions, including an optional `defaultValue` of
  `Melee`;
- the same pinned game system's four top-level force definitions, including a
  force entry with a nested `forceEntries` collection; and
- the pinned `Imperium - Imperial Knights.cat`, which contains no local force
  entries and therefore exercises the game-system-definition model used by the
  force composition API;
- the pinned game system's 114 category definitions and the same sampled
  catalogue's lack of local category definitions; and
- 222 profiles across those two pinned files, with no characteristic type found
  outside its profile's declared profile type.

The historical `battlescribe.net/schema` URLs are retained as schema
identifiers in documents, but did not reliably serve the 2.03 XSD during this
session. The implementation therefore continues to rely on the previously
documented 2.03 shape, project fixtures, and pinned real-data observations
rather than downloading a moving schema URL during tests.

Third-party data is not committed. Normal tests use project-owned fictional
fixtures.
