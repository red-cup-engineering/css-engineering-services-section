/**
 * archive - public archive carriers for content mills.
 *
 * Sites own their HTML archive pages. The mill owns the public archive reading:
 * published items grouped by month and year with stable URLs.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const ContentArchiveMonthReadingSchema = { $id: "producing-content/content-mill/archive/month", title: "ContentArchiveMonthReading", additionalProperties: false, type: "object", required: ["kind", "year", "month", "title", "count", "url"], properties: { kind: { const: "producing-content.archive.month" }, year: { minLength: 4, type: "string" }, month: { minLength: 2, type: "string" }, title: { minLength: 1, type: "string" }, count: { minimum: 0, type: "integer" }, url: { minLength: 1, type: "string" }, latestPublished: { minLength: 1, type: "string" } } } as const;

export const ContentArchiveYearReadingSchema = { $id: "producing-content/content-mill/archive/year", title: "ContentArchiveYearReading", additionalProperties: false, type: "object", required: ["kind", "year", "count", "url", "months"], properties: { kind: { const: "producing-content.archive.year" }, year: { minLength: 4, type: "string" }, count: { minimum: 0, type: "integer" }, url: { minLength: 1, type: "string" }, months: { type: "array", items: ContentArchiveMonthReadingSchema }, latestPublished: { minLength: 1, type: "string" } } } as const;

export const ContentArchiveReadingSchema = { $id: "producing-content/content-mill/archive", title: "ContentArchiveReading", additionalProperties: false, type: "object", required: ["kind", "count", "years"], properties: { kind: { const: "producing-content.archive" }, count: { minimum: 0, type: "integer" }, years: { type: "array", items: ContentArchiveYearReadingSchema } } } as const;

export type ContentArchiveMonthReading = FromSchema<typeof ContentArchiveMonthReadingSchema>;
export type ContentArchiveYearReading = FromSchema<typeof ContentArchiveYearReadingSchema>;
export type ContentArchiveReading = FromSchema<typeof ContentArchiveReadingSchema>;

export type ContentArchiveItem = Readonly<{
  published?: string;
  isPublic?: boolean;
}>;

const MONTHS = Object.freeze([
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]);

export const contentArchiveMonthReadingCarrier = carrierFrom(ContentArchiveMonthReadingSchema);

export const contentArchiveYearReadingCarrier = carrierFrom(ContentArchiveYearReadingSchema);

export const contentArchiveReadingCarrier = carrierFrom(ContentArchiveReadingSchema);

export function contentArchiveMonthReading(input: Omit<ContentArchiveMonthReading, "kind">): ContentArchiveMonthReading {
  return contentArchiveMonthReadingCarrier.assert({
    kind: "producing-content.archive.month" as const,
    ...input,
  }, "content archive month reading");
}

export function contentArchiveYearReading(input: Omit<ContentArchiveYearReading, "kind" | "months"> & Readonly<{
  months: readonly ContentArchiveMonthReading[];
}>): ContentArchiveYearReading {
  const months = [...input.months].map((month) => contentArchiveMonthReading(month))
    .sort((left, right) => right.month.localeCompare(left.month));
  return contentArchiveYearReadingCarrier.assert({
    kind: "producing-content.archive.year" as const,
    year: input.year,
    count: input.count,
    url: input.url,
    months,
    ...(input.latestPublished === undefined ? {} : { latestPublished: input.latestPublished }),
  }, "content archive year reading");
}

export function contentArchiveReading(input: Omit<ContentArchiveReading, "kind" | "years" | "count"> & Readonly<{
  years: readonly ContentArchiveYearReading[];
}>): ContentArchiveReading {
  const years = [...input.years].map((year) => contentArchiveYearReading(year))
    .sort((left, right) => right.year.localeCompare(left.year));
  return contentArchiveReadingCarrier.assert({
    kind: "producing-content.archive" as const,
    count: years.reduce((total, year) => total + year.count, 0),
    years,
  }, "content archive reading");
}

function publishedYearMonth(item: ContentArchiveItem): { year: string; month: string; published: string } | null {
  if (item.isPublic === false) return null;
  const match = /^(\d{4})-(\d{2})/.exec(item.published ?? "");
  return match ? { year: match[1]!, month: match[2]!, published: item.published! } : null;
}

export function contentArchiveReadingFromItems(input: Readonly<{
  siteUrl: string;
  items: readonly ContentArchiveItem[];
}>): ContentArchiveReading {
  const months = new Map<string, { year: string; month: string; count: number; latestPublished?: string }>();
  for (const item of input.items) {
    const parts = publishedYearMonth(item);
    if (parts === null) continue;
    const key = `${parts.year}-${parts.month}`;
    const entry = months.get(key) ?? { year: parts.year, month: parts.month, count: 0 };
    entry.count += 1;
    if (entry.latestPublished === undefined || parts.published > entry.latestPublished) entry.latestPublished = parts.published;
    months.set(key, entry);
  }
  const byYear = new Map<string, ContentArchiveMonthReading[]>();
  for (const entry of months.values()) {
    const monthName = MONTHS[Number(entry.month) - 1] ?? entry.month;
    const month = contentArchiveMonthReading({
      year: entry.year,
      month: entry.month,
      title: `${monthName} ${entry.year}`,
      count: entry.count,
      url: `${input.siteUrl}/archive/${entry.year}/${entry.month}`,
      ...(entry.latestPublished === undefined ? {} : { latestPublished: entry.latestPublished }),
    });
    byYear.set(entry.year, [...(byYear.get(entry.year) ?? []), month]);
  }
  return contentArchiveReading({
    years: [...byYear.entries()].map(([year, yearMonths]) => {
      const latestPublished = yearMonths.map((month) => month.latestPublished).filter((value): value is string => value !== undefined).sort().at(-1);
      return contentArchiveYearReading({
        year,
        count: yearMonths.reduce((total, month) => total + month.count, 0),
        url: `${input.siteUrl}/archive/${year}`,
        months: yearMonths,
        ...(latestPublished === undefined ? {} : { latestPublished }),
      });
    }),
  });
}

export function contentArchiveMonthReadingTerm(input: ContentArchiveMonthReading): Tm {
  return carrierToTerm(jsonResource(contentArchiveMonthReadingCarrier.assert(input), "content archive month reading"));
}

export function contentArchiveYearReadingTerm(input: ContentArchiveYearReading): Tm {
  return carrierToTerm(jsonResource(contentArchiveYearReadingCarrier.assert(input), "content archive year reading"));
}

export function contentArchiveReadingTerm(input: ContentArchiveReading): Tm {
  return carrierToTerm(jsonResource(contentArchiveReadingCarrier.assert(input), "content archive reading"));
}
