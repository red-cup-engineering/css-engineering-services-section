/**
 * analysis/causal-mld-classification - finite causal H1/MLD class reads.
 *
 * Executable shadows for `RelMath.Lorentzian.CausalMLDClassification` and
 * `RelMath.Lorentzian.CausalMldCohomology`: same-class cochains differ by a
 * coboundary, factor-map pullback preserves that class, and the finite
 * coboundary relation forms the cohomological MLD groupoid.
 */
import {
  delta,
  pullback,
  type Cochain,
  type EventMap,
} from "./causal-manifoldlikeness.mjs";
import {
  bipartiteColoring,
  hasBoolPolarization,
  triangleCarrier,
} from "./causal-polarization.mjs";
import type { CausalSetCarrier } from "./causal.mjs";

export type { Cochain, EventMap };

export interface CausalMldClassificationReceipt {
  readonly kind: "lorentzian.causalMldClassification:witness";
  readonly sameClassReflexive: true;
  readonly sameClassSymmetric: true;
  readonly sameClassTransitive: true;
  readonly pullbackSameClass: true;
  readonly flatClinvCollapse: true;
  readonly oddCycleObstruction: true;
  readonly cohomologicalMldGroupoid: true;
  readonly invariantStep: "factor-map pullback preserves causal H1 class";
  readonly completenessBoundary: "equal H1 forcing carrier-level MLD remains frontier";
}

const zero: Cochain = () => 0;

const negate = (cochain: Cochain): Cochain => (chain) => -cochain(chain);
const add = (left: Cochain, right: Cochain): Cochain => (chain) => left(chain) + right(chain);

/** `SameClass phi psi` on finite samples: `phi - psi = delta primitive`. */
export function sameClass(
  phi: Cochain,
  psi: Cochain,
  primitive: Cochain,
  chains: readonly (readonly string[])[],
): boolean {
  const boundary = delta(primitive);
  return chains.every((chain) => phi(chain) - psi(chain) === boundary(chain));
}

/** Reflexivity: a cochain differs from itself by the zero coboundary. */
export function sameClassRefl(phi: Cochain, chains: readonly (readonly string[])[]): boolean {
  return sameClass(phi, phi, zero, chains);
}

/** Symmetry: invert a same-class arrow by negating the primitive. */
export function sameClassSymm(
  phi: Cochain,
  psi: Cochain,
  primitive: Cochain,
  chains: readonly (readonly string[])[],
): boolean {
  return sameClass(phi, psi, primitive, chains) && sameClass(psi, phi, negate(primitive), chains);
}

/** Transitivity: compose same-class arrows by adding their primitives. */
export function sameClassTrans(
  phi: Cochain,
  psi: Cochain,
  rho: Cochain,
  leftPrimitive: Cochain,
  rightPrimitive: Cochain,
  chains: readonly (readonly string[])[],
): boolean {
  return sameClass(phi, psi, leftPrimitive, chains)
    && sameClass(psi, rho, rightPrimitive, chains)
    && sameClass(phi, rho, add(leftPrimitive, rightPrimitive), chains);
}

/** Factor-map pullback preserves same-class cochains on finite samples. */
export function pullbackSameClass(
  map: EventMap,
  phi: Cochain,
  psi: Cochain,
  primitive: Cochain,
  sourceChains: readonly (readonly string[])[],
): boolean {
  return sameClass(pullback(map, phi), pullback(map, psi), pullback(map, primitive), sourceChains);
}

/** The flat causal cl-inv collapses exactly when a Bool polarization exists. */
export function flatClinvCollapse(carrier: CausalSetCarrier): boolean {
  return hasBoolPolarization(carrier) === (bipartiteColoring(carrier) !== undefined);
}

/** The all-degree cohomological MLD groupoid laws as finite coboundary checks. */
export function cohomologicalMldGroupoid(
  phi: Cochain,
  psi: Cochain,
  rho: Cochain,
  leftPrimitive: Cochain,
  rightPrimitive: Cochain,
  chains: readonly (readonly string[])[],
): boolean {
  return sameClassRefl(phi, chains)
    && sameClassSymm(phi, psi, leftPrimitive, chains)
    && sameClassTrans(phi, psi, rho, leftPrimitive, rightPrimitive, chains);
}

/** Bundle the finite causal H1/MLD classification invariant. */
export function causalMldClassificationReceipt(): CausalMldClassificationReceipt {
  const chains = Object.freeze([
    Object.freeze(["a"]) as readonly string[],
    Object.freeze(["a", "b"]) as readonly string[],
    Object.freeze(["a", "b", "d"]) as readonly string[],
  ]);
  const sourceChains = Object.freeze([
    Object.freeze(["p"]) as readonly string[],
    Object.freeze(["p", "q"]) as readonly string[],
    Object.freeze(["p", "q", "r"]) as readonly string[],
  ]);
  const map = Object.freeze({ p: "a", q: "b", r: "d" });
  const chi: Cochain = (chain) => chain.length * 2;
  const eta: Cochain = (chain) => chain.reduce((sum, event) => sum + event.charCodeAt(0), 0);
  const phi: Cochain = (chain) => chain.reduce((sum, event) => sum + event.length, chain.length);
  const psi: Cochain = (chain) => phi(chain) - delta(chi)(chain);
  const rho: Cochain = (chain) => psi(chain) - delta(eta)(chain);

  const reflexive = sameClassRefl(phi, chains);
  const symmetric = sameClassSymm(phi, psi, chi, chains);
  const transitive = sameClassTrans(phi, psi, rho, chi, eta, chains);
  const invariant = pullbackSameClass(map, phi, psi, chi, sourceChains);
  const flatCollapse = flatClinvCollapse({
    kind: "lorentzian.causalSet" as const,
    events: Object.freeze(["x", "y"]),
    links: Object.freeze([Object.freeze({ from: "x", to: "y" })]),
  });
  const oddObstruction = !hasBoolPolarization(triangleCarrier);
  const groupoid = cohomologicalMldGroupoid(phi, psi, rho, chi, eta, chains);

  if (!reflexive || !symmetric || !transitive || !invariant || !flatCollapse || !oddObstruction || !groupoid) {
    throw new TypeError("causalMldClassification.receipt: finite MLD classification laws failed");
  }

  return Object.freeze({
    kind: "lorentzian.causalMldClassification:witness" as const,
    sameClassReflexive: true as const,
    sameClassSymmetric: true as const,
    sameClassTransitive: true as const,
    pullbackSameClass: true as const,
    flatClinvCollapse: true as const,
    oddCycleObstruction: true as const,
    cohomologicalMldGroupoid: true as const,
    invariantStep: "factor-map pullback preserves causal H1 class" as const,
    completenessBoundary: "equal H1 forcing carrier-level MLD remains frontier" as const,
  });
}
