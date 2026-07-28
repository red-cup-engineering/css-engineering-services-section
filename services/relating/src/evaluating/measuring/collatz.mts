/**
 * evaluating/measuring/collatz — RMN normalizers for finite Collatz witnesses.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** Normalize affine trace parity-word witnesses. */
export const affineTraceParityWordTerm: Tm = tm.lam(objectTerm([
  ["coefficientContracting", field("coefficientContracting")],
  ["descends", field("descends")],
  ["holds", field("holds")],
  ["iterate", field("iterate")],
  ["kind", stringTerm("collatz.affineTraceParityWord:witness")],
  ["length", field("length")],
  ["lhs", field("lhs")],
  ["rhs", field("rhs")],
  ["seed", field("seed")],
  ["trace", field("trace")],
  ["word", field("word")],
]));

const firstPassageWitness = objectTerm([
  ["contracting", field("contracting")],
  ["endsInE", field("endsInE")],
  ["kind", stringTerm("collatz.firstPassage:witness")],
  ["last", field("last")],
  ["lowerPower", field("lowerPower")],
  ["middlePower", field("middlePower")],
  ["properPrefixesNoncontracting", field("properPrefixesNoncontracting")],
  ["trace", field("trace")],
  ["upperPower", field("upperPower")],
  ["word", field("word")],
]);

const firstPassageObstruction = objectTerm([
  ["contracting", field("contracting")],
  ["kind", stringTerm("collatz.firstPassage-obstruction")],
  ["properPrefixesNoncontracting", field("properPrefixesNoncontracting")],
  ["reason", field("reason")],
  ["trace", field("trace")],
  ["word", field("word")],
]);

/** Normalize first-passage word witnesses/obstructions. */
export const firstPassageTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("collatz.firstPassage:witness")),
    firstPassageWitness,
    firstPassageObstruction,
  ),
);

const parentBarrierWitness = objectTerm([
  ["appendEFirstPassage", field("appendEFirstPassage")],
  ["belowNextEvenCrossing", field("belowNextEvenCrossing")],
  ["D", field("D")],
  ["kind", stringTerm("collatz.parentBarrier:witness")],
  ["M", field("M")],
  ["noncontracting", field("noncontracting")],
  ["properPrefixesNoncontracting", field("properPrefixesNoncontracting")],
  ["trace", field("trace")],
  ["word", field("word")],
]);

const parentBarrierObstruction = objectTerm([
  ["belowNextEvenCrossing", field("belowNextEvenCrossing")],
  ["kind", stringTerm("collatz.parentBarrier-obstruction")],
  ["noncontracting", field("noncontracting")],
  ["properPrefixesNoncontracting", field("properPrefixesNoncontracting")],
  ["reason", field("reason")],
  ["trace", field("trace")],
  ["word", field("word")],
]);

/** Normalize parent-barrier witnesses/obstructions. */
export const parentBarrierTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("collatz.parentBarrier:witness")),
    parentBarrierWitness,
    parentBarrierObstruction,
  ),
);

/** Normalize two-adic factor witnesses. */
export const twoAdicFactorTerm: Tm = tm.lam(objectTerm([
  ["exponent", field("exponent")],
  ["holds", field("holds")],
  ["kind", stringTerm("collatz.twoAdicFactor:witness")],
  ["oddPart", field("oddPart")],
  ["value", field("value")],
]));

/** Normalize shortcut odd-part witnesses. */
export const shortcutOddPartTerm: Tm = tm.lam(objectTerm([
  ["expanded", field("expanded")],
  ["exponent", field("exponent")],
  ["holds", field("holds")],
  ["kind", stringTerm("collatz.shortcutOddPart:witness")],
  ["nonemptyHalvingRun", field("nonemptyHalvingRun")],
  ["oddPart", field("oddPart")],
  ["seed", field("seed")],
  ["value", field("value")],
]));

const reachedQuiescenceWitness = objectTerm([
  ["kind", stringTerm("collatz.reachedQuiescence:witness")],
  ["nextReached", field("nextReached")],
  ["quiesces", field("quiesces")],
  ["reached", field("reached")],
  ["revisitAt", field("revisitAt")],
  ["seed", field("seed")],
  ["stage", field("stage")],
  ["terminal", field("terminal")],
]);

const reachedQuiescenceObstruction = objectTerm([
  ["kind", stringTerm("collatz.reachedQuiescence-obstruction")],
  ["nextReached", field("nextReached")],
  ["quiesces", field("quiesces")],
  ["reached", field("reached")],
  ["seed", field("seed")],
  ["stage", field("stage")],
]);

/** Normalize reached-set quiescence witnesses/obstructions. */
export const reachedQuiescenceTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("collatz.reachedQuiescence:witness")),
    reachedQuiescenceWitness,
    reachedQuiescenceObstruction,
  ),
);

/** Normalize residue characterization witnesses. */
export const residueCharacterizationTerm: Tm = tm.lam(objectTerm([
  ["C", field("C")],
  ["D", field("D")],
  ["equivalent", field("equivalent")],
  ["gap", field("gap")],
  ["kind", stringTerm("collatz.residueCharacterization:witness")],
  ["M", field("M")],
  ["residue", field("residue")],
  ["residueInequality", field("residueInequality")],
  ["semigroupMember", field("semigroupMember")],
  ["sourceModule", field("sourceModule")],
]));

/** Normalize Padovan/Fibonacci comparison witnesses. */
export const padovanLeFibSeqTerm: Tm = tm.lam(objectTerm([
  ["fibSeq", field("fibSeq")],
  ["holds", field("holds")],
  ["index", field("index")],
  ["kind", stringTerm("collatz.padovanLeFibSeq:witness")],
  ["padovan", field("padovan")],
  ["sourceModule", field("sourceModule")],
]));

/** Normalize the conditional/frontier `RelMath.Closure.Collatz.SemigroupGap` receipt. */
export const semigroupGapReceiptTerm: Tm = tm.lam(tm.var(0));
