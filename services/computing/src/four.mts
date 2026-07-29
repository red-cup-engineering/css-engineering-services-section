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
import {
  chargeValue,
  chargeValueName,
  type ChargeValue,
  type ChargeValueName,
} from "@lenticule-science/articulating/predicating/positing";
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
function projectCharge(charge: ChargeValue): Four {
  switch (chargeValueName(charge)) {
    case "potential": return Object.freeze({ kind: "computing.four", value: "verified", symbol: "t", verified: true, refuted: false });
    case "active": return Object.freeze({ kind: "computing.four", value: "refuted", symbol: "f", verified: false, refuted: true });
    case "absurd": return Object.freeze({ kind: "computing.four", value: "undecidable", symbol: "⊥", verified: false, refuted: false });
    case "stable": return Object.freeze({ kind: "computing.four", value: "contradictory", symbol: "⊤", verified: true, refuted: true });
  }
  throw new TypeError("unreachable canonical bilattice charge");
}

const chargeNameForFour: Readonly<Record<Four["value"], ChargeValueName>> = Object.freeze({
  verified: "potential",
  refuted: "active",
  undecidable: "absurd",
  contradictory: "stable",
});

/** The canonical charge backing an external computational FOUR readout. */
export const chargeOfFour = (value: Four): ChargeValue => chargeValue(chargeNameForFour[value.value]);
/** Project the canonical charge carrier into computing's public FOUR readout. */
export const fourOfCharge = (value: ChargeValue): Four => projectCharge(value);

/** verified (t) — a realizer exists; the predicate holds. */
export const VERIFIED: Four = fourOfCharge(chargeValue("potential"));
/** refuted (f) — the negation has a realizer; the predicate fails. */
export const REFUTED: Four = fourOfCharge(chargeValue("active"));
/** undecidable (⊥) — neither holds; the value Rice forces (e.g. divergence). */
export const UNDECIDABLE: Four = fourOfCharge(chargeValue("absurd"));
/** contradictory (⊤) — both hold; impossible in a consistent theory (a raised realizer). */
export const CONTRADICTORY: Four = fourOfCharge(chargeValue("stable"));

/** The FOUR value for a (verified, refuted) pair — the 2×2 of truth × decidability. */
export function four(verified: boolean, refuted: boolean): Four {
  return fourOfCharge(chargeValue(verified ? (refuted ? "stable" : "potential") : (refuted ? "active" : "absurd")));
}
