import { ok, eq, done } from "./_harness.mjs";
import {
  createInterpolationBuffer,
  createRealtimeConnectionPolicy,
  createWorldView,
  createRealtimeClient,
} from "../src/client.mjs";
import { test } from "node:test";

test("prove-client", async () => {
// === InterpolationBuffer =========================================================================
{
  const buf = createInterpolationBuffer({ now: () => 1000, delayMs: 0 });
  eq(buf.size(), 0, "a fresh buffer has no samples");
  buf.push({ type: "full", tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, 0);
  buf.push({ type: "delta", tick: 2, entities: [{ id: "e1", x: 10, y: 0 }], removed: [] }, 100);
  eq(buf.latestTick(), 2, "latestTick reflects the most recently pushed frame's tick");

  const mid = buf.sample(50); // halfway between t=0 and t=100
  eq(mid.find((e) => e.id === "e1").x, 5, "sample() at the midpoint linearly interpolates x");

  const before = buf.sample(-10);
  eq(before.find((e) => e.id === "e1").x, 0, "sample() before the first frame clamps to the first frame");

  const after = buf.sample(1000);
  eq(after.find((e) => e.id === "e1").x, 10, "sample() after the last frame (no extrapolation) clamps to the last frame");

  // §7's determinism requirement: same buffer contents + same query time -> same output, every call.
  const s1 = buf.sample(50);
  const s2 = buf.sample(50);
  eq(JSON.stringify(s1), JSON.stringify(s2), "sample() is a pure function of (buffer contents, renderTimeMs)");

  buf.clear();
  eq(buf.size(), 0, "clear() empties the buffer");
}

// InterpolationBuffer also accepts raw wire frames (k:"snapshot"/"delta"), not just {type} frames —
// this is what makes it directly usable against protocol.mjs's actual wire shapes.
{
  const buf = createInterpolationBuffer({ now: () => 0 });
  buf.push({ k: "snapshot", tick: 1, you: "a1", e: [{ id: "a1", x: 0 }] }, 0);
  buf.push({ k: "delta", tick: 2, ack: 0, c: [{ id: "a1", x: 4 }], g: [] }, 100);
  const mid = buf.sample(50);
  eq(mid.find((e) => e.id === "a1").x, 2, "InterpolationBuffer interpolates directly over raw protocol.mjs wire frames");
}

// === RealtimeConnectionPolicy ====================================================================
{
  let t = 0;
  const policy = createRealtimeConnectionPolicy({ now: () => t, baseDelayMs: 100, factor: 2, jitterRatio: 0, random: () => 0.5 });
  eq(policy.snapshot().state, "unknown", "a fresh policy reports 'unknown' before any evidence");

  policy.opened(t);
  eq(policy.snapshot().state, "up", "opened() reports 'up'");

  t = 10;
  policy.closed("dropped", t);
  const afterClose = policy.snapshot();
  eq(afterClose.state, "down", "closed() reports 'down'");
  eq(afterClose.reconnectDelayMs, 100, "first reconnect delay equals baseDelayMs (no jitter configured)");

  ok(!policy.shouldReconnect(t), "shouldReconnect() is false before the scheduled delay elapses");
  ok(policy.shouldReconnect(t + 100), "shouldReconnect() is true once the scheduled delay elapses");

  t = 10;
  policy.failed("boom", t);
  eq(policy.snapshot().attempts, 2, "a second consecutive failure increments the attempt counter");
  eq(policy.snapshot().reconnectDelayMs, 200, "backoff doubles on the second attempt (factor:2)");
}

{
  const policy = createRealtimeConnectionPolicy({ maxAttempts: 2, baseDelayMs: 10, jitterRatio: 0 });
  policy.failed("a");
  policy.failed("b");
  eq(policy.snapshot().state, "exhausted", "state becomes 'exhausted' once maxAttempts is reached");
  ok(!policy.shouldReconnect(Date.now() + 100000), "an exhausted policy never recommends reconnecting again");
}

// === WorldView ====================================================================================
{
  const view = createWorldView("me");
  let addedIds = [];
  view.on("entity-add", (e) => addedIds.push(e.id));
  view.apply({ k: "snapshot", tick: 1, you: "me", e: [{ id: "me", x: 0, y: 0 }, { id: "other", x: 5, y: 5 }] });
  eq(addedIds.sort().join(","), "me,other", "apply(snapshot) emits entity-add for each entity");
  eq(view.me().id, "me", "me() resolves the local entity by localId");
  eq(view.get("other").x, 5, "get() resolves any entity by id");
  eq(view.tick(), 1, "tick() reflects the applied frame's tick");

  let removedIds = [];
  view.on("entity-remove", (e) => removedIds.push(e.id));
  view.apply({ k: "delta", tick: 2, ack: 0, c: [{ id: "me", x: 1, y: 0 }], g: ["other"] });
  // NOTE (ported behavior, intentional): a DELTA sets the interpolation TARGET (tx/ty) but does not
  // immediately snap the displayed x/y — that is what interpolate() is for (client-side smoothing).
  // Only a FULL/snapshot frame snaps x/y immediately (asserted above via the initial snapshot).
  eq(view.get("me").tx, 1, "apply(delta) updates the interpolation TARGET (tx) immediately");
  eq(view.get("me").x, 0, "apply(delta) does NOT snap the displayed x — interpolate() eases toward tx");
  view.interpolate(10, {}); // a large dt fully converges the exponential ease
  ok(Math.abs(view.get("me").x - 1) < 1e-6, "interpolate() with enough dt eases the displayed x to the target");
  eq(view.get("other"), undefined, "apply(delta)'s removed list drops the entity");
  eq(removedIds.join(","), "other", "entity-remove fired for the removed id");

  // an EVENT (e.g. chat, riding protocol.mjs's event() extension point) is emitted under its own `t`.
  let chatLines = [];
  view.on("chat", (payload) => chatLines.push(payload.line));
  view.apply({ k: "event", t: "chat", from: "other", line: "hi" });
  eq(chatLines.join(","), "hi", "an event(t:'chat', ...) frame is emitted under the 'chat' listener");

  // an unrecognized `k` (e.g. v-next's "resumed") is emitted generically under its own name, not
  // dropped — so a client never crashes on a wire kind it doesn't specifically know about.
  let resumedPayload = null;
  view.on("resumed", (p) => (resumedPayload = p));
  view.apply({ k: "resumed", tick: 9, mode: "delta" });
  ok(resumedPayload && resumedPayload.mode === "delta", "an unrecognized k (e.g. 'resumed') is emitted generically under its own name");
}

// === createRealtimeClient: the resume-token wiring (NEW, not a port) ============================
{
  // a minimal mock WebSocketLike the isomorphic core can drive without any real transport.
  function makeMockSocket(script) {
    const sock = {
      readyState: 1,
      sent: [],
      send(data) {
        sock.sent.push(JSON.parse(data));
      },
      close() {},
    };
    script(sock);
    return sock;
  }

  const view = createWorldView("a1");
  let sockets = [];
  const client = createRealtimeClient({
    connect: () => {
      const sock = makeMockSocket(() => {});
      sockets.push(sock);
      queueMicrotask(() => sock.onopen?.());
      return sock;
    },
    view,
    name: "wanderer",
  });

  await new Promise((r) => setTimeout(r, 10));
  eq(sockets.length, 1, "createRealtimeClient opens exactly one socket to start");
  eq(sockets[0].sent[0].k, "join", "with no prior resume token, the first open sends join");

  // simulate the server's hello carrying a resume token, then a snapshot with a tick.
  sockets[0].onmessage({
    data: JSON.stringify({ k: "hello", v: 1, id: "a1", world: { tick: 0, resumeToken: "tok123" } }),
  });
  sockets[0].onmessage({ data: JSON.stringify({ k: "snapshot", tick: 7, you: "a1", e: [] }) });
  eq(client.resumeToken(), "tok123", "the client captured the resume token from hello.world.resumeToken");
  eq(client.lastKnownTick(), 7, "the client tracks the latest tick it has seen");

  // simulate a drop, then let it reconnect — the SECOND socket must resume, not re-join.
  sockets[0].onclose?.({ code: 1006 });
  await new Promise((r) => setTimeout(r, 400)); // past the default backoff base delay
  ok(sockets.length >= 2, "the client opened a second socket after the drop");
  const secondSent = sockets[1].sent[0];
  eq(secondSent.k, "resume", "reconnecting with a resume token on hand sends 'resume', not a fresh 'join'");
  eq(secondSent.token, "tok123", "the resume message carries the previously-issued token");
  eq(secondSent.sinceTick, 7, "the resume message carries the last known tick as sinceTick");

  const controlResult = client.requestControl({ action: "login", name: "alice", password: "secret" });
  const request = sockets[1].sent.at(-1);
  eq(request.k, "control", "live session operations use a separate control message");
  ok(typeof request.requestId === "string", "control requests carry a correlation id");
  sockets[1].onmessage({ data: JSON.stringify({ k: "control-result", requestId: request.requestId, ok: true, result: { actor: "actor-alice", name: "alice" } }) });
  eq((await controlResult).actor, "actor-alice", "requestControl resolves with its matching result");

  client.close();
}

done("prove-client");
});
