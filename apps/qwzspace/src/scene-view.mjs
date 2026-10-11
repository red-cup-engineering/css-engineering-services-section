// scene-view — the one drawing of a projected scene a browser game shows, in the richest tier the
// browser can drive: three dimensions on qwzspace's own engine (render-3d over WebGPU, else over
// WebGL2), else the two-dimensional plan (render-2d), else none, and the game plays in text alone. Every game over
// qwzspace (the world, Farstone) draws through this, so the tier a browser gets, the `?tier=`
// cap a person can ask for, and how a camera is aimed are one rule and not one per game.
//
// The tier names are the scene protocol's (`RENDER_TIERS`: webgl, canvas2d, text), richest first;
// "webgl" is the protocol's name for the 3D tier, whichever device draws it. Inside the client the
// ladder has four rungs, one ordered capability ladder: webgpu > webgl2 > canvas2d > text. A rung
// is a renderer with the one interface below, drawing the one projected scene; `selectRung` picks
// the rung from declared capabilities (pure), and `createSceneView` falls to the next rung when a
// rung's device cannot be had. A request (`?tier=`, a rung or tier name) caps the rung, never raises it.
//
// A view has two cameras and one picture. `follow(id, stand)` chases an entity (render-3d's chase
// camera, `stand` = {orbit, distance, lift} about it; the plan centred on it at a fixed scale).
// `look(pose)` aims a free camera at a point instead: `{ target: [x, y, z], distance, orbit,
// aside, size, base }`, where `orbit` is the heading in radians the camera looks along, `aside`
// slides the view along the screen's horizontal (a fraction of the distance) so what is looked at
// stands clear of a panel over one side, and `size`/`base` let the plan fit the same extent the 3D
// camera takes in. `project` and `pick` speak CSS pixels of the canvas, whatever its backing
// resolution.
//
// No game here: no atlas, no room, no frame. Those are the caller's.

import { createBackend as createPlanBackend } from "./render-2d.mjs";
import { createWebGPUDevice } from "./gpu-webgpu.mjs";
import { createWebGL2Device } from "./gpu-webgl2.mjs";
import { createBackend as createDepthBackend } from "./render-3d.mjs";
import { RENDER_TIERS } from "./scene/protocol.mjs";

const RANK = Object.freeze({ webgl: 3, canvas2d: 2, text: 1 });

/** The ladder's rungs, richest first; each is drawn by one renderer over the same scene. */
export const RUNGS = Object.freeze(["webgpu", "webgl2", "canvas2d", "text"]);
const RUNG_RANK = Object.freeze({ webgpu: 4, webgl2: 3, canvas2d: 2, text: 1 });
/** The protocol tier a rung belongs to. */
export const RUNG_TIER = Object.freeze({ webgpu: "webgl", webgl2: "webgl", canvas2d: "canvas2d", text: "text" });

/** The tiers, richest first. */
export const TIERS = Object.freeze([...RENDER_TIERS].sort((a, b) => RANK[b] - RANK[a]));

/** Pixels per metre of a plan that follows an entity, before the device's pixel ratio. */
export const FOLLOW_SCALE = 2.5;

/**
 * The rung to draw on, from declared capabilities: `webgpu` (an adapter was had), `webgl2`,
 * `canvas2d`; `requested` caps the rung (a rung name, or the tier name "webgl" for the top of the 3D
 * tier); `failed` are rungs already tried and refused. The first rung able, not failed and no richer
 * than the cap; text always is. Pure.
 */
export function selectRung({ webgpu = false, webgl2 = false, canvas2d = false, requested = null, failed = [] } = {}) {
  const able = { webgpu, webgl2, canvas2d, text: true };
  const cap = requested === "webgl" ? RUNG_RANK.webgpu : (RUNG_RANK[requested] ?? RUNG_RANK.webgpu);
  return RUNGS.find((rung) => able[rung] === true && !failed.includes(rung) && RUNG_RANK[rung] <= cap);
}

/** The protocol tier to draw in, from what the browser can draw and the tier a person asked for (a cap). Pure. */
export function tierOf(capabilities = {}) {
  return RUNG_TIER[selectRung(capabilities)];
}

/** What this browser can draw with, each probed on a canvas of its own. WebGPU counts only with an
 *  adapter, which asking takes a moment: this resolves. */
export async function probeDrawing({ document = globalThis.document, gpu = globalThis.navigator?.gpu } = {}) {
  const context = (kind) => {
    try {
      return document.createElement("canvas").getContext(kind) !== null;
    } catch {
      return false;
    }
  };
  let webgpu = false;
  try {
    webgpu = Boolean(gpu) && (await gpu.requestAdapter()) !== null;
  } catch {
    webgpu = false;
  }
  return { webgpu, webgl2: context("webgl2"), canvas2d: context("2d") };
}

/** A device for a 3D rung over `canvas`: null where that rung cannot be had; rejects where its
 *  device or shaders are unusable. */
export async function createDevice(canvas, rung, { antialias = true, makers = DEVICE_MAKERS } = {}) {
  return makers[rung]?.(canvas, { antialias }) ?? null;
}

const DEVICE_MAKERS = Object.freeze({ webgpu: createWebGPUDevice, webgl2: createWebGL2Device });

/** The axis-aligned bounds `[x0, y0, x1, y1]` of a footprint. */
export const boundsOf = (footprint) => footprint.reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity]);

/** Whether a ground point stands inside a footprint (even-odd rule). */
export function inside([x, y], footprint) {
  let within = false;
  for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
    const [xi, yi] = footprint[i], [xj, yj] = footprint[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within;
  }
  return within;
}

/** A free camera's pose over a footprint: from south of it, above `top`, far enough to take it all in. */
export function poseOver(footprint, { top = 0, orbit = 0, scale = 1 } = {}) {
  const [x0, y0, x1, y1] = boundsOf(footprint);
  const size = Math.max(x1 - x0, y1 - y0, 6);
  const base = size * 0.95 + 10;
  return { target: [(x0 + x1) / 2, (y0 + y1) / 2, top], size, base, distance: base * scale, orbit };
}

async function depthView(canvas, { assets, rung, makers }) {
  const device = await createDevice(canvas, rung, { makers });
  if (!device) throw new Error(`scene-view: the ${rung} rung found no device`);
  const backend = createDepthBackend({ canvas, assets, device });
  const graphics = await backend.ready;
  return {
    tier: "webgl",
    canvas,
    graphics,
    get terrain() {
      return backend.graph.terrain !== null;
    },
    follow: (id, stand) => backend.followEntity(id, stand),
    look({ target, distance, orbit = 0, aside = 0 }) {
      const lift = distance * 0.7;
      const x = target[0] - Math.cos(orbit) * aside * distance, y = target[1] + Math.sin(orbit) * aside * distance;
      backend.setCamera({
        x: x - Math.sin(orbit) * distance, y: y - Math.cos(orbit) * distance, z: target[2] + lift,
        heading: (orbit * 180) / Math.PI, pitch: -(Math.atan2(lift, distance) * 180) / Math.PI,
      });
    },
    draw: (scene) => backend.render(scene),
    project: (point) => backend.project(point),
    pick: (px, py) => backend.pick(px, py),
  };
}

function planView(canvas, { radius = 1.5, labels = true } = {}) {
  let backend = null, size = [0, 0], ratio = 1, places = [];
  // Either an entity followed at a fixed scale, or a pose fitted to the canvas; the camera in metres.
  let follow, pose = null, camera = { x: 0, z: 0, angle: 0, zoom: 1 };
  const fit = () => {
    ratio = globalThis.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * ratio), height = Math.round(canvas.clientHeight * ratio);
    if (!width || !height) return false;
    if (width !== size[0] || height !== size[1] || !backend) {
      size = [width, height];
      canvas.width = width;
      canvas.height = height;
      backend = createPlanBackend({ mount: canvas, width, height, radius, labels });
    }
    return true;
  };
  // render-2d draws the world's north up the screen, so its camera's second axis is -y.
  const aim = (scene) => {
    if (pose) {
      const { target, size: extent = 6, base = 1, distance = base } = pose;
      camera = { x: target[0], z: -target[1], angle: 0, zoom: Math.min(size[0], size[1]) / (extent * (distance / base) * 1.15) };
    } else {
      const centre = scene?.entries.find((entry) => entry.id === (follow ?? scene.actor) && !Array.isArray(entry.footprint));
      if (centre) camera = { x: centre.x, z: -centre.y, angle: 0, zoom: FOLLOW_SCALE * ratio };
    }
    backend.setCamera(camera);
  };
  return {
    tier: "canvas2d",
    canvas,
    graphics: "canvas2d",
    terrain: false,
    follow(id) {
      follow = id ?? undefined;
      pose = null;
    },
    look(next) {
      pose = next;
    },
    draw(scene) {
      if (!fit()) return;
      places = scene.entries.filter((entry) => Array.isArray(entry.footprint));
      aim(scene);
      backend.render(scene);
    },
    project([x, y]) {
      return [(size[0] / 2 + (x - camera.x) * camera.zoom) / ratio, (size[1] / 2 + (-y - camera.z) * camera.zoom) / ratio];
    },
    /** The ids of the places under a point, smallest (the one drawn over the rest) first. */
    pick(px, py) {
      const point = [camera.x + (px * ratio - size[0] / 2) / camera.zoom, -(camera.z + (py * ratio - size[1] / 2) / camera.zoom)];
      const area = (entry) => { const [x0, y0, x1, y1] = boundsOf(entry.footprint); return (x1 - x0) * (y1 - y0); };
      return places.filter((entry) => inside(point, entry.footprint)).sort((a, b) => area(a) - area(b)).map((entry) => entry.id);
    },
  };
}

const TEXT_VIEW = Object.freeze({ tier: "text", canvas: null, graphics: null, terrain: false, follow() {}, look() {}, draw() {}, project: () => null, pick: () => [] });

/**
 * A drawing for `tier` on `canvas` (or a fresh one with `className`):
 * `{ tier, graphics, canvas, terrain, follow(id, stand), look(pose), draw(scene), project(point), pick(px, py) }`.
 * `labels: false` keeps the plan from naming entities, for a game whose heads-up display names them.
 * A 3D rung that cannot get a device falls to the next rung down (WebGPU to WebGL2) and then to the plan, and a plan with no 2D context to text,
 * where `canvas` is null and nothing is drawn.
 */
export async function createSceneView({ tier, requested = null, canvas = null, className = "", assets, probe = null, makers = DEVICE_MAKERS, document = globalThis.document, radius, labels } = {}) {
  const surface = () => canvas ?? Object.assign(document.createElement("canvas"), { className });
  probe ??= await probeDrawing({ document });
  if (tier === "webgl") {
    const failed = [];
    let drawn = surface();
    for (let rung = selectRung({ ...probe, requested, failed }); RUNG_TIER[rung] === "webgl"; rung = selectRung({ ...probe, requested, failed })) {
      try {
        return await depthView(drawn, { assets, rung, makers });
      } catch (error) {
        console.warn(`scene-view: no ${rung} rung`, error);
        failed.push(rung);
        // A canvas that held a context of one kind gives none of another: the next rung draws on a
        // fresh canvas in its place.
        const fresh = Object.assign(document.createElement("canvas"), { className: drawn.className, tabIndex: drawn.tabIndex });
        if (drawn.getAttribute("aria-label")) fresh.setAttribute("aria-label", drawn.getAttribute("aria-label"));
        drawn.replaceWith?.(fresh);
        drawn = fresh;
      }
    }
    return createSceneView({ tier: RUNG_TIER[selectRung({ ...probe, requested, failed })], canvas: drawn, className, assets, probe, makers, document, radius, labels });
  }
  if (tier === "canvas2d") {
    const drawn = surface();
    if (drawn.getContext("2d") !== null) return planView(drawn, { radius, labels });
  }
  return TEXT_VIEW;
}

/** A plan of its own on `canvas`, for a map beside the main view: always canvas2d. */
export const createPlanView = (canvas, options) => planView(canvas, options);
