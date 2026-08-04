# Bigraded Diamond Receipts

`analysis.bigradedDiamond` is the finite FOUR executable shadow of `RelMath.
Positing.
BigradedDiamond` and the charge-level instance of `RelMath.
Positing.
NucleusAndCommutingNuclei`.

It records:

- the charge knowledge order as a four-element Heyting algebra;
- knowledge implication and the Heyting adjunction;
- knowledge-join nuclei `j_c(a) = c ∨_k a`;
- a commuting nuclear square with `pi = j1 . j2`;
- the `Fix(pi) = Fix(j1) ∩ Fix(j2)` law;
- the four corner operations: neither, `j1`, `j2`, and both;
- the Lean two-fiber varying family where the `true` fiber raises toward `potential` and the `false` fiber raises toward `active`.
- the K4-graded tower from `RelMath.
  Positing.
  BigradedDiamondTower`, including the knowledge/truth grade bits, grade-to-pole table, one same-order square per grade, and the carried cross-order obstruction showing truth closure is not a knowledge nucleus.

The root `bigradedDiamond` RMN catalog normalizes the receipt:

```js
import { bigradedDiamond, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const receipt = analysis.bigradedDiamond.receipt();

evaluateRunTerm(bigradedDiamond.receipt, receipt).family.varies;
// true

const tower = analysis.bigradedDiamond.towerReceipt();
evaluateRunTerm(bigradedDiamond.tower, tower).axesIndependent;
// true
```

This surface does not claim to reconstruct arbitrary Heyting algebras, host-function extensionality, infinite fixed-point subalgebras, or proof objects.
It computes the full finite FOUR knowledge-Heyting/nuclear-square instance and the K4-graded tower that the Lean bigraded-diamond modules use as their concrete recurrence.
