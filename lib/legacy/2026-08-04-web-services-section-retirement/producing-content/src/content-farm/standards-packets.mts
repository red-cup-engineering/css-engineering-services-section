/**
 * standards-packets - editorial standards review and manuscript action packets.
 *
 * Sites own their actual standards gates and manuscript mutations. The farm
 * owns the reusable packets that report those editorial actions to operators
 * and agents.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const StandardsSeveritySchema = { anyOf: [{ const: "error" }, { const: "warning" }] } as const;

export const StandardsGateSchema = { anyOf: [{ const: "reported" }, { const: "fact-checked" }, { const: "copy-edited" }, { const: "standards-cleared" }, { const: "published" }] } as const;

export const StandardsFindingSchema = { additionalProperties: false, type: "object", required: ["severity", "gate", "code", "message"], properties: { severity: StandardsSeveritySchema, gate: StandardsGateSchema, code: { minLength: 1, type: "string" }, message: { minLength: 1, type: "string" } } } as const;

export const StandardsReviewSchema = { $id: "producing-content/content-farm/standards-review", title: "StandardsReview", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "publishable", "draft", "wordCount", "referenceCount", "findings"], properties: { kind: { const: "producing-content.standards-review" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, publishable: { type: "boolean" }, draft: { type: "boolean" }, wordCount: { minimum: 0, type: "number" }, referenceCount: { minimum: 0, type: "number" }, seoTerm: { minLength: 1, type: "string" }, findings: { type: "array", items: StandardsFindingSchema } } } as const;

export const PublishManuscriptResultSchema = { $id: "producing-content/content-farm/manuscript/published", title: "PublishManuscriptResult", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "draft", "review"], properties: { kind: { const: "producing-content.manuscript.published" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, draft: { const: false }, review: StandardsReviewSchema } } as const;

export const ApplyStandardsDefaultsResultSchema = { $id: "producing-content/content-farm/standards-defaults/applied", title: "ApplyStandardsDefaultsResult", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "changed", "review"], properties: { kind: { const: "producing-content.standards-defaults.applied" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, changed: { type: "array", items: { type: "string" } }, review: StandardsReviewSchema } } as const;

export const NormalizeManuscriptReferencesResultSchema = { $id: "producing-content/content-farm/manuscript/references-normalized", title: "NormalizeManuscriptReferencesResult", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "changed", "sourceUrlCount", "referenceCount", "review"], properties: { kind: { const: "producing-content.manuscript.references.normalized" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, changed: { type: "array", items: { type: "string" } }, sourceUrlCount: { minimum: 0, type: "number" }, referenceCount: { minimum: 0, type: "number" }, review: StandardsReviewSchema } } as const;

export const RepairManuscriptHeadingChangeSchema = { additionalProperties: false, type: "object", required: ["before", "heading", "paragraph"], properties: { before: { minLength: 1, type: "string" }, heading: { minLength: 1, type: "string" }, paragraph: { minLength: 1, type: "string" } } } as const;

export const RepairManuscriptHeadingsResultSchema = { $id: "producing-content/content-farm/manuscript/headings-repaired", title: "RepairManuscriptHeadingsResult", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "changed", "review"], properties: { kind: { const: "producing-content.manuscript.headings.repaired" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, changed: { type: "array", items: RepairManuscriptHeadingChangeSchema }, review: StandardsReviewSchema } } as const;

export const RepairManuscriptSeoHeadingChangeSchema = { additionalProperties: false, type: "object", required: ["before", "heading"], properties: { before: { minLength: 1, type: "string" }, heading: { minLength: 1, type: "string" } } } as const;

export const RepairManuscriptSeoHeadingResultSchema = { $id: "producing-content/content-farm/manuscript/seo-heading-repaired", title: "RepairManuscriptSeoHeadingResult", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "changed", "review"], properties: { kind: { const: "producing-content.manuscript.seo-heading.repaired" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, seoTerm: { minLength: 1, type: "string" }, changed: { type: "array", items: RepairManuscriptSeoHeadingChangeSchema }, review: StandardsReviewSchema } } as const;

export const EditorialStandardsGateCountSchema = { $id: "producing-content/content-farm/editorial-standards/gate-count", title: "EditorialStandardsGateCount", additionalProperties: false, type: "object", required: ["cleared", "contested", "rejected"], properties: { cleared: { minimum: 0, type: "integer" }, contested: { minimum: 0, type: "integer" }, rejected: { minimum: 0, type: "integer" } } } as const;

const EditorialStandardsGateCountValueSchema = { title: "EditorialStandardsGateCountValue", additionalProperties: false, type: "object", required: EditorialStandardsGateCountSchema.required, properties: EditorialStandardsGateCountSchema.properties } as const;

export const EditorialStandardsPolicySchema = { $id: "producing-content/content-farm/editorial-standards/policy", title: "EditorialStandardsPolicy", additionalProperties: false, type: "object", required: ["title", "body"], properties: { title: { minLength: 1, type: "string" }, body: { minLength: 1, type: "string" } } } as const;

export const EditorialStandardsReadingSchema = { $id: "producing-content/content-farm/editorial-standards", title: "EditorialStandardsReading", additionalProperties: false, type: "object", required: ["kind", "publication", "publicAuditUrl", "publicArticleCount", "publishableAuditCount", "gateCounts", "policies"], properties: { kind: { const: "producing-content.editorial-standards" }, publication: { minLength: 1, type: "string" }, publicAuditUrl: { minLength: 1, type: "string" }, publicArticleCount: { minimum: 0, type: "integer" }, publishableAuditCount: { minimum: 0, type: "integer" }, gateCounts: { type: "object", additionalProperties: EditorialStandardsGateCountValueSchema }, policies: { type: "array", items: EditorialStandardsPolicySchema } } } as const;

export const OperatorManuscriptWorkStateSchema = { anyOf: [{ const: "needs-editing" }, { const: "ready-to-publish" }, { const: "published-standards-clear" }] } as const;

export const OperatorManuscriptSuggestedActionSchema = { anyOf: [{ const: "normalize-references" }, { const: "apply-standards-defaults" }, { const: "repair-headings" }, { const: "repair-seo-heading" }, { const: "review-copy" }, { const: "publish" }, { const: "none" }] } as const;

export const OperatorManuscriptStandardsSummarySchema = { $id: "producing-content/content-farm/operator-manuscript/standards-summary", title: "OperatorManuscriptStandardsSummary", additionalProperties: false, type: "object", required: ["publishable", "wordCount", "referenceCount", "errorCount", "warningCount", "findings"], properties: { publishable: { type: "boolean" }, wordCount: { minimum: 0, type: "integer" }, referenceCount: { minimum: 0, type: "integer" }, seoTerm: { minLength: 1, type: "string" }, errorCount: { minimum: 0, type: "integer" }, warningCount: { minimum: 0, type: "integer" }, findings: { type: "array", items: StandardsFindingSchema } } } as const;

const OperatorManuscriptStandardsSummaryValueSchema = { title: "OperatorManuscriptStandardsSummaryValue", additionalProperties: false, type: "object", required: OperatorManuscriptStandardsSummarySchema.required, properties: OperatorManuscriptStandardsSummarySchema.properties } as const;

export const OperatorManuscriptReadingSchema = { $id: "producing-content/content-farm/operator-manuscript", title: "OperatorManuscriptReading", additionalProperties: false, type: "object", required: ["kind", "slug", "title", "draft", "publicUrl", "standardsUrl", "standardsHtmlUrl", "publishUrl", "publishHtmlUrl", "standardsDefaultsUrl", "standardsDefaultsHtmlUrl", "referencesNormalizeUrl", "referencesNormalizeHtmlUrl", "headingsRepairUrl", "headingsRepairHtmlUrl", "seoHeadingRepairUrl", "seoHeadingRepairHtmlUrl", "workState", "standards"], properties: { kind: { const: "producing-content.operator-manuscript" }, slug: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, draft: { type: "boolean" }, date: { minLength: 1, type: "string" }, publicUrl: { minLength: 1, type: "string" }, standardsUrl: { minLength: 1, type: "string" }, standardsHtmlUrl: { minLength: 1, type: "string" }, publishUrl: { minLength: 1, type: "string" }, publishHtmlUrl: { minLength: 1, type: "string" }, standardsDefaultsUrl: { minLength: 1, type: "string" }, standardsDefaultsHtmlUrl: { minLength: 1, type: "string" }, referencesNormalizeUrl: { minLength: 1, type: "string" }, referencesNormalizeHtmlUrl: { minLength: 1, type: "string" }, headingsRepairUrl: { minLength: 1, type: "string" }, headingsRepairHtmlUrl: { minLength: 1, type: "string" }, seoHeadingRepairUrl: { minLength: 1, type: "string" }, seoHeadingRepairHtmlUrl: { minLength: 1, type: "string" }, workState: OperatorManuscriptWorkStateSchema, suggestedAction: OperatorManuscriptSuggestedActionSchema, standards: OperatorManuscriptStandardsSummaryValueSchema } } as const;

export type StandardsSeverity = FromSchema<typeof StandardsSeveritySchema>;
export type StandardsGate = FromSchema<typeof StandardsGateSchema>;
export type StandardsFinding = FromSchema<typeof StandardsFindingSchema>;
export type StandardsReview = FromSchema<typeof StandardsReviewSchema>;
export type PublishManuscriptResult = FromSchema<typeof PublishManuscriptResultSchema>;
export type ApplyStandardsDefaultsResult = FromSchema<typeof ApplyStandardsDefaultsResultSchema>;
export type NormalizeManuscriptReferencesResult = FromSchema<typeof NormalizeManuscriptReferencesResultSchema>;
export type RepairManuscriptHeadingChange = FromSchema<typeof RepairManuscriptHeadingChangeSchema>;
export type RepairManuscriptHeadingsResult = FromSchema<typeof RepairManuscriptHeadingsResultSchema>;
export type RepairManuscriptSeoHeadingChange = FromSchema<typeof RepairManuscriptSeoHeadingChangeSchema>;
export type RepairManuscriptSeoHeadingResult = FromSchema<typeof RepairManuscriptSeoHeadingResultSchema>;
export type EditorialStandardsGateCount = FromSchema<typeof EditorialStandardsGateCountSchema>;
export type EditorialStandardsPolicy = FromSchema<typeof EditorialStandardsPolicySchema>;
export type EditorialStandardsReading = Readonly<{
  kind: "producing-content.editorial-standards";
  publication: string;
  publicAuditUrl: string;
  publicArticleCount: number;
  publishableAuditCount: number;
  gateCounts: Readonly<Record<string, EditorialStandardsGateCount>>;
  policies: readonly EditorialStandardsPolicy[];
}>;
export type OperatorManuscriptWorkState = FromSchema<typeof OperatorManuscriptWorkStateSchema>;
export type OperatorManuscriptSuggestedAction = FromSchema<typeof OperatorManuscriptSuggestedActionSchema>;
export type OperatorManuscriptStandardsSummary = FromSchema<typeof OperatorManuscriptStandardsSummarySchema>;
export type OperatorManuscriptReading = FromSchema<typeof OperatorManuscriptReadingSchema>;

export const standardsReviewCarrier = carrierFrom(StandardsReviewSchema);

export const publishManuscriptResultCarrier = carrierFrom(PublishManuscriptResultSchema);

export const applyStandardsDefaultsResultCarrier = carrierFrom(ApplyStandardsDefaultsResultSchema);

export const normalizeManuscriptReferencesResultCarrier = carrierFrom(NormalizeManuscriptReferencesResultSchema);

export const repairManuscriptHeadingsResultCarrier = carrierFrom(RepairManuscriptHeadingsResultSchema);

export const repairManuscriptSeoHeadingResultCarrier = carrierFrom(RepairManuscriptSeoHeadingResultSchema);

export const editorialStandardsGateCountCarrier = carrierFrom(EditorialStandardsGateCountSchema);

export const editorialStandardsPolicyCarrier = carrierFrom(EditorialStandardsPolicySchema);

export const editorialStandardsReadingCarrier = carrierFrom(EditorialStandardsReadingSchema);

export const operatorManuscriptReadingCarrier = carrierFrom(OperatorManuscriptReadingSchema);

function reviewValue(input: Omit<StandardsReview, "kind" | "findings"> & Readonly<{
  findings: readonly StandardsFinding[];
}>): StandardsReview {
  return standardsReviewCarrier.assert({
    ...input,
    kind: "producing-content.standards-review" as const,
    findings: [...input.findings],
  }, "standards review");
}

export function standardsReview(input: Omit<StandardsReview, "kind" | "findings"> & Readonly<{
  findings: readonly StandardsFinding[];
}>): StandardsReview {
  return reviewValue(input);
}

export function publishManuscriptResult(input: Omit<PublishManuscriptResult, "kind" | "draft">): PublishManuscriptResult {
  return publishManuscriptResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.published" as const,
    draft: false as const,
  }, "published manuscript result");
}

export function applyStandardsDefaultsResult(input: Omit<ApplyStandardsDefaultsResult, "kind" | "changed"> & Readonly<{
  changed: readonly string[];
}>): ApplyStandardsDefaultsResult {
  return applyStandardsDefaultsResultCarrier.assert({
    ...input,
    kind: "producing-content.standards-defaults.applied" as const,
    changed: [...input.changed],
  }, "applied standards defaults result");
}

export function normalizeManuscriptReferencesResult(input: Omit<NormalizeManuscriptReferencesResult, "kind" | "changed"> & Readonly<{
  changed: readonly string[];
}>): NormalizeManuscriptReferencesResult {
  return normalizeManuscriptReferencesResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.references.normalized" as const,
    changed: [...input.changed],
  }, "normalized manuscript references result");
}

export function repairManuscriptHeadingsResult(input: Omit<RepairManuscriptHeadingsResult, "kind" | "changed"> & Readonly<{
  changed: readonly RepairManuscriptHeadingChange[];
}>): RepairManuscriptHeadingsResult {
  return repairManuscriptHeadingsResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.headings.repaired" as const,
    changed: [...input.changed],
  }, "repaired manuscript headings result");
}

export function repairManuscriptSeoHeadingResult(input: Omit<RepairManuscriptSeoHeadingResult, "kind" | "changed"> & Readonly<{
  changed: readonly RepairManuscriptSeoHeadingChange[];
}>): RepairManuscriptSeoHeadingResult {
  return repairManuscriptSeoHeadingResultCarrier.assert({
    ...input,
    kind: "producing-content.manuscript.seo-heading.repaired" as const,
    changed: [...input.changed],
  }, "repaired manuscript seo heading result");
}

export function editorialStandardsGateCount(input: EditorialStandardsGateCount): EditorialStandardsGateCount {
  return editorialStandardsGateCountCarrier.assert(input, "editorial standards gate count");
}

export function editorialStandardsPolicy(input: EditorialStandardsPolicy): EditorialStandardsPolicy {
  return editorialStandardsPolicyCarrier.assert(input, "editorial standards policy");
}

export function editorialStandardsReading(input: Omit<EditorialStandardsReading, "kind" | "gateCounts" | "policies"> & Readonly<{
  gateCounts: Readonly<Record<string, EditorialStandardsGateCount>>;
  policies: readonly EditorialStandardsPolicy[];
}>): EditorialStandardsReading {
  const gateCounts = Object.fromEntries(Object.entries(input.gateCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([gate, counts]) => [gate, editorialStandardsGateCount(counts)]));
  const reading: EditorialStandardsReading = Object.freeze({
    kind: "producing-content.editorial-standards" as const,
    publication: input.publication,
    publicAuditUrl: input.publicAuditUrl,
    publicArticleCount: input.publicArticleCount,
    publishableAuditCount: input.publishableAuditCount,
    gateCounts,
    policies: input.policies.map((policy) => editorialStandardsPolicy(policy)),
  });
  editorialStandardsReadingCarrier.assert(reading, "editorial standards reading");
  return reading;
}

export function operatorManuscriptReading(input: Omit<OperatorManuscriptReading, "kind" | "standards"> & Readonly<{
  standards: Omit<OperatorManuscriptStandardsSummary, "findings"> & Readonly<{ findings: readonly StandardsFinding[] }>;
}>): OperatorManuscriptReading {
  return operatorManuscriptReadingCarrier.assert({
    kind: "producing-content.operator-manuscript" as const,
    slug: input.slug,
    title: input.title,
    draft: input.draft,
    ...(input.date === undefined ? {} : { date: input.date }),
    publicUrl: input.publicUrl,
    standardsUrl: input.standardsUrl,
    standardsHtmlUrl: input.standardsHtmlUrl,
    publishUrl: input.publishUrl,
    publishHtmlUrl: input.publishHtmlUrl,
    standardsDefaultsUrl: input.standardsDefaultsUrl,
    standardsDefaultsHtmlUrl: input.standardsDefaultsHtmlUrl,
    referencesNormalizeUrl: input.referencesNormalizeUrl,
    referencesNormalizeHtmlUrl: input.referencesNormalizeHtmlUrl,
    headingsRepairUrl: input.headingsRepairUrl,
    headingsRepairHtmlUrl: input.headingsRepairHtmlUrl,
    seoHeadingRepairUrl: input.seoHeadingRepairUrl,
    seoHeadingRepairHtmlUrl: input.seoHeadingRepairHtmlUrl,
    workState: input.workState,
    ...(input.suggestedAction === undefined ? {} : { suggestedAction: input.suggestedAction }),
    standards: {
      publishable: input.standards.publishable,
      wordCount: input.standards.wordCount,
      referenceCount: input.standards.referenceCount,
      ...(input.standards.seoTerm === undefined ? {} : { seoTerm: input.standards.seoTerm }),
      errorCount: input.standards.errorCount,
      warningCount: input.standards.warningCount,
      findings: [...input.standards.findings],
    },
  }, "operator manuscript reading");
}

export function standardsReviewTerm(input: StandardsReview): Tm {
  return carrierToTerm(jsonResource(standardsReviewCarrier.assert(input), "standards review"));
}

export function publishManuscriptResultTerm(input: PublishManuscriptResult): Tm {
  return carrierToTerm(jsonResource(publishManuscriptResultCarrier.assert(input), "published manuscript result"));
}

export function applyStandardsDefaultsResultTerm(input: ApplyStandardsDefaultsResult): Tm {
  return carrierToTerm(jsonResource(applyStandardsDefaultsResultCarrier.assert(input), "applied standards defaults result"));
}

export function normalizeManuscriptReferencesResultTerm(input: NormalizeManuscriptReferencesResult): Tm {
  return carrierToTerm(jsonResource(normalizeManuscriptReferencesResultCarrier.assert(input), "normalized manuscript references result"));
}

export function repairManuscriptHeadingsResultTerm(input: RepairManuscriptHeadingsResult): Tm {
  return carrierToTerm(jsonResource(repairManuscriptHeadingsResultCarrier.assert(input), "repaired manuscript headings result"));
}

export function repairManuscriptSeoHeadingResultTerm(input: RepairManuscriptSeoHeadingResult): Tm {
  return carrierToTerm(jsonResource(repairManuscriptSeoHeadingResultCarrier.assert(input), "repaired manuscript seo heading result"));
}

export function editorialStandardsReadingTerm(input: EditorialStandardsReading): Tm {
  return carrierToTerm(jsonResource(editorialStandardsReadingCarrier.assert(input), "editorial standards reading"));
}

export function operatorManuscriptReadingTerm(input: OperatorManuscriptReading): Tm {
  return carrierToTerm(jsonResource(operatorManuscriptReadingCarrier.assert(input), "operator manuscript reading"));
}
