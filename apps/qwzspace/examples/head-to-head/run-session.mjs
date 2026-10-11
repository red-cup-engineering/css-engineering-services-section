// run-session — a 20-client synthetic room session (bots) over real websockets on localhost,
// measuring tick stability, message counts, resume correctness under forced disconnects, and the
// renderer proof: the live session rendered live, then re-rendered from its own replay history
// through the same projection path, with identical frame output.
//
//   node examples/head-to-head/run-session.mjs
//
// This script benchmarks QwzSpace against its own configured targets (the tick interval and
// ring-buffer window it was given) and against a naive-broadcast baseline computed from the same
// session (send the full scene to every client every tick, no delta/interest filtering) — no other
// realtime platform is run locally for comparison.

import http from "node:http";
import { createRoom } from "@red-cup-engineering/feltos/operations";
import { replay } from "@red-cup-engineering/computer-content-graph-engineering-services-section/operations-graph";
import { project, sceneEquals } from "@red-cup-engineering/qwzspace/project";
import { createInterpolationBuffer } from "@red-cup-engineering/qwzspace/client";
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node";
import { createDemoWorld } from "@red-cup-engineering/qwzspace/demo-world";
import { encode } from "@red-cup-engineering/qwzspace/protocol";

const NUM_BOTS = 20;
const INTERVAL_MS = 100; // tick cadence
const SESSION_MS = 7000; // how long bots act
const SETTLE_MS = 2500; // grace period after the session for forced-disconnect bots to resume
const MOVE_MIN_MS = 150;
const MOVE_MAX_MS = 400;
const FORCE_DISCONNECT_AT = [0.25, 0.5, 0.75]; // fractions of SESSION_MS
const FORCE_DISCONNECT_PER_WAVE = 2;
const PACK = process.env.QWZSPACE_PACK === "1"; // opt-in entry packing on the wire (protocol.mjs)

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

async function main() {
  const validate = createDemoWorld().validate;
  const room = createRoom({
    id: "head-to-head",
    intervalMs: INTERVAL_MS,
    world: createDemoWorld,
    validate,
    interest: () => true,
    ringBufferTicks: 300, // ~30s at 100ms — the spec's own "target grace window" sizing rule (§4)
    resumeGraceTicks: 300,
    pack: PACK,
  });

  const httpServer = http.createServer();
  room.attach(httpServer);
  await room.ready;
  await new Promise((res) => httpServer.listen(0, "127.0.0.1", res));
  await wait(100); // this sandbox's listen->connect race, see tests/prove-client-node.mjs's header
  const port = httpServer.address().port;
  const url = `ws://127.0.0.1:${port}/`;
  room.start();

  // === instrumentation: real wire bytes, real tick cadence, a live per-tick InterpolationBuffer ===
  let wireMessages = 0;
  let wireBytes = 0;
  const origSend = room.hub.send.bind(room.hub);
  const origBroadcast = room.hub.broadcast.bind(room.hub);
  // Bytes are measured through the same `encode` the transport uses, so a packed session reports
  // what actually crossed the wire.
  const wireBytesOf = (obj) => Buffer.byteLength(encode(obj, { pack: PACK }));
  room.hub.send = (client, obj) => {
    wireMessages++;
    wireBytes += wireBytesOf(obj);
    return origSend(client, obj);
  };
  room.hub.broadcast = (obj) => {
    // broadcast() fans out internally; count it as hitting every currently-live client (matches what
    // the naive baseline below also assumes for its own broadcast accounting).
    wireMessages += room.hub.size();
    wireBytes += wireBytesOf(obj) * room.hub.size();
    return origBroadcast(obj);
  };

  const tickTimestamps = []; // [{ tick, at }]
  const liveBuffer = createInterpolationBuffer({ maxSamples: 4096 });
  const perTickBytes = []; // [{ tick, clients, sceneBytes }] — feeds the naive-broadcast baseline
  let lastTick = 0;
  const sampler = setInterval(() => {
    const t = room.tickNow();
    if (t === lastTick) return;
    lastTick = t;
    const at = Date.now();
    tickTimestamps.push({ tick: t, at });
    const full = room.snapshot.full(t);
    liveBuffer.push({ type: "full", tick: t, entities: full.entities }, at);
    const sceneBytes = Buffer.byteLength(JSON.stringify(project(full, t)));
    perTickBytes.push({ tick: t, clients: room.hub.size(), sceneBytes });
  }, 5);

  // === spawn 20 bots over REAL websockets =========================================================
  const bots = [];
  for (let i = 0; i < NUM_BOTS; i++) {
    const stateLog = [];
    const client = connectRoom(url, {
      name: `bot-${i}`,
      onState: (s) => stateLog.push({ s, at: Date.now() }),
    });
    bots.push({ i, client, stateLog, moveTimer: null, actorIdAtStart: null });
  }

  await wait(300); // let everyone actually join before driving movement
  for (const bot of bots) {
    bot.actorIdAtStart = bot.client.view.myId();
    const tick = () => {
      const dx = Math.random() * 2 - 1;
      const dy = Math.random() * 2 - 1;
      bot.client.sendIntent("move", { dx, dy });
      bot.moveTimer = setTimeout(tick, MOVE_MIN_MS + Math.random() * (MOVE_MAX_MS - MOVE_MIN_MS));
    };
    bot.moveTimer = setTimeout(tick, Math.random() * MOVE_MIN_MS);
  }

  // === forced disconnects mid-session: a REAL server-initiated close, not a graceful client exit ===
  const forcedDisconnects = []; // [{ actorId, atFractionOfSession, botIndex }]
  for (const frac of FORCE_DISCONNECT_AT) {
    setTimeout(() => {
      const candidates = bots.filter((b) => !forcedDisconnects.some((f) => f.botIndex === b.i));
      for (let k = 0; k < FORCE_DISCONNECT_PER_WAVE && candidates.length; k++) {
        const idx = Math.floor(Math.random() * candidates.length);
        const bot = candidates.splice(idx, 1)[0];
        const actorId = bot.client.view.myId();
        const member = room.members().get(actorId);
        forcedDisconnects.push({ actorId, botIndex: bot.i, at: Date.now(), hadMember: Boolean(member) });
        if (member?.conn) {
          try {
            member.conn.close(); // a real server-side close of the TCP/WS connection
          } catch {
            /* best-effort */
          }
        }
      }
    }, SESSION_MS * frac);
  }

  await wait(SESSION_MS);
  for (const bot of bots) clearTimeout(bot.moveTimer);
  await wait(SETTLE_MS); // let forced-disconnect bots finish reconnect+resume

  clearInterval(sampler);
  for (const bot of bots) bot.client.close();
  await wait(200);
  room.stop();

  const finalTick = room.tickNow();
  const finalMembers = room.members();

  // === resume correctness ==========================================================================
  const resumeResults = forcedDisconnects.map((fd) => {
    const bot = bots[fd.botIndex];
    const states = bot.stateLog.map((s) => s.s);
    const sawDisconnect = states.includes("disconnected");
    const sawResumed = states.includes("resumed");
    const finalActorId = bot.client.view.myId();
    const identityPreserved = finalActorId === fd.actorId;
    const stillMember = finalMembers.has(fd.actorId);
    return {
      botIndex: fd.botIndex,
      actorId: fd.actorId,
      sawDisconnect,
      sawResumed,
      identityPreserved,
      stillMember,
      states,
    };
  });

  // === §6: replay-verifiable room contract, over the WHOLE 20-client session =====================
  const verify = await room.verify();

  // === wire-efficiency vs a naive full-broadcast baseline (computed locally, no competitor claims) ===
  const naiveBytes = perTickBytes.reduce((sum, t) => sum + t.clients * t.sceneBytes, 0);
  const naiveMessages = perTickBytes.reduce((sum, t) => sum + t.clients, 0);

  // === tick stability ===============================================================================
  const intervals = [];
  for (let i = 1; i < tickTimestamps.length; i++) intervals.push(tickTimestamps[i].at - tickTimestamps[i - 1].at);
  const tickStats = {
    configuredIntervalMs: INTERVAL_MS,
    ticksObserved: tickTimestamps.length,
    meanIntervalMs: mean(intervals),
    stddevIntervalMs: stddev(intervals),
    minIntervalMs: intervals.length ? Math.min(...intervals) : null,
    maxIntervalMs: intervals.length ? Math.max(...intervals) : null,
  };

  // === §9 render proof: live session, then re-rendered from replay, through the SAME project() path
  const tickAt = new Map(tickTimestamps.map((t) => [t.tick, t.at]));
  const replayBuffer = createInterpolationBuffer({ maxSamples: 4096 });
  const fresh = createDemoWorld();
  await replay(room.log.all(), {
    subjectsOf: fresh.subjectsOf,
    snapOf: fresh.snapOf,
    runTick: fresh.runTick,
    totalTicks: finalTick,
    onTick: (tick, frame) => {
      const at = tickAt.get(tick);
      if (at !== undefined) replayBuffer.push({ type: "full", tick, entities: frame.entities }, at);
    },
  });

  const sampleTimes = [];
  if (tickTimestamps.length >= 2) {
    const start = tickTimestamps[0].at;
    const end = tickTimestamps[tickTimestamps.length - 1].at;
    for (let t = start; t <= end; t += 16) sampleTimes.push(t); // ~60fps sampling
  }

  let framesCompared = 0;
  let framesIdentical = 0;
  let firstMismatch = null;
  for (const t of sampleTimes) {
    const liveScene = project(liveBuffer.sample(t), t);
    const replayScene = project(replayBuffer.sample(t), t);
    framesCompared++;
    if (sceneEquals(liveScene, replayScene)) framesIdentical++;
    else if (!firstMismatch) firstMismatch = { t, liveScene, replayScene };
  }

  // smooth-not-teleport check: find a bot entity with at least 3 sub-tick samples spanning a tick
  // where it actually moved, and confirm the interpolated x passes through fractional values, not a
  // single discrete jump.
  let smoothnessProof = null;
  if (tickTimestamps.length >= 2) {
    const midIndex = Math.floor(tickTimestamps.length / 2);
    const beforeAt = tickTimestamps[midIndex - 1]?.at;
    const afterAt = tickTimestamps[midIndex]?.at;
    if (beforeAt !== undefined && afterAt !== undefined && afterAt > beforeAt) {
      const beforeScene = project(liveBuffer.sample(beforeAt), beforeAt);
      const afterScene = project(liveBuffer.sample(afterAt), afterAt);
      const moved = afterScene.entries.find((e) => {
        const prev = beforeScene.entries.find((p) => p.id === e.id);
        return prev && (prev.x !== e.x || prev.y !== e.y);
      });
      if (moved) {
        const prev = beforeScene.entries.find((p) => p.id === moved.id);
        const mid1 = beforeAt + (afterAt - beforeAt) * 0.33;
        const mid2 = beforeAt + (afterAt - beforeAt) * 0.66;
        const s1 = project(liveBuffer.sample(mid1), mid1).entries.find((e) => e.id === moved.id);
        const s2 = project(liveBuffer.sample(mid2), mid2).entries.find((e) => e.id === moved.id);
        const strictlyBetween = (a, b, v) => (a < b ? v > a && v < b : v > b && v < a);
        const fractional =
          (s1 && (strictlyBetween(prev.x, moved.x, s1.x) || strictlyBetween(prev.y, moved.y, s1.y))) ||
          (s2 && (strictlyBetween(prev.x, moved.x, s2.x) || strictlyBetween(prev.y, moved.y, s2.y)));
        smoothnessProof = {
          entityId: moved.id,
          beforeTickPos: { x: prev.x, y: prev.y },
          afterTickPos: { x: moved.x, y: moved.y },
          midSample1: s1 ? { x: s1.x, y: s1.y } : null,
          midSample2: s2 ? { x: s2.x, y: s2.y } : null,
          showsFractionalInterpolation: Boolean(fractional),
        };
      }
    }
  }

  room.destroy();
  await new Promise((res) => httpServer.close(res));

  return {
    config: { NUM_BOTS, INTERVAL_MS, SESSION_MS, SETTLE_MS },
    finalTick,
    finalMemberCount: finalMembers.size,
    wire: {
      actualMessages: wireMessages,
      actualBytes: wireBytes,
      naiveBroadcastMessages: naiveMessages,
      naiveBroadcastBytes: naiveBytes,
      messageReductionPct: naiveMessages ? (1 - wireMessages / naiveMessages) * 100 : null,
      byteReductionPct: naiveBytes ? (1 - wireBytes / naiveBytes) * 100 : null,
    },
    tickStats,
    resumeResults,
    verify: { ok: verify.ok, tick: verify.tick, logHash: verify.logHash },
    render: {
      framesCompared,
      framesIdentical,
      allFramesIdentical: framesCompared > 0 && framesCompared === framesIdentical,
      firstMismatch,
      smoothnessProof,
    },
  };
}

const report = await main();
console.log(JSON.stringify(report, null, 2));

const allResumesOk = report.resumeResults.every((r) => r.sawDisconnect && r.sawResumed && r.identityPreserved && r.stillMember);
const ok = report.verify.ok && report.render.allFramesIdentical && allResumesOk;
if (!ok) {
  console.error("\nHEAD-TO-HEAD: one or more proof obligations FAILED — see report above.");
  process.exit(1);
}
console.log("\nHEAD-TO-HEAD: all proof obligations passed.");
