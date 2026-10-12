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

  assert.equal(result.coverage.paginationComplete, true);
  assert.equal(result.coverage.cappedByMaximumArticles, false);
  assert.equal(result.coverage.distinctArticles, 2);
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

test("a page cap is explicitly incomplete and never represented as exhaustive news", async () => {
  let fetched = 0;
  const service = createAlpacaNewsReadService(env, {
    now: () => "2026-10-12T17:00:00.000Z",
    fetchImpl: async () => {
      fetched++;
      return new Response(JSON.stringify({ news: [{
        id: 5, headline: "First", created_at: "2026-10-12T16:00:00Z", symbols: ["ONDS"],
      }], next_page_token: "more-news-unread" }), { status: 200 });
    },
    recordObservation: async () => ({ id: "book-news" }),
  });
  const r = await service.readNews({ symbols: ["ONDS"], start: "2026-10-12T00:00:00Z", maximumArticles: 1 });
  assert.equal(fetched, 1);
  assert.equal(r.articles.length, 1);
  assert.equal(r.coverage.paginationComplete, false);
  assert.equal(r.coverage.cappedByMaximumArticles, true);
  assert.equal(r.coverage.fetchedRows, 1);
});

test("future queries and revisions are refused instead of entering a historical decision", async () => {
  let fetched = 0;
  const service = createAlpacaNewsReadService(env, {
    now: () => "2026-10-12T17:00:00Z",
    fetchImpl: async () => {
      fetched++;
      return new Response(JSON.stringify({ news: [{
        id: 1, headline: "Postdated revision", created_at: "2026-10-12T16:00:00Z",
        updated_at: "2026-10-13T09:00:00Z", symbols: ["ONDS"],
      }] }), { status: 200 });
    },
    recordObservation: async () => ({ id: "book-news" }),
  });
  await assert.rejects(service.readNews({ symbols: ["ONDS"], start: "2026-10-12T00:00:00Z",
    end: "2026-10-13T00:00:00Z" }), /future-request-window/);
  assert.equal(fetched, 0);
  await assert.rejects(service.readNews({ symbols: ["ONDS"], start: "2026-10-12T00:00:00Z" }),
    /source-clock-invalid/);
});
