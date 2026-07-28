import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for finite aperiodic cl-inv/moduli/direct-limit receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Aperiodic.AperiodicSettleFrame`. */
export const aperiodicSettleFrameTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Aperiodic.ClassificationReduction`. */
export const classificationReductionTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Aperiodic.GeometricMldComplete`. */
export const geometricMldCompleteTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Aperiodic.UpToClosureCoinduction`. */
export const upToClosureCoinductionTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Aperiodic.TransfiniteUpToClosure`. */
export const transfiniteUpToClosureTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Cohomology.Defect`. */
export const defectTerm: Tm = tm.lam(tm.var(0));
