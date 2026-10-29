/**
 * mutating/topic-guidance  -  corpus-placement next actions for a topic.
 *
 * knowing reads the memory. This module adds the corpus placement convention:
 * where a topic home should be created, what scaffold documents look like, and
 * which dry-run document operations would settle the visible gaps.
 */
import { inspectMemoryHealth, inspectMemoryTopic, measureMemoryGap, type MemoryCarrier } from "@red-cup-engineering/knowing/memory";
import { memoryHealthDashboard } from "../holography/index.mjs";
import type { NormalizationItem, TopicGuidance, TopicScaffold, TopicSuggestedAction } from "./carriers.mjs";
import { planMemoryNormalization } from "./normalization.mjs";
import { KNOWLEDGE_VAULT_SUPPORT_PREFIXES } from "../corpus/root.mjs";

const SUPPORT_PREFIXES = new Set(KNOWLEDGE_VAULT_SUPPORT_PREFIXES);

export type TopicPathRecord = Readonly<{ path: string; role: string }>;

export type TopicInspectionPlan = Readonly<{
  kind: "organizing.knowledge-vault.mutating.topic-inspection";
  topic: string;
  admittedPaths: readonly string[];
  dashboard: Readonly<{
    admittedPaths: readonly string[];
    gaps: readonly string[];
    conceptHomes: readonly TopicPathRecord[];
    exactTitleMatches: readonly TopicPathRecord[];
    pathMatches: readonly TopicPathRecord[];
    suggestedTargetPaths: readonly string[];
    suggestedScaffolds: TopicGuidance["suggestedScaffolds"];
    suggestedActions: TopicGuidance["suggestedActions"];
    health: ReturnType<typeof memoryHealthDashboard>;
  }>;
  carrierReadings: Readonly<{
    health: ReturnType<typeof inspectMemoryHealth>;
    inspection: ReturnType<typeof inspectMemoryTopic>;
    guidance: TopicGuidance;
  }>;
}>;

export type TopicGapMeasurementPlan = Readonly<{
  kind: "organizing.knowledge-vault.mutating.topic-gap-measurement";
  topic: string;
  admittedPaths: readonly string[];
  dashboard: Readonly<{
    admittedPaths: readonly string[];
    documentsInspected: number;
    measurement: Readonly<{
      conceptHomes: number;
      conformanceFindings: number;
    }>;
    axes: ReturnType<typeof measureMemoryGap>["axes"];
    gaps: readonly string[];
    suggestedActions: TopicGuidance["suggestedActions"];
    sampleScaffolds: TopicGuidance["suggestedScaffolds"];
  }>;
  carrierReading: ReturnType<typeof measureMemoryGap>;
  guidance: TopicGuidance;
}>;

export function planTopicInspection(memory: MemoryCarrier, topic: string): TopicInspectionPlan {
  const guidance = planTopicGuidance(memory, topic);
  const health = inspectMemoryHealth(memory);
  const inspection = inspectMemoryTopic(memory, topic);
  return Object.freeze({
    kind: "organizing.knowledge-vault.mutating.topic-inspection" as const,
    topic,
    admittedPaths: memoryDocumentPaths(memory),
    dashboard: Object.freeze({
      admittedPaths: memoryDocumentPaths(memory),
      gaps: inspection.gaps,
      conceptHomes: topicPathRecords(inspection.conceptHomes, "concept-home"),
      exactTitleMatches: topicPathRecords(inspection.exactTitleMatches, "exact-title"),
      pathMatches: topicPathRecords(inspection.pathMatches, "path-match"),
      suggestedTargetPaths: guidance.suggestedTargetPaths,
      suggestedScaffolds: guidance.suggestedScaffolds,
      suggestedActions: guidance.suggestedActions,
      health: memoryHealthDashboard(health),
    }),
    carrierReadings: Object.freeze({ health, inspection, guidance }),
  });
}

export function planTopicGapMeasurement(memory: MemoryCarrier, topic: string): TopicGapMeasurementPlan {
  const guidance = planTopicGuidance(memory, topic);
  const measurement = measureMemoryGap(memory, topic);
  return Object.freeze({
    kind: "organizing.knowledge-vault.mutating.topic-gap-measurement" as const,
    topic,
    admittedPaths: memoryDocumentPaths(memory),
    dashboard: Object.freeze({
      admittedPaths: memoryDocumentPaths(memory),
      documentsInspected: measurement.documentsInspected,
      measurement: Object.freeze({
        conceptHomes: measurement.conceptHomes,
        conformanceFindings: measurement.conformance.total,
      }),
      axes: measurement.axes,
      gaps: measurement.gaps,
      suggestedActions: guidance.suggestedActions,
      sampleScaffolds: guidance.suggestedScaffolds,
    }),
    carrierReading: measurement,
    guidance,
  });
}

export function planTopicGuidance(memory: MemoryCarrier, topic: string): TopicGuidance {
  const inspection = inspectMemoryTopic(memory, topic);
  const gap = measureMemoryGap(memory, topic);
  const normalization = planMemoryNormalization(memory);
  const targetRoot = topicTargetRoot(memory);
  const suggestedTargetPaths = Object.freeze([
    `${targetRoot}/${inspection.slug}.md`,
    `docs/explanations/introduction-to-${inspection.slug}.md`,
    `docs/guides/using-${inspection.slug}.md`,
  ]);
  const sourcePaths = Object.freeze([
    ...inspection.conceptHomes,
    ...inspection.exactTitleMatches,
    ...inspection.pathMatches,
  ]);
  const suggestedScaffolds = topicScaffolds(topic, suggestedTargetPaths, sourcePaths);
  const suggestedActions = uniqueSuggestedActions([
    ...topicSuggestedActions(topic, inspection, suggestedTargetPaths),
    ...normalization.items.slice(0, 20).map((item) => normalizationSuggestedAction(item)),
  ]);
  return Object.freeze({
    kind: "organizing.knowledge-vault.mutating.topic-guidance" as const,
    topic: inspection.topic,
    slug: inspection.slug,
    targetRoot,
    documentsInspected: inspection.documentsInspected,
    gaps: Object.freeze([...inspection.gaps, ...gap.gaps]),
    gapAxes: gap.axes,
    suggestedTargetPaths,
    suggestedScaffolds,
    suggestedActions,
    normalizationItems: normalization.items.length,
  });
}

function topicSuggestedActions(
  topic: string,
  inspection: ReturnType<typeof inspectMemoryTopic>,
  suggestedTargetPaths: readonly string[],
): readonly TopicSuggestedAction[] {
  const actions: TopicSuggestedAction[] = [];
  if (inspection.documentsInspected === 0 || inspection.conceptHomes.length === 0) {
    actions.push(Object.freeze({
      kind: "create-document",
      reason: "Create a term document so the topic has an addressable concept home.",
      payload: Object.freeze({
        path: suggestedTargetPaths[0],
        title: titleCaseTopic(topic),
        type: "term",
        tags: Object.freeze([inspection.slug]),
      }),
    }));
  }
  if (inspection.exactTitleMatches.length === 0 && inspection.conceptHomes.length === 0) {
    actions.push(Object.freeze({
      kind: "update-frontmatter",
      reason: "Add or repair a title on the strongest candidate, or create a titled term document.",
      payload: Object.freeze({
        path: inspection.pathMatches[0] ?? "",
        set: Object.freeze({ title: titleCaseTopic(topic) }),
        dryRun: true,
      }),
    }));
  }
  if (inspection.pathMatches.length === 0 && inspection.conceptHomes.length === 0) {
    actions.push(Object.freeze({
      kind: "create-document",
      reason: "Place an introduction in the inferred topic directory.",
      payload: Object.freeze({
        path: suggestedTargetPaths[1],
        title: `Introduction to ${titleCaseTopic(topic)}`,
        type: "explanation",
        tags: Object.freeze([inspection.slug]),
      }),
    }));
  }
  return Object.freeze(actions);
}

function normalizationSuggestedAction(item: NormalizationItem): TopicSuggestedAction {
  if (item.action === "review-reference" || item.action === "normalize-references") {
    return Object.freeze({
      kind: "read",
      reason: "Read the document before normalizing references.",
      payload: Object.freeze({ path: item.path }),
    });
  }
  const payload: Record<string, unknown> = { path: item.path, dryRun: true };
  if (item.field !== undefined && item.target !== undefined) payload["set"] = { [item.field]: item.target };
  if (item.action === "add-tags-list" && Array.isArray(item.target)) payload["addTags"] = item.target;
  return Object.freeze({
    kind: "update-frontmatter",
    reason: `Apply the ${item.rule} normalization through document tooling.`,
    payload: Object.freeze(payload),
  });
}

function topicScaffolds(topic: string, paths: readonly string[], sourcePaths: readonly string[]): readonly TopicScaffold[] {
  const title = titleCaseTopic(topic);
  return Object.freeze([
    scaffold("term", paths[0]!, title, "term", sourcePaths),
    scaffold("introduction", paths[1]!, `Introduction to ${title}`, "explanation", sourcePaths),
    scaffold("guide", paths[2]!, `Using ${title}`, "guide", sourcePaths),
  ]);
}

function scaffold(kind: TopicScaffold["kind"], path: string, title: string, type: string, sourcePaths: readonly string[]): TopicScaffold {
  const frontMatter = Object.freeze({
    title,
    type,
    status: "scaffold",
    sources: Object.freeze([...sourcePaths]),
  });
  return Object.freeze({
    kind,
    path,
    title,
    type,
    frontMatter,
    body: `# ${title}\n\nThis scaffold was generated from corpus topic guidance. Replace this paragraph with a synthesis of the source paths listed in frontmatter.\n`,
    sourcePaths: Object.freeze([...sourcePaths]),
  });
}

function topicTargetRoot(memory: MemoryCarrier): string {
  for (const document of memory.documents) {
    const parts = document.path.split("/");
    if (parts[0] === "content" && parts[1] !== undefined) return `content/${parts[1]}`;
    if (parts[0] !== undefined && !SUPPORT_PREFIXES.has(parts[0])) return parts[0];
  }
  return "content";
}

function titleCaseTopic(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function uniqueSuggestedActions(actions: readonly TopicSuggestedAction[]): readonly TopicSuggestedAction[] {
  const seen = new Set<string>();
  const out: TopicSuggestedAction[] = [];
  for (const action of actions) {
    const key = `${action.kind}:${JSON.stringify(action.payload)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return Object.freeze(out);
}

function memoryDocumentPaths(memory: MemoryCarrier): readonly string[] {
  return Object.freeze(memory.documents.map((document) => document.path));
}

function topicPathRecords(paths: readonly string[], role: string): readonly TopicPathRecord[] {
  return Object.freeze(paths.map((path) => Object.freeze({ path, role })));
}
