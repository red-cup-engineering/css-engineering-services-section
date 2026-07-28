/**
 * settling/dynamics/substitution/tiling — 2D block substitutions and tile-adjacency graphs.
 *
 * A 1D substitution word is a path (chromatic number 2 always); genuine coloring lives in 2D. A BLOCK
 * substitution sends each symbol to a fixed rectangular block of symbols; inflating a seed `k` times
 * tiles the plane with a level-`k` patch. The TILE-ADJACENCY GRAPH of a patch — a vertex per cell, an
 * edge between neighbouring cells — is the genuine (non-degenerate) graph the coloring readings need:
 * its `chromaticNumber` is the least number of colors with no two adjacent tiles alike, and its
 * proper-coloring space is a factor of the tiling onto a finite palette (the "coloring = factor map to
 * a finite shift = information" reading). The adjacency GEOMETRY drives the chromatic number:
 * orthogonal (4-neighbour, a bipartite grid → 2), triangular (4 + one diagonal → 3), king (8-neighbour
 * → 4). Grounding: Evans–Gawlak–Ramsey–Strungaru–Trang, "Colourings of aperiodic tilings"; the
 * memo on coloring aperiodic tiles. Bounded: a finite patch, not the full hull.
 *
 * @packageDocumentation
 */
import { intOne, intZero, type Matrix } from "../../analysis/exact-number.mjs";

/** A grid of symbols (rows of cells). */
export type Grid = readonly (readonly string[])[];

/** A 2D block substitution: each symbol maps to a fixed rectangular block of symbols. */
export interface BlockSubstitution {
  readonly kind: "substitution.dynamics.tiling.blockSubstitution";
  readonly block: Readonly<Record<string, Grid>>;
}

/** The neighbourhood convention of a tile-adjacency graph. */
export type Neighbourhood = "orthogonal" | "triangular" | "king";

/** A block substitution from a symbol→block table. */
export function blockSubstitution(block: Readonly<Record<string, Grid>>): BlockSubstitution {
  return Object.freeze({ kind: "substitution.dynamics.tiling.blockSubstitution" as const, block });
}

/** Replace every cell of a grid with its block, tiling the blocks into one larger grid (blocks are
 *  assumed uniform in size; a symbol with no block maps to its own `1×1` cell). */
export function inflateGrid(substitution: BlockSubstitution, grid: Grid): Grid {
  const rows: string[][] = [];
  for (const gridRow of grid) {
    const blocks = gridRow.map((cell) => substitution.block[cell] ?? [[cell]]);
    const blockHeight = blocks.length > 0 ? blocks[0]!.length : 0;
    for (let blockRow = 0; blockRow < blockHeight; blockRow += 1) {
      rows.push(blocks.flatMap((block) => [...block[blockRow]!]));
    }
  }
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

/** The level-`k` inflation of a seed symbol: apply the block substitution `k` times to the `1×1` seed. */
export function tilingPatch(substitution: BlockSubstitution, seed: string, level: number): Grid {
  let grid: Grid = [[seed]];
  for (let step = 0; step < level; step += 1) grid = inflateGrid(substitution, grid);
  return grid;
}

const NEIGHBOUR_DELTAS: Readonly<Record<Neighbourhood, readonly (readonly number[])[]>> = Object.freeze({
  orthogonal: Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1]]),
  triangular: Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]]),
  king: Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]),
});

/** The TILE-ADJACENCY weight matrix of a grid patch: cell `(r,c)` is vertex `r·cols + c`; an edge
 *  (weight `1`) joins cells that are neighbours under the chosen convention. Feed it to
 *  `analysis.chromaticNumber` / the graph-Laplacian readings. */
export function gridAdjacency(grid: Grid, neighbourhood: Neighbourhood = "orthogonal"): Matrix {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0]!.length : 0;
  const size = rows * cols;
  const index = (r: number, c: number): number => r * cols + c;
  const matrix: import("../../analysis/exact-number.mjs").Integer[][] =
    Array.from({ length: size }, () => Array.from({ length: size }, () => intZero));
  const deltas = NEIGHBOUR_DELTAS[neighbourhood];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      for (const delta of deltas) {
        const nr = r + delta[0]!;
        const nc = c + delta[1]!;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) matrix[index(r, c)]![index(nr, nc)] = intOne;
      }
    }
  }
  return Object.freeze(matrix.map((row) => Object.freeze(row)));
}
