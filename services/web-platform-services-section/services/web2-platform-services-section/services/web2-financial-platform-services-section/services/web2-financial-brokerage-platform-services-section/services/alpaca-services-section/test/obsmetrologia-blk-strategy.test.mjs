import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBlkAccumulationStrategy,
  strategyInternals,
} from "../scripts/strategy.mjs";

const START = Date.parse("2026-01-01T21:00:00.000Z");
const bars = (dailyRate, count = 130) => Array.from({ length: count }, (_, index) => ({
  at: new Date(START + index * 86_400_000).toISOString(),
  close: 100 * Math.exp(dailyRate * index),
}));

test("cover-nerve charge discounts cyclic duplication instead of counting it as independent consensus", () => {
  const tree = [
    { horizon: 5, bullish: ["absolute"], bearish: [] },
    { horizon: 20, bullish: ["absolute", "relative"], bearish: [] },
    { horizon: 60, bullish: ["relative"], bearish: [] },
  ];
  const treeNerve = strategyInternals.nerve(tree, "bullish");
  assert.deepEqual(
    { h0: treeNerve.h0, h1: treeNerve.h1, net: treeNerve.netCharge },
    { h0: 1, h1: 0, net: 1 },
  );
  const cyclic = strategyInternals.nerve([
    ...tree,
    { horizon: 120, bullish: ["absolute", "relative"], bearish: [] },
  ], "bullish");
  assert.equal(cyclic.h0, 1);
  assert.equal(cyclic.h1, 2);
  assert.equal(cyclic.netCharge, -1);
});

test("BLK strategy is causal, SPY-relative, long-only, and produces no venue effect", () => {
  const reading = evaluateBlkAccumulationStrategy({
    blkBars: bars(0.004),
    spyBars: bars(0.001),
    asOf: "2026-07-22T23:00:00.000Z",
    cash: 100,
    scheduledContribution: 10,
  });
  assert.equal(reading.instrument, "BLK");
  assert.equal(reading.benchmark, "SPY");
  assert.equal(reading.relativeReturn20 > 0, true);
  assert.equal(reading.relativeReturn60 > 0, true);
  assert.equal(reading.disposition, "accumulate");
  assert.equal(reading.proposedNotional, 10);
  assert.equal(reading.orderEffect, false);
  assert.equal(reading.alphaEstablished, false);
});

test("future, unordered, and insufficient bars are refused", () => {
  const blk = bars(0.001);
  const spy = bars(0.001);
  assert.throws(() => evaluateBlkAccumulationStrategy({
    blkBars: blk,
    spyBars: spy,
    asOf: "2026-01-02T00:00:00.000Z",
    cash: 100,
  }), /bar-invalid/u);
  assert.throws(() => evaluateBlkAccumulationStrategy({
    blkBars: blk.slice(0, 120),
    spyBars: spy.slice(0, 120),
    asOf: "2026-07-22T23:00:00.000Z",
    cash: 100,
  }), /history-insufficient/u);
});
