# Dihedral Gauge

The dihedral gauge is the order-eight symmetry surface of the FOUR charge values.
The smaller FOUR gauge in [FOUR charge algebra](four-charge-algebra.md) is the Klein-four family `K4 = { id, negation, conflation, double }`; it moves inside the two orders.
The missing symmetry is the order-swap `sigma`: it keeps the truth side and complements the falsity side, so it exchanges the knowledge and truth orders.

Adjoining `orderSwapValue` to the K4 gauge gives the D4 surface:

```js
import {
  chargeValue,
  dihedral,
  dihedralMul,
  dihedralOrderEffect,
  orderSwapIso,
} from "@emsenn/relating";

dihedral("order-swap", chargeValue("absurd")).name; // "active"
dihedralOrderEffect("order-swap"); // "order-swapping"
dihedralMul("order-swap", "negation"); // "order-swap-conflation"
orderSwapIso(chargeValue("absurd"), chargeValue("potential")).kind;
// "dihedral-gauge.orderSwapIso:witness"
```

Useful handles:

- elements: `dihedralElementNames`, `DihedralElementName`
- action: `orderSwapValue`, `dihedral`, `dihedralMul`, `dihedralFixedSet`
- coset reads: `dihedralOrderEffect`, `dihedralSwapsOrders`
- law witnesses: `orderSwapIso`, `dihedralConjugation`

## API Reference

The generated TypeDoc module is `lib/articulating/predicating/positing/dihedral-gauge`.
It is the code-adjacent reference for the exported carrier names, action, multiplication, fixed-set reader, coset reader, and witness/obstruction result shapes.

Use the hand-written page here for the product boundary: D4 is exposed as the value-level symmetry algebra of FOUR.
It is not an evidence-level transform, and it does not project a settling sheaf or gauge bundle by itself.

## What It Means

`orderSwapValue` is the cross-order isomorphism:

```text
a <=knowledge b  iff  sigma(a) <=truth sigma(b)
```

The package exposes that as `orderSwapIso(left, right)`, returning either a witness or an obstruction-shaped value.
For the implemented FOUR table, every pair witnesses the isomorphism.

The full D4 action splits into two visible cosets:

- `id`, `negation`, `conflation`, `double` preserve each order
- `order-swap`, `order-swap-negation`, `order-swap-conflation`, `order-swap-double` exchange the two orders

The multiplication is derived from the action on values, so `dihedralMul(g, h)` means the unique element whose value action equals `g(h(value))`.
The example prints a noncommuting pair:

```text
order-swap · negation = order-swap-conflation
negation · order-swap = order-swap-negation
```

## Boundary

This is a value-level gauge, not an evidence-level carrier transform.
The order-swap complements one evidence side; accumulated witness lists do not carry enough information to perform that complement lawfully.
Use the D4 helpers to read the algebra of FOUR values, not to rewrite evidence logs.

The surface is also not claiming every Lean theorem as a runtime oracle.
The source and tests mirror the Lean vocabulary around `OrderSwapDuality`, `KleinFourGauge`, and `D4Gauge`; the committed Lean golden-vector bridge covers other finite surfaces.
Here, the Node contract is the public API, tests, and runnable example.

For a runnable version, see [`examples/dihedral-gauge.mjs`](../examples/dihedral-gauge.mjs).
