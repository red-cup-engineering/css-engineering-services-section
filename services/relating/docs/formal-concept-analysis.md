# Formal Concept Analysis

The FCA surface turns predication-cell-shaped data into formal concepts using closed RMN terms.
It is a small, executable bridge between the package's predication model and `RelMath.
Order.
FormalConceptAnalysis`.

The incidence relation is:

```text
I(subject, predicate) iff some cell has that subject and predicate
```

Given cells, the exported terms compute the ordinary Boolean FCA Galois pair:

- `fca.intentOfExtent`: attributes shared by every subject in an extent
- `fca.extentOfIntent`: subjects bearing every predicate in an intent
- `fca.closeExtent`: `extentOfIntent(intentOfExtent(extent))`
- `fca.isConceptPair`: whether an extent/intent pair is closed both ways
- `fca.formalConcept`: close a seed extent and return a concept object

The same term bodies are also exported from the explicit evaluator subpath `@emsenn/relating/evaluating/connecting` as `intentOfExtentTerm`, `extentOfIntentTerm`, `closeExtentTerm`, `isConceptPairTerm`, and `formalConceptTerm`.

## Example

```js
import { evaluateRunTerm } from "@emsenn/relating";
import { intentOfExtentTerm } from "@emsenn/relating/evaluating/connecting";

const cells = [
  { subject: "alpha", predicate: "warm" },
  { subject: "alpha", predicate: "bright" },
  { subject: "beta", predicate: "warm" },
];

const intent = evaluateRunTerm(intentOfExtentTerm, {
  cells,
  extent: ["alpha", "beta"],
});

intent; // ["warm"]
```

The extent `{ alpha, beta }` shares only `warm`.
The intent `{ warm }` then returns `{ alpha, beta }`, so that pair is a formal concept for this tiny context.

For a runnable version, see [`examples/formal-concept-analysis.mjs`](../examples/formal-concept-analysis.mjs).

## What Is Proven

Lean proves the abstract Boolean FCA laws in `lean/RelMath/Order/FormalConceptAnalysis.lean`: the derivation operators are antitone, form a Galois connection, and induce a closure operator.
The `FCALambekCircle` module connects that closure shape to the broader settling and residuated-logic story.

The Node package does not yet have a dedicated FCA golden-vector fixture like FOUR, CHL, or measurement.
Today the product claim is narrower: the FCA operators are closed RMN terms, exported through the package, exercised by contract tests and a runnable example, and conceptually grounded in the Lean FCA law surface.

That boundary matters.
This is already useful as a package feature, but it should be described as "Lean-grounded executable FCA terms," not "fully Lean-conformance-vectored FCA."
