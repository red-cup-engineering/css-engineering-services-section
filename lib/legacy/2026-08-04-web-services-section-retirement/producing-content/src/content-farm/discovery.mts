/**
 * discovery - upstream coverage-discovery carriers for content farms.
 *
 * A site may decide how to read intake stores and corpus metadata. The farm
 * owns the reusable reading vocabulary: coverage gaps, candidate keywords,
 * candidate sources, external trend folds, and the combined discovery reading.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const ContentCoverageGapSchema = { $id: "producing-content/content-farm/discovery/coverage-gap", title: "ContentCoverageGap", additionalProperties: false, type: "object", required: ["kind", "term", "beat", "priority", "intakeSupport", "coverage", "gapScore", "evidence"], properties: { kind: { const: "producing-content.content-farm.discovery.coverage-gap" }, term: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, priority: { type: "number" }, intakeSupport: { minimum: 0, type: "integer" }, coverage: { minimum: 0, type: "integer" }, gapScore: { minimum: 0, type: "number" }, evidence: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const CandidateContentKeywordSchema = { $id: "producing-content/content-farm/discovery/candidate-keyword", title: "CandidateContentKeyword", additionalProperties: false, type: "object", required: ["kind", "phrase", "beat", "documentFrequency", "sourceBreadth", "score", "evidence"], properties: { kind: { const: "producing-content.content-farm.discovery.candidate-keyword" }, phrase: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, documentFrequency: { minimum: 0, type: "integer" }, sourceBreadth: { minimum: 0, type: "integer" }, score: { minimum: 0, type: "number" }, evidence: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const CandidateContentSourceSchema = { $id: "producing-content/content-farm/discovery/candidate-source", title: "CandidateContentSource", additionalProperties: false, type: "object", required: ["kind", "domain", "citationCount", "citingSlugs", "note"], properties: { kind: { const: "producing-content.content-farm.discovery.candidate-source" }, domain: { minLength: 1, type: "string" }, citationCount: { minimum: 0, type: "integer" }, citingSlugs: { type: "array", items: { minLength: 1, type: "string" } }, note: { minLength: 1, type: "string" } } } as const;

export const ContentTrendSignalSchema = { $id: "producing-content/content-farm/discovery/trend-signal", title: "ContentTrendSignal", additionalProperties: false, type: "object", required: ["term", "alreadyCovered"], properties: { term: { minLength: 1, type: "string" }, traffic: { minLength: 1, type: "string" }, alreadyCovered: { type: "boolean" }, beat: { minLength: 1, type: "string" } } } as const;

export const ContentTrendsReadingSchema = { $id: "producing-content/content-farm/discovery/trends-reading", title: "ContentTrendsReading", additionalProperties: false, type: "object", required: ["probed", "novel", "reinforcing"], properties: { probed: { type: "boolean" }, source: { minLength: 1, type: "string" }, obstruction: { minLength: 1, type: "string" }, novel: { type: "array", items: { title: "ContentTrendSignalValue", additionalProperties: false, type: "object", required: ContentTrendSignalSchema.required, properties: ContentTrendSignalSchema.properties } }, reinforcing: { type: "array", items: { title: "ContentTrendSignalValue", additionalProperties: false, type: "object", required: ContentTrendSignalSchema.required, properties: ContentTrendSignalSchema.properties } } } } as const;

export const ContentDiscoveryReadingSchema = { $id: "producing-content/content-farm/discovery/reading", title: "ContentDiscoveryReading", additionalProperties: false, type: "object", required: ["kind", "property", "generatedAt", "configPath", "contentDir", "intakeItemCount", "publishedPostCount", "coverageGaps", "candidateKeywords", "candidateSources", "trends", "constraints"], properties: { kind: { const: "producing-content.content-farm.discovery" }, property: { minLength: 1, type: "string" }, generatedAt: { minLength: 1, type: "string" }, configPath: { minLength: 1, type: "string" }, contentDir: { minLength: 1, type: "string" }, intakeItemCount: { minimum: 0, type: "integer" }, publishedPostCount: { minimum: 0, type: "integer" }, coverageGaps: { type: "array", items: { title: "ContentCoverageGapValue", additionalProperties: false, type: "object", required: ContentCoverageGapSchema.required, properties: ContentCoverageGapSchema.properties } }, candidateKeywords: { type: "array", items: { title: "CandidateContentKeywordValue", additionalProperties: false, type: "object", required: CandidateContentKeywordSchema.required, properties: CandidateContentKeywordSchema.properties } }, candidateSources: { type: "array", items: { title: "CandidateContentSourceValue", additionalProperties: false, type: "object", required: CandidateContentSourceSchema.required, properties: CandidateContentSourceSchema.properties } }, trends: { title: "ContentTrendsReadingValue", additionalProperties: false, type: "object", required: ContentTrendsReadingSchema.required, properties: ContentTrendsReadingSchema.properties }, constraints: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type ContentCoverageGap = FromSchema<typeof ContentCoverageGapSchema>;
export type CandidateContentKeyword = FromSchema<typeof CandidateContentKeywordSchema>;
export type CandidateContentSource = FromSchema<typeof CandidateContentSourceSchema>;
export type ContentTrendSignal = FromSchema<typeof ContentTrendSignalSchema>;
export type ContentTrendsReading = FromSchema<typeof ContentTrendsReadingSchema>;
export type ContentDiscoveryReading = FromSchema<typeof ContentDiscoveryReadingSchema>;

export const contentCoverageGapCarrier = carrierFrom(ContentCoverageGapSchema);

export const candidateContentKeywordCarrier = carrierFrom(CandidateContentKeywordSchema);

export const candidateContentSourceCarrier = carrierFrom(CandidateContentSourceSchema);

export const contentTrendsReadingCarrier = carrierFrom(ContentTrendsReadingSchema);

export const contentDiscoveryReadingCarrier = carrierFrom(ContentDiscoveryReadingSchema);

export function contentCoverageGap(input: Omit<ContentCoverageGap, "kind">): ContentCoverageGap {
  return contentCoverageGapCarrier.assert({
    kind: "producing-content.content-farm.discovery.coverage-gap" as const,
    ...input,
    evidence: [...input.evidence],
  }, "content coverage gap");
}

export function contentCoverageGapTerm(input: ContentCoverageGap): Tm {
  return carrierToTerm(jsonResource(contentCoverageGapCarrier.assert(input), "content coverage gap"));
}

export function candidateContentKeyword(input: Omit<CandidateContentKeyword, "kind">): CandidateContentKeyword {
  return candidateContentKeywordCarrier.assert({
    kind: "producing-content.content-farm.discovery.candidate-keyword" as const,
    ...input,
    evidence: [...input.evidence],
  }, "candidate content keyword");
}

export function candidateContentKeywordTerm(input: CandidateContentKeyword): Tm {
  return carrierToTerm(jsonResource(candidateContentKeywordCarrier.assert(input), "candidate content keyword"));
}

export function candidateContentSource(input: Omit<CandidateContentSource, "kind">): CandidateContentSource {
  return candidateContentSourceCarrier.assert({
    kind: "producing-content.content-farm.discovery.candidate-source" as const,
    ...input,
    citingSlugs: [...input.citingSlugs],
  }, "candidate content source");
}

export function candidateContentSourceTerm(input: CandidateContentSource): Tm {
  return carrierToTerm(jsonResource(candidateContentSourceCarrier.assert(input), "candidate content source"));
}

export function contentTrendsReading(input: ContentTrendsReading): ContentTrendsReading {
  return contentTrendsReadingCarrier.assert({
    ...input,
    novel: [...input.novel],
    reinforcing: [...input.reinforcing],
  }, "content trends reading");
}

export function contentTrendsReadingTerm(input: ContentTrendsReading): Tm {
  return carrierToTerm(jsonResource(contentTrendsReadingCarrier.assert(input), "content trends reading"));
}

export function contentDiscoveryReading(input: Omit<ContentDiscoveryReading, "kind">): ContentDiscoveryReading {
  return contentDiscoveryReadingCarrier.assert({
    kind: "producing-content.content-farm.discovery" as const,
    ...input,
    coverageGaps: [...input.coverageGaps],
    candidateKeywords: [...input.candidateKeywords],
    candidateSources: [...input.candidateSources],
    trends: contentTrendsReading(input.trends),
    constraints: [...input.constraints],
  }, "content discovery reading");
}

export function contentDiscoveryReadingTerm(input: ContentDiscoveryReading): Tm {
  return carrierToTerm(jsonResource(contentDiscoveryReadingCarrier.assert(input), "content discovery reading"));
}
