# Algebra Hierarchy Receipts

`analysis.algebraHierarchy` is the finite executable shadow of `RelMath.
Order.
AlgebraHierarchy`.

Lean defines the abstract tower of magmas, semigroups, monoids, groups, rings, fields, and homomorphisms, then exhibits concrete finite examples.
The Node surface claims those runtime-relevant examples as carrier-shaped law receipts:

- the Boolean field `F2` with XOR addition and AND multiplication;
- the Klein-four group `K4`, derived from the package's existing gauge action;
- Boolean meet and join as commutative monoids;
- Boolean residuated fusion as a commutative monoid;
- law obstructions for invalid finite tables.

The root `algebraHierarchy` RMN catalog normalizes the receipt:

```js
import { algebraHierarchy, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.algebraHierarchy.algebraHierarchy();

evaluateRunTerm(algebraHierarchy.receipt, receipt).kind;
// "algebraHierarchy.receipt:witness"
```

This is intentionally finite.
It does not reconstruct Lean proofs for arbitrary host-language operations or infinite algebraic structures.
It claims explicit finite operation tables and the concrete examples that make the existing FOUR, order, and residuation kernels algebraically inspectable.
