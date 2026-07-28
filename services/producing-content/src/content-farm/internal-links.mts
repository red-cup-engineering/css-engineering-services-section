/**
 * internal-links - same-site relation carriers for produced content.
 *
 * Site packages know how to discover and apply links; producing-content owns
 * the operator packet shape that lets those acts become portable content-farm
 * readings and IR terms.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const InternalLinkOpportunitySchema = { $id: "producing-content/content-farm/internal-link-opportunity", title: "InternalLinkOpportunity", additionalProperties: false, type: "object", required: ["sourceSlug", "sourcePath", "sourceHeadline", "targetSlug", "targetPath", "targetHeadline", "sharedTags", "confidence", "markdownLink", "insertionGuidance"], properties: { sourceSlug: { minLength: 1, type: "string" }, sourcePath: { minLength: 1, type: "string" }, sourceHeadline: { minLength: 1, type: "string" }, targetSlug: { minLength: 1, type: "string" }, targetPath: { minLength: 1, type: "string" }, targetHeadline: { minLength: 1, type: "string" }, sharedTags: { type: "array", items: { type: "string" } }, confidence: { minimum: 0, maximum: 1, type: "number" }, markdownLink: { minLength: 1, type: "string" }, insertionGuidance: { minLength: 1, type: "string" } } } as const;

export const InternalLinkOpportunityArticleSchema = { additionalProperties: false, type: "object", required: ["slug", "headline", "path", "currentInternalLinkCount", "opportunities"], properties: { slug: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, currentInternalLinkCount: { minimum: 0, type: "number" }, opportunities: { type: "array", items: InternalLinkOpportunitySchema } } } as const;

export const InternalLinkOpportunityReadingSchema = { $id: "producing-content/content-farm/internal-link-opportunity-reading", title: "InternalLinkOpportunityReading", additionalProperties: false, type: "object", required: ["kind", "opportunityCount", "articleCount", "byArticle", "constraints"], properties: { kind: { const: "producing-content.internal-link-opportunities" }, opportunityCount: { minimum: 0, type: "number" }, articleCount: { minimum: 0, type: "number" }, byArticle: { type: "array", items: InternalLinkOpportunityArticleSchema }, constraints: { type: "array", items: { type: "string" } } } } as const;

export const InternalLinkSuggestedPatchSchema = { additionalProperties: false, type: "object", required: ["beforeMarkdown", "afterMarkdown"], properties: { beforeMarkdown: { minLength: 1, type: "string" }, afterMarkdown: { minLength: 1, type: "string" } } } as const;

export const InternalLinkPlacementSchema = { $id: "producing-content/content-farm/internal-link-placement", title: "InternalLinkPlacement", additionalProperties: false, type: "object", required: ["sourceSlug", "sourcePath", "sourceHeadline", "targetSlug", "targetPath", "targetHeadline", "sharedTags", "confidence", "paragraphIndex", "paragraphPreview", "matchedTerms", "markdownLink", "insertionGuidance"], properties: { sourceSlug: { minLength: 1, type: "string" }, sourcePath: { minLength: 1, type: "string" }, sourceHeadline: { minLength: 1, type: "string" }, targetSlug: { minLength: 1, type: "string" }, targetPath: { minLength: 1, type: "string" }, targetHeadline: { minLength: 1, type: "string" }, sharedTags: { type: "array", items: { type: "string" } }, confidence: { minimum: 0, maximum: 1, type: "number" }, paragraphIndex: { minimum: 0, type: "number" }, paragraphPreview: { minLength: 1, type: "string" }, matchedTerms: { type: "array", items: { type: "string" } }, markdownLink: { minLength: 1, type: "string" }, suggestedPatch: InternalLinkSuggestedPatchSchema, insertionGuidance: { minLength: 1, type: "string" } } } as const;

export const InternalLinkPlacementArticleSchema = { additionalProperties: false, type: "object", required: ["slug", "headline", "path", "placements"], properties: { slug: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, placements: { type: "array", items: InternalLinkPlacementSchema } } } as const;

export const InternalLinkPlacementReadingSchema = { $id: "producing-content/content-farm/internal-link-placement-reading", title: "InternalLinkPlacementReading", additionalProperties: false, type: "object", required: ["kind", "placementCount", "articleCount", "byArticle", "constraints"], properties: { kind: { const: "producing-content.internal-link-placements" }, placementCount: { minimum: 0, type: "number" }, articleCount: { minimum: 0, type: "number" }, byArticle: { type: "array", items: InternalLinkPlacementArticleSchema }, constraints: { type: "array", items: { type: "string" } } } } as const;

export const DraftInternalLinkSuggestionSchema = { $id: "producing-content/content-farm/draft-internal-link-suggestion", title: "DraftInternalLinkSuggestion", additionalProperties: false, type: "object", required: ["targetSlug", "targetPath", "targetHeadline", "targetTags", "matchedTerms", "confidence", "markdownLink", "writingGuidance"], properties: { targetSlug: { minLength: 1, type: "string" }, targetPath: { minLength: 1, type: "string" }, targetHeadline: { minLength: 1, type: "string" }, section: { minLength: 1, type: "string" }, targetTags: { type: "array", items: { type: "string" } }, matchedTerms: { type: "array", items: { type: "string" } }, confidence: { minimum: 0, maximum: 1, type: "number" }, markdownLink: { minLength: 1, type: "string" }, writingGuidance: { minLength: 1, type: "string" } } } as const;

export const DraftInternalLinkGuidanceReadingSchema = { $id: "producing-content/content-farm/draft-internal-link-guidance-reading", title: "DraftInternalLinkGuidanceReading", additionalProperties: false, type: "object", required: ["kind", "term", "tags", "suggestionCount", "suggestions", "writingInstructions", "constraints"], properties: { kind: { const: "producing-content.draft-internal-link-guidance" }, term: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, tags: { type: "array", items: { type: "string" } }, suggestionCount: { minimum: 0, type: "number" }, suggestions: { type: "array", items: DraftInternalLinkSuggestionSchema }, writingInstructions: { type: "array", items: { type: "string" } }, constraints: { type: "array", items: { type: "string" } } } } as const;

export const ApplyInternalLinkPlacementInputSchema = { $id: "producing-content/content-farm/apply-internal-link-placement-input", title: "ApplyInternalLinkPlacementInput", additionalProperties: false, type: "object", required: ["sourceSlug", "targetSlug"], properties: { sourceSlug: { minLength: 1, type: "string" }, targetSlug: { minLength: 1, type: "string" }, paragraphIndex: { minimum: 0, type: "integer" }, expectedBeforeMarkdown: { minLength: 1, type: "string" } } } as const;

export const ApplyInternalLinkPlacementResultSchema = { $id: "producing-content/content-farm/apply-internal-link-placement-result", title: "ApplyInternalLinkPlacementResult", additionalProperties: false, type: "object", required: ["kind", "sourceSlug", "targetSlug", "path", "paragraphIndex", "beforeMarkdown", "afterMarkdown", "placement"], properties: { kind: { const: "producing-content.internal-link-placement.applied" }, sourceSlug: { minLength: 1, type: "string" }, targetSlug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, paragraphIndex: { minimum: 0, type: "number" }, beforeMarkdown: { minLength: 1, type: "string" }, afterMarkdown: { minLength: 1, type: "string" }, placement: InternalLinkPlacementSchema } } as const;

export type InternalLinkOpportunity = FromSchema<typeof InternalLinkOpportunitySchema>;
export type InternalLinkOpportunityArticle = FromSchema<typeof InternalLinkOpportunityArticleSchema>;
export type InternalLinkOpportunityReading = FromSchema<typeof InternalLinkOpportunityReadingSchema>;
export type InternalLinkSuggestedPatch = FromSchema<typeof InternalLinkSuggestedPatchSchema>;
export type InternalLinkPlacement = FromSchema<typeof InternalLinkPlacementSchema>;
export type InternalLinkPlacementArticle = FromSchema<typeof InternalLinkPlacementArticleSchema>;
export type InternalLinkPlacementReading = FromSchema<typeof InternalLinkPlacementReadingSchema>;
export type DraftInternalLinkSuggestion = FromSchema<typeof DraftInternalLinkSuggestionSchema>;
export type DraftInternalLinkGuidanceReading = FromSchema<typeof DraftInternalLinkGuidanceReadingSchema>;
export type ApplyInternalLinkPlacementInput = FromSchema<typeof ApplyInternalLinkPlacementInputSchema>;
export type ApplyInternalLinkPlacementResult = FromSchema<typeof ApplyInternalLinkPlacementResultSchema>;

export const internalLinkOpportunityCarrier = carrierFrom(InternalLinkOpportunitySchema);

export const internalLinkOpportunityReadingCarrier = carrierFrom(InternalLinkOpportunityReadingSchema);

export const internalLinkPlacementCarrier = carrierFrom(InternalLinkPlacementSchema);

export const internalLinkPlacementReadingCarrier = carrierFrom(InternalLinkPlacementReadingSchema);

export const draftInternalLinkSuggestionCarrier = carrierFrom(DraftInternalLinkSuggestionSchema);

export const draftInternalLinkGuidanceReadingCarrier = carrierFrom(DraftInternalLinkGuidanceReadingSchema);

export const applyInternalLinkPlacementInputCarrier = carrierFrom(ApplyInternalLinkPlacementInputSchema);

export const applyInternalLinkPlacementResultCarrier = carrierFrom(ApplyInternalLinkPlacementResultSchema);

export const applyInternalLinkPlacementJsonSchema = ApplyInternalLinkPlacementInputSchema;

export function internalLinkOpportunity(input: Omit<InternalLinkOpportunity, "sharedTags"> & Readonly<{
  sharedTags: readonly string[];
}>): InternalLinkOpportunity {
  return internalLinkOpportunityCarrier.assert({
    ...input,
    sharedTags: [...input.sharedTags],
  }, "internal link opportunity");
}

export function internalLinkOpportunityReading(input: Readonly<{
  byArticle: readonly Readonly<{
    slug: string;
    headline: string;
    path: string;
    currentInternalLinkCount: number;
    opportunities: readonly InternalLinkOpportunity[];
  }>[];
  constraints?: readonly string[];
}>): InternalLinkOpportunityReading {
  const byArticle = input.byArticle.map((article) => ({
    ...article,
    opportunities: [...article.opportunities],
  }));
  return internalLinkOpportunityReadingCarrier.assert({
    kind: "producing-content.internal-link-opportunities" as const,
    opportunityCount: byArticle.reduce((sum, article) => sum + article.opportunities.length, 0),
    articleCount: byArticle.length,
    byArticle,
    constraints: [...(input.constraints ?? [
      "This is a link-opportunity reading, not an automatic edit.",
      "Operators must place links only where the local paragraph warrants the target article.",
    ])],
  }, "internal link opportunity reading");
}

export function internalLinkPlacement(input: Omit<InternalLinkPlacement, "sharedTags" | "matchedTerms"> & Readonly<{
  sharedTags: readonly string[];
  matchedTerms: readonly string[];
}>): InternalLinkPlacement {
  return internalLinkPlacementCarrier.assert({
    ...input,
    sharedTags: [...input.sharedTags],
    matchedTerms: [...input.matchedTerms],
  }, "internal link placement");
}

export function internalLinkPlacementReading(input: Readonly<{
  byArticle: readonly Readonly<{
    slug: string;
    headline: string;
    path: string;
    placements: readonly InternalLinkPlacement[];
  }>[];
  constraints?: readonly string[];
}>): InternalLinkPlacementReading {
  const byArticle = input.byArticle.map((article) => ({
    ...article,
    placements: [...article.placements],
  }));
  return internalLinkPlacementReadingCarrier.assert({
    kind: "producing-content.internal-link-placements" as const,
    placementCount: byArticle.reduce((sum, article) => sum + article.placements.length, 0),
    articleCount: byArticle.length,
    byArticle,
    constraints: [...(input.constraints ?? [
      "This is a paragraph-level placement packet, not an automatic edit.",
      "Suggested patches do not add claims or rewrite copy.",
    ])],
  }, "internal link placement reading");
}

export function draftInternalLinkSuggestion(input: Omit<DraftInternalLinkSuggestion, "targetTags" | "matchedTerms"> & Readonly<{
  targetTags: readonly string[];
  matchedTerms: readonly string[];
}>): DraftInternalLinkSuggestion {
  return draftInternalLinkSuggestionCarrier.assert({
    ...input,
    targetTags: [...input.targetTags],
    matchedTerms: [...input.matchedTerms],
  }, "draft internal link suggestion");
}

export function draftInternalLinkGuidanceReading(input: Omit<DraftInternalLinkGuidanceReading, "kind" | "suggestionCount" | "tags" | "suggestions" | "writingInstructions" | "constraints"> & Readonly<{
  tags?: readonly string[];
  suggestions: readonly DraftInternalLinkSuggestion[];
  writingInstructions?: readonly string[];
  constraints?: readonly string[];
}>): DraftInternalLinkGuidanceReading {
  return draftInternalLinkGuidanceReadingCarrier.assert({
    ...input,
    kind: "producing-content.draft-internal-link-guidance" as const,
    tags: [...(input.tags ?? [])],
    suggestionCount: input.suggestions.length,
    suggestions: [...input.suggestions],
    writingInstructions: [...(input.writingInstructions ?? [
      "Use these targets while drafting, not as automatic insertions.",
      "Place links where the paragraph already makes the target topic explicit.",
    ])],
    constraints: [...(input.constraints ?? [
      "This guidance does not rewrite copy, create references, or satisfy a publication gate by itself.",
    ])],
  }, "draft internal link guidance reading");
}

export function appliedInternalLinkPlacement(input: Omit<ApplyInternalLinkPlacementResult, "kind">): ApplyInternalLinkPlacementResult {
  return applyInternalLinkPlacementResultCarrier.assert({
    ...input,
    kind: "producing-content.internal-link-placement.applied" as const,
  }, "applied internal link placement");
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function normalizeApplyInternalLinkPlacementInput(value: unknown): ApplyInternalLinkPlacementInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("internal-link placement input must be a JSON object");
  const record = value as Readonly<Record<string, unknown>>;
  const sourceSlug = maybeString(record["sourceSlug"]);
  const targetSlug = maybeString(record["targetSlug"]);
  if (sourceSlug === undefined) throw new TypeError("sourceSlug is required");
  if (targetSlug === undefined) throw new TypeError("targetSlug is required");
  const paragraphIndex = record["paragraphIndex"] === undefined ? undefined : Number(record["paragraphIndex"]);
  if (paragraphIndex !== undefined && (!Number.isInteger(paragraphIndex) || paragraphIndex < 0)) throw new TypeError("paragraphIndex must be a non-negative integer");
  return applyInternalLinkPlacementInputCarrier.assert({
    sourceSlug,
    targetSlug,
    ...(paragraphIndex === undefined ? {} : { paragraphIndex }),
    ...(record["expectedBeforeMarkdown"] === undefined ? {} : { expectedBeforeMarkdown: String(record["expectedBeforeMarkdown"]) }),
  }, "apply internal link placement input");
}

export function internalLinkOpportunityReadingTerm(input: InternalLinkOpportunityReading): Tm {
  return carrierToTerm(jsonResource(internalLinkOpportunityReadingCarrier.assert(input), "internal link opportunity reading"));
}

export function internalLinkPlacementReadingTerm(input: InternalLinkPlacementReading): Tm {
  return carrierToTerm(jsonResource(internalLinkPlacementReadingCarrier.assert(input), "internal link placement reading"));
}

export function draftInternalLinkGuidanceReadingTerm(input: DraftInternalLinkGuidanceReading): Tm {
  return carrierToTerm(jsonResource(draftInternalLinkGuidanceReadingCarrier.assert(input), "draft internal link guidance reading"));
}

export function applyInternalLinkPlacementInputTerm(input: ApplyInternalLinkPlacementInput): Tm {
  return carrierToTerm(jsonResource(applyInternalLinkPlacementInputCarrier.assert(input), "apply internal link placement input"));
}
