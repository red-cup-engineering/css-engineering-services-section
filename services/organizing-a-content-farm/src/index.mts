/**
 * @red-cup-engineering/organizing-a-content-farm
 *
 * A content farm is a corpus-backed knowledge-vault specialization: it keeps a
 * corpus and run memory, receives newscables as wired input, and cultivates
 * producing-content farm outputs from that irrigated knowledge store.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { carrierFrom, carrierToTerm, type FromSchema, type Tm } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import {
  catalogCorpus,
  knowledgeVaultNewscableRig,
  knowledgeVaultRigging,
  knowledgeVaultRoot,
  type Catalog,
  type KnowledgeVaultRigging,
  type KnowledgeVaultRoot,
} from "@red-cup-engineering/organizing-a-knowledge-vault/content-farm";
import {
  DEFAULT_LIFECYCLE,
  CreateDraftManuscriptResultSchema,
  GATE_PASS,
  PUBLISHED,
  STATUS_PREDICATE,
  SourceCycleCandidateDraftInternalLinkGuidanceSchema,
  SourceCycleCandidateReferenceNormalizationSchema,
  SourceCycleCandidateWriteCollisionSchema,
  contentFarmConfigFromDocument,
  decodeFrontMatterDocument,
  draftManuscriptCreated,
  encodeFrontMatterDocument,
  newsSlug,
  sourceCycleCandidateReferenceNormalization,
  sourceCycleCandidateWriteCollision,
  type ContentFarmConfig,
  type CreateDraftManuscriptInput,
  type CreateDraftManuscriptResult,
  type FarmCycle,
  type FarmProperty,
  type FarmCycleReading,
  type FrontMatterDocument,
  type FrontMatterRecord,
  type NewsClaim,
  type NewsClaimSet,
  type SourceCycleCandidateDraftInternalLinkGuidance,
  type SourceCycleCandidateReferenceNormalization,
  type SourceCycleCandidateWriteCollision,
} from "@red-cup-engineering/producing-content/content-farm";
import { normalizeCslReferenceRecords, referencesFromSourceUrls } from "@red-cup-engineering/producing-content/codecs";
import type { IngestResult, SourceRollReading } from "@red-cup-engineering/organizing-a-newscable";
import { SourceRollSchema, sourceRollReading } from "@red-cup-engineering/organizing-a-newscable";

export * from "@red-cup-engineering/producing-content/content-farm";
export {
  catalogCorpus,
  corpusBoundary,
  knowledgeVaultNewscableRig,
  knowledgeVaultRigging,
  organizeCorpus,
  type Catalog,
  type CatalogCorpusOptions,
  type CorpusDocument,
  type CorpusNode,
  type Frontier,
  type OrganizeCorpusOptions,
  type Organization,
  type Resource,
  type KnowledgeVaultRigging,
  type SocialBoundary,
} from "@red-cup-engineering/organizing-a-knowledge-vault/content-farm";
export {
  sourceRollReading,
  sourceRollTerm,
  type SourceRollReading,
  type SourceRollSource,
  type SourceRollWire,
} from "@red-cup-engineering/organizing-a-newscable";

export const ContentFarmCorpusSchema = { $id: "organizing/content-farm/corpus", title: "ContentFarmCorpus", additionalProperties: false, type: "object", required: ["kind", "property", "contentDir", "dataDir", "corpusPath", "catalogTotal", "newscableConfigPath", "wireCount", "sourceCount", "seedCount"], properties: { kind: { const: "organizing.content-farm.corpus" }, property: { minLength: 1, type: "string" }, contentDir: { minLength: 1, type: "string" }, dataDir: { minLength: 1, type: "string" }, corpusPath: { minLength: 1, type: "string" }, catalogTotal: { minimum: 0, type: "integer" }, newscableConfigPath: { minLength: 1, type: "string" }, wireCount: { minimum: 0, type: "integer" }, sourceCount: { minimum: 0, type: "integer" }, seedCount: { minimum: 0, type: "integer" } } } as const;

export type ContentFarmCorpus = FromSchema<typeof ContentFarmCorpusSchema>;

export const contentFarmCorpusCarrier = carrierFrom(ContentFarmCorpusSchema);

export function contentFarmCorpus(input: Readonly<{
  property: FarmProperty;
  corpus: Catalog;
  newscable: SourceRollReading;
}>): ContentFarmCorpus {
  return contentFarmCorpusCarrier.assert({
    kind: "organizing.content-farm.corpus" as const,
    property: input.property.name,
    contentDir: input.property.contentDir,
    dataDir: input.property.dataDir,
    corpusPath: input.corpus.path,
    catalogTotal: input.corpus.total,
    newscableConfigPath: input.newscable.configPath,
    wireCount: input.newscable.wireCount,
    sourceCount: input.newscable.sourceCount,
    seedCount: input.property.seeds.length,
  }, "content farm corpus");
}

export function contentFarmCorpusTerm(input: ContentFarmCorpus): Tm {
  return carrierToTerm(jsonResource(contentFarmCorpusCarrier.assert(input), "content farm corpus"));
}

export const CorpusRootPathSchema = { $id: "organizing/content-farm/corpus/root-path", title: "CorpusRootPath", additionalProperties: false, type: "object", required: ["path", "description", "present"], properties: { path: { minLength: 1, type: "string" }, description: { minLength: 1, type: "string" }, present: { type: "boolean" } } } as const;

export const ContentFarmCorpusRootSchema = { $id: "organizing/content-farm/corpus-root", title: "ContentFarmCorpusRoot", additionalProperties: false, type: "object", required: ["kind", "property", "root", "expectedPaths", "stablePrefixes", "observedPrefixes", "missingPaths", "allowedPrefixes", "farmCorpus", "rigging"], properties: { kind: { const: "organizing.content-farm.corpus-root" }, property: { minLength: 1, type: "string" }, root: { minLength: 1, type: "string" }, expectedPaths: { type: "array", items: CorpusRootPathSchema }, stablePrefixes: { type: "array", items: { minLength: 1, type: "string" } }, observedPrefixes: { type: "array", items: { minLength: 1, type: "string" } }, missingPaths: { type: "array", items: { minLength: 1, type: "string" } }, allowedPrefixes: { type: "array", items: { minLength: 1, type: "string" } }, farmCorpus: ContentFarmCorpusSchema, rigging: { title: "KnowledgeVaultRiggingValue", additionalProperties: false, type: "object", required: ["kind", "root", "rigCount", "rigs"], properties: { kind: { const: "organizing.knowledge-vault.corpus.rigging" }, root: { minLength: 1, type: "string" }, rigCount: { minimum: 0, type: "integer" }, rigs: { type: "array", items: { title: "KnowledgeVaultRigValue", additionalProperties: false, type: "object", required: ["kind", "inputKind", "name", "mount"], properties: { kind: { const: "organizing.knowledge-vault.corpus.rig" }, inputKind: { anyOf: [{ const: "newswire" }, { const: "newscable" }] }, name: { minLength: 1, type: "string" }, mount: { minLength: 1, type: "string" }, configPath: { minLength: 1, type: "string" }, href: { minLength: 1, type: "string" }, wireCount: { minimum: 0, type: "integer" }, sourceCount: { minimum: 0, type: "integer" } } } } } } } } as const;

export type CorpusRootPath = FromSchema<typeof CorpusRootPathSchema>;
export type ContentFarmCorpusRoot = FromSchema<typeof ContentFarmCorpusRootSchema>;

export const contentFarmCorpusRootCarrier = carrierFrom(ContentFarmCorpusRootSchema);

export function contentFarmCorpusRoot(input: Readonly<{
  property: FarmProperty;
  root: KnowledgeVaultRoot;
  rigging: KnowledgeVaultRigging;
  farmCorpus: ContentFarmCorpus;
}>): ContentFarmCorpusRoot {
  return contentFarmCorpusRootCarrier.assert({
    kind: "organizing.content-farm.corpus-root" as const,
    property: input.property.name,
    root: input.root.root,
    expectedPaths: input.root.expectedPaths.map((entry) => ({ ...entry })),
    stablePrefixes: [...input.root.stablePrefixes],
    observedPrefixes: [...input.root.observedPrefixes],
    missingPaths: [...input.root.missingPaths],
    allowedPrefixes: [...input.root.allowedPrefixes],
    farmCorpus: contentFarmCorpusCarrier.assert(input.farmCorpus, "content farm corpus root corpus"),
    rigging: input.rigging,
  }, "content farm corpus root");
}

export function contentFarmCorpusRootTerm(input: ContentFarmCorpusRoot): Tm {
  return carrierToTerm(jsonResource(contentFarmCorpusRootCarrier.assert(input), "content farm corpus root"));
}

export const ContentFarmTaxonomyKindSchema = { anyOf: [{ const: "section" }, { const: "tag" }] } as const;

export const ContentFarmTaxonomyReadingSchema = { $id: "organizing/content-farm/taxonomy/reading", title: "ContentFarmTaxonomyReading", additionalProperties: false, type: "object", required: ["kind", "taxonomy", "slug", "title", "description", "editorialFrame", "relatedBeats", "seedTerms", "count", "url"], properties: { kind: { const: "organizing.content-farm.taxonomy" }, taxonomy: ContentFarmTaxonomyKindSchema, slug: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, description: { minLength: 1, type: "string" }, editorialFrame: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, relatedBeats: { type: "array", items: { minLength: 1, type: "string" } }, seedTerms: { type: "array", items: { minLength: 1, type: "string" } }, count: { minimum: 0, type: "integer" }, latestPublished: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" } } } as const;

export type ContentFarmTaxonomyKind = FromSchema<typeof ContentFarmTaxonomyKindSchema>;
export type ContentFarmTaxonomyReading = FromSchema<typeof ContentFarmTaxonomyReadingSchema>;

export const contentFarmTaxonomyReadingCarrier = carrierFrom(ContentFarmTaxonomyReadingSchema);

export function contentFarmTaxonomyReading(input: Omit<ContentFarmTaxonomyReading, "kind">): ContentFarmTaxonomyReading {
  return contentFarmTaxonomyReadingCarrier.assert({
    kind: "organizing.content-farm.taxonomy" as const,
    ...input,
    relatedBeats: [...input.relatedBeats],
    seedTerms: [...input.seedTerms],
  }, "content farm taxonomy reading");
}

export function contentFarmTaxonomyReadingTerm(input: ContentFarmTaxonomyReading): Tm {
  return carrierToTerm(jsonResource(contentFarmTaxonomyReadingCarrier.assert(input), "content farm taxonomy reading"));
}

export type IrrigatedContentFarmOptions = Readonly<{
  property: FarmProperty;
  newscableConfigPath: string;
  corpusRoot?: string;
  corpusPath?: string;
  now?: () => string;
}>;

export function irrigatedContentFarmCorpus(options: IrrigatedContentFarmOptions): ContentFarmCorpus {
  const corpusRoot = options.corpusRoot ?? dirname(options.property.contentDir);
  const corpusPath = options.corpusPath ?? basename(options.property.contentDir);
  return contentFarmCorpus({
    property: options.property,
    corpus: catalogCorpus(corpusRoot, { path: corpusPath }),
    newscable: sourceRollReading({
      configPath: options.newscableConfigPath,
      ...(options.now === undefined ? {} : { now: options.now }),
    }),
  });
}

export function irrigatedContentFarmCorpusRoot(options: IrrigatedContentFarmOptions): ContentFarmCorpusRoot {
  const corpusRoot = options.corpusRoot ?? dirname(options.property.contentDir);
  const corpusPath = options.corpusPath ?? basename(options.property.contentDir);
  const newscable = sourceRollReading({
    configPath: options.newscableConfigPath,
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const root = knowledgeVaultRoot(corpusRoot);
  return contentFarmCorpusRoot({
    property: options.property,
    root,
    rigging: knowledgeVaultRigging({
      root,
      rigs: [knowledgeVaultNewscableRig({
        name: options.property.name,
        mount: corpusPath,
        configPath: options.newscableConfigPath,
        wireCount: newscable.wireCount,
        sourceCount: newscable.sourceCount,
      })],
    }),
    farmCorpus: contentFarmCorpus({
      property: options.property,
      corpus: catalogCorpus(corpusRoot, { path: corpusPath }),
      newscable,
    }),
  });
}

export const ContentFarmSourceCycleWirePlanSchema = { $id: "organizing/content-farm/source-cycle/wire-plan", title: "ContentFarmSourceCycleWirePlan", additionalProperties: false, type: "object", required: ["name", "sourceCount", "sources"], properties: { name: { minLength: 1, type: "string" }, sourceCount: { minimum: 0, type: "integer" }, sources: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const ContentFarmSourceCycleCablePlanSchema = { $id: "organizing/content-farm/source-cycle/cable-plan", title: "ContentFarmSourceCycleCablePlan", additionalProperties: false, type: "object", required: ["title", "domain", "port", "wireCount", "sourceCount", "wires"], properties: { title: { minLength: 1, type: "string" }, domain: { minLength: 1, type: "string" }, port: { anyOf: [{ minimum: 0, type: "integer" }, { type: "null" }] }, wireCount: { minimum: 0, type: "integer" }, sourceCount: { minimum: 0, type: "integer" }, wires: { type: "array", items: ContentFarmSourceCycleWirePlanSchema } } } as const;

export const ContentFarmSourceCyclePropertyPlanSchema = { $id: "organizing/content-farm/source-cycle/property-plan", title: "ContentFarmSourceCyclePropertyPlan", additionalProperties: false, type: "object", required: ["name", "contentDir", "dataDir", "beatCount", "beats", "seedCount"], properties: { name: { minLength: 1, type: "string" }, contentDir: { minLength: 1, type: "string" }, dataDir: { minLength: 1, type: "string" }, beatCount: { minimum: 0, type: "integer" }, beats: { type: "array", items: { minLength: 1, type: "string" } }, seedCount: { minimum: 0, type: "integer" } } } as const;

export const ContentFarmSourceCycleFarmPlanSchema = { $id: "organizing/content-farm/source-cycle/farm-plan", title: "ContentFarmSourceCycleFarmPlan", additionalProperties: false, type: "object", required: ["name", "port", "propertyCount", "properties"], properties: { name: { minLength: 1, type: "string" }, port: { minimum: 0, type: "integer" }, propertyCount: { minimum: 0, type: "integer" }, properties: { type: "array", items: ContentFarmSourceCyclePropertyPlanSchema } } } as const;

export const ContentFarmSourceCycleOperatorPlanSchema = { $id: "organizing/content-farm/source-cycle/operator-plan", title: "ContentFarmSourceCycleOperatorPlan", additionalProperties: false, type: "object", required: ["planUrl", "runUrl", "publicationGate"], properties: { planUrl: { minLength: 1, type: "string" }, runUrl: { minLength: 1, type: "string" }, publicationGate: { minLength: 1, type: "string" } } } as const;

export const ContentFarmSourceCyclePlanSchema = { $id: "organizing/content-farm/source-cycle/plan", title: "ContentFarmSourceCyclePlan", additionalProperties: false, type: "object", required: ["kind", "configPath", "cable", "farm", "operator"], properties: { kind: { const: "organizing.content-farm.source-cycle.plan" }, configPath: { minLength: 1, type: "string" }, cable: ContentFarmSourceCycleCablePlanSchema, farm: ContentFarmSourceCycleFarmPlanSchema, operator: ContentFarmSourceCycleOperatorPlanSchema } } as const;

export type ContentFarmSourceCycleWirePlan = FromSchema<typeof ContentFarmSourceCycleWirePlanSchema>;
export type ContentFarmSourceCycleCablePlan = FromSchema<typeof ContentFarmSourceCycleCablePlanSchema>;
export type ContentFarmSourceCyclePropertyPlan = FromSchema<typeof ContentFarmSourceCyclePropertyPlanSchema>;
export type ContentFarmSourceCycleFarmPlan = FromSchema<typeof ContentFarmSourceCycleFarmPlanSchema>;
export type ContentFarmSourceCycleOperatorPlan = FromSchema<typeof ContentFarmSourceCycleOperatorPlanSchema>;
export type ContentFarmSourceCyclePlan = FromSchema<typeof ContentFarmSourceCyclePlanSchema>;

export function readContentFarmConfigDocument(configPath: string): unknown {
  return JSON.parse(readFileSync(configPath, "utf8")) as unknown;
}

export function readContentFarmConfig(configPath: string): ContentFarmConfig {
  return contentFarmConfigFromDocument(readContentFarmConfigDocument(configPath));
}

export function readContentFarmProperty(configPath: string, index = 0): FarmProperty {
  const property = readContentFarmConfig(configPath).properties[index];
  if (property === undefined) throw new TypeError(`content farm config has no property at index ${index}`);
  return property;
}

export const contentFarmSourceCyclePlanCarrier = carrierFrom(ContentFarmSourceCyclePlanSchema);

export function contentFarmSourceCyclePlan(input: Omit<ContentFarmSourceCyclePlan, "kind">): ContentFarmSourceCyclePlan {
  return contentFarmSourceCyclePlanCarrier.assert({
    kind: "organizing.content-farm.source-cycle.plan" as const,
    ...input,
    cable: {
      ...input.cable,
      wires: input.cable.wires.map((wire) => ({ ...wire, sources: [...wire.sources] })),
    },
    farm: {
      ...input.farm,
      properties: input.farm.properties.map((property) => ({ ...property, beats: [...property.beats] })),
    },
  }, "content farm source cycle plan");
}

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function integerValueOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function sourceCycleSourceLabel(source: unknown): string {
  if (!isJsonRecord(source)) return "(unreadable source)";
  const adapter = textValue(source["adapter"], "source");
  const locator = textValue(source["url"]) || textValue(source["query"]) || adapter;
  return `${adapter}:${locator}`;
}

export function contentFarmSourceCycleWirePlans(document: unknown): readonly ContentFarmSourceCycleWirePlan[] {
  const root = isJsonRecord(document) ? document : {};
  const cable = isJsonRecord(root["newscable"]) ? root["newscable"] : {};
  const wires = Array.isArray(cable["wires"]) ? cable["wires"] : [];
  return Object.freeze(wires.flatMap((wire): ContentFarmSourceCycleWirePlan[] => {
    if (!isJsonRecord(wire)) return [];
    const sources = Array.isArray(wire["sources"]) ? wire["sources"].map(sourceCycleSourceLabel) : [];
    return [{
      name: textValue(wire["name"], "unnamed-wire"),
      sourceCount: sources.length,
      sources,
    }];
  }));
}

export function contentFarmSourceCycleCablePlanFromDocument(document: unknown): ContentFarmSourceCycleCablePlan {
  const root = isJsonRecord(document) ? document : {};
  const cable = isJsonRecord(root["newscable"]) ? root["newscable"] : {};
  const wires = contentFarmSourceCycleWirePlans(document);
  return {
    title: textValue(cable["title"], "source cable"),
    domain: textValue(cable["domain"], "localhost"),
    port: integerValueOrNull(cable["port"]),
    wireCount: wires.length,
    sourceCount: wires.reduce((sum, wire) => sum + wire.sourceCount, 0),
    wires: wires.map((wire) => ({ ...wire, sources: [...wire.sources] })),
  };
}

export function contentFarmSourceCycleFarmPlanFromConfig(config: ContentFarmConfig): ContentFarmSourceCycleFarmPlan {
  return {
    name: config.name,
    port: config.port,
    propertyCount: config.properties.length,
    properties: config.properties.map((property) => {
      const beats = Object.keys(property.beatSources).sort();
      return {
        name: property.name,
        contentDir: property.contentDir,
        dataDir: property.dataDir,
        beatCount: beats.length,
        beats,
        seedCount: property.seeds.length,
      };
    }),
  };
}

export function contentFarmSourceCyclePlanFromDocument(input: Readonly<{
  configPath: string;
  document: unknown;
  operator: ContentFarmSourceCycleOperatorPlan;
}>): ContentFarmSourceCyclePlan {
  return contentFarmSourceCyclePlan({
    configPath: input.configPath,
    cable: contentFarmSourceCycleCablePlanFromDocument(input.document),
    farm: contentFarmSourceCycleFarmPlanFromConfig(contentFarmConfigFromDocument(input.document)),
    operator: input.operator,
  });
}

export function contentFarmSourceCyclePlanTerm(input: ContentFarmSourceCyclePlan): Tm {
  return carrierToTerm(jsonResource(contentFarmSourceCyclePlanCarrier.assert(input), "content farm source cycle plan"));
}

export const ContentFarmSourceCycleIngestResultSchema = { $id: "organizing/content-farm/source-cycle/ingest-result", title: "ContentFarmSourceCycleIngestResult", additionalProperties: false, type: "object", required: ["wire", "storeDir", "written", "skipped", "errors"], properties: { wire: { minLength: 1, type: "string" }, storeDir: { minLength: 1, type: "string" }, written: { minimum: 0, type: "integer" }, skipped: { minimum: 0, type: "integer" }, errors: { type: "array", items: { type: "string" } } } } as const;

export const ContentFarmSourceCycleCableReadingSchema = { $id: "organizing/content-farm/source-cycle/cable-reading", title: "ContentFarmSourceCycleCableReading", additionalProperties: false, type: "object", required: ["wireCount", "written", "skipped", "errorCount", "results", "skippedMessages"], properties: { wireCount: { minimum: 0, type: "integer" }, written: { minimum: 0, type: "integer" }, skipped: { minimum: 0, type: "integer" }, errorCount: { minimum: 0, type: "integer" }, results: { type: "array", items: ContentFarmSourceCycleIngestResultSchema }, skippedMessages: { type: "array", items: { type: "string" } } } } as const;

export const ContentFarmSourceCycleEditorialPolicySchema = { $id: "organizing/content-farm/source-cycle/editorial-policy", title: "ContentFarmSourceCycleEditorialPolicy", additionalProperties: false, type: "object", required: ["record", "publication", "note"], properties: { record: { const: "draft-candidate" }, publication: { minLength: 1, type: "string" }, note: { minLength: 1, type: "string" } } } as const;

export const ContentFarmSourceCycleReadingSchema = { $id: "organizing/content-farm/source-cycle/reading", title: "ContentFarmSourceCycleReading", additionalProperties: false, type: "object", required: ["kind", "generatedAt", "plan", "cable", "farm", "candidateWriteCollisions", "candidateReferences", "candidateDraftInternalLinkGuidance", "editorialPolicy"], properties: { kind: { const: "organizing.content-farm.source-cycle" }, generatedAt: { minLength: 1, type: "string" }, plan: ContentFarmSourceCyclePlanSchema, cable: ContentFarmSourceCycleCableReadingSchema, farm: {}, candidateWriteCollisions: { type: "array", items: SourceCycleCandidateWriteCollisionSchema }, candidateReferences: { type: "array", items: SourceCycleCandidateReferenceNormalizationSchema }, candidateDraftInternalLinkGuidance: { type: "array", items: SourceCycleCandidateDraftInternalLinkGuidanceSchema }, editorialPolicy: ContentFarmSourceCycleEditorialPolicySchema } } as const;

export type ContentFarmSourceCycleIngestResult = FromSchema<typeof ContentFarmSourceCycleIngestResultSchema>;
export type ContentFarmSourceCycleCableReading = FromSchema<typeof ContentFarmSourceCycleCableReadingSchema>;
export type ContentFarmSourceCycleEditorialPolicy = FromSchema<typeof ContentFarmSourceCycleEditorialPolicySchema>;
export type ContentFarmSourceCycleReading = Omit<FromSchema<typeof ContentFarmSourceCycleReadingSchema>, "farm"> & Readonly<{
  farm: FarmCycleReading;
}>;

export const contentFarmSourceCycleReadingCarrier = carrierFrom(ContentFarmSourceCycleReadingSchema);

function contentFarmSourceCycleIngestResult(input: IngestResult): ContentFarmSourceCycleIngestResult {
  return {
    wire: input.wire,
    storeDir: input.storeDir,
    written: input.written,
    skipped: input.skipped,
    errors: [...input.errors],
  };
}

export function contentFarmSourceCycleReading(input: Omit<
  ContentFarmSourceCycleReading,
  "kind" | "cable" | "candidateWriteCollisions" | "candidateReferences" | "candidateDraftInternalLinkGuidance"
> & Readonly<{
  cable: Omit<ContentFarmSourceCycleCableReading, "results" | "skippedMessages"> & Readonly<{
    results: readonly IngestResult[];
    skippedMessages: readonly string[];
  }>;
  candidateWriteCollisions: readonly SourceCycleCandidateWriteCollision[];
  candidateReferences: readonly SourceCycleCandidateReferenceNormalization[];
  candidateDraftInternalLinkGuidance: readonly SourceCycleCandidateDraftInternalLinkGuidance[];
}>): ContentFarmSourceCycleReading {
  return contentFarmSourceCycleReadingCarrier.assert({
    kind: "organizing.content-farm.source-cycle" as const,
    ...input,
    plan: contentFarmSourceCyclePlan(input.plan),
    cable: {
      ...input.cable,
      results: input.cable.results.map((result) => contentFarmSourceCycleIngestResult(result)),
      skippedMessages: [...input.cable.skippedMessages],
    },
    candidateWriteCollisions: [...input.candidateWriteCollisions],
    candidateReferences: [...input.candidateReferences],
    candidateDraftInternalLinkGuidance: [...input.candidateDraftInternalLinkGuidance],
  }, "content farm source cycle reading") as ContentFarmSourceCycleReading;
}

export function contentFarmSourceCycleReadingTerm(input: ContentFarmSourceCycleReading): Tm {
  return carrierToTerm(jsonResource(contentFarmSourceCycleReadingCarrier.assert(input), "content farm source cycle reading"));
}

export const ContentFarmCandidateSnapshotSchema = { $id: "organizing/content-farm/candidate-snapshot", title: "ContentFarmCandidateSnapshot", additionalProperties: false, type: "object", required: ["kind", "path", "text", "slug", "draft"], properties: { kind: { const: "organizing.content-farm.candidate-snapshot" }, path: { minLength: 1, type: "string" }, text: { type: "string" }, slug: { minLength: 1, type: "string" }, draft: { type: "boolean" }, title: { minLength: 1, type: "string" } } } as const;

export type ContentFarmCandidateSnapshot = FromSchema<typeof ContentFarmCandidateSnapshotSchema>;

export const contentFarmCandidateSnapshotCarrier = carrierFrom(ContentFarmCandidateSnapshotSchema);

function manuscriptSlug(frontMatter: Readonly<Record<string, unknown>>, fallback: string): string {
  return textValue(frontMatter["slug"], fallback);
}

function frontMatterDraft(frontMatter: Readonly<Record<string, unknown>>): boolean {
  return frontMatter["draft"] === true || frontMatter["draft"] === "true";
}

export function contentFarmCandidateSnapshot(input: Omit<ContentFarmCandidateSnapshot, "kind">): ContentFarmCandidateSnapshot {
  return contentFarmCandidateSnapshotCarrier.assert({
    kind: "organizing.content-farm.candidate-snapshot" as const,
    ...input,
    ...(input.title === undefined ? {} : { title: input.title }),
  }, "content farm candidate snapshot");
}

export function contentFarmCandidateSnapshots(config: ContentFarmConfig): readonly ContentFarmCandidateSnapshot[] {
  const snapshots: ContentFarmCandidateSnapshot[] = [];
  for (const property of config.properties) {
    if (!existsSync(property.contentDir)) continue;
    for (const entry of readdirSync(property.contentDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const path = join(property.contentDir, entry.name);
      const text = readFileSync(path, "utf8");
      const document = decodeFrontMatterDocument(text);
      const title = textValue(document.frontMatter["title"]);
      snapshots.push(contentFarmCandidateSnapshot({
        path,
        text,
        slug: manuscriptSlug(document.frontMatter, entry.name.replace(/\.md$/, "")),
        draft: frontMatterDraft(document.frontMatter),
        ...(title === "" ? {} : { title }),
      }));
    }
  }
  return Object.freeze(snapshots);
}

export function contentFarmCollisionPathSet(collisions: readonly SourceCycleCandidateWriteCollision[]): ReadonlySet<string> {
  return new Set(collisions.map((collision) => resolve(collision.path)));
}

export function restoreContentFarmCandidateWriteCollisions(
  cycle: FarmCycle,
  snapshots: readonly ContentFarmCandidateSnapshot[],
  options: Readonly<{ instruction?: string }> = {},
): readonly SourceCycleCandidateWriteCollision[] {
  const byPath = new Map(snapshots.map((snapshot) => [resolve(snapshot.path), snapshot]));
  const collisions: SourceCycleCandidateWriteCollision[] = [];
  for (const reading of cycle.readings) {
    const run = reading.run;
    if (run.kind !== "content.farm.cultivation:witness" || run.path === null) continue;
    const snapshot = byPath.get(resolve(run.path));
    if (snapshot === undefined) continue;
    const current = existsSync(run.path) ? readFileSync(run.path, "utf8") : "";
    const restored = current !== snapshot.text;
    if (restored) writeFileSync(run.path, snapshot.text, "utf8");
    collisions.push(sourceCycleCandidateWriteCollision({
      slug: snapshot.slug,
      path: run.path,
      existingDraft: snapshot.draft,
      ...(snapshot.title === undefined ? {} : { existingTitle: snapshot.title }),
      runTitle: run.draft.title,
      restored,
      instruction: options.instruction ?? "The farm attempted to write a draft candidate at an existing manuscript path. The existing manuscript was restored; create a new assignment or unique draft slug before writing this candidate.",
    }));
  }
  return Object.freeze(collisions);
}

export function contentFarmCandidateSnapshotTerm(input: ContentFarmCandidateSnapshot): Tm {
  return carrierToTerm(jsonResource(contentFarmCandidateSnapshotCarrier.assert(input), "content farm candidate snapshot"));
}

export type NormalizeContentFarmCandidateReferencesOptions = Readonly<{
  path: string;
  license: string;
  licenseUrl: string;
  syndicationRights: string;
}>;

function frontMatterStrings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => frontMatterStrings(item)));
  return Object.freeze([String(value)]);
}

export function normalizeContentFarmCandidateReferences(options: NormalizeContentFarmCandidateReferencesOptions): SourceCycleCandidateReferenceNormalization {
  const document = decodeFrontMatterDocument(readFileSync(options.path, "utf8"));
  const sourceUrls = frontMatterStrings(document.frontMatter["sources"]).filter((source) => /^https?:\/\//i.test(source));
  const existingReferences = Array.isArray(document.frontMatter["references"]) ? document.frontMatter["references"] : [];
  const nextReferences = existingReferences.length > 0 ? normalizeCslReferenceRecords(existingReferences) : referencesFromSourceUrls(sourceUrls);
  const frontMatter = { ...document.frontMatter } as FrontMatterRecord;
  const changed = "sources" in frontMatter
    || JSON.stringify(existingReferences) !== JSON.stringify(nextReferences)
    || frontMatter["license"] === undefined
    || frontMatter["license_url"] === undefined
    || frontMatter["syndication_rights"] === undefined;
  if (changed) {
    const { sources: _sources, ...withoutSources } = frontMatter;
    writeFileSync(options.path, encodeFrontMatterDocument({
      kind: "producing-content.frontmatter-document" as const,
      frontMatter: Object.freeze({
        ...withoutSources,
        ...(nextReferences.length === 0 ? {} : { references: Object.freeze(nextReferences) }),
        license: withoutSources["license"] ?? options.license,
        license_url: withoutSources["license_url"] ?? options.licenseUrl,
        syndication_rights: withoutSources["syndication_rights"] ?? options.syndicationRights,
      }),
      body: document.body.endsWith("\n") ? document.body : `${document.body}\n`,
    }), "utf8");
  }
  return sourceCycleCandidateReferenceNormalization({
    slug: manuscriptSlug(document.frontMatter, basename(options.path).replace(/\.md$/, "")),
    path: options.path,
    changed,
    sourceUrlCount: sourceUrls.length,
    referenceCount: nextReferences.length,
  });
}

export const ContentFarmDraftManuscriptWriteSchema = { $id: "organizing/content-farm/draft-manuscript/write", title: "ContentFarmDraftManuscriptWrite", additionalProperties: false, type: "object", required: ["kind", "contentDir", "slug", "path", "result"], properties: { kind: { const: "organizing.content-farm.draft-manuscript.write" }, contentDir: { minLength: 1, type: "string" }, slug: { minLength: 1, type: "string" }, path: { minLength: 1, type: "string" }, result: CreateDraftManuscriptResultSchema } } as const;

export type ContentFarmDraftManuscriptWrite = FromSchema<typeof ContentFarmDraftManuscriptWriteSchema>;

export const contentFarmDraftManuscriptWriteCarrier = carrierFrom(ContentFarmDraftManuscriptWriteSchema);

export type WriteContentFarmDraftManuscriptOptions = Readonly<{
  contentDir: string;
  input: CreateDraftManuscriptInput;
  author: string;
  license: string;
  licenseUrl: string;
  syndicationRights: string;
  category?: string;
  extraFrontMatter?: Readonly<Record<string, unknown>>;
  slugWordLimit?: number;
  now?: () => string;
}>;

function draftDayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function draftWordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

function uniqueDraftSlug(contentDir: string, base: string): string {
  const stem = base || "draft";
  let slug = stem;
  let index = 2;
  while (existsSync(join(contentDir, `${slug}.md`))) {
    slug = `${stem}-${index}`;
    index += 1;
  }
  return slug;
}

export function writeContentFarmDraftManuscript(options: WriteContentFarmDraftManuscriptOptions): ContentFarmDraftManuscriptWrite {
  const input = options.input;
  const wordLimit = options.slugWordLimit ?? 12;
  const baseSlug = newsSlug(input.slug ?? input.title).split("-").slice(0, wordLimit).join("-");
  const slug = uniqueDraftSlug(options.contentDir, baseSlug);
  const path = join(options.contentDir, `${slug}.md`);
  const category = input.category ?? options.category ?? "News";
  const tags = input.tags ?? [input.seoTerm];
  const frontMatter: FrontMatterRecord = Object.freeze({
    title: input.title,
    date: input.date ?? (options.now ?? draftDayStamp)(),
    draft: true,
    author: options.author,
    slug,
    description: input.summary,
    summary: input.summary,
    keywords: Object.freeze([input.seoTerm]),
    categories: Object.freeze([category]),
    tags: Object.freeze(tags),
    references: Object.freeze(input.references),
    license: input.license ?? options.license,
    license_url: input.licenseUrl ?? options.licenseUrl,
    syndication_rights: input.syndicationRights ?? options.syndicationRights,
    ...(options.extraFrontMatter ?? {}),
  });
  mkdirSync(options.contentDir, { recursive: true });
  writeFileSync(path, encodeFrontMatterDocument({
    kind: "producing-content.frontmatter-document" as const,
    frontMatter,
    body: `${input.body.trim()}\n`,
  }), { encoding: "utf8", flag: "wx" });
  const result = draftManuscriptCreated({
    slug,
    path,
    title: input.title,
    wordCount: draftWordCount(input.body),
    referenceCount: input.references.length,
    license: input.license ?? options.license,
    licenseUrl: input.licenseUrl ?? options.licenseUrl,
    syndicationRights: input.syndicationRights ?? options.syndicationRights,
  });
  return contentFarmDraftManuscriptWriteCarrier.assert({
    kind: "organizing.content-farm.draft-manuscript.write" as const,
    contentDir: options.contentDir,
    slug,
    path,
    result,
  }, "content farm draft manuscript write");
}

export function contentFarmDraftManuscriptWriteTerm(input: ContentFarmDraftManuscriptWrite): Tm {
  return carrierToTerm(jsonResource(contentFarmDraftManuscriptWriteCarrier.assert(input), "content farm draft manuscript write"));
}

export const ContentFarmPostClaimSchema = { $id: "organizing/content-farm/post/claim", title: "ContentFarmPostClaim", additionalProperties: false, type: "object", required: ["predicate", "object"], properties: { predicate: { minLength: 1, type: "string" }, object: {}, citation: { minLength: 1, type: "string" }, claimedBy: { anyOf: [{ minLength: 1, type: "string" }, { type: "array", items: { minLength: 1, type: "string" } }] }, contraryClaimedBy: { anyOf: [{ minLength: 1, type: "string" }, { type: "array", items: { minLength: 1, type: "string" } }] } } } as const;

export const ContentFarmPostClaimSetSchema = { $id: "organizing/content-farm/post/claim-set", title: "ContentFarmPostClaimSet", additionalProperties: false, type: "object", required: ["subject"], properties: { subject: { minLength: 1, type: "string" }, potential: { type: "array", items: ContentFarmPostClaimSchema }, active: { type: "array", items: ContentFarmPostClaimSchema }, stable: { type: "array", items: ContentFarmPostClaimSchema } } } as const;

export const ContentFarmPostClaimsReadingSchema = { $id: "organizing/content-farm/post/claims-reading", title: "ContentFarmPostClaimsReading", additionalProperties: false, type: "object", required: ["kind", "slug", "citation", "shipped", "claimSet"], properties: { kind: { const: "organizing.content-farm.post.claims" }, slug: { minLength: 1, type: "string" }, citation: { minLength: 1, type: "string" }, shipped: { type: "boolean" }, claimSet: ContentFarmPostClaimSetSchema } } as const;

export type ContentFarmPostClaim = FromSchema<typeof ContentFarmPostClaimSchema>;
export type ContentFarmPostClaimSet = FromSchema<typeof ContentFarmPostClaimSetSchema>;
export type ContentFarmPostClaimsReading = FromSchema<typeof ContentFarmPostClaimsReadingSchema>;

export const contentFarmPostClaimCarrier = carrierFrom(ContentFarmPostClaimSchema);

export const contentFarmPostClaimSetCarrier = carrierFrom(ContentFarmPostClaimSetSchema);

export const contentFarmPostClaimsReadingCarrier = carrierFrom(ContentFarmPostClaimsReadingSchema);

export type ContentFarmPostClaimsInput = Readonly<{
  slug: string;
  document: FrontMatterDocument;
  fallbackCitation?: string;
}>;

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap((item) => strings(item));
  return [String(value)];
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function instantString(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
}

function contentFarmPostClaim(predicate: string, object: unknown, citation: string): NewsClaim {
  return contentFarmPostClaimCarrier.assert({ predicate, object, citation }, "content farm post claim");
}

export function contentFarmPostClaimsReading(input: ContentFarmPostClaimsInput): ContentFarmPostClaimsReading {
  const fm = input.document.frontMatter;
  const koios = (fm["koios"] ?? {}) as Readonly<Record<string, unknown>>;
  const citation = maybeString(koios["original_permalink"]) ?? input.fallbackCitation ?? `content-farm:post:${input.slug}`;
  const potential: NewsClaim[] = [];
  const headline = maybeString(fm["title"]);
  if (headline) potential.push(contentFarmPostClaim("headline", headline, citation));
  const summary = maybeString(fm["summary"]) ?? maybeString(fm["description"]);
  if (summary) potential.push(contentFarmPostClaim("summary", summary, citation));
  const published = maybeString(fm["date"]);
  if (published) potential.push(contentFarmPostClaim("published-at", instantString(published), citation));
  const author = maybeString(fm["author"]);
  if (author) potential.push(contentFarmPostClaim("author", author, citation));
  for (const keyword of strings(fm["keywords"])) potential.push(contentFarmPostClaim("keyword", keyword, citation));
  for (const tag of strings(fm["tags"])) potential.push(contentFarmPostClaim("tag", tag, citation));
  const categories = strings(fm["categories"]);
  for (const category of categories) potential.push(contentFarmPostClaim("category", category, citation));
  if (categories[0]) potential.push(contentFarmPostClaim("section", categories[0], citation));
  const shipped = fm["draft"] !== true && fm["draft"] !== "true";
  if (shipped) {
    for (const stage of DEFAULT_LIFECYCLE) potential.push(contentFarmPostClaim(stage.gate, GATE_PASS, citation));
    potential.push(contentFarmPostClaim(STATUS_PREDICATE, PUBLISHED, citation));
  }
  const claimSet = contentFarmPostClaimSetCarrier.assert({
    subject: input.slug,
    potential: Object.freeze(potential),
  }, "content farm post claim set") satisfies NewsClaimSet;
  return contentFarmPostClaimsReadingCarrier.assert({
    kind: "organizing.content-farm.post.claims" as const,
    slug: input.slug,
    citation,
    shipped,
    claimSet,
  }, "content farm post claims reading");
}

export function contentFarmPostClaimSet(input: ContentFarmPostClaimsInput): NewsClaimSet {
  return contentFarmPostClaimsReading(input).claimSet;
}

export function contentFarmPostClaimsReadingTerm(input: ContentFarmPostClaimsReading): Tm {
  return carrierToTerm(jsonResource(contentFarmPostClaimsReadingCarrier.assert(input), "content farm post claims reading"));
}

export const ContentFarmPostFileReadingSchema = { $id: "organizing/content-farm/post/file-reading", title: "ContentFarmPostFileReading", additionalProperties: false, type: "object", required: ["kind", "path", "slug", "document", "claims"], properties: { kind: { const: "organizing.content-farm.post.file-reading" }, path: { minLength: 1, type: "string" }, slug: { minLength: 1, type: "string" }, document: {}, claims: ContentFarmPostClaimsReadingSchema } } as const;

export type ContentFarmPostFileReading = Omit<FromSchema<typeof ContentFarmPostFileReadingSchema>, "document" | "claims"> & Readonly<{
  document: FrontMatterDocument;
  claims: ContentFarmPostClaimsReading;
}>;

export const contentFarmPostFileReadingCarrier = carrierFrom(ContentFarmPostFileReadingSchema);

export type ReadContentFarmPostFileOptions = Readonly<{
  fallbackCitation?: string | ((slug: string) => string);
}>;

function fallbackCitationFor(slug: string, fallback: string | ((slug: string) => string) | undefined): string | undefined {
  return typeof fallback === "function" ? fallback(slug) : fallback;
}

export function readContentFarmPostFile(path: string, options: ReadContentFarmPostFileOptions = {}): ContentFarmPostFileReading {
  const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
  const slug = maybeString(document.frontMatter["slug"]) ?? basename(path).replace(/\.md$/, "");
  const fallbackCitation = fallbackCitationFor(slug, options.fallbackCitation);
  const claims = contentFarmPostClaimsReading({
    slug,
    document,
    ...(fallbackCitation === undefined ? {} : { fallbackCitation }),
  });
  return contentFarmPostFileReadingCarrier.assert({
    kind: "organizing.content-farm.post.file-reading" as const,
    path,
    slug,
    document,
    claims,
  }, "content farm post file reading") as ContentFarmPostFileReading;
}

export function readContentFarmPostFiles(contentDir: string, options: ReadContentFarmPostFileOptions = {}): readonly ContentFarmPostFileReading[] {
  if (!existsSync(contentDir)) return Object.freeze([]);
  const files = readdirSync(contentDir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort();
  return Object.freeze(files.map((name) => readContentFarmPostFile(join(contentDir, name), options)));
}

export function contentFarmPostFileReadingTerm(input: ContentFarmPostFileReading): Tm {
  return carrierToTerm(jsonResource(contentFarmPostFileReadingCarrier.assert(input), "content farm post file reading"));
}

export const BeatSourceReadingSchema = { $id: "organizing/content-farm/sourcing/beat-source", title: "BeatSourceReading", additionalProperties: false, type: "object", required: ["beat", "sourceCount", "sources", "seedTerms"], properties: { beat: { minLength: 1, type: "string" }, sourceCount: { minimum: 0, type: "integer" }, sources: { type: "array", items: { minLength: 1, type: "string" } }, seedTerms: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const SourcingPolicySchema = { $id: "organizing/content-farm/sourcing/policy", title: "SourcingPolicy", additionalProperties: false, type: "object", required: ["route", "note"], properties: { route: { minLength: 1, type: "string" }, note: { minLength: 1, type: "string" } } } as const;

export const ResearchPacketPolicySchema = { $id: "organizing/content-farm/sourcing/research-packet-policy", title: "ResearchPacketPolicy", additionalProperties: false, type: "object", required: ["route", "assignmentRoute", "note"], properties: { route: { minLength: 1, type: "string" }, assignmentRoute: { minLength: 1, type: "string" }, note: { minLength: 1, type: "string" } } } as const;

export const ContentFarmSourcingDepartmentSchema = { $id: "organizing/content-farm/sourcing/department", title: "ContentFarmSourcingDepartment", additionalProperties: false, type: "object", required: ["department", "property", "farmCorpus", "farmCorpusRoot", "beats", "sourceRoll", "researchPacketPolicy", "submissionDesk", "sourceCount", "seedCount"], properties: { department: { const: "organizing.content-farm.sourcing" }, property: { minLength: 1, type: "string" }, farmCorpus: ContentFarmCorpusSchema, farmCorpusRoot: ContentFarmCorpusRootSchema, beats: { type: "array", items: BeatSourceReadingSchema }, sourceRoll: SourceRollSchema, researchPacketPolicy: ResearchPacketPolicySchema, submissionDesk: SourcingPolicySchema, sourceCount: { minimum: 0, type: "integer" }, seedCount: { minimum: 0, type: "integer" } } } as const;

export type BeatSourceReading = FromSchema<typeof BeatSourceReadingSchema>;
export type SourcingPolicy = FromSchema<typeof SourcingPolicySchema>;
export type ResearchPacketPolicy = FromSchema<typeof ResearchPacketPolicySchema>;
export type ContentFarmSourcingDepartment = FromSchema<typeof ContentFarmSourcingDepartmentSchema>;

export const beatSourceReadingCarrier = carrierFrom(BeatSourceReadingSchema);

export const sourcingPolicyCarrier = carrierFrom(SourcingPolicySchema);

export const researchPacketPolicyCarrier = carrierFrom(ResearchPacketPolicySchema);

export const contentFarmSourcingDepartmentCarrier = carrierFrom(ContentFarmSourcingDepartmentSchema);

export function beatSourceReading(input: BeatSourceReading): BeatSourceReading {
  return beatSourceReadingCarrier.assert({
    ...input,
    sources: [...input.sources],
    seedTerms: [...input.seedTerms],
  }, "beat source reading");
}

export function sourcingPolicy(input: SourcingPolicy): SourcingPolicy {
  return sourcingPolicyCarrier.assert(input, "sourcing policy");
}

export function researchPacketPolicy(input: ResearchPacketPolicy): ResearchPacketPolicy {
  return researchPacketPolicyCarrier.assert(input, "research packet policy");
}

export function contentFarmSourcingDepartment(input: Omit<ContentFarmSourcingDepartment, "department">): ContentFarmSourcingDepartment {
  return contentFarmSourcingDepartmentCarrier.assert({
    department: "organizing.content-farm.sourcing" as const,
    ...input,
    beats: input.beats.map((beat) => beatSourceReading(beat)),
    farmCorpus: contentFarmCorpusCarrier.assert(input.farmCorpus, "content farm sourcing department corpus"),
    farmCorpusRoot: contentFarmCorpusRootCarrier.assert(input.farmCorpusRoot, "content farm sourcing department corpus root"),
    researchPacketPolicy: researchPacketPolicy(input.researchPacketPolicy),
    submissionDesk: sourcingPolicy(input.submissionDesk),
  }, "content farm sourcing department");
}

export function contentFarmSourcingDepartmentTerm(input: ContentFarmSourcingDepartment): Tm {
  return carrierToTerm(jsonResource(contentFarmSourcingDepartmentCarrier.assert(input), "content farm sourcing department"));
}
