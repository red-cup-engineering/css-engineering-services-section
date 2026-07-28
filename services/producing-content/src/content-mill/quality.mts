/**
 * quality - privacy-preserving content-quality carriers.
 *
 * Sites own their article parsing and diagnostic heuristics. The mill owns the
 * article-quality packet and the aggregate reading over public article quality.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import { ContentQualitySeveritySchema } from "../content-farm/revision-packets.mjs";
import {
  AccountableAttentionFindingSchema,
  accountableAttentionFindingCarrier,
  type AccountableAttentionFinding,
} from "../topology/accountable-attention.mjs";

export const ContentQualityFindingSchema = { $id: "producing-content/content-mill/content-quality-finding", title: "ContentQualityFinding", additionalProperties: false, type: "object", required: ["severity", "code", "message"], properties: { severity: ContentQualitySeveritySchema, code: { minLength: 1, type: "string" }, message: { minLength: 1, type: "string" } } } as const;

export const ArticleContentQualitySchema = { $id: "producing-content/content-mill/article-content-quality", title: "ArticleContentQuality", additionalProperties: false, type: "object", required: ["slug", "path", "headline", "tags", "score", "wordCount", "h2Count", "internalLinkCount", "internalLinkTargets", "suggestedInternalTargets", "externalLinkCount", "referenceCount", "citedReferenceCount", "referenceDomainCount", "citationDomainDiversity", "seoTermOccurrences", "seoTermDensity", "seoTermInFirstParagraph", "seoTermInH2", "topicDepth", "malformedH2Count", "headlineSummaryOverlap", "accountableAttentionFailureCount", "accountableAttentionFindings", "correctionCount", "correctionSurfaceCoverage", "implicitCorrectionSurfaceCount", "incompleteCorrectionSurfaceCount", "missingCorrectionSurfaces", "findings"], properties: { slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, section: { minLength: 1, type: "string" }, tags: { type: "array", items: { minLength: 1, type: "string" } }, score: { minimum: 0, maximum: 100, type: "number" }, wordCount: { minimum: 0, type: "integer" }, h2Count: { minimum: 0, type: "integer" }, internalLinkCount: { minimum: 0, type: "integer" }, internalLinkTargets: { type: "array", items: { minLength: 1, type: "string" } }, suggestedInternalTargets: { type: "array", items: { minLength: 1, type: "string" } }, externalLinkCount: { minimum: 0, type: "integer" }, referenceCount: { minimum: 0, type: "integer" }, citedReferenceCount: { minimum: 0, type: "integer" }, referenceDomainCount: { minimum: 0, type: "integer" }, citationDomainDiversity: { minimum: 0, maximum: 1, type: "number" }, seoTerm: { minLength: 1, type: "string" }, seoTermOccurrences: { minimum: 0, type: "integer" }, seoTermDensity: { minimum: 0, type: "number" }, seoTermInFirstParagraph: { type: "boolean" }, seoTermInH2: { type: "boolean" }, topicDepth: { minimum: 0, maximum: 1, type: "number" }, malformedH2Count: { minimum: 0, type: "integer" }, headlineSummaryOverlap: { minimum: 0, maximum: 1, type: "number" }, accountableAttentionFailureCount: { minimum: 0, type: "integer" }, accountableAttentionFindings: { type: "array", items: AccountableAttentionFindingSchema }, correctionCount: { minimum: 0, type: "integer" }, correctionSurfaceCoverage: { minimum: 0, maximum: 1, type: "number" }, implicitCorrectionSurfaceCount: { minimum: 0, type: "integer" }, incompleteCorrectionSurfaceCount: { minimum: 0, type: "integer" }, missingCorrectionSurfaces: { type: "array", items: { minLength: 1, type: "string" } }, findings: { type: "array", items: ContentQualityFindingSchema } } } as const;

export const ContentQualityAggregateSchema = { $id: "producing-content/content-mill/content-quality-aggregate", title: "ContentQualityAggregate", additionalProperties: false, type: "object", required: ["articlesWithNoInternalLinks", "articlesWithThinReferences", "articlesWithSingleReferenceDomain", "articlesMissingSeoPlacement", "articlesWithSeoTermStuffing", "articlesWithThinTopicDepth", "articlesWithMalformedH2", "articlesWithAccountableAttentionFailures", "articlesWithCorrections", "articlesWithImplicitCorrectionSurfaces", "articlesWithIncompleteCorrectionSurfaces"], properties: { articlesWithNoInternalLinks: { minimum: 0, type: "integer" }, articlesWithThinReferences: { minimum: 0, type: "integer" }, articlesWithSingleReferenceDomain: { minimum: 0, type: "integer" }, articlesMissingSeoPlacement: { minimum: 0, type: "integer" }, articlesWithSeoTermStuffing: { minimum: 0, type: "integer" }, articlesWithThinTopicDepth: { minimum: 0, type: "integer" }, articlesWithMalformedH2: { minimum: 0, type: "integer" }, articlesWithAccountableAttentionFailures: { minimum: 0, type: "integer" }, articlesWithCorrections: { minimum: 0, type: "integer" }, articlesWithImplicitCorrectionSurfaces: { minimum: 0, type: "integer" }, articlesWithIncompleteCorrectionSurfaces: { minimum: 0, type: "integer" } } } as const;

export const ContentQualityReadingSchema = { $id: "producing-content/content-mill/content-quality-reading", title: "ContentQualityReading", additionalProperties: false, type: "object", required: ["kind", "publicArticleCount", "averageScore", "attentionCount", "warningCount", "blockerCount", "byArticle", "aggregate", "constraints", "plannedUses"], properties: { kind: { const: "producing-content.content-quality-reading" }, publicArticleCount: { minimum: 0, type: "integer" }, averageScore: { minimum: 0, maximum: 100, type: "number" }, attentionCount: { minimum: 0, type: "integer" }, warningCount: { minimum: 0, type: "integer" }, blockerCount: { minimum: 0, type: "integer" }, byArticle: { type: "array", items: ArticleContentQualitySchema }, aggregate: ContentQualityAggregateSchema, constraints: { type: "array", items: { minLength: 1, type: "string" } }, plannedUses: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type ContentQualityFinding = FromSchema<typeof ContentQualityFindingSchema>;
export type ArticleContentQuality = FromSchema<typeof ArticleContentQualitySchema>;
export type ContentQualityAggregate = FromSchema<typeof ContentQualityAggregateSchema>;
export type ContentQualityReading = FromSchema<typeof ContentQualityReadingSchema>;

export const CONTENT_QUALITY_CONSTRAINTS = Object.freeze([
  "Folded from public article Markdown, frontmatter, CSL references, taxonomy, and same-site link topology only.",
  "No page views, IP addresses, user agents, cookies, browser fingerprints, or reader identifiers are used by this quality reading.",
  "This is an editorial diagnostic, not a publication gate; standards review remains the publication gate.",
]);

export const CONTENT_QUALITY_PLANNED_USES = Object.freeze([
  "Prioritize internal-link enrichment work.",
  "Find articles with thin or concentrated reference support.",
  "Check whether headlines, summaries, SEO terms, and body structure preserve the article warrant.",
  "Surface accountable-attention failures from IETF-conformant clickbait contracts.",
  "Track correction propagation coverage without using visitor data.",
  "Give human operators and agents a privacy-preserving content-quality backlog.",
]);

export const contentQualityFindingCarrier = carrierFrom(ContentQualityFindingSchema);

export const articleContentQualityCarrier = carrierFrom(ArticleContentQualitySchema);

export const contentQualityAggregateCarrier = carrierFrom(ContentQualityAggregateSchema);

export const contentQualityReadingCarrier = carrierFrom(ContentQualityReadingSchema);

export function contentQualityFinding(input: ContentQualityFinding): ContentQualityFinding {
  return contentQualityFindingCarrier.assert(input, "content quality finding");
}

export function articleContentQuality(input: Omit<ArticleContentQuality,
  "tags" | "internalLinkTargets" | "suggestedInternalTargets" | "accountableAttentionFailureCount" | "accountableAttentionFindings" | "missingCorrectionSurfaces" | "findings"
> & Readonly<{
  tags: readonly string[];
  internalLinkTargets: readonly string[];
  suggestedInternalTargets: readonly string[];
  accountableAttentionFindings: readonly AccountableAttentionFinding[];
  missingCorrectionSurfaces: readonly string[];
  findings: readonly ContentQualityFinding[];
}>): ArticleContentQuality {
  const accountableAttentionFindings = input.accountableAttentionFindings
    .map((finding) => accountableAttentionFindingCarrier.assert(finding, "accountable attention finding"));
  return articleContentQualityCarrier.assert({
    ...input,
    tags: [...input.tags],
    internalLinkTargets: [...input.internalLinkTargets],
    suggestedInternalTargets: [...input.suggestedInternalTargets],
    accountableAttentionFailureCount: accountableAttentionFindings.filter((finding) => finding.charge === "fail").length,
    accountableAttentionFindings,
    missingCorrectionSurfaces: [...input.missingCorrectionSurfaces],
    findings: input.findings.map((finding) => contentQualityFinding(finding)),
  }, "article content quality");
}

export function contentQualityAggregate(articles: readonly ArticleContentQuality[]): ContentQualityAggregate {
  return contentQualityAggregateCarrier.assert({
    articlesWithNoInternalLinks: articles.filter((article) => article.internalLinkCount === 0).length,
    articlesWithThinReferences: articles.filter((article) => article.referenceCount < 2).length,
    articlesWithSingleReferenceDomain: articles.filter((article) => article.referenceCount >= 3 && article.referenceDomainCount <= 1).length,
    articlesMissingSeoPlacement: articles.filter((article) => !article.seoTermInFirstParagraph || !article.seoTermInH2).length,
    articlesWithSeoTermStuffing: articles.filter((article) => article.seoTermDensity > 1.25 || article.seoTermOccurrences > 8).length,
    articlesWithThinTopicDepth: articles.filter((article) => article.topicDepth < 0.5).length,
    articlesWithMalformedH2: articles.filter((article) => article.malformedH2Count > 0).length,
    articlesWithAccountableAttentionFailures: articles.filter((article) => article.accountableAttentionFailureCount > 0).length,
    articlesWithCorrections: articles.filter((article) => article.correctionCount > 0).length,
    articlesWithImplicitCorrectionSurfaces: articles.filter((article) => article.implicitCorrectionSurfaceCount > 0).length,
    articlesWithIncompleteCorrectionSurfaces: articles.filter((article) => article.incompleteCorrectionSurfaceCount > 0).length,
  }, "content quality aggregate");
}

export function contentQualityReading(input: Readonly<{
  articles: readonly ArticleContentQuality[];
  constraints?: readonly string[];
  plannedUses?: readonly string[];
}>): ContentQualityReading {
  const articles = [...input.articles].map((article) => articleContentQuality(article))
    .sort((left, right) => left.score - right.score || left.headline.localeCompare(right.headline));
  return contentQualityReadingCarrier.assert({
    kind: "producing-content.content-quality-reading" as const,
    publicArticleCount: articles.length,
    averageScore: articles.length === 0 ? 0 : Math.round((articles.reduce((sum, article) => sum + article.score, 0) / articles.length) * 100) / 100,
    attentionCount: articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "attention").length, 0),
    warningCount: articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "warning").length, 0),
    blockerCount: articles.reduce((sum, article) => sum + article.findings.filter((finding) => finding.severity === "blocker").length, 0),
    byArticle: articles,
    aggregate: contentQualityAggregate(articles),
    constraints: [...(input.constraints ?? CONTENT_QUALITY_CONSTRAINTS)],
    plannedUses: [...(input.plannedUses ?? CONTENT_QUALITY_PLANNED_USES)],
  }, "content quality reading");
}

export function articleContentQualityTerm(input: ArticleContentQuality): Tm {
  return carrierToTerm(jsonResource(articleContentQualityCarrier.assert(input), "article content quality"));
}

export function contentQualityReadingTerm(input: ContentQualityReading): Tm {
  return carrierToTerm(jsonResource(contentQualityReadingCarrier.assert(input), "content quality reading"));
}
