# Closure Rule System RMN

`analysis.closureRule` is the finite runtime shadow of `RelMath.
Closure.
ClosureRuleSystem`.

It represents a positive closure-rule language as explicit finite carriers:

- a rule antecedent is a list of knowledge-order threshold checks on cells;
- a rule consequent raises one cell to a charge by knowledge join;
- `tstep` is the immediate-consequence operator;
- `closureRuleReceipt` iterates `tstep` to a fixed point and checks inflation, monotonicity, rule-respecting, least-closed, and lfp receipts over the finite carrier.

The RMN surface is `closureRule.receipt` and `closureRule.always`; both normalize the computed carrier receipts so downstream packages can carry the fixed-point evidence as portable relation-model notation.

```js
import { closureRule, evaluateRunTerm } from "@emsenn/relating";
import * as analysis from "@emsenn/relating/analysis";

const system = analysis.closureRule.closureRuleSystem(
  ["claim", "reply"],
  [
    analysis.closureRule.alwaysRule("claim", "potential"),
    analysis.closureRule.closureRule(
      "claim-supports-reply",
      [{ cell: "claim", atLeast: "potential" }],
      { cell: "reply", charge: "active" },
    ),
  ],
);

const receipt = analysis.closureRule.closureRuleReceipt(
  system,
  analysis.closureRule.knowledgeLeastValuation(system.cells),
);

evaluateRunTerm(closureRule.receipt, receipt).lfp; // true
```

Boundary: this is not arbitrary Lean predicates as JavaScript functions.
It is the positive, quantifier-free, finite threshold fragment where monotonicity and least fixed points can be checked exhaustively.
