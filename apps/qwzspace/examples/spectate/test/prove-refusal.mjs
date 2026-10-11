// prove-refusal — the server-side half of the refusal bar (see web's own half in
// test/prove-render-gate.mjs, and render-gate.mjs's header for how the two compose). Drives the real
// server, tampers the room's OWN intent log the same way a hostile actor tampering the log's on-disk
// or in-transit representation would (a move record's args rewritten to an impossible value — see
// tamperLog() below), and proves:
//
//   1. GET /replay on a tampered log: verified:false, frames:[] — the honest refusal, by default.
//   2. GET /replay?unsafe=1 on the SAME tampered log: verified:false, unsafe:true, frames non-empty —
//      the explicit escape hatch, clearly flagged, never silently indistinguishable from a trusted
//      replay.
//   3. A CLEAN (untampered) log still verifies true and renders normally — the refusal path is not a
//      blanket "replay is broken", it fires exactly on a real verification failure and nowhere else.
//
// Everything qwzspace-shaped is imported from the INSTALLED package, per this example's own
// fresh-install discipline (see test/prove-spectate.mjs's header).

import { test } from "node:test";
import { ok, eq, done } from "./_harness.mjs";
import { roomHash } from "@red-cup-engineering/qwzspace/intent-log";
import { startSpectateServer } from "../server.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// tamperLog — monkey-patches room.log's own all()/hash() to both report a MUTATED copy of the real
// log, consistently (the same tampering visible to verify()'s replay AND to handleReplay's own frame
// computation — exactly what a hostile rewrite of the log's storage would produce, not a half-tampered
// state no real attack could produce). Returns the mutated record for assertions.
function tamperLog(room) {
  const original = room.log.all();
  const moveIdx = original.findIndex((r) => r.kind === "move");
  ok(moveIdx >= 0, "sanity: the log actually has at least one move record to tamper");
  const before = original[moveIdx];
  const tampered = original.slice();
  tampered[moveIdx] = { ...before, args: { dx: 500 + before.args.dx, dy: 500 + before.args.dy } };

  room.log.all = () => tampered.slice();
  room.log.hash = (uptoTick = Infinity) => roomHash(uptoTick === Infinity ? tampered : tampered.filter((r) => r.tick <= uptoTick), room.log.seed);

  return { before, after: tampered[moveIdx] };
}

test("prove-refusal", async () => {
  const server = await startSpectateServer({
    port: 0,
    host: "127.0.0.1",
    botCount: 6,
    seed: 9191,
    intervalMs: 30,
    roomId: "prove-refusal-arena",
  });

  try {
    await wait(900); // let bots actually generate a real log with move records (join + first wander)

    // === CONTROL: a clean log verifies true and renders normally, on BOTH backends =================
    const cleanRes = await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=2d`);
    ok(cleanRes.ok, "clean /replay (2D) responded 200");
    const clean = await cleanRes.json();
    eq(clean.verified, true, "a clean, untampered log verifies true");
    eq(clean.unsafe, false, "a verified replay is never flagged unsafe, even though it wasn't requested here");
    ok(clean.frames.length > 0, "a verified replay returns real frames");

    // === TAMPER the log =============================================================================
    const { before, after } = tamperLog(server.room);
    ok(before.args.dx !== after.args.dx || before.args.dy !== after.args.dy, "sanity: the tamper actually changed the record");

    // === 1. DEFAULT: verified:false, ZERO frames — the honest refusal =============================
    const refusedRes = await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=2d`);
    ok(refusedRes.ok, "/replay on a tampered log still responds 200 (ok:true, verified:false is not a transport error)");
    const refused = await refusedRes.json();
    eq(refused.verified, false, "a tampered log fails verification");
    eq(refused.unsafe, false, "no escape hatch was requested — unsafe stays false");
    eq(refused.frames.length, 0, "THE REFUSAL: zero frames returned by default for a failed verification");
    ok(typeof refused.logHash === "string" && refused.logHash.length > 0, "the (tampered) logHash is still reported — refusal hides FRAMES, not the fact of what was checked");

    // === 2. ?unsafe=1: verified:false, unsafe:true, frames PRESENT (flagged) =======================
    const unsafeRes = await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=2d&unsafe=1`);
    ok(unsafeRes.ok, "/replay?unsafe=1 on a tampered log responds 200");
    const unsafe = await unsafeRes.json();
    eq(unsafe.verified, false, "still reports the true (failed) verification result — the escape hatch does not launder it into true");
    eq(unsafe.unsafe, true, "THE ESCAPE HATCH: flagged unsafe:true — never indistinguishable from a trusted replay");
    ok(unsafe.frames.length > 0, "?unsafe=1 actually returns the (untrustworthy) frames, not another empty array");
    // (frame COUNT isn't compared against `clean` here: the room keeps ticking in real time between
    // these fetches, so totalTicks legitimately grows — the refusal bar is about whether frames are
    // returned at all, not about pinning an exact count across two calls separated by wall-clock time)

    // === repeat both checks on the ABRASH backend — the refusal bar is backend-agnostic ============
    const refusedAbrash = await (await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=abrash`)).json();
    eq(refusedAbrash.verified, false, "abrash backend: tampered log also fails verification");
    eq(refusedAbrash.frames.length, 0, "abrash backend: zero frames by default too");

    const unsafeAbrash = await (await fetch(`http://${server.host}:${server.port}/replay/${server.roomId}?backend=abrash&unsafe=1`)).json();
    eq(unsafeAbrash.unsafe, true, "abrash backend: ?unsafe=1 also flags unsafe:true");
    ok(unsafeAbrash.frames.length > 0, "abrash backend: ?unsafe=1 also returns frames");
  } finally {
    await server.close();
  }

  done("prove-refusal");
});
