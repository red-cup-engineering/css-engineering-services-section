# Value-Category Settling

The value-category settling surface is the package's current executable slice of continuous-valued settling.
It is exported from `@emsenn/relating/settling`:

```js
import * as settling from "@emsenn/relating/settling";
```

The live API is generic over a host value type `T`.
A `ValueCategory<T>` carries an equality, an order, and a bottom value; a `VClosure<T>` carries an endomap.
The package then provides finite/sample law judgments for the partial-order and closure laws, settling witnesses, closure-regime classifiers, and worked Boolean / FOUR recovery surfaces.

```js
import { chargeValue } from "@emsenn/relating";
import * as settling from "@emsenn/relating/settling";

const target = chargeValue("stable");
const closure = settling.chargeJoinVClosure(target);

settling.partialOrderOver(
  settling.chargeValueCategory,
  settling.chargeSample,
).kind; // "settling.valueCategory.partialOrder:witness"

const settled = settling.settleOverValue(
  closure,
  settling.chargeValueCategory.bot,
);

settling.settleFixedPoint(
  settling.chargeValueCategory,
  closure,
  settled,
).kind; // "settling.valueCategory.settleFixedPoint:witness"
```

For a runnable version, see [`examples/value-category-settling.mjs`](../examples/value-category-settling.mjs).

## Product Reading

This surface answers a very Node-shaped question: how do you let downstream code bring its own value lattice without losing the package's witness style?

The answer is small and inspectable.
A caller supplies the value carrier through functions; the package checks the order and closure laws over a finite sample; then settling and regime classification return ordinary carrier-shaped witnesses or obstructions.
For finite `V`, pass the whole carrier as the sample.
For larger `V`, the result is honestly sample-checked, not globally proven.

The built-in `chargeValueCategory` is the FOUR case.
The built-in `booleanValueCategory` is the Boolean case.
`spineRecovery(k)` witnesses that a charge knowledge-join closure settles the FOUR bottom to the chosen target `k`, which is the package's finite executable echo of the Lean theorem that the FOUR spine is the `V = FOUR` case.

## API Reference

The generated API docs for `lib/articulating/predicating/positing/settling/value-category` expose four clusters:

- value-category admission: `valueCategory`, `partialOrderOver`, `ValueCategory`, and `PartialOrderJudgment`
- closure and fixed-point reads: `vClosure`, `closureOver`, `settleOverValue`, `settleFixedPoint`, and `settleLeast`
- regime reads: `closureRegimeData`, `classifyRegime`, `fourRegimeDichotomy`, `regimeOfValueSettling`, `fourRegimeValueIndependent`, and `cohomologyVanishesInRegime`
- built-in recoveries: `chargeValueCategory`, `chargeJoinVClosure`, `booleanValueCategory`, `booleanJoinVClosure`, and `spineRecovery`

The law checks are finite/sample judgments.
For a finite `V`, the sample can be the whole carrier; for a larger value category, the result is evidence about the sample supplied by the caller.

## Useful Handles

- value categories: `valueCategory`, `partialOrderOver`, `chargeValueCategory`, `booleanValueCategory`
- closures: `vClosure`, `closureOver`, `chargeJoinVClosure`, `booleanJoinVClosure`
- settling witnesses: `settleOverValue`, `settleFixedPoint`, `settleLeast`, `spineRecovery`
- regime classifiers: `closureRegimeData`, `classifyRegime`, `fourRegimeDichotomy`, `regimeOfValueSettling`, `fourRegimeValueIndependent`, `cohomologyVanishesInRegime`

## Boundary

This is not yet a general continuous-valued settling runtime.
It does not ship Lawvere-quantale arithmetic, fuzzy `[0,1]` operators, measurable presheaves, PDE-style continuous-time convergence, or global proofs for arbitrary host functions.
It ships the current package-level executable layer: value categories as TypeScript functions, finite/sample law judgments, smart admission for closure-regime data, and recovery witnesses for Boolean and FOUR.

The mathematical backing lives in `lean/RelMath/Value/SettlingOverValueCategory.lean` and `lean/RelMath/Closure/ClosureOrdinalRegime.lean`; the broader content node is `content/.../continuous-valued-settling/continuous-valued-settling.md`.
