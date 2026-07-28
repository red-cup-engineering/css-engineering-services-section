# Closure Operator Fiber Receipts

`chargeClosureCarrier`, `pointwiseClosureFamilyReceipt`, `cosettlingReceipt`, and `closureMonadReceipt` are the finite executable shadow of `RelMath.
Closure.
ClosureOperatorFiber`, `RelMath.
Closure.
SettlingMonotonicityQuiescence`, and `RelMath.
Closure.
ClosureMonad`.

A `ChargeClosureCarrier` is an explicit operation table over the four charge values.
Construction validates the Lean `Charge.
Closure` laws in the knowledge order:

- inflationary: `a <=k cl(a)`;
- monotone: `a <=k b` implies `cl(a) <=k cl(b)`;
- idempotent: `cl(cl(a)) = cl(a)`.

`knowledgeJoinClosure(k)` is the worked Lean `joinClosure k`: it closes any charge by joining with the knowledge bound `k`.

The pointwise family lifts a charge closure over a finite valuation fiber.
The receipt checks:

- pointwise inflationary, monotone, and idempotent laws;
- no non-trivial periodic orbits, by exhaustive finite orbit checks;
- C-naturality for an explicit finite reindex map;
- closure-merge: `cl(cl(X) joinK Y) = cl(X joinK Y)`;
- `cl(seed)` as the least fixed point above the seed;
- reachability by three;
- monotone closure orbit and quiescence-as-fixed-point.

`cosettlingReceipt` enumerates the finite preimage set of a closure-stable top valuation and checks containment, maximum, and closure under pointwise knowledge join, giving the finite join-subsemilattice-with-top reading.

`closureMonadReceipt` packages the finite charge-level settling endofunctor `F_U(v) = Cl(v) joinK U`.
The receipt checks the executable fragment of the Lean closure-monad laws:

- KZ iff strict for the inflationary closure;
- no non-trivial periodic charge orbits;
- settling-step inflation;
- settling by three;
- unit inflation;
- multiplication/idempotence;
- the finite counit triangle.

```js
import {
  closureFamily,
  closureMonadReceipt,
  evaluateRunTerm,
  knowledgeJoinClosure,
  pointwiseClosureFamilyReceipt,
  valuationFiberCarrier,
} from "@emsenn/relating";

const closure = knowledgeJoinClosure("potential");
const seed = valuationFiberCarrier(["cell"], { cell: "absurd" });
const receipt = pointwiseClosureFamilyReceipt(closure, seed);
const monad = closureMonadReceipt(closure, "active", "absurd");

receipt.closed.values.cell;
// "potential"

evaluateRunTerm(closureFamily.pointwise, receipt).closureMerge;
// true

evaluateRunTerm(closureFamily.monad, monad).settled;
// "stable"
```

This surface is finite and pointwise.
It does not claim arbitrary closure-family proof reconstruction, non-pointwise modal closures under unrestricted base maps, infinite valuation fibers, arbitrary 2-categorical KZ data, or a runtime proof of the non-general cosettling failure modes.
Those remain Lean/proof-kernel obligations.
