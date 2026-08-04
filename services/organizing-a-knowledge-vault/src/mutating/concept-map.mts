import { corpusDocumentKind, frontmatterStrings, titleFromPath } from "../corpus/documents.mjs";
import { inspectMemoryHealth, inspectMemoryTopic, measureMemoryGap, type MemoryCarrier } from "@red-cup-engineering/knowing/memory";
import { memoryHealthDashboard } from "../holography/index.mjs";
import { planTopicGuidance } from "./topic-guidance.mjs";

export type ConceptMapResource = Readonly<{
  path: string;
  title: string;
  kind: string;
  role: string;
  tags: readonly string[];
  aliases: readonly string[];
  description?: string;
}>;

export type ConceptMapResourceInput = Readonly<{
  path: string;
  frontmatter?: Readonly<Record<string, unknown>>;
}>;

export type TopicConceptMapInput = Readonly<{
  path: string;
  frontmatter?: Readonly<Record<string, unknown>>;
}>;

export type TopicConceptMap = Readonly<{
  kind: "organizing.knowledge-vault.mutating.topic-concept-map";
  topic: string;
  admittedPaths: readonly string[];
  dashboard: Readonly<{
    admittedPaths: readonly string[];
    resourcesByKind: readonly Readonly<{ kind: string; count: number }>[];
    topTags: readonly Readonly<{ tag: string; count: number }>[];
    conceptHomes: readonly Readonly<{ path: string; role: string }>[];
    pathMatches: readonly Readonly<{ path: string; role: string }>[];
    gaps: readonly string[];
    gapAxes: ReturnType<typeof measureMemoryGap>["axes"];
    suggestedActions: ReturnType<typeof planTopicGuidance>["suggestedActions"];
    suggestedScaffolds: ReturnType<typeof planTopicGuidance>["suggestedScaffolds"];
    health: ReturnType<typeof memoryHealthDashboard>;
  }>;
  resources: Readonly<{
    terms: readonly ConceptMapResource[];
    guides: readonly ConceptMapResource[];
    explanations: readonly ConceptMapResource[];
    references: readonly ConceptMapResource[];
    specifications: readonly ConceptMapResource[];
    sourceDocuments: readonly ConceptMapResource[];
    other: readonly ConceptMapResource[];
  }>;
  carrierReadings: Readonly<{
    health: ReturnType<typeof inspectMemoryHealth>;
    inspection: ReturnType<typeof inspectMemoryTopic>;
    gap: ReturnType<typeof measureMemoryGap>;
    guidance: ReturnType<typeof planTopicGuidance>;
  }>;
}>;

export function conceptMapResource(input: ConceptMapResourceInput, role: string): ConceptMapResource {
  const frontmatter = input.frontmatter ?? {};
  const title = typeof frontmatter["title"] === "string" && frontmatter["title"].trim().length > 0
    ? frontmatter["title"].trim()
    : titleFromPath(input.path);
  const description = typeof frontmatter["description"] === "string" && frontmatter["description"].trim().length > 0
    ? frontmatter["description"].trim()
    : undefined;
  return Object.freeze({
    path: input.path,
    title,
    kind: corpusDocumentKind(input.path, frontmatter),
    role,
    tags: frontmatterStrings(frontmatter["tags"]),
    aliases: frontmatterStrings(frontmatter["aliases"]),
    ...(description ? { description } : {}),
  });
}

export function planTopicConceptMap(memory: MemoryCarrier, topic: string, files: readonly TopicConceptMapInput[]): TopicConceptMap {
  const guidance = planTopicGuidance(memory, topic);
  const health = inspectMemoryHealth(memory);
  const inspection = inspectMemoryTopic(memory, topic);
  const gap = measureMemoryGap(memory, topic);
  const roleByPath = new Map<string, string>();
  for (const path of inspection.conceptHomes) roleByPath.set(path, "concept-home");
  for (const path of inspection.exactTitleMatches) roleByPath.set(path, "exact-title");
  for (const path of inspection.pathMatches) if (!roleByPath.has(path)) roleByPath.set(path, "path-match");
  const resources = files.map((file) => conceptMapResource(file, roleByPath.get(file.path) ?? "supporting"));
  return Object.freeze({
    kind: "organizing.knowledge-vault.mutating.topic-concept-map" as const,
    topic,
    admittedPaths: documentPaths(memory),
    dashboard: Object.freeze({
      admittedPaths: documentPaths(memory),
      resourcesByKind: countConceptMapResourcesByKind(resources),
      topTags: countConceptMapTags(resources),
      conceptHomes: topicPathRecords(inspection.conceptHomes, "concept-home"),
      pathMatches: topicPathRecords(inspection.pathMatches, "path-match"),
      gaps: inspection.gaps,
      gapAxes: gap.axes,
      suggestedActions: guidance.suggestedActions,
      suggestedScaffolds: guidance.suggestedScaffolds,
      health: memoryHealthDashboard(health),
    }),
    resources: groupConceptMapResources(resources),
    carrierReadings: Object.freeze({ health, inspection, gap, guidance }),
  });
}

export function countConceptMapResourcesByKind(resources: readonly ConceptMapResource[]): readonly Readonly<{ kind: string; count: number }>[] {
  const counts = new Map<string, number>();
  for (const resource of resources) counts.set(resource.kind, (counts.get(resource.kind) ?? 0) + 1);
  return Object.freeze([...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([kind, count]) => Object.freeze({ kind, count })));
}

export function countConceptMapTags(resources: readonly ConceptMapResource[], limit = 24): readonly Readonly<{ tag: string; count: number }>[] {
  const counts = new Map<string, number>();
  for (const resource of resources) {
    for (const tag of resource.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Object.freeze([...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(([tag, count]) => Object.freeze({ tag, count })));
}

export function conceptMapDraftContext(conceptMap: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const dashboard = conceptMap["dashboard"];
  const resources = conceptMap["resources"];
  return Object.freeze({
    kind: "organizing.knowledge-vault.mutating.concept-map-draft-context",
    topic: conceptMap["topic"],
    admittedPaths: conceptMap["admittedPaths"],
    dashboard: objectOrNull(dashboard) === null
      ? null
      : {
          resourcesByKind: objectOrNull(dashboard)?.["resourcesByKind"],
          topTags: objectOrNull(dashboard)?.["topTags"],
          gaps: objectOrNull(dashboard)?.["gaps"],
          gapAxes: objectOrNull(dashboard)?.["gapAxes"],
          suggestedScaffolds: objectOrNull(dashboard)?.["suggestedScaffolds"],
        },
    resources: objectOrNull(resources) === null
      ? null
      : {
          terms: resourceSummaries(objectOrNull(resources)?.["terms"]),
          guides: resourceSummaries(objectOrNull(resources)?.["guides"]),
          explanations: resourceSummaries(objectOrNull(resources)?.["explanations"]),
          sourceDocuments: resourceSummaries(objectOrNull(resources)?.["sourceDocuments"]),
        },
  });
}

export function conceptMapDraftPaths(conceptMap: Readonly<Record<string, unknown>>, limit: number): readonly string[] {
  const resources = conceptMap["resources"];
  if (resources === null || typeof resources !== "object" || Array.isArray(resources)) return Object.freeze([]);
  const record = resources as Record<string, unknown>;
  return uniqueStrings([
    ...resourcePaths(record["terms"]),
    ...resourcePaths(record["guides"]),
    ...resourcePaths(record["explanations"]),
    ...resourcePaths(record["sourceDocuments"]),
  ]).slice(0, Math.max(0, Math.floor(limit)));
}

export function conceptMapTags(conceptMap: Readonly<Record<string, unknown>>, topic: string, limit = 8): readonly string[] {
  const dashboard = conceptMap["dashboard"];
  const topTags = dashboard !== null && typeof dashboard === "object" && !Array.isArray(dashboard)
    ? (dashboard as Record<string, unknown>)["topTags"]
    : undefined;
  const tags = Array.isArray(topTags)
    ? topTags
        .map((item) => item !== null && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>)["tag"] : "")
        .filter((tag): tag is string => typeof tag === "string" && tag.length > 0)
    : [];
  return uniqueStrings([slugifyConceptTopic(topic), ...tags]).slice(0, Math.max(0, Math.floor(limit)));
}

export function slugifyConceptTopic(value: string): string {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
}

function groupConceptMapResources(resources: readonly ConceptMapResource[]): TopicConceptMap["resources"] {
  return Object.freeze({
    terms: Object.freeze(resources.filter((resource) => resource.kind === "term")),
    guides: Object.freeze(resources.filter((resource) => resource.kind === "guide")),
    explanations: Object.freeze(resources.filter((resource) => resource.kind === "explanation")),
    references: Object.freeze(resources.filter((resource) => resource.kind === "reference")),
    specifications: Object.freeze(resources.filter((resource) => resource.kind === "specification")),
    sourceDocuments: Object.freeze(resources.filter((resource) => resource.kind === "source")),
    other: Object.freeze(resources.filter((resource) => !["term", "guide", "explanation", "reference", "specification", "source"].includes(resource.kind))),
  });
}

function documentPaths(memory: MemoryCarrier): readonly string[] {
  return Object.freeze(memory.documents.map((document) => document.path));
}

function topicPathRecords(paths: readonly string[], role: string): ReadonlyArray<Readonly<{ path: string; role: string }>> {
  return Object.freeze(paths.map((path) => Object.freeze({ path, role })));
}

function resourcePaths(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value
    .map((item) => item !== null && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>)["path"] : "")
    .filter((item): item is string => typeof item === "string" && item.length > 0));
}

function resourceSummaries(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.slice(0, 12).map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return Object.freeze({});
    const record = item as Record<string, unknown>;
    return Object.freeze({
      path: record["path"],
      title: record["title"],
      kind: record["kind"],
      role: record["role"],
      tags: record["tags"],
    });
  }));
}

function objectOrNull(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return Object.freeze(out);
}
