// tween — PRESENTATION-EFFECT animation, deliberately scoped away from NETWORK-STATE smoothing.
//
// client.mjs already owns network-state smoothing, twice over: `InterpolationBuffer.sample()` does
// tick-locked linear interpolation of x/y/z/yaw between two buffered wire frames, and
// `WorldView.interpolate()` does a fixed exponential local/remote-rate approach for the same fields
// in the no-buffer path. Both exist to answer one question — "where IS this entity, right now,
// between two authoritative ticks" — and this module MUST NOT re-answer it: `interpolateScene()`
// below never reads or writes x/y/z/yaw at all. It answers a different question: "how should scale,
// rotation, opacity, and tint — fields that never existed before this pass and that neither of those
// mechanisms knows about — ease between two ticks, and what happens to an entity that just appeared
// or is about to disappear." Position keeps coming from wherever it always came from; `applyPositions`
// below is the explicit seam that composes the two passes without either one clobbering the other —
// see `render-loop.mjs`'s header for the full per-frame call order this is designed to slot into.
//
// Pure throughout: `interpolateScene(prevScene, nextScene, alpha, opts)` is a function of its
// arguments only (no wall clock, no Math.random, no shared state) — the same determinism discipline
// `project()` documents at its own top, extended to easing instead of projection.

import { clamp01 } from "./clamp.mjs";

function numOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// === easing library ================================================================================
// Every function maps t in [0,1] to t' (not necessarily in [0,1] — elastic/back overshoot on purpose).
// Pure math, nothing else — safe to call at any alpha, including out-of-range ones an extrapolating
// InterpolationBuffer sample can legitimately produce.

const EASINGS = Object.freeze({
  linear: (t) => t,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutElastic: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
});

export function listEasings() {
  return Object.keys(EASINGS);
}
export function easingFn(name) {
  return EASINGS[name] ?? EASINGS.linear;
}
export function ease(name, t) {
  return easingFn(name)(t);
}
export { EASINGS as easings };

// === color lerp — best-effort, hex-only ==========================================================
// `tint` is scene-entry-level data (project.mjs's optional `tint` field), typically a hex color. A
// named CSS color, a CSS custom property reference, or a gradient descriptor cannot be numerically
// blended, so those fall back to a discrete switch at the easing midpoint rather than lying about a
// blend that never happened.

function parseHex(color) {
  if (typeof color !== "string") return null;
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  const n = Number.parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColor(a, b, t) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return t < 0.5 ? a : b;
  const mix = ca.map((v, i) => Math.round(clamp01(t) * (cb[i] - v) + v));
  return `#${mix.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

// === scene sort — mirrors project.mjs's (layer, z, id) rule, duplicated rather than imported so this
// module never needs to know project.mjs's internal layer-rank table beyond the small public
// LAYER_ORDER constant it already exports. ==========================================================

const LAYER_RANK = { backdrop: 0, board: 1, pieces: 2, fx: 3, overlay: 4 };
function layerRank(layer) {
  if (layer === undefined) return LAYER_RANK.pieces;
  return Object.prototype.hasOwnProperty.call(LAYER_RANK, layer) ? LAYER_RANK[layer] : LAYER_RANK.pieces + 0.5;
}
function sortEntries(a, b) {
  const la = layerRank(a.layer);
  const lb = layerRank(b.layer);
  if (la !== lb) return la - lb;
  const za = numOr(a.z, 0);
  const zb = numOr(b.z, 0);
  if (za !== zb) return za - zb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function byId(entries) {
  const m = new Map();
  for (const e of entries ?? []) if (e && typeof e.id === "string") m.set(e.id, e);
  return m;
}

// interpolateScene — the presentation pass. `prevScene`/`nextScene` are two SceneDescriptions
// (typically `project()`'d from the two RAW tick-frames an InterpolationBuffer.sampleBrackets()
// bracket names — see render-loop.mjs); `alpha` is that SAME bracket's alpha (0..1, or beyond 1 for
// an extrapolating buffer, handled gracefully — easing functions are just evaluated past their
// "designed" domain, which is a valid, if extreme, thing to do to them).
//
// opts:
//   easing              — default easing name for the "both present" case (default "linear")
//   perEntityEasing      — { [id]: easingName } override, checked before the default/enter/exit easing
//   enter.easing/.from   — an entity present only in nextScene animates FROM opts.enter.from (default
//                          { scale: 0, opacity: 0, rotation: 0 }) TO its own real values
//   exit.easing/.to      — an entity present only in prevScene animates TOWARD opts.exit.to (default
//                          { scale: 0, opacity: 0 }); it is dropped from the output entirely once
//                          alpha reaches 1 — the ONE tick transition in which it disappeared is the
//                          whole exit window (a longer send-off is a job for particles.mjs/celebration
//                          .mjs, not this module — see this file's header).
//
// Position fields (x/y/z/yaw) are copied through UNCHANGED (from nextScene when both sides have the
// entity, from whichever side is present otherwise) — never computed here. See this file's header.
export function interpolateScene(prevScene, nextScene, alpha, opts = {}) {
  // clamp at 0 (never go "before" the start), but deliberately allow > 1 through — an extrapolating
  // InterpolationBuffer.sampleBrackets() can legitimately report alpha > 1, and letting easing
  // functions run past 1 (elastic/back already overshoot within [0,1] anyway) is more honest than
  // silently clamping motion that has already been asked to extrapolate.
  const rawAlpha = Number(alpha);
  const a = Number.isFinite(rawAlpha) ? Math.max(0, rawAlpha) : 0;
  const globalEasing = opts.easing ?? "linear";
  const perEntity = opts.perEntityEasing ?? {};
  const enterFrom = { scale: 0, opacity: 0, rotation: 0, ...(opts.enter?.from ?? {}) };
  const enterEasing = opts.enter?.easing ?? globalEasing;
  const exitTo = { scale: 0, opacity: 0, ...(opts.exit?.to ?? {}) };
  const exitEasing = opts.exit?.easing ?? globalEasing;

  const prevById = byId(prevScene?.entries);
  const nextById = byId(nextScene?.entries);
  const ids = new Set([...prevById.keys(), ...nextById.keys()]);
  const entries = [];

  for (const id of ids) {
    const prevEntry = prevById.get(id);
    const nextEntry = nextById.get(id);

    if (prevEntry && nextEntry) {
      const t = easingFn(perEntity[id] ?? globalEasing)(a);
      const merged = { ...prevEntry, ...nextEntry };
      merged.scale = lerp(numOr(prevEntry.scale, 1), numOr(nextEntry.scale, 1), t);
      merged.rotation = lerp(numOr(prevEntry.rotation, 0), numOr(nextEntry.rotation, 0), t);
      merged.opacity = clamp01(lerp(numOr(prevEntry.opacity, 1), numOr(nextEntry.opacity, 1), t));
      if (prevEntry.tint !== undefined || nextEntry.tint !== undefined) {
        merged.tint = lerpColor(prevEntry.tint, nextEntry.tint, t);
      }
      entries.push(merged);
    } else if (nextEntry) {
      const t = easingFn(perEntity[id] ?? enterEasing)(a);
      entries.push({
        ...nextEntry,
        scale: lerp(enterFrom.scale, numOr(nextEntry.scale, 1), t),
        rotation: lerp(enterFrom.rotation, numOr(nextEntry.rotation, 0), t),
        opacity: clamp01(lerp(enterFrom.opacity, numOr(nextEntry.opacity, 1), t)),
      });
    } else if (prevEntry) {
      if (a >= 1) continue; // fully exited — the transition that removed it has completed
      const t = easingFn(perEntity[id] ?? exitEasing)(a);
      entries.push({
        ...prevEntry,
        scale: lerp(numOr(prevEntry.scale, 1), exitTo.scale, t),
        opacity: clamp01(lerp(numOr(prevEntry.opacity, 1), exitTo.opacity, t)),
      });
    }
  }

  entries.sort(sortEntries);
  return { tick: nextScene?.tick ?? prevScene?.tick ?? 0, entries, version: nextScene?.version ?? prevScene?.version ?? 2 };
}

// applyPositions — the explicit composition seam: overlays x/y/z/yaw from `positionEntities` (an
// InterpolationBuffer.sample() result, or any {id,x,y,z,yaw}[] array) onto a scene ALREADY produced
// by `interpolateScene()`, so the network-smoothed position wins over interpolateScene's own pass-
// through position (which came from a discrete tick, not the sub-tick-smoothed render moment). Pure;
// never mutates either argument.
export function applyPositions(scene, positionEntities) {
  const posById = byId(positionEntities);
  const entries = (scene?.entries ?? []).map((entry) => {
    const pos = posById.get(entry.id);
    if (!pos) return entry;
    const out = { ...entry };
    for (const key of ["x", "y", "z", "yaw"]) {
      const v = Number(pos[key]);
      if (Number.isFinite(v)) out[key] = v;
    }
    return out;
  });
  return { ...scene, entries };
}
