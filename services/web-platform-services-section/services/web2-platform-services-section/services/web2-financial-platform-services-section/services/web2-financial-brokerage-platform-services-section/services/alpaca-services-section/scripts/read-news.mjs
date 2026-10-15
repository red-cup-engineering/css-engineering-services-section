import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";

const ORIGIN = "https://data.alpaca.markets";
const symbolPattern = /^[A-Z][A-Z0-9.\/-]{0,14}$/u;
const required = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`);
  return value;
};
const secretKey = /^(?:authorization|api[-_]?key(?:[-_]?id)?|api[-_]?secret(?:[-_]?key)?|secret|token|password|private[-_]?key)$/iu;
const scrub = (value, seen = new Set()) => !value || typeof value !== "object"
  ? value
  : seen.has(value)
    ? null
    : (seen.add(value), Array.isArray(value)
      ? value.map((member) => scrub(member, seen))
      : Object.fromEntries(Object.entries(value)
        .filter(([key]) => !secretKey.test(key))
        .map(([key, member]) => [key, scrub(member, seen)])));
const identified = (value) => Object.freeze({
  id: identifyJsonSemanticContent({ objectKind: "brokerage.alpaca-news-read.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id,
  ...value,
});

const normalizeArticle = (article, includeContent) => Object.freeze({
  providerArticleId: String(article.id),
  headline: String(article.headline ?? ""),
  summary: String(article.summary ?? ""),
  author: String(article.author ?? ""),
  createdAt: new Date(article.created_at).toISOString(),
  updatedAt: new Date(article.updated_at ?? article.created_at).toISOString(),
  url: typeof article.url === "string" ? article.url : null,
  symbols: [...new Set(Array.isArray(article.symbols) ? article.symbols.filter((symbol) => symbolPattern.test(symbol)) : [])].sort(),
  source: typeof article.source === "string" ? article.source : null,
  ...(includeContent ? { content: typeof article.content === "string" ? article.content : "" } : {}),
});

export function createAlpacaNewsReadService(env = process.env, {
  fetchImpl = fetch,
  recordObservation,
  now = () => new Date().toISOString(),
} = {}) {
  const apiKey = required(env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY, "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY");
  const apiSecret = required(env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET, "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET");
  if (typeof fetchImpl !== "function" || typeof recordObservation !== "function") throw new TypeError("news-transport-and-recorder-required");

  const readNews = async ({ symbols, start, end = now(), maximumArticles = 200, includeContent = false } = {}) => {
    const normalizedSymbols = [...new Set(symbols ?? [])].sort();
    if (
      !Array.isArray(symbols) || normalizedSymbols.length < 1 || normalizedSymbols.some((symbol) => !symbolPattern.test(symbol)) ||
      !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) > Date.parse(end) ||
      !Number.isInteger(maximumArticles) || maximumArticles < 1 || maximumArticles > 1_000 ||
      typeof includeContent !== "boolean"
    ) throw new TypeError("alpaca-news-request-invalid");

    const requestStartedAt = now();
    if (!Number.isFinite(Date.parse(requestStartedAt)) ||
        Date.parse(end) > Date.parse(requestStartedAt))
      throw new TypeError("alpaca-news-future-request-window-refused");
    const articles = [];
    const venueRequestIds = [];
    const seenPageTokens = new Set();
    let remainingPageToken = null;
    let pageToken;
    do {
      if (pageToken && seenPageTokens.has(pageToken)) throw new TypeError("alpaca-news-pagination-cycle");
      if (pageToken) seenPageTokens.add(pageToken);
      const url = new URL("/v1beta1/news", ORIGIN);
      url.searchParams.set("symbols", normalizedSymbols.join(","));
      url.searchParams.set("start", new Date(start).toISOString());
      url.searchParams.set("end", new Date(end).toISOString());
      url.searchParams.set("sort", "asc");
      url.searchParams.set("limit", String(Math.min(50, maximumArticles - articles.length)));
      url.searchParams.set("include_content", String(includeContent));
      if (pageToken) url.searchParams.set("page_token", pageToken);
      if (url.origin !== ORIGIN || url.protocol !== "https:") throw new TypeError("news-origin-refused");

      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": apiSecret,
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error(`alpaca-news-refused:${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload?.news)) throw new TypeError("alpaca-news-payload-invalid");
      venueRequestIds.push(response.headers?.get?.("x-request-id") ?? null);
      for (const article of payload.news) {
        if (!article || article.id === undefined || !Number.isFinite(Date.parse(article.created_at))) throw new TypeError("alpaca-news-article-invalid");
        articles.push(normalizeArticle(article, includeContent));
        if (articles.length === maximumArticles) break;
      }
      remainingPageToken = typeof payload.next_page_token === "string" && payload.next_page_token !== ""
        ? payload.next_page_token
        : null;
      pageToken = articles.length < maximumArticles ? remainingPageToken ?? undefined : undefined;
    } while (pageToken);

    const uniqueArticles = [...new Map(articles.map((article) => [article.providerArticleId, article])).values()]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.providerArticleId.localeCompare(right.providerArticleId));
    const observedAt = now();
    if (!Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) < Date.parse(requestStartedAt) ||
        uniqueArticles.some(article => Date.parse(article.createdAt) > Date.parse(observedAt) ||
          Date.parse(article.updatedAt) > Date.parse(observedAt)))
      throw new TypeError("alpaca-news-source-clock-invalid");
    const body = Object.freeze({
      type: "AlpacaNewsObservation",
      version: 1,
      symbols: normalizedSymbols,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      includeContent,
      articles: uniqueArticles,
      venueRequestIds,
      observedAt,
      coverage: Object.freeze({
        paginationComplete: remainingPageToken === null,
        cappedByMaximumArticles: remainingPageToken !== null,
        fetchedRows: articles.length, distinctArticles: uniqueArticles.length,
        requestedMaximumArticles: maximumArticles,
      }),
      requestMethod: "GET",
      orderEffect: false,
      secretBytesReturned: false,
    });
    const receipt = identified(body);
    const independentBooksReceipt = await recordObservation({ type: "alpaca-news-observed", value: receipt, recordedAt: receipt.observedAt });
    if (!independentBooksReceipt?.id && !independentBooksReceipt?.graph && !independentBooksReceipt?.recordReceipt) {
      throw new TypeError("news-independent-book-receipt-required");
    }
    return Object.freeze({ ...receipt, independentBooksReceipt: scrub(independentBooksReceipt) });
  };

  return Object.freeze({ originatingActor: "urn:ame:alpaca-news-read-service", readNews });
}
