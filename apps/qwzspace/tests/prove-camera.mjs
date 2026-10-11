// prove-camera — pan/zoom/rotate keyframes and deterministic, decaying screen-shake, all as a pure
// function of a tick number (no wall clock, no Math.random — same discipline as particles.mjs).

import { ok, eq, done } from "./_harness.mjs";
import { resolveCamera, DEFAULT_CAMERA_POSE } from "../src/camera.mjs";
import { test } from "node:test";

test("prove-camera", async () => {

// === the default pose, with no spec at all ==========================================================
eq(resolveCamera(), DEFAULT_CAMERA_POSE, "resolveCamera() with no spec at all returns the default pose");
eq(resolveCamera({ x: 5, z: 9, angle: 0.4, zoom: 2 }, 100), { x: 5, z: 9, angle: 0.4, zoom: 2 }, "a static spec (no keyframes) holds its values at any tick");

// === determinism ====================================================================================
{
  const spec = { pan: { to: { x: 10, z: 10 }, startTick: 0, durationTicks: 10 }, shake: { seed: 5, startTick: 0, durationTicks: 20, magnitude: 2 } };
  eq(resolveCamera(spec, 7), resolveCamera(spec, 7), "resolveCamera is a pure function of (spec, tick)");
}

// === pan keyframe ====================================================================================
{
  const spec = { pan: { from: { x: 0, z: 0 }, to: { x: 100, z: 50 }, startTick: 0, durationTicks: 10, easing: "linear" } };
  eq(resolveCamera(spec, 0), { x: 0, z: 0, angle: 0, zoom: 1 }, "pan at startTick holds the from-pose");
  eq(resolveCamera(spec, 5), { x: 50, z: 25, angle: 0, zoom: 1 }, "pan at the midpoint is halfway, under linear easing");
  eq(resolveCamera(spec, 10), { x: 100, z: 50, angle: 0, zoom: 1 }, "pan at durationTicks reaches the to-pose");
  eq(resolveCamera(spec, 999), { x: 100, z: 50, angle: 0, zoom: 1 }, "pan holds the to-pose after the keyframe completes");
}

// === zoomTo / rotateTo keyframes =====================================================================
{
  const spec = { zoomTo: { from: 1, to: 3, startTick: 0, durationTicks: 4, easing: "linear" }, rotateTo: { from: 0, to: Math.PI, startTick: 0, durationTicks: 4, easing: "linear" } };
  const pose = resolveCamera(spec, 2);
  eq(pose.zoom, 2, "zoomTo blends linearly");
  eq(pose.angle, Math.PI / 2, "rotateTo blends linearly");
}

// zoom is floored above zero even if a keyframe would drive it to/below zero.
{
  const spec = { zoomTo: { from: 0.1, to: -5, startTick: 0, durationTicks: 1, easing: "linear" } };
  ok(resolveCamera(spec, 1).zoom > 0, "resolveCamera never returns a zero-or-negative zoom");
}

// === shake: zero outside its window, decays toward zero, deterministic per seed ===================
{
  const spec = { shake: { seed: 11, startTick: 10, durationTicks: 20, magnitude: 4, frequency: 2 } };
  eq(resolveCamera(spec, 5), { x: 0, z: 0, angle: 0, zoom: 1 }, "no shake displacement before shake.startTick");
  eq(resolveCamera(spec, 40), { x: 0, z: 0, angle: 0, zoom: 1 }, "no shake displacement after shake.durationTicks elapses");
  const early = resolveCamera(spec, 10);
  const late = resolveCamera(spec, 28);
  ok(Math.abs(early.x) >= Math.abs(late.x) || Math.abs(early.z) >= Math.abs(late.z), "shake displacement decays toward zero over its window (not constant amplitude)");
  ok(early.x !== 0 || early.z !== 0, "shake actually displaces the camera while active");
}
{
  const specA = { shake: { seed: 1, startTick: 0, durationTicks: 20, magnitude: 4 } };
  const specB = { shake: { seed: 2, startTick: 0, durationTicks: 20, magnitude: 4 } };
  ok(JSON.stringify(resolveCamera(specA, 3)) !== JSON.stringify(resolveCamera(specB, 3)), "a different shake seed produces a genuinely different displacement");
}

done("prove-camera");
});
