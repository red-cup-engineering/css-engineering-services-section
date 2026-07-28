/**
 * analysis/inverse-hull - constant Anderson-Putnam inverse hull receipts.
 *
 * Executable shadow of RelMath.Aperiodic.InverseHull for the constant H1Class
 * inverse system: every stage carries the same class, restrictions are
 * identity, and the seam reads the class at stage 0.
 */
import {
  aperiodicWitness,
  h1Class,
  h1Zero,
  type H1Class,
} from "./aperiodic-classification.mjs";

export interface ConstantHullThread {
  readonly kind: "aperiodic.inverseHull.constantThread";
  readonly clInv: H1Class;
  readonly sampleStages: readonly number[];
  readonly values: Readonly<Record<string, H1Class>>;
  readonly coherent: true;
}

export interface InverseHullReceipt {
  readonly kind: "aperiodic.inverseHull.receipt:witness";
  readonly thread: ConstantHullThread;
  readonly seam: H1Class;
  readonly witnessThread: ConstantHullThread;
  readonly zeroThread: ConstantHullThread;
  readonly oneThread: ConstantHullThread;
  readonly seamMapConstThread: true;
  readonly seamMapSurjective: true;
  readonly threadExtensional: true;
  readonly hullSeparatedByStages: true;
  readonly hullPairsClInv: true;
  readonly apHullHasDistinctThreads: true;
  readonly constantHullBoundary: "genuine Cantor hull and hullLeaf real accretion remain proof/frontier work";
}

function assertNat(value: number, caller: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a natural stage`);
}

function sameH1(left: H1Class, right: H1Class): boolean {
  return left.coord === right.coord;
}

function uniqueSortedStages(stages: readonly number[]): readonly number[] {
  for (const stage of stages) assertNat(stage, "constThread");
  return Object.freeze([...new Set(stages)].sort((left, right) => left - right));
}

export function constThread(clInv: H1Class, sampleStages: readonly number[] = [0, 1, 2, 3]): ConstantHullThread {
  const stages = uniqueSortedStages(sampleStages);
  return Object.freeze({
    kind: "aperiodic.inverseHull.constantThread" as const,
    clInv,
    sampleStages: stages,
    values: Object.freeze(Object.fromEntries(stages.map((stage) => [String(stage), clInv]))),
    coherent: true as const,
  });
}

export function projAt(thread: ConstantHullThread, stage: number): H1Class {
  assertNat(stage, "projAt");
  return thread.clInv;
}

export const seamMap = (thread: ConstantHullThread): H1Class => projAt(thread, 0);

export function threadExtensional(left: ConstantHullThread, right: ConstantHullThread): boolean {
  return sameH1(left.clInv, right.clInv);
}

export function hullSeparatedByStages(
  left: ConstantHullThread,
  right: ConstantHullThread,
  stages: readonly number[] = [0, 1, 2, 3],
): boolean {
  const checkedStages = uniqueSortedStages(stages);
  const agreesAtStages = checkedStages.every((stage) => sameH1(projAt(left, stage), projAt(right, stage)));
  return !agreesAtStages || threadExtensional(left, right);
}

export function receipt(coord = 1): InverseHullReceipt {
  const target = h1Class(coord);
  const thread = constThread(target);
  const seam = seamMap(thread);
  const witness = aperiodicWitness(1);
  const witnessThread = constThread(witness.clInv);
  const zeroThread = constThread(h1Zero);
  const oneThread = constThread(h1Class(1));
  const seamMapConstThread = sameH1(seam, target);
  const seamMapSurjective = sameH1(seamMap(constThread(target)), target);
  const extensional = threadExtensional(constThread(target, [0]), constThread(target, [2, 5]));
  const separated = hullSeparatedByStages(constThread(target), constThread(target, [4, 8]), [0, 1, 5]);
  const pairsClInv = sameH1(seamMap(witnessThread), witness.clInv) && !sameH1(seamMap(witnessThread), h1Zero);
  const distinctThreads = !threadExtensional(zeroThread, oneThread) && !sameH1(seamMap(zeroThread), seamMap(oneThread));
  if (!seamMapConstThread || !seamMapSurjective || !extensional || !separated || !pairsClInv || !distinctThreads) {
    throw new TypeError("inverseHull.receipt: finite constant-hull laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.inverseHull.receipt:witness" as const,
    thread,
    seam,
    witnessThread,
    zeroThread,
    oneThread,
    seamMapConstThread: true as const,
    seamMapSurjective: true as const,
    threadExtensional: true as const,
    hullSeparatedByStages: true as const,
    hullPairsClInv: true as const,
    apHullHasDistinctThreads: true as const,
    constantHullBoundary: "genuine Cantor hull and hullLeaf real accretion remain proof/frontier work" as const,
  });
}
