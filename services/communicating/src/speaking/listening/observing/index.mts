/**
 * observing - parse readings as charged communication observations.
 *
 * This is the communication-specific observation adapter cannibalized from the
 * old animating-experimental doing algebra. It reads a language parse result into
 * charged observations about communication tasks; it does not become a root
 * communicating action because parsing is bundle/codec-bound in this package.
 */
import {
  articulate,
  carrierFrom,
  cell,
  charge,
  chargeValue,
  claim,
  mark,
  predicateOfClaim,
  token,
  type ArticulationCell,
  type Cell,
  type ChargeCarrier,
  type ChargeValueName,
  type Claim,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
  type Token,
  type UtteranceCarrier,
  type FromSchema,
} from "@red-cup-engineering/relating";
import type { CompiledBundle } from "../algebra/index.mjs";
import {
  parseCommunication,
  type CommunicatingCarrier,
  type ParseResult,
} from "../parsing/index.mjs";

const utteranceSlot = { description: "A relating utterance carrier." } as const;
const articulationSlot = { description: "A relating articulation cell." } as const;
const termSlot = { description: "A relating predication term." } as const;
const predicateSlot = { description: "A relating predication predicate." } as const;
const cellSlot = { description: "A relating predication cell." } as const;
const chargeSlot = { description: "A relating bilattice charge carrier." } as const;
const carrierEvidenceSlot = { description: "Relational evidence carried with the observation." } as const;
const parseSlot = { description: "A communicating parse result." } as const;
const sourceSlot = { description: "A communicating carrier." } as const;

export const communicationTaskSchema = {
  $id: "communicating/speaking/listening/observing/task",
  type: "object",
  required: ["kind", "utterance", "articulation", "subject", "predicate", "object", "cell"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.task" },
    utterance: utteranceSlot,
    articulation: articulationSlot,
    subject: termSlot,
    predicate: predicateSlot,
    object: termSlot,
    cell: cellSlot,
  },
} as const;
export const communicationTaskCarrier = carrierFrom(communicationTaskSchema);

export const communicationObservationSchema = {
  $id: "communicating/speaking/listening/observing/observation",
  type: "object",
  required: ["kind", "observer", "task", "charge"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.observation" },
    observer: termSlot,
    task: communicationTaskSchema,
    charge: chargeSlot,
    at: carrierEvidenceSlot,
    note: carrierEvidenceSlot,
  },
} as const;
export const communicationObservationCarrier = carrierFrom(communicationObservationSchema);

export const communicationObservationSetSchema = {
  $id: "communicating/speaking/listening/observing/observations",
  type: "object",
  required: ["kind", "source", "parse", "observations"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.observations" },
    source: sourceSlot,
    parse: parseSlot,
    observations: { type: "array", items: communicationObservationSchema },
  },
} as const;
export const communicationObservationSetCarrier = carrierFrom(communicationObservationSetSchema);

export type CommunicationTask = Omit<
  FromSchema<typeof communicationTaskSchema>,
  "utterance" | "articulation" | "subject" | "predicate" | "object" | "cell"
> & {
  readonly utterance: UtteranceCarrier;
  readonly articulation: ArticulationCell;
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object: PredicationTerm;
  readonly cell: Cell;
};
export type CommunicationObservation = Omit<
  FromSchema<typeof communicationObservationSchema>,
  "observer" | "task" | "charge" | "at" | "note"
> & {
  readonly observer: PredicationTerm;
  readonly task: CommunicationTask;
  readonly charge: ChargeCarrier;
  readonly at?: CommunicationTaskEvidence;
  readonly note?: CommunicationTaskEvidence;
};
export type CommunicationObservationSet = Omit<
  FromSchema<typeof communicationObservationSetSchema>,
  "source" | "parse" | "observations"
> & {
  readonly source: CommunicatingCarrier;
  readonly parse: ParseResult;
  readonly observations: readonly CommunicationObservation[];
};

export type CommunicationTaskEvidence =
  | Mark
  | Token
  | Claim
  | PredicationPredicate
  | PredicationTerm
  | Cell
  | UtteranceCarrier
  | ArticulationCell
  | CommunicationTask;

type CommunicationPredicateLabel = "word-connected" | "arc-status" | "answer-status";
type CommunicationStatusLabel = ParseResult["words"][number]["connected"] | ParseResult["arcs"][number]["status"];
type CommunicationReading =
  | ParseResult["words"][number]
  | ParseResult["arcs"][number]
  | ParseResult["answers"][number];

const COMMUNICATION_OBSERVER = token(mark(Object.freeze(["communicating", "listening", "observer"] as const)));

const COMMUNICATION_PREDICATES = Object.freeze({
  wordConnected: communicationPredicate("word-connected"),
  arcStatus: communicationPredicate("arc-status"),
  answerStatus: communicationPredicate("answer-status"),
});

const COMMUNICATION_STATUS_TERMS = Object.freeze({
  decided: token(mark(Object.freeze(["communicating", "listening", "status", "decided"] as const))),
  ambiguous: token(mark(Object.freeze(["communicating", "listening", "status", "ambiguous"] as const))),
  void: token(mark(Object.freeze(["communicating", "listening", "status", "void"] as const))),
});

/** Convert an admitted communication and language bundle into charged parse observations. */
export function communicationObservations(
  source: CommunicatingCarrier,
  bundle: CompiledBundle,
): CommunicationObservationSet {
  return observationsOfCommunication(source, parseCommunication(source, bundle));
}

/** Convert an existing parse result into charged observations over communicating tasks. */
export function observationsOfCommunication(
  source: CommunicatingCarrier,
  parsed: ParseResult,
): CommunicationObservationSet {
  const sourceNote = source.articulation;
  const observations = Object.freeze([
    ...parsed.words.map((word) => wordObservation(word, sourceNote)),
    ...parsed.arcs.map((arc) => arcObservation(arc, sourceNote)),
    ...parsed.answers.map((answer) => answerObservation(answer, sourceNote)),
  ]);
  return Object.freeze({
    kind: "communicating.observations" as const,
    source,
    parse: parsed,
    observations,
  }) as CommunicationObservationSet;
}

export function communicationTask(input: {
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object?: PredicationTerm;
}): CommunicationTask;
export function communicationTask(input: Cell): CommunicationTask;
export function communicationTask(input: UtteranceCarrier): CommunicationTask;
export function communicationTask(input: Cell | UtteranceCarrier | {
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object?: PredicationTerm;
}): CommunicationTask {
  if (isUtteranceCarrier(input)) {
    const subject = input.token;
    const predicate = predicateOfClaim(input.claim);
    return taskFromCell(input, cell(subject, predicate, subject));
  }
  if (isCellCarrier(input)) return taskFromCell(undefined, input);
  return taskFromCell(undefined, cell(input.subject, input.predicate, input.object ?? input.subject));
}

export function taskCell(taskCarrier: CommunicationTask): Cell {
  return taskCarrier.cell;
}

export function communicationObservation(input: {
  readonly observer: PredicationTerm;
  readonly task: CommunicationTask;
  readonly charge: ChargeCarrier;
  readonly at?: CommunicationTaskEvidence;
  readonly note?: CommunicationTaskEvidence;
}): CommunicationObservation {
  return Object.freeze({
    kind: "communicating.observation" as const,
    observer: input.observer,
    task: input.task,
    charge: input.charge,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.note === undefined ? {} : { note: input.note }),
  });
}

function taskFromCell(utteranceCarrier: UtteranceCarrier | undefined, taskCarrier: Cell): CommunicationTask {
  const taskUtterance = utteranceCarrier ?? Object.freeze({
    kind: "utterance.carrier" as const,
    token: taskCarrier.subject,
    claim: taskCarrier.predicate.claim,
  });
  return Object.freeze({
    kind: "communicating.task" as const,
    utterance: taskUtterance,
    articulation: articulate(taskUtterance),
    subject: taskCarrier.subject,
    predicate: taskCarrier.predicate,
    object: taskCarrier.object,
    cell: taskCarrier,
  });
}

function wordObservation(word: ParseResult["words"][number], note: CommunicationTaskEvidence): CommunicationObservation {
  return communicationObservation({
    observer: COMMUNICATION_OBSERVER,
    task: communicationTask({
      subject: readingTerm(word),
      predicate: COMMUNICATION_PREDICATES.wordConnected,
      object: statusTerm(word.connected),
    }),
    charge: communicationCharge(word.connected === "decided" ? "potential" : word.connected === "ambiguous" ? "stable" : "absurd", word),
    note,
  });
}

function arcObservation(arc: ParseResult["arcs"][number], note: CommunicationTaskEvidence): CommunicationObservation {
  return communicationObservation({
    observer: COMMUNICATION_OBSERVER,
    task: communicationTask({
      subject: readingTerm(arc),
      predicate: COMMUNICATION_PREDICATES.arcStatus,
      object: statusTerm(arc.status),
    }),
    charge: communicationCharge(arc.value, arc),
    note,
  });
}

function answerObservation(answer: ParseResult["answers"][number], note: CommunicationTaskEvidence): CommunicationObservation {
  return communicationObservation({
    observer: COMMUNICATION_OBSERVER,
    task: communicationTask({
      subject: readingTerm(answer),
      predicate: COMMUNICATION_PREDICATES.answerStatus,
      object: statusTerm(answer.status),
    }),
    charge: communicationCharge(answer.value, answer),
    note,
  });
}

function communicationPredicate(label: CommunicationPredicateLabel): PredicationPredicate {
  return predicateOfClaim(claim(mark(Object.freeze(["communicating", "listening", "predicate", label] as const))));
}

function readingTerm(reading: CommunicationReading): PredicationTerm {
  return token(mark(reading));
}

function statusTerm(status: CommunicationStatusLabel): PredicationTerm {
  return COMMUNICATION_STATUS_TERMS[status];
}

function communicationCharge(value: ChargeValueName, witness: CommunicationReading): ChargeCarrier {
  const witnessMark = mark(witness);
  const evidence = value === "potential"
    ? [[witnessMark], []] as const
    : value === "active"
      ? [[], [witnessMark]] as const
      : value === "stable"
        ? [[witnessMark], [witnessMark]] as const
        : [[], []] as const;
  return charge(chargeValue(value), evidence);
}

function isUtteranceCarrier(value: object): value is UtteranceCarrier {
  return "kind" in value && value.kind === "utterance.carrier";
}

function isCellCarrier(value: object): value is Cell {
  return "subject" in value && "predicate" in value && "object" in value;
}
