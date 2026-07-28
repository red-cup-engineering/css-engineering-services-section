# Twist Product Receipts

`analysis.twistProduct` is the finite executable shadow of `RelMath.
Order.
TwistProductResiduation`.

It specializes the Lean theorem to `Two`, the Boolean residuated lattice, and checks that the Boolean twist product `Two^twist` is exactly the package's existing FOUR charge algebra:

- Boolean pairs `(positive, negative)` round-trip with charge values;
- twist knowledge and truth orders match the charge knowledge/truth orders;
- twist negation matches charge negation;
- knowledge and truth meet/join match the charge lattice operations;
- twist fusion and residual satisfy the truth-order residuation adjunction;
- fusion is commutative and has unit `stable`;
- the fusion unit is not the truth top `potential`, so the twist product is non-integral in the truth order;
- the consistent fragment is `absurd`, `potential`, `active`.

The root `twistProduct` RMN catalog normalizes the receipt:

```js
import { evaluateRunTerm, twistProduct } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.twistProduct.fourTwistProduct();

evaluateRunTerm(twistProduct.four, receipt).kind;
// "twistProduct.four:witness"
```

This is intentionally finite.
It does not prove Avron representation for all bounded interlaced bilattices or arbitrary residuated bases.
It claims the runtime-relevant `FOUR = Two^twist` case and the finite truth-order residuation table that underlies the package's linear-logic operations.
