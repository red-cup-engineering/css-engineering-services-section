/**
 * parsing/lambek - type-logical proof carriers over charged parse forests.
 *
 * This is the second layer after parse forests: it does not search a complete
 * grammar calculus. It reads each settled forest reading as a Lambek-style
 * sequent, records lexical hypotheses and dependency-licensed proof steps, and
 * attaches the finite Lambek law witness owned by @red-cup-engineering/relating.
 */
import { carrierFrom, type ChargeValueName } from "@red-cup-engineering/relating";
import * as analysis from "@lenticule-science/articulating/predicating/positing/settling/analysis";

import type { ParseForest, ParseForestReading, ParsedArc, ParsedWord } from "./types.mjs";

export type LambekProofRule =
  | "lexical"
  | "left-residual-application"
  | "right-residual-application"
  | "sentence-introduction"
  | "obstruction";

export interface LambekHypothesis {
  readonly wordId: string;
  readonly text: string;
  readonly category: string;
  readonly charge: ChargeValueName;
}

export interface LambekProofStep {
  readonly rule: LambekProofRule;
  readonly premises: readonly string[];
  readonly conclusion: string;
  readonly charge: ChargeValueName;
  readonly evidence: string;
}

export interface LambekSequent {
  readonly antecedent: readonly string[];
  readonly succedent: string;
}

export interface LambekForestReadingProof {
  readonly kind: "communicating.lambek.reading-proof";
  readonly readingId: string;
  readonly sequent: LambekSequent;
  readonly hypotheses: readonly LambekHypothesis[];
  readonly steps: readonly LambekProofStep[];
  readonly conclusion: string;
  readonly charge: ChargeValueName;
  readonly proven: boolean;
  readonly obstructions: readonly string[];
}

export interface LambekForestProof {
  readonly kind: "communicating.lambek.forest-proof";
  readonly text: string;
  readonly proofs: readonly LambekForestReadingProof[];
  readonly charge: ChargeValueName;
  readonly proven: boolean;
  readonly laws: unknown;
}

const chargeSchema = { enum: ["absurd", "potential", "active", "stable"] } as const;

const hypothesisSchema = {
  type: "object",
  required: ["wordId", "text", "category", "charge"],
  additionalProperties: false,
  properties: {
    wordId: { type: "string", minLength: 1 },
    text: { type: "string" },
    category: { type: "string", minLength: 1 },
    charge: chargeSchema,
  },
} as const;

const stepSchema = {
  type: "object",
  required: ["rule", "premises", "conclusion", "charge", "evidence"],
  additionalProperties: false,
  properties: {
    rule: {
      enum: [
        "lexical",
        "left-residual-application",
        "right-residual-application",
        "sentence-introduction",
        "obstruction",
      ],
    },
    premises: { type: "array", items: { type: "string" } },
    conclusion: { type: "string", minLength: 1 },
    charge: chargeSchema,
    evidence: { type: "string" },
  },
} as const;

const sequentSchema = {
  type: "object",
  required: ["antecedent", "succedent"],
  additionalProperties: false,
  properties: {
    antecedent: { type: "array", items: { type: "string", minLength: 1 } },
    succedent: { type: "string", minLength: 1 },
  },
} as const;

export const lambekForestReadingProofSchema = {
  $id: "communicating/parsing/lambek-reading-proof",
  type: "object",
  required: ["kind", "readingId", "sequent", "hypotheses", "steps", "conclusion", "charge", "proven", "obstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.lambek.reading-proof" },
    readingId: { type: "string", minLength: 1 },
    sequent: sequentSchema,
    hypotheses: { type: "array", items: hypothesisSchema },
    steps: { type: "array", items: stepSchema },
    conclusion: { type: "string", minLength: 1 },
    charge: chargeSchema,
    proven: { type: "boolean" },
    obstructions: { type: "array", items: { type: "string" } },
  },
} as const;

export const lambekForestProofSchema = {
  $id: "communicating/parsing/lambek-forest-proof",
  type: "object",
  required: ["kind", "text", "proofs", "charge", "proven", "laws"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.lambek.forest-proof" },
    text: { type: "string" },
    proofs: { type: "array", items: lambekForestReadingProofSchema },
    charge: chargeSchema,
    proven: { type: "boolean" },
    laws: { type: "object", additionalProperties: true },
  },
} as const;

export const lambekForestReadingProofCarrier = carrierFrom(lambekForestReadingProofSchema);
export const lambekForestProofCarrier = carrierFrom(lambekForestProofSchema);

function lexicalCategory(word: ParsedWord, arcs: readonly ParsedArc[]): string {
  if (word.tags.includes("det")) return "NP/N";
  if (word.tags.includes("adj")) return "N/N";
  if (word.tags.includes("prep")) return "(NP\\NP)/NP";
  if (word.tags.includes("adv")) return "(NP\\S)\\(NP\\S)";
  if (word.tags.includes("aux")) return "(NP\\S)/(NP\\S)";
  if (word.tags.includes("verb")) {
    const hasObject = arcs.some((arc) => arc.head === word.id && arc.rel === "dobj" && arc.value !== "absurd");
    const hasSubject = arcs.some((arc) => arc.head === word.id && arc.rel === "nsubj" && arc.value !== "absurd");
    if (hasObject) return "(NP\\S)/NP";
    if (hasSubject) return "NP\\S";
    return "S";
  }
  if (word.tags.includes("noun") || word.tags.includes("pron")) return "NP";
  return "N";
}

function hypothesisCharge(word: ParsedWord): ChargeValueName {
  return word.connected === "void" ? "absurd" : word.connected === "ambiguous" ? "stable" : "potential";
}

function hypotheses(reading: ParseForestReading): readonly LambekHypothesis[] {
  return Object.freeze(reading.parse.words.map((word) => Object.freeze({
    wordId: word.id,
    text: word.text,
    category: lexicalCategory(word, reading.parse.arcs),
    charge: hypothesisCharge(word),
  })));
}

function arcStep(arc: ParsedArc): LambekProofStep | null {
  if (arc.value === "absurd") return null;
  switch (arc.rel) {
    case "dobj":
    case "pobj":
      return Object.freeze({
        rule: "right-residual-application" as const,
        premises: Object.freeze([arc.head, arc.dependent]),
        conclusion: arc.rel === "dobj" ? "NP\\S" : "NP\\NP",
        charge: arc.value,
        evidence: arc.rel,
      });
    case "nsubj":
      return Object.freeze({
        rule: "left-residual-application" as const,
        premises: Object.freeze([arc.dependent, arc.head]),
        conclusion: "S",
        charge: arc.value,
        evidence: arc.rel,
      });
    case "det":
    case "amod":
    case "advmod":
    case "prep":
    case "obl":
    case "case":
    case "ccomp":
    case "mark":
    case "discourse":
      return Object.freeze({
        rule: "right-residual-application" as const,
        premises: Object.freeze([arc.head, arc.dependent]),
        conclusion: arc.rel === "advmod" ? "NP\\S" : "NP",
        charge: arc.value,
        evidence: arc.rel,
      });
    default:
      return null;
  }
}

function readingProof(reading: ParseForestReading): LambekForestReadingProof {
  const hs = hypotheses(reading);
  const lexicalSteps: readonly LambekProofStep[] = Object.freeze(hs.map((hypothesis) => Object.freeze({
    rule: "lexical" as const,
    premises: Object.freeze([hypothesis.wordId]),
    conclusion: hypothesis.category,
    charge: hypothesis.charge,
    evidence: hypothesis.text,
  })));
  const dependencySteps = Object.freeze(reading.parse.arcs
    .map(arcStep)
    .filter((step): step is LambekProofStep => step !== null));
  const obstructionSteps: readonly LambekProofStep[] = Object.freeze(reading.obstructions.map((obstruction) => Object.freeze({
    rule: "obstruction" as const,
    premises: Object.freeze([obstruction.on]),
    conclusion: obstruction.label,
    charge: obstruction.value,
    evidence: obstruction.kind,
  })));
  const hasSentence = dependencySteps.some((step) => step.conclusion === "S");
  const proven = reading.glued && reading.complete && hasSentence;
  const proof: LambekForestReadingProof = Object.freeze({
    kind: "communicating.lambek.reading-proof" as const,
    readingId: reading.id,
    sequent: Object.freeze({
      antecedent: Object.freeze(hs.map((hypothesis) => hypothesis.category)),
      succedent: "S",
    }),
    hypotheses: hs,
    steps: Object.freeze([
      ...lexicalSteps,
      ...dependencySteps,
      ...(proven ? [Object.freeze({
        rule: "sentence-introduction" as const,
        premises: Object.freeze(dependencySteps.filter((step) => step.conclusion === "S").flatMap((step) => step.premises)),
        conclusion: "S",
        charge: "potential" as const,
        evidence: "reading.glued.complete",
      })] : []),
      ...obstructionSteps,
    ]),
    conclusion: proven ? "S" : "unproved",
    charge: proven ? "potential" : reading.charge,
    proven,
    obstructions: Object.freeze(reading.obstructions.map((obstruction) => `${obstruction.kind}:${obstruction.label}:${obstruction.on}`)),
  });
  lambekForestReadingProofCarrier.assert(proof, "lambek reading proof");
  return proof;
}

function lawsWitness(): unknown {
  return analysis.lambek.laws(analysis.lambek.booleanCommutativeLambekAlgebra);
}

export function lambekProofOfForest(forest: ParseForest): LambekForestProof {
  const proofs = Object.freeze(forest.readings.map(readingProof));
  const proof: LambekForestProof = Object.freeze({
    kind: "communicating.lambek.forest-proof" as const,
    text: forest.text,
    proofs,
    charge: proofs.every((reading) => reading.proven) ? "potential" : forest.charge,
    proven: proofs.length > 0 && proofs.every((reading) => reading.proven),
    laws: lawsWitness(),
  });
  lambekForestProofCarrier.assert(proof, "lambek forest proof");
  return proof;
}
