/**
 * evaluating/measuring/recurrence — RMN normalizers for finite Step-N recurrence receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** Normalize a finite Step-N all-equal witness or obstruction. */
export const stepNAllEqualTerm: Tm = tm.lam(tm.var(0));

/** Normalize a finite substitution growth-degree witness or obstruction. */
export const growthDegreeTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite Step-N co-incrementing hierarchy carrier. */
export const stepNHierarchyTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite Fibonacci/Padovan substitution-primitivity receipt. */
export const substitutionPrimitivityTerm: Tm = tm.lam(tm.var(0));
