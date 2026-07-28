# Discrete Set, Number, And Graph RMN

`analysis.discrete` is the finite runtime shadow of `RelMath.
Order.
SetNumberGraphTheory`.

It implements three discrete predication surfaces:

- finite powerset carriers with subset, intersection, union, complement, De Morgan, bounded-lattice, and complement-antitone receipts;
- finite Kuratowski pair equality and equivalence-partition receipts;
- bounded Nat semiring law checks;
- finite directed graph carriers with directed handshake, topological-order DAG, and tree edge-count receipts.

The root RMN catalog is `discreteTerms`, with identity normalizers over the computed carrier receipts.

```js
import { discreteTerms, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const graph = analysis.discrete.directedGraph(["root", "leaf"], [
  ["root", "leaf"],
]);

const receipt = analysis.discrete.directedHandshakeReceipt(graph);

evaluateRunTerm(discreteTerms.directedHandshake, receipt).directedHandshake;
// true
```

Boundary: this is a finite, explicit-carrier surface.
It does not claim arbitrary set-theoretic universes, unbounded Peano induction as runtime proof search, general graph reachability proof reconstruction, or the full tree-equivalence theorem beyond the implemented finite count receipt.
