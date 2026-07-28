/**
 * demand â€” the assignment desk's demand reading. Demand creates
 * assignments, never evidence: what the farm covers next is decided here,
 * from (a) the property's seed term map, (b) earned views, (c) Search
 * Console material when present, and (d) coverage decay. Sources never
 * decide WHETHER a term is assigned; once it is, the term acts as a lens
 * that selects the single source story the article covers (./story.mts).
 *
 * Moved from sites/koios.news/src/demand.ts (2026-06-12), with the beat
 * space generalized to strings and the front-matter namespace (where a
 * property records its covered terms) made a parameter.
 */

import { existsSync, readFileSync } from "node:fs";

import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const SeedTermSchema = { $id: "producing-content/content-farm/demand/seed-term", title: "SeedTerm", additionalProperties: false, type: "object", required: ["beat", "term", "priority"], properties: { beat: { minLength: 1, type: "string" }, term: { minLength: 1, type: "string" }, priority: { type: "number" } } } as const;

export const SearchConsoleQuerySchema = { $id: "producing-content/content-farm/demand/search-console-query", title: "SearchConsoleQuery", additionalProperties: false, type: "object", required: ["query"], properties: { query: { minLength: 1, type: "string" }, impressions: { minimum: 0, type: "integer" }, clicks: { minimum: 0, type: "integer" } } } as const;

export const DemandEvidenceSchema = { $id: "producing-content/content-farm/demand/evidence", title: "DemandEvidence", additionalProperties: false, type: "object", required: ["priority", "views", "impressions", "clicks", "covered"], properties: { priority: { type: "number" }, views: { minimum: 0, type: "integer" }, impressions: { minimum: 0, type: "integer" }, clicks: { minimum: 0, type: "integer" }, covered: { minimum: 0, type: "integer" } } } as const;

export const DemandEntrySchema = { $id: "producing-content/content-farm/demand/entry", title: "DemandEntry", additionalProperties: false, type: "object", required: ["beat", "term", "score", "evidence"], properties: { beat: { minLength: 1, type: "string" }, term: { minLength: 1, type: "string" }, score: { type: "number" }, evidence: DemandEvidenceSchema } } as const;

export const DemandTableReadingSchema = { $id: "producing-content/content-farm/demand/table-reading", title: "DemandTableReading", additionalProperties: false, type: "object", required: ["kind", "entryCount", "entries", "constraints"], properties: { kind: { const: "producing-content.demand-table" }, entryCount: { minimum: 0, type: "integer" }, entries: { type: "array", items: DemandEntrySchema }, constraints: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type SeedTerm = FromSchema<typeof SeedTermSchema>;
export type SearchConsoleQuery = FromSchema<typeof SearchConsoleQuerySchema>;
export type DemandEvidence = FromSchema<typeof DemandEvidenceSchema>;
export type DemandEntry = FromSchema<typeof DemandEntrySchema>;
export type DemandTableReading = FromSchema<typeof DemandTableReadingSchema>;

export const DEMAND_TABLE_CONSTRAINTS = Object.freeze([
  "Demand ranks coverage terms from property seed terms, aggregate views, Search Console query material, and coverage decay.",
  "Demand creates assignments; it is not evidence that a source story is true or publishable.",
]);

export const seedTermCarrier = carrierFrom(SeedTermSchema);

export const searchConsoleQueryCarrier = carrierFrom(SearchConsoleQuerySchema);

export const demandEvidenceCarrier = carrierFrom(DemandEvidenceSchema);

export const demandEntryCarrier = carrierFrom(DemandEntrySchema);

export const demandTableReadingCarrier = carrierFrom(DemandTableReadingSchema);

export function seedTerm(input: SeedTerm): SeedTerm {
  return seedTermCarrier.assert(input, "seed term");
}

export function searchConsoleQuery(input: SearchConsoleQuery): SearchConsoleQuery {
  return searchConsoleQueryCarrier.assert(input, "search console query");
}

export function demandEvidence(input: DemandEvidence): DemandEvidence {
  return demandEvidenceCarrier.assert(input, "demand evidence");
}

export function demandEntry(input: DemandEntry): DemandEntry {
  return demandEntryCarrier.assert({
    ...input,
    evidence: demandEvidence(input.evidence),
  }, "demand entry");
}

export function demandTableReading(input: Readonly<{
  entries: readonly DemandEntry[];
  constraints?: readonly string[];
}>): DemandTableReading {
  return demandTableReadingCarrier.assert({
    kind: "producing-content.demand-table" as const,
    entryCount: input.entries.length,
    entries: input.entries.map((entry) => demandEntry(entry)),
    constraints: [...(input.constraints ?? DEMAND_TABLE_CONSTRAINTS)],
  }, "demand table reading");
}

export function seedTermTerm(input: SeedTerm): Tm {
  return carrierToTerm(jsonResource(seedTerm(input), "seed term"));
}

export function searchConsoleQueryTerm(input: SearchConsoleQuery): Tm {
  return carrierToTerm(jsonResource(searchConsoleQuery(input), "search console query"));
}

export function demandEntryTerm(input: DemandEntry): Tm {
  return carrierToTerm(jsonResource(demandEntry(input), "demand entry"));
}

export function demandTableReadingTerm(input: DemandTableReading): Tm {
  return carrierToTerm(jsonResource(demandTableReadingCarrier.assert(input), "demand table reading"));
}

/** The shape of a content-store post the demand reading needs: its slug
 * and front matter. Any richer post carrier (a site's own) assigns. */
export type CandidatePost = Readonly<{
  slug: string;
  document: Readonly<{ frontMatter: Readonly<Record<string, unknown>> }>;
}>;

/** The view-counts reading demand folds: views by site-relative path. */
export type ViewCountsReading = Readonly<{ byPath: Readonly<Record<string, number>> }>;

export const NO_VIEWS: ViewCountsReading = Object.freeze({ byPath: Object.freeze({}) });

/** Read a search-console.json file if present: { queries: [{query, impressions, clicks}] }.
 * The seam for Search Console exports (the farm's demand pull, a manual
 * drop, or an API sync). A missing or malformed file is empty demand. */
export function readSearchConsole(path: string): readonly SearchConsoleQuery[] {
  if (!existsSync(path)) return Object.freeze([]);
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { queries?: unknown };
    if (!Array.isArray(parsed.queries)) return Object.freeze([]);
    return Object.freeze(parsed.queries.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || typeof (entry as { query?: unknown }).query !== "string") return [];
      const record = entry as { query: string; impressions?: unknown; clicks?: unknown };
      return [searchConsoleQuery({
        query: record.query,
        ...(typeof record.impressions === "number" ? { impressions: record.impressions } : {}),
        ...(typeof record.clicks === "number" ? { clicks: record.clicks } : {}),
      })];
    }));
  } catch {
    return Object.freeze([]);
  }
}

function normalize(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function overlap(a: string, b: string): number {
  const left = new Set(normalize(a).split(" "));
  const right = normalize(b).split(" ");
  return right.filter((word) => left.has(word)).length / Math.max(right.length, 1);
}

export type DemandTableInput = Readonly<{
  posts: readonly CandidatePost[];
  views?: ViewCountsReading;
  searchConsole?: readonly SearchConsoleQuery[];
  seeds: readonly SeedTerm[];
  /** The front-matter namespace under which the property records its SEO
   * term (e.g. "koios" â†’ frontMatter.koios.seo_term). Default "farm". */
  termKey?: string;
}>;

/** Fold demand: seeds + earned views + searched queries âˆ’ coverage. */
export function demandTable(input: DemandTableInput): readonly DemandEntry[] {
  const seeds = input.seeds.map((seed) => seedTerm(seed));
  const queries = input.searchConsole ?? [];
  const views = input.views ?? NO_VIEWS;
  const termKey = input.termKey ?? "farm";
  const coverage = new Map<string, { count: number; paths: string[] }>();
  for (const post of input.posts) {
    const namespace = (post.document.frontMatter[termKey] ?? {}) as Readonly<Record<string, unknown>>;
    const terms = new Set([
      ...(typeof namespace["seo_term"] === "string" ? [namespace["seo_term"]] : []),
      ...(Array.isArray(post.document.frontMatter["keywords"]) ? (post.document.frontMatter["keywords"] as unknown[]).map(String) : []),
    ]);
    const path = `/posts/${post.slug}`;
    for (const term of terms) {
      const key = normalize(term);
      const entry = coverage.get(key) ?? { count: 0, paths: [] };
      entry.count += 1;
      entry.paths.push(path);
      coverage.set(key, entry);
    }
  }
  const entries = seeds.map((seed) => {
    const key = normalize(seed.term);
    const covered = coverage.get(key);
    const earned = (covered?.paths ?? []).reduce((sum, path) => sum + (views.byPath[path] ?? 0), 0);
    let impressions = 0;
    let clicks = 0;
    for (const query of queries) {
      if (overlap(seed.term, query.query) >= 0.6) {
        impressions += query.impressions ?? 0;
        clicks += query.clicks ?? 0;
      }
    }
    const score = seed.priority
      + 2 * Math.log2(1 + earned)
      + 0.5 * clicks
      + 0.01 * impressions
      - 3 * (covered?.count ?? 0);
    return demandEntry({
      beat: seed.beat,
      term: seed.term,
      score,
      evidence: demandEvidence({ priority: seed.priority, views: earned, impressions, clicks, covered: covered?.count ?? 0 }),
    });
  });
  return Object.freeze([...entries].sort((left, right) => right.score - left.score || left.term.localeCompare(right.term)));
}
