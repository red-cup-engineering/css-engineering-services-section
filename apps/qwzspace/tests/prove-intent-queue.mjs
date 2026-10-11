// prove-intent-queue — the single-writer staging area: a validator gates pushes, drain hands the
// tick an ordered batch and resets, and id/num primitives reject log-injection / non-numbers.

import { createIntentQueue, id, num } from "../src/intent-queue.mjs";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-intent-queue", async () => {
// the reusable primitives
ok(id("ada_01") === "ada_01", "id accepts a safe id");
ok(id("../etc") === null, "id rejects path tricks");
ok(id("") === null, "id rejects empty");
ok(id("a".repeat(100)) === null, "id rejects over-long");
ok(num("3.5") === 3.5, "num coerces a numeric string");
ok(num("NaN") === null, "num rejects NaN");
ok(num(Infinity) === null, "num rejects Infinity");

// a game's validator: accept only { kind:'move', actor } with a safe actor
const validate = (raw) => {
  if (!raw || raw.kind !== "move") return null;
  const actor = id(raw.actor);
  return actor ? { kind: "move", actor } : null;
};
const q = createIntentQueue({ validate });

ok(q.push({ kind: "move", actor: "p1" }) !== null, "push accepts a valid intent");
ok(q.push({ kind: "move", actor: "../x" }) === null, "push rejects a bad actor");
ok(q.push({ kind: "teleport", actor: "p1" }) === null, "push rejects an unknown kind");
eq(q.depth(), 1, "only the one valid intent is queued");

q.push({ kind: "move", actor: "p2" });
eq(q.depth(), 2, "a second valid intent lines up behind the first");

const batch = q.drain();
eq(batch, [{ kind: "move", actor: "p1" }, { kind: "move", actor: "p2" }], "drain returns the ordered batch");
eq(q.depth(), 0, "drain resets the queue");
eq(q.drain(), [], "a second drain is empty");

// no validator -> pass plain objects through, reject non-objects
const q2 = createIntentQueue();
ok(q2.push({ a: 1 }) !== null, "no-validator queue passes objects through");
ok(q2.push("nope") === null, "no-validator queue still rejects non-objects");

done("prove-intent-queue");
});
