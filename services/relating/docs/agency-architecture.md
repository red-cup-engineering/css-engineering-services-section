# Agency Architecture

*Action → Capability → Faculty → Face → Edge → Bulk → Boundary.*

This is the load-bearing climb of the whole faculty family: how one primitive — the **action**, a carrier-to-carrier morphism — composes up into a holographic agent that can only be seen from its boundary.
Every rung is an object this code actually computes, not a metaphor laid over it.
The intent of this document is to state the technical construction and the mathematics it realizes in the same breath, because here they are the same thing.

A note on what is *not* the root.
It is tempting to start the climb at the **relation** — the settled predication — because it is the most vivid object in the package.
That is backwards.
The relation is an object a particular chain of actions *produces*; it is not upstream of capability.
Capability is induced over an action *family*, and the relation is one carrier that family happens to land in.
The generative primitive is the action.
So the climb is `action → capability`, with the relation sitting inside §1 as the canonical action chain's codomain, not ahead of §2.

---

## 0. The category floor: objects and morphisms

Two declarations span the whole system.
The object half lives in [`src/carriers`](../src/carriers); the morphism half lives in [`src/running/category.mts`](../src/running/category.mts).

A **carrier** is a category **object**.
It is authored once, as a single TypeBox schema value, and that one value supplies the static TypeScript type, the JSON Schema (with a bare package-rooted `$id`), and the Ajv validator:

```ts
export interface Carrier<Schema extends TSchema = TSchema> {
  readonly kind: "relating.carrier";
  readonly id: CarrierId;                                  // the composition address
  readonly schema: Schema & { readonly $id: CarrierId };
  readonly validate: (value: unknown) => value is Static<Schema>;
  readonly assert: (value: unknown, context?: string) => Static<Schema>;
  readonly errors: (value: unknown) => readonly string[];
}
```

The comment on `id` is exact and worth holding onto: *"This is the composition address."* A carrier's identity is not decoration; it is the equation that decides whether two morphisms compose.

An **action** is a category **morphism** (or, at the system's edge, a boundary — see §1).
It names a domain carrier, a codomain carrier, and a body:

```ts
export interface Action {
  readonly kind: "relating.action";
  readonly verb: string;            // the stable name every projected face uses
  readonly inputFormat: string;     // wire codec in
  readonly outputFormat: string;    // wire codec out
  readonly domain?: Carrier;        // consumed carrier; absent = raw admission boundary
  readonly codomain?: Carrier;      // produced carrier; absent = raw transport boundary
  readonly runTerm?: Tm;            // behavior AS DATA: a closed RMN/CHL term
  readonly run: (input, args) => MaybePromise<unknown>;   // executable projection
}
```

That is the floor: **carriers are objects, actions are arrows.** Everything above is built by composing arrows and reading the objects they land in.

---

## 1. Action — the primitive

An action is the smallest unit of capability.
Mathematically it is one arrow in the live category the registry holds.
Two things make it more than a labeled function.

### 1a. Composition is a schema-identity equation

Two actions compose exactly when the producer's codomain `$id` equals the consumer's domain `$id`.
This is not a structural type check; it is identity of the composition address ([`src/running/category.mts`](../src/running/category.mts)):

```ts
export function composes(producer: Action, consumer: Action): boolean {
  const produced = slotId(producer.codomain, producer.codomainSchema);
  const consumed = slotId(consumer.domain, consumer.domainSchema);
  return produced !== undefined && consumed !== undefined && produced === consumed;
}
```

When two arrows compose, their *bodies* compose too — and stay data, not hidden closures ([`src/running/action.mts`](../src/running/action.mts)):

```ts
runTerm: tm.app(consumer.runTerm, producer.runTerm)   // consumer ∘ producer
```

This is why a morphism should prefer `runTerm`: a Relation Model Notation (RMN) term is a total, serializable, inspectable CHL λ-body that dispatch, HTTP, MCP, tests, and Lean-backed conformance can all read.
Free TypeScript `run` bodies are reserved for genuine boundaries: admissions, codecs, transports, effects.

### 1b. Morphism vs boundary

Not every action is a true arrow.
An action with no `domain` is an **admission boundary** — the only place opaque data enters the system.
An action with no `codomain` is a **transport boundary**.
The kernel classifies these explicitly (`relation: "morphism" | "boundary"`): a morphism is a carrier-to-carrier arrow and should carry RMN; a boundary admits or emits raw data and is exempt.

### 1c. The canonical action chain — and where the *relation* lives

The package's flagship action family is the **predication descent** ([`src/actions/index.mts`](../src/actions/index.mts)).
Each leg is a real arrow whose codomain is the next leg's domain:

```
utter      : Mark × Mark        → Utterance             (the ONLY admission; the lone injected datum is a Mark)
articulate : Utterance          → ArticulationCell
predicate  : ArticulationCell   → PredicationSite        (Φ = E × Π × E)
posit      : PredicationSite    → PositPresheaf          (FOUR-charged fibers of evidence)
settle     : PositPresheaf      → SettlementFiltration   (transfinite paraconsistent ≤ₖ fixed point)
```

Because composition is schema identity, the chain *is* a POSIX pipe:

```sh
printf "token\nclaim" | relate utter | relate articulate | relate predicate | relate posit | relate settle
```

and `induce-relation` is the same composite `settle ∘ posit ∘ predicate ∘ articulate` carried as one RMN term.

**The relation is the codomain of this chain, not the head of the climb.** The `SettlementFiltration` is a carrier — an object — that records:

- each settling stage and its designated cells;
- the **depth ordinal** (the last firing), classified by closure regime (finite `n<ω`, Scott `ω`, transfinite `ω<α<ω²`, aperiodic `ω², ω³, …`);
- the cohomology `Hⁿ` and its bigraded decomposition;
- the **closure invariant** (non-Scott additions) and the **graded gap** (cells lost at non-Scott firings), which satisfy a rank identity with `H¹`.

The value domain that makes the fibers and the closure meaningful is Belnap's **FOUR**, the smallest non-trivial bilattice, with two independent partial orders — knowledge `≤ₖ` (how much is told: ⊥ < t,f < ⊤) and truth `≤ₜ` (which way it leans: f < ⊥,⊤ < t).
Their independence (the Avron twist-product) is the formal ground of paraconsistency: you can hold ⊤ (told-both) without collapse.
The full algebra and its D4 gauge are documented in [four-charge-algebra.md](four-charge-algebra.md) and [dihedral-gauge.md](dihedral-gauge.md); the bigrading in [bigraded-settling-cohomology.md](bigraded-settling-cohomology.md).

So: **the relation is an object actions build.** Capability is the next rung up, and it is built over actions — never derived from a single settled relation.

---

## 2. Capability — an induced surface over an action family

A single action is one arrow.
A **capability** is what you get when you take a whole *family* of arrows and induce one discovery surface over it.

`induceBins` ([`src/running/induce.mts`](../src/running/induce.mts)) reads a module's registered actions (plus resources and prompts) and yields the **coproduct apex** — the carrier into which each action injects as a cocone leg — together with a bound dispatcher:

```ts
const apex = induceBins(actions, { packageName: "@emsenn/relating" });
apex.dispatch(["settle"], positPresheafJson);   // run any leg by verb
```

The apex is one object; **CLI, HTTP, OpenAPI, MCP (tools + resources + prompts), browser forms, witness logs, and carrier-node mounts are all functorial images of it.** None of them invents a second ontology — they are projections of the same underlying action registry.
This is the precise content of the project rule that *a package's `bin` and `export` names are the vocabulary of what it can already do*: the capability surface is the package's exports, and the exports are projections of its action apex.

Two consequences of capability being induced over actions, not over a relation:

1. **Capability is compositional by schema identity.** Because the apex is just the family of arrows, the producer/consumer edges (`codomain.$id === domain.$id`) are exactly the wiring graph the manifold reads ([`src/running/manifold.mts`](../src/running/manifold.mts)): domain extrema with no local producer are upstream apices; codomain extrema with no consumer are this surface's outputs.
2. **The relation is one possible output, not the source.** `induce-relation` is a leg of the capability surface whose codomain is the relation — the relation is downstream of the capability, the reverse of the messed-up framing.

---

## 3. Faculty — an axis-specialized capability surface

A **faculty** is a leaf package in the dependency DAG: a capability surface specialized to **one of the three transverse agentive axes** of FOUR, plus a **principled face-reading** on that axis.

| faculty       | package                 | direction | axis            | reading algebra            |
|---------------|-------------------------|-----------|-----------------|----------------------------|
| communicating | `@emsenn/communicating` | across    | truth `≤ₜ`      | meme-endomorphism / negate |
| knowing       | `@emsenn/knowing`       | inside    | knowledge `≤ₖ`  | comonadic                  |
| playing       | `@emsenn/playing`       | outside   | evidence ⟨a₊,a₋⟩ | ludic (∗-autonomous)       |

The axes are transverse (Avron-independent): improving knowledge does not fix a truth direction, so each faculty gives a *different, independent* answer over the same data.
A faculty is not "the descent mirrored three times" — each carries its own algebra.
The across face, for instance, settles the membrane into communicating's **own memes**, charges an assertion `potential` and a denial the `negate` involution of it (`active`), and **pools same-subject memes with `joinKnowledge`** so an assert-and-deny on one subject lands at `⊤` — a *held* truth-contradiction retaining both witnesses paraconsistently ([`lib/communicating/src/communicate/face.mts`](../../communicating/src/communicate/face.mts)).
That is a genuine endomorphism on relating's meme carrier, not a generic descend-then-count.

**The DAG law.** Faculties are leaves.
They import `@emsenn/relating` (the substrate) and each other's primitives, but they **never** import `@emsenn/animating` (the bulk).
The bulk imports the faces; the faces never import the bulk.
This acyclicity is the package-dependency invariant, and it is load-bearing for §6: the bulk can read its faces precisely because the faces know nothing of it.

Each faculty therefore provides two things at once: its own capability surface (a family of axis-specific actions over relating's carriers), and a **face-reading function** `(membrane: readonly UtteranceCarrier[]) → FaceTrio`.
The face-reading is what the next rung consumes.

---

## 4. Face — a local section over a membrane

A **face** is the **local section** of a faculty over a specific membrane: what the agent looks like *from one side*.
The carrier is `animating/face` ([`lib/animating/src/carriers.mts`](../../animating/src/carriers.mts)).
It carries both the *quantity* and the *quality* of one boundary reading:

```ts
interface Face {
  faculty:   "communicating" | "knowing" | "playing"
  direction: "across" | "inside" | "outside"
  axis:      "truth" | "knowledge" | "evidence"

  cover:     number   // distinct subject cells in this local section
  held:      number   // cells with a definite reading (= belnap non-absurd)
  contested: number   // cells at ⊤, held contradictions (= belnap.stable)

  belnap:    { absurd, potential, active, stable }       // the full FOUR census on this axis
  aggregate: "absurd"|"potential"|"active"|"stable"      // the ≤ₖ join over the whole cover
  bigrade:   { truth, contradiction, collapsed }         // the cohomological split
}
```

Two of these fields are computed by laws that live in **relating**, not in animating — the bulk only supplies the census and re-types relating's result ([`lib/animating/src/becoming/doing/working/governing/agent.mts`](../../animating/src/becoming/doing/working/governing/agent.mts)):

### 4a. `aggregate` — the knowledge-order join

The aggregate is the `≤ₖ` join (`∨ₖ`) over the face's entire cover: the single FOUR value the face *lands at*, via `knowledgeAggregateOfCensus`.
In closed form over the census:

```
aggregate = ⊤  if any cell is stable, OR both potential and active are present   (potential ∨ₖ active = ⊤)
          = t  if only potential cells are present
          = f  if only active cells are present
          = ⊥  if every cell is absurd
```

This is the bilattice law that `∨ₖ` is the least upper bound under `≤ₖ` — knowing both sides yields told-both.
The face never collapses this to a binary; it keeps all four corners.

### 4b. `bigrade` — the cohomological decomposition

The bigrade splits the face's knowledge content by `bigradedCohomology`, realizing the settling-cohomology theorem `F^(k) ≅ F^(t) ⊕ F^(⊤)`:

- **`truth`** (the `m=0` row `F^(t)`): the consistent truth-direction cells, `potential + active` — the non-contradicting directions, living in the strict/Scott-continuous regime.
- **`contradiction`** (the `m=1` row `F^(⊤)`): the held-⊤ cells, `= stable = contested` — present only in genuinely paraconsistent settlings.
- **`collapsed`** is `true` iff `contradiction = 0`: the bigrading degenerates to single-graded truth cohomology (`H^{1,n}=0`, the consistent / CALM-compatible / coordination-free regime).
  `false` means the settling carries genuinely two-dimensional content — held contradictions that cohomologically persist.

`truth + contradiction = held`.
The face is the smallest carrier that holds *how many* cells and *which FOUR values they landed at, and whether they are cohomologically simple*, for one side of the agent.

---

## 5. Edge — the connections that must be traversed for coherence

"Edge" names two structures, one inside the predication and one across the boundary.
Both are *the morphisms whose traversal coherence requires*.

### 5a. Predication edge — base-category morphism

In the predication site, an `Edge<Domain, Codomain>` is a directed morphism in the base category ([`lib/articulating/predicating/predication.mts`](../lib/articulating/predicating/predication.mts)).
A site materializes four edge families from its cell set:

| edge family       | domain        | codomain      | what it forgets / does     |
|-------------------|---------------|---------------|----------------------------|
| specialization    | general term  | specific term | subsumption ⊑ (then closed transitively) |
| converse          | node (s,π,o)  | node (o,π,s)  | swaps subject/object       |
| subjectProjection | node (s,π,o)  | term s        | forgets o, π               |
| objectProjection  | node (s,π,o)  | term o        | forgets s, π               |

Each edge family induces a **fiber generator** — a triple `(pullback, ∃, ∀)` that moves FOUR-charged fibers along that edge ([`lib/articulating/predicating/positing/fiber.mts`](../lib/articulating/predicating/positing/fiber.mts)):

- **`pullback`** (restriction): re-read a codomain fiber over the domain.
- **`∃`** (existential / left Kan): push a fiber forward by the order-**join** over the pre-image.
- **`∀`** (universal / right Kan): push forward by the order-**meet**.

`∃ ⊣ pullback ⊣ ∀` is the adjunction, and the generators satisfy **Frobenius reciprocity** for the fiber's linear fusion `⊗`, checked by `generatorSatisfiesLinearFusionFrobenius`:

```
∃( pullback(α) ⊗ φ )  =  α ⊗ ∃(φ)
```

A predication edge therefore specifies **how charge moves** — it is the structure that makes "subsumption implies inheritance of charge" exact (`closeSpecialization` makes the base a preorder).

### 5b. Boundary edge — Mayer–Vietoris overlap

At the holographic boundary, an edge is a **pairwise overlap** in the three-cover `U = A ∪ B ∪ C` (communicating, knowing, playing).
The overlaps `A∩B`, `A∩C`, `B∩C` are the edges of the simplicial cover whose faces are `A, B, C`.
The replica **Mayer–Vietoris** sequence reads ([`lib/animating/src/gluing.mts`](../../animating/src/gluing.mts)):

```
H⁰(U) → H⁰(A)⊕H⁰(B)⊕H⁰(C) → H⁰(A∩B)⊕H⁰(A∩C)⊕H⁰(B∩C) —δ⁰→ H¹(U) → ⋯
```

The connecting map `δ⁰` asks whether the local sections agree on the edges.
`δ⁰ = 0 ⟺ H¹(U) = 0`, and that is exactly when a global section exists.
A boundary edge therefore specifies **where local sections must agree**.

The two senses unify: a predication edge moves charge *within* a relation; a boundary edge measures whether the *faces* of an agent extend to a whole.
Both are connections whose traversal coherence demands.

---

## 6. Bulk — the glued interior agent

The **bulk** is the interior agent — the **global section** assembled by gluing the three boundary faces.
`@emsenn/animating` *is* the bulk.
`glue` ([`lib/animating/src/gluing.mts`](../../animating/src/gluing.mts)) does three things:

1. **Face each membrane**: for each faculty, call its own face-reading on that faculty's membrane seed → three `Face` local sections.
2. **Descend the union**: run the full predication descent over the union of all three membrane logs — the interior settling.
3. **Build the agent**: `buildAgent` assembles the `Agent` carrier from the union descent state and the three faces.

The `Agent` carrier ([`lib/animating/src/becoming/doing/working/governing/carriers.mts`](../../animating/src/becoming/doing/working/governing/carriers.mts)) is the bulk:

```ts
interface Agent {
  kind:         "animating.agent"
  identity:     string                 // the first utterance's token, or explicit
  loop:         "perceive->act"        // the agent is a loop, not a static record
  faces:        Face[]                 // the three boundary faces — its only visible surfaces
  glued:        boolean                // the sheaf condition H¹(U) = 0
  perception:   { recv, observe, held, contested }   // inbound, Opponent-side
  action:       { send, actuate, affordances }       // outbound, Player-side
  goal:         { predicate, charge, satisfied }     // a bilattice-charged target
  governing:    Governing              // the individuation (carries cohomologyRank)
  settledBelow: true                   // the descent has reached a fixed point
  openAbove:    true                   // residual potential remains
  milieu:       number                 // Simondon's pre-individual potential
}
```

The `glued` flag is exact: in `governing`, `glued === (cohomologyRank === 0)`.
So "the agent coheres" is literally "the first cohomology of its union settlement vanishes."

**Settled below, open above.** The bulk's interior is closed — the settlement of the union membrane is a fixed point; no new knowledge can be extracted from facts already received.
But the agent is open at its **affordances**: the open cells (stable `⊤` = contested, or stable `⊥` = untouched) it can still act on.
The `milieu` counts the residual cells — Simondon's pre-individual charge that drives further individuation — and `reseed` re-poses the settled individual as the seed of the next-scale descent, closing the perceive→act spiral.

The bulk is **not directly observable.** By the holographic principle (the corpus reads the interior as a projection of boundary data), you see the agent only through its three faces.

---

## 7. Boundary — the holographic projection

The **boundary** is the cover `U = communicating ∪ knowing ∪ playing`, projected as a `BoundaryProjection` ([`lib/animating/src/carriers.mts`](../../animating/src/carriers.mts)).
`project(agent)` restricts the bulk to its three boundary views:

```ts
interface BoundaryProjection {
  kind:          "animating.projection"
  identity:      string
  glued:         boolean                                  // H¹(U) = 0
  coordination:  "coordination-free" | "consensus-required"
  communicating: Face   // local section over A (truth axis)
  knowing:       Face   // local section over B (knowledge axis)
  playing:       Face   // local section over C (evidence axis)
}
```

The `coordination` field is the corpus's **coordination-cost reading of `H¹`**:

- **coordination-free** (`H¹ = 0`): the three axis-readings agree on their overlaps; the agent coheres with no external consensus.
  The merge is purely monoid-additive — append-only, no conflict resolution.
- **consensus-required** (`H¹ > 0`): overlap-consistency fails; the interior needs explicit resolution before it is coherent.
  This is the formal ground of the corpus's *omníčiye* (consensus-by-withdrawal): consensus is the work `H¹` imposes.

The boundary is the complete observable representation.
The bulk is inferred, never exported directly.

---

## The full chain

```
carrier                     a category OBJECT (one TypeBox value; $id = composition address)
  │
action                      a category MORPHISM (or boundary); composes by $id identity
  │  predication descent: utter → articulate → predicate → posit → settle
  ▼
SettlementFiltration        the RELATION — an object the descent produces
                            (NOT the root of the climb)

actions ──induceBins──▶ Capability        the coproduct apex over an action family;
                                          CLI/HTTP/OpenAPI/MCP/forms/witness are its projections
  │
Faculty                     an axis-specialized capability surface + a principled face-reading
  │  communicating: truth ≤ₜ  | knowing: knowledge ≤ₖ  | playing: evidence ⟨a₊,a₋⟩
  ▼
Face                        a faculty's LOCAL SECTION over a membrane
                            (thin trio + thick FOUR census + ∨ₖ aggregate + bigrade)
  │  Edges (5a) move charge within a relation;
  │  Edges (5b) are the Mayer–Vietoris overlaps A∩B, A∩C, B∩C
  │  δ⁰ = 0 ⟺ H¹(U) = 0 ⟺ glued
  ▼ glue
Bulk (Agent)                the GLOBAL SECTION; settled below / open above; milieu re-seeds
  │ project
Boundary                    the holographic encoding — the agent seen through its three faces
```

The mathematics is not decorative; it is what the code computes:

- **Carriers** are objects whose `$id` is the composition address.
- **Actions** are arrows whose composition is schema identity; their bodies are inspectable RMN terms.
- The **relation** is the codomain of the predication action chain — an object actions build, not the source of capability.
- **Capability** is the coproduct apex induced over an action family; every transport is a functorial image of it.
- **Faculties** are axis-specialized capability surfaces with their own principled face-readings, and are leaves of the dependency DAG.
- **Faces** are local sections carrying a thick FOUR census and a bigraded cohomological split.
- **Edges** move charge inside a relation and measure agreement across the Mayer–Vietoris cover.
- The **bulk** is the global section the sheaf condition (`H¹ = 0`) asserts exists; the **boundary** is the only thing you can see.
