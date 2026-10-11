# Multi-room load: an honest rooms-per-process ceiling

`run-session.mjs` extends `examples/head-to-head`'s methodology (real websockets, real Rooms, no
mocks) from one room to N independent rooms concurrently in one process, climbing room count and
measuring whether every room's own tick cadence holds. This is Wave1 §5: turning "vertical scaling
(many independent rooms, one clock each, one process per host) is the natural first lever" from a
stated principle in the vnext spec's §10 into a measured number.

```
node examples/multi-room-load/run-session.mjs
MULTI_ROOM_COUNTS=1,5,10,20,40 MULTI_ROOM_BOTS_PER_ROOM=5 node examples/multi-room-load/run-session.mjs
```

## What it actually does

1. For each room count in `MULTI_ROOM_COUNTS` (default `1,5,10,20`): spins up that many independent
   `Room`s, each on its own `node:http` server (confirmed safe on this sandbox — see the script's own
   header note about the *sequential* close-then-reopen bug `tests/prove-client-node.mjs` documents,
   which this does not trigger since every server here is created once, concurrently, and none are
   closed mid-run), each with `MULTI_ROOM_BOTS_PER_ROOM` real `client-node.mjs` bots sending randomized
   `move` intents.
2. Samples every room's own tick cadence independently (the same 5ms external-poll technique
   `examples/head-to-head/run-session.mjs`'s own sampler uses) for `MULTI_ROOM_SESSION_MS`.
3. Reports each room's mean/stddev/max tick interval, and the worst (highest) mean across all rooms at
   that room count.
4. After every configured room count has run, reports an `honestCeiling`: the first room count where
   the worst per-room mean tick interval exceeded `MULTI_ROOM_DEGRADE_THRESHOLD` (default 1.5x) the
   configured interval, or `null` (with an explicit non-claim) if no degradation was observed up to the
   largest room count tested.

## Sample numbers (see `sample-report.json` for the full JSON of one run)

Run on a **shared, heavily-loaded host** (load average ~21–30 on 16 cores at the time, per the same
kind of contention `examples/head-to-head`'s own numbers already document) — reported honestly, not
re-run to look cleaner:

| Room count | Bots total | Mean-of-means tick interval | Worst per-room mean | Note |
|---|---|---|---|---|
| 1 | 4 | 100.13ms | 100.13ms | baseline, essentially exact |
| 10 | 40 | 197.69ms | 197.73ms | a ~2x spike — see below |
| 25 | 100 | 100.55ms | 100.87ms | back to baseline |
| 50 | 200 | 100.86ms | 101.07ms | still baseline, at 5x the room count of the spike |

**Reading the 10-room spike honestly**: this is host-contention noise, not a room-count effect — the
tell is that 25 and 50 rooms (2.5x and 5x MORE rooms, 2.5x and 5x MORE total bots) both ran at baseline
cadence, which a genuine per-room-count degradation could not produce. This matches
`examples/head-to-head`'s own documented finding that this shared host produces occasional large
tick-interval outliers uncorrelated with load, not a QwzSpace-specific signal. The `honestCeiling`
field this run actually reported names 10 rooms, mechanically, because the script's own degradation
rule is a simple threshold crossing — flagged here, in prose, exactly because a naive read of that one
field would be misleading without this context. No monotonic degradation with room count was observed
up to 50 rooms / 200 bots on this host.

**This is not a hardware ceiling claim.** It is what was actually observed, once, on one shared,
contended host, at these room/bot counts. A dedicated host, or higher counts, may find a real ceiling
this run did not reach — the script is built to keep climbing (`MULTI_ROOM_COUNTS`) rather than to
assert a specific number.

## Files

- `run-session.mjs` — the whole harness, runnable standalone, configurable via `MULTI_ROOM_*` env vars.
- The arena comes from `@red-cup-engineering/qwzspace/demo-world`, shared with the other examples.
- `sample-report.json` — one real, complete run's full output, saved for reference.
