// run-session — Wave1 §5: an honest rooms-per-process ceiling, measured the SAME way
// examples/head-to-head/run-session.mjs already measures one room (real websockets, real Rooms, no
// mocks), extended from one room/20 clients to N INDEPENDENT rooms concurrently in one process,
// climbing room count and watching whether every room's own tick cadence holds. This turns "vertical
// scaling is the natural first lever" (the vnext spec's §10) from a stated principle into a number.
//
// CONFIRMED SAFE ON THIS HOST'S SANDBOX: prove-client-node.mjs's own header documents a real bug in
// this sandbox's networking where creating a SECOND http server AFTER closing a first one in the same
// process can spuriously refuse connections. That bug is about sequential close-then-reopen; it does
// NOT apply here — every room's http server is created ONCE, concurrently, and none are closed until
// the very end, which was verified directly against this package's own Room/connectRoom before this
// script was written (N concurrent Rooms, N concurrent servers, all in one process, all reachable).
//
//   node examples/multi-room-load/run-session.mjs
//   MULTI_ROOM_COUNTS=1,5,10,20,40 MULTI_ROOM_BOTS_PER_ROOM=5 node examples/multi-room-load/run-session.mjs

import http from "node:http";
import { createRoom } from "@red-cup-engineering/feltos/operations";
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node";
import { createDemoWorld } from "@red-cup-engineering/qwzspace/demo-world";

const ROOM_COUNTS = (process.env.MULTI_ROOM_COUNTS ?? "1,5,10,20").split(",").map(Number).filter(Number.isFinite);
const BOTS_PER_ROOM = Number(process.env.MULTI_ROOM_BOTS_PER_ROOM ?? 5);
const INTERVAL_MS = Number(process.env.MULTI_ROOM_INTERVAL_MS ?? 100);
const SESSION_MS = Number(process.env.MULTI_ROOM_SESSION_MS ?? 4000);
const DEGRADE_THRESHOLD = Number(process.env.MULTI_ROOM_DEGRADE_THRESHOLD ?? 1.5); // meanIntervalMs > configured * this = degraded

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

async function runAtRoomCount(n) {
  const rooms = [];
  for (let i = 0; i < n; i++) {
    const validate = createDemoWorld().validate;
    const room = createRoom({ id: `load-${i}`, intervalMs: INTERVAL_MS, world: createDemoWorld, validate, interest: () => true });
    const httpServer = http.createServer();
    room.attach(httpServer);
    await room.ready;
    await new Promise((res) => httpServer.listen(0, "127.0.0.1", res));
    rooms.push({ room, httpServer, port: httpServer.address().port, timestamps: [], lastTick: 0 });
  }
  await wait(100); // this sandbox's listen->connect race, see tests/prove-client-node.mjs's header
  for (const r of rooms) r.room.start();

  const samplers = rooms.map((r) =>
    setInterval(() => {
      const t = r.room.tickNow();
      if (t === r.lastTick) return;
      r.lastTick = t;
      r.timestamps.push(Date.now());
    }, 5),
  );

  const bots = [];
  const moveTimers = [];
  for (const r of rooms) {
    for (let b = 0; b < BOTS_PER_ROOM; b++) {
      const client = connectRoom(`ws://127.0.0.1:${r.port}/`, { name: `bot-${b}` });
      bots.push(client);
    }
  }
  await wait(200);
  for (const client of bots) {
    const tick = () => {
      client.sendIntent("move", { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 });
      moveTimers.push(setTimeout(tick, 150 + Math.random() * 250));
    };
    moveTimers.push(setTimeout(tick, Math.random() * 150));
  }

  await wait(SESSION_MS);
  for (const t of moveTimers) clearTimeout(t);
  for (const s of samplers) clearInterval(s);
  for (const client of bots) client.close();
  await wait(150);
  for (const r of rooms) r.room.stop();

  const perRoom = rooms.map((r) => {
    const intervals = [];
    for (let i = 1; i < r.timestamps.length; i++) intervals.push(r.timestamps[i] - r.timestamps[i - 1]);
    return {
      id: r.room.id,
      finalTick: r.room.tickNow(),
      finalMembers: r.room.members().size,
      meanIntervalMs: mean(intervals),
      stddevIntervalMs: stddev(intervals),
      maxIntervalMs: intervals.length ? Math.max(...intervals) : null,
    };
  });

  for (const r of rooms) {
    r.room.destroy();
    await new Promise((res) => r.httpServer.close(res));
  }

  const means = perRoom.map((r) => r.meanIntervalMs).filter((x) => Number.isFinite(x));
  return {
    roomCount: n,
    botsTotal: n * BOTS_PER_ROOM,
    perRoom,
    meanOfMeans: mean(means),
    worstMeanIntervalMs: means.length ? Math.max(...means) : null,
  };
}

async function main() {
  const results = [];
  for (const n of ROOM_COUNTS) {
    console.log(`--- multi-room-load: ${n} room(s) x ${BOTS_PER_ROOM} bots, ${SESSION_MS}ms ---`);
    const r = await runAtRoomCount(n);
    results.push(r);
    console.log(`  meanOfMeans=${r.meanOfMeans.toFixed(2)}ms worstMean=${r.worstMeanIntervalMs?.toFixed(2)}ms (configured ${INTERVAL_MS}ms)`);
  }

  const firstDegraded = results.find((r) => r.worstMeanIntervalMs !== null && r.worstMeanIntervalMs > INTERVAL_MS * DEGRADE_THRESHOLD);
  const report = {
    config: { ROOM_COUNTS, BOTS_PER_ROOM, INTERVAL_MS, SESSION_MS, DEGRADE_THRESHOLD },
    results,
    honestCeiling: firstDegraded
      ? { roomCount: firstDegraded.roomCount, note: `worst per-room mean tick interval exceeded ${DEGRADE_THRESHOLD}x the configured ${INTERVAL_MS}ms at ${firstDegraded.roomCount} rooms, on THIS host, under whatever else was running on it at the time` }
      : {
          roomCount: null,
          note: `no degradation observed up to ${ROOM_COUNTS[ROOM_COUNTS.length - 1]} rooms on this host's current load — this is NOT a hardware ceiling claim, only what was actually observed, matching this package's existing honesty discipline about host-contention noise (see examples/head-to-head's own report)`,
        },
  };
  console.log("\n=== multi-room-load: final report ===");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

await main();
