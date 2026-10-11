// prove-resume-seam — the "resume seam" regression: an entity that changes ONLY during the window
// between a subscriber dropping off (hub.remove()'s sub.drop(), in wireConnection's onClose) and its
// resumed connection's subscriber being reprimed (handleResume's `sub.full(tick)`) is, by construction,
// invisible to the ring buffer's per-actor `since()` catch-up — nobody is bound to that actorId to
// record it. Before the fix this file proves, handleResume's reprime frame was UNCONDITIONALLY
// discarded ("the client is already caught up from the replayed deltas above" — false whenever the
// gap is nonempty), so any entity whose ENTIRE existence or only change fell inside that gap was never
// delivered to the resumed client at all, not merely delayed. See room.mjs's handleResume for the fix
// (send the reprime frame as a real snapshot whenever `tick > lastBufferedTick`) and
// examples/spectate/README.md's "resume seam" section for how this was originally surfaced — a
// live-vs-replay frame-identity mismatch clustered right after a forced resume, that turned out to be
// a genuine server-side gap in resume delivery, not a client InterpolationBuffer bug (see
// examples/spectate/test/prove-interpolation-buffer-seam.mjs for the isolation that ruled the buffer
// out).
//
// Deterministic and real-socket: the room's own tick cadence is controlled by intervalMs + explicit
// waits, no timing race relied on to LAND the actor's own connect/join inside the gap (only "other"'s
// join+move, which this test drives directly after c1 disconnects and before c1 resumes).

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

function connect(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    const msgs = [];
    let helloMsg = null;
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      msgs.push(m);
      if (m.k === "hello" && !helloMsg) helloMsg = m;
    });
    ws.addEventListener("open", () =>
      resolve({
        ws,
        msgs,
        get hello() {
          return helloMsg;
        },
      }),
    );
    ws.addEventListener("error", reject);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// reconstruct — replay a client's own received {snapshot,delta} messages into a plain id->{x,y} map,
// exactly what a real WorldView folds them into (client.mjs's ingestEntity), but without pulling in
// the client SDK — this file only needs the position fold, not the full event surface.
function reconstruct(msgs) {
  const world = new Map();
  for (const m of msgs) {
    if (m.k === "snapshot") {
      world.clear();
      for (const e of m.e) world.set(e.id, { x: e.x, y: e.y });
    } else if (m.k === "delta") {
      for (const e of m.c) world.set(e.id, { x: e.x, y: e.y });
      for (const id of m.g ?? []) world.delete(id);
    }
  }
  return world;
}

test("prove-resume-seam", async () => {
  const validate = createDemoWorld().validate;
  // intervalMs is deliberately SLOW relative to this test's own reaction time (a plain synchronous
  // send right after `connect()` resolves): the gap this test targets is the window between a new
  // connection's subscriber being bound (create-server.mjs's hub.bind, at connect) and its `resume`
  // message being processed (room.mjs's handleResume) — a window this test wants to WIN (close before
  // any ordinary tick fires inside it), not lose to a lucky intervening tick that would (correctly,
  // but coincidentally) paper over the gap via its own "fresh subscriber, empty diff cursor" full-ish
  // delta.
  const room = createRoom({
    id: "prove-resume-seam",
    intervalMs: 400,
    ringBufferTicks: 200,
    resumeGraceTicks: 200,
    world: createDemoWorld,
    validate,
    interest: () => true,
  });

  const httpServer = http.createServer();
  room.attach(httpServer);
  await room.ready;
  await new Promise((res) => httpServer.listen(0, "127.0.0.1", res));
  await wait(100);
  const port = httpServer.address().port;
  room.start();

  try {
    const c1 = await connect(port);
    await wait(30);
    const token = c1.hello.world.resumeToken;
    c1.ws.send(JSON.stringify({ k: "join", name: "resumer" }));
    await wait(450); // >= one 400ms tick — the join must actually land before c1 drops

    const lastDeltaBeforeDrop = [...c1.msgs].reverse().find((m) => m.k === "delta" || m.k === "snapshot");
    const sinceTick = lastDeltaBeforeDrop ? lastDeltaBeforeDrop.tick : room.tickNow();

    // KILL c1's connection — its subscriber is dropped (hub.remove -> sub.drop()) the instant this
    // resolves, per broadcast-hub.mjs's own remove(). From this point until c1 resumes, NOTHING is
    // bound to c1's actorId in hub.each(), so ring.push(c1ActorId, ...) does not happen — this IS the
    // gap.
    c1.ws.close();
    await wait(30);

    // A brand-new actor joins and moves ENTIRELY inside the gap — c1's ring buffer has, and can have,
    // no record of it (it didn't exist yet when c1's old subscriber was last bound).
    const other = await connect(port);
    await wait(20);
    other.ws.send(JSON.stringify({ k: "join", name: "other" }));
    await wait(450); // one full tick — the join lands
    other.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: 1, dy: 1 } }));
    await wait(450); // one more full tick — the move lands, gap-only, well before c1 ever resumes

    const otherActorId = other.hello.id;

    // RECONNECT and RESUME c1 under its original identity. The resume is sent the INSTANT `connect()`
    // resolves (no wait) — deliberately racing to beat the room's own 400ms tick cadence, so no
    // ordinary tick's own "fresh subscriber, empty diff cursor" delta can land in between and
    // (coincidentally, and not through the mechanism this test targets) paper over the gap.
    const c2 = await connect(port);
    c2.ws.send(JSON.stringify({ k: "resume", token, sinceTick }));
    await wait(900); // >= two ticks — resume processes, then a further ordinary tick or two settle

    const resumedMsg = c2.msgs.find((m) => m.k === "resumed");
    ok(resumedMsg, "the resumed connection received a resumed acknowledgment");
    eq(resumedMsg.mode, "delta", "resume-by-delta succeeded (still within the ring buffer window)");

    const authoritative = (await room.snapshot.full(room.tickNow())).entities.find((e) => e.id === otherActorId);
    ok(authoritative, "sanity: the room's own authoritative state actually has the gap-only actor");
    eq(authoritative.x, 1, "sanity: the gap-only actor's move was actually applied (x)");
    eq(authoritative.y, 1, "sanity: the gap-only actor's move was actually applied (y)");

    // THE ACTUAL PROOF: the resumed client's own reconstructed world — built from nothing but the
    // snapshot/delta messages it was actually SENT — must include the gap-only actor, at its true
    // authoritative position. Before the fix this fails: `world.has(otherActorId)` is false (the
    // reprime frame carrying it was computed and then thrown away).
    const reconstructed = reconstruct(c2.msgs);
    ok(reconstructed.has(otherActorId), "the resumed client was told about an actor that joined+moved ENTIRELY inside the resume gap");
    const reconstructedOther = reconstructed.get(otherActorId);
    if (reconstructedOther) {
      eq(reconstructedOther.x, authoritative.x, "the resumed client's view of the gap-only actor's x matches authoritative state");
      eq(reconstructedOther.y, authoritative.y, "the resumed client's view of the gap-only actor's y matches authoritative state");
    }

    c2.ws.close();
    other.ws.close();
    await wait(30);

    const verify = await room.verify();
    ok(verify.ok, "room history re-verifies to an identical hash after the gap-spanning resume");
  } finally {
    room.destroy();
    await new Promise((res) => httpServer.close(res));
  }

  done("prove-resume-seam");
});
