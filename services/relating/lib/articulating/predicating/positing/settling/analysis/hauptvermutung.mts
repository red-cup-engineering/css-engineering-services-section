/**
 * analysis/hauptvermutung - finite spacetime fingerprints.
 *
 * Executable shadow for `RelMath.Lorentzian.Hauptvermutung`: the green,
 * order-intrinsic fingerprint `(relations, action)` computed from a finite
 * causal order alone. Continuum uniqueness remains outside this Node surface.
 */
import {
  apexCount,
  bdAction,
  diamondCausalSet,
  settleCausalSet,
  type CausalSetCarrier,
  type CausalSettlementObstruction,
} from "./causal.mjs";

export interface SpacetimeFingerprint {
  readonly kind: "lorentzian.spacetimeFingerprint";
  readonly relations: number;
  readonly action: number;
}

export interface HauptvermutungReceipt {
  readonly kind: "lorentzian.hauptvermutungFingerprint:witness";
  readonly fingerprint: SpacetimeFingerprint;
  readonly diamondFingerprint: SpacetimeFingerprint;
  readonly orderIntrinsic: true;
  readonly manifoldFree: true;
  readonly continuumUniquenessBoundary: "faithful embedding uniqueness remains frontier";
}

function isObstruction(value: unknown): value is CausalSettlementObstruction {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: string }).kind === "lorentzian.causalSettle-obstruction";
}

/** Read the order-intrinsic spacetime fingerprint `(relations, action)`. */
export function fingerprint(carrier: CausalSetCarrier): SpacetimeFingerprint | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = Object.freeze({ kind: "lorentzian.causalSet" as const, events: settled.events, links: settled.closure });
  const action = bdAction(normalized);
  if (isObstruction(action)) return action;
  return Object.freeze({
    kind: "lorentzian.spacetimeFingerprint" as const,
    relations: apexCount(settled.events, settled.closure),
    action,
  });
}

/** Bundle the finite, testable content of the Hauptvermutung module. */
export function hauptvermutungReceipt(carrier: CausalSetCarrier = diamondCausalSet): HauptvermutungReceipt | CausalSettlementObstruction {
  const value = fingerprint(carrier);
  if (isObstruction(value)) return value;
  const diamond = fingerprint(diamondCausalSet) as SpacetimeFingerprint;
  if (diamond.relations !== 5 || diamond.action !== 1) {
    throw new TypeError("hauptvermutung.receipt: diamond fingerprint law failed");
  }
  return Object.freeze({
    kind: "lorentzian.hauptvermutungFingerprint:witness" as const,
    fingerprint: value,
    diamondFingerprint: diamond,
    orderIntrinsic: true as const,
    manifoldFree: true as const,
    continuumUniquenessBoundary: "faithful embedding uniqueness remains frontier" as const,
  });
}
