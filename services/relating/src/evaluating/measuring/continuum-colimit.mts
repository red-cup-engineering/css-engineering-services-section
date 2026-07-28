/**
 * RMN normalizer for the finite continuum-colimit receipt.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const receiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Lorentzian.ChuActionColimit`. */
export const chuInformationActionTerm: Tm = tm.lam(tm.var(0));
