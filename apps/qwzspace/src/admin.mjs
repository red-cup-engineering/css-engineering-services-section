// admin — a read-only observability surface over the realtime transport
// pattern. NEW module. This exposes exactly what room.mjs already computes internally
// (members()/checkpoints()/auditResults()/log.length()/queue.depth()) as JSON plus a minimal
// unstyled HTML table — the Wave1 answer to "what's in this room right now" having no answer today
// besides reading source. Not a Colyseus-grade rich UI; a programmatic surface first, a table second.
//
// TICK JITTER AND WIRE COUNTS are NOT things room.mjs tracks internally — nothing in this package's
// core owns a metrics timeline, by design (§0's discipline: the engine has no opinion the game or its
// operator did not ask for). `attachRoomMeters` gets them the SAME way `examples/head-to-head/
// run-session.mjs` already does, from OUTSIDE the room: wrapping `room.hub.send`/`broadcast` for wire
// counts (no source edit — the exact technique that example uses), and polling `room.tickNow()` on a
// short interval for tick-interval samples (the same external-sampler technique
// `examples/head-to-head/run-session.mjs`'s own `sampler` uses) since Room has no "a tick just
// happened" event to subscribe to instead. Both are reused patterns, not new invented mechanisms.

import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";
import { encode } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";

const DEFAULT_JITTER_WINDOW = 50;
const DEFAULT_POLL_MS = 5;

// attachRoomMeters — wire byte/message counting (send/broadcast wrapped, best-effort, matches
// broadcast-hub.mjs's own "never awaited" discipline) PLUS a bounded window of recent tick-to-tick
// intervals, for one room. Returns a handle with `summary()` (a plain object safe to JSON.stringify)
// and `stop()` (clears the polling timer — call this when the room is destroyed).
export function attachRoomMeters(room, { jitterWindow = DEFAULT_JITTER_WINDOW, pollMs = DEFAULT_POLL_MS } = {}) {
  let messages = 0;
  let bytes = 0;
  const origSend = room.hub.send.bind(room.hub);
  const origBroadcast = room.hub.broadcast.bind(room.hub);
  // Bytes are measured through the same `encode` the transports use, so a room with entry packing
  // on reports what actually crossed the wire, not the flat JSON it would have sent unpacked.
  const wireBytes = (obj) => Buffer.byteLength(typeof obj === "string" ? obj : encode(obj, { pack: room.pack === true }));
  room.hub.send = (client, obj) => {
    messages++;
    bytes += wireBytes(obj);
    return origSend(client, obj);
  };
  room.hub.broadcast = (obj) => {
    const n = room.hub.size();
    messages += n;
    bytes += wireBytes(obj) * n;
    return origBroadcast(obj);
  };

  const intervals = [];
  let lastTick = room.tickNow();
  let lastAt = null;
  const timer = setInterval(() => {
    const t = room.tickNow();
    if (t === lastTick) return;
    lastTick = t;
    const now = Date.now();
    if (lastAt !== null) {
      intervals.push(now - lastAt);
      while (intervals.length > jitterWindow) intervals.shift();
    }
    lastAt = now;
  }, pollMs);
  if (typeof timer.unref === "function") timer.unref();

  function jitterStats() {
    if (!intervals.length) return { samples: 0, meanMs: null, stddevMs: null, minMs: null, maxMs: null };
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    return {
      samples: intervals.length,
      meanMs: mean,
      stddevMs: Math.sqrt(variance),
      minMs: Math.min(...intervals),
      maxMs: Math.max(...intervals),
    };
  }

  return {
    summary: () => ({ wire: { messages, bytes }, tickJitter: jitterStats() }),
    reset() {
      messages = 0;
      bytes = 0;
      intervals.length = 0;
      lastAt = null;
    },
    stop() {
      clearInterval(timer);
    },
  };
}

function roomSummary(id, room, meter) {
  return {
    id,
    tick: room.tickNow(),
    memberCount: room.members().size,
    members: [...room.members().entries()].map(([actorId, m]) => ({ actorId, name: m.name ?? null, joinedAtTick: m.joinedAtTick })),
    queueDepth: room.queue.depth(),
    logLength: room.log.length(),
    checkpoints: room.checkpoints(),
    auditResults: room.auditResults(),
    ...(meter ? meter.summary() : {}),
  };
}

// The HTML view is a TUFTE document (this package's own presentation boundary, `tufte.mjs`'s
// discipline applied to the ops surface): QwzSpace supplies the data, TUFTE owns markup, escaping,
// tables, and the calm base styles -- no hand-rolled HTML or a second escapeHtml here. The tick-
// numbered `revision` and `tick` make the page an ordinary TUFTE projection a browser could patch.
const jitterText = (j) => (j && j.meanMs !== null ? `${j.meanMs.toFixed(1)}ms ± ${j.stddevMs.toFixed(1)}ms (max ${j.maxMs}ms)` : "—");
const wireText = (w) => (w ? `${w.messages} msgs / ${w.bytes} B` : "—");

export function adminTufteModel(payload, { path = "/admin" } = {}) {
  const rooms = payload.rooms;
  const maxTick = rooms.reduce((max, r) => Math.max(max, r.tick), 0);
  const roomsTable = {
    caption: `${rooms.length} tracked room(s)`,
    columns: [
      { id: "id", label: "room", rowHeader: true },
      { id: "tick", label: "tick", align: "end" },
      { id: "members", label: "members", align: "end" },
      { id: "queue", label: "queue", align: "end" },
      { id: "log", label: "log", align: "end" },
      { id: "checkpoints", label: "checkpoints", align: "end" },
      { id: "wire", label: "wire" },
      { id: "jitter", label: "tick jitter" },
    ],
    rows: rooms.map((r) => [
      { text: r.id, href: `${path}/${encodeURIComponent(r.id)}?html` },
      String(r.tick), String(r.memberCount), String(r.queueDepth), String(r.logLength), String(r.checkpoints.length),
      wireText(r.wire), jitterText(r.tickJitter),
    ]),
    empty: "No rooms are currently tracked.",
  };
  const perRoom = rooms.flatMap((r, index) => {
    const lastAudit = r.auditResults[r.auditResults.length - 1];
    return [
      {
        id: `room-${index + 1}-members`, title: `${r.id} · members`, eyebrow: `tick ${r.tick}`, span: 6,
        table: {
          columns: [{ id: "actor", label: "actor", rowHeader: true }, { id: "name", label: "name" }, { id: "joined", label: "joined at tick", align: "end" }],
          rows: r.members.map((m) => [m.actorId, m.name ?? "—", String(m.joinedAtTick)]),
          empty: "No members are present.",
        },
      },
      {
        id: `room-${index + 1}-checkpoints`, title: `${r.id} · checkpoints`, eyebrow: "replay-verifiable room", span: 6,
        confidence: lastAudit ? (lastAudit.ok ? "high" : "low") : "medium",
        table: {
          columns: [{ id: "tick", label: "tick", rowHeader: true, align: "end" }, { id: "state", label: "state hash" }, { id: "log", label: "log hash" }],
          rows: r.checkpoints.map((c) => [String(c.tick), c.stateHash, c.logHash]),
          empty: "No checkpoint has been taken yet.",
        },
      },
      ...(r.auditResults.length ? [{
        id: `room-${index + 1}-audits`, title: `${r.id} · self-audits`, eyebrow: lastAudit.ok ? "last audit ok" : "last audit FAILED", span: 12,
        lifecycle: lastAudit.ok ? "present" : "imminent",
        table: {
          columns: [{ id: "tick", label: "tick", rowHeader: true, align: "end" }, { id: "ok", label: "ok" }, { id: "live", label: "live hash" }, { id: "replayed", label: "replayed hash" }, { id: "at", label: "at" }],
          rows: r.auditResults.map((a) => [String(a.tick), a.ok ? "yes" : `no${a.error ? ` (${a.error})` : ""}`, a.liveHash ?? "—", a.replayedHash ?? "—", new Date(a.at).toISOString()]),
        },
      }] : []),
    ];
  });
  return {
    title: "qwzspace admin",
    eyebrow: "QwzSpace",
    subtitle: `generated ${new Date(payload.generatedAt).toISOString()} — ${rooms.length} room(s)`,
    revision: `tick-${maxTick}`,
    tick: maxTick,
    tiles: [{ id: "rooms", title: "Rooms", span: 12, live: "polite", table: roomsTable }, ...perRoom],
  };
}

function renderHtml(payload, path) {
  return renderTufteDocument(adminTufteModel(payload, { path }), { documentTitle: "qwzspace admin" });
}

// createAdminHandler — a node:http request handler exposing every currently-tracked room's summary.
// `rooms` is a `Map<id, Room>` (or anything with `.entries()`); the caller decides what "currently
// tracked" means — a room-registry's live Map, a lobby's, or a hand-built one for a single room.
// `meters` (optional) is a `Map<id, ReturnType<typeof attachRoomMeters>>` for the wire/jitter columns.
//
//   GET <path>          -> JSON { generatedAt, rooms: [...] }
//   GET <path>?html      -> the same data as a plain HTML table
//   GET <path>/<id>      -> JSON for exactly one room, or 404
//
// Returns `false` (and touches nothing on `res`) for a request outside `path`, so a caller can COMPOSE
// this handler alongside its own routing rather than owning the whole server.
export function createAdminHandler({ rooms, meters = new Map(), path = "/admin" } = {}) {
  if (!rooms || typeof rooms.entries !== "function") throw new TypeError("admin: rooms (a Map-like of id -> Room) is required");

  function payloadFor(filterId = null) {
    const out = [];
    for (const [id, room] of rooms.entries()) {
      if (filterId !== null && id !== filterId) continue;
      out.push(roomSummary(id, room, meters.get(id) ?? null));
    }
    return { generatedAt: Date.now(), rooms: out };
  }

  return function handler(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith(path)) return false;
    if (req.method !== "GET") {
      res.writeHead(405, { "content-type": "text/plain" }).end("method not allowed");
      return true;
    }
    const rest = url.pathname.slice(path.length).replace(/^\//, "");
    const payload = rest ? payloadFor(rest) : payloadFor();
    if (rest && payload.rooms.length === 0) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return true;
    }
    if (url.searchParams.has("html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(renderHtml(payload, path));
    } else {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify(payload));
    }
    return true;
  };
}
