# Four-Corner Cell Receipts

`fourCornerCellReceipt` is the finite executable shadow of `RelMath.
Articulating.
FourCornerCell`.

Lean proves that an articulation phase is a `Bool x Bool` four-corner and that the initial articulation cell sits at the knowledge-bottom charge.
The JS package already has a public FOUR charge algebra, but its value names follow the current package convention:

| Slot pair | Lean corner | Lean charge alias | JS charge name |
| --- | --- | --- | --- |
| `(false, false)` | `potential` | `kBot` | `absurd` |
| `(true, false)` | `active` | `tTop` | `potential` |
| `(true, true)` | `absurd` | `kTop` | `stable` |
| `(false, true)` | `stable` | `tBot` | `active` |

The receipt keeps both names instead of renaming the existing API.
Its claim is coordinate-level parity: the articulation phase and the charge value carry the same two bits.

```js
import {
  articulate,
  fourCornerCell,
  fourCornerCellReceipt,
  mark,
  utterance,
  evaluateRunTerm,
} from "@emsenn/relating";

const cell = articulate(utterance(mark("token"), mark("claim")));
const receipt = fourCornerCellReceipt(cell);

receipt.cellReading.corner;
// "potential"

receipt.cellReading.chargeName;
// "absurd"

evaluateRunTerm(fourCornerCell.receipt, receipt).kind;
// "fourCornerCell.receipt:witness"
```

This surface does not claim that the public JS charge names have been changed to Lean's phase names.
It records the bridge explicitly so downstream packages can use the existing charge algebra while still carrying the Lean four-corner theorem as normalized receipt data.
