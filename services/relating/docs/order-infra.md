# OrderInfra Receipts

`analysis.orderInfra` is the finite executable shadow of `RelMath.
Order.
OrderInfra`.

It exposes carrier-first receipts for:

- finite preorders: reflexivity and transitivity;
- finite partial orders: preorder plus antisymmetry;
- finite monotone maps between preorders;
- finite algebraic lattices: commutative, associative, idempotent meet/join plus absorption, derived meet-order, glb/lub laws, and meet/join order agreement;
- finite bounded lattices and distributive lattices;
- finite complete lattices by checking every finite subset has a unique lub and glb.

The root `orderInfra` RMN catalog normalizes those receipts:

```js
import { evaluateRunTerm, orderInfra } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const complete = analysis.orderInfra.completeLattice(
  analysis.orderInfra.booleanOrderSystem,
);

complete.kind; // "orderInfra.completeLattice:witness"
evaluateRunTerm(orderInfra.completeLattice, complete).kind;
// "orderInfra.completeLattice:witness"
```

This is intentionally finite.
It does not decide arbitrary host-language relations, quantify over infinite carriers, or implement predicate-indexed suprema over an arbitrary type.
It claims explicit finite relation/table diagnostics and the built-in Boolean lattice receipt, which is enough runtime structure for later finite Knaster-Tarski, nucleus, and residuated-lattice models to build on.
