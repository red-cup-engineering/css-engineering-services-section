/**
 * RMN normalizers for finite chromatic-Lorentzian settling and action receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const receiptTerm: Tm = tm.lam(tm.var(0));
export const actionReceiptTerm: Tm = tm.lam(tm.var(0));
