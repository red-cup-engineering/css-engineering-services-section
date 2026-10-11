// prove-room-auth — the `authenticate` seam (Wave1 §2): a token-verify callback at join time that
// binds a client's actorId to whatever identity the callback resolves, instead of the random
// provisional id `hello` handed it. Real websockets, real Room, matching prove-room.mjs's own style
// (not a mock transport) — this is exactly where a production auth mismatch would actually surface.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-room-auth", async () => {
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

const validate = createDemoWorld().validate;
const accounts = new Map([
  ["good-token", "account-alice"],
  ["other-token", "account-bob"],
]);
const room = createRoom({
  id: "prove-room-auth",
  intervalMs: 25,
  world: createDemoWorld,
  validate,
  interest: () => true,
  // the seam itself: (rawJoinMessage, conn) -> Promise<accountId|null>. Mechanism only — this test's
  // "account database" is a two-entry Map, standing in for whatever real identity system a game wires
  // in; qwzspace never sees or interprets the token itself, only the resolved id.
  authenticate: async (raw) => accounts.get(raw.token) ?? null,
});

const httpServer = http.createServer();
room.attach(httpServer);
await room.ready;
await new Promise((res) => httpServer.listen(0, "127.0.0.1", res));
await wait(100);
const port = httpServer.address().port;
room.start();

try {
  const c1 = await connectClient(port);
  await wait(40);
  ok(c1.hello && c1.hello.k === "hello", "a connection still receives hello before any auth happens");
  const provisionalId = c1.hello.id;

  c1.ws.send(JSON.stringify({ k: "join", name: "alice", token: "good-token" }));
  await wait(60);

  const authedMsg = c1.msgs.find((m) => m.k === "authenticated");
  ok(authedMsg, "a resolved authenticate() sends an `authenticated` message rebinding the actorId");
  eq(authedMsg.actorId, "account-alice", "the rebound actorId is exactly what authenticate() resolved");
  ok(typeof authedMsg.resumeToken === "string", "a fresh resume token, scoped to the new identity, is issued");

  const snap1 = c1.msgs.find((m) => m.k === "snapshot");
  ok(snap1, "join still completes normally after authentication (a snapshot arrives)");
  eq(snap1.you, "account-alice", "the snapshot's `you` field is the AUTHENTICATED id, not the provisional one");

  const members = room.members();
  ok(members.has("account-alice"), "the room's member table uses the authenticated id");
  ok(!members.has(provisionalId), "the abandoned provisional id never became a member");

  // === a rejected token: join-failed, no member added, no presence.join emitted ===
  const c2 = await connectClient(port);
  c2.ws.send(JSON.stringify({ k: "join", name: "mallory", token: "bad-token" }));
  await wait(60);
  ok(
    c2.msgs.some((m) => m.k === "join-failed" && m.reason === "auth-rejected"),
    "an unresolved authenticate() sends join-failed and never lets the connection become a member",
  );
  ok(!c2.msgs.some((m) => m.k === "snapshot"), "a rejected join never receives a snapshot");
  eq(room.members().size, 1, "the room's member count is unaffected by the rejected join attempt");

  // === reconnect-without-a-resume-token, reclaimed by auth instead: the SAME account rejoining (e.g.
  // a browser refresh that lost its resume token) rebinds to its EXISTING member slot rather than
  // spawning a duplicate presence.join — the same "never actually left" discipline §4 gives resume,
  // extended to auth-reclaimed identity. ===
  c1.ws.close();
  await wait(40);
  const c1b = await connectClient(port);
  c1b.ws.send(JSON.stringify({ k: "join", name: "alice-again", token: "good-token" }));
  await wait(60);
  eq(room.members().size, 1, "an authenticated rejoin reclaims the SAME account slot, not a second one");
  const rejoinSnap = c1b.msgs.find((m) => m.k === "snapshot");
  ok(rejoinSnap, "the reclaimed connection still gets an opening snapshot");
  eq(rejoinSnap.you, "account-alice", "the reclaimed connection's `you` is the same persistent account id");

  c1b.ws.close();
  c2.ws.close();
  await wait(30);
} finally {
  room.destroy();
  await new Promise((res) => httpServer.close(res));
}

done("prove-room-auth");
});
