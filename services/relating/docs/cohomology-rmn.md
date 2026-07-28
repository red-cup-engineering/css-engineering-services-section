# Finite Cohomology RMN

`@emsenn/relating` implements the executable part of the green RelMath cohomology spine as finite carrier reads:

- `cohomologyOfCells(cells)` computes exact predication H0/H1 over a finite cell complex.
- `cohomologyLaplacianOfCells(cells)` computes the incidence/Laplacian view and the H0-kernel/H1-cokernel rank-identity receipts.
- `bigradedCohomologyOfCharges(values)` separates the truth row from the held contradiction row and records whether the bigrading collapses.
- `cohomologyTerms` exposes RMN normalizers for those carriers, plus rank judgments and settlement-H1 receipts.

The implemented surface is intentionally finite and serializable.
Lean owns the abstract sheaf, associated-sheaf, KZ, quantale-enriched, bitopological, and transfinite-cell-complex proof obligations.
The runtime claim is the finite H0/H1/Laplacian/bigraded shadow that downstream packages can compute and record as relation-model notation.

```js
import {
  cell,
  claim,
  cohomologyOfCells,
  cohomologyTerms,
  evaluateRunTerm,
  mark,
  predicateOfClaim,
  token,
} from "@emsenn/relating";

const a = token(mark("a"));
const b = token(mark("b"));
const c = token(mark("c"));
const relates = predicateOfClaim(claim(mark("relates")));

const cycle = cohomologyOfCells([
  cell(a, relates, b),
  cell(b, relates, c),
  cell(c, relates, a),
]);

evaluateRunTerm(cohomologyTerms.carrier, cycle);
```
