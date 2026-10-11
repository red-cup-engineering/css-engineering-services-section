import { ok, eq, done } from "./_harness.mjs";
import { replay, stateHash, verifyRoomHistory } from "../src/replay.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoWorld as createArena } from "../src/demo-world.mjs";

test("demo arena preserves lifecycle, validation, snapshots and configured bounds", async () => {
  for (const [makeWorld, limit, kind, joined] of [[createArena, 200, "bot", false], [createDemoWorld, 50, "actor", true]]) {
    const world = makeWorld();
    assert.deepEqual(await world.runTick(1, [{actorId:"absent",kind:"move",args:{dx:1,dy:1}}]), {dirty:[]});
    assert.deepEqual(await world.runTick(2, [{actorId:"a",kind:"presence.join",args:{name:7}}]), {dirty:["a"]});
    assert.deepEqual(await world.runTick(3, [{actorId:"a",kind:"presence.join",args:{name:"ignored"}}]), {dirty:[]});
    assert.deepEqual(await world.subjectsOf(), ["a"]);
    assert.deepEqual(await world.snapOf("a"), {id:"a",kind,x:0,y:0,name:"7"});
    assert.equal(Object.hasOwn(world.peek().get("a"), "joinedTick"), joined);
    if (joined) assert.equal(world.peek().get("a").joinedTick, 2);
    for (const args of [{dx:Infinity,dy:0},{dx:0,dy:NaN},{dx:"no",dy:0},{}]) assert.equal(world.validate({kind:"move",args}), null);
    assert.deepEqual(world.validate({kind:"move",args:{dx:"999",dy:-999}}), {kind:"move",args:{dx:999,dy:-999}});
    assert.equal(world.validate({kind:"presence.join"}), null);
    await world.runTick(4, Array.from({length:250},()=>({actorId:"a",kind:"move",args:{dx:999,dy:-999}})));
    assert.deepEqual(await world.snapOf("a"), {id:"a",kind,x:limit,y:-limit,name:"7"});
    const snapshot = await world.snapOf("a");
    snapshot.x = 0;
    world.peek().clear();
    assert.equal((await world.snapOf("a")).x, limit);
    assert.deepEqual(await world.runTick(5,[{actorId:"a",kind:"unknown"},{actorId:"a",kind:"presence.leave"},{actorId:"a",kind:"presence.leave"}]),{dirty:["a"]});
    assert.equal(await world.snapOf("a"), null);
    assert.deepEqual(await world.subjectsOf(), []);
  }
});


test("prove-replay", async () => {
// replay() reconstructs folded state purely from (world-factory-output, log, totalTicks) — no live
// room involved at all.
{
  const world = createDemoWorld();
  const log = [
    { tick: 1, seq: 0, actorId: "a1", kind: "presence.join", args: { name: "x" } },
    { tick: 4, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } },
    { tick: 7, seq: 2, actorId: "a1", kind: "move", args: { dx: 0, dy: 1 } },
  ];
  const result = await replay(log, {
    subjectsOf: world.subjectsOf,
    snapOf: world.snapOf,
    runTick: world.runTick,
    totalTicks: 7,
  });
  const frame = result.full();
  eq(frame.entities.length, 1, "replay folds one actor entity");
  eq(frame.entities[0].x, 1, "replayed x reflects the one move(dx:1)");
  eq(frame.entities[0].y, 1, "replayed y reflects the one move(dy:1)");
}

// EMPTY ticks (no intents that tick) still fire runTick(tick, []) — replay must not skip gaps between
// recorded ticks, or a domain that evolves on its own between intents would silently diverge.
{
  let emptyTicksSeen = 0;
  const log = [{ tick: 1, seq: 0, actorId: "a1", kind: "noop", args: {} }];
  async function runTick(tick, intents) {
    if (intents.length === 0) emptyTicksSeen++;
    return { dirty: [] };
  }
  await replay(log, {
    subjectsOf: async () => [],
    snapOf: async () => null,
    runTick,
    totalTicks: 5,
  });
  eq(emptyTicksSeen, 4, "ticks 2..5 (no log records) still each invoke runTick once with an empty batch");
}

// totalTicks is required — replay must refuse to guess how long the room actually ran.
{
  let threw = false;
  try {
    await replay([], { subjectsOf: async () => [], snapOf: async () => null, runTick: async () => ({}) });
  } catch {
    threw = true;
  }
  ok(threw, "replay() without totalTicks throws rather than silently inferring it from the log's max tick");
}

// stateHash is order-independent over entities (sorted internally) and tick-sensitive.
{
  const a = stateHash({ tick: 5, entities: [{ id: "x", v: 1 }, { id: "y", v: 2 }] });
  const b = stateHash({ tick: 5, entities: [{ id: "y", v: 2 }, { id: "x", v: 1 }] });
  eq(a, b, "stateHash does not depend on entity array order");
  const c = stateHash({ tick: 6, entities: [{ id: "x", v: 1 }, { id: "y", v: 2 }] });
  ok(a !== c, "stateHash differs for a different tick with the same entities");
}

// verifyRoomHistory: the standalone entry point matches a manually-computed liveStateHash.
{
  const live = createDemoWorld();
  const log = [
    { tick: 1, seq: 0, actorId: "a1", kind: "presence.join", args: { name: "x" } },
    { tick: 3, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } },
  ];
  // fold the SAME log into `live` to get the "live" reference hash, independently of replay()
  await live.runTick(1, [{ actorId: "a1", kind: "presence.join", args: { name: "x" } }]);
  await live.runTick(3, [{ actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } }]);
  const liveEntities = await Promise.all((await live.subjectsOf()).map((id) => live.snapOf(id)));
  const liveHash = stateHash({ tick: 3, entities: liveEntities });

  // IMPORTANT: subjectsOf/snapOf/runTick must all come from the SAME world instance (they share one
  // mutable Map internally) — mixing functions from different createDemoWorld() calls would silently
  // break (subjectsOf listing ids from one map, snapOf looking them up in an empty other one).
  const fresh = createDemoWorld();
  const result = await verifyRoomHistory({
    seed: "verify-test",
    log,
    totalTicks: 3,
    subjectsOf: fresh.subjectsOf,
    snapOf: fresh.snapOf,
    runTick: fresh.runTick,
    liveStateHash: liveHash,
  });
  ok(result.ok, "verifyRoomHistory reports ok:true when replayed state matches the supplied live hash");
  eq(result.tick, 3, "verifyRoomHistory reports the totalTicks it replayed to");
}

// onTick — optional per-tick callback, additive: fires once per replayed tick with that tick's full
// frame, without changing replay()'s return value at all.
{
  const world = createDemoWorld();
  const log = [
    { tick: 1, seq: 0, actorId: "a1", kind: "presence.join", args: { name: "x" } },
    { tick: 3, seq: 1, actorId: "a1", kind: "move", args: { dx: 1, dy: 0 } },
  ];
  const seen = [];
  const result = await replay(log, {
    subjectsOf: world.subjectsOf,
    snapOf: world.snapOf,
    runTick: world.runTick,
    totalTicks: 3,
    onTick: (tick, frame) => seen.push({ tick, entities: frame.entities.length }),
  });
  eq(seen.length, 3, "onTick fires once per tick from 1..totalTicks, including empty ticks");
  eq(seen.find((s) => s.tick === 1).entities, 1, "tick 1's onTick frame already reflects that tick's own join");
  eq(seen.find((s) => s.tick === 2).entities, 1, "tick 2 (no intents that tick) still fires onTick with settled state");
  eq(seen.find((s) => s.tick === 3).entities, 1, "later ticks' onTick frames keep reflecting settled state");
  eq(result.full().entities.length, 1, "the final return value is unaffected by onTick being supplied");
}

done("prove-replay");
});
