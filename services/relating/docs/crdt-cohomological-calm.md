# CRDT/CALM

`analysis.crdtCalm` is the finite executable surface for `RelMath.
Cohomology.
CRDTCohomologicalCALM`.

It models:

- order-independent FOUR delta merge by knowledge join;
- predicatory confluence by the valuation knowledge join;
- finite `H1 = 0` convergence facts as a carried receipt;
- quiescence as closure fixed point;
- monotone settling as coordination-free merge;
- Mayer-Vietoris overlap gluing as finite cosettling join-subsemilattice closure;
- root RMN normalization at `crdtCalm.receipt`.

```js
import { crdtCalm, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.crdtCalm.receipt();

receipt.convergence.merge.leftMerge;
// "stable"

evaluateRunTerm(crdtCalm.receipt, receipt);
// the same receipt
```

The runtime surface is a finite conjunction of convergence facts.
The genuine CALM biconditional that distinguishes non-confluent or non-monotone cases, and full Mayer-Vietoris long-exact-sequence machinery, remain Lean/proof-side obligations.
