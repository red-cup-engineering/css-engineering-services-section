/**
 * capability-request — a computing-local capability gate, declared as a plain JSON-Schema literal (no
 * TypeBox, no codegen, no Ajv). A presented finite set of capability coordinates checked against a
 * finite requirement set. Authority, office, and delegation are deliberately NOT here — those are
 * organizing readings. The `as const` schema is the single source: `FromSchema` infers the type and
 * `carrierFrom` builds the structural validator + registers the `$id`.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const capabilityRequestSchema = {
  $id: "computing/capability-request",
  title: "CapabilityRequest",
  type: "object",
  required: ["kind", "capabilities", "requires"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.capability-request" },
    capabilities: { type: "array", items: { type: "string", minLength: 1 } },
    requires: { type: "array", items: { type: "string", minLength: 1 } },
  },
} as const;

/** A computing-local capability gate — its type INFERRED from `capabilityRequestSchema`. */
export type CapabilityRequest = FromSchema<typeof capabilityRequestSchema>;

/** The registered carrier (validate/assert over the same literal). */
export const capabilityRequestCarrier = carrierFrom(capabilityRequestSchema);
