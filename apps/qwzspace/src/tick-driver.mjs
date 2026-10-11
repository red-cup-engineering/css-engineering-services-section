// tick-driver — the world's clock made of a setInterval. LIFTED from apps/games/ruinfold/server/
// loop.mjs (the every-intervalMs drain → tick → resettle → broadcast loop, with its overrun guard)
// and merged with apps/games/aletheon/server/app.mjs's step() shape, then generalized: the game's
// runTick and the bootstrap-from-trace are injected, so the driver owns ONLY the cadence and the
// single-writer discipline, not any game logic.
//
// THE TICK IS A TRANSACTION BOUNDARY, NOT A CLOCK THE LOGIC DEPENDS ON. Every intervalMs the driver:
//   1. drains the queued intents (the single ordered batch for this transaction),
//   2. runs ONE game tick — the SINGLE WRITER, the only thing that appends to the trace,
//   3. re-settles the touched subjects (re-folds the append-only trace for what changed),
//   4. projects the INTEREST-FILTERED delta to each subscriber (or a shared delta if none),
//   5. broadcasts any discrete events the tick produced (chat, banners) after the delta.
//
// OVERRUN GUARD (ruinfold's discipline preserved): a tick reads and writes the disk, so it can
// occasionally take longer than the interval. The `running` flag makes a slow tick simply SKIP the
// next firing (coalesce) rather than overlap itself — overlap would race the append-only log and
// break single-writer discipline. The tick is a boundary; if a boundary runs long, the next one
// waits, the logic does not depend on wall-clock spacing.
//
//   const driver = await startTickDriver({
//     hub, snapshot, queue,
//     runTick,        // async (tick, intents) -> { dirty:Iterable<id>, events?:[obj] }
//     bootstrap,      // optional async () -> startTick  (resume from the trace; default 0)
//     intervalMs, heartbeatMs,
//     perSubscriber,  // if true, each client gets its OWN interest-filtered delta (default: auto)
//   })
//   driver.tickNow()  -> the current tick number
//   driver.stop()     -> clear the timers

export async function startTickDriver({
  hub,
  snapshot,
  queue,
  runTick,
  bootstrap = null,
  intervalMs = 200,
  heartbeatMs = 15000,
  perSubscriber = null,
}) {
  if (typeof runTick !== "function") throw new TypeError("tick-driver: runTick(tick, intents) is required");

  // Resume from the trace: a game may compute its starting tick (e.g. the dimension's heartbeat)
  // and re-enroll live subjects. Default to 0 if it supplies nothing.
  let tick = (bootstrap ? await bootstrap() : 0) | 0;
  await snapshot.bootstrap(tick);

  // Decide the delta strategy once: if any client carries a snapshot subscriber, send per-subscriber
  // interest-filtered deltas; otherwise a single shared delta (the ruinfold path). An explicit
  // `perSubscriber` overrides the auto-detect.
  const usePerSubscriber = perSubscriber ?? false;

  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // previous tick still in flight — coalesce, do not overlap
    running = true;
    try {
      const next = tick + 1;
      const intents = queue.drain();
      const result = (await runTick(next, intents)) ?? {};
      const dirty = result.dirty ?? [];
      tick = next;

      if (usePerSubscriber) {
        // re-settle the global cache once (cost paid once), then each client pulls ITS delta off it.
        await snapshot.resettle(dirty, tick);
        hub.each((client, subscriber) => {
          if (!subscriber) return;
          const d = subscriber.delta(tick, client.lastSeq ?? 0);
          if (d.entities.length || d.removed.length) hub.send(client, d);
        });
      } else {
        // one shared delta to everyone (the ruinfold loop).
        const d = await snapshot.resettle(dirty, tick);
        if (d.entities.length || d.removed.length) hub.broadcast(d);
      }

      // discrete events (chat, banners) ride AFTER the delta so positions are fresh when a line lands.
      for (const ev of result.events ?? []) hub.broadcast(ev);
    } catch (e) {
      console.error("[qwzspace] tick error:", e);
    } finally {
      running = false;
    }
  }, intervalMs);

  const hb = setInterval(() => hub.heartbeat(), heartbeatMs);

  return {
    stop() {
      clearInterval(timer);
      clearInterval(hb);
    },
    tickNow: () => tick,
  };
}
