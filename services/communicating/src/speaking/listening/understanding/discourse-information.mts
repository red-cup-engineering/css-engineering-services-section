/**
 * understanding/discourse-information - information readings of discourse state.
 *
 * This layer does not parse or resolve discourse again. It reads the finite
 * discourse-state carrier as empirical distributions: topic entropy, commitment
 * entropy, repair entropy, topic surprisal, redundancy, semantic cohesion, and
 * a commitment/topic channel.
 */
import { carrierFrom, type ChargeValueName } from "@red-cup-engineering/relating";
import * as analysis from "@lenticule-science/articulating/predicating/positing/settling/analysis";

import type { DiscourseState } from "./discourse-state.mjs";

export interface DiscourseSurprisal {
  readonly outcome: string;
  readonly count: number;
  readonly probability: number;
  readonly surprisal: number;
}

export interface DiscourseInformationChannel {
  readonly kind: "communicating.discourse-information.channel";
  readonly samples: number;
  readonly commitmentEntropy: number;
  readonly topicEntropy: number;
  readonly jointEntropy: number;
  readonly mutualInformation: number;
}

export interface DiscourseInformation {
  readonly kind: "communicating.discourse-information";
  readonly text: string;
  readonly stateCharge: ChargeValueName;
  readonly samples: number;
  readonly topicEntropy: number;
  readonly commitmentEntropy: number;
  readonly repairEntropy: number;
  readonly meanSurprisal: number;
  readonly redundancy: number;
  readonly semanticCohesion: number;
  readonly surprisals: readonly DiscourseSurprisal[];
  readonly channel: DiscourseInformationChannel;
}

const chargeSchema = { enum: ["absurd", "potential", "active", "stable"] } as const;

const surprisalSchema = {
  type: "object",
  required: ["outcome", "count", "probability", "surprisal"],
  additionalProperties: false,
  properties: {
    outcome: { type: "string", minLength: 1 },
    count: { type: "integer", minimum: 1 },
    probability: { type: "number", minimum: 0 },
    surprisal: { type: "number", minimum: 0 },
  },
} as const;

const channelSchema = {
  type: "object",
  required: ["kind", "samples", "commitmentEntropy", "topicEntropy", "jointEntropy", "mutualInformation"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-information.channel" },
    samples: { type: "integer", minimum: 0 },
    commitmentEntropy: { type: "number", minimum: 0 },
    topicEntropy: { type: "number", minimum: 0 },
    jointEntropy: { type: "number", minimum: 0 },
    mutualInformation: { type: "number", minimum: 0 },
  },
} as const;

export const discourseInformationSchema = {
  $id: "communicating/understanding/discourse-information",
  type: "object",
  required: [
    "kind",
    "text",
    "stateCharge",
    "samples",
    "topicEntropy",
    "commitmentEntropy",
    "repairEntropy",
    "meanSurprisal",
    "redundancy",
    "semanticCohesion",
    "surprisals",
    "channel",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-information" },
    text: { type: "string" },
    stateCharge: chargeSchema,
    samples: { type: "integer", minimum: 0 },
    topicEntropy: { type: "number", minimum: 0 },
    commitmentEntropy: { type: "number", minimum: 0 },
    repairEntropy: { type: "number", minimum: 0 },
    meanSurprisal: { type: "number", minimum: 0 },
    redundancy: { type: "number", minimum: 0, maximum: 1 },
    semanticCohesion: { type: "number", minimum: 0, maximum: 1 },
    surprisals: { type: "array", items: surprisalSchema },
    channel: channelSchema,
  },
} as const;

export const discourseInformationCarrier = carrierFrom(discourseInformationSchema);

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function counts(values: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const value of values) out.set(value, (out.get(value) ?? 0) + 1);
  return out;
}

function entropyOf(values: readonly string[]): number {
  return analysis.shannonEntropy([...counts(values).values()]);
}

function topicSamples(state: DiscourseState): readonly string[] {
  return Object.freeze(state.topics.flatMap((topic) => topic.mentions.map(() => topic.label)));
}

function commitmentSamples(state: DiscourseState): readonly string[] {
  return Object.freeze(state.commitments.map((commitment) => `${commitment.basis}:${commitment.charge}`));
}

function repairSamples(state: DiscourseState): readonly string[] {
  return Object.freeze(state.repairs.map((repair) => `${repair.kind}:${repair.charge}`));
}

function surprisals(values: readonly string[]): readonly DiscourseSurprisal[] {
  const sampleCounts = counts(values);
  const total = values.length;
  if (total === 0) return Object.freeze([]);
  return Object.freeze([...sampleCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([outcome, count]) => {
      const probability = count / total;
      return Object.freeze({
        outcome,
        count,
        probability,
        surprisal: -Math.log2(probability),
      });
    }));
}

function meanSurprisalOf(values: readonly string[]): number {
  const readings = surprisals(values);
  if (values.length === 0) return 0;
  return readings.reduce((sum, item) => sum + item.probability * item.surprisal, 0);
}

function redundancyOf(values: readonly string[], entropy: number): number {
  const alphabet = counts(values).size;
  if (alphabet === 0) return 0;
  if (alphabet === 1) return 1;
  return clampUnit(1 - entropy / Math.log2(alphabet));
}

function obstructedMass(state: DiscourseState): number {
  const badReferences = state.references.filter((reference) => reference.status !== "resolved").length;
  const badPresuppositions = state.presuppositions.filter((item) => item.status === "absurd" || item.status === "stable").length;
  const badCommitments = state.commitments.filter((item) => item.basis === "ambiguous" || item.basis === "unproved").length;
  const badRepairs = state.repairs.filter((item) => item.charge === "absurd" || item.charge === "stable").length;
  return badReferences + badPresuppositions + badCommitments + badRepairs;
}

function semanticCohesionOf(state: DiscourseState): number {
  const obligations =
    state.references.length +
    state.presuppositions.length +
    state.commitments.length +
    state.repairs.length;
  if (obligations === 0) return state.topics.length <= 1 ? 1 : 0;
  return clampUnit(1 - obstructedMass(state) / obligations);
}

function topicsForReading(state: DiscourseState, readingId: string): readonly string[] {
  const prefix = `${readingId}:`;
  const labels = state.topics
    .filter((topic) => topic.mentions.some((mention) => mention.startsWith(prefix)))
    .map((topic) => topic.label);
  return Object.freeze(labels.length === 0 ? ["topic:none"] : labels);
}

function channelOf(state: DiscourseState): DiscourseInformationChannel {
  const pairs = state.commitments.flatMap((commitment) =>
    topicsForReading(state, commitment.readingId).map((topic): readonly [string, string] => [
      `${commitment.basis}:${commitment.charge}`,
      topic,
    ]));
  const info = analysis.mutualInformation(pairs);
  return Object.freeze({
    kind: "communicating.discourse-information.channel" as const,
    samples: info.samples,
    commitmentEntropy: info.entropyX,
    topicEntropy: info.entropyY,
    jointEntropy: info.jointEntropy,
    mutualInformation: info.mutualInformation,
  });
}

export function discourseInformationOfState(state: DiscourseState): DiscourseInformation {
  const topics = topicSamples(state);
  const commitments = commitmentSamples(state);
  const repairs = repairSamples(state);
  const topicEntropy = entropyOf(topics);
  const information: DiscourseInformation = Object.freeze({
    kind: "communicating.discourse-information" as const,
    text: state.text,
    stateCharge: state.charge,
    samples: topics.length + commitments.length + repairs.length,
    topicEntropy,
    commitmentEntropy: entropyOf(commitments),
    repairEntropy: entropyOf(repairs),
    meanSurprisal: meanSurprisalOf(topics),
    redundancy: redundancyOf(topics, topicEntropy),
    semanticCohesion: semanticCohesionOf(state),
    surprisals: surprisals(topics),
    channel: channelOf(state),
  });
  discourseInformationCarrier.assert(information, "discourse information");
  return information;
}
