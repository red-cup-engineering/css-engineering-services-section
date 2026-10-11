// Deterministic bounded arena for examples and configured test worlds.
export function createDemoWorld({ positionLimit = 200, entityKind = "bot", includeJoinedTick = false } = {}) {
  const world = new Map(); // actorId -> { id, x, y, name }

  const clamp1 = (n) => Math.max(-1, Math.min(1, n));
  const clampPos = (n) => Math.max(-positionLimit, Math.min(positionLimit, n));

  async function runTick(tick, intents) {
    const dirty = new Set();
    for (const it of intents) {
      const { actorId, kind, args } = it;
      if (kind === "presence.join") {
        if (!world.has(actorId)) {
          world.set(actorId, { id: actorId, x: 0, y: 0, ...(includeJoinedTick ? { joinedTick: tick } : {}), name: String(args?.name ?? actorId) });
          dirty.add(actorId);
        }
        continue;
      }
      if (kind === "presence.leave") {
        if (world.delete(actorId)) dirty.add(actorId);
        continue;
      }
      if (kind === "move") {
        const e = world.get(actorId);
        if (!e) continue;
        e.x = clampPos(e.x + clamp1(Number(args?.dx) || 0));
        e.y = clampPos(e.y + clamp1(Number(args?.dy) || 0));
        dirty.add(actorId);
        continue;
      }
    }
    return { dirty: [...dirty] };
  }

  async function subjectsOf() {
    return [...world.keys()];
  }
  async function snapOf(id) {
    const e = world.get(id);
    return e ? { id: e.id, kind: entityKind, x: e.x, y: e.y, name: e.name } : null;
  }
  function validate(raw) {
    if (raw.kind === "move") {
      const dx = Number(raw.args?.dx);
      const dy = Number(raw.args?.dy);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
      return { kind: "move", args: { dx, dy } };
    }
    return null;
  }

  return { runTick, subjectsOf, snapOf, validate, peek: () => new Map(world) };
}
