# Ordinal Closure Receipts

`analysis.ordinalClosure` is the finite/symbolic executable shadow of `RelMath.
Closure.
OrdinalCore` and `RelMath.
Closure.
Ordinal`.

It uses the existing settling closure ordinal carriers and records:

- `ofNat n` as finite successor towers;
- `isFinite` for finite ordinals versus named limits;
- finite ordinals classifying as the finite/strict closure regime;
- `omega` as the named Scott limit when Scott-continuity is supplied;
- non-Scott countable limits as transfinite, and non-Scott uncountable shadows as aperiodic;
- the old Boolean `ClosureRegimeData` classifier as the shadow of ordinal finiteness.

The root `ordinalClosure` RMN catalog normalizes the receipt:

```js
import { evaluateRunTerm, ordinalClosure } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.ordinalClosure.receipt(3);
evaluateRunTerm(ordinalClosure.receipt, receipt).omega.regimeWhenScott.kind;
// "ordinal.closure.regime.scott"
```

## Boundary

This is not a general JavaScript runtime for arbitrary Lean `Nat -> Ord` fundamental sequences.
The executable claim is limited to finite successor towers and named fundamental-sequence prefixes such as `omega` and `omegaShift`; arbitrary limit functions, proof-producing least-upper-bound arguments, and ordinal self-indexing remain Lean/proof-side obligations.
