// particles — DETERMINISTIC particle/FX effects. The hazard this module exists to avoid: a naive
// particle system advances a running RNG stream one step per frame, which means "what did particle
// #7 look like at tick 40" can only be answered by replaying frames 0..40 in order — utterly
// incompatible with this engine's whole premise that a replay can be scrubbed to any tick and a live
// spectator's projection is byte-identical to a replay's at the same tick (project.mjs's own header).
//
// The fix used throughout: every particle's random-looking attributes (spawn angle, speed, color
// pick, phase) are derived directly from `hash32(seed, particleIndex, salt)` — a PURE function of
// (seed, index), not a stream position — and its motion is a CLOSED-FORM function of its own age
// (ballistic kinematics: `x = x0 + vx*age`, not `x += vx` integrated frame by frame). The result:
// `sampleEffect(effect, tick)` can be called for tick 400 with no knowledge of ticks 0..399, and
// calling it twice (or from two independently-constructed but content-identical `effect` objects)
// always returns byte-identical entries — see `tests/prove-particles.mjs`'s property tests.
//
// Time is TICKS, never milliseconds-since-something — see this package's `project()`/§0 discipline:
// a pure layer reads no wall clock. A caller converts its own tick rate to whatever visual speed it
// wants by scaling `speed`/`gravity` in the spec, not by feeding this module `Date.now()`.
//
// Effects are DATA (`{ id, seed, spec, startTick }`, frozen) `sampleEffect` reads, exactly the same
// "a celebration/tween/camera is data, not a running object" shape the rest of this pass uses.

import { clamp01 } from "./clamp.mjs";
import { hash32, rand01, randRange } from "./deterministic-random.mjs";

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function pick(list, seed, index, salt) {
  const items = Array.isArray(list) && list.length > 0 ? list : ["#ffffff"];
  return items[hash32(seed, index, salt) % items.length];
}

// createEffect — bundles the inputs; performs NO simulation itself (there is nothing to precompute —
// sampleEffect derives everything analytically from (seed, tick) on every call).
export function createEffect({ id, seed, spec, startTick = 0 } = {}) {
  if (!spec || typeof spec.type !== "string") throw new TypeError("particles: createEffect requires spec.type");
  const s = Number(seed);
  if (!Number.isFinite(s)) throw new TypeError("particles: createEffect requires a finite numeric seed");
  return Object.freeze({ id: id ?? `fx-${s}`, seed: s | 0, spec: Object.freeze({ ...spec }), startTick: Math.trunc(Number(startTick) || 0) });
}

function baseEntry(effect, localId, over) {
  return {
    id: `${effect.id}:${localId}`,
    kind: "particle",
    role: "particle",
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    label: `${effect.id}:${localId}`,
    layer: "fx",
    scale: 1,
    rotation: 0,
    opacity: 1,
    sprite: effect.spec.sprite ?? "disc",
    ...over,
  };
}

// === burst — N particles fired once from `origin` at effect.startTick, ballistic (constant gravity),
// linearly fading over `durationTicks`. ============================================================
function sampleBurst(effect, tick) {
  const { spec, seed, startTick } = effect;
  const count = Math.max(0, Math.trunc(spec.count ?? 24));
  const duration = Math.max(1, Math.trunc(spec.durationTicks ?? 20));
  const origin = spec.origin ?? { x: 0, y: 0 };
  const gravity = spec.gravity ?? 0.15;
  const [angleMin, angleMax] = spec.angleRange ?? [0, Math.PI * 2];
  const age = tick - startTick;
  const entries = [];
  if (age >= 0 && age <= duration) {
    for (let i = 0; i < count; i++) {
      const angle = randRange(seed, i, angleMin, angleMax, 1);
      const speed = randRange(seed, i, spec.minSpeed ?? 1.5, spec.maxSpeed ?? 4, 2);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const lifeT = clamp01(age / duration);
      entries.push(
        baseEntry(effect, `b${i}`, {
          x: origin.x + vx * age,
          y: origin.y + vy * age + 0.5 * gravity * age * age,
          rotation: angle,
          scale: (spec.scale ?? 1) * (1 - 0.35 * lifeT),
          opacity: clamp01(1 - lifeT),
          tint: pick(spec.colors, seed, i, 3),
        }),
      );
    }
  }
  return { done: age > duration, entries };
}

// === fountain — a continuously-repeating burst: `count` particle "slots", each with its own hashed
// stagger offset inside a repeating `cycleTicks` window, so an arbitrarily long-running fountain
// never needs unbounded state — any tick's frame is computed directly from `tick mod cycleTicks`.
function sampleFountain(effect, tick) {
  const { spec, seed, startTick } = effect;
  const count = Math.max(0, Math.trunc(spec.count ?? 16));
  const cycleTicks = Math.max(1, Math.trunc(spec.cycleTicks ?? 24));
  const lifeTicks = Math.max(1, Math.min(cycleTicks, Math.trunc(spec.lifeTicks ?? cycleTicks)));
  const origin = spec.origin ?? { x: 0, y: 0 };
  const gravity = spec.gravity ?? 0.12;
  const elapsed = tick - startTick;
  const done = spec.totalTicks !== undefined && elapsed > spec.totalTicks;
  const entries = [];
  if (elapsed >= 0 && !done) {
    for (let i = 0; i < count; i++) {
      const stagger = Math.trunc(rand01(seed, i, 4) * cycleTicks);
      const cyclePos = (elapsed - stagger) % cycleTicks;
      const age = cyclePos < 0 ? cyclePos + cycleTicks : cyclePos;
      if (age > lifeTicks) continue;
      const generation = Math.floor((elapsed - stagger) / cycleTicks);
      const angle = randRange(seed, i, spec.angleRange?.[0] ?? Math.PI * 0.35, spec.angleRange?.[1] ?? Math.PI * 0.65, generation + 10);
      const speed = randRange(seed, i, spec.minSpeed ?? 2, spec.maxSpeed ?? 4.5, generation + 20);
      const vx = Math.cos(angle) * speed;
      const vy = -Math.abs(Math.sin(angle) * speed); // fountains go up (screen -y) by convention
      const lifeT = clamp01(age / lifeTicks);
      entries.push(
        baseEntry(effect, `f${i}`, {
          x: origin.x + vx * age,
          y: origin.y + vy * age + 0.5 * gravity * age * age,
          rotation: angle,
          scale: (spec.scale ?? 1) * (1 - 0.2 * lifeT),
          opacity: clamp01(1 - lifeT * lifeT),
          tint: pick(spec.colors, seed, i, generation + 30),
        }),
      );
    }
  }
  return { done, entries };
}

// === confetti — like burst, but a near-full-circle spread, continuous spin, and a sinusoidal x-drift
// (a deterministic "flutter" instead of a random walk). ============================================
function sampleConfetti(effect, tick) {
  const { spec, seed, startTick } = effect;
  const count = Math.max(0, Math.trunc(spec.count ?? 40));
  const duration = Math.max(1, Math.trunc(spec.durationTicks ?? 36));
  const origin = spec.origin ?? { x: 0, y: 0 };
  const gravity = spec.gravity ?? 0.1;
  const age = tick - startTick;
  const entries = [];
  if (age >= 0 && age <= duration) {
    for (let i = 0; i < count; i++) {
      const angle = randRange(seed, i, -Math.PI * 0.85, -Math.PI * 0.15, 1);
      const speed = randRange(seed, i, 2, 5, 2);
      const spinSpeed = randRange(seed, i, -0.5, 0.5, 5);
      const driftFreq = randRange(seed, i, 0.15, 0.4, 6);
      const driftAmp = randRange(seed, i, 1, 4, 7);
      const phase = rand01(seed, i, 8) * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const lifeT = clamp01(age / duration);
      entries.push(
        baseEntry(effect, `c${i}`, {
          x: origin.x + vx * age + Math.sin(age * driftFreq + phase) * driftAmp,
          y: origin.y + vy * age + 0.5 * gravity * age * age,
          rotation: spinSpeed * age,
          scale: spec.scale ?? 0.8,
          opacity: clamp01(1 - lifeT),
          tint: pick(spec.colors, seed, i, 9),
        }),
      );
    }
  }
  return { done: age > duration, entries };
}

// === trail — fading ghosts along a CALLER-SUPPLIED position history (`spec.positions:
// [{tick,x,y}]`). This module never accumulates position history itself (that would be per-frame
// mutable state this module otherwise has none of) — the caller (typically render-loop.mjs, which
// already knows an entity's per-tick positions from the room state it is rendering) hands over the
// data, purely. ====================================================================================
function sampleTrail(effect, tick) {
  const { spec } = effect;
  const trailTicks = Math.max(1, Math.trunc(spec.trailTicks ?? 8));
  const positions = Array.isArray(spec.positions) ? spec.positions : [];
  const entries = [];
  for (const p of positions) {
    const age = tick - p.tick;
    if (age < 0 || age > trailTicks) continue;
    const lifeT = clamp01(age / trailTicks);
    entries.push(
      baseEntry(effect, `t${p.tick}`, {
        x: p.x,
        y: p.y,
        scale: (spec.scale ?? 1) * (1 - 0.4 * lifeT),
        opacity: clamp01((1 - lifeT) * (spec.maxOpacity ?? 0.6)),
        tint: spec.tint,
      }),
    );
  }
  return { done: false, entries };
}

// === shockwave — a small number of concentric expanding rings, staggered in start time. ===========
function sampleShockwave(effect, tick) {
  const { spec, startTick } = effect;
  const count = Math.max(1, Math.trunc(spec.count ?? 2));
  const duration = Math.max(1, Math.trunc(spec.durationTicks ?? 14));
  const stagger = Math.max(0, Math.trunc(spec.staggerTicks ?? 3));
  const origin = spec.origin ?? { x: 0, y: 0 };
  const entries = [];
  let allExpired = true;
  for (let i = 0; i < count; i++) {
    const age = tick - startTick - i * stagger;
    if (age <= duration) allExpired = false; // not yet started (age<0) or still animating
    if (age < 0 || age > duration) continue;
    const t = age / duration;
    entries.push(
      baseEntry(effect, `s${i}`, {
        x: origin.x,
        y: origin.y,
        sprite: spec.sprite ?? "ring",
        scale: lerp(spec.startScale ?? 0.3, spec.endScale ?? 4, t),
        opacity: clamp01(1 - t),
        tint: spec.tint,
      }),
    );
  }
  return { done: allExpired, entries };
}

// === glowPulse — one or more pulsing glow sprites behind/around `origin`, oscillating scale/opacity
// via a smooth cosine envelope (attack/decay-free, symmetric breathing pulse). =====================
function sampleGlowPulse(effect, tick) {
  const { spec, seed, startTick } = effect;
  const count = Math.max(1, Math.trunc(spec.count ?? 1));
  const periodTicks = Math.max(1, Math.trunc(spec.periodTicks ?? 10));
  const origin = spec.origin ?? { x: 0, y: 0 };
  const age = tick - startTick;
  const done = spec.durationTicks !== undefined && age > spec.durationTicks;
  const entries = [];
  if (age >= 0 && !done) {
    for (let i = 0; i < count; i++) {
      const phaseOffset = rand01(seed, i, 11) * periodTicks;
      const phase = ((age + phaseOffset) % periodTicks) / periodTicks;
      const pulse = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      entries.push(
        baseEntry(effect, `g${i}`, {
          x: origin.x,
          y: origin.y,
          sprite: spec.sprite ?? "ring",
          scale: lerp(spec.minScale ?? 1, spec.maxScale ?? 1.6, pulse),
          opacity: clamp01(lerp(spec.minOpacity ?? 0.25, spec.maxOpacity ?? 0.85, pulse)),
          tint: spec.tint ?? "#fde047",
        }),
      );
    }
  }
  return { done, entries };
}

const SAMPLERS = {
  burst: sampleBurst,
  fountain: sampleFountain,
  confetti: sampleConfetti,
  trail: sampleTrail,
  shockwave: sampleShockwave,
  glowPulse: sampleGlowPulse,
};

// sampleEffect — pure: same (effect, tick) in, same { done, entries } out, every call, regardless of
// call order or how many times it was called before. `entries` are ready to fold into a
// SceneDescription via project.mjs's `mergeSceneLayer(scene, entries)`.
export function sampleEffect(effect, tick) {
  const sampler = SAMPLERS[effect.spec.type];
  if (!sampler) throw new TypeError(`particles: unknown emitter spec.type "${effect.spec.type}"`);
  const t = Math.trunc(Number(tick) || 0);
  return sampler(effect, t);
}

export function listEmitterTypes() {
  return Object.keys(SAMPLERS);
}

// === presets — sensible defaults for the spec shapes above, mergeable with per-call overrides. ====
export const PRESETS = Object.freeze({
  "coin-fountain": (overrides = {}) => ({
    type: "fountain",
    count: 18,
    cycleTicks: 22,
    lifeTicks: 16,
    minSpeed: 2.2,
    maxSpeed: 4.5,
    gravity: 0.14,
    scale: 0.9,
    sprite: "coin",
    colors: ["#facc15", "#fde047", "#eab308"],
    origin: { x: 0, y: 0 },
    ...overrides,
  }),
  "confetti-burst": (overrides = {}) => ({
    type: "confetti",
    count: 60,
    durationTicks: 40,
    scale: 0.8,
    sprite: "disc",
    colors: ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"],
    origin: { x: 0, y: 0 },
    ...overrides,
  }),
  "win-glow": (overrides = {}) => ({
    type: "glowPulse",
    count: 1,
    periodTicks: 8,
    minScale: 1,
    maxScale: 1.8,
    minOpacity: 0.3,
    maxOpacity: 0.9,
    sprite: "ring",
    tint: "#fde047",
    origin: { x: 0, y: 0 },
    ...overrides,
  }),
  "sparkle-trail": (overrides = {}) => ({
    type: "trail",
    trailTicks: 10,
    scale: 0.6,
    tint: "#e0f2fe",
    positions: [],
    ...overrides,
  }),
});

export function presetSpec(name, overrides = {}) {
  const factory = PRESETS[name];
  if (!factory) throw new TypeError(`particles: unknown preset "${name}" (known: ${Object.keys(PRESETS).join(", ")})`);
  return factory(overrides);
}

export function listPresets() {
  return Object.keys(PRESETS);
}
