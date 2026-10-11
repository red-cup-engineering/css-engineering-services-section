# @red-cup-engineering/qwzspace

QuasiSpace (qwzspace) is a realtime webapp-game engine and spatiotemporal room platform, an homage
to CrystalSpace. It sits between a game's domain logic and its transports. Generic validated queues,
append-only records, incremental projections, and numbered-step replay come from
`@red-cup-engineering/event-stream-data-service`; QwzSpace retains room, tick, provenance, transport,
resume, spatial, and game semantics. Domain state, folding, and persistence remain supplied through
explicit interfaces.

## What it is

A fixed-tick transaction boundary over an append-only trace. Every tick the engine drains queued
player intents (single-writer), re-folds the touched subjects, and projects interest-filtered
settled-section deltas to every subscriber.

- `subscribe(subject)` yields settled-section frames that re-fold on append — a reactive view over
  the trace.
- The engine projects interest-filtered deltas over the settled trace.
- The fixed tick is a transaction boundary, not a clock the logic depends on.

On top of that core, `Room` adds: first-class rooms with server-bound-provenance intent logging,
reconnection-with-resume off a per-actor delta ring buffer, a replay-verifiable-room contract
(purity + provenance + self-audit), a client SDK (browser + Node), and a tick-locked renderer
where a live room and a replayed one render through the identical projection path. Design
background: `2026-08-19-note-on-qwzspace-vnext-spec.md` and
`2026-08-19-note-on-qwzspace-market-teardown.md` (in this package's `content/` notes).

The optional `@red-cup-engineering/qwzspace/scene` module supplies the recovered
icosahedral world, evidence-based existence and death rules, causal history, and
render-tier projections. Its geometry uses the exact quadratic arithmetic in
`@red-cup-engineering/metrologic/articulation/predicating/geometry/spatial/icosahedral`.
`Scene` can be stepped directly; `createQwzspaceScene` connects it to the same
Qwzspace transport and tick implementation used by other domains.

## Modules (import by subpath)

Core engine:

| subpath | what |
| --- | --- |
| `@red-cup-engineering/qwzspace/tick-driver` | the setInterval cadence + overrun guard (single-writer) |
| `@red-cup-engineering/qwzspace/intent-queue` | the validate-and-queue single-writer staging area |
| `@red-cup-engineering/qwzspace/snapshot-manager` | the reactive view over the trace (full/delta + interest) |
| `@red-cup-engineering/qwzspace/broadcast-hub` | the live-client set + per-tick push (transport-agnostic) |
| `@red-cup-engineering/qwzspace/create-server` | canonical Web application routes for bounded intent intake, snapshots, and SSE; optional WebSocket upgrades share the same tick state |
| `@red-cup-engineering/qwzspace/http-ws-server` | the room transport over the shared RFC 6455 frame service |
| `@red-cup-engineering/qwzspace/protocol` | the wire shapes + encode/decode boundary (browser-safe), with opt-in entry packing |
| `@red-cup-engineering/qwzspace/create-server` | the composition root tying it all together |

Rooms, replay, and the client SDK:

| subpath | what |
| --- | --- |
| `@red-cup-engineering/qwzspace/room` | `createRoom()` — first-class rooms: intent log, presence, resume, replay-verification, self-audit |
| `@red-cup-engineering/qwzspace/room-registry` | `createRoomRegistry()` — list/create/get/destroy many independent rooms |
| `@red-cup-engineering/qwzspace/intent-log` | the `{tick,seq,actorId,kind,args}` record + `roomHash()` |
| `@red-cup-engineering/qwzspace/replay` | `replay(log, {...}) -> folded state`, purely from a game's own three functions |
| `@red-cup-engineering/qwzspace/resume` | signed resume tokens (HMAC) + a bounded per-actor delta ring buffer |
| `@red-cup-engineering/qwzspace/client` | isomorphic client core: `InterpolationBuffer`, `RealtimeConnectionPolicy`, `WorldView` |
| `@red-cup-engineering/qwzspace/client-browser` | browser transport wrapper (native `WebSocket`) |
| `@red-cup-engineering/qwzspace/client-node` | Node transport: Node's built-in standards-compliant `WebSocket` with object-send compatibility |
| `@red-cup-engineering/qwzspace/project` | `project(roomState, tick) -> SceneDescription` — the renderer's backend-neutral contract |
| `@red-cup-engineering/qwzspace/fiber` | `projectFiber(frame, world) -> SceneDescription` — one actor's FeltOS perception frame (plus the world's public map, terrain and tide) as the scene every tier draws |
| `@red-cup-engineering/qwzspace/environment` | `environmentAt(clock, world)` — sun, moon, daylight, sky, tide level and weather at a world time, pure |
| `@red-cup-engineering/qwzspace/terrain` | `terrainChunks(samples, layout)` — a heightfield cut into skirted chunks at several levels of detail, plain arrays |
| `@red-cup-engineering/qwzspace/assets` | `createAssetResolver()`/`wellKnownFetch()` — RFC 6920 `ni:` assets fetched from `/.well-known/ni/` and checked against their hash |
| `@red-cup-engineering/qwzspace/render-3d` | the webgl tier: qwzspace's own 3D engine — `linear` (matrices, rays), `solids` (meshes), `scene-graph` (what to draw, headless), `gpu-webgl2` (the device) — with `project` and `pick` |
| `@red-cup-engineering/qwzspace/game-client` | `createGameClient(mount, game)` — the one heads-up shell every game over qwzspace plays in: the scene view (3D, then 2D, then text), labels, the here panel, the menu, chat with history, a hotbar, a minimap, chase and look cameras; styled by `game-styles` (`GAME_STYLES`, themed by `--qz-*` properties) |
| `@red-cup-engineering/qwzspace/render-2d` | the canvas2d tier (native `<canvas>`, no dependency) |
| `@red-cup-engineering/qwzspace/render-text` | the text tier: the same scene as lines of prose — the fallback and the screen-reader supplement |
| `@red-cup-engineering/qwzspace/spatial-backend` | the spatial-backend contract, made checkable: `capabilitiesOf()`, `assertBackendConformance()` |
| `@red-cup-engineering/qwzspace/drawables` | the procedural vector registry — `registerDrawable()`/`resolveSprite()`, no raster assets |
| `@red-cup-engineering/qwzspace/tween` | presentation-effect easing (scale/rotation/opacity/tint, enter/exit) — `interpolateScene()` |
| `@red-cup-engineering/qwzspace/particles` | deterministic particle/FX effects — `createEffect()`/`sampleEffect()`, seeded presets |
| `@red-cup-engineering/qwzspace/camera` | pan/zoom/rotate + deterministic screen-shake — `resolveCamera()` |
| `@red-cup-engineering/qwzspace/celebration` | composable big-moment choreography (camera + particles + overlay) — `celebrate()` |
| `@red-cup-engineering/qwzspace/render-loop` | the one-call `createRenderLoop()` glue: buffer → tween → backend, per frame |
| `@red-cup-engineering/qwzspace/audio-cues` | a pure wire-event → audio-cue mapping + dispatcher (no audio engine dependency) |
| `@red-cup-engineering/qwzspace/deterministic-random` | the seeded hash/noise primitive particles.mjs/camera.mjs share |
| `@red-cup-engineering/qwzspace/lobby` | `createLobbyRegistry()`/`createLobbyWorld()` — matchmaking/discovery: named, capacity-bounded, listable rooms |
| `@red-cup-engineering/qwzspace/admin` | `attachRoomMeters()`/`createAdminHandler()` — a read-only observability surface: members, checkpoints, self-audits, queue depth, wire counts, tick jitter, as JSON and as a TUFTE document |
| `@red-cup-engineering/qwzspace/persistence` | `createFileStore()`/`attachPersistence()`/`restoreRoom()` — a persistence adapter seam + zero-dep reference store, so a process restart replays forward instead of losing the room |
| `@red-cup-engineering/qwzspace/tufte` | `createTufteRoomModel()`/`renderTufteRoomDocument()` — the server-first TUFTE presentation boundary for tick-numbered room projections |

Every subpath ships a `.d.ts` alongside its `.mjs`.

## Rooms, in shape

```js
import { createRoom } from "@red-cup-engineering/qwzspace/room";

const room = createRoom({
  id: "arena-1",
  world: createMyWorld,      // () => ({ runTick, subjectsOf, snapOf }) — a FACTORY, called fresh
                              // for replay/self-audit so they never share mutable state with the
                              // live instance
  validate: myValidate,      // (raw, actorId) -> {kind, args} | null — the game's trust boundary
  interest: () => true,      // optional per-subscriber interest predicate
  intervalMs: 100,
});

room.attach(httpServer);     // wires real WebSocket upgrades
room.start();                 // runs the tick cadence
await room.verify();          // { ok, replayedStateHash, liveStateHash, ... } — the replay-verifiable-room contract, on demand
```

Presence is folded state: a client's `join` becomes a `presence.join` intent through the same queue
as any other action, and a dropped connection gets a grace window (backed by the resume ring
buffer) before `presence.leave` fires — a reconnecting player never actually "left" the folded
world.

## The replay-verifiable room contract

For any room, given its seed and its complete ordered intent log, `replay(log, {...})` is a pure
function whose output hash is byte-identical to the hash of the room's actual live-derived state at
the same tick — independent of who computes it, when, or how many times.

Three obligations, each tested:

- **Purity** — `tests/prove-determinism.mjs` runs the identical `(seed, log)` through two separate
  OS processes and asserts byte-identical hashes.
- **Provenance** — `actorId` is bound server-side from the live connection at join/resume time,
  never read from the client-supplied wire body (`src/room.mjs`'s `wireConnection`) —
  `tests/prove-hostile-client.mjs` proves a spoofed `actorId`/`tick` in an intent body is silently
  ignored.
- **Self-audit** — a room can periodically (or on demand, via `verify()`) replay its own recent
  history from a fresh, independent domain instance and diff the result against its live cache.
  `tests/prove-self-audit.mjs` proves this both ways: it never false-flags a genuinely deterministic
  world, and it catches a world that cheats (reads `Math.random()` inside `runTick`).

## The renderer

```js
import { project, sceneEquals } from "@red-cup-engineering/qwzspace/project";
import { createBackend } from "@red-cup-engineering/qwzspace/render-2d";

const scene = project(room.snapshot.full(tick), tick);   // -> { tick, entries: [...] }
createBackend({ mount: canvasElement }).render(scene);
```

`project()` is a pure function of its input — the same call, given either a live room's cache or a
`replay()`'s derivation at the same tick, produces byte-identical output. This is what makes
spectating a live room and scrubbing a replay the same frontend code pointed at two different
sources — no separate "replay mode."

### Three tiers, one scene

A FeltOS game sends each client one actor's perception frame. `projectFiber(frame, world)` turns that
frame — plus the world's static description (`{tide, terrain: {address, origin, spacing, columns,
rows}, places}`) — into one `SceneDescription` in the world's frame (x east, y north, z up, metres),
with the environment (`environmentAt`) attached. Every tier draws that same scene; graphics come first
and text is the fallback and the supplement:

```js
import { projectFiber } from "@red-cup-engineering/qwzspace/fiber";
import { createAssetResolver, wellKnownFetch } from "@red-cup-engineering/qwzspace/assets";
import { createBackend as webgl } from "@red-cup-engineering/qwzspace/render-3d";
import { createBackend as text } from "@red-cup-engineering/qwzspace/render-text";

const scene = projectFiber(frame, world);
const view = webgl({ canvas, assets: createAssetResolver({ fetchBytes: wellKnownFetch(location.origin) }) });
await view.ready;                                  // "webgl2", or null with no device
view.render(scene);
text({ write: (lines) => panel.replaceChildren(...lines.map(asParagraph)) }).render(scene);
```

- **webgl** (`render-3d`) — the engine's own: terrain as LOD chunks resolved by content address, the
  water plane at the tide's level, sky, fog, sun and moon from the clock, rain under weather, places
  from the public map as shells, entities ground-clamped and reconciled by id, a chase camera on the
  actor where the graph stands it (or a free camera via `setCamera`), `project(point)` to the screen
  and `pick(x, y)` back into the world. Everything above the device is pure and proved headless; the
  device draws a frame of `{ view, projection, eye, light, items }`, so a WebGPU device slots in
  beside `gpu-webgl2` without touching the graph.
- **canvas2d** (`render-2d`) — the flat map view.
- **text** (`render-text`) — the room, who and what is here, what is carried, the exits.

`examples/island/` is a runnable world: a FeltOS island with a heightfield, a tide, places and things,
served as a real game client gets it (frame, description, `ni:` assets), drawn by the webgl tier with
the text panel beside it:

```
node examples/island/server.mjs   # then open http://127.0.0.1:8765/?time=9&weather=clear&view=overview
```

### The spatial-backend interface

A **spatial backend** turns one `SceneDescription` into pixels somewhere. The interface is small on
purpose — one required member, three optional ones a backend declares only if it actually has the
concept:

```ts
createBackend(opts) -> {
  render(sceneDescription, tick),   // REQUIRED. Called once per frame with whatever SceneDescription
                                     // the caller currently has. Never mutates its argument; never
                                     // touches the network, the log, or the tick-driver.
  setCamera?(pose),                 // OPTIONAL. { x, z, angle, zoom } in room coordinates ("zoom" is
                                     // NEW this pass, added additively — see camera.mjs). A backend
                                     // with no camera concept omits this.
  followEntity?(id | null),         // OPTIONAL. Chase-cam convenience; null = free camera.
  capabilities?: { camera, dims },  // OPTIONAL. Self-describing, so a caller feature-detects instead
                                     // of sniffing which module it imported.
}
```

`render-3d` declares `{ camera: true, dims: 3 }` and implements both `setCamera` and
`followEntity`. `@red-cup-engineering/qwzspace/render-2d` gained a REAL,
working `setCamera(pose)` this pass (feed it `camera.mjs`'s `resolveCamera()` output) but still never
declares a `capabilities` field, and deliberately does NOT implement `followEntity` at all —
`spatial-backend`'s `capabilitiesOf()` computes `followEntity` by unconditional reflection (any
backend exposing the method reports the capability, regardless of self-declaration), so adding one
would have silently flipped this package's own pinned conformance test. `capabilitiesOf()` therefore
still fills in the honest default (`{ camera: false, followEntity: false, dims: 2 }`) for render-2d —
the capability is real and callable, just not yet discoverable by reflection.

`@red-cup-engineering/qwzspace/spatial-backend` makes the interface checkable rather than only
documented:

```js
import { assertBackendConformance, capabilitiesOf } from "@red-cup-engineering/qwzspace/spatial-backend";

assertBackendConformance(myBackend, scene, scene.tick); // throws, naming the violation, or returns
                                                          // { ok: true, capabilities }
```

It imports nothing backend-specific — no canvas, no `@red-cup-engineering/abrash` — so the identical
checker validates `render-2d.mjs` and any externally-authored backend without this package ever
depending on what that backend depends on.

**A real 3D backend exists** — `examples/spectate/` in this package's own repo renders the same
`SceneDescription` through `@red-cup-engineering/abrash`'s software raycaster (grid-DDA walls, a
billboard/sprite pass for entities, `Framebuffer` → `paintToCanvas`). It is NOT built inside this
package: `@red-cup-engineering/abrash` is a real npm dependency (itself depending on
`@561-group/computer`), and adding it to this package's own `dependencies` would impose a large,
rendering-specific dependency on every consumer, including the ones that only want `render-2d`. The
abrash backend adapter lives in the consuming example app, imports `./spatial-backend` and `./project`
from this package, and is checked with the identical `assertBackendConformance()` this package ships —
see `examples/spectate/README.md` for what it demonstrates and the honest scope note on where the
abrash-backed rendering actually runs (server-side, not in the browser — abrash's `world`/`raycaster`
modules transitively import `node:crypto` via `@561-group/computer`, so they are not importable as raw
`<script type="module">` in a browser without a shim; only `abrash/framebuffer`, which has zero
imports of its own, is imported browser-side, to blit a server-rendered frame).

## The spectacle layer

Before this pass, `render-2d` drew exactly one thing: a labeled colored circle per entity. QwzSpace was
meant to be the house's rendering/animation library and it was weird that it wasn't — a social-casino
game needing slot-reel spins, cascading win celebrations, coin fountains, and glow/pulse had nowhere to
reach inside the engine, and neither did any OTHER kind of 2D game wanting the same vocabulary
generically (a match-3 board's cascade, a platformer's coin pickup, a card game's deal animation). This
pass adds it as engine capability, not a casino feature: `project.mjs`'s scene contract grows optional
`layer`/`scale`/`rotation`/`opacity`/`tint`/`sprite`/`text` fields (a v1-shaped scene renders exactly as
before — see `tests/prove-render-2d-regression.mjs`), and five new pure modules sit on top of it:

- **`drawables.mjs`** — a procedural VECTOR registry (`registerDrawable(name, spec)` /
  `resolveSprite(name, params, tint)`), generalizing the house's zero-raster-assets doctrine (solitaire's
  `cards-svg.mjs` pattern: path/shape data, recolored via a `tint`, never a `.png`). Ships `disc`,
  `chip`, `card-back`, `star`, `coin`, `gem`, `tile`, and `ring` as a proof set.
- **`tween.mjs`** — presentation-effect easing (linear/cubic/elastic/back/bounce), enter/exit fades, and
  per-entity easing overrides. Deliberately never touches `x`/`y`/`z`/`yaw` — that stays
  `InterpolationBuffer`'s job; tween's output LAYERS OVER a buffer-sampled scene (`applyPositions()`),
  it never replaces it.
- **`particles.mjs`** — DETERMINISTIC particle effects (`burst`/`fountain`/`confetti`/`trail`/
  `shockwave`/`glowPulse`, plus `coin-fountain`/`confetti-burst`/`win-glow`/`sparkle-trail` presets).
  Every particle's motion is a closed-form function of its own age, derived from a seeded hash — no
  running RNG stream — so `sampleEffect(effect, tick)` is evaluable at any tick directly, byte-identical
  whether called live or from a scrubbed replay.
- **`camera.mjs`** — pan/zoom/rotate keyframes plus deterministic, seeded, decaying screen-shake, all a
  pure function of a tick number. `resolveCamera(spec, tick)` produces the same `{x, z, angle, zoom}`
  pose the abrash 3D backend's `setCamera` already accepted (extended additively with `zoom`); render-2d
  gains a real `setCamera` this pass too.
- **`celebration.mjs`** — composable big-moment choreography as data: a celebration is a seeded timeline
  of camera + particle + overlay events, generically tiered (`minor`/`major`/`epic`) so any game maps
  its own severity onto it. Ships `jackpot`, `win`, and `flash`; `registerCelebration()` adds a game's
  own.

`render-loop.mjs` is the missing one-call ergonomic entry tying it together — every consumer used to
hand-write "sample the buffer, project it, hand it to the backend"; now:

```js
import { createInterpolationBuffer } from "@red-cup-engineering/qwzspace/client";
import { createBackend } from "@red-cup-engineering/qwzspace/render-2d";
import { createRenderLoop } from "@red-cup-engineering/qwzspace/render-loop";

const buffer = createInterpolationBuffer();
const backend = createBackend({ mount: canvasElement });
const loop = createRenderLoop({ backend, buffer, tweenOptions: { easing: "easeOutBounce" } });
loop.start();   // requestAnimationFrame-driven; loop.tickOnce() drives one frame manually (tests, or
                 // a fixed-step host with no rAF concept at all)
```

### Worked example: a slot-reel spin, entirely in the new vocabulary

Nothing below is casino-specific engine code — it is a GAME using the generic primitives above. The
reel's actual spin motion is the game's own domain logic (ordinary per-tick position updates through the
room, exactly like any other entity movement); qwzspace never simulates a reel.

```js
import { createInterpolationBuffer } from "@red-cup-engineering/qwzspace/client";
import { createBackend } from "@red-cup-engineering/qwzspace/render-2d";
import { createRenderLoop } from "@red-cup-engineering/qwzspace/render-loop";
import { celebrate } from "@red-cup-engineering/qwzspace/celebration";
// importing drawables.mjs registers its standard library (coin/gem/star/...) as a side effect of
// resolving symbols by name below — a game typically also registers its OWN themed symbols here.
import "@red-cup-engineering/qwzspace/drawables";

// The room's domain state already has each reel's three visible symbols; this game maps them onto
// SceneEntry-shaped rows itself (project.mjs's own job for everything ELSE it already knows — kind,
// role, x/y/z/yaw — this game supplies the v2 presentation fields alongside them):
//   { id: "reel0-row1", x: 0, y: currentSpinY, layer: "board", sprite: "gem", scale: 1, opacity: 1 }
// As the reel spins, `y` changes every tick (domain logic) — tween.mjs's "easeOutBounce" easing turns
// those discrete per-tick jumps into a smooth spin-then-settle, purely as a PRESENTATION pass:

const buffer = createInterpolationBuffer();
const backend = createBackend({ mount: canvasElement });
const activeCelebrations = [];
const loop = createRenderLoop({
  backend,
  buffer,
  tweenOptions: { easing: "easeOutBounce" },     // the reel bounces into its final resting position
  getCelebrations: () => activeCelebrations,
});
loop.start();

// on a winning spin, the game fires ONE call — flash / coin fountain / zoom punch / banner text is
// qwzspace's generic choreography, tiered by how big the win was, never a casino-specific concept:
function onWin(tick, tier, seed) {
  activeCelebrations.push(celebrate("jackpot", { tier, seed, startTick: tick, overrides: { text: "MEGA WIN!" } }));
}
```

`celebrate("jackpot", { tier: "epic", ... })` resolves, deterministically, to a screen flash
(`overlay.flash`), a coin fountain (`particles.mjs`'s `coin-fountain` preset), a camera zoom-punch with a
decaying seeded shake (`camera.mjs`), and a banner text entry that eases in/holds/eases out
(`overlay.banner`) — every piece scaled by `tier`, every piece seeded so the SAME `(name, tier, seed,
startTick)` replays byte-identically (`tests/prove-celebration.mjs`'s determinism proof). Swap `"coin"`
for `"gem"`/`"star"`/a game-registered drawable, swap `"jackpot"` for a `registerCelebration()`-defined
name, and the identical mechanism serves a match-3 cascade or a platformer's level-complete fanfare —
nothing above is load-bearing on "slot machine."

## The client SDK

`InterpolationBuffer`, `RealtimeConnectionPolicy`, and `WorldView` form an isomorphic core
(`client.mjs`, zero `node:`/DOM imports) plus thin transport wrappers for the browser
(`client-browser.mjs`, native `WebSocket`) and Node (`client-node.mjs`, Node's built-in `WebSocket`).

```js
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node"; // or client-browser in the browser

const client = connectRoom("ws://localhost:8080/", { name: "wanderer" });
client.sendIntent("move", { dx: 1, dy: 0 });
client.view.me();          // the WorldView's reducer over snapshot/delta frames
```

`InterpolationBuffer` gained one ADDITIVE method this pass, `sampleBrackets(renderTimeMs)` — the same
two raw bracketing samples and the same alpha `sample()` already computes internally, exposed so
`tween.mjs`'s presentation easing can use the identical alpha `sample()` uses for position, without
either mechanism recomputing (or disagreeing about) how far between two ticks the render moment is.
`sample()` itself is completely unchanged; `render-loop.mjs` is what actually composes the two (see
"The spectacle layer," above).

A reconnecting client automatically sends `{k:"resume", token, sinceTick}` instead of a fresh `join`
whenever a resume token from a prior `hello` is on hand — including on a second reconnect, using the
token the server re-issues on each successful resume (`tests/prove-client.mjs`,
`tests/prove-resume-live.mjs`).

## Reconnection-with-resume

The bounded per-actor delta ring buffer already holds exactly what a resuming client needs —
resuming is delivery of buffered deltas, not a special recomputation. If the ring buffer has aged
out, a full-snapshot fallback is used instead.

## Lobby / discovery

Matchmaking is closed the same way every other v-next feature was: as a composition, not a new wire
kind. `createLobbyRegistry` wraps `room-registry.mjs` (unchanged, not forked) with name-based
addressing and capacity; `createLobbyWorld` exposes the set of joinable rooms as a `snapOf`-able
subject, so listing rooms is an ordinary interest-filtered read and `room.create`/`room.destroy` are
ordinary intents:

```js
import { createLobbyRegistry, createLobbyWorld, lobbyValidate } from "@red-cup-engineering/qwzspace/lobby";
import { createRoom } from "@red-cup-engineering/qwzspace/room";

const lobby = createLobbyRegistry({ factory: (id) => ({ world: createMyWorld, validate: myValidate }) });
const lobbyRoom = createRoom({ id: "lobby", world: createLobbyWorld(lobby), validate: lobbyValidate, interest: () => true });

lobby.create("Arena One", undefined, { capacity: 20 });   // name is unique, capacity is a real predicate
lobby.join("Arena One");                                  // -> the live Room, or null if full/unknown
```

**Honest scope note**: a lobby room's `snapOf` reads other rooms' *live* member counts — state that
belongs to those rooms' own logs, not the lobby's. `verify()`/self-audit against the lobby room itself
is therefore not meaningful (the same "domain state is injected and opaque" honesty this README already
states for checkpoints, below) — a lobby is a domain whose whole point is to reflect state it does not own.

## Auth hook seam

Provenance was already solved (`actorId` is bound server-side, never trusted from a client — see "The
replay-verifiable room contract," above); what was missing was binding it to an *account* the first
time. `createRoom`'s optional `authenticate(rawJoinMessage, conn) -> Promise<accountId|null>` is a
mechanism, not an identity system: qwzspace never picks a token format, never verifies anything itself
— it only calls whatever the game supplies and, if it resolves, rebinds the connection's provenance to
that id before the join completes, reusing the SAME resume-token machinery so the identity survives a
reconnect:

```js
const room = createRoom({
  id: "arena-1", world: createMyWorld, validate: myValidate,
  authenticate: async (raw) => verifyMyOwnJwt(raw.token),   // -> accountId, or null to reject the join
});
```

A resolved `authenticate()` sends `{ k: "authenticated", actorId, resumeToken }` (adopted automatically
by `createRealtimeClient`/`connectRoom`, the same way a `resumed` message is); an unresolved one sends
`{ k: "join-failed", reason: "auth-rejected" }` and the connection never becomes a member. An
authenticated identity that already holds a live member slot (e.g. a reconnect that lost its resume
token) reclaims that slot instead of spawning a duplicate — the same "never actually left" discipline
reconnection-with-resume already gives a resumed connection.

## Observability

`@red-cup-engineering/qwzspace/admin` exposes exactly what a room already computes internally —
`members()`, `checkpoints()`, `auditResults()`, `queue.depth()`, `log.length()` — plus wire
message/byte counts and tick-interval jitter, gathered the same external-wrapping technique
`examples/head-to-head/run-session.mjs` already uses (no source edits to the room itself):

```js
import { attachRoomMeters, createAdminHandler } from "@red-cup-engineering/qwzspace/admin";

const meters = new Map([[room.id, attachRoomMeters(room)]]);
const handler = createAdminHandler({ rooms: new Map([[room.id, room]]), meters, path: "/admin" });

httpServer.on("request", (req, res) => { if (!handler(req, res)) /* your own routing */ });
```

`GET /admin` returns JSON; `GET /admin?html` renders the same data as a TUFTE document
(`adminTufteModel(payload)` — a rooms table, then per-room members, checkpoints, and self-audit
tables, tick-numbered so it is an ordinary TUFTE projection); `GET /admin/<roomId>` narrows to one
room. QwzSpace supplies the data; TUFTE (`@red-cup-engineering/web-page-tiling-engine`, the
house web framework) owns the markup, escaping, tables, and styles — this package no longer carries a
hand-rolled HTML view or its own escaper. A programmatic surface first, a document second, answering
"what's actually in this room right now" without a hand-rolled script.

## Wire format: entry packing (opt-in)

The wire-format cost the competitive position ranked first (flat JSON repeats every key name in
every entry of every snapshot and delta) now has a seam in `protocol.mjs`: `packEntries` groups a
frame's entries by exact key signature and sends each group's keys once (`{"$p": [[keys, rows], …]}`).
It is lossless (an absent key stays absent, `null` stays `null`, nested values ride verbatim),
schema-free (the keys travel with the frame), and skipped when it would not pay (fewer than two
entries share a signature). Entry order across signature groups is not preserved; no reader in this
package depends on it (every consumer keys by `id`). `decode` always understands both shapes, so the
packaged client SDK needs nothing; the server side is opt-in:

```js
const room = createRoom({ id: "arena-1", world: createMyWorld, validate: myValidate, pack: true });
```

Off by default because a hand-written client that reads raw JSON off the socket or the SSE stream
must be updated before its room turns this on. Measured, this pass: a 20-entity demo-world snapshot
is 774 B packed against 1,521 B flat (49.1% fewer, `tests/prove-protocol.mjs`); the 20-bot
`examples/head-to-head` session (`QWZSPACE_PACK=1`) sent about 21% fewer wire bytes than the same
session flat (82.4% vs 77.8% below the naive full-broadcast baseline) with all 602 sampled frames
still byte-identical live vs replayed and 20/20 identities preserved. `attachRoomMeters` and the
harness count bytes through the same `encode` the transport uses, so a packed room reports what
actually crossed the wire. A binary encoding remains open; this seam is where it would go.

## Persistence

The most severe honest gap in this package's own review: even the in-memory checkpoint array
(`room.checkpoints()`, capped at 20 entries) is lost on restart, so a process crash has always lost the
*whole* room, not just its uncheckpointed ticks. `@red-cup-engineering/qwzspace/persistence` closes
this with an injected STORE INTERFACE (qwzspace picks no database, matching every other seam in this
package) plus one zero-dep reference implementation:

```js
import { createFileStore, attachPersistence, restoreRoom } from "@red-cup-engineering/qwzspace/persistence";

const store = createFileStore({ dir: "./data/rooms" });     // one append-only-JSONL bucket per room —
                                                              // LIFTED from the house's own MUD/tournament
                                                              // lanes' bucket-store.mjs/store.mjs pattern
const room = createRoom({ id: "arena-1", world: createMyWorld, validate: myValidate });
await room.ready;
await restoreRoom(room, store);        // replays any persisted history into this FRESH room, via the
                                        // room's own real queue/stepOnce — not a parallel engine
const persistence = attachPersistence(room, store, { flushEveryMs: 1000 });
room.start();
// on shutdown: await persistence.flushNow(); persistence.stop();
```

`restoreRoom` does not try to reconstruct folded state from a checkpoint's hash (a hash is not
invertible) — it re-derives the room by re-running its entire persisted intent log through the room's
own live queue/tick machinery, and uses the last persisted checkpoint purely as an *integrity check*
against that replay, exactly the role this README already assigns checkpoints. This does not change the
existing self-audit scope note below (self-audit still replays from tick 0, for the same reason) — it
adds a separate, working answer to "does a process restart lose the room," which self-audit was never
meant to answer.

## Multi-room scale, measured

`examples/multi-room-load/` extends the head-to-head methodology (real websockets, real Rooms, no
mocks) from one room to N independent rooms concurrently in one process, climbing room count and
measuring whether every room's own tick cadence holds — turning "vertical scaling is the natural first
lever" from a stated principle into a number. See its own README for a run's honest results and the
host-contention caveats that come with measuring on a shared machine.

## Optimistic-echo (the client-prediction alternative)

Full client-authoritative prediction contradicts single-writer doctrine — the documented alternative is
`createOptimisticOverlay` (`@red-cup-engineering/qwzspace/client`): the player's own pending intent is
applied to a purely local, disposable rendering overlay the instant it is sent, and discarded the moment
the tick that contains it is acked. The server is still the only writer; nothing predicted is ever fed
back into `WorldView`'s authoritative state or sent anywhere:

```js
import { createOptimisticOverlay } from "@red-cup-engineering/qwzspace/client";
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node"; // or client-browser

const overlay = createOptimisticOverlay({
  predict: (entity, kind, args) => (kind === "move" ? { ...entity, x: entity.x + args.dx, y: entity.y + args.dy } : entity),
});
const client = connectRoom(url, { name: "wanderer", overlay });
client.sendIntent("move", { dx: 1, dy: 0 });   // instant local feedback:
client.predictedMe();                          // -> me() with the pending move already applied
```

## Running the tests

```
npm test    # node --test --test-concurrency=1 --test-timeout=20000 tests/prove-*.mjs
```

Each `tests/prove-*.mjs` file is one `node:test` block using the small assert harness in
`tests/_harness.mjs`. `--test-concurrency=1` runs files one at a time (several proofs open real
localhost sockets).

`examples/head-to-head/run-session.mjs` is a fuller, runnable proof: 20 bot clients over real
websockets, forced disconnects, tick-stability/wire-efficiency measurement, and the live-vs-replay
render proof, over one real session:

```
node examples/head-to-head/run-session.mjs
```

`examples/spectate/` is a second, fuller example: a real room with seeded roaming entities, a browser
spectator page rendering the SAME `SceneDescription` through either `render-2d` or a real
`@red-cup-engineering/abrash` 3D backend, a live/replay mode toggle, and a headless test proving
frame-set identity across both modes plus resume-under-render (a spectator disconnects mid-session,
resumes, and frames continue coherent). It installs `@red-cup-engineering/qwzspace` and
`@red-cup-engineering/abrash` fresh from the registry rather than importing this package's own `src/`
directly — see its own README for why, and for the run instructions.

`tests/prove-fiber-tiers.mjs` projects a real FeltOS town's perception frame and checks the text,
canvas2d and three tiers each draw every entry of it, plus the environment and terrain.
`tests/prove-webgl-browser.mjs` opens `examples/island/` in headless Chromium — once with
`navigator.gpu` removed (must draw WebGL2), once as the browser chooses — and checks day, dusk,
night, storm and high/low water each look like themselves; screenshots land in `$QWZSPACE_SHOTS`.

`examples/multi-room-load/` extends `head-to-head`'s methodology from one room to N independent rooms
concurrently in one process, climbing room count and reporting the first count (if any) where every
room's own tick cadence degrades — see its own README for a run's honest results:

```
node examples/multi-room-load/run-session.mjs
```

## Lifted from

The two games solved the same realtime problem two ways; qwzspace lifts the union, cleaned to the
law, and drops the game-specific projections:

- ruinfold `server/{loop,http,sse,actions}.mjs` + `engine/snapshot.mjs`
- aletheon `server/{app,http,net/ws}.mjs` + `shared/{protocol,encoding}.mjs` + `server/net/session.mjs`'s
  interest-filtered `sync()`.

The client SDK is ported from an unshipped prior-art file at
`.../lib/legacy/computing-with-the-web/src/qwzspace/client.mts`.

## Install footprint

QwzSpace depends on house packages only, by registry name and exact pin. Since 0.9.0 the TUFTE pin
is `0.11.0`, whose application layer pulls the shared web server and request-body services (and,
through them, a handful of public packages from npmjs) into the install closure; QwzSpace's own
modules import only TUFTE's root document renderer, which reaches none of them at runtime.

The webgl tier is qwzspace's own engine and adds no dependency. `esbuild` and `playwright` are
development dependencies, for the island example's bundle and the browser proof. The runtime import
graph is house-only.

## Scope notes

- **Self-audit replays from tick 0**, not from a checkpoint — an incremental checkpoint-resume
  replay would need the game to serialize/restore its own folded domain state, which this engine
  intentionally does not own (domain state stays injected and opaque). Checkpoints are integrity
  markers (`{tick, hash}`), not fast-resume snapshots.
- **The 3D tier ships in this package** (`render-3d`); the older abrash raycaster backend in
  `examples/spectate/` still lives outside it, for the reasons given under "The renderer."
- **The engine draws through WebGL2 only, for now** — the WebGPU device (same frame, WGSL shaders)
  is not written: the development machine's headless Chromium hands out a WebGPU device that is
  destroyed on first present, so it could not be proved here. It wants a machine with a working
  adapter.
- **Terrain does not yet hide what FeltOS sight reports** — sight's line of sight is checked against
  places, not the heightfield, so the scene can show a thing behind a hill.
- **Horizontal/multi-instance room sharding is out of scope** — a room's single-writer state is
  in-process memory. `2026-08-19-note-on-qwzspace-vnext-spec.md` §10 documents the hosting posture
  this implies (one process per host).
