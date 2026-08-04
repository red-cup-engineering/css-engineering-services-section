---
title: "Closure Flow Analysis"
---

# Closure Flow Analysis

`@emsenn/relating/analysis.flow` is the finite executable surface for the green RelMath closure-flow/firing cluster.

It covers:

- finite FOUR-valued valuations over named cells;
- pointwise charge operators as finite closure-flow carriers;
- firing blowups, incidence patterns, firing types, consistency-failure sources, and local-data reconstruction;
- finite non-Scott-continuous firing commutation witnesses;
- Scott-continuous closure receipts with no finite NSC firing;
- closure-flow dynamics, smooth tails, and monotone ascent;
- curvature-regime classification and finite rank-zero/positive-rank receipts;
- `Nat` free-energy Lyapunov witnesses;
- algebraic Laplacianizer/Hodge fixed-point receipts;
- canonical `omega` continuity witnesses for the finite chain.

The root import exposes matching RMN normalizers as `flow.*`.

```js
import { evaluateRunTerm, flow } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const seed = analysis.flow.valuation(["x", "y", "z"], {
  x: "absurd",
  y: "potential",
  z: "active",
});

const blowup = analysis.flow.firingBlowup(analysis.flow.truthSideClosureOperator, seed, 0);
evaluateRunTerm(flow.firingBlowup, blowup).kind;
// "flow.firingBlowup:witness"
```

## Boundary

This is not the full transfinite theorem kernel.
Arbitrary `Ord.limit` continuity, general fundamental-sequence validity, and literal transfinite `L_ns` cardinality remain Lean/proof-side obligations.
The runtime surface claims only finite successor-flow witnesses and the canonical `omega` continuity shadow that can be checked over this package's FOUR carrier.
