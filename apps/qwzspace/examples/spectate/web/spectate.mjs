// spectate — the one piece of app logic, wiring (backend x mode) into a <canvas>. `startSpectate`
// is the entire public surface; index.html calls it once per (backend, mode) selection.
//
// THE 2D BACKEND IS §9's PROOF MADE VISIBLE: one InterpolationBuffer, one project() call per rAF, one
// backend.render() call — live and replay differ ONLY in what feeds buffer.push(). That is deliberate:
// it is the same claim examples/head-to-head/run-session.mjs already proves headlessly (project(live)
// === project(replay) at the same tick), made interactive.
//
// THE ABRASH BACKEND CANNOT SHARE THAT EXACT SHAPE, and says so rather than pretending otherwise: the
// real raycast only runs server-side (see server.mjs's header), so this file never calls project() or
// a spatial backend's render() for the abrash case — it receives ALREADY-RENDERED frames (an SSE
// stream for live, a fetched array for replay) and hands each straight to render-abrash-adapter.mjs's
// blit(). The "one call site" discipline still holds, one level up: every abrash frame this page ever
// shows, live or replayed, passed through shared/create-abrash-backend.mjs's render() on the server —
// see server.mjs and test/prove-abrash-backend.mjs.
//
// A CANONICAL POSITION FIX WORTH FLAGGING: qwzspace's WorldView (client.mjs's createWorldView) only
// snaps an entity's `x`/`y` to a fresh value on its FIRST appearance (or on a "resumed: full" catch-up)
// — every ordinary per-tick delta after that updates `tx`/`ty` (the TARGET) and leaves `x`/`y` frozen,
// because WorldView expects an app to call its own `view.interpolate(dt)` each frame to ease toward the
// target. This app does NOT use that easing — it uses qwzspace's OTHER interpolation mechanism
// (client.mjs's createInterpolationBuffer, the same one project()'s own render pipeline is built
// around), which needs the RAW per-tick target, not a value WorldView is deliberately holding still.
// `rawTargets()` below reads `tx`/`ty` (falling back to `x`/`y` for an entity's very first frame, where
// both are already equal) so every push into this page's own InterpolationBuffer carries the actual
// tick-accurate position, not a value frozen at join time.

import { createInterpolationBuffer } from "/qwzspace/client.mjs";
import { project } from "/qwzspace/project.mjs";
import { connectRoom } from "/qwzspace/client-browser.mjs";
import { createBackend as create2DBackend } from "/qwzspace/render-2d.mjs";
import { createAbrashBlitter } from "./render-abrash-adapter.mjs";
import { shouldRenderReplay } from "./render-gate.mjs";

const MAX_SAMPLES = 8192; // generous: a spectate session's whole tick history, not head-to-head's 4096

function rawTargets(entities) {
  return entities.map((e) => ({
    ...e,
    x: Number.isFinite(e.tx) ? e.tx : e.x,
    y: Number.isFinite(e.ty) ? e.ty : e.y,
    z: Number.isFinite(e.tz) ? e.tz : e.z,
    yaw: Number.isFinite(e.tyaw) ? e.tyaw : e.yaw,
  }));
}

function start2D({ mount, mode, roomId, wsUrl, unsafe, onStatus }) {
  let stopped = false;
  let rafId = null;
  let client = null;

  const backend = create2DBackend({ mount });
  const buffer = createInterpolationBuffer({ delayMs: 100, maxSamples: MAX_SAMPLES });

  // startLoop — the ONLY place backend.render() is ever called from this function. Live mode calls it
  // immediately, below; replay mode calls it ONLY after the refusal gate (shouldRenderReplay) has
  // already said yes — an unverified, non-`unsafe` replay never reaches this point at all, so
  // backend.render() is never invoked for it, not even once, not even with an empty scene.
  function startLoop() {
    function frame() {
      if (stopped) return;
      const scene = project({ entities: buffer.sample() }, buffer.latestTick());
      backend.render(scene, scene.tick);
      onStatus({ tick: scene.tick, entityCount: scene.entries.length });
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  if (mode === "live") {
    onStatus({ verified: null, mode: "live", backend: "2d" });
    client = connectRoom(wsUrl, {
      name: "spectator",
      onState: (s) => onStatus({ connection: s }),
    });
    client.view.on("snapshot", () => {
      buffer.push({ type: "full", tick: client.view.tick(), entities: rawTargets(client.view.entities()) }, Date.now());
    });
    startLoop();
  } else {
    onStatus({ mode: "replay", backend: "2d" });
    // ?unsafe=1 — the debug-only escape hatch (see server.mjs's handleReplay and render-gate.mjs's own
    // header): asking for it does NOT itself force a render, see shouldRenderReplay below, which only
    // trusts the server's own `unsafe` field back, never this request's own intent.
    fetch(`/replay/${encodeURIComponent(roomId)}?backend=2d${unsafe ? "&unsafe=1" : ""}`)
      .then((r) => r.json())
      .then((history) => {
        if (stopped) return;
        onStatus({ verified: history.verified, unsafe: history.unsafe, logHash: history.logHash, totalTicks: history.totalTicks });
        // THE REFUSAL: a verification failure that the server did not (or was not asked to) honor
        // with the `?unsafe=1` escape hatch renders NOTHING — no buffer.push(), no startLoop(), no
        // backend.render() ever called for this session. onStatus({refused:true}) is the only signal
        // this path produces; web/index.html's own badge already renders "VERIFICATION FAILED" off
        // `verified === false`, and now genuinely means "nothing is being shown", not "something
        // untrustworthy is being shown with a red label on it".
        if (!shouldRenderReplay({ mode: "replay", verified: history.verified, unsafe: history.unsafe })) {
          onStatus({ refused: true });
          return;
        }
        // same real-time clock domain sample() defaults to (now() - delayMs) — see the header note on
        // why raw i*intervalMs offsets would desync from Date.now()-based sampling.
        const playStart = Date.now();
        for (let i = 0; i < history.frames.length; i++) {
          const f = history.frames[i];
          buffer.push({ type: "full", tick: f.tick, entities: f.entities }, playStart + i * history.intervalMs);
        }
        startLoop();
      })
      .catch((e) => onStatus({ error: String(e) }));
  }

  return {
    stop() {
      stopped = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      client?.close?.();
    },
  };
}

function startAbrash({ mount, mode, roomId, unsafe, onStatus }) {
  let stopped = false;
  let source = null;
  const blitter = createAbrashBlitter({ mount });

  if (mode === "live") {
    onStatus({ verified: null, mode: "live", backend: "abrash" });
    source = new EventSource("/live/abrash-frames");
    source.onmessage = (ev) => {
      if (stopped) return;
      const wire = JSON.parse(ev.data);
      blitter.blit(wire);
      onStatus({ tick: wire.tick });
    };
    source.onerror = () => onStatus({ connection: "abrash live stream reconnecting" });
    source.onopen = () => onStatus({ connection: "up" });
  } else {
    onStatus({ mode: "replay", backend: "abrash" });
    fetch(`/replay/${encodeURIComponent(roomId)}?backend=abrash${unsafe ? "&unsafe=1" : ""}`)
      .then((r) => r.json())
      .then((history) => {
        if (stopped) return;
        onStatus({ verified: history.verified, unsafe: history.unsafe, logHash: history.logHash, totalTicks: history.totalTicks });
        // THE REFUSAL (abrash path) — same gate, same consequence: blitter.blit() is never called for
        // a refused replay, so the canvas simply never receives a frame for this session.
        if (!shouldRenderReplay({ mode: "replay", verified: history.verified, unsafe: history.unsafe })) {
          onStatus({ refused: true });
          return;
        }
        let i = 0;
        (function step() {
          if (stopped || i >= history.frames.length) return;
          const wire = history.frames[i++];
          blitter.blit(wire);
          onStatus({ tick: wire.tick });
          setTimeout(step, history.intervalMs);
        })();
      })
      .catch((e) => onStatus({ error: String(e) }));
  }

  return {
    stop() {
      stopped = true;
      source?.close?.();
    },
  };
}

// startSpectate({mount, backend:"2d"|"abrash", mode:"live"|"replay", roomId, wsUrl, unsafe, onStatus})
// -> {stop}. `unsafe` (default false) is the debug-only escape hatch: when true AND mode is "replay",
// the replay fetch carries `?unsafe=1` — but rendering still only happens if the SERVER honors it (see
// render-gate.mjs). Meaningless outside replay mode; harmlessly ignored there.
export function startSpectate({ mount, backend, mode, roomId, wsUrl, unsafe = false, onStatus = () => {} }) {
  return backend === "abrash"
    ? startAbrash({ mount, mode, roomId, unsafe, onStatus })
    : start2D({ mount, mode, roomId, wsUrl, unsafe, onStatus });
}
