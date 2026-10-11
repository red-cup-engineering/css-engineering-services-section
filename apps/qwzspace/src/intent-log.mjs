/**
 * intent-log.mjs — the canonical Intent Log Record `{ tick, seq, actorId, kind, args }`
 * (qwzspace-vnext-spec.md §2/§6) and the pure hash over it. This record is already a valid
 * `@red-cup-engineering/gaming/running` intent envelope (a plain object carrying a non-empty string
 * `kind`); canonicalJSON/roomHash route through cartridge's own canonicalJson/hashPosition
 * (red-cup.cartridge.canonical-hash/1) rather than a second hand-rolled JSON/sha256 pairing.
 */

import { createAppendOnlyLog } from "@red-cup-engineering/computer-content-graph-engineering-services-section/event-stream";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { hashPosition } from "@red-cup-engineering/gaming/running/rules";

/**
 * Re-shape a record-like object into the fixed five-key form, coercing types so a record built
 * two different ways (e.g. by room.mjs live vs. by a test fixture) hashes identically.
 * @param {object} rec
 * @returns {{tick:number,seq:number,actorId:string,kind:string,args:object}}
 */
export function canonicalRecord(rec) {
  return {
    tick: rec.tick | 0,
    seq: rec.seq | 0,
    actorId: String(rec.actorId),
    kind: String(rec.kind),
    args: rec.args ?? {},
  };
}

export function canonicalJSON(rec) {
  return canonicalJson(canonicalRecord(rec));
}

/**
 * sha256 (via cartridge's hashPosition) over the seed plus every record in the given order.
 * Order is part of what's hashed — a replay that reordered records would not be replaying the
 * same room — plus the seed, so two different seeds with an (impossibly) identical log still
 * hash apart.
 * @param {readonly object[]} log
 * @param {unknown} [seed]
 * @returns {string}
 */
export function roomHash(log, seed = "") {
  return hashPosition({ seed, log: log.map(canonicalRecord) });
}

// createIntentLog — the append-only store a Room owns. append() is meant to be called from exactly
// ONE place (the room's tick boundary, after actorId has been server-bound) — this module does not
// enforce that itself (it has no notion of "the tick boundary"), it only refuses to let a record be
// mutated after appending (canonicalRecord always returns a fresh object).
export function createIntentLog(seed = "") {
  const records = createAppendOnlyLog({ canonicalize: canonicalRecord });
  return {
    append: records.append,
    all: records.all,
    since: (tick) => records.all().filter((r) => r.tick > tick),
    upto: (tick) => records.all().filter((r) => r.tick <= tick),
    length: records.length,
    hash: (uptoTick = Infinity) =>
      roomHash(uptoTick === Infinity ? records.all() : records.all().filter((r) => r.tick <= uptoTick), seed),
    seed,
  };
}
