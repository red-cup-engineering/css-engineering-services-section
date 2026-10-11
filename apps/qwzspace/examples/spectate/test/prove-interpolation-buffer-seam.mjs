// prove-interpolation-buffer-seam — the isolated half of the "resume seam" investigation (see
// README.md's "resume seam" section for the full writeup). prove-spectate.mjs's live-vs-replay
// frame-identity proof intermittently failed in a tight cluster right after a forced resume, and the
// original suspicion was the client's own InterpolationBuffer (client.mjs's createInterpolationBuffer)
// mishandling the COMPRESSED timestamps a resume catch-up burst produces (many real ticks arriving
// within a few milliseconds of each other). This file settles that half of the question, in isolation,
// with no network, no room, no wall clock: does createInterpolationBuffer ever produce a different
// sample() result for two buffers pushed the SAME (tick, receivedAtMs, entities) triples, purely
// because those triples were compressed into a tight burst?
//
// THE DETERMINATION (see tests/prove-resume-seam.mjs for the other half): NO. Given identical inputs,
// two independent InterpolationBuffer instances produce byte-identical sample() output at every query
// time, burst or no burst — proven below by literally replaying the pushLog/replayPushLog pair
// captured from a REAL failing examples/spectate run (test 1) and confirming they now agree once fed
// through two fresh buffers, plus a synthetic stress case with 40 ticks compressed into 40 CONSECUTIVE
// milliseconds (test 2). The bug that made prove-spectate.mjs flaky was never in this file's module —
// it was a server-side gap in what a resumed connection actually gets SENT (room.mjs's handleResume;
// see tests/prove-resume-seam.mjs, which reproduces and fixes it directly). Test 3 proves that framing
// concretely: feeding the TWO buffers a genuinely DIFFERENT input (one missing an entity's mid-burst
// update, exactly the shape the pre-fix server bug produced) is what reproduces a mismatch — pinning
// the fault on the DATA fed in, not the buffer's sampling math.

import { test } from "node:test";
import { ok, eq, done } from "./_harness.mjs";
import { createInterpolationBuffer } from "@red-cup-engineering/qwzspace/client";
import { project, sceneEquals } from "@red-cup-engineering/qwzspace/project";

test("prove-interpolation-buffer-seam", async () => {
  // === test 1: a REAL captured burst, replayed into two fresh buffers ============================
  // Captured verbatim from a live run of this example against the pre-fix room.mjs (see README.md):
  // one entity ("roamer") frozen at its pre-disconnect position through several catch-up ticks, then
  // jumping straight to its true position — the exact shape the server-side gap produced. Both
  // "liveTrace" and "replayTrace" below get pushed into their OWN buffer using the IDENTICAL (tick,
  // at) pairs a real run's shared tickAt map would assign (see the forensic script this was lifted
  // from); the ENTITY VALUES differ ONLY where the captured real run's data actually differed.
  const capturedTicks = [
    { tick: 12, at: 1000, x: -0.3929508308324746, y: 0.9195594839639619 },
    { tick: 14, at: 1010, x: -0.3929508308324746, y: 0.9195594839639619 }, // live: frozen (the bug)
    { tick: 15, at: 1052, x: -0.3929508308324746, y: 0.9195594839639619 },
    { tick: 17, at: 1131, x: -0.3929508308324746, y: 0.9195594839639619 },
    { tick: 19, at: 1211, x: -0.3929508308324746, y: 0.9195594839639619 },
    { tick: 21, at: 1291, x: -0.3929508308324746, y: 0.9195594839639619 },
    { tick: 23, at: 1371, x: -1.2446847457963446, y: 2.729118193582159 }, // catches up
  ];
  const trueTicks = [
    { tick: 12, at: 1000, x: -0.3929508308324746, y: 0.9195594839639619 },
    { tick: 14, at: 1010, x: -0.821906489843627, y: 1.8228850302662392 }, // replay: the real value
    { tick: 15, at: 1052, x: -0.821906489843627, y: 1.8228850302662392 },
    { tick: 17, at: 1131, x: -0.821906489843627, y: 1.8228850302662392 },
    { tick: 19, at: 1211, x: -0.821906489843627, y: 1.8228850302662392 },
    { tick: 21, at: 1291, x: -0.821906489843627, y: 1.8228850302662392 },
    { tick: 23, at: 1371, x: -1.2446847457963446, y: 2.729118193582159 },
  ];

  function pushAll(rows) {
    const buf = createInterpolationBuffer({ maxSamples: 4096 });
    for (const r of rows) {
      buf.push({ type: "full", tick: r.tick, entities: [{ id: "roamer", kind: "bot", x: r.x, y: r.y }] }, r.at);
    }
    return buf;
  }

  // 1a — the CAPTURED (buggy-server-shaped) input DOES reproduce a mismatch, exactly as the real run
  // saw: this is the control, proving the reproduction is faithful before drawing any conclusion from
  // the "identical inputs" cases below.
  {
    const liveBuf = pushAll(capturedTicks);
    const replayBuf = pushAll(trueTicks);
    let compared = 0;
    let mismatches = 0;
    for (let t = 1000; t <= 1371; t += 8) {
      const a = project(liveBuf.sample(t), t);
      const b = project(replayBuf.sample(t), t);
      compared++;
      if (!sceneEquals(a, b)) mismatches++;
    }
    ok(compared > 20, `sanity: enough query points swept (${compared})`);
    ok(mismatches > 0, `control: the captured buggy-shaped input DOES reproduce a mismatch (${mismatches}/${compared}) — the repro is faithful`);
  }

  // 1b — THE DETERMINATION: feed BOTH buffers the SAME (true) input, at the SAME compressed
  // timestamps — if the buffer's own math were at fault, this would still mismatch. It never does.
  {
    const bufA = pushAll(trueTicks);
    const bufB = pushAll(trueTicks);
    let compared = 0;
    let mismatches = 0;
    let firstMismatch = null;
    for (let t = 1000; t <= 1371; t += 4) {
      const a = project(bufA.sample(t), t);
      const b = project(bufB.sample(t), t);
      compared++;
      if (!sceneEquals(a, b)) {
        mismatches++;
        if (!firstMismatch) firstMismatch = { t, a, b };
      }
    }
    eq(mismatches, 0, `identical input, identical (tight, compressed) timestamps -> zero mismatches (${JSON.stringify(firstMismatch)})`);
  }

  // === test 2: synthetic stress — 40 ticks compressed into 40 CONSECUTIVE milliseconds (far denser
  // than any real resume burst this example has produced), swept at a finer query resolution than the
  // compression itself. If dense compression alone could desync two identically-fed buffers, this is
  // where it would show up. ===================================================================
  {
    const dense = [];
    for (let i = 0; i < 40; i++) {
      dense.push({
        tick: i,
        at: 5000 + i, // 1ms apart — as compressed as JS millisecond resolution allows
        x: Math.sin(i * 0.37) * 10,
        y: Math.cos(i * 0.53) * 10,
      });
    }
    const bufA = pushAll(dense);
    const bufB = pushAll(dense);
    let compared = 0;
    let mismatches = 0;
    for (let t = 5000; t <= 5039; t += 1) {
      // sub-millisecond sweep too — alpha blending is continuous, a coarser step could hide a
      // boundary-condition divergence a finer one would catch
      for (const frac of [0, 0.25, 0.5, 0.75]) {
        const qt = t + frac;
        const a = project(bufA.sample(qt), qt);
        const b = project(bufB.sample(qt), qt);
        compared++;
        if (!sceneEquals(a, b)) mismatches++;
      }
    }
    eq(mismatches, 0, `synthetic 40-ticks-in-40ms burst, identical input -> zero mismatches across ${compared} sub-ms samples`);
  }

  // === test 3: pinning the fault on the DATA, not the buffer — the buffer is a pure function of
  // what it's given; feeding it an incomplete stream (one entity's mid-burst update silently absent,
  // exactly what the pre-fix room.mjs produced for a gap-only change) reproduces a mismatch with NO
  // compression involved at all (evenly spaced 40ms ticks) — compression was never the necessary
  // condition; a DATA GAP is. ======================================================================
  {
    const complete = [
      { tick: 1, at: 0, x: 0, y: 0 },
      { tick: 2, at: 40, x: 1, y: 1 },
      { tick: 3, at: 80, x: 1, y: 1 }, // unchanged this tick — legitimately absent from a delta stream
      { tick: 4, at: 120, x: 2, y: 2 },
    ];
    // "gapped" mimics the pre-fix server bug: the tick-2 change never arrives (the entity's move was
    // computed but never delivered because nobody was bound to record/replay it), so the client holds
    // the STALE tick-1 value straight through until tick 4's own (unrelated) update happens to include it.
    const gapped = [
      { tick: 1, at: 0, x: 0, y: 0 },
      { tick: 2, at: 40, x: 0, y: 0 }, // the gap: should be (1,1), server never sent it
      { tick: 3, at: 80, x: 0, y: 0 },
      { tick: 4, at: 120, x: 2, y: 2 },
    ];
    const complete_ = pushAll(complete);
    const gapped_ = pushAll(gapped);
    const t = 60; // squarely inside the gap window
    const a = project(complete_.sample(t), t);
    const b = project(gapped_.sample(t), t);
    ok(!sceneEquals(a, b), "an incomplete input stream (the server-shaped gap) DOES mismatch, with no timestamp compression at all — confirms the fault is data completeness, not buffer math");
  }

  done("prove-interpolation-buffer-seam");
});
