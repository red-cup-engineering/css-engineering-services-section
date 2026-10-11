# Spectate: a live/replay spectator, in 2D and in 3D

A real `Room` over the same demo arena `examples/head-to-head` and `examples/multi-room-load` each
run through `@red-cup-engineering/qwzspace/demo-world`, a handful of seeded roaming bots, and a browser
spectator page that renders the SAME `SceneDescription` through
either `render-2d` or a real `@red-cup-engineering/abrash` software raycaster — live or replayed, with
a mode toggle for each.

This example still runs standalone when copied elsewhere and installed with its declared dependencies.

This example installs both packages **fresh from the registry**
(`@red-cup-engineering/qwzspace@0.6.4`, `@red-cup-engineering/abrash@0.1.1` — see `package.json` and
`.npmrc`), never by importing this repo's own `src/` directly. A clean `npm install` + a green
`npm test` here doubles as this repo's fresh-install proof for the qwzspace version this example was
built against.

```
npm install     # fresh install from the registry — see .npmrc
npm run server  # starts the room + bots + web server on http://127.0.0.1:8787/
npm test        # headless: drives the server itself, no browser needed
```

Open `http://127.0.0.1:8787/` and pick a **backend** (2D / Abrash 3D) and a **mode** (Live / Replay).
`SPECTATE_BOTS=40 npm run server` changes the bot count; the default is 20.

## What it demonstrates

**One projection path, two spatial backends.** `render-2d` and the abrash backend both consume the
identical `project(roomState, tick) -> SceneDescription` output and both conform to the identical
`@red-cup-engineering/qwzspace/spatial-backend` contract (`assertBackendConformance()`,
un-modified, checks both — see `test/prove-abrash-backend.mjs`). Switching the backend selector in
the browser never changes what data is flowing, only what draws it.

**Live spectation and replay spectation are the same code, fed differently.** The 2D path is the
clearest version of this: one `InterpolationBuffer`, one `project()` call per animation frame, one
`backend.render()` call (`web/spectate.mjs`) — live mode feeds it from a real websocket, replay mode
feeds it from the room's own `/replay` endpoint (`room.verify()` + a fresh `replay()`, run
server-side). Nothing about the render loop itself knows which one it's looking at.

**A real 3D backend, honestly scoped to where it can actually run.** `shared/spectate-render.mjs`
is the one call site in this whole example that ever calls into `@red-cup-engineering/abrash`'s
raycaster (`world.mjs` / `raycaster.mjs`) — and it runs **server-side only**. That's not a
simplification for the demo; it's because those modules transitively import `node:crypto` (via
`@561-group/computer`), which does not resolve as native ESM in a browser. The server renders each
tick's frame once and ships the raw RGBA bytes down the wire (SSE for live, a JSON array for replay);
the browser's `web/render-abrash-adapter.mjs` imports exactly one abrash module —
`abrash/framebuffer`, which has zero imports of its own — to blit what the server already rendered.
See `shared/spectate-render.mjs`'s own header for the full reasoning.

**Frame-set identity, proven headlessly, through both backends, spanning a real disconnect.**
`test/prove-spectate.mjs` drives the actual server: a live 2D spectator over a real websocket, a
**forced disconnect** (the raw socket is closed mid-session, not the client), an automatic resume
under the same identity, then a fetch of `/replay?backend=2d` — and asserts `project()` output is
byte-identical between the live and replayed paths at every sampled instant across that whole span
(the same technique `examples/head-to-head/run-session.mjs` uses for its 602/602 proof). It does the
same thing for the abrash path: SSE-collected live frames vs. `/replay?backend=abrash` frames,
compared byte-for-byte on the wire. A real forced disconnect that produced a duplicate entity, a tick
regression, or a corrupted position would show up here as `framesIdentical < framesCompared` — that
divergence-or-not **is** the resume-under-render proof, not a separate mechanism.

`test/prove-abrash-backend.mjs` proves three narrower things about the abrash backend on its own:
backend-contract conformance (both backends, same scene), frame determinism (the same
`SceneDescription` + the same camera renders a byte-identical framebuffer, twice, independently — and
a *different* camera does NOT match, so the determinism claim isn't vacuous), and the 602/602-style
live-vs-replay proof run through the real raycaster (byte-identical framebuffers at all 26 compared
ticks, in one measured run — see the test's own output).

## History verification and the refusal bar

`/replay`'s whole value proposition is that a replayed history is trustworthy because `room.verify()`
(§6) checked it — so a replay that FAILS verification must never render as if nothing were wrong. The
bar this example holds itself to:

- **A failed verification returns `verified:false` and `frames: []` — by default, always.** No
  frames, not "frames with a badge on them." `server.mjs`'s `handleReplay` gates the (potentially
  full-log) replay computation itself on `verify.ok`, so the honest-refusal path costs exactly what
  `verify()` already costs, nothing extra.
- **`?unsafe=1` is the one sanctioned escape hatch** — for debugging a verification failure, not for
  hiding one. It returns the (untrustworthy) frames anyway, but the response says so: `unsafe:true`.
  A verified replay is NEVER flagged `unsafe`, even if `?unsafe=1` was on the URL — the flag reflects
  whether the escape hatch was actually NEEDED and GRANTED, not whether it was merely requested (a
  client's own claim proves nothing; see `web/render-gate.mjs`'s header for why the browser gate reads
  the server's `unsafe` field, never its own request).
- **The browser never calls `backend.render()` (2D) or `blitter.blit()` (abrash) for a refused
  replay.** `web/spectate.mjs` decides whether to even START its render loop via the pure
  `shouldRenderReplay()` gate in `web/render-gate.mjs`, BEFORE ever touching the buffer/backend — a
  refused session pushes zero frames and calls render zero times, and `web/index.html`'s badge reads
  "VERIFICATION FAILED — REFUSED" with an explanatory note, instead of quietly swapping color while
  the canvas kept drawing tampered frames underneath it (the failure mode this bar exists to close).
  Check "unsafe (debug)" in the page's controls and restart to see the untrusted frames anyway,
  clearly labeled.

`test/prove-refusal.mjs` proves the server half against a real, deliberately tampered log (a `move`
record's `args` rewritten mid-session, the same kind of tamper a hostile rewrite of the log's storage
would produce): zero frames by default, flagged non-empty frames under `?unsafe=1`, on both backends,
with a clean-log control proving the refusal path fires on a real failure and nowhere else.
`test/prove-render-gate.mjs` proves the client half — `shouldRenderReplay()` in complete isolation,
every input combination it can be asked to decide, no server, no DOM.

## The resume seam

`test/prove-spectate.mjs`'s live-vs-replay identity proof spans a **forced resume** (the raw socket is
closed mid-session, not the client) — and an outside verification pass on the flagship this example
was built alongside caught it occasionally failing right after that resume, in a tight cluster of
mismatched frames. Two questions needed answering: was the client's `InterpolationBuffer` mishandling
the compressed burst of catch-up ticks a resume delivers, or was something else wrong?

**The determination: not the buffer.** `test/prove-interpolation-buffer-seam.mjs` isolates
`createInterpolationBuffer` completely — no network, no room, no wall clock — and proves that two
buffer instances fed the IDENTICAL (tick, timestamp, entities) data always produce byte-identical
`sample()` output, burst or no burst (one case compresses 40 ticks into 40 consecutive milliseconds,
swept at sub-millisecond query resolution — still zero mismatches). The buffer is a pure function of
what it's given; feeding it an INCOMPLETE stream (one entity's update silently missing, no compression
involved at all) reproduces a mismatch trivially — confirming the fault was always about what data
reaches the buffer, never about how the buffer processes it.

**The real bug: a server-side gap in `room.mjs`'s own resume delivery.** A subscriber's diff cursor
(`snapshot-manager.mjs`'s per-subscriber `state.lastView`) is dropped the instant its connection closes
(`broadcast-hub.mjs`'s `remove()`) and only starts fresh again once the resumed connection's own
subscriber is bound — nobody is recording that actor's ring-buffer entries for the ticks in between.
`handleResume` sent exactly what the ring buffer had (correct, as far as it went) and then **silently
discarded** its own end-of-resume reprime frame, on the assumption the ring-buffered catch-up already
reached "now." It doesn't, whenever the room ticked at all during the gap — which is a near-certainty
on any reconnect slower than one `intervalMs`. An entity that changed (or was created) ONLY inside that
window was invisible to the resumed client, not delayed — genuinely never delivered.

**The fix** (in `@red-cup-engineering/qwzspace`'s own `src/room.mjs`, shipped in `0.4.1`): send that
reprime frame as a real snapshot whenever there's a provable gap (`tick > lastBufferedTick`), instead
of always discarding it. `tests/prove-resume-seam.mjs` (in the package's own root test suite, not this
example) proves it directly and deterministically — no timing race relied on to land inside the gap: a
brand-new actor joins and moves entirely inside a deliberately-won race against the room's own tick
cadence, and the resumed client's reconstructed world is asserted to include it, at its true
authoritative position. That test is RED against the pre-fix code and GREEN against the fix (verified
both ways while landing this change) — the sharpest available proof that this was a real bug, not a
flaky assertion.

One honest caveat: `test/prove-spectate.mjs` itself still occasionally trips over ordinary shared-
machine timing jitter (a real-time round trip to a server this same process just started, or an SSE
stream that takes a beat longer than usual to flush its first byte under load) — unrelated to the
resume seam, and given generous margins plus a small connect-retry in this file's own
`collectAbrashSSE` so it isn't mistaken for the seam again.

## Honest frame-time numbers

Measured directly against the shipped code (`shared/spectate-render.mjs`'s `renderAbrashFrame`, the
exact 44×44 bordered arena and camera this example actually uses), Node 24, this machine's CPU, no
GPU/WebGL involved — a pure-JS software raycast, warmed up, 60-sample runs:

| Resolution (server.mjs's `FRAME_WIDTH`/`FRAME_HEIGHT`) | maxDist | mean | p95 | fps ceiling |
|---|---|---|---|---|
| 160×100 | 40 | 1.47ms | 2.52ms | ~680 |
| **320×200 (the actual default)** | 40 | 3.05ms | 4.60ms | ~330 |
| 640×400 | 40 | 7.30ms | 9.34ms | ~140 |

Entity count barely moves the number at this arena's scale (320×200, maxDist 40): **0 bots 2.96ms,
20 bots 2.60ms, 100 bots 2.79ms** — the wall-column pass (bounded by resolution and the DDA step
count) dominates, not the sprite pass, matching what the vnext design doc predicted from a smaller,
separate benchmark. Encoding the frame to the wire (base64 over the raw RGBA bytes,
`frameToWire()`) adds well under a millisecond on top: render+encode together average **3.41ms** for
a 320×200 frame with 20 bots. The wire payload itself is **~341KB per frame** (256,000 bytes of raw
RGBA inflated by base64 + a thin JSON envelope) — real, not free, which is exactly why
`startAbrashLiveLoop` in `server.mjs` skips the raycast (and the broadcast) entirely whenever nobody
is connected to `/live/abrash-frames`, rather than rendering unconditionally on every tick.

**What this means for the app's own defaults:** at `intervalMs: 150` (qwzspace's simulation tick,
~6.7 ticks/sec) the raycast cost is nowhere near the bottleneck — even 640×400's 7.3ms mean fits
inside a single simulation tick with room to spare. The number that actually matters for a
*continuously rendering* consumer (a 60fps browser loop, not this server's once-per-tick abrash path)
is the **display frame budget (16.7ms @ 60fps)**, not the tick interval — 320×200 fits it with
headroom, 640×400 does not on modest hardware. This example's abrash path sidesteps the question
entirely by rendering once per simulation tick server-side rather than once per display frame
client-side (see "A real 3D backend," above) — a deliberate, documented difference in cadence
between the two backends, not a hidden one: the abrash view is tick-locked, the 2D view is
rAF-smoothed via `InterpolationBuffer`.

## Layout

```
server.mjs                      one process: the Room, N bots, static files, /replay (refusal-bar-gated), SSE live frames
shared/bots.mjs                 N seeded roaming clients (mulberry32 PRNG, outside runTick per §0)
shared/spectate-render.mjs      the ONE call site into @red-cup-engineering/abrash's raycaster
shared/create-abrash-backend.mjs a real spatial-backend-conformant abrash backend (setCamera/followEntity too)
web/index.html                  the page: backend picker, mode toggle, unsafe(debug) checkbox, tick/fps/verification readout
web/spectate.mjs                the one piece of browser app logic — wires (backend × mode) to a <canvas>, refusal-gated
web/render-gate.mjs             the pure shouldRenderReplay() decision — the client half of the refusal bar
web/render-abrash-adapter.mjs   browser-side: blits server-rendered abrash frames (imports only abrash/framebuffer)
test/prove-spectate.mjs         headless: drives the real server, both modes, forced disconnect + resume
test/prove-abrash-backend.mjs   the abrash backend's own conformance / determinism / 602-style proofs
test/prove-refusal.mjs          the server half of the refusal bar: tampered log -> zero frames / ?unsafe=1 -> flagged
test/prove-render-gate.mjs      the client half of the refusal bar: shouldRenderReplay(), every case, in isolation
test/prove-interpolation-buffer-seam.mjs  isolates createInterpolationBuffer — proves the resume-seam bug wasn't here
```

## Scope notes

- **The abrash camera is a deterministic orbit, keyed off tick alone** (`cameraForTick` in
  `shared/spectate-render.mjs`) — not a follow-cam driven by connection/subscriber order, which would
  not be replay-stable (a live room's subscriber order and a replay's iteration order are not
  guaranteed to agree). `setCamera`/`followEntity` are real, working parts of the backend contract
  (see `test/prove-abrash-backend.mjs`'s dedicated case) but server.mjs's own live/replay paths never
  invoke them — every spectator, live or replayed, sees the same orbit.
- **Room `y` maps to abrash's depth axis `z`**, never a height axis — `abrash@0.1.1`'s billboard pass
  has no vertical-placement parameter, so a domain whose entities carry a meaningful vertical
  coordinate has nowhere to put it in this mapping today. This demo's arena is flat, so the gap
  doesn't bite here, but it's a real limit of the current seam, not something papered over.
- **This example's own `test/prove-*.mjs` files are NOT part of `@red-cup-engineering/qwzspace`'s
  published package** — they live only in this repo, run against the fresh-installed dependency, same
  as `examples/head-to-head`'s own tests.
- **This example is standalone**: copy the `examples/spectate` directory anywhere, `npm install`
  against a registry that mirrors `@red-cup-engineering/*` and `@561-group/*` (see `.npmrc`), and
  `npm run server` / `npm test` both work with no other part of this repo present. The demo arena
  comes from `@red-cup-engineering/qwzspace/demo-world`.
