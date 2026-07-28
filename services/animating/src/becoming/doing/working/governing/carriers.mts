/**
 * carriers — the governing-stage carrier (stage 4, the terminus) and the interior
 * `agent` carrier (the hidden bulk glued from the three boundary faces).
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { faceValueSchema } from "../../../../carriers.mjs";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;
const chargeValueNameSchema = { enum: ["absurd", "potential", "active", "stable"] } as const;
const closureKindSchema = { enum: ["inquiry", "procedure", "derivation", "process"] } as const;
const errorClassSchema = { enum: ["MissingInput", "ValidationFailure", "UnexpectedState", "SkillNotFound", "Unresolvable"] } as const;

export const governingSchema = {
  $id: "animating/becoming/doing/working/governing",
  title: "Governing",
  description:
    "Stage 4 of the agency descent, generated WITHIN working — the terminus: the AGENCY reading of relating's `settle` at the FINITE regime. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "settled", "glued", "cohomologyRank", "cells"],
  properties: {
    kind: { const: "animating.becoming.doing.working.governing" },
    regime: { const: "finite" },
    stage: { const: "settle" },
    face: { const: "individual" },
    epistemic: { const: "knowledge" },
    settled: { const: true },
    glued: { type: "boolean" },
    cohomologyRank: nonnegativeIntegerSchema,
    cells: nonnegativeIntegerSchema,
  },
} as const;

export type Governing = FromSchema<typeof governingSchema>;
export const governingCarrier = carrierFrom(governingSchema);

const governingValueSchema = {
  type: "object",
  additionalProperties: false,
  required: governingSchema.required,
  properties: governingSchema.properties,
} as const;

const perceptionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "recv", "observe", "held", "contested"],
  properties: {
    kind: { const: "animating.agent.perception" },
    recv: chargeValueNameSchema,
    observe: chargeValueNameSchema,
    held: nonnegativeIntegerSchema,
    contested: nonnegativeIntegerSchema,
  },
} as const;

const actionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "send", "actuate", "affordances"],
  properties: {
    kind: { const: "animating.agent.action" },
    send: chargeValueNameSchema,
    actuate: chargeValueNameSchema,
    affordances: nonnegativeIntegerSchema,
  },
} as const;

const stanceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "lean"],
  properties: {
    kind: { const: "animating.agent.stance" },
    lean: chargeValueNameSchema,
  },
} as const;

const cognitionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "reflects"],
  properties: {
    kind: { const: "animating.agent.cognition" },
    regime: { enum: ["strict-finite", "scott-continuous", "aperiodic"] },
    reflects: { type: "boolean" },
  },
} as const;

const coherenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "balanced", "dissonance", "ties"],
  properties: {
    kind: { const: "animating.agent.coherence" },
    balanced: { type: "boolean" },
    dissonance: nonnegativeIntegerSchema,
    ties: nonnegativeIntegerSchema,
  },
} as const;

const goalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "predicate", "charge", "satisfied", "held"],
  properties: {
    kind: { const: "animating.agent.goal" },
    predicate: { type: "string" },
    charge: chargeValueNameSchema,
    satisfied: { type: "boolean" },
    held: chargeValueNameSchema,
  },
} as const;

const handednessSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "recv", "send", "actuate", "observe"],
  properties: {
    kind: { const: "animating.agent.handedness" },
    recv: chargeValueNameSchema,
    send: chargeValueNameSchema,
    actuate: chargeValueNameSchema,
    observe: chargeValueNameSchema,
  },
} as const;

const characterSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "signature", "behavioralSpace", "constrains", "coherent", "inCharacter"],
  properties: {
    kind: { const: "animating.agent.character" },
    signature: chargeValueNameSchema,
    behavioralSpace: nonnegativeIntegerSchema,
    constrains: { type: "boolean" },
    coherent: { type: "boolean" },
    inCharacter: { type: "boolean" },
  },
} as const;

const workSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "meaningClosed", "executionClosed", "closureKind", "determination"],
  properties: {
    kind: { const: "animating.agent.work" },
    meaningClosed: { type: "boolean" },
    executionClosed: { type: "boolean" },
    closureKind: closureKindSchema,
    determination: chargeValueNameSchema,
  },
} as const;

export const agentSchema = {
  $id: "animating/becoming/doing/working/governing/agent",
  title: "Agent",
  description:
    "The interior agent — the HIDDEN INTERIOR BULK of animating's holographic boundary, the global section glued from three boundary faces. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind", "identity", "loop", "faces", "glued", "perception", "action", "stance",
    "cognition", "coherence", "goal", "governing", "handedness", "settledBelow",
    "openAbove", "milieu", "character", "work",
  ],
  properties: {
    kind: { const: "animating.agent" },
    identity: { type: "string" },
    loop: { const: "perceive->act" },
    faces: { type: "array", items: faceValueSchema },
    glued: { type: "boolean" },
    perception: perceptionSchema,
    action: actionSchema,
    stance: stanceSchema,
    cognition: cognitionSchema,
    coherence: coherenceSchema,
    goal: goalSchema,
    governing: governingValueSchema,
    handedness: handednessSchema,
    settledBelow: { const: true },
    openAbove: { const: true },
    milieu: nonnegativeIntegerSchema,
    character: characterSchema,
    work: workSchema,
  },
} as const;

export type Agent = FromSchema<typeof agentSchema>;
export type Goal = Agent["goal"];
export const agentCarrier = carrierFrom(agentSchema);

export const skillSchema = {
  $id: "animating/becoming/doing/working/governing/skill",
  title: "Skill",
  description:
    "A typed invocable unit of skillful work — the documented, repeatable method for one type of work. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "closureKind", "meaningClosed", "executionClosed", "determination", "codomain"],
  properties: {
    kind: { const: "animating.skill" },
    name: { type: "string" },
    closureKind: closureKindSchema,
    meaningClosed: { type: "boolean" },
    executionClosed: { type: "boolean" },
    determination: chargeValueNameSchema,
    codomain: { type: "string" },
  },
} as const;

export type Skill = FromSchema<typeof skillSchema>;
export const skillCarrier = carrierFrom(skillSchema);

export const skillResultSchema = {
  $id: "animating/becoming/doing/working/governing/skill-result",
  title: "SkillResult",
  description:
    "The complete output of any skill invocation: a Success or a structured SkillError. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "ok", "charge"],
  properties: {
    kind: { const: "animating.skill-result" },
    ok: { type: "boolean" },
    charge: chargeValueNameSchema,
    output: true,
    error: {
      type: "object",
      additionalProperties: false,
      required: ["errorClass", "message", "context"],
      properties: {
        errorClass: errorClassSchema,
        message: { type: "string" },
        context: { type: "string" },
        recoveryHint: { type: "string" },
      },
    },
  },
} as const;

export type SkillResult = FromSchema<typeof skillResultSchema>;
export const skillResultCarrier = carrierFrom(skillResultSchema);
