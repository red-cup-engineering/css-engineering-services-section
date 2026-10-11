// prove-particles — the determinism bar this module exists to meet: `sampleEffect(effect, tick)` must
// be a PURE function of (seed, spec, startTick, tick) — callable for any tick directly (no replaying
// ticks 0..N-1 first), and two independently-constructed but content-identical effects must agree.
// This is what makes a particle-heavy replay scrub to any tick byte-identically, same as project()'s
// own determinism proof.

import { ok, eq, done } from "./_harness.mjs";
import { createEffect, sampleEffect, listEmitterTypes, PRESETS, presetSpec, listPresets } from "../src/particles.mjs";
import { test } from "node:test";

test("prove-particles", async () => {

eq(listEmitterTypes().sort(), ["burst", "confetti", "fountain", "glowPulse", "shockwave", "trail"], "all six documented emitter types are implemented");
eq(listPresets().sort(), ["coin-fountain", "confetti-burst", "sparkle-trail", "win-glow"], "all four documented presets exist");

// === determinism: same (effect, tick) -> byte-identical entries, called out of order, repeatedly ===
for (const type of listEmitterTypes()) {
  const spec = type === "trail" ? { type, positions: [{ tick: 0, x: 0, y: 0 }, { tick: 3, x: 5, y: 5 }] } : { type, origin: { x: 10, y: 10 }, count: 8 };
  const effect = createEffect({ id: "fx", seed: 42, spec, startTick: 5 });
  const at10a = sampleEffect(effect, 10);
  const at10b = sampleEffect(effect, 10);
  eq(at10a, at10b, `${type}: sampleEffect(effect, 10) is identical across repeated calls`);

  // call ticks OUT OF ORDER (12 then 8 then 10) — nothing here should depend on call sequence.
  const outOfOrder = [sampleEffect(effect, 12), sampleEffect(effect, 8), sampleEffect(effect, 10)];
  const inOrder = [sampleEffect(effect, 8), sampleEffect(effect, 10), sampleEffect(effect, 12)];
  eq(JSON.stringify(outOfOrder[2]), JSON.stringify(inOrder[1]), `${type}: sampling tick 10 agrees regardless of what other ticks were sampled before it`);

  // two INDEPENDENTLY-CONSTRUCTED but content-identical effects agree — the same "separately built"
  // proof project()'s own tests run (prove-project.mjs).
  const effect2 = createEffect({ id: "fx", seed: 42, spec: { ...spec }, startTick: 5 });
  eq(sampleEffect(effect, 9), sampleEffect(effect2, 9), `${type}: two independently-constructed but content-identical effects sample identically`);
}

// === a different seed produces a genuinely different result (the determinism proof is not vacuous) =
{
  const specA = { type: "burst", origin: { x: 0, y: 0 }, count: 10 };
  const a = createEffect({ id: "fx", seed: 1, spec: specA, startTick: 0 });
  const b = createEffect({ id: "fx", seed: 2, spec: specA, startTick: 0 });
  ok(JSON.stringify(sampleEffect(a, 3)) !== JSON.stringify(sampleEffect(b, 3)), "a different seed produces different particle positions");
}

// === burst: bounded lifetime, fades to done ========================================================
{
  const effect = createEffect({ id: "b", seed: 7, spec: { type: "burst", count: 5, durationTicks: 10, origin: { x: 0, y: 0 } }, startTick: 0 });
  eq(sampleEffect(effect, -1).entries.length, 0, "before startTick, a burst has no particles yet");
  ok(sampleEffect(effect, 0).entries.length === 5, "at startTick, all burst particles are present");
  ok(sampleEffect(effect, 5).entries[0].opacity < 1, "midway through its life, a burst particle has faded some");
  ok(sampleEffect(effect, 11).done, "a burst reports done once tick exceeds its duration");
  eq(sampleEffect(effect, 11).entries.length, 0, "a done burst has no entries left");
}

// === fountain: never needs unbounded state, evaluable at an arbitrarily distant tick directly ======
{
  const effect = createEffect({ id: "f", seed: 3, spec: { type: "fountain", count: 6, cycleTicks: 10, origin: { x: 0, y: 0 } }, startTick: 0 });
  const far = sampleEffect(effect, 100_000);
  ok(Array.isArray(far.entries), "a fountain samples cleanly at a far-future tick with no prior state");
  eq(JSON.stringify(sampleEffect(effect, 100_000)), JSON.stringify(far), "and does so identically on a second call");
}

// === trail: purely data-driven off caller-supplied positions ======================================
{
  const positions = [{ tick: 0, x: 0, y: 0 }, { tick: 1, x: 1, y: 1 }, { tick: 2, x: 2, y: 2 }];
  const effect = createEffect({ id: "t", seed: 1, spec: { type: "trail", positions, trailTicks: 2 }, startTick: 0 });
  const frame = sampleEffect(effect, 2);
  eq(frame.entries.length, 3, "a trail shows every position within trailTicks of the current tick");
  ok(frame.entries.every((e) => e.opacity <= 1 && e.opacity >= 0), "trail ghost opacity stays in [0,1]");
}

// === shockwave: reports done once every ring has fully expanded ===================================
{
  const effect = createEffect({ id: "s", seed: 1, spec: { type: "shockwave", count: 2, durationTicks: 4, staggerTicks: 2, origin: { x: 0, y: 0 } }, startTick: 0 });
  ok(!sampleEffect(effect, 0).done, "a shockwave is not done while its first ring is still expanding");
  ok(sampleEffect(effect, 20).done, "a shockwave is done once every ring has fully expanded");
}

// === createEffect validates its inputs =============================================================
{
  let threw = false;
  try {
    createEffect({ seed: 1, spec: {} });
  } catch {
    threw = true;
  }
  ok(threw, "createEffect rejects a spec with no type");
}
{
  let threw = false;
  try {
    createEffect({ spec: { type: "burst" } });
  } catch {
    threw = true;
  }
  ok(threw, "createEffect rejects a missing/non-finite seed");
}

// === presetSpec produces a ready-to-run spec, mergeable with overrides ============================
{
  const spec = presetSpec("coin-fountain", { count: 3 });
  eq(spec.type, "fountain", "coin-fountain preset is a fountain emitter");
  eq(spec.count, 3, "presetSpec overrides merge over the preset defaults");
  eq(PRESETS["confetti-burst"]().type, "confetti", "PRESETS is directly callable too");
}

done("prove-particles");
});
