import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label}-must-be-finite`);
  return number;
};
const required = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`);
  return value;
};
const identify = (value) => Object.freeze({
  id: identifyJsonSemanticContent({ objectKind: "brokerage.daily-trading-context.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id,
  ...value,
});

export function composeDailyTradingContext({ principal, accountObservation, newsObservation, mandate, asOf, researchUniverse = null } = {}) {
  required(principal, "principal");
  if (!Number.isFinite(Date.parse(asOf))) throw new TypeError("as-of-invalid");
  if (!["PrincipalPaperAccountObservationReceipt", "PrincipalAlpacaAccountObservationReceipt"].includes(accountObservation?.type)) throw new TypeError("account-observation-required");
  if (newsObservation?.type !== "AlpacaNewsObservation") throw new TypeError("news-observation-required");
  const observedAt = Date.parse(asOf);
  if (!Number.isFinite(Date.parse(accountObservation?.observedAt)) ||
      !Number.isFinite(Date.parse(newsObservation?.observedAt)) ||
      Date.parse(accountObservation.observedAt) > observedAt ||
      Date.parse(newsObservation.observedAt) > observedAt)
    throw new TypeError("point-in-time-account-and-news-observations-required");
  if (!Array.isArray(newsObservation.articles) ||
      newsObservation.articles.some(article =>
        !Array.isArray(article?.symbols) || !Number.isFinite(Date.parse(article.createdAt)) ||
        Date.parse(article.createdAt) > observedAt ||
        (article.updatedAt !== undefined && (!Number.isFinite(Date.parse(article.updatedAt)) ||
          Date.parse(article.updatedAt) > observedAt))))
    throw new TypeError("post-decision-news-article-refused");
  if (!mandate || typeof mandate !== "object" || typeof mandate.type !== "string") throw new TypeError("mandate-required");

  const account = accountObservation.account?.payload;
  const rawPositions = accountObservation.positions?.payload;
  if (!account || !Array.isArray(rawPositions)) throw new TypeError("account-observation-payload-invalid");
  const equity = finite(account.equity, "account-equity");
  const cash = finite(account.cash, "account-cash");
  const positions = rawPositions.map((position) => {
    const marketValue = finite(position.market_value, `${position.symbol}-market-value`);
    return Object.freeze({
      symbol: required(position.symbol, "position-symbol"),
      side: position.side === "short" ? "short" : "long",
      quantity: finite(position.qty, `${position.symbol}-quantity`),
      averageEntryPrice: finite(position.avg_entry_price, `${position.symbol}-average-entry-price`),
      marketValue,
      unrealizedProfitLoss: finite(position.unrealized_pl ?? 0, `${position.symbol}-unrealized-profit-loss`),
      portfolioWeight: equity === 0 ? 0 : marketValue / equity,
    });
  }).sort((left, right) => left.symbol.localeCompare(right.symbol));
  const heldSymbols = positions.map(({ symbol }) => symbol);
  const held = new Set(heldSymbols);
  // The observed news request's universe includes research candidates that
  // are NOT yet held. A caller may narrow it, but every missing source scope
  // must remain unknown, never "no news".
  const candidates = researchUniverse === null ? (newsObservation.symbols ?? []) : researchUniverse;
  if (!Array.isArray(candidates) || candidates.length > 256 ||
      candidates.some(symbol => typeof symbol !== "string" ||
        !/^[A-Z][A-Z0-9.]{0,9}$/u.test(symbol)))
    throw new TypeError("bounded-alpaca-research-universe-required");
  const researchSymbols = [...new Set(candidates)].sort();
  const relevant = new Set([...held, ...researchSymbols]);
  const requested = Array.isArray(newsObservation.symbols) ? new Set(newsObservation.symbols) : null;
  const coverageBySymbol = Object.fromEntries([...relevant].sort().map(symbol => [
    symbol, !requested || !requested.has(symbol) ? "unknown" :
      newsObservation.coverage?.paginationComplete === true ? "complete" : "partial-or-unknown",
  ]));
  const articles = newsObservation.articles
    .filter((article) => article.symbols.some((symbol) => relevant.has(symbol)))
    .map((article) => Object.freeze({
      article: article.providerArticleId,
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      createdAt: article.createdAt,
      url: article.url,
      heldSymbols: article.symbols.filter((symbol) => held.has(symbol)).sort(),
      researchSymbols: article.symbols.filter((symbol) => researchSymbols.includes(symbol)).sort(),
    }))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.article.localeCompare(right.article));
  const newsBySymbol = Object.freeze(Object.fromEntries(heldSymbols.map((symbol) => [
    symbol,
    articles.filter((article) => article.heldSymbols.includes(symbol)).map((article) => article.article),
  ])));
  const researchBySymbol = Object.freeze(Object.fromEntries(researchSymbols.map(symbol => [
    symbol, articles.filter(article => article.researchSymbols.includes(symbol)).map(article => article.article),
  ])));
  const grossExposure = positions.reduce((total, position) => total + Math.abs(position.marketValue), 0);
  const netExposure = positions.reduce((total, position) => total + position.marketValue, 0);
  const body = Object.freeze({
    type: "DailyTradingContextPacket",
    version: 1,
    principal,
    venue: accountObservation.venue,
    accountReference: accountObservation.accountReference ?? accountObservation.accountAlias,
    asOf: new Date(asOf).toISOString(),
    evidence: Object.freeze({ account: accountObservation.id, news: newsObservation.id, mandate: mandate.id ?? null }),
    capital: Object.freeze({
      equity,
      cash,
      buyingPower: finite(account.buying_power ?? cash, "account-buying-power"),
      grossExposure,
      netExposure,
      grossExposureFraction: equity === 0 ? 0 : grossExposure / equity,
      netExposureFraction: equity === 0 ? 0 : netExposure / equity,
    }),
    accountState: Object.freeze({
      status: account.status ?? null,
      tradingBlocked: Boolean(account.trading_blocked),
      accountBlocked: Boolean(account.account_blocked),
      patternDayTrader: Boolean(account.pattern_day_trader),
      daytradeCount: Number.isFinite(Number(account.daytrade_count)) ? Number(account.daytrade_count) : null,
    }),
    heldSymbols,
    researchUniverse: Object.freeze(researchSymbols),
    positions,
    news: Object.freeze({ articles, bySymbol: newsBySymbol, researchBySymbol,
      coverageBySymbol: Object.freeze(coverageBySymbol),
      paginationComplete: newsObservation.coverage?.paginationComplete ?? null }),
    mandate,
    consumers: Object.freeze(["strategy-agent", "risk-agent", "execution-planner", "human-report-renderer"]),
    orderEffect: false,
  });
  return identify(body);
}
