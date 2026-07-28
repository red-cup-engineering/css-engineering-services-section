/**
 * evaluating/measuring/flow — RMN normalizers for finite closure-flow witnesses.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** Normalize finite firing-blowup/local-data witnesses. */
export const firingBlowupTerm: Tm = tm.lam(objectTerm([
  ["actual", field("actual")],
  ["classified", field("classified")],
  ["identityBlowup", field("identityBlowup")],
  ["kind", stringTerm("flow.firingBlowup:witness")],
  ["leqKnowledge", field("leqKnowledge")],
  ["localData", field("localData")],
  ["nontrivial", field("nontrivial")],
  ["predecessor", field("predecessor")],
  ["reconstructedActual", field("reconstructedActual")],
  ["step", field("step")],
  ["trivial", field("trivial")],
]));

const nscWitness = objectTerm([
  ["cohomologyVanishes", field("cohomologyVanishes")],
  ["commutes", field("commutes")],
  ["family", field("family")],
  ["isNsc", field("isNsc")],
  ["kind", stringTerm("flow.nscFiring:witness")],
  ["operator", field("operator")],
  ["opSup", field("opSup")],
  ["regime", field("regime")],
  ["supAfterMap", field("supAfterMap")],
  ["supBefore", field("supBefore")],
]);

const nscObstruction = objectTerm([
  ["commutes", field("commutes")],
  ["family", field("family")],
  ["isNsc", field("isNsc")],
  ["kind", stringTerm("flow.nscFiring-obstruction")],
  ["operator", field("operator")],
  ["opSup", field("opSup")],
  ["reason", field("reason")],
  ["supAfterMap", field("supAfterMap")],
  ["supBefore", field("supBefore")],
]);

/** Normalize finite NSC commutation witnesses and obstructions. */
export const nscFiringTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("flow.nscFiring:witness")),
    nscWitness,
    nscObstruction,
  ),
);

const scottClosureWitness = objectTerm([
  ["closureLike", field("closureLike")],
  ["directedFamiliesChecked", field("directedFamiliesChecked")],
  ["idempotent", field("idempotent")],
  ["inflationary", field("inflationary")],
  ["kind", stringTerm("flow.scottClosureNoNsc:witness")],
  ["monotone", field("monotone")],
  ["nscCount", field("nscCount")],
  ["operator", field("operator")],
  ["scottContinuous", field("scottContinuous")],
]);

const scottClosureObstruction = objectTerm([
  ["closureLike", field("closureLike")],
  ["directedFamiliesChecked", field("directedFamiliesChecked")],
  ["idempotent", field("idempotent")],
  ["inflationary", field("inflationary")],
  ["kind", stringTerm("flow.scottClosureNoNsc-obstruction")],
  ["monotone", field("monotone")],
  ["nscCount", field("nscCount")],
  ["operator", field("operator")],
  ["scottContinuous", field("scottContinuous")],
]);

/** Normalize finite Scott-continuity/no-NSC closure judgments. */
export const scottClosureNoNscTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("flow.scottClosureNoNsc:witness")),
    scottClosureWitness,
    scottClosureObstruction,
  ),
);

/** Normalize finite closure-flow dynamics witnesses. */
export const closureFlowDynamicsTerm: Tm = tm.lam(objectTerm([
  ["firingSteps", field("firingSteps")],
  ["kind", stringTerm("flow.closureFlowDynamics:witness")],
  ["monotoneAscent", field("monotoneAscent")],
  ["orbit", field("orbit")],
  ["settlesAt", field("settlesAt")],
  ["smoothSteps", field("smoothSteps")],
  ["smoothTailTerminal", field("smoothTailTerminal")],
]));

/** Normalize curvature/regime correspondence witnesses. */
export const curvatureRegimeTerm: Tm = tm.lam(objectTerm([
  ["cohomologyVanishes", field("cohomologyVanishes")],
  ["curvatureRank", field("curvatureRank")],
  ["curved", field("curved")],
  ["curvedOmegaTerminating", field("curvedOmegaTerminating")],
  ["flat", field("flat")],
  ["kind", stringTerm("flow.curvatureRegime:witness")],
  ["regime", field("regime")],
  ["terminatesByOmega", field("terminatesByOmega")],
]));

/** Normalize finite free-energy Lyapunov witnesses. */
export const freeEnergyLyapunovTerm: Tm = tm.lam(objectTerm([
  ["antitone", field("antitone")],
  ["boundedSteps", field("boundedSteps")],
  ["cells", field("cells")],
  ["energies", field("energies")],
  ["equilibriumEnergy", field("equilibriumEnergy")],
  ["hardClosure", field("hardClosure")],
  ["kind", stringTerm("flow.freeEnergyLyapunov:witness")],
  ["orbit", field("orbit")],
  ["settled", field("settled")],
  ["strictDropsAtFirings", field("strictDropsAtFirings")],
]));

/** Normalize finite Laplacianizer/Hodge witnesses. */
export const laplacianizerTerm: Tm = tm.lam(objectTerm([
  ["harmonicEqualsFixed", field("harmonicEqualsFixed")],
  ["hodgeIsoDegree0", field("hodgeIsoDegree0")],
  ["kind", stringTerm("flow.laplacianizer:witness")],
  ["laplacianIsClosure", field("laplacianIsClosure")],
  ["operator", field("operator")],
  ["seed", field("seed")],
  ["settled", field("settled")],
  ["settledIsLeastHarmonic", field("settledIsLeastHarmonic")],
]));

/** Normalize finite Lawvere harmonic-kernel/H0 image-isomorphism receipts. */
export const lawvereKernelH0Term: Tm = tm.lam(objectTerm([
  ["fromH0ToKernelRoundTrip", field("fromH0ToKernelRoundTrip")],
  ["globalSectionImage", field("globalSectionImage")],
  ["globalSectionSeed", field("globalSectionSeed")],
  ["harmonic", field("harmonic")],
  ["harmonicIsOwnImage", field("harmonicIsOwnImage")],
  ["hodgeIso", field("hodgeIso")],
  ["imageIsHarmonicByIdempotence", field("imageIsHarmonicByIdempotence")],
  ["kind", stringTerm("flow.lawvereKernelH0.receipt:witness")],
  ["membershipIff", field("membershipIff")],
  ["operator", field("operator")],
  ["seed", field("seed")],
  ["toH0FromKernelRoundTrip", field("toH0FromKernelRoundTrip")],
]));

/** Normalize the bundled `RelMath.Flow.LawvereLaplacianSpectralGap` receipt. */
export const lawvereLaplacianSpectralGapReceiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the canonical-omega transfinite continuity finite witness. */
export const transfiniteOmegaContinuityTerm: Tm = tm.lam(objectTerm([
  ["boundary", field("boundary")],
  ["finiteChain", field("finiteChain")],
  ["kind", stringTerm("flow.transfiniteOmegaContinuity:witness")],
  ["monotoneChain", field("monotoneChain")],
  ["noNscAtOmega", field("noNscAtOmega")],
  ["omegaIsLub", field("omegaIsLub")],
  ["omegaValue", field("omegaValue")],
]));

/** Normalize the bundled `RelMath.Flow.NonScottContinuousFiring` receipt. */
export const nonScottContinuousFiringReceiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the bundled `RelMath.Flow.ClosureFlowCurvatureRegime` receipt. */
export const closureFlowCurvatureRegimeReceiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the bundled `RelMath.Flow.TransfiniteClosureFlow` receipt. */
export const transfiniteClosureFlowReceiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the bundled `RelMath.Flow.BlowupClassification` receipt. */
export const blowupClassificationReceiptTerm: Tm = tm.lam(tm.var(0));
