import assert from "node:assert/strict";
import test from "node:test";

import { createAlpacaNewsReadService } from "../scripts/read-news.mjs";

const env = { ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "key", ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "secret" };

test("reads every bounded page and emits canonical news evidence without credentials", async () => {
  const requests = [];
  const pages = [
    { news: [{ id: 2, headline: "Later", summary: "s2", author: "a", created_at: "2026-08-20T12:00:00Z", symbols: ["SPY"] }], next_page_token: "next" },
    { news: [{ id: 1, headline: "Earlier", summary: "s1", author: "b", created_at: "2026-08-20T11:00:00Z", symbols: ["BLK", "SPY"], content: "body" }] },
  ];
  const service = createAlpacaNewsReadService(env, {
    now: () => "2026-08-20T13:00:00.000Z",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify(pages.shift()), { status: 200, headers: { "content-type": "application/json", "x-request-id": `request-${requests.length}` } });
    },
    recordObservation: async () => ({ id: "book-news" }),
  });
  const result = await service.readNews({ symbols: ["SPY", "BLK", "SPY"], start: "2026-08-20T00:00:00Z", maximumArticles: 3 });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.origin, "https://data.alpaca.markets");
  assert.equal(requests[1].url.searchParams.get("page_token"), "next");
  assert.deepEqual(result.symbols, ["BLK", "SPY"]);
  assert.deepEqual(result.articles.map((article) => article.providerArticleId), ["1", "2"]);
  assert.equal(result.orderEffect, false);
  assert.equal(result.secretBytesReturned, false);
  assert.equal(JSON.stringify(result).includes('"secret"'), false);
});

test("refuses invalid requests and missing independent records", async () => {
  const service = createAlpacaNewsReadService(env, { fetchImpl: async () => new Response(JSON.stringify({ news: [] })), recordObservation: async () => null });
  await assert.rejects(service.readNews({ symbols: ["bad symbol"], start: "2026-08-20" }), /request-invalid/u);
  await assert.rejects(service.readNews({ symbols: ["SPY"], start: "2026-08-20" }), /book-receipt-required/u);
});
