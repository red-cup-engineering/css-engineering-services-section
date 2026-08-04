/**
 * source-cycle-packets - candidate post-processing packets.
 *
 * A source cycle can draft candidates, then perform conservative local
 * post-processing: normalize references, annotate draft link guidance, or
 * restore an existing manuscript when a candidate collides with a stored path.
 * The filesystem work is site-specific; these packets are the reusable
 * producing-content carrier vocabulary for reporting those acts.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const SourceCycleCandidateReferenceNormalizationSchema = { $id: "producing-content/content-farm/source-cycle/references", title: "SourceCycleCandidateReferenceNormalization", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "changed", "sourceUrlCount", "referenceCount"], properties: { kind: { const: "producing-content.source-cycle.references" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, changed: { type: "boolean" }, sourceUrlCount: { minimum: 0, type: "number" }, referenceCount: { minimum: 0, type: "number" } } } as const;

export const SourceCycleDraftInternalLinkSuggestionSchema = { $id: "producing-content/content-farm/source-cycle/draft-internal-link-suggestion", title: "SourceCycleDraftInternalLinkSuggestion", additionalProperties: false, type: "object", required: ["targetSlug", "targetPath", "targetHeadline", "matchedTerms", "confidence", "markdownLink", "writingGuidance"], properties: { targetSlug: { minLength: 1, type: "string" }, targetPath: { minLength: 1, type: "string" }, targetHeadline: { minLength: 1, type: "string" }, matchedTerms: { type: "array", items: { type: "string" } }, confidence: { minimum: 0, maximum: 1, type: "number" }, markdownLink: { minLength: 1, type: "string" }, writingGuidance: { minLength: 1, type: "string" } } } as const;

export const SourceCycleCandidateDraftInternalLinkGuidanceSchema = { $id: "producing-content/content-farm/source-cycle/draft-internal-link-guidance", title: "SourceCycleCandidateDraftInternalLinkGuidance", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "changed", "suggestionCount", "suggestions"], properties: { kind: { const: "producing-content.source-cycle.draft-internal-link-guidance" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, changed: { type: "boolean" }, suggestionCount: { minimum: 0, type: "number" }, suggestions: { type: "array", items: SourceCycleDraftInternalLinkSuggestionSchema } } } as const;

export const SourceCycleCandidateWriteCollisionSchema = { $id: "producing-content/content-farm/source-cycle/candidate-write-collision", title: "SourceCycleCandidateWriteCollision", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "existingDraft", "restored", "instruction"], properties: { kind: { const: "producing-content.source-cycle.candidate-write-collision" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, existingDraft: { type: "boolean" }, existingTitle: { minLength: 1, type: "string" }, runTitle: { minLength: 1, type: "string" }, restored: { type: "boolean" }, instruction: { minLength: 1, type: "string" } } } as const;

export type SourceCycleCandidateReferenceNormalization = FromSchema<typeof SourceCycleCandidateReferenceNormalizationSchema>;
export type SourceCycleDraftInternalLinkSuggestion = FromSchema<typeof SourceCycleDraftInternalLinkSuggestionSchema>;
export type SourceCycleCandidateDraftInternalLinkGuidance = FromSchema<typeof SourceCycleCandidateDraftInternalLinkGuidanceSchema>;
export type SourceCycleCandidateWriteCollision = FromSchema<typeof SourceCycleCandidateWriteCollisionSchema>;

export const sourceCycleCandidateReferenceNormalizationCarrier = carrierFrom(SourceCycleCandidateReferenceNormalizationSchema);

export const sourceCycleDraftInternalLinkSuggestionCarrier = carrierFrom(SourceCycleDraftInternalLinkSuggestionSchema);

export const sourceCycleCandidateDraftInternalLinkGuidanceCarrier = carrierFrom(SourceCycleCandidateDraftInternalLinkGuidanceSchema);

export const sourceCycleCandidateWriteCollisionCarrier = carrierFrom(SourceCycleCandidateWriteCollisionSchema);

export function sourceCycleCandidateReferenceNormalization(input: Omit<SourceCycleCandidateReferenceNormalization, "kind">): SourceCycleCandidateReferenceNormalization {
  return sourceCycleCandidateReferenceNormalizationCarrier.assert({
    ...input,
    kind: "producing-content.source-cycle.references" as const,
  }, "source cycle candidate reference normalization");
}

export function sourceCycleDraftInternalLinkSuggestion(input: Omit<SourceCycleDraftInternalLinkSuggestion, "matchedTerms"> & Readonly<{
  matchedTerms: readonly string[];
}>): SourceCycleDraftInternalLinkSuggestion {
  return sourceCycleDraftInternalLinkSuggestionCarrier.assert({
    ...input,
    matchedTerms: [...input.matchedTerms],
  }, "source cycle draft internal link suggestion");
}

export function sourceCycleCandidateDraftInternalLinkGuidance(input: Omit<SourceCycleCandidateDraftInternalLinkGuidance, "kind" | "suggestionCount" | "suggestions"> & Readonly<{
  suggestions: readonly SourceCycleDraftInternalLinkSuggestion[];
}>): SourceCycleCandidateDraftInternalLinkGuidance {
  return sourceCycleCandidateDraftInternalLinkGuidanceCarrier.assert({
    ...input,
    kind: "producing-content.source-cycle.draft-internal-link-guidance" as const,
    suggestionCount: input.suggestions.length,
    suggestions: [...input.suggestions],
  }, "source cycle candidate draft internal link guidance");
}

export function sourceCycleCandidateWriteCollision(input: Omit<SourceCycleCandidateWriteCollision, "kind">): SourceCycleCandidateWriteCollision {
  return sourceCycleCandidateWriteCollisionCarrier.assert({
    ...input,
    kind: "producing-content.source-cycle.candidate-write-collision" as const,
  }, "source cycle candidate write collision");
}

export function sourceCycleCandidateReferenceNormalizationTerm(input: SourceCycleCandidateReferenceNormalization): Tm {
  return carrierToTerm(jsonResource(sourceCycleCandidateReferenceNormalizationCarrier.assert(input), "source cycle candidate reference normalization"));
}

export function sourceCycleCandidateDraftInternalLinkGuidanceTerm(input: SourceCycleCandidateDraftInternalLinkGuidance): Tm {
  return carrierToTerm(jsonResource(sourceCycleCandidateDraftInternalLinkGuidanceCarrier.assert(input), "source cycle candidate draft internal link guidance"));
}

export function sourceCycleCandidateWriteCollisionTerm(input: SourceCycleCandidateWriteCollision): Tm {
  return carrierToTerm(jsonResource(sourceCycleCandidateWriteCollisionCarrier.assert(input), "source cycle candidate write collision"));
}
