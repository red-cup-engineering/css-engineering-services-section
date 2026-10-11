// prove-client-node-room — the end-to-end proof: client-node.mjs's connectRoom (client-node.mjs +
// client.mjs's WorldView) against a real room.mjs Room, over a real localhost websocket. Kept in its
// own process/file — see prove-client-node.mjs's header for why (this sandbox only reliably permits
// one listening server per node process).

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { connectRoom } from "../src/client-node.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-client-node-room", async () => {
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const validate = createDemoWorld().validate;
const room = createRoom({
  id: "client-node-room",
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
  const states = [];
  const client = connectRoom(`ws://127.0.0.1:${port}/`, { name: "botty", onState: (s) => states.push(s) });
  await wait(400);
  ok(states.includes("joining"), "connectRoom automatically joins on connect");
  ok(states.includes("playing"), "connectRoom reaches 'playing' once a snapshot arrives");

  client.sendIntent("move", { dx: 1, dy: 0 });
  await wait(80);

  const me = client.view.me();
  ok(me, "the WorldView resolved 'me' once hello assigned the real actorId (setLocalId wiring)");
  // a delta sets the interpolation TARGET (tx) immediately; the displayed x eases toward it via
  // interpolate() (see prove-client.mjs's equivalent note) — check tx here, then converge and check x.
  eq(me.tx, 1, "the intent sent through client.sendIntent set the WorldView's interpolation target");
  client.view.interpolate(10);
  ok(Math.abs(client.view.me().x - 1) < 1e-6, "interpolate() eases the displayed x to match the sent move");

  const roomFrame = await room.snapshot.full(room.tickNow());
  const authoritative = roomFrame.entities.find((e) => e.id === me.id);
  eq(client.view.me().tx, authoritative.x, "the client's WorldView interpolation target matches the room's authoritative state");

  client.close();
  await wait(30);
} finally {
  room.destroy();
  await new Promise((res) => httpServer.close(res));
}

done("prove-client-node-room");
});
