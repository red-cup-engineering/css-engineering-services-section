# Knaster-Tarski Receipts

`analysis.knasterTarski` is the finite executable shadow of `RelMath.
Order.
KnasterTarskiStandalone`.

It takes:

- a finite `analysis.orderInfra` preorder/partial-order carrier;
- a finite endomap table over that carrier.

It then checks the actual Knaster-Tarski hypotheses before returning a witness:

- the order is a finite complete lattice, via `analysis.orderInfra.completeLattice`;
- the endomap is monotone, via `analysis.orderInfra.monotoneMap`;
- the least fixed point is the infimum of the pre-fixpoints `f x <= x`;
- the greatest fixed point is the supremum of the post-fixpoints `x <= f x`;
- both extrema are fixed, least/greatest among fixed points, and satisfy `lfp <= gfp`.

The root `knasterTarski` RMN catalog normalizes the receipt:

```js
import { evaluateRunTerm, knasterTarski } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const endomap = analysis.knasterTarski.finiteMonotoneEndomap(
  analysis.orderInfra.booleanOrderSystem,
  [1, 1],
);
const receipt = analysis.knasterTarski.fixedPoints(endomap);

evaluateRunTerm(knasterTarski.fixedPoints, receipt).kind;
// "knasterTarski.fixedPoints:witness"
```

This is intentionally finite.
It does not prove the theorem for arbitrary complete lattices, arbitrary predicates, or host-language functions.
It claims the explicit finite complete-lattice and monotone endomap table case, which is the runtime shadow needed by settling, finite closure systems, and downstream coordination kernels.
