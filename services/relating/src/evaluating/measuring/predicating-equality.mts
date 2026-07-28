/**
 * RMN normalizers for finite predicating equality receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const predicatingEqualityReceiptTerm: Tm = tm.lam(tm.var(0));
export const predicatingTruthQuantifierTerm: Tm = tm.lam(tm.var(0));
