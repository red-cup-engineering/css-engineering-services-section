# Probability And Stochastic Settling

The probability/stochastic settling surface is the package's current executable slice of probability as valuation and Markov stationarity as a settling fixed point.
It is exported from `@emsenn/relating/settling`:

```js
import * as settling from "@emsenn/relating/settling";
```

The corresponding Relation Model Notation normalizers are exported from the root package as `probability`, so the witness carriers can be inspected through the same RMN evaluator used by the rest of the parity surfaces:

```js
import { evaluateRunTerm, probability } from "@emsenn/relating";
```

The live API is intentionally finite and exact.
Probability events are ordinary indicator functions over a listed sample space.
Measures are counting measures returning relating's exact `Natural` carrier.
Stochastic settling is expressed over an abstract semiring and a finite Markov kernel; the built-in concrete witness uses the natural-number counting semiring and a two-state identity kernel.

```js
import * as settling from "@emsenn/relating/settling";

const sample = settling.sampleSpace(["sun", "rain", "wind", "rain-wind"]);
const rainy = (outcome) => outcome.includes("rain");
const windy = (outcome) => outcome.includes("wind");

settling.measureIsValuation(sample, rainy, windy).kind;
// "settling.measureIsValuation:witness"

settling.conditionalViaFiberAdjoint(sample, rainy, windy).kind;
// "settling.conditionalViaFiberAdjoint:witness"

settling.markovStationaryIsClosureFixpoint(
  settling.witnessKernel,
  settling.natStochSemiring,
  settling.uniformWitness,
).kind;
// "settling.markovStationaryIsClosureFixpoint:witness"

evaluateRunTerm(probability.measureIsValuation, settling.measureIsValuation(sample, rainy, windy)).kind;
// "settling.measureIsValuation:witness"
```

For a runnable version, see [`examples/probability-stochastic-settling.mjs`](../examples/probability-stochastic-settling.mjs).

## Product Reading

Most software hides probability behind floats, sampling, and a lot of stateful process machinery.
This surface does something narrower and more auditable: it keeps the algebraic claim visible.

For probability, the claim is that a measure is a valuation.
A sample space and event predicates produce exact counts, then the package returns witnesses for the finite Kolmogorov-shaped checks it can actually decide: impossible event, certain event, disjoint additivity, monotonicity, and complement.

For conditioning, the claim is that conditioning is restriction into a fiber.
The package exposes the restricted numerator `mu(A and B)`, the Bayes numerator symmetry `mu(A and B) = mu(B and A)`, the marginal bound, and the reindexing functoriality.

For stochastic settling, the claim is that Markov stationarity is a closure fixed point.
A distribution is stationary exactly when advancing it through the kernel gives it back.
The current Node layer witnesses that equation and also connects the abstract stochastic semiring to the value-category settling hub.

The root `probability` RMN catalog is deliberately a normalizer layer, not a second probability implementation.
The carrier functions compute the finite facts; the terms normalize the resulting law witnesses into portable, inspectable Relation Model Notation.

In ordinary Node product words: this is a probability receipt surface.
It does not ask downstream code to trust a hidden simulation loop when the useful thing is a small, serializable witness about the algebra.

## API Reference

- finite sample/event carriers: `ProbabilityEvent`, `SampleSpace`, `sampleSpace`
- event algebra: `emptyEvent`, `univEvent`, `interEvent`, `unionEvent`, `complEvent`, `subsetEvent`, `disjointEvent`
- exact measures and law checks: `measure`, `total`, `measureEmpty`, `measureUniv`, `additivityOnDisjoint`, `monotonicity`, `complementLaw`, `measureIsValuation`, `MeasureIsValuationWitness`
- conditioning and reindexing: `condMeasure`, `reindexEvent`, `conditioningIsReindex`, `conditionalViaFiberAdjoint`, `ConditionalWitness`
- stochastic semiring and value-category bridge: `StochSemiring`, `stochSemiring`, `natStochSemiring`, `stochVC`, `stochVClosure`, `stochasticIsValueSettling`, `StochasticIsValueSettlingWitness`
- Markov kernel and stationarity: `MarkovKernel`, `markovKernel`, `kernelSum`, `advance`, `stochClosure`, `isStationary`, `markovStationaryIsClosureFixpoint`, `StationaryFixpointWitness`
- built-in witness: `witnessKernel`, `uniformWitness`, `uniformWitnessStationary`
- RMN witness normalizers from the root package: `probability.measureIsValuation`, `probability.conditionalViaFiberAdjoint`, `probability.markovStationaryIsClosureFixpoint`, `probability.stochasticIsValueSettling`

## Mathematical Grounding

`lean/RelMath/Probability/Measure.lean` carries the finite counting-measure spine: events over a listed sample space, exact natural-number measure, finite additivity on disjoint events, monotonicity, complement, and conditioning as restriction/reindexing.
The Node layer implements that as decidable witness data over relating's exact `Natural`, not as normalized real-valued probability.

`lean/RelMath/Probability/Stochastic.lean` carries the stochastic semiring and Markov-stationary-as-closure-fixed-point spine.
The Node layer implements an abstract semiring interface, a finite kernel, the row advance/closure equation, and the value-category bridge with a concrete natural-number witness.

The content nodes name the larger mathematical ambition: probability as `[0,1]`-valued positing and stochastic settling as continuous-valued Markov settling.
This package surface is intentionally smaller.
It exports the finite, exact, machine-checkable witness layer that can sit beneath those future continuous or numerical readings.

## Boundary

This is not a real-valued probability package, a statistics package, a random sampler, a Bayesian inference engine, a Markov-chain solver, or a Perron-Frobenius numerical implementation.
It does not normalize floating probabilities and does not prove arbitrary transition kernels lawful.

It currently exposes the finite/exact law surface the package can own: events as predicates over listed outcomes, measures as exact counts, conditioning as restriction/reindexing, and Markov stationarity as a fixed-point witness.
The mathematical backing lives in `lean/RelMath/Probability/Measure.lean` and `lean/RelMath/Probability/Stochastic.lean`; the closest content nodes are `content/.../probability-theory/probability-theory.md` and `content/.../continuous-valued-settling/content/stochastic-settling/stochastic-settling.md`.
