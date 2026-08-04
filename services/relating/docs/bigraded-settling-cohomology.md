# Bigraded Settling Cohomology

The bigraded settling-cohomology surface reads a settled FOUR census into two rows:

- `truth`: cells with exactly one evidence side present, either `potential` or `active`
- `contradiction`: cells with both evidence sides present, the `stable` row

This does not replace ordinary settlement or the exact `analysis` surface.
It is a small carrier-valued read over the FOUR charge algebra: when the contradiction row is empty, the bigrading collapses to the single-graded truth read; when it is non-empty, the result records an obstruction.

## Public Surface

The current public handle is the settling subpath, with root re-exports for callers that already use the common API:

```ts
import {
  bigradedCohomology,
  bigradedCohomologyOfCharges,
} from "@emsenn/relating/settling";
import {
  chargeValue,
  knowledgeAggregateOfCensus,
} from "@emsenn/relating";
```

Use `bigradedCohomology(census)` when a caller has already counted the FOUR corners:

```ts
const reading = bigradedCohomology({
  absurd: 0,
  potential: 2,
  active: 1,
  stable: 0,
});

reading.truth; // 3
reading.contradiction; // 0
reading.collapse.kind; // "predication.bigradedCohomology.collapse:witness"
```

Use `bigradedCohomologyOfCharges(values)` when the caller has settled charge values:

```ts
const reading = bigradedCohomologyOfCharges([
  chargeValue("potential"),
  chargeValue("active"),
  chargeValue("stable"),
]);

reading.contradiction; // 1
reading.collapse.kind; // "predication.bigradedCohomology.collapse-obstruction"
```

## API Reference

- row reads: `bigradedRow`
- collapse judgment: `bigradingCollapse`, `BigradingCollapseJudgment`, `BigradingCollapseWitness`, `BigradingObstruction`
- carrier reads: `bigradedCohomology`, `bigradedCohomologyOfCharges`, `BigradedCohomologyCarrier`
- input census type: `FourCensus`

## Mathematical Grounding

The content node `content/.../settling-cohomology/content/bigraded-settling-cohomology/bigraded-settling-cohomology.md` names the fuller bicomplex: row `m = 0` is truth sheaf content, row `m = 1` is inconsistency sheaf content, and rows `m >= 2` vanish.
It also names the mapping-cone and spectral-sequence readings.

`lean/RelMath/Cohomology/BigradedSettlingCohomology.lean` formalizes the cochain-level substrate: the two live rows, zero rows above `m = 1`, the vertical differential `d_v = pi . iota`, the fact that `d_v` is zero because the truth and inconsistency masks are disjoint, and the split exact sequence that feeds the mapping-cone reading.
The Lean file is explicit that the full cohomology-level long exact sequence is still a frontier, not something this runtime surface proves.

The Node layer is therefore deliberately smaller.
It does not construct Cech complexes, spectral sequences, induced maps, or cohomology groups.
It reads the settled FOUR data the package actually carries: `potential` and `active` count toward the truth row, `stable` counts toward the contradiction row, and `absurd` is outside the non-absurd content being decomposed.

## Boundary

This is not a numeric linear-algebra package and it is not yet the Diataxis or learning-cycle API.
It is the code-level settling read that currently exists: a FOUR census or list of charge values becomes a frozen carrier with a collapse witness or obstruction.
Higher Diataxis and learning documents can point to this surface as evidence, but they should not present it as the whole theory.

For a runnable version, see [`examples/bigraded-settling-cohomology.mjs`](../examples/bigraded-settling-cohomology.mjs).
