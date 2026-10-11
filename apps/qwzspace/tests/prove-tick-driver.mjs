// prove-tick-driver — the cadence + single-writer discipline. Drives the real driver against mock
// queue/snapshot/hub. Proves: it bootstraps and resumes a start tick, ticks on the interval (drain
// -> runTick -> resettle -> broadcast), only writes once per tick (single writer), broadcasts the
// delta and then the events, and the overrun guard coalesces (a slow tick skips the next firing).

import { startTickDriver } from "../src/tick-driver.mjs";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-tick-driver", async () => {
function mockHub() {
  const sent = [];
  let beats = 0;
  return {
    sent, beats: () => beats,
    broadcast(obj) { sent.push(obj); },
    each() {},
    heartbeat() { beats++; },
    send() {},
  };
}
function mockSnapshot() {
  const log = [];
  return {
    log,
    async bootstrap(tick) { log.push(["bootstrap", tick]); },
    async resettle(dirty, tick) { log.push(["resettle", [...dirty], tick]); return { type: "delta", tick, entities: dirty.length ? [{ id: "x" }] : [], removed: [] }; },
    full(tick) { return { type: "full", tick, entities: [] }; },
  };
}
function mockQueue(batches) {
  let i = 0;
  return { drain: () => batches[i++] ?? [], depth: () => 0 };
}

// --- basic cadence ---------------------------------------------------------------------------
const hub = mockHub();
const snap = mockSnapshot();
const ticks = [];
const queue = mockQueue([["i1"], [], ["i2"]]);
const driver = await startTickDriver({
  hub, snapshot: snap, queue,
  bootstrap: async () => 100, // resume the world at tick 100
  runTick: async (tick, intents) => {
    ticks.push([tick, intents]);
    return { dirty: intents.length ? ["x"] : [], events: tick === 101 ? [{ k: "event", t: "chat" }] : [] };
  },
  intervalMs: 10,
  heartbeatMs: 1000,
});

eq(driver.tickNow(), 100, "driver resumed at the bootstrap tick");
ok(snap.log[0][0] === "bootstrap" && snap.log[0][1] === 100, "snapshot bootstrapped at the resume tick");

await new Promise((r) => setTimeout(r, 45)); // let ~3-4 ticks fire
driver.stop();

ok(ticks.length >= 3, `at least 3 ticks fired (got ${ticks.length})`);
eq(ticks[0][0], 101, "first tick is resume+1 (a boundary, not wall time)");
eq(ticks[0][1], ["i1"], "first tick got the first drained batch");
// tick 101 produced a dirty 'x' AND a chat event -> a delta broadcast then the event
const deltas = hub.sent.filter((m) => m.type === "delta");
const events = hub.sent.filter((m) => m.k === "event");
ok(deltas.length >= 1, "a non-empty delta was broadcast");
ok(events.length >= 1, "the tick's event was broadcast");
// the delta for tick 101 must come before the event for tick 101 (positions fresh before the line)
const dIdx = hub.sent.findIndex((m) => m.type === "delta" && m.tick === 101);
const eIdx = hub.sent.findIndex((m) => m.k === "event");
ok(dIdx >= 0 && eIdx > dIdx, "the delta is broadcast before the discrete event");

// --- overrun guard: a slow tick coalesces, never overlaps -------------------------------------
let inFlight = 0;
let maxConcurrent = 0;
const hub2 = mockHub();
const driver2 = await startTickDriver({
  hub: hub2, snapshot: mockSnapshot(), queue: mockQueue([]),
  runTick: async () => {
    inFlight++;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise((r) => setTimeout(r, 30)); // slower than the interval
    inFlight--;
    return { dirty: [] };
  },
  intervalMs: 5,
  heartbeatMs: 1000,
});
await new Promise((r) => setTimeout(r, 80));
driver2.stop();
eq(maxConcurrent, 1, "the overrun guard never lets two ticks overlap (single writer preserved)");

await new Promise((r) => setTimeout(r, 40)); // let the last in-flight tick finish before exit
done("prove-tick-driver");
});
