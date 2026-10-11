// prove-hostile-client — a hostile client sending malformed/out-of-order intents must be rejected
// WITHOUT corrupting the room: garbage JSON, wrong-typed fields, spoofed actorId/tick, replayed and
// out-of-order seq numbers, an oversized frame, a forged resume token, and a resume attempt against
// an actor whose grace window already expired. Every case ends with the room still fully
// replay-verifiable.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-hostile-client", async () => {
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

const validate = createDemoWorld().validate;
const room = createRoom({
  id: "prove-hostile",
  intervalMs: 20,
  ringBufferTicks: 20,
  resumeGraceTicks: 3, // small on purpose: exercises the aged-out fallback quickly
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
  const h = await connect(port);
  await wait(30);
  h.ws.send(JSON.stringify({ k: "join", name: "hostile" }));
  await wait(60);

  const afterJoin = room.log.length();
  eq(afterJoin, 1, "presence.join is the only record logged so far");

  h.ws.send("not json at all {{{");
  h.ws.send(JSON.stringify({})); // no k
  h.ws.send(JSON.stringify({ k: 42 })); // wrong type k
  h.ws.send(JSON.stringify({ k: "intent", seq: "not-a-number", kind: "move", args: { dx: 1, dy: 0 } }));
  h.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: "banana", dy: 0 } }));
  await wait(60);
  eq(room.log.length(), afterJoin, "every garbage/malformed frame above was rejected — log unchanged");

  // a well-formed intent carrying SPOOFED actorId/tick fields: those fields must be ignored, not
  // trusted, because the room binds actorId/tick itself — the intent is otherwise legitimate and
  // SHOULD be accepted (rejecting well-formed traffic outright would itself be a bug).
  h.ws.send(
    JSON.stringify({ k: "intent", seq: 1, kind: "move", actorId: "someone-else", tick: 999999, args: { dx: 1, dy: 0 } }),
  );
  await wait(60);
  eq(room.log.length(), afterJoin + 1, "the well-formed intent (with spoofed fields ignored) WAS accepted");
  const rec = room.log.all().find((r) => r.kind === "move" && r.seq === 1);
  eq(rec.actorId, h.hello.id, "the logged actorId is the SERVER-BOUND connection identity, not the spoofed body field");
  ok(rec.tick !== 999999, "the logged tick is the room's own assigned tick, not the spoofed body field");

  // replayed / out-of-order seq: rejected silently, no crash, no duplicate log entry.
  h.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: 1, dy: 0 } })); // same seq again
  h.ws.send(JSON.stringify({ k: "intent", seq: 0, kind: "move", args: { dx: 1, dy: 0 } })); // stale seq
  await wait(60);
  eq(room.log.length(), afterJoin + 1, "replayed/stale seq intents are rejected, no duplicate record");

  // an oversized frame: dropped, connection and room both survive, next valid intent still works.
  h.ws.send("x".repeat(20000));
  await wait(40);
  h.ws.send(JSON.stringify({ k: "intent", seq: 2, kind: "move", args: { dx: 0, dy: 1 } }));
  await wait(60);
  eq(room.log.length(), afterJoin + 2, "connection survives an oversized frame and still accepts the next valid intent");

  const verifyAfterBarrage = await room.verify();
  ok(verifyAfterBarrage.ok, "room remains replay-verifiable after the full hostile-client barrage");

  // forged resume token: rejected outright, no rebind.
  const forged = await connect(port);
  await wait(20);
  forged.ws.send(JSON.stringify({ k: "resume", token: "garbage.notarealtoken", sinceTick: 0 }));
  await wait(40);
  const failMsg = forged.msgs.find((m) => m.k === "resume-failed");
  ok(failMsg && failMsg.reason === "bad-token", "a forged/garbage resume token is rejected, not accepted");

  // aged-out resume (grace window already expired): the honest §4 edge — resume-failed, not a crash.
  const token = h.hello.world.resumeToken;
  h.ws.close();
  await wait(20 * 6); // well past resumeGraceTicks(3) * intervalMs(20) = 60ms
  const h2 = await connect(port);
  await wait(20);
  h2.ws.send(JSON.stringify({ k: "resume", token, sinceTick: 0 }));
  await wait(60);
  const resumeAttempt = h2.msgs.find((m) => m.k === "resumed" || m.k === "resume-failed");
  eq(resumeAttempt.k, "resume-failed", "resuming an actor past its grace window fails cleanly");
  eq(resumeAttempt.reason, "unknown-actor", "the failure reason is the honest one: the actor already left");

  const verifyFinal = await room.verify();
  ok(verifyFinal.ok, "room remains replay-verifiable after grace expiry and a rejected stale-resume attempt");

  forged.ws.close();
  h2.ws.close();
  await wait(30);
} finally {
  room.destroy();
  await new Promise((res) => httpServer.close(res));
}

done("prove-hostile-client");
});
