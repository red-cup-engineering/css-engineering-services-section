// render-three — the webgl tier: a SceneDescription drawn in 3D with three.js, on WebGPU where the
// browser has it and WebGL2 where it does not. It draws the same projection as the canvas2d and
// text tiers, under the same spatial-backend contract; it only reads more of it (terrain, water,
// sun, weather, the extent of places).
//
// three is passed in, never imported: a browser passes `three/webgpu`, a Node test passes `three`.
// The scene graph uses only three's core classes, so both build the same graph; only the renderer
// differs. The world's frame (x east, y north, z up) maps to three's (x right, y up, z toward the
// viewer) as (x, y, z) -> (x, z, -y), a rotation, so windings and handedness survive it.

import { decodeHeightfield, heightAt } from "@red-cup-engineering/feltos/geometry";
import { decodeMesh } from "./assets.mjs";
import { terrainChunks } from "./terrain.mjs";

const LOD_DISTANCES = [0, 900, 2200, 4500];
const ENTITY_DETAIL = 350;
const RAIN_DROPS = 3000;
const RAIN_BOX = 120;

const ROLE_COLOURS = Object.freeze({
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

/** ENU (x east, y north, z up) to three (x, y up, z south). */
export const toThree = (x, y, z) => [x, z, -y];

function enuBuffer(positions) {
  const out = new Float32Array(positions.length);
  for (let k = 0; k < positions.length; k += 3) {
    out[k] = positions[k];
    out[k + 1] = positions[k + 2];
    out[k + 2] = -positions[k + 1];
  }
  return out;
}

function geometryOf(THREE, { positions, indices, colours }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(enuBuffer(positions), 3));
  if (colours) geometry.setAttribute("color", new THREE.Float32BufferAttribute(Float32Array.from(colours), 3));
  geometry.setIndex(Array.from(indices));
  geometry.computeVertexNormals();
  return geometry;
}

/** A convex prism (footprint over a z interval) as ENU walls and a floor, for a place's extent. */
export function prismMesh(footprint, [bottom, top]) {
  const n = footprint.length;
  const positions = [], indices = [];
  for (const [x, y] of footprint) positions.push(x, y, bottom);
  for (const [x, y] of footprint) positions.push(x, y, top);
  for (let k = 1; k < n - 1; k++) indices.push(0, k, k + 1);
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    indices.push(k, next, n + next, k, n + next, n + k);
  }
  return { positions, indices };
}

// What each drawable looks like near and far. Each is a group of simple solids about the entity's
// own origin (its feet), facing north before its yaw turns it.
function nearShape(THREE, drawable, colour) {
  const material = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7 });
  const group = new THREE.Group();
  const add = (geometry, [x, y, z], solid = material) => {
    const mesh = new THREE.Mesh(geometry, solid);
    mesh.position.set(...toThree(x, y, z));
    group.add(mesh);
    return mesh;
  };
  switch (drawable) {
    case "figure":
      add(new THREE.CapsuleGeometry(0.28, 1.0, 4, 8), [0, 0, 0.78]);
      add(new THREE.SphereGeometry(0.2, 12, 8), [0, 0, 1.6]);
      add(new THREE.BoxGeometry(0.12, 0.08, 0.12), [0, 0.22, 1.62], new THREE.MeshStandardMaterial({ color: 0x222222 }));
      break;
    case "vehicle":
      add(new THREE.BoxGeometry(1.9, 0.9, 4.4), [0, 0, 0.75]);
      add(new THREE.BoxGeometry(1.6, 0.6, 2.0), [0, -0.3, 1.5]);
      break;
    case "vessel": {
      const hull = add(new THREE.ConeGeometry(2.2, 14, 4, 1), [0, 0, 0.6]);
      hull.rotation.x = -Math.PI / 2;
      hull.scale.set(1, 1, 0.35);
      add(new THREE.CylinderGeometry(0.15, 0.15, 10, 6), [0, 0, 5.6]);
      break;
    }
    case "exit": {
      add(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), [0, 0, 0.8]);
      const arrow = add(new THREE.ConeGeometry(0.3, 0.6, 8), [0, 0.2, 1.7]);
      arrow.rotation.x = -Math.PI / 2;
      break;
    }
    default:
      add(new THREE.OctahedronGeometry(0.3), [0, 0, 0.4]);
  }
  return group;
}

function farShape(THREE, drawable, colour) {
  const size = drawable === "vessel" ? 8 : drawable === "vehicle" ? 3 : drawable === "figure" ? 1.8 : 1;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, size, size * 0.5), new THREE.MeshBasicMaterial({ color: colour }));
  mesh.position.y = size / 2;
  return mesh;
}

function placeShape(THREE, entry, colour) {
  const group = new THREE.Group();
  const pieces = [{ footprint: entry.footprint, span: entry.span }, ...(entry.reaches ?? [])];
  for (const [index, piece] of pieces.entries()) {
    const shell = geometryOf(THREE, prismMesh(piece.footprint, piece.span));
    const enclosed = entry.enclosed && index === 0;
    const material = new THREE.MeshStandardMaterial({
      color: colour,
      transparent: true,
      opacity: enclosed ? (entry.role === "here" ? 0.12 : 0.55) : 0.08,
      side: THREE.DoubleSide,
      depthWrite: !enclosed || entry.role !== "here",
    });
    group.add(new THREE.Mesh(shell, material));
    const ring = new THREE.BufferGeometry();
    // A closed Line rather than a LineLoop: WebGPU draws no loops.
    const outline = [...piece.footprint, piece.footprint[0]];
    ring.setAttribute("position", new THREE.Float32BufferAttribute(enuBuffer(outline.flatMap(([x, y]) => [x, y, piece.span[0] + 0.05])), 3));
    group.add(new THREE.Line(ring, new THREE.LineBasicMaterial({ color: colour })));
  }
  return group;
}

const mixColour = (THREE, from, to, t) => new THREE.Color(from).lerp(new THREE.Color(to), Math.max(0, Math.min(1, t)));

/** The scene graph one SceneDescription draws: entities by id, places by extent, terrain, water,
 *  sky and weather. `update(scene)` reconciles it with a new scene; nothing else changes it. */
export function createSceneGraph(THREE, { resolveMesh = null } = {}) {
  const scene = new THREE.Scene();
  scene.name = "qwzspace";
  const entities = new Map();
  const world = new THREE.Group();
  world.name = "entities";
  scene.add(world);

  const hemisphere = new THREE.HemisphereLight(0xbcd7ff, 0x4a4030, 0.6);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2);
  const moon = new THREE.DirectionalLight(0x8899cc, 0.15);
  scene.add(hemisphere, sun, sun.target, moon, moon.target);
  scene.fog = new THREE.Fog(0xaaccee, 500, 12000);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(60000, 60000),
    new THREE.MeshStandardMaterial({ color: 0x1f5f7a, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }),
  );
  water.name = "water";
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: 0x55703a, roughness: 1 }));
  ground.name = "ground";
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.01;
  scene.add(ground);

  const rainPositions = new Float32Array(RAIN_DROPS * 3);
  for (let k = 0; k < RAIN_DROPS; k++) {
    // A fixed scatter (no randomness: every client draws the same rain).
    rainPositions[k * 3] = ((k * 7919) % 1000) / 1000 * RAIN_BOX - RAIN_BOX / 2;
    rainPositions[k * 3 + 1] = ((k * 104729) % 1000) / 1000 * RAIN_BOX;
    rainPositions[k * 3 + 2] = ((k * 15485863) % 1000) / 1000 * RAIN_BOX - RAIN_BOX / 2;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rainPositions, 3));
  const rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0xc8d6e5, size: 0.25, transparent: true, opacity: 0.6 }));
  rain.name = "rain";
  rain.visible = false;
  scene.add(rain);

  let terrain = null; // { samples, layout, group }

  function entityNode(entry) {
    const colour = entry.tint ?? ROLE_COLOURS[entry.role] ?? ROLE_COLOURS[entry.kind] ?? 0xcccccc;
    if (Array.isArray(entry.footprint)) {
      const node = placeShape(THREE, entry, colour);
      node.userData.shapeKey = JSON.stringify([entry.footprint, entry.span, entry.reaches, entry.enclosed, entry.role, entry.tint]);
      return node;
    }
    const lod = new THREE.LOD();
    const near = new THREE.Group();
    near.add(nearShape(THREE, entry.drawable, colour));
    lod.addLevel(near, 0);
    lod.addLevel(farShape(THREE, entry.drawable, colour), ENTITY_DETAIL);
    if (resolveMesh && typeof entry.drawable === "string" && entry.drawable.startsWith("ni:")) {
      resolveMesh(entry.drawable).then((mesh) => {
        near.clear();
        near.add(new THREE.Mesh(geometryOf(THREE, { positions: mesh.positions, indices: mesh.indices, colours: mesh.colors }),
          new THREE.MeshStandardMaterial({ color: mesh.colors ? 0xffffff : colour, vertexColors: Boolean(mesh.colors), roughness: 0.7 })));
      }, () => {});
    }
    lod.userData.shapeKey = JSON.stringify([entry.drawable, entry.role, entry.tint]);
    return lod;
  }

  function setTerrain(samples, layout) {
    if (terrain) scene.remove(terrain.group);
    const group = new THREE.Group();
    group.name = "terrain";
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    // Every chunk, the sea floor too: the water is translucent, and a floor with holes shows them.
    for (const chunk of terrainChunks(samples, layout)) {
      const lod = new THREE.LOD();
      lod.position.set(...toThree(...chunk.centre));
      chunk.levels.forEach((level, index) => {
        const mesh = new THREE.Mesh(geometryOf(THREE, level), material);
        mesh.position.set(...toThree(...chunk.centre)).negate();
        const holder = new THREE.Group();
        holder.add(mesh);
        lod.addLevel(holder, LOD_DISTANCES[index] ?? LOD_DISTANCES.at(-1) * 2 ** (index - LOD_DISTANCES.length + 1));
      });
      group.add(lod);
    }
    scene.add(group);
    ground.visible = false;
    terrain = { samples, layout, group };
  }

  function groundAt(x, y) {
    return terrain ? heightAt(terrain.samples, terrain.layout, x, y) : 0;
  }

  function applyEnvironment(environment, focus, eye) {
    if (!environment) return;
    const { sun: light, weather } = environment;
    const day = light.daylight;
    const cloud = weather.cloud ?? 0;
    const sky = mixColour(THREE, mixColour(THREE, 0x0b1020, 0x86b6e6, day), mixColour(THREE, 0x1a1c22, 0x9aa3ad, day), cloud);
    if (light.elevation > -6 && light.elevation < 8) sky.lerp(new THREE.Color(0xe8945a), (1 - Math.abs(light.elevation - 1) / 7) * 0.45 * (1 - cloud));
    scene.background = sky;
    scene.fog.color.copy(sky);
    scene.fog.far = 12000 * (1 - 0.92 * (weather.fog ?? 0));
    scene.fog.near = Math.min(400, scene.fog.far / 4);

    const azimuth = light.azimuth * Math.PI / 180, elevation = light.elevation * Math.PI / 180;
    const reach = 5000;
    const toward = (az, el) => toThree(Math.sin(az) * Math.cos(el) * reach, Math.cos(az) * Math.cos(el) * reach, Math.sin(el) * reach);
    sun.position.set(...toward(azimuth, elevation)).add(focus);
    sun.target.position.copy(focus);
    sun.intensity = 2.4 * day * (1 - 0.7 * cloud);
    sun.color = mixColour(THREE, 0xff9a5a, 0xfff1d6, light.elevation / 20);
    moon.position.set(...toward(azimuth + Math.PI, 0.6)).add(focus);
    moon.target.position.copy(focus);
    moon.intensity = 0.25 * (1 - day);
    hemisphere.intensity = 0.15 + 0.75 * day;

    water.position.y = environment.water.level;
    water.material.color = mixColour(THREE, 0x1f5f7a, 0x3a4a55, cloud).multiplyScalar(0.35 + 0.65 * day);

    rain.visible = (weather.precipitation ?? 0) > 0;
    if (rain.visible) {
      rain.material.opacity = 0.25 + 0.55 * weather.precipitation;
      // Rain falls about the eye, with the world's time, so a paused world shows paused rain.
      rain.position.set(eye.x, eye.y - ((environment.time * 900) % RAIN_BOX) - RAIN_BOX / 2 + RAIN_BOX, eye.z);
    }
  }

  return {
    scene,
    entities,
    setTerrain,
    groundAt,
    get terrain() {
      return terrain;
    },
    /** `eye`, where the camera stands (three's frame), centres the weather on the viewer. */
    update(description, eye = null) {
      const seen = new Set();
      // What the fiber cannot place (a room with no extent holds it) stands in a ring about where
      // the scene put it, in the scene's order, so a room-only world still shows what is here.
      const unplaced = description.entries.filter((entry) => entry.placed === false && !Array.isArray(entry.footprint) && entry.id !== description.actor);
      const ring = new Map(unplaced.map((entry, index) => {
        const angle = 2 * Math.PI * index / unplaced.length, radius = 2.5 + unplaced.length * 0.4;
        return [entry.id, [(entry.x ?? 0) + radius * Math.sin(angle), (entry.y ?? 0) + radius * Math.cos(angle)]];
      }));
      for (const entry of description.entries) {
        seen.add(entry.id);
        let node = entities.get(entry.id);
        const key = Array.isArray(entry.footprint)
          ? JSON.stringify([entry.footprint, entry.span, entry.reaches, entry.enclosed, entry.role, entry.tint])
          : JSON.stringify([entry.drawable, entry.role, entry.tint]);
        if (node && node.userData.shapeKey !== key) {
          world.remove(node);
          node = undefined;
        }
        if (!node) {
          node = entityNode(entry);
          node.name = entry.id;
          entities.set(entry.id, node);
          world.add(node);
        }
        // What the actor carries is listed by the text tier, not drawn inside the actor.
        node.visible = entry.holder !== description.actor;
        if (Array.isArray(entry.footprint)) continue;
        const [x, y] = ring.get(entry.id) ?? [entry.x ?? 0, entry.y ?? 0];
        // A world's z is the floor of the place a thing stands in; the drawing stands it on the
        // ground under it, and a vessel on the water.
        const floor = entry.drawable === "vessel" ? (description.environment?.water.level ?? 0) : groundAt(x, y);
        node.position.set(...toThree(x, y, Math.max(entry.z ?? 0, floor)));
        node.rotation.y = -(entry.yaw ?? 0);
      }
      for (const [id, node] of entities) {
        if (seen.has(id)) continue;
        world.remove(node);
        entities.delete(id);
      }
      const self = entities.get(description.actor);
      const focus = self ? self.position.clone() : new THREE.Vector3();
      applyEnvironment(description.environment, focus, eye ?? focus);
    },
  };
}

/** Which graphics API a three renderer drew with: "webgpu", "webgl2", or null before it has one. */
export function graphicsOf(renderer) {
  const backend = renderer?.backend;
  if (backend?.isWebGPUBackend) return "webgpu";
  if (backend?.isWebGLBackend) return "webgl2";
  if (renderer?.isWebGLRenderer) return "webgl2";
  return null;
}

// The proof a device can draw: one triangle through a compiled pipeline into a small texture.
const PROOF_SHADER = `
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}
@fragment fn fs() -> @location(0) vec4f { return vec4f(1.0, 0.5, 0.0, 1.0); }`;

/** Which device to draw with. A browser can offer WebGPU and still hand out a device that cannot
 *  draw (a software adapter whose device is destroyed once it compiles a pipeline, a blocklisted
 *  driver), and three takes a destroyed device for a deliberate one and never falls back. So the
 *  device is proved first: it must compile a pipeline, draw a triangle, and come back without an
 *  error or a loss. A device that passes is handed to three; anything else draws with WebGL2. */
export async function chooseDevice({ gpu = globalThis.navigator?.gpu, forceWebGL = false } = {}) {
  if (forceWebGL || !gpu) return { forceWebGL: true };
  let device = null;
  const refuse = () => {
    device?.destroy();
    return { forceWebGL: true };
  };
  try {
    const adapter = await gpu.requestAdapter({ featureLevel: "compatibility" });
    if (!adapter) return refuse();
    device = await adapter.requestDevice({ requiredFeatures: [...adapter.features] });
    let lost = false;
    device.lost.then(() => {
      lost = true;
    }, () => {
      lost = true;
    });
    device.pushErrorScope("validation");
    // Drawn into a canvas, as three will: some adapters draw offscreen and fail only to present.
    const surface = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(4, 4).getContext("webgpu") : null;
    const format = surface ? gpu.getPreferredCanvasFormat() : "rgba8unorm";
    surface?.configure({ device, format, alphaMode: "premultiplied" });
    const module = device.createShaderModule({ code: PROOF_SHADER });
    const pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
    });
    const target = surface ? surface.getCurrentTexture() : device.createTexture({ size: [4, 4], format, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp: "clear", storeOp: "store", clearValue: [0, 0, 0, 1] }] });
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const fault = await device.popErrorScope();
    surface?.unconfigure();
    if (!surface) target.destroy();
    // A device that is going to be dropped is dropped by now; give the loss a turn to land.
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (fault !== null || lost) return refuse();
    return { device };
  } catch {
    return refuse();
  }
}

/** The webgl tier as a spatial backend.
 *    THREE    — the three namespace (`three/webgpu` in a browser, `three` for a headless graph)
 *    canvas   — where to draw (omit with a `renderer` already made)
 *    renderer — a renderer to use instead of a new WebGPURenderer (a headless test passes a stub)
 *    assets   — a resolver ({resolve(address) -> bytes}) for terrain and content-addressed meshes
 *    forceWebGL — draw with WebGL2 even where WebGPU is available
 *  `ready` settles, with the graphics API chosen, once the renderer has its device; frames before
 *  then build the graph but draw nothing. */
export function createBackend({ THREE, canvas = null, renderer = null, assets = null, forceWebGL = false, antialias = true } = {}) {
  if (!THREE?.Scene) throw new TypeError("render-three: createBackend({ THREE }) requires the three namespace");
  const resolveMesh = assets ? (address) => assets.resolve(address).then(decodeMesh) : null;
  const graph = createSceneGraph(THREE, { resolveMesh });
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.3, 30000);
  let draw = renderer;
  let drawing = false;
  const made = draw ? Promise.resolve(draw) : chooseDevice({ forceWebGL }).then((device) => {
    draw = new THREE.WebGPURenderer({ canvas, antialias, ...device });
    return draw;
  });
  const ready = made.then((made) => typeof made.init === "function" ? made.init() : undefined).then(() => {
    drawing = true;
    size = [0, 0];
    return graphicsOf(draw);
  });

  let follow = undefined; // undefined: follow the scene's actor; null: free camera; id: that entity
  let free = { x: 0, y: 0, z: null, heading: 0, pitch: -12 };
  let terrainAddress = null;
  let size = [0, 0];

  function fit() {
    if (!draw) return;
    const element = draw.domElement ?? canvas;
    const width = element?.clientWidth || element?.width || 0, height = element?.clientHeight || element?.height || 0;
    if (!width || !height || (width === size[0] && height === size[1])) return;
    size = [width, height];
    draw.setSize?.(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function watchTerrain(environment) {
    const spec = environment?.terrain;
    if (!spec?.address || spec.address === terrainAddress || !assets) return;
    terrainAddress = spec.address;
    assets.resolve(spec.address).then((bytes) => {
      if (terrainAddress === spec.address) graph.setTerrain(decodeHeightfield(bytes, spec), spec);
    }, () => {
      if (terrainAddress === spec.address) terrainAddress = null;
    });
  }

  function aim(description) {
    const id = follow === undefined ? description.actor : follow;
    const target = id === null ? null : description.entries.find((entry) => entry.id === id && !Array.isArray(entry.footprint));
    if (target) {
      // A chase camera: behind the entity's heading, above it, looking at its head.
      const yaw = target.yaw ?? 0, back = 9, up = 4;
      const eye = [target.x - Math.sin(yaw) * back, target.y - Math.cos(yaw) * back, 0];
      eye[2] = Math.max(target.z + up, graph.groundAt(eye[0], eye[1]) + 1.5, (description.environment?.water.level ?? 0) + 1.5);
      camera.position.set(...toThree(...eye));
      camera.lookAt(...toThree(target.x, target.y, target.z + 1.5));
      return;
    }
    const z = free.z ?? graph.groundAt(free.x, free.y) + 40;
    const heading = free.heading * Math.PI / 180, pitch = free.pitch * Math.PI / 180;
    camera.position.set(...toThree(free.x, free.y, z));
    camera.lookAt(...toThree(free.x + Math.sin(heading) * Math.cos(pitch), free.y + Math.cos(heading) * Math.cos(pitch), z + Math.sin(pitch)));
  }

  return {
    capabilities: Object.freeze({ camera: true, dims: 3 }),
    ready,
    camera,
    graph,
    get renderer() {
      return draw;
    },
    get graphics() {
      return graphicsOf(draw);
    },
    /** A free camera in the world's frame: {x, y, z?, heading (degrees from north), pitch (degrees)}.
     *  Setting one stops following. */
    setCamera(pose = {}) {
      free = {
        x: Number.isFinite(pose.x) ? pose.x : free.x,
        y: Number.isFinite(pose.y) ? pose.y : free.y,
        z: Number.isFinite(pose.z) ? pose.z : null,
        heading: Number.isFinite(pose.heading) ? pose.heading : Number.isFinite(pose.angle) ? pose.angle : free.heading,
        pitch: Number.isFinite(pose.pitch) ? pose.pitch : free.pitch,
      };
      follow = null;
    },
    /** Follow an entity from behind, or `null` for the free camera. */
    followEntity(id) {
      follow = id ?? null;
    },
    render(description) {
      watchTerrain(description.environment);
      fit();
      aim(description);
      graph.update(description, camera.position);
      if (!drawing) return;
      graph.scene.traverse((node) => {
        if (node.isLOD) node.update(camera);
      });
      draw.render(graph.scene, camera);
    },
  };
}
