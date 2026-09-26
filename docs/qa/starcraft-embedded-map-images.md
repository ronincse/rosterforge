# Embedded map images — bounded implementation, partial acceptance

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
