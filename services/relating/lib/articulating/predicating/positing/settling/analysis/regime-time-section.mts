/**
 * analysis/regime-time-section - finite causal past-count time sections.
 *
 * Executable shadow for `RelMath.Lorentzian.RegimeTimeSection`: the global
 * time function `t(x) = |past(x)|`, strictly increasing along finite settled
 * causal orders, with the corpus diamond section `(0,1,1,3)`.
 */
import {
  diamondCausalSet,
  settleCausalSet,
  type CausalSetCarrier,
  type CausalSettlementObstruction,
} from "./causal.mjs";

export interface RegimeTimeSectionReceipt {
  readonly kind: "lorentzian.regimeTimeSection:witness";
  readonly profile: Readonly<Record<string, number>>;
  readonly strictMonotone: true;
  readonly diamondTimeSection: Readonly<Record<"a" | "b" | "c" | "d", number>>;
  readonly diamondStrictPairs: readonly string[];
  readonly ordinalBound: "finite-sub-omega";
  readonly stableCausalityBoundary: "aperiodic biconditional remains frontier";
}

function hasLink(carrier: CausalSetCarrier, from: string, to: string): boolean {
  return carrier.links.some((link) => link.from === from && link.to === to);
}

function isObstruction(value: unknown): value is CausalSettlementObstruction {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: string }).kind === "lorentzian.causalSettle-obstruction";
}

function settledCarrier(carrier: CausalSetCarrier): CausalSetCarrier | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze({ kind: "lorentzian.causalSet" as const, events: settled.events, links: settled.closure });
}

/** The discrete global time function `t(x) = |past(x)|`. */
export function timeSection(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  return settled.events.filter((candidate) => hasLink(settled, candidate, event)).length;
}

/** The full finite time profile, event by event. */
export function timeProfile(carrier: CausalSetCarrier): Readonly<Record<string, number>> | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  return Object.freeze(Object.fromEntries(settled.events.map((event) => [event, timeSection(settled, event) as number])));
}

/** Check `x < y` in the causal order implies `t(x) < t(y)`. */
export function timeSectionStrictMonotone(carrier: CausalSetCarrier): boolean | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  const profile = timeProfile(settled) as Readonly<Record<string, number>>;
  return settled.links.every((link) => (profile[link.from] ?? 0) < (profile[link.to] ?? 0));
}

/** Bundle the finite global time-section witness. */
export function regimeTimeSectionReceipt(carrier: CausalSetCarrier = diamondCausalSet): RegimeTimeSectionReceipt | CausalSettlementObstruction {
  const profile = timeProfile(carrier);
  if (isObstruction(profile)) return profile;
  const strict = timeSectionStrictMonotone(carrier);
  if (isObstruction(strict)) return strict;
  if (!strict) throw new TypeError("regimeTimeSection.receipt: expected a strictly monotone finite causal time section");
  const diamondProfile = timeProfile(diamondCausalSet) as Readonly<Record<"a" | "b" | "c" | "d", number>>;
  const diamondStrictPairs = Object.freeze(diamondCausalSet.links
    .filter((link) => diamondProfile[link.from as keyof typeof diamondProfile] < diamondProfile[link.to as keyof typeof diamondProfile])
    .map((link) => `${link.from}<${link.to}`));

  return Object.freeze({
    kind: "lorentzian.regimeTimeSection:witness" as const,
    profile,
    strictMonotone: true as const,
    diamondTimeSection: diamondProfile,
    diamondStrictPairs,
    ordinalBound: "finite-sub-omega" as const,
    stableCausalityBoundary: "aperiodic biconditional remains frontier" as const,
  });
}
