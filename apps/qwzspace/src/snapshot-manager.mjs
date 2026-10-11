// QwzSpace names this a snapshot manager because its entries are room/entity
// snapshots. The cache, dirty refresh, and subscriber diffing now live in the
// generic event-stream data service; this adapter preserves QwzSpace's wire
// frame vocabulary (`tick`, `entities`, `ack`) and its game-facing contract.

import { createIncrementalProjection } from "@red-cup-engineering/computer-content-graph-engineering-services-section/event-stream";

function roomFrame(frame) {
  const out = { type: frame.type, tick: frame.step, entities: frame.entries };
  if (frame.type === "delta") out.removed = frame.removed;
  if (frame.acknowledged !== undefined) out.ack = frame.acknowledged | 0;
  return out;
}

export function createSnapshotManager({ subjectsOf, snapOf, interest = null }) {
  if (typeof subjectsOf !== "function") throw new TypeError("snapshot-manager: subjectsOf(tick) is required");
  if (typeof snapOf !== "function") throw new TypeError("snapshot-manager: snapOf(id, tick) is required");

  const projection = createIncrementalProjection({ subjectsOf, entryOf: snapOf, interest, idOf: (entry) => entry.id });
  function subscribe(subscriberId) {
    const subscriber = projection.subscribe(subscriberId);
    return {
      id: subscriber.id,
      full: (tick) => roomFrame(subscriber.full(tick)),
      delta: (tick, ack = 0) => roomFrame(subscriber.delta(tick, ack)),
      drop: subscriber.drop,
    };
  }
  return {
    bootstrap: async (tick) => roomFrame(await projection.bootstrap(tick)),
    resettle: async (dirty, tick) => roomFrame(await projection.refresh(dirty, tick)),
    full: (tick) => roomFrame(projection.full(tick)),
    subscribe,
    has: projection.has,
    size: projection.size,
  };
}
