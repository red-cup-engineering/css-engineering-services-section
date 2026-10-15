import assert from "node:assert/strict";
import test from "node:test";

import { createAlpacaHistoricalBarsService } from "../scripts/historical-bars.mjs";
import { evaluateBlkAccumulationStrategy } from "@red-cup-engineering/obsmetrologia-blk-accumulation-strategy-service";

test("an independently recorded Alpaca observation feeds the BLK strategy without identity loss", async () => {
  const start = Date.parse("2098-01-01T00:00:00.000Z");
  const bars = (base, slope) => Array.from({ length: 125 }, (_, index) => ({
    t: new Date(start + index * 86_400_000).toISOString(), o: base + index * slope, h: base + index * slope, l: base + index * slope, c: base + index * slope,
    v: 1_000 + index, n: 100 + index, vw: base + index * slope,
  }));
  const service = createAlpacaHistoricalBarsService({
    ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "test-key",
    ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "test-secret",
  }, {
    fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => "request:test" }, json: async () => ({ bars: { BLK: bars(50, 0.2), SPY: bars(400, 0.4) } }) }),
    recordObservation: async ({ value }) => ({ id: `book:${value.id}` }),
    now: () => "2098-05-06T00:00:00.000Z",
  });
  const observation = await service.readDailyBars({ start: "2098-01-01T00:00:00.000Z", end: "2098-05-06T00:00:00.000Z" });
  const reading = evaluateBlkAccumulationStrategy({
    blkBars: observation.bars.BLK, spyBars: observation.bars.SPY, asOf: observation.end,
    cash: 1_000, scheduledContribution: 100, marketDataObservation: observation.id,
  });
  assert.equal(reading.marketDataObservation, observation.id);
  assert.equal(reading.orderEffect, false);
  assert.equal(JSON.stringify(observation).includes("test-secret"), false);
});
