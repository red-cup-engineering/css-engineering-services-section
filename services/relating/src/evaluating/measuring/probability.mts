/**
 * evaluating/measuring/probability — RMN normalizers for finite probability and
 * stochastic-settling witnesses.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** Normalize the finite counting-measure valuation witness. */
export const measureIsValuationTerm: Tm = tm.lam(objectTerm([
  ["additiveOnDisjoint", field("additiveOnDisjoint")],
  ["complement", field("complement")],
  ["empty", field("empty")],
  ["kind", stringTerm("settling.measureIsValuation:witness")],
  ["monotone", field("monotone")],
  ["univ", field("univ")],
]));

/** Normalize the conditioning-as-fiber-adjoint witness. */
export const conditionalViaFiberAdjointTerm: Tm = tm.lam(objectTerm([
  ["bayesSymmetry", field("bayesSymmetry")],
  ["boundedByMarginal", field("boundedByMarginal")],
  ["kind", stringTerm("settling.conditionalViaFiberAdjoint:witness")],
  ["restriction", field("restriction")],
]));

/** Normalize the Markov-stationary/stochastic-closure fixed-point witness. */
export const markovStationaryIsClosureFixpointTerm: Tm = tm.lam(objectTerm([
  ["equivalent", field("equivalent")],
  ["fixpoint", field("fixpoint")],
  ["kind", stringTerm("settling.markovStationaryIsClosureFixpoint:witness")],
  ["stationary", field("stationary")],
]));

/** Normalize the stochastic-settling-as-value-settling witness. */
export const stochasticIsValueSettlingTerm: Tm = tm.lam(objectTerm([
  ["kind", stringTerm("settling.stochasticIsValueSettling:witness")],
  ["regime", field("regime")],
  ["regimeIndependent", field("regimeIndependent")],
  ["stationaryExists", field("stationaryExists")],
]));

/** Normalize the finite rational shadow of the real stochastic unit interval. */
export const realUnitIntervalValueCategoryTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite expectation linearity/counting-measure witness. */
export const expectationLawsTerm: Tm = tm.lam(objectTerm([
  ["additive", field("additive")],
  ["homogeneous", field("homogeneous")],
  ["indicator", field("indicator")],
  ["kind", stringTerm("settling.expectationLaws:witness")],
]));

/** Normalize the detailed-balance-implies-stationary witness. */
export const detailedBalanceImpliesStationaryTerm: Tm = tm.lam(objectTerm([
  ["detailedBalance", field("detailedBalance")],
  ["implicationHolds", field("implicationHolds")],
  ["kind", stringTerm("settling.detailedBalanceImpliesStationary:witness")],
  ["rowsSumToOne", field("rowsSumToOne")],
  ["stationary", field("stationary")],
]));

/** Normalize the finite exact-rational Poisson-settling receipt. */
export const poissonSettlingTerm: Tm = tm.lam(tm.var(0));
