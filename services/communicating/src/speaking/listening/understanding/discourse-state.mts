/**
 * understanding/discourse-state - dynamic discourse state over parse forests.
 *
 * This layer lifts local parse readings into a finite discourse state: entities,
 * references, presuppositions, topics, commitments, and repairs. It consumes the
 * parse forest and Lambek proof carriers; it does not parse text again and it
 * does not add a dependency beyond @red-cup-engineering/relating.
 */
import { carrierFrom, type ChargeValueName } from "@red-cup-engineering/relating";

import {
  lambekProofOfForest,
  type LambekForestProof,
  type ParseForest,
  type ParseForestReading,
  type ParsedWord,
} from "../parsing/index.mjs";
import { presuppositions } from "./semantics/index.mjs";

export type DiscourseRepairKind =
  | "unresolved-reference"
  | "ambiguous-reference"
  | "presupposition-accommodation"
  | "parse-obstruction"
  | "grammar-obstruction";

export interface DiscourseEntity {
  readonly id: string;
  readonly label: string;
  readonly mentions: readonly string[];
  readonly charge: ChargeValueName;
}

export interface DiscourseReference {
  readonly anaphor: string;
  readonly status: "resolved" | "ambiguous" | "void";
  readonly antecedent: string | null;
  readonly candidates: readonly string[];
  readonly readingId: string;
}

export interface DiscoursePresupposition {
  readonly trigger: string;
  readonly presupposed: string;
  readonly status: ChargeValueName;
  readonly readingId: string;
}

export interface DiscourseTopic {
  readonly id: string;
  readonly label: string;
  readonly mentions: readonly string[];
  readonly charge: ChargeValueName;
}

export interface DiscourseCommitment {
  readonly id: string;
  readonly proposition: string;
  readonly readingId: string;
  readonly charge: ChargeValueName;
  readonly basis: "assertion" | "denial" | "ambiguous" | "unproved";
}

export interface DiscourseRepair {
  readonly kind: DiscourseRepairKind;
  readonly target: string;
  readonly readingId: string;
  readonly charge: ChargeValueName;
  readonly note: string;
}

export interface DiscourseState {
  readonly kind: "communicating.discourse-state";
  readonly text: string;
  readonly entities: readonly DiscourseEntity[];
  readonly references: readonly DiscourseReference[];
  readonly presuppositions: readonly DiscoursePresupposition[];
  readonly topics: readonly DiscourseTopic[];
  readonly commitments: readonly DiscourseCommitment[];
  readonly repairs: readonly DiscourseRepair[];
  readonly charge: ChargeValueName;
}

const chargeSchema = { enum: ["absurd", "potential", "active", "stable"] } as const;

const entitySchema = {
  type: "object",
  required: ["id", "label", "mentions", "charge"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    label: { type: "string", minLength: 1 },
    mentions: { type: "array", items: { type: "string" } },
    charge: chargeSchema,
  },
} as const;

const referenceSchema = {
  type: "object",
  required: ["anaphor", "status", "antecedent", "candidates", "readingId"],
  additionalProperties: false,
  properties: {
    anaphor: { type: "string", minLength: 1 },
    status: { enum: ["resolved", "ambiguous", "void"] },
    antecedent: { anyOf: [{ type: "string" }, { type: "null" }] },
    candidates: { type: "array", items: { type: "string" } },
    readingId: { type: "string", minLength: 1 },
  },
} as const;

const presuppositionSchema = {
  type: "object",
  required: ["trigger", "presupposed", "status", "readingId"],
  additionalProperties: false,
  properties: {
    trigger: { type: "string", minLength: 1 },
    presupposed: { type: "string", minLength: 1 },
    status: chargeSchema,
    readingId: { type: "string", minLength: 1 },
  },
} as const;

const commitmentSchema = {
  type: "object",
  required: ["id", "proposition", "readingId", "charge", "basis"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    proposition: { type: "string" },
    readingId: { type: "string", minLength: 1 },
    charge: chargeSchema,
    basis: { enum: ["assertion", "denial", "ambiguous", "unproved"] },
  },
} as const;

const repairSchema = {
  type: "object",
  required: ["kind", "target", "readingId", "charge", "note"],
  additionalProperties: false,
  properties: {
    kind: {
      enum: [
        "unresolved-reference",
        "ambiguous-reference",
        "presupposition-accommodation",
        "parse-obstruction",
        "grammar-obstruction",
      ],
    },
    target: { type: "string", minLength: 1 },
    readingId: { type: "string", minLength: 1 },
    charge: chargeSchema,
    note: { type: "string" },
  },
} as const;

export const discourseStateSchema = {
  $id: "communicating/understanding/discourse-state",
  type: "object",
  required: ["kind", "text", "entities", "references", "presuppositions", "topics", "commitments", "repairs", "charge"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.discourse-state" },
    text: { type: "string" },
    entities: { type: "array", items: entitySchema },
    references: { type: "array", items: referenceSchema },
    presuppositions: { type: "array", items: presuppositionSchema },
    topics: { type: "array", items: entitySchema },
    commitments: { type: "array", items: commitmentSchema },
    repairs: { type: "array", items: repairSchema },
    charge: chargeSchema,
  },
} as const;

export const discourseStateCarrier = carrierFrom(discourseStateSchema);

const THIRD_PERSON = new Set(["he", "him", "his", "she", "her", "hers", "it", "its", "they", "them", "their", "theirs"]);

function entityLabel(text: string): string {
  return text.toLowerCase();
}

function isMention(word: ParsedWord): boolean {
  return word.tags.includes("noun") || word.tags.includes("pron");
}

function isPronoun(word: ParsedWord): boolean {
  return word.tags.includes("pron") || THIRD_PERSON.has(word.text.toLowerCase());
}

function isEntityMention(word: ParsedWord): boolean {
  return isMention(word) && !isPronoun(word);
}

function repair(
  kind: DiscourseRepairKind,
  target: string,
  readingId: string,
  charge: ChargeValueName,
  note: string,
): DiscourseRepair {
  return Object.freeze({ kind, target, readingId, charge, note });
}

function addEntity(entities: Map<string, DiscourseEntity>, word: ParsedWord, reading: ParseForestReading): void {
  const label = entityLabel(word.text);
  const prior = entities.get(label);
  const mention = `${reading.id}:${word.id}`;
  if (prior === undefined) {
    entities.set(label, Object.freeze({
      id: `entity:${label}`,
      label,
      mentions: Object.freeze([mention]),
      charge: reading.charge,
    }));
    return;
  }
  entities.set(label, Object.freeze({
    ...prior,
    mentions: Object.freeze([...prior.mentions, mention]),
    charge: prior.charge === reading.charge ? prior.charge : "stable",
  }));
}

function resolveDynamicReference(
  word: ParsedWord,
  reading: ParseForestReading,
  entities: Map<string, DiscourseEntity>,
): DiscourseReference {
  const candidates = [...entities.values()].map((entity) => entity.label).reverse();
  const status = candidates.length === 0 ? "void" : candidates.length === 1 ? "resolved" : "ambiguous";
  return Object.freeze({
    anaphor: word.text,
    status,
    antecedent: status === "resolved" ? candidates[0]! : null,
    candidates: Object.freeze(candidates),
    readingId: reading.id,
  });
}

function definitePresuppositions(reading: ParseForestReading): readonly DiscoursePresupposition[] {
  const out: DiscoursePresupposition[] = [];
  for (const arc of reading.parse.arcs) {
    if (arc.rel !== "det" || arc.depText.toLowerCase() !== "the") continue;
    out.push(Object.freeze({
      trigger: `the ${arc.headText}`,
      presupposed: `exists(${arc.headText.toLowerCase()})`,
      status: "absurd" as const,
      readingId: reading.id,
    }));
  }
  return Object.freeze(out);
}

function readingPresuppositions(reading: ParseForestReading): readonly DiscoursePresupposition[] {
  return Object.freeze([
    ...presuppositions(reading.parse).map((item) => Object.freeze({
      trigger: item.trigger.text,
      presupposed: item.presupposed,
      status: item.status,
      readingId: reading.id,
    })),
    ...definitePresuppositions(reading),
  ]);
}

function isDenial(text: string): boolean {
  return /^(not|no|never)\b/i.test(text.trim()) || /^[!-]/.test(text.trim());
}

function commitment(reading: ParseForestReading, proof: LambekForestProof): DiscourseCommitment {
  const readingProof = proof.proofs.find((candidate) => candidate.readingId === reading.id);
  const denied = isDenial(reading.span.text);
  const basis = reading.charge === "stable"
    ? "ambiguous"
    : readingProof?.proven === false
      ? "unproved"
      : denied ? "denial" : "assertion";
  return Object.freeze({
    id: `commitment:${reading.id}`,
    proposition: reading.span.text,
    readingId: reading.id,
    charge: basis === "denial" ? "active" : basis === "assertion" ? "potential" : reading.charge,
    basis,
  });
}

function topicFromEntity(entity: DiscourseEntity): DiscourseTopic {
  return Object.freeze({
    id: `topic:${entity.label}`,
    label: entity.label,
    mentions: entity.mentions,
    charge: entity.charge,
  });
}

export function discourseStateOfForest(forest: ParseForest, proof: LambekForestProof = lambekProofOfForest(forest)): DiscourseState {
  const entities = new Map<string, DiscourseEntity>();
  const references: DiscourseReference[] = [];
  const presups: DiscoursePresupposition[] = [];
  const commitments: DiscourseCommitment[] = [];
  const repairs: DiscourseRepair[] = [];

  for (const reading of forest.readings) {
    for (const word of reading.parse.words.filter((candidate) => isPronoun(candidate) && THIRD_PERSON.has(candidate.text.toLowerCase()))) {
      const reference = resolveDynamicReference(word, reading, entities);
      references.push(reference);
      if (reference.status !== "resolved") {
        repairs.push(repair(
          reference.status === "ambiguous" ? "ambiguous-reference" : "unresolved-reference",
          reference.anaphor,
          reading.id,
          reference.status === "ambiguous" ? "stable" : "absurd",
          "dynamic reference could not settle to one antecedent",
        ));
      }
    }
    for (const word of reading.parse.words.filter(isEntityMention)) addEntity(entities, word, reading);

    for (const item of readingPresuppositions(reading)) {
      presups.push(item);
      repairs.push(repair(
        "presupposition-accommodation",
        item.trigger,
        reading.id,
        item.status,
        item.presupposed,
      ));
    }

    commitments.push(commitment(reading, proof));
    for (const obstruction of reading.obstructions) {
      repairs.push(repair("parse-obstruction", obstruction.label, reading.id, obstruction.value, obstruction.kind));
    }
    const readingProof = proof.proofs.find((candidate) => candidate.readingId === reading.id);
    if (readingProof !== undefined && !readingProof.proven) {
      repairs.push(repair("grammar-obstruction", reading.id, reading.id, readingProof.charge, "Lambek sequent not proven"));
    }
  }

  const entityList = Object.freeze([...entities.values()]);
  const state: DiscourseState = Object.freeze({
    kind: "communicating.discourse-state" as const,
    text: forest.text,
    entities: entityList,
    references: Object.freeze(references),
    presuppositions: Object.freeze(presups),
    topics: Object.freeze(entityList.map(topicFromEntity)),
    commitments: Object.freeze(commitments),
    repairs: Object.freeze(repairs),
    charge: repairs.some((item) => item.charge === "stable") ? "stable" : forest.charge,
  });
  discourseStateCarrier.assert(state, "discourse state");
  return state;
}
