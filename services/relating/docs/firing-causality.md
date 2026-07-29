# Firing Causality

`@emsenn/relating/settling` exposes a small finite surface where two readings of a settlement meet:

- firing algebra: charge-valued firings are graded by their truth and falsity sides, assembled into a first-cohomology-like carrier, and classified under negation;
- temporal geometry: cells become events at the first stage where they fire, adjacency comes from shared terms, and causal precedence is the transitive closure of stage-increasing adjacency.

This is the package's current Node-sized shadow of the larger RelMath spine around non-Scott firings, blowups, causal settling, and Myrheim-Meyer ordering fractions.
The runtime surface is finite and explicit: it reads carrier data you give it.
It does not compute continuum spacetime, transfinite ordinals, or the real-valued Myrheim-Meyer dimension.

The `@emsenn/relating/analysis` namespace also exposes the direct finite Lorentzian causal-set read from `RelMath.
Lorentzian.
Causal` and `RelMath.
Lorentzian.
MyrheimMeyer`: Boolean transitive closure over a finite event DAG, closed-timelike-curve obstructions, apex counts, exact rational ordering fractions, strict-regime `H¹ = 0`, and the diamond/chain/antichain Myrheim-Meyer witnesses.

## Public Handles

Import from the settling subpath, or from the package root:

```ts
import {
  readFiringEventsOfSettlementFiltration,
  readCausalOrderOfSettlementFiltration,
  causalSeparation,
  causalCone,
  orderingFraction,
  firingGradeCohomology,
  classifyFiringOrbit,
  firingSelfDuality,
  firingIndependence,
} from "@emsenn/relating/settling";
```

Import the direct causal-set analysis surface from `@emsenn/relating/analysis`:

```ts
import * as analysis from "@emsenn/relating/analysis";

const diamond = analysis.causal.settleCausalSet(analysis.causal.diamondCausalSet);
diamond.kind; // "lorentzian.causalSettle:witness"
diamond.apexCount; // 5
```

Temporal handles:

- `readFiringEventsOfSettlementFiltration(settling)` returns the cells first added at each stage, paired with the stage index where each cell first fired.
- `readCausalOrderOfSettlementFiltration(settling)` returns the transitive closure of stage-increasing term adjacency.
- `causalSeparation(order, left, right)` returns a timelike witness when either cell precedes the other, a spacelike witness when neither does, or an obstruction when a cell never fired.
- `causalCone(order, cell)` returns the finite past and future of one fired cell.
- `orderingFraction(order)` returns an exact rational comparable-pair fraction over the finite causal order.

Firing handles:

- `classifyFiring(value)` reads a FOUR charge value as truth-only, falsity-only, active, or absurd.
- `firingGradeCohomology(values)` counts the truth and falsity side ranks of a charge-valued firing family and compares that shadow rank with the abelian rank.
- `classifyFiringOrbit(values)` classifies a firing family under negation: self-dual, one-sided, exchange-mixed, or mixed.
- `firingSelfDuality(values)` reports whether the orbit, symmetry, and negation reads cohere as a self-dual firing family.
- `firingIndependence(valuedFirings)` checks that explicit valued firings do not collide on a stage.
- `valuedFiringsOfSettlementFiltration(settling, values)` pairs a settlement's non-Scott limit firings with charge values.
  It throws when the number of supplied values does not match the number of non-Scott firings.

## Example Shape

`examples/firing-causality.mjs` builds a three-stage finite settlement:

```text
stage 0: alpha supports beta
stage 1: beta supports gamma
stage 2: delta witnesses epsilon
```

The first two cells share `beta`, so the temporal read marks them timelike.
The third cell shares no term with the first, so they are spacelike.
The resulting ordering fraction is `1/3`: one comparable pair out of three unordered pairs.
The example also reads the Lean Myrheim-Meyer diamond witness directly: `|Apex| = 5`, `r = 5/6`, `χ = 5`, while the 4-chain has ordering fraction `1` and the antichain has ordering fraction `0` under the same strict-regime, `H¹ = 0`, `|L_ns| = 0` classifying data.

The same example reads four explicit charge values:

```text
potential, active, stable, absurd
```

Their firing shadow has rank two on the truth side and rank two on the falsity side.
The full orbit is mixed, while the restricted `stable, absurd` family is self-dual.

Run it after building:

```sh
npm run build
node examples/firing-causality.mjs
```

## Mathematical Boundary

The Lean and content spine is stronger than this Node API:

- `RelMath.
  Flow.
  NonScottContinuousFiring` formalizes non-Scott firing as failure of commutation with directed joins.
- `RelMath.
  Flow.
  FiringBlowup` reads a firing as a predecessor-to-actual blowup.
- `RelMath.
  Lorentzian.
  Causal` proves the causal order as Boolean transitive closure over finite causal sets.
  The Node `analysis.causal` surface now implements that finite closure and the no-cycle obstruction.
- `RelMath.
  Lorentzian.
  MyrheimMeyer` formalizes the rational ordering-fraction input and deliberately scopes out the real-valued dimension inversion.
  The Node `analysis.causal` surface implements the rational input, Gauss-Bonnet count, and geometry/topology independence witnesses, but still scopes out the real-valued `f⁻¹` dimension inversion.

The package surface follows that discipline.
It exposes finite carrier reads and exact rational summaries.
Broader causal-set geometry, transfinite non-Scott behavior, and continuum dimension estimates remain proof/content frontier unless and until they get their own carriers and examples.
