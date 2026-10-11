// prove-create-server — the composition root, driven BY HAND via step() (the deterministic sibling
// of start()). A mock world + a real intent-queue/snapshot-manager/broadcast-hub assembled by
// create-server. Proves: an intent queued at the transport is applied only by the tick (single
// writer), step() advances exactly one tick and pushes the delta to a (mock) connected client, and
// the unfiltered vs interest-filtered delta paths both work through the composed server.

import { createServer } from "../src/create-server.mjs";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-create-server", async () => {
// a tiny mock world: positions a game tick mutates from queued move intents.
const world = new Map([["p1", { id: "p1", x: 0 }]]);

const validate = (raw) => (raw && raw.kind === "move" && typeof raw.actor === "string" ? { kind: "move", actor: raw.actor, dx: Number(raw.dx) || 0 } : null);
const subjectsOf = async () => [...world.keys()];
const snapOf = async (id) => { const e = world.get(id); return e ? { id: e.id, x: e.x } : null; };

// runTick is the SINGLE WRITER: it is the only place the world mutates.
let writes = 0;
const runTick = async (tick, intents) => {
  const dirty = [];
  for (const it of intents) {
    if (it.kind === "move") {
      const e = world.get(it.actor);
      if (e) { e.x += it.dx; writes++; dirty.push(it.actor); }
    }
  }
  return { dirty, events: intents.length ? [{ k: "event", t: "chat", line: `tick ${tick}` }] : [] };
};

const game = createServer({ transport: "sse", runTick, subjectsOf, snapOf, validate });
await game.ready;

// a mock connected client bound to a snapshot subscriber (the same opening projection as /events)
const got = [];
const client = { send(o) { got.push(o); return true; }, lastSeq: 0 };
const sub = game.snapshot.subscribe("c1");
game.hub.add(client);
game.hub.bind(client, sub);
// but this game is unfiltered (no interest) -> step() uses the shared broadcast path; the subscriber
// is harmless. Send the opening full frame as the transport would:
client.send(game.snapshot.full(game.tickNow()));
eq(got[0].type, "full", "client got an opening full frame");

// queue an intent at the transport — the world must NOT change yet (single writer)
ok(game.queue.push({ kind: "move", actor: "p1", dx: 3 }) !== null, "transport queued a valid intent");
ok(game.queue.push({ kind: "teleport", actor: "p1" }) === null, "transport rejected an invalid intent");
eq(world.get("p1").x, 0, "the world did NOT change at push time (single writer discipline)");
eq(writes, 0, "no write happened until a tick");

// advance one tick by hand
const r = await game.step();
eq(game.tickNow(), 1, "step advanced exactly one tick");
eq(world.get("p1").x, 3, "the tick applied the queued move");
eq(writes, 1, "exactly one write happened, inside the tick");
eq(r.dirty, ["p1"], "the tick reported p1 dirty");

// the delta + the event reached the client (shared broadcast path), delta before event
const delta = got.find((m) => m.type === "delta");
const ev = got.find((m) => m.k === "event");
ok(delta && delta.entities.find((e) => e.id === "p1")?.x === 3, "client received the delta with p1 at x=3");
ok(ev && ev.line === "tick 1", "client received the tick's chat event");

// === interest-filtered composition ============================================================
const world2 = new Map([["p1", { id: "p1", x: 0 }], ["m1", { id: "m1", x: 999 }]]);
const interest = (id) => (world2.get(id)?.x ?? 0) < 100; // only near things
const game2 = createServer({
  transport: "sse",
  runTick: async (tick, intents) => { for (const it of intents) { const e = world2.get(it.actor); if (e) e.x += it.dx; } return { dirty: intents.map((i) => i.actor) }; },
  subjectsOf: async () => [...world2.keys()],
  snapOf: async (id) => { const e = world2.get(id); return e ? { id: e.id, x: e.x } : null; },
  validate,
  interest,
});
await game2.ready;
const got2 = [];
const client2 = { send(o) { got2.push(o); return true; }, lastSeq: 0 };
const sub2 = game2.snapshot.subscribe("near");
game2.hub.add(client2);
game2.hub.bind(client2, sub2);
client2.send(sub2.full(game2.tickNow()));
eq(got2[0].entities.map((e) => e.id), ["p1"], "interest-filtered full excludes the far m1");

game2.queue.push({ kind: "move", actor: "p1", dx: 1 });
await game2.step();
const d2 = got2.find((m) => m.type === "delta");
ok(d2 && d2.entities.find((e) => e.id === "p1"), "interest-filtered step delivered p1's delta to the near client");

done("prove-create-server");
});

test("the canonical application projects one Qwzspace state through configured SSE and HTTP routes", async () => {
  const world = new Map([["p", { id: "p", x: 0 }]]);
  const game = createServer({
    transport: "both",
    eventsPath: "/qwz/events",
    actPath: "/qwz/act",
    healthPath: "/qwz/health",
    validate: (intent) => intent?.kind === "move" ? intent : null,
    subjectsOf: () => [...world.keys()],
    snapOf: (id) => world.get(id) ?? null,
    runTick: (_tick, intents) => {
      for (const intent of intents) world.get("p").x += intent.dx;
      return { dirty: intents.length ? ["p"] : [] };
    },
  });
  await game.ready;
  ok(typeof game.attach === "function", "both transport retains the WebSocket upgrade projection");
  const stream = await game.app.fetch(new Request("http://qwz.test/qwz/events"));
  eq(stream.status, 200, "configured SSE route is served by the canonical application");
  eq(stream.headers.get("content-type"), "text/event-stream", "SSE content type is projected by the application");
  const reader = stream.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  ok(first.includes('"type":"full"'), "SSE receives the opening snapshot from the shared snapshot manager");
  const acted = await game.app.fetch(new Request("http://qwz.test/qwz/act", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "move", dx: 2 }) }));
  eq(acted.status, 204, "canonical bounded JSON intake queues a valid intent");
  await game.step();
  const second = new TextDecoder().decode((await reader.read()).value);
  ok(second.includes('"type":"delta"') && second.includes('"x":2'), "the same tick state reaches SSE after HTTP intent intake");
  await reader.cancel();
  const health = await game.app.fetch(new Request("http://qwz.test/qwz/health"));
  eq((await health.json()).subscribers, 0, "cancelling the SSE body releases its shared hub subscriber");
});
