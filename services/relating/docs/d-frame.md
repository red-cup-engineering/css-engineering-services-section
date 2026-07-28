# D-Frame

`analysis.dFrame` is the finite executable surface for `RelMath.
Cohomology.
DFrame`.

It models:

- finite powerset frames over string-named cells;
- meet as intersection and finite sup as union;
- the canonical bitopological d-frame where `con` is disjointness and `tot` is covering;
- finite downward closure of `con` and upward closure of `tot`;
- the d-frame-valued settling sheaf over charge-valued cells;
- positive support `dK = {t, top}`;
- negative support `dF = {f, top}`;
- settled support inside a clopen;
- restriction by intersection with a clopen mask;
- root RMN normalization at `dFrame.receipt`.

```js
import { dFrame, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.dFrame.receipt();

receipt.valuedSheaf.positiveSupport.elements;
// ["both-cell", "truth-cell"]

evaluateRunTerm(dFrame.receipt, receipt);
// the same receipt
```

The runtime surface is finite.
Arbitrary `Prop`-valued frames, infinitary suprema, general d-frame morphism categories, and non-finite frame-valued sheaf cohomology remain Lean/proof-side obligations.
