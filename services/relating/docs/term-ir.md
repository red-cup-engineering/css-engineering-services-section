# Term IR

Relation Model Notation is the package's JSON s-expression language for pure morphism bodies.
It is the code-level surface of the Curry-Howard-Lambek term calculus in `lean/RelMath/CurryHowardLambekQuartet.lean`: types, terms, de-Bruijn substitution, beta/projection reduction, complete development, and the decidable `HasTy` typing relation.

It is intentionally plain data.
A term is a frozen array such as `["lam", ["var", 0]]`, not a JavaScript closure.
That means an action body can be serialized, witnessed, transported, inspected, and replayed.

## Public Surface

Use these subpaths when working directly with the IR:

- `@emsenn/relating/notating`: `ty`, `tm`, `TySchema`, `TmSchema`, `rename`, `subst`, and `inst`
- `@emsenn/relating/evaluating`: `step`, `dev`, `evaluate`, `evaluateRunTerm`, `hasTy`, `inferTy`, `checkTy`, `termSize`, `termUses`, and `isClosed`
- `@emsenn/relating/evaluating/projecting`: `carrierToTerm`, `termToCarrier`, `objectTerm`, `arrayTerm`, and `stringTerm`

The root export re-exports the common pieces for normal action authoring.

The generated TypeDoc now treats those subpaths as separate API surfaces: notation owns syntax, evaluation owns reduction/type checking, projection owns carrier crossing, and the catalog subpaths own closed term bodies.

## Notation Layer

`@emsenn/relating/notating` is the authored syntax layer.
It exports the term and type constructors as plain frozen JSON arrays, plus the recursive TypeBox schemas that admit those arrays:

```ts
import { tm, ty, TySchema, TmSchema, rename, subst, inst } from "@emsenn/relating/notating";

const identity = tm.lam(tm.var(0));
const proofType = ty.arrow(ty.base(), ty.base());
```

The structural operations are de-Bruijn operations, not evaluator shortcuts:

- `rename` changes free-variable indices under binders
- `subst` replaces variables with terms while respecting binders
- `inst` applies a lambda body to one argument term

The package tests compile `TySchema` and `TmSchema` with Ajv and reject malformed tags and invalid variable indices.
That is the machine-facing contract for RMN as notation: if a downstream package wants to store or transmit an RMN body, it can validate the syntax before asking the evaluator to reduce it.

## Shape

The CHL core has four types:

```ts
ty.base();
ty.arrow(ty.base(), ty.base());
ty.prod(ty.base(), ty.unit());
ty.unit();
```

The core term constructors are the STLC/product/unit forms:

```ts
tm.var(0);
tm.lam(tm.var(0));
tm.app(tm.lam(tm.var(0)), tm.star());
tm.pair(tm.star(), tm.star());
tm.fst(tm.pair(tm.star(), tm.star()));
tm.snd(tm.pair(tm.star(), tm.star()));
tm.star();
```

`@emsenn/relating` adds domain primitives around that core: FOUR charge values and operations, order tests, settlement over charge closures, field projection, array append, structural coincidence, conditionals, and one structural recursion operator, `fold`.

## Running Terms

Use `runTerm` when an action is a carrier-to-carrier morphism:

```ts
import { action, tm } from "@emsenn/relating";

export const identity = action({
  verb: "identity",
  domain: someCarrier,
  codomain: someCarrier,
  runTerm: tm.lam(tm.var(0)),
});
```

`evaluateRunTerm(runTerm, input)` performs the boundary between carrier data and the calculus:

```ts
import { evaluateRunTerm, tm } from "@emsenn/relating";

const status = evaluateRunTerm(
  tm.lam(tm.field("status", tm.var(0))),
  { status: "potential" },
);

status; // "potential"
```

The JSON bridge is deterministic: object keys are sorted and arrays/objects are encoded as tagged product spines.
Use the projecting subpath when you need to see that bridge directly:

```ts
import { carrierToTerm, termToCarrier } from "@emsenn/relating/evaluating/projecting";

const term = carrierToTerm({ status: "potential" });
termToCarrier(term); // { status: "potential" }
```

For the focused bridge surface, see [Carrier-term projection](carrier-term-projection.md).

## Boundary Rule

Use a TypeScript `run` body when the action is a boundary:

- it admits external data
- it encodes or decodes a representation
- it touches I/O
- it talks to a host process or transport
- it has no lawful carrier-to-carrier domain/codomain yet

The migration audit helpers make this distinction visible:

```ts
import { actionIrAudit, freeTsActions } from "@emsenn/relating";
```

`freeTsActions(actions)` should trend toward true boundaries only.
It is a gauge for how much of the carrier-to-carrier category is represented as data.

## What Exists Today

The package already ships closed term catalogs:

- `descent`: the `articulate -> predicate -> posit -> settle` chain as terms
- `settlingTerms`: the free settlement construction
- `readerTerms`: settlement readers expressed as `read . free`
- `nat`: von Neumann natural builders over `fold`
- `measurement`: closure-regime classifiers golden-vectored against Lean
- `fca`: Formal Concept Analysis terms
- `chu`: finite Chu-space duality and lookup terms over FOUR

`examples/term-products.mjs` inspects these catalogs and also demonstrates the notation schemas, de-Bruijn structural operations, core evaluator, type checker, JSON bridge, and `evaluateRunTerm` path.

The settlement reader catalog has its own focused guide: [Settlement reader terms](settlement-reader-terms.md).

## Boundary

This is not a general JavaScript replacement language.
The shipped evaluator is the current RMN reducer for closed carrier morphism bodies, with a fixed-point fuel guard and Lean-backed conformance vectors for the surfaces the package claims.
Boundary effects, transports, codecs, and host-process calls remain in TypeScript and are projected through the action/running layer.

## Why It Matters

`runTerm` makes a morphism body part of the category rather than a hidden closure behind one transport.
The same body can be inspected, serialized as a morphism carrier, served through CLI/HTTP/MCP, compared with Lean-emitted vectors, and witnessed in durable logs.
