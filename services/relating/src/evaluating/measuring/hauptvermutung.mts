/**
 * RMN normalizer for the finite Hauptvermutung fingerprint receipt.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const receiptTerm: Tm = tm.lam(tm.var(0));
