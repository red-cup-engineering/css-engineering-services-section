// spectate-render — the real abrash 3D backend. ONE function, `renderAbrashFrame(scene)`, is the
// single place this whole example calls into `@red-cup-engineering/abrash`'s raycaster — the LIVE
// per-tick broadcast path (server.mjs), the `/replay` endpoint, and every test in
// test/prove-abrash-backend.mjs all call this same function, so "live render" and "replayed render"
// are never two implementations that happen to agree, they are literally one call site.
//
// === THE HONEST CORRECTION TO THE DESIGN AS SKETCHED ============================================
// The design sketch had the browser import `@red-cup-engineering/abrash/world` and `/raycaster`
// directly as native ESM, the same way it already imports qwzspace's own `project.mjs`/`client.mjs`.
// That does not actually work: abrash's `world.mjs` (and therefore `raycaster.mjs`, which imports
// `grid`/`FOUR` from it) transitively imports `@561-group/computer/posix-holography/eavt-substrate`,
// which imports `node:crypto` for content-addressed row hashing — `node:` specifiers do not resolve in
// a browser, import map or not. This is the SAME class of problem the vnext spec already named for
// `replay.mjs` (§ "why replay runs server-side, not in the browser") — it just goes one layer deeper
// here, into a dependency's dependency, and abrash's own README's "browser-portable" claim is about the
// FRAMEBUFFER's byte layout (an RGBA raster a `<canvas>` can `putImageData` directly), never about the
// `world`/`raycaster` SOURCE MODULES being raw-ESM-importable without a bundler or a `node:crypto` shim.
//
// The fix keeps the same shape the replay decision already established: run the abrash raycast where
// `node:crypto` actually exists (this server, in Node), and ship only the RENDERED FRAME (the raw RGBA
// bytes) to the browser. `abrash/framebuffer.mjs` itself has ZERO imports of its own — confirmed by
// reading it — so it is the one abrash module the browser DOES import directly, to blit a
// server-rendered frame with the exact `paintToCanvas` this package already ships. See
// web/render-abrash-adapter.mjs.
//
// One consequence, stated plainly: the abrash path is TICK-LOCKED (one real raycast per simulation
// tick, camera pose a pure function of tick — see cameraForTick below), not RAF-locked like render-2d's
// client-side path. That is a real, different cadence, not a simulation of one; the README says so.

import { worldFromRows, grid } from "@red-cup-engineering/abrash/world";
import { camera as makeCamera, render as castFrame } from "@red-cup-engineering/abrash/raycaster";

// arena geometry: a bordered square room whose bounds match the demo world's own clampPos(-200, 200)
// (@red-cup-engineering/qwzspace/demo-world) at scale S — so what a spectator SEES is exactly where
// bots are actually allowed to roam, never a room that visually clips or floats its own entities.
export const SCALE = 10; // room units per voxel
export const GRID = 44; // room [-200,200] at SCALE=10 needs 40 cells across; +4 for a one-cell border margin

function buildArenaRows(gridSize) {
  const rows = [];
  let t = 0;
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      if (x === 0 || z === 0 || x === gridSize - 1 || z === gridSize - 1) {
        rows.push({ e: `voxel:${x},${z}`, a: "solid", v: "wall", t: t++ });
      }
    }
  }
  return rows;
}

// the arena world is built ONCE and reused across every render call — it is static geometry, entirely
// independent of the tick stream (see qwzspace's vnext spec §8: "the static world is NOT part of
// SceneDescription, and that's correct" — project() stays pure over (roomState, tick) with no channel
// for wall geometry).
let cachedGrid = null;
function arenaGrid() {
  if (!cachedGrid) cachedGrid = grid(worldFromRows(buildArenaRows(GRID)));
  return cachedGrid;
}

// colorForRole — the SAME hash render-2d.mjs uses (ported, not imported — render-2d.mjs does not
// export it), so a bot is the same color whether spectated in 2D or 3D. Kept here rather than pulled
// from qwzspace so this file's only qwzspace-side dependency stays `project`'s output SHAPE, not its
// internals.
const PALETTE_RGB = [
  [59, 130, 246], // #3b82f6
  [239, 68, 68], // #ef4444
  [34, 197, 94], // #22c55e
  [245, 158, 11], // #f59e0b
  [168, 85, 247], // #a855f7
  [6, 182, 212], // #06b6d4
  [236, 72, 153], // #ec4899
  [132, 204, 22], // #84cc16
];
export function colorForRole(role) {
  const key = String(role ?? "entity");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE_RGB[h % PALETTE_RGB.length];
}

// cameraForTick(tick, entries, {width,height,maxDist}) — the camera pose, a PURE function of the tick
// and the projected entries — never of wall-clock time or a live client's input. This is what makes
// the live-vs-replay proof possible in 3D: two independently-driven renders of the same tick (one from
// a live cache, one from a replay) compute the IDENTICAL camera, so the resulting framebuffers can be
// compared byte-for-byte, the same way project()'s output already is. A slow, deterministic orbit
// around the arena center, keyed off tick alone — no follow-cam dependency on connection order, which
// would NOT be replay-stable (a live room's subscriber order and a replay's iteration order are not
// guaranteed to agree, per §0 principle 2).
export function cameraForTick(tick, { width = 320, height = 200, maxDist = 40 } = {}) {
  const center = GRID / 2;
  const radius = GRID * 0.32;
  const angularStep = (Math.PI * 2) / 240; // one full orbit every 240 ticks
  const orbitAngle = tick * angularStep;
  const x = center + radius * Math.cos(orbitAngle);
  const z = center + radius * Math.sin(orbitAngle);
  const facing = orbitAngle + Math.PI; // look back toward the center
  return makeCamera({ x, z, angle: facing, width, height, maxDist });
}

// sceneEntriesToAbrashEntities(entries) — the seam: a SceneDescription's entries -> abrash's billboard
// entity shape. Room (x,y) maps to abrash's floor-plane (x,z) — room's "y" becomes abrash's depth axis,
// per world.mjs's own documented convention ("x across, z into the scene").
export function sceneEntriesToAbrashEntities(entries) {
  return entries.map((e) => ({
    id: e.id,
    x: e.x / SCALE + GRID / 2,
    z: e.y / SCALE + GRID / 2,
    color: colorForRole(e.role),
    scale: 1,
  }));
}

// renderAbrashFrame(scene, opts) — THE single call site. `scene` is real project() output (or
// structurally identical); `opts.tick` overrides scene.tick for the camera/phase clock if the caller
// wants to decouple them (nothing in this example does — kept for the conformance tests, which reuse
// one scene against several tick values to prove determinism per-input rather than per-call-count).
// `opts.camera`, if given ({x,z,angle}), REPLACES the automatic tick-driven orbit cam for this call —
// the escape hatch shared/create-abrash-backend.mjs's setCamera()/followEntity() use to satisfy the
// spatial-backend contract's optional camera half. server.mjs's own live/replay paths never pass it
// (the shared spectator view always uses the deterministic orbit cam — see cameraForTick's header for
// why a follow-cam driven by connection/subscriber order would not be replay-stable), so the default,
// camera-less call remains the one that actually drives what every spectator sees.
// Returns the abrash `render()` result verbatim ({ fb, columns, census, phase, width, height }) — fb.data
// is what a browser blits.
export function renderAbrashFrame(scene, opts = {}) {
  const tick = Number.isFinite(opts.tick) ? opts.tick : scene.tick;
  const width = opts.width ?? 320;
  const height = opts.height ?? 200;
  const maxDist = opts.maxDist ?? 40;
  const cam = opts.camera
    ? makeCamera({ x: opts.camera.x, z: opts.camera.z, angle: opts.camera.angle, width, height, maxDist })
    : cameraForTick(tick, { width, height, maxDist });
  const entities = sceneEntriesToAbrashEntities(scene.entries);
  return castFrame(arenaGrid(), cam, { phase: tick, entities });
}

// frameToWire(frame) — the wire-shippable form of an abrash render result: base64 RGBA bytes plus the
// dimensions a browser needs to reconstruct a framebuffer-shaped object for paintToCanvas. Kept
// separate from renderAbrashFrame so a Node-side test can compare raw fb.data byte-for-byte (no
// base64 round trip in the determinism proof) while server.mjs uses this for the wire.
export function frameToWire(frame, tick) {
  return {
    tick,
    width: frame.width,
    height: frame.height,
    dataB64: Buffer.from(frame.fb.data.buffer, frame.fb.data.byteOffset, frame.fb.data.byteLength).toString("base64"),
  };
}
