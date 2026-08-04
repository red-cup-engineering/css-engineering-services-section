# Alexandrov/Husainov

`analysis.alexandrovHusainov` is the finite executable surface for `RelMath.
Cohomology.
AlexandrovHusainov`.

It models:

- finite poset carriers;
- Alexandrov open sets as up-sets;
- all-open enumeration for bounded finite posets;
- principal up-sets;
- finite topology law receipts for empty, universe, finite intersections, and finite unions;
- specialization-order recovery;
- monotone maps between finite posets;
- finite continuous-monotone equivalence by exhaustive map and open-set checks;
- the Cech-side Husainov boundary receipt for bounded finite sites;
- root RMN normalization at `alexandrovHusainov.receipt`.

```js
import { alexandrovHusainov, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.alexandrovHusainov.receipt();

receipt.topology.opens.length;
// 6

analysis.alexandrovHusainov.specializes(receipt.topology.poset, "seed", "top");
// true

evaluateRunTerm(alexandrovHusainov.receipt, receipt);
// the same receipt
```

The runtime surface is finite.
Arbitrary Prop-valued indexed intersections, non-finite Alexandrov spaces, Dedekind-MacNeille cut acyclicity, injective or flasque resolutions, and Husainov's Cech-vs-derived-functor comparison remain Lean/proof-side obligations.
