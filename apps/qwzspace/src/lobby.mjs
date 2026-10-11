// lobby — matchmaking/discovery, built the SAME way as any other room, per the market-teardown's
// Wave1 design: the set of joinable rooms is itself a snapOf-able subject (one row per room), so
// listing/filtering rooms is an ordinary interest-filtered read (§1/§5 of the vnext spec), not a new
// wire kind. NEW module. Wraps room-registry.mjs (unchanged, not forked) with the two things a
// discovery surface needs that a bare registry does not: name-based addressing (so a client can join
// "arena-3" without already knowing its opaque id) and capacity (so "joinable" is a real predicate,
// not just "exists").
//
// HONEST SCOPE NOTE (read before wiring `createLobbyWorld` into `createRoom`): a lobby's `snapOf`
// reads OTHER rooms' live member counts — state that belongs to those rooms' own logs, not the
// lobby's. That means a lobby room's `verify()`/self-audit (room.mjs §6) is NOT meaningful the way it
// is for an ordinary room: replaying the lobby's own intent log from scratch reconstructs which rooms
// were create/destroy'd through the lobby, but NOT their live member counts at any past tick (those
// were never part of the lobby's log to begin with — they are queried live, every snapOf call). This
// is the same "domain state is injected and opaque" honesty the package's own README already states
// for checkpoints (`Checkpoints are integrity markers, not fast-resume snapshots`) — a lobby is simply
// a domain whose whole point is to reflect state it does not own, so §6's purity obligation does not
// apply to it. `createLobbyWorld` still works perfectly as an ordinary `createServer()`/`createRoom()`
// world for LIVE listing and `room.create`/`room.destroy` intents — only `verify()` on the lobby room
// itself is the thing not to reach for.

import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";

import { createRoomRegistry } from "./room-registry.mjs";

// createLobbyRegistry — a room-registry PLUS name/capacity bookkeeping. `factory(id, opts)` is the
// SAME contract room-registry.mjs already defines (it is the thing actually handed to createRoom for
// each created room); the lobby only adds a side table of `{ name, capacity, metadata }` keyed by the
// same id, and the name->id / capacity/joinable views a discovery UI needs.
export function createLobbyRegistry({ factory, defaultCapacity = Infinity } = {}) {
  if (typeof factory !== "function") throw new TypeError("lobby: factory(id, opts) is required");
  const registry = createRoomRegistry({ factory });
  const meta = new Map(); // id -> { name, capacity, metadata }

  function findByName(name) {
    for (const [id, m] of meta) if (m.name === name) return id;
    return null;
  }

  function uniqueId(base) {
    if (!registry.has(base)) return base;
    let n = 2;
    while (registry.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  // create — `name` is required and must be unique among CURRENTLY-tracked rooms (a discovery surface
  // where two rooms answer to the same name is not addressable-by-name at all, so this rejects rather
  // than silently disambiguating). The room's id is derived from the name (slugified, de-duplicated
  // against any id collision) unless `id` is given explicitly.
  function create(name, opts, { id, capacity = defaultCapacity, metadata = {} } = {}) {
    if (typeof name !== "string" || !name.trim()) throw new TypeError("lobby: create(name, ...) requires a non-empty name");
    if (findByName(name)) throw new Error(`lobby: a room named "${name}" already exists`);
    const roomId = id ?? uniqueId(slugify(String(name ?? "")) || "room");
    const room = registry.create(roomId, opts);
    meta.set(roomId, { name, capacity, metadata });
    return room;
  }

  // entry — the discovery-facing view of one room: live member count read straight off the room
  // (never cached here — a lobby subject's whole point is to be a live reflection), joined against
  // this registry's own name/capacity bookkeeping.
  function entry(id) {
    const room = registry.get(id);
    if (!room) return null;
    const m = meta.get(id) ?? { name: id, capacity: defaultCapacity, metadata: {} };
    const memberCount = room.members().size;
    return { id, name: m.name, capacity: m.capacity, memberCount, joinable: memberCount < m.capacity, metadata: m.metadata };
  }

  function list() {
    return registry.list().map(entry).filter(Boolean);
  }

  // join — the read half of "join room X by name": resolves a name to its room ONLY if it exists and
  // has capacity. Actually connecting a client to that room's own transport (its own port/attach) is
  // the caller's job — a lobby lists and vouches for joinability, it does not proxy another room's
  // live socket traffic through itself.
  function join(name) {
    const id = findByName(name);
    if (!id) return null;
    const e = entry(id);
    if (!e || !e.joinable) return null;
    return registry.get(id);
  }

  function destroy(id) {
    meta.delete(id);
    return registry.destroy(id);
  }

  function destroyAll() {
    meta.clear();
    registry.destroyAll();
  }

  return {
    create,
    get: registry.get,
    has: registry.has,
    list,
    size: registry.size,
    destroy,
    destroyAll,
    findByName,
    join,
    entry,
  };
}

// createLobbyWorld — the lobby AS a world (`{ runTick, subjectsOf, snapOf }`), so it can be served
// through `createServer()`/`createRoom()` exactly like any other domain, per this module's header:
// listing is an ordinary interest-filtered read, and `room.create`/`room.destroy` are ordinary
// intents. `room.join` is deliberately NOT a runTick-handled intent (see the header's honest scope
// note and `join`, above) — it is answered as a synchronous query against `lobby`, not folded state.
export function createLobbyWorld(lobby) {
  return function lobbyWorld() {
    async function runTick(tick, intents) {
      const dirty = new Set();
      for (const it of intents) {
        const { kind, args } = it;
        if (kind === "room.create") {
          try {
            const room = lobby.create(String(args?.name ?? ""), args?.opts, {
              capacity: Number.isFinite(args?.capacity) ? args.capacity : undefined,
              metadata: args?.metadata && typeof args.metadata === "object" ? args.metadata : {},
            });
            dirty.add(room.id);
          } catch {
            // a rejected create (duplicate name, missing name) is a no-op tick, not a crash — the
            // same "reject, never throw into the loop" discipline every wire boundary in this package
            // already holds (room.mjs's wireConnection, intent-queue.mjs's push).
          }
          continue;
        }
        if (kind === "room.destroy") {
          const targetId = typeof args?.id === "string" ? args.id : lobby.findByName(String(args?.name ?? ""));
          if (targetId && lobby.destroy(targetId)) dirty.add(targetId);
          continue;
        }
        // unknown kind: ignored — a future lobby feature must not crash an older lobby's tick.
      }
      return { dirty: [...dirty] };
    }

    async function subjectsOf() {
      return lobby.list().map((e) => e.id);
    }

    async function snapOf(id) {
      const e = lobby.entry(id);
      if (!e) return null;
      return { id: e.id, kind: "room", name: e.name, capacity: e.capacity, memberCount: e.memberCount, joinable: e.joinable, metadata: e.metadata };
    }

    return { runTick, subjectsOf, snapOf };
  };
}

// lobbyValidate — a ready-to-use `validate(raw, actorId)` for a `createRoom()` hosting a lobby world:
// accepts `room.create`/`room.destroy` intents with the shapes `runTick` above expects, rejects
// anything else. A game wanting extra lobby intent kinds writes its own validate; this one is the
// zero-config default so a lobby is usable out of the box.
export function lobbyValidate(raw) {
  if (raw && raw.kind === "room.create") {
    const args = raw.args && typeof raw.args === "object" ? raw.args : {};
    if (typeof args.name !== "string" || !args.name.trim()) return null;
    return { kind: "room.create", args };
  }
  if (raw && raw.kind === "room.destroy") {
    const args = raw.args && typeof raw.args === "object" ? raw.args : {};
    if (typeof args.id !== "string" && typeof args.name !== "string") return null;
    return { kind: "room.destroy", args };
  }
  return null;
}
