# Residuated Lattice Receipts

`analysis.residuatedLattice` is the finite executable shadow of `RelMath.
Order.
ResiduatedLatticeStandalone`.

It checks explicit finite tables for an integral commutative residuated lattice:

- a bounded lattice, via `analysis.orderInfra.boundedLattice`;
- fusion as a commutative monoid with unit `1`;
- the residuation adjunction `a * b <= c` iff `a <= b -> c`;
- integrality `1 = top`;
- the derived Lean laws: fusion monotonicity, `a <= 1`, modus ponens, and `a * b <= a meet b`.

The built-in `twoBooleanResiduatedLattice` is the canonical Boolean `Two`: meet/fusion are `and`, join is `or`, and implication is classical Boolean implication.

The root `residuatedLattice` RMN catalog normalizes the receipt:

```js
import { evaluateRunTerm, residuatedLattice } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.residuatedLattice.laws(
  analysis.residuatedLattice.twoBooleanResiduatedLattice,
);

evaluateRunTerm(residuatedLattice.laws, receipt).kind;
// "residuatedLattice.laws:witness"
```

This is intentionally finite.
It does not prove residuation for arbitrary host-language functions or infinite lattices.
It claims explicit finite bounded-lattice, fusion, and residual tables, enough to support finite twist-product/FOUR residuation parity.
