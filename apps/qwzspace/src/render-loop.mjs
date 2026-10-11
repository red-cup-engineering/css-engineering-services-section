// render-loop — the missing one-call ergonomic entry point for canvas consumers. Every current
// consumer of `InterpolationBuffer` + a spatial backend hand-writes the same per-frame sequence
// (sample the buffer, project it, hand it to the backend); the DOM/TUFTE path already has
// `./tufte`'s `createTufteRoomModel` playing this role for its own presentation surface — this module
// is the same idea for `render-2d`/any spatial backend.
//
// Split the same way the rest of this pass splits pure-core from impure-glue (mirroring
// tick-driver.mjs's own "a pure step, wrapped by a setInterval shell" shape):
//
//   composeFrame({...})  — PURE. Given one InterpolationBuffer bracket (client.mjs's
//                          `sampleBrackets()`), the buffer's own position sample, and the currently-
//                          active celebrations, produces ONE final SceneDescription + camera pose.
//                          No timers, no buffer/backend reference — directly unit-testable, exactly
//                          like project()/tween.interpolateScene() themselves.
//   createRenderLoop({...}) — the thin, impure requestAnimationFrame shell around composeFrame(),
//                          matching tick-driver.mjs's "the only impure thing here is the clock."
//
// THE PER-FRAME COMPOSITION ORDER this exists to get right, and why (see tween.mjs's own header for
// the fuller argument): (1) `project()` the two RAW tick-frames an InterpolationBuffer bracket names;
// (2) `tween.interpolateScene()` eases the PRESENTATION fields (scale/rotation/opacity/tint) and
// handles enter/exit between them, using the bracket's own alpha — but passes position through
// untouched; (3) `tween.applyPositions()` immediately overlays the buffer's OWN smoothed x/y/z/yaw
// (from `buffer.sample()`, called with the SAME implicit render time) on top, so position keeps
// coming from the one mechanism that has always owned it; (4) any active celebrations fold their
// particle/overlay entries into the scene (`project.mergeSceneLayer`) and may override the camera
// pose for that frame (an active celebration's own camera wins over the caller's baseline one — a
// zoom-punch during a jackpot should not fight a static baseline camera the game configured earlier).

import { project, mergeSceneLayer } from "./project.mjs";
import { interpolateScene, applyPositions } from "./tween.mjs";
import { resolveCamera } from "./camera.mjs";
import { sampleCelebration } from "./celebration.mjs";

// composeFrame — see this file's header for the exact composition order. `bracket` is an
// `InterpolationBuffer.sampleBrackets()` result (or null, meaning "nothing buffered yet" — returns
// null); `positions` is that SAME buffer's `.sample()` result, at the same implicit render time.
export function composeFrame({ bracket, positions = [], tick, tweenOptions = {}, celebrations = [], cameraSpec = null } = {}) {
  if (!bracket) return null;
  const prevScene = project(bracket.left.entities, bracket.left.tick);
  const nextScene = project(bracket.right.entities, bracket.right.tick);
  let scene = interpolateScene(prevScene, nextScene, bracket.alpha, tweenOptions);
  scene = applyPositions(scene, positions);

  const t = Number.isFinite(tick) ? Math.trunc(tick) : bracket.right.tick;
  let cameraPose = cameraSpec ? resolveCamera(cameraSpec, t) : null;
  const extraLayers = [];
  for (const plan of celebrations ?? []) {
    const frame = sampleCelebration(plan, t);
    if (frame.particleEntries.length || frame.overlayEntries.length) extraLayers.push(...frame.particleEntries, ...frame.overlayEntries);
    if (frame.cameraPose) cameraPose = frame.cameraPose; // an active celebration's camera wins
  }
  if (extraLayers.length) scene = mergeSceneLayer(scene, extraLayers);

  return { scene, cameraPose, tick: t };
}

// createRenderLoop — the requestAnimationFrame shell. `getCameraSpec`/`getCelebrations` are called
// fresh every frame (they are the caller's OWN mutable game state — this module holds none of its
// own beyond the running/handle flags a start/stop lifecycle needs).
export function createRenderLoop({
  backend,
  buffer,
  tweenOptions = {},
  getCameraSpec = () => null,
  getCelebrations = () => [],
  requestFrame,
  cancelFrame,
} = {}) {
  if (!backend || typeof backend.render !== "function") throw new TypeError("render-loop: backend.render(scene, tick) is required");
  if (!buffer || typeof buffer.sampleBrackets !== "function" || typeof buffer.sample !== "function") {
    throw new TypeError("render-loop: buffer must be an InterpolationBuffer (sampleBrackets()/sample() required)");
  }
  const raf = requestFrame ?? (typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16));
  const caf = cancelFrame ?? (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout);
  let handle = null;
  let running = false;

  // tickOnce — composes and renders exactly one frame, right now. This is what `start()`'s rAF loop
  // calls, but it is ALSO the direct entry point for a headless test or a host with no
  // requestAnimationFrame concept at all (a fixed-step server-authoritative game loop that wants to
  // push a frame to a spectator on its own cadence, say) — nothing about it requires the rAF shell.
  function tickOnce() {
    const composed = composeFrame({
      bracket: buffer.sampleBrackets(),
      positions: buffer.sample(),
      tweenOptions,
      celebrations: getCelebrations() ?? [],
      cameraSpec: getCameraSpec ? getCameraSpec() : null,
    });
    if (composed) {
      if (composed.cameraPose && typeof backend.setCamera === "function") backend.setCamera(composed.cameraPose);
      backend.render(composed.scene, composed.tick);
    }
    return composed;
  }

  function loop() {
    tickOnce();
    if (running) handle = raf(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      handle = raf(loop);
    },
    stop() {
      running = false;
      if (handle !== null) caf(handle);
      handle = null;
    },
    tickOnce,
    isRunning: () => running,
  };
}
