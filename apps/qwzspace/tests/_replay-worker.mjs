// _replay-worker — a standalone process entry point used ONLY by prove-determinism.mjs. Reads
// `{ log, totalTicks }` as JSON from stdin, replays it through a FRESH demo-world instance, and
// prints the resulting state hash to stdout. Existing purely so prove-determinism.mjs can run the
// SAME replay in two genuinely separate OS processes (not just two calls in one process, which could
// in principle share hidden state a single-process test would never catch) and diff their output —
// the literal shape abrash's own engine.test.mts two-run hash-identity test uses (per the spec's §6
// citation).

import { replay, stateHash } from "../src/replay.mjs";
import { createDemoWorld } from "./_demo-world.mjs";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { log, totalTicks } = JSON.parse(Buffer.concat(chunks).toString("utf8"));

const world = createDemoWorld();
const result = await replay(log, {
  subjectsOf: world.subjectsOf,
  snapOf: world.snapOf,
  runTick: world.runTick,
  totalTicks,
});
process.stdout.write(stateHash(result.full()));
