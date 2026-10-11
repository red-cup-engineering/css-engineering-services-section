// prove-render-loop — the pure composeFrame() (project + tween + celebration folded into ONE scene +
// camera pose) and the thin requestAnimationFrame shell around it, driven here with an injected fake
// clock/frame-scheduler so this file needs no real browser or timers.

import { ok, eq, done } from "./_harness.mjs";
import { composeFrame, createRenderLoop } from "../src/render-loop.mjs";
import { celebrate } from "../src/celebration.mjs";
import { test } from "node:test";

test("prove-render-loop", async () => {

// === composeFrame: null bracket -> null (nothing buffered yet) ====================================
eq(composeFrame({ bracket: null }), null, "composeFrame returns null when there is no bracket yet");

// === composeFrame: position comes from `positions` (the buffer's own smoothed sample), NOT from the
// bracket's raw tick-frames directly (proving the tween-then-applyPositions composition order). ====
{
  const bracket = {
    left: { tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] },
    right: { tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] },
    alpha: 0.5,
    mode: "between",
  };
  const positions = [{ id: "e1", x: 4.2, y: 0, z: 0, yaw: 0 }]; // NOT what a naive 0.5 blend of 0/10 would be
  const composed = composeFrame({ bracket, positions, tweenOptions: {} });
  eq(composed.tick, 2, "composeFrame's tick defaults to the bracket's right tick");
  eq(composed.scene.entries[0].x, 4.2, "the final scene's position comes from `positions`, overriding the bracket's own raw value");
}

// determinism: same inputs, identical composed frame, every call.
{
  const bracket = { left: { tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, right: { tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] }, alpha: 0.3, mode: "between" };
  const args = { bracket, positions: [{ id: "e1", x: 3, y: 0 }], tweenOptions: {} };
  eq(composeFrame(args), composeFrame(args), "composeFrame is a pure function of its arguments");
}

// === composeFrame: an active celebration folds particle/overlay entries into the scene AND can
// override the camera pose for that frame. ==========================================================
{
  const bracket = { left: { tick: 0, entities: [] }, right: { tick: 0, entities: [] }, alpha: 0, mode: "before" };
  const plan = celebrate("flash", { tier: "major", seed: 1, startTick: 0 });
  const composed = composeFrame({ bracket, positions: [], celebrations: [plan] });
  ok(composed.scene.entries.some((e) => e.layer === "overlay"), "an active celebration's overlay entries land in the composed scene");
}
{
  const bracket = { left: { tick: 0, entities: [] }, right: { tick: 2, entities: [] }, alpha: 0, mode: "before" };
  const plan = celebrate("jackpot", { tier: "major", seed: 1, startTick: 0 });
  // a bare baseline cameraSpec (no keyframes) would hold zoom at exactly 1 forever — the jackpot's
  // own zoom-punch keyframe is mid-flight at tick 2, so any deviation from 1 proves it, not the
  // baseline, produced this frame's pose.
  const composed = composeFrame({ bracket, positions: [], tick: 2, celebrations: [plan], cameraSpec: { zoom: 1 } });
  ok(composed.cameraPose.zoom > 1, "an active celebration's OWN camera pose wins over the caller's baseline cameraSpec");
}

// === createRenderLoop: tickOnce composes and calls backend.render()/setCamera() exactly once =======
{
  const renderCalls = [];
  const cameraCalls = [];
  const backend = { render: (scene, tick) => renderCalls.push({ scene, tick }), setCamera: (pose) => cameraCalls.push(pose) };
  const buffer = {
    sampleBrackets: () => ({ left: { tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, right: { tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] }, alpha: 0.5, mode: "between" }),
    sample: () => [{ id: "e1", x: 5, y: 0 }],
  };
  const loop = createRenderLoop({ backend, buffer, getCameraSpec: () => ({ x: 1, z: 1, zoom: 1.5 }) });
  loop.tickOnce();
  eq(renderCalls.length, 1, "tickOnce() calls backend.render() exactly once");
  eq(renderCalls[0].tick, 2, "backend.render() receives the composed tick");
  eq(cameraCalls.length, 1, "tickOnce() calls backend.setCamera() when a camera spec is supplied");
  eq(cameraCalls[0].zoom, 1.5, "the camera pose passed to setCamera() reflects the supplied cameraSpec");
}

// === createRenderLoop: with nothing buffered yet, tickOnce is a safe no-op =========================
{
  const renderCalls = [];
  const backend = { render: () => renderCalls.push(1) };
  const buffer = { sampleBrackets: () => null, sample: () => [] };
  const loop = createRenderLoop({ backend, buffer });
  loop.tickOnce();
  eq(renderCalls.length, 0, "tickOnce() never calls render() when the buffer has nothing yet");
}

// === createRenderLoop: start()/stop() drive the injected requestFrame/cancelFrame, not a real rAF ==
{
  let scheduled = 0;
  let cancelled = 0;
  const pendingCallbacks = [];
  const requestFrame = (cb) => {
    scheduled++;
    pendingCallbacks.push(cb);
    return scheduled;
  };
  const cancelFrame = () => {
    cancelled++;
  };
  const renderCalls = [];
  const backend = { render: () => renderCalls.push(1) };
  const buffer = { sampleBrackets: () => null, sample: () => [] };
  const loop = createRenderLoop({ backend, buffer, requestFrame, cancelFrame });
  ok(!loop.isRunning(), "a fresh loop is not running");
  loop.start();
  ok(loop.isRunning(), "start() marks the loop running");
  eq(scheduled, 1, "start() schedules exactly one frame via the injected requestFrame");
  const cb = pendingCallbacks.pop();
  cb(); // manually fire the "frame" — drives tickOnce() + re-schedules itself
  eq(scheduled, 2, "each fired frame re-schedules the next one while running");
  loop.stop();
  ok(!loop.isRunning(), "stop() marks the loop not running");
  eq(cancelled, 1, "stop() calls the injected cancelFrame with the pending handle");
}

done("prove-render-loop");
});
