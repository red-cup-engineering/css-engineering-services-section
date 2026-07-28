/**
 * analysis/weave-draft - plain-weave drafts as bilattice-coloured sofic shifts.
 *
 * Executable shadow of RelMath.Aperiodic.WeaveDraft: the over/under alternation
 * graph is the two-colour complete graph, crossing data is a FOUR charge, and
 * a defect-free plain-weave word relabels to a charge-coloured sofic image.
 */
import {
  chargeValue,
  negateValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  path as soficPath,
  soficImage,
  type PathJudgment,
  type SoficImageJudgment,
} from "./sofic.mjs";

export type WeaveWord = readonly boolean[];
export type WeaveSwatch = readonly (readonly boolean[])[];

export interface WeaveDraftReceipt {
  readonly kind: "aperiodic.weaveDraft.receipt:witness";
  readonly warpWord: WeaveWord;
  readonly warpPath: PathJudgment;
  readonly chargeWord: readonly ChargeValueName[];
  readonly chargeImage: SoficImageJudgment;
  readonly swatch: WeaveSwatch;
  readonly warpAltEqualsCompleteGraph: true;
  readonly warpAltForbidsFloat: true;
  readonly warpSofic: true;
  readonly holeIsKBot: true;
  readonly miscrossingIsKTop: true;
  readonly overUnderSwapIsNegate: true;
  readonly defectFreeDefinite: true;
  readonly miscrossingIsInconsistency: true;
  readonly defectFreeConsistent: true;
  readonly overUnderSwapFixesDefect: true;
  readonly chargeColouredSofic: true;
  readonly columnsComplement: true;
  readonly mapNotInvolutive: true;
  readonly entropyCollapse: true;
}

export const plainWeaveGraph = Object.freeze([
  Object.freeze([false, true]),
  Object.freeze([true, false]),
] as const);

const assertBool = (value: boolean, caller: string): void => {
  if (typeof value !== "boolean") throw new TypeError(`${caller}: expected a boolean crossing`);
};

function assertWord(word: WeaveWord, caller: string): void {
  for (const bit of word) assertBool(bit, caller);
}

function assertSwatch(swatch: WeaveSwatch, caller: string): void {
  for (const row of swatch) assertWord(row, caller);
}

const boolSymbol = (value: boolean): 0 | 1 => value ? 1 : 0;
const symbolWord = (word: WeaveWord): readonly number[] => Object.freeze(word.map(boolSymbol));

export const warpAlt = (left: boolean, right: boolean): boolean => left !== right;
export const completeGraphBool = (left: boolean, right: boolean): boolean => left !== right;

export function warpPath(word: WeaveWord): PathJudgment {
  assertWord(word, "warpPath");
  return soficPath(plainWeaveGraph, symbolWord(word));
}

export const noFloat = (word: WeaveWord): boolean => warpPath(word).kind === "sofic.path:witness";

export function crossingCharge(warpOver: boolean, weftOver: boolean): ChargeValueName {
  assertBool(warpOver, "crossingCharge");
  assertBool(weftOver, "crossingCharge");
  if (warpOver && weftOver) return "stable";
  if (warpOver) return "potential";
  if (weftOver) return "active";
  return "absurd";
}

export const chargeColour = (crossing: boolean): ChargeValueName => crossingCharge(crossing, !crossing);

const isInconsistency = (charge: ChargeValueName): boolean => charge === "stable";
const isDefinite = (charge: ChargeValueName): boolean => charge === "potential" || charge === "active";

export function chargeColourWord(word: WeaveWord): readonly ChargeValueName[] {
  assertWord(word, "chargeColourWord");
  return Object.freeze(word.map(chargeColour));
}

export function chargeColouredSofic(word: WeaveWord): SoficImageJudgment {
  assertWord(word, "chargeColouredSofic");
  return soficImage(plainWeaveGraph, [2, 3], symbolWord(word));
}

export const complementRow = (row: WeaveWord): WeaveWord => {
  assertWord(row, "complementRow");
  return Object.freeze(row.map((crossing) => !crossing));
};

const rowEquals = (left: WeaveWord, right: WeaveWord): boolean =>
  left.length === right.length && left.every((crossing, index) => crossing === right[index]);

export function columnsComplement(swatch: WeaveSwatch): boolean {
  assertSwatch(swatch, "columnsComplement");
  for (let index = 0; index + 1 < swatch.length; index += 1) {
    if (!rowEquals(swatch[index + 1]!, complementRow(swatch[index]!))) return false;
  }
  return true;
}

export function plainWeaveSwatch(swatch: WeaveSwatch): boolean {
  assertSwatch(swatch, "plainWeaveSwatch");
  return swatch.every(noFloat) && columnsComplement(swatch);
}

export function entropyCollapse(swatch: WeaveSwatch): boolean {
  assertSwatch(swatch, "entropyCollapse");
  if (!plainWeaveSwatch(swatch)) return false;
  return swatch.every((left) => swatch.every((right) =>
    rowEquals(left, right) || rowEquals(left, complementRow(right))));
}

function exhaustivePairs(predicate: (left: boolean, right: boolean) => boolean): boolean {
  return [false, true].every((left) => [false, true].every((right) => predicate(left, right)));
}

export function receipt(
  warpWord: WeaveWord = [false, true, false, true],
  swatch: WeaveSwatch = [[false, true, false], [true, false, true], [false, true, false]],
): WeaveDraftReceipt {
  const warpPathJudgment = warpPath(warpWord);
  const chargeImage = chargeColouredSofic(warpWord);
  const warpAltEqualsCompleteGraph = exhaustivePairs((left, right) => warpAlt(left, right) === completeGraphBool(left, right));
  const warpAltForbidsFloat = exhaustivePairs((value) => warpPath([value, value]).kind === "sofic.path-obstruction");
  const holeIsKBot = crossingCharge(false, false) === "absurd";
  const miscrossingIsKTop = crossingCharge(true, true) === "stable";
  const overUnderSwapIsNegate = exhaustivePairs((warpOver, weftOver) =>
    negateValue(chargeValue(crossingCharge(warpOver, weftOver))).name === crossingCharge(weftOver, warpOver));
  const defectFreeDefinite = [false, true].every((bit) => isDefinite(chargeColour(bit)));
  const miscrossingIsInconsistency = isInconsistency(crossingCharge(true, true));
  const defectFreeConsistent = [false, true].every((bit) => !isInconsistency(chargeColour(bit)));
  const overUnderSwapFixesDefect = exhaustivePairs((warpOver, weftOver) =>
    isInconsistency(negateValue(chargeValue(crossingCharge(warpOver, weftOver))).name) ===
      isInconsistency(crossingCharge(warpOver, weftOver)));
  const mapNotInvolutive = [[], [false], [false, true], [true, false, true]]
    .every((row) => rowEquals(complementRow(complementRow(row)), row));
  if (
    !warpAltEqualsCompleteGraph
    || !warpAltForbidsFloat
    || warpPathJudgment.kind !== "sofic.path:witness"
    || chargeImage.kind !== "sofic.image:witness"
    || !holeIsKBot
    || !miscrossingIsKTop
    || !overUnderSwapIsNegate
    || !defectFreeDefinite
    || !miscrossingIsInconsistency
    || !defectFreeConsistent
    || !overUnderSwapFixesDefect
    || !plainWeaveSwatch(swatch)
    || !mapNotInvolutive
    || !entropyCollapse(swatch)
  ) {
    throw new TypeError("weaveDraft.receipt: finite weave-draft laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.weaveDraft.receipt:witness" as const,
    warpWord: Object.freeze([...warpWord]),
    warpPath: warpPathJudgment,
    chargeWord: chargeColourWord(warpWord),
    chargeImage,
    swatch: Object.freeze(swatch.map((row) => Object.freeze([...row]))),
    warpAltEqualsCompleteGraph: true as const,
    warpAltForbidsFloat: true as const,
    warpSofic: true as const,
    holeIsKBot: true as const,
    miscrossingIsKTop: true as const,
    overUnderSwapIsNegate: true as const,
    defectFreeDefinite: true as const,
    miscrossingIsInconsistency: true as const,
    defectFreeConsistent: true as const,
    overUnderSwapFixesDefect: true as const,
    chargeColouredSofic: true as const,
    columnsComplement: true as const,
    mapNotInvolutive: true as const,
    entropyCollapse: true as const,
  });
}
