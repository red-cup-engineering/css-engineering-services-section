# FOUR Charge Algebra

The FOUR charge algebra is the package's smallest value substrate.
A relation does not carry one Boolean; it carries two evidence sides:

- `absurd`: no positive evidence and no negative evidence
- `potential`: positive evidence only
- `active`: negative evidence only
- `stable`: both positive and negative evidence

The knowledge order accumulates evidence.
That is why joining `potential` with `active` returns `stable`: the contradiction is held as a value, not thrown away.

```js
import {
  charge,
  chargeValue,
  joinKnowledge,
  mark,
  valueOf,
} from "@emsenn/relating";

const supported = charge(chargeValue("potential"), [[mark("source:A")], []]);
const contradicted = charge(chargeValue("active"), [[], [mark("source:B")]]);

valueOf(joinKnowledge(supported, contradicted)).name; // "stable"
```

The truth order is the other reading of the same carrier: truth-side evidence grows while falsity-side evidence shrinks.
The package exposes both orders so callers can choose whether they are asking "how much evidence is recorded?" or "how true is this reading?"

Useful handles:

- values: `chargeValue`, `chargeValues`, `chargeValueName`
- carriers: `charge`, `valueOf`, `witnessedPotential`
- census and aggregate reads: `fourCensus`, `fourCensusOfNames`, `knowledgeAggregate`, `knowledgeAggregateOfCensus`
- knowledge order: `joinKnowledge`, `meetKnowledge`, `leqKnowledge`
- truth order: `joinTruth`, `meetTruth`, `leqTruth`
- gauge operations: `negate`, `conflate`, `gauge`, `fixedSet`

The K4 gauge preserves the distinction between the knowledge and truth orders.
For the larger order-swapping D4 symmetry surface, see [Dihedral gauge](dihedral-gauge.md).

For the Diataxis tutorial / how-to / explanation / reference read over this same square, see [Diataxis FOUR read](diataxis-four.md).

For the settling-cohomology read over FOUR census data, see [Bigraded settling cohomology](bigraded-settling-cohomology.md).

For a runnable version, see [`examples/four-charge-algebra.mjs`](../examples/four-charge-algebra.mjs).
