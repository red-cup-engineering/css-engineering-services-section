// prove-snapshot-manager — the reactive view over a (mock) settled trace. A mock world stands in
// for the EAVT substrate: a Map of id -> render-state, where snapOf returns null when a subject must
// not render (the vanished/carried/gone case). Proves: bootstrap snaps all; resettle re-snaps only
// the dirty set and emits changed+removed; full reads the cache; and per-subscriber interest filters
// the delta and tracks what LEFT each subscriber's view.

import { createSnapshotManager } from "../src/snapshot-manager.mjs";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-snapshot-manager", async () => {
// --- a mock settled trace ---------------------------------------------------------------------
const world = new Map([
  ["a", { id: "a", x: 0, hp: 10, render: true }],
  ["b", { id: "b", x: 5, hp: 10, render: true }],
  ["c", { id: "c", x: 50, hp: 10, render: false }], // not rendering -> snapOf returns null
]);
const subjectsOf = async () => [...world.keys()];
const snapOf = async (id) => {
  const e = world.get(id);
  if (!e || !e.render) return null;
  return { id: e.id, x: e.x, hp: e.hp };
};

// === global (unfiltered) path =================================================================
const m = createSnapshotManager({ subjectsOf, snapOf });
const boot = await m.bootstrap(0);
eq(boot.type, "full", "bootstrap is a full frame");
eq(boot.entities.length, 2, "bootstrap snaps only the rendering subjects (a,b; c is null)");
ok(m.size() === 2, "cache holds the two rendering subjects");

// move a, kill c into rendering (c becomes visible), and let b vanish
world.get("a").x = 1;
world.get("c").render = true;
world.get("b").render = false; // b stops rendering -> should be REMOVED
const d = await m.resettle(["a", "b", "c"], 1);
eq(d.type, "delta", "resettle is a delta frame");
ok(d.entities.find((e) => e.id === "a")?.x === 1, "a re-snapped with its new x");
ok(d.entities.find((e) => e.id === "c"), "c entered rendering and is in the delta");
eq(d.removed, ["b"], "b stopped rendering and is removed");
ok(!m.has("b"), "b dropped from the cache");

// full reads the cache with no disk reads
const f = m.full(1);
eq(f.type, "full", "full is a full frame");
eq(f.entities.length, 2, "full reflects the post-resettle cache (a,c)");

// === per-subscriber interest-filtered path ====================================================
// interest: subscriber "near" sees only x < 10; subscriber "far" sees everything.
const interest = (id, sub) => sub === "far" || (world.get(id)?.x ?? 0) < 10;
const m2 = createSnapshotManager({ subjectsOf, snapOf, interest });
world.get("a").render = true; world.get("a").x = 1;
world.get("b").render = true; world.get("b").x = 5;
world.get("c").render = true; world.get("c").x = 50;
await m2.bootstrap(0);

const near = m2.subscribe("near");
const far = m2.subscribe("far");
const nf = near.full(0);
eq(nf.entities.map((e) => e.id).sort(), ["a", "b"], "near's full excludes far c (x>=10)");
const ff = far.full(0);
eq(ff.entities.map((e) => e.id).sort(), ["a", "b", "c"], "far's full sees everything");

// nothing changed -> empty delta for both
eq(near.delta(1).entities.length, 0, "no change -> near delta has no entities");
eq(near.delta(1).removed.length, 0, "no change -> near delta has no removed");

// move c into near's interest (x: 50 -> 2)
world.get("c").x = 2;
await m2.resettle(["c"], 2);
const nd = near.delta(2, 7);
eq(nd.entities.map((e) => e.id), ["c"], "c entered near's interest -> in its delta");
eq(nd.ack, 7, "delta carries the ack seq");

// move a OUT of near's interest (x: 1 -> 99) -> it should be REMOVED from near, unchanged for far
world.get("a").x = 99;
await m2.resettle(["a"], 3);
const nd2 = near.delta(3);
eq(nd2.removed, ["a"], "a left near's interest -> removed for near");
const fd = far.delta(3);
ok(fd.entities.find((e) => e.id === "a")?.x === 99, "far still sees a, re-snapped");

done("prove-snapshot-manager");
});
