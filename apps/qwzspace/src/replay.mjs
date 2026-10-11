/**
 * replay.mjs — reconstructs a room's folded state from its seed and intent log
 * (qwzspace-vnext-spec.md §6), calling runTick for every tick 1..totalTicks (required, since the
 * log only holds ticks with an accepted intent) via the SAME subjectsOf/snapOf/runTick the live
 * room uses — not a second engine.
 */

import { createSnapshotManager } from "./snapshot-manager.mjs";
import { roomHash as roomHashOf } from "./intent-log.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { hashPosition } from "@red-cup-engineering/gaming/running/rules";
import { replayEventStream } from "@red-cup-engineering/computer-content-graph-engineering-services-section/event-stream";

/**
 * Cartridge hashPosition over a full snapshot frame's entities, sorted by their own canonical
 * encoding so hashing does not depend on insertion/Map-iteration order.
 * @param {{tick:number, entities?:readonly object[]}} fullFrame
 * @returns {string}
 */
export function stateHash(fullFrame) {
  const entities = [...(fullFrame.entities ?? [])].map((e) => canonicalJson(e)).sort();
  return hashPosition({ tick: fullFrame.tick | 0, entities });
}

/**
 * Runs `log`'s records through the game's own runTick, tick by tick, from a fresh
 * snapshot-manager. `onTick(tick, fullFrame)`, if given, is called after each tick settles —
 * optional and additive, for a scrubbing/spectating consumer that wants a per-tick history.
 * @param {readonly object[]} log
 * @param {{subjectsOf:Function, snapOf:Function, runTick:Function, totalTicks:number, onTick?:Function|null}} opts
 * @returns {Promise<{tick:number, snapshot:object, full:Function}>}
 */
export async function replay(log, { subjectsOf, snapOf, runTick, totalTicks, onTick = null }) {
  if (typeof subjectsOf !== "function" || typeof snapOf !== "function" || typeof runTick !== "function") {
    throw new TypeError("replay: subjectsOf, snapOf, and runTick are required (the game's own three functions)");
  }
  if (!Number.isInteger(totalTicks) || totalTicks < 0) {
    throw new TypeError("replay: totalTicks (the number of ticks the room actually ran) is required");
  }

  const snapshot = createSnapshotManager({ subjectsOf, snapOf });
  await snapshot.bootstrap(0);

  // Reconstructs the requested prefix only; records beyond totalTicks are ignored.
  await replayEventStream(log.filter((record) => Number.isInteger(record.tick) && record.tick >= 1 && record.tick <= totalTicks), {
    totalSteps: totalTicks,
    stepOf: (record) => record.tick,
    valueOf: (record) => ({ actorId: record.actorId, kind: record.kind, args: record.args }),
    apply: async (tick, intents) => {
      const result = (await runTick(tick, intents)) ?? {};
      await snapshot.resettle(result.dirty ?? [], tick);
      if (onTick) onTick(tick, snapshot.full(tick));
      return result;
    },
  });

  return {
    tick: totalTicks,
    snapshot,
    full: (atTick = totalTicks) => snapshot.full(atTick),
  };
}

/**
 * Standalone verification entry point: replays a room's seed+log from scratch and reports
 * whether the replayed state hash matches a caller-supplied `liveStateHash` — portable, needing
 * no live room, only the log and the game's own pure functions.
 * @param {{seed:unknown, log:readonly object[], totalTicks:number, subjectsOf:Function, snapOf:Function, runTick:Function, liveStateHash?:string}} opts
 * @returns {Promise<{ok:boolean|undefined, replayedStateHash:string, replayedLogHash:string, liveStateHash:string|null, tick:number}>}
 */
export async function verifyRoomHistory({ seed, log, totalTicks, subjectsOf, snapOf, runTick, liveStateHash }) {
  const replayed = await replay(log, { subjectsOf, snapOf, runTick, totalTicks });
  const replayedStateHash = stateHash(replayed.full());
  const replayedLogHash = roomHashOf(log, seed);
  return {
    ok: liveStateHash === undefined ? undefined : liveStateHash === replayedStateHash,
    replayedStateHash,
    replayedLogHash,
    liveStateHash: liveStateHash ?? null,
    tick: totalTicks,
  };
}
