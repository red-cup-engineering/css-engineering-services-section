/**
 * RMN normalizers for finite lax-idempotence/antisymmetry receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const kzStrictCollapseTerm: Tm = tm.lam(tm.var(0));
export const laxSlackAntisymmetryFailureTerm: Tm = tm.lam(tm.var(0));
export const chargeNoLaxSlackTerm: Tm = tm.lam(tm.var(0));
export const preValueCategoryReceiptTerm: Tm = tm.lam(tm.var(0));
