// solids — the 3D tier's shapes as plain meshes, in the world's frame (x east, y north, z up).
// Pure: a mesh is { positions, normals, indices, colours? } of typed arrays, three numbers a vertex
// (colours linear rgb). Nothing here knows a GPU; a device uploads what it is handed.

import { invert, transform } from "./linear.mjs";

function mesh(positions, normals, indices, colours = null) {
  const out = { positions: Float32Array.from(positions), normals: Float32Array.from(normals), indices: Uint32Array.from(indices) };
  if (colours) out.colours = Float32Array.from(colours);
  return out;
}

/** Smooth per-vertex normals: each vertex the area-weighted mean of the faces about it. */
export function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let k = 0; k < indices.length; k += 3) {
    const a = indices[k] * 3, b = indices[k + 1] * 3, c = indices[k + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normals[v] += nx;
      normals[v + 1] += ny;
      normals[v + 2] += nz;
    }
  }
  for (let v = 0; v < normals.length; v += 3) {
    const length = Math.hypot(normals[v], normals[v + 1], normals[v + 2]) || 1;
    normals[v] /= length;
    normals[v + 1] /= length;
    normals[v + 2] /= length;
  }
  return normals;
}

/** A mesh from positions and triangles, smooth-shaded: what a heightfield chunk or an asset is. */
export function smooth({ positions, indices, colours = null }) {
  return mesh(positions, computeNormals(positions, indices), indices, colours);
}

/** The same surface with every face its own flat normal: the low-poly look, and sharp edges. */
export function faceted({ positions, indices, colours = null }) {
  const p = [], n = [], c = colours ? [] : null, index = [];
  for (let k = 0; k < indices.length; k += 3) {
    const corners = [indices[k], indices[k + 1], indices[k + 2]];
    const [a, b, d] = corners.map((v) => [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const normal = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const length = Math.hypot(...normal);
    if (!length) continue;
    for (const [slot, v] of corners.entries()) {
      index.push(p.length / 3);
      p.push(...[a, b, d][slot]);
      n.push(normal[0] / length, normal[1] / length, normal[2] / length);
      if (c) c.push(colours[v * 3], colours[v * 3 + 1], colours[v * 3 + 2]);
    }
  }
  return mesh(p, n, index, c);
}

/** A mesh moved by a matrix: positions by it, normals by its inverse transpose. */
export function transformed(solid, matrix) {
  const inverse = invert(matrix);
  const positions = new Float32Array(solid.positions.length), normals = new Float32Array(solid.normals.length);
  for (let k = 0; k < positions.length; k += 3) {
    const [x, y, z] = transform(matrix, [solid.positions[k], solid.positions[k + 1], solid.positions[k + 2]]);
    positions.set([x, y, z], k);
    const nx = solid.normals[k], ny = solid.normals[k + 1], nz = solid.normals[k + 2];
    // (M⁻¹)ᵀ n, the upper 3×3 only.
    const tx = inverse[0] * nx + inverse[1] * ny + inverse[2] * nz;
    const ty = inverse[4] * nx + inverse[5] * ny + inverse[6] * nz;
    const tz = inverse[8] * nx + inverse[9] * ny + inverse[10] * nz;
    const length = Math.hypot(tx, ty, tz) || 1;
    normals.set([tx / length, ty / length, tz / length], k);
  }
  return { ...solid, positions, normals };
}

/** A surface of revolution about the z axis: `profile` is [radius, z] from bottom to top; a radius
 *  of 0 is a pole. Indexed, so `smooth` or `faceted` gives it normals. */
export function lathe(profile, segments, phase = 0) {
  const positions = [], indices = [], rings = [];
  for (const [radius, z] of profile) {
    if (radius === 0) {
      rings.push([positions.length / 3]);
      positions.push(0, 0, z);
      continue;
    }
    const ring = [];
    for (let s = 0; s < segments; s++) {
      const angle = phase + (2 * Math.PI * s) / segments;
      ring.push(positions.length / 3);
      positions.push(radius * Math.cos(angle), radius * Math.sin(angle), z);
    }
    rings.push(ring);
  }
  const at = (ring, s) => ring[ring.length === 1 ? 0 : s % segments];
  for (let r = 0; r < rings.length - 1; r++) {
    const lower = rings[r], upper = rings[r + 1];
    for (let s = 0; s < segments; s++) {
      const a = at(lower, s), b = at(lower, s + 1), c = at(upper, s + 1), d = at(upper, s);
      if (lower.length > 1) indices.push(a, b, c);
      if (upper.length > 1) indices.push(a, c, d);
    }
  }
  return { positions, indices };
}

const arc = (radius, from, to, steps, centre = 0) =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const angle = from + ((to - from) * k) / steps;
    return [Math.abs(radius * Math.cos(angle)) < 1e-9 ? 0 : radius * Math.cos(angle), centre + radius * Math.sin(angle)];
  });

export const sphere = (radius, segments = 12, rings = 8) => smooth(lathe(arc(radius, -Math.PI / 2, Math.PI / 2, rings), segments));

/** A capsule: a cylinder of `length` capped by hemispheres, centred on the origin. */
export const capsule = (radius, length, segments = 8, caps = 4) => smooth(lathe([
  ...arc(radius, -Math.PI / 2, 0, caps, -length / 2),
  ...arc(radius, 0, Math.PI / 2, caps, length / 2),
], segments));

/** A cone along z, base at -height/2 and apex at +height/2. */
export const cone = (radius, height, segments = 8, phase = 0) =>
  faceted(lathe([[0, -height / 2], [radius, -height / 2], [0, height / 2]], segments, phase));

export const cylinder = (radius, height, segments = 6) =>
  faceted(lathe([[0, -height / 2], [radius, -height / 2], [radius, height / 2], [0, height / 2]], segments));

/** A box of [width (x), depth (y), height (z)] about `centre`. */
export function box([width, depth, height], [cx, cy, cz] = [0, 0, 0]) {
  const x = [cx - width / 2, cx + width / 2], y = [cy - depth / 2, cy + depth / 2], z = [cz - height / 2, cz + height / 2];
  const corner = (i, j, k) => [x[i], y[j], z[k]];
  const faces = [
    [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], // bottom
    [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], // top
    [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], // south
    [[1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1]], // north
    [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]], // west
    [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], // east
  ];
  const positions = [], indices = [];
  for (const face of faces) {
    const base = positions.length / 3;
    for (const [i, j, k] of face) positions.push(...corner(i, j, k));
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return faceted({ positions, indices });
}

export function octahedron(radius) {
  const positions = [radius, 0, 0, -radius, 0, 0, 0, radius, 0, 0, -radius, 0, 0, 0, radius, 0, 0, -radius];
  const indices = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];
  return faceted({ positions, indices });
}

/** A flat disc facing up, at z = 0. */
export function disc(radius, segments = 48) {
  return faceted(lathe([[0, 0], [radius, 0]], segments));
}

/** A square of `size` facing up, at z = 0, centred on the origin. */
export function plane(size) {
  const h = size / 2;
  return mesh([-h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0], [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], [0, 1, 2, 0, 2, 3]);
}

/** A convex prism (a counterclockwise footprint over a [bottom, top] interval) as a floor and walls,
 *  open above so one looks into it: a place's extent. */
export function prism(footprint, [bottom, top]) {
  const n = footprint.length;
  const positions = [], indices = [];
  for (const [x, y] of footprint) positions.push(x, y, bottom);
  for (const [x, y] of footprint) positions.push(x, y, top);
  for (let k = 1; k < n - 1; k++) indices.push(0, k + 1, k);
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    indices.push(k, next, n + next, k, n + next, n + k);
  }
  return faceted({ positions, indices });
}

/** A closed polyline as line segments (pairs of indices), for an outline. */
export function outline(points) {
  const positions = points.flat(), indices = [];
  for (let k = 0; k < points.length; k++) indices.push(k, (k + 1) % points.length);
  return mesh(positions, new Array(positions.length).fill(0).map((_, k) => (k % 3 === 2 ? 1 : 0)), indices);
}

/** Many separate segments, [[from, to], ...], as one line mesh. */
export function segments(pairs) {
  const positions = pairs.flat(2), indices = pairs.flatMap((_, k) => [2 * k, 2 * k + 1]);
  return mesh(positions, new Array(positions.length).fill(0).map((_, k) => (k % 3 === 2 ? 1 : 0)), indices);
}
