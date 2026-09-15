# SC-05: XML reference values

## Result and boundary

SC-05 repairs XML values before projection and display, using the existing parser
and retaining original bytes. This checkpoint follows the separately published
[typed-constraint uncertainty safeguard](typed-constraint-uncertainty.md):
`fa8ea58` implementation and `4962ece84ffb6891aac8e99248675807edd096ee` handoff.
That exact handoff passed [CI 34920532400](https://github.com/ronincse/rosterforge/actions/runs/34920532400).
SC-05 starts at `4962ece`, on `codex/starcraft-pilot`; its implementation commit
is recorded by the following handoff. No dependency, data-pin or third-party file
changes. Main, other worktrees, old browser data and preview servers were preserved.

This is parsed-value support, not SC-06 profile classification, SC-08 freshness,
full game legality, broader typed queries or additional budget activation.

## Frozen examples and reproduction

All four files retain the [baseline manifest](starcraft-pilot-baseline.md) at
`99261754e0449bbaaa04e6890e1625b144f9ece1`. The optional integration test checks all
four SHA-256 values, original source/document byte arrays and unchanged IDs.

| Frozen source | XML context and identity | Old value | Parsed value |
| --- | --- | --- | --- |
| Terrans.cat:1492 | Faction selection `name` attribute, `60b3-fffd-a15a-4cea` | `Raynor&apos;s Raiders` | `Raynor's Raiders` |
| Terrans.cat:10 and other conditions | `childName` attribute for that same faction ID | `Raynor&apos;s Raiders` | `Raynor's Raiders` |
| Terrans.cat:1564 profile, characteristic below it | Ordinary `Rng` text, C-14 Rifle `135f-4d13-ea93-602d`; Marines infoLink at line158 | `12&quot;` | `12"` |
| Protoss.cat:898 profile, text at900 | Ordinary Restoration Effect text, `e1ee-c45e-2390-2106` | `Within 4&quot;` | `Within 4"` |
| Protoss.cat:904 profile, text at906 | Ordinary Force Field Effect text, `3bed-bc23-eac6-223a` | `8&quot;`, `it&apos;s` | `8"`, `it's` |

The lead directly read these frozen contexts. On isolated `127.0.0.1:5279` before
production changes, normal Browse/Terran/create showed the escaped faction name
in the chooser/configuration and `12&quot;` in the Marine reference. A disposable
pre-repair draft was saved with Raynor, Shield and reinforced Marines9/240,
Minerals limit235, and the deliberately literal player name
`SC05 pre-repair &quot; army`. The old four-inch browser observation remains in the
historical baseline; this checkpoint also reproduced all three exact spellings
through the actual ingestion/projection fictional tests before the fix:
**35 failed, 6 passed**. No historical observation was rewritten as a success.

Trace: retained UTF-8 bytes -> existing XML validator/parser -> ordered lexical
nodes -> XML-only value adapter -> ordered semantic nodes -> typed metadata,
profiles/rules and references -> data-graph materialization -> source choices,
reference model and safe React text. No replacement was added in React or to
individual unit/faction names. Encoded angle brackets become text, not new XML
nodes. Rich-text handling is a separate, existing allowlisted presentation layer.

## Installed parser and exact contract

Inspected installed **fast-xml-parser 5.8.0**, lockfile and parser/validator source.
The existing ordered parser uses `preserveOrder`, retained attributes/comments,
no numeric value coercion, no namespace stripping and `trimValues:false`.
`processEntities:false` remains. `cdataPropName:'#cdata'` keeps lexical contexts
separate until conversion; CDATA then contributes literal text in order.
Comments and the parser's existing PI attribute-like payload bypass the decoder.

A direct installed-version probe with general processing enabled did not meet the
contract: ordinary numeric references could remain literal, unknown names were
accepted, and `&#0;` could become empty. The validator's reference checks are not
a complete name/range validator. Turning one option on was therefore rejected;
no new dependency or upgrade was necessary.

The adapter follows [XML 1.0 references](https://www.w3.org/TR/xml/#sec-references),
[Char production 2](https://www.w3.org/TR/xml/#charsets), and
[CDATA](https://www.w3.org/TR/xml/#sec-cdata-sect):

- Exactly five case-sensitive predefined names: amp, lt, gt, quot and apos.
- Decimal digits after `#`, or hexadecimal digits after lowercase `#x`.
- Allowed values: 9, A, D; 20-D7FF; E000-FFFD; 10000-10FFFF, all hexadecimal.
  Valid supplementary scalars, including the XML range endpoints, are retained.
- One pass over original value syntax. Both `&amp;quot;` and `&#38;quot;` yield
  literal `&quot;`; output ampersands are never scanned again. Literal `&quot;`
  inside CDATA/comments remains literal. IDs/target IDs use the same attribute
  processing; no identities are derived from display names.
- Resource policy bounds each spelling to 36 characters including `&` and `;`.
  Excessive zero padding is rejected even when it could denote a valid scalar.
  This is an explicit supported-input limit, not a claim about XML grammar.
- Unknown names (including HTML `nbsp`), missing terminators, malformed numbers,
  forbidden controls, surrogates and out-of-range values fail through diagnostics.
  Character ranges are checked before `String.fromCodePoint`; no uncaught
  numeric exception or successful replacement-character import.

The scan/parts allocation is linear in each value; decoded output cannot exceed
input length. It is not a document parser, does no I/O and has no custom-entity expansion table.
Existing parser CRLF-to-LF behavior, literal attribute whitespace and trim policy
are retained. This checkpoint does not claim new full
[attribute normalization](https://www.w3.org/TR/xml/#AVNormalize) conformance.
PI lexical fidelity is limited to the existing parser representation. Original
bytes retain lexical spelling/delimiters even where semantic nodes do not.

## Security and rendering evidence

The declaration precheck is unchanged and runs before parsing. Actual DOCTYPE,
custom/external/parameter entities and repeated declarations are prohibited.
The conservative check also continues rejecting declaration-shaped tokens in
comments/CDATA; it was not weakened to enable references. The decoder cannot
fetch external resources. Small declaration fixtures verify rejection and no
fetch call; no expansion/memory-exhaustion experiments were used.

Maintainer advisories were inspected as regression leads, not as proof this
installed version is affected: [numeric RangeError](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-37qj-frw5-hhjh)
(affected through5.3.3, fixed5.3.4),
[numeric expansion limit bypass](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-8gc5-j5rx-235r)
(fixed5.5.6 on the5.x line), and
[repeated DOCTYPE counters](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-8r6m-32jq-jx6q)
(listed range starts5.9.3, fixed5.10.1). Installed5.8.0 is outside those listed
ranges. General expansion remains off regardless.

Compressed/expanded limits, path/entry validation, bounded inflate, CRC and
original archive retention were not modified. Plain and compressed XML fixtures
produce equivalent semantic values and retain their respective payloads; invalid
compressed numeric references reach the same failure diagnostic.

The end-to-end UI regression ingests fictional encoded script, image/event,
SVG/event, iframe and javascript-link text, projects it, and renders through the
actual `ReferenceRichText`. No executable/resource elements, event attributes or
URLs are created. Dangerous-looking text stays visible, permitted ins/br formatting
still works, and double escapes/CDATAs remain literal. No arbitrary HTML insertion,
imported regex execution or new formatting policy was added. JSON and player text
never enter the XML adapter. Existing print generation HTML-escapes labels; the
saved-draft fixture inspects generated output for literal player text and inert
content. The live Print/Save PDF action was invoked, but its generated window was
not exposed as a controllable IAB tab. No actual print/PDF pagination claim.

## Derived caches and saved-source compatibility

Only derived metadata payload version changes, **3 -> 4**. Versions1/2/3 are quiet
misses; rebuilding uses verified cached source bytes. Database names/version2,
byte-cache formats, immutable keys, eviction limits and saved drafts are unchanged.
A production-adapter regression verifies fresh indexing, simulated legacy-v3
names, reindexing without blob downloads/byte clearing, closure acquisition and
subsequent warm-v4 metadata hit. The fictional source name contains a double escape,
so repeat acquisition cannot progressively decode it.

Saved sources are rebuilt from their original bytes, never reserialized XML.
For old encoded definition IDs, ordered XML records the original `xmlRawId` only
when decoding changed it. Restore and structural checks accept that spelling
only at the exact original source/path and kind. JSON has no such alias. Three
save/decode/rebuild/restore rounds retain roster/history IDs, original bytes,
player strings, costs and an explicit budget violation; add/remove still works.
Wrong original catalogue identity fails. All frozen StarCraft IDs already contain
literal syntax, verified across all four files, so no alias is needed there.

Two honest limits remain. Saved occurrence names do not record whether the source
fallback or a player supplied them; copied escaped labels and deliberate player
labels therefore remain untouched. Rebuilt profiles/rules and newly selected
names are correct. Also, an old escaped cost-type budget ID has no source/path
key; it is retained as unresolved, not silently applied to a decoded identity.
The focused regression protects that boundary. Frozen StarCraft has no encoded definition or cost-type IDs; its copied-label
limitation was observed and preserved. Strict-reference rejection found no malformed file
in this frozen closure. A failed import/rebuild is diagnostic, not permission to
delete its recoverable source or saved draft.

## Browser acceptance

Only disposable origins `http://127.0.0.1:5279/` and `http://localhost:5279/` were
used. Original5271/5273/5275/5277 data/tabs/servers were preserved.

- Pre-repair draft reopened with Marines9/240, budget235 and exact5over. Its
  deliberately literal army name and old copied Raynor label remain unchanged;
  rebuilt C-14 Rifle is `12"`, with complete Shield/Stimpack/rule text. Updating
  and reopening this legacy draft again retains the same values without progressive
  decoding, including the intentionally literal player name.
- New Terran Browse/faction/configuration shows `Raynor's Raiders`. The exact
  faction choice is category-qualified (a same-name Core unit also exists);
  the pinned test verifies ID60b3-fffd-a15a-4cea. Missing-faction finding clears.
- Marines6/160 -> Shield6/180 -> reinforced9/240 -> removal6/180; a second squad
  stays6/160. Re-reinforcing the first gives9/240 +6/160 =400. Saved/reopened with
  limit395, exact5over, six satisfied structural and12 satisfied constraint bounds.
  Source-zero incompleteness and missing Terran cost definitions remain qualified.
- Fresh localhost Browse indexes4files/3factions, loads Protoss with0 import
  diagnostics, and creates Daelaam +Sentries2/130. Restoration4", GuardianShield4"
  and ForceField8"/it's retain complete prose. Save/reopen retains those values.
  Repeated Browse explicitly reports metadata restored from this browser.
- Zerg warm-cache load/create succeeds; Zerglings12/180 initializes. Problems
  correctly show missing Faction and Not enough Core Supply. These actual messages
  contain no encoded reference needing a text change; their behavior is retained.
- Normal file chooser imports all four original XML files together,0 diagnostics,
  with Terran/Protoss/Zerg setup choices. Existing saved Protoss then reopens its
  own source context successfully.
- Desktop1440x900 and phone390x844 screenshots inspected for Marines and Sentries;
  phone Raynor label wraps readably. Marine page width375/scrollWidth375, no page
  overflow. Full rule text remains available by ordinary vertical scrolling.
  Profile-kind routing remains the known SC-06 limitation. Viewport reset.
  Protoss browser warning/error log empty.

Local screenshot evidence, outside git, is under
`C:/Users/stone/.codex/visualizations/2026/09/12/01a09368-161b-7c60-a3c6-b0afa598b7de`:
`sc05-marines-desktop.png`, `sc05-marines-phone.png`, `sc05-raynor-phone.png`,
`sc05-sentries-desktop.png`, `sc05-sentries-phone.png`.
The5279 preview is left running for owner testing. No physical-device,
screen-reader or full New Recruit parity claim.

## Review, tests and stopping point

Lead owned implementation/integration/browser work. A bounded native independent
reviewer used the dedicated detached `starcraft-uncertainty-xml-review` worktree.
Claude's installed launcher was unavailable earlier in this session; it was
not retried/reinstalled and no Claude review is claimed. Candidate review covered
context, numeric failures, declaration security, rendering, metadata and draft
identity. Final added range/compressed/legacy-budget tests were approved with no
blocker. Browser/gate results are lead evidence, not independently rerun by reviewer.

Focused XML/draft tests: **45 passed,2files,1.11s**. Normal suite:
**919 passed,32 optional skipped;89 passed/7 skipped files,11.82s**. All seven
configured integration files: **32 passed,0 skipped,38.50s** (30 existing40k,
2StarCraft). Initial combined run timed out only the new whole-source XML test at
its default5seconds; it now uses the existing corpus test's30second allowance,
with assertions unchanged. Lint/typecheck/build/whitespace pass. Build189modules,
JS834.96kB/gzip231.15 andCSS83.38kB/gzip14.87; existing chunk advisory remains.

Configured40k checkout HEAD `04c62fcd041b3808c39d5c46fd677c704027b979`, JSON corpus
`E:/GitHub/wh40k-11e`, correctness snapshot manifests at
`C:/CodexACLTest/rf-data-parity-evidence-20260910`, and StarCraft directory
`C:/CodexACLTest/starcraft-pilot-evidence/data` remain unchanged. Pricing,
Supporting/association boundaries, initialization, budget state, persistence/
recovery, reference grouping, capacity, Dark Angels switching, rule visibility,
phone references and renderer timing regressions pass.

Publish only these checkpoint commits and handoff to `codex/starcraft-pilot`,
then confirm exact-final-commit CI. Stop. Remaining source revision mismatch,
orphan cost types, source-zero/hidden-default/dynamic budgets, SC-06, SC-08,
nine broader40k category requirements and unsupported traversal shapes remain
qualified. Correct text does not establish full game support.
