# Aperiodic Classification

`analysis.aperiodicClassification` is the finite runtime surface for the aperiodic `cl-inv` cluster:

- `RelMath.
  Aperiodic.
  Classification`
- `RelMath.
  Aperiodic.
  AndersonPutnam`
- `RelMath.
  Aperiodic.
  Moduli`
- `RelMath.
  Aperiodic.
  Universality`
- `RelMath.
  Aperiodic.
  StepN.
  FixedPoint`
- `RelMath.
  Aperiodic.
  CoClassifying`
- `RelMath.
  Aperiodic.
  SynonymyAntonymy`
- `RelMath.
  Aperiodic.
  Autopoiesis`
- `RelMath.
  Aperiodic.
  CohomologicalEquivalence`

The surface uses integer-coordinate `H1Class` values, finite step-rule carriers, constant Anderson-Putnam direct-limit representatives, fixed-dimension integer matrix witnesses for strong/shift equivalence, and the existing finite nuclear diamond receipts.

The runtime claim is deliberately finite: strict/Scott regimes force `clInv.coord = 0`; aperiodic witnesses can carry nonzero coordinates; constant direct-limit systems collapse stage depth; step shift preserves primitive flags, coordinates, and coarse moduli points; `sigmaInfinity` is the identity after depth-collapse; strict Boolean co-classifying is a coordinate-isomorphic homology copy; synonymy is ordinary `clInv` equality while antonymy flips the strong firing type.
Full cohomological equivalence is modeled as equality of the finite triple `(H0, clInv, regime)`, refining the `clInv` component while keeping negation cohomologically invisible.

Open frontiers remain explicit in the receipt: structural MLD classification converse, q-fuzzy/derived Verdier duality, cross-dimension shift equivalence and dimension groups, and genuine sheaf/topology moduli stacks.

```js
import { aperiodicClassification, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.aperiodicClassification.receipt();
evaluateRunTerm(aperiodicClassification.receipt, receipt);
```
