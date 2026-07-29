/**
 * performance - privacy-preserving content performance carriers.
 *
 * A site owns how views are counted. The mill owns the aggregate performance
 * packet over public article metadata, with no reader identifiers.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const ContentPerformanceBucketSchema = { $id: "producing-content/content-mill/content-performance-bucket", title: "ContentPerformanceBucket", additionalProperties: false, type: "object", required: ["views", "articleCount", "averageViews"], properties: { views: { minimum: 0, type: "integer" }, articleCount: { minimum: 0, type: "integer" }, averageViews: { minimum: 0, type: "number" } } } as const;

const ContentPerformanceBucketValueSchema = { title: "ContentPerformanceBucketValue", additionalProperties: false, type: "object", required: ContentPerformanceBucketSchema.required, properties: ContentPerformanceBucketSchema.properties } as const;

export const ContentViewEventSchema = { $id: "producing-content/content-mill/content-view-event", title: "ContentViewEvent", additionalProperties: false, type: "object", required: ["kind", "p", "t"], properties: { kind: { const: "producing-content.content-view-event" }, p: { minLength: 1, pattern: "^/[\\x21-\\x7e]{0,512}$", type: "string" }, r: { minLength: 1, maxLength: 256, type: "string" }, t: { pattern: "^\\d{4}-\\d{2}-\\d{2}$", type: "string" } } } as const;

export const ContentViewCountsSchema = { $id: "producing-content/content-mill/content-view-counts", title: "ContentViewCounts", additionalProperties: false, type: "object", required: ["kind", "total", "byPath", "byReferrer", "byDay", "constraints"], properties: { kind: { const: "producing-content.content-view-counts" }, total: { minimum: 0, type: "integer" }, byPath: { type: "object", additionalProperties: { minimum: 0, type: "integer" } }, byReferrer: { type: "object", additionalProperties: { minimum: 0, type: "integer" } }, byDay: { type: "object", additionalProperties: { minimum: 0, type: "integer" } }, constraints: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const ArticlePerformanceSchema = { $id: "producing-content/content-mill/article-performance", title: "ArticlePerformance", additionalProperties: false, type: "object", required: ["slug", "path", "headline", "tags", "views"], properties: { slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, section: { minLength: 1, type: "string" }, tags: { type: "array", items: { minLength: 1, type: "string" } }, views: { minimum: 0, type: "integer" } } } as const;

export const ContentPerformanceReadingSchema = { $id: "producing-content/content-mill/content-performance-reading", title: "ContentPerformanceReading", additionalProperties: false, type: "object", required: ["kind", "totalViews", "publicArticleCount", "byArticle", "bySection", "byTag", "constraints"], properties: { kind: { const: "producing-content.content-performance-reading" }, totalViews: { minimum: 0, type: "integer" }, publicArticleCount: { minimum: 0, type: "integer" }, byArticle: { type: "array", items: ArticlePerformanceSchema }, bySection: { type: "object", additionalProperties: ContentPerformanceBucketValueSchema }, byTag: { type: "object", additionalProperties: ContentPerformanceBucketValueSchema }, constraints: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type ContentViewEvent = FromSchema<typeof ContentViewEventSchema>;
export type ContentViewCounts = Readonly<{
  kind: "producing-content.content-view-counts";
  total: number;
  byPath: Readonly<Record<string, number>>;
  byReferrer: Readonly<Record<string, number>>;
  byDay: Readonly<Record<string, number>>;
  constraints: readonly string[];
}>;
export type ContentPerformanceBucket = FromSchema<typeof ContentPerformanceBucketSchema>;
export type ArticlePerformance = FromSchema<typeof ArticlePerformanceSchema>;
export type ContentPerformanceReading = Readonly<{
  kind: "producing-content.content-performance-reading";
  totalViews: number;
  publicArticleCount: number;
  byArticle: readonly ArticlePerformance[];
  bySection: Readonly<Record<string, ContentPerformanceBucket>>;
  byTag: Readonly<Record<string, ContentPerformanceBucket>>;
  constraints: readonly string[];
}>;

export const CONTENT_VIEW_CONSTRAINTS = Object.freeze([
  "A view event is path, optional referrer host, and day only.",
  "No IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are admitted to the view trace.",
]);

export const CONTENT_PERFORMANCE_CONSTRAINTS = Object.freeze([
  "Folded from first-party path/referrer/day view counts and public article metadata only.",
  "No IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are available to this reading.",
]);

export const contentViewEventCarrier = carrierFrom(ContentViewEventSchema);

export const contentViewCountsCarrier = carrierFrom(ContentViewCountsSchema);

export const contentPerformanceBucketCarrier = carrierFrom(ContentPerformanceBucketSchema);

export const articlePerformanceCarrier = carrierFrom(ArticlePerformanceSchema);

export const contentPerformanceReadingCarrier = carrierFrom(ContentPerformanceReadingSchema);

export function contentPerformanceBucket(input: Readonly<{
  views: number;
  articleCount: number;
}>): ContentPerformanceBucket {
  return contentPerformanceBucketCarrier.assert({
    views: input.views,
    articleCount: input.articleCount,
    averageViews: input.articleCount === 0 ? 0 : Math.round((input.views / input.articleCount) * 100) / 100,
  }, "content performance bucket");
}

const PATH_PATTERN = /^\/[\x21-\x7e]{0,512}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function contentViewEvent(input: Readonly<{
  p?: string | null;
  r?: string | null;
  day: string;
}>): ContentViewEvent | null {
  const path = input.p ?? "";
  if (!PATH_PATTERN.test(path) || !DAY_PATTERN.test(input.day)) return null;
  const referrer = (input.r ?? "").slice(0, 256);
  return contentViewEventCarrier.assert({
    kind: "producing-content.content-view-event" as const,
    p: path,
    ...(referrer === "" ? {} : { r: referrer }),
    t: input.day,
  }, "content view event");
}

export function contentViewEventFromRecord(record: Readonly<Record<string, unknown>>): ContentViewEvent | undefined {
  const kind = maybeString(record["kind"]);
  if (kind !== undefined && kind !== "producing-content.content-view-event") return undefined;
  const day = maybeString(record["t"]);
  if (day === undefined) return undefined;
  const path = maybeString(record["p"]);
  const referrer = maybeString(record["r"]);
  return contentViewEvent({
    day,
    ...(path === undefined ? {} : { p: path }),
    ...(referrer === undefined ? {} : { r: referrer }),
  }) ?? undefined;
}

export function contentViewCounts(input: Readonly<{
  events: readonly ContentViewEvent[];
  constraints?: readonly string[];
}>): ContentViewCounts {
  const byPath: Record<string, number> = {};
  const byReferrer: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  for (const event of input.events) {
    byPath[event.p] = (byPath[event.p] ?? 0) + 1;
    if (event.r !== undefined) byReferrer[event.r] = (byReferrer[event.r] ?? 0) + 1;
    byDay[event.t] = (byDay[event.t] ?? 0) + 1;
  }
  const counts: ContentViewCounts = Object.freeze({
    kind: "producing-content.content-view-counts" as const,
    total: input.events.length,
    byPath,
    byReferrer,
    byDay,
    constraints: [...(input.constraints ?? CONTENT_VIEW_CONSTRAINTS)],
  });
  contentViewCountsCarrier.assert(counts, "content view counts");
  return counts;
}

export function articlePerformance(input: Omit<ArticlePerformance, "tags"> & Readonly<{
  tags: readonly string[];
}>): ArticlePerformance {
  return articlePerformanceCarrier.assert({
    ...input,
    tags: [...input.tags],
  }, "article performance");
}

function emptyBucket(): { views: number; articleCount: number } {
  return { views: 0, articleCount: 0 };
}

function addBucket(record: Record<string, { views: number; articleCount: number }>, key: string, views: number): void {
  record[key] ??= emptyBucket();
  record[key]!.views += views;
  record[key]!.articleCount += 1;
}

function finalized(record: Readonly<Record<string, { views: number; articleCount: number }>>): Readonly<Record<string, ContentPerformanceBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, bucket]) => [key, contentPerformanceBucket(bucket)])));
}

export function contentPerformanceReading(input: Readonly<{
  totalViews: number;
  articles: readonly ArticlePerformance[];
  constraints?: readonly string[];
}>): ContentPerformanceReading {
  const bySection: Record<string, { views: number; articleCount: number }> = {};
  const byTag: Record<string, { views: number; articleCount: number }> = {};
  const articles = [...input.articles].map((item) => {
    if (item.section !== undefined) addBucket(bySection, item.section, item.views);
    for (const tag of item.tags) addBucket(byTag, tag, item.views);
    return articlePerformance(item);
  }).sort((left, right) => right.views - left.views || left.headline.localeCompare(right.headline));
  const reading: ContentPerformanceReading = Object.freeze({
    kind: "producing-content.content-performance-reading" as const,
    totalViews: input.totalViews,
    publicArticleCount: articles.length,
    byArticle: articles,
    bySection: finalized(bySection),
    byTag: finalized(byTag),
    constraints: [...(input.constraints ?? CONTENT_PERFORMANCE_CONSTRAINTS)],
  });
  contentPerformanceReadingCarrier.assert(reading, "content performance reading");
  return reading;
}

export function articlePerformanceTerm(input: ArticlePerformance): Tm {
  return carrierToTerm(jsonResource(articlePerformanceCarrier.assert(input), "article performance"));
}

export function contentViewEventTerm(input: ContentViewEvent): Tm {
  return carrierToTerm(jsonResource(contentViewEventCarrier.assert(input), "content view event"));
}

export function contentViewCountsTerm(input: ContentViewCounts): Tm {
  return carrierToTerm(jsonResource(contentViewCountsCarrier.assert(input), "content view counts"));
}

export function contentPerformanceReadingTerm(input: ContentPerformanceReading): Tm {
  return carrierToTerm(jsonResource(contentPerformanceReadingCarrier.assert(input), "content performance reading"));
}
