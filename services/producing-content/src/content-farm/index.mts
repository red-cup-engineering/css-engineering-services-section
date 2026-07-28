// @red-cup-engineering/producing-content/content-farm — the content-generation engine.
//
// CONTENT-FARM is the property-agnostic generation machinery of
// @red-cup-engineering/producing-content (content + computing): the computing-backed
// autonomous-production engine. A farm is configured with PROPERTIES; each
// property declares its content dir, seed terms, demand source, voice, ask
// model, and gates' parameters. The witnessed `cultivate` cycle is the BASE
// engine, parameterized at the `select` and `compose` seams — a specialization
// such as the newsroom is a fiber over it (see dev/docs/notes/
// 2026-06-15-newsroom-as-fiber-over-content-farm.md). It subsumes the
// koios.news mill (2026-06-12): demand creates the assignment, the term-as-lens
// selects ONE source story, the draft is asked for with a SINGLE LLM call,
// post-produced locally by the editorial closure (deprophesy, dedupe,
// restore-title, safe lint splices — no re-prompt), judged by the gates,
// and the candidate is projected
// draft: true into the property's content store, the run is recorded on
// the append-only run trace, and an editorial work item is deposited to
// the swarm hub. Withheld runs are compost — retained learning substrate,
// read back with their gate evidence by `compost()`.

// ---------- the upstream intake vocabulary (syndication-codecs re-exports) ----------
export type { FetchLike, SyndicationItem, SyndicationConfig } from "../syndication/index.mjs";

// ---------- document/reference codecs absorbed from content ----------
export { decodeFrontMatterDocument, encodeFrontMatterDocument } from "../codecs/frontmatter.mjs";
export type { FrontMatterDocument, FrontMatterRecord } from "../codecs/frontmatter.mjs";
export type { CslDate, CslItem, CslName } from "../codecs/references.mjs";

// ---------- news-document production (domain: @red-cup-engineering/content-topology) ----------
// The article prompt/parse, story selection, and editorial gates are content-
// domain primitives; they live in the content library and are re-exported here
// for the service's consumers. content-farm ORCHESTRATES them (see cultivate).
export {
  FORM_EXEMPLAR_DEFAULT, draftPrompt, parseDraftReply,
  distinctiveTermWords, termSupportCount, selectStory,
  titleFidelityFindings, templateMonotonyCount, judgeDraft,
} from "../topology/article.mjs";
export {
  DEFAULT_LIFECYCLE,
  GATE_FAIL,
  GATE_PASS,
  PUBLISHED,
  STATUS_PREDICATE,
  newsSlug,
} from "../topology/news/index.mjs";
export type { LifecycleStage, NewsClaim, NewsClaimSet } from "../topology/news/index.mjs";
export type {
  ArticleVoice, DraftPromptInput, PostDraft, SourceStory,
  SelectStoryOptions, FarmGate, JudgeContext,
} from "../topology/article.mjs";

// ---------- prose-fitness primitives (domain: @red-cup-engineering/content-topology) ----------
export {
  normalizeTerm,
  wordCount,
  prophecyFindings,
  extractLinks,
  repetitionFindings,
  numberFaithfulnessFindings,
} from "../topology/gates.mjs";

// ---------- demand ----------
export {
  DEMAND_TABLE_CONSTRAINTS,
  DemandEntrySchema,
  DemandEvidenceSchema,
  DemandTableReadingSchema,
  SearchConsoleQuerySchema,
  SeedTermSchema,
  NO_VIEWS,
  demandEntry,
  demandEntryCarrier,
  demandEntryTerm,
  demandEvidence,
  demandEvidenceCarrier,
  demandTable,
  demandTableReading,
  demandTableReadingCarrier,
  demandTableReadingTerm,
  readSearchConsole,
  searchConsoleQuery,
  searchConsoleQueryCarrier,
  searchConsoleQueryTerm,
  seedTerm,
  seedTermCarrier,
  seedTermTerm,
} from "./demand.mjs";
export type {
  SeedTerm,
  SearchConsoleQuery,
  DemandEvidence,
  DemandEntry,
  DemandTableReading,
  CandidatePost,
  ViewCountsReading,
  DemandTableInput,
} from "./demand.mjs";

// ---------- discovery ----------
export {
  CandidateContentKeywordSchema,
  CandidateContentSourceSchema,
  ContentCoverageGapSchema,
  ContentDiscoveryReadingSchema,
  ContentTrendSignalSchema,
  ContentTrendsReadingSchema,
  candidateContentKeyword,
  candidateContentKeywordCarrier,
  candidateContentKeywordTerm,
  candidateContentSource,
  candidateContentSourceCarrier,
  candidateContentSourceTerm,
  contentCoverageGap,
  contentCoverageGapCarrier,
  contentCoverageGapTerm,
  contentDiscoveryReading,
  contentDiscoveryReadingCarrier,
  contentDiscoveryReadingTerm,
  contentTrendsReading,
  contentTrendsReadingCarrier,
  contentTrendsReadingTerm,
} from "./discovery.mjs";
export type {
  CandidateContentKeyword,
  CandidateContentSource,
  ContentCoverageGap,
  ContentDiscoveryReading,
  ContentTrendSignal,
  ContentTrendsReading,
} from "./discovery.mjs";

// ---------- properties ----------
export {
  candidateDocument,
  farmLogPath,
  farmRecordPath,
  loadCandidates,
  normalizeFarmProperty,
  runsPath,
  searchConsolePath,
} from "./property.mjs";
export type { CandidateDocumentInput, FarmDemandSource, FarmProperty } from "./property.mjs";

// ---------- the cultivation cycle, its trace, and the compost ----------
export {
  cultivate,
  intakeItems,
  isCultivationObstruction,
  depositEditorialWork,
  compost,
} from "./cultivate.mjs";
export type {
  Ask,
  SelectStory,
  ComposeDraft,
  CycleSettlement,
  RecordContext,
  RecordCycle,
  CultivateOptions,
  CultivationResult,
  CultivationObstruction,
  CultivationJudgment,
  FarmHub,
  DeskWitness,
  DeskObstruction,
  DeskJudgment,
  RunWitness,
  RecordRun,
  CompostEntry,
} from "./cultivate.mjs";

// ---------- the newsroom fiber (newsroom's special functions as seams) ----------
export {
  cleanProse, sentences,
  synthesisPrompt, structureBrief, synthesizeBrief,
  newsroomCompose,
  keywordsOf, assignmentPrompt, parseAngles, clusterSources,
  newsroomSelect,
  articleSubject, sourceWrites, briefWrites,
  newsroomRecord,
  assignAngles, runNewsroomCycle,
} from "./newsroom.mjs";
export type { StructuredBrief, NewsroomCultivation, NewsroomCycleOptions, NewsroomCycleResult } from "./newsroom.mjs";

// ---------- producing content as an organizing carrier ----------
export {
  producingContentCycle,
  producingContentCycleCarrier,
  producingContentCycleTerm,
} from "./producing-content.mjs";
export type {
  ProducingContentCycle,
  ProducingContentCycleInput,
  ProducingContentRunReading,
} from "./producing-content.mjs";

// ---------- farm repair packets as TypeBox/IR carriers ----------
export {
  ContentFarmCandidateStateSchema,
  ContentFarmRepairPacketSchema,
  ContentFarmRepairPacketsReadingSchema,
  ContentFarmRepairTaskSchema,
  contentFarmRepairPacketCarrier,
  contentFarmRepairPacketsReadingCarrier,
  contentFarmRepairPacketTerm,
  contentFarmRepairPacketsReading,
  contentFarmRepairPacketsReadingTerm,
} from "./repair-packets.mjs";
export type {
  ContentFarmCandidateState,
  ContentFarmRepairPacket,
  ContentFarmRepairPacketsOptions,
  ContentFarmRepairPacketsReading,
  ContentFarmRepairTask,
  ContentFarmRepairTaskKind,
} from "./repair-packets.mjs";

// ---------- submitted sources as farm assignments ----------
export {
  BeatFitScoreSchema,
  GatheredSourcesSchema,
  SourceSubmissionAppraisalSchema,
  SourceSubmissionCultivatedSchema,
  SourceSubmissionJudgmentSchema,
  SourceSubmissionOutOfFrameSchema,
  SubmittedSourceSchema,
  appraiseSubmission,
  gatheredSourcesCarrier,
  gatherRelatedSources,
  isOutOfFrame,
  sourceSubmissionAppraisalCarrier,
  sourceSubmissionAppraisalTerm,
  sourceSubmissionCultivatedCarrier,
  sourceSubmissionJudgmentTerm,
  sourceSubmissionOutOfFrameCarrier,
  submitSource,
  submittedSourceCarrier,
  submittedSourceTerm,
  syndicationItemFromSubmission,
} from "./source-submission.mjs";
export type {
  BeatFitScore,
  GatheredSources,
  SourceSubmissionCultivated,
  SourceSubmissionJudgment,
  SourceSubmissionOutOfFrame,
  SubmissionAppraisal,
  SubmitSourceOptions,
  SubmittedSource,
} from "./source-submission.mjs";

// ---------- research packets from owned wire evidence ----------
export {
  ResearchPacketClaimSchema,
  ResearchPacketInputSchema,
  ResearchPacketRiskSchema,
  ResearchPacketSchema,
  ResearchPacketSourceSchema,
  ResearchPacketWarrantSchema,
  researchPacket,
  researchPacketCarrier,
  researchPacketClaimCarrier,
  researchPacketJsonSchema,
  researchPacketSourceCarrier,
  researchPacketTerm,
} from "./research-packets.mjs";
export type {
  ResearchPacket,
  ResearchPacketClaim,
  ResearchPacketInput,
  ResearchPacketRisk,
  ResearchPacketSource,
} from "./research-packets.mjs";

// ---------- editorial assignments ----------
export {
  AssignmentActivityArtifactSchema,
  AssignmentActivityArtifactsSchema,
  AssignmentActivityEventKindSchema,
  AssignmentActivityEventSchema,
  AssignmentActivityReadingSchema,
  AssignmentEvidenceSchema,
  AssignmentLogAssignmentSchema,
  AssignmentLogCompletedEventSchema,
  AssignmentLogCreatedEventSchema,
  AssignmentLogEventSchema,
  AssignmentLogNotedEventSchema,
  AssignmentLogProjectionReadingSchema,
  AssignmentManuscriptArtifactSchema,
  AssignmentNoteSchema,
  AssignmentReadingSchema,
  AssignmentStatusSchema,
  AssignmentWorkOrderActionsSchema,
  AssignmentWorkOrderSchema,
  OperatorWorkQueueItemKindSchema,
  OperatorWorkQueueItemSchema,
  OperatorWorkQueueLaneSchema,
  OperatorWorkQueueLanesSchema,
  OperatorWorkQueueReadingSchema,
  ASSIGNMENT_LOG_FILE,
  ASSIGNMENT_RECORD_FILE,
  CompleteAssignmentResultSchema,
  CreateAssignmentInputSchema,
  CreateAssignmentNoteResultSchema,
  CreateAssignmentResultSchema,
  assignmentActivityFromLog,
  assignmentActivityEvent,
  assignmentActivityEventCarrier,
  assignmentActivityReading,
  assignmentActivityReadingCarrier,
  assignmentActivityReadingTerm,
  assignmentBaseId,
  assignmentCarrier,
  assignmentLogAssignment,
  assignmentLogAssignmentCarrier,
  assignmentLogCompletedEvent,
  assignmentLogCreatedEvent,
  assignmentLogEvent,
  assignmentLogEventCarrier,
  assignmentLogEventTerm,
  assignmentLogNotedEvent,
  assignmentLogPath,
  assignmentLogProjectionReading,
  assignmentLogProjectionReadingCarrier,
  assignmentLogProjectionReadingTerm,
  assignmentManuscriptArtifact,
  assignmentManuscriptArtifactCarrier,
  assignmentManuscriptArtifactTerm,
  assignmentNoteCarrier,
  assignmentRecordPath,
  assignmentTerm,
  assignmentWorkOrder,
  assignmentWorkOrderCarrier,
  assignmentWorkOrderTerm,
  completeAssignment,
  completeAssignmentResult,
  completeAssignmentResultCarrier,
  completeAssignmentResultTerm,
  createAssignment,
  createAssignmentInputCarrier,
  createAssignmentInputFromDemand,
  createAssignmentInputTerm,
  createAssignmentJsonSchema,
  createAssignmentNoteResult,
  createAssignmentNoteResultCarrier,
  createAssignmentNoteResultTerm,
  createAssignmentResult,
  createAssignmentResultCarrier,
  createAssignmentResultTerm,
  createAssignmentNoteJsonSchema,
  ensureAssignmentStore,
  normalizeCreateAssignmentInput,
  normalizeCreateAssignmentNoteInput,
  operatorWorkQueueItem,
  operatorWorkQueueItemCarrier,
  operatorWorkQueueReading,
  operatorWorkQueueReadingCarrier,
  operatorWorkQueueReadingTerm,
  projectAssignmentLog,
  readAssignment,
  readAssignmentActivity,
  readAssignmentLog,
  readAssignmentLogProjection,
  readAssignments,
  recordAssignmentNote,
  replayAssignmentLog,
  writeAssignmentProjection,
} from "./assignments.mjs";
export type {
  AssignmentActivityArtifact,
  AssignmentActivityArtifacts,
  AssignmentActivityEvent,
  AssignmentActivityEventKind,
  AssignmentActivityReading,
  AssignmentEvidence,
  AssignmentLogAssignment,
  AssignmentLogCompletedEvent,
  AssignmentLogCreatedEvent,
  AssignmentLogEvent,
  AssignmentLogNotedEvent,
  AssignmentLogProjectionReading,
  AssignmentManuscriptArtifact,
  AssignmentNoteReading,
  AssignmentReading,
  AssignmentStatus,
  AssignmentWorkOrder,
  AssignmentWorkOrderActions,
  CompleteAssignmentResult,
  CreateAssignmentInput,
  CreateAssignmentNoteInput,
  CreateAssignmentNoteResult,
  CreateAssignmentResult,
  OperatorWorkQueueItem,
  OperatorWorkQueueItemKind,
  OperatorWorkQueueLane,
  OperatorWorkQueueLanes,
  OperatorWorkQueueReading,
} from "./assignments.mjs";

// ---------- topical desks ----------
export {
  ContentFarmDeskEnqueueWitnessSchema,
  ContentFarmDeskObstructionSchema,
  ContentDeskAxesSchema,
  ContentDeskSchema,
  ContentDesksReadingSchema,
  EditorialOfficeSchema,
  EditorialWorkItemFieldsSchema,
  EditorialWorkItemSchema,
  contentFarmDeskEnqueueWitness,
  contentFarmDeskEnqueueWitnessCarrier,
  contentFarmDeskEnqueueWitnessTerm,
  contentFarmDeskObstruction,
  contentFarmDeskObstructionCarrier,
  contentFarmDeskObstructionTerm,
  contentDesk,
  contentDeskCarrier,
  contentDeskTerm,
  contentDesksReading,
  contentDesksReadingCarrier,
  contentDesksReadingTerm,
  editorialWorkItem,
  editorialWorkItemCarrier,
  editorialWorkItemTerm,
} from "./desks.mjs";
export type {
  ContentFarmDeskEnqueueWitness,
  ContentFarmDeskObstruction,
  ContentDesk,
  ContentDeskAxes,
  ContentDesksReading,
  EditorialOffice,
  EditorialWorkItem,
  EditorialWorkItemFields,
} from "./desks.mjs";

// ---------- draft manuscript operator packets ----------
export {
  CreateAssignmentDraftInputSchema,
  CreateDraftManuscriptInputSchema,
  CreateDraftManuscriptResultSchema,
  createAssignmentDraftInputCarrier,
  createAssignmentDraftInputTerm,
  createAssignmentDraftJsonSchema,
  createDraftManuscriptInputCarrier,
  createDraftManuscriptInputTerm,
  createDraftManuscriptJsonSchema,
  createDraftManuscriptResultCarrier,
  createDraftManuscriptResultTerm,
  draftManuscriptCreated,
  normalizeCreateAssignmentDraftInput,
  normalizeCreateDraftManuscriptInput,
} from "./manuscripts.mjs";
export type {
  CreateAssignmentDraftInput,
  CreateDraftManuscriptInput,
  CreateDraftManuscriptResult,
  CslReferenceRecord,
} from "./manuscripts.mjs";

// ---------- source-cycle candidate post-processing packets ----------
export {
  SourceCycleCandidateDraftInternalLinkGuidanceSchema,
  SourceCycleCandidateReferenceNormalizationSchema,
  SourceCycleCandidateWriteCollisionSchema,
  SourceCycleDraftInternalLinkSuggestionSchema,
  sourceCycleCandidateDraftInternalLinkGuidance,
  sourceCycleCandidateDraftInternalLinkGuidanceCarrier,
  sourceCycleCandidateDraftInternalLinkGuidanceTerm,
  sourceCycleCandidateReferenceNormalization,
  sourceCycleCandidateReferenceNormalizationCarrier,
  sourceCycleCandidateReferenceNormalizationTerm,
  sourceCycleCandidateWriteCollision,
  sourceCycleCandidateWriteCollisionCarrier,
  sourceCycleCandidateWriteCollisionTerm,
  sourceCycleDraftInternalLinkSuggestion,
  sourceCycleDraftInternalLinkSuggestionCarrier,
} from "./source-cycle-packets.mjs";
export type {
  SourceCycleCandidateDraftInternalLinkGuidance,
  SourceCycleCandidateReferenceNormalization,
  SourceCycleCandidateWriteCollision,
  SourceCycleDraftInternalLinkSuggestion,
} from "./source-cycle-packets.mjs";

// ---------- editorial standards action packets ----------
export {
  ApplyStandardsDefaultsResultSchema,
  EditorialStandardsGateCountSchema,
  EditorialStandardsPolicySchema,
  EditorialStandardsReadingSchema,
  NormalizeManuscriptReferencesResultSchema,
  OperatorManuscriptReadingSchema,
  OperatorManuscriptStandardsSummarySchema,
  OperatorManuscriptSuggestedActionSchema,
  OperatorManuscriptWorkStateSchema,
  PublishManuscriptResultSchema,
  RepairManuscriptHeadingChangeSchema,
  RepairManuscriptHeadingsResultSchema,
  RepairManuscriptSeoHeadingChangeSchema,
  RepairManuscriptSeoHeadingResultSchema,
  StandardsFindingSchema,
  StandardsGateSchema,
  StandardsReviewSchema,
  StandardsSeveritySchema,
  applyStandardsDefaultsResult,
  applyStandardsDefaultsResultCarrier,
  applyStandardsDefaultsResultTerm,
  editorialStandardsGateCount,
  editorialStandardsGateCountCarrier,
  editorialStandardsPolicy,
  editorialStandardsPolicyCarrier,
  editorialStandardsReading,
  editorialStandardsReadingCarrier,
  editorialStandardsReadingTerm,
  normalizeManuscriptReferencesResult,
  normalizeManuscriptReferencesResultCarrier,
  normalizeManuscriptReferencesResultTerm,
  operatorManuscriptReading,
  operatorManuscriptReadingCarrier,
  operatorManuscriptReadingTerm,
  publishManuscriptResult,
  publishManuscriptResultCarrier,
  publishManuscriptResultTerm,
  repairManuscriptHeadingsResult,
  repairManuscriptHeadingsResultCarrier,
  repairManuscriptHeadingsResultTerm,
  repairManuscriptSeoHeadingResult,
  repairManuscriptSeoHeadingResultCarrier,
  repairManuscriptSeoHeadingResultTerm,
  standardsReview,
  standardsReviewCarrier,
  standardsReviewTerm,
} from "./standards-packets.mjs";
export type {
  ApplyStandardsDefaultsResult,
  EditorialStandardsGateCount,
  EditorialStandardsPolicy,
  EditorialStandardsReading,
  NormalizeManuscriptReferencesResult,
  OperatorManuscriptReading,
  OperatorManuscriptStandardsSummary,
  OperatorManuscriptSuggestedAction,
  OperatorManuscriptWorkState,
  PublishManuscriptResult,
  RepairManuscriptHeadingChange,
  RepairManuscriptHeadingsResult,
  RepairManuscriptSeoHeadingChange,
  RepairManuscriptSeoHeadingResult,
  StandardsFinding,
  StandardsGate,
  StandardsReview,
  StandardsSeverity,
} from "./standards-packets.mjs";

// ---------- revision packets ----------
export {
  ContentQualitySeveritySchema,
  ContentRevisionBacklogReadingSchema,
  ContentRevisionPacketSchema,
  ContentRevisionTaskKindSchema,
  ContentRevisionTaskSchema,
  contentRevisionBacklogCarrier,
  contentRevisionBacklogReading,
  contentRevisionBacklogTerm,
  contentRevisionPacket,
  contentRevisionPacketCarrier,
  contentRevisionPacketTerm,
  contentRevisionTask,
  contentRevisionTaskCarrier,
} from "./revision-packets.mjs";
export type {
  ContentQualitySeverity,
  ContentRevisionBacklogReading,
  ContentRevisionPacket,
  ContentRevisionTask,
  ContentRevisionTaskKind,
} from "./revision-packets.mjs";

// ---------- same-site internal link operator packets ----------
export {
  ApplyInternalLinkPlacementInputSchema,
  ApplyInternalLinkPlacementResultSchema,
  DraftInternalLinkGuidanceReadingSchema,
  DraftInternalLinkSuggestionSchema,
  InternalLinkOpportunityArticleSchema,
  InternalLinkOpportunityReadingSchema,
  InternalLinkOpportunitySchema,
  InternalLinkPlacementArticleSchema,
  InternalLinkPlacementReadingSchema,
  InternalLinkPlacementSchema,
  InternalLinkSuggestedPatchSchema,
  appliedInternalLinkPlacement,
  applyInternalLinkPlacementInputCarrier,
  applyInternalLinkPlacementInputTerm,
  applyInternalLinkPlacementJsonSchema,
  applyInternalLinkPlacementResultCarrier,
  draftInternalLinkGuidanceReading,
  draftInternalLinkGuidanceReadingCarrier,
  draftInternalLinkGuidanceReadingTerm,
  draftInternalLinkSuggestion,
  draftInternalLinkSuggestionCarrier,
  internalLinkOpportunity,
  internalLinkOpportunityCarrier,
  internalLinkOpportunityReading,
  internalLinkOpportunityReadingCarrier,
  internalLinkOpportunityReadingTerm,
  internalLinkPlacement,
  internalLinkPlacementCarrier,
  internalLinkPlacementReading,
  internalLinkPlacementReadingCarrier,
  internalLinkPlacementReadingTerm,
  normalizeApplyInternalLinkPlacementInput,
} from "./internal-links.mjs";
export type {
  ApplyInternalLinkPlacementInput,
  ApplyInternalLinkPlacementResult,
  DraftInternalLinkGuidanceReading,
  DraftInternalLinkSuggestion,
  InternalLinkOpportunity,
  InternalLinkOpportunityArticle,
  InternalLinkOpportunityReading,
  InternalLinkPlacement,
  InternalLinkPlacementArticle,
  InternalLinkPlacementReading,
  InternalLinkSuggestedPatch,
} from "./internal-links.mjs";

// ---------- the persistent service form ----------
export {
  ContentFarmService,
  createContentFarmService,
  contentFarmConfigFromDocument,
  farmCycleReading,
  normalizeContentFarmConfig,
} from "./service.mjs";
export type {
  ContentFarmConfig,
  ContentFarmServiceOptions,
  ContentFarmSnapshot,
  FarmCycleReading,
  DemandPullWitness,
  DemandPullObstruction,
  DemandPullJudgment,
  FarmRunObstruction,
  FarmReading,
  FarmCycle,
} from "./service.mjs";
