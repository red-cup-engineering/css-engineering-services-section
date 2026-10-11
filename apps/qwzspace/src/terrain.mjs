// terrain — a heightfield cut into chunks, each at several levels of detail, as plain arrays any
// drawing tier can upload. Pure: no renderer, no DOM. The heightfield is the one FeltOS geometry
// reads (`decodeHeightfield`): float32 metres, row-major, row 0 southernmost, column 0 westernmost.
//
// Positions come out in the world's frame (x east, y north, z up, metres). Each chunk carries a
// skirt hanging below its edges, so a coarse chunk beside a fine one shows no crack between them.

const SKIRT = 40;

// The colour of ground at a height: sea floor, wet sand, dry sand, grass, heath, rock, snow.
const BANDS = [
  [-Infinity, [0.3, 0.3, 0.24]],
  [-2, [0.55, 0.5, 0.38]],
  [0.5, [0.76, 0.7, 0.5]],
  [3, [0.33, 0.47, 0.22]],
  [120, [0.42, 0.42, 0.26]],
  [400, [0.45, 0.43, 0.4]],
  [900, [0.92, 0.92, 0.95]],
];

/** The ground colour at a height, as linear [r, g, b]. */
export function groundColour(height) {
  let colour = BANDS[0][1];
  for (const [from, band] of BANDS) if (height >= from) colour = band;
  return colour;
}

/** Validate a heightfield layout ({origin, spacing, columns, rows}). */
export function heightfieldLayout(layout) {
  const { origin, spacing, columns, rows } = layout ?? {};
  if (!Array.isArray(origin) || origin.length !== 2 || !origin.every(Number.isFinite)
    || !(spacing > 0) || !Number.isInteger(columns) || !Number.isInteger(rows) || columns < 2 || rows < 2) {
    throw new TypeError("terrain: a heightfield layout is {origin: [x, y], spacing > 0, columns >= 2, rows >= 2}");
  }
  return { origin: [...origin], spacing, columns, rows };
}

/** One chunk at one stride: positions (ENU), colours, and triangle indices, skirt included.
 *  The chunk spans sample columns [i0, i1] and rows [j0, j1] inclusive. */
export function chunkMesh(samples, layout, { i0, j0, i1, j1, stride }) {
  const xs = [], ys = [];
  for (let i = i0; i < i1; i += stride) xs.push(i);
  xs.push(i1);
  for (let j = j0; j < j1; j += stride) ys.push(j);
  ys.push(j1);
  const nx = xs.length, ny = ys.length;
  const positions = [], colours = [], indices = [];
  const vertex = (i, j, drop = 0) => {
    const h = samples[j * layout.columns + i];
    positions.push(layout.origin[0] + i * layout.spacing, layout.origin[1] + j * layout.spacing, h - drop);
    colours.push(...groundColour(h));
    return positions.length / 3 - 1;
  };
  for (const j of ys) for (const i of xs) vertex(i, j);
  const at = (a, b) => b * nx + a;
  // Counter-clockwise seen from above (z up): south-west, south-east, north-east; then north-west.
  for (let b = 0; b < ny - 1; b++) for (let a = 0; a < nx - 1; a++) {
    indices.push(at(a, b), at(a + 1, b), at(a + 1, b + 1), at(a, b), at(a + 1, b + 1), at(a, b + 1));
  }
  // The skirt: the chunk's rim walked counter-clockwise, each edge vertex dropped by SKIRT.
  const rim = [];
  for (let a = 0; a < nx; a++) rim.push([a, 0]);
  for (let b = 1; b < ny; b++) rim.push([nx - 1, b]);
  for (let a = nx - 2; a >= 0; a--) rim.push([a, ny - 1]);
  for (let b = ny - 2; b > 0; b--) rim.push([0, b]);
  const dropped = rim.map(([a, b]) => vertex(xs[a], ys[b], SKIRT));
  for (let k = 0; k < rim.length; k++) {
    const next = (k + 1) % rim.length;
    const top = at(...rim[k]), topNext = at(...rim[next]);
    indices.push(top, dropped[k], dropped[next], top, dropped[next], topNext);
  }
  return { positions: Float32Array.from(positions), colours: Float32Array.from(colours), indices: Uint32Array.from(indices) };
}

/** The whole heightfield in chunks of `size` cells, each with one mesh per stride (finest first).
 *  Every chunk also reports its centre and its box (`low`, `high` corners) in ENU: a level is chosen
 *  by how far the eye is from the box, so the chunk one stands in is always drawn finest. */
export function terrainChunks(samples, layoutIn, { size = 32, strides = [1, 2, 4, 8] } = {}) {
  const layout = heightfieldLayout(layoutIn);
  if (samples.length !== layout.columns * layout.rows) throw new RangeError("terrain: samples do not fill the layout");
  const chunks = [];
  for (let j0 = 0; j0 < layout.rows - 1; j0 += size) {
    for (let i0 = 0; i0 < layout.columns - 1; i0 += size) {
      const i1 = Math.min(i0 + size, layout.columns - 1), j1 = Math.min(j0 + size, layout.rows - 1);
      let low = Infinity, high = -Infinity;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const h = samples[j * layout.columns + i];
        low = Math.min(low, h);
        high = Math.max(high, h);
      }
      const centre = [
        layout.origin[0] + (i0 + i1) / 2 * layout.spacing,
        layout.origin[1] + (j0 + j1) / 2 * layout.spacing,
        (low + high) / 2,
      ];
      chunks.push({
        cells: { i0, j0, i1, j1 },
        centre,
        box: [
          [layout.origin[0] + i0 * layout.spacing, layout.origin[1] + j0 * layout.spacing, low],
          [layout.origin[0] + i1 * layout.spacing, layout.origin[1] + j1 * layout.spacing, high],
        ],
        levels: strides.map((stride) => ({ stride, ...chunkMesh(samples, layout, { i0, j0, i1, j1, stride }) })),
      });
    }
  }
  return chunks;
}
