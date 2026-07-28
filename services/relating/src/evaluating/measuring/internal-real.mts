/**
 * evaluating/measuring/internal-real — RMN normalizers for internal-real witnesses.
 *
 * The exact arithmetic lives in `settling/analysis/internal-real`. These RMN
 * terms normalize the witness/obstruction carrier shape, so downstream actions
 * can carry the proof-reading as inspectable Relation Model Notation instead of
 * opaque callback-only behavior.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

const scalarCancellationWitness = objectTerm([
  ["conclusionHolds", field("conclusionHolds")],
  ["kind", stringTerm("internalReal.scalarCancellation:witness")],
  ["left", field("left")],
  ["m", field("m")],
  ["premiseHolds", field("premiseHolds")],
  ["positive", field("positive")],
  ["right", field("right")],
  ["scaledLeft", field("scaledLeft")],
  ["scaledRight", field("scaledRight")],
]);

const scalarCancellationObstruction = (reason: string): Tm => objectTerm([
  ["conclusionHolds", field("conclusionHolds")],
  ["kind", stringTerm("internalReal.scalarCancellation-obstruction")],
  ["left", field("left")],
  ["m", field("m")],
  ["premiseHolds", field("premiseHolds")],
  ["positive", field("positive")],
  ["reason", stringTerm(reason)],
  ["right", field("right")],
  ["scaledLeft", field("scaledLeft")],
  ["scaledRight", field("scaledRight")],
]);

/** Normalize a scalar-cancellation model carrier into its witness/obstruction judgment. */
export const scalarCancellationTerm: Tm = tm.lam(
  tm.cond(
    field("positive"),
    tm.cond(
      field("premiseHolds"),
      tm.cond(
        field("conclusionHolds"),
        scalarCancellationWitness,
        scalarCancellationObstruction("conclusion"),
      ),
      scalarCancellationObstruction("scaled-order-premise"),
    ),
    scalarCancellationObstruction("positive-scalar"),
  ),
);

const logStepBoundWitness = objectTerm([
  ["admissible", field("admissible")],
  ["base", field("base")],
  ["holds", field("holds")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.logStepBound:witness")],
  ["lhs", field("lhs")],
  ["M", field("M")],
  ["rhs", field("rhs")],
]);

const logStepBoundObstruction = (reason: string): Tm => objectTerm([
  ["admissible", field("admissible")],
  ["base", field("base")],
  ["holds", field("holds")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.logStepBound-obstruction")],
  ["lhs", field("lhs")],
  ["M", field("M")],
  ["reason", stringTerm(reason)],
  ["rhs", field("rhs")],
]);

/** Normalize the finite carrier model of `RelMath.InternalReals.logNat_step_bound`. */
export const logStepBoundTerm: Tm = tm.lam(
  tm.cond(
    field("admissible"),
    tm.cond(field("holds"), logStepBoundWitness, logStepBoundObstruction("bound")),
    logStepBoundObstruction("domain"),
  ),
);

const logMonotoneWitness = objectTerm([
  ["admissible", field("admissible")],
  ["base", field("base")],
  ["holds", field("holds")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.logMonotone:witness")],
  ["lower", field("lower")],
  ["lowerApprox", field("lowerApprox")],
  ["upper", field("upper")],
  ["upperApprox", field("upperApprox")],
]);

const logMonotoneObstruction = (reason: string): Tm => objectTerm([
  ["admissible", field("admissible")],
  ["base", field("base")],
  ["holds", field("holds")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.logMonotone-obstruction")],
  ["lower", field("lower")],
  ["lowerApprox", field("lowerApprox")],
  ["reason", stringTerm(reason)],
  ["upper", field("upper")],
  ["upperApprox", field("upperApprox")],
]);

/** Normalize the finite carrier model of `RelMath.InternalReals.logNat_mono`. */
export const logMonotoneTerm: Tm = tm.lam(
  tm.cond(
    field("admissible"),
    tm.cond(field("holds"), logMonotoneWitness, logMonotoneObstruction("order")),
    logMonotoneObstruction("domain"),
  ),
);

/** Normalize the finite receipt for `RelMath.Real.Logarithm`. */
export const logarithmTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite carrier model of `RelMath.InternalReals.sqrtSeq` bounds. */
export const sqrtSeqApproximationTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Real.IVT` constructive sqrt bisection. */
export const constructiveIvtTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite constant-rational shadow of `RelMath.InternalReals.RReal.mul`. */
export const realMultiplicationTerm: Tm = tm.lam(tm.var(0));

const goldenConvergentLogGapWitness = objectTerm([
  ["admissible", field("admissible")],
  ["bound", field("bound")],
  ["cassini", field("cassini")],
  ["fibonacci", field("fibonacci")],
  ["gap", field("gap")],
  ["holds", field("holds")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.goldenConvergentLogGap:witness")],
  ["n", field("n")],
  ["square", field("square")],
]);

const goldenConvergentLogGapObstruction = (reason: string): Tm => objectTerm([
  ["admissible", field("admissible")],
  ["bound", field("bound")],
  ["cassini", field("cassini")],
  ["fibonacci", field("fibonacci")],
  ["gap", field("gap")],
  ["holds", field("holds")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.goldenConvergentLogGap-obstruction")],
  ["n", field("n")],
  ["reason", stringTerm(reason)],
  ["square", field("square")],
]);

/** Normalize the finite carrier model of `RelMath.InternalReals.convergent_log_gap`. */
export const goldenConvergentLogGapTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(tm.field("kind", tm.field("cassini", tm.var(0))), stringTerm("internalReal.goldenCassini:witness")),
    tm.cond(
      field("admissible"),
      tm.cond(field("holds"), goldenConvergentLogGapWitness, goldenConvergentLogGapObstruction("bound")),
      goldenConvergentLogGapObstruction("domain"),
    ),
    goldenConvergentLogGapObstruction("cassini"),
  ),
);

const metallicConvergentGapWitness = objectTerm([
  ["admissible", field("admissible")],
  ["cassini", field("cassini")],
  ["denominator", field("denominator")],
  ["gap", field("gap")],
  ["holds", field("holds")],
  ["i", field("i")],
  ["kind", stringTerm("internalReal.metallicConvergentGap:witness")],
  ["n", field("n")],
  ["numerator", field("numerator")],
  ["telescopingBound", field("telescopingBound")],
]);

const metallicConvergentGapObstruction = (reason: string): Tm => objectTerm([
  ["admissible", field("admissible")],
  ["cassini", field("cassini")],
  ["denominator", field("denominator")],
  ["gap", field("gap")],
  ["holds", field("holds")],
  ["i", field("i")],
  ["kind", stringTerm("internalReal.metallicConvergentGap-obstruction")],
  ["n", field("n")],
  ["numerator", field("numerator")],
  ["reason", stringTerm(reason)],
  ["telescopingBound", field("telescopingBound")],
]);

/** Normalize the finite carrier model of `RelMath.Aperiodic.StepN.gap_step_bound`. */
export const metallicConvergentGapTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(tm.field("kind", tm.field("cassini", tm.var(0))), stringTerm("internalReal.metallicCassini:witness")),
    tm.cond(
      field("admissible"),
      tm.cond(field("holds"), metallicConvergentGapWitness, metallicConvergentGapObstruction("bound")),
      metallicConvergentGapObstruction("domain"),
    ),
    metallicConvergentGapObstruction("cassini"),
  ),
);

/** Normalize the symbolic exact carrier model of `RelMath.Aperiodic.StepN.metallic_root`. */
export const metallicRootTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite carrier model of `RelMath.Aperiodic.StepN.MetallicReal`. */
export const metallicRealTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite carrier model of `RelMath.Aperiodic.StepN.MetallicPowerLens`. */
export const metallicPowerLensTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite carrier model of `RelMath.Real.LogLipschitz`. */
export const logLipschitzTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite carrier model of `RelMath.Real.ExpSeries`. */
export const expSeriesTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite carrier model of `RelMath.Aperiodic.MetallizationDichotomy`. */
export const metallizationDichotomyTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite Salem/Pisot arithmetic carrier. */
export const salemPisotTerm: Tm = tm.lam(tm.var(0));

/** Normalize the fixed `RelMath.Combinatorics.edge_colouring_entropy` carrier. */
export const edgeColouringEntropyTerm: Tm = tm.lam(objectTerm([
  ["colors", field("colors")],
  ["entropy", field("entropy")],
  ["equalsBinaryShiftEntropy", field("equalsBinaryShiftEntropy")],
  ["graph", field("graph")],
  ["kind", stringTerm("internalReal.edgeColouringEntropy:witness")],
  ["properColourings", field("properColourings")],
]));

/** Normalize the finite `RelMath.Combinatorics.properTriangleColourings_count` entropy carrier. */
export const triangleColouringEntropyTerm: Tm = tm.lam(objectTerm([
  ["colors", field("colors")],
  ["entropyApprox", field("entropyApprox")],
  ["graph", field("graph")],
  ["k", field("k")],
  ["kind", stringTerm("internalReal.triangleColouringEntropy:approximation")],
  ["properColourings", field("properColourings")],
]));
