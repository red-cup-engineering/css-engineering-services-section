/**
 * evaluating/measuring/dynamics — RMN normalizers for finite substitution-dynamics receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** Normalize a finite MLD invariant carrier. */
export const mldInvariantTerm: Tm = tm.lam(tm.var(0));

/** Normalize a finite MLD witness or obstruction. */
export const mutuallyLocallyDerivableTerm: Tm = tm.lam(tm.var(0));

/** Normalize a finite inverse-hull thread witness or obstruction. */
export const hullThreadTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite hull/colimit seam invariant. */
export const hullSeamTerm: Tm = tm.lam(tm.var(0));
