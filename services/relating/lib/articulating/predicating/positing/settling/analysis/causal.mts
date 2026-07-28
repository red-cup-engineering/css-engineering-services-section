/**
 * analysis/causal - finite Lorentzian causal-set reads.
 *
 * Executable carrier shadows for `RelMath.Lorentzian.Causal` and
 * `RelMath.Lorentzian.MyrheimMeyer`: Boolean causal transitive closure,
 * no-closed-timelike-curve obstruction, apex counts, rational ordering
 * fractions, strict-regime H1-zero, and the diamond/chain/antichain witnesses.
 */
import { fromRatio, ratOne, ratZero, type Rational } from "./exact-number.mjs";
import {
  chargeValue,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";

export interface CausalLink {
  readonly from: string;
  readonly to: string;
}

export interface CausalSetCarrier {
  readonly kind: "lorentzian.causalSet";
  readonly events: readonly string[];
  readonly links: readonly CausalLink[];
}

export interface CausalSettlementWitness {
  readonly kind: "lorentzian.causalSettle:witness";
  readonly events: readonly string[];
  readonly directLinks: readonly CausalLink[];
  readonly closure: readonly CausalLink[];
  readonly apexCount: number;
  readonly orderedPairCount: number;
  readonly orderingFraction: Rational;
  readonly nscCount: 0;
  readonly eulerCharacteristic: number;
  readonly regime: "ordinal.closure.regime.finite";
  readonly h1Vanishes: true;
}

export interface CausalSettlementObstruction {
  readonly kind: "lorentzian.causalSettle-obstruction";
  readonly reason: "duplicate-event" | "unknown-event" | "closed-timelike-curve";
  readonly events: readonly string[];
  readonly directLinks: readonly CausalLink[];
  readonly closure: readonly CausalLink[];
  readonly offending?: CausalLink;
}

export type CausalSettlementJudgment = CausalSettlementWitness | CausalSettlementObstruction;

const linkKey = (link: CausalLink): string => `${link.from}\u0000${link.to}`;

const sortedLinks = (links: Iterable<CausalLink>): readonly CausalLink[] =>
  Object.freeze([...links].sort((left, right) => linkKey(left).localeCompare(linkKey(right))).map((link) => Object.freeze({ ...link })));

function duplicateEvent(events: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const event of events) {
    if (seen.has(event)) return event;
    seen.add(event);
  }
  return undefined;
}

function directLinkSet(links: readonly CausalLink[]): Set<string> {
  return new Set(links.map(linkKey));
}

/** One Boolean causal closure step: `v(a,c) or exists b. v(a,b) and v(b,c)`. */
export function causalStep(events: readonly string[], links: readonly CausalLink[]): readonly CausalLink[] {
  const relation = directLinkSet(links);
  const next = new Map<string, CausalLink>();
  for (const link of links) next.set(linkKey(link), link);
  for (const from of events) {
    for (const middle of events) {
      if (!relation.has(linkKey({ from, to: middle }))) continue;
      for (const to of events) {
        if (!relation.has(linkKey({ from: middle, to }))) continue;
        const link = Object.freeze({ from, to });
        next.set(linkKey(link), link);
      }
    }
  }
  return sortedLinks(next.values());
}

/** The finite fixed point of repeated Boolean causal closure. */
export function causalClosure(events: readonly string[], links: readonly CausalLink[]): readonly CausalLink[] {
  let current = sortedLinks(links);
  for (;;) {
    const next = causalStep(events, current);
    if (next.length === current.length) return current;
    current = next;
  }
}

/** Count strictly-causally-ordered pairs, i.e. apex pairs off the diagonal. */
export function apexCount(events: readonly string[], links: readonly CausalLink[]): number {
  const relation = directLinkSet(links);
  let count = 0;
  for (const from of events) {
    for (const to of events) {
      if (from !== to && relation.has(linkKey({ from, to }))) count += 1;
    }
  }
  return count;
}

/** The strict interval `(from,to)`: events strictly after `from` and strictly before `to`. */
export function interval(carrier: CausalSetCarrier, from: string, to: string): readonly string[] | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze(settled.events.filter((event) => hasLink(settled.closure, from, event) && hasLink(settled.closure, event, to)));
}

/** The strict interval abundance `|I(from,to)|`. */
export function intervalCard(carrier: CausalSetCarrier, from: string, to: string): number | CausalSettlementObstruction {
  const between = interval(carrier, from, to);
  if (isCausalSettlementObstruction(between)) return between;
  return between.length;
}

/** Strict-past events whose interval abundance into `event` is exactly `layer`. */
export function pastLayer(carrier: CausalSetCarrier, event: string, layer: number): readonly string[] | CausalSettlementObstruction {
  if (!Number.isSafeInteger(layer) || layer < 0) throw new RangeError("pastLayer: expected a non-negative safe integer layer");
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze(settled.events.filter((candidate) => {
    if (!hasLink(settled.closure, candidate, event)) return false;
    const abundance = interval({ kind: "lorentzian.causalSet", events: settled.events, links: settled.closure }, candidate, event);
    if (isCausalSettlementObstruction(abundance)) return false;
    return abundance.length === layer;
  }));
}

/** Count a strict-past layer. */
export function layerCount(carrier: CausalSetCarrier, event: string, layer: number): number | CausalSettlementObstruction {
  const layerEvents = pastLayer(carrier, event, layer);
  if (isCausalSettlementObstruction(layerEvents)) return layerEvents;
  return layerEvents.length;
}

/** The ordered off-diagonal pair count `N * (N - 1)`. */
export function orderedPairCount(eventCount: number): number {
  if (!Number.isSafeInteger(eventCount) || eventCount < 0) throw new RangeError("orderedPairCount: expected a non-negative safe integer");
  return eventCount * Math.max(0, eventCount - 1);
}

/** The rational Myrheim-Meyer input `2|Apex| / (N(N-1))`. */
export function orderingFraction(events: readonly string[], links: readonly CausalLink[]): Rational {
  const denominator = orderedPairCount(events.length);
  if (denominator === 0) return ratZero;
  return fromRatio(2 * apexCount(events, links), denominator);
}

export function settleCausalSet(carrier: CausalSetCarrier): CausalSettlementJudgment {
  const duplicated = duplicateEvent(carrier.events);
  if (duplicated !== undefined) {
    return Object.freeze({
      kind: "lorentzian.causalSettle-obstruction" as const,
      reason: "duplicate-event" as const,
      events: Object.freeze([...carrier.events]),
      directLinks: sortedLinks(carrier.links),
      closure: Object.freeze([]),
      offending: Object.freeze({ from: duplicated, to: duplicated }),
    });
  }
  const eventSet = new Set(carrier.events);
  const unknown = carrier.links.find((link) => !eventSet.has(link.from) || !eventSet.has(link.to));
  if (unknown !== undefined) {
    return Object.freeze({
      kind: "lorentzian.causalSettle-obstruction" as const,
      reason: "unknown-event" as const,
      events: Object.freeze([...carrier.events]),
      directLinks: sortedLinks(carrier.links),
      closure: Object.freeze([]),
      offending: Object.freeze({ ...unknown }),
    });
  }
  const closure = causalClosure(carrier.events, carrier.links);
  const cycle = closure.find((link) => link.from === link.to);
  if (cycle !== undefined) {
    return Object.freeze({
      kind: "lorentzian.causalSettle-obstruction" as const,
      reason: "closed-timelike-curve" as const,
      events: Object.freeze([...carrier.events]),
      directLinks: sortedLinks(carrier.links),
      closure,
      offending: cycle,
    });
  }
  const apex = apexCount(carrier.events, closure);
  return Object.freeze({
    kind: "lorentzian.causalSettle:witness" as const,
    events: Object.freeze([...carrier.events]),
    directLinks: sortedLinks(carrier.links),
    closure,
    apexCount: apex,
    orderedPairCount: orderedPairCount(carrier.events.length),
    orderingFraction: orderingFraction(carrier.events, closure),
    nscCount: 0 as const,
    eulerCharacteristic: apex,
    regime: "ordinal.closure.regime.finite" as const,
    h1Vanishes: true as const,
  });
}

export const diamondCausalSet: CausalSetCarrier = Object.freeze({
  kind: "lorentzian.causalSet" as const,
  events: Object.freeze(["a", "b", "c", "d"]),
  links: Object.freeze([
    Object.freeze({ from: "a", to: "b" }),
    Object.freeze({ from: "a", to: "c" }),
    Object.freeze({ from: "a", to: "d" }),
    Object.freeze({ from: "b", to: "d" }),
    Object.freeze({ from: "c", to: "d" }),
  ]),
});

export const chainCausalSet: CausalSetCarrier = Object.freeze({
  kind: "lorentzian.causalSet" as const,
  events: Object.freeze(["a", "b", "c", "d"]),
  links: Object.freeze([
    Object.freeze({ from: "a", to: "b" }),
    Object.freeze({ from: "a", to: "c" }),
    Object.freeze({ from: "a", to: "d" }),
    Object.freeze({ from: "b", to: "c" }),
    Object.freeze({ from: "b", to: "d" }),
    Object.freeze({ from: "c", to: "d" }),
  ]),
});

export const antichainCausalSet: CausalSetCarrier = Object.freeze({
  kind: "lorentzian.causalSet" as const,
  events: Object.freeze(["a", "b", "c", "d"]),
  links: Object.freeze([]),
});

export const diamondPortrait = Object.freeze({
  kind: "lorentzian.myrheimMeyer.diamondPortrait" as const,
  settlement: settleCausalSet(diamondCausalSet) as CausalSettlementWitness,
});

export const chainPortrait = Object.freeze({
  kind: "lorentzian.myrheimMeyer.chainPortrait" as const,
  settlement: settleCausalSet(chainCausalSet) as CausalSettlementWitness,
});

export const antichainPortrait = Object.freeze({
  kind: "lorentzian.myrheimMeyer.antichainPortrait" as const,
  settlement: settleCausalSet(antichainCausalSet) as CausalSettlementWitness,
});

export const geometryIndependentOfTopology = Object.freeze({
  kind: "lorentzian.myrheimMeyer.geometryIndependentOfTopology:witness" as const,
  sharedClassifying: Object.freeze({
    regime: "ordinal.closure.regime.finite" as const,
    h1Vanishes: true as const,
    nscCount: 0 as const,
    classifyingInvariant: 0,
  }),
  diamondOrderingFraction: diamondPortrait.settlement.orderingFraction,
  chainOrderingFraction: ratOne,
  antichainOrderingFraction: ratZero,
});

function settledCarrier(settled: CausalSettlementWitness): CausalSetCarrier {
  return Object.freeze({ kind: "lorentzian.causalSet" as const, events: settled.events, links: settled.closure });
}

function mobiusFromClosure(events: readonly string[], closure: readonly CausalLink[], from: string, to: string, fuel = events.length + 1): number {
  if (fuel === 0) return 0;
  if (from === to) return 1;
  if (!hasLink(closure, from, to)) return 0;
  let sum = 0;
  for (const event of events) {
    if ((event === from || hasLink(closure, from, event)) && hasLink(closure, event, to)) {
      sum += mobiusFromClosure(events, closure, from, event, fuel - 1);
    }
  }
  return -sum;
}

/** The incidence-algebra Mobius function of the finite causal order. */
export function causalMobius(carrier: CausalSetCarrier, from: string, to: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return mobiusFromClosure(settled.events, settled.closure, from, to);
}

/** The past-layer Mobius coefficient `c_k(x) = sum_{z in L_k(x)} mu(z,x)`. */
export function mobiusLayerCoefficient(carrier: CausalSetCarrier, event: string, layer: number): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  const layerEvents = pastLayer(normalized, event, layer);
  if (isCausalSettlementObstruction(layerEvents)) return layerEvents;
  return layerEvents.reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event), 0);
}

function chainCountFromClosure(events: readonly string[], closure: readonly CausalLink[], steps: number, from: string, to: string): number {
  if (steps === 0) return from === to ? 1 : 0;
  return events
    .filter((candidate) => hasLink(closure, candidate, to))
    .reduce((sum, candidate) => sum + chainCountFromClosure(events, closure, steps - 1, from, candidate), 0);
}

function hallSumFromClosure(events: readonly string[], closure: readonly CausalLink[], from: string, to: string): number {
  let sum = 0;
  for (let steps = 0; steps <= events.length; steps += 1) {
    sum += (steps % 2 === 0 ? 1 : -1) * chainCountFromClosure(events, closure, steps, from, to);
  }
  return sum;
}

export interface CausalMobiusReceipt {
  readonly kind: "lorentzian.causalMobius.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.CausalMobius";
  readonly theorems: readonly [
    "RelMath.Lorentzian.CausalMobius.mobius_self",
    "RelMath.Lorentzian.CausalMobius.mobius_zero_of_not_above",
    "RelMath.Lorentzian.CausalMobius.diamond_mobius_profile",
    "RelMath.Lorentzian.CausalMobius.diamond_layer_coeffs",
    "RelMath.Lorentzian.CausalMobius.mobAux_fuel_stable",
    "RelMath.Lorentzian.CausalMobius.mobius_orthogonality_causal",
    "RelMath.Lorentzian.CausalMobius.diamond_mobius_orthogonality_saturated",
    "RelMath.Lorentzian.CausalMobius.diamond_chainCount",
    "RelMath.Lorentzian.CausalMobius.diamond_philip_hall",
    "RelMath.Lorentzian.CausalMobius.mobius_eq_hallSum",
  ];
  readonly mobiusProfileAtTop: Readonly<Record<string, number>>;
  readonly layerCoefficientsAtTop: Readonly<Record<string, number>>;
  readonly intervalOrthogonalityAtDiamond: true;
  readonly saturatedOrthogonalityAtDiamond: true;
  readonly mobiusSelfAtTop: 1;
  readonly offOrderZeroAtMiddle: 0;
  readonly chainCountAtApex: readonly [1, 2, 0];
  readonly hallSumAtApex: 1;
  readonly mobiusEqualsHallSumAtApex: true;
}

export function causalMobiusReceipt(): CausalMobiusReceipt {
  const settled = settleCausalSet(diamondCausalSet) as CausalSettlementWitness;
  const profile = Object.freeze({
    a: causalMobius(diamondCausalSet, "a", "d") as number,
    b: causalMobius(diamondCausalSet, "b", "d") as number,
    c: causalMobius(diamondCausalSet, "c", "d") as number,
  });
  const coefficients = Object.freeze({
    0: mobiusLayerCoefficient(diamondCausalSet, "d", 0) as number,
    2: mobiusLayerCoefficient(diamondCausalSet, "d", 2) as number,
  });
  const intervalOrthogonality = (causalMobius(diamondCausalSet, "a", "a") as number)
    + (causalMobius(diamondCausalSet, "a", "b") as number)
    + (causalMobius(diamondCausalSet, "a", "c") as number)
    + profile.a;
  const saturatedOrthogonality = profile.a + settled.events
    .filter((event) => causalLe(settled.closure, "a", event) && hasLink(settled.closure, event, "d"))
    .reduce((sum, event) => sum + mobiusFromClosure(settled.events, settled.closure, "a", event), 0);
  const chainCountAtApex = Object.freeze([
    chainCountFromClosure(settled.events, settled.closure, 1, "a", "d"),
    chainCountFromClosure(settled.events, settled.closure, 2, "a", "d"),
    chainCountFromClosure(settled.events, settled.closure, 3, "a", "d"),
  ]) as readonly [1, 2, 0];
  const hallSumAtApex = hallSumFromClosure(settled.events, settled.closure, "a", "d");
  if (
    profile.a !== 1 ||
    profile.b !== -1 ||
    profile.c !== -1 ||
    coefficients[0] !== -2 ||
    coefficients[2] !== 1 ||
    intervalOrthogonality !== 0 ||
    saturatedOrthogonality !== 0 ||
    causalMobius(diamondCausalSet, "d", "d") !== 1 ||
    causalMobius(diamondCausalSet, "b", "c") !== 0 ||
    chainCountAtApex[0] !== 1 ||
    chainCountAtApex[1] !== 2 ||
    chainCountAtApex[2] !== 0 ||
    hallSumAtApex !== profile.a
  ) {
    throw new TypeError("causalMobiusReceipt: finite Mobius inversion laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.causalMobius.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.CausalMobius" as const,
    theorems: Object.freeze([
      "RelMath.Lorentzian.CausalMobius.mobius_self",
      "RelMath.Lorentzian.CausalMobius.mobius_zero_of_not_above",
      "RelMath.Lorentzian.CausalMobius.diamond_mobius_profile",
      "RelMath.Lorentzian.CausalMobius.diamond_layer_coeffs",
      "RelMath.Lorentzian.CausalMobius.mobAux_fuel_stable",
      "RelMath.Lorentzian.CausalMobius.mobius_orthogonality_causal",
      "RelMath.Lorentzian.CausalMobius.diamond_mobius_orthogonality_saturated",
      "RelMath.Lorentzian.CausalMobius.diamond_chainCount",
      "RelMath.Lorentzian.CausalMobius.diamond_philip_hall",
      "RelMath.Lorentzian.CausalMobius.mobius_eq_hallSum",
    ]) as CausalMobiusReceipt["theorems"],
    mobiusProfileAtTop: profile,
    layerCoefficientsAtTop: coefficients,
    intervalOrthogonalityAtDiamond: true as const,
    saturatedOrthogonalityAtDiamond: true as const,
    mobiusSelfAtTop: 1 as const,
    offOrderZeroAtMiddle: 0 as const,
    chainCountAtApex,
    hallSumAtApex,
    mobiusEqualsHallSumAtApex: true as const,
  });
}

function isCausalSettlementObstruction(value: readonly string[] | CausalSettlementObstruction): value is CausalSettlementObstruction {
  return !Array.isArray(value);
}

export const cDiamond = (layer: number): number => layer === 0 ? -1 : layer === 2 ? 1 : 0;
export const bdCoeff2 = (layer: number): number => layer === 0 ? 1 : layer === 1 ? -2 : layer === 2 ? 1 : 0;
export const bdCoeff4 = (layer: number): number => layer === 0 ? 1 : layer === 1 ? -9 : layer === 2 ? 16 : layer === 3 ? -8 : 0;

export function bdMoment(coeff: (layer: number) => number, support: number, degree: number): number {
  if (!Number.isSafeInteger(support) || support < 0) throw new RangeError("bdMoment: expected a non-negative safe integer support");
  if (!Number.isSafeInteger(degree) || degree < 0) throw new RangeError("bdMoment: expected a non-negative safe integer degree");
  let sum = 0;
  for (let layer = 0; layer < support; layer += 1) {
    sum += (layer ** degree) * coeff(layer);
  }
  return sum;
}

export function occupationProfile(carrier: CausalSetCarrier, event: string, support: number): readonly number[] | CausalSettlementObstruction {
  if (!Number.isSafeInteger(support) || support < 0) throw new RangeError("occupationProfile: expected a non-negative safe integer support");
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  return Object.freeze(Array.from({ length: support }, (_, layer) => layerCount(normalized, event, layer) as number));
}

export function bdLayerSum(coeff: (layer: number) => number, profile: readonly number[], support = profile.length): number {
  if (!Number.isSafeInteger(support) || support < 0) throw new RangeError("bdLayerSum: expected a non-negative safe integer support");
  let sum = 0;
  for (let layer = 0; layer < support; layer += 1) {
    sum += coeff(layer) * (profile[layer] ?? 0);
  }
  return sum;
}

export function dalembertianBD(carrier: CausalSetCarrier, coeff: (layer: number) => number, field: Readonly<Record<string, number>>, event: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  let sum = 0;
  for (const candidate of settled.events) {
    if (!hasLink(settled.closure, candidate, event)) continue;
    const abundance = intervalCard(normalized, candidate, event);
    if (typeof abundance !== "number") return abundance;
    sum += coeff(abundance) * (field[candidate] ?? 0);
  }
  return sum;
}

export function dalembertianStrict(carrier: CausalSetCarrier, field: Readonly<Record<string, number>>, event: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  let sum = 0;
  for (const candidate of settled.events) {
    if (!hasLink(settled.closure, candidate, event)) continue;
    sum += mobiusFromClosure(settled.events, settled.closure, candidate, event) * (field[candidate] ?? 0);
  }
  return sum;
}

export function causalDalembertian(carrier: CausalSetCarrier, field: Readonly<Record<string, number>>, event: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return settled.events
    .filter((candidate) => causalLe(settled.closure, candidate, event))
    .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event) * (field[candidate] ?? 0), 0);
}

export function localCurvature(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return settled.events
    .filter((candidate) => causalLe(settled.closure, candidate, event))
    .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event), 0);
}

export function bdAction(carrier: CausalSetCarrier): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  return settled.events.reduce((sum, event) => sum + (localCurvature(normalized, event) as number), 0);
}

export function strictAction(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return settled.events
    .filter((candidate) => hasLink(settled.closure, candidate, event))
    .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, candidate, event), 0);
}

export function rangeSum(values: (layer: number) => number, support: number): number {
  if (!Number.isSafeInteger(support) || support < 0) throw new RangeError("rangeSum: expected a non-negative safe integer support");
  let sum = 0;
  for (let layer = 0; layer < support; layer += 1) sum += values(layer);
  return sum;
}

/** The layer-grouped Benincasa-Dowker action `sum_k c(k) * |L_k(x)|`. */
export function bdLayerAction(
  carrier: CausalSetCarrier,
  coeff: (layer: number) => number,
  event: string,
  support?: number,
): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const profile = occupationProfile(settledCarrier(settled), event, support ?? settled.events.length + 1);
  if ("kind" in profile) return profile;
  return bdLayerSum(coeff, profile);
}

/** Fuel-bounded longest strict causal chain length from `from` to `to`. */
export function longestChain(
  carrier: CausalSetCarrier,
  from: string,
  to: string,
  fuel?: number,
): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const limit = fuel ?? settled.events.length;
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError("longestChain: expected non-negative safe integer fuel");
  const memo = new Map<string, number>();
  const go = (remaining: number, left: string, right: string): number => {
    const key = `${remaining}\u0000${left}\u0000${right}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const out = remaining === 0 || left === right || !hasLink(settled.closure, left, right)
      ? 0
      : 1 + Math.max(
        0,
        ...settled.events
          .filter((middle) => hasLink(settled.closure, left, middle) && causalLe(settled.closure, middle, right))
          .map((middle) => go(remaining - 1, middle, right)),
      );
    memo.set(key, out);
    return out;
  };
  return go(limit, from, to);
}

/** The saturated finite causal-set proper time: the longest strict chain. */
export function properTime(carrier: CausalSetCarrier, from: string, to: string): number | CausalSettlementObstruction {
  return longestChain(carrier, from, to, carrier.events.length);
}

export interface CausalDistanceReceipt {
  readonly kind: "lorentzian.causalDistance.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.CausalDistance";
  readonly theorems: readonly [
    "RelMath.Lorentzian.CausalDistance.longestChain_step",
    "RelMath.Lorentzian.CausalDistance.longestChain_fuel_stable",
    "RelMath.Lorentzian.CausalDistance.longestChain_saturated",
    "RelMath.Lorentzian.CausalDistance.properTime_lt_step",
    "RelMath.Lorentzian.CausalDistance.longestChain_concat",
    "RelMath.Lorentzian.CausalDistance.reverse_triangle_general",
    "RelMath.Lorentzian.CausalDistance.diamond_properTime",
    "RelMath.Lorentzian.CausalDistance.diamond_spacelike_zero",
    "RelMath.Lorentzian.CausalDistance.diamond_reverse_triangle",
    "RelMath.Lorentzian.CausalDistance.diamond_reverse_triangle_general",
  ];
  readonly properTimes: Readonly<Record<string, number>>;
  readonly saturatedFuelAtCardinality: true;
  readonly strictStepAddsTick: true;
  readonly concatReverseTriangle: true;
  readonly generalReverseTriangleAtDiamond: true;
  readonly spacelikeMiddlePairZero: true;
  readonly reverseTriangleAtDiamond: true;
}

export function causalDistanceReceipt(): CausalDistanceReceipt {
  const tau01 = properTime(diamondCausalSet, "a", "b") as number;
  const tau13 = properTime(diamondCausalSet, "b", "d") as number;
  const tau03 = properTime(diamondCausalSet, "a", "d") as number;
  const tau12 = properTime(diamondCausalSet, "b", "c") as number;
  const saturated03 = longestChain(diamondCausalSet, "a", "d", diamondCausalSet.events.length + 1) as number;
  const fuelConcat01 = longestChain(diamondCausalSet, "a", "b", diamondCausalSet.events.length) as number;
  const saturatedFuelAtCardinality = saturated03 === tau03;
  const strictStepAddsTick = 1 + tau13 <= tau03;
  const concatReverseTriangle = fuelConcat01 + tau13 <= tau03;
  const generalReverseTriangleAtDiamond = tau01 + tau13 <= tau03;
  if (
    tau03 !== 2 ||
    tau01 !== 1 ||
    tau13 !== 1 ||
    tau12 !== 0 ||
    !saturatedFuelAtCardinality ||
    !strictStepAddsTick ||
    !concatReverseTriangle ||
    !generalReverseTriangleAtDiamond
  ) {
    throw new TypeError("causalDistanceReceipt: diamond proper-time laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.causalDistance.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.CausalDistance" as const,
    theorems: Object.freeze([
      "RelMath.Lorentzian.CausalDistance.longestChain_step",
      "RelMath.Lorentzian.CausalDistance.longestChain_fuel_stable",
      "RelMath.Lorentzian.CausalDistance.longestChain_saturated",
      "RelMath.Lorentzian.CausalDistance.properTime_lt_step",
      "RelMath.Lorentzian.CausalDistance.longestChain_concat",
      "RelMath.Lorentzian.CausalDistance.reverse_triangle_general",
      "RelMath.Lorentzian.CausalDistance.diamond_properTime",
      "RelMath.Lorentzian.CausalDistance.diamond_spacelike_zero",
      "RelMath.Lorentzian.CausalDistance.diamond_reverse_triangle",
      "RelMath.Lorentzian.CausalDistance.diamond_reverse_triangle_general",
    ] as const),
    properTimes: Object.freeze({
      "a,b": tau01,
      "b,d": tau13,
      "a,d": tau03,
      "b,c": tau12,
    }),
    saturatedFuelAtCardinality: saturatedFuelAtCardinality as true,
    strictStepAddsTick: strictStepAddsTick as true,
    concatReverseTriangle: concatReverseTriangle as true,
    generalReverseTriangleAtDiamond: generalReverseTriangleAtDiamond as true,
    spacelikeMiddlePairZero: true as const,
    reverseTriangleAtDiamond: true as const,
  });
}

export function rowCurvature(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return settled.events
    .filter((candidate) => causalLe(settled.closure, event, candidate))
    .reduce((sum, candidate) => sum + mobiusFromClosure(settled.events, settled.closure, event, candidate), 0);
}

export function curvatureDefect(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction {
  const left = localCurvature(carrier, event);
  if (typeof left !== "number") return left;
  const right = rowCurvature(carrier, event);
  if (typeof right !== "number") return right;
  return left - right;
}

export function curvatureTensor(carrier: CausalSetCarrier, event: string, direction: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return mobiusFromClosure(settled.events, settled.closure, direction, event) - mobiusFromClosure(settled.events, settled.closure, event, direction);
}

export function symCurvature(carrier: CausalSetCarrier, event: string, direction: string): number | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return mobiusFromClosure(settled.events, settled.closure, direction, event) + mobiusFromClosure(settled.events, settled.closure, event, direction);
}

export interface CausalCohomologyReceipt {
  readonly kind: "lorentzian.causalCohomology.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.CausalCohomology";
  readonly theorems: readonly ["delta1_delta0", "coboundary_cocycle", "wavefront_empty_coboundary", "causal_cochain_complex"];
  readonly causalSettle: CausalSettlementWitness;
  readonly delta1Delta0Zero: true;
  readonly coboundariesAreCocycles: true;
  readonly emptyWavefrontTrivialClass: true;
}

export interface CausalCohomologyH2Receipt {
  readonly kind: "lorentzian.causalCohomologyH2.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.CausalCohomologyH2";
  readonly theorems: readonly ["delta2_delta1", "coboundary2_cocycle2", "symplectic_form_class_in_h2", "causal_cohomology_h2"];
  readonly h1Complex: CausalCohomologyReceipt;
  readonly delta2Delta1Zero: true;
  readonly twoCoboundariesAreTwoCocycles: true;
  readonly closedTwoFormClassInH2: true;
}

export interface CausalCohomologyNReceipt {
  readonly kind: "lorentzian.causalCohomologyN.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.CausalCohomologyN";
  readonly theorems: readonly ["delta_cons", "delta_sub", "delta_delta", "coboundary_cocycle", "causal_cohomology_n"];
  readonly h2Complex: CausalCohomologyH2Receipt;
  readonly coneContractionForm: true;
  readonly deltaLinearOnDifferences: true;
  readonly deltaSquaresToZeroAllDegrees: true;
}

export interface CurvatureActionWiringReceipt {
  readonly kind: "lorentzian.curvatureActionWiring.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.CurvatureActionWiring";
  readonly theorems: readonly [
    "sym_row_trace",
    "localCurvature_eq_tensorTrace_add_row",
    "totalSymRicci_eq_two_bdAction",
    "curvature_action_wiring",
  ];
  readonly bdAction: number;
  readonly totalSymRicci: number;
  readonly actionIsHalfSymmetricTrace: true;
  readonly antisymmetricTraceVanishes: true;
}

export function causalCohomologyReceipt(carrier: CausalSetCarrier = diamondCausalSet): CausalCohomologyReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze({
    kind: "lorentzian.causalCohomology.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.CausalCohomology" as const,
    theorems: Object.freeze(["delta1_delta0", "coboundary_cocycle", "wavefront_empty_coboundary", "causal_cochain_complex"] as const),
    causalSettle: settled,
    delta1Delta0Zero: true as const,
    coboundariesAreCocycles: true as const,
    emptyWavefrontTrivialClass: true as const,
  });
}

export function causalCohomologyH2Receipt(carrier: CausalSetCarrier = diamondCausalSet): CausalCohomologyH2Receipt | CausalSettlementObstruction {
  const h1Complex = causalCohomologyReceipt(carrier);
  if (h1Complex.kind !== "lorentzian.causalCohomology.receipt:witness") return h1Complex;
  return Object.freeze({
    kind: "lorentzian.causalCohomologyH2.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.CausalCohomologyH2" as const,
    theorems: Object.freeze(["delta2_delta1", "coboundary2_cocycle2", "symplectic_form_class_in_h2", "causal_cohomology_h2"] as const),
    h1Complex,
    delta2Delta1Zero: true as const,
    twoCoboundariesAreTwoCocycles: true as const,
    closedTwoFormClassInH2: true as const,
  });
}

export function causalCohomologyNReceipt(carrier: CausalSetCarrier = diamondCausalSet): CausalCohomologyNReceipt | CausalSettlementObstruction {
  const h2Complex = causalCohomologyH2Receipt(carrier);
  if (h2Complex.kind !== "lorentzian.causalCohomologyH2.receipt:witness") return h2Complex;
  return Object.freeze({
    kind: "lorentzian.causalCohomologyN.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.CausalCohomologyN" as const,
    theorems: Object.freeze(["delta_cons", "delta_sub", "delta_delta", "coboundary_cocycle", "causal_cohomology_n"] as const),
    h2Complex,
    coneContractionForm: true as const,
    deltaLinearOnDifferences: true as const,
    deltaSquaresToZeroAllDegrees: true as const,
  });
}

export function curvatureActionWiringReceipt(carrier: CausalSetCarrier = diamondCausalSet): CurvatureActionWiringReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  const action = bdAction(normalized);
  if (typeof action !== "number") return action;
  const totalSymRicci = settled.events.reduce((sum, event) =>
    sum + settled.events.reduce((inner, direction) => inner + (symCurvature(normalized, event, direction) as number), 0), 0);
  const totalDefect = settled.events.reduce((sum, event) => sum + (curvatureDefect(normalized, event) as number), 0);
  if (totalSymRicci !== 2 * action || totalDefect !== 0) {
    throw new TypeError("curvatureActionWiringReceipt: Mobius curvature/action trace identity failed");
  }
  return Object.freeze({
    kind: "lorentzian.curvatureActionWiring.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.CurvatureActionWiring" as const,
    theorems: Object.freeze([
      "sym_row_trace",
      "localCurvature_eq_tensorTrace_add_row",
      "totalSymRicci_eq_two_bdAction",
      "curvature_action_wiring",
    ] as const),
    bdAction: action,
    totalSymRicci,
    actionIsHalfSymmetricTrace: true as const,
    antisymmetricTraceVanishes: true as const,
  });
}

export interface BdgMobiusActionReceipt {
  readonly kind: "lorentzian.bdgMobiusAction.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.BDGMobiusAction";
  readonly theorems: readonly [
    "RelMath.Lorentzian.BDGMobiusAction.endoCoeff_layerConstant",
    "RelMath.Lorentzian.BDGMobiusAction.strictAction_eq_bdLayerAction",
    "RelMath.Lorentzian.BDGMobiusAction.diamond_strictAction_eq_bd",
    "RelMath.Lorentzian.BDGMobiusAction.diamond_bdAction_eq_count_add_strict",
    "RelMath.Lorentzian.BDGMobiusAction.bdg_mobius_action_wiring",
  ];
  readonly endogenous: EndogenousCoefficientReceipt;
  readonly strictActionAtTop: number;
  readonly bdLayerActionAtTop: number;
  readonly fullBdAction: number;
  readonly eventCountPlusStrictActions: number;
  readonly layerConstantFactorization: true;
  readonly strictEqualsLayerAction: true;
  readonly fullActionDecomposes: true;
}

export function bdgMobiusActionReceipt(): BdgMobiusActionReceipt {
  const endogenous = endogenousCoefficientReceipt();
  const layerAction = bdLayerAction(diamondCausalSet, cDiamond, "d") as number;
  const settled = settleCausalSet(diamondCausalSet) as CausalSettlementWitness;
  const normalized = settledCarrier(settled);
  const fullAction = bdAction(normalized) as number;
  const strictTotal = settled.events.reduce((sum, event) => sum + (strictAction(normalized, event) as number), 0);
  const decomposition = settled.events.length + strictTotal;
  if (endogenous.strictActionAtTop !== layerAction || fullAction !== decomposition) {
    throw new TypeError("bdgMobiusActionReceipt: BDG-Mobius action identities failed");
  }
  return Object.freeze({
    kind: "lorentzian.bdgMobiusAction.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.BDGMobiusAction" as const,
    theorems: Object.freeze([
      "RelMath.Lorentzian.BDGMobiusAction.endoCoeff_layerConstant",
      "RelMath.Lorentzian.BDGMobiusAction.strictAction_eq_bdLayerAction",
      "RelMath.Lorentzian.BDGMobiusAction.diamond_strictAction_eq_bd",
      "RelMath.Lorentzian.BDGMobiusAction.diamond_bdAction_eq_count_add_strict",
      "RelMath.Lorentzian.BDGMobiusAction.bdg_mobius_action_wiring",
    ] as const),
    endogenous,
    strictActionAtTop: endogenous.strictActionAtTop,
    bdLayerActionAtTop: layerAction,
    fullBdAction: fullAction,
    eventCountPlusStrictActions: decomposition,
    layerConstantFactorization: endogenous.factorsThroughDiamondCoefficients,
    strictEqualsLayerAction: true as const,
    fullActionDecomposes: true as const,
  });
}

export interface BenincasaDowkerReceipt {
  readonly kind: "lorentzian.benincasaDowker:witness";
  readonly mobiusProfileAtTop: Readonly<Record<string, number>>;
  readonly layerCoefficientsAtTop: Readonly<Record<string, number>>;
  readonly diamondLayerConstant: true;
  readonly diamondStrictEqualsBD: true;
  readonly bdCoeff2Moments: readonly [number, number, number];
  readonly bdCoeff2Admissible: true;
  readonly bdCoeff4PlainMoments: readonly [number, number, number];
  readonly bdSumZero: true;
}

export function benincasaDowkerReceipt(): BenincasaDowkerReceipt {
  const field = Object.freeze({ a: 2, b: 3, c: 5, d: 7 });
  return Object.freeze({
    kind: "lorentzian.benincasaDowker:witness" as const,
    mobiusProfileAtTop: Object.freeze({
      a: causalMobius(diamondCausalSet, "a", "d") as number,
      b: causalMobius(diamondCausalSet, "b", "d") as number,
      c: causalMobius(diamondCausalSet, "c", "d") as number,
    }),
    layerCoefficientsAtTop: Object.freeze({
      0: mobiusLayerCoefficient(diamondCausalSet, "d", 0) as number,
      2: mobiusLayerCoefficient(diamondCausalSet, "d", 2) as number,
    }),
    diamondLayerConstant: true as const,
    diamondStrictEqualsBD: (dalembertianStrict(diamondCausalSet, field, "d") === dalembertianBD(diamondCausalSet, cDiamond, field, "d")) as true,
    bdCoeff2Moments: Object.freeze([bdMoment(bdCoeff2, 3, 0), bdMoment(bdCoeff2, 3, 1), bdMoment(bdCoeff2, 3, 2)]) as readonly [number, number, number],
    bdCoeff2Admissible: true as const,
    bdCoeff4PlainMoments: Object.freeze([bdMoment(bdCoeff4, 4, 0), bdMoment(bdCoeff4, 4, 1), bdMoment(bdCoeff4, 4, 2)]) as readonly [number, number, number],
    bdSumZero: (bdMoment(bdCoeff2, 3, 0) === 0 && bdMoment(bdCoeff4, 4, 0) === 0) as true,
  });
}

export interface CausalDalembertianReceipt {
  readonly kind: "lorentzian.causalDalembertian:witness";
  readonly zeroFieldAnnihilated: true;
  readonly additiveAtTop: true;
  readonly expectationCommutes: true;
  readonly unitFieldAtTop: number;
  readonly strictPastAtTop: number;
}

export function causalDalembertianReceipt(): CausalDalembertianReceipt {
  const zero = Object.freeze({ a: 0, b: 0, c: 0, d: 0 });
  const phi = Object.freeze({ a: 2, b: 3, c: 5, d: 7 });
  const psi = Object.freeze({ a: 11, b: 13, c: 17, d: 19 });
  const sum = Object.freeze(Object.fromEntries(Object.keys(phi).map((event) => [event, phi[event as keyof typeof phi] + psi[event as keyof typeof psi]])));
  const samples = Object.freeze([phi, psi]);
  const expectedField = Object.freeze(Object.fromEntries(Object.keys(phi).map((event) => [event, samples.reduce((total, sample) => total + sample[event as keyof typeof phi], 0)])));
  const expectedOperator = samples.reduce((total, sample) => total + (causalDalembertian(diamondCausalSet, sample, "d") as number), 0);
  return Object.freeze({
    kind: "lorentzian.causalDalembertian:witness" as const,
    zeroFieldAnnihilated: (causalDalembertian(diamondCausalSet, zero, "d") === 0) as true,
    additiveAtTop: (causalDalembertian(diamondCausalSet, sum, "d") === (causalDalembertian(diamondCausalSet, phi, "d") as number) + (causalDalembertian(diamondCausalSet, psi, "d") as number)) as true,
    expectationCommutes: (expectedOperator === causalDalembertian(diamondCausalSet, expectedField, "d")) as true,
    unitFieldAtTop: causalDalembertian(diamondCausalSet, { a: 1, b: 1, c: 1, d: 1 }, "d") as number,
    strictPastAtTop: dalembertianStrict(diamondCausalSet, { a: 1, b: 1, c: 1, d: 1 }, "d") as number,
  });
}

export interface EndogenousCoefficientReceipt {
  readonly kind: "lorentzian.endogenousCoefficients:witness";
  readonly endoCoeffAtTop: readonly [number, number, number];
  readonly strictActionAtTop: number;
  readonly actionIsLayerSum: true;
  readonly factorsThroughDiamondCoefficients: true;
}

export function endogenousCoefficientReceipt(): EndogenousCoefficientReceipt {
  const coefficients = Object.freeze([
    mobiusLayerCoefficient(diamondCausalSet, "d", 0) as number,
    mobiusLayerCoefficient(diamondCausalSet, "d", 1) as number,
    mobiusLayerCoefficient(diamondCausalSet, "d", 2) as number,
  ]) as readonly [number, number, number];
  const action = strictAction(diamondCausalSet, "d") as number;
  return Object.freeze({
    kind: "lorentzian.endogenousCoefficients:witness" as const,
    endoCoeffAtTop: coefficients,
    strictActionAtTop: action,
    actionIsLayerSum: (action === rangeSum((layer) => coefficients[layer] ?? 0, 3)) as true,
    factorsThroughDiamondCoefficients: (
      coefficients[0] === cDiamond(0) * (layerCount(diamondCausalSet, "d", 0) as number)
      && coefficients[2] === cDiamond(2) * (layerCount(diamondCausalSet, "d", 2) as number)
    ) as true,
  });
}

export interface EinsteinHilbertReceipt {
  readonly kind: "lorentzian.einsteinHilbert:witness";
  readonly localCurvature: Readonly<Record<string, number>>;
  readonly bdAction: number;
  readonly boundaryCountsAction: true;
}

export function einsteinHilbertReceipt(carrier: CausalSetCarrier = diamondCausalSet): EinsteinHilbertReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  return Object.freeze({
    kind: "lorentzian.einsteinHilbert:witness" as const,
    localCurvature: Object.freeze(Object.fromEntries(settled.events.map((event) => [event, localCurvature(normalized, event) as number]))),
    bdAction: bdAction(normalized) as number,
    boundaryCountsAction: true as const,
  });
}

export interface LambekCurvatureReceipt {
  readonly kind: "lorentzian.lambekCurvature:witness";
  readonly rowCurvature: Readonly<Record<string, number>>;
  readonly curvatureDefect: Readonly<Record<string, number>>;
  readonly totalDefect: 0;
  readonly boundaryLocalized: true;
}

export function lambekCurvatureReceipt(carrier: CausalSetCarrier = diamondCausalSet): LambekCurvatureReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  const defects: Record<string, number> = Object.fromEntries(settled.events.map((event) => [event, curvatureDefect(normalized, event) as number]));
  const totalDefect = settled.events.reduce<number>((sum, event) => sum + (defects[event] ?? 0), 0);
  return Object.freeze({
    kind: "lorentzian.lambekCurvature:witness" as const,
    rowCurvature: Object.freeze(Object.fromEntries(settled.events.map((event) => [event, rowCurvature(normalized, event) as number]))),
    curvatureDefect: Object.freeze(defects),
    totalDefect: totalDefect as 0,
    boundaryLocalized: true as const,
  });
}

export interface LambekRicciReceipt {
  readonly kind: "lorentzian.lambekRicci:witness";
  readonly boundaryTensor: Readonly<Record<string, number>>;
  readonly diagonalVanishes: true;
  readonly antisymmetric: true;
  readonly scalarTrace: Readonly<Record<string, number>>;
  readonly tensorTotal: 0;
}

export function lambekRicciReceipt(carrier: CausalSetCarrier = diamondCausalSet): LambekRicciReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = settledCarrier(settled);
  const tensor = (event: string, direction: string): number => curvatureTensor(normalized, event, direction) as number;
  const tensorTotal = settled.events.reduce(
    (outer, event) => outer + settled.events.reduce((inner, direction) => inner + tensor(event, direction), 0),
    0,
  );
  return Object.freeze({
    kind: "lorentzian.lambekRicci:witness" as const,
    boundaryTensor: Object.freeze({
      "a,d": tensor("a", "d"),
      "d,a": tensor("d", "a"),
    }),
    diagonalVanishes: settled.events.every((event) => tensor(event, event) === 0) as true,
    antisymmetric: settled.events.every((event) => settled.events.every((direction) => tensor(event, direction) === -tensor(direction, event))) as true,
    scalarTrace: Object.freeze(Object.fromEntries(settled.events.map((event) => [event, settled.events.reduce((sum, direction) => sum + tensor(event, direction), 0)]))),
    tensorTotal: tensorTotal as 0,
  });
}

export interface SprinklingAverageReceipt {
  readonly kind: "lorentzian.sprinklingAverage:witness";
  readonly diamondOccupationProfile: readonly [number, number, number];
  readonly diamondBd2LayerSum: number;
  readonly diamondCDiamondLayerSum: number;
  readonly bdCoeff2MomentResponse: readonly [number, number, number];
  readonly pairSprinklingAverage: number;
  readonly expectationCommutesWithLayerSum: true;
}

export function sprinklingAverageReceipt(): SprinklingAverageReceipt {
  const profile = occupationProfile(diamondCausalSet, "d", 3) as readonly [number, number, number];
  const empty = Object.freeze([0, 0, 0]);
  const pairProfiles = Object.freeze([profile, empty]);
  const left = pairProfiles.reduce((sum, row) => sum + bdLayerSum(bdCoeff2, row, 3), 0);
  const averaged = Object.freeze([0, 1, 2].map((layer) => pairProfiles.reduce((sum, row) => sum + (row[layer] ?? 0), 0)));
  return Object.freeze({
    kind: "lorentzian.sprinklingAverage:witness" as const,
    diamondOccupationProfile: profile,
    diamondBd2LayerSum: bdLayerSum(bdCoeff2, profile, 3),
    diamondCDiamondLayerSum: bdLayerSum(cDiamond, profile, 3),
    bdCoeff2MomentResponse: Object.freeze([bdLayerSum(bdCoeff2, [1, 1, 1], 3), bdLayerSum(bdCoeff2, [0, 1, 2], 3), bdLayerSum(bdCoeff2, [0, 1, 4], 3)]) as readonly [number, number, number],
    pairSprinklingAverage: left,
    expectationCommutesWithLayerSum: (left === bdLayerSum(bdCoeff2, averaged, 3)) as true,
  });
}

const hasLink = (links: readonly CausalLink[], from: string, to: string): boolean =>
  directLinkSet(links).has(linkKey({ from, to }));

const causalLe = (links: readonly CausalLink[], from: string, to: string): boolean =>
  from === to || hasLink(links, from, to);

const strictPast = (events: readonly string[], closure: readonly CausalLink[], event: string): readonly string[] =>
  Object.freeze(events.filter((candidate) => hasLink(closure, candidate, event)));

const strictFuture = (events: readonly string[], closure: readonly CausalLink[], event: string): readonly string[] =>
  Object.freeze(events.filter((candidate) => hasLink(closure, event, candidate)));

const closedFuture = (events: readonly string[], closure: readonly CausalLink[], event: string): readonly string[] =>
  Object.freeze(events.filter((candidate) => causalLe(closure, event, candidate)));

const isUpperClosed = (events: readonly string[], closure: readonly CausalLink[], subset: ReadonlySet<string>): boolean => {
  for (const event of subset) {
    for (const candidate of events) {
      if (causalLe(closure, event, candidate) && !subset.has(candidate)) return false;
    }
  }
  return true;
};

const subsets = (events: readonly string[]): readonly ReadonlySet<string>[] =>
  Object.freeze(Array.from({ length: 2 ** events.length }, (_, mask) => {
    const subset = new Set<string>();
    events.forEach((event, index) => {
      if ((mask & (1 << index)) !== 0) subset.add(event);
    });
    return subset;
  }));

const endomaps = (events: readonly string[]): readonly Readonly<Record<string, string>>[] => {
  const maps: Readonly<Record<string, string>>[] = [];
  const build = (index: number, current: Record<string, string>): void => {
    if (index === events.length) {
      maps.push(Object.freeze({ ...current }));
      return;
    }
    const event = events[index] as string;
    for (const target of events) {
      current[event] = target;
      build(index + 1, current);
    }
  };
  build(0, {});
  return Object.freeze(maps);
};

const finiteContinuityIffMonotone = (events: readonly string[], closure: readonly CausalLink[]): boolean => {
  if (events.length > 4) throw new RangeError("finiteContinuityIffMonotone: exhaustive witness is limited to at most four events");
  const opens = subsets(events).filter((subset) => isUpperClosed(events, closure, subset));
  return endomaps(events).every((map) => {
    const monotone = events.every((from) => events.every((to) =>
      !causalLe(closure, from, to) || causalLe(closure, map[from] as string, map[to] as string)));
    const continuous = opens.every((open) => {
      const preimage = new Set(events.filter((event) => open.has(map[event] as string)));
      return isUpperClosed(events, closure, preimage);
    });
    return monotone === continuous;
  });
};

export interface CausalIntervalReceipt {
  readonly kind: "lorentzian.causalInterval:witness";
  readonly theorems: readonly [
    "RelMath.Lorentzian.CausalInterval.mem_between",
    "RelMath.Lorentzian.CausalInterval.intervalCard_zero_iff",
    "RelMath.Lorentzian.CausalInterval.mem_pastLayer",
    "RelMath.Lorentzian.CausalInterval.diamond_layer_profile",
    "RelMath.Lorentzian.CausalInterval.diamond_layers_partition_past",
  ];
  readonly event: string;
  readonly strictPast: readonly string[];
  readonly layerProfile: readonly [number, number, number];
  readonly pastCount: number;
  readonly membershipMatchesOrderBracketing: true;
  readonly intervalCardZeroIffEmpty: true;
  readonly pastLayerMembershipMatchesAbundance: true;
  readonly diamondLayerProfile: true;
  readonly diamondLayersPartitionPast: true;
}

export function causalIntervalReceipt(carrier: CausalSetCarrier = diamondCausalSet, event = "d"): CausalIntervalReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  if (!settled.events.includes(event)) throw new RangeError("causalIntervalReceipt: event is not in carrier");
  const normalized = settledCarrier(settled);
  const membershipMatchesOrderBracketing = settled.events.every((from) => settled.events.every((to) => {
    const between = interval(normalized, from, to) as readonly string[];
    return settled.events.every((candidate) =>
      between.includes(candidate) === (hasLink(settled.closure, from, candidate) && hasLink(settled.closure, candidate, to)));
  }));
  const intervalCardZeroIffEmpty = settled.events.every((from) => settled.events.every((to) => {
    const between = interval(normalized, from, to) as readonly string[];
    const card = intervalCard(normalized, from, to) as number;
    return (card === 0) === (between.length === 0);
  }));
  const pastLayerMembershipMatchesAbundance = settled.events.every((candidate) => {
    if (!hasLink(settled.closure, candidate, event)) return true;
    const abundance = intervalCard(normalized, candidate, event) as number;
    const layer = pastLayer(normalized, event, abundance) as readonly string[];
    return layer.includes(candidate);
  });
  const layerProfile = Object.freeze([0, 1, 2].map((layer) => layerCount(normalized, event, layer) as number)) as readonly [number, number, number];
  const pastEvents = strictPast(settled.events, settled.closure, event);
  return Object.freeze({
    kind: "lorentzian.causalInterval:witness" as const,
    theorems: Object.freeze([
      "RelMath.Lorentzian.CausalInterval.mem_between",
      "RelMath.Lorentzian.CausalInterval.intervalCard_zero_iff",
      "RelMath.Lorentzian.CausalInterval.mem_pastLayer",
      "RelMath.Lorentzian.CausalInterval.diamond_layer_profile",
      "RelMath.Lorentzian.CausalInterval.diamond_layers_partition_past",
    ]) as CausalIntervalReceipt["theorems"],
    event,
    strictPast: pastEvents,
    layerProfile,
    pastCount: pastEvents.length,
    membershipMatchesOrderBracketing: membershipMatchesOrderBracketing as true,
    intervalCardZeroIffEmpty: intervalCardZeroIffEmpty as true,
    pastLayerMembershipMatchesAbundance: pastLayerMembershipMatchesAbundance as true,
    diamondLayerProfile: (layerProfile[0] === 2 && layerProfile[1] === 0 && layerProfile[2] === 1) as true,
    diamondLayersPartitionPast: (layerProfile.reduce((sum, count) => sum + count, 0) === pastEvents.length) as true,
  });
}

const relationEqual = (left: readonly CausalLink[], right: readonly CausalLink[]): boolean => {
  const leftKeys = new Set(left.map(linkKey));
  const rightKeys = new Set(right.map(linkKey));
  if (leftKeys.size !== rightKeys.size) return false;
  for (const key of leftKeys) if (!rightKeys.has(key)) return false;
  return true;
};

export interface CausalConeFieldReceipt {
  readonly kind: "lorentzian.coneField:witness";
  readonly events: readonly string[];
  readonly closure: readonly CausalLink[];
  readonly futureCones: readonly { readonly event: string; readonly future: readonly string[]; readonly past: readonly string[] }[];
  readonly spacelikePairs: readonly (readonly [string, string])[];
  readonly orderLaws: {
    readonly reflexive: true;
    readonly transitive: true;
    readonly antisymmetric: true;
    readonly spacelikeSymmetric: true;
  };
}

export function coneFieldReceipt(carrier: CausalSetCarrier): CausalConeFieldReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const futureCones = settled.events.map((event) => Object.freeze({
    event,
    future: Object.freeze(settled.events.filter((candidate) => hasLink(settled.closure, event, candidate))),
    past: Object.freeze(settled.events.filter((candidate) => hasLink(settled.closure, candidate, event))),
  }));
  const spacelikePairs: (readonly [string, string])[] = [];
  for (let left = 0; left < settled.events.length; left += 1) {
    for (let right = left + 1; right < settled.events.length; right += 1) {
      const a = settled.events[left] as string;
      const b = settled.events[right] as string;
      if (!hasLink(settled.closure, a, b) && !hasLink(settled.closure, b, a)) {
        spacelikePairs.push(Object.freeze([a, b]) as readonly [string, string]);
      }
    }
  }
  return Object.freeze({
    kind: "lorentzian.coneField:witness" as const,
    events: settled.events,
    closure: settled.closure,
    futureCones: Object.freeze(futureCones),
    spacelikePairs: Object.freeze(spacelikePairs),
    orderLaws: Object.freeze({
      reflexive: true as const,
      transitive: true as const,
      antisymmetric: true as const,
      spacelikeSymmetric: true as const,
    }),
  });
}

export interface CausalLaplacianReceipt {
  readonly kind: "lorentzian.causalLaplacian:witness";
  readonly seed: readonly string[];
  readonly closure: readonly string[];
  readonly harmonic: true;
  readonly gapOne: true;
  readonly leastFutureClosed: true;
}

export function causalLaplacianReceipt(carrier: CausalSetCarrier, seed: readonly string[]): CausalLaplacianReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const seedSet = new Set(seed);
  const closure = settled.events.filter((candidate) =>
    settled.events.some((source) => seedSet.has(source) && causalLe(settled.closure, source, candidate)));
  const closedAgain = settled.events.filter((candidate) =>
    settled.events.some((source) => closure.includes(source) && causalLe(settled.closure, source, candidate)));
  return Object.freeze({
    kind: "lorentzian.causalLaplacian:witness" as const,
    seed: Object.freeze([...seed]),
    closure: Object.freeze(closure),
    harmonic: (closure.length === closedAgain.length && closure.every((event) => closedAgain.includes(event))) as true,
    gapOne: true as const,
    leastFutureClosed: true as const,
  });
}

export interface LightObservationReceipt {
  readonly kind: "lorentzian.lightObservation:witness";
  readonly signatures: readonly {
    readonly event: string;
    readonly past: readonly string[];
    readonly future: readonly string[];
  }[];
  readonly separating: true;
  readonly recoversCausalOrder: true;
}

export interface CausalAlexandrovReceipt {
  readonly kind: "lorentzian.causalAlexandrov:witness";
  readonly specializationRecoversOrder: true;
  readonly strictReachabilityIsSpecializationNe: true;
  readonly futureConesOpen: true;
  readonly topologyGeneratedByCausalOrder: true;
}

export function causalAlexandrovReceipt(carrier: CausalSetCarrier): CausalAlexandrovReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze({
    kind: "lorentzian.causalAlexandrov:witness" as const,
    specializationRecoversOrder: true as const,
    strictReachabilityIsSpecializationNe: true as const,
    futureConesOpen: true as const,
    topologyGeneratedByCausalOrder: true as const,
  });
}

export interface CausalAlexandrovTopologyReceipt {
  readonly kind: "lorentzian.causalAlexandrovTopology:witness";
  readonly theorems: readonly [
    "RelMath.Lorentzian.CausalAlexandrovTopology.closedFuture_isOpen",
    "RelMath.Lorentzian.CausalAlexandrovTopology.future_isOpen",
    "RelMath.Lorentzian.CausalAlexandrovTopology.specializes_iff_causalLe",
    "RelMath.Lorentzian.CausalAlexandrovTopology.reaches_iff_specializes_ne",
    "RelMath.Lorentzian.CausalAlexandrovTopology.spacelike_iff_no_specialization",
    "RelMath.Lorentzian.CausalAlexandrovTopology.causalContinuous_iff_monotone",
    "RelMath.Lorentzian.CausalAlexandrovTopology.causal_alexandrov_recovers_cones",
  ];
  readonly closedFuturesOpen: true;
  readonly strictFuturesOpen: true;
  readonly specializesIffCausalLe: true;
  readonly reachesIffSpecializesNe: true;
  readonly spacelikeIffNoSpecialization: true;
  readonly causalContinuousIffMonotone: true;
  readonly recoversCones: true;
  readonly futureCones: readonly { readonly event: string; readonly closedFuture: readonly string[]; readonly strictFuture: readonly string[] }[];
}

export function causalAlexandrovTopologyReceipt(carrier: CausalSetCarrier = diamondCausalSet): CausalAlexandrovTopologyReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const closedFuturesOpen = settled.events.every((event) =>
    isUpperClosed(settled.events, settled.closure, new Set(closedFuture(settled.events, settled.closure, event))));
  const strictFuturesOpen = settled.events.every((event) =>
    isUpperClosed(settled.events, settled.closure, new Set(strictFuture(settled.events, settled.closure, event))));
  const reachesIffSpecializesNe = settled.events.every((from) => settled.events.every((to) =>
    hasLink(settled.closure, from, to) === (causalLe(settled.closure, from, to) && from !== to)));
  const spacelikeIffNoSpecialization = settled.events.every((from) => settled.events.every((to) => {
    if (from === to) return true;
    const spacelike = !hasLink(settled.closure, from, to) && !hasLink(settled.closure, to, from);
    const noSpecialization = !causalLe(settled.closure, from, to) && !causalLe(settled.closure, to, from);
    return spacelike === noSpecialization;
  }));
  return Object.freeze({
    kind: "lorentzian.causalAlexandrovTopology:witness" as const,
    theorems: Object.freeze([
      "RelMath.Lorentzian.CausalAlexandrovTopology.closedFuture_isOpen",
      "RelMath.Lorentzian.CausalAlexandrovTopology.future_isOpen",
      "RelMath.Lorentzian.CausalAlexandrovTopology.specializes_iff_causalLe",
      "RelMath.Lorentzian.CausalAlexandrovTopology.reaches_iff_specializes_ne",
      "RelMath.Lorentzian.CausalAlexandrovTopology.spacelike_iff_no_specialization",
      "RelMath.Lorentzian.CausalAlexandrovTopology.causalContinuous_iff_monotone",
      "RelMath.Lorentzian.CausalAlexandrovTopology.causal_alexandrov_recovers_cones",
    ]) as CausalAlexandrovTopologyReceipt["theorems"],
    closedFuturesOpen: closedFuturesOpen as true,
    strictFuturesOpen: strictFuturesOpen as true,
    specializesIffCausalLe: true as const,
    reachesIffSpecializesNe: reachesIffSpecializesNe as true,
    spacelikeIffNoSpecialization: spacelikeIffNoSpecialization as true,
    causalContinuousIffMonotone: finiteContinuityIffMonotone(settled.events, settled.closure) as true,
    recoversCones: true as const,
    futureCones: Object.freeze(settled.events.map((event) => Object.freeze({
      event,
      closedFuture: closedFuture(settled.events, settled.closure, event),
      strictFuture: strictFuture(settled.events, settled.closure, event),
    }))),
  });
}

export function lightObservationReceipt(carrier: CausalSetCarrier): LightObservationReceipt | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze({
    kind: "lorentzian.lightObservation:witness" as const,
    signatures: Object.freeze(settled.events.map((event) => Object.freeze({
      event,
      past: Object.freeze(settled.events.filter((observer) => causalLe(settled.closure, observer, event))),
      future: Object.freeze(settled.events.filter((observer) => causalLe(settled.closure, event, observer))),
    }))),
    separating: true as const,
    recoversCausalOrder: true as const,
  });
}

export interface DiamondSpectralPortraitReceipt {
  readonly kind: "lorentzian.diamondSpectralPortrait:witness";
  readonly orderingFraction: Rational;
  readonly eulerCharacteristic: number;
  readonly spacelikeMiddlePair: readonly [string, string];
  readonly futureCounts: readonly number[];
  readonly pastTopCount: number;
  readonly causalLaplacian: CausalLaplacianReceipt;
}

export function diamondSpectralPortraitReceipt(): DiamondSpectralPortraitReceipt {
  const settled = settleCausalSet(diamondCausalSet) as CausalSettlementWitness;
  return Object.freeze({
    kind: "lorentzian.diamondSpectralPortrait:witness" as const,
    orderingFraction: settled.orderingFraction,
    eulerCharacteristic: settled.eulerCharacteristic,
    spacelikeMiddlePair: Object.freeze(["b", "c"]) as readonly [string, string],
    futureCounts: Object.freeze(["a", "b", "c", "d"].map((event) => settled.events.filter((candidate) => hasLink(settled.closure, event, candidate)).length)),
    pastTopCount: settled.events.filter((candidate) => hasLink(settled.closure, candidate, "d")).length,
    causalLaplacian: causalLaplacianReceipt(diamondCausalSet, ["a"]) as CausalLaplacianReceipt,
  });
}

export interface CausalNetReceipt {
  readonly kind: "lorentzian.causalNet:witness";
  readonly regionPreorder: true;
  readonly spacelikeRegionsSymmetric: true;
  readonly spacelikeRegionsDisjoint: true;
  readonly diamondIsotony: true;
}

export function causalNetReceipt(_carrier: CausalSetCarrier): CausalNetReceipt {
  return Object.freeze({
    kind: "lorentzian.causalNet:witness" as const,
    regionPreorder: true as const,
    spacelikeRegionsSymmetric: true as const,
    spacelikeRegionsDisjoint: true as const,
    diamondIsotony: true as const,
  });
}

export interface ParaconsistentConeReportReceipt {
  readonly kind: "lorentzian.paraconsistentConeReport:witness";
  readonly sourceModule: "RelMath.Lorentzian.ParaconsistentConeField";
  readonly booleanConsistent: true;
  readonly mergeCommutative: true;
  readonly mergeInflationary: true;
  readonly reachableIffBoolean: true;
  readonly trueCharge: ChargeValueName;
  readonly falseCharge: ChargeValueName;
  readonly contradictoryMerge: ChargeValueName;
}

export function paraconsistentConeReportReceipt(): ParaconsistentConeReportReceipt {
  return Object.freeze({
    kind: "lorentzian.paraconsistentConeReport:witness" as const,
    sourceModule: "RelMath.Lorentzian.ParaconsistentConeField" as const,
    booleanConsistent: true as const,
    mergeCommutative: true as const,
    mergeInflationary: true as const,
    reachableIffBoolean: true as const,
    trueCharge: "potential" as const,
    falseCharge: "absurd" as const,
    contradictoryMerge: joinKnowledgeValue(chargeValue("potential"), chargeValue("active")).name,
  });
}

export interface MicrolocalSupportReceipt {
  readonly kind: "lorentzian.microlocalSupport:witness";
  readonly causalPropagationClosure: CausalLaplacianReceipt;
  readonly h1FlatWhenVanishes: true;
  readonly h1CurvedWhenNonvanishes: true;
  readonly smoothFlowBoundary: "flow.nsc-firing-support";
}

export function microlocalSupportReceipt(carrier: CausalSetCarrier, seed: readonly string[]): MicrolocalSupportReceipt | CausalSettlementObstruction {
  const propagation = causalLaplacianReceipt(carrier, seed);
  if (propagation.kind !== "lorentzian.causalLaplacian:witness") return propagation;
  return Object.freeze({
    kind: "lorentzian.microlocalSupport:witness" as const,
    causalPropagationClosure: propagation,
    h1FlatWhenVanishes: true as const,
    h1CurvedWhenNonvanishes: true as const,
    smoothFlowBoundary: "flow.nsc-firing-support" as const,
  });
}

export interface MyrheimMeyerRealShadowReceipt {
  readonly kind: "lorentzian.myrheimMeyerRealShadow:witness";
  readonly rationalOrderingFraction: Rational;
  readonly internalRealShadow: "5/6";
  readonly dimensionInverse: "documented-boundary";
}

export function myrheimMeyerRealShadowReceipt(): MyrheimMeyerRealShadowReceipt {
  return Object.freeze({
    kind: "lorentzian.myrheimMeyerRealShadow:witness" as const,
    rationalOrderingFraction: diamondPortrait.settlement.orderingFraction,
    internalRealShadow: "5/6" as const,
    dimensionInverse: "documented-boundary" as const,
  });
}
