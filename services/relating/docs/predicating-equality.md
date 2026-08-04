# Predicating Equality Receipts

`predicatingEqualityReceipt` is the finite executable shadow of `RelMath.
Predicating.
Equality`.

The Lean module derives equality from diagonal existential image instead of postulating an equality predicate:

- classical equality is the truth-order existential image of the diagonal truth terminal, so equal pairs read as `potential` and unequal pairs as `active`;
- paraconsistent equality is the knowledge-order existential image of the diagonal knowledge top, so equal pairs read as `stable` and unequal pairs as `absurd`;
- finite truth quantifiers use truth joins/meets over explicit fibers, with empty join `active` and empty meet `potential`.

```js
import {
  classicalEq,
  paraconsistentEq,
  predicating,
  predicatingEqualityReceipt,
  evaluateRunTerm,
} from "@emsenn/relating";

const receipt = predicatingEqualityReceipt([alpha, beta]);

classicalEq(alpha, beta).name;
// "active"

paraconsistentEq(alpha, alpha).name;
// "stable"

evaluateRunTerm(predicating.equality, receipt).kind;
// "predicating.equality.receipt:witness"
```

This surface is finite and carrier-first.
It does not claim a full executable hyperdoctrine over arbitrary base maps, but it does carry the concrete finite diagonal construction and truth-order fiber quantifier behavior that the runtime can inspect.
