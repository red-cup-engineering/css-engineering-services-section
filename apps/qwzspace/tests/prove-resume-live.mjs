// prove-resume-live — the task's explicit resume proof, over real websockets: kill one client
// mid-session, reconnect, prove resume-by-delta, then re-verify the room's full history hashes clean.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-resume-live", async () => {
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
  id: "prove-resume",
  intervalMs: 25,
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
await wait(100); // this sandbox's listen->connect race — see prove-client-node.mjs's header
const port = httpServer.address().port;
room.start();

try {
  const c1 = await connect(port);
  await wait(30);
  const token = c1.hello.world.resumeToken;
  c1.ws.send(JSON.stringify({ k: "join", name: "resumer" }));
  await wait(70);

  c1.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: 1, dy: 0 } }));
  await wait(60);
  c1.ws.send(JSON.stringify({ k: "intent", seq: 2, kind: "move", args: { dx: 0, dy: 1 } }));
  await wait(60);

  const lastDeltaBeforeDrop = [...c1.msgs].reverse().find((m) => m.k === "delta");
  const sinceTick = lastDeltaBeforeDrop.tick;
  const messagesBeforeDrop = c1.msgs.length;

  // KILL the connection mid-session (simulating a dropped WiFi connection, not a graceful close).
  c1.ws.close();
  await wait(30);

  // a second, unrelated client keeps the world moving while the first is disconnected, so there is
  // real delta history to have missed.
  const other = await connect(port);
  await wait(20);
  other.ws.send(JSON.stringify({ k: "join", name: "other" }));
  await wait(50);
  other.ws.send(JSON.stringify({ k: "intent", seq: 1, kind: "move", args: { dx: 1, dy: 1 } }));
  await wait(80);

  // RECONNECT and RESUME under the SAME actor identity.
  const c2 = await connect(port);
  await wait(20);
  c2.ws.send(JSON.stringify({ k: "resume", token, sinceTick }));
  await wait(120);

  const resumedMsg = c2.msgs.find((m) => m.k === "resumed");
  ok(resumedMsg, "the resumed connection received a resumed acknowledgment");
  eq(resumedMsg.mode, "delta", "resume-by-delta succeeded (still within the ring buffer window)");
  ok(resumedMsg.count > 0, "at least one buffered delta was actually replayed to the resuming client");

  // RESUME-BY-DELTA PROVEN, CONCRETELY: reconstruct c2's view of its OWN entity purely from the
  // replayed delta frames + its original snapshot, and confirm it matches the room's authoritative
  // position for that actor (which by now reflects the two pre-drop moves, unaffected by anything
  // that happened while disconnected, since the resumer sent no more input meanwhile).
  const actorId = c1.hello.id;
  let reconstructedX = null;
  let reconstructedY = null;
  for (const m of c2.msgs) {
    if (m.k === "snapshot") {
      const e = m.e.find((entry) => entry.id === actorId);
      if (e) {
        reconstructedX = e.x;
        reconstructedY = e.y;
      }
    } else if (m.k === "delta") {
      const e = m.c.find((entry) => entry.id === actorId);
      if (e) {
        reconstructedX = e.x;
        reconstructedY = e.y;
      }
    }
  }
  const roomFrame = await room.snapshot.full(room.tickNow());
  const authoritative = roomFrame.entities.find((e) => e.id === actorId);
  eq(reconstructedX, authoritative.x, "resumed client's reconstructed x matches the room's authoritative x");
  eq(reconstructedY, authoritative.y, "resumed client's reconstructed y matches the room's authoritative y");
  eq(reconstructedX, 1, "the resumer's x reflects its two pre-drop moves (dx:1, dy:0 then dx:0, dy:1)");
  eq(reconstructedY, 1, "the resumer's y reflects its two pre-drop moves");

  // the resumed actor is still fully live under the same identity: it can act again.
  c2.ws.send(JSON.stringify({ k: "intent", seq: 3, kind: "move", args: { dx: 1, dy: 0 } }));
  await wait(80);
  const members = room.members();
  eq(members.size, 2, "no duplicate/orphaned actor after resume — still exactly resumer + other");
  ok(members.has(actorId), "the resumed actor keeps its ORIGINAL actorId, not a new one");

  ok(c2.msgs.length > 0 && messagesBeforeDrop > 0, "sanity: both connections actually exchanged messages");

  // DOUBLE RESUME: the token room.mjs's handleResume re-issues (scoped to the RECLAIMED identity,
  // not the abandoned provisional one from the original hello) must itself be usable for a SECOND
  // drop+resume — proving the resume mechanism survives more than one reconnect, not just the first.
  const secondToken = resumedMsg.resumeToken;
  ok(typeof secondToken === "string" && secondToken !== token, "resume re-issues a DIFFERENT token, scoped to the reclaimed identity");
  const sinceTick2 = room.tickNow();
  c2.ws.close();
  await wait(30);
  const c3 = await connect(port);
  await wait(20);
  c3.ws.send(JSON.stringify({ k: "resume", token: secondToken, sinceTick: sinceTick2 }));
  await wait(100);
  const resumedMsg2 = c3.msgs.find((m) => m.k === "resumed");
  ok(resumedMsg2, "a SECOND resume, using the re-issued token, also succeeds");
  eq(resumedMsg2.mode, "delta", "the second resume also lands in delta mode within the ring buffer window");
  eq(room.members().size, 2, "still exactly two actors after a second resume — no orphaned/duplicate identity");
  ok(room.members().has(actorId), "the twice-resumed actor still carries its ORIGINAL actorId");
  c3.ws.close();
  await wait(20);

  // §6, post-session: the room's ENTIRE history — spanning the disconnect and resume — must still be
  // replay-verifiable, byte-identical, from nothing but the seed and the log.
  const verify = await room.verify();
  ok(verify.ok, "room history re-verifies to an identical hash after a full disconnect+resume session");
  eq(verify.replayedLogHash, room.log.hash(), "the log's own hash matches its replay-derived hash");

  other.ws.close();
  await wait(30);
} finally {
  room.destroy();
  await new Promise((res) => httpServer.close(res));
}

done("prove-resume-live");
});
