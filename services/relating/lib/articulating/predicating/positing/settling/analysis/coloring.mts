/**
 * settling/analysis/coloring — proper graph coloring and the chromatic number.
 *
 * A PROPER coloring assigns colors to the vertices of a bare weighted graph (adjacency = a positive
 * weight) so that adjacent vertices DIFFER; the CHROMATIC NUMBER `χ(G)` is the least number of colors
 * admitting one. Computed exactly by backtracking (NP-hard in general, exact and fine for the finite
 * graphs the corpus carries). A proper coloring is, dynamically, a factor map from the graph to a
 * finite palette — for a tiling adjacency graph, a factor of the tiling system onto a finite shift
 * (the "what information does a coloring encode" reading). Grounding: Evans-Gawlak-Ramsey-Strungaru-
 * Trang, "Colourings of aperiodic tilings" (exact vertex/edge/face chromatic numbers for chair,
 * Ammann-Beenker, pinwheel); the Four Color Theorem / Vizing bound the planar-tiling case.
 *
 * NB the adjacency must be a GENUINE relation (geometric tile-adjacency, predication edges), not one
 * derived from a two-valued vertex attribute — such a graph is 2-colored by the attribute itself and
 * its chromatic number is degenerate.
 */
import { intIsZero, intOne, intZero, type Matrix } from "./exact-number.mjs";

/** A proper `k`-coloring: a color `0…k-1` per vertex with adjacent vertices differing. */
export interface ProperColoringWitness {
  readonly kind: "meme-analysis.coloring.proper:witness";
  readonly colors: readonly number[];
  readonly colorCount: number;
}
/** No proper `k`-coloring exists (the graph needs more than `k` colors). */
export interface ProperColoringObstruction {
  readonly kind: "meme-analysis.coloring.proper-obstruction";
  readonly colorCount: number;
}
/** The result of a proper-coloring search. */
export type ProperColoringJudgment = ProperColoringWitness | ProperColoringObstruction;

const adjacent = (weights: Matrix, left: number, right: number): boolean =>
  left !== right && !intIsZero(weights[left]![right]!);

const requireSquare = (weights: Matrix): void => {
  if (!weights.every((row) => row.length === weights.length)) {
    throw new TypeError("graph coloring expects a square adjacency matrix");
  }
};

/** The complete finite graph `K_n` as the existing exact weighted-adjacency carrier. */
export function completeGraphWeights(vertexCount: number): Matrix {
  if (!Number.isInteger(vertexCount) || vertexCount < 0) {
    throw new RangeError("completeGraphWeights: vertexCount must be a non-negative integer");
  }
  return Object.freeze(Array.from({ length: vertexCount }, (_, row) =>
    Object.freeze(Array.from({ length: vertexCount }, (_, column) => row === column ? intZero : intOne))));
}

/** Check a supplied color assignment against the graph's adjacency relation. */
export function isProperColorAssignment(weights: Matrix, colors: readonly number[]): boolean {
  requireSquare(weights);
  if (colors.length !== weights.length) return false;
  for (let left = 0; left < weights.length; left += 1) {
    for (let right = 0; right < weights.length; right += 1) {
      if (adjacent(weights, left, right) && colors[left] === colors[right]) return false;
    }
  }
  return true;
}

/** Check the graph-hom/factor-map reading into the complete graph on the used palette. */
export function graphHomToCompletePalette(weights: Matrix, colors: readonly number[]): boolean {
  requireSquare(weights);
  if (colors.length !== weights.length) return false;
  for (let left = 0; left < weights.length; left += 1) {
    for (let right = 0; right < weights.length; right += 1) {
      if (adjacent(weights, left, right) && colors[left] === colors[right]) return false;
    }
  }
  return true;
}

export interface ColoringFactorMapWitness {
  readonly kind: "meme-analysis.coloring.factorMap:witness";
  readonly colors: readonly number[];
  readonly proper: boolean;
  readonly graphHom: boolean;
  readonly equivalent: boolean;
}

export interface ColoringFactorMapObstruction {
  readonly kind: "meme-analysis.coloring.factorMap-obstruction";
  readonly colors: readonly number[];
  readonly proper: boolean;
  readonly graphHom: boolean;
  readonly equivalent: boolean;
  readonly reason: "not-proper" | "not-graph-hom";
}

export type ColoringFactorMapJudgment = ColoringFactorMapWitness | ColoringFactorMapObstruction;

/** Lean `properColoring_iff_hom`: proper coloring iff graph hom into the complete palette graph. */
export function coloringFactorMap(weights: Matrix, colors: readonly number[]): ColoringFactorMapJudgment {
  const proper = isProperColorAssignment(weights, colors);
  const graphHom = graphHomToCompletePalette(weights, colors);
  const base = {
    colors: Object.freeze([...colors]),
    proper,
    graphHom,
    equivalent: proper === graphHom,
  };
  if (proper && graphHom) {
    return Object.freeze({ kind: "meme-analysis.coloring.factorMap:witness" as const, ...base });
  }
  return Object.freeze({
    kind: "meme-analysis.coloring.factorMap-obstruction" as const,
    ...base,
    reason: proper ? "not-graph-hom" as const : "not-proper" as const,
  });
}

/** Whether the bare weighted graph admits a proper `k`-coloring (adjacent vertices differ), by
 *  backtracking. A witness carries the per-vertex color assignment; an obstruction reports the `k`. */
export function properColoring(weights: Matrix, colorCount: number): ProperColoringJudgment {
  const vertices = weights.length;
  const colors = new Array<number>(vertices).fill(-1);
  const extend = (vertex: number): boolean => {
    if (vertex === vertices) return true;
    for (let color = 0; color < colorCount; color += 1) {
      let legal = true;
      for (let prior = 0; prior < vertex; prior += 1) {
        if (adjacent(weights, prior, vertex) && colors[prior] === color) { legal = false; break; }
      }
      if (legal) {
        colors[vertex] = color;
        if (extend(vertex + 1)) return true;
        colors[vertex] = -1;
      }
    }
    return false;
  };
  if (vertices > 0 && colorCount <= 0) return Object.freeze({ kind: "meme-analysis.coloring.proper-obstruction" as const, colorCount });
  return extend(0)
    ? Object.freeze({ kind: "meme-analysis.coloring.proper:witness" as const, colors: Object.freeze(colors.slice()), colorCount })
    : Object.freeze({ kind: "meme-analysis.coloring.proper-obstruction" as const, colorCount });
}

/** The CHROMATIC NUMBER `χ(G)` — the least number of colors admitting a proper vertex coloring, exact
 *  by ascending search. `χ ≤ |V|`; edgeless → 1, bipartite → 2, an odd cycle → 3, complete `Kₙ` → `n`. */
export function chromaticNumber(weights: Matrix): number {
  const vertices = weights.length;
  if (vertices === 0) return 0;
  for (let colorCount = 1; colorCount <= vertices; colorCount += 1) {
    if (properColoring(weights, colorCount).kind === "meme-analysis.coloring.proper:witness") return colorCount;
  }
  return vertices;
}

/** The NUMBER of proper `k`-colorings of the graph — the chromatic polynomial `P(G, k)` evaluated at
 *  `k` — counted exactly by backtracking. `0` ⟺ `k < χ(G)`; for the edgeless graph it is `kⁿ`; for `Kₙ`
 *  it is the falling factorial `k(k-1)⋯(k-n+1)`. */
export function countProperColorings(weights: Matrix, colorCount: number): number {
  const vertices = weights.length;
  if (vertices === 0) return 1;
  const colors = new Array<number>(vertices).fill(-1);
  let count = 0;
  const extend = (vertex: number): void => {
    if (vertex === vertices) { count += 1; return; }
    for (let color = 0; color < colorCount; color += 1) {
      let legal = true;
      for (let prior = 0; prior < vertex; prior += 1) {
        if (adjacent(weights, prior, vertex) && colors[prior] === color) { legal = false; break; }
      }
      if (legal) { colors[vertex] = color; extend(vertex + 1); colors[vertex] = -1; }
    }
  };
  extend(0);
  return count;
}

/**
 * The COLORING ENTROPY at `k` colors: `log₂ P(G, k) / |V|` — the bits of information a proper
 * `k`-coloring carries PER VERTEX. A proper coloring is a factor of the graph onto a `k`-symbol
 * palette; this is the per-tile entropy of that factor. As the tiling patch grows, the per-tile
 * coloring entropy converges to the topological entropy of the coloring shift — a tiling-space
 * invariant FINER than the chromatic number (two tilings can share `χ` but differ in how much
 * freedom a coloring has). `0` when no proper `k`-coloring exists (`k < χ`) or the graph is empty.
 */
export function coloringEntropy(weights: Matrix, colorCount: number): number {
  const vertices = weights.length;
  if (vertices === 0) return 0;
  const count = countProperColorings(weights, colorCount);
  return count === 0 ? 0 : Math.log2(count) / vertices;
}

export interface CompleteGraphChromaticWitness {
  readonly kind: "meme-analysis.coloring.completeGraphChromatic:witness";
  readonly vertexCount: number;
  readonly chromaticNumber: number;
  readonly selfColoring: ProperColoringJudgment;
  readonly properColoringCountAtSelfPalette: number;
  readonly lowerBoundByInjection: boolean;
  readonly requiresAllColours: boolean;
}

/** Lean complete-graph ladder: `χ(K_n)=n`, with every proper `K_n` coloring injective. */
export function completeGraphChromatic(vertexCount: number): CompleteGraphChromaticWitness {
  const weights = completeGraphWeights(vertexCount);
  const selfColoring = properColoring(weights, vertexCount);
  return Object.freeze({
    kind: "meme-analysis.coloring.completeGraphChromatic:witness" as const,
    vertexCount,
    chromaticNumber: chromaticNumber(weights),
    selfColoring,
    properColoringCountAtSelfPalette: countProperColorings(weights, vertexCount),
    lowerBoundByInjection: true,
    requiresAllColours: vertexCount > 0,
  });
}

/** The Lean `K₄`/FOUR extremal case: four vertices require all four Belnap charges. */
export const k4RequiresFour: CompleteGraphChromaticWitness = completeGraphChromatic(4);

const degreeOf = (weights: Matrix, vertex: number): number => {
  let degree = 0;
  for (let other = 0; other < weights.length; other += 1) {
    if (adjacent(weights, vertex, other)) degree += 1;
  }
  return degree;
};

const symmetric = (weights: Matrix): boolean => {
  requireSquare(weights);
  for (let row = 0; row < weights.length; row += 1) {
    for (let column = 0; column < weights.length; column += 1) {
      if (intIsZero(weights[row]![column]!) !== intIsZero(weights[column]![row]!)) return false;
    }
  }
  return true;
};

const irreflexive = (weights: Matrix): boolean => {
  requireSquare(weights);
  return weights.every((row, index) => intIsZero(row[index]!));
};

export interface HandshakeDegreeParityWitness {
  readonly kind: "meme-analysis.coloring.handshakeDegreeParity:witness";
  readonly degrees: readonly number[];
  readonly degreeSum: number;
  readonly directedEdgeCount: number;
  readonly oddDegreeCount: number;
  readonly degreeSumEven: boolean;
  readonly oddDegreeCountEven: boolean;
}

export interface HandshakeDegreeParityObstruction {
  readonly kind: "meme-analysis.coloring.handshakeDegreeParity-obstruction";
  readonly reason: "not-symmetric" | "not-irreflexive";
}

export type HandshakeDegreeParityJudgment = HandshakeDegreeParityWitness | HandshakeDegreeParityObstruction;

/** Lean `handshake_and_degree_parity` for finite symmetric, irreflexive adjacency matrices. */
export function handshakeDegreeParity(weights: Matrix): HandshakeDegreeParityJudgment {
  if (!symmetric(weights)) {
    return Object.freeze({ kind: "meme-analysis.coloring.handshakeDegreeParity-obstruction" as const, reason: "not-symmetric" as const });
  }
  if (!irreflexive(weights)) {
    return Object.freeze({ kind: "meme-analysis.coloring.handshakeDegreeParity-obstruction" as const, reason: "not-irreflexive" as const });
  }
  const degrees = weights.map((_, vertex) => degreeOf(weights, vertex));
  const degreeSum = degrees.reduce((sum, degree) => sum + degree, 0);
  const oddDegreeCount = degrees.filter((degree) => degree % 2 === 1).length;
  return Object.freeze({
    kind: "meme-analysis.coloring.handshakeDegreeParity:witness" as const,
    degrees: Object.freeze(degrees),
    degreeSum,
    directedEdgeCount: degreeSum,
    oddDegreeCount,
    degreeSumEven: degreeSum % 2 === 0,
    oddDegreeCountEven: oddDegreeCount % 2 === 0,
  });
}

export interface OddClosedWalkBipartiteObstructionWitness {
  readonly kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness";
  readonly start: number;
  readonly walk: readonly number[];
  readonly validWalk: boolean;
  readonly closed: boolean;
  readonly oddLength: boolean;
  readonly notBipartite: boolean;
}

export interface OddClosedWalkBipartiteObstructionObstruction {
  readonly kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction-obstruction";
  readonly start: number;
  readonly walk: readonly number[];
  readonly validWalk: boolean;
  readonly closed: boolean;
  readonly oddLength: boolean;
  readonly reason: "invalid-walk" | "not-closed" | "not-odd";
}

export type OddClosedWalkBipartiteObstructionJudgment =
  OddClosedWalkBipartiteObstructionWitness | OddClosedWalkBipartiteObstructionObstruction;

const hasUndirectedEdge = (weights: Matrix, left: number, right: number): boolean =>
  left >= 0 && right >= 0 && left < weights.length && right < weights.length
  && (adjacent(weights, left, right) || adjacent(weights, right, left));

/** Lean `not_bipartite_of_odd_closed_walk`: an odd closed walk obstructs Bool-colorability. */
export function oddClosedWalkBipartiteObstruction(
  weights: Matrix,
  start: number,
  walk: readonly number[],
): OddClosedWalkBipartiteObstructionJudgment {
  requireSquare(weights);
  let current = start;
  let validWalk = start >= 0 && start < weights.length;
  for (const next of walk) {
    if (!hasUndirectedEdge(weights, current, next)) {
      validWalk = false;
      break;
    }
    current = next;
  }
  const closed = validWalk && current === start;
  const oddLength = walk.length % 2 === 1;
  const base = { start, walk: Object.freeze([...walk]), validWalk, closed, oddLength };
  if (validWalk && closed && oddLength) {
    return Object.freeze({
      kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness" as const,
      ...base,
      notBipartite: true,
    });
  }
  return Object.freeze({
    kind: "meme-analysis.coloring.oddClosedWalkBipartiteObstruction-obstruction" as const,
    ...base,
    reason: !validWalk ? "invalid-walk" as const : !closed ? "not-closed" as const : "not-odd" as const,
  });
}

export interface CombinatoricsExtremalReceipt {
  readonly kind: "meme-analysis.combinatoricsExtremal:witness";
  readonly sourceModule: "RelMath.Order.CombinatoricsExtremal";
  readonly theorems: readonly [
    "RelMath.Combinatorics.sum_mod_two",
    "RelMath.Combinatorics.countOdd_even_of_sum_even",
    "RelMath.Combinatorics.dsum_even",
    "RelMath.Combinatorics.degSum_even",
    "RelMath.Combinatorics.countOdd_degree_even",
    "RelMath.Combinatorics.handshake_and_degree_parity",
    "RelMath.Combinatorics.walk_color",
    "RelMath.Combinatorics.bipartite_no_odd_closed_walk",
    "RelMath.Combinatorics.bipartite_parity",
  ];
  readonly handshake: HandshakeDegreeParityWitness;
  readonly oddWalk: OddClosedWalkBipartiteObstructionWitness;
  readonly degreeSumEven: true;
  readonly oddDegreeCountEven: true;
  readonly bipartiteOddWalkObstruction: true;
}

export function combinatoricsExtremalReceipt(): CombinatoricsExtremalReceipt {
  const triangle = completeGraphWeights(3);
  const handshake = handshakeDegreeParity(triangle);
  const oddWalk = oddClosedWalkBipartiteObstruction(triangle, 0, [1, 2, 0]);
  if (
    handshake.kind !== "meme-analysis.coloring.handshakeDegreeParity:witness"
    || oddWalk.kind !== "meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness"
  ) {
    throw new TypeError("combinatoricsExtremalReceipt: finite extremal graph laws failed");
  }
  return Object.freeze({
    kind: "meme-analysis.combinatoricsExtremal:witness" as const,
    sourceModule: "RelMath.Order.CombinatoricsExtremal" as const,
    theorems: Object.freeze([
      "RelMath.Combinatorics.sum_mod_two",
      "RelMath.Combinatorics.countOdd_even_of_sum_even",
      "RelMath.Combinatorics.dsum_even",
      "RelMath.Combinatorics.degSum_even",
      "RelMath.Combinatorics.countOdd_degree_even",
      "RelMath.Combinatorics.handshake_and_degree_parity",
      "RelMath.Combinatorics.walk_color",
      "RelMath.Combinatorics.bipartite_no_odd_closed_walk",
      "RelMath.Combinatorics.bipartite_parity",
    ]) as CombinatoricsExtremalReceipt["theorems"],
    handshake,
    oddWalk,
    degreeSumEven: handshake.degreeSumEven as true,
    oddDegreeCountEven: handshake.oddDegreeCountEven as true,
    bipartiteOddWalkObstruction: oddWalk.notBipartite as true,
  });
}

export interface RamseyMonoTriangleWitness {
  readonly kind: "meme-analysis.ramsey.r33:witness";
  readonly vertexCount: 6;
  readonly vertices: readonly [number, number, number];
  readonly color: boolean;
  readonly edges: readonly [boolean, boolean, boolean];
}

export interface RamseyMonoTriangleObstruction {
  readonly kind: "meme-analysis.ramsey.r33-obstruction";
  readonly reason: "not-six-by-six" | "no-monochromatic-triangle";
}

export type RamseyMonoTriangleJudgment = RamseyMonoTriangleWitness | RamseyMonoTriangleObstruction;

const isSixBySixBool = (colors: readonly (readonly boolean[])[]): boolean =>
  colors.length === 6 && colors.every((row) => row.length === 6 && row.every((entry) => typeof entry === "boolean"));

/** Lean `ramsey_three_three`: every Boolean edge-colouring of K6 has a monochromatic triangle. */
export function ramseyThreeThree(colors: readonly (readonly boolean[])[]): RamseyMonoTriangleJudgment {
  if (!isSixBySixBool(colors)) {
    return Object.freeze({ kind: "meme-analysis.ramsey.r33-obstruction" as const, reason: "not-six-by-six" as const });
  }
  for (let i = 0; i < 6; i += 1) {
    for (let j = i + 1; j < 6; j += 1) {
      for (let k = j + 1; k < 6; k += 1) {
        const ij = colors[i]![j]!;
        const ik = colors[i]![k]!;
        const jk = colors[j]![k]!;
        if (ij === ik && ik === jk) {
          return Object.freeze({
            kind: "meme-analysis.ramsey.r33:witness" as const,
            vertexCount: 6 as const,
            vertices: Object.freeze([i, j, k]) as readonly [number, number, number],
            color: ij,
            edges: Object.freeze([ij, ik, jk]) as readonly [boolean, boolean, boolean],
          });
        }
      }
    }
  }
  return Object.freeze({
    kind: "meme-analysis.ramsey.r33-obstruction" as const,
    reason: "no-monochromatic-triangle" as const,
  });
}
