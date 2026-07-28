/**
 * computation — compute's codomain carrier, declared as a plain JSON-Schema literal (no TypeBox, no
 * codegen, no Ajv). The `as const` schema is the single source: `FromSchema` infers the type and
 * `carrierFrom` builds the structural validator + registers the `$id`. This carrier exercises BOTH
 * `$ref` cases: a cross-package `$ref` to the @red-cup-engineering/animating agent (→ a loose `unknown` slot at the
 * type level; validated by delegating to the registered agent carrier at runtime) and a LOCAL
 * `#/$defs/Four` (→ the resolved FOUR shape, both at type and runtime). "computation = settling": the
 * carrier embeds the settled agent and reads its FOUR truth.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const computationSchema = {
  $id: "computing/computation",
  title: "Computation",
  type: "object",
  required: ["kind", "agent", "members", "halted", "steps", "standing", "aggregate"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.computation" },
    agent: { $ref: "animating/becoming/doing/working/governing/agent" },
    members: { type: "integer", minimum: 1 },
    halted: { type: "boolean" },
    steps: { type: "integer", minimum: 0 },
    standing: { $ref: "#/$defs/Four" },
    aggregate: { $ref: "#/$defs/Four" },
  },
  $defs: {
    Four: {
      type: "object",
      required: ["kind", "value", "symbol", "verified", "refuted"],
      additionalProperties: false,
      properties: {
        kind: { const: "computing.four" },
        value: { enum: ["verified", "refuted", "undecidable", "contradictory"] },
        symbol: { enum: ["t", "f", "⊥", "⊤"] },
        verified: { type: "boolean" },
        refuted: { type: "boolean" },
      },
    },
  },
} as const;

/** A computation read off a SETTLED AGENT — its type INFERRED from `computationSchema`. */
export type Computation = FromSchema<typeof computationSchema>;

/** The registered carrier (validate/assert; cross-`$ref` delegates to the agent carrier, local
 *  `#/$defs/Four` resolves in place). */
export const computationCarrier = carrierFrom(computationSchema);
