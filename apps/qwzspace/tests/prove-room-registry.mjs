import { ok, eq, done } from "./_harness.mjs";
import { createRoomRegistry } from "../src/room-registry.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-room-registry", async () => {
const validate = createDemoWorld().validate;
const registry = createRoomRegistry({
  factory: (id) => ({ world: createDemoWorld, validate, interest: () => true, intervalMs: 30 }),
});

eq(registry.list().length, 0, "a fresh registry has no rooms");

const roomA = registry.create("room-a");
const roomB = registry.create("room-b");
ok(registry.has("room-a") && registry.has("room-b"), "created rooms are tracked");
eq(registry.size(), 2, "size() reflects the two created rooms");
eq(registry.list().sort().join(","), "room-a,room-b", "list() returns both room ids");
eq(registry.get("room-a"), roomA, "get() returns the same room instance create() returned");
eq(registry.get("nope"), null, "get() on an unknown id returns null, not throws");

let threw = false;
try {
  registry.create("room-a"); // duplicate id
} catch {
  threw = true;
}
ok(threw, "creating a room with an already-used id throws rather than silently replacing it");

// CROSS-ROOM ISOLATION: driving room-a's tick loop by hand must not affect room-b's tick counter or
// log at all — each room owns its own independent cadence/queue/cache (§1's determinism check).
await roomA.stepOnce();
await roomA.stepOnce();
eq(roomA.tickNow(), 2, "room-a advanced by hand-driven ticks");
eq(roomB.tickNow(), 0, "room-b's tick is completely untouched by room-a's activity");
eq(roomA.log.length(), 0, "room-a's log is empty (no intents were ever queued, only empty ticks ran)");

roomA.queue.push({ actorId: "x1", seq: 0, kind: "presence.join", args: { name: "x" } });
await roomA.stepOnce();
eq(roomA.log.length(), 1, "room-a's log grew from its own queued intent");
eq(roomB.log.length(), 0, "room-b's log is STILL untouched — no shared queue/log between rooms");

const verifyA = await roomA.verify();
ok(verifyA.ok, "room-a is independently replay-verifiable");

ok(registry.destroy("room-a"), "destroy() reports success for a room it actually removed");
eq(registry.has("room-a"), false, "destroyed room is no longer tracked");
eq(registry.destroy("room-a"), false, "destroying an already-destroyed room reports false, not throws");

registry.destroyAll();
eq(registry.size(), 0, "destroyAll() clears every remaining room");

done("prove-room-registry");
});
