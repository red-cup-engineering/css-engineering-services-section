// prove-interpolation-brackets — the ADDITIVE `sampleBrackets()` extension to InterpolationBuffer
// (client.mjs): exposes the same two raw bracketing samples + alpha `sample()` already computes
// internally, without changing `sample()`'s own behavior at all — the composition seam
// `render-loop.mjs` is built on. See client.mjs's header comment on `sampleBrackets` for the design
// rationale (tween.mjs must not re-interpolate position; it needs the raw brackets to ease
// presentation fields using the SAME alpha).

import { ok, eq, done } from "./_harness.mjs";
import { createInterpolationBuffer } from "../src/client.mjs";
import { test } from "node:test";

test("prove-interpolation-brackets", async () => {

// === sample()'s own behavior is completely unaffected by sampleBrackets existing ==================
{
  let now = 1000;
  const buffer = createInterpolationBuffer({ delayMs: 0, now: () => now });
  buffer.push({ type: "full", tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, 1000);
  buffer.push({ type: "full", tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] }, 1100);
  now = 1050;
  const sampled = buffer.sample();
  eq(sampled[0].x, 5, "sample() still linearly interpolates position exactly as before");
}

// === sampleBrackets: "before" the first sample =====================================================
{
  const buffer = createInterpolationBuffer({ delayMs: 0 });
  buffer.push({ type: "full", tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, 1000);
  const b = buffer.sampleBrackets(500);
  eq(b.mode, "before", "before the first recorded sample, mode is \"before\"");
  eq(b.alpha, 0, "alpha is 0 before the first sample");
  eq(b.left.tick, 1, "left/right both name the first tick when there is nothing earlier");
}

// === sampleBrackets: "between" two samples, alpha matches sample()'s own math ======================
{
  const buffer = createInterpolationBuffer({ delayMs: 0 });
  buffer.push({ type: "full", tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, 1000);
  buffer.push({ type: "full", tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] }, 1100);
  const b = buffer.sampleBrackets(1025);
  eq(b.mode, "between", "between two samples, mode is \"between\"");
  eq(b.alpha, 0.25, "alpha matches the fraction of the way between the two sample timestamps");
  eq(b.left.tick, 1, "left names the earlier tick");
  eq(b.right.tick, 2, "right names the later tick");
  eq(b.left.entities[0].x, 0, "left carries the RAW (uninterpolated) entity state at its own tick");
  eq(b.right.entities[0].x, 10, "right carries the RAW (uninterpolated) entity state at its own tick");

  // cross-check against sample()'s own linear interpolation: manually blending left/right by alpha
  // must equal what sample() computes internally, at the SAME render time.
  const sampled = buffer.sample(1025);
  const manual = b.left.entities[0].x + (b.right.entities[0].x - b.left.entities[0].x) * b.alpha;
  eq(sampled[0].x, manual, "sampleBrackets' alpha agrees exactly with sample()'s own internal interpolation");
}

// === sampleBrackets: "after" the last sample, no extrapolation configured =========================
{
  const buffer = createInterpolationBuffer({ delayMs: 0, extrapolateMs: 0 });
  buffer.push({ type: "full", tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, 1000);
  buffer.push({ type: "full", tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] }, 1100);
  const b = buffer.sampleBrackets(5000);
  eq(b.mode, "after", "well past the last sample with no extrapolation, mode is \"after\"");
  eq(b.alpha, 1, "alpha is 1 when frozen at the last sample");
  eq(b.left.tick, 2, "left/right both name the last tick when frozen there");
}

// === sampleBrackets: "extrapolate" mode, alpha can exceed 1 ========================================
{
  const buffer = createInterpolationBuffer({ delayMs: 0, extrapolateMs: 200 });
  buffer.push({ type: "full", tick: 1, entities: [{ id: "e1", x: 0, y: 0 }] }, 1000);
  buffer.push({ type: "full", tick: 2, entities: [{ id: "e1", x: 10, y: 0 }] }, 1100);
  const b = buffer.sampleBrackets(1150);
  eq(b.mode, "extrapolate", "past the last sample, within extrapolateMs, mode is \"extrapolate\"");
  ok(b.alpha > 1, "extrapolating alpha exceeds 1");
}

// === no samples at all ==============================================================================
{
  const buffer = createInterpolationBuffer({ delayMs: 0 });
  eq(buffer.sampleBrackets(1000), null, "with nothing pushed yet, sampleBrackets returns null");
}

done("prove-interpolation-brackets");
});
