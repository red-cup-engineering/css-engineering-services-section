# Fixed-Point Topology

`@emsenn/relating` can read a posited predication presheaf as four extremal fixed points:

```js
import { articulate, mark, posit, predicate, utterance } from "@emsenn/relating";
import * as settling from "@emsenn/relating/settling";

const posited = posit(predicate(articulate(utterance(mark("alpha"), mark("supports")))));
const fixed = settling.fixedPoints(posited);
const readings = settling.fixedPointReadings(fixed);
const section = settling.sectionOf(readings.knowledgeLeast);
```

This is the current package surface for the meme-topology fixed-point story: knowledge/truth order, least/greatest bound, gap readings, cohomology, information-as-relation, section queries, partitions, and topology vitals.

## What It Computes

`fixedPoints(presheaf)` computes:

- knowledge-order least and greatest extrema
- truth-order least and greatest extrema
- a per-order gap between least and greatest fixed points

Each extremum carries the closure result, its fixed-point witness or obstruction, and a sheaf section.
`fixedPointReadings` then reads each extremum into cohomology plus `MemeTopologyInformation`: points, states, a relation matrix, a relation carrier, and valuation consistency.

The section helpers flatten one fixed-point reading:

- `sectionOf(reading)` returns charged section entries
- `predicationsFor(section, subject)` selects entries by subject
- `subjectsFor(section, predicate)` selects entries by predicate
- `chargeAtValues(section, subject, predicate, object?)
  ` joins coincident charges
- `partitionSection(section)` buckets entries as potential / active / stable / absurd
- `topologyVitals(section, classification)` reports cells, contradictions, residue, and closure regime

## Why This Is A Product

Most software hides fixed-point work inside an evaluator, solver, or query engine.
This surface keeps the fixed points and their disagreement visible as data.
A downstream package can ask:

- which fixed points exist in each order
- whether least and greatest collapse
- where the interval remains open
- what relation is induced by the settled section
- how many contradictory or absent cells remain

That makes it more like a small inspection bench for relation settlement than a single-purpose algorithm.

## Public Handles

Fixed-point extrema:

- `fixedPoints`

Least/greatest interval gap:

- `fixedPointGap`
- `fixedPointGapInput`

Meme-topology readings:

- `fixedPointReading`
- `fixedPointReadings`
- `informationOfSheaf`
- `readCharge`

Section reads:

- `sectionOf`
- `predicationsFor`
- `subjectsFor`
- `chargeAtValues`
- `partitionSection`
- `topologyVitals`

Type handles:

- types: `FixedPointCarrier`, `FixedPointExtremum`, `FixedPointJudgment`, `MemeTopologyFixedPointReading`, `MemeTopologyInformation`, `SectionCarrier`, `TopologyVitalsCarrier`

For a runnable version, see [`examples/fixed-point-topology.mjs`](../examples/fixed-point-topology.mjs).

## Mathematical Grounding

The immediate Lean spine is `lean/RelMath/Settling.lean`: settling is a monotone closure process whose settled value is a fixed point and the least fixed point above the seed.
The Node fixed-point topology surface lifts that idea from one FOUR charge to finite predication valuations, then keeps the four extremal reads visible as carrier data.

The content section node describes a section as the settled cell-by-cell assignment of a sheaf.
The Node `sectionOf` helper is intentionally smaller: it flattens an already-computed fixed-point reading's sheaf section into query and partition carriers.
It does not prove the full sheaf-gluing theorem.

There is also a separate RelMath/content line for the step-`n` fixed-point object `M^infinity`, the colimit of the step-shift chain.
That is important ancestry for the package's aperiodic-settling story, but it is not what this Node surface computes.
This surface is the finite inspection bench for a single posited predication.

## Boundary

This is not a general Tarski fixed-point solver or a complete sheaf-theory runtime.
It computes the finite carrier reads the package already owns over its own posited predication presheaves:

```text
PositPresheaf -> FixedPointCarrier -> FixedPointReadings -> Section/Vitals
```

The broader RelMath side has fixed-point and colimit material, including the step-`n` fixed-point object.
This Node surface is the executable finite topology read that exists now.
