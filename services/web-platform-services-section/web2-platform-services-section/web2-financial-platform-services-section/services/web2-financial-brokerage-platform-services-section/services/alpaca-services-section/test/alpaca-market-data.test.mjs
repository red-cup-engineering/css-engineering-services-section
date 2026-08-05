import assert from "node:assert/strict";
import test from "node:test";

import {
  createAlpacaHistoricalBarsService,
} from "../services/alpaca-market-data-read-service/src/historical-bars.mjs";

test("historical BLK/SPY provider is exact-origin GET-only, scrubbed, and independently recorded", async () => {
  let request;
  let recorded;
  const service = createAlpacaHistoricalBarsService({
    ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "private-key",
    ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "private-secret",
  }, {
    now: () => "2026-07-22T23:00:00.000Z",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => name === "x-request-id" ? "market-request-1" : null },
        json: async () => ({
          bars: {
            BLK: [{ t: "2026-07-21T04:00:00Z", c: 1110, v: 1, n: 1, vw: 1110 }],
            SPY: [{ t: "2026-07-21T04:00:00Z", c: 640, v: 1, n: 1, vw: 640 }],
          },
        }),
      };
    },
    recordObservation: async (event) => {
      recorded = event;
      return { id: "book:market-data" };
    },
  });
  const receipt = await service.readDailyBars({
    start: "2026-07-01T00:00:00.000Z",
    end: "2026-07-22T00:00:00.000Z",
  });
  assert.equal(request.url.origin, "https://data.alpaca.markets");
  assert.equal(request.url.pathname, "/v2/stocks/bars");
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers["APCA-API-KEY-ID"], "private-key");
  assert.equal(receipt.secretBytesReturned, false);
  assert.equal(JSON.stringify(receipt).includes("private-key"), false);
  assert.equal(JSON.stringify(receipt).includes("private-secret"), false);
  assert.equal(recorded.value.id, receipt.id);
  assert.equal(receipt.orderEffect, false);
});

test("historical provider refuses malformed time, symbols, and unsupported feeds before transport", async () => {
  let calls = 0;
  const service = createAlpacaHistoricalBarsService({
    ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "key",
    ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "secret",
  }, {
    fetchImpl: async () => { calls += 1; },
    recordObservation: async () => ({ id: "book" }),
  });
  for (const request of [
    { symbols: ["BLK;DROP"], start: "2026-01-01", end: "2026-02-01" },
    { symbols: ["BLK"], start: "later", end: "2026-02-01" },
    { symbols: ["BLK"], start: "2026-01-01", end: "2026-02-01", feed: "otc" },
  ]) {
    await assert.rejects(() => service.readDailyBars(request), /request-invalid/u);
  }
  assert.equal(calls, 0);
});
