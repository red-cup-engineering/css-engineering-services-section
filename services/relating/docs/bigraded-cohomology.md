# Bigraded Cohomology Receipts

`analysis.bigradedCohomology` is the finite executable shadow of `RelMath.
Positing.
BigradedCohomology`.

It reads a finite list of FOUR charge names as the image of a finite valuation and returns:

- truth content, false content, and inconsistency content;
- the four-regime trichotomy: `trivial`, `consistent`, `paraconsistent`, or `mixed`;
- the internal negation gauge action;
- the Lean gauge laws: inconsistency content is fixed, truth content flips to false content, paraconsistent points are gauge-stable, and classical truth-firings are gauge-moved.

The root `bigradedCohomology` RMN catalog normalizes the receipt:

```js
import { bigradedCohomology, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.bigradedCohomology.receipt([
  "potential",
  "stable",
]);

evaluateRunTerm(bigradedCohomology.receipt, receipt).regime;
// "mixed"
```

This surface does not compute sheaf cohomology groups or construct the aperiodic moduli stack.
It records the finite charge-list invariant and gauge action that the Lean module proves for valuations over finite cell lists.
