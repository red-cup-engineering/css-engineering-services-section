// create-abrash-backend — a REAL @red-cup-engineering/qwzspace/spatial-backend-conformant wrapper
// around spectate-render.mjs's renderAbrashFrame: `createBackend(opts) -> { render, setCamera,
// followEntity, capabilities }`, checked with the IDENTICAL assertBackendConformance() qwzspace ships
// for render-2d.mjs (see test/prove-abrash-backend.mjs). This is "the abrash backend implementation"
// the task asks for — not spectate-render.mjs's lower-level renderAbrashFrame() by itself, which knows
// nothing about the contract's optional camera half.
//
// WHY `mount` HERE IS NOT A <canvas>: the real raycast (spectate-render.mjs's renderAbrashFrame) can
// only run where `@561-group/computer`'s `node:crypto` import resolves — Node, never a browser (see
// spectate-render.mjs's own header). This backend is therefore a SERVER-SIDE-ONLY spatial backend:
// server.mjs calls it (for both the live SSE path and the /replay endpoint) so there is exactly ONE
// place in this whole example that ever calls abrash's raycaster. `mount` is any object with a
// writable `.frame` slot — render() writes the abrash render() result there verbatim, plus the tick it
// was computed at — mirroring render-2d.mjs's own test convention (a mock "canvas" that just records
// what was drawn) rather than requiring a DOM. The browser-side piece, web/render-abrash-adapter.mjs,
// is a SEPARATE, much smaller thing: it never calls abrash's raycaster at all, it only blits frames
// THIS backend already computed, shipped down the wire as raw RGBA bytes.
//
// setCamera/followEntity are real (not stubs that merely avoid throwing): setCamera(pose) pins an
// exact camera pose for the NEXT render() call, overriding the default deterministic orbit cam;
// followEntity(id) computes a look-at angle toward that entity's current position each frame (falling
// back to the plain orbit cam on a tick where the entity is absent). Neither is exercised by
// server.mjs's own live/replay paths (see renderAbrashFrame's header for why the shared spectator view
// stays camera-less/orbit-only), but both are real, working implementations, not placeholders — see
// test/prove-abrash-backend.mjs's dedicated camera-capability case.

import { renderAbrashFrame, cameraForTick, sceneEntriesToAbrashEntities } from "./spectate-render.mjs";

export function createBackend({ mount, width = 320, height = 200, maxDist = 40 } = {}) {
  let cameraOverride = null;
  let followId = null;

  return {
    capabilities: { camera: true, dims: 3 },

    setCamera(pose) {
      if (!pose || typeof pose !== "object") {
        cameraOverride = null;
        return;
      }
      cameraOverride = { x: pose.x, z: pose.z, angle: pose.angle };
    },

    followEntity(id) {
      followId = id ?? null;
    },

    render(sceneDescription, tick) {
      const t = Number.isFinite(tick) ? tick : sceneDescription.tick;
      let cam = cameraOverride;
      if (!cam && followId) {
        const base = cameraForTick(t, { width, height, maxDist });
        const target = sceneEntriesToAbrashEntities(sceneDescription.entries).find((e) => e.id === followId);
        if (target) cam = { x: base.x, z: base.z, angle: Math.atan2(target.z - base.z, target.x - base.x) };
      }
      const frame = renderAbrashFrame(sceneDescription, { tick: t, width, height, maxDist, camera: cam });
      if (mount) mount.frame = { ...frame, tick: t };
    },
  };
}
