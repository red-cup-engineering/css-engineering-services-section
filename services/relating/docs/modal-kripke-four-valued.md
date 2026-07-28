# Modal Kripke FOUR Receipts

`modalKripkeFrame` and `modalKripkeReceipt` are the finite executable shadow of `RelMath.
Positing.
ModalKripkeFourValued`.

The carrier is a finite set of world keys plus a crisp accessibility relation: `accessibility[world]` is the finite fiber of worlds reachable from `world`.
Given a FOUR-valued valuation over worlds:

- `possibilize` reads possibility as the knowledge join over each accessibility fiber, with the empty fiber reading as `absurd`;
- `necessitate` reads necessity as the knowledge meet over each accessibility fiber, with the empty fiber reading as `stable`;
- `modalKripkeFrame` classifies the relation as `K`, `T`, `S4`, or `S5` by reflexivity, transitivity, and symmetry;
- `modalKripkeReceipt` exhaustively checks the finite K monotonicity, T inflation/deflation, S4 idempotence, S5 forgetful, and FOUR twist-split negation laws for frames of at most five worlds.
- `closureOp` is the modal-pair composite `□◇`.
  On S5 frames the receipt also checks the diamond-box adjunction, commutating comparison, `□◇ = ◇`, and the closure-operator laws: inflationary, monotone, and idempotent.

```js
import {
  evaluateRunTerm,
  modalKripke,
  modalKripkeFrame,
  modalKripkeReceipt,
} from "@emsenn/relating";

const frame = modalKripkeFrame(["here", "there"], {
  here: ["here", "there"],
  there: ["there"],
});

const receipt = modalKripkeReceipt(frame, {
  here: "potential",
  there: "active",
});

receipt.frame.frameClass;
// "S4"

evaluateRunTerm(modalKripke.receipt, receipt).s4DiamondClosure;
// true
```

This surface is finite and relation-shaped.
It does not claim arbitrary or infinite Kripke fibrations, bilattice-valued accessibility weights, unrestricted C-naturality for modal closures, cosettling subsemilattice proofs, or host-side proof reconstruction.
Those remain proof/kernel obligations; the Node model makes the constructive finite accessible-fiber calculus inspectable as carrier/RMN data.
