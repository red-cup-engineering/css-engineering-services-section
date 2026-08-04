# Optimization Settling

The optimization-settling surface is the package's executable reading of a simple but serious claim: an optimization problem is a settling problem when the measure, constraints, and improvement operation are carried explicitly.

It is exported from `@emsenn/relating/settling`:

```js
import * as settling from "@emsenn/relating/settling";
```

The live API does not expose a generic numerical solver.
It exposes the categorical shape underneath one: a `ValueCategory<T>` supplies the measure order and the constrained carrier, and a `VClosure<T>` supplies the monotone, inflationary, idempotent improvement operator.
The optimum is the fixed point reached by settling that closure.

```js
import { chargeValue } from "@emsenn/relating";
import * as settling from "@emsenn/relating/settling";

const target = chargeValue("stable");
const improve = settling.chargeJoinVClosure(target);
const problem = settling.optimizationProblem(
  settling.chargeValueCategory,
  improve,
);

const optimum = settling.optimum(problem, settling.chargeValueCategory.bot);
settling.locallyOptimal(problem, optimum); // true

settling.optimumIsFixedPoint(
  problem,
  settling.chargeValueCategory.bot,
).kind; // "settling.valueCategory.settleFixedPoint:witness"
```

For a runnable version, see [`examples/optimization-settling.mjs`](../examples/optimization-settling.mjs).

## Product Reading

Most Node optimization APIs make you hand over a cost function, a search strategy, and some mutable process state.
This surface is stranger and cleaner: it asks for the value order and the closure law.
From those, it can report the optimum as carrier data and return witnesses for the fixed-point and least-fixed-point facts it can check.

That makes it useful as an audit surface around "optimization" language.
A downstream package can ask:

- What order says this result is better?
- What carrier bounds the allowed values?
- What improvement operator was applied?
- Did the proposed optimum actually stop moving?
- Is the settled value the least fixed point above this seed?

In ordinary product words: this is an optimizer's proof receipt, not a black-box solver.

## API Reference

- problem shape: `OptimizationProblem`, `optimizationProblem`, `ofSettling`
- reads: `optimum`, `locallyOptimal`, `optimumReachable`
- witnesses: `optimumIsFixedPoint`, `settlingIsOptimization`
- metric gloss: `metricOptimumIsMinFixedPoint`
- common FOUR helpers from the value-category surface: `chargeValueCategory`, `chargeJoinVClosure`, `chargeSample`

## Mathematical Grounding

The content node `content/.../settling/content/operations-research/optimization.md` gives the received-math reading: optimization has a measure, constraints, and an improvement process whose endpoint is a point where no small change helps.
That endpoint is a fixed point.

`lean/RelMath/Value/Optimization.lean` makes the dictionary precise over the value-category settling hub:

- measure: the `ValueCategory` order, read as "better = higher"
- constraints: the `ValueCategory` carrier, the values the process stays within
- improvement: a `VClosure`, meaning monotone, inflationary, and idempotent
- optimum: `settle` of that closure from a seed

The Lean theorem proves the two directions this module exposes: the optimum is a fixed point of the improvement operator, and a value-category settling can be read as an optimization whose result is reachable, locally optimal, and least among fixed points above the seed.
The metric/shortest-path language is a gloss over that same abstract value-category statement; this package does not instantiate real-valued distances or run a numerical relaxation algorithm.

## Boundary

This is not a linear-programming, gradient-descent, shortest-path, or global numerical optimization library.
It does not discover an improvement operator for you, and it does not prove arbitrary host functions lawful.

It currently exposes the package-level law surface: once a caller has a value category and a closure/improvement operator, optimization is read as settling to a fixed point.
The mathematical backing lives in `lean/RelMath/Value/Optimization.lean` and the content node `content/.../settling/content/operations-research/optimization.md`.
