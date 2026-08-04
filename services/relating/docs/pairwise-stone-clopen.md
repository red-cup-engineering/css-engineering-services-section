# Pairwise Stone Clopen

`analysis.pairwiseStoneClopen` is the executable finite surface for `RelMath.
Cohomology.
PairwiseStoneClopen`.

It models the distinguished spatial dual of FOUR:

- the two points `plus` and `minus`;
- the antichain Priestley order, where only each point is below itself;
- the swap `sigma : plus <-> minus`;
- clopen up-sets as `{ plus: boolean, minus: boolean }`;
- the duality table from those four clopen up-sets to the FOUR charge names;
- the pairwise-Stone topologies `tauPlus` and `tauMinus`;
- order recovery from `tauPlus`;
- transport of swap to charge negation and the `negation` gauge element.

```js
import { evaluateRunTerm, pairwiseStoneClopen } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.pairwiseStoneClopen.receipt();

receipt.lattice.table.map((row) => [row.members, row.charge]);
// [
//   [[], "absurd"],
//   [["plus"], "potential"],
//   [["minus"], "active"],
//   [["plus", "minus"], "stable"]
// ]

evaluateRunTerm(pairwiseStoneClopen.receipt, receipt);
// the same receipt
```

The runtime boundary is intentionally finite.
The general Jung-Rivieccio duality `DBiLat^op ~= PairedPriSp`, arbitrary Priestley spectrum synthesis, and non-finite compactness/order-disconnectedness obligations remain proof-side.
