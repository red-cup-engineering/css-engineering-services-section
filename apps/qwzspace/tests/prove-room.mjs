// prove-room — two simulated clients through a real Room over REAL websockets on localhost: join,
// intents, state convergence, plus §6's replay-verifiable contract (room.verify()) after the session.
// Not a mock transport: a real node:http server, real WebSocket upgrades (http-ws-server.mjs), real
// frames — the same path a browser client would take.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-room", async () => {
function connectClient(port) {
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

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

const validate = createDemoWorld().validate; // pure/stateless shape check, safe to share
const room = createRoom({
  id: "prove-room",
  intervalMs: 25,
  world: createDemoWorld,
  validate,
  interest: () => true,
});

const httpServer = http.createServer();
room.attach(httpServer);
await room.ready;
await new Promise((res) => httpServer.listen(0, "127.0.0.1", res));
await wait(100); // this sandbox's listen->connect race — see prove-client-node.mjs's header
const port = httpServer.address().port;
room.start();

try {
  const c1 = await connectClient(port);
  const c2 = await connectClient(port);
  await wait(40);

  ok(c1.hello && c1.hello.k === "hello", "client 1 received hello on connect");
  ok(c2.hello && c2.hello.k === "hello", "client 2 received hello on connect");
  ok(c1.hello.id !== c2.hello.id, "each connection is bound to a distinct server-assigned actorId");

  c1.ws.send(JSON.stringify({ k: "join", name: "alice" }));
  c2.ws.send(JSON.stringify({ k: "join", name: "bob" }));
  await wait(80);

  ok(c1.msgs.some((m) => m.k === "snapshot"), "client 1 received an opening snapshot on join");
  ok(c2.msgs.some((m) => m.k === "snapshot"), "client 2 received an opening snapshot on join");

  c1.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: 1, dy: 0 } }));
  c2.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: -1, dy: 0 } }));
  await wait(120);

  const c1Deltas = c1.msgs.filter((m) => m.k === "delta");
  const c2Deltas = c2.msgs.filter((m) => m.k === "delta");
  ok(c1Deltas.length > 0, "client 1 received at least one delta");
  ok(c2Deltas.length > 0, "client 2 received at least one delta");

  // STATE CONVERGENCE: fold every entity update either client saw for the OTHER actor and confirm it
  // matches what the room itself thinks that actor's position is (both clients' views agree with the
  // authoritative cache, i.e. they converged on the same world). Note: c1's join-triggered snapshot is
  // sent SYNCHRONOUSLY when the "join" wire message arrives, which can be before either presence.join
  // intent has actually been folded by a tick — so bob's id must be found across ALL of c1's frames
  // received so far (snapshot + every delta), not just that first opening snapshot.
  function allSeenIds(msgs) {
    const ids = new Set();
    for (const m of msgs) {
      const pool = m.k === "snapshot" ? m.e : m.k === "delta" ? m.c : [];
      for (const e of pool) ids.add(e.id);
    }
    return ids;
  }
  const bobIdFromC1 = [...allSeenIds(c1.msgs)].find((id) => id !== c1.hello.id);
  function latestSeen(msgs, entityId) {
    let latest = null;
    for (const m of msgs) {
      const pool = m.k === "snapshot" ? m.e : m.k === "delta" ? m.c : [];
      const hit = pool.find((e) => e.id === entityId);
      if (hit) latest = hit;
    }
    return latest;
  }
  const bobViaC1 = latestSeen(c1.msgs, bobIdFromC1);
  ok(bobViaC1, "client 1 eventually saw an update for client 2's entity");
  eq(bobViaC1.x, -1, "client 1's view of client 2's entity converged to the true post-move x");

  const roomEntities = [...(await room.snapshot.full(room.tickNow())).entities];
  const bobAuthoritative = roomEntities.find((e) => e.id === bobIdFromC1);
  eq(bobViaC1.x, bobAuthoritative.x, "client 1's view matches the room's own authoritative cache (convergence)");

  const members = room.members();
  eq(members.size, 2, "the room's own member table shows exactly the two joined actors");

  const verify = await room.verify();
  ok(verify.ok, "room history remains replay-verifiable after a real two-client session");
  eq(verify.logHash, room.log.hash(), "verify()'s reported logHash matches the log's own hash()");

  c1.ws.close();
  c2.ws.close();
  await wait(30);
} finally {
  room.destroy();
  await new Promise((res) => httpServer.close(res));
}

done("prove-room");
});
