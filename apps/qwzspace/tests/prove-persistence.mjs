// prove-persistence — the disk-backed persistence adapter seam (Wave1 §4): createFileStore (the
// reference store), attachPersistence (periodic flush of a LIVE room's new records/checkpoints), and
// restoreRoom (re-derive a FRESH room's state from a store, via the room's own real queue/stepOnce
// machinery — not a parallel engine). Proves the actual headline claim: a room's history survives a
// simulated process restart (a brand-new createRoom() instance, fed only what's on disk).

import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createFileStore, attachPersistence, restoreRoom, verifyStoredHistory } from "../src/persistence.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-persistence", async () => {
async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

const dir = join(tmpdir(), `qwzspace-prove-persistence-${process.pid}-${Date.now()}`);
await rm(dir, { recursive: true, force: true });

const validate = createDemoWorld().validate;
const store = createFileStore({ dir });

// === phase 1: a "live" room accrues history, gets checkpointed, and is flushed to disk =============
const roomA = createRoom({
  id: "persist-room",
  world: createDemoWorld,
  validate,
  interest: () => true,
  intervalMs: 20,
  checkpointEvery: 3,
});
// attachPersistence starts a setInterval — ALWAYS reached via finally below, even if an assertion
// throws, or that interval keeps the process alive forever (found the hard way rehearsing this file).
const persistence = attachPersistence(roomA, store, { flushEveryMs: 15 });

let preRestartTick, preRestartEntity, onDiskCheckpoint;
try {
  roomA.queue.push({ actorId: "p1", seq: 0, kind: "presence.join", args: { name: "p1" } });
  await roomA.stepOnce(); // tick 1
  roomA.queue.push({ actorId: "p1", seq: 1, kind: "move", args: { dx: 1, dy: 0 } });
  await roomA.stepOnce(); // tick 2
  roomA.queue.push({ actorId: "p1", seq: 2, kind: "move", args: { dx: 1, dy: 0 } });
  await roomA.stepOnce(); // tick 3 -- a checkpoint fires here (checkpointEvery: 3)
  await roomA.stepOnce(); // tick 4 (empty)
  roomA.queue.push({ actorId: "p1", seq: 3, kind: "move", args: { dx: -1, dy: 1 } });
  await roomA.stepOnce(); // tick 5

  await persistence.flushNow(); // deterministic, not timing-dependent — but confirm the timer also works
  await wait(60);

  const onDiskRecords = await store.readAllRecords("persist-room");
  eq(onDiskRecords.length, roomA.log.length(), "every accepted intent's record made it to disk");
  onDiskCheckpoint = await store.loadCheckpoint("persist-room");
  ok(onDiskCheckpoint, "at least one checkpoint made it to disk");
  eq(onDiskCheckpoint.tick, roomA.checkpoints().at(-1).tick, "the persisted checkpoint is the room's most recent one");

  const liveHash = roomA.log.hash(onDiskCheckpoint.tick);
  eq(liveHash, onDiskCheckpoint.logHash, "the persisted checkpoint's logHash matches the live room's own log.hash() at that tick");

  preRestartTick = roomA.tickNow();
  preRestartEntity = (await roomA.snapshot.full(preRestartTick)).entities.find((e) => e.id === "p1");
} finally {
  persistence.stop();
  roomA.destroy();
}

// === phase 2: a FRESH room (simulating a process restart) restores from the store alone ============
const roomB = createRoom({
  id: "persist-room",
  world: createDemoWorld,
  validate,
  interest: () => true,
  intervalMs: 20,
});
try {
  eq(roomB.tickNow(), 0, "the fresh room starts at tick 0, exactly like a real process restart would");

  const restored = await restoreRoom(roomB, store);
  eq(restored.tick, preRestartTick, "restoreRoom() replays the fresh room all the way to the persisted tick");
  eq(roomB.tickNow(), preRestartTick, "the room's own tick counter now matches the pre-restart room's");
  ok(restored.integrity, "an integrity check ran (a checkpoint was on disk to check against)");
  eq(restored.integrity.ok, true, "the restored room's log.hash() at the checkpoint tick matches the persisted checkpoint");

  const restoredEntity = (await roomB.snapshot.full(roomB.tickNow())).entities.find((e) => e.id === "p1");
  eq(restoredEntity, preRestartEntity, "the restored room's live-derived state matches the pre-restart room's, entity-for-entity");

  const restoredVerify = await roomB.verify();
  ok(restoredVerify.ok, "the restored room is itself still replay-verifiable end to end after restoration");

  // restoring an already-caught-up room a second time is a safe no-op, not a re-application of history.
  const restoredAgain = await restoreRoom(roomB, store);
  eq(restoredAgain.restoredTicks, 0, "restoring a room that already holds every persisted tick replays nothing new");
} finally {
  roomB.destroy();
}

// === verifyStoredHistory: check on-disk integrity WITHOUT spinning up a live room at all ============
const fresh = createDemoWorld();
const storedCheck = await verifyStoredHistory({ store, roomId: "persist-room", subjectsOf: fresh.subjectsOf, snapOf: fresh.snapOf, runTick: fresh.runTick });
eq(storedCheck.ok, true, "verifyStoredHistory confirms the on-disk log matches its own last checkpoint, with no live room involved");

// a room with nothing ever persisted reports an honest empty result, not a false integrity claim.
const emptyCheck = await verifyStoredHistory({ store, roomId: "never-persisted", subjectsOf: fresh.subjectsOf, snapOf: fresh.snapOf, runTick: fresh.runTick });
eq(emptyCheck.ok, null, "verifyStoredHistory on a room with no persisted history reports ok:null, not true or false");

await store.clear("persist-room");
eq((await store.readAllRecords("persist-room")).length, 0, "clear() actually removes the room's on-disk bucket");

await rm(dir, { recursive: true, force: true });

done("prove-persistence");
});
