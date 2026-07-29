/**
 * bibliography - published reference-domain carriers.
 *
 * A site owns how CSL records and body citations are parsed. The mill owns the
 * public bibliography packet: references, cited articles, domain readings, and
 * the site-wide reference-domain rollup.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const SourceKindSchema = { anyOf: [{ const: "commercial-website" }, { const: "independent-website" }, { const: "academic-journal" }, { const: "professional-journal" }, { const: "personal-writing" }, { const: "social-media" }, { const: "unknown" }] } as const;

export const BibliographyReferenceSchema = { $id: "producing-content/content-mill/bibliography-reference", title: "BibliographyReference", additionalProperties: false, type: "object", required: ["id", "title", "sourceKind", "author"], properties: { id: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, domain: { minLength: 1, type: "string" }, type: { minLength: 1, type: "string" }, sourceKind: SourceKindSchema, author: { type: "array", items: { minLength: 1, type: "string" } }, containerTitle: { minLength: 1, type: "string" }, publisher: { minLength: 1, type: "string" }, issued: { minLength: 1, type: "string" }, annotation: { minLength: 1, type: "string" } } } as const;

export const CitedArticleSchema = { $id: "producing-content/content-mill/cited-article", title: "CitedArticle", additionalProperties: false, type: "object", required: ["slug", "title", "url", "citationIds"], properties: { slug: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, citationIds: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const DomainReferenceReadingSchema = { $id: "producing-content/content-mill/domain-reference-reading", title: "DomainReferenceReading", additionalProperties: false, type: "object", required: [...BibliographyReferenceSchema.required, "citedBy"], properties: { ...BibliographyReferenceSchema.properties, citedBy: { type: "array", items: CitedArticleSchema } } } as const;

export const DomainBibliographyReadingSchema = { $id: "producing-content/content-mill/domain-bibliography-reading", title: "DomainBibliographyReading", additionalProperties: false, type: "object", required: ["kind", "domain", "url", "sourceKind", "citationCount", "articleCount", "references"], properties: { kind: { const: "producing-content.domain-bibliography" }, domain: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, sourceKind: SourceKindSchema, citationCount: { minimum: 0, type: "integer" }, articleCount: { minimum: 0, type: "integer" }, references: { type: "array", items: DomainReferenceReadingSchema } } } as const;

export const SiteBibliographyReadingSchema = { $id: "producing-content/content-mill/site-bibliography-reading", title: "SiteBibliographyReading", additionalProperties: false, type: "object", required: ["kind", "count", "domainCount", "domains"], properties: { kind: { const: "producing-content.site-bibliography" }, count: { minimum: 0, type: "integer" }, domainCount: { minimum: 0, type: "integer" }, domains: { type: "array", items: DomainBibliographyReadingSchema } } } as const;

export type SourceKind = FromSchema<typeof SourceKindSchema>;
export type BibliographyReference = FromSchema<typeof BibliographyReferenceSchema>;
export type CitedArticle = FromSchema<typeof CitedArticleSchema>;
export type DomainReferenceReading = FromSchema<typeof DomainReferenceReadingSchema>;
export type DomainBibliographyReading = FromSchema<typeof DomainBibliographyReadingSchema>;
export type SiteBibliographyReading = FromSchema<typeof SiteBibliographyReadingSchema>;

export const bibliographyReferenceCarrier = carrierFrom(BibliographyReferenceSchema);

export const citedArticleCarrier = carrierFrom(CitedArticleSchema);

export const domainReferenceReadingCarrier = carrierFrom(DomainReferenceReadingSchema);

export const domainBibliographyReadingCarrier = carrierFrom(DomainBibliographyReadingSchema);

export const siteBibliographyReadingCarrier = carrierFrom(SiteBibliographyReadingSchema);

export function bibliographyReference(input: Omit<BibliographyReference, "author"> & Readonly<{
  author: readonly string[];
}>): BibliographyReference {
  return bibliographyReferenceCarrier.assert({
    ...input,
    author: [...input.author],
  }, "bibliography reference");
}

export function citedArticle(input: Omit<CitedArticle, "citationIds"> & Readonly<{
  citationIds: readonly string[];
}>): CitedArticle {
  return citedArticleCarrier.assert({
    ...input,
    citationIds: [...input.citationIds],
  }, "cited article");
}

export function domainReferenceReading(input: Omit<DomainReferenceReading, "author" | "citedBy"> & Readonly<{
  author: readonly string[];
  citedBy: readonly CitedArticle[];
}>): DomainReferenceReading {
  return domainReferenceReadingCarrier.assert({
    ...input,
    author: [...input.author],
    citedBy: input.citedBy.map((article) => citedArticle(article)),
  }, "domain reference reading");
}

function sourceKindForReferences(references: readonly DomainReferenceReading[]): SourceKind {
  return references.find((reference) => reference.sourceKind !== "unknown")?.sourceKind ?? "unknown";
}

export function domainBibliographyReading(input: Readonly<{
  domain: string;
  url: string;
  references: readonly DomainReferenceReading[];
  sourceKind?: SourceKind;
}>): DomainBibliographyReading {
  const references = [...input.references].map((reference) => domainReferenceReading(reference))
    .sort((left, right) => left.title.localeCompare(right.title));
  return domainBibliographyReadingCarrier.assert({
    kind: "producing-content.domain-bibliography" as const,
    domain: input.domain,
    url: input.url,
    sourceKind: input.sourceKind ?? sourceKindForReferences(references),
    citationCount: references.reduce((sum, reference) => sum + reference.citedBy.length, 0),
    articleCount: new Set(references.flatMap((reference) => reference.citedBy.map((article) => article.slug))).size,
    references,
  }, "domain bibliography reading");
}

export function siteBibliographyReading(input: Readonly<{
  domains: readonly DomainBibliographyReading[];
}>): SiteBibliographyReading {
  const domains = [...input.domains].map((domain) => domainBibliographyReading(domain))
    .sort((left, right) => right.citationCount - left.citationCount || left.domain.localeCompare(right.domain));
  return siteBibliographyReadingCarrier.assert({
    kind: "producing-content.site-bibliography" as const,
    count: domains.reduce((sum, domain) => sum + domain.citationCount, 0),
    domainCount: domains.length,
    domains,
  }, "site bibliography reading");
}

export function bibliographyReferenceTerm(input: BibliographyReference): Tm {
  return carrierToTerm(jsonResource(bibliographyReferenceCarrier.assert(input), "bibliography reference"));
}

export function domainBibliographyReadingTerm(input: DomainBibliographyReading): Tm {
  return carrierToTerm(jsonResource(domainBibliographyReadingCarrier.assert(input), "domain bibliography reading"));
}

export function siteBibliographyReadingTerm(input: SiteBibliographyReading): Tm {
  return carrierToTerm(jsonResource(siteBibliographyReadingCarrier.assert(input), "site bibliography reading"));
}
