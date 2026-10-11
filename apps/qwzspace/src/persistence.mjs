// persistence — a room snapshot/history persistence SEAM plus one zero-dep reference store. NEW
// module. This closes the most severe gap the market-teardown review found: today even the in-memory
// checkpoint array room.mjs keeps (capped at 20 entries) is lost on restart, so a process crash loses
// the WHOLE room, not just its uncheckpointed ticks — the honest single-writer story currently means
// "single point of failure."
//
// THE ADAPTER SEAM is the exported STORE INTERFACE, not any one implementation: anything with
// `appendRecords(roomId, records)`, `readAllRecords(roomId)`, `saveCheckpoint(roomId, checkpoint)`,
// `loadCheckpoint(roomId)`, and `clear(roomId)` works — qwzspace does not pick a database, matching
// every other injected-not-owned seam in this package (world/validate/interest all work the same way).
// `createFileStore` below is the one reference implementation this package ships.
//
// createFileStore's on-disk layout is LIFTED (append-only-JSONL, root-dir-as-a-parameter, "nothing is
// ever rewritten in place" discipline) from
// `.../computer-game-system-services-section/services/footing/src/store.mjs`'s own
// `runs/<date>.jsonl` bucket pattern (the MUD/tournament lanes' reference implementation for local,
// crash-safe, lock-free persistence) — adapted from one file per DATE to one directory ("bucket") per
// ROOM, since a room's own history is the natural bucket boundary here, not a calendar day. Root
// directory is a constructor parameter, never a hardcoded path, matching that lineage exactly.
//
// WHY THIS STAYS HONEST ABOUT "CHECKPOINT-RESUME": room.mjs's own scope note already states
// self-audit replays from tick 0, not from a checkpoint, because incremental resume would need the
// GAME to serialize/restore its own folded domain state, which this engine intentionally does not
// own. `restoreRoom` below does NOT contradict that — it does not try to reconstruct folded state
// from a checkpoint's hash (a hash is not invertible). Instead it re-derives the room by re-running
// its ENTIRE persisted intent log through the room's OWN live queue/tick machinery
// (`room.queue.push` + `room.stepOnce()`, the exact same primitives a hand-driven test already uses),
// which is real, working checkpoint-resume for the wire/process-restart sense of "resume" (a fresh
// process re-earns its state instead of losing it outright) — the checkpoint record is used only as
// an INTEGRITY CHECK against that replay (an honest verification, never a state shortcut), exactly
// the role room.mjs's own header already assigns checkpoints.

import { mkdir, appendFile, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { replay, stateHash } from "./replay.mjs";

function safeName(roomId) {
  const s = String(roomId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return s || "_";
}

// createFileStore — the reference STORE implementation. Layout under `dir`:
//   <dir>/<roomId>/log.jsonl           one line per intent-log record, append-only, never rewritten
//   <dir>/<roomId>/checkpoints.jsonl   one line per checkpoint, append-only; loadCheckpoint reads the
//                                      LAST line (the newest), matching "nothing rewritten in place"
//                                      even for what would naively be a single-overwrite file.
export function createFileStore({ dir }) {
  if (typeof dir !== "string" || !dir) throw new TypeError("persistence: createFileStore requires { dir }");

  function bucketDir(roomId) {
    return join(dir, safeName(roomId));
  }
  function logPath(roomId) {
    return join(bucketDir(roomId), "log.jsonl");
  }
  function checkpointsPath(roomId) {
    return join(bucketDir(roomId), "checkpoints.jsonl");
  }

  async function readJSONL(file) {
    try {
      const text = await readFile(file, "utf8");
      const out = [];
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) out.push(JSON.parse(trimmed));
      }
      return out;
    } catch (e) {
      if (e && e.code === "ENOENT") return [];
      throw e;
    }
  }

  async function appendJSONL(file, records) {
    if (!records.length) return;
    await mkdir(dirname(file), { recursive: true });
    const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
    await appendFile(file, lines, "utf8");
  }

  return {
    async appendRecords(roomId, records) {
      await appendJSONL(logPath(roomId), records);
    },
    async readAllRecords(roomId) {
      return readJSONL(logPath(roomId));
    },
    async saveCheckpoint(roomId, checkpoint) {
      await appendJSONL(checkpointsPath(roomId), [checkpoint]);
    },
    async loadCheckpoint(roomId) {
      const all = await readJSONL(checkpointsPath(roomId));
      return all.length ? all[all.length - 1] : null;
    },
    async clear(roomId) {
      await rm(bucketDir(roomId), { recursive: true, force: true });
    },
    async writeFileRaw(relPath, text) {
      // an escape hatch a caller MAY use for its own adjacent bucket files (e.g. a game's own
      // domain-specific export) — not used by attachPersistence/restoreRoom themselves, offered only
      // because footing's own bucket-store.mjs precedent composes extra per-bucket files this way.
      const full = join(dir, safeName(relPath));
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, text, "utf8");
    },
  };
}

// attachPersistence — periodically flushes a LIVE room's new-since-last-flush intent-log records and
// checkpoints to `store`. Polls (same external-sampler technique `admin.mjs`'s tick-jitter tracker and
// `examples/head-to-head/run-session.mjs`'s own sampler already use) because Room has no "a tick just
// happened" event to subscribe to instead — `room.log.since(tick)` and `room.checkpoints()` are both
// cheap, already-existing reads, so polling costs is bounded by log growth, not reintroduced work.
export function attachPersistence(room, store, { flushEveryMs = 1000 } = {}) {
  if (!store || typeof store.appendRecords !== "function") throw new TypeError("persistence: store is required");
  let lastPersistedTick = 0;
  let lastCheckpointCount = 0;
  let flushing = false;

  async function flushOnce() {
    if (flushing) return; // coalesce, the same overrun-guard discipline room.mjs's own tickOnce uses
    flushing = true;
    try {
      const fresh = room.log.since(lastPersistedTick);
      if (fresh.length) {
        await store.appendRecords(room.id, fresh);
        lastPersistedTick = fresh[fresh.length - 1].tick;
      }
      const cps = room.checkpoints();
      if (cps.length > lastCheckpointCount) {
        for (const cp of cps.slice(lastCheckpointCount)) await store.saveCheckpoint(room.id, cp);
        lastCheckpointCount = cps.length;
      }
    } finally {
      flushing = false;
    }
  }

  const timer = setInterval(() => {
    flushOnce().catch((e) => console.error("[qwzspace] persistence flush error:", e));
  }, flushEveryMs);
  if (typeof timer.unref === "function") timer.unref();

  return {
    flushNow: flushOnce,
    stop() {
      clearInterval(timer);
    },
  };
}

// restoreRoom — re-derive a FRESH (not yet started, tick 0) room's state from `store`'s persisted
// history, by pushing every historical record onto the room's own queue and hand-driving `stepOnce()`
// once per historical tick (including empty ticks — a room's own tick fires on cadence, not on
// traffic, per replay.mjs's own header, and this loop preserves that). After this resolves, the room
// behaves exactly as if it had been running the whole time: same tick counter, same log, same
// live-derived state, same log.hash() at any tick a caller checks. Call this BEFORE `room.start()`.
export async function restoreRoom(room, store) {
  const records = await store.readAllRecords(room.id);
  if (!records.length) return { tick: room.tickNow(), restoredTicks: 0, integrity: null };

  const byTick = new Map();
  for (const rec of records) {
    const arr = byTick.get(rec.tick) ?? [];
    arr.push(rec);
    byTick.set(rec.tick, arr);
  }
  const totalTicks = records[records.length - 1].tick;
  const startTick = room.tickNow();

  for (let t = startTick + 1; t <= totalTicks; t++) {
    for (const rec of byTick.get(t) ?? []) {
      room.queue.push({ actorId: rec.actorId, seq: rec.seq, kind: rec.kind, args: rec.args });
    }
    await room.stepOnce();
  }

  const checkpoint = await store.loadCheckpoint(room.id);
  let integrity = null;
  if (checkpoint && Number.isInteger(checkpoint.tick) && checkpoint.tick <= room.tickNow()) {
    integrity = { atTick: checkpoint.tick, ok: room.log.hash(checkpoint.tick) === checkpoint.logHash, expectedLogHash: checkpoint.logHash, actualLogHash: room.log.hash(checkpoint.tick) };
  }
  return { tick: room.tickNow(), restoredTicks: totalTicks - startTick, integrity };
}

// verifyStoredHistory — the store-only sibling of room.mjs's `verify()`: re-derives a state hash from
// `store`'s persisted records alone (no live room object required at all — the same "anyone holding
// the log and the game's pure functions can check it" portability replay.mjs's own
// `verifyRoomHistory` documents), and reports whether it matches the store's last saved checkpoint.
// Useful for an operator checking a room's on-disk integrity WITHOUT spinning up the room itself.
export async function verifyStoredHistory({ store, roomId, subjectsOf, snapOf, runTick }) {
  const records = await store.readAllRecords(roomId);
  const checkpoint = await store.loadCheckpoint(roomId);
  if (!records.length) return { tick: 0, ok: null, checkpoint: null };
  const totalTicks = checkpoint && Number.isInteger(checkpoint.tick) ? checkpoint.tick : records[records.length - 1].tick;
  const replayed = await replay(records, { subjectsOf, snapOf, runTick, totalTicks });
  const replayedHash = stateHash(replayed.full());
  return {
    tick: totalTicks,
    replayedStateHash: replayedHash,
    checkpoint,
    ok: checkpoint ? replayedHash === checkpoint.stateHash : null,
  };
}
