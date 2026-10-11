// linear — the 3D tier's arithmetic, in the world's own frame (x east, y north, z up, metres).
// Pure: matrices are column-major Float32Arrays of 16, as both WebGL2 and WebGPU read them; vectors
// are plain arrays. Clip space is the GPU's: x and y in [-1, 1], depth in [0, 1] (WebGPU's), which a
// WebGL2 device maps itself.

export const identity = () => Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

/** a · b, both column-major. */
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

/** A perspective projection: `fovy` in radians, depth mapped to [0, 1]. */
export function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = (near * far) / (near - far);
  return out;
}

export const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The view from `eye` toward `target`, z up (north when looking straight down). */
export function lookAt(eye, target, up = [0, 0, 1]) {
  const back = normalize(subtract(eye, target));
  let side = cross(up, back);
  if (Math.hypot(...side) < 1e-6) side = cross([0, 1, 0], back);
  side = normalize(side);
  const upward = cross(back, side);
  return Float32Array.of(
    side[0], upward[0], back[0], 0,
    side[1], upward[1], back[1], 0,
    side[2], upward[2], back[2], 0,
    -dot(side, eye), -dot(upward, eye), -dot(back, eye), 1,
  );
}

/** Stand a solid at `position`, turned `yaw` radians clockwise from north (a heading). */
export function placement([x, y, z], yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return Float32Array.of(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, x, y, z, 1);
}

export function invert(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  const k = 1 / det;
  return Float32Array.of(
    (a11 * b11 - a12 * b10 + a13 * b09) * k, (a02 * b10 - a01 * b11 - a03 * b09) * k,
    (a31 * b05 - a32 * b04 + a33 * b03) * k, (a22 * b04 - a21 * b05 - a23 * b03) * k,
    (a12 * b08 - a10 * b11 - a13 * b07) * k, (a00 * b11 - a02 * b08 + a03 * b07) * k,
    (a32 * b02 - a30 * b05 - a33 * b01) * k, (a20 * b05 - a22 * b02 + a23 * b01) * k,
    (a10 * b10 - a11 * b08 + a13 * b06) * k, (a01 * b08 - a00 * b10 - a03 * b06) * k,
    (a30 * b04 - a31 * b02 + a33 * b00) * k, (a21 * b02 - a20 * b04 - a23 * b00) * k,
    (a11 * b07 - a10 * b09 - a12 * b06) * k, (a00 * b09 - a01 * b07 + a02 * b06) * k,
    (a31 * b01 - a30 * b03 - a32 * b00) * k, (a20 * b03 - a21 * b01 + a22 * b00) * k,
  );
}

/** m · [x, y, z, 1], as [x, y, z, w]. */
export function transform(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
}

/** Where a world point falls on a `width` × `height` screen (pixels from the top left), or null
 *  behind the eye. */
export function projectPoint(viewProjection, point, width, height) {
  const [x, y, z, w] = transform(viewProjection, point);
  if (w <= 0) return null;
  return [((x / w + 1) / 2) * width, ((1 - y / w) / 2) * height, z / w];
}

/** The ray through a screen point: { origin, direction } in the world. */
export function screenRay(inverseViewProjection, px, py, width, height) {
  const nx = (px / width) * 2 - 1, ny = 1 - (py / height) * 2;
  const near = transform(inverseViewProjection, [nx, ny, 0]), far = transform(inverseViewProjection, [nx, ny, 1]);
  const origin = [near[0] / near[3], near[1] / near[3], near[2] / near[3]];
  const end = [far[0] / far[3], far[1] / far[3], far[2] / far[3]];
  return { origin, direction: normalize(subtract(end, origin)) };
}

/** Where a ray is inside a convex prism (a counterclockwise footprint over a z interval):
 *  [enter, leave] distances along it, or null if it misses (Cyrus–Beck clipping). */
export function rayThroughPrism({ origin, direction }, footprint, [bottom, top]) {
  let enter = 0, leave = Infinity;
  const clip = (denominator, numerator) => {
    // The ray is inside where numerator + t·denominator ≥ 0.
    if (Math.abs(denominator) < 1e-12) return numerator >= 0;
    const t = -numerator / denominator;
    if (denominator > 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
    return enter <= leave;
  };
  if (!clip(direction[2], origin[2] - bottom) || !clip(-direction[2], top - origin[2])) return null;
  for (let k = 0; k < footprint.length; k++) {
    const [ax, ay] = footprint[k], [bx, by] = footprint[(k + 1) % footprint.length];
    // Inward normal of a counterclockwise edge: (-(by - ay), bx - ax).
    const nx = -(by - ay), ny = bx - ax;
    if (!clip(nx * direction[0] + ny * direction[1], nx * (origin[0] - ax) + ny * (origin[1] - ay))) return null;
  }
  return [enter, leave];
}

/** Where a ray meets an axis-aligned box [[x0, y0, z0], [x1, y1, z1]], or null. */
export function rayThroughBox(ray, [[x0, y0, z0], [x1, y1, z1]]) {
  return rayThroughPrism(ray, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [z0, z1]);
}

/** An sRGB colour (0xrrggbb or [r, g, b] in 0..1) as linear [r, g, b]. */
export function linearColour(colour) {
  const channels = typeof colour === "number"
    ? [(colour >> 16) & 255, (colour >> 8) & 255, colour & 255].map((c) => c / 255)
    : typeof colour === "string" ? hexChannels(colour) : colour;
  return channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}
function hexChannels(text) {
  const hex = text.replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const value = Number.parseInt(full, 16);
  return Number.isFinite(value) ? [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255) : [0.8, 0.8, 0.8];
}
export const mix = (a, b, t) => {
  const k = Math.max(0, Math.min(1, t));
  return a.map((value, index) => value + (b[index] - value) * k);
};
