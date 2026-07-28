# Settling Associated Sheaf

`analysis.settlingAssociatedSheaf` is the finite executable surface for `RelMath.
Cohomology.
SettlingAssociatedSheaf`.

It models the runtime parts of the Lean module:

- charge-valued cells;
- the masks `dT`, `dK`, and `dTop`;
- safe-integer cochains over finite cells;
- masked restriction;
- `iota`, `pi`, `projT`, `projTop`, and `combine`;
- a finite receipt for the split designated short exact sequence `0 -> F_U -> F_U^(k) -> F_U^(top) -> 0`;
- a root RMN normalizer at `settlingAssociatedSheaf.receipt`.

```js
import { evaluateRunTerm, settlingAssociatedSheaf } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.settlingAssociatedSheaf.receipt();

receipt.masks.dK.cells;
// ["truth-cell", "both-cell"]

receipt.ses.splitReconstructs;
// true

evaluateRunTerm(settlingAssociatedSheaf.receipt, receipt);
// the same receipt
```

Lean proves the restriction and short-exact-sequence laws for arbitrary integer cochains.
The Node surface carries the finite operations and a bounded sample-law receipt.
General sheaf gluing, arbitrary covers, and non-finite bitopological site semantics remain proof/kernel obligations.
