/**
 * revision-packets - editorial revision backlog carriers.
 *
 * Quality and predication readers may be site-specific, but the operator-facing
 * packet they emit is a producing-content carrier: article identity, support
 * metrics, prioritized repair tasks, and backlog totals.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const ContentQualitySeveritySchema = { anyOf: [{ const: "attention" }, { const: "warning" }, { const: "blocker" }] } as const;

export const ContentRevisionTaskKindSchema = { anyOf: [{ const: "citation-cleanup" }, { const: "copy-edit" }, { const: "evidence-settlement" }, { const: "internal-linking" }, { const: "reference-enrichment" }, { const: "seo-revision" }, { const: "structure" }] } as const;

export const ContentRevisionTaskSchema = { $id: "producing-content/content-farm/revision-task", additionalProperties: false, type: "object", required: ["kind", "severity", "findingCode", "priority", "evidence", "instruction"], properties: { kind: ContentRevisionTaskKindSchema, severity: ContentQualitySeveritySchema, findingCode: { minLength: 1, type: "string" }, priority: { type: "number" }, evidence: { minLength: 1, type: "string" }, instruction: { minLength: 1, type: "string" } } } as const;

export const ContentRevisionPacketSchema = { $id: "producing-content/content-farm/revision-packet", title: "ContentRevisionPacket", additionalProperties: false, type: "object", required: ["kind", "slug", "path", "headline", "score", "taskCount", "highestPriority", "tasks"], properties: { kind: { const: "producing-content.revision-packet" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, section: { type: "string" }, score: { type: "number" }, settlementDepth: { type: "number" }, citationCoverage: { type: "number" }, internalRelationCoverage: { type: "number" }, claimCellCount: { type: "number" }, unsupportedClaimCellCount: { type: "number" }, taskCount: { type: "number" }, highestPriority: { type: "number" }, tasks: { type: "array", items: ContentRevisionTaskSchema } } } as const;

export const ContentRevisionBacklogReadingSchema = { $id: "producing-content/content-farm/revision-backlog", title: "ContentRevisionBacklogReading", additionalProperties: false, type: "object", required: ["kind", "articleCount", "taskCount", "byArticle", "constraints"], properties: { kind: { const: "producing-content.revision-backlog" }, articleCount: { type: "number" }, taskCount: { type: "number" }, byArticle: { type: "array", items: ContentRevisionPacketSchema }, constraints: { type: "array", items: { type: "string" } } } } as const;

export type ContentQualitySeverity = FromSchema<typeof ContentQualitySeveritySchema>;
export type ContentRevisionTaskKind = FromSchema<typeof ContentRevisionTaskKindSchema>;
export type ContentRevisionTask = FromSchema<typeof ContentRevisionTaskSchema>;
export type ContentRevisionPacket = FromSchema<typeof ContentRevisionPacketSchema>;
export type ContentRevisionBacklogReading = FromSchema<typeof ContentRevisionBacklogReadingSchema>;

export const contentRevisionTaskCarrier = carrierFrom(ContentRevisionTaskSchema);

export const contentRevisionPacketCarrier = carrierFrom(ContentRevisionPacketSchema);

export const contentRevisionBacklogCarrier = carrierFrom(ContentRevisionBacklogReadingSchema);

export function contentRevisionTask(input: ContentRevisionTask): ContentRevisionTask {
  return contentRevisionTaskCarrier.assert(input, "content revision task");
}

export function contentRevisionPacket(input: Omit<ContentRevisionPacket, "kind" | "taskCount" | "highestPriority"> & Readonly<{
  tasks: readonly ContentRevisionTask[];
}>): ContentRevisionPacket {
  const tasks = [...input.tasks].sort((left, right) => right.priority - left.priority || left.findingCode.localeCompare(right.findingCode));
  return contentRevisionPacketCarrier.assert({
    ...input,
    kind: "producing-content.revision-packet" as const,
    tasks,
    taskCount: tasks.length,
    highestPriority: tasks[0]?.priority ?? 0,
  }, "content revision packet");
}

export function contentRevisionBacklogReading(input: Readonly<{
  byArticle: readonly ContentRevisionPacket[];
  constraints?: readonly string[];
}>): ContentRevisionBacklogReading {
  const byArticle = [...input.byArticle].sort((left, right) =>
    right.highestPriority - left.highestPriority || left.score - right.score || left.headline.localeCompare(right.headline));
  return contentRevisionBacklogCarrier.assert({
    kind: "producing-content.revision-backlog" as const,
    articleCount: byArticle.length,
    taskCount: byArticle.reduce((sum, packet) => sum + packet.taskCount, 0),
    byArticle,
    constraints: [...(input.constraints ?? [
      "Read-only: revision packets do not rewrite copy, create citations, or publish changes without operator action.",
      "Revision packets are editorial support-shape diagnostics, not automatic truth claims.",
    ])],
  }, "content revision backlog");
}

export function contentRevisionPacketTerm(input: ContentRevisionPacket): Tm {
  return carrierToTerm(jsonResource(contentRevisionPacketCarrier.assert(input), "content revision packet"));
}

export function contentRevisionBacklogTerm(input: ContentRevisionBacklogReading): Tm {
  return carrierToTerm(jsonResource(contentRevisionBacklogCarrier.assert(input), "content revision backlog"));
}
