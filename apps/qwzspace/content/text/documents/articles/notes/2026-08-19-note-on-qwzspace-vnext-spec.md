---
title: QwzSpace v-next Spec — Rooms, Replay, Renderer
description: "Design spec for QwzSpace v-next: the room model as centerpiece, the intent log as wire format and resume mechanism, the replay-verifiable-room contract as headline differentiator, a zero-dep client SDK, and the tick-locked renderer that unifies live view and replay into one projection path. Companion to qwzspace-market-teardown.md; grounded in the current source tree, not aspiration."
date: 2026-08-19
keywords: ["qwzspace", "spec", "realtime", "rooms", "replay", "renderer", "platform"]
---

# QwzSpace v-next Spec

Companion to [`2026-08-19-note-on-qwzspace-market-teardown.md`](./2026-08-19-note-on-qwzspace-market-teardown.md); read that first for the
competitive grounding this spec answers. Every claim traces to a real file in the current source tree
(`.../qwzspace-services-section/src/*.mjs`) or to a named prior-art file on disk. Each section states
the gap it closes, the fleet customer it closes it for, and how it is checked for determinism.

## 0. Design principles (determinism-first)

These four principles resolve every design choice below when two shapes are both plausible. State them
once so later sections can cite them by name instead of re-arguing them.

1. **The intent log is the only source of truth.** Everything else — the folded world, snapshots, deltas,
   rendered frames — is a pure derivation of `(seed, intentLog)`. A derivation may be cached (the
   snapshot-manager's `cache`, a delta ring buffer) for cost, but a cache is never authoritative and must
   be reconstructible from the log alone.
2. **One writer, one tick, no wall clock inside it.** `runTick(tick, intents)` is already the single
   writer (`intent-queue.mjs` lines 6–11, `tick-driver.mjs` lines 7–18). v-next's rule: nothing inside a
   room's `runTick` may read `Date.now()`, `Math.random()`, or iterate a `Map`/`Set` in an order that
   could differ between two runs of the same log. Anything needing randomness takes a seeded PRNG keyed
   by `(tick, seq)` — deterministic by construction, not by discipline.
3. **Provenance is bound by the server, never trusted from the client.** An intent's `actorId` must come
   from the authenticated connection the queue received it on, not from a client-supplied field in the
   body. (Today's `validate()` convention — ruinfont's `id()`-checked `actor` field — trusts whatever the
   client put in the JSON. That is fine for shape-validation; it is NOT sufficient for replay-verification,
   because a client could claim to be someone else. v-next's intent-queue binds `actorId` server-side from
   the connection at `push()` time — see §2.)
4. **The wire-efficient representation and the authoritative representation are allowed to differ, as
   long as the wire-efficient one is provably a derivation of the authoritative one.** This is what lets
   §5 keep snapshot+delta on the wire (bandwidth) while the intent log stays canonical (replay-proof) —
   they are not in tension once you see the delta stream as a cached projection, not a second ledger.

## 1. The room model (centerpiece)

### What exists today
`create-server.mjs` already assembles one world: one `queue`, one `snapshot`, one `hub`, one tick clock,
wired to one transport. "Room" is entirely emergent — the game's `interest(id, subscriberId)` predicate
(`snapshot-manager.mjs` lines 21–25, 82–88) decides who sees whom, but there is no `Room` object a game
or an operator can list, create, or destroy. The teardown named this gap #6.

### v-next shape
A `Room` is a `createServer()` instance given an identity and lifecycle hooks, held by a `RoomRegistry`
that is new but thin — it does not replace `create-server.mjs`, it wraps many of them:

```js
// room.mjs (new)
export function createRoom({ id, ...serverOpts }) {
  const server = createServer(serverOpts);       // unchanged create-server.mjs
  const members = new Map();                     // subjectId -> { joinedAtTick, connCount }
  return {
    id, server, members,
    join(subjectId, conn) { /* see §3 */ },
    leave(subjectId) { /* see §3 */ },
    destroy() { server.hub.each((c) => c.close?.()); server.stop?.(); },
  };
}

// room-registry.mjs (new)
export function createRoomRegistry({ factory }) {         // factory: (id, opts) => room def
  const rooms = new Map();
  return {
    create(id, opts) { const r = createRoom({ id, ...factory(id, opts) }); rooms.set(id, r); return r; },
    get: (id) => rooms.get(id),
    list: () => [...rooms.keys()],
    destroy(id) { rooms.get(id)?.destroy(); rooms.delete(id); },
  };
}
```

Each room keeps its **own** tick-driver, queue, and snapshot cache — rooms do not share a clock. This is
deliberate: a room's replay-verifiability (§6) is a property of *that room's* intent log; coupling clocks
across rooms would mean a bug in room B could ever explain a hash mismatch in room A. `intervalMs` may
differ per room (a turn-based room and an action room do not need the same tick rate — Nakama's per-match
configurable tick, matched here without giving up determinism).

- **Gap closed**: gap #6 (rooms as first-class, queryable objects) from the teardown.
- **Fleet customer**: shared-board future (needs list/create/join, not just a filter predicate);
  durante arena (needs one arena = one room = one independently-replayable match).
- **Determinism check**: two `RoomRegistry`s seeded with the same `factory` and fed the same per-room
  intent logs produce byte-identical `hash(room.server.snapshot.full(finalTick))` for every room — cross-
  room isolation means this check can run per-room in parallel with no shared-state hazard.

## 2. The intent log — wire format (cite the spec)

The wire shape already exists and is not being replaced: `protocol.mjs` line 64 —

```js
export const intent = (seq, body) => ({ k: MSG.intent, seq: seq | 0, ...body });
```

— is the client→server wire message. `intent-queue.mjs`'s `push(raw)` (lines 44–48) is the trust
boundary: `validate(raw)` shapes it into a game intent or rejects it. **v-next's one wire-format change**
is where `actorId` comes from (principle 3, above): today a game's `validate()` typically trusts a client-
supplied `actor` field (the `id()` helper at `intent-queue.mjs` lines 25–27 only checks shape, not
provenance). v-next's `push` signature becomes:

```js
push(raw, actorId)   // actorId supplied by the transport from the authenticated connection, NOT the body
```

and the accepted **Intent Log Record** — the thing that actually gets appended, and the thing §6's replay
contract is defined over — is:

```
{ tick, seq, actorId, kind, args }
```

where `tick` is assigned by the tick-driver at drain time (not client-supplied — a client cannot claim a
future or past tick), `seq` is the client's own monotonic counter (echoed back in `delta.ack`, already
wired at `protocol.mjs` line 43 and `tick-driver.mjs` line 68), and `kind`/`args` are whatever the game's
`validate()` produced from the body. This record is what gets appended to the room's log, what §6 replays,
and what §4's resume mechanism reads from.

- **Gap closed**: closes a *correctness* hole in the replay-verifiable claim itself — without server-bound
  provenance, "replay-verifiable" only proves the log is internally consistent, not that it is an honest
  record of who did what (durante arena's whole reason for wanting this is anti-cheat; an unbound
  `actorId` is a cheat vector the teardown's beat thesis does not yet close).
- **Fleet customer**: durante arena (anti-cheat is the point); any room needing an audit trail.
- **Determinism check**: replaying `{tick, seq, actorId, kind, args}[]` through `runTick` twice, on two
  different processes, from the same seed, produces identical folded state — `actorId` binding does not
  touch this property, it only makes the log's *claims* trustworthy, which is a prerequisite for §6's
  headline meaning anything to an outside verifier.

## 3. Presence, join, leave

### What exists today
`broadcast-hub` (referenced throughout `create-server.mjs`) tracks a live-client `Set` and per-client
`lastSeq`/subscriber binding (`create-server.mjs` lines 109–125), but no identity, session, or "who else
is here" query — the teardown's gap #3, named against Okaga's Discworld-MUD-style presence needs.

### v-next shape
Presence is folded state, not hub bookkeeping — it goes through the same tick/log discipline as
everything else, so a "who's in the room" query is itself replay-consistent:

- **join** — the transport (ws `onJoin`, `create-server.mjs` line 116, or an sse equivalent) turns a
  connection's `join(name)` wire message (`protocol.mjs` line 60) into a synthetic intent:
  `{ kind: "presence.join", actorId, args: { name } }`. It goes through the SAME queue as any other
  intent — presence has no side channel, so a room's presence history replays exactly like combat state.
- **leave** — a dropped socket is turned into `{ kind: "presence.leave", actorId, args: {} }` **after**
  the resume grace window (§4) expires, not on socket-close itself (a reconnecting player never actually
  "left" the folded world — only the transport dropped).
- **presence query** — the game's `snapOf` convention already answers "what does this subject look like
  right now"; a presence-aware game adds a `presence` kind of subject (one row per member) that `snapOf`
  projects like any other entity, so `subjectsOf`/`interest` (already-shipping seams) give "who's in my
  interest set" for free — no new qwzspace primitive required, only a documented convention.

- **Gap closed**: gap #3 (presence/identity model).
- **Fleet customer**: Okaga (presence/rooms/talk named explicitly in its design doc).
- **Determinism check**: `presence.join`/`presence.leave` are ordinary intents — they inherit §6's
  guarantee automatically; the check is just that they never bypass the queue (no direct hub mutation on
  socket events, which the ws transport must be audited against — today's default `onMessage` handler at
  `create-server.mjs` lines 120–122 already does this correctly for intents; joins currently do not,
  and closing that gap is part of this section's work, not a hypothetical).

## 4. Reconnection-with-resume — the log IS the resume mechanism

### What exists today
Nothing. Teardown gap #2, ranked second-highest. A dropped socket today just disappears from the hub; a
reconnecting client gets a fresh `hello` and a fresh `full()` snapshot with no continuity.

### v-next shape
Colyseus 0.17's `reconnectionToken` + `onDrop`/`allowReconnection`/`onReconnect` is the pattern to match —
**but QwzSpace can do the resume itself out of material it already has**, instead of the seat-hold+timer
mechanism Colyseus needs, because the delta stream is already a log of exactly what a client needs to
catch up on:

1. On `hello`, the server hands the client a `resumeToken` (opaque, `{ roomId, actorId, issuedAtTick }`
   signed or HMAC'd so a client cannot forge another actor's token — closing the same provenance hole as
   §2).
2. The room keeps a **bounded ring buffer of the last N ticks' deltas** (not the raw intent log — the
   *projected* per-subscriber deltas the snapshot-manager already computes each tick at
   `tick-driver.mjs` lines 63–70; N sized by `intervalMs` × a target grace window, e.g. 30s of ticks).
3. On disconnect, the room does NOT immediately fire `presence.leave` — it starts a grace timer and keeps
   the subscriber's diff state (`snapshot-manager.mjs`'s `state.lastView`, lines 93–96) alive.
4. On reconnect within the grace window, the client sends `{ k: "resume", token, sinceTick }`. The server:
   - if `sinceTick` is still in the ring buffer: **replays the buffered deltas in order** — the exact
     sequence the client would have received had it never dropped. This is the literal meaning of "the
     log is the resume mechanism": no special-cased resume payload, just delivery of the deltas the
     client missed.
   - if `sinceTick` has aged out of the ring buffer (a long disconnect): fall back to a fresh `full()`
     frame (§5's snapshot path) — correct but costs a full re-sync instead of a cheap delta replay. This
     fallback is the honest edge Colyseus's own issue #343 ("seat reservation expired") documents as a
     rough edge in their system; QwzSpace's version of that edge is explicit and cheap to reason about
     (a size check against a ring buffer) rather than a distributed seat-reservation timeout.
5. If the grace window expires with no resume, only *then* does `presence.leave` fire as a real intent.

- **Gap closed**: gap #2 (reconnection/resume) — matches Colyseus 0.17's UX without needing its seat-
  reservation infrastructure, because the delta log already contains what a resuming client needs.
- **Fleet customer**: every fleet customer (Okaga, durante arena, tidepool MUD once it exists) — "survive
  a dropped WiFi connection" is universal, which is why the teardown ranked this gap #2 overall.
- **Determinism check**: a client that disconnects at tick T and resumes at tick T+k must end up with
  identical folded local state to a client that was connected the whole time — checked by replaying the
  buffered delta segment against a fresh client-side reducer and diffing against the "never disconnected"
  client's state, both fed from the same room.

## 5. State-sync model: full-snapshot + delta-log, DERIVED from the intent log

Two shapes were plausible; principle 4 (§0) resolves it.

**Chosen: full-snapshot + delta-log on the wire, intent-log as the sole authoritative record.** This is
what `snapshot-manager.mjs` already does (`bootstrap`/`resettle`/`full`/subscriber `delta`, lines 43–142)
— v-next does not replace this, it makes explicit what was implicit: the snapshot cache and delta stream
are **derived, cached projections of the intent log**, never a second source of truth. Concretely this
means:
- The snapshot cache MAY be rebuilt at any time by replaying the intent log through `runTick` from tick 0
  (or from a checkpoint — see below) — it is disposable.
- A **periodic checkpoint** (every M ticks, write `{ tick, hash(cache) }`) lets replay-verification (§6)
  and cold-start resume (§4's fallback) avoid replaying from tick 0 for a long-lived room — the checkpoint
  is itself just a cached hash of a derivation, re-derivable, never trusted blindly (a checkpoint whose
  hash a fresh replay from the last-known-good checkpoint disagrees with IS the corruption signal in §6).

**Rejected: derive everything from the log with no snapshot/delta cache at all** (query the log directly
on every read). This was considered because principle 1 says the log is the only source of truth — but
"only source of truth" does not mean "only thing computed on the hot path." A live room re-folding its
entire history on every tick to answer "what does the world look like now" would make the per-tick cost
scale with room age instead of with what the tick touched, which is the exact cost `snapshot-manager.mjs`
was already built to avoid (its own header, lines 15–19). Determinism-first does not mean cache-nothing-
first; it means **the cache must always be provably re-derivable from the log**, which the checkpoint-hash
scheme above gives for free.

- **Gap closed**: none new — this section is the explicit statement of a design choice that was already
  implicit in the current code, made explicit so §6 and §4 can build on it without ambiguity.
- **Fleet customer**: all of them, indirectly (this is the section that makes §4 and §6 possible at all).
- **Determinism check**: `hash(replay(seed, log[0..T]))` must equal the live cache's hash at every
  checkpoint tick `T` — this check IS the mechanism, not a side validation of it.

## 6. THE REPLAY-VERIFIABLE ROOM CONTRACT (headline)

This is the differentiator the teardown's beat thesis rests on (teardown §"Beat thesis"), stated as a
contract a room must satisfy, not a feature description:

> **For any room, given its seed and its complete ordered intent log, `replay(seed, log)` is a pure
> function whose output hash is byte-identical to the hash of the room's actual live-derived state at the
> same tick — independent of who computes it, when, or how many times.**

Concretely, three obligations, each traceable to a principle in §0:

1. **Purity obligation** (principle 2): `runTick` may not read wall-clock time, unseeded randomness, or
   depend on iteration order the language does not guarantee. v-next adds a lint/test gate:
   `prove-determinism.mjs` runs a room's log through `runTick` twice in two separate process invocations
   and asserts `hash(final) === hash(final)` — literally the same test abrash's `engine.test.mts` already
   runs for its own tick loop ("the identical intent sequence over the identical seed world produces
   byte-identical worlds *and* byte-identical rendered frames" — abrash README, "Real test counts"
   section) — v-next generalizes that discipline from one game engine's test suite into a qwzspace-level
   contract every room must pass.
2. **Provenance obligation** (principle 3, §2): the log's `actorId` fields must be server-bound, or the
   replay is internally consistent but not an honest record — this is what makes the contract usable for
   anti-cheat (durante arena) rather than merely useful for debugging.
3. **Self-audit obligation**: a room periodically (configurable, e.g. every 1000 ticks or every checkpoint
   from §5) replays its own last-K-ticks segment from the last checkpoint and diffs the resulting hash
   against its live cache's hash. A mismatch is logged as a **structural integrity failure** — this is
   the "server can prove its own integrity" framing from the mandate: not an external tool someone runs
   after the fact, but the room checking itself as a matter of course.

**Why no competitor has this**: the teardown's headline finding #3 — every class-A competitor treats
anti-cheat as a bolt-on validation layer (Roblox's own July 2026 consensus: "server-authoritative backend
that validates every action"), which catches a client lying about an action but does not let the *server*
prove after the fact that its own history is internally consistent. QwzSpace's contract is the stronger
claim: not just "the server was authoritative," but "the server's authority is checkable by anyone with
the log," because determinism (principle 2) plus provenance (principle 3) plus a pure replay function
(this section) together make the room's history a self-verifying artifact, not a trust assertion.

- **Gap closed**: none from the ranked list — this is the platform capability the teardown says is
  **unclaimed by anyone** (parity table row "Replay-verifiable rooms," teardown line 130), i.e. it is not
  closing a competitive gap, it is opening one competitors don't have.
- **Fleet customer**: durante arena (the direct beneficiary — competitive integrity as a platform
  guarantee instead of a per-game discipline); every room, secondarily, gets crash-recovery and audit for
  free as a byproduct.
- **Determinism check**: this section's obligations ARE the determinism check — `prove-determinism.mjs`
  (obligation 1) and the self-audit loop (obligation 3) are the literal test surface; there is no separate
  check to describe because the contract's substance is the check.

## 7. Minimal client SDK (browser + node, zero-dep)

### Prior art — do not build this from scratch
A prior client already exists on disk, unshipped, at
`.../lib/legacy/computing-with-the-web/src/qwzspace/client.mts` (44KB TypeScript, imports the same
`MSG`/`decode`/`encode`/`intent`/`join` shapes `protocol.mjs` still exports today, confirming lineage).
It already has two pieces v-next needs and should NOT redesign:
- **`InterpolationBuffer`** (`push(frame, receivedAtMs)`, `sample(renderTimeMs)`, `latestTick()`) — a
  tick-locked sample buffer that is *exactly* §8's renderer needs (a scene projection sampling display
  frames off a buffered tick stream) — this is the seam between §7 (SDK) and §8 (renderer), and it already
  exists, unshipped.
- **`RealtimeConnectionPolicy`** (`opened`/`heartbeat`/`closed`/`failed`/`shouldReconnect`, backoff with
  jitter, a `RealtimeConnectionState` enum including `"stale"`/`"contested"`/`"exhausted"`) — a
  reconnect-backoff policy that pairs directly with §4's resume token flow (`shouldReconnect` decides
  *when* to retry; §4 decides *what* the retry sends).

### v-next shape
Port (LIFTED, per house convention — see `protocol.mjs`'s own header for the pattern) `client.mts` into
the current package as `src/client.mjs` (+ `.d.ts`), adapted to:
- **wire the resume token** from §4 into `RealtimeConnectionPolicy`'s reconnect path (the legacy file
  predates the resume design, so this glue is new, small code, not a port);
- **drop nothing else** — the `WorldView` (`on`/`emit`/`apply`/`me`/`get`/`zone`) abstraction is the
  correct shape for a game to consume `snapshot`/`delta` frames without hand-rolling its own reducer,
  which the teardown's gap #4 named as universal pain (every current consumer, Aletheon included, hand-
  rolls this today).
- **two entry points, one source**: `client.mjs` (isomorphic core: protocol, `WorldView`, interpolation,
  connection policy — no DOM, no `node:` imports, matches `protocol.mjs`'s existing zero-import
  discipline) plus a thin `client-browser.mjs` (native `WebSocket`) and `client-node.mjs` (a hand-rolled
  zero-dep WS client — note: a *client's* handshake is simpler than the server's, but RFC 6455 requires
  the client to MASK every frame it sends, which `http-ws-server.mjs`'s existing frame code does not need
  to do today since it only unmasks; this masking logic is the one genuinely new low-level piece v-next
  must write, not port).

- **Gap closed**: gap #4 (packaged client SDK) — closed largely by *finding and porting* existing work
  rather than writing it, which is itself worth flagging to the owner: this gap looked bigger from the
  teardown than it is from the source tree.
- **Fleet customer**: every fleet customer — this is the SDK every current consumer (Aletheon) hand-rolls
  today, per the teardown's gap #4 note.
- **Determinism check**: N/A directly (a client SDK is not part of the authoritative log), but
  `InterpolationBuffer.sample()` must be a pure function of `(buffered frames, renderTimeMs)` — same
  buffer contents and same query time must yield the same sampled entities on every call, which is what
  makes it safe to reuse for BOTH live playback and replay scrubbing in §9.

## 8. THE RENDERER — tick-locked presentation layer

This is the owner-mandated spatial half. The clarification is explicit: transport+tick are the temporal
dimension; the renderer is the spatial dimension that time forces. Design follows from that literally.

### The seam: simulation tick ≠ display frame, but ONE clock owns both
Every render-engine-plus-netcode pairing in the teardown (Babylon+Colyseus, Phaser+Colyseus) has the
developer hand-write `Scalar.Lerp()` in the render loop to reconcile two *independently ticking* clocks
(teardown headline finding #2). QwzSpace's renderer does the same interpolation — **`InterpolationBuffer`
from §7 already does exactly this** — but the render clock and the sim clock are related by construction,
not by developer discipline: the render loop's `requestAnimationFrame` samples the SAME tick-numbered
buffer the sim writes into, so "smoothing" is a query against one buffer fed by one deterministic writer,
not glue code reconciling two systems that don't know about each other.

### Scene projection contract
```
project(roomState, tick) -> SceneDescription
```
- **Input**: the entries a `snapOf`/interest-filtered view already produces (§1, §5) — the renderer does
  NOT get a new data source; it consumes exactly what a client SDK already receives over the wire (or, for
  server-side/replay rendering, exactly what a room's snapshot-manager cache holds).
- **Clock**: the tick, not wall time. `SceneDescription` is requested *for* a tick (or an interpolated
  point between two ticks, via `InterpolationBuffer.sample(renderTimeMs)`); the renderer never asks "what
  time is it," it asks "what did the world look like at tick T (or T+frac)."
- **Output**: a backend-neutral description (positions, orientations, a `kind`/`role` per entry — echoing
  TUFTE's own role/span vocabulary where it overlaps, since both fibers read house doc conventions) that
  a **pluggable spatial backend** turns into pixels.

### Pluggable spatial backends
1. **2D canvas/SVG backend (v-next, build now)**: a thin `render-2d.mjs` — no existing house fiber to
   compose (confirmed: no dedicated canvas/SVG house fiber exists on disk today, only ad hoc per-game
   canvas code) — so this is new, small, native-canvas code living in QwzSpace itself, not a dependency.
   Scope: `<canvas>` 2D context, draws `SceneDescription` entries as sprites/shapes keyed by `kind`. This
   is the backend every current fleet customer (Aletheon, Okaga) actually needs first.
2. **3D backend — the abrash/Ashlar seam (design now, integrate when it lands)**: `@red-cup-engineering/
   abrash` (confirmed on disk, 103/103 tests passing, browser-portable today) already exports exactly the
   shape a 3D backend needs: a pure `raycaster` producing a `Framebuffer`, and `paintToCanvas(ctx, fb)` —
   ONE `putImageData` call, no re-encoding (abrash README, `framebuffer` section). The seam: QwzSpace's
   `project()` output maps to abrash's `world.mjs` federated-voxel subject shape (a `SceneDescription`
   entry's position/kind becomes a voxel-grid predication), abrash's `raycaster` renders it to a
   `Framebuffer` keyed by the SAME tick QwzSpace's projection was requested for, and `paintToCanvas` is
   the terminal step — no new rendering code needed once the shape-mapping is written. This is deferred
   pending the "Ashlar port" (the house-scope migration bringing abrash from `@red-cup-engineering` into
   `@561-group`, tracked as a separate namespace-migration item) — v-next defines the mapping contract
   now against abrash's *current*, stable, tested public shape so no
   redesign is needed when the migration lands, but does not block on the migration itself.
3. **Backend interface**, so 1 and 2 (and any future backend) are interchangeable:
   ```
   createBackend({ mount }) -> { render(sceneDescription, tick) }
   ```
   `render` is called once per animation frame with whatever `SceneDescription` the interpolation buffer
   currently samples — a backend never touches the network, the log, or the tick-driver; it is a pure
   consumer of §8's projection output, which is what makes §9's unification possible.

- **Gap closed**: gap #1 (a renderer at all — highest-ranked, blocks every downstream customer).
- **Fleet customer**: Aletheon and Okaga first (2D backend, immediate); durante arena eventually (3D
  backend, once the abrash/Ashlar seam lands — durante's own arena/demon modules are already abrash
  consumers per abrash's README, so this is not a new integration, it is qwzspace joining one that
  exists).
- **Determinism check**: `project(roomState, tick)` must be a pure function of its inputs (no backend may
  mutate `SceneDescription` or feed anything back into room state) — checked by rendering the same tick
  twice from the same cached snapshot and asserting byte-identical `SceneDescription` output; this is
  what makes replay-rendering (§9) safe to run out of order or in parallel (e.g. pre-rendering a replay's
  frames for scrubbing).

## 9. Unification proof-of-concept: ONE projection path, live = replay = free

The requirement, stated as a test to pass, not a paragraph to write:

> A single `project(roomState, tick)` call, given EITHER (a) a live room's snapshot-manager cache at the
> current tick, or (b) a `replay(seed, log)` run stopped at the same tick, must produce byte-identical
> `SceneDescription` output — and the SAME backend (`render-2d.mjs` at minimum for v-next) must render
> both without knowing which one it was given.

Mechanically this falls out of §5 and §8 rather than requiring new machinery: §5 already establishes that
a live cache and a replayed derivation are hash-identical at any checkpoint; §8's `project()` already only
consumes the cache shape, never anything live-connection-specific (no socket, no hub, no transport). The
PoC is therefore an integration test, not a new subsystem:

```js
// prove-unification.mjs (new, v-next)
const live = await liveRoom.snapshot.full(T);
const replayed = await replay(seed, log.slice(0, T)).snapshot.full(T);
assert.deepStrictEqual(project(live, T), project(replayed, T));       // same projection
render2d(project(live, T));      // same backend call, spectator UI
render2d(project(replayed, T));  // same backend call, "watch the replay" UI
```

"Spectating = replay = free" (the mandate's own framing) means concretely: the spectator UI and the
replay-scrubber UI are the SAME frontend code pointed at two different `roomState` sources — a live
subscription (§1/§7) or a stored log played back at any rate/direction (since `project` takes an
arbitrary tick, scrubbing forward/backward is just calling it with a different `T`, no special "reverse
playback" mode needed).

- **Gap closed**: none from the ranked list — like §6, this is a capability the teardown found unclaimed
  by any competitor (parity table row "Live view = replay view," teardown line 129), stated here as the
  literal proof obligation rather than a claim.
- **Fleet customer**: durante arena most directly (match replay/spectate is a competitive-game staple no
  fleet game currently has, and this makes it free once §6 and §8 both ship); any room, secondarily
  (crash forensics — "what did the room look like right before it broke" is a replay query, not a special
  debugging feature).
- **Determinism check**: this section's own test IS the check (`prove-unification.mjs`); it composes
  §5's and §8's checks rather than introducing a new one, which is the point — unification should be
  provable as a corollary of the pieces already being correct, not as independent new work.

## 10. Hosting story

### Today: VPS + systemd (honest, this is what's live)
The one real, live-exercised deployment (Aletheon, per the teardown's Current Surface section) runs as a
long-lived Node process. v-next's hosting posture for rooms is the same shape, made explicit:
- one process, one or more `RoomRegistry`s, `intervalMs`-driven ticks — no external scheduler needed
  because the tick-driver already IS the scheduler (`tick-driver.mjs`, `setInterval`).
- systemd unit (`Restart=on-failure`, `Type=simple`) supervises the process; a crash loses in-memory
  rooms' un-checkpointed ticks since the last §5 checkpoint — this is an honest limitation to state, not
  paper over: **v-next should write checkpoints to disk** (the settled-section EAVT substrate the house
  already uses elsewhere, `@561-group/computer`'s `posix-holography` line, per abrash's own citation of
  it) so a restart can resume from the last checkpoint + replay-forward rather than losing the room. This
  is new work this spec is flagging, not claiming already exists.
- one process per host is the honest ceiling for single-writer correctness *per room*; MULTIPLE rooms in
  one process is fine (each has its own tick-driver/queue — no shared mutable state per §1), so vertical
  scaling (more rooms per box) is the natural first lever, not horizontal (more boxes needing room-to-box
  routing) — this matches the teardown's honest read that no load test has been run yet (gap #5) and this
  spec does not manufacture a scale claim it can't back.

### Cloud Run notes (honest about the tradeoffs, not a recommendation to migrate)
Cloud Run supports WebSockets (HTTP/1.1 upgrade, supported since 2021) with real constraints QwzSpace's
single-writer-per-room model collides with directly:
- **Per-instance concurrency + autoscaling means a room's live WebSocket connections can be split across
  multiple instances** unless `min-instances`/`max-instances` are pinned to 1, or session affinity is
  configured — and a room's tick-driver is in-process memory (`snapshot-manager`'s `cache`, the hub's live
  set), so two instances would each think they're the single writer for the same room, silently violating
  principle 2. This is not a QwzSpace bug to fix; it is a mismatch between "single-writer in-process state"
  and "stateless-by-default autoscaled compute" that would need EITHER pinning one instance per room
  (defeats the point of autoscaling) OR moving room state out of process (a real architecture change, not
  a hosting config change) — v-next does not attempt this; it names it so nobody assumes Cloud Run is a
  drop-in upgrade path from the VPS.
- **Cold starts** matter for a tick-driven room: a scaled-to-zero instance waking up mid-tick-cadence
  either misses ticks or needs the tick-driver itself to be resume-aware (§5's checkpoint mechanism again
  becomes load-bearing here, not just for crash recovery).
- **Where Cloud Run WOULD fit cleanly**: the `http-sse-server` transport (already fully built, zero
  consumers per the teardown) is closer to request/response and tolerates the "any instance can answer"
  model better than a stateful WS room — if a future fleet customer needs read-only spectator/replay
  delivery (§9) at scale, THAT surface (stateless, replay-derived, no single-writer requirement) is the
  Cloud-Run-shaped half of QwzSpace, not the live room engine.

- **Gap closed**: gap #7 (managed hosting story) — lowest-ranked in the teardown, addressed here with
  honesty rather than urgency, per the teardown's own priority call.
- **Fleet customer**: none blocked on this today (teardown's own finding); written for future-proofing
  the roadmap conversation, not because a customer is waiting.
- **Determinism check**: N/A — this section is operational, not a claim about `runTick` purity; the only
  determinism-adjacent point is that the checkpoint mechanism (§5) is what makes ANY restart-based hosting
  story (systemd OR Cloud Run) safe, which is why it is called out as load-bearing in both subsections.

---

## Spec outline (recap)

0. Design principles — determinism-first (log is truth; one writer, no wall clock; server-bound
   provenance; wire cache vs. authoritative log may differ if provably derived)
1. Room model — `Room`/`RoomRegistry` wrapping `create-server.mjs`, one clock per room
2. Intent log wire format — `protocol.mjs`'s `intent()` + `intent-queue.mjs`'s `push()`, hardened with
   server-bound `actorId`; canonical record `{ tick, seq, actorId, kind, args }`
3. Presence/join/leave — folded state via synthetic intents, not hub side-channels
4. Reconnection-with-resume — resume token + bounded delta ring buffer; log replay IS the resume
5. State-sync model — full-snapshot + delta-log on the wire, DERIVED from the intent log (chosen over
   query-log-directly, for cost reasons that don't compromise determinism)
6. Replay-verifiable room contract — purity + provenance + self-audit obligations; THE headline
7. Client SDK — port the unshipped `client.mts` (`InterpolationBuffer`, `RealtimeConnectionPolicy`,
   `WorldView`), split into isomorphic core + browser/node transports
8. The renderer — `project(roomState, tick) -> SceneDescription`, pluggable backends (2D now, abrash/
   Ashlar 3D seam designed now, integrated later)
9. Unification PoC — one `project()` path renders live and replayed state identically; spectating = free
10. Hosting — VPS/systemd honestly documented (with disk checkpointing as new required work), Cloud Run
    honestly disqualified for live rooms, plausible for the stateless SSE/replay surface only

## Cut list (out of scope for v-next; explicitly deferred, not forgotten)

- **Managed hosting product** (a QwzSpace Cloud) — no fleet customer blocked on it (teardown gap #7,
  lowest ranked); revisit only if a customer outside the current fleet asks.
- **Client SDK breadth beyond JS** (Unity/Unreal/Godot-style ports, matching Colyseus/Nakama's reach) —
  the fleet is browser/node-only today; building for hypothetical non-JS clients before one exists would
  violate the same "truth-only" discipline this spec follows for prose.
- **Horizontal scaling / multi-instance room sharding** — deferred until a load test (gap #5) actually
  shows single-process-per-room hitting a ceiling; premature sharding would also directly threaten
  principle 2 (single-writer) if done carelessly, so it needs its own spec, not a subsection here.
- **Binary/schema-diff wire encoding** (Colyseus-style binary patches, replacing `protocol.mjs`'s flat
  JSON) — `protocol.mjs`'s header already flags this as a future swap point ("the encoding is
  deliberately separated from the shapes so the transport can later swap JSON for a binary packing
  without touching call sites") — v-next does not need it yet; no fleet customer has hit a bandwidth wall.
- **The abrash/Ashlar 3D backend's actual implementation** — the SEAM is designed in §8 against abrash's
  current stable shape; writing `render-3d.mjs` itself waits for the Ashlar namespace migration to land,
  integrating what exists rather than blocking on what doesn't yet. Ordering it after the migration also
  avoids double work if the migration changes abrash's exports.
- **A dedicated house canvas/SVG fiber** — confirmed absent on disk (search turned up nothing); v-next
  builds `render-2d.mjs` directly inside QwzSpace rather than inventing a new shared fiber nobody asked
  for yet. If a THIRD consumer independently needs 2D canvas rendering later, extracting one becomes a
  real fleet-duplication case (the same pattern that justified qwzspace itself, per the teardown's
  `http-sse-server` fleet-duplication evidence) — not before.
- **`node --test` migration for QwzSpace's own suite** — the current `prove-*.mjs` runner (hand-rolled,
  `package.json` line 25) is not `node --test`-based, which is a House convention gap independent of this
  spec's content (`node --test` is the house standard). Flagging it here as adjacent cleanup, not
  blocking v-next's design work, since it's orthogonal to rooms/replay/renderer.
- **`.d.ts` packaging** — `qwzspace`'s `package.json` exports currently ship `.mjs` only (no `types`
  entries), unlike abrash's per-module `.d.ts` pattern (`abrash/package.json`'s `exports` block). House
  convention calls for `.mjs` + `.d.ts`; this spec's new modules (`room.mjs`, `room-registry.mjs`,
  `client.mjs`, `render-2d.mjs`) should ship typed from day one, and closing the gap for the EXISTING
  eight modules is worth doing in the same pass rather than compounding the debt — flagged here as
  required v-next packaging work, not deferred, but called out because it's easy to silently skip.
