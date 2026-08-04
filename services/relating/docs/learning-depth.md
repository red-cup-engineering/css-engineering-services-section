# Learning Depth Read

`@emsenn/relating` exposes learning depth as a small read over the existing closure-regime carrier:

```js
import * as settling from "@emsenn/relating/settling";

const admitted = settling.closureRegimeData(true, false, true);

if (admitted.kind === "settling.closureRegimeData:witness") {
  settling.learningDepthOfRegimeData(admitted.data).name;
  // "automatization"
}
```

This is the first package-side learning slice.
It reuses `ClosureRegime`; it does not introduce a second classifier.

## Mapping

| Closure regime | Learning depth | Reading |
| --- | --- | --- |
| `finite` | `rote` | finite practice |
| `scott` | `automatization` | limit practice |
| `transfinite` | `conceptual-change` | post-limit restructuring |
| `aperiodic` | `adaptive-expertise` | open-ended adaptation |

The mapping follows the content-local learning-cycle notes: learning is read as monotone inflationary closure, and the closure ordinal gives four regimes.
The Node package does not compute arbitrary closure ordinals.
It only reads the closure-regime data that the package already admits and classifies.

## API Reference

The generated API docs for `lib/articulating/predicating/positing/settling/learning-depth` cover the learning-depth transport:

- `learningDepthNames` lists the four public names in regime order.
- `learningDepthOfRegime` maps an already classified `ClosureRegime` to its learning-depth carrier.
- `learningDepthOfRegimeData` classifies admitted `ClosureRegimeData` through the existing closure-regime classifier and then reads the result as a learning depth.

For observed closure traces that use this vocabulary, see [`docs/learning-cycle.md`](learning-cycle.md).

## Public Handles

- `learningDepthNames`
- `learningDepthOfRegime`
- `learningDepthOfRegimeData`
- types: `LearningDepthName`, `LearningDepth`

For a runnable version, see [`examples/learning-depth.mjs`](../examples/learning-depth.mjs).

## Boundary

This is not a learning-cycle engine, documentation coverage analyzer, or educational measurement API.
It is a finite vocabulary transport:

```text
ClosureRegimeData -> ClosureRegime -> LearningDepth
```

Learning actions, learner-state carriers, and measured learning traces remain frontier work.

RelMath's `ClosureOrdinalRegime` is the stronger mathematical source: it classifies regime data into strict, Scott, transfinite-bounded, and aperiodic regimes.
This package module carries those regimes into the learning-depth names used by the current docs and examples.
