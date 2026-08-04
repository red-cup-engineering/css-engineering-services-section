# KZ-Coherent Sheaf

`analysis.kzCoherentSheaf` is the finite executable surface for `RelMath.
Cohomology.
KZCoherentSheaf`.

It models:

- finite temporal zero-cell and one-cell carriers;
- strict/Scott KZ 2-cells as extensional equality of parallel one-cells;
- KZ-coherence as equality of section maps on KZ-connected routes;
- strict-regime universality, where every finite sheaf is KZ-coherent;
- closure under restriction/postcomposition;
- root RMN normalization at `kzCoherentSheaf.receipt`.

```js
import { evaluateRunTerm, kzCoherentSheaf } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.kzCoherentSheaf.receipt();

receipt.coherence.identifiesParallel;
// true

evaluateRunTerm(kzCoherentSheaf.receipt, receipt);
// the same receipt
```

The runtime surface is the strict/Scott slice.
Non-identity aperiodic 2-cells, where KZ-coherence becomes a genuine sheaf-selection condition, remain Lean/proof-side obligations.
