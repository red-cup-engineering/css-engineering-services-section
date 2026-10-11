# Head-to-head: a real multi-client session

`run-session.mjs` runs 20 bot clients over real WebSockets, on localhost, through a real `Room` —
no mocked transport, no simulated ticks. It measures tick stability, wire message counts, resume
correctness under forced (server-initiated) disconnects, and proves that the same session, rendered
live and then re-rendered from its own replay history through the identical `project()` path,
produces byte-identical frames.

```
node examples/head-to-head/run-session.mjs
```

Takes about 10 seconds (a 7s session + a 2.5s settle window for reconnect/resume to finish), prints a
full JSON report, and exits non-zero if any proof obligation fails.

## What it actually does

1. Starts one `Room` (`intervalMs: 100`, `ringBufferTicks: 300` — a ~30s resume window, sized per the
   spec's own §4 rule of thumb) over a real `node:http` server + `http-ws-server.mjs`.
2. Connects 20 bots via `client-node.mjs`'s `connectRoom` (Node's built-in RFC 6455 client, not a
   mock) — each joins, then sends randomized `move` intents every 150–400ms for 7 seconds.
3. At 25%, 50%, and 75% of the session, **force-disconnects 2 random bots per wave** by calling
   `conn.close()` on their live server-side connection — a real TCP/WS close, not a graceful client
   exit. Each affected bot's own `client-node.mjs` client observes the drop and reconnects with its
   resume token automatically (this is `createRealtimeClient`'s real reconnect path, not a shortcut).
4. Instruments `room.hub.send`/`broadcast` from OUTSIDE the package (no source changes) to count every
   real wire message and byte actually sent, and separately computes what a **naive full-broadcast**
   (send the whole scene to every client, every tick, no delta/interest filtering) would have cost for
   the identical session — the wire-efficiency baseline the task asked for, computed locally, not
   borrowed from a competitor.
5. After the session, runs `room.verify()` (§6 — full replay-verification of the whole 20-client,
   ~100-tick history) and a full `replay()` of the room's log through a **fresh, independent** domain
   instance, feeding a second `InterpolationBuffer` at the exact same wall-clock timestamps the live
   capture used, then samples both buffers at ~60fps across the whole session and asserts
   `project(liveSample) === project(replaySample)` at every sample — the §9 unification proof, run
   over a real multi-client session instead of a hand-built fixture.

## Sample numbers (see `sample-report.json` for the full JSON of one run)

Exact numbers vary run to run (bot movement is randomized, and tick timing has some scheduling
jitter); `verify.ok`, `render.allFramesIdentical`, and every `resumeResults[i]` entry's four
booleans are expected `true` on every run.

| Metric | Sample run | Note |
|---|---|---|
| Final tick | 99 | ~100 ticks over the 7s session at `intervalMs: 100` |
| Final member count | 20 | all 20 bots present, no orphaned/duplicate actors after forced disconnects |
| Actual wire messages | 1,368 | real `hub.send`/`broadcast` calls, counted from outside the package |
| Actual wire bytes | 1,035,249 | JSON-encoded, as actually sent |
| Naive-broadcast messages (baseline) | 1,863 | full scene to every client, every tick, computed for the same session |
| Naive-broadcast bytes (baseline) | 4,657,154 | same baseline |
| Message reduction vs. naive | 26.6% | interest-filtered delta vs. unfiltered full broadcast |
| Byte reduction vs. naive | 77.8% | the bigger number, because deltas are small and infrequent per-entity |
| Tick interval, mean / stddev | 100.30ms / 2.68ms | configured `intervalMs: 100` |
| Tick interval, min / max | 94ms / 109ms | tight — the overrun guard held cadence under 20-client load |
| Forced disconnects | 6 (2 × 3 waves) | all 6: disconnect observed, resume observed, identity preserved, still a member afterward |
| Render frames compared (live vs. replay) | 602 | sampled at ~60fps across the session |
| Render frames identical | 602 / 602 | byte-identical `project()` output, every sample |
| `room.verify()` | `ok: true` | the whole 20-client, ~100-tick history re-derives to the live cache's hash |

**Why message reduction (26.6%) is smaller than byte reduction (77.8%):** with `interest: () => true`
(every bot sees every other bot — no spatial culling in this demo world), the delta stream still sends
close to one message per client per tick whenever ANYTHING in the room changed (which, with 20 bots
moving every 150–400ms, is most ticks) — so the *message count* savings mostly come from ticks where
literally nothing moved. The *byte* savings are much larger because a delta only carries the entities
that actually changed that tick (usually a handful of the 20), while the naive baseline re-sends every
entity's full state to every client on every tick regardless of whether it moved. A game with real
spatial interest-filtering (bots that can only see nearby others) would show a much larger MESSAGE
reduction too — this demo deliberately used `interest: () => true` to keep the example's domain logic
minimal, not to flatter the number.

## Scope

This script benchmarks QwzSpace against its own configured targets (the tick interval and resume
window it was given) and against a naive-broadcast baseline computed from the same session — no
other realtime platform is run locally for comparison.

## Files

- `run-session.mjs` — the whole proof, runnable standalone.
- The arena comes from `@red-cup-engineering/qwzspace/demo-world`, shared with the other examples.
- `sample-report.json` — one real, complete run's output, saved for reference.
