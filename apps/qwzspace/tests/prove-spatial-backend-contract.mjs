// prove-spatial-backend-contract — §8's backend interface, made checkable (new in this pass, alongside
// the abrash 3D backend integration). Proves three things: (1) render-2d.mjs, the ONLY backend this
// package ships, conforms; (2) the checker actually rejects real violations, not just rubber-stamps
// anything with a render() method; (3) capabilitiesOf() reports the honest default for a backend that
// never wrote a `capabilities` field, which is every backend written before this file existed.
//
// The abrash-backed 3D backend's OWN conformance run lives in examples/spectate/test/prove-abrash-
// backend.mjs, in the app, not here — this package never imports abrash (see spatial-backend.mjs's own
// header for why). That file imports THIS module's assertBackendConformance and runs it against a real
// abrash-backed backend; this file proves the checker is trustworthy against the backend qwzspace itself
// owns end-to-end.

import { ok, eq, done } from "./_harness.mjs";
import { project } from "../src/project.mjs";
import { createBackend } from "../src/render-2d.mjs";
import { assertBackendConformance, capabilitiesOf, SPATIAL_BACKEND_CONTRACT } from "../src/spatial-backend.mjs";
import { test } from "node:test";

test("prove-spatial-backend-contract", async () => {

// the contract's own shape, as data (documentation-as-code, not just prose).
eq(SPATIAL_BACKEND_CONTRACT.required, ["render"], "render is the one required member");
ok(SPATIAL_BACKEND_CONTRACT.optional.includes("setCamera"), "setCamera is documented as optional");
ok(SPATIAL_BACKEND_CONTRACT.optional.includes("capabilities"), "capabilities is documented as optional");

function makeMockCanvas() {
  const calls = [];
  const ctx = {
    calls,
    clearRect: (...a) => calls.push(["clearRect", ...a]),
    beginPath: () => calls.push(["beginPath"]),
    arc: (...a) => calls.push(["arc", ...a]),
    fill: () => calls.push(["fill"]),
    fillText: (...a) => calls.push(["fillText", ...a]),
    set fillStyle(v) {
      calls.push(["fillStyle", v]);
    },
  };
  return { getContext: () => ctx, calls };
}

// a FRESH scene per case (never shared across assertions) — some cases below deliberately hand a
// hostile backend a real scene to prove mutation is caught, which leaves that particular object
// permanently altered; reusing one scene across cases would let an earlier case's damage leak into a
// later one's assertions.
function freshScene() {
  return project({ entities: [{ id: "a1", x: 3, y: 4, kind: "actor", name: "alpha" }] }, 9);
}

// (1) render-2d.mjs conforms, and reports the honest "no camera, 2D" default — it never declared
// `capabilities` at all, matching every backend written before this pass.
{
  const backend = createBackend({ mount: makeMockCanvas() });
  const scene = freshScene();
  const report = assertBackendConformance(backend, scene, scene.tick);
  ok(report.ok, "render-2d's backend conforms to the spatial-backend contract");
  eq(report.capabilities, { camera: false, followEntity: false, dims: 2 }, "render-2d honestly self-describes as no-camera, 2D (it never wrote a capabilities field)");
  eq(capabilitiesOf(backend), { camera: false, followEntity: false, dims: 2 }, "capabilitiesOf() agrees, called standalone");
}

// (2) the checker is not a rubber stamp — it must catch a backend that VIOLATES the contract, not just
// pass everything with a render() method. Four independent violations, each its own case.
{
  let threw = false;
  try {
    assertBackendConformance({ render: "not a function" }, freshScene(), 9);
  } catch (e) {
    threw = true;
    ok(/render must be a function/.test(e.message), "rejects a backend whose render is not a function, with a message naming the violation");
  }
  ok(threw, "a backend with no callable render() fails conformance");
}
{
  let threw = false;
  try {
    assertBackendConformance({ render() {} }, 9, 9); // a number, not a SceneDescription
  } catch {
    threw = true;
  }
  ok(threw, "a malformed second argument (not a SceneDescription) fails conformance");
}
{
  // a hostile backend that mutates the SceneDescription it was handed — exactly the failure §9's
  // unification proof depends on never happening (a scene reused for a second backend must read
  // identically both times).
  const mutator = {
    render(s) {
      s.entries.push({ id: "injected", kind: "ghost", role: "ghost", x: 0, y: 0, z: 0, yaw: 0, label: "ghost" });
    },
  };
  let threw = false;
  try {
    assertBackendConformance(mutator, freshScene(), 9);
  } catch (e) {
    threw = true;
    ok(/mutated the SceneDescription/.test(e.message), "names the mutation as the specific violation");
  }
  ok(threw, "a backend that mutates its SceneDescription argument fails conformance");
}
{
  // capabilities.camera:true with no setCamera implemented — claims a capability it does not provide.
  const liar = { render() {}, capabilities: { camera: true } };
  let threw = false;
  try {
    assertBackendConformance(liar, freshScene(), 9);
  } catch (e) {
    threw = true;
    ok(/capabilities\.camera is true but setCamera/.test(e.message), "names the specific mismatch: claimed camera, no setCamera");
  }
  ok(threw, "a backend claiming camera:true without setCamera fails conformance");
}

// (3) a well-formed 3D-shaped backend (no abrash involved — a plain object exercising the OPTIONAL
// half of the contract) is accepted, and capabilitiesOf() reports what it actually declared.
{
  const scene = freshScene();
  let lastPose = null;
  let lastFollow = "unset";
  const cameraBackend = {
    capabilities: { camera: true, dims: 3 },
    setCamera(pose) {
      lastPose = pose;
    },
    followEntity(id) {
      lastFollow = id;
    },
    render(sceneDescription, tick) {
      ok(sceneDescription === scene, "render() receives the exact scene object passed in, not a copy");
      eq(tick, scene.tick, "render() receives the tick it was called with");
    },
  };
  const report = assertBackendConformance(cameraBackend, scene, scene.tick);
  ok(report.ok, "a well-formed camera-capable backend conforms");
  eq(report.capabilities, { camera: true, followEntity: true, dims: 3 }, "capabilities reflect what the backend actually declared and implemented");
  ok(lastPose && typeof lastPose.x === "number", "the conformance check exercised setCamera with a real pose");
  eq(lastFollow, null, "the conformance check exercised followEntity(null) — free camera must always be accepted");
}

done("prove-spatial-backend-contract");
});
