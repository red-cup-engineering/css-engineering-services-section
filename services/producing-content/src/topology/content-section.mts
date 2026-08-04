import {
  bottom,
  joinKnowledge,
  sectionOf,
  type ChargeCarrier,
  type SectionCarrier,
  type SectionEntry,
} from "@red-cup-engineering/relating";
import {
  addressedToPredicate,
  audienceTerm,
  channelTerm,
  clearsGatePredicate,
  communicatedByPredicate,
  communicatorTerm,
  contentTerm,
  effectedPredicate,
  effectTerm,
  frameTerm,
  framedAsPredicate,
  gateTerm,
  inChannelPredicate,
  messageTerm,
  rejectedByGatePredicate,
  saysPredicate,
  type ContentTopologyCarrier,
  type LasswellPosition,
} from "./content-topology.mjs";

export type { ChargeCarrier, SectionCarrier, SectionEntry };

export function contentKnowledgeSection(carrier: ContentTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.knowledgeLeast);
}

export function contentTruthSection(carrier: ContentTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.truthLeast);
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const markMatchesContentCell = (value: unknown, subject: string, object: string): boolean =>
  isRecord(value)
  && value.kind === "producing-content.content.cell"
  && value.subject === subject
  && value.object === object;

const predicateMark = (entry: SectionEntry): unknown => entry.cell.predicate.mark.value;

const entryMatchesContentCell = (
  entry: SectionEntry,
  subject: string,
  predicate: string,
  object: string,
): boolean =>
  predicateMark(entry) === predicate
  && markMatchesContentCell(entry.cell.subject.mark.value, subject, object)
  && markMatchesContentCell(entry.cell.object.mark.value, subject, object);

const contentCellCharge = (
  section: SectionCarrier,
  subject: string,
  predicate: string,
  object: string,
): ChargeCarrier =>
  section.entries
    .filter((entry) => entryMatchesContentCell(entry, subject, predicate, object))
    .reduce((acc, entry) => joinKnowledge(acc, entry.charge), bottom);

const entriesForContent = (section: SectionCarrier, subject: string): readonly SectionEntry[] =>
  Object.freeze(section.entries.filter((entry) => {
    const value = entry.cell.subject.mark.value;
    return isRecord(value)
      && value.kind === "producing-content.content.cell"
      && value.subject === subject;
  }));

export function communicatorCharge(section: SectionCarrier, contentId: string, communicatorId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), communicatedByPredicate(), communicatorTerm(communicatorId));
}

export function messageCharge(section: SectionCarrier, contentId: string, messageId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), saysPredicate(), messageTerm(messageId));
}

export function channelCharge(section: SectionCarrier, contentId: string, channelId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), inChannelPredicate(), channelTerm(channelId));
}

export function audienceCharge(section: SectionCarrier, contentId: string, audienceId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), addressedToPredicate(), audienceTerm(audienceId));
}

export function effectCharge(section: SectionCarrier, contentId: string, effectId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), effectedPredicate(), effectTerm(effectId));
}

export function frameCharge(section: SectionCarrier, contentId: string, frameId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), framedAsPredicate(), frameTerm(frameId));
}

export interface GateVerdict {
  readonly kind: "producing-content.gate.verdict";
  readonly content: string;
  readonly gate: string;
  readonly cleared: ChargeCarrier;
  readonly rejected: ChargeCarrier;
}

export function gateVerdict(section: SectionCarrier, contentId: string, gateName: string): GateVerdict {
  return Object.freeze({
    kind: "producing-content.gate.verdict" as const,
    content: contentTerm(contentId),
    gate: gateTerm(gateName),
    cleared: contentCellCharge(section, contentTerm(contentId), clearsGatePredicate(), gateTerm(gateName)),
    rejected: contentCellCharge(section, contentTerm(contentId), rejectedByGatePredicate(), gateTerm(gateName)),
  });
}

export interface PositionReading {
  readonly kind: "producing-content.analysis.position";
  readonly position: LasswellPosition;
  readonly entries: readonly SectionEntry[];
}

export interface ContentAnalysisCarrier {
  readonly kind: "producing-content.analysis";
  readonly content: string;
  readonly readings: readonly PositionReading[];
}

const POSITION_ORDER: readonly LasswellPosition[] =
  Object.freeze(["communicator", "message", "channel", "audience", "effect"]);

const PREDICATE_OF: Readonly<Record<LasswellPosition, () => string>> = Object.freeze({
  communicator: communicatedByPredicate,
  message: saysPredicate,
  channel: inChannelPredicate,
  audience: addressedToPredicate,
  effect: effectedPredicate,
});

export function contentAnalysis(section: SectionCarrier, contentId: string): ContentAnalysisCarrier {
  const subjectEntries = entriesForContent(section, contentTerm(contentId));
  const readings = POSITION_ORDER.map((position) => Object.freeze({
    kind: "producing-content.analysis.position" as const,
    position,
    entries: Object.freeze(subjectEntries.filter((entry) => predicateMark(entry) === PREDICATE_OF[position]())),
  }));
  return Object.freeze({
    kind: "producing-content.analysis" as const,
    content: contentTerm(contentId),
    readings: Object.freeze(readings),
  });
}

export function contentEntries(section: SectionCarrier, contentId: string): readonly SectionEntry[] {
  return entriesForContent(section, contentTerm(contentId));
}
