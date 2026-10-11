// bots — N SEEDED roaming clients: a mulberry32 PRNG (computer-data randomization, the
// house's one PRNG home) keyed by one integer seed drives every bot's movement choice, so the SAME
// seed reproduces the SAME sequence of intents across runs (useful for a reproducible demo session —
// NOT a determinism requirement of qwzspace's own replay contract, which replays only what the log
// actually recorded). The randomness lives entirely OUT HERE, outside any room's runTick, per the
// vnext spec's §0 principle 2 — demo-world.mjs's own runTick reads no clock and no RNG itself.
import { mulberry32 } from '@red-cup-engineering/computer-data-engineering-services-section/randomization';

// spawnBots(connectRoom, url, count, seed) — `connectRoom` is injected so this module never
// hard-codes browser-vs-node transport. Returns the live clients, each with its own `close`
// OVERRIDE: a bot's `wander` is a self-rescheduling setTimeout chain that the underlying socket's
// close does NOT stop (client.sendIntent no-ops on a closed socket, but the timer keeps re-arming),
// so the returned `close()` stops the wander chain BEFORE delegating to the real close — otherwise
// every bot's timer runs forever and a headless test never sees the event loop drain.
export function spawnBots(connectRoom, url, count, seed = 561) {
  const rng = mulberry32(seed);
  const clients = [];
  for (let i = 0; i < count; i++) {
    const client = connectRoom(url, { name: `roamer-${i}` });
    let heading = rng() * Math.PI * 2;
    let stopped = false;
    let timer = null;
    const wander = () => {
      if (stopped) return;
      // a gentle random-walk: nudge the heading, step along it — reads as WANDERING, not jitter, which
      // is what makes the abrash spectator view (and the 2D one) honest to look at rather than a cloud
      // of vibrating dots.
      heading += (rng() - 0.5) * 0.6;
      const dx = Math.cos(heading);
      const dy = Math.sin(heading);
      client.sendIntent("move", { dx, dy });
      timer = setTimeout(wander, 250 + rng() * 350);
    };
    timer = setTimeout(wander, rng() * 250);
    const realClose = client.close.bind(client);
    client.close = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      realClose();
    };
    clients.push(client);
  }
  return clients;
}
