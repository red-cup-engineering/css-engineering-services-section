# Spectral RMN

`@emsenn/relating` implements the executable exact shadow of the Step-N spectral/Pisot/Mahler reads as integer-polynomial and matrix receipts:

- `analysis.rootLocation(poly)` locates polynomial roots relative to the unit circle using exact rational Routh-Hurwitz data after the Mobius transform.
- `analysis.pisotRoot(poly)` records Pisot witness/obstruction data.
- `analysis.rootIntersection(left, right)` and `analysis.inversionSymmetry(poly)` record resultant/reciprocal evidence.
- `analysis.dominantRootConvergence(poly)` records the exact rational power-iteration estimate for monic polynomials.
- `analysis.mahlerMeasure(poly)` records unit or dominant-root Mahler receipts.
- `analysis.matrixPisot(matrix)` pairs a characteristic polynomial with its Pisot judgment.
- `spectralTerms` exposes RMN normalizers for those receipts.

The runtime boundary is exact and finite.
Lean owns arbitrary spectral theory, topological classification, full Salem/Pisot theorem reconstruction, and real eigenvalue analysis.
The Node claim is portable RMN evidence for finite integer polynomials and matrices already computed by the exact analysis model.
Dominant root and Mahler receipts should pass an explicit finite iteration bound when the receipt will be serialized, because exact rational carriers grow rapidly.

```js
import { evaluateRunTerm, spectralTerms } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const fib = analysis.integerPolynomial([
  analysis.fromInt(-1),
  analysis.fromInt(-1),
  analysis.fromInt(1),
]);

const pisot = analysis.pisotRoot(fib);

evaluateRunTerm(spectralTerms.pisotRoot, pisot);
```
