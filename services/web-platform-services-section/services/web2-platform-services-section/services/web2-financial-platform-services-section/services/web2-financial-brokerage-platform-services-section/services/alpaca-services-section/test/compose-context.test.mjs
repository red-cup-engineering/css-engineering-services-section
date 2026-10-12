import assert from "node:assert/strict";
import test from "node:test";

import { composeDailyTradingContext } from "../scripts/compose-context.mjs";

const input = {
  principal: "urn:principal:esther-davis",
  asOf: "2026-08-20T13:00:00Z",
  accountObservation: {
    id: "account-observation", type: "PrincipalPaperAccountObservationReceipt", venue: "alpaca-trading-paper", accountAlias: "alpaca-paper:esther",
    observedAt: "2026-08-20T12:30:00Z",
    account: { payload: { equity: "1000", cash: "250", buying_power: "500", status: "ACTIVE", daytrade_count: 1 } },
    positions: { payload: [
      { symbol: "SPY", side: "long", qty: "2", avg_entry_price: "400", market_value: "820", unrealized_pl: "20" },
      { symbol: "BLK", side: "long", qty: "1", avg_entry_price: "900", market_value: "930", unrealized_pl: "30" },
    ] },
  },
  newsObservation: {
    id: "news-observation", type: "AlpacaNewsObservation",
    observedAt: "2026-08-20T12:45:00Z", symbols: ["BLK", "SPY"],
    coverage: { paginationComplete: true }, articles: [
      { providerArticleId: "2", headline: "Macro", summary: "macro", source: "wire", createdAt: "2026-08-20T12:00:00.000Z", url: "https://example.test/2", symbols: ["SPY"] },
      { providerArticleId: "1", headline: "Irrelevant", summary: "other", source: "wire", createdAt: "2026-08-20T11:00:00.000Z", url: "https://example.test/1", symbols: ["AAPL"] },
    ],
  },
  mandate: { id: "mandate-1", type: "PortfolioMandate", maximumGrossExposureFraction: 2 },
};

test("composes one deterministic packet for both agents and human renderers", () => {
  const first = composeDailyTradingContext(input);
  const second = composeDailyTradingContext(input);
  assert.equal(first.id, second.id);
  assert.deepEqual(first.heldSymbols, ["BLK", "SPY"]);
  assert.equal(first.capital.grossExposure, 1750);
  assert.equal(first.capital.grossExposureFraction, 1.75);
  assert.deepEqual(first.news.bySymbol, { BLK: [], SPY: ["2"] });
  assert.equal(first.news.articles.length, 1);
  assert.equal(first.orderEffect, false);
  assert.deepEqual(first.consumers, ["strategy-agent", "risk-agent", "execution-planner", "human-report-renderer"]);
});

test("refuses malformed evidence instead of silently inventing capital state", () => {
  assert.throws(() => composeDailyTradingContext({ ...input, accountObservation: { ...input.accountObservation, account: { payload: { equity: "unknown", cash: "250" } } } }), /account-equity/u);
  assert.throws(() => composeDailyTradingContext({ ...input, newsObservation: { type: "SomethingElse" } }), /news-observation-required/u);
});

test("accepts the existing principal reader's live-or-paper account receipt", () => {
  const result = composeDailyTradingContext({
    ...input,
    accountObservation: { ...input.accountObservation, type: "PrincipalAlpacaAccountObservationReceipt", accountAlias: undefined, accountReference: "alpaca:esther" },
  });
  assert.equal(result.accountReference, "alpaca:esther");
});

test("research extends beyond held positions without inventing coverage for unqueried issuers", () => {
  const context = composeDailyTradingContext({ ...input, researchUniverse: ["AAPL"] });
  assert.deepEqual(context.heldSymbols, ["BLK", "SPY"]);
  assert.deepEqual(context.researchUniverse, ["AAPL"]);
  assert.deepEqual(context.news.researchBySymbol.AAPL, ["1"]);
  assert.equal(context.news.coverageBySymbol.AAPL, "unknown");
  assert.deepEqual(context.news.bySymbol.SPY, ["2"]);
  assert.equal(context.news.articles.length, 2);
  assert.equal(context.orderEffect, false);
});

test("source-declared research universe and partial pagination are separate facts", () => {
  const context = composeDailyTradingContext({ ...input, newsObservation: {
    ...input.newsObservation, symbols: ["BLK", "SPY", "AAPL"],
    coverage: { paginationComplete: false },
  } });
  assert.deepEqual(context.researchUniverse, ["AAPL", "BLK", "SPY"]);
  assert.deepEqual(context.news.researchBySymbol.AAPL, ["1"]);
  assert.equal(context.news.paginationComplete, false);
  assert.equal(context.news.coverageBySymbol.AAPL, "partial-or-unknown");
});

test("historical context refuses future account reads, article revisions and news reads", () => {
  assert.throws(() => composeDailyTradingContext({ ...input, accountObservation: {
    ...input.accountObservation, observedAt: "2026-08-21T00:00:00Z",
  } }), /point-in-time-account-and-news-observations-required/);
  assert.throws(() => composeDailyTradingContext({ ...input, newsObservation: {
    ...input.newsObservation, observedAt: "2026-08-21T00:00:00Z",
  } }), /point-in-time-account-and-news-observations-required/);
  assert.throws(() => composeDailyTradingContext({ ...input, newsObservation: {
    ...input.newsObservation, articles: [{ ...input.newsObservation.articles[0],
      updatedAt: "2026-08-21T00:00:00Z" }],
  } }), /post-decision-news-article-refused/);
});

test("invalid research universe fails before being described as no news", () => {
  for (const researchUniverse of ["AAPL", ["bad symbol"], Array(257).fill("SPY")])
    assert.throws(() => composeDailyTradingContext({ ...input, researchUniverse }), /bounded-alpaca-research-universe-required/);
});
