/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating/reading` exports settlement-filtration
 * measurement readers as RMN terms.
 *
 * Each reader is a `read ∘ free` term: a lambda that takes filtration generators,
 * materializes the full filtration via `freeTerm`, and computes an invariant over
 * it entirely inside the calculus. Golden-vectored against Lean via
 * test/fixtures/lean-measurement-golden.jsonl.
 *
 * Product reading: the package can carry not only morphism bodies but invariant
 * readers as term bodies. The current readers are finite carrier-specific reads
 * over the settlement-filtration shape this package actually exports.
 */
import { type Tm, tm } from "../../../lib/notating/index.mjs";
import { objectTerm, arrayTerm, stringTerm } from "../projecting/index.mjs";
import { countTerm, natZeroTerm } from "../counting/index.mjs";
import { freeTerm, cellSetOf, zeroStageOrdinalTerm } from "../settling/index.mjs";
import { classifyRegimeTerm } from "../measuring/index.mjs";

// ── internal combinators ──────────────────────────────────────────────────────

const boolFalse: Tm = tm.bool(false);
const boolTrue: Tm = tm.bool(true);

const mapWith = (fn: Tm): Tm => tm.lam(
  tm.fold(
    tm.lam(tm.lam(tm.append(tm.var(1), arrayTerm([tm.app(fn, tm.var(0))])))),
    arrayTerm([]),
    tm.var(0),
  ),
);

const filterWith = (pred: Tm): Tm => tm.lam(
  tm.fold(
    tm.lam(tm.lam(tm.cond(
      tm.app(pred, tm.var(0)),
      tm.append(tm.var(1), arrayTerm([tm.var(0)])),
      tm.var(1),
    ))),
    arrayTerm([]),
    tm.var(0),
  ),
);

const isEmptyArray = (arr: Tm): Tm => tm.coincide(arr, arrayTerm([]));
const isZeroNat = (n: Tm): Tm => isEmptyArray(tm.field("members", n));
const andTerm = (left: Tm, right: Tm): Tm => tm.cond(left, right, boolFalse);
const lastOr = (def: Tm, list: Tm): Tm => tm.fold(tm.lam(tm.lam(tm.var(0))), def, list);

const isLimitStage: Tm = tm.lam(
  tm.coincide(tm.field("kind", tm.field("shape", tm.var(0))), stringTerm("predication.settling.stage.limit")),
);

const stageToIncrement: Tm = tm.lam(objectTerm([
  ["kind", stringTerm("predication.settling.increment")],
  ["stage", tm.field("ordinal", tm.var(0))],
  ["source", tm.var(0)],
  ["added", cellSetOf(tm.field("cells", tm.field("designated", tm.var(0))))],
]));

const incrementFires: Tm = tm.lam(
  tm.cond(isEmptyArray(tm.field("cells", tm.field("added", tm.var(0)))), boolFalse, boolTrue),
);

const incrementAtLimit: Tm = tm.lam(tm.app(isLimitStage, tm.field("source", tm.var(0))));

/** Wrap a read body as `read ∘ free`: materializes the filtration, then applies body. */
const overFiltration = (body: (filtration: Tm) => Tm): Tm =>
  tm.lam(tm.app(tm.lam(body(tm.var(0))), tm.app(freeTerm, tm.var(0))));

const stagesOf = (f: Tm): Tm => tm.field("stages", f);
const cofinalityOf = (f: Tm): Tm => tm.field("cofinality", f);
const incrementsOf = (f: Tm): Tm => tm.app(mapWith(stageToIncrement), stagesOf(f));
const firingsOf = (f: Tm): Tm => tm.app(filterWith(incrementFires), incrementsOf(f));
const limitStagesListOf = (f: Tm): Tm => tm.app(filterWith(isLimitStage), stagesOf(f));
const nonScottFiringsListOf = (f: Tm): Tm => tm.app(filterWith(incrementAtLimit), firingsOf(f));

const limitStagesCarrierOf = (f: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.settling.limitStages")],
  ["stages", limitStagesListOf(f)],
  ["rank", tm.app(countTerm, limitStagesListOf(f))],
]);

const nonScottFiringsCarrierOf = (f: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.settling.nonScottFirings")],
  ["firings", nonScottFiringsListOf(f)],
  ["rank", tm.app(countTerm, nonScottFiringsListOf(f))],
]);

const firingCellRecords = (recordKind: string, firingsList: Tm): Tm => tm.fold(
  tm.lam(tm.lam(
    tm.append(tm.var(1), tm.fold(
      tm.lam(tm.lam(
        tm.append(tm.var(1), arrayTerm([objectTerm([
          ["kind", stringTerm(recordKind)],
          ["stage", tm.field("source", tm.var(2))],
          ["cell", tm.var(0)],
        ])])),
      )),
      arrayTerm([]),
      tm.field("cells", tm.field("added", tm.var(0))),
    )),
  )),
  arrayTerm([]),
  firingsList,
);

const rankVanishingOf = (rank: Tm): Tm => tm.cond(
  isZeroNat(rank),
  objectTerm([["kind", stringTerm("predication.cohomology.rankVanishing:witness")], ["rank", rank]]),
  objectTerm([["kind", stringTerm("predication.cohomology.rankVanishing-obstruction")], ["rank", rank]]),
);

const rankIdentityOf = (left: Tm, right: Tm): Tm => tm.cond(
  tm.coincide(left, right),
  objectTerm([["kind", stringTerm("predication.cohomology.rankIdentity:witness")], ["left", left], ["right", right]]),
  objectTerm([["kind", stringTerm("predication.cohomology.rankIdentity-obstruction")], ["left", left], ["right", right]]),
);

const cohomologyGeneratorsOf = (f: Tm): Tm =>
  firingCellRecords("predication.settling.firstCohomologyGenerator", nonScottFiringsListOf(f));

const gradedGapLossesOf = (f: Tm): Tm =>
  firingCellRecords("predication.settling.gradedGapLoss", nonScottFiringsListOf(f));

const firstCohomologyOf = (f: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.settling.firstCohomology")],
  ["generators", cohomologyGeneratorsOf(f)],
  ["rank", tm.app(countTerm, cohomologyGeneratorsOf(f))],
  ["degree", tm.mark(JSON.stringify(1))],
  ["vanishing", rankVanishingOf(tm.app(countTerm, cohomologyGeneratorsOf(f)))],
]);

const gradedGapOf = (f: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.settling.gradedGap")],
  ["lost", gradedGapLossesOf(f)],
  ["rank", tm.app(countTerm, gradedGapLossesOf(f))],
]);

const classificationOf = (f: Tm): Tm => {
  const nonScottRank = tm.app(countTerm, nonScottFiringsListOf(f));
  const limitRank = tm.app(countTerm, limitStagesListOf(f));
  const depth = tm.cond(
    isEmptyArray(firingsOf(f)),
    tm.field("ordinal", lastOr(zeroStageOrdinalTerm, stagesOf(f))),
    tm.field("stage", lastOr(zeroStageOrdinalTerm, firingsOf(f))),
  );
  const regimeData = objectTerm([
    ["kind", stringTerm("settling.closureRegimeData")],
    ["scottContinuous", isZeroNat(nonScottRank)],
    ["finiteBase", andTerm(isZeroNat(nonScottRank), isZeroNat(limitRank))],
    ["countableCofinality", tm.coincide(
      tm.field("kind", cofinalityOf(f)),
      stringTerm("predication.settling.cofinality.countable"),
    )],
  ]);
  return objectTerm([
    ["kind", stringTerm("predication.settling.classification")],
    ["depth", depth],
    ["regime", tm.app(classifyRegimeTerm, regimeData)],
    ["cofinality", cofinalityOf(f)],
    ["limitStages", limitStagesCarrierOf(f)],
    ["nonScottFirings", nonScottFiringsCarrierOf(f)],
  ]);
};

const finiteStageWitness = (ordinal: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.settling.finiteStage:witness")],
  ["stage", ordinal],
  ["value", natZeroTerm],
]);

const closureInvariantStep: Tm = tm.lam(objectTerm([
  ["kind", stringTerm("predication.settling.closureInvariantStep")],
  ["stage", tm.field("source", tm.var(0))],
  ["additions", cellSetOf(tm.field("cells", tm.field("added", tm.var(0))))],
]));

// ── exported reader terms ─────────────────────────────────────────────────────

/** Classify a generated settlement filtration by depth, cofinality, limit stages, non-Scott firings, and closure regime. */
export const readClassification = overFiltration(classificationOf);

/** Read only the stage ordinal selected as the filtration depth by the classification term. */
export const readDepth = overFiltration((f) => tm.field("depth", classificationOf(f)));

/** Read the depth as a finite-stage judgment carrier rather than as a bare stage ordinal. */
export const readDepthFiniteStageJudgment = overFiltration((f) => finiteStageWitness(tm.field("depth", classificationOf(f))));

/** Read the limit-stage carrier: the limit stages present in the materialized filtration and their finite rank. */
export const readLimitStages = overFiltration(limitStagesCarrierOf);

/** Read the non-Scott firing carrier: increments that add cells at limit stages and their finite rank. */
export const readNonScottFirings = overFiltration(nonScottFiringsCarrierOf);

/** Read the carrier-specific first cohomology witness generated by non-Scott firings. */
export const readFirstCohomology = overFiltration(firstCohomologyOf);

/** Read the graded-gap carrier whose losses are computed from the same non-Scott firing cells. */
export const readGradedGap = overFiltration(gradedGapOf);

/** Read the package's H1/graded-gap rank identity as a witness or obstruction carrier. */
export const readGradedGapFirstCohomologyRankIdentity = overFiltration((f) =>
  rankIdentityOf(tm.app(countTerm, cohomologyGeneratorsOf(f)), tm.app(countTerm, gradedGapLossesOf(f))));

/** Read closure-invariant steps for the non-Scott additions that prevent finite closure. */
export const readClosureInvariant = overFiltration((f) => objectTerm([
  ["kind", stringTerm("predication.settling.closureInvariant")],
  ["nonScottAdditions", tm.app(mapWith(closureInvariantStep), nonScottFiringsListOf(f))],
]));
