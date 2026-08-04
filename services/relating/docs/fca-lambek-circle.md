# FCA Lambek Circle Receipts

`analysis.fcaLambek` is the finite executable shadow of `RelMath.
Order.
FCALambekCircle`.

It assembles the algebraic edges that are executable in Node:

- FCA `closeA = primeB . primeA` is checked as an extensive, monotone, idempotent closure operator over a finite context.
- finite formal-concept extents are checked as a finite complete concept lattice by meet and closed-join receipts.
- a finite integral commutative residuated lattice is checked by `analysis.residuatedLattice`.
- that residuated lattice is converted to a finite commutative Lambek algebra, checked by `analysis.lambek`, with the two residuals collapsing to one implication.

The root `fcaLambekCircle` RMN catalog normalizes the receipt:

```js
import { evaluateRunTerm, fcaLambekCircle } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.fcaLambek.circle(
  analysis.fcaLambek.workedContext,
  analysis.residuatedLattice.twoBooleanResiduatedLattice,
);

evaluateRunTerm(fcaLambekCircle.receipt, receipt).kind;
// "fcaLambek.circle:witness"
```

This is intentionally finite.
The Wurm concept-lattice completeness theorem, Pentus context-free-language expressivity theorem, arbitrary many-valued FCA models, and infinite Lambek/residuated structures remain proof-side or model-theoretic obligations.
The receipt records that closing edge as a `documented-boundary`, not as a computed proof.
