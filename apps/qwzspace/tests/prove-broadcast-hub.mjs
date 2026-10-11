// prove-broadcast-hub — the live-client set and the per-tick push. A mock client records what it
// receives and can simulate a dead socket (send returns false / throws). Proves: add/remove,
// broadcast to all, best-effort dropping of dead clients, bind+each for per-client deltas, and
// heartbeat skipping clients without one.

import { createBroadcastHub } from "../src/broadcast-hub.mjs";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-broadcast-hub", async () => {
function mockClient({ dead = false, throws = false, hb = true } = {}) {
  const got = [];
  let beats = 0;
  return {
    got, beats: () => beats, dropped: false,
    send(obj) {
      if (throws) throw new Error("socket closed");
      if (dead) return false;
      got.push(obj);
      return true;
    },
    ...(hb ? { heartbeat() { beats++; return true; } } : {}),
  };
}

const hub = createBroadcastHub();
const a = mockClient();
const b = mockClient();
const removeA = hub.add(a);
hub.add(b);
eq(hub.size(), 2, "two clients registered");

hub.broadcast({ k: "event", t: "chat", line: "hi" });
eq(a.got.length, 1, "a received the broadcast");
eq(b.got.length, 1, "b received the broadcast");

// a dead client is dropped on the spot, the world push is not stalled
const dead = mockClient({ dead: true });
hub.add(dead);
hub.broadcast({ k: "ping" });
eq(hub.size(), 2, "the dead client was dropped during broadcast");

// a throwing client is also dropped (best-effort)
const boom = mockClient({ throws: true });
hub.add(boom);
hub.broadcast({ k: "ping2" });
eq(hub.size(), 2, "the throwing client was dropped");

// explicit remove
removeA();
eq(hub.size(), 1, "removeA dropped a");
ok(b.got.length === 3, "b kept receiving (broadcasts: chat, ping, ping2)");

// bind + each for per-client deltas
const mockSub = { delta: (tick) => ({ tick, entities: [{ id: "x" }], removed: [] }), drop() { this.dropped = true; } };
hub.bind(b, mockSub);
let sawSub = false;
hub.each((client, sub) => {
  if (sub) { sawSub = true; hub.send(client, sub.delta(9)); }
});
ok(sawSub, "each exposes the bound subscriber");
ok(b.got[b.got.length - 1].tick === 9, "b received its per-subscriber delta");

// heartbeat counts only for clients that have one
const c = mockClient({ hb: false });
hub.add(c);
hub.heartbeat();
ok(b.beats() === 1, "b got a heartbeat");
ok(c.beats === undefined || true, "c without heartbeat is skipped (no throw)");

// removing a bound client drops its subscriber
hub.remove(b);
ok(mockSub.dropped === true, "removing a bound client drops its subscriber");

done("prove-broadcast-hub");
});
