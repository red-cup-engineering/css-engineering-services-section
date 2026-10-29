import { carrierFrom, carrierToTerm, fixedPointReadingsOfUtterances, mark, settleUtterances, utterance, type MemeTopologyFixedPointReadings, type SettlementFiltration, type Tm, type UtteranceCarrier, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export type { UtteranceCarrier };

export function contentTerm(id: string): string { return `content.object.${id}`; }
export function communicatorTerm(id: string): string { return `content.communicator.${id}`; }
export function messageTerm(id: string): string { return `content.message.${id}`; }
export function channelTerm(id: string): string { return `content.channel.${id}`; }
export function audienceTerm(id: string): string { return `content.audience.${id}`; }
export function effectTerm(id: string): string { return `content.effect.${id}`; }
export function frameTerm(id: string): string { return `content.frame.${id}`; }
export function gateTerm(name: string): string { return `content.gate.${name}`; }

export function communicatedByPredicate(): string { return "content.communicated-by"; }
export function saysPredicate(): string { return "content.says"; }
export function inChannelPredicate(): string { return "content.in-channel"; }
export function addressedToPredicate(): string { return "content.addressed-to"; }
export function effectedPredicate(): string { return "content.effected"; }
export function framedAsPredicate(): string { return "content.framed-as"; }
export function clearsGatePredicate(): string { return "content.clears-gate"; }
export function rejectedByGatePredicate(): string { return "content.rejected-by-gate"; }

export type LasswellPosition = "communicator" | "message" | "channel" | "audience" | "effect";

const EvidenceSchema = { type: "array", items: {} } as const;

export const CommunicatorCoordinateSchema = { $id: "producing-content/topology/content/coordinate/communicator", title: "CommunicatorCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.communicator" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const MessageCoordinateSchema = { $id: "producing-content/topology/content/coordinate/message", title: "MessageCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.message" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const ChannelCoordinateSchema = { $id: "producing-content/topology/content/coordinate/channel", title: "ChannelCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.channel" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const AudienceCoordinateSchema = { $id: "producing-content/topology/content/coordinate/audience", title: "AudienceCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.audience" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const EffectCoordinateSchema = { $id: "producing-content/topology/content/coordinate/effect", title: "EffectCoordinate", additionalProperties: false, type: "object", required: ["kind", "term", "evidence"], properties: { kind: { const: "producing-content.coordinate.effect" }, term: { minLength: 1, type: "string" }, evidence: EvidenceSchema } } as const;

export const ContentCellMarkSchema = { $id: "producing-content/topology/content/cell", title: "ContentCellMark", additionalProperties: false, type: "object", required: ["kind", "subject", "object"], properties: { kind: { const: "producing-content.content.cell" }, subject: { minLength: 1, type: "string" }, object: { minLength: 1, type: "string" } } } as const;

export const ContentObjectSchema = { $id: "producing-content/topology/content/object", title: "ContentObject", additionalProperties: false, type: "object", required: ["kind", "term", "effects", "utterances"], properties: { kind: { const: "producing-content.content.object" }, term: { minLength: 1, type: "string" }, communicator: CommunicatorCoordinateSchema, message: MessageCoordinateSchema, channel: ChannelCoordinateSchema, audience: AudienceCoordinateSchema, effects: { type: "array", items: EffectCoordinateSchema }, utterances: { type: "array", items: {} }, body: { type: "string" } } } as const;

export type CommunicatorCoordinate = FromSchema<typeof CommunicatorCoordinateSchema>;
export type MessageCoordinate = FromSchema<typeof MessageCoordinateSchema>;
export type ChannelCoordinate = FromSchema<typeof ChannelCoordinateSchema>;
export type AudienceCoordinate = FromSchema<typeof AudienceCoordinateSchema>;
export type EffectCoordinate = FromSchema<typeof EffectCoordinateSchema>;
export type ContentCellMark = FromSchema<typeof ContentCellMarkSchema>;
export type ContentObjectCarrier = FromSchema<typeof ContentObjectSchema>;
export type LasswellCoordinate =
  | CommunicatorCoordinate
  | MessageCoordinate
  | ChannelCoordinate
  | AudienceCoordinate
  | EffectCoordinate;

export type ContentObject = Omit<ContentObjectCarrier, "utterances"> & Readonly<{
  utterances: readonly UtteranceCarrier[];
}>;

export interface ContentObjectInput {
  readonly id: string;
  readonly communicator?: CommunicatorCoordinate;
  readonly message?: MessageCoordinate;
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  readonly body?: string;
}

export const communicatorCoordinateCarrier = carrierFrom(CommunicatorCoordinateSchema);
export const messageCoordinateCarrier = carrierFrom(MessageCoordinateSchema);
export const channelCoordinateCarrier = carrierFrom(ChannelCoordinateSchema);
export const audienceCoordinateCarrier = carrierFrom(AudienceCoordinateSchema);
export const effectCoordinateCarrier = carrierFrom(EffectCoordinateSchema);
export const contentCellMarkCarrier = carrierFrom(ContentCellMarkSchema);
export const contentObjectCarrier = carrierFrom(ContentObjectSchema);

const frozenEvidence = (evidence: readonly unknown[]): readonly unknown[] =>
  Object.freeze([...evidence]);

export function communicator(id: string, evidence: readonly unknown[] = []): CommunicatorCoordinate {
  return communicatorCoordinateCarrier.assert({
    kind: "producing-content.coordinate.communicator" as const,
    term: communicatorTerm(id),
    evidence: frozenEvidence(evidence),
  }, "communicator coordinate");
}

export function message(id: string, evidence: readonly unknown[] = []): MessageCoordinate {
  return messageCoordinateCarrier.assert({
    kind: "producing-content.coordinate.message" as const,
    term: messageTerm(id),
    evidence: frozenEvidence(evidence),
  }, "message coordinate");
}

export function channel(id: string, evidence: readonly unknown[] = []): ChannelCoordinate {
  return channelCoordinateCarrier.assert({
    kind: "producing-content.coordinate.channel" as const,
    term: channelTerm(id),
    evidence: frozenEvidence(evidence),
  }, "channel coordinate");
}

export function audience(id: string, evidence: readonly unknown[] = []): AudienceCoordinate {
  return audienceCoordinateCarrier.assert({
    kind: "producing-content.coordinate.audience" as const,
    term: audienceTerm(id),
    evidence: frozenEvidence(evidence),
  }, "audience coordinate");
}

export function effect(id: string, evidence: readonly unknown[] = []): EffectCoordinate {
  return effectCoordinateCarrier.assert({
    kind: "producing-content.coordinate.effect" as const,
    term: effectTerm(id),
    evidence: frozenEvidence(evidence),
  }, "effect coordinate");
}

export const contentCellMark = (subject: string, object: string): ContentCellMark =>
  contentCellMarkCarrier.assert({
    kind: "producing-content.content.cell" as const,
    subject,
    object,
  }, "content cell mark");

export function contentCellMarkTerm(input: ContentCellMark): Tm {
  return carrierToTerm(jsonResource(contentCellMarkCarrier.assert(input), "content cell mark"));
}

const POSITION_PREDICATES: Readonly<Record<LasswellPosition, () => string>> = Object.freeze({
  communicator: communicatedByPredicate,
  message: saysPredicate,
  channel: inChannelPredicate,
  audience: addressedToPredicate,
  effect: effectedPredicate,
});

const coordinateUtterance = (
  subject: string,
  position: LasswellPosition,
  coordinate: LasswellCoordinate,
): UtteranceCarrier =>
  utterance(mark(contentCellMark(subject, coordinate.term)), mark(POSITION_PREDICATES[position]()));

export function contentObject(input: ContentObjectInput): ContentObject {
  const term = contentTerm(input.id);
  const utterances: UtteranceCarrier[] = [];
  if (input.communicator !== undefined) utterances.push(coordinateUtterance(term, "communicator", input.communicator));
  if (input.message !== undefined) utterances.push(coordinateUtterance(term, "message", input.message));
  if (input.channel !== undefined) utterances.push(coordinateUtterance(term, "channel", input.channel));
  if (input.audience !== undefined) utterances.push(coordinateUtterance(term, "audience", input.audience));
  return contentObjectCarrier.assert({
    kind: "producing-content.content.object" as const,
    term,
    ...(input.communicator !== undefined ? { communicator: input.communicator } : {}),
    ...(input.message !== undefined ? { message: input.message } : {}),
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    effects: Object.freeze([] as EffectCoordinate[]),
    utterances: Object.freeze(utterances),
    ...(input.body !== undefined ? { body: input.body } : {}),
  }, "content object") as ContentObject;
}

export function contentObjectTerm(input: ContentObject): Tm {
  return carrierToTerm(jsonResource(contentObjectCarrier.assert(input), "content object"));
}

export function withEffect(content: ContentObject, effectCoordinate: EffectCoordinate): ContentObject {
  return contentObjectCarrier.assert({
    ...content,
    effects: Object.freeze([...content.effects, effectCoordinate]),
    utterances: Object.freeze([
      ...content.utterances,
      coordinateUtterance(content.term, "effect", effectCoordinate),
    ]),
  }, "content object") as ContentObject;
}

export function frameUtterance(contentId: string, frameId: string): UtteranceCarrier {
  return utterance(mark(contentCellMark(contentTerm(contentId), frameTerm(frameId))), mark(framedAsPredicate()));
}

export function gateClearedUtterance(contentId: string, gateName: string): UtteranceCarrier {
  return utterance(mark(contentCellMark(contentTerm(contentId), gateTerm(gateName))), mark(clearsGatePredicate()));
}

export function gateRejectedUtterance(contentId: string, gateName: string): UtteranceCarrier {
  return utterance(mark(contentCellMark(contentTerm(contentId), gateTerm(gateName))), mark(rejectedByGatePredicate()));
}

export interface ContentTopologyCarrier {
  readonly kind: "producing-content.content.topology";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _contentTopologyBrand: never;
}

export function induceContentTopology(utterances: readonly UtteranceCarrier[]): ContentTopologyCarrier {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "producing-content.content.topology" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as ContentTopologyCarrier;
}

export function extendContentTopology(
  carrier: ContentTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): ContentTopologyCarrier {
  return induceContentTopology([...carrier.utterances, ...delta]);
}

export interface LasswellWitness {
  readonly kind: "producing-content.lasswell:witness";
  readonly content: ContentObject;
  readonly positions: readonly LasswellPosition[];
}

export interface LasswellObstruction {
  readonly kind: "producing-content.lasswell-obstruction";
  readonly content: ContentObject;
  readonly missing: readonly LasswellPosition[];
}

export type LasswellJudgment = LasswellWitness | LasswellObstruction;

const PRODUCTION_POSITIONS: readonly LasswellPosition[] =
  Object.freeze(["communicator", "message", "channel", "audience"]);

const occupied = (content: ContentObject, position: LasswellPosition): boolean =>
  position === "effect" ? content.effects.length > 0 : content[position] !== undefined;

export function lasswellJudgment(
  content: ContentObject,
  positions: readonly LasswellPosition[] = PRODUCTION_POSITIONS,
): LasswellJudgment {
  const missing = positions.filter((position) => !occupied(content, position));
  if (missing.length > 0) {
    return Object.freeze({
      kind: "producing-content.lasswell-obstruction" as const,
      content,
      missing: Object.freeze(missing),
    });
  }
  return Object.freeze({
    kind: "producing-content.lasswell:witness" as const,
    content,
    positions: Object.freeze([...positions]),
  });
}
