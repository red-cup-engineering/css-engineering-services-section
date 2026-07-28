# Valuation Fiber Algebra Receipts

`valuationFiberAlgebraReceipt` is the finite executable shadow of `RelMath.
Positing.
ValuationFiberAlgebra` and `RelMath.
Positing.
ValuationQuartetDischarge`.

The carrier is a finite valuation fiber: ordered point keys plus one FOUR charge value per point.
The runtime lifts the Lean charge-level operations pointwise:

- truth meet, truth join, and truth Heyting implication;
- the truth order on finite valuations;
- truth nuclei `sigma` and `delta`, implemented as truth-closures toward `potential` and `stable`;
- the composite `pi = sigma . delta`;
- the cross-order finding that a truth-closure need not be a knowledge nucleus.

`quartetRecurrenceReceipt` is the finite recurrence cell from `RelMath.
Positing.
QuartetRecurrence`: modal corners round-trip through the same four `Corner` names, twistoring is the commuting `negate/conflate` square on FOUR, and commutating is the commuting `sigma/delta` square on the valuation fiber.

```js
import {
  evaluateRunTerm,
  valuationFiberAlgebra,
  valuationFiberAlgebraReceipt,
  valuationFiberCarrier,
} from "@emsenn/relating";

const fiber = valuationFiberCarrier(["a", "b"], {
  a: "active",
  b: "stable",
});

const receipt = valuationFiberAlgebraReceipt(fiber);

receipt.sigmaDeltaCommute;
// true

evaluateRunTerm(valuationFiberAlgebra.receipt, receipt).abstractQuartetDischarged;
// true
```

This surface is finite and pointwise.
It does not claim arbitrary predicate families, infinite valuation spaces, or host-language proof reconstruction for abstract Heyting algebras; it makes the concrete FOUR valuation fiber and quartet discharge inspectable as carrier/RMN data.
