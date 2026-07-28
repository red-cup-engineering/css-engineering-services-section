# Chu Spaces Over FOUR

The `chu` catalog exposes finite Chu-space operators as closed RMN terms.

A Node-side Chu space is encoded as:

```js
{
  pts: ["a", "b"],
  sts: ["x", "y"],
  r: [
    { pt: "a", st: "x", charge: "active" },
    { pt: "a", st: "y", charge: "potential" }
  ]
}
```

The matrix `r` is FOUR-valued.
Each entry carries one of `absurd`, `potential`, `active`, or `stable`.

Exported terms:

- `chu.dual`: swap `pts` and `sts`, transpose `r`, and negate every charge
- `chu.lookup`: read the matrix at `(pt, st)`, returning `absurd` when absent
- `chu.dualInvolution`: return whether `dual(dual(space))` equals `space`

The same term bodies are also exported from the explicit evaluator subpath `@emsenn/relating/evaluating/pairing` as `chuDualTerm`, `chuLookupTerm`, and `chuDualInvolutionTerm`.

## Example

```js
import { evaluateRunTerm } from "@emsenn/relating";
import {
  chuDualInvolutionTerm,
  chuDualTerm,
  chuLookupTerm,
} from "@emsenn/relating/evaluating/pairing";

const space = {
  pts: ["a"],
  sts: ["x"],
  r: [{ pt: "a", st: "x", charge: "active" }],
};

evaluateRunTerm(chuDualTerm, space);
// { pts: ["x"], sts: ["a"], r: [{ pt: "x", st: "a", charge: "potential" }] }

evaluateRunTerm(chuLookupTerm, { space, pt: "a", st: "x" }); // "active"
evaluateRunTerm(chuDualInvolutionTerm, space); // true
```

For a runnable version with term introspection, see [`examples/chu-spaces.mjs`](../examples/chu-spaces.mjs).

## What Is Proven

Lean proves the abstract theorem shape in `lean/RelMath/Order/LinearLogicChu.lean`: a Chu space over FOUR has a dual built by transposing the matrix and negating entries, and the dual is an involution.
The same module also develops Chu transforms and the alphabet-level star-autonomous reading of FOUR.

The Node package currently implements the finite encoded space operators, not the full Chu transform category.
The product claim is therefore:

- executable RMN terms for finite Chu-space dual, lookup, and double-dual witness
- contract tests over finite encoded spaces
- conceptual grounding in the Lean Chu/FOUR duality theorem

It should not be described as a complete Chu category runtime yet.

## Why This Is A Product Surface

Most software has no native place to put "a relation whose truth values are paraconsistent and whose dual is computable as data."
Here, the same FOUR charge algebra used by predication and settlement becomes the alphabet of a finite linear-logic matrix.
Because the operators are RMN terms, the dual is not an opaque callback; it is inspectable package data.

That is a small but sharp surface: typed finite relation matrices, over the package's paraconsistent value core, with executable duality.
