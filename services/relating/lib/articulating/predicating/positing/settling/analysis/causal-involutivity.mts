/**
 * analysis/causal-involutivity - finite bicharacteristic propagation reads.
 *
 * Executable shadow for `RelMath.Lorentzian.CausalInvolutivity`: on finite
 * causal triangles, a closed 1-cochain is additive along composable
 * bicharacteristic edges, so a nonzero composite wavefront decomposes onto a
 * nonzero leg.
 */
import type { CausalSetCarrier } from "./causal.mjs";
import {
  causalTriangles,
  diamondCarrier,
  polForm,
  type ColorAssignment,
  type CausalTriangle,
} from "./causal-polarization.mjs";

export interface CausalEdge {
  readonly from: string;
  readonly to: string;
}

export type EdgeCochain = (edge: CausalEdge) => number;

export interface BicharacteristicTriangle {
  readonly edge01: CausalEdge;
  readonly edge12: CausalEdge;
  readonly edge02: CausalEdge;
}

export interface CausalInvolutivityReceipt {
  readonly kind: "lorentzian.causalInvolutivity:witness";
  readonly triangles: readonly BicharacteristicTriangle[];
  readonly edgesComposable: true;
  readonly cocycleAdditive: true;
  readonly wavefrontInvolutive: true;
  readonly bicharacteristicCausal: true;
  readonly bridgeBoundary: "symplectic Hamiltonian flow remains frontier";
}

function edge(from: string, to: string): CausalEdge {
  return Object.freeze({ from, to });
}

function bicharacteristicTriangle(triangle: CausalTriangle): BicharacteristicTriangle {
  return Object.freeze({
    edge01: edge(triangle.a, triangle.b),
    edge12: edge(triangle.b, triangle.c),
    edge02: edge(triangle.a, triangle.c),
  });
}

/** The two legs of a causal 2-simplex are bicharacteristic-composable. */
export function bicharacteristicComposable(left: CausalEdge, right: CausalEdge): boolean {
  return left.to === right.from;
}

/** List the causal 2-simplices as composable bicharacteristic triangles. */
export function bicharacteristicTriangles(carrier: CausalSetCarrier): readonly BicharacteristicTriangle[] {
  return Object.freeze(causalTriangles(carrier).map(bicharacteristicTriangle));
}

/** A 1-cochain is additive on every causal triangle: `phi(ac)=phi(ab)+phi(bc)`. */
export function cocycleAdditive(carrier: CausalSetCarrier, cochain: EdgeCochain): boolean {
  return bicharacteristicTriangles(carrier).every((triangle) =>
    cochain(triangle.edge02) === cochain(triangle.edge01) + cochain(triangle.edge12));
}

/** A nonzero composite wavefront has at least one nonzero bicharacteristic leg. */
export function wavefrontInvolutive(carrier: CausalSetCarrier, cochain: EdgeCochain): boolean {
  return bicharacteristicTriangles(carrier).every((triangle) =>
    cochain(triangle.edge02) === 0 || cochain(triangle.edge01) !== 0 || cochain(triangle.edge12) !== 0);
}

/** Exact colour coboundary `dc` as a causal edge cochain. */
export function colorCoboundary(colors: ColorAssignment): EdgeCochain {
  return (causalEdge) => polForm(colors, causalEdge.from, causalEdge.to);
}

/** Bundle the finite propagation content of causal involutivity. */
export function causalInvolutivityReceipt(
  carrier: CausalSetCarrier = diamondCarrier,
  colors: ColorAssignment = Object.freeze({ a: 0, b: 1, c: 1, d: 2 }),
): CausalInvolutivityReceipt {
  const triangles = bicharacteristicTriangles(carrier);
  const cochain = colorCoboundary(colors);
  const composable = triangles.every((triangle) => bicharacteristicComposable(triangle.edge01, triangle.edge12));
  const additive = cocycleAdditive(carrier, cochain);
  const involutive = wavefrontInvolutive(carrier, cochain);
  if (!composable || !additive || !involutive) {
    throw new TypeError("causalInvolutivity.receipt: finite bicharacteristic laws failed");
  }

  return Object.freeze({
    kind: "lorentzian.causalInvolutivity:witness" as const,
    triangles,
    edgesComposable: true as const,
    cocycleAdditive: true as const,
    wavefrontInvolutive: true as const,
    bicharacteristicCausal: true as const,
    bridgeBoundary: "symplectic Hamiltonian flow remains frontier" as const,
  });
}
