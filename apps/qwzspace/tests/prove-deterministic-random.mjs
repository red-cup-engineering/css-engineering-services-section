// prove-deterministic-random — the one seeded-noise primitive particles.mjs/camera.mjs both build on:
// a pure map from (seed, index[, salt]) to a number, never a stateful stream.

import { ok, eq, done } from "./_harness.mjs";
import { hash32, rand01, randRange, smoothNoise1D } from "../src/deterministic-random.mjs";
import { test } from "node:test";

test("prove-deterministic-random", async () => {

// determinism: same inputs, identical output, every call, any order.
eq(hash32(1, 2, 3), hash32(1, 2, 3), "hash32 is a pure function of its arguments");
eq(rand01(5, 9), rand01(5, 9), "rand01 is a pure function of its arguments");
eq(smoothNoise1D(7, 2.5), smoothNoise1D(7, 2.5), "smoothNoise1D is a pure function of its arguments");

// range and spread sanity — not vacuously constant.
{
  const values = new Set();
  for (let i = 0; i < 50; i++) values.add(rand01(1, i));
  ok(values.size > 40, "rand01 spreads across its index argument, not a constant");
  for (const v of values) ok(v >= 0 && v < 1, "rand01 always stays within [0, 1)");
}
{
  for (let i = 0; i < 20; i++) {
    const v = randRange(3, i, 10, 20);
    ok(v >= 10 && v < 20, "randRange stays within [min, max)");
  }
}

// different seeds/indices/salts genuinely diverge (the determinism proof above is not vacuous).
ok(hash32(1, 1) !== hash32(2, 1), "a different seed changes the hash");
ok(hash32(1, 1) !== hash32(1, 2), "a different index changes the hash");
ok(hash32(1, 1, 1) !== hash32(1, 1, 2), "a different salt changes the hash");

// smoothNoise1D stays bounded (a sum of two unit sine waves with amplitudes 0.6 + 0.4).
for (let t = 0; t < 20; t += 0.7) {
  const v = smoothNoise1D(11, t);
  ok(v >= -1.0001 && v <= 1.0001, "smoothNoise1D stays within [-1, 1]");
}

done("prove-deterministic-random");
});
