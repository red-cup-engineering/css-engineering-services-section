// prove-optimistic-overlay — Wave1 §6's documented, principled alternative to client-authoritative
// prediction: createOptimisticOverlay (unit-level) plus a real Room/client-node session proving the
// overlay actually reconciles against real acks and never becomes the source of truth.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createOptimisticOverlay } from "../src/client.mjs";
import { createRoom } from "../src/room.mjs";
import { connectRoom } from "../src/client-node.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-optimistic-overlay", async () => {
async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

// waitUntil — polls `predicate` instead of assuming a fixed delay is always enough; under the full
// suite's `--test-concurrency=1` load a flat `wait(80)` after join/ack can lose the race even though
// the event it's waiting for lands moments later (found via prove-optimistic-overlay's own suite-only
// flake on "the client's own entity exists after joining").
async function waitUntil(predicate, label, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`waitUntil timed out: ${label}`);
    await wait(10);
  }
}

const predict = (entity, kind, args) => {
  if (kind !== "move" || !entity) return entity;
  const dx = Math.max(-1, Math.min(1, Number(args.dx) || 0));
  const dy = Math.max(-1, Math.min(1, Number(args.dy) || 0));
  return { ...entity, x: entity.x + dx, y: entity.y + dy };
};

// === unit level: register/reconcile/apply in isolation, no network at all ======================
{
  const overlay = createOptimisticOverlay({ predict });
  eq(overlay.pendingCount(), 0, "a fresh overlay has no pending predictions");

  overlay.register(1, "move", { dx: 1, dy: 0 });
  overlay.register(2, "move", { dx: 0, dy: 1 });
  eq(overlay.pendingCount(), 2, "two sent intents are both pending");

  const base = { id: "me", x: 0, y: 0 };
  eq(overlay.apply(base), { id: "me", x: 1, y: 1 }, "apply() folds every pending prediction onto the base entity, in send order");
  eq(base, { id: "me", x: 0, y: 0 }, "apply() never mutates the base entity it was given");

  overlay.reconcile(1);
  eq(overlay.pendingCount(), 1, "reconcile(ack) discards every prediction with seq <= ack");
  eq(overlay.apply(base), { id: "me", x: 0, y: 1 }, "only the still-pending prediction remains folded in");

  overlay.reconcile(99);
  eq(overlay.pendingCount(), 0, "reconciling past every pending seq clears the overlay entirely");
  eq(overlay.apply(base), base, "with nothing pending, apply() is a pass-through");

  overlay.clear();
  overlay.register(5, "move", { dx: 1, dy: 0 });
  overlay.clear();
  eq(overlay.pendingCount(), 0, "clear() discards everything unconditionally");

  let threw = false;
  try {
    createOptimisticOverlay({});
  } catch {
    threw = true;
  }
  ok(threw, "createOptimisticOverlay requires a predict function");
}

// === integration: a real Room, a real client-node connection, real acks =========================
const validate = createDemoWorld().validate;
const room = createRoom({ id: "prove-optimistic-overlay", intervalMs: 30, world: createDemoWorld, validate, interest: () => true });
const httpServer = http.createServer();
room.attach(httpServer);
await room.ready;
await new Promise((res) => httpServer.listen(0, "127.0.0.1", res));
await wait(100);
const port = httpServer.address().port;
room.start();

let client = null;
try {
  const overlay = createOptimisticOverlay({ predict });
  client = connectRoom(`ws://127.0.0.1:${port}/`, { name: "predicting-bot", overlay });
  await waitUntil(() => client.view.me() != null, "join to produce the client's own entity in the view");

  ok(client.overlay === overlay, "createRealtimeClient/connectRoom exposes the SAME overlay instance back");
  const beforeMove = client.view.me();
  ok(beforeMove, "the client's own entity exists after joining");
  eq(client.predictedMe(), beforeMove, "with nothing predicted yet, predictedMe() equals the authoritative me()");

  client.sendIntent("move", { dx: 1, dy: 0 });
  // BEFORE the server's tick has fired at all, the LOCAL overlay already shows the move — this is the
  // entire point: instant feedback, sourced from nothing but the client's own just-sent intent.
  const predictedRightAway = client.predictedMe();
  eq(predictedRightAway.x, beforeMove.x + 1, "predictedMe() reflects the pending move BEFORE any server ack arrives");
  eq(client.view.me().x, beforeMove.x, "the AUTHORITATIVE view (view.me()) is untouched — the overlay never leaks into it");
  ok(overlay.pendingCount() > 0, "the overlay has a pending prediction immediately after sendIntent");

  // wait for the room to actually tick and ack the move.
  await waitUntil(() => overlay.pendingCount() === 0, "the server's tick to ack this seq");
  eq(overlay.pendingCount(), 0, "once the server's tick acks this seq, the overlay reconciles it away on its own");
  // Read the ROOM's own authoritative cache, not view.me().x — WorldView deliberately lags `x` behind
  // `tx` for smooth rendering (mergeEntity only snaps `x` to a delta's value on a FULL frame; a delta
  // only moves the interpolation TARGET, `tx`, by design) — a real consumer calls view.interpolate()
  // every render frame to ease `x` toward `tx`, which this test does not do, so `tx` (or the room's
  // own state) is the correct thing to check for "did the server actually apply this," not `x`.
  const authoritative = (await room.snapshot.full(room.tickNow())).entities.find((e) => e.id === client.view.myId());
  eq(authoritative.x, beforeMove.x + 1, "the room's own authoritative state shows the move, confirmed by the server");
  eq(client.view.me().tx, beforeMove.x + 1, "WorldView's interpolation TARGET (tx) reflects the confirmed move too");
  eq(client.predictedMe(), client.view.me(), "with the overlay empty again, predictedMe() and me() agree exactly");

} finally {
  // client.close() is REQUIRED before the server goes away, or createRealtimeClient's own reconnect
  // policy keeps retrying forever against a now-dead server, holding the process open indefinitely
  // (found the hard way rehearsing this file: an early assertion failure skipped this line, and the
  // stray client's own retry-with-backoff loop kept the event loop alive with no natural end).
  client?.close();
  await wait(30);
  room.destroy();
  await new Promise((res) => httpServer.close(res));
}

done("prove-optimistic-overlay");
});
