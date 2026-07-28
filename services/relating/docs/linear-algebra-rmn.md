# Linear Algebra RMN

`@emsenn/relating` implements the executable finite shadow of `RelMath.
LinearAlgebra.
Basic` and `RelMath.
LinearAlgebra.
RankNullity` as exact integer matrix receipts:

- `analysis.linearAlgebra.matrixShape(matrix)` records row/column dimensions as exact naturals.
- `analysis.linearAlgebra.squareMatrixInvariants(matrix)` records determinant, characteristic polynomial, rank, and Smith normal form for square matrices.
- `analysis.linearAlgebra.rankNullity(matrix)` reads a finite matrix as a map from `Z^columns` to `Z^rows` and records `rank + nullity = domainDimension`.
- `linearAlgebraTerms` exposes RMN normalizers for those finite receipts.

The runtime boundary is intentionally finite and matrix-based.
Lean owns the abstract vector-space, basis-extension, subspace-dimension, and arbitrary-field rank-nullity proof.
The Node claim is exact carrier evidence over finite integer matrices, suitable for downstream packages that need a portable dimension/rank receipt without introducing a theorem prover.

```js
import { evaluateRunTerm, linearAlgebraTerms } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const matrix = analysis.fromInts([
  [1, 0, 1],
  [0, 1, 1],
]);

const receipt = analysis.linearAlgebra.rankNullity(matrix);

evaluateRunTerm(linearAlgebraTerms.rankNullity, receipt);
```
