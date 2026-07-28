import { carrierFrom } from "../kernel/carrier.mjs";

const idSchema = { type: "string", minLength: 1 } as const;
const stringArraySchema = { type: "array", items: idSchema } as const;

const causalEventSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: idSchema,
    label: { type: "string" },
    mediaType: { type: "string" },
    witness: {},
  },
} as const;

const causalLinkSchema = {
  type: "object",
  required: ["from", "to", "relation"],
  additionalProperties: false,
  properties: {
    from: idSchema,
    to: idSchema,
    relation: { enum: ["precedes", "causes", "commits-before", "builds-before", "observed-before"] },
  },
} as const;

export const CausalSetSchema = {
  $id: "relating/causal-set",
  title: "CausalSet",
  description: "A finite Lorentzian causal set carrier for commit/build partial orders.",
  type: "object",
  required: ["kind", "events", "links"],
  additionalProperties: false,
  properties: {
    kind: { const: "relating.causal-set" },
    events: { type: "array", items: causalEventSchema },
    links: { type: "array", items: causalLinkSchema },
    linearizations: { type: "array", items: stringArraySchema },
    closedTimelikeObstructions: { type: "array", items: stringArraySchema },
    h1: { type: "integer", minimum: 0 },
  },
} as const;

export const causalSetCarrier = carrierFrom(CausalSetSchema);
