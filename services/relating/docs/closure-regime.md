# Closure Regime Workbench

The closure-regime surface is the package's small bounded fixed-point engine.
It is exported from `@emsenn/relating/settling`, not as a separate package:

```js
import * as settling from "@emsenn/relating/settling";
```

The core shape is deliberately plain Node: provide a lattice and a monotone endomorphism, then run `closeOrdinalProcess`.
The result is carrier-shaped data: the searched orbit, the stabilization judgment, and the finite / Scott / transfinite regime read.

The caller owns the lawfulness of the lattice and endomorphism.
The package does not prove that an arbitrary JavaScript callback is monotone or inflationary; it records what the bounded closure search observes over the carrier you provide.
That is the useful Node boundary: the convergence loop stops being hidden control flow and becomes a value with a witness-or-obstruction shape.

```js
const process = settling.closureProcess(
  {
    bottom: 0,
    leq: (left, right) => left <= right,
    join: (left, right) => Math.max(left, right),
    eq: (left, right) => left === right,
    sup: (sequence) => {
      let previous = sequence(natZero);
      for (let n = successor(natZero); ; n = successor(n)) {
        const current = sequence(n);
        if (current === previous) return current;
        previous = current;
      }
    },
  },
  (value) => Math.min(3, value + 1),
);

const closed = settling.closeOrdinalProcess(process);
closed.search.kind; // "ordinal.closure.stabilizationSearch:witness"
closed.search.regime.kind; // "ordinal.closure.regime.finite"
```

For a runnable version, see [`examples/closure-regime.mjs`](../examples/closure-regime.mjs).

## Product Reading

This is the programmable part of the closure story already present in RelMath and the content notes: a learning, settling, or analysis process can be read as iteration of a monotone endomorphism toward a fixed point.
In ordinary Node code that usually becomes a loop with an undocumented stop condition.
Here the loop is made explicit as data: bottom, join, equality, successor stages, limit stages, bounded search horizon, and witness-or-obstruction output.

The connection to the learning-cycle notes is real but should be stated carefully.
The content paper models learning as monotone inflationary closure and uses closure ordinals to distinguish finite, omega, bounded-transfinite, and aperiodic regimes.
The Node package currently ships the reusable bounded closure engine and the finite/Scott/transfinite regime vocabulary.
It also ships a separate Diataxis FOUR read over charge values.
It does not yet ship a learning-cycle carrier, registered learning action, or educational measurement API.

## Useful Handles

- ordinals: `zeroOrdinal`, `successorOrdinal`, `finiteOrdinal`, `omegaOrdinal`, `omegaMultipleOrdinal`, `omegaSquaredOrdinal`
- lattice support: `stabilizingSup`
- judgments: `finiteOrdinalJudgment`, `closureStabilizationAt`, `closureRegimeOfOrdinal`
- engine: `closureProcess`, `closeOrdinalProcess`, `closureOrbitOfProcess`, `closureStabilizationSearchHorizon`
- regimes: `finiteClosureRegime`, `scottClosureRegime`, `transfiniteClosureRegime`, `aperiodicClosureRegime`

## Boundary

This surface is not a full ordinal library.
Limit ordinals are represented by labels and fundamental sequences, and the search is intentionally bounded.
It can witness finite stabilization and bounded regime reads in Node; it does not compute arbitrary transfinite closure ordinals, prove Scott-continuity for an unknown endomorphism, or replace the Lean proofs around `ClosureOrdinal` and `ClosureOrdinalRegime`.
