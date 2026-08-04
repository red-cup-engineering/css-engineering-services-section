# Settlement Analysis

The `analysis` surface contains exact analytical reads downstream of settlement.
It is exported two ways:

- root namespace: `analysis`
- subpath: `@emsenn/relating/analysis`

The modules here do not define the primitive relation carriers.
They read settled or relation-shaped material into exact arithmetic, graded quantities, Laplacian graphs, spectral judgments, evidence distributions, differential findings, conservation witnesses, and finite internal-real/logarithm witnesses.
The internal-real path includes the finite GoldenLog and ColoringEntropy reads that reduce to exact Fibonacci, metallic recurrence, Cassini, convergent-gap, colouring-count, constructive square-root approximant, metallic-root identity, and log-approximant carriers.
The graph-coloring path includes proper-coloring search, chromatic numbers, coloring-as-factor-map witnesses, complete-graph extremal reads, handshake degree parity, and odd-closed-walk obstructions to bipartiteness.
Its RMN normalizers are exported from the root package as `graphColoring`.
The Collatz path includes the finite arithmetic shadow: accelerated steps, orbits, parity words, affine traces, first-passage/parent-barrier checks, two-adic shortcut factoring, reached-set quiescence, residue arithmetic, and Padovan/Fibonacci comparison.
Its RMN normalizers are exported from the root package as `collatz`.

For the smaller root-level read that splits a FOUR census into truth and contradiction rows, see [Bigraded settling cohomology](bigraded-settling-cohomology.md).

## Example

```js
import * as analysis from "@emsenn/relating/analysis";
import { chargeValue } from "@emsenn/relating";

const count = analysis.count(["alpha", "beta", "gamma"]);
count.kind; // "exactNumber.natural"

const distribution = analysis.chargeDistribution([
  chargeValue("potential"),
  chargeValue("active"),
  chargeValue("stable"),
  chargeValue("stable"),
]);

const coordinates = analysis.evidenceCoordinates(distribution);
coordinates.kind; // "meme-analysis.evidence.coordinates"

const bound = analysis.internalReal.logStepBound(8, 2);
bound.kind; // "internalReal.logStepBound:witness"

const golden = analysis.internalReal.goldenConvergentLogGap(4, 2);
golden.kind; // "internalReal.goldenConvergentLogGap:witness"

const sqrt = analysis.internalReal.sqrtSeqApproximation(2, 2);
sqrt.kind; // "internalReal.sqrtSeqApproximation:witness"

const metallicRoot = analysis.internalReal.metallicRoot(3);
metallicRoot.kind; // "internalReal.metallicRoot:witness"

const triangle = analysis.completeGraphWeights(3);
analysis.chromaticNumber(triangle); // 3
analysis.coloringFactorMap(triangle, [0, 1, 2]).kind;
// "meme-analysis.coloring.factorMap:witness"

const trace = analysis.collatz.affineTraceParityWord(7, 5);
trace.kind; // "collatz.affineTraceParityWord:witness"
```

For a runnable version, see [`examples/settlement-analysis.mjs`](../examples/settlement-analysis.mjs).

That runnable example also builds a tiny settled section, reads its finite relation graph, computes the exact combinatorial Laplacian, checks the Fibonacci characteristic polynomial for Pisot-style spectral shape, and checks one constant observable as harmonic while returning an obstruction for a sloped observable.
It also reads an oriented flow network, distinguishes a conserved circulation from a leaking flow, completes one missing edge value, and reports a small charged control finding.
The example also exercises finite graph coloring: the triangle has chromatic number `3`, `K4` forces all four colors, handshake degree parity holds, and an odd closed walk obstructs bipartiteness.
It also prints finite Collatz receipts for affine traces, first-passage words, two-adic shortcut depth, reached-set quiescence, residue characterization, and Padovan/Fibonacci comparison.

## What It Contains

- exact numbers: von Neumann naturals, balanced integers, canonical rationals, integer matrices, determinants, characteristic polynomials, Smith normal form, and rank
- graded rationals: exact values scoped to opaque sectors where addition is only defined within a grade
- Laplacian reads: relation graphs, exact Laplacians, harmonic judgments, component counts, spectrum polynomials, and spanning-tree counts
- graph-coloring reads: complete graph matrices, proper coloring witnesses, chromatic numbers, coloring counts, coloring-as-factor-map witnesses, complete graph extremal witnesses, handshake degree parity, and odd closed walk obstructions to bipartiteness
- Collatz reads: accelerated step/orbit/parity word, affine trace witnesses, first-passage and parent-barrier witnesses, two-adic shortcut factors, reached-set quiescence, two-generator residue characterization, and Padovan/Fibonacci comparison
- spectral reads: polynomial identity, reciprocal symmetry, resultants, unit-circle root-location judgments, Pisot judgments, and Mahler-measure judgments
- evidence reads: exact FOUR charge histograms, evidence-coordinate expectations, majorization/mixedness, joint distributions, independence, and screening-off
- internal-real/logarithm reads: exact rational `natLog`/`logSeq` approximants, positive scalar-cancellation witnesses, finite per-step log-Lipschitz bound judgments, log-monotonicity witnesses, Fibonacci/Cassini GoldenLog gap witnesses, metallic convergent-gap witnesses, constructive square-root approximants, symbolic metallic-root identity witnesses, and colouring entropy/count witnesses
- conservation and differential reads: boundary/divergence checks, graded conservation, and charged control findings

## Product Reading

This is the package's exact analysis bench.
Ordinary Node libraries tend to leave this material as ad hoc numbers, booleans, or reports.
Here, the result is still carrier-shaped: a rank is a `Natural`, a harmonic check is a witness or obstruction, and an evidence distribution is a FOUR-valued exact histogram.

That makes analysis compatible with the rest of the package's style: relations settle first; analytical reads then return typed data that can be witnessed, serialized, projected, or used by RMN differential tests.

The graph/Laplacian path is deliberately finite and exact.
`relationGraph` reads a `SectionCarrier` into weighted term adjacency, `laplacianOf` derives `L = D - W` over integer carriers, and `harmonic` judges rational observables by exact zero deviation.
This sits beside the Lean Lawvere/Tarski Laplacian story where harmonic means fixed/global/settled state; the Node surface is the executable finite graph read, not a claim to be the whole enriched sheaf Laplacian.

The graph-coloring path is the executable finite shadow of `RelMath.
Order.
CombinatoricsExtremal`, `RelMath.
Order.
GraphColoring`, and `RelMath.
Order.
ChromaticNumber`.
`properColoring`, `chromaticNumber`, and `countProperColorings` perform exact finite backtracking over the same weighted adjacency matrix carrier used by the graph analysis bench.
`coloringFactorMap` records the Lean identity that a proper coloring is a graph hom into the complete palette graph.
`completeGraphChromatic` records the complete-graph ladder, with `k4RequiresFour` as the FOUR/Belnap palette case.
The root `graphColoring` catalog exports RMN normalizers for these portable witnesses, plus handshake parity and odd-closed-walk obstruction receipts.

The Collatz path is the executable finite shadow of the computable portions of `RelMath.
Closure.
Collatz.
AffineTrace`, `FirstPassage`, `Valuation`, `Settlement`, `ResidueGap`, and `PadovanShape`.
It computes the accelerated map, parity words, coefficient traces, first coefficient crossings, valuation depth, reached-set quiescence, modular residue membership, and the Padovan slow-growth inequality.
The root `collatz` catalog exports RMN normalizers for the witness carriers.
This is not a proof of the Collatz conjecture: the red Lean frontier claims `parentBarrierGap_holds` and `everyNonterminalHasCrossing_holds` remain outside the runtime claim surface.

The spectral-polynomial path is also exact at the carrier level.
It can compare integer polynomials after normalization, reverse them into reciprocal polynomials, compute resultants, locate roots relative to the unit circle by a rational Routh-Hurwitz read, judge Pisot-style root structure, and run bounded rational dominant-root iteration.
For the Fibonacci matrix the package derives `[-1, -1, 1]`, the same golden-ratio/Pisot minimal-polynomial handle used in the RelMath step-N recurrence spine.
It does not solve arbitrary real eigenvalues or perform floating-point spectral analysis.

The conservation path is the first-order read under that graph story: `flowNetwork` keeps the orientation that the undirected Laplacian forgets, `divergence` computes net accumulation at each term, and `conserved` returns a witness or obstruction for whether the boundary vanishes.
The completion helpers solve only the finite elided-edge or one-sector residual cases they can actually compute.
The `differential` namespace is smaller still: it is a charged control finding vocabulary, not a rules engine.

The `internalReal` namespace is the executable finite shadow of the green Lean `RelMath.
Real.
InternalReals`, `RelMath.
Real.
Logarithm`, and `RelMath.
Real.
LogLipschitz` modules, plus the finite parts of `RelMath.
Real.
GoldenLog`, `RelMath.
Aperiodic.
StepN.
MetallicReal`, and `RelMath.
Order.
ColoringEntropy`.
It works over exact rational approximants: `natLog`, `logSeq`, `invNatP`, and `nsmulRational` supply the carrier arithmetic, while `scalarCancellation`, `logStepBound`, `logMonotone`, `goldenCassini`, `goldenConvergentLogGap`, `metallicCassini`, `metallicConvergentGap`, `edgeColouringEntropy`, and `triangleColouringEntropy` return witness, obstruction, or approximation carriers.
Root-level `internalReal` exports RMN terms that normalize the portable proof-reading carriers, so downstream actions can carry this proof-reading as inspectable data.

## Boundary

This surface is not a general numerical computing package.
It uses exact carriers and finite algorithms already implemented in `lib/relating`; it does not provide floating-point linear algebra, arbitrary symbolic simplification, or Lean-emitted golden vectors for every analysis function.
The internal-real layer does not claim to materialize arbitrary Bishop reals in Node; it exposes the finite exact approximants and proof-shaped judgments that the package can actually compute.
The graph-coloring layer is likewise finite and exact: it does not claim a general graph-theory proof assistant, an infinite tiling-coloring solver, or a Planar Four Color Theorem implementation.
It exposes the finite witnesses the Lean modules make computational: colorability checks, complete graph extremal facts, parity receipts, and the coloring/factor-map equivalence.
The Collatz layer likewise exposes only bounded, finite arithmetic witnesses.
It does not assert universal descent, parent-barrier gap truth, every nonterminal crossing, or accelerated Collatz termination.
