# Observed Learning Cycle

`@emsenn/relating` exposes the current learning-cycle slice as a read over an already produced closure carrier:

```js
import * as settling from "@emsenn/relating/settling";

const closure = settling.closeOrdinalProcess(process);
const cycle = settling.learningCycleOfClosureCarrier(closure);

cycle.ascent.kind;
// "learning.cycle.observedAscent:witness"
```

This is not a learner model, educational measurement API, or global theorem about an arbitrary JavaScript callback.
It is the executable part the package can honestly own right now: given a bounded closure carrier, read the recorded orbit as an observed learning trace.

## What It Reads

`learningCycleOfClosureCarrier` returns:

- `ascent`: whether each recorded successor step ascends under the supplied lattice order
- `nontrivialReturn`: whether the recorded orbit returns to an earlier state before closure
- `stabilization`: the closure workbench's bounded stabilization judgment
- `depth`: the learning-depth read when the closure search found a regime, or `null` when the bounded search only returned an obstruction

The content-local learning-cycle notes say a monotone inflationary learning operator ascends and has no nontrivial cycles.
This module turns that into a package check over the orbit it actually sees.

## API Reference

Generated API docs expose the learning slice through two settling modules:

- `lib/articulating/predicating/positing/settling/learning-cycle` owns the observed orbit readers: `observedLearningAscent`, `observedLearningNontrivialReturn`, and `learningCycleOfClosureCarrier`.
- `lib/articulating/predicating/positing/settling/learning-depth` owns the regime vocabulary transport used by the cycle read when a closure search found a regime.

The public package import remains the settling subpath:

```js
import * as settling from "@emsenn/relating/settling";
```

## Public Handles

- `learningCycleOfClosureCarrier`
- `observedLearningAscent`
- `observedLearningNontrivialReturn`
- types: `ObservedLearningCycleRead`, `ObservedLearningAscentJudgment`, `ObservedLearningNontrivialReturnJudgment`

For a runnable version, see [`examples/learning-cycle.mjs`](../examples/learning-cycle.mjs).

## Boundary

The closure workbench stores the lattice, endomorphism, orbit, search result, and stabilization judgment.
The learning-cycle read does not re-run the proof story; it inspects that carrier.

```text
ClosureCarrier -> ObservedLearningCycleRead
```

Registered learning actions, RMN terms for learning reads, learner-state domains, and documentation-coverage carriers remain developer-frontier work.

## Mathematical Grounding

The content learning-cycle node frames learning as iteration of a monotone, inflationary closure operator and names two claims: ascent without nontrivial return, and four learning depths from closure-ordinal regimes.
RelMath currently grounds the package side through `RelMath.
Closure.
ClosureOrdinal` and `RelMath.
Closure.
ClosureOrdinalRegime`: the finite FOUR spine settles by step three, and regime data classifies into the four closure-ordinal regimes.

The Node module stays below that theorem level.
It reports what a `ClosureCarrier` recorded under the caller's supplied lattice and process.
