# Product Vision

> RosterForge builds a Warhammer 40,000 army from community BSData, tells you
> honestly whether it is legal, and stays useful on the table when the dice come
> out.

That sentence is the north star. Everything below elaborates one of its three
clauses — *builds an army*, *tells you honestly*, *useful on the table* — and
every roadmap decision should be judged against it.

## What RosterForge is

A modern, local-first army roster builder and tabletop reference application,
powered by current BattleScribe-format BSData community files.

The end-to-end workflow it exists to serve:

1. import compatible BSData;
2. choose game system, catalogue, detachment, and battle size;
3. build and configure the army;
4. receive costs, available options, modifiers, requirements, and legality
   computed from the data;
5. save, reopen, duplicate, and revise;
6. reference the finished roster during a real game.

Step 6 is not an afterthought. A tool that builds a list and then abandons the
player at the table has done half the job.

## Behavioral compatibility, not cloning

The goal is **behavioral** compatibility. Given equivalent BSData and equivalent
player choices, RosterForge should reach the materially correct roster state,
costs, options, constraints, modifiers, rules, profiles, and validation result —
unless a difference is documented deliberately.

It is explicitly *not* implementation or visual cloning. Matching another tool's
information architecture where that architecture is better is intended;
reproducing its visual design, markup, data structures, or code is not.

## Honesty is a product feature, not a technical detail

Validity and evaluation completeness are independent concepts and stay that way.
A roster with no known violations is not thereby a roster whose supported view
is complete.

When RosterForge encounters applicable BSData behavior it cannot safely
interpret, it **reports evaluation as incomplete** rather than presenting a
confidently wrong roster. A player who is told "this is legal" and discovers at
the table that it is not has been failed worse than one who was told "I could
not check this part".

This is the product reason behind the engineering rule in `AGENTS.md`. It is not
bureaucracy; it is the difference between a tool you can trust with a tournament
list and one you cannot.

## Lifecycle model

**BUILD → VALIDATE → PLAY.**

These are product concepts for prioritizing work, not a mandate to restructure
the application into three literal modes. They answer "who is this change for,
and when are they using it?"

## Roster-first UX principles

**The army list is the primary object and must dominate the workspace.** The
application must not read primarily as a data browser, an evaluator debugger, a
compatibility report, or a configuration form.

- **Progressive disclosure.** A unit begins as a concise card and expands into
  models, wargear, abilities, profiles, and rules on demand.
- **Human terminology over evaluator terminology.** Occurrence IDs, evaluation
  phases, source-node relationships, and modifier plumbing do not appear in the
  primary UI unless no player-facing translation exists.
- **Dense but calm.** Useful information density, disciplined by hierarchy,
  typography, spacing, and grouping.
- **A clean roster becomes visually quieter.** Problems stay easy to find and
  act on; an army with nothing wrong should not display rows of zeroes to
  prove it.

### Acceptance proxies

Adjectives are not testable, so these four are the operational form of the
principles above:

1. Adding a unit, changing model count, and selecting wargear each complete
   **without leaving the roster view**.
2. A 2,000-point roster is readable at **390 px width with no horizontal
   scroll**.
3. **Every validation issue links directly to the exact selection that caused
   it.**
4. The roster view during play shows **only what was selected**, never
   unselected options the player must mentally filter out.

## The reference army

Feature-complete claims are measured against one concrete, committed fixture
rather than against "a representative army":

> A 2,000-point **Dark Angels** army with a detachment, at least one character
> carrying an enhancement, one squad using wargear replacements, and one
> dedicated transport.

It was chosen because it exercises detachment-scoped constraints, category
limits, `affects` routing, modifier-driven cost changes, and cost aggregation
*together*, on current BSData. Any of those can pass in isolation and fail in
combination.

## Acceptance definition

### v1 — BUILD + VALIDATE

RosterForge is **v1 complete** when a player can import current BSData, build
the reference army from zero, receive materially correct costs and legality with
unsupported behavior explicitly reported, and save, reopen, and revise it,
**without needing BattleScribe or New Recruit** to complete or verify the normal
workflow.

### v2 — PLAY

RosterForge is **v2 complete** when that same finished roster is comfortably
usable on phone or tablet during a real game, as a reference for the rules,
stats, weapons, abilities, and selections belonging to that exact army.

### The bar both milestones share

A technically correct application that makes building or reading a normal army
list confusing, or visually secondary to implementation details, is **not
complete at either milestone**. Correctness is necessary and not sufficient.

## Decision: `.ros` / `.rosz` interchange is a non-goal

**Decided in this checkpoint. `.ros`/`.rosz` roster interchange — importing an
existing army list from another tool, and exporting to the community roster
format — is a stated non-goal for both v1 and v2.**

It had been "deferred" since the owner's 2026-08-20 decision, which put it in
neither the goals nor the non-goals. That ambiguity is what this resolves.

Three reasons, in order of weight:

1. **It is the opposite of the v1 bar.** v1 is defined as completing the normal
   workflow *without needing BattleScribe or New Recruit*. Interchange is a
   feature for **interoperating** with those tools. Independence and exchange
   are different products; v1 commits to the first.
2. **The reference army is built "from zero".** The acceptance definition never
   requires bringing a list in, so import cannot block v1 by construction. And a
   finished list is read on the table in v2, not exported.
3. **The ecosystem moved.** BSData publishes catalogue data as JSON, and the
   tools RosterForge is measured against are web-based rather than trading
   BattleScribe roster files. That was the owner's 2026-08-20 reasoning and it
   still holds.

### Architectural implication, which is the real cost

This is not merely a scheduling choice. Faithful interchange requires the roster
model to carry **expanded profiles, rules, categories, and link identity** as
demanded by the BattleScribe roster schema — content the model deliberately does
not store today, because it resolves that content from the catalogue instead.

Adding it would widen the immutable roster, which is the object that gets
persisted into every saved draft. This project has already shipped one 8 MB
per-write autosave regression by not noticing what a persisted structure costs;
denormalizing profiles and rules into the roster is the same class of change,
on purpose and at larger scale.

The existing browser print/save-PDF path is a **presentation** export and is
unaffected. It intentionally is not interchange.

### What would reverse this

A user actually asking to bring an existing army list in from another tool.
Record it as a request with a real use case, not as a hypothetical. If that
happens, cost the roster-model change explicitly before committing, and treat
`.ros` ingestion (onboarding) as separable from `.ros` export (sharing) — they
have different value and different cost.

## Non-goals

Feature completion does **not** require:

- cloning the BattleScribe or New Recruit user interface;
- implementing every theoretical historical BattleScribe construct that is
  absent from the supported real corpus;
- tournament management;
- ladders, rankings, or social features;
- a tabletop game-state simulator;
- supplying rules or content not present in the imported BSData;
- exposing internal evaluator structure merely because it exists;
- `.ros`/`.rosz` interchange, per the decision above.

Rare theoretical constructs may remain unsupported at feature completion,
**provided** they are absent from supported real data and are safely reported if
encountered. "Safely reported" means the completeness contract above, not
silence.

## The decision test

Apply this to newly discovered work before giving it a priority:

1. Does this **block building the reference army** on real supported data?
2. Does this **threaten materially correct costs, legality, or completeness**?
3. Does this **prevent the finished roster from being useful during a real
   game**?
4. Does this materially **improve or harm clarity, speed, or readability** of
   the core roster experience?
5. Is this **required by real supported BSData**, or merely theoretically
   possible?

A "no" to 1–4 and "merely theoretical" on 5 is the signature of work that
belongs in a non-goal or a low priority, however interesting it is.

## Where this document sits

| Document | Answers |
| --- | --- |
| `docs/product-vision.md` | **What RosterForge is becoming** |
| `docs/architecture.md` | **How** the software is structured |
| `docs/compatibility.md` | **What** imported behavior is supported |
| `agent-handoff.md` | **What remains**, and what happens next |

When they disagree, this document defines the destination, `AGENTS.md` governs
how work is done, and `agent-handoff.md` records the current truth about
progress. A roadmap row that cannot be justified against the north star and the
decision test above should be challenged rather than inherited.
