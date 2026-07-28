/**
 * coverage - linked-data coverage vocabulary carriers.
 *
 * A site owns its frontmatter dialect and route mounting. The mill owns the
 * coverage vocabulary packet that turns public articles into a controlled
 * DefinedTermSet for SEO terms, beats, sections, and tags.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const CoverageTermFacetSchema = { anyOf: [{ const: "seo-term" }, { const: "beat" }, { const: "section" }, { const: "tag" }] } as const;

export const CoverageTermMetadataSchema = { $id: "producing-content/content-mill/coverage/term-metadata", title: "CoverageTermMetadata", additionalProperties: false, type: "object", properties: { seoTerms: { type: "array", items: { minLength: 1, type: "string" } }, beats: { type: "array", items: { minLength: 1, type: "string" } }, tags: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const CoverageArticleRefSchema = { $id: "producing-content/content-mill/coverage/article-ref", title: "CoverageArticleRef", additionalProperties: false, type: "object", required: ["@type", "@id", "headline"], properties: { "@type": { const: "NewsArticle" }, "@id": { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, datePublished: { minLength: 1, type: "string" } } } as const;

export const CoverageDefinedTermSchema = { $id: "producing-content/content-mill/coverage/defined-term", title: "CoverageDefinedTerm", additionalProperties: false, type: "object", required: ["@type", "@id", "name", "termCode", "inDefinedTermSet", "articleCount", "subjectOf"], properties: { "@type": { const: "DefinedTerm" }, "@id": { minLength: 1, type: "string" }, name: { minLength: 1, type: "string" }, termCode: CoverageTermFacetSchema, inDefinedTermSet: { minLength: 1, type: "string" }, articleCount: { minimum: 0, type: "integer" }, subjectOf: { type: "array", items: { title: "CoverageArticleRefValue", additionalProperties: false, type: "object", required: CoverageArticleRefSchema.required, properties: CoverageArticleRefSchema.properties } } } } as const;

export const CoverageGraphSchema = { $id: "producing-content/content-mill/coverage/graph", title: "CoverageGraph", additionalProperties: false, type: "object", required: ["@context", "@type", "@id", "name", "description", "url", "inLanguage", "articleCount", "termCount", "hasDefinedTerm"], properties: { "@context": { const: "https://schema.org" }, "@type": { const: "DefinedTermSet" }, "@id": { minLength: 1, type: "string" }, name: { minLength: 1, type: "string" }, description: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, inLanguage: { minLength: 1, type: "string" }, articleCount: { minimum: 0, type: "integer" }, termCount: { minimum: 0, type: "integer" }, hasDefinedTerm: { type: "array", items: { title: "CoverageDefinedTermValue", additionalProperties: false, type: "object", required: CoverageDefinedTermSchema.required, properties: CoverageDefinedTermSchema.properties } } } } as const;

export type CoverageTermFacet = FromSchema<typeof CoverageTermFacetSchema>;
export type CoverageTermMetadata = FromSchema<typeof CoverageTermMetadataSchema>;
export type CoverageArticleRef = FromSchema<typeof CoverageArticleRefSchema>;
export type CoverageDefinedTerm = FromSchema<typeof CoverageDefinedTermSchema>;
export type CoverageGraph = FromSchema<typeof CoverageGraphSchema>;

export type CoveragePublicationMasthead = Readonly<{
  title: string;
  siteUrl: string;
  itemPath: string;
  language: string;
}>;

export type CoveragePublicationItem = Readonly<{
  slug: string;
  headline: string;
  published?: string;
  section?: string;
  keywords: readonly string[];
  isPublic: boolean;
}>;

export type CoverageTermMetadataOptions = Readonly<{
  namespace?: string;
  seoTermKeys?: readonly string[];
  beatKeys?: readonly string[];
  tagKeys?: readonly string[];
}>;

export const coverageTermMetadataCarrier = carrierFrom(CoverageTermMetadataSchema);

export const coverageArticleRefCarrier = carrierFrom(CoverageArticleRefSchema);

export const coverageDefinedTermCarrier = carrierFrom(CoverageDefinedTermSchema);

export const coverageGraphCarrier = carrierFrom(CoverageGraphSchema);

export function coverageTermMetadata(input: Omit<CoverageTermMetadata, "seoTerms" | "beats" | "tags"> & Readonly<{
  seoTerms?: readonly string[];
  beats?: readonly string[];
  tags?: readonly string[];
}>): CoverageTermMetadata {
  return coverageTermMetadataCarrier.assert({
    ...(input.seoTerms === undefined ? {} : { seoTerms: [...input.seoTerms] }),
    ...(input.beats === undefined ? {} : { beats: [...input.beats] }),
    ...(input.tags === undefined ? {} : { tags: [...input.tags] }),
  }, "coverage term metadata");
}

function coverageArticleRef(input: CoverageArticleRef): CoverageArticleRef {
  return coverageArticleRefCarrier.assert(input, "coverage article ref");
}

function coverageDefinedTerm(input: CoverageDefinedTerm): CoverageDefinedTerm {
  return coverageDefinedTermCarrier.assert({
    ...input,
    subjectOf: input.subjectOf.map((ref) => coverageArticleRef(ref)),
  }, "coverage defined term");
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)].filter((entry) => entry.trim() !== ""));
}

function firstValues(frontMatter: Readonly<Record<string, unknown>>, namespace: string, keys: readonly string[]): readonly string[] {
  const namespaced = record(frontMatter[namespace]);
  for (const key of keys) {
    const values = strings(frontMatter[key]);
    if (values.length > 0) return values;
    const namespacedValues = strings(namespaced[key]);
    if (namespacedValues.length > 0) return namespacedValues;
  }
  return Object.freeze([]);
}

export function coverageTermMetadataFromFrontMatter(
  frontMatter: Readonly<Record<string, unknown>>,
  options: CoverageTermMetadataOptions = {},
): CoverageTermMetadata {
  const namespace = options.namespace ?? "koios";
  const seoTerms = firstValues(frontMatter, namespace, options.seoTermKeys ?? ["seo_term", "seoTerm", "keywords"]);
  const beats = firstValues(frontMatter, namespace, options.beatKeys ?? ["beat", "beats"]);
  const tags = firstValues(frontMatter, namespace, options.tagKeys ?? ["tags", "tag"]);
  return coverageTermMetadata({
    ...(seoTerms.length === 0 ? {} : { seoTerms }),
    ...(beats.length === 0 ? {} : { beats }),
    ...(tags.length === 0 ? {} : { tags }),
  });
}

function asCoverageTerms(values: readonly string[] | undefined): readonly string[] {
  if (values === undefined) return Object.freeze([]);
  return Object.freeze(values.map((value) => value.trim()).filter((value) => value !== ""));
}

function coverageTermSlug(facet: CoverageTermFacet, name: string): string {
  return `${facet}/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function publicCoverageItems(items: readonly CoveragePublicationItem[]): readonly CoveragePublicationItem[] {
  return Object.freeze([...items]
    .filter((item) => item.isPublic)
    .sort((left, right) => (right.published ?? "").localeCompare(left.published ?? "") || left.slug.localeCompare(right.slug)));
}

export function publicationCoverageGraphReading(input: Readonly<{
  masthead: CoveragePublicationMasthead;
  items: readonly CoveragePublicationItem[];
  termMetadataBySlug?: Readonly<Record<string, CoverageTermMetadata>>;
  description?: string;
}>): CoverageGraph {
  const base = input.masthead.siteUrl.replace(/\/$/, "");
  const itemPath = input.masthead.itemPath.replace(/^\/+|\/+$/g, "");
  const setId = `${base}/coverage.json#vocabulary`;
  const publics = publicCoverageItems(input.items);
  const facets = new Map<CoverageTermFacet, Map<string, CoverageArticleRef[]>>();
  const add = (facet: CoverageTermFacet, name: string, ref: CoverageArticleRef): void => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    const terms = facets.get(facet) ?? new Map<string, CoverageArticleRef[]>();
    const refs = terms.get(trimmed) ?? [];
    if (!refs.some((existing) => existing["@id"] === ref["@id"])) refs.push(ref);
    terms.set(trimmed, refs);
    facets.set(facet, terms);
  };

  for (const item of publics) {
    const ref = coverageArticleRef({
      "@type": "NewsArticle" as const,
      "@id": `${base}/${itemPath}/${item.slug}`,
      headline: item.headline,
      ...(item.published === undefined ? {} : { datePublished: item.published }),
    });
    const metadata = input.termMetadataBySlug?.[item.slug];
    for (const term of asCoverageTerms(metadata?.seoTerms)) add("seo-term", term, ref);
    for (const beat of asCoverageTerms(metadata?.beats)) add("beat", beat, ref);
    if (item.section !== undefined && item.section !== "") add("section", item.section, ref);
    for (const tag of asCoverageTerms(metadata?.tags ?? item.keywords)) add("tag", tag, ref);
  }

  const terms: CoverageDefinedTerm[] = [];
  for (const [facet, byName] of facets) {
    for (const [name, refs] of byName) {
      terms.push(coverageDefinedTerm({
        "@type": "DefinedTerm" as const,
        "@id": `${base}/coverage.json#${coverageTermSlug(facet, name)}`,
        name,
        termCode: facet,
        inDefinedTermSet: setId,
        articleCount: refs.length,
        subjectOf: refs.slice(),
      }));
    }
  }
  const facetOrder: Record<CoverageTermFacet, number> = { "seo-term": 0, beat: 1, section: 2, tag: 3 };
  terms.sort((a, b) =>
    b.articleCount - a.articleCount
    || facetOrder[a.termCode] - facetOrder[b.termCode]
    || a.name.localeCompare(b.name));

  return coverageGraphCarrier.assert({
    "@context": "https://schema.org" as const,
    "@type": "DefinedTermSet" as const,
    "@id": setId,
    name: `${input.masthead.title} coverage vocabulary`,
    description: input.description ?? "Controlled vocabulary of the publication's SEO terms, beats, sections, and tags, each linked to the public NewsArticles that cover it. A machine-readable map of what the newsroom covers; the human site is unchanged.",
    url: `${base}/coverage.json`,
    inLanguage: input.masthead.language,
    articleCount: publics.length,
    termCount: terms.length,
    hasDefinedTerm: terms,
  }, "coverage graph");
}

export function coverageGraphTerm(input: CoverageGraph): Tm {
  return carrierToTerm(jsonResource(coverageGraphCarrier.assert(input), "coverage graph"));
}
