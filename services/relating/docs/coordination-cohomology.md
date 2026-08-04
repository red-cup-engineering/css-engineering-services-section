# Coordination Cohomology

`analysis.coordinationCohomology` is the finite executable surface for `RelMath.
Cohomology.
CoordinationCohomology`.

It models a federated cover nerve by the counts used by the Lean theorem:

- `entities = |V|`;
- `cells = |E|`;
- `components = |C|`;
- the carried union-find invariant `|V| <= |E| + |C|`;
- `H0 = |C|`;
- `H1 = |E| - |V| + |C|`;
- coordination cost as cells in excess of a spanning forest;
- tree-cover vanishing;
- Laplacian kernel/cokernel rank identities.

```js
import { coordinationCohomology, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const nerve = analysis.coordinationCohomology.coverNerve(3, 3, 1);
const cost = analysis.coordinationCohomology.coordinationCostReceipt(nerve);

cost.h1Rank;
// 1

const receipt = analysis.coordinationCohomology.receipt();
evaluateRunTerm(coordinationCohomology.receipt, receipt);
// the same receipt
```

The runtime carrier requires the union-find invariant instead of deriving a general component counter from arbitrary graph reachability.
A nonzero `H1` rank is a coordination-cost count; the value-level proof that a concrete monotone global section is obstructed without a total order remains Lean/proof-side.
