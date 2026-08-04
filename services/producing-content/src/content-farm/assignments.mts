/**
 * assignments - durable editorial work orders as producing-content carriers.
 *
 * Demand, repair packets, and operator judgment become assignments before they
 * become manuscripts. This module owns the reusable assignment vocabulary and
 * JSON admission; a site may still own persistence, manuscript projection, and
 * operator routing.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { newsSlug } from "../topology/news/index.mjs";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, parseLines } from "@red-cup-engineering/relating/codecs";

import type { DemandEntry } from "./demand.mjs";
import { farmLogPath, farmRecordPath } from "./property.mjs";

export const AssignmentStatusSchema = { anyOf: [{ const: "assigned" }, { const: "drafted" }, { const: "published" }, { const: "completed" }] } as const;

export const AssignmentEvidenceSchema = { additionalProperties: false, type: "object", required: ["views", "impressions", "clicks", "covered"], properties: { views: { type: "number" }, impressions: { type: "number" }, clicks: { type: "number" }, covered: { type: "boolean" } } } as const;

export const AssignmentReadingSchema = { $id: "producing-content/content-farm/assignment", title: "AssignmentReading", additionalProperties: false, type: "object", required: ["kind", "assignmentId", "term", "beat", "status", "createdAt", "priority", "sourceUrls"], properties: { kind: { const: "producing-content.assignment" }, assignmentId: { minLength: 1, type: "string" }, term: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, status: AssignmentStatusSchema, createdAt: { minLength: 1, type: "string" }, completedAt: { type: "string" }, priority: { type: "number" }, summary: { type: "string" }, angle: { type: "string" }, assignee: { type: "string" }, dueAt: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } }, evidence: AssignmentEvidenceSchema, manuscriptSlug: { type: "string" }, manuscriptUrl: { type: "string" } } } as const;

export const CreateAssignmentInputSchema = { $id: "producing-content/content-farm/assignment/create-input", title: "CreateAssignmentInput", additionalProperties: false, type: "object", required: ["term", "beat"], properties: { term: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, summary: { type: "string" }, angle: { type: "string" }, assignee: { type: "string" }, dueAt: { type: "string" }, priority: { type: "number" }, sourceUrls: { type: "array", items: { type: "string" } }, evidence: AssignmentEvidenceSchema } } as const;

export const AssignmentNoteSchema = { $id: "producing-content/content-farm/assignment/note", title: "AssignmentNoteReading", additionalProperties: false, type: "object", required: ["body"], properties: { body: { minLength: 1, type: "string" }, author: { type: "string" } } } as const;

export const CreateAssignmentResultSchema = { $id: "producing-content/content-farm/assignment/created", title: "CreateAssignmentResult", additionalProperties: false, type: "object", required: ["kind", "created", "assignment"], properties: { kind: { const: "producing-content.assignment.created" }, created: { type: "boolean" }, assignment: AssignmentReadingSchema } } as const;

export const CompleteAssignmentResultSchema = { $id: "producing-content/content-farm/assignment/completed", title: "CompleteAssignmentResult", additionalProperties: false, type: "object", required: ["kind", "completed", "assignment"], properties: { kind: { const: "producing-content.assignment.completed" }, completed: { type: "boolean" }, assignment: AssignmentReadingSchema } } as const;

export const CreateAssignmentNoteResultSchema = { $id: "producing-content/content-farm/assignment/noted", title: "CreateAssignmentNoteResult", additionalProperties: false, type: "object", required: ["kind", "recorded", "assignment", "note"], properties: { kind: { const: "producing-content.assignment.noted" }, recorded: { type: "boolean" }, assignment: AssignmentReadingSchema, note: AssignmentNoteSchema } } as const;

export const AssignmentLogAssignmentSchema = { $id: "producing-content/content-farm/assignment/log-assignment", title: "AssignmentLogAssignment", additionalProperties: false, type: "object", required: ["kind", "assignmentId", "term", "beat", "createdAt", "priority", "sourceUrls"], properties: { kind: { const: "producing-content.assignment" }, assignmentId: { minLength: 1, type: "string" }, term: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, createdAt: { minLength: 1, type: "string" }, priority: { type: "number" }, summary: { type: "string" }, angle: { type: "string" }, assignee: { type: "string" }, dueAt: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } }, evidence: AssignmentEvidenceSchema } } as const;

export const AssignmentLogCreatedEventSchema = { title: "AssignmentLogCreatedEvent", additionalProperties: false, type: "object", required: ["kind", "at", "assignment"], properties: { kind: { const: "producing-content.assignment.log.created" }, at: { minLength: 1, type: "string" }, assignment: AssignmentLogAssignmentSchema } } as const;

export const AssignmentLogCompletedEventSchema = { title: "AssignmentLogCompletedEvent", additionalProperties: false, type: "object", required: ["kind", "at", "assignmentId"], properties: { kind: { const: "producing-content.assignment.log.completed" }, at: { minLength: 1, type: "string" }, assignmentId: { minLength: 1, type: "string" } } } as const;

export const AssignmentLogNotedEventSchema = { title: "AssignmentLogNotedEvent", additionalProperties: false, type: "object", required: ["kind", "at", "assignmentId", "note"], properties: { kind: { const: "producing-content.assignment.log.noted" }, at: { minLength: 1, type: "string" }, assignmentId: { minLength: 1, type: "string" }, note: AssignmentNoteSchema } } as const;

export const AssignmentLogEventSchema = { $id: "producing-content/content-farm/assignment/log-event", title: "AssignmentLogEvent", anyOf: [AssignmentLogCreatedEventSchema, AssignmentLogCompletedEventSchema, AssignmentLogNotedEventSchema] } as const;

export const AssignmentLogProjectionReadingSchema = { $id: "producing-content/content-farm/assignment/log-projection", title: "AssignmentLogProjectionReading", additionalProperties: false, type: "object", required: ["kind", "eventCount", "assignmentCount", "assignments"], properties: { kind: { const: "producing-content.assignment.log-projection" }, eventCount: { minimum: 0, type: "integer" }, assignmentCount: { minimum: 0, type: "integer" }, assignments: { type: "array", items: AssignmentReadingSchema } } } as const;

export const AssignmentManuscriptArtifactSchema = { $id: "producing-content/content-farm/assignment/manuscript-artifact", title: "AssignmentManuscriptArtifact", additionalProperties: false, type: "object", required: ["kind", "assignmentId", "status", "manuscriptSlug", "manuscriptUrl"], properties: { kind: { const: "producing-content.assignment.manuscript-artifact" }, assignmentId: { minLength: 1, type: "string" }, status: { anyOf: [{ const: "drafted" }, { const: "published" }] }, manuscriptSlug: { minLength: 1, type: "string" }, manuscriptUrl: { minLength: 1, type: "string" }, at: { minLength: 1, type: "string" } } } as const;

export const AssignmentActivityEventKindSchema = { anyOf: [{ const: "created" }, { const: "completed" }, { const: "noted" }, { const: "drafted" }, { const: "published" }] } as const;

export const AssignmentActivityArtifactSchema = { $id: "producing-content/content-farm/assignment/activity-artifact", title: "AssignmentActivityArtifact", additionalProperties: false, type: "object", required: ["manuscriptSlug", "manuscriptUrl"], properties: { manuscriptSlug: { minLength: 1, type: "string" }, manuscriptUrl: { minLength: 1, type: "string" } } } as const;

export const AssignmentActivityEventSchema = { $id: "producing-content/content-farm/assignment/activity-event", title: "AssignmentActivityEvent", additionalProperties: false, type: "object", required: ["kind", "at", "label", "origin"], properties: { kind: AssignmentActivityEventKindSchema, at: { minLength: 1, type: "string" }, label: { minLength: 1, type: "string" }, origin: { anyOf: [{ const: "log" }, { const: "artifact" }] }, event: {}, artifact: AssignmentActivityArtifactSchema } } as const;

export const AssignmentActivityArtifactsSchema = { $id: "producing-content/content-farm/assignment/activity-artifacts", title: "AssignmentActivityArtifacts", additionalProperties: false, type: "object", properties: { manuscriptSlug: { minLength: 1, type: "string" }, manuscriptUrl: { minLength: 1, type: "string" } } } as const;

export const AssignmentActivityReadingSchema = { $id: "producing-content/content-farm/assignment/activity", title: "AssignmentActivityReading", additionalProperties: false, type: "object", required: ["kind", "assignmentId", "assignment", "events", "artifacts"], properties: { kind: { const: "producing-content.assignment.activity" }, assignmentId: { minLength: 1, type: "string" }, assignment: AssignmentReadingSchema, events: { type: "array", items: AssignmentActivityEventSchema }, artifacts: AssignmentActivityArtifactsSchema } } as const;

export const OperatorWorkQueueLaneSchema = { anyOf: [{ const: "drafting" }, { const: "editing" }, { const: "publishing" }, { const: "source-cycle" }] } as const;

export const OperatorWorkQueueItemKindSchema = { anyOf: [{ const: "assignment" }, { const: "manuscript" }, { const: "content-graph" }, { const: "content-revision" }, { const: "source-cycle-repair" }] } as const;

export const OperatorWorkQueueItemSchema = { $id: "producing-content/content-farm/operator-work-queue/item", title: "OperatorWorkQueueItem", additionalProperties: false, type: "object", required: ["kind", "lane", "priority", "title", "state", "href"], properties: { kind: OperatorWorkQueueItemKindSchema, lane: OperatorWorkQueueLaneSchema, priority: { type: "number" }, title: { minLength: 1, type: "string" }, state: { minLength: 1, type: "string" }, href: { minLength: 1, type: "string" }, jsonHref: { minLength: 1, type: "string" }, actionLabel: { minLength: 1, type: "string" }, actionHref: { minLength: 1, type: "string" }, note: { minLength: 1, type: "string" } } } as const;

const OperatorWorkQueueItemValueSchema = { title: "OperatorWorkQueueItemValue", additionalProperties: false, type: "object", required: OperatorWorkQueueItemSchema.required, properties: OperatorWorkQueueItemSchema.properties } as const;

export const OperatorWorkQueueLanesSchema = { $id: "producing-content/content-farm/operator-work-queue/lanes", title: "OperatorWorkQueueLanes", additionalProperties: false, type: "object", required: ["drafting", "editing", "publishing", "source-cycle"], properties: { drafting: { type: "array", items: OperatorWorkQueueItemValueSchema }, editing: { type: "array", items: OperatorWorkQueueItemValueSchema }, publishing: { type: "array", items: OperatorWorkQueueItemValueSchema }, "source-cycle": { type: "array", items: OperatorWorkQueueItemValueSchema } } } as const;

export const OperatorWorkQueueReadingSchema = { $id: "producing-content/content-farm/operator-work-queue", title: "OperatorWorkQueueReading", additionalProperties: false, type: "object", required: ["kind", "generatedAt", "itemCount", "openAssignmentCount", "lanes", "top", "policy"], properties: { kind: { const: "producing-content.operator-work-queue" }, generatedAt: { minLength: 1, type: "string" }, itemCount: { minimum: 0, type: "integer" }, openAssignmentCount: { minimum: 0, type: "integer" }, lanes: OperatorWorkQueueLanesSchema, top: { type: "array", items: OperatorWorkQueueItemValueSchema }, policy: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const AssignmentWorkOrderActionsSchema = { $id: "producing-content/content-farm/assignment/work-order/actions", title: "AssignmentWorkOrderActions", additionalProperties: false, type: "object", required: ["htmlUrl", "jsonUrl", "activityHtmlUrl", "activityJsonUrl", "noteHtmlUrl", "noteJsonUrl", "researchPacketUrl"], properties: { htmlUrl: { minLength: 1, type: "string" }, jsonUrl: { minLength: 1, type: "string" }, activityHtmlUrl: { minLength: 1, type: "string" }, activityJsonUrl: { minLength: 1, type: "string" }, noteHtmlUrl: { minLength: 1, type: "string" }, noteJsonUrl: { minLength: 1, type: "string" }, researchPacketUrl: { minLength: 1, type: "string" }, draftHtmlUrl: { minLength: 1, type: "string" }, draftJsonUrl: { minLength: 1, type: "string" }, completeHtmlUrl: { minLength: 1, type: "string" }, completeJsonUrl: { minLength: 1, type: "string" }, manuscriptUrl: { minLength: 1, type: "string" } } } as const;

export const AssignmentWorkOrderSchema = { $id: "producing-content/content-farm/assignment/work-order", title: "AssignmentWorkOrder", additionalProperties: false, type: "object", required: ["kind", "assignment", "actions", "operatorNotes"], properties: { kind: { const: "producing-content.assignment.work-order" }, assignment: AssignmentReadingSchema, actions: AssignmentWorkOrderActionsSchema, operatorNotes: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type AssignmentStatus = FromSchema<typeof AssignmentStatusSchema>;
export type AssignmentEvidence = FromSchema<typeof AssignmentEvidenceSchema>;
export type AssignmentReading = FromSchema<typeof AssignmentReadingSchema>;
export type CreateAssignmentInput = FromSchema<typeof CreateAssignmentInputSchema>;
export type AssignmentNoteReading = FromSchema<typeof AssignmentNoteSchema>;
export type CreateAssignmentNoteInput = AssignmentNoteReading;
export type CreateAssignmentResult = FromSchema<typeof CreateAssignmentResultSchema>;
export type CompleteAssignmentResult = FromSchema<typeof CompleteAssignmentResultSchema>;
export type CreateAssignmentNoteResult = FromSchema<typeof CreateAssignmentNoteResultSchema>;
export type AssignmentLogAssignment = FromSchema<typeof AssignmentLogAssignmentSchema>;
export type AssignmentLogCreatedEvent = FromSchema<typeof AssignmentLogCreatedEventSchema>;
export type AssignmentLogCompletedEvent = FromSchema<typeof AssignmentLogCompletedEventSchema>;
export type AssignmentLogNotedEvent = FromSchema<typeof AssignmentLogNotedEventSchema>;
export type AssignmentLogEvent = AssignmentLogCreatedEvent | AssignmentLogCompletedEvent | AssignmentLogNotedEvent;
export type AssignmentLogProjectionReading = FromSchema<typeof AssignmentLogProjectionReadingSchema>;
export type AssignmentManuscriptArtifact = FromSchema<typeof AssignmentManuscriptArtifactSchema>;
export type AssignmentActivityEventKind = FromSchema<typeof AssignmentActivityEventKindSchema>;
export type AssignmentActivityArtifact = FromSchema<typeof AssignmentActivityArtifactSchema>;
export type AssignmentActivityEvent = FromSchema<typeof AssignmentActivityEventSchema>;
export type AssignmentActivityArtifacts = FromSchema<typeof AssignmentActivityArtifactsSchema>;
export type AssignmentActivityReading = FromSchema<typeof AssignmentActivityReadingSchema>;
export type OperatorWorkQueueLane = FromSchema<typeof OperatorWorkQueueLaneSchema>;
export type OperatorWorkQueueItemKind = FromSchema<typeof OperatorWorkQueueItemKindSchema>;
export type OperatorWorkQueueItem = FromSchema<typeof OperatorWorkQueueItemSchema>;
export type OperatorWorkQueueLanes = FromSchema<typeof OperatorWorkQueueLanesSchema>;
export type OperatorWorkQueueReading = FromSchema<typeof OperatorWorkQueueReadingSchema>;
export type AssignmentWorkOrderActions = FromSchema<typeof AssignmentWorkOrderActionsSchema>;
export type AssignmentWorkOrder = FromSchema<typeof AssignmentWorkOrderSchema>;

export const assignmentCarrier = carrierFrom(AssignmentReadingSchema);

export const createAssignmentInputCarrier = carrierFrom(CreateAssignmentInputSchema);

export const assignmentNoteCarrier = carrierFrom(AssignmentNoteSchema);

export const createAssignmentResultCarrier = carrierFrom(CreateAssignmentResultSchema);

export const completeAssignmentResultCarrier = carrierFrom(CompleteAssignmentResultSchema);

export const createAssignmentNoteResultCarrier = carrierFrom(CreateAssignmentNoteResultSchema);

export const assignmentLogAssignmentCarrier = carrierFrom(AssignmentLogAssignmentSchema);

export const assignmentLogEventCarrier = carrierFrom(AssignmentLogEventSchema);

export const assignmentLogProjectionReadingCarrier = carrierFrom(AssignmentLogProjectionReadingSchema);

export const assignmentManuscriptArtifactCarrier = carrierFrom(AssignmentManuscriptArtifactSchema);

export const assignmentActivityEventCarrier = carrierFrom(AssignmentActivityEventSchema);

export const assignmentActivityReadingCarrier = carrierFrom(AssignmentActivityReadingSchema);

export const operatorWorkQueueItemCarrier = carrierFrom(OperatorWorkQueueItemSchema);

export const operatorWorkQueueReadingCarrier = carrierFrom(OperatorWorkQueueReadingSchema);

export const assignmentWorkOrderCarrier = carrierFrom(AssignmentWorkOrderSchema);

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireText(value, field);
}

function optionalUrls(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new TypeError("sourceUrls must be an array");
  const urls = value.map((item, index) => requireText(item, `sourceUrls[${index}]`));
  for (const [index, url] of urls.entries()) {
    if (!URL_PATTERN.test(url)) throw new TypeError(`sourceUrls[${index}] must be an http(s) URL`);
  }
  return urls;
}

function optionalPriority(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const priority = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(priority) || priority < 0) throw new TypeError("priority must be a non-negative number");
  return priority;
}

function optionalEvidence(value: unknown): AssignmentEvidence | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new TypeError("evidence must be an object");
  const views = Number(value["views"] ?? 0);
  const impressions = Number(value["impressions"] ?? 0);
  const clicks = Number(value["clicks"] ?? 0);
  const covered = value["covered"] === true;
  if (![views, impressions, clicks].every((number) => Number.isFinite(number) && number >= 0)) {
    throw new TypeError("evidence counts must be non-negative numbers");
  }
  return { views, impressions, clicks, covered };
}

export function normalizeCreateAssignmentInput(input: unknown): CreateAssignmentInput {
  if (!isRecord(input)) throw new TypeError("assignment input must be a JSON object");
  const term = requireText(input["term"], "term");
  const beat = requireText(input["beat"], "beat");
  const summary = optionalText(input["summary"], "summary");
  const angle = optionalText(input["angle"], "angle");
  const assignee = optionalText(input["assignee"], "assignee");
  const dueAt = optionalText(input["dueAt"], "dueAt");
  const priority = optionalPriority(input["priority"]);
  const sourceUrls = optionalUrls(input["sourceUrls"]);
  const evidence = optionalEvidence(input["evidence"]);
  return createAssignmentInputCarrier.assert({
    term,
    beat,
    ...(summary === undefined ? {} : { summary }),
    ...(angle === undefined ? {} : { angle }),
    ...(assignee === undefined ? {} : { assignee }),
    ...(dueAt === undefined ? {} : { dueAt }),
    ...(priority === undefined ? {} : { priority }),
    ...(sourceUrls === undefined ? {} : { sourceUrls }),
    ...(evidence === undefined ? {} : { evidence }),
  }, "create assignment input");
}

export function normalizeCreateAssignmentNoteInput(input: unknown): CreateAssignmentNoteInput {
  if (!isRecord(input)) throw new TypeError("assignment note input must be a JSON object");
  const body = requireText(input["body"], "body");
  const author = optionalText(input["author"], "author");
  return assignmentNoteCarrier.assert({
    body,
    ...(author === undefined ? {} : { author }),
  }, "assignment note");
}

export function createAssignmentInputFromDemand(entry: DemandEntry): CreateAssignmentInput {
  return createAssignmentInputCarrier.assert({
    term: entry.term,
    beat: entry.beat,
    priority: entry.score,
    summary: `Report the ${entry.term} story for the ${entry.beat} beat.`,
    evidence: {
      views: entry.evidence.views,
      impressions: entry.evidence.impressions,
      clicks: entry.evidence.clicks,
      covered: entry.evidence.covered > 0,
    },
  }, "assignment from demand");
}

export function createAssignmentResult(input: Omit<CreateAssignmentResult, "kind">): CreateAssignmentResult {
  return createAssignmentResultCarrier.assert({
    kind: "producing-content.assignment.created" as const,
    created: input.created,
    assignment: assignmentCarrier.assert(input.assignment),
  }, "create assignment result");
}

export function completeAssignmentResult(input: Omit<CompleteAssignmentResult, "kind">): CompleteAssignmentResult {
  return completeAssignmentResultCarrier.assert({
    kind: "producing-content.assignment.completed" as const,
    completed: input.completed,
    assignment: assignmentCarrier.assert(input.assignment),
  }, "complete assignment result");
}

export function createAssignmentNoteResult(input: Omit<CreateAssignmentNoteResult, "kind">): CreateAssignmentNoteResult {
  return createAssignmentNoteResultCarrier.assert({
    kind: "producing-content.assignment.noted" as const,
    recorded: input.recorded,
    assignment: assignmentCarrier.assert(input.assignment),
    note: assignmentNoteCarrier.assert(input.note),
  }, "create assignment note result");
}

export function assignmentLogAssignment(input: AssignmentLogAssignment): AssignmentLogAssignment {
  return assignmentLogAssignmentCarrier.assert({
    ...input,
    sourceUrls: [...input.sourceUrls],
  }, "assignment log assignment");
}

export function assignmentLogCreatedEvent(input: Readonly<{ at: string; assignment: AssignmentLogAssignment }>): AssignmentLogCreatedEvent {
  return assignmentLogEventCarrier.assert({
    kind: "producing-content.assignment.log.created" as const,
    at: input.at,
    assignment: assignmentLogAssignment(input.assignment),
  }, "assignment log created event") as AssignmentLogCreatedEvent;
}

export function assignmentLogCompletedEvent(input: Readonly<{ at: string; assignmentId: string }>): AssignmentLogCompletedEvent {
  return assignmentLogEventCarrier.assert({
    kind: "producing-content.assignment.log.completed" as const,
    at: input.at,
    assignmentId: input.assignmentId,
  }, "assignment log completed event") as AssignmentLogCompletedEvent;
}

export function assignmentLogNotedEvent(input: Readonly<{ at: string; assignmentId: string; note: AssignmentNoteReading }>): AssignmentLogNotedEvent {
  return assignmentLogEventCarrier.assert({
    kind: "producing-content.assignment.log.noted" as const,
    at: input.at,
    assignmentId: input.assignmentId,
    note: assignmentNoteCarrier.assert(input.note),
  }, "assignment log noted event") as AssignmentLogNotedEvent;
}

export function assignmentLogEvent(input: AssignmentLogEvent): AssignmentLogEvent {
  if (input.kind === "producing-content.assignment.log.created") return assignmentLogCreatedEvent(input);
  if (input.kind === "producing-content.assignment.log.completed") return assignmentLogCompletedEvent(input);
  return assignmentLogNotedEvent(input);
}

export const ASSIGNMENT_LOG_FILE = "assignments.jsonl";
export const ASSIGNMENT_RECORD_FILE = "assignments.json";

export function assignmentLogPath(dataDir: string): string {
  return farmLogPath(dataDir, ASSIGNMENT_LOG_FILE);
}

export function assignmentRecordPath(dataDir: string): string {
  return farmRecordPath(dataDir, ASSIGNMENT_RECORD_FILE);
}

export function ensureAssignmentStore(dataDir: string): void {
  mkdirSync(dirname(assignmentLogPath(dataDir)), { recursive: true });
  mkdirSync(dirname(assignmentRecordPath(dataDir)), { recursive: true });
}

function parseAssignmentLogEvent(input: unknown): AssignmentLogEvent | undefined {
  if (!isRecord(input) || typeof input["kind"] !== "string") return undefined;
  if (input["kind"] === "producing-content.assignment.log.created"
    && typeof input["at"] === "string"
    && isRecord(input["assignment"])) {
    return assignmentLogCreatedEvent({
      at: input["at"],
      assignment: input["assignment"] as unknown as AssignmentLogAssignment,
    });
  }
  if (input["kind"] === "producing-content.assignment.log.completed"
    && typeof input["assignmentId"] === "string"
    && typeof input["at"] === "string") {
    return assignmentLogCompletedEvent({ at: input["at"], assignmentId: input["assignmentId"] });
  }
  if (input["kind"] === "producing-content.assignment.log.noted"
    && typeof input["assignmentId"] === "string"
    && typeof input["at"] === "string"
    && isRecord(input["note"])) {
    return assignmentLogNotedEvent({
      at: input["at"],
      assignmentId: input["assignmentId"],
      note: input["note"] as unknown as AssignmentNoteReading,
    });
  }
  return undefined;
}

export function replayAssignmentLog(path: string): readonly AssignmentLogEvent[] {
  if (!existsSync(path)) return Object.freeze([]);
  const events: AssignmentLogEvent[] = [];
  for (const parsed of parseLines(readFileSync(path, "utf8"))) {
    const event = parseAssignmentLogEvent(parsed);
    if (event !== undefined) events.push(event);
  }
  return Object.freeze(events);
}

export function readAssignmentLog(dataDir: string): readonly AssignmentLogEvent[] {
  return replayAssignmentLog(assignmentLogPath(dataDir));
}

export function assignmentManuscriptArtifact(input: Omit<AssignmentManuscriptArtifact, "kind">): AssignmentManuscriptArtifact {
  return assignmentManuscriptArtifactCarrier.assert({
    kind: "producing-content.assignment.manuscript-artifact" as const,
    ...input,
  }, "assignment manuscript artifact");
}

function assignmentArtifactsById(artifacts: readonly AssignmentManuscriptArtifact[]): ReadonlyMap<string, AssignmentManuscriptArtifact> {
  return new Map(artifacts.map((artifact) => [artifact.assignmentId, assignmentManuscriptArtifact(artifact)]));
}

function assignmentCreatedEvents(events: readonly AssignmentLogEvent[]): readonly AssignmentLogCreatedEvent[] {
  return Object.freeze(events.filter((event): event is AssignmentLogCreatedEvent =>
    event.kind === "producing-content.assignment.log.created"));
}

function assignmentCompletedAt(events: readonly AssignmentLogEvent[]): ReadonlyMap<string, string> {
  return new Map(events
    .filter((event): event is AssignmentLogCompletedEvent => event.kind === "producing-content.assignment.log.completed")
    .map((event) => [event.assignmentId, event.at]));
}

export function projectAssignmentLog(input: Readonly<{
  events: readonly AssignmentLogEvent[];
  artifacts?: readonly AssignmentManuscriptArtifact[];
}>): readonly AssignmentReading[] {
  const completedAt = assignmentCompletedAt(input.events);
  const artifacts = assignmentArtifactsById(input.artifacts ?? []);
  return Object.freeze(assignmentCreatedEvents(input.events).map((event) => {
    const artifact = artifacts.get(event.assignment.assignmentId);
    const completion = completedAt.get(event.assignment.assignmentId);
    const status: AssignmentStatus = artifact?.status === "published"
      ? "published"
      : completion === undefined
        ? artifact?.status ?? "assigned"
        : "completed";
    return assignmentCarrier.assert({
      ...event.assignment,
      status,
      ...(completion === undefined ? {} : { completedAt: completion }),
      ...(artifact === undefined ? {} : {
        manuscriptSlug: artifact.manuscriptSlug,
        manuscriptUrl: artifact.manuscriptUrl,
      }),
    }, "projected assignment");
  }));
}

export function writeAssignmentProjection(dataDir: string, assignments: readonly AssignmentReading[]): void {
  ensureAssignmentStore(dataDir);
  writeFileSync(assignmentRecordPath(dataDir), `${JSON.stringify(assignments.map((assignment) => assignmentCarrier.assert(assignment)), null, 2)}\n`, "utf8");
}

export function readAssignments(dataDir: string, artifacts: readonly AssignmentManuscriptArtifact[] = []): readonly AssignmentReading[] {
  return projectAssignmentLog({ events: readAssignmentLog(dataDir), artifacts });
}

export function readAssignmentLogProjection(
  dataDir: string,
  artifacts: readonly AssignmentManuscriptArtifact[] = [],
): AssignmentLogProjectionReading {
  const events = readAssignmentLog(dataDir);
  return assignmentLogProjectionReading({
    events,
    assignments: projectAssignmentLog({ events, artifacts }),
  });
}

export function readAssignment(
  dataDir: string,
  assignmentId: string,
  artifacts: readonly AssignmentManuscriptArtifact[] = [],
): AssignmentReading {
  const assignment = readAssignments(dataDir, artifacts).find((item) => item.assignmentId === assignmentId);
  if (assignment === undefined) throw new Error(`no such assignment: ${assignmentId}`);
  return assignment;
}

export function assignmentLogProjectionReading(input: Readonly<{
  events: readonly AssignmentLogEvent[];
  assignments: readonly AssignmentReading[];
}>): AssignmentLogProjectionReading {
  return assignmentLogProjectionReadingCarrier.assert({
    kind: "producing-content.assignment.log-projection" as const,
    eventCount: input.events.length,
    assignmentCount: input.assignments.length,
    assignments: input.assignments.map((assignment) => assignmentCarrier.assert(assignment)),
  }, "assignment log projection reading");
}

export function assignmentActivityEvent(input: AssignmentActivityEvent): AssignmentActivityEvent {
  return assignmentActivityEventCarrier.assert(input, "assignment activity event");
}

export function assignmentActivityReading(input: Omit<AssignmentActivityReading, "kind" | "events"> & Readonly<{
  events: readonly AssignmentActivityEvent[];
}>): AssignmentActivityReading {
  return assignmentActivityReadingCarrier.assert({
    kind: "producing-content.assignment.activity" as const,
    assignmentId: input.assignmentId,
    assignment: assignmentCarrier.assert(input.assignment),
    events: input.events.map((event) => assignmentActivityEvent(event)),
    artifacts: { ...input.artifacts },
  }, "assignment activity reading");
}

function assignmentActivityOrder(kind: AssignmentActivityEvent["kind"]): number {
  if (kind === "created") return 0;
  if (kind === "drafted") return 1;
  if (kind === "published") return 2;
  if (kind === "noted") return 3;
  return 4;
}

export function assignmentActivityFromLog(input: Readonly<{
  assignmentId: string;
  events: readonly AssignmentLogEvent[];
  artifacts?: readonly AssignmentManuscriptArtifact[];
}>): AssignmentActivityReading {
  const assignments = projectAssignmentLog(input);
  const assignment = assignments.find((item) => item.assignmentId === input.assignmentId);
  if (assignment === undefined) throw new Error(`no such assignment: ${input.assignmentId}`);
  const logEvents = input.events
    .filter((event) => event.kind === "producing-content.assignment.log.created"
      ? event.assignment.assignmentId === input.assignmentId
      : event.assignmentId === input.assignmentId)
    .map((event): AssignmentActivityEvent => {
      if (event.kind === "producing-content.assignment.log.created") return assignmentActivityEvent({
        kind: "created" as const,
        at: event.at,
        label: `Assignment created for ${event.assignment.beat}: ${event.assignment.term}`,
        origin: "log" as const,
        event,
      });
      if (event.kind === "producing-content.assignment.log.completed") return assignmentActivityEvent({
        kind: "completed" as const,
        at: event.at,
        label: "Assignment marked complete by an operator.",
        origin: "log" as const,
        event,
      });
      const author = event.note.author ?? "operator";
      return assignmentActivityEvent({
        kind: "noted" as const,
        at: event.at,
        label: `Note from ${author}: ${event.note.body}`,
        origin: "log" as const,
        event,
      });
    });
  const artifact = (input.artifacts ?? []).find((candidate) => candidate.assignmentId === input.assignmentId);
  const artifactEvents = artifact === undefined
    ? []
    : [assignmentActivityEvent({
      kind: artifact.status,
      at: artifact.at ?? assignment.createdAt,
      label: artifact.status === "published"
        ? `Linked manuscript published: ${artifact.manuscriptSlug}`
        : `Linked draft manuscript: ${artifact.manuscriptSlug}`,
      origin: "artifact" as const,
      artifact: {
        manuscriptSlug: artifact.manuscriptSlug,
        manuscriptUrl: artifact.manuscriptUrl,
      },
    })];
  const events = Object.freeze([...logEvents, ...artifactEvents].sort((left, right) =>
    left.at.localeCompare(right.at) || assignmentActivityOrder(left.kind) - assignmentActivityOrder(right.kind)));
  return assignmentActivityReading({
    assignmentId: input.assignmentId,
    assignment,
    events,
    artifacts: {
      ...(assignment.manuscriptSlug === undefined ? {} : { manuscriptSlug: assignment.manuscriptSlug }),
      ...(assignment.manuscriptUrl === undefined ? {} : { manuscriptUrl: assignment.manuscriptUrl }),
    },
  });
}

export function readAssignmentActivity(
  dataDir: string,
  assignmentId: string,
  artifacts: readonly AssignmentManuscriptArtifact[] = [],
): AssignmentActivityReading {
  return assignmentActivityFromLog({ assignmentId, events: readAssignmentLog(dataDir), artifacts });
}

function appendAssignmentLogEvent(dataDir: string, event: AssignmentLogEvent): void {
  ensureAssignmentStore(dataDir);
  writeFileSync(assignmentLogPath(dataDir), `${JSON.stringify(assignmentLogEvent(event))}\n`, { encoding: "utf8", flag: "a" });
}

function isOpenAssignment(assignment: AssignmentReading): boolean {
  return assignment.status === "assigned" || assignment.status === "drafted";
}

export function createAssignment(dataDir: string, input: CreateAssignmentInput, artifacts: readonly AssignmentManuscriptArtifact[] = []): CreateAssignmentResult {
  const existingAssignments = readAssignments(dataDir, artifacts);
  const existing = existingAssignments.find((assignment) =>
    isOpenAssignment(assignment) && assignment.term.toLowerCase() === input.term.toLowerCase() && assignment.beat.toLowerCase() === input.beat.toLowerCase());
  if (existing !== undefined) return createAssignmentResult({ created: false, assignment: existing });

  const baseId = assignmentBaseId(input);
  const existingIds = new Set(existingAssignments.map((assignment) => assignment.assignmentId));
  let assignmentId = baseId;
  let suffix = 2;
  while (existingIds.has(assignmentId)) {
    assignmentId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const now = new Date().toISOString();
  const assignment: AssignmentLogAssignment = assignmentLogAssignment({
    kind: "producing-content.assignment" as const,
    assignmentId,
    term: input.term,
    beat: input.beat,
    createdAt: now,
    priority: input.priority ?? 0,
    ...(input.summary === undefined ? {} : { summary: input.summary }),
    ...(input.angle === undefined ? {} : { angle: input.angle }),
    ...(input.assignee === undefined ? {} : { assignee: input.assignee }),
    ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
    sourceUrls: [...(input.sourceUrls ?? [])],
    ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
  });
  appendAssignmentLogEvent(dataDir, assignmentLogCreatedEvent({ at: now, assignment }));
  const assignments = readAssignments(dataDir, artifacts);
  writeAssignmentProjection(dataDir, assignments);
  const created = assignments.find((item) => item.assignmentId === assignment.assignmentId)
    ?? assignmentCarrier.assert({ ...assignment, status: "assigned" as const }, "created assignment");
  return createAssignmentResult({ created: true, assignment: created });
}

export function recordAssignmentNote(
  dataDir: string,
  assignmentId: string,
  input: CreateAssignmentNoteInput,
  artifacts: readonly AssignmentManuscriptArtifact[] = [],
): CreateAssignmentNoteResult {
  const assignment = readAssignment(dataDir, assignmentId, artifacts);
  const note = assignmentNoteCarrier.assert({
    body: input.body,
    ...(input.author === undefined ? {} : { author: input.author }),
  }, "assignment note");
  appendAssignmentLogEvent(dataDir, assignmentLogNotedEvent({
    at: new Date().toISOString(),
    assignmentId,
    note,
  }));
  return createAssignmentNoteResult({ recorded: true, assignment, note });
}

export function completeAssignment(
  dataDir: string,
  assignmentId: string,
  artifacts: readonly AssignmentManuscriptArtifact[] = [],
): CompleteAssignmentResult {
  const before = readAssignment(dataDir, assignmentId, artifacts);
  if (before.status === "completed" || before.status === "published") {
    return completeAssignmentResult({ completed: false, assignment: before });
  }
  appendAssignmentLogEvent(dataDir, assignmentLogCompletedEvent({
    at: new Date().toISOString(),
    assignmentId,
  }));
  const assignments = readAssignments(dataDir, artifacts);
  writeAssignmentProjection(dataDir, assignments);
  const completed = assignments.find((item) => item.assignmentId === assignmentId);
  if (completed === undefined) throw new Error(`no such assignment: ${assignmentId}`);
  return completeAssignmentResult({ completed: true, assignment: completed });
}

export function operatorWorkQueueItem(input: OperatorWorkQueueItem): OperatorWorkQueueItem {
  return operatorWorkQueueItemCarrier.assert(input, "operator work queue item");
}

export function operatorWorkQueueReading(input: Omit<OperatorWorkQueueReading, "kind" | "itemCount" | "lanes" | "top" | "policy"> & Readonly<{
  lanes: Readonly<Record<OperatorWorkQueueLane, readonly OperatorWorkQueueItem[]>>;
  top: readonly OperatorWorkQueueItem[];
  policy: readonly string[];
}>): OperatorWorkQueueReading {
  const lanes = {
    drafting: input.lanes.drafting.map((item) => operatorWorkQueueItem(item)),
    editing: input.lanes.editing.map((item) => operatorWorkQueueItem(item)),
    publishing: input.lanes.publishing.map((item) => operatorWorkQueueItem(item)),
    "source-cycle": input.lanes["source-cycle"].map((item) => operatorWorkQueueItem(item)),
  };
  const itemCount = Object.values(lanes).reduce((total, lane) => total + lane.length, 0);
  return operatorWorkQueueReadingCarrier.assert({
    kind: "producing-content.operator-work-queue" as const,
    generatedAt: input.generatedAt,
    itemCount,
    openAssignmentCount: input.openAssignmentCount,
    lanes,
    top: input.top.map((item) => operatorWorkQueueItem(item)),
    policy: [...input.policy],
  }, "operator work queue reading");
}

export function assignmentWorkOrder(input: Omit<AssignmentWorkOrder, "kind" | "operatorNotes"> & Readonly<{
  operatorNotes: readonly string[];
}>): AssignmentWorkOrder {
  return assignmentWorkOrderCarrier.assert({
    kind: "producing-content.assignment.work-order" as const,
    assignment: assignmentCarrier.assert(input.assignment),
    actions: { ...input.actions },
    operatorNotes: [...input.operatorNotes],
  }, "assignment work order");
}

export function assignmentBaseId(input: Pick<CreateAssignmentInput, "term" | "beat">): string {
  const slug = newsSlug(`${input.beat}-${input.term}`).split("-").slice(0, 10).join("-");
  const hash = createHash("sha256").update(`${input.beat}\n${input.term}`).digest("hex").slice(0, 8);
  return `${slug}-${hash}`;
}

export const createAssignmentJsonSchema = CreateAssignmentInputSchema;
export const createAssignmentNoteJsonSchema = AssignmentNoteSchema;

export function assignmentTerm(input: AssignmentReading): Tm {
  return carrierToTerm(jsonResource(assignmentCarrier.assert(input), "assignment"));
}

export function createAssignmentInputTerm(input: CreateAssignmentInput): Tm {
  return carrierToTerm(jsonResource(createAssignmentInputCarrier.assert(input), "create assignment input"));
}

export function createAssignmentResultTerm(input: CreateAssignmentResult): Tm {
  return carrierToTerm(jsonResource(createAssignmentResultCarrier.assert(input), "create assignment result"));
}

export function completeAssignmentResultTerm(input: CompleteAssignmentResult): Tm {
  return carrierToTerm(jsonResource(completeAssignmentResultCarrier.assert(input), "complete assignment result"));
}

export function createAssignmentNoteResultTerm(input: CreateAssignmentNoteResult): Tm {
  return carrierToTerm(jsonResource(createAssignmentNoteResultCarrier.assert(input), "create assignment note result"));
}

export function assignmentLogEventTerm(input: AssignmentLogEvent): Tm {
  return carrierToTerm(jsonResource(assignmentLogEvent(input), "assignment log event"));
}

export function assignmentLogProjectionReadingTerm(input: AssignmentLogProjectionReading): Tm {
  return carrierToTerm(jsonResource(assignmentLogProjectionReadingCarrier.assert(input), "assignment log projection reading"));
}

export function assignmentManuscriptArtifactTerm(input: AssignmentManuscriptArtifact): Tm {
  return carrierToTerm(jsonResource(assignmentManuscriptArtifactCarrier.assert(input), "assignment manuscript artifact"));
}

export function assignmentActivityReadingTerm(input: AssignmentActivityReading): Tm {
  return carrierToTerm(jsonResource(assignmentActivityReadingCarrier.assert(input), "assignment activity reading"));
}

export function operatorWorkQueueReadingTerm(input: OperatorWorkQueueReading): Tm {
  return carrierToTerm(jsonResource(operatorWorkQueueReadingCarrier.assert(input), "operator work queue reading"));
}

export function assignmentWorkOrderTerm(input: AssignmentWorkOrder): Tm {
  return carrierToTerm(jsonResource(assignmentWorkOrderCarrier.assert(input), "assignment work order"));
}
