# Lawvere Laplacian RMN

`@emsenn/relating` implements the executable finite shadow of `RelMath.
Cohomology.
LawvereHarmonicCohomology` and `RelMath.
Flow.
LawvereLaplacianSpectralGap` as exact carrier reads over finite relation graphs:

- `analysis.relationGraphOfCells(cells)` derives a weighted undirected relation graph from predication cells.
- `analysis.laplacianOf(graph)` computes the exact combinatorial Laplacian.
- `analysis.harmonic(graph, values)` returns a harmonic witness or the first exact obstruction.
- `analysis.spectrumPolynomial(graph)`, `analysis.graphSpectrum(...)
  `, and `analysis.hodgeDecomposition(graph)` expose characteristic-polynomial, Matrix-Tree, component, exact-flow, and cycle-flow receipts.
- `analysis.signedBalance(...)
  ` and `analysis.diffusionDirections(...)
  ` carry the finite signed-cohomology and diffusion-settlement shadows.
- `laplacianTerms` exposes RMN normalizers for these finite carriers.

This surface is intentionally finite and exact.
Lean owns the general Lawvere-enriched cohomology proofs, arbitrary spectral-gap theorems, analytic limits, and infinite sheaf obligations.
The runtime claim is that downstream packages can record finite graph/harmonic/Hodge evidence as portable RMN data.

```js
import {
  cell,
  claim,
  evaluateRunTerm,
  laplacianTerms,
  mark,
  predicateOfClaim,
  token,
} from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const a = token(mark("a"));
const b = token(mark("b"));
const c = token(mark("c"));
const relates = predicateOfClaim(claim(mark("relates")));

const graph = analysis.relationGraphOfCells([
  cell(a, relates, b),
  cell(b, relates, c),
  cell(c, relates, a),
]);

const harmonic = analysis.harmonic(graph, [
  analysis.ratZero,
  analysis.ratZero,
  analysis.ratZero,
]);

evaluateRunTerm(laplacianTerms.harmonic, harmonic);
```
