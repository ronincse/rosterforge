# RF-GROK-01 — renderer investigation, 2026-09-11

Baseline application `383ae1ae91b4a6bac607ca577924498fd1ba87b0`, selected
`codex/list-builder-ui-overhaul`, clean/upstream equal. Frozen A remains
`04c62fcd041b3808c39d5c46fd677c704027b979`. All eight closure sizes/SHA256
match the audit manifest; all 76 supplied evidence-file hashes verified.
Original archive retained in Downloads; extracted evidence is at
`C:/CodexACLTest/rf-grok-evidence-20260911/qa-2026-09-11-383ae1a`.

## Observations, not inferred causes

Grok's two Knights runs and Azrael run terminate Chrome153 headless renderers.
The subsequent additions in run.log target an already-crashed page, not separate
reproductions. Its explicit launch flags include `--max-old-space-size=1024`,
`--disable-dev-shm-usage`, `--disable-gpu`, `--no-sandbox`; reported JS heap limit
1144 MB, RAM4024496kB, two CPUs. That evidence alone does not identify an allocator.

Local Windows11 build26220, Node24.19.0, pnpm11.0.7, React/ReactDOM19.2.8,
Vite8.1.5. In-app browser user agent Chrome152.0.0.0, reported JavaScript heap
limit4395630592bytes, deviceMemory32, hardwareConcurrency16. OS total visible
memory32669152kB/free5385812kB at the initial sample; not a dedicated resource cap.
Browser launch is host-managed; no browser flags changed. Own Vite origin5243;
owner5242 tab and storage untouched.

## Experiment 1: closed-editor control and dense army

Disposable `.cache/grok-timing-probe.html` imports the actual main/StrictMode.
Before React loads it wraps performance.measure: counts string lengths/rows,
retains only scalars, delegates native arguments unchanged, and rethrows errors.
It does not clear measures, serialize props, inject state, or suppress failures.
The initial file-picker tool call took497s; subsequent app composition succeeded.
That tool duration is not attributed to parsing or to a renderer failure.

Intercessor, then CLOSE its options, add Knights:320 total succeeds. Configure
Strike Force/Gladius/Priority Assets, add Azrael:460 succeeds. Close options,
second Knights:700 succeeds. Largest timing payload initially28978chars/386rows,
heap192–248MB. Removed Azrael, added Captain100/Warlord/Armour and Lieutenant45,
assigned Supporting, filled Intercessors1/3/1/power-fist and duplicate1/8/1.
Third Knights260; remaining recorded units added, source-derived total2000.
No source adjustment, dependency change or application repair had been made.
Full ledger and lifecycle are recorded separately; this passing control is not
proof that the failure is fixed.

## Experiment 2: open-editor transition — failure reproduced

Own tab3, same instrumented entry, fresh `QA open options baseline`, same A
closure restored from own saved draft then ordinary Create roster. Added
Intercessor Squad (one sergeant), LEFT its options open, opened Add unit,
searched Deathwing Knights, clicked Add once. Input dispatch timed out.

Bounded scalar evidence captured before ending the failed session:

| Stage | Relative ms | Heap bytes | Timing detail |
| --- | ---: | ---: | --- |
| Before Add Knights | 28414 | 237988672 | previous maximum28643chars |
| Before native measure | 34867 | 3492922736 | RosterSelectionEdit,30515701rows,517436577chars |
| Native measure throws | 47779 | 3672826572 | DataCloneError: data cannot be cloned, out of memory |

The host delivered buffered log timestamps together at14:10:56.219UTC; the
relative performance timestamps above preserve ordering/duration. Max formatting
is one payload, not a conclusion inferred from cumulative retention. Stack:
`performance.measure` wrapper → `logComponentRender` at served
`react-dom_client.js?v=6ad3c775:2469:803` → passive mount traversal. Wrapper
rethrows the original exception. No second click or reload of the failed run.

Installed React formatting precedes measure. Plain objects/diffs have a shallow
depth bound, but tuple-entry arrays and scalar/typed arrays can still produce
large detail. The exact RosterSelectionEdit prop path and repair are investigated
below; no general React leak, cloud allocator identity, or explanation of the
older host-only hang is asserted from this capture alone.

## Established mechanism and candidate repair

The reused `RosterSelectionEdit` received a whole materialized `choice`. React's
changed-prop formatter reaches `choice.sourceDocument` and `definitionDocument`,
then `sourceBytes` and `documentBytes` on each. It enumerates both old and new
typed arrays without deduplicating shared references. Four paths multiplied by
the Space Marines6,958,668 plus Dark Angels670,037 bytes yield30,514,820 rows:
all but881 of the measured payload. This is excessive application prop exposure
to development profiling, not proof of a general retained-heap leak.

The editor now receives only name, model-amount flag, defaultAmount and step.
`ChoiceDeveloperDetails` receives its existing provenance projection instead of
the same raw-document-bearing choice. Imported bytes, evaluation, initialization,
history, rules, costs and native timing behavior are unchanged. No dependency,
StrictMode, timing suppression, cache rewrite or army-size limit change.

The failed tab was closed only after its evidence above was recorded. An initial
candidate replay at `/app/.cache/...` actually used the ordinary app fallback:
the exact open-editor transition passed, but there were no scalar logs. Two
attempted navigations to the diagnostic path returned `net::ERR_ABORTED`, not
application failures. A fresh tab at `/.cache/grok-timing-probe.html` loaded the
wrapper and verified its start record before the measured replay below.

## Experiment 3: repaired exact sequence and complete army

Same Vite server, data, browser, heap limit and installed dependencies. Fresh
`QA measured scalar repair`, restored verified closure, ordinary Create roster.
Intercessor options remain OPEN while adding Knights: success. Before add heap
231,906,919; after215,595,016. Maximum payload28,643chars/380rows, from
ConstraintItemDetails, versus517,436,577chars/30,515,701rows before repair.
Configure Intercessors again, keep open and add Azrael: success at460 total.
Set Azrael Warlord, Strike Force2000/Gladius/Priority Assets. His140 cost, full
weapons, 6in/T4/2+/W6/Ld6+/OC1/4+ profile and all five rules/abilities remain.
Bounded Configure Intercessors→Knights→Azrael sequence passes without closing.

Then remove Azrael and complete the documented army through ordinary controls:

| Unit and selected loadout | Evaluated points |
| --- | ---: |
| Captain, default pistol/bolter/close combat, Warlord, Artificer Armour20 | 100 |
| Lieutenant, default pistol/bolter/close combat, Supporting→first Intercessors | 45 |
| Intercessors5: power-fist sergeant,3 ordinary,1 grenade launcher | 80 |
| Intercessors10: same sergeant,8 ordinary,1 grenade launcher | 150 |
| Knights5,4 maces plus Great Weapon Master, first/second/third | 240/240/260 |
| Hellblasters5, sergeant Bolt pistol manually chosen | 110 |
| Assault Intercessors5, default pistols/chainswords | 75 |
| Heavy Intercessors5, default heavy bolt rifles | 100 |
| Impulsor, hull/Bellicatus/2 Storm Bolters | 70 |
| Redemptor, fist/Heavy Onslaught/Heavy Flamer/Twin Fragstorm | 195 |
| Gladiator Lancer, laser/hull/Two fragstorm grenade launchers | 160 |
| Whirlwind, Vengeance launcher/tracks | 175 |
| **14 units, source-derived total** | **2000** |

No historical90-point adjustment or GW1900 headline is forced. Pending pistol
and vehicle choices were actually selected, not counted as completed defaults.
Each later add also retains the previous options panel. Zero known violations
after loadouts; supported evaluation remains incomplete, not full army legality.
Knights full stats5in/T5/2+/W4/Ld6+/OC1/4+, mace anti-monster/vehicle4+, Master
Devastating/Sustained, Inner Circle/Attached Unit/Teleport Homer/Deep Strike/Oath
all remain in selected-unit reference. Intercessor weapon rows retain their base
keywords plus one Lethal Hits contribution per row, attributed to Lieutenant.

Delete earliest Knights:1740 with remaining240/240; Undo2000, Redo1740,
Undo2000. Save, wait for All changes saved, return to shelf:193 selections,
13.6MB shared closure. Open saved army:2000/zero known violations; Knights card
intact. Final measured reference action:5486 payload calls,7,523,117 cumulative
characters, largest238,908chars/3390rows (ConstraintItemDetails), heap409,043,031;
later idle sample209,210,027. No warning/error logs in candidate browser run.

Fresh ordinary `/app/` entry (no wrapper) reopens the same saved army. Configure
Intercessors→Knights→Lieutenant succeeds. Supporting saved target is first squad;
Detach removes Lieutenant effect, retarget to second squad restores it there,
restore first target and save:2000/zero known violations. Owner tabs/storage
remain untouched. These are new candidate passes, not relabelled historical runs.

## Independent probes and limits of attribution

Native reviewer used an isolated worktree at383ae1a. A synthetic32KiB-per-source
actual-App regression fails baseline with265,203 RosterSelectionEdit rows, without
OOM. Candidate passes row<256/character<4096 bounds for both changed leaves,
cross-source add/reverse editor and independent original-byte snapshots. The test
installs jsdom's absent console.timeStamp before React imports to activate the
browser timing branch; native measure cloning and errors are preserved.

The earlier frozen actual-App probe under Node `--max-old-space-size=1024`
fails while adding Knights with Intercessor options open, after426–463MB samples
and before native timing. Initial unlocated4GB failure and two incorrect-selector
harness stops are not treated as additional application reproductions. One same
1GB candidate probe passes:4.45s total/1.76s test,508 payloads,172,157 cumulative
chars,15,818maxchars/543rows,406,914,288heap after Knights, zero timing errors.

The matching source transition and1GB probe strongly support this mechanism as
an explanation for Grok's constrained renderer termination, but that Chromium
process was not rerun here and no allocator stack was captured there. The older
host-only hang is still not retrospectively diagnosed. This checkpoint repairs
the demonstrated local timing explosion; it does not prove every renderer hang
has the same cause or claim full compatibility.

## RF-GROK-03: source triage only

Intercessor shared squad `8da0-4570-c3c-819f`, group `e371-90b3-5640-949` has
min5 `45fe-55b5-82d2-906`, max10 `bb0b-ffb5-17e3-45b5`, **no explicit default**.
Sergeant `8ea3-b125-7273-5ffb` min1/max1 is planned. Ordinary model
`420-464f-93cb-e019` min4 `f374-3874-5382-40ee` /max9 has decrement modifiers
conditioned on launcher `d735-eafd-a8de-fa80`, exact squad scope, shared=true.
Actual planner: incomplete, sergeant1 only, pending4/defaultNotSpecified, with
EVALUATION_INITIALIZATION_CONSTRAINT_MODIFIERS_UNSUPPORTED on that minimum.
This is unsupported conditional-minimum initialization, not an ignored explicit
default or the renderer cause. No initialization code is changed.

Small generic follow-up: evaluate prospective occurrence bounds only when live
conditions and uniquely determined composition are complete; bounded passes and
additions, no unit-name rules. Test optional launcher absent/present, min/max
conflict, unknown/cyclic conditions, ambiguous composition, repeated occurrences,
and preservation of user edits. Implementation requires a new bounded batch.

## Review and checks

Native isolated source/test lane independently derived the exact four-path byte
count and supplied the synthetic regression; lead reviewed and reran the test.
Authenticated Claude Code Read/Grep/Glob-only review (actual Sonnet5) independently
confirmed native formatter behavior and scalar/provenance repair with no semantic
regression found. No writes, subprocess tools, subagents, network research or
permission denials; only authorized scoped source/evidence shared. Its broader
other-choice-prop risk is not a demonstrated failure: a new session does not by
itself change source choice identity, and keyed entries/modal lifecycle matter.
No speculative broad refactor is included. Earlier suggestions to suppress or
clear native timing were rejected, not implemented.

Lead gates: lint/typecheck/build/diff-check pass; normal test690pass/28skip,
76pass/6skip files,13.00s. Focused synthetic test1pass; optional immutable corpus
`bsdata-json.integration` + `correctness-batch.integration`:23pass,39.84s,
including36 focused catalogue closures/46-document corpus and A/B pricing and
Supporting. Frozen A and B pins unchanged. Build's existing >500kB advisory remains
(808.53kB JS); it is not a new runtime warning or a suppressed diagnostic.
Full-army exact final checks:236 structural satisfied/0 violated/2 unresolved;
378 constraint satisfied/0 violated/0 unresolved. Captain/Lieutenant Warlord
initialization-related unknown bounds remain incomplete, not erased by this fix.
