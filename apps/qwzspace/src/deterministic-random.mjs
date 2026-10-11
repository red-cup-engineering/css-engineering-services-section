// deterministic-random — the one seeded-noise primitive `particles.mjs` and `camera.mjs` both need,
// factored out so there is exactly ONE hash function to get right instead of two copies drifting
// apart. This is NOT a general-purpose RNG stream (a stream is stateful — advance-by-one-call — which
// is exactly what makes a naive "particle system" unreplayable: scrubbing a replay backward would
// require rewinding the stream). Every function here is a pure map from (seed, index[, salt]) to a
// number, callable in ANY order, any number of times, always agreeing with itself — the same
// discipline `project()` documents at its own top: no Math.random, no wall clock, nothing but the
// arguments given.

function toInt32(n) {
  return n | 0;
}

// hash32 — a small, fast, deterministic integer hash (a xorshift/multiply mix). Bitwise ops on
// int32 are exact in the JS spec on every engine, so this produces the identical bit pattern on any
// machine — the same "no floating-point drift across platforms" guarantee `project()`'s stable sort
// exists to protect, extended to noise instead of ordering.
export function hash32(seed, index, salt = 0) {
  let h = toInt32(seed) ^ toInt32(index * 0x9e3779b1);
  h ^= toInt32(salt * 0x85ebca6b);
  h = toInt32(Math.imul(h ^ (h >>> 16), 0x45d9f3b));
  h = toInt32(Math.imul(h ^ (h >>> 16), 0x45d9f3b));
  h = toInt32(h ^ (h >>> 16));
  return h >>> 0; // unsigned, so callers get a clean [0, 2^32) range
}

// rand01 — hash32, rescaled to a float in [0, 1). Deterministic; NOT cryptographically anything —
// this is presentation noise (which particle drifts which way), not game-affecting randomness (that
// stays the game's own domain concern, folded through its own seeded intents).
export function rand01(seed, index, salt = 0) {
  return hash32(seed, index, salt) / 4294967296;
}

// randRange — rand01 rescaled into [min, max).
export function randRange(seed, index, min, max, salt = 0) {
  return min + rand01(seed, index, salt) * (max - min);
}

// smoothNoise1D — a small sum of two phase/frequency-shifted sine waves, both derived from the seed
// via hash32. Reads as "noise" (no obvious single-frequency wobble) while remaining a pure, smooth,
// closed-form function of `t` — evaluable at ANY `t` directly (no integration, no per-frame state),
// which is what lets a seeded screen-shake be scrubbed to an arbitrary tick and agree with a
// frame-by-frame playback of the same effect.
export function smoothNoise1D(seed, t, salt = 0) {
  const f1 = 0.6 + rand01(seed, 0, salt) * 1.7;
  const f2 = 1.3 + rand01(seed, 1, salt) * 2.9;
  const p1 = rand01(seed, 2, salt) * Math.PI * 2;
  const p2 = rand01(seed, 3, salt) * Math.PI * 2;
  return 0.6 * Math.sin(t * f1 + p1) + 0.4 * Math.sin(t * f2 + p2);
}
