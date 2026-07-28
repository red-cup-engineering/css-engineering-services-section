/**
 * evaluating/measuring/spectral - RMN normalizers for exact finite spectral
 * polynomial and matrix receipts.
 *
 * The exact spectral model computes the carrier evidence. These RMN terms make
 * the resulting root-location, Pisot, resultant/intersection, inversion,
 * dominant-root, Mahler, and matrix-Pisot receipts portable as data.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** Normalize exact root-location witness/obstruction carriers. */
export const rootLocationTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact Pisot witness/obstruction carriers. */
export const pisotRootTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact polynomial identity witness/obstruction carriers. */
export const polynomialIdentityTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact resultant-based root-intersection witness/obstruction carriers. */
export const rootIntersectionTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact polynomial reciprocal/intersection carriers. */
export const inversionSymmetryTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact dominant-root convergence witness/obstruction carriers. */
export const dominantRootConvergenceTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact Mahler-measure witness/obstruction carriers. */
export const mahlerMeasureTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact matrix characteristic-polynomial/Pisot carriers. */
export const matrixPisotTerm: Tm = tm.lam(tm.var(0));
