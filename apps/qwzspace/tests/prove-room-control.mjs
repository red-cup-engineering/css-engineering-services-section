import http from "node:http";
import { test } from "node:test";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    const msgs = [];
    ws.addEventListener("message", (ev) => msgs.push(JSON.parse(ev.data)));
    ws.addEventListener("open", () => resolve({ ws, msgs }));
    ws.addEventListener("error", reject);
  });
}

test("live control calls stay outside replayable room intents", async () => {
  let received;
  const room = createRoom({
    id: "prove-room-control",
    intervalMs: 1000,
    world: createDemoWorld,
    validate: createDemoWorld().validate,
    control: async (payload, context) => {
      received = { payload, context };
      return { actor: "character-1", name: payload.name };
    },
  });
  const server = http.createServer();
  room.attach(server);
  await room.ready;
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  await new Promise((resolve) => setTimeout(resolve, 100));
  room.start();
  const client = await connectClient(server.address().port);
  try {
    for (let i = 0; i < 50 && !client.msgs.some((message) => message.k === "hello"); i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const hello = client.msgs.find((message) => message.k === "hello");
    client.ws.send(JSON.stringify({ k: "control", requestId: "request-1", payload: { action: "login", name: "alice" } }));
    for (let i = 0; i < 50 && !client.msgs.some((message) => message.k === "control-result"); i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const result = client.msgs.find((message) => message.k === "control-result");
    ok(result?.ok, "the control callback result is returned over the same live socket");
    eq(result.requestId, "request-1", "the result is correlated to its request");
    eq(received.payload.action, "login", "the raw payload reaches the callback");
    eq(received.context.actorId, hello.id, "the callback receives server-bound session provenance");
    eq(room.log.all().length, 0, "a control request is not appended to the game intent log");
    eq(room.tickNow(), 0, "a control request does not advance the simulation");
  } finally {
    client.ws.close();
    await new Promise((resolve) => setTimeout(resolve, 30));
    room.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
  done("prove-room-control");
});
