/**
 * RMN normalizers for finite closure-rule-system receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const closureRuleReceiptTerm: Tm = tm.lam(tm.var(0));
export const closureRuleAlwaysTerm: Tm = tm.lam(tm.var(0));
