// spatial-backend — the contract §8's pluggable spatial backends satisfy, made checkable. NEW in this
// pass (the abrash/Ashlar 3D backend integration): the vnext spec's §8 already stated the interface in
// prose (`createBackend({mount}) -> {render(sceneDescription, tick)}`) and `render-2d.mjs` already
// satisfies it unmodified. What was missing was something a SECOND, independently-authored backend
// (living OUTSIDE this package — see below) could import and check itself against, instead of every
// backend author re-reading the prose and hoping they matched it.
//
// THIS MODULE IMPORTS NOTHING BACKEND-SPECIFIC — no canvas, no abrash, no DOM. That is the point: it
// only knows the SHAPE, so the identical checker validates render-2d.mjs (native, in this package) and
// any external backend (an abrash raycaster adapter living in a consuming app, a future WebGL backend,
// whatever) without this package ever depending on what that backend depends on.
//
// WHY THE ABRASH ADAPTER ITSELF DOES NOT LIVE HERE: this package's own README and package.json
// describe it as zero-dependency; `@red-cup-engineering/abrash` is a real npm dependency (itself
// depending on `@561-group/computer`). Adding it to this package's `dependencies` would compromise
// that claim for every consumer, including ones that only ever want the 2D backend. The abrash backend
// is a real, working implementation — see `examples/spectate/shared/spectate-render.mjs` in this
// package's own repo — it just imports THIS module (and `./project.mjs`), never the other way around.
//
// The contract, restated as the two halves a conformance check can actually verify:
//   REQUIRED : render(sceneDescription, tick) — called once per frame with whatever SceneDescription
//              the caller currently has (a live InterpolationBuffer sample, a replayed tick, anything
//              project() produced). Must not throw on a well-formed SceneDescription, must not mutate
//              its argument, and must not return anything the caller is required to consult (the
//              backend's OWN target — a canvas, a framebuffer, a broadcast — is where the frame lands).
//   OPTIONAL : setCamera(pose), followEntity(id|null), capabilities:{camera,dims} — a backend with no
//              camera concept (render-2d: it is a fixed top-down projection) omits all three; a backend
//              that has one (abrash: first-person, camera-dependent) provides all three together, so a
//              caller can feature-detect via `capabilities` instead of sniffing which module it imported.

// capabilitiesOf(backend) — read a backend's self-description, filling in the honest default (no
// camera, 2D) for a backend that has none — which is EVERY backend built before this pass, so this
// function must work even when `capabilities` was never written, not just when it is well-formed.
export function capabilitiesOf(backend) {
  const raw = backend && typeof backend === "object" ? (backend.capabilities ?? {}) : {};
  const hasSetCamera = typeof backend?.setCamera === "function";
  const hasFollowEntity = typeof backend?.followEntity === "function";
  return {
    // camera is true only if BOTH the backend claims it AND actually exposes setCamera — a backend
    // that claims camera:true but forgot to implement setCamera is not conformant (checked below, not
    // silently upgraded here).
    camera: Boolean(raw.camera) && hasSetCamera,
    followEntity: hasFollowEntity,
    dims: raw.dims === 3 ? 3 : 2,
  };
}

function isPlainSceneDescription(scene) {
  return Boolean(scene) && typeof scene === "object" && Number.isFinite(scene.tick) && Array.isArray(scene.entries);
}

// assertBackendConformance(backend, scene, tick) — the checker. Throws a descriptive Error on the
// first violation found (so a failing test names exactly what broke, not just "conformance failed");
// returns a small report object on success. `scene` should be real `project()` output (or structurally
// identical) — this function does not itself call project(), it is handed a scene so it can be reused
// against a live-derived AND a replay-derived scene without caring which.
export function assertBackendConformance(backend, scene, tick = scene?.tick ?? 0) {
  if (!backend || typeof backend.render !== "function") {
    throw new TypeError("spatial-backend conformance: backend.render must be a function (the one required member of the contract)");
  }
  if (!isPlainSceneDescription(scene)) {
    throw new TypeError("spatial-backend conformance: scene must be a SceneDescription ({tick:number, entries:array})");
  }

  const caps = capabilitiesOf(backend);
  if (backend.capabilities && backend.capabilities.camera && !caps.camera) {
    throw new TypeError("spatial-backend conformance: capabilities.camera is true but setCamera is not a function");
  }

  // purity of the CALL, not of what it draws: render() must not reach back into the argument it was
  // given and change it — a scene a caller reuses for a second backend (§9's whole premise: the SAME
  // scene rendered by two backends) must read the same both times.
  const before = JSON.stringify(scene);
  backend.render(scene, tick);
  const after = JSON.stringify(scene);
  if (before !== after) {
    throw new Error("spatial-backend conformance: render() mutated the SceneDescription it was given");
  }

  // callable twice without throwing (a backend that only survives one call is not usable by a render
  // loop, which is the ONLY way any real caller ever uses one).
  backend.render(scene, tick);

  if (typeof backend.setCamera === "function") {
    // setCamera must accept the documented pose shape without throwing; it has no return-value
    // contract, so there is nothing further to assert generically here.
    backend.setCamera({ x: 0, z: 0, angle: 0 });
  }
  if (typeof backend.followEntity === "function") {
    backend.followEntity(null); // null = free camera must always be accepted, even with no entities
  }

  return { ok: true, capabilities: caps };
}

// SPATIAL_BACKEND_CONTRACT — the interface restated as plain data, for anything (a doc generator, a
// README table, a human) that wants the shape without importing the checker's control flow.
export const SPATIAL_BACKEND_CONTRACT = Object.freeze({
  required: Object.freeze(["render"]),
  optional: Object.freeze(["setCamera", "followEntity", "capabilities"]),
});
