/**
 * four — FOUR, the external settled-truth structure of a computational predicate.
 *
 * FOUR = 2×2 (truth × decidability-of-truth) is the image of Ω_Eff under the
 * double-negation nucleus, internal to the effective topos. Its four values are the
 * bilattice points: verified (t), refuted (f), undecidable (⊥ — the value Rice's
 * theorem forces for every non-trivial behavioural predicate), contradictory (⊤).
 * This is relating's bilattice FOUR read computationally; the correspondence to
 * relating's charge values is potential↔t, active↔f, absurd↔⊥, stable↔⊤.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

/**
 * The `computing/four` carrier — a plain JSON-Schema literal (no TypeBox, no codegen, no Ajv). The
 * `as const` schema is the single source: `FromSchema` infers the type at compile time, and relating's
 * `carrierFrom` registers the `$id` and builds the structural validator from the SAME literal.
 */
export const fourSchema = {
  $id: "computing/four",
  title: "Four",
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
} as const;

/** FOUR, the external settled-truth structure — its type INFERRED from `fourSchema`, never generated. */
export type Four = FromSchema<typeof fourSchema>;

/** The registered carrier (validate/assert over the same literal). */
export const fourCarrier = carrierFrom(fourSchema);

/** verified (t) — a realizer exists; the predicate holds. */
export const VERIFIED: Four = Object.freeze({ kind: "computing.four", value: "verified", symbol: "t", verified: true, refuted: false });
/** refuted (f) — the negation has a realizer; the predicate fails. */
export const REFUTED: Four = Object.freeze({ kind: "computing.four", value: "refuted", symbol: "f", verified: false, refuted: true });
/** undecidable (⊥) — neither holds; the value Rice forces (e.g. divergence). */
export const UNDECIDABLE: Four = Object.freeze({ kind: "computing.four", value: "undecidable", symbol: "⊥", verified: false, refuted: false });
/** contradictory (⊤) — both hold; impossible in a consistent theory (a raised realizer). */
export const CONTRADICTORY: Four = Object.freeze({ kind: "computing.four", value: "contradictory", symbol: "⊤", verified: true, refuted: true });

/** The FOUR value for a (verified, refuted) pair — the 2×2 of truth × decidability. */
export function four(verified: boolean, refuted: boolean): Four {
  if (verified && refuted) return CONTRADICTORY;
  if (verified) return VERIFIED;
  if (refuted) return REFUTED;
  return UNDECIDABLE;
}
