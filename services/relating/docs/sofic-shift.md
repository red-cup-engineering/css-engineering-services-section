# Sofic Shift Receipts

`analysis.sofic` is the finite executable shadow of `RelMath.
Aperiodic.
SoficShift`.

- `path(graph, word)` checks whether a word is a directed walk in a finite transition graph, the 1-step SFT reading.
- `soficImage(graph, factor, preimage)` computes a 1-block factor image of an admissible SFT word.
- `goldenForbidsBB()` carries the golden-mean witness that `bb` is forbidden.
- `fibSubstituteGolden(word)` carries the finite witness that the Fibonacci substitution lands in the golden-mean SFT.
- `fibDeepSofic(word)` carries the decorated-cover witness: the decorated finite-type word forgets back to the Fibonacci-substituted word.

The root `sofic` RMN catalog normalizes those receipts:

```js
import { evaluateRunTerm, sofic } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const deep = analysis.sofic.fibDeepSofic([0, 1, 0]);

deep.kind; // "sofic.fibonacciSubstitution.deep:witness"
evaluateRunTerm(sofic.fibDeepSofic, deep).kind;
// "sofic.fibonacciSubstitution.deep:witness"
```

This is intentionally finite.
It does not claim the full topological theory of all substitution subshifts or a recognizability theorem for arbitrary tilings; it claims the exact graph/path/factor receipts that the Node runtime can compute.
