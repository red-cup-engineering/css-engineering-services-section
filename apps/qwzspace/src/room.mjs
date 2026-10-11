// room — the v-next centerpiece. NEW module; wraps `create-server.mjs` UNCHANGED (it is not edited by
// this file or anywhere in this package) rather than replacing it: a Room is a `createServer()`
// instance plus everything that instance's own tick-driver.mjs cannot give it — a canonical intent
// log with server-bound provenance (§2), presence as folded state (§3), reconnection-with-resume off
// a per-subscriber delta ring buffer (§4), and the replay-verifiable-room contract (§6): purity
// (inherited from the game's own pure runTick), provenance (this file's actorId binding), and
// self-audit (`selfAuditEvery`, below).
//
// WHY ROOM DOES NOT CALL create-server.mjs's `start()`/`step()`: those drive tick-driver.mjs's own
// cadence, which computes each subscriber's delta and sends it in the same breath — the delta is
// never handed back to the caller, so there is nowhere to hang a resume ring buffer off it without
// editing tick-driver.mjs (which this spec keeps unchanged for its existing consumers, e.g. Aletheon).
// Room instead takes create-server.mjs's ASSEMBLED PARTS — `queue`, `snapshot`, `hub`, the ws
// `attach()` wiring — and drives its own cadence loop, below, with the IDENTICAL discipline
// tick-driver.mjs documents (drain -> runTick -> resettle -> push, overrun-guarded so a slow tick
// coalesces the next firing rather than overlapping it) plus the one extra step v-next needs: capture
// each subscriber's delta into its ring buffer before sending it.
//
// PROVENANCE (§2, §0 principle 3): create-server.mjs's default ws wiring reads `queue.push(JSON.parse(text))`
// — i.e. it trusts whatever the client's JSON claims. Room supplies its OWN `onJoin`, so that default
// path never runs; every accepted intent instead flows through `wireConnection` below, which reads
// `actorId` from a per-connection `binding` object THIS FILE assigned at connect time (or rebound at
// verified resume) — never from the client-supplied JSON body. `validate` is still the game's own
// trust boundary for `kind`/`args` shape; Room's addition is binding WHO on top of the game's WHAT.

import { createServer } from "./create-server.mjs";
import { hello, snapshot as snapshotMsg, delta as deltaMsg, MSG } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";
import { createIntentLog } from "./intent-log.mjs";
import { createResumeTokens, createRingBuffer } from "./resume.mjs";
import { replay, stateHash, verifyRoomHistory } from "./replay.mjs";
import { randomBytes } from "node:crypto";

const HOST = "@host"; // the actor a host intent is bound to; no connection can be bound to it
const MAX_FRAME_BYTES = 16 * 1024; // an intent is tiny; refuse to even JSON.parse an oversized frame

export function createRoom({
  id,
  seed = id,
  // world — a FACTORY, `() => { runTick, subjectsOf, snapOf }`, not the functions themselves. This
  // matters: §0 principle 1 says the folded world is a pure derivation of (seed, intentLog) — which
  // only holds if replay can construct an INDEPENDENT instance of the domain's state. If Room were
  // instead handed one already-built `runTick` closed over one mutable world object, replay-for-
  // verification would have to call that SAME closure again, mutating the LIVE room's own state out
  // from under it. `world()` is called once now (the live instance) and again, fresh, every time
  // verify()/self-audit needs an independent one to replay into — never the same instance twice.
  world: worldFactory,
  validate: gameValidate,
  interest = null,
  bootstrap = null,
  intervalMs = 200,
  heartbeatMs = 15000,
  ringBufferTicks = 150, // ~30s of history at the default 200ms tick
  resumeGraceTicks = ringBufferTicks, // hold a dropped actor's slot exactly as long as the ring covers
  checkpointEvery = 50,
  selfAuditEvery = 0, // 0 = disabled; each audit replays the WHOLE log (see queueSelfAudit below)
  secret = randomBytes(32).toString("hex"),
  // authenticate — Wave1's auth hook SEAM: (rawJoinMessage, conn) -> Promise<accountId|null> | accountId|null.
  // Mechanism only, per the design's own framing — Room never picks a token format, never invents an
  // identity system; it only calls whatever the game supplies and, if it resolves to a truthy string,
  // rebinds THIS connection's provenance to that id instead of the random provisional one (see
  // finishJoin/wireConnection below). null default = today's unauthenticated behavior, unchanged.
  authenticate = null,
  // control — a live, non-replayed operation: (payload, { actorId }) -> Promise<result> | result.
  control = null,
  // pack — opt-in entry packing on the wire (protocol.mjs's packEntries): every snapshot/delta this
  // room sends groups its entries by key signature instead of repeating key names per entry. The
  // packaged client SDK always decodes both shapes; a hand-written client reading raw JSON must be
  // updated before a room turns this on, which is why it is off by default.
  pack = false,
  // admitOnArrival — a round runs as soon as an intent, a presence change, or a completed control
  // arrives, instead of waiting for the interval: an actor's action lands when it is made. The
  // game's own clock then enters the log as a host intent (`admitHost`), never as the cadence.
  admitOnArrival = false,
  // onRound — told each round's tick once its deltas are sent: where a host persists what changed.
  onRound = null,
} = {}) {
  if (typeof worldFactory !== "function") throw new TypeError("room: world (a factory function) is required");
  if (typeof gameValidate !== "function") throw new TypeError("room: validate is required");

  const live = worldFactory();
  const { runTick: gameRunTick, subjectsOf, snapOf } = live;
  if (typeof gameRunTick !== "function" || typeof subjectsOf !== "function" || typeof snapOf !== "function") {
    throw new TypeError("room: world() must return { runTick, subjectsOf, snapOf }");
  }

  const log = createIntentLog(seed);
  const resumeTokens = createResumeTokens(secret);
  const ring = createRingBuffer(ringBufferTicks);
  // Room ALWAYS drives per-subscriber deltas (regardless of whether the game supplies `interest`),
  // because resume-by-delta (§4) is keyed per actorId — a shared/global delta stream has no per-actor
  // history to ring-buffer. With `interest: null`, snapshot-manager's per-subscriber view degrades to
  // "everyone sees everything" (snapshot-manager.mjs's own documented pass-through), so this costs
  // nothing when a game has no real interest filtering yet, and is required when it does.

  const server = createServer({
    transport: "ws",
    // runTick here is the DRIVER's per-tick entry point, but Room never calls it via create-server's
    // own start()/step() — see the header. It is passed only so create-server's shape-check passes
    // and so `server.ready`'s eager bootstrap has something to (never) invoke; Room's own tickOnce()
    // below is what actually fires each tick.
    runTick: async () => ({ dirty: [] }),
    subjectsOf,
    snapOf,
    // validate here is a PASSTHROUGH: the real validate-and-bind happens in wireConnection below,
    // before anything ever reaches this queue, so intent-queue.mjs's own trust boundary is simply
    // "accept whatever Room already accepted" (Room, not this queue, is now the trust boundary).
    validate: (raw) => (raw && typeof raw === "object" ? raw : null),
    interest,
    bootstrap,
    intervalMs,
    heartbeatMs,
    onJoin: (conn, ctx) => wireConnection(conn, ctx),
    pack,
  });

  const members = new Map(); // actorId -> { name, conn, client, joinedAtTick }
  const clientBinding = new Map(); // client -> { actorId }  (mutable: rebinds on verified resume)
  const seqCounters = new Map(); // actorId -> last accepted client seq (monotonic; survives reconnect)
  const graceTimers = new Map(); // actorId -> Timeout (pending presence.leave)
  const checkpoints = [];
  const auditResults = [];

  let tick = 0;
  let running = false;
  let again = false; // something arrived during a round in flight: run one more after it
  let scheduled = false;
  let timer = null;
  let hbTimer = null;

  // === connection wiring =========================================================================

  // finishJoin — the actual "you're in" step, shared by the unauthenticated fast path and the
  // authenticate()-resolved path above. `members.has(actorId)` covers BOTH "brand new member" (the
  // only case possible on the default, unauthenticated path, since a provisional actorId is always
  // freshly random) AND "an authenticated identity that already has a live slot" (a reconnect that
  // reclaimed its account via auth instead of a resume token) — the latter refreshes conn/client and
  // clears any pending leave-grace timer, the same "never actually left" discipline §4 gives resume,
  // extended here to auth-reclaimed identity, WITHOUT re-emitting a duplicate presence.join.
  function finishJoin(conn, client, binding, name) {
    const actorId = binding.actorId;
    if (!members.has(actorId)) {
      members.set(actorId, { name, conn, client, joinedAtTick: tick });
      server.queue.push({ actorId, seq: 0, kind: "presence.join", args: { name } });
      arrived();
    } else {
      const existing = members.get(actorId);
      existing.conn = conn;
      existing.client = client;
      if (graceTimers.has(actorId)) {
        clearTimeout(graceTimers.get(actorId));
        graceTimers.delete(actorId);
      }
    }
    const sub = server.hub.subscriberOf(client);
    const opening = sub ? sub.full(tick) : server.snapshot.full(tick);
    client.send(snapshotMsg(tick, actorId, opening.entities));
  }

  function wireConnection(conn, ctx) {
    const { client, queue } = ctx;
    const provisional = "a" + randomBytes(6).toString("hex");
    const binding = { actorId: provisional };
    clientBinding.set(client, binding);

    const resumeToken = resumeTokens.issue({ roomId: id, actorId: provisional, issuedAtTick: tick });
    client.send(hello(provisional, { tick, resumeToken }));

    conn.onMessage = (text) => {
      if (typeof text !== "string" || text.length > MAX_FRAME_BYTES) return; // oversized: dropped
      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        return; // not JSON: a hostile/broken frame is dropped, never thrown into the socket loop
      }
      if (!raw || typeof raw !== "object" || typeof raw.k !== "string") return;

      if (raw.k === "resume") {
        handleResume(conn, client, binding, raw);
        return;
      }

      if (raw.k === MSG.join) {
        const name = String(raw.name ?? "wanderer").slice(0, 24) || "wanderer";
        if (typeof authenticate === "function") {
          // fire-and-forget, same discipline as queueSelfAudit below: the socket loop must not block
          // on an external auth check. `binding`/`client`/`conn` are all closed over by reference, so
          // a late resolve still lands on the right connection even if other traffic arrived first.
          Promise.resolve()
            .then(() => authenticate(raw, conn))
            .catch(() => null)
            .then((accountId) => {
              if (typeof accountId !== "string" || !accountId || accountId === HOST) {
                client.send({ k: "join-failed", reason: "auth-rejected" });
                return;
              }
              if (accountId !== binding.actorId) {
                // rebind THIS connection's provenance to the authenticated identity — the same
                // discipline handleResume's oldActorId reclaim uses, just triggered by a resolved
                // auth token instead of a resume token. A fresh resume token is reissued scoped to
                // it so §4's reconnect-with-resume machinery works for an authenticated identity too.
                binding.actorId = accountId;
                const freshToken = resumeTokens.issue({ roomId: id, actorId: accountId, issuedAtTick: tick });
                client.send({ k: "authenticated", actorId: accountId, resumeToken: freshToken });
              }
              finishJoin(conn, client, binding, name);
            });
          return;
        }
        finishJoin(conn, client, binding, name);
        return;
      }

      if (raw.k === MSG.intent) {
        if (typeof raw.seq !== "number" || !Number.isFinite(raw.seq)) return; // malformed seq: dropped
        const seq = raw.seq | 0;
        const actorId = binding.actorId;
        const lastSeq = seqCounters.get(actorId) ?? 0;
        if (seq <= lastSeq) return; // stale / replayed / out-of-order: rejected, room untouched
        const shaped = gameValidate(raw, actorId); // the game's OWN trust boundary for kind/args shape
        if (!shaped || typeof shaped.kind !== "string") return; // hostile/malformed body: rejected
        seqCounters.set(actorId, seq);
        queue.push({ actorId, seq, kind: shaped.kind, args: shaped.args ?? {} });
        arrived();
        return;
      }
      if (raw.k === MSG.control) {
        if (typeof raw.requestId !== "string" || raw.requestId.length < 1 || raw.requestId.length > 128) return;
        const actorId = binding.actorId;
        if (typeof control !== "function") {
          server.hub.send(client, { k: MSG.controlResult, requestId: raw.requestId, ok: false, error: "Unsupported control request" });
          return;
        }
        Promise.resolve()
          .then(() => control(raw.payload, { actorId }))
          .finally(arrived)
          .then(
            (result) => server.hub.send(client, { k: MSG.controlResult, requestId: raw.requestId, ok: true, result }),
            (error) => server.hub.send(client, { k: MSG.controlResult, requestId: raw.requestId, ok: false, error: error?.message || "Request failed" }),
          );
        return;
      }
      // any other/unknown k: ignored, not an error — a newer client talking to an older room must
      // not be able to crash it by sending a message kind this room doesn't recognize yet.
    };

    // create-server.mjs's ws attach assigns `conn.onClose = remove` IMMEDIATELY AFTER onJoin returns
    // (create-server.mjs, ws transport block, last line) — so anything wireConnection assigns to
    // conn.onClose here would be clobbered. Deferring to a microtask runs AFTER that synchronous
    // assignment (microtasks drain only once the current call stack — which includes that line —
    // finishes), so this composes with it instead of losing it.
    queueMicrotask(() => {
      const builtinRemove = conn.onClose;
      conn.onClose = () => {
        try {
          builtinRemove();
        } catch {
          /* best-effort */
        }
        startLeaveGrace(binding.actorId, client);
      };
    });
  }

  function handleResume(conn, client, binding, raw) {
    const payload = resumeTokens.verify(raw.token);
    if (!payload || payload.roomId !== id) {
      client.send({ k: "resume-failed", reason: "bad-token" });
      return;
    }
    const oldActorId = payload.actorId;
    const hadGrace = graceTimers.has(oldActorId);
    if (!hadGrace && !members.has(oldActorId)) {
      client.send({ k: "resume-failed", reason: "unknown-actor" });
      return;
    }
    if (hadGrace) {
      clearTimeout(graceTimers.get(oldActorId));
      graceTimers.delete(oldActorId);
    }

    binding.actorId = oldActorId;
    const member = members.get(oldActorId);
    if (member) {
      member.conn = conn;
      member.client = client;
    }

    const sinceTick = Number.isInteger(raw.sinceTick) ? raw.sinceTick : -1;
    const buffered = ring.since(oldActorId, sinceTick);
    const sub = server.hub.subscriberOf(client);

    // RE-ISSUE a resume token scoped to the RECLAIMED identity (oldActorId), not the abandoned
    // provisional one `hello` originally handed this socket. Without this, a client's second
    // reconnect-after-resume would present a token for an actor that never actually joined (the
    // discarded provisional id), and legitimately fail as "unknown-actor" — resume must remain usable
    // across repeated drops, not just a single one.
    const freshToken = resumeTokens.issue({ roomId: id, actorId: oldActorId, issuedAtTick: tick });

    if (buffered) {
      // THE LITERAL "the log is the resume mechanism": deliver exactly the deltas this subscriber
      // would have received had it never dropped, in order, with no special resume payload shape.
      for (const entry of buffered) {
        client.send(deltaMsg(entry.tick, entry.ack, entry.delta.entities, entry.delta.removed));
      }
      // THE RESUME-SEAM FIX: `buffered` only covers ticks the ring recorded WHILE a subscriber was
      // actively bound to this actorId — and nobody is bound during the gap between the old
      // connection dropping (hub.remove()'s sub.drop()) and this new connection's own subscriber
      // being (re)primed, below. If the room ticked at all during that gap (a near-certainty on any
      // reconnect slower than one intervalMs), an entity that changed ONLY inside it is invisible to
      // both `buffered` (the ring has no entries for it) and the reprime (which — before this fix —
      // silently discarded its own frame, on the false assumption `buffered` already reached "now").
      // Bridging the gap with a genuine full frame, sent only when one is provably needed (`tick >
      // lastBufferedTick`), closes that hole without adding a redundant frame on the common, gapless
      // reconnect. See examples/spectate/README.md's "resume seam" section for the reproduction that
      // surfaced this (a real §4 resume bug — not, as first suspected, an InterpolationBuffer issue).
      const lastBufferedTick = buffered.length ? buffered[buffered.length - 1].tick : sinceTick;
      const primed = sub ? sub.full(tick) : server.snapshot.full(tick);
      if (tick > lastBufferedTick) {
        client.send(snapshotMsg(tick, oldActorId, primed.entities));
      }
      client.send({ k: "resumed", tick, mode: "delta", from: sinceTick, count: buffered.length, resumeToken: freshToken });
    } else {
      // aged out of the ring buffer — the honest, cheap-but-costlier fallback (§4; Colyseus's own
      // issue #343 documents the same edge under a heavier seat-reservation mechanism).
      const full = sub ? sub.full(tick) : server.snapshot.full(tick);
      client.send(snapshotMsg(tick, oldActorId, full.entities));
      client.send({ k: "resumed", tick, mode: "full", from: sinceTick, resumeToken: freshToken });
    }
  }

  function startLeaveGrace(actorId, _client) {
    if (!members.has(actorId)) return; // never joined (e.g. connected then dropped pre-join): nothing to hold
    if (graceTimers.has(actorId)) return; // defensive: a grace timer is already pending
    const t = setTimeout(() => {
      graceTimers.delete(actorId);
      members.delete(actorId);
      ring.drop(actorId);
      seqCounters.delete(actorId);
      server.queue.push({ actorId, seq: 0, kind: "presence.leave", args: {} });
      arrived();
    }, resumeGraceTicks * intervalMs);
    if (typeof t.unref === "function") t.unref();
    graceTimers.set(actorId, t);
  }

  // === the tick cadence (Room's own tick-driver-alike; see header) ==============================

  // arrived — with admitOnArrival, run a round on the next turn of the event loop (one round for
  // everything that arrived in this turn), or right after the round in flight.
  function arrived() {
    if (!admitOnArrival) return;
    if (running) { again = true; return; }
    if (scheduled) return;
    scheduled = true;
    setImmediate(() => {
      scheduled = false;
      tickOnce();
    });
  }

  // admitHost — an intent the host itself originates (the game's clock, say), logged and replayed
  // like any other under the reserved actor "@host", in the next round.
  function admitHost(kind, args = {}) {
    if (typeof kind !== "string" || kind.length === 0) throw new TypeError("room: a host intent needs a kind");
    server.queue.push({ actorId: HOST, seq: 0, kind, args });
    return tickOnce();
  }

  async function tickOnce() {
    if (running) { // previous tick still in flight: coalesce, do not overlap (tick-driver.mjs's
      if (admitOnArrival) again = true; // own overrun-guard discipline, reimplemented here for the
      return; // reason in the header); an arrival-driven room owes the coalesced one a round
    }
    running = true;
    try {
      const staged = server.queue.drain();
      const next = tick + 1;
      const gameIntents = [];
      for (const it of staged) {
        // THE PROVENANCE-BOUND CANONICAL RECORD: tick assigned here (never client-supplied), actorId
        // bound at connect/resume time (never client-supplied) — this line is where §2's record shape
        // actually gets written.
        log.append({ tick: next, seq: it.seq, actorId: it.actorId, kind: it.kind, args: it.args });
        gameIntents.push({ actorId: it.actorId, kind: it.kind, args: it.args });
      }
      const result = (await gameRunTick(next, gameIntents)) ?? {};
      tick = next;
      const dirty = result.dirty ?? [];

      // per-subscriber deltas, always (see perSubscriber's comment above) — this is also where each
      // subscriber's delta is captured into its ring buffer BEFORE being sent, which is the one thing
      // tick-driver.mjs's own per-subscriber path (create-server.mjs's start()/step()) cannot offer,
      // since it never hands the computed delta back to a caller.
      await server.snapshot.resettle(dirty, tick);
      server.hub.each((client, subscriber) => {
        if (!subscriber) return;
        const binding = clientBinding.get(client);
        const actorId = binding ? binding.actorId : null;
        if (!actorId) return;
        const ack = seqCounters.get(actorId) ?? 0;
        const d = subscriber.delta(tick, ack);
        ring.push(actorId, { tick, ack, delta: { entities: d.entities, removed: d.removed } });
        if (d.entities.length || d.removed.length) {
          server.hub.send(client, deltaMsg(tick, ack, d.entities, d.removed));
        }
      });

      for (const ev of result.events ?? []) server.hub.broadcast(ev);

      if (checkpointEvery > 0 && tick % checkpointEvery === 0) checkpoint(tick);
      if (selfAuditEvery > 0 && tick % selfAuditEvery === 0) queueSelfAudit(tick);
      if (typeof onRound === "function") onRound(tick);
    } finally {
      running = false;
      if (again) {
        again = false;
        arrived();
      }
    }
  }

  // === §6: the replay-verifiable room contract ====================================================

  function checkpoint(atTick) {
    checkpoints.push({
      tick: atTick,
      stateHash: stateHash(server.snapshot.full(atTick)),
      logHash: log.hash(atTick),
    });
    while (checkpoints.length > 20) checkpoints.shift();
  }

  // queueSelfAudit — the self-audit obligation: replay the room's ENTIRE log from tick 0 and diff the
  // resulting state hash against the live cache's. This is deliberately fire-and-forget (not awaited
  // by tickOnce) because replay() builds its OWN fresh snapshot-manager and only READS the log (an
  // append-only structure safe to read concurrently with more appends) — it touches nothing the live
  // room owns, so it cannot race the tick cadence, only run alongside it.
  //
  // HONEST SCOPE NOTE: this replays from tick 0 every time, not from the last checkpoint — an
  // incremental checkpoint-resume replay would need the GAME to serialize/restore its own folded
  // domain state, which qwzspace intentionally does not own (domain state is injected and opaque to
  // the engine, per create-server.mjs's own contract). Checkpoints here are integrity markers
  // (tick + hash), not fast-resume snapshots. For the room sizes this v-next targets (a live room's
  // log, not a persistent MMO's years-long history) a full replay is cheap; a truly long-lived room
  // would need a domain-specific state-serialization seam this spec does not add.
  function queueSelfAudit(atTick) {
    const logSnapshot = log.all();
    const liveHash = stateHash(server.snapshot.full(atTick));
    const fresh = worldFactory(); // an INDEPENDENT domain instance — never the live one (see header)
    replay(logSnapshot, { subjectsOf: fresh.subjectsOf, snapOf: fresh.snapOf, runTick: fresh.runTick, totalTicks: atTick })
      .then((replayed) => {
        const replayedHash = stateHash(replayed.full());
        auditResults.push({ tick: atTick, ok: replayedHash === liveHash, liveHash, replayedHash, at: Date.now() });
        while (auditResults.length > 20) auditResults.shift();
      })
      .catch((e) => {
        auditResults.push({ tick: atTick, ok: false, error: String(e && e.message ? e.message : e), at: Date.now() });
      });
  }

  // verify — the on-demand verification entry point: replay the room's WHOLE history right now and
  // compare against the live cache. Anyone holding `log.all()`, `tick`, and the game's three pure
  // functions can run the equivalent of this WITHOUT the live room at all (see replay.mjs's
  // `verifyRoomHistory`, which this simply calls with this room's own live state as the reference).
  async function verify() {
    const liveHash = stateHash(server.snapshot.full(tick));
    const fresh = worldFactory(); // an INDEPENDENT domain instance — never the live one (see header)
    const result = await verifyRoomHistory({
      seed,
      log: log.all(),
      totalTicks: tick,
      subjectsOf: fresh.subjectsOf,
      snapOf: fresh.snapOf,
      runTick: fresh.runTick,
      liveStateHash: liveHash,
    });
    return { ...result, logHash: log.hash() };
  }

  // === lifecycle ==================================================================================

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      tickOnce();
    }, intervalMs);
    hbTimer = setInterval(() => server.hub.heartbeat(), heartbeatMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    if (hbTimer) clearInterval(hbTimer);
    timer = null;
    hbTimer = null;
  }

  function destroy() {
    stop();
    for (const t of graceTimers.values()) clearTimeout(t);
    graceTimers.clear();
    server.hub.each((client) => {
      try {
        client.conn?.close?.();
      } catch {
        /* best-effort */
      }
    });
  }

  return {
    id,
    seed,
    attach: (httpServer) => server.attach(httpServer),
    start,
    stop,
    destroy,
    stepOnce: tickOnce, // hand-driven single tick — the deterministic sibling, for tests (no timers)
    admitHost,
    tickNow: () => tick,
    queue: server.queue,
    snapshot: server.snapshot,
    hub: server.hub,
    ready: server.ready,
    log,
    ring,
    checkpoints: () => checkpoints.slice(),
    auditResults: () => auditResults.slice(),
    verify,
    members: () => new Map(members),
    resumeTokenSecret: secret,
    pack,
  };
}
