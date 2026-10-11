// render-abrash-adapter — the BROWSER half of the abrash spectator path. It never imports abrash's
// raycaster or world modules — those transitively need `node:crypto` (via `@561-group/computer`) and
// cannot resolve as native ESM in a browser; see server.mjs's header and shared/spectate-render.mjs's
// own header for the full explanation. This file imports exactly one abrash module,
// `@red-cup-engineering/abrash/framebuffer`, because `framebuffer.mjs` has ZERO imports of its own
// (confirmed by reading it) — it is the one abrash module that is genuinely browser-portable, and its
// own header says so ("a headless build... reads the identical surface with zero DOM dependency" runs
// the other direction too: the browser can read a Node-rendered surface with zero abrash-engine code).
//
// So: this adapter does not RENDER anything. It BLITS frames the server already rendered (server.mjs,
// via shared/create-abrash-backend.mjs — the one real call site for abrash's raycaster in this whole
// example) and shipped down as base64 RGBA bytes (server.mjs's frameToWire()).

import { paintToCanvas } from "/abrash/framebuffer.mjs";

// wireFrameToFramebufferLike(wire) — reconstruct the {data,width,height} shape paintToCanvas actually
// reads (it never calls a Framebuffer method, only those three properties — confirmed by reading it)
// from the base64 payload server.mjs's frameToWire() produced.
function wireFrameToFramebufferLike(wire) {
  const binary = atob(wire.dataB64);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { data: bytes, width: wire.width, height: wire.height };
}

// createAbrashBlitter({mount}) — `mount` is a real <canvas>. `.blit(wireFrame)` paints one
// server-rendered frame. This is intentionally NOT shaped as a spatial-backend `createBackend()` —
// it has no `render(sceneDescription, tick)` of its own, because it never touches a SceneDescription;
// the real spatial-backend-conformant abrash backend is shared/create-abrash-backend.mjs, and it only
// ever runs server-side. See test/prove-abrash-backend.mjs for that backend's own conformance proof.
export function createAbrashBlitter({ mount }) {
  const ctx = mount.getContext("2d");
  return {
    blit(wireFrame) {
      if (mount.width !== wireFrame.width) mount.width = wireFrame.width;
      if (mount.height !== wireFrame.height) mount.height = wireFrame.height;
      paintToCanvas(ctx, wireFrameToFramebufferLike(wireFrame));
    },
  };
}
