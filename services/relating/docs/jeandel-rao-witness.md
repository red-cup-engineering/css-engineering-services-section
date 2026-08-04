# Jeandel-Rao Witness

`analysis.jeandelRaoWitness` is the finite runtime surface for `RelMath.
Aperiodic.
Witness.
JeandelRao`.

It carries the two one-vertex Anderson-Putnam cochain complexes from Lean:

- `jrComplex` with the decorated cochain `phi`;
- `markerRingComplex` with the marker-ring class `b3`.

For each witness, the package computes the degree-1 coboundary `delta1`, checks closedness, finds a nonzero supporting edge, records that `delta0` vanishes in the one-vertex complex, and computes the finite `H1` rank as `|edges| - rank(delta1)`.

The runtime claim is deliberately local: these receipts prove finite nonzero `H1` representatives for the Lean witness complexes.
They do not prove Jeandel-Rao aperiodicity, a direct-limit `clInv` class, persistence through marker/desubstitution maps, or a complete MLD invariant.

```js
import { evaluateRunTerm, jeandelRaoWitness } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.jeandelRaoWitness.receipt();
evaluateRunTerm(jeandelRaoWitness.receipt, receipt);
```
