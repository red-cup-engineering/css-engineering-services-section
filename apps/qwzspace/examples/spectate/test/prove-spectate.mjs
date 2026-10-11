// prove-spectate — the headless app-level proof: drives this example's own server (a real Room, real
// bots, real sockets) exactly the way the browser page does, through BOTH modes (live / replay) and
// BOTH backends (2D / abrash), and proves:
//
//   (a) FRAME-SET IDENTITY — live spectation and the /replay endpoint, sampled through the SAME
//       InterpolationBuffer + project() pipeline web/spectate.mjs uses, render BYTE-IDENTICAL scenes
//       at every sampled instant (the 602/602-style proof — see examples/head-to-head/run-session.mjs,
//       whose exact technique this file reuses: push live AND replay frames at the SAME wall-clock
//       timestamps, sample both at the SAME arbitrary instants, and diff project() output).
//
//   (b) RESUME-UNDER-RENDER — a REAL forced disconnect (the underlying socket is closed, not the
//       client, mid-session), the spectator auto-resumes under its original identity via qwzspace's
//       own resume-token wiring, and rendering continues coherently across the gap. Concretely: the
//       602/602 comparison above SPANS the disconnect+resume — if the resume had produced a
//       duplicate/orphaned entity, a tick regression, or a corrupted position, the live buffer would
//       diverge from the replay-derived ground truth and framesIdentical would fall short of
//       framesCompared. That divergence-or-not IS the resume-under-render proof, not a separate
//       mechanism bolted on afterward.
//
//   (c) The SAME two things (mode toggle, frame identity) for the ABRASH backend's own live (SSE) and
//       replay paths — lighter-weight than (a)/(b) because the abrash path has no client-side render
//       state to resume (see shared/spectate-render.mjs's header: the server renders once per tick and
//       fans the FRAME out; there is nothing for a reconnecting SSE stream to resume, only to catch
//       the next frame) — the wire bytes SSE actually delivered are compared, byte for byte, against
//       what /replay?backend=abrash independently re-derives for the same ticks.
//
// Everything qwzspace-shaped is imported from the INSTALLED `@red-cup-engineering/qwzspace` package
// (never a relative ../../src path) — a green run of this file is part of this example's fresh-install
// proof.

import { test } from "node:test";
import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createInterpolationBuffer, createRealtimeClient, createWorldView } from "@red-cup-engineering/qwzspace/client";
import { project, sceneEquals } from "@red-cup-engineering/qwzspace/project";
import { NodeWebSocket } from "@red-cup-engineering/qwzspace/client-node";
import { startSpectateServer } from "../server.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// collectAbrashSSE — a minimal manual SSE line-reader (Node has no global EventSource; the browser
// page uses the real one — see web/spectate.mjs). Collects the FIRST wire frame seen per tick and
// resolves after `durationMs`. RETRIES the initial connect a few times on a connection-level error
// (observed, rarely, as a transient ECONNREFUSED against a host:port this same process just started
// listening on — a loopback-networking race this sandbox occasionally hits under load, not a room/
// server bug: httpServer.listen()'s own callback firing does not, on every platform, guarantee the
// very next connection attempt is accepted) — a `res.on("data"...)` failure past that point still
// resolves early rather than retrying, since by then real data was already flowing.
function collectAbrashSSE(host, port, durationMs) {
  return new Promise((resolve) => {
    const frames = new Map(); // tick -> wire frame {tick,width,height,dataB64}
    const deadline = Date.now() + durationMs;
    let retriesLeft = 5;

    function attempt() {
      const req = http.get({ host, port, path: "/live/abrash-frames", headers: { accept: "text/event-stream" } }, (res) => {
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buf += chunk;
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const raw = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const line = raw.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue; // the connect comment (`: connected`) and blank keepalives, ignored
            try {
              const wire = JSON.parse(line.slice(6));
              if (!frames.has(wire.tick)) frames.set(wire.tick, wire);
            } catch {
              /* malformed/partial — skip, do not fail the collector over one bad line */
            }
          }
        });
      });
      req.on("error", () => {
        if (frames.size === 0 && retriesLeft > 0 && Date.now() < deadline) {
          retriesLeft--;
          setTimeout(attempt, 50);
        } else {
          resolve(frames); // either real data already arrived, retries exhausted, or the window's gone
        }
      });
    }
    attempt();

    setTimeout(() => resolve(frames), durationMs);
  });
}

test("prove-spectate", async () => {
  const server = await startSpectateServer({
    port: 0,
    host: "127.0.0.1",
    botCount: 6,
    seed: 4242,
    intervalMs: 40,
    roomId: "prove-spectate-arena",
  });

  try {
    const face = await fetch(`http://${server.host}:${server.port}/`);
    eq(face.status, 200, "the canonical static face served its index");
    const qwzspaceClient = await fetch(`http://${server.host}:${server.port}/qwzspace/client-browser.mjs`);
    eq(qwzspaceClient.status, 200, "the canonical mounted qwzspace browser module served");
    ok((await qwzspaceClient.text()).includes("createRealtimeClient"), "the mounted module is executable client source");

    // === start the abrash SSE collector for the WHOLE session, spanning the 2D disconnect/resume ===
    const ssePromise = collectAbrashSSE(server.host, server.port, 6000); // spans the whole 2D dance below with margin to spare under shared-machine load

    // === drive the LIVE 2D spectator — the identical pipeline web/spectate.mjs's start2D uses:
    // one InterpolationBuffer, fed from a real WorldView reacting to a real ws connection. `rawTargets`
    // is ported verbatim from web/spectate.mjs's own header note on WorldView's tx/ty vs x/y.
    function rawTargets(entities) {
      return entities.map((e) => ({
        ...e,
        x: Number.isFinite(e.tx) ? e.tx : e.x,
        y: Number.isFinite(e.ty) ? e.ty : e.y,
      }));
    }

    const view = createWorldView("spectator");
    const stateLog = [];
    let socketRef = null;
    const liveBuffer = createInterpolationBuffer({ maxSamples: 4096 });
    const tickAt = new Map(); // tick -> wall-clock ms of first observation, THE shared clock live and
    // replay are both pushed against — see run-session.mjs's identical technique.

    // TWO real-network artifacts a forced raw-socket close can produce, both handled the same way
    // (drop the stray event, never let it reach liveBuffer/tickAt):
    //   (1) a resume's buffered-delta catch-up can deliver several real ticks back-to-back inside the
    //       same Date.now() millisecond — Node's clock resolution is ~1ms, easily beaten by
    //       loopback-socket delivery. `lastAt` forces each accepted tick to get a STRICTLY increasing
    //       timestamp, the guarantee a real rAF clock provides for free.
    //   (2) closing the transport does not guarantee an already-buffered-but-unread TCP segment from
    //       the OLD connection is dropped — a stale, already-in-flight tick can surface via the OLD
    //       onmessage handler microtasks AFTER `sendResume()` already computed its own `sinceTick`
    //       from an earlier `lastKnownTick`, so the resumed connection's catch-up can then REPLAY that
    //       same tick again, arriving OUT OF ORDER relative to it. A `maxTickSeen` monotonic guard
    //       drops anything that isn't forward progress — exactly what a real spectator UI should do
    //       regardless of test conditions (never let a late/reordered packet rewind what's on screen).
    let lastAt = 0;
    let maxTickSeen = -1;
    view.on("snapshot", () => {
      const t = view.tick();
      if (t <= maxTickSeen) return; // stale/reordered — see (2) above
      maxTickSeen = t;
      const at = Math.max(Date.now(), lastAt + 1); // strictly increasing — see (1) above
      lastAt = at;
      tickAt.set(t, at);
      liveBuffer.push({ type: "full", tick: t, entities: rawTargets(view.entities()) }, at);
    });

    const client = createRealtimeClient({
      connect: () => {
        socketRef = new NodeWebSocket(server.url);
        return socketRef;
      },
      view,
      name: "spectator",
      onState: (s) => stateLog.push({ s, at: Date.now() }),
      // a short, low-jitter backoff so this test proves the SAME reconnect mechanism
      // tests/prove-resume-live.mjs proves over raw sockets, without waiting on the library's real-world
      // default backoff (baseDelayMs: 250) — the mechanism under test is identical either way.
      policyOptions: { baseDelayMs: 20, maxDelayMs: 150, factor: 2, jitterRatio: 0 },
    });

    await wait(800); // let the spectator join and receive real live snapshots before anything else
    ok(stateLog.some((s) => s.s === "playing"), "the spectator received a live snapshot before any disconnect");
    ok(tickAt.size >= 2, `sanity: multiple real ticks observed pre-disconnect (${tickAt.size})`);

    const spectatorId = view.myId();
    const tickAtDisconnect = view.tick();

    // === FORCE-DISCONNECT mid-session: a REAL dropped socket, not a graceful client.close() ========
    socketRef.close();
    await wait(1000); // reconnect backoff + resume round trip

    ok(stateLog.some((s) => s.s === "disconnected"), "the spectator observed the forced disconnect");
    ok(stateLog.some((s) => s.s === "resumed"), "the spectator auto-resumed via qwzspace's own resume-token wiring");
    eq(view.myId(), spectatorId, "the spectator's identity survived the disconnect + resume");

    await wait(1000); // keep spectating post-resume — frames must genuinely keep coming
    const finalSpectatorTick = view.tick();
    ok(finalSpectatorTick > tickAtDisconnect, `frames continue advancing after resume (tick ${tickAtDisconnect} -> ${finalSpectatorTick})`);

    const membersAfterResume = server.room.members();
    ok(membersAfterResume.has(spectatorId), "the resumed spectator kept its ORIGINAL actorId in the room's member table");

    client.close();
    await wait(80);

    // === REPLAY, 2D: fetch the app's own /replay endpoint, exactly as the browser page does ========
    const replay2DRes = await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=2d`);
    ok(replay2DRes.ok, "the /replay endpoint (2D) responded 200");
    const replay2D = await replay2DRes.json();
    ok(replay2D.verified, "the room's own §6 history verification passed, spanning the forced disconnect + resume");

    const replayBuffer2D = createInterpolationBuffer({ maxSamples: 4096 });
    const comparableAts = []; // wall-clock `at` values BOTH buffers actually have a real push for
    for (const f of replay2D.frames) {
      const at = tickAt.get(f.tick);
      if (at !== undefined) {
        replayBuffer2D.push({ type: "full", tick: f.tick, entities: f.entities }, at);
        comparableAts.push(at);
      }
    }

    // === THE 602/602-STYLE PROOF: live vs replay, sampled at IDENTICAL wall-clock instants ==========
    // (this is exactly run-session.mjs's own render-proof technique — see this file's header)
    const observedAts = [...tickAt.values()].sort((a, b) => a - b);
    ok(observedAts.length >= 5, `sanity: enough ticks were actually observed live to sample (${observedAts.length})`);
    // startAt/endAt sweep only the range BOTH buffers have real coverage for — the spectator's own
    // tick-0 bootstrap (before it, or anyone, has joined: `view.entities()` is legitimately empty) is
    // in `tickAt` (the live side observed it) but never in `replay2D.frames` (replay starts at tick 1,
    // the room's first ACTUAL tick — tick 0 is pre-tick state, nothing to replay). Sweeping from
    // observedAts[0] (which can be tick 0's `at`) would query replayBuffer2D before its own earliest
    // sample exists, and sample()'s documented "clamp to the first available sample" behavior would
    // then compare the live side's true (empty) tick-0 state against the replay side's EARLIEST
    // AVAILABLE (already-populated, later-tick) state frozen backward to that instant — a mismatch in
    // the TEST's own sweep bounds, not in live-vs-replay identity. comparableAts is exactly the `at`
    // values both buffers were actually pushed at.
    ok(comparableAts.length >= 5, `sanity: enough ticks are comparable between live and replay (${comparableAts.length})`);
    comparableAts.sort((a, b) => a - b);
    const startAt = comparableAts[0];
    const endAt = comparableAts[comparableAts.length - 1];

    let framesCompared = 0;
    let framesIdentical = 0;
    let firstMismatch = null;
    for (let t = startAt; t <= endAt; t += 16) {
      const liveScene = project(liveBuffer.sample(t), t);
      const replayScene = project(replayBuffer2D.sample(t), t);
      framesCompared++;
      if (sceneEquals(liveScene, replayScene)) framesIdentical++;
      else if (!firstMismatch) firstMismatch = { t, liveScene, replayScene };
    }
    ok(firstMismatch === null, firstMismatch ? `first mismatch at t=${firstMismatch.t}: ${JSON.stringify(firstMismatch)}` : "no mismatch");
    eq(
      framesIdentical,
      framesCompared,
      `frame-set identity, live vs replay (2D), spanning the forced disconnect + resume: ${framesIdentical}/${framesCompared}`,
    );

    // === LIVE + REPLAY, ABRASH: the real raycast path, through the actual SSE stream + /replay?backend=abrash
    const abrashLiveFrames = await ssePromise;
    ok(abrashLiveFrames.size >= 3, `sanity: the SSE stream actually delivered multiple real abrash frames (${abrashLiveFrames.size})`);

    const replayAbrashRes = await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=abrash`);
    ok(replayAbrashRes.ok, "the /replay endpoint (abrash) responded 200");
    const replayAbrash = await replayAbrashRes.json();
    ok(replayAbrash.verified, "the room's own §6 history verification passed for the abrash replay too (same log, same hash)");

    const replayAbrashByTick = new Map(replayAbrash.frames.map((f) => [f.tick, f]));
    let abrashCompared = 0;
    let abrashIdentical = 0;
    let firstAbrashMismatch = null;
    for (const [tick, liveWire] of abrashLiveFrames) {
      const replayWire = replayAbrashByTick.get(tick);
      if (!replayWire) continue; // a frame broadcast after the tick range /replay covered — not a failure
      abrashCompared++;
      if (liveWire.dataB64 === replayWire.dataB64 && liveWire.width === replayWire.width && liveWire.height === replayWire.height) {
        abrashIdentical++;
      } else if (!firstAbrashMismatch) {
        firstAbrashMismatch = tick;
      }
    }
    ok(abrashCompared >= 3, `sanity: enough abrash ticks were comparable between SSE and replay (${abrashCompared})`);
    ok(firstAbrashMismatch === null, `first abrash mismatch at tick ${firstAbrashMismatch}`);
    eq(
      abrashIdentical,
      abrashCompared,
      `frame-set identity, live (SSE) vs replay, through the abrash path: ${abrashIdentical}/${abrashCompared} wire-byte-identical`,
    );
  } finally {
    await server.close();
  }

  done("prove-spectate");
});
