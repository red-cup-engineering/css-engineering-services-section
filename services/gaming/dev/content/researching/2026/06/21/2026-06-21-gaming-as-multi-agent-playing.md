---
title: "gaming = multi-agent playing: full CGS (concurrent games with symmetry), playing lifted along the agent-sheaf"
description: "The principled domain derivation of @emsenn/gaming as the scale-2 instance of playing on the agency spiral. playing is single-agent ludics (the 2-party dialogical fragment); gaming is the concurrent multi-player ambient — CGS proper (Rideau–Winskel / Castellan–Clairambault–Winskel). The lift is exact: playing's Design (a 2-party strategy over loci) → gaming's concurrent strategy σ:S→A^⊥‖B over a prime-event-structure-WITH-SYMMETRY, where the symmetry groupoid Ẽ = FSym(𝔸) = agent-permutation / nominal name-passing = the sheaf of agents; playing's cut → gaming's strategy composition = parallel composition ‖ + hiding ('federation is parallel composition'). The embeddings (Hyland–Ong, nominal/AGMOS, Caires–Pfenning, Dialectica) and the social play-anthropology (Caillois/flow/deep-play/magic-circle) are gaming's, because they are theories of concurrent/social play. Grounded in content/_archive CGS docs (cgs.md, federation-is-parallel-composition.md) and the agency-spiral / playing notes."
date: 2026-06-21
status: design
---

# gaming = multi-agent playing (full CGS)

## The thesis

`@emsenn/gaming` is the **scale-2 instance of `playing`** on the agency spiral ([spiral note](2026-06-21-agency-spiral-self-similar-faculty-quartet.md)): **playing lifted along a sheaf of agents**.
`playing` is **single-agent ludics** — Girard's 2-party dialogical fragment (one agent's `Design` against the outside, the cut as a dispute).
`gaming` is the **concurrent, multi-player ambient**: **CGS proper** (concurrent games with symmetry, Rideau–Winskel 2011 / Castellan–Clairambault–Winskel 2014/2017), *"the `*`-autonomous category that is the unified ambient for the typed theory of computing"* (`content/_archive/…/computing/code/structures/cgs.md`).

This is not a rename and not a rewire of the old `gaming`: it is the **rederivation of gaming's domain from the spiral lift** — gaming is *derived* as "playing among many agents," exactly as `computing` is derived as "knowing among many" ([computing note](2026-06-21-computing-as-comonad-over-agent-sheaf.md)) and `socializing` as "communicating among many" ([socializing note](2026-06-21-socializing-multi-agent-communicating.md)).

```
playing  : one agent vs the outside     — ludics: Design ⊗ Design^⊥ → Interaction (the dispute)
gaming   : many agents playing concurrently — CGS: concurrent strategies σ:S→A^⊥‖B, composed by ‖ + hiding
```

## The lift, made exact (carrier and cut)

The CGS definition (`cgs.md`) IS the playing→gaming lift, term for term:

**Objects lift: Design → arena = prime event structure WITH SYMMETRY** `(E,≤,#,Ẽ)`. playing's `Design` is a charge-valuation over a *locus tree* (a 2-party strategy); gaming's object is an **arena** — a polarized prime event structure whose extra datum is the **symmetry groupoid `Ẽ`**: *"a groupoid of bijections on E … encoding which event permutations count as the same strategy."* The load-bearing identification (`federation-is-parallel-composition.md`):

> the symmetry groupoid is `FSym(𝔸)` (finite permutations of a countably-infinite name set); entity-mobility across federated polities — *names that act across participants* — is nominal-set name-passing (Gabbay–Pitts; AGMOS 2004 full abstraction for the ν-calculus).

So **`Ẽ` = the agent/name-permutation symmetry = which agents are interchangeable = the sheaf of agents** the spiral names. *Symmetry is the multi-agent structure.* This is why CGS is "with symmetry" and ludics (playing) is not: a 2-party dispute has no agents to permute; a concurrent multi-player game does. **The `nominalizing` layer (permutation, equivariance, FSym(𝔸)) that `playing` deliberately left un-surfaced is gaming's core** — it is the agent-sheaf made concrete.

**Morphisms lift: the dispute → concurrent strategy + composition by `‖` + hiding.** A CGS morphism `σ: A → B` is a concurrent strategy `σ: S → A^⊥‖B` (receptive, innocent, symmetry-invariant).
The **tensor `‖` is parallel composition** — *"A‖B is the arena where Player makes moves in both A and B concurrently"* — i.e. **concurrent multi-player**.
Strategy **composition `σ;τ`** (interaction on the shared arena + **hiding**) is the categorical compose; the **copycat** is the identity.
And `federation-is-parallel-composition.md` makes the social reading literal: **federation between polities = `‖`**; the cellwise `≤_k`-join merge is `‖`'s action at the fiber level; cross-polity entity mobility = `FSym(𝔸)` name-passing.
So gaming's cut is playing's cut *lifted from one opponent to many concurrent players*, and it is the same **HO composition (parallel-composition + hiding)** that — at the 2-party scale — playing's real cut needs (see the shared-engine note below).

**The `*`-autonomous structure lifts:** `A^⊥` (swap P/O) — the dual already in playing; `A‖B` (concurrent product); `A⊸B = A^⊥‖B`. playing realizes these on 2-party designs; gaming realizes them on **concurrent strategies over arenas-with-symmetry**.

## What is gaming's, not playing's

Three bodies of theory belong at the multi-agent scale and so are **gaming's domain**, not playing's:

1. **The symmetry / nominal layer** (`nominalizing/`: permutations, equivariance, `FSym(𝔸)`, arena symmetry groupoids) — the agent-sheaf; name-passing/mobility among players. *Gaming's defining datum.*
2. **The four embeddings as concurrency paradigms** (`cgs.md`): **Hyland–Ong** (sequential strategies, trivial symmetry), **nominal/AGMOS** (FSym(𝔸) — name mobility), **Caires–Pfenning** (session-typed π-calculus — concurrent processes), **Dialectica/Eff** (`F: Dial(Eff)→CGS`).
  These are theories of *concurrent computation*; they embed into CGS as full sub-`*`-autonomous categories.
  (playing names them; gaming *is* their ambient.)
3. **The play-anthropology** — Caillois **agon/alea/mimicry/ilinx**, Csikszentmihalyi **flow**, Geertz **deep play**, Huizinga/Caillois **magic circle / paidia–ludus**, Sutton-Smith **rhetorics**, the **cultural-embedding** Φ functor — is irreducibly **social/multi-player** (a *game* is played by many, in a magic circle, with regimes of competition/chance/simulation/vertigo).
  These read a *concurrent* game.
  (They are mis-housed in `playing` today as ported gaming legs; they move to gaming.)

And the **running multiplayer game** (arena + many players' designs + concurrent history) is gaming's **operational face**.

## The carrier gaming owns

By the family pattern (communicating reuses the meme; knowing owns `C(Meme)`; playing owns the `Design`; computing owns the predicated-computer/system) — **gaming owns the arena-with-symmetry and the concurrent strategy over it**, with the `‖` product as the multi-agent composition:

- **reused base carriers:** playing's `Design` (each player's 2-party strategy = the ludics fragment), `animating`'s `agent` (the players), and the **agent-sheaf / social base** shared with `computing`/`socializing`.
- **owned carrier — the arena (game) with symmetry:** a polarized prime event structure `(E,≤,#,Ẽ)`; `$id` `gaming/arena` (the symmetry groupoid is the agent structure).
- **owned carrier — the concurrent strategy:** `σ: S → A^⊥‖B`, receptive/innocent/ symmetry-invariant; `$id` `gaming/strategy`.
- **owned carrier — the parallel product / composition:** `gaming/parallel` (`‖`) and the composition `σ;τ` (interaction + hiding); the multi-agent cut.
- **readings (lenses on a game):** the regime/flow/deep-play/lusory/rhetorics/cultural carriers — social readings, lifted from playing's legs.

Gaming's characteristic morphism is **`play`/`compose`: concurrent strategies interact over `‖` and compose by hiding** — the n-party generalization of playing's cut.

## Relationship to the siblings (the spiral, made precise)

- **gaming = playing lifted; computing = knowing lifted** — *siblings related by `!
  `*: *"a concurrent game (gaming) made repeatable (`!
  `) is a computer (computing)"*; the corpus `Eff ≃ Kl(!_CGS)` ([computing note](2026-06-21-computing-as-comonad-over-agent-sheaf.md)).
  The old "computing is downstream of gaming" edge becomes the **`!
  ` relation**, not a package dependency.
- **organizing = animating lifted** (the society's agency = governance/operations ≈ `managing-operations`); **socializing = communicating lifted** (the inter-subjective meme-sheaf). gaming sits beside these at scale 2.
- **The same self-similar quartet, one scale up.** Scale 1 is the diagonal (one agent's cut on its own design); gaming is the off-diagonal — the cut *among distinct agents* over the social base.
  Carrier-node mounting threads the proof tree up the spiral.

## The shared upstream engine (links to the playing HO-cut rework)

playing's *real* cut and gaming's concurrent composition are **one engine at two scales**: **Hyland–Ong composition = interaction + hiding**, with the **copycat** as identity (Faggian–Hyland 2002: "cut on focused designs IS HO strategy composition"). - At the **2-party** scale this makes playing's behaviours a genuine *category* (composition = cut, identity = Fax) — the upstream rework now in flight in `playing`. - At the **n-party** scale it is gaming's `‖`+hiding strategy composition.
So gaming does not reinvent composition; it **lifts playing's HO composition along the symmetry groupoid** (concurrent, name-passing).
Build gaming's composition *on* the playing composition primitive once that lands.

## Build (family style — what the rework does)

Rederive `lib/gaming` exactly as `relating-experimental`/`communicating`/`knowing`/ `playing` were — **not a cutover, a rederivation from the lift**:

1. **relating-experimental-only** dependency (drop deprecated `@emsenn/relating`/ `@emsenn/gaming`/old `@emsenn/animating`); reuse `playing` (the ludics fragment) and `animating-experimental` (the agent), and derive the multi-agent structure from the **agent-sheaf lift** on relating — never hand-invent.
2. **Schema-first carriers** (`object.schema.json`, bare-descent `$id` under `gaming/…`): `gaming/arena` (event-structure-with-symmetry), `gaming/strategy` (concurrent strategy), `gaming/parallel` (`‖`/composition), `gaming/symmetry` (the FSym(𝔸) groupoid — the agent-sheaf), plus the social-reading carriers; types via the `realize` codegen pipeline.
3. **Actions** = playing's morphisms lifted along the symmetry groupoid: `arena`, `strategy`, `parallel`/`compose` (the `‖`+hiding cut), `dual`, `symmetry`/ `equivariant` (the nominal layer), `embed` (the four concurrency embeddings), and the social readings (`read-regime`/`flow`/`deep-play`/`rhetorics`/`embed-culture`); each with `domainSchema`/`codomainSchema` `$ref`, `inputFormat`/`outputFormat`.
4. **Four-faced** (CLI/MCP/OpenAPI/WebUX) via `induceBins`; **EAVT-witnessed** to gaming's own ledger; **mounted** at the social-base / agent-sheaf node (scale-2, above playing on the spiral).
5. Multi-wave (as knowing/playing were): wave 1 = the arena-with-symmetry + concurrent strategy + `‖`/composition + the symmetry/nominal layer (the categorical spine); wave 2 = the embeddings + the social play-anthropology; ending green (`pnpm --filter @emsenn/gaming check/build/test`) with a concurrent-game demo.

## Status (landed 2026-06-21 — the real rework, not a veneer)

The dependency-and-dedup spine is done and green (`pnpm --filter @emsenn/gaming-experimental verify`; 9 tests). gaming is now genuinely **playing-lifted, not a copy**:

- **playing exposes its single-agent ludics core as `@emsenn/playing/ludics`** (polarity, event-structure, loci/designs/chronicles, the **real HO cut + copycat Fax**, settling/ behaviours, the CLL proof layer) — built green; playing's own laws hold (34/34, incl.
  `cut(Fax,d) ≃ d` and associativity — behaviours are a genuine category).
- **gaming DELETED its duplicated foundation** — the whole ~23-file `ludicizing/` core plus the duplicated `polarity`/`event-structure` (87 → 63 `src/` files) — and imports it from `@emsenn/playing/ludics`. gaming owns only the multi-agent layer (arena-with-symmetry, concurrent strategizing, the `nominalizing`/FSym(𝔸) symmetry, placing, the social readings, the running game).
- **gaming's `compose` (σ;τ) is playing's REAL HO cut lifted** — `cut(f,g)` with the B-interface **hidden** — not the `interactionReport` union-join shadow.
  An anti-fake test proves the composite omits each design's private far-side loci and `compose ≠ parallel` (the shadow keeps the union); the gate fails against the shadow and passes only against the real cut.
- `parallel` remains the genuine `‖` union-of-supports interaction report; the FSym(𝔸) nominal layer (`symmetry`/`equivariant`) is the agent-sheaf surface.

**Wave 2 landed (2026-06-21) — the genuine lift + full schema-first surface, green (11 tests):** - **The concurrent strategy IS playing's `Design` lifted along the symmetry groupoid**, realized not mirrored: `strategizing/strategy.mts` imports `Design`/`designChronicles` from `@emsenn/playing/ludics`; symmetry-invariance is now closure under the **real FSym(𝔸) `applyPermutation`** groupoid (`closeUnderSymmetry` — a concurrent strategy is a fixed point of it), and `strategyFromDesign`/`designsOfStrategy` make the lift + its inverse explicit.
Tested with teeth: a play-set not closed under a non-trivial FSym(𝔸) permutation is **rejected**; the trivial-symmetry strategy of a Design's chronicles **round-trips** to that Design (`playing ↪ gaming` as the trivial-symmetry inclusion).
A `lift` verb exposes it. - **The whole surface is schema-first** — all 21 actions (incl. the formerly-schemaless legacy legs: character/sides, the running game, analyze, and the social play-anthropology read-regime/flow/deep-play/rhetorics/lusory/embed-culture) carry `domainSchema`/ `codomainSchema` `$ref`s to bare `gaming/…` carrier `$id`s; a test asserts every action declares a codomain.

**Re-division landed (2026-06-21) — ownership consolidated, both green:** - **gaming `encoding/` deduped** — the 6 duplicate ludics codecs (charge/polarity/locus/design/ interaction/behaviour) deleted and imported from `@emsenn/playing/encoding`; gaming keeps only its CGS codecs (arena/event-structure/strategy/play). gaming 11/11 green. - **playing stripped to pure single-agent ludics** — the 13 gaming-owned legs (character/sides, the running multiplayer game game/play/settle/analyze, the social play-anthropology read-strategy/regime/flow/deep-play/rhetorics/lusory/embed-culture) and their CGS/social `src` (arena, nominalizing, placing, reading, running, strategizing's CGS parts) + 11 carriers REMOVED from playing — they live exclusively in gaming now. playing = pure ludics + *-autonomous + logic (45 verbs, 25 carriers), 33/33 green. **No capability lost** (verified: the moved surface is green in gaming; `playing ↪ gaming` round-trip still holds).

**Wave 3 landed (2026-06-21) — the embeddings realized as gaming object-maps, green (17 tests):** the four CGS embeddings are now REAL arena object-maps in `gaming/embedding.mts`, not catalog: - **Dialectica** `dialecticaObjectToArena` per `f-dial-to-cgs.md` (P-events=U, O-events=X, trivial causality, intra-polarity all-pairs conflict, trivial symmetry), reusing playing's `DialecticaObject`/`dualDialectica`/`tensorDialectica` algebra; `*`-autonomous preservation is the anti-fake gate — **`F(A^⊥)=(FA)^⊥`** (the dual swaps P/O events) is a passing test. - **AGMOS nominal** `nominalArena` — an arena whose symmetry groupoid carries a genuine FSym(𝔸) permutation (non-trivial); a strategy closed under it is judged equivariant. - **Caires–Pfenning** `cairesPfenningArena` = `propositionOfSession` (the CGS_CLL reading). - **Hyland–Ong** stays named-only (its PCF-type arena-former is out of scope / not a corpus primitive — honest, not stubbed).
Verbs `embed-dialectica`/`embed-nominal`/`embed-session` (→ `gaming/arena` / `gaming/embedding-image`).

**Wave 4 landed (2026-06-21) — the running game is genuinely multi-agent, green (21 tests):** `running/game.mts`'s `settle`/`runInteraction` only ever interacted the *first two* enrolled designs (the binary shadow).
Now a **joint N-player match** (`running/match.mts` `matchAll`/ `matchGame`) is the **`‖`-combine = `superpose` (the iterated knowledge-join `⊔_k`) of ALL players' designs** over the shared arena, with the joint convergence read off the Daimon `⊤` loci — grounded in `federation-is-parallel-composition` ("the cellwise `∨_k` then closure is `‖`'s fiber action").
`settle` now folds over the whole roster (`SettleEntry.designIds` = every participant); a `match` verb (→ `gaming/match`) exposes it.
Anti-fake gate (passing): a 3-design roster converges via the 3rd and the joint form carries a locus **only the 3rd player commits** — impossible for the binary-first-two shadow; a non-dual roster does not converge.

**Still ahead (named, not faked):** the Hyland–Ong PCF-type arena-former (a real recursive type→arena interpreter — deferred: not a corpus primitive, would be importing external game-semantics theory); and the gaming→canonical-name cutover (downstream of animating).

## Open questions

- **Where the agent-sheaf / social base carrier lives** — shared with `computing` and `socializing` (the spiral note's open question).
  Likely a `relating-experimental` primitive (`agent-sheaf`) all three scale-2 faculties lift along.
- **playing as the ludics fragment of gaming**: does gaming *import* playing's `Design` as its 2-party fragment (one-player arena), making `playing ↪ gaming` the initial/trivial-symmetry inclusion (mirroring `communicating ↪ socializing`)?
  Likely yes — trivial symmetry groupoid = the single-agent diagonal.
- **Symmetry as the agent-sheaf**: confirm `Ẽ = FSym(𝔸)` is exactly "the society of interchangeable agents" and not merely a technical quotient — the `federation-is-parallel-composition` reading says it is.

## Provenance

Corpus-cited (`content/_archive`): `…/computing/code/structures/cgs.md` (CGS objects = prime event structures with symmetry; morphisms = concurrent strategies on `A^⊥‖B`; `‖` = parallel composition; the four embeddings; `Eff ≃ Kl(!_CGS)`); `…/predicated-computer/_archive/pc-prose/learning/claims/federation-is-parallel-composition.md` (federation = `‖`; symmetry groupoid = `FSym(𝔸)` = nominal name-passing = entity mobility among agents/polities).
Family-grounded: the [agency-spiral note](2026-06-21-agency-spiral-self-similar-faculty-quartet.md) (the lift = faculty along the agent-sheaf), the [playing note](2026-06-21-playing-as-star-autonomous-interaction.md) (the ludics fragment + the HO-cut engine), the [computing note](2026-06-21-computing-as-comonad-over-agent-sheaf.md) (the sibling lift, `!
`-related).
The identification "gaming = full CGS = playing lifted along the symmetry groupoid as the agent-sheaf; symmetry IS the multi-agent structure" is my synthesis of those settled pieces — a checkable claim to verify as the rework proceeds, per the spiral note's naming/open questions.
