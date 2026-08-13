# Architecture

## Package Direction

```text
foundation
  ^
  |
battlescribe-data

foundation + battlescribe-data <- repository
foundation <- data-graph
foundation <- roster-model
foundation + repository + roster-model <- persistence
data-graph + roster-model <- roster-builder
data-graph + roster-model <- evaluation
all application-facing packages <- apps/web
```

The arrows point from a package to a dependency. Circular dependencies are
forbidden. Core packages cannot import React, Vite, Zustand, or application
components.

## Current Slice

`foundation` defines stable IDs, source provenance, source locations,
diagnostics, result values, and independent validation validity/completeness
contracts.

`battlescribe-data` accepts untrusted `.gst`, `.cat`, `.gstz`, `.catz`, and
BattleScribe 2.03 `.json` input. It retains original imported bytes and, for
archives, extracted XML bytes with separate provenance. It rejects XML
declarations before parsing, enforces byte, archive, XML, and JSON structural
limits, keeps an ordered generic source representation, and creates read-only
BattleScribe 2.03 projections for known structures, including profile-type and
characteristic-type definitions and recursive force entries. It does not
resolve IDs or interpret rules.

`data-graph` consumes already-parsed BattleScribe documents. It builds
read-only ID indexes and reference records for known projected objects, then
reports duplicate IDs, missing references, and catalogue-link cycles as
diagnostics. It can also build read-only structural views for selection entries
and selection-entry groups reached through entry links, and per-catalogue views
of roots visible from caller-supplied game systems and catalogues. A separate
composition creates catalogue-facing views of local and matching game-system
force and category definitions. A compatibility inspector reports whether
uniquely resolved characteristic types belong to a profile's uniquely resolved
profile type. It does not fetch catalogue dependencies, mutate projections,
calculate costs, evaluate constraints/modifiers/conditions, construct rosters,
or validate roster legality.

`repository` owns bounded source acquisition and local-file batch ingestion. It
assigns deterministic provenance, preserves caller order, and returns an
ordered report for every accepted or rejected local file. Its headless GitHub
boundary accepts only full commit SHA pins, lists supported BattleScribe files
from a bounded commit tree, streams individual raw files under byte limits, and
passes downloaded bytes through ordinary secure ingestion. A separate pure
planner derives a selected catalogue's transitive dependency closure from an
already available repository metadata index using exact IDs. An optional
transport-neutral byte-cache contract supports integrity-checked read-through
acquisition without putting browser storage in the package. Sequential
orchestration can build the remote metadata index without retaining every
parsed document, then reacquire only a planned closure from verified cache or
network bytes. It does not persist documents itself, browse repositories in the
UI, or resolve links into mutable target objects.

`roster-model` defines an immutable structural roster tree with nested force and
selection occurrences. It depends only on `foundation`; source definitions are
represented by opaque keys plus optional BattleScribe `ObjectId` values rather
than graph or XML objects. Guarded commands append root forces, child forces,
force selections, and child selections, update names, reorder siblings, and
replace definitions or duplicate, relocate, and remove occurrence subtrees
without mutating prior state. Repeated definitions remain distinct occurrences;
each selection occurrence may additionally carry a positive finite amount,
with absence meaning one. It does not derive source defaults, calculate costs,
evaluate constraints or modifiers, validate legality, import `.ros` files, or
persist state.

`roster-builder` integrates catalogue contexts from `data-graph` with immutable
commands from `roster-model`. It derives stable opaque references from source
provenance and XML paths, checks that requested definitions are structurally
present in the selected context, and delegates state changes. It does not
evaluate parent-child eligibility, hidden state, costs, constraints, modifiers,
or legality.

`evaluation` consumes `data-graph` catalogue contexts and immutable
`roster-model` state. It is deterministic and read-only. The implemented
slice aggregates amount-scaled projected costs, applies understood direct and
condition-aware grouped numeric modifiers with supported applicability and
repeat reports, inspects amount-aware count bounds, and produces conservative
selection initialization plans. Grouped execution uses direct owner modifiers
first, then top-level groups in source order with direct children before nested
groups. A narrow repeat evaluator supports non-percentage selection-count
repeats with exact divisors, multipliers, and floor/round-up behavior. The
package also derives an aggregate status for supported root, direct-entry, and
transparent-group selection bounds and can compose it with the existing
selection-condition and force-condition constraint reports. The planner reads
only unconditional
non-negative integer `field="selections"`, `scope="parent"` bounds and explicit
group defaults. It also plans simple force- or roster-scoped minima for visible
roots in an empty single-force roster, applying supported unconditional numeric
bound modifiers. It does not mutate roster state or perform full legality
validation.

Profile and characteristic `typeId` references are ordinary graph references.
The graph does not infer targets from display names or validate that a
characteristic type belongs to a profile's selected profile type.

`persistence` owns the browser-independent, versioned local-roster-draft
envelope and its defensive decoder. The envelope retains an immutable
structural roster, the source-scoped catalogue key, import metadata, and copies
of every source file byte array. Optional selection amounts are stored in the
existing version-1 shape, while absent legacy amounts still mean one. It does
not serialize parsed XML, graph
objects, materialized choices, UI history, or evaluation reports.

`test-fixtures` owns small fictional fixture files.

`apps/web` exposes the headless local catalogue-library composer and a React
browser shell built with Vite. The browser shell reads caller-selected local
files, invokes the composer, presents ordered catalogue choices and file-level
diagnostics, inspects the selected catalogue context, edits one structural
roster with explicit occurrence amounts, and explicitly saves local drafts
through a native IndexedDB adapter.
Remote repository browsing and dependency-loading UI, full roster legality
validation, and export remain deferred.

`useRosterForgeAppController` owns application orchestration independently of
the rendered panel tree: ordered import requests, draft-list refreshes and
restoration, selected catalogue identity, bounded roster history, roster
commands, and action diagnostics. `App` consumes that controller and remains
the presentation-composition root. Saved-draft controls, catalogue-library and
import reporting, catalogue details and roster setup, transient workspace
states, diagnostic lists, detail rows, summary metrics, and locale formatting
live in focused presentation modules. `roster-workspace.tsx` owns the active
roster builder, supported checks, cost and constraint summaries, selection
editing, and rule/profile inspection without changing their behavior. Existing
dependency injection for catalogue preparation, draft storage, clocks, and
generated IDs is accepted by the hook through `AppProps`, preserving
deterministic UI tests. Repository acquisition controls will join this
controller boundary instead of adding another workflow directly to the
presentation component.

## Local Import Boundary

`importLocalBattleScribeFiles` accepts caller-supplied filenames and byte arrays
for `.gst`, `.cat`, `.gstz`, `.catz`, and `.json` files. Configurable batch
file-count and total-byte limits are checked before parsing. Each accepted file
then uses the ordinary secure ingestion limits and receives a source ID derived
from the caller-supplied batch ID and original zero-based position. A caller
re-ingesting retained bytes may instead provide the original branded source ID
and known source kind; those optional values preserve provenance but do not
bypass ingestion or byte limits.

The successful report retains input order, per-file diagnostics and status,
all successfully parsed documents, and source bytes for rejected files. A
batch can be `empty`, `complete`, `partial`, or `failed`; a rejected file does
not erase successfully imported siblings. Batch-limit failures return no
partial report because no file is parsed.

This API does not infer catalogue dependencies or open files named by catalogue
links. It has no filesystem, network, persistence, or browser dependency; the
application supplies the bytes.

## Pinned Repository Acquisition Boundary

`pinGitHubRepository` accepts an owner, repository name, and full lowercase
40-character commit SHA. Branches, tags, abbreviated SHAs, unsafe owner/name
components, and moving `latest` references are rejected. A successful
`PinnedGitHubRepository` is therefore an immutable source identity rather than
a claim that the remote content is trusted.

`listPinnedGitHubRepositoryFiles` reads GitHub's recursive tree for that exact
commit. The response body, entry count, and path length are bounded; truncated
trees, malformed UTF-8/JSON, duplicate supported paths, traversal components,
backslashes, control characters, and redirects are rejected. Only `.gst`,
`.cat`, `.gstz`, `.catz`, and `.json` blob paths enter the returned sorted tree.
Blob object IDs and declared sizes remain available to later orchestration.

`downloadPinnedGitHubFile` requests one validated path from the exact raw commit
URL. It checks a declared content length when present and otherwise accumulates
the response stream only up to the configured byte limit. It rejects redirects,
unsupported extensions, unavailable bodies, failed reads, and HTTP/network
failures with structured diagnostics. `acquirePinnedGitHubBattleScribeFile`
adds deterministic `download` provenance and delegates the retained bytes to
the existing secure ingestion path, so generic source nodes, projections,
unknown data, diagnostics, and original downloaded bytes retain their ordinary
semantics.

`readPinnedGitHubTreeFile` binds a path download to the corresponding pinned
tree entry. It verifies the declared tree size when available and calculates
the legacy Git blob SHA-1 over `blob <length>\0<bytes>` before any bytes are
accepted or cached. Cache keys include provider, owner, repository, commit,
path, and blob object ID. Cache hits are copied, bounded, and reverified before
use; invalid entries fall back to the network and are replaced. Cache read and
write failures are warnings when verified network acquisition succeeds.
`acquireCachedPinnedGitHubBattleScribeFile` then sends either verified source
through the same download-provenance and ingestion path. The package defines
only `PinnedRepositoryByteCache`. `apps/web` supplies the native IndexedDB
adapter in a separate versioned database. Its records copy the immutable cache
key, bytes, and optional media type; reads decode and bound each record before
the repository package performs the authoritative Git blob verification.
Eviction and quota policy remain application concerns.

`summarizeBattleScribeRepositoryDocument` creates the small metadata record
needed for closure planning from an accepted parsed document. The summary
retains exact root IDs, game-system IDs, catalogue-link target IDs and order,
plus source locations for link diagnostics. `planBattleScribeDependencyClosure`
requires an explicit selected catalogue path, places its exact game system
first, and traverses catalogue links depth-first in declaration order. Missing,
ambiguous, cross-system, or wrong-kind targets produce an `incomplete` plan;
cycles are diagnosed and deduplicated but do not make an otherwise fully
available closure incomplete.

`buildPinnedBattleScribeRepositoryIndex` preflights repository file-count and
declared total-byte limits, then reads, verifies, and securely ingests supported
tree files sequentially. It retains ordered per-file reports and compact
summaries, not parsed document trees or source byte arrays. Malformed files are
isolated as rejected reports while valid sibling summaries remain available.
An optional durable byte cache prevents those verified source bytes from being
downloaded again. An optional best-effort progress observer receives an initial
snapshot and one snapshot after each attempted file; observer failures cannot
change acquisition results.

`acquirePinnedBattleScribeDependencyClosure` combines the planner, pinned tree,
and read-through acquisition. It retains only accepted documents in plan order
and keeps an incomplete plan usable when a target is unavailable. Every
acquired document is checked against the summary that selected it, including
root kind, ID, name, game-system ID, library flag, and ordered catalogue-link
target IDs. A stale or fabricated metadata index therefore cannot silently
redirect a closure. The operation performs no graph resolution, catalogue
composition, roster construction, evaluation, or validation.

This slice still adds no GitHub authentication, gallery integration, retry
policy, metadata-index persistence, cache management UI, or acquisition UI.
Callers must not infer target paths from catalogue-link display names without
downloading and verifying exact IDs.

## Catalogue Library Boundary

`prepareLocalCatalogueLibrary` is the current application composition boundary.
It imports one local batch, resolves only its accepted documents, composes the
existing catalogue contexts, and derives one ordered choice for each imported
catalogue. A choice retains its source ID, BattleScribe ID and metadata, parsed
document, catalogue context, and whether the aggregate visible-root
materialization was truncated. Its key combines source provenance with the
catalogue ID so duplicate IDs from distinct local files remain distinguishable.

The library status is `ready` only when files imported completely, at least one
catalogue is available, and no stage emitted diagnostics. `partial` keeps
catalogue choices available alongside import or graph diagnostics;
`unavailable` means documents imported but none were catalogues; and `empty`
means no document was accepted. Stage diagnostics remain ordered from import,
graph resolution, then context composition.

The library is a read-only service result, not UI state. It does not choose a
catalogue, load missing game systems or linked catalogues, construct a roster,
persist bytes, or evaluate any BattleScribe behavior.

`prepareImportedCatalogueLibrary` is the shared composition half of this
boundary. It accepts an existing immutable import report, retains document and
provenance object identity, and performs only graph resolution and catalogue
context composition. Remote closure acquisition can therefore enter the same
application model without reparsing downloaded bytes as local files.

## Browser Application Boundary

The browser adapter converts the selected `File` objects to ordered
`LocalBattleScribeFile` values. It preserves filenames and non-empty media
types, labels their origin as `browser`, and passes the resulting bytes to the
same repository API used by non-UI callers. Selecting files again replaces the
current in-memory batch rather than merging repositories or resolving links.

The React shell has explicit idle, loading, loaded, and failed states. On a
successful composition it selects the first ordered catalogue by its
source-scoped key and lets the user choose another imported catalogue. The
inspector shows source metadata and counts from the exact composed context; it
does not flatten or reinterpret those definitions. Partial batches keep valid
catalogue choices available while rejected files and diagnostics remain
visible.

Concurrent file selections and draft restoration are ordered by an in-memory
request sequence, so a late result cannot replace a newer request. Draft-list
refreshes use a separate sequence for the same reason. The UI renders at most
50 diagnostic rows in one list for responsiveness, but complete diagnostic
collections remain on their service results.

Nothing is uploaded or placed in URLs. Selected bytes remain in memory unless
the user explicitly saves a roster draft; that draft stores the complete local
batch in IndexedDB so its context can be rebuilt. Browser file reading failures
are presented as transient UI errors; once repository ingestion starts, its
structured diagnostics pass through unchanged. The browser layer does not
fetch dependencies or enforce constraints. Its cost, constraint, and narrowly
scoped structural-status displays delegate unchanged roster and context values
to the read-only `evaluation` package; only the structural report exposes
validation dimensions, and it explicitly does not claim full legality.

## Local Draft Persistence Boundary

`createLocalRosterDraft` and `decodeLocalRosterDraft` define format
`rosterforge/local-roster-draft`, version 1. A draft contains its ID, creation
and update timestamps, selected catalogue key, original import batch ID and
timestamp, ordered source files with source IDs, source kinds, provenance
metadata, and bytes, and the immutable structural `Roster`. Decoding untrusted
stored values reconstructs
branded IDs only after shape, timestamp, duplicate-occurrence, text, byte,
node-count, and depth checks pass. Unknown object fields are ignored; unknown
formats and versions are rejected rather than guessed.

Default draft limits are 256 files, 256 MiB of source bytes, 50,000 force and
selection nodes, 256 roster levels, 4,096 characters for ordinary text, and
65,536 characters for an opaque definition key. Accepted byte arrays are
copied. Expected decode failures are structured persistence diagnostics.

The native adapter in `apps/web` stores validated envelopes in IndexedDB
database `rosterforge`, object store `local-roster-drafts`. The core
`persistence` package has no DOM or IndexedDB dependency. Listing tolerates a
malformed sibling record by returning valid summaries alongside its decoder
diagnostic. Load, save, and confirmed delete are explicit operations; there is
no automatic saving.

Opening a draft reruns the ordinary secure repository import, graph
resolution, and catalogue-context composition over the retained bytes. It then
matches the saved catalogue, force, and each selection definition by its
source-scoped key and optional source ID. Exact newly materialized choices are
placed back in the local session map. Parsed XML, generic nodes, original
bytes, provenance, and diagnostics therefore come from the rebuilt ordinary
pipeline rather than a serialized object graph. Optional source ID and source
kind fields preserve `download` provenance across this rebuild; older version-1
records that omit them retain their previous local-file behavior.

The current editor restores exactly one root force and rejects nested force
structures, because the browser UI cannot expose them without hiding data.
Missing or ambiguous definition matches also stop restoration. Bounded
undo/redo history, evaluation reports, and transient UI diagnostics are not
persisted.

## Roster Setup Boundary

`createLocalRosterSession` is the application boundary from one selected
catalogue choice to an immutable roster with one starting force. It delegates
catalogue-reference translation and force guards to `roster-builder`, retaining
the exact catalogue choice and force-definition wrapper beside the resulting
`roster-model` value. The session also retains a read-only occurrence-ID map to
the exact materialized choice used for each selection. Callers supply branded
roster, force-occurrence, and selection-occurrence IDs.

When the caller supplies a selection-ID factory,
`createLocalRosterSession` runs the empty-single-force root planner after
creating the force. Supported required visible entry roots are added in visible
source order through the same guarded root and descendant paths used by manual
editing. Conditional or grouped root-bound modifiers remain incomplete and do
not create an occurrence; supported unconditional modifiers can reduce a base
minimum to zero. Session creation remains atomic.

The browser offers only top-level definitions from the selected context's
ordered force collection. Creating a roster uses the trimmed user-supplied name
and selected definition, then displays the immutable roster and first force.
Changing setup discards that in-memory session and returns to the same catalogue
context; replacing local files also discards it.

`localRosterRootChoices` retains the selected context's visible-root order and
exposes only roots whose materialization resolved to a selection entry or
selection-entry group. `addLocalRosterRootSelection` delegates each direct
force-child addition to `roster-builder`. Repeated adds create distinct branded
selection occurrences that share the same immutable definition reference.
Hidden roots remain labeled and observable rather than being treated as an
eligibility rule.

`localRosterRootChoiceGroups` is a browser-facing organization over those same
root wrappers. The first explicitly primary category link is used only when its
target resolves to one composed category definition. Groups are created on
first root occurrence and preserve each category's visible-root order.
Missing, ambiguous, absent, or non-primary-only links remain in an explicit
`Uncategorized` group. Grouping neither removes roots nor changes builder
eligibility.

The browser can filter these grouped roots by case-insensitive effective name.
Filtering preserves category and root order, opens matching category
disclosures, and shows an explicit no-match state. It does not modify the
underlying group projection, materialized roots, visibility, or diagnostics.

The active roster workspace uses three stable destinations: `Roster`,
`Add units`, and `Checks`. A compact sticky navigator exposes live top-level
selection, filtered-choice, and supported-issue counts. On wide viewports the
selected roster and catalogue browser occupy separate side-by-side panes; on
narrow viewports they return to document order as full-width sections. While a
roster is active, this focused workspace occupies the full library shell and
the catalogue batch summary is hidden. Clearing roster setup restores that
summary without changing the imported library. Costs and supported-validation
summary stay above the builder, while detailed structural and constraint
reports follow it. Anchor navigation and pane state are UI concerns only and
never enter the immutable session, history, or draft.

The local library retains every composed catalogue context. The roster setup
surface derives an ordered `selectableCatalogues` subset by excluding projected
`library=true` documents; those library contexts continue to participate in
graph resolution, materialization, provenance, and diagnostics.

`inspectEmptySingleForceRootChoices` exposes supported force- and roster-scoped
integer minima and maxima for every resolved visible root. Bounds that are all
explicitly shared use the materialized definition ID; alternate visible links
therefore observe the same selected count. Other roots retain their visible
occurrence identity. `inspectLocalRosterRootChoices` joins those identities to
the current top-level force selections. The browser shows selected and required
counts and disables an add only when a supported maximum is reached.
Conditional, malformed, or extension-driven bounds remain incomplete and do
not become edit limits.

When an add caller supplies a descendant-ID factory, the session asks
`evaluation` for a read-only initialization plan before applying its safe
additions through the ordinary `roster-builder` child command. Required direct
entries become repeated occurrences. Selection-entry groups are transparent
containers: their already-required children count first, and a remaining
minimum uses the exact direct entry named by `defaultSelectionEntryId`.
`defaultSelectionEntryId="none"` and an absent default remain pending user
choices. Modifier-controlled, malformed, percentage, extension-driven, or
otherwise unsupported bounds are not guessed. The operation constructs one
new immutable session only after every planned child add succeeds, so a
duplicate generated ID or other builder failure exposes no partial session.
Each selected occurrence is limited to 4,096 automatically planned
descendants.

`inspectRosterSelectionChildChoices` provides the evaluation-side read-only
view of direct entries and transparent groups. It retains order, exposes only
concrete resolved entry choices, and reports supported parent-scoped integer
minima and maxima plus independent completeness. The group-only compatibility
wrapper remains available. Modifier-controlled or malformed bounds reuse
initialization diagnostics and remain unknown rather than becoming UI limits.

`inspectLocalRosterChildChoices` joins that group view to one exact roster
selection. Direct entries and resolved entry links remain quick-add choices
with live selected and remaining-required counts. A supported reached maximum
disables the corresponding browser add control.
Selection-entry groups become labeled presentation containers whose selected
count is derived from the parent's current direct child occurrences. The
browser never creates a group occurrence from these controls. A supported
max-one group replaces its prior concrete member atomically; other groups add
concrete entries through the ordinary guarded child command. The returned
session is committed only after removal and addition both succeed.

The lower-level `localRosterChildChoices` still exposes all materialized child
choices for compatibility and headless inspection. Unresolved entry links
remain unavailable as browser add controls and observable through existing
catalogue diagnostics.

`localRosterSelectionChoice` returns that same exact materialized wrapper for
read-only occurrence details. The browser presents direct profiles before
resolved profile info links and direct rules before resolved rule info links.
It separately presents direct and linked info groups, preserving group names,
recursive nested groups, and their direct or linked profiles and rules.
Characteristics retain projected order and text. Each detail identifies direct
or linked origin and the definition source filename. Unresolved info links
remain listed at their containing selection or group with their materialization
reason and existing diagnostics; the browser performs no additional reference
resolution or subtree cloning.

Recursive occurrence rendering places selected children in a disclosure.
Collections of more than two children start collapsed, preventing automatic
initialization from expanding dozens of model and wargear cards at once.
Smaller collections remain open. Disclosure state is ephemeral React state and
is not stored in roster history or drafts. When a supported-validation finding
belongs to a descendant selection, every collapsed ancestor disclosure opens
so the stable issue link reaches visible content.

`removeLocalRosterSelection` delegates occurrence removal to `roster-model`.
The selected occurrence subtree is removed by branded ID while sibling
occurrences and the prior immutable session remain unchanged. The returned
session also removes every deleted subtree ID from its materialized-choice map.

`evaluateLocalRosterCosts` delegates each current immutable snapshot to
`evaluateRosterCostsWithSelectionConditions`. The workspace renders ordered
supported totals, recursive selection count, excluded/unresolved summary
counts, existing evaluation diagnostics, and the report's independent
completeness. An incomplete report is labeled incomplete and its provisional
totals are never presented as authoritative BattleScribe parity. No evaluated
value is written into roster state or used to permit or reject an edit.

`inspectLocalRosterConstraints` delegates the same snapshot first to the
roster-wide selection collection in `selectionConditions` scope and then to
the roster-wide force collection in `conditions` scope. It retains both exact
reports, concatenates their existing diagnostics in that order, and derives
only shared completeness. The adapter intentionally has no combined status or
validity field. The workspace presents independent satisfied, violated, and
unresolved counts plus ordered bound details; none of them guard commands.

`inspectEmptySingleForceRosterStructuralStatus` is a separate aggregate over
the narrower selection structure understood by the editor. It inspects
supported visible-root, direct-entry, and transparent-group minima and maxima
in deterministic order. Top-level occurrences resolve against visible roots;
descendants resolve against the concrete choices of their exact materialized
parent. Parent-contextual resolution prevents a definition materialized
through another root link from making an otherwise exact child ambiguous.

Each structural bound retains known selected occurrences, a
`possibleSelectedCount` that includes unresolved candidates, an individual
`satisfied | violated | unresolved` status, and completeness. A lower bound is
violated only when even the possible count is too small; an upper bound is
violated only when the known count is already too large. The aggregate
`validity` is invalid when at least one bound is known violated. Aggregate
`completeness` is independent and becomes incomplete for unsupported bounds,
partial materialization, catalogue mismatch, unresolved occurrences, or an
unsupported force shape. Thus `valid` plus `incomplete` means no supported
violation is known, not that the roster is legal.

`inspectLocalRosterStructuralStatus` passes the current immutable roster and
catalogue context to that evaluator. It also passes the materialization flag
retained by the local catalogue choice, avoiding a full materialized-tree scan
on every browser render. Headless callers that omit the option receive the
same conservative fallback scan. The workspace presents validity and
completeness as separate badges and exposes ordered root, direct-child, and
group details. Violated and unresolved bounds are open first, while satisfied
bounds and diagnostics use separate collapsed disclosures. Direct and group
issues link to a stable anchor on their exact owning occurrence; root issues
link to the available-root editor. An unselected root whose effective minimum
and maximum are both unknown is not promoted into the actionable bound list;
its unsupported behavior contributes to one catalogue-level inactive-root
diagnostic without making roster structural completeness incomplete. Selecting
that root restores its source-located diagnostic, makes its unresolved bound
relevant and visible, and makes the report incomplete. Failed reachability,
partial materialization, and unresolved selected definitions remain
conservatively incomplete. Cost and constraint reports already inspect only
selected roster occurrences, so their reachable unsupported behavior is
unchanged by this structural relevance rule.

`evaluateRosterSelectionVisibility` applies ordered direct and grouped
`type="set" field="hidden"` Boolean modifiers when their condition
applicability is understood. Direct owner modifiers run first. Relevant
top-level groups then run in source order, with each group's direct modifiers
before nested groups depth-first. The report retains recursive group
applicability and exact modifier objects. Supported identity conditions can
inspect the owner, parent, containing force, selection ancestors, containing
root entry, nearest typed selection, or primary catalogue. Hidden direct
choices, transparent groups, descendant groups beneath a hidden ancestor, and
definitively hidden entries within a visible group stay out of the live
child-choice surface. Hidden direct and group bounds also stay out of
structural status. Unknown group types or attributes, modifier-group repeats,
modifier repeats, unsupported scope, non-Boolean values, and non-`set` hidden
operations remain incomplete and unresolved rather than being guessed.

The structural report does not evaluate category eligibility, broader hidden
state, general constraint collections, costs, or force composition, and it
never permits or rejects an edit.

`composeSupportedRosterValidation` is a headless composition boundary, not
another evaluation pass. It consumes one structural report, one
selection-condition constraint collection, and one force-condition constraint
collection produced from the same roster and catalogue-context objects. It
preserves those reports by reference, orders supported findings by domain,
and derives independent aggregate validity and completeness. Constraint
reports enter actionable findings only when they expose a supported type,
scope, and effective limit. Unsupported projected constraints remain in their
source reports and diagnostics and continue to make completeness incomplete.
Mismatched objects or inspection scopes are rejected as internal input errors.
`inspectLocalRosterSupportedValidation` computes those three inputs once for a
browser session and retains structural and constraint diagnostics separately.
The browser renders its result once as a compact supported-validation ribbon,
then feeds the retained domain reports into the existing structural and
constraint detail cards without re-running those inspectors. The ribbon keeps
validity and completeness separate, shows combined status counts, and links
to both detail cards. Constraint violations and unresolved bounds are expanded
before satisfied bounds and link to the exact selection occurrence or force
card; satisfied bounds and diagnostics remain separate collapsed disclosures.
The aggregate remains read-only, does not guard commands, and does not claim
full BattleScribe legality.

The browser wraps each successful edit in `BoundedHistory<LocalRosterSession>`.
Commits retain at most 100 past snapshots, clear the redo branch, and preserve
each session by reference. Undo and redo therefore restore the roster,
occurrence-to-choice map, selected catalogue, and force wrapper together.
Derived cost and constraint reports are recomputed from the restored present
snapshot. Selecting files or a catalogue, creating a roster, changing setup,
or leaving the session discards history. No history is serialized or persisted.

`setLocalRosterSelectionName` delegates occurrence naming to `roster-model`.
Rename trims and requires non-empty user text; reset supplies the exact
materialized choice name, including absence when the definition has no name.
Only the occurrence name changes. Definition identity, descendants, mapped
choice, cost inputs, and constraint inputs remain unchanged. Rename and reset
are ordinary history commits.

`setLocalRosterSelectionAmount` delegates to the model's positive-finite amount
guard and retains the exact materialized choice map. The editor uses a numeric
source `step` as an input hint and displays lexical `defaultAmount`, but does
not initialize or validate the roster amount from either value. Amount changes
participate in history and recompute costs and supported count bounds.

This is structural setup plus limited structural-bound status, not force
eligibility or full roster legality validation. The
planner does not choose a group whose default is absent or `none`, evaluate
conditional minima, enforce general maxima after later edits, calculate
legality, or reject an edit as illegal. Supported max-zero groups disable their
chooser and max-one groups use replacement semantics only. The
builder checks only catalogue-context and definition presence. The application
does not infer required forces, parent-child eligibility, source amount
defaults, or legality. Drafts preserve generated occurrence IDs as opaque strings
without assigning BattleScribe semantics to them. The application reports
costs and individual constraint bounds only within their documented evaluation
scopes.
Sibling reordering, nested-force editing, and other roster mutation commands
remain outside this UI slice.

## Raw Document Boundary

The raw document is intentionally not a complete BattleScribe domain model.
Typed objects are projections over a generic ordered source tree, not a
replacement tree.

XML documents retain their `OrderedXmlElement` root directly. JSON documents
retain an `OrderedJsonObject` tree with ordered properties, ordered arrays,
primitive types, duplicate properties, and source ranges. A lightweight
BattleScribe element view adapts JSON arrays and properties to the existing
typed projector; it does not replace `sourceRoot`.

Every important projected object retains:

- its BattleScribe element view in `node`;
- its original XML or JSON source value in `sourceNode`;
- document provenance;
- an indexed source path.

Unknown XML elements and attributes and unknown JSON properties remain
observable through the relevant generic source node. Collections preserve
source order. Exact byte-for-byte XML or JSON reserialization is not promised;
original imported and extracted bytes remain available for that purpose.

## Typed Projection Boundary

`ParsedBattleScribeDocument.projection` contains typed, read-only access to
known game-system and catalogue structures. IDs and target IDs use the
foundation `ObjectId` brand. Optional typed fields are omitted when absent.
Explicit `false`, `0`, and empty strings are retained.

Selection-entry and entry-link `defaultAmount` and `step` stay lexical strings
because real JSON uses both native numbers and comma-delimited extensions.
Conditions retain observed `id`, `childName`, and `comment`; repeats retain
observed `id`, `childName`, and `roundUp`. These metadata fields do not acquire
evaluation semantics merely through projection.

The JSON adapter also recognizes the observed, non-2.03
`localConditionGroups` collection. Its `localConditionGroup` items retain
condition-like attributes, scalar repeat metadata, nested conditions, generic
nodes, JSON source objects, paths, and provenance as a separate typed extension
collection. They are not merged into ordinary `conditions` or
`conditionGroups`. The data graph can inspect nested condition references, but
evaluation keeps the extension unresolved until its combination semantics are
understood.

For JSON, native strings, numbers, and Booleans are converted to their
BattleScribe lexical form only in the compatibility element view. Their native
types and source ranges remain in the ordered JSON tree. JSON `description`
and `readme` properties and `$text` content are exposed to the same typed fields
as their XML counterparts.

Root metadata also preserves optional author name, contact, URL, observed type,
and readme text as uninterpreted strings. The original root attributes and
ordered readme element remain available in the generic XML tree.

Projection is structural only. It does not resolve links, build a catalogue
graph, calculate costs, evaluate constraints/modifiers/conditions, or perform
validation.

## Data Graph Boundary

`resolveBattleScribeDataGraph` accepts the set of parsed documents the caller
already has. It indexes known projected objects by `ObjectId` and records
resolved references separately from the projection layer. Reference targets are
arrays because duplicate IDs are reported but still observable.

The graph also indexes every ID-bearing generic element. A reference whose ID
exists only on an unprojected structure records that generic target separately
and is not mislabeled as missing. Known typed candidates remain repository-wide
because real shared definitions can refer back to a consuming catalogue or to
repository-level cost types. The graph additionally records each document's
outgoing catalogue/game-system closure; entry-link and info-link materialization
uses that closure so an equal ID in an unrelated catalogue cannot become an
effective definition.

Shared and inline info groups are typed graph objects. Their nested groups,
rules, profiles, references, modifiers, and publication links participate in
the same recursive indexing without cloning the retained source tree.

Duplicate-ID diagnostics are emitted only for occurrences that can coexist in
at least one document closure. Missing-reference diagnostics group equal
source-document, reference-kind, and target-ID occurrences while retaining the
first source location, occurrence count, and up to 25 exact occurrence paths.
BattleScribe lexical selectors such as `parent`, `force`, `roster`, `self`,
`model`, `unit`, `root-entry`, `any`, `upgrade`, and the default sentinel
`none` remain projected strings and are not treated as object references.

The graph layer never imports additional files and never treats a catalogue
link as permission to load another catalogue. Missing references and cycles are
resolution diagnostics, not thrown errors.

Force entries are indexed recursively. References nested under child force
entries participate in the same graph as top-level force definitions.

## Category-Definition Boundary

`composeBattleScribeCategoryDefinitions` consumes an existing graph and creates
one definition view for every caller-supplied catalogue. Matching game-system
and catalogue-local definitions remain separate, ordered collections. The
combined collection places game-system definitions first and retains duplicate
IDs rather than applying override or merge behavior.

Every wrapper refers to its source projection and document, retaining generic
XML, provenance, and byte arrays. Catalogue links do not import category
definitions into another catalogue's view. The composer does not interpret
category constraints or modifiers, classify selectable entries, or make
categories part of selectable-root visibility.

## Force-Definition Boundary

`composeBattleScribeForceDefinitions` consumes an existing graph and creates
one definition view for every caller-supplied catalogue. A view keeps matching
game-system definitions and catalogue-local definitions in separate ordered
collections. Its combined collection places game-system definitions first and
does not merge or deduplicate equal IDs.

Nested force entries remain nested in their source order. Each definition keeps
its source projection, generic XML node, source document, provenance, and byte
arrays by reference. Category links expose all matching category definitions
and an explicit `resolved`, `missing`, `ambiguous`, or `missingTargetId` state;
an ambiguous link never selects a candidate.

Catalogue links do not contribute force definitions to another catalogue's
view. The 2.03 schema and observed data do not establish an inheritance rule
for linked-catalogue force entries, so adding one would be a separate
compatibility decision. This view does not select a force, flatten child force
definitions, interpret category roles, evaluate constraints or modifiers,
construct roster force instances, or validate legality.

## Profile Containment Boundary

`inspectBattleScribeProfileTypeContainment` walks shared and inline projected
profiles across the existing graph. Profile-type and characteristic-type
targets remain explicit arrays with `missingTargetId`, `missing`, `resolved`,
or `ambiguous` states.

Containment is checked only when both references resolve uniquely. A
characteristic type declared by the resolved profile type is `contained`; a
different uniquely resolved characteristic type is `outsideProfileType` and
produces a compatibility diagnostic. Every missing or ambiguous case remains
`unresolved`, with ordinary graph diagnostics still responsible for missing
references. This inspection does not compare display names, repair type IDs,
mutate profiles, or perform roster validation.

## Catalogue Context Boundary

`composeBattleScribeCatalogueContexts` is an orchestration API over the existing
graph views. It invokes visible-root materialization, force composition,
category composition, and profile containment inspection once each. The
standalone APIs remain available and their result objects are retained intact
on the composed value.

Each per-catalogue context joins the exact materialized-root, force-definition,
and category-definition objects by parsed-document identity. Profile
containment remains a graph-wide report because profiles may occur in game
systems, catalogues, shared definitions, and imported root definitions. No XML,
projection, materialized node, or definition wrapper is cloned.

Each catalogue context also retains its originating data graph by identity so
downstream read-only consumers can inspect the exact reference records used to
compose it without rerunning graph resolution.

The materialization options are forwarded once. Each catalogue receives its
own entry-link occurrence budget while every catalogue together remains under
the separate total-expansion cap. Successfully materialized projected roots are
still shared by identity across catalogue views. Stage diagnostics are
concatenated in root, force, category, then profile order. Diagnostics emitted
while constructing the input graph remain owned by the earlier graph `Result`;
composition does not rerun resolution merely to recreate them.

This context is a consumer-facing read model, not a roster model. It does not
select roots or force definitions, create roster force instances, evaluate
categories or constraints, calculate costs, or validate legality.

## Roster Model Boundary

`roster-model` remains a sibling of `data-graph`, preserving the package
direction required by the evaluation layer. A roster references its catalogue,
forces, and selections through `RosterDefinitionKey` values. Optional source
`ObjectId` values keep original BattleScribe IDs observable, but they are not
assumed unique and are not used as occurrence IDs.

Roster, force, and selection occurrence IDs are separately branded and supplied
by the caller. Commands never generate random IDs. Force IDs are unique across
the roster's force tree; selection IDs are unique across all selection trees.
The same definition reference may appear in several distinct occurrences.

Construction commands return new persistent trees, append in command order,
and retain unaffected subtrees and definition-reference objects by identity.
Duplicate occurrence IDs and missing parent occurrences fail with structural
diagnostics and leave the input roster unchanged.

The command surface can rename the roster, set or clear optional force and
selection names, reorder a force or selection within its existing sibling
collection, relocate occurrences between supported parent kinds, and remove
complete force or selection subtrees. Reordering uses a zero-based destination
index, retains occurrence objects by identity, and copies only the affected
ancestor path.

Relocation destinations use a zero-based insertion index after source removal,
including the collection length for append. Forces can move to the roster root
or another force; selections can move to a force or another selection. The
moved occurrence remains identical, self/descendant destinations are rejected,
and exact same-parent positions return the original roster. This is structural
cycle safety only: the model does not interpret entry-link or force-definition
eligibility, hidden state, or category requirements.

Definition replacement is deliberately non-destructive. It changes only the
force or selection definition reference and preserves the occurrence ID,
optional name, optional amount, and complete descendant arrays. Semantically
equal references are identity no-ops. Replacement does not infer a new name or remove descendants
that may no longer fit; the compatibility inspector reports those stale
relationships afterward.

`RosterSelection.amount` is optional. Its absence means an effective amount of
one; an explicit value must be positive and finite, and may be fractional.
Commands can set or clear it without changing the occurrence ID, definition,
name, or descendants. Distinct occurrences remain distinct even when their
definition and amount are equal. The model does not derive `defaultAmount` or
`step`, calculate costs, evaluate constraints or modifiers, or set validation
validity/completeness.

Force and selection duplication creates a complete independent occurrence
subtree immediately after the source sibling. Callers provide deterministic ID
mappers for every copied occurrence. Definitions remain shared immutable
references, while force and selection objects and their child arrays are new;
selection amounts are copied unchanged.
Every generated ID is preflighted against the roster and the proposed copy; a
collision rejects the complete command without changing roster state.
Catalogue-context translation remains outside `roster-model` and is implemented
by `roster-builder`.

## Roster Builder Boundary

`roster-builder` depends on `foundation`, `data-graph`, and `roster-model`. It
is the only core package that translates `BattleScribeCatalogueContext` objects
into roster definition references, keeping graph/XML concerns out of persistent
roster state.

Definition keys are deterministic JSON tuples containing source provenance ID
and indexed projection path. Optional BattleScribe source IDs remain separate
metadata and are never treated as globally unique. A materialized selection
uses its occurrence path, so two entry links to one shared definition remain
distinct selectable sources while still retaining their effective definition.

Guarded commands first verify that the roster belongs to the supplied catalogue
context. Force definitions must occur in that context's recursive force view.
Selection choices must occur in its visible materialized tree; unresolved or
resource-limited entry links are therefore unavailable. Successful guards
delegate to `roster-model`, preserving its occurrence-ID diagnostics and
immutable structural sharing.

Context-backed replacement wrappers apply those same presence guards before
delegating. They do not require the replacement to fit the current parent and
do not clear existing descendants. Compatibility inspection remains the
separate, diagnostic-only place where stale edges become observable.

Guarded commands remain presence-only and do not reject hidden definitions or
block a child based on its requested parent. The separate
`inspectRosterCompatibility` pass compares an existing roster with one
catalogue context. It reports catalogue matching, definition availability, and
whether force and selection occurrences follow the context's direct
materialized parent-child structure.

The report retains the exact roster, context, occurrences, force definitions,
and materialized choices by reference. Each occurrence has independent
`definitionStatus` and `parentStatus` values. Catalogue mismatch and
resource-limited materialization produce `unresolved` states rather than false
incompatibility claims. Completing the inspection returns a successful
`Result` even when warning diagnostics exist; success means the pass ran, not
that the roster is valid.

Structural compatibility is still not legality. The inspector does not
interpret hidden values, category links, constraints, modifiers, costs, or the
meaning of amounts, and it creates no validity or completeness state. Compatibility
diagnostics never mutate or block the supplied roster.

## Cost Evaluation Boundary

`evaluateRosterBaseCosts` resolves roster selection references against one
catalogue context using the same stable provenance-and-path key format as
`roster-builder`. It returns ordered per-selection evaluations, individual cost
items, cost-type candidates, and ordered totals. The roster, context,
occurrences, materialized choices, cost projections, and cost-type projections
are retained by reference.

Each roster selection occurrence contributes its effective amount. Absent
amounts contribute one, repeated occurrences remain independent, and explicit
zero projected cost values remain included. Included cost items expose the
per-unit base and modified values, amount, and amount-scaled total value.
Totals contain only costs with a numeric value, a type ID, exactly one resolved
cost type, and no duplicate cost of that type on the same materialized
occurrence. Costs excluded from totals remain observable with structured issue
values.

The base report has `scope: "base"` and an independent
`completeness: "complete" | "incomplete"`. Cost-targeting selection modifiers,
unresolved selections, missing or ambiguous cost types, missing typed values,
duplicate same-type occurrence costs, partial materialization, and catalogue
mismatch make completeness incomplete. Modifiers that target non-cost fields
do not affect numeric cost completeness.

`evaluateRosterCostsWithUnconditionalModifiers` uses the same resolution and
ordering rules with `scope: "unconditionalModifiers"`. It applies direct
selection modifiers only when `field` equals the resolved cost type, the
operation is `set`, `increment`, `decrement`, or `floor`, the operand is a
finite number, and the modifier has no conditions, condition groups, scope, or
behavior-bearing generic attributes. A supported exact repeat count may apply
the same direct operation zero or more times. Operations retain XML order;
`floor` establishes a numeric minimum. Every included item exposes its base
and current value, relevant direct modifiers and groups, and an ordered step
report retaining exact projection objects.

The numeric modifier kernel skips an unsupported step, preserves it with
structured issues, and continues with a provisional value. Its report and the
roster report become incomplete, so provisional totals cannot be mistaken for
authoritative BattleScribe results. Relevant modifier groups are preserved but
not flattened into an invented order. A modifier targeting a known cost type
without a corresponding base cost is diagnosed rather than creating a cost.
Cost-type modifiers concern metadata such as hidden state and default limits;
those behaviors remain outside occurrence-cost aggregation.

`evaluateRosterCostsWithSelectionConditions` adds
`scope: "selectionConditions"`. Direct conditions and top-level condition
groups on each modifier use AND semantics: all satisfied means applicable, any
unsatisfied means not applicable, and otherwise applicability is unresolved.
Each condition group recursively combines its direct conditions and child
groups using its own `and` or `or` type. Applicable modifiers enter the same
ordered numeric kernel. Not-applicable modifiers remain as explicit sequence
steps without changing the value or completeness. Unresolved applicability
leaves the step unapplied and makes the report incomplete.

Each included cost retains a `modifierApplicability` report with the exact
modifier, whether its complete condition surface was evaluated, its
applicability status, and all condition and nested group reports. Groups retain
their tree shape and are never flattened into the direct list. A condition or
group can have a known truth but incomplete candidate resolution; its modifier
may be safely applied or skipped from that truth, while the cost report remains
incomplete.

`evaluateRosterModifierApplicability` is the shared read-only applicability
primitive behind those direct cost reports. It evaluates one modifier's direct
conditions and condition groups, reports local truth separately from an
optional inherited applicability status, and retains the exact modifier,
owner, roster, context, and condition reports. It does not inspect the
modifier's operation, field, scope, repeats, or generic behavior attributes and
does not execute the modifier.

Evaluation success means the deterministic pass completed. It does not imply
cost completeness, roster validity, or validation completeness. Cost
evaluation does not execute grouped, scoped, or extension-driven modifiers.
Repeats are limited to the exact selection-count subset documented below;
multiple repeat elements and repeats attached to modifier groups remain
unsupported. Default amount modifiers, default cost limits, and legality
remain outside this boundary.

## Condition Inspection Boundary

`evaluateRosterCondition` evaluates one projected condition for one
exact roster selection or force owner occurrence without mutating the roster or
applying a modifier. It shares the cost evaluator's stable-key selection
resolver and the force inspector's composed-definition resolver. Entry-link
occurrence IDs and shared-definition IDs therefore remain distinct. A selection
condition with `shared="true"` compares the shared definition ID; other values
compare the materialized occurrence ID.

The implemented numeric query surface is selection count
(`field="selections"`) for `self`, `parent`, `root-entry`, `unit`, `model`,
`model-or-unit`, `upgrade`, `force`, and `roster` scopes. Selection-owned
`self` starts with the exact owner occurrence. `root-entry` starts with the
top-level selection containing the owner. Each typed scope starts with the
nearest owner-or-ancestor occurrence whose resolved selection-entry type
matches the requested type; `model-or-unit` accepts either and an ambiguous
nearest scope remains unresolved. `includeChildSelections` recursively
includes nested selections and `includeChildForces` recursively includes child
forces only when explicitly true and the scope contains forces. The supported
comparisons are `atLeast`, `atMost`, `greaterThan`, `lessThan`, `equalTo`, and
`notEqualTo`, using finite numeric values. Explicit false flags and zero
thresholds retain their normal meaning.

For an exact force owner, supported selection-count queries use
`field="selections"` with `scope="force"` or `scope="roster"`. Force scope
starts with that force's direct selections; roster scope starts with all
top-level forces. `includeChildSelections` and `includeChildForces` expand
descendants only when explicitly true. This lets force-definition modifiers
and repeats inspect local or roster-wide selections without assigning semantics
to force-owned parent, typed, cost-field, or identity conditions.

Numeric conditions may use a reachable cost-type ID as their field. The
evaluator sums projected base costs from selections in the same supported scope
after applying the condition's ordinary `childId` identity filter. The result
is exact only when every matched selection resolves uniquely, has at most one
finite projected cost of that type, and has no direct or grouped modifier
targeting that cost. Dynamic, malformed, or ambiguous cost inputs remain
unresolved, so cost-modifier applicability never recursively invokes effective
cost evaluation.

A numeric selection-count scope may also be an object ID. The evaluator first
resolves that ID within the selected catalogue's reachable graph and supports
selection entries, selection-entry groups, entry links, and category entries.
It then starts at the nearest owner-or-ancestor occurrence whose effective
local or shared identities contain that ID. A missing graph target or a target
of another kind remains unresolved with a source-located diagnostic; it is not
treated as an empty scope.

The same owner API supports shared force-definition counts for
`field="forces"` in `roster` scope. This form requires explicit `shared="true"`
and a force-entry `childId`. Top-level forces retain roster order and nested
forces participate only when `includeChildForces` is explicitly true. Force
candidates retain the exact force occurrence and composed-definition
resolution rather than being converted into selection candidates.

Every candidate occurrence retains its materialized resolution and effective
identities. Selection identity includes the applicable occurrence or shared
definition ID, category-link target IDs, and the selection-entry type token;
`childId="any"` matches any resolved selection. `instanceOf` and
`notInstanceOf` can inspect the exact selection owner, its immediate selection
parent, all selection ancestors, the containing root entry, the nearest typed
selection for `unit`, `model`, `model-or-unit`, or `upgrade`, or the selected
context's primary catalogue. `self` and `parent` identity do not expand through
child-traversal flags; a top-level selection has no selection parent. Catalogue
identity is represented by the exact parsed catalogue document and its
BattleScribe catalogue ID, not
by a roster-tree surrogate. Ancestor and primary-catalogue scopes are
identity-only. The numeric value and percentage flag have no effect on identity
comparisons, matching the BattleScribe data-author contract. The earlier
containing-force identity form remains supported separately.

Unresolved or ambiguous identities establish a possible count interval rather
than being guessed. A monotonic comparison can therefore be known satisfied or
unsatisfied even while completeness remains incomplete; equality and
inequality remain unresolved whenever the threshold lies inside a
non-singleton interval. Reports expose minimum, maximum, and an exact observed
count only when a supported candidate collection ran and both bounds agree.

`evaluateRosterConditionGroup` recursively inspects `and` and `or`
groups. AND is unsatisfied when any child is unsatisfied; OR is satisfied when
any child is satisfied. Otherwise all children must agree or the group remains
unresolved. Every branch is inspected even when truth is decisive so
provenance, diagnostics, and incomplete child reports remain observable. Empty,
missing-type, unknown-type, or behavior-extension groups are unresolved.

The earlier `evaluateRosterSelectionCondition` and
`evaluateRosterSelectionConditionGroup` names remain compatibility wrappers
around these owner-generic entry points.

`evaluateRosterModifierGroupApplicability` inspects one projected modifier
group for one exact owner occurrence. The supported modifier-group shape is
the observed `type="and"` form. Direct conditions and condition groups are
combined as applicability requirements, and nested modifier groups inherit
their parent's applicability without flattening the tree. Reports retain the
exact group, its modifier array, nested groups, roster, context, and owner by
reference. Every direct child modifier also has a standalone applicability
report whose `localStatus` reflects its own conditions and whose `status`
includes inherited group applicability. Missing or unknown types, empty groups,
and behavior-bearing generic attributes make group applicability unresolved.
The observed `comment` attribute is projected as inert metadata and does not
change applicability. Repeats are retained and diagnosed; they make
completeness incomplete without changing the separately reported condition
applicability.

The applicability API remains inspection only. A separate execution collector
provides the bounded ordering used by condition-aware constraint inspection:
top-level direct modifiers run first, then top-level groups in source order;
inside each group, direct modifiers run before nested groups, which are visited
depth-first in source order. Group and child conditions are inherited. A group
repeat makes its descendants unresolved rather than guessing a repetition
rule. The cost evaluators do not use this collector; they continue to preserve
relevant groups and emit `EVALUATION_COST_MODIFIER_GROUP_UNSUPPORTED`. The
`selectionConditions` cost scope additionally exposes ordered
`modifierGroupApplicability` trees on each included cost, so known group and
child applicability remains inspectable even though the grouped numeric
operations are not executed.

Non-roster force-count queries, force-owned selection counts outside force or roster
scope, dynamic cost-field queries, percentage values on numeric comparisons,
numeric ancestor queries, and ID-valued force or otherwise
non-selection/category scopes remain unsupported. Identity queries outside the
selection owner, immediate parent, containing-force, `ancestor`, `root-entry`,
typed-selection, and `primary-catalogue` forms also remain unsupported.
Supported direct condition lists can control numeric cost modifier
applicability; standalone reports and cost evaluation still create no validity
state.

## Repeat Evaluation Boundary

`evaluateRosterRepeat` turns one projected repeat into an exact repetition
count only for `field="selections"`, a positive finite divisor, a non-negative
safe-integer multiplier, and a supported selection-count scope and child ID.
It reuses condition candidate resolution, so occurrence amounts, shared versus
local identities, child-inclusion flags, ID-valued scopes, and unresolved
references follow the same conservative rules. The count is
`floor(observed / value) * repeats`, or uses `ceil` when `roundUp` is true.

`evaluateRosterModifierRepeats` supplies exact counts to the numeric modifier
kernel after applicability is known. Zero repetitions are a supported no-op;
increments and decrements scale their operand by the count, while repeated
`set` and `floor` operations remain idempotent. Reports retain the exact repeat,
condition query, observed amount, repetition count, provenance, and structured
diagnostics.

Percentage repeats, malformed values, multiple repeats on one modifier,
modifier-group repeats, generic behavioral extensions, and any query the
condition evaluator cannot resolve remain incomplete. The evaluator does not
expand repeated operations into arrays, mutate source data, apply dynamic
`defaultAmount` modifiers, or imply complete legality.

## Constraint Inspection Boundary

`inspectRosterSelectionConstraint` inspects one projected constraint owned by
one exact roster selection occurrence. It supports non-negative `min` and `max`
limits for `field="selections"` in selection-owned `self`, `parent`, `force`,
and `roster` scopes. The constrained identity is inferred from the resolved
owner choice: ordinary constraints use its materialized source ID, while
`shared="true"` uses its effective definition ID.

The inspector reuses the condition evaluator's deterministic scope traversal
and identity resolution. Matching occurrences contribute their effective
selection amounts, and invalid generated amounts widen the result rather than
being treated as one. It retains the exact roster, context, owner,
constraint, owner resolution, target IDs, every candidate resolution, and every
matching occurrence. Unresolved candidates produce minimum and maximum counts.
A bound may therefore be known `satisfied` or `violated` while completeness is
`incomplete`; otherwise its status is `unresolved`. Exact counts additionally
expose `observed`.

When the resolved owner choice contains a direct or grouped modifier targeting
the constraint ID, the report retains those exact modifier objects and exposes
the static result as `baseStatus`. Effective `status` becomes `unresolved` and
completeness becomes incomplete in the base inspection scope because that scope
does not execute constraint modifiers. No modified limit is guessed.

`inspectRosterSelectionConstraintWithUnconditionalModifiers` provides a
separate `inspectionScope: "unconditionalModifiers"`. It feeds ordered direct
constraint-targeting modifiers through the shared numeric kernel. Supported
`set`, `increment`, `decrement`, and `floor` operations can produce an effective
`limit` and effective status while `baseLimit` and `baseStatus` remain intact.
Conditions, condition groups, unsupported repeat shapes, scopes, behavior
extensions, unknown operations, invalid operands, non-finite results, negative
effective limits, and modifier groups keep effective status unresolved and
completeness incomplete.

`inspectRosterSelectionConstraintWithSelectionConditions` provides
`inspectionScope: "selectionConditions"`. It runs each direct modifier through
the standalone applicability inspector and passes applicable, not-applicable,
or unresolved status into the same ordered numeric kernel. Supported ordinary
selection-count conditions and nested `and`/`or` condition groups can therefore
produce a complete effective limit and status. Reports retain every ordered
`modifierApplicability` record.

The same scope recursively inspects relevant modifier groups and exposes their
ordered `modifierGroupApplicability` trees. Supported target modifiers are
appended after the owner's direct target modifiers, with direct group children
before nested groups. Their inherited applicability, exact repeats, and numeric
operations use the same kernels as direct modifiers. Unknown group shapes,
modifier-group repeats, unsupported operations, and unresolved conditions keep
the effective result incomplete without discarding the group tree.

Missing, malformed, negative, percentage, extension-driven, non-selection,
special-scope, or unknown-type constraints are preserved and diagnosed rather
than guessed. All 26 negative limits at the pinned 11th-edition commit are
`-1`, but their unlimited or disabled semantics are not established by the
source shape alone. They therefore remain an intentionally unsupported
compatibility boundary rather than being clamped or interpreted as a sentinel.

This operation does not aggregate all constraints, block a roster command, set
roster validity, or perform legality validation. Its status describes only the
single inspected limit against the supplied immutable roster snapshot.

`inspectRosterSelectionConstraints` resolves one owner choice and runs the
single-constraint inspector over every projected constraint in source order.
Its optional `inspectionScope` selects `base`, `unconditionalModifiers`, or
`selectionConditions` for every child and defaults to `base`.
The collection retains the exact resolved materialized choice and all child
reports. Unsupported constraints remain in place and make collection
completeness incomplete. The collection deliberately exposes no combined
status or validity field; it is an ordered inspection surface, not conjunction
or legality evaluation.

`inspectRosterSelectionConstraintsInRoster` gathers those owner collections in
deterministic roster order: direct force selections in order, each selection
before its descendants, followed by child forces. It accepts the same optional
scope and propagates it to every owner collection. Diagnostics retain the same
order. The roster-wide report likewise has completeness but no aggregate status
or validity field.

## Force Constraint Inspection Boundary

`inspectRosterForceConstraint` resolves one exact roster force occurrence to a
composed force definition and inspects one projected force-owned constraint.
The supported shapes require non-negative `min` or `max` and explicit
`shared="true"`. Force identity counts use `field="forces"` with
`scope="roster"`. A field resolving to exactly one reachable cost type instead
uses `scope="parent"` or `scope="force"`.

The target is the resolved owner's projected force-entry ID. Roster scope
examines top-level forces in order and recursively includes child forces only
when `includeChildForces` is explicitly true. Each candidate retains its force
occurrence, definition resolution, effective IDs, and match status. Unresolved
candidates produce the same conservative minimum/maximum interval model as
selection constraints.

Cost constraints reuse the selection-condition cost evaluator. One cost report
is shared by reference across the constraints in an owner collection, then
filtered to the exact roster selection occurrences admitted by the constraint's
scope and explicit child-selection/child-force flags. Force scope starts at the
owner. Parent scope starts at the containing force, or at all top-level forces
when the owner itself is top-level. The report retains the resolved cost type,
filtered per-selection reports, subtotal, and exactness counters.

An exact cost observation requires every in-scope selection definition and
queried cost to resolve, every included modifier sequence to be complete, and
no modifier targeting that cost type without a corresponding base cost.
Otherwise the force constraint remains unresolved and exposes no observed
value. Diagnostics from unrelated cost types stay on the shared cost report
rather than being copied into each force constraint.

Direct and recursively nested grouped modifiers on the owner definition are
checked for a `field` equal to the constraint ID. The exact modifier objects
remain attached and the unmodified result is available as `baseStatus`. Base
scope leaves effective status unresolved. The explicit unconditional scope runs
ordered direct `set`, `increment`, `decrement`, and `floor` operations through
the shared numeric kernel. Conditional steps remain provisional there.

`inspectRosterForceConstraintWithConditions` evaluates direct modifier
conditions and nested condition groups through the same applicability reports
used by costs and selection constraints. Supported force-count conditions can
therefore produce a complete effective limit and status. Relevant grouped
modifiers use the same inherited applicability and direct-before-nested order
as selection constraints. Modifier-group repeats, behavior extensions, unknown
operations, invalid operands, non-finite results, and negative effective limits
remain incomplete and unresolved.

The observed generic `message` attribute is retained as display metadata and
does not change numeric inspection. Supported repeats on direct or grouped
child modifiers use the exact repeat evaluator; repeats on the group itself
remain unsupported even when the underlying cost total is exact.

`inspectRosterForceConstraints` preserves the resolved force definition and
inspects all of its projected constraints in source order.
`inspectRosterForceConstraintsInRoster` gathers those collections depth-first,
with each force before its child forces. Both collection levels expose
completeness only, never a combined status, validity state, command guard, or
legality result. Their optional `inspectionScope` applies `base`,
`unconditionalModifiers`, or `conditions` consistently to every child and
defaults to `base`.

## Catalogue-Root Visibility Boundary

`resolveBattleScribeRootVisibility` consumes an existing data graph and creates
one view for each caller-supplied catalogue. A catalogue's own root selection
entries, selection-entry groups, and entry links are visible regardless of
their `import` value. Matching game-system roots and linked-catalogue roots are
eligible only when their own `import` attribute is explicitly `true`.

Linked catalogues are traversed only across catalogue links whose
`importRootEntries` value is explicitly `true`. Traversal is deterministic and
depth-first. A source document reached again through a repeated path or cycle is
reported as already visible and is not expanded again. The first path supplies
the root's import-origin metadata.

Visibility records disabled, resolved, missing, ambiguous, and already-visible
import attempts. Missing and ambiguous targets produce source-located warning
diagnostics, and no candidate is selected when an ID is ambiguous. Shared
selection definitions do not become roots merely because their own `import`
attribute is true; they remain available to ordinary graph resolution.
Disabled attempts still expose graph-resolved target documents when present.

Every visible root points to its existing projection and parsed source document.
The view does not clone XML, materialize entry links, fetch dependencies, or
evaluate any BattleScribe behavior.

`materializeBattleScribeVisibleRoots` is the explicit composition boundary. It
derives visibility from an existing graph, materializes only roots represented
by the per-catalogue visibility views, and returns both layers together. Each
wrapper retains the path-specific visible root and its effective materialized
node separately.

A projected root encountered through several catalogue views is materialized
once per composed call and the immutable result is shared. Visibility wrappers
are not shared because their import origins can differ. Entry-link expansion
uses a fresh per-catalogue occurrence counter, is charged once for shared
successful roots, and is also bounded by one aggregate call counter. Visibility
and materialization diagnostics are returned together in the successful
partial result.

## Shared Selection Materialization Boundary

`materializeBattleScribeSelections` consumes an existing data graph. Direct
selection roots remain backed by their projections. An entry link with exactly
one compatible target produces a structural view with separate occurrence,
link, definition, source-document, and definition-document references.

For linked views, a present link name, hidden flag, collective flag, or import
flag takes precedence over the definition value. An absent link value falls
back to the definition, so explicit `false` and empty strings are retained.
Selection-entry type and selection-entry-group default ID come from the target
definition. The materialized ID is the occurrence/link ID; `definitionId`
retains the target definition ID.

Definition collections are followed by link-local collections. Order within
each original collection is unchanged. This is structural layering only: it
does not decide whether repeated costs, constraints, rules, or other objects
replace, combine, or evaluate in a particular way.

Missing target IDs, missing targets, kind mismatches, duplicate candidates, and
entry-link cycles produce unresolved link nodes plus diagnostics. No arbitrary
target is selected. Info links expose shallow rule or profile views with the
same source/definition distinction; profile characteristics, rule descriptions,
and publication links remain backed by their definition projections. Unknown
info-link types and links into preserved but unprojected generic structures
remain explicit `unresolvedInfoLink` values with `unsupportedType` or
`unprojectedTarget` reasons. They do not produce false missing-target
diagnostics.

Entry-link expansion has configurable depth, per-catalogue occurrence, and
aggregate occurrence budgets. The defaults allow 64 linked definition levels,
50,000 expanded entry-link occurrences per catalogue, and 250,000 across one
composed call. Standalone materialization is naturally bounded first by the
50,000 occurrence limit. Reaching any budget returns a partial successful view
with an unresolved resource-limit node and `truncated: true`.

The original materializer remains independently available and materializes
each supplied document's direct roots. The composed visible-root materializer
does not replace it.
