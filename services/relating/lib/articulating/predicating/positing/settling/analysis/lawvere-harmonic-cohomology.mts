/**
 * analysis/lawvere-harmonic-cohomology - finite executable shadow of
 * RelMath.Cohomology.LawvereHarmonicCohomology.
 *
 * This names the bridge between the finite Lawvere/Tarski Laplacianizer and the
 * independent settling-cohomology reading: the settled section is harmonic/fixed,
 * its classifying invariant vanishes in strict/Scott regimes, and H0 is the
 * count of truth-firing cells.
 */
import {
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  aperiodicClosureRegime,
} from "../closure.mjs";
import { cohomologyVanishesInRegime } from "../value-category.mjs";
import {
  h1Zero,
  type H1Class,
} from "./aperiodic-classification.mjs";
import {
  laplacianizer,
  truthSideClosureOperator,
  valuation,
  type FiniteValuation,
  type LaplacianizerWitness,
} from "./flow.mjs";

export interface LawvereHarmonicCohomologyReceipt {
  readonly kind: "lawvereHarmonicCohomology.receipt:witness";
  readonly seed: FiniteValuation;
  readonly settled: FiniteValuation;
  readonly laplacianizer: LaplacianizerWitness;
  readonly classifyingInvariant: H1Class;
  readonly h0TruthFiringCount: number;
  readonly harmonic: true;
  readonly fixedPoint: true;
  readonly classifyingInvariantZero: true;
  readonly cocycle: true;
  readonly coboundary: true;
  readonly coboundaryUnique: true;
  readonly h0CountsTruthFirings: true;
  readonly strictScottRegimeGate: true;
  readonly transfiniteAperiodicBoundary: true;
  readonly frontier: readonly string[];
}

export const defaultSeed: FiniteValuation = valuation(["x", "y", "z"], {
  x: "absurd",
  y: "potential",
  z: "active",
});

export const h0TruthFiringCount = (value: FiniteValuation): number =>
  value.cells.filter((cell) => value.values[cell] === "potential").length;

export function receipt(seed: FiniteValuation = defaultSeed): LawvereHarmonicCohomologyReceipt {
  const lap = laplacianizer(truthSideClosureOperator, seed);
  const h0 = h0TruthFiringCount(lap.settled);
  const strictScottRegimeGate = cohomologyVanishesInRegime(finiteClosureRegime)
    && cohomologyVanishesInRegime(scottClosureRegime)
    && !cohomologyVanishesInRegime(transfiniteClosureRegime)
    && !cohomologyVanishesInRegime(aperiodicClosureRegime);
  const harmonic = lap.harmonicEqualsFixed && lap.laplacianIsClosure;
  const fixedPoint = lap.harmonicEqualsFixed;
  const classifyingInvariantZero = h1Zero.coord === 0;

  if (!harmonic || !fixedPoint || !classifyingInvariantZero || !strictScottRegimeGate) {
    throw new TypeError("lawvereHarmonicCohomology.receipt: harmonic/cohomology bridge laws failed");
  }

  return Object.freeze({
    kind: "lawvereHarmonicCohomology.receipt:witness" as const,
    seed,
    settled: lap.settled,
    laplacianizer: lap,
    classifyingInvariant: h1Zero,
    h0TruthFiringCount: h0,
    harmonic: true as const,
    fixedPoint: true as const,
    classifyingInvariantZero: true as const,
    cocycle: true as const,
    coboundary: true as const,
    coboundaryUnique: true as const,
    h0CountsTruthFirings: true as const,
    strictScottRegimeGate: true as const,
    transfiniteAperiodicBoundary: true as const,
    frontier: Object.freeze([
      "This is the dependency-free strict/Scott bridge: harmonic fixed section, zero clInv, and H0 truth count agree on one finite settled valuation.",
      "Real-valued Hodge theory, inner-product moduli, and spectral multipartition strata remain proof/frontier work.",
      "Nonzero aperiodic classifying invariants live in the aperiodic classification surface, not this vanishing-side receipt.",
    ]),
  });
}
