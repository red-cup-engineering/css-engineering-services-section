// prove-unification — §9's proof-of-concept, stated exactly as the spec frames it: a single
// `project(roomState, tick)` call, given EITHER (a) a live room's snapshot-manager cache, OR (b) a
// `replay(seed, log)` run stopped at the same tick, must produce byte-identical SceneDescription
// output — and the SAME backend must render both without knowing which one it was given. Falls out of
// §5 (live cache and replayed derivation are hash-identical at any checkpoint) and §8 (project() only
// consumes the cache shape, never anything live-connection-specific) rather than being new machinery —
// this file is the integration test proving that composition actually holds, not a new subsystem.

import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { replay } from "../src/replay.mjs";
import { project, sceneEquals } from "../src/project.mjs";
import { createBackend } from "../src/render-2d.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-unification", async () => {
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

// drive a live room by hand (deterministic, no timers/sockets needed — this proof is about the
// projection path, not the transport) through a real multi-actor session.
const validate = createDemoWorld().validate;
const room = createRoom({
  id: "unify",
  world: createDemoWorld,
  validate,
  interest: () => true,
});

room.queue.push({ actorId: "a1", seq: 0, kind: "presence.join", args: { name: "alpha" } });
room.queue.push({ actorId: "a2", seq: 0, kind: "presence.join", args: { name: "beta" } });
await room.stepOnce();
room.queue.push({ actorId: "a1", seq: 1, kind: "move", args: { dx: 1, dy: 0 } });
await room.stepOnce();
room.queue.push({ actorId: "a2", seq: 1, kind: "move", args: { dx: 0, dy: 1 } });
await room.stepOnce();
room.queue.push({ actorId: "a1", seq: 2, kind: "move", args: { dx: 1, dy: 1 } });
await room.stepOnce();
await room.stepOnce(); // one empty tick — proves replay's empty-tick handling (replay.mjs) matters here too

const T = room.tickNow();

// (a) LIVE: the room's own snapshot-manager cache.
const liveFrame = room.snapshot.full(T);

// (b) REPLAY: an INDEPENDENT domain instance, driven purely by the room's log — no live room involved.
const fresh = createDemoWorld();
const replayed = await replay(room.log.all(), {
  subjectsOf: fresh.subjectsOf,
  snapOf: fresh.snapOf,
  runTick: fresh.runTick,
  totalTicks: T,
});
const replayedFrame = replayed.full();

// THE HEADLINE ASSERTION: one project() call, two independently-derived sources, byte-identical output.
const liveScene = project(liveFrame, T);
const replayedScene = project(replayedFrame, T);
ok(sceneEquals(liveScene, replayedScene), "project(live cache) and project(replay(seed,log)) are byte-identical at the same tick");
eq(liveScene.entries.length, 2, "sanity: both actors are present in the projected scene");

// THE SAME BACKEND renders both without knowing which source produced its input.
const mountLive = makeMockCanvas();
const mountReplay = makeMockCanvas();
createBackend({ mount: mountLive }).render(liveScene);
createBackend({ mount: mountReplay }).render(replayedScene);
eq(
  JSON.stringify(mountLive.calls),
  JSON.stringify(mountReplay.calls),
  "the SAME render-2d backend produces byte-identical draw calls for the live and replayed scenes — spectating = replay = free",
);

// and the room's own §6 contract agrees independently (a different check, over the log's hash rather
// than the projected scene — both should hold together, not just one or the other).
const verify = await room.verify();
ok(verify.ok, "room.verify()'s own state-hash comparison agrees with the scene-level unification proof above");

room.destroy();

done("prove-unification");
});
