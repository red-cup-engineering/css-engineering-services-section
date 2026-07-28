---
title: "Temporal geometry of the nine faculties, and the missing telos class"
description: "A package-level review of how the arrow of time is generated and what each of the nine faculties does with it. The arrow is minted once — at relating/settling, as the monotone ≤_k climb of the settlement filtration; its geometry is the four-regime κ-ladder (strict κ<ω → Scott κ=ω → transfinite-bounded ω<κ<ω₁ → aperiodic κ≥ω₁), and the load-bearing law is that history is erasable iff κ≤ω (socializing ships endpoint-state) and must be preserved iff κ>ω (ships the trajectory). Reviews each package's temporal dynamics from its actual source, then isolates the telos finding: animating's Agent carries a `goal` (finite-regime, satisfiable); organizing's Organization mirrors the agent in every field EXCEPT it has no goal-analog. The proper Gen-2 lift is not a lifted goal but its APERIODIC dual — a telos that is structurally never satisfied, the function-as-aperiodic-settling the operations loop serves forever. Includes a concrete proposed telos schema (unwired)."
date: 2026-06-21
status: design
---

# Temporal geometry of the nine, and the telos class

Companion to [the calendar survey](2026-06-21-calendars-and-timekeeping-in-the-corpus.md) and [where the meme of time emerges](2026-06-21-where-the-meme-of-time-emerges.md).
Those two answered *what calendar-time is* and *where time-as-content originates* in the faculty descent.
This one is a **package-level review**: read from each package's actual source, how is the arrow of time generated, what is each faculty's temporal geometry, and where does it lead — specifically to the `telos` class organizing will need and does not yet have.

## The arrow is minted once, at `relating/settling`

There is exactly one arrow-of-time generator in the stack: the **settlement filtration** (`@emsenn/relating` — `settle` → `SettlementFiltration` → `fixedPoints` → `readClassificationOfSettlementFiltration`).
Its directionality is **monotonicity in the knowledge order ≤_k**: settling joins evidence and never retracts it (`joinKnowledge`, `leqKnowledge`; the agent is literally tagged `settledBelow: true`).
You can un-believe (the truth order ≤_t moves both ways) but you cannot un-*know* — and that asymmetry **is** the arrow.
Time's direction is the direction in which ≤_k climbs to a fixpoint.

The **temporal geometry** of any package is then fixed by two coordinates of its settling:

**1.
Position on the κ-ladder** — the closure ordinal at which it quiesces.
`socializing/ src/socialize/regime.mts` carries this verbatim:

| regime | κ | character |
|---|---|---|
| strict | κ < ω | finite, halts immediately — a timeless result |
| Scott-continuous | κ = ω | converges at the ω-limit — bounded recurrence |
| transfinite-bounded | ω < κ < ω₁ | converges, but only past limit stages — history-laden |
| aperiodic | κ ≥ ω₁ | **never settles** — runs forever |

**2.
Convergent vs aperiodic** — does it reach a fixpoint (it has a *now* it settles into) or only a direction (it has no arrival)?

A law the code already enforces makes this concrete: `socializing` ships the **endpoint-state** when κ ≤ ω (the history is erasable — the merged charge alone suffices) but must ship the **trajectory** — the firing-ordinal record — when κ > ω, to preserve the H¹ invariant (`federationDiscipline`, `converge.mts`).
So the regime decides *whether history itself is erasable*.
That is the deepest temporal-geometry statement in the stack, and it is load-bearing, not decorative.

## The nine, by temporal geometry

**Scale 1 — the meme, and the birth of a present.**

- **relating** — *the bare arrow.* The descent `articulate → predicate → posit → settle`, held at all four regimes (animating's `descend` runs it once and reads it four ways).
  Time = the filtration index; no content yet, just the ≤_k climb.
  Index-time, not a meme.
- **communicating** (across) — *represented time.* Carries `TemporalFrame`, `TenseValue`, `AspectValue`, `EvidentialValue` (`speaking/listening/understanding`) — **tense/aspect**, time as grammatical content — plus `advanceSemiosis` / `SemiosisStepCarrier`: **succession**, the "and-then" made transmissible.
  Endomorphic meme→meme; its dynamic is *stepping*.
- **knowing** (inside) — *retention, and the first fork.* The comonad on Meme.
  `reflect` (δ, knowing-that-you-know) **preserves the settled charge → converges to the ≤_k fixpoint**; `ruminate` **re-charges each pass → aperiodic, never settles**.
  `settleMemory` reads `onShell = regime ≠ aperiodic` as its `certified` flag.
  "The depth is the memory": memory is the held ≤_k lower bound — accumulated time-as-content.
  This is where "does this thought come to rest?" becomes a typed distinction.
- **playing** (outside) — *protention / move-time.* The ludics core is built on **chronicles** (`ludicizing/chronicle.mts`, `settling/chronicle-convergence.mts`): the ordered record of a play, settling via `orthogonality` to a **behaviour** (a fixpoint).
  The arena is a *prime event structure* — a causal partial order (`q ≤ a`).
  Cut is the dynamic reduction.
  Time = the interactive unfolding toward a verdict.
- **animating** (binder) — *the present, and the scale-1 telos.* The agent is `settledBelow: true, openAbove: true` — the **frontier dividing fixed-past from open-future**, i.e. a *now*.
  `perceive` folds an append-only memory (retention), `act` reads open commitments (protention), `reseed` re-poses the settled self carrying its Simondon **`milieu`** (residual pre-individual potential — the fuel of the next turn).
  And crucially the agent has a **`goal`**: `{ predicate, charge, satisfied }`, a bilattice-charged *target* over its sheaf, charge defaulting to `potential`, with a `satisfied` test. **This is telos at scale 1.** It lives in the *finite* regime: the agent glues (H¹ = 0), halts, and its goal *can be satisfied*.

**Scale 2 — the agent re-seeds relating; time-as-meme becomes clock and calendar.**

- **computing** (scale-2 knowing) — *halting as temporal geometry.* "Computation = settling" taken literally: `compute` reads an agent's settling as one of FOUR, and **`!glued → UNDECIDABLE` (⊥)** — the agent that never reaches a fixpoint is the halting/Rice boundary *made structural* (`standingOfAgent`; `halted: a.glued`).
  The Kleisli `relay` aggregates ≤_k across a society.
  Computing's time-axis is *convergence-or-not* itself.
- **socializing** (scale-2 communicating) — *the regime stratification, explicit.* `regime.mts` + `converge.mts`: the shared "now" of many observers is the consensus section, and the **dynamic axis** is exactly the κ-ladder — coordination-free iff κ ≤ ω, trajectory-shipping iff κ > ω.
  Calendar-as-shared-coordinate plus the "is history erasable" law.
- **gaming** (scale-2 playing) — *discrete played time.* The `GameComputer`: `playMove` (one legal move), `runInteraction` (cut), `settle` (→ verdict), each persisted to an append-only JSONL log; arenas classified by Caillois regime (agon/alea/mimicry/ilinx) and paidia↔ludus (`running/analysis.mts`).
  Time = the move-sequence, the lived cadence of a bounded game.
- **organizing** (scale-2 animating) — *the collective present — but no collective telos.* `Organization` mirrors the agent almost exactly: `settledBelow`, `openAbove`, `milieu`, plus `institution` (the settled order, single-filtration H¹) and `adjudication` (the cross-arena Mayer–Vietoris gluing).
  The four social-descent readings (`socialBecoming → relating → community → institution`) are the Gen-2 mirror of animating's four regimes.

## The telos finding

The gap, stated exactly:

> **animating's `Agent` has a `goal`. organizing's `Organization` mirrors the agent in every field — `settledBelow`, `openAbove`, `milieu`, `institution`, `adjudication` — except one: it has no goal-analog.
> The collective is `openAbove: true` toward *nothing named*.**

So **organizing does not yet have a telos class.** What exists nearby is three other things, none of them organizing's apex telos:

- **`goal`** — animating, scale-1, the individual's target.
  Finite regime, *satisfiable* (`agent.schema.json` `$defs/Goal`).
- **`telos`** — already a first-class carrier, but in **`content/src/propaganda/ propaganda-topology.mts`** (a *communicating*-layer object: a declared intended response — "DECLARED, first-class, auditable; an undeclared telos is a malformed declaration").
  Rhetoric's telos, not governance's.
- **`objective`** — `managing-operations`, the Clausewitzian work-carrier (objective/front/horizon).
  The *operational downstream* reading, not the apex.

### Why the telos is NOT a lifted goal

The decisive structural point — and the reason a naive mirror would be wrong:

- A **`goal` can be satisfied.** It lives in the finite/Scott regime; the agent reaches it, glues, halts.
  Lift that naively and the institution would have a target it could *complete and then be done with*.
- But the corpus's own theory (`function-as-aperiodic-settling`, behind the operations loop) says the collective's reason-for-running is **aperiodic** (κ ≥ ω₁): the function *never stabilizes*, and that non-arrival is exactly what keeps the operations loop running forever.
  "The means change; the function does not."

So the missing `telos` is the **aperiodic attractor** that orients the collective's perpetual settling without ever being reached:

$$\textbf{goal} : \textbf{telos} \;::\; \text{finite} : \text{aperiodic} \;::\; \text{arrival} : \text{direction}.$$

The relationship is a fibration (from the lusory-constraint note): the telos's aperiodic settling is the **base**; each Scott-continuous operations-loop cycle is a **fiber** over it.
The agent settles *into* its goal; the institution settles *toward* its telos and never arrives — which is the only reason it stays alive.
`milieu` is the per-cycle fuel; the telos is the direction `openAbove` points.

The substrate to mint it already exists: `socializing/regime.mts` carries `"aperiodic"` as the top regime, and the trajectory-shipping discipline already means "at this regime, history must be preserved."
What is missing is organizing **declaring a carrier that names the attractor the society is open-above toward**.

### The triad it completes

| carrier | scale | regime | reached? | role |
|---|---|---|---|---|
| `goal` (animating) | individual | finite | *satisfiable* | the agent's target; halts on arrival |
| `objective` (managing-operations) | operational | finite | *satisfiable* | a sub-target that **serves** the telos; completes and recurs |
| **`telos` (organizing)** | collective apex | **aperiodic** | **never** | the function the collective is oriented toward; perpetual |

## Proposed `telos` carrier (schema-first, UNWIRED)

A concrete proposal mirroring `agent.schema.json`'s `Goal` but realized as its aperiodic dual, and borrowing propaganda's *declared / first-class / auditable* discipline. **Not landed** — placed here for approval before any file or wiring, because adding a live `*.schema.json` under `lib/organizing/src/` would be swept into the realize/codegen pipeline.

Proposed `$id`: `organizing/organization/telos` (first-class, per "a telos is declared, never hidden" — not an inline `$def` the way `goal` is, precisely because it must be auditable).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "organizing/organization/telos",
  "title": "Telos",
  "description": "The organization's telos — the function-as-aperiodic-settling the collective is oriented toward and the reason its operations loop runs forever. The Gen-2 lift of the animating agent's `goal`, but NOT a satisfiable target: a goal lives in the finite regime and halts on arrival; a telos is pinned to the APERIODIC regime (κ ≥ ω₁) and is structurally never satisfied — its non-arrival is what keeps the institution alive ('the means change, the function does not'). The Scott-continuous operations-loop cycles (managing-operations) are fibers over this aperiodic base: each cycle ADVANCES the telos's settling by one step without reaching it. Per the propaganda topology's discipline, a telos is DECLARED, first-class, and auditable — an undeclared telos is malformed. $id is the bare package-rooted path.",
  "type": "object",
  "required": ["kind", "predicate", "charge", "regime", "satisfiable", "declaredBy", "advanced"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "organizing.organization.telos" },
    "predicate": { "type": "string", "description": "the function the collective is oriented toward — the predicate its perpetual settling aims at (mirrors goal.predicate)" },
    "charge": {
      "enum": ["absurd", "potential", "active", "stable"],
      "description": "the bilattice standing the telos orients its settling toward (the relating charge bedrock; mirrors goal.charge)"
    },
    "regime": { "const": "aperiodic", "description": "pinned to the aperiodic regime (κ ≥ ω₁): a telos that could halt is a goal, not a telos. This is the structural distinction the whole carrier turns on" },
    "satisfiable": { "const": false, "description": "the aperiodic dual of goal.satisfied — a telos is structurally NEVER satisfied; its non-arrival is what keeps the operations loop running. A boolean `satisfied` would be a category error here" },
    "declaredBy": { "type": "string", "description": "who declared this telos — the agent/office that posed it. Required: per the propaganda topology, a telos is declared and auditable, never hidden; an undeclared telos is malformed" },
    "advanced": { "type": "integer", "minimum": 0, "description": "the monotone count of operations-loop cycles whose Scott-continuous settling has ADVANCED the telos's aperiodic settling toward (never to) its attractor — the fibers fired so far over the aperiodic base. Replaces goal's boolean `satisfied` with the ≤_k-monotone progress measure the aperiodic regime demands" }
  }
}
```

And the one-line change to the `Organization` carrier (`organization.schema.json`), adding `telos` alongside the existing fields — the Gen-2 analog of `Agent.goal`:

```jsonc
// add to organizing/organization "properties":
"telos": {
  "$ref": "organizing/organization/telos",
  "description": "the collective's reason-for-running — the aperiodic function it is open-above toward. The Gen-2 lift of the agent's `goal`; an organization without a declared telos is open-above toward nothing named"
}
```

Migration note: making `telos` **required** is the principled end-state (an undeclared telos is malformed), but it should land **optional first** so existing `organize`/ `assemble`/`federate` constructions keep settling; the constructor in `organizing.mts` would derive a default telos from the social union's dominant unsatisfied predicate (the collective's standing concern), exactly as `buildGoal` defaults the agent's goal from its first claim.

## What wiring would entail (for a later pass, not now)

1. Land `organizing/organization/telos.schema.json`; let codegen emit `telos.schema.types.mts`.
2. Add a `buildTelos(state)` reading in `organizing.mts` — pin `regime: "aperiodic"`, `satisfiable: false`, derive `predicate` from the social union's dominant non-`stable` concern, set `advanced` from the cycle count (0 at first settle).
3. Add `telos` to the `Organization` carrier and to `buildOrganization`.
4. Tie `advanced` to managing-operations' operations-loop: each `settle-cycle` increments it (the Scott fibers over the aperiodic base).
5. Optionally fold propaganda's `declaresTelosPredicate()` discipline in so a telos declaration is an auditable meme-floor fact, not just a field.

## Source map

- Arrow / regimes: `relating/src/...settling`, `socializing/src/socialize/regime.mts` (κ-ladder verbatim), `converge.mts` (endpoint-state vs trajectory).
- Per-package source read for this review: `communicating/src/...understanding` (tense/ aspect), `knowing/src/cognizing/morphisms/reflect.mts` + `memory/carrier.mts`, `playing/src/ludics.mts` + `...ludicizing/chronicle.mts`, `animating/src/.../agent.mts` (+ `agent.schema.json` `goal`), `computing/src/computing.mts` (`standingOfAgent`, `halted`), `gaming/src/running/*`, `organizing/src/organizing.mts` (+ `organization.schema.json`).
- telos precedents: `content/src/propaganda/propaganda-topology.mts` (declared/auditable telos discipline); `managing-operations` (`objective`); `function-as-aperiodic-settling` theorem (content/ predicated-work; theorized, not yet a package carrier).
- The fibration (telos base / operations-loop fibers): the lusory-constraint narrative, surveyed in [the calendar note](2026-06-21-calendars-and-timekeeping-in-the-corpus.md).
