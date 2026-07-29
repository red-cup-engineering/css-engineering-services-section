---
title: "knowing = the comonad on Meme: the epistemics of the knowledge order"
description: "The principled redesign of @emsenn/knowing. knowing is an endomorphism of the SAME meme carrier as communicating — meme in, meme out — but it is the COMONAD that works the meme's knowledge order ≤_k (where communicating is the semiotic monoid that works its meaning/truth axis). It is the cognitive reading of the corpus's settling-coalgebra-structure c : E → F_U(E): each step is the closure climbing ≤_k; reflecting is the orbit that settles to a known fixpoint, ruminating is the orbit that never settles. Grounded in the meme/charge algebra, the predication-hyperdoctrine and its dual, the settling-coalgebra-structure, content/'s 'the depth is the memory', and the neuroreflexivity corpus on rumination vs self-reflection. Cognitive completeness (attention, memory, learning, intelligence, reflection) is the target."
date: 2026-06-21
status: design
---

# knowing = the comonad on Meme

## The thesis

`@emsenn/knowing` **accumulates knowledge over the meme carrier** — its core morphisms have the **≤_k comonad structure**:

```
knowing : Meme → Meme   (the core)
```

Meme in, meme out — **the same carrier as `communicating`** ([note](2026-06-21-communicating-as-end-meme-semiotics.md)), not a different one and not a "thicker" one.
(NB — "is the comonad on Meme" is a *structural description* of these core morphisms, not a *definition* that gates the surface: knowing's cognizing READINGS — assess/gauge/bind/attract/contextuality — are first-class operations that are *not* meme→meme, and that is fine.
The categorical gloss does not get to exclude them.)
The open question this note was given — *is knowing also meme→meme, or a different/thicker carrier?* — resolves the way communicating's "objects" resolved: **one carrier, read on a different axis.** The meme already carries evidence (its `charge` has witness Marks on each side) and the two bilattice orders (`knowledgeOrder`, `truthOrder` in `positing/fiber.mts`).
The knower/known relation and the provenance the question hypothesized are not a new field to bolt on; they are the meme read on its **knowledge order ≤_k** with its evidence witnesses foregrounded, and the reflexive self-reference is the comonad's comultiplication (a meme whose subject/object is itself a meme — the nesting the meme grain already allows).

So knowing and communicating are the **same carrier, dual structures**:

| | carrier | structure | bilattice axis | iteration |
|---|---|---|---|---|
| **communicating** | `Meme` | meme endomorphisms (each meme → meme; generate a sub-monoid of End(Meme)) — semiosis | meaning / truth (the interpretant chain) | **unlimited semiosis** — cycles/spirals, by design need not converge |
| **knowing** | `Meme` | **comonad** on Meme (the settling coalgebra) | **knowledge ≤_k** | the **settling orbit** — definitionally oriented at a fixpoint |

communicating moves a meme's *meaning* between two relators; knowing moves a meme's *knowledge*, climbing ≤_k by iterating the corpus's settling closure.
This is not a new mechanism invented for the package: it is the cognitive reading of a structure the corpus already proves — the **settling-coalgebra-structure**.

## The carrier (grounded — reused, not re-invented)

A `Meme` (`positing/fiber.mts`, `$id: relating/articulating/predicating/positing/meme`) is a **charged predication**:

```
Meme = { kind: "predication.fiber.meme", cell: Cell, charge: ChargeCarrier }
  cell   = { subject, predicate, object }            // Φ = E×Π×E, of Marks
  charge = { value: [truth, falsity] over FOUR, evidence: [Mark[], Mark[]] }
```

The same minimal transmissible unit communicating uses.
Two facts about it are what knowing stands on:

1. **The charge lives on a bilattice with two orders** (`pre-bilattice/content/bilattice`, `two-orders-duality`).
  `positing/fiber.mts` names them: the **knowledge order** `≤_k` (absurd ⊥ → stable ⊤) and the **truth order** `≤_t` (active ⊥ → absurd ⊤).
  `two-orders-duality` proves the two are conjugate by the swap involution σ on FOUR. **knowing is the package that works ≤_k**; communicating works the meaning/≤_t side.
2. **The charge carries evidence witnesses on each side.** "Value enters predication by evidence" (`positing` doctrine).
  A meme is therefore *already* a held-with- evidence claim — the "provenance/evidence" the question asked about is in the carrier, not an extension of it.
  Knowing reads and grows that evidence as the ≤_k value climbs.

So knowing authors **no new carrier**.
Its `inputSchema.$ref === outputSchema.$ref === relating/articulating/predicating/positing/meme`.
The old `lib/knowing` carriers (`Knowledge`, `AgentCell`, `AgentSite`, `Explanation`, `AgentLearning`, `Curriculum`, `NextStep`) become **readings/wire-projections of the meme**, exactly as communicating's `sign/message/proposition/act` are meme-lenses — not separate carriers.

## What makes it knowing and not communicating: the settling coalgebra

The corpus proves, at the settling level, the **settling-coalgebra-structure** (`…/knowledge-least-valuation/settling/…/predication-hyperdoctrine/content/settling-coalgebra-structure`):

> a coalgebra `c : E → F_U(E)` for the settling endofunctor `F_U`, whose orbit is **knowledge-monotone**: `σ ≤ τ ⟹ v_σ ≤_k v_τ` pointwise, with `v_0 = E`, `v_{τ+1} = F_U^{τ+1}(E)`, `v_μ = join_k{v_σ : σ<μ}` at limits — *"realizes settling as the spatiotemporal knowledge presheaf."*

This **is** knowing, read as cognition:

- **a step of knowing is a step of the settling coalgebra** — apply `c`, the value climbs ≤_k (more is settled, more evidence is held);
- **the predication-hyperdoctrine** (`…/settling/…/predication-hyperdoctrine`) "carries the closure 2-monad — the structure settling iterates" and satisfies Lawvere's conditions in **both** orders.
  Its **dual** (`dual-predication-hyperdoctrine`) turns the closure 2-monad into a **closure 2-comonad** `Cl*` and the settling *coalgebra* into a settling *algebra*.
  The monad/comonad pair the corpus already carries is the precise home of communicating-vs-knowing: communicating presents the monoid/monad (free repetition, the `!
  `); knowing presents the **comonad** (the cofree, context- carrying, ≤_k-monotone orbit).
  The comonad is why knowing is **reflexive**.

### Reflecting vs ruminating, in the corpus's own terms

The neuroreflexivity corpus (`…/neuroscience/…/neuroreflexivity/…/differentiating-modes- of-introspecting-on-personal-failure-to-determine-routes-of-rumination-and-self- reflection.md`) defines introspection as **"self-directed cognition"** and gives the exact fork knowing must encode.
Its closing thesis:

> when the interpretive modes are conflated, introspection becomes **structurally unstable, oscillating between explanation, judgement of that explanation, explanation of that judgement, judgement of that explanation, without resolution** … whereas **concrete, process-focused reflection** reaches actionable insight.

That is the settling orbit, named in psychology:

- **reflecting** = the reflexive orbit that **settles** — knowledge-monotone, reaches the ≤_k-least fixpoint (the *known*).
  The convergent coalgebra; "process-focused".
- **ruminating** = the reflexive orbit that **does not settle** — it oscillates and never reaches a fixpoint.
  The corpus carries this failure mode directly: `aperiodic-settling`, `non-scott-continuous-firing-ordinal/firing-blowup`, `settling-continuity` — orbits whose closure ordinal blows up or never converges.
  Rumination is **settling that fails to settle**: the same machinery, no fixpoint.

So the rumination/reflection distinction is not a metaphor laid over the math; it is the **convergence vs non-convergence of the settling-coalgebra orbit**, which is the very structure knowing iterates.
Knowing is *oriented at the fixpoint*; that orientation (vs communicating's by-design unlimited semiosis) is the second thing that distinguishes it.

## Core morphisms of the comonad

Each is grounded in **a cognitive faculty** AND **the corpus's ≤_k / settling algebra**.
Together they generate knowing; iterating them is the orbit.

| morphism | cognition | what it does to the meme (corpus algebra) |
|---|---|---|
| **attend** | attention — selecting *what* to know about | reindex / base-change `f*` in the hyperdoctrine; **specialization** generator (`positing/fiber.mts`) restricts the closure to a sub-region/fiber. Attention = choice of fiber. |
| **research** (ε-context) | inquiry | the base step: iterate the **closure 2-monad** over a region — the ≤_k-monotone settling orbit `c : E → F_U(E)`. The coKleisli act the old code names `r : X → C Y`. |
| **know** (ε, **extract**) | the known | comonad **counit**: read the settled ≤_k value/fixpoint out of its context; *certified* iff it factors through the C-coalgebra (the old `knowing.mts` test). |
| **reflect** (δ, **duplicate**) | self-reflection / neuroreflexivity | comonad **comultiplication**: turn the meme on itself — a meme whose subject/object is a prior meme (knowing-that-you-know). The **convergent** reflexive orbit. |
| **ruminate** | rumination (the pathology) | the reflexive orbit that **never settles** — `aperiodic-settling` / `firing-blowup`; ≤_k-non-monotone oscillation. Same δ, no fixpoint. Knowing must *detect and name* it, not hide it. |
| **learn** | learning | a single settling **step that strictly raises ≤_k** (`v_τ <_k v_{τ+1}`) — a knowledge increment; one firing of the settlement filtration. |
| **remember** | memory | **"the depth is the memory"** (`content/CLAUDE.md`): the accumulated ≤_k lower bound already held — the comonad **context**, the join of the orbit so far. |
| **gauge intelligence** | intelligence | the closure **regime / firing ordinal** (`settling-continuity`, `non-scott-continuous-firing-ordinal`): how far up the ordinal the orbit must climb to settle — strict-finite ⊂ Scott-continuous (κ=ω) ⊂ transfinite-bounded ⊂ aperiodic (κ≥ω₁). Intelligence = efficiency of settling. |
| **teach / tutor** | teaching | order the learned increments for delivery (curriculum) / take the head of learning (next step) — the existing derivatives, retyped over the meme. |

## Cognitive completeness as the target (mirror of communicating's Jakobson check)

communicating's falsifiable completeness check is Jakobson's six functions. knowing's is the **faculties of cognition**: each must be expressible by the morphisms above.

- **attention** → `attend` (base-change / specialization);
- **memory** → `remember` (the held ≤_k lower bound; the comonad context);
- **learning** → `learn` (a ≤_k-strict settling step);
- **intelligence** → `gauge` (the settling regime / firing ordinal);
- **reflection** → `reflect` (δ, the convergent reflexive orbit) — with **rumination** as its divergent shadow (`ruminate`), kept *visible*, never silently dropped.

The bet (a checkable one, not a corpus citation): the cognitive faculties are the **closure of this finite generating set on the meme's ≤_k axis**, because each faculty is one of these moves or a composite, and the meme's section-nesting gives reflection unbounded depth — just as semiosis gives communicating unbounded depth on the meaning axis.

## Place in the manifold (carrier-node mounting)

Per [carrier-node mounting](2026-06-21-package-composition-by-carrier-node-mounting.md): a package mounts its apex at its **domain carrier's `$id`-node** in the host namespace. knowing's domain and codomain are both the **meme**, so knowing **co-mounts at relating's meme node** (`…/positing/meme`) as an **endo self-loop** — the *second* self-loop at that node, dual to communicating's:

- communicating's self-loop at the meme node iterates **meaning** (semiosis, ≤_t side);
- knowing's self-loop at the same node iterates **knowledge** (≤_k side, the settling coalgebra), and **links forward to the settling node** (`…/knowledge-least-valuation/ settling`), whose `settling-coalgebra-structure` is the law it realizes.

Two guests over one carrier node, disambiguated by verb — exactly the "multiple guests over one carrier node" case that note anticipates.
The real wiring edge is `relating(positing/settling) → knowing`; knowing is an endomorphism, so it composes with itself (reflection, the orbit) and with communicating (you can *know about* what you *communicate*, and *communicate* what you *know*) across the carrier boundary by `$id` match alone.

## Implementation consequence (schema-first, next steps)

Rederive `lib/knowing` on the new line exactly as relating-experimental and communicating were:

1. **No new core carrier.** knowing's canonical actions take a meme on the json wire and return a meme; `inputSchema`/`outputSchema` both `$ref` `relating/articulating/predicating/positing/meme`.
  Reuse the meme schema authored in relating-experimental positing.
2. **Schema the projections.** The meme-*readings* knowing emits at its boundary (knowledge / learning / curriculum / next-step / topic-inspection …) each get an `object.schema.json` with a **bare-descent-path `$id`** under `knowing/…` ([decision #1](2026-06-21-decision-schema-id-scheme.md)); types generated by the `realize` codegen build step (port the relating-experimental pipeline).
  These are wire shapes, **not** rival carriers — the carrier stays the meme.
3. **Schema the morphism.** Each learning verb's `domainSchema`/`codomainSchema` `$ref` carrier `$id`s; `inputFormat`/`outputFormat` declare the wire codecs.
4. **Re-type the generating morphisms** above: `attend / research / know / reflect / ruminate / learn / remember / gauge / teach / tutor`, retiring nothing — the existing 22 actions map onto these (research/know/study/explain/learn/teach/tutor are the settling-orbit verbs; browse/locate/find/grep/read/list are `attend`'s addressing shadow; settle-memory/observe/inspect-* are `remember`/`gauge`).
  Per `CLAUDE.md` Absence/Normalization: port every capability; drop nothing.
5. **Four faces at the node** (CLI/MCP/OpenAPI/WebUX) via the relating dispatcher and `induceBins`; mount at the meme node per the carrier-node note.
6. **Witness every call as EAVT** into knowing's own ledger.
7. **Demo: knowing-in / knowing-out.** A meme enters; knowing's orbit climbs ≤_k a step (`learn`), reflects (`reflect`), and emits the meme again — one settled reflexive step witnessed — and a non-settling region is *named* `ruminate`, not hidden.

## The full surface: two grains, and the whole settling apparatus as cognition

The ruminate/reflect pair is **one illustration of the theory's scope, not its limit.** The comonad on Meme realizes the *entire* settling/hyperdoctrine apparatus the corpus proves, read as cognition.
Two carrier grains carry it:

- **the meme** (single, reused) — the *cognizing unit* grain: `cognize / absorb / reflect / ruminate / assess` act here (Meme → Meme, or Meme → a knowing reading).
- **the knowledge-state** `C(Meme)` — the comonad **context**: a *section / valuation / sheaf of memes* over a base (relating's `Valuation`/`FiberAlgebra`, ultimately the settling sheaf).
  This is the knower's whole held knowledge, and it is **knowing's own richer carrier**.
  The coKleisli arrows are `C(Meme) → Meme`; attention, memory, the quantifiers, and modal knowing all live at this grain.
  The corpus's `settling-coalgebra-structure` "realizes settling as the spatiotemporal knowledge presheaf" — `C(Meme)` is that presheaf, and `remember` is its section.

Every faculty is a knowing-OWNED, schema-first carrier (bare-descent `$id` under `knowing/…`, type generated by `realize`) with a morphism whose `domain/codomainSchema` `$ref` carrier `$id`s.
The surface, each leg grounded in a named corpus region:

| knowing carrier (`$id`) | morphism(s) | faculty | corpus grounding | status |
|---|---|---|---|---|
| `knowing/knowledge-standing` | `assess` | the ≤_k FOUR standing (ε read-out) | charge two-sides over FOUR; `two-orders-duality` | **built** |
| (meme, reused) | `cognize` `absorb` `reflect` `ruminate` | unit · learning · reflection · the named non-settling shadow | `settling-coalgebra-structure`; neuroreflexivity essay | **built** |
| `knowing/settling-regime` | `gauge` | **intelligence** — the regime / firing ordinal of the orbit | `settling-continuity`, `settling-monotonicity`, `aperiodic-settling` (κ≥ω₁), `closure-ordinal`; firing-blowup | wave 2 |
| `knowing/doubt` | `doubt` `forget` | the **dual** direction — restrict to confirming points, descend ≤_k | `dual-predication-hyperdoctrine` (closure 2-**comonad** `Cl*`, settling algebra) | wave 2 |
| `knowing/identity` | `same-knowledge` `distinguish` | meme **identity** — the two equalities | `paraconsistent-equality` (⊤ on Δ, merge-stable), `classical-equality` (t/f) | wave 2 |
| `knowing/knowledge-state` = `C(Meme)` | `recollect` `attend` | **memory** + **attention** — the held section; base-change `f*` | `sheaf`, `d-frame-valued-sheaf`, `world-set`; "the depth is the memory" | wave 3 |
| `knowing/generalization` | `generalize` (∀_f) `exemplify` (∃_f) | **abstraction / instantiation** — the quantifier adjoints | predication-hyperdoctrine `∃_f ⊣ f* ⊣ ∀_f`; `positing/fiber.mts` generators | wave 3 |
| `knowing/modal-knowledge` | `know-necessarily` (□) `know-possibly` (◇) | **modal knowing** — across accessible worlds | `bilattice-accessibility-relation`, `world-set`, `bigraded-diamond`, `nuclear-quartet`, `twist-modal-translation` | wave 4 |

Intelligence (the regime) **subsumes** the reflect/ruminate fork: reflection is the strict-finite / Scott-continuous regime (converges at a countable ordinal); rumination is the **aperiodic** regime (κ≥ω₁, "strictly knowledge-ascending and coherent rather than stabilizing, invariants escaping fixed-point theorems").
So `gauge` is the general faculty of which `reflect`/`ruminate` are two values — exactly why the pair was an example, not a boundary.

This is a multi-wave program; each wave is studied from its corpus region (my job, not an agent's), then its carriers+morphisms are authored schema-first and landed green.

## Second research wave (the C(Meme) grain, deepened)

A second pass over the settling corpus sharpened the knowledge-state grain and added three faculties the first pass only named:

- **inference = the closure 2-monad.** `closure-2-monad` is a **Kock-Zöberlein (lax-idempotent) 2-monad** `Cl`: unit `η` is *inflationary* (`v ≤_k cl(v)` — closing always extends), multiplication `μ` is *idempotent* (μ⊣η, "closing twice = closing once", strict under Scott-continuity), and `Cl` is *c-natural* (commutes with reindexing).
  This is knowing's **inference engine** — `infer` applies `Cl` to a held section (deductive closure up ≤_k), and its KZ idempotence is the law `infer∘infer = infer`.
  Specific inference *rules* live deeper (`closure-rule-language` / `closure-rule-system`), a later wave.
- **memory = the settling sheaf.** `sheaf` is the `{base, section}` fixed point settling deposits — local settlements that **glue with `H¹ = 0`** (no disagreement; `cohomologyVanishes`).
  A held knowledge-state is a pre-sheaf section; `consolidate` asks whether it glues (the bilattice fold is confluent — conflicts accumulate as the ≤_k top rather than trivializing, `settling-monotonicity` — so it glues, with `contested` carrying the both-sides-witnessed tension).
  `recollect` is the section itself: "the depth is the memory."
- **knowing the unknowable = MLD-equivalence.** `mutually-locally-derivable` classifies even **aperiodic (never-settling)** knowings: two sections are equivalent iff an invertible settling-morphism connects them, iff their **`H¹` invariants agree**.
  Rumination's invariants "escape fixed-point theorems" yet are still classified — so `same-pattern` can judge two non-converging knowings equivalent by their structural fingerprint.
  Knowing reaches what does not settle.

Newly built this wave (knowledge-state grain, schema-first, green): carriers `knowing/knowledge-state` (= `C(Meme)`, a held section), `knowing/consolidation`, `knowing/derivability`; morphisms `recollect` (memory fold), `infer` (closure 2-monad), `attend` (base-change f*), `consolidate` (sheaf gluing), `same-pattern` (MLD).

Two roadmap faculties remain, each with its corpus home identified: - **modal knowing** — `□`/`◇` over a `world-set` with a four-valued `bilattice-accessibility-relation` (`R(w,w') ∈ FOUR`; the `bigraded-diamond` / KZ diamond).
Needs a world-indexed family of sections. - **graded knowing** — `continuous-valued-settling` generalizes the FOUR standing to a continuum value (fuzzy `[0,1]`, cost `[0,∞]`, MV/residuated): *degrees* of knowing, the same four-regime dichotomy over an enriched value category.

## Provenance

Corpus-grounded: the meme/charge carrier and the two bilattice orders (`positing/fiber.mts`, `positing/content/pre-bilattice/content/bilattice`, `two-orders-duality`); the **settling-coalgebra-structure**, **predication- hyperdoctrine**, and **dual-predication-hyperdoctrine** (the closure 2-monad and its dual closure 2-comonad, the ≤_k-monotone orbit); the settling regimes (`settling-continuity`, `non-scott-continuous-firing-ordinal/firing-blowup`, `aperiodic-settling`); `content/CLAUDE.md` ("the depth is the memory"); and the neuroreflexivity essay on rumination vs self-reflection ("self-directed cognition"; the oscillation-without-resolution vs process-focused-reflection fork).
The existing `lib/knowing` already commits to a comonad C / coKleisli `r : X → C Y` and reads the "static ≤_k" with a "factors through a C-coalgebra" certification — this note sharpens that intent onto the meme carrier and names the convergence fork.

The "same carrier, dual structure (monoid ↔ comonad; ≤_t ↔ ≤_k)" framing, the
mapping of cognitive faculties to the generating morphisms, and "cognitive faculties
= closure of the generating set on the ≤_k axis" are my reasoning, offered as
supplement and checkable — not corpus citations.
</content>
</invoke>
