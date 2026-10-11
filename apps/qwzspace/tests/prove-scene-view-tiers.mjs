// prove-scene-view-tiers — the capability ladder webgpu > webgl2 > canvas2d > text: the selector is
// a pure function of declared capabilities, a refused rung falls to the next, and the WebGPU device
// refuses cleanly (no adapter, no device, a shader that will not compile) so the ladder can fall.
// Headless: every browser object here is a fixture.

import { test } from "node:test";
import { ok, eq, done } from "./_harness.mjs";
import { RUNGS, RUNG_TIER, createSceneView, probeDrawing, selectRung, tierOf } from "../src/scene-view.mjs";
import { WGSL, createWebGPUDevice } from "../src/gpu-webgpu.mjs";

const ALL = { webgpu: true, webgl2: true, canvas2d: true };

function fakeDocument({ canvas2d = true } = {}) {
  const make = () => ({
    className: "", tabIndex: 0, clientWidth: 100, clientHeight: 50, width: 100, height: 50,
    getContext: (kind) => (kind === "2d" && canvas2d ? {} : null),
    getAttribute: () => null, setAttribute() {}, replaceWith() {}, addEventListener() {},
  });
  return { createElement: make, make };
}
const device = (kind) => ({ kind, draw() {} });

test("prove-scene-view-tiers", async () => {
  // The ladder is ordered and each rung belongs to a protocol tier.
  eq(RUNGS, ["webgpu", "webgl2", "canvas2d", "text"], "one ordered ladder: webgpu > webgl2 > canvas2d > text");
  eq(RUNGS.map((rung) => RUNG_TIER[rung]), ["webgl", "webgl", "canvas2d", "text"], "WebGPU and WebGL2 are both the protocol's 3D tier");

  // Feature-detection fixtures.
  eq(selectRung(ALL), "webgpu", "everything declared: WebGPU");
  eq(selectRung({ webgl2: true, canvas2d: true }), "webgl2", "no WebGPU: WebGL2");
  eq(selectRung({ canvas2d: true }), "canvas2d", "no 3D: the 2D plan");
  eq(selectRung({}), "text", "nothing: text");
  eq(selectRung({ webgpu: true }), "webgpu", "WebGPU alone is enough for the 3D rung");
  eq(selectRung(), "text", "no declaration: text");
  // A request caps and never raises.
  eq(selectRung({ ...ALL, requested: "webgl2" }), "webgl2", "?tier=webgl2 caps below WebGPU");
  eq(selectRung({ ...ALL, requested: "webgl" }), "webgpu", "?tier=webgl is the 3D tier, its best rung");
  eq(selectRung({ ...ALL, requested: "canvas2d" }), "canvas2d", "?tier=canvas2d caps to the plan");
  eq(selectRung({ ...ALL, requested: "text" }), "text", "?tier=text caps to text");
  eq(selectRung({ canvas2d: true, requested: "webgpu" }), "canvas2d", "a request never raises past what is able");
  eq(selectRung({ ...ALL, requested: "nonsense" }), "webgpu", "an unknown request is no cap");
  // Failure of a rung falls to the next able one.
  eq(selectRung({ ...ALL, failed: ["webgpu"] }), "webgl2", "WebGPU failed: WebGL2");
  eq(selectRung({ ...ALL, failed: ["webgpu", "webgl2"] }), "canvas2d", "both 3D rungs failed: the plan");
  eq(selectRung({ ...ALL, failed: ["webgpu", "webgl2", "canvas2d"] }), "text", "all failed: text");
  eq(tierOf(ALL), "webgl", "tierOf names the protocol tier");
  eq(tierOf({ canvas2d: true }), "canvas2d", "tierOf: the plan");

  // The probe: WebGPU counts only with an adapter.
  const doc = fakeDocument();
  eq((await probeDrawing({ document: doc, gpu: undefined })).webgpu, false, "no navigator.gpu: no WebGPU");
  eq((await probeDrawing({ document: doc, gpu: { requestAdapter: async () => null } })).webgpu, false, "navigator.gpu with no adapter: no WebGPU");
  eq((await probeDrawing({ document: doc, gpu: { requestAdapter: async () => { throw new Error("denied"); } } })).webgpu, false, "an adapter request that throws: no WebGPU");
  eq((await probeDrawing({ document: doc, gpu: { requestAdapter: async () => ({}) } })).webgpu, true, "navigator.gpu with an adapter: WebGPU");

  // The WebGPU device refuses cleanly.
  const canvas = doc.make();
  eq(await createWebGPUDevice(canvas, { gpu: undefined }), null, "no gpu: null");
  eq(await createWebGPUDevice(canvas, { gpu: { requestAdapter: async () => null } }), null, "no adapter: null");
  let refused = null;
  await createWebGPUDevice(canvas, { gpu: { requestAdapter: async () => ({ requestDevice: async () => { throw new Error("no device"); } }) } }).catch((error) => (refused = error));
  ok(refused?.message === "no device", "a device that cannot be had rejects");
  const bad = {
    requestAdapter: async () => ({
      requestDevice: async () => ({
        limits: {}, pushErrorScope() {}, popErrorScope: async () => null, destroy() {},
        createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [{ type: "error", lineNum: 3, linePos: 1, message: "bad" }] }) }),
      }),
    }),
    getPreferredCanvasFormat: () => "bgra8unorm",
  };
  refused = null;
  await createWebGPUDevice(canvas, { gpu: bad }).catch((error) => (refused = error));
  ok(/gpu-webgpu: 3:1 bad/.test(refused?.message ?? ""), "a shader that will not compile rejects, naming the line");
  ok(/@vertex/.test(WGSL) && /@fragment/.test(WGSL) && /frag_depth/.test(WGSL), "the WGSL has both stages and the per-fragment depth");

  // The ladder falls on refusal.
  const views = async (makers, probe, requested = null) => createSceneView({ tier: tierOf({ ...probe, requested }), requested, canvas: doc.make(), probe, makers, document: doc });
  const warn = console.warn;
  console.warn = () => {};
  try {
    let view = await views({ webgpu: async () => device("webgpu"), webgl2: async () => device("webgl2") }, ALL);
    eq([view.tier, view.graphics], ["webgl", "webgpu"], "WebGPU is drawn with when it can be had");
    view = await views({ webgpu: async () => null, webgl2: async () => device("webgl2") }, ALL);
    eq([view.tier, view.graphics], ["webgl", "webgl2"], "no WebGPU device: WebGL2");
    view = await views({ webgpu: async () => { throw new Error("device lost at birth"); }, webgl2: async () => device("webgl2") }, ALL);
    eq([view.tier, view.graphics], ["webgl", "webgl2"], "a WebGPU device that throws: WebGL2");
    view = await views({ webgpu: async () => null, webgl2: async () => null }, ALL);
    eq([view.tier, view.graphics], ["canvas2d", "canvas2d"], "no 3D device at all: the plan");
    view = await createSceneView({ tier: "webgl", canvas: doc.make(), probe: ALL, makers: { webgpu: async () => null, webgl2: async () => null }, document: fakeDocument({ canvas2d: false }) });
    eq(view.tier, "text", "no 3D device and no 2D context: text");
    view = await views({ webgpu: async () => device("webgpu"), webgl2: async () => device("webgl2") }, ALL, "webgl2");
    eq(view.graphics, "webgl2", "a request for webgl2 is not raised to WebGPU");
    view = await views({ webgpu: async () => device("webgpu") }, { webgpu: true, canvas2d: true });
    eq(view.graphics, "webgpu", "WebGPU without WebGL2 still draws");
  } finally {
    console.warn = warn;
  }
  done("prove-scene-view-tiers");
});
