// client — the isomorphic core of the v-next client SDK. PORTED (per the spec's §7: "port, not
// build") from an unshipped prior-art file at
// `.../lib/legacy/computing-with-the-web/src/qwzspace/client.mts` (44KB TypeScript, confirmed lineage:
// it already imports the same MSG/decode/encode/intent/join shapes `protocol.mjs` still exports
// today). Three pieces are lifted near-verbatim (stripped of TypeScript types, which is all that
// changes about them):
//   - createInterpolationBuffer  — a tick-locked sample buffer; §8's renderer samples off exactly
//     this (the seam between §7 and §8 the spec calls out explicitly).
//   - createRealtimeConnectionPolicy — reconnect backoff with jitter + a small connection-state FSM.
//   - createWorldView — the on/emit/apply/me/get/zone reducer every current consumer hand-rolls today
//     (the teardown's gap #4). TRIMMED of the source file's Aletheon-specific wire kinds
//     (MSG.altar/MSG.inventory/MSG.field/MSG.chat) — those come from a DIFFERENT, older, game-specific
//     protocol version than the one this package's `protocol.mjs` ships today (which defines only
//     hello/join/intent/snapshot/delta/event/bye). A generic event/unknown-kind passthrough already
//     covers "chat" and anything else a game rides through protocol.mjs's `event()` extension point,
//     so nothing is lost — see createWorldView's apply() below.
//
// NEW (not a port — small glue code, per §7's own framing): `createRealtimeClient` wires §4's resume
// token into the reconnect path. `RealtimeConnectionPolicy.shouldReconnect()` decides WHEN to retry;
// this wires WHAT the retry sends — a `{k:"resume", token, sinceTick}` instead of a fresh `join`,
// whenever a resume token from a prior `hello` is on hand.
//
// Zero imports beyond protocol.mjs, no `node:` anything, no DOM — matches protocol.mjs's own
// isomorphic discipline so this file ships byte-identical to the browser and to Node.

import { clamp01 } from "./clamp.mjs";
import { MSG, decode, encode, intent, join } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";

// === InterpolationBuffer =========================================================================
// A tick-locked sample buffer: push(frame, receivedAtMs) records what the world looked like at a
// wall-clock moment; sample(renderTimeMs) asks "what did it look like AT this render moment" and
// linearly interpolates between the two bracketing samples. This is the exact mechanism §8's renderer
// needs (a scene projection sampling display frames off a buffered tick stream) and the reason §9's
// unification is possible: live playback and replay scrubbing are both just calls to sample() against
// differently-sourced pushes.

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cloneEntity(entity) {
  return { ...entity };
}

function clientEntities(value) {
  return Array.isArray(value) ? value.filter((e) => e && typeof e === "object" && typeof e.id === "string") : [];
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function normalizeInterpolationFrame(frame) {
  if (frame.type === "full") {
    return {
      full: true,
      tick: Math.max(0, Math.trunc(finiteNumber(frame.tick) ?? 0)),
      entities: clientEntities(frame.entities).map(cloneEntity),
      removed: [],
    };
  }
  if (frame.type === "delta") {
    return {
      full: false,
      tick: Math.max(0, Math.trunc(finiteNumber(frame.tick) ?? 0)),
      entities: clientEntities(frame.entities).map(cloneEntity),
      removed: stringList(frame.removed),
    };
  }
  if (frame.k === MSG.snapshot) {
    return {
      full: true,
      tick: Math.max(0, Math.trunc(finiteNumber(frame.tick) ?? 0)),
      entities: clientEntities(frame.e).map(cloneEntity),
      removed: [],
    };
  }
  if (frame.k === MSG.delta) {
    return {
      full: false,
      tick: Math.max(0, Math.trunc(finiteNumber(frame.tick) ?? 0)),
      entities: clientEntities(frame.c).map(cloneEntity),
      removed: stringList(frame.g),
    };
  }
  return null;
}

function entitiesById(entities) {
  const out = new Map();
  for (const e of entities) out.set(e.id, e);
  return out;
}

function shortAngle(a, b) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function interpolateEntity(left, right, alpha) {
  const out = { ...left, ...right };
  for (const key of ["x", "y", "z"]) {
    const a = finiteNumber(left[key]);
    const b = finiteNumber(right[key]);
    if (a !== null && b !== null) out[key] = a + (b - a) * alpha;
  }
  const yawA = finiteNumber(left.yaw);
  const yawB = finiteNumber(right.yaw);
  if (yawA !== null && yawB !== null) out.yaw = yawA + shortAngle(yawA, yawB) * alpha;
  return out;
}

function freezeEntities(entities) {
  return entities.map(cloneEntity);
}

function interpolateSamples(left, right, renderTimeMs) {
  const span = Math.max(1, right.timeMs - left.timeMs);
  const alpha = Math.max(0, Math.min(1, (renderTimeMs - left.timeMs) / span));
  const leftById = entitiesById(left.entities);
  const rightById = entitiesById(right.entities);
  const ids = new Set([...leftById.keys(), ...rightById.keys()]);
  const out = [];
  for (const id of ids) {
    const before = leftById.get(id);
    const after = rightById.get(id);
    if (before && after) out.push(interpolateEntity(before, after, alpha));
    else if (after) out.push(cloneEntity(after));
    else if (before && alpha < 1) out.push(cloneEntity(before));
  }
  return out;
}

function extrapolateSamples(left, right, renderTimeMs) {
  const span = Math.max(1, right.timeMs - left.timeMs);
  const alpha = Math.max(1, (renderTimeMs - left.timeMs) / span);
  const leftById = entitiesById(left.entities);
  const out = [];
  for (const entity of right.entities) {
    const before = leftById.get(entity.id);
    out.push(before ? interpolateEntity(before, entity, alpha) : cloneEntity(entity));
  }
  return out;
}

export function createInterpolationBuffer(options = {}) {
  const now = options.now ?? (() => Date.now());
  const delayMs = Math.max(0, finiteNumber(options.delayMs) ?? 100);
  const maxSamples = Math.max(1, Math.trunc(finiteNumber(options.maxSamples) ?? 32));
  const extrapolateMs = Math.max(0, finiteNumber(options.extrapolateMs) ?? 0);
  const state = new Map();
  const samples = [];
  let tick = 0;

  function push(frame, receivedAtMs = now()) {
    const normalized = normalizeInterpolationFrame(frame);
    const timeMs = finiteNumber(receivedAtMs);
    if (!normalized || timeMs === null) return false;
    tick = Math.max(tick, normalized.tick);
    if (normalized.full) state.clear();
    for (const removed of normalized.removed) state.delete(removed);
    for (const entity of normalized.entities) state.set(entity.id, cloneEntity(entity));
    samples.push({ timeMs, tick: normalized.tick, entities: [...state.values()].map(cloneEntity) });
    samples.sort((l, r) => l.timeMs - r.timeMs || l.tick - r.tick);
    while (samples.length > maxSamples) samples.shift();
    return true;
  }

  function sample(renderTimeMs = now() - delayMs) {
    const at = finiteNumber(renderTimeMs);
    if (samples.length === 0 || at === null) return [];
    const first = samples[0];
    if (at <= first.timeMs) return freezeEntities(first.entities);
    for (let i = 1; i < samples.length; i++) {
      const right = samples[i];
      if (at <= right.timeMs) return interpolateSamples(samples[i - 1], right, at);
    }
    const last = samples[samples.length - 1];
    if (samples.length >= 2 && extrapolateMs > 0 && at <= last.timeMs + extrapolateMs) {
      return extrapolateSamples(samples[samples.length - 2], last, at);
    }
    return freezeEntities(last.entities);
  }

  // sampleBrackets — NEW, additive: exposes the same two RAW (uninterpolated) recorded samples and
  // the same alpha `sample()` computes internally, instead of only the already-x/y/z/yaw-merged
  // result. Nothing about `sample()`'s own behavior changes — this reuses its exact bracket-finding
  // rule, it just also hands back what it found.
  //
  // Why this exists: `sample()` is the right (and only) place x/y/z/yaw get smoothed — a presentation
  // layer (tween.mjs) must NOT re-interpolate position itself, or two independent smoothing passes
  // could disagree about where an entity is. But tween.mjs's OWN job — scale/rotation/opacity/tint
  // easing, enter/exit — needs the two bracketing tick-frames as SceneDescriptions (via `project()`)
  // and the identical alpha, so its output can be layered over `sample()`'s positions rather than
  // computed from a different notion of "how far between ticks are we." `render-loop.mjs` is the
  // glue that actually does this composition; see its header for the full call sequence.
  function sampleBrackets(renderTimeMs = now() - delayMs) {
    const at = finiteNumber(renderTimeMs);
    if (samples.length === 0 || at === null) return null;
    const first = samples[0];
    if (at <= first.timeMs) {
      return { left: { tick: first.tick, entities: freezeEntities(first.entities) }, right: { tick: first.tick, entities: freezeEntities(first.entities) }, alpha: 0, mode: "before" };
    }
    for (let i = 1; i < samples.length; i++) {
      const right = samples[i];
      if (at <= right.timeMs) {
        const left = samples[i - 1];
        const span = Math.max(1, right.timeMs - left.timeMs);
        const alpha = clamp01((at - left.timeMs) / span);
        return {
          left: { tick: left.tick, entities: freezeEntities(left.entities) },
          right: { tick: right.tick, entities: freezeEntities(right.entities) },
          alpha,
          mode: "between",
        };
      }
    }
    const last = samples[samples.length - 1];
    if (samples.length >= 2 && extrapolateMs > 0 && at <= last.timeMs + extrapolateMs) {
      const left = samples[samples.length - 2];
      const span = Math.max(1, last.timeMs - left.timeMs);
      const alpha = Math.max(1, (at - left.timeMs) / span);
      return {
        left: { tick: left.tick, entities: freezeEntities(left.entities) },
        right: { tick: last.tick, entities: freezeEntities(last.entities) },
        alpha,
        mode: "extrapolate",
      };
    }
    return { left: { tick: last.tick, entities: freezeEntities(last.entities) }, right: { tick: last.tick, entities: freezeEntities(last.entities) }, alpha: 1, mode: "after" };
  }

  return {
    push,
    sample,
    sampleBrackets,
    latestTick: () => tick,
    latestSample: () => samples[samples.length - 1] ?? null,
    size: () => samples.length,
    clear() {
      state.clear();
      samples.length = 0;
      tick = 0;
    },
  };
}

// === RealtimeConnectionPolicy =====================================================================
// Reconnect backoff with jitter, plus a small connection-state FSM ("unknown"/"up"/"stale"/"down"/
// "contested"/"exhausted") — ported verbatim from the prior-art file.

function errorText(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Error) return value.message || value.name;
  return String(value);
}

function connectionState(positiveEvidence, negativeEvidence, attempts, maxAttempts, staleMs, lastHeartbeatAtMs, atMs) {
  if (attempts >= maxAttempts && negativeEvidence) return "exhausted";
  if (positiveEvidence && negativeEvidence) return "contested";
  if (negativeEvidence) return "down";
  if (positiveEvidence) {
    if (lastHeartbeatAtMs !== null && staleMs > 0 && atMs - lastHeartbeatAtMs > staleMs) return "stale";
    return "up";
  }
  return "unknown";
}

export function createRealtimeConnectionPolicy(options = {}) {
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const baseDelayMs = Math.max(0, finiteNumber(options.baseDelayMs) ?? 250);
  const maxDelayMs = Math.max(baseDelayMs, finiteNumber(options.maxDelayMs) ?? 10_000);
  const factor = Math.max(1, finiteNumber(options.factor) ?? 2);
  const jitterRatio = Math.max(0, Math.min(1, finiteNumber(options.jitterRatio) ?? 0.2));
  const staleMs = Math.max(0, finiteNumber(options.staleMs) ?? 30_000);
  const maxAttempts = Math.max(0, Math.trunc(finiteNumber(options.maxAttempts) ?? Number.POSITIVE_INFINITY));
  let positiveEvidence = false;
  let negativeEvidence = false;
  let attempts = 0;
  let reconnectDelayMs = null;
  let nextReconnectAtMs = null;
  let lastOpenAtMs = null;
  let lastCloseAtMs = null;
  let lastHeartbeatAtMs = null;
  let latencyMs = null;
  let lastError = null;

  function settle(atMs = now()) {
    return {
      state: connectionState(positiveEvidence, negativeEvidence, attempts, maxAttempts, staleMs, lastHeartbeatAtMs, atMs),
      attempts,
      reconnectDelayMs,
      nextReconnectAtMs,
      lastOpenAtMs,
      lastCloseAtMs,
      lastHeartbeatAtMs,
      latencyMs,
      lastError,
    };
  }

  function scheduleReconnect(atMs) {
    if (attempts >= maxAttempts) {
      reconnectDelayMs = null;
      nextReconnectAtMs = null;
      return;
    }
    const raw = Math.min(maxDelayMs, baseDelayMs * factor ** Math.max(0, attempts - 1));
    const jitter = raw * jitterRatio * (random() - 0.5) * 2;
    reconnectDelayMs = Math.max(0, Math.round(raw + jitter));
    nextReconnectAtMs = atMs + reconnectDelayMs;
  }

  function markDown(reason, atMs) {
    attempts++;
    negativeEvidence = true;
    lastCloseAtMs = atMs;
    lastError = errorText(reason);
    scheduleReconnect(atMs);
    return settle(atMs);
  }

  return {
    opened(atMs = now()) {
      positiveEvidence = true;
      negativeEvidence = false;
      attempts = 0;
      reconnectDelayMs = null;
      nextReconnectAtMs = null;
      lastOpenAtMs = atMs;
      lastError = null;
      return settle(atMs);
    },
    heartbeat(sentAtMs, receivedAtMs = now()) {
      positiveEvidence = true;
      negativeEvidence = false;
      lastHeartbeatAtMs = receivedAtMs;
      const sent = finiteNumber(sentAtMs);
      latencyMs = sent === null ? latencyMs : Math.max(0, receivedAtMs - sent);
      lastError = null;
      return settle(receivedAtMs);
    },
    closed(reason, atMs = now()) {
      positiveEvidence = false;
      return markDown(reason, atMs);
    },
    failed: (error, atMs = now()) => markDown(error, atMs),
    snapshot: settle,
    shouldReconnect(atMs = now()) {
      const view = settle(atMs);
      return view.nextReconnectAtMs !== null && atMs >= view.nextReconnectAtMs && view.state !== "exhausted";
    },
    reset() {
      positiveEvidence = false;
      negativeEvidence = false;
      attempts = 0;
      reconnectDelayMs = null;
      nextReconnectAtMs = null;
      lastOpenAtMs = null;
      lastCloseAtMs = null;
      lastHeartbeatAtMs = null;
      latencyMs = null;
      lastError = null;
      return settle(now());
    },
  };
}

// === WorldView =====================================================================================
// on/emit/apply/me/get/zone: the reducer every current consumer hand-rolls today (teardown gap #4).
// Ported from the prior-art file, trimmed of Aletheon-specific wire kinds not in today's protocol.mjs
// (MSG.altar/MSG.inventory/MSG.field/MSG.chat) — a plain MSG.event / unknown-`k` passthrough covers
// the same ground generically (chat rides `event("chat", {...})`, so `on("chat", ...)` still works).

function isDead(entity) {
  const status = String(entity.status ?? "");
  return entity.aliveGlyph === "f" || entity.aliveGlyph === "⊥" || ["slain", "vanished", "ghost", "dead"].includes(status);
}

function effectNames(value) {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (entry && typeof entry === "object" && typeof entry.name === "string") return [entry.name];
        if (typeof entry === "string") return [entry];
        return [];
      })
    : [];
}

function gainedEffects(prev, next) {
  const prevNames = new Set(effectNames(prev));
  return effectNames(next).filter((name) => !prevNames.has(name));
}

function mergeEntity(prev, next, snap) {
  if (!prev) {
    const out = { ...next };
    for (const key of ["x", "y", "z", "yaw"]) {
      const v = finiteNumber(next[key]);
      if (v !== null) {
        out[key] = v;
        out[`t${key}`] = v;
      }
    }
    return out;
  }
  const out = { ...prev, ...next };
  for (const key of ["x", "y", "z", "yaw"]) {
    const v = finiteNumber(next[key]);
    if (v !== null) {
      out[`t${key}`] = v;
      if (snap) out[key] = v;
      else if (prev[key] !== undefined) out[key] = prev[key];
      else delete out[key];
    }
  }
  return out;
}

export function createWorldView(localId) {
  const entities = new Map();
  const zones = new Map();
  const listeners = new Map();
  let myZone = null;
  let targetId = null;
  let latestTick = 0;
  // localId is a LET, not a const captured forever: a fresh (non-resuming) connection only learns
  // its true server-assigned actorId when `hello` arrives — see createRealtimeClient's setLocalId use
  // below. A resumed connection keeps its ORIGINAL localId across reconnects (identity persists).
  let myId = localId;

  function emit(event, payload) {
    for (const listener of [...(listeners.get(event) ?? [])]) listener(payload);
  }
  function on(event, listener) {
    const set = listeners.get(event) ?? new Set();
    set.add(listener);
    listeners.set(event, set);
    return () => set.delete(listener);
  }
  function setTarget(id) {
    if (id === targetId) return;
    targetId = id;
    emit("target", id);
  }
  function nameOf(id) {
    return String(entities.get(id)?.name ?? id);
  }

  function diffEntity(entryId, next, prev) {
    if (!prev) {
      emit("entity-add", { id: entryId, snap: next });
    } else {
      const nextHealth = Number(next.health ?? next.hp ?? 0);
      const prevHealth = Number(prev.health ?? prev.hp ?? 0);
      const deltaHealth = nextHealth - prevHealth;
      if (deltaHealth < 0) emit("damage", { id: entryId, amount: -deltaHealth, health: nextHealth });
      if (deltaHealth > 0) emit("heal", { id: entryId, amount: deltaHealth, health: nextHealth });
      const deadNow = isDead(next);
      const deadBefore = isDead(prev);
      if (deadNow && !deadBefore) emit("died", { id: entryId, status: next.status });
      if (!deadNow && deadBefore) emit("revived", { id: entryId });
      if (Number(next.level ?? 1) > Number(prev.level ?? 1)) emit("levelup", { id: entryId, level: next.level });
      for (const gained of gainedEffects(prev.effects, next.effects)) emit("effect-gain", { id: entryId, name: gained });
      emit("entity-update", { id: entryId, snap: next, prev });
    }
    if (entryId === myId) emit("me", { snap: next, prev });
  }

  function ingestEntity(entity, snap = false) {
    if (entity.type === "zone") {
      zones.set(entity.id, entity);
      if (entity.id === myZone) emit("zone-data", entity);
      return;
    }
    const prev = entities.get(entity.id);
    const next = mergeEntity(prev, entity, snap);
    entities.set(entity.id, next);
    if (entity.id === myId && typeof entity.zone === "string" && entity.zone !== myZone) {
      myZone = entity.zone;
      emit("zone-change", { zone: myZone, data: zones.get(myZone) });
    }
    diffEntity(entity.id, next, prev);
  }

  function apply(frame) {
    if (typeof frame.tick === "number") latestTick = frame.tick;
    if (frame.type === "full") {
      entities.clear();
      zones.clear();
      for (const entity of clientEntities(frame.entities)) ingestEntity(entity, true);
      emit("snapshot", { full: true });
      return;
    }
    if (frame.type === "delta") {
      for (const entity of clientEntities(frame.entities)) ingestEntity(entity, false);
      for (const removed of stringList(frame.removed)) {
        if (entities.delete(removed)) emit("entity-remove", { id: removed });
        if (zones.delete(removed)) emit("zone-remove", { id: removed });
        if (removed === targetId) setTarget(null);
      }
      emit("snapshot", { full: false });
      return;
    }
    if (frame.k === MSG.snapshot) {
      apply({ type: "full", tick: Number(frame.tick ?? 0), entities: clientEntities(frame.e) });
      return;
    }
    if (frame.k === MSG.delta) {
      apply({ type: "delta", tick: Number(frame.tick ?? 0), entities: clientEntities(frame.c), removed: stringList(frame.g) });
      return;
    }
    if (frame.k === MSG.event) {
      emit(String(frame.t ?? "event"), frame);
      return;
    }
    if (frame.k === MSG.bye) {
      const removed = String(frame.id ?? "");
      if (entities.delete(removed)) emit("entity-remove", { id: removed });
      if (removed === targetId) setTarget(null);
      return;
    }
    // anything else (including v-next's "resumed"/"resume-failed") — a generic passthrough, named by
    // its own `k`, so new wire kinds a future room adds never crash an older client.
    if (typeof frame.k === "string") emit(frame.k, frame);
  }

  function interpolate(dtSeconds, options = {}) {
    const dt = Math.max(0, Number(dtSeconds) || 0);
    for (const entity of entities.values()) {
      if (typeof entity.tx !== "number" || typeof entity.x !== "number") continue;
      const rate = entity.id === myId ? (options.localRate ?? 22) : (options.remoteRate ?? 11);
      const k = 1 - Math.exp(-rate * dt);
      entity.x += (entity.tx - entity.x) * k;
      if (typeof entity.ty === "number" && typeof entity.y === "number") entity.y += (entity.ty - entity.y) * k;
      if (typeof entity.tz === "number" && typeof entity.z === "number") entity.z += (entity.tz - entity.z) * k;
      if (typeof entity.tyaw === "number" && typeof entity.yaw === "number") entity.yaw += shortAngle(entity.yaw, entity.tyaw) * k;
    }
  }

  return {
    on,
    emit,
    apply,
    me: () => entities.get(myId),
    myId: () => myId,
    // setLocalId — called by createRealtimeClient when a FRESH (non-resuming) connection learns its
    // server-assigned actorId from `hello`. Never called across a successful resume (the whole point
    // of resuming is that the identity does NOT change).
    setLocalId(id) {
      myId = id;
    },
    get: (id) => entities.get(id),
    zone: (id) => zones.get(id),
    currentZone: () => myZone,
    target: () => targetId,
    setTarget,
    tick: () => latestTick,
    interpolate,
    inZone: () => [...entities.values()].filter((e) => e.zone === myZone),
    nameOf,
    entities: () => [...entities.values()],
    zones: () => [...zones.values()],
  };
}

// === wire helpers ==================================================================================

export function sendJoin(socket, name) {
  if (socket.readyState === 1) socket.send(encode(join(name)));
}
export function sendIntent(socket, seq, kind, args) {
  if (socket.readyState === 1) socket.send(encode(intent(seq, { kind, args })));
}
export function sendResume(socket, token, sinceTick) {
  if (socket.readyState === 1) socket.send(encode({ k: "resume", token, sinceTick }));
}

// === OptimisticOverlay — Wave1 §6: the documented, principled alternative to client-authoritative
// prediction =======================================================================================
// `sendIntent` already carries a monotonic `seq`, and a `delta`'s `ack` already echoes the last
// server-processed seq back to the client (protocol.mjs's `delta()`, room.mjs's per-subscriber
// `ack: seqCounters.get(actorId)`) — the ack plumbing this pattern needs already exists; nothing new
// is added to the wire. An OptimisticOverlay applies the player's OWN pending intent to a LOCAL
// overlay the instant it is sent (for that one frame's rendering only), and discards it the moment
// the authoritative tick containing that seq is acked — never treating the client's own claim as
// truth, never feeding the overlay back into WorldView's authoritative state, never sent anywhere.
// This is the refusal-with-alternative for full client-authoritative prediction (which would
// contradict single-writer doctrine, §0 principle 2): the server is still the only writer; the
// overlay is a purely local, disposable rendering convenience layered on top of whatever the server
// most recently confirmed.
//
//   const overlay = createOptimisticOverlay({ predict: (entity, kind, args) => ({...}) })
//   const client = createRealtimeClient({ connect, view, overlay })   // wires register()/reconcile()
//   client.predictedMe()   // view.me() with every still-pending prediction folded on top, for render
export function createOptimisticOverlay({ predict }) {
  if (typeof predict !== "function") throw new TypeError("createOptimisticOverlay: predict(entity, kind, args) is required");
  const pending = []; // [{ seq, kind, args }], in send order — oldest (lowest seq) first

  return {
    // register — call the INSTANT an intent is sent, with the SAME seq the wire message used.
    register(seq, kind, args) {
      pending.push({ seq: seq | 0, kind: String(kind), args: args ?? {} });
    },
    // reconcile — call whenever a frame's `ack` arrives. Every pending prediction with seq <= ack has
    // now been superseded by the room's own authoritative tick (room.mjs's queue rejects seq <=
    // lastSeq, so an acked seq can never still be "in flight") — discard it; nothing to replay, the
    // authoritative state the ack came with already reflects it.
    reconcile(ack) {
      const a = ack | 0;
      while (pending.length && pending[0].seq <= a) pending.shift();
    },
    // apply — fold every STILL-pending prediction onto a base entity, oldest first, for local
    // rendering ONLY. Pure: never mutates `baseEntity`, never touches WorldView, never sent anywhere.
    apply(baseEntity) {
      let out = baseEntity;
      for (const p of pending) out = predict(out, p.kind, p.args);
      return out;
    },
    pendingCount: () => pending.length,
    clear() {
      pending.length = 0;
    },
  };
}

// === createRealtimeClient — NEW: resume-token-aware connection lifecycle ==========================
// Not a port. Small glue (per §7's own framing): manages open/close/reconnect over ANY WebSocketLike
// `connect()` factory (browser-native or client-node.mjs's hand-rolled one — this file never touches
// a socket implementation directly, only the WebSocketLike surface: readyState/send/close/on*).
//
//   const client = createRealtimeClient({ connect: () => new WebSocket(url), view, name: "wanderer" })
//   client.sendIntent(kind, args)   // auto-incrementing seq
//   client.close()                 // stop reconnecting, close the socket
//   client.policy.snapshot()       // connection state (up/stale/down/contested/exhausted)
export function createRealtimeClient({ connect, view, name = "wanderer", onState = null, policyOptions = {}, overlay = null } = {}) {
  const policy = createRealtimeConnectionPolicy(policyOptions);
  let socket = null;
  let seq = 0;
  let resumeToken = null;
  let lastKnownTick = -1;
  let closing = false;
  let reconnectTimer = null;
  let controlSequence = 0;
  const pendingControls = new Map();

  function rejectPendingControls(reason = "Connection closed") {
    for (const pending of pendingControls.values()) pending.reject(new Error(reason));
    pendingControls.clear();
  }

  function scheduleReconnect() {
    if (closing) return;
    if (!policy.shouldReconnect()) {
      const snap = policy.snapshot();
      if (snap.nextReconnectAtMs !== null) {
        const delay = Math.max(0, snap.nextReconnectAtMs - Date.now());
        reconnectTimer = setTimeout(open, delay);
      }
      return;
    }
    open();
  }

  function open() {
    if (closing) return;
    socket = connect();
    socket.onopen = () => {
      policy.opened();
      onState?.("open");
      if (resumeToken) {
        // THE RESUME-TOKEN WIRING (§4 into the reconnect path): a socket that reopens with a resume
        // token on hand sends `resume`, not a fresh `join` — it is reclaiming its OWN prior identity,
        // not spawning a new one.
        sendResume(socket, resumeToken, lastKnownTick);
        onState?.("resuming");
      } else {
        sendJoin(socket, name);
        onState?.("joining");
      }
    };
    socket.onclose = (ev) => {
      rejectPendingControls("Connection closed before the control request completed");
      policy.closed(ev?.reason ?? ev?.code ?? "closed");
      onState?.("disconnected");
      if (!closing) scheduleReconnect();
    };
    socket.onerror = (ev) => {
      policy.failed(ev?.message ?? ev);
      onState?.("error");
    };
    socket.onmessage = (ev) => {
      const message = decode(ev.data);
      if (!message) return;
      if (message.k === MSG.controlResult) {
        const pending = pendingControls.get(message.requestId);
        if (pending) {
          pendingControls.delete(message.requestId);
          if (message.ok) pending.resolve(message.result);
          else pending.reject(new Error(typeof message.error === "string" ? message.error : "Request failed"));
        }
        return;
      }
      if (message.k === MSG.hello) {
        // Only adopt hello's id/token when there is NO resume token already on hand — a reconnect
        // that is about to send `resume` gets a FRESH hello too (the server assigns every socket a
        // provisional actorId before it knows whether the client will join or resume), but that
        // provisional identity is about to be abandoned in favor of the reclaimed one, so adopting it
        // here would silently hijack a live identity. See handleResume's `resumeToken` re-issue in
        // room.mjs, which is what actually keeps `resumeToken` correctly scoped across resumes.
        if (!resumeToken) {
          view.setLocalId?.(message.id);
          if (message.world && typeof message.world.resumeToken === "string") resumeToken = message.world.resumeToken;
        }
        if (message.world && typeof message.world.tick === "number") lastKnownTick = Math.max(lastKnownTick, message.world.tick);
        return; // the open handler already decided join-vs-resume; hello itself carries no view state
      }
      if (typeof message.tick === "number") lastKnownTick = Math.max(lastKnownTick, message.tick);
      // OptimisticOverlay reconciliation: any frame carrying an `ack` (a delta, chiefly) tells the
      // overlay every prediction up to that seq is now superseded by authoritative state — see the
      // OptimisticOverlay header, above, for why this is the whole mechanism, not a new wire kind.
      if (typeof message.ack === "number") overlay?.reconcile(message.ack);
      if (message.k === "resumed") {
        // the server re-issues a token scoped to the RECLAIMED identity — adopt it so a SECOND drop
        // can resume again (the original hello's token was for the now-abandoned provisional id).
        if (typeof message.resumeToken === "string") resumeToken = message.resumeToken;
        onState?.(message.k);
      }
      if (message.k === "resume-failed") {
        resumeToken = null; // fall back to a fresh join on the next reconnect rather than looping
        onState?.(message.k);
      }
      if (message.k === "authenticated") {
        // room.mjs's auth-seam rebind: the server accepted authenticate() and reissued a resume token
        // scoped to the resolved account id — adopt it exactly like a resume's own reissue, above.
        if (typeof message.resumeToken === "string") resumeToken = message.resumeToken;
        onState?.(message.k);
      }
      if (message.k === "join-failed") {
        onState?.(message.k);
      }
      view.apply(message);
      if (message.k === MSG.snapshot) onState?.("playing");
    };
  }

  open();

  return {
    view,
    policy,
    overlay,
    sendIntent(kind, args) {
      if (!socket) return;
      seq += 1;
      sendIntent(socket, seq, kind, args);
      overlay?.register(seq, kind, args);
    },
    requestControl(payload) {
      if (!socket || socket.readyState !== 1) return Promise.reject(new Error("Not connected"));
      const requestId = `c${Date.now().toString(36)}-${(++controlSequence).toString(36)}`;
      return new Promise((resolve, reject) => {
        pendingControls.set(requestId, { resolve, reject });
        try {
          socket.send(encode({ k: MSG.control, requestId, payload }));
        } catch (error) {
          pendingControls.delete(requestId);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
    // predictedMe — the local player's own entity, with every still-pending OptimisticOverlay
    // prediction folded on top, for rendering. With no overlay configured (or nothing pending), this
    // is exactly `view.me()` — never a second source of truth, only a render-time convenience.
    predictedMe: () => (overlay ? overlay.apply(view.me()) : view.me()),
    close() {
      closing = true;
      rejectPendingControls("Client closed");
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close?.();
    },
    resumeToken: () => resumeToken,
    lastKnownTick: () => lastKnownTick,
  };
}
