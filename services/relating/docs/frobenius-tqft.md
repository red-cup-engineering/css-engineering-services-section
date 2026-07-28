# Settling Frobenius TQFT

`analysis.frobeniusTqft` is the finite runtime surface for `RelMath.
Value.
SettlingFrobeniusTQFT`.

The worked carrier is `Z[x]/(x^2)`, represented as integer pairs `{ unit: a, top: b }` for `a + b*x`.

The surface exposes:

- `z2`, `add`, `neg`, `mul`, `counit`, `comul`, and `degreeOfClass`;
- `checkLaws`, a finite sample checker for the module, multiplication, counit, Frobenius compatibility, and `x^2 = 0` laws;
- `degreeReceipt`, placing `H0` on the unit axis, `H1` on the top axis, and degrees above one at zero;
- `tqftReceipt`, the Abrams generator package for the worked commutative Frobenius algebra;
- `receipt`, combining the law, degree, TQFT, and K4-grading receipts under an RMN normalizer.

Lean proves the algebraic laws for all integers.
The Node receipt carries the executable operations and a declared finite law sample; arbitrary proof reconstruction and the full symmetric monoidal `2Cob -> Mod_Z` equivalence remain proof-side.

```js
import { evaluateRunTerm, frobeniusTqft } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.frobeniusTqft.receipt();
evaluateRunTerm(frobeniusTqft.receipt, receipt);
```
