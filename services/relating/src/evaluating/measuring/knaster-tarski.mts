/**
 * RMN normalizers for finite Knaster-Tarski fixed-point receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const fixedPointsTerm: Tm = tm.lam(tm.var(0));
