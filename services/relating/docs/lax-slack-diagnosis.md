# Lax Slack Diagnosis Receipts

`analysis.laxSlack` is the finite executable shadow of `RelMath.
Closure.
LaxSlackDiagnosis`.

It exposes three receipt families:

- `kzStrictCollapse(system, point)` checks the Lean claim that, on an antisymmetric finite carrier, KZ inequality plus inflation collapses to strict idempotence.
- `laxSlackAntisymmetryFailure(system, point)` checks the converse diagnostic: genuine lax slack gives a pair related both ways but not equal.
- `chargeNoLaxSlack(target)` checks the concrete FOUR knowledge-order case: charge join closures have no genuine lax slack.

The root `laxSlack` RMN catalog normalizes those receipts:

```js
import { evaluateRunTerm, laxSlack } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.laxSlack.chargeNoLaxSlack("stable");
receipt.kind; // "laxSlack.chargeNoLaxSlack:witness"

evaluateRunTerm(laxSlack.chargeNoLaxSlack, receipt).kind;
// "laxSlack.chargeNoLaxSlack:witness"
```

This is intentionally finite.
It does not decide arbitrary host-language preorders or closures.
It claims the finite table diagnostics and the built-in FOUR/knowledge-order no-lax-slack receipt.
