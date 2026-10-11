import { ok, eq, done } from "./_harness.mjs";
import { createIntentLog, roomHash, canonicalRecord } from "../src/intent-log.mjs";
import { test } from "node:test";

test("prove-intent-log", async () => {
// canonicalRecord normalizes shape/types regardless of key order or extra fields.
{
  const a = canonicalRecord({ tick: 3, seq: 1, actorId: "a1", kind: "move", args: { dx: 1 } });
  const b = canonicalRecord({ args: { dx: 1 }, kind: "move", actorId: "a1", seq: 1, tick: 3, extra: "ignored" });
  eq(JSON.stringify(a), JSON.stringify(b), "canonicalRecord is insensitive to input key order / extra fields");
}

// roomHash is a pure function of (seed, ordered records) — same input, same hash, every time.
{
  const log = [
    { tick: 1, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } },
    { tick: 2, seq: 2, actorId: "a1", kind: "move", args: { dx: 0, dy: 1 } },
  ];
  const h1 = roomHash(log, "seed-x");
  const h2 = roomHash(log, "seed-x");
  eq(h1, h2, "roomHash is deterministic for the same seed+log");

  const h3 = roomHash(log, "seed-y");
  ok(h1 !== h3, "roomHash differs for a different seed with the same log");

  const reordered = [log[1], log[0]];
  const h4 = roomHash(reordered, "seed-x");
  ok(h1 !== h4, "roomHash is sensitive to record ORDER, not just content");
}

// createIntentLog: append-only, canonical, and hash matches roomHash over the same records.
{
  const log = createIntentLog("s1");
  eq(log.length(), 0, "a fresh log is empty");
  log.append({ tick: 1, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } });
  log.append({ tick: 2, seq: 2, actorId: "a1", kind: "move", args: { dx: 0, dy: 1 } });
  eq(log.length(), 2, "append grows the log");
  eq(log.hash(), roomHash(log.all(), "s1"), "log.hash() matches the standalone roomHash over log.all()");

  const since1 = log.since(1);
  eq(since1.length, 1, "since(1) returns only records strictly after tick 1");
  eq(since1[0].tick, 2, "since(1)'s one record is the tick-2 record");

  const upto1 = log.upto(1);
  eq(upto1.length, 1, "upto(1) returns only records at or before tick 1");

  eq(log.hash(1), roomHash(log.upto(1), "s1"), "a bounded log.hash(tick) matches roomHash over upto(tick)");
}

// append() returns a fresh, independent object each time (no aliasing back to caller's input).
{
  const log = createIntentLog("s2");
  const input = { tick: 1, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } };
  const stored = log.append(input);
  input.tick = 999;
  eq(log.all()[0].tick, 1, "mutating the caller's input object after append does not corrupt the stored record");
  ok(stored !== input, "append() returns a distinct canonical object, not the same reference");
}

done("prove-intent-log");
});
