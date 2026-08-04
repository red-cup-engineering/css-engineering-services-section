# Carrier-Term Projection

`@emsenn/relating/evaluating/projecting` is the bridge between JSON carrier values and Relation Model Notation terms.

This surface is small, but it is one of the package's important product seams: ordinary JSON-shaped carrier data can enter the pure term calculus, be reduced by RMN, and return as JSON-shaped carrier data without becoming a hidden JavaScript closure.

## Public Handles

Import the bridge directly when you need to inspect or build the carrier encoding:

```ts
import {
  arrayTerm,
  carrierToTerm,
  objectTerm,
  stringTerm,
  termToCarrier,
} from "@emsenn/relating/evaluating/projecting";
```

Use the evaluator with it when an operation is a carrier-to-carrier morphism:

```ts
import { evaluateRunTerm, tm } from "@emsenn/relating";

const title = evaluateRunTerm(
  tm.lam(tm.field("title", tm.var(0))),
  { title: "Carrier term bridge" },
);
```

## What The Bridge Does

`carrierToTerm(value)` admits JSON values into RMN:

- `null` becomes `star`
- booleans become `bool`
- FOUR charge-name strings become `charge`
- other strings and numbers become opaque `mark` values
- arrays become deterministic tagged product spines
- objects become deterministic tagged product spines with sorted keys

`termToCarrier(term)` decodes a normal-form value term back to JSON.
The bridge is deterministic, so the same JSON value produces the same term structure every time.

`objectTerm`, `arrayTerm`, and `stringTerm` are public builders for callers that need to construct bridge-shaped terms manually.
They are useful when a term catalog or example needs a carrier value inside the calculus without first writing that value as a JavaScript object.

## Why This Exists

The package's term layer is a JSON s-expression IR, grounded by the CHL calculus in `lean/RelMath/CurryHowardLambekQuartet.lean`.
The calculus is about terms, while the package boundary is about carriers.
This bridge is the honest join between those facts.

It is also why `runTerm` can be practical.
`evaluateRunTerm(runTerm, input)`:

1. admits the input carrier with `carrierToTerm`
2. applies and reduces the RMN body
3. decodes the normal form with `termToCarrier`

That path makes simple morphism bodies serializable, inspectable, witnessable, and transportable as data.

## Example

The runnable example:

```sh
node examples/carrier-term-projection.mjs
```

checks the bridge directly:

- an object carrier round-trips through `carrierToTerm` and `termToCarrier`
- `field` projection reduces against the bridge's object encoding
- array `append` reduces against the bridge's array encoding
- `objectTerm`, `arrayTerm`, and `stringTerm` build the same carrier-shaped term format manually
- `evaluateRunTerm` runs a carrier projection as an ordinary morphism body

## Boundary

This is not a general JavaScript object serializer.
It admits JSON values, not class instances, prototypes, functions, symbols, dates, maps, sets, or host resources.

This is also not schema validation.
Carrier schemas and Ajv validators remain the runtime law for whether a value belongs to a carrier.
The projection bridge only says how an admitted JSON value is represented inside RMN.

Finally, `termToCarrier` expects a normal-form value term.
It can decode the bridge's tagged arrays and objects, primitive value terms, and product pairs; it is not a proof searcher or a reducer.
Reduce first with `evaluate` or use `evaluateRunTerm` when the whole operation is a carrier morphism.
