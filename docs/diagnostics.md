# Diagnostics

Diagnostics are structured values with:

- stable code;
- human-readable message;
- severity (`info`, `warning`, or `error`);
- one or more impact domains;
- optional source location and details.

Current impact domains include import, parsing, security, compatibility,
resolution, validation, persistence, and internal failures.

Parser and archive failures return diagnostics rather than throwing expected
input errors. Unexpected programming failures may still throw.

XML that exceeds configured element-depth or ordered-node limits is rejected
with:

```text
BS_XML_STRUCTURE_LIMIT
```

The error has `parsing` and `security` impacts and reports whether
`maxXmlDepth` or `maxXmlNodes` was exceeded, along with configured and observed
values. The default limits are 256 element levels and 500,000 ordered nodes.

JSON parsing can emit:

```text
BS_JSON_SIZE_LIMIT
BS_JSON_ENCODING
BS_JSON_INVALID
BS_JSON_STRUCTURE_LIMIT
BS_JSON_ROOT_MISSING
BS_JSON_ROOT_AMBIGUOUS
BS_JSON_ROOT_INVALID
```

Syntax and root diagnostics include source provenance and exact line, column,
and source-text offset ranges. Structural-limit details identify
`maxJsonDepth` or `maxJsonNodes`; the defaults are 256 levels and 500,000
values. Root diagnostics require exactly one object-valued `gameSystem` or
`catalogue` property.

Typed projection is tolerant: an invalid Boolean or numeric attribute does not
discard the document or its generic XML. It emits:

```text
BS_PROJECTION_INVALID_ATTRIBUTE
```

The diagnostic has `parsing` and `compatibility` impacts, includes the original
attribute name and lexical value in `details`, and locates the value with file
provenance plus an indexed element/attribute path. JSON values also carry exact
line, column, and source-text offset ranges. The corresponding optional typed
property is absent. Other projected fields and the generic source node remain
available.

Unknown enum-like strings are preserved and do not produce diagnostics merely
for being unknown. This accommodates real BSData values beyond closed
BattleScribe 2.03 XSD enumerations.

Local repository import can reject a complete batch before parsing with:

```text
REPOSITORY_LOCAL_IMPORT_FILE_LIMIT
REPOSITORY_LOCAL_IMPORT_TOTAL_SIZE_LIMIT
```

These errors have `import` and `security` impacts and report configured and
observed counts or bytes. No file report is returned because the preflight
limit applies to the batch as a whole.

An unexpected exception isolated while importing one file emits:

```text
REPOSITORY_LOCAL_IMPORT_UNEXPECTED_FAILURE
```

It has `import` and `internal` impacts, points to that file's generated local
provenance, and keeps the exception message in details. Ordinary malformed,
unsupported, or unsafe BattleScribe inputs continue to use the existing
ingestion diagnostics. Their per-file failures remain in an otherwise
successful ordered batch report, and application catalogue-library composition
passes all import, graph, and context diagnostics through without translating
their codes.

Pinned GitHub source validation and tree listing can emit:

```text
REPOSITORY_GITHUB_OWNER_INVALID
REPOSITORY_GITHUB_NAME_INVALID
REPOSITORY_GITHUB_REVISION_NOT_PINNED
REPOSITORY_GITHUB_REQUEST_FAILED
REPOSITORY_GITHUB_REDIRECT_REJECTED
REPOSITORY_GITHUB_INDEX_SIZE_LIMIT
REPOSITORY_GITHUB_INDEX_INVALID
REPOSITORY_GITHUB_INDEX_TRUNCATED
REPOSITORY_GITHUB_TREE_ENTRY_LIMIT
REPOSITORY_GITHUB_PATH_UNSAFE
REPOSITORY_GITHUB_PATH_DUPLICATE
```

These are errors. Invalid source components, moving revisions, unsafe paths,
redirects, and configured limits include `security` impact where applicable.
The tree response is treated as untrusted even though its URL contains an exact
commit SHA. A truncated tree is rejected rather than presented as a complete
repository, and only validated supported blob paths are returned.

Downloading one pinned file can additionally emit:

```text
REPOSITORY_GITHUB_FILE_UNSUPPORTED
REPOSITORY_GITHUB_FILE_SIZE_LIMIT
REPOSITORY_GITHUB_BODY_UNAVAILABLE
REPOSITORY_GITHUB_BODY_READ_FAILED
REPOSITORY_GITHUB_BLOB_SIZE_MISMATCH
REPOSITORY_GITHUB_BLOB_INTEGRITY_UNAVAILABLE
REPOSITORY_GITHUB_BLOB_INTEGRITY_MISMATCH
```

HTTP and network failures reuse `REPOSITORY_GITHUB_REQUEST_FAILED`; redirects
reuse `REPOSITORY_GITHUB_REDIRECT_REJECTED`. The size diagnostic may come from
the response's declared content length or the accumulated stream and records
the observed and configured byte counts. No partial bytes or parsed document
are returned after a download failure. Once a bounded download succeeds,
ordinary `BS_*` ingestion diagnostics use deterministic `download` provenance
containing the pinned raw URL and repository path.

Integrity-bound read-through caching can emit warning diagnostics while still
returning a verified network result:

```text
REPOSITORY_CACHE_ENTRY_INVALID
REPOSITORY_CACHE_READ_FAILED
REPOSITORY_CACHE_WRITE_FAILED
```

An invalid cache entry records the underlying size/integrity reason codes, is
not ingested, and is replaced after a verified download. Cache I/O failures
have `internal` impact; corrupt cached bytes have `security` impact. A network
blob size or object-ID mismatch remains an error and returns no file. Git blob
verification also fails closed when Web Crypto cannot calculate the SHA-1 used
by the pinned Git tree.

The browser IndexedDB adapter deliberately throws on malformed record
envelopes, mismatched immutable keys, oversized stored values, and database
failures. The repository boundary translates those exceptions into
`REPOSITORY_CACHE_READ_FAILED` or `REPOSITORY_CACHE_WRITE_FAILED`; a verified
network response can still complete the operation. If IndexedDB is absent, the
application omits the optional cache and acquisition proceeds with cache status
`unavailable` rather than emitting a persistence error.

Dependency-closure planning can fail before producing a plan with:

```text
REPOSITORY_DEPENDENCY_ROOT_MISSING
REPOSITORY_DEPENDENCY_ROOT_AMBIGUOUS
REPOSITORY_DEPENDENCY_ROOT_NOT_CATALOGUE
```

All other closure problems preserve the selected root and return an
`incomplete` plan with one or more warning diagnostics:

```text
REPOSITORY_DEPENDENCY_GAME_SYSTEM_ID_MISSING
REPOSITORY_DEPENDENCY_GAME_SYSTEM_MISSING
REPOSITORY_DEPENDENCY_GAME_SYSTEM_AMBIGUOUS
REPOSITORY_DEPENDENCY_GAME_SYSTEM_KIND_MISMATCH
REPOSITORY_DEPENDENCY_TARGET_ID_MISSING
REPOSITORY_DEPENDENCY_TARGET_MISSING
REPOSITORY_DEPENDENCY_TARGET_AMBIGUOUS
REPOSITORY_DEPENDENCY_TARGET_KIND_MISMATCH
REPOSITORY_DEPENDENCY_GAME_SYSTEM_MISMATCH
REPOSITORY_DEPENDENCY_CYCLE
```

Catalogue-link problems use the projected link's source provenance and generic
path when the metadata index was summarized from parsed documents. The planner
never chooses one of several exact-ID matches and never substitutes a display
name for a missing target ID. A cycle is observable but does not by itself make
the closure incomplete because the repeated document is already present and is
not downloaded twice.

Remote metadata indexing and closure acquisition enforce operation-wide limits
with:

```text
REPOSITORY_REMOTE_FILE_LIMIT
REPOSITORY_REMOTE_TOTAL_SIZE_LIMIT
```

Declared tree sizes are preflighted before any request when sufficient; actual
bounded response sizes are accumulated as a fallback. These are `security`
errors and return no index or closure report when the operation-wide limit is
exceeded. Individual malformed files otherwise keep their ordinary `BS_*`
diagnostics and produce rejected rows in a partial index report.

Closure orchestration can also emit:

```text
REPOSITORY_CLOSURE_SOURCE_MISMATCH
REPOSITORY_CLOSURE_TREE_FILE_MISSING
REPOSITORY_CLOSURE_INDEX_MISMATCH
```

A tree/index source mismatch is an error before planning. A planned path absent
from the tree is a warning and keeps available siblings. An acquired root whose
identity or ordered catalogue-link target IDs differ from its planning summary
is a source-located `security` error; that document is not exposed in the
closure's accepted collection. Such per-file failures make a nonempty closure
`incomplete`, while failure to acquire any planned document produces `failed`.

The browser application displays these existing diagnostics beside batch and
catalogue details. A diagnostic list renders its first 50 entries and reports
the remaining count; the complete ordered array remains available on the
in-memory library result. A failure while the browser is reading a selected
`File` occurs before repository provenance exists, so it is shown as a
transient file-read message rather than inventing a source-located structured
diagnostic. Selecting another batch clears that UI failure state.

Local draft decoding can emit:

```text
PERSISTENCE_DRAFT_FORMAT_UNSUPPORTED
PERSISTENCE_DRAFT_VERSION_UNSUPPORTED
PERSISTENCE_DRAFT_INVALID
PERSISTENCE_DRAFT_LIMIT_EXCEEDED
```

These are `persistence` errors. Unsupported format and version diagnostics
retain the observed value in details. Invalid records include an ordered
property path and reason; this covers wrong value types, invalid timestamps,
unknown roster definition or imported-source kinds, zero/negative/non-finite
selection amounts, update timestamps before creation, and duplicate force or
selection occurrence IDs. Limit diagnostics additionally
include the limit name plus configured and observed values. Stored records are
not XML sources, so the decoder does not fabricate a source location.

IndexedDB access can emit:

```text
PERSISTENCE_INDEXEDDB_UNAVAILABLE
PERSISTENCE_DRAFT_READ_FAILED
PERSISTENCE_DRAFT_WRITE_FAILED
PERSISTENCE_DRAFT_DELETE_FAILED
```

The unavailable code means the browser exposes no usable IndexedDB API.
Operation failures retain a non-sensitive error message as `details.cause`.
Listing skips malformed records but returns valid summaries with their decoder
diagnostics. A malformed requested record, failed save, or failed delete
returns no successful value. The browser keeps the current in-memory roster
usable when persistence fails.

Draft opening and session restoration can additionally emit:

```text
PERSISTENCE_DRAFT_NOT_FOUND
PERSISTENCE_DRAFT_RESTORE_FAILED
WEB_ROSTER_DRAFT_CATALOGUE_UNAVAILABLE
WEB_ROSTER_DRAFT_CATALOGUE_MISMATCH
WEB_ROSTER_DRAFT_FORCE_STRUCTURE_UNSUPPORTED
WEB_ROSTER_DRAFT_FORCE_UNAVAILABLE
WEB_ROSTER_DRAFT_SELECTION_UNAVAILABLE
WEB_ROSTER_DRAFT_SELECTION_AMBIGUOUS
```

Not-found, unexpected restore, and unavailable-catalogue diagnostics have no
XML location because the relevant source or rebuilt catalogue is unavailable.
Once a catalogue is selected, mismatch and definition diagnostics point to its
projected root and retain draft IDs, definition keys, or match counts in
details. Multiple root forces and nested forces use the structure-unsupported
code rather than restoring state the current editor cannot display. Missing or
ambiguous force and selection definitions prevent a partial session from being
created. Ordinary re-import, graph, and context diagnostics remain unchanged
and are shown beside the draft action.

Roster setup delegates guarded creation to `roster-builder`. Any catalogue
context or force-availability failure therefore retains its existing
`ROSTER_BUILDER_*` code and source location and is rendered beneath the setup
form. The browser layer does not convert a successful structural setup into a
validation diagnostic or legality claim.

The local session adapter can additionally emit:

```text
WEB_ROSTER_SESSION_FORCE_MISSING
WEB_ROSTER_CHILD_CHOICE_PARENT_UNAVAILABLE
WEB_ROSTER_GROUP_CHOICE_UNAVAILABLE
WEB_ROSTER_GROUP_CHOICE_MAXIMUM_ZERO
```

This is an `internal` error for an impossible editing state in which a session
lost its required starting force. It points to the selected catalogue and
prevents selection insertion. Ordinary catalogue mismatch, unavailable
selection, and duplicate occurrence failures retain their existing
`ROSTER_BUILDER_*` or `ROSTER_*` diagnostics.

Child-choice parent failures point to the selected catalogue because either
the roster occurrence or its exact mapped materialized choice is unavailable.
Unavailable group choices point to the group occurrence and retain parent,
group, and requested choice IDs. A supported effective maximum of zero uses a
compatibility error at the same source location. Max-one replacement retains
all underlying removal, builder, and descendant-initialization diagnostics in
operation order and exposes no partially changed session.

Undo and redo restore successful session snapshots rather than replaying
commands. The browser clears the transient last-command diagnostic list for
those actions; catalogue diagnostics remain on the selected context, and cost
or constraint diagnostics are deterministically recomputed from the restored
roster. Historical command failures are not stored in undo history.

Selection rename and reset delegate to `setRosterSelectionName`. A missing
occurrence therefore retains the existing roster-model diagnostic; the browser
does not invent a naming-specific code. Empty custom names are prevented by the
form before a command is issued.

Graph resolution currently emits these warning diagnostics:

```text
BS_GRAPH_MISSING_REFERENCE
BS_GRAPH_DUPLICATE_ID
BS_GRAPH_CATALOGUE_LINK_CYCLE
```

Missing references include the reference kind, target ID, and expected target
kinds. Equal missing references are grouped per source document, reference
kind, target ID, and expected kinds. The diagnostic points to the first
occurrence and includes `occurrenceCount`, up to 25 `occurrencePaths`, and
`omittedOccurrenceCount`; ungrouped graph reference records retain every
occurrence. Duplicate IDs include every indexed occurrence that can coexist in
at least one supplied catalogue/game-system closure. Equal IDs confined to
unrelated catalogues remain indexed but do not emit a false ambiguity warning.
Catalogue-link cycles include the detected document ID path and point to the
link that closes the cycle. These diagnostics are advisory for graph
construction and do not imply roster validation has run.

An ID retained by the generic tree but absent from the typed object index is an
unprojected target, not a missing reference. The graph reference exposes it
through `unprojectedTargets` without emitting
`BS_GRAPH_MISSING_REFERENCE`. Likewise, observed lexical selector values such
as `model`, `unit`, `root-entry`, `any`, `roster`, `upgrade`, and
`defaultSelectionEntryId="none"` remain visible on their projections but do
not create missing-reference diagnostics.

Missing profile-type and characteristic-type IDs use
`BS_GRAPH_MISSING_REFERENCE` with reference kinds `profileType` and
`characteristicType`. Locations point to the profile or characteristic
`typeId`. A differing `typeName` does not currently emit a diagnostic.

Profile containment inspection can additionally emit:

```text
BS_PROFILE_CHARACTERISTIC_TYPE_MISMATCH
```

This warning has `compatibility` and `resolution` impacts and points to the
characteristic's `typeId`. It is emitted only when the profile type and
characteristic type both resolve uniquely and the characteristic type is not
declared by that profile type. Missing and ambiguous targets remain
`unresolved` and do not produce this mismatch code. The diagnostic describes
structural compatibility, not roster validity.

Shared selection materialization emits warning diagnostics with a `resolution`
impact:

```text
BS_MATERIALIZATION_MISSING_TARGET
BS_MATERIALIZATION_TARGET_KIND_MISMATCH
BS_MATERIALIZATION_AMBIGUOUS_TARGET
BS_MATERIALIZATION_ENTRY_LINK_CYCLE
BS_MATERIALIZATION_INFO_LINK_CYCLE
BS_MATERIALIZATION_RESOURCE_LIMIT
```

The materialized result remains successful and contains an observable
`unresolvedEntryLink` or `unresolvedInfoLink`. Diagnostics point to the
originating link's `targetId` attribute. Details include the link kind, reason,
target ID, and candidate objects; entry-link cycle diagnostics also include the
definition chain. Info-group cycle diagnostics include the repeated group
chain and leave the recursive link unresolved with reason `cycle`. A missing
`targetId` uses the missing-target code and preserves the distinction through
the `missingTargetId` reason.

An unknown info-link type remains unresolved with reason `unsupportedType`.
A known rule/profile link whose ID exists only in an unprojected generic
structure remains unresolved with reason `unprojectedTarget`. These states do
not emit missing-target diagnostics because the retained source data is not
missing. Shared and inline info groups are typed, so observed links of type
`infoGroup` resolve recursively rather than using either unsupported reason.

The browser's occurrence details list unresolved info-link names or target IDs
with these retained reasons at the containing selection or info group. It
renders resolved info groups and nested rule/profile content but does not
translate diagnostic codes, fabricate targets, or rerun graph resolution.

The resource-limit diagnostic has both `resolution` and `security` impacts. It
identifies the configured depth, per-catalogue expansion, or aggregate
expansion limit, current depth, and number of successfully expanded entry
links. Defaults are depth 64, 50,000 expansions per catalogue, and 250,000
across one composed call. The partial result remains usable and explicitly
reports `truncated: true`.

Catalogue-root visibility emits warning diagnostics with a `resolution`
impact:

```text
BS_ROOT_VISIBILITY_MISSING_GAME_SYSTEM
BS_ROOT_VISIBILITY_AMBIGUOUS_GAME_SYSTEM
BS_ROOT_VISIBILITY_MISSING_CATALOGUE
BS_ROOT_VISIBILITY_AMBIGUOUS_CATALOGUE
```

These diagnostics point to the catalogue's `gameSystemId` or the catalogue
link's `targetId`. Details include the target ID and candidate count. The
visibility result remains successful and records the corresponding import as
`missing` or `ambiguous`; it never fetches a missing document or chooses an
arbitrary duplicate. Disabled and already-visible imports are observable states
but do not produce diagnostics. Catalogue cycles continue to be diagnosed by
the graph layer and terminate in visibility through the already-visible state.

`materializeBattleScribeVisibleRoots` returns visibility and materialization
diagnostics together. A result can therefore contain both a blocked catalogue
import and an unresolved visible entry link while remaining a successful,
explicitly partial view. Diagnostic codes and source locations are unchanged;
composition does not introduce a second code for the same condition.

Force-definition composition emits warning diagnostics with a `resolution`
impact:

```text
BS_FORCE_DEFINITIONS_MISSING_GAME_SYSTEM
BS_FORCE_DEFINITIONS_AMBIGUOUS_GAME_SYSTEM
BS_FORCE_DEFINITIONS_MISSING_CATEGORY
BS_FORCE_DEFINITIONS_AMBIGUOUS_CATEGORY
```

Game-system diagnostics point to the catalogue's `gameSystemId`. Category
diagnostics point to the force category link's `targetId` and distinguish
missing target IDs from missing supplied targets through `details.reason`.
Ambiguous diagnostics include the number of candidates. Composition remains a
successful partial result: catalogue-local definitions stay available, all
category candidates remain observable, and no ambiguous target is selected.
These diagnostics describe structural composition only and do not imply force
selection, constraint evaluation, roster construction, or validation.

Category-definition composition emits warning diagnostics with a `resolution`
impact:

```text
BS_CATEGORY_DEFINITIONS_MISSING_GAME_SYSTEM
BS_CATEGORY_DEFINITIONS_AMBIGUOUS_GAME_SYSTEM
```

They point to the catalogue's `gameSystemId` and include the target ID and
candidate count. Catalogue-local definitions remain available in the partial
successful result, and an ambiguous game system is never selected.

`composeBattleScribeCatalogueContexts` returns stage diagnostics in this order:
visible-root materialization, force definitions, category definitions, then
profile containment. It does not change their codes or locations and does not
recreate diagnostics from the earlier graph-construction `Result`.

An internal composition invariant failure can emit:

```text
BS_CATALOGUE_CONTEXT_INCONSISTENT_VIEW
```

This error indicates that component APIs built from the same graph disagreed
about which catalogue documents exist. It has an `internal` impact and fails
the composed result rather than returning a context with missing components.
It does not describe malformed BattleScribe data or roster validity.

Roster construction commands can fail with structural diagnostics:

```text
ROSTER_MODEL_DUPLICATE_FORCE_ID
ROSTER_MODEL_DUPLICATE_SELECTION_ID
ROSTER_MODEL_MISSING_PARENT_FORCE
ROSTER_MODEL_MISSING_PARENT_SELECTION
ROSTER_MODEL_MISSING_FORCE
ROSTER_MODEL_MISSING_SELECTION
ROSTER_MODEL_INVALID_REORDER_INDEX
ROSTER_MODEL_INVALID_REPARENT_INDEX
ROSTER_MODEL_REPARENT_CYCLE
ROSTER_MODEL_INVALID_SELECTION_AMOUNT
```

These errors have an `internal` impact because they indicate a stale or invalid
construction command rather than imported-data incompatibility or roster
legality. Details include the occurrence ID and whether it names a force or
selection. Generated roster state has no imported source location, so these
diagnostics do not fabricate one. A failed command returns no changed roster;
the caller's immutable input remains available unchanged.

Subtree duplication reuses the duplicate-ID codes for collisions with existing
roster occurrences or between IDs generated for the same proposed copy. All ID
mappers run and the complete collision set is returned, but no portion of the
copy is inserted. Missing duplication sources use the non-parent missing codes
and do not invoke the ID mappers.

The non-parent missing codes are used by rename, removal, and reorder commands
when the target occurrence does not exist. Removing an occurrence removes its
descendants without emitting one diagnostic per descendant.

Definition replacement also uses `ROSTER_MODEL_MISSING_FORCE` and
`ROSTER_MODEL_MISSING_SELECTION` when its target occurrence is absent. Equal
definition references are successful identity no-ops and emit no diagnostic.
Replacement preserves descendants even when they become structurally
incompatible; the separate compatibility pass reports those relationships.

`ROSTER_MODEL_INVALID_REORDER_INDEX` reports a destination that is not an
integer or falls outside `0 <= toIndex < siblingCount`. Its details include the
occurrence ID, occurrence kind, requested index, and sibling count. Reorder
commands do not clamp invalid values, change parentage, or return changed roster
state after a failure.

`ROSTER_MODEL_INVALID_REPARENT_INDEX` reports a non-integer or an insertion
index outside `0 <= toIndex <= siblingCount`, where the sibling count is
measured after source removal. Details also identify the destination parent
kind and ID when applicable. `ROSTER_MODEL_REPARENT_CYCLE` reports an attempted
move beneath the source occurrence itself or one of its descendants. Missing
destination parents reuse the parent-missing codes. Every failure is atomic and
returns no changed roster state.

`ROSTER_MODEL_INVALID_SELECTION_AMOUNT` reports an add or update value that is
zero, negative, non-finite, or otherwise not a number. Absence is valid and
means one. The diagnostic identifies the generated occurrence when available,
does not fabricate imported provenance, and leaves the input roster unchanged.

Successful relocation is not evidence of BattleScribe parent-child
eligibility. Structural commands do not emit legality or compatibility
diagnostics for an otherwise acyclic destination.

Context-backed roster construction can fail with:

```text
ROSTER_BUILDER_CATALOGUE_CONTEXT_MISMATCH
ROSTER_BUILDER_FORCE_NOT_AVAILABLE
ROSTER_BUILDER_SELECTION_NOT_AVAILABLE
```

These errors have a `resolution` impact. Catalogue mismatches point to the
supplied catalogue root and include the roster and context definition keys.
Unavailable force and selection diagnostics point to the requested projected
source or materialized occurrence and retain its source ID when present.

`ROSTER_BUILDER_SELECTION_NOT_AVAILABLE` also covers a previously resolved
choice that is absent from a partial materialization because an entry-link
resource limit was reached. The builder does not reinterpret the earlier
materialization diagnostic. Once structural guards pass, diagnostics from the
underlying roster-model command are returned unchanged.

Context-backed definition replacement reuses these three builder codes. A
replacement from the matching context but absent from its force or materialized
selection view is rejected before model editing. Parent-child mismatches do not
reject replacement and are reported later with `ROSTER_COMPATIBILITY_*`
warnings.

Read-only roster compatibility inspection can emit:

```text
ROSTER_COMPATIBILITY_CATALOGUE_MISMATCH
ROSTER_COMPATIBILITY_FORCE_NOT_AVAILABLE
ROSTER_COMPATIBILITY_SELECTION_NOT_AVAILABLE
ROSTER_COMPATIBILITY_SELECTION_UNRESOLVED
ROSTER_COMPATIBILITY_FORCE_PARENT_MISMATCH
ROSTER_COMPATIBILITY_SELECTION_PARENT_MISMATCH
ROSTER_COMPATIBILITY_SELECTION_PARENT_UNRESOLVED
```

These warnings have `compatibility` and `resolution` impacts. Generated roster
occurrences have no imported source location, so diagnostics identify
occurrence IDs, definition keys, and parent references in details without
fabricating locations. Catalogue mismatch makes every occurrence status
unresolved and emits no cascading occurrence diagnostics.

Unavailable means the complete supplied context has no matching stable key.
Unresolved means the pass cannot make that claim because the catalogue differs
or resource-limited entry links may hide the definition or direct parent edge.
Parent mismatches are emitted only when both definitions are available and the
complete relevant materialized collection proves the direct edge absent.

`inspectRosterCompatibility` returns a successful result with these warnings.
Success records that inspection completed; it does not mean compatible, valid,
or complete. The report does not alter roster state or produce validation
dimensions.

Cost evaluation can emit structural and base-scope diagnostics:

```text
EVALUATION_CATALOGUE_CONTEXT_MISMATCH
EVALUATION_SELECTION_NOT_AVAILABLE
EVALUATION_SELECTION_AMBIGUOUS
EVALUATION_SELECTION_UNRESOLVED
EVALUATION_SELECTION_AMOUNT_INVALID
EVALUATION_COST_MISSING_TYPE_ID
EVALUATION_COST_MISSING_VALUE
EVALUATION_COST_TYPE_MISSING
EVALUATION_COST_TYPE_AMBIGUOUS
EVALUATION_DUPLICATE_OCCURRENCE_COST_TYPE
EVALUATION_UNSUPPORTED_SELECTION_MODIFIERS
EVALUATION_COST_MODIFIER_GROUP_UNSUPPORTED
EVALUATION_COST_MODIFIER_BASE_MISSING
```

Numeric modifier sequences can emit:

```text
EVALUATION_NUMERIC_MODIFIER_CONDITIONAL
EVALUATION_NUMERIC_MODIFIER_CONDITION_GROUP_UNSUPPORTED
EVALUATION_NUMERIC_MODIFIER_REPEAT_UNSUPPORTED
EVALUATION_NUMERIC_MODIFIER_REPEAT_COUNT_INVALID
EVALUATION_NUMERIC_MODIFIER_SCOPE_UNSUPPORTED
EVALUATION_NUMERIC_MODIFIER_ATTRIBUTES_UNSUPPORTED
EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED
EVALUATION_NUMERIC_MODIFIER_TYPE_MISSING
EVALUATION_NUMERIC_MODIFIER_TYPE_UNSUPPORTED
EVALUATION_NUMERIC_MODIFIER_VALUE_MISSING
EVALUATION_NUMERIC_MODIFIER_VALUE_INVALID
EVALUATION_NUMERIC_MODIFIER_RESULT_NONFINITE
```

Every code makes its cost report incomplete. Catalogue mismatch suppresses
cascading per-selection diagnostics while leaving each selection unresolved.
Unavailable and ambiguous selection diagnostics identify generated occurrence
IDs and stable definition keys without fabricating source locations. A choice
missing only because entry-link materialization was resource-limited uses the
unresolved code.

Cost diagnostics are source-located on the projected cost attribute involved.
Missing or ambiguous cost-type targets have a `resolution` impact. Missing
typed values, duplicate same-occurrence cost types, and unsupported modifier
behavior have a `compatibility` impact. Base-scope diagnostics point to the
first cost-targeting projected modifier or group and include the complete
relevant count. Non-cost modifiers do not produce cost diagnostics.

`EVALUATION_SELECTION_AMOUNT_INVALID` has no imported location because the bad
value belongs to generated roster state. It retains the selection occurrence ID
and value in details, excludes that occurrence's costs from totals, and makes
the report incomplete. Command and draft boundaries normally prevent this
state, but evaluators remain defensive for direct model construction.

`EVALUATION_COST_MODIFIER_GROUP_UNSUPPORTED` applies to the unconditional cost
scope, where grouped behavior remains retained but inert. In the
`selectionConditions` scope, supported grouped children instead enter the
numeric sequence. Unsupported group shapes and group-level repeats use the
ordinary modifier-group diagnostics; unsupported child operations use the
numeric modifier diagnostics below.

Numeric modifier diagnostics retain the exact modifier in the sequence report.
Attribute problems are located on `@type`, `@value`, `@scope`, or the first
behavior-bearing generic attribute such as `@affects`; condition and repeat
problems point to the modifier node. Details preserve the operation, lexical
value, scope, all generic attributes, and structured issue kind. A non-finite
arithmetic result is not committed.

`EVALUATION_NUMERIC_MODIFIER_REPEAT_COUNT_INVALID` means a caller supplied a
negative, non-integer, or unsafe repetition count to the arithmetic kernel.
`EVALUATION_NUMERIC_MODIFIER_REPEAT_UNSUPPORTED` now applies only when a
modifier still contains repeats but no exact supported count was supplied.

Conditional cost evaluation also retains direct or grouped modifiers whose
condition applicability is false as `notApplicable` steps. These steps emit no
diagnostic and do not make the sequence incomplete. An unresolved condition
list emits `EVALUATION_NUMERIC_MODIFIER_APPLICABILITY_UNRESOLVED` after the
underlying condition diagnostics. Condition groups continue to emit the existing
numeric condition-group unsupported code in scopes that do not evaluate
conditions. The `selectionConditions` scope instead retains and evaluates the
recursive group report; missing, unknown, empty, or extension-driven groups
emit the condition-group diagnostics below and leave applicability unresolved.

Excluded costs remain in the report with structured issue values and candidate
cost types. Duplicate diagnostics are emitted once per selection occurrence and
type even though every conflicting cost item remains observable. Unapplied
modifier steps leave a provisional contribution in the modified report, but
completeness prevents that total from being presented as authoritative.

The cost evaluators return a successful result when inspection completes,
including when diagnostics exist. This is not a validation result and does not
set validity.

The browser roster workspace renders the diagnostics returned by its
`selectionConditions` cost report without translating their codes. Excluded
cost and unresolved-selection counts remain visible in the same report
details. When any unsupported or unresolved behavior makes completeness
incomplete, the UI labels the supported totals as incomplete rather than
promoting a provisional value to a validation or legality result.

Selection-count and force-count condition inspection can emit:

```text
EVALUATION_CONDITION_CATALOGUE_CONTEXT_MISMATCH
EVALUATION_CONDITION_OWNER_NOT_FOUND
EVALUATION_CONDITION_OWNER_AMBIGUOUS
EVALUATION_CONDITION_TYPE_MISSING
EVALUATION_CONDITION_TYPE_UNSUPPORTED
EVALUATION_CONDITION_FIELD_MISSING
EVALUATION_CONDITION_FIELD_UNSUPPORTED
EVALUATION_CONDITION_SCOPE_MISSING
EVALUATION_CONDITION_SCOPE_UNSUPPORTED
EVALUATION_CONDITION_SCOPE_TARGET_NOT_FOUND
EVALUATION_CONDITION_SCOPE_TARGET_KIND_UNSUPPORTED
EVALUATION_CONDITION_SHARED_UNSUPPORTED
EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED
EVALUATION_CONDITION_IDENTITY_SHAPE_UNSUPPORTED
EVALUATION_CONDITION_CHILD_ID_MISSING
EVALUATION_CONDITION_VALUE_MISSING
EVALUATION_CONDITION_VALUE_INVALID
EVALUATION_CONDITION_PERCENT_UNSUPPORTED
EVALUATION_CONDITION_ATTRIBUTES_UNSUPPORTED
EVALUATION_CONDITION_CANDIDATES_UNRESOLVED
EVALUATION_CONDITION_SCOPE_CANDIDATES_UNRESOLVED
EVALUATION_CONDITION_COST_CANDIDATES_UNRESOLVED
EVALUATION_CONDITION_COST_VALUE_UNRESOLVED
EVALUATION_CONDITION_COST_MODIFIERS_UNSUPPORTED
EVALUATION_CONDITION_SELECTION_AMOUNT_INVALID
EVALUATION_CONDITION_GROUP_TYPE_MISSING
EVALUATION_CONDITION_GROUP_TYPE_UNSUPPORTED
EVALUATION_CONDITION_GROUP_EMPTY
EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED
EVALUATION_CONDITION_GROUP_ATTRIBUTES_UNSUPPORTED
```

Every code makes condition completeness incomplete. Shape diagnostics point to
the corresponding projected attribute. Unknown behavior attributes point to
the first generic attribute and preserve all names and values in details.
Force-count shared-identity diagnostics point to `@shared`. Owner, context, and
selection- or force-candidate resolution diagnostics point to the condition
node without fabricating a roster source location.

`EVALUATION_CONDITION_SELECTION_AMOUNT_INVALID` identifies a generated roster
occurrence whose amount is not positive and finite. It has no imported source
location, retains the occurrence ID and value, and widens the candidate interval
rather than treating the occurrence as one or zero.

An exact force owner supports force counts in shared roster scope and selection
counts in force or roster scope. `EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED` points to
`@field` for other force-owned fields or selection-count scopes; those forms do
not produce a false observed zero.

`EVALUATION_CONDITION_SCOPE_CANDIDATES_UNRESOLVED` points to `@scope` when a
`unit`, `model`, `model-or-unit`, or `upgrade` query cannot determine the
nearest typed selection because an owner or ancestor definition is unavailable
or ambiguously typed. The evaluator does not skip that occurrence and search
farther upward.

ID-valued selection-count scopes are resolved only within the selected
catalogue's reachable graph. `EVALUATION_CONDITION_SCOPE_TARGET_NOT_FOUND`
points to `@scope` when no target is reachable.
`EVALUATION_CONDITION_SCOPE_TARGET_KIND_UNSUPPORTED` points there when any
target is not a selection entry, selection-entry group, entry link, or category
entry. Both retain the target ID and resolved target kinds in details, leave
the condition unresolved, and omit an exact observed count.

Cost-type condition fields sum only exact projected base costs from matched
selection candidates. `EVALUATION_CONDITION_COST_CANDIDATES_UNRESOLVED`
reports matched occurrences without one exact materialized definition.
`EVALUATION_CONDITION_COST_VALUE_UNRESOLVED` reports missing or duplicate
queried costs, and `EVALUATION_CONDITION_COST_MODIFIERS_UNSUPPORTED` reports a
direct or grouped modifier targeting the queried cost. These diagnostics point
to `@field`, retain aggregate unresolved counts, omit `observed`, and prevent a
provisional base-cost sum from deciding the condition.

Condition-group shape diagnostics point to the group or its `@type` or first
unsupported generic attribute. Child diagnostics remain in deterministic tree
order. A group can have decisive satisfied or unsatisfied truth while remaining
incomplete because an inspected child is incomplete.

`EVALUATION_CONDITION_GROUP_LOCAL_GROUPS_UNSUPPORTED` points to the first
projected `localConditionGroup` and retains the collection count. The enclosing
group remains unresolved, but the local objects and their nested conditions
stay accessible through its exact projected source object. A group containing
only this extension does not also emit `EVALUATION_CONDITION_GROUP_EMPTY`.
Unknown ordinary group types such as the observed `count` continue to use
`EVALUATION_CONDITION_GROUP_TYPE_UNSUPPORTED` and preserve the lexical type.

Selection-owned numeric selection-count conditions support `self`, `parent`,
`root-entry`, `unit`, `model`, `model-or-unit`, `upgrade`, `force`, and
`roster`, plus reachable selection-entry, selection-entry-group, entry-link,
and category-entry ID scopes. Root-entry begins with the containing top-level
selection; a typed or ID-valued scope begins with the nearest matching
owner-or-ancestor occurrence.
Reachable cost-type fields reuse those selection scopes and identity filters,
but produce an exact observation only from unmodified, well-formed projected
base costs.
The separate identity forms use `instanceOf` or `notInstanceOf` against the
selection owner, its immediate selection parent, containing force, all
selection ancestors, the root entry, a nearest typed selection, or the
selected primary catalogue. `self` and `parent` inspect exactly one selection
when present and ignore child-traversal flags. Category IDs and selection type
tokens are effective selection identities alongside occurrence and shared
definition IDs; primary-catalogue reports instead retain the exact parsed
catalogue document candidate. An unavailable or ambiguous self or parent
definition uses `EVALUATION_CONDITION_CANDIDATES_UNRESOLVED`, widens the binary
match interval, and exposes no exact observation. Force-owned identity
conditions, force-owned selection scopes other than `force` or `roster`, other
identity shapes, and special query forms remain unsupported.

Repeat inspection can emit:

```text
EVALUATION_REPEAT_FIELD_UNSUPPORTED
EVALUATION_REPEAT_SCOPE_MISSING
EVALUATION_REPEAT_CHILD_ID_MISSING
EVALUATION_REPEAT_VALUE_INVALID
EVALUATION_REPEAT_MULTIPLIER_INVALID
EVALUATION_REPEAT_PERCENT_UNSUPPORTED
EVALUATION_REPEAT_ATTRIBUTES_UNSUPPORTED
EVALUATION_REPEAT_RESULT_INVALID
EVALUATION_MODIFIER_REPEAT_CARDINALITY_UNSUPPORTED
```

Attribute-shaped problems point to the exact repeat attribute; unknown
behavior points to the first generic attribute and preserves the complete list
in details. Query diagnostics from condition inspection retain their ordinary
locations. Any diagnostic returns an unresolved, incomplete repeat report and
no executable repetition count. A supported exact zero count emits no
diagnostic and is an intentional modifier no-op.

Live child visibility can additionally emit:

```text
EVALUATION_SELECTION_VISIBILITY_MODIFIER_UNSUPPORTED
```

This diagnostic points to a direct or grouped hidden-state modifier whose
operation, Boolean value, scope, or repeats cannot be executed. Relevant
modifier groups use the ordinary modifier-group and condition diagnostics
below for unknown shapes, group-level repeats, or unresolved applicability.
Unsupported or unresolved hidden behavior never creates a false structural
violation. It remains available through diagnostics and makes the structural
report incomplete.

Unresolved candidates widen the report's count interval. A report may still
have `status: "satisfied" | "unsatisfied"` when every count inside that interval
has the same outcome; this does not change its incomplete completeness. The
standalone condition inspectors return successful results when inspection
completes and never apply a modifier or set validity.

Modifier-group applicability inspection can emit:

```text
EVALUATION_MODIFIER_GROUP_TYPE_MISSING
EVALUATION_MODIFIER_GROUP_TYPE_UNSUPPORTED
EVALUATION_MODIFIER_GROUP_EMPTY
EVALUATION_MODIFIER_GROUP_ATTRIBUTES_UNSUPPORTED
EVALUATION_MODIFIER_GROUP_REPEATS_UNSUPPORTED
```

Type and generic-attribute diagnostics point to the corresponding projected
attribute; empty groups point to the group node. Repeat diagnostics point to
the first preserved repeat and include the complete repeat count. Missing or
unknown types, empty groups, and unsupported attributes leave applicability
unresolved. Repeats instead leave the separately reported condition
applicability observable while making completeness incomplete. Nested group
and condition diagnostics remain in deterministic tree order. `comment` is
recognized as inert metadata and does not trigger the generic-attribute code.
This inspector never executes a child modifier or changes cost totals. The
constraint execution collector may consume a successful applicability tree;
cost evaluation does not. Child-modifier applicability uses the ordinary
condition and condition-group diagnostics above; its report distinguishes
local condition truth from the effective status
inherited from the enclosing group.

Selection-constraint inspection can emit:

```text
EVALUATION_CONSTRAINT_CATALOGUE_CONTEXT_MISMATCH
EVALUATION_CONSTRAINT_OWNER_NOT_FOUND
EVALUATION_CONSTRAINT_OWNER_AMBIGUOUS
EVALUATION_CONSTRAINT_OWNER_DEFINITION_UNAVAILABLE
EVALUATION_CONSTRAINT_OWNER_DEFINITION_AMBIGUOUS
EVALUATION_CONSTRAINT_OWNER_DEFINITION_UNRESOLVED
EVALUATION_CONSTRAINT_TARGET_ID_MISSING
EVALUATION_CONSTRAINT_TYPE_MISSING
EVALUATION_CONSTRAINT_TYPE_UNSUPPORTED
EVALUATION_CONSTRAINT_FIELD_MISSING
EVALUATION_CONSTRAINT_FIELD_UNSUPPORTED
EVALUATION_CONSTRAINT_SCOPE_MISSING
EVALUATION_CONSTRAINT_SCOPE_UNSUPPORTED
EVALUATION_CONSTRAINT_VALUE_MISSING
EVALUATION_CONSTRAINT_VALUE_INVALID
EVALUATION_CONSTRAINT_SELECTION_AMOUNT_INVALID
EVALUATION_CONSTRAINT_VALUE_NEGATIVE_UNSUPPORTED
EVALUATION_CONSTRAINT_PERCENT_UNSUPPORTED
EVALUATION_CONSTRAINT_ATTRIBUTES_UNSUPPORTED
EVALUATION_CONSTRAINT_MODIFIERS_UNSUPPORTED
EVALUATION_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED
EVALUATION_CONSTRAINT_EFFECTIVE_VALUE_NEGATIVE_UNSUPPORTED
EVALUATION_CONSTRAINT_CANDIDATES_UNRESOLVED
```

Shape problems point to the corresponding projected attribute. Generic
behavior points to the first unsupported attribute while retaining every name
and value in details. Owner, context, identity, and candidate-resolution
problems point to the constraint node because no roster source location is
fabricated. Unresolved candidates widen the report's count interval, so status
can still be decisively satisfied or violated while completeness remains
incomplete. Inspection success and per-constraint status never set roster
validity or claim aggregate legality.

`EVALUATION_CONSTRAINT_VALUE_NEGATIVE_UNSUPPORTED` and its force-constraint
equivalent retain the exact negative value and point to `@value`. Pinned `-1`
limits are not clamped or treated as disabled or unbounded; no sentinel
semantics are inferred from the lexical value.

`EVALUATION_CONSTRAINT_SELECTION_AMOUNT_INVALID` is the constraint equivalent
of the condition amount diagnostic. It identifies generated roster state in
details, has no fabricated source location, widens the affected count interval,
and leaves completeness incomplete.

Constraint-modifier diagnostics point to the first direct modifier or modifier
group on the resolved owner choice that targets the constraint ID. Details
retain direct and grouped counts. The report preserves all relevant objects,
keeps static `baseStatus`, and leaves effective status unresolved in base
scope.

The unconditional constraint scope uses the numeric modifier diagnostics listed
earlier for unsupported direct steps. A relevant modifier group points to the
first group and emits `EVALUATION_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED`.
Negative effective limits point to the constraint node and retain both base and
effective values in details. Either case leaves effective status unresolved.

The selection-conditions constraint scope also uses the ordinary condition,
condition-group, modifier-applicability, and numeric-modifier diagnostics listed
above. Direct reports retain source-located applicability details even when
truth is unresolved. Relevant supported modifier groups expose their recursive
applicability trees and contribute ordered numeric steps without emitting the
group-unsupported code. Unsupported group shapes and group-level repeats use
their modifier-group diagnostics; unsupported child operations use the normal
numeric-modifier diagnostics.

Ordered per-selection constraint collection can emit these additional
unlocated roster/context diagnostics before child diagnostics:

```text
EVALUATION_CONSTRAINT_COLLECTION_CATALOGUE_CONTEXT_MISMATCH
EVALUATION_CONSTRAINT_COLLECTION_OWNER_NOT_FOUND
EVALUATION_CONSTRAINT_COLLECTION_OWNER_AMBIGUOUS
EVALUATION_CONSTRAINT_COLLECTION_OWNER_DEFINITION_UNAVAILABLE
EVALUATION_CONSTRAINT_COLLECTION_OWNER_DEFINITION_AMBIGUOUS
EVALUATION_CONSTRAINT_COLLECTION_OWNER_DEFINITION_UNRESOLVED
```

These diagnostics do not fabricate XML locations when the owner definition
cannot be selected. Once a choice resolves, each projected constraint retains
its ordinary source-located diagnostics and source order under the selected
base, unconditional-modifier, or selection-condition scope. The collection has
no combined constraint status.

Force-constraint inspection can emit:

```text
EVALUATION_FORCE_CONSTRAINT_CATALOGUE_CONTEXT_MISMATCH
EVALUATION_FORCE_CONSTRAINT_OWNER_NOT_FOUND
EVALUATION_FORCE_CONSTRAINT_OWNER_AMBIGUOUS
EVALUATION_FORCE_CONSTRAINT_OWNER_DEFINITION_UNAVAILABLE
EVALUATION_FORCE_CONSTRAINT_OWNER_DEFINITION_AMBIGUOUS
EVALUATION_FORCE_CONSTRAINT_OWNER_DEFINITION_UNRESOLVED
EVALUATION_FORCE_CONSTRAINT_TARGET_ID_MISSING
EVALUATION_FORCE_CONSTRAINT_TYPE_MISSING
EVALUATION_FORCE_CONSTRAINT_TYPE_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_FIELD_MISSING
EVALUATION_FORCE_CONSTRAINT_FIELD_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_SCOPE_MISSING
EVALUATION_FORCE_CONSTRAINT_SCOPE_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_SHARED_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_VALUE_MISSING
EVALUATION_FORCE_CONSTRAINT_VALUE_INVALID
EVALUATION_FORCE_CONSTRAINT_VALUE_NEGATIVE_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_PERCENT_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_ATTRIBUTES_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_MODIFIERS_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_EFFECTIVE_VALUE_NEGATIVE_UNSUPPORTED
EVALUATION_FORCE_CONSTRAINT_CANDIDATES_UNRESOLVED
EVALUATION_FORCE_CONSTRAINT_COST_UNRESOLVED
```

Shape diagnostics point to projected force-constraint attributes. Modifier
diagnostics point to the first exact direct modifier or modifier group targeting
the constraint ID. Candidate diagnostics point to the constraint node and
retain minimum and maximum counts. The report keeps `baseStatus` observable but
does not claim an effective status in base scope when modifier behavior applies.
The unconditional and conditions scopes also use the ordinary condition,
condition-group, modifier-applicability, and numeric-modifier diagnostics.
The unconditional scope uses the force-specific group-unsupported code.
Supported groups in the conditions scope contribute ordered numeric steps;
unsupported group shapes use ordinary modifier-group diagnostics. Negative
effective limits use the force-specific code above and leave effective status
unresolved.

For a reachable cost-type field in parent or force scope, the report retains
the shared selection-condition cost report and filtered selection evaluations.
`EVALUATION_FORCE_CONSTRAINT_COST_UNRESOLVED` points to `@field` when an
in-scope selection or queried cost cannot resolve exactly, a relevant modifier
sequence is incomplete, or a modifier targets the type without a base cost.
Details retain aggregate counters. No exact `observed` value is exposed, and
unrelated cost diagnostics are not duplicated onto every force constraint. The
generic `message` attribute is retained as non-behavioral metadata and does not
produce an unsupported-attribute diagnostic.

Ordered force-constraint collections can additionally emit unlocated context
or roster diagnostics before child diagnostics:

```text
EVALUATION_FORCE_CONSTRAINT_COLLECTION_CATALOGUE_CONTEXT_MISMATCH
EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_NOT_FOUND
EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_AMBIGUOUS
EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_DEFINITION_UNAVAILABLE
EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_DEFINITION_AMBIGUOUS
EVALUATION_FORCE_CONSTRAINT_COLLECTION_OWNER_DEFINITION_UNRESOLVED
```

Per-force and roster-wide collections preserve source order and expose no
combined status or validity field.

## Selection Initialization Diagnostics

The read-only initialization planner can emit:

```text
EVALUATION_INITIALIZATION_CONSTRAINT_UNSUPPORTED
EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED
EVALUATION_INITIALIZATION_CONSTRAINT_BOUNDS_CONFLICT
EVALUATION_INITIALIZATION_DEFAULT_UNAVAILABLE
EVALUATION_INITIALIZATION_DEFAULT_AMBIGUOUS
EVALUATION_INITIALIZATION_RESOURCE_LIMIT
```

Unsupported and modifier-controlled bound diagnostics point to the projected
constraint. Conflicting bounds and resource limits point to the materialized
choice occurrence. Default diagnostics point to the group's
`@defaultSelectionEntryId` and retain the requested ID and match count.
Malformed, percentage, child-inclusive, extension-driven, or non-integer
parent-selection bounds are never converted into automatic quantities.

An absent group default and `defaultSelectionEntryId="none"` are ordinary
pending user choices, not diagnostics. A modifier-controlled base minimum of
zero can make a plan incomplete without emitting a warning because it
suppresses no unconditional addition. Optional max-only bounds are not
inspected unless needed to cap a required default. This keeps unrelated
conditional branches from flooding a successful add while preserving the
planner's incomplete scope.

Read-only direct-child and transparent-group inspection reuses the
unsupported-bound, modifier-controlled, and conflicting-bound diagnostics
above. The browser labels such bounds incomplete and does not convert them into
required counts or hard edit limits.

`EVALUATION_INITIALIZATION_RESOURCE_LIMIT` suppresses the entire automatic
descendant set for that selected occurrence; the default limit is 4,096.
The web session passes planner diagnostics through in order, then applies only
the returned safe additions through `roster-builder`. Any later builder failure
returns a failure result without exposing the partially constructed immutable
session. Initialization diagnostics do not establish legality and do not block
the selected root or child itself.

The empty-single-force root planner can additionally emit:

```text
EVALUATION_ROOT_INITIALIZATION_CONSTRAINT_UNSUPPORTED
EVALUATION_ROOT_INITIALIZATION_GROUP_UNSUPPORTED
EVALUATION_ROOT_INITIALIZATION_TARGET_ID_MISSING
EVALUATION_ROOT_INITIALIZATION_MODIFIER_GROUP_UNSUPPORTED
EVALUATION_ROOT_INITIALIZATION_CONDITIONAL_MODIFIERS_UNSUPPORTED
EVALUATION_ROOT_INITIALIZATION_CONSTRAINT_BOUNDS_CONFLICT
EVALUATION_ROOT_INITIALIZATION_RESOURCE_LIMIT
```

Root shape diagnostics point to the projected constraint; group, conflict, and
resource diagnostics point to the visible materialized occurrence. Modifier
diagnostics point to the first relevant modifier or group. Supported
unconditional numeric bound modifiers can also pass through the shared numeric
modifier diagnostics.

Max-only visible roots are optional and do not produce initialization
diagnostics. A conditional or grouped minimum is omitted and makes the root
plan incomplete without an action warning, because its force applicability is
not yet known. A required root whose understood effective minimum is zero is
also omitted normally. This distinction prevents ordinary unit ceilings and
Crusade-only roots from recreating batch-level diagnostic noise during roster
creation.

Read-only live root-bound inspection uses the same root initialization
diagnostics for unsupported shapes and modifiers. An incomplete root remains
addable and is labeled as having incomplete supported bounds; only a complete,
finite, reached maximum disables its browser add control.

The browser combines the selection-condition and force-condition collection
diagnostics only for presentation, preserving selection diagnostics before
force diagnostics. Its summary keeps satisfied, violated, and unresolved bound
counts independent, labels shared completeness explicitly, and repeats that no
aggregate legality result was produced. Diagnostics never silently disappear
and never block an add or remove command. An incomplete root bound with no
known minimum or maximum is not listed as an actionable structural finding
while the root is unselected. Its unsupported behavior remains observable
through the catalogue-level inactive-root summary without changing roster
structural completeness; selecting the root surfaces its source-located
diagnostic and unresolved incomplete bound.

## Structural Status Diagnostics

The empty-single-force structural-status inspector reuses the live root and
child-bound diagnostics above and can additionally emit:

```text
EVALUATION_STRUCTURAL_STATUS_FORCE_STRUCTURE_UNSUPPORTED
EVALUATION_STRUCTURAL_STATUS_CATALOGUE_MISMATCH
EVALUATION_STRUCTURAL_STATUS_CHOICE_INDEX_PARTIAL
EVALUATION_STRUCTURAL_STATUS_SELECTION_UNRESOLVED
EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED
```

These status-level diagnostics point to the selected catalogue root because a
roster occurrence has no imported source location of its own. Details retain
the force counts, catalogue key, occurrence ID, stable definition key,
resolution state, or candidate count as applicable.

Optional, currently unselected roots with unsupported dynamic bounds are
summarized by one catalogue-level
`EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED` diagnostic. Its
details retain the number of affected roots and suppressed source diagnostics.
The summary does not make roster structural completeness incomplete. Selecting
one of those roots restores its original source-located bound diagnostic,
unresolved actionable finding, and incomplete state.

Structural status also emits each exact diagnostic only once per code, source
location, and details object. Repeated roster occurrences that inspect the same
projected behavior therefore do not duplicate an otherwise identical warning;
occurrence-specific details keep genuinely distinct diagnostics separate.

Unsupported force shape, catalogue mismatch, partial materialization, and
unresolved selection definitions make aggregate completeness incomplete.
Reachability that cannot be determined remains incomplete; only a root already
proven inactive receives the catalogue-only treatment above.
Uncertain candidates contribute to a bound's possible selected count. They do
not create a false violation: a minimum is invalid only when its maximum
possible count is too small, and a maximum is invalid only when its known
selected count is already too large.

The structural report is the first domain report that sets both independent
validation dimensions, but only for supported visible-root, direct-entry, and
transparent-group bounds. Its `valid` state means no bound in that narrow scope
is known violated. It does not claim full BattleScribe legality or block edits.

## Supported Validation Composition Diagnostics

The headless supported-validation composer can emit:

```text
EVALUATION_SUPPORTED_VALIDATION_INPUT_MISMATCH
EVALUATION_SUPPORTED_VALIDATION_SCOPE_MISMATCH
```

Both are error diagnostics with `validation` and `internal` impacts. They point
to the selected catalogue source because they identify incorrect programmatic
composition rather than imported-data incompatibility. Input mismatch means
the supplied reports do not retain the same roster and catalogue-context
objects. Scope mismatch means the selection report was not produced in
`selectionConditions` scope or the force report was not produced in
`conditions` scope. A mismatch returns no aggregate report.

Successful composition retains all source reports and their diagnostics; it
does not replace or suppress them. Known violations make validity invalid,
while any incomplete input makes completeness incomplete. The aggregate
describes only the documented structural and constraint slices, never blocks
an edit, and is not a full BattleScribe legality result.

Only constraint reports with a supported type, supported scope, and effective
limit contribute actionable findings and status counts. Other projected
constraints remain ordered in the retained domain reports, preserve their
diagnostics, and keep completeness incomplete without being mislabeled as
roster issues.

The browser's compact supported-validation ribbon does not duplicate successful
domain diagnostics. It uses the aggregate dimensions and counts for summary,
links to the structural and constraint detail cards, and leaves each retained
diagnostic list with its originating domain. Composition failures are shown at
the ribbon and leave editing available.

The constraint card likewise keeps its domain diagnostics in a dedicated
collapsed disclosure rather than nesting them among satisfied or actionable
bounds. Issue links navigate to the owning roster occurrence and do not alter,
resolve, suppress, or reinterpret diagnostics.

Validation is represented with independent dimensions:

```ts
type ValidationStatus = {
  validity: "valid" | "invalid";
  completeness: "complete" | "incomplete";
};
```

An invalid roster may also have incomplete validation. Completeness must never
erase known validity errors.
