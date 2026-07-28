/**
 * predication - editorial support-shape carriers.
 *
 * Sites own paragraph parsing and claim heuristics. The mill owns the
 * predication packet that records support, same-site relations, settlement,
 * and graph centrality without reader tracking.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import { ContentQualityFindingSchema, contentQualityFinding, type ContentQualityFinding } from "./quality.mjs";

export const PredicationCellKindSchema = { anyOf: [{ const: "claim" }, { const: "evidence" }, { const: "same-site-relation" }, { const: "unsupported" }, { const: "structure" }] } as const;

export const ArticlePredicationCellSchema = { $id: "producing-content/content-mill/article-predication-cell", title: "ArticlePredicationCell", additionalProperties: false, type: "object", required: ["kind", "paragraphIndex", "textPreview", "citedReferenceIds", "internalTargets", "confidence"], properties: { kind: PredicationCellKindSchema, paragraphIndex: { minimum: 0, type: "integer" }, heading: { minLength: 1, type: "string" }, textPreview: { minLength: 1, type: "string" }, citedReferenceIds: { type: "array", items: { minLength: 1, type: "string" } }, internalTargets: { type: "array", items: { minLength: 1, type: "string" } }, confidence: { minimum: 0, maximum: 1, type: "number" } } } as const;

export const ArticlePredicationMetricsSchema = { $id: "producing-content/content-mill/article-predication-metrics", title: "ArticlePredicationMetrics", additionalProperties: false, type: "object", required: ["slug", "path", "headline", "tags", "paragraphCount", "claimCellCount", "evidenceCellCount", "sameSiteRelationCellCount", "unsupportedClaimCellCount", "headingCellCount", "citationCoverage", "internalRelationCoverage", "settlementDepth", "graphCentrality", "findings", "cells"], properties: { slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, section: { minLength: 1, type: "string" }, tags: { type: "array", items: { minLength: 1, type: "string" } }, paragraphCount: { minimum: 0, type: "integer" }, claimCellCount: { minimum: 0, type: "integer" }, evidenceCellCount: { minimum: 0, type: "integer" }, sameSiteRelationCellCount: { minimum: 0, type: "integer" }, unsupportedClaimCellCount: { minimum: 0, type: "integer" }, headingCellCount: { minimum: 0, type: "integer" }, citationCoverage: { minimum: 0, maximum: 1, type: "number" }, internalRelationCoverage: { minimum: 0, maximum: 1, type: "number" }, settlementDepth: { minimum: 0, maximum: 1, type: "number" }, graphCentrality: { minimum: 0, maximum: 1, type: "number" }, freshnessDays: { minimum: 0, type: "integer" }, findings: { type: "array", items: ContentQualityFindingSchema }, cells: { type: "array", items: ArticlePredicationCellSchema } } } as const;

export const ContentPredicationAggregateSchema = { $id: "producing-content/content-mill/content-predication-aggregate", title: "ContentPredicationAggregate", additionalProperties: false, type: "object", required: ["claimCells", "evidenceCells", "sameSiteRelationCells", "unsupportedClaimCells", "averageCitationCoverage", "averageInternalRelationCoverage", "averageSettlementDepth", "averageGraphCentrality", "articlesWithUnsupportedClaims", "articlesWithNoEvidenceCells", "articlesWithNoRelationCells"], properties: { claimCells: { minimum: 0, type: "integer" }, evidenceCells: { minimum: 0, type: "integer" }, sameSiteRelationCells: { minimum: 0, type: "integer" }, unsupportedClaimCells: { minimum: 0, type: "integer" }, averageCitationCoverage: { minimum: 0, maximum: 1, type: "number" }, averageInternalRelationCoverage: { minimum: 0, maximum: 1, type: "number" }, averageSettlementDepth: { minimum: 0, maximum: 1, type: "number" }, averageGraphCentrality: { minimum: 0, maximum: 1, type: "number" }, articlesWithUnsupportedClaims: { minimum: 0, type: "integer" }, articlesWithNoEvidenceCells: { minimum: 0, type: "integer" }, articlesWithNoRelationCells: { minimum: 0, type: "integer" } } } as const;

export const ContentPredicationReadingSchema = { $id: "producing-content/content-mill/content-predication-reading", title: "ContentPredicationReading", additionalProperties: false, type: "object", required: ["kind", "publicArticleCount", "aggregate", "byArticle", "constraints", "plannedUses"], properties: { kind: { const: "producing-content.content-predication-reading" }, publicArticleCount: { minimum: 0, type: "integer" }, aggregate: ContentPredicationAggregateSchema, byArticle: { type: "array", items: ArticlePredicationMetricsSchema }, constraints: { type: "array", items: { minLength: 1, type: "string" } }, plannedUses: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type PredicationCellKind = FromSchema<typeof PredicationCellKindSchema>;
export type ArticlePredicationCell = FromSchema<typeof ArticlePredicationCellSchema>;
export type ArticlePredicationMetrics = FromSchema<typeof ArticlePredicationMetricsSchema>;
export type ContentPredicationAggregate = FromSchema<typeof ContentPredicationAggregateSchema>;
export type ContentPredicationReading = FromSchema<typeof ContentPredicationReadingSchema>;

export const CONTENT_PREDICATION_CONSTRAINTS = Object.freeze([
  "Folded from public article Markdown, CSL references, and same-site article links only.",
  "This is an editorial predication diagnostic: it estimates support and relation shape, not truth.",
  "Sources and references remain ontologically separate; only CSL references and body citations count as publication evidence.",
  "No visitor identifiers, cookies, IP addresses, user agents, fingerprints, or reader profiles are used.",
]);

export const CONTENT_PREDICATION_PLANNED_USES = Object.freeze([
  "Find articles whose claim-like paragraphs need stronger inline reference support.",
  "Find isolated articles that should be related to existing coverage where the local paragraph warrants it.",
  "Track settlement depth, graph centrality, and freshness as internal editorial metrics.",
  "Give future autonomous research, writing, editing, and publishing stages a shared content-quality carrier.",
]);

export const articlePredicationCellCarrier = carrierFrom(ArticlePredicationCellSchema);

export const articlePredicationMetricsCarrier = carrierFrom(ArticlePredicationMetricsSchema);

export const contentPredicationAggregateCarrier = carrierFrom(ContentPredicationAggregateSchema);

export const contentPredicationReadingCarrier = carrierFrom(ContentPredicationReadingSchema);

export function articlePredicationCell(input: Omit<ArticlePredicationCell, "citedReferenceIds" | "internalTargets"> & Readonly<{
  citedReferenceIds: readonly string[];
  internalTargets: readonly string[];
}>): ArticlePredicationCell {
  return articlePredicationCellCarrier.assert({
    ...input,
    citedReferenceIds: [...input.citedReferenceIds],
    internalTargets: [...input.internalTargets],
  }, "article predication cell");
}

export function articlePredicationMetrics(input: Omit<ArticlePredicationMetrics, "tags" | "findings" | "cells"> & Readonly<{
  tags: readonly string[];
  findings: readonly ContentQualityFinding[];
  cells: readonly ArticlePredicationCell[];
}>): ArticlePredicationMetrics {
  return articlePredicationMetricsCarrier.assert({
    ...input,
    tags: [...input.tags],
    findings: input.findings.map((finding) => contentQualityFinding(finding)),
    cells: input.cells.map((cell) => articlePredicationCell(cell)),
  }, "article predication metrics");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(articles: readonly ArticlePredicationMetrics[], field: "citationCoverage" | "internalRelationCoverage" | "settlementDepth" | "graphCentrality"): number {
  return articles.length === 0 ? 0 : round(articles.reduce((sum, article) => sum + article[field], 0) / articles.length);
}

export function contentPredicationAggregate(articles: readonly ArticlePredicationMetrics[]): ContentPredicationAggregate {
  return contentPredicationAggregateCarrier.assert({
    claimCells: articles.reduce((sum, article) => sum + article.claimCellCount, 0),
    evidenceCells: articles.reduce((sum, article) => sum + article.evidenceCellCount, 0),
    sameSiteRelationCells: articles.reduce((sum, article) => sum + article.sameSiteRelationCellCount, 0),
    unsupportedClaimCells: articles.reduce((sum, article) => sum + article.unsupportedClaimCellCount, 0),
    averageCitationCoverage: average(articles, "citationCoverage"),
    averageInternalRelationCoverage: average(articles, "internalRelationCoverage"),
    averageSettlementDepth: average(articles, "settlementDepth"),
    averageGraphCentrality: average(articles, "graphCentrality"),
    articlesWithUnsupportedClaims: articles.filter((article) => article.unsupportedClaimCellCount > 0).length,
    articlesWithNoEvidenceCells: articles.filter((article) => article.evidenceCellCount === 0 && article.claimCellCount > 0).length,
    articlesWithNoRelationCells: articles.filter((article) => article.sameSiteRelationCellCount === 0 && article.claimCellCount > 0).length,
  }, "content predication aggregate");
}

export function contentPredicationReading(input: Readonly<{
  articles: readonly ArticlePredicationMetrics[];
  constraints?: readonly string[];
  plannedUses?: readonly string[];
}>): ContentPredicationReading {
  const articles = [...input.articles].map((article) => articlePredicationMetrics(article))
    .sort((left, right) => left.settlementDepth - right.settlementDepth || left.graphCentrality - right.graphCentrality || left.headline.localeCompare(right.headline));
  return contentPredicationReadingCarrier.assert({
    kind: "producing-content.content-predication-reading" as const,
    publicArticleCount: articles.length,
    aggregate: contentPredicationAggregate(articles),
    byArticle: articles,
    constraints: [...(input.constraints ?? CONTENT_PREDICATION_CONSTRAINTS)],
    plannedUses: [...(input.plannedUses ?? CONTENT_PREDICATION_PLANNED_USES)],
  }, "content predication reading");
}

export function articlePredicationMetricsTerm(input: ArticlePredicationMetrics): Tm {
  return carrierToTerm(jsonResource(articlePredicationMetricsCarrier.assert(input), "article predication metrics"));
}

export function contentPredicationReadingTerm(input: ContentPredicationReading): Tm {
  return carrierToTerm(jsonResource(contentPredicationReadingCarrier.assert(input), "content predication reading"));
}
