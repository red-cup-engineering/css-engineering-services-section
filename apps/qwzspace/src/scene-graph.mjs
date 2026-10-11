// scene-graph — what the 3D tier draws for a SceneDescription, before any device draws it. Pure:
// `update(description, eye)` reconciles entities, places, terrain, water, sky and weather; `frame(eye)`
// hands back a draw list and the light it is drawn under. A device (WebGL2 now, WebGPU behind the
// same frame) only uploads meshes and runs the list, so this module is the engine's whole picture and
// is proved headless.

import { heightAt } from "@red-cup-engineering/feltos/geometry";
import { linearColour, mix, multiply, normalize, placement, rayThroughBox, rayThroughPrism } from "./linear.mjs";
import { box, capsule, cone, cylinder, disc, octahedron, outline, plane, prism, segments, smooth, sphere, transformed } from "./solids.mjs";
import { terrainChunks } from "./terrain.mjs";

export const LOD_DISTANCES = [0, 900, 2200, 4500];
export const ENTITY_DETAIL = 350;
const RAIN_DROPS = 3000;
const RAIN_BOX = 120;
const RAIN_STREAK = 0.6;

export const ROLE_COLOURS = Object.freeze({
  self: 0xf2c14e,
  npc: 0x8fb3d9,
  actor: 0xd98f8f,
  thing: 0xc9a66b,
  vehicle: 0xb0413e,
  ship: 0x6b4f3a,
  here: 0xe8dcc0,
  place: 0xcfc6b0,
  exit: 0x5fa86b,
});

// Turn a solid lying along z to lie along y, its apex north.
const alongNorth = Float32Array.of(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
const translate = ([x, y, z]) => Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1);
const scale = ([x, y, z]) => Float32Array.of(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1);
const at = (solid, offset) => transformed(solid, translate(offset));

// What each drawable looks like near: solids about the entity's own origin (its feet), facing north
// before its yaw turns it. `colour: null` takes the entity's colour. Built once, shared by all.
const NEAR = {
  figure: () => [
    { mesh: at(capsule(0.28, 1.0, 8, 4), [0, 0, 0.78]) },
    { mesh: at(sphere(0.2, 12, 8), [0, 0, 1.6]) },
    { mesh: box([0.12, 0.12, 0.08], [0, 0.22, 1.62]), colour: 0x222222 },
  ],
  vehicle: () => [
    { mesh: box([1.9, 4.4, 0.9], [0, 0, 0.75]) },
    { mesh: box([1.6, 2.0, 0.6], [0, -0.3, 1.5]) },
  ],
  vessel: () => [
    { mesh: transformed(cone(2.2, 14, 4), multiply(translate([0, 0, 0.6]), multiply(scale([1, 1, 0.35]), alongNorth))) },
    { mesh: at(cylinder(0.15, 10, 6), [0, 0, 5.6]) },
  ],
  exit: () => [
    { mesh: at(cylinder(0.08, 1.6, 6), [0, 0, 0.8]) },
    { mesh: transformed(cone(0.3, 0.6, 8), multiply(translate([0, 0.2, 1.7]), alongNorth)) },
  ],
  default: () => [{ mesh: at(octahedron(0.3), [0, 0, 0.4]) }],
};
// Where each drawable can be pointed at: a box about its origin, facing north.
const BOUNDS = {
  figure: [[-0.3, -0.3, 0], [0.3, 0.3, 1.8]],
  vehicle: [[-0.95, -2.2, 0.3], [0.95, 2.2, 1.8]],
  vessel: [[-2.2, -7, -0.2], [2.2, 7, 10.6]],
  exit: [[-0.3, -0.2, 0], [0.3, 0.5, 2]],
  default: [[-0.3, -0.3, 0.1], [0.3, 0.3, 0.7]],
};
const shapes = new Map();
const shapeOf = (drawable) => {
  const kind = Object.hasOwn(NEAR, drawable) ? drawable : "default";
  if (!shapes.has(kind)) shapes.set(kind, { near: NEAR[kind](), far: farShape(kind), bounds: BOUNDS[kind] });
  return shapes.get(kind);
};
function farShape(kind) {
  const size = kind === "vessel" ? 8 : kind === "vehicle" ? 3 : kind === "figure" ? 1.8 : 1;
  return [{ mesh: box([size * 0.5, size * 0.5, size], [0, 0, size / 2]), lit: false }];
}

const WATER = plane(60000);
// Ground to the fog, so a world without terrain has no edge to fall off, laid just under the floors
// that stand on it.
const GROUND = at(disc(4000, 96), [0, 0, -0.05]);
const RAIN = segments(Array.from({ length: RAIN_DROPS }, (_, k) => {
  // A fixed scatter (no randomness: every client draws the same rain), falling straight down.
  const x = ((k * 7919) % 1000) / 1000 * RAIN_BOX - RAIN_BOX / 2;
  const z = ((k * 104729) % 1000) / 1000 * RAIN_BOX;
  const y = ((k * 15485863) % 1000) / 1000 * RAIN_BOX - RAIN_BOX / 2;
  return [[x, y, z], [x, y, z + RAIN_STREAK]];
}));

// What a place glows toward as it is busy: lantern light.
const FLARE = linearColour(0xffa23a);

const colourOf = (entry) => entry.tint ?? ROLE_COLOURS[entry.role] ?? ROLE_COLOURS[entry.kind] ?? 0xcccccc;
const keyOf = (entry) => Array.isArray(entry.footprint)
  ? JSON.stringify([entry.footprint, entry.span, entry.reaches, entry.enclosed, entry.role, entry.tint])
  : JSON.stringify([entry.drawable, entry.role, entry.tint]);

// A place is drawn as what it is. An enclosure (a building, a room) is a shell: tinted walls and
// floor, its eaves outlined. Open ground (a quay, a field, a street) has no walls to draw: its
// outline is laid on its floor, and the land and water under it are the drawing. The place one is
// in is drawn fainter and writes no depth, so what stands in it shows through its walls.
function placeNode(entry) {
  const colour = linearColour(colourOf(entry));
  const pieces = [{ footprint: entry.footprint, span: entry.span }, ...(entry.reaches ?? [])];
  const here = entry.role === "here";
  const parts = [];
  for (const [index, piece] of pieces.entries()) {
    const enclosed = entry.enclosed && index === 0;
    parts.push({ mesh: outline(piece.footprint.map(([x, y]) => [x, y, piece.span[0] + 0.05])), colour, mode: "lines", opacity: enclosed || here ? 1 : 0.6 });
    if (!enclosed) continue;
    parts.push({ mesh: prism(piece.footprint, piece.span), colour, opacity: here ? 0.12 : 0.55, depthWrite: !here, shell: piece });
    parts.push({ mesh: outline(piece.footprint.map(([x, y]) => [x, y, piece.span[1]])), colour, mode: "lines", opacity: 0.35 });
  }
  const xs = pieces[0].footprint.map(([x]) => x), ys = pieces[0].footprint.map(([, y]) => y);
  const centre = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, (pieces[0].span[0] + pieces[0].span[1]) / 2];
  return { place: true, pieces, parts, centre, visible: true };
}

/** A part lit by its node's glow: its colour drawn toward the flare, its lines brighter, and past
 *  half a glow giving its own light, so what is busy shows at night. */
const glowing = (part, glow) => ({
  ...part,
  colour: mix(part.colour, FLARE, glow * (part.mode === "lines" ? 0.9 : 0.6)),
  opacity: part.mode === "lines" ? Math.min(1, (part.opacity ?? 1) + glow) : part.opacity,
  lit: part.mode === "lines" || glow >= 0.5 ? false : part.lit,
});

/** Whether `eye` stands within a shell: a camera inside one draws none of its walls. */
const within = (eye, { footprint, span }) => eye[2] >= span[0] && eye[2] <= span[1] && insideFootprint(eye, footprint);
function insideFootprint([x, y], footprint) {
  let inside = false;
  for (let k = 0, j = footprint.length - 1; k < footprint.length; j = k++) {
    const [xk, yk] = footprint[k], [xj, yj] = footprint[j];
    if ((yk > y) !== (yj > y) && x < ((xj - xk) * (y - yk)) / (yj - yk) + xk) inside = !inside;
  }
  return inside;
}

function bodyNode(entry, resolveMesh) {
  const colour = linearColour(colourOf(entry));
  const shape = shapeOf(entry.drawable);
  const tinted = (parts) => parts.map((part) => ({ ...part, colour: part.colour == null ? colour : linearColour(part.colour) }));
  const node = { place: false, near: tinted(shape.near), far: tinted(shape.far), bounds: shape.bounds, position: [0, 0, 0], yaw: 0, visible: true };
  if (resolveMesh && typeof entry.drawable === "string" && entry.drawable.startsWith("ni:")) {
    resolveMesh(entry.drawable).then((asset) => {
      const solid = smooth({ positions: asset.positions, indices: asset.indices, colours: asset.colors ?? null });
      node.near = [{ mesh: solid, colour: asset.colors ? [1, 1, 1] : colour, vertexColours: Boolean(asset.colors) }];
      node.bounds = boundsOf(solid.positions);
    }, () => {});
  }
  return node;
}

function boundsOf(positions) {
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < positions.length; k++) {
    low[k % 3] = Math.min(low[k % 3], positions[k]);
    high[k % 3] = Math.max(high[k % 3], positions[k]);
  }
  return [low, high];
}

const DEFAULT_LIGHT = Object.freeze({
  sky: linearColour(0x0e1420),
  fog: { colour: linearColour(0x0e1420), near: 500, far: 12000 },
  sun: { direction: normalize([0.3, -0.5, 1]), colour: linearColour(0xfff1d6), intensity: 2 },
  moon: { direction: [0, 0, 1], colour: linearColour(0x8899cc), intensity: 0 },
  hemisphere: { sky: linearColour(0xbcd7ff), ground: linearColour(0x4a4030), intensity: 0.6 },
});

/** The scene graph one SceneDescription draws. `resolveMesh(address) -> Promise<mesh>` resolves
 *  content-addressed drawables ("ni:…"). */
export function createSceneGraph({ resolveMesh = null } = {}) {
  const entities = new Map(); // id -> node
  let terrain = null; // { samples, layout, chunks }
  let light = DEFAULT_LIGHT;
  let water = { level: 0, colour: linearColour(0x1f5f7a) };
  let rain = null; // { offset, opacity } while it rains

  function setTerrain(samples, layout) {
    // Every chunk, the sea floor too: the water is translucent, and a floor with holes shows them.
    const chunks = terrainChunks(samples, layout).map((chunk) => ({
      centre: chunk.centre,
      box: chunk.box,
      levels: chunk.levels.map((level) => smooth(level)),
    }));
    terrain = { samples, layout, chunks };
  }

  const groundAt = (x, y) => (terrain ? heightAt(terrain.samples, terrain.layout, x, y) : 0);

  function applyEnvironment(environment, eye) {
    if (!environment) return;
    const { sun, weather } = environment;
    const day = sun.daylight;
    const cloud = weather.cloud ?? 0;
    let sky = mix(mix(linearColour(0x0b1020), linearColour(0x86b6e6), day), mix(linearColour(0x1a1c22), linearColour(0x9aa3ad), day), cloud);
    if (sun.elevation > -6 && sun.elevation < 8) sky = mix(sky, linearColour(0xe8945a), (1 - Math.abs(sun.elevation - 1) / 7) * 0.45 * (1 - cloud));
    const far = 12000 * (1 - 0.92 * (weather.fog ?? 0));
    const azimuth = (sun.azimuth * Math.PI) / 180, elevation = (sun.elevation * Math.PI) / 180;
    const toward = (az, el) => [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
    light = {
      sky,
      fog: { colour: sky, near: Math.min(400, far / 4), far },
      sun: { direction: toward(azimuth, elevation), colour: mix(linearColour(0xff9a5a), linearColour(0xfff1d6), sun.elevation / 20), intensity: 2.4 * day * (1 - 0.7 * cloud) },
      moon: { direction: toward(azimuth + Math.PI, 0.6), colour: linearColour(0x8899cc), intensity: 0.25 * (1 - day) },
      hemisphere: { sky: linearColour(0xbcd7ff), ground: linearColour(0x4a4030), intensity: 0.15 + 0.75 * day },
    };
    water = { level: environment.water.level, colour: mix(linearColour(0x1f5f7a), linearColour(0x3a4a55), cloud).map((c) => c * (0.35 + 0.65 * day)) };
    const precipitation = weather.precipitation ?? 0;
    // Rain falls about the eye, with the world's time, so a paused world shows paused rain.
    rain = precipitation > 0
      ? { offset: [eye[0], eye[1], eye[2] - ((environment.time * 900) % RAIN_BOX) + RAIN_BOX / 2], opacity: 0.25 + 0.55 * precipitation }
      : null;
  }

  function update(description, eye = null) {
    const seen = new Set();
    // What the fiber cannot place (a room with no extent holds it) stands in a ring about where
    // the scene put it, in the scene's order, so a room-only world still shows what is here.
    const unplaced = description.entries.filter((entry) => entry.placed === false && !Array.isArray(entry.footprint) && entry.id !== description.actor);
    const ring = new Map(unplaced.map((entry, index) => {
      const angle = (2 * Math.PI * index) / unplaced.length, radius = 2.5 + unplaced.length * 0.4;
      return [entry.id, [(entry.x ?? 0) + radius * Math.sin(angle), (entry.y ?? 0) + radius * Math.cos(angle)]];
    }));
    for (const entry of description.entries) {
      seen.add(entry.id);
      const key = keyOf(entry);
      let node = entities.get(entry.id);
      if (!node || node.key !== key) {
        node = Array.isArray(entry.footprint) ? placeNode(entry) : bodyNode(entry, resolveMesh);
        node.key = key;
        entities.set(entry.id, node);
      }
      // What the actor carries is listed by the text tier, not drawn inside the actor.
      node.visible = entry.holder !== description.actor;
      // How busy a place is (0 to 1), drawn as light and not as a new mesh: it changes every frame.
      node.glow = Math.min(1, Math.max(0, Number(entry.glow) || 0));
      if (node.place) continue;
      // A body's size over its drawable's own: a person seen across a whole city stands taller.
      node.scale = entry.scale > 0 ? entry.scale : 1;
      const [x, y] = ring.get(entry.id) ?? [entry.x ?? 0, entry.y ?? 0];
      // A world's z is the floor of the place a thing stands in; the drawing stands it on the
      // ground under it, and a vessel on the water.
      const floor = entry.drawable === "vessel" ? (description.environment?.water.level ?? 0) : groundAt(x, y);
      node.position = [x, y, Math.max(entry.z ?? 0, floor)];
      node.yaw = entry.yaw ?? 0;
    }
    for (const id of entities.keys()) if (!seen.has(id)) entities.delete(id);
    const self = entities.get(description.actor);
    const focus = self && !self.place ? self.position : [0, 0, 0];
    applyEnvironment(description.environment, eye ?? focus);
  }

  /** The draw list from `eye`: opaque first, then the translucent far to near. */
  function frame(eye) {
    const opaque = [], clear = [];
    const put = (part, model, centre) => {
      const item = {
        mesh: part.mesh,
        model,
        colour: part.colour,
        opacity: part.opacity ?? 1,
        lit: part.lit ?? part.mode !== "lines",
        vertexColours: part.vertexColours ?? false,
        depthWrite: part.depthWrite ?? true,
        roughness: part.roughness ?? 0.7,
        mode: part.mode ?? "triangles",
      };
      if (item.opacity < 1) clear.push([Math.hypot(centre[0] - eye[0], centre[1] - eye[1], centre[2] - eye[2]), item]);
      else opaque.push(item);
    };
    const still = placement([0, 0, 0]);
    if (terrain) {
      for (const chunk of terrain.chunks) {
        // From the eye to the nearest point of the chunk's box: the chunk underfoot is at 0.
        const [low, high] = chunk.box;
        const d = Math.hypot(...eye.map((e, k) => Math.max(low[k] - e, 0, e - high[k])));
        let level = 0;
        chunk.levels.forEach((_, index) => {
          const threshold = LOD_DISTANCES[index] ?? LOD_DISTANCES.at(-1) * 2 ** (index - LOD_DISTANCES.length + 1);
          if (d >= threshold) level = index;
        });
        put({ mesh: chunk.levels[level], colour: [1, 1, 1], vertexColours: true, roughness: 0.95 }, still, chunk.centre);
      }
    } else {
      put({ mesh: GROUND, colour: linearColour(0x55703a), roughness: 1 }, still, [0, 0, 0]);
    }
    for (const node of entities.values()) {
      if (!node.visible) continue;
      if (node.place) {
        for (const part of node.parts) {
          if (part.shell && within(eye, part.shell)) continue;
          put(node.glow > 0 ? glowing(part, node.glow) : part, still, node.centre);
        }
        continue;
      }
      const far = Math.hypot(node.position[0] - eye[0], node.position[1] - eye[1], node.position[2] - eye[2]) >= ENTITY_DETAIL * node.scale;
      const placed = placement(node.position, node.yaw);
      const model = node.scale === 1 ? placed : multiply(placed, scale([node.scale, node.scale, node.scale]));
      for (const part of far ? node.far : node.near) put(node.glow > 0 ? glowing(part, node.glow) : part, model, node.position);
    }
    put({ mesh: WATER, colour: water.colour, opacity: 0.88, roughness: 0.15 }, placement([eye[0], eye[1], water.level]), [eye[0], eye[1], water.level]);
    if (rain) put({ mesh: RAIN, colour: linearColour(0xc8d6e5), opacity: rain.opacity, mode: "lines", lit: false, depthWrite: false }, placement(rain.offset), eye);
    clear.sort((a, b) => b[0] - a[0]);
    return { light, items: [...opaque, ...clear.map(([, item]) => item)] };
  }

  /** The entities a world ray passes through, nearest first. A place one stands inside counts from
   *  where the ray leaves it, as a wall one sees from within. */
  function pick(ray) {
    const hits = [];
    for (const [id, node] of entities) {
      if (!node.visible) continue;
      if (node.place) {
        let nearest = Infinity;
        for (const piece of node.pieces) {
          const span = rayThroughPrism(ray, piece.footprint, piece.span);
          if (span) nearest = Math.min(nearest, span[0] > 0 ? span[0] : span[1]);
        }
        if (nearest < Infinity) hits.push([nearest, id]);
        continue;
      }
      // Into the body's own frame: undo its place, then its yaw.
      const c = Math.cos(node.yaw), s = Math.sin(node.yaw);
      const local = (v) => [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
      const origin = local([ray.origin[0] - node.position[0], ray.origin[1] - node.position[1], ray.origin[2] - node.position[2]]);
      const bounds = node.scale === 1 ? node.bounds : node.bounds.map((corner) => corner.map((value) => value * node.scale));
      const span = rayThroughBox({ origin, direction: local(ray.direction) }, bounds);
      if (span) hits.push([span[0], id]);
    }
    return hits.sort((a, b) => a[0] - b[0]).map(([, id]) => id);
  }

  return {
    entities,
    setTerrain,
    groundAt,
    update,
    frame,
    pick,
    get terrain() {
      return terrain;
    },
    get light() {
      return light;
    },
  };
}
