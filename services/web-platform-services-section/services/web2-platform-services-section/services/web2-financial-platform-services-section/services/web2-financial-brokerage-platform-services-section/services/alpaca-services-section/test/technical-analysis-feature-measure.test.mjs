import assert from "node:assert/strict";
import test from "node:test";

import { measureTechnicalAnalysisFeatures } from "../scripts/technical-analysis-feature-measure.mjs";

const bars = Array.from({ length: 100 }, (_, index) => {
  const close = 100 + index * 0.4 + Math.sin(index / 3);
  return { close, high: close + 1, low: close - 1, volume: 1_000 + index * 10 };
});

test("measures finite causal TA features from the prefix ending at index", () => {
  const input = { closes: bars.map((bar) => bar.close), highs: bars.map((bar) => bar.high), lows: bars.map((bar) => bar.low), volumes: bars.map((bar) => bar.volume), index: 80 };
  const first = measureTechnicalAnalysisFeatures(input);
  const futureChanged = bars.map((bar, index) => index > 80 ? { ...bar, close: 1_000_000, high: 1_000_001, low: 999_999, volume: 9_000_000 } : bar);
  const second = measureTechnicalAnalysisFeatures({ closes: futureChanged.map((bar) => bar.close), highs: futureChanged.map((bar) => bar.high), lows: futureChanged.map((bar) => bar.low), volumes: futureChanged.map((bar) => bar.volume), index: 80 });
  assert.deepEqual(first, second);
  assert.equal(first.futureObservationsUsed, false);
  assert.equal(Object.keys(first.features).length, 8);
  assert.ok(Object.values(first.features).every(Number.isFinite));
  assert.ok(first.features.rsi14Centered > 0);
});

test("refuses insufficient and impossible OHLC histories", () => {
  assert.throws(() => measureTechnicalAnalysisFeatures({ closes: [1], highs: [2], lows: [0], volumes: [1], index: 0 }), /index-invalid/u);
  const malformed = bars.map((bar) => ({ ...bar }));
  malformed[40].low = malformed[40].high + 1;
  assert.throws(() => measureTechnicalAnalysisFeatures({ closes: malformed.map((bar) => bar.close), highs: malformed.map((bar) => bar.high), lows: malformed.map((bar) => bar.low), volumes: malformed.map((bar) => bar.volume), index: 80 }), /ohlc-domain-invalid/u);
});
