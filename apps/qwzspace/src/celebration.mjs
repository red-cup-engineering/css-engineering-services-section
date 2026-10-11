// celebration — composable "big-moment" choreography: a celebration is a TIMELINE of tween/particle/
// camera events, expressed as DATA (a registered factory returns tick-RELATIVE plan data; `celebrate()`
// binds it to an absolute `startTick` — the tick the triggering game event actually happened at, never
// `Date.now()`), so `sampleCelebration(plan, tick)` is exactly as pure and replay-scrubbable as
// particles.mjs's own `sampleEffect` (which it is built on top of).
//
// Generic tiering: every built-in celebration factory takes `(tier, overrides)` where `tier` is
// "minor" | "major" | "epic" — a single scale multiplier a game maps its own severity onto (a small
// win vs. a jackpot vs. whatever "epic" means for THAT game), rather than three hand-authored copies
// of the same timeline. `registerCelebration(name, factory)` lets any game add its own named
// celebrations using the identical mechanism the built-ins use — this module owns no special-cased
// "casino" concept anywhere.
//
// Composition: `sampleCelebration` returns `{ cameraPose, particleEntries, overlayEntries }` for a
// tick — a caller folds `particleEntries`/`overlayEntries` into its scene via
// `project.mjs`'s `mergeSceneLayer()` and passes `cameraPose` to `backend.setCamera()`. It invents no
// new rendering primitive: particles are `particles.mjs` entries (fx layer), overlay banner/flash
// entries are ordinary SceneEntry-shaped objects on the "overlay" layer (a flash is a big tinted
// "tile" sprite; a banner is a `text` entry) — render-2d already knows how to draw both.

import { resolveCamera } from "./camera.mjs";
import { clamp01 } from "./clamp.mjs";
import { createEffect, sampleEffect, presetSpec } from "./particles.mjs";
import { easingFn } from "./tween.mjs";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const TIER_SCALE = Object.freeze({ minor: 0.6, major: 1, epic: 1.7 });
export function tierScale(tier) {
  return TIER_SCALE[tier] ?? TIER_SCALE.major;
}
export function listTiers() {
  return Object.keys(TIER_SCALE);
}

const registry = new Map();

export function registerCelebration(name, factory) {
  if (typeof name !== "string" || !name) throw new TypeError("celebration: registerCelebration(name, factory) requires a non-empty string name");
  if (typeof factory !== "function") throw new TypeError(`celebration: registerCelebration("${name}", factory) requires factory(tier, overrides) to be a function`);
  registry.set(name, factory);
  return name;
}
export function getCelebration(name) {
  return registry.get(name) ?? null;
}
export function listCelebrations() {
  return [...registry.keys()].sort();
}

function shiftKeyframe(keyframe, startTick) {
  return keyframe ? { ...keyframe, startTick: startTick + (Number(keyframe.startTick) || 0) } : undefined;
}
function shiftCameraSpec(camera, startTick) {
  if (!camera) return null;
  return {
    ...camera,
    pan: shiftKeyframe(camera.pan, startTick),
    zoomTo: shiftKeyframe(camera.zoomTo, startTick),
    rotateTo: shiftKeyframe(camera.rotateTo, startTick),
    shake: shiftKeyframe(camera.shake, startTick),
  };
}

// celebrate — resolves a REGISTERED celebration into a bound, tick-absolute plan ready for
// `sampleCelebration()`. `seed` drives every particle sub-effect's determinism (each gets a distinct
// derived seed so two celebrations fired with different seeds never look identical, while the SAME
// seed always replays identically — matching particles.mjs's own discipline).
export function celebrate(name, { tier = "major", seed = 0, startTick = 0, overrides = {} } = {}) {
  const factory = registry.get(name);
  if (!factory) throw new TypeError(`celebration: unknown celebration "${name}" (known: ${listCelebrations().join(", ")})`);
  const raw = { ...factory(tier, overrides), ...overrides };
  const particles = (raw.particles ?? []).map((p, i) =>
    createEffect({ id: p.id ?? `${name}-p${i}`, seed: seed + i * 97 + 1, spec: p.spec, startTick: startTick + (Number(p.offsetTicks) || 0) }),
  );
  const overlay = (raw.overlay ?? []).map((o, i) => ({ ...o, id: o.id ?? `${name}-o${i}`, startTick: startTick + (Number(o.offsetTicks) || 0) }));
  return Object.freeze({
    name,
    tier,
    seed,
    startTick: Math.trunc(Number(startTick) || 0),
    durationTicks: Math.trunc(Number(raw.durationTicks) || 0),
    camera: shiftCameraSpec(raw.camera, startTick),
    particles: Object.freeze(particles),
    overlay: Object.freeze(overlay),
  });
}

function sampleBanner(o, tick) {
  const age = tick - o.startTick;
  const enterTicks = Math.max(1, Math.trunc(o.enterTicks ?? 4));
  const holdTicks = Math.max(0, Math.trunc(o.holdTicks ?? 14));
  const exitTicks = Math.max(1, Math.trunc(o.exitTicks ?? 4));
  const total = enterTicks + holdTicks + exitTicks;
  if (age < 0 || age > total) return null;
  let opacity;
  let scale;
  let yOffset;
  if (age < enterTicks) {
    const eased = easingFn(o.enterEasing ?? "easeOutBack")(age / enterTicks);
    opacity = clamp01(eased);
    scale = Math.max(0, lerp(0.4, 1, eased));
    yOffset = lerp(-20, 0, eased);
  } else if (age < enterTicks + holdTicks) {
    opacity = 1;
    scale = 1;
    yOffset = 0;
  } else {
    const eased = easingFn(o.exitEasing ?? "easeInCubic")((age - enterTicks - holdTicks) / exitTicks);
    opacity = clamp01(1 - eased);
    scale = Math.max(0, lerp(1, 0.8, eased));
    yOffset = lerp(0, -10, eased);
  }
  return {
    id: o.id,
    kind: "overlay",
    role: "overlay",
    x: o.x ?? 0,
    y: (o.y ?? 0) + yOffset,
    z: 0,
    yaw: 0,
    label: o.text ?? o.id,
    layer: "overlay",
    scale,
    rotation: 0,
    opacity,
    tint: o.tint,
    text: o.text ?? "",
    ...(o.textStyle ? { textStyle: o.textStyle } : {}),
  };
}

function sampleFlash(o, tick) {
  const age = tick - o.startTick;
  const duration = Math.max(1, Math.trunc(o.durationTicks ?? 8));
  if (age < 0 || age > duration) return null;
  const t = age / duration;
  const attack = clamp01(t / 0.15);
  const opacity = clamp01((o.peakOpacity ?? 0.7) * attack * (1 - t));
  const size = o.size ?? 4000;
  return {
    id: o.id,
    kind: "overlay",
    role: "overlay",
    x: o.x ?? 0,
    y: o.y ?? 0,
    z: 0,
    yaw: 0,
    label: o.id,
    layer: "overlay",
    scale: 1,
    rotation: 0,
    opacity,
    tint: o.tint ?? "#ffffff",
    sprite: "tile",
    spriteParams: { width: size, height: size, radius: 0 },
  };
}

// sampleCelebration — pure: same (plan, tick) in, same { active, cameraPose, particleEntries,
// overlayEntries } out, every call.
export function sampleCelebration(plan, tick) {
  const t = Math.trunc(Number(tick) || 0);
  const cameraPose = plan.camera ? resolveCamera(plan.camera, t) : null;

  const particleEntries = [];
  let particlesActive = false;
  for (const effect of plan.particles) {
    const { done, entries } = sampleEffect(effect, t);
    if (!done) particlesActive = true;
    particleEntries.push(...entries);
  }

  const overlayEntries = [];
  for (const o of plan.overlay) {
    const entry = o.type === "flash" ? sampleFlash(o, t) : o.type === "banner" ? sampleBanner(o, t) : null;
    if (entry) overlayEntries.push(entry);
  }

  const age = t - plan.startTick;
  const active = age >= 0 && (age <= plan.durationTicks || particlesActive || overlayEntries.length > 0);
  return { active, cameraPose, particleEntries, overlayEntries };
}

// === built-ins ======================================================================================

registerCelebration("jackpot", (tier, overrides = {}) => {
  const s = tierScale(tier);
  return {
    durationTicks: Math.round(40 * s),
    camera: {
      zoomTo: { from: 1, to: 1 + 0.35 * s, startTick: 0, durationTicks: 4, easing: "easeOutBack" },
      shake: { startTick: 0, durationTicks: Math.round(10 * s), magnitude: 3 * s, frequency: 2, decay: "exp" },
    },
    particles: [
      { id: "confetti", offsetTicks: 0, spec: presetSpec("confetti-burst", { count: Math.round(40 * s) }) },
      { id: "coins", offsetTicks: 2, spec: presetSpec("coin-fountain", { count: Math.round(20 * s), totalTicks: Math.round(30 * s) }) },
    ],
    overlay: [
      { id: "flash", type: "flash", offsetTicks: 0, durationTicks: 8, peakOpacity: 0.6 * s, tint: "#fff7d6" },
      { id: "banner", type: "banner", offsetTicks: 2, text: overrides.text ?? "JACKPOT!", holdTicks: Math.round(18 * s), tint: "#fde047" },
    ],
  };
});

registerCelebration("win", (tier, overrides = {}) => {
  const s = tierScale(tier);
  return {
    durationTicks: Math.round(26 * s),
    particles: [{ id: "glow", offsetTicks: 0, spec: presetSpec("win-glow", { periodTicks: 8, maxScale: 1.5 + 0.3 * s }) }],
    overlay: [{ id: "banner", type: "banner", offsetTicks: 0, text: overrides.text ?? "WIN!", holdTicks: Math.round(14 * s), tint: "#a3e635" }],
  };
});

registerCelebration("flash", (tier, overrides = {}) => {
  const s = tierScale(tier);
  return {
    durationTicks: 8,
    overlay: [{ id: "flash", type: "flash", offsetTicks: 0, durationTicks: 8, peakOpacity: 0.5 * s, tint: overrides.tint ?? "#ffffff" }],
  };
});
