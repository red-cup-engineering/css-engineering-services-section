# Value Settling and Optimization Receipts

`@emsenn/relating/settling` carries the finite executable shadow of:

- `RelMath.
  Value.
  SettlingOverValueCategory`
- `RelMath.
  Value.
  Optimization`

The live surface is finite/sample-checked.
For a finite value category, pass the whole carrier as the sample:

- `partialOrderOver(V, sample)` checks reflexivity, transitivity, and antisymmetry.
- `closureOver(V, T, sample)` checks inflationary, monotone, idempotent closure laws.
- `settleFixedPoint(V, T, seed)` and `settleLeast(V, T, seed, bound)` carry the fixed-point and least-fixed-point readings.
- `fourRegimeValueIndependent(V1,T1,V2,T2,d)` witnesses that regime classification depends on closure-regime data, not on the chosen value category.
- `spineRecovery(k)` witnesses the Boolean and FOUR value-category instances and the charge-settling recovery.
- `settlingOptimizationReceipt(V,T,seed,bound)` is the serializable receipt for "settling is optimization": reachable optimum, local optimality, fixed point, and least-bound witness.

The root `valueSettling` RMN catalog normalizes those receipts:

```js
import { chargeValue, evaluateRunTerm, valueSettling } from "@emsenn/relating";
import * as settling from "@emsenn/relating/settling";

const receipt = settling.spineRecovery(chargeValue("active"));
receipt.kind; // "settling.spineRecovery:witness"

evaluateRunTerm(valueSettling.spineRecovery, receipt).kind;
// "settling.spineRecovery:witness"
```

This does not implement a continuous quantale runtime, real-valued metric optimization, or proof of arbitrary host functions.
It claims the finite carrier-checkable law surface: value categories, value closures, regime independence, FOUR/Boolean recovery, and optimization-as-settling receipts.
