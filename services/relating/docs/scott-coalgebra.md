# Scott Coalgebra

`analysis.scottCoalgebra` is the finite runtime surface for:

- `RelMath.
  Closure.
  ScottContinuousClosure`
- `RelMath.
  Closure.
  SettlingCoalgebra`

It works over the existing FOUR charge lattice and pointwise valuation-fiber closures.
A finite knowledge-directed charge family is required to attain its join, so every validated finite charge closure commutes with that directed join.
Finite antecedent firing is modeled the same way: firing on the join is the same as firing on an attained member.

The coalgebra receipt packages the settling endofunctor `F_U(v) = Cl(v) joinK U`, coalgebra-map inflation, monotonicity, finite orbit limits, quiescence as the zero-increment isomorphism, and the existing finite KZ shadow from `closureFamily.monad`.

This is intentionally not a runtime claim about arbitrary directed-complete orders, infinitary antecedents, cofree coalgebras, or genuine 2-categorical KZ cells.
Those remain Lean/proof-side obligations.

```js
import { scottCoalgebra, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.scottCoalgebra.receipt();
evaluateRunTerm(scottCoalgebra.receipt, receipt);
```
