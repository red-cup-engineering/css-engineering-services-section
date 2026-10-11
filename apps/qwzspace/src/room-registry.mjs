// room-registry — the thin, first-class "list/create/get/destroy rooms" surface the current package
// does not have (the teardown's gap #6: "room" today is entirely emergent from a game's `interest`
// predicate). NEW module, deliberately small: it owns a `Map<id, Room>` and nothing else. Each room
// keeps its OWN tick cadence, queue, snapshot cache, and intent log (room.mjs) — the registry never
// shares a clock, a queue, or a cache across rooms, because a room's replay-verifiability (§6) is a
// property of THAT room's log; coupling clocks across rooms would let a bug in one room's tick ever
// explain a hash mismatch in another's.

import { createRoom } from "./room.mjs";

// createRoomRegistry — `factory(id, opts)` returns the options object `createRoom` needs (runTick,
// subjectsOf, snapOf, validate, ...) for a room of the given id; the registry does not interpret them.
export function createRoomRegistry({ factory }) {
  if (typeof factory !== "function") throw new TypeError("room-registry: factory(id, opts) is required");
  const rooms = new Map();

  return {
    create(id, opts) {
      if (rooms.has(id)) throw new Error(`room-registry: room "${id}" already exists`);
      const room = createRoom({ id, ...factory(id, opts) });
      rooms.set(id, room);
      return room;
    },
    get: (id) => rooms.get(id) ?? null,
    has: (id) => rooms.has(id),
    list: () => [...rooms.keys()],
    size: () => rooms.size,
    destroy(id) {
      const room = rooms.get(id);
      if (!room) return false;
      room.destroy();
      rooms.delete(id);
      return true;
    },
    destroyAll() {
      for (const id of [...rooms.keys()]) this.destroy(id);
    },
  };
}
