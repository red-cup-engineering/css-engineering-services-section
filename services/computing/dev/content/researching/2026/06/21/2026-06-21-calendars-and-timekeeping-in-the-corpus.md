---
title: "Calendars and timekeeping in the corpus: cadence as recurrent settling"
description: "A survey of everything content/ holds on calendars, timekeeping, and temporal structure, read through the corpus's own theory. The unifying claim: a calendar is not a clock-grid but a recurrent practice — a closure-rule subsystem firing at cadence boundaries — and time itself is the Mazurkiewicz/history-monoid index of the relational universe. Threads the four lenses the request named: agency (whose cadence, ecological vs. clock), computing (true-concurrency time, settling regimes, temporal 2-category), gaming (cadence as nested lusory magic circles; the Teraumic worldbuilding calendar), and sociology (calendar as institutional rhythm, contested holidays, generational and winter-count recurrence)."
date: 2026-06-21
status: survey
---

# Calendars and timekeeping in the corpus

This note collects what `content/` (live tree and `_archive`) holds on calendars, timekeeping, and temporal structure, and reads it through the corpus's own theory rather than as received horology.
Almost nothing in the corpus treats a calendar as a passive grid of clock-ticks.
The corpus's recurring move is to **re-derive timekeeping as a settling phenomenon**: a calendar is a *recurrent practice* whose rules fire at cadence boundaries, and time itself is the index structure of the relational universe under true concurrency.
The four lenses the request named — agency, computing, gaming, sociology — are not separate topics but four readings of the same `recurrent-practice` object.

## The spine: calendar = recurrent practice = recurrent settling

The load-bearing object is the **recurrent practice** $R = (\mathcal{S}_R, T_R, \alpha_R)$ ([recurrent-practice.md], in `social-sciences/working/_archive/` and the predicated-work tree), the *mathematical realization* of a calendar/cadence/cycle:

- $\mathcal{S}_R \subseteq \mathcal{S}_{\mathrm{op}}$ — the closure-rule subsystem that *constitutes* the practice (the rules for "weekly review": detect a new week, gather inputs, run the procedure, produce witnesses).
- $T_R = \{\tau_0, \tau_1, \tau_2, \ldots\} \subseteq \lambda$ — the **cycle-boundary ordinals**: the settling stages at which a new cycle begins.
  The intervals $[\tau_i, \tau_{i+1})$ are the *cycles*.
- $\alpha_R$ — the **aggregation structure**: how much of the past each cycle reads (cycle-independent / Markov / finite-history depth-$k$ / limit-aggregating).

The crucial inversion (in `settle-cycle.md`'s closing section, "cadence boundary as settling-stage boundary"): **cadence boundaries are not externally imposed timestamps.** Each $\tau_n$ is a *substrate-algebraic fact* — a stage at which the practice's cycle-transition closure rule fires, asserting $\langle R, \texttt{cycle-boundary-at}, \tau_n\rangle = \mathbf{t}$.
The boundary is determined either by (a) elapsed-stage counts for strict calendrical cadences, or (b) *ecological/operational conditions* for trigger-driven cadences.
The clock is one possible antecedent, not the definition of time.
This is the hinge that lets the same machinery cover both a Google-Calendar weekly review and a Lakota hunt keyed to the buffalo, with "only the antecedent changing."

The **settle-cycle morphism** $\Sigma_R$ ([settle-cycle.md]) is "one cycle of work":

$$\Sigma_R(v^{\mathrm{op}}_{\tau_n}) = \mathrm{cl}^{\mathcal{S}_R}\Bigl(v^{\mathrm{op}}_{\tau_n} \vee_k \bigvee_{\tau_n \leq \tau < \tau_{n+1}} u_\tau\Bigr)$$

take the valuation at cycle start, join every increment recorded during the cycle, apply the practice's closure operator.
It is **monotone** (settling never loses knowledge) and composes: $\Sigma_R^n$ advances $n$ cadence steps, and $\Sigma_{\mathrm{daily}} \circ \cdots = \Sigma_{\mathrm{weekly}}$ — "a week of daily cycles is a week of work" as a structural fact, not a notation.

## Computing: time is the history monoid, and the calendar's regime is a cohomology class

Two computing-side results sit under the calendar material.

**(1) Time as true-concurrency index.** The deepest treatment of "what a date even is" is `knowledge-science/archive/terms/history.md`.
A `date` ([terms/date.md]) is just a human-readable ISO-8601 label; the real temporal object is a **history**, an element of the **history monoid** $(T, \star, e)$ — which the note proves *is* the **Mazurkiewicz trace monoid** / free partially commutative monoid (Cartier–Foata 1969, Mazurkiewicz 1977).
Time here is not a line: it is an equivalence class of step-sequences where **independent steps commute** (the extension-diamond axiom).
The prefix order $t \le t'$ makes $T$ the index category over which the entire relational universe presheaf lives.
So in the corpus, "computing's clock" is the true-concurrency partial order of events — the calendar of a distributed system is its trace monoid, and the commutation relation $I$ is *which events don't need ordering*.
(The same file then runs a startling cosmological detour: minimal non-trivial commutation gives Fibonacci growth, whose golden ratio it conjectures matches the Hubble tension — temporal structure all the way out to expansion rates.
Flagged as conjecture; noted for completeness.)

**(2) The calendar's settling regime is a classifying invariant.** Whether a recurrent practice is "just a rhythm" or "carries cumulative history" is the *regime* question, decided by $\alpha_R$ via the regime-of-recurrent-practice theorem:

| Practice | Aggregation $\alpha_R$ | Regime | $\kappa$ | $H^1$ |
|---|---|---|---|---|
| Dispatch (one-shot) | — | strict | finite | — |
| **Weekly calendar** | Markov (1 prior cycle) | Scott-continuous | $\omega$ | $0$ (trivial) |
| **Sprint** | finite-history depth 1 | Scott-continuous | $\omega$ | $0$ |
| **Seven-generation review** | finite-history depth 7 | Scott-continuous | $\omega$ | $\mathbb{Z}^7$ (step-7 invariant) |
| **Generational review** | limit-aggregating (all prior) | transfinite-bounded | $\omega<\kappa<\omega_1$ | non-trivial |
| Endeavor's *function* | uncountable cofinality | aperiodic | — | firing-ordinal class |

The point ([weekly-calendar-as-recurrent-practice.md], [generational-review-as-transfinite-bounded.md]): a calendar is the *simplest* recurrent practice — "the anchor example, not the demonstration of where the regime classification gets its discriminating power."
Its $H^1 = 0$ says day-to-day rhythm is *trivially classified*: no two weekly calendars are structurally distinguishable.
Discrimination appears only when cycles *aggregate their past* — a generational review whose wisdom "emerges from the totality of history rather than any finite slice" is non-Scott-continuous and carries a non-trivial cohomology class. **Different traditions running the same review form but with different histories are different $H^1$-classes** — the substrate-algebraic ground of "same ritual, different tradition."
Note also the finite-history depths line up with substitution-rule eigenvalues: depth-2 Fibonacci/$\phi$, depth-3 Padovan, depth-4 tetranacci/`FOUR`.

The whole apparatus packages into the **temporal 2-category** $\mathbf{T}(\mathcal{C}_{\mathrm{op}}, \lambda)$ ([temporal-2-category.md], which *is live* in the descent tree under `settling/`): cadence boundaries are 0-cells $(\tau_n, \mathcal{C}_{\mathrm{op}})$, cycles are 1-cells $\Sigma_R^{(n)}$, and the KZ-lax-idempotent diamond of 2-cells governs how within-cycle settling (the $\mathbb{N}$-comonad) and across-cycle settling (the $\mathbb{M}$-monad) compose.
In the Scott-continuous regime the 2-cells collapse and $\mathbf{T}$ is just a 1-category of composable cycles; in the transfinite-bounded regime the 2-cells at the limit 0-cell are genuinely non-trivial — "the limit cycle is more than the join of its predecessors."
Temporal Beck–Chevalley then guarantees cycle-internal existential queries ("did dispatch happen this cycle?") are coherent across the boundary.

`cadence-as-modal-frame.md` adds the modal reading: a cadence is a **bilattice accessibility relation** $R^{\mathrm{cad}}$ on stages, with $\Box$ = "holds at every upcoming cycle in horizon" (standing policy) and $\Diamond$ = "holds at some upcoming cycle" (scheduling).
Three payoffs: cadence frames *compose* (sprint-in-quarter is one modal expression, not a meta-scheduler); truth-axis vs knowledge-axis separate ("will be true" ≠ "will be known" at each cycle); and **calendar-collision is a cohomological fact** — when two cadences disagree at a limit ordinal, the obstruction to unifying them is an $H^1$ class, "not a project-management heuristic."
The logic is *non-normal* (K fails): forward commitments must be posted as their own rules, not chained across cycles.

## Agency: whose cadence, and on what clock

The corpus consistently asks *whose* time a calendar encodes and *what* drives its boundaries — the agency lens.

- **Availability** ([availability.md]) is the agent-side temporal constraint: the set of intervals an agent *can* (not *will*) work, with temporal / capability / energy dimensions.
  It "gates the feasible region" of dispatch and "degrades under load."
- **Time-block** ([time-block.md]) is the unit that "converts a priority into an executable schedule" — an interval an agent reserves, defended against reactive displacement (Newport's deep work).
  A *shift* is coverage the organization needs; a *time-block* is focus the agent needs.
- **Endogenous vs. clock cadence.** The strongest agency statement is the Lakota material ([annual-cycle.md], [cadence-as-annual-cycle.md]).
  Lakota work-cadence *is the annual cycle* $\mathcal{Y}$ — four ceremonial-seasonal markers (Wíiyaȟpeyatuya-wí / Bloketu / Pteȟíŋčhaŋ-wí / Waníyetu) functioning as the modal-frame accessibility relation that says when each work-class is *due*.
  The hunt fires on the buffalo's availability, the sun dance on Bloketu — ecological antecedents, exactly the "trigger-driven cadence" `settle-cycle.md` allows.
  Modal non-normality is used precisely: most cadence cells are $\Diamond$-flexible (a hunt delayed by weather leaves no residue), but high-wakȟáŋ cells (sun dance, the one-year keeping-of-the-soul, naming) are $\Box$-required — missing them produces $\top$-residue.
  And the reservation period is read as **cadence disruption**: the accessibility relation $R^{\mathrm{annual}}$ "remained installed" while external force *prevented the firing* at its windows, accumulating residue — "the contemporary reclamation is restoration of firing at the windows the cadence-frame still indicates."
  This is the corpus's sharpest statement that a calendar is an *agency* structure: the same frame can be installed yet forcibly unfired.

## Gaming: cadence as nested lusory magic circles

The play lens is explicit in `lusory-constraint-and-the-magic-circle.md`, which states the work vocabulary's cadence/recurrence terms "are explicitly grounded in ludics."

- A **lusory constraint** (Suits, *Grasshopper* 1978) — the voluntary unnecessary obstacle that *is* the game — is substrate-algebraically a closure rule that **pins predicate cells to $\bot$**, actively suppressing settlements evidence would otherwise drive.
  The worked case: the RSC Quiescent's seven-day themed calendar ([weekly-calendar-as-recurrent-practice.md]) — *mathy-monday, tunesday, wacky-wednesday, theorsday, fabriday, settlerday, sunday-funday* — where each day *suppresses* the off-theme predicate classes (Monday pins fabrication to $\bot$).
  "The pinning is what makes the day mathy."
  `sunday-funday` itself activates *ludics/gamification/play* and suppresses formal-theory/triage — play is one day's lusory mode.
- A **magic circle** (Huizinga) is a closure-rule subsystem bound to a *sub-base*; its boundary is which rule-system is in scope. **Nested cadences are nested magic circles**: daily-within-weekly-within-quarterly constraints all gate a rule's firing simultaneously ("Mathy Monday at 10am during a planning-quarter has three concurrent constraints").
  Nesting = 1-cell *factorization* in $\mathbf{T}$ (the weekly cycle factors into seven daily cycles).
- **Voluntariness = consent-cell gating**: a lusory rule fires on an agent only if $\langle a, \texttt{consents-to}, r\rangle = \mathbf{t}$ — opt-in, unlike charter rules that bind by membership.
  The captain's override is a `power` jural-relation that redraws the circle, recorded and reviewable. **Deep play** (Geertz) is a *boundary breach* — a nominally-bounded ritual whose cells settle real consequences outside the circle, which the audit log can detect.
- **Worldbuilding calendars** are the other gaming vein, in the MUD/paracosm archive: the **Teraumic calendar** ([teraumic-calendar.md], [red_union_calendar.org]) — 12 months × 30 days (three ten-day periods each) × 4 seasons + 5–6 holidays = 365.25 days, with *three competing month-naming systems* (agricultural / MASH / Red Union) that agree on structure but disagree on names and holiday placement, and in-fiction politics about it ("the Red Union is salty about the divine origins of their environment… complicating a clean 30-day calendar").
  It is a designed artifact whose *contested naming* prefigures the sociology lens.

## Sociology: calendar as institutional rhythm and contested memory

The institutional lens is the densest in raw file count (the `social-sciences/working/` and `sociology/.../institution/work/` clusters, in triplicate across reorg variants).

- **Calendar** ([calendar.md]) is "the shared coordinate system that makes scheduling possible" — *not* a schedule (which assigns work) or a roster (which assigns people).
  It "encodes cultural and institutional rhythms" and **multiple calendars overlay the same time** (a university-hospital worker lives in academic + fiscal + Islamic + secular calendars at once); "a shared calendar enables coordination without negotiation."
- **Cadence / recurrence / cycle** are the rhythm vocabulary. **Cadence** ([cadence.md]) is the multi-scale beat table (turn ⊂ session ⊂ daily ⊂ weekly ⊂ monthly ⊂ quarterly), Reinertsen's cadence-vs-synchronization, and the settlement-path imperative: "move from *we should review sometimes* through *we review when we remember* to *the system triggers a review every Friday at 3pm*." **Recurrence** ([recurrence.md]) is the Prigogine/Eliade/Gadamer point that recurrence ≠ repetition — "the pattern spirals, not circles"; it is "the temporal foundation of governance" (accountability *requires* recurrence) and reaches generational scale (Haudenosaunee seven-generations). **Cycle** ([cycle.md]) is one iteration carrying novelty forward (PDCA, sprint, fiscal year); "the atomic unit of organizational learning."
- **The operations loop** ([operations-loop.md]) is the canonical institutional calendar: a six-phase recurrent practice (plan → dispatch → execute → track → review → feedback), Markov-aggregated, Scott-continuous, "typically aligned with the weekly calendar."
  Its phase-ordering is closure-rule gating; it "runs forever" because it serves the endeavor's aperiodic function ("the means change, the function does not").
- **Calendar as contested memory.** Two pieces make the calendar a *political* object. **Newroz** ([newroz.md]) — the spring-equinox celebration claimed as Kurdish (Kawa's rebellion) and as Persian/Turkic (Nowruz/Nevruz) — is "genring applied to a calendar": the same date repackaged with a different character to serve a different national story, banned and then domesticated by the Turkish state.
  The **winter-count** (*waniyetu-iyawapi*, [annual-cycle.md]) is the inverse: a calendar *as distributed memory* — each year recorded by its single most-distinctive event-name (*Bad Porcupine*, *Two-Men-Killed*), keepers holding continuous multi-generational records — the substrate-record mechanism of the annual cycle, and a generational/limit-aggregating recurrence whose disruption (boarding schools breaking the winter-teaching transmission) is the same residue story as the cadence frame.

## How the threads tie together

One object, four readings:

- A **calendar** is a `recurrent-practice` — a closure-rule subsystem firing at cadence boundaries that are themselves settled facts, not external clock-ticks.
- **Computing** supplies the substrate: time = the history/trace monoid (true concurrency), the calendar's character = its settling *regime* and $H^1$ class, the whole packaged in the temporal 2-category with Beck–Chevalley coherence.
- **Agency** asks whose cadence and on what antecedent — clock vs. ecology — and reads installed-but-unfired frames (the reservation period) as residue.
- **Gaming** reads cadence as nested lusory magic circles (predicate $\bot$-pinning, consent-gating, override-as-boundary-redraw), with the Teraumic calendar as a designed, name-contested artifact.
- **Sociology** reads the calendar as overlaid institutional rhythm (the operations loop), as the temporal foundation of governance/accountability, and as contested memory (Newroz's genring, the winter-count's record-keeping).

The corpus's distinctive claim, stated most plainly in `cadence-as-modal-frame.md` and `settle-cycle.md`: **a calendar collision is a cohomology class and a cadence boundary is a settling stage** — timekeeping is a derived feature of how a community's rules settle, not a primitive grid the rules are hung on.

## Source map

Theory spine (predicated-work; mirrored in `social-sciences/working/_archive/` and the deep `animating/.../sociology/library/work/` tree): - `recurrent-practice.md`, `settle-cycle.md`, `operations-loop.md` - `cadence.md`, `recurrence.md`, `cycle.md`, `cadence-as-modal-frame.md` - examples: `weekly-calendar-as-recurrent-practice.md`, `sprint-as-recurrent-practice.md`, `generational-review-as-transfinite-bounded.md`

Live tree: - `…/settling/content/temporal-2-category/temporal-2-category.md` (the only live calendar- adjacent object; everything else is `_archive`) - `lib/561-group/.../calendar/docs/dev/notes/weekly-calendar-as-recurrent-practice.md`

Agency / sociology / play: - `social-sciences/working/_archive/`: `calendar.md`, `time-block.md`, `availability.md`, `lusory-constraint-and-the-magic-circle.md` - Lakota: `…/lakotaean-governance/…/annual-cycle.md`, `…/cadence-as-annual-cycle.md` - `sociology/archive/terms/newroz.md`

Computing / worldbuilding: - `knowledge-science/archive/terms/history.md` (history/trace monoid), `terms/date.md` - `arts/ludics/archive/multi-user-dungeon/…/teraumic-calendar.md`, `red_union_calendar.org`

Not yet integrated / thin: `astronomy/.../celestial-sphere.md` is plain received astronomy (coordinate frame), not yet given the settling reading its `astronomical-settlement` parent path promises; the music-theory `cadence` and pyfars `cadence` are unrelated homonyms (harmonic / bicycle-pedaling).
