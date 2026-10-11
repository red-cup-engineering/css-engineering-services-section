# QwzSpace Competitive Position — rescored to 0.6.3

Companion to `content/text/documents/articles/notes/2026-08-19-note-on-qwzspace-market-teardown.md`
(the original parity table + beat thesis) and `...-note-on-qwzspace-vnext-spec.md` (the design this
package now implements). The prior rescore in this file covered Wave1 (`package.json` version
`0.4.0`, six items: lobby/discovery, an auth hook, observability, a persistence adapter, a multi-room
load harness, an optimistic-echo overlay). Three more passes have shipped since, unscored until now:

- **the spectacle/rendering vocabulary** — `drawables.mjs`/`tween.mjs`/`particles.mjs`/`camera.mjs`/
  `celebration.mjs`/`render-loop.mjs` (commit `842c1e6c26a`, 2026-08-29)
- **TUFTE document projection** — `tufte.mjs`, a second, non-canvas presentation boundary over
  tick-numbered room projections (commit `e7655558e6d`, 2026-09-01)
- **the intent-log/cartridge unification** — `intent-log.mjs` now hashes through
  `@red-cup-engineering/gaming/running`'s canonical-hash law instead of a second hand-rolled JSON/sha256
  pairing, and the append-only log itself comes from `@red-cup-engineering/event-stream-data-service`
  (commits `dd871e0e523` and `ef5a196ba2f`, 2026-09-01)

This document rebenches the package's own runnable proofs at `0.6.3`, folds all three passes into the
parity table, and corrects one number the last pass got wrong going forward: **QwzSpace itself is no
longer a zero-dependency package** — see "Install footprint," below.

Scope note on "before": the teardown's original parity table was written against `0.0.2`, before
rooms/replay/resume/client-SDK/renderer existed at all. "QwzSpace (teardown, 0.0.2)" in the matrix
below means that baseline; "QwzSpace (now, 0.6.3)" means the tree as it stands after all four passes
(Wave1 plus the three named above).

## Numbers — fresh this pass (0.6.3)

### `npm test`

```
node --test --test-concurrency=1 --test-timeout=20000 tests/prove-*.mjs
```

Fresh, this session, on a host independently observed at `load average: 52.14, 60.59, 50.64` (16
cores, heavily shared with dozens of other sessions' processes — `git commit`, other packages'
`npm test` runs, a duplication scan, several `bfs` tree walks, all visibly running concurrently):

```
ℹ tests 44
ℹ suites 0
ℹ pass 43
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 42780.217182

✖ failing tests:
test at tests/prove-hostile-client.mjs:13:1
✖ prove-hostile-client (1104.395129ms)
  Error: a forged/garbage resume token is rejected, not accepted
```

**Verified as environmental, not a regression, the same session**: `prove-hostile-client.mjs`'s
failing assertion sends a forged resume token, `await wait(40)`, then checks for a `resume-failed`
reply — a real-time window tight enough that this severely contended host (42.8s for a suite that
normally runs in a few seconds, per the earlier passes' own numbers) can miss it even though the
server-side rejection logic is correct. Rerunning `node --test tests/prove-hostile-client.mjs` in
isolation, on the same still-heavily-loaded host (`load average: 52.14, 60.59, 50.64`), passed clean:
`tests: 1, pass: 1, fail: 0` (`prove-hostile-client: 12 assertion(s) passed`). Two earlier attempts at
the full suite this session hit two *different* timing-sensitive assertions under even worse
contention (one, killed before completion, failed `prove-client-node-room`'s `wait(80)`-gated
interpolation-target check under a load average of 66-69 that had starved the whole `npm test`
process to ~1s of accumulated CPU time over 13 real minutes) — different files failing on different
runs, both isolated `wait(N)` real-time races, both resolving clean standalone, is the signature of
host-contention flakiness, not a deterministic defect. The count reported above (43/44, one flake) is
the actual fresh full-suite result; it is reported rather than laundered into a clean rerun.

### `examples/head-to-head/run-session.mjs` (real 20-bot WebSocket session)

This is the package's own bundled proof harness — 20 real `client-node.mjs` bots over real
WebSockets, forced disconnects, wire-efficiency measurement, and the live-vs-replay render proof —
**not** the external 50-bot Colyseus-comparison harness the 0.4.0 pass used (that lived outside this
package, in a prior session's scratchpad, and is out of scope for "the package's own benches"). Fresh
run, this session:

| Metric | Value |
|---|---|
| Session | 20 bots, 100ms tick, 7s session + 2.5s settle |
| Final tick / member count | 98 / 20 |
| Wire messages (actual vs. naive full-broadcast) | 1,201 vs. 1,811 — 33.7% fewer messages |
| Wire bytes (actual vs. naive full-broadcast) | 977,356 B vs. 4,510,053 B — 78.3% fewer bytes |
| Tick interval (target 100ms) | mean 102.36ms, stddev 12.79ms, min 43ms, max 160ms |
| Resume identity preserved | 20/20 bots, every forced disconnect wave |
| `room.verify()` (full replay-verification) | `ok: true` |
| Live-vs-replay render frames compared | 608, all 608 byte-identical (`allFramesIdentical: true`) |

The wire-efficiency figures here (interest-filtered delta broadcast vs. naive full-broadcast, same
session) are a different measurement from the 0.4.0 doc's Colyseus-comparison bytes/sec table — they
prove the same mechanism (delta broadcast beats full-broadcast) but are not directly comparable
numbers. No Colyseus/socket.io head-to-head was rerun this pass; the ~7x wire-format gap that bench
found stays as previously measured and unaddressed (Wave2 ledger item 1, below) rather than
re-derived here.

### `examples/multi-room-load/run-session.mjs` (default room counts: 1, 5, 10, 20)

| Room count | Bots total | Mean-of-means tick interval | Worst per-room mean | Note |
|---|---|---|---|---|
| 1 | 5 | 101.28ms | 101.28ms | baseline |
| 5 | 25 | 106.14ms | 107.21ms | near baseline |
| 10 | 50 | 213.53ms | 216.37ms | ~2.1x spike |
| 20 | 100 | 143.12ms | 146.48ms | partial recovery — still ~1.46x, just under the script's 1.5x degrade threshold |

The script's own `honestCeiling` field named **10 rooms** this run (worst per-room mean exceeded
1.5x the configured 100ms). Unlike the 0.4.0 pass's own multi-room run — which tested 1/10/25/50
rooms and saw a clean recovery to baseline at 25 and 50, supporting a host-noise reading of the
10-room spike — this run only tested the script's default counts (1/5/10/20) and did **not** see a
full recovery by 20 rooms: 146.48ms is close to but still under the 150ms (1.5x) threshold, not back
at the ~101ms baseline the earlier run's 25/50-room points reached. This host was independently
observed at `load average: 66.31, 68.95, 43.88` (many other sessions' processes, not this package)
during this pass's `npm test` run, so host contention remains the more likely explanation than a
genuine per-room-count degradation — but this run's own evidence is weaker on that point than the
0.4.0 pass's was, and is reported as such rather than reasserting the earlier run's cleaner story.

### Install footprint — corrected

The 0.4.0 pass's numbers table claimed QwzSpace was "still `dependencies: {}`" at that version. That
claim is now **false** and is replaced, not annotated: `package.json` at `0.6.3` lists three runtime
dependencies —

```json
"dependencies": {
  "@red-cup-engineering/gaming/running": "0.3.0",
  "@red-cup-engineering/event-stream-data-service": "0.1.0",
  "@red-cup-engineering/web-page-tiling-engine": "0.6.0"
}
```

Fresh install from the registry: `node_modules/` is 624KB across 4 packages (QwzSpace's own tree plus
these three). All three are themselves zero-dependency (`dependencies: {}` each, confirmed by reading
their installed `package.json`s this session) and are house primitives on the same private registry —
per the org's own "primitives exist once, on the registry, interdependent — never copied" law, this is
the correct shape (canonical hashing lives once in `cartridge`, not reimplemented a second time here),
not a regression of the doctrine. But the honest claim going forward is **zero *external*/third-party
runtime dependencies**, not zero dependencies outright — the install closure is still 624KB total,
dwarfed by Colyseus (164MB) and socket.io (8.7MB), and pulls nothing from the public npm registry, but
"1 package" is no longer accurate and the Matrix row below is corrected to match.

## What each pass actually added

- **Spectacle vocabulary (2026-08-29)**: `project.mjs`'s scene contract grows optional
  `layer`/`scale`/`rotation`/`opacity`/`tint`/`sprite`/`text` fields (additive — a v1-shaped scene
  still renders identically, `tests/prove-render-2d-regression.mjs`). Five new pure modules —
  `drawables.mjs` (procedural vector sprite registry, no raster assets), `tween.mjs` (presentation
  easing, never touches `x`/`y`/`z`/`yaw`), `particles.mjs` (deterministic, seeded particle effects —
  `sampleEffect(effect, tick)` is a closed-form function of tick, byte-identical live or replayed),
  `camera.mjs` (pan/zoom/rotate + deterministic seeded screen-shake), `celebration.mjs` (composable,
  seeded big-moment choreography) — plus `render-loop.mjs`, the one-call glue tying buffer → tween →
  backend together per frame. See README "The spectacle layer" for the worked slot-reel example;
  every piece is generic engine vocabulary, not a casino feature.
- **TUFTE document projection (2026-09-01)**: `tufte.mjs`'s `createTufteRoomModel`/
  `renderTufteRoomDocument`/`normalizeTufteRoomProjection` is a **second, non-canvas presentation
  boundary** for tick-numbered room projections — it turns a room's entries into a server-rendered
  TUFTE document (tiles), through `@red-cup-engineering/web-page-tiling-engine`'s own
  `normalizeTufteModel`/`renderTufteDocument`. QwzSpace owns ordering/entity delivery; the consuming
  game owns the domain-to-tile projection (`tileForEntry`), the same injected-seam discipline every
  other QwzSpace boundary already uses. **Honest scope note, found this pass**: this is wired as an
  importable subpath (`qwzspace/tufte`) and tested (`tests/prove-tufte.mjs`), but it is **not** wired
  into `admin.mjs` — the ops/observability HTML view is still its own hand-rolled `<table>` markup
  (`src/admin.mjs`'s `renderHtml`), unrelated to `tufte.mjs`. Built-but-unwired between two modules in
  the same package is exactly the pattern house working discipline names as a debt, not a silent
  parity claim — carried into the Wave2 ledger below.
- **Cartridge/event-stream-data-service unification (2026-09-01)**: `intent-log.mjs`'s
  `canonicalJSON`/`roomHash` now route through `@red-cup-engineering/gaming/running`'s own
  `canonicalStringify`/`hashState` (`red-cup.cartridge.canonical-hash/1`) instead of a second
  hand-rolled JSON/sha256 pairing, and `createIntentLog`'s append-only store comes from
  `@red-cup-engineering/event-stream-data-service`'s `createAppendOnlyLog` rather than a bespoke
  array wrapper. This does not add a new competitive capability — the replay-verifiable-room contract
  (purity/provenance/self-audit) is unchanged in what it guarantees — but it removes a duplicated
  hashing/canonicalization implementation in favor of the house's one audited copy, which is the
  correct direction per the org's primitives-exist-once law. It is also the direct cause of the
  install-footprint correction above.

## Matrix — rescored to 0.6.3

Legend unchanged from the teardown: ✅ has it · ➖ partial/weak · ❌ absent · — n/a. Competitor
columns are carried forward unchanged (no competitor re-teardown was in scope this pass); only the
QwzSpace column and newly-added rows are rescored.

| Dimension | Colyseus | PartyKit | socket.io | Nakama | Phaser/PixiJS/three/Babylon | **QwzSpace (teardown, 0.0.2)** | **QwzSpace (now, 0.6.3)** |
|---|---|---|---|---|---|---|---|
| Rooms (first-class) | ✅ | ✅ | ➖ | ✅ | — | ➖ (interest predicate only) | ✅ *(`room.mjs`+`room-registry.mjs`; `lobby.mjs` adds named/capacity discovery)* |
| Presence tracking | ➖ | ➖ | ❌ | ✅ | — | ➖ (client set, no identity) | ➖→✅-leaning *(a real auth hook — `authenticate(raw,conn)→accountId`, reconnect reclaims the same slot — mechanism only, no identity **provider** shipped)* |
| Reconnection + resume | ✅ (0.17) | ➖ | ➖ | ➖ | — | ❌ | ✅ *(`resume.mjs`, ring-buffer replay; reconfirmed this pass — 20/20 identity preserved across three forced-disconnect waves, `examples/head-to-head`)* |
| State sync model | Schema+binary delta | in-memory | none | tick-buffered | — | ✅ (already the differentiator) | ✅ unchanged |
| Deterministic simulation clock | ❌ | ❌ | ❌ | ➖ | ❌ (render-only) | ✅ — the differentiator | ✅ unchanged, and now extends to presentation FX (see below) |
| Client SDK breadth | ✅✅ (5 engines) | ➖ (JS only) | ✅✅ | ✅✅ (5 engines) | — | ➖ (no packaged SDK) | ➖ *(real packaged SDK — `client.mjs`/`client-browser.mjs`/`client-node.mjs` — but JS/Node only, by stated, deliberate non-goal)* |
| Scale story (evidenced) | 10–10K+ CCU | edge, ~50ms/95% | 100K–200K+ | 250K+, 2M tested | — | ❌ (no load test) | ➖ *(`examples/multi-room-load`; this pass's own run: baseline through 5 rooms/25 bots, a 2.1x spike at 10 rooms/50 bots, partial-not-full recovery to 1.46x at 20 rooms/100 bots — weaker recovery evidence than the 0.4.0 pass's 25/50-room run, see Numbers above; still single-host, single-process)* |
| Hosting | self/$15mo Cloud | self/Cloudflare | self only | self/DAU-priced Cloud | n/a | self-host only | self-host only, unchanged *(v-next §10 names the Cloud Run mismatch honestly — a refusal, see below)* |
| Scene graph / display list | — | — | — | — | ✅ all four | ❌ | ✅ *(`project.mjs`+`render-2d.mjs`+`spatial-backend.mjs`)* |
| Camera abstraction | — | — | — | — | ✅/➖ mixed | ❌ | ✅ *(`camera.mjs`'s `resolveCamera()` — pan/zoom/rotate + deterministic seeded screen-shake, a pure function of tick; render-2d's own `setCamera` and the in-package 2D backend are fixed top-down by design, a camera-bearing 3D backend is the abrash example's own work, external to this package)* |
| Render loop | — | — | — | — | ✅ all four | ❌ (tick ≠ render loop) | ✅ *(`InterpolationBuffer` samples the same tick-numbered buffer the sim writes; `render-loop.mjs` is now the one-call `composeFrame`/`createRenderLoop` glue tying buffer→tween→backend together, closing the "every consumer hand-writes this" gap)* |
| Live view = replay view | ❌ | ❌ | ❌ | ❌ | — | ✅ by construction (claim) | ✅ *(`prove-unification.mjs`; reconfirmed this pass over a real 20-bot session — 608/608 sampled frames byte-identical live vs. replayed, `examples/head-to-head`)* |
| Replay-verifiable rooms | ❌ | ❌ | ➖ | ➖ | — | ✅ unclaimed-by-anyone (claim) | ✅ *(purity+provenance+self-audit unchanged; hashing now routes through `cartridge`'s audited canonical-hash law instead of a second hand-rolled implementation — same guarantee, one fewer duplicated primitive; reconfirmed this pass, `room.verify()` → `ok: true` over the head-to-head session)* |
| Zero runtime dependencies | ❌ | ❌ | ❌ | ❌ | ❌ (all four) | ✅ | ➖ *(corrected this pass — no longer literally true: `package.json` now lists 3 dependencies, `cartridge`/`event-stream-data-service`/`tufte`, added by the TUFTE and cartridge-unification passes. All three are themselves zero-dependency house primitives on the same registry, so the honest claim is **zero external/third-party dependencies**, not zero dependencies outright — install closure is 4 packages / 624KB, still dwarfed by Colyseus (164MB)/socket.io (8.7MB), but "1 package" from the 0.4.0 doc is false and is not repeated here)* |
| **Matchmaking/discovery (named+capacity, listable)** | ✅ (`Room` filters) | ➖ (manual) | ❌ | ✅ (matchmaker) | — | ❌ (row didn't exist) | ✅ *(`lobby.mjs`; capacity-refusal guarantee verified live via sabotage, see below)* |
| **Ops/observability surface** | ✅ (Colyseus Cloud dashboard) | ➖ (Cloudflare dash, generic) | ❌ | ✅ (Heroic console) | — | ❌ (row didn't exist) | ➖ *(`admin.mjs`: bare JSON/HTML, unchanged this pass — the new TUFTE document boundary is real but NOT wired into this surface, see "What each pass actually added," above; still functionally present, cosmetically behind the managed-hosting competitors)* |
| **Crash-safe persistence** | ➖ (app's own DB) | ❌ (explicitly the dev's problem) | ❌ | ➖ (app's own DB) | — | ❌ (row didn't exist) | ➖ *(`persistence.mjs`: file-store reference + `restoreRoom()` replay-forward, unchanged this pass — still zero-dep JSONL, not a real DB substrate)* |
| **Client-side prediction pattern** | ➖ (roll-your-own) | ➖ | ➖ | ➖ | ✅ (engine-native tweening, not netcode-aware) | ❌ (row didn't exist) | ✅ *(`createOptimisticOverlay`, unchanged this pass — see Refusals, below)* |
| **Presentation-effects vocabulary (sprites/tween/particles/camera/celebration)** | — | — | — | — | ✅/➖/➖/✅ mixed *(Phaser: built-in tween/particles/camera; PixiJS: no first-class camera, no built-in particle/tween system; three.js: "no built-in tween/lerp helper — developers hand-roll movement," per the original teardown; Babylon: rich but not seed-deterministic)* | ❌ (row didn't exist) | ✅ **new row** — `drawables.mjs`/`tween.mjs`/`particles.mjs`/`camera.mjs`/`celebration.mjs`, all deterministic/seeded (`sampleEffect(effect, tick)` etc. are pure functions of tick, byte-identical live or replayed) — a property none of the four render engines claim for their own effects systems, since none of them are built on a replay-verifiable tick |
| **Server-first document/HTML room projection (non-canvas)** | — | — | — | — | ❌ (canvas/WebGL-only; no server-first HTML document mode in any of the four) | ❌ (row didn't exist) | ✅ **new row** — `tufte.mjs`, over `@red-cup-engineering/web-page-tiling-engine`; QwzSpace owns ordering/delivery, the game owns `tileForEntry`. **Not wired into `admin.mjs`** — see scope note above and Wave2 ledger |
| **Physics primitive (rigid-body/collision/constraint solving)** | — (not a netcode-class capability) | — | — | — | ✅ (Phaser: built-in Arcade + Matter.js integration) / ❌ (PixiJS: pure rendering library, none) / ➖ (three.js: no built-in physics, large plugin ecosystem — Cannon-es, Ammo.js, Rapier bindings) / ✅ (Babylon.js: first-party Havok/Cannon/Ammo/Oimo plugin integration) | ❌ (row didn't exist) | ❌ **new row** — no physics primitive exists in this package. **Refused as in-package scope**, not silently absent — see Refusals #5, below |
| **Raster/WebGL rendering pipeline (GPU-accelerated throughput)** | — | — | — | — | ✅ (Phaser: WebGL renderer) / ✅✅ (PixiJS: dual WebGL/WebGPU, "the raw 2D-throughput leader") / ✅ (three.js: WebGL/WebGPU) / ✅ (Babylon.js: WebGL/WebGPU) | ❌ (row didn't exist) | ❌ **new row** — `render-2d.mjs` uses `getContext("2d")` (CPU-composited Canvas2D); the one 3D backend (`abrash`, in `examples/spectate`) is a CPU software raycaster. Neither is GPU/WebGL. The house's zero-raster-**assets** doctrine (no `.png`s) was previously asserted as covering this; it does not — a vector-only *asset* posture and a CPU-only *rendering pipeline* are two separate claims, and only the first has been tested. **Deferred, not refused** — see Refusals #6, below |

## Refusals-with-alternatives

The mandate's rule: where a competitor capability contradicts QwzSpace's philosophy (one clock owns
transport+render; deterministic single-writer rooms; intent-log-native wire), the answer is a
documented pattern or a principled refusal naming the alternative — never a silent gap.

1. **Client-authoritative state sync** — **refused**. Unchanged this pass. **Alternative shipped**:
   `createOptimisticOverlay`.
2. **Horizontal room-sharding / multi-instance autoscaling** — **refused for live rooms**. Unchanged
   this pass. **Alternative named**: vertical scaling (more independently-ticked rooms per box) plus
   the stateless `http-sse-server` transport for read-only spectate/replay traffic.
3. **Binary/schema-diff wire encoding** (Colyseus's actual, quantified 7x bandwidth/CPU edge) — not a
   philosophy conflict, a **deferral with a number attached**. Unchanged this pass — no re-bench was
   run against Colyseus this session (see Numbers, above), so the number stands as previously
   measured and unaddressed. Still #1 in the Wave2 ledger.
4. **Non-JS client SDKs** — **refused as a non-goal, not a gap**. Unchanged this pass.
5. **Physics primitive (rigid-body/collision/constraint solving)** — **refused as in-package scope**.
   A real physics engine — even a deterministic one, which is achievable — is either a large external
   dependency (Rapier/Matter/Ammo/Cannon, all real npm packages with real weight) or a large
   from-scratch primitive; either way it is not "domain state, folding, and persistence... supplied
   through explicit interfaces" the way this package's own intro states its scope, and building one
   *inside* `qwzspace` would repeat the exact shape this package's own README already refused once
   for rendering — `@red-cup-engineering/abrash`'s 3D backend is a real, working capability that
   deliberately lives **outside** this package, as a real npm dependency in the consuming example, so
   that adding it never taxes every consumer who only wants `render-2d`. **Alternative named**: the
   same pattern — a physics primitive, if built, seats at its own house section (per the org's
   "primitives exist once, on the registry, interdependent" law; math/simulation primitives compose
   through the house's own math-composition lineage, not a game-engine package) and a game wires it
   through the same injected `runTick`/domain-state seam every other piece of domain logic already
   uses — the reel-spin worked example in the README already demonstrates the pattern (a game's own
   per-tick position updates through the room, qwzspace never simulates the motion itself). No such
   primitive exists in that lineage yet — this is an honest ❌, not a hidden ✅, and building or
   adopting one is that other section's roadmap item, not this package's.
6. **Raster/WebGL rendering pipeline** (PixiJS's "thousands of sprites at 60fps," Phaser/three/
   Babylon's WebGL renderers) — this is **not** a philosophy conflict either: nothing in `render-2d`'s
   `getContext("2d")` choice or `spatial-backend.mjs`'s contract requires CPU compositing —
   `spatial-backend.mjs`'s own header already names "a future WebGL backend" as a hypothetical
   external adapter the checkable contract would validate without this package depending on it, the
   same way it already validates the real abrash CPU raycaster. So this is a **deferral**, matching
   item 3's shape: no fleet customer has hit a throughput wall at qwzspace's current entity counts
   (tens of sprites, not the thousands PixiJS benchmarks), and the fix — a WebGL backend adapter,
   external to this package like abrash — doesn't require relitigating any stated principle. Tracked
   in the Wave2 ledger below as unmeasured, not asserted-and-unbuilt-as-if-equivalent.

## Sabotage — lobby capacity guarantee, broken and restored (performed during the Wave1 pass, at 0.4.0)

Target: `src/lobby.mjs`'s `entry()` — `joinable: memberCount < m.capacity`. Changed `<` to `<=` (the
classic off-by-one: a room at exactly its capacity now reports itself as still joinable). The failure
was caught cleanly and immediately, and also hung the test process — `tests/prove-lobby.mjs`'s
`ws.close()` sits before its own `finally` block, so a failed assertion earlier in that `try` skips
the close and the `finally`'s `tavernServer.close()` then blocks forever on the still-open socket.
Restored `<`, reran the suite: clean pass, no hang. `src/lobby.mjs`'s `entry()` is unchanged since
(`memberCount < m.capacity`, confirmed this pass), and `tests/prove-lobby.mjs`'s `ws.close()` is
**still** positioned before its own `finally` block — the hang risk this sabotage exposed was never
fixed, it stays Wave2 ledger item 2.

## Wave2 ledger

Ranked by what actually blocks a real fleet customer, same discipline the original teardown used —
not by what's technically interesting to build next. Nothing on this list closed this pass; one item
(4, ops surface) gained new relevant evidence (TUFTE exists but isn't wired here) without closing.

1. **Wire-format cost (highest — quantified in a prior pass, not re-verified this pass).** ~7x more
   bytes/sec and the highest mean CPU of the three benched systems, both traced to the same root
   cause (flat `JSON.stringify` per broadcast). `protocol.mjs` already isolates the encoding boundary
   for this swap. No fleet customer has hit a wall yet.
2. **Lobby-test cleanup hazard.** `tests/prove-lobby.mjs`'s websocket `try/finally` still doesn't
   close its own socket on an assertion thrown before the planned `ws.close()` — confirmed unfixed
   this pass (see Sabotage, above). Small, mechanical fix (close the socket in `finally`).
3. **Persistence is file-store-only.** `persistence.mjs` ships a real, working zero-dep JSONL store —
   unchanged this pass — but v-next §10 names the house's own EAVT/posix-holography substrate as the
   intended long-term checkpoint target, not yet wired.
4. **Ops surface still isn't a product, and now has an unwired half-answer sitting next to it.**
   `admin.mjs` is real (members/checkpoints/queue depth/wire counts/tick jitter, JSON+HTML) but has no
   auth, no history, no charts. **New this pass**: `tufte.mjs` ships a real document-projection
   boundary in the same package that could close much of this gap (structured, styled document
   rendering instead of a hand-rolled `<table>`) and is not wired to `admin.mjs` at all — a
   built-but-unwired pair, not a silent capability gap, but also not yet a closed one.
5. **Identity is a hook, not a provider.** Wave1's `authenticate()` seam is real and reconnect-tested,
   unchanged this pass — a fleet customer still brings their own identity backend. Reason the Matrix's
   "Presence tracking" row stays ➖→✅-leaning rather than a clean ✅.
6. **Raster/WebGL rendering pipeline is unbuilt, now named rather than silently asserted-away.**
   `render-2d` is CPU Canvas2D, `abrash` is a CPU software raycaster — no GPU pipeline exists. Not
   blocking any named fleet customer at current entity counts; see Refusal #6.
7. **Physics primitive doesn't exist and is out of this package's own scope.** See Refusal #5 — the
   roadmap item, if ever prioritized, belongs to a future house math/simulation section, not this
   package.
8. **Multi-room ceiling is single-host evidence, not a CCU number — and this pass's own run is
   noisier than the last one.** The 0.4.0 pass's 1/10/25/50-room run recovered cleanly at 25 and 50;
   this pass's default 1/5/10/20-room run only partially recovered by 20 rooms (see Numbers, above).
   Both readings point at host contention rather than a real per-room-count ceiling, but the evidence
   for that reading is weaker this time — worth a dedicated, uncontended-host rerun before treating
   either result as settled.
9. **Managed hosting (lowest, unchanged).** Still self-host-only. Still not blocking any named fleet
   customer. The Cloud Run mismatch is documented (v-next §10) rather than a silent gap — see
   Refusal #2.

## The one-line honest answer

**Can a multiplayer game author live entirely on QwzSpace today:** yes, for the fleet's actual current
shape — a self-hosted, browser/Node, 2D-or-text realtime game on one VPS — with rooms, presence,
reconnect-with-resume, replay-verified anti-cheat, a real client SDK, a 2D renderer, a deterministic
presentation-effects vocabulary (sprites/tween/particles/camera/celebration), a server-first document
projection boundary, matchmaking, crash-recoverable persistence, an admin view, and a principled
client-prediction pattern all shipping, tested, and composed from house-only zero-external-dependency
primitives (no longer a literal zero-*any*-dependency claim, see "Install footprint," above); **not
yet** for a title that needs CCU beyond one host, a non-JS client, a managed-hosting/ops product,
bandwidth parity with a binary-diff engine at high player counts, GPU-accelerated rendering at
thousands-of-sprites throughput, or any in-engine physics — and every one of those "not yet"s is now a
named, ranked line in the Wave2 ledger above rather than an unstated gap.

## 0.9.0 addendum (2026-09-16): three ledger items moved

- **Wave2 item 1, wire-format cost — a measured seam, not a closed row.** `protocol.mjs` gained
  entry packing (`packEntries`/`unpackEntries`, `encode(msg, { pack })`, `decode` always unpacking):
  a frame's entries grouped by exact key signature with keys sent once, lossless, schema-free,
  opt-in per room (`createRoom({ pack: true })`). Fresh numbers this pass: a 20-entity demo-world
  snapshot 1,521 B flat → 774 B packed (49.1% fewer, `tests/prove-protocol.mjs`); the package's own
  20-bot head-to-head session (`QWZSPACE_PACK=1`) 82.4% below the naive full-broadcast baseline
  packed vs 77.8% flat — about 21% fewer bytes over the same session — with 602/602 frames
  byte-identical live vs replayed and 20/20 identities preserved in both runs
  (`tests/prove-wire-packing.mjs` proves the packed frames reach a raw socket and decode to the same
  world view). The ~7x gap to Colyseus's binary schema diff is not closed by this; it is narrowed and
  now has the seam a binary packing would drop into. Row stays ➖.
- **Wave2 item 2, lobby-test cleanup hazard — closed.** `tests/prove-lobby.mjs` closes its socket
  in `finally`; a failed assertion can no longer hang `tavernServer.close()`.
- **Wave2 item 4, ops surface — the unwired half is wired.** `admin.mjs`'s `?html` view is a TUFTE
  document (`adminTufteModel`: rooms table plus per-room members, checkpoints, and self-audit
  tables) rendered by `@red-cup-engineering/web-page-tiling-engine@0.11.0`; the hand-rolled
  `<table>` and the duplicate `escapeHtml` are gone. Still no auth, no history, no charts; row stays
  ➖, but "built-but-unwired" is no longer true.
- **Install footprint, corrected again.** The TUFTE pin moved 0.6.0 → 0.11.0 so the admin view could
  use TUFTE's typed table tiles. TUFTE's application layer brings the shared web server and
  request-body services and, through them, six public npm packages into the install closure (41
  house packages + 6 public, ~17 MB `node_modules`). QwzSpace's own modules import only TUFTE's root
  renderer, which loads none of them, so the runtime import graph is still house-only; the "zero
  external/third-party dependencies" claim above now holds for the runtime graph, not the install
  closure. Row "Zero runtime dependencies" stays ➖ with this narrower wording.
