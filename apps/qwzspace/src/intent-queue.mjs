// intent-queue — the SINGLE-WRITER seam. LIFTED from apps/games/ruinfold/server/actions.mjs and
// generalized: ruinfold's `validate` (its 20-odd game intents) was the trust boundary AND the
// queue; qwzspace keeps only the queue and takes the validator as an argument, because the engine
// has no opinion about a game's intents — only about the discipline.
//
// THE DISCIPLINE (why this exists): an inbound message (an HTTP POST, a WebSocket frame) NEVER
// touches the world. It is validated into a clean intent and QUEUED; the tick-driver drains the
// queue and is the ONLY thing that ever appends to the append-only trace. So concurrent clients
// posting at once can never race the log — their intents simply line up for the next tick (the tick
// is a transaction boundary, and draining here is what lines clients up behind one another). This is
// the law's "state is an append-only trace, the tick is the single writer" made operational.
//
// An intent is a small plain object the game's validator produces (e.g. { kind, actor, ...args }).
// validate() is the trust boundary: it shapes raw JSON from the network into a known intent, or
// returns a falsy value to REJECT. The queue itself is dumb — it only enforces ordering.
//
//   const q = createIntentQueue({ validate })  // validate: (raw) => intent | null
//   q.push(rawJson)   -> the accepted intent, or null if the validator rejected it
//   q.drain()         -> everything queued since the last drain (and resets); the tick's input
//   q.depth()         -> how many intents are waiting (for backpressure / metrics)

import { createValidatedQueue } from "@red-cup-engineering/computer-content-graph-engineering-services-section/event-stream";

// id — a reusable safe-id validator a game's validate() can borrow: a non-empty string of a sane
// length and charset (no path tricks, no log injection). An actor/target is addressed by id, which
// commonly becomes a subject/filename, so keep it tight. LIFTED from ruinfold/server/actions.mjs.
export function id(v) {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(v) ? v : null;
}

// num — coerce to a finite number or null (rejects NaN / Infinity / non-numeric strings). The other
// reusable primitive a game's validate() leans on. LIFTED from ruinfold/server/actions.mjs.
export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// createIntentQueue — the ordered, single-writer staging area. `validate` is the game's trust
// boundary; if omitted, the queue passes raw objects through unchanged (the game validated upstream).
export function createIntentQueue({ validate = (raw) => (raw && typeof raw === "object" ? raw : null) } = {}) {
  return createValidatedQueue({ validate });
}
