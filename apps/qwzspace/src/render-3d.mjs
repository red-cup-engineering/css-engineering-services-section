// render-3d — qwzspace's own 3D tier: a SceneDescription drawn in perspective by the engine's scene
// graph on the engine's own device. It draws the same projection as the 2D and text tiers, under the
// same spatial-backend contract; it only reads more of it (terrain, water, sun, weather, the extent
// of places). No third-party renderer: the world's frame (x east, y north, z up) is the engine's frame
// end to end.
//
// Layers: linear (arithmetic) -> solids (meshes) -> scene-graph (what to draw, headless) -> a device
// (gpu-webgl2; a WebGPU device takes the same frame) -> this backend (camera, sizing, picking).

import { decodeHeightfield } from "@red-cup-engineering/feltos/geometry";
import { decodeMesh } from "./assets.mjs";
import { createWebGL2Device } from "./gpu-webgl2.mjs";
import { invert, lookAt, multiply, perspective, projectPoint, screenRay } from "./linear.mjs";
import { createSceneGraph } from "./scene-graph.mjs";

const FIELD_OF_VIEW = 60;
const NEAR = 0.3;
const FAR = 30000;

/** The 3D tier as a spatial backend.
 *    canvas — where to draw; without one (a headless proof) the graph is built and nothing drawn
 *    assets — a resolver ({resolve(address) -> bytes}) for terrain and content-addressed meshes
 *    device — a device to draw with instead of a WebGL2 one made over the canvas
 *  `ready` settles with the graphics API drawn with ("webgl2"), or null where there is none. */
export function createBackend({ canvas = null, assets = null, device = null, antialias = true } = {}) {
  const resolveMesh = assets ? (address) => assets.resolve(address).then(decodeMesh) : null;
  const graph = createSceneGraph({ resolveMesh });
  const draw = device ?? (canvas ? createWebGL2Device(canvas, { antialias }) : null);
  const ready = Promise.resolve(draw?.kind ?? null);

  const camera = { position: [0, -9, 4], target: [0, 0, 1.5], fov: FIELD_OF_VIEW, near: NEAR, far: FAR, aspect: 16 / 9, view: null, projection: null, viewProjection: null };
  let follow = undefined; // undefined: follow the scene's actor; null: free camera; id: that entity
  // How the chase camera stands off what it follows: turned `orbit` radians about it from behind,
  // `distance` metres back along the ground and `lift` of that above its head.
  let chase = { orbit: 0, distance: 9, lift: 4 / 9 };
  let free = { x: 0, y: 0, z: null, heading: 0, pitch: -12 };
  let terrainAddress = null;
  let size = [0, 0]; // CSS pixels

  function fit() {
    const width = canvas?.clientWidth || canvas?.width || 0, height = canvas?.clientHeight || canvas?.height || 0;
    if (width && height) size = [width, height];
    camera.aspect = size[0] && size[1] ? size[0] / size[1] : 16 / 9;
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
    const node = id === null ? null : graph.entities.get(id);
    if (node && !node.place) {
      // A chase camera: behind the entity's heading, above it, looking at its head, where the
      // graph stands it (on the ground or the water, not at its place's floor).
      const [x, y, z] = node.position, heading = node.yaw + chase.orbit;
      const eye = [x - Math.sin(heading) * chase.distance, y - Math.cos(heading) * chase.distance, 0];
      eye[2] = Math.max(z + chase.distance * chase.lift, graph.groundAt(eye[0], eye[1]) + 1.5, (description.environment?.water.level ?? 0) + 1.5);
      camera.position = eye;
      camera.target = [x, y, z + 1.5];
    } else {
      const z = free.z ?? graph.groundAt(free.x, free.y) + 40;
      const heading = (free.heading * Math.PI) / 180, pitch = (free.pitch * Math.PI) / 180;
      camera.position = [free.x, free.y, z];
      camera.target = [free.x + Math.sin(heading) * Math.cos(pitch), free.y + Math.cos(heading) * Math.cos(pitch), z + Math.sin(pitch)];
    }
    camera.view = lookAt(camera.position, camera.target);
    camera.projection = perspective((camera.fov * Math.PI) / 180, camera.aspect, camera.near, camera.far);
    camera.viewProjection = multiply(camera.projection, camera.view);
  }

  return {
    capabilities: Object.freeze({ camera: true, dims: 3 }),
    ready,
    camera,
    graph,
    get graphics() {
      return draw?.kind ?? null;
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
    /** Follow an entity from behind, or `null` for the free camera; `stand` ({orbit, distance,
     *  lift}) turns the chase camera about it and draws it in or out. */
    followEntity(id, stand = {}) {
      follow = id ?? null;
      chase = {
        orbit: Number.isFinite(stand.orbit) ? stand.orbit : chase.orbit,
        distance: Number.isFinite(stand.distance) ? stand.distance : chase.distance,
        lift: Number.isFinite(stand.lift) ? stand.lift : chase.lift,
      };
    },
    render(description) {
      watchTerrain(description.environment);
      fit();
      // The graph first: the camera follows a body where the graph stands it.
      graph.update(description, camera.position);
      aim(description);
      if (!draw || !size[0] || !size[1]) return;
      const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
      const { light, items } = graph.frame(camera.position);
      draw.draw({
        width: Math.round(size[0] * ratio), height: Math.round(size[1] * ratio),
        view: camera.view, projection: camera.projection, far: camera.far, eye: camera.position, light, items,
      });
    },
    /** Where a world point falls on the canvas, in CSS pixels from its top left; null behind the eye. */
    project(point) {
      if (!camera.viewProjection) return null;
      const at = projectPoint(camera.viewProjection, point, size[0], size[1]);
      return at && at[2] <= 1 ? [at[0], at[1]] : null;
    },
    /** The ids of the entities under a canvas point (CSS pixels), nearest first. */
    pick(px, py) {
      if (!camera.viewProjection || !size[0]) return [];
      const inverse = invert(camera.viewProjection);
      return inverse ? graph.pick(screenRay(inverse, px, py, size[0], size[1])) : [];
    },
  };
}
