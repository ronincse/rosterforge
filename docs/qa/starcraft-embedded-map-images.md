# Embedded map images — bounded implementation and resumed acceptance

> Current result: see the 2026-09-28 continuation below. The previous partial
> acceptance record is historical; its then-pending PDF and second-army checks
> are now completed. Actual download/native-print acceptance remains tool-limited.

2026-09-26. Baseline `1445e3a6bb508e7a5ac6c239a8144126c0129bab`, clean and
upstream-equal after fetch. Only `codex/starcraft-pilot` was changed. Print/UI
chat was inactive. Owner subsequently requested an ASAP wrap-up; the remaining
acceptance matrix below is explicitly unfinished, not silently waived.

## Contract and trace

Retained source bytes -> existing exactly-once XML parser -> typed characteristic
-> evaluated selected reference -> shared `referenceContent` spans -> bounded
JPEG admission -> platform `HTMLImageElement.decode()` -> trusted React figure.
The scalar print snapshot follows the same parser, stores ephemeral preparation
results, and carries approved data URIs into script-free HTML. No source or saved
army migration, no entity re-decoding, no cost/validity change.

Only explicit `![caption](data:image/jpeg;base64,...)` is supported: canonical
base64, baseline/progressive 8-bit JPEG, checked signature, segment lengths,
positive dimensions and end marker. Header admission alone does not establish
successful decode. Limits: 350,000 encoded characters, 256,000 decoded bytes,
2048 pixels per dimension, 4,000,000 pixels/image; 32 image occurrences and
4,000,000 bytes/document (also a shared mounted-reader allowance). One concise
overflow placeholder summarizes further images; prose separators are retained.
Captions have 512-character bounded lookahead. Decode timeout is eight seconds
per image; export decodes unique admitted payloads sequentially, at most32.
The ephemeral per-snapshot outcome map survives preset changes and is released
with the dialog. The reader cancels temporary elements and releases reservations
on unmount; no persistent image cache or object URLs are introduced for images.

Escaped syntax, backtick/tilde code and indented code remain inert. Arbitrary
links/data-looking strings and player names never create images. Remote, local,
protocol-relative, imported blob, SVG, HTML and other MIME types are rejected
without fetching. Rejection/decode failures retain captioned placeholders and
surrounding instructions, rather than displaying payloads. The prose32,768/
512-line limits and shared256-link/4096-formatting allowances remain separate.
Payloads never enter glossary phrase scans or per-character React expansion.

Screen offers native-dialog enlargement, Close/Escape and trigger focus return;
full aspect ratio is retained, with native-resolution scrolling inside the phone
viewer. Print uses full-width figures with unsplit images, 180mm maximum height,
original colors and unchanged10.5pt body/presets. `img-src data:` is added without
broadening `default-src 'none'`; scripts, objects, external resources, base/forms
remain forbidden. Parent-controlled preview/print decoding replaces failures
before readiness. Readiness is bound to exact HTML and the attached iframe,
not an earlier load event. Saved HTML captures any preview failure placeholders.

Primary references: [HTML image decoding](https://html.spec.whatwg.org/multipage/images.html#dom-img-decode)
and [CSP image directive](https://www.w3.org/TR/CSP3/#directive-img-src).
No new dependency, codec, Markdown engine or arbitrary imported HTML.

## Frozen inventory

StarCraft `99261754e0449bbaaa04e6890e1625b144f9ece1`: all five manifest
sizes/hashes verified. Ten Deployment Map profiles, all in GST, all one JPEG
span in the unnamed second field, following full Setup text. Setup type
`29d0-bdc8-9ea5-8102`; image field type `a18f-759e-1e7d-37f4`; profile type
`f4ab-3b0f-781c-91de`. Parent group `2ce1-a1c6-f9fd-44e7`, wrapper
`d444-6767-cbfc-bf56`, game system `sys-ce49-e853-2fea-6af1`.
All ten decode with Pillow, baseline RGB, no EXIF orientation; no other image
constructs were found in XML values/attributes. Maximum is Proving Grounds,
53,184 encoded characters/39,886 bytes, not the older approximate50k ceiling.
Lead and independent reviewer visually inspected the four requested originals:
colored zones, grids, dimensions and numbered markers preserved. Small labels
are source-resolution limitations; nothing was redrawn or sharpened.

| Map | Owner | Profile | Encoded | Bytes | Dimensions / pixels | SHA256 |
| --- | --- | --- | ---: | ---: | --- | --- |
| Abandoned Camp | 7d52-0151-6890-efad | dm-profile-00 | 36788 | 27591 | 540x540 / 291600 | 99f9f8fbab3e2c85f571ada79fa99b2f4fb3e5e131dfce611e3b4c76ca56fab5 |
| Acropolis | 8867-f408-820f-61a1 | dm-profile-01 | 49976 | 37481 | 810x540 / 437400 | 1f318dfd24801056acf3fcb8b07267625f890467896e127939253b671baebb5f |
| Agria Valley | 9bbc-dd07-b172-7b3a | dm-profile-02 | 34280 | 25708 | 540x540 / 291600 | b6246966dada7fbd9d1747a6e2131d87b5e3f7322f03491367fdb2dac2d84a40 |
| Breach | 0d04-f286-bc47-8bec | dm-profile-03 | 49820 | 37363 | 810x540 / 437400 | 11a5628f0d90db7cdacbae639472e720c1098e610abdc12c553a8bd128101427 |
| Char Plains | 9710-c30a-2bb5-708a | dm-profile-04 | 34572 | 25928 | 540x540 / 291600 | 06d0ef82c0b42f206f2d3359a1eaba1a58f1f8248c5c862bcc450e7d3c08e4ff |
| Dirt Side | 3764-12ae-20ed-7a78 | dm-profile-05 | 38480 | 28860 | 540x540 / 291600 | 415d57a9dc3252d5951b93f030cdb74fb45201251cb53b38f5b86b5e08dfd99d |
| Frontier | d45e-a494-4545-719c | dm-profile-06 | 34732 | 26049 | 540x540 / 291600 | 4b1aa5826baae4f2d56a95d98c4593d90f730df33355521328d810c06feaa8ad |
| Gauntlet | 574e-cf38-3a94-283c | dm-profile-07 | 51996 | 38995 | 810x540 / 437400 | 1ac74d299c875267d62da7f42bae736a24767425f2ca71726be23d83b3d20fcb |
| Proving Grounds | c6cb-bff3-9ca9-a43c | dm-profile-08 | 53184 | 39886 | 810x540 / 437400 | 6e917acb637ee7718f0518f341b2d5f4fb0b4e80e7ca7ea9b223f5d5c1f82951 |
| Typhoon | 8488-c350-b0f9-3e67 | dm-profile-09 | 50364 | 37773 | 810x540 / 437400 | 75300fe2875e72c988d21d7682c6ea957c340fccae50f502965055d1c3a75b7c |

Full ordered setup text and field identities are retained in the local sanitized
inventory, `C:/CodexACLTest/starcraft-map-review-20260926/.cache/map-inventory/inventory.json`.
No third-party JPEG or catalogue bytes are committed. 40k A
`04c62fcd041b3808c39d5c46fd677c704027b979` and B
`5b261ec423d5d017bb733c4f3c0a760b085d5ca5` remain configured and unchanged.

## Evidence and qualifications

- Fictional oversized JPEG regression fails on untouched1445e3a (literal payload,
  missing image) and passes after repair. DOM tests cover actual images, escaped
  hostile captions, forbidden URLs with no fetch, decode error/timeout/abort,
  aggregate cleanup, prose/code bounds, cross-span link budget, exported CSP,
  owner/caption separation and model-switch readiness. Frozen integration admits
  all ten values through ingestion/projection. Existing selected/hidden/unresolved
  visibility, XML bytes, renderer timing and both game corpora remain covered.
- Isolated5303 was seeded with four copied prior test drafts, changing only their
  disposable identities/names. Ordinary shelf reopened Protoss without save or
  migration:1220 Minerals/130 Gas, limits1500/200, original signed counters,
  zero known violations, source loicmusy/StarcraftTMG-NR retained. Acropolis and
  Breach display with complete setup text; Standard Engagement Divide and Conquer
  and Frontlines remain the active variants. Roster actions still report all
  changes saved. Actual viewer tested at desktop,390 and320 widths, with no phone
  page overflow; Escape restored Enlarge trigger. No broader game parity claim.
- Actual generated Compact `srcdoc` was captured from the visible print dialog,
  183,418 UTF-8 bytes. Existing headless Edge155.0.4283.18 rendered that exact HTML
  with offline context and every network request blocked: zero requests, both
  810x540 maps decoded,17,038 visible text characters, correct Standard variants,
  no base64 in visible body. This is **rendered application-preview evidence**,
  not a claim of a completed HTML download. IAB download events timed out; native
  browser launch approval timed out. Neither was bypassed.
- Local evidence folder: `C:/CodexACLTest/embedded-map-evidence/` contains the exact
  preview HTML, offline screenshot/results, copies and scripts. HTML SHA256:
  `fc22559692fe4d8a8fe4fa6a30fd10d160de54c8691cc2f4dc5dc01d08caf204`.
  These are interim review artifacts, not final PDF samples.
- **Not completed after the owner's wrap-up request:** second-map-pair actual
  browser/ledger acceptance; actual downloaded HTML offline reopen; Compact and
  Sheets x Letter/A4 final PDFs plus second-pair PDF; every-page final visual
  inspection and final sample manifest. No PDF was generated, no pagination or
  physical-printer acceptance claimed. Final owner print-layout acceptance stays
  pending. Do not infer complete-army acceptance from the working Protoss maps.

## Review, gates and stop

One authorized scoped Claude attempt failed OAuth refresh before inference; no
retry, credentials, provider installation or billing change. Isolated native
review reproduced and challenged scan/token bounds, literal contexts, prose/link
limits, overflow separators and stale preview readiness. All found issues were
fixed; final independent32 tests/eight suites pass, no remaining scoped blocker.

Final normal1139 pass/35 optional skips,118files,12.57s; configured1174pass,
zero skips,118files,42.20s. Populations overlap. Configured JSON corpus,40k A/B,
StarCraft XML and saved Dark Angels print fixture all executed. Lint, typecheck,
build and whitespace pass; existing bundle-size advisory only. An old gitignored
counter probe that blocked lint was moved byte-identically into this evidence
folder, not discarded. Existing5297/5299/5301 storage/artifacts were preserved;
those ports were not listening at baseline. New5303 server remains running.

**Disposition: partially supported with remaining acceptance work identified.**
The tested Protoss maps are usable onscreen and in rendered offline preview HTML;
final download/PDF and second-army acceptance remain unverified. Stop here. Dynamic
activation/limits, source freshness updates, format expressions, orphan cost types,
revision mismatch and evaluator precedence/routing qualifications remain unchanged.


## 2026-09-28 continuation — final samples, bounded tool limitation

Clean fetched baseline and tested HEAD `b1b06459648f168783a90b3fb693c41655e5dfec`,
upstream-equal. No newer pilot work or active print/UI writer found. Existing
5303 process was absent; restarted the same saved server script against this
checkout, PID59308, preserving origin/storage and four retained SC Maps copies.
No application changes were necessary. Existing independent implementation
review remains applicable; no repeated inventory or security audit.

### Acceptance ledger

| Check | Disposition |
| --- | --- |
| JPEG admission, source inventory, original images, hostile cases | Previously verified; implementation unchanged; current focused regressions pass |
| Primary Protoss retained army | Newly reopened normally;1220/1500M,130/200G, signed counters unchanged; Acropolis/Breach and full Standard mission fields present |
| Second army Terran | Newly reopened twice normally;570/600M,60/200G; independent Marines9/240 and6/160; Abandoned Camp/Agria Valley540x540 and all Setup fields retained; Skirmish missions at600; orphan-cost qualification retained |
| Reader and enlargement | Desktop1280x900 DOM/decoded geometry and390x844 phone checked; full square/landscape aspect ratios, captions, no payload prose; Close/Escape restore the corresponding trigger; phone viewer scrolls internally |
| Save/preview state | Preset switch briefly disables actions until new document is ready; afterwards enabled. Totals/choices/source/save status and old shelf timestamps unchanged; no edit, migration or forced save |
| Actual HTML download | Unverified: IAB event5s timeout and no matching Downloads file. Native Windows Edge control stopped for URL-policy confidence; no retry/bypass. Not classified as an application defect |
| Offline reopening | Three exact production preview equivalents reopened independently by file URL in fresh offline Edge contexts; zero external requests, two decoded images each, unchanged CSP. Not downloaded-file evidence |
| Normal print entry | IAB control activated separately; native print dialog/new target not observable. Unverified; headless results are separate |
| PDF matrix | Newly complete: Compact Protoss Letter13/A4 13; Unit sheets Letter15/A4 14; Terran Compact Letter9 =64 pages |
| Every-page review | All64 raster pages read at1400px long edge; lead35 Compact/Terran pages, independent native reviewer29 sheets pages plus15 overlapping pages. No missing/split/clipped/stretched map, blank image, payload paragraph or overlap |

Independent reading tasks compared all four complete Setup texts and all seven
fields of each active mission against frozen source, each map byte hash/caption
and owner, separate Marine blocks and qualified costs. Protoss has two Standard
and zero Skirmish profiles; Terran the inverse. Six HTML image occurrences retain
the original JPEG hashes. Printed images may be re-encoded by Edge; original
source bytes and captured data URIs are unchanged. A suspected missing Breach
center5 on a downscaled tool preview was disproved by original-resolution raster
crops and PDF-extracted image inspection; no source or renderer repair justified.

Some map setup text ends on the page preceding its intact diagram, whose image
title and caption retain identity. Sparse sheet continuations/notes pages and
small source-resolution labels remain existing density/legibility qualifications,
not missing content. The browser screenshot tool crops desktop captures relative
to the requested viewport; DOM geometry and phone images support the UI evidence.
No physical-printer, PDF-tagging, universal-browser or final owner-layout claim.

`Opponent&#x27;s` remains literal in mission text: frozen GST lines624/650 author
`Opponent&amp;#x27;s`. This is preserved exactly-once XML decoding, not a new
image defect or permission to repeatedly decode text.

### Final artifacts and validation

Owner folder: `C:/CodexACLTest/ForceWright-Map-Review-2026-09-28/`, containing only
five PDFs, three `*-preview.html` equivalents and `REVIEW-NOTES.md`.
Tested application commit is b1b0645 (implementation7cde04f); later commits are
report/handoff only. Headless Edge155.0.4283.18, portrait,100% scale, production
14mm margins/10.5pt body, browser headers/footers off, background graphics off;
image color-adjust remains production exact. No PDF patching or substitute layout.
Separate logs/raster pages/JSON live under
`C:/CodexACLTest/embedded-map-evidence/final-20260928/`; reviewer evidence under
`C:/CodexACLTest/starcraft-map-review-20260926/.cache/map-inventory/`.

Fresh focused36 tests/10files pass2.79s; normal1139pass/35optional skips,
118files15.52s; configured1174pass/zero skips118files66.49s. Populations overlap.
Configured JSON40kA, frozen40kA/B, StarCraft XML and saved DA print fixture execute;
pins remain99261754,04c62fcd,5b261ec. Lint/typecheck/build pass, existing bundle
advisory only. Whitespace and exact-final CI are recorded in final handoff/Actions.
Existing export/non-mutation lifecycle tests passed; UI never invoked save/edit,
budgets/history changes or migration. No fresh full live-database byte audit claimed.

| File | Bytes | Pages | SHA256 |
| --- | ---: | ---: | --- |
| protoss-compact-A4.pdf | 189894 | 13 | `e118b260164a6f104d40767cc19969196023cc6a6e7a8ce8170da08bb519d629` |
| protoss-compact-Letter.pdf | 189679 | 13 | `08c09482ccc9198bc189bbca40f45baee100e20ad600a2125cafb97a54c12e7c` |
| protoss-compact-preview.html | 183418 | — | `fc22559692fe4d8a8fe4fa6a30fd10d160de54c8691cc2f4dc5dc01d08caf204` |
| protoss-sheets-A4.pdf | 190860 | 14 | `ac0c55b3a5915fdbf78e63ea8d9c2fa575c096835f425b3a0742ac8b9e5cb740` |
| protoss-sheets-Letter.pdf | 191282 | 15 | `69ca3b3012575945346d75ca55808ee1d5867fc22a4aa6fb0a9ed1bccb912dbd` |
| protoss-sheets-preview.html | 183417 | — | `cc1a98bca881cae9403ccae6e61168b10b39bd20d9291482f40358ff4cb53dac` |
| terran-compact-Letter.pdf | 164707 | 9 | `d3f80cae19bb770111dde35be869b569317c64dbf33985ce741eb23c2a70f48f` |
| terran-compact-preview.html | 118939 | — | `13ff44d809b2a1a1f41bc6cfaf0a26890f5617687074f17c094b867bd8acc8b3` |

**Disposition:** the map-rendering/paper-content blocker can close for the tested
bounded JPEG source shape. Full end-to-end acceptance remains qualified by actual
download/offline-downloaded-file and native print-dialog tool limitations. Minimal
owner action: save the three named HTML layouts through ordinary browser controls,
reopen those downloads offline, and confirm normal print entry opens the dialog.
Usable captured equivalents and PDFs are delivered now. No new application defect
was demonstrated; no speculative changes, security bypass or weakened limits.
Stop here; owner print-layout acceptance, source revision mismatch, orphan costs,
format expressions and evaluator precedence/routing boundaries remain unchanged.
