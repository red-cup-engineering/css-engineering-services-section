// prove-determinism — §6's PURITY OBLIGATION as an executable gate: given a fixed seed and a fixed
// intent log, `replay(seed, log)` must produce a byte-identical state hash NO MATTER HOW MANY TIMES,
// OR IN HOW MANY SEPARATE PROCESSES, it runs. This is modeled directly on abrash's own two-run
// hash-identity test for its tick loop (cited in the spec's §6, "Real test counts" section) —
// generalized here from one game engine's own test into a qwzspace-level contract any room's world
// must pass. Runs the SAME (seed, log) through TWO GENUINELY SEPARATE OS PROCESSES (not two calls in
// one process, which could share hidden module-level state a real determinism bug would hide behind)
// and asserts their reported state hashes match.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-determinism", async () => {
const WORKER = fileURLToPath(new URL("./_replay-worker.mjs", import.meta.url));

function runWorkerOnce(payload) {
  return execFileSync(process.execPath, [WORKER], {
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
}

// a log with real join+move traffic across multiple actors and several empty ticks between them —
// the shape most likely to expose an accidental iteration-order or timing dependency.
const log = [
  { tick: 1, seq: 0, actorId: "a1", kind: "presence.join", args: { name: "alpha" } },
  { tick: 1, seq: 0, actorId: "a2", kind: "presence.join", args: { name: "beta" } },
  { tick: 3, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } },
  { tick: 3, seq: 1, actorId: "a2", kind: "move", args: { dx: -1, dy: 0 } },
  { tick: 6, seq: 2, actorId: "a1", kind: "move", args: { dx: 0, dy: 1 } },
  { tick: 9, seq: 0, actorId: "a3", kind: "presence.join", args: { name: "gamma" } },
  { tick: 12, seq: 3, actorId: "a2", kind: "move", args: { dx: 1, dy: 1 } },
  { tick: 15, seq: 0, actorId: "a1", kind: "presence.leave", args: {} },
];
const payload = { log, totalTicks: 20 };

const h1 = runWorkerOnce(payload);
const h2 = runWorkerOnce(payload);
const h3 = runWorkerOnce(payload);

ok(/^[0-9a-f]{64}$/.test(h1), "a worker process reports a well-formed sha256 hex digest");
eq(h1, h2, "two SEPARATE OS PROCESSES replaying the identical (seed-independent-here, log) produce a byte-identical hash");
eq(h2, h3, "a third independent process run agrees too — not a two-run coincidence");

// a DIFFERENT log (one fewer move) must NOT hash the same — the test isn't vacuously trivial.
const differentLog = log.slice(0, -1);
const h4 = runWorkerOnce({ log: differentLog, totalTicks: 20 });
ok(h4 !== h1, "a genuinely different log produces a genuinely different hash (the check has teeth)");

done("prove-determinism");
});
