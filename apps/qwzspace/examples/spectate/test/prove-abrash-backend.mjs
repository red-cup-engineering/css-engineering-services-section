// prove-abrash-backend — the real abrash spatial backend's own conformance + determinism proofs.
// Everything qwzspace-shaped here is imported from the INSTALLED `@red-cup-engineering/qwzspace`
// package (this example's own package.json depends on it via Verdaccio — see the repo root README),
// never from a relative `../../../src/` path — so a green run of this file is itself part of this
// example's fresh-install proof, exercised specifically through the abrash seam.
//
// Three things this file proves, matching the task's own framing:
//
//   1. BACKEND CONTRACT CONFORMANCE, for BOTH backends (render-2d AND the real abrash backend),
//      against the SAME projected SceneDescription — using the identical assertBackendConformance()
//      checker qwzspace ships (@red-cup-engineering/qwzspace/spatial-backend), never re-implemented
//      here. render-2d's own conformance is already proven in qwzspace's own test suite
//      (tests/prove-spatial-backend-contract.mjs); it is re-run here, right next to abrash's, so a
//      reader sees both backends pass the SAME check side by side, from the same scene.
//
//   2. FRAME DETERMINISM: the same projected SceneDescription + the same camera pose renders to a
//      BYTE-IDENTICAL framebuffer, through the REAL raycaster, twice, independently — plus a sanity
//      check that a different camera pose does NOT match (so the determinism proof isn't vacuous).
//
//   3. LIVE-VS-REPLAY FRAME IDENTITY THROUGH THE ABRASH PATH — the 602/602-style proof
//      (examples/head-to-head/README.md's own render-frame comparison), now run through a real
//      raycast rather than only project()'s scene-level output: a room driven by hand (deterministic,
//      no timers, no sockets), the SAME log replayed independently from a FRESH domain instance, both
//      sides fed through the SAME shared/create-abrash-backend.mjs `render()` call, framebuffers
//      compared BYTE FOR BYTE at every tick.

import { test } from "node:test";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "@red-cup-engineering/feltos/operations";
import { replay } from "@red-cup-engineering/computer-content-graph-engineering-services-section/operations-graph";
import { project } from "@red-cup-engineering/html-structural-projection-service";
import { createBackend as create2DBackend } from "@red-cup-engineering/qwzspace/render-2d";
import { assertBackendConformance, capabilitiesOf } from "@red-cup-engineering/qwzspace/spatial-backend";
import { createDemoWorld } from "@red-cup-engineering/qwzspace/demo-world";
import { renderAbrashFrame } from "../shared/spectate-render.mjs";
import { createBackend as createAbrashBackend } from "../shared/create-abrash-backend.mjs";

test("prove-abrash-backend", async () => {
  // a small, fixed byte-hex helper — the whole file compares framebuffers as hex strings, so a
  // mismatch prints as a readable diff rather than two enormous typed-array dumps.
  const hex = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString("hex");

  // === 1. backend contract conformance, BOTH backends, the SAME scene ============================
  const scene = project(
    {
      entities: [
        { id: "a1", kind: "bot", x: 12, y: -30, name: "alpha" },
        { id: "a2", kind: "bot", x: -50, y: 80, name: "beta" },
        { id: "a3", kind: "bot", x: 190, y: 190, name: "gamma" },
      ],
    },
    42,
  );

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
    return { getContext: () => ctx };
  }

  const backend2D = create2DBackend({ mount: makeMockCanvas() });
  const report2D = assertBackendConformance(backend2D, scene, scene.tick);
  ok(report2D.ok, "render-2d conforms to the spatial-backend contract");
  eq(report2D.capabilities, { camera: false, followEntity: false, dims: 2 }, "render-2d honestly self-describes as no-camera, 2D");

  const abrashMount = {};
  const backendAbrash = createAbrashBackend({ mount: abrashMount, width: 160, height: 100, maxDist: 40 });
  const reportAbrash = assertBackendConformance(backendAbrash, scene, scene.tick);
  ok(reportAbrash.ok, "the REAL abrash backend conforms to the IDENTICAL spatial-backend contract");
  eq(reportAbrash.capabilities, { camera: true, followEntity: true, dims: 3 }, "the abrash backend self-describes as camera-capable, 3D");
  ok(
    abrashMount.frame && abrashMount.frame.fb && abrashMount.frame.fb.data instanceof Uint8ClampedArray,
    "conformance actually drove a real raycast — a framebuffer landed on the mount, not a stub",
  );
  eq(
    capabilitiesOf(backendAbrash),
    { camera: true, followEntity: true, dims: 3 },
    "capabilitiesOf() called standalone agrees with the conformance report",
  );

  // === 2. frame determinism: same scene + same camera -> byte-identical framebuffer ===============
  const fixedCam = { x: 22, z: 22, angle: 0.7 };
  const optsA = { tick: 100, camera: fixedCam, width: 160, height: 100, maxDist: 40 };
  const frameA = renderAbrashFrame(scene, optsA);
  const frameB = renderAbrashFrame(scene, { ...optsA });
  ok(frameA.fb.data.length > 0, "sanity: the framebuffer actually has pixels");
  eq(
    hex(frameA.fb.data),
    hex(frameB.fb.data),
    "the SAME projected SceneDescription + the SAME camera render to a BYTE-IDENTICAL framebuffer, independently, twice",
  );

  const frameC = renderAbrashFrame(scene, { ...optsA, camera: { x: 5, z: 5, angle: 2.4 } });
  ok(
    hex(frameA.fb.data) !== hex(frameC.fb.data),
    "sanity: a DIFFERENT camera pose renders a DIFFERENT framebuffer — the determinism proof above is real, not a no-op stub",
  );

  // === 3. live-vs-replay frame identity THROUGH the abrash path (602/602-style, in 3D) ============
  const validate = createDemoWorld().validate;
  const room = createRoom({ id: "prove-abrash-render", world: createDemoWorld, validate, interest: () => true });

  // NOTE, the one subtlety this file exists to get right: snapshot-manager.mjs's `full(tick)` is not
  // a time-travel query — it hands back whatever the cache CURRENTLY holds, labeled with whatever
  // `tick` argument was passed (see its own header: "the whole cache as a fresh full frame, no disk
  // reads"). So the live side must capture `room.snapshot.full(tick)` RIGHT AFTER each `stepOnce()`,
  // in the same loop that advances ticks — exactly as a live spectator would see it in real time —
  // never in a separate pass after the room has already moved on to a later tick.
  const liveMount = {};
  const liveBackend = createAbrashBackend({ mount: liveMount, width: 160, height: 100, maxDist: 40 });
  const liveFrames = new Map(); // tick -> hex framebuffer
  function captureLive() {
    const t = room.tickNow();
    const full = room.snapshot.full(t);
    const s = project(full, t);
    liveBackend.render(s, s.tick);
    liveFrames.set(t, hex(liveMount.frame.fb.data));
  }

  room.queue.push({ actorId: "p1", seq: 0, kind: "presence.join", args: { name: "alpha" } });
  room.queue.push({ actorId: "p2", seq: 0, kind: "presence.join", args: { name: "beta" } });
  await room.stepOnce();
  captureLive();
  for (let i = 0; i < 24; i++) {
    room.queue.push({ actorId: "p1", seq: i + 1, kind: "move", args: { dx: Math.sin(i * 0.7), dy: Math.cos(i * 0.5) } });
    if (i % 3 === 0) room.queue.push({ actorId: "p2", seq: Math.floor(i / 3) + 1, kind: "move", args: { dx: -0.4, dy: 0.6 } });
    await room.stepOnce();
    captureLive();
  }
  await room.stepOnce(); // one empty tick — same discipline prove-unification.mjs applies
  captureLive();
  const T = room.tickNow();

  const fresh = createDemoWorld();
  const replayMount = {};
  const replayBackend = createAbrashBackend({ mount: replayMount, width: 160, height: 100, maxDist: 40 });
  const replayFrames = new Map();
  await replay(room.log.all(), {
    subjectsOf: fresh.subjectsOf,
    snapOf: fresh.snapOf,
    runTick: fresh.runTick,
    totalTicks: T,
    onTick(tick, fullFrame) {
      const s = project(fullFrame, tick);
      replayBackend.render(s, s.tick); // the ONE call site, reused for both live and replay — see
      // shared/spectate-render.mjs's header
      replayFrames.set(tick, hex(replayMount.frame.fb.data));
    },
  });

  let framesCompared = 0;
  let framesIdentical = 0;
  let firstMismatch = null;
  for (const [tick, liveHex] of liveFrames) {
    const replayHex = replayFrames.get(tick);
    if (replayHex === undefined) continue;
    framesCompared++;
    if (liveHex === replayHex) framesIdentical++;
    else if (!firstMismatch) firstMismatch = tick;
  }
  ok(framesCompared === T, `sanity: every one of the ${T} ticks was actually compared (${framesCompared}/${T})`);
  ok(firstMismatch === null, `first mismatch at tick ${firstMismatch}`);
  eq(
    framesIdentical,
    framesCompared,
    `live-vs-replay abrash framebuffers are byte-identical at every compared tick — ${framesIdentical}/${framesCompared} (the 602/602 proof, in 3D)`,
  );

  const verify = await room.verify();
  ok(verify.ok, "room.verify()'s own §6 hash proof agrees independently");

  room.destroy();
  done("prove-abrash-backend");
});
