# Predicating Quantifying Receipts

`predicatingQuantifyingReceipt` is the finite executable shadow of `RelMath.
Predicating.
Quantifying`.

The carrier is a finite fibration: source keys, target keys, and a total base map from source to target.
Fibers are derived from that map, so quantifier receipts cannot quietly disagree with their preimage data.

- `existsF` folds each fiber by order join.
- `forallF` folds each fiber by order meet.
- knowledge empty join/meet are `absurd` and `stable`.
- truth empty join/meet are `active` and `potential`.
- receipt construction checks the finite adjunction equations over all FOUR-valued valuations on the carrier.

`predicatingHyperdoctrineReceipt` models the finite converse/bijection case from `RelMath.
Predicating.
Hyperdoctrine`: converse is an involutive base isomorphism, so reindexing, existential image, and universal image coincide for singleton fibers in both orders.
The receipt also checks the converse Frobenius law for the given valuation.

`predicatingDualHyperdoctrineReceipt` models `RelMath.
Predicating.
PredicationHyperdoctrineDual`: the existing `orderSwapValue` sigma map conjugates knowledge-order quantifiers to truth-order quantifiers.

```js
import {
  evaluateRunTerm,
  finitePredicatingFibration,
  predicating,
  predicatingQuantifyingReceipt,
} from "@emsenn/relating";

const fibration = finitePredicatingFibration(["a", "b"], ["x"], {
  a: "x",
  b: "x",
});

const receipt = predicatingQuantifyingReceipt(fibration, {
  a: "potential",
  b: "active",
});

receipt.existsKnowledge.x;
// "stable"

evaluateRunTerm(predicating.quantifying, receipt).knowledgeAdjunctionFinite;
// true
```

This is still a finite runtime surface.
It does not claim arbitrary host-language base maps, infinite fibers, or proof reconstruction for general hyperdoctrines.
It does make the exact finite list-quantifier, converse-isomorphism, and sigma-transport laws inspectable as carrier/RMN data.
