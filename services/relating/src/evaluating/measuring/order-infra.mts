/**
 * RMN normalizers for finite OrderInfra receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const preorderTerm: Tm = tm.lam(tm.var(0));
export const partialOrderTerm: Tm = tm.lam(tm.var(0));
export const monotoneMapTerm: Tm = tm.lam(tm.var(0));
export const latticeTerm: Tm = tm.lam(tm.var(0));
export const boundedLatticeTerm: Tm = tm.lam(tm.var(0));
export const distributiveLatticeTerm: Tm = tm.lam(tm.var(0));
export const completeLatticeTerm: Tm = tm.lam(tm.var(0));
