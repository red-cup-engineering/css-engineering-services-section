/**
 * analysis/causal-microsupport - finite cone-confined microsupport reads.
 *
 * Executable shadow for `RelMath.Lorentzian.CausalMicrosupport`,
 * `ChargedMicrosupport`, and `CotangentMicrosupport`: support propagates by
 * causal future closure, cone emissions carry FOUR charges, and edge cochains
 * expose a finite cotangent wavefront projection.
 */
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  diamondCausalSet,
  settleCausalSet,
  type CausalLink,
  type CausalSetCarrier,
  type CausalSettlementObstruction,
} from "./causal.mjs";

export interface Codirection {
  readonly from: string;
  readonly to: string;
}

export type EdgeCochain = Readonly<Record<string, number>>;

export interface CausalMicrosupportReceipt {
  readonly kind: "lorentzian.causalMicrosupport:witness";
  readonly pointSupport: readonly string[];
  readonly upwardClosed: true;
  readonly idempotent: true;
  readonly spacelikeExcluded: true;
  readonly chargedOutsideCone: "absurd";
  readonly chargedCollision: "stable";
  readonly chargedAgreement: "potential";
  readonly mergeKnowledgeInflationary: true;
  readonly wavefront: readonly Codirection[];
  readonly singularSupport: readonly string[];
  readonly nonzeroClinvSingular: true;
  readonly bridgeBoundary: "smooth cotangent symplectic flow remains frontier";
}

const edgeKey = (edge: Codirection): string => `${edge.from}->${edge.to}`;

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

function hasLink(links: readonly CausalLink[], from: string, to: string): boolean {
  return links.some((link) => link.from === from && link.to === to);
}

function causalLe(carrier: CausalSetCarrier, from: string, to: string): boolean {
  return from === to || hasLink(carrier.links, from, to);
}

function knowledgeJoinName(left: ChargeValueName, right: ChargeValueName): ChargeValueName {
  return chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));
}

function knowledgeLeq(left: ChargeValueName, right: ChargeValueName): boolean {
  return knowledgeJoinName(left, right) === right;
}

/** The closed future cone `J+(source)`. */
export function closedFuture(carrier: CausalSetCarrier, source: string): readonly string[] | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  return Object.freeze(settled.events.filter((event) => causalLe(settled, source, event)));
}

/** The causal microsupport of a finite event section. */
export function microsupport(carrier: CausalSetCarrier, support: readonly string[]): readonly string[] | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  const seed = new Set(support);
  return Object.freeze(settled.events.filter((event) =>
    settled.events.some((source) => seed.has(source) && causalLe(settled, source, event))));
}

/** Microsupport is an up-set of the causal order. */
export function microsupportUpwardClosed(carrier: CausalSetCarrier, support: readonly string[]): boolean | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  const supported = new Set(microsupport(settled, support) as readonly string[]);
  return [...supported].every((event) =>
    settled.events.every((future) => !causalLe(settled, event, future) || supported.has(future)));
}

/** Propagating a microsupport again adds no events. */
export function microsupportIdempotent(carrier: CausalSetCarrier, support: readonly string[]): boolean | CausalSettlementObstruction {
  const once = microsupport(carrier, support);
  if (isObstruction(once)) return once;
  const twice = microsupport(carrier, once);
  if (isObstruction(twice)) return twice;
  return JSON.stringify(once) === JSON.stringify(twice);
}

/** Two events are spacelike when neither lies in the other's causal future. */
export function spacelike(carrier: CausalSetCarrier, left: string, right: string): boolean | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  return left !== right && !causalLe(settled, left, right) && !causalLe(settled, right, left);
}

/** A point source does not propagate to a spacelike-separated event. */
export function microsupportExcludesSpacelike(
  carrier: CausalSetCarrier,
  source: string,
  target: string,
): boolean | CausalSettlementObstruction {
  const separated = spacelike(carrier, source, target);
  if (isObstruction(separated)) return separated;
  if (!separated) return false;
  const support = microsupport(carrier, [source]);
  if (isObstruction(support)) return support;
  return !support.includes(target);
}

/** A charged source emits its charge inside the cone and `absurd` outside it. */
export function emit(
  carrier: CausalSetCarrier,
  source: string,
  charge: ChargeValueName,
  target: string,
): ChargeValueName | CausalSettlementObstruction {
  const settled = settledCarrier(carrier);
  if (isObstruction(settled)) return settled;
  return causalLe(settled, source, target) ? charge : "absurd";
}

/** Merge two charged cone emissions pointwise by knowledge join. */
export function emit2(
  carrier: CausalSetCarrier,
  leftSource: string,
  leftCharge: ChargeValueName,
  rightSource: string,
  rightCharge: ChargeValueName,
  target: string,
): ChargeValueName | CausalSettlementObstruction {
  const left = emit(carrier, leftSource, leftCharge, target);
  if (isObstruction(left)) return left;
  const right = emit(carrier, rightSource, rightCharge, target);
  if (isObstruction(right)) return right;
  return knowledgeJoinName(left, right);
}

/** Merging charged influences climbs the knowledge order. */
export function emit2Inflationary(
  carrier: CausalSetCarrier,
  source: string,
  charge: ChargeValueName,
  otherSource: string,
  otherCharge: ChargeValueName,
  target: string,
): boolean | CausalSettlementObstruction {
  const left = emit(carrier, source, charge, target);
  if (isObstruction(left)) return left;
  const merged = emit2(carrier, source, charge, otherSource, otherCharge, target);
  if (isObstruction(merged)) return merged;
  return knowledgeLeq(left, merged);
}

/** Direct causal edges as the finite cotangent/codirection carrier. */
export function codirections(carrier: CausalSetCarrier): readonly Codirection[] | CausalSettlementObstruction {
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze(settled.directLinks.map((link) => Object.freeze({ from: link.from, to: link.to })));
}

/** The wavefront set: codirections where the edge cochain is nonzero. */
export function wavefront(carrier: CausalSetCarrier, cochain: EdgeCochain): readonly Codirection[] | CausalSettlementObstruction {
  const edges = codirections(carrier);
  if (isObstruction(edges)) return edges;
  return Object.freeze(edges.filter((edge) => (cochain[edgeKey(edge)] ?? 0) !== 0));
}

/** The base singular support: projection of wavefront codirections to source events. */
export function singularSupport(carrier: CausalSetCarrier, cochain: EdgeCochain): readonly string[] | CausalSettlementObstruction {
  const wf = wavefront(carrier, cochain);
  if (isObstruction(wf)) return wf;
  return Object.freeze([...new Set(wf.map((edge) => edge.from))]);
}

export function emptyWavefrontCoboundary(carrier: CausalSetCarrier, cochain: EdgeCochain): boolean | CausalSettlementObstruction {
  const wf = wavefront(carrier, cochain);
  if (isObstruction(wf)) return wf;
  return wf.length === 0;
}

export function clinvNonzeroSingular(carrier: CausalSetCarrier, cochain: EdgeCochain, edge: Codirection): boolean | CausalSettlementObstruction {
  const support = singularSupport(carrier, cochain);
  if (isObstruction(support)) return support;
  return (cochain[edgeKey(edge)] ?? 0) !== 0 && support.includes(edge.from);
}

/** Bundle the finite causal/charged/cotangent microsupport laws. */
export function causalMicrosupportReceipt(carrier: CausalSetCarrier = diamondCausalSet): CausalMicrosupportReceipt | CausalSettlementObstruction {
  const pointSupport = microsupport(carrier, ["a"]);
  if (isObstruction(pointSupport)) return pointSupport;
  const upward = microsupportUpwardClosed(carrier, ["a"]);
  if (isObstruction(upward)) return upward;
  const idem = microsupportIdempotent(carrier, ["a"]);
  if (isObstruction(idem)) return idem;
  const spacelikeExcluded = microsupportExcludesSpacelike(carrier, "b", "c");
  if (isObstruction(spacelikeExcluded)) return spacelikeExcluded;
  const outside = emit(carrier, "b", "potential", "c");
  if (isObstruction(outside)) return outside;
  const collision = emit2(carrier, "b", "potential", "c", "active", "d");
  if (isObstruction(collision)) return collision;
  const agreement = emit2(carrier, "b", "potential", "c", "potential", "d");
  if (isObstruction(agreement)) return agreement;
  const inflationary = emit2Inflationary(carrier, "b", "potential", "c", "active", "d");
  if (isObstruction(inflationary)) return inflationary;
  const cochain = Object.freeze({ "a->b": 1, "a->c": 0, "a->d": 0, "b->d": 2, "c->d": 0 });
  const wf = wavefront(carrier, cochain);
  if (isObstruction(wf)) return wf;
  const singular = singularSupport(carrier, cochain);
  if (isObstruction(singular)) return singular;
  const nonzero = clinvNonzeroSingular(carrier, cochain, Object.freeze({ from: "a", to: "b" }));
  if (isObstruction(nonzero)) return nonzero;

  if (!upward || !idem || !spacelikeExcluded || outside !== "absurd" || collision !== "stable" || agreement !== "potential" || !inflationary || !nonzero) {
    throw new TypeError("causalMicrosupport.receipt: finite microsupport laws failed");
  }

  return Object.freeze({
    kind: "lorentzian.causalMicrosupport:witness" as const,
    pointSupport,
    upwardClosed: true as const,
    idempotent: true as const,
    spacelikeExcluded: true as const,
    chargedOutsideCone: "absurd" as const,
    chargedCollision: "stable" as const,
    chargedAgreement: "potential" as const,
    mergeKnowledgeInflationary: true as const,
    wavefront: wf,
    singularSupport: singular,
    nonzeroClinvSingular: true as const,
    bridgeBoundary: "smooth cotangent symplectic flow remains frontier" as const,
  });
}
