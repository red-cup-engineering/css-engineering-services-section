---
title: "playing: the *-autonomous interaction faculty (the outside; the cut; the spiral's hinge)"
description: "The principled derivation of @emsenn/playing (renamed from gaming). Where communicating is the meme MONOID (meaning, ≤_t, across) and knowing is the meme COMONAD (knowledge, ≤_k, inside), playing is the meme's THIRD bilattice structure — the *-autonomous DUALITY and the CUT (outside, via the opponent). It is the only one of the three faculties that is intrinsically TWO-PARTY: its characteristic morphism is binary interaction `Design ⊗ Design^⊥ → Interaction` (Girard's cut / normalization = the pointwise knowledge-join of two dual designs), where a Design is playing's own richer carrier — a partial charge-valuation over a locus tree of memes (P/O/Daimon/none ↦ potential/active/stable/absurd), exactly as C(Meme) is knowing's. The convergence verdict (orthogonality: did interaction reach the Daimon ⊤?) and its bi-orthogonal closure (behaviour) are the codomain. The cut IS the corpus's spiral hinge: it settles a turn to the ⊤ fixed point (the glued-sheaf individual = the game), which re-seeds becoming — closing animating's spiral. And the corpus's punchline: computing = Kleisli of `!` on this CGS, so playing is the home of the exponential and the cut, the faculty computing is carved from. Grounded in content/_archive ludics+play corpus (designs, interaction, orthogonality, behaviour; play/player/magic-circle; the becoming→dancing→music→game→becoming spiral) and the live gaming algebra."
date: 2026-06-21
status: design
---

# playing = the *-autonomous interaction faculty

## The thesis

`@emsenn/playing` (renamed from `gaming`) is the **outside** boundary faculty: the one that acts **via the world / the opponent**.
It is the third of relating's three boundary siblings, and it is distinguished from the other two by being intrinsically **two-party**.

```
communicating : Meme → Meme        the MONOID   on the meme (meaning, ≤_t)   — across
knowing       : Meme → Meme        the COMONAD  on the meme (knowledge, ≤_k) — inside
playing       : Design ⊗ Design^⊥ → Interaction   the *-AUTONOMOUS DUALITY + the CUT — outside
```

communicating moves one meme's *meaning* (a one-party endomorphism; a sub-monoid of End(Meme)). knowing settles one meme's *knowledge* (a one-party comonad; it owns the richer carrier `C(Meme)` = the held knowledge-state). **playing is neither endomorphic nor one-party**: you play *against* an opponent.
Its characteristic morphism is the **binary cut** — two **dual** strategies normalize to a settled interaction.
That binarity is exactly what "outside / via the opponent" means: the other two faculties act on your own carrier; playing acts through a second party.

This is the open question the package was handed — *what are playing's domain and codomain?* — and it does **not** resolve the way communicating's and knowing's did ("same meme carrier, different axis").
It resolves one structural level out: playing is the **`*`-autonomous (linear, two-sided) structure** on the meme's bilattice, where communicating is the monoidal structure and knowing the comonadic one.
Its domain is a **pair of dual designs**; its codomain is their **interaction** (the convergence verdict, and on closure a behaviour).

## The carrier playing owns: the Design (a strategy = a polarized meme-section over loci)

The corpus's ludics correspondence theorem (`…/concurrent-game-system/library/game/ library/ludics`, realized in `lib/gaming/src/.../ludicizing/design.mts`):

> "A Girard design corresponds to a partial valuation `v_𝔇 : E×E ⇢ L^⋈`."

A **design** (Girard's dialogical object = a strategy) **is a partial charge valuation over the locus tree**, with the four locus polarity-states in **bijection** with the four meme charge values:

| locus act | charge value | bilattice |
|---|---|---|
| Proponent (positive) | `potential` | t = (1,0) |
| Opponent (negative) | `active` | f = (0,1) |
| Daimon `†` (give up / converge) | `stable` | ⊤ = (1,1), designated |
| no action (the default region) | `absurd` | ⊥ = (0,0) |

So a design is **not a new datatype** — it is a configuration of the meme apex: a finite charge labelling of a tree of loci (sub-memes).
This is precisely the playing-analogue of knowing's `C(Meme)`: where knowing's own carrier is a *section of memes over a base* read on ≤_k (memory/the held knowledge), playing's own carrier is a *section of memes over a locus tree* read on **polarity** (a strategy / the committed moves).
Both build their richer grain over the reused meme; neither invents a rival to it.

- **Reused base carrier (the move grain):** the meme, `relating/articulating/predicating/positing/meme` — one move's content, one charged predication.
- **Owned carrier (the strategy grain):** `playing/design` — a polarized charge-valuation over loci.
  Its support is the non-⊥ region (where the player has actually committed).

The axis playing works is the bilattice's **involution / duality** — the gauge negation that *is* Player/Opponent (`polarity.mts`: "Player/Opponent as a Belnap charge class; `dual` is the gauge negation"). communicating works ≤_t; knowing works ≤_k; **playing works the negation `^⊥`** — the linear/`*`-autonomous dimension neither of the others touches.
`A^⊥` swaps P/O; that swap is what makes interaction *dual* and play *two-sided*.

## The characteristic morphism: interaction = the cut

The central morphism (`interaction.mts`, ported to `gaming-experimental`'s `interact` leg):

```
interact : Design ⊗ Design^⊥ → Interaction
```

`interact(d1, d2)` is the **pointwise knowledge-join `⊔_k` of two dual designs** — the interaction normal form, i.e. **Girard's cut / Terui's reduction**.
It is binary by nature: a strategy and a counter-strategy.
Its codomain, `playing/interaction`, is the **convergence verdict**:

- **orthogonality** `𝔇 ⊥ 𝔈` iff the interaction **converges** — it *meets* and reaches a **Daimon collision `⊤`** (`orthogonality.mts`: witnesses `no-meeting` / `no-daimon`).
- **behaviour** `B = B^⊥⊥` — the bi-orthogonal Galois closure; the `*`-autonomous / MALL connectives (`⊗ ⅋ & ⊕ ⊸`, and the exponentials `! ?
  `) are all configurations of this one closure (`internal-completeness.mts`, `locativity.mts`).

So the codomain of playing, fully closed, is a **behaviour** (a type); the immediate codomain of a single interaction is the **convergence/orthogonality verdict**.
The cut is the engine; orthogonality is its truth-value; behaviour is its type.

## Why this is "outside" and why it closes the spiral

**Outside.** The corpus's `play`/`player`/`magic-circle` vocabulary: a *player* is a participant whose *choices affect the game state* — "the game's outcome depends, at least partly, on their choices"; the *magic circle* is "the boundary that separates play from ordinary life," inside which the game's rules override ordinary consequences.
Play is **voluntary, intrinsically-motivated activity** that *becomes a game when it acquires structure (rules, objectives, constraints)*.
All three mark playing as the faculty at the **agent's exterior membrane**: it engages a second party (opponent / world) across a bounded arena.
The cut — two designs meeting at shared loci — is the formal shape of that engagement.

**The spiral's hinge.** The agency corpus (`_archive/animating/…/dancing/…/playing/…/game.md`) writes playing as **the live act, the verb, the hinge** "that carries one form of the spiral into the next" — *not a face of its own*.
A **game** is "play **glued to its fixed point** — a self bounded by rules and a circle": precisely the **individual = a glued sheaf** (H¹=0, the ⊤ fixed point) that animating's descent culminates in.
Caillois's **paidia → ludus** (free play hardening into rule-structured play) is the settling; the settled game **re-seeds becoming**:

> becoming → dancing → music → game → becoming → … "That return is what makes the structure a **spiral**, not a line."

The cut realizes this hinge exactly: **interaction settles a turn to the Daimon `⊤` (the glued-sheaf individual = the game), which carries residual paidia (pre-individual charge) and re-seeds the next becoming.** So playing's animating-facing edge closes animating's spiral, while its relating-facing structure is the `*`-autonomous cut.
These are one phenomenon at two readings: convergence-to-⊤ **is** the gluing **is** the turn's close.

## The trio, and why computing comes after

The three siblings are the three structures the meme's bilattice carries, and the corpus's theory-of-computing result tells us what they generate:

- communicating = the **monoid** (`!
  `-free meaning iteration; ≤_t) — across;
- knowing = the **comonad** (knowledge context; ≤_k) — inside;
- playing = the **`*`-autonomous duality + cut** (interaction; `^⊥`) — outside, and the home of the **exponential `!
  `**.

The corpus proves **Eff ≃ Kl(!_CGS)** — the effective topos is the Kleisli sub-CCC of the `!
` comonad on CGS (the `*`-autonomous theory of computing).
So **computing is a fragment of playing**: the spine `relating → animating → playing → computing` is forced, not stylistic. playing is where the cut and the `!
` live; computing is `!
` made repeatable.
(Memory: [[project-gaming-cgs-theory]].)

## The surface (capabilities to preserve, schema-first; CLAUDE.md normalization)

`gaming-experimental` already implements a deep, green CGS + ludics + play-anthropology surface (14 action legs).
Normalization must **preserve every capability** — port them onto the schema-first line, do not drop any.
The carriers (each an `object.schema.json` with a **bare-descent-path `$id`** under `playing/…`, type via the `realize` codegen build step) and the morphisms over them:

| playing carrier (`$id`) | morphism(s) | role | grounding |
|---|---|---|---|
| `playing/design` | `design` (build), `dualize` (`^⊥`) | the OWN carrier: a strategy = polarized charge-valuation over loci | `ludicizing/design.mts`; polarity = gauge negation |
| `playing/interaction` | **`interact`** | the **cut**: `Design ⊗ Design^⊥ → Interaction` (knowledge-join normal form, convergence/orthogonality) | `interaction.mts`, `orthogonality.mts` |
| `playing/character` | `character`, `sides` | the participant: an animating `Handedness` lifted to P/O polarity (domain = animating carrier) | `character.mts`; embodied-handedness-is-P/O-duality |
| `playing/game` | `game`, `play`, `settle` | the running game: arena + designs + history; `settle` = convergence to ⊤ (the glued individual) | `running/`; the game = glued-sheaf individual |
| `playing/strategy-report` | `read-strategy` | CGS well-formedness (receptivity / innocence / symmetry-invariance) | `strategizing/`, `strategy.mts` |
| `playing/regime` | `read-regime` | Caillois **agon / alea / mimicry / ilinx** | `reading/regime.mts` |
| `playing/flow` | `read-flow` | Csikszentmihalyi challenge–skill flow | `reading/flow.mts` |
| `playing/deep-play` | `read-deep-play` | Geertz: stakes exceeding instrumental value | `reading/deep-play.mts` |
| `playing/rhetorics` | `read-rhetorics` | Sutton-Smith constitutive ambiguity | `reading/rhetorics.mts` |
| `playing/lusory` | `read-lusory` | Suits' lusory attitude | `reading/lusory-attitude.mts` |
| `playing/cultural-embedding` | `embed-culture` | the Φ functor (is a culture ludically structured?) | `reading/cultural-embedding.mts` |
| `playing/game-analysis` | `analyze` | the operationalized ludic theory over an arena | `running/analysis.mts` |

The "reading" carriers (regime / flow / deep-play / rhetorics / lusory / cultural- embedding) are playing's **lenses on a game**, exactly as communicating's sign/message/act are lenses on a meme and knowing's knowledge-standing/state are readings of the meme — not rival carriers.
The two load-bearing additions over the old gaming surface are making the **`Design` carrier first-class** (with `design`/`dualize` producing morphisms, so the cut has a typed domain and the carrier can mount at its node) and **naming `interact` as the cut** with `playing/interaction` as its schema'd codomain.

## Implementation consequence (rederive exactly like communicating / knowing)

1. **No new core carrier for the move grain.** Reuse the meme (`relating/articulating/predicating/positing/meme`) for move content; reuse animating's `Handedness` as `character`'s domain.
2. **Own carriers, schema-first.** Author each `playing/*` carrier as an `object.schema.json` with a **bare-descent-path `$id`** ([decision #1](2026-06-21-decision-schema-id-scheme.md)); generate `<base>.schema.types.mts` via the **`realize` codegen build step** (port relating-experimental's `codegen/realize-schemas.mts` + `tsconfig.codegen.json`, importing `generateDeclaration` from `@emsenn/relating-experimental/typing`).
3. **Schema the morphisms.** Each `action()` carries `inputFormat`/`outputFormat` wire codecs and `domainSchema`/`codomainSchema` `$ref`ing the carrier `$id`s — the producer→consumer edge.
  `interact`'s domain is `playing/design` (×2 dual); codomain `playing/interaction`.
  The morphism itself is a schema'd carrier (relating's `action`).
4. **Port all 14 capabilities; drop none** (CLAUDE.md Normalization).
  Add `design` and `dualize` to make the Design grain first-class.
5. **Four faces at every node** (CLI `play` / MCP / OpenAPI / WebUX) via `induceBins`
   + the relating dispatcher; mount at carrier nodes per [carrier-node mounting](2026-06-21-package-composition-by-carrier-node-mounting.md): `character` mounts at animating's `Handedness` node; `interact` at the `playing/design` node (the cut at the design node); the readings at the `playing/game` node.
6. **Witness every call as EAVT** into playing's own ledger (`packageName: "@emsenn/playing"`).
7. **Demo: playing-in / playing-out.** A meme/design enters; two dual designs are `interact`ed; the cut converges to a Daimon `⊤` (orthogonality witnessed) — the turn settles to the glued game — and the interaction carrier is emitted, one settled `*`-autonomous step witnessed.
  Equivalently the gaming `game → play → settle` path, re-presented schema-first.

## The full *-autonomous surface (the best theory, beyond the first pass)

The first pass exposed the cut and the play-readings.
But playing's domain — the `*`-autonomous category — has a whole **algebra → topology → logic** spine that the gaming body already implements (tested, pure) and that the best theory must surface schema-first.
Stating it as the category it is:

**Playing is the category of behaviours.** Objects are **behaviours** `B = B^⊥⊥` (bi-orthogonally-closed sets of designs over a universe).
A morphism `B ⊸ C` is a design in the behaviour `B^⊥ ⅋ C`. **Composition is the cut** (`computational-ludics`: `cut(d,e)` = `interact` gated by convergence; the interaction normal form **IS** cut-elimination, Girard 2001/Terui 2011 Hauptsatz).
The **identity** on `B` is **Fax** — the η-expanded copycat.
The category is `*`-autonomous: it carries the full MALL connectives and the exponentials, all as configurations of the one bi-orthogonal Galois closure.

The complete surface to expose (each a schema-first carrier + morphism over the existing pure functions), in three layers:

**Topology (the `*`-autonomous structure) —** `ludicizing/settling/`:
| carrier (`$id`) | morphism(s) | what it is |
|---|---|---|
| `playing/orthogonality` | `orthogonal` | `D ⊥ E` iff the cut converges to a Daimon (`orthogonality.mts` `convergenceJudgment`) |
| `playing/behaviour` | `behave` (`B^⊥⊥`), `orthogonal-of` (`B^⊥`) | the bi-orthogonal Galois closure; the **object** (`behaviour.mts`) |
| `playing/incarnation` | `incarnate` | Girard §11 material core `|B|` — strip ballast loci no counter-design visits (`incarnation.mts`) |
| (behaviour) | `tensor` `par` `with` `plus` `lollipop` `negate-behaviour` | the **MALL connectives** on behaviours (`internal-completeness.mts`) |
| (behaviour) | `of-course` (`!`) `why-not` (`?`) | the **exponentials** — `!B` at a finite copy-stage = closure of superposed disjoint-delocated copies (`locativity.mts`); **this is where the `!` of `Eff ≃ Kl(!_CGS)` lives** |
| `playing/normalization` | `normalize` `cut` `cut-elimination` | computational ludics: the cut as explicit reduction + the Hauptsatz (`computational-ludics.mts`) |
| `playing/identity` | **`fax`** (NEW) | the η-expanded **copycat identity** at a behaviour — the unit that makes behaviours a genuine category (`cut(fax B, d) ≃ d`), built from `delocation`. **Gap #1, now filled.** |

**Logic (the typed proof layer) —** `ludicizing/proving/`:
| carrier (`$id`) | morphism(s) | what it is |
|---|---|---|
| `playing/proposition` | `propose`, `dual-prop` (`(-)^⊥`) | a CLL proposition tree; linear De Morgan negation (`proposition.mts`) |
| `playing/fragment` | `classify-fragment`, `in-fragment` | the subtheory lattice `MLL ⊂ MALL ⊂ {ILL,CLL} ⊂ LL` as an explicit poset (`fragment.mts`) |
| `playing/focusing` | `focus`, **`shift`** (NEW: `↑`/`↓`) | Andreoli positive/negative = synchronous/asynchronous; the **shifts** with `(↑P)^⊥ = ↓(P^⊥)` and the design-level delay. **Gap #2, now filled.** |
| `playing/session` | `session`, `dual-session`, `session-compat` | Caires–Pfenning session-types-as-propositions (`session.mts`) |
| `playing/embedding` | `embed` | the **four full sub-`*`-autonomous embeddings** into CGS (HylandOng, Dialectica, Nominal/AGMOS, Caires–Pfenning) — the theory-of-computing claim made concrete (`embeddings.mts`) |

### The two gaps, derived (Gap #1: Fax; Gap #2: shifts)

These are the only pieces the corpus theory names that the body lacks; filling them is the genuine advance from "ported gaming" to "the best theory of playing."

- **Fax / copycat (the identity).** Ludics' identity on a behaviour `B` is the **η-expanded copycat** `Fax_B`: the design that mirrors Opponent's move at each interface locus back as Player's move at the **delocated** dual address — the cut with which composes to the identity (`cut(Fax_B, d) ≃ d` for `d ∈ B`).
  It is built from the **delocation** primitive (`delocate`/`superpose`, the locative action of the free monoid of loci on designs).
  Landing `fax(b)` + an honest `fax-identity` **judgment** (witness/obstruction of the law on `B`'s members) is what turns behaviours from a *closure operator* into a *category* — exactly the gaming ROADMAP's NEXT #1.
  (`character.mts` records the copycat peer's *shape* but owns no composition; fax owns it.)
- **Shifts `↑`/`↓` (the polarity-change operators).** Focusing classifies connectives positive/negative but the body has **no shift** to move between phases — the `↑`/`↓` that make focused proof search complete and, on the ludics side, mediate the positive/negative design boundary (the **delay**).
  Add `up`/`down` to the `Connective` type with the duality `(↑P)^⊥ = ↓(P^⊥)`, Andreoli polarity (`↑` negative, `↓` positive), and the design-level delay they induce — the gaming ROADMAP's NEXT #2.

The full surface — **landed green: 55 morphisms over 33 carriers** (`pnpm --filter @emsenn/playing verify`, 27 tests) — was built in three waves, each green: - **wave 1** — the core: the cut (`interact`), the running game, the `design`/`dualize` Design grain, the play-readings (16 actions). - **wave 2** — the topology `*`-autonomous core: orthogonality, behaviour (`close`/ `dual-behaviour`/`behave`), incarnation, the MALL connectives, the exponentials `!
`/`?
`, `normalize`/`cut-elimination`, **Fax** (the identity, see below) **+ shifts** `↑`/`↓` (the focusing completion) (20 actions). - **wave 3** — the logic layer + topology roundout: the **Proposition wire codec** and `propose`/`dual-prop`/`classify-fragment`/`in-fragment`/`focus`, `formula`/`proves` (the logic↔topology bridge), `session`/`dual-session`/`session-compat` (Caires– Pfenning), `embed` (the four embeddings); the **chronicle grain** (`chronicles`/ `coherent`), `internal-completeness`, `locativity`, `chronicle-convergence`, `design-leq`, and the locative primitives `delocate`/`superpose` (19 actions).

Each carrier is its own `object.schema.json` (bare-descent `$id`), each morphism an `action()` with `domainSchema`/`codomainSchema` `$ref`, four-faced and EAVT-witnessed, exactly as the first pass.

### What the substrate does and does not allow (the honest boundary)

Two findings from pushing the theory to its strongest faithful form:

1. **Fax (the categorical identity) is not a static charge valuation.** The reactive η-expanded copycat copies an unknown environment move across its interface; a static valuation cannot.
  And the corpus's **cut is deliberately the knowledge-join `⊔_k`** (`computational-ludics`: "cut is `interact` gated by convergence"), *not* Hyland–Ong chronicle-composition — so `cut(Fax_B, d) ≃ d` cannot hold at the valuation grain for *any* construction.
  The faithful response (not a fake): expose the **chronicle grain** the identity lives at (`chronicles`/`coherent` — designs as unions of plays), provide Fax's valuation-grain **convergence shadow** `faxResponder` (the canonical design in `B^⊥` accepting every member), and state the law + its grain in `fax-law`.
  The true reactive Fax would need a chronicle-level HO-composition engine — a *different* cut than the corpus chose — and is left as a precisely-bounded next step, not faked.
2. **The detailed Dialectica object-ops and the nominal/symmetry layer** (`nominalizing`: permutations, equivariance) and the **placing geometry** (magic-circle, configurations, ludus/paidia as standalone verbs) remain un-surfaced — they need arena/permutation inputs whose wire codecs are a further wave.
  `analyze` already exercises the geometry internally; `embed` names the Dialectica/AGMOS embeddings.

## Provenance

Corpus-grounded: the ludics design/interaction/orthogonality/behaviour layer (`_archive/animating/…/concurrent-game-system/library/game/library/ludics`, realized in `lib/gaming/src/.../ludicizing` + `.../topology`), the play vocabulary (`…/game/library/vocabulary/library/{play,player}`, `…/logic/ludics/{magic-circle, agon,alea,mimicry,ilinx,paidia,ludus,homo-ludens,flow,deep-play}`), and the spiral closure (`_archive/animating/…/dancing/…/playing/{playing.md,…/game/game.md}`: "playing is the hinge … the spiral closes; game re-seeds becoming").
The ChargeValue↔polarity bijection is `lib/gaming-experimental/src/.../ludicizing/design.mts`.
The architecture (relating → {communicating, knowing, playing, animating}; gaming → playing) is from [animating: agency descent](2026-06-21-animating-as-agency-descent.md) and the [refactor roadmap](2026-06-21-refactor-roadmap.md); the sibling pattern from [communicating](2026-06-21-communicating-as-end-meme-semiotics.md) and [knowing](2026-06-21-knowing-as-comonad-on-meme.md).
The framing "playing = the meme's third (`*`-autonomous) bilattice structure; its own carrier is the Design as knowing's is C(Meme); the cut IS the spiral hinge (convergence-to-⊤ = gluing = the turn's close)" is my synthesis of those settled pieces — a checkable claim, not a corpus citation.
