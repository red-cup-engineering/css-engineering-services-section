/**
 * carriers — the prehension boundary (request) and the constitutive prehension carrier.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import type { ArticulationCell, Cell, UtteranceCarrier } from "@red-cup-engineering/relating";

const looseObjectSlotSchema = { type: "object", additionalProperties: true } as const;

export const prehensionRequestSchema = {
  $id: "animating/becoming/prehending/prehension-request",
  title: "PrehensionRequest",
  description:
    "The admission boundary for an animating prehension: an agentive subject grasps a datum under a subjective form. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "subject", "datum", "subjectiveForm"],
  properties: {
    kind: { const: "animating.agent.prehension-request" },
    subject: true,
    datum: true,
    subjectiveForm: true,
  },
} as const;

export type PrehensionRequest = FromSchema<typeof prehensionRequestSchema>;
export const prehensionRequestCarrier = carrierFrom(prehensionRequestSchema);

export const prehensionSchema = {
  $id: "animating/becoming/prehending/prehension",
  title: "Prehension",
  description:
    "A constitutive animating prehension: a subject term grasps a datum term under a subjective-form predicate. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "subject", "datum", "subjectiveForm", "cell", "utterance", "articulation", "cells", "utterances"],
  properties: {
    kind: { const: "animating.agent.prehension" },
    subject: looseObjectSlotSchema,
    datum: looseObjectSlotSchema,
    subjectiveForm: looseObjectSlotSchema,
    cell: looseObjectSlotSchema,
    utterance: looseObjectSlotSchema,
    articulation: looseObjectSlotSchema,
    cells: { type: "array", items: looseObjectSlotSchema },
    utterances: { type: "array", items: looseObjectSlotSchema },
  },
} as const;

export interface Prehension {
  readonly kind: "animating.agent.prehension";
  readonly subject: UtteranceCarrier["token"];
  readonly datum: UtteranceCarrier["token"];
  readonly subjectiveForm: Cell["predicate"];
  readonly cell: Cell;
  readonly utterance: UtteranceCarrier;
  readonly articulation: ArticulationCell;
  readonly cells: readonly Cell[];
  readonly utterances: readonly UtteranceCarrier[];
}

export const prehensionCarrier = carrierFrom(prehensionSchema);
