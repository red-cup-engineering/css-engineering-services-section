// camera — pure pan/zoom/rotate/shake resolution for the `setCamera(pose)` half of the
// spatial-backend contract (`spatial-backend.mjs`'s OPTIONAL member; `render-2d.mjs`'s own backend
// gains a real implementation of it in this pass — see that file's header).
//
// POSE SHAPE: `{x, z, angle, zoom}` — the exact `{x, z, angle}` shape
// `examples/spectate/shared/create-abrash-backend.mjs` already established (a first-person 3D
// backend's ground-plane position + heading), extended ADDITIVELY with `zoom` so that backend stays
// conformant (it destructures the three fields it knows and ignores the rest) while every backend's
// `setCamera` speaks one shared pose vocabulary. A caller does `backend.setCamera(resolveCamera(spec,
// tick))` against EITHER backend.
//
// A NOTE ON THE AXIS NAMES, for anyone surprised `render-2d` (a top-down 2D backend whose entities
// plot by `x`/`y`, per project.mjs) takes a pose keyed `x`/`z`: the camera pose is a SEPARATE small
// struct from entity coordinates, and its field names are fixed by the spatial-backend contract that
// abrash's 3D ground-plane already established — not by render-2d's own entity-plane convention.
// render-2d's `setCamera` treats `pose.z` as its second (screen-vertical) pan axis; this is a naming
// choice, not a claim that render-2d suddenly reads entity `z` (elevation) for anything — it still
// doesn't (see render-2d.mjs's own header). Reusing the established name keeps one pose vocabulary
// working across every backend instead of inventing a second one this package would then have to
// keep in sync.
//
// DETERMINISM: `resolveCamera(spec, tick)` is a pure function of a tick number — no wall clock, no
// Math.random. Screen-shake (`spec.shake`) is a seeded, smoothly-decaying pseudo-noise function of
// `tick - shake.startTick`, evaluable at any tick directly (see deterministic-random.mjs's
// `smoothNoise1D` for why this is safe to scrub, exactly like particles.mjs's kinematics).

import { clamp01 } from "./clamp.mjs";
import { easingFn } from "./tween.mjs";
import { smoothNoise1D } from "./deterministic-random.mjs";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// keyframeValue — a single-value {from,to,startTick,durationTicks,easing} keyframe, resolved at
// `tick`; `base` is the value held before the keyframe starts and after it if `to` never applies.
function keyframeValue(base, keyframe, tick) {
  if (!keyframe || typeof keyframe.to !== "number") return base;
  const startTick = Math.trunc(Number(keyframe.startTick) || 0);
  const durationTicks = Math.max(1, Math.trunc(Number(keyframe.durationTicks) || 1));
  const t = clamp01((tick - startTick) / durationTicks);
  const eased = easingFn(keyframe.easing ?? "linear")(t);
  const from = typeof keyframe.from === "number" ? keyframe.from : base;
  return lerp(from, keyframe.to, eased);
}

function resolvePan(spec, tick) {
  const baseX = Number(spec.x) || 0;
  const baseZ = Number(spec.z) || 0;
  const pan = spec.pan;
  if (!pan || !pan.to) return { x: baseX, z: baseZ };
  const startTick = Math.trunc(Number(pan.startTick) || 0);
  const durationTicks = Math.max(1, Math.trunc(Number(pan.durationTicks) || 1));
  const t = clamp01((tick - startTick) / durationTicks);
  const eased = easingFn(pan.easing ?? "linear")(t);
  const fromX = pan.from?.x ?? baseX;
  const fromZ = pan.from?.z ?? baseZ;
  return { x: lerp(fromX, pan.to.x ?? fromX, eased), z: lerp(fromZ, pan.to.z ?? fromZ, eased) };
}

// resolveShake — a decaying, seeded pseudo-noise displacement (`{dx, dz}`), zero outside
// [shake.startTick, shake.startTick + durationTicks]. Two independent noise channels (different
// `salt`) so x/z do not shake in lockstep along a single line.
function resolveShake(spec, tick) {
  const shake = spec.shake;
  if (!shake) return { dx: 0, dz: 0 };
  const startTick = Math.trunc(Number(shake.startTick) || 0);
  const durationTicks = Math.max(1, Math.trunc(Number(shake.durationTicks) || 10));
  const age = tick - startTick;
  if (age < 0 || age > durationTicks) return { dx: 0, dz: 0 };
  const magnitude = Number(shake.magnitude) || 0;
  const frequency = Number(shake.frequency) || 1.5;
  const decayFactor = shake.decay === "linear" ? Math.max(0, 1 - age / durationTicks) : Math.exp(-age / (durationTicks / 3));
  const seed = Number(shake.seed) || 0;
  return {
    dx: smoothNoise1D(seed, age * frequency, 101) * magnitude * decayFactor,
    dz: smoothNoise1D(seed, age * frequency, 202) * magnitude * decayFactor,
  };
}

// resolveCamera — the ONE call a render loop makes per frame to get a pose ready for
// `backend.setCamera(pose)`. Pure: identical (spec, tick) always resolves to an identical pose.
//
// spec:
//   x, z, angle, zoom  — the static/base pose, held when no keyframe below overrides it
//   pan: { from:{x,z}, to:{x,z}, startTick, durationTicks, easing }   — animated pan
//   zoomTo / rotateTo: { from, to, startTick, durationTicks, easing } — animated zoom/rotation
//   shake: { seed, startTick, durationTicks, magnitude, frequency, decay: "linear"|"exp" }
export function resolveCamera(spec = {}, tick = 0) {
  const t = Math.trunc(Number(tick) || 0);
  const pan = resolvePan(spec, t);
  const shake = resolveShake(spec, t);
  const zoom = keyframeValue(Number(spec.zoom) || 1, spec.zoomTo, t);
  const angle = keyframeValue(Number(spec.angle) || 0, spec.rotateTo, t);
  return { x: pan.x + shake.dx, z: pan.z + shake.dz, angle, zoom: Math.max(0.01, zoom) };
}

export const DEFAULT_CAMERA_POSE = Object.freeze({ x: 0, z: 0, angle: 0, zoom: 1 });
