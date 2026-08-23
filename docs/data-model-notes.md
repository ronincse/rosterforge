# BattleScribe Data Model Notes

## Ingestion Limits

In addition to source and archive byte budgets, ingestion limits generic XML
and JSON to a depth of 256 and 500,000 ordered nodes each by default. XML
elements, text, and comments each consume one node. JSON objects, arrays, and
primitive values each consume one node. A configured limit failure rejects the
document before metadata or typed projection while leaving the caller's input
bytes unchanged.

## Projection Model

The typed BattleScribe 2.03 model is a read-only view over XML or JSON source
data. `ParsedBattleScribeDocument` retains:

- original imported bytes in `sourceBytes`;
- extracted XML bytes in `documentBytes`;
- `sourceFormat`, either `xml` or `json`;
- the complete generic XML or ordered JSON tree in `sourceRoot`;
- the BattleScribe element compatibility view in `root`;
- typed root metadata in `metadata`;
- typed structures in `projection`.

Projected objects retain `node`, `sourceNode`, `source`, and `path`. For XML,
`node` and `sourceNode` are the same generic element. For JSON, `node` is the
element compatibility view and `sourceNode` is the corresponding original
ordered JSON value. Unknown JSON properties therefore remain available without
pretending that the JSON source was XML.

Ordered JSON objects retain property order and duplicate properties; arrays
retain item order. Every object, array, primitive, and property name has
one-based line/column plus source-text offsets. Original lexical number
text is retained alongside its numeric value. Exact JSON formatting and escapes
remain available through the original bytes rather than being reconstructed.

## Projected Structures

The current layer projects game systems, catalogues, revisions, library flags,
game-system references, root author/readme metadata, catalogue links,
publications, publication links, cost types, category entries, force entries,
selection entries,
selection-entry groups, shared entries and groups, entry links, category
links, info links, shared and inline info groups, rules, profiles, profile
types, characteristic types, characteristics, costs, constraints, modifiers,
modifier groups, conditions, nested condition groups, and repeats.

Real JSON `localConditionGroups` are projected separately from ordinary
condition groups. Each `LocalConditionGroupProjection` retains its
condition-like fields, scalar `repeats` value, nested conditions and groups,
generic element view, original ordered JSON object, source path, and
provenance. The collection is never flattened into ordinary conditions, so an
extension-bearing group remains distinguishable from a genuinely empty group.
Evaluation preserves these objects but leaves their combination behavior
unresolved and source-located.

Selection entries and entry links retain `defaultAmount` and `step` as lexical
strings. Conditions and modifier groups additionally retain observed `comment`
metadata; conditions retain `id` and `childName`, while repeats retain observed
`id`, `childName`, and `roundUp`. These fields remain attached to the
corresponding generic source nodes and do not acquire behavior merely by being
projected.

Force entries recursively project child `forceEntries`. Child collections keep
their document order and every level retains its own generic XML node and
indexed path.

Info groups recursively project nested groups, info links, rules, profiles,
modifiers, modifier groups, and publication links. Profiles likewise project
ordered direct modifiers and modifier groups beside their characteristics.
Projection retains these structures without applying their behavior.

A materialized profile info link exposes the definition profile's
`characteristics`, `modifiers`, `modifierGroups`, and `publicationLinks`
arrays by reference. The wrapper does not clone modifier subtrees, merge link-
local behavior, route characteristic targets, or execute modifiers.

Collections preserve XML or JSON array order. Optional singleton content, such
as a rule description, is omitted when absent and retains an explicit empty
string when present but empty.

## Value Representation

- IDs and target IDs are branded `ObjectId` strings.
- Unknown enum-like values remain strings.
- Absent attributes produce absent optional properties.
- Explicit `false`, numeric zero, and empty strings remain present.
- XML Schema Boolean lexical forms `true`, `false`, `1`, and `0` are accepted;
  native JSON Booleans use the same projected values.
- Finite numeric lexical values, including negative and decimal values, are
  converted to JavaScript numbers.
- `defaultAmount` and `step` deliberately remain strings because the pinned
  JSON corpus contains comma-delimited defaults such as `"1,1"` as well as
  numeric-looking values. Absence and explicit empty text remain distinct.
- Modifier `value` remains lexical, including native JSON numbers adapted to
  their source spelling. Generic behavior properties such as `affects`,
  `join`, `arg`, and `position` remain in `node.attributes`.
- Invalid typed values leave the optional typed property absent and emit
  `BS_PROJECTION_INVALID_ATTRIBUTE` with provenance and a source path. JSON
  diagnostics additionally include exact line, column, and offset ranges.

No diagnostic is emitted merely because an enum-like string is unknown.
Characteristic-type `defaultValue` is an uninterpreted optional string, so an
absent default and an explicitly empty default remain distinct.
Root author fields, readme, and observed type follow the same optional-string
rule and are not normalized or interpreted.

## Generic Fields

All unprojected XML attributes and child elements remain available through
`projected.node`. All original JSON properties and values remain available
through `projected.sourceNode` or the document `sourceRoot`. Unknown source
content is not discarded.

Publication dates remain strings because real data contains partial dates,
human-readable dates, and values such as `Ongoing`. URLs and names are also
preserved as supplied rather than normalized.

## Unsupported Behavior

The projection model does not attach resolved targets to catalogue links,
entry links, category links, info links, publication links, or any other target
ID. Resolution and shared-selection materialization are separate `data-graph`
operations. Projection does not calculate costs or evaluate constraints,
modifiers, condition groups, conditions, or repeats. It does not perform roster
validation.

Roster documents remain unsupported. Exact XML or JSON reserialization is not
implemented.

## Data Graph Model

The `data-graph` package resolves references across a caller-supplied set of
already-parsed documents. It provides:

- `documentsById`, keyed by document metadata ID;
- `objectsById`, keyed by known projected object IDs;
- `genericElementsById`, keyed by every ID retained in the generic element
  tree;
- `reachableDocumentsByDocument`, containing each document's supplied
  game-system and outgoing catalogue-link closure;
- flat `objects` entries with kind, source document, source projection, and ID;
- flat `references` entries with kind, source projection, expected target
  kinds, target ID, zero or more resolved target objects, and zero or more
  preserved but unprojected generic targets.

Graph objects and references point back to projections and parsed documents;
they do not copy XML and do not attach `target` properties to projected
objects. Duplicate IDs are preserved by storing every occurrence in
`objectsById`.

Typed reference candidates remain repository-wide because observed shared
definitions can refer to consuming catalogues and repository-level cost types.
Entry-link and info-link materialization uses
`reachableDocumentsByDocument`, preventing an equal ID in an unrelated
catalogue from becoming an effective definition. Duplicate diagnostics are
limited to object groups that can coexist in at least one such closure.

An ID present only in `genericElementsById` is an unprojected target, not a
missing target. This distinction remains important for future or extension
structures. Unknown info-link types and known links into an unprojected
generic structure remain observable unresolved values without false
missing-reference diagnostics.

Reference-shaped BattleScribe fields are not uniformly IDs. Observed lexical
constraint scopes (`parent`, `force`, `roster`, `self`, `model`, `unit`, and
`root-entry`), child selectors (`any`, `model`, `roster`, `unit`, and
`upgrade`), and `defaultSelectionEntryId="none"` remain source strings and do
not create graph references. Catalogue IDs used by
`scope="primary-catalogue"` conditions remain document references.

The graph resolves only against documents supplied by the caller. Catalogue
links are not followed to import or fetch additional files. Catalogue-link
cycles are diagnosed after references are recorded using a linear visited/active
traversal, so converging acyclic dependency paths are not repeatedly expanded.

Currently resolved reference kinds are game-system references, catalogue links,
entry links, category links, info links, publication links, cost-type
references, selection-entry-group default selection IDs, ID-valued constraint
scopes, condition child IDs, repeat child IDs, profile type IDs, and
characteristic type IDs.

Equal missing references in one source document are grouped by reference kind,
target ID, and expected kinds. The diagnostic retains the first exact source
location, total occurrence count, up to 25 exact occurrence paths, and an
omitted-path count. Reference records themselves remain ungrouped and preserve
every occurrence.

Profile types and characteristic types are indexed graph objects. A profile's
`typeId` expects a `profileType`; each characteristic's `typeId` expects a
`characteristicType`. Missing IDs use the normal graph diagnostic and duplicate
targets remain ambiguous arrays. `typeName` remains supplied display text and
is not used as a fallback resolver.

Graph resolution remains global and does not enforce containment consistency.
The separate profile-containment inspector described below reports whether
uniquely resolved characteristic types belong to a uniquely resolved profile
type without changing graph resolution behavior.

## Category-Definition Composition

`composeBattleScribeCategoryDefinitions` creates one read-only view for every
catalogue in an existing graph. It exposes ordered game-system definitions,
ordered catalogue-local definitions, and a combined game-system-first
collection. Equal IDs remain separate occurrences; the composer does not infer
override, replacement, or merge semantics.

Each definition retains its original `CategoryEntryProjection`, source
document, origin, generic XML node, provenance, and source bytes by reference.
A missing or ambiguous game-system reference leaves catalogue-local definitions
available and produces a source-located diagnostic. Linked-catalogue category
definitions are not inherited.

Category constraints, modifiers, modifier groups, and publication links remain
accessible on the source projection without evaluation. Composition does not
classify entries, add categories to selectable-root visibility, or construct
roster category state.

## Profile-Type Containment

`inspectBattleScribeProfileTypeContainment` visits projected shared and inline
profiles in graph document order. It includes profiles without IDs and retains
their projections and source documents by reference.

Profile-type and characteristic-type references each report
`missingTargetId`, `missing`, `resolved`, or `ambiguous` and expose every graph
candidate. Characteristic containment is `contained` only when both references
resolve uniquely and the characteristic type object occurs in the profile
type's ordered `characteristicTypes` collection. A different unique target is
`outsideProfileType`. All missing and ambiguous cases are `unresolved`; the
inspector never selects a candidate or falls back to `typeName`.

A definite outside-profile-type result emits a compatibility diagnostic. This
is a structural consistency report, not validation: it does not mark a profile
valid or invalid, normalize names, repair IDs, or affect materialization.

## Unified Catalogue Context

`composeBattleScribeCatalogueContexts` composes the existing structural APIs
without replacing them. Its top-level value retains:

- the complete visible-root materialization;
- the complete force-definition composition;
- the complete category-definition composition;
- the graph-wide profile-containment report; and
- per-catalogue wrappers indexed by parsed-document identity.

A catalogue wrapper refers to the exact existing root, force, and category view
objects. This preserves all projection, generic XML, provenance, source-byte,
visibility-origin, and materialized-definition identity. Profile containment is
not filtered per catalogue because profiles can be defined throughout the
caller-supplied graph.

Visible-root materialization runs once with the supplied limits. Each
catalogue receives a fresh `maxExpandedEntryLinks` counter, successful shared
root materializations are reused, and `maxTotalExpandedEntryLinks` bounds the
entire call. Its aggregate `expandedEntryLinks`, `truncated`, and partial
unresolved nodes describe the complete context call. The remaining views are
structural and have no expansion budget.

The returned `Result` concatenates diagnostics from roots, forces, categories,
and profile containment in that order. Graph-construction diagnostics are not
stored on `BattleScribeDataGraph`, so callers retain them from
`resolveBattleScribeDataGraph` separately. The context does not duplicate or
recompute those diagnostics.

Composition adds no selection, evaluation, validation, repository loading,
persistence, or roster state.

## Roster Model

The first `roster-model` slice is an immutable, source-agnostic occurrence tree:

- `Roster` identifies a catalogue reference and owns ordered root forces;
- `RosterForce` owns ordered child forces and ordered selections; and
- `RosterSelection` owns ordered child selections.

`RosterId`, `ForceOccurrenceId`, and `SelectionOccurrenceId` are separate
branded strings. Callers supply every ID, which keeps construction deterministic
and leaves persistence policy open. Force occurrence IDs are unique across the
force tree and selection occurrence IDs are unique across all forces. These are
independent namespaces.

Catalogue, force, and selection definitions use opaque
`RosterDefinitionKey` values. Optional source `ObjectId` values preserve a known
BattleScribe ID without claiming it is globally unique. Definition references
are retained by identity and may be reused by multiple occurrences. The model
does not store graph objects, XML nodes, or catalogue-context wrappers, keeping
the package independent of `data-graph` and `battlescribe-data`.

`createRoster` creates an empty roster. `addRosterForce`,
`addRosterChildForce`, `addRosterSelectionToForce`, and
`addRosterSelectionToSelection` append immutable occurrences in command order.
Successful nested commands copy only the ancestor path and share unaffected
subtrees. Failed structural preconditions return diagnostics without a changed
roster value.

`renameRoster` changes the required roster name. `setRosterForceName` and
`setRosterSelectionName` preserve explicit empty strings and use `undefined` to
remove the optional name property. `setRosterSelectionAmount` accepts a
positive finite number, including fractions, or `undefined` to restore the
implicit amount of one. Invalid values produce a diagnostic without changing
the roster. `removeRosterForce` and
`removeRosterSelection` delete the identified occurrence and its complete
descendant subtree. These edits also copy only the affected ancestor path.

`moveRosterForce` and `moveRosterSelection` reorder an occurrence only within
the sibling collection that already contains it. The destination is a
zero-based integer in the existing collection range. A same-index move returns
the original roster by identity; a changed move copies only its ancestor path
and retains the reordered occurrence and its siblings by identity. Reordering
never changes parentage.

`duplicateRosterForce` and `duplicateRosterSelection` copy the complete source
subtree into the same parent immediately after the source. Callers supply pure,
deterministic ID mappers for each copied occurrence kind. The command invokes
them in depth-first source order, retains definition references by identity,
and creates new occurrence objects and child arrays so subsequent edits remain
independent. Generated IDs are checked against existing and newly generated IDs
before insertion; any collision rejects the complete copy.

Multiplicity can use repeated occurrences with distinct IDs, an explicit
amount on one occurrence, or both. The model never collapses equal definitions
or infers an amount from adjacent duplicates. `rosterSelectionAmount` returns
the stored amount or one when absent; explicit zero is invalid rather than a
synonym for absence.

`reparentRosterForce` moves a force to the roster root or another force.
`reparentRosterSelection` moves a selection to a force or another selection.
Destination indices address the collection after source removal and may equal
its length to append. The moved occurrence object is retained by identity;
source and destination ancestor paths are copied. Exact same-parent positions
return the original roster, and self or descendant destinations are rejected
to keep the occurrence trees acyclic.

Relocation is source-agnostic structural editing. It does not establish that a
force or selection definition is eligible beneath its destination, and no
hidden, category, constraint, modifier, or legality state is consulted.

`replaceRosterForceDefinition` and `replaceRosterSelectionDefinition` replace
only the selected occurrence's definition reference. IDs, optional names,
optional amounts, and all child force and selection arrays remain unchanged. A reference with equal
kind, stable key, and optional source ID returns the original roster by
identity, even when the caller supplied a different reference object.

Replacement is intentionally non-destructive: incompatible descendants remain
available for review or correction. It does not derive the replacement's
display name, reset nested choices, or claim the resulting hierarchy is
compatible. `inspectRosterCompatibility` reports stale direct-parent
relationships after the edit.

No calculated cost, constraint, modifier, condition, repeat, validity, or
completeness state is stored in the roster model. Source `defaultAmount` and
`step` text are not copied into it automatically. There are no BattleScribe
roster import or `.ros`/`.rosz` interchange export commands yet.

The web presentation layer can derive a transient printable view from a
`LocalRosterSession` and the cost and supported-validation reports already
computed for that render. The view copies roster, catalogue, force, selection,
and definition identities; preserves force/selection order and effective
amounts; and attaches only included evaluated costs. Unavailable reports remain
explicitly unavailable, while incomplete reports remain labeled incomplete.
The view is not stored back into `roster-model`, is not a BattleScribe roster
document, and does not add evaluation or legality behavior.

## Roster Builder

`roster-builder` bridges a `BattleScribeCatalogueContext` to the source-agnostic
roster model. It creates catalogue, force, and selection definition references
whose opaque key is a deterministic JSON tuple of source provenance ID and
indexed projection path. The optional `sourceId` remains the projected
BattleScribe ID when present.

Selection references use the materialized occurrence rather than only the
shared target definition. This preserves the distinction between two entry-link
occurrences that reach the same definition and retains link-local effective
names. An explicit empty command name overrides the source name; an absent name
falls back to the effective force or selection name.

Before delegating to `roster-model`, guarded commands verify:

- the roster's catalogue key matches the supplied context;
- a force's projected source occurs in the context's recursive force view; and
- a selection's occurrence and effective definition occur together in the
  context's visible materialized tree.

The last rule means unresolved and resource-limited entry links cannot become
roster selections. A choice from another catalogue is also rejected, even when
its lexical ID collides with an available object. Repeated use of one available
definition remains allowed when occurrence IDs differ.

Context-backed replacement wrappers reuse these guards, preserve existing
occurrence state, and delegate definition replacement to `roster-model`. They
do not block a replacement because of its current parent or descendants.

These are structural presence checks only. Hidden values are retained rather
than interpreted. The commands do not verify parent-child eligibility,
category requirements, quantities, costs, constraints, modifiers, conditions,
or legality, and they do not set validation state.

`inspectRosterCompatibility` is a read-only post-construction pass. It indexes
force definitions and materialized selection choices by the same stable keys
stored in roster references. Each force and selection report retains its
occurrence plus every matching context candidate and exposes:

- `definitionStatus: "available" | "unavailable" | "unresolved"`; and
- `parentStatus: "compatible" | "incompatible" | "unresolved"`.

Root forces must reference top-level context force definitions. Nested forces
must reference direct child force definitions. Selections beneath forces must
reference visible materialized roots, while selections beneath selections must
reference direct materialized children. Selection-entry groups remain explicit
parents; the inspector does not flatten them away.

A wrong catalogue makes all occurrence claims unresolved. Missing selection
keys and parent edges also remain unresolved when resource-limited entry links
could conceal the answer. The returned report shares the original roster,
context, occurrences, definitions, and choices. Diagnostics do not block
commands, mutate state, or create validity/completeness fields.

This pass establishes structural compatibility only. It does not inspect
hidden state, category requirements, costs, constraints, modifiers, conditions,
quantities, or any other legality rule.

## Cost Evaluation

`evaluateRosterBaseCosts` is a deterministic read-only operation in the
`evaluation` package. It consumes a `Roster` and one matching
`BattleScribeCatalogueContext`. Catalogue contexts retain their originating
`BattleScribeDataGraph`, allowing the evaluator to use existing cost-type
reference records without rebuilding or changing resolution scope.

Stable roster definition keys are constructed centrally by
`rosterDefinitionKeyForSource`. The evaluator indexes visible materialized
selection entries and groups by those keys, filters candidates by definition
kind, and preserves every matching candidate. Catalogue mismatch, ambiguous
choices, and choices unavailable behind partial materialization remain
unresolved rather than being guessed.

The report contains a flat, deterministic depth-first list of roster selection
evaluations. Direct selections in each force precede child forces; each
selection precedes its nested selections. Every cost item retains its roster
occurrence, materialized choice, projected cost, and resolved cost-type object
where available.

An item is included in totals only when it has a projected numeric value, a
type ID, exactly one resolved cost type, and no second base cost of that type on
the same materialized occurrence. Explicit zero is included. Repeated roster
occurrences contribute independently. Each included item retains its positive
finite occurrence `amount`, per-unit `baseValue` and modified `value`, and
amount-scaled `totalValue`; an absent roster amount means one. Duplicate same-type costs across a
definition and entry-link overlay remain separate excluded items because the
materialization layer intentionally does not define replacement or addition
semantics.

The base report's `completeness` is `incomplete` whenever applicable behavior
is not supported or cannot be resolved. Direct selection modifiers are
relevant to base-cost completeness only when their `field` targets a cost type
on that materialized occurrence. Modifiers for names, hidden state, profiles,
and other non-cost fields do not make numeric cost aggregation incomplete.

`evaluateRosterCostsWithUnconditionalModifiers` returns the same structural
report with `scope: "unconditionalModifiers"`. Each included item adds
`baseValue`, the provisional or final `value`, relevant direct `modifiers`,
relevant `modifierGroups`, and a `modifierSequence`. Direct modifiers for one
cost type retain source order even when modifiers for another type are
interleaved. `set`, `increment`, `decrement`, and minimum `floor` operations
apply when their values are finite numbers and no applicability behavior is
present. Explicit zero operands and results remain observable.

`evaluateNumericModifierSequence` is the pure deterministic arithmetic kernel.
Every step retains the exact modifier object plus input, parsed operand, and
output when applied. A caller-supplied exact repetition count applies
increment/decrement operands that many times in constant time; zero is a
supported no-op, and repeated set/floor operations are idempotent. Conditions,
condition groups, unresolved repeats, scopes, unknown
operation kinds, behavior-bearing generic attributes, invalid operands, and
non-finite results leave the step unapplied and make the sequence incomplete.
Later understood steps continue from the last known value, which is explicitly
provisional whenever any step was unapplied.

In the unconditional report, modifier groups remain attached to the cost item
but are not flattened or applied.
Modifiers for a known cost type with no corresponding base cost do not create
a contribution. Cost-type metadata modifiers and default cost limits are not
part of occurrence-cost aggregation.

No cost data is written into the roster. The evaluator does not interpret
default cost limits, constraints, grouped cost-modifier arithmetic outside the
condition-aware report, broader condition forms, unsupported repeat shapes,
scoped extension semantics,
source default-amount modifiers, categories, hidden state, or full legality.

## Count Conditions

`evaluateRosterCondition` is a deterministic read-only condition
inspection operation. It consumes a roster, matching catalogue context, exact
selection or force owner occurrence, and projected condition. The owner must
appear exactly once by object identity in the roster. The report retains every
input and creates no condition or validation state on the roster.

The evaluator shares the materialized-choice index used by cost aggregation.
Each in-scope roster occurrence is resolved back to its materialized choice.
Conditions with explicit `shared: true` compare `definitionId`; other
conditions compare the effective materialized `id`. Category-link target IDs
and selection-entry type strings are additional identities in either mode, and
`childId="any"` matches any resolved selection. This allows an entry-link
occurrence to be queried by its own link ID or shared definition ID while also
supporting BattleScribe category and `unit`/`model`/`upgrade` filters.

Supported numeric conditions query `field="selections"` in `self`, `parent`,
`root-entry`, `unit`, `model`, `model-or-unit`, `upgrade`, `force`, `roster`,
or a supported object-ID scope. Selection-owned `self`
includes the exact owner occurrence. `root-entry` uses the top-level selection
containing the owner. `upgrade` uses the nearest owner-or-ancestor occurrence
that resolves consistently to selection-entry type `upgrade`. Descendants are
included recursively only when `includeChildSelections` is explicitly true.
Other child selections and child forces are likewise included only when their
corresponding flags are explicitly true. Candidate order follows roster order,
and each matching occurrence contributes its effective amount instead of an
unconditional one. The six numeric comparisons use finite operands and preserve zero. Percentage
operands are unsupported.

A force occurrence can own `field="selections"` in `force` or `roster` scope.
Force candidates begin with selections directly in that exact force; roster
candidates begin with all top-level forces. Child selections and child forces
participate only through their explicit Boolean flags. Other force-owned
selection scopes, cost fields, and identity comparisons remain unresolved
rather than borrowing selection-owner semantics.

A reachable cost-type ID can replace `field="selections"`. The same scope and
`childId` filter choose roster occurrences, then the evaluator sums one finite
projected base cost of that type from each match. An absent cost contributes
zero. Duplicate or missing values, ambiguous selection definitions, and direct
or grouped modifiers targeting the queried cost make the condition unresolved.
This static boundary prevents condition evaluation from recursively requesting
the effective cost whose modifier applicability may contain that condition.

An object-ID scope is classified against objects reachable from the selected
catalogue before roster traversal. Selection entries, selection-entry groups,
entry links, and category entries use the nearest owner-or-ancestor occurrence
whose effective local or shared identities contain that ID. Missing targets
and other object kinds are unresolved with diagnostics. They never create an
empty candidate collection with an exact observed zero.

Conditions owned by a selection can also query `field="forces"` in roster
scope when `shared: true` is explicit. The `childId` identifies a composed
force definition. Top-level force candidates retain roster order and child
forces are included depth-first only when `includeChildForces` is true. Reports
retain force occurrences and definition resolutions directly.

Selection owners support `instanceOf` and `notInstanceOf` against the exact
containing force and with `field="selections"` against `self`, `parent`,
`ancestor`, `root-entry`, `unit`, `model`, `model-or-unit`, or `upgrade` scope.
`self` is exactly the owner and `parent` is its immediate parent selection; a
top-level selection has no selection parent. Neither form expands through
child-traversal flags. Ancestors are ordered from the immediate parent to the
root and identity truth is existential: one definite match makes `instanceOf`
true and `notInstanceOf`
false. Root-entry inspects only the containing top-level selection. A typed
scope inspects the nearest matching owner or ancestor, including the owner
itself. `primary-catalogue` compares `childId` with the exact selected context
document ID and retains that parsed document as a catalogue candidate.
Identity comparisons ignore numeric value, percentage, and child-traversal
flags as documented by the BSData authoring guide.

Resolved candidates contribute either a match or a known difference.
Unavailable, ambiguous, or resource-limited candidates contribute an unknown
binary possibility. Reports expose minimum and maximum counts, exact observed
count when equal, every candidate and resolution, matching occurrences,
comparison, scope, status, and completeness. Interval reasoning may prove a
comparison satisfied or unsatisfied while completeness remains incomplete due
to unresolved candidates.

`evaluateRosterConditionGroup` recursively combines direct conditions
and child groups. Supported `and` groups are false when any child is false and
true when every child is true. Supported `or` groups are true when any child is
true and false when every child is false. Unknown branches otherwise make the
group unresolved. Every child report is retained and contributes completeness
even when another branch determines truth. Empty groups and groups with missing
or unknown types remain unresolved with diagnostics.

The selection-prefixed function names remain compatibility wrappers; the
owner-generic names are canonical now that exact force occurrences can own
supported force counts and force-scoped selection counts.

The standalone operations do not apply a modifier. Non-roster or non-shared
force queries, force-owned selection queries outside force or roster scope,
characteristic fields, dynamic cost fields, numeric ancestor queries,
identity tests outside the selection owner, immediate parent,
containing-force, ancestor, root-entry, typed-selection, and
primary-catalogue forms, other special scopes,
ID-valued scopes targeting force or unrelated object kinds, generic behavior
attributes, and malformed typed values remain unresolved with diagnostics.

## Repeat Evaluation

`evaluateRosterRepeat` adapts one projected repeat into the existing
selection-count query machinery. The supported shape requires
`field="selections"`, a supported scope and child ID, a positive finite
`value` divisor, a non-negative safe-integer `repeats` multiplier, no percentage
mode, and no unknown behavioral attributes. The report preserves the exact
repeat and its query report by reference.

When the observed amount is exact, the repetition count is
`floor(observed / value) * repeats`; `roundUp: true` substitutes `ceil`.
An exact zero observation produces zero repetitions and remains complete.
Malformed fields, unresolved candidate sets, non-finite results, and unsupported
shapes retain source-located diagnostics and return an unresolved report with
no executable count.

`evaluateRosterModifierRepeats` inspects applicable direct modifiers before
their numeric sequence. One repeat element can supply an exact count; multiple
repeat elements have no inferred combination rule. Repeats attached to a
modifier-group container remain applicability metadata only because their
effect on the whole child sequence is not established. This implementation is
sufficient for the pinned 11th-edition game system's standard points-limit
increment, including its valid zero-repeat case, but is not a general repeat or
legality engine.

## Selection Constraints

`inspectRosterSelectionConstraint` is a deterministic read-only report for one
projected constraint attached to one exact roster selection occurrence. It
supports `min` and `max`, `field="selections"`, non-negative finite limits, and
selection-owned self, parent, force, or roster scope. The same internal scope
traversal and materialized-choice identity resolver used by condition reports
supplies candidates in roster order.

The target being counted is inferred from the owner choice. With explicit
`shared: true`, matching uses `definitionId`; otherwise it uses the materialized
choice `id`. This retains entry-link occurrence identity separately from shared
definition identity without treating generated roster occurrence IDs as source
IDs.

Reports expose the exact constraint and all inputs, owner resolution, target
IDs, candidate resolutions, matching occurrences, minimum and maximum counts,
an exact observed count when possible, limit, scope, constraint type, status,
and completeness. Selection occurrences contribute their effective amounts,
including fractional values; unresolved or invalid amounts widen the interval
instead of becoming one silently. `min` is violated only when even the maximum possible count
is below the limit; `max` is violated only when the minimum is above it. The
opposite bound proves satisfaction. Other uncertain intervals remain
unresolved.

Unsupported types, fields, scopes, percentage limits, negative values, generic
behavior attributes, missing identities, and unresolved definitions are
diagnosed. The report does not combine constraints, mutate the roster, block
commands, or create a validity dimension. `satisfied` and `violated` refer only
to this inspected limit and do not claim roster legality.

Direct and grouped modifiers on the resolved owner choice are checked for a
`field` equal to the constraint ID. Relevant modifier objects remain attached
to the report. The unmodified bound result is exposed as `baseStatus`, while
effective `status` is unresolved and completeness is incomplete in base scope.
No changed limit value is inferred in that scope.

`inspectRosterSelectionConstraintWithUnconditionalModifiers` is the explicit
next scope. It preserves `baseLimit` and `baseStatus`, applies eligible ordered
direct modifiers with the shared numeric kernel, and reports the resulting
effective `limit`, `status`, and exact step sequence. Unsupported or conditional
steps remain provisional and incomplete. Modifier groups are not flattened,
and a negative effective limit remains unsupported.

`inspectRosterSelectionConstraintWithSelectionConditions` evaluates each
direct constraint-targeting modifier's ordinary conditions and nested condition
groups through the standalone applicability report. Applicable modifiers run
through the ordered numeric kernel, not-applicable modifiers leave the limit
unchanged, and unresolved applicability leaves the effective result incomplete.
The report retains all direct applicability records alongside `baseLimit`,
effective `limit`, both statuses, and the exact numeric sequence.

Relevant modifier groups are recursively inspected and retained as ordered
`modifierGroupApplicability` trees in this scope. The numeric sequence places
all direct owner modifiers first, then visits top-level groups in source order;
each group contributes direct modifiers before nested groups. Parent
applicability is inherited by every descendant. Unsupported group shapes,
group-level repeats, and unsupported child operations remain visible and make
the effective result incomplete.

`inspectRosterSelectionConstraints` resolves an owner to one materialized
choice and inspects its complete projected constraint array in order. The
report retains that choice, owner resolution, and every child report, including
unsupported children. It has collection completeness but no aggregate status
or validity field, avoiding an implicit rule that all BattleScribe constraints
can simply be conjoined. An optional `inspectionScope` applies `base`,
`unconditionalModifiers`, or `selectionConditions` consistently to every child
and defaults to `base`.

`inspectRosterSelectionConstraintsInRoster` collects those reports across all
selection occurrences. Direct selections precede child forces, and each
selection precedes its own descendants. Collection and diagnostic order is
therefore deterministic. The same optional scope is propagated to every owner
collection. This report also exposes completeness only; force entry constraints
and aggregate legality remain outside this boundary.

## Selection Initialization Plans

`planRosterSelectionInitialization` is a deterministic, read-only projection
from one exact materialized selection choice to a tree of planned descendant
occurrences. It accepts only non-negative safe-integer `min` and `max` constraints
with `field="selections"` and `scope="parent"`. The supported minimum of a direct
selection entry becomes its planned quantity; nested plans repeat with each
occurrence. Repetition remains a set of independent roster occurrences rather
than a quantity property.

The New Recruit `automatic` constraint extension remains on the generic node,
outside the BattleScribe 2.03 typed constraint projection. It is inert for
this plan: supported minima are read whether the property is absent, `false`, or
`true`. The shipped New Recruit 35.66 runtime follows the same initial path;
post-edit reconciliation is a separate web-session operation described below.

Selection-entry groups are choice containers in this plan, not planned roster
occurrences. Supported required child entries are counted first. If the group
still needs selections and has one exact direct entry whose materialized `id`
matches `defaultSelectionEntryId`, that entry supplies the remainder up to its
supported maximum. An absent default and the lexical sentinel `none` produce a
typed pending-choice record rather than a guessed selection or diagnostic.
Missing and ambiguous non-sentinel defaults remain source-located,
incomplete diagnostics.

Constraint-targeting modifiers on a positive minimum or a maximum needed to
bound an automatic default prevent that automatic addition. A modified base
minimum of zero also makes the affected branch incomplete, but it emits no
action diagnostic because no unconditional addition was suppressed. Percentage
values, child-inclusion flags, invalid numbers, behavioral attributes other
than the inert `automatic` extension, conflicting bounds, and unsupported
parent-bound shapes are likewise never
coerced into quantities.

Plans expose exact materialized choices, ordered additions, quantities, nested
plans, pending group choices, an expanded descendant count, and independent
completeness. They do not inspect current roster occurrences, enforce
constraints, evaluate conditions or modifiers, or mutate a roster. Expanded
plans above 4,096 descendants are replaced by an empty, incomplete plan with a
resource-limit diagnostic.

`inspectRosterSelectionChildChoices` is the companion read-only presentation
projection. It retains direct entries and walks transparent child groups in
materialized order. Each direct entry and group retains its concrete choices,
supported minimum and maximum, and independent completeness. The group-only
wrapper remains available. Neither operation consumes a roster or computes
selected counts. Modified, malformed, percentage, or conflicting bounds remain
incomplete and preserve the same source-located initialization diagnostics.

`planEmptySingleForceRootInitialization` separately reads visible roots before
any selection occurrence exists. It accepts safe-integer selection minima in
`force` or `roster` scope, combines their supported maxima, and emits only
resolved selection-entry roots in visible source order. Direct unconditional
`set`, `increment`, `decrement`, and `floor` modifiers use the shared numeric
kernel; an effective minimum of zero remains unselected. Root groups,
conditional or grouped bound modifiers, malformed extensions, and conflicting
bounds remain incomplete and unselected. Equal shared identities are
deduplicated while retaining the first visible root and highest required
quantity. Optional roots with max-only constraints are not inspected as
requirements.

### Post-edit automatic constraint reconciliation

The local web session consumes lexical `automatic="true"` and
`automatic="1"` from the retained generic constraint node only after a
successful selection edit. It groups current roster occurrences by the exact
materialized choice object and direct parent, using each occurrence's effective
quantity (`amount ?? 1`) as the selector aggregate. A complete violated
selection-condition minimum raises the first occurrence. A complete violated
maximum reduces or removes occurrences from the end.

After selected quantities settle, the operation enumerates currently absent
ordinary child choices from direct entries and transparent groups in
materialized order. A candidate must have a visible, complete visibility path.
The session then adds it to an ephemeral immutable roster snapshot and invokes
the ordinary condition-aware constraint inspector on that probe. Catalogue
projections, generic source nodes, and imported bytes remain shared by
reference; the probe occurrence and its temporary choice-map entry are never
returned.

A complete positive minimum deficit creates one real occurrence with the
deficit as its amount. Its occurrence ID comes from
`LocalRosterAutomaticReconciliationOptions.createSelectionId`, the same
factory browser commands use for explicit additions. Without a factory, the
initiating edit remains successful but activation is withheld with a
source-located compatibility diagnostic. The initiating edit and every
supported clamp or activation appear in one returned immutable session, so
history and autosave record one action and earlier sessions remain unchanged.

This remains a bounded integration operation, not stored evaluation state. It
makes at most ten passes, settling selected adjustments before each absent scan.
On the pinned 41-selection Guardian roster, ten full Checks inspections measured
30,215.7 ms, ten targeted inspections of the selected Scourge min/max pair
measured 407.4 ms, and ten complete amount-command reconciliations with no
reachable absent candidate measured 1.2 ms in total. The edit path therefore
uses targeted constraint and visibility operations rather than constructing the
whole roster report.

The pinned corpus contains twelve modifier-driven true minima with base zero:
eleven ordinary entries and one selection-entry group. None of the eleven
ordinary owner IDs has an `entryLink` reference in the 46 documents. Ten hidden
owners are revealed by the condition that raises their minimum; the T'au Pulse
carbine is already visible. If an effective absent selector also counts a
different exact materialized choice, the operation reports the shared-selector
boundary instead of guessing which wrapper to add or mutate.

Lexical `false`, `0`, absent, and unknown values do not request repair.
Selection-entry groups and unit-typed child selections retain their distinct
New Recruit algorithms and remain untouched. Incomplete visibility or
constraint evaluation keeps its source-located diagnostics and never supplies a
guessed quantity.

## Force Constraints

`inspectRosterForceConstraint` is a deterministic read-only report for one
projected constraint attached to one exact roster force occurrence. It resolves
the occurrence through the composed catalogue force definitions and supports
non-negative `min` and `max` with explicit `shared: true`. A force identity
constraint uses `field="forces"` and `scope="roster"`. A field that resolves to
one reachable cost type uses `scope="parent"` or `scope="force"`.

The counted target is the resolved owner's projected force-entry ID. Candidate
forces retain their exact occurrence, definition resolution, effective IDs,
and match status. Roster scope preserves top-level order; child forces are
visited depth-first only when `includeChildForces` is true. Unresolved
definitions widen minimum and maximum counts, allowing decisive satisfied or
violated bounds without claiming complete inspection.

A cost constraint retains a `costEvaluation` with the exact cost-type
projection, the shared selection-condition cost report, its in-scope selection
reports, subtotal, and exactness counters. Force scope begins with the owner;
parent scope uses its containing force, or the roster's top-level forces for a
top-level owner. `includeChildSelections` and `includeChildForces` expand those
sets only when explicitly true. Multiple constraints on one owner share the
same immutable cost report object.

The subtotal becomes `observed` only when every selected definition and
queried cost resolves, every relevant modifier sequence is complete, and no
direct or grouped modifier targets that type without a base cost. Malformed
costs and provisional modifier behavior leave the constraint unresolved with
aggregate counters instead of turning a partial subtotal into an exact value.

Reports retain the constraint, owner, context, source definition identity,
target IDs, matching occurrences, count interval, optional exact count, limit,
type, `baseStatus`, effective `status`, and completeness. Direct and nested
grouped modifiers targeting the constraint ID remain attached. Their presence
makes effective status unresolved in base scope.

`inspectRosterForceConstraintWithUnconditionalModifiers` applies eligible
ordered direct numeric operations while preserving base and effective limits
and statuses. `inspectRosterForceConstraintWithConditions` first evaluates each
direct or grouped modifier's inherited condition and condition-group
applicability for the exact force owner, then supplies that status to the
numeric sequence. Group trees remain inspectable and use the same
direct-before-nested execution order as selection constraints.

`inspectRosterForceConstraints` inspects every projected constraint on one
resolved force definition in source order. `inspectRosterForceConstraintsInRoster`
collects those owner reports depth-first with each force before its children.
The collections expose completeness but no combined status or validity.
Unresolved or ambiguous fields, cost scopes outside parent/force, force-count
scopes outside roster, non-shared constraints, negative or percentage limits,
and generic behavior attributes are preserved and diagnosed. The observed
generic `message` attribute is non-behavioral display metadata. An optional
collection `inspectionScope` propagates `base`, `unconditionalModifiers`, or
`conditions` to every child.

## Conditional Cost Modifiers

`evaluateRosterCostsWithSelectionConditions` extends the cost report with
`scope: "selectionConditions"`. For every direct or grouped cost-targeting
modifier, the evaluator runs each ordinary condition against the same roster
and catalogue context. Ordinary conditions are combined with AND semantics,
matching the format's requirement that each direct condition be met.

Each included cost exposes ordered `modifierApplicability` records. A record
retains the exact modifier, all exact direct-condition and condition-group
reports, an `evaluated` flag, local and effective `applicable`, `notApplicable`,
or `unresolved` status. Top-level direct conditions and groups use AND semantics
while each group retains its own recursive AND/OR tree. Applicable modifiers
are processed by the numeric sequence. Not-applicable modifiers produce an
explicit step and leave the running value unchanged without making the sequence
incomplete. Unresolved applicability produces an unapplied step and incomplete
sequence.

A condition status can be safely satisfied or unsatisfied while its report is
incomplete because interval bounds prove the truth. The modifier follows that
known truth, but the enclosing cost report remains incomplete. One supported
selection-count repeat can supply an exact numeric repetition count after
applicability is known, including for a grouped child modifier. Multiple,
malformed, percentage, or unresolved repeats, modifier scope, and generic
behavior attributes remain on the numeric kernel's conservative unapplied path.

`evaluateRosterModifierApplicability` exposes the same condition-only report
for any structurally compatible projected modifier. An optional inherited
status is combined with the modifier's `localStatus` to produce its effective
`status`. The inspector does not decide whether the modifier's operation,
target field, scope, repeats, or generic attributes are executable.

## Modifier-Group Applicability

`evaluateRosterModifierGroupApplicability` is a standalone read-only inspector
for one projected modifier group owned by one roster selection occurrence. It
supports the observed `and` group form and evaluates the group's direct
conditions and condition groups as applicability requirements. Nested modifier
groups are reported recursively. Each child has a `localStatus` for its own
conditions and an effective `status` combining that result with inherited
parent applicability. Direct child modifiers are inspected the same way: their
own conditions establish local applicability, while the enclosing group's
effective status is inherited.

The report retains the exact projected group, its modifier array, nested group
objects, owner, roster, and catalogue context. It does not clone or alter the
group tree. A false parent makes a child effectively `notApplicable` even when
the child's local conditions are applicable. Every child is still inspected so
diagnostics and provenance remain visible.

Only `type="and"` is currently supported. Missing and unknown types, empty
groups, and unknown behavior-bearing attributes leave applicability unresolved.
Repeats are preserved and diagnosed as unsupported; they make completeness
incomplete while the condition-only applicability result remains observable.
The observed `comment` string is inert typed metadata. The inspector itself
applies no modifier. Its companion execution collector supplies condition-aware
cost and constraint evaluation with inherited applicability and the documented
direct-before-nested order.

In `selectionConditions` cost reports, each included item exposes these trees
as ordered `modifierGroupApplicability` records. The numeric sequence processes
direct owner modifiers first, then top-level groups in source order with each
group's direct modifiers before nested groups. Only modifiers targeting the
current cost type enter that sequence. Supported `set`, `increment`,
`decrement`, and `floor` children execute; unsupported operations, unresolved
applicability, unsupported group shapes, and group-level repeats remain
observable and make the report incomplete. Base and unconditional cost reports
do not execute grouped modifiers.

## Catalogue-Root Visibility

`resolveBattleScribeRootVisibility` derives per-catalogue selectable-root views
from an existing graph. It does not change graph reference scope: shared targets
and other definitions remain resolvable across all caller-supplied documents
even when a catalogue link does not import roots.

Each catalogue view contains ordered selection-entry, selection-entry-group,
entry-link, and combined root collections. Local roots are always included.
Roots from the matching game system or another catalogue are included only when
the root's `import` property is explicitly `true`; absent and explicit `false`
values are both ineligible but remain distinct on the source projection.

Catalogue traversal follows only links whose `importRootEntries` property is
explicitly `true`. The traversal is depth-first in catalogue-link order and
transitive across enabled links. Each parsed catalogue document is expanded at
most once per view, which terminates cycles and prevents duplicate visible
roots. A visible imported root records the first link path by which its document
was reached. Every attempted link records one of:

- `disabled` for absent or explicit-false `importRootEntries`;
- `resolved` for a unique newly reached catalogue;
- `missing` for no supplied target catalogue;
- `ambiguous` for multiple supplied target catalogues;
- `alreadyVisible` for a repeated or cyclic path.

Missing and ambiguous imports remain successful partial views with diagnostics.
The resolver never fetches a missing file and never chooses one of several
targets. Shared selection entries and groups remain definitions and are not
promoted to roots by their own `import` values.
Disabled attempts still expose graph-resolved target documents when present;
disabling root visibility does not disable reference lookup.

Visible roots retain their exact source projection, generic XML node, source
document, provenance, and original bytes by reference. Root visibility does not
materialize entry links or interpret costs, constraints, modifiers, conditions,
or repeats.

## Force-Definition Composition

`composeBattleScribeForceDefinitions` creates a read-only force-definition view
for each catalogue already present in the graph. It resolves the catalogue's
matching game system from the ordinary `catalogueGameSystem` graph reference
and exposes:

- ordered game-system force definitions;
- ordered catalogue-local force definitions; and
- a combined collection with game-system definitions first.

Collections are concatenated without merging or deduplicating IDs. A nested
force entry becomes a nested definition view rather than a second top-level
definition. The wrapper keeps the original `ForceEntryProjection`, source
document, origin, generic node, provenance, and source bytes by reference.

Each force category link reports `resolved`, `missing`, `ambiguous`, or
`missingTargetId`. Resolved and ambiguous links expose all category candidates
with their source documents. The composer never chooses one ambiguous target.
Missing or ambiguous game systems leave local definitions available and expose
their own source state.

Only the matching game system and the catalogue itself contribute force
definitions. Catalogue links are neither traversed nor treated as force
inheritance. Constraints, modifiers, modifier groups, and publication links
remain on the source projection and are not evaluated or combined. The view
does not create roster force instances, select a definition, flatten nested
forces, calculate costs, or validate legality.

## Visible-Root Materialization

`materializeBattleScribeVisibleRoots` composes root visibility with structural
selection materialization. It accepts an existing graph, derives all
per-catalogue visibility views, and returns matching materialized catalogue
views. Existing visibility and materialization APIs remain independently
usable.

Each composed root is a wrapper containing:

- `visible`, the path-specific visible root with its origin and source
  projection;
- `materialized`, the effective selection entry, selection-entry group, or
  unresolved/resolved entry-link result.

The wrapper kind describes the root occurrence: an entry-link wrapper remains
`entryLink` even when its effective materialized value is a selection entry or
group. This preserves the distinction between where a root came from and what
its link resolves to.

The combined `roots` collection follows visibility order. Kind-specific
collections are filtered views in that same relative order. When the same
projected root appears through several catalogue views, the materialized value
is shared by reference while each visibility wrapper retains its own origin.
No projection, generic XML node, graph record, or source byte array is copied or
mutated.

Materialization uses a fresh occurrence counter for each catalogue and a
shared total counter across the composed call. Each successfully materialized
root projection is shared, so repeated or cyclic catalogue paths do not consume
the entry-link expansion budget repeatedly. A reached per-catalogue or
aggregate budget returns the same diagnosed partial structure as standalone
materialization. Visibility diagnostics and materialization diagnostics are
combined in the result.

Composition still performs no catalogue loading, cost calculation, constraint
or modifier evaluation, roster construction, or validation.

## Shared Selection Materialization

`materializeBattleScribeSelections` creates document views containing direct
selection roots and root entry links. Shared selection entries and groups are
definitions: they appear in a materialized tree when an entry link reaches
them, rather than becoming roots merely because their document is present.

A resolved linked node retains:

- `occurrence`, which is the entry-link projection;
- `link`, as an explicit entry-link reference;
- `definition`, which is the target selection entry or group projection;
- `sourceDocument`, where the link occurs;
- `definitionDocument`, where the target is defined;
- the link occurrence `id` and the target `definitionId` separately.

The link value wins for name, hidden, collective, import, `defaultAmount`, and
`step` only when that attribute is present. Otherwise the definition value is
used. Selection-entry type and group default-selection ID remain definition fields. This preserves
the distinction between absent values and explicit `false` or empty strings.

For every projected collection, definition items precede link-local items.
Each source collection retains its order and all objects retain their original
projection and XML provenance. This is a shallow structural layer, not a deep
copy and not an evaluation rule. In particular, two costs of the same type or
two constraints with related fields both remain observable for a later layer
to interpret.

An entry link that cannot be materialized remains an
`unresolvedEntryLink`. Its reason is one of missing target ID, missing target,
target-kind mismatch, ambiguous target, or cycle. Candidates and the original
link remain accessible. The materializer never chooses among duplicate targets
and terminates recursive link chains at the unresolved cycle node.

Each materialized selection container exposes `materializedInfoLinks` in the
same definition-first order as its raw `infoLinks` and
`materializedInfoGroups` in the same order as its inline `infoGroups`. A
resolved info link is a shallow `ruleInfoLink`, `profileInfoLink`, or
`infoGroup` view. It keeps link ID and definition ID separate, applies present
link name and hidden values over the definition, and retains both source and
definition documents. Rule descriptions, profile characteristics and type
metadata, and publication links remain direct references to the definition
projection.

A materialized info group retains its occurrence, definition, source and
definition documents, raw nested collections, and recursively materialized
info links and child groups. Direct rules and profiles remain distinct from
linked rules and profiles. Modifiers and modifier groups remain observable
projections and are not evaluated by materialization.

Missing, incompatible, and ambiguous info-link targets remain
`unresolvedInfoLink` values with their original link and candidates. Unknown
info-link types use `unsupportedType`; a target present only in the generic
tree uses `unprojectedTarget`. Those two states preserve unsupported data
without claiming that its ID is missing and do not emit missing-target
diagnostics. Info-group links can recurse; a repeated target becomes an
`unresolvedInfoLink` with reason `cycle`, and the resolved prefix remains
usable.

Materialization accepts optional `maxEntryLinkDepth` and
`maxExpandedEntryLinks` limits plus `maxTotalExpandedEntryLinks` for composed
views. Defaults are 64, 50,000 per catalogue, and 250,000 per composed call.
The depth limit bounds recursive entry-link and info-group-link chains. Only
successfully resolved entry-link expansions consume the per-catalogue and
aggregate count budgets; direct projected children, info groups, and
unresolved links do not. A reached limit leaves the affected link unresolved
with reason `resourceLimit`, sets the overall view's `truncated` flag, and
preserves all source data through the graph and projection references.
`expandedEntryLinks` reports aggregate entry-link expansions.

The materializer itself does not import catalogue roots or interpret
`importRootEntries`; root visibility is a separate operation. It also does not
apply costs, constraints, modifiers, conditions, and repeats.

## XSD And Real BSData

Real BSData uses modifier kinds such as `replace` and `floor` that are not in
the BattleScribe 2.03 XSD's closed modifier-kind set. The projection therefore
models modifier kinds as strings.

Representative BSData also demonstrates negative and decimal cost limits,
modifiers nested under cost types, modifier `scope`, child-inclusion flags on
conditions, empty publication fields, `publisherUrl`, and non-ISO publication
date text. The structural fields in scope are projected, while lexical text
that should not be interpreted in this session remains unchanged.

Pinned `BSData/wh40k-11e` JSON retains the 2.03 catalogue and game-system
namespaces and structures while expressing attributes as native JSON
properties, repeated elements as arrays, simple text children as strings, and
attributed text as `$text`. Its game-system root supplies
`battleScribeVersion` as a JSON number; metadata retains the compatible lexical
value `"2.03"`, while the generic JSON node retains the number.

At pinned commit `54c189f4fd01878351fab05586d3b38d9c7f6ddc`, 96
`defaultAmount` properties divide into 89 native numbers and seven
comma-delimited strings (`"1,1"` or `"1,1,1"`); one additional Points Limit
node has lexical `step="250"`. Projection and materialization therefore keep
both fields as strings. The same corpus has 2,826 selection-count repeats and
uses `roundUp` twice, plus inert repeat/condition metadata including `id`,
`childName`, and condition `comment`. These observed extensions are preserved
rather than rejected or coerced into narrower schema-shaped values.

The JSON array property `sharedInfoGroups` corresponds to XSD
`sharedInfoGroups/infoGroup` elements. The compatibility adapter maps that
item name explicitly because mechanical English singularization would produce
the non-schema name `sharedInfoGroup`. At the pinned commit the corpus has 59
shared info groups and 129 `type="infoGroup"` links; projecting and
materializing them introduces no additional diagnostics.

The pinned Imperial Knights closure also exercises the application boundary:
a linked-library `Knight Paladin` remains selectable, its nested Wargear and
weapon choices remain traversable, and its supported base `pts` cost evaluates
to 375. Across the full supplied repository, every non-library catalogue
composes with at least one force definition and one resolved root choice.

The same pinned data explicitly sets the hidden `Enhancements` cost type's
`defaultCostLimit` to an empty string. Because absence, empty text, and zero are
distinct, the empty string remains in the generic JSON tree and produces an
invalid-number diagnostic rather than becoming absent or zero silently.

The pinned 10th-edition game system contains 301 constraints, primarily
selection-count `min`/`max` limits across parent, force, and roster scopes. It
also demonstrates self and root-entry scopes, force and characteristic fields,
negative `-1` limits, and a generic `negative` attribute. The pinned corpus has
26 such limits: 21 `max`, five `min`, 17 selection fields, and nine points-cost
fields across parent, force, and roster scope. Those values remain observable;
the inspector deliberately leaves them incomplete instead of clamping them or
assigning sentinel semantics from their lexical form.

Two of those constraints belong to the nested `Crusade Army` force definition.
They are shared roster-scope force counts with limits zero and one and explicit
child-force inclusion. A direct conditional modifier targets the minimum. The
base force inspector supports the static count shape and preserves that
modifier. The explicit conditions scope evaluates its roster force-count
condition and applies the supported direct numeric operation.

The same pinned file has 59 modifiers whose `field` targets a constraint ID:
57 `set` operations and two `increment` operations. This confirms that a static
constraint result cannot be presented as effective whenever relevant modifier
behavior is present. Eleven direct `set` modifiers have no condition,
condition-group, repeat, scope, or extension behavior and can use the
unconditional constraint scope; the rest remain unapplied there.

At pinned commit `52914f259d4e509379fc653e3b13d2e38edb102e`, all 40
modifier groups in the 10th-edition game system use `type="and"` and contain
direct modifiers. None is nested or has group-level conditions, condition
groups, or repeats, although child modifiers can have their own applicability
structures. The 11th-edition corpus described in compatibility notes adds
nested groups, group-level conditions, child repeats, and inert comments. The
typed model remains recursive and the constraint executor uses its documented
deterministic ordering without claiming exact BattleScribe parity for every
producer.

Pinned 10th-edition data defines profile types at the game-system root, nests
ordered characteristic types beneath them, and uses optional characteristic
defaults such as `Melee`. Profiles repeat both `typeId` and `typeName`; IDs are
resolved structurally and names are preserved without consistency enforcement.
The same pinned root uses a `type` attribute in addition to its element kind;
RosterForge preserves that lexical value rather than treating it as a closed
enum or using it to override the parsed document kind.

Pinned `BSData/wh40k-10e` catalogues demonstrate root entries marked
`import="true"` and selected catalogue links marked
`importRootEntries="true"`. The same data also contains catalogue links without
root importing whose shared definitions are nevertheless referenced. This
supports keeping reference availability separate from root visibility.

The pinned 10th-edition game system has four top-level force entries. One of
them contains another `forceEntries` collection, while the pinned Imperial
Knights catalogue has no local force entries. This confirms that force
projection and graph indexing must recurse and that a catalogue-facing view
must be able to source its definitions from the matching game system. It does
not establish that force entries from linked catalogues should be inherited.

That game system also contains 114 category definitions, while the sampled
Imperial Knights catalogue contains none locally. Across 222 profiles in those
two pinned files, every resolvable characteristic type belonged to its declared
profile type. The fictional fixtures retain local categories and a deliberate
cross-type mismatch so both compatibility paths remain tested without
committing third-party data.

Exact BattleScribe behavior for transitive root imports and multiply reachable
catalogues is not established by the 2.03 schema. RosterForge currently uses a
deterministic depth-first traversal and retains the first import path. Category
and force entries are not included in selectable-root visibility. Each uses its
separate definition-composition view described above.

## Pinned Repository Acquisition

`PinnedGitHubRepository` is an immutable source descriptor containing a GitHub
owner, repository name, and branded full commit SHA. It does not contain mutable
branch state, credentials, downloaded bytes, or a trust decision. A listed tree
retains the same descriptor by reference and exposes only validated supported
blob paths, Git object IDs, and optional declared byte sizes.

`DownloadedPinnedRepositoryFile` is a short-lived acquisition value containing
the exact pinned source, validated repository path, bounded byte array, optional
media type, and exact raw URL. Secure acquisition converts it to ordinary
`SourceFileProvenance` with `kind: "download"`; the accepted parsed document then
owns the retained original byte array and all generic and typed views just as a
local import does. The repository layer does not add targets to projected links
or clone generic trees.

`BattleScribeRepositoryDocumentSummary` is a compact planning projection, not a
replacement document model. It preserves the root kind, source ID, name,
game-system ID, optional library flag, path, and catalogue links in declaration
order. A summary created from a parsed document also keeps root provenance and
source-located catalogue-link descriptors. The parsed document remains the
authority for generic nodes, unknown values, projections, diagnostics, and
source bytes.

`BattleScribeDependencyClosurePlan` is repository-scoped and identifies its
pinned source and exact selected catalogue summary. Its ordered files contain
the game system, selected catalogue, then first-seen transitive catalogue
dependencies in depth-first link order. Exact IDs, not names, select targets.
Cycles stop at the active repeated path and do not duplicate a file. Missing,
ambiguous, wrong-kind, and cross-game-system targets remain diagnostics and set
the plan status to `incomplete`; an incomplete plan is still inspectable and is
not misrepresented as a resolved data graph.

`PinnedRepositoryByteCacheKey` includes the immutable source identity, path, and
pinned Git blob ID. A cache entry contains only copied source bytes and an
optional media type. Every read is treated as untrusted: bytes are copied,
checked against limits and the tree's declared size, and hashed using Git's blob
object format before ingestion. The core interface has no deletion, discovery,
or storage semantics.

The browser byte adapter stores a versioned record in the dedicated
`rosterforge-pinned-repository-cache` IndexedDB database. It copies bytes on
write and read, repeats the complete immutable key inside the record, and
rejects mismatched, malformed, or oversized records. IndexedDB records are not
trusted as proof of integrity: the repository layer still checks the tree size
and Git blob object ID after every cache read. IndexedDB absence means no cache,
not a failed import. Eviction, quota handling, and atomic closure publication
remain open application concerns.

A tree is still only a path/blob index. The remote index builder obtains root
metadata through bounded downloads and secure parsing, retaining one ordered
file report and compact summary per accepted source. It intentionally releases
parsed generic trees and source byte arrays after each summary is produced; a
durable cache adapter is responsible for retaining verified source bytes across
the indexing pass. A `partial` report keeps valid summaries when malformed
siblings are rejected. `RemoteRepositoryOperationProgress` is ephemeral
observation state: phase, completed and total files, current path, and accepted
bytes. It is neither persisted nor treated as acquisition authority.

Closure acquisition treats those summaries as a plan input, not as authority.
It reopens each planned tree file from verified cache or network bytes, performs
ordinary ingestion, and compares the accepted root metadata and ordered link
target IDs with the summary. Mismatched files remain rejected reports. The
closure report retains only its ordered accepted documents and bytes, so graph
resolution can consume a focused set without recreating the full-repository
heap footprint.

The application converts accepted closure documents into an import report by
reference before graph/context composition. The report is an application-facing
view over documents already accepted by ingestion; it does not clone generic
trees or source bytes and it does not rewrite `download` provenance as a local
file source.

`RemoteCatalogueSourceDefinition` is application configuration for an
immutable source label, description, and validated GitHub pin. It is not a
mutable subscription. `RemoteCatalogueSourceIndex` pairs that configuration
with one compact index report, its ordered non-library catalogue summaries, and
a metadata-cache status of `hit`, `miss`, `invalid`, or `unavailable`.
The browser controller's listing, indexing, ready, acquiring, and failed states
are transient UI state. Cancellation aborts the current fetch signal and
invalidates later progress callbacks by sequence. A successful
`RemoteCatalogueAcquisition` retains the source index, verified closure,
composed library, and exact selected source-scoped catalogue key. It is
published to the main controller only after composition succeeds.

`RemoteCatalogueMetadataCacheKey` contains provider, owner, repository, exact
commit, and pinned tree object ID. Its entry retains status, ordered file
reports, compact document summaries, diagnostics, and accepted byte count, but
no parsed generic trees or source byte arrays. The browser serializes this entry
as bounded versioned JSON in
`rosterforge-pinned-repository-metadata-cache`. Reads reconstruct branded IDs,
provenance, source locations, diagnostics, and optional values deliberately.
The service replaces cached file descriptors with the current trusted tree and
checks order, blob identity, summary consistency, status, and declared byte
bounds. A cache hit is advisory planning metadata, never acquisition authority.

Index and closure `complete` statuses describe source acquisition only. They do
not replace validation completeness, suppress projection diagnostics, or claim
that modifiers, constraints, conditions, costs, or legality are fully
understood.

## Local Catalogue Library

The repository batch report is an import-session value, not a persistent
repository model. It retains the caller's batch ID and timestamp, one ordered
record per source file, every accepted parsed document, and diagnostics at both
file and batch-result levels. Rejected source bytes are copied before retention;
accepted files use the parsed document's retained byte array. The report does
not create catalogue-link edges beyond those already projected in each XML
document.

The application catalogue library composes accepted documents without cloning
them. Its `documents` collection is the import report's exact collection; graph
and context values point to those same parsed documents. Catalogue choices also
point to their exact per-catalogue contexts, keeping generic XML nodes,
provenance, imported/archive bytes, extracted XML bytes, unknown values, and
projection diagnostics reachable through existing objects.

`catalogues` retains every composed catalogue, including documents marked as
libraries, because those contexts remain required for graph composition and
source inspection. `selectableCatalogues` is the ordered non-library subset
used for roster setup. A batch containing only library catalogues is therefore
composed but has no available roster catalogue.

A choice key is source-scoped rather than treating a BattleScribe catalogue ID
as globally unique. Drafts retain that key as a lookup token for a context
rebuilt from the same saved bytes; it is not a URL or a globally portable
catalogue identifier. Game systems are exposed as imported documents rather
than user-selectable catalogue choices. Missing game systems and linked
catalogues stay unresolved graph diagnostics; composing a library never
requests or synthesizes them.

The browser shell stores the current library result and selected source-scoped
catalogue key in memory. The first ordered non-library catalogue is selected
after a successful import. Library-only catalogues remain available to graph
composition but are not offered as roster factions. Replacing files replaces
both values; it does not merge documents with the previous batch. An explicit
saved draft separately retains the full batch bytes and key in IndexedDB.
Monotonically increasing request tokens are UI concurrency state only and
prevent older asynchronous imports or
draft-list reads from winning over newer requests.

Rendered summary counts are derived from existing collections: imported file
reports, catalogue choices, diagnostics, visible roots, composed force
definitions, and composed category definitions. They are display values, not a
new indexed model. The selected choice continues to retain the exact parsed
document and catalogue context by reference.

## Local Roster Draft

`LocalRosterDraft` is a versioned persistence envelope, not another domain
model. Version 1 has the literal format
`rosterforge/local-roster-draft` and contains:

- draft ID plus creation and update timestamps;
- the selected source-scoped catalogue key;
- original import batch ID and timestamp;
- every source filename, optional source ID, source kind, media type and origin,
  and copied byte array in original order;
- one immutable structural `Roster`.

It deliberately excludes parsed BattleScribe documents, generic XML nodes,
projections, graphs, catalogue contexts, materialized choices, cost or
constraint reports, undo/redo history, and React state. Saving therefore does
not clone or serialize those object graphs. Reopening reruns secure ingestion
and composition, which restores generic XML access, projections, original
bytes, provenance, and diagnostics through their normal representations.

The decoder treats IndexedDB records as untrusted. It accepts only the known
format and version, ISO-compatible timestamps whose update is not before
creation, ordered file arrays with `Uint8Array` bytes, known roster definition
kinds, and unique force and selection occurrence IDs. It enforces configured
text, definition-key, file-count, total-byte, roster-node, and roster-depth
limits before reapplying branded ID types. Returned source bytes are copies.

Optional file source ID, source kind, media type and origin, definition source
ID, force or selection name, and selection amount are absent when the stored
property is absent. Known source kinds are `local-file`, `download`, and
`synthetic`; other stored strings are invalid rather than silently replaced.
Absent selection amounts decode as the model's implicit one; present amounts
must be positive and finite. Explicit empty strings remain present. Unknown object properties are ignored so additive
record metadata does not become part of the typed model; an unknown format or
version is rejected. Invalid values return a diagnostic with a structured
property path and do not yield a partial draft.

The IndexedDB adapter stores one envelope per draft ID. List summaries derive
roster name, timestamps, catalogue key, source-file count and byte total, and
recursive selection count from decoded records. A malformed sibling is omitted
from summaries and diagnosed while valid records remain usable. Save and load
decode at the boundary; delete acts only on the requested ID and requires a
second explicit UI confirmation.

Restoration finds the saved catalogue in the rebuilt library, verifies the
roster catalogue reference, resolves the one supported root force definition,
and recursively maps each roster selection definition key and optional source
ID back to exactly one newly materialized choice. Missing or ambiguous matches
fail restoration rather than leaving an occurrence without its source object.
The current browser editor rejects multiple root forces and nested forces
because it only displays and edits one starting force. This is an editor
boundary, not a limitation of the draft decoder or `roster-model`.

## Local Roster Session

A local roster session groups four exact values: the selected
`LocalCatalogueChoice`, its selected top-level `BattleScribeForceDefinition`,
the immutable `Roster` returned by `roster-builder`, and a read-only map from
selection-occurrence IDs to exact materialized choices. The wrappers and map
values are retained by identity; the roster contains only source-scoped
definition references and branded occurrence IDs, not XML or graph objects.
The catalogue choice also retains the aggregate visible-root truncation flag
produced while its context was composed.

The setup form defaults to the first top-level force definition in composed
order. Nested force definitions are not flattened into that selector. A
headless caller that supplies no selection-ID factory receives one root force
and no selections. The browser supplies a factory, so supported required roots
are initialized immediately in visible source order. Displayed counts are
derived from effective selection amounts in the immutable tree and do not imply
validity, completeness, or legal force composition.

Resolved visible roots are shallow UI choices over the existing materialized
wrappers. Adding one creates a direct child selection under the session's first
force. Adding the same root repeatedly creates new occurrence IDs and roster
selection objects while retaining an equal source-scoped definition reference.
An occurrence amount may then be set or cleared through the session wrapper;
the choice map and source wrapper remain identical, and history records the new
immutable session. The browser displays lexical source `defaultAmount` and
numeric `step` hints but deliberately begins an absent roster amount at one.

The browser groups these same wrappers by the first explicitly primary category
link that resolves to exactly one composed category definition. Category
sections are created when their first visible root is encountered and preserve
root order within the section. Roots without one reliable primary category
remain visible under `Uncategorized`; secondary links are not promoted to
primary status. This is presentation metadata and does not alter the context,
materialized choice, roster reference, or add command.

Root filtering is ephemeral React state. It compares a normalized query with
the effective displayed root name, preserves the grouped wrapper identities and
their order, and never enters a roster session, history snapshot, or saved
draft.

`inspectEmptySingleForceRootChoices` retains every resolved visible root with
its supported force/roster minimum, maximum, bound identity, and completeness.
When every relevant bound is explicitly shared, the identity uses the
materialized definition ID; otherwise it uses the visible occurrence ID.
`inspectLocalRosterRootChoices` counts current top-level selections with that
identity by effective amount and adds selected and remaining-required totals to
each grouped root view. Reaching a supported maximum disables the browser add control but
does not add general command rejection or legality state.

Browser add handlers also provide a descendant occurrence-ID factory. After
the selected root or child is added, the local session consumes the read-only
initialization plan and routes every planned descendant through
`addRosterSelectionToSelectionFromCatalogueContext`. The returned session and
occurrence-to-choice map include the complete expansion only when all builder
commands succeed. This initializes simple BattleScribe defaults without moving
constraint interpretation into `roster-builder`.

Session creation uses the same factory with the empty-single-force root plan.
Each planned root and all of its supported descendants are applied through the
ordinary guarded commands. A failure returns no partially initialized session.
Conditional root requirements are not guessed, and a supported unconditional
modifier can reduce a base minimum to zero before any occurrence is created.

Each mapped materialized choice supplies direct quick-add controls from its
selection entries and resolved entry links. `inspectLocalRosterChildChoices`
combines the evaluation group projection with the parent's current direct
children. It returns direct and grouped concrete choices, selected occurrences,
amount-scaled selected totals, remaining supported minimum, supported maximum,
and completeness. Direct
choices at a reached supported maximum have disabled browser add controls. A
group is presentation metadata and is not added to the roster.

Choosing a group entry creates that concrete nested occurrence through
`roster-builder` and records its exact materialized choice. When a supported
group maximum is one, choosing a different entry immutably removes the prior
member and adds the replacement as one session operation. A failed replacement
exposes neither the removal nor a partial descendant expansion. Max-zero
groups cannot be chosen. Larger or unknown maxima retain additive structural
behavior and are not general legality enforcement.

The occurrence details disclosure reads the exact mapped choice. Profiles are
shown as direct projections followed by resolved profile info-link wrappers;
rules use the same direct-then-linked ordering. Characteristic order and text
are unchanged. Direct/linked origin and each definition's source filename are
displayed without replacing the retained projection or materialized wrapper
with a browser-owned domain object.

An absent rule description is displayed differently from an explicit empty
description, and an explicit empty characteristic value remains visible as an
empty value. Unresolved info links expose their name or target ID plus
materialization reason. Their existing source-located diagnostics remain on
the catalogue context; the details disclosure does not retry resolution,
deduplicate definitions, or infer publication text.

Removal addresses one branded selection occurrence. Because roster commands are
immutable, removing one repeated root returns a new session while the previous
session still contains both occurrences. Any descendants would be removed with
that occurrence subtree by the roster-model command, and their IDs are removed
from the returned session's materialized-choice map.

Roster, force, and selection occurrence IDs are generated by the browser and
remain opaque. Explicit draft saving preserves their strings and branded roles;
it does not give them source identity or BattleScribe semantics. Clearing setup
or replacing imported files drops the active session but does not delete a
previously saved draft. Supported unconditional parent minima can initialize
descendants after an add. Static hidden choices and choices hidden by supported
direct or grouped Boolean modifiers are omitted from the child browser. No
category, cost, or broader legality rule changes whether a resolved child is
offered. Unsupported hidden behavior remains visible and incomplete rather
than being guessed. Unsupported modified group bounds are likewise labeled
incomplete rather than becoming edit guards.

The page stores the active local session inside a bounded immutable history.
Each successful add or remove commits the complete `LocalRosterSession`, so
undo and redo restore the roster and occurrence-to-materialized-choice map as
one exact snapshot. A commit after undo discards the old future branch. Equal
snapshot references do not add entries, and only the newest 100 past snapshots
are retained.

Undo and redo do not regenerate occurrence IDs, replay commands, clone maps, or
rerun imports. Cost, constraint, and details views are derived again from the
restored present snapshot. History is dropped with the local roster session and
has no browser-storage or serialization representation. Opening a draft starts
fresh bounded history at the restored session.

Selection naming is occurrence-specific. A rename stores trimmed non-empty
display text on that `RosterSelection`; reset passes the exact mapped
materialized choice name back to `roster-model`, including `undefined` when
absent. Neither operation changes the definition reference, nested selections,
or occurrence-to-choice map. Because naming creates a new immutable session, it
participates in the same bounded undo and redo history.

The browser derives its selection metric recursively from the current
immutable tree. It also calls
`evaluateRosterCostsWithSelectionConditions` for every displayed snapshot.
The report retains the exact roster and selected catalogue context by
reference. Ordered totals use the projected cost-type name when present;
excluded costs, unresolved selections, diagnostics, and report completeness
remain separate from those totals.

This report is display state, not roster state. A complete label means the
applicable behavior is supported within the documented selection-condition
cost scope. An incomplete label means displayed totals are provisional because
data or behavior was excluded or unresolved. Neither state implies roster
validity, and neither blocks structural add or remove commands.

The browser also runs roster-wide selection-constraint inspection in
`selectionConditions` scope and force-constraint inspection in `conditions`
scope. The local adapter retains both reports by reference and concatenates
their diagnostics in selection-then-force order. It derives shared
completeness only; there is intentionally no shared status or validity field.

Presentation flattens selection bounds before force bounds while retaining
source order within each owner collection. Each row exposes its owner kind and
name, projected type and scope, observed value or possible interval, effective
or base limit, individual status, and individual completeness. Summary counts
are separate satisfied, violated, and unresolved tallies. They are inspection
results, do not amount to aggregate legality, and never guard structural
commands.

The separate
`inspectEmptySingleForceRosterStructuralStatus(roster, context)` report
aggregates only the supported selection structure used by the current editor.
It requires exactly one root force and no nested forces. Root occurrences are
resolved against visible materialized roots. Each descendant is resolved
against direct entries and concrete transparent-group choices belonging to
its resolved parent rather than against an unrestricted global definition
index. This keeps alternate root-link materializations from making a child
occurrence spuriously ambiguous.

The ordered bound union has `root`, `direct`, and `group` variants. Every item
retains its exact force or owning selection, materialized choice or group,
known selected occurrences, `selectedCount`, `possibleSelectedCount`, minimum,
maximum, status, and completeness. Bounds with a positive minimum or finite
maximum are included. An incompletely interpreted root is included when it has
a known selected occurrence; while unselected with neither effective bound
known, its incomplete state and source-located diagnostics remain observable
without promoting it into an actionable finding. Unconstrained
zero-to-infinity choices are omitted from the report.

Unresolved child candidates increase the possible count without increasing
the known count. A minimum is known violated only when the possible count is
still below it. A maximum is known violated only when the known count already
exceeds it. Bounds whose uncertain interval crosses a limit are unresolved,
not guessed satisfied or violated.

The report's two aggregate dimensions remain independent:

```ts
{
  validity: "valid" | "invalid";
  completeness: "complete" | "incomplete";
}
```

Any known violated structural bound makes validity invalid, even if some
other bound is incomplete. Unsupported bound behavior, partial choice
materialization, catalogue mismatch, unresolved definitions, or an unsupported
force shape makes completeness incomplete without inventing invalidity.
Consequently `valid` and `incomplete` means only that no supported structural
violation is known.

`inspectLocalRosterStructuralStatus` is the browser-session adapter. The UI
shows the two dimensions as separate badges and lists the ordered structural
bounds. Violated and unresolved items are open by default; satisfied bounds
and diagnostics are retained in separate collapsed disclosures. Direct and
group rows include the owning occurrence name and a stable in-page link to
that occurrence. Root rows link to the available-root editor because their
category disclosure may be closed. It recomputes after add, remove,
replacement, undo, redo, and draft restore because it is derived from the
current immutable session. The adapter passes the retained
materialization-truncation flag, so this frequent derived view does not
traverse the entire catalogue merely to rediscover partial materialization. A
headless evaluator caller can omit that option and use the conservative index
fallback. Direct and recursively grouped Boolean `set` modifiers can hide or
show a child choice or transparent group when their supported conditions are
decisive. Owner-direct modifiers run first; top-level groups retain source
order and execute direct children before nested groups depth-first. Group
ancestry is evaluated before descendant bounds, and the browser also evaluates
each entry inside a visible group. Definitively hidden choices are omitted;
unresolved hidden behavior remains available, diagnostic, and incomplete.
Exact repeated structural diagnostics are deduplicated by code, source
location, and details. Optional unselected roots with unsupported dynamic
bounds contribute one catalogue-level unsupported diagnostic but do not make
roster structural completeness incomplete. Selecting such a root restores its
source-located diagnostic and makes its bound and incompleteness actionable.
Unknown reachability remains conservatively incomplete. The status does not
evaluate category eligibility, broader hidden behavior, general selection or
force constraint conjunction, costs, or legal force composition, and it does
not block edits.

`composeSupportedRosterValidation` combines exactly three already-produced
reports: structural status, selection constraints inspected in
`selectionConditions` scope, and force constraints inspected in `conditions`
scope. All three must retain the same roster and catalogue-context object
identities. The result retains the inputs by reference, places structural
findings before selection-constraint and force-constraint findings, and counts
satisfied, violated, and unresolved items separately.

Aggregate validity is invalid when the structural report is invalid or any
constraint is known violated. Aggregate completeness is complete only when
all three reports are complete. These dimensions remain independent.
`inspectLocalRosterSupportedValidation` is the headless session adapter that
computes the inputs once and preserves the structural and constraint
diagnostic lists separately. Composition does not re-run evaluators, interpret
unsupported behavior, block edits, or establish full BattleScribe legality.

The browser derives its compact supported-validation ribbon and both detailed
domain cards from that single session inspection. The ribbon presents combined
status counts and links to structural and constraint details, while the detail
cards continue to use their original report objects and domain-specific
diagnostics. A cleared constraint violation can therefore remain visibly
invalid when an independent structural requirement is still violated; neither
dimension is flattened or hidden.

Constraint presentation follows the structural card's issue-first convention.
Reports with a supported constraint type, scope, and effective limit can enter
the actionable list. Their violated and unresolved states remain in original
order in an expanded disclosure, while satisfied reports and diagnostics use
separate collapsed disclosures. Unsupported projected constraints stay in the
underlying domain report and diagnostics, continue to make completeness
incomplete, and do not inflate issue counts. Each selection-owned actionable
constraint links to the stable DOM anchor of its exact occurrence. Each
force-owned actionable constraint links to the stable anchor on its force card.
These links are presentation references only and do not change report identity
or command behavior.

Recursive child-occurrence disclosures are also presentation state. A
selection with more than two direct children starts collapsed, which keeps
large automatic initialization expansions manageable without changing the
immutable roster tree. Smaller collections start open. The browser derives a
set of selection occurrence IDs from current non-satisfied supported-validation
findings and opens any ancestor disclosure containing one of those IDs.
Disclosure state is neither part of `LocalRosterSession` nor persisted.

The workspace navigator is another derived presentation over the same
snapshot. Its Roster count is the number of direct selections in the one
displayed force, its Add units count is the current filtered visible-root
count, and its Checks count is the sum of violated and unresolved items in the
supported-validation composition. Each link targets a stable heading. Desktop
pane placement and mobile stacking do not create a second roster model or
change category grouping, report order, or command eligibility. Hiding the
catalogue summary while the roster workspace is active is likewise
presentation-only; clearing setup reveals the same imported library.
