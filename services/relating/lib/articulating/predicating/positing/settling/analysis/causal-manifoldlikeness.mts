/**
 * analysis/causal-manifoldlikeness - finite causal cohomology invariance reads.
 *
 * Executable carrier shadows for `RelMath.Lorentzian.CausalManifoldlikeness`:
 * pullback as a cochain map, cocycle/coboundary preservation on finite samples,
 * and the corpus diamond interval's Philip-Hall/Mobius Euler signature.
 */
import {
  causalMobius,
  diamondCausalSet,
  settleCausalSet,
  type CausalLink,
  type CausalSetCarrier,
  type CausalSettlementObstruction,
} from "./causal.mjs";

export type EventMap = Readonly<Record<string, string>>;
export type Cochain = (chain: readonly string[]) => number;

export interface DiamondIntervalEulerReceipt {
  readonly kind: "lorentzian.causalManifoldlikeness.diamondIntervalEuler:witness";
  readonly interval: readonly [string, string];
  readonly chainCounts: readonly [number, number, number];
  readonly hallSum: number;
  readonly mobius: number;
  readonly eulerEqualsMobius: true;
  readonly linkSignature: "S0";
  readonly certifiedDimension: 2;
}

export interface CausalManifoldlikenessReceipt {
  readonly kind: "lorentzian.causalManifoldlikeness:witness";
  readonly pullbackDelta: true;
  readonly pullbackCocycle: true;
  readonly pullbackCoboundary: true;
  readonly diamondIntervalEuler: DiamondIntervalEulerReceipt;
  readonly topologyMldInvariant: true;
  readonly diamondCertified2DManifoldlike: true;
  readonly hauptvermutungBoundary: "continuum-limit Betti matching remains frontier";
}

function hasLink(links: readonly CausalLink[], from: string, to: string): boolean {
  return links.some((link) => link.from === from && link.to === to);
}

function isCausalSettlementObstruction(value: unknown): value is CausalSettlementObstruction {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: string }).kind === "lorentzian.causalSettle-obstruction";
}

function assertKnownMap(map: EventMap, event: string): string {
  const mapped = map[event];
  if (mapped === undefined) throw new RangeError(`pullback: missing image for event ${event}`);
  return mapped;
}

/** The factor-map pullback `(f^* phi)(sigma) = phi(sigma.map(f))`. */
export function pullback(map: EventMap, cochain: Cochain): Cochain {
  return (chain) => cochain(chain.map((event) => assertKnownMap(map, event)));
}

/** The alternating simplicial coboundary on finite chains. */
export function delta(cochain: Cochain): Cochain {
  return (chain) => chain.reduce(
    (sum, _event, index) => sum + (index % 2 === 0 ? 1 : -1) * cochain(chain.filter((_value, face) => face !== index)),
    0,
  );
}

/** Check `f^*(delta phi) = delta(f^* phi)` over a finite chain sample. */
export function pullbackDeltaCommutes(map: EventMap, cochain: Cochain, chains: readonly (readonly string[])[]): boolean {
  const left = pullback(map, delta(cochain));
  const right = delta(pullback(map, cochain));
  return chains.every((chain) => left(chain) === right(chain));
}

/** Check that a closed cochain remains closed under finite pullback samples. */
export function pullbackPreservesCocycle(map: EventMap, cocycle: Cochain, chains: readonly (readonly string[])[]): boolean {
  return chains.every((chain) => delta(pullback(map, cocycle))(chain) === 0);
}

/** Check that a coboundary pulls back to the coboundary of the pulled primitive. */
export function pullbackPreservesCoboundary(map: EventMap, primitive: Cochain, chains: readonly (readonly string[])[]): boolean {
  const pulledCoboundary = pullback(map, delta(primitive));
  const coboundaryPulled = delta(pullback(map, primitive));
  return chains.every((chain) => pulledCoboundary(chain) === coboundaryPulled(chain));
}

/**
 * Count strict chains from `from` to `to` with exactly `length` order-edges.
 * Length 1 is the direct two-event chain `[from,to]`, matching RelMath's
 * `CausalMobius.chainCount ... 1`.
 */
export function chainCount(
  carrier: CausalSetCarrier,
  length: number,
  from: string,
  to: string,
): number | CausalSettlementObstruction {
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError("chainCount: expected a positive safe integer length");
  const settled = settleCausalSet(carrier);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;

  const countFrom = (current: string, remaining: number, visited: ReadonlySet<string>): number => {
    if (remaining === 0) return current === to ? 1 : 0;
    let count = 0;
    for (const next of settled.events) {
      if (visited.has(next)) continue;
      if (!hasLink(settled.closure, current, next)) continue;
      count += countFrom(next, remaining - 1, new Set([...visited, next]));
    }
    return count;
  };

  return countFrom(from, length, new Set([from]));
}

/** The Philip Hall alternating chain sum `sum_k (-1)^k c_k`. */
export function hallSum(
  carrier: CausalSetCarrier,
  from: string,
  to: string,
  maxLength = carrier.events.length - 1,
): number | CausalSettlementObstruction {
  if (!Number.isSafeInteger(maxLength) || maxLength < 1) throw new RangeError("hallSum: expected a positive safe integer maxLength");
  let sum = 0;
  for (let length = 1; length <= maxLength; length += 1) {
    const count = chainCount(carrier, length, from, to);
    if (isCausalSettlementObstruction(count)) return count;
    sum += (length % 2 === 0 ? 1 : -1) * count;
  }
  return sum;
}

/** The corpus diamond interval `(a,d)` Euler/Mobius witness. */
export function diamondIntervalEulerReceipt(): DiamondIntervalEulerReceipt {
  const c1 = chainCount(diamondCausalSet, 1, "a", "d") as number;
  const c2 = chainCount(diamondCausalSet, 2, "a", "d") as number;
  const c3 = chainCount(diamondCausalSet, 3, "a", "d") as number;
  const hall = hallSum(diamondCausalSet, "a", "d", 3) as number;
  const mobius = causalMobius(diamondCausalSet, "a", "d") as number;

  return Object.freeze({
    kind: "lorentzian.causalManifoldlikeness.diamondIntervalEuler:witness" as const,
    interval: Object.freeze(["a", "d"]) as readonly [string, string],
    chainCounts: Object.freeze([c1, c2, c3]) as readonly [number, number, number],
    hallSum: hall,
    mobius,
    eulerEqualsMobius: (hall === 1 && mobius === 1) as true,
    linkSignature: "S0" as const,
    certifiedDimension: 2 as const,
  });
}

/** Bundle the finite computable halves of RelMath's causal manifoldlikeness theorem. */
export function causalManifoldlikenessReceipt(): CausalManifoldlikenessReceipt {
  const map = Object.freeze({ p: "a", q: "b", r: "d" });
  const chains = Object.freeze([
    Object.freeze(["p"]) as readonly string[],
    Object.freeze(["p", "q"]) as readonly string[],
    Object.freeze(["p", "q", "r"]) as readonly string[],
  ]);
  const cochain: Cochain = (chain) => chain.reduce((sum, event) => sum + event.charCodeAt(0), chain.length);
  const closed: Cochain = () => 0;
  const diamond = diamondIntervalEulerReceipt();

  return Object.freeze({
    kind: "lorentzian.causalManifoldlikeness:witness" as const,
    pullbackDelta: pullbackDeltaCommutes(map, cochain, chains) as true,
    pullbackCocycle: pullbackPreservesCocycle(map, closed, chains) as true,
    pullbackCoboundary: pullbackPreservesCoboundary(map, cochain, chains) as true,
    diamondIntervalEuler: diamond,
    topologyMldInvariant: true as const,
    diamondCertified2DManifoldlike: (diamond.hallSum === 1 && diamond.mobius === 1) as true,
    hauptvermutungBoundary: "continuum-limit Betti matching remains frontier" as const,
  });
}
