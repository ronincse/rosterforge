# ForceWright integration and rebrand — 2026-09-11

## History and scope

Owner authorized integration into existing main and a separate product rename.
Fetched old main `3e9d05dea6215454c2fb02de2eeeac305adffd72`; accepted overhaul
`69b209518bd53d31b5adf948b35f02acfa8a734e`. Merge base equals old main;
ahead/behind is 82/0. Fast-forward-only integration preserves every SHA and
matches the accepted tree exactly. The accepted tip includes RF-UX-02
`f73e191` and the preceding correctness/orphan-cost checkpoints. Its existing
CI run `34652905428` passed. Main integration CI `34662910641` also passed.

Primary checkout was clean/upstream-equal. Both related Codex tasks were idle
or not loaded; no competing Codex writer was active. A dedicated main worktree
at `C:/CodexACLTest/forcewright-integration-20260911` preserved the original
checkout, other worktrees and preview servers. No open PRs, hooks or rulesets;
main reported unprotected, Pages disabled and no deployments. The only workflow
runs lint/typecheck/tests/build/whitespace checks, without deployment. A fresh
fetch immediately before the push confirmed main had not moved.

## Branding inventory and intentional retention

| Class | Treatment |
| --- | --- |
| Player-facing branding | ForceWright home link/name, FW text monogram, import/network/uncertainty copy, root error, index title/description, content-first browser title suffix, print title/brand/scope notes |
| Current documentation | README, engineering title, product vision, design language, architecture compatibility note, compatibility/diagnostic prose, handoff title/status/branch direction |
| Private root metadata | Root name becomes forcewright; pnpm 11.0.7 frozen install succeeds without lockfile or dependency changes |
| Internal development identifiers | Retain all @rosterforge packages/imports, controller types/hooks, probe IDs and ROSTERFORGE environment variables |
| Persistent contracts | Retain rosterforge database v1/local-roster-drafts, __recovery__, files:/history: prefixes, rosterforge/local-roster-draft v1, both repository-cache database names/versions/formats |
| Historical and external identities | Retain ronincse/rosterforge remote, local folder, RF finding IDs, historical QA and append-only completed assignments, fixture publisher and historical/internal comments |

No localStorage/sessionStorage keys, manifest, installed-app identity or service
worker exist in this slice. No origin/route/port strategy changed. No new logo,
theme, data format, storage namespace or migration. The title change deliberately
keeps the content name first and adds ForceWright, superseding the old design
sentence that prohibited the application name in titles.

## Same-origin backward compatibility

Fresh disposable origin `http://127.0.0.1:5261/`, same browser profile before and
after. Before editing production code, a temporary local fixture page used the
**pre-rename production IndexedDB adapter** to create a saved draft and recovery
case from the existing disposable QA reference draft. This is fixture setup,
not a repeated manual build of the reference army. Owner databases were not read
or changed. Helpers/data remain gitignored under the integration worktree's
`apps/web/.cache/`; third-party data is not committed.

The two cases appeared through the normal pre-rename shelf/recovery UI. After
reloading the fixture with renamed modules, the complete reported snapshot was
string-for-string equal: sole database rosterforge v1, saved ID, catalogue key,
format/version, roster hashes, three past/zero future history entries, eight
source IDs and file lengths/SHA256 values. There were 193 selections and
14,282,159 source bytes. No empty ForceWright namespace replaced them.

Saved roster JSON SHA256:
`112a27c126047f911b61ff73ca21b1a77b0970158aceb9c916d019a4cb03d58b`.
Recovery roster JSON SHA256:
`7a5047762dd80a64b5ce1a5af5023b7a05e2a147241fbc652e19e46db9b82e41`.
These compare full structural rosters, including names, quantities, loadouts,
occurrence/source identities and associations, not only displayed totals.

Normal renamed UI verification:

- Recovered the pre-rename unsaved army and saved it successfully; shelf showed
  both the original saved case and recovered named draft.
- Opened the old saved army: 14 units, 2,000 points, 0 known violations with
  some rules not checked. Captain/Warlord/loadout, five-model 1/3/1 and ten-model
  1/8/1 Intercessors, Knights 240/240/260 and Impulsor 70 retained.
- Added an ordinary Intercessor to the first squad: six models/150 points,
  army 2,070 and one capacity violation. Autosave completed; reload/reopen
  retained that edit. Persisted Undo restored 1/3/1, 80 points and army 2,000.
- Selected squad still showed Attached: Lieutenant. Phone reference retained
  17 Lethal Hits additions attributed to Lieutenant, Power fist and both
  launcher modes. At 390x844 requested viewport, document client/scroll width
  both 375 (scrollbar excluded); screenshot showed readable cards and no
  horizontal page overflow. Temporary viewport override reset afterwards.
- Created **ForceWright new army QA** through ordinary setup, added Azrael,
  saved, reloaded and reopened: six structural selections, one army unit,
  140 points. Incomplete setup's five known violations remain visible.
- Print menu invoked, but this in-app browser exposed no inspectable popup.
  A read-only fixture then rendered the same production print model/document
  from the saved legacy army; title, visible header and scope note all say
  ForceWright, with zero old-brand occurrences. Screenshot verified header;
  no physical printing/PDF pagination claim. Existing wide currency totals
  spill beyond the print card; document workflow polish remains open.

## Fresh validation and review

Both pre-rename and renamed builds pass lint, typecheck, standard tests, build
and whitespace checks. Pre: 716 passed/30 optional skipped, 80 passed/6 skipped
files, 19.96s. Rename: same counts, 18.83s. No dependency upgrades; frozen
pnpm install leaves lockfile unchanged. Build CSS 82.82kB and JS 816.01kB
(gzip 225.61kB); existing large-chunk advisory remains.

Corpus checkout independently verified at
`04c62fcd041b3808c39d5c46fd677c704027b979`. Configured unchanged
ROSTERFORGE_BSDATA_JSON_DIR and ROSTERFORGE_CORRECTNESS_SNAPSHOTS. Pre-rename
three-file corpus/reference run: 27 passed, no skips, 39.72s. Renamed nine-file
combined run: 76 passed, no skips, 40.35s. It includes those same 27 pinned
checks, renderer timing, phone reference, print, controller durability,
browser drafts and recovery slots. A/B manifest/hash assertions executed.

Independent native reviewer in `C:/CodexACLTest/forcewright-review-20260911`
reviewed the complete candidate diff, history and identifier retention; approved
with no blockers. Lead reviewed the diff and ran all checks. Native review was
chosen for this bounded text/identity change; no new semantic implementation
needed external specialist reasoning or additional provider export.

Known UI, accessibility, compatibility, orphan-cost and print-layout limits
remain open. No StarCraft branch/pilot, deployment, release, domain/DNS change,
repository rename, source update or package publication occurred.
