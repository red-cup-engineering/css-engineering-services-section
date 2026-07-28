/**
 * furtherance â€” does the witnessed effect move toward the declared telos?
 *
 * The judgment is a charge with two-sided evidence (the floor's bilattice
 * charge, evidence-for on the truth side, evidence-against on the falsity
 * side), never a boolean:
 *
 *   potential â€” witnessed movement aligned with the telos, none against
 *   active    â€” witnessed movement against the telos, none aligned
 *   stable    â€” movement both ways: a held contradiction, kept with receipts
 *   absurd    â€” no witnessed movement on the telos target at all
 *
 * Movement is computed exactly: the effect trace folds into a demand
 * charge over the telos target's term space, and each target term's
 * realized sign is compared with its intended sign.
 */
import { carrierFrom, carrierToTerm, charge, chargeValue, mark, type ChargeCarrier, type ChargeValueName, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, type JsonValue } from "@red-cup-engineering/relating/writing";
import {
  demandAt,
  demandCharge,
  encodeDemandCharge,
  demandEntry,
  witnessDemand,
  type DemandChargeCarrier,
} from "../topology/demand.mjs";
import { PropagandaObjectSchema, encodePropagandaObject, type EffectWitness, type PropagandaObjectCarrier } from "./propaganda-topology.mjs";

export type { ChargeCarrier, ChargeValueName };

/** Fold an effect trace into a demand charge: every witnessed response is
 *  a demand entry on its term. This is the demand loop's wire â€” witnessed
 *  views move the demand charge that feeds the next assignment. */
export function effectsAsDemand(
  effects: readonly EffectWitness[],
  space: readonly string[] = [],
): DemandChargeCarrier {
  let folded = demandCharge(space);
  for (const witness of effects) {
    folded = witnessDemand(folded, demandEntry(witness.term, witness.magnitude, witness.evidence));
  }
  return folded;
}

const sign = (value: bigint): -1 | 0 | 1 => (value > 0n ? 1 : value < 0n ? -1 : 0);

const DecimalIntegerSchema = { pattern: "^-?[0-9]+$", type: "string" } as const;

const NestedDemandEntrySchema = { title: "DemandEntry", additionalProperties: false, type: "object", required: ["kind", "term", "value", "evidence"], properties: { kind: { const: "producing-content.demand.entry" }, term: { minLength: 1, type: "string" }, value: DecimalIntegerSchema, evidence: { type: "array", items: {} } } } as const;

const NestedDemandChargeSchema = { title: "DemandCharge", additionalProperties: false, type: "object", required: ["kind", "space", "entries"], properties: { kind: { const: "producing-content.demand.charge" }, space: { type: "array", items: { minLength: 1, type: "string" } }, entries: { type: "array", items: NestedDemandEntrySchema } } } as const;

/**
 * The furtherance verdict for a propaganda object: pairs the object with a
 * bilattice `charge` whose evidence is [witnesses-for-movement-toward-telos,
 * witnesses-against] and with the exact realized `movement` demand charge over
 * the telos target space (widened by any off-target effect terms).
 */
export interface FurtheranceJudgment {
  readonly kind: "producing-content.propaganda.furtherance.judgment";
  readonly object: PropagandaObjectCarrier;
  /** The verdict: a bilattice charge whose evidence is
   *  [witnesses-for-movement-toward, witnesses-against]. */
  readonly charge: ChargeCarrier;
  /** The realized movement, exact, over the telos target space (widened by
   *  any effect terms that landed off-target â€” they are kept, not dropped). */
  readonly movement: DemandChargeCarrier;
}

export const FurtheranceJudgmentSchema = { $id: "producing-content/propaganda/furtherance-judgment", title: "FurtheranceJudgment", additionalProperties: false, type: "object", required: ["kind", "object", "charge", "movement"], properties: { kind: { const: "producing-content.propaganda.furtherance.judgment" }, object: PropagandaObjectSchema, charge: {}, movement: NestedDemandChargeSchema } } as const;

export type FurtheranceJudgmentJsonCarrier = FromSchema<typeof FurtheranceJudgmentSchema>;

export const furtheranceJudgmentCarrier = carrierFrom(FurtheranceJudgmentSchema);

/** Judge furtherance: for each term the telos intends to move, compare the
 *  realized movement's sign against the intended sign. Aligned witnesses
 *  are evidence-for; opposed witnesses are evidence-against; a target term
 *  nobody moved contributes nothing. The result is a value with evidence â€”
 *  conflict settles to `stable` and keeps its receipts. */
export function furtherance(object: PropagandaObjectCarrier): FurtheranceJudgment {
  const target = object.telos.target;
  const movement = effectsAsDemand(object.effects, target.space);

  const evidenceFor: EffectWitness[] = [];
  const evidenceAgainst: EffectWitness[] = [];
  for (const term of target.space) {
    const intended = sign(demandAt(target, [term]));
    if (intended === 0) continue;
    const realized = sign(demandAt(movement, [term]));
    if (realized === 0) continue;
    const witnesses = object.effects.filter((witness) => witness.term === term);
    if (realized === intended) evidenceFor.push(...witnesses);
    else evidenceAgainst.push(...witnesses);
  }

  const name: ChargeValueName =
    evidenceFor.length > 0 && evidenceAgainst.length > 0 ? "stable"
      : evidenceFor.length > 0 ? "potential"
        : evidenceAgainst.length > 0 ? "active"
          : "absurd";

  return Object.freeze({
    kind: "producing-content.propaganda.furtherance.judgment" as const,
    object,
    charge: charge(chargeValue(name), [
      Object.freeze(evidenceFor.map((witness) => mark(witness))),
      Object.freeze(evidenceAgainst.map((witness) => mark(witness))),
    ]),
    movement,
  });
}

function toJsonValue(value: unknown): JsonValue {
  if (typeof value === "bigint") return value.toString();
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, toJsonValue(child)]));
  }
  return String(value);
}

export function encodeFurtheranceJudgment(judgment: FurtheranceJudgment): FurtheranceJudgmentJsonCarrier {
  return furtheranceJudgmentCarrier.assert({
    kind: "producing-content.propaganda.furtherance.judgment" as const,
    object: encodePropagandaObject(judgment.object),
    charge: toJsonValue(judgment.charge),
    movement: encodeDemandCharge(judgment.movement),
  }, "furtherance judgment");
}

export function furtheranceJudgmentTerm(judgment: FurtheranceJudgment): Tm {
  return carrierToTerm(jsonResource(encodeFurtheranceJudgment(judgment), "furtherance judgment"));
}
