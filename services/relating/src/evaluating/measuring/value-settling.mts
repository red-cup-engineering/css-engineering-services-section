/**
 * RMN normalizers for finite value-category settling and optimization receipts.
 *
 * The law checks live in `@lenticule-science/articulating/predicating/positing/settling`; these normalizers carry
 * the resulting finite witness/obstruction objects as Relation Model Notation.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const partialOrderTerm: Tm = tm.lam(tm.var(0));
export const closureLawTerm: Tm = tm.lam(tm.var(0));
export const settleFixedPointTerm: Tm = tm.lam(tm.var(0));
export const settleLeastTerm: Tm = tm.lam(tm.var(0));
export const fourRegimeValueIndependentTerm: Tm = tm.lam(tm.var(0));
export const spineRecoveryTerm: Tm = tm.lam(tm.var(0));
export const optimizationTerm: Tm = tm.lam(tm.var(0));
export const dequantizationTerm: Tm = tm.lam(tm.var(0));
export const magnitudeWitnessTerm: Tm = tm.lam(tm.var(0));
