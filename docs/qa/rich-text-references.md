# Rich text and nested references — 2026-09-09

Bounded owner-requested follow-up on `codex/list-builder-ui-overhaul`, baseline
`1e97aa79d273715d29438ef8b1fb8d2ae4f593ff`. No engine, persistence, print, main-merge
or PR work. Imported source bytes and generic trees are preserved.

## Evidence and decision

New Recruit documents [in-text name/alias matching and noindex](https://github.com/giloushaker/nr-docs/blob/4b93391d049b42f480851af125639cf1ce9d13a3/guide/concepts/in-text-references.md)
and [profile formatting, including small caps and tables](https://github.com/giloushaker/nr-docs/blob/4b93391d049b42f480851af125639cf1ce9d13a3/guide/concepts/profiles.md).
The editor's `Basics.vue` at `121de4b8ae0f9a96afa41f2d8f47377520827496` likewise
describes aliases as case-insensitive in-text references. These examples do not
contain inline target IDs. The owner supplied the interactive New Recruit
comparison; this checkpoint did not independently exercise that live app.

Pinned corpus: `E:/GitHub/wh40k-11e`,
`04c62fcd041b3808c39d5c46fd677c704027b979`, 46 JSON documents. Investigation counted
463 descriptions and 56,717 characteristic text fields (57,180 total): 2,186 with
double-star markup, 20 with triple stars, 1,712 with carets, 100 with isolated
stars (including literal stat stars), three with isolated underscores, 410 with
hyphen lists, one true NBSP-indented nested list, two ordered lists and 270 with
Unicode bullets. Five fields use `<ins>`, nine contain literal `<FACTION>`;
maximum field length is 2,720. There are 27 alias arrays and 28 noindex nodes
(26 true). No headings, pipe tables, markdown links, backticks, backslashes,
double underscores, strikethrough or inline 16-hex IDs were observed at this pin.
Non-corpus formatting branches use project-owned synthetic tests.

Angron's Deadly Demise link targets `b68a-5ded-65ac-98c`; its mixed bold/italic
example now renders correctly. Blessings of Khorne `e68b-b42f-6f7c-4670` contains
crossing bold/small-cap delimiters. The text's Warp Blades alias resolves to
profile `fbfe-9079-46e0-0cbf`, named `5. Warp Blades`, whose Roll/Effect fields
require supporting substantive profiles beyond Description-only abilities.
That popup is explicitly catalogue-only. No Deployment target exists in the
available index, so its text remains plain. Rule-name modifier expansion such as
the Deadly Demise D6 heading was not added in this presentation checkpoint.

## Safety and scope

React text/elements only: no HTML injection, imported regex, URL/image fetching
or executable expressions. Exact `<ins>` and `<br>` become safe elements; other
HTML-looking text remains literal. The bounded formatting subset is not full
CommonMark. Rules and substantive profiles are indexed only within the selected
catalogue closure; arbitrary entry names/category-description glossaries are
not new lookup targets. Selected effective names and reports override source-only
targets. Alias/name ambiguity stays plain, not a first-match guess.

Limits: 32,768 text characters; 512 lines; 4,096 markup tokens; 256 links per
render; 160 characters per name; 8,192 names / 500,000 name characters per index;
eight nested lists and eight rule sheets. Text exceeding render budgets remains
plain. An oversized index is disabled with a reading-surface notice, avoiding
false uniqueness from partial indexing. At the sheet limit, links are disabled
with a close-first message. Source-only lookups never remove selected inline
rules, erase uncertainty, or imply that a rule applies to the unit.

## Browser and review

Isolated preview origin 5205: browse the pinned catalogue index, select World
Eaters, create a temporary QA roster, add Angron and open its unit card. Desktop
verified regular prose, authored bold/italics/small caps, all three Deadly Demise
mentions and Warp Blades. Angron → Deadly Demise → Deadly Demise retained all
parents; only the top layer was interactive. Escape restored the originating
link and parent scroll. Angron → Warp Blades → Lethal Hits verified profile
alias resolution and links within another reference, including its italic note.
At 390×844 the rule body's client/scroll widths both measured 325 px, with
14.875 px text and no horizontal overflow. Browser warning/error log was empty.
Screenshot evidence is outside production: `C:/CodexACLTest/rf-richtext-phone-chain.png`
and `C:/CodexACLTest/rf-richtext-desktop-unit.png`. Viewport reset after QA.
These are Chromium viewport checks, not physical iPhone/Safari, screen-reader,
OS text-scaling, dark/forced-color, installed-PWA or physical-print claims.

Native reviewer `markup_corpus` worked in isolated baseline worktree
`C:/CodexACLTest/rf-richtext-review-20260909`. Three findings were fixed before
re-review: matching across formatting runs, fallback for every token in mixed
keyword fields, and effective selected profile names. Final review reported no
remaining high-priority correctness/security concern. The lead reviewed the diff
and executed tests/browser checks; the reviewer did not independently run them.
An external Antigravity lane was attempted in a separate disposable worktree but
failed on local log/auth access and absent login; it was canceled without an
external report. Previously exhausted Claude quota was not retried.

Synthetic coverage includes source-byte preservation, alias/noindex projection,
scope and ambiguity, formatting/malformed/hostile input, mixed-run boundaries,
tables/nested lists, index limits, layered focus/scroll and eight-level closure.
The opt-in integration extends the existing two pinned reference tests with
Angron, actual markup and Warp Blades source-only lookup. Gate counts and final
commits are recorded in the corresponding `agent-handoff.md` assignment.
