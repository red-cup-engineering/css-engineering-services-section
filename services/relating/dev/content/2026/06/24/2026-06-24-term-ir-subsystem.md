# The RMN IR subsystem in `@emsenn/relating`

**Date:** 2026-06-24 **Subpaths:** `@emsenn/relating/notating`, `@emsenn/relating/evaluating` **Sources:** [lib/notating/index.mts](../../../lib/notating/index.mts), [src/evaluating/index.mts](../../../src/evaluating/index.mts), [src/evaluating/projecting/index.mts](../../../src/evaluating/projecting/index.mts)

---

## What it is

The RMN surface is a **JSON s-expression IR** for the Curry-Howard-Lambek term calculus — specifically `RelMath.
CHL.
Tm`, the de-Bruijn-indexed STLC with products and unit that is *proven* in `lean/RelMath/CurryHowardLambekQuartet.lean`.
The Lean proof certifies Church-Rosser, so the TypeScript reduction engine isn't speculative: it is a transcription of a mechanically verified rewriting system.

The current source tree splits the old single `term` idea into three machine-adjacent pieces:

- `lib/notating/index.mts`: term/type grammar, constructors, substitution, and TypeBox carriers.
- `src/evaluating/index.mts`: reduction, evaluation, type checking, and term inspection.
- `src/evaluating/projecting/index.mts`: carrier-to-term and term-to-carrier bridge.

The representation is frozen-array tuples.
A term is one of:

```
["var", n]              de-Bruijn variable
["lam", body]           lambda abstraction
["app", fn, arg]        function application
["pair", l, r]          product introduction
["fst", t]              product left projection
["snd", t]              product right projection
["star"]                unit / terminal
```

...plus domain extensions that live outside the CHL core:

```
["mark", s]             opaque atomic string (field labels, data atoms)
["charge", name]        a FOUR bilattice value (absurd/potential/active/stable)
["bool", b]             boolean (output of order/coincidence tests)
["generator", name]     one of the four relational generators
["negate"|"conflate"|"negConf", t]   unary charge ops
["joinK"|"meetK"|"joinT"|"meetT", l, r]  binary charge lattice ops
["leK"|"leT", l, r]     order comparisons → bool
["settle", target, seed]  domain fixed-point over a charge closure
["field", key, obj]     named-field projection from an object-encoded term
["append", l, r]        array-encoded list concatenation
["coincide", l, r]      structural equality test → bool
["cond", test, then, else]  boolean conditional
["fold", f, init, list] THE structural recursion (left fold over arrays)
```

The four types are `["base"]`, `["arrow", A, B]`, `["prod", A, B]`, `["unit"]` — standard STLC plus products.

Everything is `Object.freeze`d.
A `Tm` is immutable data, never a closure.

---

## The reduction engine

Three exports drive evaluation:

- **`step(term)`** — returns all one-step reducts (non-deterministic, for exploration and property testing).
  Mirrors `RelMath.
  CHL.step`.
- **`dev(term)`** — Takahashi *complete development*: contracts every redex in the term in one structural pass (β-reduction on `app`/`lam` headed terms, ε-reduction on `fst`/`snd` of `pair`, immediate charge evaluation, `field` projection on concrete object terms, `fold` unrolling on concrete array terms, `cond` branch selection on `bool` tests).
  Mirrors `RelMath.
  CHL.dev`.
- **`evaluate(term)`** — iterates `dev` until fixed point or throws at 10 000 iterations.

`evaluateRunTerm(runTerm, jsonInput)` is the single entry point for running an action body: it calls `carrierToTerm(jsonInput)`, applies the term, evaluates to normal form, and bridges back with `termToCarrier`.

---

## The JSON bridge

`carrierToTerm(jsonValue: JsonValue): Tm` and `termToCarrier(term: Tm): JsonValue` are a round-tripping bijection on admitted JSON:

| JSON | Term |
|------|------|
| `null` | `["star"]` |
| `boolean` | `["bool", b]` |
| charge name string | `["charge", name]` |
| other string or number | `["mark", canonical(value)]` |
| `[x, y, ...]` | `["pair", ["mark", arrayTag], listTerm([...items])]` |
| `{k: v, ...}` | `["pair", ["mark", objectTag], listTerm(sortedEntries)]` |

Arrays and objects encode as tagged-pair spines using sentinel marks `"relating.term.array"` / `"relating.term.object"`.
The sort on object keys is deterministic (lexicographic), so the bridge is canonical: the same JSON value always produces the same term.

---

## How it's wired into the action system

The typing kernel (`src/typing/kernel.mts`) puts an optional `runTerm?: Tm` slot directly on the `Action` interface.
The running layer (`src/running/action.mts`, exported publicly as `@emsenn/relating/running`) synthesizes `run` from it:

```ts
const run = spec.run ?? ((input: In): Out =>
  evaluateRunTerm(spec.runTerm!, input as JsonValue) as Out);
```

This means **a term-bodied action is pure data**.
The `morphismCarrier(action)` serialization that the invocation-witnessing path writes to disk includes `runTerm` verbatim — the action's body travels in the same EAVT log as its verb and domain/codomain ids, and can be replayed from storage without rehydrating a JS closure.

---

## The boundary classification

`actionIrAudit` and `freeTsActions` (in `typing/kernel.mts`) classify every registered action:

- **morphism** — `domain` AND `codomain` both set.
  These are the arrows of the category: `Carrier_A → Carrier_B`.
  Design intent is that every morphism **must** carry a `runTerm`.
  The `freeTsActions` helper returns the ones that haven't been migrated yet — it's a migration progress gauge, not an error.
- **boundary** — one or both ends absent.
  Admissions (`utter`: `→ Utterance`), transports, codecs, and observability hooks.
  These stay as free TS `run` closures; they sit at the edge of the category, not inside it.

The gate is enforced by convention: `measurementRead` in `actions.mts` registers its settlement-read actions with `runTerm` and no `run`; the running layer synthesizes `run` from it.
Pure TS `settlementRead` actions (still boundary-shaped) pass `run` directly and omit `runTerm`.

---

## Pre-built term namespaces

The evaluator subpaths export constructed IR values — these are not functions that build terms at call time, they are closed `Tm` values computed at module load:

### `descent`

The relating morphism chain as IR compositions.
Each is `["lam", ...]
` over the appropriate carrier encoding:

- `articulate` — opens an utterance into its potential articulation cell.
- `predicate` — builds the predication site generators (one reflexive cell) from an articulation cell.
- `posit` — re-tags predication generators as a presheaf (the presheaf adds no essential data; free construction happens at read time).
- `settle` — re-tags presheaf generators as a filtration (same story).
- `induceRelation` — the full `settle ∘ posit ∘ predicate ∘ articulate` as ONE composed lambda chain.
- `relateRelations` — monoid union of two filtrations' generator arrays.
- `coincide` — the token-coincidence judgment (`{ left, right }` → witness or obstruction).

These are **differential-checked**: the test suite asserts byte-identical output between the IR term evaluated over a carrier and the TS function called directly.

### `readers`

The settlement-filtration measurement readers as `read ∘ free` terms.
Each is a lambda that takes filtration generators, materializes the full filtration (`freeTerm`), and then computes an invariant over it — all inside the calculus, with no TS delegation.
The nine measurement reads (`readClassification`, `readDepth`, `readFirstCohomology`, `readGradedGap`, etc.) are **golden-vectored against Lean** via `test/fixtures/lean-measurement-golden.jsonl`.

### `nat`

Von Neumann naturals built over `fold`.
Zero is `{ kind: "exactNumber.natural", members: [] }`; successor is `n ∪ {n}` (append n to its own members); `count` is `fold (λacc.λ_. succ acc) 0` over a list — its length as a natural.

### `measurement`

- `classifyRegime` — `RelMath.
  ClosureOrdinalRegime.classify` as an IR cond-chain.
  Takes `{ scottContinuous, finiteBase, countableCofinality }`, returns a regime constant.
- `cohomologyVanishesInRegime` — `RelMath.
  ClosureOrdinalRegime.cohomologyVanishes` as an IR cond-chain.

Both are golden-vectored against Lean.

---

## The typing relation

`hasTy(ctx, term, type)` / `checkTy` / `inferTy` implement the decidable bidirectional type checker for the **CHL core** (not the domain extensions).
Introduction forms (`lam`, `pair`, `star`) are checked; elimination forms (`var`, `app`, `fst`, `snd`) infer.
This is `RelMath.
CHL.
HasTy` made computable — the verification floor that a proof-search caller (e.g. knowing's `find`) checks its output against.

---

## Where the IR fits in the larger system

The RMN subsystem has exactly two internal integration points inside relating itself:

1. `src/typing/kernel.mts` — owns the `runTerm` slot on `Action` and the `morphismCarrier` serialization.
2. `src/running/action.mts` — synthesizes `run` from `runTerm` via `evaluateRunTerm`.

Downstream faculties that `action(...)
` with a `runTerm` are implicitly using the IR without importing the notating/evaluating subpaths directly: the running layer mediates.

The IR has no dependency on the TS domain implementation (no import of `articulating/`, `predicating/`, etc.) except: - `articulating/predicating/positing/bilattice-charge.mts` — for charge value operations (`negateValue`, `joinKnowledgeValue`, etc.). - `articulating/predicating/positing/settling/value-category.mts` — for `settleOverValue` / `chargeJoinVClosure` (the `settle` domain primitive's reduction rule). - `src/writing/json.mts` — for `canonical` (the bridge's JSON key normalizer) and `JsonValue`. - `typing/index.mts` — for `schemaCarrier` (the `TySchema`/`TmSchema` carrier declarations).

That's a clean, bounded dependency surface.
The IR doesn't know about HTTP, MCP, CLI, or any transport — it is transport-agnostic by construction.

---

## Summary

The term IR is a **proven, serializable, transport-agnostic functional calculus** that serves as the single source of truth for carrier-to-carrier morphism bodies.
Its design properties:

1. **Data, not closure** — a `Tm` is frozen-array JSON, survives `JSON.stringify/parse`, ships in EAVT logs, and travels over any wire.
2. **Lean-grounded** — the CHL core reduction is a transcription of a mechanical proof; the domain measurement terms are golden-vectored against Lean output.
3. **Differential-checked** — every pre-built term is tested for byte-identical output against its TS counterpart.
4. **Migration gauge** — `freeTsActions` makes the migration progress visible: zero entries means the category is fully IR-native.
5. **Composition in the calculus** — `induceRelation` is `settle ∘ posit ∘ predicate ∘ articulate` expressed as term composition, not as four TS function calls chained at the call site.
  The calculus IS the composition law.
