// prove-render-gate — the render-gate.mjs pure decision function, tested in complete isolation: no
// server, no DOM, no fetch. This is the client-side half of the refusal bar (server.mjs's own half is
// proven in test/prove-refusal.mjs) — every case shouldRenderReplay() can ever be asked to decide.

import { test } from "node:test";
import { eq, done } from "./_harness.mjs";
import { shouldRenderReplay } from "../web/render-gate.mjs";

test("prove-render-gate", () => {
  // live mode always renders — "verified" is not a meaningful concept for a live feed, and this must
  // hold regardless of whatever garbage happens to be in `verified`/`unsafe` for a live call site.
  eq(shouldRenderReplay({ mode: "live", verified: null }), true, "live, verified:null -> render");
  eq(shouldRenderReplay({ mode: "live", verified: false }), true, "live, verified:false -> render (verified is meaningless for live)");
  eq(shouldRenderReplay({ mode: "live", verified: true }), true, "live, verified:true -> render");
  eq(shouldRenderReplay({ mode: "live", verified: false, unsafe: false }), true, "live ignores unsafe too");

  // a verified replay always renders, unsafe or not (a verified history is never "unsafe" per
  // server.mjs's own `unsafe` computation, but the gate itself doesn't need to trust that — verified
  // alone is sufficient).
  eq(shouldRenderReplay({ mode: "replay", verified: true }), true, "replay, verified:true -> render");
  eq(shouldRenderReplay({ mode: "replay", verified: true, unsafe: false }), true, "replay, verified:true, unsafe:false -> render");

  // THE REFUSAL: a failed verification, with no server-honored escape hatch, renders NOTHING.
  eq(shouldRenderReplay({ mode: "replay", verified: false }), false, "replay, verified:false, unsafe omitted -> REFUSE");
  eq(shouldRenderReplay({ mode: "replay", verified: false, unsafe: false }), false, "replay, verified:false, unsafe:false -> REFUSE");
  eq(shouldRenderReplay({ mode: "replay", verified: undefined }), false, "replay, verified still unknown (mid-fetch shape) -> REFUSE (fail safe)");

  // THE ESCAPE HATCH: only when the SERVER'S OWN `unsafe` field says so — this is the whole point of
  // reading the server's answer rather than the client's own request/intent.
  eq(shouldRenderReplay({ mode: "replay", verified: false, unsafe: true }), true, "replay, verified:false, server-honored unsafe:true -> render (flagged)");

  // a client's own REQUEST for the escape hatch, absent the server actually granting it, changes
  // nothing — this is the case that keeps a hostile/buggy caller from rendering tampered frames just
  // by claiming it asked to (see render-gate.mjs's header for why `unsafe` must be the server's field).
  eq(
    shouldRenderReplay({ mode: "replay", verified: false, requestedUnsafe: true, unsafe: false }),
    false,
    "requesting unsafe without the server honoring it (unsafe stays false) -> still REFUSE",
  );

  done("prove-render-gate");
});
