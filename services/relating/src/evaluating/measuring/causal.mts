/**
 * evaluating/measuring/causal — RMN normalizers for finite Lorentzian causal witnesses.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

const settleWitness = objectTerm([
  ["apexCount", field("apexCount")],
  ["closure", field("closure")],
  ["directLinks", field("directLinks")],
  ["eulerCharacteristic", field("eulerCharacteristic")],
  ["events", field("events")],
  ["h1Vanishes", field("h1Vanishes")],
  ["kind", stringTerm("lorentzian.causalSettle:witness")],
  ["nscCount", field("nscCount")],
  ["orderedPairCount", field("orderedPairCount")],
  ["orderingFraction", field("orderingFraction")],
  ["regime", field("regime")],
]);

const settleObstruction = (reason: string): Tm => objectTerm([
  ["closure", field("closure")],
  ["directLinks", field("directLinks")],
  ["events", field("events")],
  ["kind", stringTerm("lorentzian.causalSettle-obstruction")],
  ["offending", field("offending")],
  ["reason", stringTerm(reason)],
]);

/** Normalize the finite carrier model of `RelMath.Lorentzian.Causal`. */
export const settleCausalSetTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("lorentzian.causalSettle:witness")),
    settleWitness,
    tm.cond(
      tm.coincide(field("reason"), stringTerm("duplicate-event")),
      settleObstruction("duplicate-event"),
      tm.cond(
        tm.coincide(field("reason"), stringTerm("unknown-event")),
        settleObstruction("unknown-event"),
        settleObstruction("closed-timelike-curve"),
      ),
    ),
  ),
);

/** Normalize the finite Myrheim-Meyer geometry/topology independence witness. */
export const geometryIndependentOfTopologyTerm: Tm = tm.lam(objectTerm([
  ["antichainOrderingFraction", field("antichainOrderingFraction")],
  ["chainOrderingFraction", field("chainOrderingFraction")],
  ["diamondOrderingFraction", field("diamondOrderingFraction")],
  ["kind", stringTerm("lorentzian.myrheimMeyer.geometryIndependentOfTopology:witness")],
  ["sharedClassifying", field("sharedClassifying")],
]));

export const coneFieldTerm: Tm = tm.lam(tm.var(0));
export const causalIntervalTerm: Tm = tm.lam(tm.var(0));
export const causalAlexandrovTerm: Tm = tm.lam(tm.var(0));
export const causalAlexandrovTopologyTerm: Tm = tm.lam(tm.var(0));
export const causalLaplacianTerm: Tm = tm.lam(tm.var(0));
export const lightObservationTerm: Tm = tm.lam(tm.var(0));
export const diamondSpectralPortraitTerm: Tm = tm.lam(tm.var(0));
export const causalNetTerm: Tm = tm.lam(tm.var(0));
export const paraconsistentConeReportTerm: Tm = tm.lam(tm.var(0));
export const microlocalSupportTerm: Tm = tm.lam(tm.var(0));
export const myrheimMeyerRealShadowTerm: Tm = tm.lam(tm.var(0));
export const benincasaDowkerTerm: Tm = tm.lam(tm.var(0));
export const einsteinHilbertTerm: Tm = tm.lam(tm.var(0));
export const sprinklingAverageTerm: Tm = tm.lam(tm.var(0));
export const causalDalembertianTerm: Tm = tm.lam(tm.var(0));
export const endogenousCoefficientsTerm: Tm = tm.lam(tm.var(0));
export const causalMobiusTerm: Tm = tm.lam(tm.var(0));
export const lambekCurvatureTerm: Tm = tm.lam(tm.var(0));
export const lambekRicciTerm: Tm = tm.lam(tm.var(0));
export const causalCohomologyTerm: Tm = tm.lam(tm.var(0));
export const causalCohomologyH2Term: Tm = tm.lam(tm.var(0));
export const causalCohomologyNTerm: Tm = tm.lam(tm.var(0));
export const curvatureActionWiringTerm: Tm = tm.lam(tm.var(0));
export const causalDistanceTerm: Tm = tm.lam(tm.var(0));
export const bdgMobiusActionTerm: Tm = tm.lam(tm.var(0));
