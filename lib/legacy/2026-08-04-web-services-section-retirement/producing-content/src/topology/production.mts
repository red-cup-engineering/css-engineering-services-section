/**
 * production - producing-content carriers for assignments and drafts.
 *
 * An Assignment is a demand-created instruction to produce: it carries the
 * demand charge that called it into being, so "why was this made?" remains
 * answerable from the carrier itself. A Draft is an append-only trace of
 * surfaces; current text is a reading over the trace, never mutable state.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, type JsonValue } from "@red-cup-engineering/relating/codecs";
import {
  DemandChargeSchema,
  demandRanking,
  encodeDemandCharge,
  type DemandChargeCarrier,
} from "./demand.mjs";

const EvidenceSchema = { type: "array", items: {} } as const;

export const ChannelCoordinateSchema = { $id: "producing-content/topology/coordinate/channel", title: "ChannelCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.channel" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const AudienceCoordinateSchema = { $id: "producing-content/topology/coordinate/audience", title: "AudienceCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.audience" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const MessageCoordinateSchema = { $id: "producing-content/topology/coordinate/message", title: "MessageCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.message" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const AssignmentSchema = { $id: "producing-content/topology/production/assignment", title: "Assignment", additionalProperties: false, type: "object", required: ["kind", "id", "brief", "subjects", "demand"], properties: { kind: { const: "producing-content.assignment" }, id: { minLength: 1, type: "string" }, brief: { type: "string" }, subjects: { type: "array", items: { minLength: 1, type: "string" } }, channel: ChannelCoordinateSchema, audience: AudienceCoordinateSchema, demand: DemandChargeSchema } } as const;

export const DraftSurfaceSchema = { $id: "producing-content/topology/production/draft-surface", title: "DraftSurface", additionalProperties: false, type: "object", required: ["kind", "name", "text", "stage"], properties: { kind: { const: "producing-content.draft.surface" }, name: { minLength: 1, type: "string" }, text: { type: "string" }, stage: { pattern: "^[0-9]+$", type: "string" } } } as const;

export const DraftSchema = { $id: "producing-content/topology/production/draft", title: "Draft", additionalProperties: false, type: "object", required: ["kind", "id", "assignment", "surfaces"], properties: { kind: { const: "producing-content.draft" }, id: { minLength: 1, type: "string" }, assignment: { minLength: 1, type: "string" }, surfaces: { type: "array", items: DraftSurfaceSchema } } } as const;

export type ChannelCoordinateCarrier = FromSchema<typeof ChannelCoordinateSchema>;
export type AudienceCoordinateCarrier = FromSchema<typeof AudienceCoordinateSchema>;
export type MessageCoordinateCarrier = FromSchema<typeof MessageCoordinateSchema>;
export type AssignmentJsonCarrier = FromSchema<typeof AssignmentSchema>;
export type DraftSurfaceJsonCarrier = FromSchema<typeof DraftSurfaceSchema>;
export type DraftJsonCarrier = FromSchema<typeof DraftSchema>;

export const channelCoordinateCarrier = carrierFrom(ChannelCoordinateSchema);

export const audienceCoordinateCarrier = carrierFrom(AudienceCoordinateSchema);

export const messageCoordinateCarrier = carrierFrom(MessageCoordinateSchema);

export const assignmentCarrier = carrierFrom(AssignmentSchema);

export const draftSurfaceCarrier = carrierFrom(DraftSurfaceSchema);

export const draftCarrier = carrierFrom(DraftSchema);

// ---------- coordinates ----------

export interface ChannelCoordinate {
  readonly kind: "producing-content.coordinate.channel";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

export interface AudienceCoordinate {
  readonly kind: "producing-content.coordinate.audience";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

export interface MessageCoordinate {
  readonly kind: "producing-content.coordinate.message";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

const frozenEvidence = (evidence: readonly unknown[]): readonly unknown[] =>
  Object.freeze([...evidence]);

export function channel(id: string, evidence: readonly unknown[] = []): ChannelCoordinate {
  return Object.freeze({
    kind: "producing-content.coordinate.channel" as const,
    term: `producing-content.channel.${id}`,
    evidence: frozenEvidence(evidence),
  });
}

export function audience(id: string, evidence: readonly unknown[] = []): AudienceCoordinate {
  return Object.freeze({
    kind: "producing-content.coordinate.audience" as const,
    term: `producing-content.audience.${id}`,
    evidence: frozenEvidence(evidence),
  });
}

export function message(id: string, evidence: readonly unknown[] = []): MessageCoordinate {
  return Object.freeze({
    kind: "producing-content.coordinate.message" as const,
    term: `producing-content.message.${id}`,
    evidence: frozenEvidence(evidence),
  });
}

// ---------- assignment ----------

export interface AssignmentCarrier {
  readonly kind: "producing-content.assignment";
  readonly id: string;
  /** The instruction to the producer, in prose. */
  readonly brief: string;
  /** The terms (topics, keywords) the produced content is to cover. */
  readonly subjects: readonly string[];
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  /** The demand charge that created this assignment - its warrant. */
  readonly demand: DemandChargeCarrier;
}

export interface AssignmentInput {
  readonly id: string;
  readonly brief: string;
  readonly subjects: readonly string[];
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  readonly demand: DemandChargeCarrier;
}

export function assignment(input: AssignmentInput): AssignmentCarrier {
  if (typeof input.id !== "string" || input.id.length === 0) throw new TypeError("assignment: id must be a non-empty string");
  return Object.freeze({
    kind: "producing-content.assignment" as const,
    id: input.id,
    brief: input.brief,
    subjects: Object.freeze([...input.subjects]),
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    demand: input.demand,
  });
}

export interface AssignmentFromDemandInput {
  readonly id: string;
  readonly brief: string;
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
}

export function assignmentFromDemand(demand: DemandChargeCarrier, input: AssignmentFromDemandInput): AssignmentCarrier {
  const subjects = demandRanking(demand)
    .filter((rank) => rank.value > 0n)
    .map((rank) => rank.term);
  return assignment({ ...input, subjects, demand });
}

// ---------- draft ----------

export interface DraftSurface {
  readonly kind: "producing-content.draft.surface";
  readonly name: string;
  readonly text: string;
  /** Stage ordinal: position in the draft's revision trace, never wall-clock. */
  readonly stage: bigint;
}

export interface DraftCarrier {
  readonly kind: "producing-content.draft";
  readonly id: string;
  /** The assignment this draft answers. */
  readonly assignment: string;
  /** Append-only revision trace. The current text is a reading over this. */
  readonly surfaces: readonly DraftSurface[];
}

export interface DraftInput {
  readonly id: string;
  readonly assignment: string;
}

export function draft(input: DraftInput): DraftCarrier {
  if (typeof input.id !== "string" || input.id.length === 0) throw new TypeError("draft: id must be a non-empty string");
  return Object.freeze({
    kind: "producing-content.draft" as const,
    id: input.id,
    assignment: input.assignment,
    surfaces: Object.freeze([] as DraftSurface[]),
  });
}

export function reviseDraft(draftCarrier: DraftCarrier, name: string, text: string): DraftCarrier {
  const surface: DraftSurface = Object.freeze({
    kind: "producing-content.draft.surface" as const,
    name,
    text,
    stage: BigInt(draftCarrier.surfaces.length),
  });
  return Object.freeze({
    ...draftCarrier,
    surfaces: Object.freeze([...draftCarrier.surfaces, surface]),
  });
}

export function currentSurfaces(draftCarrier: DraftCarrier): readonly DraftSurface[] {
  const latest = new Map<string, DraftSurface>();
  for (const surface of draftCarrier.surfaces) latest.set(surface.name, surface);
  return Object.freeze([...latest.values()]);
}

export function messageFromDraft(draftCarrier: DraftCarrier): MessageCoordinate {
  return message(draftCarrier.id, currentSurfaces(draftCarrier));
}

// ---------- JSON/IR readings ----------

function toJsonValue(value: unknown): JsonValue {
  if (typeof value === "bigint") return value.toString();
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, toJsonValue(child)]));
  }
  return String(value);
}

export function encodeChannelCoordinate(coordinate: ChannelCoordinate): ChannelCoordinateCarrier {
  return channelCoordinateCarrier.assert({
    kind: "producing-content.coordinate.channel" as const,
    term: coordinate.term,
    evidence: coordinate.evidence.map(toJsonValue),
  }, "channel coordinate");
}

export function encodeAudienceCoordinate(coordinate: AudienceCoordinate): AudienceCoordinateCarrier {
  return audienceCoordinateCarrier.assert({
    kind: "producing-content.coordinate.audience" as const,
    term: coordinate.term,
    evidence: coordinate.evidence.map(toJsonValue),
  }, "audience coordinate");
}

export function encodeMessageCoordinate(coordinate: MessageCoordinate): MessageCoordinateCarrier {
  return messageCoordinateCarrier.assert({
    kind: "producing-content.coordinate.message" as const,
    term: coordinate.term,
    evidence: coordinate.evidence.map(toJsonValue),
  }, "message coordinate");
}

export function encodeAssignment(assignmentCarrierValue: AssignmentCarrier): AssignmentJsonCarrier {
  return assignmentCarrier.assert({
    kind: "producing-content.assignment" as const,
    id: assignmentCarrierValue.id,
    brief: assignmentCarrierValue.brief,
    subjects: [...assignmentCarrierValue.subjects],
    ...(assignmentCarrierValue.channel !== undefined ? { channel: encodeChannelCoordinate(assignmentCarrierValue.channel) } : {}),
    ...(assignmentCarrierValue.audience !== undefined ? { audience: encodeAudienceCoordinate(assignmentCarrierValue.audience) } : {}),
    demand: encodeDemandCharge(assignmentCarrierValue.demand),
  }, "assignment");
}

export function encodeDraftSurface(surface: DraftSurface): DraftSurfaceJsonCarrier {
  return draftSurfaceCarrier.assert({
    kind: "producing-content.draft.surface" as const,
    name: surface.name,
    text: surface.text,
    stage: surface.stage.toString(),
  }, "draft surface");
}

export function encodeDraft(draftCarrierValue: DraftCarrier): DraftJsonCarrier {
  return draftCarrier.assert({
    kind: "producing-content.draft" as const,
    id: draftCarrierValue.id,
    assignment: draftCarrierValue.assignment,
    surfaces: draftCarrierValue.surfaces.map(encodeDraftSurface),
  }, "draft");
}

export function assignmentTerm(assignmentCarrierValue: AssignmentCarrier): Tm {
  return carrierToTerm(jsonResource(encodeAssignment(assignmentCarrierValue), "assignment"));
}

export function draftTerm(draftCarrierValue: DraftCarrier): Tm {
  return carrierToTerm(jsonResource(encodeDraft(draftCarrierValue), "draft"));
}

export function messageCoordinateTerm(coordinate: MessageCoordinate): Tm {
  return carrierToTerm(jsonResource(encodeMessageCoordinate(coordinate), "message coordinate"));
}
