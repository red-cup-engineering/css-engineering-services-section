// prove-lobby — matchmaking/discovery (Wave1 §1): createLobbyRegistry's name/capacity bookkeeping
// over room-registry.mjs, and createLobbyWorld serving that registry AS a room, so listing is an
// ordinary interest-filtered read and room.create/room.destroy are ordinary intents. Capacity is
// checked against a REAL joined client (room.members() is populated by the wire join flow, not by a
// bare queue.push of a domain-level presence.join intent — found the hard way rehearsing this file;
// see room.mjs's finishJoin), matching prove-room.mjs's own "not a mock transport" discipline.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createLobbyRegistry, createLobbyWorld, lobbyValidate } from "../src/lobby.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-lobby", async () => {
async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

const validate = createDemoWorld().validate;
const lobby = createLobbyRegistry({
  factory: (id) => ({ world: createDemoWorld, validate, interest: () => true, intervalMs: 20 }),
  defaultCapacity: 4,
});

eq(lobby.list().length, 0, "a fresh lobby lists no rooms");

const arena = lobby.create("Arena One", undefined, { capacity: 2 });
ok(lobby.has(arena.id), "created room is tracked by the underlying registry");
eq(lobby.findByName("Arena One"), arena.id, "findByName resolves the room's own id");
eq(lobby.entry(arena.id).joinable, true, "an empty room under capacity is joinable");
eq(lobby.entry(arena.id).capacity, 2, "entry() reports the capacity given at create()");

let threwDuplicate = false;
try {
  lobby.create("Arena One", undefined, {});
} catch {
  threwDuplicate = true;
}
ok(threwDuplicate, "creating a second room with an already-used name throws rather than silently colliding");

let threwEmpty = false;
try {
  lobby.create("");
} catch {
  threwEmpty = true;
}
ok(threwEmpty, "creating a room with an empty name throws");

const tavern = lobby.create("Tavern", undefined, { capacity: 1 });
eq(lobby.list().length, 2, "list() now reports both rooms");
eq(lobby.entry(tavern.id).joinable, true, "tavern starts joinable (0 of 1 capacity used)");

// join() reads LIVE member counts off the underlying room, not a cached number — capacity is a real
// predicate against room.members(), populated by a REAL client actually joining over a real socket.
const tavernServer = http.createServer();
tavern.attach(tavernServer);
await tavern.ready;
let ws = null;
try {
  await new Promise((res) => tavernServer.listen(0, "127.0.0.1", res));
  await wait(100); // this sandbox's listen->connect race, see tests/prove-client-node.mjs's header
  const port = tavernServer.address().port;
  tavern.start();

  ws = new WebSocket(`ws://127.0.0.1:${port}/`);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  ws.send(JSON.stringify({ k: "join", name: "p1" }));
  await wait(80);

  eq(lobby.entry(tavern.id).memberCount, 1, "entry() reflects the room's actual (real-joined) member count");
  eq(lobby.entry(tavern.id).joinable, false, "tavern is no longer joinable once its capacity is full");
  eq(lobby.join("Tavern"), null, "join() by name refuses a full room");
  ok(lobby.join("Arena One") === arena, "join() by name resolves an under-capacity room to the live room instance");
  eq(lobby.join("nonexistent-room"), null, "join() on an unknown name returns null, not throws");
} finally {
  // The socket closes here, not before the finally: an assertion thrown above used to skip the
  // close, and `tavernServer.close()` then blocked forever on the still-open socket (the hang the
  // 0.4.0 sabotage pass exposed and the Wave2 ledger carried as item 2).
  try { ws?.close(); } catch { /* best-effort */ }
  await wait(30);
  tavern.stop();
  await new Promise((res) => tavernServer.close(res));
}

ok(lobby.destroy(arena.id), "destroy() removes a tracked room");
eq(lobby.findByName("Arena One"), null, "a destroyed room's name is no longer resolvable");
eq(lobby.list().length, 1, "list() reflects the destroy");

lobby.destroyAll();
eq(lobby.list().length, 0, "destroyAll() clears every remaining room and its name bookkeeping");

// === createLobbyWorld: the lobby served AS a room, matching the design's own claim that listing is
// an ordinary interest-filtered read and room.create/room.destroy are ordinary intents. Hand-driven
// (stepOnce, no room.start()/real socket) — the same style prove-room-registry.mjs already uses for
// this kind of pure intent-in/state-out check. ===
const lobby2 = createLobbyRegistry({
  factory: (id) => ({ world: createDemoWorld, validate, interest: () => true, intervalMs: 20 }),
});
const lobbyRoom = createRoom({
  id: "the-lobby",
  world: createLobbyWorld(lobby2),
  validate: lobbyValidate,
  interest: () => true,
  intervalMs: 20,
});

try {
  eq((await lobbyRoom.snapshot.full(0)).entities.length, 0, "a fresh lobby-room has no room subjects yet");

  lobbyRoom.queue.push({ actorId: "op1", seq: 0, kind: "room.create", args: { name: "Dungeon", capacity: 3 } });
  await lobbyRoom.stepOnce();
  const afterCreate = await lobbyRoom.snapshot.full(lobbyRoom.tickNow());
  eq(afterCreate.entities.length, 1, "room.create, as an ordinary intent, materializes one room subject");
  eq(afterCreate.entities[0].name, "Dungeon", "the subject's snapOf carries the room's name");
  eq(afterCreate.entities[0].capacity, 3, "the subject's snapOf carries the room's capacity");
  eq(afterCreate.entities[0].joinable, true, "the subject's snapOf carries live joinability");

  const dungeonId = lobby2.findByName("Dungeon");
  ok(lobby2.has(dungeonId), "the intent actually created a real, independently-tickable room in the registry");

  lobbyRoom.queue.push({ actorId: "op1", seq: 1, kind: "room.destroy", args: { id: dungeonId } });
  await lobbyRoom.stepOnce();
  const afterDestroy = await lobbyRoom.snapshot.full(lobbyRoom.tickNow());
  eq(afterDestroy.entities.length, 0, "room.destroy, as an ordinary intent, removes the room subject");
  eq(lobby2.has(dungeonId), false, "the underlying room is actually destroyed, not just hidden from the list");

  // a malformed room.create (no name) is rejected by lobbyValidate at the wire boundary, same
  // discipline every other validate() in this package holds — it never reaches runTick, no crash.
  eq(lobbyValidate({ kind: "room.create", args: {} }), null, "lobbyValidate rejects a nameless room.create");
  eq(lobbyValidate({ kind: "unknown.kind", args: {} }), null, "lobbyValidate rejects an unrecognized kind");
} finally {
  lobbyRoom.destroy();
  lobby2.destroyAll();
}

done("prove-lobby");
});
