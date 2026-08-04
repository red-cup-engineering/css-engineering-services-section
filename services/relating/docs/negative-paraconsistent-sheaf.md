# Negative Paraconsistent Sheaf

`analysis.negativeParaconsistentSheaf` is the finite executable surface for `RelMath.
Cohomology.
NegativeParaconsistentSheaf`.

It models:

- the negative-designated mask `dNeg = {f, top}`;
- reuse of `DFrame.dF` as the falsehood-side mask;
- the `f`-only mask `dFonly`;
- bilattice negation of charge-valued finite cells;
- the mirror law `dNeg(v) = dK(negate(v))`;
- the mirror law `dFonly(v) = dT(negate(v))`;
- the negation-fixed `top` seam;
- the involutive mirror back to the positive side;
- negative cochain restriction;
- the finite split of a `dNeg` cochain into `f`-only and `top` parts;
- root RMN normalization at `negativeParaconsistentSheaf.receipt`.

```js
import { evaluateRunTerm, negativeParaconsistentSheaf } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.negativeParaconsistentSheaf.receipt();

receipt.mirror.dNeg.cells;
// ["both-cell", "false-cell"]

receipt.mirror.dKOfNegated.cells;
// ["both-cell", "false-cell"]

evaluateRunTerm(negativeParaconsistentSheaf.receipt, receipt);
// the same receipt
```

The runtime surface is finite.
General sheaf equivalence over arbitrary covers, Cech gluing, CALM equivalence, and non-finite paraconsistent sheaf cohomology remain Lean/proof-side obligations.
