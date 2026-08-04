# Lambek Calculus Receipts

`analysis.lambek` is the finite executable shadow of `RelMath.
Order.
LambekCalculus`.

It checks explicit finite tables for a Lambek algebra:

- a finite lattice, via `analysis.orderInfra.lattice`;
- a product `dot` with unit `e` and associativity;
- left and right residual tables satisfying the two bi-residuation adjunctions;
- the derived Lean laws: left/right modus ponens, product monotonicity, residual monotone/antitone behavior, unit residuals, and commutative collapse to a single implication.

The built-in `trivialLambekAlgebra` is the Lean one-point `Trivial` model.
The built-in `booleanCommutativeLambekAlgebra` is the Boolean meet/product model where both residuals collapse to classical implication.

The root `lambek` RMN catalog normalizes the receipt:

```js
import { evaluateRunTerm, lambek } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.lambek.laws(
  analysis.lambek.booleanCommutativeLambekAlgebra,
);

evaluateRunTerm(lambek.laws, receipt).kind;
// "lambek.laws:witness"
```

This surface is intentionally finite and table-valued.
It does not prove Lambek laws for arbitrary host-language operations, infinite algebras, grammar completeness, or syntactic concept-lattice completeness.
Those remain Lean-side or theory-side obligations.
