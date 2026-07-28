/**
 * @packageDocumentation
 *
 * settling/bigraded-cohomology — the bigraded refinement of settling cohomology.
 *
 * The paraconsistent settling sheaf splits F^(k) ≅ F^(t) ⊕ F^(⊤): the consistent
 * TRUTH row (m=0) ⊕ the held-CONTRADICTION row (m=1), corresponding to the two adjoint
 * systems of the predication hyperdoctrine (content/…/settling-cohomology/content/
 * bigraded-settling-cohomology/bigraded-settling-cohomology.md). A FOUR cell is placed by
 * its twist-product coordinates ⟨truth, falsity⟩: exactly one evidence side present ↦ the
 * truth row (potential ⟨1,0⟩ / active ⟨0,1⟩, the non-contradictory directions); BOTH sides
 * present ↦ the contradiction row (stable ⟨1,1⟩ = told-both); neither ↦ absurd ⟨0,0⟩
 * (outside the F^(k) non-absurd content).
 *
 * Regime reading: when F^(⊤) = 0 the bigrading collapses to single-graded truth
 * cohomology (H^{1,n} = 0, H^{0,n} = H^n_t). Lean's
 * `RelMath/Cohomology/BigradedSettlingCohomology.lean` proves the two-row/mapping-cone
 * input data and the strict/Scott collapse reading at the cochain level; the
 * cohomology-level long exact sequence remains a frontier. This Node module implements
 * the executable FOUR-census read: truth row, contradiction row, and collapse
 * witness/obstruction.
 *
 * Pure proof-tree math, sited beside settling/cohomology; faculties parameterize it (a face
 * supplies its own FOUR census or settled charges; the decomposition law lives here).
 */
import type { ChargeValue, FourCensus } from "../bilattice-charge.mjs";

export type { FourCensus } from "../bilattice-charge.mjs";

/** Witness that the contradiction row F^(⊤) vanishes: the bigrading collapses to single-graded
 *  truth cohomology — the consistent (strict/Scott) regime, fully CALM-compatible. */
export interface BigradingCollapseWitness {
  readonly kind: "predication.bigradedCohomology.collapse:witness";
  readonly contradiction: number;
}

/** Obstruction recording a non-empty contradiction row F^(⊤): a genuinely 2-dimensional
 *  bigrading — an inconsistent (transfinite/aperiodic) settling with merged contradictions. */
export interface BigradingObstruction {
  readonly kind: "predication.bigradedCohomology.collapse-obstruction";
  readonly contradiction: number;
}

/** The result of the bigrading-collapse check: F^(⊤) = 0 (witness) or F^(⊤) ≠ 0 (obstruction). */
export type BigradingCollapseJudgment = BigradingCollapseWitness | BigradingObstruction;

/** The bigraded decomposition F^(k) ≅ F^(t) ⊕ F^(⊤) of a settled FOUR census. */
export interface BigradedCohomologyCarrier {
  readonly kind: "predication.bigradedCohomology.carrier";
  /** the m=0 TRUTH row F^(t): the consistent truth-content cells (exactly one evidence side present). */
  readonly truth: number;
  /** the m=1 CONTRADICTION row F^(⊤): the held-⊤ told-both cells (both evidence sides present). */
  readonly contradiction: number;
  /** the collapse judgment: F^(⊤) = 0 ⟺ the bigrading degenerates to single-graded truth cohomology. */
  readonly collapse: BigradingCollapseJudgment;
}

/** Whether the contradiction row vanishes (the bigrading collapses; the consistent CALM regime). */
export function bigradingCollapse(contradiction: number): BigradingCollapseJudgment {
  return contradiction === 0
    ? Object.freeze({ kind: "predication.bigradedCohomology.collapse:witness" as const, contradiction })
    : Object.freeze({ kind: "predication.bigradedCohomology.collapse-obstruction" as const, contradiction });
}

/** The bigraded settling-cohomology decomposition of a FOUR census: F^(t) = potential + active
 *  (the consistent truth directions), F^(⊤) = stable (the held contradictions). */
export function bigradedCohomology(census: FourCensus): BigradedCohomologyCarrier {
  const truth = census.potential + census.active;
  const contradiction = census.stable;
  return Object.freeze({
    kind: "predication.bigradedCohomology.carrier" as const,
    truth,
    contradiction,
    collapse: bigradingCollapse(contradiction),
  });
}

/** Place a single charge value in its bigraded row by its twist-product coordinates:
 *  both evidence sides present ↦ contradiction (⊤), exactly one ↦ truth, neither ↦ absurd (⊥). */
export function bigradedRow(value: ChargeValue): "truth" | "contradiction" | "absurd" {
  const [truthSide, falsitySide] = value.coordinates;
  const truthPresent = truthSide.name === "present";
  const falsityPresent = falsitySide.name === "present";
  if (truthPresent && falsityPresent) return "contradiction";
  if (truthPresent || falsityPresent) return "truth";
  return "absurd";
}

/** The bigraded decomposition of a list of settled charge values, read off their twist-product
 *  coordinates (the faithful charge-level form of `bigradedCohomology`). */
export function bigradedCohomologyOfCharges(values: readonly ChargeValue[]): BigradedCohomologyCarrier {
  const census = { absurd: 0, potential: 0, active: 0, stable: 0 };
  for (const value of values) {
    const row = bigradedRow(value);
    if (row === "contradiction") census.stable += 1;
    else if (row === "truth") census.potential += 1; // truth row F^(t) (sign folded; only the row rank matters)
    else census.absurd += 1;
  }
  return bigradedCohomology(census);
}
