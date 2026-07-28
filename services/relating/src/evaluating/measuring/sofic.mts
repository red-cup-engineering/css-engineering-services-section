/**
 * evaluating/measuring/sofic — RMN normalizers for finite sofic-shift receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** Normalize finite directed-path witnesses/obstructions. */
export const pathTerm: Tm = tm.lam(tm.var(0));

/** Normalize finite 1-block sofic-image witnesses/obstructions. */
export const imageTerm: Tm = tm.lam(tm.var(0));

/** Normalize the golden-mean `bb` forbidden-pair witness. */
export const goldenForbidsBBTerm: Tm = tm.lam(tm.var(0));

/** Normalize the Fibonacci-substitution-lands-in-golden-SFT witness. */
export const fibSubstituteGoldenTerm: Tm = tm.lam(tm.var(0));

/** Normalize the decorated deep-sofic-cover witness. */
export const fibDeepSoficTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite local-rule graph-factor/coloring/sofic bridge receipt. */
export const finiteLocalRuleTerm: Tm = tm.lam(tm.var(0));
