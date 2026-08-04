import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const CommonGroundBasisSchema = {
  enum: [
    "perceptual-co-presence",
    "prior-discourse",
    "community-membership",
    "cultural-knowledge",
    "accommodation",
  ],
} as const;

export type CommonGroundBasis = FromSchema<typeof CommonGroundBasisSchema>;

export const commonGroundPropositionSchema = {
  $id: "communicating/speaking/listening/grounding/proposition",
  title: "CommonGroundProposition",
  description: "A proposition treated as shared in common ground, with its warrant.",
  type: "object",
  required: ["kind", "proposition", "basis"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.listening.grounding.proposition" },
    proposition: {},
    basis: CommonGroundBasisSchema,
  },
} as const;
export const commonGroundPropositionCarrier = carrierFrom(commonGroundPropositionSchema);

export type CommonGroundProposition<Proposition = unknown> =
  Omit<FromSchema<typeof commonGroundPropositionSchema>, "proposition"> & {
    readonly proposition: Proposition;
  };

export const commonGroundSchema = {
  $id: "communicating/speaking/listening/grounding/common-ground",
  title: "CommonGroundCarrier",
  description: "A finite common-ground state: propositions participants treat as shared.",
  type: "object",
  required: ["kind", "propositions"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.listening.grounding.commonGround" },
    propositions: { type: "array", items: {} },
  },
} as const;
export const commonGroundCarrier = carrierFrom(commonGroundSchema);

export type CommonGroundCarrier<Proposition = unknown> =
  Omit<FromSchema<typeof commonGroundSchema>, "propositions"> & {
    readonly propositions: readonly CommonGroundProposition<Proposition>[];
  };

export const commonGroundUpdateSchema = {
  $id: "communicating/speaking/listening/grounding/update",
  title: "CommonGroundUpdate",
  description: "A before/after common-ground morphism.",
  type: "object",
  required: ["kind", "before", "after", "proposition", "mode"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.listening.grounding.update" },
    before: {},
    after: {},
    proposition: {},
    mode: { enum: ["assertion", "accommodation", "challenge"] },
  },
} as const;
export const commonGroundUpdateCarrier = carrierFrom(commonGroundUpdateSchema);

export type CommonGroundUpdate<Proposition = unknown> =
  Omit<FromSchema<typeof commonGroundUpdateSchema>, "before" | "after" | "proposition"> & {
    readonly before: CommonGroundCarrier<Proposition>;
    readonly after: CommonGroundCarrier<Proposition>;
    readonly proposition: CommonGroundProposition<Proposition>;
  };
