---
title: "communicating: the semiotics of memes"
description: "The principled redesign of @emsenn/communicating. communicating works over the meme carrier of relating-experimental — its core morphisms read and produce memes — which is to say it is our semiotics package and the place where iteration (unlimited semiosis: cycles, spirals, loops) enters the computer. The meme → meme shape DESCRIBES that core; it is not a contract that gates the surface — readings/codecs/language-ops that project a membrane into another carrier (e.g. `cohere`, discourse cohesion) are first-class communicating operations too. A map of the core objects and morphisms, grounded in the meme carrier, the corpus's charge algebra, content/ semiosis, and semiotic/linguistic theory, with natural-language expressiveness as the completeness target."
date: 2026-06-21
status: design
---

# communicating: the semiotics of memes

## The thesis

`@emsenn/communicating` **works over the meme carrier** — its CORE morphisms read and produce memes:

```
communicating : Meme → Meme   (the core morphisms — a description, not a law)
```

Meme in, meme out — for the *core* morphisms.
This is a description of those morphisms, never a contract gating the surface: readings that project a membrane into another carrier (e.g. `cohere` → discourse cohesion) are first-class communicating operations too.
Several of its core morphisms take extra arguments alongside the meme (`illocute` takes a force, `ground` takes partner evidence, `translate` takes a target semiosphere), so they are `Meme × args → Meme`; the carried object is always a meme.
(NB — "a sub-monoid of End(Meme)" is a *structural description* of this core, not a *definition* that gates the surface: readings and codecs that project a meme into another carrier are first-class communicating operations too.
The categorical gloss does not get to exclude operations — see the de-reified contract in `lib/communicating`.)
It is, equivalently: 1. **our semiotics package** — "everything we can do with a meme that returns a meme"; 2. **the place iteration enters the computer** — `relating` performs *one* descent (`induceRelation`: utter→articulate→predicate→posit→settle, a single settled relation); `communicating` feeds a resulting meme back in as the subject or object of the next descent, giving **streams of relations between two relators: cycles, spirals, loops** — Peirce's *unlimited semiosis*, and the `!
` exponential / repeatability of the CGS theory ("a computer is a game made repeatable").
Computers step; hence the grain is a single meme per step.

The current `text → reading` surface of `communicating/` is the **old way** and is mis-typed: text is a `Mark` — a *wire codec* of a meme (the signal), not the carried thing.
Per `CLAUDE.md` Absence, that is evidence the old way was wrong.
The language packages (`-in-english/-latin/-lakota/-tokipona`) are the **factorizations** of the one endomorphism through a signal codec — `decode_L ∘ channel ∘ encode_L : Meme → Meme` — never its type.

## The carrier (grounded)

A `Meme` (`positing/fiber.mts`) is a **charged predication**:

```
Meme = { kind: "predication.fiber.meme", cell: Cell, charge: ChargeCarrier }
  cell   = { subject: Token, predicate: Predicate, object: Token }   // Φ = E×Π×E, of Marks
  charge = { value: [truth, falsity] over FOUR, evidence: [Mark[], Mark[]] }
```

It is the minimal **transmissible unit of meaning-held-with-evidence**: a subject–predicate–object triple, charged with where it sits on the bilattice (absurd / potential / active / stable) and the witnesses on each side.
It lives in **positing**, where "value enters predication by evidence" — so the producer of memes is `posit`, and communicating tiles under positing in the manifold.

**Grain decision (2026-06-21): a single `Meme`, which may *contain* sections.** A cell's `subject`/`object` are Tokens whose Mark wraps *any* value, so a whole valued predication (a section / fiber — a set of memes over a base) can be the subject or object of a meme.
The carrier is one meme; its content nests arbitrarily.
So "a single meme per step" and "a meme can carry a whole relation" are both true: the step is atomic, the payload is unbounded.
This is what lets each loop iteration carry an entire prior relation forward as the subject of the next.

`$id`: `relating/articulating/predicating/positing/meme` (source-path convention; kind `predication.fiber.meme`).

## Objects

There is **one carrier**, `Meme`.
The "objects" of the semiotic category are *readings/roles* of a meme, not separate carriers:

- **sign** — a meme read Peirce-triadically: its cell is `(vehicle, stands-for, object)`; the *interpretant* is the next meme semiosis produces.
- **message** — a meme read as a **linear resource** in transit on a channel: produced once, consumed once (linear logic; `messaging`).
- **proposition** — a meme read for its truth-conditional content (the cell + the truth side of the charge).
- **act** — a meme read with illocutionary force stamped on it (`illocuting`).
- **common-ground item** — a meme whose charge has been knowledge-joined across two agents (`grounding`).

These are lenses; each morphism below is still `Meme → Meme`.

## Core morphisms (the generating set)

Each is grounded in **a semiotic/linguistic phenomenon** AND **the corpus's cell/charge algebra**.
Together they are the generating set; the monoid is their closure under composition (relay, dialogue, iteration).

| morphism | semiotics / linguistics | what it does to the meme (corpus algebra) |
|---|---|---|
| **semiose** | Peirce: unlimited semiosis; the interpretant becomes the next sign-vehicle, object preserved | produce the interpretant meme from a sign meme — the **iteration primitive** (the loop/spiral). Output cell's subject = input meme; charge carries the new uptake. |
| **speak** (`⊙`) | speaker = generative endpoint; saying-as-extending | **linear fusion** of the meme's charge onto the channel (`linearFusionValue`); the meme becomes a message, charge → `potential` in transit. |
| **listen** (`⇒`) | listener = interpretive endpoint; uptake | **linear residuum** of the message charge (`linearResiduumValue`); message consumed once, charge → `active`/`stable` on uptake. |
| **illocute** | Austin/Searle: assertive/directive/commissive/expressive/declaration | stamp illocutionary force on the meme; re-roles it as an act; force constrains the legal charge moves. |
| **ground** | Clark: common ground; accept/challenge/accommodate | **knowledge-join** the meme's charge with the partner's evidence; a held contradiction settles `stable` (both witnessed). |
| **translate** | Lotman: semiosphere boundary | re-sign the same object across a semiosphere; cell object preserved, vehicle (subject) re-expressed. |
| **negate / conflate** | polarity; irony/affirmation vs consistency | charge truth↔falsity (`negate`) and consistency flip (`conflate`) — the two bilattice involutions, as meaning operations. |
| **refer** | reference/deixis/anaphora | resolve the subject/object Marks to entities (which thing the term points at). |
| **modalize** | tense / aspect / evidentiality / modality | modulate the charge (and its evidence witnesses) without changing the cell. |
| **presuppose** | presupposition / implicature (Grice) | derive/require a meme that must already sit in common ground; the interpretant chain carries implicature. |
| **quote / mention** | metalanguage: mention vs use; the metalingual function | nest a meme as the subject/object of a new meme (use→mention) — the operator that lets the system talk *about* memes; the formal home of the section-nesting the grain decision allows. |
| **compose / relay** | relayed/iterated communication; the monoid operation | the monoid multiplication on the generated sub-monoid of End(Meme): compose two meme endomorphisms into one (A→B→C). Its unit is faithful transmission; iterating it is the loop/spiral. |

## Natural-language expressiveness as the completeness target

The goal is to **meet-or-beat natural-language human communication**.
Jakobson's six functions give a falsifiable completeness check — each foregrounds a different part of the meme, and each must be expressible by the morphisms above:

- **referential** → the cell's object (refer, predicate);
- **emotive** → the speaker's charge (speak, modalize);
- **conative** → directive force on the listener (illocute, listen);
- **phatic** → the channel itself (messaging: open/within-capacity);
- **metalingual** → a meme whose object is the code/another meme (nesting; semiose);
- **poetic** → a meme whose object is its own vehicle/form (nesting on the subject).

Peirce (semiosis), Austin/Searle (acts), Grice (implicature), Clark (grounding), Lotman (semiosphere), Saussure (signifier/signified = vehicle/object) all land as operations on the meme.
The bet — a fair one — is that NL expressiveness is the *closure* of this finite generating set, because each NL phenomenon is one of these moves or a composite, and the nesting of sections gives unbounded depth.

## Place in the manifold (resolves roadmap open decision #2)

communicating's `inputSchema.$ref === outputSchema.$ref === relating/articulating/predicating/positing/meme`.
It is an **endo self-loop on the meme carrier** in the wiring graph, tiling **under `posit`** (the producer of memes).
The real edge is `relating(positing) → communicating`, NOT the false `settle → communicating` / text edge the Phase-2 snag warned against.
Endomorphism ⇒ it composes with itself (relay, iteration) and with anything else consuming memes.

## Implementation consequence (next steps)

1. Author `meme.schema.json` (+ the `cell` and `charge` it nests) in relating-experimental positing; generate its type via the codegen pipeline (Phase 1).
  `$id` as above.
2. Rederive `communicating` as `Meme → Meme`: its canonical actions take a meme on the json wire and return a meme; `inputSchema`/`outputSchema` both `$ref` the meme `$id`.
  Re-type the existing phenomena (signify/speak/listen/illocute/ground/ translate/refer/modalize/presuppose) as the generating morphisms above.
3. The text/parse/realization machinery moves into the `-in-<language>` packages as the *factorization* layer (`encode_L`/`decode_L`), not communicating's type.
4. Demonstrate in the manifold: `posit`'s meme output piped into a communicating morphism and back — a relating↔communicating loop over one origin, each step witnessed.

## Progress (2026-06-21)

- **meme carrier schema authored** — `positing/meme.schema.json`, `$id: relating/articulating/predicating/positing/meme`; generates a faithful `Meme` type via the Phase-1 codegen; ships to dist; relating-experimental green, 55/55 tests.
- **communicating's first meme-endomorphism brick** — `communicate/meme.mts`: the `communicate` action is the **monoid unit** (faithful transmission, `Meme → Meme`), both schema slots `$ref` the meme `$id`. communicating builds green; a meme passes through it and a non-meme is refused at the boundary.
  The old text actions remain (capability-preserving) and are marked as the language-codec factorization.

## Known issues surfaced (follow-ups, not yet fixed)

- **`realize` emits mutable tuples/fields; runtime carriers are `readonly`-frozen.** So the generated `Meme`/`ChargeCarrier` types are not assignment-compatible with the hand-written ones (readonly tuple ↛ mutable tuple), which blocks cutting `fiber.mts` over to the generated type the way `utterance` was.
  Fix: have `print.mts` emit `readonly` for fields and `readonly [...]
  `/`ReadonlyArray` for tuples/arrays (all these carriers are frozen).
  Then the meme (and every Phase-3 carrier) can cut over cleanly.
  Until then the meme schema is the carrier *identity + law*, with the runtime type still hand-written in `fiber.mts`.
- **`isCharge` requires evidence witnesses `instanceof Mark`** — reference-identity, not structural.
  A meme transported over the JSON wire with non-empty evidence would be rejected, contradicting the boundary-first stance `utterance.coincides` adopts.
  Fix (Phase 3): judge charge evidence structurally, as `coincides` does, so a rehydrated meme with evidence survives transport.
  (Empty-evidence memes pass today.)

## Capability-parity gate (SATISFIED — consolidation executed 2026-06-21)

The consolidation is **done**.
`communicate/actions.mts` now spreads EXACTLY the 14 meme morphisms (`actions(bundle) === memeActions`); the old text/messaging verbs are GONE from the core operation surface.
Per `CLAUDE.md` (normalization is capability-preserving), every superseded verb's capability was ported BEFORE the verb was removed (PORT-THEN-DELETE).
The parity map, with each gate now satisfied:

| superseded verb | absorbed by / relocated to | gate status |
|---|---|---|
| `articulate-communication` (text → articulation) | relocated to the `codecActions(bundle)` **codec** surface (`@emsenn/communicating/codec-actions`), spread by every `-in-language` package; body is the still-exported `articulateCommunication`∘`admitCommunication` | ✅ codec relocation done |
| `read-communication` (text → holographic reading) | relocated to `codecActions` as **`decode-communication`** (`decode_L`); body is the still-exported `read`/`projectReading` | ✅ codec relocation done (renamed `decode-communication`) |
| `settle-communication` (text → settled parse) | relocated to `codecActions`; body is the still-exported `settle` | ✅ codec relocation done |
| `send-message` (messaging) | **`speak`** morphism — DEEPENED to open the channel (`channelBetween`) and enforce `withinCapacity` (RangeError on over-capacity), stamping the channel onto the transit witness; `message`/`channel`/`speaker`/`listener` carriers + `sendMessage` retained | ✅ absorbed by deepened `speak` |
| `receive-message` (messaging) | **`listen`** morphism — DEEPENED to refuse an already-`active` (spent) meme (linearity), matching `receiveMessage`'s spent-resource throw; `uptake` carrier + `receiveMessage` retained | ✅ absorbed by deepened `listen` |
| `open-channel` (messaging) | `openChannel`/`channelBetween`/`withinCapacity` + the `communicating/messaging/channel` schema retained as an **infrastructure carrier** (the args `speak` consumes); not a meme operation | ✅ preserved as a carrier / `speak` capacity logic |
| `read-word-similarity` (word pairs → similarity) | **relocated to `knowing`** as the operation (interior comparison of sense = the inside faculty); the *action* is removed from communicating, and `similarity`/`similarPairsFrom`/`SimilarPair` stay exported from `communicating/speaking/listening/geometry` so the function survives | ✅ functions retained; ⏳ `knowing` op is the follow-up |

**Deepenings beyond messaging** (the morphisms now exercise the rich machinery they name, not just re-implement the phenomenon thinly): - `ground` — supports the full `CommonGroundUpdate` mode set (assertion / accommodation / challenge), with `CommonGroundBasis` (`prior-discourse` vs `accommodation`) folded into the witness Mark. - `illocute` — shares the single `IllocutionaryForce` type from `speaking/illocuting` (the duplicate local `ILLOCUTIONARY_FORCES` constant is gone), and optionally carries a `perlocution` witness so the act's effect is recoverable. - `translate` — crosses into a genuine `SemiosphereCarrier` via `semiosphere(target)`, not a bare string. - `modalize` — `mode` aligned to the codec's `TenseValue`/`AspectValue`/`EvidentialValue`. - `presuppose` — `trigger` aligned to the codec's `TriggerKind`.

**The one remaining follow-up** is the `knowing` `read-word-similarity` operation; the `similarity` function is retained and exported, so no capability is lost today.
The rich linguistic machinery (`resolveReferences`, `polarity`, `temporal`, `presuppositions`, `roles`/`scope`/`logicalForm`, `grammaticality`, `render`, the speech-act / common-ground / semiosphere / messaging carriers) remains live as the morphisms' internal implementation and as exported codec internals consumed by `-in-language` `decode_L`/`encode_L`.
Nothing is parked in a legacy file.

## Provenance

Corpus-grounded: the meme carrier and charge algebra (`positing/fiber.mts`, `positing/bilattice-charge.mts`, `positing/logic`), the existing semiotic surface (`signifying` = Peirce/Lotman, `illocuting` = Austin/Searle, `messaging` = linear resource + ⊙/⇒ endpoints, `grounding` = Clark), and `content/…/positing/…/bilattice`.
The Jakobson/Grice/Saussure mapping and the "the generated sub-monoid of End(Meme) = closure of a finite generating set ⇒ NL expressiveness" framing are my reasoning, invited as supplement; they are checkable claims, not corpus citations.
