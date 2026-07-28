// @red-cup-engineering/syndication-codecs â€” syndication-format codecs.
//
// Syndication is the distribution packaging of content: richer than bare
// content (carries temporal and provenance metadata) but less constrained
// than news (IPTC/NINJS). RSS, Atom, arXiv Atom, and JSON Feed are all
// syndication formats. This lib is the ONE home for parsing and fetching
// those formats. It has no knowledge of content or news internals.
//
// Moved from apps/content-computer/src/source.mts (2026-06-13).
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const SyndicationItemSchema = { $id: "producing-content/syndication/item", title: "SyndicationItem", additionalProperties: false, type: "object", required: ["kind", "url", "title"], properties: { kind: { const: "producing-content.syndication-item" }, id: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, summary: { type: "string" }, authors: { type: "array", items: { minLength: 1, type: "string" } }, published: { minLength: 1, type: "string" }, categories: { type: "array", items: { minLength: 1, type: "string" } }, source: { minLength: 1, type: "string" } } } as const;

export const SyndicationIngestSchema = { $id: "producing-content/syndication/ingest", title: "SyndicationIngest", additionalProperties: false, type: "object", required: ["kind", "subject", "items", "sourceSubjects", "writes"], properties: { kind: { const: "producing-content.syndication-ingest" }, subject: { minLength: 1, type: "string" }, items: { type: "array", items: SyndicationItemSchema }, sourceSubjects: { type: "array", items: { minLength: 1, type: "string" } }, writes: { type: "array", items: {} } } } as const;

export const syndicationItemCarrier = carrierFrom(SyndicationItemSchema);

export const syndicationIngestCarrier = carrierFrom(SyndicationIngestSchema);

/**
 * The fetch implementation type: the signature of the global `fetch`, used so
 * callers can inject a substitute for hermetic testing.
 */
export type FetchLike = typeof fetch;

/** One decoded syndication item, in the common record every adapter normalizes to. */
export type SyndicationItem = Readonly<{
  kind: "producing-content.syndication-item";
  id?: string;
  url: string;
  title: string;
  summary?: string;
  authors?: readonly string[];
  published?: string;
  categories?: readonly string[];
  source?: string;
}>;

export type SyndicationItemCarrier = FromSchema<typeof SyndicationItemSchema>;

/** One configured syndication intake: which adapter, pointed where, bounded how. */
export type SyndicationConfig = Readonly<{
  adapter: string;
  query?: string;
  url?: string;
  max?: number;
  sourcePrefix?: string;
  sortBy?: string;
  sortOrder?: string;
  retries?: number;
}>;

/** The fetch morphism for one syndication format (rss, arxiv, ...). */
export type SyndicationAdapter = Readonly<{
  type: string;
  fetch: (params: SyndicationConfig, io?: { fetchImpl?: FetchLike }) => Promise<readonly SyndicationItem[]>;
}>;

/**
 * The result of an intake run. `Write` is the consumer's write-plan type;
 * this lib fixes no claim vocabulary of its own.
 */
export type SyndicationIngest<Write = unknown> = Readonly<{
  kind: "producing-content.syndication-ingest";
  subject: string;
  items: readonly SyndicationItem[];
  sourceSubjects: readonly string[];
  writes: readonly Write[];
}>;

export function syndicationItem(input: Omit<SyndicationItem, "kind"> | SyndicationItem): SyndicationItem {
  const id = optionalString(input.id);
  const summary = optionalString(input.summary);
  const published = optionalString(input.published);
  const source = optionalString(input.source);
  const authors = optionalStrings(input.authors);
  const categories = optionalStrings(input.categories);
  return syndicationItemCarrier.assert({
    kind: "producing-content.syndication-item" as const,
    ...(id === undefined ? {} : { id }),
    url: input.url,
    title: input.title,
    ...(summary === undefined ? {} : { summary }),
    ...(authors === undefined ? {} : { authors }),
    ...(published === undefined ? {} : { published }),
    ...(categories === undefined ? {} : { categories }),
    ...(source === undefined ? {} : { source }),
  }, "syndication item") as SyndicationItem;
}

export function syndicationIngest<Write = unknown>(input: Omit<SyndicationIngest<Write>, "kind"> | SyndicationIngest<Write>): SyndicationIngest<Write> {
  return syndicationIngestCarrier.assert({
    kind: "producing-content.syndication-ingest" as const,
    subject: input.subject,
    items: input.items.map((item) => syndicationItem(item)),
    sourceSubjects: [...input.sourceSubjects],
    writes: [...input.writes],
  }, "syndication ingest") as SyndicationIngest<Write>;
}

export function syndicationItemTerm(input: SyndicationItem): Tm {
  return carrierToTerm(jsonResource(syndicationItemCarrier.assert(input), "syndication item"));
}

export function syndicationIngestTerm(input: SyndicationIngest): Tm {
  return carrierToTerm(jsonResource(syndicationIngestCarrier.assert(input), "syndication ingest"));
}

// ---------- XML helpers ----------

const ARXIV_API = "http://export.arxiv.org/api/query";
const XML_ENTITIES = Object.freeze({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } satisfies Record<string, string>);

function decodeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name: keyof typeof XML_ENTITIES) => XML_ENTITIES[name]);
}

function removeCdata(value: unknown): string {
  return String(value ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function tidyXmlText(value: unknown): string {
  return decodeXml(removeCdata(value)).replace(/\s+/g, " ").trim();
}

function stripXmlTags(value: unknown): string {
  return decodeXml(removeCdata(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function xmlTag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match?.[1] ?? "";
}

function xmlAttr(block: string, name: string, key: string): string {
  const match = block.match(new RegExp(`<${name}\\b[^>]*\\b${key}="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function optionalStrings(values: readonly string[] | undefined): readonly string[] | undefined {
  if (values === undefined) return undefined;
  const cleaned = values.filter((value) => value.trim() !== "");
  return cleaned.length === 0 ? undefined : Object.freeze(cleaned);
}

// ---------- arXiv ----------

/** The arXiv API query URL for a configured intake. */
export function arxivQueryUrl({ query, max = 10, sortBy = "submittedDate", sortOrder = "descending" }: Pick<SyndicationConfig, "query" | "max" | "sortBy" | "sortOrder">): string {
  if (!query) throw new TypeError("arxiv source needs a query");
  const params = new URLSearchParams({
    search_query: query,
    start: "0",
    max_results: String(max),
    sortBy,
    sortOrder,
  });
  return `${ARXIV_API}?${params}`;
}

/** Parse the arXiv Atom dialect into syndication items. Pure. */
export function parseArxivAtom(xml: string): readonly SyndicationItem[] {
  const entries = String(xml).split("<entry>").slice(1).map((entry) => entry.split("</entry>")[0] ?? "");
  return Object.freeze(entries.map((entry) => {
    const id = tidyXmlText(xmlTag(entry, "id"));
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((match) => tidyXmlText(match[1]));
    const categories = [...entry.matchAll(/<category[^>]*\bterm="([^"]+)"/g)].map((match) => match[1] ?? "").filter(Boolean);
    return syndicationItem({
      id,
      url: id,
      title: tidyXmlText(xmlTag(entry, "title")),
      summary: tidyXmlText(xmlTag(entry, "summary")),
      authors: Object.freeze(authors),
      published: tidyXmlText(xmlTag(entry, "published")),
      categories: Object.freeze(categories),
      source: "arxiv",
    });
  }).filter((item) => item.title && item.url));
}

// ---------- fetch with retry ----------

/**
 * Options for fetchText: an optional injected fetch implementation, the retry
 * count for 429/5xx responses, and an injectable backoff to delay between
 * retries.
 */
export type FetchTextOptions = Readonly<{
  fetchImpl?: FetchLike;
  retries?: number;
  /** Backoff between retries; defaults to exponential sleep. Injectable so
   *  tests run hermetically without waiting on real time. */
  backoff?: (attempt: number) => Promise<void>;
}>;

/** Fetch a URL's body as text, retrying 429/5xx with exponential backoff. */
export async function fetchText(url: string, { fetchImpl = fetch, retries = 4, backoff = (attempt) => sleep(1000 * 2 ** attempt) }: FetchTextOptions = {}): Promise<string> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(url);
    if (response.ok) return await response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await backoff(attempt);
      continue;
    }
    throw new Error(`fetch failed: ${response.status} for ${url}`);
  }
}

/** Fetch and parse one arXiv intake. */
export async function fetchArxiv(params: Pick<SyndicationConfig, "query" | "max" | "sortBy" | "sortOrder" | "retries">, io: { fetchImpl?: FetchLike } = {}): Promise<readonly SyndicationItem[]> {
  const fetchOptions: { fetchImpl?: FetchLike; retries?: number } = {};
  if (io.fetchImpl) fetchOptions.fetchImpl = io.fetchImpl;
  if (params.retries !== undefined) fetchOptions.retries = params.retries;
  const xml = await fetchText(arxivQueryUrl(params), fetchOptions);
  return parseArxivAtom(xml);
}

// ---------- RSS / Atom ----------

/** Parse an RSS or Atom feed into syndication items. Pure; dialect is
 *  detected from the document itself. */
export function parseFeed(xml: string): readonly SyndicationItem[] {
  const text = String(xml);
  const isAtom = /<entry[\s>]/i.test(text) && !/<item[\s>]/i.test(text);
  const blocks = text.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return Object.freeze(blocks.map((block) => {
    const title = tidyXmlText(xmlTag(block, "title"));
    const link = isAtom ? (xmlAttr(block, "link", "href") || tidyXmlText(xmlTag(block, "id"))) : tidyXmlText(xmlTag(block, "link"));
    const id = tidyXmlText(xmlTag(block, isAtom ? "id" : "guid")) || link;
    const rawSummary = xmlTag(block, "content:encoded") || xmlTag(block, "content") || xmlTag(block, "summary") || xmlTag(block, "description");
    const published = tidyXmlText(xmlTag(block, isAtom ? "updated" : "pubDate") || xmlTag(block, "published") || xmlTag(block, "dc:date"));
    const authors = [...block.matchAll(/<(?:author|dc:creator)(?:\s[^>]*)?>([\s\S]*?)<\/(?:author|dc:creator)>/gi)]
      .map((match) => stripXmlTags(String(match[1] ?? "").includes("<name>") ? xmlTag(match[1] ?? "", "name") : match[1]))
      .filter(Boolean);
    return syndicationItem({
      id,
      url: link,
      title,
      summary: stripXmlTags(rawSummary),
      authors: Object.freeze(authors),
      published,
      source: isAtom ? "atom" : "rss",
    });
  }).filter((item) => item.title && item.url));
}

/** Fetch and parse one feed intake (`url` preferred, `query` accepted). */
export async function fetchFeed(params: Pick<SyndicationConfig, "query" | "url" | "max" | "retries">, io: { fetchImpl?: FetchLike } = {}): Promise<readonly SyndicationItem[]> {
  const url = params.url ?? params.query;
  if (!url) throw new TypeError("rss source needs a url or query");
  const fetchOptions: { fetchImpl?: FetchLike; retries?: number } = {};
  if (io.fetchImpl) fetchOptions.fetchImpl = io.fetchImpl;
  if (params.retries !== undefined) fetchOptions.retries = params.retries;
  return Object.freeze(parseFeed(await fetchText(url, fetchOptions)).slice(0, params.max ?? 20));
}

// ---------- JSON Feed (newswire surface) ----------

/**
 * Fetch and parse a JSON Feed from a newswire's /feed.json surface.
 * `url` is the wire's base URL (e.g. "http://127.0.0.1:18810/newswires/collapse-climate/");
 * the adapter appends "feed.json". Each item maps to a SyndicationItem whose
 * `source` is the wire URL so provenance carries forward.
 */
export async function fetchJsonFeed(
  params: Pick<SyndicationConfig, "url" | "max" | "retries">,
  io: { fetchImpl?: FetchLike } = {},
): Promise<readonly SyndicationItem[]> {
  const base = params.url;
  if (!base) throw new TypeError("newswire source needs a url (the wire's base URL)");
  const feedUrl = base.replace(/\/?$/, "/") + "feed.json";
  const fetchOptions: { fetchImpl?: FetchLike; retries?: number } = {};
  if (io.fetchImpl) fetchOptions.fetchImpl = io.fetchImpl;
  if (params.retries !== undefined) fetchOptions.retries = params.retries;
  const text = await fetchText(feedUrl, fetchOptions);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`newswire feed.json is not valid JSON: ${feedUrl}`);
  }
  if (!parsed || typeof parsed !== "object") throw new Error(`newswire feed.json is not an object: ${feedUrl}`);
  const feed = parsed as Record<string, unknown>;
  const items = Array.isArray(feed["items"]) ? (feed["items"] as unknown[]) : [];
  const results: SyndicationItem[] = [];
  for (const rawItem of items.slice(0, params.max ?? 20)) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const entry = rawItem as Record<string, unknown>;
    const url = typeof entry["url"] === "string" ? entry["url"] : (typeof entry["id"] === "string" ? entry["id"] : "");
    const title = typeof entry["title"] === "string" ? entry["title"] : "";
    if (!url || !title) continue;
    const summaryRaw = typeof entry["summary"] === "string" ? entry["summary"] : (typeof entry["content_text"] === "string" ? (entry["content_text"] as string).slice(0, 400) : undefined);
    const publishedRaw = typeof entry["date_published"] === "string" ? entry["date_published"] : undefined;
    const authors = Array.isArray(entry["authors"])
      ? (entry["authors"] as unknown[]).map((a) => (a && typeof a === "object" && typeof (a as Record<string, unknown>)["name"] === "string" ? String((a as Record<string, unknown>)["name"]) : "")).filter(Boolean)
      : [];
    const item = syndicationItem({
      url,
      title,
      source: base,
      ...(summaryRaw !== undefined ? { summary: summaryRaw } : {}),
      ...(publishedRaw !== undefined ? { published: publishedRaw } : {}),
      ...(authors.length > 0 ? { authors: Object.freeze(authors) } : {}),
    });
    results.push(item);
  }
  return Object.freeze(results);
}

// ---------- adapter registry ----------

/** The arXiv syndication adapter: type "arxiv", fetching via fetchArxiv. */
export const arxivAdapter: SyndicationAdapter = Object.freeze({
  type: "arxiv",
  fetch: (params, io) => fetchArxiv(params, io),
});

/** The RSS/Atom syndication adapter: type "rss", fetching via fetchFeed. */
export const rssAdapter: SyndicationAdapter = Object.freeze({
  type: "rss",
  fetch: (params, io) => fetchFeed(params, io),
});

/**
 * The newswire JSON Feed syndication adapter: type "newswire", fetching via
 * fetchJsonFeed.
 */
export const newswireAdapter: SyndicationAdapter = Object.freeze({
  type: "newswire",
  fetch: (params, io) => fetchJsonFeed(params, io),
});

/** The default adapter registry. Consumers extend by spreading. */
export const syndicationAdapters: Readonly<Record<string, SyndicationAdapter>> = Object.freeze({ arxiv: arxivAdapter, rss: rssAdapter, newswire: newswireAdapter });
