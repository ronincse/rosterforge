# Delegated Agent Workflow

This runbook turns RosterForge's cross-model handoff rules into an operational
workflow. `AGENTS.md` remains authoritative. This document supplies repeatable
commands and contracts; it does not transfer decision-making away from the
active lead.

## Operating Model

Codex is the preferred default lead and primary implementation agent. It should
perform ordinary development itself. A capable model can become the active lead
only through a formal handoff recorded in `agent-handoff.md`; receiving a
delegated task never makes a worker the lead.

When Codex leads, native Codex subagents are the preferred first delegation
lane for cleanly separable work that does not require a particular external
model or tool. This preserves Codex as the primary implementer: routine work
stays in the lead thread, while a bounded investigation, review, research lane,
or non-overlapping implementation can run independently when that has a stated
benefit.

The active lead owns all of the following:

- establishing the clean baseline and reading repository instructions;
- deciding whether delegation has a specific benefit;
- partitioning non-overlapping tasks and assigning explicit permissions;
- normal implementation work and all architectural decisions;
- reviewing every delegated diff and validating every delegated claim;
- integrating accepted work and rejecting or reworking unsafe work;
- updating the handoff, running the full gates, committing, pushing, and
  confirming CI.

A delegated worker owns only the bounded task brief. It does not update the
shared handoff, write in the primary checkout, push, open pull requests, deploy,
or write to external services. A brief may authorize a local commit in its
dedicated worktree, but the lead still decides whether and how to integrate it.

## Role Guidance

| Agent | Best use | Default authority |
| --- | --- | --- |
| Codex | Lead development, normal implementation, integration, final review, validation, handoff, and publishing | Active lead and primary writer |
| Native Codex subagent | Cleanly separable investigation, review, research, tests, or parallel implementation that needs no external-model advantage | Bounded child of the Codex lead; shared sandbox/filesystem unless the lead supplies a worktree |
| Claude Code | Deep repository analysis, architecture review, difficult debugging, edge cases, and substantial code review | Read-only specialist unless given a dedicated writer worktree; may become lead only by formal handoff |
| Antigravity (`agy`) | New Recruit reference-behavior QA when browser-capable, plus large-context analysis, independent debugging hypotheses, plan review, and second opinions; this replaces the deprecated Gemini CLI | Isolated specialist; never writes RosterForge during reference QA; may become lead only by formal handoff |
| Grok Build | Well-scoped implementation, non-overlapping parallel work, overflow capacity, and additional review | Dedicated worktree writer when explicitly authorized; otherwise plan-mode reviewer |
| GitHub Copilot CLI | GitHub-native work involving repository state, Actions, issues, or pull requests | Read-only/local repository access by default; GitHub writes require explicit task authority |

These are affinities, not quotas. Use a specialist only when it improves
coverage, speed, independence, or access to a tool the lead actually needs.

The default decision path is:

| Work | Preferred starting lane |
| --- | --- |
| Ordinary development | Codex lead |
| Normal separable investigation or implementation | Native Codex subagent |
| Deep independent repository or architecture review | Claude Code |
| New Recruit behavioral/reference QA | Browser-capable Antigravity session |
| Bounded overflow implementation | Grok Build in a dedicated worktree |
| GitHub or Actions work | GitHub Copilot CLI with narrow GitHub permissions |

Start elsewhere when the actual task, available tools, permissions, or model
strengths justify it. This table never requires delegation.

Good reasons to delegate include:

- an architecture change benefits from an independent repository-wide review;
- a difficult failure has several plausible causes worth investigating
  independently;
- a large, separable implementation has a well-defined package boundary and a
  dedicated worktree;
- a bounded overflow task preserves lead capacity while keeping review and
  integration costs low;
- a GitHub Actions investigation benefits from Copilot's GitHub-native tools;
- a final review needs fresh eyes on edge cases or unsupported behavior.

Bad reasons include:

- another agent happens to be installed;
- the task is ordinary work the lead can complete directly;
- the scope is too vague to define files, outputs, or stop conditions;
- multiple writers would touch the same files or share a worktree;
- delegation would cost more review and integration time than it saves.

## Required Task Brief

Every delegated task starts with a written brief. Fill in every field; write
`none` rather than leaving an authority ambiguous.

```text
Objective:
Concrete benefit of delegation:
Chosen agent/lane and why:
Repository and absolute worktree path:
Baseline commit:
Role: read-only analyst | reviewer | writer
In-scope files or packages:
Out-of-scope files and behavior:
Required context to read:
Allowed tools and external services:
Allowed mutations:
Tests or measurements to run:
Expected output: findings | patch | local commit | test evidence
Stop conditions and escalation points:
Forbidden actions: primary-checkout writes, handoff edits, push, PR, deploy,
  external writes, scope expansion (remove only what the brief authorizes)
```

The baseline is a full commit ID, not `main`, `HEAD`, or another moving name.
Name exact expected outputs and verification. For an implementation, identify
the intended files or package boundary; for analysis, require evidence with
paths and line numbers. Tell the worker to stop instead of improvising when the
scope, permissions, or baseline no longer match.

For Reference Behavior QA, the brief also names its targeted or broader cadence,
the pinned corpus commit, game system, faction/catalogue and relevant entry IDs,
the exact roster scenario, the browser environment, authorized external reads,
and the evidence format. The report contract below carries the complete result
fields.

### Scope And Stop Conditions

Allowed paths should be an explicit file list or the narrowest package/app
directory that contains the task. Treat tests, fixtures, generated outputs, and
lockfiles as separate write scopes rather than assuming they are implied. A
worker may read shared dependencies when analysis requires it, but read access
does not expand its write scope.

The worker stops and reports to the lead when:

- its worktree HEAD differs from the brief's baseline;
- the requested outcome requires a file, tool, network service, or mutation the
  brief did not authorize;
- it finds pre-existing or concurrent changes in its assigned worktree;
- the task crosses a package boundary or overlaps another writer's scope;
- tests expose an unrelated failure or the requested behavior is ambiguous;
- a push, pull request, deployment, handoff edit, or external write would be
  needed.

The active lead resolves the condition or issues a revised brief. The worker
does not silently broaden its own authority.

## Isolation And Worktrees

Tool labels such as "plan" or "read-only" are not enough by themselves. Treat a
worker as read-only only when its allowed tool set cannot write files, run an
unrestricted shell, or mutate external state. When that cannot be established,
give it a disposable worktree even for analysis.

Every delegated writer gets its own worktree. Never let two agents write the
same worktree concurrently. Parallel write scopes should not overlap unless the
lead deliberately requests competing alternatives and will review them as
alternatives rather than combine them blindly. The primary checkout belongs to
the active lead.

Native Codex subagents in the current app environment share the lead's
filesystem, current repository, sandbox policy, and available tools. A native
task brief can forbid writes, but that wording is expected conduct rather than
filesystem enforcement when the parent sandbox is writable. Use a verified
read-only parent/custom-agent sandbox or a disposable worktree whenever the
existing read-only rule requires enforcement. Native writers always follow the
same explicit-baseline, one-writer-per-worktree procedure as external writers.

Create a worktree from an explicit, verified baseline:

```powershell
$repo = "E:\GitHub\rosterforge"
$worktreeRoot = "E:\GitHub\rosterforge-worktrees"
$worktree = Join-Path $worktreeRoot "delegate-example"
$baseline = git -C $repo rev-parse HEAD
git -C $repo status --short --branch
New-Item -ItemType Directory -Path $worktreeRoot -Force | Out-Null
git -C $repo worktree add `
  -b codex/delegate-example `
  $worktree `
  $baseline
git -C $worktree rev-parse HEAD
```

Use a unique task slug for both branch and directory. Record `$baseline` in the
task brief. Uncommitted primary-checkout changes are not part of that baseline,
so the lead must account for them when proving that write scopes do not overlap.
Before integration, the lead inspects the worker's status, diff, commits, and
test output. Cherry-pick a reviewed commit or reimplement the accepted changes;
never merge an opaque worktree state.

Remove a disposable worktree only after resolving and verifying its absolute
path, capturing any evidence that must survive, and deciding that its changes
are integrated or intentionally discarded:

```powershell
$repo = "E:\GitHub\rosterforge"
$worktreeRoot = "E:\GitHub\rosterforge-worktrees"
$worktree = Join-Path $worktreeRoot "delegate-example"
$resolved = (Resolve-Path -LiteralPath $worktree).Path
$resolvedRoot = [System.IO.Path]::GetFullPath($worktreeRoot).TrimEnd('\') + '\'
if (-not $resolved.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove unexpected path: $resolved"
}
git -C $repo worktree remove --force $resolved
git -C $repo branch -D codex/delegate-example
```

Do not use `git clean`, reset the primary checkout, or delete a branch before
the lead has inspected it.

## Native Codex Subagents

Current Codex releases enable subagent workflows by default, and applicable
`AGENTS.md` instructions can request them. The current desktop environment lets
the lead spawn a bounded child, inspect or steer it, wait for its result, and
receive its final summary in the lead thread. It exposes four concurrent slots
in total, including the lead. Recheck the active tool surface instead of treating
that concurrency value as permanent. The official behavior is documented in
[OpenAI's Codex subagent documentation](https://developers.openai.com/codex/subagents).

No project `.codex/config.toml` or custom-agent file is needed for this workflow.
Use a native subagent only when its task can be described with the ordinary task
brief above and can proceed independently while the lead does useful work. The
lead should say whether it will wait for all results, what output to return, and
whether any follow-up is allowed. Avoid nested or excessive spawning merely to
fill available slots: every child performs its own model and tool work, consumes
additional tokens, and adds coordination and review cost.

This environment does **not** automatically create a branch or worktree for a
native child. The 2026-08-24 verification child inherited the writable parent
sandbox and shared checkout, honored a read-only brief, and returned its findings
without changing files. That proves spawn and result collection, not mutation
prevention. For any possible write, the lead creates the dedicated worktree
first, gives its absolute path and exact baseline in the brief, checks that no
other writer uses it, and reviews the full diff before integration.

## Current Headless CLI Templates

These command shapes were verified on Windows on 2026-08-24 with Claude Code
2.1.240, Antigravity 1.1.19, Grok Build 1.0.5, and GitHub Copilot CLI 1.0.80.
Recheck `<tool> --version` and `<tool> --help` after upgrades. In the Codex
sandbox, `claude` and `agy` were installed but absent from the inherited `PATH`;
resolve their absolute executables with `Get-Command` or the installed package
location when necessary.

The current host paths are recorded for that fallback. Re-resolve them after an
upgrade instead of assuming they are permanent:

| Command | Resolved executable on 2026-08-24 |
| --- | --- |
| `claude` | `C:\Users\stone\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\claude.exe` |
| `agy` | `C:\Users\stone\AppData\Local\agy\bin\agy.exe` |
| `grok` | `C:\Users\stone\.grok\bin\grok.exe` |
| `copilot` | `C:\Users\stone\AppData\Roaming\npm\copilot.cmd` |

### Claude Code: constrained repository analysis

`CLAUDE.md` imports `AGENTS.md`, so Claude receives the repository rules through
its supported project-memory mechanism. Keep the prompt explicit as a defense
against configuration drift.

```powershell
$task = @'
Read CLAUDE.md and the imported AGENTS.md first. This is read-only analysis.
Do not edit files, run shell commands, commit, push, or access external services.
<insert the completed task brief>
'@
claude --print $task `
  --permission-mode plan `
  --tools "Read,Grep,Glob" `
  --disallowed-tools "Edit,Write,Bash" `
  --no-session-persistence `
  --no-chrome `
  --output-format json
```

For a writing assignment, run Claude in a dedicated worktree and grant only the
tools needed by that brief. Do not use bypass-permissions mode.

### Antigravity: plan review or second opinion

Antigravity 1.1.19 exposes plan mode and sandboxing but no documented project
instruction-file switch. Its user state lives under `.gemini/antigravity-cli`,
which is private CLI state rather than a repository instruction contract. Do
not add a speculative `GEMINI.md`. Always use a disposable worktree and name the
required repository files in the prompt.

Antigravity's `--print` prompt must be attached to the flag in this version:

```powershell
$worktree = "E:\GitHub\rosterforge-worktrees\delegate-example"
$task = @'
Read AGENTS.md, docs/agent-workflow.md, the required agent-handoff.md sections,
and the architecture/compatibility documents before analysis. Do not mutate the
worktree or any external service. <insert the completed task brief>
'@
agy --new-project `
  --add-dir $worktree `
  --mode plan `
  --sandbox `
  --output-format json `
  --print-timeout 2m `
  --print="$task"
```

`--new-project` is important for disposable worktrees: without it, the
2026-08-24 smoke followed a previously saved project path instead of the
process working directory.

## Reference Behavior QA

Reference Behavior QA compares the same bounded army-building scenario in
[New Recruit](https://www.newrecruit.eu/app/) and RosterForge. Its goal is
observable behavioral compatibility where RosterForge intends to support the
same semantics. It is not permission to copy New Recruit's visual design,
source code, data structures, or internal architecture.

Antigravity is the preferred delegated specialist because an independent model
and a browser-capable session are useful for reference observation. It gathers
and structures evidence; the active lead decides what the evidence means and
whether code, compatibility documentation, or the roadmap should change.

### Capability Gate And Isolation

Start every reference task by proving that the selected Antigravity environment
has an interactive, JavaScript-capable browser and can capture the required
evidence. The authenticated headless `agy` 1.1.19 session checked on 2026-08-24
does **not**: it exposed only static HTTP retrieval (`read_url_content`), with no
browser/navigation tool, imported plugin, or MCP server. Static HTML retrieval
cannot establish interactive New Recruit behavior.

Use one of these paths:

1. Run the brief in a browser-enabled Antigravity client/session and record that
   capability in the report.
2. Have the active lead capture the scenario with an authorized browser tool,
   then give the resulting steps, screenshots, and observations to Antigravity
   for independent analysis.
3. If neither is available, stop and report the capability gap. Do not infer the
   behavior from static page text or claim a comparison occurred.

Antigravity must not modify RosterForge source during reference QA. Give it a
disposable worktree at the exact RosterForge baseline even when it needs only
repository reads. Prefer an unsigned-in or disposable New Recruit browser
profile. A brief may authorize only the temporary New Recruit roster state
needed for the named scenario; it does not authorize publishing, sharing,
account-setting changes, unrelated browsing, or durable external writes.

### Comparison Protocol

1. Freeze the RosterForge side: record the exact application commit, pinned
   BSData corpus commit, imported game-system/catalogue files, and relevant IDs.
2. Record the New Recruit side: test date and timezone, game system, faction or
   catalogue, visible data/source version when exposed, relevant entry IDs or
   stable URLs, and client/browser context.
3. Write exact reproduction steps before comparing results. Use the same force,
   detachment, units, amounts, wargear, enhancements, and other choices where
   the two data versions make that possible.
4. Perform and capture the New Recruit scenario, then perform the equivalent
   RosterForge scenario. Keep observable facts separate from interpretation.
5. Compare the behaviors below that are relevant to the scenario. Mark omitted
   dimensions as not applicable rather than silently skipping them.
6. Record evidence and a preliminary classification. The active lead validates
   the evidence and assigns the final disposition.

Observable comparison dimensions include:

- available selections and hidden or conditional choices;
- force setup, detachments, and points limits;
- default and automatic selections;
- unit amounts and squad-size behavior;
- wargear choices, replacements, and mutual exclusion;
- enhancement availability and eligibility;
- Warlord selection;
- costs and cost changes;
- validation and minimum/maximum constraint failures;
- occurrence hierarchy and parent/child placement;
- effective display names and annotations;
- warnings, diagnostics, and incompleteness presented to the user;
- add, remove, replace, amount-edit, and other roster-building interactions;
- any other observable semantic needed by the named scenario.

Use this report shape:

```text
Reference Behavior QA report
Cadence: targeted parity QA | broader parity pass
Test date, time, and timezone:
Observer and browser-capable environment:
RosterForge commit:
RosterForge pinned corpus commit:
Game system and version:
Faction/catalogue and version:
Relevant files, entries, and IDs:
New Recruit source/data/client version if exposed:
New Recruit URLs or stable references:
Authorized temporary New Recruit state:
Scenario objective:
Exact reproduction steps:
Observed New Recruit behavior:
Expected RosterForge behavior if data-comparable:
Observed RosterForge behavior:
Comparison dimensions exercised/not applicable:
Screenshots, exports, logs, or other evidence:
Known RosterForge completeness/unsupported reports:
Data comparability: exact | different | unknown
Behavior result: match | mismatch | inconclusive | not-applicable
Preliminary disposition:
Uncertainties and follow-up needed:
Confirmation that RosterForge source was not modified:
```

### Data-Version Safety And Classification

New Recruit is a moving reference; RosterForge deliberately tests a pinned
BSData revision. Classify data comparability independently from behavior:

- **exact** — evidence establishes equivalent relevant catalogue data;
- **different** — a relevant source/version/entry difference is identified;
- **unknown** — equivalence cannot be established from exposed evidence.

Then classify the observable result as `match`, `mismatch`, `inconclusive`, or
`not-applicable`. Only `exact + mismatch` is a candidate RosterForge behavioral
defect, and even that remains preliminary until the active lead reproduces and
classifies it. `different` or `unknown` comparisons may reveal useful drift but
must not be reported as product bugs.

The preliminary disposition is one of:

- candidate RosterForge behavioral defect;
- intentional product difference;
- unsupported behavior already tracked in compatibility or the roadmap;
- new roadmap candidate;
- underlying catalogue/data-version difference;
- needs further investigation.

The active lead owns the final disposition and decides whether to change code,
tests, compatibility/diagnostics documentation, or roadmap state.

### Cadence And Golden Roster Scenarios

**Targeted parity QA** follows a meaningful list-building feature or correctness
change when a direct New Recruit comparison would provide useful evidence. It
is also appropriate for disputed semantics. It is not required for every
routine code, documentation, refactor, or tooling change.

**Broader parity passes** periodically exercise a small representative set of
end-to-end army-building scenarios. Re-establish data comparability on every
run; a previously matching scenario does not pin New Recruit's current data.

Grow a reusable set of evidence-backed **golden roster scenarios** over time.
Initial candidates include:

- basic matched-play roster creation and points limits;
- squad-size changes;
- wargear replacement;
- enhancement eligibility;
- Warlord selection;
- maximum and minimum constraint violations;
- automatic children;
- hidden and conditional choices;
- modifier-driven values.

For now, a golden scenario is a documented input, procedure, expected
observations, version metadata, and evidence bundle. Do not build an automation
framework until repeated manual use demonstrates stable inputs and worthwhile
maintenance cost.

### Grok Build: read-only review

Grok currently discovers the repository `AGENTS.md`. Still tell it exactly what
to read and disable subagents and web access unless the brief requires them.

```powershell
$task = @'
Read AGENTS.md and the required handoff and architecture sections first. Stay
read-only. Do not edit, commit, push, or access external services.
<insert the completed task brief>
'@
grok --cwd "E:\GitHub\rosterforge" `
  --permission-mode plan `
  --no-subagents `
  --disable-web-search `
  --max-turns 6 `
  --output-format json `
  --single $task
```

For a bounded implementation, change `--cwd` to the dedicated worktree and use
`--permission-mode auto` only after the worktree and brief have constrained the
blast radius. Grok's headless `--worktree` option does not create this required
worktree; the active lead must create it first. The prompt must forbid push,
handoff edits, and scope expansion.

### GitHub Copilot CLI: local CI/repository review

Headless Copilot requires pre-approval of its available tools. Constrain the
available set first; `--allow-all-tools` below approves only that reduced set.
The safe local template disables built-in MCP servers and denies shell and write
tools:

```powershell
$task = @'
Read AGENTS.md first. Inspect the local CI workflow and repository state for the
bounded question below. Do not mutate files, run shell commands, or access
GitHub. <insert the completed task brief>
'@
copilot -C "E:\GitHub\rosterforge" `
  --prompt $task `
  --silent `
  --no-ask-user `
  --disable-builtin-mcps `
  --available-tools "view,grep,glob" `
  --allow-all-tools `
  --deny-tool "shell" `
  --deny-tool "write"
```

For GitHub-native work, enable only the named built-in GitHub MCP tools or
toolset needed by the brief (for example, the Actions toolset). Start
interactively when tool names or permissions are uncertain. Reading GitHub
state does not authorize issue, pull-request, workflow, or repository writes;
each external mutation needs explicit user authority. Opening a pull request
also remains subject to `AGENTS.md`'s approval rule. Do not use Copilot as a
proxy for models already available through their direct CLIs.

## Delegate Output Contract

An analyst or reviewer returns:

- a concise conclusion, confidence, and unresolved questions;
- evidence with file paths and line numbers or exact command output;
- alternatives considered and why they were rejected;
- no claim of completion beyond the assigned scope.

A writer returns:

- the baseline, worktree, branch, and exact files changed;
- a diff summary and any local commit ID explicitly requested;
- exact tests run with pass, fail, and skip counts;
- known gaps, unsupported behavior, and any deviation from the brief;
- confirmation that it did not push, edit the shared handoff, or perform
  external writes.

A Reference Behavior QA specialist returns the completed report shape above,
including evidence locations, both classification axes, a preliminary
disposition, and all comparability uncertainty. It confirms that it did not
modify RosterForge source and identifies any explicitly authorized temporary
New Recruit state. The report never presents its preliminary disposition as the
active lead's final classification.

## Lead Review And Integration

The active lead never accepts delegated work by summary alone. Before
integration:

1. Confirm the worker used the recorded baseline and did not exceed scope.
2. Inspect `git status`, the full diff, commits, and changed-file list.
3. Recheck architecture direction, imported-data safety, validation
   completeness, comments, diagnostics, tests, and documentation as applicable.
4. Reproduce important measurements and rerun focused tests.
5. Integrate only understood changes, resolving conflicts deliberately.
6. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
   `git diff --check` from the integrated primary checkout.
7. Update `agent-handoff.md` as the lead, commit the bounded checkpoint, push,
   and confirm CI according to `AGENTS.md`.
8. Remove disposable worktrees only after their outcome is recorded and no
   needed evidence remains solely inside them.

If a delegated finding conflicts with code, corpus evidence, or another model,
the lead resolves the contradiction before proceeding and records the winning
conclusion where the next lead will find it.

## Checkpoint, Handoff, Push, And CI

Delegation does not create a second publishing path. Once accepted changes are
integrated, the active lead follows the ordinary checkpoint sequence:

1. Run focused validation and then all repository gates from the primary
   checkout. Capture exact test, skip, corpus, and build results.
2. Commit the bounded implementation or workflow change. Do not include
   disposable smoke-test files or worker branches.
3. Follow `agent-handoff.md`'s "How To Update This Document": append a completed
   assignment with baseline and resulting commits, update Current Status, and
   keep the feature-completion roadmap truthful. Update architecture,
   compatibility, or diagnostics only when their documented boundary changed.
4. Commit the handoff update, confirm the primary checkout contains only the
   intended checkpoint commits, and push according to `AGENTS.md`.
5. Confirm `origin/main` reaches the pushed commit and watch the corresponding
   CI run to completion. Report any difference between local and remote gates.

The ordinary GitHub CLI check is:

```powershell
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status
```

Do not force-push, rewrite remote history, or open a pull request without the
specific approval required by `AGENTS.md`.

## Operational Verification Record

Keep this section current when CLI behavior materially changes. A smoke test is
disposable evidence, not permission to broaden an agent's role.

- **Native Codex subagent:** the lead spawned one bounded documentation reviewer
  at baseline `9d4d8feb7a33e258cee22c0224fbf51c4506b5a0`, received its final result
  in the lead thread, and verified that it changed no files. The child shared the
  writable parent sandbox, filesystem, and checkout; its read-only behavior was
  prompt compliance, not enforced isolation. The current environment exposed
  four total concurrency slots including the lead. No project Codex
  configuration was required.
- **Claude Code 2.1.240:** after the provider's reported quota reset, an
  authenticated smoke with only `Read,Grep,Glob` available returned
  `CLAUDE_CONTEXT_OK`. It followed `CLAUDE.md`'s import of `AGENTS.md`, correctly
  distinguished a formal handoff from delegation, and found this runbook. It
  reported no permission denials or mutations. Earlier attempts failed cleanly
  at the account's session limit before reading a file, so quota exhaustion is
  a normal handoff or retry condition rather than an authentication failure.
- **Antigravity 1.1.19:** an authenticated plan-mode smoke in a disposable
  worktree returned `AGY_REPO_OK` and correctly identified the `roster-builder`
  boundary. `--new-project` and the explicit `--add-dir` were necessary because
  the first probe followed an older saved checkout path. The worktree stayed
  clean. The CLI retained its ordinary user-level conversation/project metadata
  under `.gemini/antigravity-cli`; it created no repository configuration file.
  A separate reference-QA probe returned `BROWSER_QA_UNAVAILABLE`: headless
  `agy` exposed static HTTP retrieval but no interactive browser/navigation
  tool, imported plugin, or MCP server. Browser interaction therefore requires
  another browser-capable Antigravity client or evidence supplied by an
  authorized lead browser tool.
- **Grok Build 1.0.5:** an authenticated plan-mode smoke returned
  `GROK_REPO_OK`, used the positional `--single` prompt form, and correctly
  reported the `roster-builder` restrictions. The primary checkout gained no
  agent-created changes. Grok also warned that the user's existing `privacy`
  configuration key is unrecognized; the per-invocation permission flags in
  this runbook remain required.
- **GitHub Copilot CLI 1.0.80:** with built-in MCP disabled and only
  `view,grep,glob` available, an authenticated smoke returned `COPILOT_CI_OK`
  and correctly summarized the local CI triggers and all verification gates.
  In the Codex sandbox it required access to the user's authentication store;
  no GitHub or local write tool was available.
- **Delegated writer:** Grok received a dedicated worktree at baseline
  `6122d215f102f7b2414c0fe05d565b6abeb07851` and created only the requested
  38-byte `delegated-writer-smoke.txt` (one exact line plus newline). The primary
  checkout never contained the file. The writer and Antigravity worktrees and
  their local branches were then discarded without merging.
