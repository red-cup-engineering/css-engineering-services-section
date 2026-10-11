// scene-view — the one drawing of a projected scene a browser game shows, in the richest tier the
// browser can drive: three dimensions on qwzspace's own engine (render-3d over WebGL2), else the
// two-dimensional plan (render-2d), else none, and the game plays in text alone. Every game over
// qwzspace (the metroplex, Farstone) draws through this, so the tier a browser gets, the `?tier=`
// cap a person can ask for, and how a camera is aimed are one rule and not one per game.
//
// The tier names are the scene protocol's (`RENDER_TIERS`: webgl, canvas2d, text), richest first.
// A request caps the tier, never raises it.
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
import { createBackend as createDepthBackend } from "./render-3d.mjs";
import { RENDER_TIERS } from "./scene/protocol.mjs";

const RANK = Object.freeze({ webgl: 3, canvas2d: 2, text: 1 });

/** The tiers, richest first. */
export const TIERS = Object.freeze([...RENDER_TIERS].sort((a, b) => RANK[b] - RANK[a]));

/** Pixels per metre of a plan that follows an entity, before the device's pixel ratio. */
export const FOLLOW_SCALE = 2.5;

/** The tier to draw in, from what the browser can draw and the tier a person asked for (a cap). Pure. */
export function tierOf({ webgl2 = false, canvas2d = false, requested = null } = {}) {
  const able = [webgl2 ? "webgl" : null, canvas2d ? "canvas2d" : null, "text"].filter(Boolean);
  const cap = RANK[requested] ?? RANK.webgl;
  return able.find((tier) => RANK[tier] <= cap);
}

/** What this browser can draw with, each probed on a canvas of its own. */
export function probeDrawing({ document = globalThis.document } = {}) {
  const context = (kind) => {
    try {
      return document.createElement("canvas").getContext(kind) !== null;
    } catch {
      return false;
    }
  };
  return { webgl2: context("webgl2"), canvas2d: context("2d") };
}

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

async function depthView(canvas, { assets }) {
  const backend = createDepthBackend({ canvas, assets });
  const graphics = await backend.ready;
  if (!graphics) throw new Error("scene-view: the 3D renderer found no device");
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
 * A 3D renderer that cannot get a device falls to the plan, and a plan with no 2D context to text,
 * where `canvas` is null and nothing is drawn.
 */
export async function createSceneView({ tier, canvas = null, className = "", assets, probe = probeDrawing(), document = globalThis.document, radius, labels } = {}) {
  const surface = () => canvas ?? Object.assign(document.createElement("canvas"), { className });
  if (tier === "webgl") {
    const drawn = surface();
    try {
      return await depthView(drawn, { assets });
    } catch (error) {
      console.warn("scene-view: no 3D tier", error);
      // A canvas that held a WebGL context gives no 2D one: the plan draws on a fresh canvas in its place.
      const fresh = Object.assign(document.createElement("canvas"), { className: drawn.className, tabIndex: drawn.tabIndex });
      if (drawn.getAttribute("aria-label")) fresh.setAttribute("aria-label", drawn.getAttribute("aria-label"));
      drawn.replaceWith?.(fresh);
      return createSceneView({ tier: probe.canvas2d ? "canvas2d" : "text", canvas: fresh, className, assets, probe, document, radius, labels });
    }
  }
  if (tier === "canvas2d") {
    const drawn = surface();
    if (drawn.getContext("2d") !== null) return planView(drawn, { radius, labels });
  }
  return TEXT_VIEW;
}

/** A plan of its own on `canvas`, for a map beside the main view: always canvas2d. */
export const createPlanView = (canvas, options) => planView(canvas, options);
