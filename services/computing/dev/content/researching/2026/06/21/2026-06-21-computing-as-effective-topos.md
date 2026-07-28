---
title: "computing = the effective topos Eff = Kl(!) on playing's CGS"
description: "The principled redesign of @emsenn/computing, grounded in the 561 Group's resolved theory of computing (content/_archive .../category/hacking/library/computing). The theory of computing IS CGS (concurrent games with symmetry) — which is PLAYING's domain (the *-autonomous category, the cut, the home of !). computing the faculty is the effective topos Eff = Kl(!_CGS): the Kleisli sub-CCC of the ! exponential comonad on playing's CGS — the Cartesian-closed category of COMPUTABLE FUNCTIONS (types as objects, programs as morphisms). Internal logic intuitionistic (IPC+CT+MP+WEM; Church–Turing & Rice are internal theorems); external truth is FOUR (the image of Ω_Eff under double-negation). Realizability base = the PCA K₁. Settles computing's domain/codomain from the corpus, separates what computing owns (Kl(!)/Eff) from what playing owns (CGS/!), and lays out the family-style rework (relating-experimental + playing; schema-first; four-faced; EAVT)."
date: 2026-06-21
status: design
supersedes: "the deleted predicated-computer reading (computation=settling, which is relating's substrate, NOT the theory of computing)"
---

# computing = the effective topos Eff = Kl(!) on playing's CGS

## The thesis (the corpus's resolved theory of computing)

The 561 Group's theory of computing is **resolved** (`…/computing/questions/what-is-the-theory-of-computing.md`, status: resolved):

> "The theory of computing is **CGS** (concurrent games with symmetry) — the unique \*-autonomous framework in which sequential game semantics (Hyland–Ong), nominal computation, session types, and Turing-complete realizability all embed — with the effective topos **`Eff ≃ Kl(!_CGS)`**."

**CGS is playing.** Concurrent games with symmetry (`…/code/structures/cgs.md`) is the \*-autonomous category: objects are event structures with symmetry carrying P/O polarity, morphisms are concurrent strategies, the dual `A^⊥` swaps P/O, the tensor is parallel composition.
That is exactly `@emsenn/playing`'s domain ([note](2026-06-21-playing-as-star-autonomous-interaction.md)): the cut, the \*-autonomous duality, and **the home of the `!
` exponential**.

**computing is the Kleisli sub-CCC of `!
` on that.** The effective topos (`…/code/structures/eff.md`) is `Eff = RT(K₁) = ex(Asm(K₁))`, and the Girard decomposition `A ⇒ B = !
A ⊸ B` (Seely 1989) gives, for any \*-autonomous category with a `!
` comonad, a Cartesian-closed Kleisli category.
The corpus's load-bearing equivalences:

```
Eff  ≃  Kl(!_Dial(Eff))            (Hyland 2002, the Dialectica–realizability equivalence)
Eff  ≃  Kl(!_CGS)|concurrent-computable   (via the *-autonomous functor F : Dial(Eff) → CGS)
```

So **`computing = Eff = Kl(!) on playing's CGS`** — the **Cartesian-closed category of computable functions**.
"A computer is a game made repeatable" is *literally* this: a game (a CGS strategy in playing) **made repeatable** by `!
` (the exponential — reuse a move as many times as you want) is a Cartesian, recursive, reusable computable function. computing is **carved from playing by `!
`**, the forced spine `relating → animating → playing → computing`.

This corrects a deleted wrong turn (the *predicated computer*, "computation = settling over predication cells"): that is `relating`'s settling **substrate** — the machine a computer runs on — **not** the theory of computing.

## The carrier computing owns (the program / the type), vs what playing owns

The family pattern — communicating reuses the meme; knowing owns `C(Meme)`; playing owns the `Design` — gives computing its own grain at the **Kleisli/Cartesian level**, distinct from playing's \*-autonomous level:

| | playing (CGS, \*-autonomous) | computing (Eff, Cartesian-closed = Kl(!)) |
|---|---|---|
| object | a **behaviour** / game arena (event structure w/ symmetry) | a **type** = an `Eff` object (an assembly over `K₁`: a set with a realizability relation) |
| morphism | a **strategy** / the **cut** (interaction) | a **program** = a computable function `A → B`, i.e. a Kleisli morphism `!A ⊸ B`, realized by a partial-recursive `K₁`-index |
| connectives | the MALL connectives + **`!` / `?`** (the exponential lives here) | products / exponentials `B^A` (the CCC structure the Kleisli of `!` produces) |
| logic | classical/linear (the proof layer) | **intuitionistic**: IPC + CT + MP + WEM (strictly between IPC and CPC) |
| truth | convergence/orthogonality (Daimon `⊤`) | **FOUR** = `2×2` (verified `t` / refuted `f` / undecidable `⊥` / contradictory `⊤`) = the image of `Ω_Eff` under the `¬¬` nucleus |

So computing's **reused base** is playing's CGS (the `!
` and the arenas); its **owned carriers** are:

- **`computing/type`** — an `Eff` object (an assembly over `K₁`): the realizability carrier on which programs act.
  The base PCA is **`K₁`** (Kleene's first algebra), the *initial Turing-complete PCA* (`…/structures/k1.md`; `claims/k1-is-initial-turing-complete-pca.md`).
- **`computing/program`** — a **computable function** `A → B`: a Kleisli morphism, the realizer being a `K₁`-index.
  This is computing's characteristic morphism; **`compute`** = run it (apply the realizer / Kleisli composition).
- **`computing/eff`** / **`computing/realizability`** — the topos structure: `Ω_Eff` (r.e. propositions), the internal logic, and the internal theorems (Church–Turing, Halting, Rice, Kleene's 2nd recursion) — what makes `Eff` the *minimum required level* (`claims/eff-is-minimum-level.md`).
- **`computing/four`** — the external settled-truth structure on a computational predicate: `FOUR`, forced by Rice's theorem (undecidability ⇒ `⊥` is unavoidable).
  This reuses relating's bilattice `FOUR` directly (`Ω_Eff →^{¬¬} FOUR`).

## The subtheory lattice (computing's regimes/kinds)

The corpus resolves the subtheories (`…/questions/what-are-the-subtheories-of-computing.md`) as **two orthogonal dimensions jointly indexed by CGS** — this is computing's "kinds":

- **typed (macro, \*-autonomous):** the linear-logic fragment chain **MLL ⊂ MALL ⊂ {ILL, CLL} ⊂ LL** (five elements, fully known).
  Typed λ-calculi (STLC, System F, MLTT) are the Kleisli-of-`!
  ` of **ILL**; session-typed π is **CLL**. *These fragments are playing's* (the playing note already carries the fragment lattice); computing inherits them as the outer structure.
- **untyped (micro, within the ILL Kleisli fragment = Eff):** the **Medvedev-filter lattice** — *uncountably* many intermediate subtoposes between `Eff` (IPC+CT+MP+WEM) and its `¬¬`-subtopos (CPC, decidable computation).
  Named ones (pairwise incomparable): the **`¬¬`-subtopos** (decidable / Boolean), **PA-degree**, **1-generic**, **MLR** (Martin-Löf-random) subtoposes.
  This is computing's *own* classification (a Lawvere– Tierney nucleus = a Medvedev filter).

What is **not** a subtheory (corpus-established, load-bearing for the rework): - **complexity theory** — resource-bounded computation *restricts the structural rules* (contraction/weakening), landing in the \*-autonomous (linear) world, **not** a subtopos of `Eff`.
So complexity lives toward *playing*, not as a Kleisli fragment. - **probabilistic / continuous** computing — *sibling* toposes `RT(K₁^r)`, `RT(K₂)`, connected by geometric morphisms, **not** subtheories.

## Place in the family (the spine, carrier-node mounting)

The spine is forced: `relating → animating → playing → computing`. computing **mounts on playing's `!
`-node**: it is the Kleisli category of the exponential, so by [carrier-node mounting](2026-06-21-package-composition-by-carrier-node-mounting.md) its apex sits at playing's `of-course`/`!
` carrier. computing depends on `@emsenn/relating-experimental` (the base: charge/`FOUR`, codecs, `acting`/`induceBins`, `typing`/`realize`) **and** on `@emsenn/playing` (CGS + the `!
` exponential it is carved from) — a real, principled edge, not the old deprecated star.
(Open: whether the `!
`-lift is shared down into relating-experimental so computing needs only relating; default is to depend on playing, since playing owns CGS.)

## Reworking the existing package (what it had right, what to shed)

The current `lib/computing` already had the **theory** right — it just lives on the deprecated line and re-owns what is now playing's.
Re-reading its modules through the resolved theory:

| existing module | corrected reading | rework |
|---|---|---|
| **categorifying** (the executable \*-autonomous category) | this **is CGS = playing**'s domain | **shed** — import playing's CGS; do not re-own the \*-autonomous category |
| **cartesianizing** (the Kleisli sub-CCC of `!`) | **THIS is computing** — `Eff = Kl(!)` | **keep + make core**; schema-first the `type`/`program`/CCC carriers |
| **restricting** (sequential/nominal/session/dialectica paradigms) | the **typed subtheory lattice** (MLL…LL) + the embeddings | split: the \*-autonomous fragments → playing; the `Eff` subtopos (Medvedev) lattice → computing |
| **operating** (settled → observation → arena → strategy → move) | **execution**: run a program; observe its `FOUR` settled state | keep as computing's operational face (the `compute` runner) |
| **encoding** (MUD/telnet/observation) | the **transport/codec** (a running system as a society of interacting programs) | keep as a transport projection (relating's codec boundary) |
| **diagramming** (SVG) | a **WebUX** face | fold into the four faces |

Rework plan (family style, like knowing/playing): (1) re-base onto `@emsenn/relating-experimental` + `@emsenn/playing`, dropping the deprecated `@emsenn/relating`/`gaming`/`animating`; (2) author each carrier as an `object.schema.json` with a bare-descent-path `$id` under `computing/…`, type via the `realize` codegen step; (3) actions with `domainSchema`/`codomainSchema` `$ref`ing carrier `$id`s; (4) four faces via `induceBins`; (5) EAVT-witnessed; (6) ground the core as `Kl(!)
`/`Eff`, with `compute` = run a program and observe its `FOUR` settled state.
End green (`pnpm --filter @emsenn/computing check/build/test`) with a compute-in/compute-out demo: a program (computable function) applied, its result settled to one of `FOUR`.

## Provenance

**Corpus-cited (deep read this session):** the resolved theory — "the theory of computing is CGS; `Eff ≃ Kl(!_CGS)`; Church–Turing & Rice as internal theorems; `FOUR` = image of `Ω_Eff` under `¬¬`" — is `…/computing/questions/what-is-the-theory-of-computing.md`.
The structures: `code/structures/cgs.md` (the \*-autonomous category), `eff.md` (the effective topos, `ex(Asm(K₁))`, internal theorems), `dial-eff.md` (the Dialectica ambient, `Eff ≃ Kl(!_Dial(Eff))`, the concurrent interaction), `computing-structures.md` (the index `pca → k1 → eff → four → opca → dial-eff → cgs`).
The subtheory lattice (typed MLL…LL × untyped Medvedev filters; complexity/probabilistic excluded) is `questions/what-are-the-subtheories-of-computing.md`.
Claims: `eff-is-minimum-level.md`, `k1-is-initial-turing-complete-pca.md`, `f-dial-eff-to-cgs-exists.md`.

**Family-grounded:** playing = CGS / the \*-autonomous cut / the home of `!
` ([playing note](2026-06-21-playing-as-star-autonomous-interaction.md)); the relating-only family discipline and schema-first/realize/induceBins/EAVT idiom (the knowing & playing reworks).
The existing `lib/computing` (`cartesianizing` = `Kl(!)
`, `categorifying` = CGS).

**Synthesis (checkable, flagged):** the assignment "computing owns `type`/`program`/`Eff`/ `FOUR` (the Kleisli/Cartesian level) while playing owns CGS/`!
`/the fragments (the \*-autonomous level)," and the module-by-module rework mapping, are my reading of those settled pieces — to verify as the rework proceeds.

## Addendum (2026-06-21): the surface is over ENRICHED AGENTS, not bare data

A correction to the first build, which carried the Kleisli/Cartesian level as **bare data** — `program` as a JS realizer over numbers, `type` as a K₁ assembly of `{value, realizer: number}`, `compute(program, 4)`.
That is wrong for the same reason a bare-string communicating surface would be: the package must operate on its enriched **carrier**, the way communicating is `meme → meme` (admitting a full `Meme`, refusing bare input). computing's carrier is the **agent** (`animating/becoming/doing/working/ governing/agent`) — which is exactly why computing is multi-agent (animating supplies the full agent, as relating/communicating supply the meme).
The bare model was deleted.

The realizability theory is preserved, read through agents: K₁ is "the PCA of
computation," and an **agent IS a realizer** (its perceive→act loop is the index). The
corpus's "computation = settling" then becomes literal — an agent is a settled
computation — so `compute(agent) → computation` *reads* the agent's truth as FOUR (⊤ if
its goal charge is a held contradiction; ⊥ if it never settled, i.e. its governing is not
glued — the halting/Rice boundary made structural; t if the settled individual carries
its goal; f if it settled without it). The computation **embeds** the agent (`$ref`), no
bare data. The Kleisli structure is over agents: `compose` (agent → agent) relays two
agents into one composite via animating; `relay` (agent → computation) settles a
**society** of agents to its collective ≤_k knowledge (knowing's comonad over the agents —
members disagreeing aggregate to ⊤). The faculty edges are real and carrier-level:
`bang` (agent → playing `!A`), `transport` (agent → communicating admission),
`joinKnowledge` (the ≤_k aggregate via knowing's `joinK`). Every action declares the
agent carrier `$id` as domain and `computing/computation` (or the agent / `game.logic.prop`)
as codomain. Green: `check && build && test` (8 tests).
</content>
