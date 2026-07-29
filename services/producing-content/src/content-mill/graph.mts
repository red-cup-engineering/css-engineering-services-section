/**
 * graph - public content topology carriers.
 *
 * Sites own how same-site links are parsed. The mill owns the public topology
 * packet over articles, edges, section buckets, and aggregate graph counts.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const ContentGraphNodeSchema = { $id: "producing-content/content-mill/content-graph-node", title: "ContentGraphNode", additionalProperties: false, type: "object", required: ["slug", "path", "headline", "tags", "referenceDomains", "outboundInternalLinks", "inboundInternalLinks", "suggestedInternalTargets", "graphCentrality", "orphan", "isolated"], properties: { slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, section: { minLength: 1, type: "string" }, tags: { type: "array", items: { minLength: 1, type: "string" } }, referenceDomains: { type: "array", items: { minLength: 1, type: "string" } }, outboundInternalLinks: { type: "array", items: { minLength: 1, type: "string" } }, inboundInternalLinks: { type: "array", items: { minLength: 1, type: "string" } }, suggestedInternalTargets: { type: "array", items: { minLength: 1, type: "string" } }, graphCentrality: { minimum: 0, maximum: 1, type: "number" }, orphan: { type: "boolean" }, isolated: { type: "boolean" } } } as const;

export const ContentGraphEdgeSchema = { $id: "producing-content/content-mill/content-graph-edge", title: "ContentGraphEdge", additionalProperties: false, type: "object", required: ["sourceSlug", "sourcePath", "sourceHeadline", "targetSlug", "targetPath", "targetHeadline", "sharedTags", "sameSection", "linkCount"], properties: { sourceSlug: { minLength: 1, type: "string" }, sourcePath: { minLength: 1, type: "string" }, sourceHeadline: { minLength: 1, type: "string" }, targetSlug: { minLength: 1, type: "string" }, targetPath: { minLength: 1, type: "string" }, targetHeadline: { minLength: 1, type: "string" }, sharedTags: { type: "array", items: { minLength: 1, type: "string" } }, sameSection: { type: "boolean" }, linkCount: { minimum: 1, type: "integer" } } } as const;

export const ContentGraphSectionBucketSchema = { $id: "producing-content/content-mill/content-graph-section-bucket", title: "ContentGraphSectionBucket", additionalProperties: false, type: "object", required: ["articleCount", "edgeCount", "orphanCount", "isolatedCount"], properties: { articleCount: { minimum: 0, type: "integer" }, edgeCount: { minimum: 0, type: "integer" }, orphanCount: { minimum: 0, type: "integer" }, isolatedCount: { minimum: 0, type: "integer" } } } as const;

const ContentGraphSectionBucketValueSchema = { title: "ContentGraphSectionBucketValue", additionalProperties: false, type: "object", required: ContentGraphSectionBucketSchema.required, properties: ContentGraphSectionBucketSchema.properties } as const;

export const ContentGraphReadingSchema = { $id: "producing-content/content-mill/content-graph-reading", title: "ContentGraphReading", additionalProperties: false, type: "object", required: ["kind", "publicArticleCount", "edgeCount", "orphanCount", "isolatedCount", "averageOutDegree", "averageInDegree", "byArticle", "edges", "bySection", "constraints", "plannedUses"], properties: { kind: { const: "producing-content.content-graph-reading" }, publicArticleCount: { minimum: 0, type: "integer" }, edgeCount: { minimum: 0, type: "integer" }, orphanCount: { minimum: 0, type: "integer" }, isolatedCount: { minimum: 0, type: "integer" }, averageOutDegree: { minimum: 0, type: "number" }, averageInDegree: { minimum: 0, type: "number" }, byArticle: { type: "array", items: ContentGraphNodeSchema }, edges: { type: "array", items: ContentGraphEdgeSchema }, bySection: { type: "object", additionalProperties: ContentGraphSectionBucketValueSchema }, constraints: { type: "array", items: { minLength: 1, type: "string" } }, plannedUses: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type ContentGraphNode = FromSchema<typeof ContentGraphNodeSchema>;
export type ContentGraphEdge = FromSchema<typeof ContentGraphEdgeSchema>;
export type ContentGraphSectionBucket = FromSchema<typeof ContentGraphSectionBucketSchema>;
export type ContentGraphReading = Readonly<{
  kind: "producing-content.content-graph-reading";
  publicArticleCount: number;
  edgeCount: number;
  orphanCount: number;
  isolatedCount: number;
  averageOutDegree: number;
  averageInDegree: number;
  byArticle: readonly ContentGraphNode[];
  edges: readonly ContentGraphEdge[];
  bySection: Readonly<Record<string, ContentGraphSectionBucket>>;
  constraints: readonly string[];
  plannedUses: readonly string[];
}>;

export const CONTENT_GRAPH_CONSTRAINTS = Object.freeze([
  "Folded from public article Markdown links, public taxonomy, and CSL reference domains only.",
  "Same-site links are topology and editorial context, not factual references.",
  "No visitor identifiers, cookies, IP addresses, user agents, fingerprints, or reader profiles are used.",
]);

export const CONTENT_GRAPH_PLANNED_USES = Object.freeze([
  "Find isolated and orphaned public articles before promotion.",
  "Prioritize warranted internal-link work by section and topic.",
  "Support richer topic clusters, section pages, and revision assignments without user tracking.",
]);

export const contentGraphNodeCarrier = carrierFrom(ContentGraphNodeSchema);

export const contentGraphEdgeCarrier = carrierFrom(ContentGraphEdgeSchema);

export const contentGraphSectionBucketCarrier = carrierFrom(ContentGraphSectionBucketSchema);

export const contentGraphReadingCarrier = carrierFrom(ContentGraphReadingSchema);

export function contentGraphNode(input: Omit<ContentGraphNode,
  "tags" | "referenceDomains" | "outboundInternalLinks" | "inboundInternalLinks" | "suggestedInternalTargets"
> & Readonly<{
  tags: readonly string[];
  referenceDomains: readonly string[];
  outboundInternalLinks: readonly string[];
  inboundInternalLinks: readonly string[];
  suggestedInternalTargets: readonly string[];
}>): ContentGraphNode {
  return contentGraphNodeCarrier.assert({
    ...input,
    tags: [...input.tags],
    referenceDomains: [...input.referenceDomains],
    outboundInternalLinks: [...input.outboundInternalLinks],
    inboundInternalLinks: [...input.inboundInternalLinks],
    suggestedInternalTargets: [...input.suggestedInternalTargets],
  }, "content graph node");
}

export function contentGraphEdge(input: Omit<ContentGraphEdge, "sharedTags"> & Readonly<{
  sharedTags: readonly string[];
}>): ContentGraphEdge {
  return contentGraphEdgeCarrier.assert({
    ...input,
    sharedTags: [...input.sharedTags],
  }, "content graph edge");
}

export function contentGraphSectionBucket(input: ContentGraphSectionBucket): ContentGraphSectionBucket {
  return contentGraphSectionBucketCarrier.assert(input, "content graph section bucket");
}

function sortedSectionBuckets(input: Readonly<Record<string, ContentGraphSectionBucket>>): Readonly<Record<string, ContentGraphSectionBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([section, bucket]) => [section, contentGraphSectionBucket(bucket)])));
}

export function contentGraphReading(input: Readonly<{
  nodes: readonly ContentGraphNode[];
  edges: readonly ContentGraphEdge[];
  bySection: Readonly<Record<string, ContentGraphSectionBucket>>;
  constraints?: readonly string[];
  plannedUses?: readonly string[];
}>): ContentGraphReading {
  const nodes = [...input.nodes].map((node) => contentGraphNode(node))
    .sort((left, right) => Number(right.isolated) - Number(left.isolated) || Number(right.orphan) - Number(left.orphan) || left.graphCentrality - right.graphCentrality || left.headline.localeCompare(right.headline));
  const edges = [...input.edges].map((edge) => contentGraphEdge(edge))
    .sort((left, right) => left.sourceHeadline.localeCompare(right.sourceHeadline) || left.targetHeadline.localeCompare(right.targetHeadline));
  const reading: ContentGraphReading = Object.freeze({
    kind: "producing-content.content-graph-reading" as const,
    publicArticleCount: nodes.length,
    edgeCount: edges.length,
    orphanCount: nodes.filter((node) => node.orphan).length,
    isolatedCount: nodes.filter((node) => node.isolated).length,
    averageOutDegree: nodes.length === 0 ? 0 : Math.round((edges.length / nodes.length) * 100) / 100,
    averageInDegree: nodes.length === 0 ? 0 : Math.round((edges.length / nodes.length) * 100) / 100,
    byArticle: nodes,
    edges,
    bySection: sortedSectionBuckets(input.bySection),
    constraints: [...(input.constraints ?? CONTENT_GRAPH_CONSTRAINTS)],
    plannedUses: [...(input.plannedUses ?? CONTENT_GRAPH_PLANNED_USES)],
  });
  contentGraphReadingCarrier.assert(reading, "content graph reading");
  return reading;
}

export function contentGraphNodeTerm(input: ContentGraphNode): Tm {
  return carrierToTerm(jsonResource(contentGraphNodeCarrier.assert(input), "content graph node"));
}

export function contentGraphReadingTerm(input: ContentGraphReading): Tm {
  return carrierToTerm(jsonResource(contentGraphReadingCarrier.assert(input), "content graph reading"));
}
