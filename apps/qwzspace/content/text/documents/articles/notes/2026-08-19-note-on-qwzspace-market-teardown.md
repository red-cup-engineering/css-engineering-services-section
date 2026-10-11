---
title: QwzSpace Market Teardown
description: "Competitive teardown of QwzSpace against both its competition classes — realtime room/state platforms (Colyseus, PartyKit/Durable Objects, socket.io, Nakama) and web game/render engines (Phaser, PixiJS, three.js, Babylon.js) — with a parity table and a beat thesis grounded in QwzSpace's one-clock, replay-verifiable-by-construction design."
date: 2026-08-19
keywords: ["qwzspace", "market-research", "platform", "realtime", "game-engine"]
---


Sourced with URLs inline; QwzSpace's own current surface (source tree, exports, consumer wiring,
test/run evidence) is drawn from this package's own source and tests. The differentiator claim here
is architectural, not feature-checklist.

## Owner mandate framing

QwzSpace includes a renderer: transport and tick provide the temporal dimension for 3D rendering. This places its competition in two classes rather than one: netcode platforms on the room/state-sync side, and render/game engines on the scene/camera/render-loop side. QwzSpace's claim is that one clock (the tick) can govern both jobs, a capability no current product in either class claims.

## Headline findings

1. **No product on the market unifies the two classes.** Every stack found pairs a render engine with a netcode library and lives with the seam between their clocks. This is not incidental — it is *documented as the standard integration path* by the render-engine vendors themselves: Babylon.js publishes an official "Real-time Multiplayer with Colyseus" guide, and Phaser/Colyseus jointly publish a "Real Time Multiplayer with Colyseus" Phaser tutorial and a full open-source `tutorial-phaser` repo. Neither Babylon nor Phaser ships netcode; neither Colyseus nor PartyKit ships a renderer. The seam is real, taught, and permanent under the current market structure.
2. **Interpolation is the tell.** Babylon.js's own Colyseus guide instructs developers to use `Scalar.Lerp()` inside the *render* loop to smooth positions arriving from a *separate* network tick — i.e., the render engine's frame clock and the netcode's simulation clock are different clocks by construction, and the developer is the one who has to reconcile them, game by game, project by project.
3. **Replay-verifiable-by-construction is unclaimed.** The realtime-platform class treats anti-cheat as a bolt-on validation layer ("server-authoritative backend that owns truth and validates every action" — the 2026 industry consensus per Roblox's own July 2026 engineering writeup) rather than a structural guarantee. QwzSpace's shape — single-writer `runTick(tick, intents)`, intent log as the wire format, deterministic re-settle — makes replay-verifiability a byproduct of the architecture, not a feature someone has to remember to build.
4. **Interest-filtering already is spatial culling.** QwzSpace's `snapshot-manager.mjs` ships a per-subscriber `interest(id, subscriberId) => bool` predicate — built for bandwidth, but structurally identical to camera-frustum/viewport culling in every render engine surveyed. The renderer QwzSpace "doesn't have yet" is already implied by code that ships today.
5. **Fleet duplication is measurable, not hypothetical.** QwzSpace already ships a zero-dependency `http-sse-server.mjs` that at least two other house fibers (flickering-delve, onestone) hand-rolled independently — the platform-substrate case holds even before any renderer work ships.

## Competition class A — realtime room/state platforms

### Colyseus (Node.js, open source + Colyseus Cloud)
- **Rooms**: first-class `Room` classes with lifecycle hooks (`onCreate`, `onJoin`, `onLeave`, `onDrop`, `onReconnect`). [Rooms docs](https://docs.colyseus.io/room)
- **State sync**: `Schema`-decorated classes; server mutates, binary delta-compressed patches pushed to clients at a configurable `patchRate`; only the latest mutation per property per interval is sent. [State sync](https://docs.colyseus.io/state) · [Schema](https://docs.colyseus.io/state/schema)
- **Reconnection/resume**: `room.reconnectionToken` stored client-side; `onDrop()` holds the seat, `allowReconnection()` opens a resume window, `onReconnect()` fires on success. As of 0.17 the client SDK automates this, preserving callbacks/state listeners across abnormal closures. Known rough edge: multiple GitHub issues on "seat reservation expired" errors under proxy/Redis topologies. [Reconnection](https://docs.colyseus.io/room/reconnection) · [0.17 release](https://colyseus.io/blog/colyseus-017-is-here/) · [issue #343](https://github.com/colyseus/colyseus/issues/343)
- **Client SDK**: JS/TS, Unity, Defold, Haxe, Construct — broad, mature.
- **Scale story**: Colyseus Cloud handles "hundreds and thousands of CCU," framework quoted as scaling "10 to 10,000+ CCU"; a small 1vCPU/1GB instance handles roughly 1,000–2,000 simple connections. [Scalability](https://docs.colyseus.io/scalability)
- **Hosting**: self-host or Colyseus Cloud, starting ~$15/mo, 32 global regions, upfront-provisioned monthly billing with proration credits. [Pricing](https://docs.colyseus.io/cloud/pricing-billing) · [Cloud](https://colyseus.io/cloud-managed-hosting/)
- **Renderer**: none. Ships official integration tutorials for Phaser and Babylon.js as separate products the developer wires up. [Phaser tutorial](https://docs.colyseus.io/learn/tutorial/phaser) · [Babylon guide](https://doc.babylonjs.com/guidedLearning/networking/Colyseus)

### PartyKit (now part of Cloudflare, wraps Durable Objects)
- **Rooms**: "Party" = one Durable Object per room; single-threaded per-room execution model guarantees consistency by construction, at the cost of edge-runtime CPU/memory limits. [How it works](https://docs.partykit.io/how-partykit-works/) · [Zaira Labs 2026 guide](https://zairalabs.ai/guide/tools/partykit-cloud/)
- **State sync**: room-scoped in-memory; explicitly *not* durable storage — the docs tell you to keep live/presence state in room memory and persist to an external DB yourself.
- **Reconnection/resume**: client library wraps WebSocket with reconnection and buffering, but "message history, reconnection state, and conflict resolution require architectural decisions" — i.e., resume semantics are the developer's problem, not a shipped primitive.
- **Client SDK**: JS/TS only (browser + Workers-native).
- **Scale story**: edge-hosted within ~50ms of ~95% of the world's connected population (Cloudflare network reach), acquired into Cloudflare April 2024 specifically for this reach. [Acquisition post](https://blog.partykit.io/posts/partykit-is-joining-cloudflare/) · [HN discussion, "Cloudflare's Durable Multiplayer Moat"](https://news.ycombinator.com/item?id=39990426)
- **Hosting**: usage-based Cloudflare billing; free tier exists.
- **Renderer**: none — pure room-scoped compute/coordination primitive.

### socket.io
- **Rooms**: lightweight room/namespace abstraction over raw WebSocket; not game-state-aware — you build your own state model on top. [Rooms guide](https://www.ctrix.pro/blog/nodejs-socket-io-rooms-guide)
- **State sync**: none built-in — pure pub/sub messaging; ~10M weekly downloads makes it "the self-hosted standard" for signaling, not simulation.
- **Reconnection/resume**: auto-reconnect at the transport level; no room-state resume semantics (you rebuild game state from scratch or track it yourself).
- **Client SDK**: JS everywhere + community ports; extremely broad reach.
- **Scale story**: 100K–200K+ active sockets achievable with Redis/Postgres adapters and namespace partitioning; broadcasting to large rooms can still block the event loop. [Scaling guide](https://medium.com/@connect.hashblock/scaling-socket-io-redis-adapters-and-namespace-partitioning-for-100k-connections-afd01c6938e7)
- **Hosting**: self-host anywhere; no managed product.
- **Renderer**: none — signaling layer only, commonly paired with Phaser by hand in tutorials.

### Nakama (Heroic Labs)
- **Rooms**: server-authoritative match handlers with matchmaker, lobbies, chat/group rooms; configurable tick rate per match (high for action, low for turn-based). [Architecture](https://heroiclabs.com/docs/nakama/getting-started/architecture/) · [Match handler API](https://heroiclabs.com/docs/nakama/server-framework/go-runtime/function-reference/match-handler/)
- **State sync**: server buffers input each tick, dispatches state changes — genuinely tick-driven, closest of the four to QwzSpace's own model on this axis alone.
- **Reconnection/resume**: presence tracked as (user, session, node); after a lost connection, the client must explicitly re-join the match — no automatic seamless resume, unlike Colyseus 0.17.
- **Client SDK**: broad — Unity, Unreal, Godot, JS, C++, and more; built for studio/console-scale titles.
- **Scale story**: Heroic Cloud battle-tested to 15M MAU / 250,000+ peak CCU; independently load-tested to two million concurrent players on AWS. [AWS load test](https://aws.amazon.com/blogs/gametech/how-code-wizards-load-tested-heroic-labs-nakama-to-two-million-concurrent-players-with-aws) · [Heroic Cloud](https://heroiclabs.com/blog/heroic-cloud/)
- **Hosting**: free self-hosted (OSS) or Heroic Cloud, priced by DAU with automated scale-out.
- **Renderer**: none — this is a backend-for-studios product; rendering is entirely the console/Unity/Unreal client's job.

## Competition class B — web game/render engines

### Phaser (2D, HTML5)
- **Scene model**: `Scene`-based, each Scene owns its own display list, physics, and cameras; SceneManager drives multiple scenes. [Scenes](https://docs.phaser.io/phaser/concepts/scenes)
- **Render loop**: pre-render → SceneManager render → per-scene camera render → post-render, `requestAnimationFrame`-driven. [Main loop notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/mainloop/)
- **Camera**: built-in `Camera` per Scene by default; supports multiple cameras (split-screen, picture-in-picture), scaling/rotation/viewport control. [Cameras](https://docs.phaser.io/phaser/concepts/cameras)
- **What makes it win**: Phaser 4 (April 2026) shipped a rewritten renderer with real-time-composable bloom/glow/shadow/blur/color-grading/chroma-key effects across any game object or camera — genuine effects-pipeline parity work aimed squarely at "beat the competition" territory. [Phaser 4](https://phaser.io/phaser4) · [rendering deep dive](https://phaser.io/tutorials/phaser-4-rendering-concepts)
- **Networking**: none shipped — official docs point developers at Colyseus (jointly published tutorial + open-source example repo) or third-party geckos.io (WebRTC/UDP-style) as separate integrations. [Colyseus+Phaser tutorial repo](https://github.com/colyseus/tutorial-phaser) · [geckos.io Phaser example](https://github.com/geckosio/phaser3-multiplayer-game-example)

### PixiJS (2D, WebGL/WebGPU)
- **Scene model**: hierarchical scene graph (`app.stage` root, tree of display objects). [Render loop guide](https://pixijs.com/8.x/guides/concepts/render-loop)
- **Render loop**: `Ticker`-driven, `requestAnimationFrame`-scheduled, walks the scene graph every frame.
- **Camera**: no first-class camera object — camera behavior is simulated via stage transforms (pan/zoom on the root container), a real ergonomic gap relative to Phaser/three/Babylon's dedicated camera classes.
- **What makes it win**: v8's dual WebGL/WebGPU renderer, thousands of sprites at 60fps — the raw 2D-throughput leader among the four. [v8 launch](https://pixijs.com/blog/pixi-v8-launches)
- **Networking**: none — pure rendering library, paired with Colyseus or hand-rolled sockets in every project surveyed.

### three.js (3D, WebGL/WebGPU)
- **Scene model**: `Scene`/`Camera`/`Renderer` triad; multiple scenes possible via custom wrapper classes (no first-class multi-scene primitive). [Scene/camera/renderer](https://sbcode.net/threejs/scene-camera-renderer/)
- **Render loop**: manual `requestAnimationFrame` calling `renderer.render(scene, camera)` — the least opinionated of the four, maximal developer control.
- **Camera**: perspective/orthographic cameras with manual animation (no built-in tween/lerp helper — developers hand-roll movement).
- **What makes it win**: the de facto standard for browser 3D — largest ecosystem, richest material/lighting/post-processing library, biggest talent pool to hire against.
- **Networking**: none shipped. The most commonly cited multiplayer pattern found is WebRTC data channels for peer-to-peer state exchange — i.e., three.js developers reach for an even lower-level primitive than the room platforms above, underscoring how unsolved this seam is even at the top of the render-engine market.

### Babylon.js (3D, WebGL/WebGPU)
- **Scene model**: full observable system across the scene graph and update loop; supports multiple scenes via `createScene` functions called inside the shared engine render loop. [Scene lifecycle](https://deepwiki.com/BabylonJS/Babylon.js/3.2-scene-graph-and-entity-management) · [multi-scene docs](https://doc.babylonjs.com/features/featuresDeepDive/scene/multiScenes)
- **Render loop**: `engine.runRenderLoop`, with an on-demand (non-continuous) rendering mode available for static scenes — closer to a professional CAD/viz-engine posture than a pure game loop.
- **What makes it win**: the only one of the four with an official, first-party-documented multiplayer integration guide at all — which is itself the strongest available evidence for this teardown's core claim.
- **Networking**: none shipped — the official "Real-time Multiplayer with Colyseus" guide is explicit that Babylon owns rendering and interpolation, Colyseus owns rooms and state, and the *developer* owns reconciling the two clocks: the guide's own recommended pattern is running `Scalar.Lerp()` inside the render loop to smooth positions that arrive from Colyseus's separately-clocked state patches. [Guide](https://doc.babylonjs.com/guidedLearning/networking/Colyseus)

## Current surface — what QwzSpace actually is today

(`npm test` passes: 82/82 assertions across 6 `prove-*.mjs` suites, including a live end-to-end
WebSocket exercise with real ticks firing.)

`@561-group/qwzspace` 0.0.2, zero runtime dependencies, ~700 lines across 8 `.mjs` modules exporting 8 subpaths: `tick-driver`, `intent-queue`, `snapshot-manager`, `broadcast-hub`, `http-sse-server`, `http-ws-server`, `protocol`, `create-server`.

- **Tick-driver**: `setInterval`-based transaction boundary; drains the intent queue, calls the game's injected `runTick(tick, intents)` exactly once per tick (single writer), re-settles touched subjects, broadcasts. Overrun-safe (coalesces rather than overlapping a slow tick).
- **Intent queue**: validate-and-stage seam for player input — the wire format is intents, not diffs or RPCs.
- **Snapshot manager**: the architectural core. `snapOf(id, tick)` cache, `bootstrap()` for a full opening frame, `resettle(dirty, tick)` for global deltas, and **per-subscriber interest-filtered deltas** via a pluggable `interest(id, subscriberId) => bool` predicate — QwzSpace itself has no concept of "rooms," only this predicate, which the game supplies.
- **Broadcast hub**: transport-agnostic live-client set, best-effort never-awaited sends.
- **Two zero-dep transports**: a hand-rolled RFC 6455 WebSocket server (real SHA-1/GUID handshake, manual frame masking, ping/pong — no `ws` package) and a plain `node:http` SSE stream. The SSE transport is fully built and tested but currently has zero live consumers.
- **Protocol**: pure wire-shape constructors/encode-decode, no `node:` imports — ships byte-identical to server and browser.
- **Composition root**: `createServer({transport, runTick, subjectsOf, snapOf, validate, interest, bootstrap, ...})` — `step()` for hand-driven deterministic tests, `start()` for timer-driven live operation.
- **What it deliberately does not provide**: persistence, domain state, game logic, or rooms as a first-class concept. All are injected by the consuming game — genuinely a thin, domain-agnostic realtime substrate today, with no renderer at all.
- **Consumers**: Aletheon is the one real, current, live-exercised consumer (`http-ws-server` + `tick-driver`, confirmed in `server/app.mjs` and a live 5-second play session producing 98 real server→client messages across combat/chat/altar/field channels). Ruinfold is *not* a current consumer — qwzspace's own README correctly calls ruinfold "the historical second source [of code lifted into qwzspace], not [a consumer]"; this corrects the common "shared by Aletheon and Ruinfold" phrasing. No design document for "tidepool MUD" exists yet under that name at all; Okaga's real design doc discusses Discworld-MUD-style presence/rooms/talk but never names qwzspace — both are real future customers, not yet textually committed ones.
- **Fleet-duplication evidence**: per the architecture decision record, qwzspace already ships `http-sse-server` that flickering-delve and onestone each hand-duplicated independently — the platform-substrate case holds before any renderer work ships.

## Parity table

Legend: ✅ has it · ➖ partial/weak · ❌ absent · — n/a

| Dimension | Colyseus | PartyKit | socket.io | Nakama | Phaser | PixiJS | three.js | Babylon.js | **QwzSpace (today)** |
|---|---|---|---|---|---|---|---|---|---|
| Rooms (first-class) | ✅ | ✅ (1 DO/room) | ➖ (namespace only) | ✅ | — | — | — | — | ➖ (interest predicate, no room object) |
| Presence tracking | ➖ | ➖ | ❌ | ✅ (user+session+node) | — | — | — | — | ➖ (client set in broadcast-hub, no identity model) |
| Reconnection + resume | ✅ (0.17 automated) | ➖ (dev's problem) | ➖ (transport-only) | ➖ (manual re-join) | — | — | — | — | ❌ (not built yet) |
| State sync model | Schema + binary delta patch | in-memory, dev-managed | none (raw pub/sub) | tick-buffered, server-authoritative | — | — | — | — | ✅ tick-driven snapshot/delta, interest-filtered |
| Deterministic simulation clock | ❌ (patchRate, not sim tick) | ❌ | ❌ | ➖ (configurable tick, not proven deterministic) | ❌ (render-only rAF) | ❌ | ❌ | ❌ (render-only, on-demand mode) | ✅ single-writer fixed tick — **the differentiator** |
| Client SDK breadth | ✅✅ (JS/Unity/Defold/Haxe/Construct) | ➖ (JS/Workers only) | ✅✅ (near-universal) | ✅✅ (Unity/Unreal/Godot/JS/C++) | — | — | — | — | ➖ (protocol.mjs is browser-safe, no packaged client SDK) |
| Scale story (evidenced) | 10–10,000+ CCU | edge, ~50ms/95% pop | 100K–200K+ sockets | 250K+ CCU, 2M load-tested | — | — | — | — | ❌ (no load test run yet; single-consumer today) |
| Hosting | self-host or Cloud ($15/mo+) | self-host or Cloudflare (usage-based) | self-host only | self-host or Heroic Cloud (DAU-priced) | n/a (client lib) | n/a | n/a | n/a | self-host only, zero managed offering |
| Scene graph / display list | — | — | — | — | ✅ | ✅ | ✅ (manual) | ✅ (observable graph) | ❌ (none — renderer not yet built) |
| Camera abstraction | — | — | — | — | ✅ (multi-camera) | ➖ (stage-transform only) | ✅ | ✅ | ❌ (none yet — but interest-filter is the spatial-culling seed) |
| Render loop | — | — | — | — | ✅ rAF | ✅ Ticker/rAF | ✅ manual rAF | ✅ engine.runRenderLoop | ❌ (tick ≠ render loop yet; the point is to make them one) |
| Live view = replay view (same code path) | ❌ | ❌ | ❌ | ❌ | — | — | — | — | ✅ **by construction** — `step()`/deterministic resettle make spectating a replay of the same tick log |
| Replay-verifiable rooms (anti-cheat as platform primitive) | ❌ (bolt-on validation only) | ❌ | ❌ | ➖ (server-authoritative, not replay-native) | — | — | — | — | ✅ **unclaimed by anyone** |
| Zero runtime dependencies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## What QwzSpace has that none do

1. **Deterministic tick-driver as the single clock.** Every render engine surveyed drives its own `requestAnimationFrame` loop, independent of whatever clock the paired netcode library uses (Colyseus's `patchRate`, Nakama's per-match tick, PartyKit's event-driven Durable Object wakeups). QwzSpace's tick-driver is a single-writer transaction boundary that both the simulation *and* — once the renderer lands — the presentation layer can be driven from. No competitor in either class makes this claim about itself.
2. **Intent-logs as the native wire format.** Colyseus ships diffs (binary schema patches); socket.io ships arbitrary messages; Nakama ships buffered inputs internally but doesn't expose the log as a first-class artifact. QwzSpace's `intent-queue` + `protocol.mjs` make the intent log *the* wire contract — the same structure that, replayed deterministically through `runTick`, reconstructs any historical state.
3. **Replay-verifiable rooms as a platform primitive, not a feature.** The 2026 anti-cheat industry consensus (per Roblox's own July 2026 engineering post) is "server-authoritative backend that validates every action" — a bolt-on discipline every studio has to re-implement. QwzSpace's single-writer deterministic tick makes any room's history independently re-derivable from its intent log by construction — the same property the house's own anti-cheat pattern already relies on, now generalized to a platform feature rather than a per-game discipline.
4. **Live view and replay-spectacle as one code path.** Because presentation would be driven from the same deterministic tick that drives simulation, a "live room" and a "replay of that room's history" are the same projection run against a live vs. stored intent log — spectating becomes free once the clock is fixed. No render-engine-plus-netcode pairing in this survey achieves this; each requires separate live-view and replay/analytics code paths (e.g. Nakama's replay/analytics pipelines are explicitly separate systems from live match state).
5. **Interest-filtering doubles as spatial culling.** The `interest(id, subscriberId)` predicate already shipping in `snapshot-manager.mjs` was built for bandwidth (don't send what a subscriber can't see) but is structurally the same operation as camera-frustum or viewport culling in Phaser/PixiJS/three/Babylon. The renderer's culling story is already half-written.
6. **Zero runtime dependencies**, matching the house market thesis and holding under `npm test` (82/82) — none of the eight competitors surveyed can say this; all ship dependency trees.

## Gaps, ranked by fleet need

1. **A renderer at all (highest — blocks every downstream customer).** Today QwzSpace has no scene graph, no camera, no render loop — the owner's mandate is explicit that this must change. Recommended shape per the owner's own note: compose existing house render fibers (the abrash raycaster for 3D, canvas/SVG layers for 2D) rather than reinventing a scene graph — QwzSpace supplies the temporal spine (tick → interpolated presentation) that they hang from, not a fifth competing renderer.
2. **Reconnection/resume (high — Nakama-level, ideally Colyseus-0.17-level).** Every fleet customer below needs players to survive a dropped WiFi connection without losing their seat. Currently absent entirely; Colyseus's `reconnectionToken` + `onDrop`/`allowReconnection`/`onReconnect` lifecycle is the pattern to match, informed by their own documented "seat reservation expired" failure mode to avoid repeating.
3. **Presence/identity model (high — Okaga specifically needs this).** Okaga's design doc is explicitly Discworld-MUD-style presence/rooms/talk; QwzSpace's `broadcast-hub` currently tracks live clients but not identity, session, or "who else is in this room" in a queryable way. Nakama's (user, session, node) triple is the closest evidenced pattern.
4. **A packaged client SDK (medium — every fleet customer needs this, none has it yet).** `protocol.mjs` is browser-safe today but there is no ergonomic client library wrapping connect/reconnect/subscribe the way every competitor in class A ships one. Currently every consumer (aletheon included) hand-rolls its own client against the raw protocol.
5. **Load-tested scale story (medium — durante arena is the CCU-sensitive customer).** Zero load testing has been run against qwzspace itself; the class-A competitors all cite concrete CCU numbers (Colyseus 10K+, Nakama 250K+/2M). Needed before any "scale story" claim can be made honestly.
6. **Rooms as a queryable first-class concept (medium — shared-board future needs this explicitly).** Today "room" is entirely emergent from the `interest()` predicate the game supplies; a shared-board product needs to list/create/join rooms as objects, not just filter subscriptions — closer to Colyseus's `Room` class or PartyKit's Party-per-Durable-Object model.
7. **Managed hosting story (low — not blocking any named fleet customer yet, but every class-A competitor has one).** Self-host-only today; Colyseus Cloud, Heroic Cloud, and Cloudflare's PartyKit hosting all give a path from zero to production infra. Not urgent while the fleet is self-hosted 561 infrastructure, but worth flagging as the last box every competitor checks that QwzSpace doesn't.

Fleet customers this ranking is built against: **tidepool MUD** (no design doc yet — needs rooms/presence/reconnection from day one once it exists), **Okaga** (presence/rooms/talk named explicitly in its own design doc), **durante arena** (CCU/scale-sensitive, competitive/anti-cheat-sensitive — the direct beneficiary of replay-verifiable rooms), **shared-board future** (needs first-class room objects, not just an interest predicate).

## Beat thesis

No product on the market — not Colyseus, PartyKit, socket.io, or Nakama on the netcode side, and not Phaser, PixiJS, three.js, or Babylon.js on the render side — unifies room/state-sync and scene/render-loop under one clock; every stack in this survey pairs one product from each class and asks the developer to reconcile two independently-ticking clocks by hand, a seam so entrenched that Babylon.js's and Phaser's own official documentation teaches developers how to paper over it with render-loop interpolation against a separately-clocked netcode library. QwzSpace's thesis is structural rather than feature-competitive: fix one deterministic tick as the single writer of both simulation and (once the renderer lands, composing existing house render fibers rather than reinventing one) presentation, and two things fall out for free that no competitor can claim — replay-verifiable rooms as a platform primitive rather than a bolt-on anti-cheat discipline, and live view/replay-spectacle collapsing into one projection path because a live room and a stored intent log are the same input to the same deterministic function. To win, QwzSpace does not need to out-feature Colyseus on client-SDK breadth or out-render Babylon on lighting — it needs to close the four gaps that currently block real fleet customers (a shippable renderer, reconnection/resume, a presence model, a packaged client SDK) while keeping the one property none of the eight competitors surveyed have simultaneously: zero dependencies and one clock owning both time and space.
